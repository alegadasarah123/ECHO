"use client"

import {
  AlertCircle,
  Bell,
  Circle,
  Clock,
  Inbox,
  Loader2,
  RefreshCw,
  X
} from "lucide-react"
import { useEffect, useState } from "react"

const NotificationsModal = ({ isOpen, onNotificationClick, onClose, onMarkAllAsRead }) => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const API_BASE = "http://localhost:8000/api/dvmf"

  const formatDate = (dateStr) => {
    if (!dateStr) return ""
    try {
      return new Date(dateStr).toLocaleString("en-PH", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Manila",
      })
    } catch (e) {
      return "Invalid date"
    }
  }

  const normalizeStatus = (message) => {
    if (!message) return message
    
    return message
      .replace(/\bdeclined\b/gi, "Not Approved")
      .replace(/\bdecline\b/gi, "Not Approved")
      .replace(/\bpending\b/gi, "Pending")
      .replace(/\bapproved\b/gi, "Approved")
  }

  const markNotificationAsRead = async (notifId) => {
    try {
      const response = await fetch(`${API_BASE}/mark_notification_read/${notifId}/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })
      return response.ok
    } catch (error) {
      return false
    }
  }

  const markAllNotificationsAsRead = async () => {
    try {
      const response = await fetch(`${API_BASE}/mark_all_notifications_read/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })
      return response.ok
    } catch (error) {
      return false
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllAsRead = async () => {
    setLoading(true)
    const success = await markAllNotificationsAsRead()
    if (success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      onMarkAllAsRead?.()
    }
    setLoading(false)
  }

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      const success = await markNotificationAsRead(notification.id)
      if (success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        )
      }
    }
    onClose?.()
    onNotificationClick?.(notification)
  }

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`${API_BASE}/get_vetnotifications/`, {
        credentials: "include",
        headers: {
          'Accept': 'application/json',
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication failed - please log in again")
        }
        throw new Error(`Failed to fetch notifications: ${response.status}`)
      }

      const data = await response.json()
      
      const seenMessages = new Set()
      const uniqueNotifications = []
      
      data.forEach((notif) => {
        if (!notif.message) return
        
        const messageKey = `${notif.id}-${notif.message}`
        if (!seenMessages.has(messageKey)) {
          seenMessages.add(messageKey)
          uniqueNotifications.push({
            id: notif.id,
            message: normalizeStatus(notif.message),
            date: notif.date || new Date().toISOString(),
            read: notif.read || false,
            type: notif.type || "general",
            uniqueKey: messageKey,
          })
        }
      })
      
      setNotifications(uniqueNotifications)
    } catch (err) {
      setError(err.message)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen])

  if (!isOpen) return null

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
        <div style={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={styles.headerIcon}>
              <Bell size={20} color="white" />
            </div>
            <div>
              <h2 style={styles.title}>Notifications</h2>
              <p style={styles.subtitle}>{unreadCount} unread</p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button onClick={markAllAsRead} disabled={loading} style={styles.markAllButton}>
              {loading ? (
                <Loader2 size={14} className="spinner" />
              ) : (
                "Mark all as read"
              )}
            </button>
          )}
        </div>

        <div style={styles.body}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <Loader2 size={32} color="#0F3D5A" className="spinner" />
              <p style={styles.loadingText}>Loading notifications...</p>
            </div>
          ) : error ? (
            <div style={styles.errorContainer}>
              <AlertCircle size={32} color="#dc2626" />
              <p style={styles.errorTitle}>Unable to load</p>
              <p style={styles.errorMessage}>{error}</p>
              <div style={styles.retryButtonContainer}>
                <button 
                  onClick={fetchNotifications}
                  style={styles.retryButton}
                >
                  <RefreshCw size={14} />
                  Try Again
                </button>
              </div>
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
                  <div style={styles.notificationIcon}>
                    {!n.read && <Circle size={12} fill="#0F3D5A" color="#0F3D5A" />}
                  </div>
                  <div style={styles.messageContainer}>
                    <p style={styles.message}>{n.message}</p>
                    <div style={styles.notificationFooter}>
                      <div style={styles.dateContainer}>
                        <Clock size={12} color="#64748b" />
                        <span style={styles.date}>{formatDate(n.date)}</span>
                      </div>
                      {!n.read && <span style={styles.newBadge}>New</span>}
                    </div>
                  </div>
                </div>
                <div style={styles.notificationHoverEffect}></div>
              </div>
            ))
          ) : (
            <div style={styles.emptyState}>
              <Inbox size={48} color="#64748b" opacity={0.6} />
              <p style={styles.emptyTitle}>No notifications</p>
              <p style={styles.emptyMessage}>You're all caught up!</p>
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div style={styles.footer}>
            <button style={styles.closeButton} onClick={onClose}>
              <X size={16} />
              Close
            </button>
          </div>
        )}
      </div>
    </>
  )
}

