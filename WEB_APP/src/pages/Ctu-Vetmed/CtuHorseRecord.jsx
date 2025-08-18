"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
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

  // State for filters and search
  const [areaFilter, setAreaFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")

  const [notifications, setNotifications] = useState([])
  const [horseRecords, setHorseRecords] = useState([])

  const [selectedHorse, setSelectedHorse] = useState(null)
  const [selectedMedicalRecord, setSelectedMedicalRecord] = useState(null)
  const [selectedTreatmentHistory, setSelectedTreatmentHistory] = useState(null)

  // Refs for click outside functionality
  const notificationBellRef = useRef(null)
  const notificationDropdownRef = useRef(null)
  const horseModalRef = useRef(null)
  const medicalRecordModalRef = useRef(null)
  const treatmentHistoryModalRef = useRef(null)
  const logoutModalRef = useRef(null)

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
              <div className="section-title">Medical Record</div>
              <div className="records-table">
                <div className="records-header">
                  <div>Date</div>
                  <div>Diagnosis</div>
                  <div>Veterinarian</div>
                  <div>Status</div>
                  <div>Action</div>
                </div>
                {selectedHorse.medicalRecords?.length === 0 || !selectedHorse.medicalRecords ? (
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
              <div className="section-title">Treatment History</div>
              <div className="records-table">
                <div className="treatment-header">
                  <div>Date</div>
                  <div>Treatment</div>
                  <div>Administered By</div>
                  <div>Result</div>
                  <div>Action</div>
                </div>
                {selectedHorse.treatmentHistory?.length === 0 || !selectedHorse.treatmentHistory ? (
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
                  <div className="detail-value">{selectedMedicalRecord.details?.signalment?.breed || "N/A"}</div>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Age</span>
                  <div className="detail-value">{selectedMedicalRecord.details?.signalment?.age || "N/A"}</div>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Sex</span>
                  <div className="detail-value">{selectedMedicalRecord.details?.signalment?.sex || "N/A"}</div>
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
                        <span className="info-value">{selectedMedicalRecord.details.signalment?.color || "N/A"}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Markings</span>
                        <span className="info-value">
                          {selectedMedicalRecord.details.signalment?.markings || "N/A"}
                        </span>
                      </div>
                    </div>
                    <div className="section-title">Vital Signs</div>
                    <div className="signalment-grid">
                      <div className="vital-sign">
                        <div className="vital-value">{selectedMedicalRecord.details.vitals?.temperature || "N/A"}</div>
                        <div className="vital-label">Temperature</div>
                      </div>
                      <div className="vital-sign">
                        <div className="vital-value">{selectedMedicalRecord.details.vitals?.heartRate || "N/A"}</div>
                        <div className="vital-label">Heart Rate</div>
                      </div>
                      <div className="vital-sign">
                        <div className="vital-value">
                          {selectedMedicalRecord.details.vitals?.respiratoryRate || "N/A"}
                        </div>
                        <div className="vital-label">Respiratory Rate</div>
                      </div>
                      <div className="vital-sign">
                        <div className="vital-value">
                          {selectedMedicalRecord.details.vitals?.capillaryRefillTime || "N/A"}
                        </div>
                        <div className="vital-label">CRT</div>
                      </div>
                    </div>
                    <div className="section-title">Assessment</div>
                    <p className="assessment-text">
                      {selectedMedicalRecord.details.assessment || "No assessment available"}
                    </p>
                    <div className="medication-section">
                      <div className="medication-title">Medication Administered</div>
                      <div className="medication-details">
                        <div>
                          <strong>Name:</strong> {selectedMedicalRecord.details.medication?.name || "N/A"}
                        </div>
                        <div>
                          <strong>Dosage:</strong> {selectedMedicalRecord.details.medication?.dosage || "N/A"}
                        </div>
                        <div>
                          <strong>Frequency:</strong> {selectedMedicalRecord.details.medication?.frequency || "N/A"}
                        </div>
                        <div>
                          <strong>Route:</strong> {selectedMedicalRecord.details.medication?.route || "N/A"}
                        </div>
                      </div>
                    </div>
                    <div className="remarks-section">
                      <div className="remarks-title">Remarks</div>
                      <p className="remarks-text">{selectedMedicalRecord.details.remarks || "No remarks available"}</p>
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
                          <strong>Type:</strong> {selectedTreatmentHistory.details.treatmentInfo?.type || "N/A"}
                        </div>
                        <div className="treatment-info-item">
                          <strong>Date:</strong> {selectedTreatmentHistory.details.treatmentInfo?.date || "N/A"}
                        </div>
                        <div className="treatment-info-item">
                          <strong>Administered By:</strong>{" "}
                          {selectedTreatmentHistory.details.treatmentInfo?.administeredBy || "N/A"}
                        </div>
                        <div className="treatment-info-item">
                          <strong>Dosage:</strong> {selectedTreatmentHistory.details.treatmentInfo?.dosage || "N/A"}
                        </div>
                        <div className="treatment-info-item">
                          <strong>Route:</strong> {selectedTreatmentHistory.details.treatmentInfo?.route || "N/A"}
                        </div>
                        <div className="treatment-info-item">
                          <strong>Duration:</strong> {selectedTreatmentHistory.details.treatmentInfo?.duration || "N/A"}
                        </div>
                      </div>
                    </div>
                    <div className="medical-data-section">
                      <div className="medical-data-title">Medical Data at Time of Treatment</div>
                      <div className="medical-data-grid">
                        <div className="medical-data-item">
                          <div className="vital-value">
                            {selectedTreatmentHistory.details.medicalData?.temperature || "N/A"}
                          </div>
                          <div className="vital-label">Temperature</div>
                        </div>
                        <div className="medical-data-item">
                          <div className="vital-value">
                            {selectedTreatmentHistory.details.medicalData?.heartRate || "N/A"}
                          </div>
                          <div className="vital-label">Heart Rate</div>
                        </div>
                        <div className="medical-data-item">
                          <div className="vital-value">
                            {selectedTreatmentHistory.details.medicalData?.respiratoryRate || "N/A"}
                          </div>
                          <div className="vital-label">Respiratory Rate</div>
                        </div>
                        <div className="medical-data-item">
                          <div className="vital-value">
                            {selectedTreatmentHistory.details.medicalData?.capillaryRefillTime || "N/A"}
                          </div>
                          <div className="vital-label">CRT</div>
                        </div>
                      </div>
                    </div>
                    <div className="pre-vaccination-section">
                      <div className="pre-vaccination-title">Pre-Vaccination Status</div>
                      <p className="pre-vaccination-text">
                        {selectedTreatmentHistory.details.preVaccination || "No information available"}
                      </p>
                    </div>
                    <div className="next-vaccination-section">
                      <div className="next-vaccination-title">Next Vaccination/Follow-up</div>
                      <p className="next-vaccination-text">
                        {selectedTreatmentHistory.details.nextVaccination || "No information available"}
                      </p>
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
