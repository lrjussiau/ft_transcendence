import json
import random
import asyncio
import logging
from math import cos, sin, radians
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)

class PongConsumer(AsyncWebsocketConsumer):
    Players = {}
    points = 5
    refresh_rate = 120
    speed_buff = 6 / 5
    paddle_height = 70
    center_paddle_offset = paddle_height / 2
    max_angle = 45

    async def connect(self):
        await self.accept()
        self.game_type = None
        self.username = None
        self.opponent = None
        self.keep_open = True
        self.player_num = None
        self.init_game_state()
        asyncio.create_task(self.ensure_connection_open())

    async def ensure_connection_open(self):
        while self.keep_open:
            await asyncio.sleep(1)
            try:
                await self.send(text_data=json.dumps({'type': 'ping'}))
            except Exception as e:
                break

    async def disconnect(self, close_code):
        self.keep_open = False
        if self.username in self.Players:
            del self.Players[self.username]

    async def receive(self, text_data):
        try:
            if not text_data:
                raise ValueError("Empty message received")
            data = json.loads(text_data)

            if data['t'] == 'pi':  # player_input
                self.handle_player_input(data)
                if 'rid' in data:
                    self.request_id = data['rid']
            elif data['t'] == 'sg':  # start_game
                asyncio.create_task(self.start_game())
            elif data['t'] == 'select_game_type':
                if self.username is not None:
                    return
                self.game_type = data.get('game_type')
                self.username = data.get('username', 'Player')
                self.Players[self.username] = self
                await self.assign_players()
        except json.JSONDecodeError as e:
            await self.close(code=4000)
        except Exception as e:
            await self.close(code=4000)

    async def assign_players(self):
        if self.game_type == 'local_1v1':
            self.player_num = 1
            await self.send(text_data=json.dumps({'type': 'game_ready', 'player_num': self.player_num}))
            asyncio.create_task(self.start_game())
        else:
            if len(self.Players) == 2:
                players = list(self.Players.values())
                players[0].opponent = players[1].username
                players[1].opponent = players[0].username
                players[0].player_num = 1
                players[1].player_num = 2
                await players[0].send(text_data=json.dumps({'type': 'game_ready', 'player_num': 1, 'opponent': players[1].username}))
                await players[1].send(text_data=json.dumps({'type': 'game_ready', 'player_num': 2, 'opponent': players[0].username}))
                asyncio.create_task(self.start_game())
            else:
                await self.send(text_data=json.dumps({'type': 'waiting_for_opponent'}))

    def init_game_state(self):
        self.ball = {"x": 320, "y": 180, "vx": 2.5 * random.choice((1, -1)), "vy": 2.5 * random.choice((1, -1))}
        self.player1 = {"y": 160, "speed": 0}
        self.player2 = {"y": 160, "speed": 0}
        self.player1_score = 0
        self.player2_score = 0
        self.game_started = False
        self.game_over = False

    async def send_state(self):
        try:
            for player in self.Players.values():
                await player.send(text_data=json.dumps({
                    'ball': self.ball,
                    'p1': self.player1,
                    'p2': self.player2,
                    's1': self.player1_score,
                    's2': self.player2_score,
                    'go': self.game_over,
                    'gs': self.game_started,
                    'username': player.username,
                    'opponent': player.opponent,
                    'player_num': player.player_num,
                    'rid': getattr(self, 'request_id', None),
                }))
        except Exception as e:
            await self.close(code=4000)

    def ball_restart(self):
        self.ball = {"x": 320, "y": 180, "vx": 2.5 * random.choice((1, -1)), "vy": 2.5 * random.choice((1, -1))}

    async def game_loop(self):
        try:
            while self.game_started and not self.game_over:
                self.update_game_state()
                await self.send_state()
                await asyncio.sleep(1 / self.refresh_rate)
        except Exception as e:
            await self.close(code=4000)

    def padel_colider(self):
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

    def update_game_state(self):
        self.ball["x"] += self.ball["vx"]
        self.ball["y"] += self.ball["vy"]

        if self.ball["y"] <= 0 or self.ball["y"] >= 360:
            self.ball["vy"] *= -1

        if self.ball["x"] <= 15 and self.player1["y"] <= self.ball["y"] <= self.player1["y"] + 70:
            self.padel_colider()
        if self.ball["x"] >= 625 and self.player2["y"] <= self.ball["y"] <= self.player2["y"] + 70:
            self.padel_colider()

        if self.ball["x"] <= 0:
            self.player2_score += 1
            self.ball_restart()
        if self.ball["x"] >= 640:
            self.player1_score += 1
            self.ball_restart()

        self.player1["y"] += self.player1["speed"]
        self.player2["y"] += self.player2["speed"]

        self.player1["y"] = max(0, min(self.player1["y"], 290))
        self.player2["y"] = max(0, min(self.player2["y"], 290))

        if self.player1_score == self.points or self.player2_score == self.points:
            self.game_over = True
            self.game_started = False
            # Remove players after the game ends
            for player in self.Players.values():
                del self.Players[player.username]

    async def countdown(self):
        for i in range(3, 0, -1):
            for player in self.Players.values():
                await player.send(text_data=json.dumps({'type': 'countdown', 'value': i}))
            await asyncio.sleep(1)

    async def start_game(self):
        await self.countdown()
        self.init_game_state()
        self.game_started = True
        self.game_over = False
        self.player1_score = 0
        self.player2_score = 0
        self.ball_restart()
        await self.send_state()
        asyncio.create_task(self.game_loop())

    def handle_local_input(self, data):
        self.player1["speed"] = data.get('p1', 0)
        self.player2["speed"] = data.get('p2', 0)

    def handle_1v1_input(self, data):
        player_num = data.get('player_num')
        if player_num == 2:
            self.player1["speed"] = data.get('speed', 0)
        elif player_num == 1:
            self.player2["speed"] = data.get('speed', 0)

    def handle_player_input(self, data):
        if self.game_type == 'local_1v1':
            self.handle_local_input(data)
        else:
            self.handle_1v1_input(data)
