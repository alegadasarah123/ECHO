"use client"
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./CtuAccountApproval.css"; // Import the new CSS file

function CtuAccountApproval() {
  const navigate = useNavigate()
  // Removed dummy data for registrations as requested
  const [registrationData, setRegistrationData] = useState([])
  const [activeTab, setActiveTab] = useState("pending")
  const [typeFilter, setTypeFilter] = useState("all")
  const [recentFilter, setRecentFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false)
  const [notifications, setNotifications] = useState([]) // Empty notifications array
  const notificationBellRef = useRef(null)
  const notificationDropdownRef = useRef(null)
  const [isViewDetailsModalOpen, setIsViewDetailsModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const viewDetailsModalOverlayRef = useRef(null)
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false)
  const [confirmationDetails, setConfirmationDetails] = useState({ title: "", message: "", action: "" })
  const confirmationOverlayRef = useRef(null)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const logoutModalRef = useRef(null)
  // Renamed from isMobileMenuOpen to isSidebarExpanded for consistency with Dashboard
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)

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
    // For now, just set some dummy notifications
    setNotifications([])
  }, [])

  const filterRegistrations = useCallback(() => {
    let filtered = registrationData
    // Filter by tab status
    filtered = filtered.filter((user) => user.status === activeTab)
    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter((user) => user.type === typeFilter)
    }
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.firstName.toLowerCase().includes(searchTerm) ||
          user.lastName.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm),
      )
    }
    // Filter by recent (placeholder logic, as actual date fields are not in dummy data for this)
    if (recentFilter !== "all") {
      // This would require actual date fields on registrationData and more complex logic
      console.log(`Filtering by recent: ${recentFilter} (logic not fully implemented with dummy data)`)
    }
    return filtered
  }, [registrationData, activeTab, typeFilter, searchTerm, recentFilter])

  const viewDetails = (userId, status) => {
    const user = registrationData.find((u) => u.id === userId)
    if (user) {
      setSelectedUser({ ...user, status }) // Pass status to modal for conditional buttons
      setIsViewDetailsModalOpen(true)
    } else {
      console.log("User data not found")
    }
  }

  const closeModal = () => {
    setIsViewDetailsModalOpen(false)
    setSelectedUser(null)
  }

  const showApproveConfirmation = (userId) => {
    setSelectedUser((prev) => ({ ...prev, id: userId })) // Ensure userId is set for confirmation
    setConfirmationDetails({
      title: "Confirm Approval",
      message: "Are you sure you want to approve this registration?",
      action: "approve",
    })
    setIsConfirmationModalOpen(true)
  }

  const showDeclineConfirmation = (userId) => {
    setSelectedUser((prev) => ({ ...prev, id: userId })) // Ensure userId is set for confirmation
    setConfirmationDetails({
      title: "Confirm Decline",
      message: "Are you sure you want to decline this registration?",
      action: "decline",
    })
    setIsConfirmationModalOpen(true)
  }

  const showApproveConfirmationFromModal = () => {
    if (selectedUser && selectedUser.status === "pending") {
      closeModal()
      showApproveConfirmation(selectedUser.id)
    }
  }

  const showDeclineConfirmationFromModal = () => {
    if (selectedUser && selectedUser.status === "pending") {
      closeModal()
      showDeclineConfirmation(selectedUser.id)
    }
  }

  const closeConfirmation = () => {
    setIsConfirmationModalOpen(false)
    setSelectedUser(null)
    setConfirmationDetails({ title: "", message: "", action: "" })
  }

  const confirmAction = () => {
    if (confirmationDetails.action === "approve" && selectedUser) {
      approveUser(selectedUser.id)
    } else if (confirmationDetails.action === "decline" && selectedUser) {
      declineUser(selectedUser.id)
    }
    closeConfirmation()
  }

  const approveUser = (userId) => {
    console.log(`User ${userId} has been approved`)
    setRegistrationData((prev) => prev.map((user) => (user.id === userId ? { ...user, status: "approved" } : user)))
    // In a real app, send API request to backend
  }

  const declineUser = (userId) => {
    console.log(`User ${userId} has been declined`)
    setRegistrationData((prev) => prev.map((user) => (user.id === userId ? { ...user, status: "declined" } : user)))
    // In a real app, send API request to backend
  }

  const approveAllPending = () => {
    if (activeTab === "pending") {
      console.log("All pending registrations approved")
      setRegistrationData((prev) =>
        prev.map((user) => (user.status === "pending" ? { ...user, status: "approved" } : user)),
      )
      // In a real app, send API request to backend
    }
  }

  const handleSearchInput = (e) => {
    setSearchTerm(e.target.value.toLowerCase())
  }

  const handleTypeFilterChange = (e) => {
    setTypeFilter(e.target.value)
  }

  const handleRecentFilterChange = (e) => {
    setRecentFilter(e.target.value)
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
    localStorage.removeItem("currentUser")
    localStorage.removeItem("loginTime")
    navigate("/CtuLogin")
    closeLogoutModal()
  }

  // Effects
  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

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
      // Close view details modal
      if (
        isViewDetailsModalOpen &&
        viewDetailsModalOverlayRef.current &&
        event.target === viewDetailsModalOverlayRef.current
      ) {
        closeModal()
      }
      // Close confirmation modal
      if (
        isConfirmationModalOpen &&
        confirmationOverlayRef.current &&
        event.target === confirmationOverlayRef.current
      ) {
        closeConfirmation()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isNotificationDropdownOpen, isViewDetailsModalOpen, isConfirmationModalOpen])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsSidebarExpanded(false)
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const filteredRegistrations = filterRegistrations()

  return (
    <div className="bodyWrapper">
      <div className="sidebar" id="sidebar">
        <div className="sidebar-logo">
          <img src="/images/logo.png" alt="CTU Logo" className="logo" />
        </div>
        <nav className="nav-menu">
          {[
            { name: "Dashboard", iconClass: "fas fa-th-large", path: "/CtuDashboard" },
            { name: "Account Approval", iconClass: "fas fa-user-check", path: "/CtuAccountApproval", active: true },
            { name: "Access Requests", iconClass: "fas fa-file-alt", path: "/CtuAccessRequest" },
            { name: "Horse Records", iconClass: "fas fa-clipboard-list", path: "/CtuHorseRecord" },
            { name: "Health Reports", iconClass: "fas fa-chart-bar", path: "/CtuHealthReport" },
            { name: "Announcements", iconClass: "fas fa-bullhorn", path: "/CtuAnnouncement" },
            { name: "Directory", iconClass: "fas fa-folder", path: "/CtuDirectory" },
            { name: "Settings", iconClass: "fas fa-cog", path: "/CtuSettings" },
          ].map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`nav-item ${item.active ? "active" : ""}`}
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
            <input type="text" className="search-input" placeholder="Search......" onChange={handleSearchInput} />
          </div>
          <div
            className="notification-bell"
            id="notification-bell"
            ref={notificationBellRef}
            onClick={() => setIsNotificationDropdownOpen((prev) => !prev)}
          >
            <i className="fas fa-bell"></i>
            {notifications.filter((n) => !n.read).length > 0 && (
              <div className="notification-count" style={{ display: "flex" }}>
                {notifications.filter((n) => !n.read).length > 9 ? "9+" : notifications.filter((n) => !n.read).length}
              </div>
            )}
            <div
              className={`notification-dropdown ${isNotificationDropdownOpen ? "show" : ""}`}
              ref={notificationDropdownRef}
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
                          className={`notification-icon ${notification.type} ${getNotificationIconClass(notification.type)}`}
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
            <h1>Account Approval</h1>
            <h2>Manage registration request from Kutseros and Veterinarians</h2>
            <div className="tabs-container">
              <button
                className={`tab ${activeTab === "pending" ? "active" : ""}`}
                onClick={() => setActiveTab("pending")}
              >
                Pending
              </button>
              <button
                className={`tab ${activeTab === "approved" ? "active" : ""}`}
                onClick={() => setActiveTab("approved")}
              >
                Approved
              </button>
              <button
                className={`tab ${activeTab === "declined" ? "active" : ""}`}
                onClick={() => setActiveTab("declined")}
              >
                Declined
              </button>
            </div>
          </div>
          <div className="controls-row">
            <div className="filter-controls">
              <select className="filter-select" value={typeFilter} onChange={handleTypeFilterChange}>
                <option value="all">All Types</option>
                <option value="kutsero">Kutsero</option>
                <option value="veterinarian">Veterinarian</option>
              </select>
              <select className="filter-select" value={recentFilter} onChange={handleRecentFilterChange}>
                <option value="all">Most Recent</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            {activeTab === "pending" && (
              <button className="approve-all-btn" onClick={approveAllPending}>
                Approve All
              </button>
            )}
          </div>
          <div className="registration-table" id="registrationTable">
            {filteredRegistrations.length === 0 ? (
              <div className="empty-state">
                <i
                  className={`fas ${
                    activeTab === "pending"
                      ? "fa-user-clock"
                      : activeTab === "approved"
                        ? "fa-user-check"
                        : "fa-user-times"
                  }`}
                ></i>
                <h3>No {activeTab === "pending" ? "pending" : activeTab} registrations</h3>
                <p>
                  {activeTab === "pending"
                    ? "New registration requests will appear here"
                    : `${activeTab} registrations will appear here`}
                </p>
              </div>
            ) : (
              filteredRegistrations.map((user) => (
                <div key={user.id} className="registration-item">
                  <div className="user-avatar">{user.firstName.charAt(0) + user.lastName.charAt(0)}</div>
                  <div className="user-info">
                    <div className="user-name">
                      {user.firstName} {user.middleName} {user.lastName}
                      <span className={`user-type-badge badge-${user.type}`}>{user.type}</span>
                    </div>
                    <div className="user-email">{user.email}</div>
                    <div className="user-details">
                      {user.city}, {user.province}
                    </div>
                  </div>
                  <div className="action-buttons">
                    <button className="action-btn btn-view" onClick={() => viewDetails(user.id, user.status)}>
                      View Details
                    </button>
                    {user.status === "pending" && (
                      <>
                        <button className="action-btn btn-approve" onClick={() => showApproveConfirmation(user.id)}>
                          Approve
                        </button>
                        <button className="action-btn btn-decline" onClick={() => showDeclineConfirmation(user.id)}>
                          Decline
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <div className="chat-widget">
        <button className="chat-button" onClick={() => navigate("/CtuMessage")}>
          <div className="chat-dots">
            <div className="chat-dot"></div>
            <div className="chat-dot"></div>
            <div className="chat-dot"></div>
          </div>
        </button>
      </div>
      {/* View Details Modal */}
      {isViewDetailsModalOpen && selectedUser && (
        <div className="modal-overlay active" ref={viewDetailsModalOverlayRef}>
          <div className="modal-content">
            <button className="modal-close" onClick={closeModal}>
              &times;
            </button>
            <div className="modal-header">
              <div className="modal-avatar">{selectedUser.firstName.charAt(0) + selectedUser.lastName.charAt(0)}</div>
              <div className="modal-user-info">
                <h3>
                  {selectedUser.firstName} {selectedUser.middleName} {selectedUser.lastName}
                </h3>
                <span className={`modal-user-badge badge-${selectedUser.type}`}>{selectedUser.type}</span>
              </div>
            </div>
            <div className="modal-section">
              <h4>Personal Information</h4>
              <div className="modal-grid">
                <div className="modal-field">
                  <span className="modal-label">First Name:</span>
                  <div className="modal-value">{selectedUser.firstName}</div>
                </div>
                <div className="modal-field">
                  <span className="modal-label">Middle Name:</span>
                  <div className="modal-value">{selectedUser.middleName}</div>
                </div>
                <div className="modal-field">
                  <span className="modal-label">Last Name:</span>
                  <div className="modal-value">{selectedUser.lastName}</div>
                </div>
                <div className="modal-field">
                  <span className="modal-label">Date of Birth:</span>
                  <div className="modal-value">{selectedUser.dob}</div>
                </div>
                <div className="modal-field full-width">
                  <span className="modal-label">Phone Number:</span>
                  <div className="modal-value">{selectedUser.phone}</div>
                </div>
                <div className="modal-field full-width">
                  <span className="modal-label">Email:</span>
                  <div className="modal-value">{selectedUser.email}</div>
                </div>
                <div className="modal-field full-width">
                  <span className="modal-label">Facebook:</span>
                  <div className="modal-value">{selectedUser.facebook}</div>
                </div>
              </div>
            </div>
            <div className="modal-section">
              <h4>Address Information</h4>
              <div className="modal-grid">
                <div className="modal-field">
                  <span className="modal-label">Province:</span>
                  <div className="modal-value">{selectedUser.province}</div>
                </div>
                <div className="modal-field">
                  <span className="modal-label">City:</span>
                  <div className="modal-value">{selectedUser.city}</div>
                </div>
                <div className="modal-field">
                  <span className="modal-label">Barangay:</span>
                  <div className="modal-value">{selectedUser.barangay}</div>
                </div>
                <div className="modal-field">
                  <span className="modal-label">Zip Code:</span>
                  <div className="modal-value">{selectedUser.zipCode}</div>
                </div>
                <div className="modal-field full-width">
                  <span className="modal-label">Complete Address/Street Name:</span>
                  <div className="modal-value">{selectedUser.address}</div>
                </div>
                <div className="modal-field full-width">
                  <span className="modal-label">Route:</span>
                  <div className="modal-value">{selectedUser.route}</div>
                </div>
              </div>
            </div>
            <div className={`modal-footer ${selectedUser.status !== "pending" ? "close-only" : ""}`}>
              <button className="modal-btn" onClick={closeModal}>
                Close
              </button>
              {selectedUser.status === "pending" && (
                <>
                  <button className="modal-btn approve" onClick={showApproveConfirmationFromModal}>
                    Approve
                  </button>
                  <button className="modal-btn decline" onClick={showDeclineConfirmationFromModal}>
                    Decline
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Confirmation Modal */}
      {isConfirmationModalOpen && (
        <div className="modal-overlay active" ref={confirmationOverlayRef}>
          <div className="confirmation-modal">
            <h3 id="confirmationTitle">{confirmationDetails.title}</h3>
            <p id="confirmationMessage">{confirmationDetails.message}</p>
            <div className="confirmation-buttons">
              <button className="confirmation-btn cancel" onClick={closeConfirmation}>
                Cancel
              </button>
              <button
                className={`confirmation-btn confirm ${confirmationDetails.action === "decline" ? "decline" : ""}`}
                onClick={confirmAction}
              >
                {confirmationDetails.action === "approve" ? "Approve" : "Decline"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Logout Modal */}
      {isLogoutModalOpen && (
        <div
          className={`modal-overlay active`}
          id="logoutModal"
          ref={logoutModalRef}
          onClick={(e) => e.target === logoutModalRef.current && closeLogoutModal()}
        >
          <div className="logout-modal">
            <div className="logout-modal-icon">
              <i className="fas fa-sign-out-alt" />
            </div>
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to log out of your account?</p>
            <div className="logout-modal-buttons">
              <button className={`logout-modal-btn cancel`} onClick={closeLogoutModal}>
                No
              </button>
              <button className={`logout-modal-btn confirm`} onClick={confirmLogout}>
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CtuAccountApproval