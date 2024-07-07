# import json
# import random
# import asyncio
# import logging
# from math import cos, sin, radians
# from channels.generic.websocket import AsyncWebsocketConsumer

# logger = logging.getLogger(__name__)

# # État du jeu global partagé par tous les joueurs
# game_state = {
#     "ball": {"x": 320, "y": 180, "vx": 150 * random.choice((1, -1)), "vy": 150 * random.choice((1, -1))},
#     "player1": {"y": 180, "speed": 0},
#     "player2": {"y": 180, "speed": 0},
#     "player1_score": 0,
#     "player2_score": 0,
#     "game_started": False,
#     "game_over": False,
#     "game_loop_running": False  # Ajout de cette variable
# }

# class TournamentManager:
#     _instance = None

#     def __new__(cls):
#         if cls._instance is None:
#             cls._instance = super(TournamentManager, cls).__new__(cls)
#             cls._instance.players = []
#             cls._instance.player_count = 0
#         return cls._instance

#     def add_player(self, player_info):
#         self.player_count += 1
#         player_info['player_num'] = self.player_count
#         self.players.append(player_info)
#         return self.player_count

#     def get_player_count(self):
#         return len(self.players)

# class PongConsumer(AsyncWebsocketConsumer):

#     # ------------------------- DEFINES ----------------------------#

#     def __init__(self, *args, **kwargs):
#         super().__init__(*args, **kwargs)
#         self.connection_task = None
#         self.keep_open = False
#         self.tournament_players = []
#         self.tournament_player_count = 0

#     Players = {}
#     points = 5
#     refresh_rate = 120
#     speed_buff = 7 / 6
#     paddle_height = 70
#     center_paddle_offset = paddle_height / 2
#     max_angle = 45
#     game_lock = asyncio.Lock()
#     Debug_log = True
#     last_update_time = None
#     global_speed_factor = 1.5
#     tournament_manager = TournamentManager()
    

#     # ----------------------- WEBSOCKET MANAGEMENT -------------------#

#     async def connect(self):
#         await self.accept()
#         self.game_type = None
#         self.keep_open = True
#         self.connection_task = asyncio.create_task(self.ensure_connection_open())

#         if 'tournament' not in self.Players:
#             self.Players['tournament'] = {}

#         self.Players[self.channel_name] = {
#             "object": self,
#             "username": None,
#             "player_num": None,
#             "speed": 0
#         }

#         if self.Debug_log:
#             logger.debug(f"Player connected: {self.channel_name}")

#     async def ensure_connection_open(self):
#         while self.keep_open:
#             await asyncio.sleep(1)
#             try:
#                 await self.send(text_data=json.dumps({'type': 'ping'}))
#             except Exception as e:
#                 logger.error("Error sending ping: " + str(e))
#                 break

#     async def disconnect(self, code):
#         if self.Debug_log:
#             logger.debug(f"Player disconnected: {self.channel_name}")
#         self.keep_open = False
#         if self.connection_task:
#             self.connection_task.cancel()
#         if self.channel_name in self.Players:
#             del self.Players[self.channel_name]

#             if len(self.Players) == 1:
#                 await self.broadcast_game_state({'type': 'player_disconnected'})

#             await self.stop_current_game()

    # async def receive(self, text_data):
    #     data = json.loads(text_data)
    #     if self.Debug_log:
    #         logger.debug(f"Data received: {data}")
    #     action = data.get('t')
    #     if action == 'pi':
    #         await self.handle_player_input(data)
    #     elif action == 'sg' and not game_state['game_started']:
    #         await self.run_in_main_loop(self.start_game)
    #     elif action == 'select_game_type' and not game_state['game_started']:
    #         await self.handle_game_selection(data)
    #     elif action == 'join_tournament':
    #         await self.handle_join_tournament(data)
    #     elif action == 'disconnect':
    #         await self.disconnect(1001)
    #     elif action == 'pong':
    #         await self.handle_pong()
    #     elif action == 'stop_game':
    #         await self.run_in_main_loop(self.stop_current_game)
    #     else:
    #         if self.Debug_log:
    #             logger.error(f"Unsupported action: {action}")
    #         await self.send(text_data=json.dumps({
    #             'type': 'error',
    #             'message': f"Unsupported action: {action}"
    #         }))

