// document.addEventListener("DOMContentLoaded", () => {
//   const form = document.getElementById("login-form");
//   const errorDiv = document.getElementById("error");
//   const registerButton = document.getElementById("register-button");

//   form.addEventListener("submit", async (event) => {
//     event.preventDefault();
//     errorDiv.textContent = "";

//     const username = document.getElementById("username").value;
//     const password = document.getElementById("password").value;
//     try {
//       const response = await fetch("/api/authentication/auth/", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ username, password }),
//       });

//       if (!response.ok) {
//         throw new Error("Invalid username or password");
//       }

//       const data = await response.json();
//       localStorage.setItem("authToken", data.token);
//       window.location.href = "game.html"; 
//     } catch (error) {
//       errorDiv.textContent = error.message;
//     }
//   });

//   registerButton.addEventListener("click", () => {
//     window.location.href = "register.html";
//   });
// });


document.getElementById('login-form').addEventListener('submit', function(event) {
  event.preventDefault(); // Prevent the default form submit

  // Gather data from the form
  var username = document.getElementById('username').value;
  var email = document.getElementById('email').value;
  var password = document.getElementById('password').value;

  // Prepare the data to send in the POST request
  var data = {
      username: username,
      email: email,
      password_hash: password, // Assume password needs to be hashed server-side
      avatar_url: "",
      default_avatar: true,
      status: "active"
  };

  // Use fetch API to send the POST request
  fetch('http://localhost:8000/api/db/User/', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)  // Convert the JavaScript object to a JSON string
  })
  .then(response => response.json())
  .then(data => {
      console.log('Success:', data);
      alert('User created successfully!');
  })
  .catch((error) => {
      console.error('Error:', error);
      alert('Failed to create user.');
  });
});
