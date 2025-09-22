"use client"

import Sidebar from "@/components/DvmfSidebar"
import {
  AlertTriangle,
  Award,
  Bell,
  Building,
  Calendar,
  CheckCircle,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Eye,
  Facebook,
  Folder,
  Globe,
  Info,
  Mail,
  MapPin,
  Phone,
  Search,
  User,
  X,
  XCircle,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import FloatingMessages from "./DvmfMessage"
import NotificationModal from "./DvmfNotif"

const initialDirectoryData = []
const initialNotifications = []

const API_BASE = "http://127.0.0.1:8000/api/dvmf"

function DvmfDirectory() {
  const navigate = useNavigate()
  const [notifsOpen, setNotifsOpen] = useState(false)
  const [directoryData, setDirectoryData] = useState(initialDirectoryData)
  const [filteredDirectoryData, setFilteredDirectoryData] = useState(initialDirectoryData)

  // Separate state for sidebar navigation active state
  const [currentPage, setCurrentPage] = useState(1)
  const [currentTab, setCurrentTab] = useState("all")

  const [areaFilter, setAreaFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [notifications, setNotifications] = useState(initialNotifications)
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false) // Added state for sidebar open/close
  const notificationBellRef = useRef(null)
  const notificationDropdownRef = useRef(null)
  const sidebarRef = useRef(null) // Added ref for sidebar
  const [directory, setDirectory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // State for profile modal
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState(null)

  // Pagination state
  const [currentPagePagination, setCurrentPagePagination] = useState(1)
  const [itemsPerPagePagination, setItemsPerPagePagination] = useState(10)

  // Utility functions
  const formatTimeAgo = useCallback((timestamp) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60))
    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }, [])

  const getNotificationIcon = useCallback((type) => {
    const icons = {
      info: Info,
      success: CheckCircle,
      warning: AlertTriangle,
      error: XCircle,
    }
    return icons[type] || icons.info
  }, [])

  // ✅ Fetch notifications from backend
  const loadNotifications = useCallback(() => {
    console.log("Loading notifications...")

    fetch("http://127.0.0.1:8000/api/dvmf/get_vetnotifications/")
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

  // Apply all filters and search
  const applyFiltersAndSearch = useCallback(() => {
    let filtered = directoryData

    filtered = filtered.filter((item) => item.status?.toLowerCase() === "approved")

    // Apply tab filter
    switch (currentTab) {
      case "veterinarian":
        filtered = filtered.filter((item) => item.type?.toLowerCase() === "veterinarian")
        break
      case "kutsero":
        filtered = filtered.filter((item) => item.type?.toLowerCase() === "kutsero")
        break
      case "horses-operator":
        // This would require special handling for grouping horses by owner
        filtered = filtered.filter((item) => item.type?.toLowerCase() === "horse operator")
        break
      default:
        // 'all' tab
        break
    }

    // Apply area filter
    if (areaFilter) {
      filtered = filtered.filter((item) => item.location?.toLowerCase().includes(areaFilter.toLowerCase()))
    }

    // Apply search term
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.id?.toLowerCase().includes(lowerCaseSearchTerm) ||
          item.name?.toLowerCase().includes(lowerCaseSearchTerm) ||
          item.type?.toLowerCase().includes(lowerCaseSearchTerm) ||
          item.location?.toLowerCase().includes(lowerCaseSearchTerm),
      )
    }

    setFilteredDirectoryData(filtered)
  }, [directoryData, currentTab, areaFilter, searchTerm])

  // Effects for initial load and filter changes
  useEffect(() => {
    applyFiltersAndSearch()
  }, [applyFiltersAndSearch])

  // Event listeners for modals and sidebar
  useEffect(() => {
    const handleOutsideClick = (event) => {
      // Close notification dropdown
      if (
        notificationBellRef.current &&
        !notificationBellRef.current.contains(event.target) &&
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(event.target)
      ) {
        setShowNotificationDropdown(false)
      }

      // Close logout modal
      if (showLogoutModal && !event.target.closest(".logout-modal")) {
        setShowLogoutModal(false)
      }

      // Close mobile sidebar
      if (
        window.innerWidth <= 768 &&
        isSidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target) &&
        !event.target.closest(".mobile-menu-btn")
      ) {
        setIsSidebarOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
    }
  }, [isSidebarOpen, showLogoutModal])

  // Navigation handler
  const handleNavigation = useCallback(
    (path, page) => {
      navigate(path)
      setCurrentPage(page) // Set the current page for sidebar active state
      setIsSidebarOpen(false) // Close sidebar on navigation
    },
    [navigate],
  )

  const handleView = async (person) => {
    try {
      // Optional: fetch full data from API if not already complete
      const response = await fetch("http://127.0.0.1:8000/api/dvmf/get_directory_profiles/", {
        method: "GET",
        credentials: "include",
      })

      if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`)

      const data = await response.json()

      // Find the matching person in the API response
      const fullPersonData = [...data.vets, ...data.kutseros, ...data.horse_operators].find(
        (p) =>
          (p.vet_email && p.vet_email === person.email) ||
          (p.kutsero_email && p.kutsero_email === person.email) ||
          (p.op_email && p.op_email === person.email),
      )

      if (!fullPersonData) {
        console.warn("Full profile data not found, using current person object.")
        setSelectedPerson(person)
      } else {
        setSelectedPerson(fullPersonData)
      }

      setShowProfileModal(true)
    } catch (err) {
      console.error("Failed to load profile data:", err)
      setSelectedPerson(person) // fallback
      setShowProfileModal(true)
    }
  }

  const handleSearchInput = (event) => {
    setSearchTerm(event.target.value)
  }

  // Load data from backend
  const loadDirectoryData = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/dvmf/get_directory_profiles/", {
        method: "GET",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      const combinedData = [
        ...data.vets.map((vet) => ({
          name: `${vet.vet_fname} ${vet.vet_lname}`,
          type: "Veterinarian",
          email: vet.vet_email || "N/A",
          status: vet.users?.status || "Unknown",
          date_of_birth: vet.vet_dob || "N/A",
          gender: vet.vet_sex || "N/A",
          phone: vet.vet_phone_num || "N/A",
          province: vet.vet_province || "N/A",
          city: vet.vet_city || "N/A",
          barangay: vet.vet_brgy || "N/A",
          zip_code: vet.vet_zipcode || "N/A",
          middle_name: vet.vet_mname || "N/A",
          license: vet.vet_license_num || "N/A",
        })),
        ...data.kutseros.map((k) => ({
          name: `${k.kutsero_fname} ${k.kutsero_lname}`,
          type: "Kutsero",
          email: k.kutsero_email || "N/A",
          status: k.users?.status || "Unknown",
          date_of_birth: k.kutsero_dob || "N/A",
          gender: k.kutsero_sex || "N/A",
          phone: k.kutsero_phone_num || "N/A",
          province: k.kutsero_province || "N/A",
          city: k.kutsero_city || "N/A",
          barangay: k.kutsero_brgy || "N/A",
          zip_code: k.kutsero_zipcode || "N/A",
          middle_name: k.kutsero_mname || "N/A",
        })),
        ...data.horse_operators.map((h) => ({
          name: `${h.op_fname} ${h.op_mname || ""} ${h.op_lname}`.trim(),
          type: "Horse Operator",
          email: h.op_email || "N/A",
          status: h.users?.status || "Unknown",
          date_of_birth: h.op_dob || "N/A",
          gender: h.op_sex || "N/A",
          phone: h.op_phone_num || "N/A",
          province: h.op_province || "N/A",
          city: h.op_city || "N/A",
          barangay: h.op_brgy || "N/A",
          zip_code: h.op_zipcode || "N/A",
          middle_name: h.op_mname || "N/A",
        })),
      ]

      setDirectoryData(combinedData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

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

  useEffect(() => {
    loadDirectoryData()
  }, [])

  const ProfileModal = ({ person, onClose }) => {
    if (!person) return null

    console.log("Person data received:", person) // Debug log

    // Map person to a normalized structure
    const normalizedPerson = (() => {
      if (person.vet_fname) {
        return {
          type: "Veterinarian",
          name: `${person.vet_fname} ${person.vet_mname || ""} ${person.vet_lname}`.trim(),
          email: person.vet_email,
          fb: person.vet_fb || "N/A",
          phone: person.vet_phone_num,
          date_of_birth: person.vet_dob,
          gender: person.vet_sex,
          province: person.vet_province,
          city: person.vet_city,
          barangay: person.vet_brgy,
          zip_code: person.vet_zipcode,
          license: person.vet_license_num,
          experience: person.vet_exp_yr,
          specialization: person.vet_specialization,
          organization: person.vet_org,
          status: person.users?.status || "N/A",
        }
      }

      if (person.kutsero_fname) {
        return {
          type: "Kutsero",
          name: `${person.kutsero_fname} ${person.kutsero_mname || ""} ${person.kutsero_lname}`.trim(),
          email: person.kutsero_email,
          fb: person.kutsero_fb || "N/A",
          phone: person.kutsero_phone_num,
          date_of_birth: person.kutsero_dob,
          gender: person.kutsero_sex,
          province: person.kutsero_province,
          city: person.kutsero_city,
          barangay: person.kutsero_brgy,
          zip_code: person.kutsero_zipcode,
          status: person.users?.status || "N/A",
        }
      }

      if (person.op_fname) {
        return {
          type: "Horse Operator",
          name: `${person.op_fname} ${person.op_mname || ""} ${person.op_lname}`.trim(),
          email: person.op_email,
          fb: person.op_fb || "N/A",
          phone: person.op_phone_num,
          date_of_birth: person.op_dob,
          gender: person.op_sex,
          province: person.op_province,
          city: person.op_city,
          barangay: person.op_brgy,
          zip_code: person.op_zipcode,
          status: person.users?.status || "N/A",
        }
      }

      console.warn("Unknown person type:", person)
      return person
    })()

    const typeClassMap = {
      Veterinarian: "veterinarian",
      Kutsero: "kutsero",
      "Horse Operator": "horse-operator",
    }

    const InfoItem = ({ icon: Icon, label, value }) => (
      <div className="info-item">
        <Icon size={14} />
        <span>
          {label}: {value || "N/A"}
        </span>
      </div>
    )

    const renderPersonalInfo = () => (
      <div className="profile-section">
        <h4 className="section-title">
          <User size={16} /> Personal Information
        </h4>
        <div className="info-grid">
          <InfoItem icon={User} label="Name" value={normalizedPerson.name} />
          <InfoItem icon={Calendar} label="Date of Birth" value={normalizedPerson.date_of_birth} />
          <InfoItem icon={User} label="Gender" value={normalizedPerson.gender} />
          <InfoItem icon={Phone} label="Phone" value={normalizedPerson.phone} />
          <InfoItem
            icon={CheckSquare}
            label="Status"
            value={
              <span className={`status-badge ${normalizedPerson.status.toLowerCase()}`}>{normalizedPerson.status}</span>
            }
          />
        </div>
      </div>
    )

    const renderSocialMediaInfo = () => (
      <div className="profile-section">
        <h4 className="section-title">
          <Globe size={16} /> Social Media
        </h4>
        <div className="info-grid">
          <InfoItem icon={Mail} label="Email" value={normalizedPerson.email} />
          <InfoItem icon={Facebook} label="Facebook" value={normalizedPerson.fb} />
        </div>
      </div>
    )

    const renderAddressInfo = () => (
      <div className="profile-section">
        <h4 className="section-title">
          <MapPin size={16} /> Address Information
        </h4>
        <div className="info-grid">
          <InfoItem icon={MapPin} label="Province" value={normalizedPerson.province} />
          <InfoItem icon={MapPin} label="City" value={normalizedPerson.city} />
          <InfoItem icon={MapPin} label="Barangay" value={normalizedPerson.barangay} />
          <InfoItem icon={MapPin} label="ZIP Code" value={normalizedPerson.zip_code} />
        </div>
      </div>
    )

    const renderProfessionalInfo = () => {
      if (normalizedPerson.type !== "Veterinarian") return null

      return (
        <div className="profile-section">
          <h4 className="section-title">
            <Award size={16} /> Professional Details
          </h4>
          <div className="info-grid">
            <InfoItem icon={Award} label="License" value={normalizedPerson.license} />
            <InfoItem icon={Award} label="Experience (Years)" value={normalizedPerson.experience} />
            <InfoItem icon={Award} label="Specialization" value={normalizedPerson.specialization} />
            <InfoItem icon={Building} label="Organization" value={normalizedPerson.organization} />
          </div>
        </div>
      )
    }

    return (
      <div className="modal-overlay active" onClick={onClose}>
        <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
          <div className="profile-modal-header">
            <div className="profile-header-content">
              <h3>{normalizedPerson.name}</h3>
              <span className={`user-type-badge ${typeClassMap[normalizedPerson.type]}`}>
                {normalizedPerson.type?.replace("_", " ")}
              </span>
            </div>
            <button className="close-button" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="profile-modal-body">
            {renderPersonalInfo()}
            {renderSocialMediaInfo()}
            {renderAddressInfo()}
            {renderProfessionalInfo()}
          </div>
        </div>
      </div>
    )
  }

  const getPaginatedData = () => {
    const startIndex = (currentPagePagination - 1) * itemsPerPagePagination
    const endIndex = startIndex + itemsPerPagePagination
    return filteredDirectoryData.slice(startIndex, endIndex)
  }

  const handleItemsPerPageChange = (event) => {
    setItemsPerPagePagination(Number.parseInt(event.target.value, 10))
    setCurrentPagePagination(1) // Reset to first page when changing items per page
  }

  const goToPage = (page) => {
    const totalPages = Math.ceil(filteredDirectoryData.length / itemsPerPagePagination)
    if (page >= 1 && page <= totalPages) {
      setCurrentPagePagination(page)
    }
  }

  const totalPages = Math.ceil(filteredDirectoryData.length / itemsPerPagePagination)

  return (
    <div className="flex h-screen overflow-hidden">
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        body {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          width: calc(100% - 250px);
        }

        .headers {
          background: #ffffff;
          padding: 8px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          flex-wrap: wrap;
          gap: 16px;
        }

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
          background-color: #0F3D5A;
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
          background-color: #ffffff;
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
          color: #0F3D5A;
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
          border-left: 3px solid #0F3D5A;
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

        .content-area {
          flex: 1;
          padding: 24px;
          background: #f5f5f5;
          overflow-y: auto;
          
        }

        .directory-container {
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          margin-bottom: 20px;
        }

        .tab-navigation {
          display: flex;
          border-bottom: 1px solid #e5e7eb;
          background: #f8f9fa;
          overflow-x: auto;
        }

        .tab-item {
          padding: clamp(10px, 2vw, 12px) clamp(16px, 3vw, 24px);
          font-size: clamp(12px, 2vw, 14px);
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
          white-space: nowrap;
          min-height: 44px;
          display: flex;
          align-items: center;
        }

        .tab-item.active {
          color: #111827;
          background: #e5e7eb;
          border-bottom-color: #0F3D5A;
        }

        .tab-item:hover:not(.active) {
          color: #374151;
          background: #f3f4f6;
        }

        .directory-content {
          padding: clamp(16px, 3vw, 20px);
        }

        .directory-table {
          width: 100%;
          border-collapse: collapse;
          font-size: clamp(12px, 2vw, 14px);
        }

        .table-header {
          background: #f8f9fa;
        }

        .table-header th {
          padding: clamp(8px, 2vw, 12px) clamp(12px, 2vw, 16px);
          text-align: left;
          font-weight: 600;
          color: #374151;
          font-size: clamp(12px, 2vw, 14px);
          border-bottom: 1px solid #e5e7eb;
        }

        .table-row {
          border-bottom: 1px solid #f3f4f6;
          transition: background-color 0.2s;
        }

        .table-row:hover {
          background: #f8f9fa;
        }

        .table-row:last-child {
          border-bottom: none;
        }

        .table-row td {
          padding: clamp(12px, 2vw, 16px);
          font-size: clamp(12px, 2vw, 14px);
          color: #111827;
          word-wrap: break-word;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: clamp(10px, 1.8vw, 12px);
          font-weight: 500;
          white-space: nowrap;
        }

        .status-approved {
          background: #dcfce7;
          color: #166534;
        }

        .status-active {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .status-declined {
          background: #fef2f2;
          color: #dc2626;
        }
        .status-deactivated {
          background: #fef2f2;
          color: #4e0920ff;
        }
        .status-available {
          background: #d1fae5;
          color: #065f46;
        }

        .status-pending {
          background: #fef3c7;
          color: #92400e;
        }

        .status-offline {
          background: #f3f4f6;
          color: #374151;
        }

        .status-on-duty {
          background: #e0e7ff;
          color: #3730a3;
        }

        .status-off-duty {
          background: #fce7f3;
          color: #be185d;
        }

        .status-unknown {
          background: #f9fafb;
          color: #6b7280;
          border: 1px solid #d1d5db;
        }

        .role-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 8px;
          font-size: clamp(10px, 1.8vw, 12px);
          font-weight: 500;
          white-space: nowrap;
        }

        .role-veterinarian {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .role-kutsero {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
        }

        .role-horse-operator {
          background: #fef7ed;
          color: #c2410c;
          border: 1px solid #fed7aa;
        }

        .view-button {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          background: #dbeafe;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          border-radius: 6px;
          font-size: clamp(10px, 1.8vw, 12px);
          cursor: pointer;
          transition: all 0.2s;
        }

        .view-button:hover {
          background: #bfdbfe;
          border-color: #93c5fd;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          padding: 20px;
        }

        .modal-overlay.active {
          opacity: 1;
          visibility: visible;
        }

        .profile-modal {
          background: #ffffff;
          border-radius: 24px;
          width: 100%;
          max-width: 900px;
          max-height: 90vh; /* limit modal height */
          overflow: hidden; /* hide overflow at modal level */
          box-shadow:
            0 25px 50px -12px rgba(0, 0, 0, 0.25),
            0 0 0 1px rgba(255, 255, 255, 0.1);
          animation: modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          display: flex;
          flex-direction: column; /* so header stays on top and body scrolls */
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-40px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .profile-modal-header {
          background: #0F3D5A;
          padding: 32px;
          color: white;
          position: relative;
          overflow: hidden;
        }

        .profile-modal-header ::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background:
            radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
          pointer-events: none;
        }

        .profile-header-content h3 {
          font-size: 24px;
          font-weight: 600;
          margin: 0 0 8px 0;
        }

        /* Status badge colors */
        .status-approved {
          background-color: #4caf50; /* green */
          color: white;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
        }
        .status-badge.approved { background-color: #4caf50; color: white; }
        .status-badge.declined { background-color: #f44336; color: white; }
        .status-badge.pending { background-color: #ff9800; color: white; }

        .header-subinfo {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .user-type-badge {
          background: rgba(255, 255, 255, 0.2);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          text-transform: capitalize;
          backdrop-filter: blur(10px);
        }

        /* Type-specific colors */
        .user-type-badge.veterinarian {
          background-color: #4caf50; /* green */
          color: white;
        }

        .user-type-badge.kutsero {
          background-color: #8b4513; /* brown */
          color: white;
        }

        .user-type-badge.horse-operator {
          background-color: #ff9800; /* orange */
          color: white;
        }

        .close-button {
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: white;
          z-index: 3;
        }

        .close-button:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
          transform: scale(1.05);
        }

        .profile-modal-body {
          padding: 32px;
          background: #f8fafc;
          overflow-y: auto;
        }

        .profile-section {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          border: 1px solid #e2e8f0;
        }

        .profile-section:last-child {
          margin-bottom: 0;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 16px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 12px;
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 0;
          color: #475569;
          font-size: 14px;
        }

        .info-item svg {
          color: #667eea;
          flex-shrink: 0;
        }

        @media (max-width: 1024px) {
          .filter-select {
            min-width: auto;
          }
        }

        .dashboard-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          background: transparent;
        }

        .directory-title {
          font-size: 25px;
          font-weight: bold;
          color: #0F3D5A;
        }

        .search-containers {
          flex: 1;
          max-width: 400px;
          margin-right: 20px;
          position: relative;
          min-width: 200px;
          margin-bottom: 10px;
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
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          color: #6b7280;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center; /* centers horizontally */
          justify-content: center; /* centers vertically */
          text-align: center; /* centers text inside */
          padding: 40px 20px;
          height: 100%; /* optional, if you want it vertically centered in parent */
          gap: 12px; /* spacing between icon, heading, and paragraph */
          color: #555; /* optional text color */
        }

        /* Pagination Styles */
        .pagination-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #f9fafb;
          padding: 10px 20px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          font-family: sans-serif;
        }

        .pagination-info {
          font-size: 14px;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .items-per-page {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .items-per-page select {
          padding: 6px 10px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          background-color: white;
          font-size: 14px;
        }

        .pagination-buttons {
          display: flex;
          gap: 5px;
        }

        .pagination-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 36px;
          height: 36px;
          padding: 0 8px;
          border: 1px solid #d1d5db;
          background-color: white;
          color: #374151;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pagination-btn:hover:not(:disabled) {
          background-color: #f9fafb;
          border-color: #9ca3af;
        }

        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination-btn.active {
          background-color: #0F3D5A;
          color: white;
          border-color: #0F3D5A;
        }

        .pagination-nav-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border: 1px solid #d1d5db;
          background-color: white;
          color: #374151;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pagination-nav-btn:hover:not(:disabled) {
          background-color: #f9fafb;
          border-color: #9ca3af;
        }

        .pagination-nav-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination-ellipsis {
          margin: 0 5px;
          color: #6b7280;
        }
      `}</style>

      <Sidebar isOpen={isSidebarOpen} ref={sidebarRef} />

      <div className="main-content">
        <header className="headers">
          <div className="dashboard-container">
            <h2 className="directory-title">Directory</h2>
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

        <div className="content-area">
          <div className="search-containers">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              className="search-input"
              placeholder="Search directory..."
              onChange={handleSearchInput}
              value={searchTerm}
            />
          </div>
          <div className="directory-container">
            <div className="tab-navigation">
              <div
                className={`tab-item ${currentTab === "all" ? "active" : ""}`}
                onClick={() => setCurrentTab("all")}
                data-tab="all"
              >
                All
              </div>
              <div
                className={`tab-item ${currentTab === "veterinarian" ? "active" : ""}`}
                onClick={() => setCurrentTab("veterinarian")}
                data-tab="veterinarian"
              >
                Veterinarian
              </div>
              <div
                className={`tab-item ${currentTab === "horses-operator" ? "active" : ""}`}
                onClick={() => setCurrentTab("horses-operator")}
                data-tab="horses-operator"
              >
                Horses Operator
              </div>
              <div
                className={`tab-item ${currentTab === "kutsero" ? "active" : ""}`}
                onClick={() => setCurrentTab("kutsero")}
                data-tab="kutsero"
              >
                Kutsero
              </div>
            </div>

            <div className="directory-content">
              {filteredDirectoryData.length === 0 ? (
                <div className="empty-state">
                  <Folder size={48} />
                  <h3>No approved directory entries found</h3>
                  <p>Only approved entries will appear here</p>
                </div>
              ) : (
                <table className="directory-table">
                  <thead className="table-header">
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedData().map((person) => (
                      <tr key={person.email} className="table-row">
                        <td>{person.name}</td>
                        <td>
                          <span className={`role-badge role-${person.type?.toLowerCase().replace(/\s+/g, "-")}`}>
                            {person.type}
                          </span>
                        </td>
                        <td>{person.email}</td>
                        <td>
                          <span className={`status-badge status-${person.status?.toLowerCase()}`}>{person.status}</span>
                        </td>
                        <td>
                          <button className="view-button" onClick={() => handleView(person)}>
                            <Eye size={16} /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls */}
            {filteredDirectoryData.length > 0 && (
              <div className="pagination-container" style={{ marginTop: "2rem" }}>
                <div className="pagination-info">
                  Showing {(currentPagePagination - 1) * itemsPerPagePagination + 1} to{" "}
                  {Math.min(currentPagePagination * itemsPerPagePagination, filteredDirectoryData.length)} of{" "}
                  {filteredDirectoryData.length} results
                </div>

                <div className="pagination-controls">
                  <div className="items-per-page">
                    <span>Show:</span>
                    <select value={itemsPerPagePagination} onChange={handleItemsPerPageChange}>
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>
                  </div>

                  <div className="pagination-buttons">
                    <button
                      className="pagination-nav-btn"
                      onClick={() => goToPage(currentPagePagination - 1)}
                      disabled={currentPagePagination === 1}
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPagePagination <= 3) {
                        pageNum = i + 1
                      } else if (currentPagePagination >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPagePagination - 2 + i
                      }

                      return (
                        <button
                          key={pageNum}
                          className={`pagination-btn ${currentPagePagination === pageNum ? "active" : ""}`}
                          onClick={() => goToPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      )
                    })}

                    <button
                      className="pagination-nav-btn"
                      onClick={() => goToPage(currentPagePagination + 1)}
                      disabled={currentPagePagination === totalPages}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {showProfileModal && <ProfileModal person={selectedPerson} onClose={() => setShowProfileModal(false)} />}

        <FloatingMessages />
      </div>
    </div>
  )
}

export default DvmfDirectory
