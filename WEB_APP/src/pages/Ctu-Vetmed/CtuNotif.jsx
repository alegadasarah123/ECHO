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
import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE = "http://localhost:8000/api/ctu_vetmed";

const NotificationsModal = ({ isOpen, onNotificationClick, onClose, onMarkAllAsRead }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const modalRef = useRef(null);
  const refreshCooldownRef = useRef(false);

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) {
        return "Just now";
      } else if (diffMins < 60) {
        return `${diffMins}m ago`;
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      } else {
        return date.toLocaleDateString("en-PH", {
          month: "short",
          day: "numeric",
          year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
        });
      }
    } catch (e) {
      console.error("Error formatting date:", e, dateStr);
      return "Invalid date";
    }
  };

  // Detailed date format for tooltip
  const formatDetailedDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (e) {
      return "Invalid date";
    }
  };

  // Mark single notification as read
  const markNotificationAsRead = async (notifId) => {
    try {
      console.log(`Marking notification ${notifId} as read`);
      const response = await fetch(`${API_BASE}/mark_notification_read/${notifId}/`, {
        method: "POST",
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to mark as read: ${response.status}`, errorText);
        throw new Error(`Failed to mark as read: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Mark as read response:", data);
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  };

  // Mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    try {
      console.log("Marking all notifications as read");
      const response = await fetch(`${API_BASE}/mark_all_notifications_read/`, {
        method: "POST",
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to mark all as read: ${response.status}`, errorText);
        throw new Error(`Failed to mark all as read: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Mark all as read response:", data);
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (isRefreshing || refreshCooldownRef.current) return;
    
    setIsRefreshing(true);
    const success = await markAllNotificationsAsRead();
    if (success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      onMarkAllAsRead?.();
    }
    setIsRefreshing(false);
  };

  // Handle single notification click
  const handleNotificationClick = async (notification) => {
    if (isRefreshing || refreshCooldownRef.current) return;
    
    console.log("Notification clicked:", notification);
    
    if (!notification.read) {
      setIsRefreshing(true);
      const success = await markNotificationAsRead(notification.notif_id || notification.id);
      if (success) {
        setNotifications((prev) =>
          prev.map((n) => 
            (n.notif_id === notification.notif_id || n.id === notification.id) 
              ? { ...n, read: true } 
              : n
          )
        );
      }
      setIsRefreshing(false);
    }
    
    onClose?.();
    onNotificationClick?.(notification);
  };

  // Fetch notifications with cooldown
  const fetchNotifications = useCallback(async (force = false) => {
    const now = Date.now();
    const cooldown = 10000; // 10 seconds cooldown between fetches
    
    if (!force && (now - lastFetchTime) < cooldown) {
      console.log("Skipping fetch - in cooldown period");
      return;
    }

    if (refreshCooldownRef.current) {
      console.log("Fetch already in progress");
      return;
    }

    try {
      refreshCooldownRef.current = true;
      setLoading(true);
      setError(null);
      
      console.log("Fetching notifications...");
      const response = await fetch(`${API_BASE}/get_vetnotifications/`, {
        method: "GET",
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to load notifications: ${response.status}`, errorText);
        throw new Error(`Failed to load notifications: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Notifications received:", data.length);

      if (Array.isArray(data)) {
        // Remove duplicates based on notif_id
        const seenIds = new Set();
        const uniqueNotifications = [];
        
        for (const notif of data) {
          if (notif.notif_id && !seenIds.has(notif.notif_id)) {
            seenIds.add(notif.notif_id);
            uniqueNotifications.push({
              ...notif,
              uniqueKey: `notif-${notif.notif_id}-${Date.now()}`
            });
          }
        }
        
        console.log(`Deduplicated to ${uniqueNotifications.length} unique notifications`);
        
        setNotifications(uniqueNotifications);
        setLastFetchTime(now);
        
        // Cache in session storage
        try {
          sessionStorage.setItem('lastNotificationsFetch', now.toString());
          sessionStorage.setItem('lastNotifications', JSON.stringify(uniqueNotifications));
        } catch (e) {
          console.error("Error caching notifications:", e);
        }
      } else {
        throw new Error("Invalid response format: expected array");
      }
    } catch (err) {
      console.error("Error in fetchNotifications:", err);
      setError(err.message);
      
      // Try to load from cache
      try {
        const cached = sessionStorage.getItem('lastNotifications');
        if (cached) {
          const parsed = JSON.parse(cached);
          setNotifications(parsed);
          console.log("Loaded cached notifications:", parsed.length);
        }
      } catch (cacheErr) {
        console.error("Error loading cached notifications:", cacheErr);
      }
    } finally {
      setLoading(false);
      setTimeout(() => {
        refreshCooldownRef.current = false;
      }, 2000);
    }
  }, [lastFetchTime]);

  // Manual refresh
  const handleManualRefresh = () => {
    if (isRefreshing || refreshCooldownRef.current) {
      console.log("Refresh blocked - already refreshing");
      return;
    }
    console.log("Manual refresh triggered");
    fetchNotifications(true);
  };

  // Handle click outside modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  // Fetch notifications when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log("Modal opened, fetching notifications...");
      
      // Check if we have recent cached data
      try {
        const lastFetchStr = sessionStorage.getItem('lastNotificationsFetch');
        const now = Date.now();
        
        if (lastFetchStr && (now - parseInt(lastFetchStr)) < 30000) { // 30 seconds
          const cached = sessionStorage.getItem('lastNotifications');
          if (cached) {
            const parsed = JSON.parse(cached);
            setNotifications(parsed);
            console.log("Using cached notifications");
          }
        }
      } catch (e) {
        console.error("Error checking cache:", e);
      }
      
      // Fetch fresh data
      const timeoutId = setTimeout(() => {
        fetchNotifications();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, fetchNotifications]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  const unreadCount = notifications.filter((n) => !n.read).length;

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
         
        }}
        onClick={onClose}
      />

      <div ref={modalRef} style={styles.dropdown}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Bell size={20} color="white" />
            <h2 style={styles.title}>Notifications</h2>
            {unreadCount > 0 && (
              <span style={styles.unreadBadge}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>

          <div style={styles.headerButtons}>
            <button 
              onClick={handleManualRefresh} 
              disabled={isRefreshing} 
              style={{
                ...styles.iconButton,
                opacity: isRefreshing ? 0.5 : 1,
              }}
              title="Refresh notifications"
            >
              {isRefreshing ? (
                <Loader2 size={16} color="white" className="spinner" />
              ) : (
                <RefreshCw size={16} color="white" />
              )}
            </button>
            
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead} 
                disabled={isRefreshing || loading} 
                style={{
                  ...styles.markAllButton,
                  opacity: (isRefreshing || loading) ? 0.5 : 1,
                }}
              >
                {isRefreshing ? (
                  <Loader2 size={12} color="white" className="spinner" />
                ) : (
                  "Mark all read"
                )}
              </button>
            )}
          </div>
        </div>

        {/* Notification List */}
        <div style={styles.body}>
          {loading && notifications.length === 0 ? (
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
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                style={{
                  ...styles.retryButton,
                  opacity: isRefreshing ? 0.5 : 1,
                }}
              >
                {isRefreshing ? (
                  <Loader2 size={14} color="white" className="spinner" />
                ) : (
                  <>
                    <RefreshCw size={14} />
                    Try Again
                  </>
                )}
              </button>
            </div>
          ) : notifications.length > 0 ? (
            <>
              {notifications.map((n) => (
                <div
                  key={n.uniqueKey}
                  style={{
                    ...styles.notification,
                    ...(n.read ? styles.notificationRead : styles.notificationUnread),
                  }}
                  onClick={() => handleNotificationClick(n)}
                  title={formatDetailedDate(n.date)}
                >
                  <div style={styles.notificationContent}>
                    {!n.read && (
                      <div style={styles.unreadIndicatorContainer}>
                        <Circle size={8} fill="#b91c1c" color="#b91c1c" />
                      </div>
                    )}
                    <div style={styles.messageContainer}>
                      <div style={styles.messageHeader}>
                        <span style={{
                          ...styles.notificationType,
                          backgroundColor: getTypeColor(n.type)
                        }}>
                          {getTypeLabel(n.type)}
                        </span>
                        {!n.read && (
                          <span style={styles.newBadge}>
                            New
                          </span>
                        )}
                      </div>
                      <p style={styles.message}>{n.message}</p>
                      <div style={styles.notificationFooter}>
                        <div style={styles.dateContainer}>
                          <Clock size={12} color="#6b7280" />
                          <span style={styles.date}>{formatDate(n.date)}</span>
                        </div>
                        {n.read && (
                          <span style={styles.readBadge}>
                            Read
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={styles.notificationHoverEffect}></div>
                </div>
              ))}
              
              {loading && (
                <div style={styles.loadingMoreContainer}>
                  <Loader2 size={16} color="#b91c1c" className="spinner" />
                  <span style={styles.loadingMoreText}>Updating...</span>
                </div>
              )}
            </>
          ) : (
            <div style={styles.emptyState}>
              <Bell size={48} color="#6b7280" opacity={0.5}  />
              <p style={styles.emptyTitle}>No notifications yet</p>
              <p style={styles.emptyMessage}>
                When you get notifications, they'll appear here
              </p>
              <button 
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                style={{
                  ...styles.refreshEmptyButton,
                  opacity: isRefreshing ? 0.5 : 1,
                }}
              >
                {isRefreshing ? (
                  <Loader2 size={14} color="white" className="spinner" />
                ) : (
                  <>
                    <RefreshCw size={14} />
                    Refresh
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <div style={styles.footerStats}>
            <span style={styles.footerText}>
              {notifications.length} total • {unreadCount} unread
            </span>
          </div>
          <button 
            style={styles.clearButton} 
            onClick={onClose}
            disabled={isRefreshing}
          >
            <X size={16} />
            Close
          </button>
        </div>
      </div>
    </>
  );
};

// Helper functions for notification types
const getTypeLabel = (type) => {
  const labels = {
    'vet_registration': 'Vet Registration',
    'vet_status_update': 'Vet Status',
    'registration': 'Registration',
    'medrec_request': 'Medical Record',
    'medrec_status_update': 'Request Update',
    'comment_notification': 'Comment',
    'sos_request': 'SOS Emergency',
    'sos_status_update': 'SOS Update',
    'general': 'General'
  };
  return labels[type] || type;
};

const getTypeColor = (type) => {
  const colors = {
    'vet_registration': '#3b82f6',
    'vet_status_update': '#10b981',
    'registration': '#8b5cf6',
    'medrec_request': '#f59e0b',
    'medrec_status_update': '#ec4899',
    'comment_notification': '#06b6d4',
    'sos_request': '#dc2626',
    'sos_status_update': '#ea580c',
    'general': '#6b7280'
  };
  return colors[type] || '#6b7280';
};

const styles = {
  dropdown: {
    position: "fixed",
    top: "80px",
    right: "20px",
    background: "#fff",
    borderRadius: "16px",
    width: "450px",
    maxWidth: "90vw",
    maxHeight: "80vh",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2), 0 8px 20px rgba(0,0,0,0.15)",
    border: "1px solid #e5e7eb",
    zIndex: 1000,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "16px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)",
    flexShrink: 0,
  },
  title: {
    fontSize: "18px",
    fontWeight: "700",
    color: "white",
    margin: 0,
    letterSpacing: "-0.025em",
  },
  unreadBadge: {
    background: "rgba(255,255,255,0.25)",
    backdropFilter: "blur(10px)",
    color: "white",
    fontSize: "12px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "12px",
    minWidth: "24px",
    height: "24px",
    textAlign: "center",
    border: "1px solid rgba(255,255,255,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  headerButtons: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  iconButton: {
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.3)",
    color: "white",
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
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
    height: "32px",
  },
  body: {
    flex: 1,
    overflowY: "auto",
    background: "#fafafa",
    minHeight: "200px",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
  },
  loadingText: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: "14px",
    margin: "16px 0 0 0",
  },
  errorContainer: {
    textAlign: "center",
    padding: "40px 20px",
    background: "#fef2f2",
    margin: "12px",
    borderRadius: "12px",
    border: "1px solid #fecaca",
  },
  errorTitle: {
    color: "#b91c1c",
    fontSize: "16px",
    fontWeight: "600",
    margin: "16px 0 8px 0",
  },
  errorMessage: {
    color: "#7f1d1d",
    fontSize: "13px",
    margin: "0 0 20px 0",
    opacity: 0.8,
    wordBreak: "break-word",
    lineHeight: "1.4",
  },
  retryButton: {
    padding: "8px 20px",
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
    margin: "0 auto",
  },
  notification: {
    padding: "16px 20px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    position: "relative",
    overflow: "hidden",
    borderBottom: "1px solid #f3f4f6",
    userSelect: "none",
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
    paddingTop: "4px",
    flexShrink: 0,
  },
  messageContainer: {
    flex: 1,
    minWidth: 0,
  },
  messageHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "6px",
    flexWrap: "wrap",
  },
  notificationType: {
    fontSize: "10px",
    fontWeight: "700",
    color: "white",
    padding: "2px 8px",
    borderRadius: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  message: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#1f2937",
    margin: "0 0 10px 0",
    lineHeight: "1.5",
    wordBreak: "break-word",
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
    gap: "6px",
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
    padding: "2px 8px",
    borderRadius: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  readBadge: {
    background: "#f3f4f6",
    color: "#6b7280",
    fontSize: "10px",
    fontWeight: "600",
    padding: "2px 8px",
    borderRadius: "6px",
    border: "1px solid #e5e7eb",
  },
  notificationHoverEffect: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "linear-gradient(135deg, rgba(185, 28, 28, 0.03) 0%, rgba(127, 29, 29, 0.08) 100%)",
    opacity: 0,
    transition: "opacity 0.2s ease",
    zIndex: 1,
  },
  loadingMoreContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "16px",
    background: "#f9fafb",
    borderTop: "1px solid #f3f4f6",
  },
  loadingMoreText: {
    fontSize: "13px",
    color: "#6b7280",
    fontWeight: "500",
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    background: "white",
  },
  emptyTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#374151",
    margin: "20px 0 8px 0",
  },
  emptyMessage: {
    fontSize: "14px",
    color: "#6b7280",
    margin: "0 0 20px 0",
    opacity: 0.8,
    lineHeight: "1.4",
  },
  refreshEmptyButton: {
    padding: "8px 20px",
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
    margin: "0 auto",
  },
  footer: {
    padding: "12px 20px",
    borderTop: "1px solid #f3f4f6",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "white",
    flexShrink: 0,
  },
  footerStats: {
    fontSize: "12px",
    color: "#6b7280",
    fontWeight: "500",
  },
  footerText: {
    opacity: 0.8,
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

// Component for the notification bell in navbar
export const NotificationBell = ({ onClick, unreadCount }) => {
  return (
    <button
      onClick={onClick}
      style={{
        position: "relative",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "8px",
        borderRadius: "50%",
        transition: "all 0.2s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      title="Notifications"
    >
      <Bell size={24} color="#374151" />
      
      {unreadCount > 0 && (
        <span
          style={{
            position: "absolute",
            top: "2px",
            right: "2px",
            backgroundColor: "#b91c1c",
            color: "white",
            fontSize: "10px",
            fontWeight: "bold",
            minWidth: "18px",
            height: "18px",
            borderRadius: "9px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 4px",
            border: "2px solid white",
            animation: unreadCount > 0 ? "pulse 2s infinite" : "none",
          }}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
      
      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        button:hover {
          background-color: #f3f4f6;
        }
      `}</style>
    </button>
  );
};

export default NotificationsModal;