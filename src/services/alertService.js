class AlertService {
  constructor() {
    this.storageKey = 'festival_reports_alerts';
    // Add a fake alert for testing if no alerts exist
    this.addFakeAlertIfNeeded();
  }

  // Add a fake alert for testing purposes
  addFakeAlertIfNeeded() {
    try {
      const alerts = this.getAllAlerts();
      if (alerts.length === 0) {
        // Add a fake alert for testing
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const fakeAlert = {
          id: 'fake-alert-001',
          eventId: '10411300',
          eventName: 'Fake Test Event - Tomorrow',
          alertDate: tomorrow.toISOString().split('T')[0],
          comment: 'This is a fake alert for testing the alert system',
          createdAt: new Date().toISOString(),
          isRead: false
        };
        alerts.push(fakeAlert);
        localStorage.setItem(this.storageKey, JSON.stringify(alerts));
        console.log('Added fake alert for testing');
      }
    } catch (error) {
      console.error('Error adding fake alert:', error);
    }
  }

  // Get all alerts
  getAllAlerts() {
    try {
      const alerts = localStorage.getItem(this.storageKey);
      return alerts ? JSON.parse(alerts) : [];
    } catch (error) {
      console.error('Error getting alerts:', error);
      return [];
    }
  }

  // Add a new alert
  addAlert(eventId, eventName, alertDate, comment = '') {
    try {
      const alerts = this.getAllAlerts();
      const newAlert = {
        id: Date.now().toString(),
        eventId: eventId.toString(),
        eventName,
        alertDate,
        comment,
        createdAt: new Date().toISOString(),
        isRead: false
      };
      
      alerts.push(newAlert);
      localStorage.setItem(this.storageKey, JSON.stringify(alerts));
      return newAlert;
    } catch (error) {
      console.error('Error adding alert:', error);
      throw error;
    }
  }

  // Remove a specific alert
  removeAlert(alertId) {
    try {
      console.log('Removing alert with ID:', alertId);
      const alerts = this.getAllAlerts();
      console.log('Current alerts:', alerts);
      const filteredAlerts = alerts.filter(alert => alert.id !== alertId);
      console.log('Filtered alerts:', filteredAlerts);
      localStorage.setItem(this.storageKey, JSON.stringify(filteredAlerts));
      console.log('Alert removed successfully');
    } catch (error) {
      console.error('Error removing alert:', error);
      throw error;
    }
  }

  // Clear all alerts
  clearAllAlerts() {
    try {
      console.log('Clearing all alerts');
      localStorage.removeItem(this.storageKey);
      console.log('All alerts cleared successfully');
    } catch (error) {
      console.error('Error clearing alerts:', error);
      throw error;
    }
  }

  // Mark alert as read
  markAsRead(alertId) {
    try {
      const alerts = this.getAllAlerts();
      const updatedAlerts = alerts.map(alert => 
        alert.id === alertId ? { ...alert, isRead: true } : alert
      );
      localStorage.setItem(this.storageKey, JSON.stringify(updatedAlerts));
    } catch (error) {
      console.error('Error marking alert as read:', error);
      throw error;
    }
  }

  // Get unread alerts count
  getUnreadCount() {
    try {
      const alerts = this.getAllAlerts();
      return alerts.filter(alert => !alert.isRead).length;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Get alerts that are due (alert date is today or in the past)
  getDueAlerts() {
    try {
      const alerts = this.getAllAlerts();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return alerts.filter(alert => {
        const alertDate = new Date(alert.alertDate);
        alertDate.setHours(0, 0, 0, 0);
        return alertDate <= today;
      });
    } catch (error) {
      console.error('Error getting due alerts:', error);
      return [];
    }
  }

  // Check if an event already has an alert
  hasAlertForEvent(eventId) {
    try {
      const alerts = this.getAllAlerts();
      return alerts.some(alert => alert.eventId === eventId.toString());
    } catch (error) {
      console.error('Error checking event alert:', error);
      return false;
    }
  }
}

export const alertService = new AlertService(); 