import json
import logging
from supervisor.pongengine.Room import Room
from supervisor.pongengine.TournamentManager import TournamentManager
import asyncio

logger = logging.getLogger(__name__)

class LobbyManager:
    def __init__(self):
        self.players = {}
        self.rooms = {}
        self.tournament_manager = TournamentManager()
        self.room_lock = asyncio.Lock()  # Add this line

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
                await room.remove_player(player)
                if not room.players:
                    del self.rooms[game_type]
            del self.players[websocket.channel_name]
        logger.debug("Disconnect handled, game ended if it was running")

    def find_room_for_player(self, channel_name):
        for room in self.rooms.values():
            if room.has_player(channel_name):
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

    async def join_or_create_room(self, player, game_type):
        async with self.room_lock:  # Add this line
            available_room = None
            for room in self.rooms.values():
                if room.game_type == game_type and not room.is_full():
                    available_room = room
                    break

            if not available_room:
                new_room = Room(game_type)
                self.rooms[new_room.id] = new_room
                available_room = new_room
                logger.debug(f"Created new room: {available_room}")
            else:
                logger.debug(f"Joining existing room: {available_room}")

            await available_room.add_player(player)
            logger.debug(f"Player {player['username']} joined room {available_room.id}")

            if available_room.is_full():
                logger.debug(f"Room {available_room.id} is full. Starting game.")
                await available_room.start_game()
            else:
                logger.debug(f"Waiting for more players in room {available_room.id}")

            self.log_room_state()
            return available_room.id

    async def handle_player_input(self, websocket, data):
        room = self.find_room_by_player(websocket.channel_name)
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
        elif action == 'join_tournament':
            await self.handle_join_tournament(websocket, data)
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
        room = self.find_room_for_player(websocket.channel_name)
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
        room_id = await self.join_or_create_room(player, game_type)
        logger.debug(f"Player {player['username']} joined room {room_id}")

        await websocket.send(text_data=json.dumps({
            'type': 'room_joined',
            'room_id': room_id
        }))

        # Add this: log the current state of all rooms
        self.log_room_state()

    def log_room_state(self):
        logger.debug("Current room state:")
        for room_id, room in self.rooms.items():
            logger.debug(f"  Room ID: {room_id}, Type: {room.game_type}, Players: {room.player_count()}/{2 if room.game_type == '1v1' else 1}, Full: {room.is_full()}")

    def find_room_by_player(self, channel_name):
        for room in self.rooms.values():
            if room.has_player(channel_name):
                return room
        return None