"use client"
import Sidebar from "@/components/CtuSidebar"
import { AlertTriangle, Bell, CheckCircle, FileText, Info, LogOut, Search, XCircle } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import FloatingMessages from './CtuMessage'
import NotificationModal from "./CtuNotif"

const API_BASE = "http://127.0.0.1:8000/api/ctu_vetmed";


function CtuAccessRequest() {
  const navigate = useNavigate()
  const [isSidebarsOpen, setIsSidebarsOpen] = useState(false)
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isActionModalOpen, setIsActionModalOpen] = useState(false)
  const [actionDetails, setActionDetails] = useState({ title: "", message: "", action: "" })
  const [currentRequestId, setCurrentRequestId] = useState(null)
  const [accessRequests, setAccessRequests] = useState([]) // Placeholder for access request data
  const [activeTab, setActiveTab] = useState("pending") // Changed default from "all" to "pending"
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteRequestId, setDeleteRequestId] = useState(null)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  const sidebarRef = useRef(null)
  const [notifsOpen, setNotifsOpen] = useState(false)
  const logoutModalRef = useRef(null)
  const actionModalRef = useRef(null)
  const notificationBellRef = useRef(null)
  const notificationDropdownRef = useRef(null)

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

 // ✅ Auto-refresh every 30s
  useEffect(() => {
    loadNotifications() // load once

    const interval = setInterval(() => {
      loadNotifications()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [loadNotifications])


  const loadAccessRequests = useCallback(() => {
    console.log("Loading access requests...")
    setAccessRequests([])
  }, [])

  const toggleNotificationDropdown = () => {
    setIsNotificationDropdownOpen((prev) => !prev)
  }

  const toggleSidebar = () => {
    setIsSidebarsOpen((prev) => !prev)
  }

  const closeLogoutModal = () => {
    setIsLogoutModalOpen(false)
  }

  const confirmLogout = () => {
    console.log("User logged out")
    localStorage.removeItem("currentUser")
    localStorage.removeItem("loginTime")
    closeLogoutModal()
    navigate("/")
    window.location.reload()
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
      setAccessRequests((prev) =>
        prev.map((req) => (req.id === currentRequestId ? { ...req, status: "approved" } : req)),
      )
    } else if (actionDetails.action === "decline" && currentRequestId) {
      console.log(`Declining request: ${currentRequestId}`)
      setAccessRequests((prev) =>
        prev.map((req) => (req.id === currentRequestId ? { ...req, status: "declined" } : req)),
      )
    }
    closeActionModal()
  }

 

  const handleSearchInput = (e) => {
    const searchTerm = e.target.value.toLowerCase()
    console.log(`Searching for: ${searchTerm}`)
  }

  const deleteRequest = (requestId) => {
    setDeleteRequestId(requestId)
    setIsDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false)
    setDeleteRequestId(null)
  }

  const confirmDelete = () => {
    if (deleteRequestId) {
      console.log(`Deleting request: ${deleteRequestId}`)
      setAccessRequests((prev) => prev.filter((req) => req.id !== deleteRequestId))
    }
    closeDeleteModal()
  }

  const getFilteredAndSortedRequests = () => {
    let filtered = accessRequests

    filtered = filtered.filter((request) => request.status === activeTab)

    // Sort by most recent (dateRequested descending)
    return filtered.sort((a, b) => new Date(b.dateRequested) - new Date(a.dateRequested))
  }

  const getFilterCounts = () => {
    return {
      pending: accessRequests.filter((req) => req.status === "pending").length,
      approved: accessRequests.filter((req) => req.status === "approved").length,
      declined: accessRequests.filter((req) => req.status === "declined").length,
    }
  }

  useEffect(() => {
    loadAccessRequests()
    loadNotifications()
  }, [loadAccessRequests, loadNotifications])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationBellRef.current &&
        !notificationBellRef.current.contains(event.target) &&
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(event.target)
      ) {
        setIsNotificationDropdownOpen(false)
      }

      if (isLogoutModalOpen && logoutModalRef.current && event.target === logoutModalRef.current) {
        closeLogoutModal()
      }

      if (isActionModalOpen && actionModalRef.current && event.target === actionModalRef.current) {
        closeActionModal()
      }

      if (isDeleteModalOpen && event.target.classList.contains("modal-overlay")) {
        closeDeleteModal()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isNotificationDropdownOpen, isLogoutModalOpen, isActionModalOpen, isDeleteModalOpen])

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const filteredRequests = getFilteredAndSortedRequests()
  const filterCounts = getFilterCounts()

  // Define the styles object at the top of your file or before the return
  const styles = {
     notificationBtn: {
    position: "relative",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    borderRadius: "50%",
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
    titleStyle: {
      fontSize: "25px",
      fontWeight: "bold",
      color: "#da2424ff",
    },
  }

  return (
    <div className="bodyWrapper">
      {/* Internal CSS here */}
      <style>{`
        /* Replacing entire CSS file with user's comprehensive styling */
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
  flex: 1;
  display: flex;
  flex-direction: column;
  width: calc(100% - 250px);
}

.headers {
  background: white;
  padding: 18px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  flex-wrap: wrap;
  gap: 16px;
}

/* New styles for the sidebarToggleBtn in the header */
.headers .sidebarToggleBtn {
  background: none;
  border: none;
  color: #666; /* Or whatever color fits the header */
  font-size: 20px; /* Adjust size as needed */
  cursor: pointer;
  padding: 8px; /* Adjust padding */
  min-height: 44px;
  min-width: 44px;
  display: flex; /* Ensure icon is centered */
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.headers .sidebarToggleBtn:hover {
  color: #333; /* Darker on hover */
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
  border: 2px solid #fff;
  border-radius: 8px;
  font-size: clamp(12px, 2vw, 14px);
  outline: none;
  min-height: 50px;
  background: #fff;
}


.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
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

.content-areas {
flex: 1;
          padding: 24px;
          background: #f5f5f5;
          overflow-y: auto;
}

.page-headers {
  margin-bottom: 24px;
}

.page-title {
  font-size: clamp(20px, 4vw, 24px);
  font-weight: 700;
  color: #111827;
  margin-bottom: 20px;
}

.access-table {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* Added styles for status filter tabs */
.tabs-container {
  display: flex;
  gap: 16px;
  background: #e5e2e2ff;
  padding: 0 8px; /* remove vertical padding so tabs fill height */
  border-radius: 24px;
  height: 48px;
  width: 370px;
  align-items: center; /* center tabs vertically */
  margin-top:20px;
  margin-bottom:20px;
}

.tab {
        
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 100%; /* match container height */
  padding: 0 12px;
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  position: relative;
  border-radius: 24px; /* pill shape */
  transition: all 0.2s ease;
}

.tab:hover {
  background-color: #ffffff;
  color: #111827;
}



.tab.active {
  font-weight: 600;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}

.badge-pending {
  background-color: #f59e0b; /* orange */
}

.badge-approved {
  background-color: #22c55e; /* green */
}

.badge-declined {
  background-color: #ef4444; /* red */
}

.table-headerss {
  background: #f8f9fa;
  display: grid;
  grid-template-columns: 130px 140px 150px 240px 155px 160px 150px;
  padding: 16px 20px;
  font-weight: 600;
  color: #374151;
  font-size: clamp(12px, 2vw, 14px);
  border-bottom: 1px solid #e5e7eb;
  gap: 10px;
}

.table-rows {
  display: grid;
  grid-template-columns: 130px 140px 150px 240px 155px 160px 150px;
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.2s;
  align-items: center;
  gap: 10px;
  min-height: 60px;
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: clamp(10px, 1.8vw, 12px);
  font-weight: 500;
}

.status-pending {
  background: #fef3c7;
  color: #92400e;
}

.status-approved {
  background: #dcfce7;
  color: #166534;
}

.status-declined {
  background: #fecaca;
  color: #991b1b;
}

.action-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.action-btns {
  border: none;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: clamp(10px, 1.8vw, 12px);
  font-weight: 500; /* use a valid weight */
  cursor: pointer;
  transition: all 0.2s;
  display: inline-block;
}

/* Approve button */
.action-btns.approve-btn {
  background: #dcfce7;
  color: #166534;
}

.action-btns.approve-btn:hover {
  background: #bbf7d0;
}

/* Decline button */
.action-btns.decline-btn {
  background: #fecaca;
  color: #991b1b;
}

.action-btns.decline-btn:hover {
  background: #fca5a5;
}

/* Delete button */
.action-btns.delete-btn {
  background: #fee2e2;
  color: #991b1b;
}

.action-btns.delete-btn:hover {
  background: #fecaca;
}

/* Mobile Menu Button */
.mobile-menu-btn {
  display: none; /* Hidden by default, shown on mobile */
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
  z-index: 999;
}

.chat-button {
  width: 64px;
  height: 64px;
  background: #b91c1c;
  border: none;
  border-radius: 20px;
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(28, 44, 185, 0.3);
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
  box-shadow: 0 6px 16px rgba(28, 78, 185, 0.4);
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

/* Modal Styles */
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

.confirmation-btns.confirm {
  background: #22c55e;
  color: white;
}

.confirmation-btns.confirm:hover {
  background: #16a34a;
}

.confirmation-btns.confirm.decline {
  background: #ef4444;
}

.confirmation-btns.confirm.decline:hover {
  background: #dc2626;
}

/* Logout Modal Styles */
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
  .table-headers,
  .table-rows {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 8px;
  }

  

  .filter-tab {
    padding: 10px 16px;
    font-size: 13px;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .mobile-menu-btn {
    display: block;
  }

  .main-content {
    margin-left: 0;
    width: 100%;
  }

  .headers {
    margin-left: 60px;
    padding: 12px 16px;
  }

  .search-container {
    margin-right: 10px;
    min-width: auto;
  }

  .content-areas {
    padding: 16px;
  }

  .table-headers,
  .table-rows {
    grid-template-columns: 1fr;
    gap: 8px;
    text-align: left;
  }

  .table-rows {
    border: 1px solid #e5e7eb;
    margin-bottom: 12px;
    border-radius: 8px;
    padding: 16px;
  }

  .action-buttons {
    justify-content: flex-start;
    margin-top: 8px;
  }

  

/* Small Mobile */
@media (max-width: 480px) {
  .headers {
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

  .action-btn {
    min-height: 30px;
    padding: 8px 12px;
  }
}

.search-container {
  flex: 1;
  max-width: 400px;
  margin-right: 20px;
  position: relative;
  min-width: 200px;
  margin-bottom: 10px;
}

.search-input {
  width: 100%;
  padding: 8px 16px 8px 40px;
  border: 2px solid #fff;
  border-radius: 8px;
  font-size: clamp(12px, 2vw, 14px);
  outline: none;
  min-height: 50px;
  background: #fff;
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

      `}</style>

      <div className="sidebars" id="sidebars" ref={sidebarRef}>
        <Sidebar isOpen={isSidebarsOpen} />
      </div>

      <div className="main-content">
        <header className="headers">
          <h1 style={styles.titleStyle}>Access Request</h1>

          {/* 🔔 Notification Bell */}
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

        <div className="content-areas">
          <div className="page-headers">
            <div className="search-container">
              <Search className="search-icon" size={18} />
              <input type="text" className="search-input" placeholder="Search......" onChange={handleSearchInput} />
            </div>
            <div className="tabs-container">
              <button
                className={`tab ${activeTab === "pending" ? "active" : ""}`}
                onClick={() => setActiveTab("pending")}
              >
                Pending <span className="badge badge-pending">{filterCounts.pending}</span>
              </button>
              <button
                className={`tab ${activeTab === "approved" ? "active" : ""}`}
                onClick={() => setActiveTab("approved")}
              >
                Approved <span className="badge badge-approved">{filterCounts.approved}</span>
              </button>
              <button
                className={`tab ${activeTab === "declined" ? "active" : ""}`}
                onClick={() => setActiveTab("declined")}
              >
                Declined <span className="badge badge-declined">{filterCounts.declined}</span>
              </button>
            </div>
            <div className="access-table">
              <div className="table-headerss">
                <div>Request ID</div>
                <div>Horse Name</div>
                <div>Requested by (Vet)</div>
                <div>Reason for Access</div>
                <div>Date Requested</div>
                <div>Status</div>
                <div>Action</div>
              </div>
              {filteredRequests.length === 0 ? (
                <div className="empty-state">
                  <FileText size={48} />
                  <h3>No access requests</h3>
                  <p>No {activeTab} requests found</p>
                </div>
              ) : (
                filteredRequests.map((request) => (
                  <div key={request.id} className="table-rows">
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
                          <button className="action-btns approve-btn" onClick={() => approveRequest(request.id)}>
                            Approve
                          </button>
                          <button className="action-btns decline-btn" onClick={() => declineRequest(request.id)}>
                            Decline
                          </button>
                        </>
                      )}
                      {(request.status === "approved" || request.status === "declined") && (
                        <button className="action-btns delete-btn" onClick={() => deleteRequest(request.id)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <FloatingMessages />

      {/* Logout Modal */}
      {isLogoutModalOpen && (
        <div className="modal-overlay active" ref={logoutModalRef}>
          <div className="logout-modal">
            <div className="logout-modal-icon">
              <LogOut size={25} color="#f59e0b" />
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
                className={`confirmation-btns confirm ${actionDetails.action === "decline" ? "decline" : ""}`}
                onClick={confirmAction}
              >
                {actionDetails.action === "approve" ? "Approve" : "Decline"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="modal-overlay active">
          <div className="confirmation-modal">
            <h3>Delete Request</h3>
            <p>Are you sure you want to delete request {deleteRequestId}? This action cannot be undone.</p>
            <div className="confirmation-buttons">
              <button className="confirmation-btn cancel" onClick={closeDeleteModal}>
                Cancel
              </button>
              <button className="confirmation-btns confirm decline" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CtuAccessRequest
