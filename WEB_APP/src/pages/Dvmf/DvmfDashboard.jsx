"use client"

import Sidebar from "@/components/DvmfSidebar"
import { AlertTriangle, Bell, CheckCircle, ClipboardList, Clock, Eye, MapPin, Phone, RefreshCw, User, X, XCircle } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import FloatingMessages from './DvmfMessage'
import NotificationsModal from "./DvmfNotif"

const API_BASE = "http://localhost:8000/api/dvmf";

function DvmfDashboard() {
  const navigate = useNavigate()

  const [notifsOpen, setNotifsOpen] = useState(false)
  const [setIsLogoutModalOpen] = useState(false)
  const [setIsNotificationDropdownOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [notifications, setNotifications] = useState([])
  const [recordCount, setrecordCount] = useState(0)
  const [vetCount, setvetCount] = useState(0)
  const [declinedCount, setDeclinedCount] = useState(0)
  const [recentActivities, setRecentActivities] = useState([])
  const [sosEmergencies, setSosEmergencies] = useState([])

  const [statsLoading, setStatsLoading] = useState(true)
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [sosLoading, setSosLoading] = useState(true)

  const [time, setTime] = useState(new Date().toLocaleTimeString())
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)

  const notificationBellRef = useRef(null)
  const notificationDropdownRef = useRef(null)
  const logoutModalRef = useRef(null)

  const StatSkeleton = () => (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm flex flex-col items-center text-center animate-pulse">
      <div className="flex items-center gap-2 mb-3 w-full justify-center">
        <div className="h-4 w-16 sm:w-20 bg-gray-300 rounded"></div>
        <div className="p-2 sm:p-3 rounded-full flex items-center justify-center bg-gray-200">
          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-300 rounded"></div>
        </div>
      </div>
      <div className="h-8 sm:h-10 w-12 sm:w-16 bg-gray-300 rounded"></div>
    </div>
  )

  const ActivitySkeleton = () => (
    <div className="rounded-xl p-2.5 flex items-center gap-2.5 border border-gray-200 animate-pulse">
      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-300 rounded-full flex-shrink-0"></div>
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="h-4 bg-gray-300 rounded sm:col-span-2"></div>
        <div className="flex flex-col gap-1">
          <div className="h-3 w-10 sm:w-12 bg-gray-300 rounded"></div>
          <div className="h-3 w-16 sm:w-20 bg-gray-300 rounded"></div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="h-3 w-14 sm:w-16 bg-gray-300 rounded"></div>
          <div className="h-3 w-20 sm:w-24 bg-gray-300 rounded"></div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
        <div className="h-6 w-14 sm:w-16 bg-gray-300 rounded"></div>
        <div className="h-3 w-10 sm:w-12 bg-gray-300 rounded"></div>
      </div>
    </div>
  )

  const SosSkeleton = () => (
    <div className="border border-gray-200 rounded-xl p-3 sm:p-4 animate-pulse">
      <div className="flex justify-between items-start mb-3">
        <div className="h-5 sm:h-6 w-14 sm:w-16 bg-gray-300 rounded"></div>
        <div className="h-3 w-10 sm:w-12 bg-gray-300 rounded"></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-gray-300 rounded"></div>
          <div className="h-3 w-14 sm:w-16 bg-gray-300 rounded"></div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-gray-300 rounded"></div>
          <div className="h-3 w-14 sm:w-16 bg-gray-300 rounded"></div>
        </div>
      </div>
      <div className="bg-gray-100 px-3 py-2 rounded-lg">
        <div className="h-3 w-full bg-gray-300 rounded"></div>
      </div>
    </div>
  )

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
    const baseClasses = "text-white font-bold rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs flex-shrink-0"
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

  const handleViewImage = (imageUrl, emergency) => {
    setSelectedImage({
      url: imageUrl,
      emergency: emergency
    })
    setIsImageModalOpen(true)
  }

  const handleCloseImageModal = () => {
    setIsImageModalOpen(false)
    setSelectedImage(null)
  }

  const loadStats = useCallback(() => {
    console.log("Loading statistics...")
    setStatsLoading(true)

    fetch("http://localhost:8000/api/dvmf/get_status_counts/", {
      method: 'GET',
      credentials: 'include',
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
    setActivitiesLoading(true);

    fetch("http://localhost:8000/api/dvmf/get_recent_activity/", {
      method: "GET",
      credentials: "include",
    })
      .then(async (res) => {
        if (res.status === 401) {
          console.warn("Unauthorized - redirecting to login");
          return [];
        }

        if (!res.ok) {
          const errorText = await res.text();
          console.error("Backend returned error:", errorText);
          return [];
        }

        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setRecentActivities(data);
        } else if (data.error) {
          console.error("Backend error:", data.error);
          setRecentActivities([]);
        } else {
          setRecentActivities([]);
        }

        setActivitiesLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching activity:", err);
        setRecentActivities([]);
        setActivitiesLoading(false);
      });
  }, []);

  const loadNotifications = useCallback(() => {
    console.log("Loading notifications...")

    fetch("http://localhost:8000/api/dvmf/get_vetnotifications/", {
      credentials: "include"
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch notifications")
        return res.json()
      })
      .then((data) => {
        console.log("Raw notifications data:", data);
        const formatted = data.map((notif) => ({
          id: notif.id,
          message: notif.message,
          date: notif.date || new Date().toISOString(),
          read: notif.read || false,
          type: notif.type || "general"
        }))
        console.log("Formatted notifications:", formatted);
        console.log("Unread count:", formatted.filter(n => !n.read).length);
        setNotifications(formatted)
      })
      .catch((err) => console.error("Failed to fetch notifications:", err))
  }, [])

  const loadSosEmergencies = useCallback(() => {
    console.log("Loading SOS emergencies...")
    setSosLoading(true)

    fetch("http://localhost:8000/api/dvmf/get_sos_requests/", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTPS error! Status: ${res.status}`)
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
          let formattedTime = "Unknown time"
          try {
            if (item.time || item.created_at) {
              const createdDate = new Date(item.time || item.created_at)
              
              formattedTime = createdDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              }) + ' ' + createdDate.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
              })
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
            time: formattedTime,
            urgent: item.urgent === true || item.status === "pending",
            description: item.description || "No description provided",
            sos_image_url: item.sos_image_url || null,
            horse_status: item.horse_status || "Unknown",
            additional_info: item.additional_info || ""
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
        setStatsLoading(false)
        setActivitiesLoading(false)
        setSosLoading(false)
      })
  }, [loadStats, loadRecentActivities, loadNotifications, loadSosEmergencies])

  const handleRefresh = useCallback(() => {
    console.log("Manual refresh triggered")
    setIsRefreshing(true)
    
    setStatsLoading(true)
    setActivitiesLoading(true)
    setSosLoading(true)

    Promise.all([loadStats(), loadRecentActivities(), loadNotifications(), loadSosEmergencies()])
      .then(() => {
        setIsRefreshing(false)
        console.log("Manual refresh completed")
      })
      .catch((error) => {
        console.error("Error during manual refresh:", error)
        setIsRefreshing(false)
        setStatsLoading(false)
        setActivitiesLoading(false)
        setSosLoading(false)
      })
  }, [loadStats, loadRecentActivities, loadNotifications, loadSosEmergencies])

  const closeLogoutModal = () => {
    setIsLogoutModalOpen(false)
  }

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch(`${API_BASE}/mark_all_notifications_read/`, {
        method: "POST",
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to mark all as read");
      }
      
      const data = await res.json();
      console.log("Mark all as read result:", data);

      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
      
    } catch (err) {
      console.error("Error marking all as read:", err);
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

  const handleNotificationsUpdate = (updatedNotifications) => {
    console.log("Notifications updated from modal:", updatedNotifications);
    console.log("New unread count:", updatedNotifications.filter(n => !n.read).length);
    setNotifications(updatedNotifications);
  };

  const handleOpenUserManagement = (notification = null) => {
    console.log('Opening User Management from dashboard notification:', notification)
    if (notification) {
      navigate('/CtuDashboard', { 
        state: { 
          highlightedNotification: notification,
          shouldHighlight: true
        } 
      })
    } else {
      navigate('/CtuDashboard')
    }
  }

  useEffect(() => {
    loadNotifications()

    const interval = setInterval(() => {
      loadNotifications()
    }, 30000)

    return () => clearInterval(interval)
  }, [loadNotifications])

  useEffect(() => {
    console.log("CTU Dashboard initialized")
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

  const unreadNotificationsCount = notifications.filter(notif => !notif.read).length

  return (
    <div className="font-sans bg-gray-100 flex h-screen overflow-x-hidden w-full">
      {isLoading && (
        <div className="fixed top-0 left-0 w-full h-full bg-white/90 flex flex-col items-center justify-center z-[9999]">
          <div className="text-6xl animate-pulse"></div>
          <div className="mt-4 text-lg font-bold text-black">Loading Dashboard...</div>
        </div>
      )}

      {!isImageModalOpen && <Sidebar isOpen={isSidebarOpen} />}
      {!isImageModalOpen && <FloatingMessages />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex flex-col min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1 truncate">Dashboard</h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="cursor-pointer p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Refresh Dashboard"
            >
              <RefreshCw 
                className={`w-5 h-5 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} 
              />
            </button>

            <button
              ref={notificationBellRef}
              className="relative bg-transparent border-none cursor-pointer p-2 rounded-full hover:bg-gray-100 transition-colors"
              onClick={() => setNotifsOpen(!notifsOpen)}
            >
              <Bell size={20} className="sm:w-6 sm:h-6" color="#374151" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold min-w-[20px]">
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              )}
            </button>
          </div>

          <NotificationsModal
            isOpen={notifsOpen}
            onClose={() => setNotifsOpen(false)}
            notifications={notifications}
            onNotificationClick={handleNotificationClick}
            onMarkAllAsRead={handleMarkAllAsRead}
            onNotificationsUpdate={handleNotificationsUpdate}
          />
        </header>

        <div className="flex-1 p-4 sm:p-6 bg-gray-100 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
            {statsLoading ? (
              <>
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
              </>
            ) : (
              <>
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm transition-transform duration-200 flex flex-col items-center text-center">
                  <div className="flex items-center gap-2 mb-3 w-full justify-between sm:justify-center">
                    <div className="text-gray-600 text-sm font-medium">Total Pending</div>
                    <div className="p-2 sm:p-3 rounded-full flex items-center justify-center bg-yellow-100 text-yellow-600">
                      <Clock size={20} className="sm:w-6 sm:h-6" />
                    </div>
                  </div>
                  <div className="text-3xl sm:text-4xl font-bold text-black">{recordCount}</div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm transition-transform duration-200 flex flex-col items-center text-center">
                  <div className="flex items-center gap-2 mb-3 w-full justify-between sm:justify-center">
                    <div className="text-gray-600 text-sm font-medium">Total Approved</div>
                    <div className="p-2 sm:p-3 rounded-full flex items-center justify-center bg-green-100 text-green-600">
                      <CheckCircle size={20} className="sm:w-6 sm:h-6" />
                    </div>
                  </div>
                  <div className="text-3xl sm:text-4xl font-bold text-black">{vetCount}</div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm transition-transform duration-200 flex flex-col items-center text-center">
                  <div className="flex items-center gap-2 mb-3 w-full justify-between sm:justify-center">
                    <div className="text-gray-600 text-sm font-medium">Total Not Approved</div>
                    <div className="p-2 sm:p-3 rounded-full flex items-center justify-center bg-red-100 text-red-600">
                      <XCircle size={20} className="sm:w-6 sm:h-6" />
                    </div>
                  </div>
                  <div className="text-3xl sm:text-4xl font-bold text-black">{declinedCount || 0}</div>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4 sm:gap-6">
            <div className="bg-white p-4 sm:p-5 rounded-xl shadow-lg border border-red-100 max-h-[600px] overflow-y-auto">
              <h3 className="text-lg sm:text-xl font-bold mb-1 text-black">Recent Activity</h3>
              <p className="text-sm text-gray-600 mb-4 sm:mb-5">Latest added veterinary account</p>

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
                <div className="flex flex-col items-center justify-center text-center p-6 sm:p-8 text-gray-500">
                  <ClipboardList size={40} className="sm:w-12 sm:h-12 text-gray-500" />
                  <h3 className="text-base sm:text-lg mb-2 text-gray-700">No recent activity</h3>
                  <p className="text-xs sm:text-sm">Activity will appear here when available</p>
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
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-1 gap-x-2.5 min-w-0">
                            <div className="font-semibold text-sm text-gray-800 sm:col-span-2 truncate">{activity.title}</div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</span>
                              <span className="text-xs text-gray-700 truncate">{activity.email}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Description
                              </span>
                              <span className="text-xs text-gray-700 truncate">
                                {activity.description ? 
                                  activity.description.replace('declined', 'Not Approved').replace('Declined', 'Not Approved') 
                                  : "System activity update"
                                }
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                            <span className={getRoleClasses(activity.status)}>
                              {activity.status === 'declined' ? 'Not Approved' : activity.status}
                            </span>
                            <span className="text-xs text-gray-500 font-medium whitespace-nowrap hidden sm:block">
                              {new Date(activity.date).toLocaleDateString("en-US", {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              }) + ' ' + new Date(activity.date).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "numeric",
                                hour12: true
                              })}
                            </span>
                            <span className="text-xs text-gray-500 font-medium whitespace-nowrap sm:hidden">
                              {new Date(activity.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-red-100 p-4 sm:p-5 max-h-96 overflow-y-auto">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-red-100">
                <h3 className="text-lg sm:text-xl font-bold text-black flex items-center gap-2">
                  <AlertTriangle size={20} className="sm:w-6 sm:h-6" />
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
                <div className="flex flex-col items-center justify-center text-center p-6 sm:p-8 text-gray-500">
                  <AlertTriangle size={40} className="sm:w-12 sm:h-12" />
                  <h3 className="text-base sm:text-lg mb-2 text-gray-700">No active emergencies</h3>
                  <p className="text-xs sm:text-sm">Emergency alerts will appear here</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {sosEmergencies.map((emergency) => (
                    <div
                      key={emergency.id}
                      className="bg-gradient-to-br from-red-50 to-white border border-red-300 rounded-xl p-3 sm:p-4 overflow-hidden"
                      onClick={() => handleSosItemClick(emergency)}
                    >
                      <div className="flex justify-between items-start mb-3 flex-col sm:flex-row gap-2 sm:gap-0">
                        <span
                          className={`px-3 py-1 rounded-2xl text-xs font-semibold uppercase tracking-wide ${
                            emergency.urgent ? "bg-red-500 text-white" : "bg-red-600 text-white"
                          }`}
                        >
                          {emergency.type}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">{emergency.time}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                        <div className="flex items-center gap-1.5 text-xs text-gray-700">
                          <User size={14} className="sm:w-4 sm:h-4" />
                          <span className="truncate">{emergency.contact}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-700">
                          <Phone size={14} className="sm:w-4 sm:h-4" />
                          <span className="truncate">{emergency.phone}</span>
                        </div>
                      </div>

                      <div className="bg-gray-100 px-3 py-2 rounded-lg text-xs text-gray-600 italic flex items-center gap-1.5 mb-2">
                        <MapPin size={12} className="sm:w-3.5 sm:h-3.5" />
                        <span className="truncate">{emergency.location}</span>
                      </div>

                      {emergency.sos_image_url && (
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewImage(emergency.sos_image_url, emergency)
                            }}
                            className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            <Eye size={12} />
                            View Image
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isImageModalOpen && selectedImage && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[10000] p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-3 sm:p-4 border-b">
              <h3 className="text-base sm:text-lg font-semibold truncate">
                SOS Emergency Image - {selectedImage.emergency?.contact || 'Unknown'}
              </h3>
              <button
                onClick={handleCloseImageModal}
                className="p-1 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>
            
            <div className="p-2 sm:p-4 max-h-[70vh] overflow-auto">
              <div className="flex justify-center">
                <img
                  src={selectedImage.url}
                  alt="SOS Emergency"
                  className="max-w-full max-h-[300px] sm:max-h-[400px] object-contain rounded-lg border"
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/400x300?text=Image+Not+Found"
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DvmfDashboard