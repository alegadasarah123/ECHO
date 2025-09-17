"use client"

import Sidebar from "@/components/CtuSidebar"
import { AlertTriangle, Bell, CheckCircle, ClipboardList, Clock, MapPin, Phone, User, XCircle } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import FloatingMessages from './CtuMessage'
import NotificationModal from "./CtuNotif"

const API_BASE = "http://127.0.0.1:8000/api/ctu_vetmed";

const styles = {
  bodyWrapper: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: "#f5f5f5",
    display: "flex",
    height: "100vh",
    overflowX: "hidden",
    width: "100%",
  },
  mainContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    width: "calc(100% - 250px)",
    transition: "margin-left 0.3s ease",
  },
  logoutBtns: {
    display: "flex",
    alignItems: "center",
    color: "white",
    textDecoration: "none",
    fontSize: "clamp(13px, 2vw, 15px)",
    fontWeight: 500,
    cursor: "pointer",
    padding: "14px 40px",
    borderRadius: "25px",
    transition: "all 0.3s ease",
    minHeight: "44px",
  },
  logoutBtnsHover: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  logoutIcons: {
    width: "20px",
    height: "20px",
    marginRight: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    flexShrink: 0,
  },
  headers: {
    background: "white",
    padding: "8px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    flexWrap: "wrap",
    gap: "55px",
  },
  dashboardContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 20px",
    background: "transparent",
  },
  dashboardTitle: {
    fontSize: "25px",
    fontWeight: "bold",
    color: "#da2424ff",
  },
  dashboardTime: {
    fontSize: "16px",
    fontWeight: 500,
    color: "#666",
    marginLeft: "20px",
  },
  notificationBtn: {
    position: "relative",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    borderRadius: "50%",
  },
  notificationBell: {
    fontSize: "20px",
    color: "#666",
    cursor: "pointer",
    position: "relative",
    marginRight: "20px",
    padding: "8px",
    minHeight: "44px",
    minWidth: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: "2px",
    right: "2px",
    backgroundColor: "#ef4444",
    color: "#fff",
    borderRadius: "50%",
    padding: "2px 6px",
    fontSize: "12px",
    fontWeight: "bold",
  },
  contentAreas: {
    flex: 1,
    padding: "24px",
    background: "#f5f5f5",
    overflowY: "auto",
  },
  statsContainers: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "24px",
    marginBottom: "24px",
  },
  statCard: {
    background: "white",
    padding: "24px",
    borderRadius: "10px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    transition: "transform 0.2s",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  statCardHover: {
    transform: "translateY(-2px)",
  },
  statIcon: {
   marginRight: "10px",
    padding: "12px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  
  pendingIcon: {
    backgroundColor: "#fef3c7",
    color: "#d97706",
  },
  approvedIcon: {
    backgroundColor: "#dcfce7",
    color: "#16a34a",
  },
  declinedIcon: {
    backgroundColor: "#fee2e2",
    color: "#dc2626",
  },
  statTitle: {
     color: "#666",
     fontSize: "14px",
    fontWeight: "500",
  },
  
  statNumbers: {
    fontSize: "36px",
    fontWeight: "bold",
    color: "#b91c1c",
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 400px",
    gap: "24px",
  },
  recentActivity: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    border: "1px solid #fee2e2",
    maxHeight: "600px",
    overflowY: "auto",
  },
  activityHeader: {
    fontSize: "20px",
    fontWeight: "bold",
    marginBottom: "4px",
    color: "#dc2626",
  },
  activitySubtitle: {
    fontSize: "14px",
    color: "#666",
    marginBottom: "20px",
  },
  activityCards: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxHeight: "300px",
    overflowY: "auto",
  },
  activityCard: {
    borderRadius: "12px",
    padding: "10px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    transition: "all 0.3s ease",
    position: "relative",
    overflow: "hidden",
  },
  // Enhanced color variations for activity cards
  activityCard0: {
    background: "linear-gradient(135deg, #fef2f2 0%, #fff 100%)",
    border: "1px solid #fca5a5",
  },
  activityCard1: {
    background: "linear-gradient(135deg, #eff6ff 0%, #fff 100%)",
    border: "1px solid #93c5fd",
  },
  activityCard2: {
    background: "linear-gradient(135deg, #ecfdf5 0%, #fff 100%)",
    border: "1px solid #86efac",
  },
  activityCard3: {
    background: "linear-gradient(135deg, #faf5ff 0%, #fff 100%)",
    border: "1px solid #c4b5fd",
  },
  activityCard4: {
    background: "linear-gradient(135deg, #fff7ed 0%, #fff 100%)",
    border: "1px solid #fdba74",
  },
  activityCard5: {
    background: "linear-gradient(135deg, #f0f9ff 0%, #fff 100%)",
    border: "1px solid #7dd3fc",
  },
  activityCard6: {
    background: "linear-gradient(135deg, #f0fdf4 0%, #fff 100%)",
    border: "1px solid #bbf7d0",
  },
  activityCard7: {
    background: "linear-gradient(135deg, #fefce8 0%, #fff 100%)",
    border: "1px solid #fde047",
  },
  activityCard8: {
    background: "linear-gradient(135deg, #fdf2f8 0%, #fff 100%)",
    border: "1px solid #f9a8d4",
  },
  activityCard9: {
    background: "linear-gradient(135deg, #f3e8ff 0%, #fff 100%)",
    border: "1px solid #d8b4fe",
  },
  activityAvatar: {
    color: "white",
    fontWeight: "bold",
    borderRadius: "50%",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    flexShrink: 0,
  },
  // Enhanced color variations for avatars
  activityAvatar0: {
    background: "linear-gradient(135deg, #dc2626, #ef4444)",
    boxShadow: "0 2px 8px rgba(220, 38, 38, 0.3)",
  },
  activityAvatar1: {
    background: "linear-gradient(135deg, #2563eb, #3b82f6)",
    boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
  },
  activityAvatar2: {
    background: "linear-gradient(135deg, #059669, #10b981)",
    boxShadow: "0 2px 8px rgba(5, 150, 105, 0.3)",
  },
  activityAvatar3: {
    background: "linear-gradient(135deg, #7c3aed, #8b5cf6)",
    boxShadow: "0 2px 8px rgba(124, 58, 237, 0.3)",
  },
  activityAvatar4: {
    background: "linear-gradient(135deg, #ea580c, #f97316)",
    boxShadow: "0 2px 8px rgba(234, 88, 12, 0.3)",
  },
  activityAvatar5: {
    background: "linear-gradient(135deg, #0891b2, #06b6d4)",
    boxShadow: "0 2px 8px rgba(8, 145, 178, 0.3)",
  },
  activityAvatar6: {
    background: "linear-gradient(135deg, #15803d, #22c55e)",
    boxShadow: "0 2px 8px rgba(21, 128, 61, 0.3)",
  },
  activityAvatar7: {
    background: "linear-gradient(135deg, #a16207, #eab308)",
    boxShadow: "0 2px 8px rgba(161, 98, 7, 0.3)",
  },
  activityAvatar8: {
    background: "linear-gradient(135deg, #be185d, #ec4899)",
    boxShadow: "0 2px 8px rgba(190, 24, 93, 0.3)",
  },
  activityAvatar9: {
    background: "linear-gradient(135deg, #6b21a8, #a855f7)",
    boxShadow: "0 2px 8px rgba(107, 33, 168, 0.3)",
  },
  activityInfo: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "3px 10px",
  },
  activityName: {
    fontWeight: 600,
    fontSize: "14px",
    color: "#1f2937",
    gridColumn: "1 / -1",
  },
  activityDetail: {
    display: "flex",
    flexDirection: "column",
    gap: "1px",
  },
  activityLabel: {
    fontSize: "10px",
    fontWeight: 500,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  activityValue: {
    fontSize: "12px",
    color: "#374151",
  },
  activityRole: {
    padding: "4px 8px",
    borderRadius: "12px",
    fontSize: "10px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  activityRolePending: {
    background: "#fef3c7",
    color: "#d97706",
    border: "1px solid #fbbf24",
  },
  activityRoleApproved: {
    background: "#dcfce7",
    color: "#16a34a",
    border: "1px solid #4ade80",
  },
  activityRoleDeclined: {
    background: "#fee2e2",
    color: "#dc2626",
    border: "1px solid #f87171",
  },
  activityDate: {
    fontSize: "10px",
    color: "#6b7280",
    fontWeight: 500,
    whiteSpace: "nowrap",
  },
  // SOS Emergency Styles
  sosWidget: {
    background: "white",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    border: "1px solid #fee2e2",
    padding: "20px",
    maxHeight: "380px",
    overflowY: "auto",
  },
  sosHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
    paddingBottom: "12px",
    borderBottom: "2px solid #fee2e2",
  },
  sosTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#dc2626",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  sosSubtitle: {
    fontSize: "14px",
    color: "#666",
    marginBottom: "16px",
  },
  sosList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  sosItem: {
    background: "linear-gradient(135deg, #fef2f2 0%, #fff 100%)",
    border: "1px solid #fca5a5",
    borderRadius: "12px",
    padding: "16px",
    transition: "all 0.3s ease",
    cursor: "pointer",
    position: "relative",
    overflow: "hidden",
  },
  sosItemHover: {
    transform: "translateY(-2px)",
    boxShadow: "0 8px 25px rgba(220, 38, 38, 0.15)",
    borderColor: "#dc2626",
  },
  sosItemHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
  },
  sosEmergencyType: {
    background: "#dc2626",
    color: "white",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  sosUrgent: {
    background: "#ef4444",
    animation: "pulse 2s infinite",
  },
  sosTime: {
    fontSize: "12px",
    color: "#6b7280",
    fontWeight: 500,
  },
  sosDetails: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
    marginBottom: "12px",
  },
  sosDetailItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    color: "#374151",
  },
  sosLocation: {
    background: "#f3f4f6",
    padding: "8px 12px",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#4b5563",
    fontStyle: "italic",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  chatWidget: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: 1000,
  },
  chatButton: {
    width: "64px",
    height: "64px",
    background: "#b91c1c",
    border: "none",
    borderRadius: "20px",
    color: "white",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(28, 44, 185, 0.3)",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  chatDots: {
    display: "flex",
    gap: "6px",
    alignItems: "center",
    justifyContent: "center",
  },
  chatDot: {
    width: "8px",
    height: "8px",
    background: "white",
    borderRadius: "50%",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "2rem",
    color: "#6b7280",
  },
  emptyStateH3: {
    fontSize: "18px",
    marginBottom: "8px",
    color: "#374151",
  },
  emptyStateP: {
    fontSize: "14px",
  },
}

