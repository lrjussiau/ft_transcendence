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

function setupLiveChat() {
    const chatRoomData = JSON.parse(localStorage.getItem('currentChatRoom'));
    if (chatRoomData) {
        // Use chatRoomData to set up the chat interface
        console.log('Setting up chat for room:', chatRoomData);
        // TODO: Implement chat interface setup
    } else {
        console.error('No chat room data found');
        // Handle the case where no chat room data is available
    }
    displayChatRooms();
    fetchCurrentUserId();
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

function loadChatRoom(roomId) {
    console.log(`Loading chat room: ${roomId}`);
    // TODO: Implement chat room loading logic
    // This should update the chat-area with the selected room's messages
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
        userProfileDiv.querySelector('img').src = userProfile.avatar || 'http://localhost:8080/media/avatars/default_avatar.png';

        return userProfile.id;
    } catch (error) {
        console.error('Error fetching user profile:', error);
    }
}

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    if (message) {
        // TODO: Implement sending message to the server
        console.log('Sending message:', message);
        messageInput.value = '';
    }
}