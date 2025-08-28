
import Sidebar from '@/components/KutSidebar';
import { Bell, Calendar, Clock, User, UserPlus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import NotificationModal from './KutNotif';
const KutseroDashboard = () => {
  const [users, setUsers] = useState([]);
  const [approvedCounts, setApprovedCounts] = useState({ approved_kutsero_count: 0, approved_horse_operator_count: 0 });
  const [notifOpen, setNotifOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

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
          status: u.status || "N/A"
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
          <div style={{ position: "relative" }}>
            <button
              style={styles.notificationBtn}
              onClick={() => setNotifOpen(!notifOpen)}
            >
              <Bell size={24} color="#374151" />
              {pendingCount > 0 && (
                <span style={styles.badge}>{pendingCount}</span>
              )}

            </button>

            {/* Notification Modal */}
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
          
          {/* Updated Stats Cards */}
          <div style={styles.statsSection}>
            <div style={styles.statCard}>
              <div style={styles.statContent}>
                <Users size={28} color="#16a34a" />
                <p style={styles.statValue}>
                  {approvedCounts.approved_kutsero_count + approvedCounts.approved_horse_operator_count}
                </p>
              </div>
              <h3 style={styles.statLabel}>Total Users</h3>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statContent}>
                <Clock size={28} color="#ef4444" />
                <p style={styles.statValue}>{pendingCount}</p>
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
                        </div>
                        <div style={styles.activityMeta}>
                          <Calendar size={12} color="#9ca3af" />
                          <span style={styles.dateText}>{u.created_at}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={styles.emptyState}>
                    <p style={styles.emptyText}>No registrations today</p>
                    <span style={styles.emptySubtext}>New users will appear here</span>
                  </div>
                )}
              </div>
            </div>


            {/* Users per Role (smaller) */}
            <div style={{ ...styles.pendingCard, flex: 1 }}>
              <div style={styles.activityHeader}>
                <div style={styles.headerTitle}>
                  <Users size={24} color="#16a34a" />
                  <h2 style={styles.sectionHeader}>Users per Role</h2>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Kutsero */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Kutsero</span>
                    <span style={{ fontWeight: "600" }}>
                      {approvedCounts.approved_kutsero_count} users
                    </span>
                  </div>
                  <div style={{ background: "#e5e7eb", borderRadius: "8px", height: "10px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${
                          (approvedCounts.approved_kutsero_count /
                            (approvedCounts.approved_kutsero_count + approvedCounts.approved_horse_operator_count || 1)) *
                          100
                        }%`,
                        background: "#16a34a",
                        height: "100%",
                        borderRadius: "8px"
                      }}
                    />
                  </div>
                </div>

                {/* Horse Operator */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Horse Operator</span>
                    <span style={{ fontWeight: "600" }}>
                      {approvedCounts.approved_horse_operator_count} users
                    </span>
                  </div>
                  <div style={{ background: "#e5e7eb", borderRadius: "8px", height: "10px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${
                          (approvedCounts.approved_horse_operator_count /
                            (approvedCounts.approved_kutsero_count + approvedCounts.approved_horse_operator_count || 1)) *
                          100
                        }%`,
                        background: "#3b82f6",
                        height: "100%",
                        borderRadius: "8px"
                      }}
                    />
                  </div>
                </div>
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

  pendingCard: { backgroundColor: "#fff", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", padding: "24px", display: "flex", flexDirection: "column", gap: "20px", border: "1px solid #f1f5f9" },
  activityHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "16px", borderBottom: "2px solid #f1f5f9" },
  headerTitle: { display: "flex", alignItems: "center", gap: "12px" },
  sectionHeader: { fontSize: "22px", fontWeight: "700", color: "#1f2937", margin: 0 },
  activityCount: { backgroundColor: "#f3f4f6", color: "#6b7280", padding: "4px 12px", borderRadius: "20px", fontSize: "14px", fontWeight: "500" },

  activitiesListScrollable: {display: "flex",flexDirection: "column",gap: "16px", maxHeight: "300px", height: "250px", overflowY: "auto",paddingRight: "8px" },
  activitiesList: { display: "flex", flexDirection: "column", gap: "16px" },
  activityItem: { display: "flex", alignItems: "flex-start", gap: "16px", padding: "16px", borderRadius: "12px", backgroundColor: "#fafafa", border: "1px solid #f0f0f0" },
  activityIcon: { flexShrink: 0 },
  iconCircle: { width: "40px", height: "40px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #f1f5f9" },
  activityContent: { flex: 1, display: "flex", flexDirection: "column", gap: "8px" },
  activityMain: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
  userName: { fontWeight: "600", color: "#1f2937", fontSize: "15px" },
  actionText: { color: "#6b7280", fontSize: "14px" },
  roleBadge: { padding: "4px 10px", borderRadius: "16px", fontSize: "12px", fontWeight: "600" },
  activityMeta: { display: "flex", alignItems: "center", gap: "6px" },
  dateText: { color: "#9ca3af", fontSize: "13px" },

  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", gap: "12px" },
  emptyText: { color: "#6b7280", fontSize: "16px", fontWeight: "500", margin: 0 },
  emptySubtext: { color: "#9ca3af", fontSize: "14px" }
};

export default KutseroDashboard;
