// Authentication service for user login and management
class AuthService {
  constructor() {
    this.baseUrl = 'https://web-production-b1147.up.railway.app/api/auth';
    this.currentUser = null;
    this.isAuthenticated = false;
    this.isAdmin = false;
    
    // Check for existing session on initialization
    this.checkAuthStatus();
  }

  // Check if user is already authenticated
  async checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        this.currentUser = user;
        this.isAuthenticated = true;
        this.isAdmin = user.isAdmin || false;
        return true;
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        this.logout();
        return false;
      }
    }
    return false;
  }

  // Login with email and password
  async login(email, password) {
    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      
      // Store authentication data
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userData', JSON.stringify(data.user));
      
      // Update service state
      this.currentUser = data.user;
      this.isAuthenticated = true;
      this.isAdmin = data.user.isAdmin || false;
      
      return data.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Logout user
  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    this.currentUser = null;
    this.isAuthenticated = false;
    this.isAdmin = false;
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if user is authenticated
  getIsAuthenticated() {
    return this.isAuthenticated;
  }

  // Check if user is admin
  getIsAdmin() {
    return this.isAdmin;
  }

  // Get auth token for API calls
  getAuthToken() {
    return localStorage.getItem('authToken');
  }

  // Update user data (for profile updates)
  updateUserData(userData) {
    this.currentUser = userData;
    localStorage.setItem('userData', JSON.stringify(userData));
  }
}

// Export singleton instance
export const authService = new AuthService(); 