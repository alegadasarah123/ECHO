"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import "./CtuDashboard.css"

function CtuDashboard() {
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [activePage, setActivePage] = useState("dashboard")
  const [notifications, setNotifications] = useState([])
  const [recordCount, setrecordCount] = useState(0)
  const [vetCount, setvetCount] = useState(0)
  const [recentActivities, setRecentActivities] = useState([])
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState("")

  const sidebarRef = useRef(null)
  const notificationBellRef = useRef(null)
  const notificationDropdownRef = useRef(null)
  const logoutModalRef = useRef(null)

  // Helper to format date for calendar title
  const getCalendarTitle = useCallback(() => {
    return calendarDate.toLocaleString("default", { month: "long", year: "numeric" })
  }, [calendarDate])

  // Calendar functions
  const initializeCalendar = useCallback(() => {
    const now = new Date(calendarDate)
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay()
    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day" />)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday =
        day === new Date().getDate() &&
        now.getMonth() === new Date().getMonth() &&
        now.getFullYear() === new Date().getFullYear()

      days.push(
        <div key={`day-${day}`} className={`calendar-day ${isToday ? "today" : ""}`} onClick={() => selectDate(day)}>
          {day}
        </div>,
      )
    }

    return days
  }, [calendarDate])

  const selectDate = (day) => {
    const newDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day)
    setCalendarDate(newDate)
    console.log(`Selected date: ${newDate.toDateString()}`)
  }

  const goToToday = () => {
    setCalendarDate(new Date())
  }

  // Data loading functions
  const loadStats = useCallback(() => {
    console.log("Loading statistics...")
    setrecordCount(0)
    setvetCount(0)
  }, [])

  const loadRecentActivities = useCallback(() => {
    console.log("Loading recent activities...")
    setRecentActivities([])
  }, [])

  const loadNotifications = useCallback(() => {
    console.log("Loading notifications...")
    setNotifications([])
  }, [])

  const markAllNotificationsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })))
  }

  const handleNotificationClick = (id) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)))
    console.log(`Notification ${id} clicked.`)
  }

  const handleSearchInput = (e) => {
    const searchTerm = e.target.value.toLowerCase()
    setSearchQuery(searchTerm)
    console.log(`Searching for: ${searchTerm}`)

    if (searchTerm.length > 2) {
      console.log("Performing search...")
    }
  }

  const loadDashboardData = useCallback(() => {
    loadStats()
    loadRecentActivities()
    loadNotifications()
  }, [loadStats, loadRecentActivities, loadNotifications])

  const toggleMobileMenu = () => {
    setIsSidebarOpen((prev) => !prev)
  }

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
    localStorage.removeItem("currentUser")
    localStorage.removeItem("loginTime")
    navigate("/Ctulogin")
    closeLogoutModal()
  }

  const handleNavItemClick = (page, route) => {
    setActivePage(page)
    navigate(route)
  }

  const handleChatButtonClick = () => {
    console.log("Chat button clicked")
    navigate("/CtuMessage")
  }

  const handleStatsCardClick = (type) => {
  if (type === "horses") {
    alert(`Total Record: ${recordCount}\n\nClick to view detailed horse statistics`)
  } else if (type === "vet") {
    alert(`Registered Veterinarian: ${vetCount}\n\nClick to view detailed veterinarian statistics`)
  }
}


  // Effects
  useEffect(() => {
    console.log("Veterinary Dashboard initialized")
    loadDashboardData()
  }, [loadDashboardData])

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

      // Close mobile sidebar
      if (window.innerWidth <= 768) {
        if (
          sidebarRef.current &&
          !sidebarRef.current.contains(event.target) &&
          !event.target.classList.contains("mobile-menu-btn") &&
          isSidebarOpen
        ) {
          setIsSidebarOpen(false)
        }
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
  }, [isSidebarOpen])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsSidebarOpen(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const navigationItems = [
    {
      name: "Dashboard",
      iconClass: "fas fa-th-large",
      page: "dashboard",
      route: "/CtuDashboard",
    },
    {
      name: "Account Approval",
      iconClass: "fas fa-user-check",
      page: "approval",
      route: "/CtuAccountApproval",
    },
    {
      name: "Access Requests",
      iconClass: "fas fa-file-alt",
      page: "requests",
      route: "/CtuAccessRequest",
    },
    {
      name: "Horse Records",
      iconClass: "fas fa-clipboard-list",
      page: "records",
      route: "/CtuHorseRecord",
    },
    {
      name: "Health Reports",
      iconClass: "fas fa-chart-bar",
      page: "reports",
      route: "/CtuHealthReport",
    },
    {
      name: "Announcements",
      iconClass: "fas fa-bullhorn",
      page: "announcements",
      route: "/CtuAnnouncement",
    },
    {
      name: "Directory",
      iconClass: "fas fa-folder",
      page: "directory",
      route: "/CtuDirectory",
    },
    {
      name: "Settings",
      iconClass: "fas fa-cog",
      page: "settings",
      route: "/CtuSettings",
    },
  ]

  return (
    <div className="body-wrapper">
      <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
        ☰
      </button>

      <div className={`sidebar ${isSidebarOpen ? "open" : ""}`} id="sidebar" ref={sidebarRef}>
        <div className="sidebar-logo">
          <img src="/images/logo.png"  alt="CTU Logo" className="logo" />
        </div>

        <nav className="nav-menu">
          {navigationItems.map((item) => (
            <a
              key={item.page}
              href={item.route}
              className={`nav-item ${activePage === item.page ? "active" : ""}`}
              onClick={(e) => {
                e.preventDefault()
                handleNavItemClick(item.page, item.route)
              }}
            >
              <i className={`nav-icon ${item.iconClass}`} />
              {item.name}
            </a>
          ))}
        </nav>

        <div className="logout">
          <a href="#" className="logout-btn" onClick={openLogoutModal}>
            <i className="logout-icon fas fa-sign-out-alt" />
            Log Out
          </a>
        </div>
      </div>

      <div className="main-content">
        <header className="header">
          <div className="search-container">
            <div className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search......"
              value={searchQuery}
              onChange={handleSearchInput}
            />
          </div>
          <div className="notification-bell" ref={notificationBellRef} onClick={toggleNotificationDropdown}>
            <i className="fas fa-bell" />
            {notifications.filter((n) => !n.read).length > 0 && (
              <div className="notification-count">{notifications.filter((n) => !n.read).length}</div>
            )}
            <div
              className={`notification-dropdown ${isNotificationDropdownOpen ? "show" : ""}`}
              ref={notificationDropdownRef}
            >
              <div className="notification-header">
                <h3>Notifications</h3>
                {notifications.filter((n) => !n.read).length > 0 && (
                  <button className="mark-all-read" onClick={markAllNotificationsRead}>
                    Mark all as read
                  </button>
                )}
              </div>
              <div id="notificationList">
                {notifications.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-bell-slash" />
                    <h3>No notifications</h3>
                    <p>You're all caught up!</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`notification-item ${!notification.read ? "unread" : ""}`}
                      onClick={() => handleNotificationClick(notification.id)}
                    >
                      <div className="notification-title">
                        <i className={`notification-icon ${notification.type || "info"}`} />
                        {notification.title}
                      </div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">{notification.time}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="content-area">
          <div className="stats-container">
            <div className="stat-card" onClick={() => handleStatsCardClick("horses")}>
              <div className="stat-title">Total Record</div>
              <div className="stat-number">{recordCount}</div>
            </div>
            <div className="stat-card" onClick={() => handleStatsCardClick("vet")}>
              <div className="stat-title">Registered Veterinarian</div>
              <div className="stat-number">{vetCount}</div>
            </div>
          </div>

          <div className="main-grid">
            <div className="recent-activity">
              <h3 className="activity-header">Recent Activity</h3>
              <p className="activity-subtitle">Latest updates from the system</p>

              {recentActivities.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-clipboard-list" />
                  <h3>No recent activity</h3>
                  <p>Activity will appear here when available</p>
                </div>
              ) : (
                <div id="activityList">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="activity-item">
                      <div className="activity-icon" />
                      <div className="activity-content">
                        <div className="activity-title">{activity.title}</div>
                        <div className="activity-description">{activity.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="calendar-widget">
              <div className="calendar-header">
                <span className="calendar-title">{getCalendarTitle()}</span>
                <div className="calendar-nav">
                  <button className="calendar-nav-btn" onClick={goToToday}>
                    Today
                  </button>
                </div>
              </div>

              <div className="calendar-grid">
                <div className="calendar-day-header">Sun</div>
                <div className="calendar-day-header">Mon</div>
                <div className="calendar-day-header">Tue</div>
                <div className="calendar-day-header">Wed</div>
                <div className="calendar-day-header">Thu</div>
                <div className="calendar-day-header">Fri</div>
                <div className="calendar-day-header">Sat</div>
                {initializeCalendar()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="chat-widget">
        <button className="chat-button" onClick={handleChatButtonClick}>
          <div className="chat-dots">
            <div className="chat-dot" />
            <div className="chat-dot" />
            <div className="chat-dot" />
          </div>
        </button>
      </div>

      {/* Logout Modal */}
      {isLogoutModalOpen && (
        <div className="modal-overlay active" ref={logoutModalRef}>
          <div className="logout-modal">
            <div className="logout-modal-icon">
              <i className="fas fa-sign-out-alt" />
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
    </div>
  )
}

export default CtuDashboard
