import React, { useState, useEffect } from 'react';
import { Bell, Calendar, X } from 'lucide-react';
import { alertService } from '../services/alertService';

const SetAlertButton = ({ eventId, eventName }) => {
  const [showModal, setShowModal] = useState(false);
  const [alertDate, setAlertDate] = useState('');
  const [comment, setComment] = useState('');
  const [hasExistingAlert, setHasExistingAlert] = useState(false);

  useEffect(() => {
    if (eventId) {
      setHasExistingAlert(alertService.hasAlertForEvent(eventId));
    }
  }, [eventId]);

  const handleSetAlert = () => {
    if (!alertDate) {
      alert('Please select an alert date');
      return;
    }

    try {
      alertService.addAlert(eventId, eventName, alertDate, comment);
      setShowModal(false);
      setAlertDate('');
      setComment('');
      setHasExistingAlert(true);
      // Create a more prominent alert with Tradedesk reminder
      const alertMessage = `🚨 ALERT SET SUCCESSFULLY! 🚨\n\n⚠️  IMPORTANT: You still need to set the ticket as ACTIVE in Tradedesk! ⚠️\n\nDon't forget to activate your listing!`;
      alert(alertMessage);
    } catch (error) {
      alert('Error setting alert: ' + error.message);
    }
  };



  if (!eventId) return null;

  return (
    <>
      {/* Alert Button */}
      <button
        onClick={() => setShowModal(true)}
        className={`fixed top-4 right-4 z-50 p-3 rounded-full shadow-lg border transition-all ${
          hasExistingAlert 
            ? 'bg-yellow-100 border-yellow-300 text-yellow-700 hover:bg-yellow-200' 
            : 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200'
        }`}
        title={hasExistingAlert ? 'Edit Alert' : 'Set Alert'}
      >
        <div className="relative">
          <Bell className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
            +
          </span>
        </div>
      </button>

      {/* Alert Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Set Alert
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>



            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alert Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={alertDate}
                    onChange={(e) => setAlertDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comment (optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a note about this alert..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSetAlert}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Set Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SetAlertButton; 