// User management service for admin operations
class UserManagementService {
  constructor() {
    this.baseUrl = 'https://web-production-b1147.up.railway.app/api/admin/users';
  }

  // Get auth token from auth service
  getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Get all users (admin only)
  async getAllUsers() {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  // Create new user (admin only)
  async createUser(userData) {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Update user (admin only)
  async updateUser(userId, userData) {
    try {
      const response = await fetch(`${this.baseUrl}/${userId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Delete user (admin only)
  async deleteUser(userId) {
    try {
      const response = await fetch(`${this.baseUrl}/${userId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Change user password (admin only)
  async changeUserPassword(userId, newPassword) {
    try {
      const response = await fetch(`${this.baseUrl}/${userId}/password`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ password: newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change password');
      }

      return await response.json();
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  // Toggle user admin status (admin only)
  async toggleAdminStatus(userId) {
    try {
      const response = await fetch(`${this.baseUrl}/${userId}/admin`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to toggle admin status');
      }

      return await response.json();
    } catch (error) {
      console.error('Error toggling admin status:', error);
      throw error;
    }
  }

  // Change user password (admin only)
  async changeUserPassword(userId, newPassword) {
    try {
      const response = await fetch(`${this.baseUrl}/${userId}/password`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ password: newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change password');
      }

      return await response.json();
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const userManagementService = new UserManagementService(); 