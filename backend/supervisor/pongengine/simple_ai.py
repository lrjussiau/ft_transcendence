import time

class Ai:
    def __init__(self):
        self.paddle = 0
        self.target = 0
        self.time = time.time()

    def act(self):
        if self.paddle + 70 < self.target:
            self.paddle += 14
            action =  14
        elif self.paddle > self.target:
            self.paddle -= 14
            action =  -14
        else:
            action =  0
        #logger.info(f" Target is {self.target}, action is {action}")
        return action

    def extract_data(self, game_state):
        player1_y = game_state["player1"]["y"]
        player2_y = game_state["player2"]["y"]
        ball_x = game_state["ball"]["x"]
        ball_y = game_state["ball"]["y"]
        ball_vx = game_state["ball"]["vx"]
        ball_vy = game_state["ball"]["vy"]

        return player1_y, player2_y, ball_x, ball_y, ball_vx, ball_vy

    def store_state(self, game_state):
        current_time = time.time()
        if current_time - self.time >= 1.0:
            self.predict(self.extract_data(game_state))
            self.time = time.time()

    def predict(self, state):
        paddle_1 = state[0]
        paddle_2 = state[1]
        ball_x = state[2]
        ball_y = state[3]
        ball_vx = state[4]
        ball_vy = state[5]

        while (ball_x < 620 and ball_x > 20):
            ball_x += ball_vx
            ball_y += ball_vy
            if ball_y <= 0 or ball_y >= 360:
                ball_vy *= -1
        self.paddle = paddle_2
        self.target = ball_y