function CtuDashboard() {
  const navigate = useNavigate()

  const [notifsOpen, setNotifsOpen] = useState(false)
  const [setIsLogoutModalOpen] = useState(false)
  const [setIsNotificationDropdownOpen] = useState(false)

  const [notifications, setNotifications] = useState([])
  const [recordCount, setrecordCount] = useState(0)
  const [vetCount, setvetCount] = useState(0)
  const [declinedCount, setDeclinedCount] = useState(0)
  const [recentActivities, setRecentActivities] = useState([])
  const [sosEmergencies, setSosEmergencies] = useState([])

  const [time, setTime] = useState(new Date().toLocaleTimeString())
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const notificationBellRef = useRef(null)
  const notificationDropdownRef = useRef(null)
  const logoutModalRef = useRef(null)

  // Enhanced color assignment function
  const getColorIndex = (activity, index) => {
    // Use a combination of index and string hash for better distribution
    const stringHash = activity.title
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0)
    
    // Combine index and hash for better color distribution
    return (index + stringHash) % 10
  }
  
  // Data loading functions
  const loadStats = useCallback(() => {
    console.log("Loading statistics...")

    fetch("http://127.0.0.1:8000/api/ctu_vetmed/status-counts/", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setrecordCount(data.pending || 0)
        setvetCount(data.approved || 0)
        setDeclinedCount(data.declined || 0)
      })
      .catch((err) => console.error("Error fetching stats:", err))
  }, [])

  const loadRecentActivities = useCallback(() => {
    console.log("Loading recent activities...")
    setRecentActivities([])
  }, [])

  // ✅ Fetch notifications from backend
  const loadNotifications = useCallback(() => {
    console.log("Loading notifications...")

    fetch("http://127.0.0.1:8000/api/ctu_vetmed/get_vetnotifications/")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch notifications")
        return res.json()
      })
      .then((data) => {
        const formatted = data.map((notif) => ({
          id: notif.id,
          message: notif.message,
          date: notif.date || new Date().toISOString(),
        }))
        setNotifications(formatted)
      })
      .catch((err) => console.error("Failed to fetch notifications:", err))
  }, [])

  const loadSosEmergencies = useCallback(() => {
    console.log("Loading SOS emergencies...");

    fetch("http://127.0.0.1:8000/api/ctu_vetmed/sos_requests/", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("Raw SOS data:", data);

        let sosData = [];
        if (Array.isArray(data)) sosData = data;
        else if (data.sos_requests && Array.isArray(data.sos_requests))
          sosData = data.sos_requests;
        else if (data.results && Array.isArray(data.results)) sosData = data.results;
        else {
          console.warn("Unexpected data structure:", data);
          setSosEmergencies([]);
          return;
        }

        const formatted = sosData.map((item) => {
          // Safe "time ago"
          let timeAgo = "Unknown time";
          try {
            if (item.time || item.created_at) {
              const createdDate = new Date(item.time || item.created_at);
              const diffMs = Date.now() - createdDate.getTime();
              const diffMin = Math.floor(diffMs / 60000);
              if (diffMin < 1) timeAgo = "Just now";
              else if (diffMin < 60) timeAgo = `${diffMin} min ago`;
              else if (diffMin < 1440) timeAgo = `${Math.floor(diffMin / 60)} hr ago`;
              else timeAgo = `${Math.floor(diffMin / 1440)} day(s) ago`;
            }
          } catch {
            console.warn("Invalid timestamp:", item.time || item.created_at);
          }

          return {
            id: item.id,
            type: item.type || "Emergency",
            contact: item.contact || "Unknown Contact",
            phone: item.phone || "N/A",
            location: item.location || "No location provided",
            time: timeAgo,
            urgent: item.urgent === true || item.status === "pending",
            description: item.description || "No description provided",
          };
        });

        console.log("Formatted SOS data:", formatted);
        setSosEmergencies(formatted);
      })
      .catch((err) => {
        console.error("Error fetching SOS emergencies:", err);
      });
  }, []);

  const loadDashboardData = useCallback(() => {
    loadStats()
    loadRecentActivities()
    loadNotifications()
    loadSosEmergencies()
  }, [loadStats, loadRecentActivities, loadNotifications, loadSosEmergencies])

  const closeLogoutModal = () => {
    setIsLogoutModalOpen(false)
  }

  // ✅ Auto-refresh every 30s
  useEffect(() => {
    loadNotifications() // load once

    const interval = setInterval(() => {
      loadNotifications()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [loadNotifications])

  // Fetch from Django backend
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/ctu_vetmed/recent-activity/", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        return res.json();
      })
      .then((data) => setRecentActivities(data))
      .catch((err) => console.error("Error fetching activity:", err));
  }, []);

  // Effects
  useEffect(() => {
    console.log("Veterinary Dashboard initialized")
    loadDashboardData()
  }, [loadDashboardData])

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close notification dropdown
      if (
        notificationBellRef.current &&
        !notificationBellRef.current.contains(event.target) &&
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(event.target)
      ) {
        setIsNotificationDropdownOpen(false)
      }

      // Close logout modal
      if (logoutModalRef.current && event.target === logoutModalRef.current) {
        closeLogoutModal()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleSosItemClick = (emergency) => {
    console.log("SOS Emergency clicked:", emergency)
    // Handle emergency action here
  }

  return (
    <div style={styles.bodyWrapper}>
      <Sidebar isOpen={isSidebarOpen} />

      <div style={styles.mainContent}>
        <header style={styles.headers}>
          <div style={styles.dashboardContainer}>
            <h2 style={styles.dashboardTitle}>Dashboard</h2>
            <span style={styles.dashboardTime}>{time}</span>
          </div>
          <button
            style={styles.notificationBtn}
            onClick={() => setNotifsOpen(!notifsOpen)}
          >
            <Bell size={24} color="#374151" />
            {notifications.length > 0 && (
              <span style={styles.badge}>{notifications.length}</span>
            )}
          </button>

          {/* 📩 Notification Modal */}
          <NotificationModal
            isOpen={notifsOpen}
            onClose={() => setNotifsOpen(false)}
            notifications={notifications.map((n) => ({
              message: n.message,
              date: n.date,
            }))}
          />
        </header>

        <div style={styles.contentAreas}>
          <div style={styles.statsContainers}>
            <div style={styles.statCard}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <div style={styles.statTitle}>Total Pending</div>
                <div style={{ ...styles.statIcon, ...styles.pendingIcon }}>
                  <Clock size={24} />
                </div>
              </div>
              <div style={styles.statNumbers}>{recordCount}</div>
            </div>

            <div style={styles.statCard}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <div style={styles.statTitle}>Total Approved</div>
                <div style={{ ...styles.statIcon, ...styles.approvedIcon }}>
                  <CheckCircle size={24} />
                </div>
              </div>
              <div style={styles.statNumbers}>{vetCount}</div>
            </div>

            <div style={styles.statCard}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <div style={styles.statTitle}>Total Declined</div>
                <div style={{ ...styles.statIcon, ...styles.declinedIcon }}>
                  <XCircle size={24} />
                </div>
              </div>
              <div style={styles.statNumbers}>{declinedCount || 0}</div>
            </div>
          </div>

          <div style={styles.mainGrid}>
            <div style={styles.recentActivity}>
              <h3 style={styles.activityHeader}>Recent Activity</h3>
              <p style={styles.activitySubtitle}>Latest updates from the system</p>

              {recentActivities.length === 0 ? (
                <div style={styles.emptyState}>
                  <ClipboardList size={48} />
                  <h3 style={styles.emptyStateH3}>No recent activity</h3>
                  <p style={styles.emptyStateP}>Activity will appear here when available</p>
                </div>
              ) : (
                <div style={styles.activityCards}>
                  {recentActivities.map((activity, index) => {
                    const initials = activity.title
                      .split(" ")
                      .map((word) => word[0])
                      .join("")
                      .toUpperCase()

                    // Enhanced color assignment
                    const colorIndex = getColorIndex(activity, index)

                    const getActivityCardStyle = (colorIndex) => {
                      const baseStyle = styles.activityCard
                      const colorStyle = styles[`activityCard${colorIndex}`]
                      return { ...baseStyle, ...colorStyle }
                    }

                    const getActivityAvatarStyle = (colorIndex) => {
                      const baseStyle = styles.activityAvatar
                      const colorStyle = styles[`activityAvatar${colorIndex}`]
                      return { ...baseStyle, ...colorStyle }
                    }

                    const getRoleStyle = (status) => {
                      const baseStyle = styles.activityRole
                      const statusStyle = styles[`activityRole${status.charAt(0).toUpperCase() + status.slice(1)}`]
                      return { ...baseStyle, ...statusStyle }
                    }

                    return (
                      <div key={activity.id} style={getActivityCardStyle(colorIndex)}>
                        <div style={getActivityAvatarStyle(colorIndex)}>{initials}</div>
                        <div style={styles.activityInfo}>
                          <div style={styles.activityName}>{activity.title}</div>
                          <div style={styles.activityDetail}>
                            <span style={styles.activityLabel}>Email</span>
                            <span style={styles.activityValue}>
                              {activity.email || `${activity.title.toLowerCase().replace(" ", "")}@gmail.com`}
                            </span>
                          </div>
                          <div style={styles.activityDetail}>
                            <span style={styles.activityLabel}>Description</span>
                            <span style={styles.activityValue}>{activity.description || "System activity update"}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                          <span style={getRoleStyle(activity.status)}>{activity.status}</span>
                          <span style={styles.activityDate}>
                            {new Date(activity.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* SOS Emergency Widget */}
              <div style={styles.sosWidget}>
              <div style={styles.sosHeader}>
                <h3 style={styles.sosTitle}>
                  <AlertTriangle size={24} />
                  SOS Emergency
                </h3>
              </div>
              <p style={styles.sosSubtitle}>Active emergency contacts and alerts</p>

              {sosEmergencies.length === 0 ? (
                <div style={styles.emptyState}>
                  <AlertTriangle size={48} />
                  <h3 style={styles.emptyStateH3}>No active emergencies</h3>
                  <p style={styles.emptyStateP}>Emergency alerts will appear here</p>
                </div>
              ) : (
                <div style={styles.sosList}>
                  {sosEmergencies.map((emergency) => (
                    <div
                      key={emergency.id}
                      style={styles.sosItem}
                      onClick={() => handleSosItemClick(emergency)}
                      onMouseEnter={(e) => {
                        Object.assign(e.currentTarget.style, styles.sosItemHover)
                      }}
                      onMouseLeave={(e) => {
                        Object.assign(e.currentTarget.style, styles.sosItem)
                      }}
                    >
                      <div style={styles.sosItemHeader}>
                        <span
                          style={{
                            ...styles.sosEmergencyType,
                            ...(emergency.urgent ? styles.sosUrgent : {}),
                          }}
                        >
                          {emergency.type}
                        </span>
                        <span style={styles.sosTime}>{emergency.time}</span>
                      </div>

                      <div style={styles.sosDetails}>
                        <div style={styles.sosDetailItem}>
                          <User size={16} />
                          <span>{emergency.contact}</span>
                        </div>
                        <div style={styles.sosDetailItem}>
                          <Phone size={16} />
                          <span>{emergency.phone}</span>
                        </div>
                      </div>

                      <div style={styles.sosLocation}>
                        <MapPin size={14} />
                        <span>{emergency.location}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <FloatingMessages />
    </div>
  )
}

export default CtuDashboard