document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("authToken");
  
    if (!token) {
      window.location.href = "index.html"; // Redirect to login if not authenticated
    }
  
    document.getElementById("logout").addEventListener("click", () => {
      localStorage.removeItem("authToken");
      window.location.href = "index.html"; // Redirect to login on logout
    });
  });
  