import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, X, Heart, User, Bell, Eye, MoreVertical,CheckCircle, XCircle } from 'lucide-react';
import Sidebar from '@/components/KutSidebar';

const UserAccountsPage = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [hoveredRow, setHoveredRow] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('user');
  const [menuOpen, setMenuOpen] = useState(null); 
  const [confirmAction, setConfirmAction] = useState(null); 
  const [actionUser, setActionUser] = useState(null); 
  const [alert, setAlert] = useState(null); 
  const [showAlert, setShowAlert] = useState(false);
  const [searchFocus, setSearchFocus] = useState(false);
  const [accountTab, setAccountTab] = useState('active'); 

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/kutsero_president/get_approved_users/");
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();
        
        const formatted = (data.users || []).map((u) => ({
          id: u.id,
          name: u.name || "N/A",
          email: u.email || "N/A",
          contact_num: u.phoneNumber || "N/A",      
          date: u.approved_date ? new Date(u.approved_date).toISOString().split("T")[0] : "N/A", 
          status: (u.status || "pending").toLowerCase(),
          role: u.role || "N/A",
          profile_picture: u.profilePicture || 'https://via.placeholder.com/100', 
          dob: u.dateOfBirth || "N/A",              
          gender: u.sex || "N/A",                  
          address: u.address || "N/A",
          facebook: u.facebook || "N/A",
        }));

        setUsers(formatted);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };
    fetchUsers();
  }, []);

