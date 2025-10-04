"use client"

import Sidebar from "@/components/CtuSidebar"
import { AlertTriangle, Bell, CheckCircle, ClipboardList, Clock, MapPin, Phone, User, XCircle } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import FloatingMessages from "./CtuMessage"
import NotificationModal from "./CtuNotif"

const API_BASE = "http://127.0.0.1:8000/api/ctu_vetmed"

function CtuDashboard() {
  const navigate = useNavigate()

  const [notifsOpen, setNotifsOpen] = useState(false)
  const [setIsLogoutModalOpen] = useState(false)
  const [setIsNotificationDropdownOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const [notifications, setNotifications] = useState([])
  const [recordCount, setrecordCount] = useState(0)
  const [vetCount, setvetCount] = useState(0)
  const [declinedCount, setDeclinedCount] = useState(0)
  const [recentActivities, setRecentActivities] = useState([])
  const [sosEmergencies, setSosEmergencies] = useState([])

  // Individual loading states for each section
  const [statsLoading, setStatsLoading] = useState(true)
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [sosLoading, setSosLoading] = useState(true)

  const [time, setTime] = useState(new Date().toLocaleTimeString())
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const notificationBellRef = useRef(null)
  const notificationDropdownRef = useRef(null)
  const logoutModalRef = useRef(null)

  // Skeleton Loader Components
  const StatSkeleton = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm flex flex-col items-center text-center animate-pulse">
      <div className="flex items-center gap-2 mb-3 w-full justify-center">
        <div className="h-4 w-20 bg-gray-300 rounded"></div>
        <div className="p-3 rounded-full flex items-center justify-center bg-gray-200">
          <div className="w-6 h-6 bg-gray-300 rounded"></div>
        </div>
      </div>
      <div className="h-10 w-16 bg-gray-300 rounded"></div>
    </div>
  )

  const ActivitySkeleton = () => (
    <div className="rounded-xl p-2.5 flex items-center gap-2.5 border border-gray-200 animate-pulse">
      <div className="w-8 h-8 bg-gray-300 rounded-full flex-shrink-0"></div>
      <div className="flex-1 grid grid-cols-2 gap-2">
        <div className="h-4 bg-gray-300 rounded col-span-2"></div>
        <div className="flex flex-col gap-1">
          <div className="h-3 w-12 bg-gray-300 rounded"></div>
          <div className="h-3 w-20 bg-gray-300 rounded"></div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="h-3 w-16 bg-gray-300 rounded"></div>
          <div className="h-3 w-24 bg-gray-300 rounded"></div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <div className="h-6 w-16 bg-gray-300 rounded"></div>
        <div className="h-3 w-12 bg-gray-300 rounded"></div>
      </div>
    </div>
  )

  const SosSkeleton = () => (
    <div className="border border-gray-200 rounded-xl p-4 animate-pulse">
      <div className="flex justify-between items-start mb-3">
        <div className="h-6 w-16 bg-gray-300 rounded"></div>
        <div className="h-3 w-12 bg-gray-300 rounded"></div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-gray-300 rounded"></div>
          <div className="h-3 w-16 bg-gray-300 rounded"></div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-gray-300 rounded"></div>
          <div className="h-3 w-16 bg-gray-300 rounded"></div>
        </div>
      </div>
      <div className="bg-gray-100 px-3 py-2 rounded-lg">
        <div className="h-3 w-full bg-gray-300 rounded"></div>
      </div>
    </div>
  )

  // Enhanced color assignment function
  const getColorIndex = (activity, index) => {
    const stringHash = activity.title.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return (index + stringHash) % 10
  }

  const getActivityCardClasses = (colorIndex) => {
    const baseClasses = "rounded-xl p-2.5 flex items-center gap-2.5 transition-all duration-300 relative overflow-hidden border"
    const colorVariants = [
      "bg-gradient-to-br from-red-50 to-white border-red-300",
      "bg-gradient-to-br from-blue-50 to-white border-blue-300",
      "bg-gradient-to-br from-green-50 to-white border-green-300",
      "bg-gradient-to-br from-purple-50 to-white border-purple-300",
      "bg-gradient-to-br from-orange-50 to-white border-orange-300",
      "bg-gradient-to-br from-cyan-50 to-white border-cyan-300",
      "bg-gradient-to-br from-emerald-50 to-white border-emerald-300",
      "bg-gradient-to-br from-yellow-50 to-white border-yellow-300",
      "bg-gradient-to-br from-pink-50 to-white border-pink-300",
      "bg-gradient-to-br from-violet-50 to-white border-violet-300",
    ]
    return `${baseClasses} ${colorVariants[colorIndex]}`
  }

  const getActivityAvatarClasses = (colorIndex) => {
    const baseClasses = "text-white font-bold rounded-full w-8 h-8 flex items-center justify-center text-xs flex-shrink-0"
    const colorVariants = [
      "bg-gradient-to-br from-red-600 to-red-500 shadow-lg shadow-red-600/30",
      "bg-gradient-to-br from-blue-600 to-blue-500 shadow-lg shadow-blue-600/30",
      "bg-gradient-to-br from-green-600 to-green-500 shadow-lg shadow-green-600/30",
      "bg-gradient-to-br from-purple-600 to-purple-500 shadow-lg shadow-purple-600/30",
      "bg-gradient-to-br from-orange-600 to-orange-500 shadow-lg shadow-orange-600/30",
      "bg-gradient-to-br from-cyan-600 to-cyan-500 shadow-lg shadow-cyan-600/30",
      "bg-gradient-to-br from-emerald-600 to-emerald-500 shadow-lg shadow-emerald-600/30",
      "bg-gradient-to-br from-yellow-600 to-yellow-500 shadow-lg shadow-yellow-600/30",
      "bg-gradient-to-br from-pink-600 to-pink-500 shadow-lg shadow-pink-600/30",
      "bg-gradient-to-br from-violet-600 to-violet-500 shadow-lg shadow-violet-600/30",
    ]
    return `${baseClasses} ${colorVariants[colorIndex]}`
  }

  const getRoleClasses = (status) => {
    const baseClasses = "px-2 py-1 rounded-xl text-xs font-semibold uppercase tracking-wide border"
    const statusVariants = {
      pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
      approved: "bg-green-100 text-green-700 border-green-300",
      declined: "bg-red-100 text-red-700 border-red-300",
    }
    return `${baseClasses} ${statusVariants[status] || statusVariants.pending}`
  }

  // Data loading functions
  const loadStats = useCallback(() => {
    console.log("Loading statistics...")
    setStatsLoading(true)

    fetch("http://127.0.0.1:8000/api/ctu_vetmed/status-counts/", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setrecordCount(data.pending || 0)
        setvetCount(data.approved || 0)
        setDeclinedCount(data.declined || 0)
        setStatsLoading(false)
      })
      .catch((err) => {
        console.error("Error fetching stats:", err)
        setStatsLoading(false)
      })
  }, [])

  const loadRecentActivities = useCallback(() => {
    console.log("Loading recent activities...")
    setActivitiesLoading(true)

    fetch("http://127.0.0.1:8000/api/ctu_vetmed/recent-activity/", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setRecentActivities(data)
        setActivitiesLoading(false)
      })
      .catch((err) => {
        console.error("Error fetching activity:", err)
        setActivitiesLoading(false)
      })
  }, [])

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

  const loadSosEmergencies = useCallback(() => {
    console.log("Loading SOS emergencies...")
    setSosLoading(true)

    fetch("http://127.0.0.1:8000/api/ctu_vetmed/sos_requests/", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        console.log("Raw SOS data:", data)

        let sosData = []
        if (Array.isArray(data)) sosData = data
        else if (data.sos_requests && Array.isArray(data.sos_requests)) sosData = data.sos_requests
        else if (data.results && Array.isArray(data.results)) sosData = data.results
        else {
          console.warn("Unexpected data structure:", data)
          setSosEmergencies([])
          setSosLoading(false)
          return
        }

        const formatted = sosData.map((item) => {
          let timeAgo = "Unknown time"
          try {
            if (item.time || item.created_at) {
              const createdDate = new Date(item.time || item.created_at)
              const diffMs = Date.now() - createdDate.getTime()
              const diffMin = Math.floor(diffMs / 60000)
              if (diffMin < 1) timeAgo = "Just now"
              else if (diffMin < 60) timeAgo = `${diffMin} min ago`
              else if (diffMin < 1440) timeAgo = `${Math.floor(diffMin / 60)} hr ago`
              else timeAgo = `${Math.floor(diffMin / 1440)} day(s) ago`
            }
          } catch {
            console.warn("Invalid timestamp:", item.time || item.created_at)
          }

          return {
            id: item.id,
            type: item.type || "Emergency",
            contact: item.contact || "Unknown Contact",
            phone: item.phone || "N/A",
            location: item.location || "No location provided",
            time: timeAgo,
            urgent: item.urgent === true || item.status === "pending",
            description: item.description || "No description provided",
          }
        })

        console.log("Formatted SOS data:", formatted)
        setSosEmergencies(formatted)
        setSosLoading(false)
      })
      .catch((err) => {
        console.error("Error fetching SOS emergencies:", err)
        setSosLoading(false)
      })
  }, [])

  const loadDashboardData = useCallback(() => {
    setIsLoading(true)
    
    // Reset all loading states
    setStatsLoading(true)
    setActivitiesLoading(true)
    setSosLoading(true)

    Promise.all([loadStats(), loadRecentActivities(), loadNotifications(), loadSosEmergencies()])
      .then(() => {
        setIsLoading(false)
      })
      .catch((error) => {
        console.error("Error loading dashboard data:", error)
        setIsLoading(false)
        // Ensure loading states are reset even on error
        setStatsLoading(false)
        setActivitiesLoading(false)
        setSosLoading(false)
      })
  }, [loadStats, loadRecentActivities, loadNotifications, loadSosEmergencies])

  const closeLogoutModal = () => {
    setIsLogoutModalOpen(false)
  }

  useEffect(() => {
    loadNotifications()

    const interval = setInterval(() => {
      loadNotifications()
    }, 30000)

    return () => clearInterval(interval)
  }, [loadNotifications])

  useEffect(() => {
    console.log("Veterinary Dashboard initialized")
    loadDashboardData()
  }, [loadDashboardData])

  

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

      if (logoutModalRef.current && event.target === logoutModalRef.current) {
        closeLogoutModal()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleSosItemClick = (emergency) => {
    console.log("SOS Emergency clicked:", emergency)
  }

  return (
    <div className="font-sans bg-gray-100 flex h-screen overflow-x-hidden w-full">
      {isLoading && (
        <div className="fixed top-0 left-0 w-full h-full bg-white/90 flex flex-col items-center justify-center z-[9999]">
          <div className="text-6xl animate-pulse"></div>
          <div className="mt-4 text-lg font-bold text-black">Loading Dashboard...</div>
        </div>
      )}

      <Sidebar isOpen={isSidebarOpen} />

      <div className="flex-1 flex flex-col w-[calc(100%-250px)] transition-all duration-300">
        <header className="bg-white px-6 py-2 flex items-center justify-between shadow-sm flex-wrap gap-14">
          <div className="flex items-center justify-between py-3 px-5 bg-transparent">
            <h2 className="text-2xl font-bold text-black">Dashboard</h2>
            
          </div>
          <button
            className="relative bg-transparent border-none cursor-pointer p-2 rounded-full"
            onClick={() => setNotifsOpen(!notifsOpen)}
          >
            <Bell size={24} color="#374151" />
            {notifications.length > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-xs font-bold">
                {notifications.length}
              </span>
            )}
          </button>

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
          {/* Stat Count Section */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            {statsLoading ? (
              <>
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
              </>
            ) : (
              <>
                <div className="bg-white p-6 rounded-lg shadow-sm transition-transform duration-200 cursor-pointer hover:-translate-y-0.5 flex flex-col items-center text-center">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-gray-600 text-sm font-medium">Total Pending</div>
                    <div className="mr-2.5 p-3 rounded-full flex items-center justify-center bg-yellow-100 text-yellow-600">
                      <Clock size={24} />
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-black">{recordCount}</div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm transition-transform duration-200 cursor-pointer hover:-translate-y-0.5 flex flex-col items-center text-center">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-gray-600 text-sm font-medium">Total Approved</div>
                    <div className="mr-2.5 p-3 rounded-full flex items-center justify-center bg-green-100 text-green-600">
                      <CheckCircle size={24} />
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-black">{vetCount}</div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm transition-transform duration-200 cursor-pointer hover:-translate-y-0.5 flex flex-col items-center text-center">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-gray-600 text-sm font-medium">Total Declined</div>
                    <div className="mr-2.5 p-3 rounded-full flex items-center justify-center bg-red-100 text-red-600">
                      <XCircle size={24} />
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-black">{declinedCount || 0}</div>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-[1fr_400px] gap-6">
            {/* Recent Activity Section */}
            <div className="bg-white p-5 rounded-xl shadow-lg border border-red-100 max-h-[600px] overflow-y-auto">
              <h3 className="text-xl font-bold mb-1 text-black">Recent Activity</h3>
              <p className="text-sm text-gray-600 mb-5">Latest added veterinary account</p>

              {activitiesLoading ? (
                <div className="flex flex-col gap-2">
                  <ActivitySkeleton />
                  <ActivitySkeleton />
                  <ActivitySkeleton />
                </div>
              ) : recentActivities.filter((activity) => {
                const activityDate = new Date(activity.date)
                const now = new Date()
                const diffTime = now - activityDate
                const diffDays = diffTime / (1000 * 60 * 60 * 24)
                return diffDays <= 2
              }).length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-8 text-gray-500">
                  <ClipboardList size={48} className="text-gray-500" />
                  <h3 className="text-lg mb-2 text-gray-700">No recent activity</h3>
                  <p className="text-sm">Activity will appear here when available</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                  {recentActivities
                    .filter((activity) => {
                      const activityDate = new Date(activity.date)
                      const now = new Date()
                      const diffTime = now - activityDate
                      const diffDays = diffTime / (1000 * 60 * 60 * 24)
                      return diffDays <= 2
                    })
                    .map((activity, index) => {
                      const initials = activity.title
                        .split(" ")
                        .map((word) => word[0])
                        .join("")
                        .toUpperCase()

                      const colorIndex = getColorIndex(activity, index)

                      return (
                        <div key={activity.id} className={getActivityCardClasses(colorIndex)}>
                          <div className={getActivityAvatarClasses(colorIndex)}>{initials}</div>
                          <div className="flex-1 grid grid-cols-2 gap-1 gap-x-2.5">
                            <div className="font-semibold text-sm text-gray-800 col-span-2">{activity.title}</div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</span>
                              <span className="text-xs text-gray-700">{activity.email}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Description
                              </span>
                              <span className="text-xs text-gray-700">
                                {activity.description || "System activity update"}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={getRoleClasses(activity.status)}>{activity.status}</span>
                            <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                              {new Date(activity.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>

            {/* SOS Emergency Section */}
            <div className="bg-white rounded-xl shadow-lg border border-red-100 p-5 max-h-96 overflow-y-auto">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-red-100">
                <h3 className="text-xl font-bold text-black flex items-center gap-2">
                  <AlertTriangle size={24} />
                  SOS Emergency
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">Active emergency contacts and alerts</p>

              {sosLoading ? (
                <div className="flex flex-col gap-3">
                  <SosSkeleton />
                  <SosSkeleton />
                </div>
              ) : sosEmergencies.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-8 text-gray-500">
                  <AlertTriangle size={48} />
                  <h3 className="text-lg mb-2 text-gray-700">No active emergencies</h3>
                  <p className="text-sm">Emergency alerts will appear here</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {sosEmergencies.map((emergency) => (
                    <div
                      key={emergency.id}
                      className="bg-gradient-to-br from-red-50 to-white border border-red-300 rounded-xl p-4 transition-all duration-300 cursor-pointer relative overflow-hidden hover:-translate-y-0.5 hover:shadow-lg hover:shadow-red-600/15 hover:border-red-600"
                      onClick={() => handleSosItemClick(emergency)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span
                          className={`px-3 py-1 rounded-2xl text-xs font-semibold uppercase tracking-wide ${
                            emergency.urgent ? "bg-red-500 text-white" : "bg-red-600 text-white"
                          }`}
                        >
                          {emergency.type}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">{emergency.time}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="flex items-center gap-1.5 text-xs text-gray-700">
                          <User size={16} />
                          <span>{emergency.contact}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-700">
                          <Phone size={16} />
                          <span>{emergency.phone}</span>
                        </div>
                      </div>

                      <div className="bg-gray-100 px-3 py-2 rounded-lg text-xs text-gray-600 italic flex items-center gap-1.5">
                        <MapPin size={14} />
                        <span>{emergency.location}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <FloatingMessages />
    </div>
  )
}

export default CtuDashboard