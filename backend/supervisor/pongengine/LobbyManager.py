import json
import asyncio
import logging
from supervisor.pongengine.TournamentManager import TournamentManager
from supervisor.pongengine.PongConsumer import PongConsumer

logger = logging.getLogger(__name__)

class LobbyManager:
    def __init__(self):
        self.Players = {}
        self.tournament_manager = TournamentManager()
        self.games = {}

    async def connect(self, websocket):
        await websocket.accept()
        self.Players[websocket.channel_name] = {
            "object": websocket,
            "username": None,
            "player_num": None,
            "game_type": None,
            "speed": 0
        }
        logger.debug(f"Player connected: {websocket.channel_name}")

    async def disconnect(self, websocket):
        logger.debug(f"Player disconnected: {websocket.channel_name}")
        if websocket.channel_name in self.Players:
            del self.Players[websocket.channel_name]

    async def receive(self, websocket, text_data):
        data = json.loads(text_data)
        logger.debug(f"Data received: {data}")
        action = data.get('t')

        if action == 'select_game_type':
            await self.handle_game_selection(websocket, data)
        elif action == 'join_tournament':
            await self.handle_join_tournament(websocket, data)
        elif action == 'pi':  # Gestion des entrées joueurs
            await self.handle_player_input(websocket, data)
        elif action == 'sg':
            await self.start_game('local_1v1')
        else:
            logger.error(f"Unsupported action: {action}")
            await websocket.send(text_data=json.dumps({
                'type': 'error',
                'message': f"Unsupported action: {action}"
            }))

    async def handle_game_selection(self, websocket, data):
        username = data.get('username', 'Player')
        game_type = data.get('game_type')
        self.Players[websocket.channel_name]['username'] = username
        self.Players[websocket.channel_name]['game_type'] = game_type

        if game_type == 'tournament':
            await self.handle_join_tournament(websocket, data)
        elif game_type in ['1v1', 'local_1v1']:
            await self.assign_players(game_type)
        else:
            logger.error(f"Unsupported game type: {game_type}")
            await websocket.send(text_data=json.dumps({
                'type': 'error',
                'message': f"Unsupported game type: {game_type}"
            }))

    async def handle_join_tournament(self, websocket, data):
        username = data.get('username', 'Player')
        player_info = {
            "object": websocket,
            "username": username,
            "speed": 0,
            "channel_name": websocket.channel_name
        }

        player_id = self.tournament_manager.add_player(player_info)
        logger.debug(f"{username} joined the tournament lobby as Player {player_id}.")

        for player in self.tournament_manager.players:
            await player['object'].send(text_data=json.dumps({
                'type': 'info',
                'message': f'{self.tournament_manager.get_player_count()}/4 players have joined. Waiting for more players...'
            }))

        if self.tournament_manager.get_player_count() >= 4:
            logger.debug("Minimum players for tournament reached. Starting the tournament.")
            await self.start_tournament()

    async def start_tournament(self):
        tournament = self.tournament_manager.create_tournament()
        await tournament.start_tournament()

    async def assign_players(self, game_type):
        players = [p for p in self.Players.values() if p['game_type'] == game_type]
        if game_type == 'local_1v1':
            if len(players) < 1:
                logger.debug("Not enough players to start the local 1v1 game")
                return
            for player in players:
                player['player_num'] = 1  # In local 1v1, the player number is always 1
                assignment_message = json.dumps({
                    'type': 'player_assignment',
                    'player_num': player['player_num'],
                    'message': f'You are Player {player["player_num"]} for local 1v1.'
                })
                await player['object'].send(text_data=assignment_message)
                logger.debug(f"Assigned Player {player['player_num']} to {player['object'].channel_name}")
            await self.start_game(game_type)
        else:  # game_type == '1v1'
            if len(players) < 2:
                logger.debug("Not enough players to start the 1v1 game")
                return
            for i, player in enumerate(players):
                player['player_num'] = i + 1
                assignment_message = json.dumps({
                    'type': 'player_assignment',
                    'player_num': player['player_num'],
                    'message': f'You are Player {player["player_num"]} for 1v1.'
                })
                await player['object'].send(text_data=assignment_message)
                logger.debug(f"Assigned Player {player['player_num']} to {player['object'].channel_name}")
            await self.start_game(game_type)

    async def start_game(self, game_type):
        if game_type not in self.games or not self.games[game_type].is_game_running():
            game = PongConsumer(self.Players, game_type)
            self.games[game_type] = game
            await game.start_game()
        else:
            logger.debug(f"Game of type {game_type} is already running.")

    async def handle_player_input(self, websocket, data):
        game_type = self.Players[websocket.channel_name]['game_type']
        if game_type and game_type in self.games:
            game = self.games[game_type]
            await game.handle_player_input(data)
        else:
            logger.warning("No game instance available to handle input.")
