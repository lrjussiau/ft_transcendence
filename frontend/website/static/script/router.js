//import { setupSettingsPage } from './settings.js';
//import { setupSettingsPage } from '.';
//console.log("router.js loaded");



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

      //console.log(`Loaded partial: ${partial}`);

      connectToWebSocket();
      //console.log("Connected to WebSocket");

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
        displayIncomingFriendRequests();
        displayFriends();
        setupFriendListeners();
      }

      if (partial === 'settings') {
        setupSettingsPage();
        setInitialTheme();
      }

      // Call updateContent to translate the newly loaded partial
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
    loadPartial('404'); // Load 404 page in case of an error
  }
}

// Function to check authentication
function isAuthenticated() {
  return localStorage.getItem('authToken') !== null && localStorage.getItem('authToken') !== undefined;
}

// Function to display the header based on the route
function toggleHeaderDisplay(route) {
  const header = document.querySelector('header');
  if (route === 'home') {
    header.style.display = 'none';
  } else {
    header.style.display = 'block';
  }
}

// Function to handle routes
async function handleRoute(route) {
  //console.log("Handling route:", route);

  switch (route) {
    case 'home':
      toggleHeaderDisplay(route); 
      await loadPartial('home');
      //console.log("Loaded home partial");
      break;
    case 'game':
    case 'user':
    case 'livechat':
    case 'settings':
    case 'canvas':
    case 'tournament':
    case 'bracket':
      if (isAuthenticated()) {
        // Apply blur animation
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
  setActiveNavItem(route); // Set the active nav item
}

// Initialize the router
document.addEventListener('DOMContentLoaded', () => {
  let route = getCurrentRoute();
  //console.log("Initial route:", route);
  // Redirect to /home if the route is empty (i.e., root path)
  if (route === '') {
    window.history.pushState({}, '', '/home');
    route = 'home';
  }

  handleRoute(route);

  // Add event listeners to buttons for client-side routing
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
      handleLogout();
    });
  }
});

// Handle browser navigation events
window.addEventListener('popstate', () => {
  const route = getCurrentRoute();
  handleRoute(route);
});

// Helper function to initialize the start button event listener
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

async function handleLogout() {
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
      
  }

  //console.log('Logging out...');
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  window.history.pushState({}, '', '/home');
  try {
      const data = await response.json();
      //console.log(data);
    } catch (error) {
        console.error('Error:', error);
    }
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
