import React, { useEffect } from 'react';
import Sidebar from './KutSidebar';

const Dashboard = () => {
  useEffect(() => {
    const calendarGrid = document.getElementById('calendar-grid');
    const calendarTitle = document.getElementById('calendar-title');
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let currentDate = new Date();

    function generateCalendar(year, month) {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();

      const prevMonth = new Date(year, month, 0);
      const daysInPrevMonth = prevMonth.getDate();

      calendarTitle.textContent = `${monthNames[month]} ${year}`;
      calendarGrid.innerHTML = '';

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

        dayElement.addEventListener('click', function () {
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
    }

    function changeMonth(direction) {
      currentDate.setMonth(currentDate.getMonth() + direction);
      generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
    }

    generateCalendar(currentDate.getFullYear(), currentDate.getMonth());

    const leftBtn = document.getElementById('prev-month');
    const rightBtn = document.getElementById('next-month');
    if (leftBtn && rightBtn) {
      leftBtn.addEventListener('click', () => changeMonth(-1));
      rightBtn.addEventListener('click', () => changeMonth(1));
    }
  }, []);

  return (
    <>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f5f5f5;
          overflow-x: hidden;
        }

        .dashboard-container {
          display: flex;
          min-height: 100vh;
        }

        .main-content {
          flex: 1;
          margin-left: 80px;
          padding: 1rem;
          transition: margin-left 0.3s ease;
        }

        .header {
          background: white;
          padding: 1rem;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          margin-bottom: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-left h1 {
          font-size: 2rem;
          color: #333;
          margin-bottom: 0.5rem;
        }

        .header-left p {
          color: #666;
          font-size: 1rem;
        }

        .notification-btn {
          background: #f8f9fa;
          border: none;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .notification-btn:hover {
          background: #e9ecef;
          transform: scale(1.05);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .stat-card {
          background: white;
          padding: 1rem;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          text-align: center;
          transition: transform 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-5px);
        }

        .stat-number {
          font-size: 2.5rem;
          font-weight: 700;
          color: #D2691E;
          margin-bottom: 0.5rem;
        }

        .stat-label {
          color: #666;
          font-size: 1rem;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 2rem;
        }

        .activity-section {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          max-height: 400px;
          overflow-y: auto;
        }

        .calendar-section {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          max-height: 400px;
          height: auto;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .calendar-header {
          margin-top: 35px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .calendar-nav {
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          color: #666;
          margin: 0 2rem;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1px;
          background: #e9ecef;
          border-radius: 8px;
        }

        .calendar-day {
          background: white;
          padding: 0.5rem;
          text-align: center;
          font-size: 0.9rem;
          color: #333;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .calendar-day:hover {
          background: #f8f9fa;
        }

        .calendar-day.today {
          background: #D2691E;
          color: white;
        }

        .calendar-day.other-month {
          color: #ccc;
        }

        .day-header {
          background: #f8f9fa;
          font-weight: 600;
          color: #666;
        }

        .calendar-day.selected {
          background: #CD853F;
          color: white;
        }

        .activity-item {
          display: flex;
          align-items: center;
          padding: 1rem;
          border-radius: 8px;
          background: #f8f9fa;
          margin-bottom: 1rem;
        }

        .activity-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #D2691E;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          margin-right: 1rem;
        }

        .activity-details {
          flex: 1;
        }

        .activity-name {
          font-weight: 600;
          color: #333;
          margin-bottom: 0.25rem;
        }

        .activity-desc {
          color: #666;
          font-size: 0.9rem;
          margin-bottom: 0.25rem;
        }

        .activity-time {
          color: #999;
          font-size: 0.8rem;
        }

        .activity-status {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .status-approved {
          background: #d4edda;
          color: #155724;
        }

        .status-pending {
          background: #fff3cd;
          color: #856404;
        }

        .status-added {
          background: #cce7ff;
          color: #004085;
        }

        /* Responsive tweaks */
        @media (max-width: 1024px) {
          .content-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .main-content {
            margin-left: 0;
          }

          .header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .notification-btn {
            align-self: flex-end;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .activity-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .activity-status {
            align-self: flex-end;
          }

          .main-content {
            padding: 1rem;
          }
        }
      `}</style>

      <div className="dashboard-container">
        <Sidebar />
        <div className="main-content">
          <div className="header">
            <div className="header-left">
              <h1>Dashboard</h1>
              <p>Welcome to your Kutsero President admin dashboard.</p>
            </div>
            <button className="notification-btn">
              <img src="/Images/notification.png" alt="Notifications" style={{ width: 24, height: 24 }} />
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
              <div className="activity-item">
                <div className="activity-avatar">JD</div>
                <div className="activity-details">
                  <div className="activity-name">John Doe</div>
                  <div className="activity-desc">Account approved</div>
                  <div className="activity-time">May 14, 2025 - 10:23 AM</div>
                </div>
                <div className="activity-status status-approved">Approved</div>
              </div>
            </div>

            <div className="calendar-section">
              <div className="calendar-header">
                <button className="calendar-nav" id="prev-month">‹</button>
                <h3 id="calendar-title">May 2025</h3>
                <button className="calendar-nav" id="next-month">›</button>
              </div>
              <div className="calendar-grid" id="calendar-grid"></div>
            </div>
          </div>
        </div>
        
      </div>

    </>
  );
};

export default Dashboard;
