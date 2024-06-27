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
    speed_buff = 6 / 5
    paddle_height = 70
    center_paddle_offset = paddle_height / 2
    max_angle = 45

    async def connect(self):
        await self.accept()
        logger.info(f'WebSocket connection established from {self.scope["client"]}')
        self.game_type = None
        self.username = None
        self.opponent = None
        self.keep_open = True
        self.player_num = None
        asyncio.create_task(self.ensure_connection_open())

    async def ensure_connection_open(self):
        while self.keep_open:
            await asyncio.sleep(1)
            try:
                await self.send(text_data=json.dumps({'type': 'ping'}))
                logger.info(f'Sent ping to {self.username}')
            except Exception as e:
                logger.error(f'Error keeping connection open for {self.username}: {e}')
                break

    async def disconnect(self, close_code):
        logger.info(f"WebSocket connection closed with code: {close_code} for {self.username}")
        self.keep_open = False
        if self.username in self.Players:
            del self.Players[self.username]
            logger.info(f"Removed {self.username} from Players")

    async def receive(self, text_data):
        logger.info(f"Received message: {text_data} from {self.username}")
        try:
            if not text_data:
                raise ValueError("Empty message received")
            data = json.loads(text_data)
            logger.info(f"Decoded JSON from {self.username}: {data}")

            if data['t'] == 'pi':  # player_input
                logger.info(f"Processing player input from {self.username}")
                if self.game_type == 'local_1v1':
                    self.handle_local_input(data)
                else:
                    self.handle_1v1_input(data)
                if 'rid' in data:
                    self.request_id = data['rid']
            elif data['t'] == 'sg':  # start_game
                logger.info(f"Starting game requested by {self.username}")
                asyncio.create_task(self.start_game())
            elif data['t'] == 'select_game_type':
                if self.username is not None:
                    logger.warning(f"{self.username} has already selected a game type")
                    return
                self.game_type = data.get('game_type')
                self.username = data.get('username', 'Player')
                self.Players[self.username] = self
                logger.info(f"{self.username} selected game type {self.game_type}")
                await self.assign_players()
            else:
                logger.warning(f"Unknown message type: {data['t']} from {self.username}")
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error from {self.username}: {str(e)}")
            await self.close(code=1011)
        except Exception as e:
            logger.error(f"Error during message handling from {self.username}: {str(e)}")
            await self.close(code=1011)

    async def assign_players(self):
        logger.info("Assigning players...")
        if self.game_type == 'local_1v1':
            self.player_num = 1
            await self.send(text_data=json.dumps({'type': 'game_ready', 'player_num': self.player_num}))
            logger.info(f"{self.username} is assigned as player 1 for local 1v1 game")
            asyncio.create_task(self.start_game())
        else:
            if len(self.Players) == 2:
                players = list(self.Players.values())
                players[0].opponent = players[1].username
                players[1].opponent = players[0].username
                if players[0].player_num is None:
                    players[0].player_num = 1
                if players[1].player_num is None:
                    players[1].player_num = 2
                await players[0].send(text_data=json.dumps({'type': 'game_ready', 'player_num': players[0].player_num}))
                await players[1].send(text_data=json.dumps({'type': 'game_ready', 'player_num': players[1].player_num}))
                logger.info(f"Assigned {players[0].username} as player 1 and {players[1].username} as player 2")
                asyncio.create_task(self.start_game())
            else:
                await self.send(text_data=json.dumps({'type': 'waiting_for_opponent'}))
                logger.info(f"{self.username} is waiting for an opponent")

    def init_game_state(self):
        self.ball = {"x": 320, "y": 180, "vx": 2.5 * random.choice((1, -1)), "vy": 2.5 * random.choice((1, -1))}
        self.player1 = {"y": 160, "speed": 0}
        self.player2 = {"y": 160, "speed": 0}
        self.player1_score = 0
        self.player2_score = 0
        self.game_started = False
        self.game_over = False
        logger.info("Initialized game state")

    async def send_state(self):
        logger.info("Sending game state")
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
                    'username': self.username,
                    'opponent': self.opponent,
                    'rid': getattr(self, 'request_id', None),
                }))
                logger.info(f"Game state sent to {player.username}")
        except Exception as e:
            logger.error(f"Error during state sending to {self.username}: {str(e)}")
            await self.close(code=1011)

    def ball_restart(self):
        logger.info("Restarting ball position")
        self.ball = {"x": 320, "y": 180, "vx": 2.5 * random.choice((1, -1)), "vy": 2.5 * random.choice((1, -1))}

    async def game_loop(self):
        try:
            while self.game_started and not self.game_over:
                self.update_game_state()
                await self.send_state()
                await asyncio.sleep(1 / 60)
        except Exception as e:
            logger.error(f"Error during game loop for {self.username}: {str(e)}")
            await self.close(code=1011)

    def padel_colider(self):
        if self.ball["x"] <= 15:  # Collision avec le padel de gauche
            if self.player1["y"] <= self.ball["y"] <= self.player1["y"] + self.paddle_height:
                relative_intercept = (self.player1["y"] + self.center_paddle_offset) - self.ball["y"]
                normalized_relative_intercept = relative_intercept / self.center_paddle_offset
                bounce_angle = normalized_relative_intercept * self.max_angle
                self.ball["vx"] = abs(self.ball["vx"]) * cos(radians(bounce_angle)) * self.speed_buff
                self.ball["vy"] = abs(self.ball["vx"]) * sin(radians(bounce_angle)) * (-1 if normalized_relative_intercept < 0 else 1) * self.speed_buff
                self.ball["x"] = 15

        elif self.ball["x"] >= 625:  # Collision avec le padel de droite
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

        # Collision avec les murs supérieur et inférieur
        if self.ball["y"] <= 0 or self.ball["y"] >= 360:
            self.ball["vy"] *= -1

        # Collision avec les padels
        if self.ball["x"] <= 15 and self.player1["y"] <= self.ball["y"] <= self.player1["y"] + 70:
            self.padel_colider()
        if self.ball["x"] >= 625 and self.player2["y"] <= self.ball["y"] <= self.player2["y"] + 70:
            self.padel_colider()

        # Ballon hors des limites (gauche/droite)
        if self.ball["x"] <= 0:
            self.player2_score += 1
            self.ball_restart()
        if self.ball["x"] >= 640:
            self.player1_score += 1
            self.ball_restart()

        # Mise à jour des positions des joueurs
        self.player1["y"] += self.player1["speed"]
        self.player2["y"] += self.player2["speed"]

        # Garder les padels dans l'écran
        self.player1["y"] = max(0, min(self.player1["y"], 290))
        self.player2["y"] = max(0, min(self.player2["y"], 290))

        # Vérification de fin de partie
        if self.player1_score == self.points or self.player2_score == self.points:
            self.game_over = True
            self.game_started = False

    async def countdown(self):
        for i in range(3, 0, -1):
            for player in self.Players.values():
                await player.send(text_data=json.dumps({'type': 'countdown', 'value': i}))
                logger.info(f"Sent countdown {i} to {player.username}")
            await asyncio.sleep(1)
        logger.info("Countdown completed")

    async def start_game(self):
        await self.countdown()
        self.init_game_state()
        self.game_started = True
        self.game_over = False
        self.player1_score = 0
        self.player2_score = 0
        self.ball_restart()
        await self.send_state()
        logger.info("Game started")
        asyncio.create_task(self.game_loop())

    def handle_local_input(self, data):
        self.player1["speed"] = data.get('p1', 0)
        self.player2["speed"] = data.get('p2', 0)

    def handle_1v1_input(self, data):
        if self.player_num == 1:
            self.player1["speed"] = data.get('speed', 0)
        elif self.player_num == 2:
            self.player2["speed"] = data.get('speed', 0)
