function setupLoginForm() {
  let isSubmitting = false;

  const form = document.getElementById("login-form");
  const errorDiv = document.getElementById("login-error");
  const initialRoute = localStorage.getItem('initialRoute') || '/home';

  if (form) {
    form.addEventListener("submit", async function(event) {
      event.preventDefault();
      //console.log("Form submission prevented");

      if (isSubmitting) return;
      isSubmitting = true;

      if (errorDiv) {
        errorDiv.textContent = "";
      }

      const username = document.getElementById("login-username").value;
      const password = document.getElementById("login-password").value;

      try {
        await handleLogin(username, password);
      } catch (Error) {
        console.error("Login error:", Error);
        if (errorDiv) {
          if (Error.message === "Invalid username or password") {
            errorDiv.textContent = i18next.t("invalidPassword");
          }
          else {
            errorDiv.textContent = i18next.t("loginFailed");
          }
        }
      } finally {
        isSubmitting = false;
      }
    });
  } else {
    console.error("Login form not found");
  }
}

async function handleLogin(username, password) {
  try {
    const response = await fetch("/api/authentication/login/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Invalid username or password");
    }

    if (data.require_2fa) {
      // Show 2FA verification modal
      await hideModal('loginModal');
      await showModal('twoFAVerificationModal', '/static/modals/modals.html');
      setup2FAVerificationForm(username);
    } else {
      // Normal login flow
      handleSuccessfulLogin(data);
    }
  } catch (error) {
    console.error("Login error:", error);
    throw error; // Re-throw the error to be caught in setupLoginForm
  }
}

function setup2FAVerificationForm(username) {
  const form = document.getElementById("twoFA-verification-form");
  const errorDiv = document.getElementById("twoFA-error");

  form.addEventListener("submit", async function(event) {
    event.preventDefault();

    const code = document.getElementById("twoFA-code").value;

    try {
      const response = await fetch("/api/authentication/verify-2fa/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid 2FA code");
      }

      handleSuccessfulLogin(data);

    } catch (error) {
      console.error("2FA verification error:", error);
      if (errorDiv) {
        errorDiv.textContent = i18next.t("expiredCode");
      }
    }
  });
}

function handleSuccessfulLogin(data) {
  localStorage.setItem("authToken", data.access);
  localStorage.setItem("refreshToken", data.refresh);
  modalClosedByUser = false;
  hideModal('loginModal');
  hideModal('twoFAVerificationModal');
  
  const initialRoute = localStorage.getItem('initialRoute') || '/home';
  
  window.history.pushState({}, '', initialRoute);
  handleRoute(initialRoute.split('/')[1]);
  
  localStorage.removeItem('initialRoute');
}