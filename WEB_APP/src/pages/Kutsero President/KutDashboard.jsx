"use client"

import { useState } from "react"
import { Menu } from "lucide-react"
import Sidebar from "@/components/KutSidebar"
import "./css/dashboard.css"

const Dashboard = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  // Sample users data (replace with backend data later)
  const users = [
    { id: 1, name: "John Doe", email: "johndoe@email.com", role: "12/1/21", status: "Approved" },
    { id: 2, name: "Jane Smith", email: "janesmith@email.com", role: "21/31/2", status: "Pending" },
    { id: 3, name: "Michael Reyes", email: "mreyes@email.com", role: "2/12/2", status: "Approved" },
    { id: 4, name: "Sarah Cruz", email: "sarahcruz@email.com", role: "1/21/2", status: "Suspended" },
  ]

  return (
    <div className="dashboard-container">
      <Sidebar
        isSidebarCollapsed={isSidebarCollapsed}
        isHovering={isHovering}
        setIsHovering={setIsHovering}
      />

      <div className={`main-content ${isSidebarCollapsed ? "collapsed" : ""}`}>
        {/* Header */}
        <div className="header">
          <div style={{ display: "flex", alignItems: "center" }}>
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="menu-btn"
            >
              <Menu className="menu-icon" />
            </button>
            <div className="header-left">
              <h1>Dashboard</h1>
              <p>Welcome to your Kutsero President admin dashboard.</p>
            </div>
          </div>
          <button className="notification-btn">
            <img
              src="/Images/notification.png"
              alt="Notifications"
              style={{ width: 24, height: 24 }}
            />
          </button>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">120</div>
            <div className="stat-label">Total Users</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">10</div>
            <div className="stat-label">Pending Verifications</div>
          </div>
        </div>

        {/* All Users Table */}
        <div className="content-grid">
        <div className="users-section">
          <h2 className="section-title">All Users</h2>
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Joined Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>
                      <span className={`status-badge status-${user.status.toLowerCase()}`}>
                        {user.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      </div>
    </div>
  )
}

export default Dashboard
