import React, { useState } from 'react';
import { BarChart3, Calendar, FileText, Heart, Users, Settings, LogOut } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './KutSidebar.css'

const Sidebar = ({ isSidebarCollapsed, isHovering, setIsHovering }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const sidebarItems = [
    { icon: BarChart3, label: 'Dashboard', path: '/KutDashboard' },
    { icon: Users, label: 'User Management', path: '/KutUserManagement' },
    //{ icon: Heart, label: 'Health Logs', path: '/VetHealthLog' },
    //{ icon: Users, label: 'Vet Directory', path: '/VetDirectory' },
    //{ icon: Settings, label: 'Settings', path: '/VetSettings' },
  ];

  const shouldShowFullSidebar = !isSidebarCollapsed || isHovering;

  return (
    <>
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
              <p className="sidebar-brand-subtitle">Kutsero President</p>
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
