import React, { useState, useEffect } from 'react';
import { Clock, X } from 'lucide-react';
import { userDataService } from '../services/userDataService';
import PricingChecklist from './PricingChecklist';

const InventoryManagement = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unverificationDates, setUnverificationDates] = useState({}); // Track unverification dates for listings
  const [showUnverificationModal, setShowUnverificationModal] = useState(false);
  const [selectedListingForUnverification, setSelectedListingForUnverification] = useState(null);
  const [unverificationDateInput, setUnverificationDateInput] = useState('');

  // Load unverification dates on component mount
  useEffect(() => {
    loadUnverificationDates();
  }, []);

  // Check for expired unverification dates and auto-unverify
  useEffect(() => {
    const checkExpiredUnverificationDates = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      Object.entries(unverificationDates).forEach(([listingId, dateString]) => {
        const unverificationDate = new Date(dateString);
        unverificationDate.setHours(0, 0, 0, 0);
        
        if (unverificationDate <= today) {
          // Auto-unverify this listing
          const listing = listings.find(listingItem => listingItem.id === listingId);
          if (listing) {
            handleUnverification(listing);
            // Remove the expired unverification date
            handleRemoveUnverificationDate(listingId);
          }
        }
      });
    };

    if (Object.keys(unverificationDates).length > 0) {
      checkExpiredUnverificationDates();
    }

    // Set up interval to check for expired dates every hour
    const interval = setInterval(() => {
      if (Object.keys(unverificationDates).length > 0) {
        checkExpiredUnverificationDates();
      }
    }, 60 * 60 * 1000); // Check every hour

    return () => clearInterval(interval);
  }, [unverificationDates, listings]);

  const loadUnverificationDates = async () => {
    try {
      const dates = await userDataService.getUnverificationDates();
      setUnverificationDates(dates);
    } catch (err) {
      console.error('Error loading unverification dates:', err);
    }
  };

  const handleUnverification = (listing) => {
    // This function is kept for the auto-unverification functionality
    // but the verification logic is removed since we no longer show the table
    console.log(`Listing ${listing.id} auto-unverified`);
  };

  const handleRemoveUnverificationDate = async (listingId) => {
    try {
      await userDataService.removeUnverificationDate(listingId);
      setUnverificationDates(prev => {
        const newDates = { ...prev };
        delete newDates[listingId];
        return newDates;
      });
      console.log(`Removed unverification date for listing ${listingId}`);
    } catch (err) {
      console.error('Error removing unverification date:', err);
    }
  };

  const openUnverificationModal = (listing) => {
    setSelectedListingForUnverification(listing);
    setUnverificationDateInput('');
    setShowUnverificationModal(true);
  };

  const closeUnverificationModal = () => {
    setShowUnverificationModal(false);
    setSelectedListingForUnverification(null);
    setUnverificationDateInput('');
  };

  const submitUnverificationDate = async () => {
    if (!selectedListingForUnverification || !unverificationDateInput) return;

    try {
      await userDataService.setUnverificationDate(
        selectedListingForUnverification.id, 
        unverificationDateInput
      );
      
      setUnverificationDates(prev => ({
        ...prev,
        [selectedListingForUnverification.id]: unverificationDateInput
      }));
      
      closeUnverificationModal();
      console.log(`Set unverification date for listing ${selectedListingForUnverification.id}: ${unverificationDateInput}`);
    } catch (err) {
      console.error('Error setting unverification date:', err);
    }
  };

  const formatUnverificationDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return null;
    }
  };

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
          onClick={() => window.location.reload()}
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
          <h2 className="text-2xl font-bold text-gray-900">Pricing Management</h2>
          <p className="text-gray-600">
            Verification workflow and pricing checklist
            {Object.keys(unverificationDates).length > 0 && ` • ${Object.keys(unverificationDates).length} auto-unverification(s) scheduled`}
          </p>
        </div>
      </div>

      {/* Pricing Checklist */}
      <PricingChecklist />

      {/* Unverification Date Modal */}
      {showUnverificationModal && selectedListingForUnverification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Set Unverification Date
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Set a date when "{selectedListingForUnverification.eventName}" should be automatically unverified.
            </p>
            <div className="mb-4">
              <label htmlFor="unverificationDate" className="block text-sm font-medium text-gray-700 mb-2">
                Unverification Date
              </label>
              <input
                type="date"
                id="unverificationDate"
                value={unverificationDateInput}
                onChange={(e) => setUnverificationDateInput(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={closeUnverificationModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitUnverificationDate}
                disabled={!unverificationDateInput}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Set Date
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement; 