"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import "./DvmfDirectory.css"

// Dummy data for directory entries
const initialDirectoryData = [
  { id: "H001", name: "Thunder", type: "Horse", location: "Cebu City", status: "Healthy" },
  { id: "H002", name: "Lightning", type: "Horse", location: "Manila", status: "Healthy" },
  { id: "V001", name: "Dr. Maria Santos", type: "Veterinarian", location: "Cebu City", status: "Active" },
  { id: "V002", name: "Dr. Juan Cruz", type: "Veterinarian", location: "Davao", status: "Active" },
  { id: "K001", name: "Pedro Reyes", type: "Kutsero", location: "Cebu City", status: "Active" },
  { id: "H003", name: "Shadow", type: "Horse", location: "Cebu City", status: "Inactive" },
  { id: "V003", name: "Dr. Anna Lim", type: "Veterinarian", location: "Manila", status: "Inactive" },
  { id: "K002", name: "Jose Dela Cruz", type: "Kutsero", location: "Davao", status: "Inactive" },
]

// Dummy data for notifications
const initialNotifications = [
  {
    id: 1,
    title: "New Account Request",
    message: "John Doe has requested account approval.",
    type: "info",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    read: false,
  },
  {
    id: 2,
    title: "System Update",
    message: "Dashboard will be updated tonight.",
    type: "warning",
    timestamp: new Date(Date.now() - 65 * 60 * 1000),
    read: false,
  },
  {
    id: 3,
    title: "Report Generated",
    message: "Monthly health report is ready for download.",
    type: "success",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    read: true,
  },
]

