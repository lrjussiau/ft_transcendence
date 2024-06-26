function setupLoginForm() {
  let isSubmitting = false;

  const form = document.getElementById("login-form");
  const errorDiv = document.getElementById("login-error");
  const initialRoute = localStorage.getItem('initialRoute') || '/home';

  if (form) {
    form.addEventListener("submit", async function(event) {
      event.preventDefault();
      console.log("Form submission prevented");

      if (isSubmitting) return;
      isSubmitting = true;

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
          body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
          throw new Error("Invalid username or password");
        }

        const data = await response.json();
        localStorage.setItem("authToken", data.access);
        localStorage.setItem("refreshToken", data.refresh);
        console.log("Login successful");
        modalClosedByUser = false; // Prevent additional redirection to home
        $('#loginModal').modal('hide');
        window.history.pushState({}, '', initialRoute);
        handleRoute(initialRoute.split('/')[1]);

      } catch (error) {
        console.error("Login error:", error);
        if (errorDiv) {
          errorDiv.textContent = error.message;
        }
      } finally {
        isSubmitting = false;
      }
    }, { once: true });
  } else {
    console.error("Login form not found");
  }
}
