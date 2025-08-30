import { apiService } from '../api.js';

class VerificationService {
  constructor() {
    this.baseUrl = '/api/global'; // Fixed to match server endpoints
  }

  // Helper method to make API calls (no authentication needed for global endpoints)
  async makeApiCall(method, url, data = null) {
    try {
      switch (method.toLowerCase()) {
        case 'get':
          return await apiService.get(url);
        case 'post':
          // For POST requests without data, send an empty object instead of null
          const postData = data || {};
          return await apiService.post(url, postData);
        case 'delete':
          return await apiService.delete(url);
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }
    } catch (error) {
      console.error(`Error in ${method.toUpperCase()} request to ${url}:`, error);
      throw error;
    }
  }

  // Verification mapped listings
  async getVerificationMappedListings() {
    try {
      const response = await this.makeApiCall('get', `${this.baseUrl}/verification-mapped-listings`);
      return response.mappedListings || [];
    } catch (error) {
      console.error('Error fetching verification mapped listings:', error);
      return [];
    }
  }

  async addVerificationMappedListing(listingId) {
    try {
      await this.makeApiCall('post', `${this.baseUrl}/verification-mapped-listings/${listingId}`);
      return true;
    } catch (error) {
      console.error('Error adding verification mapped listing:', error);
      return false;
    }
  }

  async removeVerificationMappedListing(listingId) {
    try {
      await this.makeApiCall('delete', `${this.baseUrl}/verification-mapped-listings/${listingId}`);
      return true;
    } catch (error) {
      console.error('Error removing verification mapped listing:', error);
      return false;
    }
  }

  // Verification strategy listings
  async getVerificationStrategyListings() {
    try {
      const response = await this.makeApiCall('get', `${this.baseUrl}/verification-strategy-listings`);
      return response.strategyListings || [];
    } catch (error) {
      console.error('Error fetching verification strategy listings:', error);
      return [];
    }
  }

  async addVerificationStrategyListing(listingId) {
    try {
      await this.makeApiCall('post', `${this.baseUrl}/verification-strategy-listings/${listingId}`);
      return true;
    } catch (error) {
      console.error('Error adding verification strategy listing:', error);
      return false;
    }
  }

  async removeVerificationStrategyListing(listingId) {
    try {
      await this.makeApiCall('delete', `${this.baseUrl}/verification-strategy-listings/${listingId}`);
      return true;
    } catch (error) {
      console.error('Error removing verification strategy listing:', error);
      return false;
    }
  }

  // Verification strategy dates
  async getVerificationStrategyDates() {
    try {
      const response = await this.makeApiCall('get', `${this.baseUrl}/verification-strategy-dates`);
      return response.strategyDates || {};
    } catch (error) {
      console.error('Error fetching verification strategy dates:', error);
      return {};
    }
  }

  async setVerificationStrategyDate(listingId, strategyDate) {
    try {
      await this.makeApiCall('post', `${this.baseUrl}/verification-strategy-dates/${listingId}`, {
        strategyDate
      });
      return true;
    } catch (error) {
      console.error('Error setting verification strategy date:', error);
      return false;
    }
  }

  async removeVerificationStrategyDate(listingId) {
    try {
      await this.makeApiCall('delete', `${this.baseUrl}/verification-strategy-dates/${listingId}`);
      return true;
    } catch (error) {
      console.error('Error removing verification strategy date:', error);
      return false;
    }
  }

  // Three day mapped listings
  async getThreeDayMappedListings() {
    try {
      const response = await this.makeApiCall('get', `${this.baseUrl}/three-day-mapped-listings`);
      return response.mappedListings || [];
    } catch (error) {
      console.error('Error fetching three day mapped listings:', error);
      return [];
    }
  }

  async addThreeDayMappedListing(listingId) {
    try {
      await this.makeApiCall('post', `${this.baseUrl}/three-day-mapped-listings/${listingId}`);
      return true;
    } catch (error) {
      console.error('Error adding three day mapped listing:', error);
      return false;
    }
  }

