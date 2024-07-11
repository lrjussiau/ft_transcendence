function setupRegisterForm() {
  let isSubmitting = false;

  const form = document.getElementById("register-form");
  const errorDiv = document.getElementById("register-error");

  if (form) {
    form.addEventListener("submit", async function(event) {
      event.preventDefault();

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
        window.transitionToModal('registerModal', 'loginModal', '/static/modals/modals.html');
      } catch (error) {
        console.error("Registration error:", error);
        if (errorDiv) {
          if (error.message === "This email is already registered.") {
            errorDiv.textContent = i18next.t('emailAlreadyRegistred');
          }
          else if (error.message === "This username is already taken.") {
            errorDiv.textContent = i18next.t('usernameAlreadyTaken');
          }
          else {
            errorDiv.textContent = "Registration failed";
            console.error("Registration failed : ", error.message);
          }
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
      window.transitionToModal('loginModal', 'registerModal', '/static/modals/modals.html');
    });
  } else {
    console.error('#register-button element not found');
  }
}