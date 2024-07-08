import json
import uuid
import logging
from supervisor.pongengine.PongConsumer import PongConsumer

logger = logging.getLogger(__name__)

class Room:
    rooms = {}

    def __init__(self, game_type):
        self.id = str(uuid.uuid4())[:8]
        self.game_type = game_type
        self.players = []
        self.game = None
        self.tournament_callback = None
        Room.rooms[self.id] = self
        logger.debug(f"Room created: ID {self.id}, type {game_type}")
        self.match_finished = False

    @classmethod
    async def create_room(cls, player, game_type):
        room = cls(game_type)
        await room.add_player(player)
        return room

    @classmethod
    async def join_or_create_room(cls, player, game_type):
        if game_type in ['local_1v1', 'solo']:
            return await cls.create_and_start_single_player_room(player, game_type)
        elif game_type == '1v1':
            return await cls.join_or_create_1v1_room(player)
        elif game_type == 'tournament':
            return await cls.create_tournament_room(player)
        else:
            logger.error(f"Unsupported game type: {game_type}")
            return None

    @classmethod
    async def create_and_start_single_player_room(cls, player, game_type):
        room = await cls.create_room(player, game_type)
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
            available_room = await cls.create_room(player, '1v1')
            await available_room.broadcast_waiting_message()
        
        return available_room

    @classmethod
    async def create_tournament_room(cls, player):
        room = await cls.create_room(player, 'tournament')
        return room

    async def add_player(self, player):
        player_num = len(self.players) + 1
        player['player_num'] = player_num
        self.players.append(player)
        logger.debug(f"Player {player['username']} added to room: {self.id}. Player number: {player_num}")

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
        return any(p['object'].channel_name == channel_name for p in self.players)

    async def start_game(self):
        if self.game:
            logger.warning(f"Game already in progress in room {self.id}")
            return

        if self.is_full():
            self.game = PongConsumer(self.players, self.game_type)
            await self.game.start_game()
            logger.debug(f"{self.game_type} game started in room {self.id}")
        else:
            logger.warning(f"Cannot start game in room {self.id}: not enough players")

    async def end_game(self):
        if self.game:
            logger.debug(f"Ending game in room {self.id}")
            final_scores = self.game.get_final_scores()
            logger.debug(f"Final scores: {final_scores}")
            
            if final_scores['player1_score'] > final_scores['player2_score']:
                winner = {'username': final_scores['player1_name'], 'score': final_scores['player1_score']}
                loser = {'username': final_scores['player2_name'], 'score': final_scores['player2_score']}
            elif final_scores['player1_score'] < final_scores['player2_score']:
                loser = {'username': final_scores['player1_name'], 'score': final_scores['player1_score']}
                winner = {'username': final_scores['player2_name'], 'score': final_scores['player2_score']}
            else:
                winner, loser = None, None 

            if winner:
                logger.debug(f"Winner: {winner['username']}")
                logger.debug(f"Loser: {loser['username']}")
            else:
                logger.debug("The game ended in a tie.")

            self.game = None
            logger.debug("Game ended successfully")

            if self.game_type == 'tournament' and self.tournament_callback:
                if winner:
                    logger.debug(f"Calling tournament callback for winner: {winner['username']}")
                    await self.tournament_callback(self, winner)
                else:
                    logger.warning(f"No winner determined for tournament game in room {self.id}")
            else:
                self.delete_room()
        else:
            logger.debug(f"No game to end in room {self.id}")

    async def remove_player(self, player):
        if player in self.players:
            self.players.remove(player)
            logger.debug(f"Player {player['username']} removed from room {self.id}")
            if self.game:
                await self.end_game()
            elif not self.players:
                self.delete_room()
            await self.notify_player_disconnection()
        else:
            logger.warning(f"Player {player['username']} not found in room {self.id}")

    async def handle_player_input(self, channel_name, data):
        if self.game:
            logger.debug(f"Handling player input from {channel_name} in room {self.id}")
            await self.game.handle_player_input(data)
        else:
            logger.warning(f"Game not started in room {self.id}, input ignored.")

    async def broadcast_waiting_message(self):
        waiting_message = json.dumps({
            'type': 'waiting_for_opponent',
            'message': 'Waiting for an opponent to join...'
        })
        for player in self.players:
            logger.debug(f"Sending waiting message to {player['username']} : {waiting_message}")
            await player['object'].send(text_data=waiting_message)

    async def notify_player_disconnection(self):
        disconnect_message = json.dumps({
            'type': 'player_disconnected',
            'message': 'A player has disconnected. The game will end.'
        })
        for player in self.players:
            logger.debug(f"Sending player disconnection message to {player['username']} : {disconnect_message}")
            await player['object'].send(text_data=disconnect_message)

    @classmethod
    def log_room_state(cls):
        logger.debug("Current room state:")
        for room_id, room in cls.rooms.items():
            logger.debug(f"  Room ID: {room_id}, Type: {room.game_type}, "
                         f"Players: {len(room.players)}/{room.get_max_players()}, Full: {room.is_full()}")

    def __str__(self):
        return f"Room(id={self.id}, type={self.game_type}, players={len(self.players)}/{self.get_max_players()})"