// document.getElementById('register-form').addEventListener('submit', function(event) {
//     event.preventDefault(); // Prevent the default form submit

//     // Gather data from the form
//     var username = document.getElementById('username').value;
//     var email = document.getElementById('email').value;
//     var password = document.getElementById('password').value;

//     // Prepare the data to send in the POST request
//     var data = {
//         username: username,
//         email: email,
//         password: password
//     };

//     // Use fetch API to send the POST request
//     fetch('http://localhost:8000/api/authentication/register/', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify(data)  // Convert the JavaScript object to a JSON string
//     })
//     .then(response => {
//         if (!response.ok) {
//             return response.json().then(data => {
//                 throw new Error(data.error || 'Something went wrong');
//             });
//         }
//         return response.json();
//     })
//     .then(data => {
//         if (data.id) {
//             console.log('Success:', data);
//             alert('User created successfully!');
//         }
//     })
//     .catch((error) => {
//         console.error('Error:', error);
//         alert('Failed to create user: ' + error.message);
//     });
// });


console.log("register.js loaded");

document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM fully loaded and parsed - register.js");
  
    // Set up the register form if the initial route is the register page
    if (getCurrentRoute() === 'register') {
      setupRegisterForm();
    }
  });

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
