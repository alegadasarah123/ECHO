import { useState, useEffect } from 'react';
import { Users, Search, Filter, X, Heart, User, Bell, Eye, MoreVertical, CheckCircle, XCircle } from 'lucide-react';
import Sidebar from '@/components/KutSidebar';
import NotificationModal from './KutNotif';
import FloatingMessages from './KutMessages';

const API_BASE = "http://localhost:8000/api/kutsero_president";

const UserAccountsPage = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [hoveredRow, setHoveredRow] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionUser, setActionUser] = useState(null);
  const [alert, setAlert] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [searchFocus, setSearchFocus] = useState(false);
  const [accountTab, setAccountTab] = useState('active');
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_BASE}/get_approved_users/`, { method: "GET", credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();

        const formatted = (data.users || []).map(u => ({
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
      if (action === "deactivate") endpoint = `${API_BASE}/deactivate_user/${user.id}/`;
      if (action === "reactivate") endpoint = `${API_BASE}/reactivate_user/${user.id}/`;
      if (action === "delete") endpoint = `${API_BASE}/delete_user/${user.id}/`;

      const res = await fetch(endpoint, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Request failed");
      const result = await res.json();

      setAlert({ type: "success", message: result.message || `User ${action}d successfully!` });

      setUsers(prev => prev.map(u =>
        u.id === user.id
          ? { ...u, status: action === "deactivate" ? "deactivated" : action === "reactivate" ? "approved" : "deleted" }
          : u
      ));
    } catch (err) {
      console.error("Error updating user:", err);
      setAlert({ type: "error", message: "Something went wrong. Please try again." });
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
    const matchesRole = filterRole.toLowerCase() === 'all' || (user.role || '').toLowerCase() === filterRole.toLowerCase();
    const matchesStatus = accountTab === 'active' ? user.status === 'approved' : user.status === 'deactivated';
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleRowClick = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };
  const handleCloseModal = () => { setSelectedUser(null); setShowModal(false); };
  const pendingUsers = users.filter(u => u.status === "pending");

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.dashboard}>
        <div style={styles.header}>
          <h1 style={styles.title}>User Accounts</h1>
          <div style={{ position: "relative" }}>
            <button style={styles.notificationBtn} onClick={() => setNotifOpen(!notifOpen)}>
              <Bell size={24} color="#374151" />
              {pendingUsers.length > 0 && <span style={styles.badge}>{pendingUsers.length}</span>}
            </button>
            <NotificationModal
              isOpen={notifOpen}
              onClose={() => setNotifOpen(false)}
              notifications={pendingUsers.map(u => ({
                message: `${u.name} (${u.role}) is pending approval`,
                date: u.created_at !== "N/A" ? new Date(u.created_at) : new Date()
              }))}
            />
          </div>
        </div>

        <div style={styles.scrollContent}>
          <div style={styles.controlsSection}>
            <div style={{ ...styles.searchContainer, ...(searchFocus ? styles.searchContainerFocus : {}) }}>
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

          <section style={styles.tableWrapper}>
            <div style={styles.accountTabs}>
              {['active', 'deactivated'].map(tab => (
                <div
                  key={tab}
                  onClick={() => setAccountTab(tab)}
                  style={{ ...styles.accountTab, ...(accountTab === tab ? styles.accountTabActive : {}) }}
                >
                  {tab === 'active' ? 'Active Accounts' : 'Deactivated Accounts'}
                </div>
              ))}
            </div>

            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.tableHeaderCell}>Name</th>
                    <th style={styles.tableHeaderCell}>Email</th>
                    <th style={styles.tableHeaderCell}>Contact Number</th>
                    <th style={styles.tableHeaderCell}>Approved Date</th>
                    {filterRole.toLowerCase() === 'all' && <th style={styles.tableHeaderCell}>Role</th>}
                    <th style={styles.tableHeaderCell}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id} style={styles.tableRow}>
                      <td style={styles.tableCell}>{user.name}</td>
                      <td style={styles.tableCell}>{user.email}</td>
                      <td style={styles.tableCell}>{user.contact_num}</td>
                      <td style={styles.tableCell}>{user.date}</td>
                      {filterRole.toLowerCase() === 'all' && (
                        <td style={styles.tableCell}>
                          <span style={{
                            ...styles.roleBadge,
                            backgroundColor: user.role === 'Kutsero' ? '#D2691E' :
                              user.role === 'Horse Operator' ? '#2563eb' : '#888'
                          }}>{user.role}</span>
                        </td>
                      )}
                      <td style={styles.tableCell}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', position: 'relative' }}>
                          <button
                            onClick={() => handleRowClick(user)}
                            style={{ ...styles.iconBtn, ...(hoveredRow === `eye-${user.id}` ? styles.iconBtnHover : {}) }}
                            onMouseEnter={() => setHoveredRow(`eye-${user.id}`)}
                            onMouseLeave={() => setHoveredRow(null)}
                          ><Eye size={18} /></button>

                          <button
                            onClick={() => setMenuOpen(menuOpen === user.id ? null : user.id)}
                            style={{ ...styles.iconBtn, ...(hoveredRow === `menu-${user.id}` ? styles.iconBtnHover : {}) }}
                            onMouseEnter={() => setHoveredRow(`menu-${user.id}`)}
                            onMouseLeave={() => setHoveredRow(null)}
                          ><MoreVertical size={18} /></button>

                          {menuOpen === user.id && (
                            <div style={styles.dropdownMenu}>
                              <button
                                style={{ ...styles.dropdownItem, ...(hoveredRow === "toggleStatus" ? styles.dropdownItemHover : {}) }}
                                onMouseEnter={() => setHoveredRow("toggleStatus")}
                                onMouseLeave={() => setHoveredRow(null)}
                                onClick={() => { setActionUser(user); setConfirmAction(user.status === "deactivated" ? "reactivate" : "deactivate"); setMenuOpen(null); }}
                              >{user.status === "deactivated" ? "Reactivate" : "Deactivate"}</button>

                              <button
                                style={{ ...styles.dropdownItem, ...(hoveredRow === "delete" ? styles.dropdownItemHover : {}) }}
                                onMouseEnter={() => setHoveredRow("delete")}
                                onMouseLeave={() => setHoveredRow(null)}
                                onClick={() => { setActionUser(user); setConfirmAction("delete"); setMenuOpen(null); }}
                              >Delete</button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {alert && (
                <div style={{
                  ...styles.alert,
                  background: alert.type === "success"
                    ? "linear-gradient(90deg, #16a34a, #22c55e)"
                    : "linear-gradient(90deg, #dc2626, #ef4444)",
                  opacity: showAlert ? 1 : 0,
                  transform: showAlert ? "translate(-50%, 0)" : "translate(-50%, -20px)",
                }}>
                  {alert.type === "success" ? <CheckCircle size={20} color="white" style={{ marginRight: "8px" }} /> :
                    <XCircle size={20} color="white" style={{ marginRight: "8px" }} />}
                  {alert.message}
                </div>
              )}

              {filteredUsers.length === 0 && <div style={styles.noResults}><p>No users found.</p></div>}
            </div>
          </section>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && actionUser && (
        <div style={styles.modalOverlay} onClick={() => setConfirmAction(null)}>
          <div style={styles.confirmModalSmall} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.confirmTitleSmall}>
              {confirmAction === "deactivate" ? "Deactivate Account" : confirmAction === "reactivate" ? "Reactivate Account" : "Delete Account"}
            </h3>
            <div style={styles.divider}></div>
            <p style={styles.confirmTextSmall}>
              {confirmAction === "deactivate" ? "Are you sure you want to deactivate " :
                confirmAction === "reactivate" ? "Are you sure you want to reactivate " :
                  "Are you sure you want to permanently delete "}
              <span style={{ fontWeight: "600", color: "#111" }}>{actionUser.name}</span>?
            </p>
            <p style={styles.extraText}>
              {confirmAction === "deactivate" ? "The account will be disabled but can be reactivated later." :
                confirmAction === "reactivate" ? "The account will be reactivated and the user can access it again." :
                  "This action is irreversible. Once deleted, the account and all related data will be permanently removed."}
            </p>
            <div style={styles.confirmButtonsSmall}>
              <button style={styles.cancelBtnSmall} onClick={() => setConfirmAction(null)}>Cancel</button>
              <button
                style={{ ...styles.confirmBtnSmall, backgroundColor: confirmAction === "deactivate" ? "#2563eb" : confirmAction === "reactivate" ? "#16a34a" : "#dc2626" }}
                onClick={() => handleUserAction(confirmAction, actionUser)}
              >
                {confirmAction === "deactivate" ? "Deactivate" : confirmAction === "reactivate" ? "Reactivate" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {showModal && selectedUser && (
        <div style={styles.modalOverlay} onClick={handleCloseModal}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>User Details</h2>
              <button style={styles.closeBtn} onClick={handleCloseModal}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.mainContentContainer}>
                <div style={styles.leftSide}>
                  <div style={styles.profileSection}>
                    <img src={selectedUser.profile_picture} alt="Profile" style={styles.profileImage} />
                    <h2 style={styles.formalUserName}>{selectedUser.name}</h2>
                    <p style={styles.role}>{selectedUser.role}</p>
                  </div>
                </div>
                <div style={styles.rightSide}>
                  <div style={styles.sectionContainer}>
                    <h3 style={styles.sectionTitle}>Personal Information</h3>
                    <div style={styles.formalInfoGrid}>
                      <div style={styles.formalInfoRow}><span style={styles.formalLabel}>Full Name:</span><span style={styles.formalValue}>{selectedUser.name}</span></div>
                      <div style={styles.formalInfoRow}><span style={styles.formalLabel}>Date of Birth:</span><span style={styles.formalValue}>{selectedUser.dob}</span></div>
                      <div style={styles.formalInfoRow}><span style={styles.formalLabel}>Gender:</span><span style={styles.formalValue}>{selectedUser.gender}</span></div>
                    </div>
                  </div>
                  <div style={styles.sectionContainer}>
                    <h3 style={styles.sectionTitle}>Contact Information</h3>
                    <div style={styles.formalInfoGrid}>
                      <div style={styles.formalInfoRow}><span style={styles.formalLabel}>Email Address:</span><span style={styles.formalValue}>{selectedUser.email}</span></div>
                      <div style={styles.formalInfoRow}><span style={styles.formalLabel}>Phone Number:</span><span style={styles.formalValue}>{selectedUser.contact_num}</span></div>
                      <div style={styles.formalInfoRow}><span style={styles.formalLabel}>Home Address:</span><span style={styles.formalValue}>{selectedUser.address}</span></div>
                      <div style={styles.formalInfoRow}><span style={styles.formalLabel}>Facebook Profile:</span>
                        <a href={`https://${selectedUser.facebook}`} target="_blank" rel="noopener noreferrer" style={styles.formalLink}>{selectedUser.facebook}</a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <FloatingMessages />
    </div>
  );
};



