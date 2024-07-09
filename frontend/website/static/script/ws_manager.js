const WebSocketManager = (function() {
    let ws = null;

    function getWebSocket() {
        if (!ws || ws.readyState === WebSocket.CLOSED) {
            const host = window.location.hostname;
            const wsUrl = `wss://${host}:4443/ws/pong/`;
            ws = new WebSocket(wsUrl);
            
            ws.onopen = () => {
                console.log('WebSocket connection established');
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
            
            ws.onclose = (event) => {
                console.log('WebSocket closed:', event);
            };
        }
        return ws;
    }


    function closeWebSocket() {
        if (ws) {
            ws.close();
            ws = null;
        }
    }

    return { getWebSocket , closeWebSocket};
})();

