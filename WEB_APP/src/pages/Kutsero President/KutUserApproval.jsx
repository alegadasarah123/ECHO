import { useState, useEffect } from "react";
import Sidebar from "@/components/KutSidebar";

const UserApprovalPage = () => {
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/kutsero_president/get_user_approvals/");
        const data = await res.json();

        // Format for table: backend sends {id, email, created_at, name, status, role}
        const formatted = data.map(u => ({
          id: u.id,
          name: u.name || "N/A",
          email: u.email || "N/A",
          date: u.created_at ? new Date(u.created_at).toISOString().split("T")[0] : "N/A",
          status: (u.status || "pending").toLowerCase(), // normalize to lowercase
          // Mock additional data for modal (replace with actual backend data)
          profilePicture: u.profilePicture || "https://via.placeholder.com/120x120?text=Profile",
          dateOfBirth: u.dateOfBirth || "1990-01-01",
          sex: u.sex || "Male",
          phoneNumber: u.phoneNumber || "+63 912 345 6789",
          address: u.address || "123 Main St, Cebu City",
          facebook: u.facebook || "facebook.com/user"
        }));

        setUsers(formatted);
      } catch (err) {
        console.error("❌ Error fetching users:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const counts = {
    all: users.length,
    pending: users.filter(u => u.status === "pending").length,
    approved: users.filter(u => u.status === "approved").length,
    declined: users.filter(u => u.status === "declined").length,
  };

  const filteredUsers = users
    .filter(u => filter === "all" || u.status === filter)
    .filter(
      u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

const handleApprove = async (userId) => {
  try {
    const res = await fetch(`http://localhost:8000/api/kutsero_president/approve_user/${userId}/`, {
      method: 'POST',
    });
    
    if (res.ok) {
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, status: 'approved' } : u
      ));
      handleCloseModal();
      alert("✅ User approved successfully!");
    }
  } catch (err) {
    console.error("❌ Error approving user:", err);
    alert("❌ Failed to approve user.");
  }
};

