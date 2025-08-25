import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, X, Heart, User } from 'lucide-react';
import Sidebar from '@/components/KutSidebar';

const UserAccountsPage = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [hoveredRow, setHoveredRow] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('user');

useEffect(() => {
  const fetchUsers = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/kutsero_president/get_users/");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      
      const formatted = (data.users || []).map((u) => ({
        id: u.id,
        name: u.name || "N/A",
        email: u.email || "N/A",
        contact_num: u.phoneNumber || "N/A",      
        date: u.created_at ? new Date(u.created_at).toISOString().split("T")[0] : "N/A",
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

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      (user.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.contact_num || "").includes(searchTerm);

    const matchesRole =
      filterRole.toLowerCase() === 'all' ||
      (user.role || '').toLowerCase() === filterRole.toLowerCase();

    return matchesSearch && matchesRole;
  });


  const getRowStyle = (index, rowId) => ({
    ...styles.tableRow,
    backgroundColor: hoveredRow === rowId ? '#f0f8ff' : (index % 2 === 0 ? '#fff' : '#f9f9f9'),
    cursor: 'pointer'
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

  return (
    <div style={styles.layout}>
      <Sidebar
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
      />

      <div
        style={{
          ...styles.dashboard,
          marginLeft: isSidebarCollapsed ? '80px' : '0px',
          transition: 'margin-left 0.3s ease'
        }}
      >
        <header style={styles.header}>
          <h1 style={styles.title}>User Accounts</h1>
        </header>

        <div style={styles.scrollContent}>
          {/* Controls */}
          <div style={styles.controlsSection}>
            <div style={styles.searchContainer}>
              <Search style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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

          {/* Users Table */}
          <section style={styles.tableSection}>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.tableHeaderCell}>Name</th>
                    <th style={styles.tableHeaderCell}>Email</th>
                    <th style={styles.tableHeaderCell}>Contact Number</th>
                    <th style={styles.tableHeaderCell}>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => (
                    <tr
                      key={user.id}
                      style={getRowStyle(index, user.id)}
                      onMouseEnter={() => setHoveredRow(user.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      onClick={() => handleRowClick(user)}
                    >
                      <td style={styles.tableCell}>
                        <div style={styles.nameCell}>
                          <span style={styles.userName}>{user.name || "N/A"}</span>
                        </div>
                      </td>
                      <td style={styles.tableCell}>{user.email}</td>
                      <td style={styles.tableCell}>{user.contact_num || "N/A"}</td>
                      <td style={styles.tableCell}>
                        <span style={{
                          ...styles.roleBadge,
                          backgroundColor:
                            user.role === 'kutsero' ? '#D2691E' :
                            user.role === 'horse operator' ? '#2563eb' : '#888',
                        }}>
                          {user.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <div style={styles.noResults}>
                  <p>No users found matching your search criteria.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

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
  header: { flexShrink: 0, display: 'flex', alignItems: 'center', backgroundColor: '#fff', padding: '20px 30px', borderBottom: '1px solid #eee', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 10 },
  title: { fontSize: '28px', fontWeight: 'bold', color: '#D2691E', margin: 0 },
  scrollContent: { flex: 1, overflowY: 'auto', padding: '20px' },
  controlsSection: { display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' },
  searchContainer: { position: 'relative', flex: 1, minWidth: '300px' },
  searchIcon: { position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' },
  searchInput: { width: '100%', padding: '12px 15px 12px 45px', borderRadius: '8px', border: '1px solid #ddd' },
  filterContainer: { position: 'relative', minWidth: '150px' },
  filterIcon: { position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)'},
  filterSelect: { backgroundColor: 'white', width: '100%', padding: '12px 15px 12px 45px', borderRadius: '8px', border: '1px solid #ddd',  cursor: 'pointer'},
  tableSection: { backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', overflow: 'hidden' },
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHeaderRow: { backgroundColor: '#f8f9fa' },
  tableHeaderCell: { padding: '15px 20px', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #eee', verticalAlign: 'middle', textAlign: 'center' },
  tableRow: { transition: 'background-color 0.2s ease', cursor: 'pointer' },
  tableCell: { padding: '15px 20px', borderBottom: '1px solid #eee', verticalAlign: 'middle', textAlign: 'center' },
  nameCell: { display: 'flex', alignItems: 'center', gap: '12px' },
  userName: { fontWeight: '500' },
  roleBadge: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', color: 'white' },
  noResults: { padding: '50px 20px', textAlign: 'center', color: '#666' },

// Beautiful Modal Styles
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    backdropFilter: "blur(4px)",
    animation: "fadeIn 0.3s ease-out"
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: "24px",
    width: "95%",
    maxWidth: "580px",
    maxHeight: "90vh",
    boxShadow: "0 25px 50px rgba(0, 0, 0, 0.3)",
    overflow: "hidden",
    animation: "slideIn 0.3s ease-out",
    position: "relative"
  },
  modalHeader: {
    position: "relative",
    height: "160px",
    display: "flex",
    alignItems: "flex-end",
    padding: "0 0 20px 0",
    overflow: "hidden"
  },
  gradientBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "linear-gradient(135deg, #D2691E 0%, #FF8C42 50%, #FFA726 100%)",
    opacity: 0.9
  },
  closeBtn: {
    position: "absolute",
    top: "16px",
    right: "16px",
    background: "rgba(255, 255, 255, 0.2)",
    border: "none",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    backdropFilter: "blur(10px)",
    transition: "all 0.2s ease",
    zIndex: 10
  },
  profileSection: {
    position: "relative",
    zIndex: 5,
    display: "flex",
    alignItems: "center",
    gap: "20px",
    padding: "0 30px",
    width: "100%"
  },
  profilePicContainer: {
    position: "relative"
  },
  profilePic: {
    width: "90px",
    height: "90px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "4px solid rgba(255, 255, 255, 0.3)",
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.2)"
  },
  statusIndicator: {
    position: "absolute",
    bottom: "8px",
    right: "8px",
    width: "18px",
    height: "18px",
    backgroundColor: "#10b981",
    borderRadius: "50%",
    border: "3px solid white",
    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)"
  },
  profileInfo: {
    color: "white",
    textShadow: "0 2px 4px rgba(0, 0, 0, 0.3)"
  },
  modalTitle: {
    fontSize: "24px",
    fontWeight: "700",
    margin: "0 0 8px 0",
    color: "white"
  },
  modalRole: {
    fontSize: "16px",
    opacity: 0.9,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: "4px 12px",
    borderRadius: "20px",
    backdropFilter: "blur(10px)"
  },
  tabsContainer: {
    display: "flex",
    backgroundColor: "#f8f9fa",
    margin: "0",
    padding: "0 30px"
  },
  tabButton: {
    flex: 1,
    padding: "16px 20px",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    color: "#6b7280",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "all 0.2s ease",
    borderBottom: "3px solid transparent",
    position: "relative"
  },
  activeTab: {
    color: "#D2691E",
    backgroundColor: "white",
    borderBottom: "3px solid #D2691E",
    fontWeight: "600"
  },
  tabIcon: {
    opacity: 0.7
  },
  tabContent: {
    padding: "30px",
    maxHeight: "300px",
    overflowY: "auto"
  },
  tabPanel: {
    animation: "fadeInContent 0.3s ease-in"
  },
  infoSection: {
    marginBottom: "24px"
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: "600",
    marginBottom: "16px",
    color: "#1f2937",
    borderLeft: "4px solid #D2691E",
    paddingLeft: "12px"
  },
  infoGrid: {
    display: "grid",
    gap: "16px"
  },
  infoItem: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "16px",
    backgroundColor: "#f8fafc",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    transition: "all 0.2s ease"
  },
  infoLabel: {
    fontSize: "12px",
    fontWeight: "500",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  infoValue: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#1f2937",
    wordBreak: "break-word"
  },
  healthStatus: {
    fontWeight: "700",
    textTransform: "uppercase",
    fontSize: "13px",
    letterSpacing: "0.5px"
  }
};

export default UserAccountsPage;
