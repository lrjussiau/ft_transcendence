document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("register-form");
    const errorDiv = document.getElementById("error");
  
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      errorDiv.textContent = ""; // Clear previous error message
  
      const username = document.getElementById("username").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
  
      try {
        // Sending the registration data to the backend
        const response = await fetch("/api/authentication/create/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, email, password }),
        });
  
        // Handling the response from the backend
        if (!response.ok) {
          throw new Error("Registration failed");
        }

        console.log("User registered:", { username, email, password });
        window.location.href = "../auth.html"; // Redirect to login page after successful registration
      } catch (error) {
        errorDiv.textContent = error.message; // Display error message
      }
    });
  });
  