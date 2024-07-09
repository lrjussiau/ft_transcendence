
//--------------------------- INIT ------------------------------//

async function fetchUserProfile() {
  const token = localStorage.getItem('authToken');
  const response = await fetch('/api/authentication/user/profile/', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (response.ok) {
    const data = await response.json();
    //console.log('Fetched user profile:', data);
    return data;
  } else {
    throw new Error('Failed to fetch user profile');
  }
}

async function launchGame() {
  initializeStartButton();
  userData = await fetchUserProfile(); 
  console.log('User name: ', userData.username);
  displayUsername(userData.username);
}

//------------------------- DEFINES ----------------------------//

let playerReadySent = false;
let ctx = null;
let username = '';
let countdownValue = null;
let latestGameState = null;
let selectedGameType = null;
let go_next_round = false;
let userData = null;
let player1Speed = 0;
let player2Speed = 0;
let roundTripTime = 0;
let requestIdCounter = 0;
let gameOver = false;
const playerNum = 1;
const keys = {};
let gameState = {};
const requestTimestamps = {};

//--------------- WEBSOCKET & GAME MANAGEMENT  ------------------//


async function startGame(gameType) {
  try {
      const userData = await fetchUserProfile();
      const username = userData.username;
      selectedGameType = gameType;

      const checkCanvasInterval = setInterval(() => {
          const canvas = document.getElementById('gameCanvas');
          //console.log('Checking for canvas element...');
          if (canvas) {
              clearInterval(checkCanvasInterval);

              console.log('Canvas element found');
              document.querySelector('.canvas').style.display = 'block';

              ctx = canvas.getContext('2d');

              ws = WebSocketManager.getWebSocket();

              ws.onmessage = (event) => {
                  const data = JSON.parse(event.data);
                  console.log('Received message:', data);

                  switch (data.type) {
                      case 'connection_established':
                          connection(gameType);
                          break;
                      case 'countdown':
                          countdown(data.value);
                          break;
                      case 'update':
                          countdownValue = null;
                          updateGameState(data);
                          break;
                      case 'player_assignment':
                          assignPlayer(data);
                          break;
                      case 'display':
                          drawMessage(data.message);
                          break;
                      case 'end_game':
                          console.log('Game ended Triggered');
                          handleEndGame();
                          break;
                      case 'round_ended':
                          console.log('Round ended Triggered');
                          navigateToBracketView(data.tournament_details);
                          break;
                      default:
                          console.error(`Unsupported data type: ${data.type}`);
                          break;
                  }
              };

              // Send the initial connection message
              if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                      type: gameType,
                      action: 'Connect',
                      user: { username: username }
                  }));
              } else {
                  ws.addEventListener('open', () => {
                      ws.send(JSON.stringify({
                          type: gameType,
                          action: 'Connect',
                          user: { username: username }
                      }));
                  });
              }
          } else {
              console.log('Waiting for canvas element...');
          }
      }, 100);
  } catch (error) {
      console.error('Error starting game:', error);
  }
}

function sendPlayerReady() {
  if (playerReadySent) {
    console.log('Player ready already sent.');
    return;
  }

  window.history.pushState({}, '', '/canvas');
  handleRoute('canvas');

  const checkCanvasInterval = setInterval(() => {
    const canvas = document.getElementById('gameCanvas');

    if (canvas) {
      clearInterval(checkCanvasInterval);
      if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
              action: 'player_ready',
              is_ready: true
          }));
          console.log('Player ready message sent.');
          playerReadySent = true;
          document.getElementById('readyButton').disabled = true;
      } else {
          console.log('WebSocket connection is not open.');
      }
    }
  }, 100);
}

//-------------------- RESPONSE LOGIC ----------------------//

function connection(gameType) {
  console.log('Connection established:', gameType);
  const ws = WebSocketManager.getWebSocket();
  ws.send(JSON.stringify({
    type: gameType,
    action: 'StartGame',
  }));
}

function countdown(value) {
  countdownValue = value;
  draw();
}

function stopGame() {
  gameOver = false;
  countdownValue = null;
  playerReadySent = false;
}

function assignPlayer(data) {
  console.log(data.message);
  window.localPlayerNumber = data.player_num;
}

function drawMessage(message) {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }
  const aspectRatio = 640 / 360;
  const containerWidth = canvas.parentElement.clientWidth;
  const width = (containerWidth * 98) / 100;
  const height = width / aspectRatio;

  canvas.width = Math.floor(width);
  canvas.height = Math.floor(height);

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'white';

  const scaleX = canvas.width / 640;
  const scaleY = canvas.height / 360;

  ctx.font = `${32 * scaleY}px 'Roboto', sans-serif`;
  ctx.textAlign = 'center';

  console.log('Drawing message:', message);
  ctx.fillText(`${message}`, canvas.width / 2, canvas.height / 2);
}

