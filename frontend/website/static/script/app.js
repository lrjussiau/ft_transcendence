// utils.js

let selectedGameType = null;
let username = '';
let countdownValue = null;
let ws = null;
let player1Speed = 0;
let player2Speed = 0;
let requestIdCounter = 0;
let roundTripTime = 0;
let gameOver = false;
let gameState = {};
let ctx = null;
const keys = {};
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
          ws.send(JSON.stringify({ t: 'join', player_id: 'player1' }));
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
          break;
        case 'player_disconnected':
          console.log('A player has disconnected.');
          updateLastMessage('A player has disconnected.');
          alert('A player has disconnected.');
          break;
        case 'game_over':
          console.log('Game over');
          updateLastMessage('Game over!');
          alert('Game over!');
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
  let newSpeed = 0;

  if (selectedGameType === 'local_1v1') {
    const newPlayer1Speed = (keys['s'] ? 5 : 0) + (keys['w'] ? -5 : 0);
    const newPlayer2Speed = (keys['ArrowDown'] ? 5 : 0) + (keys['ArrowUp'] ? -5 : 0);

    if (ws && (newPlayer1Speed !== player1Speed || newPlayer2Speed !== player2Speed)) {
      player1Speed = newPlayer1Speed;
      player2Speed = newPlayer2Speed;
      const requestId = requestIdCounter++;
      requestTimestamps[requestId] = performance.now();
      ws.send(JSON.stringify({ t: 'pi', p1: player1Speed, p2: player2Speed, rid: requestId }));
    }
  } else if (selectedGameType === '1v1') {
    // Determine which keys to use based on the player number
    const upKey = gameState.p1.username === username ? 'w' : 'ArrowUp';
    const downKey = gameState.p1.username === username ? 's' : 'ArrowDown';

    newSpeed = (keys['s'] ? 5 : 0) + (keys['w'] ? -5 : 0);

    if (ws && newSpeed !== (gameState.p1.username === username ? player1Speed : player2Speed)) {
      const playerNum = gameState.p1.username === username ? 1 : 2;
      const requestId = requestIdCounter++;
      requestTimestamps[requestId] = performance.now();
      console.log(`Sending player input: ${JSON.stringify({ t: 'pi', player_num: playerNumber, speed: playerSpeed })}`);
      ws.send(JSON.stringify({ t: 'pi', player_num: playerNumber, speed: playerSpeed }));

      if (playerNum === 1) {
        player1Speed = newSpeed;
      } else {
        player2Speed = newSpeed;
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

  // Draw elements based on game state and game type
  if (countdownValue !== null) {
    // Draw countdown
    ctx.font = `${40 * scaleX}px 'Roboto', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`Game Start in ${countdownValue}`, canvas.width / 2, canvas.height / 2);
  } else if (gameState && gameState.ball) {

    // Draw middle line
    drawMiddleLine(ctx, scaleX);

    // Draw ball
    ctx.beginPath();
    ctx.arc(gameState.ball.x * scaleX, gameState.ball.y * scaleY, 5 * scaleX, 0, Math.PI * 2);
    ctx.fill();

    // Conditionally draw paddles based on the player's perspective in 1v1
    if (selectedGameType === '1v1') {
      const isPlayerOne = username === gameState.p1.username;  // Assuming username is set to the player's username

      // Draw player's own paddle on the left if Player 1, otherwise on the right
      if (isPlayerOne) {
        ctx.fillRect(5 * scaleX, gameState.p1.y * scaleY, 10 * scaleX, 70 * scaleY);
        ctx.fillRect(canvas.width - 15 * scaleX, gameState.p2.y * scaleY, 10 * scaleX, 70 * scaleY);
      } else {
        ctx.fillRect(5 * scaleX, gameState.p2.y * scaleY, 10 * scaleX, 70 * scaleY);
        ctx.fillRect(canvas.width - 15 * scaleX, gameState.p1.y * scaleY, 10 * scaleX, 70 * scaleY);
      }
    } else if (selectedGameType === 'local_1v1') {
      // In local 1v1, always draw player1 on left and player2 on right
      ctx.fillRect(5 * scaleX, gameState.p1.y * scaleY, 10 * scaleX, 70 * scaleY);
      ctx.fillRect(canvas.width - 15 * scaleX, gameState.p2.y * scaleY, 10 * scaleX, 70 * scaleY);
    }

    // Draw scores and RTT (Round-Trip Time)
    ctx.font = `${20 * scaleX}px 'Roboto', sans-serif`;
    ctx.fillText(gameState.s1, 30 * scaleX, 30 * scaleY);  // Score for player 1
    ctx.fillText(gameState.s2, canvas.width - 30 * scaleX, 30 * scaleY);  // Score for player 2
    ctx.font = `${12 * scaleX}px 'Roboto', sans-serif`;
    ctx.fillText(`Delta: ${roundTripTime.toFixed(0)} ms`, canvas.width - 100 * scaleX, canvas.height - 10 * scaleY);
  } else {
    // Waiting for server response
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
  ctx.fillText('Game is ready! Starting now...', canvas.width / 2, canvas.height / 2);
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
