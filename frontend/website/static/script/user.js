
function updateProfileImage(defaultAvatar, avatarUrl) {
    const imgElement = document.querySelector('.player-img img');
    imgElement.src = decodeURIComponent(avatarUrl);
    //console.log('Avatar URL Display:', avatarUrl);
}

async function loadUserProfile() {
    try {
        const data = await fetchUserProfile();
        if (data === null)
            throw new Error('Failed to fetch user profile');
        const usernameElem = document.getElementById('username');
        if (usernameElem) {
            usernameElem.textContent = data.username;
        }
        updateProfileImage(data.default_avatar, data.avatar);
        displayIncomingFriendRequests();
        displayFriends();
        setupFriendListeners();
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}
