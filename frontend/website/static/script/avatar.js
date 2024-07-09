function setupAvatarForm() {
    const avatarForm = document.getElementById('avatarForm');
    //console.log('Avatar form loaded:', avatarForm !== null);

    if (avatarForm) {
        const fileInput = document.querySelector('.file-input');
        const fileNameDisplay = document.querySelector('.file-name');

        fileInput.addEventListener('change', function() {
          const fileName = this.files[0] ? this.files[0].name : 'No file selected';
          fileNameDisplay.textContent = fileName;
        });

        avatarForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            const formData = new FormData(avatarForm);
            const token = localStorage.getItem('authToken');

            try {
                const response = await fetch('/api/authentication/upload-avatar/', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok.');
                }

                const data = await response.json();
                //console.log('Success:', data);
                $('#avatarModal').modal('hide');
            } catch (error) {
                console.error('There was a problem with the fetch operation:', error);
            }
        }, { once: true });
    } else {
        console.error('Avatar form not found');
    }
}
    if (document.querySelector('.custom-button') !== null) {
        document.querySelector('.custom-button').addEventListener('click', function() {
        document.querySelector('.file-input').click();
    });
}

async function listAvatars() {
    const avatarForm = document.getElementById('avatarForm');

    if (avatarForm) {
        try {
            const response = await fetch('/api/authentication/list-avatars/', {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('authToken'),
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            const avatarListDiv = document.getElementById('avatarList');
            avatarListDiv.innerHTML = '';

            if (data.files.length > 0) {
                data.files.forEach(file => {
                    const playerDiv = document.createElement('button');
                    playerDiv.className = 'avatar-img';

                    const img = document.createElement('img');
                    img.src = decodeURIComponent(file);
                    img.alt = 'Avatar';

                    playerDiv.appendChild(img);
                    avatarListDiv.appendChild(playerDiv);

                    playerDiv.addEventListener('click', function() {
                        document.querySelectorAll('.avatar-img').forEach(btn => {
                            btn.classList.remove('selected');
                        });
                        playerDiv.classList.add('selected');
                    });
                });
            } else {
                avatarListDiv.innerHTML = 'No avatars found.';
            }
        } catch (error) {
            console.error('Error fetching avatar list:', error);
        }
    }
}

function setupChangeAvatar() {
    const changeAvatarButton = document.getElementById('changeAvatar');
    if (changeAvatarButton) {
        changeAvatarButton.addEventListener('click', async function() {
            const selectedAvatarButton = document.querySelector('.avatar-img.selected img');
            if (!selectedAvatarButton) {
                avatarError.textContent = 'Please select an avatar first.';
                return;
            }

            const avatarUrl = selectedAvatarButton.src;
            const relativeAvatarPath = avatarUrl.replace(window.location.origin + '/media/', '');

            const formData = new FormData();
            formData.append('avatar', relativeAvatarPath);

            const token = localStorage.getItem('authToken');

            try {
                const response = await fetch('/api/authentication/change-avatar/', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok.');
                }

                const data = await response.json();
                //console.log('Success:', data);
                $('#avatarModal').modal('hide');
                loadUserProfile();
            } catch (error) {
                console.error('There was a problem with the fetch operation:', error);
            }
        });
    }
}



// Call the function to list avatars when the page loads
document.addEventListener('DOMContentLoaded', listAvatars);
