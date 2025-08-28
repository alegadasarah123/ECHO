import React, { useState, useEffect } from 'react';
import { Users, Users2 } from 'lucide-react';
import Sidebar from '@/components/KutSidebar';

const KutseroDashboard = () => {
  const [users, setUsers] = useState([]);
  const [approvedCounts, setApprovedCounts] = useState({ approved_kutsero_count: 0, approved_horse_operator_count: 0 });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
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

        setPendingCount(data.pending_count || 0);

      } catch (err) {
        console.error(err);
      }
    };

    const fetchApprovedCounts = async () => {
      try {
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

  // ✅ Only approved users
  const approvedUsers = users.filter(u => u.status === "approved");
  const pendingUsers = users.filter(u => u.status === "pending");

  const todayDate = new Date().toLocaleDateString();
  const todayRegistrations = users.filter(u => u.created_at === todayDate);

  // Helper: Role colors
  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'kutsero':
        return '#16a34a';
      case 'horse_operator':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role?.toLowerCase()) {
      case 'kutsero':
        return 'Kutsero';
      case 'horse_operator':
        return 'Horse Operator';
      default:
        return role;
    }
  };

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.dashboard}>
        
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Kutsero Dashboard</h1>
        </div>

        <div style={styles.scrollContent}>
          
          {/* Updated Stats Cards */}
          <div style={styles.statsSection}>
            {/* ✅ Approved Users only */}
            <div style={styles.statCard}>
              <div style={styles.statContent}>
                <Users size={28} color="#16a34a" />
                <p style={styles.statValue}>{approvedCounts.approved_kutsero_count}</p>
              </div>
              <h3 style={styles.statLabel}>Total Users</h3>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statContent}>
                <Users2 size={28} color="#3b82f6" />
                <p style={styles.statValue}>{approvedCounts.approved_horse_operator_count}</p>
              </div>
              <h3 style={styles.statLabel}>Pending Verifications</h3>
            </div>
          </div>

          {/* Today’s Registration + Users per Role (side by side) */}
          <div style={{ display: "flex", gap: "20px" }}>
            
            {/* Today’s Registrations (wider) */}
            <div style={{ ...styles.pendingCard, flex: 2 }}>
              <div style={styles.activityHeader}>
                <div style={styles.headerTitle}>
                  <UserPlus size={24} color="#D2691E" />
                  <h2 style={styles.sectionHeader}>Today's Registrations</h2>
                </div>
                <span style={styles.activityCount}>{todayRegistrations.length} today</span>
              </div>

              {/* ✅ Scrollable list */}
              <div style={styles.activitiesListScrollable}>
                {todayRegistrations.length > 0 ? (
                  todayRegistrations.map((u) => (
                    <div key={u.id} style={styles.activityItem}>
                      <div style={styles.activityIcon}>
                        <div
                          style={{
                            ...styles.iconCircle,
                            backgroundColor: `${getRoleColor(u.role)}15`
                          }}
                        >
                          <User size={16} color={getRoleColor(u.role)} />
                        </div>
                      </div>
                      <div style={styles.activityContent}>
                        <div style={styles.activityMain}>
                          <span style={styles.userName}>{u.name}</span>
                          <span style={styles.actionText}>registered as</span>
                          <span
                            style={{
                              ...styles.roleBadge,
                              backgroundColor: `${getRoleColor(u.role)}15`,
                              color: getRoleColor(u.role)
                            }}
                          >
                            {getRoleDisplayName(u.role)}
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
  header: { padding: "20px 30px", backgroundColor: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: "28px", fontWeight: "bold", color: "#D2691E" },

  notificationBtn: { position: "relative", background: "transparent", border: "none", cursor: "pointer", padding: "8px", borderRadius: "50%" },
  badge: { position: "absolute", top: "2px", right: "2px", backgroundColor: "#ef4444", color: "#fff", borderRadius: "50%", padding: "2px 6px", fontSize: "12px", fontWeight: "bold" },

  scrollContent: { flex: 1, padding: "20px", display: "flex", flexDirection: "column", overflow: "hidden", gap: "20px" },
  statsSection: { display: "flex", gap: "20px" },
  statCard: { flex: 1, backgroundColor: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" },
  statContent: { display: "flex", alignItems: "center", gap: "8px" },
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
