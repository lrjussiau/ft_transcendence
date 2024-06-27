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
                listItem.className = 'friend-list-item';

                const img = document.createElement('img');
                img.src = request.user.avatar;
                img.alt = 'player-img';
                img.className = 'img-fluid';

                const nameDiv = document.createElement('div');
                nameDiv.className = 'friend-name';
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
            pendingList.innerHTML = '<li class="friend-list-item">No pending friend requests</li>';
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
                listItem.className = 'friend-list-item';

                const img = document.createElement('img');
                img.src = friend.friend.avatar;
                img.alt = 'player-img';
                img.className = 'img-fluid';

                const nameDiv = document.createElement('div');
                nameDiv.className = 'friend-name';
                nameDiv.textContent = friend.friend.username;

                listItem.appendChild(img);
                listItem.appendChild(nameDiv);

                friendsList.appendChild(listItem);
            });
        } else {
            friendsList.innerHTML = '<li class="friend-list-item">No friends found</li>';
        }
    } catch (error) {
        console.error('Error fetching friends list:', error);
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
