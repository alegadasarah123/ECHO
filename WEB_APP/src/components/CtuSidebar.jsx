"use client"

import {
    BarChart3,
    ClipboardList,
    FileText,
    Folder,
    Heart,
    LayoutDashboard,
    LogOut,
    Megaphone,
    Menu,
    Settings,
    UserCheck,
} from "lucide-react"
import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"

const Sidebars = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [showLogoutModals, setShowLogoutModals] = useState(false)

  const [isSidebarsCollapsed, setIsSidebarsCollapsed] = useState(false)
  

  const handleLogout = () => {
    localStorage.clear()
    navigate("/")
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
      {/* Internal CSS */}
      <style>{`
        /* Container */
        .sidebars {
          background-image: linear-gradient(to bottom, white, white);
          color: #b91c1c;
          transition: all 0.3s ease;
          position: relative;
          height: 100vh;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1),
                      0 4px 6px -2px rgba(0,0,0,0.05);
        }
        .sidebars-expanded { width: 16rem; }
        .sidebars-collapsed { width: 4rem; }

        /* Header */
        .sidebars-header {
          padding: 1rem;
          border-bottom: 1px solid rgba(185,28,28,0.3); 
        }
        .sidebars-header-content { display: flex; align-items: center; }
        .sidebars-logo {
          width: 2.5rem; height: 2.5rem;
          background-color: rgba(185,28,28,0.1);
          backdrop-filter: blur(4px);
          border-radius: 0.75rem;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1),
                      0 4px 6px -2px rgba(0,0,0,0.05);
        }
        .sidebars-logo-icon { width: 1.5rem; height: 1.5rem; color: #b91c1c; }
        .sidebars-brand { margin-left: 0.75rem; overflow: hidden; transition: all 0.3s ease; white-space: nowrap; }
        .sidebars-brand-title { font-weight: 700; font-size: 1.125rem; display: block; color: #b91c1c; }
        .sidebars-brand-subtitle { font-size: 0.75rem; color: #b91c1c; }

        /* Nav */
        .sidebars-nav { margin-top: 1.5rem; padding: 0 0.5rem; }
        .sidebars-nav-item {
          display: flex; align-items: center;
          padding: 0.75rem; margin-bottom: 0.25rem;
          border-radius: 0.5rem; transition: all 0.2s ease;
          text-decoration: none; color: #b91c1c;
        }
        .sidebars-nav-item:hover { background-color: rgba(185,28,28,0.1); }
        .sidebars-nav-item-active {
          background-color: rgba(185,28,28,0.2);
          backdrop-filter: blur(4px);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1),
                      0 4px 6px -2px rgba(0,0,0,0.05);
          border-right: 4px solid #b91c1c;
        }
        .sidebars-nav-icon { width: 1.25rem; height: 1.25rem; flex-shrink: 0; color: #b91c1c; }
        .sidebars-nav-label { margin-left: 0.75rem; transition: all 0.3s ease; overflow: hidden; white-space: nowrap; color: #b91c1c; }

        /* Logout */
        .sidebars-logout { position: absolute; bottom: 1rem; left: 0; right: 0; padding: 0 1rem; }
        .sidebars-logout-button {
          display: flex; align-items: center;
          padding: 0.75rem; cursor: pointer;
          border-radius: 0.5rem; transition: all 0.2s ease;
          color: #b91c1c;
        }
        .sidebars-logout-button:hover { background-color: rgba(185,28,28,0.1); }

        /* Modal */
        .logout-modal-overlay {
          position: fixed; inset: 0;
          background-color: rgba(0,0,0,0.4);
          z-index: 9999; display: flex; align-items: center; justify-content: center;
        }
        .logout-modal {
          background-color: #ffffff;
          border-radius: 0.75rem;
          padding: 1.5rem;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
          width: 100%; max-width: 24rem;
        }
        .logout-modal-title { font-size: 1.125rem; font-weight: 600; color: #b91c1c; margin-bottom: 1rem; }
        .logout-modal-text { font-size: 0.875rem; color: #b91c1c; margin-bottom: 1.5rem; }
        .logout-modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; }
        .logout-modal-cancel {
          padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500;
          color: #b91c1c; border-radius: 0.5rem; border: none; background: none;
          cursor: pointer; transition: background-color 0.2s ease;
        }
        .logout-modal-cancel:hover { background-color: #f3f4f6; }
        .logout-modal-confirm {
          padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500;
          color: #fff; background-color: #b91c1c;
          border-radius: 0.5rem; border: none; cursor: pointer; transition: background-color 0.2s ease;
        }
        .logout-modal-confirm:hover { background-color: #991b1b; }

        .menu-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .menu-icon {
          width: 1.5rem;
          height: 1.5rem;
          color: #b91c1c;
        }
        .menu-button-right {
          margin-left: auto;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .sidebars-collapsed { width: 3rem; }
          .sidebars-expanded { width: 14rem; }
          .logout-modal { margin: 1rem; max-width: calc(100% - 2rem); }
        }
        @media (max-width: 480px) {
          .sidebars-collapsed { width: 2.5rem; }
          .sidebars-nav-item { padding: 0.5rem; }
          .sidebars-logout-button { padding: 0.5rem; }
        }
      `}</style>

      <div className={`sidebars ${isSidebarsCollapsed ? "sidebars-collapsed" : "sidebars-expanded"}`}>
        {/* Header */}
        <div className="sidebars-header">
          <div className="sidebars-header-content">
            {isSidebarsCollapsed ? (
              <button className="menu-button" onClick={() => setIsSidebarsCollapsed(false)}>
                <Menu className="menu-icon" />
              </button>
            ) : (
              <>
                <div className="sidebars-logo">
                  <Heart className="sidebars-logo-icon" />
                </div>
                <div className="sidebars-brand">
                  <span className="sidebars-brand-title">ECHO</span>
                  <p className="sidebars-brand-subtitle">Ctu-VetMed</p>
                </div>
                <button className="menu-button menu-button-right" onClick={() => setIsSidebarsCollapsed(true)}>
                  <Menu className="menu-icon" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebars-nav">
          {sidebarItems.map(({ icon: Icon, label, path }, index) => {
            const isActive = location.pathname === path
            return (
              <Link key={index} to={path} className={`sidebars-nav-item ${isActive ? "sidebars-nav-item-active" : ""}`}>
                <Icon className="sidebars-nav-icon" />
                {!isSidebarsCollapsed && <span className="sidebars-nav-label">{label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="sidebars-logout">
          <div onClick={() => setShowLogoutModals(true)} className="sidebars-logout-button">
            <LogOut className="sidebars-nav-icon" />
            {!isSidebarsCollapsed && <span className="sidebars-nav-label">Log Out</span>}
          </div>
        </div>
      </div>

      {/* Logout Modal */}
      {showLogoutModals && (
        <div className="logout-modal-overlay">
          <div className="logout-modal">
            <h2 className="logout-modal-title">Confirm Logout</h2>
            <p className="logout-modal-text">Are you sure you want to log out of your account?</p>
            <div className="logout-modal-actions">
              <button onClick={() => setShowLogoutModals(false)} className="logout-modal-cancel">
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
}

export default Sidebars
