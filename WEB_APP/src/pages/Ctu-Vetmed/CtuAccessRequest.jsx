"use client"
import Sidebar from "@/components/CtuSidebar"
import { AlertTriangle, Bell, CheckCircle, ChevronLeft, ChevronRight, FileText, Info, Search, XCircle } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import FloatingMessages from "./CtuMessage"
import NotificationModal from "./CtuNotif"

const API_BASE_URL = "http://127.0.0.1:8000/api/ctu_vetmed"

function CtuAccessRequest() {
  const navigate = useNavigate()
  const [isSidebarsOpen, setIsSidebarsOpen] = useState(false)
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isActionModalOpen, setIsActionModalOpen] = useState(false)
  const [actionDetails, setActionDetails] = useState({ title: "", message: "", action: "" })
  const [currentRequestId, setCurrentRequestId] = useState(null)
  const [accessRequests, setAccessRequests] = useState([])
  const [activeTab, setActiveTab] = useState("pending")
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteRequestId, setDeleteRequestId] = useState(null)

  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [declineReason, setDeclineReason] = useState("")
  const [selectedRequestId, setSelectedRequestId] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterBy, setFilterBy] = useState("all")
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false)
  const [declineNote, setDeclineNote] = useState("")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

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

  // Fetch access requests
  const loadAccessRequests = useCallback(() => {
    fetch("http://127.0.0.1:8000/api/ctu_vetmed/medrec_access_requests/")
      .then((res) => res.json())
      .then((data) => {
        const formatted = data.map((req) => ({
          id: req.request_id,
          requestedBy: req.vet_name,
          status: req.status,
          dateRequested: new Date(req.requested_at),
          approvedAt: req.approved_at ? new Date(req.approved_at) : null,
          approvedBy: req.approved_by,
          note: req.note,
          horse: req.horse_name,
          breed: req.horse_breed,
          birthdate: req.horse_birthdate,
        }))

        setAccessRequests(formatted)
      })
      .catch((err) => console.error("Failed to load access requests:", err))
  }, [])

  const closeLogoutModal = () => {
    setIsLogoutModalOpen(false)
  }

