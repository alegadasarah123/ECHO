"use client"

import Sidebar from "@/components/DvmfSidebar"
import { Bell, Edit2, Eye, EyeOff, RefreshCcw } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import FloatingMessages from "./DvmfMessage"
import NotificationModal from "./DvmfNotif"

const API_BASE = "http://localhost:8000/api/dvmf";

const DvmfSettings = () => {
  const [activeTab, setActiveTab] = useState("profile")
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifsOpen, setNotifsOpen] = useState(false)
  const [errors, setErrors] = useState({})
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("All")
  const navigate = useNavigate()

  const [profileExists, setProfileExists] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState({})
  const [notifications, setNotifications] = useState([])
  const [profile, setProfile] = useState({
    dvmf_fname: "",
    dvmf_lname: "",
    dvmf_email: "",
    dvmf_phonenum: "",
    dvmf_role: "",
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

  const [phoneError, setPhoneError] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setProfile((prev) => ({ ...prev, [name]: value }))
  }

  // MARK ALL NOTIFICATIONS AS READ
  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/dvmf/mark_all_notifications_read/`, {
        method: "POST",
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        throw new Error("Failed to mark all as read");
      }
      
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
      
    } catch (err) {
      showAlert("Error marking notifications as read", "error")
    }
  };

 // HANDLE INDIVIDUAL NOTIFICATION CLICK - UPDATED WITH HORSE OPERATOR & KUTSERO
const handleNotificationClick = async (notification) => {
  const notifId = notification?.notif_id || notification?.id;

  if (!notifId) {
    console.warn("Notification ID is missing:", notification);
  }

  setNotifications((prev) =>
    prev.map((notif) =>
      notif.notif_id === notifId || notif.id === notifId
        ? { ...notif, read: true }
        : notif
    )
  );

  if (notifId) {
    try {
      await fetch(`${API_BASE_URL}/mark_notification_read/${notifId}/`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  }

  const message = (notification.message || "").toLowerCase();
  const type = (notification.type || "").toLowerCase();

  // SOS & Emergency Notifications
  if (
    type === "sos_emergency" ||
    message.includes("sos") ||
    message.includes("emergency") ||
    message.includes("reported") ||
    message.includes("urgent") ||
    (message.includes("horse") && 
     (message.includes("colic") || 
      message.includes("injured") || 
      message.includes("trauma")))
  ) {
    let sosId = null;
    if (notification.related_id && notification.related_id.startsWith("sos_")) {
      sosId = notification.related_id.replace("sos_", "");
    }

    navigate("/DvmfDashboard", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
        sosId: sosId,
      },
    });
    return;
  }

  // VETERINARIAN Account Approvals
  if (
    message.includes("veterinarian") && 
    (message.includes("registration") ||
     message.includes("approved") ||
     message.includes("declined") ||
     message.includes("pending") ||
     message.includes("needs approval"))
  ) {
    navigate("/DvmfAccountApproval", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
        tab: "veterinarian", // ADDED: Specify veterinarian tab
      },
    });
    return;
  }

  // HORSE OPERATOR Account Approvals - NEW
  if (
    message.includes("horse-operator") ||
    message.includes("horse operator") ||
    (message.includes("horse") && message.includes("operator") && 
     (message.includes("registration") || 
      message.includes("approved") || 
      message.includes("declined") || 
      message.includes("pending")))
  ) {
    navigate("/DvmfAccountApproval", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
        tab: "horse-operator", // ADDED: Specify horse-operator tab
      },
    });
    return;
  }

  // KUTSERO Account Approvals - NEW
  if (
    message.includes("kutsero") ||
    (message.includes("registration") && message.includes("kutsero")) ||
    (message.includes("kutsero") && 
     (message.includes("approved") || 
      message.includes("declined") || 
      message.includes("pending")))
  ) {
    navigate("/DvmfAccountApproval", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
        tab: "kutsero", // ADDED: Specify kutsero tab
      },
    });
    return;
  }

  // GENERAL REGISTRATION (catch-all for any registration type)
  if (
    message.includes("new registration") ||
    message.includes("needs approval") ||
    (message.includes("registration") && 
     (message.includes("approved") || 
      message.includes("declined") || 
      message.includes("pending")))
  ) {
    navigate("/DvmfAccountApproval", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
      },
    });
    return;
  }

  // MEDICAL RECORD ACCESS REQUESTS
  if (
    message.includes("medical record") ||
    message.includes("medical access") ||
    message.includes("requested access") ||
    message.includes("medrec") ||
    (message.includes("record") && message.includes("access"))
  ) {
    navigate("/DvmfDashboard", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
        section: "medical-records", // Optional: specify section
      },
    });
    return;
  }

  // COMMENT NOTIFICATIONS
  if (message.includes("comment") || type === "comment") {
    navigate("/DvmfAnnouncement", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
      },
    });
    return;
  }

  // APPOINTMENT NOTIFICATIONS (if you have them)
  if (
    message.includes("appointment") ||
    message.includes("schedule") ||
    type.includes("appointment")
  ) {
    navigate("/DvmfDashboard", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
        section: "appointments",
      },
    });
    return;
  }

  // DEFAULT: Go to dashboard for other notifications
  console.log("Notification clicked - navigating to dashboard:", notification);
  navigate("/DvmfDashboard", {
    state: {
      highlightedNotification: notification,
      shouldHighlight: true,
    },
  });
};

  // Handle notifications update from modal
  const handleNotificationsUpdate = (updatedNotifications) => {
    setNotifications(updatedNotifications);
  };

  const loadNotifications = useCallback(() => {
    fetch(`http://localhost:8000/api/dvmf/get_vetnotifications/`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch notifications")
        return res.json()
      })
      .then((data) => {
        const formatted = data.map((notif) => ({
          id: notif.id,
          message: notif.message,
          date: notif.date || new Date().toISOString(),
          read: notif.read || false,
          type: notif.type || "general"
        }))
        setNotifications(formatted)
      })
      .catch((err) => showAlert("Failed to fetch notifications", "error"))
  }, [])

  // Save first-time DVMF profile
  const handleSave = async (e) => {
    e.preventDefault()
    setErrors({})

    try {
      const res = await fetch(`http://localhost:8000/api/dvmf/save_dvmf_user_profile/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dvmf_fname: profile.dvmf_fname,
          dvmf_lname: profile.dvmf_lname,
          dvmf_email: profile.dvmf_email,
          dvmf_phonenum: profile.dvmf_phonenum,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        showAlert("Profile saved successfully!")
        setEditing(false)
        setProfileExists(true)
      } else if (data.errors) {
        setErrors(data.errors)
      } else {
        showAlert(data.error || "Failed to save profile", "error")
      }
    } catch (error) {
      showAlert("Something went wrong. Please try again.", "error")
    }
  }

  // Update existing DVMF Vet profile
  const handleUpdate = async (e) => {
    e.preventDefault()
    setErrors({})

    try {
      const res = await fetch("http://localhost:8000/api/dvmf/update_dvmf_user_profile/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dvmf_fname: profile.dvmf_fname,
          dvmf_lname: profile.dvmf_lname,
          dvmf_email: profile.dvmf_email,
          dvmf_phonenum: profile.dvmf_phonenum,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        showAlert("Profile updated successfully!")
        setEditing(false)
      } else if (data.errors) {
        setErrors(data.errors)
      } else {
        showAlert(data.error || "Failed to update profile", "error")
      }
    } catch (error) {
      showAlert("Something went wrong. Please try again.", "error")
    }
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswords((prev) => ({ ...prev, [name]: value }))
  }

  const handlePasswordUpdate = async (e) => {
    e.preventDefault()
    setPasswordErrors({})

    if (passwords.new_password !== passwords.confirm_new_password) {
      setPasswordErrors({ confirm_new_password: "Passwords do not match" })
      showAlert("Passwords do not match", "error")
      return
    }

    try {
      const res = await fetch("http://localhost:8000/api/dvmf/dvmf_change_password/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dvmf_email: profile.dvmf_email,
          current_password: passwords.current_password,
          new_password: passwords.new_password,
        }),
      })

      const data = await res.json()

      if (res.status === 401) {
        showAlert("Session expired or not logged in. Please log in again.", "error")
        window.location.href = "/login"
        return
      }

      if (res.ok) {
        showAlert("Password updated successfully!")
        setPasswords({ current_password: "", new_password: "", confirm_new_password: "" })
        return
      }

      if (data.errors) {
        setPasswordErrors(data.errors)
        showAlert(data.error || "Failed to update password", "error")
        return
      }

      showAlert(data.error || "Failed to update password", "error")
    } catch (err) {
      showAlert("Something went wrong. Please try again later.", "error")
    }
  }

  const togglePasswordVisibility = (field) => {
    setPasswordVisibility((prev) => ({
      ...prev,
      [field]: !prev[field],
    }))
  }

  // Manual refresh function
  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        fetchProfile(),
        loadNotifications(),
      ])
      showAlert("Data refreshed successfully!")
    } catch (error) {
      showAlert("Failed to refresh data", "error")
    } finally {
      setIsRefreshing(false)
    }
  }

  // Fetch DVMF profile
  const fetchProfile = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/dvmf/get_dvmf_user_profiles/", {
        method: "GET",
        credentials: "include",
      })

      const data = await res.json()

      if (!res.ok) {
        return
      }

      setProfile({
        dvmf_fname: data.dvmf_fname || "",
        dvmf_lname: data.dvmf_lname || "",
        dvmf_email: data.dvmf_email || "",
        dvmf_phonenum: data.dvmf_phonenum || "",
        dvmf_role: data.dvmf_role || "",
      })

      if (data.dvmf_fname || data.dvmf_lname || data.dvmf_phonenum) {
        setProfileExists(true)
      }
    } catch (err) {
      showAlert("Error fetching profile", "error")
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  // Auto-refresh every 30s
  useEffect(() => {
    loadNotifications()
    const interval = setInterval(() => {
      loadNotifications()
    }, 30000)
    return () => clearInterval(interval)
  }, [loadNotifications])

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
    <div className="flex min-h-screen bg-gray-100">
      {/* Global Alert Message */}
      {alert.show && (
        <div
          className={`fixed top-5 left-1/2 transform -translate-x-1/2 px-6 py-3.5 rounded-xl text-base font-semibold text-white shadow-lg z-50 text-center min-w-[250px] max-w-[500px] transition-all duration-300 ${
            alert.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
          style={{
            animation: "slideDown 0.3s ease-out",
          }}
        >
          {alert.message}
          <button
            onClick={() => setAlert({ show: false, message: "", type: "" })}
            className="ml-3 text-white hover:text-gray-200 bg-transparent border-none cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      <Sidebar />
      <div className="flex-1 font-sans flex flex-col h-screen overflow-hidden">
        <div className="flex items-center bg-white p-5 border-b border-gray-200 shadow-md sticky top-0 z-10 justify-between">
          <h1 className="text-2xl font-bold text-black">Settings</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="bg-transparent border-none cursor-pointer p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
              title="Refresh Settings"
            >
              <RefreshCcw 
                size={24} 
                className={`text-gray-700 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>

            <button
              className="bg-transparent border-none cursor-pointer p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
              onClick={() => setNotifsOpen(!notifsOpen)}
            >
              <Bell size={24} className="text-gray-700" />
            </button>
          </div>

          <NotificationModal
            isOpen={notifsOpen}
            onClose={() => setNotifsOpen(false)}
            notifications={notifications}
            onNotificationClick={handleNotificationClick}
            onMarkAllAsRead={handleMarkAllAsRead}
          />
        </div>

        <div className="flex gap-6 mb-6 mt-5 ml-5">
          {["profile", "security"].map((tab) => (
            <button
              key={tab}
              className={`py-1.5 px-0 bg-transparent border-none cursor-pointer text-base text-gray-600 transition-all duration-200 ${
                activeTab === tab
                  ? "font-bold border-b-2 border-red-700 transform scale-105 text-[#0F3D5A]"
                  : "hover:text-[#0F3D5A]"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === "profile" && (
            <div className="bg-white rounded-xl p-5 mb-5 shadow-sm ml-5 mr-10">
              <div className="flex gap-20 items-start">
                <div className="flex flex-col items-center min-w-[200px] flex-none mr-24">
                  {/* Logo Image instead of initials */}
                  <div className="w-35 h-35 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-gray-100 mt-12 ml-24">
                    <img 
                      src="/Images/dvmf.png"
                      alt="Profile Logo" 
                      className="w-56 h-56 object-cover "
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'flex'
                      }}
                    />
                    <div 
                      className="w-full h-full hidden items-center justify-center text-3xl font-semibold text-gray-500"
                      style={{ display: 'none' }}
                    >
                      {profile.dvmf_fname?.charAt(0)?.toUpperCase() || "J"}
                      {profile.dvmf_lname?.charAt(0)?.toUpperCase() || "S"}
                    </div>
                  </div>
                  <div className="text-center ml-24 mt-4">
                    <h3 className="text-xl font-semibold m-0 text-gray-800">
                      {profile.dvmf_fname} {profile.dvmf_lname}
                    </h3>
                    <p className="text-sm text-gray-500 m-0 font-normal"></p>
                  </div>
                </div>

                <div className="flex-1 min-w-[400px]">
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-orange-600 mb-2">Personal Information</h2>
                    <div className="h-0.5 bg-orange-600 w-full rounded"></div>
                  </div>

                  <form onSubmit={profileExists ? handleUpdate : handleSave}>
                    <div className="flex-1 min-w-[200px] flex flex-col gap-1.5 relative mb-6">
                      <div className="flex gap-3">
                        {/* First Name Field */}
                        <div className="flex-1 flex flex-col gap-1.5">
                          <label className="font-medium mb-1">First Name:</label>
                          <input
                            type="text"
                            name="dvmf_fname"
                            value={profile.dvmf_fname}
                            onChange={handleChange}
                            readOnly={profileExists && !editing}
                            className={`w-full px-4 py-3 border border-gray-300 rounded-md text-sm outline-none transition-all duration-200 ${
                              profileExists && !editing
                                ? "bg-gray-50 cursor-not-allowed"
                                : "bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            }`}
                            placeholder="First Name"
                          />
                        </div>
                        
                        {/* Last Name Field */}
                        <div className="flex-1 flex flex-col gap-1.5">
                          <label className="font-medium mb-1">Last Name:</label>
                          <input
                            type="text"
                            name="dvmf_lname"
                            value={profile.dvmf_lname}
                            onChange={handleChange}
                            readOnly={profileExists && !editing}
                            className={`w-full px-4 py-3 border border-gray-300 rounded-md text-sm outline-none transition-all duration-200 ${
                              profileExists && !editing
                                ? "bg-gray-50 cursor-not-allowed"
                                : "bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            }`}
                            placeholder="Last Name"
                          />
                        </div>
                      </div>
                      {(errors.dvmf_fname || errors.dvmf_lname) && (
                        <p className="text-red-500 text-xs absolute -bottom-4 right-0 m-0">
                          {errors.dvmf_fname || errors.dvmf_lname}
                        </p>
                      )}
                    </div>

                    <div className="flex-1 min-w-[200px] flex flex-col gap-1.5 relative mb-6">
                      <label className="font-medium mb-1">Email Address:</label>
                      <input
                        type="email"
                        name="dvmf_email"
                        value={profile.dvmf_email}
                        onChange={handleChange}
                        readOnly={true}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm outline-none transition-all duration-200 bg-gray-50 cursor-not-allowed"
                      />
                      {errors.dvmf_email && (
                        <p className="text-red-500 text-xs absolute -bottom-4 right-0 m-0">{errors.dvmf_email}</p>
                      )}
                    </div>

                    <div className="flex-1 min-w-[200px] flex flex-col gap-1.5 relative mb-6">
                      <label className="font-medium mb-1">Phone Number:</label>
                      <input
                        type="text"
                        name="dvmf_phonenum"
                        value={profile.dvmf_phonenum}
                        onChange={handleChange}
                        readOnly={profileExists && !editing}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-md text-sm outline-none transition-all duration-200 ${
                          profileExists && !editing
                            ? "bg-gray-50 cursor-not-allowed"
                            : "bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        }`}
                      />
                      {errors.dvmf_phonenum && (
                        <p className="text-red-500 text-xs absolute -bottom-4 right-0 m-0">{errors.dvmf_phonenum}</p>
                      )}
                    </div>

                    {!profileExists && (
                      <div className="flex justify-start gap-2 mt-5">
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-green-700 text-white border-none rounded-2xl font-bold text-sm cursor-pointer transition-all duration-200 hover:bg-green-800"
                        >
                          Save Changes
                        </button>
                        <button
                          type="button"
                          className="px-4 py-1.5 bg-gray-400 text-white border-none rounded-2xl font-bold text-sm cursor-pointer ml-2 transition-all duration-200 hover:bg-gray-500"
                          onClick={() => {
                            setProfile({ dvmf_fname: "", dvmf_lname: "", dvmf_email: "", dvmf_phonenum: "" })
                            setErrors({})
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    <div className="text-left">
                      {profileExists && !editing && (
                        <button
                          type="button"
                          className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white border-none rounded-2xl font-bold text-sm cursor-pointer mt-5 hover:bg-amber-600 transition-all duration-200"
                          onClick={() => setEditing(true)}
                        >
                          <Edit2 size={16} /> Edit Profile
                        </button>
                      )}
                    </div>

                    {editing && (
                      <div className="flex justify-start gap-2 mt-5">
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-green-700 text-white border-none rounded-2xl font-bold text-sm cursor-pointer transition-all duration-200 hover:bg-green-800"
                        >
                          Save Changes
                        </button>
                        <button
                          type="button"
                          className="px-4 py-1.5 bg-gray-400 text-white border-none rounded-2xl font-bold text-sm cursor-pointer transition-all duration-200 hover:bg-gray-500"
                          onClick={() => setEditing(false)}
                        >
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
            <div className="bg-white rounded-xl p-5 mb-5 shadow-sm ml-5 mr-10 flex gap-8 flex-wrap">
              <div className="flex-1 min-w-[300px]">
                <h3 className="text-xl font-semibold mb-2">Change Password</h3>
                <p className="text-gray-600 mb-2 italic text-sm">Update your password to keep your account secure.</p>

                <form onSubmit={handlePasswordUpdate}>
                  {[
                    {
                      label: "Current Password",
                      name: "current_password",
                    },
                    { label: "New Password", name: "new_password" },
                    { label: "Confirm New Password", name: "confirm_new_password" },
                  ].map((field) => (
                    <div className="flex-1 min-w-[200px] flex flex-col gap-1.5 relative mb-6" key={field.name}>
                      <label className="font-medium mb-1">{field.label}</label>

                      <div className="relative w-full">
                        <input
                          type={passwordVisibility[field.name] ? "text" : "password"}
                          name={field.name}
                          value={passwords[field.name]}
                          onChange={handlePasswordChange}
                          className="w-full pr-9 pl-3 py-3 border border-gray-300 rounded-md text-sm outline-none box-border transition-all duration-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(field.name)}
                          className="absolute top-1/2 right-3 transform -translate-y-1/2 bg-transparent border-none cursor-pointer text-gray-500 p-0 leading-none flex items-center justify-center hover:text-gray-700"
                        >
                          {passwordVisibility[field.name] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      {passwordErrors[field.name] && (
                        <p className="text-red-500 text-xs absolute -bottom-4 right-0 m-0">
                          {passwordErrors[field.name]}
                        </p>
                      )}
                    </div>
                  ))}

                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-green-700 text-white border-none rounded-2xl font-bold text-sm cursor-pointer transition-all duration-200 hover:bg-green-800 mr-2"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    className="px-4 py-1.5 bg-gray-400 text-white border-none rounded-2xl font-bold text-sm cursor-pointer transition-all duration-200 hover:bg-gray-500"
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

              <div className="flex-1 min-w-[250px] bg-gray-100 rounded-xl p-5 shadow-sm self-start mt-11">
                <h3 className="text-base font-semibold mb-4">Password Requirements</h3>
                <ul className="list-none pl-0 leading-7">
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
                        className={`flex items-center gap-2 text-sm transition-colors duration-200 ${
                          isValid ? "text-green-600" : "text-gray-700"
                        }`}
                      >
                        <span
                          className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-xs font-bold transition-all duration-200 ${
                            isValid ? "bg-green-500 text-white" : "bg-gray-300 text-transparent"
                          }`}
                        >
                          {isValid ? "✓" : ""}
                        </span>
                        {item.rule}
                      </li>
                    )
                  })}
                </ul>
                <p className="text-xs text-gray-500 mt-2">
                  {Object.values(passwordValidation).every(Boolean) && passwords.new_password
                    ? "✅ Your password meets all requirements!"
                    : "Make sure your password meets all the requirements for a strong and secure account."}
                </p>
              </div>
            </div>
          )}

          <FloatingMessages />
        </div>
      </div>
    </div>
  )
} 

export default DvmfSettings