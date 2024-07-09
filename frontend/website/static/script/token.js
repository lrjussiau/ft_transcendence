// Function to decode JWT token
function parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }
  
  // Function to check if the token is expired
  function isTokenExpired(token) {
    if (!token) return true;
  
    const decoded = parseJwt(token);
    if (!decoded) return true;
  
    const exp = decoded.exp * 1000;
    return Date.now() >= exp;
  }
  
  // Function to refresh the token
  async function refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;
  
    try {
      const response = await fetch('/api/authentication/token/refresh/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }
  
      const data = await response.json();
      localStorage.setItem('authToken', data.access);
      localStorage.setItem('refreshToken', data.refresh);
  
      return data.access;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }
  
  // Function to check and refresh the token if needed
  async function checkAndRefreshToken() {
    //console.log('Checking token...');
    let token = localStorage.getItem('authToken');
  
    if (isTokenExpired(token)) {
      token = await refreshToken();
      if (!token) {
        // Token refresh failed, remove authToken and redirect to home
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        window.history.pushState({}, '', '/home');
        handleRoute('home');
        return null;
      }
    }
  
    return token;
  }
  
  // Call checkAndRefreshToken at regular intervals (e.g., every 4 minutes)
  setInterval(checkAndRefreshToken, 1 * 60 * 1000);
  