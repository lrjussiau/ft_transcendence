function setupUsernameChangeModal() {
    const form = document.getElementById('username-change-form');
    const errorDiv = document.getElementById('username-change-error');

    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        const newUsername = document.getElementById('new-username').value;

        try {
            const response = await fetch('/api/authentication/change-username/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ new_username: newUsername })
            });

            const data = await response.json();

            if (response.ok) {
                hideModal('usernameChangeModal');
                // Update UI or show success message
            } else {
                errorDiv.textContent = data.error || 'An error occurred while changing the username.';
            }
        } catch (error) {
            errorDiv.textContent = 'An error occurred. Please try again.';
        }
    });
}

function setupEmailChangeModal() {
    const form = document.getElementById('email-change-form');
    const errorDiv = document.getElementById('email-change-error');

    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        const newEmail = document.getElementById('new-email').value;

        try {
            const response = await fetch('/api/authentication/change-email/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ new_email: newEmail })
            });

            const data = await response.json();

            if (response.ok) {
                hideModal('emailChangeModal');
                // Update UI or show success message
            } else {
                errorDiv.textContent = data.error || 'An error occurred while changing the email.';
            }
        } catch (error) {
            errorDiv.textContent = 'An error occurred. Please try again.';
        }
    });
}

function setupPasswordChangeModal() {
    const form = document.getElementById('password-change-form');
    const errorDiv = document.getElementById('password-change-error');

    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmNewPassword = document.getElementById('confirm-new-password').value;

        if (newPassword !== confirmNewPassword) {
            errorDiv.textContent = 'New passwords do not match.';
            return;
        }

        try {
            const response = await fetch('/api/authentication/change-password/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
            });

            const data = await response.json();

            if (response.ok) {
                hideModal('passwordChangeModal');
                // Update UI or show success message
            } else {
                errorDiv.textContent = data.error || 'An error occurred while changing the password.';
            }
        } catch (error) {
            errorDiv.textContent = 'An error occurred. Please try again.';
        }
    });
}

function handleThemeToggle(event) {
    const isDarkMode = event.target.checked;
    console.log('Dark mode enabled:', isDarkMode);
    if (isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

function setInitialTheme() {
    const savedTheme = localStorage.getItem('theme');
    console.log('Saved theme:', savedTheme);
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('theme-toggle').checked = true;
    }
}

function handle2FAToggle() {
    fetch('/api/authentication/toggle-2fa/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const button = document.getElementById('toggle-2fa');
            if (data.is_2fa_enabled) {
                button.textContent = 'Disable 2FA';
                button.classList.remove('btn-success');
                button.classList.add('btn-danger');
            } else {
                button.textContent = 'Enable 2FA';
                button.classList.remove('btn-danger');
                button.classList.add('btn-success');
            }
            alert(data.success);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while toggling 2FA');
    });
}

function handleNotificationSettings() {
    const emailNotifications = document.getElementById('email-notifications').checked;
    const pushNotifications = document.getElementById('push-notifications').checked;
    // Implement notification settings update logic here
    console.log('Notification settings:', { email: emailNotifications, push: pushNotifications });
}

function handleLanguageChange() {
    const selectedLanguage = document.getElementById('language-select').value;
    // Implement language change logic here
    console.log('Language changed to:', selectedLanguage);
}

function handleAccountDeletion() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        // Implement account deletion logic here
        console.log('Account deletion requested');
    }
}

// Setup function for the main settings page
function setupSettingsPage() {
    document.getElementById('theme-toggle').addEventListener('change', handleThemeToggle);
    document.getElementById('toggle-2fa').addEventListener('click', handle2FAToggle);
    document.getElementById('apply-notifications').addEventListener('click', handleNotificationSettings);
    document.getElementById('apply-language').addEventListener('click', handleLanguageChange);
    document.getElementById('delete-account').addEventListener('click', handleAccountDeletion);

    fetch('/api/authentication/user/profile/', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        const button = document.getElementById('toggle-2fa');
        if (data.is_2fa_enabled) {
            button.textContent = 'Disable 2FA';
            button.classList.remove('btn-success');
            button.classList.add('btn-danger');
        } else {
            button.textContent = 'Enable 2FA';
            button.classList.remove('btn-danger');
            button.classList.add('btn-success');
        }
    })
    .catch(error => console.error('Error fetching user profile:', error));
}