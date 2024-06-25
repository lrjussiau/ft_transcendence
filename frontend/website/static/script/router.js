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

      // Call initializeStartButton if the game partial is loaded
      if (partial === 'game') {
        initializeStartButton();
      }

      // Call setupModalTriggers to ensure modal triggers are set up for dynamically loaded content
      setupModalTriggers();

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
  console.log("Handling route:", route);
  toggleHeaderDisplay(route); // Toggle header display based on route
  switch (route) {
    case 'home':
      await loadPartial('home');
      console.log("Loaded home partial");
      break;
    case 'game':
    case 'user':
      if (isAuthenticated()) {
        await loadPartial(route);
        fetchUserProfile(); // Fetch user profile data
      } else {
        // Store the attempted route and redirect to login
        localStorage.setItem('initialRoute', '/' + route);
        await showModal('loginModal', '/static/modals/modals.html');
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
  console.log("Initial route:", route);
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
      if (selectedGameType === 'local_1v1') {
        startGame();
      } else if (selectedGameType !== 'local_1v1' && selectedGameType) {
        alert('Not Playable yet :(.');
      } else {
        alert('Please select a game type first.');
      }
    });
  } else {
    console.error('#startButton element not found');
  }
}

function handleLogout() {
  console.log('Logging out...');
  localStorage.removeItem('authToken');
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
