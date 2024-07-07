import json
import logging
import asyncio
from supervisor.pongengine.Room import Room

logger = logging.getLogger(__name__)

class LobbyManager:
    def __init__(self):
        self.players = {}
        self.room_lock = asyncio.Lock()

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
            room = Room.find_room_for_player(websocket.channel_name)
            if room:
                await room.remove_player(player)
            del self.players[websocket.channel_name]
        logger.debug("Disconnect handled, game ended if it was running")
        Room.log_room_state()  # Log the current state of rooms after disconnect

    async def handle_game_selection(self, websocket, data):
        username = data.get('username', 'Player')
        game_type = data.get('game_type')
        player = self.players[websocket.channel_name]
        player['username'] = username
        player['game_type'] = game_type

        if game_type in ['1v1', 'local_1v1']:
            await websocket.send(text_data=json.dumps({
                'type': 'game_type_selected',
                'message': f'Game type {game_type} selected. Ready to join.'
            }))
        else:
            logger.error(f"Unsupported game type: {game_type}")
            await websocket.send(text_data=json.dumps({
                'type': 'error',
                'message': f"Unsupported game type: {game_type}"
            }))

    async def handle_player_input(self, websocket, data):
        room = Room.find_room_for_player(websocket.channel_name)
        if room:
            await room.handle_player_input(websocket.channel_name, data)
            logger.debug(f"Handled input for player in room {room.id}")
        else:
            logger.warning(f"No room found for player {websocket.channel_name}")

    async def receive(self, websocket, text_data):
        data = json.loads(text_data)
        logger.debug(f"Data received: {data}")
        action = data.get('t')

        if action == 'select_game_type':
            await self.handle_game_selection(websocket, data)
        elif action == 'pi':
            await self.handle_player_input(websocket, data)
        elif action == 'join':
            await self.handle_join(websocket, data)
        elif action == 'stop_game':
            await self.handle_stop_game(websocket)
        elif action == 'disconnect':
            await self.disconnect(websocket)
        else:
            logger.error(f"Unsupported action: {action}")
            await websocket.send(text_data=json.dumps({
                'type': 'error',
                'message': f"Unsupported action: {action}"
            }))

    async def handle_stop_game(self, websocket):
        room = Room.find_room_for_player(websocket.channel_name)
        if room:
            await room.end_game()
        logger.debug(f"Game stopped for player: {websocket.channel_name}")

    async def handle_join(self, websocket, data):
        player = self.players[websocket.channel_name]
        game_type = player['game_type']
        
        if game_type not in ['1v1', 'local_1v1']:
            logger.error(f"Invalid game type for join: {game_type}")
            await websocket.send(text_data=json.dumps({
                'type': 'error',
                'message': f"Cannot join game of type: {game_type}"
            }))
            return

        logger.debug(f"Player {player['username']} joining {game_type} game")
        room = await Room.join_or_create_room(player, game_type)
        logger.debug(f"Player {player['username']} joined room {room.id}")

        await websocket.send(text_data=json.dumps({
            'type': 'room_joined',
            'room_id': room.id
        }))

        Room.log_room_state()