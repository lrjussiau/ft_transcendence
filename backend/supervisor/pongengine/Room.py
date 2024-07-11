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
        room = await cls.create_room(player)
        return room

    async def add_player(self, player):
        player.in_game = True
        logger.debug(f"Player {player.get_username()} is in game: {player.in_game}")
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
            'message': 'waitingForOpponent'
        })

        player_info = [
            {
                'player_num': p.player_num,
                'username': p.user.username,
                'avatar': p.user.avatar.url if p.user.avatar else None
            } 
            for p in self.players
        ]

        await self.broadcast_message({
            'type': 'player_info',
            'players': player_info
        })

    def delete_room(self):
        if self.id in Room.rooms:
            del Room.rooms[self.id]
            logger.debug(f"Room {self.id} deleted")
        else:
            logger.warning(f"Attempted to delete non-existent room {self.id}")

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
            self.game = PongConsumer(self.players, self.game_type, self) 
            await self.game.start_game()
            logger.debug(f"{self.game_type} game started in room {self.id}")
        else:
            logger.warning(f"Cannot start game in room {self.id}: not enough players")

    async def handle_player_input(self, channel_name, data):
        if self.game:
            await self.game.handle_player_input(data)
        else:
            logger.warning(f"Game not started in room {self.id}, input ignored.")

    async def notify_player_disconnection(self):
        disconnect_message = json.dumps({
            'type': 'player_disconnected',
            'message': ' playerDisconnect'
        })
        for player in self.players:
            logger.debug(f"Sending player disconnection message to {player.get_username()}")
            await player.send_message(disconnect_message)

    async def game_ended(self, game, room_id):
        if self.id != room_id:
            logger.warning(f"Received game end signal for room {room_id} in room {self.id}")
            return

        self.game = None
        winner = next((player for player in self.players if player.result == 'winner'), None)
        loser = next((player for player in self.players if player.result == 'loser'), None)
        
        if winner and loser:
            winner_name = winner.get_username()
            loser_name = loser.get_username()
            end_message = "gameEnded"
            await self.broadcast_message({
                'type': 'display',
                'message': end_message,
                'winner': winner_name,
                'loser': loser_name
            })
        else:
            end_message = "gameEnded"
            await self.broadcast_message({
                'type': 'display',
                'message': end_message
            })

        await asyncio.sleep(5)    
        if self.game_type == 'tournament' and self.tournament_callback:
            if winner:
                await self.tournament_callback(self, winner)
            if winner.is_last_round == True:
                await winner.send_message({
                    'type': 'end_game',
                    'message': "This Is the end"
                })
            else:
                await winner.send_message({
                    'type': 'round_ended',
                    'message': "You won! Waiting for next round.",
                })
            await loser.send_message({
                'type': 'end_game',
                'message': "You lost. Tournament ended for you.",
                'winner': winner.get_username()
            })
        else:
            await self.broadcast_message({
                'type': 'end_game',
                'message': "This Is the end"
            })
        
        self.delete_room()

    async def broadcast_message(self, message):
        for player in self.players:
            await player.send_message(message)

    async def remove_player(self, player):
        if player in self.players:
            self.players.remove(player)
            if self.game and not self.game.game_state['game_over']:
                player_num = 1 if player == self.game.players[1] else 2
                await self.game.handle_player_disconnect(player_num)
            logger.debug(f"Player {player.get_username()} removed from room {self.id}")

    async def close(self):
        for player in self.players:
            try:
                await player.close()
            except Exception as e:
                logger.error(f"Error closing player in room {self.id}: {str(e)}")
        if self.game:
            try:
                await self.game.close()
            except Exception as e:
                logger.error(f"Error closing game in room {self.id}: {str(e)}")
        self.delete_room()
        
    def __str__(self):
        return f"Room(id={self.id}, type={self.game_type}, players={len(self.players)}/{self.get_max_players()})"
