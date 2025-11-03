"use client"

import {
  AlertCircle,
  Bell,
  Circle,
  Clock,
  Loader2,
  RefreshCw,
  X
} from "lucide-react";
import { useEffect, useState } from "react";

const API_BASE = "http://localhost:8000/api/ctu_vetmed";

const NotificationsModal = ({ isOpen, onNotificationClick, onClose, onMarkAllAsRead }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleString("en-PH", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (e) {
      return "Invalid date";
    }
  };

  // Mark single notification as read
// In your markNotificationAsRead function, ensure you're using the correct ID
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
      throw new Error(`Failed to mark as read: ${response.status}`);
    }
    
    return response.ok;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

  // Mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    try {
      const response = await fetch(`${API_BASE}/mark_all_notifications_read/`, {
        method: "POST",
        credentials: "include",
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Mark all as read
  const markAllAsRead = async () => {
    setLoading(true);
    const success = await markAllNotificationsAsRead();
    if (success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      onMarkAllAsRead?.();
    }
    setLoading(false);
  };

  // Handle single notification click
  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      const success = await markNotificationAsRead(notification.id);
      if (success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        );
      }
    }
    onClose?.();
    onNotificationClick?.(notification);
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE}/get_vetnotifications/`, {
        method: "GET",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load notifications: ${response.status}`);
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        const formatted = data.map((notif, index) => ({
          id: notif.id,
          message: notif.message || "No message",
          date: notif.date || new Date().toISOString(),
          read: notif.read || false,
          type: notif.type || "general",
          uniqueKey: `${notif.type}-${notif.id}-${index}`,
        }));
        setNotifications(formatted);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      setError(err.message);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999,
        }}
        onClick={onClose}
      />

      <div style={styles.dropdown}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Bell size={20} color="white" />
            <h2 style={styles.title}>Notifications</h2>
            {unreadCount > 0 && <span style={styles.unreadBadge}>{unreadCount}</span>}
          </div>

          {unreadCount > 0 && (
            <button onClick={markAllAsRead} disabled={loading} style={styles.markAllButton}>
              {loading ? <Loader2 size={14} className="spinner" /> : "Mark all as read"}
            </button>
          )}
        </div>

        {/* Notification List */}
        <div style={styles.body}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <Loader2 size={32} color="#b91c1c" className="spinner" />
              <p style={styles.loadingText}>Loading notifications...</p>
            </div>
          ) : error ? (
            <div style={styles.errorContainer}>
              <AlertCircle size={32} color="#b91c1c" />
              <p style={styles.errorTitle}>Unable to load notifications</p>
              <p style={styles.errorMessage}>{error}</p>
              <button 
                onClick={fetchNotifications}
                style={styles.retryButton}
              >
                <RefreshCw size={14} />
                Try Again
              </button>
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((n) => (
              <div
                key={n.uniqueKey}
                style={{
                  ...styles.notification,
                  ...(n.read ? styles.notificationRead : styles.notificationUnread),
                }}
                onClick={() => handleNotificationClick(n)}
              >
                <div style={styles.notificationContent}>
                  {!n.read && (
                    <div style={styles.unreadIndicatorContainer}>
                      <Circle size={10} fill="#b91c1c" color="#b91c1c" />
                    </div>
                  )}
                  <div style={styles.messageContainer}>
                    <p style={styles.message}>{n.message}</p>
                    <div style={styles.notificationFooter}>
                      <div style={styles.dateContainer}>
                        <Clock size={12} color="#6b7280" />
                        <span style={styles.date}>{formatDate(n.date)}</span>
                      </div>
                      {!n.read && (
                        <span style={styles.newBadge}>
                          New
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={styles.notificationHoverEffect}></div>
              </div>
            ))
          ) : (
            <div style={styles.emptyState}>
              <Bell size={48} color="#6b7280" opacity={0.5} />
              <p style={styles.emptyTitle}>No notifications</p>
              <p style={styles.emptyMessage}>You're all caught up!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div style={styles.footer}>
            <button style={styles.clearButton} onClick={onClose}>
              <X size={16} />
              Close
            </button>
          </div>
        )}
      </div>
    </>
  );
};

