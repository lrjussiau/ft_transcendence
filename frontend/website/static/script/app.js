// utils.js

let ws = null;
let ctx = null;
let username = '';
let countdownValue = null;
let latestGameState = null;
let selectedGameType = null;
let player1Speed = 0;
let player2Speed = 0;
let roundTripTime = 0;
let requestIdCounter = 0;
let gameOver = false;
const playerNum = 1;
const keys = {};
let gameState = {};
const requestTimestamps = {};

async function fetchUserProfile() {
  const token = localStorage.getItem('authToken');
  const response = await fetch('/api/authentication/user/profile/', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (response.ok) {
    const userData = await response.json();
    displayUsername(userData.username);
    // document.getElementById('displayToken').textContent = token;
    return userData;
  } else {
    console.error("Failed to fetch user profile:", await response.text());
    throw new Error('Failed to fetch user profile');
  }
}

function displayUsername(username) {
  const usernameSpan = document.getElementById('displayUsername');
  if (usernameSpan) {
    usernameSpan.textContent = username;
  }
}

function selectGameType(gameType) {
  selectedGameType = gameType;
  console.log(`Game type selected: ${gameType}`);
  const canvas = document.getElementById('gameCanvas');

  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }
  document.querySelector('.canvas').style.display = 'block';
  console.log('Canvas element found');

  ctx = canvas.getContext('2d');
}

function initializeStartButton() {
  const startButton = document.getElementById('startButton');
  if (startButton) {
    startButton.addEventListener('click', () => {
      if (selectedGameType) {
        startGame(selectedGameType);
      } else {
        alert('Please select a game type first.');
      }
    });
  } else {
    console.error('#startButton element not found');
  }
}

function startGame(gameType) {
  if (!ws) {
    const host = window.location.hostname;
    const wsUrl = `ws://${host}:8000/ws/pong/`;

    ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      console.log('WebSocket connection established');
      ws.send(JSON.stringify({ t: 'select_game_type', game_type: gameType, username: username }));

      switch (gameType) {
        case 'local_1v1':
          ws.send(JSON.stringify({ t: 'sg' }));
          break;
        case '1v1':
          ws.send(JSON.stringify({ t: 'join', player_id: localPlayerNumber }));
          break;
        default:
          console.error(`Unsupported game type: ${gameType}`);
          break;
      }
    };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received update:', data);

      if (data.rid !== undefined && requestTimestamps[data.rid]) {
        const latency = performance.now() - requestTimestamps[data.rid];
        roundTripTime = latency;
        delete requestTimestamps[data.rid];
        console.log(`Round-Trip Time (RTT): ${roundTripTime} ms`);
      }

      switch (data.type) {
        case 'countdown':
          countdownValue = data.value;
          draw();
          break;
        case 'update':
          countdownValue = null;
          updateGameState(data);
          break;
        case 'waiting_for_opponent':
          drawWaitingForOpponent();
          break;
        case 'ping':
          ws.send(JSON.stringify({ t: 'pong' }));
          break;
        case 'game_ready':
          console.log('Game is ready!');
          drawGameReady();
          updateLastMessage('Game is ready!');
          ws.send(JSON.stringify({ t: 'sg' }));
          break;
        case 'player_assignment':
            console.log(data.message);
            window.localPlayerNumber = data.player_num;
            updateLastMessage(`Player ${data.player_num}`);
            break;
        case 'player_disconnected':
          console.log('A player has disconnected.');
          updateLastMessage('A player has disconnected.');
          alert('A player has disconnected.');
          break;
        case 'start_game':
          console.log('Game has started!');
          countdownValue = null;
          draw();
          break;
        case 'game_over':
          console.log('Game over');
          updateLastMessage('Game over!');
          // alert('Game over!');
          break;
        case 'error':
          console.error('Error from server:', data.message);
          updateLastMessage(`Error: ${data.message}`);
          alert(`Error: ${data.message}`);
          break;
        case 'info':
          console.log(data.message);
          updateLastMessage(data.message);
          break;
        default:
          console.error(`Unsupported data type: ${data.type}`);
          updateLastMessage(`Received unsupported data type: ${data.type}`);
          break;
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    ws.onclose = (event) => {
      console.log('WebSocket closed:', event);
    };
  } else {
    gameOver = false;
    ws.send(JSON.stringify({ t: 'restart_game' }));
  }
}

function updateLastMessage(message) {
  const messageSpan = document.getElementById('displayMessage');
  if (messageSpan) {
    messageSpan.textContent = message;
  }
}

window.updateGameStateFromServer = function (data) {
  if (data.type === 'countdown') {
    countdownValue = data.value;
    draw();
  } else if (data.ball) {
    countdownValue = null;
    gameState = data;
    draw();
  } else {
    console.error('Invalid game state received:', data);
  }
};

function updateGameState(data) {
  if (typeof window.updateGameStateFromServer === 'function') {
    window.updateGameStateFromServer(data);
  }
}

