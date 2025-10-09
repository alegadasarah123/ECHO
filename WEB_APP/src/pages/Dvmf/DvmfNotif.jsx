"use client"

import { useEffect, useState } from "react"

const NotificationsModal = ({ isOpen, onNotificationClick, onClose, onMarkAllAsRead }) => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)

  const API_BASE = "http://127.0.0.1:8000/api/dvmf"

  // Format date in PH timezone
  const formatDate = (dateStr) => {
    if (!dateStr) return ""
    return new Date(dateStr).toLocaleString("en-PH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: "Asia/Manila",
    })
  }

  // Mark single notification as read in backend
  const markNotificationAsRead = async (notifId) => {
    try {
      const response = await fetch(`${API_BASE}/mark_notification_read/${notifId}/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) throw new Error("Failed to mark notification as read")

      const data = await response.json()
      console.log("Notification marked as read:", data)
      return true
    } catch (error) {
      console.error("Error marking notification as read:", error)
      return false
    }
  }

  // Mark all notifications as read in backend
  const markAllNotificationsAsRead = async () => {
    try {
      const response = await fetch(`${API_BASE}/mark_all_notifications_read/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) throw new Error("Failed to mark all notifications as read")

      const data = await response.json()
      console.log("All notifications marked as read:", data)
      return true
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      return false
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  // Mark all as read
  const markAllAsRead = async () => {
    setLoading(true)
    const success = await markAllNotificationsAsRead()

    if (success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      onMarkAllAsRead?.()
    }
    setLoading(false)
  }

  // Handle single notification click
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


  
  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      fetch(`${API_BASE}/get_vetnotifications/`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch notifications")
          return res.json()
        })
        .then((data) => {
          const formatted = data
            .filter((n) => n.message)
            .map((notif, index) => ({
              id: notif.id,
              message: notif.message,
              date: notif.date || new Date().toISOString(),
              read: notif.read || false,
              type: notif.type || "general",
              // Unique key to avoid duplicates
              uniqueKey: `${notif.id}-${index}`,
            }))
          setNotifications(formatted)
        })
        .catch((err) => console.error("Failed to fetch notifications:", err))
        .finally(() => setLoading(false))
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Transparent Backdrop */}
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
            <h2 style={styles.title}>Notifications</h2>
            {unreadCount > 0 && <span style={styles.unreadBadge}>{unreadCount}</span>}
          </div>

          {unreadCount > 0 && (
            <button onClick={markAllAsRead} disabled={loading} style={styles.markAllButton}>
              {loading ? "Marking..." : "Mark all as read"}
            </button>
          )}
        </div>

        {/* Notification List */}
        <div style={styles.body}>
          {loading ? (
            <p style={{ textAlign: "center", color: "#6b7280" }}>Loading...</p>
          ) : notifications.length > 0 ? (
            notifications.map((n) => (
              <div
                key={n.uniqueKey}
                style={{
                  ...styles.notification,
                  backgroundColor: !n.read ? "#e0f2fe" : "#fff",
                }}
                onClick={() => handleNotificationClick(n)}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  {!n.read && <div style={styles.unreadIndicator}></div>}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={styles.message}>{n.message}</p>
                    <span style={styles.date}>{formatDate(n.date)}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <p style={{ color: "#6b7280", marginBottom: "10px" }}>NO NOTIF</p>
              
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div style={styles.footer}>
            
            <button style={styles.closeButton} onClick={onClose}>
              CLOSE
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
    borderRadius: "12px",
    width: "300px",
    maxHeight: "400px",
    overflowY: "auto",
    boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
    zIndex: 1000,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "10px 14px",
    borderBottom: "1px solid #eee",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "linear-gradient(to right, #e0f2fe, #bae6fd)",
  },
  title: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#0c4a6e",
    margin: 0,
  },
  unreadBadge: {
    background: "#ef4444",
    color: "white",
    fontSize: "12px",
    fontWeight: "600",
    padding: "2px 6px",
    borderRadius: "12px",
    minWidth: "20px",
    textAlign: "center",
  },
  markAllButton: {
    background: "none",
    border: "none",
    color: "#0c4a6e",
    fontSize: "12px",
    cursor: "pointer",
    fontWeight: "600",
  },
  body: {
    padding: "10px",
    maxHeight: "320px",
    overflowY: "auto",
    flex: 1,
  },
  notification: {
    padding: "10px",
    borderBottom: "1px solid #f1f1f1",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  unreadIndicator: {
    width: "8px",
    height: "8px",
    background: "#0284c7",
    borderRadius: "50%",
    marginTop: "6px",
    flexShrink: 0,
  },
  message: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#333",
    margin: "0 0 4px 0",
  },
  date: {
    fontSize: "12px",
    color: "#888",
  },
  footer: {
    padding: "10px 14px",
    borderTop: "1px solid #eee",
    display: "flex",
    justifyContent: "space-between",
    gap: "8px",
  },
  closeButton: {
    background: "none",
    border: "none",
    color: "#0c4a6e",
    fontSize: "12px",
    cursor: "pointer",
    fontWeight: "600",
  },
}

export default NotificationsModal