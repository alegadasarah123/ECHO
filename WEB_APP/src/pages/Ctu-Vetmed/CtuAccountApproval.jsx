"use client"
import Sidebar from "@/components/CtuSidebar"
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Eye,
  FileText,
  Info,
  MapPin,
  RefreshCw,
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
import FloatingMessages from "./CtuMessage"
import NotificationModal from "./CtuNotif"

const API_BASE = "http://localhost:8000/api/ctu_vetmed"

const SkeletonLoader = () => (
  <div className="animate-pulse">
    <div className="flex items-center p-4 border-b border-gray-100">
      <div className="w-10 h-10 rounded-full bg-gray-300 mr-4 flex-shrink-0"></div>
      <div className="flex-1 min-w-0">
        <div className="h-4 bg-gray-300 rounded mb-2 w-3/4"></div>
        <div className="h-3 bg-gray-300 rounded mb-1 w-1/2"></div>
        <div className="h-3 bg-gray-300 rounded w-2/3"></div>
      </div>
      <div className="flex gap-2 ml-4">
        <div className="h-8 w-16 bg-gray-300 rounded"></div>
      </div>
    </div>
  </div>
)

function CtuAccountApproval() {
  const navigate = useNavigate()

  const [registrationData, setRegistrationData] = useState([])
  const [message, setMessage] = useState("")
  const [vetProfiles, setVetProfiles] = useState([])

  const [activeTab, setActiveTab] = useState("pending")
  const [recentFilter, setRecentFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false)

  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCounts, setIsLoadingCounts] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false) // NEW: Loading state for approve/decline actions
  const [loadingActionId, setLoadingActionId] = useState(null) // NEW: Track which action is loading

  const [notifications, setNotifications] = useState([])
  const [notifsOpen, setNotifsOpen] = useState(false)

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

  const [declineReason, setDeclineReason] = useState("")

  // NEW: State for full view profile photo
  const [isProfilePhotoFullView, setIsProfilePhotoFullView] = useState(false)
  const [selectedProfilePhoto, setSelectedProfilePhoto] = useState("")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // State for managing pinned posts
  const [pinnedPosts, setPinnedPosts] = useState(new Set())
  const [showDropdown, setShowDropdown] = useState({})
  const [posts, setPosts] = useState([])

  // Helper to format status display
  const formatStatusDisplay = (status) => {
    if (!status) return "";
    if (status === "declined") return "Not approved";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

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

  const [counts, setCounts] = useState({
    pending: 0,
    approved: 0,
    declined: 0,
  })

  // ✅ Refresh counts function
  const fetchCounts = async () => {
    setIsLoadingCounts(true)
    try {
      const response = await fetch("http://localhost:8000/api/ctu_vetmed/get-account-counts/")
      if (!response.ok) throw new Error("Failed to fetch data")
      const result = await response.json()
      setCounts(result.data || result)
    } catch (error) {
      console.error("Error fetching counts:", error)
    } finally {
      setIsLoadingCounts(false)
    }
  }

  useEffect(() => {
    fetchCounts()
  }, [])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm) {
        setIsSearching(true)
        setTimeout(() => {
          const filtered = registrationData.filter(
            (user) =>
              user.vet_fname.toLowerCase().includes(searchTerm.toLowerCase()) ||
              user.vet_lname.toLowerCase().includes(searchTerm.toLowerCase()) ||
              user.vet_email.toLowerCase().includes(searchTerm.toLowerCase()),
          )
          setSearchResults(filtered)
          setIsSearching(false)
        }, 300)
      } else {
        setSearchResults([])
        setIsSearching(false)
      }
    }, 500)

    return () => clearTimeout(debounceTimer)
  }, [searchTerm, registrationData])

  const filterRegistrations = useCallback(() => {
    let filtered = registrationData

    filtered = filtered.filter((user) => user.users?.status === activeTab)

    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.vet_fname.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.vet_lname.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.vet_email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    return filtered
  }, [registrationData, activeTab, searchTerm])

  // Get paginated data
  const getPaginatedData = () => {
    const filteredRegistrations = filterRegistrations()
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredRegistrations.slice(startIndex, endIndex)
  }

  const viewDetails = (vetId, status) => {
    const user = registrationData.find((u) => u.vet_id === vetId)
    if (user) {
      setSelectedUser({ ...user, status })
      setIsViewDetailsModalOpen(true)
      setModalActiveTab("personal")
    } else {
      console.log("User data not found")
    }
  }

  // NEW: Function to open profile photo in full view
  const openProfilePhotoFullView = (profilePhoto, userName) => {
    setSelectedProfilePhoto({
      url: profilePhoto,
      name: userName
    })
    setIsProfilePhotoFullView(true)
  }

  // NEW: Function to close profile photo full view
  const closeProfilePhotoFullView = () => {
    setIsProfilePhotoFullView(false)
    setSelectedProfilePhoto("")
  }

  const closeModal = () => {
    setIsViewDetailsModalOpen(false)
    setSelectedUser(null)
  }

  const showApproveConfirmation = (vetId) => {
    setSelectedUser({ vet_id: vetId })
    setConfirmationDetails({
      title: "Confirm Approval",
      message: "Are you sure you want to approve this registration?",
      action: "approve",
    })
    setIsConfirmationModalOpen(true)
  }

  const showDeclineConfirmation = (vetId) => {
    setSelectedUser({ vet_id: vetId })
    setConfirmationDetails({
      title: "Confirm Not Approved",
      message: "Are you sure you want to mark this registration as not approved?",
      action: "decline",
    })
    setIsConfirmationModalOpen(true)
  }

  const showApproveConfirmationFromModal = () => {
    if (selectedUser && selectedUser.status === "pending") {
      closeModal()
      showApproveConfirmation(selectedUser.vet_id)
    }
  }

  const showDeclineConfirmationFromModal = () => {
    if (selectedUser && selectedUser.status === "pending") {
      closeModal()
      showDeclineConfirmation(selectedUser.vet_id)
    }
  }

  const closeConfirmation = () => {
    setIsConfirmationModalOpen(false)
    setSelectedUser(null)
    setConfirmationDetails({ title: "", message: "", action: "" })
    setDeclineReason("") // Reset decline reason when closing
  }

  const confirmAction = () => {
    if (confirmationDetails.action === "approve" && selectedUser) {
      approveUser(selectedUser.vet_id)
    } else if (confirmationDetails.action === "decline" && selectedUser) {
      declineUser(selectedUser.vet_id)
    }
  }

  // -------------------- UPDATED: Approve a single user with loading state --------------------
  const approveUser = async (vetId) => {
    setIsActionLoading(true)
    setLoadingActionId(vetId)
    
    try {
      // Optimistically update the UI first
      setRegistrationData((prev) => 
        prev.map((u) => 
          u.vet_id === vetId ? { ...u, users: { ...u.users, status: "approved" } } : u
        )
      )
      setMessage(`Approving user ${vetId}...`)

      const response = await fetch(`http://localhost:8000/api/ctu_vetmed/update-vet-status/${vetId}/`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Failed to approve user: ${text}`)
      }

      const data = await response.json()
      setMessage(`User ${vetId} approved successfully!`)
      
      // Refresh data after approval
      await handleManualRefresh()
      await fetchCounts()
      
      console.log("User approved:", data)
    } catch (err) {
      console.error(err)
      // Rollback UI if failed
      setRegistrationData((prev) => 
        prev.map((u) => 
          u.vet_id === vetId ? { ...u, users: { ...u.users, status: "pending" } } : u
        )
      )
      setMessage(`Error: ${err.message}`)
    } finally {
      setIsActionLoading(false)
      setLoadingActionId(null)
      closeConfirmation()
    }
  }

  // -------------------- UPDATED: Decline a single user with loading state --------------------
  const declineUser = async (vetId) => {
    if (!declineReason) {
      setMessage("Please enter a reason for marking as not approved.")
      return
    }

    setIsActionLoading(true)
    setLoadingActionId(vetId)

    try {
      setRegistrationData((prev) => 
        prev.map((u) => 
          u.vet_id === vetId ? { ...u, users: { ...u.users, status: "declined" } } : u
        )
      )
      setMessage(`Marking user ${vetId} as not approved...`)

      const response = await fetch(`http://localhost:8000/api/ctu_vetmed/update-vet-status/${vetId}/`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "declined", decline_reason: declineReason }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Failed to mark user as not approved: ${text}`)
      }

      const data = await response.json()
      setMessage(`User ${vetId} marked as not approved successfully!`)
      
      // Refresh data after decline
      await handleManualRefresh()
      await fetchCounts()
      
      console.log("User marked as not approved:", data)
    } catch (err) {
      console.error(err)
      setRegistrationData((prev) => 
        prev.map((u) => 
          u.vet_id === vetId ? { ...u, users: { ...u.users, status: "pending" } } : u
        )
      )
      setMessage(`Error: ${err.message}`)
    } finally {
      setIsActionLoading(false)
      setLoadingActionId(null)
      setDeclineReason("")
      closeConfirmation()
    }
  }

  const handleSearchInput = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
    if (e.target.value) {
      setIsSearching(true)
    }
  }

  const handleRecentFilterChange = (e) => {
    setRecentFilter(e.target.value)
  }

  const closeLogoutModal = () => {
    setIsLogoutModalOpen(false)
  }

  const loadStats = useCallback(() => {
    console.log("Loading stats...")
  }, [])

  const loadRecentActivities = useCallback(() => {
    console.log("Loading recent activities...")
  }, [])

  // ✅ Fetch notifications from backend
  const loadNotifications = useCallback(() => {
    console.log("Loading notifications...")

    fetch("http://localhost:8000/api/ctu_vetmed/get_vetnotifications/")
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

  // ✅ MARK ALL NOTIFICATIONS AS READ
  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch(`http://localhost:8000/mark_all_notifications_read/`, {
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

      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
      
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  
 // HANDLE INDIVIDUAL NOTIFICATION CLICK
const handleNotificationClick = async (notification) => {
  const notifId = notification?.notif_id || notification?.id; // fallback support

  if (!notifId) {
    console.warn("Notification ID is missing:", notification);
  }

  // Mark as read in frontend immediately
  setNotifications((prev) =>
    prev.map((notif) =>
      notif.notif_id === notifId || notif.id === notifId
        ? { ...notif, read: true }
        : notif
    )
  );

  // Mark as read in backend (only if valid ID)
  if (notifId) {
    try {
      await fetch(`${API_BASE}/mark_notification_read/${notifId}/`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  }

  const message = (notification.message || "").toLowerCase();
  const type = (notification.type || "").toLowerCase();

  // Navigate for SOS emergency notifications
  if (
    type === "sos_emergency" ||
    message.includes("sos") ||
    message.includes("emergency") ||
    message.includes("reported") ||
    message.includes("urgent") ||
    (message.includes("horse") && 
     (message.includes("colic") || 
      message.includes("injured") || 
      message.includes("trauma")))
  ) {
    // Extract SOS ID from related_id if available
    let sosId = null;
    if (notification.related_id && notification.related_id.startsWith("sos_")) {
      sosId = notification.related_id.replace("sos_", "");
    }
    
    navigate("/CtuDashboard", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
        sosId: sosId, // Pass the specific SOS ID if available
      },
    });
    return;
  }

  // Navigate for account-related notifications
  if (
    message.includes("new registration") ||
    message.includes("new veterinarian approved") ||
    message.includes("veterinarian approved") ||
    message.includes("veterinarian declined") ||
    message.includes("veterinarian registered") ||
    message.includes("veterinarian pending")
  ) {
    navigate("/CtuAccountApproval", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
      },
    });
    return;
  }

  if (
    message.includes("pending medical record access") ||
    message.includes("requested access")
  ) {
    navigate("/CtuDashboard", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
      },
    });
    return;
  }

  // Only navigate to CtuAnnouncement for comment-related notifications
  if (message.includes("comment")) {
    navigate("/CtuAnnouncement", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
      },
    });
    return;
  }

  // Default fallback - stay on current page
  console.log("Notification clicked but no specific action:", notification);
};

  // ✅ Handle notifications update from modal
  const handleNotificationsUpdate = (updatedNotifications) => {
    console.log("Notifications updated from modal:", updatedNotifications);
    console.log("New unread count:", updatedNotifications.filter(n => !n.read).length);
    setNotifications(updatedNotifications);
  };

  // ✅ Auto-refresh notifications every 60s
  useEffect(() => {
    loadNotifications()

    const interval = setInterval(() => {
      loadNotifications()
    }, 60000)

    return () => clearInterval(interval)
  }, [loadNotifications])

  const loadDashboardData = useCallback(() => {
    loadStats()
    loadRecentActivities()
    loadNotifications()
  }, [loadStats, loadRecentActivities, loadNotifications])

  // Manual refresh function - UPDATED to be more robust
  const handleManualRefresh = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("http://localhost:8000/api/ctu_vetmed/get-vet-profiles/")
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      
      const result = await response.json()
      const data = result.data || []
      
      const processedData = data.map((item) => {
        let statusValue = item.status
        if (!statusValue && item.users && item.users.status) {
          statusValue = item.users.status
        }

        return {
          ...item,
          status: statusValue || "pending",
          type: item.type || "Veterinarian",
        }
      })

      setRegistrationData(processedData)
    } catch (error) {
      console.error("Failed to refresh data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()

    const loadVetProfiles = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("http://localhost:8000/api/ctu_vetmed/get-vet-profiles/", {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        console.log("Fetched vet profiles response:", result)

        const data = result.data || []
        console.log("Extracted vet profiles data:", data)

        const processedData = data.map((item, index) => {
          let statusValue = item.status
          if (!statusValue && item.users && item.users.status) {
            statusValue = item.users.status
          }

          return {
            ...item,
            status: statusValue || "pending",
            type: item.type || "Veterinarian",
          }
        })

        processedData.forEach((item, index) => {
          console.log(`[Processed Item ${index}]`, {
            id: item.vet_id,
            name: `${item.vet_fname} ${item.vet_lname}`,
            status: item.status,
            type: item.type,
            allFields: Object.keys(item),
          })
        })

        setRegistrationData(processedData)
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Failed to fetch vet profiles:", error)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadVetProfiles()

    return () => {
      controller.abort()
    }
  }, [])

  // Effects
  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

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
      if (
        isViewDetailsModalOpen &&
        viewDetailsModalOverlayRef.current &&
        event.target === viewDetailsModalOverlayRef.current
      ) {
        closeModal()
      }
      if (
        isConfirmationModalOpen &&
        confirmationOverlayRef.current &&
        event.target === confirmationOverlayRef.current
      ) {
        closeConfirmation()
      }
      if (
        isProfilePhotoFullView &&
        event.target.classList.contains('profile-photo-overlay')
      ) {
        closeProfilePhotoFullView()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isNotificationDropdownOpen, isViewDetailsModalOpen, isConfirmationModalOpen, isProfilePhotoFullView])

  const filteredRegistrations = filterRegistrations()
  const paginatedRegistrations = getPaginatedData()
  const totalPages = Math.ceil(filteredRegistrations.length / itemsPerPage)

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
    setCurrentPage(1)
  }

  const togglePin = (postId) => {
    setPinnedPosts((prev) => {
      const updated = new Set(prev)
      updated.add(postId)
      return updated
    })

    setShowDropdown((prev) => ({ ...prev, [postId]: false }))

    setPosts((prev) => {
      const pinned = []
      const unpinned = []

      prev.forEach((post) => {
        if (post.id === postId || pinnedPosts.has(post.id)) {
          pinned.push(post)
        } else {
          unpinned.push(post)
        }
      })

      return [
        ...pinned.sort((a, b) => b.timestamp - a.timestamp),
        ...unpinned.sort((a, b) => b.timestamp - a.timestamp),
      ]
    })
  }

  const handleTabChange = (tabName) => {
    setActiveTab(tabName)
    setCurrentPage(1)
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
    }, 500)
  }

  // Function to parse documents array from string
  const parseDocuments = (documents) => {
    if (!documents) return [];
    try {
      if (typeof documents === 'string') {
        return JSON.parse(documents);
      }
      return documents;
    } catch (error) {
      console.error('Error parsing documents:', error);
      return [];
    }
  };

  return (
    <div className="font-sans bg-gray-100 flex h-screen overflow-x-hidden w-full">
      <div className="sidebars" id="sidebasr">
        <Sidebar isOpen={isSidebarsOpen} />
      </div>

      <div className="flex-1 flex flex-col">
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 px-6 py-4 flex items-center justify-between">
          <div className="flex flex-col ">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Account Approval</h2>
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
            <div className="flex-1 max-w-md mr-5 relative min-w-[200px] mb-2.5">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                className="w-full py-2 px-4 pl-10 border-2 border-white rounded-lg text-sm outline-none min-h-[50px] bg-white"
                placeholder={isSearching ? "Searching..." : "Search by name or email..."}
                onChange={handleSearchInput}
                value={searchTerm}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                </div>
              )}
            </div>

            <div className="flex gap-2 bg-gray-300 p-2 rounded-3xl h-14 w-fit items-center mb-5">
              {/* Pending Tab */}
              <button
                className={`flex items-center justify-center gap-2 h-full px-5 py-2 bg-none border-none text-sm font-medium text-gray-700 cursor-pointer rounded-3xl transition-all duration-200 min-w-[120px] ${
                  activeTab === "pending"
                    ? "bg-white text-gray-900 font-semibold shadow-sm"
                    : "hover:bg-white hover:text-gray-900"
                }`}
                onClick={() => handleTabChange("pending")}
              >
                Pending{" "}
                {isLoadingCounts ? (
                  <div className="animate-pulse bg-gray-300 rounded-full w-6 h-6"></div>
                ) : (
                  <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-semibold text-white bg-yellow-500">
                    {counts.pending}
                  </span>
                )}
              </button>

              {/* Approved Tab */}
              <button
                className={`flex items-center justify-center gap-2 h-full px-5 py-2 bg-none border-none text-sm font-medium text-gray-700 cursor-pointer rounded-3xl transition-all duration-200 min-w-[120px] ${
                  activeTab === "approved"
                    ? "bg-white text-gray-900 font-semibold shadow-sm"
                    : "hover:bg-white hover:text-gray-900"
                }`}
                onClick={() => handleTabChange("approved")}
              >
                Approved{" "}
                {isLoadingCounts ? (
                  <div className="animate-pulse bg-gray-300 rounded-full w-6 h-6"></div>
                ) : (
                  <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-semibold text-white bg-green-500">
                    {counts.approved}
                  </span>
                )}
              </button>

              {/* Not Approved Tab */}
              <button
                className={`flex items-center justify-center gap-2 h-full px-5 py-2 bg-none border-none text-sm font-medium text-gray-700 cursor-pointer rounded-3xl transition-all duration-200 min-w-[120px] ${
                  activeTab === "declined"
                    ? "bg-white text-gray-900 font-semibold shadow-sm"
                    : "hover:bg-white hover:text-gray-900"
                }`}
                onClick={() => handleTabChange("declined")}
              >
                Not approved{" "}
                {isLoadingCounts ? (
                  <div className="animate-pulse bg-gray-300 rounded-full w-6 h-6"></div>
                ) : (
                  <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-semibold text-white bg-red-500">
                    {counts.declined}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {isLoading ? (
              <div>
                {[...Array(5)].map((_, index) => (
                  <SkeletonLoader key={index} />
                ))}
              </div>
            ) : filteredRegistrations.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-8">
                {activeTab === "pending" ? (
                  <Clock size={48} className="mb-4 opacity-50" />
                ) : activeTab === "approved" ? (
                  <UserCheck size={48} className="mb-4 opacity-50" />
                ) : (
                  <UserX size={48} className="mb-4 opacity-50" />
                )}
                <h3 className="text-lg mb-2 text-gray-700">
                  No {formatStatusDisplay(activeTab)} registrations
                </h3>
                <p className="text-sm text-gray-500">
                  {activeTab === "pending"
                    ? "New registration requests will appear here"
                    : `${formatStatusDisplay(activeTab)} registrations will appear here`}
                </p>
              </div>
            ) : (
              <>
                {paginatedRegistrations.map((user) => (
                  <div
                    key={user.vet_id}
                    className="flex items-center p-4 border-b border-gray-100 transition-colors duration-200 min-h-[80px] overflow-y-auto hover:bg-gray-50 last:border-b-0"
                  >
                    {/* Profile Photo - UPDATED with click handler */}
                    <div 
                      className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center text-white font-semibold text-base mr-4 flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => user.vet_profile_photo && openProfilePhotoFullView(
                        user.vet_profile_photo, 
                        `${user.vet_fname} ${user.vet_lname}`
                      )}
                    >
                      {user.vet_profile_photo ? (
                        <img 
                          src={user.vet_profile_photo} 
                          alt={`${user.vet_fname} ${user.vet_lname}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const fallback = document.createElement('div');
                            fallback.className = 'w-full h-full flex items-center justify-center bg-gray-500 text-white font-semibold';
                            fallback.textContent = user.vet_fname.charAt(0) + user.vet_lname.charAt(0);
                            e.target.parentNode.appendChild(fallback);
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-500 text-white font-semibold">
                          {user.vet_fname.charAt(0) + user.vet_lname.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm mb-0.5 break-words">
                        {user.vet_fname} {user.vet_mname} {user.vet_lname}
                        <span
                          className={`inline-block py-1 px-2 rounded-xl text-xs font-medium ml-2 text-black ${
                            user.users?.status === "approved"
                              ? "bg-green-600 text-white"
                              : user.users?.status === "pending"
                                ? "bg-orange-500 text-white"
                                : user.users?.status === "declined"
                                  ? "bg-red-500 text-white"
                                  : ""
                          }`}
                        >
                          {formatStatusDisplay(user.users?.status)}
                        </span>
                      </div>
                      <div className="text-gray-500 text-xs mb-0.5 break-words">{user.vet_email}</div>
                      <div className="text-gray-500 text-xs break-words">
                        {user.vet_city}, {user.vet_province}
                        {user.users?.status === "declined" && user.decline_reason
                          ? ` - Reason: ${user.decline_reason}`
                          : ""}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4 flex-wrap">
                      <button
                        className="inline-flex items-center justify-center gap-1 bg-transparent text-blue-700 border border-blue-700 py-1.5 px-3 rounded text-xs font-medium cursor-pointer transition-all hover:bg-blue-100 min-h-[32px] "
                        onClick={() => viewDetails(user.vet_id, user.status)}
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Pagination Controls */}
                {filteredRegistrations.length > 0 && (
                  <div className="flex justify-between items-center bg-gray-50 px-6 py-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600 flex items-center gap-3">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                      {Math.min(currentPage * itemsPerPage, filteredRegistrations.length)} of {filteredRegistrations.length} results
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
          </div>
        </div>
      </div>

      <FloatingMessages />

      {/* NEW: Full View Profile Photo Modal */}
     {isProfilePhotoFullView && selectedProfilePhoto && (
        <div 
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-[1100] profile-photo-overlay"
          onClick={closeProfilePhotoFullView}
        >
          <button
            className="absolute top-6 right-6 bg-black/50 border-none text-white text-2xl cursor-pointer p-2 leading-none min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-white/30 rounded-full transition-colors z-10"
            onClick={closeProfilePhotoFullView}
          >
            <X size={24} />
          </button>
          
          <div className="relative max-w-4xl max-h-[90vh] w-full mx-4 flex items-center justify-center">
            <img 
              src={selectedProfilePhoto.url} 
              alt={`${selectedProfilePhoto.name}'s profile`}
              className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-lg"
              onError={(e) => {
                e.target.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.className = 'flex flex-col items-center justify-center text-white p-8';
                fallback.innerHTML = `
                  <div class="w-32 h-32 rounded-full bg-gray-600 flex items-center justify-center text-white text-2xl font-semibold mb-4">
                    ${selectedProfilePhoto.name.split(' ').map(n => n.charAt(0)).join('')}
                  </div>
                  <p class="text-sm text-gray-300">Profile photo not available</p>
                `;
                e.target.parentNode.appendChild(fallback);
              }}
            />
          </div>
        </div>
      )}

      {/* View Details Modal - UPDATED with clickable profile photo */}
      {isViewDetailsModalOpen && selectedUser && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-[1000] modal-overlay"
          ref={viewDetailsModalOverlayRef}
        >
          <div className="bg-white rounded-lg p-8 w-[90%] max-w-6xl max-h-[90vh] overflow-y-auto relative">
            <button
              className="absolute top-4 right-4 bg-none border-none text-2xl text-gray-500 cursor-pointer p-1 leading-none min-h-[32px] min-w-[32px] hover:text-gray-700"
              onClick={closeModal}
            >
              &times;
            </button>

            <div className="flex justify-center items-center p-8 border-b border-gray-200 bg-white">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="flex justify-center mb-2">
                  {selectedUser.vet_profile_photo ? (
                    <div 
                      className="w-[120px] h-[120px] border-2 border-gray-200 rounded-full flex items-center justify-center bg-white overflow-hidden cursor-pointer hover:border-red-300 transition-colors"
                      onClick={() => openProfilePhotoFullView(
                        selectedUser.vet_profile_photo, 
                        `${selectedUser.vet_fname} ${selectedUser.vet_lname}`
                      )}
                    >
                      <img 
                        src={selectedUser.vet_profile_photo} 
                        alt="Profile" 
                        className="w-full h-full object-cover rounded-full"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="hidden w-full h-full items-center justify-center bg-gray-100 rounded-full">
                        <span className="text-base font-medium text-gray-500">Profile</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-[120px] h-[120px] border-2 border-gray-200 rounded-full flex items-center justify-center bg-gray-100">
                      <span className="text-base font-medium text-gray-500">Profile</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center gap-2">
                  <h3 className="text-xl font-semibold text-gray-900 m-0">
                    {selectedUser.vet_fname} {selectedUser.vet_mname} {selectedUser.vet_lname}
                  </h3>
                  <p className="text-base text-gray-500 m-0">{selectedUser.type}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-900 font-medium">Current Status:</span>
                    <span
                      className={`py-1 px-3 rounded-2xl text-xs font-semibold uppercase ${
                        selectedUser.users?.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : selectedUser.users?.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : selectedUser.users?.status === "declined"
                              ? "bg-red-100 text-red-700"
                              : ""
                      }`}
                    >
                      {formatStatusDisplay(selectedUser.users?.status)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rest of the modal content remains the same */}
            <div className="flex border-b border-gray-200">
              <button
                className={`py-3 px-6 bg-none border-none text-sm font-medium text-gray-500 cursor-pointer border-b-2 border-transparent transition-all duration-200 whitespace-nowrap min-h-[44px] ${
                  modalActiveTab === "personal" ? "text-red-700 border-b-2 border-red-700" : ""
                }`}
                onClick={() => setModalActiveTab("personal")}
              >
                Personal Information
              </button>
              <button
                className={`py-3 px-6 bg-none border-none text-sm font-medium text-gray-500 cursor-pointer border-b-2 border-transparent transition-all duration-200 whitespace-nowrap min-h-[44px] ${
                  modalActiveTab === "professional" ? "text-red-700 border-b-2 border-red-700" : ""
                }`}
                onClick={() => setModalActiveTab("professional")}
              >
                Professional Info
              </button>
              <button
                className={`py-3 px-6 bg-none border-none text-sm font-medium text-gray-500 cursor-pointer border-b-2 border-transparent transition-all duration-200 whitespace-nowrap min-h-[44px] ${
                  modalActiveTab === "documents" ? "text-red-700 border-b-2 border-red-700" : ""
                }`}
                onClick={() => setModalActiveTab("documents")}
              >
                Documents
              </button>
            </div>

            <div className="mb-5">
              {modalActiveTab === "personal" && (
                <>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 transition-shadow duration-200 hover:shadow-md">
                    <div className="flex items-center mb-4 pb-2 border-b border-gray-200">
                      <User className="text-red-700 mr-2 text-base w-5 text-center" size={20} />
                      <h4 className="text-base font-semibold text-gray-900 m-0">Name Information</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex justify-start items-start mb-3 gap-1">
                        <span className="text-xs text-gray-500 flex-shrink-0 min-w-[120px]">First Name:</span>
                        <div className="text-sm font-medium text-gray-900 break-words flex-shrink-0 mr-full">
                          {selectedUser.vet_fname}
                        </div>
                      </div>
                      <div className="flex justify-start items-start mb-3 gap-1">
                        <span className="text-xs text-gray-500 flex-shrink-0 min-w-[120px]">Middle Name:</span>
                        <div className="text-sm font-medium text-gray-900 break-words flex-shrink-0 mr-full">
                          {selectedUser.vet_mname}
                        </div>
                      </div>
                      <div className="flex justify-start items-start mb-3 gap-1">
                        <span className="text-xs text-gray-500 flex-shrink-0 min-w-[120px]">Last Name:</span>
                        <div className="text-sm font-medium text-gray-900 break-words flex-shrink-0 mr-full">
                          {selectedUser.vet_lname}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 transition-shadow duration-200 hover:shadow-md">
                    <div className="flex items-center mb-4 pb-2 border-b border-gray-200">
                      <CreditCard className="text-red-700 mr-2 text-base w-5 text-center" size={20} />
                      <h4 className="text-base font-semibold text-gray-900 m-0">Personal Information</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex justify-start items-start mb-3 gap-1">
                        <span className="text-xs text-gray-500 flex-shrink-0 min-w-[120px]">Date of Birth:</span>
                        <div className="text-sm font-medium text-gray-900 break-words flex-shrink-0 mr-full">
                          {selectedUser.vet_dob}
                        </div>
                      </div>
                      <div className="flex justify-start items-start mb-3 gap-1">
                        <span className="text-xs text-gray-500 flex-shrink-0 min-w-[120px]">Sex:</span>
                        <div className="text-sm font-medium text-gray-900 break-words flex-shrink-0 mr-full">
                          {selectedUser.vet_sex || "Not specified"}
                        </div>
                      </div>
                      <div className="col-span-2 flex justify-start items-start mb-3 gap-1">
                        <span className="text-xs text-gray-500 flex-shrink-0 min-w-[120px]">Phone Number:</span>
                        <div className="text-sm font-medium text-gray-900 break-words flex-shrink-0 mr-full">
                          {selectedUser.vet_phone_num}
                        </div>
                      </div>
                      <div className="col-span-2 flex justify-start items-start mb-3 gap-1">
                        <span className="text-xs text-gray-500 flex-shrink-0 min-w-[120px]">Email:</span>
                        <div className="text-sm font-medium text-gray-900 break-words flex-shrink-0 mr-full">
                          {selectedUser.vet_email}
                        </div>
                      </div>
                      
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 transition-shadow duration-200 hover:shadow-md">
                    <div className="flex items-center mb-4 pb-2 border-b border-gray-200">
                      <MapPin className="text-red-700 mr-2 text-base w-5 text-center" size={20} />
                      <h4 className="text-base font-semibold text-gray-900 m-0">Address Information</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex justify-start items-start mb-3 gap-1">
                        <span className="text-xs text-gray-500 flex-shrink-0 min-w-[120px]">Province:</span>
                        <div className="text-sm font-medium text-gray-900 break-words flex-shrink-0 mr-full">
                          {selectedUser.vet_province}
                        </div>
                      </div>
                      <div className="flex justify-start items-start mb-3 gap-1">
                        <span className="text-xs text-gray-500 flex-shrink-0 min-w-[120px]">City:</span>
                        <div className="text-sm font-medium text-gray-900 break-words flex-shrink-0 mr-full">
                          {selectedUser.vet_city}
                        </div>
                      </div>
                      <div className="flex justify-start items-start mb-3 gap-1">
                        <span className="text-xs text-gray-500 flex-shrink-0 min-w-[120px]">Barangay:</span>
                        <div className="text-sm font-medium text-gray-900 break-words flex-shrink-0 mr-full">
                          {selectedUser.vet_brgy}
                        </div>
                      </div>
                      <div className="flex justify-start items-start mb-3 gap-1">
                        <span className="text-xs text-gray-500 flex-shrink-0 min-w-[120px]">Zip Code:</span>
                        <div className="text-sm font-medium text-gray-900 break-words flex-shrink-0 mr-full">
                          {selectedUser.vet_zipcode}
                        </div>
                      </div>
                      <div className="col-span-2 flex justify-start items-start mb-3 gap-1">
                        <span className="text-xs text-gray-500 flex-shrink-0 min-w-[120px]">Complete Address:</span>
                        <div className="text-sm font-medium text-gray-900 break-words flex-shrink-0 mr-full">
                          {`${selectedUser.vet_brgy}, ${selectedUser.vet_city}, ${selectedUser.vet_province}`}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {modalActiveTab === "professional" && (
                <>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 transition-shadow duration-200 hover:shadow-md">
                    <div className="flex items-center mb-4 pb-2 border-b border-gray-200">
                      <Stethoscope className="text-red-700 mr-2 text-base w-5 text-center" size={20} />
                      <h4 className="text-base font-semibold text-gray-900 m-0">Professional Information</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex justify-start items-start mb-3 gap-1">
                        <span className="text-xs text-gray-500 flex-shrink-0 min-w-[120px]">License Number:</span>
                        <div className="text-sm font-medium text-gray-900 break-words flex-shrink-0 mr-full">
                          {selectedUser.vet_license_num || "Not provided"}
                        </div>
                      </div>
                      <div className="flex justify-start items-start mb-3 gap-1">
                        <span className="text-xs text-gray-500 flex-shrink-0 min-w-[120px]">Experience Years:</span>
                        <div className="text-sm font-medium text-gray-900 break-words flex-shrink-0 mr-full">
                          {selectedUser.vet_exp_yr || "Not specified"}
                        </div>
                      </div>
                      <div className="col-span-2 flex justify-start items-start mb-3 gap-1">
                        <span className="text-xs text-gray-500 flex-shrink-0 min-w-[120px]">Specialization:</span>
                        <div className="text-sm font-medium text-gray-900 break-words flex-shrink-0 mr-full">
                          {selectedUser.vet_specialization || "Not specified"}
                        </div>
                      </div>
                      <div className="col-span-2 flex justify-start items-start mb-3 gap-1">
                        <span className="text-xs text-gray-500 flex-shrink-0 min-w-[120px]">Organization:</span>
                        <div className="text-sm font-medium text-gray-900 break-words flex-shrink-0 mr-full">
                          {selectedUser.vet_org || "Not specified"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Clinic Address Section */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 transition-shadow duration-200 hover:shadow-md">
                    <div className="flex items-center mb-4 pb-2 border-b border-gray-200">
                      <MapPin className="text-red-700 mr-2 text-base w-5 text-center" size={20} />
                      <h4 className="text-base font-semibold text-gray-900 m-0">Clinic Address</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex justify-start items-start mb-3 gap-1">
                        <span className="text-xs text-gray-500 flex-shrink-0 min-w-[120px]">Clinic Province:</span>
                        <div className="text-sm font-medium text-gray-900 break-words flex-shrink-0 mr-full">
                          {selectedUser.vet_clinic_province || "Not specified"}
                        </div>
                      </div>
                      <div className="flex justify-start items-start mb-3 gap-1">
                        <span className="text-xs text-gray-500 flex-shrink-0 min-w-[120px]">Clinic City:</span>
                        <div className="text-sm font-medium text-gray-900 break-words flex-shrink-0 mr-full">
                          {selectedUser.vet_clinic_city || "Not specified"}
                        </div>
                      </div>
                      <div className="flex justify-start items-start mb-3 gap-1">
                        <span className="text-xs text-gray-500 flex-shrink-0 min-w-[120px]">Clinic Barangay:</span>
                        <div className="text-sm font-medium text-gray-900 break-words flex-shrink-0 mr-full">
                          {selectedUser.vet_clinic_brgy || "Not specified"}
                        </div>
                      </div>
                      <div className="flex justify-start items-start mb-3 gap-1">
                        <span className="text-xs text-gray-500 flex-shrink-0 min-w-[120px]">Clinic Zip Code:</span>
                        <div className="text-sm font-medium text-gray-900 break-words flex-shrink-0 mr-full">
                          {selectedUser.vet_clinic_zipcode || "Not specified"}
                        </div>
                      </div>
                      <div className="col-span-2 flex justify-start items-start mb-3 gap-1">
                        <span className="text-xs text-gray-500 flex-shrink-0 min-w-[120px]">Complete Clinic Address:</span>
                        <div className="text-sm font-medium text-gray-900 break-words flex-shrink-0 mr-full">
                          {selectedUser.vet_clinic_province && selectedUser.vet_clinic_city && selectedUser.vet_clinic_brgy 
                            ? `${selectedUser.vet_clinic_brgy}, ${selectedUser.vet_clinic_city}, ${selectedUser.vet_clinic_province}`
                            : "Not specified"}
                        </div>
                      </div>
                      
                    </div>
                  </div>
                </>
              )}

              {modalActiveTab === "documents" && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 transition-shadow duration-200 hover:shadow-md">
                  <div className="flex items-center mb-4 pb-2 border-b border-gray-200">
                    <FileText className="text-red-700 mr-2 text-base w-5 text-center" size={20} />
                    <h4 className="text-base font-semibold text-gray-900 m-0">Documents</h4>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-semibold text-gray-700 mb-3">License Documents</h5>
                    <div className="flex flex-col items-center justify-center p-5 border border-dashed border-gray-300 rounded-lg text-center">
                      {selectedUser.vet_documents && parseDocuments(selectedUser.vet_documents).length > 0 ? (
                        <div className="w-full">
                          {parseDocuments(selectedUser.vet_documents).map((docUrl, index) => (
                            <div key={index} className="mb-4 last:mb-0">
                              <div className="relative w-full max-w-md mx-auto">
                                {docUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) ? (
                                  <img
                                    src={docUrl}
                                    alt={`License Document ${index + 1}`}
                                    className="w-full h-auto rounded-lg block max-h-64 object-contain"
                                    onError={(e) => {
                                      e.target.style.display = "none"
                                      e.target.nextSibling.style.display = "block"
                                    }}
                                  />
                                ) : (
                                  <div className="flex flex-col items-center justify-center p-8 border border-gray-200 rounded-lg bg-gray-50">
                                    <FileText size={48} className="mb-2.5 text-gray-400" />
                                    <p className="text-sm text-gray-500 mb-2">PDF Document</p>
                                    <a 
                                      href={docUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                    >
                                      View PDF Document
                                    </a>
                                  </div>
                                )}
                                <div className="flex flex-col items-center justify-center text-gray-400 hidden p-8">
                                  <FileText size={48} className="mb-2.5" />
                                  <p className="text-sm text-gray-500">Document not available</p>
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 mt-2">Document {index + 1}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400 p-8">
                          <FileText size={48} className="mb-2.5" />
                          <p className="text-sm text-gray-500">No documents provided</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* COMPACT BUTTONS - UPDATED with loading states */}
            <div className="flex justify-end pt-4 border-t border-gray-200 gap-2 flex-wrap">
              {selectedUser?.users?.status === "pending" && (
                <>
                  <button
                    className="inline-flex items-center gap-1.5 py-2 px-3 border-none rounded text-sm font-medium cursor-pointer transition-colors duration-200 bg-green-500 text-white hover:bg-green-600 min-w-[100px] justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => showApproveConfirmation(selectedUser.vet_id)}
                    disabled={isActionLoading && loadingActionId === selectedUser.vet_id}
                  >
                    {isActionLoading && loadingActionId === selectedUser.vet_id ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    {isActionLoading && loadingActionId === selectedUser.vet_id ? "Processing..." : "Approve"}
                  </button>

                  <button
                    className="inline-flex items-center gap-1.5 py-2 px-3 border-none rounded text-sm font-medium cursor-pointer transition-colors duration-200 bg-red-500 text-white hover:bg-red-600 min-w-[100px] justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => showDeclineConfirmation(selectedUser.vet_id)}
                    disabled={isActionLoading && loadingActionId === selectedUser.vet_id}
                  >
                    {isActionLoading && loadingActionId === selectedUser.vet_id ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <XCircle size={16} />
                    )}
                    {isActionLoading && loadingActionId === selectedUser.vet_id ? "Processing..." : "Not Approved"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal - UPDATED with loading states */}
      {isConfirmationModalOpen && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-[1000] modal-overlay"
          ref={confirmationOverlayRef}
        >
          <div className="bg-white rounded-lg p-8 text-center max-w-md w-[90%]">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{confirmationDetails.title}</h3>
            <p className="text-base text-gray-500 mb-6 leading-relaxed">{confirmationDetails.message}</p>

            {/* Decline Reason Input */}
            {confirmationDetails.action === "decline" && (
              <textarea
                placeholder="Enter reason for marking as not approved..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full p-2 mt-2.5 rounded border border-gray-300 resize-y"
                disabled={isActionLoading}
              />
            )}

            <div className="flex gap-3 justify-center flex-wrap">
              <button
                className="py-2 px-4 border-none rounded text-sm font-medium cursor-pointer transition-colors duration-200 min-h-[40px] flex-1 min-w-[80px] bg-gray-500 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={closeConfirmation}
                disabled={isActionLoading}
              >
                Cancel
              </button>
              <button
                className={`py-2 px-4 border-none rounded text-sm font-medium cursor-pointer transition-colors duration-200 min-h-[40px] flex-1 min-w-[80px] flex items-center justify-center gap-2 ${
                  confirmationDetails.action === "approve"
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "bg-red-500 text-white hover:bg-red-600"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                onClick={confirmAction}
                disabled={isActionLoading || (confirmationDetails.action === "decline" && !declineReason)}
              >
                {isActionLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : confirmationDetails.action === "approve" ? (
                  "Approve"
                ) : (
                  "Not Approved"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CtuAccountApproval