import { useState, useEffect } from "react";
import Sidebar from "@/components/KutSidebar";
import { Bell, Edit2, Shield, User, HelpCircle, CheckCircle } from "lucide-react";
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

    const getRoleDisplayName = (role) => {
    switch (role?.toLowerCase()) {
      case 'kutsero': return 'Kutsero';
      case 'horse_operator': return 'Horse Operator';
      default: return role;
    }
  };

  const styles = {
    settingsLayout: {
      display: 'flex',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%)',
      fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    },
    settingsDashboard: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
    },
    settingsHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: '#fff',
      padding: '1.5rem 2rem',
      borderBottom: '1px solid #e1e5eb',
      boxShadow: '0 2px 15px rgba(0, 0, 0, 0.05)',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    },
    notificationContainer: {
      position: 'relative',
    },
    notificationBtnHover: {
      background: '#edf2f7',
      transform: 'translateY(-2px)',
    },
    notificationBadge: {
      position: 'absolute',
      top: '-5px',
      right: '-5px',
      background: '#e53e3e',
      color: 'white',
      borderRadius: '50%',
      width: '20px',
      height: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.7rem',
      fontWeight: 'bold',
    },
    settingsTabs: {
      display: 'flex',
      gap: 0,
      margin: '1.5rem 0 0 2rem',
      borderBottom: '1px solid #e1e5eb',
    },
    settingsTab: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.75rem 1.5rem',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      fontSize: '0.95rem',
      color: '#718096',
      transition: 'all 0.3s ease',
      borderBottom: '3px solid transparent',
    },
    settingsTabHover: {
      color: '#4299e1',
      background: '#f8f9fa',
    },
    settingsTabActive: {
      color: '#3182ce',
      borderBottom: '3px solid #3182ce',
      fontWeight: '600',
    },
    settingsContent: {
      padding: '2rem',
      overflowY: 'auto',
      flex: 1,
    },
    settingsBox: {
      background: '#fff',
      borderRadius: '12px',
      padding: '2rem',
      marginBottom: '1.5rem',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    },
    settingsBoxHover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.08)',
    },
    boxHeader: {
      marginBottom: '1.5rem',
    },
    boxTitle: {
      fontSize: '1.5rem',
      fontWeight: '600',
      color: '#2d3748',
      margin: '0 0 0.5rem 0',
    },
    boxText: {
      color: '#718096',
      margin: 0,
      fontSize: '0.95rem',
    },
    profileForm: {
      maxWidth: '600px',
    },
    formRow: {
      display: 'flex',
      gap: '1rem',
    },
    formRowGroup: {
      flex: 1,
    },
    formGroup: {
      marginBottom: '1.25rem',
      position: 'relative',
    },
    formLabel: {
      display: 'block',
      fontWeight: '500',
      marginBottom: '0.5rem',
      color: '#4a5568',
    },
    formInput: {
      width: '100%',
      padding: '0.75rem 1rem',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '0.95rem',
      transition: 'all 0.3s ease',
      background: '#fff',
      boxSizing: 'border-box',
    },
    formInputFocus: {
      outline: 'none',
      borderColor: '#4299e1',
      boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.15)',
    },
    formInputReadonly: {
      width: '100%',
      padding: '0.75rem 1rem',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '0.95rem',
      background: '#f7fafc',
      color: '#718096',
      cursor: 'not-allowed',
      boxSizing: 'border-box',
    },
    formTextarea: {
      resize: 'vertical',
      minHeight: '120px',
      width: '100%',
      padding: '0.75rem 1rem',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '0.95rem',
      transition: 'all 0.3s ease',
      background: '#fff',
      boxSizing: 'border-box',
    },
    formTextareaFocus: {
      outline: 'none',
      borderColor: '#4299e1',
      boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.15)',
    },
    errorText: {
      color: '#e53e3e',
      fontSize: '0.85rem',
      margin: '0.25rem 0 0 0',
      position: 'absolute',
      bottom: '-20px',
      right: 0,
    },
    formButtons: {
      display: 'flex',
      gap: '0.75rem',
      marginTop: '1.5rem',
    },
    btnPrimary: {
      padding: '0.75rem 1.5rem',
      background: '#3182ce',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontWeight: '600',
      fontSize: '0.95rem',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    btnPrimaryHover: {
      background: '#2b6cb0',
      transform: 'translateY(-2px)',
    },
    btnSecondary: {
      padding: '0.75rem 1.5rem',
      background: '#a0aec0',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontWeight: '600',
      fontSize: '0.95rem',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    btnSecondaryHover: {
      background: '#718096',
      transform: 'translateY(-2px)',
    },
    btnEdit: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.75rem 1.5rem',
      background: '#ed8936',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontWeight: '600',
      fontSize: '0.95rem',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      marginTop: '1.5rem',
    },
    btnEditHover: {
      background: '#dd6b20',
      transform: 'translateY(-2px)',
    },
    securityContainer: {
      display: 'flex',
      gap: '2rem',
      flexWrap: 'wrap',
    },
    securityBox: {
      flex: 1,
      minWidth: '300px',
    },
    passwordRequirements: {
      flex: 1,
      minWidth: '250px',
      background: '#f8fafc',
      borderRadius: '12px',
      padding: '1.5rem',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
      alignSelf: 'flex-start',
    },
    passwordRequirementsH3: {
      fontSize: '1.1rem',
      fontWeight: '600',
      marginBottom: '1rem',
      color: '#2d3748',
    },
    passwordRequirementsUl: {
      listStyle: 'none',
      padding: 0,
      margin: '0 0 1rem 0',
    },
    passwordRequirementsLi: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginBottom: '0.75rem',
      color: '#4a5568',
      fontSize: '0.9rem',
    },
    passwordRequirementsP: {
      fontSize: '0.85rem',
      color: '#718096',
      margin: 0,
      lineHeight: 1.5,
    },
    media768: {
      settingsHeader: {
        padding: '1rem',
      },
      settingsTabs: {
        marginLeft: '1rem',
        overflowX: 'auto',
      },
      settingsContent: {
        padding: '1rem',
      },
      formRow: {
        flexDirection: 'column',
        gap: 0,
      },
      securityContainer: {
        flexDirection: 'column',
      },
      passwordRequirements: {
        width: '100%',
      },
    },
    header: { padding: "16px 32px", backgroundColor: "#fff", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)", borderBottom: "1px solid #eaeaea", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#ffffff", flexShrink: 0 },
    headerContent: { display: "flex", flexDirection: "column", gap: "4px" },
    title: { fontSize: "24px", fontWeight: "600", color: "#D2691E", margin: 0 },
    subtitle: { fontSize: "14px", color: "#666", margin: 0, fontWeight: "400" },
    notificationBtn: { background: "none", border: "none", cursor: "pointer", padding: "8px", borderRadius: "50%", position: "relative", transition: "background-color 0.2s ease" },
    badge: { position: "absolute", top: "-4px", right: "-4px", backgroundColor: "#ef4444", color: "white", borderRadius: "50%", width: "18px", height: "18px", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }
  };
  
  return (
    <div style={styles.settingsLayout}>
      <Sidebar />
      <div style={styles.settingsDashboard}>
        {/* Header Section */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>Settings</h1>
            <p style={styles.subtitle}>Manage your profile, security, and support options</p>
          </div>

          {/* Notification Bell */}
          <div style={{ position: "relative" }}>
            <button
              style={styles.notificationBtn}
              onClick={() => setNotifOpen(!notifOpen)}
              aria-label="Notifications"
            >
              <Bell size={24} color="#4B5563" />
              <span style={styles.badge}></span>
            </button>
          </div>
        </div>

        <div style={styles.settingsTabs}>
          <button
            style={{...styles.settingsTab, ...(activeTab === "profile" ? styles.settingsTabActive : {})}}
            onClick={() => setActiveTab("profile")}
          >
            <User size={18} />
            Profile
          </button>
          <button
            style={{...styles.settingsTab, ...(activeTab === "security" ? styles.settingsTabActive : {})}}
            onClick={() => setActiveTab("security")}
          >
            <Shield size={18} />
            Security
          </button>
          <button
            style={{...styles.settingsTab, ...(activeTab === "support" ? styles.settingsTabActive : {})}}
            onClick={() => setActiveTab("support")}
          >
            <HelpCircle size={18} />
            Support
          </button>
        </div>

        <div style={styles.settingsContent}>
          {activeTab === "profile" && (
            <div style={styles.settingsBox}>
              <div style={styles.boxHeader}>
                <h2 style={styles.boxTitle}>Personal Information</h2>
                <p style={styles.boxText}>Update your personal info and contact details here.</p>
              </div>
              
              <form onSubmit={profileExists ? handleUpdate : handleSave} style={styles.profileForm}>
                <div style={styles.formRow}>
                  {["pres_fname", "pres_lname"].map((field) => {
                    const label = field === "pres_fname" ? "First Name" : "Last Name";
                    const isReadOnly = profileExists ? !editing : field === "pres_email";

                    return (
                      <div style={styles.formRowGroup} key={field}>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>{label}</label>
                          <input
                            type="text"
                            name={field}
                            value={profile[field]}
                            onChange={handleChange}
                            readOnly={isReadOnly}
                            style={isReadOnly ? styles.formInputReadonly : styles.formInput}
                          />
                          {errors[field] && <p style={styles.errorText}>{errors[field]}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Email</label>
                  <input
                    type="email"
                    name="pres_email"
                    value={profile.pres_email}
                    onChange={handleChange}
                    readOnly={!profileExists || !editing}
                    style={!profileExists || !editing ? styles.formInputReadonly : styles.formInput}
                  />
                  {errors.pres_email && <p style={styles.errorText}>{errors.pres_email}</p>}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Contact Number</label>
                  <input
                    type="text"
                    name="pres_phonenum"
                    value={profile.pres_phonenum}
                    onChange={handleChange}
                    readOnly={profileExists ? !editing : false}
                    style={profileExists && !editing ? styles.formInputReadonly : styles.formInput}
                  />
                  {errors.pres_phonenum && <p style={styles.errorText}>{errors.pres_phonenum}</p>}
                </div>

                {/* Buttons */}
                {!profileExists && (
                  <div style={styles.formButtons}>
                    <button type="submit" style={styles.btnPrimary}>
                      Save Changes
                    </button>
                    <button
                      type="button"
                      style={styles.btnSecondary}
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
                    style={styles.btnEdit}
                    onClick={() => setEditing(true)}
                  >
                    <Edit2 size={16} /> Edit Profile
                  </button>
                )}

                {editing && (
                  <div style={styles.formButtons}>
                    <button type="submit" style={styles.btnPrimary}>
                      Save Changes
                    </button>
                    <button
                      type="button"
                      style={styles.btnSecondary}
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
            <div style={styles.securityContainer}>
              <div style={styles.settingsBox}>
                <div style={styles.boxHeader}>
                  <h2 style={styles.boxTitle}>Change Password</h2>
                  <p style={styles.boxText}>Enter your current password and choose a new one to update security.</p>
                </div>
                
                <form onSubmit={handlePasswordUpdate} style={styles.passwordForm}>
                  {[
                    { label: "Current Password", name: "current_password" },
                    { label: "New Password", name: "new_password" },
                    { label: "Confirm New Password", name: "confirm_new_password" },
                  ].map((field) => (
                    <div style={styles.formGroup} key={field.name}>
                      <label style={styles.formLabel}>{field.label}</label>
                      <input
                        type="password"
                        name={field.name}
                        value={passwords[field.name]}
                        onChange={handlePasswordChange}
                        style={styles.formInput}
                      />
                      {passwordErrors[field.name] && (
                        <p style={styles.errorText}>{passwordErrors[field.name]}</p>
                      )}
                    </div>
                  ))}
                  
                  <div style={styles.formButtons}>
                    <button type="submit" style={styles.btnPrimary}>
                      Update Password
                    </button>
                    <button
                      type="button"
                      style={styles.btnSecondary}
                      onClick={() => setPasswords({ current_password: "", new_password: "", confirm_new_password: "" })}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>

              <div style={styles.passwordRequirements}>
                <h3 style={styles.passwordRequirementsH3}>Password Requirements</h3>
                <ul style={styles.passwordRequirementsUl}>
                  {[
                    "At least 8 characters",
                    "1 uppercase letter (A-Z)",
                    "1 lowercase letter (a-z)",
                    "1 number (0-9)",
                    "1 special character (!@#$%^&*)",
                  ].map((rule) => (
                    <li key={rule} style={styles.passwordRequirementsLi}>
                      <CheckCircle size={16} />
                      {rule}
                    </li>
                  ))}
                </ul>
                <p style={styles.passwordRequirementsP}>
                  Make sure your password meets all the requirements for a strong and secure account.
                </p>
              </div>
            </div>
          )}

          {activeTab === "support" && (
            <div style={styles.settingsBox}>
              <div style={styles.boxHeader}>
                <h2 style={styles.boxTitle}>Contact Support</h2>
                <p style={styles.boxText}>Having issues? Our support team is here to help.</p>
              </div>
              
              <form style={styles.supportForm}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Your Message</label>
                  <textarea
                    rows={5}
                    placeholder="Describe your issue..."
                    style={styles.formTextarea}
                  />
                </div>
                <button type="submit" style={styles.btnPrimary}>
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

export default SettingsPage;