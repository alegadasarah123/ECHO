"use client"

import {
  AlertTriangle,
  BarChart3,
  Bell,
  BellOff,
  CheckCircle,
  ClipboardList,
  FileText,
  Folder,
  Info,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Search,
  Settings,
  UserCheck,
  XCircle,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

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
    navigate("/login")
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

  const getNotificationIcon = (type) => {
    switch (type) {
      case "success":
        return <CheckCircle className="notification-icon success" />
      case "warning":
        return <AlertTriangle className="notification-icon warning" />
      case "error":
        return <XCircle className="notification-icon error" />
      default:
        return <Info className="notification-icon info" />
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
      icon:  <LayoutDashboard className="nav-icon" />,
      page: "dashboard",
      route: "/CtuDashboard",
    },
    {
      name: "Account Approval",
      icon: <UserCheck className="nav-icon" />,
      page: "approval",
      route: "/CtuAccountApproval",
    },
    {
      name: "Access Requests",
      icon: <FileText className="nav-icon" />,
      page: "requests",
      route: "/CtuAccessRequest",
    },
    {
      name: "Horse Records",
      icon: <ClipboardList className="nav-icon" />,
      page: "records",
      route: "/CtuHorseRecord",
    },
    {
      name: "Health Reports",
      icon: <BarChart3 className="nav-icon" />,
      page: "reports",
      route: "/CtuHealthReport",
    },
    {
      name: "Announcements",
      icon: <Megaphone className="nav-icon" />,
      page: "announcements",
      route: "/CtuAnnouncement",
    },
    {
      name: "Directory",
      icon: <Folder className="nav-icon" />,
      page: "directory",
      route: "/CtuDirectory",
    },
    {
      name: "Settings",
      icon: <Settings className="nav-icon" />,
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
          <img src="/ctu-veterinary-logo.png" alt="CTU Logo" className="logo" />
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
              {item.icon}
              {item.name}
            </a>
          ))}
        </nav>

        <div className="logout">
          <a href="#" className="logout-btn" onClick={openLogoutModal}>
            <LogOut className="logout-icon" />
            Log Out
          </a>
        </div>
      </div>

      <div className="main-content">
        <header className="header">
          <div className="search-container">
            <Search className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search......"
              value={searchQuery}
              onChange={handleSearchInput}
            />
          </div>
          <div className="notification-bell" ref={notificationBellRef} onClick={toggleNotificationDropdown}>
            <Bell />
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
                    <BellOff />
                    <h3>No notifications</h3>
                    <p>{"You're all caught up!"}</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`notification-item ${!notification.read ? "unread" : ""}`}
                      onClick={() => handleNotificationClick(notification.id)}
                    >
                      <div className="notification-title">
                        {getNotificationIcon(notification.type)}
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
                  <ClipboardList />
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
              <LogOut />
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

      <style jsx>{`
        .body-wrapper {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background-color: #f5f5f5;
          display: flex;
          height: 100vh;
          overflow-x: hidden;
          width: 100%;
        }

        .sidebar {
          width: 250px;
          background-color: #b91c1c;
          color: white;
          display: flex;
          flex-direction: column;
          position: fixed;
          height: 100vh;
          left: 0;
          top: 0;
          z-index: 1000;
          transition: transform 0.3s ease;
        }

        .sidebar-logo {
          padding: 5px;
          display: flex;
          justify-content: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .sidebar-logo img {
          width: 250px;
          height: 200px;
          object-fit: contain;
        }

        .nav-menu {
          flex: 1;
          padding: 20px 0;
        }

        .nav-item {
          display: flex;
          align-items: center;
          padding: 12px 40px;
          color: white;
          text-decoration: none;
          transition: all 0.3s ease;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          margin: 0px 0px 2px 0;
          position: relative;
          margin-left: 10px;
          min-height: 44px;
        }

        .nav-item:hover {
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 25px 0 0 25px;
        }

        .nav-item.active {
          background-color: #f3f4f6;
          color: #b91c1c;
          border-radius: 20px 0 0 20px;
          font-weight: 500;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          width: 240px;
          margin-left: 10px;
          height:40px;
        }

        .nav-icon {
          width: 20px;
          height: 20px;
          margin-right: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .nav-item.active .nav-icon {
          color: #b91c1c;
        }

        .logout {
          padding: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .logout-btn {
          display: flex;
          align-items: center;
          color: white;
          text-decoration: none;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          padding: 14px 40px;
          border-radius: 25px;
          transition: all 0.3s ease;
          min-height: 44px;
        }

        .logout-btn:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }

        .logout-icon {
          width: 20px;
          height: 20px;
          margin-right: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .main-content {
          margin-left: 250px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .header {
          background: white;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          flex-wrap: wrap;
          gap: 16px;
        }

        .search-container {
          flex: 1;
          max-width: 400px;
          margin-right: 20px;
          position: relative;
          min-width: 200px;
        }

        .search-input {
          width: 100%;
          padding: 8px 16px 8px 40px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          min-height: 40px;
        }

        .search-input:focus {
          border-color: #b91c1c;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          color: #6b7280;
        }

        .notification-bell {
          font-size: 20px;
          color: #666;
          cursor: pointer;
          position: relative;
          margin-right: 20px;
          padding: 8px;
          min-height: 44px;
          min-width: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .notification-count {
          position: absolute;
          top: 2px;
          right: 2px;
          background-color: #b91c1c;
          color: white;
          font-size: 10px;
          width: 15px;
          height: 15px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .notification-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          width: min(350px, 90vw);
          background-color: white;
          border: 1px solid #ccc;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 100;
          display: none;
          max-height: 400px;
          overflow-y: auto;
        }

        .notification-dropdown.show {
          display: block;
        }

        .notification-header {
          padding: 15px 20px;
          border-bottom: 1px solid #eee;
          background: #f8f9fa;
          border-radius: 8px 8px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .notification-header h3 {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin: 0;
        }

        .mark-all-read {
          background: none;
          border: none;
          color: #b91c1c;
          font-size: 12px;
          cursor: pointer;
          text-decoration: underline;
        }

        .notification-item {
          padding: 15px 20px;
          border-bottom: 1px solid #eee;
          cursor: pointer;
          transition: background-color 0.2s;
          position: relative;
        }

        .notification-item:hover {
          background-color: #f8f9fa;
        }

        .notification-item.unread {
          background-color: #f0f8ff;
          border-left: 3px solid #b91c1c;
        }

        .notification-item:last-child {
          border-bottom: none;
        }

        .notification-title {
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 5px;
          color: #333;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .notification-message {
          font-size: 13px;
          color: #666;
          margin-bottom: 5px;
          line-height: 1.4;
        }

        .notification-time {
          font-size: 11px;
          color: #999;
        }

        .notification-icon {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }

        .notification-icon.info {
          color: #3b82f6;
        }
        .notification-icon.success {
          color: #10b981;
        }
        .notification-icon.warning {
          color: #f59e0b;
        }
        .notification-icon.error {
          color: #ef4444;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center; /* centers horizontally */
          justify-content: center; /* centers vertically (if parent has height) */
          text-align: center;
          padding: 2rem;
        }

        .icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}


        .empty-state svg {
          width: 48px;
          height: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-state h3 {
          font-size: 18px;
          margin-bottom: 8px;
          color: #374151;
        }

        .empty-state p {
          font-size: 14px;
        }

        .content-area {
          flex: 1;
          padding: 24px;
          background: #f9fafb;
          overflow-y: auto;
        }

        .stats-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          padding: 24px;
          border-radius: 10px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s;
          cursor: pointer;
        }

        .stat-card:hover {
          transform: translateY(-2px);
        }

        .stat-title {
          color: #6b7280;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .stat-number {
          font-size: 36px;
          font-weight: bold;
          color: #111827;
        }

        .main-grid {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 24px;
        }

        .recent-activity {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 24px;
        }

        .activity-header {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 8px;
          color: #111827;
        }

        .activity-subtitle {
          color: #6b7280;
          font-size: 14px;
          margin-bottom: 20px;
        }

        .activity-item {
          display: flex;
          align-items: flex-start;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid #f3f4f6;
          cursor: pointer;
          transition: background-color 0.2s;
          padding: 12px;
          border-radius: 6px;
          min-height: 60px;
        }

        .activity-item:hover {
          background: #f9fafb;
        }

        .activity-item:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }

        .activity-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #111827;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;
          flex-shrink: 0;
          position: relative;
        }

        .activity-icon::before {
          content: "";
          position: absolute;
          width: 16px;
          height: 12px;
          background: white;
          border-radius: 8px 8px 0 0;
          top: 8px;
          left: 8px;
        }

        .activity-icon::after {
          content: "";
          position: absolute;
          width: 4px;
          height: 8px;
          background: white;
          top: 12px;
          left: 10px;
          box-shadow: 8px 0 white;
        }

        .activity-content {
          flex: 1;
          min-width: 0;
        }

        .activity-title {
          font-weight: 500;
          color: #111827;
          font-size: 14px;
          margin-bottom: 4px;
          word-wrap: break-word;
        }

        .activity-description {
          color: #6b7280;
          font-size: 12px;
          word-wrap: break-word;
        }

        .calendar-widget {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 20px;
        }

        .calendar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 8px;
        }

        .calendar-title {
          font-weight: 600;
          color: #111827;
        }

        .calendar-nav {
          display: flex;
          gap: 8px;
        }

        .calendar-nav-btn {
          padding: 4px 8px;
          border: none;
          background: #3b82f6;
          color: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: background-color 0.2s;
          min-height: 32px;
        }

        .calendar-nav-btn:hover {
          background: #2563eb;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }

        .calendar-day-header {
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          padding: 8px 4px;
          font-weight: 500;
        }

        .calendar-day {
          text-align: center;
          padding: 8px 4px;
          font-size: 12px;
          color: #374151;
          cursor: pointer;
          border-radius: 4px;
          transition: background-color 0.2s;
          min-height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .calendar-day:hover {
          background: #f3f4f6;
        }

        .calendar-day.today {
          background: #3b82f6;
          color: white;
        }

        .chat-widget {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 1000;
        }

        .chat-button {
          width: 64px;
          height: 64px;
          background: #b91c1c;
          border: none;
          border-radius: 20px;
          color: white;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(185, 28, 28, 0.3);
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .chat-button::after {
          content: "";
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-top: 10px solid #b91c1c;
        }

        .chat-button:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(185, 28, 28, 0.4);
        }

        .chat-button:hover::after {
          border-top-color: #b91c1c;
        }

        .chat-dots {
          display: flex;
          gap: 6px;
          align-items: center;
          justify-content: center;
        }

        .chat-dot {
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
        }

        /* Mobile Menu Button */
        .mobile-menu-btn {
          display: none;
          position: fixed;
          top: 20px;
          left: 20px;
          z-index: 1001;
          background: #b91c1c;
          color: white;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-size: 18px;
          cursor: pointer;
          min-height: 44px;
          min-width: 44px;
        }

        /* Logout Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: none;
          justify-content: center;
          align-items: center;
          z-index: 2000;
          padding: 20px;
        }

        .modal-overlay.active {
          display: flex;
        }

        .logout-modal {
          background: white;
          border-radius: 12px;
          padding: 32px;
          width: 90%;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }

        .logout-modal-icon {
          width: 64px;
          height: 64px;
          background: #fef3c7;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }

        .logout-modal-icon svg {
          width: 28px;
          height: 28px;
          color: #f59e0b;
        }

        .logout-modal h3 {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 12px;
        }

        .logout-modal p {
          font-size: 16px;
          color: #6b7280;
          margin-bottom: 32px;
          line-height: 1.5;
        }

        .logout-modal-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .logout-modal-btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 100px;
          min-height: 44px;
        }

        .logout-modal-btn.cancel {
          background: #f3f4f6;
          color: #374151;
        }

        .logout-modal-btn.cancel:hover {
          background: #e5e7eb;
        }

        .logout-modal-btn.confirm {
          background: #ef4444;
          color: white;
        }

        .logout-modal-btn.confirm:hover {
          background: #dc2626;
        }

        /* Tablet */
        @media (max-width: 1024px) {
          .main-grid {
            grid-template-columns: 1fr;
          }
          .stats-container {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }

        /* Mobile */
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: block;
          }
          .sidebar {
            transform: translateX(-100%);
            transition: transform 0.3s;
          }
          .sidebar.open {
            transform: translateX(0);
          }
          .main-content {
            margin-left: 0;
          }
          .header {
            margin-left: 60px;
            padding: 12px 16px;
          }
          .search-container {
            margin-right: 10px;
            min-width: 150px;
          }
          .content-area {
            padding: 16px;
          }
          .main-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .stats-container {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .chat-widget {
            bottom: 16px;
            right: 16px;
          }
          .chat-button {
            width: 56px;
            height: 56px;
            border-radius: 18px;
          }
          .chat-button::after {
            bottom: -6px;
            border-left-width: 8px;
            border-right-width: 8px;
            border-top-width: 8px;
          }
          .logout-modal {
            width: 95%;
            padding: 24px;
          }
          .logout-modal-buttons {
            flex-direction: column;
          }
          .calendar-grid {
            gap: 2px;
          }
          .calendar-day {
            min-height: 28px;
            padding: 4px 2px;
          }
        }

        /* Small Mobile */
        @media (max-width: 480px) {
          .header {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
            margin-left: 50px;
          }
          .search-container {
            margin-right: 0;
            min-width: auto;
          }
          .notification-bell {
            align-self: flex-end;
            margin-right: 0;
          }
          .content-area {
            padding: 12px;
          }
          .stat-card,
          .recent-activity,
          .calendar-widget {
            padding: 16px;
          }
          .mobile-menu-btn {
            top: 15px;
            left: 15px;
            padding: 10px;
          }
        }

        /* Touch devices */
        @media (hover: none) and (pointer: coarse) {
          .nav-item,
          .logout-btn {
            min-height: 48px;
          }
          .calendar-day {
            min-height: 40px;
          }
        }
      `}</style>
    </div>
  )
}

export default CtuDashboard
