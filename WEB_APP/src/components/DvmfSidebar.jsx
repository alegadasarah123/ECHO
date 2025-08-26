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

const DvmfSidebars = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [showLogoutModals, setShowLogoutModals] = useState(false)

  const [isDvmfSidebarsCollapsed, setIsDvmfSidebarsCollapsed] = useState(false)

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
        .Dvmfsidebars {
          background-image: linear-gradient(to bottom, white, white);
          color: #0F3D5A;
          transition: all 0.3s ease;
          position: relative;
          height: 100vh;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1),
                      0 4px 6px -2px rgba(0,0,0,0.05);
        }
        .Dvmfsidebars-expanded { width: 16rem; }
        .Dvmfsidebars-collapsed { width: 4rem; }

        /* Header */
        .Dvmfsidebars-header {
          padding: 1rem;
          border-bottom: 1px solid rgba(15,61,90,0.3); 
        }
        .Dvmfsidebars-header-content { display: flex; align-items: center; }
        .Dvmfsidebars-logo {
          width: 2.5rem; height: 2.5rem;
          background-color: rgba(15,61,90,0.1);
          backdrop-filter: blur(4px);
          border-radius: 0.75rem;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1),
                      0 4px 6px -2px rgba(0,0,0,0.05);
        }
        .Dvmfsidebars-logo-icon { width: 1.5rem; height: 1.5rem; color: #0F3D5A; }
        .Dvmfsidebars-brand { margin-left: 0.75rem; overflow: hidden; transition: all 0.3s ease; white-space: nowrap; }
        .Dvmfsidebars-brand-title { font-weight: 700; font-size: 1.125rem; display: block; color: #0F3D5A; }
        .Dvmfsidebars-brand-subtitle { font-size: 0.75rem; color: #0F3D5A; }

        /* Nav */
        .Dvmfsidebars-nav { margin-top: 1.5rem; padding: 0 0.5rem; }
        .Dvmfsidebars-nav-item {
          display: flex; align-items: center;
          padding: 0.75rem; margin-bottom: 0.25rem;
          border-radius: 0.5rem; transition: all 0.2s ease;
          text-decoration: none; color: #0F3D5A;
        }
        .Dvmfsidebars-nav-item:hover { background-color: rgba(15,61,90,0.1); }
        .Dvmfsidebars-nav-item-active {
          background-color: rgba(15,61,90,0.2);
          backdrop-filter: blur(4px);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1),
                      0 4px 6px -2px rgba(0,0,0,0.05);
          border-right: 4px solid #0F3D5A;
        }
        .Dvmfsidebars-nav-icon { width: 1.25rem; height: 1.25rem; flex-shrink: 0; color: #0F3D5A; }
        .Dvmfsidebars-nav-label { margin-left: 0.75rem; transition: all 0.3s ease; overflow: hidden; white-space: nowrap; color: #0F3D5A; }

        /* Logout */
        .Dvmfsidebars-logout { position: absolute; bottom: 1rem; left: 0; right: 0; padding: 0 1rem; }
        .Dvmfsidebars-logout-button {
          display: flex; align-items: center;
          padding: 0.75rem; cursor: pointer;
          border-radius: 0.5rem; transition: all 0.2s ease;
          color: #0F3D5A;
        }
        .Dvmfsidebars-logout-button:hover { background-color: rgba(15,61,90,0.1); }

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
        .logout-modal-title { font-size: 1.125rem; font-weight: 600; color: #0F3D5A; margin-bottom: 1rem; }
        .logout-modal-text { font-size: 0.875rem; color: #0F3D5A; margin-bottom: 1.5rem; }
        .logout-modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; }
        .logout-modal-cancel {
          padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500;
          color: #0F3D5A; border-radius: 0.5rem; border: none; background: none;
          cursor: pointer; transition: background-color 0.2s ease;
        }
        .logout-modal-cancel:hover { background-color: #f3f4f6; }
        .logout-modal-confirm {
          padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500;
          color: #fff; background-color: #0F3D5A;
          border-radius: 0.5rem; border: none; cursor: pointer; transition: background-color 0.2s ease;
        }
        .logout-modal-confirm:hover { background-color: #0a2d42; }

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
          color: #0F3D5A;
        }
        .menu-button-right {
          margin-left: auto;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .Dvmfsidebars-collapsed { width: 3rem; }
          .Dvmfsidebars-expanded { width: 14rem; }
          .logout-modal { margin: 1rem; max-width: calc(100% - 2rem); }
        }
        @media (max-width: 480px) {
          .Dvmfsidebars-collapsed { width: 2.5rem; }
          .Dvmfsidebars-nav-item { padding: 0.5rem; }
          .Dvmfsidebars-logout-button { padding: 0.5rem; }
        }
      `}</style>

      <div className={`Dvmfsidebars ${isDvmfSidebarsCollapsed ? "Dvmfsidebars-collapsed" : "Dvmfsidebars-expanded"}`}>
        {/* Header */}
        <div className="Dvmfsidebars-header">
          <div className="Dvmfsidebars-header-content">
            {isDvmfSidebarsCollapsed ? (
              <button className="menu-button" onClick={() => setIsDvmfSidebarsCollapsed(false)}>
                <Menu className="menu-icon" />
              </button>
            ) : (
              <>
                <div className="Dvmfsidebars-logo">
                  <Heart className="Dvmfsidebars-logo-icon" />
                </div>
                <div className="Dvmfsidebars-brand">
                  <span className="Dvmfsidebars-brand-title">ECHO</span>
                  <p className="Dvmfsidebars-brand-subtitle">Ctu-VetMed</p>
                </div>
                <button className="menu-button menu-button-right" onClick={() => setIsDvmfSidebarsCollapsed(true)}>
                  <Menu className="menu-icon" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="Dvmfsidebars-nav">
          {sidebarItems.map(({ icon: Icon, label, path }, index) => {
            const isActive = location.pathname === path
            return (
              <Link key={index} to={path} className={`Dvmfsidebars-nav-item ${isActive ? "Dvmfsidebars-nav-item-active" : ""}`}>
                <Icon className="Dvmfsidebars-nav-icon" />
                {!isDvmfSidebarsCollapsed && <span className="Dvmfsidebars-nav-label">{label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="Dvmfsidebars-logout">
          <div onClick={() => setShowLogoutModals(true)} className="Dvmfsidebars-logout-button">
            <LogOut className="Dvmfsidebars-nav-icon" />
            {!isDvmfSidebarsCollapsed && <span className="Dvmfsidebars-nav-label">Log Out</span>}
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

export default DvmfSidebars
