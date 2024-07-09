import asyncio
import json
import requests
import websockets
import pygame
from pygame.locals import *
import ssl
import signal
import sys
import subprocess
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configuration
AUTH_TOKEN = None
game_over_flag = False
latest_game_state = None
countdown_value = None
game_type = None
ws = None
display_message = None
keys = {}
player1_speed = 0
player2_speed = 0
DEBUG_LOG = False

def authenticate(base_url, username, password):
    try:
        response = requests.post(f'{base_url}/api/authentication/login/', data={
            'username': username,
            'password': password
        }, verify=False)
        response.raise_for_status()
        data = response.json()
        if 'access' in data:
            return data['access']
        else:
            print(f"Unexpected response format: {data}")
            exit(1)
    except requests.exceptions.RequestException as e:
        print(f'Error during authentication: {e}')
        exit(1)

def fetch_user_profile(base_url, token):
    try:
        headers = {
            'Authorization': f'Bearer {token}'
        }
        response = requests.get(f'{base_url}/api/authentication/user/profile/', headers=headers, verify=False)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f'Error fetching user profile: {e}')
        exit(1)

async def handle_websocket(game_type, username, token, websocket_url):
    global latest_game_state, game_over_flag, countdown_value, ws, display_message
    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    try:
        async with websockets.connect(websocket_url, extra_headers={'Authorization': f'Bearer {token}'}, ssl=ssl_context) as websocket:
            ws = websocket
            await websocket.send(json.dumps({'t': 'select_game_type', 'game_type': game_type, 'username': username}))

            while not game_over_flag:
                message = await websocket.recv()
                data = json.loads(message)
                if DEBUG_LOG:
                    print(f'Received message: {data}')  # Debug log
                handle_server_message(data)
    except Exception as e:
        print(f'Error during WebSocket communication: {e}')
        exit(1)

def handle_server_message(data):
    global latest_game_state, game_over_flag, countdown_value, display_message
    if data['type'] == 'update':
        latest_game_state = data
        if DEBUG_LOG:
            print(f'Updated game state: {latest_game_state}')  # Debug log
    elif data['type'] == 'countdown':
        countdown_value = data['value']
        display_message = f'Game starts in {countdown_value} seconds'
        if DEBUG_LOG:
            print(display_message)
    elif data['type'] == 'game_over':
        display_message = f'Game over! Winner: {data["winner"]}'
        if DEBUG_LOG:
            print(display_message)
        game_over_flag = True
    elif data['type'] == 'ping':
        send_pong()
    elif data['type'] == 'game_ready':
        display_message = 'Game is ready!'
        if DEBUG_LOG:
            print(display_message)
    elif data['type'] == 'player_assignment':
        display_message = data['message']
        if DEBUG_LOG:
            print(display_message)
    elif data['type'] == 'player_disconnected':
        display_message = 'A player has disconnected.'
        if DEBUG_LOG:
            print(display_message)
        game_over_flag = True
    elif data['type'] == 'start_game':
        display_message = None
        countdown_value = None
        clear_screen()
        if DEBUG_LOG:
            print('Game has started!')
    elif data['type'] == 'winner':
        print('You Win ! :)')
    else:
        if DEBUG_LOG:
            print(f"Unhandled message type: {data['type']}")

def clear_screen():
    screen = pygame.display.get_surface()
    screen.fill((0, 0, 0))
    pygame.display.flip()

def init_pygame():
    pygame.init()
    screen = pygame.display.set_mode((1280, 720), RESIZABLE)  # Allow resizing
    pygame.display.set_caption('Pong Game')
    return screen

async def main_game_loop(screen):
    global game_over_flag, latest_game_state, game_type, display_message, countdown_value
    running = True
    clock = pygame.time.Clock()
    ball_started_moving = False

    while running and not game_over_flag:
        for event in pygame.event.get():
            if event.type == QUIT:
                running = False
                game_over_flag = True
            elif event.type == VIDEORESIZE:
                screen = pygame.display.set_mode((event.w, event.h), RESIZABLE)
            elif event.type == KEYDOWN:
                keys[event.key] = True
                await update_speeds()
            elif event.type == KEYUP:
                keys[event.key] = False
                await update_speeds()

        if latest_game_state and latest_game_state.get('game_over'):
            running = False
            game_over_flag = True
        screen.fill((0, 0, 0))

        if latest_game_state:
            if not ball_started_moving and (latest_game_state['ball']['vx'] != 0 or latest_game_state['ball']['vy'] != 0):
                ball_started_moving = True
                clear_screen()
                display_message = None
            draw_game_state(screen, latest_game_state)
        else:
            if DEBUG_LOG:
                print('No game state to draw')

        if countdown_value:
            draw_message(screen, display_message)
        else:
            display_message = None

        pygame.display.flip()
        clock.tick(60)

        await asyncio.sleep(0.01)

    pygame.quit()
    sys.exit(0)