  async removeThreeDayMappedListing(listingId) {
    try {
      await this.makeApiCall('delete', `${this.baseUrl}/three-day-mapped-listings/${listingId}`);
      return true;
    } catch (error) {
      console.error('Error removing three day mapped listing:', error);
      return false;
    }
  }

  // Three day strategy listings
  async getThreeDayStrategyListings() {
    try {
      const response = await this.makeApiCall('get', `${this.baseUrl}/three-day-strategy-listings`);
      return response.strategyListings || [];
    } catch (error) {
      console.error('Error fetching three day strategy listings:', error);
      return [];
    }
  }

  async addThreeDayStrategyListing(listingId) {
    try {
      await this.makeApiCall('post', `${this.baseUrl}/three-day-strategy-listings/${listingId}`);
      return true;
    } catch (error) {
      console.error('Error adding three day strategy listing:', error);
      return false;
    }
  }

  async removeThreeDayStrategyListing(listingId) {
    try {
      await this.makeApiCall('delete', `${this.baseUrl}/three-day-strategy-listings/${listingId}`);
      return true;
    } catch (error) {
      console.error('Error removing three day strategy listing:', error);
      return false;
    }
  }

  // Starred festival mapped listings
  async getStarredFestivalMappedListings() {
    try {
      const response = await this.makeApiCall('get', `${this.baseUrl}/starred-festival-mapped-listings`);
      return response.mappedListings || [];
    } catch (error) {
      console.error('Error fetching starred festival mapped listings:', error);
      return [];
    }
  }

  async addStarredFestivalMappedListing(eventId) {
    try {
      await this.makeApiCall('post', `${this.baseUrl}/starred-festival-mapped-listings/${eventId}`);
      return true;
    } catch (error) {
      console.error('Error adding starred festival mapped listing:', error);
      return false;
    }
  }

  async removeStarredFestivalMappedListing(eventId) {
    try {
      await this.makeApiCall('delete', `${this.baseUrl}/starred-festival-mapped-listings/${eventId}`);
      return true;
    } catch (error) {
      console.error('Error removing starred festival mapped listing:', error);
      return false;
    }
  }

  // Starred festival strategy listings
  async getStarredFestivalStrategyListings() {
    try {
      const response = await this.makeApiCall('get', `${this.baseUrl}/starred-festival-strategy-listings`);
      return response.strategyListings || [];
    } catch (error) {
      console.error('Error fetching starred festival strategy listings:', error);
      return [];
    }
  }

  async addStarredFestivalStrategyListing(eventId) {
    try {
      await this.makeApiCall('post', `${this.baseUrl}/starred-festival-strategy-listings/${eventId}`);
      return true;
    } catch (error) {
      console.error('Error adding starred festival strategy listing:', error);
      return false;
    }
  }

  async removeStarredFestivalStrategyListing(eventId) {
    try {
      await this.makeApiCall('delete', `${this.baseUrl}/starred-festival-strategy-listings/${eventId}`);
      return true;
    } catch (error) {
      console.error('Error removing starred festival strategy listing:', error);
      return false;
    }
  }

  // Starred festival strategy dates
  async getStarredFestivalStrategyDates() {
    try {
      const response = await this.makeApiCall('get', `${this.baseUrl}/starred-festival-strategy-dates`);
      return response.strategyDates || {};
    } catch (error) {
      console.error('Error fetching starred festival strategy dates:', error);
      return {};
    }
  }

  async setStarredFestivalStrategyDate(eventId, strategyDate) {
    try {
      await this.makeApiCall('post', `${this.baseUrl}/starred-festival-strategy-dates/${eventId}`, {
        strategyDate
      });
      return true;
    } catch (error) {
      console.error('Error setting starred festival strategy date:', error);
      return false;
    }
  }

  async removeStarredFestivalStrategyDate(eventId) {
    try {
      await this.makeApiCall('delete', `${this.baseUrl}/starred-festival-strategy-dates/${eventId}`);
      return true;
    } catch (error) {
      console.error('Error removing starred festival strategy date:', error);
      return false;
    }
  }
}

export const verificationService = new VerificationService(); 