import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";   
import { Users, Users2, UserPlus, User, Bell } from 'lucide-react';
import Sidebar from '@/components/KutSidebar';
import FloatingMessages from './KutMessages';
import NotificationModal from './KutNotif';

const API_BASE = "http://localhost:8000/api/kutsero_president";

const KutseroDashboard = () => {
  const navigate = useNavigate(); 
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [users, setUsers] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCounts, setApprovedCounts] = useState({
    approved_kutsero_count: 0,
    approved_horse_operator_count: 0,
  });
  const [notifOpen, setNotifOpen] = useState(false);
  const pendingUsers = users.filter(u => u.status === "pending");
  
    // ---------------- AUTH CHECK ----------------
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_BASE}/test_cookie/`, {
          credentials: "include", 
        });
        const data = await res.json();
        if (!data.token_present) {
          navigate("/login");
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        navigate("/login");
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_BASE}/get_users/`, {
          method: "GET",
          credentials: "include", 
        });
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
        setPendingCount(data.pending_count);
      } catch (err) {
        console.error(err);
      }
    };

  const fetchApprovedCounts = async () => {
    try {
      const res = await fetch(`${API_BASE}/get_approved_counts/`, {
        method: "GET",
        credentials: "include", 
      });
      const data = await res.json();
      setApprovedCounts(data);
    } catch (err) {
      console.error(err);
    }
  };

  fetchUsers();
  fetchApprovedCounts();
}, []);

  const todayDate = new Date().toLocaleDateString();
  const todayRegistrations = users.filter(u => u.created_at === todayDate);

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'kutsero': return '#16a34a';
      case 'horse_operator': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role?.toLowerCase()) {
      case 'kutsero': return 'Kutsero';
      case 'horse_operator': return 'Horse Operator';
      default: return role;
    }
  };

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.dashboard}>
          {/* Header */}
          <div style={styles.header}>
            <h1 style={styles.title}>User Approval</h1>

            {/* Notification Icon */}
            <div style={{ position: "relative" }}>
              <button
                style={styles.notificationBtn}
                onClick={() => setNotifOpen(!notifOpen)}
              >
                <Bell size={24} color="#374151" />
                {pendingUsers.length > 0 && (
                  <span style={styles.badge}>{pendingUsers.length}</span>
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
          {/* Stats Cards */}
          <div style={styles.statsSection}>
            <div style={styles.statCard}>
              <div style={styles.statContent}>
                <Users size={28} color="#16a34a" />
                <p style={styles.statValue}>
                  {approvedCounts.approved_kutsero_count + approvedCounts.approved_horse_operator_count}
                </p>
              </div>
              <h3 style={styles.statLabel}>Total Approved Users</h3>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statContent}>
                <Users2 size={28} color="#3b82f6" />
                <p style={styles.statValue}>{pendingCount}</p> 
              </div>
              <h3 style={styles.statLabel}>Pending Verifications</h3>
            </div>
          </div>

          {/* Today’s Registrations + Recent Users */}
          <div style={{ display: "flex", gap: "20px" }}>
            {/* Today's Registrations */}
            <div style={{ ...styles.pendingCard, flex: 2 }}>
              <div style={styles.activityHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <UserPlus size={24} color="#000" />
                  <h2 style={{ ...styles.sectionHeader, color: "#000" }}>Today's Registrations</h2>
                  <span style={styles.todayCountPill}>{todayRegistrations.length} today</span>
                </div>
              </div>

              <div style={styles.activitiesListScrollable}>
                {todayRegistrations.length > 0 ? (
                  todayRegistrations.map((u) => (
                    <div key={u.id} style={styles.activityItem}>
                      <div style={styles.activityIcon}>
                        <div style={{ ...styles.iconCircle, backgroundColor: `${getRoleColor(u.role)}15` }}>
                          <User size={16} color={getRoleColor(u.role)} />
                        </div>
                      </div>
                      <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={styles.userName}>{u.name}</span>
                        <span style={{ ...styles.roleBadge, backgroundColor: `${getRoleColor(u.role)}15`, color: getRoleColor(u.role) }}>
                          {getRoleDisplayName(u.role)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={styles.noResults}>No registrations today.</div>
                )}
              </div>
            </div>

            {/* Recent Registrations */}
            <div style={{ ...styles.pendingCard, flex: 1 }}>
              <h2 style={{ ...styles.sectionHeader, color: "#000" }}>Recent Registrations</h2>
              <div style={styles.activitiesListScrollable}>
                {users.length > 0 ? (
                  users
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 3)
                    .map((u) => {
                      let statusColor = "#666";
                      switch(u.status.toLowerCase()) {
                        case "approved": statusColor = "#16a34a"; break;
                        case "pending": statusColor = "#f59e0b"; break;
                        case "declined": statusColor = "#dc2626"; break;
                        default: statusColor = "#6b7280";
                      }

                      return (
                        <div key={u.id} style={styles.activityItem}>
                          <div style={styles.activityIcon}>
                            <div style={{ ...styles.iconCircle, backgroundColor: `${getRoleColor(u.role)}15` }}>
                              <User size={16} color={getRoleColor(u.role)} />
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={styles.userName}>{u.name}</span>
                              <span style={{ ...styles.statusBadge, backgroundColor: `${statusColor}20`, color: statusColor }}>
                                {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
                              </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#666", marginTop: "2px" }}>
                              <span>{getRoleDisplayName(u.role)}</span>
                              <span>{u.created_at}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div style={styles.noResults}>No recent registrations.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <FloatingMessages />
    </div>
  );
};

const styles = {
  layout: { display: "flex", minHeight: "100vh", backgroundColor: "#f5f5f5" },
  dashboard: { flex: 1, fontFamily: "'Segoe UI', Tahoma", display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" },
  header: { padding: "20px 30px", backgroundColor: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: "28px", fontWeight: "bold", color: "#D2691E" },
  scrollContent: { flex: 1, padding: "20px", display: "flex", flexDirection: "column", overflow: "hidden", gap: "20px" },
  statsSection: { display: "flex", gap: "20px" },
  statCard: { flex: 1, backgroundColor: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" },
  statContent: { display: "flex", alignItems: "center", gap: "8px" },
  statValue: { fontSize: "28px", fontWeight: "bold", color: "#000", margin: 0 },
  statLabel: { fontSize: "16px", fontWeight: "600", color: "#6b7280", margin: 0 },
  pendingCard: { backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", padding: "20px", display: "flex", flexDirection: "column", gap: "20px", marginBottom: "20px" },
  sectionHeader: { fontSize: "20px", fontWeight: "600", margin: "0 0 10px 0" },
  activitiesListScrollable: { maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" },
  activityItem: { display: "flex", gap: "10px", padding: "10px", borderBottom: "1px solid #eee", alignItems: "center" },
  activityIcon: { display: "flex", alignItems: "center", justifyContent: "center" },
  iconCircle: { width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" },
  userName: { fontWeight: "600" },
  noResults: { padding: "50px 20px", textAlign: "center", color: "#666" },
  todayCountPill: { backgroundColor: "#D2691E", color: "#fff", padding: "2px 10px", borderRadius: "9999px", fontSize: "12px", fontWeight: "600" },
  statusBadge: { backgroundColor: "#f0f0f0", color: "#666", padding: "2px 8px", borderRadius: "9999px", fontSize: "12px", fontWeight: "600" },
  roleBadge: { borderRadius: "9999px", padding: "4px 10px", fontSize: "12px", fontWeight: "500", display: "inline-block", minWidth: "80px", textAlign: "center" },
  notificationBtn: { position: "relative", background: "transparent", border: "none", cursor: "pointer", padding: "8px", borderRadius: "50%" },
  badge: { position: "absolute", top: "2px", right: "2px", backgroundColor: "#ef4444", color: "#fff", borderRadius: "50%", padding: "2px 6px", fontSize: "12px", fontWeight: "bold" },

};

export default KutseroDashboard;