const styles = {
  dropdown: {
    position: "absolute",
    top: "60px",
    right: "10px",
    background: "#fff",
    borderRadius: "16px",
    width: "380px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1)",
    border: "1px solid #e5e7eb",
    zIndex: 1000,
    overflow: "hidden",
  },
  header: {
    padding: "16px 20px",
    borderBottom: "1px solid #f3f4f6",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)",
  },
  title: {
    fontSize: "18px",
    fontWeight: "700",
    color: "white",
    margin: 0,
    letterSpacing: "-0.025em",
  },
  unreadBadge: {
    background: "rgba(255,255,255,0.2)",
    backdropFilter: "blur(10px)",
    color: "white",
    fontSize: "12px",
    fontWeight: "700",
    padding: "4px 8px",
    borderRadius: "12px",
    minWidth: "24px",
    textAlign: "center",
    border: "1px solid rgba(255,255,255,0.3)",
  },
  markAllButton: {
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.3)",
    color: "white",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    padding: "6px 12px",
    borderRadius: "8px",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  body: {
    padding: "0",
    maxHeight: "400px",
    overflowY: "auto",
    background: "#fafafa",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
  },
  loadingText: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: "14px",
    margin: "12px 0 0 0",
  },
  errorContainer: {
    textAlign: "center",
    padding: "32px 20px",
    background: "#fef2f2",
    margin: "12px",
    borderRadius: "12px",
    border: "1px solid #fecaca",
  },
  errorTitle: {
    color: "#b91c1c",
    fontSize: "16px",
    fontWeight: "600",
    margin: "12px 0 8px 0",
  },
  errorMessage: {
    color: "#7f1d1d",
    fontSize: "13px",
    margin: "0 0 16px 0",
    opacity: 0.8,
  },
  retryButton: {
    marginTop: "8px",
    padding: "8px 16px",
    background: "linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    justifyContent: "center",
  },
  notification: {
    padding: "16px 20px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    position: "relative",
    overflow: "hidden",
    borderBottom: "1px solid #f3f4f6",
  },
  notificationUnread: {
    background: "linear-gradient(135deg, #fef2f2 0%, #fff 50%)",
    borderLeft: "4px solid #b91c1c",
  },
  notificationRead: {
    background: "white",
    borderLeft: "4px solid transparent",
  },
  notificationContent: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    position: "relative",
    zIndex: 2,
  },
  unreadIndicatorContainer: {
    paddingTop: "2px",
    flexShrink: 0,
  },
  messageContainer: {
    flex: 1,
    minWidth: 0,
  },
  message: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#1f2937",
    margin: "0 0 8px 0",
    lineHeight: "1.4",
  },
  notificationFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
  },
  dateContainer: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  date: {
    fontSize: "12px",
    color: "#6b7280",
    fontWeight: "500",
  },
  newBadge: {
    background: "linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)",
    color: "white",
    fontSize: "10px",
    fontWeight: "700",
    padding: "2px 6px",
    borderRadius: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  notificationHoverEffect: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "linear-gradient(135deg, rgba(185, 28, 28, 0.02) 0%, rgba(127, 29, 29, 0.05) 100%)",
    opacity: 0,
    transition: "opacity 0.2s ease",
    zIndex: 1,
  },
  emptyState: {
    textAlign: "center",
    padding: "48px 20px",
    background: "white",
  },
  emptyTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#374151",
    margin: "16px 0 8px 0",
  },
  emptyMessage: {
    fontSize: "14px",
    color: "#6b7280",
    margin: 0,
    opacity: 0.8,
  },
  footer: {
    padding: "16px 20px",
    borderTop: "1px solid #f3f4f6",
    display: "flex",
    justifyContent: "flex-end",
    background: "white",
  },
  clearButton: {
    background: "linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)",
    border: "none",
    color: "white",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    padding: "8px 20px",
    borderRadius: "8px",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 4px rgba(185, 28, 28, 0.2)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
};

// Add CSS animation for spinner
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`, styleSheet.cssRules.length);

styleSheet.insertRule(`
  .spinner {
    animation: spin 1s linear infinite;
  }
`, styleSheet.cssRules.length);

// Add hover effects
styleSheet.insertRule(`
  .notification:hover .notificationHoverEffect {
    opacity: 1;
  }
`, styleSheet.cssRules.length);

styleSheet.insertRule(`
  .markAllButton:hover {
    background: rgba(255,255,255,0.25) !important;
    transform: translateY(-1px);
  }
`, styleSheet.cssRules.length);

styleSheet.insertRule(`
  .retryButton:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(185, 28, 28, 0.3);
  }
`, styleSheet.cssRules.length);

styleSheet.insertRule(`
  .clearButton:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(185, 28, 28, 0.3);
  }
`, styleSheet.cssRules.length);

export default NotificationsModal;