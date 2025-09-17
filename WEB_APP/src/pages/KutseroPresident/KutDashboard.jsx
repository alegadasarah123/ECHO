import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";   
import { Users, Users2, UserPlus, User, Bell, XCircle, CheckCircle, AlertCircle } from 'lucide-react';
import Sidebar from '@/components/KutSidebar';
import FloatingMessages from './KutMessages';
import NotificationModal from './KutNotif';

const API_BASE = "http://localhost:8000/api/kutsero_president";

const KutseroDashboard = () => {
  const navigate = useNavigate(); 
  const [authorized, setAuthorized] = useState(false);
  const [users, setUsers] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCounts, setApprovedCounts] = useState({
    approved_kutsero_count: 0,
    approved_horse_operator_count: 0,
  });
  const [notifOpen, setNotifOpen] = useState(false);
  
  const pendingUsers = users.filter(u => u.status === "pending");
  const declinedUsers = users.filter(u => u.status === "declined");
  
  // Authentication verification
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_BASE}/test_cookie/`, {
          credentials: "include", 
        });
        const data = await res.json();
        if (!data.token_present) {
          navigate("/login");
        } else {
          setAuthorized(true);
        }
      } catch (err) {
        console.error("Authentication verification failed:", err);
        navigate("/login");
      }
    };
    checkAuth();
  }, []);

  // Data fetching
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
        console.error("Error fetching users:", err);
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
        console.error("Error fetching approved counts:", err);
      }
    };

    if (authorized) {
      fetchUsers();
      fetchApprovedCounts();
    }
  }, [authorized]);

  // Helper functions
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
        {/* Header Section */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>Dashboard</h1>
            <p style={styles.subtitle}>Monitor and manage user registrations</p>
          </div>

          {/* Notification Bell */}
          <div style={{ position: "relative" }}>
            <button
              style={styles.notificationBtn}
              onClick={() => setNotifOpen(!notifOpen)}
              aria-label="Notifications"
            >
              <Bell size={24} color="#4B5563" />
              {pendingUsers.length > 0 && (
                <span style={styles.badge}>{pendingUsers.length}</span>
              )}
            </button>

            <NotificationModal
              isOpen={notifOpen}
              onClose={() => setNotifOpen(false)}
              notifications={pendingUsers.map(u => ({
                message: `${u.name} (${getRoleDisplayName(u.role)}) is pending approval`,
                date: u.created_at !== "N/A" ? new Date(u.created_at) : new Date()
              }))}
            />
          </div>
        </div>

        {/* Main Content */}
        <div style={styles.mainContent}>
          {/* Statistics Cards */}
          <div style={styles.statsSection}>
            <div style={styles.statCard}>
              <div style={styles.statIconContainer}>
                <Users size={28} color="#16a34a" />
              </div>
              <div style={styles.statContent}>
                <p style={styles.statValue}>
                  {approvedCounts.approved_kutsero_count + approvedCounts.approved_horse_operator_count}
                </p>
                <h3 style={styles.statLabel}>Total Approved Users</h3>
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statIconContainer}>
                <Users2 size={28} color="#3b82f6" />
              </div>
              <div style={styles.statContent}>
                <p style={styles.statValue}>{pendingCount}</p> 
                <h3 style={styles.statLabel}>Pending Verifications</h3>
              </div>
            </div>
            
            <div style={styles.statCard}>
              <div style={styles.statIconContainer}>
                <XCircle size={28} color="#dc2626" />
              </div>
              <div style={styles.statContent}>
                <p style={styles.statValue}>{declinedUsers.length}</p> 
                <h3 style={styles.statLabel}>Declined Users</h3>
              </div>
            </div>
          </div>

          {/* Data Sections */}
          <div style={styles.contentGrid}>
            {/* Today's Registrations */}
            <div style={styles.contentCard}>
              <div style={styles.cardHeader}>
                <div style={styles.cardTitleContainer}>
                  <UserPlus size={24} color="#4B5563" />
                  <h2 style={styles.cardTitle}>Today's Registrations</h2>
                </div>
                <span style={styles.todayCountPill}>{todayRegistrations.length} today</span>
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
                      <div style={styles.activityDetails}>
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
            <div style={styles.contentCard}>
              <div style={styles.cardHeader}>
                <div style={styles.cardTitleContainer}>
                  <AlertCircle size={24} color="#4B5563" />
                  <h2 style={styles.cardTitle}>Recent Registrations</h2>
                </div>
              </div>
              <div style={styles.activitiesListScrollable}>
                {users.length > 0 ? (
                  users
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 5)
                    .map((u) => {
                      let statusColor = "#666";
                      let StatusIcon = AlertCircle;
                      switch(u.status.toLowerCase()) {
                        case "approved": 
                          statusColor = "#16a34a"; 
                          StatusIcon = CheckCircle;
                          break;
                        case "pending": 
                          statusColor = "#f59e0b"; 
                          StatusIcon = AlertCircle;
                          break;
                        case "declined": 
                          statusColor = "#dc2626"; 
                          StatusIcon = XCircle;
                          break;
                        default: 
                          statusColor = "#6b7280";
                          StatusIcon = AlertCircle;
                      }

                      return (
                        <div key={u.id} style={styles.activityItem}>
                          <div style={styles.activityIcon}>
                            <div style={{ ...styles.iconCircle, backgroundColor: `${getRoleColor(u.role)}15` }}>
                              <User size={16} color={getRoleColor(u.role)} />
                            </div>
                          </div>
                          <div style={styles.activityDetailsFull}>
                            <div style={styles.activityRow}>
                              <span style={styles.userName}>{u.name}</span>
                              <span style={{ ...styles.statusBadge, backgroundColor: `${statusColor}20`, color: statusColor }}>
                                <StatusIcon size={12} style={{ marginRight: "4px" }} />
                                {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
                              </span>
                            </div>
                            <div style={styles.activityMeta}>
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

// Styles (loading styles removed)
const styles = {
  layout: { display: "flex", minHeight: "100vh", backgroundColor: "#f5f5f5"},
  dashboard: { flex: 1, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" },
  header: { padding: "16px 32px", backgroundColor: "#fff", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)", borderBottom: "1px solid #eaeaea", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#ffffff", flexShrink: 0 },
  headerContent: { display: "flex", flexDirection: "column", gap: "4px" },
  title: { fontSize: "24px", fontWeight: "600", color: "#D2691E", margin: 0 },
  subtitle: { fontSize: "14px", color: "#666", margin: 0, fontWeight: "400" },
  mainContent: { flex: 1, padding: "24px 32px", display: "flex", flexDirection: "column", gap: "24px", backgroundColor: "#fafafa", overflow: "hidden" },
  statsSection: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", flexShrink: 0 },
  statCard: { backgroundColor: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)", border: "1px solid #eaeaea", display: "flex", alignItems: "center", gap: "16px", transition: "all 0.2s ease" },
  statIconContainer: { display: "flex", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", borderRadius: "8px", backgroundColor: "#f8f9fa" },
  statContent: { display: "flex", flexDirection: "column", gap: "4px" },
  statValue: { fontSize: "28px", fontWeight: "700", color: "#1a1a1a", margin: 0 },
  statLabel: { fontSize: "14px", fontWeight: "500", color: "#666", margin: 0 },
  contentGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "20px", flex: 1, overflow: "hidden" },
  contentCard: { backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)", border: "1px solid #eaeaea", padding: "20px", display: "flex", flexDirection: "column", gap: "16px", overflow: "hidden" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", paddingBottom: "12px", borderBottom: "1px solid #f0f0f0", flexShrink: 0 },
  cardTitleContainer: { display: "flex", alignItems: "center", gap: "10px" },
  cardTitle: { fontSize: "16px", fontWeight: "600", color: "#1a1a1a", margin: 0 },
  activitiesListScrollable: { flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", paddingRight: "4px", scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 #f1f5f9" },
  activityItem: { display: "flex", gap: "12px", padding: "12px", border: "1px solid #f0f0f0", borderRadius: "8px", alignItems: "center", backgroundColor: "#fafafa", flexShrink: 0 },
  activityIcon: { display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  iconCircle: { width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" },
  activityDetails: { flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" },
  activityDetailsFull: { flex: 1, display: "flex", flexDirection: "column", gap: "4px" },
  activityRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  activityMeta: { display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#888" },
  userName: { fontWeight: "500", color: "#1a1a1a" },
  noResults: { padding: "32px 16px", textAlign: "center", color: "#999", fontStyle: "italic", fontSize: "14px", flexShrink: 0 },
  todayCountPill: { backgroundColor: "#e53e3e", color: "#fff", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "500" },
  statusBadge: { padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "500", display: "flex", alignItems: "center", gap: "4px" },
  roleBadge: { borderRadius: "6px", padding: "4px 8px", fontSize: "11px", fontWeight: "500", display: "inline-block" },
  notificationBtn: { background: "none", border: "none", cursor: "pointer", padding: "8px", borderRadius: "50%", position: "relative", transition: "background-color 0.2s ease" },
  badge: { position: "absolute", top: "-4px", right: "-4px", backgroundColor: "#ef4444", color: "white", borderRadius: "50%", width: "18px", height: "18px", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }
};

export default KutseroDashboard;
