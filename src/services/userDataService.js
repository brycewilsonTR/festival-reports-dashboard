// User data service with backend API and localStorage fallback
class UserDataService {
  constructor() {
    this.username = localStorage.getItem('username') || 'default';
    this.useBackend = true; // Set to false to use localStorage only
    this.baseUrl = 'http://localhost:3001/api/user';
  }

  // Set username for API calls
  setUsername(username) {
    this.username = username;
    localStorage.setItem('username', username);
  }

  // Get username
  getUsername() {
    // Always read from localStorage to get the current value
    return localStorage.getItem('username') || 'default';
  }

  // Helper method to make API calls
  async apiCall(endpoint, options = {}) {
    if (!this.useBackend) {
      throw new Error('Backend not available');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-username': this.username,
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Bookmarks
  async getBookmarks() {
    try {
      if (this.useBackend) {
        const result = await this.apiCall('/bookmarks');
        return result.bookmarks;
      }
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
    }

    // Fallback to localStorage
    try {
      return JSON.parse(localStorage.getItem('bookmarkedEventIds') || '[]');
    } catch {
      return [];
    }
  }

  async addBookmark(eventId) {
    try {
      if (this.useBackend) {
        const result = await this.apiCall('/bookmarks', {
          method: 'POST',
          body: JSON.stringify({ eventId })
        });
        return result.success;
      }
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
    }

    // Fallback to localStorage
    try {
      const bookmarks = JSON.parse(localStorage.getItem('bookmarkedEventIds') || '[]');
      if (!bookmarks.includes(eventId)) {
        bookmarks.push(eventId);
        localStorage.setItem('bookmarkedEventIds', JSON.stringify(bookmarks));
      }
      return true;
    } catch {
      return false;
    }
  }

  async removeBookmark(eventId) {
    try {
      if (this.useBackend) {
        const result = await this.apiCall(`/bookmarks/${eventId}`, {
          method: 'DELETE'
        });
        return result.success;
      }
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
    }

    // Fallback to localStorage
    try {
      const bookmarks = JSON.parse(localStorage.getItem('bookmarkedEventIds') || '[]');
      const filtered = bookmarks.filter(id => id !== eventId);
      localStorage.setItem('bookmarkedEventIds', JSON.stringify(filtered));
      return true;
    } catch {
      return false;
    }
  }

  // Custom marketplace links
  async getCustomMarketplaceLinks(eventId) {
    try {
      if (this.useBackend) {
        const result = await this.apiCall(`/marketplace-links/${eventId}`);
        return result.links;
      }
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
    }

    // Fallback to localStorage
    try {
      const all = JSON.parse(localStorage.getItem('customMarketplaceLinks') || '{}');
      return all[eventId] || {};
    } catch {
      return {};
    }
  }

  async setCustomMarketplaceLink(eventId, marketplaceType, link) {
    try {
      if (this.useBackend) {
        await this.apiCall(`/marketplace-links/${eventId}`, {
          method: 'POST',
          body: JSON.stringify({ marketplaceType, link })
        });
        return true;
      }
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
    }

    // Fallback to localStorage
    try {
      let all = {};
      try { all = JSON.parse(localStorage.getItem('customMarketplaceLinks') || '{}'); } catch {}
      if (!all[eventId]) all[eventId] = {};
      all[eventId][marketplaceType] = link;
      localStorage.setItem('customMarketplaceLinks', JSON.stringify(all));
      return true;
    } catch {
      return false;
    }
  }

  // Custom listing links
  async getCustomListingLinks(listingId) {
    try {
      if (this.useBackend) {
        const result = await this.apiCall(`/listing-links/${listingId}`);
        return result.links;
      }
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
    }

    // Fallback to localStorage
    try {
      const all = JSON.parse(localStorage.getItem('customListingMarketplaceLinks') || '{}');
      return all[listingId] || {};
    } catch {
      return {};
    }
  }

  async setCustomListingLink(listingId, marketplaceType, link) {
    try {
      if (this.useBackend) {
        await this.apiCall(`/listing-links/${listingId}`, {
          method: 'POST',
          body: JSON.stringify({ marketplaceType, link })
        });
        return true;
      }
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
    }

    // Fallback to localStorage
    try {
      let all = {};
      try { all = JSON.parse(localStorage.getItem('customListingMarketplaceLinks') || '{}'); } catch {}
      if (!all[listingId]) all[listingId] = {};
      all[listingId][marketplaceType] = link;
      localStorage.setItem('customListingMarketplaceLinks', JSON.stringify(all));
      return true;
    } catch {
      return false;
    }
  }

  // Manual categories
  async getManualCategories() {
    try {
      if (this.useBackend) {
        const result = await this.apiCall('/manual-categories');
        return result.categories;
      }
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
    }

    // Fallback to localStorage
    try {
      return JSON.parse(localStorage.getItem('manualCategories') || '{}');
    } catch {
      return {};
    }
  }

  async setManualCategory(section, category) {
    try {
      if (this.useBackend) {
        await this.apiCall('/manual-categories', {
          method: 'POST',
          body: JSON.stringify({ section, category })
        });
        return true;
      }
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
    }

    // Fallback to localStorage
    try {
      let categories = {};
      try { categories = JSON.parse(localStorage.getItem('manualCategories') || '{}'); } catch {}
      categories[section] = category;
      localStorage.setItem('manualCategories', JSON.stringify(categories));
      return true;
    } catch {
      return false;
    }
  }

  async deleteManualCategory(section) {
    try {
      if (this.useBackend) {
        await this.apiCall(`/manual-categories/${encodeURIComponent(section)}`, {
          method: 'DELETE'
        });
        return true;
      }
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
    }

    // Fallback to localStorage
    try {
      let categories = {};
      try { categories = JSON.parse(localStorage.getItem('manualCategories') || '{}'); } catch {}
      delete categories[section];
      localStorage.setItem('manualCategories', JSON.stringify(categories));
      return true;
    } catch {
      return false;
    }
  }

  // Autopriced listings
  async getAutopricedListings() {
    try {
      if (this.useBackend) {
        const result = await this.apiCall('/autopriced-listings');
        return result.listings;
      }
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
    }

    // Fallback to localStorage
    try {
      return JSON.parse(localStorage.getItem('autopricedListings') || '{}');
    } catch {
      return {};
    }
  }

  async setAutopricedListing(listingId, isAutopriced) {
    try {
      if (this.useBackend) {
        await this.apiCall(`/autopriced-listings/${listingId}`, {
          method: 'POST',
          body: JSON.stringify({ isAutopriced })
        });
        return true;
      }
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
    }

    // Fallback to localStorage
    try {
      let listings = {};
      try { listings = JSON.parse(localStorage.getItem('autopricedListings') || '{}'); } catch {}
      listings[listingId] = isAutopriced;
      localStorage.setItem('autopricedListings', JSON.stringify(listings));
      return true;
    } catch {
      return false;
    }
  }

  // Listing tags
  async getListingTags() {
    try {
      if (this.useBackend) {
        const result = await this.apiCall('/listing-tags');
        return result.tags;
      }
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
    }

    // Fallback to localStorage
    try {
      return JSON.parse(localStorage.getItem('listingTags') || '{}');
    } catch {
      return {};
    }
  }

  async addListingTag(listingId, tag) {
    try {
      if (this.useBackend) {
        await this.apiCall(`/listing-tags/${listingId}`, {
          method: 'POST',
          body: JSON.stringify({ tag })
        });
        return true;
      }
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
    }

    // Fallback to localStorage
    try {
      let tags = {};
      try { tags = JSON.parse(localStorage.getItem('listingTags') || '{}'); } catch {}
      if (!tags[listingId]) tags[listingId] = [];
      if (!tags[listingId].includes(tag)) {
        tags[listingId].push(tag);
        localStorage.setItem('listingTags', JSON.stringify(tags));
      }
      return true;
    } catch {
      return false;
    }
  }

  async removeListingTag(listingId, tag) {
    try {
      if (this.useBackend) {
        await this.apiCall(`/listing-tags/${listingId}/${encodeURIComponent(tag)}`, {
          method: 'DELETE'
        });
        return true;
      }
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
    }

    // Fallback to localStorage
    try {
      let tags = {};
      try { tags = JSON.parse(localStorage.getItem('listingTags') || '{}'); } catch {}
      if (tags[listingId]) {
        tags[listingId] = tags[listingId].filter(t => t !== tag);
        if (tags[listingId].length === 0) {
          delete tags[listingId];
        }
        localStorage.setItem('listingTags', JSON.stringify(tags));
      }
      return true;
    } catch {
      return false;
    }
  }

  async addBulkListingTags(listingIds, tag) {
    try {
      if (this.useBackend) {
        await this.apiCall('/listing-tags/bulk', {
          method: 'POST',
          body: JSON.stringify({ listingIds, tag })
        });
        return true;
      }
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
    }

    // Fallback to localStorage
    try {
      let tags = {};
      try { tags = JSON.parse(localStorage.getItem('listingTags') || '{}'); } catch {}
      
      for (const listingId of listingIds) {
        if (!tags[listingId]) tags[listingId] = [];
        if (!tags[listingId].includes(tag)) {
          tags[listingId].push(tag);
        }
      }
      
      localStorage.setItem('listingTags', JSON.stringify(tags));
      return true;
    } catch {
      return false;
    }
  }

  // Unverification dates
  async getUnverificationDates() {
    try {
      if (this.useBackend) {
        const result = await this.apiCall('/unverification-dates');
        return result.dates;
      }
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
    }

    // Fallback to localStorage
    try {
      return JSON.parse(localStorage.getItem('unverificationDates') || '{}');
    } catch {
      return {};
    }
  }

  async setUnverificationDate(listingId, unverificationDate) {
    try {
      if (this.useBackend) {
        await this.apiCall(`/unverification-dates/${listingId}`, {
          method: 'POST',
          body: JSON.stringify({ unverificationDate })
        });
        return true;
      }
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
    }

    // Fallback to localStorage
    try {
      let dates = {};
      try { dates = JSON.parse(localStorage.getItem('unverificationDates') || '{}'); } catch {}
      dates[listingId] = unverificationDate;
      localStorage.setItem('unverificationDates', JSON.stringify(dates));
      return true;
    } catch {
      return false;
    }
  }

  async removeUnverificationDate(listingId) {
    try {
      if (this.useBackend) {
        await this.apiCall(`/unverification-dates/${listingId}`, {
          method: 'DELETE'
        });
        return true;
      }
    } catch (error) {
      console.warn('Backend unavailable, using localStorage:', error);
    }

    // Fallback to localStorage
    try {
      let dates = {};
      try { dates = JSON.parse(localStorage.getItem('unverificationDates') || '{}'); } catch {}
      delete dates[listingId];
      localStorage.setItem('unverificationDates', JSON.stringify(dates));
      return true;
    } catch {
      return false;
    }
  }

  // Sync localStorage data to backend (useful for migration)
  async syncToBackend() {
    if (!this.useBackend) return;

    try {
      // Sync bookmarks
      const bookmarks = JSON.parse(localStorage.getItem('bookmarkedEventIds') || '[]');
      for (const eventId of bookmarks) {
        await this.addBookmark(eventId);
      }

      // Sync marketplace links
      const marketplaceLinks = JSON.parse(localStorage.getItem('customMarketplaceLinks') || '{}');
      for (const [eventId, links] of Object.entries(marketplaceLinks)) {
        for (const [type, link] of Object.entries(links)) {
          await this.setCustomMarketplaceLink(eventId, type, link);
        }
      }

      // Sync listing links
      const listingLinks = JSON.parse(localStorage.getItem('customListingMarketplaceLinks') || '{}');
      for (const [listingId, links] of Object.entries(listingLinks)) {
        for (const [type, link] of Object.entries(links)) {
          await this.setCustomListingLink(listingId, type, link);
        }
      }

      // Sync manual categories
      const categories = JSON.parse(localStorage.getItem('manualCategories') || '{}');
      for (const [section, category] of Object.entries(categories)) {
        await this.setManualCategory(section, category);
      }

      // Sync autopriced listings
      const autopricedListings = JSON.parse(localStorage.getItem('autopricedListings') || '{}');
      for (const [listingId, isAutopriced] of Object.entries(autopricedListings)) {
        await this.setAutopricedListing(listingId, isAutopriced);
      }

      // Sync listing tags
      const listingTags = JSON.parse(localStorage.getItem('listingTags') || '{}');
      for (const [listingId, tags] of Object.entries(listingTags)) {
        for (const tag of tags) {
          await this.addListingTag(listingId, tag);
        }
      }

      // Sync unverification dates
      const unverificationDates = JSON.parse(localStorage.getItem('unverificationDates') || '{}');
      for (const [listingId, date] of Object.entries(unverificationDates)) {
        await this.setUnverificationDate(listingId, date);
      }

      console.log('Data synced to backend successfully');
    } catch (error) {
      console.error('Failed to sync data to backend:', error);
    }
  }
}

// Export singleton instance
export const userDataService = new UserDataService(); 