"use client"

import Sidebar from "@/components/CtuSidebar"
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
import FloatingMessages from "./CtuMessage"
import NotificationModal from "./CtuNotif"

const initialDirectoryData = []
const initialNotifications = []

const API_BASE = "http://127.0.0.1:8000/api/ctu_vetmed"

function CtuDirectory() {
  const navigate = useNavigate()
  const [notifsOpen, setNotifsOpen] = useState(false)
  const [directoryData, setDirectoryData] = useState(initialDirectoryData)
  const [filteredDirectoryData, setFilteredDirectoryData] = useState(initialDirectoryData)

  // Fixed tab state - using consistent values
  const [currentPage, setCurrentPage] = useState(1)
  const [currentTab, setCurrentTab] = useState("all")

  const [areaFilter, setAreaFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [notifications, setNotifications] = useState(initialNotifications)
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const notificationBellRef = useRef(null)
  const notificationDropdownRef = useRef(null)
  const sidebarRef = useRef(null)
  const [directory, setDirectory] = useState([])
  const [loading, setLoading] = useState(true) // Changed to true initially
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

  // ✅ FIXED: Apply all filters and search - CORRECTED TAB FILTERING
  const applyFiltersAndSearch = useCallback(() => {
    let filtered = directoryData

    filtered = filtered.filter((item) => item.status?.toLowerCase() === "approved")

    // ✅ FIXED: Proper tab filtering logic
    switch (currentTab) {
      case "veterinarian":
        filtered = filtered.filter((item) => item.type?.toLowerCase() === "veterinarian")
        break
      case "kutsero":
        filtered = filtered.filter((item) => item.type?.toLowerCase() === "kutsero")
        break
      case "horse operator":
        filtered = filtered.filter((item) => item.type?.toLowerCase() === "horse operator")
        break
      default:
        // "all" tab - show everything
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
      const response = await fetch("http://127.0.0.1:8000/api/ctu_vetmed/get_directory_profiles/", {
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
      setLoading(true)
      const response = await fetch("http://127.0.0.1:8000/api/ctu_vetmed/get_directory_profiles/", {
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
          type: "veterinarian",
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
          type: "kutsero",
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
          type: "horse operator",
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

  useEffect(() => {
    loadDirectoryData()
  }, [])

  // Skeleton Loader Component for Table Rows
  const TableSkeleton = () => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm border-b border-gray-200">
                Name
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm border-b border-gray-200">
                Role
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm border-b border-gray-200">
                Email
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm border-b border-gray-200">
                Status
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm border-b border-gray-200">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: itemsPerPagePagination }).map((_, index) => (
              <tr key={index} className="border-b border-gray-100">
                <td className="px-4 py-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </td>
                <td className="px-4 py-4">
                  <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                </td>
                <td className="px-4 py-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </td>
                <td className="px-4 py-4">
                  <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
                </td>
                <td className="px-4 py-4">
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const ProfileModal = ({ person, onClose }) => {
    if (!person) return null

    console.log("Person data received:", person) // Debug log

    // Map person to a normalized structure
    const normalizedPerson = (() => {
      if (person.vet_fname) {
        return {
          type: "veterinarian",
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
          type: "kutsero",
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
          type: "horse operator",
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

    const InfoItem = ({ icon: Icon, label, value }) => (
      <div className="flex items-center gap-2 py-2 text-slate-600 text-sm">
        <Icon size={14} className="text-indigo-500 flex-shrink-0" />
        <span>
          {label}: {value || "N/A"}
        </span>
      </div>
    )

    const renderPersonalInfo = () => (
      <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-slate-200">
        <h4 className="flex items-center gap-2 text-base font-semibold text-slate-800 mb-4">
          <User size={16} /> Personal Information
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InfoItem icon={User} label="Name" value={normalizedPerson.name} />
          <InfoItem icon={Calendar} label="Date of Birth" value={normalizedPerson.date_of_birth} />
          <InfoItem icon={User} label="Gender" value={normalizedPerson.gender} />
          <InfoItem icon={Phone} label="Phone" value={normalizedPerson.phone} />
          <InfoItem
            icon={CheckSquare}
            label="Status"
            value={
              <span
                className={`inline-block px-2 py-1 rounded-xl text-xs font-medium ${
                  normalizedPerson.status.toLowerCase() === "approved"
                    ? "bg-green-100 text-green-800"
                    : normalizedPerson.status.toLowerCase() === "declined"
                      ? "bg-red-100 text-red-800"
                      : normalizedPerson.status.toLowerCase() === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                }`}
              >
                {normalizedPerson.status.toUpperCase()}
              </span>
            }
          />
        </div>
      </div>
    )

    const renderSocialMediaInfo = () => (
      <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-slate-200">
        <h4 className="flex items-center gap-2 text-base font-semibold text-slate-800 mb-4">
          <Globe size={16} /> Social Media
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InfoItem icon={Mail} label="Email" value={normalizedPerson.email} />
          <InfoItem icon={Facebook} label="Facebook" value={normalizedPerson.fb} />
        </div>
      </div>
    )

    const renderAddressInfo = () => (
      <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-slate-200">
        <h4 className="flex items-center gap-2 text-base font-semibold text-slate-800 mb-4">
          <MapPin size={16} /> Address Information
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InfoItem icon={MapPin} label="Province" value={normalizedPerson.province} />
          <InfoItem icon={MapPin} label="City" value={normalizedPerson.city} />
          <InfoItem icon={MapPin} label="Barangay" value={normalizedPerson.barangay} />
          <InfoItem icon={MapPin} label="ZIP Code" value={normalizedPerson.zip_code} />
        </div>
      </div>
    )

    const renderProfessionalInfo = () => {
      if (normalizedPerson.type !== "veterinarian") return null

      return (
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-slate-200">
          <h4 className="flex items-center gap-2 text-base font-semibold text-slate-800 mb-4">
            <Award size={16} /> Professional Details
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <InfoItem icon={Award} label="License" value={normalizedPerson.license} />
            <InfoItem icon={Award} label="Experience (Years)" value={normalizedPerson.experience} />
            <InfoItem icon={Award} label="Specialization" value={normalizedPerson.specialization} />
            <InfoItem icon={Building} label="Organization" value={normalizedPerson.organization} />
          </div>
        </div>
      )
    }

    return (
      <div
        className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-[1000] modal-overlay"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 duration-400"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-red-700 p-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 pointer-events-none"></div>
            <div className="relative z-10">
              <h3 className="text-2xl font-semibold mb-2">{normalizedPerson.name}</h3>
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                  normalizedPerson.type === "veterinarian"
                    ? "bg-green-500 text-white"
                    : normalizedPerson.type === "kutsero"
                      ? "bg-amber-600 text-white"
                      : normalizedPerson.type === "horse operator"
                        ? "bg-orange-500 text-white"
                        : "bg-white/20 text-white"
                }`}
              >
                {normalizedPerson.type?.replace("_", " ")}
              </span>
            </div>
            <button
              className="absolute top-5 right-5 w-10 h-10 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl flex items-center justify-center text-white hover:bg-white/30 hover:border-white/50 hover:scale-105 transition-all duration-300 z-20"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-8 bg-slate-50 overflow-y-auto">
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
      <Sidebar isOpen={isSidebarOpen} ref={sidebarRef} />

      <div className="flex-1 flex flex-col w-full lg:w-[calc(100%-250px)]">
        <header className="bg-white px-6 py-2 flex items-center justify-between shadow-sm flex-wrap gap-4">
          <div className="flex items-center justify-between py-3 px-5 bg-transparent">
            <h2 className="text-2xl font-bold text-black">Directory</h2>
          </div>
          <button
            className="relative bg-transparent border-none cursor-pointer p-2 rounded-full"
            onClick={() => setNotifsOpen(!notifsOpen)}
          >
            <Bell size={24} className="text-gray-700" />
            {notifications.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {notifications.length}
              </span>
            )}
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

        <div className="flex-1 p-6 bg-gray-100 overflow-y-auto">
          <div className="flex-1 max-w-md relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-3 border-2 border-white rounded-lg text-sm outline-none min-h-[50px] bg-white"
              placeholder="Search directory..."
              onChange={handleSearchInput}
              value={searchTerm}
            />
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-5">
            

            <div className="p-5">
              {loading ? (
                // Show skeleton loader while loading
                <TableSkeleton />
              ) : filteredDirectoryData.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-10 gap-3 text-gray-600">
                  <Folder size={48} />
                  <h3 className="text-lg font-medium">No approved directory entries found</h3>
                  <p className="text-sm">Only approved entries will appear here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm border-b border-gray-200">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm border-b border-gray-200">
                          Role
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm border-b border-gray-200">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm border-b border-gray-200">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 text-sm border-b border-gray-200">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedData().map((person) => (
                        <tr
                          key={person.email}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200"
                        >
                          <td className="px-4 py-4 text-sm text-gray-900">{person.name}</td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-block px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
                                person.type?.toLowerCase() === "veterinarian"
                                  ? "bg-green-100 text-green-800 border border-green-200"
                                  : person.type?.toLowerCase() === "kutsero"
                                    ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                                    : person.type?.toLowerCase().includes("horse")
                                      ? "bg-orange-100 text-orange-800 border border-orange-200"
                                      : "bg-gray-100 text-gray-800 border border-gray-200"
                              }`}
                            >
                              {/* ✅ FIXED: Capitalize first letter of role */}
                              {person.type && person.type.charAt(0).toUpperCase() + person.type.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900 break-words">{person.email}</td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-block px-2 py-1 rounded-xl text-xs font-medium whitespace-nowrap ${
                                person.status?.toLowerCase() === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : person.status?.toLowerCase() === "declined"
                                    ? "bg-red-100 text-red-800"
                                    : person.status?.toLowerCase() === "pending"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {person.status?.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <button
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs cursor-pointer hover:bg-blue-100 hover:border-blue-300 transition-all duration-200"
                              onClick={() => handleView(person)}
                            >
                              <Eye size={16} /> View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {!loading && filteredDirectoryData.length > 0 && (
              <div className="flex justify-between items-center bg-gray-50 px-5 py-3 border-t border-gray-200 text-sm">
                <div className="text-gray-600 flex items-center gap-3">
                  <span>
                    Showing {(currentPagePagination - 1) * itemsPerPagePagination + 1} to{" "}
                    {Math.min(currentPagePagination * itemsPerPagePagination, filteredDirectoryData.length)} of{" "}
                    {filteredDirectoryData.length} results
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Show:</span>
                    <select
                      value={itemsPerPagePagination}
                      onChange={handleItemsPerPageChange}
                      className="px-2 py-1 border border-gray-300 rounded bg-white text-sm"
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>
                  </div>

                  <div className="flex gap-1">
                    <button
                      className="flex items-center justify-center w-8 h-8 border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
                          className={`flex items-center justify-center min-w-[32px] h-8 px-2 border rounded text-sm transition-all duration-200 ${
                            currentPagePagination === pageNum
                              ? "bg-red-700 text-white border-red-700"
                              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                          }`}
                          onClick={() => goToPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      )
                    })}

                    <button
                      className="flex items-center justify-center w-8 h-8 border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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

export default CtuDirectory