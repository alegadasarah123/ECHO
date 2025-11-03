"use client"

import {
  BarChart3,
  ClipboardList,
  FileText,
  Folder,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Settings,
  UserCheck,
  X
} from "lucide-react"
import { forwardRef, useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"

const Sidebars = forwardRef((props, ref) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // Get initial state from localStorage or default to false
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed")
    return saved ? JSON.parse(saved) : false
  })

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", JSON.stringify(isSidebarCollapsed))
  }, [isSidebarCollapsed])

  const handleLogout = () => {
    localStorage.clear()
    navigate("/")
  }

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  // This function handles navigation without affecting sidebar state
  const handleNavigation = (path) => {
    navigate(path)
    // Sidebar state remains the same
  }

  const sidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/CtuDashboard" },
    { icon: UserCheck, label: "Account Approval", path: "/CtuAccountApproval" },
    { icon: FileText, label: "Access Requests", path: "/CtuAccessRequest" },
    { icon: ClipboardList, label: "Horse Records", path: "/CtuHorseRecord" },
    { icon: BarChart3, label: "Health Reports", path: "/CtuHealthReport" },
    { icon: Megaphone, label: "Announcements", path: "/CtuAnnouncement" },
    { icon: Folder, label: "Directory", path: "/CtuDirectory" },
    { icon: Settings, label: "Settings", path: "/CtuSettings" },
  ]

  return (
    <>
      <style>{`
        /* Sidebar */
        .sidebar {
          background-color: #FFFFFF;
          color: #362205;
          transition: all 0.3s ease;
          position: relative;
          z-index: 1000;
          height: 100vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 0 60px -15px rgba(0, 0, 0, 0.25);
          overflow: hidden;
        }
        .sidebar-expanded { width: 250px; }
        .sidebar-collapsed { width: 70px; }

        /* Header */
        .sidebar-header {
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #FFFFFF;
          gap: 10px;
        }
        .sidebar-logo-container {
          display: flex;
          align-items: center;
          flex: 1;
          overflow: hidden;
        }
        .sidebar-logo {
          max-width: 160px;
          height: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
        }

        .sidebar-logo-img {
          width: 100%;
          height: auto;
          object-fit: contain;
          filter: contrast(1.3) brightness(1.1);
        }

        .menu-button {
          background: #F0F0F0;
          border: none;
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s ease;
          color: #362205;
        }
        .menu-button:hover {
          background: #F0F0F0;
          color: #b91c1c;
          transform: rotate(90deg);
        }
        .menu-icon {
          width: 20px;
          height: 20px;
        }

        /* Navigation */
        .sidebar-nav {
          flex: 1;
          padding: 24px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .sidebar-nav-item {
          display: flex;
          align-items: center;
          padding: 14px 16px;
          border-radius: 10px;
          transition: all 0.2s ease;
          text-decoration: none;
          color: #362205;
          position: relative;
          overflow: hidden;
          cursor: pointer;
        }
        
        /* Fix for collapsed state */
        .sidebar-collapsed .sidebar-nav-item {
          justify-content: center;
          padding: 14px;
        }
        
        .sidebar-nav-item:before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          width: 4px;
          background: linear-gradient(to bottom, #b91c1c, #991b1b);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .sidebar-nav-item:hover {
          background: #F0F0F0;
          transform: scale(1.02);
        }
        .sidebar-nav-item:hover:before {
          opacity: 1;
        }
        .sidebar-nav-item:hover .sidebar-nav-label,
        .sidebar-nav-item:hover .sidebar-nav-icon {
          color: #b91c1c;
        }
        .sidebar-nav-item-active {
          background-color: #F8F8F8;
          color: #b91c1c;
          font-weight: 600;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
        }
        .sidebar-nav-item-active:before {
          opacity: 1;
          background: #b91c1c;
        }
        .sidebar-nav-item-active .sidebar-nav-icon {
          color: #b91c1c;
        }
        .sidebar-nav-icon {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .sidebar-nav-label {
          margin-left: 14px;
          transition: all 0.3s ease;
          overflow: hidden;
          white-space: nowrap;
          font-size: 14px;
          font-weight: 500;
        }

        /* Hide labels when sidebar is collapsed */
        .sidebar-collapsed .sidebar-nav-label {
          display: none;
        }

        /* Tooltip */
        .sidebar-tooltip {
          visibility: hidden;
          opacity: 0;
          position: absolute;
          left: 100%;
          top: 50%;
          transform: translateY(-50%) translateX(8px);
          background: #362205;
          color: white;
          padding: 8px 14px;
          border-radius: 6px;
          white-space: nowrap;
          transition: all 0.2s ease;
          font-size: 13px;
          z-index: 1000;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          pointer-events: none;
          border: 1px solid rgba(0, 0, 0, 0.3);
        }
        .sidebar-tooltip::before {
          content: '';
          position: absolute;
          right: 100%;
          top: 50%;
          transform: translateY(-50%);
          border-width: 6px;
          border-style: solid;
          border-color: transparent #362205 transparent transparent;
        }
        
        /* Show tooltip only when sidebar is collapsed */
        .sidebar-collapsed .sidebar-nav-item:hover .sidebar-tooltip,
        .sidebar-collapsed .sidebar-logout-button:hover .sidebar-tooltip {
          visibility: visible;
          opacity: 1;
          transform: translateY(-50%) translateX(12px);
        }

        /* Logout */
        .sidebar-logout {
          padding: 20px;
          border-top: 1px solid #E0E0E0;
        }
        .sidebar-logout-button {
          display: flex;
          align-items: center;
          padding: 14px 16px;
          cursor: pointer;
          border-radius: 10px;
          transition: all 0.2s ease;
          color: #362205;
          position: relative;
        }
        
        /* Fix for collapsed logout button */
        .sidebar-collapsed .sidebar-logout-button {
          justify-content: center;
          padding: 14px;
        }
        
        .sidebar-logout-button:hover {
          background: #F0F0F0;
          color: #120A01;
          transform: translateX(4px);
        }

        /* Hide logout text when collapsed */
        .sidebar-collapsed .sidebar-logout-button .sidebar-nav-label {
          display: none;
        }

        /* Hide logo when collapsed */
        .sidebar-collapsed .sidebar-logo {
          display: none;
        }

        /* Modal styles remain the same */
        .logout-modal-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.7);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.2s ease;
          backdrop-filter: blur(4px);
        }
        .logout-modal {
          background-color: #FFFFFF;
          border-radius: 16px;
          padding: 28px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          width: 100%;
          max-width: 420px;
          animation: scaleIn 0.2s ease;
          border: 1px solid #E0E0E0;
        }
        .logout-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .logout-modal-title {
          font-size: 20px;
          font-weight: 600;
          color: #362205;
        }
        .logout-modal-close {
          background: #F0F0F0;
          border: none;
          cursor: pointer;
          padding: 6px;
          border-radius: 8px;
          color: #362205;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .logout-modal-close:hover {
          background: #E0E0E0;
          color: #120A01;
        }
        .logout-modal-text {
          font-size: 15px;
          color: #614624;
          margin-bottom: 28px;
          line-height: 1.6;
        }
        .logout-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 14px;
        }
        .logout-modal-cancel {
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 500;
          color: #362205;
          border-radius: 10px;
          border: 1px solid #D0D0D0;
          background: #E8E8E8;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .logout-modal-cancel:hover {
          background: #D8D8D8;
          color: #120A01;
        }
        .logout-modal-confirm {
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 500;
          color: white;
          background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
          border-radius: 10px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(185, 28, 28, 0.4);
        }
        .logout-modal-confirm:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(185, 28, 28, 0.5);
          background: linear-gradient(135deg, #a4161a 0%, #7f1d1d 100%);
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div ref={ref} className={`sidebar ${isSidebarCollapsed ? "sidebar-collapsed" : "sidebar-expanded"}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo-container">
            <div className="sidebar-logo">
              <img src="/Images/echo.png" alt="ECHO Logo" className="sidebar-logo-img" />
            </div>
          </div>
          <button className="menu-button" onClick={handleToggleSidebar}>
            <Menu className="menu-icon" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {sidebarItems.map(({ icon: Icon, label, path }, index) => {
            const isActive = location.pathname === path
            return (
              <div
                key={index}
                onClick={() => handleNavigation(path)}
                className={`sidebar-nav-item ${isActive ? "sidebar-nav-item-active" : ""}`}
              >
                <Icon className="sidebar-nav-icon" />
                {!isSidebarCollapsed && <span className="sidebar-nav-label">{label}</span>}
                {isSidebarCollapsed && <span className="sidebar-tooltip">{label}</span>}
              </div>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="sidebar-logout">
          <div onClick={() => setShowLogoutModal(true)} className="sidebar-logout-button">
            <LogOut className="sidebar-nav-icon" />
            {!isSidebarCollapsed && <span className="sidebar-nav-label">Log Out</span>}
            {isSidebarCollapsed && <span className="sidebar-tooltip">Log Out</span>}
          </div>
        </div>
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="logout-modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="logout-modal-header">
              <h2 className="logout-modal-title">Confirm Logout</h2>
              <button className="logout-modal-close" onClick={() => setShowLogoutModal(false)}>
                <X size={20} />
              </button>
            </div>
            <p className="logout-modal-text">
              Are you sure you want to log out your account? You'll need to sign in again to access your dashboard.
            </p>
            <div className="logout-modal-actions">
              <button onClick={() => setShowLogoutModal(false)} className="logout-modal-cancel">
                Cancel
              </button>
              <button onClick={handleLogout} className="logout-modal-confirm">
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
})

Sidebars.displayName = "Sidebars"

export default Sidebars