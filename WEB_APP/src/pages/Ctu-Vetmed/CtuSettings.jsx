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

      setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, status: "Approved" } : p)))

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
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 font-sans flex flex-col h-screen overflow-hidden">
        <div className="flex items-center bg-white p-5 border-b border-gray-200 shadow-md sticky top-0 z-10 justify-between">
          <h1 className="text-2xl font-bold text-black">Settings</h1>
          <div className="relative">
            <button
              className="relative bg-transparent border-none cursor-pointer p-2 rounded-full hover:bg-gray-100"
              onClick={() => setNotifsOpen(!notifsOpen)}
            >
              <Bell size={24} color="#374151" />
              {notifications.length > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-xs font-bold">
                  {notifications.length}
                </span>
              )}
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

        <div className="flex gap-6 mb-6 mt-5 ml-5">
          {["profile", "security", "userManagement"].map((tab) => {
            // Only show "userManagement" if user is Ctu-Admin
            if (tab === "userManagement" && profile?.ctu_role?.trim().toLowerCase() !== "ctu-admin") {
              return null
            }

            return (
              <button
                key={tab}
                className={`py-1.5 px-0 bg-transparent border-none cursor-pointer text-base text-gray-600 transition-all duration-200 ${
                  activeTab === tab
                    ? "font-bold border-b-2 border-red-700 transform scale-105 text-red-700"
                    : "hover:text-red-700"
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
                  <div className="w-36 h-36 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-3xl font-semibold border-2 border-gray-100 mt-12 ml-24">
                    {profile.ctu_fname?.charAt(0)?.toUpperCase() || "J"}
                    {profile.ctu_lname?.charAt(0)?.toUpperCase() || "S"}
                  </div>
                  <div className="text-center ml-24 mt-4">
                    <h3 className="text-xl font-semibold m-0 text-gray-800">
                      {profile.ctu_fname} {profile.ctu_lname}
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
                      <label className="font-medium mb-1">Full Name:</label>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          name="ctu_fname"
                          value={profile.ctu_fname}
                          onChange={handleChange}
                          readOnly={profileExists && !editing}
                          className={`flex-1 px-4 py-3 border border-gray-300 rounded-md text-sm outline-none transition-all duration-200 ${
                            profileExists && !editing
                              ? "bg-gray-50 cursor-not-allowed"
                              : "bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          }`}
                          placeholder="First Name"
                        />
                        <input
                          type="text"
                          name="ctu_lname"
                          value={profile.ctu_lname}
                          onChange={handleChange}
                          readOnly={profileExists && !editing}
                          className={`flex-1 px-4 py-3 border border-gray-300 rounded-md text-sm outline-none transition-all duration-200 ${
                            profileExists && !editing
                              ? "bg-gray-50 cursor-not-allowed"
                              : "bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          }`}
                          placeholder="Last Name"
                        />
                      </div>
                      {(errors.ctu_fname || errors.ctu_lname) && (
                        <p className="text-red-500 text-xs absolute -bottom-4 right-0 m-0">
                          {errors.ctu_fname || errors.ctu_lname}
                        </p>
                      )}
                    </div>

                    <div className="flex-1 min-w-[200px] flex flex-col gap-1.5 relative mb-6">
                      <label className="font-medium mb-1">Email Address:</label>
                      <input
                        type="email"
                        name="ctu_email"
                        value={profile.ctu_email}
                        onChange={handleChange}
                        readOnly={true}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm outline-none transition-all duration-200 bg-gray-50 cursor-not-allowed"
                      />
                      {errors.ctu_email && (
                        <p className="text-red-500 text-xs absolute -bottom-4 right-0 m-0">{errors.ctu_email}</p>
                      )}
                    </div>

                    <div className="flex-1 min-w-[200px] flex flex-col gap-1.5 relative mb-6">
                      <label className="font-medium mb-1">Phone Number:</label>
                      <input
                        type="text"
                        name="ctu_phonenum"
                        value={profile.ctu_phonenum}
                        onChange={handleChange}
                        readOnly={profileExists && !editing}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-md text-sm outline-none transition-all duration-200 ${
                          profileExists && !editing
                            ? "bg-gray-50 cursor-not-allowed"
                            : "bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        }`}
                      />
                      {errors.ctu_phonenum && (
                        <p className="text-red-500 text-xs absolute -bottom-4 right-0 m-0">{errors.ctu_phonenum}</p>
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
                            setProfile({ ctu_fname: "", ctu_lname: "", ctu_email: "", ctu_phonenum: "" })
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

                      {/* Password input with toggle */}
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

                      {/* Error message */}
                      {passwordErrors[field.name] && (
                        <p className="text-red-500 text-xs absolute -bottom-4 right-0 m-0">
                          {passwordErrors[field.name]}
                        </p>
                      )}
                    </div>
                  ))}

                  {/* Action buttons */}
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
              profile.ctu_role?.trim().toLowerCase() === "ctu-admin" ? (
                <div className="bg-white rounded-xl p-5 mb-5 shadow-sm ml-5 mr-10">
                  

                  {/* Tabs for Add New / Existing Users */}
                  <div className="flex border-b border-gray-200 mb-6">
                    <button
                      className={`px-6 py-3 bg-transparent border-none cursor-pointer text-sm font-medium transition-all duration-200 ${
                        activeUserTab === "addNew"
                          ? "text-red-700 border-b-2 border-red-700 bg-red-50"
                          : "text-gray-600 hover:text-red-700"
                      }`}
                      onClick={() => setActiveUserTab("addNew")}
                    >
                      Add New User
                    </button>
                    <button
                      className={`px-6 py-3 bg-transparent border-none cursor-pointer text-sm font-medium transition-all duration-200 ${
                        activeUserTab === "existing"
                          ? "text-red-700 border-b-2 border-red-700 bg-red-50"
                          : "text-gray-600 hover:text-red-700"
                      }`}
                      onClick={() => setActiveUserTab("existing")}
                    >
                      Existing Users
                    </button>
                  </div>

                  {/* Add New User Form */}
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
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm outline-none transition-all duration-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            placeholder="Enter phone number"
                            value={newUser.phone}
                            onChange={(e) => handleNewUserChange("phone", e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="flex gap-5 mb-5 flex-wrap">
                        <div className="flex-1 min-w-[200px] flex flex-col gap-1.5 relative">
                          <label className="font-medium mb-1">Role</label>
                          <select
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm outline-none transition-all duration-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            value={newUser.ctu_role}
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
                              className="ml-1 cursor-pointer border-none bg-transparent hover:text-gray-700"
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
                  {/* ALERT UI */}
                  {alert.show && (
                    <div
                      className={`fixed top-5 left-1/2 transform -translate-x-1/2 px-6 py-3.5 rounded-xl text-base font-semibold text-white shadow-lg z-50 text-center min-w-[250px] max-w-[500px] transition-opacity duration-300 ${
                        alert.type === "success" ? "bg-green-600" : "bg-red-600"
                      }`}
                    >
                      {alert.message}
                    </div>
                  )}

                  {/* Existing Users Table */}
                  {activeUserTab === "existing" && (
                    <div className="py-4">
                      {console.log("[v0] Profiles data:", profiles)}
                      {console.log(
                        "[v0] Filtered profiles:",
                        profiles.filter((p) => {
                          const statusMatch =
                            p.status === "Approved" ||
                            p.status === "approved" ||
                            p.status === "deactivated" ||
                            p.status === "Deactivated"
                          const roleMatch = p.role !== "Ctu-Admin"
                          console.log(
                            `[v0] User ${p.ctu_email}: status=${p.status}, role=${p.role}, statusMatch=${statusMatch}, roleMatch=${roleMatch}`,
                          )
                          return statusMatch && roleMatch
                        }),
                      )}

                      {profiles.filter((p) => {
                        const statusMatch =
                          p.status === "Approved" ||
                          p.status === "approved" ||
                          p.status === "deactivated" ||
                          p.status === "Deactivated"
                        const roleMatch = p.role !== "Ctu-Admin"
                        return statusMatch && roleMatch
                      }).length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-10 text-gray-500 gap-2.5">
                          <Users size={48} />
                          <h3 className="text-lg font-semibold">No users found</h3>
                          <p className="text-sm">Add your first user to get started</p>
                          <p className="text-xs text-gray-400 mt-2">Total profiles loaded: {profiles.length}</p>
                        </div>
                      ) : (
                        <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                          <div className="grid grid-cols-[1fr_1fr_2fr_1fr_1fr_1fr_80px] bg-gray-50 border-b border-gray-200">
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
                              const roleMatch = p.role !== "Ctu-Admin"
                              return statusMatch && roleMatch
                            })
                            .map((p) => {
                              const displayStatus =
                                p.status === "Approved" || p.status === "approved" ? "active" : p.status

                              return (
                                <div
                                  key={p.id}
                                  className="grid grid-cols-[1fr_1fr_2fr_1fr_1fr_1fr_80px] border-b border-gray-200 last:border-b-0"
                                >
                                  <div className="px-3 py-3 text-sm text-gray-700 flex items-center">
                                    {p.ctu_fname || "-"}
                                  </div>
                                  <div className="px-3 py-3 text-sm text-gray-700 flex items-center">
                                    {p.ctu_lname || "-"}
                                  </div>
                                  <div className="px-3 py-3 text-sm text-gray-700 flex items-center">
                                    {p.ctu_email || "-"}
                                  </div>
                                  <div className="px-3 py-3 text-sm text-gray-700 flex items-center">
                                    {p.ctu_phonenum || "-"}
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
                                  <div className="px-3 py-3 text-sm text-gray-700 flex items-center">
                                    <div className="relative">
                                      <button
                                        className="bg-none border-none cursor-pointer p-1 rounded hover:bg-gray-100"
                                        onClick={() => toggleDropdown(p.id)}
                                      >
                                        <MoreVertical size={16} />
                                      </button>

                                      {dropdownOpen === p.id && (
                                        <div className="absolute right-0 top-full bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[120px]">
                                          {(p.status === "Approved" || p.status === "approved") && (
                                            <button
                                              className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none cursor-pointer text-sm text-gray-700 hover:bg-gray-50"
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

                                          {(p.status === "deactivated" || p.status === "Deactivated") && (
                                            <button
                                              className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none cursor-pointer text-sm text-red-600 hover:bg-gray-50"
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

export default CtuSettings
