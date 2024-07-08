import json
import uuid
import asyncio
import random
import logging
from supervisor.pongengine.PongConsumer import PongConsumer

logger = logging.getLogger(__name__)

class Room:
    rooms = {}

    def __init__(self, game_type):
        self.id = "R" + str(random.randint(1000, 9999))
        self.game_type = game_type
        self.players = []
        self.game = None
        self.tournament_callback = None
        Room.rooms[self.id] = self
        self.match_finished = False
        logger.debug(f"Room created: ID {self.id}, type {game_type}")

    @classmethod
    async def create_room(cls, player):
        room = cls(player.game_type)
        await room.add_player(player)
        return room

    @classmethod
    async def join_or_create_room(cls, player):
        if player.game_type in ['local_1v1', 'solo']:
            return await cls.create_and_start_single_player_room(player)
        elif player.game_type == '1v1':
            return await cls.join_or_create_1v1_room(player)
        elif player.game_type == 'tournament':
            return await cls.create_tournament_room(player)
        else:
            logger.error(f"Unsupported game type: {player.game_type}")
            return None

    @classmethod
    async def create_and_start_single_player_room(cls, player):
        logger.debug(f"Creating single player room for {player.get_username()}")
        room = await cls.create_room(player)
        await room.start_game()
        return room

    @classmethod
    async def join_or_create_1v1_room(cls, player):
        available_room = next((room for room in cls.rooms.values() 
                               if room.game_type == '1v1' and not room.is_full()), None)
        if available_room:
            await available_room.add_player(player)
            if available_room.is_full():
                await available_room.start_game()
        else:
            available_room = await cls.create_room(player)
        return available_room

    @classmethod
    async def create_tournament_room(cls, player):
        room = await cls.create_room(player, 'tournament')
        return room

    async def add_player(self, player):
        player.player_num = len(self.players) + 1
        self.players.append(player)
        logger.debug(f"Player {player.get_username()} added to room: {self.id}. Player number: {player.player_num}")

        await player.send_message({
            'type': 'player_assignment',
            'player_num': player.player_num,
            'message': f'You are Player {player.player_num}'
        })

        await player.send_message({
            'type': 'display',
            'message': 'Waiting for opponent to join...'
        })


    def delete_room(self):
        if self.id in Room.rooms:
            del Room.rooms[self.id]
            logger.debug(f"Room {self.id} deleted")

    def is_full(self):
        return len(self.players) == self.get_max_players()

    def get_max_players(self):
        return 2 if self.game_type in ['1v1', 'tournament'] else 1

    @classmethod
    def find_room_for_player(cls, channel_name):
        return next((room for room in cls.rooms.values() 
                     if room.has_player(channel_name)), None)
    
    def has_player(self, channel_name):
        return any(p.websocket.channel_name == channel_name for p in self.players)

    async def start_game(self):
        if self.game:
            logger.warning(f"Game already in progress in room {self.id}")
            return

        if self.is_full():
            self.game = PongConsumer(
                self.players,
                self.game_type,
                self.id,
                self.game_ended,
                self.tournament_callback if self.game_type == 'tournament' else None
            )
            await self.game.start_game()
            logger.debug(f"{self.game_type} game started in room {self.id}")
        else:
            logger.warning(f"Cannot start game in room {self.id}: not enough players")

    async def handle_player_input(self, channel_name, data):
        if self.game:
            logger.debug(f"Handling player input from {channel_name} in room {self.id}")
            await self.game.handle_player_input(data)
        else:
            logger.warning(f"Game not started in room {self.id}, input ignored.")

    async def notify_player_disconnection(self):
        disconnect_message = json.dumps({
            'type': 'player_disconnected',
            'message': 'A player has disconnected. The game will end.'
        })
        for player in self.players:
            logger.debug(f"Sending player disconnection message to {player.get_username()}")
            await player.send_message(disconnect_message)

    @classmethod
    def log_room_state(cls):
        logger.debug("Current room state:")
        for room_id, room in cls.rooms.items():
            logger.debug(f"  Room ID: {room_id}, Type: {room.game_type}, "
                         f"  Players: {len(room.players)}/{room.get_max_players()}, Full: {room.is_full()}")
        for player in room.players:
            logger.debug(f"  Players: {player.get_username()}")

    async def game_ended(self, game, room_id):
        if self.id != room_id:
            logger.warning(f"Received game end signal for room {room_id} in room {self.id}")
            return

        self.game = None
        winner = next((player for player in self.players if player.result == 'winner'), None)
        loser = next((player for player in self.players if player.result == 'loser'), None)
        
        if winner and loser:
            await self.broadcast_message({
                'type': 'display',
                'message': f"Game over ! {winner.get_username()} won against {loser.get_username()} !"
            })
        elif all(player.result == 'tie' for player in self.players):
            await self.broadcast_message({
                'type': 'display',
                'message': "Game over! It's a tie!"
            })
        else:
            await self.broadcast_message({
                'type': 'display',
                'message': "Game over!"
            })

        if self.game_type == 'tournament' and self.tournament_callback:
            if winner:
                await self.tournament_callback(self, winner)
        else:
            # Give players some time to see the result before deleting the room
            await asyncio.sleep(5)
            await self.broadcast_message({
                'type': 'end_game',
                'message': "This Is the end"
            })
            self.delete_room()

    async def broadcast_message(self, message):
        for player in self.players:
            await player.send_message(message)

    def __str__(self):
        return f"Room(id={self.id}, type={self.game_type}, players={len(self.players)}/{self.get_max_players()})"
