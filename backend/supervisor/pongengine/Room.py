import json
import uuid
import logging
from supervisor.pongengine.PongConsumer import PongConsumer

logger = logging.getLogger(__name__)



class Room:
    def __init__(self, game_type):
        self.id = str(uuid.uuid4())[:8]  # Generate a unique room ID
        self.game_type = game_type
        self.players = []
        self.game = None
        logger.debug(f"Room created: ID {self.id}, type {game_type}")

    async def add_player(self, player):
        self.players.append(player)
        player['player_num'] = len(self.players)
        logger.debug(f"Player {player['username']} added to room. Player number: {player['player_num']}")
        await self.send_player_assignment(player)
        if not self.is_full():
            await self.broadcast_waiting_message()
        else:
            logger.debug("Room is now full")

    async def remove_player(self, player):
        self.players.remove(player)
        logger.debug(f"Player {player['username']} removed from room")
        if self.game:
            await self.game.end_game()
            logger.debug("Game ended due to player removal")
        await self.notify_player_disconnection()

    def is_full(self):
        if self.game_type == '1v1':
            return len(self.players) >= 2
        else:  # local_1v1 or other game types
            return len(self.players) >= 1
    
    def player_count(self):
        return len(self.players)

    def has_player(self, channel_name):
        has_player = any(p['object'].channel_name == channel_name for p in self.players)
        logger.debug(f"Room has player with channel {channel_name}: {has_player}")
        return has_player

    async def start_game(self):
        logger.debug("Starting game")
        self.game = PongConsumer(self.players, self.game_type)
        await self.game.start_game()
        logger.debug("Game started successfully")

    async def end_game(self):
        if self.game:
            logger.debug("Ending game")
            await self.game.end_game()
            self.game = None
            logger.debug("Game ended successfully")
        else:
            logger.debug("No game to end")

    async def handle_player_input(self, channel_name, data):
        if self.game:
            logger.debug(f"Handling player input from {channel_name}")
            await self.game.handle_player_input(data)
        else:
            logger.warning("Game not started, input ignored.")

    async def send_player_assignment(self, player):
        assignment_message = json.dumps({
            'type': 'player_assignment',
            'player_num': player['player_num'],
            'message': f'You are Player {player["player_num"]} for {self.game_type}.'
        })
        await player['object'].send(text_data=assignment_message)
        logger.debug(f"Player assignment sent to {player['username']}")

    async def broadcast_waiting_message(self):
        waiting_message = json.dumps({
            'type': 'waiting_for_opponent',
            'message': 'Waiting for an opponent to join...'
        })
        for player in self.players:
            await player['object'].send(text_data=waiting_message)
        logger.debug("Waiting message broadcast to all players in room")

    async def notify_player_disconnection(self):
        disconnect_message = json.dumps({
            'type': 'player_disconnected',
            'message': 'A player has disconnected. The game will end.'
        })
        for player in self.players:
            await player['object'].send(text_data=disconnect_message)
        logger.debug("Player disconnection notification sent to all players in room")

    def __str__(self):
        return f"Room(id={self.id}, type={self.game_type}, players={self.player_count()}/{2 if self.game_type == '1v1' else 1})"