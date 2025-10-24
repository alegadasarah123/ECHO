import { useEffect, useState } from "react";

const API_BASE = "https://echo-ebl8.onrender.com/api/kutsero_president";

const NotificationModal = ({ 
  isOpen, 
  onNotificationClick, 
  onClose, 
  notifications, 
  onMarkAllAsRead,
  onOpenKutseroManagement
}) => {
  const [localNotifications, setLocalNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ Format ISO timestamp in Philippine Time
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleString("en-PH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Manila",
    });
  };

  // Mark single notification as read in backend
  const markNotificationAsRead = async (notifId) => {
    try {
      const response = await fetch(`${API_BASE}/mark_notification_read/${notifId}/`, {
        method: "POST",
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      const data = await response.json();
      console.log('Notification marked as read:', data);
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  };

  // Mark all notifications as read in backend
  const markAllNotificationsAsRead = async () => {
    try {
      const response = await fetch(`${API_BASE}/mark_all_notifications_read/`, {
        method: "POST",
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      const data = await response.json();
      console.log('All notifications marked as read:', data);
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  };

  // Calculate unread notifications count
  const unreadCount = localNotifications.filter(n => !n.read).length;

  // Mark all as read
  const markAllAsRead = async () => {
    setLoading(true);
    const success = await markAllNotificationsAsRead();
    
    if (success) {
      setLocalNotifications(prev => prev.map(n => ({ ...n, read: true })));
      onMarkAllAsRead?.(); // Call parent function to sync state
    }
    setLoading(false);
  };

  // Handle individual notification click - UPDATED to pass notification data
  const handleNotificationClick = async (notification) => {
    // Mark as read in backend first
    if (!notification.read) {
      const success = await markNotificationAsRead(notification.id);
      
      if (success) {
        // Update local state
        setLocalNotifications(prev => 
          prev.map(n => 
            n.id === notification.id ? { ...n, read: true } : n
          )
        );
      }
    }
    
    // Close notification modal
    onClose?.();
    
    // Open Kutsero Management in pending tab with notification data
    if (onOpenKutseroManagement) {
      onOpenKutseroManagement(notification); // Pass the clicked notification
    }
    
    // Call parent notification click handler if provided
    onNotificationClick?.(notification);
  };

  // Sync with parent notifications when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalNotifications(notifications || []);
    }
  }, [isOpen, notifications]);

  if (!isOpen) return null;

  return (
    <>
      {/* Transparent Backdrop */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Notification Modal */}
      <div className="absolute top-12 right-0 bg-white rounded-xl w-80 max-h-96 overflow-hidden shadow-2xl border border-gray-100 z-50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-amber-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full min-w-6 text-center">
                {unreadCount}
              </span>
            )}
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={loading}
              className="text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors duration-200 disabled:opacity-50"
            >
              {loading ? "Marking..." : "Mark all as read"}
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="max-h-80 overflow-y-auto">
          {localNotifications.length > 0 ? (
            localNotifications.map((notification, index) => (
              <div
                key={notification.id || index}
                className={`p-4 border-b border-gray-50 transition-all duration-200 hover:bg-amber-50 cursor-pointer group ${
                  !notification.read ? 'bg-amber-50' : 'bg-white'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  {/* Status Indicator */}
                  {!notification.read && (
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium mb-1 ${
                      !notification.read ? 'text-gray-900' : 'text-gray-600'
                    } group-hover:text-gray-900`}>
                      {notification.message}
                    </p>
                    <span className="text-xs text-gray-500">
                      {formatDate(notification.date)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM8.5 14.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM15 7a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-sm">No notifications</p>
              <p className="text-xs text-gray-400 mt-1">We'll notify you when something arrives</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {localNotifications.length > 0 && (
          <div className="p-3 border-t border-gray-100 bg-gray-50">
            <button
              onClick={onClose}
              className="w-full text-center text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationModal;