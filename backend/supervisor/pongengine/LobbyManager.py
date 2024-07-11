import json
import logging
import asyncio
from channels.db import database_sync_to_async
from db.models import User
from supervisor.pongengine.Room import Room
from supervisor.pongengine.TournamentManager import Tournament


logger = logging.getLogger(__name__)

class Player:
    def __init__(self, websocket, user):
        self.websocket = websocket
        self.user = user
        self.player_num = None
        self.game_type = None
        self.speed = 0
        self.result = None
        self.tournament_id = None
        self.room_id = None
        self.is_ready = False
        self.on_game_end = None
        self.is_last_round = False
        self.in_game = False

    async def send_message(self, message):
        if isinstance(message, dict):
            message = json.dumps(message)
        await self.websocket.send(text_data=message)

    async def send_command(self, command, message):
        await self.websocket.send(text_data=json.dumps({
            "type": command,
            "message": message
        }))

    def get_username(self):
        return self.user.username
    
    def set_game_type(self, game_type):
        self.game_type = game_type
    
    def get_game_type(self):
        return self.game_type

    async def close(self):
        try:
            await self.websocket.close()
        except Exception as e:
            logger.error(f"Error closing websocket for player {self.get_username()}: {str(e)}")

class LobbyManager:
    def __init__(self):
        self.players = {}
        self.room_lock = asyncio.Lock()

    async def connect(self, websocket, data):
        user_data = data.get('user')
        logger.debug("Connection attempt...")
        if not user_data:
            logger.error("No user data provided")
            await websocket.send(text_data=json.dumps({
                'type': 'error',
                'message': 'User not found'
            }))
            return
        try:
            user = await database_sync_to_async(User.objects.get)(username=user_data['username'])
        except User.DoesNotExist:
            logger.error(f"User {user_data['username']} does not exist")
            await websocket.send(text_data=json.dumps({
                'type': 'error',
                'message': f'User {user_data["username"]} does not exist'
            }))
            return
        player = Player(websocket, user)
        self.players[websocket.channel_name] = player
        logger.debug(f"Player connected: {player.get_username()}, with websocket: {websocket.channel_name}")

        await websocket.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': f'Connected as {user.username}'
        }))

    async def receive(self, websocket, text_data):
        data = json.loads(text_data)
        action = data.get('action')
        type = data.get('type')

        if action == 'Connect':
            await self.connect(websocket, data)
        elif action == 'PlayerInput':
            await self.handle_player_input(websocket, data)
        elif action == 'StartGame':
            await self.start_game(websocket, type)
        elif action == 'Disconnect':
            await self.handle_disconnect(websocket.channel_name)
        elif action == 'player_ready':
            await self.handle_player_ready(websocket, data)
        else:
            logger.error(f"Unsupported action: {action}")
            await websocket.send(text_data=json.dumps({
                'type': 'error',
                'message': f"Unsupported action: {action}"
            }))

    async def handle_player_input(self, websocket, data):
        room = Room.find_room_for_player(websocket.channel_name)
        if room:
            if room.game:
                await room.game.handle_player_input(data)
            else:
                logger.warning(f"Game not found in room {room.id} for player input")
        else:
            logger.warning(f"No room found for player {websocket.channel_name}")

    async def start_game(self, websocket, type):
        player = self.players[websocket.channel_name]
        
        logger.debug(f"check if player is in game: {player.get_username()}.")
        if player.in_game or self.is_player_in_active_game(player):
            await player.send_message({
                'type': 'end_game',
                'message': 'You are already in a game. Please finish or leave your current game before starting a new one.'
            })
            return
        player.game_type = type
        if player.game_type in ['1v1', 'local_1v1', 'solo']:
            logger.debug(f"Starting game for player: {player.get_username()}, mode: {player.game_type}")
            room = await Room.join_or_create_room(player)
        elif player.game_type == 'tournament-4' or player.game_type == 'tournament-8':
            if player.game_type == 'tournament-4':
                logger.debug(f"Starting tournament for player: {player.get_username()}, mode: {player.game_type}")
                tournament = await Tournament.join_or_create_tournament(player, 4)
            else:
                logger.debug(f"Starting tournament for player: {player.get_username()}, mode: {player.game_type}")
                tournament = await Tournament.join_or_create_tournament(player, 8)
            if tournament:
                await player.send_message({
                    'type': 'message',
                    'tournament_id': tournament.id,
                    'message': 'You have joined a tournament. Waiting for other players.',
                })
        else:
            logger.error(f"Unsupported game type: {player.game_type}")
            await player.send_message({
                'type': 'error',
                'message': f"Unsupported game type: {player.game_type}"
            })

    async def handle_player_ready(self, websocket, data):
            player = self.players[websocket.channel_name]
            player.is_ready = data.get('is_ready')
            logger.debug(f"Player {player.user.username} is ready: {player.is_ready}")

            tournament = Tournament.find_tournament_for_player(websocket.channel_name)
            if tournament:
                await tournament.player_ready(player)
            else:
                logger.warning(f"Tournament not found for player {player.user.username}")

    async def disconnect(self, websocket):
            channel_name = websocket.channel_name
            if channel_name in self.players:
                player = self.players[channel_name]
                logger.debug(f"Player disconnected: {player.get_username()}")
                await self.handle_disconnect(channel_name)
            else:
                logger.warning(f"Disconnect received for unknown channel: {channel_name}")

    async def handle_disconnect(self, channel_name):
        if channel_name in self.players:
            player = self.players[channel_name]
            room = Room.find_room_for_player(channel_name)
            tournament = Tournament.find_tournament_for_player(channel_name)

            if tournament:
                try:
                    await tournament.remove_player(player)
                except Exception as e:
                    logger.error(f"Error removing player {player.get_username()} from tournament: {str(e)}")

            if room:
                try:
                    await room.remove_player(player)
                except Exception as e:
                    logger.error(f"Error closing room for player {player.get_username()}: {str(e)}")

            del self.players[channel_name]
            logger.debug(f"Disconnect handled for player: {player.get_username()}")
        else:
            logger.warning(f"Attempted to handle disconnect for unknown channel: {channel_name}")

    def is_player_in_active_game(self, player):
        # Check rooms
        for room in Room.rooms.values():
            if player.get_username() in [p.get_username() for p in room.players]:
                logger.debug(f"Player {player.get_username()} is in room {room.id}")
                room.remove_player(player)
                room.delete_room()
                return True
        
        # Check tournaments
        for tournament in Tournament.tournaments.values():
            if player.get_username() in [p.get_username() for p in tournament.players]:
                logger.debug(f"Player {player.get_username()} is in tournament {tournament.id}")
                tournament.remove_player(player)
                return True
        
        return False


# Different Input : 

# To Connect : 
#     - 'type': game_type
#     - 'action': 'Connect'
#     - 'user': {
#         'username': username
#     }

# To Start Game :
#     - 'action': 'StartGame'

# To Send Player Input :
#     - 'action': 'PlayerInput'

# To Disconnect :
#     - 'action': 'Disconnect'

# To Send Player Ready :
#     - 'action': 'player_ready'