#     async def broadcast_game_state(self, extra_info=None):
#         state = {
#             'type': 'update',
#             'ball': game_state['ball'],
#             'p1': game_state['player1'],
#             'p2': game_state['player2'],
#             's1': game_state['player1_score'],
#             's2': game_state['player2_score'],
#             'go': game_state['game_over'],
#             'gs': game_state['game_started'],
#         }
#         if extra_info:
#             state.update(extra_info)
#         for player in self.Players.values():
#             try:
#                 await player['object'].send(text_data=json.dumps(state))
#             except Exception as e:
#                 logger.error(f"Error sending game state: {e}")

#     async def handle_pong(self):
#         player = self.Players.get(self.channel_name)
#         if player:
#             username = player.get("username", "Unknown")
#             if self.Debug_log:
#                 logger.debug(f"Pong by client {username}")

#     # --------------------------- INPUT HANDLING ----------------------#

#     async def handle_player_input(self, data):
#         if game_state['game_started']:
#             if self.game_type == 'local_1v1':
#                 self.handle_local_input(data)
#             elif self.game_type == '1v1' or self.game_type == 'tournament':
#                 self.handle_1v1_input(data)
#             else:
#                 logger.warning(f"Unexpected game type: {self.game_type}")
#                 return
#             await self.broadcast_game_state()
#         else:
#             logger.warning("Game is not started, input ignored.")

#     def handle_local_input(self, data):
#         player1_speed = data.get('p1', 0)
#         player2_speed = data.get('p2', 0)
#         game_state['player1']["speed"] = player1_speed
#         game_state['player2']["speed"] = player2_speed

#     def handle_1v1_input(self, data):
#         player_num = data.get('player_num', 0)
#         speed = data.get('speed', 0)
#         if player_num == 1:
#             game_state['player1']["speed"] = speed
#             if self.Debug_log:
#                 logger.debug(f"Player 1 speed set to {speed}")
#         elif player_num == 2:
#             game_state['player2']["speed"] = speed
#             if self.Debug_log:
#                 logger.debug(f"Player 2 speed set to {speed}")
#         else:
#             logger.error(f"Invalid player number received: {player_num}")

#     async def assign_players(self):
#         players = list(self.Players.values())
#         if len(players) < 2:
#             if self.Debug_log:
#                 logger.debug("Not enough players to start the game")
#             return

#         for i, player in enumerate(players):
#             player['player_num'] = i + 1
#             assignment_message = json.dumps({
#                 'type': 'player_assignment',
#                 'player_num': player['player_num'],
#                 'message': f'You are Player {player["player_num"]}.'
#             })
#             await player['object'].send(text_data=assignment_message)
#             if self.Debug_log:
#                 logger.debug(f"Assigned Player {player['player_num']} to {player['object'].channel_name}")

#         await self.broadcast_game_state({'type': 'game_ready'})

#     async def handle_game_selection(self, data):
#         self.username = data.get('username', 'Player')
#         self.game_type = data.get('game_type')

#         if self.game_type == 'tournament':
#             if self.channel_name not in self.Players['tournament']:
#                 player_id = len(self.tournament_players) + 1
#                 self.Players['tournament'][self.channel_name] = {
#                     "object": self,
#                     "username": self.username,
#                     "player_num": player_id,
#                     "speed": 0
#                 }
#                 self.tournament_players.append(self.Players['tournament'][self.channel_name])
#             else:
#                 self.Players['tournament'][self.channel_name]['username'] = self.username
#         else:
#             self.Players[self.channel_name]['username'] = self.username

