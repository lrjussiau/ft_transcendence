import json
import asyncio
import logging
import random
from supervisor.pongengine.simple_ai import Ai
from games_history.views import store_game
from math import cos, sin, radians

logger = logging.getLogger(__name__)

game_state = {
    "ball": {"x": 320, "y": 180, "vx": 150 * random.choice((1, -1)), "vy": 150 * random.choice((1, -1))},
    "player1": {"y": 180, "speed": 0},
    "player2": {"y": 180, "speed": 0},
    "player1_score": 0,
    "player2_score": 0,
    "game_started": False,
    "game_over": False,
    "game_loop_running": False
}

class PongConsumer:
    points = 5
    refresh_rate = 120
    speed_buff = 7 / 6
    paddle_height = 70
    center_paddle_offset = paddle_height / 2
    max_angle = 45
    global_speed_factor = 1.5

    def __init__(self, players, game_type):
        self.Players = {i+1: player for i, player in enumerate(players)}  # Convert list to dict
        self.game_type = game_type
        self.last_update_time = None
        self.AI = Ai() if game_type == "solo" else None


    def is_game_running(self):
        return game_state['game_started']
    
    async def end_game(self):
        if not game_state['game_started'] and not game_state['game_loop_running']:
            logger.debug("Game is not running, ignoring end_game call")
            return
        game_state['game_over'] = True
        game_state['game_started'] = False
        game_state['game_loop_running'] = False
        p1 = next((player_data for player_data in self.Players.values() if player_data["player_num"] == 1), None)
        p2 = next((player_data for player_data in self.Players.values() if player_data["player_num"] == 2), None)
        logger.debug(f"player1: {p1.get('username')}, player2: {p2.get('username')}")
        if not self.game_type == "local_1v1":
            if (p2 != None):
                p1_username =  p1.get('username')
                p2_username =  p2.get('username')
                if game_state['player1_score'] == self.points:
                    if self.game_type == "tournament":
                        await store_game(game_state['player2_score'], p2_username, p1_username, True)
                    else:
                        await store_game(game_state['player2_score'], p2_username, p1_username, False)
                else:
                    if self.game_type == "tournament":
                        await store_game(game_state['player1_score'], p1_username, p2_username, True)
                    else:
                        await store_game(game_state['player1_score'], p1_username, p2_username, False)   
        try:
            await self.broadcast_game_state({'type': 'game_over'})
        except Exception as e:
            logger.error(f"Error broadcasting game over state: {e}")
        logger.debug("Game ended")

    async def start_game(self):
        if game_state['game_started'] or game_state['game_loop_running']:
            logger.debug("Game is already running, ignoring start_game call")
            return

        self.init_game_state()  # This resets the game state
        await self.start_countdown()
        game_state['game_started'] = True
        game_state['game_over'] = False
        self.ball_restart()

        logger.debug(f"Game started with players: {self.Players}")

        game_state['game_loop_running'] = True
        asyncio.create_task(self.game_loop())

    async def game_loop(self):
        self.last_update_time = asyncio.get_event_loop().time()
        logger.debug("Game loop started")
        while game_state['game_started'] and not game_state['game_over']:
            current_time = asyncio.get_event_loop().time()
            dt = current_time - self.last_update_time
            self.last_update_time = current_time

            await self.update_game_state(dt)
            await self.broadcast_game_state()
            await asyncio.sleep(1 / self.refresh_rate)
        logger.debug("Game loop ended")

    async def update_game_state(self, dt):
        if not game_state['game_started']:
            return

        game_state['player1']["y"] += game_state['player1']["speed"] * dt * 100 * self.global_speed_factor
        game_state['player2']["y"] += game_state['player2']["speed"] * dt * 100 * self.global_speed_factor
        game_state['player1']["y"] = max(0, min(game_state['player1']["y"], 360 - self.paddle_height))
        game_state['player2']["y"] = max(0, min(game_state['player2']["y"], 360 - self.paddle_height))

        game_state['ball']["x"] += game_state['ball']["vx"] * dt * self.global_speed_factor
        game_state['ball']["y"] += game_state['ball']["vy"] * dt * self.global_speed_factor

        if game_state['ball']["y"] <= 0 or game_state['ball']["y"] >= 360:
            game_state['ball']["vy"] *= -1

        self.handle_paddle_collision()

        if game_state['ball']["x"] <= 0:
            game_state['player2_score'] += 1
            self.ball_restart()
        elif game_state['ball']["x"] >= 640:
            game_state['player1_score'] += 1
            self.ball_restart()

        if game_state['player1_score'] == self.points or game_state['player2_score'] == self.points:
                game_state['game_over'] = True
                game_state['game_started'] = False
                game_state['game_loop_running'] = False  # Add this line
                await self.broadcast_game_state({'type': 'game_over'})
                logger.debug("Game over signal sent")  # Add this line

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

    async def start_countdown(self):
        for i in range(3, 0, -1):
            logger.debug(f"Countdown: {i}")
            await self.broadcast_game_state({'type': 'countdown', 'value': i})
            await asyncio.sleep(1)
        logger.debug("Countdown finished")

    def init_game_state(self):
        game_state['ball'] = {"x": 320, "y": 180, "vx": 150 * random.choice((1, -1)), "vy": 150 * random.choice((1, -1))}
        game_state['player1'] = {"y": 180, "speed": 0}
        game_state['player2'] = {"y": 180, "speed": 0}
        game_state['player1_score'] = 0
        game_state['player2_score'] = 0
        game_state['game_started'] = False
        game_state['game_over'] = False
        if self.AI:
            self.AI.store_state(game_state)

    def ball_restart(self):
        game_state['ball'] = {"x": 320, "y": 180, "vx": 150 * random.choice((1, -1)), "vy": 150 * random.choice((1, -1))}

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
        logger.debug(f"Local 1v1 input: Player 1 speed = {player1_speed}, Player 2 speed = {player2_speed}")

    def handle_1v1_input(self, data):
        player_num = data.get('player_num', 0)
        speed = data.get('speed', 0)
        if player_num in [1, 2]:
            game_state[f'player{player_num}']["speed"] = speed
            logger.debug(f"Player {player_num} speed set to {speed}")
        else:
            logger.error(f"Invalid player number received: {player_num}")

    async def broadcast_game_state(self, extra_info=None):
        base_state = {
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
            base_state.update(extra_info)

        for player_num, player in self.Players.items():
            state = base_state.copy()
            if player_num == 2:
                state['ball'] = self.flip_coordinates(state['ball'])
                state['p1'], state['p2'] = state['p2'], state['p1']
                state['s1'], state['s2'] = state['s2'], state['s1']
            try:
                await player['object'].send(text_data=json.dumps(state))
            except Exception as e:
                logger.error(f"Error sending game state: {e}")
        if self.AI:
            ai_move = self.AI.act()
            game_state['player1']['y'] += ai_move
            game_state['player1']['y'] = max(0, min(game_state['player1']['y'], 290))
            self.AI.store_state(game_state)

    def flip_coordinates(self, obj):
        flipped = obj.copy()
        if 'x' in flipped:
            flipped['x'] = 640 - flipped['x']
        if 'vx' in flipped:
            flipped['vx'] = -flipped['vx']
        return flipped

    async def end_game(self):
        if not game_state['game_started'] and not game_state['game_loop_running']:
            logger.debug("Game is not running, ignoring end_game call")
            return
        game_state['game_over'] = True
        game_state['game_started'] = False
        game_state['game_loop_running'] = False
        try:
            await self.broadcast_game_state({'type': 'game_over'})
        except Exception as e:
            logger.error(f"Error broadcasting game over state: {e}")
        logger.debug("Game ended")
        return True
