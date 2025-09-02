// Service for managing excluded sales from performance metrics
class ExcludedSalesService {
  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/excluded-sales` : 'http://localhost:3001/api/excluded-sales';
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

  // Get all excluded sales for the current user
  async getExcludedSales() {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch excluded sales');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching excluded sales:', error);
      throw error;
    }
  }

  // Exclude a sale from performance metrics
  async excludeSale(saleId, itemIndex) {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ saleId, itemIndex }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to exclude sale');
      }

      return await response.json();
    } catch (error) {
      console.error('Error excluding sale:', error);
      throw error;
    }
  }

  // Include a sale back in performance metrics
  async includeSale(saleId, itemIndex) {
    try {
      const response = await fetch(`${this.baseUrl}/${saleId}/${itemIndex}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to include sale');
      }

      return await response.json();
    } catch (error) {
      console.error('Error including sale:', error);
      throw error;
    }
  }

  // Check if a sale item is excluded
  async isSaleExcluded(saleId, itemIndex) {
    try {
      const excludedSales = await this.getExcludedSales();
      return excludedSales.some(excluded => 
        excluded.saleId === saleId && excluded.itemIndex === itemIndex
      );
    } catch (error) {
      console.error('Error checking if sale is excluded:', error);
      return false;
    }
  }
}

// Export singleton instance
export const excludedSalesService = new ExcludedSalesService();
