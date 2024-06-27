// app.js

let selectedGameType = null;
let ws = null;
let player1Speed = 0;
let player2Speed = 0;
const keys = {};
let requestIdCounter = 0;
const requestTimestamps = {};
let roundTripTime = 0;
let gameOver = false;

function selectGameType(gameType) {
  selectedGameType = gameType;
  console.log(`Game type selected: ${gameType}`);
  loadPongCliScript();
  document.querySelector('.canvas').style.display = 'block';
}

function startGame() {
  if (!ws) {
    ws = new WebSocket('ws://localhost:8000/ws/pong/');
    ws.onopen = () => {
      console.log('WebSocket connection established');
      ws.send(JSON.stringify({ t: 'select_game_type', game_type: selectedGameType }));
      ws.send(JSON.stringify({ t: 'sg' }));
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

      if (data.ball) {
        // Handle game state updates
        updateGameState(data);
      }
    };
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    ws.onclose = (event) => {
      console.log('WebSocket closed:', event);
    };
  } else {
    // Restart game logic
    gameOver = false;
    ws.send(JSON.stringify({ t: 'restart_game' }));
  }
}

function loadPongCliScript() {
  const script = document.createElement('script');
  script.src = 'static/script/pongCli.js';
  script.onload = () => {
    console.log('pongCli.js script loaded and executed');
    initPongClient(ws);
  };
  document.body.appendChild(script);
}

function updateGameState(data) {
  if (typeof window.updateGameStateFromServer === 'function') {
    window.updateGameStateFromServer(data);
  }
}

window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'w', 's'].includes(event.key) && selectGameType !== null) {
    event.preventDefault();
    keys[event.key] = true;
    updateSpeeds();
  }
});

window.addEventListener('keyup', (event) => {
  if (['ArrowUp', 'ArrowDown', 'w', 's'].includes(event.key) && selectGameType !== null) {
    event.preventDefault();
    keys[event.key] = false;
    updateSpeeds();
  }
});

function updateSpeeds() {
  const newPlayer1Speed = (keys['ArrowDown'] ? 7 : 0) + (keys['ArrowUp'] ? -7 : 0);
  const newPlayer2Speed = (keys['s'] ? 7 : 0) + (keys['w'] ? -7 : 0);

  if (newPlayer1Speed !== player1Speed || newPlayer2Speed !== player2Speed) {
    player1Speed = newPlayer1Speed;
    player2Speed = newPlayer2Speed;
    const requestId = requestIdCounter++;
    requestTimestamps[requestId] = performance.now();
    ws.send(JSON.stringify({ t: 'pi', p1: player1Speed, p2: player2Speed, rid: requestId }));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('startButton').addEventListener('click', () => {
    if (selectedGameType === 'local_1v1') {
      startGame();
    } else if (selectedGameType !== 'local_1v1' && selectedGameType) {
      alert('Not Playable yet :(.');
    } else {
      alert('Please select a game type first.');
    }
  });
});