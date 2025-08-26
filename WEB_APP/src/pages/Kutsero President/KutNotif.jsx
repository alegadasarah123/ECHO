import { useEffect, useState } from "react";

const NotificationModal = ({ isOpen }) => {
  const [notifications, setNotifications] = useState([]);
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
      second: "2-digit",
      hour12: true,
      timeZone: "Asia/Manila",
    });
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch("http://localhost:8000/api/kutsero_president/get_notifications/") // Django API endpoint
        .then((res) => res.json())
        .then((data) => setNotifications(data))
        .catch((err) => console.error("Failed to fetch notifications:", err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
          notifications.map((n, i) => (
            <div key={i} style={styles.notification}>
              <p style={styles.message}>{n.message}</p>
              <span style={styles.date}>{formatDate(n.date)}</span>
            </div>
          ))
        ) : (
          <p style={{ textAlign: "center", color: "#6b7280" }}>
            No notifications
          </p>
        )}
      </div>
    </div>
  );
};

const styles = {
  dropdown: {
    position: "absolute",
    top: "50px",
    right: "0px",
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
  title: { fontSize: "16px", fontWeight: "600", color: "#D2691E" },
  body: { padding: "10px" },
  notification: {
    padding: "10px",
    borderBottom: "1px solid #f1f1f1",
  },
  message: {
    fontSize: "14px",
    fontWeight: "500",
    marginBottom: "4px",
    color: "#333",
  },
  date: { fontSize: "12px", color: "#888" },
};

export default NotificationModal;