# Draw the current game state
def draw_game_state(screen, game_state):
    screen_width, screen_height = screen.get_size()
    aspect_ratio = 640 / 360
    height = screen_width / aspect_ratio
    if height > screen_height:
        height = screen_height
        screen_width = height * aspect_ratio

    scale_x = screen_width / 640
    scale_y = screen_height / 360

    draw_middle_line(screen, scale_x, scale_y)

    # Draw ball
    ball_x = int(game_state['ball']['x']) * scale_x
    ball_y = int(game_state['ball']['y']) * scale_y
    if DEBUG_LOG:
        print(f'Drawing ball at ({ball_x}, {ball_y})')  # Debug log
    pygame.draw.circle(screen, (255, 255, 255), (int(ball_x), int(ball_y)), int(5 * scale_x))

    # Draw paddles
    paddle1_x = 5 * scale_x
    paddle1_y = int(game_state['p1']['y']) * scale_y
    paddle2_x = screen_width - 15 * scale_x
    paddle2_y = int(game_state['p2']['y']) * scale_y
    if DEBUG_LOG:
        print(f'Drawing paddle 1 at ({paddle1_x}, {paddle1_y})')  # Debug log
        print(f'Drawing paddle 2 at ({paddle2_x}, {paddle2_y})')  # Debug log

    pygame.draw.rect(screen, (255, 255, 255), (paddle1_x, paddle1_y, 10 * scale_x, 70 * scale_y))
    pygame.draw.rect(screen, (255, 255, 255), (paddle2_x, paddle2_y, 10 * scale_x, 70 * scale_y))

def draw_middle_line(screen, scale_x, scale_y):
    screen_width, screen_height = screen.get_size()
    middle_x = screen_width // 2
    pygame.draw.line(screen, (255, 255, 255), (middle_x, 0), (middle_x, screen_height), int(2 * scale_x))

def draw_message(screen, message):
    screen_width, screen_height = screen.get_size()
    font_size = int(40 * (screen_height / 360))
    font = pygame.font.Font(None, font_size)
    text = font.render(message, True, (255, 255, 255))
    text_rect = text.get_rect(center=(screen_width / 2, screen_height / 2))
    screen.blit(text, text_rect)

def signal_handler(sig, frame):
    global game_over_flag
    print('Exiting game...')
    game_over_flag = True
    pygame.quit()
    sys.exit(0)

def send_pong():
    global ws
    if ws:
        ws.send(json.dumps({'t': 'pong'}))

async def send_player_input(direction):
    global ws
    if ws:
        await ws.send(json.dumps({'t': 'move', 'direction': direction}))

async def update_speeds():
    global ws, player1_speed, player2_speed, keys, game_type
    new_player1_speed = (keys.get(pygame.K_w, False) * -5) + (keys.get(pygame.K_s, False) * 5)
    new_player2_speed = (keys.get(pygame.K_UP, False) * -5) + (keys.get(pygame.K_DOWN, False) * 5)

    if game_type == 'local_1v1':
        if new_player1_speed != player1_speed or new_player2_speed != player2_speed:
            player1_speed = new_player1_speed
            player2_speed = new_player2_speed
            if ws:
                await ws.send(json.dumps({'t': 'pi', 'p1': player1_speed, 'p2': player2_speed}))
    else:
        if new_player1_speed != player1_speed:
            player1_speed = new_player1_speed
            if ws:
                await ws.send(json.dumps({'t': 'pi', 'player_num': 1, 'speed': player1_speed}))

async def main():
    global AUTH_TOKEN, latest_game_state, game_type

    host = subprocess.check_output("hostname", shell=True).decode().strip()
    username = input('Enter your username: ')
    password = input('Enter your password: ')
    game_type = input('Enter the game type (solo, 1v1, local_1v1): ')
    base_url = f'https://{host}:4443'
    websocket_url = f'wss://{host}:4443/ws/pong/'

    AUTH_TOKEN = authenticate(base_url, username, password)
    user_profile = fetch_user_profile(base_url, AUTH_TOKEN)
    print(f'Logged in as {user_profile["username"]}')
    signal.signal(signal.SIGINT, signal_handler)
    screen = init_pygame()
    latest_game_state = None

    websocket_task = asyncio.create_task(handle_websocket(game_type, user_profile['username'], AUTH_TOKEN, websocket_url))
    game_loop_task = asyncio.create_task(main_game_loop(screen))

    try:
        await asyncio.gather(websocket_task, game_loop_task)
    except SystemExit:
        pass
    except Exception as e:
        print(f'Unexpected error: {e}')

if __name__ == '__main__':
    asyncio.run(main())