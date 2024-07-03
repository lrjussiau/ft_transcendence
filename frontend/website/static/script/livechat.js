// static/script/livechat.js

// Update the startChat function
async function startChat(friendId, friendName) {
    console.log(`Starting chat with ${friendName} (ID: ${friendId})`);
    try {
        const chatRoom = await createOrGetChatRoom(friendId);
        console.log('Chat room created or retrieved:', chatRoom);
        
        // Store the chat room information in localStorage
        localStorage.setItem('currentChatRoom', JSON.stringify(chatRoom));

        // Redirect to the livechat route
        window.history.pushState({}, '', '/livechat');
        handleRoute('livechat');
    } catch (error) {
        console.error('Error starting chat:', error);
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
        const chatRoom = await response.json();
        return chatRoom;
    } catch (error) {
        console.error('Error creating or getting chat room:', error);
        throw error;
    }
}

let chatSocket = null;

function setupLiveChat() {
    fetchCurrentUserId().then(() => {
        displayChatRooms();
    });

    const sendButton = document.querySelector('.send-message');
    const messageInput = document.getElementById('messageInput');

    sendButton.onclick = sendMessage;
    messageInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    };
}

async function displayChatRooms() {
    try {
        const currentUser = await fetchUserProfile();
        
        const response = await fetch('/api/chat/rooms/', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch chat rooms');
        }

        const chatRooms = await response.json();
        console.log('Chat rooms:', chatRooms);  // Log the entire chatRooms object

        const roomHistoryDiv = document.querySelector('.room-history');
        roomHistoryDiv.innerHTML = ''; // Clear existing content

        chatRooms.forEach(room => {
            console.log('room user 1 id:', room.user1.id);
            console.log('room user 2 id:', room.user2.id);
            console.log('current user id:', currentUser.id);
            const otherUser = room.user1.id === currentUser.id ? room.user2 : room.user1;
            console.log('Current user:', currentUser.username);
            console.log('Other user:', otherUser.username);
            console.log('Other user avatar:', otherUser.avatar);
            
            const roomButton = document.createElement('button');
            roomButton.className = 'room-preview';
            roomButton.onclick = () => loadChatRoom(room.id);

            const userImg = document.createElement('img');
            userImg.src = otherUser.avatar || 'http://localhost:8080/media/avatars/default_avatar.png';
            userImg.alt = 'Chat Picture';
            userImg.className = otherUser.status === 'online' ? 'chat-picture-online' : 'chat-picture';

            const userName = document.createElement('p');
            userName.textContent = otherUser.username;

            roomButton.appendChild(userImg);
            roomButton.appendChild(userName);

            roomHistoryDiv.appendChild(roomButton);
        });
    } catch (error) {
        console.error('Error fetching chat rooms:', error);
    }
}

let currentUserId;

function setupLiveChat() {
    fetchCurrentUserId().then(() => {
        displayChatRooms();
    });

    // Set up the send message functionality
    const sendButton = document.querySelector('.send-message');
    const messageInput = document.getElementById('messageInput');

    sendButton.onclick = () => sendMessage();
    messageInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    };
}

async function fetchCurrentUserId() {
    try {
        const userProfile = await fetchUserProfile();
        currentUserId = userProfile.id;
        
        // Update the user profile in the sidebar
        const userProfileDiv = document.querySelector('.user-profile');
        userProfileDiv.querySelector('p').textContent = userProfile.username;
        userProfileDiv.querySelector('img').src = userProfile.avatar;

        return userProfile.id;
    } catch (error) {
        console.error('Error fetching user profile:', error);
    }
}

async function loadChatRoom(roomId) {
    console.log(`Loading chat room: ${roomId}`);
    
    try {
        const response = await fetch(`/api/chat/rooms/${roomId}/`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch chat room details');
        }

        const room = await response.json();
        const otherUser = room.user1.id === currentUserId ? room.user2 : room.user1;

        updateChatHeader(otherUser);
        
        // Close existing WebSocket connection if any
        if (chatSocket) {
            chatSocket.close();
        }

        // Establish a new WebSocket connection
        const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
        chatSocket = new WebSocket(
            `${wsScheme}://${window.location.host}/ws/chat/${roomId}/`
        );

        chatSocket.onmessage = function(e) {
            const data = JSON.parse(e.data);
            displayMessage(data.message, data.user_id);
        };

        chatSocket.onclose = function(e) {
            console.error('Chat socket closed unexpectedly');
        };

        // Load previous messages
        loadPreviousMessages(roomId);

    } catch (error) {
        console.error('Error loading chat room:', error);
    }
}

function updateChatHeader(otherUser) {
    const usernameSpan = document.getElementById('username');
    const avatarImg = document.querySelector('.chat-img');

    usernameSpan.textContent = otherUser.username;
    avatarImg.src = otherUser.avatar || 'http://localhost:8080/media/avatars/default_avatar.png';
    avatarImg.alt = `${otherUser.username}'s avatar`;
}

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    if (message && chatSocket) {
        console.log('Attempting to send message:', message);
        try {
            chatSocket.send(JSON.stringify({
                'message': message,
                'user_id': currentUserId  // Assuming you have the current user's ID stored
            }));
            console.log('Message sent successfully');
        } catch (error) {
            console.error('Error sending message:', error);
        }
        messageInput.value = '';
    } else {
        console.log('No message to send or WebSocket not connected');
    }
}

// Modify the WebSocket onmessage handler
chatSocket.onmessage = function(e) {
    console.log('Received WebSocket message:', e.data);
    const data = JSON.parse(e.data);
    displayMessage(data.message, data.user_id);
};

// Add error handler
chatSocket.onerror = function(error) {
    console.error('WebSocket error:', error);
};
function displayMessage(message, userId) {
    const messagesDiv = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${userId === currentUserId ? 'right' : 'left'}`;
    
    const textP = document.createElement('p');
    textP.className = 'text';
    textP.textContent = message;
    
    messageDiv.appendChild(textP);
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function loadPreviousMessages(roomId) {
    try {
        const response = await fetch(`/api/chat/rooms/${roomId}/messages/`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch messages');
        }

        const messages = await response.json();
        const messagesDiv = document.getElementById('messages');
        messagesDiv.innerHTML = ''; // Clear existing messages

        messages.forEach(message => {
            displayMessage(message.content, message.user.id);
        });
    } catch (error) {
        console.error('Error loading previous messages:', error);
    }
}