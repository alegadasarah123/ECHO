import Sidebar from '@/components/KutSidebar';
import { Users, Users2 } from 'lucide-react';
import { useEffect, useState } from 'react';

const KutseroDashboard = () => {
  const [users, setUsers] = useState([]);
  const [approvedCounts, setApprovedCounts] = useState({ approved_kutsero_count: 0, approved_horse_operator_count: 0 });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Fetch all users for pending table
        const res = await fetch("http://localhost:8000/api/kutsero_president/get_users/");
        const data = await res.json();
        const formatted = data.users.map(u => ({
          id: u.id,
          name: u.name || "N/A",
          email: u.email || "N/A",
          created_at: u.created_at ? new Date(u.created_at).toLocaleDateString() : "N/A",
          role: u.role,
          status: u.status?.toLowerCase() || "pending"
        }));
        setUsers(formatted);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchApprovedCounts = async () => {
      try {
        // Fetch approved counts from new backend API
        const res = await fetch("http://localhost:8000/api/kutsero_president/get_approved_counts/");
        const data = await res.json();
        setApprovedCounts(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchUsers();
    fetchApprovedCounts();
  }, []);

  const pendingUsers = users.filter(u => u.status === "pending");

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.dashboard}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Kutsero Dashboard</h1>
        </div>

        <div style={styles.scrollContent}>
          {/* Stats Cards */}
          <div style={styles.statsSection}>
            <div style={styles.statCard}>
              <div style={styles.statContent}>
                <Users size={28} color="#16a34a" />
                <p style={styles.statValue}>{approvedCounts.approved_kutsero_count}</p>
              </div>
              <h3 style={styles.statLabel}>Total Kutsero</h3>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statContent}>
                <Users2 size={28} color="#3b82f6" />
                <p style={styles.statValue}>{approvedCounts.approved_horse_operator_count}</p>
              </div>
              <h3 style={styles.statLabel}>Total Horse Operator</h3>
            </div>
          </div>

          {/* Pending Verifications Card */}
          <div style={styles.pendingCard}>
            <h2 style={styles.sectionHeader}>Pending Verifications</h2>
            <div style={styles.tableSection}>
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.tableHeaderCell}>Name</th>
                      <th style={styles.tableHeaderCell}>Email</th>
                      <th style={styles.tableHeaderCell}>Registered Date</th>
                      <th style={styles.tableHeaderCell}>Role</th>
                      <th style={styles.tableHeaderCell}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.length > 0 ? pendingUsers.map(u => (
                      <tr key={u.id} style={styles.tableRow}>
                        <td style={styles.tableCell}>{u.name}</td>
                        <td style={styles.tableCell}>{u.email}</td>
                        <td style={styles.tableCell}>{u.created_at}</td>
                        <td style={styles.tableCell}>{u.role}</td>
                        <td style={styles.tableCell}>
                          <span style={{
                            ...styles.statusBadge,
                            backgroundColor: "#fef3c7",
                            color: "#f59e0b",
                          }}>
                            {u.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="5" style={styles.noResults}>No pending users.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const styles = {
  layout: { display: "flex", minHeight: "100vh", backgroundColor: "#f5f5f5" },
  dashboard: { flex: 1, fontFamily: "'Segoe UI', Tahoma", display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" },
  header: { padding: "20px 30px", backgroundColor: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", borderBottom: "1px solid #eee" },
  title: { fontSize: "28px", fontWeight: "bold", color: "#D2691E" },
  scrollContent: { flex: 1, padding: "20px", display: "flex", flexDirection: "column", overflow: "hidden" },

  statsSection: { display: "flex", gap: "20px", marginBottom: "20px" },
  statCard: {flex: 1,backgroundColor: "#fff",padding: "20px",borderRadius: "12px",boxShadow: "0 2px 10px rgba(0,0,0,0.1)",textAlign: "center",display: "flex",flexDirection: "column",alignItems: "center",gap: "10px",},
  statContent: {display: "flex",alignItems: "center",gap: "8px"},
  statValue: { fontSize: "28px", fontWeight: "bold", color: "#000", margin: 0 },
  statLabel: { fontSize: "16px", fontWeight: "600", color: "#6b7280", margin: 0 },
  pendingCard: {backgroundColor: "#fff",borderRadius: "12px",boxShadow: "0 2px 10px rgba(0,0,0,0.1)",padding: "20px",display: "flex",flexDirection: "column",gap: "20px",marginBottom: "20px"},
  sectionHeader: { fontSize: "20px", fontWeight: "600", color: "#D2691E", margin: "20px 0 10px 0" },
  tableSection: { backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  tableContainer: { overflowY: "auto", flex: 1, maxHeight: "250px" },
  table: { width: "100%", borderCollapse: "collapse" },
  tableHeaderRow: { backgroundColor: "#f8f9fa" },
  tableHeaderCell: { padding: "15px", fontSize: "14px", fontWeight: "600", textAlign: "center", position: "sticky", top: 0, backgroundColor: "#f8f9fa", verticalAlign: "middle", height: "48px" },
  tableRow: { borderBottom: "1px solid #eee", height: "48px" },
  tableCell: { padding: "15px", textAlign: "center", verticalAlign: "middle"},
  noResults: { padding: "50px 20px", textAlign: "center", color: "#666" },
  statusBadge: { display: "inline-block", padding: "4px 10px", borderRadius: "9999px", fontSize: "12px", fontWeight: "600"},
};

export default KutseroDashboard;
