import Sidebar from "@/components/KutSidebar";
import './css/userManagement.css';

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
    <div className="user-management-page">

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
