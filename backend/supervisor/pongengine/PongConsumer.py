import json
import asyncio
import logging
import random
from supervisor.pongengine.simple_ai import Ai
from games_history.views import store_game
from math import cos, sin, radians

logger = logging.getLogger(__name__)

class PongConsumer:
    points = 5
    refresh_rate = 60
    speed_buff = 7 / 6
    paddle_height = 70
    center_paddle_offset = paddle_height / 2
    max_angle = 45
    global_speed_factor = 1.75

    def __init__(self, players, game_type, room):
        self.players = {i + 1: player for i, player in enumerate(players)}
        self.game_type = game_type
        self.room = room 
        self.AI = Ai() if game_type == "solo" else None
        self.game_id = 'G' + str(random.randint(1000, 9999))
        self.game_state = self.init_game_state()

    def init_game_state(self):
        return {
            "ball": {"x": 320, "y": 180, "vx": 150 * random.choice((1, -1)), "vy": 150 * random.choice((1, -1))},
            "player1": {"y": 180, "speed": 0},
            "player2": {"y": 180, "speed": 0},
            "player1_score": 0,
            "player2_score": 0,
            "game_started": False,
            "game_over": False,
            "last_update_time": None
        }

    async def start_game(self):
        self.game_state = self.init_game_state()  # Reset game state
        await self.start_countdown()
        self.game_state['game_started'] = True
        self.ball_restart()
        for player in self.players.values():
            logger.debug(f"Game {self.game_id} started with players: {player.get_username()}")
        asyncio.create_task(self.game_loop())

    async def start_countdown(self):
        for i in range(3, 0, -1):
            logger.debug(f"Countdown: {i} for game {self.game_id}")
            await self.broadcast_game_state({'type': 'countdown', 'value': i})
            await asyncio.sleep(1)
        logger.debug(f"Countdown finished for game {self.game_id}")

    # ------------------Main Game Loop------------------

    async def game_loop(self):
        self.game_state['last_update_time'] = asyncio.get_event_loop().time()
        logger.debug(f"Game loop started for game {self.game_id}")
        while self.game_state['game_started'] and not self.game_state['game_over']:
            current_time = asyncio.get_event_loop().time()
            dt = current_time - self.game_state['last_update_time']
            self.game_state['last_update_time'] = current_time

            await self.update_game_state(dt)
            await self.broadcast_game_state()
            await asyncio.sleep(1 / self.refresh_rate)
        
        await self.end_game()


    async def update_game_state(self, dt):
        if not self.game_state['game_started'] or self.game_state['game_over']:
            return

        self.game_state['player1']["y"] += self.game_state['player1']["speed"] * dt * 100 * self.global_speed_factor
        self.game_state['player2']["y"] += self.game_state['player2']["speed"] * dt * 100 * self.global_speed_factor
        self.game_state['player1']["y"] = max(0, min(self.game_state['player1']["y"], 360 - self.paddle_height))
        self.game_state['player2']["y"] = max(0, min(self.game_state['player2']["y"], 360 - self.paddle_height))

        self.game_state['ball']["x"] += self.game_state['ball']["vx"] * dt * self.global_speed_factor
        self.game_state['ball']["y"] += self.game_state['ball']["vy"] * dt * self.global_speed_factor

        if self.game_state['ball']["y"] <= 0 or self.game_state['ball']["y"] >= 360:
            self.game_state['ball']["vy"] *= -1

        self.handle_paddle_collision()

        if self.game_state['ball']["x"] <= 0:
            self.game_state['player2_score'] += 1
            self.ball_restart()
        elif self.game_state['ball']["x"] >= 640:
            self.game_state['player1_score'] += 1
            self.ball_restart()

        if self.game_state['player1_score'] == self.points or self.game_state['player2_score'] == self.points:
            self.game_state['game_over'] = True
            self.game_state['game_started'] = False
            logger.debug(f"End Game condition met for game {self.game_id}")

    async def broadcast_game_state(self, extra_info=None):
        base_state = {
            'type': 'update',
            'ball': self.game_state['ball'],
            'p1': self.game_state['player1'],
            'p2': self.game_state['player2'],
            's1': self.game_state["player1_score"],
            's2': self.game_state["player2_score"],
            'go': self.game_state['game_over'],
            'gs': self.game_state['game_started'],
        }
        if extra_info:
            base_state.update(extra_info)

        for player_num, player in self.players.items():
            state = base_state.copy()
            if player_num == 2:
                state['ball'] = self.flip_coordinates(state['ball'])
                state['p1'], state['p2'] = state['p2'], state['p1']
                state['s1'], state['s2'] = state['s2'], state['s1']
            if player.websocket:
                try:
                    await player.send_message(state)
                except Exception as e:
                    logger.error(f"Error sending game state to player {player.get_username()}: {e}")
                    if "connection is closed" in str(e).lower():
                        await self.handle_player_disconnect(player_num)
                        return  # Exit the function as the game has ended
            else:
                logger.error(f"Player {player_num} does not have a valid websocket object")
                await self.handle_player_disconnect(player_num)
                return
        if self.AI:
            ai_move = self.AI.act()
            self.game_state['player2']['y'] += ai_move
            self.game_state['player2']['y'] = max(0, min(self.game_state['player2']['y'], 290))
            self.AI.store_state(self.game_state)

    # ------------------Collision Handling------------------

    def handle_paddle_collision(self):
        if self.game_state['ball']["x"] <= 15:
            if self.game_state['player1']["y"] <= self.game_state['ball']["y"] <= self.game_state['player1']["y"] + self.paddle_height:
                relative_intercept = (self.game_state['player1']["y"] + self.center_paddle_offset) - self.game_state['ball']["y"]
                normalized_relative_intercept = relative_intercept / self.center_paddle_offset
                bounce_angle = normalized_relative_intercept * self.max_angle
                self.game_state['ball']["vx"] = abs(self.game_state['ball']["vx"]) * cos(radians(bounce_angle)) * self.speed_buff
                self.game_state['ball']["vy"] = abs(self.game_state['ball']["vx"]) * sin(radians(bounce_angle)) * (-1 if normalized_relative_intercept < 0 else 1) * self.speed_buff
                self.game_state['ball']["x"] = 15

        elif self.game_state['ball']["x"] >= 625:
            if self.game_state['player2']["y"] <= self.game_state['ball']["y"] <= self.game_state['player2']["y"] + self.paddle_height:
                relative_intercept = (self.game_state['player2']["y"] + self.center_paddle_offset) - self.game_state['ball']["y"]
                normalized_relative_intercept = relative_intercept / self.center_paddle_offset
                bounce_angle = normalized_relative_intercept * self.max_angle
                self.game_state['ball']["vx"] = -abs(self.game_state['ball']["vx"]) * cos(radians(bounce_angle)) * self.speed_buff
                self.game_state['ball']["vy"] = abs(self.game_state['ball']["vx"]) * sin(radians(bounce_angle)) * (-1 if normalized_relative_intercept < 0 else 1) * self.speed_buff
                self.game_state['ball']["x"] = 625

    def ball_restart(self):
        self.game_state['ball'] = {"x": 320, "y": 180, "vx": 150 * random.choice((1, -1)), "vy": 150 * random.choice((1, -1))}

    def flip_coordinates(self, obj):
        flipped = obj.copy()
        if 'x' in flipped:
            flipped['x'] = 640 - flipped['x']
        if 'vx' in flipped:
            flipped['vx'] = -flipped['vx']
        return flipped
    
    # ------------------Input Handling------------------

    async def handle_player_input(self, data):
        if self.game_state['game_started'] and not self.game_state['game_over']:
            if self.game_type == 'local_1v1':
                self.handle_local_input(data)
            elif self.game_type in ['1v1', 'tournament', 'solo']:
                self.handle_1v1_input(data)
            else:
                logger.warning(f"Unexpected game type: {self.game_type}")
        else:
            logger.warning(f"Game {self.game_id} is not in a state to accept input. Started: {self.game_state['game_started']}, Over: {self.game_state['game_over']}")

    def handle_local_input(self, data):
        logger.debug(f"Game {self.game_id}: Local 1v1 input received : {data}")
        player1_speed = data.get('p1', 0)
        player2_speed = data.get('p2', 0)
        self.game_state['player1']["speed"] = player1_speed
        self.game_state['player2']["speed"] = player2_speed
        logger.debug(f"Game {self.game_id}: Local 1v1 input: Player 1 speed = {player1_speed}, Player 2 speed = {player2_speed}")

    def handle_1v1_input(self, data):
        player_num = data.get('player_num', 0)
        speed = data.get('speed', 0)
        if player_num in [1, 2]:
            self.game_state[f'player{player_num}']["speed"] = speed
        else:
            logger.error(f"Game {self.game_id}: Invalid player number received: {player_num}")


    # ------------------Game End Handling------------------


    async def end_game(self):
        if self.game_type == "1v1" or self.game_type == "tournament":
            p1 = self.players[1]
            p2 = self.players[2]
            p1_username = p1.get_username()
            p2_username = p2.get_username()
            if self.game_type == "tournament":
                is_tournament_game = True
            else:
                is_tournament_game = False
            logger.debug(f"In End_game Store into DB")

            if self.game_state['player1_score'] == self.points:
                p1.result = 'winner'
                p2.result = 'loser'
                await store_game(self.game_state['player2_score'], p2_username, p1_username, is_tournament_game)
            else:
                p2.result = 'winner'
                p1.result = 'loser'
                await store_game(self.game_state['player1_score'], p1_username, p2_username, is_tournament_game)

            # Reset in_game status for both players


            logger.debug(f"Game {self.game_id}: player1: {p1.get_username()} : {p1.result} , player2: {p2.get_username()} : {p2.result}")

        logger.debug(f"Game {self.game_id} ended")
        if self.room.tournament_callback:
            await self.room.tournament_callback(self.room, p1 if p1.result == 'winner' else p2)
        room_id = self.room.id
        try:
            await self.room.game_ended(self, room_id)
        except Exception as e:
            logger.error(f"Error ending game in room {room_id}: {str(e)}")

    async def close(self):
        self.game_state['game_over'] = True
        self.game_state['game_started'] = False
        logger.debug(f"Game {self.game_id} closed")

    async def handle_player_disconnect(self, player_num):
        logger.warning(f"Player {player_num} disconnected unexpectedly.")
        other_player_num = 3 - player_num  # If player_num is 1, this will be 2, and vice versa
        
        # Set the score to 5-0 in favor of the player who didn't disconnect
        self.game_state[f'player{other_player_num}_score'] = 5
        self.game_state[f'player{player_num}_score'] = 0
        
        # End the game
        self.game_state['game_over'] = True
        self.game_state['game_started'] = False
        
        # Notify the other player
        other_player = self.players[other_player_num]
        await other_player.send_message({
            'type': 'opponent_disconnected',
            'message': f'Your opponent disconnected. You win 5-0!',
            'final_score': f'5-0'
        })
        
        # End the game officially
        await self.end_game()