window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'w', 's'].includes(event.key) && window.location.pathname === '/game') {
    event.preventDefault();
    keys[event.key] = true;
    updateSpeeds();
  }
});

window.addEventListener('keyup', (event) => {
  if (['ArrowUp', 'ArrowDown', 'w', 's'].includes(event.key) && window.location.pathname === '/game') {
    event.preventDefault();
    keys[event.key] = false;
    updateSpeeds();
  }
});

function updateSpeeds() {
  let newPlayerSpeed;
  if (selectedGameType === 'local_1v1') {
    const newPlayer1Speed = (keys['w'] ? -5 : 0) + (keys['s'] ? 5 : 0);
    const newPlayer2Speed = (keys['ArrowUp'] ? -5 : 0) + (keys['ArrowDown'] ? 5 : 0);

    if (ws && (newPlayer1Speed !== player1Speed || newPlayer2Speed !== player2Speed)) {
      player1Speed = newPlayer1Speed;
      player2Speed = newPlayer2Speed;
      const requestId = requestIdCounter++;
      requestTimestamps[requestId] = performance.now();
      ws.send(JSON.stringify({ t: 'pi', p1: player1Speed, p2: player2Speed, rid: requestId }));
    }
  } else if (selectedGameType === '1v1') {
    // Send speed updates based on the assigned player number
    newPlayerSpeed = (keys['w'] ? -5 : 0) + (keys['s'] ? 5 : 0);

    if (ws && newPlayerSpeed !== (window.localPlayerNumber === 1 ? player1Speed : player2Speed)) {
      const requestId = requestIdCounter++;
      requestTimestamps[requestId] = performance.now();
      // Send control inputs based on the player number
      const controlKey = window.localPlayerNumber === 1 ? 'p1' : 'p2';
      ws.send(JSON.stringify({
        t: 'pi',
        [controlKey]: newPlayerSpeed,
        rid: requestId
      }));
      if (window.localPlayerNumber === 1) {
        player1Speed = newPlayerSpeed;
      } else {
        player2Speed = newPlayerSpeed;
      }
    }
  }
}

function draw() {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'white';

  const scaleX = canvas.width / 640;
  const scaleY = canvas.height / 360;

  if (countdownValue !== null) {
    ctx.font = `${40 * scaleX}px 'Roboto', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`Game Start in ${countdownValue}`, canvas.width / 2, canvas.height / 2);
  } else if (gameState && gameState.ball) {
    drawMiddleLine(ctx, scaleX);
    ctx.beginPath();
    ctx.arc(gameState.ball.x * scaleX, gameState.ball.y * scaleY, 5 * scaleX, 0, Math.PI * 2);
    ctx.fill();

    const isPlayerOne = window.localPlayerNumber === 1;
    const playerPaddle = isPlayerOne ? gameState.p1 : gameState.p2;
    const opponentPaddle = isPlayerOne ? gameState.p2 : gameState.p1;

    ctx.fillRect(5 * scaleX, playerPaddle.y * scaleY, 10 * scaleX, 70 * scaleY);
    ctx.fillRect(canvas.width - 15 * scaleX, opponentPaddle.y * scaleY, 10 * scaleX, 70 * scaleY);

    ctx.font = `${20 * scaleX}px 'Roboto', sans-serif`;
    ctx.fillText(gameState.s1, 30 * scaleX, 30 * scaleY);
    ctx.fillText(gameState.s2, canvas.width - 30 * scaleX, 30 * scaleY);
    ctx.font = `${12 * scaleX}px 'Roboto', sans-serif`;
    ctx.fillText(`Delta: ${roundTripTime.toFixed(0)} ms`, canvas.width - 100 * scaleX, canvas.height - 10 * scaleY);
  } else {
    ctx.font = `${20 * scaleX}px 'Roboto', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Waiting for Server response ...', canvas.width / 2, canvas.height / 2);
  }
}

function drawMiddleLine(ctx, scaleX) {
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2 * scaleX;
  ctx.beginPath();
  ctx.moveTo(ctx.canvas.width / 2, 0);
  ctx.lineTo(ctx.canvas.width / 2, ctx.canvas.height);
  ctx.stroke();
}

function drawWaitingForOpponent() {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) {
      console.error('Canvas element not found!');
      return;
  }
  
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'white';
  ctx.font = '20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Waiting for opponent...', canvas.width / 2, canvas.height / 2);
}

function drawGameReady() {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) {
      console.error('Canvas element not found!');
      return;
  }

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'white';
  ctx.font = '20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Game is ready! You are Player ${window.localPlayerNumber}`, canvas.width / 2, canvas.height / 2);
}

window.updateGameStateFromServer = function (data) {
  if (data.type === 'countdown') {
    countdownValue = data.value;
    draw();
  } else if (data.ball) {
    countdownValue = null;
    gameState = data;
    draw();
  } else {
    console.error('Invalid game state received:', data);
  }
};
