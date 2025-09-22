"use client"

import Sidebar from "@/components/CtuSidebar"
import { Bell, Check, Edit2, Eye, EyeOff, MoreVertical, Plus, Users } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import FloatingMessages from "./CtuMessage"
import NotificationModal from "./CtuNotif"

const API_BASE = "http://127.0.0.1:8000/api/ctu_vetmed"

const CtuSettings = () => {
  const [activeTab, setActiveTab] = useState("profile")
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifsOpen, setNotifsOpen] = useState(false)
  const [errors, setErrors] = useState({})
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("All")

  const [profileExists, setProfileExists] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState({})
  const [notifications, setNotifications] = useState([])
  const [profile, setProfile] = useState({
    ctu_fname: "",
    ctu_lname: "",
    ctu_email: "",
    ctu_phonenum: "",
    ctu_role: "",
  })

  const [alert, setAlert] = useState({ show: false, message: "", type: "" })

  const showAlert = (message, type = "success") => {
    setAlert({ show: true, message, type })
    setTimeout(() => setAlert({ show: false, message: "", type: "" }), 3000)
  }

  const [passwordVisibility, setPasswordVisibility] = useState({
    current_password: false,
    new_password: false,
    confirm_new_password: false,
  })

  const [activeUserTab, setActiveUserTab] = useState("addNew")
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(null)
  // State for new user
  const [newUser, setNewUser] = useState({
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    role: "Ctu-Vetmed", // force this role
    password: "", // optional, won't be saved in DB
  })

  const [error, setError] = useState("")
  const [activeSettingsView, setActiveSettingsView] = useState("userManagement")
  const [isLoading, setIsLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [profiles, setProfiles] = useState([])
  const [passwords, setPasswords] = useState({
    current_password: "",
    new_password: "",
    confirm_new_password: "",
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setProfile((prev) => ({ ...prev, [name]: value }))
  }

  // Save first-time CTU Vet profile
  const handleSave = async (e) => {
    e.preventDefault()
    setErrors({})

    try {
      const res = await fetch(`${API_BASE}/save_ctu_vet_profile/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ctu_fname: profile.ctu_fname,
          ctu_lname: profile.ctu_lname,
          ctu_email: profile.ctu_email,
          ctu_phonenum: profile.ctu_phonenum,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        window.alert("Profile saved successfully!")
        setEditing(false)
        setProfileExists(true)
      } else if (data.errors) {
        // Display validation errors next to inputs
        setErrors(data.errors)
      } else {
        // Any other server error
        window.alert(data.error || "Failed to save profile")
      }
    } catch (error) {
      console.error("Error saving profile:", error)
      window.alert("Something went wrong. Please try again.")
    }
  }

  // Update existing CTU Vet profile
  const handleUpdate = async (e) => {
    e.preventDefault()
    setErrors({})

    try {
      const res = await fetch("http://localhost:8000/api/ctu_vetmed/update_ctu_vet_profile/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ctu_fname: profile.ctu_fname,
          ctu_lname: profile.ctu_lname,
          ctu_email: profile.ctu_email,
          ctu_phonenum: profile.ctu_phonenum,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        window.alert("Profile updated successfully!")
        setEditing(false)
      } else if (data.errors) {
        setErrors(data.errors)
      } else {
        window.alert(data.error || "Failed to update profile")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      window.alert("Something went wrong. Please try again.")
    }
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswords((prev) => ({ ...prev, [name]: value }))
  }

  const handlePasswordUpdate = async (e) => {
    e.preventDefault()
    setPasswordErrors({})

    // 1️⃣ Check if new passwords match
    if (passwords.new_password !== passwords.confirm_new_password) {
      setPasswordErrors({ confirm_new_password: "Passwords do not match" })
      return
    }

    try {
      // 2️⃣ Make API request with credentials included (JWT cookie)
      const res = await fetch("http://localhost:8000/api/ctu_vetmed/ctu_change_password/", {
        method: "POST",
        credentials: "include", // send access_token cookie
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ctu_email: profile.ctu_email, // 👈 use ctu_email instead of pres_email
          current_password: passwords.current_password,
          new_password: passwords.new_password,
        }),
      })

      const data = await res.json()

      // 3️⃣ Handle Unauthorized (401)
      if (res.status === 401) {
        window.alert("Session expired or not logged in. Please log in again.")
        window.location.href = "/login"
        return
      }

      // 4️⃣ Handle successful password update
      if (res.ok) {
        window.alert("Password updated successfully!")
        setPasswords({ current_password: "", new_password: "", confirm_new_password: "" })
        return
      }

      // 5️⃣ Handle field-specific errors
      if (data.errors) {
        setPasswordErrors(data.errors)
        return
      }

      // 6️⃣ Handle general errors
      window.alert(data.error || "Failed to update password")
    } catch (err) {
      console.error("Password update error:", err)
      window.alert("Something went wrong. Please try again later.")
    }
  }

  // Handle input changes
  const handleNewUserChange = (field, value) => {
    setNewUser((prev) => ({ ...prev, [field]: value }))
  }

  const togglePasswordVisibility = (field) => {
    setPasswordVisibility((prev) => ({
      ...prev,
      [field]: !prev[field],
    }))
  }

  const toggleNewUserPasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible)
  }

  // Add new user function
  const addNewUser = async () => {
    const { firstname, lastname, email, phone, password, role } = newUser

    // 1️⃣ Validate input
    if (!firstname || !lastname || !email || !phone || !password || !role) {
      alert("Please fill in all required fields.")
      return
    }

    // 2️⃣ Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      window.alert("Please enter a valid email address.")
      return
    }

    // 3️⃣ Validate phone: must start with 09 and be 11 digits
    const phoneRegex = /^09\d{9}$/
    if (!phoneRegex.test(phone.trim())) {
      window.alert("Phone number must start with 09 and be 11 digits long.")
      return
    }

    try {
      // 4️⃣ Call backend signup endpoint
      const response = await fetch("http://localhost:8000/api/ctu_vetmed/signup/", {
        method: "POST",
        credentials: "include", // send cookies if needed
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password.trim(),
          firstName: firstname.trim(),
          lastName: lastname.trim(),
          phoneNumber: phone.trim(),
          role: role.trim(), // send role to backend
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        window.alert(data.error || "Failed to create user.")
        return
      }

      // 5️⃣ Update UI with new user
      setUsers((prev) => [
        ...prev,
        {
          id: data.user.ctu_id || data.user.id,
          firstname,
          lastname,
          email,
          phone,
          role: data.user.ctu_role || role, // backend response or fallback
          status: "Active",
        },
      ])

      // 6️⃣ Clear form
      setNewUser({
        firstname: "",
        lastname: "",
        email: "",
        phone: "",
        password: "",
        role: "Ctu-Vetmed", // reset default
      })

      window.alert("✅ User created successfully!")
    } catch (err) {
      console.error("Error adding user:", err)
      alert("Failed to add user. Make sure the backend server is running.")
    }
  }

  // -------------------- DEACTIVATE USER --------------------
  const deactivateUser = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/users/deactivate/${id}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!res.ok) throw new Error("Failed to deactivate user")

      const data = await res.json()
      console.log("Deactivated:", data)

      setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, status: "deactivated" } : p)))

      showAlert("User deactivated successfully!", "success")
    } catch (err) {
      console.error("Error deactivating user:", err)
      showAlert("Error deactivating user", "error")
    }
  }

  // -------------------- REACTIVATE USER --------------------
  const reactivateUser = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/users/reactivate/${id}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!res.ok) throw new Error("Failed to reactivate user")

      const data = await res.json()
      console.log("Reactivated:", data)

      setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, status: "approved" } : p)))

      showAlert("User reactivated successfully!", "success")
    } catch (err) {
      console.error("Error reactivating user:", err)
      showAlert("Error reactivating user", "error")
    }
  }

  const toggleDropdown = (id) => {
    setDropdownOpen(dropdownOpen === id ? null : id)
  }
  // Fetch CTU Vet profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/ctu_vetmed/get_ctu_vet_profiles/", {
          method: "GET",
          credentials: "include", // include HttpOnly cookie
        })

        const data = await res.json()

        if (!res.ok) {
          console.error("Failed to fetch profile:", data.error || "Unknown error")
          return
        }

        // Set profile state
        setProfile({
          ctu_fname: data.ctu_fname || "",
          ctu_lname: data.ctu_lname || "",
          ctu_email: data.ctu_email || "",
          ctu_phonenum: data.ctu_phonenum || "",
          ctu_role: data.ctu_role || "",
        })

        if (data.ctu_fname || data.ctu_lname || data.ctu_phonenum) {
          setProfileExists(true)
        }
      } catch (err) {
        console.error("Error fetching profile:", err)
      }
    }

    fetchProfile()
  }, [])

  // ✅ Fetch notifications from backend
  const loadNotifications = useCallback(() => {
    console.log("Loading notifications...")

    fetch("http://127.0.0.1:8000/api/ctu_vetmed/get_vetnotifications/")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch notifications")
        return res.json()
      })
      .then((data) => {
        const formatted = data.map((notif) => ({
          id: notif.id,
          message: notif.message,
          date: notif.date || new Date().toISOString(),
        }))
        setNotifications(formatted)
      })
      .catch((err) => console.error("Failed to fetch notifications:", err))
  }, [])

  // ✅ Auto-refresh every 30s
  useEffect(() => {
    loadNotifications() // load once

    const interval = setInterval(() => {
      loadNotifications()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [loadNotifications])

  // Fetch users from backend
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await fetch("http://localhost:8000/api/ctu_vetmed/users/", {
        method: "GET",
        credentials: "include",
      })
      const data = await res.json()
      if (res.ok)
        setProfiles(data) // admins see all
      else console.error("Error fetching users:", data.error)
    } catch (err) {
      console.error("Fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const validatePassword = (password) => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*]/.test(password),
    }
  }

  const passwordValidation = validatePassword(passwords.new_password || "")

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.dashboard}>
        <div style={styles.header}>
          <h1 style={styles.title}>Settings</h1>
          <div style={{ position: "relative" }}>
            <button style={styles.notificationBtn} onClick={() => setNotifsOpen(!notifsOpen)}>
              <Bell size={24} color="#374151" />
              {notifications.length > 0 && <span style={styles.badge}>{notifications.length}</span>}
            </button>
          </div>
          {/* Notification Modal */}
          <NotificationModal
            isOpen={notifsOpen}
            onClose={() => setNotifsOpen(false)}
            notifications={notifications.map((n) => ({
              message: n.message,
              date: n.date,
            }))}
          />
        </div>

        <div style={styles.tabs}>
          {["profile", "security", "userManagement"].map((tab) => {
            // Only show "userManagement" if user is Ctu-Admin
            if (tab === "userManagement" && profile?.ctu_role?.trim().toLowerCase() !== "ctu-admin") {
              return null
            }

            return (
              <button
                key={tab}
                style={{
                  ...styles.tab,
                  ...(activeTab === tab ? styles.tabActive : {}),
                }}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "userManagement" ? "User Management" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            )
          })}
        </div>

        <div style={styles.content}>
          {activeTab === "profile" && (
            <div style={styles.box}>
              <div style={styles.profileContainer}>
                <div style={styles.profileSection}>
                  <div style={styles.avatar}>
                    {profile.ctu_fname?.charAt(0)?.toUpperCase() || "J"}
                    {profile.ctu_lname?.charAt(0)?.toUpperCase() || "S"}
                  </div>
                  <div style={styles.profileInfo}>
                    <h3 style={styles.profileName}>
                      {profile.ctu_fname} {profile.ctu_lname}
                    </h3>
                    <p style={styles.profileUsername}></p>
                  </div>
                </div>

                <div style={styles.formSection}>
                  <div style={styles.sectionHeader}>
                    <h2 style={styles.sectionTitle}>Personal Information</h2>
                    <div style={styles.sectionDivider}></div>
                  </div>

                  <form onSubmit={profileExists ? handleUpdate : handleSave}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Full Name:</label>
                      <div style={styles.nameRow}>
                        <input
                          type="text"
                          name="ctu_fname"
                          value={profile.ctu_fname}
                          onChange={handleChange}
                          readOnly={profileExists && !editing}
                          style={{
                            ...styles.nameInput,
                            backgroundColor: profileExists && !editing ? "#f9fafb" : "#fff",
                            cursor: profileExists && !editing ? "not-allowed" : "text",
                          }}
                        />
                        <input
                          type="text"
                          name="ctu_lname"
                          value={profile.ctu_lname}
                          onChange={handleChange}
                          readOnly={profileExists && !editing}
                          style={{
                            ...styles.nameInput,
                            backgroundColor: profileExists && !editing ? "#f9fafb" : "#fff",
                            cursor: profileExists && !editing ? "not-allowed" : "text",
                          }}
                        />
                      </div>
                      {(errors.ctu_fname || errors.ctu_lname) && (
                        <p style={styles.errorText}>{errors.ctu_fname || errors.ctu_lname}</p>
                      )}
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Email Address:</label>
                      <input
                        type="email"
                        name="ctu_email"
                        value={profile.ctu_email}
                        onChange={handleChange}
                        readOnly={true}
                        style={{
                          ...styles.fullWidthInput,
                          backgroundColor: "#f9fafb",
                          cursor: "not-allowed",
                        }}
                      />
                      {errors.ctu_email && <p style={styles.errorText}>{errors.ctu_email}</p>}
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Phone Number:</label>
                      <input
                        type="text"
                        name="ctu_phonenum"
                        value={profile.ctu_phonenum}
                        onChange={handleChange}
                        readOnly={profileExists && !editing}
                        style={{
                          ...styles.fullWidthInput,
                          backgroundColor: profileExists && !editing ? "#f9fafb" : "#fff",
                          cursor: profileExists && !editing ? "not-allowed" : "text",
                        }}
                      />
                      {errors.ctu_phonenum && <p style={styles.errorText}>{errors.ctu_phonenum}</p>}
                    </div>

                    {!profileExists && (
                      <div style={{ display: "flex", justifyContent: "flex-start", gap: "8px" }}>
                        <button type="submit" style={styles.saveBtn}>
                          Save Changes
                        </button>
                        <button
                          type="button"
                          style={styles.cancelBtn}
                          onClick={() => {
                            setProfile({ ctu_fname: "", ctu_lname: "", ctu_email: "", ctu_phonenum: "" })
                            setErrors({})
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    <div style={{ textAlign: "left" }}>
                      {profileExists && !editing && (
                        <button type="button" style={styles.editBtn} onClick={() => setEditing(true)}>
                          <Edit2 size={16} /> Edit Profile
                        </button>
                      )}
                    </div>

                    {editing && (
                      <div style={{ display: "flex", justifyContent: "flex-start", gap: "8px" }}>
                        <button type="submit" style={styles.saveBtn}>
                          Save Changes
                        </button>
                        <button type="button" style={styles.cancelBtn} onClick={() => setEditing(false)}>
                          Cancel
                        </button>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div
              style={{
                ...styles.box,
                display: "flex",
                gap: "30px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: "300px" }}>
                <h3 style={styles.boxTitle}>Change Password</h3>
                <p style={styles.boxText}>Update your password to keep your account secure.</p>

                <form onSubmit={handlePasswordUpdate}>
                  {[
                    {
                      label: "Current Password",
                      name: "current_password",
                    },
                    { label: "New Password", name: "new_password" },
                    { label: "Confirm New Password", name: "confirm_new_password" },
                  ].map((field) => (
                    <div style={styles.formGroup} key={field.name}>
                      <label style={styles.label}>{field.label}</label>

                      {/* Password input with toggle */}
                      <div style={styles.passwordContainer}>
                        <input
                          type={passwordVisibility[field.name] ? "text" : "password"}
                          name={field.name}
                          value={passwords[field.name]}
                          onChange={handlePasswordChange}
                          style={styles.passwordInput}
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(field.name)}
                          style={styles.passwordToggle}
                        >
                          {passwordVisibility[field.name] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      {/* Error message */}
                      {passwordErrors[field.name] && <p style={styles.errorText}>{passwordErrors[field.name]}</p>}
                    </div>
                  ))}

                  {/* Action buttons */}
                  <button type="submit" style={{ ...styles.saveBtn, backgroundColor: "#2e7d32" }}>
                    Save Changes
                  </button>
                  <button
                    type="button"
                    style={styles.cancelBtn}
                    onClick={() =>
                      setPasswords({
                        current_password: "",
                        new_password: "",
                        confirm_new_password: "",
                      })
                    }
                  >
                    Cancel
                  </button>
                </form>
              </div>

              <div
                style={{
                  flex: 1,
                  minWidth: "250px",
                  backgroundColor: "#f3f4f6",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  alignSelf: "flex-start",
                  marginTop: "45px",
                }}
              >
                <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "15px" }}>Password Requirements</h3>
                <ul style={{ listStyle: "none", paddingLeft: "0", lineHeight: "1.8" }}>
                  {[
                    {
                      rule: "At least 8 characters",
                      key: "length",
                    },
                    { rule: "1 uppercase letter (A-Z)", key: "uppercase" },
                    { rule: "1 lowercase letter (a-z)", key: "lowercase" },
                    { rule: "1 number (0-9)", key: "number" },
                    { rule: "1 special character (!@#$%^&*)", key: "special" },
                  ].map((item) => {
                    const isValid = passwordValidation[item.key]
                    return (
                      <li
                        key={item.rule}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          color: isValid ? "#059669" : "#374151",
                          fontSize: "14px",
                          transition: "color 0.2s ease",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "16px",
                            height: "16px",
                            borderRadius: "50%",
                            backgroundColor: isValid ? "#10b981" : "#e5e7eb",
                            color: isValid ? "white" : "transparent",
                            fontSize: "10px",
                            fontWeight: "bold",
                            transition: "all 0.2s ease",
                          }}
                        >
                          {isValid ? "✓" : ""}
                        </span>
                        {item.rule}
                      </li>
                    )
                  })}
                </ul>
                <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "10px" }}>
                  {Object.values(passwordValidation).every(Boolean) && passwords.new_password
                    ? "✅ Your password meets all requirements!"
                    : "Make sure your password meets all the requirements for a strong and secure account."}
                </p>
              </div>
            </div>
          )}

          {activeTab === "userManagement" ? (
            profile ? (
              profile.ctu_role?.trim().toLowerCase() === "ctu-admin" ? (
                <div style={styles.box}>
                  <h2 style={styles.boxTitle}>User Management</h2>

                  {/* Tabs for Add New / Existing Users */}
                  <div style={styles.userTabs}>
                    <button
                      style={{
                        ...styles.userTab,
                        ...(activeUserTab === "addNew" ? styles.userTabActive : {}),
                      }}
                      onClick={() => setActiveUserTab("addNew")}
                    >
                      Add New User
                    </button>
                    <button
                      style={{
                        ...styles.userTab,
                        ...(activeUserTab === "existing" ? styles.userTabActive : {}),
                      }}
                      onClick={() => setActiveUserTab("existing")}
                    >
                      Existing Users
                    </button>
                  </div>

                  {/* Add New User Form */}
                  {activeUserTab === "addNew" && (
                    <div style={styles.userSection}>
                      <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>First Name</label>
                          <input
                            type="text"
                            style={styles.input}
                            placeholder="Enter first name"
                            value={newUser.firstname}
                            onChange={(e) => handleNewUserChange("firstname", e.target.value)}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Last Name</label>
                          <input
                            type="text"
                            style={styles.input}
                            placeholder="Enter last name"
                            value={newUser.lastname}
                            onChange={(e) => handleNewUserChange("lastname", e.target.value)}
                          />
                        </div>
                      </div>

                      <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Email</label>
                          <input
                            type="email"
                            style={styles.input}
                            placeholder="Enter email"
                            value={newUser.email}
                            onChange={(e) => handleNewUserChange("email", e.target.value)}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Phone Number</label>
                          <input
                            type="tel"
                            style={styles.input}
                            placeholder="Enter phone number"
                            value={newUser.phone}
                            onChange={(e) => handleNewUserChange("phone", e.target.value)}
                          />
                        </div>
                      </div>

                      <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Role</label>
                          <select
                            style={styles.input}
                            value={newUser.ctu_role}
                            onChange={(e) => handleNewUserChange("role", e.target.value)}
                          >
                            <option value="">Select role</option>
                            <option value="Ctu-Vetmed">Ctu-Vetmed</option>
                            <option value="Dvmf">Dvmf</option>
                          </select>
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Password</label>
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <input
                              type={isPasswordVisible ? "text" : "password"}
                              style={styles.passwordInput}
                              placeholder="Enter password"
                              value={newUser.password}
                              onChange={(e) => handleNewUserChange("password", e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={toggleNewUserPasswordVisibility}
                              style={{
                                marginLeft: "5px",
                                cursor: "pointer",
                                border: "none",
                                background: "transparent",
                              }}
                            >
                              {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: "20px", textAlign: "left" }}>
                        <button type="button" style={styles.addUserBtn} onClick={addNewUser}>
                          Add User
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                  {/* ALERT UI */}
                  {alert.show && (
                    <div
                      style={{
                        ...styles.alertBox,
                        ...(alert.type === "success" ? styles.alertSuccess : styles.alertError),
                      }}
                    >
                      {alert.message}
                    </div>
                  )}

                  {/* Existing Users Table */}
                  {activeUserTab === "existing" && (
                    <div style={styles.userSection}>
                      {profiles.filter(
                        (p) => (p.status === "approved" || p.status === "deactivated") && p.role !== "Ctu-Admin", // exclude Ctu-Admin from display
                      ).length === 0 ? (
                        <div style={styles.emptyState}>
                          <Users size={48} />
                          <h3>No users found</h3>
                          <p>Add your first user to get started</p>
                        </div>
                      ) : (
                        <div style={styles.usersTable}>
                          <div style={styles.tableHeader}>
                            <div style={styles.tableHeaderCell}>First Name</div>
                            <div style={styles.tableHeaderCell}>Last Name</div>
                            <div style={styles.tableHeaderCell}>Email</div>
                            <div style={styles.tableHeaderCell}>Phone</div>
                            <div style={styles.tableHeaderCell}>Role</div>
                            <div style={styles.tableHeaderCell}>Status</div>
                            <div style={styles.tableHeaderCell}>Actions</div>
                          </div>

                          {profiles
                            .filter(
                              (p) => (p.status === "approved" || p.status === "deactivated") && p.role !== "Ctu-Admin",
                            )
                            .map((p) => {
                              const displayStatus = p.status === "approved" ? "active" : p.status

                              return (
                                <div key={p.id} style={styles.tableRow}>
                                  <div style={styles.tableCell}>{p.ctu_fname || "-"}</div>
                                  <div style={styles.tableCell}>{p.ctu_lname || "-"}</div>
                                  <div style={styles.tableCell}>{p.ctu_email || "-"}</div>
                                  <div style={styles.tableCell}>{p.ctu_phonenum || "-"}</div>
                                  <div style={styles.tableCell}>
                                    <span style={styles.roleBadge}>{p.role || "-"}</span>
                                  </div>
                                  <div style={styles.tableCell}>
                                    <span
                                      style={{
                                        ...styles.statusBadge,
                                        backgroundColor:
                                          p.status === "approved"
                                            ? "green"
                                            : p.status === "deactivated"
                                              ? "red"
                                              : "gray",
                                      }}
                                    >
                                      {displayStatus}
                                    </span>
                                  </div>
                                  <div style={styles.tableCell}>
                                    <div style={styles.dropdown}>
                                      <button style={styles.dropdownBtn} onClick={() => toggleDropdown(p.id)}>
                                        <MoreVertical size={16} />
                                      </button>

                                      {dropdownOpen === p.id && (
                                        <div style={styles.dropdownMenu}>
                                          {p.status === "approved" && (
                                            <button
                                              style={styles.dropdownItem}
                                              onClick={async () => {
                                                await deactivateUser(p.id)
                                                showAlert("User deactivated successfully!", "success")
                                                setDropdownOpen(null)
                                              }}
                                            >
                                              <Eye size={16} />
                                              Deactivate
                                            </button>
                                          )}

                                          {p.status === "deactivated" && (
                                            <button
                                              style={{
                                                ...styles.dropdownItem,
                                                ...styles.dropdownItemDanger,
                                              }}
                                              onClick={async () => {
                                                await reactivateUser(p.id)
                                                showAlert("User reactivated successfully!", "success")
                                                setDropdownOpen(null)
                                              }}
                                            >
                                              <Check size={16} />
                                              Reactivate
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                // Non-admin: restricted message
                <div style={styles.emptyState}>
                  <Users size={48} />
                  <h3>Restricted Access</h3>
                  <p>You do not have permission to view this section.</p>
                </div>
              )
            ) : (
              <p>Loading...</p>
            )
          ) : null}

          <FloatingMessages />
        </div>
      </div>
    </div>
  )
}

const styles = {
  layout: { display: "flex", minHeight: "100vh", backgroundColor: "#f5f5f5" },
  dashboard: {
    flex: 1,
    fontFamily: "'Segoe UI', Tahoma",
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: "20px 30px",
    borderBottom: "1px solid #eee",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    position: "sticky",
    top: 0,
    zIndex: 10,
    justifyContent: "space-between",
  },
  title: { fontSize: "25px", fontWeight: "bold", color: "#b91c1c" },
  notificationBtn: {
    position: "relative",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    borderRadius: "50%",
  },
  badge: {
    position: "absolute",
    top: "2px",
    right: "2px",
    backgroundColor: "#ef4444",
    color: "#fff",
    borderRadius: "50%",
    padding: "2px 6px",
    fontSize: "12px",
    fontWeight: "bold",
  },
  tabs: {
    display: "flex",
    gap: "25px",
    marginBottom: "25px",
    marginTop: "20px",
    marginLeft: "20px",
  },
  tab: {
    padding: "6px 0",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    color: "#555",
  },
  tabActive: {
    fontWeight: "bold",
    borderBottom: "3px solid #b91c1c",
    transform: "scale(1.05)",
    color: "#b91c1c",
  },
  content: {},
  box: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "20px 20px",
    marginBottom: "20px",
    boxShadow: "0 3px 10px rgba(0,0,0,0.05)",
    marginLeft: "20px",
    width: "calc(100% - 40px)",
    maxWidth: "none",
  },
  boxTitle: { fontSize: "20px", fontWeight: "600", marginBottom: "10px" },
  boxText: { color: "#555", marginBottom: "10px", fontStyle: "italic", fontSize: "14px" },
  formGroup: {
    flex: 1,
    minWidth: "200px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    position: "relative",
  },
  label: { fontWeight: "500", marginBottom: "3px" },
  input: {
    padding: "8px 12px",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
    transition: "all 0.2s ease",
  },
  editBtn: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 12px",
    backgroundColor: "#f59e0b",
    color: "#fff",
    border: "none",
    borderRadius: "20px",
    fontWeight: "bold",
    fontSize: "13px",
    cursor: "pointer",
    marginTop: "20px", // pushes the button all the way to the left
  },
  saveBtn: {
    padding: "6px 16px",
    backgroundColor: "#2e7d32",
    color: "#fff",
    border: "none",
    borderRadius: "20px",
    fontWeight: "bold",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    alignSelf: "flex-start",
    marginTop: "20px", // Added margin on top
  },
  cancelBtn: {
    padding: "6px 16px",
    backgroundColor: "#9ca3af",
    color: "#fff",
    border: "none",
    borderRadius: "20px",
    fontWeight: "bold",
    fontSize: "13px",
    cursor: "pointer",
    marginLeft: "8px",
    transition: "all 0.2s ease",
    alignSelf: "flex-start",
    marginTop: "20px",
  },
  errorText: {
    color: "#ef4444",
    fontSize: "12px",
    position: "absolute",
    bottom: "-18px",
    margin: 0,
    right: "0",
  },
  profileContainer: {
    display: "flex",
    gap: "90px",
    alignItems: "flex-start",
  },
  profileSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: "200px",
    flex: "0 0 auto",
    marginRight: "100px", // <-- added margin right
  },
  formSection: {
    flex: 1,
    minWidth: "400px",
  },
  profileHeader: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    marginBottom: "32px",
    padding: "0",
    backgroundColor: "transparent",
    borderRadius: "0",
  },
  avatar: {
    width: "140px",
    height: "140px",
    borderRadius: "50%",
    backgroundColor: "#e5e7eb",
    color: "#6a6e77ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "32px",
    fontWeight: "600",
    border: "3px solid #f3f4f6",
    marginTop: "50px",
    marginLeft: "100px", // <-- added margin right
  },
  profileInfo: {
    textAlign: "center",
    marginLeft: "100px",
  },
  profileName: {
    fontSize: "20px",
    fontWeight: "600",
    margin: "0 0 4px 0",
    color: "#333",
  },
  profileUsername: {
    fontSize: "14px",
    color: "#6b7280",
    margin: "0",
    fontWeight: "400",
  },
  userTabs: {
    display: "flex",
    borderBottom: "1px solid #e5e7eb",
    marginBottom: "24px",
  },
  userTab: {
    padding: "12px 24px",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  userTabActive: {
    color: "#b91c1c",
    borderBottomColor: "#b91c1c",
    backgroundColor: "#fee2e2",
  },
  userSection: {
    padding: "16px 0",
  },
  formRow: {
    display: "flex",
    gap: "20px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  sectionHeader: {
    marginBottom: "24px",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#D2691E",
    marginBottom: "8px",
  },
  sectionDivider: {
    height: "3px",
    backgroundColor: "#D2691E",
    width: "100%",
    borderRadius: "2px",
  },
  nameRow: {
    display: "flex",
    gap: "12px",
  },
  nameInput: {
    flex: 1,
    padding: "12px 16px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
    transition: "all 0.2s ease",
  },
  fullWidthInput: {
    width: "100%",
    padding: "12px 16px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
    transition: "all 0.2s ease",
  },
  passwordContainer: {
    position: "relative",
    width: "100%",
  },
  passwordInput: {
    width: "100%",
    padding: "12px 36px 12px 12px", // space for toggle icon
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    transition: "all 0.2s ease",
  },
  passwordToggle: {
    position: "absolute",
    top: "50%",
    right: "12px",
    transform: "translateY(-50%)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "#6b7280",
    padding: "0",
    lineHeight: "1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  addUserBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    backgroundColor: "#2e7d32",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "40px",
    color: "#6b7280",
    gap: "10px",
  },
  usersTable: {
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    overflow: "hidden",
    maxHeight: "400px", // adjust height as needed
    overflowY: "auto", // enables vertical scrolling
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 2fr 1fr 1fr 1fr 80px",
    backgroundColor: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
  },
  tableHeaderCell: {
    padding: "12px",
    fontSize: "12px",
    fontWeight: "600",
    color: "#374151",
    textTransform: "uppercase",
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 2fr 1fr 1fr 1fr 80px",
    borderBottom: "1px solid #e5e7eb",
  },
  tableCell: {
    padding: "12px",
    fontSize: "14px",
    color: "#374151",
    display: "flex",
    alignItems: "center",
  },
  roleBadge: {
    padding: "4px 8px",
    backgroundColor: "#dbeafe",
    color: "#1e40af",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "500",
  },
  statusBadge: {
    padding: "4px 8px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "500",
    color: "#fff", // red for deactivated
    backgroundColor: "#52c41a", // green for active
  },
  dropdown: {
    position: "relative",
  },
  dropdownBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px",
  },
  dropdownMenu: {
    position: "absolute",
    right: "0",
    top: "100%",
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    zIndex: 10,
    minWidth: "120px",
  },
  dropdownItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
    padding: "8px 12px",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    color: "#374151",
  },
  dropdownItemDanger: {
    color: "#dc2626",
  },
  alertBox: {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "14px 24px",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: "600",
    color: "white",
    boxShadow: "0 6px 14px rgba(0,0,0,0.2)",
    zIndex: 1000,
    textAlign: "center",
    minWidth: "250px",
    maxWidth: "500px",
    transition: "opacity 0.3s ease-in-out",
  },
  alertSuccess: {
    backgroundColor: "#16a34a", // green
  },
  alertError: {
    backgroundColor: "#dc2626", // red
  },
}

export default CtuSettings
