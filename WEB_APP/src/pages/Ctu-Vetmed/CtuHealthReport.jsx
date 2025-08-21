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
  Settings,
  UserCheck,
  XCircle,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

function CtuHealthReport() {
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

  const getNotificationIcon = (type) => {
    const icons = {
      info: Info,
      success: CheckCircle,
      warning: AlertTriangle,
      error: XCircle,
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
    setNotifications([])
  }, [])

  const loadStatistics = useCallback(() => {
    // Placeholder for fetching statistics from backend
    setStatistics({})
  }, [])

  const loadHealthData = useCallback((filter = "all") => {
    console.log(`Loading health data for: ${filter}`)
    // Placeholder for fetching chart data from backend based on filter
    setHealthData([])
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

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/CtuDashboard" },
    { name: "Account Approval", icon: UserCheck, path: "/CtuAccountApproval" },
    { name: "Access Requests", icon: FileText, path: "/CtuAccessRequest" },
    { name: "Horse Records", icon: ClipboardList, path: "/CtuHorseRecord" },
    { name: "Health Reports", icon: BarChart3, path: "/CtuHealthReport", active: true },
    { name: "Announcements", icon: Megaphone, path: "/CtuAnnouncement" },
    { name: "Directory", icon: Folder, path: "/CtuDirectory" },
    { name: "Settings", icon: Settings, path: "/CtuSettings" },
  ]

  return (
    <div className="bodyWrapper">
      <style>{`
       

/* General Styles */
body {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.bodyWrapper {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: #f5f5f5;
  display: flex;
  height: 100vh;
  overflow-x: hidden;
  width: 100%;
}

/* Sidebar Styles */
.sidebars {
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

.sidebars-logo {
  padding: 5px;
  display: flex;
  justify-content: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebars-logo img {
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
  font-size: clamp(13px, 2vw, 15px);
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
}

.nav-icon {
  width: 20px;
  height: 20px;
  margin-right: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.nav-item.active .nav-icon {
  color:#b91c1c;
}

 .logouts {
  padding: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.logout-btns {
  display: flex;
  align-items: center;
  color: white;
  text-decoration: none;
  font-size: clamp(13px, 2vw, 15px);
  font-weight: 500;
  cursor: pointer;
  padding: 14px 40px;
  border-radius: 25px;
  transition: all 0.3s ease;
  min-height: 44px;
}

.logout-btns:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.logout-icons {
  width: 20px;
  height: 20px;
  margin-right: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}


.main-content {
  margin-left: 250px;
  flex: 1;
  display: flex;
  flex-direction: column;
  width: calc(100% - 250px);
}

.headers {
  background: white;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  flex-wrap: wrap;
  gap: 16px;
}

.search-containers {
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
  font-size: clamp(12px, 2vw, 14px);
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
}

.search-icon::before {
  content: "";
  position: absolute;
  width: 10px;
  height: 10px;
  border: 2px solid #6b7280;
  border-radius: 50%;
  top: 0;
  left: 0;
}

.search-icon::after {
  content: "";
  position: absolute;
  width: 2px;
  height: 5px;
  background: #6b7280;
  transform: rotate(45deg);
  bottom: 1px;
  right: 1px;
}

.notification-bell {
  font-size: clamp(18px, 3vw, 20px);
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
  display: none;
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

.notification-actions {
  position: absolute;
  top: 10px;
  right: 15px;
  display: flex;
  gap: 5px;
}

.notification-action {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 2px;
  border-radius: 3px;
  font-size: 12px;
}

.notification-action:hover {
  background: #f0f0f0;
  color: #666;
}

.content-areas {
  flex: 1;
  padding: clamp(16px, 3vw, 24px);
  background: #f0f0f0;
  overflow-y: auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: clamp(20px, 4vw, 24px);
  font-weight: 700;
  color: #111827;
  margin-bottom: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
  transition: transform 0.2s;
  cursor: pointer;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-number {
  font-size: clamp(28px, 6vw, 36px);
  font-weight: 700;
  color: #111827;
  margin-bottom: 8px;
}

.stat-label {
  font-size: clamp(12px, 2vw, 14px);
  color: #6b7280;
  font-weight: 500;
}

.chart-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: clamp(16px, 3vw, 24px);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.chart-title {
  font-size: clamp(16px, 3vw, 18px);
  font-weight: 600;
  color: #111827;
}

.chart-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.time-filter {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: clamp(12px, 2vw, 14px);
  background: white;
  min-height: 40px;
}

.export-btn {
  background: #b91c1c;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: clamp(12px, 2vw, 14px);
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  min-height: 40px;
}

.export-btn:hover {
  background: #991b1b;
}

.chart-container {
  position: relative;
  height: 300px;
  margin-top: 20px;
}

.chart-legend {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  justify-content: center;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: clamp(10px, 1.8vw, 12px);
  color: #6b7280;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
}

.legend-healthy {
  background: #22c55e;
}
.legend-warning {
  background: #eab308;
}
.legend-poor {
  background: #ef4444;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 250px;
  padding: 0 20px;
  overflow-x: auto;
  gap: 10px;
}

.bar-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 80px;
  flex-shrink: 0;
}

.bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 200px;
}

.bar {
  width: 20px;
  border-radius: 2px 2px 0 0;
  transition: opacity 0.2s;
  min-width: 16px;
}

.bar:hover {
  opacity: 0.8;
}

.bar-healthy {
  background: #22c55e;
}
.bar-warning {
  background: #eab308;
}
.bar-poor {
  background: #ef4444;
}

.area-label {
  font-size: clamp(10px, 1.8vw, 12px);
  color: #6b7280;
  text-align: center;
  max-width: 80px;
  word-wrap: break-word;
  line-height: 1.2;
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

.empty-state i {
  font-size: 48px;
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

/* Chat Widget Styling - Button Only */
.chat-widget {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
}

/* Chat Button - Speech Bubble Design */
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

/* Speech bubble tail */
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

/* Static three dots design */
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

.confirmation-modal {
  background: white;
  border-radius: 8px;
  padding: clamp(20px, 4vw, 24px);
  width: 90%;
  max-width: 400px;
  text-align: center;
}

.confirmation-modal h3 {
  font-size: clamp(16px, 3vw, 18px);
  font-weight: 600;
  color: #111827;
  margin-bottom: 12px;
}

.confirmation-modal p {
  font-size: clamp(12px, 2vw, 14px);
  color: #6b7280;
  margin-bottom: 24px;
  line-height: 1.5;
}

.confirmation-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.confirmation-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  font-size: clamp(12px, 2vw, 14px);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 80px;
  min-height: 40px;
}

.confirmation-btn.cancel {
  background: #6b7280;
  color: white;
}

.confirmation-btn.cancel:hover {
  background: #4b5563;
}

.confirmation-btn.confirm {
  background: #ef4444;
  color: white;
}

.confirmation-btn.confirm:hover {
  background: #dc2626;
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

.logout-modal-icon i {
  font-size: 28px;
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
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .chart-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  .chart-controls {
    justify-content: center;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .mobile-menu-btn {
    display: block;
  }
  .sidebars {
    transform: translateX(-100%);
    transition: transform 0.3s;
  }
  .sidebars.open {
    transform: translateX(0);
  }
  .main-content {
    margin-left: 0;
    width: 100%;
  }
  .headers {
    margin-left: 60px;
    padding: 12px 16px;
  }
  .search-containers {
    margin-right: 10px;
    min-width: 150px;
  }
  .content-areas {
    padding: 16px;
  }
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .chart-bars {
    padding: 0 10px;
    gap: 8px;
  }
  .bar-group {
    min-width: 60px;
  }
  .bar {
    width: 16px;
    min-width: 12px;
  }
  .area-label {
    font-size: 10px;
    max-width: 60px;
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
  .confirmation-buttons {
    flex-direction: column;
  }
}

/* Small Mobile */
@media (max-width: 480px) {
  .headers {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    margin-left: 50px;
  }
  .search-containers {
    margin-right: 0;
    min-width: auto;
  }
  .notification-bell {
    align-self: flex-end;
    margin-right: 0;
  }
  .mobile-menu-btn {
    top: 15px;
    left: 15px;
    padding: 10px;
  }
  .chart-container {
    height: 250px;
  }
  .chart-bars {
    height: 200px;
  }
  .bars {
    height: 150px;
  }
}

/* Touch devices */
@media (hover: none) and (pointer: coarse) {
  .nav-item,
  .logout-btn {
    min-height: 48px;
  }
  .stat-card {
    min-height: 100px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
}

      `}</style>

      <button className="mobile-menu-btn" onClick={toggleSidebar}>
        ☰
      </button>

      <div className={`sidebars ${isSidebarExpanded ? "open" : ""}`} id="sidebars">
        <div className="sidebars-logo">
          <img src="/images/logo.png" alt="CTU Logo" className="logo" />
        </div>

        <nav className="nav-menu">
          {menuItems.map((item) => (
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
              <item.icon className="nav-icon" size={16} />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="logouts">
          <a href="#" className="logout-btns" id="logoutBtn" onClick={openLogoutModal}>
            <LogOut className="logout-icons" size={16} />
            Log Out
          </a>
        </div>
      </div>

      <div className="main-content">
        <header className="headers">
          <div className="search-containers">
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
            <Bell size={20} />
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
                     <BellOff size={48} />
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
                            <CheckCircle size={16} />
                          </button>
                        )}
                        <button
                          className="notification-action"
                          onClick={() => deleteNotification(notification.id)}
                          title="Delete"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                      <div className="notification-title">
                        <notification.icon className={`notification-icon ${notification.type}`} size={16} />
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

        <div className="content-areas">
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
                    <BarChart3 size={48} />
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
        <button className="chat-button" id="chatButton" onClick={() => navigate("/CtuMessage")}>
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
            <LogOut size={28} />
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

export default CtuHealthReport
