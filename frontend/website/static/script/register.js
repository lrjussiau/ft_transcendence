console.log("register.js loaded");

// Function to set up the register form
function setupRegisterForm() {
  const form = document.getElementById("register-form");
  const errorDiv = document.getElementById("error");

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault(); // Prevent the form from reloading the page
      console.log("Form submission prevented");
      errorDiv.textContent = "";

      const username = document.getElementById("username").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      try {
        const response = await fetch("/api/authentication/register/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, email, password }),
        });

        if (!response.ok) {
          throw new Error("Registration failed");
        }

        console.log("Registration successful");

        // Redirect to the login page after successful registration
        window.history.pushState({}, '', '/login');
        handleRoute('login');

      } catch (error) {
        console.error("Registration error:", error);
        errorDiv.textContent = error.message;
      }
    });
  } else {
    console.error("Registration form not found");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed - register.js");

  // Set up the register form if the initial route is the register page
  if (getCurrentRoute() === 'register') {
    setupRegisterForm();
  }
});