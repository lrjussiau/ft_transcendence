# backend/pongengine/consumers.py

import json
import random
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer

class PongConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        self.init_game_state()
        await self.send_state()
        await self.game_loop()

    async def disconnect(self, close_code):
        self.game_started = False

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data['type'] == 'start_game':
            self.game_started = True
            self.game_over = False
            self.player1_score = 0
            self.player2_score = 0
            self.ball_restart()
            await self.send_state()
        elif data['type'] == 'player_input':
            self.player1["speed"] = data.get('player1Speed', 0)
            self.player2["speed"] = data.get('player2Speed', 0)

    def init_game_state(self):
        self.ball = {"x": 320, "y": 180, "vx": 7 * random.choice((1, -1)), "vy": 7 * random.choice((1, -1))}
        self.player1 = {"y": 160, "speed": 0}
        self.player2 = {"y": 160, "speed": 0}
        self.player1_score = 0
        self.player2_score = 0
        self.game_started = False
        self.game_over = False

    async def send_state(self):
        await self.send(text_data=json.dumps({
            'ball': self.ball,
            'player1': self.player1,
            'player2': self.player2,
            'player1_score': self.player1_score,
            'player2_score': self.player2_score,
            'game_over': self.game_over,
            'game_started': self.game_started
        }))

    def ball_restart(self):
        self.ball = {"x": 320, "y": 180, "vx": 7 * random.choice((1, -1)), "vy": 7 * random.choice((1, -1))}

    async def game_loop(self):
        while self.game_started and not self.game_over:
            self.update_game_state()
            await self.send_state()
            await asyncio.sleep(1 / 60)  # 60 FPS

    def update_game_state(self):
        self.ball["x"] += self.ball["vx"]
        self.ball["y"] += self.ball["vy"]

        # Ball collision with top/bottom walls
        if self.ball["y"] <= 0 or self.ball["y"] >= 360:
            self.ball["vy"] *= -1

        # Ball collision with paddles
        if self.ball["x"] <= 15 and self.player2["y"] <= self.ball["y"] <= self.player2["y"] + 70:
            self.ball["vx"] *= -1
        if self.ball["x"] >= 625 and self.player1["y"] <= self.ball["y"] <= self.player1["y"] + 70:
            self.ball["vx"] *= -1

        # Ball out of bounds (left/right)
        if self.ball["x"] <= 0:
            self.player2_score += 1
            self.ball_restart()
        if self.ball["x"] >= 640:
            self.player1_score += 1
            self.ball_restart()

        # Update player positions
        self.player1["y"] += self.player1["speed"]
        self.player2["y"] += self.player2["speed"]

        # Keep paddles within the screen
        self.player1["y"] = max(0, min(self.player1["y"], 290))
        self.player2["y"] = max(0, min(self.player2["y"], 290))

        # Check for game over
        if self.player1_score == 5 or self.player2_score == 5:
            self.game_over = True
            self.game_started = False