const handleDecline = async (userId) => {
  try {
    const res = await fetch(`http://localhost:8000/api/kutsero_president/decline_user/${userId}/`, {
      method: 'POST',
    });
    
    if (res.ok) {
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, status: 'declined' } : u
      ));
      handleCloseModal();
      alert("⚠️ User declined successfully!");
    }
  } catch (err) {
    console.error("❌ Error declining user:", err);
    alert("❌ Failed to decline user.");
  }
};



  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.dashboard}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <h1 style={styles.title}>User Approval</h1>
          </div>
        </div>

        <div style={styles.scrollContent}>
          {/* 🔍 Search bar */}
          <div style={styles.searchContainer}>
            <input
              style={styles.searchInput}
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* 🔘 Filters */}
          <div style={styles.filterTabs}>
            {["all", "pending", "approved", "declined"].map(f => (
              <button
                key={f}
                style={{
                  ...styles.filterBtn,
                  ...(filter === f ? styles.filterBtnActive : {}),
                }}
                onClick={() => setFilter(f)}
              >
                {f.toUpperCase()}
                <span
                  style={{
                    ...styles.countBadge,
                    backgroundColor:
                      f === "approved"
                        ? "#16a34a"
                        : f === "pending"
                        ? "#f59e0b"
                        : f === "declined"
                        ? "#ef4444"
                        : "#6b7280",
                  }}
                >
                  {counts[f]}
                </span>
              </button>
            ))}
          </div>

          {/* 📋 Table */}
          <div style={styles.tableSection}>
            <div style={styles.tableContainer}>
              {loading ? (
                <p style={{ textAlign: "center", padding: "1rem" }}>Loading...</p>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.tableHeaderCell}>Name</th>
                      <th style={styles.tableHeaderCell}>Email</th>
                      <th style={styles.tableHeaderCell}>Registration Date</th>
                      <th style={styles.tableHeaderCell}>Status</th>
                      <th style={styles.tableHeaderCell}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map(user => (
                        <tr key={user.id} style={styles.tableRow}>
                          <td style={styles.tableCell}>{user.name}</td>
                          <td style={styles.tableCell}>{user.email}</td>
                          <td style={styles.tableCell}>{user.date}</td>
                          <td style={styles.tableCell}>
                            <span
                              style={{
                                ...styles.statusBadge,
                                backgroundColor:
                                  user.status === "approved"
                                    ? "#d1fae5"
                                    : user.status === "pending"
                                    ? "#fef3c7"
                                    : "#fee2e2",
                                color:
                                  user.status === "approved"
                                    ? "#16a34a"
                                    : user.status === "pending"
                                    ? "#f59e0b"
                                    : "#ef4444",
                              }}
                            >
                              {user.status.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ ...styles.tableCell, ...styles.actionsCell }}>
                            <button 
                              style={styles.viewBtn}
                              onClick={() => handleViewUser(user)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={styles.noResults}>
                          No users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 🎭 Modal */}
      {showModal && selectedUser && (
        <div style={styles.modalOverlay} onClick={handleCloseModal}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>User Details</h2>
              <button style={styles.closeBtn} onClick={handleCloseModal}>
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.mainContentContainer}>
                {/* Left Side - Profile, Name, Status */}
                <div style={styles.leftSide}>
                  <div style={styles.profileSection}>
                    <img
                      src={selectedUser.profilePicture}
                      alt="Profile"
                      style={styles.profileImage}
                    />
                    <h2 style={styles.formalUserName}>{selectedUser.name}</h2>
                    <p style={styles.applicationDate}>Registration Date: {selectedUser.date}</p>
                    <div style={styles.statusContainer}>
                      <span style={styles.statusLabel}>Current Status:</span>
                      <span
                        style={{
                          ...styles.formalStatusBadge,
                          backgroundColor:
                            selectedUser.status === "approved"
                              ? "#d1fae5"
                              : selectedUser.status === "pending"
                              ? "#fef3c7"
                              : "#fee2e2",
                          color:
                            selectedUser.status === "approved"
                              ? "#16a34a"
                              : selectedUser.status === "pending"
                              ? "#f59e0b"
                              : "#ef4444",
                        }}
                      >
                        {selectedUser.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side - Personal and Contact Information */}
                <div style={styles.rightSide}>
                  {/* Personal Information Section */}
                  <div style={styles.sectionContainer}>
                    <h3 style={styles.sectionTitle}>Personal Information</h3>
                    <div style={styles.formalInfoGrid}>
                      <div style={styles.formalInfoRow}>
                        <span style={styles.formalLabel}>Full Name:</span>
                        <span style={styles.formalValue}>{selectedUser.name}</span>
                      </div>
                      
                      <div style={styles.formalInfoRow}>
                        <span style={styles.formalLabel}>Date of Birth:</span>
                        <span style={styles.formalValue}>{selectedUser.dateOfBirth}</span>
                      </div>

                      <div style={styles.formalInfoRow}>
                        <span style={styles.formalLabel}>Gender:</span>
                        <span style={styles.formalValue}>{selectedUser.sex}</span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information Section */}
                  <div style={styles.sectionContainer}>
                    <h3 style={styles.sectionTitle}>Contact Information</h3>
                    <div style={styles.formalInfoGrid}>
                      <div style={styles.formalInfoRow}>
                        <span style={styles.formalLabel}>Email Address:</span>
                        <span style={styles.formalValue}>{selectedUser.email}</span>
                      </div>

                      <div style={styles.formalInfoRow}>
                        <span style={styles.formalLabel}>Phone Number:</span>
                        <span style={styles.formalValue}>{selectedUser.phoneNumber}</span>
                      </div>

                      <div style={styles.formalInfoRow}>
                        <span style={styles.formalLabel}>Home Address:</span>
                        <span style={styles.formalValue}>{selectedUser.address}</span>
                      </div>

                      <div style={styles.formalInfoRow}>
                        <span style={styles.formalLabel}>Facebook Profile:</span>
                        <a href={`https://${selectedUser.facebook}`} target="_blank" rel="noopener noreferrer" style={styles.formalLink}>
                          {selectedUser.facebook}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons - Only show if status is pending */}
            {selectedUser.status === "pending" && (
              <div style={styles.modalActions}>
                <button
                  style={styles.declineBtn}
                  onClick={() => handleDecline(selectedUser.id)}
                >
                  🚫 Decline
                </button>
                <button
                  style={styles.approveBtn}
                  onClick={() => handleApprove(selectedUser.id)}
                >
                  ✅ Approve
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  layout: { display: "flex", minHeight: "100vh", backgroundColor: "#f5f5f5" },
  dashboard: { flex: 1, fontFamily: "'Segoe UI', Tahoma", display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" },
  header: { display: "flex", alignItems: "center", backgroundColor: "#fff", padding: "20px 30px", borderBottom: "1px solid #eee", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", position: "sticky", top: 0, zIndex: 10 },
  headerLeft: { display: "flex", flexDirection: "column" },
  title: { fontSize: "28px", fontWeight: "bold", color: "#D2691E" },
  scrollContent: { flex: 1, padding: "20px", display: "flex", flexDirection: "column", overflow: "hidden" },
  searchContainer: { marginBottom: "20px", maxWidth: "400px" },
  searchInput: { width: "100%", padding: "12px 15px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  filterTabs: { display: "flex", gap: "15px", marginBottom: "20px" },
  filterBtn: { padding: "10px 20px", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s ease" },
  filterBtnActive: { backgroundColor: "#D2691E", color: "#fff", border: "1px solid #D2691E" },
  countBadge: { fontWeight: "600", color: "#fff", borderRadius: "12px", padding: "2px 6px", fontSize: "12px" },
  tableSection: { backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  tableContainer: { overflowY: "auto", flex: 1, maxHeight: "400px" },
  table: { width: "100%", borderCollapse: "collapse" },
  tableHeaderRow: { backgroundColor: "#f8f9fa" },
  tableHeaderCell: { padding: "15px", fontSize: "14px", fontWeight: "600", borderBottom: "1px solid #eee", textAlign: "center", position: "sticky", top: 0, backgroundColor: "#f8f9fa" },
  tableCell: { padding: "15px", borderBottom: "1px solid #eee", textAlign: "center" },
  actionsCell: { display: "flex", justifyContent: 'center', gap: "10px" },
  viewBtn: { padding: "6px 12px", backgroundColor: "#3b82f6", color: "#fff", borderRadius: "6px", border: "none", cursor: "pointer", transition: "background 0.2s" },
  noResults: { padding: "50px 20px", textAlign: "center", color: "#666" },
  statusBadge: { display: "inline-block", padding: "4px 10px", borderRadius: "9999px", fontSize: "12px", fontWeight: "600" },

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
  applicationDate: { fontSize: "14px", color: "#666", marginBottom: "8px" },
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
};

export default UserApprovalPage;