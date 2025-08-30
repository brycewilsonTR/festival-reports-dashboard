import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:3001/api';

// Retry configuration
const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second

// Retry function with exponential backoff
const retryRequest = async (fn, retries = MAX_RETRIES) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && error.response?.status === 429) {
      const retryAfter = error.response?.data?.retryAfter || 2;
      const delay = retryAfter * 1000;
      
      console.log(`Rate limited, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return retryRequest(fn, retries - 1);
    }
    throw error;
  }
};

// Create axios instance with default headers
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for automatic retry on rate limits
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 429 && error.config && !error.config._retry) {
      error.config._retry = true;
      const retryAfter = error.response?.data?.retryAfter || 2;
      const delay = retryAfter * 1000;
      
      console.log(`Rate limited, automatically retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return api.request(error.config);
    }
    return Promise.reject(error);
  }
);

// Add request interceptor to add small delays between requests
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100; // 100ms minimum between requests

api.interceptors.request.use(
  (config) => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const delay = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      return new Promise(resolve => {
        setTimeout(() => {
          lastRequestTime = Date.now();
          resolve(config);
        }, delay);
      });
    }
    
    lastRequestTime = now;
    return config;
  },
  (error) => Promise.reject(error)
);

// API service functions
export const apiService = {
  // Generic HTTP methods
  get: async (url, config = {}) => {
    try {
      const response = await api.get(url, config);
      return response.data;
    } catch (error) {
      console.error('Error in GET request:', error);
      throw error;
    }
  },

  post: async (url, data = {}, config = {}) => {
    try {
      const response = await api.post(url, data, config);
      return response.data;
    } catch (error) {
      console.error('Error in POST request:', error);
      throw error;
    }
  },

  put: async (url, data = {}, config = {}) => {
    try {
      const response = await api.put(url, data, config);
      return response.data;
    } catch (error) {
      console.error('Error in PUT request:', error);
      throw error;
    }
  },

  delete: async (url, config = {}) => {
    try {
      const response = await api.delete(url, config);
      return response.data;
    } catch (error) {
      console.error('Error in DELETE request:', error);
      throw error;
    }
  },

  // Get events
  getEvents: async (params = {}) => {
    try {
      const response = await api.get('/v1/events', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  },

  // Get event by ID
  getEventById: async (eventId) => {
    try {
      const response = await api.get(`/v1/events`, {
        params: { eventIds: eventId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching event:', error);
      throw error;
    }
  },

  // Get listings (inventory) for an event
  getListings: async (eventId, options = {}) => {
    try {
      const params = { ...options };
      if (eventId) params.eventIds = eventId;
      const response = await api.get('/v1/listings', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching listings:', error);
      throw error;
    }
  },

  // Get external ZeroHero listings for purchase data
  getExternalListings: async (eventId) => {
    try {
      const response = await api.get('/v1/external/listings', { 
        params: { eventIds: eventId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching external listings:', error);
      throw error;
    }
  },

  // Get available listings with date filtering
  getAvailableListings: async (params = {}) => {
    try {
      console.log('getAvailableListings called with params:', params);
      console.log('Params type:', typeof params);
      console.log('Params is array:', Array.isArray(params));
      
      // Ensure params is an object
      if (typeof params !== 'object' || params === null) {
        console.warn('getAvailableListings received non-object params, converting to object');
        params = { eventDateFrom: params };
      }
      
      const apiParams = { onlyAvailable: 1, ...params };
      console.log('Final apiParams:', apiParams);
      const response = await api.get('/v1/listings', { params: apiParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching available listings:', error);
      throw error;
    }
  },

  // Get sales orders for an event
  getSalesOrders: async (eventId) => {
    try {
      const response = await api.get('/v1/orders/sales', {
        params: { eventIds: eventId }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching sales orders:', error);
      throw error;
    }
  },

  // Get all sales orders with date filtering for performance analysis
  getSalesPerformance: async (dateFrom = null, dateTo = null) => {
    try {
      const params = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      
      console.log('Fetching sales data with parameters:', params);
      
      const response = await api.get('/v1/orders/sales', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching sales performance data:', error);
      throw error;
    }
  },

  // Get purchase orders
  getPurchaseOrders: async (params = {}) => {
    try {
      const response = await api.get('/v1/orders/purchase', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      throw error;
    }
  },

  // Get comprehensive dashboard data for an event
  getEventDashboard: async (eventId) => {
    try {
      // Use batch endpoint to reduce API calls
      const response = await api.get('/v1/batch/event-data', { 
        params: { eventIds: eventId } 
      });

      const event = response.data?.events?.resultData?.[0] || null;
      const inventory = response.data?.listings?.resultData || [];
      const sales = response.data?.sales?.resultData || [];

      // Count all inventory, excluding presale/pre-sale/presell
      const inventoryCount = inventory.filter(item => {
        const tags = (item.tags || []).map(tag => tag.replace(/[-\s]/g, '').toLowerCase());
        return !tags.some(t => t === 'presale' || t === 'presell' || t === 'presale');
      }).reduce((total, item) => total + (item.availableNow || 0), 0);
      // Calculate total tickets sold (sum of all item quantities in all sales), excluding presale/pre-sale/presell
      const salesCount = sales.reduce((total, sale) => {
        if (!Array.isArray(sale.items)) return total;
        return total + sale.items.reduce((sum, item) => {
          const tags = (item.tags || []).map(tag => tag.replace(/[-\s]/g, '').toLowerCase());
          if (tags.some(t => t === 'presale' || t === 'presell' || t === 'presale')) return sum;
          return sum + (item.quantity || item.ticketQuantity || item.availableNow || 1);
        }, 0);
      }, 0);

      return {
        event,
        inventory: inventory, // Return all inventory data for breakdown
        sales: sales, // Return all sales data for breakdown
        inventoryCount,
        salesCount
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  },

  // Batch method to fetch multiple event data in one request
  getBatchEventData: async (eventIds) => {
    try {
      const response = await api.get('/v1/batch/event-data', { 
        params: { eventIds: Array.isArray(eventIds) ? eventIds.join(',') : eventIds } 
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching batch event data:', error);
      throw error;
    }
  },

  // Create a new listing
  createListing: async (listingData) => {
    try {
      const response = await api.post('/v1/listings', listingData);
      return response.data;
    } catch (error) {
      console.error('Error creating listing:', error);
      throw error;
    }
  },

  updateListingTags: async (listingId, tags, replaceTags = false) => {
    try {
      const response = await axios.put(
        `/api/v1/listings/${listingId}/tags`,
        { tags, replaceTags },
        {
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating listing tags:', error);
      throw error;
    }
  },
};

export default apiService; 