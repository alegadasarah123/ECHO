import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const currentPage = location.pathname.split("/").pop();
    document.querySelectorAll(".nav-item").forEach((item) => {
      const href = item.getAttribute("data-href");
      if (href === currentPage) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  }, [location.pathname]);

  const handleLogoutClick = () => {
    setShowModal(true);
  };

  const confirmLogout = () => {
    navigate("/#");
  };

  const closeLogoutModal = () => {
    setShowModal(false);
  };

  return (
    <div>
      <style>{`
        .sidebar {
          background: linear-gradient(135deg, #D2691E 0%, #CD853F 100%);
          width: 80px;
          transition: width 0.3s ease;
          position: fixed;
          height: 100vh;
          z-index: 1000;
          overflow: hidden;
        }

        .sidebar:hover {
          width: 250px;
        }

        .sidebar-header {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .logo {
          width: 40px;
          height: 40px;
          min-width: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo img {
          width: 50px;
          height: 50px;
          filter: brightness(0) invert(1);
        }

        .logo-text {
          margin-left: 1rem;
          color: white;
          font-size: 1.2rem;
          font-weight: 600;
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .sidebar:hover .logo-text {
          opacity: 1;
        }

        .nav-menu {
          padding: 2rem 0;
        }

        .nav-item {
          display: flex;
          align-items: center;
          padding: 1rem 1.5rem;
          color: white;
          text-decoration: none;
          transition: all 0.3s ease;
          cursor: pointer;
          margin: 0.5rem 0;
        }

        .nav-item:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .nav-item.active {
          background: rgba(255, 255, 255, 0.2);
          border-right: 4px solid white;
        }

        .nav-icon {
          width: 24px;
          height: 24px;
          min-width: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nav-icon img {
          width: 20px;
          height: 20px;
          filter: brightness(0) invert(1);
        }

        .nav-text {
          margin-left: 1rem;
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .sidebar:hover .nav-text {
          opacity: 1;
        }

        .logout {
          position: absolute;
          bottom: 2rem;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          padding: 1.5rem;
          text-decoration: none;
          color: white;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }

        .logout:hover {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 2000;
        }

        .modal {
          background: white;
          padding: 30px;
          border-radius: 12px;
          text-align: center;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .modal h2 {
          margin-bottom: 20px;
          font-size: 20px;
          color: #333;
        }

        .modal-buttons {
          display: flex;
          justify-content: space-around;
          margin-top: 20px;
        }

        .modal-buttons button {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
        }

        #confirmLogout {
          background-color: #D2691E;
          color: white;
        }

        #cancelLogout {
          background-color: #ccc;
          color: black;
        }
      `}</style>

      <div className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <img src="Images/logo.png" alt="Logo" />
          </div>
          <div className="logo-text">ECHO</div>
        </div>

        <div className="nav-menu">
          <div
            className="nav-item"
            data-href="dashboard"
            onClick={() => navigate("/dashboard")}
          >
            <div className="nav-icon">
              <img src="Images/dashboard.png" alt="Dashboard" />
            </div>
            <div className="nav-text">Dashboard</div>
          </div>
          <div
            className="nav-item"
            data-href="userManagement"
            onClick={() => navigate("/users")}
          >
            <div className="nav-icon">
              <img src="Images/user.png" alt="User Management" />
            </div>
            <div className="nav-text">User Management</div>
          </div>
          <div
            className="nav-item"
            data-href="settings"
            onClick={() => navigate("/settings")}
          >
            <div className="nav-icon">
              <img src="Images/settings.png" alt="Settings" />
            </div>
            <div className="nav-text">Settings</div>
          </div>
        </div>

        <div className="logout" onClick={handleLogoutClick}>
          <div className="nav-icon">
            <img src="Images/logout.png" alt="Logout" />
          </div>
          <div className="nav-text">Logout</div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Are you sure you want to log out?</h2>
            <div className="modal-buttons">
              <button id="confirmLogout" onClick={confirmLogout}>
                Yes, Logout
              </button>
              <button id="cancelLogout" onClick={closeLogoutModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;