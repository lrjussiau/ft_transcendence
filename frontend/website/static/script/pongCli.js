document.addEventListener('DOMContentLoaded', () => {
    console.log('pongCli.js script loaded');  // Vérifier que le script est chargé

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }

    console.log('Canvas element found');  // Ligne ajoutée pour vérifier que le canvas est trouvé

    const ctx = canvas.getContext('2d');
    let gameState = {};
    let gameStarted = false;
    let gameOver = false;
    let player1Speed = 0;
    let player2Speed = 0;
    const keys = {};
    let requestIdCounter = 0;
    const requestTimestamps = {};
    let roundTripTime = 0;

    const socket = new WebSocket('ws://localhost:8080/ws/pong/');

    socket.onopen = () => {
        console.log('Connected to server');
        socket.send(JSON.stringify({ t: 'rs' }));  // request_state
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received update:', data);
        if (data.rid !== undefined && requestTimestamps[data.rid] !== undefined) {
            roundTripTime = (performance.now() - requestTimestamps[data.rid]);  // Keep in ms
            console.log(`Round trip time for request ${data.rid}: ${roundTripTime.toFixed(2)} ms`);
            delete requestTimestamps[data.rid];
        }
        gameState = data;
        draw();
        if (gameState.gs) {  // game_started
            gameStarted = true;
            gameOver = false;
        } else if (gameState.go && !gameOver) {  // game_over
            gameOver = true;
            cancelAnimationFrame(animationFrameRequest);  // Stop the game loop
            animationFrameRequest = null;
        }
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    socket.onclose = (event) => {
        console.log('WebSocket closed:', event);
    };

    document.getElementById('startButton').addEventListener('click', () => {
        console.log("Start button clicked");
        const requestId = requestIdCounter++;
        requestTimestamps[requestId] = performance.now();
        socket.send(JSON.stringify({ t: 'sg', rid: requestId }));  // start_game
        gameStarted = true;
        gameOver = false;
        if (!animationFrameRequest) {
            requestAnimationFrame(update);
        }
    });

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';

        // Draw ball
        ctx.beginPath();
        ctx.arc(gameState.ball.x, gameState.ball.y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Draw paddles
        ctx.fillRect(canvas.width - 15, gameState.p1.y, 10, 70);  // player1
        ctx.fillRect(5, gameState.p2.y, 10, 70);  // player2

        // Draw scores
        ctx.font = '20px Poppins';
        ctx.fillText(gameState.s1, canvas.width - 50, 30);  // player1_score
        ctx.fillText(gameState.s2, 30, 30);  // player2_score

        // Draw round trip time (delta) in the bottom right corner
        ctx.font = '12px Poppins';
        ctx.fillText(`Delta: ${roundTripTime.toFixed(0)} ms`, canvas.width - 100, canvas.height - 10);

        // Draw the middle line
        drawMiddleLine();
    }

    function drawMiddleLine() {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
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
            socket.send(JSON.stringify({ t: 'rs', rid: requestId }));  // request_state
        }
    }

    function handleKeyDown(event) {
        if (['ArrowDown', 'ArrowUp', 's', 'w'].includes(event.key)) {
            event.preventDefault();
        }
        keys[event.key] = true;
        updateSpeeds();
    }

    function handleKeyUp(event) {
        if (['ArrowDown', 'ArrowUp', 's', 'w'].includes(event.key)) {
            event.preventDefault();
        }
        keys[event.key] = false;
        updateSpeeds();
    }

    function updateSpeeds() {
        const newPlayer1Speed = (keys['ArrowDown'] ? 7 : 0) + (keys['ArrowUp'] ? -7 : 0);
        const newPlayer2Speed = (keys['s'] ? 7 : 0) + (keys['w'] ? -7 : 0);

        if (newPlayer1Speed !== player1Speed || newPlayer2Speed !== player2Speed) {
            player1Speed = newPlayer1Speed;
            player2Speed = newPlayer2Speed;
            const requestId = requestIdCounter++;
            requestTimestamps[requestId] = performance.now();
            socket.send(JSON.stringify({ t: 'pi', p1: player1Speed, p2: player2Speed, rid: requestId }));  // player_input
        }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    window.addEventListener('resize', resizeCanvas);

    function resizeCanvas() {
        const aspectRatio = 640 / 360;
        const newWidth = Math.min(window.innerWidth, window.innerHeight * aspectRatio);
        const newHeight = newWidth / aspectRatio;

        canvas.style.width = newWidth + 'px';
        canvas.style.height = newHeight + 'px';

        canvas.width = newWidth;
        canvas.height = newHeight;

        draw();  // Redraw the canvas after resizing
    }

    resizeCanvas();  // Initial call to set the canvas size
});