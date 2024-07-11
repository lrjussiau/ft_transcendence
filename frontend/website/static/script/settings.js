
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
            } else {
                errorDiv.textContent = i18next.t('usernameAlreadyTaken');
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
            } else {
                errorDiv.textContent = i18next.t('emailAlreadyRegistred');
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
            errorDiv.textContent = i18next.t("passwordNoMatch");
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
                errorDiv.textContent = i18next.t("wrongPassword");
            }
        } catch (error) {
            errorDiv.textContent = 'An error occurred. Please try again.';
        }
    });
}

function handleThemeToggle(event) {
    const isDarkMode = event.target.checked;
    //console.log('Dark mode enabled:', isDarkMode);
    if (isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

function setInitialTheme() {
    const savedTheme = localStorage.getItem('theme');
    //console.log('Saved theme:', savedTheme);
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
                button.textContent = i18next.t('disable2FA');
                button.classList.remove('validate-btn');
                button.classList.add('refuse-btn');
            } else {
                button.textContent = i18next.t('enable2FA');
                button.classList.remove('refuse-btn');
                button.classList.add('validate-btn');
            }
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
    //console.log('Notification settings:', { email: emailNotifications, push: pushNotifications });
}

function handleLanguageChange() {
    const selectedLanguage = document.getElementById('language-select').value;
    
    i18next.changeLanguage(selectedLanguage, (err, t) => {
        if (err) {
            console.error('Error changing language:', err);
            return;
        }
        
        updateContent();
        document.documentElement.lang = selectedLanguage;
        localStorage.setItem('i18nextLng', selectedLanguage);
        document.body.className = document.body.className.replace(/lang-\w+/, '');
        document.body.classList.add(`lang-${selectedLanguage}`);
        //console.log('Language changed to:', selectedLanguage);
    });
}

function initializeLanguageSelector() {
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        languageSelect.value = i18next.language;
        languageSelect.addEventListener('change', handleLanguageChange);
    }
}


function setupDeleteAccountModal() {
    const form = document.getElementById('delete-account-form');
    const errorDiv = document.getElementById('delete-account-error');

    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        const password = document.getElementById('delete-account-password').value;

        try {
            const response = await fetch('/api/authentication/delete-account/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ password: password })
            });

            const data = await response.json();

            if (response.ok) {
                // Account deleted successfully
                localStorage.removeItem('authToken');
                localStorage.removeItem('refreshToken');
                alert('Your account has been deleted successfully.');
                window.location.href = '/home'; // Redirect to home page
            } else {
                errorDiv.textContent = data.error || 'An error occurred while deleting the account.';
            }
        } catch (error) {
            console.error('Error:', error);
            errorDiv.textContent = 'An unexpected error occurred. Please try again.';
        }
    });
}

// Setup function for the main settings page
function setupSettingsPage() {
    document.getElementById('theme-toggle').addEventListener('change', handleThemeToggle);
    document.getElementById('toggle-2fa').addEventListener('click', handle2FAToggle);
    document.getElementById('apply-notifications').addEventListener('click', handleNotificationSettings);
    //document.getElementById('apply-language').addEventListener('click', handleLanguageChange);

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
            button.classList.remove('validate-btn');
            button.classList.add('refuse-btn');
        } else {
            button.textContent = 'Enable 2FA';
            button.classList.remove('refuse-btn');
            button.classList.add('validate-btn');
        }
    })
    .catch(error => console.error('Error fetching user profile:', error));

}
