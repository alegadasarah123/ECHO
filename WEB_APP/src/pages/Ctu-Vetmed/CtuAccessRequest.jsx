"use client"
import Sidebar from "@/components/CtuSidebar"
import {
  AlertTriangle,
  Award,
  Bell,
  Building,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Heart,
  Info,
  Mail,
  Phone,
  RefreshCw,
  Search,
  User,
  X,
  XCircle,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import FloatingMessages from "./CtuMessage"
import NotificationModal from "./CtuNotif"

const API_BASE_URL = "http://localhost:8000/api/ctu_vetmed"

const SkeletonLoader = ({ activeTab }) => {
  const getGridConfig = () => {
    switch (activeTab) {
      case "PENDING":
        return "grid-cols-[1fr_1fr_1fr_1fr_120px]"
      case "APPROVED":
        return "grid-cols-[1fr_1fr_1fr_1fr_120px]"
      case "DECLINED":
        return "grid-cols-[1fr_1fr_1fr_1fr_120px]"
      default:
        return "grid-cols-[1fr_1fr_1fr_1fr_120px]"
    }
  }

  const gridConfig = getGridConfig()

  return (
    <div className="animate-pulse bg-white rounded-lg shadow-sm overflow-hidden">
      <div className={`bg-gray-50 grid ${gridConfig} px-6 py-4 font-semibold text-gray-700 text-sm border-b border-gray-200 gap-4`}>
        <div className="h-4 bg-gray-300 rounded"></div>
        <div className="h-4 bg-gray-300 rounded"></div>
        <div className="h-4 bg-gray-300 rounded"></div>
        <div className="h-4 bg-gray-300 rounded"></div>
        <div className="h-4 bg-gray-300 rounded"></div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`grid ${gridConfig} px-6 py-4 border-b border-gray-100 gap-4 min-h-[60px] items-center`}
        >
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-6 bg-gray-200 rounded-xl w-20"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded w-20"></div>
        </div>
      ))}
    </div>
  )
}

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
  const [activeTab, setActiveTab] = useState("PENDING")
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteRequestId, setDeleteRequestId] = useState(null)

  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [declineReason, setDeclineReason] = useState("")
  const [selectedRequestId, setSelectedRequestId] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterBy, setFilterBy] = useState("all")
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false)
  const [declineNote, setDeclineNote] = useState("")

  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

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

  // ✅ MARK ALL NOTIFICATIONS AS READ
  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/mark_all_notifications_read/`, {
        method: "POST",
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to mark all as read");
      }
      
      const data = await res.json();
      console.log("Mark all as read result:", data);

      // Update frontend state
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
      
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  // ✅ HANDLE INDIVIDUAL NOTIFICATION CLICK
  const handleNotificationClick = async (notification) => {
    // Mark notification as read in frontend immediately for better UX
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notification.id ? { ...notif, read: true } : notif
      )
    );

    // Mark notification as read in backend
    try {
      const res = await fetch(`${API_BASE_URL}/mark_notification_read/${notification.id}/`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      console.log("Mark notification read result:", data);
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }

    // Handle navigation based on notification content
    console.log('Notification clicked:', notification);
    const message = notification.message.toLowerCase();

    if (
      message.includes("new registration") ||
      message.includes("new veterinarian approved") ||
      message.includes("veterinarian approved") ||
      message.includes("veterinarian declined") ||
      message.includes("veterinarian registered")
    ) {
      console.log("Navigating to Account Approval page");
      navigate("/CtuAccountApproval", {
        state: {
          highlightedNotification: notification,
          shouldHighlight: true,
        },
      });
      return;
    }

    if (message.includes("pending medical record access") || message.includes("requested access")) {
      console.log("Already on Access Request page");
      // We're already on the Access Request page, no need to navigate
      return;
    }

    if (message.includes("emergency") || message.includes("sos")) {
      console.log("Navigating to SOS page");
      navigate("/CtuSOS");
      return;
    }

    console.warn("No matching route for notification:", notification);
  };

  // ✅ Handle notifications update from modal
  const handleNotificationsUpdate = (updatedNotifications) => {
    console.log("Notifications updated from modal:", updatedNotifications);
    console.log("New unread count:", updatedNotifications.filter(n => !n.read).length);
    setNotifications(updatedNotifications);
  };

  // ✅ Fetch notifications from backend
  const loadNotifications = useCallback(() => {
    console.log("Loading notifications...")

    fetch("http://127.0.0.1:8000/api/ctu_vetmed/get_vetnotifications/")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch notifications")
        return res.json()
      })
      .then((data) => {
        console.log("Raw notifications data:", data);
        const formatted = data.map((notif) => ({
          id: notif.id,
          message: notif.message,
          date: notif.date || new Date().toISOString(),
          read: notif.read || false,
          type: notif.type || "general"
        }))
        console.log("Formatted notifications:", formatted);
        console.log("Unread count:", formatted.filter(n => !n.read).length);
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
    setIsLoading(true)
    fetch("http://127.0.0.1:8000/api/ctu_vetmed/medrec_access_requests/")
      .then((res) => res.json())
      .then((data) => {
        const formatted = data.map((req) => ({
          id: req.request_id,
          requestedBy: req.vet_name,
          status: req.status.toUpperCase(),
          dateRequested: new Date(req.requested_at),
          approvedAt: req.approved_at ? new Date(req.approved_at) : null,
          approvedBy: req.approved_by,
          note: req.note,
          horse: req.horse_name,
          breed: req.horse_breed,
          birthdate: req.horse_dob,
          vetEmail: req.vet_email ,
          vetPhone: req.vet_phone_num|| "+1 (555) 123-4567",
          vetLicense: req.vet_license_num|| "VET-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
          vetClinic: req.vet_specialization,
        }))

        setAccessRequests(formatted)
        setIsLoading(false)
      })
      .catch((err) => {
        console.error("Failed to load access requests:", err)
        setIsLoading(false)
      })
  }, [])

  // Manual refresh function
  const handleManualRefresh = async () => {
    setIsLoading(true)
    try {
      await loadAccessRequests()
      await loadNotifications()
    } catch (error) {
      console.error("Failed to refresh data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const closeLogoutModal = () => {
    setIsLogoutModalOpen(false)
  }

  const approveRequest = async (requestId) => {
  try {
    const res = await fetch(
      `http://127.0.0.1:8000/api/ctu_vetmed/access-requests/${requestId}/approve/`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("Approve failed:", data.error || "Unknown error");
      alert("Failed to approve request: " + (data.error || "Unknown error"));
      return;
    }

    if (data.message) {
      alert(data.message);
    }

    console.log("Approved:", data);
    loadAccessRequests();
    setIsViewModalOpen(false);

  } catch (err) {
    console.error("Approve failed:", err);
    alert("Approve request failed. Check console for details.");
  }
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
        prev.map((req) => (req.id === currentRequestId ? { ...req, status: "APPROVED" } : req)),
      )
    } else if (actionDetails.action === "decline" && currentRequestId) {
      console.log(`Declining request: ${currentRequestId} with reason: ${declineReason}`)
      setAccessRequests((prev) =>
        prev.map((req) => (req.id === currentRequestId ? { ...req, status: "DECLINED", note: declineReason } : req)),
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

  const openViewModal = (request) => {
    setSelectedRequest(request)
    setIsViewModalOpen(true)
  }

  const closeViewModal = () => {
    setIsViewModalOpen(false)
    setSelectedRequest(null)
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
        setIsViewModalOpen(false)
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

    filtered = filtered.filter((request) => {
      if (activeTab === "APPROVED") {
        return request.status === "APPROVED"
      }
      if (activeTab === "DECLINED") {
        return request.status === "DECLINED"
      }
      return request.status === "PENDING"
    })

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
      pending: accessRequests.filter((req) => req.status === "PENDING").length,
      approved: accessRequests.filter((req) => req.status === "APPROVED").length,
      declined: accessRequests.filter((req) => req.status === "DECLINED").length,
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

      if (isViewModalOpen && event.target.classList.contains("modal-overlay")) {
        closeViewModal()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [
    isNotificationDropdownOpen,
    isLogoutModalOpen,
    isActionModalOpen,
    isDeleteModalOpen,
    isDeclineModalOpen,
    isViewModalOpen,
  ])

  const filteredRequests = getFilteredAndSortedRequests()
  const paginatedRequests = getPaginatedData()
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage)
  const filterCounts = getFilterCounts()

  // Calculate unread notifications count
  const unreadNotificationsCount = notifications.filter(notif => !notif.read).length

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

  // Simplified grid configuration - same for all tabs
  const getGridConfig = () => {
    return "grid-cols-[1fr_1fr_1fr_1fr_120px] gap-4"
  }

  const gridConfig = getGridConfig()

  return (
    <div className="font-sans bg-gray-100 flex h-screen overflow-x-hidden w-full">
      <div className="sidebars" id="sidebars" ref={sidebarRef}>
        <Sidebar isOpen={isSidebarsOpen} />
      </div>

      <div className="flex-1 flex flex-col w-full lg:w-[calc(100%-250px)]">
        <header className="flex items-center bg-white p-5 border-b border-gray-200 shadow-md sticky top-0 z-10 justify-between">
          {/* ADDED HEADER SECTION */}
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-[#b91c1c]">Access Request</h2>
            <p className="text-sm text-gray-600 mt-1 font-normal">
              Overview of medical record access requests and approvals
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Manual Refresh Icon */}
            <button
              onClick={handleManualRefresh}
              disabled={isLoading}
              className="relative bg-transparent border-none cursor-pointer p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh Data"
            >
              <RefreshCw 
                size={24} 
                color="#374151" 
                className={isLoading ? "animate-spin" : ""} 
              />
            </button>

            {/* 🔔 Notification Bell */}
            <button
              ref={notificationBellRef}
              className="relative bg-transparent border-none cursor-pointer p-2 rounded-full hover:bg-gray-100 transition-colors"
              onClick={() => setNotifsOpen(!notifsOpen)}
            >
              <Bell size={24} color="#374151" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold min-w-[20px]">
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              )}
            </button>
          </div>

          {/* 📩 Notification Modal */}
          <NotificationModal
            isOpen={notifsOpen}
            onClose={() => setNotifsOpen(false)}
            notifications={notifications}
            onNotificationClick={handleNotificationClick}
            onMarkAllAsRead={handleMarkAllAsRead}
            onNotificationsUpdate={handleNotificationsUpdate}
          />
        </header>

        <div className="flex-1 p-6 bg-gray-100 overflow-y-auto">
          <div className="mb-6">
            <div className="flex-1 max-w-md mb-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-3 border-2 border-white rounded-lg text-sm outline-none bg-white"
                placeholder="Search requests..."
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>

            <div className="flex gap-2 bg-gray-300 p-2 rounded-3xl h-14 w-fit items-center mb-5">
              <button
                className={`flex items-center justify-center gap-2 h-full px-5 py-2 bg-none border-none text-sm font-medium text-gray-700 cursor-pointer rounded-3xl transition-all duration-200 min-w-[120px] ${
                  activeTab === "PENDING"
                    ? "font-semibold bg-white text-gray-900 shadow-sm"
                    : "hover:bg-white/70 hover:text-gray-900"
                }`}
                onClick={() => {
                  setActiveTab("PENDING")
                  setCurrentPage(1)
                }}
              >
                Pending{" "}
                <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-semibold text-white bg-yellow-500">
                  {filterCounts.pending}
                </span>
              </button>
              <button
                className={`flex items-center justify-center gap-2 h-full px-5 py-2 bg-none border-none text-sm font-medium text-gray-700 cursor-pointer rounded-3xl transition-all duration-200 min-w-[120px] ${
                  activeTab === "APPROVED"
                    ? "font-semibold bg-white text-gray-900 shadow-sm"
                    : "hover:bg-white/70 hover:text-gray-900"
                }`}
                onClick={() => {
                  setActiveTab("APPROVED")
                  setCurrentPage(1)
                }}
              >
                Approved{" "}
                <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-semibold text-white bg-green-500">
                  {filterCounts.approved}
                </span>
              </button>
              <button
                className={`flex items-center justify-center gap-2 h-full px-5 py-2 bg-none border-none text-sm font-medium text-gray-700 cursor-pointer rounded-3xl transition-all duration-200 min-w-[120px] ${
                  activeTab === "DECLINED"
                    ? "font-semibold bg-white text-gray-900 shadow-sm"
                    : "hover:bg-white/70 hover:text-gray-900"
                }`}
                onClick={() => {
                  setActiveTab("DECLINED")
                  setCurrentPage(1)
                }}
              >
                Declined{" "}
                <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-semibold text-white bg-red-500">
                  {filterCounts.declined}
                </span>
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {isLoading ? (
                <SkeletonLoader activeTab={activeTab} />
              ) : (
                <>
                  {/* Table Headers */}
                  <div className={`bg-gray-50 grid ${gridConfig} px-6 py-4 font-semibold text-gray-700 text-sm border-b border-gray-200`}>
                    <div>Requested By</div>
                    <div>Horse</div>
                    <div>Status</div>
                    <div>Date Requested</div>
                    <div className="text-center">Actions</div>
                  </div>

                  {paginatedRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center p-8">
                      <FileText size={48} className="mb-4 opacity-50" />
                      <h3 className="text-lg mb-2 text-gray-700">No access requests</h3>
                      <p className="text-sm text-gray-500">
                        No {activeTab.toLowerCase()} requests found{searchTerm && ` for "${searchTerm}"`}
                      </p>
                    </div>
                  ) : (
                    <>
                      {paginatedRequests.map((request) => (
                        <div
                          key={request.id}
                          className={`grid ${gridConfig} px-6 py-4 border-b border-gray-100 transition-colors items-center min-h-[60px] hover:bg-gray-50`}
                        >
                          <div className="font-medium text-gray-900">{request.requestedBy}</div>
                          <div className="text-gray-700">{request.horse}</div>
                          <div>
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                                request.status === "PENDING"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : request.status === "APPROVED"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                              }`}
                            >
                              {request.status}
                            </span>
                          </div>
                          <div className="text-gray-600 text-sm">{request.dateRequested.toLocaleDateString()}</div>
                          <div className="flex justify-center">
                            <button
                              className="inline-flex items-center justify-center gap-1 bg-transparent text-blue-700 border border-blue-700 py-1.5 px-3 rounded text-xs font-medium cursor-pointer transition-all hover:bg-blue-100 min-h-[32px]"
                              onClick={() => openViewModal(request)}
                            >
                              <Eye size={14} />
                              View
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {/* Pagination as the last row of the table */}
                      {filteredRequests.length > 0 && (
                        <div className="flex justify-between items-center bg-gray-50 px-6 py-4 border-t border-gray-200">
                          <div className="text-sm text-gray-600 flex items-center gap-3">
                            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                            {Math.min(currentPage * itemsPerPage, filteredRequests.length)} of {filteredRequests.length} results
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">Show:</span>
                              <select
                                value={itemsPerPage}
                                onChange={handleItemsPerPageChange}
                                className="px-3 py-2 border border-gray-300 rounded bg-white text-sm"
                              >
                                <option value="5">5</option>
                                <option value="10">10</option>
                                <option value="20">20</option>
                                <option value="50">50</option>
                              </select>
                            </div>

                            <div className="flex gap-2">
                              <button
                                className="flex items-center justify-center w-10 h-10 border border-gray-300 bg-white text-gray-700 rounded-md cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                              >
                                <ChevronLeft size={16} />
                              </button>

                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum
                                if (totalPages <= 5) {
                                  pageNum = i + 1
                                } else if (currentPage <= 3) {
                                  pageNum = i + 1
                                } else if (currentPage >= totalPages - 2) {
                                  pageNum = totalPages - 4 + i
                                } else {
                                  pageNum = currentPage - 2 + i
                                }

                                return (
                                  <button
                                    key={pageNum}
                                    className={`flex items-center justify-center min-w-[40px] h-10 px-3 border border-gray-300 rounded-md text-sm cursor-pointer transition-all duration-200 ${
                                      currentPage === pageNum
                                        ? "bg-red-700 text-white border-red-700"
                                        : "bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                                    }`}
                                    onClick={() => goToPage(pageNum)}
                                  >
                                    {pageNum}
                                  </button>
                                )
                              })}

                              <button
                                className="flex items-center justify-center w-10 h-10 border border-gray-300 bg-white text-gray-700 rounded-md cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                              >
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <FloatingMessages />

      {isViewModalOpen && selectedRequest && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-[1000] modal-overlay">
          <div className="bg-white rounded-lg w-[90%] max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            {/* Modal Header with Close Button */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Request Details</h3>
              <button onClick={closeViewModal} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Horse Details Section */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Heart size={20} className="text-amber-600" />
                  Horse Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Horse Name</label>
                    <p className="text-gray-900 font-medium">{selectedRequest.horse}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Breed</label>
                    <p className="text-gray-900">{selectedRequest.breed || "Not specified"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Birth Date</label>
                    <p className="text-gray-900">{selectedRequest.birthdate || "Not specified"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        selectedRequest.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-800"
                          : selectedRequest.status === "APPROVED"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {selectedRequest.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Veterinarian Details Section */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <User size={20} className="text-blue-600" />
                  Veterinarian Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
                      <User size={14} />
                      Name
                    </label>
                    <p className="text-gray-900 font-medium">{selectedRequest.requestedBy}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
                      <Mail size={14} />
                      Email
                    </label>
                    <p className="text-gray-900">{selectedRequest.vetEmail}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
                      <Phone size={14} />
                      Phone
                    </label>
                    <p className="text-gray-900">{selectedRequest.vetPhone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
                      <Award size={14} />
                      License Number
                    </label>
                    <p className="text-gray-900">{selectedRequest.vetLicense}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
                      <Building size={14} />
                      Specialization
                    </label>
                    <p className="text-gray-900">{selectedRequest.vetClinic}</p>
                  </div>
                </div>
              </div>

              {/* Request Information */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FileText size={20} className="text-green-600" />
                  Request Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-green-50 p-4 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
                      <Calendar size={14} />
                      Date Requested
                    </label>
                    <p className="text-gray-900">{selectedRequest.dateRequested.toLocaleDateString()}</p>
                  </div>
                  {selectedRequest.approvedAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
                        <Calendar size={14} />
                        Date Approved
                      </label>
                    <p className="text-gray-900">{selectedRequest.approvedAt.toLocaleDateString()}</p>
                    </div>
                  )}
                  {selectedRequest.approvedBy && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
                        <User size={14} />
                        Approved By
                      </label>
                      <p className="text-gray-900">{selectedRequest.approvedBy}</p>
                    </div>
                  )}
                  {selectedRequest.note && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Notes</label>
                      <p className="text-gray-900 bg-white p-3 rounded border">{selectedRequest.note}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer with Action Buttons (only for pending requests) */}
            {selectedRequest.status === "PENDING" && (
              <div className="flex gap-3 justify-end p-6 border-t border-gray-200 bg-gray-50">
                <button
                  className="px-6 py-2.5 border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-200 bg-green-500 text-white flex items-center gap-2 hover:bg-green-600"
                  onClick={() => approveRequest(selectedRequest.id)}
                >
                  <CheckCircle size={16} />
                  Approve
                </button>
                <button
                  className="px-6 py-2.5 border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-200 bg-red-500 text-white flex items-center gap-2 hover:bg-red-600"
                  onClick={() => handleDecline(selectedRequest.id)}
                >
                  <XCircle size={16} />
                  Not Approved
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isDeclineModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-[1000] modal-overlay">
          <div className="bg-white rounded-lg p-6 w-[90%] max-w-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Not Approved Request</h3>
            <p className="mb-4 text-gray-700">Please provide a reason for not approving this request:</p>
            <textarea
              className="w-full min-h-[100px] p-3 border-2 border-gray-200 rounded-md text-sm resize-y mb-5 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
              placeholder="Enter reason for not approving..."
              value={declineNote}
              onChange={(e) => setDeclineNote(e.target.value)}
            />
            <div className="flex gap-3 justify-end">
              <button
                className="px-5 py-2.5 border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-200 bg-gray-600 text-white hover:bg-gray-500"
                onClick={closeDeclineModal}
              >
                Cancel
              </button>
              <button
                className="px-5 py-2.5 border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-200 bg-red-500 text-white hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                onClick={confirmDeclineModal}
                disabled={!declineNote.trim()}
              >
                Not Approved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CtuAccessRequest