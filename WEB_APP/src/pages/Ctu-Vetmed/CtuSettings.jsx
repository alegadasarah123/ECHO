"use client"

import Sidebar from "@/components/CtuSidebar"
import { Bell, Edit2, Eye, EyeOff, MoreVertical, Plus, Trash2, Users } from "lucide-react"
import { useEffect, useState } from "react"
import FloatingMessages from "./CtuMessage"
import NotificationModal from "./CtuNotif"

const API_BASE = "http://127.0.0.1:8000/api/ctu_vetmed";

const CtuSettings = () => {
  const [activeTab, setActiveTab] = useState("profile")
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifsOpen, setNotifsOpen] = useState(false)
  const [errors, setErrors] = useState({})
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true);

  const [profileExists, setProfileExists] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState({})
  const [notifications, setNotifications] = useState([])
  const [profile, setProfile] = useState({
    ctu_fname: "",
    ctu_lname: "",
    ctu_email: "",
    ctu_phonenum: "",
  })

  


  const [passwordVisibility, setPasswordVisibility] = useState({
    current_password: false,
    new_password: false,
    confirm_new_password: false,
  })

  const [activeUserTab, setActiveUserTab] = useState("addNew")
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(null)
  const [newUser, setNewUser] = useState({
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    role: "",
    password: "",
  })
  const [error, setError] = useState("");
  const [activeSettingsView, setActiveSettingsView] = useState("userManagement");
  const [isLoading, setIsLoading] = useState(false);
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
  e.preventDefault();
  setErrors({});

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
    });

    const data = await res.json();

    if (res.ok) {
      alert("Profile saved successfully!");
      setEditing(false);
      setProfileExists(true);
    } else if (data.errors) {
      // Display validation errors next to inputs
      setErrors(data.errors);
    } else {
      // Any other server error
      alert(data.error || "Failed to save profile");
    }
  } catch (error) {
    console.error("Error saving profile:", error);
    alert("Something went wrong. Please try again.");
  }
};

// Update existing CTU Vet profile
const handleUpdate = async (e) => {
  e.preventDefault();
  setErrors({});

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
    });

    const data = await res.json();

    if (res.ok) {
      alert("Profile updated successfully!");
      setEditing(false);
    } else if (data.errors) {
      setErrors(data.errors);
    } else {
      alert(data.error || "Failed to update profile");
    }
  } catch (error) {
    console.error("Error updating profile:", error);
    alert("Something went wrong. Please try again.");
  }
};


  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswords((prev) => ({ ...prev, [name]: value }))
  }


