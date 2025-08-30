import React, { useState } from 'react';
import { Search, Plus, Package } from 'lucide-react';
import { apiService } from '../api';
import { userDataService } from '../services/userDataService';

const FindNewEvents = ({ onEventFound }) => {
  const [loading, setLoading] = useState(false);
  const [newEvents, setNewEvents] = useState([]);
  const [lastChecked, setLastChecked] = useState(null);
  const [error, setError] = useState(null);

  const handleFindNewEvents = async () => {
    setLoading(true);
    setError(null);
    setNewEvents([]);

    try {
      // Get current bookmarks to filter out already bookmarked events
      const currentBookmarks = await userDataService.getBookmarks();
      const bookmarkedIds = new Set(currentBookmarks);
      console.log('Current bookmarks:', currentBookmarks);

      // Calculate the date parameters
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000)); // 2 days ago
      const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 days ago
      
      // Format dates as YYYY-MM-DD
      const dateFrom = twoDaysAgo.toISOString().split('T')[0];
      const lastUpdatedFrom = sevenDaysAgo.toISOString().split('T')[0];
      const eventFrom = sevenDaysAgo.toISOString().split('T')[0];
      
      console.log('Date parameters:', { dateFrom, lastUpdatedFrom, eventFrom });

      // Get purchase orders with the correct parameters
      const purchaseParams = {
        orderIds: '',
        shippingMethods: 1,
        dateFrom: dateFrom,
        eventFrom: eventFrom,
        lastUpdatedFrom: lastUpdatedFrom
      };
      
      const purchaseResponse = await apiService.getPurchaseOrders(purchaseParams);
      const purchaseOrders = purchaseResponse?.resultData || [];
      console.log('Purchase orders found:', purchaseOrders.length);

      // Extract listing IDs from purchase orders
      const listingIds = new Set();
      purchaseOrders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            if (item.listingId && item.listingId > 0) {
              listingIds.add(item.listingId);
            }
          });
        }
      });

      console.log('Unique listing IDs:', Array.from(listingIds));

      // Get listing details to extract event IDs
      if (listingIds.size > 0) {
        const listingIdArray = Array.from(listingIds);
        const listingsResponse = await apiService.getListings(null, { listingIds: listingIdArray.join(',') });
        const listings = listingsResponse?.resultData || [];
        console.log('Listings found:', listings.length);
        
        // Extract event IDs from listings and filter out bookmarked events
        const nonBookmarkedEvents = [];
        listings.forEach(listing => {
          if (listing.eventId && !bookmarkedIds.has(listing.eventId.toString())) {
            // Create event object with the information we have
            const event = {
              id: listing.eventId,
              name: listing.eventName,
              date: listing.eventDate,
              venue: { name: listing.venueName },
              section: listing.section,
              quantity: listing.availableNow,
              listingId: listing.id
            };
            nonBookmarkedEvents.push(event);
          }
        });

        console.log('Non-bookmarked events found:', nonBookmarkedEvents.length);
        setNewEvents(nonBookmarkedEvents);
      }

      setLastChecked(new Date());
    } catch (err) {
      console.error('Error finding new events:', err);
      setError('Failed to find new events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToBookmarks = async (eventId) => {
    try {
      const success = await userDataService.addBookmark(eventId);
      if (success) {
        // Remove from new events list
        setNewEvents(prev => prev.filter(event => event.id !== eventId));
        // Trigger callback to refresh bookmarks in parent component
        if (onEventFound) {
          onEventFound();
        }
      }
    } catch (error) {
      console.error('Failed to add bookmark:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Search className="h-6 w-6 text-primary-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">Find New Events</h2>
        </div>
        <button
          onClick={handleFindNewEvents}
          disabled={loading}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Searching...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Find New Events
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {lastChecked && (
        <div className="mb-4 text-sm text-gray-600">
          Last checked: {lastChecked.toLocaleString()}
        </div>
      )}

      {newEvents.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            New Events Found with UPS/FedEx Shipping ({newEvents.length})
          </h3>
          <div className="space-y-3">
            {newEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{event.name}</div>
                  <div className="text-sm text-gray-600">{event.date}</div>
                  <div className="text-sm text-gray-500">{event.venue?.name}</div>
                  <div className="text-sm text-gray-500">Section: {event.section} | Quantity: {event.quantity}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleAddToBookmarks(event.id)}
                    className="bg-green-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-green-700 flex items-center"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add to Bookmarks
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && newEvents.length === 0 && lastChecked && (
        <div className="text-center text-gray-500 py-4">
          <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p>No new events found with UPS/FedEx shipping from recent orders.</p>
        </div>
      )}
    </div>
  );
};

export default FindNewEvents; 