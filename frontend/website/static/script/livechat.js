// Global variables
let chatSocket = null;
let currentUserId = null;

// Main setup function
async function setupLiveChat() {
    currentUserId = await fetchCurrentUserId();
    await displayChatRooms();
    setupMessageInput();
    await loadLastChat();
    setupSearch();
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

        setupSearch();
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
    roomButton.setAttribute('data-username', otherUser.username.toLowerCase());

    const userImg = document.createElement('img');
    userImg.src = otherUser.avatar;
    userImg.alt = 'Chat Picture';
    userImg.className = otherUser.status === 'online' ? 'chat-picture-online' : 'chat-picture';

    const userName = document.createElement('p');
    userName.textContent = otherUser.username;

    roomButton.append(userImg, userName);
    return roomButton;
}

function setupSearch() {
    const searchInput = document.querySelector('.search-bar input');
    searchInput.addEventListener('input', filterRooms);
}

// Chat room loading and management
async function loadChatRoom(roomId) {
    try {
        const room = await fetchChatRoomDetails(roomId);
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

function filterRooms() {
    const searchInput = document.querySelector('.search-bar input');
    const searchTerm = searchInput.value.toLowerCase();
    const roomPreviews = document.querySelectorAll('.room-preview');

    roomPreviews.forEach(roomPreview => {
        const username = roomPreview.getAttribute('data-username');
        if (username.includes(searchTerm)) {
            roomPreview.style.display = 'flex';
        } else {
            roomPreview.style.display = 'none';
        }
    });
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

    if (!usernameSpan || !avatarContainer || !avatarImg) {
        console.error('Required elements are missing in the DOM');
        return;
    }

    if (otherUser) {
        usernameSpan.textContent = otherUser.username;
        avatarImg.src = otherUser.avatar || '/static/img/default-avatar.png';
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

    chatSocket.onmessage = handleWebSocketMessage;
    chatSocket.onclose = () => console.warn('Chat socket closed');
    chatSocket.onerror = (error) => console.error('WebSocket error:', error);
}

function handleWebSocketMessage(event) {
    const data = JSON.parse(event.data);
    if (data.error === 'blocked') {
        displayBlockedMessage(data.message);
    } else {
        displayMessage(data.message, data.user_id);
    }
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

async function startChat(friendId, friendName) {
    const existingMenu = document.querySelector('.friend-context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    try {
        const chatRoom = await createOrGetChatRoom(friendId);
        localStorage.setItem('currentChatRoom', JSON.stringify(chatRoom));
        
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
        const response = await fetch('/api/livechat/create-room/', {
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

function displayBlockedMessage(message) {
    const messagesDiv = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message system';
    
    const textP = document.createElement('p');
    textP.className = 'text';
    textP.textContent = i18next.t('blockedChat');
    
    messageDiv.appendChild(textP);
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

