console.log("login.js loaded");

// Function to set up the login form
function setupLoginForm() {
  let isSubmitting = false; // Debounce flag within the function scope

  const form = document.getElementById("login-form");
  const errorDiv = document.getElementById("login-error");

  // Get the initial route from localStorage or default to home
  const initialRoute = localStorage.getItem('initialRoute') || '/home';

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault(); // Prevent the form from reloading the page
      console.log("Form submission prevented");

      if (isSubmitting) return; // If already submitting, exit
      isSubmitting = true; // Set debounce flag

      if (errorDiv) {
        errorDiv.textContent = "";
      }

      const username = document.getElementById("login-username").value;
      const password = document.getElementById("login-password").value;

      try {
        const response = await fetch("/api/authentication/login/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }), // Ensure the payload has username and password
        });

        if (!response.ok) {
          throw new Error("Invalid username or password");
        }

        const data = await response.json();
        localStorage.setItem("authToken", data.access);
        localStorage.setItem("refreshToken", data.refresh);
        console.log("Login successful");
        hideModal('loginModal');
        // Redirect to the initial route after successful login
        window.history.pushState({}, '', initialRoute);
        handleRoute(initialRoute.split('/')[1]);

      } catch (error) {
        console.error("Login error:", error);
        if (errorDiv) {
          errorDiv.textContent = error.message;
        }
      } finally {
        isSubmitting = false; // Reset debounce flag
      }
    }, { once: true }); // Attach listener only once
  } else {
    console.error("Login form not found");
  }
}
