import { useState, useEffect, useCallback } from "react"
import { useLocation } from "react-router-dom"
import { Bell, Search, Filter, Eye, CheckCircle, XCircle, Users, ChevronLeft, ChevronRight, RefreshCw, Download } from "lucide-react"
import { jsPDF } from "jspdf"
import Sidebar from '@/components/KutSidebar';
import FloatingMessages from './KutMessages';
import NotificationModal from './KutNotif';

const API_BASE = "http://localhost:8000/api/kutsero_president"

// SIMPLE FETCH FUNCTION WITH ERROR HANDLING
const apiFetch = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      credentials: "include",
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    // Handle 500 errors gracefully
    if (response.status === 500) {
      console.warn(`⚠️ Server 500 error for ${endpoint}, returning safe data`);
      
      if (endpoint.includes('/get_user_approvals')) {
        return [];
      } else if (endpoint.includes('/get_approved_users')) {
        return { users: [] };
      } else if (endpoint.includes('/get_notifications')) {
        return [];
      } else if (endpoint.includes('/get_kutsero_president')) {
        return { name: "Kutsero President" }; // Fallback for president name
      } else {
        return {};
      }
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ API Error ${endpoint}:`, error);
    
    // Return safe defaults for all endpoints
    if (endpoint.includes('/get_user_approvals')) {
      return [];
    } else if (endpoint.includes('/get_approved_users')) {
      return { users: [] };
    } else if (endpoint.includes('/get_notifications')) {
      return [];
    } else if (endpoint.includes('/get_kutsero_president')) {
      return { name: "Kutsero President" }; // Fallback for president name
    } else {
      return {};
    }
  }
};


const exportToPDF = async (users, title, filters = {}, activeTab) => {
  try {
    const presidentData = await apiFetch('/get_kutsero_president');
    const presidentName = presidentData.name || "Kutsero President";

    const filename = activeTab === "approval" ? "User_Approval_List" : "User_Accounts_List";

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    let y = 20;

    /** HEADER LOGO */
    try {
      const img = new Image();
      img.src = '/Images/echo.png';
      doc.addImage(img, 'PNG', pageWidth / 2 - 15, y, 30, 12);
      y += 25;
    } catch {
      doc.setFontSize(16);
      doc.text('ECHO', pageWidth / 2, y, { align: 'center' });
      y += 20;
    }

    /** TITLE + DATE */
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(filename.replace(/_/g, ' '), pageWidth / 2, y, { align: 'center' });
    y += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(120);
    doc.text(`Generated on ${currentDate} at ${currentTime}`, pageWidth / 2, y, { align: 'center' });
    y += 15;

    /** FILTER USERS */
    const activeUsers = users.filter(u => u.status !== "deactivated");

    const kutseroUsers = activeUsers.filter(u => u.role?.toLowerCase().includes("kutsero"));
    const horseUsers = activeUsers.filter(u => u.role?.toLowerCase().includes("horse operator"));

    let filteredKutsero = kutseroUsers;
    let filteredHorse = horseUsers;

    if (filters.roleFilter && filters.roleFilter !== "all") {
      if (filters.roleFilter.includes("kutsero")) filteredHorse = [];
      if (filters.roleFilter.includes("horse")) filteredKutsero = [];
    }

    /** TABLE COLUMNS */
    const col = { name: 40, contact: 30, email: 45, address: 65 };
    const headerHeight = 10;
    const rowHeight = 12;
    const tableWidth = col.name + col.contact + col.email + col.address;
    const marginX = (pageWidth - tableWidth) / 2; // center table horizontally

    /** TABLE SECTION FUNCTION */
    const drawTableSection = (list, title) => {
      if (!list.length) return;

      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.setFont(undefined, "bold");
      doc.text(`${title} (${list.length})`, marginX, y);
      y += 8;

      const drawHeader = () => {
        doc.setTextColor(255);
        doc.setFontSize(10);
        doc.setFont(undefined, "bold");
        let x = marginX;
        const headerCells = [["NAME", col.name], ["CONTACT", col.contact], ["EMAIL", col.email], ["ADDRESS", col.address]];
        headerCells.forEach(([label, width]) => {
          doc.setFillColor(210, 105, 30);
          doc.rect(x, y, width, headerHeight, "F");
          doc.text(label, x + width / 2, y + 6, { align: "center" });
          x += width;
        });
        y += headerHeight;
      };

      drawHeader();

      list.forEach((u, i) => {
        if (y + rowHeight > pageHeight - 40) {
          doc.addPage();
          y = 20;
          drawHeader();
        }

        let x = marginX;
        if (i % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(x, y, tableWidth, rowHeight, "F");
        }

        doc.setFontSize(9);
        doc.setFont(undefined, "normal");
        doc.setTextColor(0);

        const name = u.name || "N/A";
        const contact = u.phoneNumber || u.contact_num || "N/A";
        const email = u.email || "N/A";
        const address = u.address || "N/A";

        doc.text(name, x + 2, y + 7); x += col.name;
        doc.text(contact, x + 2, y + 7); x += col.contact;
        doc.text(email, x + 2, y + 7); x += col.email;

        if (address.length > 35) {
          const wrapped = doc.splitTextToSize(address, col.address - 4);
          doc.text(wrapped, x + 2, y + 5);
        } else {
          doc.text(address, x + 2, y + 7);
        }

        y += rowHeight;
      });

      y += 10;
    };

    if (filteredKutsero.length) drawTableSection(filteredKutsero, "KUTSERO");
    if (filteredHorse.length) drawTableSection(filteredHorse, "HORSE OPERATOR");

    /** SIGNATURE SECTION */
    const totalPages = doc.internal.getNumberOfPages();
    doc.setPage(totalPages);

    const centerX = pageWidth / 2;
    const baseY = pageHeight - 35;
    const lineWidth = 90;

    // Signature line (centered)
    doc.setLineWidth(0.4);
    doc.line(centerX - lineWidth / 2, baseY, centerX + lineWidth / 2, baseY);

    // "AUTHORIZED BY:" left aligned to start of line
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.setTextColor(0);
    doc.text("AUTHORIZED BY:", centerX - lineWidth / 2, baseY - 8);

    // Name ABOVE the line (centered on line)
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text(presidentName, centerX, baseY - 3, { align: "center" });

    // Position below line (centered)
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    doc.text("Kutsero President", centerX, baseY + 5, { align: "center" });

    // Note below position (centered)
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("Signature over printed name", centerX, baseY + 11, { align: "center" });

    /** PAGE NUMBERS */
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: "center" });
    }

    doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error(err);
  }
};


// Skeleton Loading Component
const TableSkeleton = ({ rows = 5, columns = 5 }) => {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex border-b border-gray-200 py-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="flex-1 px-4">
              <div className="h-4 bg-gray-200 rounded mx-auto" style={{ width: rowIndex === 0 ? '80%' : '60%' }}></div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// Function to format date as MONTH-DAY-YEAR
const formatDate = (dateString) => {
  if (!dateString || dateString === "N/A") return "N/A";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${month}-${day}-${year}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return "N/A";
  }
}

// Function to get initials from name
const getInitials = (name) => {
  if (!name || name === "N/A") return "NA";
  
  const names = name.split(' ').filter(name => name.trim() !== '');
  let initials = '';
  
  if (names.length === 0) {
    return "NA";
  } else if (names.length === 1) {
    initials = names[0].charAt(0).toUpperCase();
  } else {
    initials = (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  }
  
  return initials;
};

// Function to create initial avatar
const createInitialAvatar = (initials, backgroundColor = "#D2691E", size = 120) => {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${backgroundColor}"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.4}" 
            fill="white" text-anchor="middle" dy=".35em" font-weight="bold">
        ${initials}
      </text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

const UserManagement = () => {
  const location = useLocation();
  
  // Main navigation state
  const [activeTab, setActiveTab] = useState("approval") 

  // Common states
  const [searchTerm, setSearchTerm] = useState("")
  const [searchFocus, setSearchFocus] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [alert, setAlert] = useState(null)
  const [showAlert, setShowAlert] = useState(false)

  // State for enlarged profile image
  const [enlargedImage, setEnlargedImage] = useState(null)

  // Notification states
  const [notifications, setNotifications] = useState([])

  // State to track highlighted user from notification
  const [highlightedUser, setHighlightedUser] = useState(null)
  const [highlightedNotification, setHighlightedNotification] = useState(null)

  // Approval page states
  const [approvalUsers, setApprovalUsers] = useState([])
  const [accountUsers, setAccountUsers] = useState([])
  const [accountRoleFilter, setAccountRoleFilter] = useState("All")
  const [accountStatusTab, setAccountStatusTab] = useState("active")
  const [confirmAction, setConfirmAction] = useState(null)
  const [actionUser, setActionUser] = useState(null)
  const [hoveredRow, setHoveredRow] = useState(null)
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Decline modal state
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [declineReason, setDeclineReason] = useState("")
  const [userToDecline, setUserToDecline] = useState(null)
  const [kutseroPresident, setKutseroPresident] = useState("");
  // Loading states with refresh states
  const [loading, setLoading] = useState({
    auth: true,
    approval: true,
    accounts: true,
    notifications: false,
    refreshing: false
  })

  // Filter states
  const [approvalFilter, setApprovalFilter] = useState("all")
  const [approvalRoleFilter, setApprovalRoleFilter] = useState("all")

  // Tabs configuration
  const tabs = [
    { id: "approval", label: "User Approval", icon: Users },
    { id: "accounts", label: "User Accounts", icon: CheckCircle }
  ]
  useEffect(() => {
    const fetchKutseroPresident = async () => {
      try {
        const data = await apiFetch('/get_kutsero_president/');
        setKutseroPresident(data.name || "Kutsero President");
      } catch (error) {
        console.error("Error fetching Kutsero President:", error);
        setKutseroPresident("Kutsero President");
      }
    };

    fetchKutseroPresident();
  }, []);
  // Function to handle manual refresh
  const handleManualRefresh = useCallback(async () => {
    console.log("🔄 Manual refresh triggered");
    setLoading(prev => ({ ...prev, refreshing: true }));
    
    try {
      if (activeTab === "approval") {
        await fetchApprovalUsers();
      } else {
        await fetchAccountUsers();
      }
      await fetchNotifications();
      
      // SUBTLE SUCCESS INDICATOR - No alert design
      console.log("✅ Data refreshed successfully");
      
    } catch (err) {
      console.error("❌ Refresh failed:", err);
      setAlert({ type: "error", message: "Failed to refresh data" });
    } finally {
      setLoading(prev => ({ ...prev, refreshing: false }));
    }
  }, [activeTab]);

 const handleExportPDF = async () => {
    try {
      const usersToExport = activeTab === "approval" 
        ? getFilteredApprovalUsers() 
        : getFilteredAccountUsers();
      
      if (usersToExport.length === 0) {
        setAlert({ type: "error", message: "No data to export" });
        return;
      }

      const title = activeTab === "approval" 
        ? "User Approval List" 
        : "User Accounts List";

      const filters = {
        searchTerm: searchTerm || null,
        roleFilter: activeTab === "approval" ? approvalRoleFilter : accountRoleFilter,
        statusFilter: activeTab === "approval" ? approvalFilter : accountStatusTab
      };

      await exportToPDF(usersToExport, title, filters, activeTab);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      setAlert({ type: "error", message: "Failed to export PDF. Please try again." });
    }
  };

  // Profile image click handler
  const handleProfileImageClick = (user) => {
    setEnlargedImage({
      src: user.profilePicture || user.profile_picture || "/placeholder.svg",
      alt: `${user.name}'s profile picture`,
      initials: getInitials(user.name),
      name: user.name
    })
  }

  // Close enlarged image view
  const closeEnlargedImage = () => {
    setEnlargedImage(null)
  }

  // Fetch functions with error handling
  const fetchNotifications = async () => {
    try {
      setLoading(prev => ({ ...prev, notifications: true }));
      const data = await apiFetch('/get_notifications/');
      
      const formattedNotifications = Array.isArray(data) ? data.map(notification => ({
        notif_id: notification.notif_id,
        id: notification.id,
        message: notification.message,
        date: notification.date,
        read: notification.read || false
      })) : [];
      
      setNotifications(formattedNotifications);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setNotifications([]);
    } finally {
      setLoading(prev => ({ ...prev, notifications: false }));
    }
  };

  const fetchApprovalUsers = async () => {
    try {
      setLoading(prev => ({ ...prev, approval: true }));
      const data = await apiFetch('/get_user_approvals/');
      
      const formatted = Array.isArray(data) ? data.map((u) => ({
        id: u.id,
        name: u.name || "N/A",
        email: u.email || "N/A",
        date: u.created_at ? formatDate(u.created_at) : "N/A",
        status: (u.status || "pending").toLowerCase(),
        role: u.role || "N/A",
        profilePicture: u.profilePicture,
        dateOfBirth: u.dateOfBirth ? formatDate(u.dateOfBirth) : "N/A",
        sex: u.sex,
        phoneNumber: u.phoneNumber,
        address: u.address,
        declineReason: u.declineReason || "No reason provided", 
      })) : [];
      
      setApprovalUsers(formatted);
    } catch (err) {
      console.error("❌ Error fetching approval users:", err);
      setApprovalUsers([]);
    } finally {
      setLoading(prev => ({ ...prev, approval: false }));
    }
  };

  const fetchAccountUsers = async () => {
    try {
      setLoading(prev => ({ ...prev, accounts: true }));
      const data = await apiFetch('/get_approved_users/');
      
      const formatted = Array.isArray(data.users) ? data.users.map((u) => ({
        id: u.id,
        name: u.name || "N/A",
        email: u.email || "N/A",
        contact_num: u.phoneNumber || "N/A",
        date: u.approved_date ? formatDate(u.approved_date) : "N/A",
        status: (u.status || "pending").toLowerCase(),
        role: u.role || "N/A",
        profile_picture: u.profilePicture || "https://via.placeholder.com/100",
        dob: u.dateOfBirth ? formatDate(u.dateOfBirth) : "N/A",
        gender: u.sex || "N/A",
        address: u.address || "N/A",
      })) : [];
      
      setAccountUsers(formatted);
    } catch (err) {
      console.error("Error fetching account users:", err);
      setAccountUsers([]);
    } finally {
      setLoading(prev => ({ ...prev, accounts: false }));
    }
  };

  // useEffect hooks
  useEffect(() => {
    fetchApprovalUsers();
    fetchAccountUsers();
  }, []);

  useEffect(() => {
    if (approvalUsers.length > 0) {
      fetchNotifications();
    }
  }, [approvalUsers.length]);

  useEffect(() => {
    if (notifOpen) {
      fetchNotifications();
    }
  }, [notifOpen]);

  // Handle navigation state for highlighted notifications
  useEffect(() => {
    if (location.state && location.state.highlightedNotification) {
      const { highlightedNotification } = location.state;
      handleOpenKutseroManagement(highlightedNotification);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Alert effect
  useEffect(() => {
    if (alert) {
      setShowAlert(true)
      const timer = setTimeout(() => {
        setShowAlert(false)
        setTimeout(() => setAlert(null), 400)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [alert])

  // Effect to clear highlight after some time
  useEffect(() => {
    if (highlightedUser) {
      const timer = setTimeout(() => {
        setHighlightedUser(null);
        setHighlightedNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [highlightedUser]);

  // Function to extract user name from notification message
  const extractUserNameFromNotification = (notification) => {
    const match = notification.message.match(/New (?:Kutsero|Horse Operator) registered:\s*(.+)$/);
    return match ? match[1].trim() : null;
  };

  // Handle opening Kutsero Management with notification highlighting
  const handleOpenKutseroManagement = (notification = null) => {
    if (notification) {
      setHighlightedNotification(notification);
      const userName = extractUserNameFromNotification(notification);
      
      if (userName) {
        const findAndHighlightUser = () => {
          const userToHighlight = approvalUsers.find(u => {
            const exactMatch = u.name.toLowerCase() === userName.toLowerCase();
            const partialMatch = u.name.toLowerCase().includes(userName.toLowerCase());
            const statusMatch = u.status === "pending";
            return (exactMatch || partialMatch) && statusMatch;
          });
          
          if (userToHighlight) {
            setHighlightedUser(userToHighlight.id);
            setTimeout(() => {
              const highlightedRow = document.getElementById(`user-row-${userToHighlight.id}`);
              if (highlightedRow) {
                highlightedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                highlightedRow.classList.add('highlight-zoom');
                setTimeout(() => {
                  highlightedRow.classList.remove('highlight-zoom');
                }, 2000);
              }
            }, 500);
          }
        };
        
        if (approvalUsers.length > 0) {
          findAndHighlightUser();
        } else {
          setTimeout(findAndHighlightUser, 1000);
        }
      }
    }
  };

  // Notification functions
  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notification) => {
    setNotifications(prev => 
      prev.map(n => 
        n.notif_id === notification.notif_id ? { ...n, read: true } : n
      )
    );
  };

  // Approval functions
  const handleApprove = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/approve_user/${userId}/`, {
        method: "POST",
        credentials: "include",
      })
      if (res.ok) {
        setApprovalUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: "approved" } : u)))
        handleCloseModal()
        setAlert({ type: "success", message: "User approved successfully!" })
        fetchNotifications();
      }
    } catch (err) {
      console.error("❌ Error approving user:", err)
      setAlert({ type: "error", message: "Failed to approve user." })
    }
  }

  const handleDecline = async (userId, reason = "") => {
    try {
      const declineReasonToSend = reason.trim() || "No reason provided";
      
      const res = await fetch(`${API_BASE}/decline_user/${userId}/`, {
        method: "POST",
        credentials: "include",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ declineReason: declineReasonToSend }),
      })
      
      if (res.ok) {
        setApprovalUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: "declined", declineReason: declineReasonToSend } : u)))
        handleCloseModal()
        setAlert({ type: "success", message: "User declined successfully!" })
        setShowDeclineModal(false)
        setDeclineReason("")
        setUserToDecline(null)
        fetchNotifications();
      }
    } catch (err) {
      console.error("❌ Error declining user:", err)
      setAlert({ type: "error", message: "❌ Failed to decline user." })
    }
  }

  const openDeclineModal = (user) => {
    setUserToDecline(user)
    setShowDeclineModal(true)
  }

  const closeDeclineModal = () => {
    setShowDeclineModal(false)
    setDeclineReason("")
    setUserToDecline(null)
  }

  const handleApproveAll = async () => {
    const pendingUsers = getFilteredApprovalUsers().filter((u) => u.status === "pending")
    if (pendingUsers.length === 0) {
      setAlert({ type: "error", message: "⚠️ No pending users to approve." })
      return
    }

    if (!window.confirm(`Are you sure you want to approve ${pendingUsers.length} user(s)?`)) return

    try {
      const res = await fetch(`${API_BASE}/approve_all_users/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: pendingUsers.map((u) => u.id) }),
      })

      if (res.ok) {
        setApprovalUsers((prev) =>
          prev.map((u) => (pendingUsers.some((p) => p.id === u.id) ? { ...u, status: "approved" } : u)),
        )
        setAlert({ type: "success", message: `✅ Approved ${pendingUsers.length} user(s) successfully!` })
        fetchNotifications();
      } else {
        const data = await res.json()
        setAlert({ type: "error", message: data.error || "❌ Failed to approve users." })
      }
    } catch (err) {
      console.error("❌ Error approving all users:", err)
      setAlert({ type: "error", message: "❌ Failed to approve users." })
    }
  }

  // Account management functions
  const handleUserAction = async (action, user) => {
    try {
      let endpoint = ""
      if (action === "deactivate") endpoint = `${API_BASE}/deactivate_user/${user.id}/`
      if (action === "reactivate") endpoint = `${API_BASE}/reactivate_user/${user.id}/`

      const res = await fetch(endpoint, { method: "POST", credentials: "include" })
      if (!res.ok) throw new Error("Request failed")
      const result = await res.json()

      setAlert({ type: "success", message: result.message || `User ${action}d successfully!` })
      setAccountUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, status: action === "deactivate" ? "deactivated" : "approved" } : u,
        ),
      )
    } catch (err) {
      console.error("Error updating user:", err)
      setAlert({ type: "error", message: "Something went wrong. Please try again." })
    }
    setConfirmAction(null)
  }

  // Filter functions
  const getFilteredApprovalUsers = () => {
    return approvalUsers
      .filter((u) => u.status !== "deactivated")
      .filter((u) => approvalFilter === "all" || u.status.toLowerCase() === approvalFilter.toLowerCase())
      .filter(
        (u) => approvalRoleFilter === "all" || (u.role && u.role.toLowerCase() === approvalRoleFilter.toLowerCase()),
      )
      .filter(
        (u) =>
          u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
  }

  const getFilteredAccountUsers = () => {
    return accountUsers.filter((user) => {
      const matchesSearch =
        (user.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.contact_num || "").includes(searchTerm)
      const matchesRole =
        accountRoleFilter.toLowerCase() === "all" || (user.role || "").toLowerCase() === accountRoleFilter.toLowerCase()
      const matchesStatus = accountStatusTab === "active" ? user.status === "approved" : user.status === "deactivated"
      return matchesSearch && matchesRole && matchesStatus
    })
  }

  // Get approval counts
  const getApprovalCounts = () => {
    return {
      all: approvalUsers.filter(
        (u) =>
          u.status !== "deactivated" &&
          (approvalRoleFilter === "all" || u.role.toLowerCase() === approvalRoleFilter.toLowerCase()),
      ).length,
      pending: approvalUsers.filter(
        (u) =>
          u.status !== "deactivated" &&
          (approvalRoleFilter === "all" || u.role.toLowerCase() === approvalRoleFilter.toLowerCase()) &&
          u.status === "pending",
      ).length,
      approved: approvalUsers.filter(
        (u) =>
          u.status !== "deactivated" &&
          (approvalRoleFilter === "all" || u.role.toLowerCase() === approvalRoleFilter.toLowerCase()) &&
          u.status === "approved",
      ).length,
      declined: approvalUsers.filter(
        (u) =>
          u.status !== "deactivated" &&
          (approvalRoleFilter === "all" || u.role.toLowerCase() === approvalRoleFilter.toLowerCase()) &&
          u.status === "declined",
      ).length,
    }
  }

  // Modal functions
  const handleViewUser = (user) => {
    setSelectedUser(user)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedUser(null)
  }

  // Pagination functions
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentApprovalItems = getFilteredApprovalUsers().slice(indexOfFirstItem, indexOfLastItem)
  const currentAccountItems = getFilteredAccountUsers().slice(indexOfFirstItem, indexOfLastItem)
  const totalPagesApproval = Math.ceil(getFilteredApprovalUsers().length / itemsPerPage)
  const totalPagesAccount = Math.ceil(getFilteredAccountUsers().length / itemsPerPage)
  
  const paginate = (pageNumber) => setCurrentPage(pageNumber)
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, activeTab === "approval" ? totalPagesApproval : totalPagesAccount))
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1))

  // Get page numbers for pagination
  const getPageNumbers = (totalPages) => {
    const pageNumbers = [];
    const maxPages = 5;
    
    if (totalPages <= maxPages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, startPage + maxPages - 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
    }
    
    return pageNumbers;
  }

  // Calculate unread notifications count
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const getRoleDisplayName = (role) => {
    switch (role?.toLowerCase()) {
      case 'kutsero': return 'Kutsero';
      case 'horse_operator': return 'Horse Operator';
      default: return role;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="bg-white border-b border-gray-200 flex-shrink-0 z-100">
          <div className="px-8 py-4 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold text-[#D2691E] m-0">User Management</h1>
              <p className="text-sm text-gray-600 m-0 font-normal">Review requests and manage account status</p>
            </div>

            <div className="flex items-center gap-4">
              {/* REFRESH BUTTON */}
              <button
                onClick={handleManualRefresh}
                disabled={loading.refreshing}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-[#D2691E] text-white rounded-lg hover:bg-[#A0522D] disabled:opacity-50 transition-colors"
              >
                <RefreshCw size={16} className={loading.refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>

              {/* NOTIFICATION BELL */}
              <div className="relative">
                <button
                  className="bg-none border-none cursor-pointer p-2 rounded-full relative transition-colors duration-200 hover:bg-gray-100"
                  onClick={() => setNotifOpen(!notifOpen)}
                  aria-label="Notifications"
                >
                  <Bell size={24} className="text-gray-500" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>

                <NotificationModal
                  isOpen={notifOpen}
                  onClose={() => setNotifOpen(false)}
                  onNotificationClick={handleNotificationClick}
                  notifications={notifications}
                  onMarkAllAsRead={handleMarkAllAsRead}
                  onOpenKutseroManagement={handleOpenKutseroManagement} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-8 pb-8 pt-6">
          {/* Content Container */}
          <div className="bg-white border border-gray-300 rounded-xl shadow-sm mb-6 overflow-hidden flex flex-col">
            
            {/* Tabs with Export Button */}
            <div className="flex items-center justify-between p-6 pb-4">
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-md rounded-xl p-1 border border-gray-200">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id)
                        setCurrentPage(1)
                      }}
                      className={`cursor-pointer px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center space-x-2 ${
                        activeTab === tab.id
                          ? 'bg-[#D2691E] text-white shadow-md'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* EXPORT BUTTON - Only show on User Accounts tab */}
              {activeTab === "accounts" && accountStatusTab === "active" && (
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <Download size={16} />
                  Export PDF
                </button>
              )}
            </div>

            {/* User Approval Section */}
            {activeTab === "approval" && (
              <div className="px-6 pb-6 flex-1 flex flex-col overflow-hidden">
                <div className="flex gap-4 mb-6 items-center flex-wrap flex-shrink-0">
                  {/* Search Container */}
                  <div className="relative flex-1 min-w-[280px]">
                    <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onFocus={() => setSearchFocus(true)}
                      onBlur={() => setSearchFocus(false)}
                      className="w-full py-3 px-11 border border-gray-300 rounded-lg text-sm bg-gray-50 transition-all duration-200 focus:outline-none focus:border-[#D2691E] focus:ring-3 focus:ring-[#D2691E]/20 focus:bg-white"
                    />
                  </div>

                  {/* Role Filter */}
                  <select
                    className="py-3 px-4 border border-gray-300 rounded-lg text-sm bg-gray-50 min-w-40 cursor-pointer transition-all duration-200 focus:outline-none focus:border-[#D2691E] focus:ring-3 focus:ring-[#D2691E]/20 focus:bg-white"
                    value={approvalRoleFilter}
                    onChange={(e) => setApprovalRoleFilter(e.target.value)}
                  >
                    <option value="all">All Roles</option>
                    <option value="kutsero">Kutsero</option>
                    <option value="horse operator">Horse Operator</option>
                  </select>

                  {/* Status Filter */}
                  <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                    {["all", "pending", "declined"].map((f) => (
                      <button
                        key={f}
                        className={`py-2.5 px-4.5 border-none bg-transparent rounded-md text-sm font-medium text-gray-500 cursor-pointer flex items-center gap-2 transition-all duration-200 ${
                          approvalFilter === f 
                            ? 'bg-white text-gray-700 shadow-sm' 
                            : 'hover:bg-gray-200'
                        }`}
                        onClick={() => setApprovalFilter(f)}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                        <span
                          className={`text-xs font-semibold text-white rounded-full py-0.5 px-2 min-w-[26px] text-center ${
                            f === "pending"
                              ? "bg-[#D2691E]"
                              : f === "declined"
                                ? "bg-red-500"
                                : "bg-gray-500"
                          }`}
                        >
                          {getApprovalCounts()[f]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Approval Table */}
                <div className="border border-gray-300 rounded-lg overflow-hidden flex-1 flex flex-col shadow-sm">
                  <div className="overflow-x-auto flex-1 flex flex-col">
                    {loading.approval ? (
                      <TableSkeleton rows={8} columns={5} />
                    ) : (
                      <table className="w-full border-collapse min-w=[600px]">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th className="py-3 px-4 text-center font-semibold text-gray-700 text-sm border-b border-gray-300">
                              Registration Date
                            </th>
                            <th className="py-3 px-4 text-center font-semibold text-gray-700 text-sm border-b border-gray-300">
                              Name
                            </th>
                            <th className="py-3 px-4 text-center font-semibold text-gray-700 text-sm border-b border-gray-300">
                              Email
                            </th>
                            <th className="py-3 px-4 text-center font-semibold text-gray-700 text-sm border-b border-gray-300">
                              Status
                            </th>
                            <th className="py-3 px-4 text-center font-semibold text-gray-700 text-sm border-b border-gray-300">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentApprovalItems.length > 0 ? (
                            currentApprovalItems.map((user) => (
                              <tr 
                                key={user.id} 
                                id={`user-row-${user.id}`}
                                className={`text-center border-b border-gray-100 transition-all duration-500 hover:bg-gray-50 group ${
                                  highlightedUser === user.id 
                                    ? 'highlight-zoom' 
                                    : ''
                                }`}
                              >
                                <td className="py-3 px-4 text-sm text-gray-700">
                                  {user.date}
                                </td>
                                <td className="py-3 px-4 text-sm font-medium text-gray-900">
                                  <div className="flex items-center justify-center gap-2">
                                    {user.name}
                                    {highlightedUser === user.id && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                        New
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-600">
                                  {user.email}
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                      user.status === "pending" 
                                        ? "bg-[#D2691E]/10 text-[#D2691E]" 
                                        : user.status === "approved"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="justify-center flex items-center gap-2">
                                    <button 
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-xs text-gray-600 cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:border-gray-400"
                                      onClick={() => handleViewUser(user)}
                                    >
                                      <Eye size={14} />
                                      View
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="5" className="py-8 text-center text-gray-500">
                                <div className="flex flex-col items-center gap=2">
                                  <Users size={32} className="text-gray-300" />
                                  <p className="text-sm">No users found</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                  
                  {/* Pagination Controls */}
                  {getFilteredApprovalUsers().length > 0 && !loading.approval && (
                    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
                      <div className="text-sm text-gray-600 mb-4 sm:mb-0">
                        Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                        <span className="font-medium">
                          {indexOfLastItem > getFilteredApprovalUsers().length 
                            ? getFilteredApprovalUsers().length 
                            : indexOfLastItem}
                        </span> of{" "}
                        <span className="font-medium">{getFilteredApprovalUsers().length}</span> results
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                        {/* Items per page selector */}
                        <div className="flex items-center">
                          <span className="text-sm text-gray-600 mr-2">Show:</span>
                          <select
                            value={itemsPerPage}
                            onChange={(e) => {
                              setItemsPerPage(Number(e.target.value));
                              setCurrentPage(1);
                            }}
                            className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#D2691E] focus:border-[#D2691E]"
                          >
                            <option value="5">5</option>
                            <option value="10">10</option>
                            <option value="20">20</option>
                            <option value="50">50</option>
                          </select>
                        </div>

                        <div className="flex items-center space-x-2">
                          {/* Previous button */}
                          <button
                            onClick={prevPage}
                            disabled={currentPage === 1}
                            className={`p-2 rounded-md border transition-colors duration-200 ${
                              currentPage === 1
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300"
                                : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300 hover:border-gray-400"
                            }`}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          {/* Page numbers */}
                          <div className="flex space-x-1">
                            {getPageNumbers(totalPagesApproval).map((number) => (
                              <button
                                key={number}
                                onClick={() => paginate(number)}
                                className={`w-8 h-8 flex items-center justify-center rounded-md border text-sm transition-colors duration-200 ${
                                  currentPage === number
                                    ? "bg-[#D2691E] text-white border-[#D2691E]"
                                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                {number}
                              </button>
                            ))}
                          </div>

                          {/* Next button */}
                          <button
                            onClick={nextPage}
                            disabled={currentPage === totalPagesApproval}
                            className={`p-2 rounded-md border transition-colors duration-200 ${
                              currentPage === totalPagesApproval
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300"
                                : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300 hover:border-gray-400"
                            }`}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* User Accounts Section */}
            {activeTab === "accounts" && (
              <div className="px-6 pb-6 flex-1 flex flex-col overflow-hidden">
                <div className="flex gap-4 mb-6 items-center flex-wrap flex-shrink-0">
                  <div className="relative flex-1 min-w=[280px]">
                    <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onFocus={() => setSearchFocus(true)}
                      onBlur={() => setSearchFocus(false)}
                      className="w-full py-3 px-11 border border-gray-300 rounded-lg text-sm bg-gray-50 transition-all duration-200 focus:outline-none focus:border-[#D2691E] focus:ring-3 focus:ring-[#D2691E]/20 focus:bg-white"
                    />
                  </div>
                  
                  <select
                    className="py-3 px-4 border border-gray-300 rounded-lg text-sm bg-gray-50 min-w-40 cursor-pointer transition-all duration-200 focus:outline-none focus:border-[#D2691E] focus:ring-3 focus:ring-[#D2691E]/20 focus:bg-white"
                    value={accountRoleFilter}
                    onChange={(e) => setAccountRoleFilter(e.target.value)}
                  >
                    <option value="All">All Roles</option>
                    <option value="kutsero">Kutsero</option>
                    <option value="horse operator">Horse Operator</option>
                  </select>
                  
                  <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                    {["active", "deactivated"].map((tab) => (
                      <button
                        key={tab}
                        className={`py-2.5 px-4.5 border-none bg-transparent rounded-md text-sm font-medium text-gray-500 cursor-pointer transition-all duration-200 ${
                          accountStatusTab === tab 
                            ? 'bg-white text-gray-700 shadow-sm' 
                            : 'hover:bg-gray-200'
                        }`}
                        onClick={() => setAccountStatusTab(tab)}
                      >
                        {tab === "active" ? "Active Accounts" : "Deactivated Accounts"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border border-gray-300 rounded-lg overflow-hidden flex-1 flex flex-col shadow-sm">
                  <div className="overflow-x-auto flex-1 flex flex-col">
                    {loading.accounts ? (
                      <TableSkeleton rows={8} columns={6} />
                    ) : (
                      <table className="w-full border-collapse min-w=[600px]">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th className="py-3 px-4 text-center font-semibold text-gray-700 text-sm border-b border-gray-300">
                              Approved Date
                            </th>
                            <th className="py-3 px-4 text-center font-semibold text-gray-700 text-sm border-b border-gray-300">
                              Name
                            </th>
                            <th className="py-3 px-4 text-center font-semibold text-gray-700 text-sm border-b border-gray-300">
                              Email
                            </th>
                            <th className="py-3 px-4 text-center font-semibold text-gray-700 text-sm border-b border-gray-300">
                              Contact Number
                            </th>
                            {accountRoleFilter.toLowerCase() === "all" && (
                              <th className="py-3 px-4 text-center font-semibold text-gray-700 text-sm border-b border-gray-300">
                                Role
                              </th>
                            )}
                            <th className="py-3 px-4 text-center font-semibold text-gray-700 text-sm border-b border-gray-300">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentAccountItems.map((user) => (
                            <tr key={user.id} className="text-center border-b border-gray-100 transition-all duration-200 hover:bg-gray-50 group">
                              <td className="py-3 px-4 text-sm text-gray-700">
                                {user.date}
                              </td>
                              <td className="py-3 px-4 text-sm font-medium text-gray-900">
                                {user.name}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {user.email}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-700">
                                {user.contact_num}
                              </td>
                              {accountRoleFilter.toLowerCase() === "all" && (
                                <td className="py-3 px-4">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                      user.role.toLowerCase().includes('kutsero') 
                                        ? "bg-[#D2691E]/10 text-[#D2691E]" 
                                        : user.role.toLowerCase().includes('operator') 
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-yellow-100 text-yellow-800"
                                    }`}
                                  >
                                    {user.role}
                                  </span>
                                </td>
                              )}
                              <td className="py-3 px-4">
                                <div className="justify-center flex items-center gap-2">
                                  <button
                                    onClick={() => handleViewUser(user)}
                                    className="p-1.5 bg-white border border-gray-300 rounded-md text-gray-600 cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:border-gray-400"
                                    title="View User"
                                  >
                                    <Eye size={14} />
                                  </button>

                                  {user.status === "deactivated" ? (
                                    <button
                                      onClick={() => {
                                        setActionUser(user)
                                        setConfirmAction("reactivate")
                                      }}
                                      className="p-1.5 bg-green-50 border border-green-200 rounded-md text-green-600 cursor-pointer transition-all duration-200 hover:bg-green-100 hover:border-green-300"
                                      title="Reactivate User"
                                    >
                                      <CheckCircle size={14} />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setActionUser(user)
                                        setConfirmAction("deactivate")
                                      }}
                                      className="p-1.5 bg-red-50 border border-red-200 rounded-md text-red-600 cursor-pointer transition-all duration-200 hover:bg-red-100 hover:border-red-300"
                                      title="Deactivate User"
                                    >
                                      <XCircle size={14} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {!loading.accounts && getFilteredAccountUsers().length === 0 && (
                      <div className="py-8 text-center text-gray-500">
                        <div className="flex flex-col items-center gap=2">
                          <Users size={32} className="text-gray-300" />
                          <p className="text-sm">No users found</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Pagination Controls */}
                  {getFilteredAccountUsers().length > 0 && !loading.accounts && (
                    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
                      <div className="text-sm text-gray-600 mb-4 sm:mb-0">
                        Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                        <span className="font-medium">
                          {indexOfLastItem > getFilteredAccountUsers().length 
                            ? getFilteredAccountUsers().length 
                            : indexOfLastItem}
                        </span> of{" "}
                        <span className="font-medium">{getFilteredAccountUsers().length}</span> results
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        {/* Items per page selector */}
                        <div className="flex items-center">
                          <span className="text-sm text-gray-600 mr-2">Show:</span>
                          <select
                            value={itemsPerPage}
                            onChange={(e) => {
                              setItemsPerPage(Number(e.target.value));
                              setCurrentPage(1);
                            }}
                            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                          >
                            <option value="5">5</option>
                            <option value="10">10</option>
                            <option value="20">20</option>
                            <option value="50">50</option>
                          </select>
                        </div>

                        <div className="flex items-center space-x-2">
                          {/* Previous button */}
                          <button
                            onClick={prevPage}
                            disabled={currentPage === 1}
                            className={`p-2 rounded-md border ${
                              currentPage === 1
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-white text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          {/* Page numbers */}
                          <div className="flex space-x-1">
                            {getPageNumbers(totalPagesAccount).map((number) => (
                              <button
                                key={number}
                                onClick={() => paginate(number)}
                                className={`w-8 h-8 flex items-center justify-center rounded-md border text-sm ${
                                  currentPage === number
                                    ? "bg-[#D2691E] text-white border-[#D2691E]"
                                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                {number}
                              </button>
                            ))}
                          </div>

                          {/* Next button */}
                          <button
                            onClick={nextPage}
                            disabled={currentPage === totalPagesAccount}
                            className={`p-2 rounded-md border ${
                              currentPage === totalPagesAccount
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-white text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* User Detail Modal */}
        {showModal && selectedUser && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-1000 p-5" onClick={handleCloseModal}>
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header - Fixed and not scrollable */}
              <div className="flex justify-between items-center p-6 border-b border-gray-300 flex-shrink-0">
                <h2 className="text-2xl font-bold text-gray-800 m-0">User Details</h2>
                <button className="bg-none border-none text-2xl cursor-pointer text-gray-400 p-1 rounded-md transition-all duration-200 hover:bg-gray-100 hover:text-gray-600" onClick={handleCloseModal}>
                  ✕
                </button>
              </div>

              {/* Scrollable Content Area - Header is excluded from scroll */}
              <div className="overflow-y-auto flex-1">
                <div className="p-6">
                  <div className="flex gap-8 flex-wrap">
                    <div className="flex flex-col items-center min-w-[200px]">
                      {/* CLICKABLE PROFILE IMAGE */}
                      <div 
                        className="w-32 h-32 rounded-full object-cover border-4 border-gray-100 shadow-md cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg"
                        onClick={() => handleProfileImageClick(selectedUser)}
                      >
                        <img
                          src={selectedUser.profilePicture || selectedUser.profile_picture || "/placeholder.svg"}
                          alt="Profile"
                          className="w-full h-full rounded-full object-cover"
                          onError={(e) => {
                            const initials = getInitials(selectedUser.name);
                            if (initials && initials !== "NA") {
                              e.target.src = createInitialAvatar(initials, "#D2691E");
                            } else {
                              e.target.src = "https://via.placeholder.com/120x120?text=Profile";
                            }
                          }}
                        />
                      </div>
                      <h2 className="mt-2.5 mb-1.5 text-xl font-semibold">{selectedUser.name}</h2>
                      <p className="m-0 mb-2.5 text-gray-500">{selectedUser.role}</p>
                      {activeTab === "approval" && (
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-gray-500 mb-1">Current Status:</span>
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              selectedUser.status === "pending" 
                                ? "bg-[#D2691E]/10 text-[#D2691E]" 
                                : selectedUser.status === "approved"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {selectedUser.status.charAt(0).toUpperCase() + selectedUser.status.slice(1)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-[300px]">
                      <div className="mb-7">
                        <h3 className="text-lg font-semibold text-gray-700 m-0 mb-4.5 pb-2.5 border-b border-gray-300">Personal Information</h3>
                        <div className="flex flex-col gap-3.5">
                          <div className="flex gap-3.5">
                            <span className="min-w-[140px] text-sm font-medium text-gray-500">Full Name:</span>
                            <span className="text-sm text-gray-700 flex-1">{selectedUser.name}</span>
                          </div>
                          <div className="flex gap-3.5">
                            <span className="min-w-[140px] text-sm font-medium text-gray-500">Date of Birth:</span>
                            <span className="text-sm text-gray-700 flex-1">{selectedUser.dateOfBirth || selectedUser.dob}</span>
                          </div>
                          <div className="flex gap-3.5">
                            <span className="min-w-[140px] text-sm font-medium text-gray-500">Gender:</span>
                            <span className="text-sm text-gray-700 flex-1">{selectedUser.sex || selectedUser.gender}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mb-7">
                        <h3 className="text-lg font-semibold text-gray-700 m-0 mb-4.5 pb-2.5 border-b border-gray-300">Contact Information</h3>
                        <div className="flex flex-col gap-3.5">
                          <div className="flex gap-3.5">
                            <span className="min-w-[140px] text-sm font-medium text-gray-500">Email Address:</span>
                            <span className="text-sm text-gray-700 flex-1">{selectedUser.email}</span>
                          </div>
                          <div className="flex gap-3.5">
                            <span className="min-w-[140px] text-sm font-medium text-gray-500">Phone Number:</span>
                            <span className="text-sm text-gray-700 flex-1">{selectedUser.phoneNumber || selectedUser.contact_num}</span>
                          </div>
                          <div className="flex gap-3.5">
                            <span className="min-w-[140px] text-sm font-medium text-gray-500">Home Address:</span>
                            <span className="text-sm text-gray-700 flex-1">{selectedUser.address}</span>
                          </div>
                        </div>
                      </div>

                      {/* Decline Reason Section - Only show for declined users */}
                      {activeTab === "approval" && selectedUser.status === "declined" && selectedUser.declineReason && (
                        <div className="mb-7">
                          <h3 className="text-lg font-semibold text-gray-700 m-0 mb-4.5 pb-2.5 border-b border-gray-300">Decline Information</h3>
                          <div className="flex flex-col gap=3.5">
                            <div className="flex gap-3.5">
                              <span className="min-w-[140px] text-sm font-medium text-gray-500">Reason for Decline:</span>
                              <div className="flex-1">
                                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                                  <p className="text-sm text-red-700 m-0">{selectedUser.declineReason}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Only show for pending approval users */}
                {activeTab === "approval" && selectedUser.status === "pending" && (
                  <div className="flex justify-end gap-3.5 p-6 border-t border-gray-300 flex-shrink-0">
                    <button 
                      className="flex items-center justify-center gap-2 py-3 px-6 bg-red-600 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 hover:bg-red-700"
                      onClick={() => openDeclineModal(selectedUser)}
                    >
                      <XCircle size={18} />
                      Decline
                    </button>
                    <button 
                      className="flex items-center justify-center gap-2 py-3 px-6 bg-green-600 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 hover:bg-green-700"
                      onClick={() => handleApprove(selectedUser.id)}
                    >
                      <CheckCircle size={18} />
                      Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Enlarged Profile Image Modal */}
        {enlargedImage && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-1001 p-5"
            onClick={closeEnlargedImage}
          >
            <div 
              className="relative flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button 
                className="absolute -top-16 right-0 bg-none border-none text-3xl cursor-pointer text-white p-1 rounded-md transition-all duration-200 hover:bg-white/20 z-10"
                onClick={closeEnlargedImage}
              >
                ✕
              </button>
              
              {/* Profile image - Fixed size */}
              <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
                <img
                  src={enlargedImage.src}
                  alt={enlargedImage.alt}
                  className="w-96 h-96 object-cover"
                  onError={(e) => {
                    const initials = getInitials(enlargedImage.name);
                    if (initials && initials !== "NA") {
                      e.target.src = createInitialAvatar(initials, "#D2691E", 384);
                    } else {
                      e.target.src = "https://via.placeholder.com/384x384?text=Profile";
                    }
                  }}
                />
              </div>
              
              {/* User name caption */}
              <div className="mt-4 text-center">
                <p className="text-white text-lg font-semibold m-0">{enlargedImage.name}</p>
              </div>
            </div>
          </div>
        )}

        {/* Decline Confirmation Modal with Reason Field */}
        {showDeclineModal && userToDecline && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-1000 p-5" onClick={closeDeclineModal}>
            <div className="bg-white rounded-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center p-6 border-b border-gray-300">
                <h3 className="text-lg font-bold text-gray-800 m-0">Decline User</h3>
                <button className="bg-none border-none text-2xl cursor-pointer text-gray-400 p-1 rounded-md transition-all duration-200 hover:bg-gray-100 hover:text-gray-600" onClick={closeDeclineModal}>✕</button>
              </div>
              
              <div className="p-6">
                <p className="mb-4 leading-relaxed">
                  Are you sure you want to decline <span className="font-semibold text-gray-900">{userToDecline.name}</span>?
                </p>
                
                <div className="mb-4">
                  <label htmlFor="declineReason" className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for declining (required):
                  </label>
                  <textarea
                    id="declineReason"
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="Please provide a reason for declining this user..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:border-[#D2691E] focus:ring-2 focus:ring-[#D2691E]/20"
                    rows="4"
                    required
                  />
                </div>
                
                <p className="text-sm text-gray-500 italic m-0">
                  The user will be notified about this decision.
                </p>
              </div>
              
              <div className="flex justify-end gap-3.5 p-6 border-t border-gray-300">
                <button 
                  className="py-2.5 px-5 border border-gray-300 bg-white rounded-md text-sm text-gray-600 cursor-pointer transition-all duration-200 hover:bg-gray-100 hover:border-gray-400"
                  onClick={closeDeclineModal}
                >
                  Cancel
                </button>
                <button
                  className="py-2.5 px-5 bg-red-600 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
                  onClick={() => handleDecline(userToDecline.id, declineReason)}
                  disabled={!declineReason.trim()}
                >
                  Decline User
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal for Account Actions */}
        {confirmAction && actionUser && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-1000 p-5" onClick={() => setConfirmAction(null)}>
            <div className="bg-white rounded-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center p-6 border-b border-gray-300">
                <h3 className="text-lg font-bold text-gray-800 m-0">
                  {confirmAction === "deactivate" ? "Deactivate Account" : "Reactivate Account"}
                </h3>
                <button className="bg-none border-none text-2xl cursor-pointer text-gray-400 p-1 rounded-md transition-all duration-200 hover:bg-gray-100 hover:text-gray-600" onClick={() => setConfirmAction(null)}>✕</button>
              </div>
              
              <div className="p-6">
                <p className="mb-3 leading-relaxed">
                  {confirmAction === "deactivate"
                    ? "Are you sure you want to deactivate "
                    : "Are you sure you want to reactivate "}
                  <span className="font-semibold text-gray-900">{actionUser.name}</span>?
                </p>
                <p className="text-sm text-gray-500 italic m-0">
                  {confirmAction === "deactivate"
                    ? "The account will be disabled but can be reactivated later."
                    : "The account will be reactivated and the user can access it again."}
                </p>
              </div>
              
              <div className="flex justify-end gap-3.5 p-6 border-t border-gray-300">
                <button 
                  className="py-2.5 px-5 border border-gray-300 bg-white rounded-md text-sm text-gray-600 cursor-pointer transition-all duration-200 hover:bg-gray-100 hover:border-gray-400"
                  onClick={() => setConfirmAction(null)}
                >
                  Cancel
                </button>
                <button
                  className={`py-2.5 px-5 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 ${
                    confirmAction === "deactivate" 
                      ? "bg-red-600 hover:bg-red-700" 
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                  onClick={() => handleUserAction(confirmAction, actionUser)}
                >
                  {confirmAction === "deactivate" ? "Deactivate" : "Reactivate"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Alert - Center Top Position */}
        {alert && (
          <div
            className={`fixed top-6 left-1/2 transform -translate-x-1/2 py-4 px-6 rounded-lg flex items-center gap-3 shadow-lg transition-all duration-300 z-1000 ${
              showAlert 
                ? 'translate-y-0 opacity-100' 
                : '-translate-y-24 opacity-0'
            } ${
              alert.type === "success" 
                ? "bg-green-600 text-white" 
                : "bg-red-600 text-white"
            }`}
          >
            {alert.type === "success" ? (
              <CheckCircle size={20} color="white" />
            ) : (
              <XCircle size={20} color="white" />
            )}
            {alert.message}
          </div>
        )}
      </div>

      {/* ADDED: Floating Messages Component */}
      <FloatingMessages />

      <style>{`
        .highlight-zoom {
          animation: zoomInOut 2s ease-in-out;
          transform-origin: center;
        }
        
        @keyframes zoomInOut {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
          100% {
            transform: scale(1);
          }
        }
        
        .highlight-flash {
          animation: gentleFlash 0.3s ease-in-out 2;
        }
        
        @keyframes gentleFlash {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  )
}

export default UserManagement;