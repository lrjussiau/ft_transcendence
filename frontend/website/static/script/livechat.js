// Global variables
let chatSocket = null;
let currentUserId = null;

// Main setup function
async function setupLiveChat() {
    currentUserId = await fetchCurrentUserId();
    await displayChatRooms();
    setupMessageInput();
    await loadLastChat();
}

// User and chat room functions
async function fetchCurrentUserId() {
    try {
        const userProfile = await fetchUserProfile();
        updateUserProfileUI(userProfile);
        return userProfile.id;
    } catch (error) {
        console.error('Error fetching user profile:', error);
    }
}

function updateUserProfileUI(userProfile) {
    const userProfileDiv = document.querySelector('.user-profile');
    userProfileDiv.querySelector('p').textContent = userProfile.username;
    userProfileDiv.querySelector('img').src = userProfile.avatar;
}

async function displayChatRooms() {
    try {
        const chatRooms = await fetchChatRooms();
        const roomHistoryDiv = document.querySelector('.room-history');
        roomHistoryDiv.innerHTML = '';

        chatRooms.forEach(room => {
            const otherUser = room.user1.id === currentUserId ? room.user2 : room.user1;
            const roomButton = createRoomButton(room.id, otherUser);
            roomHistoryDiv.appendChild(roomButton);
        });
    } catch (error) {
        console.error('Error displaying chat rooms:', error);
    }
}

async function fetchChatRooms() {
    const response = await fetch('/api/livechat/rooms/', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
    });
    if (!response.ok) throw new Error('Failed to fetch chat rooms');
    return response.json();
}

function createRoomButton(roomId, otherUser) {
    const roomButton = document.createElement('button');
    roomButton.className = 'room-preview';
    roomButton.onclick = () => loadChatRoom(roomId);

    const userImg = document.createElement('img');
    userImg.src = otherUser.avatar;
    userImg.alt = 'Chat Picture';
    userImg.className = otherUser.status === 'online' ? 'chat-picture-online' : 'chat-picture';

    const userName = document.createElement('p');
    userName.textContent = otherUser.username;

    roomButton.append(userImg, userName);
    return roomButton;
}

// Chat room loading and management
async function loadChatRoom(roomId) {
    try {
        const room = await fetchChatRoomDetails(roomId);
        //console.log('Room Info : ', room);
        const otherUser = room.user1.id === currentUserId ? room.user2 : room.user1;

        updateChatHeader(otherUser);
        await loadPreviousMessages(roomId);
        setupWebSocket(roomId);
        
        localStorage.setItem('lastChatUser', JSON.stringify(otherUser));
        localStorage.setItem('lastChatRoomId', roomId);
    } catch (error) {
        console.error('Error loading chat room:', error);
    }
}

async function fetchChatRoomDetails(roomId) {
    const response = await fetch(`/api/livechat/rooms/${roomId}/`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
    });
    if (!response.ok) throw new Error('Failed to fetch chat room details');
    return response.json();
}

function updateChatHeader(otherUser) {
    const usernameSpan = document.getElementById('username');
    const avatarContainer = document.querySelector('.chat-img-container');
    const avatarImg = document.querySelector('.chat-img');

    //console.log('Other User:', otherUser);
    if (otherUser) {
        usernameSpan.textContent = otherUser.username;
        //console.log('Avatar:', otherUser.avatar);
        avatarImg.src = otherUser.avatar;
        avatarImg.alt = `${otherUser.username}'s avatar`;
        avatarContainer.style.display = 'block';
    } else {
        usernameSpan.textContent = 'Live Chat';
        avatarContainer.style.display = 'none';
    }
}

async function loadPreviousMessages(roomId) {
    try {
        const messages = await fetchMessages(roomId);
        const messagesDiv = document.getElementById('messages');
        messagesDiv.innerHTML = '';
        messages.forEach(message => displayMessage(message.content, message.user.id));
    } catch (error) {
        console.error('Error loading previous messages:', error);
    }
}

async function fetchMessages(roomId) {
    const response = await fetch(`/api/livechat/rooms/${roomId}/messages/`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
    });
    if (!response.ok) throw new Error('Failed to fetch messages');
    return response.json();
}

// WebSocket setup and message handling
function setupWebSocket(roomId) {
    if (chatSocket) chatSocket.close();

    const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.hostname;
    chatSocket = new WebSocket(`${wsScheme}://${host}:4443/ws/chat/${roomId}/`);

    // const wsUrl = `wss://${host}:4443/ws/pong/`;

    chatSocket.onmessage = handleWebSocketMessage;
    chatSocket.onclose = () => console.warn('Chat socket closed');
    chatSocket.onerror = (error) => console.error('WebSocket error:', error);
}

function handleWebSocketMessage(event) {
    //console.log('Received WebSocket message:', event.data);
    const data = JSON.parse(event.data);
    displayMessage(data.message, data.user_id);
}

function displayMessage(message, userId) {
    const messagesDiv = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${userId == currentUserId ? 'right' : 'left'}`;
    
    const textP = document.createElement('p');
    textP.className = 'text';
    textP.textContent = message;
    
    messageDiv.appendChild(textP);
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Message input handling
function setupMessageInput() {
    const sendButton = document.querySelector('.send-message');
    const messageInput = document.getElementById('messageInput');

    sendButton.onclick = sendMessage;
    messageInput.onkeypress = (e) => {
        if (e.key === 'Enter') sendMessage();
    };
}

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    if (message && chatSocket) {
        try {
            chatSocket.send(JSON.stringify({ 'message': message, 'user_id': currentUserId }));
            messageInput.value = '';
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }
}

// Last chat loading
async function loadLastChat() {
    const lastChatUser = JSON.parse(localStorage.getItem('lastChatUser'));
    const lastChatRoomId = localStorage.getItem('lastChatRoomId');
    
    if (lastChatUser && lastChatRoomId) {
        await loadChatRoom(lastChatRoomId);
    } else {
        clearChat();
    }
}

function clearChat() {
    updateChatHeader(null);
    document.getElementById('messages').innerHTML = '';
}

// Start chat function (to be called from other parts of the app)
async function startChat(friendId, friendName) {
    //console.log(`Starting chat with ${friendName} (ID: ${friendId})`);
    try {
        const chatRoom = await createOrGetChatRoom(friendId);
        //console.log('Chat room created or retrieved:', chatRoom);
        
        localStorage.setItem('currentChatRoom', JSON.stringify(chatRoom));

        //console.log('Loading chat room:', chatRoom.id);
        
        window.history.pushState({}, '', '/livechat');
        handleRoute('livechat');
        await loadChatRoom(chatRoom.id);
    } catch (error) {
        console.error('Error starting chat:', error);
        throw error; 
    }
}

async function createOrGetChatRoom(user2Id) {
    try {
        const response = await fetch('/api/chat/create-room/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ user2_id: user2Id })
        });
        if (!response.ok) {
            throw new Error('Failed to create or get chat room');
        }
        return await response.json();
    } catch (error) {
        console.error('Error creating or getting chat room:', error);
        throw error;
    }
}
