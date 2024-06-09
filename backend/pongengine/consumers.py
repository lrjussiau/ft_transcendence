import json
import random
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer

class PongConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        self.init_game_state()
        await self.send_state()

    async def disconnect(self, close_code):
        self.game_started = False

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data['t'] == 'sg':  # start_game
            self.init_game_state()  # Reset paddle positions at the start of the game
            self.game_started = True
            self.game_over = False
            self.player1_score = 0
            self.player2_score = 0
            self.ball_restart()
            await self.send_state()
            asyncio.create_task(self.game_loop())  # Start the game loop
        elif data['t'] == 'pi':  # player_input
            self.player1["speed"] = data.get('p1', 0)  # player1Speed
            self.player2["speed"] = data.get('p2', 0)  # player2Speed
            if 'rid' in data:
                self.request_id = data['rid']

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
            'b': self.encode_ball_position(),           # ball position
            'p1': self.player1,                         # player1
            'p2': self.player2,                         # player2
            's1': self.player1_score,                   # player1_score
            's2': self.player2_score,                   # player2_score
            'go': self.game_over,                       # game_over
            'gs': self.game_started,                    # game_started
            'rid': getattr(self, 'request_id', None)    # round trip id counter
        }))

    def encode_ball_position(self):
        # Encode the x and y positions of the ball into an integer
        return (self.ball["x"] << 16) | (self.ball["y"])

    def decode_ball_position(self, position):
        # Decode the integer into x and y positions
        return {"x": (position >> 16) & 0xFFFF, "y": position & 0xFFFF}

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
            self.ball["x"] = 15  # Reset ball position to avoid sliding
        if self.ball["x"] >= 625 and self.player1["y"] <= self.ball["y"] <= self.player1["y"] + 70:
            self.ball["vx"] *= -1
            self.ball["x"] = 625  # Reset ball position to avoid sliding

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
