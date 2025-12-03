"use client"

import Sidebar from "@/components/DvmfSidebar"
import { Bell, CheckCircle, Edit2, Eye, EyeOff, Plus, RefreshCcw, Users, XCircle } from "lucide-react"
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
  // State for new user
  const [newUser, setNewUser] = useState({
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    role: "Dvmf",
    password: "",
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

  // Phone validation error state
  const [phoneError, setPhoneError] = useState("")

  // Refresh state
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

 // ✅ HANDLE INDIVIDUAL NOTIFICATION CLICK
const handleNotificationClick = async (notification) => {
  const notifId = notification?.notif_id || notification?.id; // fallback support

  if (!notifId) {
    console.warn("Notification ID is missing:", notification);
  }

  // Mark as read in frontend immediately
  setNotifications((prev) =>
    prev.map((notif) =>
      notif.notif_id === notifId || notif.id === notifId
        ? { ...notif, read: true }
        : notif
    )
  );

  // Mark as read in backend (only if valid ID)
  if (notifId) {
    try {
      await fetch(`${API_BASE}/mark_notification_read/${notifId}/`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  }

  const message = (notification.message || "").toLowerCase();
  const type = (notification.type || "").toLowerCase();

  // Navigate for SOS emergency notifications
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
    // Extract SOS ID from related_id if available
    let sosId = null;
    if (notification.related_id && notification.related_id.startsWith("sos_")) {
      sosId = notification.related_id.replace("sos_", "");
    }
    
    navigate("/DvmfDashboard", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
        sosId: sosId, // Pass the specific SOS ID if available
      },
    });
    return;
  }

  // Navigate for account-related notifications
  if (
    message.includes("new registration") ||
    message.includes("new veterinarian approved") ||
    message.includes("veterinarian approved") ||
    message.includes("veterinarian declined") ||
    message.includes("veterinarian registered") ||
    message.includes("veterinarian pending")
  ) {
    navigate("/DvmfAccountApproval", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
      },
    });
    return;
  }

  if (
    message.includes("pending medical record access") ||
    message.includes("requested access")
  ) {
    navigate("/DvmfAccessRequest", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
      },
    });
    return;
  }

  // Only navigate to DvmfAnnouncement for comment-related notifications
  if (message.includes("comment")) {
    navigate("/DvmfAnnouncement", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
      },
    });
    return;
  }

  // Default fallback - stay on current page
  console.log("Notification clicked but no specific action:", notification);
}

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

  // Handle input changes
  const handleNewUserChange = (field, value) => {
    setNewUser((prev) => ({ ...prev, [field]: value }))
    
    // Clear phone error when user starts typing
    if (field === "phone") {
      setPhoneError("")
    }
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

    // Validate input
    if (!firstname || !lastname || !email || !phone || !password || !role) {
      showAlert("Please fill in all required fields.", "error")
      return
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      showAlert("Please enter a valid email address.", "error")
      return
    }

    // Validate phone: must start with 09 and be 11 digits
    const phoneRegex = /^09\d{9}$/
    if (!phoneRegex.test(phone.trim())) {
      setPhoneError("Phone number must start with 09 and be 11 digits long.")
      showAlert("Phone number must start with 09 and be 11 digits long.", "error")
      return
    }

    try {
      const response = await fetch("http://localhost:8000/api/dvmf/signup/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password.trim(),
          firstName: firstname.trim(),
          lastName: lastname.trim(),
          phoneNumber: phone.trim(),
          role: role.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        showAlert(data.error || "Failed to create user.", "error")
        return
      }

      setUsers((prev) => [
        ...prev,
        {
          id: data.user.dvmf_id || data.user.id,
          firstname,
          lastname,
          email,
          phone,
          role: data.user.dvmf_role || role,
          status: "Active",
        },
      ])

      setNewUser({
        firstname: "",
        lastname: "",
        email: "",
        phone: "",
        password: "",
        role: "Dvmf",
      })

      showAlert("User created successfully!")
    } catch (err) {
      showAlert("Failed to add user. Make sure the backend server is running.", "error")
    }
  }

  // DEACTIVATE USER
  const deactivateUser = async (id) => {
    try {
      const res = await fetch(`http://localhost:8000/api/dvmf/users/deactivate/${id}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!res.ok) throw new Error("Failed to deactivate user")

      setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, status: "deactivated" } : p)))
      showAlert("User deactivated successfully!", "success")
    } catch (err) {
      showAlert("Error deactivating user", "error")
    }
  }

  // REACTIVATE USER
  const reactivateUser = async (id) => {
    try {
      const res = await fetch(`http://localhost:8000/api/dvmf/users/reactivate/${id}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!res.ok) throw new Error("Failed to reactivate user")

      setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, status: "Approved" } : p)))
      showAlert("User reactivated successfully!", "success")
    } catch (err) {
      showAlert("Error reactivating user", "error")
    }
  }

  // Manual refresh function
  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        fetchProfile(),
        loadNotifications(),
        fetchUsers()
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

  // Fetch users from backend
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await fetch("http://localhost:8000/api/dvmf/users/", {
        method: "GET",
        credentials: "include",
      })
      const data = await res.json()
      if (res.ok)
        setProfiles(data)
    } catch (err) {
      showAlert("Error fetching users", "error")
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
          {["profile", "security", "userManagement"].map((tab) => {
            if (tab === "userManagement" && profile?.dvmf_role?.trim().toLowerCase() !== "dvmf-admin") {
              return null
            }

            return (
              <button
                key={tab}
                className={`py-1.5 px-0 bg-transparent border-none cursor-pointer text-base text-gray-600 transition-all duration-200 ${
                  activeTab === tab
                    ? "font-bold border-b-2 border-red-700 transform scale-105 text-[#0F3D5A]"
                    : "hover:text-[#0F3D5A]"
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "userManagement" ? "User Management" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            )
          })}
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

          {activeTab === "userManagement" ? (
            profile ? (
              profile.dvmf_role?.trim().toLowerCase() === "dvmf-admin" ? (
                <div className="bg-white rounded-xl p-5 mb-5 shadow-sm ml-5 mr-10">
                  <div className="flex border-b border-gray-200 mb-6">
                    <button
                      className={`px-6 py-3 bg-transparent border-none cursor-pointer text-sm font-medium transition-all duration-200 ${
                        activeUserTab === "addNew"
                          ? "text-[#0F3D5A] border-b-2 border-[#0F3D5A] bg-blue-50"
                          : "text-gray-600 hover:text-[#0F3D5A]"
                      }`}
                      onClick={() => setActiveUserTab("addNew")}
                    >
                      Add New User
                    </button>
                    <button
                      className={`px-6 py-3 bg-transparent border-none cursor-pointer text-sm font-medium transition-all duration-200 ${
                        activeUserTab === "existing"
                          ? "text-[#0F3D5A] border-b-2 border-[#0F3D5A] bg-blue-50"
                          : "text-gray-600 hover:text-[#0F3D5A]"
                      }`}
                      onClick={() => setActiveUserTab("existing")}
                    >
                      Existing Users
                    </button>
                  </div>

                  {activeUserTab === "addNew" && (
                    <div className="py-4">
                      <div className="flex gap-5 mb-5 flex-wrap">
                        <div className="flex-1 min-w-[200px] flex flex-col gap-1.5 relative">
                          <label className="font-medium mb-1">First Name</label>
                          <input
                            type="text"
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm outline-none transition-all duration-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            placeholder="Enter first name"
                            value={newUser.firstname}
                            onChange={(e) => handleNewUserChange("firstname", e.target.value)}
                          />
                        </div>
                        <div className="flex-1 min-w-[200px] flex flex-col gap-1.5 relative">
                          <label className="font-medium mb-1">Last Name</label>
                          <input
                            type="text"
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm outline-none transition-all duration-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            placeholder="Enter last name"
                            value={newUser.lastname}
                            onChange={(e) => handleNewUserChange("lastname", e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="flex gap-5 mb-5 flex-wrap">
                        <div className="flex-1 min-w-[200px] flex flex-col gap-1.5 relative">
                          <label className="font-medium mb-1">Email</label>
                          <input
                            type="email"
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm outline-none transition-all duration-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            placeholder="Enter email"
                            value={newUser.email}
                            onChange={(e) => handleNewUserChange("email", e.target.value)}
                          />
                        </div>
                        <div className="flex-1 min-w-[200px] flex flex-col gap-1.5 relative">
                          <label className="font-medium mb-1">Phone Number</label>
                          <input
                            type="tel"
                            className={`px-3 py-2 border rounded-md text-sm outline-none transition-all duration-200 ${
                              phoneError 
                                ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500" 
                                : "border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            }`}
                            placeholder="Enter phone number"
                            value={newUser.phone}
                            onChange={(e) => handleNewUserChange("phone", e.target.value)}
                          />
                          {phoneError && (
                            <p className="text-red-500 text-xs absolute -bottom-5 right-0 m-0">
                              {phoneError}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-5 mb-5 flex-wrap">
                        <div className="flex-1 min-w-[200px] flex flex-col gap-1.5 relative">
                          <label className="font-medium mb-1">Role</label>
                          <select
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm outline-none transition-all duration-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            value={newUser.role}
                            onChange={(e) => handleNewUserChange("role", e.target.value)}
                          >
                            <option value="">Select role</option>
                            <option value="Ctu-Vetmed">Ctu-Vetmed</option>
                            <option value="Dvmf">Dvmf</option>
                          </select>
                        </div>
                        <div className="flex-1 min-w-[200px] flex flex-col gap-1.5 relative">
                          <label className="font-medium mb-1">Password</label>
                          <div className="flex items-center">
                            <input
                              type={isPasswordVisible ? "text" : "password"}
                              className="w-full pr-9 pl-3 py-2 border border-gray-300 rounded-md text-sm outline-none box-border transition-all duration-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              placeholder="Enter password"
                              value={newUser.password}
                              onChange={(e) => handleNewUserChange("password", e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={toggleNewUserPasswordVisibility}
                              className="absolute right-3 cursor-pointer border-none bg-transparent hover:text-gray-700"
                            >
                              {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 text-left">
                        <button
                          type="button"
                          className="flex items-center gap-2 px-5 py-2.5 bg-green-700 text-white border-none rounded-md cursor-pointer text-sm font-medium hover:bg-green-800 transition-all duration-200"
                          onClick={addNewUser}
                        >
                          Add User
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {activeUserTab === "existing" && (
                    <div className="py-4">
                      {profiles.filter((p) => {
                        const statusMatch =
                          p.status === "Approved" ||
                          p.status === "approved" ||
                          p.status === "deactivated" ||
                          p.status === "Deactivated"
                        const roleMatch = p.role !== "Dvmf-Admin"
                        return statusMatch && roleMatch
                      }).length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-10 text-gray-500 gap-2.5">
                          <Users size={48} />
                          <h3 className="text-lg font-semibold">No users found</h3>
                          <p className="text-sm">Add your first user to get started</p>
                        </div>
                      ) : (
                        <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                          <div className="grid grid-cols-[1fr_1fr_2fr_1fr_1fr_1fr_120px] bg-gray-50 border-b border-gray-200">
                            <div className="px-3 py-3 text-xs font-semibold text-gray-700 uppercase">First Name</div>
                            <div className="px-3 py-3 text-xs font-semibold text-gray-700 uppercase">Last Name</div>
                            <div className="px-3 py-3 text-xs font-semibold text-gray-700 uppercase">Email</div>
                            <div className="px-3 py-3 text-xs font-semibold text-gray-700 uppercase">Phone</div>
                            <div className="px-3 py-3 text-xs font-semibold text-gray-700 uppercase">Role</div>
                            <div className="px-3 py-3 text-xs font-semibold text-gray-700 uppercase">Status</div>
                            <div className="px-3 py-3 text-xs font-semibold text-gray-700 uppercase">Actions</div>
                          </div>

                          {profiles
                            .filter((p) => {
                              const statusMatch =
                                p.status === "Approved" ||
                                p.status === "approved" ||
                                p.status === "deactivated" ||
                                p.status === "Deactivated"
                              const roleMatch = p.role !== "Dvmf-Admin"
                              return statusMatch && roleMatch
                            })
                            .map((p) => {
                              const displayStatus =
                                p.status === "Approved" || p.status === "approved" ? "active" : p.status

                              return (
                                <div
                                  key={p.id}
                                  className="grid grid-cols-[1fr_1fr_2fr_1fr_1fr_1fr_120px] border-b border-gray-200 last:border-b-0"
                                >
                                  <div className="px-3 py-3 text-sm text-gray-700 flex items-center">
                                    {p.dvmf_fname || "-"}
                                  </div>
                                  <div className="px-3 py-3 text-sm text-gray-700 flex items-center">
                                    {p.dvmf_lname || "-"}
                                  </div>
                                  <div className="px-3 py-3 text-sm text-gray-700 flex items-center">
                                    {p.dvmf_email || "-"}
                                  </div>
                                  <div className="px-3 py-3 text-sm text-gray-700 flex items-center">
                                    {p.dvmf_phonenum || "-"}
                                  </div>
                                  <div className="px-3 py-3 text-sm text-gray-700 flex items-center">
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-xl text-xs font-medium">
                                      {p.role || "-"}
                                    </span>
                                  </div>
                                  <div className="px-3 py-3 text-sm text-gray-700 flex items-center">
                                    <span
                                      className={`px-2 py-1 rounded-xl text-xs font-medium text-white ${
                                        p.status === "Approved" || p.status === "approved"
                                          ? "bg-green-500"
                                          : p.status === "deactivated" || p.status === "Deactivated"
                                            ? "bg-red-500"
                                            : "bg-gray-500"
                                      }`}
                                    >
                                      {displayStatus}
                                    </span>
                                  </div>
                                  <div className="px-3 py-3 text-sm text-gray-700 flex items-center justify-center gap-2">
                                    {(p.status === "Approved" || p.status === "approved") && (
                                      <button
                                        className="p-1.5 bg-red-50 border border-red-200 rounded-md text-red-600 cursor-pointer transition-all duration-200 hover:bg-red-100 hover:border-red-300"
                                        onClick={async () => {
                                          await deactivateUser(p.id)
                                        }}
                                      >
                                        <XCircle size={16} />
                                      </button>
                                    )}

                                    {(p.status === "deactivated" || p.status === "Deactivated") && (
                                      <button
                                        className="p-1.5 bg-green-50 border border-green-200 rounded-md text-green-600 cursor-pointer transition-all duration-200 hover:bg-green-100 hover:border-green-300"
                                        onClick={async () => {
                                          await reactivateUser(p.id)
                                        }}
                                      >
                                        <CheckCircle size={16} />
                                      </button>
                                    )}
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
                <div className="flex flex-col items-center justify-center text-center py-10 text-gray-500 gap-2.5">
                  <Users size={48} />
                  <h3 className="text-lg font-semibold">Restricted Access</h3>
                  <p className="text-sm">You do not have permission to view this section.</p>
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

export default DvmfSettings