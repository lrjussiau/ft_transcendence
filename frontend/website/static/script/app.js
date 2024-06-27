// utils.js
async function fetchUserProfile() {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/authentication/user/profile/', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.ok) {
        return response.json();
    } else {
        throw new Error('Failed to fetch user profile');
    }
}


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
    ws = new WebSocket('ws://localhost:8000/ws/pong/');
    ws.onopen = () => {
      console.log('WebSocket connection established');
      ws.send(JSON.stringify({ t: 'select_game_type', game_type: gameType, username: username }));
      if (gameType === 'local_1v1') {
        ws.send(JSON.stringify({ t: 'sg' }));
      } else if (gameType === '1v1') {
        ws.send(JSON.stringify({ t: 'join', player_id: 'player1' }));
      } else if(gameType === 'solo'){
        ws.send(JSON.stringify({ t: 'solo'}));
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

      if (data.type === 'countdown') {
        countdownValue = data.value;
        draw();
      } else if (data.ball) {
        countdownValue = null;
        updateGameState(data);
      } else if (data.t === 'waiting_for_opponent') {
        drawWaitingForOpponent();
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
    ctx.beginPath();
    ctx.arc(gameState.ball.x * scaleX, gameState.ball.y * scaleY, 5 * scaleX, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillRect(canvas.width - 15 * scaleX, gameState.p1.y * scaleY, 10 * scaleX, 70 * scaleY);
    ctx.fillRect(5 * scaleX, gameState.p2.y * scaleY, 10 * scaleX, 70 * scaleY);

    ctx.font = `${16 * scaleX}px 'Roboto', sans-serif`;
    ctx.fillText(`Delta: ${roundTripTime.toFixed(0)} ms`, canvas.width - 30 * scaleX, canvas.height - 10 * scaleY);

    // Draw the username and score at the top left
    ctx.font = `${20 * scaleX}px 'Roboto', sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`${username} ${gameState.s1}`, 30 * scaleX, 30 * scaleY);

    // Draw Kaaris and score at the top right
    ctx.textAlign = 'right';
    ctx.fillText(`Kaaris ${gameState.s2}`, canvas.width - 30 * scaleX, 30 * scaleY);

    drawMiddleLine(ctx, scaleX);
  } else {
    ctx.font = `${20 * scaleX}px 'Roboto', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Waiting for Server response ...', canvas.width / 2, canvas.height / 2);
  }
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

  const scaleX = canvas.width / 640;
  const scaleY = canvas.height / 360;

  ctx.font = `${40 * scaleX}px 'Roboto', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('Waiting for an opponent', canvas.width / 2, canvas.height / 2);
}

function drawMiddleLine(ctx, scaleX) {
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2 * scaleX;
  ctx.beginPath();
  ctx.moveTo(ctx.canvas.width / 2, 0);
  ctx.lineTo(ctx.canvas.width / 2, ctx.canvas.height);
  ctx.stroke();
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
  const newPlayer1Speed = (keys['ArrowDown'] ? 5 : 0) + (keys['ArrowUp'] ? -5 : 0);
  const newPlayer2Speed = (keys['s'] ? 5 : 0) + (keys['w'] ? -5 : 0);

  if (ws && (newPlayer1Speed !== player1Speed || newPlayer2Speed !== player2Speed)) {
    player1Speed = newPlayer1Speed;
    player2Speed = newPlayer2Speed;
    const requestId = requestIdCounter++;
    requestTimestamps[requestId] = performance.now();
    ws.send(JSON.stringify({ t: 'pi', p1: player1Speed, p2: player2Speed, rid: requestId }));
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
      // Draw countdown
      ctx.font = `${40 * scaleX}px 'Roboto', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`Game Start in ${countdownValue}`, canvas.width / 2, canvas.height / 2);
  } else if (gameState && gameState.ball) {
      // Draw ball
      ctx.beginPath();
      ctx.arc(gameState.ball.x * scaleX, gameState.ball.y * scaleY, 5 * scaleX, 0, Math.PI * 2);
      ctx.fill();

      // Draw paddles
      ctx.fillRect(canvas.width - 15 * scaleX, gameState.p1.y * scaleY, 10 * scaleX, 70 * scaleY); // player1
      ctx.fillRect(5 * scaleX, gameState.p2.y * scaleY, 10 * scaleX, 70 * scaleY); // player2

      // Draw scores
      ctx.font = `${20 * scaleX}px 'Roboto', sans-serif`;
      ctx.fillText(gameState.s1, canvas.width - 50 * scaleX, 30 * scaleY);
      ctx.fillText(gameState.s2, 30 * scaleX, 30 * scaleY);

      // Draw round trip time (delta) in the bottom right corner
      ctx.font = `${12 * scaleX}px 'Roboto', sans-serif`;
      ctx.fillText(`Delta: ${roundTripTime.toFixed(0)} ms`, canvas.width - 100 * scaleX, canvas.height - 10 * scaleY);

      // Draw the middle line
      drawMiddleLine(ctx, scaleX);
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

window.updateGameStateFromServer = function(data) {
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
