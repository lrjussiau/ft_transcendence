# client_pygame/pong_client.py

import pygame
import sys
import random
import socketio

# Initialize Pygame
pygame.init()
clock = pygame.time.Clock()

# Set up the display
screen_width, screen_height = 640, 360
screen = pygame.display.set_mode((screen_width, screen_height))
pygame.display.set_caption('🏓 PONG 🏓')

ball = pygame.Rect(screen_width / 2 - 5, screen_height / 2 - 5, 10, 10)
player1 = pygame.Rect(screen_width - 15, screen_height / 2 - 35, 10, 70)
player2 = pygame.Rect(5, screen_height / 2 - 35, 10, 70)

bg_color = pygame.Color('black')
c_white = (255, 255, 255)

ball_speed = [7 * random.choice((1, -1)), 7 * random.choice((1, -1))]
player1_speed = 0
player2_speed = 0

player1_score, player2_score, game_over = 0, 0, False
game_started = False
font = pygame.font.Font(None, 36)

sio = socketio.Client()

@sio.event
def connect():
    sio.emit('request_state')

@sio.event
def update_state(data):
    global ball, ball_speed, player1, player2, player1_score, player2_score, game_over, game_started, player1_speed, player2_speed
    ball.x, ball.y = data['ball']['x'], data['ball']['y']
    ball_speed[0], ball_speed[1] = data['ball']['vx'], data['ball']['vy']
    player1.y = data['player1']['y']
    player2.y = data['player2']['y']
    player1_speed = data['player1']['speed']
    player2_speed = data['player2']['speed']
    player1_score = data['player1_score']
    player2_score = data['player2_score']
    game_over = data['game_over']
    game_started = data['game_started']

@sio.event
def disconnect():
    print('Disconnected from server')

def ball_animation():
    global player1_score, player2_score, game_over
    ball.x += ball_speed[0]
    ball.y += ball_speed[1]

    if ball.top <= 0 or ball.bottom >= screen_height:
        ball_speed[1] *= -1
    if ball.left <= 0:
        player2_score += 1
        if player2_score == 5:
            game_over = True
        ball_restart()
    if ball.right >= screen_width:
        player1_score += 1
        if player1_score == 5:
            game_over = True
        ball_restart()

    if ball.colliderect(player1) and ball_speed[0] > 0:
        ball_speed[0] *= -1
        ball.right = player1.left
    if ball.colliderect(player2) and ball_speed[0] < 0:
        ball_speed[0] *= -1
        ball.left = player2.right

def player1_animation():
    global player1
    player1.y += player1_speed
    if player1.top <= 0: player1.top = 0
    if player1.bottom >= screen_height: player1.bottom = screen_height

def player2_animation():
    global player2
    player2.y += player2_speed
    if player2.top <= 0: player2.top = 0
    if player2.bottom >= screen_height: player2.bottom = screen_height

def ball_restart():
    ball.center = (screen_width / 2, screen_height / 2)
    ball_speed[0] = 7 * random.choice((1, -1))
    ball_speed[1] = 7 * random.choice((1, -1))

def display_score():
    player1_text = font.render(f"{player1_score}", True, c_white)
    player2_text = font.render(f"{player2_score}", True, c_white)
    screen.blit(player1_text, (screen_width - 50, 10))
    screen.blit(player2_text, (30, 10))

def display_winner(winner):
    winner_text = font.render(f"{winner} Wins!", True, c_white)
    screen.blit(winner_text, (screen_width / 2 - 60, screen_height / 2 - 50))

def send_game_state():
    game_state = {
        'ball': {'x': ball.x, 'y': ball.y, 'vx': ball_speed[0], 'vy': ball_speed[1]},
        'player1': {'y': player1.y, 'speed': player1_speed},
        'player2': {'y': player2.y, 'speed': player2_speed},
        'player1_score': player1_score,
        'player2_score': player2_score,
        'game_over': game_over,
        'game_started': game_started
    }
    sio.emit('update_state', game_state)

def start_game():
    global game_started, game_over, player1_score, player2_score
    sio.emit('start_game')
    game_started = True
    game_over = False
    player1_score = 0
    player2_score = 0
    ball_restart()

def stop_game():
    global game_started
    sio.emit('stop_game')
    game_started = False

sio.connect('http://localhost:8000/ws/pong/')

frame_count = 0

while True:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            stop_game()
            pygame.quit()
            sys.exit()

    if game_started and not game_over:
        ball_animation()
        player1_animation()
        player2_animation()

        # Send game state every 5 frames
        frame_count += 1
        if frame_count % 5 == 0:
            send_game_state()

    screen.fill(bg_color)
    pygame.draw.rect(screen, c_white, player1)
    pygame.draw.rect(screen, c_white, player2)
    pygame.draw.ellipse(screen, c_white, ball)
    pygame.draw.aaline(screen, c_white, (screen_width / 2, 0), (screen_width / 2, screen_height))

    display_score()

    if game_over:
        winner = "Player 1" if player1_score == 5 else "Player 2"
        screen.fill(bg_color)
        display_winner(winner)
        stop_game()
        game_started = False

    pygame.display.flip()
    clock.tick(60)
