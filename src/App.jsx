import React, { useState, useEffect } from 'react';
import { BarChart3, Zap, Tag, Search, TrendingUp, Package, Users } from 'lucide-react';
import EventSearch from './components/EventSearch';
import EventDetails from './components/EventDetails';
import SectionBreakdown from './components/SectionBreakdown';
import ErrorDisplay from './components/ErrorDisplay';

import PurchaseBreakdown from "./components/PurchaseBreakdown";
import Pace from "./components/Pace";
import AvailableListings from './components/AvailableListings';
import SalesPerformance from './components/SalesPerformance';
import InventoryManagement from './components/InventoryManagement';
import UsernameInput from './components/UsernameInput';
import FindNewEvents from './components/FindNewEvents';
import AlertBell from './components/AlertBell';
import SetAlertButton from './components/SetAlertButton';
import Login from './components/Login';
import Header from './components/Header';
import UserManagement from './components/UserManagement';
import { apiService } from './api';
import { userDataService } from './services/userDataService';
import { authService } from './services/authService';

function App() {
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bookmarkRefreshKey, setBookmarkRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState('search'); // 'search', 'listings', 'sales', 'inventory', or 'users'
  const [manualCategories, setManualCategories] = useState({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const handleSearch = async (eventId) => {
    setLoading(true);
    setError(null);
    setEventData(null);

    try {
      const data = await apiService.getEventDashboard(eventId);
      setEventData(data);
    } catch (err) {
      setError(err);
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewEventFound = () => {
    // Trigger a refresh of bookmarks in EventSearch component
    setBookmarkRefreshKey(prev => prev + 1);
  };

  const handleEventSelect = (eventId) => {
    handleSearch(eventId);
  };

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await authService.checkAuthStatus();
      setIsAuthenticated(authenticated);
      setIsAdmin(authService.getIsAdmin());
    };
    checkAuth();
  }, []);

  // Load manual categories on mount
  useEffect(() => {
    async function loadManualCategories() {
      try {
        const categories = await userDataService.getManualCategories();
        setManualCategories(categories);
      } catch (error) {
        console.error('Failed to load manual categories:', error);
        setManualCategories({});
      }
    }
    loadManualCategories();
  }, []);

  const handleLoginSuccess = (user) => {
    setIsAuthenticated(true);
    setIsAdmin(user.isAdmin);
    // Set username in localStorage for API calls
    localStorage.setItem('username', user.email);
    // Update userDataService username
    userDataService.setUsername(user.email);
  };

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with user info and logout */}
      <Header />
      
      {/* Alert Bell - Fixed in top left */}
      <AlertBell onEventSelect={handleEventSelect} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            <BarChart3 className="inline-block mr-2" />
            Festival Reports Dashboard
          </h1>
          <p className="text-gray-600">ZeroHero API Dashboard for Festival Inventory and Sales</p>
        </div>

        {/* Username Input for Backend Storage */}
        <div className="mb-6">
          <UsernameInput />
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('search')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'search'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Search className="w-4 h-4" />
                Festivals
              </button>
              <button
                onClick={() => setActiveTab('inventory')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'inventory'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Package className="w-4 h-4" />
                Pricing Management
              </button>
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('users')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === 'users'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  User Management
                </button>
              )}
              <button
                onClick={() => setActiveTab('listings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'listings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Tag className="w-4 h-4" />
                Available Listings
              </button>
              <button
                onClick={() => setActiveTab('sales')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'sales'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Sales Performance
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'search' && (
          <>
            <FindNewEvents onEventFound={handleNewEventFound} />
            
            <EventSearch onSearch={handleSearch} loading={loading} key={bookmarkRefreshKey} />

            {error && <ErrorDisplay error={error} />}

            {eventData && (
              <div className="space-y-6">
                <EventDetails eventData={eventData} />
                <SectionBreakdown inventory={eventData.inventory} sales={eventData.sales} />
                <PurchaseBreakdown 
                  eventId={eventData.event?.id} 
                  manualCategories={manualCategories}
                />
                <Pace 
                  eventId={eventData.event?.id} 
                  sales={eventData.sales}
                  manualCategories={manualCategories}
                />
              </div>
            )}
          </>
        )}

        {activeTab === 'listings' && (
          <AvailableListings />
        )}

        {activeTab === 'sales' && (
          <SalesPerformance />
        )}

        {activeTab === 'inventory' && (
          <InventoryManagement />
        )}

        {activeTab === 'users' && isAdmin && (
          <UserManagement />
        )}

        {/* Set Alert Button - Fixed in top right when event is selected */}
        {activeTab === 'search' && eventData && (
          <SetAlertButton 
            eventId={eventData?.event?.id} 
            eventName={eventData?.event?.name} 
          />
        )}
      </div>
    </div>
  );
}

export default App; 