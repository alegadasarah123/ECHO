import { useState, useEffect } from "react";
import Sidebar from "@/components/KutSidebar";
import { Bell } from "lucide-react";
import NotificationModal from "./KutNotif";

const API_BASE = "http://localhost:8000/api/kutsero_president";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [notifOpen, setNotifOpen] = useState(false);

  const [profile, setProfile] = useState({
    pres_fname: "",
    pres_lname: "",
    pres_email: "",
    pres_phonenum: "",
  });

useEffect(() => {
  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/get_president_profile/`);
      const data = await res.json();
      if (res.ok) {
        setProfile({
          pres_fname: data.pres_fname,
          pres_lname: data.pres_lname,
          pres_email: data.pres_email,
          pres_phonenum: data.pres_phonenum,
          user_id: data.user_id, // ✅ store user_id
        });
      } else {
        console.error("Failed to fetch profile:", data.error);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };
  fetchProfile();
}, []);

  // ✅ handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/update_president_profile/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: profile.user_id, // ✅ send user_id
          pres_fname: profile.pres_fname,
          pres_lname: profile.pres_lname,
          pres_phonenum: profile.pres_phonenum,
        }),      });

      const data = await res.json();
      if (res.ok) {
        alert("Profile updated successfully!");
      } else {
        alert(data.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Something went wrong.");
    }
  };

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.dashboard}>
        {/* Header */}
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

        {/* Tabs */}
        <div style={styles.tabs}>
          {["profile", "security", "support"].map((tab) => (
            <button
              key={tab}
              style={{
                ...styles.tab,
                ...(activeTab === tab ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab(tab)} // ✅ FIXED
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={styles.content}>
          {activeTab === "profile" && (
            <div style={styles.box}>
              <h2 style={styles.boxTitle}>Profile</h2>
              <form onSubmit={handleSave}>
                {/* First Name */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>First Name</label>
                  <input
                    type="text"
                    name="pres_fname"
                    value={profile.pres_fname}
                    onChange={handleChange}
                    style={styles.input}
                  />
                </div>

                {/* Last Name */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Last Name</label>
                  <input
                    type="text"
                    name="pres_lname"
                    value={profile.pres_lname}
                    onChange={handleChange}
                    style={styles.input}
                  />
                </div>

                {/* Email (Read-only) */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Email</label>
                  <input
                    type="email"
                    name="pres_email"
                    value={profile.pres_email}
                    readOnly
                    style={{
                      ...styles.input,
                      backgroundColor: "#f0f0f0",
                      cursor: "not-allowed",
                    }}
                  />
                </div>

                {/* Contact Number */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Contact Number</label>
                  <input
                    type="text"
                    name="pres_phonenum"
                    value={profile.pres_phonenum}
                    onChange={handleChange}
                    style={styles.input}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <button type="submit" style={styles.saveBtn}>
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "security" && (
            <div style={styles.box}>
              <h2 style={styles.boxTitle}>Security Settings</h2>
              <p style={styles.boxText}>Change your password</p>
              {["Current Password", "New Password", "Confirm New Password"].map(
                (label) => (
                  <div style={styles.formGroup} key={label}>
                    <label style={styles.label}>{label}</label>
                    <input type="password" style={styles.input} />
                  </div>
                )
              )}
              <button type="submit" style={styles.saveBtn}>
                Save Changes
              </button>
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
        </div>
      </div>
    </div>
  );
};

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
  boxText: { color: "#555", marginBottom: "10px" },
  formGroup: {
    marginBottom: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    maxWidth: "400px",
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
  saveBtn: {
    padding: "8px 15px",
    backgroundColor: "#2e7d32",
    color: "#fff",
    border: "none",
    borderRadius: "20px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.2s ease",
    alignSelf: "flex-start",
  },
};

export default SettingsPage;
