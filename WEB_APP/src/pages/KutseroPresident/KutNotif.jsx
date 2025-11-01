import { useEffect, useState } from "react";

const API_BASE = "http://localhost:8000/api/kutsero_president";

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

      await response.json();
      return true;
    } catch (error) {
      return false;
    }
  };

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

      await response.json();
      return true;
    } catch (error) {
      return false;
    }
  };

  const unreadCount = localNotifications.filter(n => !n.read).length;

  const markAllAsRead = async () => {
    setLoading(true);
    const success = await markAllNotificationsAsRead();
    
    if (success) {
      setLocalNotifications(prev => prev.map(n => ({ ...n, read: true })));
      onMarkAllAsRead?.();
    }
    setLoading(false);
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read && notification.notif_id) {
      await markNotificationAsRead(notification.notif_id);
      
      setLocalNotifications(prev => 
        prev.map(n => 
          n.notif_id === notification.notif_id ? { ...n, read: true } : n
        )
      );
    }
    
    onClose?.();
    
    if (onOpenKutseroManagement) {
      onOpenKutseroManagement(notification);
    }
    
    onNotificationClick?.(notification);
  };

  useEffect(() => {
    if (isOpen) {
      setLocalNotifications(notifications || []);
    }
  }, [isOpen, notifications]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      <div className="absolute top-12 right-0 bg-white rounded-xl w-80 max-h-96 overflow-hidden shadow-2xl border border-gray-100 z-50">
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

        <div className="max-h-80 overflow-y-auto">
          {localNotifications.length > 0 ? (
            localNotifications.map((notification, index) => (
              <div
                key={notification.notif_id || notification.id || index}
                className={`p-4 border-b border-gray-50 transition-all duration-200 hover:bg-amber-50 cursor-pointer group ${
                  !notification.read ? 'bg-amber-50' : 'bg-white'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
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