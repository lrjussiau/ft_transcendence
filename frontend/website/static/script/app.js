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
    username = userData.username
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
    newPlayerSpeed = (keys['w'] ? -5 : 0) + (keys['s'] ? 5 : 0);

    if (ws && newPlayerSpeed !== (window.localPlayerNumber === 1 ? player1Speed : player2Speed)) {
      const requestId = requestIdCounter++;
      requestTimestamps[requestId] = performance.now();
     
      if (window.localPlayerNumber === 1) {
        player1Speed = newPlayerSpeed;
      } else {
        player2Speed = newPlayerSpeed;
      }
      ws.send(JSON.stringify({
        t: 'pi',
        player_num: window.localPlayerNumber,
        speed: newPlayerSpeed,
        rid: requestId
      }));
    }
  }
  // console.log(`${username} is ${window.localPlayerNumber}`);
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

    // Check if it is local or online game to determine ball and paddle positions
    if (selectedGameType === 'local_1v1') {
      // Local game, fixed positions
      drawBall(ctx, gameState.ball.x, gameState.ball.y, scaleX, scaleY);
      ctx.fillRect(5 * scaleX, gameState.p1.y * scaleY, 10 * scaleX, 70 * scaleY); // Always left
      ctx.fillRect(canvas.width - 15 * scaleX, gameState.p2.y * scaleY, 10 * scaleX, 70 * scaleY); // Always right
    } else if (selectedGameType === '1v1') {
      // Online game, dynamic positions based on player number
      const isPlayerOne = window.localPlayerNumber === 1;
      const playerPaddle = isPlayerOne ? gameState.p1 : gameState.p2;
      const opponentPaddle = isPlayerOne ? gameState.p2 : gameState.p1;

      if (isPlayerOne) {
        // Player 1's perspective
        drawBall(ctx, gameState.ball.x, gameState.ball.y, scaleX, scaleY);
        ctx.fillRect(5 * scaleX, playerPaddle.y * scaleY, 10 * scaleX, 70 * scaleY); // Player's paddle on the left
        ctx.fillRect(canvas.width - 15 * scaleX, opponentPaddle.y * scaleY, 10 * scaleX, 70 * scaleY); // Opponent's paddle on the right
      } else {
        // Player 2's perspective
        drawBall(ctx, 640 - gameState.ball.x, 360 - gameState.ball.y, scaleX, scaleY); // Invert ball position
        ctx.fillRect(5 * scaleX, opponentPaddle.y * scaleY, 10 * scaleX, 70 * scaleY); // Opponent's paddle on the left
        ctx.fillRect(canvas.width - 15 * scaleX, playerPaddle.y * scaleY, 10 * scaleX, 70 * scaleY); // Player's paddle on the right
      }
    }

    ctx.font = `${20 * scaleX}px 'Roboto', sans-serif`;
    ctx.fillText(gameState.s1, 30 * scaleX, 30 * scaleY); // Always player 1 score on the left
    ctx.fillText(gameState.s2, canvas.width - 30 * scaleX, 30 * scaleY); // Always player 2 score on the right

    ctx.font = `${12 * scaleX}px 'Roboto', sans-serif`;
    ctx.fillText(`Delta: ${roundTripTime.toFixed(0)} ms`, canvas.width - 100 * scaleX, canvas.height - 10 * scaleY);
  } else {
    ctx.font = `${20 * scaleX}px 'Roboto', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Waiting for Server response ...', canvas.width / 2, canvas.height / 2);
  }
}

function drawMiddleLine(ctx, scaleX) {
  ctx.beginPath();
  ctx.setLineDash([5, 15]);
  ctx.moveTo(ctx.canvas.width / 2, 0);
  ctx.lineTo(ctx.canvas.width / 2, ctx.canvas.height);
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2 * scaleX;
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawBall(ctx, x, y, scaleX, scaleY) {
  ctx.beginPath();
  ctx.arc(x * scaleX, y * scaleY, 5 * scaleX, 0, Math.PI * 2);
  ctx.fill();
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
