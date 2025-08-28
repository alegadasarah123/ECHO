"use client"
import { useCallback, useEffect, useRef, useState } from "react"

import { ArrowLeft, Eye, EyeOff, Plus, Shield, Trash2, UserCircle, Users } from "lucide-react"

import Sidebar from "@/components/CtuSidebar"

function CtuSettings() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
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
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeUserTab, setActiveUserTab] = useState("add") // 'add' or 'existing'
  const [currentView, setCurrentView] = useState("settings")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user",
  })

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

  const [activeTab, setActiveTab] = useState("addNew")

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
    closeLogoutModal()
    window.location.reload()
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const markAllNotificationsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })))
  }

  const handleNotificationClick = (id) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)))
    console.log(`Notification ${id} clicked.`)
  }

  // Added search input handler

  // Settings navigation functions
  const openProfileSettingsMain = () => {
    setActiveSettingsView("profile")
    loadProfileData()
  }

  const openSecuritySettings = () => {
    setActiveSettingsView("security")
    loadSecurityData()
  }

  const openUserManagementMain = () => {
    setActiveSettingsView("userManagement")
    loadUsers()
  }

  const goBackToSettingsMain = () => {
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
    goBackToSettingsMain()
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
    goBackToSettingsMain()
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

  const addNewUser = async () => {
    const { firstname, lastname, email, phone, password } = newUser

    if (!firstname || !lastname || !email || !phone || !password) {
      alert("Please fill in all required fields.")
      return
    }

    const payload = {
      email: email.trim(),
      firstName: firstname.trim(),
      lastName: lastname.trim(),
      phoneNumber: phone.trim(),
      password: password.trim(),
      role: "Ctu-VetMed",
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/api/signup/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const rawText = await response.text()
      let data
      try {
        data = JSON.parse(rawText)
      } catch {
        data = { error: rawText }
      }

      if (!response.ok) {
        console.error("Signup failed:", data)
        alert(data.error || data.details || "Unknown error occurred")
        return
      }

      // Add the new user to the table
      setUsers((prev) => [
        ...prev,
        {
          id: data.user.id,
          firstname: data.user.firstName,
          lastname: data.user.lastName,
          email: data.user.email,
          phone: data.user.phoneNumber,
          role: data.user.role || "Ctu-VetMed", // use backend role
          status: "Active",
        },
      ])
      // Reset form
      setNewUser({ firstname: "", lastname: "", email: "", phone: "", password: "" })

      alert("User created successfully!")

      // ✅ balik sa User Management view
      setActiveSettingsView("userManagement")
      loadUsers() // reload fresh users if needed
    } catch (err) {
      console.error("Error adding user:", err)
      alert("Failed to add user. Make sure backend is running.")
    }
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

  const currentUser = JSON.parse(localStorage.getItem("currentUser")) || {}

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

  const [profile, setProfile] = useState({
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    role: "",
  })

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/get-ctu-vet-profiles/")
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

        const data = await response.json()
        console.log("Fetched profile data:", data)

        // If API returns an array of profiles, pick the first one
        if (Array.isArray(data) && data.length > 0) {
          setProfile(data[0])
        } else {
          setProfile(null)
        }
      } catch (err) {
        console.error("Error fetching profile:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

  // Settings navigation functions
  const openProfileSettings = () => {
    setCurrentView("profile")
  }

  const openUserManagement = () => {
    setCurrentView("users")
  }

  const goBackToSettings = () => {
    setCurrentView("settings")
  }

  return (
    <div className="bodyWrapper">
      <style>{`
       /* Base styles from your existing CSS with modifications for React */
.bodyWrapper {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: #f5f5f5;
  display: flex;
  height: 100vh;
  overflow-x: hidden;
  width: 100%;
}



.mainContent {
  flex: 1;
  display: flex;
  flex-direction: column;
  transition: margin-left 0.3s ease;
}



.searchContainer {
  flex: 1;
  max-width: 400px;
  margin-right: 20px;
  position: relative;
  min-width: 200px;
}

.notificationBell {
  font-size: 20px;
  color: #666;
  cursor: pointer;
  position: relative;
  margin-right: 20px;
  padding: 8px;
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
}

.notificationBell:hover {
  color: #b91c1c;
}

.notificationCount {
  position: absolute;
  top: -2px;
  right: -2px;
  background-color: #b91c1c;
  color: white;
  font-size: 11px;
  min-width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  font-weight: 600;
  border: 2px solid white;
  box-sizing: border-box;
  line-height: 1;
  padding: 0 2px;
}

.notificationDropdown {
  position: absolute;
  top: 100%;
  right: 0;
  width: min(350px, 90vw);
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  display: none;
  max-height: 400px;
  overflow-y: auto;
}

.notificationDropdown.show {
  display: block;
}

.notificationHeader {
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  background: #f8f9fa;
  border-radius: 8px 8px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notificationHeader h3 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.markAllRead {
  background: none;
  border: none;
  color: #b91c1c;
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
}

.notificationItem {
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
}

 .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center; /* centers horizontally */
  justify-content: center; /* centers vertically (if parent has height) */
  text-align: center;
  padding: 2rem;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.notificationItem:hover {
  background-color: #f8f9fa;
}

.notificationItem.unread {
  background-color: #f0f8ff;
  border-left: 3px solid #b91c1c;
}

.notificationItem:last-child {
  border-bottom: none;
}

.notificationTitle {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 5px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.notificationMessage {
  font-size: 13px;
  color: #666;
  margin-bottom: 5px;
  line-height: 1.4;
}

.notificationTime {
  font-size: 11px;
  color: #999;
}

.notificationIcon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 18px;
  margin-bottom: 8px;
  color: #666;
}

.empty-state p {
  font-size: 14px;
  color: #999;
}

.contentArea {
  flex: 1;
  padding: 40px;
  background: #e5e7eb;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.settingsContainer {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  width: 120%;
  max-width: 1000px;
  overflow: hidden;
}

.settingsHeader {
  padding: 24px 32px 20px 32px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
}

.backButton {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  margin-right: 16px;
  font-size: 18px;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.backButton:hover {
  background-color: #f3f4f6;
}

.settingsTitle {
  font-size: 24px;
  font-weight: 600;
  color: #111827;
}

.settingsList {
  padding: 0;
}

.settingsItem {
  display: flex;
  align-items: center;
  padding: 20px 32px;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background-color 0.2s;
  min-height: 60px;
}

.settingsItem:hover {
  background: #f9fafb;
}

.settingsItem:last-child {
  border-bottom: none;
}

.settingsIcon {
  width: 24px;
  height: 24px;
  margin-right: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #111827;
  flex-shrink: 0;
}

.settingsContent {
  flex: 1;
}

.settingsItemTitle {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 2px;
}

.settingsItemDescription {
  font-size: 14px;
  color: #9ca3af;
  line-height: 1.4;
}

/* Form Styles */
.profileFormContent,
.securityFormContent,
.userManagementContent {
  padding: 3px 48px;
  max-width: 1200px;
  margin: 0 auto;
}

/* New profile layout styles to match the image design */
.profileContainer {
  display: flex;
  gap: 48px;
  padding: 32px 48px;
  max-width: 1200px;
  margin: 0 auto;
}

.profileLeftSection {
  flex: 0 0 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.profilePicture {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  border: 3px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #9ca3af;
  background-color: #f9fafb;
  margin-bottom: 24px;
}

.profileName {
  font-size: 24px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
}

.profileUsername {
  font-size: 16px;
  color: #6b7280;
  margin-bottom: 16px;
}

.profileStatus {
  display: inline-block;
  padding: 4px 12px;
  background-color: #fef3c7;
  color: #92400e;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.profileRightSection {
  flex: 1;
}

.infoSection {
  margin-bottom: 32px;
}

.sectionTitle {
  font-size: 18px;
  font-weight: 600;
  color: #ea580c;
  margin-bottom: 40px;
  border-bottom: 2px solid #ea580c;
  padding-bottom: 8px;
}

.infoGrid {
  display: grid;
  gap: 16px;
}

.infoItem {
  display: flex;
  align-items: center;
}

.infoLabel {
  font-weight: 600;
  color: #374151;
  min-width: 140px;
  margin-right: 16px;
}

.infoValue {
  color: #6b7280;
  flex: 1;
}

.formGroup {
  margin-bottom: 24px;
}

.formLabel {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}
.formLabels {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
  margin-left: 150px; /* Centers horizontally */
}

.formInput {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
  min-height: 44px;
}

.formInputs {
 width: 50%;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
  min-height: 44px;
  display: block; /* Make sure it's block-level */
  margin: 0 auto; /* Centers horizontally */

}

.formInputs:focus {
  outline: none;
  border-color: #b91c1c;
  box-shadow: 0 0 0 3px rgba(185, 28, 28, 0.1);
}

.formInput:focus {
  outline: none;
  border-color: #b91c1c;
  box-shadow: 0 0 0 3px rgba(185, 28, 28, 0.1);
}

.formSelect {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background-color: white;
  cursor: pointer;
  min-height: 44px;
}

.formSelects {
  width: 55%;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background-color: white;
  cursor: pointer;
  min-height: 44px;
  display: block; /* Make sure it's block-level */
  margin: 0 auto; /* Centers horizontally */

}
.formSelects:focus {
  outline: none;
  border-color: #b91c1c;
  box-shadow: 0 0 0 3px rgba(185, 28, 28, 0.1);
}
.formSelect:focus {
  outline: none;
  border-color: #b91c1c;
  box-shadow: 0 0 0 3px rgba(185, 28, 28, 0.1);
}

.checkboxGroup {
  margin-bottom: 16px;
}

.checkboxItem {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  min-height: 44px;
}
.checkboxItems {
 display: block; /* Make sure it's block-level */
  margin: 0 auto; /* Centers horizontally */
  align-items: center;
  margin-bottom: 12px;
  min-height: 44px;
  margin-left: 150px;

}
.checkboxInput {
  margin-right: 12px;
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #b91c1c;
}

.checkboxLabel {
  font-size: 14px;
  color: #374151;
  cursor: pointer;
}

.formActions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px 32px;
  border-top: 1px solid #e5e7eb;
  background-color: #f9fafb;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  min-height: 44px;
  min-width: 80px;
}
.button {
  padding: 10px 10px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  min-height: 45px;
  min-width: 100px;
  display: inline-flex;        /* use inline-flex for icon + text alignment */
  align-items: center;         /* vertically center the icon and text */
  justify-content: flex-start; /* align content to the left */
  gap: 6px;                    /* space between icon and text */
}

.btnSecondary {
  background-color: #f3f4f6;
  color: #374151;
}

.btnSecondary:hover {
  background-color: #e5e7eb;
}

.btnPrimarys {
  background-color: #b91c1c;
  color: white;
}

.btnPrimarys:hover {
  background-color: #991b1b;
}

.btnDanger {
  background-color: #dc2626;
  color: white;
}

.btnDanger:hover {
  background-color: #b91c1c;
}

.btnSmall {
  padding: 6px 12px;
  font-size: 12px;
  min-height: 32px;
  min-width: 60px;
}

/* Security specific styles */
.securitySection {
  margin-bottom: 32px;
}

.securitySectionTitle {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e7eb;
}

.securityCheckboxGroup {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.securityCheckboxItem {
  display: flex;
  align-items: center;
  padding: 12px 0;
  min-height: 44px;
}

.securityCheckboxInput {
  margin-right: 12px;
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #b91c1c;
}

.securityCheckboxLabel {
  font-size: 15px;
  color: #374151;
  cursor: pointer;
  font-weight: 500;
}

.passwordStrength {
  margin-top: 8px;
  height: 4px;
  background-color: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
}

.passwordStrengthBar {
  height: 100%;
  transition: all 0.3s ease;
  border-radius: 2px;
}

.strengthWeak {
  background-color: #ef4444;
  width: 25%;
}

.strengthFair {
  background-color: #f59e0b;
  width: 50%;
}

.strengthGood {
  background-color: #10b981;
  width: 75%;
}

.strengthStrong {
  background-color: #059669;
  width: 100%;
}

/* User Management specific styles */
.userSection {
  margin-bottom: 32px;
}

.userSectionTitle {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e7eb;
}

.addUserForm {
  background: #f9fafb;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.formRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.usersTable {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  scrollbar-width: thin;
  overflow-x: auto;
}
.tableRow > :last-child,
.tableHeaderCell:last-child {
  position: sticky;
  right: 0;
  background: white;
  z-index: 2;
}

.tableHeader {
  display: grid;
  grid-template-columns: 110px 100px 200px 150px 110px 190px 100px 100px 100px; /* added last column */
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  scrollbar-color: #a5b4fc #f3f4f6;
}

.tableHeaderCell {
  padding: 12px 16px;
  font-weight: 600;
  color: #3c5137;
  font-size: 14px;
  border-right: 1px solid #e5e7eb;
}

.tableHeaderCell:last-child {
  border-right: none;
}

.tableRow {
  display: grid;
  grid-template-columns: 110px 100px 200px 150px 110px 190px 100px 100px 100px; /* added last column */
  border-bottom: 1px solid #e5e7eb;
}


.tableRow:hover {
  background: #f9fafb;
}

.tableRow:last-child {
  border-bottom: none;
}

.tableCell {
  padding: 15px 17px;
  color: #374151;
  font-size: 14px;
  border-right: 1px solid #f3f4f6;
  display: flex;
  align-items: center;
}

.tableCell:last-child {
  border-right: none;
  justify-content: center;
}

.roleBadge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: capitalize;
}

.roleadmin {
  background: #fef3c7;
  color: #92400e;
}

.roleveterinarian {
  background: #dbeafe;
  color: #1e40af;
}

.rolestaff {
  background: #d1fae5;
  color: #065f46;
}

.roleviewer {
  background: #f3f4f6;
  color: #374151;
}

.statusBadge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.statusactive {
  background: #d1fae5;
  color: #065f46;
}

.statusinactive {
  background: #fee2e2;
  color: #991b1b;
}

/* Mobile Menu Button */
.mobileMenuBtn {
  display: none;
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 1001;
  background: #b91c1c;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  font-size: 18px;
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
}

.sidebarCloseBtn {
  display: none;
  position: absolute;
  top: 20px;
  right: 20px;
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  z-index: 1002;
  padding: 5px;
  border-radius: 50%;
  transition: background-color 0.2s ease;
}

.sidebarCloseBtn:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.sidebarToggleBtn {
  display: none;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #666;
  padding: 8px;
  min-height: 44px;
  min-width: 44px;
  margin-right: 10px;
}

/* Logout Modal Styles */
.modalOverlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: none;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  padding: 20px;
}

.modalOverlay.active {
  display: flex;
}

.logoutModal {
  background: white;
  border-radius: 12px;
  padding: 32px;
  width: 90%;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.logoutModalIcon {
  width: 64px;
  height: 64px;
  background: #fef3c7;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.logoutModalIcon i {
  font-size: 28px;
  color: #f59e0b;
}

.logoutModal h3 {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 12px;
}

.logoutModal p {
  font-size: 16px;
  color: #6b7280;
  margin-bottom: 32px;
  line-height: 1.5;
}

.logoutModalButtons {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.logoutModalBtn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 100px;
  min-height: 44px;
}

.logoutModalBtn.cancel {
  background: #f3f4f6;
  color: #374151;
}

.logoutModalBtn.cancel:hover {
  background: #e5e7eb;
}

.logoutModalBtn.confirm {
  background: #ef4444;
  color: white;
}

.logoutModalBtn.confirm:hover {
  background: #dc2626;
}

/* Responsive Design */
@media (max-width: 768px) {
  .sidebars.collapsed {
    width: 0;
    overflow: hidden;
  }

  .sidebars.expanded {
    width: 250px;
  }

  .mainContent {
    margin-left: 0;
  }

  

  .sidebarToggleBtn {
    display: none;
  }

  .mobileMenuBtn {
    display: block;
  }

  .sidebars.expanded .sidebarCloseBtn {
    display: block;
  }

  .contentArea {
    padding: 20px;
  }

  .settingsContainer {
    max-width: 100%;
    margin: 0;
  }

  .settingsItem {
    padding: 16px 20px;
  }

  .profileFormContent,
  .securityFormContent,
  .userManagementContent {
    padding: 20px 24px;
  }

  .formActions {
    padding: 20px;
    flex-direction: column;
  }

  .formRow {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .tableHeader,
  .tableRow {
    grid-template-columns: 1fr; /* Single column on mobile */
    gap: 8px;
  }

  .tableHeaderCell,
  .tableCell {
    border-right: none;
    border-bottom: 1px solid #f3f4f6;
    padding: 15px 20px;
  }

  .tableHeaderCell:before,
  .tableCell:before {
    content: attr(data-label);
    font-weight: 600;
    margin-right: 8px;
  }
}

@media (min-width: 769px) {


  
  

  .sidebarToggleBtn {
    display: block;
  }

  .mobileMenuBtn {
    display: none;
  }

  .sidebars.collapsed .navItem span,
  .sidebars.collapsed .logoutBtn span {
    display: none;
  }

  .sidebars.collapsed .navItem,
  .sidebars.collapsed .logoutBtn {
    padding: 12px 0;
    justify-content: center;
    margin-left: 0;
    border-radius: 0;
    width: auto;
  }

  .sidebar.collapsed .navItem:hover {
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 0;
  }

  .sidebars.collapsed .navItem.active {
    border-radius: 0;
    width: auto;
  }

  .sidebars.collapsed .navIcon,
  .sidebars.collapsed .logoutIcon {
    margin-right: 0;
  }

  .sidebars.collapsed .sidebarsLogo img {
    width: 60px;
    height: 60px;
  }

  .sidebarCloseBtn {
    display: none;
  }
}

@media (max-width: 480px) {
  

  /*Search Icon*/

  .search-containers {
    flex: 1;
    max-width: 400px;
    margin-right: 20px;
    position: relative;
    min-width: 200px;
  }

  .search-input {
    width: 100%;
    padding: 8px 16px 8px 40px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 14px;
    outline: none;
    min-height: 40px;
  }

  .search-input:focus {
    border-color: #b91c1c;
  }

  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
  }

  .search-icon::before {
    content: "";
    position: absolute;
    width: 10px;
    height: 10px;
    border: 2px solid #6b7280;
    border-radius: 50%;
    top: 0;
    left: 0;
  }

  .search-icon::after {
    content: "";
    position: absolute;
    width: 2px;
    height: 5px;
    background: #6b7280;
    transform: rotate(45deg);
    bottom: 1px;
    right: 1px;
  }

  .notificationBell {
    align-self: flex-end;
    margin-right: 0;
  }

  .mobileMenuBtn {
    top: 15px;
    left: 15px;
    padding: 10px;
  }

  .settingsItem {
    padding: 12px 16px;
  }

  .profileFormContent,
  .securityFormContent,
  .userManagementContent {
    padding: 16px 20px;
  }
}

@media (hover: none) and (pointer: coarse) {
  .navItem,
  .logoutBtn {
    min-height: 48px;
  }

  .settingsItem {
    min-height: 64px;
  }

  .notificationBell {
    min-height: 48px;
    min-width: 48px;
  }
}

      `}</style>

      <div className="sidebars" id="sidebars">
        <Sidebar isOpen={isSidebarOpen} ref={sidebarRef} />
      </div>

      <div className="mainContent">
        <div className="contentArea">
          <div className="settingsContainer">
            {/* Main Settings View */}
            {activeSettingsView === "main" && (
              <div id="main-settings">
                <div className="settingsHeader">
                  <h1 className="settingsTitle">Settings</h1>
                </div>
                <div className="settingsList">
                  <div className="settingsItem" onClick={openProfileSettingsMain}>
                    <div className="settingsIcon">
                      <UserCircle size={24} />
                    </div>
                    <div className="settingsContent">
                      <div className="settingsItemTitle">Profile</div>
                      <div className="settingsItemDescription">Manage your personal information and preferences.</div>
                    </div>
                  </div>
                  <div className="settingsItem" onClick={openSecuritySettings}>
                    <div className="settingsIcon">
                      <Shield size={24} />
                    </div>
                    <div className="settingsContent">
                      <div className="settingsItemTitle">Security</div>
                      <div className="settingsItemDescription">Manage passwords and account protection</div>
                    </div>
                  </div>
                  <div className="settingsItem" onClick={openUserManagementMain}>
                    <div className="settingsIcon">
                      <Users size={24} />
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
                  <button className="backButton" onClick={goBackToSettingsMain}>
                    <ArrowLeft size={20} />
                  </button>
                  <h1 className="settingsTitle">Profile Settings</h1>
                </div>
                <div className="profileContainer">
                  <div className="profileLeftSection">
                    <div className="profilePicture">
                      {profile?.ctu_fname?.charAt(0)?.toUpperCase()}
                      {profile?.ctu_lname?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="profileName">
                      {profile?.ctu_fname} {profile?.ctu_lname}
                    </div>
                    <div className="profileUsername">{profile?.ctu_email?.split("@")[0] || "username"}</div>
                  </div>

                  <div className="profileRightSection">
                    <div className="infoSection">
                      <h3 className="sectionTitle">Personal Information</h3>
                      <div className="infoGrid">
                        <div className="infoItem">
                          <span className="infoLabel">Full Name:</span>
                          <span className="infoValue">
                            {profile?.ctu_fname} {profile?.ctu_lname}
                          </span>
                        </div>
                        <div className="infoItem">
                          <span className="infoLabel">Email Address:</span>
                          <span className="infoValue">{profile?.ctu_email || ""}</span>
                        </div>
                        <div className="infoItem">
                          <span className="infoLabel">Phone Number:</span>
                          <span className="infoValue">{profile?.ctu_phonenum || ""}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ... existing security settings code ... */}
            {activeSettingsView === "security" && (
              <div id="security-settings" className="securitySettings">
                <div className="settingsHeader">
                  <button className="backButton" onClick={goBackToSettingsMain}>
                    <ArrowLeft size={20} />
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
                            {isCurrentPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
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
                            {isNewPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
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
                            {isConfirmPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
                <div className="formActions">
                  <button type="button" className="btn btnSecondary" onClick={goBackToSettingsMain}>
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
                  <button className="backButton" onClick={goBackToSettingsMain}>
                    <ArrowLeft size={20} />
                  </button>
                  <h1 className="settingsTitle">User Management</h1>
                </div>

                <div className="flex border-b border-gray-200 mb-6">
                  <button
                    className={`px-6 py-3 font-medium text-sm transition-all duration-200 border-b-2 ${
                      activeTab === "addNew"
                        ? "text-[#b91c1c] border-[#b91c1c] bg-[#fee2e2]" // active tab
                        : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                    }`}
                    onClick={() => setActiveTab("addNew")}
                  >
                    Add New User
                  </button>
                  <button
                    className={`px-6 py-3 font-medium text-sm transition-all duration-200 border-b-2 ${
                      activeTab === "existing"
                        ? "text-[#b91c1c] border-[#b91c1c] bg-[#fee2e2]" // active tab
                        : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                    }`}
                    onClick={() => setActiveTab("existing")}
                  >
                    Existing Users
                  </button>
                </div>

                <div className="userManagementContent">
                  {activeTab === "addNew" && (
                    <div className="userSection">
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
                              <option value="admin">Ctu-Vetmed</option>
                              <option value="veterinarian">Dvmf</option>
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
                                {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>
                        </div>
                        <button type="button" className="button btnPrimarys" onClick={addNewUser}>
                          <Plus size={16} /> Add User
                        </button>

                      </div>
                    </div>
                  )}

                  {activeTab === "existing" && (
                    <div className="userSection">
                      {users.length === 0 ? (
                        <div className="empty-state">
                          <Users size={48} />
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

                          {users
                            .filter((user) => {
                              // Admin sees all users
                              if (currentUser.role === "admin") return true

                              // Non-admin users see only themselves
                              return user.id === currentUser.id
                            })
                            .map((user) => (
                              <div key={user.id} className="tableRow">
                                <div className="tableCell">{user.ctu_fname}</div>
                                <div className="tableCell">{user.ctu_lname}</div>
                                <div className="tableCell">{user.ctu_email}</div>
                                <div className="tableCell">{user.ctu_phonenum}</div>
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
                                      {passwordVisibility[user.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                  </div>
                                </div>
                                <div className="tableCell">
                                  <span className={`statusBadge status${user.status.toLowerCase()}`}>
                                    {user.status}
                                  </span>
                                </div>
                                <div className="tableCell">
                                  <button
                                    className="btn btnDanger btnSmall"
                                    onClick={() => deleteUser(user.id)}
                                    title="Delete user"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Profile Settings View */}
      {currentView === "profile" && (
        <div className="ctuSettingsContainer">
          <Sidebar isOpen={isSidebarOpen} />
          <div className="ctuSettingsContent">
            <div className="ctuSettingsHeader">
              <button className="backButton" onClick={goBackToSettings}>
                <ArrowLeft size={20} />
                Back to Settings
              </button>
              <h1>Profile Settings</h1>
            </div>

            <div className="profileContainer">
              <div className="profileLeft">
                <div className="profilePicture">
                  <div className="avatarContainer">
                    <div className="avatarCircle">
                      <span className="avatarText">MJ</span>
                    </div>
                    <div className="avatarGlow"></div>
                  </div>
                </div>
                <h2 className="profileName">Maxine Alicaway Judilla</h2>
                <p className="profileUsername">kutsero</p>
                <div className="profileStatus">
                  <span className="statusBadge pending">PENDING</span>
                </div>
              </div>

              <div className="profileRight">
                <div className="infoSection">
                  <h3 className="sectionTitle">Personal Information</h3>
                  <div className="infoGrid">
                    <div className="infoItem">
                      <label>Full Name:</label>
                      <span>Maxine Alicaway Judilla</span>
                    </div>
                    <div className="infoItem">
                      <label>Date of Birth:</label>
                      <span>2025-08-28</span>
                    </div>
                    <div className="infoItem">
                      <label>Gender:</label>
                      <span>Female</span>
                    </div>
                  </div>
                </div>

                <div className="infoSection">
                  <h3 className="sectionTitle">Contact Information</h3>
                  <div className="infoGrid">
                    <div className="infoItem">
                      <label>Email Address:</label>
                      <span>maxine@gmail.com</span>
                    </div>
                    <div className="infoItem">
                      <label>Phone Number:</label>
                      <span>09457361245</span>
                    </div>
                    <div className="infoItem">
                      <label>Home Address:</label>
                      <span>Tugbongan, Consolacion, Cebu, 6001</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <style jsx>{`
            /* Enhanced avatar styling with gradient and glow effects */
            .avatarContainer {
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .avatarCircle {
              width: 120px;
              height: 120px;
              border-radius: 50%;
              background: linear-gradient(135deg, #ff6b6b, #ee5a24);
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
              z-index: 2;
              box-shadow: 0 8px 32px rgba(255, 107, 107, 0.3);
              border: 3px solid white;
            }

            .avatarText {
              font-size: 36px;
              font-weight: 700;
              color: white;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }

            .avatarGlow {
              position: absolute;
              top: -10px;
              left: -10px;
              right: -10px;
              bottom: -10px;
              border-radius: 50%;
              background: linear-gradient(135deg, #ff6b6b, #ee5a24);
              opacity: 0.2;
              z-index: 1;
              animation: pulse 2s ease-in-out infinite;
            }

            @keyframes pulse {
              0%,
              100% {
                transform: scale(1);
                opacity: 0.2;
              }
              50% {
                transform: scale(1.05);
                opacity: 0.3;
              }
            }

            .profileContainer {
              display: flex;
              gap: 40px;
              max-width: 1200px;
              margin: 0 auto;
              padding: 20px;
            }

            .profileLeft {
              flex: 0 0 300px;
              text-align: center;
              padding: 30px;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
              height: fit-content;
            }

            .profileRight {
              flex: 1;
              display: flex;
              flex-direction: column;
              gap: 30px;
            }

            .infoSection {
              background: white;
              padding: 30px;
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            }

            .sectionTitle {
              color: #e74c3c;
              font-size: 20px;
              font-weight: 600;
              margin-bottom: 20px;
              border-bottom: 2px solid #e74c3c;
              padding-bottom: 10px;
            }

            .infoGrid {
              display: grid;
              gap: 16px;
            }

            .infoItem {
              display: grid;
              grid-template-columns: 140px 1fr;
              gap: 16px;
              align-items: center;
            }

            .infoItem label {
              font-weight: 600;
              color: #2c3e50;
            }

            .infoItem span {
              color: #7f8c8d;
              padding: 8px 0;
            }

            .profileName {
              font-size: 24px;
              font-weight: 700;
              color: #2c3e50;
              margin: 20px 0 8px 0;
            }

            .profileUsername {
              color: #7f8c8d;
              font-size: 16px;
              margin-bottom: 16px;
            }

            .statusBadge {
              display: inline-block;
              padding: 6px 16px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
            }

            .statusBadge.pending {
              background-color: #f39c12;
              color: white;
            }

            .ctuSettingsContainer {
              display: flex;
              min-height: 100vh;
              background-color: #f8f9fa;
            }

            .ctuSettingsContent {
              flex: 1;
              margin-left: 250px;
              padding: 20px;
            }

            .ctuSettingsHeader {
              display: flex;
              align-items: center;
              gap: 20px;
              margin-bottom: 30px;
              padding: 20px 0;
              border-bottom: 1px solid #e9ecef;
            }

            .backButton {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 10px 16px;
              background: #e74c3c;
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 500;
              transition: background-color 0.2s;
            }

            .backButton:hover {
              background: #c0392b;
            }

            .ctuSettingsHeader h1 {
              font-size: 28px;
              font-weight: 700;
              color: #2c3e50;
              margin: 0;
            }

            @media (max-width: 768px) {
              .profileContainer {
                flex-direction: column;
                gap: 20px;
              }

              .profileLeft {
                flex: none;
              }

              .infoItem {
                grid-template-columns: 1fr;
                gap: 8px;
              }

              .ctuSettingsContent {
                margin-left: 0;
              }
            }
          `}</style>
        </div>
      )}
    </div>
  )
}

export default CtuSettings
