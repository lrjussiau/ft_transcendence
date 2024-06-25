console.log("router.js loaded");

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

      console.log(`Loaded partial: ${partial}`);

      if (partial === 'game') {
        initializeStartButton();
        fetchUserProfile(); // Ensure user profile is fetched when game partial is loaded
      }
    } else {
      console.error('#content element not found');
    }
  } catch (error) {
    console.error('Failed to load partial:', error);
    await loadPartial('404'); // Load 404 page in case of an error
  }
}

// Function to check authentication
function isAuthenticated() {
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.warn('No auth token found');
    return false;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const isExpired = payload.exp * 1000 < Date.now();
    if (isExpired) {
      console.warn('Auth token is expired');
      return false;
    }
    return true;
  } catch (error) {
    console.error('Invalid auth token', error);
    return false;
  }
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
  console.log("Handling route:", route);
  toggleHeaderDisplay(route); // Toggle header display based on route
  switch (route) {
    case 'home':
      await loadPartial('home');
      console.log("Loaded home partial");
      break;
    case 'login':
      await loadPartial('login');
      setupLoginForm(); // Set up the login form when loading the login partial
      break;
    case 'register':
      console.log("Loading register partial");
      await loadPartial('register');
      setupRegisterForm(); // Set up the register form when loading the register partial
      break;
    case 'user':
      if (isAuthenticated()) {
        await loadPartial('user');
        fetchUserProfile(); // Fetch user profile data
      } else {
        // Store the attempted route and redirect to login
        localStorage.setItem('initialRoute', '/user');
        window.history.pushState({}, '', '/login');
        await loadPartial('login');
        setupLoginForm(); // Set up the login form when loading the login partial
      }
      break;
    case 'game':
      if (isAuthenticated()) {
        await loadPartial('game');
      } else {
        // Store the attempted route and redirect to login
        localStorage.setItem('initialRoute', '/game');
        window.history.pushState({}, '', '/login');
        await loadPartial('login');
        setupLoginForm(); // Set up the login form when loading the login partial
      }
      break;
    default:
      await loadPartial('404');
      break;
  }
}

// Initialize the router
document.addEventListener('DOMContentLoaded', () => {
  let route = getCurrentRoute();
  console.log("Initial route:", route);
  // Redirect to /home if the route is empty (i.e., root path)
  if (route === '') {
    window.history.pushState({}, '', '/home');
    route = 'home';
  }

  handleRoute(route);

  // Add event listeners to links for client-side routing
  document.querySelectorAll('a[data-link]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const href = link.getAttribute('href');
      window.history.pushState({}, '', href);
      handleRoute(href.split('/')[1]);
    });
  });
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
      const player2Name = document.getElementById('player2-name') ? document.getElementById('player2-name').value : null;
      if (selectedGameType) {
        startGame(selectedGameType, player2Name);
      } else {
        alert('Please select a game type first.');
      }
    });
  } else {
    console.error('#startButton element not found');
  }
}
