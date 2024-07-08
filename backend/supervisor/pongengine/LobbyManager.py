import json
import logging
import asyncio
from channels.db import database_sync_to_async
from db.models import User
from supervisor.pongengine.Room import Room
from supervisor.pongengine.TournamentManager import Tournament


logger = logging.getLogger(__name__)

class Player:
    def __init__(self, websocket, user: User):
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

    async def handle_disconnect(self, channel_name):
        if channel_name in self.players:
            player = self.players[channel_name]
            room = Room.find_room_for_player(channel_name)
            if room:
                await room.remove_player(player)
            
            tournament = Tournament.find_tournament_for_player(channel_name)
            if tournament:
                await tournament.remove_player(player)
            
            del self.players[channel_name]
            logger.debug(f"Disconnect handled for player: {player.get_username()}")
            Room.log_room_state()

    async def receive(self, websocket, text_data):
        data = json.loads(text_data)
        logger.debug(f"Data received: {data}")
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
            await room.handle_player_input(websocket.channel_name, data)
        else:
            logger.warning(f"No room found for player {websocket.channel_name}")

    async def start_game(self, websocket, type):
        player = self.players[websocket.channel_name]
        player.game_type = type
        if player.game_type in ['1v1', 'local_1v1', 'solo']:
            logger.debug(f"Starting game for player: {player.get_username()}, mode: {player.game_type}")
            room = await Room.join_or_create_room(player)
        elif player.game_type == 'tournament':
            tournament = await Tournament.join_or_create_tournament(player)
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

    async def disconnect(self, websocket):
        logger.debug(f"Player disconnected: {self.players[websocket.channel_name].get_username()}")
        await self.handle_disconnect(websocket.channel_name)



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
