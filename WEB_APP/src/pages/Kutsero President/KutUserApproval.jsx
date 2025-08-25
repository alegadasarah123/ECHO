import { useState, useEffect } from "react";
import { Filter } from "lucide-react";
import Sidebar from "@/components/KutSidebar";

const UserApprovalPage = () => {
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/kutsero_president/get_user_approvals/");
        const data = await res.json();

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

// Count users based on the selected role filter
const filteredCounts = {
  all: users.filter(u => roleFilter === "all" || u.role.toLowerCase() === roleFilter.toLowerCase()).length,
  pending: users.filter(u => (roleFilter === "all" || u.role.toLowerCase() === roleFilter.toLowerCase()) && u.status === "pending").length,
  approved: users.filter(u => (roleFilter === "all" || u.role.toLowerCase() === roleFilter.toLowerCase()) && u.status === "approved").length,
  declined: users.filter(u => (roleFilter === "all" || u.role.toLowerCase() === roleFilter.toLowerCase()) && u.status === "declined").length,
};

const filteredUsers = users
  // Filter by status tab (all, pending, approved, declined)
  .filter((u) => filter === "all" || u.status.toLowerCase() === filter.toLowerCase())
  // Filter by role dropdown (all, kutsero, horse operator)
  .filter((u) => 
    roleFilter === "all" || (u.role && u.role.toLowerCase() === roleFilter.toLowerCase())
  )
  // Filter by search input
  .filter(
    (u) =>
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
      const res = await fetch(
        `http://localhost:8000/api/kutsero_president/approve_user/${userId}/`,
        { method: "POST" }
      );

      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: "approved" } : u)));
        handleCloseModal();
        alert("✅ User approved successfully!");
      }
    } catch (err) {
      console.error("❌ Error approving user:", err);
      alert("❌ Failed to approve user.");
    }
  };

  // Add this function inside UserApprovalPage
const handleApproveAll = async () => {
  const pendingUsers = filteredUsers.filter(u => u.status === "pending");
  if (pendingUsers.length === 0) {
    alert("⚠️ No pending users to approve.");
    return;
  }

  if (!window.confirm(`Are you sure you want to approve ${pendingUsers.length} user(s)?`)) return;

  try {
    const res = await fetch(
      "http://localhost:8000/api/kutsero_president/approve_all_users/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: pendingUsers.map(u => u.id) }),
      }
    );

    if (res.ok) {
      setUsers(prev =>
        prev.map(u =>
          pendingUsers.some(p => p.id === u.id) ? { ...u, status: "approved" } : u
        )
      );
      alert(`✅ Approved ${pendingUsers.length} user(s) successfully!`);
    } else {
      const data = await res.json();
      alert(data.error || "❌ Failed to approve users.");
    }
  } catch (err) {
    console.error("❌ Error approving all users:", err);
    alert("❌ Failed to approve users.");
  }
};


  const handleDecline = async (userId) => {
    try {
      const res = await fetch(
        `http://localhost:8000/api/kutsero_president/decline_user/${userId}/`,
        { method: "POST" }
      );

      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: "declined" } : u)));
        handleCloseModal();
        alert("⚠️ User declined successfully!");
      }
    } catch (err) {
      console.error("❌ Error declining user:", err);
      alert("❌ Failed to decline user.");
    }
  };

