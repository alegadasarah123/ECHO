import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const NotificationModal = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Fetch all notifications
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/veterinarian/get_notifications/", {
        credentials: "include"
      });
      const data = await response.json();
      
      if (response.ok) {
        console.log("✅ Fetched notifications:", data.notifications);
        setNotifications(data.notifications || []);
      } else {
        console.error("Error fetching notifications:", data.error);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markNotificationAsRead = async (notifId) => {
    try {
      console.log("📨 Marking notification as read:", notifId);
      
      const response = await fetch(`http://localhost:8000/api/veterinarian/mark_notification_read/${notifId}/`, {
        method: "POST",
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        console.log("✅ Successfully marked notification as read");
        return true;
      } else {
        const errorData = await response.json();
        console.error("❌ Failed to mark notification as read:", errorData);
        return false;
      }
    } catch (error) {
      console.error("❌ Error marking notification as read:", error);
      return false;
    }
  };

  // Mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    setMarkingRead(true);
    try {
      console.log("📨 Marking all notifications as read");
      
      const response = await fetch("http://localhost:8000/api/veterinarian/mark_all_notifications_read/", {
        method: "POST",
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log("✅ Successfully marked all notifications as read");
        // Update local state to mark all as read
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        return true;
      } else {
        const errorData = await response.json();
        console.error("❌ Failed to mark all notifications as read:", errorData);
        return false;
      }
    } catch (error) {
      console.error("❌ Error marking all notifications as read:", error);
      return false;
    } finally {
      setMarkingRead(false);
    }
  };

  // Format time display for Philippine time
  const formatNotificationTime = (timestamp) => {
    try {
      // Parse the timestamp (already in Philippine time +08:00)
      const date = new Date(timestamp);
      const now = new Date();
      
      // Convert both to Philippine time for accurate comparison
      const phNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
      const phDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
      
      const diffMs = phNow - phDate;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      // For older dates, show the actual date and time in Philippine format
      return phDate.toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Manila'
      });
    } catch (error) {
      return "Recently";
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    console.log("🖱️ Notification clicked:", notification);
    
    if (!notification.read) {
      console.log("📝 Marking as read...");
      // Use the actual notif_id for marking as read
      const notifIdToMark = notification.notif_id;
      const success = await markNotificationAsRead(notifIdToMark);
      if (success) {
        console.log("✅ Successfully updated local state");
        setNotifications(prev => 
          prev.map(n => 
            n.notif_id === notification.notif_id ? { ...n, read: true } : n
          )
        );
      } else {
        console.log("❌ Failed to mark as read, refreshing notifications");
        // If marking failed, refresh the notifications to get current state
        fetchNotifications();
      }
    }

    onClose();

    // Navigate based on notification type
    if (notification.link) {
      navigate(notification.link);
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
  };

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      <div className="absolute top-12 right-0 bg-white rounded-xl w-96 max-h-96 overflow-hidden shadow-2xl border border-gray-100 z-50">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-800">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full min-w-6 text-center">
                {unreadCount}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={fetchNotifications}
              disabled={loading}
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200 transition"
              title="Refresh notifications"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markingRead}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors duration-200 disabled:opacity-50"
              >
                {markingRead ? "Marking..." : "Mark all read"}
              </button>
            )}
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((notification, index) => (
              <div
                key={notification.notif_id || index}
                className={`p-4 border-b border-gray-50 transition-all duration-200 hover:bg-gray-50 cursor-pointer group ${
                  !notification.read ? 'bg-blue-50' : 'bg-white'
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
                    {notification.description && (
                      <p className="text-xs text-gray-500 mb-1">{notification.description}</p>
                    )}
                    <span className="text-xs text-gray-400">
                      {formatNotificationTime(notification.date)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <p className="text-sm">No notifications</p>
              <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
            </div>
          )}
        </div>

        {notifications.length > 0 && (
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