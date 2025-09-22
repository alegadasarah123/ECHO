"use client"
import Sidebar from "@/components/CtuSidebar"
import { ArrowLeft, Bell, ClipboardList, Eye, Printer, Search, Stethoscope, Syringe, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import FloatingMessages from "./CtuMessage"
import NotificationModal from "./CtuNotif"

function CtuHorseRecord() {
  const navigate = useNavigate()

  // State for sidebar and modals
  const [isSidebarOpen, setIsSidebarOpen] = useState(false) // Added state for sidebar open/close
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false)
  const [isHorseModalOpen, setIsHorseModalOpen] = useState(false)
  const [isMedicalRecordModalOpen, setIsMedicalRecordModalOpen] = useState(false)
  const [isTreatmentHistoryModalOpen, setIsTreatmentHistoryModal] = useState(false)
  const [loading, setLoading] = useState(false) // ✅ added
  const [error, setError] = useState(null) // <-- Add this
  const [notifsOpen, setNotifsOpen] = useState(false)

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
  const sidebarRef = useRef(null)

  // Helper to format time for notifications
  const formatTimeAgo = useCallback((timestamp) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60))
    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
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

  const viewHorseDetails = (horse) => {
    setSelectedHorse(horse) // set the whole object
    setIsHorseModalOpen(true)
  }

  const closeHorseModal = () => {
    setIsHorseModalOpen(false)
    setSelectedHorse(null)
  }

  // When you click "View Medical Record"
  const viewMedicalRecord = (horse, record) => {
    setSelectedHorse(horse) // Horse info for profile
    setSelectedMedicalRecord(record) // Single medical record
    setIsMedicalRecordModalOpen(true) // Open modal
    setIsHorseModalOpen(false) // Close horse list modal
  }

  const closeMedicalRecord = () => {
    setIsMedicalRecordModalOpen(false)
    setSelectedHorse(null)
    setSelectedMedicalRecord(null)
    setTimeout(() => {
      setIsHorseModalOpen(true) // Reopen horse list after closing modal
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
    // Add timestamp to the modal body for print footer
    const modalBody = document.querySelector(".medical-modal-body")
    if (modalBody) {
      modalBody.setAttribute("data-print-date", new Date().toLocaleString())
    }

    // Small delay to ensure styles are applied
    setTimeout(() => {
      window.print()
    }, 100)
  }

  const printTreatmentRecord = () => {
    // Add timestamp to the modal body for print footer
    const modalBody = document.querySelector(".medical-modal-body")
    if (modalBody) {
      modalBody.setAttribute("data-print-date", new Date().toLocaleString())
    }

    // Small delay to ensure styles are applied
    setTimeout(() => {
      window.print()
    }, 100)
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

      // Close mobile sidebar
      const sidebar = document.getElementById("sidebar")
      const mobileMenuBtn = document.querySelector(".mobile-menu-btn")
      if (
        window.innerWidth <= 768 &&
        isSidebarOpen &&
        sidebar &&
        !sidebar.contains(event.target) &&
        mobileMenuBtn &&
        !mobileMenuBtn.contains(event.target)
      ) {
        setIsSidebarOpen(false)
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
    isSidebarOpen,
  ])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsSidebarOpen(false)
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const currentFilteredHorseRecords = filteredHorseRecords()

  // Define the styles object at the top of your file or before the return
  const styles = {
    notificationBtn: {
      position: "relative",
      background: "transparent",
      border: "none",
      cursor: "pointer",
      padding: "8px",
      borderRadius: "50%",
    },
    badge: {
      position: "absolute",
      top: "2px",
      right: "2px",
      backgroundColor: "#ef4444",
      color: "#fff",
      borderRadius: "50%",
      padding: "2px 6px",
      fontSize: "12px",
      fontWeight: "bold",
    },
  }

  // ✅ Fetch horses from backend
  useEffect(() => {
    const fetchHorses = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch("http://127.0.0.1:8000/api/ctu_vetmed/get_horses/")
        if (!res.ok) throw new Error("Failed to fetch horses")
        const data = await res.json()
        setHorseRecords(data)
      } catch (err) {
        console.error("Error fetching horses:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchHorses()
  }, [])

  return (
    <div className="bodyWrapper">
      <style>{`
        /* General Styles */
body {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.bodyWrapper {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: #f5f5f5;
  display: flex;
  height: 100vh;
  overflow-x: hidden;
  width: 100%;
}





/* Main Content & Header */
.main-content {

  flex: 1;
  display: flex;
  flex-direction: column;
  width: calc(100% - 250px);
}

.headers {
  background: white;
  padding: 18px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  flex-wrap: wrap;
  gap: 16px;
}

.search-container {
  flex: 1;
  max-width: 400px;
  margin-right: 20px;
  position: relative;
  min-width: 200px;
}
.search-input {
  width: 100%;
  padding: 8px 16px 8px 40px;
  border: 2px solid #fff;
  border-radius: 8px;
  font-size: clamp(12px, 2vw, 14px);
  outline: none;
  min-height: 50px;
  background: #fff;
    margin-bottom: 10px;

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

/* Notifications */
.notification-bell {
  font-size: clamp(18px, 3vw, 20px);
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
}

.notification-count {
  position: absolute;
  top: 2px;
  right: 2px;
  background-color: #b91c1c;
  color: white;
  font-size: 10px;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  display: none;
  align-items: center;
  justify-content: center;
}

.notification-dropdown {
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

.notification-dropdown.show {
  display: block;
}

.notification-header {
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  background: #f8f9fa;
  border-radius: 8px 8px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notification-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.mark-all-read {
  background: none;
  border: none;
  color: #b91c1c;
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
}

.notification-item {
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background-color 0.2s;
  position: relative;
}

.notification-item:hover {
  background-color: #f8f9fa;
}

.notification-item.unread {
  background-color: #f0f8ff;
  border-left: 3px solid #b91c1c;
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 5px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.notification-message {
  font-size: 13px;
  color: #666;
  margin-bottom: 5px;
  line-height: 1.4;
}

.notification-time {
  font-size: 11px;
  color: #999;
}

.notification-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.notification-icon.info {
  color: #3b82f6;
}

.notification-icon.success {
  color: #10b981;
}

.notification-icon.warning {
  color: #f59e0b;
}

.notification-icon.error {
  color: #ef4444;
}

.notification-actions {
  position: absolute;
  top: 10px;
  right: 15px;
  display: flex;
  gap: 5px;
}

.notification-action {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 2px;
  border-radius: 3px;
  font-size: 12px;
}

.notification-action:hover {
  background: #f0f0f0;
  color: #666;
}

/* Content Area & Table */
.content-areas {
flex: 1;
          padding: 24px;
          background: #f5f5f5;
          overflow-y: auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: clamp(20px, 4vw, 24px);
  font-weight: 700;
  color: #111827;
  margin-bottom: 20px;
}

.controls-rows {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.filter-controlss {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: clamp(12px, 2vw, 14px);
  background: white;
  min-width: 140px;
  min-height: 40px;
}

.add-record-btn {
  background-color: #28a745;
  color: white;
  padding: 8px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: background-color 0.2s ease;
}

.add-record-btn:hover {
  background-color: #16a34a;
}

.add-horse-btn {
  background: #b91c1c;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: clamp(12px, 2vw, 14px);
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
}

.add-horse-btn:hover {
  background: #991b1b;
}

.horse-table {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-header {
  background: #f8f9fa;
  display: grid;
  grid-template-columns:  1fr 1fr 1fr 1fr 90px 80px;
  padding: 16px 20px;
  font-weight: 600;
  color: #374151;
  font-size: clamp(12px, 2vw, 14px);
  border-bottom: 1px solid #e5e7eb;
}

.table-row {
  display: grid;
  grid-template-columns:  1fr 1fr 1fr 1fr 100px 80px;
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.2s;
  align-items: center;
  min-height: 60px;
}

.table-row:hover {
  background: #f9fafb;
}

.table-row:last-child {
  border-bottom: none;
}

.action-cell {
  display: flex;
  justify-content: flex-end; /* push button to the far right */
}


.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: clamp(10px, 1.8vw, 12px);
  font-weight: 500;
}

.status-healthy,
.status-completed,
.status-successful,
.status-approved {
  background: #dcfce7;
  color: #166534;
}

.status-sick {
  background: #fee2e2;
  color: #dc2626;
}

.status-quarantine {
  background: #fef3c7;
  color: #f59e0b;
}

.status-ongoing {
  background: #bfdbfe;
  color: #2563eb;
}

/* Updated view button styles */
.view-btn {
  display: inline-flex;       /* flex so icon & text align horizontally */
  align-items: center;        /* vertical center */
  justify-content: center;    /* horizontal center */
  gap: 4px;                   /* space between icon and text */

  background: #b91c1c;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: clamp(10px, 1.8vw, 12px);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 32px;
}

.view-btn:hover {
  background: #991b1b;
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

.empty-state i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 18px;
  margin-bottom: 8px;
  color: #374151;
}

.empty-state p {
  font-size: 14px;
}

/* Mobile Menu Button */
.mobile-menu-btn {
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

/* Modals (General) */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: none;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(8px);
}


.modal-overlay.active {
  display: flex;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 95%;
  max-width: none;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: clamp(16px, 3vw, 18px);
  font-weight: 600;
  color: #111827;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  min-height: 32px;
  min-width: 32px;
}

.modal-close:hover {
  color: #374151;
}

.modal-body {
  padding: 20px;
}

/* Horse Details Modal */
.horse-info-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.horse-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.horse-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #d1d5db;
  margin-right: 20px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 600;
  color: #6b7280;
}

.horse-basic-info h3 {
  font-size: clamp(16px, 3vw, 18px);
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
}

.horse-details {
  font-size: clamp(12px, 2vw, 14px);
  color: #6b7280;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-label {
  font-size: clamp(10px, 1.8vw, 12px);
  color: #6b7280;
  margin-bottom: 4px;
  font-weight: 500;
}

.info-value {
  font-size: clamp(12px, 2vw, 14px);
  color: #111827;
  font-weight: 500;
}

.section-title {
  font-size: clamp(14px, 2.5vw, 16px);
  font-weight: 600;
  color: #111827;
  margin-bottom: 16px;
  display: flex; /* Added for "Add New" button alignment */
  justify-content: space-between; /* Added for "Add New" button alignment */
  align-items: center; /* Added for "Add New" button alignment */
}

.records-table {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 20px;
}

.records-header {
  background: #f8f9fa;
  display: grid;
  grid-template-columns:280px 1fr 140px 100px 80px;
  padding: 12px 16px;
  font-weight: 600;
  color: #374151;
  font-size: clamp(10px, 1.8vw, 12px);
  border-bottom: 1px solid #e5e7eb;
}

.records-row {
  display: grid;
  grid-template-columns: 280px 1fr 140px 100px 80px;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  align-items: center;
  font-size: clamp(12px, 2vw, 14px);
  min-height: 50px;
}

.records-row:last-child {
  border-bottom: none;
}

.treatment-header {
  background: #f8f9fa;
  display: grid;
  grid-template-columns: 250px 1fr 350px 290px 170px;
  padding: 12px 16px;
  font-weight: 600;
  color: #374151;
  font-size: clamp(10px, 1.8vw, 12px);
  border-bottom: 1px solid #e5e7eb;
}

.treatment-row {
  display: grid;
  grid-template-columns: 250px 1fr 350px 290px 170px;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  align-items: center;
  font-size: clamp(12px, 2vw, 14px);
  min-height: 50px;
}

.download-btn {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  min-height: 32px;
  min-width: 32px;
}

.download-btn:hover {
  color: #374151;
}

/* Medical Record Detail Modal Styles */
.medical-modal-content {
  width: 95%;
  max-width: 1400px;
  height: 95vh;
  overflow: visible;
  display: flex;
  flex-direction: column;
}

.medical-modal-header {
  background: #b91c1c;
  color: white;
  padding: 18px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 8px 8px 0 0;
  flex-shrink: 0;
}

.medical-modal-header h3 {
  font-size: clamp(16px, 3vw, 18px);
  font-weight: 600;
  margin: 0;
}

.back-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  padding: 8px 20px;
  border-radius: 6px;
  font-size: clamp(11px, 2vw, 13px);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-1px);
}

.back-btn::before,
.back-btn::after {
  content: none;
}


.medical-modal-body {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
  background: white;
}

.horse-profile {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.profile-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #d1d5db;
  margin-right: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #6b7280;
  flex-shrink: 0;
}

.profile-info h4 {
  font-size: clamp(14px, 2.5vw, 16px);
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
}

.completed-badge {
  background: #22c55e;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: clamp(9px, 1.5vw, 10px);
  font-weight: 500;
}

.profile-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
  margin-bottom: 25px;
}

.detail-item {
  display: flex;
  flex-direction: column;
}

.detail-label {
  font-size: clamp(10px, 1.8vw, 12px);
  color: #6b7280;
  margin-bottom: 2px;
}

.detail-value {
  font-size: clamp(12px, 2vw, 14px);
  color: #111827;
  font-weight: 500;
}

.medical-section {
  margin-bottom: 25px;
}

.medical-section h5 {
  font-size: clamp(12px, 2vw, 14px);
  font-weight: 600;
  color: #b91c1c;
  margin-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 4px;
}

.medical-record-title {
  font-size: clamp(14px, 2.5vw, 16px);
  font-weight: 600;
  color: #b91c1c;
  margin-bottom: 16px;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 6px;
}

.signalment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.vital-sign {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  text-align: center;
}

.vital-value {
  font-size: clamp(16px, 3vw, 18px);
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
}

.vital-label {
  font-size: clamp(9px, 1.5vw, 11px);
  color: #6b7280;
}

.assessment-text {
  font-size: clamp(11px, 2vw, 13px);
  line-height: 1.5;
  color: #374151;
  margin-bottom: 8px;
}

.medication-section {
  background: #dbeafe;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.medication-title {
  font-size: clamp(12px, 2vw, 14px);
  font-weight: 600;
  color: #b91c1c;
  margin-bottom: 12px;
}

.medication-details {
  font-size: clamp(11px, 2vw, 13px);
  color: #374151;
  line-height: 1.4;
}

.medication-details div {
  margin-bottom: 4px;
}

.remarks-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.remarks-title {
  font-size: clamp(12px, 2vw, 14px);
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
}

.remarks-text {
  font-size: clamp(11px, 2vw, 13px);
  color: #374151;
  line-height: 1.5;
}

.print-btn {
  background: #22c55e;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: clamp(12px, 2vw, 14px);
  font-weight: 500;
  cursor: pointer;
  width: 100%;
  transition: background-color 0.2s;
  min-height: 44px;
   display: inline-flex; /* or flex */
  align-items: center;  /* vertically centers the icon with the text */
  justify-content: center; /* optional: centers content horizontally */
  gap: 4px; /* space between icon and text */
}

.print-btn:hover {
  background: #16a34a;
}

/* Treatment History Specific Styles */
.treatment-title {
  font-size: clamp(16px, 3vw, 18px);
  font-weight: 600;
  color: #b91c1c;
  margin-bottom: 20px;
}

.treatment-info-section {
  background: #dbeafe;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.treatment-info-title {
  font-size: clamp(12px, 2vw, 14px);
  font-weight: 600;
  color: #b91c1c;
  margin-bottom: 12px;
}

.treatment-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.treatment-info-item {
  margin-bottom: 8px;
  font-size: clamp(11px, 2vw, 13px);
}

.medical-data-section {
  margin-bottom: 20px;
}

.medical-data-title {
  font-size: clamp(12px, 2vw, 14px);
  font-weight: 600;
  color: #b91c1c;
  margin-bottom: 12px;
}

.medical-data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.medical-data-item {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  text-align: center;
}

.pre-vaccination-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.pre-vaccination-title {
  font-size: clamp(12px, 2vw, 14px);
  font-weight: 600;
  color: #111827;
  margin-bottom: 12px;
}

.pre-vaccination-text {
  font-size: clamp(11px, 2vw, 13px);
  color: #374151;
  line-height: 1.5;
}

.pre-vaccination-item {
  margin-bottom: 8px;
}

.next-vaccination-section {
  background: #f0f9ff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.next-vaccination-title {
  font-size: clamp(12px, 2vw, 14px);
  font-weight: 600;
  color: #b91c1c;
  margin-bottom: 12px;
}

.next-vaccination-text {
  font-size: clamp(11px, 2vw, 13px);
  color: #374151;
  line-height: 1.5;
}

.next-vaccination-item {
  margin-bottom: 8px;
}

/* Add Record Modals (Forms) */
.add-record-modal-content {
  max-width: 900px; /* Wider for forms */
}

.add-record-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.form-groups {
  display: flex;
  flex-direction: column;
  background: white;
  background-color: white !important;
}

.form-groups.full-width {
  grid-column: 1 / -1; /* Spans all columns */
}

.form-label {
  font-size: 13px;
  color: #374151;
  margin-bottom: 6px;
  font-weight: 500;
}

.form-input,
.form-select {
  padding: 10px 12px;
  border: 1px solid #6b7280 !important;
  border-radius: 6px;
  font-size: 14px;
  background-color: white !important; /* Changed to white with !important */
  color: black !important; /* Changed to black with !important */
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-select:focus {
  border-color: #b91c1c;
}

.form-input::placeholder,
.form-select::placeholder {
  color: black;
}

.form-input::-webkit-input-placeholder,
.form-select::-webkit-input-placeholder {
  color: black;
}

.form-input::-moz-placeholder,
.form-select::-moz-placeholder {
  color: black;
  opacity: 1; /* Firefox adds opacity to placeholders by default */
}

.form-input:-ms-input-placeholder,
.form-select:-ms-input-placeholder {
  color: black;
}

.form-input:-moz-placeholder,
.form-select:-moz-placeholder {
  color: black;
  opacity: 1;
}

textarea.form-input {
  resize: vertical;
  min-height: 80px;
}

.form-section-title {
  grid-column: 1 / -1; /* Spans all columns */
  font-size: 16px;
  font-weight: 600;
  color: #b91c1c;
  margin-top: 20px;
  margin-bottom: 15px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 5px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.cancel-btn,
.submit-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cancel-btn {
  background: #e0e0e0;
  color: #333;
}

.cancel-btn:hover {
  background: #ccc;
}

.submit-btn {
  background: #b91c1c;
  color: white;
}

.submit-btn:hover {
  background: #991b1b;
}

/* Chat Widget Styling - Button Only */
.chat-widget {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 1000;
        }

        .chat-button {
          width: 64px;
          height: 64px;
          background: #b91c1c;
          border: none;
          border-radius: 20px;
          color: white;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(28, 44, 185, 0.3);
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .chat-button::after {
          content: "";
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-top: 10px solid #b91c1c;
        }

        .chat-button:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(28, 78, 185, 0.4);
        }

        .chat-button:hover::after {
          border-top-color: #b91c1c;
        }

        .chat-dots {
          display: flex;
          gap: 6px;
          align-items: center;
          justify-content: center;
        }

        .chat-dot {
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
        }


/* Media Queries */
/* Tablet */
@media (max-width: 1024px) {
  .controls-rows {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .medical-modal-content {
    width: 98%;
    max-width: none;
  }

  .profile-details {
    grid-template-columns: repeat(2, 1fr);
  }

  .signalment-grid,
  .medical-data-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Mobile */
@media (max-width: 768px) {
  .mobile-menu-btn {
    display: block;
  }

 

  .main-content {
    margin-left: 0;
    width: 100%;
  }

  .headers {
    margin-left: 60px;
    padding: 12px 16px;
  }

  .search-containers {
    margin-right: 10px;
    min-width: auto;
  }

  .content-areas {
    padding: 16px;
  }

  .table-header,
  .table-row {
    grid-template-columns: 1fr;
    gap: 8px;
    text-align: left;
  }

  .table-header > div,
  .table-row > div {
    padding: 4px 0;
    word-wrap: break-word;
  }

  .table-row {
    border: 1px solid #e5e7eb;
    margin-bottom: 12px;
    border-radius: 8px;
    padding: 16px;
  }

  .records-header,
  .records-row,
  .treatment-header,
  .treatment-row {
    grid-template-columns: 1fr;
    gap: 8px;
    text-align: left;
  }

  .records-row,
  .treatment-row {
    border: 1px solid #e5e7eb;
    margin-bottom: 8px;
    border-radius: 6px;
    padding: 12px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .modal-content {
    width: 95%;
    margin: 10px;
  }

  .medical-modal-content {
    width: 98%;
    height: 98vh;
  }

  .profile-details {
    grid-template-columns: 1fr;
  }

  .signalment-grid,
  .medical-data-grid {
    grid-template-columns: 1fr;
  }

  .treatment-info-grid {
    grid-template-columns: 1fr;
  }
}

/* Small Mobile */
@media (max-width: 480px) {
  .header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    margin-left: 50px;
  }

  .search-containers {
    margin-right: 0;
    min-width: auto;
  }

  .notification-bell {
    align-self: flex-end;
    margin-right: 0;
  }

  .mobile-menu-btn {
    top: 15px;
    left: 15px;
    padding: 10px;
  }
}

/* Touch devices */
@media (hover: none) and (pointer: coarse) {
  .nav-item,
 {
    min-height: 48px;
  }

  .view-btn {
    min-height: 40px;
    padding: 8px 12px;
  }
}

@media print {
  body, html {
    color: black;
    background: white;
    font-size: 12px;
    line-height: 1.4;
  }

  /* Remove unnecessary UI elements */
  .modal-header,
  .modal-close,
  .back-btn,
  .print-btn {
    display: none;
  }

  /* Modal overlay & content */
  .modal-overlay.active,
  .modal-content {
    position: static;
    display: block;
    width: 100%;
    height: auto;
    margin: 0;
    padding: 0;
    box-shadow: none;
    border: none;
  }

  /* Main body inside modal */
  .medical-modal-body {
    padding: 20px;
    background: white;
    color: black;
  }

  /* Sections */
  .horse-profile,
  .medical-section,
  .medication-section,
  .remarks-section,
  .treatment-info-section,
  .pre-vaccination-section,
  .next-vaccination-section {
    page-break-inside: avoid;
    margin-bottom: 20px;
    border: 1px solid #ccc;
    padding: 8px;
    background: white;
  }

  .medication-section,
  .treatment-info-section,
  .next-vaccination-section {
    background: #f0f8ff;
  }

  .remarks-section,
  .pre-vaccination-section {
    background: #f8f8f8;
  }

  /* Grids */
  .profile-details,
  .signalment-grid,
  .medical-data-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    page-break-inside: avoid;
  }

  /* Titles */
  .medical-record-title,
  .treatment-title,
  h3, h4, h5, h6 {
    color: #b91c1c;
    font-weight: bold;
  }

  .treatment-title {
    font-size: 18px;
    white-space: normal;
    overflow: visible;
  }
}

      
      /* Enhanced Print Styles for Medical Record and Treatment History */
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        
        body, html {
          color: black !important;
          background: white !important;
          font-size: 11px !important;
          line-height: 1.3 !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Hide all non-printable elements */
        .modal-header,
        .medical-modal-header,
        .modal-close,
        .back-btn,
        .print-btn,
        .sidebars,
        .headers,
        .page-header,
        .controls-rows,
        .search-container,
        .filter-controlss,
        .notification-btn,
        button:not(.print-btn),
        .modal-overlay:not(.active) {
          display: none !important;
        }

        /* Modal and content positioning */
        .modal-overlay.active {
          position: static !important;
          display: block !important;
          width: 100% !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          border: none !important;
          background: white !important;
        }

        .modal-content,
        .medical-modal-content {
          position: static !important;
          display: block !important;
          width: 100% !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          border: none !important;
          background: white !important;
          max-width: none !important;
          transform: none !important;
        }

        /* Main content area */
        .medical-modal-body {
          padding: 15px !important;
          background: white !important;
          color: black !important;
          width: 100% !important;
        }

        /* Header section with clinic info */
        .medical-modal-body::before {
          content: "ECHO: CTU VET-MED\\A Medical Record Report\\A \\A ";
          white-space: pre;
          display: block;
          text-align: center;
          font-size: 16px;
          font-weight: bold;
          color: #b91c1c !important;
          margin-bottom: 20px;
          border-bottom: 2px solid #b91c1c;
          padding-bottom: 10px;
        }

        /* Horse profile section */
        .horse-profile {
          display: flex !important;
          align-items: center !important;
          margin-bottom: 15px !important;
          padding: 10px !important;
          border: 1px solid #ccc !important;
          background: #f8f9fa !important;
          page-break-inside: avoid !important;
        }

        .profile-avatar {
          width: 40px !important;
          height: 40px !important;
          border-radius: 50% !important;
          background: #b91c1c !important;
          color: white !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-weight: bold !important;
          margin-right: 10px !important;
        }

        .profile-info h4 {
          margin: 0 !important;
          font-size: 14px !important;
          font-weight: bold !important;
          color: #b91c1c !important;
        }

        .completed-badge {
          background: #10b981 !important;
          color: white !important;
          padding: 2px 8px !important;
          border-radius: 12px !important;
          font-size: 10px !important;
          margin-left: 10px !important;
        }

        /* Profile details grid */
        .profile-details {
          display: grid !important;
          grid-template-columns: repeat(3, 1fr) !important;
          gap: 8px !important;
          margin-bottom: 15px !important;
          page-break-inside: avoid !important;
        }

        .detail-item {
          border: 1px solid #ddd !important;
          padding: 8px !important;
          background: white !important;
        }

        .detail-label {
          font-weight: bold !important;
          color: #374151 !important;
          font-size: 10px !important;
          display: block !important;
          margin-bottom: 3px !important;
        }

        .detail-value {
          color: black !important;
          font-size: 11px !important;
        }

        /* Medical section */
        .medical-section {
          page-break-inside: avoid !important;
          margin-bottom: 15px !important;
          border: 1px solid #ccc !important;
          padding: 10px !important;
          background: white !important;
        }

        .medical-record-title {
          color: #b91c1c !important;
          font-weight: bold !important;
          font-size: 14px !important;
          margin-bottom: 10px !important;
          border-bottom: 1px solid #b91c1c !important;
          padding-bottom: 5px !important;
        }

        /* Section titles */
        .section-title {
          font-weight: bold !important;
          color: #374151 !important;
          font-size: 12px !important;
          margin: 10px 0 5px 0 !important;
          border-bottom: 1px solid #ddd !important;
          padding-bottom: 2px !important;
        }

        /* Vital signs grid */
        .signalment-grid {
          display: grid !important;
          grid-template-columns: repeat(3, 1fr) !important;
          gap: 8px !important;
          margin-bottom: 10px !important;
          page-break-inside: avoid !important;
        }

        .vital-sign {
          text-align: center !important;
          border: 1px solid #ddd !important;
          padding: 8px !important;
          background: #f0f8ff !important;
        }

        .vital-value {
          font-size: 14px !important;
          font-weight: bold !important;
          color: #b91c1c !important;
          margin-bottom: 3px !important;
        }

        .vital-label {
          font-size: 9px !important;
          color: #374151 !important;
        }

        /* Assessment and remarks sections */
        .assessment-text,
        .remarks-text {
          color: black !important;
          font-size: 11px !important;
          line-height: 1.4 !important;
          margin: 5px 0 10px 0 !important;
          padding: 5px !important;
          background: #f8f9fa !important;
          border-left: 3px solid #b91c1c !important;
        }

        .remarks-section {
          margin-bottom: 10px !important;
          page-break-inside: avoid !important;
          border: 1px solid #eee !important;
          padding: 8px !important;
          background: #fafafa !important;
        }

        .remarks-title {
          font-weight: bold !important;
          color: #374151 !important;
          font-size: 11px !important;
          margin-bottom: 5px !important;
        }

        /* Treatment History specific styles */
        .treatment-info-section {
          page-break-inside: avoid !important;
          margin-bottom: 15px !important;
          border: 1px solid #ccc !important;
          padding: 10px !important;
          background: #f0f8ff !important;
        }

        .treatment-title {
          color: #b91c1c !important;
          font-weight: bold !important;
          font-size: 14px !important;
          margin-bottom: 10px !important;
          white-space: normal !important;
          overflow: visible !important;
        }

        .medication-section {
          page-break-inside: avoid !important;
          margin-bottom: 15px !important;
          border: 1px solid #ccc !important;
          padding: 10px !important;
          background: #f0f8ff !important;
        }

        .pre-vaccination-section,
        .next-vaccination-section {
          page-break-inside: avoid !important;
          margin-bottom: 15px !important;
          border: 1px solid #ccc !important;
          padding: 10px !important;
          background: #f8f8f8 !important;
        }

        /* Medical data grid for treatment history */
        .medical-data-grid {
          display: grid !important;
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 8px !important;
          margin-bottom: 10px !important;
          page-break-inside: avoid !important;
        }

        /* Footer with timestamp */
        .medical-modal-body::after {
          content: "\\A \\A Generated on: " attr(data-print-date) "\\A localhost:5173/CharlesRecord";
          white-space: pre;
          display: block;
          text-align: center;
          font-size: 9px;
          color: #666 !important;
          margin-top: 20px;
          border-top: 1px solid #ddd;
          padding-top: 10px;
        }

        /* Page break controls */
        .page-break-before {
          page-break-before: always !important;
        }

        .page-break-after {
          page-break-after: always !important;
        }

        .no-page-break {
          page-break-inside: avoid !important;
        }

        /* Ensure all text is visible */
        * {
          visibility: visible !important;
        }

        /* Hide scrollbars */
        ::-webkit-scrollbar {
          display: none !important;
        }
      }

  .dashboard-title {
          font-size: 22px;
          font-weight: bold;
          color: #da2424ff;
        }

      `}</style>
      <div className="sidebars" id="sidebars">
        <Sidebar isOpen={isSidebarOpen} ref={sidebarRef} />
      </div>
      <div className="main-content">
        <header className="headers">
          <div className="dashboard-container">
            <h2 className="dashboard-title">Horse Records</h2>
          </div>
          <button style={styles.notificationBtn} onClick={() => setNotifsOpen(!notifsOpen)}>
            <Bell size={24} color="#374151" />
            {notifications.length > 0 && <span style={styles.badge}>{notifications.length}</span>}
          </button>

          {/* Notification Modal */}
          <NotificationModal
            isOpen={notifsOpen}
            onClose={() => setNotifsOpen(false)}
            notifications={notifications.map((n) => ({
              message: n.message,
              date: n.date,
            }))}
          />
        </header>

        <div className="content-areas">
          <div className="page-header">
            <div className="search-container">
              <Search className="search-icon" size={20} />
              <input type="text" className="search-input" placeholder="Search......" onChange={handleSearchInput} />
            </div>
            <div className="controls-rows">
              <div className="filter-controlss">
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
                <div>Horse Name</div>
                <div>Horse Color</div>
                <div>Owner</div>
                <div>Location</div>
                <div>Status</div>
                <div>Action</div>
              </div>

              {currentFilteredHorseRecords.length === 0 ? (
                <div className="empty-state">
                  <ClipboardList size={48} />
                  <h3>No horse records</h3>
                  <p>Horse records will appear here when available</p>
                </div>
              ) : (
                currentFilteredHorseRecords.map((horse, index) => (
                  <div className="table-row" key={index}>
                    {/* Horse Name */}
                    <div>{horse.horse_name}</div>
                    {/* Horse Color */}
                    <div>{horse.horse_color}</div>

                    {/* Owner Fullname */}
                    <div>{horse.owner_fullname}</div>

                    {/* Location */}
                    <div>{horse.location || "N/A"}</div>

                    {/* Status Badge */}
                    <div>
                      <span className={`status-badge status-${horse?.status?.toLowerCase() || "unknown"}`}>
                        {horse?.status || "N/A"}
                      </span>
                    </div>

                    {/* View Button */}
                    <div>
                      <button className="view-btn" onClick={() => viewHorseDetails(horse)}>
                        <Eye size={16} style={{ marginRight: "4px" }} />
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
      <FloatingMessages />
      {/* Horse Details Modal */}
      {isHorseModalOpen && selectedHorse && (
        <div className="modal-overlay active" id="horseModal" ref={horseModalRef}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Horse Details</h2>
              <button className="modal-close" onClick={closeHorseModal}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Horse Basic Information */}
              <div className="horse-info-section">
                <div className="horse-header">
                  <div className="horse-avatar" id="horseAvatar">
                    {selectedHorse.horse_name ? selectedHorse.horse_name.charAt(0) : "?"}
                  </div>
                  <div className="horse-basic-info">
                    <h3 id="horseName">{selectedHorse.horse_name}</h3>
                    <div className="horse-details">
                      <span id="horseAge">Age: {selectedHorse.horse_age}</span> •
                      <span id="horseBreed">Breed: {selectedHorse.horse_breed}</span>
                    </div>
                  </div>
                </div>

                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Owner</span>
                    <span className="info-value" id="horseOwner">
                      {selectedHorse.owner_fullname || "N/A"}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Location</span>
                    <span className="info-value" id="horseLocation">
                      {selectedHorse.location || "N/A"}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Sex</span>
                    <span className="info-value" id="horseSex">
                      {selectedHorse.horse_sex || "N/A"}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Color</span>
                    <span className="info-value">{selectedHorse.horse_color || "N/A"}</span>
                  </div>
                </div>
              </div>

              <div className="section-title">Medical Record History</div>
              <div className="records-table">
                <div className="records-header">
                  <div>Date</div>
                  <div>Diagnosis</div>
                  <div>Veterinarian</div>
                  <div>Action</div>
                </div>

                {selectedHorse.medical_records?.[0]?.medrec_history?.length > 0 ? (
                  selectedHorse.medical_records[0].medrec_history.map((history) => (
                    <div className="records-row" key={history.history_id}>
                      <div>{new Date(history.change_date).toLocaleDateString()}</div>
                      <div>{history.prev_diagnosis}</div>
                      <div>{history.vet_name || "N/A"}</div>
                      <div>
                        <button
                          className="view-btn"
                          onClick={() => viewMedicalRecord(selectedHorse, selectedHorse.medical_records[0])}
                        >
                          <Eye size={16} style={{ marginRight: "4px" }} />
                          View
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <Stethoscope size={48} />
                    <h3>No medical record history</h3>
                    <p>Previous records will appear here when available</p>
                  </div>
                )}
              </div>

              {/* Treatment History Section */}
              <div className="section-title">Treatment History</div>
              <div className="records-table">
                <div className="treatment-header">
                  <div>Date</div>
                  <div>Treatment</div>
                  <div>Administered By</div>
                  <div>Remark</div>
                  <div>Action</div>
                </div>

                {selectedHorse.medical_records?.[0]?.treatment_history?.length > 0 ? (
                  selectedHorse.medical_records[0].treatment_history.map((treatment) => (
                    <div className="treatment-row" key={treatment.treatment_id}>
                      <div>{treatment.treatment_date}</div>
                      <div>{treatment.treatment_info}</div>
                      <div>{treatment.vet_name || "N/A"}</div>
                      <div>{treatment.treatment_remark || "N/A"}</div>
                      <div>
                        <button className="view-btn" onClick={() => viewTreatmentHistory(treatment)}>
                          <Eye size={16} style={{ marginRight: "4px" }} />
                          View
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <Syringe size={48} />
                    <h3>No treatment history</h3>
                    <p>Treatment records will appear here when available</p>
                  </div>
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
                <ArrowLeft size={16} style={{ marginRight: "4px" }} />
                Back to Records
              </button>
            </div>
            <div className="medical-modal-body">
              {/* Horse Profile */}
              <div className="horse-profile">
                <div className="profile-avatar">{selectedHorse?.horse_name?.charAt(0)}</div>
                <div className="profile-info">
                  <h4>{selectedHorse?.horse_name || "Horse"}</h4>
                  <span className="completed-badge">Completed</span>
                </div>
              </div>

              {/* Horse Details */}
              <div className="profile-details">
                <div className="detail-item">
                  <span className="detail-label">Breed</span>
                  <div className="detail-value">{selectedHorse?.horse_breed || "N/A"}</div>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Age</span>
                  <div className="detail-value">{selectedHorse?.horse_age || "N/A"}</div>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Sex</span>
                  <div className="detail-value">{selectedHorse?.horse_sex || "N/A"}</div>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Owner</span>
                  <div className="detail-value">{selectedHorse?.owner_fullname || "N/A"}</div>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Contact</span>
                  <div className="detail-value">{selectedHorse?.contact || "N/A"}</div>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Location</span>
                  <div className="detail-value">{selectedHorse?.location || "N/A"}</div>
                </div>
              </div>

              {/* Medical Record Section */}
              <div className="medical-section">
                <h5 className="medical-record-title">Medical Record Details</h5>

                {/* Vital Signs */}
                <div className="section-title">Vital Signs</div>
                <div className="signalment-grid">
                  <div className="vital-sign">
                    <div className="vital-value">{selectedMedicalRecord.medrec_bodytemp || "N/A"}</div>
                    <div className="vital-label">Temperature</div>
                  </div>
                  <div className="vital-sign">
                    <div className="vital-value">{selectedMedicalRecord.medrec_heart_rate || "N/A"}</div>
                    <div className="vital-label">Heart Rate</div>
                  </div>
                  <div className="vital-sign">
                    <div className="vital-value">{selectedMedicalRecord.medrec_resp_rate || "N/A"}</div>
                    <div className="vital-label">Respiratory Rate</div>
                  </div>
                </div>

                {/* Diagnosis */}
                <div className="section-title">Diagnosis</div>
                <p className="assessment-text">{selectedMedicalRecord.medrec_diagnosis || "No diagnosis available"}</p>

                {/* Concern */}
                <div className="remarks-section">
                  <div className="remarks-title">Concern</div>
                  <p className="remarks-text">{selectedMedicalRecord.medrec_concern || "No concern recorded"}</p>
                </div>

                {/* Clinical Signs */}
                <div className="remarks-section">
                  <div className="remarks-title">Clinical Signs</div>
                  <p className="remarks-text">{selectedMedicalRecord.medrec_clinical_sign || "No signs recorded"}</p>
                </div>

                {/* Treatment */}
                <div className="remarks-section">
                  <div className="remarks-title">Treatment</div>
                  <p className="remarks-text">{selectedMedicalRecord.medrec_treatment || "No treatment recorded"}</p>
                </div>

                {/* Remarks */}
                <div className="remarks-section">
                  <div className="remarks-title">Remarks</div>
                  <p className="remarks-text">{selectedMedicalRecord.medrec_remark || "No remarks available"}</p>
                </div>

                {/* Attending Vet */}
                <div className="remarks-section">
                  <div className="remarks-title">Attending Veterinarian</div>
                  <p className="remarks-text">{selectedMedicalRecord.vet_name || "Unknown"}</p>
                </div>
              </div>

              {/* Print Record Button */}
              <button className="print-btn" onClick={printRecord}>
                <Printer size={16} style={{ marginRight: "4px" }} />
                Print Record
              </button>
            </div>
          </div>
        </div>
      )}
{/* Treatment History Detail Modal */}
{isTreatmentHistoryModalOpen && selectedTreatmentHistory && (
  <div
    className="modal-overlay active"
    id="treatmentHistoryModal"
    ref={treatmentHistoryModalRef}
  >
    <div className="modal-content medical-modal-content">
      <div className="medical-modal-header">
        <h3>ECHO: CTU VET-MED</h3>
        <button className="back-btn" onClick={closeTreatmentHistory}>
          <ArrowLeft size={16} style={{ marginRight: "4px" }} />
          Back to Records
        </button>
      </div>

      <div className="medical-modal-body">
        <div>
          <h4 className="treatment-title">Treatment History Details</h4>

          {/* Treatment Information */}
          <div className="treatment-info-section">
            <div className="treatment-info-title">Treatment Information</div>
            <div className="treatment-info-grid">
              <div className="treatment-info-item">
                <strong>Type:</strong>{" "}
                {selectedTreatmentHistory.treatment_info || "N/A"}
              </div>
              <div className="treatment-info-item">
                <strong>Date:</strong>{" "}
                {selectedTreatmentHistory.treatment_date || "N/A"}
              </div>
              <div className="treatment-info-item">
                <strong>Administered By:</strong>{" "}
                {selectedTreatmentHistory.vet_name || "N/A"}
              </div>
              <div className="treatment-info-item">
                <strong>Remarks:</strong>{" "}
                {selectedTreatmentHistory.treatment_remark || "N/A"}
              </div>
            </div>
          </div>

          {/* Current Medical Data */}
          <div className="medical-data-section">
            <div className="medical-data-title">Medical Data at Time of Treatment</div>
            <div className="medical-data-grid">
              <div className="medical-data-item">
                <div className="vital-value">
                  {selectedTreatmentHistory.medrec_bodytemp || "N/A"} °C
                </div>
                <div className="vital-label">Temperature (Current)</div>
              </div>
              <div className="medical-data-item">
                <div className="vital-value">
                  {selectedTreatmentHistory.medrec_heart_rate || "N/A"} bpm
                </div>
                <div className="vital-label">Heart Rate (Current)</div>
              </div>
              <div className="medical-data-item">
                <div className="vital-value">
                  {selectedTreatmentHistory.medrec_resp_rate || "N/A"} breaths/min
                </div>
                <div className="vital-label">Respiratory Rate (Current)</div>
              </div>
            </div>
          </div>

          {/* Past Records Accordion */}
          {selectedTreatmentHistory.medrec_history &&
            selectedTreatmentHistory.medrec_history.length > 0 && (
              <div className="past-records-section">
                <div className="past-records-title">Past Records</div>
                {selectedTreatmentHistory.medrec_history.map((history) => {
                  const [isOpen, setIsOpen] = useState(false);
                  return (
                    <div key={history.history_id} className="past-record-item">
                      <button
                        className="accordion-toggle"
                        onClick={() => setIsOpen(!isOpen)}
                      >
                        {new Date(history.change_date).toLocaleDateString()}{" "}
                        {isOpen ? "▲" : "▼"}
                      </button>
                      {isOpen && (
                        <div className="accordion-content">
                          <div>
                            <strong>Temperature:</strong> {history.prev_bodytemp} °C
                          </div>
                          <div>
                            <strong>Heart Rate:</strong> {history.prev_heart_rate} bpm
                          </div>
                          <div>
                            <strong>Respiratory Rate:</strong>{" "}
                            {history.prev_resp_rate} breaths/min
                          </div>
                          <div>
                            <strong>Concern:</strong> {history.prev_concern}
                          </div>
                          <div>
                            <strong>Clinical Signs:</strong> {history.prev_clinical_sign}
                          </div>
                          <div>
                            <strong>Diagnosis:</strong> {history.prev_diagnosis}
                          </div>
                          <div>
                            <strong>Remarks:</strong> {history.prev_remark}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          {/* Current Clinical Signs & Diagnosis */}
          <div className="pre-vaccination-section">
            <div className="pre-vaccination-title">Clinical Signs</div>
            <p className="pre-vaccination-text">
              {selectedTreatmentHistory.medrec_clinical_sign || "No information available"}
            </p>
          </div>

          <div className="next-vaccination-section">
            <div className="next-vaccination-title">Diagnosis</div>
            <p className="next-vaccination-text">
              {selectedTreatmentHistory.medrec_diagnosis || "No information available"}
            </p>
          </div>

          {/* Print Record Button */}
          <button className="print-btn" onClick={printTreatmentRecord}>
            <Printer size={16} style={{ marginRight: "4px" }} />
            Print Record
          </button>
        </div>
      </div>
    </div>
  </div>
)}


      ;
    </div>
  )
}

export default CtuHorseRecord
