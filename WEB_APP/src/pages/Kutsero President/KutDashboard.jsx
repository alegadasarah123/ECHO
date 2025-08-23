import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare, Users, Clock, Search, Filter } from 'lucide-react';
import Sidebar from '@/components/KutSidebar';

const KutseroDashboard = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [users, setUsers] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState(0); // ✅ dynamic
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [hoveredIcon, setHoveredIcon] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);

  // Fetch users from Django API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/kutsero_president/get_users/"); 
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();

        // ✅ backend returns { users: [...], pending_count: N }
        setUsers(data.users || []);
        setPendingVerifications(data.pending_count || 0);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };

    fetchUsers();
  }, []);

  const notifications = 5;
  const messages = 12;
  const totalUsers = users.length;

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      (user.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.contact_num || "").includes(searchTerm);

    const matchesRole = filterRole === 'All' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const getCardStyle = (cardType) => ({
    ...styles.statCard,
    transform: hoveredCard === cardType ? 'translateY(-2px)' : 'translateY(0)',
    boxShadow: hoveredCard === cardType
      ? '0 4px 20px rgba(0,0,0,0.15)'
      : '0 2px 10px rgba(0,0,0,0.1)'
  });

  const getRowStyle = (index, rowId) => ({
    ...styles.tableRow,
    backgroundColor: hoveredRow === rowId ? '#f0f8ff' :
      (index % 2 === 0 ? '#fff' : '#f9f9f9')
  });

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <Sidebar
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
      />

      {/* Dashboard Content */}
      <div
        style={{
          ...styles.dashboard,
          marginLeft: isSidebarCollapsed ? '80px' : '0px',
          transition: 'margin-left 0.3s ease'
        }}
      >
        {/* Sticky Header */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <h1 style={styles.title}>Kutsero Dashboard</h1>
            <p style={styles.subtitle}>President Panel</p>
          </div>

          <div style={styles.headerRight}>
            <div
              style={styles.iconContainer}
              onMouseEnter={() => setHoveredIcon('notifications')}
              onMouseLeave={() => setHoveredIcon(null)}
            >
              <Bell style={{ ...styles.icon, color: hoveredIcon === 'notifications' ? '#D2691E' : '#666' }} />
              {notifications > 0 && <span style={styles.badge}>{notifications}</span>}
            </div>

            <div
              style={styles.iconContainer}
              onMouseEnter={() => setHoveredIcon('messages')}
              onMouseLeave={() => setHoveredIcon(null)}
            >
              <MessageSquare style={{ ...styles.icon, color: hoveredIcon === 'messages' ? '#D2691E' : '#666' }} />
              {messages > 0 && <span style={styles.badge}>{messages}</span>}
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div style={styles.scrollContent}>
          {/* Stats Section */}
          <section style={styles.statsSection}>
            <div
              style={getCardStyle('users')}
              onMouseEnter={() => setHoveredCard('users')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div style={styles.statIcon}><Users size={24} color="#D2691E" /></div>
              <div style={styles.statInfo}>
                <h3 style={styles.statNumber}>{totalUsers}</h3>
                <p style={styles.statLabel}>Total Users</p>
              </div>
            </div>

            <div
              style={getCardStyle('pending')}
              onMouseEnter={() => setHoveredCard('pending')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div style={styles.statIcon}><Clock size={24} color="#D2691E" /></div>
              <div style={styles.statInfo}>
                <h3 style={styles.statNumber}>{pendingVerifications}</h3>
                <p style={styles.statLabel}>Pending Verifications</p>
              </div>
            </div>
          </section>

          {/* Controls Section */}
          <section style={styles.controlsSection}>
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
          </section>

          {/* Table Section */}
          <section style={styles.tableSection}>
            <div style={styles.tableHeader}>
              <h2 style={styles.tableTitle}>Users Management</h2>
              <p style={styles.tableSubtitle}>
                Showing {filteredUsers.length} of {totalUsers} users
              </p>
            </div>

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
                    >
                      <td style={styles.tableCell}>
                        <div style={styles.nameCell}>
                          <div style={styles.avatar}>
                            {user.name
                              ? user.name.split(' ').map(n => n[0]).join('')
                              : "?"}
                          </div>
                          <span style={styles.userName}>{user.name || "N/A"}</span>
                        </div>
                      </td>
                      <td style={styles.tableCell}>{user.email}</td>
                      <td style={styles.tableCell}>{user.contact_num || "N/A"}</td>
                      <td style={styles.tableCell}>
                        <span style={{
                          ...styles.roleBadge,
                          backgroundColor: user.role === 'kutsero' ? '#D2691E' : '#2563eb',
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
    </div>
  );
};


const styles = {
  layout: { display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f5' },
  dashboard: {flex: 1,fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",display: 'flex',flexDirection: 'column',height: '100vh',},
  header: {flexShrink: 0,display: 'flex',justifyContent: 'space-between',alignItems: 'center',backgroundColor: '#fff',padding: '20px 30px',borderBottom: '1px solid #eee',boxShadow: '0 2px 10px rgba(0,0,0,0.1)',position: 'sticky',top: 0,zIndex: 10,},
  scrollContent: {flex: 1,overflowY: 'auto',padding: '20px',},
  headerLeft: { display: 'flex', flexDirection: 'column' },
  title: { fontSize: '28px', fontWeight: 'bold', color: '#D2691E', margin: 0 },
  subtitle: { fontSize: '14px', color: '#666', margin: '5px 0 0 0' },
  headerRight: { display: 'flex', gap: '20px' },
  iconContainer: { position: 'relative', cursor: 'pointer', padding: '10px', borderRadius: '8px' },
  icon: { transition: 'color 0.2s ease' },
  badge: {
    position: 'absolute', top: '5px', right: '5px',
    backgroundColor: '#ef4444', color: 'white',
    fontSize: '12px', padding: '2px 6px', borderRadius: '10px'
  },
  statsSection: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' },
  statCard: { backgroundColor: '#fff', padding: '25px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '20px' },
  statIcon: { backgroundColor: '#f0f8ff', padding: '15px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statInfo: { flex: 1 },
  statNumber: { fontSize: '32px', fontWeight: 'bold', margin: 0 },
  statLabel: { fontSize: '14px', color: '#666' },
  controlsSection: { display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' },
  searchContainer: { position: 'relative', flex: 1, minWidth: '300px' },
  searchIcon: { position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' },
  searchInput: { width: '100%', padding: '12px 15px 12px 45px', borderRadius: '8px', border: '1px solid #ddd' },
  filterContainer: { position: 'relative', minWidth: '150px' },
  filterIcon: { position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)'},
  filterSelect: { backgroundColor: 'white', width: '100%', padding: '12px 15px 12px 45px', borderRadius: '8px', border: '1px solid #ddd',  cursor: 'pointer'},
  tableSection: { backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', overflow: 'hidden' },
  tableHeader: { padding: '25px 30px', borderBottom: '1px solid #eee' },
  tableTitle: { fontSize: '20px', fontWeight: 'bold' },
  tableSubtitle: { fontSize: '14px', color: '#666' },
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHeaderRow: { backgroundColor: '#f8f9fa' },
  tableHeaderCell: { padding: '15px 20px', fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #eee', verticalAlign: 'middle', textAlign: 'center' },
  tableRow: { transition: 'background-color 0.2s ease' },
  tableCell: { padding: '15px 20px', borderBottom: '1px solid #eee', verticalAlign: 'middle', textAlign: 'center'    },
  nameCell: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#D2691E', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  userName: { fontWeight: '500' },
  roleBadge: { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', color: 'white' },
  noResults: { padding: '50px 20px', textAlign: 'center', color: '#666' },
};

export default KutseroDashboard;