function DvmfDirectory() {
  const navigate = useNavigate()
  const [directoryData, setDirectoryData] = useState(initialDirectoryData)
  const [filteredDirectoryData, setFilteredDirectoryData] = useState(initialDirectoryData)

  // Separate state for sidebar navigation active state
  const [currentPage, setCurrentPage] = useState("directory")

  // State for directory tab filtering (separate from navigation)
  const [currentTab, setCurrentTab] = useState("all")

  const [areaFilter, setAreaFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [notifications, setNotifications] = useState(initialNotifications)
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const sidebarRef = useRef(null)
  const notificationBellRef = useRef(null)
  const notificationDropdownRef = useRef(null)

  // Utility functions
  const formatTimeAgo = useCallback((timestamp) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60))
    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }, [])

  const getNotificationIcon = useCallback((type) => {
    const icons = {
      info: "fas fa-info-circle",
      success: "fas fa-check-circle",
      warning: "fas fa-exclamation-triangle",
      error: "fas fa-times-circle",
    }
    return icons[type] || icons.info
  }, [])

  // Notification handlers
  const markAsRead = useCallback((notificationId) => {
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)))
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const deleteNotification = useCallback((notificationId) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
  }, [])

  // Apply all filters and search
  const applyFiltersAndSearch = useCallback(() => {
    let filtered = directoryData

    // Apply tab filter
    switch (currentTab) {
      case "horses":
        filtered = filtered.filter((item) => item.type.toLowerCase() === "horse")
        break
      case "veterinarian":
        filtered = filtered.filter((item) => item.type.toLowerCase() === "veterinarian")
        break
      case "kutsero":
        filtered = filtered.filter((item) => item.type.toLowerCase() === "kutsero")
        break
      case "horses-per-owner":
        // This would require special handling for grouping horses by owner
        filtered = [] // For now, show empty for this tab
        break
      default:
        // 'all' tab
        break
    }

    // Apply area filter
    if (areaFilter) {
      filtered = filtered.filter((item) => item.location.toLowerCase().includes(areaFilter.toLowerCase()))
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter((item) => item.status.toLowerCase() === statusFilter.toLowerCase())
    }

    // Apply search term
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.id.toLowerCase().includes(lowerCaseSearchTerm) ||
          item.name.toLowerCase().includes(lowerCaseSearchTerm) ||
          item.type.toLowerCase().includes(lowerCaseSearchTerm) ||
          item.location.toLowerCase().includes(lowerCaseSearchTerm) ||
          item.status.toLowerCase().includes(lowerCaseSearchTerm),
      )
    }

    setFilteredDirectoryData(filtered)
  }, [directoryData, currentTab, areaFilter, statusFilter, searchTerm])

  // Effects for initial load and filter changes
  useEffect(() => {
    applyFiltersAndSearch()
  }, [applyFiltersAndSearch])

  // Event listeners for modals and sidebar
  useEffect(() => {
    const handleOutsideClick = (event) => {
      // Close notification dropdown
      if (
        notificationBellRef.current &&
        !notificationBellRef.current.contains(event.target) &&
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(event.target)
      ) {
        setShowNotificationDropdown(false)
      }

      // Close logout modal
      if (showLogoutModal && !event.target.closest(".logout-modal")) {
        setShowLogoutModal(false)
      }

      // Close mobile sidebar
      if (
        window.innerWidth <= 768 &&
        isSidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target) &&
        !event.target.closest(".mobile-menu-btn")
      ) {
        setIsSidebarOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
    }
  }, [showNotificationDropdown, showLogoutModal, isSidebarOpen])

  // Handle window resize for sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsSidebarOpen(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Navigation handler
  const handleNavigation = useCallback(
    (path, page) => {
      navigate(path)
      setCurrentPage(page) // Set the current page for sidebar active state
      setIsSidebarOpen(false) // Close sidebar on navigation
    },
    [navigate],
  )

  return (
    <div className="flex h-screen overflow-hidden">
      <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
        ☰
      </button>

      <div ref={sidebarRef} className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-logo">
          <img src="/images/LOGON.png" alt="CTU Logo" className="logo" />
        </div>

        <nav className="nav-menu">
          {[
            { name: "Dashboard", iconClass: "fas fa-th-large", page: "dashboard", route: "/DvmfDashboard" },
            {
              name: "Account Approval",
              iconClass: "fas fa-user-check",
              page: "approval",
              route: "/DvmfAccountApproval",
            },
            { name: "Access Requests", iconClass: "fas fa-file-alt", page: "requests", route: "/DvmfAccessRequest" },
            { name: "Horse Records", iconClass: "fas fa-clipboard-list", page: "records", route: "/DvmfHorseRecord" },
            { name: "Health Reports", iconClass: "fas fa-chart-bar", page: "reports", route: "/DvmfHealthReport" },
            { name: "Announcements", iconClass: "fas fa-bullhorn", page: "announcements", route: "/DvmfAnnouncement" },
            { name: "Directory", iconClass: "fas fa-folder", page: "directory", route: "/DvmfDirectory" },
            { name: "Settings", iconClass: "fas fa-cog", page: "settings", route: "/DvmfSettings" },
          ].map((item) => (
            <a
              key={item.page}
              href="#"
              className={`nav-item ${currentPage === item.page ? "active" : ""}`}
              onClick={(e) => {
                e.preventDefault()
                handleNavigation(item.route, item.page)
              }}
            >
              <i className={`${item.iconClass} nav-icon`} />
              <span>{item.name}</span>
            </a>
          ))}
        </nav>

        <div className="logout">
          <a href="#" className="logout-btn" onClick={() => setShowLogoutModal(true)}>
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div
            className="notification-bell"
            ref={notificationBellRef}
            onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
          >
            <i className="fas fa-bell"></i>
            {notifications.filter((n) => !n.read).length > 0 && (
              <div className="notification-count">
                {notifications.filter((n) => !n.read).length > 9 ? "9+" : notifications.filter((n) => !n.read).length}
              </div>
            )}

            <div
              ref={notificationDropdownRef}
              className={`notification-dropdown ${showNotificationDropdown ? "show" : ""}`}
            >
              <div className="notification-header">
                <h3>Notifications</h3>
                {notifications.filter((n) => !n.read).length > 0 && (
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
                          className={`notification-icon ${notification.type} ${getNotificationIcon(notification.type)}`}
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
          <div className="directory-container">
            <div className="tab-navigation">
              <div
                className={`tab-item ${currentTab === "all" ? "active" : ""}`}
                onClick={() => setCurrentTab("all")}
                data-tab="all"
              >
                All
              </div>
              <div
                className={`tab-item ${currentTab === "horses" ? "active" : ""}`}
                onClick={() => setCurrentTab("horses")}
                data-tab="horses"
              >
                Horses
              </div>
              <div
                className={`tab-item ${currentTab === "veterinarian" ? "active" : ""}`}
                onClick={() => setCurrentTab("veterinarian")}
                data-tab="veterinarian"
              >
                Veterinarian
              </div>
              <div
                className={`tab-item ${currentTab === "horses-per-owner" ? "active" : ""}`}
                onClick={() => setCurrentTab("horses-per-owner")}
                data-tab="horses-per-owner"
              >
                Horses per owner
              </div>
              <div
                className={`tab-item ${currentTab === "kutsero" ? "active" : ""}`}
                onClick={() => setCurrentTab("kutsero")}
                data-tab="kutsero"
              >
                Kutsero
              </div>
            </div>

            <div className="directory-content">
              <div className="filter-row">
                <select className="filter-select" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
                  <option value="">Filter by Area</option>
                  <option value="cebu">Cebu City</option>
                  <option value="manila">Manila</option>
                  <option value="davao">Davao</option>
                </select>
                <select
                  className="filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="healthy">Healthy</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {filteredDirectoryData.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-folder-open"></i>
                  <h3>No directory entries found</h3>
                  <p>Directory entries will appear here when data is available</p>
                </div>
              ) : (
                <table className="directory-table">
                  <thead className="table-header">
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Location</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDirectoryData.map((item) => (
                      <tr key={item.id} className="table-row">
                        <td>{item.id}</td>
                        <td>{item.name}</td>
                        <td>{item.type}</td>
                        <td>{item.location}</td>
                        <td>
                          <span className={`status-badge status-${item.status.toLowerCase()}`}>{item.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Widget */}
      <div className="chat-widget">
        <button className="chat-button" onClick={() => handleNavigation("/DvmfMessage", "message")}>
          <div className="chat-dots">
            <div className="chat-dot"></div>
            <div className="chat-dot"></div>
            <div className="chat-dot"></div>
          </div>
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="modal-overlay active">
          <div className="logout-modal">
            <div className="logout-modal-icon">
              <i className="fas fa-sign-out-alt"></i>
            </div>
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to log out of your account?</p>
            <div className="logout-modal-buttons">
              <button className="logout-modal-btn cancel" onClick={() => setShowLogoutModal(false)}>
                No
              </button>
              <button
                className="logout-modal-btn confirm"
                onClick={() => {
                  console.log("User logged out")
                  navigate("/DvmfLogin") // Navigate to login page
                  setShowLogoutModal(false)
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DvmfDirectory
