"use client"

import {
  AlertTriangle,
  BarChart3,
  Bell,
  BellOff,
  Check,
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
  X,
  XCircle,
} from "lucide-react"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

const initialDirectoryData = []
const initialNotifications = []

function CtuDirectory() {
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
      info: Info,
      success: CheckCircle,
      warning: AlertTriangle,
      error: XCircle,
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
        filtered = filtered.filter((item) => item.type?.toLowerCase() === "horse")
        break
      case "veterinarian":
        filtered = filtered.filter((item) => item.type?.toLowerCase() === "veterinarian")
        break
      case "kutsero":
        filtered = filtered.filter((item) => item.type?.toLowerCase() === "kutsero")
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
      filtered = filtered.filter((item) => item.location?.toLowerCase().includes(areaFilter.toLowerCase()))
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter((item) => item.status?.toLowerCase() === statusFilter.toLowerCase())
    }

    // Apply search term
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.id?.toLowerCase().includes(lowerCaseSearchTerm) ||
          item.name?.toLowerCase().includes(lowerCaseSearchTerm) ||
          item.type?.toLowerCase().includes(lowerCaseSearchTerm) ||
          item.location?.toLowerCase().includes(lowerCaseSearchTerm) ||
          item.status?.toLowerCase().includes(lowerCaseSearchTerm),
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
      <style>{`
        

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

body {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

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
  background-color: #f8f9fa;
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
  color: #b91c1c;
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
  background: #ffffff;
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

.search-icons {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
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
  background-color: #ffffff;
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
  color:#b91c1c;
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

.content-area {
  flex: 1;
  padding: clamp(16px, 3vw, 24px);
  background: #f0f0f0;
  overflow-y: auto;
}

.directory-container {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.tab-navigation {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  background: #f8f9fa;
  overflow-x: auto;
}

.tab-item {
  padding: clamp(10px, 2vw, 12px) clamp(16px, 3vw, 24px);
  font-size: clamp(12px, 2vw, 14px);
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  white-space: nowrap;
  min-height: 44px;
  display: flex;
  align-items: center;
}

.tab-item.active {
  color: #111827;
  background: #e5e7eb;
  border-bottom-color:#b91c1c;
}

.tab-item:hover:not(.active) {
  color: #374151;
  background: #f3f4f6;
}

.directory-content {
  padding: clamp(16px, 3vw, 20px);
}

.filter-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: clamp(12px, 2vw, 14px);
  background: #ffffff;
  min-width: 140px;
  color: #6b7280;
  min-height: 40px;
}

.directory-table {
  width: 100%;
  border-collapse: collapse;
  font-size: clamp(12px, 2vw, 14px);
}

.table-header {
  background: #f8f9fa;
}

.table-header th {
  padding: clamp(8px, 2vw, 12px) clamp(12px, 2vw, 16px);
  text-align: left;
  font-weight: 600;
  color: #374151;
  font-size: clamp(12px, 2vw, 14px);
  border-bottom: 1px solid #e5e7eb;
}

.table-row {
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.2s;
}

.table-row:hover {
  background: #f8f9fa;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row td {
  padding: clamp(12px, 2vw, 16px);
  font-size: clamp(12px, 2vw, 14px);
  color: #111827;
  word-wrap: break-word;
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: clamp(10px, 1.8vw, 12px);
  font-weight: 500;
  white-space: nowrap;
}

.status-healthy {
  background: #dcfce7;
  color: #166534;
}

.status-active {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-inactive {
  background: #fef2f2;
  color: #dc2626;
}

/* Empty State */
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
  font-size: clamp(16px, 3vw, 18px);
  margin-bottom: 8px;
  color: #374151;
}

.empty-state p {
  font-size: clamp(12px, 2vw, 14px);
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

/* Chat Widget Styling */
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
  background: #ffffff;
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
  background: #ffffff;
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
  .filter-row {
    flex-direction: column;
  }
  .filter-select {
    min-width: auto;
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
  .tab-navigation {
    flex-wrap: nowrap;
    overflow-x: auto;
  }
  .tab-item {
    padding: 8px 16px;
    font-size: 12px;
    min-width: max-content;
  }
  .filter-row {
    flex-direction: column;
  }
  .directory-table {
    font-size: 12px;
    display: block;
    overflow-x: auto;
    white-space: nowrap;
  }
  .table-header th,
  .table-row td {
    padding: 8px;
    min-width: 80px;
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
  .directory-table {
    font-size: 11px;
  }
  .table-header th,
  .table-row td {
    padding: 6px;
    min-width: 70px;
  }
}

/* Touch devices */
@media (hover: none) and (pointer: coarse) {
  .nav-item,
  .logout-btn {
    min-height: 48px;
  }
  .tab-item {
    min-height: 48px;
  }
}

      `}</style>

      <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
        ☰
      </button>

      <div ref={sidebarRef} className={`sidebars ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebars-logo">
          <img src="/images/logo.png" alt="CTU Logo" className="logo" />
        </div>

        <nav className="nav-menu">
          {[
            { name: "Dashboard", IconComponent: LayoutDashboard, page: "dashboard", route: "/CtuDashboard" },
            {
              name: "Account Approval",
              IconComponent: UserCheck,
              page: "approval",
              route: "/CtuAccountApproval",
            },
            { name: "Access Requests", IconComponent: FileText, page: "requests", route: "/CtuAccessRequest" },
            { name: "Horse Records", IconComponent: ClipboardList, page: "records", route: "/CtuHorseRecord" },
            { name: "Health Reports", IconComponent: BarChart3, page: "reports", route: "/CtuHealthReport" },
            { name: "Announcements", IconComponent: Megaphone, page: "announcements", route: "/CtuAnnouncement" },
            { name: "Directory", IconComponent: Folder, page: "directory", route: "/CtuDirectory" },
            { name: "Settings", IconComponent: Settings, page: "settings", route: "/CtuSettings" },
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
              <item.IconComponent className="nav-icon" size={20} />
              <span>{item.name}</span>
            </a>
          ))}
        </nav>

        <div className="logouts">
          <a href="#" className="logout-btns" onClick={() => setShowLogoutModal(true)}>
            <LogOut className="logout-icons" size={20} />
            Log Out
          </a>
        </div>
      </div>

      <div className="main-content">
        <header className="headers">
          <div className="search-containers">
            <div className="search-icons">
               <Search size={20} />
            </div>
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
            <Bell size={20} />
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
                            onClick={(e) => {
                              e.stopPropagation()
                              markAsRead(notification.id)
                            }}
                            className="mark-read-btn"
                            title="Mark as read"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteNotification(notification.id)
                          }}
                          className="remove-btn"
                          title="Remove notification"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="notification-title">
                        {React.createElement(getNotificationIcon(notification.type), {
                          className: `notification-icon ${notification.type}`,
                          size: 16,
                        })}
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
                  <Folder size={48} />
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
                          <span className={`status-badge status-${item.status?.toLowerCase()}`}>{item.status}</span>
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
        <button className="chat-button" onClick={() => handleNavigation("/CtuMessage", "message")}>
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
              <LogOut size={25} color="#f59e0b" />
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
                  navigate("/login") // Navigate to login page
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

export default CtuDirectory
