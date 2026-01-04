import Sidebar from "@/components/DvmfSidebar"
import jsPDF from "jspdf"
import {
  AlertTriangle,
  Award,
  Bell,
  Building,
  Calendar,
  CheckCircle,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Folder,
  Info,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  User,
  X,
  XCircle
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import FloatingMessages from "./DvmfMessage"
import NotificationModal from "./DvmfNotif"

const initialDirectoryData = []
const initialNotifications = []

const API_BASE = "http://localhost:8000/api/dvmf";

function DvmfDirectory() {
  const navigate = useNavigate()
  const [notifsOpen, setNotifsOpen] = useState(false)
  const [directoryData, setDirectoryData] = useState(initialDirectoryData)
  const [filteredDirectoryData, setFilteredDirectoryData] = useState(initialDirectoryData)

  // Fixed tab state - using consistent values
  const [currentPage, setCurrentPage] = useState(1)
  const [currentTab, setCurrentTab] = useState("all")

  const [areaFilter, setAreaFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [notifications, setNotifications] = useState(initialNotifications)
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const notificationBellRef = useRef(null)
  const notificationDropdownRef = useRef(null)
  const sidebarRef = useRef(null)
  const [directory, setDirectory] = useState([])
  const [loading, setLoading] = useState(true) // Changed to true initially
  const [error, setError] = useState(null)

  // State for profile modal
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState(null)

  // Pagination state
  const [currentPagePagination, setCurrentPagePagination] = useState(1)
  const [itemsPerPagePagination, setItemsPerPagePagination] = useState(10)

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false)

  // New state for role filter
  const [roleFilter, setRoleFilter] = useState("all")

  // Add this state for current user
  const [currentUser, setCurrentUser] = useState(null);

  // Helper function to format status display
  const formatStatusDisplay = (status) => {
    if (!status) return "";
    if (status === "declined") return "Not approved";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

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

  // Fetch current user from backend
  const fetchCurrentUser = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/dvmf/get_current_user/", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const userData = await response.json();
      setCurrentUser(userData);
      return userData;
    } catch (error) {
      console.error("Failed to fetch current user:", error);
      return null;
    }
  };

  // MARK ALL NOTIFICATIONS AS READ
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

      // Update frontend state
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
      
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

// HANDLE INDIVIDUAL NOTIFICATION CLICK - UPDATED WITH HORSE OPERATOR & KUTSERO
const handleNotificationClick = async (notification) => {
  const notifId = notification?.notif_id || notification?.id;

  if (!notifId) {
    console.warn("Notification ID is missing:", notification);
  }

  setNotifications((prev) =>
    prev.map((notif) =>
      notif.notif_id === notifId || notif.id === notifId
        ? { ...notif, read: true }
        : notif
    )
  );

  if (notifId) {
    try {
      await fetch(`${API_BASE_URL}/mark_notification_read/${notifId}/`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  }

  const message = (notification.message || "").toLowerCase();
  const type = (notification.type || "").toLowerCase();

  // SOS & Emergency Notifications
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

    navigate("/DvmfDashboard", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
        sosId: sosId,
      },
    });
    return;
  }

  // VETERINARIAN Account Approvals
  if (
    message.includes("veterinarian") && 
    (message.includes("registration") ||
     message.includes("approved") ||
     message.includes("declined") ||
     message.includes("pending") ||
     message.includes("needs approval"))
  ) {
    navigate("/DvmfAccountApproval", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
        tab: "veterinarian", // ADDED: Specify veterinarian tab
      },
    });
    return;
  }

  // HORSE OPERATOR Account Approvals - NEW
  if (
    message.includes("horse-operator") ||
    message.includes("horse operator") ||
    (message.includes("horse") && message.includes("operator") && 
     (message.includes("registration") || 
      message.includes("approved") || 
      message.includes("declined") || 
      message.includes("pending")))
  ) {
    navigate("/DvmfAccountApproval", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
        tab: "horse-operator", // ADDED: Specify horse-operator tab
      },
    });
    return;
  }

  // KUTSERO Account Approvals - NEW
  if (
    message.includes("kutsero") ||
    (message.includes("registration") && message.includes("kutsero")) ||
    (message.includes("kutsero") && 
     (message.includes("approved") || 
      message.includes("declined") || 
      message.includes("pending")))
  ) {
    navigate("/DvmfAccountApproval", {
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
    (message.includes("registration") && 
     (message.includes("approved") || 
      message.includes("declined") || 
      message.includes("pending")))
  ) {
    navigate("/DvmfAccountApproval", {
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
    navigate("/DvmfDashboard", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
        section: "medical-records", // Optional: specify section
      },
    });
    return;
  }

  // COMMENT NOTIFICATIONS
  if (message.includes("comment") || type === "comment") {
    navigate("/DvmfAnnouncement", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
      },
    });
    return;
  }

  // APPOINTMENT NOTIFICATIONS (if you have them)
  if (
    message.includes("appointment") ||
    message.includes("schedule") ||
    type.includes("appointment")
  ) {
    navigate("/DvmfDashboard", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
        section: "appointments",
      },
    });
    return;
  }

  // DEFAULT: Go to dashboard for other notifications
  console.log("Notification clicked - navigating to dashboard:", notification);
  navigate("/DvmfDashboard", {
    state: {
      highlightedNotification: notification,
      shouldHighlight: true,
    },
  });
};
  

  // ✅ Fetch notifications from backend
  const loadNotifications = useCallback(() => {
    console.log("Loading notifications...")

    fetch("http://localhost:8000/api/ctu_vetmed/get_vetnotifications/")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch notifications")
        return res.json()
      })
      .then((data) => {
        const formatted = data.map((notif) => ({
          id: notif.id,
          message: notif.message,
          date: notif.date || new Date().toISOString(),
          read: notif.read || false // Add read status
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

  // ✅ FIXED: Apply all filters and search - CORRECTED TAB FILTERING
  const applyFiltersAndSearch = useCallback(() => {
    let filtered = directoryData

    filtered = filtered.filter((item) => item.status?.toLowerCase() === "approved")

    // Apply role filter
    if (roleFilter && roleFilter !== "all") {
      filtered = filtered.filter((item) => item.type?.toLowerCase() === roleFilter.toLowerCase())
    }

    // Apply area filter
    if (areaFilter) {
      filtered = filtered.filter((item) => item.location?.toLowerCase().includes(areaFilter.toLowerCase()))
    }

    // Apply search term
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.id?.toLowerCase().includes(lowerCaseSearchTerm) ||
          item.name?.toLowerCase().includes(lowerCaseSearchTerm) ||
          item.type?.toLowerCase().includes(lowerCaseSearchTerm) ||
          item.location?.toLowerCase().includes(lowerCaseSearchTerm),
      )
    }

    setFilteredDirectoryData(filtered)
  }, [directoryData, roleFilter, areaFilter, searchTerm])

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
  }, [isSidebarOpen, showLogoutModal])

  // Navigation handler
  const handleNavigation = useCallback(
    (path, page) => {
      navigate(path)
      setCurrentPage(page) // Set the current page for sidebar active state
      setIsSidebarOpen(false) // Close sidebar on navigation
    },
    [navigate],
  )

  const handleView = async (person) => {
    try {
      // Optional: fetch full data from API if not already complete
      const response = await fetch("http://localhost:8000/api/ctu_vetmed/get_directory_profiles/", {
        method: "GET",
        credentials: "include",
      })

      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`)

      const data = await response.json()

      // Find the matching person in the API response
      const fullPersonData = [...data.vets, ...data.kutseros, ...data.horse_operators].find(
        (p) =>
          (p.vet_email && p.vet_email === person.email) ||
          (p.kutsero_email && p.kutsero_email === person.email) ||
          (p.op_email && p.op_email === person.email),
      )

      if (!fullPersonData) {
        console.warn("Full profile data not found, using current person object.")
        setSelectedPerson(person)
      } else {
        setSelectedPerson(fullPersonData)
      }

      setShowProfileModal(true)
    } catch (err) {
      console.error("Failed to load profile data:", err)
      setSelectedPerson(person) // fallback
      setShowProfileModal(true)
    }
  }

  const handleSearchInput = (event) => {
    setSearchTerm(event.target.value)
  }

  // Load data from backend
  const loadDirectoryData = async () => {
    try {
      setLoading(true)
      const response = await fetch("http://localhost:8000/api/ctu_vetmed/get_directory_profiles/", {
        method: "GET",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      const combinedData = [
        ...data.vets.map((vet) => ({
          name: `${vet.vet_fname} ${vet.vet_lname}`,
          type: "veterinarian",
          email: vet.vet_email || "N/A",
          status: vet.users?.status || "Unknown",
          date_of_birth: vet.vet_dob || "N/A",
          gender: vet.vet_sex || "N/A",
          phone: vet.vet_phone_num || "N/A",
          province: vet.vet_province || "N/A",
          city: vet.vet_city || "N/A",
          barangay: vet.vet_brgy || "N/A",
          zip_code: vet.vet_zipcode || "N/A",
          middle_name: vet.vet_mname || "N/A",
          license: vet.vet_license_num || "N/A",
          // Add clinic address fields
          vet_address_is_clinic: vet.vet_address_is_clinic || false,
          vet_clinic_street: vet.vet_clinic_street || "N/A",
          vet_clinic_brgy: vet.vet_clinic_brgy || "N/A",
          vet_clinic_city: vet.vet_clinic_city || "N/A",
          vet_clinic_province: vet.vet_clinic_province || "N/A",
          vet_clinic_zipcode: vet.vet_clinic_zipcode || "N/A",
          // Add address field for display in table - use clinic address if available
          address: vet.vet_address_is_clinic 
            ? `${vet.vet_clinic_brgy || ''}, ${vet.vet_clinic_city || ''}, ${vet.vet_clinic_province || ''}`.replace(/^,\s*|,\s*$/g, '').trim() || "N/A"
            : `${vet.vet_brgy || ''}, ${vet.vet_city || ''}, ${vet.vet_province || ''}`.replace(/^,\s*|,\s*$/g, '').trim() || "N/A"
        })),
        ...data.kutseros.map((k) => ({
          name: `${k.kutsero_fname} ${k.kutsero_lname}`,
          type: "kutsero",
          email: k.kutsero_email || "N/A",
          status: k.users?.status || "Unknown",
          date_of_birth: k.kutsero_dob || "N/A",
          gender: k.kutsero_sex || "N/A",
          phone: k.kutsero_phone_num || "N/A",
          province: k.kutsero_province || "N/A",
          city: k.kutsero_city || "N/A",
          barangay: k.kutsero_brgy || "N/A",
          zip_code: k.kutsero_zipcode || "N/A",
          middle_name: k.kutsero_mname || "N/A",
          // Add address field for display in table
          address: `${k.kutsero_brgy || ''}, ${k.kutsero_city || ''}, ${k.kutsero_province || ''}`.replace(/^,\s*|,\s*$/g, '').trim() || "N/A"
        })),
        ...data.horse_operators.map((h) => ({
          name: `${h.op_fname} ${h.op_mname || ""} ${h.op_lname}`.trim(),
          type: "horse operator",
          email: h.op_email || "N/A",
          status: h.users?.status || "Unknown",
          date_of_birth: h.op_dob || "N/A",
          gender: h.op_sex || "N/A",
          phone: h.op_phone_num || "N/A",
          province: h.op_province || "N/A",
          city: h.op_city || "N/A",
          barangay: h.op_brgy || "N/A",
          zip_code: h.op_zipcode || "N/A",
          middle_name: h.op_mname || "N/A",
          // Add address field for display in table
          address: `${h.op_brgy || ''}, ${h.op_city || ''}, ${h.op_province || ''}`.replace(/^,\s*|,\s*$/g, '').trim() || "N/A"
        })),
      ]

      setDirectoryData(combinedData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Manual refresh function
  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        loadDirectoryData(),
        loadNotifications()
      ])
    } catch (error) {
      console.error("Failed to refresh data:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // ✅ PDF Export Function for Currently Selected Role
  const exportToPDF = async () => {
    const selectedRole = roleFilter.toLowerCase();

    const exportData = selectedRole === "all" 
      ? filteredDirectoryData 
      : filteredDirectoryData.filter(person => 
          person.type?.toLowerCase() === selectedRole
        );

    if (exportData.length === 0) {
      const roleText = selectedRole === "all" ? "approved user" : selectedRole;
      alert(`No ${roleText} data available to export.`);
      return;
    }

    // Fetch current user if not already available
    let currentUserData = currentUser;
    if (!currentUserData) {
      currentUserData = await fetchCurrentUser();
    }

    const doc = new jsPDF("p", "mm", "a4");
    const currentDate = new Date().toLocaleDateString();
    const dvmfLogo = "/Images/dvmf.png";

    const getRoleDisplayName = () => {
      switch (selectedRole) {
        case "veterinarian": return "Veterinarian";
        case "kutsero": return "Kutsero";
        case "horse operator": return "Horse Operator";
        case "all": return "Approved User";
        default: return "User";
      }
    };
    const roleDisplay = getRoleDisplayName();

    // -------------------- HEADER --------------------
    const addHeader = () => {
      // DVMF Logo
      doc.addImage(dvmfLogo, "PNG", 15, 10, 50, 45);

      // Government Header
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Republic of the Philippines", 105, 15, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("DEPARTMENT OF VETERINARY MEDICINE", 105, 23, { align: "center" });
      doc.text("AND FISHERIES (DVMF)", 105, 28, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("CEBU CITY", 105, 32, { align: "center" });

      // Address & Contact Info
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Xiamen Street, Cebu City, Philippines", 105, 38, { align: "center" });
      doc.text("Website: https://www.cebucity.gov.ph/dvmf/", 105, 43, { align: "center" });
      doc.text("(032) 401 0418", 105, 49, { align: "center" });

      // Directory Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(
        "Cebu City Government – Department of Veterinary Medicine and Fisheries Directory",
        105,
        56,
        { align: "center" }
      );

      // Blue divider line
      doc.setDrawColor(15, 61, 90);
      doc.setLineWidth(0.7);
      doc.line(15, 67, 195, 67);

      // Report Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(
        selectedRole === "all"
          ? "Approved Users Report"
          : `Approved ${roleDisplay}s Report`,
        105,
        75,
        { align: "center" }
      );

      // Generated On
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Generated on: ${currentDate}`, 15, 83);
    };

    // -------------------- FOOTER --------------------
    const addFooter = (pageNumber) => {
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(9);
      doc.text(`Page ${pageNumber}`, 105, pageHeight - 10, { align: "center" });
    };

// -------------------- APPROVED BY SECTION --------------------
const addApprovedBySection = () => {
  const pageHeight = doc.internal.pageSize.height;

  // Position the "APPROVED BY" section above the footer
  const approvedByY = pageHeight - 100;

  // Get current user's name or use fallback
  const currentUserName = currentUserData?.name || "Admin Ctu";

  // "APPROVED BY:" text (top)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("APPROVED BY:", 15, approvedByY - 12);

  // User's name - centered above the line
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(currentUserName, 37.5, approvedByY - 2, { align: "center" });

  // Signature line
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(15, approvedByY + 2, 60, approvedByY + 2);
};


    addHeader();
    let pageNumber = 1;

    // -------------------- TABLE --------------------
    const startY = 91; // Start lower to avoid overlapping header
    const rowHeight = 10;
    const pageHeight = doc.internal.pageSize.height;
    let currentY = startY;

    // Table headers & widths
    const headers = ["Name", "Role", "Gender", "Address", "Status"];
    const columnWidths = [38, 32, 20, 70, 20]; // total 180mm width
    const tableStartX = 15;

    // Header Bar (Blue)
    doc.setFillColor(15, 61, 90);
    doc.rect(tableStartX, currentY, 180, rowHeight, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);

    let currentX = tableStartX;
    headers.forEach((header, i) => {
      doc.text(header, currentX + 2, currentY + 6);
      currentX += columnWidths[i];
    });

    currentY += rowHeight;
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");

    // Table Body
    exportData.forEach((person, index) => {
      if (currentY + rowHeight > pageHeight - 50) { // Reduced from 30 to 50 to accommodate approved by section
        addApprovedBySection();
        addFooter(pageNumber);
        doc.addPage();
        pageNumber++;
        addHeader();

        // Reset table header for new page
        currentY = startY;
        currentX = tableStartX;

        doc.setFillColor(15, 61, 90);
        doc.setTextColor(255);
        doc.setFont("helvetica", "bold");
        headers.forEach((header, i) => {
          doc.rect(currentX, currentY, columnWidths[i], rowHeight, "F");
          doc.text(header, currentX + 2, currentY + 6);
          currentX += columnWidths[i];
        });

        currentY += rowHeight;
        doc.setTextColor(0);
        doc.setFont("helvetica", "normal");
      }

      // Alternate row background
      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        currentX = tableStartX;
        columnWidths.forEach((w) => {
          doc.rect(currentX, currentY, w, rowHeight, "F");
          currentX += w;
        });
      }

      // Row content
      doc.setFontSize(8);
      currentX = tableStartX;

      doc.text(person.name || "N/A", currentX + 2, currentY + 6);
      currentX += columnWidths[0];

      const role = person.type
        ? person.type.charAt(0).toUpperCase() + person.type.slice(1)
        : "N/A";
      doc.text(role, currentX + 2, currentY + 6);
      currentX += columnWidths[1];

      doc.text(person.gender || "N/A", currentX + 2, currentY + 6);
      currentX += columnWidths[2];

      const address = doc.splitTextToSize(person.address || "N/A", columnWidths[3] - 4);
      doc.text(address, currentX + 2, currentY + 4);
      currentX += columnWidths[3];

      doc.text(formatStatusDisplay(person.status), currentX + 2, currentY + 6);
      currentY += rowHeight;
    });

    // Total
    currentY += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const totalText =
      selectedRole === "all"
        ? `Total Approved Users: ${exportData.length}`
        : `Total Approved ${roleDisplay}s: ${exportData.length}`;
    doc.text(totalText, 15, currentY);
    
    // Add approved by section on the last page
    addApprovedBySection();
    addFooter(pageNumber);

    const fileName =
      selectedRole === "all"
        ? `DVMF-Directory-All-Users-Report-${currentDate.replace(/\//g, "-")}.pdf`
        : `DVMF-Directory-${roleDisplay}-Report-${currentDate.replace(/\//g, "-")}.pdf`;

    doc.save(fileName);
  };

  useEffect(() => {
    loadDirectoryData();
    fetchCurrentUser(); // Fetch current user on component mount
  }, [])

  // Skeleton Loader Component for Table Rows
  const TableSkeleton = () => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm border-b border-gray-200">
                Name
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm border-b border-gray-200">
                Role
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm border-b border-gray-200">
                Gender
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm border-b border-gray-200">
                Address
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm border-b border-gray-200">
                Status
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm border-b border-gray-200">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: itemsPerPagePagination }).map((_, index) => (
              <tr key={index} className="border-b border-gray-100">
                <td className="px-4 py-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </td>
                <td className="px-4 py-4">
                  <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                </td>
                <td className="px-4 py-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </td>
                <td className="px-4 py-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </td>
                <td className="px-4 py-4">
                  <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                </td>
                <td className="px-4 py-4">
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Function to get initials from first and last name
  const getInitials = (firstName, lastName) => {
    const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : '';
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
    return firstInitial + lastInitial;
  };

  // Function to generate consistent background color based on initials
  const getInitialsBackgroundColor = (initials) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 
      'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500',
      'bg-red-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500'
    ];
    
    // Simple hash function to get consistent color for same initials
    let hash = 0;
    for (let i = 0; i < initials.length; i++) {
      hash = initials.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colorIndex = Math.abs(hash) % colors.length;
    return colors[colorIndex];
  };

  const ProfileModal = ({ person, onClose }) => {
    if (!person) return null

    console.log("Person data received:", person)

    // Add state for full-size image modal
    const [showEnlargedPhoto, setShowEnlargedPhoto] = useState(false)

    // Map person to a normalized structure
    const normalizedPerson = (() => {
      if (person.vet_fname) {
        return {
          type: "veterinarian",
          name: `${person.vet_fname} ${person.vet_mname || ""} ${person.vet_lname}`.trim(),
          firstName: person.vet_fname,
          lastName: person.vet_lname,
          email: person.vet_email,
          fb: person.vet_fb || "N/A",
          phone: person.vet_phone_num,
          date_of_birth: person.vet_dob,
          gender: person.vet_sex,
          province: person.vet_province,
          city: person.vet_city,
          barangay: person.vet_brgy,
          zip_code: person.vet_zipcode,
          license: person.vet_license_num,
          experience: person.vet_exp_yr,
          specialization: person.vet_specialization,
          organization: person.vet_org,
          status: person.users?.status || "N/A",
          profile_photo: person.vet_profile_photo || null,
          // Clinic address fields
          vet_address_is_clinic: person.vet_address_is_clinic || false,
          vet_clinic_street: person.vet_clinic_street || "N/A",
          vet_clinic_brgy: person.vet_clinic_brgy || "N/A",
          vet_clinic_city: person.vet_clinic_city || "N/A",
          vet_clinic_province: person.vet_clinic_province || "N/A",
          vet_clinic_zipcode: person.vet_clinic_zipcode || "N/A",
        }
      }

      if (person.kutsero_fname) {
        return {
          type: "kutsero",
          name: `${person.kutsero_fname} ${person.kutsero_mname || ""} ${person.kutsero_lname}`.trim(),
          firstName: person.kutsero_fname,
          lastName: person.kutsero_lname,
          email: person.kutsero_email,
          fb: person.kutsero_fb || "N/A",
          phone: person.kutsero_phone_num,
          date_of_birth: person.kutsero_dob,
          gender: person.kutsero_sex,
          province: person.kutsero_province,
          city: person.kutsero_city,
          barangay: person.kutsero_brgy,
          zip_code: person.kutsero_zipcode,
          status: person.users?.status || "N/A",
          profile_photo: person.kutsero_image || null,
        }
      }

      if (person.op_fname) {
        return {
          type: "horse operator",
          name: `${person.op_fname} ${person.op_mname || ""} ${person.op_lname}`.trim(),
          firstName: person.op_fname,
          lastName: person.op_lname,
          email: person.op_email,
          fb: person.op_fb || "N/A",
          phone: person.op_phone_num,
          date_of_birth: person.op_dob,
          gender: person.op_sex,
          province: person.op_province,
          city: person.op_city,
          barangay: person.op_brgy,
          zip_code: person.op_zipcode,
          status: person.users?.status || "N/A",
          profile_photo: person.op_image || null,
        }
      }

      console.warn("Unknown person type:", person)
      return person
    })()

    // Function to check if the Facebook value is a valid URL
    const getFacebookUrl = (fbValue) => {
      if (!fbValue || fbValue === "N/A") return null;
      
      if (fbValue.startsWith('http://') || fbValue.startsWith('https://')) {
        return fbValue;
      }
      
      const username = fbValue.replace('@', '').trim();
      return `https://facebook.com/${username}`;
    };

    const InfoItem = ({ icon: Icon, label, value }) => (
      <div className="flex items-center gap-2 py-2 text-gray-600 text-sm">
        <Icon size={14} className="text-gray-500 flex-shrink-0" />
        <span>
          {label}: {value || "N/A"}
        </span>
      </div>
    )

    const renderPersonalInfo = () => (
      <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-200">
        <h4 className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-4">
          <User size={16} /> Personal Information
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InfoItem icon={User} label="Name" value={normalizedPerson.name} />
          <InfoItem icon={Calendar} label="Date of Birth" value={normalizedPerson.date_of_birth} />
          <InfoItem icon={User} label="Gender" value={normalizedPerson.gender} />
          <InfoItem icon={Phone} label="Phone" value={normalizedPerson.phone} />
          <InfoItem
            icon={CheckSquare}
            label="Status"
            value={
              <span
                className={`inline-block px-2 py-1 rounded-xl text-xs font-medium ${
                  normalizedPerson.status.toLowerCase() === "approved"
                    ? "bg-green-100 text-green-800"
                    : normalizedPerson.status.toLowerCase() === "declined"
                      ? "bg-red-100 text-red-800"
                      : normalizedPerson.status.toLowerCase() === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                }`}
              >
                {formatStatusDisplay(normalizedPerson.status)}
              </span>
            }
          />
        </div>
      </div>
    )

    const renderAddressInfo = () => (
      <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-200">
        <h4 className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-4">
          <MapPin size={16} /> Address Information
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InfoItem icon={MapPin} label="Province" value={normalizedPerson.province} />
          <InfoItem icon={MapPin} label="City" value={normalizedPerson.city} />
          <InfoItem icon={MapPin} label="Barangay" value={normalizedPerson.barangay} />
          <InfoItem icon={MapPin} label="ZIP Code" value={normalizedPerson.zip_code} />
        </div>
      </div>
    )

    const renderClinicInfo = () => {
      if (normalizedPerson.type !== "veterinarian" || !normalizedPerson.vet_address_is_clinic) return null

      return (
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-200">
          <h4 className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-4">
            <Building size={16} /> Clinic Address
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <InfoItem icon={MapPin} label="Clinic Street" value={normalizedPerson.vet_clinic_street} />
            <InfoItem icon={MapPin} label="Clinic Barangay" value={normalizedPerson.vet_clinic_brgy} />
            <InfoItem icon={MapPin} label="Clinic City" value={normalizedPerson.vet_clinic_city} />
            <InfoItem icon={MapPin} label="Clinic Province" value={normalizedPerson.vet_clinic_province} />
            <InfoItem icon={MapPin} label="Clinic ZIP Code" value={normalizedPerson.vet_clinic_zipcode} />
          </div>
        </div>
      )
    }

    const renderProfessionalInfo = () => {
      if (normalizedPerson.type !== "veterinarian") return null

      return (
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-200">
          <h4 className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-4">
            <Award size={16} /> Professional Details
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <InfoItem icon={Award} label="License" value={normalizedPerson.license} />
            <InfoItem icon={Award} label="Experience (Years)" value={normalizedPerson.experience} />
            <InfoItem icon={Award} label="Specialization" value={normalizedPerson.specialization} />
            <InfoItem icon={Building} label="Organization" value={normalizedPerson.organization} />
          </div>
        </div>
      )
    }

    const initials = getInitials(normalizedPerson.firstName, normalizedPerson.lastName);
    const initialsBackgroundColor = getInitialsBackgroundColor(initials);

    // Full Size Image Modal Component - MATCHING THEIR PATTERN
    const FullSizeImageModal = () => {
      if (!showEnlargedPhoto) return null;

      return (
        <div 
          className="fixed inset-0 z-1002 flex items-center justify-center bg-black bg-opacity-90 p-4"
          onClick={() => setShowEnlargedPhoto(false)}
        >
          <div className="relative max-w-2xl w-full max-h-full">
            <button
              onClick={() => setShowEnlargedPhoto(false)}
              className="absolute -top-12 right-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-all shadow-lg z-10"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="bg-white rounded-lg overflow-hidden max-w-sm w-full mx-auto">
              {normalizedPerson.profile_photo ? (
                <img 
                  src={normalizedPerson.profile_photo} 
                  alt={normalizedPerson.name}
                  className="w-full h-96 object-contain bg-gray-100"
                />
              ) : (
                <div className="w-full h-96 bg-gradient-to-br from-[#0F3D5A] to-[#1E5A7C] flex items-center justify-center">
                  <span className="text-white text-6xl font-bold">
                    {initials}
                  </span>
                </div>
              )}
            </div>
            
            
          </div>
        </div>
      );
    };

    return (
      <>
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-1001 modal-overlay"
          onClick={onClose}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 duration-400"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Clean White Header with Profile Picture */}
            <div className="bg-white p-15 border-b border-gray-200 relative overflow-hidden">
              <div className="flex items-center gap-6">
                {/* Profile Picture - MADE CLICKABLE LIKE THEIR PATTERN */}
                <div className="flex-shrink-0">
                  {normalizedPerson.profile_photo ? (
                    <div 
                      className="w-24 h-24 md:w-32 md:h-32 rounded-xl bg-gray-300 flex items-center justify-center overflow-hidden border-2 border-white shadow-md -mt-5 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-300"
                      onClick={() => setShowEnlargedPhoto(true)}
                      title="Click to view full size"
                    >
                      <img 
                        src={normalizedPerson.profile_photo} 
                        alt="Profile" 
                        className="w-full h-full object-cover rounded-xl"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      {/* Fallback to initials with colored background when image fails to load */}
                      <div className={`hidden w-full h-full items-center justify-center ${initialsBackgroundColor} rounded-xl`}>
                        <span className="text-3xl font-bold text-white">
                          {initials}
                        </span>
                      </div>
                    </div>
                  ) : (
                    // Show initials with colored background when no profile photo
                    <div 
                      className="w-24 h-24 md:w-32 md:h-32 rounded-xl flex items-center justify-center overflow-hidden border-2 border-white shadow-md -mt-5 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-300"
                      onClick={() => setShowEnlargedPhoto(true)}
                      title="Click to view full size"
                    >
                      <div className={`w-full h-full items-center justify-center ${initialsBackgroundColor} rounded-xl flex`}>
                        <span className="text-3xl font-bold text-white">
                          {initials}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Name and Role */}
                <div className="flex-1 bg-white">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">{normalizedPerson.name}</h3>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      normalizedPerson.type === "veterinarian"
                        ? "bg-green-100 text-green-800 border border-green-200"
                        : normalizedPerson.type === "kutsero"
                          ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                          : normalizedPerson.type === "horse operator"
                            ? "bg-orange-100 text-orange-800 border border-orange-200"
                            : "bg-gray-100 text-gray-800 border border-gray-200"
                    }`}
                  >
                    {normalizedPerson.type === "veterinarian" 
                      ? "Veterinarian" 
                      : normalizedPerson.type === "kutsero" 
                        ? "Kutsero" 
                        : normalizedPerson.type === "horse operator" 
                          ? "Horse Operator" 
                          : normalizedPerson.type?.replace("_", " ")}
                  </span>
                  
                 
                </div>
              </div>
              
              <button
                className="absolute top-6 right-6 w-10 h-10 bg-gray-100 border border-gray-300 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-200 hover:border-gray-400 hover:scale-105 transition-all duration-300"
                onClick={onClose}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 bg-gray-50 overflow-y-auto">
              {renderPersonalInfo()}
              {renderAddressInfo()}
              {renderClinicInfo()}
              {renderProfessionalInfo()}
            </div>
          </div>
        </div>

        {/* Full Size Image Modal - USING THEIR PATTERN */}
        <FullSizeImageModal />
      </>
    )
  }

  const getPaginatedData = () => {
    const startIndex = (currentPagePagination - 1) * itemsPerPagePagination
    const endIndex = startIndex + itemsPerPagePagination
    return filteredDirectoryData.slice(startIndex, endIndex)
  }

  const handleItemsPerPageChange = (event) => {
    setItemsPerPagePagination(Number.parseInt(event.target.value, 10))
    setCurrentPagePagination(1) // Reset to first page when changing items per page
  }

  const goToPage = (page) => {
    const totalPages = Math.ceil(filteredDirectoryData.length / itemsPerPagePagination)
    if (page >= 1 && page <= totalPages) {
      setCurrentPagePagination(page)
    }
  }

  const totalPages = Math.ceil(filteredDirectoryData.length / itemsPerPagePagination)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} ref={sidebarRef} />

<div className="flex-1 flex flex-col">
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 px-6 py-4 flex items-center justify-between">
           <div className="flex flex-col">
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Directory</h2>

</div>
          
          <div className="flex items-center gap-4">
            {/* 🔄 Refresh Icon */}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="bg-transparent border-none cursor-pointer p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
              title="Refresh Directory"
            >
              <RefreshCw 
                size={24} 
                className={`text-gray-700 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>

            {/* 🔔 Notification Bell (without count) */}
            <button
              className="bg-transparent border-none cursor-pointer p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
              onClick={() => setNotifsOpen(!notifsOpen)}
            >
              <Bell size={24} className="text-gray-700" />
            </button>
          </div>

          {/* Notification Modal */}
          <NotificationModal
            isOpen={notifsOpen}
            onClose={() => setNotifsOpen(false)}
            notifications={notifications}
            onNotificationClick={handleNotificationClick}
            onMarkAllAsRead={handleMarkAllAsRead}
            
          />
        </header>

        <div className="flex-1 p-6 bg-gray-100 overflow-y-auto">
          {/* Search and Filters Section */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Search Input */}
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                className="w-full pl-12 pr-4 py-3 border-2 border-white rounded-lg text-base outline-none bg-white h-[46px]"
                placeholder="Search directory..."
                onChange={handleSearchInput}
                value={searchTerm}
              />
            </div>

            {/* Filters Container - Export PDF at far right */}
            <div className="flex items-center gap-2 flex-1">
              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-3 border-2 border-white rounded-lg text-base outline-none bg-white h-[46px] min-w-[150px]"
              >
                <option value="all">All Roles</option>
                <option value="veterinarian">Veterinarian</option>
                <option value="kutsero">Kutsero</option>
                <option value="horse operator">Horse Operator</option>
              </select>

              {/* Export PDF Button - Pushed to far right using ml-auto */}
              <button
                onClick={() => exportToPDF()}
                disabled={filteredDirectoryData.length === 0}
                className="ml-auto flex items-center gap-2 px-4 py-3 bg-[#0F3D5A] text-white rounded-lg hover:bg-[#1E5A7C] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base h-[40px] whitespace-nowrap"
                title="Export to PDF"
              >
                <Download size={18} />
                Export PDF
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-5">
            <div className="p-5">
              {loading ? (
                // Show skeleton loader while loading
                <TableSkeleton />
              ) : filteredDirectoryData.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-10 gap-3 text-gray-600">
                  <Folder size={48} />
                  <h3 className="text-lg font-medium">No approved directory entries found</h3>
                  <p className="text-sm">Only approved entries will appear here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm border-b border-gray-200">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm border-b border-gray-200">
                          Role
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm border-b border-gray-200">
                          Gender
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm border-b border-gray-200">
                          Address
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm border-b border-gray-200">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm border-b border-gray-200">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedData().map((person) => (
                        <tr
                          key={person.email}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200"
                        >
                          <td className="px-4 py-4 text-sm text-gray-900">{person.name}</td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-block px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
                                person.type?.toLowerCase() === "veterinarian"
                                  ? "bg-green-100 text-green-800 border border-green-200"
                                  : person.type?.toLowerCase() === "kutsero"
                                    ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                                    : person.type?.toLowerCase().includes("horse")
                                      ? "bg-orange-100 text-orange-800 border border-orange-200"
                                      : "bg-gray-100 text-gray-800 border border-gray-200"
                              }`}
                            >
                              {/* ✅ FIXED: Capitalize first letter of role */}
                              {person.type && person.type.charAt(0).toUpperCase() + person.type.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">{person.gender}</td>
                          <td className="px-4 py-4 text-sm text-gray-900 break-words">
                            {person.address}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-block px-2 py-1 rounded-xl text-xs font-medium whitespace-nowrap ${
                                person.status?.toLowerCase() === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : person.status?.toLowerCase() === "declined"
                                    ? "bg-red-100 text-red-800"
                                    : person.status?.toLowerCase() === "pending"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {formatStatusDisplay(person.status)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <button
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs cursor-pointer hover:bg-blue-100 hover:border-blue-300 transition-all duration-200"
                              onClick={() => handleView(person)}
                            >
                              <Eye size={16} /> View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {!loading && filteredDirectoryData.length > 0 && (
              <div className="flex justify-between items-center bg-gray-50 px-5 py-3 border-t border-gray-200 text-sm">
                <div className="text-gray-600 flex items-center gap-3">
                  <span>
                    Showing {(currentPagePagination - 1) * itemsPerPagePagination + 1} to{" "}
                    {Math.min(currentPagePagination * itemsPerPagePagination, filteredDirectoryData.length)} of{" "}
                    {filteredDirectoryData.length} results
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Show:</span>
                    <select
                      value={itemsPerPagePagination}
                      onChange={handleItemsPerPageChange}
                      className="px-2 py-1 border border-gray-300 rounded bg-white text-sm"
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>
                  </div>

                  <div className="flex gap-1">
                    <button
                      className="flex items-center justify-center w-8 h-8 border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      onClick={() => goToPage(currentPagePagination - 1)}
                      disabled={currentPagePagination === 1}
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPagePagination <= 3) {
                        pageNum = i + 1
                      } else if (currentPagePagination >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPagePagination - 2 + i
                      }

                      return (
                        <button
                          key={pageNum}
                          className={`flex items-center justify-center min-w-[32px] h-8 px-2 border rounded text-sm transition-all duration-200 ${
                            currentPagePagination === pageNum
                              ? "bg-[#0F3D5A] text-white border-[#0F3D5A]"
                              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                          }`}
                          onClick={() => goToPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      )
                    })}

                    <button
                      className="flex items-center justify-center w-8 h-8 border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      onClick={() => goToPage(currentPagePagination + 1)}
                      disabled={currentPagePagination === totalPages}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {showProfileModal && <ProfileModal person={selectedPerson} onClose={() => setShowProfileModal(false)} />}

        <FloatingMessages />
      </div>
    </div>
  )
}

export default DvmfDirectory