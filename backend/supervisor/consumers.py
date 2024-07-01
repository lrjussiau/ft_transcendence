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

    async def disconnect(self):
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
            self.handle_player_input(data)
        elif action == 'sg' and not self.game_started:
            asyncio.create_task(self.start_game())
        elif action == 'select_game_type' and not self.game_started:
            self.handle_game_selection(data)
        elif action == 'pong':
            self.handle_pong()

    async def broadcast_game_state(self, extra_info=None):
        state = {
            'type': 'update',
            'ball': self.ball,
            's1': self.player1_score,
            's2': self.player2_score,
            'go': self.game_over,
            'gs': self.game_started,
        }
        if extra_info:
            state.update(extra_info)
        for player in self.Players.values():
            await player['object'].send(text_data=json.dumps(state))

    def handle_pong(self):
        logger.debug("Pong received from client")

    # --------------------------- INPUT HANDLING ----------------------#

    def handle_local_input(self, data):
        self.player1["speed"] = data.get('p1', 0)
        self.player2["speed"] = data.get('p2', 0)
        self.broadcast_game_state()

    def handle_1v1_input(self, data):
        player_num = data.get('player_num')
        speed = data.get('speed', 0)
        logger.debug(f"Player [{player_num}] speed = {speed}")
        if player_num == 1:
            self.Players['player1']["speed"] = speed
        elif player_num == 2:
            self.Players['player2']["speed"] = speed
        self.broadcast_game_state()

    def handle_player_input(self, data):
        if self.game_type == 'local_1v1':
            self.handle_local_input(data)
        elif self.game_type == '1v1':
            self.handle_1v1_input(data)
        else:
            return

    async def handle_game_selection(self, data):
        self.username = data.get('username', 'Player')
        self.game_type = data.get('game_type')
        self.Players[self.channel_name]['username'] = self.username
        logger.debug(f"Game type selected: {self.game_type} by {self.username}")
        if self.game_type == 'local_1v1':
            self.Players[self.channel_name]['player_num'] = 1
            await self.start_game()
        elif len(self.Players) >= 2:
            await self.assign_players()

    async def assign_players(self):
        players = list(self.Players.values())
        for i, player in enumerate(players):
            player['player_num'] = i + 1
        await self.broadcast_game_state({'type': 'game_ready'})

    # ---------------------------- GAME LOGIC ------------------------#

    async def game_loop(self):
        while self.game_started and not self.game_over:
            self.update_game_state()
            await self.send_state()
            await asyncio.sleep(1 / self.refresh_rate)

    async def start_game(self):
        if self.game_started:
            await self.send_state({
                'type': 'error',
                'message': 'A game is already in progress. It will be terminated now.'
            })
            self.game_over = True
            await self.disconnect(1001)
        await self.countdown()
        self.init_game_state()
        self.refresh_rate = 60 if self.game_type == 'local_1v1' else self.refresh_rate
        self.game_started = True
        self.game_over = False
        self.player1_score = 0
        self.player2_score = 0
        self.ball_restart()
        asyncio.create_task(self.game_loop())

    async def countdown(self):
        for i in range(3, 0, -1):
            await asyncio.sleep(1)
            for player in self.Players.values():
                await player['object'].send(text_data=json.dumps({'type': 'countdown', 'value': i}))

    async def check_game_over(self):
        if self.player1_score == self.points or self.player2_score == self.points:
            self.game_over = True
            self.game_started = False
            logger.debug("Game over")
            self.broadcast_game_state({'type': 'game_over'})
            await self.disconnect(1001)

    def init_game_state(self):
        self.ball = {"x": 320, "y": 180, "vx": 2.5 * random.choice((1, -1)), "vy": 2.5 * random.choice((1, -1))}
        self.player1_score = 0
        self.player2_score = 0
        self.game_started = False
        self.game_over = False

    def ball_restart(self):
        self.ball = {"x": 320, "y": 180, "vx": 2.5 * random.choice((1, -1)), "vy": 2.5 * random.choice((1, -1))}

    def update_game_state(self):
        self.ball["x"] += self.ball["vx"]
        self.ball["y"] += self.ball["vy"]
        if self.ball["y"] <= 0 or self.ball["y"] >= 360:
            self.ball["vy"] *= -1
        self.handle_paddle_collision()
        if self.ball["x"] <= 0:
            self.player2_score += 1
            self.ball_restart()
        elif self.ball["x"] >= 640:
            self.player1_score += 1
            self.ball_restart()
        self.check_game_over()

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