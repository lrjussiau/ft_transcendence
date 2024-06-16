

// document.getElementById('register-form').addEventListener('submit', function(event) {
//   event.preventDefault(); // Prevent the default form submit

//   // Gather data from the form
//   var username = document.getElementById('username').value;
//   var email = document.getElementById('email').value;
//   var password = document.getElementById('password').value;

//   // Prepare the data to send in the POST request
//   var data = {
//       username: username,
//       email: email,
//       password_hash: password, // Assume password needs to be hashed server-side
//       avatar_url: "",
//       default_avatar: true,
//       status: "active"
//   };

//   // Use fetch API to send the POST request
//   fetch('http://localhost:8000/api/db/User/', {
//       method: 'POST',
//       headers: {
//           'Content-Type': 'application/json'
//       },
//       body: JSON.stringify(data)  // Convert the JavaScript object to a JSON string
//   })
//   .then(response => response.json())
//   .then(data => {
//       console.log('Success:', data);
//       alert('User created successfully!');
//   })
//   .catch((error) => {
//       console.error('Error:', error);
//       alert('Failed to create user.');
//   });
// });

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
        password: password
    };

    // Use fetch API to send the POST request
    fetch('http://localhost:8000/api/authentication/register/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)  // Convert the JavaScript object to a JSON string
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Something went wrong');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.id) {
            console.log('Success:', data);
            alert('User created successfully!');
        }
    })
    .catch((error) => {
        console.error('Error:', error);
        alert('Failed to create user: ' + error.message);
    });
});
