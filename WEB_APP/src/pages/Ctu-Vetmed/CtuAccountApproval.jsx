"use client"
import Sidebar from "@/components/CtuSidebar"
import {
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  CheckCircle,
  Clock,
  CreditCard,
  FileText,
  Info,
  LogOut,
  MapPin,
  Search,
  Stethoscope,
  User,
  UserCheck,
  UserX,
  X,
  XCircle,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

function CtuAccountApproval() {
  const navigate = useNavigate()

  const [registrationData, setRegistrationData] = useState([])

  const [activeTab, setActiveTab] = useState("pending")
  const [recentFilter, setRecentFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false)

  const [notifications, setNotifications] = useState([])

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
  const [isSidebarsOpen, setIsSidebarsOpen] = useState(false)
  const [modalActiveTab, setModalActiveTab] = useState("personal")

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
    const IconComponent = icons[type] || icons.info
    return <IconComponent className={`notification-icon ${type}`} size={16} />
  }

  const handleChatButtonClick = () => {
    console.log("Chat button clicked")
    navigate("/CtuMessage")
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
    // In a real app, this would fetch from backend
    console.log("Notifications loaded:", notifications.length)
  }, [notifications.length])

  const filterRegistrations = useCallback(() => {
    let filtered = registrationData

    // Correctly filter by nested status
    filtered = filtered.filter((user) => user.users?.status === activeTab)

    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.vet_fname.toLowerCase().includes(searchTerm) ||
          user.vet_lname.toLowerCase().includes(searchTerm) ||
          user.vet_email.toLowerCase().includes(searchTerm),
      )
    }

    return filtered
  }, [registrationData, activeTab, searchTerm])

  const viewDetails = (userId, status) => {
    const user = registrationData.find((u) => u.id === userId)
    if (user) {
      setSelectedUser({ ...user, status }) // Pass status to modal for conditional buttons
      setIsViewDetailsModalOpen(true)
      setModalActiveTab("personal")
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

  // Approve
  const approveUser = async (vetProfileId) => {
    const url = `http://127.0.0.1:8000/api/update-vet-status/${vetProfileId}/`
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    })
    const data = await response.json()
    setRegistrationData((prev) => prev.map((u) => (u.id === vetProfileId ? { ...u, status: "approved" } : u)))
  }

  // Decline
  const declineUser = async (vetProfileId) => {
    const url = `http://127.0.0.1:8000/api/update-vet-status/${vetProfileId}/`
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "declined" }),
    })
    const data = await response.json()
    setRegistrationData((prev) => prev.map((u) => (u.id === vetProfileId ? { ...u, status: "declined" } : u)))
  }

  const approveAllPending = async () => {
    if (activeTab !== "pending") return
    const pendingUsers = registrationData.filter((user) => user.status === "pending")
    for (const user of pendingUsers) {
      await approveUser(user.id)
    }
  }

  const handleSearchInput = (e) => {
    setSearchTerm(e.target.value.toLowerCase())
  }

  const handleRecentFilterChange = (e) => {
    setRecentFilter(e.target.value)
  }

  // Remove all approved users from display only
  const deleteAllApprovedLocal = () => {
    if (!window.confirm("Remove all approved users from the display?")) return
    setRegistrationData((prev) => prev.filter((user) => user.users?.status !== "approved"))
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

  useEffect(() => {
    const loadVetProfiles = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/get-vet-profiles/")
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        console.log("Fetched vet profiles:", data)

        console.log("[v0] Raw backend data:", data)
        data.forEach((item, index) => {
          console.log(`[v0] Item ${index}:`, {
            id: item.id,
            name: `${item.vet_fname} ${item.vet_lname}`,
            status: item.status,
            statusType: typeof item.status,
            allFields: Object.keys(item),
          })
        })

        setRegistrationData(
          data.map((item) => ({
            ...item,
            status: item.status || "pending", // Use actual status from backend, fallback to "pending"
            type: item.type || "Veterinarian", // ensure type exists for badge
          })),
        )

        console.log(
          "[v0] Processed registration data:",
          data.map((item) => ({
            id: item.id,
            name: `${item.vet_fname} ${item.vet_lname}`,
            finalStatus: item.status || "pending",
          })),
        )
      } catch (error) {
        console.error("Failed to fetch vet profiles:", error)
      }
    }

    loadVetProfiles()
  }, [])

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

  const filteredRegistrations = filterRegistrations()

  return (
    <div className="bodyWrapper">
      {/* Internal CSS here */}
      <style>{`
        .bodyWrapper {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: #f5f5f5;
  display: flex;
  height: 100vh;
  overflow-x: hidden;
  width: 100%; /* Ensure it takes full width */
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
  transition: margin-left 0.3s ease; /* Add transition for margin */
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

.search-containers {
  flex: 1;
  max-width: 400px;
  margin-right: 20px;
  position: relative;
  min-width: 200px;
  margin-bottom:10px;
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
  color: #6b7280;
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

.content-area {
  flex: 1;
  padding: clamp(16px, 3vw, 24px);
  background: #f9fafb;
  overflow-y: auto;
}

.page-header {
  margin-bottom: 24px;
}

h1 {
  font-size: clamp(20px, 4vw, 24px);
  font-weight: 700;
  color: #111827;
  margin-bottom: 8px;
  line-height: 1.2;
}

h2 {
  font-size: clamp(14px, 2.5vw, 16px);
  font-weight: 500;
  color: #6b7280;
  margin-top:25px;
  margin-bottom: 16px;
  line-height: 1.4;
}

.tabs-container {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 24px;
  overflow-x: auto;
}

.tab {
  padding: 12px 24px;
  background: none;
  border: none;
  font-size: clamp(12px, 2vw, 14px);
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  white-space: nowrap;
  min-height: 44px;
}

.tab.active {
  color: #b91c1c;
  border-bottom-color: #b91c1c;
}

.tab:hover {
  color: #374151;
}

.controls-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.filter-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: clamp(12px, 2vw, 14px);
  background: white;
  min-height: 40px;
}

.approve-all-btn {
  background: #22c55e;
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

.approve-all-btn:hover {
  background: #16a34a;
}

.registration-table {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.registration-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.2s;
  min-height: 80px;
}

.registration-item:hover {
  background: #f9fafb;
}

.registration-item:last-child {
  border-bottom: none;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 16px;
  margin-right: 16px;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-weight: 600;
  color: #111827;
  font-size: clamp(12px, 2vw, 14px);
  margin-bottom: 2px;
  word-wrap: break-word;
}

.user-email {
  color: #6b7280;
  font-size: clamp(10px, 1.8vw, 12px);
  margin-bottom: 2px;
  word-wrap: break-word;
}

.user-details {
  color: #6b7280;
  font-size: clamp(10px, 1.8vw, 12px);
  word-wrap: break-word;
}

.user-type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: clamp(9px, 1.5vw, 10px);
  font-weight: 500;
  margin-left: 8px;
  color: #000; /* Default text color */
}

/* Approved = Green */
.user-type-badge.badge-approved {
  background-color: #539953ff; /* Light green */
  color: #fff;
}

/* Pending = Orange */
.user-type-badge.badge-pending {
  background-color: #ffa500; /* Orange */
  color: #fff;
}

/* Declined = Red */
.user-type-badge.badge-declined {
  background-color: #ff4c4c; /* Red */
  color: #fff;
}



.badge-kutsero {
  background: #dbeafe;
  color: #1d4ed8;
}

.badge-veterinarian {
  background: #dcfce7;
  color: #166534;
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-left: 16px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: clamp(10px, 1.8vw, 12px);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 32px;
}

.action-btn.btn-view {
  background: #30487a;
  color: white;
}

.action-btn.btn-view:hover {
  background: #6e7c9b;
}

.action-btn.btn-approve {
  background: #22c55e;
  color: white;
}

.action-btn.btn-approve:hover {
  background: #16a34a;
}

.action-btn.btn-decline {
  background: #ef4444;
  color: white;
}

.action-btn.btn-decline:hover {
  background: #dc2626;
}

/* Mobile menu button (fixed, outside main-content) */
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
  z-index: 1000;
  padding: 20px;
}

.modal-overlay.active {
  display: flex;
}

.modal-contents {
  background: white;
  border-radius: 8px;
  padding: clamp(20px, 4vw, 32px);
  width: 90%;
  max-width: 1200px; /* allow much wider modal */
  max-height: 90vh;  /* taller modal */
  overflow-y: auto;
  position: relative;
}


.modal-body {
  margin-bottom: 20px;
}

.modal-section {
  margin-bottom: 24px;
}

.modal-section-box {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  transition: box-shadow 0.2s ease;
}

.modal-section-box:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.section-icon {
  color: #b91c1c;
  margin-right: 8px;
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.section-header h4 {
  font-size: clamp(14px, 2.5vw, 16px);
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.modal-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.modal-field {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 4px;
}

.modal-field.full-width {
  grid-column: 1 / -1;
}

.modal-label {
  font-size: clamp(10px, 1.8vw, 12px);
  color: #6b7280;
  flex-shrink: 0;
  min-width: 120px;
}

.modal-value {
  font-size: clamp(12px, 2vw, 14px);
  font-weight: 500;
  color: #111827;
  word-wrap: break-word;
  flex-shrink: 0;
  margin-right:100%;
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  min-height: 32px;
  min-width: 32px;
}

.modal-close:hover {
  color: #374151;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  gap: 12px;
  flex-wrap: wrap;
  
}

.modal-footer.close-only {
  justify-content: flex-end;
}

.modal-btn {
  background: #6b7280;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: clamp(12px, 2vw, 14px);
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  flex: 1;
  min-height: 40px;
}

.modal-btn:hover {
  background: #4b5563;
}

.modal-btn.approve {
  background: #22c55e;
  color: white;
}

.modal-btn.approve:hover {
  background: #16a34a;
}

.modal-btn.decline {
  background: #ef4444;
  color: white;
}

.modal-btn.decline:hover {
  background: #dc2626;
}

/* Confirmation Modal */
.confirmation-modal {
  background: white;
  border-radius: 8px;
  padding: clamp(20px, 4vw, 30px);
  text-align: center;
  max-width: 400px;
  width: 90%;
}

.confirmation-modal h3 {
  font-size: clamp(16px, 3vw, 18px);
  font-weight: 600;
  color: #111827;
  margin-bottom: 12px;
}

.confirmation-modal p {
  font-size: clamp(14px, 2.5vw, 16px);
  color: #6b7280;
  margin-bottom: 24px;
  line-height: 1.4;
}

.confirmation-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}


.confirmation-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: clamp(12px, 2vw, 14px);
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  min-height: 40px;
  flex: 1;
  min-width: 80px;
}

.confirmation-btn.cancel {
  background: #6b7280;
  color: white;
}

.confirmation-btn.cancel:hover {
  background: #4b5563;
}

.confirmation-btn.confirm {
  background: #22c55e;
  color: white;
}

.confirmation-btn.confirm:hover {
  background: #16a34a;
}

.confirmation-btn.confirm.decline {
  background: #ef4444;
}

.confirmation-btn.confirm.decline:hover {
  background: #dc2626;
}

.modal-user-badge {
  background-color: #52e577ff;
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: bold;
  display: inline-block;
  text-transform: capitalize;
}


/* Logout Modal */
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

/* Chat Widget */
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
@keyframes pulse {
  0%,
  60%,
  100% {
    opacity: 1;
  }
  30% {
    opacity: 0.3;
  }
}

/* Responsive Design */
@media (max-width: 768px) {
 
  .main-content {
    margin-left: 0;
    width: 100%;
  }

  .mobile-menu-btn {
    display: flex;
  }

  .headers {
    padding: 12px 16px;
  }

  .search-containers {
    margin-right: 12px;
    min-width: 150px;
  }

  .content-area {
    padding: 16px;
  }

  .page-header h1 {
    font-size: 20px;
  }

  .page-header h2 {
    font-size: 14px;
  }

  .chat-widget {
            bottom: 16px;
            right: 16px;
          }

  .tabs-container {
    margin-bottom: 16px;
  }

  .controls-row {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .filter-controls {
    justify-content: space-between;
  }

  .registration-item {
    padding: 12px 16px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .user-info {
    min-width: 200px;
  }

  .action-buttons {
    margin-left: 0;
    width: 100%;
    justify-content: flex-end;
  }

  .modal-contents {
    width: 95%;
    max-width: none;
    margin: 10px;
    padding: 16px;
  }

  .modal-section-box {
    padding: 12px;
    margin-bottom: 12px;
  }

  .section-header {
    margin-bottom: 12px;
  }

  .modal-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .header {
    padding: 8px 12px;
  }

  .search-containers {
    min-width: 120px;
  }

  .content-area {
    padding: 12px;
  }

  .registration-item {
    padding: 8px 12px;
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }

  .modal-avatar {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }
}

.modal-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: #6b7280;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 20px;
  position: relative;
}

.modal-btns {
  padding: 8px 18px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
}

.modal-btns.approve {
  background-color: #27ae60;
  color: white;
}

.modal-btns.decline {
  background-color: #e74c3c;
  color: white;
}

.modal-btns.close {
  background-color: #73797a;
  color: white;
}


/* Wrapper for circle and text side by side */
.modal-status-wrapper {
  display: flex;
  align-items: center;
  position: absolute;
  bottom: 0; /* adjust to sit at bottom-right */
  right: -60px; /* shift right of avatar */
  gap: 4px;
}

/* Circle for status */
.modal-status-circle {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid white;
}

/* Status text */
.modal-status-text {
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
}

/* Status colors */
.modal-status-circle.status-pending {
  background-color: #ffe066; /* yellow */
}
.modal-status-circle.status-approved {
  background-color: #2ecc71; /* green */
}
.modal-status-circle.status-declined {
  background-color: #e74c3c; /* red */
}

.modal-status-text.status-pending {
  color: #856404;
}
.modal-status-text.status-approved {
  color: #155724;
}
.modal-status-text.status-declined {
  color: #721c24;
}

/* Delete All button */
.delete-all-btn {
  background-color: #dc3545; /* Bootstrap danger red */
  color: #fff;
  border: none;
  padding: 8px 14px;
  margin-left: 10px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
  transition: background-color 0.3s ease, transform 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Hover effect */
.delete-all-btn:hover {
  background-color: #b02a37;
  transform: translateY(-1px);
}

/* Optional: focus effect */
.delete-all-btn:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.4);
}
/* Updated modal headers and added new profile section styles */
.modal-headers {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 32px 16px;
  border-bottom: 1px solid #e5e7eb;
  background-color: #fff;
}

.profile-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
}

.profile-avatar-container {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}

.profile-avatar-circle {
  width: 120px;
  height: 120px;
  border: 2px solid #e5e7eb;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;
}

.profile-text {
  font-size: 16px;
  font-weight: 500;
  color: #6b7280;
}

.profile-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.profile-name {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.profile-role {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

.profile-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.status-label {
  font-size: 14px;
  color: #111827;
  font-weight: 500;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.status-pending {
  background-color: #fef3c7;
  color: #d97706;
}

.status-badge.status-approved {
  background-color: #d1fae5;
  color: #059669;
}

.status-badge.status-declined {
  background-color: #fee2e2;
  color: #dc2626;
}

/* Removed old modal-user-infos styles as they're no longer needed */

.modal-tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
}

.tab-button {
  padding: 12px 24px;
  background: none;
  border: none;
  font-size: clamp(12px, 2vw, 14px);
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  white-space: nowrap;
  min-height: 44px;
}

.tab-button.active {
  color: #b91c1c;
  border-bottom-color: #b91c1c;
}

.tab-button:hover {
  color: #374151;
}

.documents-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  border: 1px dashed #ccc;
  border-radius: 8px;
  text-align: center;
}

.document-image-container {
  position: relative;
  width: 100%;
  max-width: 400px; /* Adjust as needed */
}

.document-image {
  width: 100%;
  height: auto;
  border-radius: 8px;
  display: block;
}

.document-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
}

.document-placeholder svg {
  margin-bottom: 10px;
}
  .account-title {
          font-size: 25px;
          font-weight: bold;
          color: #da2424ff;
        }
      `}</style>

      <div className="sidebars" id="sidebasr">
        <Sidebar isOpen={isSidebarsOpen} />
      </div>
      <div className="main-content">
        <header className="headers">
           <h1 className="account-title">Account Approval</h1>
            
          <div
            className="notification-bell"
            id="notification-bell"
            ref={notificationBellRef}
            onClick={() => setIsNotificationDropdownOpen((prev) => !prev)}
          >
            <Bell size={20} />
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
                            <Check size={14} />
                          </button>
                        )}
                        <button
                          className="notification-action"
                          onClick={() => deleteNotification(notification.id)}
                          title="Delete"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="notification-title">{getNotificationIcon(notification.type)}</div>
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
           
            <div className="search-containers">
            <Search className="search-icon" size={18} />
            <input type="text" className="search-input" placeholder="Search......" onChange={handleSearchInput} />
          </div>
              <h2>Manage registration requests from Veterinarians</h2>
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

            {/* For Approved Tab */}
            {activeTab === "approved" && (
              <button className="delete-all-btn" onClick={deleteAllApprovedLocal}>
                Delete All
              </button>
            )}
          </div>
          <div className="registration-table" id="registrationTable">
            {filteredRegistrations.length === 0 ? (
              <div className="empty-state">
                {activeTab === "pending" ? (
                  <Clock size={48} />
                ) : activeTab === "approved" ? (
                  <UserCheck size={48} />
                ) : (
                  <UserX size={48} />
                )}
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
                  <div className="user-avatar">{user.vet_fname.charAt(0) + user.vet_lname.charAt(0)}</div>

                  <div className="user-info">
                    <div className="user-name">
                      {user.vet_fname} {user.vet_mname} {user.vet_lname}
                      <span className={`user-type-badge badge-${user.users?.status}`}>{user.users?.status}</span>
                    </div>
                    <div className="user-email">{user.vet_email}</div>
                    <div className="user-details">
                      {user.vet_city}, {user.vet_province}
                    </div>
                  </div>

                  <div className="action-buttons">
                    <button className="action-btn btn-view" onClick={() => viewDetails(user.id, user.users?.status)}>
                      View Details
                    </button>

                    {user.users?.status === "pending" && (
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
        <button className="chat-button" onClick={handleChatButtonClick}>
          <div className="chat-dots">
            <div className="chat-dot" />
            <div className="chat-dot" />
            <div className="chat-dot" />
          </div>
        </button>
      </div>
      {/* View Details Modal */}
      {isViewDetailsModalOpen && selectedUser && (
        <div className="modal-overlay active" ref={viewDetailsModalOverlayRef}>
          <div className="modal-contents">
            <button className="modal-close" onClick={closeModal}>
              &times;
            </button>

            <div className="modal-headers">
              <div className="profile-section">
                <div className="profile-avatar-container">
                  <div className="profile-avatar-circle">
                    <span className="profile-text">Profile</span>
                  </div>
                </div>

                <div className="profile-info">
                  <h3 className="profile-name">
                    {selectedUser.vet_fname} {selectedUser.vet_mname} {selectedUser.vet_lname}
                  </h3>
                  <p className="profile-role">{selectedUser.type}</p>
                  <div className="profile-status">
                    <span className="status-label">Current Status:</span>
                    <span className={`status-badge status-${selectedUser.users?.status}`}>
                      {selectedUser.users?.status.charAt(0).toUpperCase() + selectedUser.users?.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-tabs">
              <button
                className={`tab-button ${modalActiveTab === "personal" ? "active" : ""}`}
                onClick={() => setModalActiveTab("personal")}
              >
                Personal Information
              </button>
              <button
                className={`tab-button ${modalActiveTab === "professional" ? "active" : ""}`}
                onClick={() => setModalActiveTab("professional")}
              >
                Professional Info
              </button>
              <button
                className={`tab-button ${modalActiveTab === "documents" ? "active" : ""}`}
                onClick={() => setModalActiveTab("documents")}
              >
                Documents
              </button>
            </div>

            <div className="modal-body">
              {modalActiveTab === "personal" && (
                <>
                  <div className="modal-section-box">
                    <div className="section-header">
                      <User className="section-icon" size={20} />
                      <h4>Name Information</h4>
                    </div>
                    <div className="modal-grid">
                      <div className="modal-field">
                        <span className="modal-label">First Name:</span>
                        <div className="modal-value">{selectedUser.vet_fname}</div>
                      </div>
                      <div className="modal-field">
                        <span className="modal-label">Middle Name:</span>
                        <div className="modal-value">{selectedUser.vet_mname}</div>
                      </div>
                      <div className="modal-field">
                        <span className="modal-label">Last Name:</span>
                        <div className="modal-value">{selectedUser.vet_lname}</div>
                      </div>
                    </div>
                  </div>

                  <div className="modal-section-box">
                    <div className="section-header">
                      <CreditCard className="section-icon" size={20} />
                      <h4>Personal Information</h4>
                    </div>
                    <div className="modal-grid">
                      <div className="modal-field">
                        <span className="modal-label">Date of Birth:</span>
                        <div className="modal-value">{selectedUser.vet_dob}</div>
                      </div>
                      <div className="modal-field">
                        <span className="modal-label">Sex:</span>
                        <div className="modal-value">{selectedUser.vet_sex || "Not specified"}</div>
                      </div>
                      <div className="modal-field full-width">
                        <span className="modal-label">Phone Number:</span>
                        <div className="modal-value">{selectedUser.vet_phone_num}</div>
                      </div>
                      <div className="modal-field full-width">
                        <span className="modal-label">Email:</span>
                        <div className="modal-value">{selectedUser.vet_email}</div>
                      </div>
                      <div className="modal-field full-width">
                        <span className="modal-label">Facebook:</span>
                        <div className="modal-value">{selectedUser.facebook}</div>
                      </div>
                    </div>
                  </div>

                  <div className="modal-section-box">
                    <div className="section-header">
                      <MapPin className="section-icon" size={20} />
                      <h4>Address Information</h4>
                    </div>
                    <div className="modal-grid">
                      <div className="modal-field">
                        <span className="modal-label">Province:</span>
                        <div className="modal-value">{selectedUser.vet_province}</div>
                      </div>
                      <div className="modal-field">
                        <span className="modal-label">City:</span>
                        <div className="modal-value">{selectedUser.vet_city}</div>
                      </div>
                      <div className="modal-field">
                        <span className="modal-label">Barangay:</span>
                        <div className="modal-value">{selectedUser.vet_brgy}</div>
                      </div>
                      <div className="modal-field">
                        <span className="modal-label">Zip Code:</span>
                        <div className="modal-value">{selectedUser.vet_zipcode}</div>
                      </div>
                      <div className="modal-field full-width">
                        <span className="modal-label">Complete Address:</span>
                        <div className="modal-value">{`${selectedUser.vet_brgy}, ${selectedUser.vet_city}, ${selectedUser.vet_province}`}</div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {modalActiveTab === "professional" && (
                <div className="modal-section-box">
                  <div className="section-header">
                    <Stethoscope className="section-icon" size={20} />
                    <h4>Professional Information</h4>
                  </div>
                  <div className="modal-grid">
                    <div className="modal-field">
                      <span className="modal-label">License Number:</span>
                      <div className="modal-value">{selectedUser.vet_license_num || "Not provided"}</div>
                    </div>
                    <div className="modal-field">
                      <span className="modal-label">Experience Years:</span>
                      <div className="modal-value">{selectedUser.vet_exp_yr || "Not specified"}</div>
                    </div>
                    <div className="modal-field full-width">
                      <span className="modal-label">Specialization:</span>
                      <div className="modal-value">{selectedUser.vet_specialization || "Not specified"}</div>
                    </div>
                    <div className="modal-field full-width">
                      <span className="modal-label">Organization:</span>
                      <div className="modal-value">{selectedUser.vet_org || "Not specified"}</div>
                    </div>
                  </div>
                </div>
              )}

              {modalActiveTab === "documents" && (
                <div className="modal-section-box">
                  <div className="section-header">
                    <FileText className="section-icon" size={20} />
                    <h4>Documents</h4>
                  </div>
                  <div className="documents-container">
                    {selectedUser.vet_doc_image ? (
                      <div className="document-image-container">
                        <img
                          src={selectedUser.vet_doc_image || "/placeholder.svg"}
                          alt="Veterinarian License Document"
                          className="document-image"
                          onError={(e) => {
                            e.target.style.display = "none"
                            e.target.nextSibling.style.display = "block"
                          }}
                        />
                        <div className="document-placeholder" style={{ display: "none" }}>
                          <FileText size={48} />
                          <p>Document image not available</p>
                        </div>
                      </div>
                    ) : (
                      <div className="document-placeholder">
                        <FileText size={48} />
                        <p>No document provided</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div
              className={`modal-footer ${
                (
                  registrationData.find((u) => u.id === selectedUser.id)?.users?.status || selectedUser.users?.status
                ) !== "pending"
                  ? "close-only"
                  : ""
              }`}
            >
              <button className="modal-btns close" onClick={closeModal}>
                Close
              </button>

              {(registrationData.find((u) => u.id === selectedUser.id)?.users?.status || selectedUser.users?.status) ===
                "pending" && (
                <>
                  <button className="modal-btns approve" onClick={showApproveConfirmationFromModal}>
                    Approve
                  </button>
                  <button className="modal-btns decline" onClick={showDeclineConfirmationFromModal}>
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
    </div>
  )
}

export default CtuAccountApproval
