"use client"
import Sidebar from "@/components/DvmfSidebar"
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  CreditCard,
  Eye,
  FileText,
  Info,
  LogOut,
  MapPin,
  Search,
  SquareX,
  Stethoscope,
  Trash2,
  User,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import FloatingMessages from "./DvmfMessage"
import NotificationModal from "./DvmfNotif"


const API_BASE = "http://127.0.0.1:8000/api/dvmf";

function DvmfAccountApproval() {
  const navigate = useNavigate()

  const [registrationData, setRegistrationData] = useState([])
  const [message, setMessage] = useState("") // For showing confirmation messages
  const [vetProfiles, setVetProfiles] = useState([])

  const [activeTab, setActiveTab] = useState("pending")
  const [recentFilter, setRecentFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false)

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

  // Fetch counts from backend
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const response = await  fetch("http://127.0.0.1:8000/api/dvmf/get-account-counts/")
        if (!response.ok) throw new Error("Failed to fetch data")
        const data = await response.json()
        setCounts(data)
      } catch (error) {
        console.error("Error fetching counts:", error)
      }
    }

    fetchCounts()
  }, [])

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

 const showApproveConfirmation = (vetId) => {
  setSelectedUser({ vet_id: vetId });
  setConfirmationDetails({
    title: "Confirm Approval",
    message: "Are you sure you want to approve this registration?",
    action: "approve",
  });
  setIsConfirmationModalOpen(true);
};


const showDeclineConfirmation = (vetId) => {
  setSelectedUser({ vet_id: vetId });
  setConfirmationDetails({
    title: "Confirm Decline",
    message: "Are you sure you want to decline this registration?",
    action: "decline",
  });
  setIsConfirmationModalOpen(true);
};
const showDeleteConfirmation = (vetId) => {
  console.log("Deleting vet with ID:", vetId); // Check here!
  if (!vetId) {
    alert("Vet ID is invalid.");
    return;
  }

  setSelectedUser({ vet_id: vetId });
  setConfirmationDetails({
    title: "Confirm Delete",
    message: "Are you sure you want to delete this vet profile? This action cannot be undone.",
    action: "delete",
  });
  setIsConfirmationModalOpen(true);
};



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

  const showDeleteConfirmationFromModal = () => {
    if (selectedUser) {
      closeModal()
      showDeleteConfirmation(selectedUser.vet_id)
    }
  }

  const closeConfirmation = () => {
    setIsConfirmationModalOpen(false)
    setSelectedUser(null)
    setConfirmationDetails({ title: "", message: "", action: "" })
  }

  
// -------------------- Delete a single vet profile --------------------
const deleteVetProfile = async (vetId) => {
  if (!vetId) {
    alert("Vet ID is invalid.");
    return;
  }

  const confirmDelete = window.confirm(
    "Are you sure you want to delete this vet profile?"
  );
  if (!confirmDelete) return;

  try {
    const response = await fetch(`${API_BASE}/delete-vet-profile/${vetId}/`, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      alert(data.error || "Failed to delete profile");
      return;
    }

    alert(data.message || "Vet profile deleted successfully");

    setRegistrationData((prev) =>
      prev.filter((user) => user.vet_id !== vetId)
    );
  } catch (err) {
    console.error("Delete error:", err);
    alert("Error deleting vet profile");
  }
};



  const confirmAction = () => {
    if (confirmationDetails.action === "approve" && selectedUser) {
      approveUser(selectedUser.vet_id)
    } else if (confirmationDetails.action === "decline" && selectedUser) {
      declineUser(selectedUser.vet_id)
    } else if (confirmationDetails.action === "delete" && selectedUser) {
      deleteVetProfile(selectedUser.vet_id)
    }
    closeConfirmation()
  }

// -------------------- Approve a single user --------------------
const approveUser = async (vetId) => {
  try {
    // Optimistically update the UI first
    setRegistrationData((prev) =>
      prev.map((u) => (u.vet_id === vetId ? { ...u, status: "approved" } : u))
    );
    setMessage(`Approving user ${vetId}...`);

    const response = await fetch(
      `http://127.0.0.1:8000/api/dvmf/update-vet-status/${vetId}/`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to approve user: ${text}`);
    }

    const data = await response.json();
    setMessage(`User ${vetId} approved successfully!`);
    console.log("User approved:", data);
  } catch (err) {
    console.error(err);
    // Rollback UI if failed
    setRegistrationData((prev) =>
      prev.map((u) => (u.vet_id === vetId ? { ...u, status: "pending" } : u))
    );
    setMessage(`Error: ${err.message}`);
  }
};

// -------------------- Decline a single user --------------------
const declineUser = async (vetId) => {
  try {
    // Optimistically update the UI first
    setRegistrationData((prev) =>
      prev.map((u) => (u.vet_id === vetId ? { ...u, status: "declined" } : u))
    );
    setMessage(`Declining user ${vetId}...`);

    const response = await fetch(
      `http://127.0.0.1:8000/api/dvmf/update-vet-status/${vetId}/`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "declined" }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to decline user: ${text}`);
    }

    const data = await response.json();
    setMessage(`User ${vetId} declined successfully!`);
    console.log("User declined:", data);
  } catch (err) {
    console.error(err);
    // Rollback UI if failed
    setRegistrationData((prev) =>
      prev.map((u) => (u.vet_id === vetId ? { ...u, status: "pending" } : u))
    );
    setMessage(`Error: ${err.message}`);
  }
};

