import json
import random
import asyncio
import logging
from math import cos, sin, radians
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)

#======================= JSON MESSAGES =======================#
# --------------------------- SEND -------------------------- #
# 'ping'                      : { "type": "ping" }
# 'update'                    : { "type": "update", "data": { "ball": {...}, "s1": ..., "s2": ..., "go": ..., "gs": ... } }
# 'game_ready'                : { "type": "game_ready" }
# 'player_disconnected'       : { "type": "player_disconnected" }
# 'game_over'                 : { "type": "game_over" }
# 'countdown'                 : { "type": "countdown", "value": ... }
# 'error'                     : { "type": "error", "message": "..." }

# ------------------------- RECEIVE ------------------------- #
# 'pi' (player input)         : { "t": "pi", "player_num": ..., "speed": ... }
# 'sg' (start game)           : { "t": "sg" }
# 'select_game_type'          : { "t": "select_game_type", "username": "...", "game_type": "..." }

class PongConsumer(AsyncWebsocketConsumer):
    
    # ------------------------- DEFINES ----------------------------#
    Players = {}
    points = 50
    refresh_rate = 120
    speed_buff = 6 / 5
    paddle_height = 70
    center_paddle_offset = paddle_height / 2
    max_angle = 45

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
        self.init_game_state()
        self.keep_open = True
        asyncio.create_task(self.ensure_connection_open())

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
        if self.channel_name in self.Players:
            del self.Players[self.channel_name]
            await self.broadcast_game_state({'type': 'player_disconnected'})

    async def receive(self, text_data):
        data = json.loads(text_data)
        logger.debug(f"Data received: {data}")
        action = data.get('t')
        if action == 'pi':
            await self.handle_player_input(data)
        elif action == 'sg' and not self.game_started:
            asyncio.create_task(self.start_game())
        elif action == 'select_game_type' and not self.game_started:
            await self.handle_game_selection(data)
        elif action == 'disconnect':
            await self.disconnect(1001)
        elif action == 'pong':
            await self.handle_pong()
        elif action == 'stop_game':
            await self.stop_current_game()

    async def broadcast_game_state(self, extra_info=None):
        state = {
            'type': 'update',
            'ball': self.ball,
            'p1': self.player1,
            'p2': self.player2,
            's1': self.player1_score,
            's2': self.player2_score,
            'go': self.game_over,
            'gs': self.game_started,
        }
        if extra_info:
            state.update(extra_info)
        for player in self.Players.values():
            await player['object'].send(text_data=json.dumps(state))

    async def handle_pong(self):
        player = self.Players.get(self.channel_name)
        if player:
            username = player.get("username", "Unknown")
            logger.debug(f"Pong by client {username}")

    # --------------------------- INPUT HANDLING ----------------------#

    async def handle_player_input(self, data):
        player1_speed = data.get('p1', 0)
        player2_speed = data.get('p2', 0)
        self.player1["speed"] = player1_speed
        self.player2["speed"] = player2_speed

        # if not self.game_started:
        #     logger.error("Received input while game not started")
        #     return
        # if self.game_type == 'local_1v1':
        #     self.handle_local_input(data)
        # elif self.game_type == '1v1':
        #     self.handle_1v1_input(data)
        # else:
        #     logger.warning(f"Unexpected game type: {self.game_type}")
        #     return
        asyncio.create_task(self.broadcast_game_state())

    def handle_local_input(self, data):
        player1_speed = data.get('p1', 0)
        player2_speed = data.get('p2', 0)
        self.player1["speed"] = player1_speed
        self.player2["speed"] = player2_speed


    def handle_1v1_input(self, data):
        player_num = data.get('player_num')
        player1_speed = data.get('p1', 0)  # vitesse du joueur 1
        player2_speed = data.get('p2', 0)  # vitesse du joueur 2

        # Assurez-vous que les données sont bien structurées pour le mode 1v1.
        if player_num == 1:
            # Si c'est le joueur 1, on utilise les vitesses pour le joueur 1 et le joueur 2.
            self.Players['player1']["speed"] = player1_speed
            self.Players['player2']["speed"] = player2_speed
        elif player_num == 2:
            # Si c'est le joueur 2, on suppose que les vitesses peuvent être inversées.
            self.Players['player1']["speed"] = player2_speed
            self.Players['player2']["speed"] = player1_speed
        else:
            logger.error("Invalid player number received in input.")

        # Après mise à jour, diffusez l'état du jeu à tous les joueurs.
        asyncio.create_task(self.broadcast_game_state())

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
            self.player1 = {"y": 180, "speed": 0}
            self.player2 = {"y": 180, "speed": 0}
            self.Players[self.channel_name]['player_num'] = 1
            await self.start_game()
        elif self.game_type == '1v1':
            if len(self.Players) >= 2:
                await self.assign_players()
            else:
                logger.debug("Waiting for second player to join...")
        else:
            logger.warning(f"Unexpected game type: {self.game_type}")


    async def assign_players(self):
        players = list(self.Players.values())
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
        self.start_game()


    # ---------------------------- GAME LOGIC ------------------------#

    async def game_loop(self):
        while self.game_started and not self.game_over:
            await self.update_game_state()
            await self.broadcast_game_state()
            await asyncio.sleep(1 / self.refresh_rate)

    async def start_game(self):
        if self.game_started:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'A game is already in progress.'
            }))
            return

        await self.countdown()
        self.init_game_state()
        self.game_started = True
        self.game_over = False
        self.player1_score = 0
        self.player2_score = 0
        self.ball_restart()
        asyncio.create_task(self.game_loop())

    async def stop_current_game(self):
        self.game_started = False
        self.game_over = True
        await self.broadcast_game_state({'type': 'game_over'})

    async def countdown(self):
        for i in range(3, 0, -1):
            await asyncio.sleep(1)
            for player in self.Players.values():
                await player['object'].send(text_data=json.dumps({'type': 'countdown', 'value': i}))
        await self.broadcast_game_state({'type': 'start_game'})

    async def check_game_over(self):
        if self.player1_score == self.points or self.player2_score == self.points:
            self.game_over = True
            self.game_started = False
            logger.debug("Game over")
            await self.broadcast_game_state({'type': 'game_over'})
            await self.disconnect(1001)

    def init_game_state(self):
        self.ball = {"x": 320, "y": 180, "vx": 2.5 * random.choice((1, -1)), "vy": 2.5 * random.choice((1, -1))}
        self.player1 = {"y": 180, "speed": 0}
        self.player2 = {"y": 180, "speed": 0}
        self.player1_score = 0
        self.player2_score = 0
        self.game_started = False
        self.game_over = False

    def ball_restart(self):
        self.ball = {"x": 320, "y": 180, "vx": 2.5 * random.choice((1, -1)), "vy": 2.5 * random.choice((1, -1))}

    async def update_game_state(self):
        # Update paddle positions
        # if self.game_type == '1v1':
        #     self.player1["y"] += self.Players['player1']["speed"]
        #     self.player2["y"] += self.Players['player2']["speed"]
        # elif self.game_type == 'local_1v1':
        self.player1["y"] += self.player1["speed"]
        self.player2["y"] += self.player2["speed"]
        # Clamp paddle positions
        self.player1["y"] = max(0, min(self.player1["y"], 360 - self.paddle_height))
        self.player2["y"] = max(0, min(self.player2["y"], 360 - self.paddle_height))
        # Update ball position
        self.ball["x"] += self.ball["vx"]
        self.ball["y"] += self.ball["vy"]
        # Ball collision with top and bottom
        if self.ball["y"] <= 0 or self.ball["y"] >= 360:
            self.ball["vy"] *= -1
        # Handle paddle collision
        self.handle_paddle_collision()
        # Score points
        if self.ball["x"] <= 0:
            self.player2_score += 1
            self.ball_restart()
        elif self.ball["x"] >= 640:
            self.player1_score += 1
            self.ball_restart()
        # Check for game over
        if self.player1_score == self.points or self.player2_score == self.points:
            self.game_over = True
            self.game_started = False
            asyncio.create_task(self.broadcast_game_state({'type': 'game_over'}))

    def handle_paddle_collision(self):
        if self.ball["x"] <= 15:
            if self.player1["y"] <= self.ball["y"] <= self.player1["y"] + self.paddle_height:
                relative_intercept = (self.player1["y"] + self.center_paddle_offset) - self.ball["y"]
                normalized_relative_intercept = relative_intercept / self.center_paddle_offset
                bounce_angle = normalized_relative_intercept * self.max_angle
                self.ball["vx"] = abs(self.ball["vx"]) * cos(radians(bounce_angle)) * self.speed_buff
                self.ball["vy"] = abs(self.ball["vx"]) * sin(radians(bounce_angle)) * (-1 if normalized_relative_intercept < 0 else 1) * self.speed_buff
                self.ball["x"] = 15

        elif self.ball["x"] >= 625:
            if self.player2["y"] <= self.ball["y"] <= self.player2["y"] + self.paddle_height:
                relative_intercept = (self.player2["y"] + self.center_paddle_offset) - self.ball["y"]
                normalized_relative_intercept = relative_intercept / self.center_paddle_offset
                bounce_angle = normalized_relative_intercept * self.max_angle
                self.ball["vx"] = -abs(self.ball["vx"]) * cos(radians(bounce_angle)) * self.speed_buff
                self.ball["vy"] = abs(self.ball["vx"]) * sin(radians(bounce_angle)) * (-1 if normalized_relative_intercept < 0 else 1) * self.speed_buff
                self.ball["x"] = 625