const styles = {
  layout: { display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f5' },
  dashboard: { flex: 1, fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif'", display: 'flex', flexDirection: 'column', height: '100vh' },
  header: { display: "flex", alignItems: "center", backgroundColor: "#fff", padding: "20px 30px", borderBottom: "1px solid #eee", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", position: "sticky", top: 0, zIndex: 10,  justifyContent: "space-between", },
  title: { fontSize: '28px', fontWeight: 'bold', color: '#D2691E', margin: 0 },
  scrollContent: { flex: 1, overflowY: 'auto', padding: '20px', width: '100%',},
  controlsSection: { display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' },
  searchContainer: { position: 'relative', width: '350px', maxWidth: '100%', display: 'flex', alignItems: 'center', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', transition: 'transform 0.2s ease, box-shadow 0.2s ease', overflow: 'hidden' },
  searchContainerFocus: { transform: 'scale(1.05)', boxShadow: '0 6px 18px rgba(0,0,0,0.15)' },
  searchIcon: { position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', transition: 'all 0.2s ease' },
  searchInput: { width: '100%', padding: '12px 15px 12px 45px', border: 'none', outline: 'none', fontSize: '14px', color: '#111827', backgroundColor: 'transparent', transition: 'all 0.2s ease' },
  notificationBtn: { position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%' },
  badge: { position: 'absolute', top: '2px', right: '2px', backgroundColor: '#ef4444', color: '#fff', borderRadius: '50%', padding: '2px 6px', fontSize: '12px', fontWeight: 'bold' },

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

    // Modal 
  modalOverlay: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0, 0, 0, 0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, backdropFilter: "blur(4px)" },
  modalContent: { backgroundColor: "#fff", borderRadius: "16px", width: "95%", maxWidth: "900px", boxShadow: "0 25px 50px rgba(0,0,0,0.25)", animation: "fadeIn 0.3s ease" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px", borderBottom: "1px solid #eee", backgroundColor: "#fafafa" },
  modalTitle: { fontSize: "22px", fontWeight: "bold", color: "#D2691E" },
  closeBtn: { background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#666", borderRadius: "50%", width: "35px", height: "35px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" },
  modalBody: { padding: "24px 28px" },
  mainContentContainer: { display: "flex", gap: "24px", flexWrap: "wrap" },
  leftSide: { flex: "0 0 250px", borderRight: "1px solid #eee", paddingRight: "20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", minHeight: "100%" },
  profileImage: { width: "120px", height: "120px", borderRadius: "50%", objectFit: "cover", marginBottom: "15px", border: "4px solid #f1f1f1" },
  formalUserName: { fontSize: "20px", fontWeight: "600", marginBottom: "6px" },
  role: { fontSize: "14px", color: "#666", marginBottom: "8px" },
  formalStatusBadge: { padding: "6px 14px", borderRadius: "9999px", fontSize: "13px", fontWeight: "600" },
  rightSide: { flex: 1, display: "flex", flexDirection: "column", gap: "20px" },
  sectionContainer: { padding: "15px 20px", backgroundColor: "#fafafa", borderRadius: "10px", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)" },
  sectionTitle: { fontSize: "16px", fontWeight: "600", marginBottom: "12px", color: "#D2691E" },
  formalInfoGrid: { display: "flex", flexDirection: "column", gap: "8px" },
  formalInfoRow: { display: "flex", alignItems: "center", gap: "6px", fontSize: "14px" },
  formalLabel: { fontWeight: "600", color: "#333", minWidth: "120px" },
  formalValue: { color: "#555" },
  formalLink: { color: "#3b82f6", textDecoration: "none" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: "15px", padding: "20px", borderTop: "1px solid #eee", backgroundColor: "#fafafa" },
  declineBtn: { padding: "10px 20px", backgroundColor: "#ef4444", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", transition: "0.2s" },
  approveBtn: { padding: "10px 20px", backgroundColor: "#16a34a", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", transition: "0.2s" },
  deleteBtn: {display: "flex",alignItems: "center",gap: "6px",padding: "8px 14px",backgroundColor: "#ef4444",color: "#fff",border: "none",borderRadius: "6px",cursor: "pointer",fontSize: "14px",fontWeight: "600"},
  cancelBtn: {display: "flex",alignItems: "center",gap: "6px",padding: "8px 14px", backgroundColor: "#9ca3af",border: "none",borderRadius: "6px",cursor: "pointer",fontSize: "14px",fontWeight: "600"},

  iconBtn: { background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', transition: 'all 0.2s ease' },
  iconBtnHover: { backgroundColor: '#f3f4f6', transform: 'scale(1.1)' },
  dropdownMenu: { position: 'absolute', top: '30px', right: 0, background: '#fff', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', zIndex: 20, display: 'flex', flexDirection: 'column', minWidth: '120px' },
  dropdownItem: { padding: '10px 15px', border: 'none', background: 'white', textAlign: 'left', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s ease' },
  dropdownItemHover: { backgroundColor: '#f3f4f6', color: '#111827' },
  confirmModalSmall: { background: '#fff', padding: '24px 28px', borderRadius: '16px', maxWidth: '360px', width: '90%', textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', animation: 'fadeIn 0.25s ease-out' },
  confirmTitleSmall: { fontSize: '18px', fontWeight: '600', color: '#111827' },
  divider: { height: '1px', backgroundColor: '#e5e7eb', margin: '8px 0 16px 0' },
  confirmTextSmall: { fontSize: '15px', color: '#374151', marginBottom: '12px', lineHeight: '1.5', fontWeight: '500' },
  extraText: { fontSize: '12px', color: '#6b7280', marginBottom: '20px', lineHeight: '1.4', fontStyle: 'italic' },
  confirmButtonsSmall: { display: 'flex', justifyContent: 'flex-end', gap: '10px' },
  cancelBtnSmall: { background: '#f3f4f6', color: '#374151', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', transition: 'all 0.2s ease' },
  confirmBtnSmall: { color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s ease' },
  alert: { position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', padding: '14px 24px', borderRadius: '10px', color: 'white', fontWeight: '600', fontSize: '15px', zIndex: 2000, boxShadow: '0 6px 16px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.4s ease', opacity: 0, transformOrigin: 'top center' },
  accountTabs: { display: 'flex', gap: '20px', marginTop: '16px' },
  accountTab: { cursor: 'pointer', fontWeight: 600, fontSize: '16px', color: '#6b7280', transition: 'transform 0.2s ease, color 0.2s ease', paddingBottom: '4px' },
  accountTabActive: { color: '#D2691E', transform: 'scale(1.05)', borderBottom: '3px solid #D2691E' },
  tableWrapper: { backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', padding: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '16px' },

};

export default UserAccountsPage;
