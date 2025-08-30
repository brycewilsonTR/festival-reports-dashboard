import React from 'react';
import { Calendar, MapPin, Users, DollarSign, Package, TrendingUp } from 'lucide-react';

// Helper function to format event name with description
const formatEventName = (event) => {
  const name = event.name || 'Event Name Unavailable';
  const description = event.eventDescription;
  
  if (description && description.trim()) {
    return `${name} - ${description}`;
  }
  
  return name;
};

const EventDetails = ({ eventData }) => {
  if (!eventData) return null;

  const { event, inventoryCount, salesCount } = eventData;

  if (!event) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Event not found</p>
        </div>
      </div>
    );
  }

  // Format date and time separately
  const formatDate = (dateString) => {
    if (!dateString || dateString === '9999-12-31 23:59:59') {
      return 'TBA';
    }
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    if (!dateString || dateString === '9999-12-31 23:59:59') {
      return '';
    }
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Fallbacks for missing fields
  const eventName = formatEventName(event);
  const eventId = event.id;
  const eventDate = formatDate(event.date);
  const eventTime = formatTime(event.date);
  const venue = event.venue?.name || '';
  const city = event.venue?.city?.name || '';
  const state = event.venue?.city?.stateCode || '';
  const location = [venue, city, state].filter(Boolean).join(', ') || 'Location Unavailable';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Event Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {eventId ? (
            <a
              href={`https://tradedesk.ticketmaster.com/marketplace/event/${eventId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-700 underline hover:text-primary-900"
            >
              {eventName}
            </a>
          ) : eventName}
        </h2>
        <div className="flex items-center text-gray-600 mb-1">
          <Calendar className="h-4 w-4 mr-2" />
          <span>{eventDate}{eventTime && eventTime !== '12:00 AM' ? `, ${eventTime}` : ''}</span>
        </div>
        <div className="flex items-center text-gray-600">
          <MapPin className="h-4 w-4 mr-2" />
          <span>{location}</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Inventory Card */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center mb-2">
                <Package className="h-6 w-6 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-blue-900">Total Inventory</h3>
              </div>
              <p className="text-blue-700 text-sm">All tickets in inventory</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-900">{inventoryCount}</div>
              <div className="text-blue-600 text-sm">tickets</div>
            </div>
          </div>
        </div>

        {/* Sales Card */}
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center mb-2">
                <DollarSign className="h-6 w-6 text-green-600 mr-2" />
                <h3 className="text-lg font-semibold text-green-900">Total Sales</h3>
              </div>
              <p className="text-green-700 text-sm">Tickets sold</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-900">{salesCount}</div>
              <div className="text-green-600 text-sm">tickets</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails; 