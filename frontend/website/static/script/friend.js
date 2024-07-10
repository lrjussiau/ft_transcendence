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

async function blockFriend(friend_id){
    const token = localStorage.getItem('authToken');
    const response = await fetch(`/api/friends/block/${friend_id}/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    if (response.ok) {
        return response.json();
    } else {
        throw new Error('Failed to block friend');
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
        body: JSON.stringify({ friend_id: friendId})
    });
    if (response.ok) {
        return response.json();
    } else {
        throw new Error('Failed to delete friend');
    }
    displayFriends();
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

                const sendMessageBtn = document.createElement('button');
                const acceptButton = document.createElement('button');
                acceptButton.className = 'btn btn-sm btn-success';
                acceptButton.textContent = i18next.t('Accept');
                acceptButton.onclick = async () => {
                    await respondFriendRequest(request.id, 'accept');
                    displayIncomingFriendRequests();
                    displayFriends();
                };

                const rejectButton = document.createElement('button');
                rejectButton.className = 'btn btn-sm btn-danger';
                rejectButton.textContent = i18next.t('Reject');
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
            pendingList.innerHTML = '<li class="pending-friend-item" data-i18n="noPendingFriendRequest">No pending friend requests</li>';
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
                listItem.dataset.friendId = friend.friend.id;

                const img = document.createElement('img');
                img.src = friend.friend.avatar;
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
            friendsList.innerHTML = '<li data-i18n="noFriendsFound">* No friends found</li>';
        }
        
        if (window.initI18next && window.updateContent) {
            window.initI18next().then(() => {
              window.updateContent();
              if (window.initializeLanguageSelector) {
                window.initializeLanguageSelector();
              }
            });
        } else {
            console.warn('i18next setup functions not found. Make sure i18n-setup.js is loaded.');
        }
    } catch (error) {
        console.error('Error fetching friends list:', error);
    }
}

// async function displayFriends() {
//     try {
//         const friends = await fetchFriends();
//         const friendsList = document.getElementById('friendList');
//         friendsList.innerHTML = ''; // Clear existing content

//         if (friends.length > 0) {
//             friends.forEach(friend => {
//                 const listItem = document.createElement('li');
//                 listItem.className = 'accepted-friend-item';
//                 listItem.dataset.friendId = friend.friend.id; // Add this line

//                 const img = document.createElement('img');
//                 img.src = friend.friend.avatar
//                 img.alt = 'player-img';

//                 // Check friend's status and set the class accordingly
//                 if (friend.friend.status === 'online') {
//                     img.className = 'accepted-friend-img-online';
//                 } else {
//                     img.className = 'accepted-friend-img';
//                 }

//                 const nameDiv = document.createElement('div');
//                 nameDiv.className = 'accepted-friend-name';
//                 nameDiv.textContent = friend.friend.username;

                
            
//                 listItem.appendChild(img);
//                 listItem.appendChild(nameDiv);
//                 listItem.appendChild(blockButton);
//                 listItem.appendChild(deleteButton);

//                 friendsList.appendChild(listItem);
//             });
//         } else {
//             friendsList.innerHTML = '<li data-i18n="noFriendsFound">* No friends found</li>';
//         }
//         if (window.initI18next && window.updateContent) {
//             window.initI18next().then(() => {
//               window.updateContent();
//               if (window.initializeLanguageSelector) {
//                 window.initializeLanguageSelector();
//               }
//             });
//           } else {
//             console.warn('i18next setup functions not found. Make sure i18n-setup.js is loaded.');
//           }
//     } catch (error) {
//         console.error('Error fetching friends list:', error);
//     }
// }


async function showContextMenu(event, friendId, friendName) {
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

    const token = localStorage.getItem('authToken');

    // Send Message Button
    const sendMessageBtn = document.createElement('button');
    sendMessageBtn.textContent = i18next.t('sendMessage');
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

    // Delete Friend Button
    const deleteButton = document.createElement('button');
    deleteButton.innerText = i18next.t('Delete');
    deleteButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
            await deleteFriend(friendId);
            deleteButton.innerText = i18next.t('Deleted');
            deleteButton.disabled = true;
            setTimeout(() => {
                contextMenu.remove();
                displayFriends(); // Call displayFriends after deleting a friend
            }, 1000);
        } catch (error) {
            console.error('Error deleting friend:', error);
            alert('Failed to delete friend. Please try again.');
        }
    });

    // Block/Unblock Button
    const blockButton = document.createElement('button');

    const updateBlockButton = (isBlocked) => {
        if (isBlocked) {
            blockButton.innerText = i18next.t('Unblock');
            blockButton.classList.add('blocked');
        } else {
            blockButton.innerText = i18next.t('Block');
            blockButton.classList.remove('blocked');
        }
    };

    const toggleBlockStatus = async (isCurrentlyBlocked) => {
        const endpoint = isCurrentlyBlocked ? 'unblock' : 'block';
        try {
            const response = await fetch(`/api/friends/${endpoint}/${friendId}/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                updateBlockButton(!isCurrentlyBlocked);
            } else {
                console.error('Failed to toggle block status');
                alert('Failed to update block status. Please try again.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        }
    };

    blockButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const isCurrentlyBlocked = blockButton.classList.contains('blocked');
        toggleBlockStatus(isCurrentlyBlocked);
    });

    // Initial block status check (changed back to POST)
    fetch(`/api/friends/is-blocked/${friendId}/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        updateBlockButton(data.is_blocked);
    })
    .catch(error => {
        console.error('Error checking block status:', error);
        updateBlockButton(false); // Default to unblocked if check fails
    });


    blockButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const isCurrentlyBlocked = blockButton.classList.contains('blocked');
        toggleBlockStatus(isCurrentlyBlocked);
    });

    // Initial block status check
    fetch(`/api/friends/is-blocked/${friendId}/`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        updateBlockButton(data.is_blocked);
    })
    .catch(error => {
        console.error('Error checking block status:', error);
        updateBlockButton(false); // Default to unblocked if check fails
    });

    contextMenu.appendChild(sendMessageBtn);
    contextMenu.appendChild(deleteButton);
    contextMenu.appendChild(blockButton);
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
        //console.log("potential friend:", potentialFriends);
        $('#searchInput').on('input', function() {
            const query = $(this).val().toLowerCase();
            const filteredUsers = potentialFriends.filter(user => 
                user.username.toLowerCase().includes(query)
            );
            $('#searchResults').empty();
            if (filteredUsers.length > 0) {
                filteredUsers.forEach(friend => {
                    //console.log("friend status", friend.status)
                    $('#searchResults').append(`
                        <div class="list-group-item d-flex justify-content-between align-items-center">
                            ${friend.username}
                            <button class="btn btn-sm modal-button add-friend-btn" data-id="${friend.id}" data-i18n="addFriend">Add Friend</button>
                        </div>
                    `);
                });
            } else {
                $('#searchResults').append('<div class="list-group-item"  data-i18n="noFriendsFound">No friends found</div>');
            }
        });
        $('#searchResults').on('click', '.add-friend-btn', function() {
            const friendId = $(this).data('id');
            const button = $(this);
        
            addFriend(friendId)
                .then(() => {
                    button.replaceWith(`
                        <button class="btn btn-sm modal-button btn-success added-btn" data-i18n="added">Added</button>
                    `);
                })
                .catch(error => {
                    console.error('Error adding friend:', error);
                    alert('Failed to add friend. Please try again.');
                });
        });
    });
}



document.addEventListener('DOMContentLoaded', setupFriendListeners);