const handleDeleteClick = async () => {
  if (!deleteMode) {
    setDeleteMode(true);
  } else {
    if (selectedIds.length === 0) {
      alert("⚠️ Please select at least one user to delete.");
      return;
    }

    if (window.confirm("Are you sure you want to permanently delete selected users?")) {
      try {
        const res = await fetch("http://localhost:8000/api/kutsero_president/delete_declined_users/", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ids: selectedIds }),
        });

        const data = await res.json();

        if (res.ok) {
          // Remove deleted users from UI
          setUsers((prev) => prev.filter((u) => !data.deleted.includes(u.id)));
          setSelectedIds([]);
          setSelectAll(false);
          setDeleteMode(false);

          alert(`🗑️ Deleted ${data.deleted.length} user(s).`);
          if (data.skipped.length > 0) {
            alert(`⚠️ Skipped ${data.skipped.length} user(s) (not declined).`);
          }
        } else {
          alert(data.error || "❌ Failed to delete users.");
        }
      } catch (err) {
        console.error("Delete error:", err);
        alert("❌ Something went wrong while deleting users.");
      }
    }
  }
};


  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredUsers.map((u) => u.id));
    }
    setSelectAll(!selectAll);
  };

  const toggleCheckbox = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
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
          {/* Search + Role Filter */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px", maxWidth: "500px" }}>
              <input
                style={styles.searchInput}
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

            <select
              style={{ padding: "12px 15px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="kutsero">KUTSERO</option>
              <option value="horse operator">HORSE OPERATOR</option>
            </select>
            </div>


          {/* Filter Tabs */}
          <div style={styles.filterTabs}>
            {["all", "pending", "approved", "declined"].map((f) => (
              <button
                key={f}
                style={{
                  ...styles.filterBtn,
                  ...(filter === f ? styles.filterBtnActive : {}),
                }}
                onClick={() => {
                  setFilter(f);
                  setDeleteMode(false);
                  setSelectedIds([]);
                }}
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
                  {filteredCounts[f]}
                </span>
              </button>
            ))}
          </div>

         {/* Show Delete + Cancel buttons only if Declined tab has users */}
          {filter === "declined" && filteredUsers.length > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <button style={styles.deleteBtn} onClick={handleDeleteClick}>
                DELETE
              </button>

              {deleteMode && (
                <button
                  style={styles.cancelBtn}
                  onClick={() => {
                    setDeleteMode(false);
                    setSelectedIds([]);
                    setSelectAll(false);
                  }}
                >
                  CANCEL
                </button>
              )}
            </div>
          )}


            {filter === "pending" && filteredUsers.length > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
              <button
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#16a34a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
                onClick={handleApproveAll}
              >
                Approve All
              </button>
            </div>
          )}

          {/* Table */}
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
                      <th style={styles.tableHeaderCell}>
                        {deleteMode ? (
                          <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} />
                        ) : (
                          "Action"
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
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
                            {deleteMode ? (
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(user.id)}
                                onChange={() => toggleCheckbox(user.id)}
                              />
                            ) : (
                              <button style={styles.viewBtn} onClick={() => handleViewUser(user)}>
                                View
                              </button>
                            )}
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
                    <p style={styles.role}>{selectedUser.role}</p>
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
  tableHeaderCell: { padding: "15px", fontSize: "14px", fontWeight: "600", textAlign: "center", position: "sticky", top: 0, backgroundColor: "#f8f9fa", verticalAlign: "middle", height: "48px" },
  tableRow: { borderBottom: "1px solid #eee", height: "48px" },
  tableCell: { padding: "15px", textAlign: "center", verticalAlign: "middle"},
  actionsCell: { display: "flex", justifyContent: 'center', gap: "10px", alignItems: "center" },
  viewBtn: { padding: "6px 12px", backgroundColor: "#3b82f6", color: "#fff", borderRadius: "6px", border: "none", cursor: "pointer", transition: "background 0.2s"},
  noResults: { padding: "50px 20px", textAlign: "center", color: "#666" },
  statusBadge: { display: "inline-block", padding: "4px 10px", borderRadius: "9999px", fontSize: "12px", fontWeight: "600"},

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
  cancelBtn: {display: "flex",alignItems: "center",gap: "6px",padding: "8px 14px", backgroundColor: "#9ca3af",border: "none",borderRadius: "6px",cursor: "pointer",fontSize: "14px",fontWeight: "600"}
};

export default UserApprovalPage;