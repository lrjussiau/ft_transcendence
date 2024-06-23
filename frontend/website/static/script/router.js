console.log("router.js loaded");

function getCurrentRoute() {
  const path = window.location.pathname;
  const route = path.split('/')[1];
  return route;
}

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
  return localStorage.getItem('authToken') !== null;
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
  console.log("Handling route:", route);
  if (!isAuthenticated() && (route === 'user' || route === 'game')) {
    console.log("User not authenticated, showing login modal");
    showModal('loginModal');
    localStorage.setItem('requestedRoute', route); // Store the requested route
    return; // Exit the function without changing the URL or loading a new partial
  }

  toggleHeaderDisplay(route);
  switch (route) {
    case 'home':
      await loadPartial('home');
      console.log("Loaded home partial");
      setupModalTriggers();
      break;
    case 'login':
      showModal('loginModal');
      break;
    case 'register':
      showModal('registerModal');
      break;
    case 'user':
      await loadPartial('user');
      fetchUserProfile();
      break;
    case 'game':
      await loadPartial('game');
      break;
    default:
      await loadPartial('404');
      break;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  let route = getCurrentRoute();
  console.log("Initial route:", route);
  if (route === '') {
    window.history.pushState({}, '', '/home');
    route = 'home';
  }

  handleRoute(route);

  document.querySelectorAll('a[data-link]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const href = link.getAttribute('href');
      const targetRoute = href.split('/')[1];
      if (isAuthenticated() || targetRoute === 'home' || targetRoute === 'login' || targetRoute === 'register') {
        window.history.pushState({}, '', href);
        handleRoute(targetRoute);
      } else {
        showModal('loginModal');
        localStorage.setItem('requestedRoute', targetRoute); // Store the requested route
      }
    });
  });
});

window.addEventListener('popstate', () => {
  const route = getCurrentRoute();
  handleRoute(route);
});

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

async function showModal(modalName) {
  try {
    console.log(`Loading modal: ${modalName}`);
    const response = await fetch(`/static/partials/auth.html`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const html = await response.text();
    const modalContainer = document.getElementById('modal-container');

    if (modalContainer) {
      modalContainer.innerHTML = html;
      $(`#${modalName}`).modal('show');
      console.log(`${modalName} is now shown`);

      setupModalTriggers();
    } else {
      console.error('#modal-container element not found');
    }
  } catch (error) {
    console.error('Failed to load modal:', error);
  }
}

function setupModalTriggers() {
  console.log("Setting up modal triggers");

  const registerButton = document.getElementById('register-button');
  if (registerButton) {
    registerButton.addEventListener('click', () => {
      console.log('Register button clicked');
      $('#loginModal').modal('hide'); // Hide the login modal first
      $('#registerModal').modal('show'); // Show the register modal
    });
  } else {
    console.error('#register-button element not found');
  }

  const loginModalTrigger = document.getElementById('loginModalTrigger');
  if (loginModalTrigger) {
    loginModalTrigger.addEventListener('click', () => {
      console.log('Login modal trigger clicked');
      showModal('loginModal');
    });
  } else {
    console.error('#loginModalTrigger element not found');
  }
}

function setupLoginForm() {
  console.log('Setting up login form');
  document.getElementById('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    // Simulate login process and store the token
    localStorage.setItem('authToken', 'dummy-token');
    const requestedRoute = localStorage.getItem('requestedRoute');
    if (requestedRoute) {
      window.history.pushState({}, '', `/${requestedRoute}`);
      handleRoute(requestedRoute);
      localStorage.removeItem('requestedRoute'); // Clear the stored route
    } else {
      window.history.pushState({}, '', '/home');
      handleRoute('home');
    }
    $('#loginModal').modal('hide');
  });
}

function setupRegisterForm() {
  console.log('Setting up register form');
  // Add any additional setup for the register form here
}
