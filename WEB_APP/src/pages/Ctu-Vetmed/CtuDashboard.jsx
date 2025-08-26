"use client"

import Sidebar from "@/components/CtuSidebar";
import { Bell, BellOff, ClipboardList } from "lucide-react"; // Assuming these icons are used
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

function CtuDashboard() {
  const navigate = useNavigate()

  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false)
 
  const [notifications, setNotifications] = useState([])
  const [recordCount, setrecordCount] = useState(0)
  const [vetCount, setvetCount] = useState(0)
  const [declinedCount, setDeclinedCount] = useState(0)
  const [recentActivities, setRecentActivities] = useState([])
  const [calendarDate, setCalendarDate] = useState(new Date())

  const [time, setTime] = useState(new Date().toLocaleTimeString())
  const [isSidebarOpen, setIsSidebarOpen] = useState(false) // Added state for sidebar open/close

  const notificationBellRef = useRef(null)
  const notificationDropdownRef = useRef(null)
  const logoutModalRef = useRef(null)

  // Helper to format date for calendar title
  const getCalendarTitle = useCallback(() => {
    return calendarDate.toLocaleString("default", { month: "long", year: "numeric" })
  }, [calendarDate])

  // Calendar functions
  const initializeCalendar = useCallback(() => {
    const now = new Date(calendarDate)
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay()
    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day" />)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday =
        day === new Date().getDate() &&
        now.getMonth() === new Date().getMonth() &&
        now.getFullYear() === new Date().getFullYear()

      days.push(
        <div key={`day-${day}`} className={`calendar-day ${isToday ? "today" : ""}`} onClick={() => selectDate(day)}>
          {day}
        </div>,
      )
    }

    return days
  }, [calendarDate])

  const selectDate = (day) => {
    const newDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day)
    setCalendarDate(newDate)
    console.log(`Selected date: ${newDate.toDateString()}`)
  }

  const goToToday = () => {
    setCalendarDate(new Date())
  }

  // Data loading functions
  const loadStats = useCallback(() => {
    console.log("Loading statistics...")

    fetch("http://127.0.0.1:8000/api/status-counts/")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setrecordCount(data.pending || 0)
        setvetCount(data.approved || 0)
        setDeclinedCount(data.declined || 0)
      })
      .catch((err) => console.error("Error fetching stats:", err))
  }, [])

  const loadRecentActivities = useCallback(() => {
    console.log("Loading recent activities...")
    setRecentActivities([])
  }, [])

  const loadNotifications = useCallback(() => {
    console.log("Loading notifications...")
    setNotifications([])
  }, [])

  const markAllNotificationsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })))
  }

  const handleNotificationClick = (id) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)))
    console.log(`Notification ${id} clicked.`)
  }

  

  const loadDashboardData = useCallback(() => {
    loadStats()
    loadRecentActivities()
    loadNotifications()
  }, [loadStats, loadRecentActivities, loadNotifications])

  const toggleNotificationDropdown = () => {
    setIsNotificationDropdownOpen((prev) => !prev)
  }



  const closeLogoutModal = () => {
    setIsLogoutModalOpen(false)
  }

 

  const handleChatButtonClick = () => {
    console.log("Chat button clicked")
    navigate("/CtuMessage")
  }

  

  // Fetch from Django backend
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/recent-activity/") // adjust if deployed
      .then((res) => res.json())
      .then((data) => setRecentActivities(data))
      .catch((err) => console.error("Error fetching activity:", err))
  }, [])

  // Effects
  useEffect(() => {
    console.log("Veterinary Dashboard initialized")
    loadDashboardData()
  }, [loadDashboardData])

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

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

      // Close logout modal
      if (logoutModalRef.current && event.target === logoutModalRef.current) {
        closeLogoutModal()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])


  

  return (
    <div className="body-wrapper">
      <style>{`
        .body-wrapper {
         font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: #f5f5f5;
  display: flex;
  height: 100vh;
  overflow-x: hidden;
  width: 100%; /* Ensure it takes full width */
        }
.main-content {

  flex: 1;
  display: flex;
  flex-direction: column;
  width: calc(100% - 250px);
  transition: margin-left 0.3s ease; /* Add transition for margin */
}

.logout-btns {
  display: flex;
  align-items: center;
  color: white;
  text-decoration: none;
  font-size: clamp(13px, 2vw, 15px);
  font-weight: 500;
  cursor: pointer;
  padding: 14px 40px;
  border-radius: 25px;
  transition: all 0.3s ease;
  min-height: 44px;
}

.logout-btns:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.logout-icons {
  width: 20px;
  height: 20px;
  margin-right: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}



        

        .headers {
          background: white;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          flex-wrap: wrap;
          gap: 55px;
        }

        .dashboard-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          background: transparent;
          
        }

        .dashboard-title {
          font-size: 22px;
          font-weight: bold;
          color: #da2424ff;
        }

        .dashboard-time {
          font-size: 16px;
          font-weight: 500;
          color: #666;
          margin-left: 20px;
        }

        .notification-bell {
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
          display: flex;
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

        .content-areas {
          flex: 1;
          padding: 24px;
          background: #f9fafb;
          overflow-y: auto;
        }

        .content-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .content-logo {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: #b91c1c;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #fbbf24;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }

        .content-logo::before {
          content: "";
          position: absolute;
          width: 100%;
          height: 100%;
          background: conic-gradient(
            from 0deg,
            #b91c1c 0deg,
            #fbbf24 60deg,
            #22c55e 120deg,
            #b91c1c 180deg,
            #fbbf24 240deg,
            #22c55e 300deg,
            #dc2626 360deg
          );
          border-radius: 50%;
        }

        .content-logo::after {
          content: "";
          position: absolute;
          width: 25px;
          height: 18px;
          background: white;
          border-radius: 2px;
          z-index: 2;
          background-image: linear-gradient(45deg, #1f2937 25%, transparent 25%),
            linear-gradient(-45deg, #1f2937 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1f2937 75%),
            linear-gradient(-45deg, transparent 75%, #1f2937 75%);
          background-size: 4px 4px;
          background-position: 0 0, 0 2px, 2px -2px, -2px 0px;
        }

        .create-post-btn {
          background: #b91c1c;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
          min-height: 40px;
        }

        .create-post-btn:hover {
          background: #991b1b;
        }

        .stats-containers {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          padding: 24px;
          border-radius: 10px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s;
          cursor: pointer;
        }

        .stat-card:hover {
          transform: translateY(-2px);
        }

        .stat-title {
          color: #bd5656ff;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .stat-numbers {
          font-size: 36px;
          font-weight: bold;
          color: #b91c1c;
         
           display: flex;
  justify-content: center; /* horizontal */
  align-items: center;     /* vertical */
        }

        .main-grid {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 24px;
        }

        .recent-activity {
          background: #fff;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          border: 1px solid #fee2e2;
        }

        .activity-header {
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 4px;
          color: #dc2626;
        }

        .activity-subtitle {
          font-size: 14px;
          color: #666;
          margin-bottom: 20px;
        }

        .activity-cards {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 300px;
          overflow-y: auto;
        }

        .activity-card {
          border-radius: 12px;
          padding: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .activity-card-0 {
          background: linear-gradient(135deg, #fef2f2 0%, #fff 100%);
          border: 1px solid #fca5a5;
        }
        
        .activity-card-0::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: linear-gradient(to bottom, #dc2626, #ef4444);
        }
        
        .activity-card-0:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(220, 38, 38, 0.15);
          border-color: #dc2626;
        }

        .activity-card-1 {
          background: linear-gradient(135deg, #eff6ff 0%, #fff 100%);
          border: 1px solid #93c5fd;
        }
        
        .activity-card-1::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: linear-gradient(to bottom, #2563eb, #3b82f6);
        }
        
        .activity-card-1:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(37, 99, 235, 0.15);
          border-color: #2563eb;
        }

        .activity-card-2 {
          background: linear-gradient(135deg, #ecfdf5 0%, #fff 100%);
          border: 1px solid #86efac;
        }
        
        .activity-card-2::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: linear-gradient(to bottom, #059669, #10b981);
        }
        
        .activity-card-2:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(5, 150, 105, 0.15);
          border-color: #059669;
        }

        .activity-card-3 {
          background: linear-gradient(135deg, #faf5ff 0%, #fff 100%);
          border: 1px solid #c4b5fd;
        }
        
        .activity-card-3::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: linear-gradient(to bottom, #7c3aed, #8b5cf6);
        }
        
        .activity-card-3:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(124, 58, 237, 0.15);
          border-color: #7c3aed;
        }

        .activity-card-4 {
          background: linear-gradient(135deg, #fff7ed 0%, #fff 100%);
          border: 1px solid #fdba74;
        }
        
        .activity-card-4::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: linear-gradient(to bottom, #ea580c, #f97316);
        }
        
        .activity-card-4:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(234, 88, 12, 0.15);
          border-color: #ea580c;
        }

        .activity-card-5 {
          background: linear-gradient(135deg, #f0f9ff 0%, #fff 100%);
          border: 1px solid #7dd3fc;
        }
        
        .activity-card-5::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: linear-gradient(to bottom, #0891b2, #06b6d4);
        }
        
        .activity-card-5:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(8, 145, 178, 0.15);
          border-color: #0891b2;
        }

        .activity-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
        }

        .activity-avatar {
          color: white;
          font-weight: bold;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          flex-shrink: 0;
        }

        /* Added different color classes for user avatars */
        .activity-avatar-0 {
          background: linear-gradient(135deg, #dc2626, #ef4444);
          box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
        }
        
        .activity-avatar-1 {
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
        }
        
        .activity-avatar-2 {
          background: linear-gradient(135deg, #059669, #10b981);
          box-shadow: 0 2px 8px rgba(5, 150, 105, 0.3);
        }
        
        .activity-avatar-3 {
          background: linear-gradient(135deg, #7c3aed, #8b5cf6);
          box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
        }
        
        .activity-avatar-4 {
          background: linear-gradient(135deg, #ea580c, #f97316);
          box-shadow: 0 2px 8px rgba(234, 88, 12, 0.3);
        }
        
        .activity-avatar-5 {
          background: linear-gradient(135deg, #0891b2, #06b6d4);
          box-shadow: 0 2px 8px rgba(8, 145, 178, 0.3);
        }

        .activity-info {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3px 10px;
        }

        .activity-name {
          font-weight: 600;
          font-size: 14px;
          color: #1f2937;
          grid-column: 1 / -1;
        }

        .activity-detail {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .activity-label {
          font-size: 10px;
          font-weight: 500;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .activity-value {
          font-size: 12px;
          color: #374151;
        }

        .activity-role {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .activity-role.pending {
          background: #fef3c7;
          color: #d97706;
          border: 1px solid #fbbf24;
        }

        .activity-role.approved {
          background: #dcfce7;
          color: #16a34a;
          border: 1px solid #4ade80;
        }

        .activity-role.declined {
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #f87171;
        }

        .activity-role.kutsero {
          background: #fef3c7;
          color: #d97706;
          border: 1px solid #fbbf24;
        }

        .activity-role.operator {
          background: #dbeafe;
          color: #2563eb;
          border: 1px solid #60a5fa;
        }

        .activity-role.admin {
          background: #f3e8ff;
          color: #7c3aed;
          border: 1px solid #a78bfa;
        }

        .activity-date {
          font-size: 10px;
          color: #6b7280;
          font-weight: 500;
          white-space: nowrap;
        }

        .calendar-widget {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          padding: 20px;
        }

        .calendar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 8px;
        }

        .calendar-title {
          font-weight: 600;
          color: #111827;
        }

        .calendar-nav {
          display: flex;
          gap: 8px;
        }

        .calendar-nav-btn {
          padding: 4px 8px;
          border: none;
          background: #3b82f6;
          color: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: background-color 0.2s;
          min-height: 32px;
        }

        .calendar-nav-btn:hover {
          background: #2563eb;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }

        .calendar-day-header {
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          padding: 8px 4px;
          font-weight: 500;
        }

        .calendar-day {
          text-align: center;
          padding: 8px 4px;
          font-size: 12px;
          color: #374151;
          cursor: pointer;
          border-radius: 4px;
          transition: background-color 0.2s;
          min-height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .calendar-day:hover {
          background: #f3f4f6;
        }

        .calendar-day.today {
          background: #3b82f6;
          color: white;
        }

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

        /* Logout Modal Styles */
        .modal-overlay {
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

        .modal-overlay.active {
          display: flex;
        }

        .logout-modal {
          background: white;
          border-radius: 12px;
          padding: 32px;
          width: 90%;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }

        .logout-modal-icon {
          width: 64px;
          height: 64px;
          background: #fef3c7;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }

        .logout-modal-icon i {
          font-size: 28px;
          color: #f59e0b;
        }

        .logout-modal h3 {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 12px;
        }

        .logout-modal p {
          font-size: 16px;
          color: #6b7280;
          margin-bottom: 32px;
          line-height: 1.5;
        }

        .logout-modal-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .logout-modal-btn {
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

        .logout-modal-btn.cancel {
          background: #f3f4f6;
          color: #374151;
        }

        .logout-modal-btn.cancel:hover {
          background: #e5e7eb;
        }

        .logout-modal-btn.confirm {
          background: #ef4444;
          color: white;
        }

        .logout-modal-btn.confirm:hover {
          background: #dc2626;
        }

        /* Tablet */
        @media (max-width: 1024px) {
          .main-grid {
            grid-template-columns: 1fr;
          }
          .stats-containers {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }

        /* Mobile */
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: block;
          }
          
          .header {
            margin-left: 60px;
            padding: 12px 16px;
          }
          .search-containers {
            margin-right: 10px;
            min-width: 150px;
          }
          .content-areas {
            padding: 16px;
          }
          .main-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .stats-containers {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .chat-widget {
            bottom: 16px;
            right: 16px;
          }
          .chat-button {
            width: 56px;
            height: 56px;
            border-radius: 18px;
          }
          .chat-button::after {
            bottom: -6px;
            border-left-width: 8px;
            border-right-width: 8px;
            border-top-width: 8px;
          }
          .logout-modal {
            width: 95%;
            padding: 24px;
          }
          .logout-modal-buttons {
            flex-direction: column;
          }
          .calendar-grid {
            gap: 2px;
          }
          .calendar-day {
            min-height: 28px;
            padding: 4px 2px;
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
          .content-areas {
            padding: 12px;
          }
          .stat-card,
          .recent-activity,
          .calendar-widget {
            padding: 16px;
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
          .logout-btn {
            min-height: 48px;
          }
          .calendar-day {
            min-height: 40px;
          }
        }
        
      `}</style>

    

      <Sidebar isOpen={isSidebarOpen} />
      

      <div className="main-content">
        <header className="headers">
          <div className="dashboard-container">
            <h2 className="dashboard-title">Ctu-VetMed Dashboard</h2>
            <span className="dashboard-time">{time}</span>
          </div>
          <div className="notification-bell" ref={notificationBellRef} onClick={toggleNotificationDropdown}>
            <Bell size={20} />
            {notifications.filter((n) => !n.read).length > 0 && (
              <div className="notification-count">{notifications.filter((n) => !n.read).length}</div>
            )}
            <div
              className={`notification-dropdown ${isNotificationDropdownOpen ? "show" : ""}`}
              ref={notificationDropdownRef}
            >
              <div className="notification-header">
                <h3>Notifications</h3>
                {notifications.filter((n) => !n.read).length > 0 && (
                  <button className="mark-all-read" onClick={markAllNotificationsRead}>
                    Mark all as read
                  </button>
                )}
              </div>
              <div id="notificationList">
                {notifications.length === 0 ? (
                  <div className="empty-state">
                    <BellOff size={48} />
                    <h3>No notifications</h3>
                    <p>You're all caught up!</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`notification-item ${!notification.read ? "unread" : ""}`}
                      onClick={() => handleNotificationClick(notification.id)}
                    >
                      <div className="notification-title">
                        <i className={`notification-icon ${notification.type || "info"}`} />
                        {notification.title}
                      </div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">{notification.time}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="content-areas">
          <div className="stats-containers">
            <div className="stat-card">
              <div className="stat-title">Total Pending</div>
              <div className="stat-numbers">{recordCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-title">Total Approved</div>
              <div className="stat-numbers">{vetCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-title">Total Declined</div>
              <div className="stat-numbers">{declinedCount || 0}</div>
            </div>
          </div>

          <div className="main-grid">
            <div className="recent-activity">
              <h3 className="activity-header">Recent Activity</h3>
              <p className="activity-subtitle">Latest updates from the system</p>

              {recentActivities.length === 0 ? (
                <div className="empty-state">
                  <ClipboardList size={48} className="empty-icon" />
                  <h3>No recent activity</h3>
                  <p>Activity will appear here when available</p>
                </div>
              ) : (
                <div className="activity-cards">
                  {recentActivities.map((activity, index) => {
                    const initials = activity.title
                      .split(" ")
                      .map((word) => word[0])
                      .join("")
                      .toUpperCase()

                    const colorIndex = activity.title.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 6

                    const avatarClassName = `activity-avatar activity-avatar-${colorIndex}`
                    console.log(
                      `[v0] User: ${activity.title}, Color Index: ${colorIndex}, Full className: "${avatarClassName}"`,
                    )

                    return (
                      <div key={activity.id} className={`activity-card activity-card-${colorIndex}`}>
                        <div className={avatarClassName}>{initials}</div>
                        <div className="activity-info">
                          <div className="activity-name">{activity.title}</div>
                          <div className="activity-detail">
                            <span className="activity-label">Email</span>
                            <span className="activity-value">
                              {activity.email || `${activity.title.toLowerCase().replace(" ", "")}@gmail.com`}
                            </span>
                          </div>
                          <div className="activity-detail">
                            <span className="activity-label">Description</span>
                            <span className="activity-value">{activity.description || "System activity update"}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                          <span className={`activity-role ${activity.status}`}>{activity.status}</span>
                          <span className="activity-date">
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

            <div className="calendar-widget">
              <div className="calendar-header">
                <span className="calendar-title">{getCalendarTitle()}</span>
                <div className="calendar-nav">
                  <button className="calendar-nav-btn" onClick={goToToday}>
                    Today
                  </button>
                </div>
              </div>

              <div className="calendar-grid">
                <div className="calendar-day-header">Sun</div>
                <div className="calendar-day-header">Mon</div>
                <div className="calendar-day-header">Tue</div>
                <div className="calendar-day-header">Wed</div>
                <div className="calendar-day-header">Thu</div>
                <div className="calendar-day-header">Fri</div>
                <div className="calendar-day-header">Sat</div>
                {initializeCalendar()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="chat-widget">
        <button className="chat-button" onClick={handleChatButtonClick}>
          <div className="chat-dots">
            <div className="chat-dot" />
            <div className="chat-dot" />
            <div className="chat-dot" />
          </div>
        </button>
      </div>

      
    </div>
  )
}

export default CtuDashboard
