// utils.js
// App.js

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
    console.log('Fetched user profile:', data);
    return data;
  } else {
    throw new Error('Failed to fetch user profile');
  }
}


//------------------------- DEFINES ----------------------------//

let ws = null;
let ctx = null;
let username = '';
let countdownValue = null;
let latestGameState = null;
let selectedGameType = null;
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

async function launchGame() {
  initializeStartButton();
  userData = await fetchUserProfile(); 
  console.log('User name: ', userData.username);
  displayUsername(userData.username);
}

//--------------- WEBSOCKET & GAME MANAGEMENT  ------------------//



async function startGame(gameType) {
  // First, ensure any existing game is stopped
  if (ws) {
      stopGame();
  }

  try {
      const userData = await fetchUserProfile();
      const username = userData.username;
      selectedGameType = gameType;

      // Wait for the canvas element to be available
      const checkCanvasInterval = setInterval(() => {
          const canvas = document.getElementById('gameCanvas');
          console.log('Checking for canvas element...');
          if (canvas) {
              clearInterval(checkCanvasInterval);
              
              console.log('Canvas element found');
              document.querySelector('.canvas').style.display = 'block';
              
              ctx = canvas.getContext('2d');
              
              const host = window.location.hostname;
              const wsUrl = `wss://${host}:4443/ws/pong/`;

              ws = new WebSocket(wsUrl);
              ws.onopen = () => {
                  console.log('WebSocket connection established');
                  ws.send(JSON.stringify({ t: 'select_game_type', game_type: gameType, username: username }));
                  attributePlayer(gameType);
                  switch (gameType) {
                      case 'local_1v1':
                          ws.send(JSON.stringify({ t: 'sg' }));
                          break;
                      case '1v1':
                          ws.send(JSON.stringify({ t: 'sg' }));
                          break;
                      case 'solo':
                          ws.send(JSON.stringify({ t: 'sg' }));
                          break;
                      default:
                          console.error(`Unsupported game type: ${gameType}`);
                          break;
                  }
              };
              ws.onmessage = (event) => {
                  const data = JSON.parse(event.data);
                  // console.log('Received update:', data);

                  if (data.rid !== undefined && requestTimestamps[data.rid]) {
                      const latency = performance.now() - requestTimestamps[data.rid];
                      roundTripTime = latency;
                      delete requestTimestamps[data.rid];
                      console.log(`Round-Trip Time (RTT): ${roundTripTime} ms`);
                  }
                  console.log('Received message:', data.type);
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
                        console.log('app.js: stopGame() 141');
                        stopGame();
                        break;
                      case 'start_game':
                        console.log('Game has started!');
                        countdownValue = null;
                        draw();
                        break;
                      case 'game_over':
                        console.log('Game over');
                        updateLastMessage('Game over!');
                        handleGameOver(data.winner);
                        break;
                      case 'error':
                        console.error('Error from server:', data.message);
                        updateLastMessage(`Error: ${data.message}`);
                        alert(`Error: ${data.message}`);
                        break;
                      case 'info':
                          console.log(data.message);
                          updateLastMessage(data.message);;
                            if (data.message.includes('Tournament created')) {
                              console.log('Tournament created. Waiting for players to join...');}
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
                if (!gameOver) {
                    console.log('Unexpected WebSocket closure. Attempting to reconnect...');
                    setTimeout(() => startGame(selectedGameType), 3000);  // Try to reconnect after 3 seconds
                }
            };
          } else {
              console.log('Waiting for canvas element...');
          }
      }, 100); // Check every 100ms
  } catch (error) {
      console.error('Error starting game:', error);
      updateLastMessage(`Error starting game: ${error.message}`);
  }
}

function stopGame() {
  gameOver = true;
  if (ws) {
      ws.send(JSON.stringify({ t: 'stop_game' }));
      ws.send(JSON.stringify({ t: 'disconnect' }));
      ws.close();
      ws = null;
  }
  updateLastMessage('Game stopped.');
  // Reset game state
  gameState = {};
  countdownValue = null;
  selectedGameType = null;
  player1Speed = 0;
  player2Speed = 0;
}

function updateLastMessage(message) {
  const messageSpan = document.getElementById('displayMessage');
  if (messageSpan) {
    messageSpan.textContent = message;
  }
}

function handleGameOver(winner) {
  const messageElement = document.getElementById('displayMessage');
  const gameOverElement = document.getElementById('game-over-message');
  if (messageElement && gameOverElement) {
    const finalScore = `${gameState.s1} - ${gameState.s2}`;
    if (winner !== 'undefined') {
      messageElement.textContent = `Game Finished! ${winner} wins! Final score: ${finalScore}`;
    } else {
      messageElement.textContent = `Game Finished! Final score: ${finalScore}`;
    }
    gameOverElement.style.display = 'block';

    // Hide the canvas
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
      canvas.style.display = 'none';
    }

    // Stop the game and close the WebSocket connection
    stopGame();
    console.log('Stop_game handleGameOver'); 

    // Navigate back to /game after 4 seconds
    setTimeout(() => {
      window.history.pushState({}, '', '/game');
      handleRoute('game');
    }, 4000);
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
  if (data.type === 'update') {
    gameState = data;
    
    // Update scores in HTML
    const scoreElements = document.querySelectorAll('.player-score');
    if (scoreElements.length >= 2) {
      scoreElements[0].textContent = data.s1;
      scoreElements[1].textContent = data.s2;
    }

    // Check for game over condition
    if (data.s1 === 5 || data.s2 === 5) {
      const winner = data.s1 === 5 ? 'Player 1' : 'Player 2';
      handleGameOver(winner);
    } else {
      draw();
    }
  } else if (data.type === 'countdown') {
    countdownValue = data.value;
    console.log('Countdown value:', countdownValue);
    draw();
    
    if (countdownValue === 0) {
      console.log('Countdown finished, waiting for game start');
      countdownValue = null;
      draw();
    }
  } else if (data.type === 'game_start') {
    console.log('Game starting');
    countdownValue = null;
    gameState = data.initial_state;
    draw();
  } else if (data.type === 'game_over') {
    handleGameOver(data.winner);
  } else if (data.type === 'tournament_update') {
    updateTournamentStatus(data);
  } else if (data.type === 'tournament_match_start') {
    startMatch(data);
  } else {
    console.error('Invalid game state received:', data);
  }
}
//-------------------------- INPUT HANDLING ---------------------//

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
  let newPlayerSpeed;
  console.log('Selected game type:', selectedGameType);
  if (selectedGameType === 'local_1v1') {
    const newPlayer1Speed = (keys['w'] ? -5 : 0) + (keys['s'] ? 5 : 0);
    const newPlayer2Speed = (keys['ArrowUp'] ? -5 : 0) + (keys['ArrowDown'] ? 5 : 0);

    console.log("Web socket :", ws, "player1Speed :", player1Speed, "player2Speed :", player2Speed, "newPlayer1Speed :", newPlayer1Speed, "newPlayer2Speed :", newPlayer2Speed);
    if (ws && (newPlayer1Speed !== player1Speed || newPlayer2Speed !== player2Speed)) {
      player1Speed = newPlayer1Speed;
      player2Speed = newPlayer2Speed;
      const requestId = requestIdCounter++;
      requestTimestamps[requestId] = performance.now();
      console.log('Sending message:', JSON.stringify({ t: 'pi', p1: player1Speed, p2: player2Speed, rid: requestId }));
      ws.send(JSON.stringify({ t: 'pi', p1: player1Speed, p2: player2Speed, rid: requestId }));
    }
  } else {
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
}

//-------------------------- DRAW HANDLING ----------------------//

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