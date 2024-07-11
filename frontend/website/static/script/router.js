// Script to set initial theme based on localStorage
document.addEventListener('DOMContentLoaded', (event) => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
});

// Function to get the current route
function getCurrentRoute() {
  const path = window.location.pathname;
  const route = path.split('/')[1];
  return route;
}

// Function to load HTML partials
async function loadPartial(partial) {
  try {
    const response = await fetch(`/static/partials/${partial}.html`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const html = await response.text();
    const contentDiv = document.getElementById('content');

    if (contentDiv) {
      contentDiv.innerHTML = html;

      const scripts = contentDiv.querySelectorAll('script');
      scripts.forEach(script => {
        const newScript = document.createElement('script');
        newScript.text = script.text;
        document.body.appendChild(newScript).parentNode.removeChild(newScript);
      });
      connectToWebSocket();

      if (partial === 'game' || partial === 'tournament') {
        launchGame();
      }
      if (partial !== 'livechat') {
        setupModalTriggers();
      }
      if (partial === 'bracket') {
        loadBracketView();
      }
      if (partial === 'livechat') {
        setupLiveChat();
      }
      if (partial === 'user') {
        gameHistory();
        defineStats();
        loadUserProfile();
        tournamenIntegrity();
        displayIncomingFriendRequests();
        displayFriends();
        setupFriendListeners();
      }
      if (partial === 'settings') {
        setupSettingsPage();
        setInitialTheme();
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

    } else {
      console.error('#content element not found');
    }
  } catch (error) {
    console.error('Failed to load partial:', error);
    loadPartial('404');
  }
}


function isAuthenticated() {
  return localStorage.getItem('authToken') !== null && localStorage.getItem('authToken') !== undefined;
}

function toggleHeaderDisplay(route) {
  const header = document.querySelector('header');
  if (route === 'home') {
    header.style.display = 'none';
  } else {
    header.style.display = 'block';
  }
}

async function handleRoute(route) {

  switch (route) {
    case 'home':
      toggleHeaderDisplay(route); 
      await loadPartial('home');
      break;
    case 'game':
    case 'user':
    case 'livechat':
    case 'settings':
    case 'canvas':
    case 'tournament':
    case 'bracket':
      if (isAuthenticated()) {
        const ws = WebSocketManager.getWebSocket();
        applyBlurAnimation();
        await new Promise(resolve => setTimeout(resolve, 50));
        toggleHeaderDisplay(route); 
        await loadPartial(route);
      } else {
        localStorage.setItem('initialRoute', '/' + route);
        if (!document.querySelector('.modal.show')) {
          await showModal('loginModal', '/static/modals/modals.html');
        }
      }
      break;
    default:
      await loadPartial('404');
      break;
  }
  setActiveNavItem(route);
}

// Initialize the router
document.addEventListener('DOMContentLoaded', () => {
  let route = getCurrentRoute();
  if (route === '') {
    window.history.pushState({}, '', '/home');
    route = 'home';
  }

  handleRoute(route);

  document.querySelectorAll('button[data-route]').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      const route = button.getAttribute('data-route');
      window.history.pushState({}, '', '/' + route);
      handleRoute(route);
    });
  });

  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', (event) => {
      event.preventDefault();
      Logout();
    });
  }
});


window.addEventListener('popstate', () => {
  const route = getCurrentRoute();
  handleRoute(route);
});

function initializeStartButton() {
  const startButton = document.getElementById('startButton');
  if (startButton) {
    startButton.addEventListener('click', () => {
      if (selectedGameType) {
        startGame();
      } else {
        alert('Please select a game type first.');
      }
    });
  } else {
    console.error('#startButton element not found');
  }
}

async function Logout() {
  try {
    const response = await fetch('/api/authentication/change-status/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({new_status: "offline"})
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
      console.error('Error changing user status:', error);
  }

  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  WebSocketManager.closeWebSocket();

  try {
      const data = await response.json();
    } catch (error) {
        console.error('Error:', error);
    }
  disconnectStatus();
  window.history.pushState({}, '', '/home');
  handleRoute('home');
}

function setActiveNavItem(route) {
  document.querySelectorAll('button[data-route]').forEach(button => {
    if (button.getAttribute('data-route') === route) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}
