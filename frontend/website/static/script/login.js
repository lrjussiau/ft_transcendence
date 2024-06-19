console.log("login.js loaded");

// Function to set up the login form
function setupLoginForm() {
  const form = document.getElementById("login-form");
  const errorDiv = document.getElementById("error");

  // Get the initial route from localStorage or default to home
  const initialRoute = localStorage.getItem('initialRoute') || '/home';

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault(); // Prevent the form from reloading the page
      console.log("Form submission prevented");
      errorDiv.textContent = "";

      const username = document.getElementById("username").value;
      const password = document.getElementById("password").value;

      try {
        const response = await fetch("/api/authentication/login/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
          throw new Error("Invalid username or password");
        }

        const data = await response.json();
        localStorage.setItem("authToken", data.token);
        console.log("Login successful");

        // Redirect to the initial route after successful login
        window.history.pushState({}, '', initialRoute);
        handleRoute(initialRoute.split('/')[1]);

      } catch (error) {
        console.error("Login error:", error);
        errorDiv.textContent = error.message;
      }
    });
  } else {
    console.error("Login form not found");
  }
}

// document.addEventListener("DOMContentLoaded", () => {
//   console.log("DOM fully loaded and parsed");

//   // Set up the login form if the initial route is the login page
//   if (getCurrentRoute() === 'login') {
//     setupLoginForm();
//   }

//   // Handle the route initially
//   const route = getCurrentRoute();
//   handleRoute(route);

//   // Add event listeners to links for client-side routing
//   document.querySelectorAll('a[data-link]').forEach(link => {
//     link.addEventListener('click', event => {
//       event.preventDefault();
//       const href = link.getAttribute('href');
//       window.history.pushState({}, '', href);
//       handleRoute(href.split('/')[1]);
//     });
//   });

//   // Handle browser navigation events
//   window.addEventListener('popstate', () => {
//     const route = getCurrentRoute();
//     handleRoute(route);
//   });
// });

// // Function to handle routing (simplified for the example)
// async function handleRoute(route) {
//   console.log("Handling route:", route);
//   switch (route) {
//     case 'home':
//       await loadPartial('home');
//       break;
//     case 'login':
//       await loadPartial('login');
//       setupLoginForm(); // Set up the login form when loading the login partial
//       break;
//     case 'game':
//       if (isAuthenticated()) {
//         await loadPartial('game');
//       } else {
//         // Store the attempted route and redirect to login
//         localStorage.setItem('initialRoute', '/game');
//         window.history.pushState({}, '', '/login');
//         await loadPartial('login');
//         setupLoginForm(); // Set up the login form when loading the login partial
//       }
//       break;
//     default:
//       await loadPartial('home');
//       break;
//   }
// }

// // Simplified helper functions
// function getCurrentRoute() {
//   const path = window.location.pathname;
//   const route = path.split('/')[1];
//   return route;
// }

// function isAuthenticated() {
//   return localStorage.getItem('authToken') !== null;
// }

// async function loadPartial(partial) {
//   try {
//     const response = await fetch(`/static/partials/${partial}.html`);
//     if (!response.ok) {
//       throw new Error('Network response was not ok');
//     }
//     const html = await response.text();
//     document.getElementById('content').innerHTML = html;
//   } catch (error) {
//     console.error('Failed to load partial:', error);
//     // Load 404 page in case of an error
//   }
// }
