"use client"

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./DvmfHealthReport.css"; // Import the new CSS file

function DvmfHealthReport() {
  const navigate = useNavigate()

  // State for sidebar and modals
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)

  // State for data
  const [notifications, setNotifications] = useState([])
  const [statistics, setStatistics] = useState({
    totalHorses: 0,
    healthy: 0,
    warning: 0,
    poorHealth: 0,
  })
  const [healthData, setHealthData] = useState([]) // Data for the chart

  // State for filters and search
  const [timeFilter, setTimeFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")

  // Refs for click outside functionality
  const notificationBellRef = useRef(null)
  const notificationDropdownRef = useRef(null)
  const logoutModalRef = useRef(null)

  // Helper to format time for notifications
  const formatTimeAgo = useCallback((timestamp) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60))
    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }, [])

  const getNotificationIconClass = (type) => {
    const icons = {
      info: "fas fa-info-circle",
      success: "fas fa-check-circle",
      warning: "fas fa-exclamation-triangle",
      error: "fas fa-times-circle",
    }
    return icons[type] || icons.info
  }

  const markAsRead = (notificationId) => {
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const deleteNotification = (notificationId) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
  }

  const loadNotifications = useCallback(() => {
    // Placeholder for fetching notifications from backend
    // For now, initialize with some dummy data
    setNotifications([
      
    ])
  }, [])

  const loadStatistics = useCallback(() => {
    // Placeholder for fetching statistics from backend
    setStatistics({
     
    })
  }, [])

  const loadHealthData = useCallback((filter = "all") => {
    console.log(`Loading health data for: ${filter}`)
    // Placeholder for fetching chart data from backend based on filter
    setHealthData([
      
    ])
  }, [])

  const handleTimeFilterChange = (e) => {
    setTimeFilter(e.target.value)
    loadHealthData(e.target.value)
  }

  const handleSearchInput = (e) => {
    setSearchTerm(e.target.value.toLowerCase())
    // Implement search logic here if needed for the dashboard
  }

  const handleExport = () => {
    console.log("Exporting health reports data")
    alert("Health reports data would be exported here")
  }

  const handleStatCardClick = (label, count) => {
    console.log(`${label} clicked: ${count}`)
    alert(`${label}: ${count}\n\nClick to view detailed statistics`)
  }

  const openLogoutModal = (e) => {
    e.preventDefault()
    setIsLogoutModalOpen(true)
  }

  const closeLogoutModal = () => {
    setIsLogoutModalOpen(false)
  }

  const confirmLogout = () => {
    console.log("User logged out")
    // In a real app, clear authentication tokens/session
    navigate("/CtuLogin") // Assuming this is your login route
    closeLogoutModal()
  }

  const toggleSidebar = () => {
    setIsSidebarExpanded((prev) => !prev)
  }

  // Effects for initial data loading
  useEffect(() => {
    loadNotifications()
    loadStatistics()
    loadHealthData()
  }, [loadNotifications, loadStatistics, loadHealthData])

  // Effects for click outside and resize
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
      if (isLogoutModalOpen && logoutModalRef.current && event.target === logoutModalRef.current) {
        closeLogoutModal()
      }
      // Close mobile sidebar
      const sidebar = document.getElementById("sidebar")
      const mobileMenuBtn = document.querySelector(".mobile-menu-btn")
      if (
        window.innerWidth <= 768 &&
        isSidebarExpanded &&
        sidebar &&
        !sidebar.contains(event.target) &&
        mobileMenuBtn &&
        !mobileMenuBtn.contains(event.target)
      ) {
        setIsSidebarExpanded(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isNotificationDropdownOpen, isLogoutModalOpen, isSidebarExpanded])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsSidebarExpanded(false)
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const unreadNotificationCount = notifications.filter((n) => !n.read).length

  return (
    <div className="bodyWrapper">
      <button className="mobile-menu-btn" onClick={toggleSidebar}>
        ☰
      </button>

      <div className={`sidebar ${isSidebarExpanded ? "open" : ""}`} id="sidebar">
        <div className="sidebar-logo">
          <img src="/images/logo.png" alt="CTU Logo" className="logo" />
        </div>

        <nav className="nav-menu">
          {[
            { name: "Dashboard", iconClass: "fas fa-th-large", path: "/DvmfDashboard" },
            { name: "Account Approval", iconClass: "fas fa-user-check", path: "/DvmfAccountApproval" },
            { name: "Access Requests", iconClass: "fas fa-file-alt", path: "/DvmfAccessRequest" },
            { name: "Horse Records", iconClass: "fas fa-clipboard-list", path: "/HorseRecord" },
            { name: "Health Reports", iconClass: "fas fa-chart-bar", path: "/DvmfHealthReport", active: true },
            { name: "Announcements", iconClass: "fas fa-bullhorn", path: "/DvmfAnnouncement" },
            { name: "Directory", iconClass: "fas fa-folder", path: "/DvmfDirectory" },
            { name: "Settings", iconClass: "fas fa-cog", path: "/DvmfSettings" },
          ].map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`nav-item ${item.active ? "active" : ""}`}
              onClick={() => {
                if (isSidebarExpanded) {
                  setIsSidebarExpanded(false)
                }
              }}
            >
              <i className={`nav-icon ${item.iconClass}`}></i>
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="logout">
          <a href="#" className="logout-btn" id="logoutBtn" onClick={openLogoutModal}>
            <i className="logout-icon fas fa-sign-out-alt"></i>
            Log Out
          </a>
        </div>
      </div>

      <div className="main-content">
        <header className="header">
          <div className="search-container">
            <div className="search-icon"></div>
            <input
              type="text"
              className="search-input"
              placeholder="Search......"
              id="searchInput"
              onChange={handleSearchInput}
            />
          </div>
          <div
            className="notification-bell"
            id="notification-bell"
            ref={notificationBellRef}
            onClick={() => setIsNotificationDropdownOpen((prev) => !prev)}
          >
            <i className="fas fa-bell"></i>
            {unreadNotificationCount > 0 && (
              <div className="notification-count" style={{ display: "flex" }}>
                {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
              </div>
            )}
            <div
              className={`notification-dropdown ${isNotificationDropdownOpen ? "show" : ""}`}
              id="notification-dropdown"
              ref={notificationDropdownRef}
            >
              <div className="notification-header">
                <h3>Notifications</h3>
                {unreadNotificationCount > 0 && (
                  <button className="mark-all-read" onClick={markAllAsRead}>
                    Mark all as read
                  </button>
                )}
              </div>
              <div id="notificationList">
                {notifications.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-bell-slash"></i>
                    <h3>No notifications</h3>
                    <p>You're all caught up!</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div key={notification.id} className={`notification-item ${!notification.read ? "unread" : ""}`}>
                      <div className="notification-actions">
                        {!notification.read && (
                          <button
                            className="notification-action"
                            onClick={() => markAsRead(notification.id)}
                            title="Mark as read"
                          >
                            <i className="fas fa-check"></i>
                          </button>
                        )}
                        <button
                          className="notification-action"
                          onClick={() => deleteNotification(notification.id)}
                          title="Delete"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                      <div className="notification-title">
                        <i
                          className={`notification-icon ${notification.type} ${getNotificationIconClass(
                            notification.type,
                          )}`}
                        ></i>
                        {notification.title}
                      </div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">{formatTimeAgo(notification.timestamp)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="content-area">
          <div className="page-header">
            <h1 className="page-title">Health Reports</h1>

            <div className="stats-grid">
              <div className="stat-card" onClick={() => handleStatCardClick("Total Horses", statistics.totalHorses)}>
                <div className="stat-number">{statistics.totalHorses}</div>
                <div className="stat-label">Total Horses</div>
              </div>
              <div className="stat-card" onClick={() => handleStatCardClick("Healthy", statistics.healthy)}>
                <div className="stat-number">{statistics.healthy}</div>
                <div className="stat-label">Healthy</div>
              </div>
              <div className="stat-card" onClick={() => handleStatCardClick("Warning", statistics.warning)}>
                <div className="stat-number">{statistics.warning}</div>
                <div className="stat-label">Warning</div>
              </div>
              <div className="stat-card" onClick={() => handleStatCardClick("Poor Health", statistics.poorHealth)}>
                <div className="stat-number">{statistics.poorHealth}</div>
                <div className="stat-label">Poor Health</div>
              </div>
            </div>

            <div className="chart-section">
              <div className="chart-header">
                <h2 className="chart-title">Health Status by Area</h2>
                <div className="chart-controls">
                  <select className="time-filter" id="timeFilter" value={timeFilter} onChange={handleTimeFilterChange}>
                    <option value="all">All Time</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                  </select>
                  <button className="export-btn" id="exportBtn" onClick={handleExport}>
                    Export
                  </button>
                </div>
              </div>

              <div className="chart-legend">
                <div className="legend-item">
                  <div className="legend-color legend-healthy"></div>
                  <span>Healthy</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color legend-warning"></div>
                  <span>Warning</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color legend-poor"></div>
                  <span>Poor Health</span>
                </div>
              </div>

              <div className="chart-container">
                {healthData.length === 0 ? (
                  <div className="empty-state" id="chartEmptyState">
                    <i className="fas fa-chart-bar"></i>
                    <h3>No health data available</h3>
                    <p>Health statistics will appear here when data is available</p>
                  </div>
                ) : (
                  <div className="chart-bars" id="chartBars">
                    {healthData.map((data, index) => (
                      <div className="bar-group" key={index}>
                        <div className="bars">
                          <div
                            className="bar bar-healthy"
                            style={{ height: `${(data.healthy / (data.healthy + data.warning + data.poor)) * 100}%` }}
                            title={`Healthy: ${data.healthy}`}
                          ></div>
                          <div
                            className="bar bar-warning"
                            style={{ height: `${(data.warning / (data.healthy + data.warning + data.poor)) * 100}%` }}
                            title={`Warning: ${data.warning}`}
                          ></div>
                          <div
                            className="bar bar-poor"
                            style={{ height: `${(data.poor / (data.healthy + data.warning + data.poor)) * 100}%` }}
                            title={`Poor Health: ${data.poor}`}
                          ></div>
                        </div>
                        <div className="area-label">{data.area}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Widget - Button Only */}
      <div className="chat-widget">
        <button className="chat-button" id="chatButton" onClick={() => navigate("/DvmfMessage")}>
          <div className="chat-dots">
            <div className="chat-dot"></div>
            <div className="chat-dot"></div>
            <div className="chat-dot"></div>
          </div>
        </button>
      </div>

      <div className={`modal-overlay ${isLogoutModalOpen ? "active" : ""}`} id="logoutModal" ref={logoutModalRef}>
        <div className="logout-modal">
          <div className="logout-modal-icon">
            <i className="fas fa-sign-out-alt"></i>
          </div>
          <h3>Confirm Logout</h3>
          <p>Are you sure you want to log out of your account?</p>
          <div className="logout-modal-buttons">
            <button className="logout-modal-btn cancel" onClick={closeLogoutModal}>
              No
            </button>
            <button className="logout-modal-btn confirm" onClick={confirmLogout}>
              Yes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DvmfHealthReport
