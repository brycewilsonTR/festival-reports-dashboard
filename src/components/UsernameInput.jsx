import React, { useState, useEffect } from 'react';
import { userDataService } from '../services/userDataService';

const UsernameInput = () => {
  const [username, setUsername] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showSyncButton, setShowSyncButton] = useState(false);

  useEffect(() => {
    const currentUsername = userDataService.getUsername();
    setUsername(currentUsername);
    
    // Show sync button if there's localStorage data and backend is available
    const hasLocalData = localStorage.getItem('bookmarkedEventIds') || 
                        localStorage.getItem('customMarketplaceLinks') ||
                        localStorage.getItem('customListingMarketplaceLinks') ||
                        localStorage.getItem('manualCategories');
    setShowSyncButton(hasLocalData && userDataService.useBackend);
  }, []);

  const handleSave = () => {
    if (username.trim()) {
      userDataService.setUsername(username.trim());
      setIsEditing(false);
    }
  };

  const handleSync = async () => {
    try {
      await userDataService.syncToBackend();
      setShowSyncButton(false);
      alert('Data synced to backend successfully!');
    } catch (error) {
      alert('Failed to sync data: ' + error.message);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center space-x-2 mb-4">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
          className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          onKeyPress={(e) => e.key === 'Enter' && handleSave()}
          autoFocus
        />
        <button
          onClick={handleSave}
          className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700"
        >
          Save
        </button>
        <button
          onClick={() => setIsEditing(false)}
          className="bg-gray-500 text-white px-3 py-1 rounded-md text-sm hover:bg-gray-600"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 mb-4">
      <span className="text-sm text-gray-600">User:</span>
      <span className="text-sm font-medium">{username}</span>
      <button
        onClick={() => setIsEditing(true)}
        className="text-blue-600 hover:text-blue-800 text-sm underline"
      >
        Change
      </button>
      {showSyncButton && (
        <button
          onClick={handleSync}
          className="bg-orange-600 text-white px-2 py-1 rounded text-xs hover:bg-orange-700"
          title="Sync localStorage data to backend"
        >
          Sync Data
        </button>
      )}
    </div>
  );
};

export default UsernameInput; 