const approveRequest = (requestId) => {
  fetch(`http://127.0.0.1:8000/api/ctu_vetmed/access-requests/${requestId}/approve/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.message) {
        alert(data.message);
      }
      console.log("Approved:", data);
      loadAccessRequests();
    })
    .catch((err) => console.error("Approve failed:", err));
};

const handleDecline = (id) => {
  setCurrentRequestId(id)
  setIsDeclineModalOpen(true)
}
 
  const cancelDecline = () => {
    setShowDeclineModal(false)
    setDeclineReason("")
    setSelectedRequestId(null)
  }

  const closeActionModal = () => {
    setIsActionModalOpen(false)
    setCurrentRequestId(null)
    setActionDetails({ title: "", message: "", action: "" })
    setDeclineReason("")
  }

  const confirmAction = () => {
    if (actionDetails.action === "approve" && currentRequestId) {
      console.log(`Approving request: ${currentRequestId}`)
      setAccessRequests((prev) =>
        prev.map((req) => (req.id === currentRequestId ? { ...req, status: "approved" } : req)),
      )
    } else if (actionDetails.action === "decline" && currentRequestId) {
      console.log(`Declining request: ${currentRequestId} with reason: ${declineReason}`)
      setAccessRequests((prev) =>
        prev.map((req) => (req.id === currentRequestId ? { ...req, status: "declined", note: declineReason } : req)),
      )
    }
    closeActionModal()
  }

  const handleSearch = (searchValue) => {
    setSearchTerm(searchValue.toLowerCase())
    setCurrentPage(1) // Reset to first page when searching
  }

  const declineRequest = (requestId) => {
    setCurrentRequestId(requestId)
    setIsDeclineModalOpen(true)
  }

  const closeDeclineModal = () => {
    setIsDeclineModalOpen(false)
    setCurrentRequestId(null)
    setDeclineNote("")
  }

  // Confirm decline
const confirmDeclineModal = async () => {
  if (!declineNote.trim()) {
    alert("Please provide a reason for declining this request.")
    return
  }

  try {
    const response = await fetch(
  `http://127.0.0.1:8000/api/ctu_vetmed/access-requests/${currentRequestId}/decline/`,
  {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note: declineNote.trim() }),
  },
)

    const data = await response.json()
    console.log("Decline response:", response.status, data)

    if (response.ok) {
      alert("Request declined successfully")
      closeDeclineModal()
      loadAccessRequests()
    } else {
      alert("Failed to decline request: " + (data.error || "Unknown error"))
    }
  } catch (err) {
    console.error("Error declining request:", err)
    alert("Error declining request. Check console for details.")
  }
}

  const getFilteredAndSortedRequests = () => {
    let filtered = accessRequests

    // Filter by active tab (status)
    filtered = filtered.filter((request) => request.status === activeTab)

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((request) => {
        switch (filterBy) {
          case "vet":
            return request.requestedBy.toLowerCase().includes(searchTerm)
          case "horse":
            return request.horse.toLowerCase().includes(searchTerm)
          case "date":
            return request.dateRequested.toLocaleDateString().toLowerCase().includes(searchTerm)
          default: // "all"
            return (
              request.requestedBy.toLowerCase().includes(searchTerm) ||
              request.horse.toLowerCase().includes(searchTerm) ||
              request.dateRequested.toLocaleDateString().toLowerCase().includes(searchTerm)
            )
        }
      })
    }

    // Sort by most recent (dateRequested descending)
    return filtered.sort((a, b) => new Date(b.dateRequested) - new Date(a.dateRequested))
  }

  // Get paginated data
  const getPaginatedData = () => {
    const filteredRequests = getFilteredAndSortedRequests()
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredRequests.slice(startIndex, endIndex)
  }

  const getFilterCounts = () => {
    return {
      pending: accessRequests.filter((req) => req.status === "pending").length,
      approved: accessRequests.filter((req) => req.status === "approved").length,
      declined: accessRequests.filter((req) => req.status === "declined").length,
    }
  }

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false)
    setDeleteRequestId(null)
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

      if (isDeclineModalOpen && event.target.classList.contains("modal-overlay")) {
        closeDeclineModal()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isNotificationDropdownOpen, isLogoutModalOpen, isActionModalOpen, isDeleteModalOpen, isDeclineModalOpen])

  const filteredRequests = getFilteredAndSortedRequests()
  const paginatedRequests = getPaginatedData()
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage)
  const filterCounts = getFilterCounts()

  // Pagination handlers
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value))
    setCurrentPage(1) // Reset to first page when changing items per page
  }

  
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

  // Dynamic grid configuration based on active tab
  const getGridConfig = () => {
    switch (activeTab) {
      case "pending":
        return {
          headerGrid: "240px 240px 240px 290px 120px",
          rowGrid: "245px 225px 250px 220px 120px",
        }
      case "approved":
        return {
          headerGrid: "265px 265px 260px 240px 120px",
          rowGrid: "270px 250px 290px 230px 200px",
        }
      case "declined":
        return {
          headerGrid: "265px 265px 260px 240px 120px",
          rowGrid: "269px 249px 280px 230px 300px",
        }
      default:
        return {
          headerGrid: "210px 210px 210px 230px 120px",
          rowGrid: "210px 210px 210px 230px 120px",
        }
    }
  }

  const gridConfig = getGridConfig()

  return (
    <div className="bodyWrapper">
      {/* Internal CSS here */}
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

        .headers .sidebarToggleBtn {
          background: none;
          border: none;
          color: #666;
          font-size: 20px;
          cursor: pointer;
          padding: 8px;
          min-height: 44px;
          min-width: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }

        .headers .sidebarToggleBtn:hover {
          color: #333;
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
          align-items: center;
          justify-content: center;
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
          margin-bottom: 20px;
        }

        .tabs-container {
          display: flex;
          gap: 16px;
          background: #e5e2e2ff;
          padding: 0 8px;
          border-radius: 24px;
          height: 48px;
          width: 370px;
          align-items: center;
          margin-top: 20px;
          margin-bottom: 20px;
        }

        .tab {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 100%;
          padding: 0 12px;
          background: none;
          border: none;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          position: relative;
          border-radius: 24px;
          transition: all 0.2s ease;
        }

        .tab:hover {
          background-color: #ffffff;
          color: #111827;
        }

        .tab.active {
          font-weight: 600;
          background-color: #ffffff;
          color: #111827;
        }

        .tab.active:hover {
          background-color: #ffffff;
          color: #111827;
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
          background-color: #f59e0b;
        }

        .badge-approved {
          background-color: #22c55e;
        }

        .badge-declined {
          background-color: #ef4444;
        }

        .table-headerss {
          background: #f8f9fa;
          display: grid;
          grid-template-columns: ${gridConfig.headerGrid};
          padding: 16px 25px;
          font-weight: 600;
          color: #374151;
          font-size: clamp(12px, 2vw, 14px);
          border-bottom: 1px solid #e5e7eb;
          gap: 10px;
        }

        .table-rows {
          display: grid;
          grid-template-columns: ${gridConfig.rowGrid};
          padding: 16px 25px;
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
  justify-content: center; /* center horizontally */
  align-items: center;     /* align vertically */
  gap: 12px;               /* spacing between buttons */
  flex-wrap: nowrap;       /* prevent buttons from breaking into next line */
        }

        .action-btns {
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: clamp(10px, 1.8vw, 12px);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-block;
        }

        .action-btns.approve-btn {
          background: #22c55e;
          color: white;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btns.approve-btn:hover {
          background: #16a34a;
        }

        .action-btns.decline-btn {
          background: #ef4444;
          color: white;
          display: flex;
          align-items: center;
          gap: 1px;
          padding: 8px 10px;
          border-radius: 6px;
          border: none;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btns.decline-btn:hover {
          background: #dc2626;
        }

        .action-btns.delete-btn {
          background: #fee2e2;
          color: #991b1b;
        }

        .action-btns.delete-btn:hover {
          background: #fecaca;
        }

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

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          padding: 24px;
          border-radius: 8px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
          margin-bottom: 16px;
        }

        .modal-title {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .modal-body {
          margin-bottom: 24px;
        }

        .modal-textarea {
          width: 100%;
          min-height: 100px;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          resize: vertical;
        }

        .modal-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .modal-button {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.2s ease;
        }

        .modal-button-cancel {
          background: #f9fafb;
          color: #374151;
          border-color: #d1d5db;
        }

        .modal-button-cancel:hover {
          background: #f3f4f6;
        }

        .modal-button-confirm {
          background: #dc2626;
          color: white;
        }

        .modal-button-confirm:hover {
          background: #b91c1c;
        }

        .decline-modal {
          background: white;
          border-radius: 8px;
          padding: 24px;
          width: 90%;
          max-width: 500px;
        }

        .decline-modal h3 {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 16px;
        }

        .decline-textarea {
          width: 100%;
          min-height: 100px;
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
          resize: vertical;
          margin-bottom: 20px;
        }

        .decline-buttons {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .decline-btn-modal {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .decline-btn-cancel {
          background: #6b7280;
          color: white;
        }

        .decline-btn-cancel:hover {
          background: #4b5563;
        }

        .decline-btn-confirm {
          background: #ef4444;
          color: white;
        }

        .decline-btn-confirm:hover {
          background: #dc2626;
        }

        .decline-btn-confirm:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .note-cell {
          word-wrap: break-word;
          overflow-wrap: break-word;
          white-space: pre-wrap;
          max-width: 100%;
        }

        /* Pagination Styles */
        .pagination-container {
           display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f9fafb;
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  font-family: sans-serif;
        }

        .pagination-info {
           font-size: 14px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 12px;
        }

        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .items-per-page {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .items-per-page select {
          padding: 6px 10px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          background-color: white;
          font-size: 14px;
        }

        .pagination-buttons {
          display: flex;
          gap: 5px;
        }

        .pagination-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 36px;
          height: 36px;
          padding: 0 8px;
          border: 1px solid #d1d5db;
          background-color: white;
          color: #374151;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pagination-btn:hover:not(:disabled) {
          background-color: #f9fafb;
          border-color: #9ca3af;
        }

        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination-btn.active {
          background-color: #b91c1c;
          color: white;
          border-color: #b91c1c;
        }

        .pagination-nav-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border: 1px solid #d1d5db;
          background-color: white;
          color: #374151;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pagination-nav-btn:hover:not(:disabled) {
          background-color: #f9fafb;
          border-color: #9ca3af;
        }

        .pagination-nav-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>

      <div className="sidebars" id="sidebars" ref={sidebarRef}>
        <Sidebar isOpen={isSidebarsOpen} />
      </div>

      <div className="main-content">
        <header className="headers">
          <h1 style={styles.titleStyle}>Access Request</h1>

          {/* 🔔 Notification Bell */}
          <button style={styles.notificationBtn} onClick={() => setNotifsOpen(!notifsOpen)}>
            <Bell size={24} color="#374151" />
            {notifications.length > 0 && <span style={styles.badge}>{notifications.length}</span>}
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
              <input
                type="text"
                className="search-input"
                placeholder="Search requests..."
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <div className="tabs-container">
              <button
                className={`tab ${activeTab === "pending" ? "active" : ""}`}
                onClick={() => {setActiveTab("pending"); setCurrentPage(1);}}
              >
                Pending <span className="badge badge-pending">{filterCounts.pending}</span>
              </button>
              <button
                className={`tab ${activeTab === "approved" ? "active" : ""}`}
                onClick={() => {setActiveTab("approved"); setCurrentPage(1);}}
              >
                Approved <span className="badge badge-approved">{filterCounts.approved}</span>
              </button>
              <button
                className={`tab ${activeTab === "declined" ? "active" : ""}`}
                onClick={() => {setActiveTab("declined"); setCurrentPage(1);}}
              >
                Declined <span className="badge badge-declined">{filterCounts.declined}</span>
              </button>
            </div>
            <div className="access-table">
              {/* Dynamic Headers based on active tab */}
              <div className="table-headerss">
                <div>Requested By</div>
                <div>Horse</div>
                <div>Status</div>
                <div>Date Requested</div>
                {activeTab === "approved" && <div>Approved By</div>}
                {activeTab === "declined" && <div>Notes</div>}
                {activeTab === "pending" && <div>Actions</div>}
              </div>
              
              {paginatedRequests.length === 0 ? (
                <div className="empty-state">
                  <FileText size={48} />
                  <h3>No access requests</h3>
                  <p>
                    No {activeTab} requests found{searchTerm && ` for "${searchTerm}"`}
                  </p>
                </div>
              ) : (
                paginatedRequests.map((request) => (
                  <div key={request.id} className="table-rows">
                    <div>{request.requestedBy}</div>
                    <div>{request.horse}</div>
                    <div>
                      <span className={`status-badge status-${request.status}`}>{request.status}</span>
                    </div>
                    <div>{request.dateRequested.toLocaleDateString()}</div>
                    {activeTab === "approved" && <div>{request.approvedBy || 'N/A'}</div>}
                    {activeTab === "declined" && (
                      <div className="note-cell">{request.note || 'No note provided'}</div>
                    )}
                    {activeTab === "pending" && (
                      <div className="action-buttons">
                        <button className="action-btns approve-btn" onClick={() => approveRequest(request.id)}>
                          <CheckCircle size={16} className="mr-1" />
                          Approve
                        </button>

                        <button className="action-btns decline-btn flex items-center gap-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition whitespace-nowrap" onClick={() => handleDecline(request.id)}>
                          <XCircle size={16} className="mr-1" />
                          Not Approved
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Pagination Controls */}
              {filteredRequests.length > 0 && (
              <div className="pagination-container">
                <div className="pagination-info">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredRequests.length)} of {filteredRequests.length} results
                </div>
                
                <div className="pagination-controls">
                  <div className="items-per-page">
                    <span>Show:</span>
                    <select value={itemsPerPage} onChange={handleItemsPerPageChange}>
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>
                  </div>
                  
                  <div className="pagination-buttons">
                    <button 
                      className="pagination-nav-btn"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                          onClick={() => goToPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button 
                      className="pagination-nav-btn"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <FloatingMessages />

      {isDeclineModalOpen && (
        <div className="modal-overlay active">
          <div className="decline-modal">
            <h3>Not Approved Request</h3>
            <p>Please provide a reason for declining this request:</p>
            <textarea
              className="decline-textarea"
              placeholder="Enter reason for declining..."
              value={declineNote}
              onChange={(e) => setDeclineNote(e.target.value)}
            />
            <div className="decline-buttons">
              <button className="decline-btn-modal decline-btn-cancel" onClick={closeDeclineModal}>
                Cancel
              </button>
              <button
                className="decline-btn-modal decline-btn-confirm"
                onClick={confirmDeclineModal}
                disabled={!declineNote.trim()}
              >
                Not Approved Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CtuAccessRequest