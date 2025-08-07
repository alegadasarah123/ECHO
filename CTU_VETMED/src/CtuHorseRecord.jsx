"use client"
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./CtuHorseRecord.css"; // Import the new CSS file

function CtuHorseRecord() {
  const navigate = useNavigate()

  // State for sidebar and modals
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false)
  const [isHorseModalOpen, setIsHorseModalOpen] = useState(false)
  const [isMedicalRecordModalOpen, setIsMedicalRecordModalOpen] = useState(false)
  const [isTreatmentHistoryModalOpen, setIsTreatmentHistoryModal] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isAddMedicalRecordModalOpen, setIsAddMedicalRecordModalOpen] = useState(false) // New state
  const [isAddTreatmentHistoryModalOpen, setIsAddTreatmentHistoryModalOpen] = useState(false) // New state

  // State for filters and search
  const [areaFilter, setAreaFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")

  // Dummy Data (replace with actual data fetching)
  const [notifications, setNotifications] = useState([])
  const [horseRecords, setHorseRecords] = useState([
    // Example dummy data
    {
      id: 1,
      name: "Spirit",
      owner: "John Doe",
      location: "Cebu City",
      status: "healthy",
      age: "5 years",
      breed: "Arabian",
      sex: "Male",
      contact: "09123456789",
      email: "john.doe@example.com",
      facebook: "facebook.com/john.doe",
      medicalRecords: [
        {
          id: 101,
          date: "2023-01-15",
          diagnosis: "Colic",
          veterinarian: "Dr. Smith",
          status: "completed",
          details: {
            signalment: {
              breed: "Arabian",
              age: "5 years",
              sex: "Male",
              color: "Bay",
              markings: "Star, Snip",
            },
            vitals: {
              temperature: "100.5°F",
              heartRate: "40 bpm",
              respiratoryRate: "16 bpm",
              capillaryRefillTime: "<2 sec",
            },
            assessment: "Mild colic, responsive to medication.",
            medication: {
              name: "Flunixin Meglumine",
              dosage: "1.1 mg/kg IV",
              frequency: "Once",
              route: "Intravenous",
            },
            remarks: "Advised owner to monitor for recurrence.",
          },
        },
        {
          id: 102,
          date: "2023-03-20",
          diagnosis: "Lameness (Left Fore)",
          veterinarian: "Dr. Jones",
          status: "ongoing",
          details: {
            signalment: {
              breed: "Arabian",
              age: "5 years",
              sex: "Male",
              color: "Bay",
              markings: "Star, Snip",
            },
            vitals: {
              temperature: "99.8°F",
              heartRate: "36 bpm",
              respiratoryRate: "12 bpm",
              capillaryRefillTime: "<2 sec",
            },
            assessment: "Mild lameness, suspected soft tissue injury.",
            medication: {
              name: "Phenylbutazone",
              dosage: "4.4 mg/kg PO",
              frequency: "BID",
              route: "Oral",
            },
            remarks: "Rest and controlled exercise recommended.",
          },
        },
      ],
      treatmentHistory: [
        {
          id: 201,
          date: "2023-01-15",
          treatment: "Pain Management",
          administeredBy: "Dr. Smith",
          result: "Successful",
          details: {
            treatmentInfo: {
              type: "Pain Management",
              date: "2023-01-15",
              administeredBy: "Dr. Smith",
              dosage: "1.1 mg/kg Flunixin Meglumine",
              route: "Intravenous",
              duration: "Single dose",
            },
            medicalData: {
              temperature: "100.5°F",
              heartRate: "40 bpm",
              respiratoryRate: "16 bpm",
              capillaryRefillTime: "<2 sec",
            },
            preVaccination: "No pre-vaccination required.",
            nextVaccination: "Annual tetanus booster due 2024-01-15.",
          },
        },
        {
          id: 202,
          date: "2023-03-20",
          treatment: "Anti-inflammatory",
          administeredBy: "Dr. Jones",
          result: "Ongoing",
          details: {
            treatmentInfo: {
              type: "Anti-inflammatory",
              date: "2023-03-20",
              administeredBy: "Dr. Jones",
              dosage: "4.4 mg/kg Phenylbutazone",
              route: "Oral",
              duration: "7 days",
            },
            medicalData: {
              temperature: "99.8°F",
              heartRate: "36 bpm",
              respiratoryRate: "12 bpm",
            },
            preVaccination: "No pre-vaccination required.",
            nextVaccination: "Re-evaluation in 7 days.",
          },
        },
      ],
    },
    {
      id: 2,
      name: "Thunder",
      owner: "Jane Smith",
      location: "Manila",
      status: "sick",
      age: "8 years",
      breed: "Thoroughbred",
      sex: "Female",
      contact: "09234567890",
      email: "jane.smith@example.com",
      facebook: "facebook.com/jane.smith",
      medicalRecords: [],
      treatmentHistory: [],
    },
  ])

  const [selectedHorse, setSelectedHorse] = useState(null)
  const [selectedMedicalRecord, setSelectedMedicalRecord] = useState(null)
  const [selectedTreatmentHistory, setSelectedTreatmentHistory] = useState(null)

  // New state for adding medical record
  const [newMedicalRecordData, setNewMedicalRecordData] = useState({
    date: "",
    diagnosis: "",
    veterinarian: "",
    status: "completed", // Default value
    details: {
      signalment: { breed: "", age: "", sex: "", color: "", markings: "" },
      vitals: { temperature: "", heartRate: "", respiratoryRate: "", capillaryRefillTime: "" },
      assessment: "",
      medication: { name: "", dosage: "", frequency: "", route: "" },
      remarks: "",
    },
  })

  // New state for adding treatment history
  const [newTreatmentHistoryData, setNewTreatmentHistoryData] = useState({
    date: "",
    treatment: "",
    administeredBy: "",
    result: "Successful", // Default value
    details: {
      treatmentInfo: { type: "", date: "", administeredBy: "", dosage: "", route: "", duration: "" },
      medicalData: { temperature: "", heartRate: "", respiratoryRate: "", capillaryRefillTime: "" },
      preVaccination: "",
      nextVaccination: "",
    },
  })

  // Refs for click outside functionality
  const notificationBellRef = useRef(null)
  const notificationDropdownRef = useRef(null)
  const horseModalRef = useRef(null)
  const medicalRecordModalRef = useRef(null)
  const treatmentHistoryModalRef = useRef(null)
  const logoutModalRef = useRef(null)
  const addMedicalRecordModalRef = useRef(null) // New ref
  const addTreatmentHistoryModalRef = useRef(null) // New ref

  // Helper to format time for notifications
  const formatTimeAgo = useCallback((timestamp) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60))
    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }, [])

  const getNotificationIconClass = (type) => {
    const icons = {
      info: "fas fa-info-circle",
      success: "fas fa-check-circle",
      warning: "fas fa-exclamation-triangle",
      error: "fas fa-times-circle",
    }
    return icons[type] || icons.info
  }

  const markAsRead = (notificationId) => {
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const deleteNotification = (notificationId) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
  }

  const loadNotifications = useCallback(() => {
    // Placeholder for fetching notifications from backend
    setNotifications([]) // Initialize as empty
  }, [])

  const filteredHorseRecords = useCallback(() => {
    let filtered = horseRecords
    if (areaFilter !== "all") {
      filtered = filtered.filter((horse) => horse.location.toLowerCase().includes(areaFilter.toLowerCase()))
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((horse) => horse.status === statusFilter)
    }
    if (searchTerm) {
      filtered = filtered.filter(
        (horse) =>
          horse.name.toLowerCase().includes(searchTerm) ||
          horse.owner.toLowerCase().includes(searchTerm) ||
          horse.location.toLowerCase().includes(searchTerm),
      )
    }
    return filtered
  }, [horseRecords, areaFilter, statusFilter, searchTerm])

  const viewHorseDetails = (horseId) => {
    const horse = horseRecords.find((h) => h.id === horseId)
    setSelectedHorse(horse)
    setIsHorseModalOpen(true)
  }

  const closeHorseModal = () => {
    setIsHorseModalOpen(false)
    setSelectedHorse(null)
  }

  const viewMedicalRecord = (record) => {
    setSelectedMedicalRecord(record)
    setIsMedicalRecordModalOpen(true)
    closeHorseModal()
  }

  // FIXED: Back button navigation with proper timing
  const closeMedicalRecord = () => {
    setIsMedicalRecordModalOpen(false)
    setSelectedMedicalRecord(null)
    // Add a small delay to ensure proper state transition
    setTimeout(() => {
      setIsHorseModalOpen(true)
    }, 50)
  }

  const viewTreatmentHistory = (record) => {
    setSelectedTreatmentHistory(record)
    setIsTreatmentHistoryModal(true)
    closeHorseModal()
  }

  // FIXED: Back button navigation with proper timing
  const closeTreatmentHistory = () => {
    setIsTreatmentHistoryModal(false)
    setSelectedTreatmentHistory(null)
    // Add a small delay to ensure proper state transition
    setTimeout(() => {
      setIsHorseModalOpen(true)
    }, 50)
  }

  const printRecord = () => {
    window.print()
  }

  const printTreatmentRecord = () => {
    window.print()
  }

  const handleSearchInput = (e) => {
    setSearchTerm(e.target.value.toLowerCase())
  }

  const handleAreaFilterChange = (e) => {
    setAreaFilter(e.target.value)
  }

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value)
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
    // In a real app, clear authentication tokens/session
    navigate("/CtuLogin") // Assuming this is your login route
    closeLogoutModal()
  }

  const toggleSidebar = () => {
    setIsSidebarExpanded((prev) => !prev)
  }

  // Functions for Add Medical Record modal
  const openAddMedicalRecordModal = () => {
    setIsAddMedicalRecordModalOpen(true)
    setIsHorseModalOpen(false) // Only hide the horse details modal, do not clear selectedHorse
  }

  const closeAddMedicalRecordModal = () => {
    setIsAddMedicalRecordModalOpen(false)
    setNewMedicalRecordData({
      date: "",
      diagnosis: "",
      veterinarian: "",
      status: "completed",
      details: {
        signalment: { breed: "", age: "", sex: "", color: "", markings: "" },
        vitals: { temperature: "", heartRate: "", respiratoryRate: "", capillaryRefillTime: "" },
        assessment: "",
        medication: { name: "", dosage: "", frequency: "", route: "" },
        remarks: "",
      },
    })
    setIsHorseModalOpen(true) // Go back to horse details modal
  }

  // FIXED: Handle nested object properties correctly to prevent [object Object]
  const handleAddMedicalRecordChange = (e) => {
    const { name, value } = e.target

    if (name.startsWith("details.")) {
      const pathParts = name.split(".")

      if (pathParts.length === 2) {
        // Handle direct details properties like details.assessment, details.remarks
        const field = pathParts[1]
        setNewMedicalRecordData((prev) => ({
          ...prev,
          details: {
            ...prev.details,
            [field]: value,
          },
        }))
      } else if (pathParts.length === 3) {
        // Handle nested properties like details.signalment.breed, details.vitals.temperature
        const [, section, field] = pathParts
        setNewMedicalRecordData((prev) => ({
          ...prev,
          details: {
            ...prev.details,
            [section]: {
              ...prev.details[section],
              [field]: value,
            },
          },
        }))
      }
    } else {
      setNewMedicalRecordData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const submitAddMedicalRecord = (e) => {
    e.preventDefault()
    if (selectedHorse) {
      const newRecordId =
        selectedHorse.medicalRecords.length > 0 ? Math.max(...selectedHorse.medicalRecords.map((r) => r.id)) + 1 : 101
      const newRecord = { id: newRecordId, ...newMedicalRecordData }
      setHorseRecords((prevRecords) =>
        prevRecords.map((horse) =>
          horse.id === selectedHorse.id ? { ...horse, medicalRecords: [...horse.medicalRecords, newRecord] } : horse,
        ),
      )
      setSelectedHorse((prev) => ({
        ...prev,
        medicalRecords: [...prev.medicalRecords, newRecord],
      })) // Update selectedHorse immediately for display
      closeAddMedicalRecordModal()
      alert("Medical record added successfully!")
    }
  }

  // Functions for Add Treatment History modal
  const openAddTreatmentHistoryModal = () => {
    setIsAddTreatmentHistoryModalOpen(true)
    setIsHorseModalOpen(false) // Only hide the horse details modal, do not clear selectedHorse
  }

  const closeAddTreatmentHistoryModal = () => {
    setIsAddTreatmentHistoryModalOpen(false)
    setNewTreatmentHistoryData({
      date: "",
      treatment: "",
      administeredBy: "",
      result: "Successful",
      details: {
        treatmentInfo: { type: "", date: "", administeredBy: "", dosage: "", route: "", duration: "" },
        medicalData: { temperature: "", heartRate: "", respiratoryRate: "", capillaryRefillTime: "" },
        preVaccination: "",
        nextVaccination: "",
      },
    })
    setIsHorseModalOpen(true) // Go back to horse details modal
  }

  // FIXED: Handle nested object properties correctly to prevent [object Object]
  const handleAddTreatmentHistoryChange = (e) => {
    const { name, value } = e.target

    if (name.startsWith("details.")) {
      const pathParts = name.split(".")

      if (pathParts.length === 2) {
        // Handle direct details properties like details.preVaccination, details.nextVaccination
        const field = pathParts[1]
        setNewTreatmentHistoryData((prev) => ({
          ...prev,
          details: {
            ...prev.details,
            [field]: value,
          },
        }))
      } else if (pathParts.length === 3) {
        // Handle nested properties like details.treatmentInfo.type, details.medicalData.temperature
        const [, section, field] = pathParts
        setNewTreatmentHistoryData((prev) => ({
          ...prev,
          details: {
            ...prev.details,
            [section]: {
              ...prev.details[section],
              [field]: value,
            },
          },
        }))
      }
    } else {
      setNewTreatmentHistoryData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const submitAddTreatmentHistory = (e) => {
    e.preventDefault()
    if (selectedHorse) {
      const newRecordId =
        selectedHorse.treatmentHistory.length > 0
          ? Math.max(...selectedHorse.treatmentHistory.map((r) => r.id)) + 1
          : 201
      const newRecord = { id: newRecordId, ...newTreatmentHistoryData }
      setHorseRecords((prevRecords) =>
        prevRecords.map((horse) =>
          horse.id === selectedHorse.id
            ? { ...horse, treatmentHistory: [...horse.treatmentHistory, newRecord] }
            : horse,
        ),
      )
      setSelectedHorse((prev) => ({
        ...prev,
        treatmentHistory: [...prev.treatmentHistory, newRecord],
      })) // Update selectedHorse immediately for display
      closeAddTreatmentHistoryModal()
      alert("Treatment history added successfully!")
    }
  }

  // Effects for click outside and resize
  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close notification dropdown
      if (
        notificationBellRef.current &&
        !notificationBellRef.current.contains(event.target) &&
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(event.target)
      ) {
        setIsNotificationDropdownOpen(false)
      }

      // Close horse details modal
      if (isHorseModalOpen && horseModalRef.current && event.target === horseModalRef.current) {
        closeHorseModal()
      }

      // Close medical record detail modal
      if (isMedicalRecordModalOpen && medicalRecordModalRef.current && event.target === medicalRecordModalRef.current) {
        closeMedicalRecord()
      }

      // Close treatment history detail modal
      if (
        isTreatmentHistoryModalOpen &&
        treatmentHistoryModalRef.current &&
        event.target === treatmentHistoryModalRef.current
      ) {
        closeTreatmentHistory()
      }

      // Close logout modal
      if (isLogoutModalOpen && logoutModalRef.current && event.target === logoutModalRef.current) {
        closeLogoutModal()
      }

      // Close Add Medical Record modal (only if click is on overlay)
      if (
        isAddMedicalRecordModalOpen &&
        addMedicalRecordModalRef.current &&
        event.target === addMedicalRecordModalRef.current
      ) {
        closeAddMedicalRecordModal()
      }

      // Close Add Treatment History modal (only if click is on overlay)
      if (
        isAddTreatmentHistoryModalOpen &&
        addTreatmentHistoryModalRef.current &&
        event.target === addTreatmentHistoryModalRef.current
      ) {
        closeAddTreatmentHistoryModal()
      }

      // Close mobile sidebar
      const sidebar = document.getElementById("sidebar")
      const mobileMenuBtn = document.querySelector(".mobile-menu-btn")
      if (
        window.innerWidth <= 768 &&
        isSidebarExpanded &&
        sidebar &&
        !sidebar.contains(event.target) &&
        mobileMenuBtn &&
        !mobileMenuBtn.contains(event.target)
      ) {
        setIsSidebarExpanded(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [
    isNotificationDropdownOpen,
    isHorseModalOpen,
    isMedicalRecordModalOpen,
    isTreatmentHistoryModalOpen,
    isLogoutModalOpen,
    isAddMedicalRecordModalOpen,
    isAddTreatmentHistoryModalOpen,
    isSidebarExpanded,
  ])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsSidebarExpanded(false)
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const unreadNotificationCount = notifications.filter((n) => !n.read).length
  const currentFilteredHorseRecords = filteredHorseRecords()

  return (
    <div className="bodyWrapper">
      <button className="mobile-menu-btn" onClick={toggleSidebar}>
        ☰
      </button>

      <div className={`sidebar ${isSidebarExpanded ? "open" : ""}`} id="sidebar">
        <div className="sidebar-logo">
          <img src="/images/logo.png" alt="CTU Logo" className="logo" />
        </div>
        <nav className="nav-menu">
          {[
            { name: "Dashboard", iconClass: "fas fa-th-large", path: "/CtuDashboard" },
            { name: "Account Approval", iconClass: "fas fa-user-check", path: "/CtuAccountApproval" },
            { name: "Access Requests", iconClass: "fas fa-file-alt", path: "/CtuAccessRequest" },
            { name: "Horse Records", iconClass: "fas fa-clipboard-list", path: "/CtuHorseRecord", active: true },
            { name: "Health Reports", iconClass: "fas fa-chart-bar", path: "/CtuHealthReport" },
            { name: "Announcements", iconClass: "fas fa-bullhorn", path: "/CtuAnnouncement" },
            { name: "Directory", iconClass: "fas fa-folder", path: "/CtuDirectory" },
            { name: "Settings", iconClass: "fas fa-cog", path: "/CtuSettings" },
          ].map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`nav-item ${item.active ? "active" : ""}`}
              onClick={() => {
                if (isSidebarExpanded) {
                  setIsSidebarExpanded(false)
                }
              }}
            >
              <i className={`nav-icon ${item.iconClass}`}></i>
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="logout">
          <a href="#" className="logout-btn" id="logoutBtn" onClick={openLogoutModal}>
            <i className="logout-icon fas fa-sign-out-alt"></i>
            Log Out
          </a>
        </div>
      </div>

      <div className="main-content">
        <header className="header">
          <div className="search-container">
            <div className="search-icon"></div>
            <input
              type="text"
              className="search-input"
              placeholder="Search......"
              id="searchInput"
              onChange={handleSearchInput}
            />
          </div>
          <div
            className="notification-bell"
            id="notification-bell"
            ref={notificationBellRef}
            onClick={() => setIsNotificationDropdownOpen((prev) => !prev)}
          >
            <i className="fas fa-bell"></i>
            {unreadNotificationCount > 0 && (
              <div className="notification-count" style={{ display: "flex" }}>
                {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
              </div>
            )}
            <div
              className={`notification-dropdown ${isNotificationDropdownOpen ? "show" : ""}`}
              id="notification-dropdown"
              ref={notificationDropdownRef}
            >
              <div className="notification-header">
                <h3>Notifications</h3>
                {unreadNotificationCount > 0 && (
                  <button className="mark-all-read" onClick={markAllAsRead}>
                    Mark all as read
                  </button>
                )}
              </div>
              <div id="notificationList">
                {notifications.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-bell-slash"></i>
                    <h3>No notifications</h3>
                    <p>You're all caught up!</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div key={notification.id} className={`notification-item ${!notification.read ? "unread" : ""}`}>
                      <div className="notification-actions">
                        {!notification.read && (
                          <button
                            className="notification-action"
                            onClick={() => markAsRead(notification.id)}
                            title="Mark as read"
                          >
                            <i className="fas fa-check"></i>
                          </button>
                        )}
                        <button
                          className="notification-action"
                          onClick={() => deleteNotification(notification.id)}
                          title="Delete"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                      <div className="notification-title">
                        <i
                          className={`notification-icon ${notification.type} ${getNotificationIconClass(
                            notification.type,
                          )}`}
                        ></i>
                        {notification.title}
                      </div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">{formatTimeAgo(notification.timestamp)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="content-area">
          <div className="page-header">
            <h1 className="page-title">Horse Records</h1>
            <div className="controls-row">
              <div className="filter-controls">
                <select className="filter-select" id="areaFilter" value={areaFilter} onChange={handleAreaFilterChange}>
                  <option value="all">Filter by Area</option>
                  <option value="cebu">Cebu City</option>
                  <option value="manila">Manila</option>
                  <option value="davao">Davao</option>
                </select>
                <select
                  className="filter-select"
                  id="statusFilter"
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                >
                  <option value="all">All Statuses</option>
                  <option value="healthy">Healthy</option>
                  <option value="sick">Sick</option>
                  <option value="quarantine">Quarantine</option>
                </select>
              </div>
              {/* Removed Add Horse button */}
            </div>
            <div className="horse-table">
              <div className="table-header">
                <div>ID</div>
                <div>Name</div>
                <div>Owner</div>
                <div>Location</div>
                <div>Status</div>
                <div>Action</div>
              </div>
              {currentFilteredHorseRecords.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-clipboard-list"></i>
                  <h3>No horse records</h3>
                  <p>Horse records will appear here when available</p>
                </div>
              ) : (
                currentFilteredHorseRecords.map((horse) => (
                  <div className="table-row" key={horse.id}>
                    <div>{horse.id}</div>
                    <div>{horse.name}</div>
                    <div>{horse.owner}</div>
                    <div>{horse.location}</div>
                    <div>
                      <span className={`status-badge status-${horse.status}`}>{horse.status}</span>
                    </div>
                    <div>
                      <button className="view-btn" onClick={() => viewHorseDetails(horse.id)}>
                        View
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Widget - Button Only */}
      <div className="chat-widget">
        <button className="chat-button" id="chatButton" onClick={() => navigate("/CtuMessage")}>
          <div className="chat-dots">
            <div className="chat-dot"></div>
            <div className="chat-dot"></div>
            <div className="chat-dot"></div>
          </div>
        </button>
      </div>

      {/* Horse Details Modal */}
      {isHorseModalOpen && selectedHorse && (
        <div className="modal-overlay active" id="horseModal" ref={horseModalRef}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Horse Details</h2>
              <button className="modal-close" onClick={closeHorseModal}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              {/* Horse Basic Information */}
              <div className="horse-info-section">
                <div className="horse-header">
                  <div className="horse-avatar" id="horseAvatar">
                    {selectedHorse.name.charAt(0)}
                  </div>
                  <div className="horse-basic-info">
                    <h3 id="horseName">{selectedHorse.name}</h3>
                    <div className="horse-details">
                      <span id="horseAge">Age: {selectedHorse.age}</span> •
                      <span id="horseBreed">Breed: {selectedHorse.breed}</span>
                    </div>
                  </div>
                </div>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Owner</span>
                    <span className="info-value" id="horseOwner">
                      {selectedHorse.owner}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Contact</span>
                    <span className="info-value" id="horseContact">
                      {selectedHorse.contact}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Location</span>
                    <span className="info-value" id="horseLocation">
                      {selectedHorse.location}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Sex</span>
                    <span className="info-value" id="horseSex">
                      {selectedHorse.sex}
                    </span>
                  </div>
                </div>
              </div>

              {/* Medical Record Section */}
              <div className="section-title">
                Medical Record
                <button
                  className="add-record-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    openAddMedicalRecordModal()
                  }}
                >
                  <i className="fas fa-plus"></i> Add New
                </button>
              </div>
              <div className="records-table">
                <div className="records-header">
                  <div>Date</div>
                  <div>Diagnosis</div>
                  <div>Veterinarian</div>
                  <div>Status</div>
                  <div>Action</div>
                </div>
                {selectedHorse.medicalRecords.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-file-medical"></i>
                    <h3>No medical records</h3>
                    <p>Medical records will appear here when available</p>
                  </div>
                ) : (
                  selectedHorse.medicalRecords.map((record) => (
                    <div className="records-row" key={record.id}>
                      <div>{record.date}</div>
                      <div>{record.diagnosis}</div>
                      <div>{record.veterinarian}</div>
                      <div>
                        <span className={`status-badge status-${record.status}`}>{record.status}</span>
                      </div>
                      <div>
                        <button className="view-btn" onClick={() => viewMedicalRecord(record)}>
                          View
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Treatment History Section */}
              <div className="section-title">
                Treatment History
                <button
                  className="add-record-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    openAddTreatmentHistoryModal()
                  }}
                >
                  <i className="fas fa-plus"></i> Add New
                </button>
              </div>
              <div className="records-table">
                <div className="treatment-header">
                  <div>Date</div>
                  <div>Treatment</div>
                  <div>Administered By</div>
                  <div>Result</div>
                  <div>Action</div>
                </div>
                {selectedHorse.treatmentHistory.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-syringe"></i>
                    <h3>No treatment history</h3>
                    <p>Treatment records will appear here when available</p>
                  </div>
                ) : (
                  selectedHorse.treatmentHistory.map((record) => (
                    <div className="treatment-row" key={record.id}>
                      <div>{record.date}</div>
                      <div>{record.treatment}</div>
                      <div>{record.administeredBy}</div>
                      <div>
                        <span className={`status-badge status-${record.result.toLowerCase()}`}>{record.result}</span>
                      </div>
                      <div>
                        <button className="view-btn" onClick={() => viewTreatmentHistory(record)}>
                          View
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Medical Record Detail Modal */}
      {isMedicalRecordModalOpen && selectedMedicalRecord && (
        <div className="modal-overlay active" id="medicalRecordModal" ref={medicalRecordModalRef}>
          <div className="modal-content medical-modal-content">
            <div className="medical-modal-header">
              <h3>ECHO: CTU VET-MED</h3>
              <button className="back-btn" onClick={closeMedicalRecord}>
                Back to Records
              </button>
            </div>
            <div className="medical-modal-body">
              <div className="horse-profile">
                <div className="profile-avatar">{selectedHorse?.name.charAt(0)}</div>
                <div className="profile-info">
                  <h4>Medical Record</h4>
                  <span className="completed-badge">Completed</span>
                </div>
              </div>
              <div className="profile-details">
                <div className="detail-item">
                  <span className="detail-label">Breed</span>
                  <div className="detail-value">{selectedMedicalRecord.details.signalment.breed}</div>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Age</span>
                  <div className="detail-value">{selectedMedicalRecord.details.signalment.age}</div>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Sex</span>
                  <div className="detail-value">{selectedMedicalRecord.details.signalment.sex}</div>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Owner</span>
                  <div className="detail-value">{selectedHorse?.owner}</div>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Contact</span>
                  <div className="detail-value">{selectedHorse?.contact}</div>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Location</span>
                  <div className="detail-value">{selectedHorse?.location}</div>
                </div>
              </div>
              <div className="medical-section">
                <h5 className="medical-record-title">Medical Record Details</h5>
                {selectedMedicalRecord.details ? (
                  <>
                    <div className="section-title">Signalment</div>
                    <div className="signalment-grid">
                      <div className="info-item">
                        <span className="info-label">Color</span>
                        <span className="info-value">{selectedMedicalRecord.details.signalment.color}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Markings</span>
                        <span className="info-value">{selectedMedicalRecord.details.signalment.markings}</span>
                      </div>
                    </div>
                    <div className="section-title">Vital Signs</div>
                    <div className="signalment-grid">
                      <div className="vital-sign">
                        <div className="vital-value">{selectedMedicalRecord.details.vitals.temperature}</div>
                        <div className="vital-label">Temperature</div>
                      </div>
                      <div className="vital-sign">
                        <div className="vital-value">{selectedMedicalRecord.details.vitals.heartRate}</div>
                        <div className="vital-label">Heart Rate</div>
                      </div>
                      <div className="vital-sign">
                        <div className="vital-value">{selectedMedicalRecord.details.vitals.respiratoryRate}</div>
                        <div className="vital-label">Respiratory Rate</div>
                      </div>
                      <div className="vital-sign">
                        <div className="vital-value">{selectedMedicalRecord.details.vitals.capillaryRefillTime}</div>
                        <div className="vital-label">CRT</div>
                      </div>
                    </div>
                    <div className="section-title">Assessment</div>
                    <p className="assessment-text">{selectedMedicalRecord.details.assessment}</p>
                    <div className="medication-section">
                      <div className="medication-title">Medication Administered</div>
                      <div className="medication-details">
                        <div>
                          <strong>Name:</strong> {selectedMedicalRecord.details.medication.name}
                        </div>
                        <div>
                          <strong>Dosage:</strong> {selectedMedicalRecord.details.medication.dosage}
                        </div>
                        <div>
                          <strong>Frequency:</strong> {selectedMedicalRecord.details.medication.frequency}
                        </div>
                        <div>
                          <strong>Route:</strong> {selectedMedicalRecord.details.medication.route}
                        </div>
                      </div>
                    </div>
                    <div className="remarks-section">
                      <div className="remarks-title">Remarks</div>
                      <p className="remarks-text">{selectedMedicalRecord.details.remarks}</p>
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <i className="fas fa-file-medical"></i>
                    <h3>No medical record data</h3>
                    <p>Medical record details will appear here when available</p>
                  </div>
                )}
              </div>
              {/* Print Record Button */}
              <button className="print-btn" onClick={printRecord}>
                Print Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Treatment History Detail Modal */}
      {isTreatmentHistoryModalOpen && selectedTreatmentHistory && (
        <div className="modal-overlay active" id="treatmentHistoryModal" ref={treatmentHistoryModalRef}>
          <div className="modal-content medical-modal-content">
            <div className="medical-modal-header">
              <h3>ECHO: CTU VET-MED</h3>
              <button className="back-btn" onClick={closeTreatmentHistory}>
                Back to Records
              </button>
            </div>
            <div className="medical-modal-body">
              <div>
                <h4 className="treatment-title">Treatment History Details</h4>
                {selectedTreatmentHistory.details ? (
                  <>
                    <div className="treatment-info-section">
                      <div className="treatment-info-title">Treatment Information</div>
                      <div className="treatment-info-grid">
                        <div className="treatment-info-item">
                          <strong>Type:</strong> {selectedTreatmentHistory.details.treatmentInfo.type}
                        </div>
                        <div className="treatment-info-item">
                          <strong>Date:</strong> {selectedTreatmentHistory.details.treatmentInfo.date}
                        </div>
                        <div className="treatment-info-item">
                          <strong>Administered By:</strong>{" "}
                          {selectedTreatmentHistory.details.treatmentInfo.administeredBy}
                        </div>
                        <div className="treatment-info-item">
                          <strong>Dosage:</strong> {selectedTreatmentHistory.details.treatmentInfo.dosage}
                        </div>
                        <div className="treatment-info-item">
                          <strong>Route:</strong> {selectedTreatmentHistory.details.treatmentInfo.route}
                        </div>
                        <div className="treatment-info-item">
                          <strong>Duration:</strong> {selectedTreatmentHistory.details.treatmentInfo.duration}
                        </div>
                      </div>
                    </div>
                    <div className="medical-data-section">
                      <div className="medical-data-title">Medical Data at Time of Treatment</div>
                      <div className="medical-data-grid">
                        <div className="medical-data-item">
                          <div className="vital-value">{selectedTreatmentHistory.details.medicalData.temperature}</div>
                          <div className="vital-label">Temperature</div>
                        </div>
                        <div className="medical-data-item">
                          <div className="vital-value">{selectedTreatmentHistory.details.medicalData.heartRate}</div>
                          <div className="vital-label">Heart Rate</div>
                        </div>
                        <div className="medical-data-item">
                          <div className="vital-value">
                            {selectedTreatmentHistory.details.medicalData.respiratoryRate}
                          </div>
                          <div className="vital-label">Respiratory Rate</div>
                        </div>
                        <div className="medical-data-item">
                          <div className="vital-value">
                            {selectedTreatmentHistory.details.medicalData.capillaryRefillTime}
                          </div>
                          <div className="vital-label">CRT</div>
                        </div>
                      </div>
                    </div>
                    <div className="pre-vaccination-section">
                      <div className="pre-vaccination-title">Pre-Vaccination Status</div>
                      <p className="pre-vaccination-text">{selectedTreatmentHistory.details.preVaccination}</p>
                    </div>
                    <div className="next-vaccination-section">
                      <div className="next-vaccination-title">Next Vaccination/Follow-up</div>
                      <p className="next-vaccination-text">{selectedTreatmentHistory.details.nextVaccination}</p>
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <i className="fas fa-syringe"></i>
                    <h3>No treatment history data</h3>
                    <p>Treatment history details will appear here when available</p>
                  </div>
                )}
                {/* Print Record Button */}
                <button className="print-btn" onClick={printTreatmentRecord}>
                  Print Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Medical Record Modal */}
      {isAddMedicalRecordModalOpen && selectedHorse && (
        <div className="modal-overlay active" id="addMedicalRecordModal" ref={addMedicalRecordModalRef}>
          <div className="modal-content add-record-modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Add New Medical Record for {selectedHorse.name}</h2>
              <button className="modal-close" onClick={closeAddMedicalRecordModal}>
                &times;
              </button>
            </div>
            <form onSubmit={submitAddMedicalRecord} className="modal-body">
              <div className="add-record-form-grid">
                <div className="form-groups">
                  <label htmlFor="medicalDate" className="form-label">
                    Date:
                  </label>
                  <input
                    type="date"
                    id="medicalDate"
                    name="date"
                    className="form-input"
                    value={newMedicalRecordData.date}
                    onChange={handleAddMedicalRecordChange}
                    required
                  />
                </div>
                <div className="form-groups">
                  <label htmlFor="medicalDiagnosis" className="form-label">
                    Diagnosis:
                  </label>
                  <input
                    type="text"
                    id="medicalDiagnosis"
                    name="diagnosis"
                    className="form-input"
                    value={newMedicalRecordData.diagnosis}
                    onChange={handleAddMedicalRecordChange}
                    required
                  />
                </div>
                <div className="form-groups">
                  <label htmlFor="medicalVeterinarian" className="form-label">
                    Veterinarian:
                  </label>
                  <input
                    type="text"
                    id="medicalVeterinarian"
                    name="veterinarian"
                    className="form-input"
                    value={newMedicalRecordData.veterinarian}
                    onChange={handleAddMedicalRecordChange}
                    required
                  />
                </div>
                <div className="form-groups">
                  <label htmlFor="medicalStatus" className="form-label">
                    Status:
                  </label>
                  <select
                    id="medicalStatus"
                    name="status"
                    className="form-select"
                    value={newMedicalRecordData.status}
                    onChange={handleAddMedicalRecordChange}
                    required
                  >
                    <option value="completed">Completed</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                {/* Signalment */}
                <h4 className="form-section-title">Signalment</h4>
                <div className="form-groups">
                  <label htmlFor="signalmentBreed" className="form-label">
                    Breed:
                  </label>
                  <input
                    type="text"
                    id="signalmentBreed"
                    name="details.signalment.breed"
                    className="form-input"
                    value={newMedicalRecordData.details.signalment.breed}
                    onChange={handleAddMedicalRecordChange}
                  />
                </div>
                <div className="form-groups">
                  <label htmlFor="signalmentAge" className="form-label">
                    Age:
                  </label>
                  <input
                    type="text"
                    id="signalmentAge"
                    name="details.signalment.age"
                    className="form-input"
                    value={newMedicalRecordData.details.signalment.age}
                    onChange={handleAddMedicalRecordChange}
                  />
                </div>
                <div className="form-groups">
                  <label htmlFor="signalmentSex" className="form-label">
                    Sex:
                  </label>
                  <input
                    type="text"
                    id="signalmentSex"
                    name="details.signalment.sex"
                    className="form-input"
                    value={newMedicalRecordData.details.signalment.sex}
                    onChange={handleAddMedicalRecordChange}
                  />
                </div>
                <div className="form-groups">
                  <label htmlFor="signalmentColor" className="form-label">
                    Color:
                  </label>
                  <input
                    type="text"
                    id="signalmentColor"
                    name="details.signalment.color"
                    className="form-input"
                    value={newMedicalRecordData.details.signalment.color}
                    onChange={handleAddMedicalRecordChange}
                  />
                </div>
                <div className="form-groups">
                  <label htmlFor="signalmentMarkings" className="form-label">
                    Markings:
                  </label>
                  <input
                    type="text"
                    id="signalmentMarkings"
                    name="details.signalment.markings"
                    className="form-input"
                    value={newMedicalRecordData.details.signalment.markings}
                    onChange={handleAddMedicalRecordChange}
                  />
                </div>

                {/* Vitals */}
                <h4 className="form-section-title">Vital Signs</h4>
                <div className="form-groups">
                  <label htmlFor="vitalsTemp" className="form-label">
                    Temperature:
                  </label>
                  <input
                    type="text"
                    id="vitalsTemp"
                    name="details.vitals.temperature"
                    className="form-input"
                    value={newMedicalRecordData.details.vitals.temperature}
                    onChange={handleAddMedicalRecordChange}
                  />
                </div>
                <div className="form-groups">
                  <label htmlFor="vitalsHeartRate" className="form-label">
                    Heart Rate:
                  </label>
                  <input
                    type="text"
                    id="vitalsHeartRate"
                    name="details.vitals.heartRate"
                    className="form-input"
                    value={newMedicalRecordData.details.vitals.heartRate}
                    onChange={handleAddMedicalRecordChange}
                  />
                </div>
                <div className="form-groups">
                  <label htmlFor="vitalsRespRate" className="form-label">
                    Respiratory Rate:
                  </label>
                  <input
                    type="text"
                    id="vitalsRespRate"
                    name="details.vitals.respiratoryRate"
                    className="form-input"
                    value={newMedicalRecordData.details.vitals.respiratoryRate}
                    onChange={handleAddMedicalRecordChange}
                  />
                </div>
                <div className="form-groups">
                  <label htmlFor="vitalsCRT" className="form-label">
                    CRT:
                  </label>
                  <input
                    type="text"
                    id="vitalsCRT"
                    name="details.vitals.capillaryRefillTime"
                    className="form-input"
                    value={newMedicalRecordData.details.vitals.capillaryRefillTime}
                    onChange={handleAddMedicalRecordChange}
                  />
                </div>

                {/* Assessment */}
                <h4 className="form-section-title">Assessment</h4>
                <div className="form-groups full-width">
                  <label htmlFor="medicalAssessment" className="form-label">
                    Assessment:
                  </label>
                  <textarea
                    id="medicalAssessment"
                    name="details.assessment"
                    className="form-input"
                    value={newMedicalRecordData.details.assessment}
                    onChange={handleAddMedicalRecordChange}
                    rows="3"
                  ></textarea>
                </div>

                {/* Medication */}
                <h4 className="form-section-title">Medication Administered</h4>
                <div className="form-groups">
                  <label htmlFor="medicationName" className="form-label">
                    Name:
                  </label>
                  <input
                    type="text"
                    id="medicationName"
                    name="details.medication.name"
                    className="form-input"
                    value={newMedicalRecordData.details.medication.name}
                    onChange={handleAddMedicalRecordChange}
                  />
                </div>
                <div className="form-groups">
                  <label htmlFor="medicationDosage" className="form-label">
                    Dosage:
                  </label>
                  <input
                    type="text"
                    id="medicationDosage"
                    name="details.medication.dosage"
                    className="form-input"
                    value={newMedicalRecordData.details.medication.dosage}
                    onChange={handleAddMedicalRecordChange}
                  />
                </div>
                <div className="form-groups">
                  <label htmlFor="medicationFrequency" className="form-label">
                    Frequency:
                  </label>
                  <input
                    type="text"
                    id="medicationFrequency"
                    name="details.medication.frequency"
                    className="form-input"
                    value={newMedicalRecordData.details.medication.frequency}
                    onChange={handleAddMedicalRecordChange}
                  />
                </div>
                <div className="form-groups">
                  <label htmlFor="medicationRoute" className="form-label">
                    Route:
                  </label>
                  <input
                    type="text"
                    id="medicationRoute"
                    name="details.medication.route"
                    className="form-input"
                    value={newMedicalRecordData.details.medication.route}
                    onChange={handleAddMedicalRecordChange}
                  />
                </div>

                {/* Remarks */}
                <h4 className="form-section-title">Remarks</h4>
                <div className="form-groups full-width">
                  <label htmlFor="medicalRemarks" className="form-label">
                    Remarks:
                  </label>
                  <textarea
                    id="medicalRemarks"
                    name="details.remarks"
                    className="form-input"
                    value={newMedicalRecordData.details.remarks}
                    onChange={handleAddMedicalRecordChange}
                    rows="3"
                  ></textarea>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={closeAddMedicalRecordModal}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Add Medical Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Treatment History Modal */}
      {isAddTreatmentHistoryModalOpen && selectedHorse && (
        <div className="modal-overlay active" id="addTreatmentHistoryModal" ref={addTreatmentHistoryModalRef}>
          <div className="modal-content add-record-modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Add New Treatment History for {selectedHorse.name}</h2>
              <button className="modal-close" onClick={closeAddTreatmentHistoryModal}>
                &times;
              </button>
            </div>
            <form onSubmit={submitAddTreatmentHistory} className="modal-body">
              <div className="add-record-form-grid">
                <div className="form-groups">
                  <label htmlFor="treatmentDate" className="form-label">
                    Date:
                  </label>
                  <input
                    type="date"
                    id="treatmentDate"
                    name="date"
                    className="form-input"
                    value={newTreatmentHistoryData.date}
                    onChange={handleAddTreatmentHistoryChange}
                    required
                  />
                </div>
                <div className="form-groups">
                  <label htmlFor="treatmentType" className="form-label">
                    Treatment Type:
                  </label>
                  <input
                    type="text"
                    id="treatmentType"
                    name="treatment"
                    className="form-input"
                    value={newTreatmentHistoryData.treatment}
                    onChange={handleAddTreatmentHistoryChange}
                    required
                  />
                </div>
                <div className="form-groups">
                  <label htmlFor="treatmentAdministeredBy" className="form-label">
                    Administered By:
                  </label>
                  <input
                    type="text"
                    id="treatmentAdministeredBy"
                    name="administeredBy"
                    className="form-input"
                    value={newTreatmentHistoryData.administeredBy}
                    onChange={handleAddTreatmentHistoryChange}
                    required
                  />
                </div>
                <div className="form-groups">
                  <label htmlFor="treatmentResult" className="form-label">
                    Result:
                  </label>
                  <select
                    id="treatmentResult"
                    name="result"
                    className="form-select"
                    value={newTreatmentHistoryData.result}
                    onChange={handleAddTreatmentHistoryChange}
                    required
                  >
                    <option value="Successful">Successful</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Unsuccessful">Unsuccessful</option>
                  </select>
                </div>

                {/* Treatment Information */}
                <h4 className="form-section-title">Treatment Information</h4>
                <div className="form-groups">
                  <label htmlFor="tiType" className="form-label">
                    Type:
                  </label>
                  <input
                    type="text"
                    id="tiType"
                    name="details.treatmentInfo.type"
                    className="form-input"
                    value={newTreatmentHistoryData.details.treatmentInfo.type}
                    onChange={handleAddTreatmentHistoryChange}
                  />
                </div>
                <div className="form-groups">
                  <label htmlFor="tiDate" className="form-label">
                    Date:
                  </label>
                  <input
                    type="date"
                    id="tiDate"
                    name="details.treatmentInfo.date"
                    className="form-input"
                    value={newTreatmentHistoryData.details.treatmentInfo.date}
                    onChange={handleAddTreatmentHistoryChange}
                  />
                </div>
                <div className="form-groups">
                  <label htmlFor="tiAdministeredBy" className="form-label">
                    Administered By:
                  </label>
                  <input
                    type="text"
                    id="tiAdministeredBy"
                    name="details.treatmentInfo.administeredBy"
                    className="form-input"
                    value={newTreatmentHistoryData.details.treatmentInfo.administeredBy}
                    onChange={handleAddTreatmentHistoryChange}
                  />
                </div>
                <div className="form-groups">
                  <label htmlFor="tiDosage" className="form-label">
                    Dosage:
                  </label>
                  <input
                    type="text"
                    id="tiDosage"
                    name="details.treatmentInfo.dosage"
                    className="form-input"
                    value={newTreatmentHistoryData.details.treatmentInfo.dosage}
                    onChange={handleAddTreatmentHistoryChange}
                  />
                </div>
                <div className="form-groups">
                  <label htmlFor="tiRoute" className="form-label">
                    Route:
                  </label>
                  <input
                    type="text"
                    id="tiRoute"
                    name="details.treatmentInfo.route"
                    className="form-input"
                    value={newTreatmentHistoryData.details.treatmentInfo.route}
                    onChange={handleAddTreatmentHistoryChange}
                  />
                </div>
                <div className="form-groups">
                  <label htmlFor="tiDuration" className="form-label">
                    Duration:
                  </label>
                  <input
                    type="text"
                    id="tiDuration"
                    name="details.treatmentInfo.duration"
                    className="form-input"
                    value={newTreatmentHistoryData.details.treatmentInfo.duration}
                    onChange={handleAddTreatmentHistoryChange}
                  />
                </div>

                {/* Medical Data at Time of Treatment */}
                <h4 className="form-section-title">Medical Data at Time of Treatment</h4>
                <div className="form-groups">
                  <label htmlFor="mdTemp" className="form-label">
                    Temperature:
                  </label>
                  <input
                    type="text"
                    id="mdTemp"
                    name="details.medicalData.temperature"
                    className="form-input"
                    value={newTreatmentHistoryData.details.medicalData.temperature}
                    onChange={handleAddTreatmentHistoryChange}
                  />
                </div>
                <div className="form-groups">
                  <label htmlFor="mdHeartRate" className="form-label">
                    Heart Rate:
                  </label>
                  <input
                    type="text"
                    id="mdHeartRate"
                    name="details.medicalData.heartRate"
                    className="form-input"
                    value={newTreatmentHistoryData.details.medicalData.heartRate}
                    onChange={handleAddTreatmentHistoryChange}
                  />
                </div>
                <div className="form-groups">
                  <label htmlFor="mdRespRate" className="form-label">
                    Respiratory Rate:
                  </label>
                  <input
                    type="text"
                    id="mdRespRate"
                    name="details.medicalData.respiratoryRate"
                    className="form-input"
                    value={newTreatmentHistoryData.details.medicalData.respiratoryRate}
                    onChange={handleAddTreatmentHistoryChange}
                  />
                </div>
                <div className="form-groups">
                  <label htmlFor="mdCRT" className="form-label">
                    CRT:
                  </label>
                  <input
                    type="text"
                    id="mdCRT"
                    name="details.medicalData.capillaryRefillTime"
                    className="form-input"
                    value={newTreatmentHistoryData.details.medicalData.capillaryRefillTime}
                    onChange={handleAddTreatmentHistoryChange}
                  />
                </div>

                {/* Pre-Vaccination Status */}
                <h4 className="form-section-title">Pre-Vaccination Status</h4>
                <div className="form-groups full-width">
                  <textarea
                    id="preVaccination"
                    name="details.preVaccination"
                    className="form-input"
                    value={newTreatmentHistoryData.details.preVaccination}
                    onChange={handleAddTreatmentHistoryChange}
                    rows="3"
                  ></textarea>
                </div>

                {/* Next Vaccination/Follow-up */}
                <h4 className="form-section-title">Next Vaccination/Follow-up</h4>
                <div className="form-groups full-width">
                  <textarea
                    id="nextVaccination"
                    name="details.nextVaccination"
                    className="form-input"
                    value={newTreatmentHistoryData.details.nextVaccination}
                    onChange={handleAddTreatmentHistoryChange}
                    rows="3"
                  ></textarea>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={closeAddTreatmentHistoryModal}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Add Treatment History
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={`modal-overlay ${isLogoutModalOpen ? "active" : ""}`} id="logoutModal" ref={logoutModalRef}>
        <div className="logout-modal">
          <div className="logout-modal-icon">
            <i className="fas fa-sign-out-alt" />
          </div>
          <h3>Confirm Logout</h3>
          <p>Are you sure you want to log out of your account?</p>
          <div className="logout-modal-buttons">
            <button className={`logout-modal-btn cancel`} onClick={closeLogoutModal}>
              No
            </button>
            <button className={`logout-modal-btn confirm`} onClick={confirmLogout}>
              Yes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CtuHorseRecord
