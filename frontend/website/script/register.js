// document.addEventListener("DOMContentLoaded", () => {
//     const form = document.getElementById("register-form");
//     const errorDiv = document.getElementById("error");
  
//     form.addEventListener("submit", async (event) => {
//       event.preventDefault();
//       errorDiv.textContent = ""; // Clear previous error message
  
//       const username = document.getElementById("username").value;
//       const email = document.getElementById("email").value;
//       const password = document.getElementById("password").value;
  
//       try {
//         // Sending the registration data to the backend
//         const response = await fetch("/api/authentication/create/", {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify({ username, email, password }),
//         });
  
//         // Handling the response from the backend
//         if (!response.ok) {
//           throw new Error("Registration failed");
//         }

//         console.log("User registered:", { username, email, password });
//         window.location.href = "../auth.html"; // Redirect to login page after successful registration
//       } catch (error) {
//         errorDiv.textContent = error.message; // Display error message
//       }
//     });
//   });
  

document.getElementById('register-form').addEventListener('submit', function(event) {
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
