import React from "react";
import Sidebar from "./sidebar";

const UserManagementPage = () => {
  const toggleSidebar = () => {
    const sidebar = document.querySelector(".sidebar");
    const main = document.querySelector(".main-content");
    if (sidebar.classList.contains("mobile-hidden")) {
      sidebar.classList.remove("mobile-hidden");
      main.style.marginLeft = "250px";
    } else {
      sidebar.classList.add("mobile-hidden");
      main.style.marginLeft = "0";
    }
  };

  return (
    <div>
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          font-family: 'Segoe UI', sans-serif;
          margin: 0;
          background-color: #f2f2f2;
          color: #333;
        }

        .usermanagement-container {
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

          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            width: 250px;
            height: 100%;
            background: #333;
            transition: transform 0.3s ease;
            z-index: 1001;
          }

          .sidebar.mobile-hidden {
            transform: translateX(-100%);
          }

          .main-content {
            margin-left: 0 !important;
            padding: 1rem;
            width: 100%;
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
          flex-wrap: wrap;
          gap: 1rem;
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

        .user-management-card {
          background: #fff;
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
          margin-top: 1.5rem;
        }

        .search-container {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }

        .search-container input[type="text"] {
          flex: 1;
          padding: 0.75rem 1rem;
          border: 1px solid #ccc;
          border-radius: 8px;
          font-size: 1rem;
        }

        .search-container button {
          background-color: #D2691E;
          color: white;
          border: none;
          padding: 0.75rem 1.2rem;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
        }

        .filter-container {
          margin-bottom: 1rem;
        }

        .filter-container select {
          padding: 0.6rem 1rem;
          border-radius: 8px;
          border: 1px solid #ccc;
          font-size: 1rem;
        }

        .table-wrapper {
          overflow-x: auto;
          border: 1px solid #ddd;
          border-radius: 8px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 600px;
          margin-top: 1rem;
        }

        thead {
          background-color: #f8f8f8;
        }

        th, td {
          padding: 1rem;
          text-align: center;
          border-bottom: 1px solid #ddd;
        }

        tr:nth-child(even) {
          background-color: #f9f9f9;
        }

        tr:hover {
          background-color: #f1f1f1;
        }

        th {
          font-weight: bold;
          color: #333;
        }

        .verified-badge {
          color: green;
          font-weight: bold;
        }

        .unverified-badge {
          color: red;
          font-weight: bold;
        }

        .actions {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .actions button {
          padding: 0.4rem 0.8rem;
          border: none;
          border-radius: 6px;
          font-size: 0.85rem;
          cursor: pointer;
          color: white;
          transition: background 0.2s;
        }

        .actions .verify-btn {
          background-color: #28a745;
        }

        .actions .deactivate-btn {
          background-color: #ffc107;
          color: #000;
        }

        .actions .delete-btn {
          background-color: #dc3545;
        }

        .actions button:hover {
          opacity: 0.9;
        }
      `}</style>

      <div className="usermanagement-container">
        <button className="menu-toggle" onClick={toggleSidebar}>☰</button>

        <Sidebar />

        <div className="main-content">
          <div className="header">
            <div>
              <h1>User Management</h1>
              <p>Manage all users registered in the system.</p>
            </div>
            <button className="notification-btn">
              <img src="Images/notification.png" alt="Notif" style={{ width: 24 }} />
            </button>
          </div>

          <div className="user-management-card">
            <div className="search-container">
              <input type="text" placeholder="🔍 Search for users..." />
              <button>Search</button>
            </div>

            <div className="filter-container">
              <select>
                <option value="all">All Status</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Verification</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array(7).fill().map((_, i) => (
                    <tr key={i}>
                      <td>John Doe</td>
                      <td>Active</td>
                      <td><span className="verified-badge">Verified</span></td>
                      <td>2023-09-15</td>
                      <td className="actions">
                        <button className="verify-btn">Verify</button>
                        <button className="deactivate-btn">Deactivate</button>
                        <button className="delete-btn">Delete</button>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td>Jane Smith</td>
                    <td>Inactive</td>
                    <td><span className="unverified-badge">Unverified</span></td>
                    <td>2023-08-10</td>
                    <td className="actions">
                      <button className="verify-btn">Verify</button>
                      <button className="deactivate-btn">Deactivate</button>
                      <button className="delete-btn">Delete</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagementPage;
