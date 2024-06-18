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
    let gameStarted = false;
    let gameOver = false;
  
    function draw() {
      if (!gameState || !gameState.ball) {
        console.error('Game state or ball is undefined');
        return;
      }
  
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
  
      const scaleX = canvas.width / 640;
      const scaleY = canvas.height / 360;
  
      // Draw ball
      ctx.beginPath();
      ctx.arc(gameState.ball.x * scaleX, gameState.ball.y * scaleY, 5 * scaleX, 0, Math.PI * 2);
      ctx.fill();
  
      // Draw paddles
      ctx.fillRect(canvas.width - 15 * scaleX, gameState.p1.y * scaleY, 10 * scaleX, 70 * scaleY); // player1
      ctx.fillRect(5 * scaleX, gameState.p2.y * scaleY, 10 * scaleX, 70 * scaleY); // player2
  
      // Draw scores
      ctx.font = `${20 * scaleX}px Poppins`;
      ctx.fillText(gameState.s1, canvas.width - 50 * scaleX, 30 * scaleY);
      ctx.fillText(gameState.s2, 30 * scaleX, 30 * scaleY);
  
      // Draw round trip time (delta) in the bottom right corner
      ctx.font = `${12 * scaleX}px Poppins`;
      ctx.fillText(`Delta: ${roundTripTime.toFixed(0)} ms`, canvas.width - 100 * scaleX, canvas.height - 10 * scaleY);
  
      // Draw the middle line
      drawMiddleLine(scaleX, scaleY);
    }
  
    function drawMiddleLine(scaleX, scaleY) {
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2 * scaleX;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
    }
  
    let animationFrameRequest;
  
    function update() {
      if (gameStarted && !gameOver) {
        animationFrameRequest = requestAnimationFrame(update);
        const requestId = requestIdCounter++;
        requestTimestamps[requestId] = performance.now();
        ws.send(JSON.stringify({ t: 'rs', rid: requestId }));
      }
    }
  
    window.addEventListener('resize', resizeCanvas);
  
    function resizeCanvas() {
      const aspectRatio = 640 / 360;
      const newWidth = Math.min(window.innerWidth, window.innerHeight * aspectRatio);
      const newHeight = newWidth / aspectRatio;
  
      canvas.style.width = newWidth + 'px';
      canvas.style.height = newHeight + 'px';
  
      canvas.width = newWidth;
      canvas.height = newHeight;
  
      draw();
    }
  
    resizeCanvas();
  
    window.updateGameStateFromServer = function(data) {
      if (data.ball) {
        gameState = data;
        draw();
      } else {
        console.error('Invalid game state received:', data);
      }
    };
}
