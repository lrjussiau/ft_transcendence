import random
import asyncio
import logging
from supervisor.pongengine.PongConsumer import PongConsumer

logger = logging.getLogger(__name__)

class TournamentManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(TournamentManager, cls).__new__(cls)
            cls._instance.players = []
            cls._instance.player_count = 0
        return cls._instance

    def add_player(self, player_info):
        self.player_count += 1
        player_info['player_num'] = self.player_count
        self.players.append(player_info)
        return self.player_count

    def get_player_count(self):
        return len(self.players)

    def create_tournament(self):
        return Tournament(self.players)

class Tournament:
    def __init__(self, players):
        self.players = players
        self.tournament_size = None
        self.matches = []
        self.current_match = None

    def setup_tournament(self):
        if len(self.players) <= 4:
            self.tournament_size = 4
        else:
            self.tournament_size = 8

        while len(self.players) < self.tournament_size:
            self.players.append(None)

        random.shuffle(self.players)

        for i in range(0, self.tournament_size, 2):
            self.matches.append((self.players[i], self.players[i + 1]))

    async def start_tournament(self):
        for match in self.matches:
            await self.play_match(match[0], match[1])

    async def play_match(self, player1, player2):
        logger.debug(f"Starting match between {player1['username']} and {player2['username']}")
        self.current_match = (player1, player2)

        match_game = PongConsumer({player1['channel_name']: player1, player2['channel_name']: player2})
        await match_game.start_game()

        while not match_game.game_state['game_over']:
            await asyncio.sleep(1)

        if match_game.game_state['player1_score'] > match_game.game_state['player2_score']:
            winner = player1
        else:
            winner = player2

        logger.debug(f"Winner is {winner['username']}")
        return winner

    def update_bracket(self, winner):
        logger.debug(f"Updating bracket, winner: {winner}")
