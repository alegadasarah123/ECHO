"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import "./CtuSettings.css"

function CtuSettings() {
  const navigate = useNavigate()
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [activePage, setActivePage] = useState("settings")
  const [activeSettingsView, setActiveSettingsView] = useState("main")
  const [notifications, setNotifications] = useState([])
  const [users, setUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState("") // Added search term state
  const [newUser, setNewUser] = useState({
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    role: "",
    password: "", // Changed from department to password
  })
  const [isPasswordVisible, setIsPasswordVisible] = useState(false) // Added password visibility state
  const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] = useState(false) // For current password
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false) // For new password
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false) // For confirm password
  const [passwordVisibility, setPasswordVisibility] = useState({}) // For table password visibility

  const sidebarRef = useRef(null)
  const notificationBellRef = useRef(null)
  const notificationDropdownRef = useRef(null)
  const logoutModalRef = useRef(null)

  // Settings data storage
  const [settingsData, setSettingsData] = useState({
    profile: {},
    security: {},
    userManagement: {},
  })

  const loadNotifications = useCallback(() => {
    console.log("Loading notifications...")
    setNotifications([])
  }, [])

  const loadUsers = useCallback(() => {
    console.log("Loading users...")
    setUsers([])
  }, [])

  const toggleNotificationDropdown = () => {
    setIsNotificationDropdownOpen((prev) => !prev)
  }

  const openLogoutModal = (e) => {
    e.preventDefault()
    setIsLogoutModalOpen(true)
  }

  const closeLogoutModal = () => {
    setIsLogoutModalOpen(false)
  }

  const confirmLogout = () => {
    console.log("User logged out")
    localStorage.removeItem("currentUser")
    localStorage.removeItem("loginTime")
    navigate("/CtuLogin")
    closeLogoutModal()
  }

  const markAllNotificationsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })))
  }

  const handleNotificationClick = (id) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)))
    console.log(`Notification ${id} clicked.`)
  }

  // Added search input handler
  const handleSearchInput = (e) => {
    setSearchTerm(e.target.value.toLowerCase())
  }

  // Settings navigation functions
  const openProfileSettings = () => {
    setActiveSettingsView("profile")
    loadProfileData()
  }

  const openSecuritySettings = () => {
    setActiveSettingsView("security")
    loadSecurityData()
  }

  const openUserManagement = () => {
    setActiveSettingsView("userManagement")
    loadUsers()
  }

  const goBackToSettings = () => {
    setActiveSettingsView("main")
  }

  // Data loading functions
  const loadProfileData = () => {
    console.log("Loading profile data...")
    // Clear form fields
    const profileForm = document.getElementById("profileForm")
    if (profileForm) {
      profileForm.reset()
    }
  }

  const loadSecurityData = () => {
    console.log("Loading security data...")
    // Clear form fields
    const securityForm = document.getElementById("securityForm")
    if (securityForm) {
      securityForm.reset()
    }
  }

  // Save functions
  const saveProfileSettings = () => {
    const formData = {
      firstname: document.getElementById("firstname")?.value || "",
      lastname: document.getElementById("lastname")?.value || "",
      email: document.getElementById("email")?.value || "",
      phone: document.getElementById("phone")?.value || "",
      location: document.getElementById("location")?.value || "",
      language: document.getElementById("language")?.value || "",
      theme: document.getElementById("theme")?.value || "",
      shareData: document.getElementById("shareData")?.checked || false,
      profileVisible: document.getElementById("profileVisible")?.checked || false,
      allowAnalytics: document.getElementById("allowAnalytics")?.checked || false,
    }
    setSettingsData((prev) => ({ ...prev, profile: formData }))
    console.log("Saving profile settings:", formData)
    alert("Profile settings saved successfully!")
    goBackToSettings()
  }

  const saveSecuritySettings = () => {
    const currentPassword = document.getElementById("currentPassword")?.value || ""
    const newPassword = document.getElementById("newPassword")?.value || ""
    const confirmPassword = document.getElementById("confirmPassword")?.value || ""

    if (newPassword && newPassword !== confirmPassword) {
      alert("New passwords do not match!")
      return
    }

    const securityData = {
      currentPassword: currentPassword,
      newPassword: newPassword,
      confirmPassword: confirmPassword,
      enable2FA: document.getElementById("enable2FA")?.checked || false,
      smsAuth: document.getElementById("smsAuth")?.checked || false,
      emailAuth: document.getElementById("emailAuth")?.checked || false,
      sessionTimeout: document.getElementById("sessionTimeout")?.value || "",
      logoutAllDevices: document.getElementById("logoutAllDevices")?.checked || false,
    }

    setSettingsData((prev) => ({ ...prev, security: securityData }))
    console.log("Saving security settings:", securityData)
    alert("Security settings saved successfully!")
    goBackToSettings()
  }

  // User management functions
  const handleNewUserChange = (field, value) => {
    setNewUser((prev) => ({ ...prev, [field]: value }))
  }

  // Added password visibility toggle function
  const togglePasswordVisibility = () => {
    setIsPasswordVisible((prev) => !prev)
  }

  // Add these new toggle functions for security settings
  const toggleCurrentPasswordVisibility = () => {
    setIsCurrentPasswordVisible((prev) => !prev)
  }

  const toggleNewPasswordVisibility = () => {
    setIsNewPasswordVisible((prev) => !prev)
  }

  const toggleConfirmPasswordVisibility = () => {
    setIsConfirmPasswordVisible((prev) => !prev)
  }

  // Add function to toggle password visibility in table
  const toggleTablePasswordVisibility = (userId) => {
    setPasswordVisibility((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }))
  }

  const addNewUser = () => {
    if (
      !newUser.firstname ||
      !newUser.lastname ||
      !newUser.email ||
      !newUser.phone ||
      !newUser.role ||
      !newUser.password
    ) {
      alert("Please fill in all required fields")
      return
    }

    const userToAdd = {
      id: Date.now(),
      firstname: newUser.firstname,
      lastname: newUser.lastname,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      password: newUser.password, // Store the password for display in table
      createdAt: new Date().toISOString(),
      status: "Active",
    }

    setUsers((prev) => [...prev, userToAdd])
    setNewUser({ firstname: "", lastname: "", email: "", phone: "", role: "", password: "" })
    setIsPasswordVisible(false) // Reset password visibility when form is cleared
    alert("User added successfully!")
  }

  const deleteUser = (userId) => {
    if (confirm("Are you sure you want to delete this user?")) {
      setUsers((prev) => prev.filter((user) => user.id !== userId))
      // Also remove password visibility state for this user
      setPasswordVisibility((prev) => {
        const newState = { ...prev }
        delete newState[userId]
        return newState
      })
      alert("User deleted successfully!")
    }
  }

  const checkPasswordStrength = () => {
    const password = document.getElementById("newPassword")?.value || ""
    const strengthBar = document.getElementById("passwordStrengthBar")
    if (!strengthBar) return

    let strength = 0
    if (password.length >= 8) strength++
    if (password.match(/[a-z]/)) strength++
    if (password.match(/[A-Z]/)) strength++
    if (password.match(/[0-9]/)) strength++
    if (password.match(/[^a-zA-Z0-9]/)) strength++

    strengthBar.className = "passwordStrengthBar"
    if (strength <= 2) {
      strengthBar.classList.add("strengthWeak")
    } else if (strength === 3) {
      strengthBar.classList.add("strengthFair")
    } else if (strength === 4) {
      strengthBar.classList.add("strengthGood")
    } else {
      strengthBar.classList.add("strengthStrong")
    }
  }

  // Effects
  useEffect(() => {
    loadNotifications()
    loadUsers()
  }, [loadNotifications, loadUsers])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationBellRef.current &&
        !notificationBellRef.current.contains(event.target) &&
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(event.target)
      ) {
        setIsNotificationDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsSidebarExpanded(false)
      } else {
        setIsSidebarExpanded(false)
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div className="bodyWrapper">
      {/* ... existing sidebar and header code ... */}
      <div className="sidebar" id="sidebar" ref={sidebarRef}>
        <div className="sidebarLogo">
          <img src="/images/logo.png" alt="CTU Logo" className="logo" />
        </div>
        <nav className="navMenu">
          {[
            { name: "Dashboard", iconClass: "fas fa-th-large", page: "dashboard", route: "/CtuDashboard" },
            {
              name: "Account Approval",
              iconClass: "fa-solid fa-user-check",
              page: "approval",
              route: "/CtuAccountApproval",
            },
            {
              name: "Access Requests",
              iconClass: "fa-solid fa-file-alt",
              page: "requests",
              route: "/CtuAccessRequest",
            },
            {
              name: "Horse Records",
              iconClass: "fa-solid fa-clipboard-list",
              page: "records",
              route: "/CtuHorseRecord",
            },
            { name: "Health Reports", iconClass: "fa-solid fa-chart-bar", page: "reports", route: "/CtuHealthReport" },
            {
              name: "Announcements",
              iconClass: "fa-solid fa-bullhorn",
              page: "announcements",
              route: "/CtuAnnouncement",
            },
            { name: "Directory", iconClass: "fa-solid fa-folder", page: "directory", route: "/CtuDirectory" },
            { name: "Settings", iconClass: "fa-solid fa-cog", page: "settings", route: "/CtuSettings" },
          ].map((item) => (
            <a
              key={item.page}
              href={item.route}
              className={`navItem ${activePage === item.page ? "active" : ""}`}
              onClick={(e) => {
                e.preventDefault()
                setActivePage(item.page)
                if (item.page !== "settings") {
                  window.location.href = item.route
                }
              }}
            >
              <i className={`${item.iconClass} navIcon`} />
              <span>{item.name}</span>
            </a>
          ))}
        </nav>
        <div className="logout">
          <a href="#" className="logoutBtn" onClick={openLogoutModal}>
            <i className="fa-solid fa-sign-out-alt logoutIcon" />
            <span>Log Out</span>
          </a>
        </div>
      </div>

      <div className="mainContent">
        <header className="header">
          <div className="search-container">
            <div className="search-icon"></div>
            <input
              type="text"
              className="search-input"
              placeholder="Search......"
              value={searchTerm}
              onChange={handleSearchInput}
            />
          </div>
          <div className="notificationBell" ref={notificationBellRef} onClick={toggleNotificationDropdown}>
            <i className="fa-solid fa-bell" />
            {notifications.filter((n) => !n.read).length > 0 && (
              <div className="notificationCount">{notifications.filter((n) => !n.read).length}</div>
            )}
            <div
              className={`notificationDropdown ${isNotificationDropdownOpen ? "show" : ""}`}
              ref={notificationDropdownRef}
            >
              <div className="notificationHeader">
                <h3>Notifications</h3>
                {notifications.filter((n) => !n.read).length > 0 && (
                  <button className="markAllRead" onClick={markAllNotificationsRead}>
                    Mark all as read
                  </button>
                )}
              </div>
              <div id="notificationList">
                {notifications.length === 0 ? (
                  <div className="emptyState">
                    <i className="fa-solid fa-bell-slash" />
                    <h3>No notifications</h3>
                    <p>You're all caught up!</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`notificationItem ${!notification.read ? "unread" : ""}`}
                      onClick={() => handleNotificationClick(notification.id)}
                    >
                      <div className="notificationTitle">
                        <i className="fa-solid fa-bell notificationIcon" />
                        {notification.title}
                      </div>
                      <div className="notificationMessage">{notification.message}</div>
                      <div className="notificationTime">{notification.time}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="contentArea">
          <div className="settingsContainer">
            {/* Main Settings View */}
            {activeSettingsView === "main" && (
              <div id="main-settings">
                <div className="settingsHeader">
                  <h1 className="settingsTitle">Settings</h1>
                </div>
                <div className="settingsList">
                  <div className="settingsItem" onClick={openProfileSettings}>
                    <div className="settingsIcon">
                      <i className="fas fa-user-circle"></i>
                    </div>
                    <div className="settingsContent">
                      <div className="settingsItemTitle">Profile</div>
                      <div className="settingsItemDescription">Manage your personal information and preferences.</div>
                    </div>
                  </div>
                  <div className="settingsItem" onClick={openSecuritySettings}>
                    <div className="settingsIcon">
                      <i className="fas fa-shield-alt"></i>
                    </div>
                    <div className="settingsContent">
                      <div className="settingsItemTitle">Security</div>
                      <div className="settingsItemDescription">Manage passwords and account protection</div>
                    </div>
                  </div>
                  <div className="settingsItem" onClick={openUserManagement}>
                    <div className="settingsIcon">
                      <i className="fas fa-users"></i>
                    </div>
                    <div className="settingsContent">
                      <div className="settingsItemTitle">User Management</div>
                      <div className="settingsItemDescription">Add, edit, and manage system users</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Profile Settings View */}
            {activeSettingsView === "profile" && (
              <div id="profile-settings" className="profileSettings">
                <div className="settingsHeader">
                  <button className="backButton" onClick={goBackToSettings}>
                    <i className="fas fa-arrow-left"></i>
                  </button>
                  <h1 className="settingsTitle">Profile Settings</h1>
                </div>
                <div className="profileFormContent">
                  <form id="profileForm">
                    <div className="formGroup">
                      <label className="formLabel" htmlFor="firstname">
                        First Name
                      </label>
                      <input type="text" id="firstname" className="formInput" placeholder="Enter first name" />
                    </div>
                    <div className="formGroup">
                      <label className="formLabel" htmlFor="lastname">
                        Last Name
                      </label>
                      <input type="text" id="lastname" className="formInput" placeholder="Enter last name" />
                    </div>
                    <div className="formGroup">
                      <label className="formLabel" htmlFor="email">
                        Email Address
                      </label>
                      <input type="email" id="email" className="formInput" placeholder="Enter email address" />
                    </div>
                    <div className="formGroup">
                      <label className="formLabel" htmlFor="phone">
                        Phone Number
                      </label>
                      <input type="tel" id="phone" className="formInput" placeholder="Enter phone number" />
                    </div>
                    <div className="formGroup">
                      <label className="formLabel" htmlFor="location">
                        Location
                      </label>
                      <input type="text" id="location" className="formInput" placeholder="Enter location" />
                    </div>
                    <div className="formGroup">
                      <label className="formLabel" htmlFor="language">
                        Language
                      </label>
                      <select id="language" className="formSelect">
                        <option value="">Select language</option>
                        <option value="english">English</option>
                        <option value="filipino">Filipino</option>
                        <option value="cebuano">Cebuano</option>
                        <option value="spanish">Spanish</option>
                      </select>
                    </div>
                    <div className="formGroup">
                      <label className="formLabel" htmlFor="theme">
                        Interface Theme
                      </label>
                      <select id="theme" className="formSelect">
                        <option value="">Select theme</option>
                        <option value="default">Default</option>
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>
                    <div className="formGroup">
                      <label className="formLabel">Privacy Settings</label>
                      <div className="checkboxGroup">
                        <div className="checkboxItem">
                          <input type="checkbox" id="shareData" className="checkboxInput" />
                          <label htmlFor="shareData" className="checkboxLabel">
                            Share my data with other system users
                          </label>
                        </div>
                        <div className="checkboxItem">
                          <input type="checkbox" id="profileVisible" className="checkboxInput" />
                          <label htmlFor="profileVisible" className="checkboxLabel">
                            Make my profile visible in directory
                          </label>
                        </div>
                        <div className="checkboxItem">
                          <input type="checkbox" id="allowAnalytics" className="checkboxInput" />
                          <label htmlFor="allowAnalytics" className="checkboxLabel">
                            Allow anonymous usage analytics
                          </label>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
                <div className="formActions">
                  <button type="button" className="btn btnSecondary" onClick={goBackToSettings}>
                    Cancel
                  </button>
                  <button type="button" className="btn btnPrimary" onClick={saveProfileSettings}>
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* ... existing security settings code ... */}
            {activeSettingsView === "security" && (
              <div id="security-settings" className="securitySettings">
                <div className="settingsHeader">
                  <button className="backButton" onClick={goBackToSettings}>
                    <i className="fas fa-arrow-left"></i>
                  </button>
                  <h1 className="settingsTitle">Security Settings</h1>
                </div>
                <div className="securityFormContent">
                  <form id="securityForm">
                    <div className="securitySection">
                      <h3 className="securitySectionTitle">Password Management</h3>
                      <div className="formGroup">
                        <label className="formLabel" htmlFor="currentPassword">
                          Current Password
                        </label>
                        <div className="passwordInputContainer" style={{ position: "relative" }}>
                          <input
                            type={isCurrentPasswordVisible ? "text" : "password"}
                            id="currentPassword"
                            className="formInput"
                            placeholder="Enter current password"
                            style={{ paddingRight: "40px" }}
                          />
                          <button
                            type="button"
                            onClick={toggleCurrentPasswordVisibility}
                            style={{
                              position: "absolute",
                              right: "10px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#666",
                              fontSize: "16px",
                            }}
                            title={isCurrentPasswordVisible ? "Hide password" : "Show password"}
                          >
                            <i className={`fas ${isCurrentPasswordVisible ? "fa-eye-slash" : "fa-eye"}`}></i>
                          </button>
                        </div>
                      </div>
                      <div className="formGroup">
                        <label className="formLabel" htmlFor="newPassword">
                          New Password
                        </label>
                        <div className="passwordInputContainer" style={{ position: "relative" }}>
                          <input
                            type={isNewPasswordVisible ? "text" : "password"}
                            id="newPassword"
                            className="formInput"
                            placeholder="Enter new password"
                            onInput={checkPasswordStrength}
                            style={{ paddingRight: "40px" }}
                          />
                          <button
                            type="button"
                            onClick={toggleNewPasswordVisibility}
                            style={{
                              position: "absolute",
                              right: "10px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#666",
                              fontSize: "16px",
                            }}
                            title={isNewPasswordVisible ? "Hide password" : "Show password"}
                          >
                            <i className={`fas ${isNewPasswordVisible ? "fa-eye-slash" : "fa-eye"}`}></i>
                          </button>
                        </div>
                        <div className="passwordStrength">
                          <div className="passwordStrengthBar" id="passwordStrengthBar"></div>
                        </div>
                      </div>
                      <div className="formGroup">
                        <label className="formLabel" htmlFor="confirmPassword">
                          Confirm New Password
                        </label>
                        <div className="passwordInputContainer" style={{ position: "relative" }}>
                          <input
                            type={isConfirmPasswordVisible ? "text" : "password"}
                            id="confirmPassword"
                            className="formInput"
                            placeholder="Confirm new password"
                            style={{ paddingRight: "40px" }}
                          />
                          <button
                            type="button"
                            onClick={toggleConfirmPasswordVisibility}
                            style={{
                              position: "absolute",
                              right: "10px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#666",
                              fontSize: "16px",
                            }}
                            title={isConfirmPasswordVisible ? "Hide password" : "Show password"}
                          >
                            <i className={`fas ${isConfirmPasswordVisible ? "fa-eye-slash" : "fa-eye"}`}></i>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="securitySection">
                      <h3 className="securitySectionTitle">Two-Factor Authentication</h3>
                      <div className="securityCheckboxGroup">
                        <div className="securityCheckboxItem">
                          <input type="checkbox" id="enable2FA" className="securityCheckboxInput" />
                          <label htmlFor="enable2FA" className="securityCheckboxLabel">
                            Enable two-factor authentication
                          </label>
                        </div>
                        <div className="securityCheckboxItem">
                          <input type="checkbox" id="smsAuth" className="securityCheckboxInput" />
                          <label htmlFor="smsAuth" className="securityCheckboxLabel">
                            SMS authentication
                          </label>
                        </div>
                        <div className="securityCheckboxItem">
                          <input type="checkbox" id="emailAuth" className="securityCheckboxInput" />
                          <label htmlFor="emailAuth" className="securityCheckboxLabel">
                            Email authentication
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="securitySection">
                      <h3 className="securitySectionTitle">Session Management</h3>
                      <div className="formGroup">
                        <label className="formLabel" htmlFor="sessionTimeout">
                          Session Timeout
                        </label>
                        <select id="sessionTimeout" className="formSelect">
                          <option value="">Select timeout</option>
                          <option value="15">15 minutes</option>
                          <option value="30">30 minutes</option>
                          <option value="60">1 hour</option>
                          <option value="120">2 hours</option>
                          <option value="480">8 hours</option>
                        </select>
                      </div>
                      <div className="securityCheckboxGroup">
                        <div className="securityCheckboxItem">
                          <input type="checkbox" id="logoutAllDevices" className="securityCheckboxInput" />
                          <label htmlFor="logoutAllDevices" className="securityCheckboxLabel">
                            Log out from all other devices
                          </label>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
                <div className="formActions">
                  <button type="button" className="btn btnSecondary" onClick={goBackToSettings}>
                    Cancel
                  </button>
                  <button type="button" className="btn btnPrimary" onClick={saveSecuritySettings}>
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* User Management View */}
            {activeSettingsView === "userManagement" && (
              <div id="user-management" className="userManagement">
                <div className="settingsHeader">
                  <button className="backButton" onClick={goBackToSettings}>
                    <i className="fas fa-arrow-left"></i>
                  </button>
                  <h1 className="settingsTitle">User Management</h1>
                </div>
                <div className="userManagementContent">
                  {/* Add New User Section */}
                  <div className="userSection">
                    <h3 className="userSectionTitle">Add New User</h3>
                    <div className="addUserForm">
                      <div className="formRow">
                        <div className="formGroup">
                          <label className="formLabel">First Name</label>
                          <input
                            type="text"
                            className="formInput"
                            placeholder="Enter first name"
                            value={newUser.firstname}
                            onChange={(e) => handleNewUserChange("firstname", e.target.value)}
                          />
                        </div>
                        <div className="formGroup">
                          <label className="formLabel">Last Name</label>
                          <input
                            type="text"
                            className="formInput"
                            placeholder="Enter last name"
                            value={newUser.lastname}
                            onChange={(e) => handleNewUserChange("lastname", e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="formRow">
                        <div className="formGroup">
                          <label className="formLabel">Email</label>
                          <input
                            type="email"
                            className="formInput"
                            placeholder="Enter email"
                            value={newUser.email}
                            onChange={(e) => handleNewUserChange("email", e.target.value)}
                          />
                        </div>
                        <div className="formGroup">
                          <label className="formLabel">Phone Number</label>
                          <input
                            type="tel"
                            className="formInput"
                            placeholder="Enter phone number"
                            value={newUser.phone}
                            onChange={(e) => handleNewUserChange("phone", e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="formRow">
                        <div className="formGroup">
                          <label className="formLabel">Role</label>
                          <select
                            className="formSelect"
                            value={newUser.role}
                            onChange={(e) => handleNewUserChange("role", e.target.value)}
                          >
                            <option value="">Select role</option>
                            <option value="admin">Administrator</option>
                            <option value="veterinarian">Veterinarian</option>
                          </select>
                        </div>
                        <div className="formGroup">
                          <label className="formLabel">Password</label>
                          <div className="passwordInputContainer" style={{ position: "relative" }}>
                            <input
                              type={isPasswordVisible ? "text" : "password"}
                              className="formInput"
                              placeholder="Enter password"
                              value={newUser.password}
                              onChange={(e) => handleNewUserChange("password", e.target.value)}
                              style={{ paddingRight: "40px" }}
                            />
                            <button
                              type="button"
                              onClick={togglePasswordVisibility}
                              style={{
                                position: "absolute",
                                right: "10px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "#666",
                                fontSize: "16px",
                              }}
                              title={isPasswordVisible ? "Hide password" : "Show password"}
                            >
                              <i className={`fas ${isPasswordVisible ? "fa-eye-slash" : "fa-eye"}`}></i>
                            </button>
                          </div>
                        </div>
                      </div>
                      <button type="button" className="btn btnPrimary" onClick={addNewUser}>
                        <i className="fas fa-plus"></i> Add User
                      </button>
                    </div>
                  </div>

                  {/* Users List Section */}
                  <div className="userSection">
                    <h3 className="userSectionTitle">Existing Users</h3>
                    {users.length === 0 ? (
                      <div className="emptyState">
                        <i className="fas fa-users"></i>
                        <h3>No users found</h3>
                        <p>Add your first user to get started</p>
                      </div>
                    ) : (
                      <div className="usersTable">
                        <div className="tableHeader">
                          <div className="tableHeaderCell">First Name</div>
                          <div className="tableHeaderCell">Last Name</div>
                          <div className="tableHeaderCell">Email</div>
                          <div className="tableHeaderCell">Phone</div>
                          <div className="tableHeaderCell">Role</div>
                          <div className="tableHeaderCell">Password</div>
                          <div className="tableHeaderCell">Status</div>
                          <div className="tableHeaderCell">Actions</div>
                        </div>
                        {users.map((user) => (
                          <div key={user.id} className="tableRow">
                            <div className="tableCell">{user.firstname}</div>
                            <div className="tableCell">{user.lastname}</div>
                            <div className="tableCell">{user.email}</div>
                            <div className="tableCell">{user.phone}</div>
                            <div className="tableCell">
                              <span className={`roleBadge role${user.role}`}>{user.role}</span>
                            </div>
                            <div className="tableCell">
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontFamily: "monospace", fontSize: "14px" }}>
                                  {passwordVisibility[user.id] ? user.password : "•".repeat(user.password.length)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleTablePasswordVisibility(user.id)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "#666",
                                    fontSize: "14px",
                                    padding: "2px",
                                  }}
                                  title={passwordVisibility[user.id] ? "Hide password" : "Show password"}
                                >
                                  <i className={`fas ${passwordVisibility[user.id] ? "fa-eye-slash" : "fa-eye"}`}></i>
                                </button>
                              </div>
                            </div>
                            <div className="tableCell">
                              <span className={`statusBadge status${user.status.toLowerCase()}`}>{user.status}</span>
                            </div>
                            <div className="tableCell">
                              <button
                                className="btn btnDanger btnSmall"
                                onClick={() => deleteUser(user.id)}
                                title="Delete user"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="formActions">
                  <button type="button" className="btn btnSecondary" onClick={goBackToSettings}>
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logout Modal */}
      {isLogoutModalOpen && (
        <div
          className="modalOverlay active"
          ref={logoutModalRef}
          onClick={(e) => e.target === logoutModalRef.current && closeLogoutModal()}
        >
          <div className="logoutModal">
            <div className="logoutModalIcon">
              <i className="fa-solid fa-sign-out-alt" />
            </div>
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to log out of your account?</p>
            <div className="logoutModalButtons">
              <button className="logoutModalBtn cancel" onClick={closeLogoutModal}>
                No
              </button>
              <button className="logoutModalBtn confirm" onClick={confirmLogout}>
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CtuSettings
