function setupAvatarForm() {
    const avatarForm = document.getElementById('avatarForm');
    console.log('Avatar form loaded:', avatarForm !== null);

    if (avatarForm) {
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
                console.log('Success:', data);
                $('#avatarModal').modal('hide');
            } catch (error) {
                console.error('There was a problem with the fetch operation:', error);
            }
        }, { once: true });
    } else {
        console.error('Avatar form not found');
    }
}