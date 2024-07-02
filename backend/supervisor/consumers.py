import json
import random
import asyncio
import logging
from math import cos, sin, radians
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)

# État du jeu global partagé par tous les joueurs
game_state = {
    "ball": {"x": 320, "y": 180, "vx": 2.5 * random.choice((1, -1)), "vy": 2.5 * random.choice((1, -1))},
    "player1": {"y": 180, "speed": 0},
    "player2": {"y": 180, "speed": 0},
    "player1_score": 0,
    "player2_score": 0,
    "game_started": False,
    "game_over": False
}

class PongConsumer(AsyncWebsocketConsumer):

    # ------------------------- DEFINES ----------------------------#

    Players = {}
    points = 50
    refresh_rate = 120
    speed_buff = 6 / 5
    paddle_height = 70
    center_paddle_offset = paddle_height / 2
    max_angle = 45
    game_lock = asyncio.Lock()  # Ajout d'un verrou pour gérer les accès concurrents

    # ----------------------- WEBSOCKET MANAGEMENT -------------------#

    async def connect(self):
        await self.accept()
        self.game_type = None
        self.Players[self.channel_name] = {
            "object": self,
            "username": None,
            "player_num": None,
            "speed": 0
        }
        logger.debug(f"Player connected: {self.channel_name}")
        self.keep_open = True
        self.connection_task = asyncio.create_task(self.ensure_connection_open())

    async def ensure_connection_open(self):
        while self.keep_open:
            await asyncio.sleep(1)
            try:
                await self.send(text_data=json.dumps({'type': 'ping'}))
            except Exception as e:
                logger.error("Error sending ping: " + str(e))
                break

    async def disconnect(self, code):
        logger.debug(f"Player disconnected: {self.channel_name}")
        self.keep_open = False
        self.connection_task.cancel()
        if self.channel_name in self.Players:
            del self.Players[self.channel_name]
            await self.broadcast_game_state({'type': 'player_disconnected'})

    async def receive(self, text_data):
        data = json.loads(text_data)
        logger.debug(f"Data received: {data}")
        action = data.get('t')
        if action == 'pi':
            await self.handle_player_input(data)
        elif action == 'sg' and not game_state['game_started']:
            await self.run_in_main_loop(self.start_game)
        elif action == 'select_game_type' and not game_state['game_started']:
            await self.handle_game_selection(data)
        elif action == 'disconnect':
            await self.disconnect(1001)
        elif action == 'pong':
            await self.handle_pong()
        elif action == 'stop_game':
            await self.run_in_main_loop(self.stop_current_game)

    async def broadcast_game_state(self, extra_info=None):
        state = {
            'type': 'update',
            'ball': game_state['ball'],
            'p1': game_state['player1'],
            'p2': game_state['player2'],
            's1': game_state['player1_score'],
            's2': game_state['player2_score'],
            'go': game_state['game_over'],
            'gs': game_state['game_started'],
        }
        if extra_info:
            state.update(extra_info)
        for player in self.Players.values():
            try:
                await player['object'].send(text_data=json.dumps(state))
            except Exception as e:
                logger.error(f"Error sending game state: {e}")

    async def handle_pong(self):
        player = self.Players.get(self.channel_name)
        if player:
            username = player.get("username", "Unknown")
            logger.debug(f"Pong by client {username}")

    # --------------------------- INPUT HANDLING ----------------------#

    async def handle_player_input(self, data):
        if game_state['game_started']:
            if self.game_type == 'local_1v1':
                self.handle_local_input(data)
            elif self.game_type == '1v1':
                self.handle_1v1_input(data)
            else:
                logger.warning(f"Unexpected game type: {self.game_type}")
                return
            await self.broadcast_game_state()
        else:
            logger.warning("Game is not started, input ignored.")

    def handle_local_input(self, data):
        player1_speed = data.get('p1', 0)
        player2_speed = data.get('p2', 0)
        game_state['player1']["speed"] = player1_speed
        game_state['player2']["speed"] = player2_speed

    def handle_1v1_input(self, data):
        player_num = data.get('player_num', 0)
        speed = data.get('speed', 0)
        if player_num == 1:
            game_state['player1']["speed"] = speed
            logger.debug(f"Player 1 speed set to {speed}")
        elif player_num == 2:
            game_state['player2']["speed"] = speed
            logger.debug(f"Player 2 speed set to {speed}")
        else:
            logger.error(f"Invalid player number received: {player_num}")

    async def handle_game_selection(self, data):
        self.username = data.get('username', 'Player')
        self.game_type = data.get('game_type')
        self.Players[self.channel_name]['username'] = self.username
        logger.debug(f"Game type selected: {self.game_type} by {self.username}")

        message = {
            'type': 'info',
            'message': f'{self.username} has joined the game lobby as Player {len(self.Players)}.'
        }
        await self.send(text_data=json.dumps(message))

        if self.game_type == 'local_1v1':
            game_state['player1'] = {"y": 180, "speed": 0}
            game_state['player2'] = {"y": 180, "speed": 0}
            self.Players[self.channel_name]['player_num'] = 1
            await self.broadcast_game_state({'type': 'game_ready'})
        elif self.game_type == '1v1' and not game_state['game_started']:
            logger.debug(f"Number of players: {len(self.Players)}")
            if len(self.Players) >= 2:
                await self.assign_players()
            else:
                logger.debug("Waiting for second player to join...")
        else:
            logger.warning(f"Unexpected game type: {self.game_type}")

    async def assign_players(self):
        players = list(self.Players.values())
        if len(players) < 2:
            logger.debug("Not enough players to start the game")
            return

        for i, player in enumerate(players):
            player['player_num'] = i + 1
            assignment_message = json.dumps({
                'type': 'player_assignment',
                'player_num': player['player_num'],
                'message': f'You are Player {player["player_num"]}.'
            })
            await player['object'].send(text_data=assignment_message)
            logger.debug(f"Assigned Player {player['player_num']} to {player['object'].channel_name}")

        await self.broadcast_game_state({'type': 'game_ready'})

    # ---------------------------- GAME LOGIC ------------------------#

    async def game_loop(self):
        while game_state['game_started'] and not game_state['game_over']:
            if game_state['game_over']:
                return
            await self.update_game_state()
            await self.broadcast_game_state()
            await asyncio.sleep(1 / self.refresh_rate)

    async def start_game(self):
        if game_state['game_started']:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'A game is already in progress.'
            }))
            return

        await self.start_countdown()
        self.init_game_state()
        game_state['game_started'] = True
        game_state['game_over'] = False
        self.ball_restart()
        asyncio.create_task(self.game_loop())

    async def stop_current_game(self):
        if game_state['game_over']:
            return
        game_state['game_started'] = False
        game_state['game_over'] = True
        await self.broadcast_game_state({'type': 'game_over'})

    async def start_countdown(self):
        for i in range(3, 0, -1):
            logger.debug(f"Countdown: {i}")
            await self.broadcast_game_state({'type': 'countdown', 'value': i})
            await asyncio.sleep(1)
        return

    async def check_game_over(self):
        if game_state['player1_score'] == self.points or game_state['player2_score'] == self.points:
            game_state['game_over'] = True
            game_state['game_started'] = False
            logger.debug("Game over")
        await self.broadcast_game_state({'type': 'game_over'})
        await self.disconnect(1001)

    def init_game_state(self):
        game_state['ball'] = {"x": 320, "y": 180, "vx": 2.5 * random.choice((1, -1)), "vy": 2.5 * random.choice((1, -1))}
        game_state['player1'] = {"y": 180, "speed": 0}
        game_state['player2'] = {"y": 180, "speed": 0}
        game_state['player1_score'] = 0
        game_state['player2_score'] = 0
        game_state['game_started'] = False
        game_state['game_over'] = False

    def ball_restart(self):
        game_state['ball'] = {"x": 320, "y": 180, "vx": 2.5 * random.choice((1, -1)), "vy": 2.5 * random.choice((1, -1))}

    async def update_game_state(self):
        if not game_state['game_started']:
            logger.warning("Game update attempted while game is not started.")
            return

        # Update paddle positions
        game_state['player1']["y"] += game_state['player1']["speed"]
        game_state['player2']["y"] += game_state['player2']["speed"]
        logger.debug(f"P1 y: {game_state['player1']['y']} | P2 y: {game_state['player2']['y']}")
        # Clamp paddle positions
        game_state['player1']["y"] = max(0, min(game_state['player1']["y"], 360 - self.paddle_height))
        game_state['player2']["y"] = max(0, min(game_state['player2']["y"], 360 - self.paddle_height))
        # Update ball position
        game_state['ball']["x"] += game_state['ball']["vx"]
        game_state['ball']["y"] += game_state['ball']["vy"]
        # Ball collision with top and bottom
        if game_state['ball']["y"] <= 0 or game_state['ball']["y"] >= 360:
            game_state['ball']["vy"] *= -1
        # Handle paddle collision
        self.handle_paddle_collision()
        # Score points
        if game_state['ball']["x"] <= 0:
            game_state['player2_score'] += 1
            self.ball_restart()
        elif game_state['ball']["x"] >= 640:
            game_state['player1_score'] += 1
            self.ball_restart()
        # Check for game over
        if game_state['player1_score'] == self.points or game_state['player2_score'] == self.points:
            game_state['game_over'] = True
            game_state['game_started'] = False
            asyncio.create_task(self.broadcast_game_state({'type': 'game_over'}))

    def handle_paddle_collision(self):
        if game_state['ball']["x"] <= 15:
            if game_state['player1']["y"] <= game_state['ball']["y"] <= game_state['player1']["y"] + self.paddle_height:
                relative_intercept = (game_state['player1']["y"] + self.center_paddle_offset) - game_state['ball']["y"]
                normalized_relative_intercept = relative_intercept / self.center_paddle_offset
                bounce_angle = normalized_relative_intercept * self.max_angle
                game_state['ball']["vx"] = abs(game_state['ball']["vx"]) * cos(radians(bounce_angle)) * self.speed_buff
                game_state['ball']["vy"] = abs(game_state['ball']["vx"]) * sin(radians(bounce_angle)) * (-1 if normalized_relative_intercept < 0 else 1) * self.speed_buff
                game_state['ball']["x"] = 15

        elif game_state['ball']["x"] >= 625:
            if game_state['player2']["y"] <= game_state['ball']["y"] <= game_state['player2']["y"] + self.paddle_height:
                relative_intercept = (game_state['player2']["y"] + self.center_paddle_offset) - game_state['ball']["y"]
                normalized_relative_intercept = relative_intercept / self.center_paddle_offset
                bounce_angle = normalized_relative_intercept * self.max_angle
                game_state['ball']["vx"] = -abs(game_state['ball']["vx"]) * cos(radians(bounce_angle)) * self.speed_buff
                game_state['ball']["vy"] = abs(game_state['ball']["vx"]) * sin(radians(bounce_angle)) * (-1 if normalized_relative_intercept < 0 else 1) * self.speed_buff
                game_state['ball']["x"] = 625

    async def run_in_main_loop(self, coro):
        future = asyncio.run_coroutine_threadsafe(coro(), asyncio.get_event_loop())
        return await asyncio.wrap_future(future)
