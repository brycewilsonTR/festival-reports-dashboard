import React, { useState, useEffect } from 'react';
import { Tag, Plus, X, Filter, CheckSquare, Square } from 'lucide-react';
import { apiService } from '../api';
import { userDataService } from '../services/userDataService';

const AvailableListings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedListings, setSelectedListings] = useState([]);
  const [sortField, setSortField] = useState('eventDate');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filterTag, setFilterTag] = useState('');
  const [excludeTag, setExcludeTag] = useState('');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkTag, setBulkTag] = useState('');
  const [tags, setTags] = useState({});
  const [newTags, setNewTags] = useState({}); // Individual tag inputs for each listing

  // Load listings and tags on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get today's date in YYYY-MM-DD format for the API
      const today = new Date();
      const dateFrom = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      today.setHours(0, 0, 0, 0); // Set to midnight for comparison
      
      console.log('Fetching available listings from date:', dateFrom);
      
      // Use the new API method to get available listings with date filtering
      const response = await apiService.getAvailableListings({ eventDateFrom: dateFrom });
      const allAvailableListings = response.resultData || [];
      
      console.log('Available listings fetched from API:', allAvailableListings.length);
      
      // Additional client-side filtering to ensure only future events
      
      const availableListings = allAvailableListings.filter(listing => {
        if (!listing.eventDate) {
          console.log('Listing without event date:', listing.id, listing.eventName);
          return true; // Include listings without event dates
        }
        
        try {
          const eventDate = new Date(listing.eventDate);
          eventDate.setHours(0, 0, 0, 0);
          const isFutureEvent = eventDate >= today;
          
          if (!isFutureEvent) {
            console.log('Filtering out past event:', listing.id, listing.eventName, listing.eventDate);
          }
          
          return isFutureEvent;
        } catch (error) {
          console.warn('Invalid event date for listing:', listing.id, listing.eventDate);
          return true; // Include if date is invalid
        }
      });
      
      console.log('Available listings after future date filtering:', availableListings.length);
      if (availableListings.length > 0) {
        console.log('Sample future available listing:', availableListings[0]);
      }
      
      setListings(availableListings);
      
      // Load tags
      const userTags = await userDataService.getListingTags();
      setTags(userTags);
    } catch (err) {
      setError(err.message);
      console.error('Error loading listings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = async (listingId, tag) => {
    if (!tagItem.trim()) return;
    try {
      // Get current tags from the listing (API tags)
      const listing = listings.find(listingItem => listingItem.id === listingId);
      const currentTags = Array.isArray(listing.tags) ? listing.tags : [];
      const newTagsArr = [...new Set([...currentTags, tagItem.trim()])];

      await apiService.updateListingTags(listingId, newTagsArr, false);

      // Update local state to reflect the new tag
      setListings(listings =>
        listings.map(l =>
          listingItem.id === listingId ? { ...l, tags: newTagsArr } : l
        )
      );
      setNewTags(prev => ({ ...prev, [listingId]: '' }));
    } catch (err) {
      console.error('Error adding tag:', err);
    }
  };

  const handleRemoveTag = async (listingId, tag) => {
    try {
      await userDataService.removeListingTag(listingId, tag);
      const updatedTags = { ...tags };
      if (updatedTags[listingId]) {
        updatedTags[listingId] = updatedTags[listingId].filter(t => t !== tag);
        if (updatedTags[listingId].length === 0) {
          delete updatedTags[listingId];
        }
      }
      setTags(updatedTags);
    } catch (err) {
      console.error('Error removing tag:', err);
    }
  };

  const handleBulkAddTag = async () => {
    if (!bulkTag.trim() || selectedListings.length === 0) return;
    
    try {
      // Loop through each selected listing and make individual API calls
      for (const listingId of selectedListings) {
        try {
          // Get current tags from the listing (API tags)
          const listing = listings.find(listingItem => listingItem.id === listingId);
          const currentTags = Array.isArray(listing.tags) ? listing.tags : [];
          const newTagsArr = [...new Set([...currentTags, bulkTag.trim()])];

          // Make individual API call for each listing
          await apiService.updateListingTags(listingId, newTagsArr, false);

          // Update local state to reflect the new tag
          setListings(listings =>
            listings.map(l =>
              listingItem.id === listingId ? { ...l, tags: newTagsArr } : l
            )
          );
        } catch (err) {
          console.error(`Error adding tag to listing ${listingId}:`, err);
          // Continue with other listings even if one fails
        }
      }
      
      setBulkTag('');
      setSelectedListings([]);
      setShowBulkActions(false);
    } catch (err) {
      console.error('Error adding bulk tags:', err);
    }
  };

  const toggleListingSelection = (listingId) => {
    setSelectedListings(prev => 
      prev.includes(listingId) 
        ? prev.filter(id => id !== listingId)
        : [...prev, listingId]
    );
  };

  const toggleSelectAll = () => {
    const filteredListings = getFilteredListings();
    if (selectedListings.length === filteredListings.length) {
      setSelectedListings([]);
    } else {
      setSelectedListings(filteredListings.map(l => l.id));
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedListings = (listingsToSort) => {
    return [...listingsToSort].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'eventDate':
          aValue = a.eventDate ? new Date(a.eventDate).getTime() : 0;
          bValue = b.eventDate ? new Date(b.eventDate).getTime() : 0;
          break;
        case 'eventName':
          aValue = (a.eventName || '').toLowerCase();
          bValue = (b.eventName || '').toLowerCase();
          break;
        case 'section':
          aValue = (a.section || '').toLowerCase();
          bValue = (b.section || '').toLowerCase();
          break;
        case 'availableNow':
          aValue = a.availableNow || 0;
          bValue = b.availableNow || 0;
          break;
        case 'price':
          aValue = parseFloat(a.price || 0);
          bValue = parseFloat(b.price || 0);
          break;
        default:
          return 0;
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  };

  const getFilteredListings = () => {
    let filtered = listings.filter(listing => {
      // Filter by exclude tags
      if (excludeTag) {
        const excludeTags = excludeTag.split(',').map(tagItem => tagItem.trim().toUpperCase());
        const listingTags = tags[listing.id] || [];
        return !listingTags.some(tag => excludeTags.includes(tagItem.toUpperCase()));
      }
      return true;
    });
    
    if (filterTag) {
      filtered = filtered.filter(listing => {
        const listingTags = tags[listing.id] || [];
        return listingTags.some(tag => 
          tag.toLowerCase().includes(filterTag.toLowerCase())
        );
      });
    }
    
    return getSortedListings(filtered);
  };

  const formatEventName = (listing) => {
    const name = listing.eventName || 'Event Name Unavailable';
    const description = listing.eventDescription;
    
    if (description && description.trim()) {
      return `${name} - ${description}`;
    }
    
    return name;
  };

  const formatEventDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      // Format as MM/DD/YYYY
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getSortIndicator = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  const SortableHeader = ({ field, children }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
    >
      {children}
      <span className="text-xs text-gray-400">
        {getSortIndicator(field)}
      </span>
    </button>
  );

  const filteredListings = getFilteredListings();

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading listings: {error}</p>
        <button 
          onClick={loadData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Available Listings</h2>
          <p className="text-gray-600">
            {filteredListings.length} of {listings.length} available listings (today and future events)
          </p>
        </div>
        <button
          onClick={() => setShowBulkActions(!showBulkActions)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Tag className="w-4 h-4" />
          Bulk Tag
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Filter by tag..."
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        {filterTag && (
          <button
            onClick={() => setFilterTag('')}
            className="px-2 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Clear
          </button>
        )}

        {/* Exclude Tag Input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Exclude tags (comma-separated)..."
            value={excludeTag}
            onChange={(e) => setExcludeTag(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          {excludeTag && (
            <button
              onClick={() => setExcludeTag('')}
              className="px-2 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {showBulkActions && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Enter tag to add to selected listings..."
              value={bulkTag}
              onChange={(e) => setBulkTag(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleBulkAddTag}
              disabled={!bulkTag.trim() || selectedListings.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Tag ({selectedListings.length} listings)
            </button>
            <button
              onClick={() => setShowBulkActions(false)}
              className="px-3 py-2 text-gray-600 hover:text-gray-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Listings Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 hover:text-gray-700"
                  >
                    {selectedListings.length === filteredListings.length ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    Select All
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <SortableHeader field="eventName">Event</SortableHeader>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <SortableHeader field="eventDate">Event Date</SortableHeader>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <SortableHeader field="section">Section</SortableHeader>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <SortableHeader field="availableNow">Available</SortableHeader>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <SortableHeader field="price">Price</SortableHeader>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredListings.map((listing) => (
                <tr key={listing.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleListingSelection(listing.id)}
                      className="flex items-center gap-2 hover:text-gray-700"
                    >
                      {selectedListings.includes(listing.id) ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatEventName(listing)}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {listing.eventId}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatEventDate(listing.eventDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {listing.section || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="font-medium">{listing.availableNow || 0}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${listing.price || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {/* API Tags */}
                      {(listing.tags || []).map((tag, index) => (
                        <span
                          key={`api-${index}`}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800"
                        >
                          {tag}
                        </span>
                      ))}
                      {/* User-added Tags */}
                      {(tags[listing.id] || []).map((tag, index) => (
                        <span
                          key={`user-${index}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(listing.id, tag)}
                            className="hover:text-blue-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add tag..."
                        value={newTags[listing.id] || ''}
                        onChange={(e) => setNewTags(prev => ({
                          ...prev,
                          [listing.id]: e.target.value
                        }))}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAddTag(listing.id, newTags[listing.id] || '');
                          }
                        }}
                        className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={() => handleAddTag(listing.id, newTags[listing.id] || '')}
                        disabled={!(newTags[listing.id] || '').trim()}
                        className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredListings.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {filterTag ? 'No listings match the selected filter.' : 'No available listings found.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailableListings; 