#         if self.Debug_log:
#             logger.debug(f"Game type selected: {self.game_type} by {self.username}")

#         message = {
#             'type': 'info',
#             'message': f'{self.username} has joined the game lobby as Player {len(self.Players)}.'
#         }
#         await self.send(text_data=json.dumps(message))

#         if not game_state['game_started']:
#             if self.game_type == 'local_1v1':
#                 game_state['player1'] = {"y": 180, "speed": 0}
#                 game_state['player2'] = {"y": 180, "speed": 0}
#                 self.Players[self.channel_name]['player_num'] = 1
#                 await self.broadcast_game_state({'type': 'game_ready'})
#             elif self.game_type == '1v1':
#                 if self.Debug_log:
#                     logger.debug(f"Number of players: {len(self.Players)}")
#                 if len(self.Players) >= 2:
#                     await self.assign_players()
#                 else:
#                     if self.Debug_log:
#                         logger.debug("Waiting for second player to join...")
#             elif self.game_type == 'tournament':
#                 await self.handle_join_tournament(data)
#             else:
#                 logger.warning(f"Unexpected game type: {self.game_type}")
#         else:
#             await self.send(text_data=json.dumps({
#                 'type': 'error',
#                 'message': 'A game is already in progress.'
#             }))
#             return

#     async def handle_join_tournament(self, data):
#         username = data.get('username', 'Player')
        
#         player_info = {
#             "object": self,
#             "username": username,
#             "speed": 0,
#             "channel_name": self.channel_name
#         }

#         player_id = self.tournament_manager.add_player(player_info)
        
#         if self.Debug_log:
#             logger.debug(f"{username} joined the tournament lobby as Player {player_id}.")

#         message = {
#             'type': 'info',
#             'message': f'{username} has joined the tournament lobby as Player {player_id}.'
#         }
#         await self.send(text_data=json.dumps(message))

#         for player in self.tournament_manager.players:
#             await player['object'].send(text_data=json.dumps({
#                 'type': 'info',
#                 'message': f'{self.tournament_manager.get_player_count()}/4 players have joined. Waiting for more players...'
#             }))

#         if self.tournament_manager.get_player_count() >= 4:
#             if self.Debug_log:
#                 logger.debug("Minimum players for tournament reached. Starting the tournament.")
#             await self.start_tournament()

#     async def start_tournament(self):
#         tournament = Tournament(self.tournament_players)
#         tournament.setup_tournament()
#         await tournament.start_tournament()
#         if self.Debug_log:
#             logger.debug("Tournament started.")

#     # ---------------------------- GAME LOGIC ------------------------#

#     async def game_loop(self):
#         self.last_update_time = asyncio.get_event_loop().time()
#         while game_state['game_started'] and not game_state['game_over']:
#             if game_state['game_over']:
#                 return
#             current_time = asyncio.get_event_loop().time()
#             dt = current_time - self.last_update_time
#             self.last_update_time = current_time

#             await self.update_game_state(dt)
#             await self.broadcast_game_state()
#             await asyncio.sleep(1 / self.refresh_rate)

#     async def start_game(self):
#         if game_state['game_started']:
#             await self.send(text_data=json.dumps({
#                 'type': 'error',
#                 'message': 'A game is already in progress.'
#             }))
#             return

#         await self.start_countdown()
#         self.init_game_state()
#         game_state['game_started'] = True
#         game_state['game_over'] = False
#         self.ball_restart()

#         if not game_state['game_loop_running']:
#             game_state['game_loop_running'] = True
#             asyncio.create_task(self.game_loop())

#     async def stop_current_game(self):
#         if not game_state['game_started']:
#             return
#         game_state['game_started'] = False
#         game_state['game_over'] = True
#         game_state['game_loop_running'] = False
#         await self.broadcast_game_state({'type': 'game_over'})

