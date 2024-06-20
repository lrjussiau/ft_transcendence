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
          body: JSON.stringify({ username, password }), // Ensure the payload has username and password
        });

        if (!response.ok) {
          throw new Error("Invalid username or password");
        }

        const data = await response.json();
        localStorage.setItem("authToken", data.access); // Store the access token
        localStorage.setItem("refreshToken", data.refresh); // Store the refresh token
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
