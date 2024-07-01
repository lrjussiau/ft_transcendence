function setupRegisterForm() {
  let isSubmitting = false;

  const form = document.getElementById("register-form");
  const errorDiv = document.getElementById("register-error");

  if (form) {
    form.addEventListener("submit", async function(event) {
      event.preventDefault();
      console.log("Form submission prevented");

      if (isSubmitting) return;
      isSubmitting = true;

      if (errorDiv) {
        errorDiv.textContent = "";
      }

      const username = document.getElementById("register-username").value;
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

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Registration failed");
        }

        console.log("Registration successful");
        window.transitionToModal('registerModal', 'loginModal', '/static/modals/modals.html');

      } catch (error) {
        console.error("Registration error:", error);
        if (errorDiv) {
          errorDiv.textContent = error.message;
        }
      } finally {
        isSubmitting = false;
      }
    });
  } else {
    console.error("Registration form not found");
  }
}

function setupRegisterButton() {
  const registerButton = document.getElementById('register-button');
  if (registerButton) {
    registerButton.addEventListener('click', (event) => {
      event.preventDefault();
      console.log('Register button clicked');
      window.transitionToModal('loginModal', 'registerModal', '/static/modals/modals.html');
    });
  } else {
    console.error('#register-button element not found');
  }
}