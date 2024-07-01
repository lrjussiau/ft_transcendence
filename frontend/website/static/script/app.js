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
  if (!token) {
    console.error('No token available, redirecting...');
    // window.location.replace('/login');
    return;
  }

  const response = await fetch('/api/authentication/user/profile/', {
      headers: { 'Authorization': `Bearer ${token}` }
  });

  if (response.ok) {
      const data = await response.json();
      document.getElementById('displayUsername').textContent = data.username;
      username = data.username;
      if (!ws || ws.readyState === WebSocket.CLOSED) {
        initializeWebSocket();
      }
  } else {
      throw new Error('Failed to fetch user profile');
  }
}

function initializeWebSocket() {
  if (ws) ws.close();
  const host = window.location.hostname;
  const wsUrl = `ws://${host}:8000/ws/pong/`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('WebSocket connection established');
    if (selectedGameType && username) {
      ws.send(JSON.stringify({ t: 'select_game_type', game_type: selectedGameType, username: username }));
    }
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Received update:', data);
    handleWebSocketMessages(data);
  };

  ws.onerror = (error) => console.error('WebSocket error:', error);
  ws.onclose = (event) => console.log('WebSocket closed:', event);
}

function selectGameType(gameType) {
  selectedGameType = gameType;
  console.log(`Game type selected: ${gameType}`);
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }
  canvas.style.display = 'block';
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
    initializeWebSocket();
  }

  ws.onopen = async () => {
    console.log('WebSocket connection established');
    ws.send(JSON.stringify({ t: 'select_game_type', game_type: gameType, username: username }));
  };

  gameOver = false;
}

function handleWebSocketMessages(data) {
  if (data.rid && requestTimestamps[data.rid]) {
    const latency = performance.now() - requestTimestamps[data.rid];
    roundTripTime = latency;
    delete requestTimestamps[data.rid];
  }

  switch (data.type) {
    case 'countdown':
      countdownValue = data.value;
      draw();
      break;
    case 'update':
      gameState = data;
      draw();
      break;
    case 'game_ready':
      document.getElementById('displayPlayerNum').textContent = data.player_num;
      document.getElementById('displayOpponent').textContent = data.opponent;
      break;
    case 'error':
      console.error('Error:', data.message);
      break;
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
  }
}

function draw() {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }

  const scaleX = canvas.width / 640;
  const scaleY = canvas.height / 360;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'white';
  if (countdownValue !== null) {
    ctx.font = '40px Roboto';
    ctx.textAlign = 'center';
    ctx.fillText(`Game starts in ${countdownValue}`, canvas.width / 2, canvas.height / 2);
  } else if (gameState && gameState.ball) {
    let { ball, p1, p2, s1, s2 } = gameState;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillRect(5, p1.y, 10, 70); // Player 1 paddle
    ctx.fillRect(635, p2.y, 10, 70); // Player 2 paddle
    ctx.font = '16px Roboto';
    ctx.fillText(`${username} ${s1}`, 30, 30);
    ctx.fillText(`${opponentName} ${s2}`, 610, 30);
    drawMiddleLine(ctx, scaleX);
  } else {
    ctx.font = '20px Roboto';
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

function initializeKeyboardControls() {
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
}

function updateSpeeds() {
  if (!gameState.gs) return;

  if (selectedGameType === 'local_1v1') {
    const newPlayer1Speed = (keys['s'] ? 5 : 0) + (keys['w'] ? -5 : 0);
    const newPlayer2Speed = (keys['ArrowDown'] ? 5 : 0) + (keys['ArrowUp'] ? -5 : 0);

    if (ws && (newPlayer1Speed !== player1Speed || newPlayer2Speed !== player2Speed)) {
      player1Speed = newPlayer1Speed;
      player2Speed = newPlayer2Speed;
      const requestId = requestIdCounter++;
      requestTimestamps[requestId] = performance.now();
      ws.send(JSON.stringify({ t: 'pi', username: username, p1: player1Speed, p2: player2Speed, rid: requestId }));
    }
  } else if (selectedGameType === '1v1') {
    const newPlayerSpeed = (keys['s'] ? 5 : 0) + (keys['w'] ? -5 : 0);

    if (ws && newPlayerSpeed !== player1Speed) {
      const requestId = requestIdCounter++;
      requestTimestamps[requestId] = performance.now();
      player1Speed = newPlayerSpeed;
      ws.send(JSON.stringify({ t: 'pi', username: username, speed: newPlayerSpeed, player_num: playerNum, rid: requestId }));
    }
  }
}
