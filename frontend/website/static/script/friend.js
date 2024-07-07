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

function blockFriend(friend_id){
    const token = localStorage.getItem('authToken');
    fetch(`/api/friends/block/${friend_id}/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    if (response.ok) {
        return response.json();
    } else {
        throw new Error('Failed to add friend');
    }
}


async function deleteFriend(friendId) {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/friends/delete/', {
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
        throw new Error('Failed to delete friend');
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

async function fetchPendingFriends() {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/friends/pending/', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.ok) {
        return response.json();
    } else {
        throw new Error('Failed to fetch pending friends list');
    }
}

async function fetchBlockedFriends() {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/friends/blocked/', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.ok) {
        return response.json();
    } else {
        throw new Error('Failed to fetch blocked friends list');
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

                const deleteButton = document.createElement('button');
                deleteButton.innerText = 'Delete';
                deleteButton.className = 'delete-friend-button';
                deleteButton.addEventListener('click', () => {
                    // Implement the delete friend functionality here
                    alert("FRiend deleted");
                    deleteFriend(friend.id)
                    //deleteFriend(friend.friend.id);
                });

                const blockButton = document.createElement('button');
                blockButton.className = 'block-friend-button';
            
                // Check if the friend is blocked
                const token = localStorage.getItem('authToken');
                fetch(`/api/friends/is-blocked/${friend.friend.id}/`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    console.debug("DATA: ", data);
                    if (data.is_blocked == true) {
                        blockButton.innerText = 'Blocked';
                        blockButton.disabled = true;  // Disable the button if the friend is already blocked
                    } else {
                        blockButton.innerText = 'Block';
                        blockButton.addEventListener('click', () => {
                            blockFriend(friend.friend.id);
                        });
                    }
                })
                .catch(error => console.error('Error:', error));
            
                // Append buttons to list item
                listItem.appendChild(blockButton);
            
                // Create play game button
                // const playButton = document.createElement('button');
                // playButton.innerText = 'Play Game';
                // playButton.className = 'play-game-button';
                // playButton.addEventListener('click', () => {
                //     // Implement the play game functionality here
                //     alert("Ask to play game")
                //     //askToPlayGame(friend.friend.id);
                // });
            
                listItem.appendChild(img);
                listItem.appendChild(nameDiv);

                listItem.appendChild(blockButton);
                //listItem.appendChild(playButton);
                listItem.appendChild(deleteButton);


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
        let users = [];
        const currentUser = await fetchUserProfile();
        let friends = await fetchFriends();
        let pendingFriends = await fetchPendingFriends();
        let blockedFriends = await fetchBlockedFriends();

        try {
            users = await fetchUsers();
        } catch (error) {
            console.error('Error fetching users:', error);
        }
        const potentialFriends = users.filter(user => 
            user.username !== currentUser.username && 
            !friends.some(friend => friend.friend.username === user.username)&&
            !pendingFriends.some(pending => pending.friend.username === user.username)&&
            !blockedFriends.some(blocked => blocked.friend.username === user.username)
        );
        console.log("potential friend:", potentialFriends);
        $('#searchInput').on('input', function() {
            const query = $(this).val().toLowerCase();
            const filteredUsers = potentialFriends.filter(user => 
                user.username.toLowerCase().includes(query)
            );
            //console.log("filtrre friend:", filteredUsers);
            $('#searchResults').empty();
            if (filteredUsers.length > 0) {
                filteredUsers.forEach(friend => {
                    console.log("friend status", friend.status)
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

        /*$(document).on('click', '.add-friend-btn', async function() {
            const friendId = $(this).data('id');
            try {
                const result = await addFriend(friendId);

                $('#searchResults').append(`

                    <button class="btn btn-sm modal-button btn-success">Added</button>
                `);
                alert('Friend request sent successfully');
            } catch (error) {
                console.error('Error adding friend:', error);
                alert(error);
            }
        });*/
        $('#searchResults').on('click', '.add-friend-btn', function() {
            const friendId = $(this).data('id');
            const button = $(this);
        
            addFriend(friendId)
                .then(() => {
                    // Replace the button
                    button.replaceWith(`
                        <button class="btn btn-sm modal-button btn-success">Added</button>
                    `);
                })
                .catch(error => {
                    console.error('Error adding friend:', error);
                    // Handle the error (e.g., show an error message to the user)
                    alert('Failed to add friend. Please try again.');
                });
        });
    });
}



document.addEventListener('DOMContentLoaded', setupFriendListeners);