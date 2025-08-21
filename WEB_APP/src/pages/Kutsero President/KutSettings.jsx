import React, { useEffect } from "react";
import Sidebar from "./KutSidebar";

const Settings = () => {
  const toggleSidebar = () => {
    const sidebar = document.querySelector(".sidebar");
    const main = document.querySelector(".main-content");
    if (sidebar.style.display === "none" || !sidebar.style.display) {
      sidebar.style.display = "block";
      main.style.marginLeft = "250px";
    } else {
      sidebar.style.display = "none";
      main.style.marginLeft = "80px";
    }
  };

  const switchTab = (tabId) => {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.classList.remove("active");
    });
    document.querySelectorAll(".settings-box").forEach((box) => {
      box.classList.remove("active");
    });
    document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add("active");
    document.getElementById(tabId).classList.add("active");
  };

  return (
    <div>
      <style>{`
        body {
          font-family: Arial, sans-serif;
          background-color: #f3f3f3;
          margin: 0;
          padding: 0;
        }
        .settings-container {
          display: flex;
          min-height: 100vh;
        }
        .menu-toggle {
          display: none;
          background: #D2691E;
          color: white;
          border: none;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          cursor: pointer;
          position: fixed;
          top: 1rem;
          left: 1rem;
          z-index: 1002;
        }
        @media (max-width: 768px) {
          .menu-toggle {
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }
        .main-content {
          flex: 1;
          margin-left: 80px;
          padding: 1rem;
          transition: margin-left 0.3s ease;
        }
        .header {
          background: white;
          padding: 1rem 2rem;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          margin-bottom: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .header h1 {
          margin: 0;
          font-size: 1.8rem;
        }
        .header p {
          margin: 0.3rem 0 0;
          color: #777;
        }
        .notification-btn {
          background: #f8f9fa;
          border: none;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .notification-btn:hover {
          background: #e9ecef;
          transform: scale(1.05);
        }
        .tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }
        .tab {
          padding: 10px 20px;
          background-color: white;
          border-radius: 8px;
          border: 1px solid #ccc;
          cursor: pointer;
        }
        .tab.active {
          background-color: #eee;
          font-weight: bold;
          border-bottom: 2px solid black;
        }
        .settings-box {
          display: none;
          background-color: white;
          border: 1px solid #ccc;
          border-radius: 8px;
          padding: 20px;
        }
        .settings-box.active {
          display: block;
        }
        .settings-box h2 {
          margin-top: 0;
          margin-bottom: 5px;
        }
        .settings-box p {
          color: #666;
          margin-bottom: 20px;
        }
        .form-group {
          margin-bottom: 15px;
        }
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }
        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 10px;
          border-radius: 6px;
          border: 1px solid #aaa;
          font-size: 14px;
        }
        .save-btn {
          margin-top: 20px;
          padding: 10px 20px;
          background-color: #2e7d32;
          color: white;
          border: none;
          border-radius: 20px;
          font-weight: bold;
          cursor: pointer;
          float: right;
        }
        .save-btn:hover {
          background-color: #1e5e23;
        }
      `}</style>

      <div className="settings-container">
        <button className="menu-toggle" onClick={toggleSidebar}>☰</button>
      <Sidebar />

        <div className="main-content">
          <div className="header">
            <div>
              <h1>User Settings</h1>
              <p>Manage your preferences and account</p>
            </div>
            <button className="notification-btn">
              <img src="Images/notification.png" alt="Notif" style={{ width: 24 }} />
            </button>
          </div>

          <div className="tabs">
            {['security', 'notifications', 'support', 'language'].map((tab) => (
              <div
                key={tab}
                className={`tab ${tab === 'security' ? 'active' : ''}`}
                data-tab={tab}
                onClick={() => switchTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </div>
            ))}
          </div>

          <div id="security" className="settings-box active">
            <h2>Security Settings</h2>
            <p>Change your password</p>
            <form>
              <div className="form-group">
                <label htmlFor="current-password">Current Password</label>
                <input type="password" id="current-password" name="current-password" />
              </div>
              <div className="form-group">
                <label htmlFor="new-password">New Password</label>
                <input type="password" id="new-password" name="new-password" />
              </div>
              <div className="form-group">
                <label htmlFor="confirm-password">Confirm New Password</label>
                <input type="password" id="confirm-password" name="confirm-password" />
              </div>
              <button type="submit" className="save-btn">Save Changes</button>
            </form>
          </div>

          <div id="notifications" className="settings-box">
            <h2>Notification Settings</h2>
            <p>Manage notification preferences</p>
            <form>
              <div className="form-group">
                <label><input type="checkbox" defaultChecked /> Email notifications</label>
              </div>
              <div className="form-group">
                <label><input type="checkbox" /> SMS alerts</label>
              </div>
              <button type="submit" className="save-btn">Save Changes</button>
            </form>
          </div>

          <div id="support" className="settings-box">
            <h2>Contact Support</h2>
            <p>If you need help, contact our support team</p>
            <form>
              <div className="form-group">
                <label htmlFor="support-message">Your Message</label>
                <textarea id="support-message" name="support-message" rows="5" placeholder="Describe your issue..."></textarea>
              </div>
              <button type="submit" className="save-btn">Send Message</button>
            </form>
          </div>

          <div id="language" className="settings-box">
            <h2>Language Preferences</h2>
            <p>Select your preferred language</p>
            <form>
              <div className="form-group">
                <label htmlFor="language-select">Choose Language</label>
                <select id="language-select">
                  <option value="en">English</option>
                  <option value="ceb">Cebuano</option>
                  <option value="fil">Filipino</option>
                </select>
              </div>
              <button type="submit" className="save-btn">Save Changes</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
