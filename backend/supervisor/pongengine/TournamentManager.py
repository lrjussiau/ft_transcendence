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
        self.ready_players = []
        Tournament.tournaments[self.id] = self
        logger.debug(f"Tournament created: ID {self.id}, players {player_count}")

    @classmethod
    async def join_or_create_tournament(cls, player, player_count):
        if player_count not in [4]:
            raise ValueError("Tournament must have 4 players")

        logger.debug(f"Player {player.user.username} wants to join a {player_count}-player tournament")
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
            logger.debug(f"Player {player.user.username} added to tournament {self.id}. Total players: {len(self.players)}/{self.player_count}")
            await self.broadcast_player_joined(player)
            return True
        else:
            logger.warning(f"Tournament {self.id} is full. Cannot add player {player.user.username}")
            return False

    def is_full(self):
        return len(self.players) == self.player_count

    async def start_tournament(self):
        logger.info(f"Starting tournament {self.id} with {self.player_count} players")
        self.current_round = 1
        await self.create_matches()

    async def create_matches(self):
        self.rooms = []
        for i in range(0, len(self.players), 2):
            player1 = self.players[i]
            player2 = self.players[i + 1]
            player1.game_type = 'tournament'
            player2.game_type = 'tournament'
            room = await Room.create_tournament_room(player1)
            await room.add_player(player2)
            room.tournament_callback = self.handle_match_end
            self.rooms.append(room)
            await room.start_game()
        logger.debug(f"Created {len(self.rooms)} matches for round {self.current_round}")

    async def broadcast_player_joined(self, new_player):
        message = self.build_message(
            'player_joined_tournament',
            f'{new_player.user.username} has joined the tournament.'
        )
        await self.broadcast_to_all_players(message)

    async def broadcast_to_all_players(self, message):
        for player in self.players:
            await player.send_message(message)

    def build_message(self, message_type, message, **kwargs):
        return json.dumps({
            'type': message_type,
            'message': message,
            'tournament_details': self.get_tournament_details(),
            **kwargs
        })

    def get_tournament_details(self):
        return {
            'tournament_id': self.id,
            'player_count': self.player_count,
            'current_players': len(self.players),
            'players': [player.user.username for player in self.players],
            'current_round': self.current_round,
            'rooms': len(self.rooms),
            'winners': [winner.user.username for winner in self.winners]
        }

    @classmethod
    def find_tournament_for_player(cls, channel_name):
        return next((t for t in cls.tournaments.values() 
                     if t.has_player(channel_name)), None)

    def has_player(self, channel_name):
        return any(p.websocket.channel_name == channel_name for p in self.players)

    async def remove_player(self, player):
        if player in self.players:
            self.players.remove(player)
            logger.debug(f"Player {player.user.username} removed from tournament {self.id}")
            await self.broadcast_player_left(player)
            if not self.players:
                del Tournament.tournaments[self.id]
                logger.debug(f"Empty tournament {self.id} deleted")

    async def broadcast_player_left(self, player):
        message = self.build_message('player_left_tournament', f'{player.user.username} has left the tournament.')
        await self.broadcast_to_all_players(message)

    async def handle_match_end(self, room, winner):
        try:
            if room.match_finished:
                logger.debug(f"Match end already processed for room {room.id}. Ignoring.")
                return

            logger.debug(f"Match ended in room {room.id}. Winner: {winner.user.username}")
            
            self.winners.append(winner)
            room.match_finished = True

            if all(r.match_finished for r in self.rooms):
                logger.debug("All matches finished for this round.")
                self.rooms.clear()
                
                if len(self.winners) == 1:
                    # Tournament is over
                    await self.end_tournament(self.winners[0])
                else:
                    # Prepare for next round
                    await self.prepare_next_round()
                    if len(self.ready_players) == len(self.winners):
                        await self.start_next_round()
                    else:
                        logger.debug("Waiting for all players to be ready for the next round.")
            else:
                logger.debug("Waiting for other matches to finish.")
        except Exception as e:
            logger.error(f"Error in handle_match_end: {str(e)}")

    async def end_tournament(self, winner):
        logger.info(f"Tournament {self.id} ended. Winner: {winner.user.username}")
        await winner.send_message({
            'type': 'display',
            'winner': winner.user.username,
            'message': f"You win the tournament!",
            'is_final_round': True
        })
        await asyncio.sleep(5)
        await winner.send_message({
            'type': 'end_game',
            'message': "You won the tournament.",
            'is_final_round': True
        })
        await self.broadcast_tournament_ended(winner)
        for room in self.rooms:
            try:
                await room.close()
            except Exception as e:
                logger.error(f"Error closing room in tournament {self.id}: {str(e)}")
        logger.debug(f"Deleting tournament {self.id}")
        del Tournament.tournaments[self.id]

    async def prepare_next_round(self):
            if len(self.winners) == 1:
                await self.end_tournament(self.winners[0])
            else:
                for player in self.winners:
                    await player.send_message({
                        'type': 'prepare_next_round',
                        'message': 'Please confirm when you are ready for the next round'
                    })

    async def player_ready(self, player):
            if player not in self.ready_players:
                self.ready_players.append(player)
                player.is_ready = True
                await self.broadcast_tournament_status()
                logger.debug(f"Player {player.user.username} marked as ready. Total ready players: {len(self.ready_players)}/{len(self.winners)}")

            if len(self.ready_players) == len(self.winners):
                await self.start_next_round()
                logger.debug("All winners are ready. Starting next round.")

    async def broadcast_tournament_status(self):
        status = self.build_message(
            'tournament_status',
            f'{len(self.ready_players)}/{len(self.winners)} players ready for next round',
            all_players_ready=(len(self.ready_players) == len(self.winners))
        )
        await self.broadcast_to_all_players(status)

    async def start_next_round(self):
        if len(self.winners) == 1:
            await self.end_tournament(self.winners[0])
        else:
            if len(self.winners) == 2:
                for winner in self.winners:
                    winner.is_last_round = True
            self.current_round += 1
            self.players = self.winners
            self.winners = []
            self.ready_players = []
            await self.create_matches()


    async def end_tournament(self, winner):
        logger.info(f"Tournament {self.id} ended. Winner: {winner.user.username}")
        for room in self.rooms:
            try:
                await room.close()
            except Exception as e:
                logger.error(f"Error closing room in tournament {self.id}: {str(e)}")
        logger.debug(f"Deleting tournament {self.id}")
        del Tournament.tournaments[self.id]
