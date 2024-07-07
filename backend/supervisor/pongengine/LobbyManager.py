import json
import logging
import asyncio
from supervisor.pongengine.Room import Room
from supervisor.pongengine.TournamentManager import Tournament

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
            tournament = Tournament.find_tournament_for_player(websocket.channel_name)
            if tournament:
                await tournament.remove_player(player)
            del self.players[websocket.channel_name]
        logger.debug("Disconnect handled")
        Room.log_room_state()

    async def handle_game_selection(self, websocket, data):
        username = data.get('username', 'Player')
        game_type = data.get('game_type')
        player = self.players[websocket.channel_name]
        player['username'] = username
        player['game_type'] = game_type

        if game_type in ['1v1', 'local_1v1', 'solo']:
            room = await Room.join_or_create_room(player, game_type)
            await websocket.send(text_data=json.dumps({
                'type': 'room_joined',
                'room_id': room.id,
                'message': f'{game_type} room joined. Ready to start game.'
            }))
        elif game_type == 'tournament':
            player_count = data.get('player_count', 4)  # Default to 4-player tournament
            tournament = await Tournament.join_or_create_tournament(player, player_count)
            await websocket.send(text_data=json.dumps({
                'type': 'tournament_joined',
                'tournament_id': tournament.id,
                'message': f'You have joined a {player_count}-player tournament. Waiting for other players.',
                'tournament_details': tournament.get_tournament_details()
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
        else:
            logger.warning(f"No room found for player {websocket.channel_name}")

    async def receive(self, websocket, text_data):
        data = json.loads(text_data)
        logger.debug(f"Data received: {data}")
        action = data.get('t')

        if action == 'select_game_type':
            await self.handle_game_selection(websocket, data)
        elif action == 'pi':  # player input
            await self.handle_player_input(websocket, data)
        elif action == 'sg':  # start game
            await self.handle_start_game(websocket)
        elif action == 'disconnect':
            await self.disconnect(websocket)
        elif action == 'player_ready':
            await self.handle_player_ready(websocket, data)
        else:
            logger.error(f"Unsupported action: {action}")
            await websocket.send(text_data=json.dumps({
                'type': 'error',
                'message': f"Unsupported action: {action}"
            }))

    async def handle_start_game(self, websocket):
        room = Room.find_room_for_player(websocket.channel_name)
        if room:
            await room.start_game()
        else:
            logger.warning(f"No room found for player {websocket.channel_name} to start game")

    async def handle_player_ready(self, websocket, data):
        tournament_id = data.get('tournament_id')
        tournament = Tournament.tournaments.get(tournament_id)
        if tournament:
            await tournament.player_ready(self.players[websocket.channel_name])
        else:
            logger.error(f"Tournament not found: {tournament_id}")
