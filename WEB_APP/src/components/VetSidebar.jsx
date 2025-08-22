import React, { useState } from 'react';
import { BarChart3, Calendar, FileText, Heart, Users, Settings, LogOut } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Sidebar = ({ isSidebarCollapsed, isHovering, setIsHovering }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const sidebarItems = [
    { icon: BarChart3, label: 'Dashboard', path: '/VetDashboard' },
    { icon: Calendar, label: 'Appointments', path: '/VetAppointment' },
    { icon: FileText, label: 'Access Requests', path: '/VetRequest' },
    { icon: Heart, label: 'Health Logs', path: '/VetHealthLog' },
    { icon: Users, label: 'Vet Directory', path: '/VetDirectory' },
    { icon: Settings, label: 'Settings', path: '/VetSettings' },
  ];

  const shouldShowFullSidebar = !isSidebarCollapsed || isHovering;

  return (
    <>
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
      }
      .sidebar-expanded { width: 16rem; }
      .sidebar-collapsed { width: 4rem; }
      .sidebar-hovering {
        box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        z-index: 10;
      }

      /* Header */
      .sidebar-header {
        padding: 1rem;
        border-bottom: 1px solid rgba(34,197,94,0.3);
      }
      .sidebar-header-content { display: flex; align-items: center; }
      .sidebar-logo {
        width: 2.5rem; height: 2.5rem;
        background-color: rgba(255,255,255,0.2);
        backdrop-filter: blur(4px);
        border-radius: 0.75rem;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1),
                    0 4px 6px -2px rgba(0,0,0,0.05);
      }
      .sidebar-logo-icon { width: 1.5rem; height: 1.5rem; color: #fff; }
      .sidebar-brand { margin-left: 0.75rem; overflow: hidden; transition: all 0.3s ease; white-space: nowrap; }
      .sidebar-brand-visible { opacity: 1; width: auto; }
      .sidebar-brand-hidden { opacity: 0; width: 0; }
      .sidebar-brand-title { font-weight: 700; font-size: 1.125rem; display: block; color: #fff; }
      .sidebar-brand-subtitle { font-size: 0.75rem; color: #fff; }

      /* Nav */
      .sidebar-nav { margin-top: 1.5rem; padding: 0 0.5rem; }
      .sidebar-nav-item {
        display: flex; align-items: center;
        padding: 0.75rem; margin-bottom: 0.25rem;
        border-radius: 0.5rem; transition: all 0.2s ease;
        text-decoration: none; color: #fff;
      }
      .sidebar-nav-item:hover { background-color: rgba(255,255,255,0.1); }
      .sidebar-nav-item-active {
        background-color: rgba(255,255,255,0.2);
        backdrop-filter: blur(4px);
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1),
                    0 4px 6px -2px rgba(0,0,0,0.05);
        border-right: 4px solid #fff;
      }
      .sidebar-nav-icon { width: 1.25rem; height: 1.25rem; flex-shrink: 0; color: #fff; }
      .sidebar-nav-label { margin-left: 0.75rem; transition: all 0.3s ease; overflow: hidden; white-space: nowrap; color: #fff; }
      .sidebar-nav-label-visible { opacity: 1; width: auto; }
      .sidebar-nav-label-hidden { opacity: 0; width: 0; }

      /* Logout */
      .sidebar-logout { position: absolute; bottom: 1rem; left: 0; right: 0; padding: 0 1rem; }
      .sidebar-logout-button {
        display: flex; align-items: center;
        padding: 0.75rem; cursor: pointer;
        border-radius: 0.5rem; transition: all 0.2s ease;
        color: #fff;
      }
      .sidebar-logout-button:hover { background-color: rgba(255,255,255,0.1); }

      /* Modal */
      .logout-modal-overlay {
        position: fixed; inset: 0;
        background-color: rgba(0,0,0,0.4);
        z-index: 50; display: flex; align-items: center; justify-content: center;
      }
      .logout-modal {
        background-color: #fff;
        border-radius: 0.75rem;
        padding: 1.5rem;
        box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        width: 100%; max-width: 24rem;
      }
      .logout-modal-title {
        font-size: 1.125rem; font-weight: 600; color: #1f2937; margin-bottom: 1rem;
      }
      .logout-modal-text {
        font-size: 0.875rem; color: #4b5563; margin-bottom: 1.5rem;
      }
      .logout-modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; }
      .logout-modal-cancel {
        padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500;
        color: #374151; border-radius: 0.5rem; border: none; background: none;
        cursor: pointer; transition: background-color 0.2s ease;
      }
      .logout-modal-cancel:hover { background-color: #f3f4f6; }
      .logout-modal-confirm {
        padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500;
        color: #fff; background-color: #dc2626;
        border-radius: 0.5rem; border: none; cursor: pointer; transition: background-color 0.2s ease;
      }
      .logout-modal-confirm:hover { background-color: #b91c1c; }

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

      <div
        className={`sidebar ${shouldShowFullSidebar ? 'sidebar-expanded' : 'sidebar-collapsed'} 
          ${isHovering && isSidebarCollapsed ? 'sidebar-hovering' : ''}`}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-header-content">
            <div className="sidebar-logo">
              <Heart className="sidebar-logo-icon" />
            </div>
            <div className={`sidebar-brand ${shouldShowFullSidebar ? 'sidebar-brand-visible' : 'sidebar-brand-hidden'}`}>
              <span className="sidebar-brand-title">ECHO</span>
              <p className="sidebar-brand-subtitle">Veterinarian</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {sidebarItems.map(({ icon: Icon, label, path }, index) => {
            const isActive = location.pathname === path;

            return (
              <Link
                key={index}
                to={path}
                className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : ''}`}
              >
                <Icon className="sidebar-nav-icon" />
                <span
                  className={`sidebar-nav-label ${shouldShowFullSidebar ? 'sidebar-nav-label-visible' : 'sidebar-nav-label-hidden'}`}
                >
                  {label}
                </span>
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
            <span
              className={`sidebar-nav-label ${shouldShowFullSidebar ? 'sidebar-nav-label-visible' : 'sidebar-nav-label-hidden'}`}
            >
              Log Out
            </span>
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