// Handle password update
const handlePasswordUpdate = async (e) => {
  e.preventDefault();
  setPasswordErrors({});

  // 1️⃣ Client-side validation
  if (passwords.new_password !== passwords.confirm_new_password) {
    setPasswordErrors({ confirm_new_password: "Passwords do not match" });
    return;
  }

  try {
    const res = await fetch("http://localhost:8000/api/ctu_change_password/", {
      method: "POST",
      credentials: "include", // include the HttpOnly cookie
      headers: {
        "Content-Type": "application/json", // no Authorization header needed
      },
      body: JSON.stringify({
        old_password: passwords.old_password,
        new_password: passwords.new_password,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      alert("Password updated successfully!");
      setPasswords({ old_password: "", new_password: "", confirm_new_password: "" });
    } else if (data.errors) {
      setPasswordErrors(data.errors);
    } else {
      alert(data.error || "Failed to update password.");
    }

  } catch (error) {
    console.error("Error updating password:", error);
    alert("Something went wrong. Please try again.");
  }
};


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
  const { firstname, lastname, email, phone, password, role } = newUser;

  // Validate input
  if (!firstname || !lastname || !email || !phone || !password || !role) {
    alert("Please fill in all required fields.");
    return;
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    alert("Please enter a valid email address.");
    return;
  }

  const payload = {
    email: email.trim().toLowerCase(),
    firstName: firstname.trim(),
    lastName: lastname.trim(),
    phoneNumber: phone.trim(),
    password: password.trim(),
    role: role.trim(),
  };

  try {
    const response = await fetch(`${API_BASE}/signup/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let data;
    try {
      data = await response.json();
    } catch (err) {
      data = { error: await response.text() };
    }

    if (!response.ok) {
      console.error("Signup failed:", data);
      alert(data.error || data.details || "Unknown error occurred during signup.");
      return;
    }

    // If profile already exists
    if (data.message === "Profile already exists.") {
      alert("This user profile already exists!");
      return;
    }

    // Update users list in UI
    setUsers((prev) => [
      ...prev,
      {
        id: data.user.id,
        firstname: data.user.firstName,
        lastname: data.user.lastName,
        email: data.user.email,
        phone: data.user.phoneNumber,
        role: data.user.role || "Ctu-Vetmed",
        status: "Active",
      },
    ]);

    // Clear form
    setNewUser({ firstname: "", lastname: "", email: "", phone: "", password: "", role: "" });

    alert("User created successfully!");
    setActiveSettingsView("userManagement");
  
  } catch (err) {
    console.error("Error adding user:", err);
    alert("Failed to add user. Make sure the backend server is running.");
  }
};



  const deactivateUser = (userId) => {
    console.log("[v0] Deactivating user:", userId)
    alert("User deactivated successfully!")
  }

  const deleteUser = (userId) => {
    console.log("[v0] Deleting user:", userId)
    alert("User deleted successfully!")
  }

  const toggleDropdown = (userId) => {
    setDropdownOpen((prev) => (prev === userId ? null : userId))
  }



// Fetch CTU Vet profile
useEffect(() => {
  const fetchProfile = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/ctu_vetmed/get_ctu_vet_profiles/", {
        method: "GET",
        credentials: "include", // include HttpOnly cookie
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Failed to fetch profile:", data.error || "Unknown error");
        return;
      }

      // Set profile state
      setProfile({
        ctu_fname: data.ctu_fname || "",
        ctu_lname: data.ctu_lname || "",
        ctu_email: data.ctu_email || "",
        ctu_phonenum: data.ctu_phonenum || "",
      });

      if (data.ctu_fname || data.ctu_lname || data.ctu_phonenum) {
        setProfileExists(true);
      }

    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  fetchProfile();
}, []);







  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.dashboard}>
        <div style={styles.header}>
          <h1 style={styles.title}>Settings</h1>
          <div style={{ position: "relative" }}>
            <button style={styles.notificationBtn} onClick={() => setNotifsOpen(!notifsOpen)}>
              <Bell size={24} color="#374151" />
              {/*<span style={styles.badge}></span>*/}
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
          {["profile", "security", "userManagement"].map((tab) => (
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
          ))}
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
                    { label: "Current Password", name: "current_password" },
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
                    "At least 8 characters",
                    "1 uppercase letter (A-Z)",
                    "1 lowercase letter (a-z)",
                    "1 number (0-9)",
                    "1 special character (!@#$%^&*)",
                  ].map((rule) => (
                    <li
                      key={rule}
                      style={{ display: "flex", alignItems: "center", gap: "8px", color: "#374151", fontSize: "14px" }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: "16px",
                          height: "16px",
                          borderRadius: "50%",
                          backgroundColor: "#e5e7eb",
                        }}
                      ></span>
                      {rule}
                    </li>
                  ))}
                </ul>
                <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "10px" }}>
                  Make sure your password meets all the requirements for a strong and secure account.
                </p>
              </div>
            </div>
          )}

          {activeTab === "userManagement" && (
            <div style={styles.box}>
              <h2 style={styles.boxTitle}>User Management</h2>

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

              {activeUserTab === "addNew" && (
  <div style={styles.userSection}>
    
    {/* First and Last Name */}
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

    {/* Email and Phone */}
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

    {/* Role and Password */}
    <div style={styles.formRow}>
      <div style={styles.formGroup}>
        <label style={styles.label}>Role</label>
        <select
          style={styles.input}
          value={newUser.role}
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
            style={{ marginLeft: "5px", cursor: "pointer", border: "none", background: "transparent" }}
          >
            {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
    </div>

    {/* Submit Button */}
    <div style={{ marginTop: "20px", textAlign: "left" }}>
      <button
        type="button"
        style={styles.addUserBtn}
        onClick={addNewUser}
        // loading state
      >
        Add User
        <Plus size={16}  /> 
      </button>
    </div>
  </div>
)}

              {activeUserTab === "existing" && (
                <div style={styles.userSection}>
                  {profiles.length === 0 ? (
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

                      {profiles.map((profile) => (
                        <div key={profile.id} style={styles.tableRow}>
                          <div style={styles.tableCell}>{profile.ctu_fname}</div>
                          <div style={styles.tableCell}>{profile.ctu_lname}</div>
                          <div style={styles.tableCell}>{profile.ctu_email}</div>
                          <div style={styles.tableCell}>{profile.ctu_phonenum}</div>
                          <div style={styles.tableCell}>
                            <span style={styles.roleBadge}>{profile.role}</span>
                          </div>
                          <div style={styles.tableCell}>
                            <span style={styles.statusBadge}>{profile.status}</span>
                          </div>
                          <div style={styles.tableCell}>
                            <div style={styles.dropdown}>
                              <button style={styles.dropdownBtn} onClick={() => toggleDropdown(profile.id)}>
                                <MoreVertical size={16} />
                              </button>
                              {dropdownOpen === profile.id && (
                                <div style={styles.dropdownMenu}>
                                  <button
                                    style={styles.dropdownItem}
                                    onClick={() => {
                                      deactivateUser(profile.id)
                                      setDropdownOpen(null)
                                    }}
                                  >
                                    <Eye size={16} />
                                    Deactivate
                                  </button>
                                  <button
                                    style={{ ...styles.dropdownItem, ...styles.dropdownItemDanger }}
                                    onClick={() => {
                                      deleteUser(profile.id)
                                      setDropdownOpen(null)
                                    }}
                                  >
                                    <Trash2 size={16} />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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
    padding: "3px",
  },
  badge: {
    position: "absolute",
    top: "0",
    right: "0",
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
    backgroundColor: "#dcfce7",
    color: "#166534",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "500",
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
}

export default CtuSettings