// -------------------- Approve all pending users --------------------
const approveAllPending = async () => {
  if (activeTab !== "pending") return;

  const pendingUsers = registrationData.filter((user) => user.status === "pending");
  if (pendingUsers.length === 0) return;

  setMessage("Approving all pending users...");

  for (const user of pendingUsers) {
    await approveUser(user.vet_id);
  }

  setMessage("All pending users approved successfully!");
};



  const handleSearchInput = (e) => {
    setSearchTerm(e.target.value.toLowerCase())
  }

  const handleRecentFilterChange = (e) => {
    setRecentFilter(e.target.value)
  }

 


  const closeLogoutModal = () => {
    setIsLogoutModalOpen(false)
  }

  const loadStats = useCallback(() => {
    console.log("Loading stats...")
    // In a real app, this would fetch dashboard statistics
  }, [])

  const loadRecentActivities = useCallback(() => {
    console.log("Loading recent activities...")
    // In a real app, this would fetch recent activities
  }, [])

  // ✅ Fetch notifications from backend
  const loadNotifications = useCallback(() => {
    console.log("Loading notifications...")

    fetch("http://127.0.0.1:8000/api/dvmf/get_vetnotifications/")
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



  const loadDashboardData = useCallback(() => {
    loadStats()
    loadRecentActivities()
    loadNotifications()
  }, [loadStats, loadRecentActivities, loadNotifications])

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
      const response = await fetch("http://127.0.0.1:8000/api/dvmf/get-vet-profiles/");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched vet profiles:", data);

      // Process each item safely
      const processedData = data.map((item, index) => {
        // Safely access joined 'status' field
        let statusValue = item.status;
        // If backend join returned nested object, try to get it
        if (!statusValue && item.vet && item.vet.status) {
          statusValue = item.vet.status;
        }

        return {
          ...item,
          status: statusValue || "pending", // fallback if still undefined
          type: item.type || "Veterinarian",
        };
      });

      // Log processed items
      processedData.forEach((item, index) => {
        console.log(`[Processed Item ${index}]`, {
          id: item.vet_id,
          name: `${item.vet_fname} ${item.vet_lname}`,
          status: item.status,
          type: item.type,
          allFields: Object.keys(item),
        });
      });

      setRegistrationData(processedData);

    } catch (error) {
      console.error("Failed to fetch vet profiles:", error);
    }
  };

  loadVetProfiles();
}, []);

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

  const styles = {
    notificationBtn: {
        position: "relative",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    borderRadius: "50%",
    },
    notificationBadge: {
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
    bodyWrapper: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: "#f5f5f5",
      display: "flex",
      height: "100vh",
      overflowX: "hidden",
      width: "100%",
    },
    logouts: {
      padding: "10px",
      borderTop: "1px solid rgba(255, 255, 255, 0.1)",
    },
    logoutBtns: {
      display: "flex",
      alignItems: "center",
      color: "white",
      textDecoration: "none",
      fontSize: "clamp(13px, 2vw, 15px)",
      fontWeight: "500",
      cursor: "pointer",
      padding: "14px 40px",
      borderRadius: "25px",
      transition: "all 0.3s ease",
      minHeight: "44px",
    },
    logoutBtnsHover: {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
    logoutIcons: {
      width: "20px",
      height: "20px",
      marginRight: "15px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "16px",
      flexShrink: "0",
    },
    mainContent: {
      flex: "1",
      display: "flex",
      flexDirection: "column",
      width: "calc(100% - 250px)",
      transition: "margin-left 0.3s ease",
    },
    headers: {
      background: "white",
      padding: "18px 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
      flexWrap: "wrap",
      gap: "16px",
    },
    sidebarToggleBtn: {
      background: "none",
      border: "none",
      color: "#666",
      fontSize: "20px",
      cursor: "pointer",
      padding: "8px",
      minHeight: "44px",
      minWidth: "44px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "color 0.2s",
    },
    sidebarToggleBtnHover: {
      color: "#333",
    },
    searchContainers: {
      flex: "1",
      maxWidth: "400px",
      marginRight: "20px",
      position: "relative",
      minWidth: "200px",
      marginBottom: "10px",
    },
    searchInput: {
      width: "100%",
      padding: "8px 16px 8px 40px",
      border: "2px solid #fff",
      borderRadius: "8px",
      fontSize: "clamp(12px, 2vw, 14px)",
      outline: "none",
      minHeight: "50px",
      background: "#fff",
    },
    searchIcon: {
      position: "absolute",
      left: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      width: "16px",
      height: "16px",
      color: "#6b7280",
    },
    markAllRead: {
      background: "none",
      border: "none",
      color: "#b91c1c",
      fontSize: "12px",
      cursor: "pointer",
      textDecoration: "underline",
    },
    emptyState: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "2rem",
    },
    iconWrapper: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: "1rem",
    },
    emptyStateIcon: {
      fontSize: "48px",
      marginBottom: "16px",
      opacity: "0.5",
    },
    emptyStateH3: {
      fontSize: "18px",
      marginBottom: "8px",
      color: "#374151",
    },
    emptyStateP: {
      fontSize: "14px",
    },
    contentArea: {
      flex: "1",
      padding: "24px",
      background: "#f5f5f5",
      overflowY: "auto",
    },
    pageHeader: {
      marginBottom: "24px",
    },
    h1: {
      fontSize: "clamp(20px, 4vw, 24px)",
      fontWeight: "700",
      color: "#111827",
      marginBottom: "8px",
      lineHeight: "1.2",
    },
    h2: {
      fontSize: "clamp(14px, 2.5vw, 16px)",
      fontWeight: "500",
      color: "#6b7280",
      marginTop: "25px",
      marginBottom: "16px",
      lineHeight: "1.4",
    },
    tabsContainer: {
    display: "flex",
    gap: "16px",
    background: "#e5e2e2ff",
    padding: "0 8px",
    borderRadius: "24px",
    height: "48px",
    width: "370px",
    alignItems: "center",
    marginTop: "20px",
  },
  tab: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    height: "100%",
    padding: "0 12px",
    background: "none",
    border: "none",
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
    cursor: "pointer",
    position: "relative",
    borderRadius: "24px",
    transition: "all 0.2s ease",
  },
  tabHover: {
    backgroundColor: "#ffffff",
    color: "#111827",
  },
  tabActive: {
    fontWeight: "600",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "22px",
    height: "22px",
    padding: "0 6px",
    borderRadius: "50%",
    fontSize: "12px",
    fontWeight: "600",
    color: "#fff",
  },
  badgePending: {
    backgroundColor: "#f59e0b", // orange
  },
  badgeApproved: {
    backgroundColor: "#22c55e", // green
  },
  badgeDeclined: {
    backgroundColor: "#ef4444", // red
  },
    controlsRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
      flexWrap: "wrap",
      gap: "16px",
    },
    filterControls: {
      display: "flex",
      gap: "12px",
      alignItems: "center",
      flexWrap: "wrap",
    },
    filterSelect: {
      padding: "8px 12px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "clamp(12px, 2vw, 14px)",
      background: "white",
      minHeight: "40px",
    },
    approveAllBtn: {
      background: "#22c55e",
      color: "white",
      border: "none",
      padding: "8px 16px",
      borderRadius: "6px",
      fontSize: "clamp(12px, 2vw, 14px)",
      fontWeight: "500",
      cursor: "pointer",
      transition: "background-color 0.2s",
      minHeight: "40px",
    },
    approveAllBtnHover: {
      background: "#16a34a",
    },
    registrationTable: {
      background: "white",
      borderRadius: "8px",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
      overflow: "hidden",
    },
    registrationItem: {
      display: "flex",
      alignItems: "center",
      padding: "16px 20px",
      borderBottom: "1px solid #f3f4f6",
      transition: "background-color 0.2s",
      minHeight: "80px",
      overflowY: "auto",
    },
    registrationItemHover: {
      background: "#f9fafb",
    },
    registrationItemLast: {
      borderBottom: "none",
    },
    userAvatar: {
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      background: "#6b7280",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      fontWeight: "600",
      fontSize: "16px",
      marginRight: "16px",
      flexShrink: "0",
    },
    userInfo: {
      flex: "1",
      minWidth: "0",
    },
    userName: {
      fontWeight: "600",
      color: "#111827",
      fontSize: "clamp(12px, 2vw, 14px)",
      marginBottom: "2px",
      wordWrap: "break-word",
    },
    userEmail: {
      color: "#6b7280",
      fontSize: "clamp(10px, 1.8vw, 12px)",
      marginBottom: "2px",
      wordWrap: "break-word",
    },
    userDetails: {
      color: "#6b7280",
      fontSize: "clamp(10px, 1.8vw, 12px)",
      wordWrap: "break-word",
    },
    userTypeBadge: {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: "12px",
      fontSize: "clamp(9px, 1.5vw, 10px)",
      fontWeight: "500",
      marginLeft: "8px",
      color: "#000",
    },
    userTypeBadgeApproved: {
      backgroundColor: "#539953ff",
      color: "#fff",
    },
    userTypeBadgePending: {
      backgroundColor: "#ffa500",
      color: "#fff",
    },
    userTypeBadgeDeclined: {
      backgroundColor: "#ff4c4c",
      color: "#fff",
    },
    badgeKutsero: {
      background: "#dbeafe",
      color: "#1d4ed8",
    },
    badgeVeterinarian: {
      background: "#dcfce7",
      color: "#166534",
    },
    actionButtons: {
      display: "flex",
      gap: "8px",
      marginLeft: "16px",
      flexWrap: "wrap",
    },
    actionBtn: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "6px 12px",
      border: "none",
      borderRadius: "4px",
      fontSize: "clamp(10px, 1.8vw, 12px)",
      fontWeight: "500",
      cursor: "pointer",
      transition: "all 0.2s",
      minHeight: "32px",
    },
    btnView: {
      background: "#30487a",
      color: "white",
    },
    btnViewHover: {
      background: "#6e7c9b",
    },
    btnDelete: {
      backgroundColor: "#ef4444",
      color: "#fff",
    },
    btnDeleteHover: {
      backgroundColor: "#dc2626",
    },
    btnApprove: {
      backgroundColor: "#22c55e",
      color: "#fff",
    },
    btnApproveHover: {
      backgroundColor: "#16a34a",
    },
    btnDecline: {
      backgroundColor: "#fa1d15ff",
      color: "#000",
    },
    btnDeclineHover: {
      backgroundColor: "rgba(232, 44, 44, 1)ff",
    },
    mobileMenuBtn: {
      display: "none",
      position: "fixed",
      top: "20px",
      left: "20px",
      zIndex: "1001",
      background: "#b91c1c",
      color: "white",
      border: "none",
      padding: "12px",
      borderRadius: "8px",
      fontSize: "18px",
      cursor: "pointer",
      minHeight: "44px",
      minWidth: "44px",
    },
    modalOverlay: {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      background: "rgba(0, 0, 0, 0.5)",
      display: "none",
      justifyContent: "center",
      alignItems: "center",
      zIndex: "1000",
      padding: "20px",
    },
    modalOverlayActive: {
      display: "flex",
    },
    modalContents: {
      background: "white",
      borderRadius: "8px",
      padding: "clamp(20px, 4vw, 32px)",
      width: "90%",
      maxWidth: "1200px",
      maxHeight: "90vh",
      overflowY: "auto",
      position: "relative",
    },
    modalBody: {
      marginBottom: "20px",
    },
    modalSection: {
      marginBottom: "24px",
    },
    modalSectionBox: {
      background: "#f9fafb",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      padding: "16px",
      marginBottom: "16px",
      transition: "box-shadow 0.2s ease",
    },
    modalSectionBoxHover: {
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    },
    sectionHeader: {
      display: "flex",
      alignItems: "center",
      marginBottom: "16px",
      paddingBottom: "8px",
      borderBottom: "1px solid #e5e7eb",
    },
    sectionIcon: {
      color: "#b91c1c",
      marginRight: "8px",
      fontSize: "16px",
      width: "20px",
      textAlign: "center",
    },
    sectionHeaderH4: {
      fontSize: "clamp(14px, 2.5vw, 16px)",
      fontWeight: "600",
      color: "#111827",
      margin: "0",
    },
    modalGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "16px",
    },
    modalField: {
      display: "flex",
      justifyContent: "flex-start",
      alignItems: "flex-start",
      marginBottom: "12px",
      gap: "4px",
    },
    modalFieldFullWidth: {
      gridColumn: "1 / -1",
    },
    modalLabel: {
      fontSize: "clamp(10px, 1.8vw, 12px)",
      color: "#6b7280",
      flexShrink: "0",
      minWidth: "120px",
    },
    modalValue: {
      fontSize: "clamp(12px, 2vw, 14px)",
      fontWeight: "500",
      color: "#111827",
      wordWrap: "break-word",
      flexShrink: "0",
      marginRight: "100%",
    },
    modalClose: {
      position: "absolute",
      top: "16px",
      right: "16px",
      background: "none",
      border: "none",
      fontSize: "24px",
      color: "#6b7280",
      cursor: "pointer",
      padding: "4px",
      lineHeight: "1",
      minHeight: "32px",
      minWidth: "32px",
    },
    modalCloseHover: {
      color: "#374151",
    },
    modalFooter: {
      display: "flex",
      justifyContent: "flex-end",
      paddingTop: "16px",
      borderTop: "1px solid #e5e7eb",
      gap: "12px",
      flexWrap: "wrap",
    },
    modalFooterCloseOnly: {
      justifyContent: "flex-end",
    },
    modalBtn: {
      background: "#6b7280",
      color: "white",
      border: "none",
      padding: "8px 16px",
      borderRadius: "6px",
      fontSize: "clamp(12px, 2vw, 14px)",
      fontWeight: "500",
      cursor: "pointer",
      transition: "background-color 0.2s",
      flex: "1",
      minHeight: "40px",
    },
    modalBtnHover: {
      background: "#4b5563",
    },
    modalBtnApprove: {
      background: "#22c55e",
      color: "white",
    },
    modalBtnApproveHover: {
      background: "#16a34a",
    },
    modalBtnDecline: {
      background: "#ef4444",
      color: "white",
    },
    modalBtnDeclineHover: {
      background: "#dc2626",
    },
    confirmationModal: {
      background: "white",
      borderRadius: "8px",
      padding: "clamp(20px, 4vw, 30px)",
      textAlign: "center",
      maxWidth: "400px",
      width: "90%",
    },
    confirmationModalH3: {
      fontSize: "clamp(16px, 3vw, 18px)",
      fontWeight: "600",
      color: "#111827",
      marginBottom: "12px",
    },
    confirmationModalP: {
      fontSize: "clamp(14px, 2.5vw, 16px)",
      color: "#6b7280",
      marginBottom: "24px",
      lineHeight: "1.4",
    },
    confirmationButtons: {
      display: "flex",
      gap: "12px",
      justifyContent: "center",
      flexWrap: "wrap",
    },
    confirmationBtn: {
      padding: "8px 16px",
      border: "none",
      borderRadius: "6px",
      fontSize: "clamp(12px, 2vw, 14px)",
      fontWeight: "500",
      cursor: "pointer",
      transition: "background-color 0.2s",
      minHeight: "40px",
      flex: "1",
      minWidth: "80px",
    },
    confirmationBtnCancel: {
      background: "#6b7280",
      color: "white",
    },
    confirmationBtnCancelHover: {
      background: "#4b5563",
    },
    confirmationBtnConfirm: {
      background: "#22c55e",
      color: "white",
    },
    confirmationBtnConfirmHover: {
      background: "#16a34a",
    },
    confirmationBtnConfirmDecline: {
      background: "#ef4444",
    },
    confirmationBtnConfirmDeclineHover: {
      background: "#dc2626",
    },
    modalUserBadge: {
      backgroundColor: "#52e577ff",
      color: "white",
      padding: "4px 10px",
      borderRadius: "12px",
      fontSize: "0.9rem",
      fontWeight: "bold",
      display: "inline-block",
      textTransform: "capitalize",
    },
    logoutModal: {
      background: "white",
      borderRadius: "12px",
      padding: "32px",
      width: "90%",
      maxWidth: "400px",
      textAlign: "center",
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
    },
    logoutModalIcon: {
      width: "64px",
      height: "64px",
      background: "#fef3c7",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 20px",
    },
    logoutModalIconI: {
      fontSize: "28px",
      color: "#f59e0b",
    },
    logoutModalH3: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#111827",
      marginBottom: "12px",
    },
    logoutModalP: {
      fontSize: "16px",
      color: "#6b7280",
      marginBottom: "32px",
      lineHeight: "1.5",
    },
    logoutModalButtons: {
      display: "flex",
      gap: "12px",
      justifyContent: "center",
      flexWrap: "wrap",
    },
    logoutModalBtn: {
      padding: "12px 24px",
      border: "none",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
      transition: "all 0.2s",
      minWidth: "100px",
      minHeight: "44px",
    },
    logoutModalBtnCancel: {
      background: "#f3f4f6",
      color: "#374151",
    },
    logoutModalBtnCancelHover: {
      background: "#e5e7eb",
    },
    logoutModalBtnConfirm: {
      background: "#ef4444",
      color: "white",
    },
    logoutModalBtnConfirmHover: {
      background: "#dc2626",
    },
    modalAvatar: {
      width: "60px",
      height: "60px",
      borderRadius: "50%",
      backgroundColor: "#6b7280",
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: "bold",
      fontSize: "20px",
      position: "relative",
    },
    modalBtns: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "8px 18px",
      border: "none",
      borderRadius: "5px",
      cursor: "pointer",
      fontWeight: "500",
      fontSize: "14px",
    },
    modalBtnsApprove: {
      backgroundColor: "#27ae60",
      color: "white",
    },
    modalBtnsDecline: {
      backgroundColor: "#e74c3c",
      color: "white",
    },
    modalBtnsClose: {
      backgroundColor: "#73797a",
      color: "white",
    },
    modalBtnsHover: {
      opacity: "0.9",
    },
    modalBtnsDelete: {
      backgroundColor: "#ef4444",
      color: "white",
    },
    modalBtnsDeleteHover: {
      backgroundColor: "#dc2626",
    },
    modalStatusWrapper: {
      display: "flex",
      alignItems: "center",
      position: "absolute",
      bottom: "0",
      right: "-60px",
      gap: "4px",
    },
    modalStatusCircle: {
      width: "16px",
      height: "16px",
      borderRadius: "50%",
      border: "2px solid white",
    },
    modalStatusText: {
      fontSize: "12px",
      fontWeight: "600",
      textTransform: "capitalize",
    },
    modalStatusCirclePending: {
      backgroundColor: "#ffe066",
    },
    modalStatusCircleApproved: {
      backgroundColor: "#2ecc71",
    },
    modalStatusCircleDeclined: {
      backgroundColor: "#e74c3c",
    },
    modalStatusTextPending: {
      color: "#856404",
    },
    modalStatusTextApproved: {
      color: "#155724",
    },
    modalStatusTextDeclined: {
      color: "#721c24",
    },
    deleteAllBtnHover: {
      backgroundColor: "#b02a37",
      transform: "translateY(-1px)",
    },
    deleteAllBtnFocus: {
      outline: "none",
      boxShadow: "0 0 0 3px rgba(220, 53, 69, 0.4)",
    },
    modalHeaders: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "32px 16px",
      borderBottom: "1px solid #e5e7eb",
      backgroundColor: "#fff",
    },
    profileSection: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      gap: "16px",
    },
    profileAvatarContainer: {
      display: "flex",
      justifyContent: "center",
      marginBottom: "8px",
    },
    profileAvatarCircle: {
      width: "120px",
      height: "120px",
      border: "2px solid #e5e7eb",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#fff",
    },
    profileText: {
      fontSize: "16px",
      fontWeight: "500",
      color: "#6b7280",
    },
    profileInfo: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "8px",
    },
    profileName: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#111827",
      margin: "0",
    },
    profileRole: {
      fontSize: "16px",
      color: "#6b7280",
      margin: "0",
    },
    profileStatus: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginTop: "4px",
    },
    statusLabel: {
      fontSize: "14px",
      color: "#111827",
      fontWeight: "500",
    },
    statusBadge: {
      padding: "4px 12px",
      borderRadius: "16px",
      fontSize: "12px",
      fontWeight: "600",
      textTransform: "uppercase",
    },
    statusBadgePending: {
      backgroundColor: "#fef3c7",
      color: "#d97706",
    },
    statusBadgeApproved: {
      backgroundColor: "#d1fae5",
      color: "#059669",
    },
    statusBadgeDeclined: {
      backgroundColor: "#fee2e2",
      color: "#dc2626",
    },
    modalTabs: {
      display: "flex",
      borderBottom: "1px solid #e5e7eb",
    },
    tabButton: {
      padding: "12px 24px",
      background: "none",
      border: "none",
      fontSize: "clamp(12px, 2vw, 14px)",
      fontWeight: "500",
      color: "#6b7280",
      cursor: "pointer",
      borderBottom: "2px solid transparent",
      transition: "all 0.2s",
      whiteSpace: "nowrap",
      minHeight: "44px",
    },
    tabButtonActive: {
      color: "#b91c1c",
      borderBottom: "none",
    },
    tabButtonHover: {
  backgroundColor: "transparent",
  color: "inherit", // keeps the original text color
  },

    documentsContainer: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      border: "1px dashed #ccc",
      borderRadius: "8px",
      textAlign: "center",
    },
    documentImageContainer: {
      position: "relative",
      width: "100%",
      maxWidth: "400px",
    },
    documentImage: {
      width: "100%",
      height: "auto",
      borderRadius: "8px",
      display: "block",
    },
    documentPlaceholder: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      color: "#999",
    },
    documentPlaceholderSvg: {
      marginBottom: "10px",
    },
    accountTitle: {
      fontSize: "25px",
      fontWeight: "bold",
      color: "#da2424ff",
    },
  }

  return (
    <div style={styles.bodyWrapper}>
      {/* Internal CSS here */}

      <div className="sidebars" id="sidebasr">
        <Sidebar isOpen={isSidebarsOpen} />
      </div>
      <div className="main-content" style={styles.mainContent}>
        <header className="headers" style={styles.headers}>
          <h1 className="account-title" style={styles.accountTitle}>
            Account Approval
          </h1>

          {/* 🔔 Notification Bell */}
            <button
              style={styles.notificationBtn}
              onClick={() => setNotifsOpen(!notifsOpen)}
            >
              <Bell size={24} color="#374151" />
              {notifications.length > 0 && (
                <span style={styles.notificationBadge}>{notifications.length}</span>
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
        <div className="content-area" style={styles.contentArea}>
          <div className="page-header" style={styles.pageHeader}>
            <div className="search-containers" style={styles.searchContainers}>
              <Search className="search-icon" size={18} style={styles.searchIcon} />
              <input
                type="text"
                className="search-input"
                placeholder="Search......"
                onChange={handleSearchInput}
                style={styles.searchInput}
              />
            </div>

            <div className="tabs-container" style={styles.tabsContainer}>
              {/* Pending Tab */}
              <button
                className={`tab ${activeTab === "pending" ? "active" : ""}`}
                onClick={() => setActiveTab("pending")}
                style={{
                  ...styles.tab,
                  ...(activeTab === "pending" ? styles.tabActive : styles.tabHover),
                }}
              >
                Pending{" "}
                <span
                  className="badge badge-pending"
                  style={{ ...styles.badge, ...styles.badgePending }}
                >
                  {counts.pending}
                </span>
              </button>

              {/* Approved Tab */}
              <button
                className={`tab ${activeTab === "approved" ? "active" : ""}`}
                onClick={() => setActiveTab("approved")}
                style={{
                  ...styles.tab,
                  ...(activeTab === "approved" ? styles.tabActive : styles.tabHover),
                }}
              >
                Approved{" "}
                <span
                  className="badge badge-approved"
                  style={{ ...styles.badge, ...styles.badgeApproved }}
                >
                  {counts.approved}
                </span>
              </button>

              {/* Declined Tab */}
              <button
                className={`tab ${activeTab === "declined" ? "active" : ""}`}
                onClick={() => setActiveTab("declined")}
                style={{
                  ...styles.tab,
                  ...(activeTab === "declined" ? styles.tabActive : styles.tabHover),
                }}
              >
                Declined{" "}
                <span
                  className="badge badge-declined"
                  style={{ ...styles.badge, ...styles.badgeDeclined }}
                >
                  {counts.declined}
                </span>
              </button>
            </div>

          </div>
          <div className="controls-row" style={styles.controlsRow}>
            <div className="filter-controls" style={styles.filterControls}>
              <select
                className="filter-select"
                value={recentFilter}
                onChange={handleRecentFilterChange}
                style={styles.filterSelect}
              >
                <option value="all">Most Recent</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            {activeTab === "pending" && (
              <button
                className="approve-all-btn"
                onClick={approveAllPending}
                style={{ ...styles.approveAllBtn, ...styles.approveAllBtnHover }}
              >
                Approve All
              </button>
            )}

            {/* For Approved Tab */}
            {activeTab === "approved"}
          </div>
          <div className="registration-table" id="registrationTable" style={styles.registrationTable}>
            {filteredRegistrations.length === 0 ? (
              <div className="empty-state" style={styles.emptyState}>
                {activeTab === "pending" ? (
                  <Clock size={48} style={styles.emptyStateIcon} />
                ) : activeTab === "approved" ? (
                  <UserCheck size={48} style={styles.emptyStateIcon} />
                ) : (
                  <UserX size={48} style={styles.emptyStateIcon} />
                )}
                <h3 style={styles.emptyStateH3}>No {activeTab === "pending" ? "pending" : activeTab} registrations</h3>
                <p style={styles.emptyStateP}>
                  {activeTab === "pending"
                    ? "New registration requests will appear here"
                    : `${activeTab} registrations will appear here`}
                </p>
              </div>
            ) : (
              filteredRegistrations.map((user) => (
                <div key={user.vet_id} className="registration-item" style={styles.registrationItem}>
                  <div className="user-avatar" style={styles.userAvatar}>
                    {user.vet_fname.charAt(0) + user.vet_lname.charAt(0)}
                  </div>

                  <div className="user-info" style={styles.userInfo}>
                    <div className="user-name" style={styles.userName}>
                      {user.vet_fname} {user.vet_mname} {user.vet_lname}
                      <span
                        className={`user-type-badge badge-${user.users?.status}`}
                        style={{
                          ...styles.userTypeBadge,
                          ...(user.users?.status === "approved" ? styles.userTypeBadgeApproved : {}),
                          ...(user.users?.status === "pending" ? styles.userTypeBadgePending : {}),
                          ...(user.users?.status === "declined" ? styles.userTypeBadgeDeclined : {}),
                        }}
                      >
                        {user.users?.status}
                      </span>
                    </div>
                    <div className="user-email" style={styles.userEmail}>
                      {user.vet_email}
                    </div>
                    <div className="user-details" style={styles.userDetails}>
                      {user.vet_city}, {user.vet_province}
                    </div>
                  </div>

                  <div className="action-buttons" style={styles.actionButtons}>
                    <button
                      className="action-btn btn-view"
                      onClick={() => viewDetails(user.id, user.users?.status)}
                      style={{ ...styles.actionBtn, ...styles.btnView }}
                    >
                      <Eye size={16} style={{ marginRight: "6px" }} />
                      View
                    </button>

                    {user.users?.status === "pending" && (
                      <>
                        <button
                          className="action-btn btn-approve"
                          onClick={() => showApproveConfirmation(user.vet_id)}
                          style={{ ...styles.actionBtn, ...styles.btnApprove }}
                        >
                          <CheckCircle size={16} style={{ marginRight: "6px" }} />
                          Approve
                        </button>
                        <button
                          className="action-btn btn-decline"
                          onClick={() => showDeclineConfirmation(user.vet_id)}
                          style={{ ...styles.actionBtn, ...styles.btnDecline }}
                        >
                          <XCircle size={16} style={{ marginRight: "6px" }} />
                          Decline
                        </button>
                      </>
                    )}

                    {(user.users?.status === "approved" || user.users?.status === "declined") && (
                      <button
                        className="action-btn btn-delete"
                        onClick={() => showDeleteConfirmation(user.vet_id)}
                        style={{ ...styles.actionBtn, ...styles.btnDelete }}
                      >
                        <Trash2 size={16} style={{ marginRight: "6px" }} />
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
      <FloatingMessages />
      {/* View Details Modal */}
      {isViewDetailsModalOpen && selectedUser && (
        <div
          className="modal-overlay active"
          ref={viewDetailsModalOverlayRef}
          style={{ ...styles.modalOverlay, ...styles.modalOverlayActive }}
        >
          <div className="modal-contents" style={styles.modalContents}>
            <button className="modal-close" onClick={closeModal} style={styles.modalClose}>
              &times;
            </button>

            <div className="modal-headers" style={styles.modalHeaders}>
              <div className="profile-section" style={styles.profileSection}>
                <div className="profile-avatar-container" style={styles.profileAvatarContainer}>
                  <div className="profile-avatar-circle" style={styles.profileAvatarCircle}>
                    <span className="profile-text" style={styles.profileText}>
                      Profile
                    </span>
                  </div>
                </div>

                <div className="profile-info" style={styles.profileInfo}>
                  <h3 className="profile-name" style={styles.profileName}>
                    {selectedUser.vet_fname} {selectedUser.vet_mname} {selectedUser.vet_lname}
                  </h3>
                  <p className="profile-role" style={styles.profileRole}>
                    {selectedUser.type}
                  </p>
                  <div className="profile-status" style={styles.profileStatus}>
                    <span className="status-label" style={styles.statusLabel}>
                      Current Status:
                    </span>
                    <span
                      className={`status-badge status-${selectedUser.users?.status}`}
                      style={{
                        ...styles.statusBadge,
                        ...(selectedUser.users?.status === "pending" ? styles.statusBadgePending : {}),
                        ...(selectedUser.users?.status === "approved" ? styles.statusBadgeApproved : {}),
                        ...(selectedUser.users?.status === "declined" ? styles.statusBadgeDeclined : {}),
                      }}
                    >
                      {selectedUser.users?.status.charAt(0).toUpperCase() + selectedUser.users?.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-tabs" style={styles.modalTabs}>
              <button
                className={`tab-button ${modalActiveTab === "personal" ? "active" : ""}`}
                onClick={() => setModalActiveTab("personal")}
                style={{
                  ...styles.tabButton,
                  ...(modalActiveTab === "personal" ? styles.tabButtonActive : {}),
                  ...(modalActiveTab === "personal" ? {} : styles.tabButtonHover),
                }}
              >
                Personal Information
              </button>
              <button
                className={`tab-button ${modalActiveTab === "professional" ? "active" : ""}`}
                onClick={() => setModalActiveTab("professional")}
                style={{
                  ...styles.tabButton,
                  ...(modalActiveTab === "professional" ? styles.tabButtonActive : {}),
                  ...(modalActiveTab === "professional" ? {} : styles.tabButtonHover),
                }}
              >
                Professional Info
              </button>
              <button
                className={`tab-button ${modalActiveTab === "documents" ? "active" : ""}`}
                onClick={() => setModalActiveTab("documents")}
                style={{
                  ...styles.tabButton,
                  ...(modalActiveTab === "documents" ? styles.tabButtonActive : {}),
                  ...(modalActiveTab === "documents" ? {} : styles.tabButtonHover),
                }}
              >
                Documents
              </button>
            </div>

            <div className="modal-body" style={styles.modalBody}>
              {modalActiveTab === "personal" && (
                <>
                  <div className="modal-section-box" style={styles.modalSectionBox}>
                    <div className="section-header" style={styles.sectionHeader}>
                      <User className="section-icon" size={20} style={styles.sectionIcon} />
                      <h4 style={styles.sectionHeaderH4}>Name Information</h4>
                    </div>
                    <div className="modal-grid" style={styles.modalGrid}>
                      <div className="modal-field" style={styles.modalField}>
                        <span className="modal-label" style={styles.modalLabel}>
                          First Name:
                        </span>
                        <div className="modal-value" style={styles.modalValue}>
                          {selectedUser.vet_fname}
                        </div>
                      </div>
                      <div className="modal-field" style={styles.modalField}>
                        <span className="modal-label" style={styles.modalLabel}>
                          Middle Name:
                        </span>
                        <div className="modal-value" style={styles.modalValue}>
                          {selectedUser.vet_mname}
                        </div>
                      </div>
                      <div className="modal-field" style={styles.modalField}>
                        <span className="modal-label" style={styles.modalLabel}>
                          Last Name:
                        </span>
                        <div className="modal-value" style={styles.modalValue}>
                          {selectedUser.vet_lname}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="modal-section-box" style={styles.modalSectionBox}>
                    <div className="section-header" style={styles.sectionHeader}>
                      <CreditCard className="section-icon" size={20} style={styles.sectionIcon} />
                      <h4 style={styles.sectionHeaderH4}>Personal Information</h4>
                    </div>
                    <div className="modal-grid" style={styles.modalGrid}>
                      <div className="modal-field" style={styles.modalField}>
                        <span className="modal-label" style={styles.modalLabel}>
                          Date of Birth:
                        </span>
                        <div className="modal-value" style={styles.modalValue}>
                          {selectedUser.vet_dob}
                        </div>
                      </div>
                      <div className="modal-field" style={styles.modalField}>
                        <span className="modal-label" style={styles.modalLabel}>
                          Sex:
                        </span>
                        <div className="modal-value" style={styles.modalValue}>
                          {selectedUser.vet_sex || "Not specified"}
                        </div>
                      </div>
                      <div
                        className="modal-field full-width"
                        style={{ ...styles.modalField, ...styles.modalFieldFullWidth }}
                      >
                        <span className="modal-label" style={styles.modalLabel}>
                          Phone Number:
                        </span>
                        <div className="modal-value" style={styles.modalValue}>
                          {selectedUser.vet_phone_num}
                        </div>
                      </div>
                      <div
                        className="modal-field full-width"
                        style={{ ...styles.modalField, ...styles.modalFieldFullWidth }}
                      >
                        <span className="modal-label" style={styles.modalLabel}>
                          Email:
                        </span>
                        <div className="modal-value" style={styles.modalValue}>
                          {selectedUser.vet_email}
                        </div>
                      </div>
                      <div
                        className="modal-field full-width"
                        style={{ ...styles.modalField, ...styles.modalFieldFullWidth }}
                      >
                        <span className="modal-label" style={styles.modalLabel}>
                          Facebook:
                        </span>
                        <div className="modal-value" style={styles.modalValue}>
                          {selectedUser.facebook}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="modal-section-box" style={styles.modalSectionBox}>
                    <div className="section-header" style={styles.sectionHeader}>
                      <MapPin className="section-icon" size={20} style={styles.sectionIcon} />
                      <h4 style={styles.sectionHeaderH4}>Address Information</h4>
                    </div>
                    <div className="modal-grid" style={styles.modalGrid}>
                      <div className="modal-field" style={styles.modalField}>
                        <span className="modal-label" style={styles.modalLabel}>
                          Province:
                        </span>
                        <div className="modal-value" style={styles.modalValue}>
                          {selectedUser.vet_province}
                        </div>
                      </div>
                      <div className="modal-field" style={styles.modalField}>
                        <span className="modal-label" style={styles.modalLabel}>
                          City:
                        </span>
                        <div className="modal-value" style={styles.modalValue}>
                          {selectedUser.vet_city}
                        </div>
                      </div>
                      <div className="modal-field" style={styles.modalField}>
                        <span className="modal-label" style={styles.modalLabel}>
                          Barangay:
                        </span>
                        <div className="modal-value" style={styles.modalValue}>
                          {selectedUser.vet_brgy}
                        </div>
                      </div>
                      <div className="modal-field" style={styles.modalField}>
                        <span className="modal-label" style={styles.modalLabel}>
                          Zip Code:
                        </span>
                        <div className="modal-value" style={styles.modalValue}>
                          {selectedUser.vet_zipcode}
                        </div>
                      </div>
                      <div
                        className="modal-field full-width"
                        style={{ ...styles.modalField, ...styles.modalFieldFullWidth }}
                      >
                        <span className="modal-label" style={styles.modalLabel}>
                          Complete Address:
                        </span>
                        <div
                          className="modal-value"
                          style={styles.modalValue}
                        >{`${selectedUser.vet_brgy}, ${selectedUser.vet_city}, ${selectedUser.vet_province}`}</div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {modalActiveTab === "professional" && (
                <div className="modal-section-box" style={styles.modalSectionBox}>
                  <div className="section-header" style={styles.sectionHeader}>
                    <Stethoscope className="section-icon" size={20} style={styles.sectionIcon} />
                    <h4 style={styles.sectionHeaderH4}>Professional Information</h4>
                  </div>
                  <div className="modal-grid" style={styles.modalGrid}>
                    <div className="modal-field" style={styles.modalField}>
                      <span className="modal-label" style={styles.modalLabel}>
                        License Number:
                      </span>
                      <div className="modal-value" style={styles.modalValue}>
                        {selectedUser.vet_license_num || "Not provided"}
                      </div>
                    </div>
                    <div className="modal-field" style={styles.modalField}>
                      <span className="modal-label" style={styles.modalLabel}>
                        Experience Years:
                      </span>
                      <div className="modal-value" style={styles.modalValue}>
                        {selectedUser.vet_exp_yr || "Not specified"}
                      </div>
                    </div>
                    <div
                      className="modal-field full-width"
                      style={{ ...styles.modalField, ...styles.modalFieldFullWidth }}
                    >
                      <span className="modal-label" style={styles.modalLabel}>
                        Specialization:
                      </span>
                      <div className="modal-value" style={styles.modalValue}>
                        {selectedUser.vet_specialization || "Not specified"}
                      </div>
                    </div>
                    <div
                      className="modal-field full-width"
                      style={{ ...styles.modalField, ...styles.modalFieldFullWidth }}
                    >
                      <span className="modal-label" style={styles.modalLabel}>
                        Organization:
                      </span>
                      <div className="modal-value" style={styles.modalValue}>
                        {selectedUser.vet_org || "Not specified"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalActiveTab === "documents" && (
                <div className="modal-section-box" style={styles.modalSectionBox}>
                  <div className="section-header" style={styles.sectionHeader}>
                    <FileText className="section-icon" size={20} style={styles.sectionIcon} />
                    <h4 style={styles.sectionHeaderH4}>Documents</h4>
                  </div>
                  <div className="documents-container" style={styles.documentsContainer}>
                    {selectedUser.vet_doc_image ? (
                      <div className="document-image-container" style={styles.documentImageContainer}>
                        <img
                          src={selectedUser.vet_doc_image || "/placeholder.svg"}
                          alt="Veterinarian License Document"
                          className="document-image"
                          style={styles.documentImage}
                          onError={(e) => {
                            e.target.style.display = "none"
                            e.target.nextSibling.style.display = "block"
                          }}
                        />
                        <div
                          className="document-placeholder"
                          style={{ ...styles.documentPlaceholder, display: "none" }}
                        >
                          <FileText size={48} style={styles.documentPlaceholderSvg} />
                          <p style={styles.emptyStateP}>Document image not available</p>
                        </div>
                      </div>
                    ) : (
                      <div className="document-placeholder" style={styles.documentPlaceholder}>
                        <FileText size={48} style={styles.documentPlaceholderSvg} />
                        <p style={styles.emptyStateP}>No document provided</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={styles.modalFooter}>
              <button
                className="modal-btns close"
                onClick={closeModal}
                style={{ ...styles.modalBtns, ...styles.modalBtnsClose }}
              >
                <SquareX size={16} style={{ marginRight: "1px" }} />
                Close
              </button>

              {(registrationData.find((u) => u.id === selectedUser.id)?.users?.status || selectedUser.users?.status) ===
                "pending" && (
                <>
                  <button
                    className="modal-btns approve"
                    onClick={showApproveConfirmationFromModal}
                    style={{ ...styles.modalBtns, ...styles.modalBtnsApprove }}
                  >
                    <CheckCircle size={16} style={{ marginRight: "1px" }} />
                    Approve
                  </button>
                  <button
                    className="modal-btns decline"
                    onClick={showDeclineConfirmationFromModal}
                    style={{ ...styles.modalBtns, ...styles.modalBtnsDecline }}
                  >
                    <XCircle size={16} style={{ marginRight: "1px" }} />
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
        <div
          className="modal-overlay active"
          ref={confirmationOverlayRef}
          style={{ ...styles.modalOverlay, ...styles.modalOverlayActive }}
        >
          <div className="confirmation-modal" style={styles.confirmationModal}>
            <h3 id="confirmationTitle" style={styles.confirmationModalH3}>
              {confirmationDetails.title}
            </h3>
            <p id="confirmationMessage" style={styles.confirmationModalP}>
              {confirmationDetails.message}
            </p>
            <div className="confirmation-buttons" style={styles.confirmationButtons}>
              <button
                className="confirmation-btn cancel"
                onClick={closeConfirmation}
                style={{ ...styles.confirmationBtn, ...styles.confirmationBtnCancel }}
              >
                Cancel
              </button>
              <button
                className={`confirmation-btn confirm ${confirmationDetails.action === "decline" ? "decline" : confirmationDetails.action === "delete" ? "delete" : ""}`}
                onClick={confirmAction}
                style={{
                  ...styles.confirmationBtn,
                  ...(confirmationDetails.action === "approve" ? styles.confirmationBtnConfirm : {}),
                  ...(confirmationDetails.action === "decline"
                    ? { ...styles.confirmationBtnConfirm, ...styles.confirmationBtnConfirmDecline }
                    : {}),
                  ...(confirmationDetails.action === "delete"
                    ? { ...styles.confirmationBtnConfirm, ...styles.confirmationBtnConfirmDecline }
                    : {}),
                }}
              >
                {confirmationDetails.action === "approve"
                  ? "Approve"
                  : confirmationDetails.action === "decline"
                    ? "Decline"
                    : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Modal */}
      {isLogoutModalOpen && (
        <div
          className="modal-overlay active"
          ref={logoutModalRef}
          style={{ ...styles.modalOverlay, ...styles.modalOverlayActive }}
        >
          <div className="logout-modal" style={styles.logoutModal}>
            <div className="logout-modal-icon" style={styles.logoutModalIcon}>
              <LogOut size={25} color="#f59e0b" style={styles.logoutModalIconI} />
            </div>
            <h3 style={styles.logoutModalH3}>Confirm Logout</h3>
            <p style={styles.logoutModalP}>Are you sure you want to log out of your account?</p>
            <div className="logout-modal-buttons" style={styles.logoutModalButtons}>
              <button
                className="logout-modal-btn cancel"
                onClick={closeLogoutModal}
                style={{ ...styles.logoutModalBtn, ...styles.logoutModalBtnCancel }}
              >
                No
              </button>
              <button
                className="logout-modal-btn confirm"
                onClick={confirmLogout}
                style={{ ...styles.logoutModalBtn, ...styles.logoutModalBtnConfirm }}
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

export default DvmfAccountApproval