#     async def start_countdown(self):
#         for i in range(3, 0, -1):
#             if self.Debug_log:
#                 logger.debug(f"Countdown: {i}")
#             await self.broadcast_game_state({'type': 'countdown', 'value': i})
#             await asyncio.sleep(1)
#         return

#     async def check_game_over(self):
#         if game_state['player1_score'] == self.points or game_state['player2_score'] == self.points:
#             game_state['game_over'] = True
#             game_state['game_started'] = False
#             if self.Debug_log:
#                 logger.debug("Game over")
#         await self.broadcast_game_state({'type': 'game_over'})
#         await self.disconnect(1001)

#     def init_game_state(self):
#         game_state['ball'] = {"x": 320, "y": 180, "vx": 150 * random.choice((1, -1)), "vy": 150 * random.choice((1, -1))}
#         game_state['player1'] = {"y": 180, "speed": 0}
#         game_state['player2'] = {"y": 180, "speed": 0}
#         game_state['player1_score'] = 0
#         game_state['player2_score'] = 0
#         game_state['game_started'] = False
#         game_state['game_over'] = False

#     def ball_restart(self):
#         game_state['ball'] = {"x": 320, "y": 180, "vx": 150 * random.choice((1, -1)), "vy": 150 * random.choice((1, -1))}

#     async def update_game_state(self, dt):
#         if not game_state['game_started']:
#             logger.warning("Game update attempted while game is not started.")
#             return

#         # Update paddle positions
#         game_state['player1']["y"] += game_state['player1']["speed"] * dt * 100 * self.global_speed_factor
#         game_state['player2']["y"] += game_state['player2']["speed"] * dt * 100 * self.global_speed_factor
#         # if self.Debug_log:
#         #     logger.debug(f"P1 y: {game_state['player1']['y']} | P2 y: {game_state['player2']['y']}")

#         # Clamp paddle positions
#         game_state['player1']["y"] = max(0, min(game_state['player1']["y"], 360 - self.paddle_height))
#         game_state['player2']["y"] = max(0, min(game_state['player2']["y"], 360 - self.paddle_height))

#         # Update ball position
#         game_state['ball']["x"] += game_state['ball']["vx"] * dt * self.global_speed_factor
#         game_state['ball']["y"] += game_state['ball']["vy"] * dt * self.global_speed_factor

#         # Ball collision with top and bottom
#         if game_state['ball']["y"] <= 0 or game_state['ball']["y"] >= 360:
#             game_state['ball']["vy"] *= -1

#         # Handle paddle collision
#         self.handle_paddle_collision()

#         # Score points
#         if game_state['ball']["x"] <= 0:
#             game_state['player2_score'] += 1
#             self.ball_restart()
#         elif game_state['ball']["x"] >= 640:
#             game_state['player1_score'] += 1
#             self.ball_restart()

#         # Check for game over
#         if game_state['player1_score'] == self.points or game_state['player2_score'] == self.points:
#             game_state['game_over'] = True
#             game_state['game_started'] = False
#             asyncio.create_task(self.broadcast_game_state({'type': 'game_over'}))

#     def handle_paddle_collision(self):
#         if game_state['ball']["x"] <= 15:
#             if game_state['player1']["y"] <= game_state['ball']["y"] <= game_state['player1']["y"] + self.paddle_height:
#                 relative_intercept = (game_state['player1']["y"] + self.center_paddle_offset) - game_state['ball']["y"]
#                 normalized_relative_intercept = relative_intercept / self.center_paddle_offset
#                 bounce_angle = normalized_relative_intercept * self.max_angle
#                 game_state['ball']["vx"] = abs(game_state['ball']["vx"]) * cos(radians(bounce_angle)) * self.speed_buff
#                 game_state['ball']["vy"] = abs(game_state['ball']["vx"]) * sin(radians(bounce_angle)) * (-1 if normalized_relative_intercept < 0 else 1) * self.speed_buff
#                 game_state['ball']["x"] = 15

