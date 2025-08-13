"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import "./DvmfAccessRequest.css"

function DvmfAccessRequest() {
    const navigate = useNavigate()
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isActionModalOpen, setIsActionModalOpen] = useState(false)
  const [actionDetails, setActionDetails] = useState({ title: "", message: "", action: "" })
  const [currentRequestId, setCurrentRequestId] = useState(null)
  const [accessRequests, setAccessRequests] = useState([]) // Placeholder for access request data
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  const sidebarRef = useRef(null)
  const notificationBellRef = useRef(null)
  const notificationDropdownRef = useRef(null)
  const logoutModalRef = useRef(null)
  const actionModalRef = useRef(null)

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

  // Function to load notifications from your backend (placeholder)
  const loadNotifications = useCallback(() => {
    console.log("Loading notifications...")
    setNotifications([]) // For now, just set empty notifications
  }, [])

  // Function to load access requests from your backend (placeholder)
  const loadAccessRequests = useCallback(() => {
    console.log("Loading access requests...")
    // Example dummy data for demonstration
    setAccessRequests([
      // {
      //   id: "REQ001",
      //   horseName: "Spirit",
      //   requestedBy: "Dr. Emily White",
      //   reason: "Routine check-up and vaccination history",
      //   dateRequested: new Date(2024, 6, 15, 10, 30),
      //   status: "pending",
      // },
      // {
      //   id: "REQ002",
      //   horseName: "Thunder",
      //   requestedBy: "Dr. John Doe",
      //   reason: "Injury assessment and treatment plan",
      //   dateRequested: new Date(2024, 6, 14, 14, 0),
      //   status: "pending",
      // },
    ])
  }, [])

  const toggleNotificationDropdown = () => {
    setIsNotificationDropdownOpen((prev) => !prev)
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
    // In a real app, clear session/token and redirect to login
    localStorage.removeItem("currentUser")
    localStorage.removeItem("loginTime")
    navigate("/DvmfLogin") // Redirect to login page
    closeLogoutModal()
  }

  const approveRequest = (requestId) => {
    setCurrentRequestId(requestId)
    setActionDetails({
      title: "Approve Request",
      message: `Are you sure you want to approve request ${requestId}?`,
      action: "approve",
    })
    setIsActionModalOpen(true)
  }

  const declineRequest = (requestId) => {
    setCurrentRequestId(requestId)
    setActionDetails({
      title: "Decline Request",
      message: `Are you sure you want to decline request ${requestId}?`,
      action: "decline",
    })
    setIsActionModalOpen(true)
  }

  const closeActionModal = () => {
    setIsActionModalOpen(false)
    setCurrentRequestId(null)
    setActionDetails({ title: "", message: "", action: "" })
  }

  const confirmAction = () => {
    if (actionDetails.action === "approve" && currentRequestId) {
      console.log(`Approving request: ${currentRequestId}`)
      // Update status in state (for demonstration)
      setAccessRequests((prev) =>
        prev.map((req) => (req.id === currentRequestId ? { ...req, status: "approved" } : req)),
      )
      // Here you would integrate with your backend API to approve
    } else if (actionDetails.action === "decline" && currentRequestId) {
      console.log(`Declining request: ${currentRequestId}`)
      // Update status in state (for demonstration)
      setAccessRequests((prev) =>
        prev.map((req) => (req.id === currentRequestId ? { ...req, status: "declined" } : req)),
      )
      // Here you would integrate with your backend API to decline
    }
    closeActionModal()
  }

  const handleSearchInput = (e) => {
    const searchTerm = e.target.value.toLowerCase()
    console.log(`Searching for: ${searchTerm}`)
    // Implement actual search logic here if needed
  }

  // Effects
  useEffect(() => {
    loadAccessRequests()
    loadNotifications()
  }, [loadAccessRequests, loadNotifications])

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

      // Close action modal
      if (isActionModalOpen && actionModalRef.current && event.target === actionModalRef.current) {
        closeActionModal()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isNotificationDropdownOpen, isLogoutModalOpen, isActionModalOpen])

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div className="bodyWrapper">
      <div className="sidebar" id="sidebar" ref={sidebarRef}>
        <div className="sidebar-logo">
          <img src="/images/LOGON.png" alt="Dvmf Logo" className="logo" />
        </div>
        <nav className="nav-menu">
          {[
            { name: "Dashboard", iconClass: "fas fa-th-large", path: "/DvmfDashboard" },
            { name: "Account Approval", iconClass: "fas fa-user-check", path: "/DvmfAccountApproval" },
            { name: "Access Requests", iconClass: "fas fa-file-alt", path: "/DvmfAccessRequest", active: true },
            { name: "Horse Records", iconClass: "fas fa-clipboard-list", path: "/DvmfHorseRecord" },
            { name: "Health Reports", iconClass: "fas fa-chart-bar", path: "/DvmfHealthReport" },
            { name: "Announcements", iconClass: "fas fa-bullhorn", path: "/DvmfAnnouncement" },
            { name: "Directory", iconClass: "fas fa-folder", path: "/DvmfDirectory" },
            { name: "Settings", iconClass: "fas fa-cog", path: "/DvmfSettings" },
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
            onClick={toggleNotificationDropdown}
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
            <h1 className="page-title">Access Request</h1>
            <div className="access-table">
              <div className="table-headers">
                <div>Request ID</div>
                <div>Horse Name</div>
                <div>Requested by (Vet)</div>
                <div>Reason for Access</div>
                <div>Date Requested</div>
                <div>Status</div>
                <div>Action</div>
              </div>
              {accessRequests.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-file-alt"></i>
                  <h3>No access requests</h3>
                  <p>Access requests will appear here when available</p>
                </div>
              ) : (
                accessRequests.map((request) => (
                  <div key={request.id} className="table-row">
                    <div>{request.id}</div>
                    <div>{request.horseName}</div>
                    <div>{request.requestedBy}</div>
                    <div>{request.reason}</div>
                    <div>{request.dateRequested.toLocaleDateString()}</div>
                    <div>
                      <span className={`status-badge status-${request.status}`}>{request.status}</span>
                    </div>
                    <div className="action-buttons">
                      {request.status === "pending" && (
                        <>
                          <button className="action-btn approve-btn" onClick={() => approveRequest(request.id)}>
                            Approve
                          </button>
                          <button className="action-btn decline-btn" onClick={() => declineRequest(request.id)}>
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
      </div>

      {/* Chat Widget - Button Only */}
      <div className="chat-widget">
        <button className="chat-button" id="chatButton" onClick={() => navigate("/DvmfuMessage")}>
          <div className="chat-dots">
            <div className="chat-dot"></div>
            <div className="chat-dot"></div>
            <div className="chat-dot"></div>
          </div>
        </button>
      </div>

      {/* Logout Modal */}
      {isLogoutModalOpen && (
        <div
          className="modal-overlay active"
          id="logoutModal"
          ref={logoutModalRef}
          onClick={(e) => e.target === logoutModalRef.current && closeLogoutModal()}
        >
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
      )}

      {/* Action Confirmation Modal */}
      {isActionModalOpen && (
        <div
          className="modal-overlay active"
          id="actionModal"
          ref={actionModalRef}
          onClick={(e) => e.target === actionModalRef.current && closeActionModal()}
        >
          <div className="confirmation-modal">
            <h3 id="actionTitle">{actionDetails.title}</h3>
            <p id="actionMessage">{actionDetails.message}</p>
            <div className="confirmation-buttons">
              <button className="confirmation-btn cancel" onClick={closeActionModal}>
                Cancel
              </button>
              <button
                className={`confirmation-btn confirm ${actionDetails.action === "decline" ? "decline" : ""}`}
                onClick={confirmAction}
              >
                {actionDetails.action === "approve" ? "Approve" : "Decline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DvmfAccessRequest
