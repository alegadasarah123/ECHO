import React, { useEffect } from 'react';

const Dashboard = () => {
  useEffect(() => {
    generateCalendar(new Date().getFullYear(), new Date().getMonth());
  }, []);

  const changeMonth = (direction) => {
    const currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth() + direction);
    generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
  };

  const generateCalendar = (year, month) => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    const calendarGrid = document.getElementById('calendar-grid');
    const calendarTitle = document.getElementById('calendar-title');

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();

    calendarTitle.textContent = `${monthNames[month]} ${year}`;
    calendarGrid.innerHTML = '';

    // Headers
    dayNames.forEach(day => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'calendar-day day-header';
      dayHeader.textContent = day;
      calendarGrid.appendChild(dayHeader);
    });

    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayElement = document.createElement('div');
      dayElement.className = 'calendar-day other-month';
      dayElement.textContent = daysInPrevMonth - i;
      calendarGrid.appendChild(dayElement);
    }

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayElement = document.createElement('div');
      dayElement.className = 'calendar-day';
      dayElement.textContent = day;
      if (isCurrentMonth && day === today.getDate()) {
        dayElement.classList.add('today');
      }
      dayElement.addEventListener('click', () => {
        document.querySelectorAll('.calendar-day.selected').forEach(el => {
          el.classList.remove('selected');
        });
        if (!dayElement.classList.contains('other-month')) {
          dayElement.classList.add('selected');
        }
      });
      calendarGrid.appendChild(dayElement);
    }

    const totalCells = calendarGrid.children.length;
    const remainingCells = 42 - totalCells + 7;
    for (let day = 1; day <= remainingCells && totalCells < 49; day++) {
      const dayElement = document.createElement('div');
      dayElement.className = 'calendar-day other-month';
      dayElement.textContent = day;
      calendarGrid.appendChild(dayElement);
    }
  };

  return (
    <div>
      <style>{/* paste your full <style> CSS block here */}</style>

      <div className="dashboard-container">
        <button className="menu-toggle" onClick={() => {
          const sidebar = document.getElementById('sidebar');
          sidebar?.classList.toggle('mobile-open');
        }}>
          ☰
        </button>

        <div id="sidebar-placeholder">
          {/* Optional: You can create a Sidebar.jsx and import it here */}
        </div>

        <div className="main-content">
          <div className="header">
            <div className="header-left">
              <h1>Dashboard</h1>
              <p>Welcome to your Kutsero President admin dashboard.</p>
            </div>
            <button className="notification-btn">
              <img src="/images/notification.png" alt="Notifications" style={{ width: 24, height: 24 }} />
            </button>
          </div>

          <div className="stats-grid">
            <div className="stat-card"><div className="stat-number">120</div><div className="stat-label">Total Users</div></div>
            <div className="stat-card"><div className="stat-number">10</div><div className="stat-label">Pending Verifications</div></div>
            <div className="stat-card"><div className="stat-number">12</div><div className="stat-label">Unread Messages</div></div>
            <div className="stat-card"><div className="stat-number">120</div><div className="stat-label">New Notifications</div></div>
          </div>

          <div className="content-grid">
            <div className="activity-section">
              <h2 className="section-title">Recent Activity</h2>
              <div className="activity-item"><div className="activity-avatar">JD</div><div className="activity-details"><div className="activity-name">John Doe</div><div className="activity-desc">Account approved</div><div className="activity-time">May 14, 2025 - 10:23 AM</div></div><div className="activity-status status-approved">Approved</div></div>
              <div className="activity-item"><div className="activity-avatar">SJ</div><div className="activity-details"><div className="activity-name">Sarah Johnson</div><div className="activity-desc">Account pending approval</div><div className="activity-time">May 14, 2025 - 09:47 AM</div></div><div className="activity-status status-pending">Pending</div></div>
              <div className="activity-item"><div className="activity-avatar">MR</div><div className="activity-details"><div className="activity-name">Michael Rodriguez</div><div className="activity-desc">New account added</div><div className="activity-time">May 14, 2025 - 03:17 PM</div></div><div className="activity-status status-added">Added</div></div>
              <div className="activity-item"><div className="activity-avatar">EC</div><div className="activity-details"><div className="activity-name">Emily Chen</div><div className="activity-desc">Account pending approval</div><div className="activity-time">May 15, 2025 - 11:25 AM</div></div><div className="activity-status status-pending">Pending</div></div>
            </div>

            <div className="calendar-section">
              <div className="calendar-header">
                <button className="calendar-nav" onClick={() => changeMonth(-1)}>‹</button>
                <h3 id="calendar-title">Loading...</h3>
                <button className="calendar-nav" onClick={() => changeMonth(1)}>›</button>
              </div>
              <div className="calendar-grid" id="calendar-grid"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