#         elif game_state['ball']["x"] >= 625:
#             if game_state['player2']["y"] <= game_state['ball']["y"] <= game_state['player2']["y"] + self.paddle_height:
#                 relative_intercept = (game_state['player2']["y"] + self.center_paddle_offset) - game_state['ball']["y"]
#                 normalized_relative_intercept = relative_intercept / self.center_paddle_offset
#                 bounce_angle = normalized_relative_intercept * self.max_angle
#                 game_state['ball']["vx"] = -abs(game_state['ball']["vx"]) * cos(radians(bounce_angle)) * self.speed_buff
#                 game_state['ball']["vy"] = abs(game_state['ball']["vx"]) * sin(radians(bounce_angle)) * (-1 if normalized_relative_intercept < 0 else 1) * self.speed_buff
#                 game_state['ball']["x"] = 625

#     async def run_in_main_loop(self, coro):
#         future = asyncio.run_coroutine_threadsafe(coro(), asyncio.get_event_loop())
#         return await asyncio.wrap_future(future)

# class Tournament:
#     def __init__(self, players):
#         self.players = players
#         self.tournament_size = None
#         self.matches = []
#         self.current_match = None

#     def setup_tournament(self):
#         # Détermine la taille du tournoi basée sur le nombre de joueurs
#         if len(self.players) <= 4:
#             self.tournament_size = 4
#         else:
#             self.tournament_size = 8

#         # S'assurer qu'il y a suffisamment de joueurs
#         while len(self.players) < self.tournament_size:
#             self.players.append(None)  # Ajouter des "bye" pour les places vides

#         # Mélanger les joueurs
#         random.shuffle(self.players)

#         # Créer les paires de joueurs pour le premier tour
#         for i in range(0, self.tournament_size, 2):
#             self.matches.append((self.players[i], self.players[i + 1]))

#     async def start_tournament(self):
#         # Lance les matches un par un
#         for match in self.matches:
#             await self.play_match(match[0], match[1])

#     async def play_match(self, player1, player2):
#         # Initialisation du match entre player1 et player2
#         logger.debug(f"Starting match between {player1['username']} and {player2['username']}")
#         self.current_match = (player1, player2)

#         # Créer une nouvelle instance de PongConsumer pour ce match
#         match_game = PongConsumer()
#         await match_game.connect()  # Assurez-vous que la méthode connect peut être appelée sans arguments ou ajustez selon votre implémentation

#         # Assigner les joueurs et initialiser le jeu
#         match_game.Players[player1['channel_name']] = player1
#         match_game.Players[player2['channel_name']] = player2

#         # Assigner des numéros de joueur
#         player1['player_num'] = 1
#         player2['player_num'] = 2

#         # Envoyer les informations de début de jeu
#         await match_game.broadcast_game_state({'type': 'game_ready'})

#         # Démarrer le jeu
#         await match_game.start_game()

#         # Attendre la fin du jeu
#         while not match_game.game_state['game_over']:
#             await asyncio.sleep(1)  # Attendre que le jeu se termine

#         # Déterminer le vainqueur
#         if match_game.game_state['player1_score'] > match_game.game_state['player2_score']:
#             winner = player1
#         else:
#             winner = player2

#         logger.debug(f"Winner is {winner['username']}")
#         return winner

#     def update_bracket(self, winner):
#         # Met à jour les brackets pour le prochain tour
#         logger.debug(f"Updating bracket, winner: {winner}")


import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from supervisor.pongengine.LobbyManager import LobbyManager

logger = logging.getLogger(__name__)

class GameConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.lobby_manager = LobbyManager()

    async def connect(self):
        await self.lobby_manager.connect(self)

    async def disconnect(self, close_code):
        await self.lobby_manager.disconnect(self)

    async def receive(self, text_data):
        await self.lobby_manager.receive(self, text_data)

