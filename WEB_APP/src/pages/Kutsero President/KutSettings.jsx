import { useState, useEffect } from "react";
import Sidebar from "@/components/KutSidebar";
import { Bell, Edit2 } from "lucide-react";
import NotificationModal from "./KutNotif";
import FloatingMessages from './KutMessages';

const API_BASE = "http://localhost:8000/api/kutsero_president";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [notifOpen, setNotifOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [editing, setEditing] = useState(false);
  const [profileExists, setProfileExists] = useState(false); 
  const [passwordErrors, setPasswordErrors] = useState({});
  const [profile, setProfile] = useState({
    pres_fname: "",
    pres_lname: "",
    pres_email: "",
    pres_phonenum: "",
  });

    const [passwords, setPasswords] = useState({
    current_password: "",
    new_password: "",
    confirm_new_password: "",
  });


  // Fetch profile 
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE}/get_president_profile/`, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          const data = await res.json();
          console.error("Failed to fetch profile:", data.error);
          return;
        }

        const data = await res.json();
        setProfile({
          pres_fname: data.pres_fname || "",
          pres_lname: data.pres_lname || "",
          pres_email: data.pres_email || "",
          pres_phonenum: data.pres_phonenum || "",
        });
        if (data.pres_fname || data.pres_lname || data.pres_phonenum) {
          setProfileExists(true);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // Save first-time profile (no email changes)
  const handleSave = async (e) => {
    e.preventDefault();
    setErrors({});

    try {
      const res = await fetch(`${API_BASE}/save_president_profile/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pres_fname: profile.pres_fname,
          pres_lname: profile.pres_lname,
          pres_phonenum: profile.pres_phonenum,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Profile saved successfully!");
        setEditing(false);
        setProfileExists(true);
      } else if (data.errors) {
        setErrors(data.errors);
      } else {
        alert(data.error || "Failed to save profile");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Something went wrong.");
    }
  };

  // Update profile (all fields editable)
  const handleUpdate = async (e) => {
    e.preventDefault();
    setErrors({});

    try {
      const res = await fetch(`${API_BASE}/update_president_profile/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pres_fname: profile.pres_fname,
          pres_lname: profile.pres_lname,
          pres_email: profile.pres_email,
          pres_phonenum: profile.pres_phonenum,
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
      alert("Something went wrong.");
    }
  };

// Handle input changes for password fields
const handlePasswordChange = (e) => {
  const { name, value } = e.target;
  setPasswords((prev) => ({ ...prev, [name]: value }));
};

// Handle password update
const handlePasswordUpdate = async (e) => {
  e.preventDefault();
  setPasswordErrors({});

  if (passwords.new_password !== passwords.confirm_new_password) {
    setPasswordErrors({ confirm_new_password: "Passwords do not match" });
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/change_password/`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: profile.pres_email, 
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      alert("Password updated successfully!");
      setPasswords({ current_password: "", new_password: "", confirm_new_password: "" });
    } else if (data.errors) {
      setPasswordErrors(data.errors);
    } else {
      alert(data.error || "Failed to update password");
    }
  } catch (err) {
    console.error("Password update error:", err);
    alert("Something went wrong.");
  }
};

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.dashboard}>
        <div style={styles.header}>
          <h1 style={styles.title}>Settings</h1>
          <div style={{ position: "relative" }}>
            <button
              style={styles.notificationBtn}
              onClick={() => setNotifOpen(!notifOpen)}
            >
              <Bell size={24} color="#374151" />
              <span style={styles.badge}>3</span>
            </button>
          </div>
        </div>

        <div style={styles.tabs}>
          {["profile", "security", "support"].map((tab) => (
            <button
              key={tab}
              style={{
                ...styles.tab,
                ...(activeTab === tab ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div style={styles.content}>
          {activeTab === "profile" && (
            <div style={styles.box}>
               <p style={styles.boxText}>Update your personal info and contact details here.</p>
                <form onSubmit={profileExists ? handleUpdate : handleSave}>
                  {["pres_fname", "pres_lname", "pres_email", "pres_phonenum"].map(
                    (field) => {
                      const label =
                        field === "pres_fname"
                          ? "First Name"
                          : field === "pres_lname"
                          ? "Last Name"
                          : field === "pres_email"
                          ? "Email"
                          : "Contact Number";

                      let isReadOnly = false;
                      if (profileExists) {
                        isReadOnly = !editing;
                      } else {
                        isReadOnly = field === "pres_email";
                      }

                      return (
                        <div style={styles.formGroup} key={field}>
                          <label style={styles.label}>{label}</label>
                          <input
                            type={field === "pres_email" ? "email" : "text"}
                            name={field}
                            value={profile[field]}
                            onChange={handleChange}
                            readOnly={isReadOnly}
                            style={{
                              ...styles.input,
                              backgroundColor: isReadOnly ? "#f0f0f0" : "#fff",
                              cursor: isReadOnly ? "not-allowed" : "text",
                            }}
                          />
                          {errors[field] && <p style={styles.errorText}>{errors[field]}</p>}
                        </div>
                      );
                    }
                  )}

                  {/* Buttons */}
                {!profileExists && (
                    <div style={{ display: "flex", justifyContent: "flex-start", gap: "8px" }}>
                      <button type="submit" style={styles.saveBtn}>
                        Save Changes
                      </button>
                      <button
                        type="button"
                        style={styles.cancelBtn}
                        onClick={() => {
                          setProfile({ pres_fname: "", pres_lname: "", pres_email: "", pres_phonenum: "" });
                          setErrors({});
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {profileExists && !editing && (
                    <button
                      type="button"
                      style={styles.editBtn}
                      onClick={() => setEditing(true)}
                    >
                      <Edit2 size={16} /> Edit Profile
                    </button>
                  )}

                  {editing && (
                      <div style={{ display: "flex", justifyContent: "flex-start", gap: "8px" }}>
                        <button type="submit" style={styles.saveBtn}>
                          Save Changes
                        </button>
                        <button
                          type="button"
                          style={styles.cancelBtn}
                          onClick={() => setEditing(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                </form>

            </div>
          )}

          {activeTab === "security" && (
              <div
                style={{
                  ...styles.box,display: "flex",gap: "30px",flexWrap: "wrap",}}
              >
                {/* Left side: password form */}
                <div style={{ flex: 1, minWidth: "300px" }}>
                  <p style={styles.boxText}>Enter your current password and choose a new one to update security.</p>
                  <form onSubmit={handlePasswordUpdate}>
                    {[
                      { label: "Current Password", name: "current_password" },
                      { label: "New Password", name: "new_password" },
                      { label: "Confirm New Password", name: "confirm_new_password" },
                    ].map((field) => (
                      <div style={styles.formGroup} key={field.name}>
                        <label style={styles.label}>{field.label}</label>
                        <input
                          type="password"
                          name={field.name}
                          value={passwords[field.name]}
                          onChange={handlePasswordChange}
                          style={{
                            ...styles.input,border: "1px solid #ccc",boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)",transition: "all 0.3s ease",}}
                        />
                        {passwordErrors[field.name] && (
                          <p style={styles.errorText}>{passwordErrors[field.name]}</p>
                        )}
                      </div>
                    ))}
                    <button
                        type="submit"
                        style={{ ...styles.saveBtn, backgroundColor: "#2e7d32" }}
                      >
                        Save Changes
                      </button>
                      <button
                        type="button"
                        style={styles.cancelBtn}
                        onClick={() =>
                          setPasswords({ current_password: "", new_password: "", confirm_new_password: "" })
                        }
                      >
                        Cancel
                      </button>
                  </form>
                </div>

                {/* Right side: password requirements */}
                <div
                  style={{flex: 1,minWidth: "250px",backgroundColor: "#f3f4f6", borderRadius: "12px",padding: "20px",boxShadow: "0 2px 8px rgba(0,0,0,0.05)",alignSelf: "flex-start",marginTop: "45px"}}
                >
                  <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "15px" }}>
                    Password Requirements
                  </h3>
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
                        style={{display: "flex",alignItems: "center",gap: "8px",color: "#374151",fontSize: "14px",}}
                      >
                        <span
                          style={{display: "inline-block",width: "16px",height: "16px",borderRadius: "50%",backgroundColor: "#e5e7eb",}}
                        ></span>
                        {rule}
                      </li>
                    ))}
                  </ul>
                  <p
                    style={{fontSize: "12px", color: "#6b7280", marginTop: "10px",}}
                  >
                    Make sure your password meets all the requirements for a strong and secure account.
                  </p>
                </div>
              </div>
            )}

          {activeTab === "support" && (
            <div style={styles.box}>
              <h2 style={styles.boxTitle}>Contact Support</h2>
              <form>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Your Message</label>
                  <textarea
                    rows={5}
                    placeholder="Describe your issue..."
                    style={{ ...styles.input, resize: "vertical" }}
                  />
                </div>
                <button type="submit" style={styles.saveBtn}>
                  Send Message
                </button>
              </form>
            </div>
          )}
          <FloatingMessages />
        </div>
      </div>
    </div>
  );
};

// Styles unchanged
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
  title: { fontSize: "28px", fontWeight: "bold", color: "#D2691E" },
  notificationBtn: {
    position: "relative",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "8px",
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
    borderBottom: "3px solid #2e7d32",
    transform: "scale(1.05)",
    color: "#2e7d32",
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
    marginBottom: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    maxWidth: "400px",
    position: "relative", // allow absolute positioning for error
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
},
saveBtn: {
  padding: "6px 16px",
  backgroundColor: "#2e7d32",
  color: "#fff",
  border: "none",
  borderRadius: "20px", // capsule-like
  fontWeight: "bold",
  fontSize: "13px",
  cursor: "pointer",
  transition: "all 0.2s ease",
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
},

errorText: {
  color: "#ef4444",
  fontSize: "12px",
  position: "absolute",
  bottom: "-18px", // just below the input
  margin: 0,
  right: "0",  
},


};

export default SettingsPage;
