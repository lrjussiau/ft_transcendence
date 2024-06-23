console.log("register.js loaded");

// Function to set up the register form
function setupRegisterForm() {
  let isSubmitting = false; // Debounce flag within the function scope

  const form = document.getElementById("register-form");
  const errorDiv = document.getElementById("register-error");

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault(); // Prevent the form from reloading the page
      console.log("Form submission prevented");

      if (isSubmitting) return; // If already submitting, exit
      isSubmitting = true; // Set debounce flag

      if (errorDiv) {
        errorDiv.textContent = "";
      }

      const username = document.getElementById("register-username").value;
      console.log("Username:", username);
      const email = document.getElementById("register-email").value;
      const password = document.getElementById("register-password").value;

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

        // Show the login modal after successful registration
        hideModal('registerModal');
        showModal('loginModal', '/static/modals/auth.html');

      } catch (error) {
        console.error("Registration error:", error);
        if (errorDiv) {
          errorDiv.textContent = error.message;
        }
      } finally {
        isSubmitting = false; // Reset debounce flag
      }
    }, { once: true }); // Attach listener only once
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
