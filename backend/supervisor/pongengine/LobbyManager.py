import json
import asyncio
import logging
from supervisor.pongengine.TournamentManager import TournamentManager
from supervisor.pongengine.PongConsumer import PongConsumer

logger = logging.getLogger(__name__)

class Room:
    def __init__(self, game_type):
        self.game_type = game_type
        self.players = []
        self.game = None

    def add_player(self, player):
        self.players.append(player)

    def is_full(self):
        return len(self.players) == 2 if self.game_type == '1v1' else len(self.players) == 1

    async def start_game(self):
        self.game = PongConsumer(self.players, self.game_type)
        await self.game.start_game()

class LobbyManager:
    def __init__(self):
        self.players = {}
        self.rooms = {}
        self.tournament_manager = TournamentManager()

    async def connect(self, websocket):
        await websocket.accept()
        self.players[websocket.channel_name] = {
            "object": websocket,
            "username": None,
            "player_num": None,
            "game_type": None,
            "speed": 0
        }
        logger.debug(f"Player connected: {websocket.channel_name}")

    async def disconnect(self, websocket):
        logger.debug(f"Player disconnecting: {websocket.channel_name}")
        if websocket.channel_name in self.players:
            player = self.players[websocket.channel_name]
            game_type = player['game_type']
            room = self.find_room_for_player(websocket.channel_name)
            if room:
                room.players.remove(player)
                if room.game:
                    await room.game.end_game()
                if not room.players:
                    del self.rooms[game_type]
                else:
                    await self.notify_player_disconnection(room)
            del self.players[websocket.channel_name]
        logger.debug("Disconnect handled, game ended if it was running")

    def find_room_for_player(self, channel_name):
        for room in self.rooms.values():
            if any(p['object'].channel_name == channel_name for p in room.players):
                return room
        return None

    async def handle_game_selection(self, websocket, data):
        username = data.get('username', 'Player')
        game_type = data.get('game_type')
        player = self.players[websocket.channel_name]
        player['username'] = username
        player['game_type'] = game_type

        if game_type == 'tournament':
            await self.handle_join_tournament(websocket, data)
        elif game_type in ['1v1', 'local_1v1']:
            await self.join_or_create_room(player, game_type)
        else:
            logger.error(f"Unsupported game type: {game_type}")
            await websocket.send(text_data=json.dumps({
                'type': 'error',
                'message': f"Unsupported game type: {game_type}"
            }))

    async def join_or_create_room(self, player, game_type):
        if game_type not in self.rooms or self.rooms[game_type].is_full():
            self.rooms[game_type] = Room(game_type)
        
        room = self.rooms[game_type]
        room.add_player(player)
        player['player_num'] = len(room.players)

        await self.send_player_assignment(player)

        if room.is_full():
            await room.start_game()
        else:
            await self.broadcast_waiting_message(room)

    async def send_player_assignment(self, player):
        assignment_message = json.dumps({
            'type': 'player_assignment',
            'player_num': player['player_num'],
            'message': f'You are Player {player["player_num"]} for {player["game_type"]}.'
        })
        await player['object'].send(text_data=assignment_message)

    async def broadcast_waiting_message(self, room):
        waiting_message = json.dumps({
            'type': 'waiting_for_opponent',
            'message': 'Waiting for an opponent to join...'
        })
        for player in room.players:
            await player['object'].send(text_data=waiting_message)

    async def handle_player_input(self, websocket, data):
        room = self.find_room_for_player(websocket.channel_name)
        if room and room.game:
            await room.game.handle_player_input(data)
        else:
            logger.warning("No game instance available to handle input.")

    async def notify_player_disconnection(self, game_type):
        disconnect_message = json.dumps({
            'type': 'player_disconnected',
            'message': 'A player has disconnected. The game will end.'
        })
        for player in self.Players.values():
            if player['game_type'] == game_type:
                await player['object'].send(text_data=disconnect_message)
    
    async def receive(self, websocket, text_data):
        data = json.loads(text_data)
        logger.debug(f"Data received: {data}")
        action = data.get('t')

        if action == 'select_game_type':
            await self.handle_game_selection(websocket, data)
        elif action == 'join_tournament':
            await self.handle_join_tournament(websocket, data)
        elif action == 'pi':
            await self.handle_player_input(websocket, data)
        elif action == 'join':
            await self.handle_join(websocket, data)
        elif action == 'stop_game':
            await self.handle_stop_game(websocket)
        elif action == 'disconnect':
            await self.handle_disconnect(websocket)
        elif action == 'sg':
            logger.debug("Ignoring 'sg' message as game is started automatically after player assignment")
        else:
            logger.error(f"Unsupported action: {action}")
            await websocket.send(text_data=json.dumps({
                'type': 'error',
                'message': f"Unsupported action: {action}"
            }))

    async def handle_stop_game(self, websocket):
        game_type = self.Players[websocket.channel_name]['game_type']
        if game_type in self.games:
            await self.games[game_type].end_game()
            del self.games[game_type]
        logger.debug(f"Game stopped for player: {websocket.channel_name}")

    async def handle_disconnect(self, websocket):
        await self.disconnect(websocket)
        logger.debug(f"Player disconnected: {websocket.channel_name}")

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
                logger.debug("Waiting for second player to join the 1v1 game")
                for player in players:
                    player['player_num'] = 1  # Assign player number 1 to the first player
                    assignment_message = json.dumps({
                        'type': 'player_assignment',
                        'player_num': player['player_num'],
                        'message': f'You are Player {player["player_num"]} for 1v1. Waiting for opponent...'
                    })
                    await player['object'].send(text_data=assignment_message)
                    logger.debug(f"Assigned Player {player['player_num']} to {player['object'].channel_name}")
                await self.broadcast_waiting_message(game_type)
            else:
                # ... (existing code for when two players have joined)
                await self.start_game(game_type)

    async def start_game(self, game_type):
        if game_type in self.games:
            await self.games[game_type].end_game()  # Add this method to PongConsumer
        game = PongConsumer(self.Players, game_type)
        self.games[game_type] = game
        await game.start_game()

    async def handle_player_input(self, websocket, data):
        game_type = self.Players[websocket.channel_name]['game_type']
        if game_type and game_type in self.games:
            game = self.games[game_type]
            await game.handle_player_input(data)
        else:
            logger.warning("No game instance available to handle input.")

    async def handle_join(self, websocket, data):
        player_id = data.get('player_id')
        game_type = self.Players[websocket.channel_name]['game_type']
        if game_type == '1v1':
            await self.assign_players(game_type)
        else:
            logger.error(f"Received join request for unsupported game type: {game_type}")
            await websocket.send(text_data=json.dumps({
                'type': 'error',
                'message': f"Cannot join game of type: {game_type}"
            }))

    async def broadcast_waiting_message(self, game_type):
        waiting_message = json.dumps({
            'type': 'waiting_for_opponent',
            'message': 'Waiting for an opponent to join...'
        })
        for player in self.Players.values():
            if player['game_type'] == game_type:
                await player['object'].send(text_data=waiting_message)