function handleEndGame(data) {
  stopGame();
  window.history.pushState({}, '', '/game');
  handleRoute('game');
}

function navigateToBracketView(tournamentDetails) {
  console.log('Round ended');
  go_next_round = true;
  window.history.pushState({}, '', '/bracket');
  handleRoute('bracket');
}

function updateGameState(data) {
  if (data.type === 'update') {
      gameState = data;
      // Update scores in HTML
    const scoreElements = document.querySelectorAll('.player-score');
    if (scoreElements.length >= 2) {
        scoreElements[0].textContent = data.s1;
        scoreElements[1].textContent = data.s2;
    }
      draw();
    }
  if (data.type === 'game_start') {
    //console.log('Game starting');
    countdownValue = null;
    gameState = data.initial_state;
    draw();
    if (data.type === 'countdown') {
        countdownValue = data.value;
        console.log('Countdown value:', countdownValue);
        draw();
        
      if (countdownValue === 0) {
        console.log('Countdown finished, waiting for game start');
        countdownValue = null;
        draw();
      }
    } 
  }
}

//-------------------- INPUT HANDLING ---------------------//

window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'w', 's'].includes(event.key) && window.location.pathname === '/canvas') {
    event.preventDefault();
    keys[event.key] = true;
    updateSpeeds();
  }
});

window.addEventListener('keyup', (event) => {
  if (['ArrowUp', 'ArrowDown', 'w', 's'].includes(event.key) && window.location.pathname === '/canvas') {
    event.preventDefault();
    keys[event.key] = false;
    updateSpeeds();
  }
});

function updateSpeeds() {
  const ws = WebSocketManager.getWebSocket();
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.log('WebSocket is not open. Cannot send player input.');
    return;
  }
  if (selectedGameType === 'local_1v1') {
    const newPlayer1Speed = (keys['w'] ? -5 : 0) + (keys['s'] ? 5 : 0);
    const newPlayer2Speed = (keys['ArrowUp'] ? -5 : 0) + (keys['ArrowDown'] ? 5 : 0);

    if (ws && (newPlayer1Speed !== player1Speed || newPlayer2Speed !== player2Speed)) {
      player1Speed = newPlayer1Speed;
      player2Speed = newPlayer2Speed;
      const requestId = requestIdCounter++;
      requestTimestamps[requestId] = performance.now();
      console.log('Sending message:', JSON.stringify({ action: 'PlayerInput', p1: player1Speed, p2: player2Speed, rid: requestId }));
      ws.send(JSON.stringify({ 
        action: 'PlayerInput', 
        p1: player1Speed, 
        p2: player2Speed, 
        rid: requestId 
      }));
    }
  } else {
    const newPlayerSpeed = (keys['w'] ? -5 : 0) + (keys['s'] ? 5 : 0);
  
    if (ws && newPlayerSpeed !== (window.localPlayerNumber === 1 ? player1Speed : player2Speed)) {
      const requestId = requestIdCounter++;
      requestTimestamps[requestId] = performance.now();
  
      if (window.localPlayerNumber === 1) {
        player1Speed = newPlayerSpeed;
      } else {
        player2Speed = newPlayerSpeed;
      }
      ws.send(JSON.stringify({
        action: 'PlayerInput',
        player_num: window.localPlayerNumber,
        speed: newPlayerSpeed,
        rid: requestId
      }));
    }
  }
}
//--------------------- DRAW HANDLING ----------------------//

function draw() {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }

  const aspectRatio = 640 / 360;
  const containerWidth = canvas.parentElement.clientWidth;
  const width = (containerWidth * 98) / 100;
  const height = width / aspectRatio;

  canvas.width = Math.floor(width);
  canvas.height = Math.floor(height);

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'white';

  const scaleX = canvas.width / 640;
  const scaleY = canvas.height / 360;

  if (countdownValue !== null) {
    ctx.font = `${40 * scaleY}px 'Roboto', sans-serif`;
    ctx.textAlign = 'center';
      if (countdownValue > 0) {
        ctx.fillText(`Game Start in ${countdownValue}`, canvas.width / 2, canvas.height / 2);
      } else {
        ctx.fillText(`Game Starting!`, canvas.width / 2, canvas.height / 2);
      }
  } else if (gameState && gameState.ball) {
    drawMiddleLine(ctx, scaleX);

    drawBall(ctx, gameState.ball.x, gameState.ball.y, scaleX, scaleY);
    ctx.fillRect(5 * scaleX, gameState.p1.y * scaleY, 10 * scaleX, 70 * scaleY); // Always left
    ctx.fillRect(canvas.width - 15 * scaleX, gameState.p2.y * scaleY, 10 * scaleX, 70 * scaleY); // Always right

  }  else {
    ctx.font = `${20 * scaleY}px 'Roboto', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Waiting for game to start...', canvas.width / 2, canvas.height / 2);
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
