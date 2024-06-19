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
    document.getElementById('content').innerHTML = html;
    console.log(`Loaded partial: ${partial}`);
  } catch (error) {
    console.error('Failed to load partial:', error);
    loadPartial('404'); // Load 404 page in case of an error
  }
}

// Function to check authentication
function isAuthenticated() {
  return localStorage.getItem('authToken') !== null;
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
  toggleHeaderDisplay(route);
  switch (route) {
    case 'home':
      await loadPartial('home');
      break;
    case 'login':
      await loadPartial('login');
      setupLoginForm(); // Set up the login form when loading the login partial
      break;
    case 'register':
      await loadPartial('register');
      setupRegisterForm(); // Set up the register form when loading the register partial
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

// Simplified helper functions
function getCurrentRoute() {
  const path = window.location.pathname;
  const route = path.split('/')[1];
  return route;
}

function isAuthenticated() {
  return localStorage.getItem('authToken') !== null;
}

async function loadPartial(partial) {
  try {
    const response = await fetch(`/static/partials/${partial}.html`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const html = await response.text();
    document.getElementById('content').innerHTML = html;
  } catch (error) {
    console.error('Failed to load partial:', error);
    // Load 404 page in case of an error
  }
}
