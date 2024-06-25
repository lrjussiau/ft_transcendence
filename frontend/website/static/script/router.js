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
      break;
    case 'login':
    case 'register':
      await loadPartial(route);
      break;
    case 'user':
    case 'game':
      if (isAuthenticated()) {
        await loadPartial(route);
      } else {
        localStorage.setItem('initialRoute', `/${route}`);
        window.history.pushState({}, '', '/login');
        await loadPartial('login');
      }
      break;
    default:
      await loadPartial('404');
      break;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  let route = getCurrentRoute();
  if (route === '') {
    window.history.pushState({}, '', '/home');
    route = 'home';
  }
  handleRoute(route);

  document.querySelectorAll('a[data-link]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const href = link.getAttribute('href');
      window.history.pushState({}, '', href);
      handleRoute(href.split('/')[1]);
    });
  });
});

window.addEventListener('popstate', () => {
  handleRoute(getCurrentRoute());
});
