async function addFriend(friendId) {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/friends/add/', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ friend_id: friendId })
    });

    if (response.ok) {
        return response.json();
    } else {
        throw new Error('Failed to add friend');
    }
}

async function fetchUsers() {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/db/User/', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.ok) {
        return response.json();
    } else {
        throw new Error('Failed to fetch users');
    }
}

async function fetchIncomingFriendRequests() {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/friends/requests/incoming/', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.ok) {
        return response.json();
    } else {
        throw new Error('Failed to fetch incoming friend requests');
    }
}

async function fetchFriends() {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/friends/', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.ok) {
        return response.json();
    } else {
        throw new Error('Failed to fetch friends list');
    }
}

async function respondFriendRequest(requestId, action) {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`/api/friends/requests/respond/${requestId}/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
    });

    if (response.ok) {
        return response.json();
    } else {
        throw new Error('Failed to respond to friend request');
    }
}

async function displayIncomingFriendRequests() {
    try {
        const incomingRequests = await fetchIncomingFriendRequests();
        const pendingList = document.getElementById('pendingFriendList');
        pendingList.innerHTML = ''; // Clear existing content

        if (incomingRequests.length > 0) {
            incomingRequests.forEach(request => {
                const listItem = document.createElement('li');
                listItem.className = 'pending-friend-item';

                const img = document.createElement('img');
                img.src = request.user.avatar || 'default-avatar-url.jpg';
                img.alt = 'player-img';
                img.className = 'pending-friend-img';

                const nameDiv = document.createElement('div');
                nameDiv.className = 'pending-friend-name';
                nameDiv.textContent = request.user.username;

                const acceptButton = document.createElement('button');
                acceptButton.className = 'btn btn-sm btn-success';
                acceptButton.textContent = 'Accept';
                acceptButton.onclick = async () => {
                    await respondFriendRequest(request.id, 'accept');
                    displayIncomingFriendRequests();
                    displayFriends();
                };

                const rejectButton = document.createElement('button');
                rejectButton.className = 'btn btn-sm btn-danger';
                rejectButton.textContent = 'Reject';
                rejectButton.onclick = async () => {
                    await respondFriendRequest(request.id, 'reject');
                    displayIncomingFriendRequests();
                };

                listItem.appendChild(img);
                listItem.appendChild(nameDiv);
                listItem.appendChild(acceptButton);
                listItem.appendChild(rejectButton);

                pendingList.appendChild(listItem);
            });
        } else {
            pendingList.innerHTML = '<li class="pending-friend-item">No pending friend requests</li>';
        }
    } catch (error) {
        console.error('Error fetching incoming friend requests:', error);
    }
}

async function displayFriends() {
    try {
        const friends = await fetchFriends();
        const friendsList = document.getElementById('friendList');
        friendsList.innerHTML = ''; // Clear existing content

        if (friends.length > 0) {
            friends.forEach(friend => {
                const listItem = document.createElement('li');
                listItem.className = 'accepted-friend-item';
                listItem.dataset.friendId = friend.friend.id; // Add this line

                const img = document.createElement('img');
                img.src = friend.friend.avatar
                img.alt = 'player-img';

                // Check friend's status and set the class accordingly
                if (friend.friend.status === 'online') {
                    img.className = 'accepted-friend-img-online';
                } else {
                    img.className = 'accepted-friend-img';
                }

                const nameDiv = document.createElement('div');
                nameDiv.className = 'accepted-friend-name';
                nameDiv.textContent = friend.friend.username;

                listItem.appendChild(img);
                listItem.appendChild(nameDiv);

                friendsList.appendChild(listItem);
            });
        } else {
            friendsList.innerHTML = '<li>* No friends found</li>';
        }
    } catch (error) {
        console.error('Error fetching friends list:', error);
    }
}

function showContextMenu(event, friendId, friendName) {
    event.preventDefault();
    event.stopPropagation();
    
    const existingMenu = document.querySelector('.friend-context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }

    const contextMenu = document.createElement('div');
    contextMenu.className = 'friend-context-menu';
    contextMenu.style.position = 'absolute';
    contextMenu.style.left = `${event.pageX}px`;
    contextMenu.style.top = `${event.pageY}px`;
    contextMenu.style.zIndex = '1000';

    const sendMessageBtn = document.createElement('button');
    sendMessageBtn.textContent = 'Send a message';
    sendMessageBtn.onclick = async (e) => {
        e.stopPropagation();
        try {
            await startChat(friendId, friendName);
        } catch (error) {
            console.error('Error starting chat:', error);
            alert('Failed to start chat. Please try again.');
        }
        contextMenu.remove();
    };

    contextMenu.appendChild(sendMessageBtn);
    document.body.appendChild(contextMenu);

    document.addEventListener('click', function closeMenu(e) {
        if (!contextMenu.contains(e.target)) {
            contextMenu.remove();
            document.removeEventListener('click', closeMenu);
        }
    });
}
// Add this function to the friend.js file
function setupFriendListeners() {
    const friendList = document.getElementById('friendList');
    if (friendList) {
        friendList.addEventListener('click', (event) => {
            const friendItem = event.target.closest('.accepted-friend-item');
            if (friendItem) {
                const friendId = friendItem.dataset.friendId;
                const friendName = friendItem.querySelector('.accepted-friend-name').textContent;
                showContextMenu(event, friendId, friendName);
            }
        });
    }
}

async function initializeFriendSearch() {
    $(document).ready(async function() {
        let friends = [];

        try {
            friends = await fetchUsers();
        } catch (error) {
            console.error('Error fetching users:', error);
        }

        $('#searchInput').on('input', function() {
            const query = $(this).val().toLowerCase();
            const filteredFriends = friends.filter(friend => friend.username.toLowerCase().includes(query));

            $('#searchResults').empty();
            if (filteredFriends.length > 0) {
                filteredFriends.forEach(friend => {
                    $('#searchResults').append(`
                        <div class="list-group-item d-flex justify-content-between align-items-center">
                            ${friend.username}
                            <button class="btn btn-sm modal-button add-friend-btn" data-id="${friend.id}">Add Friend</button>
                        </div>
                    `);
                });
            } else {
                $('#searchResults').append('<div class="list-group-item">No friends found</div>');
            }
        });

        $(document).on('click', '.add-friend-btn', async function() {
            const friendId = $(this).data('id');
            try {
                const result = await addFriend(friendId);
                alert('Friend request sent successfully');
            } catch (error) {
                console.error('Error adding friend:', error);
                alert('Failed to add friend');
            }
        });
    });
}



document.addEventListener('DOMContentLoaded', setupFriendListeners);