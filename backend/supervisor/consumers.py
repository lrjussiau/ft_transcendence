import json
import asyncio
import logging
import random
from math import cos, sin, radians
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)

class PongConsumer(AsyncWebsocketConsumer):
    players = {}  # Store players' connections
    games = {}    # Store ongoing games

    async def connect(self):
        await self.accept()
        self.game_id = None
        self.username = None

    async def disconnect(self, close_code):
        if self.game_id and self.username:
            if self.username in PongConsumer.games.get(self.game_id, []):
                PongConsumer.games[self.game_id].remove(self.username)
            if not PongConsumer.games.get(self.game_id):
                PongConsumer.games.pop(self.game_id, None)

        PongConsumer.players.pop(self.username, None)
        logger.info(f"WebSocket connection closed with code: {close_code}")

    async def receive(self, text_data):
        logger.info(f"Received message: {text_data}")
        try:
            if not text_data:
                raise ValueError("Empty message received")
            data = json.loads(text_data)
            logger.info(f"Decoded JSON: {data}")

            if data['t'] == 'select_game_type':
                self.username = data.get('username')
                game_type = data.get('game_type')
                if game_type == '1v1':
                    await self.handle_1v1(data)
                elif game_type == 'local_1v1':
                    await self.start_game()
            elif data['t'] == 'pi':  # player_input
                await self.handle_player_input(data)
            elif data['t'] == 'sg':  # start_game
                await self.start_game()
            elif data['t'] == 'delete_matches_and_players':
                await self.delete_matches_and_players(data)
            else:
                logger.warning(f"Unknown message type: {data['t']}")
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {str(e)}")
            await self.close(code=4000)
        except Exception as e:
            logger.error(f"Error during message handling: {str(e)}")
            await self.close(code=4000)

    async def handle_1v1(self, data):
        self.username = data['username']
        opponent = data.get('opponent')
        if not opponent:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Opponent name is required for 1v1 game type.'
            }))
            return

        if opponent in PongConsumer.players:
            self.game_id = f"{self.username}_vs_{opponent}"
            PongConsumer.games[self.game_id] = {self.username, opponent}
            await PongConsumer.players[opponent].send(text_data=json.dumps({
                'type': 'match_created',
                'match': {'player1': self.username, 'player2': opponent}
            }))
            await self.send(text_data=json.dumps({
                'type': 'match_created',
                'match': {'player1': self.username, 'player2': opponent}
            }))
            # Start the game for both players
            await self.start_game()
        else:
            PongConsumer.players[self.username] = self
            await self.send(text_data=json.dumps({
                'type': 'waiting_for_opponent'
            }))

    async def handle_player_input(self, data):
        if self.game_id in PongConsumer.games:
            for player in PongConsumer.games[self.game_id]:
                if player != self.username and player in PongConsumer.players:
                    await PongConsumer.players[player].send(text_data=json.dumps(data))
        if self.username in PongConsumer.games.get(self.game_id, {}):
            if self.username == list(PongConsumer.games[self.game_id])[0]:
                self.player1["speed"] = data.get('p1', 0)  # player1Speed
            else:
                self.player2["speed"] = data.get('p2', 0)  # player2Speed

    async def start_game(self):
        await self.send(text_data=json.dumps({'type': 'countdown', 'value': 3}))
        await asyncio.sleep(1)
        await self.send(text_data=json.dumps({'type': 'countdown', 'value': 2}))
        await asyncio.sleep(1)
        await self.send(text_data=json.dumps({'type': 'countdown', 'value': 1}))
        await asyncio.sleep(1)
        self.init_game_state()
        self.game_started = True
        self.game_over = False
        self.player1_score = 0
        self.player2_score = 0
        self.ball_restart()
        await self.send_state()
        asyncio.create_task(self.game_loop())

    async def delete_matches_and_players(self, data):
        username = data.get('username')
        if username in PongConsumer.players:
            del PongConsumer.players[username]
        games_to_delete = [game_id for game_id, players in PongConsumer.games.items() if username in players]
        for game_id in games_to_delete:
            del PongConsumer.games[game_id]
        await self.send(text_data=json.dumps({
            'type': 'info',
            'message': 'Matches and players deleted successfully.'
        }))

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
            state = {
                'ball': self.ball,
                'p1': self.player1,
                'p2': self.player2,
                's1': self.player1_score,
                's2': self.player2_score,
                'go': self.game_over,
                'gs': self.game_started
            }
            await self.send(text_data=json.dumps(state))
            # Send state to opponent
            if self.game_id in PongConsumer.games:
                for player in PongConsumer.games[self.game_id]:
                    if player != self.username and player in PongConsumer.players:
                        await PongConsumer.players[player].send(text_data=json.dumps(state))
        except Exception as e:
            logger.error(f"Error during state sending: {str(e)}")
            await self.close(code=4000)

    def ball_restart(self):
        self.ball = {"x": 320, "y": 180, "vx": 2.5 * random.choice((1, -1)), "vy": 2.5 * random.choice((1, -1))}

    async def game_loop(self):
        try:
            while self.game_started and not self.game_over:
                self.update_game_state()
                await self.send_state()
                await asyncio.sleep(1 / 60)  # 60 FPS
        except Exception as e:
            logger.error(f"Error during game loop: {str(e)}")
            await self.close(code=4000)

    def padel_colider(self):
        speed_buff = 6 / 5
        paddle_height = 70
        center_paddle_offset = paddle_height / 2
        max_angle = 45  # Angle maximum de réflexion en degrés

        if self.ball["x"] <= 15:  # Collision avec le padel de gauche
            if self.player2["y"] <= self.ball["y"] <= self.player2["y"] + paddle_height:
                relative_intercept = (self.player2["y"] + center_paddle_offset) - self.ball["y"]
                normalized_relative_intercept = relative_intercept / center_paddle_offset
                bounce_angle = normalized_relative_intercept * max_angle
                self.ball["vx"] = abs(self.ball["vx"]) * cos(radians(bounce_angle)) * speed_buff
                self.ball["vy"] = abs(self.ball["vx"]) * sin(radians(bounce_angle)) * (-1 if normalized_relative_intercept < 0 else 1) * speed_buff
                self.ball["x"] = 15  # Réinitialiser la position de la balle pour éviter le glissement

        elif self.ball["x"] >= 625:  # Collision avec le padel de droite
            if self.player1["y"] <= self.ball["y"] <= self.player1["y"] + paddle_height:
                relative_intercept = (self.player1["y"] + center_paddle_offset) - self.ball["y"]
                normalized_relative_intercept = relative_intercept / center_paddle_offset
                bounce_angle = normalized_relative_intercept * max_angle
                self.ball["vx"] = -abs(self.ball["vx"]) * cos(radians(bounce_angle)) * speed_buff
                self.ball["vy"] = abs(self.ball["vx"]) * sin(radians(bounce_angle)) * (-1 if normalized_relative_intercept < 0 else 1) * speed_buff
                self.ball["x"] = 625  # Réinitialiser la position de la balle pour éviter le glissement

    def update_game_state(self):
        self.ball["x"] += self.ball["vx"]
        self.ball["y"] += self.ball["vy"]

        # Collision avec les murs supérieur et inférieur
        if self.ball["y"] <= 0 or self.ball["y"] >= 360:
            self.ball["vy"] *= -1

        # Collision avec les padels
        if self.ball["x"] <= 15 and self.player2["y"] <= self.ball["y"] <= self.player2["y"] + 70:
            self.padel_colider()
        if self.ball["x"] >= 625 and self.player1["y"] <= self.ball["y"] <= self.player1["y"] + 70:
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
        if self.player1_score == 50 or self.player2_score == 50:
            self.game_over = True
            self.game_started = False
