import asyncio
import json
import requests
import websockets
import pygame
from pygame.locals import *
import subprocess
import urllib3
import ssl
import signal
import sys

# Désactiver les avertissements de requêtes HTTPS non vérifiées
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configuration
AUTH_TOKEN = None
game_over_flag = False
latest_game_state = None
countdown_value = None

# Function to authenticate and retrieve the token
def authenticate(base_url, username, password):
    try:
        response = requests.post(f'{base_url}/api/authentication/login/', data={
            'username': username,
            'password': password
        }, verify=False)  # Disable SSL verification
        response.raise_for_status()  # Will raise an HTTPError for bad responses
        data = response.json()
        if 'access' in data:
            return data['access']
        else:
            print(f"Unexpected response format: {data}")
            exit(1)
    except requests.exceptions.RequestException as e:
        print(f'Error during authentication: {e}')
        exit(1)

# Function to fetch user profile
def fetch_user_profile(base_url, token):
    try:
        headers = {
            'Authorization': f'Bearer {token}'
        }
        response = requests.get(f'{base_url}/api/authentication/user/profile/', headers=headers, verify=False)  # Disable SSL verification
        response.raise_for_status()  # Will raise an HTTPError for bad responses
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f'Error fetching user profile: {e}')
        exit(1)

# Function to handle WebSocket communication
async def handle_websocket(game_type, username, token, websocket_url):
    global latest_game_state, game_over_flag, countdown_value
    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    try:
        async with websockets.connect(websocket_url, extra_headers={'Authorization': f'Bearer {token}'}, ssl=ssl_context) as websocket:
            await websocket.send(json.dumps({'t': 'select_game_type', 'game_type': game_type, 'username': username}))

            while not game_over_flag:
                message = await websocket.recv()
                data = json.loads(message)
                print(f'Received message: {data}')  # Debug log
                handle_server_message(data)
    except Exception as e:
        print(f'Error during WebSocket communication: {e}')
        exit(1)

# Function to handle server messages
def handle_server_message(data):
    global latest_game_state, game_over_flag, countdown_value
    if data['type'] == 'update':
        latest_game_state = data
        print(f'Updated game state: {latest_game_state}')  # Debug log
    elif data['type'] == 'countdown':
        countdown_value = data['value']
        print(f'Game starts in {countdown_value} seconds')
    elif data['type'] == 'game_over':
        print(f'Game over! Winner: {data["winner"]}')
        game_over_flag = True
    elif data['type'] == 'ping':
        send_pong()
    elif data['type'] == 'game_ready':
        print('Game is ready!')
    elif data['type'] == 'player_assignment':
        print(data['message'])
    elif data['type'] == 'player_disconnected':
        print('A player has disconnected.')
        game_over_flag = True
    elif data['type'] == 'start_game':
        print('Game has started!')
        countdown_value = None
    else:
        print(f"Unhandled message type: {data['type']}")

# Initialize pygame
def init_pygame():
    pygame.init()
    screen = pygame.display.set_mode((1280, 720))  # Resolution 1280x720 for 2x scaling
    pygame.display.set_caption('Pong Game')
    return screen

# Main game loop
def main_game_loop(screen):
    global game_over_flag
    running = True
    clock = pygame.time.Clock()

    while running and not game_over_flag:
        for event in pygame.event.get():
            if event.type == QUIT:
                running = False
                game_over_flag = True

        screen.fill((0, 0, 0))  # Clear screen with black

        if latest_game_state:
            draw_game_state(screen, latest_game_state)
        else:
            print('No game state to draw')  # Debug log

        pygame.display.flip()
        clock.tick(60)

    pygame.quit()
    sys.exit(0)  # Ensure the program exits

# Draw the current game state
def draw_game_state(screen, game_state):
    scale_factor = 2
    screen.fill((0, 0, 0))  # Clear screen with black

    # Draw middle line
    middle_x = screen.get_width() // 2
    pygame.draw.line(screen, (255, 255, 255), (middle_x, 0), (middle_x, screen.get_height()), 5)

    # Draw ball
    ball_x = int(game_state['ball']['x']) * scale_factor
    ball_y = int(game_state['ball']['y']) * scale_factor
    print(f'Drawing ball at ({ball_x}, {ball_y})')  # Debug log
    pygame.draw.circle(screen, (255, 255, 255), (ball_x, ball_y), 10)

    # Draw paddles
    paddle1_x = 20 * scale_factor
    paddle1_y = int(game_state['p1']['y']) * scale_factor
    paddle2_x = screen.get_width() - 30 * scale_factor
    paddle2_y = int(game_state['p2']['y']) * scale_factor
    print(f'Drawing paddle 1 at ({paddle1_x}, {paddle1_y})')  # Debug log
    print(f'Drawing paddle 2 at ({paddle2_x}, {paddle2_y})')  # Debug log

    pygame.draw.rect(screen, (255, 255, 255), (paddle1_x, paddle1_y, 20, 140))
    pygame.draw.rect(screen, (255, 255, 255), (paddle2_x, paddle2_y, 20, 140))

# Handle SIGINT (Ctrl + C)
def signal_handler(sig, frame):
    global game_over_flag
    print('Exiting game...')
    game_over_flag = True
    pygame.quit()
    sys.exit(0)

def send_pong():
    global ws
    if ws:
        ws.send(json.dumps({ 't': 'pong' }))

if __name__ == '__main__':
    # Récupérer le hostname en exécutant la commande `hostname`
    try:
        host = subprocess.check_output(['hostname'], universal_newlines=True).strip()
        print(f'Hostname: {host}')
    except subprocess.CalledProcessError as e:
        print(f'Error fetching hostname: {e}')
        exit(1)

    username = input('Enter your username: ')
    password = input('Enter your password: ')
    game_type = input('Enter the game type (solo, 1v1, local_1v1): ')

    base_url = f'https://{host}:4443'
    websocket_url = f'wss://{host}:4443/ws/pong/'

    AUTH_TOKEN = authenticate(base_url, username, password)
    user_profile = fetch_user_profile(base_url, AUTH_TOKEN)
    print(f'Logged in as {user_profile["username"]}')

    # Register signal handler for SIGINT
    signal.signal(signal.SIGINT, signal_handler)

    screen = init_pygame()
    latest_game_state = None

    # Run WebSocket handler in a separate thread
    loop = asyncio.get_event_loop()
    loop.run_until_complete(handle_websocket(game_type, user_profile['username'], AUTH_TOKEN, websocket_url))

    # Run the main game loop
    main_game_loop(screen)
