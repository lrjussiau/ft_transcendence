document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const errorDiv = document.getElementById("error");
  const registerButton = document.getElementById("register-button");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
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
      window.location.href = "game.html"; 
    } catch (error) {
      errorDiv.textContent = error.message;
    }
  });

  registerButton.addEventListener("click", () => {
    window.location.href = "register.html";
  });
});
