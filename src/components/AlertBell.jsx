import React, { useState, useEffect } from 'react';
import { Bell, X, Trash2 } from 'lucide-react';
import { alertService } from '../services/alertService';

const AlertBell = ({ onEventSelect }) => {
  const [alerts, setAlerts] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadAlerts();
    // Set up interval to check for new alerts every minute
    const interval = setInterval(loadAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = () => {
    const allAlerts = alertService.getAllAlerts();
    
    // Filter alerts to only show those that are today or in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of today
    
    const relevantAlerts = allAlerts.filter(alert => {
      const alertDate = new Date(alert.alertDate);
      alertDate.setHours(0, 0, 0, 0); // Set to start of alert date
      
      // Debug logging
      console.log('Alert date:', alert.alertDate, 'Parsed as:', alertDate, 'Today:', today, 'Is past/today:', alertDate <= today);
      
      return alertDate <= today;
    });
    
    setAlerts(relevantAlerts);
    
    // Only count unread alerts that are today or in the past
    const unreadRelevantAlerts = relevantAlerts.filter(alert => !alert.isRead);
    setUnreadCount(unreadRelevantAlerts.length);
  };

  const handleRemoveAlert = (alertId) => {
    alertService.removeAlert(alertId);
    loadAlerts();
  };

  const handleClearAllAlerts = () => {
    if (window.confirm('Are you sure you want to clear all alerts?')) {
      alertService.clearAllAlerts();
      loadAlerts();
      setIsOpen(false);
    }
  };

  const handleAlertClick = (alert) => {
    alertService.markAsRead(alert.id);
    onEventSelect(alert.eventId);
    setIsOpen(false);
    loadAlerts();
  };

  const formatDate = (dateString) => {
    // Handle date strings in YYYY-MM-DD format to avoid timezone issues
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // For date-only strings, parse as local date to avoid timezone conversion
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day); // month is 0-indexed
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } else {
      // For datetime strings, use normal parsing
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed top-4 left-4 z-50">
      {/* Alert Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative bg-white rounded-full p-3 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow"
        title="Alerts"
      >
        <Bell className="w-6 h-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Alerts Dropdown */}
      {isOpen && (
        <div className="absolute top-12 left-0 w-80 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-hidden z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Alerts</h3>
              <div className="flex gap-2">
                {alerts.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleClearAllAlerts();
                    }}
                    className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1 p-1 rounded hover:bg-red-50"
                    title="Clear all alerts"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No alerts set
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                    !alert.isRead ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleAlertClick(alert)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">
                        {alert.eventName}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Alert for: {formatDate(alert.alertDate)}
                      </p>
                      {alert.comment && (
                        <p className="text-sm text-gray-500 mb-2 italic">
                          "{alert.comment}"
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        Created: {formatDate(alert.createdAt)} at {formatTime(alert.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemoveAlert(alert.id);
                      }}
                      className="text-red-500 hover:text-red-700 ml-2 p-1 rounded hover:bg-red-50"
                      title="Remove alert"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default AlertBell; 