const handleUserAction = async (action, user) => {
  try {
    let endpoint = "";

    if (action === "deactivate") {
      endpoint = `http://localhost:8000/api/kutsero_president/deactivate_user/${user.id}/`;
    } else if (action === "reactivate") {
      endpoint = `http://localhost:8000/api/kutsero_president/reactivate_user/${user.id}/`;
    } else if (action === "delete") {
      endpoint = `http://localhost:8000/api/kutsero_president/delete_user/${user.id}/`;
    }

    const res = await fetch(endpoint, { method: "POST" });
    if (!res.ok) throw new Error("Request failed");

    const result = await res.json();
    setAlert({
      type: "success",
      message: result.message || `User ${action}d successfully!`,
    });

    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id
          ? { ...u, status: action === "deactivate" ? "deactivated" : action === "reactivate" ? "approved" : "deleted" }
          : u
      )
    );

  } catch (err) {
    console.error("Error updating user:", err);
    setAlert({
      type: "error",
      message: "Something went wrong. Please try again.",
    });
  }

  setConfirmAction(null);
};


  useEffect(() => {
    if (alert) {
      setShowAlert(true); 
      const timer = setTimeout(() => {
        setShowAlert(false); 
        setTimeout(() => setAlert(null), 400); 
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      (user.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.contact_num || "").includes(searchTerm);

    const matchesRole =
      filterRole.toLowerCase() === 'all' ||
      (user.role || '').toLowerCase() === filterRole.toLowerCase();

    const matchesStatus =
      accountTab === 'active'
        ? user.status === 'approved'
        : user.status === 'deactivated';

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleRowClick = (user) => {
    setSelectedUser(user);
    setActiveTab('user');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
    setShowModal(false);
  };

  const pendingCount = users.filter((u) => u.status === "pending").length;

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.dashboard}>
        <div style={styles.header}>
          <h1 style={styles.title}>User Accounts</h1>
          <button style={styles.notifBtn}>
            <Bell size={22} />
            {pendingCount > 0 && (
              <span style={styles.notifBadge}>{pendingCount}</span>
            )}
          </button>
        </div>

        <div style={styles.scrollContent}>
          <div style={styles.controlsSection}>
            <div
              style={{
                ...styles.searchContainer,
                ...(searchFocus ? styles.searchContainerFocus : {})
              }}
            >
              <Search style={styles.searchIcon} />
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
        
            <div style={styles.filterContainer}>
              <Filter style={styles.filterIcon} />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="All">All Roles</option>
                <option value="kutsero">Kutsero</option>
                <option value="horse operator">Horse Operator</option>
              </select>
            </div>
          </div>

            {/* Users Table + Tabs Wrapper */}
            <section style={styles.tableWrapper}>
              {/* Tabs */}
              <div style={styles.accountTabs}>
                {['active', 'deactivated'].map((tab) => (
                  <div
                    key={tab}
                    onClick={() => setAccountTab(tab)}
                    style={{
                      ...styles.accountTab,
                      ...(accountTab === tab ? styles.accountTabActive : {}),
                    }}
                  >
                    {tab === 'active' ? 'Active Accounts' : 'Deactivated Accounts'}
                  </div>
                ))}
              </div>

              {/* Users Table */}
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.tableHeaderCell}>Name</th>
                      <th style={styles.tableHeaderCell}>Email</th>
                      <th style={styles.tableHeaderCell}>Contact Number</th>
                      <th style={styles.tableHeaderCell}>Approved Date</th>
                      {filterRole.toLowerCase() === 'all' && (
                        <th style={styles.tableHeaderCell}>Role</th>
                      )}
                      <th style={styles.tableHeaderCell}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} style={styles.tableRow}>
                        <td style={styles.tableCell}>{user.name}</td>
                        <td style={styles.tableCell}>{user.email}</td>
                        <td style={styles.tableCell}>{user.contact_num}</td>
                        <td style={styles.tableCell}>{user.date}</td>
                        {filterRole.toLowerCase() === 'all' && (
                          <td style={styles.tableCell}>
                            <span style={{
                              ...styles.roleBadge,
                              backgroundColor:
                                user.role === 'Kutsero' ? '#D2691E' :
                                user.role === 'Horse Operator' ? '#2563eb' : '#888',
                            }}>
                              {user.role}
                            </span>
                          </td>
                        )}
                      <td style={styles.tableCell}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', position: 'relative' }}>
                          {/* Eye icon */}
                            <button
                              onClick={() => handleRowClick(user)}
                              style={{
                                ...styles.iconBtn,
                                ...(hoveredRow === `eye-${user.id}` ? styles.iconBtnHover : {})
                              }}
                              onMouseEnter={() => setHoveredRow(`eye-${user.id}`)}
                              onMouseLeave={() => setHoveredRow(null)}
                            >
                              <Eye size={18} />
                            </button>

                            {/* 3 dots menu */}
                            <button
                              onClick={() => setMenuOpen(menuOpen === user.id ? null : user.id)}
                              style={{
                                ...styles.iconBtn,
                                ...(hoveredRow === `menu-${user.id}` ? styles.iconBtnHover : {})
                              }}
                              onMouseEnter={() => setHoveredRow(`menu-${user.id}`)}
                              onMouseLeave={() => setHoveredRow(null)}
                            >
                              <MoreVertical size={18} />
                            </button>

                            {menuOpen === user.id && (
                              <div style={styles.dropdownMenu}>
                                <button
                                  style={{
                                    ...styles.dropdownItem,
                                    ...(hoveredRow === "toggleStatus" ? styles.dropdownItemHover : {})
                                  }}
                                  onMouseEnter={() => setHoveredRow("toggleStatus")}
                                  onMouseLeave={() => setHoveredRow(null)}
                                  onClick={() => {
                                    setActionUser(user);
                                    setConfirmAction(user.status === "deactivated" ? "reactivate" : "deactivate");
                                    setMenuOpen(null);
                                  }}
                                >
                                  {user.status === "deactivated" ? "Reactivate" : "Deactivate"}
                                </button>

                                <button
                                  style={{
                                    ...styles.dropdownItem,
                                    ...(hoveredRow === "delete" ? styles.dropdownItemHover : {})
                                  }}
                                  onMouseEnter={() => setHoveredRow("delete")}
                                  onMouseLeave={() => setHoveredRow(null)}
                                  onClick={() => {
                                    setActionUser(user);
                                    setConfirmAction("delete");
                                    setMenuOpen(null);
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            )}

                        </div>
                      </td>
                    </tr> 
                  ))}
                </tbody>
              </table>

              {alert && (
                <div
                  style={{
                    ...styles.alert,
                    background: alert.type === "success"
                      ? "linear-gradient(90deg, #16a34a, #22c55e)"
                      : "linear-gradient(90deg, #dc2626, #ef4444)",
                    opacity: showAlert ? 1 : 0,
                    transform: showAlert
                      ? "translate(-50%, 0)"
                      : "translate(-50%, -20px)",
                  }}
                >
                  {alert.type === "success" ? (
                    <CheckCircle size={20} color="white" style={{ marginRight: "8px" }} />
                  ) : (
                    <XCircle size={20} color="white" style={{ marginRight: "8px" }} />
                  )}
                  {alert.message}
                </div>
              )}

              {filteredUsers.length === 0 && (
                <div style={styles.noResults}>
                  <p>No users found.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {confirmAction && actionUser && (
      <div style={styles.modalOverlay} onClick={() => setConfirmAction(null)}>
        <div style={styles.confirmModalSmall} onClick={(e) => e.stopPropagation()}>
          <div style={styles.titleRow}>
            <h3 style={styles.confirmTitleSmall}>
              {confirmAction === "deactivate"
                ? "Deactivate Account"
                : confirmAction === "reactivate"
                ? "Reactivate Account"
                : "Delete Account"}
            </h3>
          </div>

          <div style={styles.divider}></div>

          {/* Main question */}
          <p style={styles.confirmTextSmall}>
            {confirmAction === "deactivate"
              ? "Are you sure you want to deactivate "
              : confirmAction === "reactivate"
              ? "Are you sure you want to reactivate "
              : "Are you sure you want to permanently delete "}
            <span style={{ fontWeight: "600", color: "#111" }}>
              {actionUser.name}
            </span>
            ?
          </p>

          <p style={styles.extraText}>
            {confirmAction === "deactivate"
              ? "The account will be disabled but can be reactivated later."
              : confirmAction === "reactivate"
              ? "The account will be reactivated and the user can access it again."
              : "This action is irreversible. Once deleted, the account and all related data will be permanently removed."}
          </p>

          <div style={styles.confirmButtonsSmall}>
            <button
              style={styles.cancelBtnSmall}
              onClick={() => setConfirmAction(null)}
            >
              Cancel
            </button>
            <button
              style={{
                ...styles.confirmBtnSmall,
                backgroundColor:
                  confirmAction === "deactivate"
                    ? "#2563eb"
                    : confirmAction === "reactivate"
                    ? "#16a34a"
                    : "#dc2626",
              }}
              onClick={() => handleUserAction(confirmAction, actionUser)}
            >
              {confirmAction === "deactivate"
                ? "Deactivate"
                : confirmAction === "reactivate"
                ? "Reactivate"
                : "Delete"}
            </button>
          </div>
        </div>
      </div>
    )}



      {/* Beautiful Modal */}
      {showModal && selectedUser && (
        <div style={styles.modalOverlay} onClick={handleCloseModal}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            {/* Gradient Header */}
            <div style={styles.modalHeader}>
              <div style={styles.gradientBg}></div>
              <button style={styles.closeBtn} onClick={handleCloseModal}>
                <X size={24} />
              </button>
              
              {/* Profile Section */}
              <div style={styles.profileSection}>
                <div style={styles.profilePicContainer}>
                  <img
                    src={selectedUser.profile_picture || 'https://via.placeholder.com/100'}
                    alt="Profile"
                    style={styles.profilePic}
                  />
                  <div style={styles.statusIndicator}></div>
                </div>
                <div style={styles.profileInfo}>
                  <h2 style={styles.modalTitle}>{selectedUser.name}</h2>
                  <span style={styles.modalRole}>{selectedUser.role}</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div style={styles.tabsContainer}>
              <button
                style={{
                  ...styles.tabButton,
                  ...(activeTab === 'user' ? styles.activeTab : {}),
                }}
                onClick={() => setActiveTab('user')}
              >
                <User size={18} style={styles.tabIcon} />
                Personal Info
              </button>
              <button
                style={{
                  ...styles.tabButton,
                  ...(activeTab === 'horse' ? styles.activeTab : {}),
                }}
                onClick={() => setActiveTab('horse')}
              >
                <Heart size={18} style={styles.tabIcon} />
                Horse Info
              </button>
            </div>

            {/* Tab Content */}
            <div style={styles.tabContent}>
              {activeTab === 'user' && (
                <div style={styles.tabPanel}>
                  <div style={styles.infoSection}>
                    <h4 style={styles.sectionTitle}>Personal Information</h4>
                    <div style={styles.infoGrid}>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Full Name</span>
                        <span style={styles.infoValue}>{selectedUser.name || 'N/A'}</span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Date of Birth</span>
                        <span style={styles.infoValue}>{selectedUser.dob || 'N/A'}</span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Gender</span>
                        <span style={styles.infoValue}>{selectedUser.gender || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.infoSection}>
                    <h4 style={styles.sectionTitle}>Contact Information</h4>
                    <div style={styles.infoGrid}>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Email Address</span>
                        <span style={styles.infoValue}>{selectedUser.email || 'N/A'}</span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Phone Number</span>
                        <span style={styles.infoValue}>{selectedUser.contact_num || 'N/A'}</span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Home Address</span>
                        <span style={styles.infoValue}>{selectedUser.address || 'N/A'}</span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Facebook Profile</span>
                        <span style={styles.infoValue}>{selectedUser.facebook || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'horse' && (
                <div style={styles.tabPanel}>
                  <div style={styles.infoSection}>
                    <h4 style={styles.sectionTitle}>Horse Information</h4>
                    <div style={styles.infoGrid}>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Horse Name</span>
                        <span style={styles.infoValue}>{selectedUser.horse_name || 'N/A'}</span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Horse Age</span>
                        <span style={styles.infoValue}>{selectedUser.horse_age || 'N/A'}</span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Health Status</span>
                        <span style={{
                          ...styles.infoValue,
                          ...styles.healthStatus,
                          color: selectedUser.horse_health === 'Excellent' ? '#10b981' : 
                                 selectedUser.horse_health === 'Good' ? '#f59e0b' : '#ef4444'
                        }}>
                          {selectedUser.horse_health || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  layout: { display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f5' },
  dashboard: { flex: 1, fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif'", display: 'flex', flexDirection: 'column', height: '100vh' },
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', backgroundColor: '#fff', padding: '20px 30px', borderBottom: '1px solid #eee', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 10, justifyContent: "space-between" },
  title: { fontSize: '28px', fontWeight: 'bold', color: '#D2691E', margin: 0 },
  scrollContent: { flex: 1, overflowY: 'auto', padding: '20px', width: '100%',},
  controlsSection: { display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' },
searchContainer: {
  position: 'relative',
  width: '350px',          
  maxWidth: '100%',
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#fff',
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  overflow: 'hidden',
},
searchContainerFocus: {
  transform: 'scale(1.05)',     
  boxShadow: '0 6px 18px rgba(0,0,0,0.15)', 
},
searchIcon: {
  position: 'absolute',
  left: '15px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#9ca3af',
  transition: 'all 0.2s ease',
},
searchInput: {
  width: '100%',
  padding: '12px 15px 12px 45px',
  border: 'none',
  outline: 'none',
  fontSize: '14px',
  color: '#111827',
  backgroundColor: 'transparent',
  transition: 'all 0.2s ease',
},

filterContainer: { position: 'relative', minWidth: '150px' },
  filterIcon: { position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)'},
  filterSelect: { backgroundColor: 'white', width: '100%', padding: '12px 15px 12px 45px', borderRadius: '8px', border: '1px solid #ddd',  cursor: 'pointer'},
  tableSection: { backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', overflow: 'hidden',width: '100%'},
  tableContainer: { overflowX: 'auto'},
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHeaderRow: { backgroundColor: '#f8f9fa' },
  tableHeaderCell: { padding: '15px 20px', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #eee', verticalAlign: 'middle', textAlign: 'center' },
  tableRow: { transition: 'background-color 0.2s ease'},
  tableCell: { padding: '15px 20px', borderBottom: '1px solid #eee', verticalAlign: 'middle', textAlign: 'center' },
  nameCell: { display: 'flex', alignItems: 'center', gap: '12px' },
  userName: { fontWeight: '500' },
  roleBadge: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', color: 'white' },
  noResults: { padding: '50px 20px', textAlign: 'center', color: '#666' },

  // Beautiful Modal Styles
  modalOverlay: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0, 0, 0, 0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, backdropFilter: "blur(4px)", animation: "fadeIn 0.3s ease-out" },
  modalContent: { backgroundColor: "#fff", borderRadius: "24px", width: "95%", maxWidth: "580px", maxHeight: "90vh", boxShadow: "0 25px 50px rgba(0, 0, 0, 0.3)", overflow: "hidden", animation: "slideIn 0.3s ease-out", position: "relative" },
  modalHeader: { position: "relative", height: "160px", display: "flex", alignItems: "flex-end", padding: "0 0 20px 0", overflow: "hidden" },
  gradientBg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(135deg, #D2691E 0%, #FF8C42 50%, #FFA726 100%)", opacity: 0.9 },
  closeBtn: { position: "absolute", top: "16px", right: "16px", background: "rgba(255, 255, 255, 0.2)", border: "none", borderRadius: "50%", width: "40px", height: "40px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "white", backdropFilter: "blur(10px)", transition: "all 0.2s ease", zIndex: 10 },
  profileSection: { position: "relative", zIndex: 5, display: "flex", alignItems: "center", gap: "20px", padding: "0 30px", width: "100%" },
  profilePicContainer: { position: "relative" },
  profilePic: { width: "90px", height: "90px", borderRadius: "50%", objectFit: "cover", border: "4px solid rgba(255, 255, 255, 0.3)", boxShadow: "0 8px 20px rgba(0, 0, 0, 0.2)" },
  statusIndicator: { position: "absolute", bottom: "8px", right: "8px", width: "18px", height: "18px", backgroundColor: "#10b981", borderRadius: "50%", border: "3px solid white", boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)" },
  profileInfo: { color: "white", textShadow: "0 2px 4px rgba(0, 0, 0, 0.3)" },
  modalTitle: { fontSize: "24px", fontWeight: "700", margin: "0 0 8px 0", color: "white" },
  modalRole: { fontSize: "16px", opacity: 0.9, backgroundColor: "rgba(255, 255, 255, 0.2)", padding: "4px 12px", borderRadius: "20px", backdropFilter: "blur(10px)" },
  tabsContainer: { display: "flex", backgroundColor: "#f8f9fa", margin: "0", padding: "0 30px" },
  tabButton: { flex: 1, padding: "16px 20px", background: "none", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "500", color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "all 0.2s ease", borderBottom: "3px solid transparent", position: "relative" },
  activeTab: { color: "#D2691E", backgroundColor: "white", borderBottom: "3px solid #D2691E", fontWeight: "600" },
  tabIcon: { opacity: 0.7 },
  tabContent: { padding: "30px", maxHeight: "300px", overflowY: "auto" },
  tabPanel: { animation: "fadeInContent 0.3s ease-in" },
  infoSection: { marginBottom: "24px" },
  sectionTitle: { fontSize: "18px", fontWeight: "600", marginBottom: "16px", color: "#1f2937", borderLeft: "4px solid #D2691E", paddingLeft: "12px" },
  infoGrid: { display: "grid", gap: "16px" },
  infoItem: { display: "flex", flexDirection: "column", gap: "4px", padding: "16px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", transition: "all 0.2s ease" },
  infoLabel: { fontSize: "12px", fontWeight: "500", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" },
  infoValue: { fontSize: "14px", fontWeight: "600", color: "#1f2937", wordBreak: "break-word" },
  healthStatus: { fontWeight: "700", textTransform: "uppercase", fontSize: "13px", letterSpacing: "0.5px" },

  //Notification
  notifBtn: { position: "relative", background: "transparent", border: "none", cursor: "pointer", padding: "8px", borderRadius: "50%" },
  notifBadge: { position: "absolute", top: "2px", right: "2px", backgroundColor: "#ef4444", color: "#fff", borderRadius: "50%", padding: "2px 6px", fontSize: "12px", fontWeight: "bold" },

  iconBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    transition: 'all 0.2s ease',
  },
  iconBtnHover: {
    backgroundColor: '#f3f4f6',
    transform: 'scale(1.1)',
  },

  dropdownMenu: {
    position: 'absolute',
    top: '30px',
    right: 0,
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
    zIndex: 20,
    display: 'flex',
    flexDirection: 'column',
    minWidth: '120px',
  },
  dropdownItem: {
    padding: '10px 15px',
    border: 'none',
    background: 'white',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  },
  dropdownItemHover: {
    backgroundColor: '#f3f4f6',
    color: '#111827',
  },

confirmModalSmall: {
  background: "#fff",
  padding: "24px 28px",
  borderRadius: "16px",
  maxWidth: "360px",
  width: "90%",
  textAlign: "center",
  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
  animation: "fadeIn 0.25s ease-out",
},


confirmTitleSmall: {
  fontSize: "18px",
  fontWeight: "600",
  color: "#111827",
},

divider: {
  height: "1px",
  backgroundColor: "#e5e7eb",
  margin: "8px 0 16px 0",
},

confirmTextSmall: {
  fontSize: "15px",
  color: "#374151",
  marginBottom: "12px",
  lineHeight: "1.5",
  fontWeight: "500",
},

extraText: {
  fontSize: "12px",
  color: "#6b7280",
  marginBottom: "20px",
  lineHeight: "1.4",
  fontStyle: "italic",
},

confirmButtonsSmall: {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
},

cancelBtnSmall: {
  background: "#f3f4f6",
  color: "#374151",
  border: "none",
  padding: "8px 16px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "500",
  transition: "all 0.2s ease",
},
confirmBtnSmall: {
  color: "white",
  border: "none",
  padding: "8px 16px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "600",
  transition: "all 0.2s ease",
},
alert: {
  position: "fixed",
  top: "20px",
  left: "50%",
  transform: "translateX(-50%)",
  padding: "14px 24px",
  borderRadius: "10px",
  color: "white",
  fontWeight: "600",
  fontSize: "15px",
  zIndex: 2000,
  boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  transition: "all 0.4s ease", 
  opacity: 0,
  transformOrigin: "top center",
},
accountTabs: {
  display: 'flex',
  gap: '20px',
  marginTop: '16px',
},

accountTab: {
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '16px',
  color: '#6b7280',
  transition: 'transform 0.2s ease, color 0.2s ease',
  paddingBottom: '4px',
},

accountTabActive: {
  color: '#D2691E',
  transform: 'scale(1.05)',
  borderBottom: '3px solid #D2691E',
},
tableWrapper: {
  backgroundColor: '#fff',
  borderRadius: '12px',
  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  padding: '20px',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
},
};

export default UserAccountsPage;
