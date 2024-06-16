const fetchMessage = async () => {
    try {
        const response = await fetch('/api/');
        const data = await response.json();
        document.getElementById('message').innerText = data.message;
    } catch (error) {
        console.error('Error fetching message:', error);
    }
};


window.onload = fetchMessage;
