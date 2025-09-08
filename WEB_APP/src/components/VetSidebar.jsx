import React, { useState } from 'react';
import { 
  BarChart3, Calendar, FileText, Heart, Clipboard, 
  HeartPulseIcon, Settings, Menu, LogOut 
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const sidebarItems = [
    { icon: BarChart3, label: 'Dashboard', path: '/VetDashboard' },
    { icon: Clipboard, label: 'Appointment Requests', path: '/VetAppointmentRequests' },
    { icon: Calendar, label: 'Upcoming Appointments', path: '/VetAppointments' },
    { icon: FileText, label: 'Medical Access', path: '/VetRequest' },
    { icon: HeartPulseIcon, label: 'Health Logs', path: '/VetHealthLog' },
    { icon: Settings, label: 'Settings', path: '/VetSettings' },
  ];

  return (
    <>
      {/* Internal CSS */}
      <style>{`
        /* Container */
        .sidebar {
          background-image: linear-gradient(to bottom, #16a34a, #15803d);
          color: #ffffff;
          transition: all 0.3s ease;
          position: relative;
          height: 100vh;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1),
                      0 4px 6px -2px rgba(0,0,0,0.05);
          display: flex;
          flex-direction: column;
        }
        .sidebar-expanded { width: 16rem; }
        .sidebar-collapsed { width: 4rem; }

        /* Header */
        .sidebar-header {
          padding: 1rem;
        }
        .sidebar-header-content { display: flex; align-items: center; }
        .sidebar-logo {
          width: 2.5rem; height: 2.5rem;
          background-color: rgba(255,255,255,0.1);
          backdrop-filter: blur(4px);
          border-radius: 0.75rem;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1),
                      0 4px 6px -2px rgba(0,0,0,0.05);
        }
        .sidebar-logo-icon { width: 1.5rem; height: 1.5rem; color: #ffffff; }
        .sidebar-brand { margin-left: 0.75rem; overflow: hidden; transition: all 0.3s ease; white-space: nowrap; }
        .sidebar-brand-title { font-weight: 700; font-size: 1.125rem; display: block; color: #ffffff; }
        .sidebar-brand-subtitle { font-size: 0.75rem; color: #ffffff; }

        /* Nav */
        .sidebar-nav { margin-top: 1.5rem; padding: 0 0.5rem; flex: 1; }
        .sidebar-nav-item {
          display: flex; align-items: center;
          padding: 0.75rem; margin-bottom: 0.25rem;
          border-radius: 0.5rem; transition: all 0.2s ease;
          text-decoration: none; color: #ffffff;
        }
        .sidebar-nav-item:hover { background-color: rgba(255,255,255,0.1); }
        .sidebar-nav-item-active {
          background-color: rgba(255,255,255,0.2);
          backdrop-filter: blur(4px);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1),
                      0 4px 6px -2px rgba(0,0,0,0.05);
          border-right: 4px solid #ffffff;
        }
        .sidebar-nav-icon { width: 1.25rem; height: 1.25rem; flex-shrink: 0; color: #ffffff; }
        .sidebar-nav-label { margin-left: 0.75rem; transition: all 0.3s ease; overflow: hidden; white-space: nowrap; color: #ffffff; }

        /* Logout */
        .sidebar-logout {
          position: absolute;
          bottom: 1rem;
          left: 0;
          right: 0;
        }

        .sidebar-logout-button {
          display: flex;
          align-items: center;
          padding: 0.75rem;
          cursor: pointer;
          border-radius: 0.5rem;
          transition: all 0.2s ease;
          color: #ffffff;
          margin-left: 0.5rem; /* align with nav icons */
          margin-right: 0.5rem;
        }

        .sidebar-logout-button:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
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
          color: #000000;
        }
        .logout-modal-title { font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem; }
        .logout-modal-text { font-size: 0.875rem; margin-bottom: 1.5rem; }
        .logout-modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; }
        .logout-modal-cancel {
          padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500;
          color: #000000; border-radius: 0.5rem; border: none; background: none;
          cursor: pointer; transition: background-color 0.2s ease;
        }
        .logout-modal-cancel:hover { background-color: #f3f4f6; }
        .logout-modal-confirm {
          padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500;
          color: #fff; background-color: red;
          border-radius: 0.5rem; border: none; cursor: pointer; transition: background-color 0.2s ease;
        }
        .logout-modal-confirm:hover { background-color: #a0521f; }

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
          color: #ffffff;
        }
        .menu-button-right { margin-left: auto; }

        /* Responsive */
        @media (max-width: 768px) {
          .sidebar-collapsed { width: 3rem; }
          .sidebar-expanded { width: 14rem; }
          .logout-modal { margin: 1rem; max-width: calc(100% - 2rem); }
        }
        @media (max-width: 480px) {
          .sidebar-collapsed { width: 2.5rem; }
          .sidebar-nav-item { padding: 0.5rem; }
          .sidebar-logout-button { padding: 0.5rem; }
        }
      `}</style>

      <div className={`sidebar ${isSidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-header-content">
            {isSidebarCollapsed ? (
              <button
                className="menu-button"
                onClick={() => setIsSidebarCollapsed(false)}
              >
                <Menu className="menu-icon" />
              </button>
            ) : (
              <>
                <div className="sidebar-logo">
                  <Heart className="sidebar-logo-icon" />
                </div>
                <div className="sidebar-brand">
                  <span className="sidebar-brand-title">ECHO</span>
                  <p className="sidebar-brand-subtitle">Veterinarian</p>
                </div>
                <button
                  className="menu-button menu-button-right"
                  onClick={() => setIsSidebarCollapsed(true)}
                >
                  <Menu className="menu-icon" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {sidebarItems.map(({ icon: Icon, label, path }, index) => {
            let isActive = false;

            if (path === "/VetAppointments") {
              isActive =
                location.pathname.startsWith("/VetAppointments") ||
                location.pathname.startsWith("/VetAppointmentDetails");
            } else if (path === "/VetAppointmentRequests") {
              isActive = location.pathname.startsWith("/VetAppointmentRequests");
            } else {
              isActive = location.pathname === path;
            }

            return (
              <Link
                key={index}
                to={path}
                className={`sidebar-nav-item ${isActive ? "sidebar-nav-item-active" : ""}`}
              >
                <Icon className="sidebar-nav-icon" />
                {!isSidebarCollapsed && <span className="sidebar-nav-label">{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="sidebar-logout">
          <div
            onClick={() => setShowLogoutModal(true)}
            className="sidebar-logout-button"
          >
            <LogOut className="sidebar-nav-icon" />
            {!isSidebarCollapsed && <span className="sidebar-nav-label">Log Out</span>}
          </div>
        </div>
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="logout-modal-overlay">
          <div className="logout-modal">
            <h2 className="logout-modal-title">Confirm Logout</h2>
            <p className="logout-modal-text">Are you sure you want to log out of your account?</p>
            <div className="logout-modal-actions">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="logout-modal-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="logout-modal-confirm"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
