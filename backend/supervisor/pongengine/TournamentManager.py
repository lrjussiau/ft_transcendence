import uuid
import logging
import json
import asyncio
from supervisor.pongengine.Room import Room

logger = logging.getLogger(__name__)

class Tournament:
    tournaments = {}

    def __init__(self, player_count):
        self.id = str(uuid.uuid4())[:8]
        self.player_count = player_count
        self.players = []
        self.rooms = []
        self.current_round = 0
        self.winners = []
        Tournament.tournaments[self.id] = self
        logger.debug(f"Tournament created: ID {self.id}, players {player_count}")

    @classmethod
    async def join_or_create_tournament(cls, player, player_count):
        if player_count not in [4, 8]:
            raise ValueError("Tournament must have 4 or 8 players")

        available_tournament = next((t for t in cls.tournaments.values()
                                     if t.player_count == player_count and not t.is_full()), None)

        if not available_tournament:
            available_tournament = cls(player_count)
            logger.debug(f"Created new tournament: {available_tournament}")
        
        await available_tournament.add_player(player)
        
        if available_tournament.is_full():
            logger.debug(f"Tournament {available_tournament.id} is full. Starting tournament.")
            await available_tournament.start_tournament()
        
        return available_tournament

    async def add_player(self, player):
        if not self.is_full():
            self.players.append(player)
            logger.debug(f"Player {player['username']} added to tournament {self.id}. Total players: {len(self.players)}/{self.player_count}")
            await self.broadcast_player_joined(player)
            return True
        else:
            logger.warning(f"Tournament {self.id} is full. Cannot add player {player['username']}")
            return False

    def is_full(self):
        return len(self.players) == self.player_count

    async def start_tournament(self):
        logger.info(f"Starting tournament {self.id} with {self.player_count} players")
        self.current_round = 1
        await self.create_matches()
        await self.broadcast_tournament_started()

    async def create_matches(self):
        self.rooms = []
        for i in range(0, len(self.players), 2):
            player1 = self.players[i]
            player2 = self.players[i+1]
            room = await Room.create_tournament_room(player1)
            await room.add_player(player2)
            room.tournament_callback = self.handle_match_end
            self.rooms.append(room)
            await room.start_game()
        logger.debug(f"Created {len(self.rooms)} matches for round {self.current_round}")

    async def player_ready(self, player):
            if player not in self.ready_players:
                self.ready_players.append(player)
                await self.broadcast_tournament_status()

            if len(self.ready_players) == len(self.players):
                await self.start_next_round()

    async def end_tournament(self, winner):
        logger.info(f"Tournament {self.id} ended. Winner: {winner['username']}")
        end_message = json.dumps({
            'type': 'tournament_ended',
            'winner': winner['username'],
            'tournament_details': self.get_tournament_details()
        })
        for player in self.players:
            await player['object'].send(text_data=end_message)
        del Tournament.tournaments[self.id]

    async def broadcast_player_joined(self, new_player):
        message = json.dumps({
            'type': 'player_joined_tournament',
            'message': f'{new_player["username"]} has joined the tournament.',
            'tournament_details': self.get_tournament_details()
        })
        for player in self.players:
            await player['object'].send(text_data=message)

    async def broadcast_tournament_started(self):
        message = json.dumps({
            'type': 'tournament_started',
            'message': 'The tournament has started!',
            'tournament_details': self.get_tournament_details()
        })
        for player in self.players:
            await player['object'].send(text_data=message)

    async def broadcast_round_start(self):
        message = json.dumps({
            'type': 'round_started',
            'round': self.current_round,
            'tournament_details': self.get_tournament_details()
        })
        for player in self.players:
            await player['object'].send(text_data=message)

    def get_tournament_details(self):
        return {
            'tournament_id': self.id,
            'player_count': self.player_count,
            'current_players': len(self.players),
            'players': [player['username'] for player in self.players],
            'current_round': self.current_round,
            'rooms': len(self.rooms),
            'winners': [winner['username'] for winner in self.winners]
        }

    @classmethod
    def find_tournament_for_player(cls, channel_name):
        return next((t for t in cls.tournaments.values() 
                     if t.has_player(channel_name)), None)

    def has_player(self, channel_name):
        return any(p['object'].channel_name == channel_name for p in self.players)

    async def remove_player(self, player):
        if player in self.players:
            self.players.remove(player)
            logger.debug(f"Player {player['username']} removed from tournament {self.id}")
            await self.broadcast_player_left(player)
            if not self.players:
                del Tournament.tournaments[self.id]
                logger.debug(f"Empty tournament {self.id} deleted")

    async def broadcast_player_left(self, player):
        message = json.dumps({
            'type': 'player_left_tournament',
            'message': f'{player["username"]} has left the tournament.',
            'tournament_details': self.get_tournament_details()
        })
        for remaining_player in self.players:
            await remaining_player['object'].send(text_data=message)

    async def handle_match_end(self, room, winner):
        logger.debug(f"Match ended in room {room.id}. Winner: {winner['username']}")
        
        self.winners.append(winner)
        await self.send_round_ended(winner)
        
        loser = next(player for player in room.players if player['result'] == 'loser')
        await self.send_game_over(loser, winner)
        
        # Mark the room as finished
        room.match_finished = True
        
        # Check if all matches in this round are finished
        if all(r.match_finished for r in self.rooms):
            self.rooms.clear()  # Clear all rooms after the round is complete
            await self.prepare_next_round()

    async def send_round_ended(self, winner):
        logger.debug(f"Sending round ended message to winner {winner['username']}")
        message = json.dumps({
            'type': 'round_ended',
            'message': f'You won the match!',
            'tournament_details': self.get_tournament_details()
        })
        await winner['object'].send(text_data=message)

    async def send_game_over(self, loser, winner):
        logger.debug(f"Sending game over message to loser {loser['username']}")
        message = json.dumps({
            'type': 'game_over',
            'message': f'Game over. {winner["username"]} won the match.',
            'winner': winner['username'],
            'tournament_details': self.get_tournament_details()
        })
        await loser['object'].send(text_data=message)

    async def prepare_next_round(self):
        if len(self.winners) == 1:
            await self.end_tournament(self.winners[0])
        else:
            self.current_round += 1
            self.players = self.winners
            self.winners = []
            self.ready_players = []
            await self.create_matches()
            await self.broadcast_round_start()

    async def broadcast_round_end(self):
        message = json.dumps({
            'type': 'round_ended',
            'message': f'Round {self.current_round} has ended. Please proceed to the bracket view.',
            'tournament_details': self.get_tournament_details()
        })
        for player in self.players:
            await player['object'].send(text_data=message)

    async def broadcast_tournament_status(self):
        status = {
            'type': 'tournament_status',
            'message': f'{len(self.ready_players)}/{len(self.winners)} players ready for next round',
            'all_players_ready': len(self.ready_players) == len(self.winners),
            'tournament_details': self.get_tournament_details()
        }
        for player in self.players:
            await player['object'].send(text_data=json.dumps(status))

    async def start_next_round(self):
        self.players = self.winners
        self.winners = []
        self.ready_players = []
        await self.create_matches()
        await self.broadcast_round_start()