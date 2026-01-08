
import Sidebar from "@/components/CtuSidebar"
import {
  Bell,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Eye,
  FileText,
  MapPin,
  RefreshCw,
  Search,
  Stethoscope,
  User,
  UserCheck,
  UserX,
  X,
  XCircle
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import FloatingMessages from "./CtuMessage"
import NotificationModal from "./CtuNotif"

const API_BASE = "https://echo-ebl8.onrender.com/api/ctu_vetmed"

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

  const [activeTab, setActiveTab] = useState("all")
  const [roleFilter, setRoleFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCounts, setIsLoadingCounts] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [loadingActionId, setLoadingActionId] = useState(null)

  const [notifications, setNotifications] = useState([])
  const [notifsOpen, setNotifsOpen] = useState(false)

  const notificationBellRef = useRef(null)
  const [isViewDetailsModalOpen, setIsViewDetailsModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const viewDetailsModalOverlayRef = useRef(null)
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false)
  const [confirmationDetails, setConfirmationDetails] = useState({ title: "", message: "", action: "" })
  const confirmationOverlayRef = useRef(null)
  const [modalActiveTab, setModalActiveTab] = useState("personal")

  const [declineReason, setDeclineReason] = useState("")
  const [isProfilePhotoFullView, setIsProfilePhotoFullView] = useState(false)
  const [selectedProfilePhoto, setSelectedProfilePhoto] = useState("")

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const [counts, setCounts] = useState({
    pending: 0,
    approved: 0,
    declined: 0,
    all: 0
  })

  const formatStatusDisplay = (status) => {
    if (!status) return "";
    if (status === "declined") return "Not approved";
    if (status === "all") return "All";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getRoleColor = (type, status) => {
    // Color mapping for different user types
    const roleColors = {
      "Veterinarian": {
        pending: "bg-green-100 text-green-800 border border-green-200",
        approved: "bg-green-50 text-green-700 border border-green-100",
        declined: "bg-green-50/50 text-green-600/80 border border-green-100/50"
      },
      "Kutsero": {
        pending: "bg-blue-100 text-blue-800 border border-blue-200",
        approved: "bg-blue-50 text-blue-700 border border-blue-100",
        declined: "bg-blue-50/50 text-blue-600/80 border border-blue-100/50"
      },
      "Horse Operator": {
        pending: "bg-amber-900/10 text-amber-900 border border-amber-900/20",
        approved: "bg-amber-800/10 text-amber-800 border border-amber-800/20",
        declined: "bg-amber-800/5 text-amber-800/70 border border-amber-800/10"
      },
      "Unknown": {
        pending: "bg-gray-100 text-gray-800 border border-gray-200",
        approved: "bg-gray-50 text-gray-700 border border-gray-100",
        declined: "bg-gray-50/50 text-gray-600/80 border border-gray-100/50"
      }
    };

    const roleType = type || "Unknown";
    const userStatus = status || "pending";
    
    return roleColors[roleType]?.[userStatus] || roleColors["Unknown"][userStatus];
  };

  // Fetch counts for all user types
  const fetchCounts = async () => {
    setIsLoadingCounts(true)
    try {
      const response = await fetch(`${API_BASE}/get_all_profile_counts/`)
      if (!response.ok) throw new Error("Failed to fetch counts")
      const result = await response.json()
      
      if (result.data) {
        setCounts({
          pending: result.data.pending || 0,
          approved: result.data.approved || 0,
          declined: result.data.declined || 0,
          all: result.data.all || 0
        })
      }
    } catch (error) {
      console.error("Error fetching counts:", error)
    } finally {
      setIsLoadingCounts(false)
    }
  }

  useEffect(() => {
    fetchCounts()
  }, [])

  // Handle search with debounce
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm) {
        setIsSearching(true)
        setIsSearching(false)
      }
    }, 500)

    return () => clearTimeout(debounceTimer)
  }, [searchTerm])

  const filterRegistrations = useCallback(() => {
    let filtered = registrationData

    if (activeTab !== "all") {
      filtered = filtered.filter((user) => user.status === activeTab)
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => 
        user.type?.toLowerCase().replace(" ", "_") === roleFilter.toLowerCase().replace(" ", "_")
      )
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filtered
  }, [registrationData, activeTab, roleFilter, searchTerm])

  const getPaginatedData = () => {
    const filteredRegistrations = filterRegistrations()
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredRegistrations.slice(startIndex, endIndex)
  }

  // View details - updated to handle different user types
  const viewDetails = (userId, status, userType) => {
    const user = registrationData.find((u) => u.id === userId)
    if (user) {
      setSelectedUser({ ...user, status, userType })
      setIsViewDetailsModalOpen(true)
      setModalActiveTab("personal")
    } else {
      console.log("User data not found")
    }
  }

  const openProfilePhotoFullView = (profilePhoto, userName) => {
    setSelectedProfilePhoto({
      url: profilePhoto,
      name: userName
    })
    setIsProfilePhotoFullView(true)
  }

  const closeProfilePhotoFullView = () => {
    setIsProfilePhotoFullView(false)
    setSelectedProfilePhoto("")
  }

  const closeModal = () => {
    setIsViewDetailsModalOpen(false)
    setSelectedUser(null)
    setModalActiveTab("personal")
  }

  // Updated confirmation functions to include user type
  const showApproveConfirmation = (userId, userType, userName) => {
    setSelectedUser({ id: userId, userType })
    setConfirmationDetails({
      title: "Confirm Approval",
      message: `Are you sure you want to approve ${userName}'s registration?`,
      action: "approve",
    })
    setIsConfirmationModalOpen(true)
  }

  const showDeclineConfirmation = (userId, userType, userName) => {
    setSelectedUser({ id: userId, userType })
    setConfirmationDetails({
      title: "Confirm Not Approved",
      message: `Are you sure you want to mark ${userName}'s registration as not approved?`,
      action: "decline",
    })
    setIsConfirmationModalOpen(true)
  }

  const closeConfirmation = () => {
    setIsConfirmationModalOpen(false)
    setSelectedUser(null)
    setConfirmationDetails({ title: "", message: "", action: "" })
    setDeclineReason("")
  }

  const confirmAction = () => {
    if (confirmationDetails.action === "approve" && selectedUser) {
      approveUser(selectedUser.id, selectedUser.userType)
    } else if (confirmationDetails.action === "decline" && selectedUser) {
      declineUser(selectedUser.id, selectedUser.userType)
    }
  }

  // Updated approve function to include user type
  const approveUser = async (userId, userType) => {
    setIsActionLoading(true)
    setLoadingActionId(userId)
    
    try {
      setRegistrationData((prev) => 
        prev.map((u) => 
          u.id === userId ? { ...u, status: "approved" } : u
        )
      )
      setMessage(`Approving user...`)

      const backendUserType = userType === 'Veterinarian' ? 'vet' : 
                             userType === 'Kutsero' ? 'kutsero' : 
                             userType === 'Horse Operator' ? 'horse_operator' : 'vet';

      const response = await fetch(`${API_BASE}/update_user_status/${userId}/`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ 
          status: "approved",
          user_type: backendUserType 
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `Failed to approve user: ${response.status}`)
      }

      const data = await response.json()
      setMessage(`User approved successfully!`)
      
      await handleManualRefresh()
      await fetchCounts()
      
      console.log("User approved:", data)
    } catch (err) {
      console.error(err)
      setRegistrationData((prev) => 
        prev.map((u) => 
          u.id === userId ? { ...u, status: "pending" } : u
        )
      )
      setMessage(`Error: ${err.message}`)
    } finally {
      setIsActionLoading(false)
      setLoadingActionId(null)
      closeConfirmation()
    }
  }

  // Updated decline function to include user type
  const declineUser = async (userId, userType) => {
    if (!declineReason.trim()) {
      setMessage("Please enter a reason for marking as not approved.")
      return
    }

    setIsActionLoading(true)
    setLoadingActionId(userId)

    try {
      setRegistrationData((prev) => 
        prev.map((u) => 
          u.id === userId ? { ...u, status: "declined" } : u
        )
      )
      setMessage(`Marking user as not approved...`)

      const backendUserType = userType === 'Veterinarian' ? 'vet' : 
                             userType === 'Kutsero' ? 'kutsero' : 
                             userType === 'Horse Operator' ? 'horse_operator' : 'vet';

      const response = await fetch(`${API_BASE}/update_user_status/${userId}/`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ 
          status: "declined", 
          decline_reason: declineReason.trim(),
          user_type: backendUserType 
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `Failed to mark user as not approved: ${response.status}`)
      }

      const data = await response.json()
      setMessage(`User marked as not approved successfully!`)
      
      await handleManualRefresh()
      await fetchCounts()
      
      console.log("User marked as not approved:", data)
    } catch (err) {
      console.error(err)
      setRegistrationData((prev) => 
        prev.map((u) => 
          u.id === userId ? { ...u, status: "pending" } : u
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
  }

  const loadNotifications = useCallback(() => {
    fetch(`${API_BASE}/get_vetnotifications/`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch notifications")
        return res.json()
      })
      .then((data) => {
        const formatted = data.map((notif) => ({
          id: notif.id,
          message: notif.message,
          date: notif.date || new Date().toISOString(),
          read: notif.read || false,
          type: notif.type || "general"
        }))
        setNotifications(formatted)
      })
      .catch((err) => console.error("Failed to fetch notifications:", err))
  }, [])

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch(`${API_BASE}/mark_all_notifications_read/`, {
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

  // HANDLE INDIVIDUAL NOTIFICATION CLICK - CTU VERSION WITH HORSE OPERATOR & KUTSERO
const handleNotificationClick = async (notification) => {
  const notifId = notification?.notif_id || notification?.id;

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
    let sosId = null;
    if (notification.related_id && notification.related_id.startsWith("sos_")) {
      sosId = notification.related_id.replace("sos_", "");
    }
    
    navigate("/CtuDashboard", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
        sosId: sosId,
      },
    });
    return;
  }

  // VETERINARIAN Account Approvals - SPECIFIC
  if (
    message.includes("veterinarian") && 
    (message.includes("registration") ||
     message.includes("approved") ||
     message.includes("declined") ||
     message.includes("pending") ||
     message.includes("needs approval") ||
     message.includes("vet "))
  ) {
    navigate("/CtuAccountApproval", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
        tab: "veterinarian", // ADDED: Specify veterinarian tab
      },
    });
    return;
  }

  // HORSE OPERATOR Account Approvals - NEW FOR CTU
  if (
    message.includes("horse-operator") ||
    message.includes("horse operator") ||
    (message.includes("horse") && message.includes("operator") && 
     (message.includes("registration") || 
      message.includes("approved") || 
      message.includes("declined") || 
      message.includes("pending"))) ||
    (type === "registration" && message.includes("horse"))
  ) {
    navigate("/CtuAccountApproval", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
        tab: "horse-operator", // ADDED: Specify horse-operator tab
      },
    });
    return;
  }

  // KUTSERO Account Approvals - NEW FOR CTU
  if (
    message.includes("kutsero") ||
    (message.includes("registration") && message.includes("kutsero")) ||
    (message.includes("kutsero") && 
     (message.includes("approved") || 
      message.includes("declined") || 
      message.includes("pending"))) ||
    (type === "registration" && message.includes("kutsero"))
  ) {
    navigate("/CtuAccountApproval", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
        tab: "kutsero", // ADDED: Specify kutsero tab
      },
    });
    return;
  }

  // GENERAL REGISTRATION (catch-all for any registration type)
  if (
    message.includes("new registration") ||
    message.includes("needs approval") ||
    message.includes("registration:") ||
    (message.includes("registration") && 
     (message.includes("approved") || 
      message.includes("declined") || 
      message.includes("pending"))) ||
    type === "registration"
  ) {
    navigate("/CtuAccountApproval", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
      },
    });
    return;
  }

  // MEDICAL RECORD ACCESS REQUESTS
  if (
    message.includes("medical record") ||
    message.includes("medical access") ||
    message.includes("requested access") ||
    message.includes("medrec") ||
    (message.includes("record") && message.includes("access"))
  ) {
    navigate("/CtuDashboard", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
        section: "medical-records", // Optional: specify section
      },
    });
    return;
  }

  // COMMENT NOTIFICATIONS
  if (message.includes("comment") || type === "comment" || type === "comment_notification") {
    navigate("/CtuAnnouncement", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
      },
    });
    return;
  }

  // APPOINTMENT NOTIFICATIONS (if CTU has appointment management)
  if (
    message.includes("appointment") ||
    message.includes("schedule") ||
    type.includes("appointment")
  ) {
    navigate("/CtuDashboard", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
        section: "appointments",
      },
    });
    return;
  }

  // VET STATUS UPDATES (approved/declined notifications for admins)
  if (
    type === "vet_status_update" ||
    type === "vet_registration" ||
    (message.includes("vet") && 
     (message.includes("status") || message.includes("update")))
  ) {
    navigate("/CtuAccountApproval", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
        tab: "veterinarian",
      },
    });
    return;
  }

  // SOS STATUS UPDATES (responded/resolved/cancelled)
  if (
    type === "sos_status_update" ||
    message.includes("responded") ||
    message.includes("resolved") ||
    message.includes("cancelled")
  ) {
    navigate("/CtuDashboard", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
        section: "sos",
      },
    });
    return;
  }

  console.log("Notification clicked but no specific action:", notification);
  
  // DEFAULT: Go to dashboard for other notifications
  navigate("/CtuDashboard", {
    state: {
      highlightedNotification: notification,
      shouldHighlight: true,
    },
  });
};

  const handleNotificationsUpdate = (updatedNotifications) => {
    setNotifications(updatedNotifications);
  };

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(() => {
      loadNotifications()
    }, 60000)
    return () => clearInterval(interval)
  }, [loadNotifications])

  // Updated manual refresh to process all user types
  const handleManualRefresh = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE}/get_all_profiles/`)
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }
      
      const result = await response.json()
      const data = result.data || []
      
      // Process and normalize data for different user types
      const processedData = data.map((item) => {
        const userStatus = item.users?.status || item.status || "pending"
        
        // Determine user type and extract fields
        let userType = "Unknown"
        let firstName = ""
        let lastName = ""
        let email = ""
        let profilePhoto = ""
        let city = ""
        let province = ""
        let userId = ""
        let dateRegistered = "" // NEW: Add date registered field
        
        // Check for Veterinarian
        if (item.vet_fname) {
          userType = "Veterinarian"
          firstName = item.vet_fname || ""
          lastName = item.vet_lname || ""
          email = item.vet_email || ""
          profilePhoto = item.vet_profile_photo || ""
          city = item.vet_city || ""
          province = item.vet_province || ""
          userId = item.vet_id || item.id || item.user_id
          // Extract registration date - check various possible fields
          dateRegistered = item.created_at || item.created_date || item.date_created || 
                          item.registration_date || item.date_registered || 
                          item.users?.created_at || ""
        } 
        // Check for Kutsero
        else if (item.kutsero_fname) {
          userType = "Kutsero"
          firstName = item.kutsero_fname || ""
          lastName = item.kutsero_lname || ""
          email = item.kutsero_email || ""
          profilePhoto = item.kutsero_image || ""
          city = item.kutsero_city || ""
          province = item.kutsero_province || ""
          userId = item.kutsero_id || item.id || item.user_id
          // Extract registration date
          dateRegistered = item.created_at || item.created_date || item.date_created || 
                          item.registration_date || item.date_registered || 
                          item.users?.created_at || ""
        } 
        // Check for Horse Operator
        else if (item.op_fname) {
          userType = "Horse Operator"
          firstName = item.op_fname || ""
          lastName = item.op_lname || ""
          email = item.op_email || ""
          profilePhoto = item.op_image || ""
          city = item.op_city || ""
          province = item.op_province || ""
          userId = item.op_id || item.id || item.user_id
          // Extract registration date
          dateRegistered = item.created_at || item.created_date || item.date_created || 
                          item.registration_date || item.date_registered || 
                          item.users?.created_at || ""
        }
        // Fallback for any other type
        else {
          console.warn("Unknown user type or missing fields:", item)
          userType = item.type || "Unknown"
          firstName = item.name ? item.name.split(' ')[0] : ""
          lastName = item.name ? item.name.split(' ').slice(1).join(' ') : ""
          email = item.email || ""
          profilePhoto = item.profile_photo || item.profilePhoto || ""
          city = item.city || ""
          province = item.province || ""
          userId = item.id || item.user_id || ""
          dateRegistered = item.created_at || item.created_date || item.date_created || 
                          item.registration_date || item.date_registered || 
                          item.users?.created_at || ""
        }

        // Format the date if it exists
        let formattedDate = ""
        if (dateRegistered) {
          try {
            const dateObj = new Date(dateRegistered)
            if (!isNaN(dateObj.getTime())) {
              formattedDate = dateObj.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })
            }
          } catch (e) {
            console.warn("Error formatting date:", e)
          }
        }

        return {
          ...item,
          id: userId,
          name: `${firstName} ${lastName}`.trim(),
          firstName,
          lastName,
          email,
          profilePhoto,
          city,
          province,
          status: userStatus,
          type: userType,
          originalData: item,
          declineReason: item.users?.decline_reason || item.decline_reason || "",
          dateRegistered: formattedDate, // NEW: Add formatted date
          rawDateRegistered: dateRegistered // Keep raw date for modal
        }
      })

      setRegistrationData(processedData)
      console.log("Processed registration data:", processedData)
    } catch (error) {
      console.error("Failed to refresh data:", error)
      setMessage(`Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    handleManualRefresh()
  }, [])

  // Close modals when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
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
  }, [isViewDetailsModalOpen, isConfirmationModalOpen, isProfilePhotoFullView])

  const filteredRegistrations = filterRegistrations()
  const paginatedRegistrations = getPaginatedData()
  const totalPages = Math.ceil(filteredRegistrations.length / itemsPerPage)

  const unreadNotificationsCount = notifications.filter(notif => !notif.read).length

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value))
    setCurrentPage(1)
  }

  const handleTabChange = (tabName) => {
    setActiveTab(tabName)
    setCurrentPage(1)
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
    }, 500)
  }

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

  // Helper function to get user data for modal
  const getUserModalData = (user) => {
    if (!user) return null
    
    const originalData = user.originalData || user
    
    // Common fields for all user types
    const commonData = {
      dateRegistered: user.dateRegistered || "",
      rawDateRegistered: user.rawDateRegistered || ""
    }
    
    if (user.type === "Veterinarian") {
      return {
        ...commonData,
        firstName: originalData.vet_fname || "",
        lastName: originalData.vet_lname || "",
        middleName: originalData.vet_mname || "",
        email: originalData.vet_email || "",
        phone: originalData.vet_phone_num || "",
        dob: originalData.vet_dob || "",
        sex: originalData.vet_sex || "",
        profilePhoto: originalData.vet_profile_photo || "",
        city: originalData.vet_city || "",
        province: originalData.vet_province || "",
        barangay: originalData.vet_brgy || "",
        zipCode: originalData.vet_zipcode || "",
        licenseNumber: originalData.vet_license_num || "",
        experienceYears: originalData.vet_exp_yr || "",
        specialization: originalData.vet_specialization || "",
        organization: originalData.vet_org || "",
        clinicProvince: originalData.vet_clinic_province || "",
        clinicCity: originalData.vet_clinic_city || "",
        clinicBarangay: originalData.vet_clinic_brgy || "",
        clinicZipCode: originalData.vet_clinic_zipcode || "",
        documents: originalData.vet_documents || ""
      }
    } else if (user.type === "Kutsero") {
      return {
        ...commonData,
        firstName: originalData.kutsero_fname || "",
        lastName: originalData.kutsero_lname || "",
        middleName: originalData.kutsero_mname || "",
        email: originalData.kutsero_email || "",
        phone: originalData.kutsero_phone_num || "",
        dob: originalData.kutsero_dob || "",
        sex: originalData.kutsero_sex || "",
        profilePhoto: originalData.kutsero_image || "",
        city: originalData.kutsero_city || "",
        province: originalData.kutsero_province || "",
        barangay: originalData.kutsero_brgy || "",
        zipCode: originalData.kutsero_zipcode || "",
        licenseNumber: originalData.kutsero_license_num || "",
        experienceYears: originalData.years_experience || originalData.kutsero_exp_yr || "",
        documents: originalData.application_document_url || originalData.membership_document_url || ""
      }
    } else if (user.type === "Horse Operator") {
      return {
        ...commonData,
        firstName: originalData.op_fname || "",
        lastName: originalData.op_lname || "",
        middleName: originalData.op_mname || "",
        email: originalData.op_email || "",
        phone: originalData.op_phone_num || "",
        dob: originalData.op_dob || "",
        sex: originalData.op_sex || "",
        profilePhoto: originalData.op_image || "",
        city: originalData.op_city || "",
        province: originalData.op_province || "",
        barangay: originalData.op_brgy || "",
        zipCode: originalData.op_zipcode || "",
        licenseNumber: originalData.op_license_num || "",
        experienceYears: originalData.op_exp_yr || "",
        stableName: originalData.op_stable_name || "",
        stableAddress: originalData.op_stable_address || "",
        documents: originalData.op_documents || ""
      }
    }
    
    return null
  }

  return (
    <div className="font-sans bg-gray-100 flex h-screen overflow-x-hidden w-full">
      <div className="sidebars" id="sidebasr">
        <Sidebar isOpen={false} />
      </div>

      <div className="flex-1 flex flex-col">
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 px-6 py-4 flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Account Approval</h2>
            <p className="text-sm text-gray-600">Manage all user registrations</p>
          </div>

          <div className="flex items-center gap-4">
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
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="flex-1 max-w-md relative min-w-[200px]">
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

              <div className="flex items-center gap-2 flex-1">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-4 py-3 border-2 border-white rounded-lg text-base outline-none bg-white h-[46px] min-w-[150px]"
                >
                  <option value="all">All Roles</option>
                  <option value="veterinarian">Veterinarian</option>
                  <option value="kutsero">Kutsero</option>
                  <option value="horse_operator">Horse Operator</option>
                </select>
              </div>
            </div>

            {/* Status Filter Container - Moved to the left */}
            <div className="flex flex-wrap gap-2 bg-white p-2 rounded-lg h-auto lg:h-[52px] items-center justify-center border-2 border-white mb-5 w-fit">
              <button
                className={`flex items-center justify-center gap-2 h-full px-4 py-2 bg-none border-none text-sm font-medium cursor-pointer rounded-full transition-all duration-200 min-w-[80px] md:min-w-[90px] ${
                  activeTab === "all"
                    ? "bg-blue-500 text-white font-semibold shadow-sm"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => {
                  setActiveTab("all")
                  setCurrentPage(1)
                }}
              >
                All{" "}
                {isLoadingCounts ? (
                  <div className="animate-pulse bg-gray-300 rounded-full w-5 h-5"></div>
                ) : (
                  <span className={`inline-flex items-center justify-center min-w-[20px] h-[20px] px-1 rounded-full text-[10px] md:text-xs font-semibold ${
                    activeTab === "all" ? "bg-white/20 text-white" : "bg-blue-500 text-white"
                  }`}>
                    {counts.all}
                  </span>
                )}
              </button>
              
              <button
                className={`flex items-center justify-center gap-2 h-full px-4 py-2 bg-none border-none text-sm font-medium cursor-pointer rounded-full transition-all duration-200 min-w-[80px] md:min-w-[90px] ${
                  activeTab === "pending"
                    ? "bg-yellow-500 text-white font-semibold shadow-sm"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => {
                  setActiveTab("pending")
                  setCurrentPage(1)
                }}
              >
                Pending{" "}
                {isLoadingCounts ? (
                  <div className="animate-pulse bg-gray-300 rounded-full w-5 h-5"></div>
                ) : (
                  <span className={`inline-flex items-center justify-center min-w-[20px] h-[20px] px-1 rounded-full text-[10px] md:text-xs font-semibold ${
                    activeTab === "pending" ? "bg-white/20 text-white" : "bg-yellow-500 text-white"
                  }`}>
                    {counts.pending}
                  </span>
                )}
              </button>
              
              <button
                className={`flex items-center justify-center gap-2 h-full px-4 py-2 bg-none border-none text-sm font-medium cursor-pointer rounded-full transition-all duration-200 min-w-[80px] md:min-w-[90px] ${
                  activeTab === "approved"
                    ? "bg-green-500 text-white font-semibold shadow-sm"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => {
                  setActiveTab("approved")
                  setCurrentPage(1)
                }}
              >
                Approved{" "}
                {isLoadingCounts ? (
                  <div className="animate-pulse bg-gray-300 rounded-full w-5 h-5"></div>
                ) : (
                  <span className={`inline-flex items-center justify-center min-w-[20px] h-[20px] px-1 rounded-full text-[10px] md:text-xs font-semibold ${
                    activeTab === "approved" ? "bg-white/20 text-white" : "bg-green-500 text-white"
                  }`}>
                    {counts.approved}
                  </span>
                )}
              </button>
              
              <button
                className={`flex items-center justify-center gap-2 h-full px-4 py-2 bg-none border-none text-sm font-medium cursor-pointer rounded-full transition-all duration-200 min-w-[100px] md:min-w-[110px] ${
                  activeTab === "declined"
                    ? "bg-red-500 text-white font-semibold shadow-sm"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => {
                  setActiveTab("declined")
                  setCurrentPage(1)
                }}
              >
                Not Approved{" "}
                {isLoadingCounts ? (
                  <div className="animate-pulse bg-gray-300 rounded-full w-5 h-5"></div>
                ) : (
                  <span className={`inline-flex items-center justify-center min-w-[20px] h-[20px] px-1 rounded-full text-[10px] md:text-xs font-semibold ${
                    activeTab === "declined" ? "bg-white/20 text-white" : "bg-red-500 text-white"
                  }`}>
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
                ) : activeTab === "declined" ? (
                  <UserX size={48} className="mb-4 opacity-50" />
                ) : (
                  <User size={48} className="mb-4 opacity-50" />
                )}
                <h3 className="text-lg mb-2 text-gray-700">
                  {activeTab === "all" 
                    ? "No registrations found" 
                    : `No ${formatStatusDisplay(activeTab)} registrations`}
                </h3>
                <p className="text-sm text-gray-500">
                  {activeTab === "pending"
                    ? "New registration requests will appear here"
                    : activeTab === "all"
                    ? "No users match your filters"
                    : `${formatStatusDisplay(activeTab)} registrations will appear here`}
                </p>
              </div>
            ) : (
              <>
                {paginatedRegistrations.map((user) => {
                  const userData = getUserModalData(user)
                  const roleColor = getRoleColor(user.type, user.status)
                  
                  return (
                    <div
                      key={user.id}
                      className="flex items-center p-4 border-b border-gray-100 transition-colors duration-200 min-h-[80px] overflow-y-auto hover:bg-gray-50 last:border-b-0"
                    >
                      <div 
                        className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center text-white font-semibold text-base mr-4 flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => userData?.profilePhoto && openProfilePhotoFullView(
                          userData.profilePhoto, 
                          user.name
                        )}
                      >
                        {userData?.profilePhoto ? (
                          <img 
                            src={userData.profilePhoto} 
                            alt={user.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const fallback = document.createElement('div');
                              fallback.className = 'w-full h-full flex items-center justify-center bg-gray-500 text-white font-semibold';
                              fallback.textContent = user.firstName?.charAt(0) + user.lastName?.charAt(0) || "U";
                              e.target.parentNode.appendChild(fallback);
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-500 text-white font-semibold">
                            {user.firstName?.charAt(0) + user.lastName?.charAt(0) || "U"}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm mb-0.5 break-words flex items-center gap-2">
                          {user.name}
                          
                          {/* Role badge with different colors */}
                          <span className={`text-xs px-2 py-0.5 rounded ${roleColor}`}>
                            {user.type}
                          </span>
                          
                          {/* Status badge - Only show in "all" tab */}
                          {activeTab === "all" && (
                            <span
                              className={`inline-block py-1 px-2 rounded-xl text-xs font-medium text-black ${
                                user.status === "approved"
                                  ? "bg-green-600 text-white"
                                  : user.status === "pending"
                                    ? "bg-orange-500 text-white"
                                    : user.status === "declined"
                                      ? "bg-red-500 text-white"
                                      : ""
                              }`}
                            >
                              {formatStatusDisplay(user.status)}
                            </span>
                          )}
                        </div>
                        <div className="text-gray-500 text-xs mb-0.5 break-words">{user.email}</div>
                        <div className="text-gray-500 text-xs break-words">
                          {user.city}, {user.province}
                          {/* ADD DATE REGISTERED HERE */}
                          {user.dateRegistered && (
                            <span className="text-gray-400 ml-2">• Registered: {user.dateRegistered}</span>
                          )}
                          {user.status === "declined" && user.declineReason
                            ? ` - Reason: ${user.declineReason}`
                            : ""}
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4 flex-wrap">
                        {/* Only View button - No Approve/Decline buttons */}
                        <button
                          className="inline-flex items-center justify-center gap-1 bg-transparent text-blue-700 border border-blue-700 py-1.5 px-3 rounded text-xs font-medium cursor-pointer transition-all hover:bg-blue-100 min-h-[32px]"
                          onClick={() => viewDetails(user.id, user.status, user.type)}
                        >
                          <Eye size={16} />
                          View
                        </button>
                      </div>
                    </div>
                  )
                })}
                
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

    {isViewDetailsModalOpen && selectedUser && (() => {
      const userData = getUserModalData(selectedUser)
      if (!userData) return null
      
      // Get initials for the user
      const getInitials = () => {
        const firstInitial = userData.firstName ? userData.firstName.charAt(0).toUpperCase() : '';
        const lastInitial = userData.lastName ? userData.lastName.charAt(0).toUpperCase() : '';
        return `${firstInitial}${lastInitial}` || 'U';
      };
      
      return (
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

            {/* Header Section */}
            <div className="flex justify-center items-center p-6 border-b border-gray-200 bg-white">
              <div className="flex flex-col items-center text-center gap-3">
                {/* Profile Photo */}
                <div className="flex justify-center mb-1">
                  {userData.profilePhoto ? (
                    <div 
                      className="w-[100px] h-[100px] border-2 border-gray-200 rounded-full flex items-center justify-center bg-white overflow-hidden cursor-pointer hover:border-red-300 transition-colors"
                      onClick={() => openProfilePhotoFullView(
                        userData.profilePhoto, 
                        `${userData.firstName} ${userData.lastName}`
                      )}
                    >
                      <img 
                        src={userData.profilePhoto} 
                        alt="Profile" 
                        className="w-full h-full object-cover rounded-full"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="hidden w-full h-full items-center justify-center bg-gray-100 rounded-full">
                        <span className="text-xl font-semibold text-gray-500">
                          {getInitials()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-[100px] h-[100px] border-2 border-gray-200 rounded-full flex items-center justify-center bg-gray-100">
                      <span className="text-xl font-semibold text-gray-500">
                        {getInitials()}
                      </span>
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex flex-col items-center gap-1">
                  <h3 className="text-lg font-semibold text-gray-900 m-0">
                    {userData.firstName} {userData.middleName ? `${userData.middleName} ` : ''}{userData.lastName}
                  </h3>
                  <div className="text-xs text-gray-500">
                    {userData.email}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${getRoleColor(selectedUser.type, selectedUser.status)}`}>
                      {selectedUser.type}
                    </span>
                    <span
                      className={`py-1 px-2 rounded-xl text-xs font-semibold uppercase ${
                        selectedUser.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : selectedUser.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : selectedUser.status === "declined"
                              ? "bg-red-100 text-red-700"
                              : ""
                      }`}
                    >
                      {formatStatusDisplay(selectedUser.status)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Navigation - Hide Documents tab for Horse Operator */}
            <div className="flex border-b border-gray-200 overflow-x-auto">
              <button
                className={`py-3 px-4 bg-none border-none text-sm font-medium text-gray-500 cursor-pointer border-b-2 border-transparent transition-all duration-200 whitespace-nowrap min-h-[44px] ${
                  modalActiveTab === "personal" ? "text-red-700 border-b-2 border-red-700" : "" }`}
                onClick={() => setModalActiveTab("personal")}
              >
                Personal Info
              </button>
              
              {selectedUser.type === "Veterinarian" && (
                <button
                  className={`py-3 px-4 bg-none border-none text-sm font-medium text-gray-500 cursor-pointer border-b-2 border-transparent transition-all duration-200 whitespace-nowrap min-h-[44px] ${
                    modalActiveTab === "professional" ? "text-red-700 border-b-2 border-red-700" : "" }`}
                  onClick={() => setModalActiveTab("professional")}
                >
                  Professional
                </button>
              )}
              
              {/* Show Documents tab only for Veterinarian and Kutsero, NOT for Horse Operator */}
              {selectedUser.type !== "Horse Operator" && (
                <button
                  className={`py-3 px-4 bg-none border-none text-sm font-medium text-gray-500 cursor-pointer border-b-2 border-transparent transition-all duration-200 whitespace-nowrap min-h-[44px] ${
                    modalActiveTab === "documents" ? "text-red-700 border-b-2 border-red-700" : "" }`}
                  onClick={() => setModalActiveTab("documents")}
                >
                  Documents
                </button>
              )}
            </div>

            {/* Content Area */}
            <div className="py-4">
              {modalActiveTab === "personal" && (
                <div className="space-y-4">
                  {/* Name Information */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <User className="text-red-700 mr-2" size={16} />
                      Name Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">First Name</div>
                        <div className="text-sm text-gray-900 font-medium">
                          {userData.firstName || "Not provided"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Middle Name</div>
                        <div className="text-sm text-gray-900 font-medium">
                          {userData.middleName || "Not provided"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Last Name</div>
                        <div className="text-sm text-gray-900 font-medium">
                          {userData.lastName || "Not provided"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Personal Details */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <CreditCard className="text-red-700 mr-2" size={16} />
                      Personal Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Date of Birth</div>
                        <div className="text-sm text-gray-900 font-medium">
                          {userData.dob || "Not provided"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Sex</div>
                        <div className="text-sm text-gray-900 font-medium">
                          {userData.sex || "Not specified"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Phone Number</div>
                        <div className="text-sm text-gray-900 font-medium">
                          {userData.phone || "Not provided"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Date Registered</div>
                        <div className="text-sm text-gray-900 font-medium">
                          {userData.dateRegistered || "Not available"}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <div className="text-xs text-gray-500 mb-1">Email Address</div>
                        <div className="text-sm text-gray-900 font-medium">
                          {userData.email}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <MapPin className="text-red-700 mr-2" size={16} />
                      Address Information
                    </h4>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Complete Address</div>
                      <div className="text-sm text-gray-900 font-medium bg-white p-3 rounded border border-gray-200">
                        {userData.barangay ? `${userData.barangay}, ` : ''}
                        {userData.city ? `${userData.city}, ` : ''}
                        {userData.province || ''}
                        {userData.zipCode ? ` ${userData.zipCode}` : ''}
                        {!userData.barangay && !userData.city && !userData.province ? "Not specified" : ""}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Professional Info Tab - Only for Veterinarians */}
              {modalActiveTab === "professional" && selectedUser.type === "Veterinarian" && (
                <div className="space-y-4">
                  {/* Professional Information */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <Stethoscope className="text-red-700 mr-2" size={16} />
                      Professional Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">License Number</div>
                        <div className="text-sm text-gray-900 font-medium">
                          {userData.licenseNumber || "Not provided"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Years of Experience</div>
                        <div className="text-sm text-gray-900 font-medium">
                          {userData.experienceYears || "Not specified"}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <div className="text-xs text-gray-500 mb-1">Specialization</div>
                        <div className="text-sm text-gray-900 font-medium">
                          {userData.specialization || "Not specified"}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <div className="text-xs text-gray-500 mb-1">Organization</div>
                        <div className="text-sm text-gray-900 font-medium">
                          {userData.organization || "Not specified"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Clinic Address */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <MapPin className="text-red-700 mr-2" size={16} />
                      Clinic Address
                    </h4>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Complete Clinic Address</div>
                      <div className="text-sm text-gray-900 font-medium bg-white p-3 rounded border border-gray-200">
                        {userData.clinicBarangay ? `${userData.clinicBarangay}, ` : ''}
                        {userData.clinicCity ? `${userData.clinicCity}, ` : ''}
                        {userData.clinicProvince || ''}
                        {userData.clinicZipCode ? ` ${userData.clinicZipCode}` : ''}
                        {!userData.clinicBarangay && !userData.clinicCity && !userData.clinicProvince ? "Not specified" : ""}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Documents Tab - Only for Veterinarian and Kutsero, NOT for Horse Operator */}
              {modalActiveTab === "documents" && selectedUser.type !== "Horse Operator" && (
                <div className="space-y-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <FileText className="text-red-700 mr-2" size={16} />
                      Documents
                    </h4>
                    
                    {/* Years of Experience for Kutsero ONLY - ADDED */}
                    {selectedUser.type === "Kutsero" && (
                      <div className="mb-4 bg-white border border-gray-200 rounded p-3">
                        <div className="text-xs text-gray-500 mb-1">Years of Experience</div>
                        <div className="text-sm text-gray-900 font-medium">
                          {userData.experienceYears || "Not specified"}
                        </div>
                      </div>
                    )}
                    
                    {/* Documents Display */}
                    <div>
                      <div className="text-xs text-gray-500 mb-2">
                        {selectedUser.type === "Veterinarian" ? "License Documents" : "Registration Documents"}
                      </div>
                      <div className="border border-gray-300 rounded-lg p-4 bg-white">
                        {userData.documents && parseDocuments(userData.documents).length > 0 ? (
                          <div className="space-y-3">
                            {parseDocuments(userData.documents).map((docUrl, index) => (
                              <div key={index} className="border border-gray-200 rounded p-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      Document {index + 1}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {docUrl.split('/').pop() || 'Document'}
                                    </p>
                                  </div>
                                  <a 
                                    href={docUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                  >
                                    {docUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) ? 'View Image' : 'View PDF'}
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6">
                            <FileText size={32} className="mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-500">No documents provided</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end pt-4 border-t border-gray-200 gap-2">
              {selectedUser.status === "pending" && (
                <>
                  <button
                    className="inline-flex items-center gap-1.5 py-2 px-4 border-none rounded text-sm font-medium cursor-pointer transition-colors duration-200 bg-green-500 text-white hover:bg-green-600 min-w-[100px] justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => showApproveConfirmation(selectedUser.id, selectedUser.type, `${userData.firstName} ${userData.lastName}`)}
                    disabled={isActionLoading && loadingActionId === selectedUser.id}
                  >
                    {isActionLoading && loadingActionId === selectedUser.id ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    {isActionLoading && loadingActionId === selectedUser.id ? "Processing..." : "Approve"}
                  </button>

                  <button
                    className="inline-flex items-center gap-1.5 py-2 px-4 border-none rounded text-sm font-medium cursor-pointer transition-colors duration-200 bg-red-500 text-white hover:bg-red-600 min-w-[100px] justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => showDeclineConfirmation(selectedUser.id, selectedUser.type, `${userData.firstName} ${userData.lastName}`)}
                    disabled={isActionLoading && loadingActionId === selectedUser.id}
                  >
                    {isActionLoading && loadingActionId === selectedUser.id ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <XCircle size={16} />
                    )}
                    {isActionLoading && loadingActionId === selectedUser.id ? "Processing..." : "Decline"}
                  </button>
                </>
              )}

            </div>
          </div>
        </div>
      )
    })()}
      {isConfirmationModalOpen && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-[1000] modal-overlay"
          ref={confirmationOverlayRef}
        >
          <div className="bg-white rounded-lg p-8 text-center max-w-md w-[90%]">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{confirmationDetails.title}</h3>
            <p className="text-base text-gray-500 mb-6 leading-relaxed">{confirmationDetails.message}</p>

            {confirmationDetails.action === "decline" && (
              <div className="mb-4">
                <textarea
                  placeholder="Enter reason for marking as not approved..."
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="w-full p-3 mt-2.5 rounded border border-gray-300 resize-y min-h-[100px]"
                  disabled={isActionLoading}
                  rows={4}
                />
                {!declineReason.trim() && (
                  <p className="text-sm text-red-500 mt-1">Reason is required</p>
                )}
              </div>
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
                disabled={isActionLoading || (confirmationDetails.action === "decline" && !declineReason.trim())}
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