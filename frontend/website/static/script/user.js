
function updateProfileImage(defaultAvatar, avatarUrl) {
    const imgElement = document.querySelector('.player-img img');
    if (defaultAvatar || !avatarUrl) {
        imgElement.src = 'http://localhost:8080/media/avatars/default_avatar.png';
    } else {
        imgElement.src = decodeURIComponent(avatarUrl);
        console.log('Avatar URL Display:', avatarUrl);
    }
}

async function loadUserProfile() {
    try {
        const data = await fetchUserProfile();
        const usernameElem = document.getElementById('username');
        const defaultAvatarElem = document.getElementById('default_avatar');
        const avatarUrlElem = document.getElementById('avatar_url');
        if (usernameElem) {
            usernameElem.textContent = data.username;
        }
        if (defaultAvatarElem) {
            defaultAvatarElem.textContent = data.default_avatar ? 'true' : 'false';
        }
        if (avatarUrlElem && !data.default_avatar) {
            avatarUrlElem.textContent = data.avatar_url || 'No avatar available';
        }
        updateProfileImage(data.default_avatar, data.avatar_url);
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}
