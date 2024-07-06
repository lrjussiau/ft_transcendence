let webSocket;

function connectToWebSocket() {
    const accessToken = localStorage.getItem('authToken');
    if (!accessToken) {
        console.warn('No auth token found');
        return;
    }
    webSocket = new WebSocket(`wss://${window.location.host}/ws/activity/?token=${accessToken}`);

    webSocket.addEventListener('open', () => {
        console.log('WebSocket connection established');
        setupActivityTracking();
    });

    webSocket.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'activity_recorded') {
            console.log('Activity recorded');
        }
    });

    webSocket.addEventListener('close', (event) => {
        console.log('WebSocket connection closed', event);
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

// Call this function when your app initializes
connectToWebSocket();
