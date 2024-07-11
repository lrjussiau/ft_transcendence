let webSocket;

function connectToWebSocket() {
    const accessToken = localStorage.getItem('authToken');
    if (!accessToken) {
        console.warn('No auth token found');
        return;
    }
    webSocket = new WebSocket(`wss://${window.location.host}/ws/activity/?token=${accessToken}`);

    webSocket.addEventListener('open', () => {
        setupActivityTracking();
    });

    webSocket.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
    });

    webSocket.addEventListener('close', (event) => {
        setTimeout(connectToWebSocket, 5000);
    });
}

function setupActivityTracking() {
    const events = ['click', 'scroll', 'keypress'];
    events.forEach(eventType => {
        document.addEventListener(eventType, sendActivityUpdate);
    });
}

function sendActivityUpdate() {
    if (webSocket && webSocket.readyState === WebSocket.OPEN) {
        webSocket.send(JSON.stringify({ type: 'activity' }));
    }
}

function disconnectStatus() {
    if (webSocket) {
        webSocket.close();
    }
}

connectToWebSocket();
