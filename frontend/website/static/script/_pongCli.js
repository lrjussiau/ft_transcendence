function initPongClient(ws) {
  console.log('pongCli.js script loaded');

  const canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }

  console.log('Canvas element found');

  const ctx = canvas.getContext('2d');
  let gameState = {};
  let countdownValue = null; // Ajouter la variable countdown ici

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';

    const scaleX = canvas.width / 640;
    const scaleY = canvas.height / 360;

    if (countdownValue !== null) {
      // Draw countdown
      ctx.font = `${40 * scaleX}px 'Playwrite US Trad', cursive`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; // Match the opacity and color style
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
      drawMiddleLine(scaleX);
    } else {
      console.error('Game state or ball is undefined');
    }
  }

  function drawMiddleLine(scaleX) {
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2 * scaleX;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
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
}
