"use client"

import { useEffect, useState } from "react"

const NotificationsModal = ({ isOpen }) => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)

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

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      fetch("http://localhost:8000/api/get_vetnotifications/")
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch notifications")
          return res.json()
        })
        .then((data) => {
          const formatted = data
            .filter((n) => n.message) // Only keep messages
            .map((notif) => ({
              id: notif.id,
              message: notif.message,
              date: notif.date || new Date().toISOString(), // fallback to current time
            }))
          setNotifications(formatted)
        })
        .catch((err) => console.error("Failed to fetch notifications:", err))
        .finally(() => setLoading(false))
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div style={styles.dropdown}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Notifications</h2>
      </div>

      {/* Notification List */}
      <div style={styles.body}>
        {loading ? (
          <p style={{ textAlign: "center", color: "#6b7280" }}>Loading...</p>
        ) : notifications.length > 0 ? (
          notifications.map((n) => (
            <div key={n.id} style={styles.notification}>
              <p style={styles.message}>{n.message}</p>
              <span style={styles.date}>{formatDate(n.date)}</span>
            </div>
          ))
        ) : (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <p style={{ color: "#6b7280", marginBottom: "10px" }}>NO NOTIF</p>
            <button
              style={{
                background: "#b91c1c",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                fontSize: "12px",
                cursor: "pointer",
              }}
              onClick={() => setNotifications([])}
            >
              CLEAR
            </button>
          </div>
        )}
      </div>

      {/* Footer CLEAR button */}
      {notifications.length > 0 && (
        <div
          style={{
            padding: "10px 14px",
            borderTop: "1px solid #eee",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            style={{
              background: "none",
              border: "none",
              color: "#b91c1c",
              fontSize: "12px",
              cursor: "pointer",
              fontWeight: "600",
            }}
            onClick={() => setNotifications([])}
          >
            CLEAR
          </button>
        </div>
      )}
    </div>
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
  },
  header: {
    padding: "10px 14px",
    borderBottom: "1px solid #eee",
  },
  title: { fontSize: "16px", fontWeight: "600", color: "#b91c1c" },
  body: { padding: "10px" },
  notification: {
    padding: "10px",
    borderBottom: "1px solid #f1f1f1",
  },
  message: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#333",
  },
  date: { fontSize: "12px", color: "#888" },
}

export default NotificationsModal