const styles = {
  dropdown: {
    position: "absolute",
    top: "60px",
    right: "10px",
    background: "#fff",
    borderRadius: "16px",
    width: "380px",
    maxHeight: "500px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.1)",
    border: "1px solid #e1e5e9",
    zIndex: 1000,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    padding: "20px 24px",
    borderBottom: "1px solid #f1f5f9",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    background: "#0F3D5A",
    color: "white",
  },
  headerIcon: {
    background: "rgba(255,255,255,0.1)",
    padding: "8px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: "18px",
    fontWeight: "700",
    color: "white",
    margin: "0 0 4px 0",
    letterSpacing: "-0.025em",
  },
  subtitle: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.8)",
    margin: 0,
    fontWeight: "500",
  },
  markAllButton: {
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.3)",
    color: "white",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    padding: "8px 16px",
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
    background: "#fafbfc",
    flex: 1,
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 24px",
  },
  loadingText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: "14px",
    margin: "16px 0 0 0",
    fontWeight: "500",
  },
  errorContainer: {
    textAlign: "center",
    padding: "40px 24px",
    background: "#fef2f2",
    margin: "16px",
    borderRadius: "12px",
    border: "1px solid #fecaca",
  },
  errorTitle: {
    color: "#dc2626",
    fontSize: "16px",
    fontWeight: "600",
    margin: "12px 0 8px 0",
  },
  errorMessage: {
    color: "#991b1b",
    fontSize: "13px",
    margin: "0 0 20px 0",
    opacity: 0.8,
    lineHeight: "1.4",
  },
  retryButtonContainer: {
    display: "flex",
    justifyContent: "center",
    width: "100%",
  },
  retryButton: {
    padding: "10px 20px",
    background: "#0F3D5A",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    justifyContent: "center",
  },
  notification: {
    padding: "18px 24px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    position: "relative",
    overflow: "hidden",
    borderBottom: "1px solid #f1f5f9",
  },
  notificationUnread: {
    background: "linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%)",
    borderLeft: "4px solid #0F3D5A",
  },
  notificationRead: {
    background: "white",
    borderLeft: "4px solid transparent",
  },
  notificationContent: {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
    position: "relative",
    zIndex: 2,
  },
  notificationIcon: {
    flexShrink: 0,
    paddingTop: "2px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  messageContainer: {
    flex: 1,
    minWidth: 0,
  },
  message: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#1e293b",
    margin: "0 0 10px 0",
    lineHeight: "1.5",
  },
  notificationFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
  },
  dateContainer: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  date: {
    fontSize: "12px",
    color: "#64748b",
    fontWeight: "500",
  },
  newBadge: {
    background: "#0F3D5A",
    color: "white",
    fontSize: "10px",
    fontWeight: "700",
    padding: "4px 8px",
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
    background: "linear-gradient(135deg, rgba(15, 61, 90, 0.03) 0%, rgba(15, 61, 90, 0.08) 100%)",
    opacity: 0,
    transition: "opacity 0.2s ease",
    zIndex: 1,
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 24px",
    background: "white",
  },
  emptyTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#475569",
    margin: "16px 0 8px 0",
  },
  emptyMessage: {
    fontSize: "14px",
    color: "#64748b",
    margin: 0,
    opacity: 0.8,
  },
  footer: {
    padding: "16px 24px",
    borderTop: "1px solid #f1f5f9",
    display: "flex",
    justifyContent: "flex-end",
    background: "white",
  },
  closeButton: {
    background: "#0F3D5A",
    border: "none",
    color: "white",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    padding: "8px 20px",
    borderRadius: "8px",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    justifyContent: "center",
  },
}

if (typeof document !== 'undefined') {
  const styleSheet = document.styleSheets[0]
  if (styleSheet) {
    styleSheet.insertRule(`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `, styleSheet.cssRules.length)

    styleSheet.insertRule(`
      .spinner {
        animation: spin 1s linear infinite;
      }
    `, styleSheet.cssRules.length)

    styleSheet.insertRule(`
      .notification:hover .notificationHoverEffect {
        opacity: 1;
      }
    `, styleSheet.cssRules.length)

    styleSheet.insertRule(`
      .markAllButton:hover {
        background: rgba(255,255,255,0.25) !important;
        transform: translateY(-1px);
      }
    `, styleSheet.cssRules.length)

    styleSheet.insertRule(`
      .retryButton:hover, .closeButton:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(15, 61, 90, 0.3);
      }
    `, styleSheet.cssRules.length)
  }
}

export default NotificationsModal