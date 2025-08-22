import { useState } from "react";
import Sidebar from "@/components/KutSidebar";



const UserApprovalPage = () => {
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([
    { id: 1, name: "Juan Dela Cruz", email: "juan@example.com", date: "2025-08-01", status: "pending" },
    { id: 2, name: "Maria Santos", email: "maria@example.com", date: "2025-07-28", status: "approved" },
    { id: 3, name: "Pedro Reyes", email: "pedro@example.com", date: "2025-07-20", status: "declined" },
  ]);

  const counts = {
    all: users.length,
    pending: users.filter(u => u.status === "pending").length,
    approved: users.filter(u => u.status === "approved").length,
    declined: users.filter(u => u.status === "declined").length,
  };

  const filteredUsers = users
    .filter(u => filter === "all" || u.status === filter)
    .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()));

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
          <div style={styles.searchContainer}>
            <input
              style={styles.searchInput}
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

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
                      f === "approved" ? "#16a34a" : f === "pending" ? "#f59e0b" : f === "declined" ? "#ef4444" : "#6b7280",
                  }}
                >
                  {counts[f]}
                </span>
              </button>
            ))}
          </div>

          <div style={styles.tableSection}>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.tableHeaderCell}>Name</th>
                    <th style={styles.tableHeaderCell}>Email</th>
                    <th style={styles.tableHeaderCell}>Application Date</th>
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
                        <td style={{ ...styles.tableCell, ...styles.actionsCell }}>
                          <button style={styles.approveBtn}>View</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={styles.noResults}>No users found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  layout: { display: "flex", minHeight: "100vh", backgroundColor: "#f5f5f5" },
  dashboard: {
    flex: 1,
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    display: "flex",
    flexDirection: "column",
    height: "100vh",
  },
  header: {
    flexShrink: 0,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: "20px 30px",
    borderBottom: "1px solid #eee",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  headerLeft: { display: "flex", flexDirection: "column" },
  title: { fontSize: "28px", fontWeight: "bold", color: "#D2691E", margin: "4px 0 0 0 "},
  scrollContent: { flex: 1, padding: "20px", display: "flex", flexDirection: "column" },
  searchContainer: { marginBottom: "20px", width: "100%", maxWidth: "400px" },
  searchInput: {
    width: "100%",
    padding: "12px 15px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "14px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    outline: "none",
    transition: "border 0.2s ease, box-shadow 0.2s ease",
  },
  searchInputFocus: {
    borderColor: "#D2691E",
    boxShadow: "0 2px 8px rgba(210,105,30,0.3)",
  },
  filterTabs: { display: "flex", gap: "15px", marginBottom: "20px" },
  filterBtn: {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  filterBtnActive: {
    backgroundColor: "#D2691E",
    color: "#fff",
    border: "1px solid #D2691E",
  },
  countBadge: {
    fontWeight: "600",
    color: "#fff",
    borderRadius: "12px",
    padding: "2px 6px",
    fontSize: "12px",
  },
  tableSection: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  tableContainer: { overflowY: "auto", flex: 1 },
  table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" },
  tableHeaderRow: { backgroundColor: "#f8f9fa" },
  tableHeaderCell: {
    padding: "15px 20px",
    fontSize: "14px",
    fontWeight: "600",
    borderBottom: "1px solid #eee",
    textAlign: "center",
  },
  tableRow: { transition: "background-color 0.2s ease" },
  tableCell: { padding: "15px 20px", borderBottom: "1px solid #eee", textAlign: "center" },
  actionsCell: { display: "flex", gap: "10px", justifyContent: 'center',  alignItems: 'center'},
  approveBtn: { padding: "6px 12px", backgroundColor: "#16a34a", color: "#fff", borderRadius: "6px", cursor: "pointer", border: "none" },
  noResults: { padding: "50px 20px", textAlign: "center", color: "#666" },
};
export default UserApprovalPage;
