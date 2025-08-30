import React, { useState, useEffect } from 'react';
import { Search, Calendar, MapPin, Star, Clock } from 'lucide-react';
import { apiService } from '../api';
import { userDataService } from '../services/userDataService';
import { groupInventoryByType, groupSalesByType, categorizeSection } from '../utils/sectionCategorizer';

// Helper function to format event name with description
const formatEventName = (event) => {
  const name = event.name || 'Event Name Unavailable';
  const description = event.eventDescription;
  
  if (description && description.trim()) {
    return `${name} - ${description}`;
  }
  
  return name;
};

const EventSearch = ({ onSearch, loading }) => {
  const [eventId, setEventId] = useState('');
  // Bookmarked events state
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [bookmarkedEvents, setBookmarkedEvents] = useState([]);
  const [bookmarkInput, setBookmarkInput] = useState('');
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);
  const [bookmarksError, setBookmarksError] = useState(null);
  const [bookmarkPreviews, setBookmarkPreviews] = useState({}); // { eventId: { GA: diff, GA_PLUS: diff, VIP: diff } }
  const [starredEvents, setStarredEvents] = useState([]); // Array of starred event IDs
  const [presaleEvents, setPresaleEvents] = useState([]); // Array of presale event IDs
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'presale'
  const [manualCategories, setManualCategories] = useState({});
  const [lastUpdatedDates, setLastUpdatedDates] = useState({}); // { eventId: dateString }

  // Load bookmarks from backend/localStorage
  useEffect(() => {
    async function loadBookmarks() {
      try {
        const bookmarks = await userDataService.getBookmarks();
        setBookmarkedIds(bookmarks);
        
        // Load starred events from localStorage
        const starred = JSON.parse(localStorage.getItem('starredEvents') || '[]');
        setStarredEvents(starred);
        
        // Load presale events from localStorage
        const presale = JSON.parse(localStorage.getItem('presaleEvents') || '[]');
        setPresaleEvents(presale);

        // Load manual categories
        const categories = await userDataService.getManualCategories();
        setManualCategories(categories);
        
        // Load last updated dates from localStorage
        const lastUpdated = JSON.parse(localStorage.getItem('lastUpdatedDates') || '{}');
        setLastUpdatedDates(lastUpdated);
      } catch (error) {
        console.error('Failed to load bookmarks:', error);
        setBookmarkedIds([]);
      }
    }
    loadBookmarks();
  }, []);

  // Fetch event details for bookmarked IDs
  useEffect(() => {
    async function fetchBookmarkedEvents() {
      if (!bookmarkedIds.length) {
        setBookmarkedEvents([]);
        setLoadingBookmarks(false);
        return;
      }
      setLoadingBookmarks(true);
      setBookmarksError(null);
      try {
        const eventsResp = await apiService.getEvents({ eventIds: bookmarkedIds.join(',') });
        let events = eventsResp?.resultData || [];
        // Sort by starred status first, then by event date ascending
        events = events.sort((a, b) => {
          const aStarred = starredEvents.includes(a.id.toString());
          const bStarred = starredEvents.includes(b.id.toString());
          
          if (aStarred && !bStarred) return -1;
          if (!aStarred && bStarred) return 1;
          
          return new Date(a.date) - new Date(b.date);
        });
        setBookmarkedEvents(events);
      } catch (err) {
        console.error('Failed to fetch event details:', err);
        setBookmarksError('Failed to load event details, but bookmarks are saved.');
        // Create placeholder events with just the IDs so users can still see their bookmarks
        const placeholderEvents = bookmarkedIds.map(id => ({
          id: id,
          name: `Event ${id}`,
          date: 'Unknown',
          venue: { name: 'Unknown' }
        }));
        setBookmarkedEvents(placeholderEvents);
      } finally {
        setLoadingBookmarks(false);
      }
    }
    fetchBookmarkedEvents();
  }, [bookmarkedIds, starredEvents]);

  // Fetch preview differentials for each bookmarked event
  useEffect(() => {
    async function fetchPreviews() {
      if (bookmarkedIds.length === 0) {
        setBookmarkPreviews({});
        return;
      }

      try {
        // Use batch endpoint to fetch all data at once
        const batchData = await apiService.getBatchEventData(bookmarkedIds);
        
        const previews = {};
        bookmarkedIds.forEach(eventId => {
          try {
            const eventListings = batchData.listings?.resultData?.filter(item => 
              String(item.eventId) === String(eventId)
            ) || [];
            const eventSales = batchData.sales?.resultData?.filter(item => 
              String(item.eventId) === String(eventId)
            ) || [];
            
            // Use the same logic as SectionBreakdown
            const inventoryData = groupInventoryByType(eventListings, manualCategories);
            const adjustedInventoryCategories = { ...inventoryData.categories };
            
            // Apply manual categorization to inventory
            inventoryData.uncategorizedSections.forEach((item) => {
              const manualCat = manualCategories[item.section];
              if (manualCat) {
                adjustedInventoryCategories[manualCat] = (adjustedInventoryCategories[manualCat] || 0) + item.quantity;
              }
            });

            // Build unfilledSalesCategories (same logic as SectionBreakdown)
            const unfilledSalesCategories = {};
            if (eventSales && eventSales.length > 0) {
              (eventSales || []).forEach(sale => {
                (sale.items || []).forEach(item => {
                  // Find the matching listing in inventory
                  const listing = (eventListings || []).find(l => String(l.id) === String(item.listingId));
                  const listingTags = (listing?.tags || []).map(tag => tag.replace(/[-\s]/g, '').toLowerCase());
                  // Use manualCategories if present
                  const section = item.section;
                  const category = manualCategories && manualCategories[section] ? manualCategories[section] : (listing ? categorizeSection(listing.section) : categorizeSection(section));
                  const itemQuantity = item.quantity || item.ticketQuantity || item.availableNow || 1;
                  // Determine status for this sale item using listing tags
                  let isConcern = listingTags.includes('concern') || listingTags.includes('concerned');
                  let isPresale = listingTags.includes('presale') || listingTags.includes('presell') || listingTags.includes('pre-sale');
                  // For differential calculation: only count sales that are NOT filled pending shipment
                  // (i.e., only count presale sales, since filled pending shipment = anything not presale/concern)
                  if (!isConcern && isPresale) {
                    unfilledSalesCategories[category] = (unfilledSalesCategories[category] || 0) + itemQuantity;
                  }
                });
              });
            }

            previews[eventId] = {
              GA: (adjustedInventoryCategories.GA || 0) - (unfilledSalesCategories.GA || 0),
              GA_PLUS: (adjustedInventoryCategories.GA_PLUS || 0) - (unfilledSalesCategories.GA_PLUS || 0),
              VIP: (adjustedInventoryCategories.VIP || 0) - (unfilledSalesCategories.VIP || 0)
            };
          } catch (error) {
            console.error(`Error processing event ${eventId}:`, error);
            previews[eventId] = null;
          }
        });
        
        setBookmarkPreviews(previews);
      } catch (error) {
        console.error('Failed to fetch batch data for previews:', error);
        // Fallback to individual requests if batch fails
        const previews = {};
        await Promise.all(
          bookmarkedIds.map(async (eventId) => {
            try {
              const [inventoryResp, salesResp] = await Promise.all([
                apiService.getListings(eventId),
                apiService.getSalesOrders(eventId)
              ]);
              const inventory = inventoryResp?.resultData || [];
              const sales = salesResp?.resultData || [];
              
              // Use the same logic as SectionBreakdown
              const inventoryData = groupInventoryByType(inventory, manualCategories);
              const adjustedInventoryCategories = { ...inventoryData.categories };
              
              // Apply manual categorization to inventory
              inventoryData.uncategorizedSections.forEach((item) => {
                const manualCat = manualCategories[item.section];
                if (manualCat) {
                  adjustedInventoryCategories[manualCat] = (adjustedInventoryCategories[manualCat] || 0) + item.quantity;
                }
              });

              // Build unfilledSalesCategories (same logic as SectionBreakdown)
              const unfilledSalesCategories = {};
              if (sales && sales.length > 0) {
                (sales || []).forEach(sale => {
                  (sale.items || []).forEach(item => {
                    // Find the matching listing in inventory
                    const listing = (inventory || []).find(l => String(l.id) === String(item.listingId));
                    const listingTags = (listing?.tags || []).map(tag => tag.replace(/[-\s]/g, '').toLowerCase());
                    // Use manualCategories if present
                    const section = item.section;
                    const category = manualCategories && manualCategories[section] ? manualCategories[section] : (listing ? categorizeSection(listing.section) : categorizeSection(section));
                    const itemQuantity = item.quantity || item.ticketQuantity || item.availableNow || 1;
                    // Determine status for this sale item using listing tags
                    let isConcern = listingTags.includes('concern') || listingTags.includes('concerned');
                    let isPresale = listingTags.includes('presale') || listingTags.includes('presell') || listingTags.includes('pre-sale');
                    // For differential calculation: only count sales that are NOT filled pending shipment
                    // (i.e., only count presale sales, since filled pending shipment = anything not presale/concern)
                    if (!isConcern && isPresale) {
                      unfilledSalesCategories[category] = (unfilledSalesCategories[category] || 0) + itemQuantity;
                    }
                  });
                });
              }

              previews[eventId] = {
                GA: (adjustedInventoryCategories.GA || 0) - (unfilledSalesCategories.GA || 0),
                GA_PLUS: (adjustedInventoryCategories.GA_PLUS || 0) - (unfilledSalesCategories.GA_PLUS || 0),
                VIP: (adjustedInventoryCategories.VIP || 0) - (unfilledSalesCategories.VIP || 0)
              };
            } catch {
              previews[eventId] = null;
            }
          })
        );
        setBookmarkPreviews(previews);
      }
    }
    if (bookmarkedIds.length > 0) fetchPreviews();
    else setBookmarkPreviews({});
  }, [bookmarkedIds, starredEvents, manualCategories]);

  const handleAddBookmark = async () => {
    const id = bookmarkInput.trim();
    if (id && !bookmarkedIds.includes(id)) {
      try {
        const success = await userDataService.addBookmark(id);
        if (success) {
          setBookmarkedIds([...bookmarkedIds, id]);
          setBookmarkInput('');
        }
      } catch (error) {
        console.error('Failed to add bookmark:', error);
      }
    }
  };

  const handleRemoveBookmark = async (id) => {
    if (window.confirm('Are you sure you want to remove this bookmark?')) {
      try {
        const success = await userDataService.removeBookmark(id);
        if (success) {
          setBookmarkedIds(bookmarkedIds.filter(eid => eid !== id));
          // Also remove from starred events if it was starred
          setStarredEvents(starredEvents.filter(eid => eid !== id.toString()));
          localStorage.setItem('starredEvents', JSON.stringify(starredEvents.filter(eid => eid !== id.toString())));
          // Also remove from presale events if it was in presale
          setPresaleEvents(presaleEvents.filter(eid => eid !== id.toString()));
          localStorage.setItem('presaleEvents', JSON.stringify(presaleEvents.filter(eid => eid !== id.toString())));
        }
      } catch (error) {
        console.error('Failed to remove bookmark:', error);
      }
    }
  };

  const handleToggleStar = (eventId) => {
    const eventIdStr = eventId.toString();
    const newStarredEvents = starredEvents.includes(eventIdStr)
      ? starredEvents.filter(id => id !== eventIdStr)
      : [...starredEvents, eventIdStr];
    
    setStarredEvents(newStarredEvents);
    localStorage.setItem('starredEvents', JSON.stringify(newStarredEvents));
  };

  const handleTogglePresale = (eventId) => {
    const eventIdStr = eventId.toString();
    const newPresaleEvents = presaleEvents.includes(eventIdStr)
      ? presaleEvents.filter(id => id !== eventIdStr)
      : [...presaleEvents, eventIdStr];
    
    setPresaleEvents(newPresaleEvents);
    localStorage.setItem('presaleEvents', JSON.stringify(newPresaleEvents));
  };

  const handleUpdateLastUpdated = (eventId) => {
    const eventIdStr = eventId.toString();
    const now = new Date();
    const dateString = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    const newLastUpdatedDates = {
      ...lastUpdatedDates,
      [eventIdStr]: dateString
    };
    
    setLastUpdatedDates(newLastUpdatedDates);
    localStorage.setItem('lastUpdatedDates', JSON.stringify(newLastUpdatedDates));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (eventId.trim()) {
      onSearch(eventId.trim());
    }
  };

  // Get currently loaded event ID from the search (if any)
  const currentEventId = eventId.trim();

  // Filter events based on active tab
  const getFilteredEvents = () => {
    if (activeTab === 'presale') {
      return bookmarkedEvents.filter(event => presaleEvents.includes(event.id.toString()));
    }
    return bookmarkedEvents; // 'all' tab shows all events
  };

  const filteredEvents = getFilteredEvents();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center mb-4">
        <Calendar className="h-6 w-6 text-primary-600 mr-2" />
        <h2 className="text-xl font-semibold text-gray-900">Event Dashboard</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="eventId" className="block text-sm font-medium text-gray-700 mb-2">
            Event ID
          </label>
          <div className="flex">
            <input
              type="text"
              id="eventId"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              placeholder="Enter event ID (e.g., 98564)"
              className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !eventId.trim()}
              className="bg-primary-600 text-white px-4 py-2 rounded-r-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Loading...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Bookmark current event button */}
      {currentEventId && !bookmarkedIds.includes(currentEventId) && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={async () => {
              try {
                const success = await userDataService.addBookmark(currentEventId);
                if (success) {
                  setBookmarkedIds([...bookmarkedIds, currentEventId]);
                }
              } catch (error) {
                console.error('Failed to add bookmark:', error);
              }
            }}
            className="bg-green-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-green-700"
          >
            Bookmark This Event
          </button>
        </div>
      )}
      
      {/* Bookmarked Events Section */}
      <div className="mt-8">
        <h3 className="text-md font-semibold text-gray-900 mb-2">Bookmarked Events</h3>
        <div className="flex space-x-2 mb-4">
          <input
            type="text"
            value={bookmarkInput}
            onChange={e => setBookmarkInput(e.target.value)}
            placeholder="Add event ID (e.g., 98564)"
            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={handleAddBookmark}
            className="bg-primary-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-primary-700"
            disabled={!bookmarkInput.trim() || bookmarkedIds.includes(bookmarkInput.trim())}
          >
            Add
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Events ({bookmarkedEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('presale')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center ${
              activeTab === 'presale'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Clock className="h-4 w-4 mr-1" />
            Presale ({presaleEvents.length})
          </button>
        </div>

        {loadingBookmarks ? (
          <div className="text-gray-500">Loading events...</div>
        ) : bookmarksError ? (
          <div className="text-red-500">{bookmarksError}</div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-gray-500">
            {activeTab === 'presale' ? 'No presale events.' : 'No bookmarked events.'}
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto bg-gray-50 rounded-lg border border-gray-200">
            <ul className="divide-y divide-gray-200">
              {filteredEvents.map((event) => {
                const isStarred = starredEvents.includes(event.id.toString());
                const isPresale = presaleEvents.includes(event.id.toString());
                return (
                  <li key={event.id} className="p-4 flex justify-between items-center group cursor-pointer hover:bg-blue-50 transition"
                    onClick={() => {
                      setEventId(event.id.toString());
                      onSearch(event.id.toString());
                    }}
                  >
                    <div className="flex-1 min-w-0 flex items-start">
                      <button
                        className="mr-3 mt-1 text-yellow-500 hover:text-yellow-600 transition-colors z-10"
                        onClick={e => { e.stopPropagation(); handleToggleStar(event.id); }}
                        title={isStarred ? "Unstar event" : "Star event"}
                      >
                        <Star 
                          className={`h-5 w-5 ${isStarred ? 'fill-current' : 'fill-none'}`} 
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-900 group-hover:text-primary-700 truncate">{formatEventName(event)}</div>
                        <div className="text-sm text-gray-600 truncate">{event.date}</div>
                        <div className="text-sm text-gray-500 truncate">{event.venue?.name || ''}</div>
                      </div>
                    </div>
                    {bookmarkPreviews[event.id] && (
                      <div className="flex space-x-2 ml-4 text-xs">
                        {['GA', 'GA_PLUS', 'VIP'].map(type => {
                          const val = bookmarkPreviews[event.id][type];
                          const sign = val > 0 ? '+' : val < 0 ? '-' : '';
                          const absVal = Math.abs(val);
                          const label = type === 'GA_PLUS' ? 'GA+' : type;
                          return (
                            <span key={type} className="bg-gray-100 rounded px-2 py-1">
                              {label}: <span className="font-semibold">{sign}{absVal}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Last Updated Button */}
                    <div className="flex flex-col items-end ml-4">
                      <button
                        className="text-xs border rounded px-2 py-1 z-10 transition-colors bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200"
                        onClick={e => { e.stopPropagation(); handleUpdateLastUpdated(event.id); }}
                        title="Update last checked time"
                      >
                        {lastUpdatedDates[event.id.toString()] ? `Updated: ${lastUpdatedDates[event.id.toString()]}` : 'Set Last Updated'}
                      </button>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        className={`text-xs border rounded px-2 py-1 z-10 transition-colors ${
                          isPresale 
                            ? 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200' 
                            : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                        }`}
                        onClick={e => { e.stopPropagation(); handleTogglePresale(event.id); }}
                        title={isPresale ? "Remove from presale" : "Add to presale"}
                      >
                        <Clock className="h-3 w-3 inline mr-1" />
                        {isPresale ? 'Presale' : 'Add Presale'}
                      </button>
                      <button
                        className="text-red-500 hover:text-red-700 text-xs border border-red-200 rounded px-2 py-1 z-10"
                        onClick={e => { e.stopPropagation(); handleRemoveBookmark(event.id); }}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <div className="flex items-start">
          <MapPin className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">How to use:</p>
            <p>Enter an event ID to view inventory and sales data for that specific event.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventSearch; 