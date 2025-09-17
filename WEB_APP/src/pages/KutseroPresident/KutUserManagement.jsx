// UserManagement.jsx
import { useState, useEffect } from "react"
import { Bell, Search, Filter, Eye, CheckCircle, XCircle, Users } from "lucide-react"
import Sidebar from '@/components/KutSidebar';
import FloatingMessages from './KutMessages';
import NotificationModal from './KutNotif';

const API_BASE = "http://localhost:8000/api/kutsero_president"

const UserManagement = () => {
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

  // Approval page states
  const [approvalUsers, setApprovalUsers] = useState([])
  const [approvalLoading, setApprovalLoading] = useState(true)
  const [approvalFilter, setApprovalFilter] = useState("all")
  const [approvalRoleFilter, setApprovalRoleFilter] = useState("all")

  // Accounts page states
  const [accountUsers, setAccountUsers] = useState([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [accountRoleFilter, setAccountRoleFilter] = useState("All")
  const [accountStatusTab, setAccountStatusTab] = useState("active")
  const [confirmAction, setConfirmAction] = useState(null)
  const [actionUser, setActionUser] = useState(null)
  const [hoveredRow, setHoveredRow] = useState(null)
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Fetch approval users
  useEffect(() => {
    const fetchApprovalUsers = async () => {
      try {
        const res = await fetch(`${API_BASE}/get_user_approvals/`, {
          method: "GET",
          credentials: "include",
        })
        const data = await res.json()
        const formatted = data.map((u) => ({
          id: u.id,
          name: u.name || "N/A",
          email: u.email || "N/A",
          date: u.created_at ? new Date(u.created_at).toISOString().split("T")[0] : "N/A",
          status: (u.status || "pending").toLowerCase(),
          role: u.role || "N/A",
          profilePicture: u.profilePicture,
          dateOfBirth: u.dateOfBirth,
          sex: u.sex,
          phoneNumber: u.phoneNumber,
          address: u.address,
          facebook: u.facebook,
        }))
        setApprovalUsers(formatted)
      } catch (err) {
        console.error("❌ Error fetching approval users:", err)
      } finally {
        setApprovalLoading(false)
      }
    }
    fetchApprovalUsers()
  }, [])

  // Fetch account users
  useEffect(() => {
    const fetchAccountUsers = async () => {
      try {
        const res = await fetch(`${API_BASE}/get_approved_users/`, {
          method: "GET",
          credentials: "include",
        })
        if (!res.ok) throw new Error("Failed to fetch users")
        const data = await res.json()
        const formatted = (data.users || []).map((u) => ({
          id: u.id,
          name: u.name || "N/A",
          email: u.email || "N/A",
          contact_num: u.phoneNumber || "N/A",
          date: u.approved_date ? new Date(u.approved_date).toISOString().split("T")[0] : "N/A",
          status: (u.status || "pending").toLowerCase(),
          role: u.role || "N/A",
          profile_picture: u.profilePicture || "https://via.placeholder.com/100",
          dob: u.dateOfBirth || "N/A",
          gender: u.sex || "N/A",
          address: u.address || "N/A",
          facebook: u.facebook || "N/A",
        }))
        setAccountUsers(formatted)
      } catch (err) {
        console.error("Error fetching account users:", err)
      } finally {
        setAccountsLoading(false)
      }
    }
    fetchAccountUsers()
  }, [])

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
        setAlert({ type: "success", message: "✅ User approved successfully!" })
      }
    } catch (err) {
      console.error("❌ Error approving user:", err)
      setAlert({ type: "error", message: "❌ Failed to approve user." })
    }
  }

  const handleDecline = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/decline_user/${userId}/`, {
        method: "POST",
        credentials: "include",
      })
      if (res.ok) {
        setApprovalUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: "declined" } : u)))
        handleCloseModal()
        setAlert({ type: "success", message: "⚠️ User declined successfully!" })
      }
    } catch (err) {
      console.error("❌ Error declining user:", err)
      setAlert({ type: "error", message: "❌ Failed to decline user." })
    }
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

  // Get pending users for notifications
  const pendingUsers = approvalUsers.filter((u) => u.status === "pending" && u.status !== "deactivated")

    const getRoleDisplayName = (role) => {
    switch (role?.toLowerCase()) {
      case 'kutsero': return 'Kutsero';
      case 'horse_operator': return 'Horse Operator';
      default: return role;
    }
  };

  return (
    <div style={styles.container}>
      <Sidebar />
      <div style={styles.content}>
        {/* Header Section */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>User Management</h1>
            <p style={styles.subtitle}>Review requests and manage account status</p>
          </div>

          {/* Notification Bell */}
          <div style={{ position: "relative" }}>
            <button
              style={styles.notificationBtn}
              onClick={() => setNotifOpen(!notifOpen)}
              aria-label="Notifications"
            >
              <Bell size={24} color="#4B5563" />
              {pendingUsers.length > 0 && (
                <span style={styles.badge}>{pendingUsers.length}</span>
              )}
            </button>

            <NotificationModal
              isOpen={notifOpen}
              onClose={() => setNotifOpen(false)}
              notifications={pendingUsers.map(u => ({
                message: `${u.name} (${getRoleDisplayName(u.role)}) is pending approval`,
                date: u.created_at !== "N/A" ? new Date(u.created_at) : new Date()
              }))}
            />
          </div>
        </div>

        <div style={styles.scrollableContent}>
          {/* Main Navigation Tabs - Fixed at top */}
          <div style={styles.mainTabsContainer}>
            <div 
              style={{ 
                ...styles.tabSlider,
                width: `calc(50% - 8px)`, 
                left: activeTab === "approval" ? '8px' : 'calc(50% + 4px)' 
              }} 
            />  
            <button
              style={{
                ...styles.mainTab,
                ...(activeTab === "approval" ? styles.mainTabActive : {})
              }}
              onClick={() => {
                setActiveTab("approval")
                setCurrentPage(1)
              }}
            >
              <Users size={20} />
              User Approval
            </button>
            <button
              style={{
                ...styles.mainTab,
                ...(activeTab === "accounts" ? styles.mainTabActive : {})
              }}
              onClick={() => {
                setActiveTab("accounts")
                setCurrentPage(1)
              }}
            >
              <CheckCircle size={20} />
              User Accounts
            </button>
          </div>

          {/* Content Container */}
          <div style={styles.contentContainer}>
            {/* User Approval Section */}
            {activeTab === "approval" && (
              <div style={styles.tabContent}>
                <div style={styles.searchFilterContainer}>
                  {/* Search Container */}
                  <div style={styles.searchWrapper}>
                    <Search style={styles.searchIcon} size={18} />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onFocus={() => setSearchFocus(true)}
                      onBlur={() => setSearchFocus(false)}
                      style={styles.searchInput}
                    />
                  </div>

                  {/* Role Filter */}
                  <select
                    style={styles.filterDropdown}
                    value={approvalRoleFilter}
                    onChange={(e) => setApprovalRoleFilter(e.target.value)}
                  >
                    <option value="all">All Roles</option>
                    <option value="kutsero">Kutsero</option>
                    <option value="horse operator">Horse Operator</option>
                  </select>

                  {/* Status Filter */}
                  <div style={styles.statusTabs}>
                    {["all", "pending", "declined"].map((f) => (
                      <button
                        key={f}
                        style={{
                          ...styles.statusTab,
                          ...(approvalFilter === f ? styles.statusTabActive : {})
                        }}
                        onClick={() => setApprovalFilter(f)}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                        <span
                          style={{
                            ...styles.statusBadge,
                            backgroundColor:
                                f === "pending"
                                  ? "#f59e0b"
                                  : f === "declined"
                                    ? "#ef4444"
                                    : "#6b7280",
                          }}
                        >
                          {getApprovalCounts()[f]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Approval Table */}
                <div style={styles.tableContainer}>
                  <div style={styles.tableScrollContainer}>
                    {approvalLoading ? (
                      <p style={{ textAlign: "center", padding: "2rem" }}>Loading users...</p>
                    ) : (
                      <table style={styles.dataTable}>
                        <thead style={styles.tableHeader}>
                          <tr>
                            <th style={styles.tableHeaderCell}>Registration Date</th>
                            <th style={styles.tableHeaderCell}>Name</th>
                            <th style={styles.tableHeaderCell}>Email</th>
                            <th style={styles.tableHeaderCell}>Status</th>
                            <th style={styles.tableHeaderCell}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentApprovalItems.length > 0 ? (
                            currentApprovalItems.map((user) => (
                              <tr key={user.id} style={styles.tableRow}>
                                <td style={styles.tableCell}>{user.date}</td>
                                <td style={styles.tableCell}>{user.name}</td>
                                <td style={styles.tableCell}>{user.email}</td>
                                <td style={styles.tableCell}>
                                  <span
                                    style={{
                                      ...styles.statusIndicator,
                                      ...(user.status === "pending" 
                                        ? styles.statusPending 
                                        : user.status === "approved"
                                        ? styles.statusApproved
                                        : styles.statusDeclined)
                                    }}
                                  >
                                    {user.status.toUpperCase()}
                                  </span>
                                </td>
                                <td style={styles.tableCell}>
                                  <button style={styles.viewBtn} onClick={() => handleViewUser(user)}>
                                    <Eye size={16} />
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="5" style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                                No users found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                  
                  {/* Pagination */}
                  <div style={styles.paginationContainer}>
                    <div style={styles.paginationInfo}>
                      Showing {Math.min(itemsPerPage, currentApprovalItems.length)} of {getFilteredApprovalUsers().length} users
                    </div>
                    <div style={styles.paginationControls}>
                      <button 
                        style={styles.paginationBtn} 
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                      
                      {Array.from({ length: totalPagesApproval }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          style={{
                            ...styles.paginationBtn,
                            ...(currentPage === page ? styles.paginationBtnActive : {})
                          }}
                          onClick={() => paginate(page)}
                        >
                          {page}
                        </button>
                      ))}
                      
                      <button 
                        style={styles.paginationBtn} 
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === totalPagesApproval}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* User Accounts Section */}
            {activeTab === "accounts" && (
              <div style={styles.tabContent}>
                <div style={styles.searchFilterContainer}>
                  <div style={styles.searchWrapper}>
                    <Search style={styles.searchIcon} size={18} />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onFocus={() => setSearchFocus(true)}
                      onBlur={() => setSearchFocus(false)}
                      style={styles.searchInput}
                    />
                  </div>
                  
                  <select
                    style={styles.filterDropdown}
                    value={accountRoleFilter}
                    onChange={(e) => setAccountRoleFilter(e.target.value)}
                  >
                    <option value="All">All Roles</option>
                    <option value="kutsero">Kutsero</option>
                    <option value="horse operator">Horse Operator</option>
                  </select>
                  
                  <div style={styles.statusTabs}>
                    {["active", "deactivated"].map((tab) => (
                      <button
                        key={tab}
                        style={{
                          ...styles.statusTab,
                          ...(accountStatusTab === tab ? styles.statusTabActive : {})
                        }}
                        onClick={() => setAccountStatusTab(tab)}
                      >
                        {tab === "active" ? "Active Accounts" : "Deactivated Accounts"}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={styles.tableContainer}>
                  <div style={styles.tableScrollContainer}>
                    <table style={styles.dataTable}>
                      <thead style={styles.tableHeader}>
                        <tr>
                          <th style={styles.tableHeaderCell}>Approved Date</th>
                          <th style={styles.tableHeaderCell}>Name</th>
                          <th style={styles.tableHeaderCell}>Email</th>
                          <th style={styles.tableHeaderCell}>Contact Number</th>
                          {accountRoleFilter.toLowerCase() === "all" && <th style={styles.tableHeaderCell}>Role</th>}
                          <th style={styles.tableHeaderCell}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentAccountItems.map((user) => (
                          <tr key={user.id} style={styles.tableRow}>
                            <td style={styles.tableCell}>{user.date}</td>
                            <td style={styles.tableCell}>{user.name}</td>
                            <td style={styles.tableCell}>{user.email}</td>
                            <td style={styles.tableCell}>{user.contact_num}</td>
                            {accountRoleFilter.toLowerCase() === "all" && (
                              <td style={styles.tableCell}>
                                <span
                                  style={{
                                    ...styles.roleBadge,
                                    ...(user.role.toLowerCase().includes('kutsero') 
                                      ? styles.roleKutsero 
                                      : user.role.toLowerCase().includes('operator') 
                                      ? styles.roleOperator
                                      : styles.roleOther)
                                  }}
                                >
                                  {user.role}
                                </span>
                              </td>
                            )}
                            <td style={styles.tableCell}>
                              <div style={styles.actionButtons}>
                                <button
                                  onClick={() => handleViewUser(user)}
                                  style={styles.iconBtn}
                                  title="View User"
                                >
                                  <Eye size={18} />
                                </button>

                                {user.status === "deactivated" ? (
                                  <button
                                    onClick={() => {
                                      setActionUser(user)
                                      setConfirmAction("reactivate")
                                    }}
                                    style={styles.iconBtn}
                                    title="Reactivate User"
                                  >
                                    <CheckCircle size={18} color="#16a34a" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setActionUser(user)
                                      setConfirmAction("deactivate")
                                    }}
                                    style={styles.iconBtn}
                                    title="Deactivate User"
                                  >
                                    <XCircle size={18} color="#dc2626" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {getFilteredAccountUsers().length === 0 && (
                      <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                        <p>No users found.</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Pagination */}
                  <div style={styles.paginationContainer}>
                    <div style={styles.paginationInfo}>
                      Showing {Math.min(itemsPerPage, currentAccountItems.length)} of {getFilteredAccountUsers().length} users
                    </div>
                    <div style={styles.paginationControls}>
                      <button 
                        style={styles.paginationBtn} 
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                      
                      {Array.from({ length: totalPagesAccount }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          style={{
                            ...styles.paginationBtn,
                            ...(currentPage === page ? styles.paginationBtnActive : {})
                          }}
                          onClick={() => paginate(page)}
                        >
                          {page}
                        </button>
                      ))}
                      
                      <button 
                        style={styles.paginationBtn} 
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === totalPagesAccount}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User Detail Modal */}
        {showModal && selectedUser && (
          <div style={styles.modalOverlay} onClick={handleCloseModal}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>User Details</h2>
                <button style={styles.closeBtn} onClick={handleCloseModal}>
                  ✕
                </button>
              </div>

              <div style={styles.modalBody}>
                <div style={styles.userProfileContainer}>
                  <div style={styles.profileImageContainer}>
                    <img
                      src={selectedUser.profilePicture || selectedUser.profile_picture || "/placeholder.svg"}
                      alt="Profile"
                      style={styles.profileImage}
                    />
                    <h2 style={{ margin: "10px 0 5px", fontSize: "20px", fontWeight: "600" }}>{selectedUser.name}</h2>
                    <p style={{ margin: "0 0 10px", color: "#6b7280" }}>{selectedUser.role}</p>
                    {activeTab === "approval" && (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <span style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Current Status:</span>
                        <span
                          style={{
                            ...styles.statusIndicator,
                            ...(selectedUser.status === "pending" 
                              ? styles.statusPending 
                              : selectedUser.status === "approved"
                              ? styles.statusApproved
                              : styles.statusDeclined)
                          }}
                        >
                          {selectedUser.status.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={styles.userInfoContainer}>
                    <div style={styles.infoSection}>
                      <h3 style={styles.sectionTitle}>Personal Information</h3>
                      <div style={styles.infoGrid}>
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>Full Name:</span>
                          <span style={styles.infoValue}>{selectedUser.name}</span>
                        </div>
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>Date of Birth:</span>
                          <span style={styles.infoValue}>{selectedUser.dateOfBirth || selectedUser.dob}</span>
                        </div>
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>Gender:</span>
                          <span style={styles.infoValue}>{selectedUser.sex || selectedUser.gender}</span>
                        </div>
                      </div>
                    </div>

                    <div style={styles.infoSection}>
                      <h3 style={styles.sectionTitle}>Contact Information</h3>
                      <div style={styles.infoGrid}>
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>Email Address:</span>
                          <span style={styles.infoValue}>{selectedUser.email}</span>
                        </div>
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>Phone Number:</span>
                          <span style={styles.infoValue}>{selectedUser.phoneNumber || selectedUser.contact_num}</span>
                        </div>
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>Home Address:</span>
                          <span style={styles.infoValue}>{selectedUser.address}</span>
                        </div>
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>Facebook Profile:</span>
                          <a
                            href={`https://${selectedUser.facebook}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.infoLink}
                          >
                            {selectedUser.facebook}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Only show for pending approval users */}
              {activeTab === "approval" && selectedUser.status === "pending" && (
                <div style={styles.modalActions}>
                  <button style={styles.actionBtnDecline} onClick={() => handleDecline(selectedUser.id)}>
                    <XCircle size={18} />
                    Decline
                  </button>
                  <button style={styles.actionBtnApprove} onClick={() => handleApprove(selectedUser.id)}>
                    <CheckCircle size={18} />
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Confirmation Modal for Account Actions */}
        {confirmAction && actionUser && (
          <div style={styles.modalOverlay} onClick={() => setConfirmAction(null)}>
            <div style={{...styles.modalContent, maxWidth: "450px"}} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h3 style={{...styles.modalTitle, fontSize: "18px"}}>
                  {confirmAction === "deactivate" ? "Deactivate Account" : "Reactivate Account"}
                </h3>
                <button style={styles.closeBtn} onClick={() => setConfirmAction(null)}>✕</button>
              </div>
              
              <div style={styles.modalBody}>
                <p style={{ marginBottom: "12px", lineHeight: "1.5" }}>
                  {confirmAction === "deactivate"
                    ? "Are you sure you want to deactivate "
                    : "Are you sure you want to reactivate "}
                  <span style={{ fontWeight: "600", color: "#111" }}>{actionUser.name}</span>?
                </p>
                <p style={{ fontSize: "14px", color: "#6b7280", fontStyle: "italic", margin: 0 }}>
                  {confirmAction === "deactivate"
                    ? "The account will be disabled but can be reactivated later."
                    : "The account will be reactivated and the user can access it again."}
                </p>
              </div>
              
              <div style={styles.modalActions}>
                <button 
                  style={{...styles.paginationBtn, padding: "10px 20px"}} 
                  onClick={() => setConfirmAction(null)}
                >
                  Cancel
                </button>
                <button
                  style={{
                    ...(confirmAction === "deactivate" ? styles.actionBtnDecline : styles.actionBtnApprove),
                    padding: "10px 20px"
                  }}
                  onClick={() => handleUserAction(confirmAction, actionUser)}
                >
                  {confirmAction === "deactivate" ? "Deactivate" : "Reactivate"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Alert */}
        {alert && (
          <div
            style={{
              ...styles.alertContainer,
              ...(showAlert ? styles.alertVisible : {}),
              ...(alert.type === "success" ? styles.alertSuccess : styles.alertError)
            }}
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
    </div>
  )
}

const styles = {
  container: { 
    display: "flex", 
    minHeight: "100vh", 
    backgroundColor: "#f5f5f5", 
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    overflow: "hidden"
  },
  content: { 
    flex: 1, 
    display: "flex", 
    flexDirection: "column",
    overflow: "hidden"
  },
  header: { 
    padding: "16px 32px", 
    backgroundColor: "#fff", 
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)", 
    borderBottom: "1px solid #eaeaea", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "space-between", 
    background: "#ffffff", 
    flexShrink: 0, 
    zIndex: 100 
  },
  headerContent: { display: "flex", flexDirection: "column", gap: "4px" },
  title: { fontSize: "24px", fontWeight: "600", color: "#D2691E", margin: 0 },
  subtitle: { fontSize: "14px", color: "#666", margin: 0, fontWeight: "400" },
  notificationBtn: { background: "none", border: "none", cursor: "pointer", padding: "8px", borderRadius: "50%", position: "relative", transition: "background-color 0.2s ease", "&:hover": { backgroundColor: "#f3f4f6" } },
  badge: { position: "absolute", top: "-4px", right: "-4px", backgroundColor: "#ef4444", color: "white", borderRadius: "50%", width: "18px", height: "18px", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" },
  scrollableContent: { 
    flex: 1, 
    overflowY: "auto", 
    padding: "0 32px 32px 32px",
    display: "flex",
    flexDirection: "column"
  },
  mainTabsContainer: { 
    display: "flex", 
    backgroundColor: "#f8f9fa", 
    borderRadius: "8px 8px 0 0", 
    border: "1px solid #dee2e6", 
    borderBottom: "none", 
    position: "relative", 
    marginTop: "24px",
    flexShrink: 0
  },
  mainTab: { flex: 1, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", backgroundColor: "transparent", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "500", color: "#6c757d", transition: "all 0.2s ease", "&:hover": { backgroundColor: "#e9ecef" } },
  mainTabActive: { color: "#495057", fontWeight: "600" },
  tabSlider: { position: "absolute", bottom: 0, height: "3px", backgroundColor: "#D2691E", transition: "left 0.3s ease" },
  contentContainer: { 
    backgroundColor: "#fff", 
    border: "1px solid #dee2e6", 
    borderTop: "none", 
    borderRadius: "0 0 8px 8px", 
    marginBottom: "24px", 
    overflow: "hidden",
    flex: 1,
    display: "flex",
    flexDirection: "column"
  },
  tabContent: { 
    padding: "24px",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  },
  searchFilterContainer: { 
    display: "flex", 
    gap: "16px", 
    marginBottom: "24px", 
    alignItems: "center", 
    flexWrap: "wrap",
    flexShrink: 0
  },
  searchWrapper: { position: "relative", flex: "1", minWidth: "250px" },
  searchIcon: { position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#6c757d" },
  searchInput: { width: "100%", padding: "10px 12px 10px 40px", border: "1px solid #ced4da", borderRadius: "6px", fontSize: "14px", "&:focus": { outline: "none", borderColor: "#86b7fe", boxShadow: "0 0 0 0.25rem rgba(13, 110, 253, 0.25)" } },
  filterDropdown: { padding: "10px 12px", border: "1px solid #ced4da", borderRadius: "6px", fontSize: "14px", backgroundColor: "#fff", minWidth: "150px", "&:focus": { outline: "none", borderColor: "#86b7fe", boxShadow: "0 0 0 0.25rem rgba(13, 110, 253, 0.25)" } },
  statusTabs: { display: "flex", gap: "8px", backgroundColor: "#f8f9fa", borderRadius: "6px", padding: "4px" },
  statusTab: { padding: "8px 16px", border: "none", backgroundColor: "transparent", borderRadius: "4px", fontSize: "14px", fontWeight: "500", color: "#6c757d", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s ease", "&:hover": { backgroundColor: "#e9ecef" } },
  statusTabActive: { backgroundColor: "#fff", color: "#495057", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)" },
  statusBadge: { fontSize: "12px", fontWeight: "600", color: "#fff", borderRadius: "10px", padding: "2px 6px", minWidth: "24px", textAlign: "center" },
  tableContainer: { 
    border: "1px solid #dee2e6", 
    borderRadius: "6px", 
    overflow: "hidden",
    flex: 1,
    display: "flex",
    flexDirection: "column"
  },
  tableScrollContainer: { 
    overflowX: "auto",
    flex: 1,
    display: "flex",
    flexDirection: "column"
  },
  dataTable: { 
    width: "100%", 
    borderCollapse: "collapse",
    tableLayout: "fixed",
    minWidth: "600px"
  },
  tableHeader: { 
    backgroundColor: "#f8f9fa",
    position: "sticky",
    top: 0,
    zIndex: 10
  },
  tableHeaderCell: { 
    padding: "12px 16px", 
    textAlign: "left", 
    fontWeight: "600", 
    color: "#495057", 
    fontSize: "14px", 
    borderBottom: "2px solid #dee2e6",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  tableRow: { borderBottom: "1px solid #dee2e6", transition: "background-color 0.2s ease", "&:hover": { backgroundColor: "#f8f9fa" } },
  tableCell: { 
    padding: "12px 16px", 
    fontSize: "14px", 
    color: "#212529",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  statusIndicator: { padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "600", display: "inline-block", textAlign: "center", minWidth: "80px" },
  statusPending: { backgroundColor: "#fff3cd", color: "#856404" },
  statusApproved: { backgroundColor: "#d1e7dd", color: "#0f5132" },
  statusDeclined: { backgroundColor: "#f8d7da", color: "#842029" },
  viewBtn: { display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", backgroundColor: "transparent", border: "1px solid #dee2e6", borderRadius: "4px", fontSize: "14px", color: "#6c757d", cursor: "pointer", transition: "all 0.2s ease", "&:hover": { backgroundColor: "#f8f9fa", borderColor: "#adb5bd" } },
  actionButtons: { display: "flex", gap: "8px" },
  iconBtn: { display: "flex", alignItems: "center", justifyContent: "center", padding: "6px", backgroundColor: "transparent", border: "1px solid #dee2e6", borderRadius: "4px", cursor: "pointer", transition: "all 0.2s ease", "&:hover": { backgroundColor: "#f8f9fa" } },
  roleBadge: { padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "600", display: "inline-block" },
  roleKutsero: { backgroundColor: "#e9ecef", color: "#495057" },
  roleOperator: { backgroundColor: "#e7f1ff", color: "#0a58ca" },
  roleOther: { backgroundColor: "#fff3cd", color: "#856404" },
  paginationContainer: { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    padding: "16px", 
    borderTop: "1px solid #dee2e6", 
    backgroundColor: "#f8f9fa",
    flexShrink: 0
  },
  paginationInfo: { fontSize: "14px", color: "#6c757d" },
  paginationControls: { display: "flex", gap: "8px" },
  paginationBtn: { padding: "8px 12px", border: "1px solid #dee2e6", backgroundColor: "#fff", borderRadius: "4px", fontSize: "14px", color: "#0d6efd", cursor: "pointer", transition: "all 0.2s ease", "&:hover:not(:disabled)": { backgroundColor: "#e9ecef" }, "&:disabled": { opacity: "0.6", cursor: "not-allowed" } },
  paginationBtnActive: { backgroundColor: "#0d6efd", color: "#fff", borderColor: "#0d6efd" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" },
  modalContent: { backgroundColor: "#fff", borderRadius: "8px", maxWidth: "800px", width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #dee2e6" },
  modalTitle: { fontSize: "20px", fontWeight: "600", color: "#212529", margin: 0 },
  closeBtn: { background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#6c757d", padding: "4px", borderRadius: "4px", "&:hover": { backgroundColor: "#f8f9fa", color: "#212529" } },
  modalBody: { padding: "24px" },
  userProfileContainer: { display: "flex", gap: "24px", flexWrap: "wrap" },
  profileImageContainer: { display: "flex", flexDirection: "column", alignItems: "center", minWidth: "200px" },
  profileImage: { width: "120px", height: "120px", borderRadius: "50%", objectFit: "cover", border: "4px solid #f8f9fa" },
  userInfoContainer: { flex: 1, minWidth: "300px" },
  infoSection: { marginBottom: "24px" },
  sectionTitle: { fontSize: "16px", fontWeight: "600", color: "#495057", margin: "0 0 16px 0", paddingBottom: "8px", borderBottom: "1px solid #dee2e6" },
  infoGrid: { display: "flex", flexDirection: "column", gap: "12px" },
  infoRow: { display: "flex", gap: "12px" },
  infoLabel: { minWidth: "120px", fontSize: "14px", fontWeight: "500", color: "#6c757d" },
  infoValue: { fontSize: "14px", color: "#212529", flex: 1 },
  infoLink: { fontSize: "14px", color: "#0d6efd", textDecoration: "none", "&:hover": { textDecoration: "underline" } },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: "12px", padding: "20px 24px", borderTop: "1px solid #dee2e6" },
  actionBtnApprove: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", backgroundColor: "#198754", color: "#fff", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: "500", cursor: "pointer", transition: "background-color 0.2s ease", "&:hover": { backgroundColor: "#157347" } },
  actionBtnDecline: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", backgroundColor: "#dc3545", color: "#fff", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: "500", cursor: "pointer", transition: "background-color 0.2s ease", "&:hover": { backgroundColor: "#bb2d3b" } },
  alertContainer: { position: "fixed", bottom: "24px", right: "24px", padding: "16px 20px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)", transform: "translateY(100px)", opacity: 0, transition: "all 0.3s ease", zIndex: 1000 },
  alertVisible: { transform: "translateY(0)", opacity: 1 },
  alertSuccess: { backgroundColor: "#198754", color: "#fff" },
  alertError: { backgroundColor: "#dc3545", color: "#fff" }
};


export default UserManagement