import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const NotificationModal = ({ isOpen, onClose, notifications = [] }) => {
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [todaysAppointments, setTodaysAppointments] = useState([]);
  const [loading, setLoading] = useState({
    pending: false,
    today: false
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      fetchAllNotifications();
    }
  }, [isOpen]);

  // Fetch all notifications
  const fetchAllNotifications = async () => {
    setLoading({
      pending: true,
      today: true
    });

    try {
      await Promise.all([
        fetchPendingAppointments(),
        fetchTodaysAppointments()
      ]);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading({
        pending: false,
        today: false
      });
    }
  };

  // Fetch PENDING APPOINTMENTS
  const fetchPendingAppointments = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/veterinarian/get_all_appointments/");
      const data = await response.json();
      
      if (data.appointments) {
        const pendingApps = data.appointments.filter(app => 
          app.app_status === "pending"
        );
        
        const formattedPending = pendingApps.map(app => ({
          id: `pending-${app.app_id}`,
          type: "pending_appointment",
          message: `New appointment request from ${app.operator_name}`,
          description: `Horse: ${app.horse_name} | Service: ${app.app_service || 'General Checkup'} | Date: ${app.app_date}`,
          link: `/appointments/${app.app_id}`,
          timestamp: new Date().toISOString(),
          priority: "high",
          data: app
        }));
        
        setPendingAppointments(formattedPending);
      }
    } catch (error) {
      console.error("Error fetching pending appointments:", error);
    }
  };

  // Fetch TODAY'S APPROVED APPOINTMENTS
  const fetchTodaysAppointments = async () => {
    try {
      const response = await fetch("/api/veterinarian/get_approved_appointments/");
      const data = await response.json();
      
      if (data.appointments) {
        const today = new Date();
        const todayString = today.toLocaleDateString('en-US', { 
          month: '2-digit', 
          day: '2-digit', 
          year: 'numeric' 
        });
        
        const todaysApps = data.appointments.filter(app => {
          try {
            // Compare the formatted date strings directly
            return app.app_date === todayString;
          } catch (error) {
            console.error("Error checking appointment date:", error);
            return false;
          }
        });
        
        const formattedTodays = todaysApps.map(app => ({
          id: `today-${app.app_id}`,
          type: "today_appointment",
          message: `TODAY: Appointment with ${app.horse_name}`,
          description: `Owner: ${app.operator_name} | Time: ${app.app_time} | Service: ${app.app_service || 'General Checkup'}`,
          link: `/appointments/${app.app_id}`,
          timestamp: app.app_date,
          appointmentTime: app.app_time,
          priority: "high",
          data: app
        }));
        
        setTodaysAppointments(formattedTodays);
      }
    } catch (error) {
      console.error("Error fetching today's appointments:", error);
    }
  };

  // Format time display for notifications
  const formatNotificationTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString();
    } catch (error) {
      return "Recently";
    }
  };

  // Get priority badge color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 border-red-200";
      case "medium": return "bg-orange-100 text-orange-800 border-orange-200";
      case "low": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Get type badge color
  const getTypeColor = (type) => {
    switch (type) {
      case "pending_appointment": return "bg-purple-100 text-purple-800";
      case "today_appointment": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Get type display name
  const getTypeDisplayName = (type) => {
    switch (type) {
      case "pending_appointment": return "Pending Request";
      case "today_appointment": return "Today's Appointment";
      default: return "Notification";
    }
  };

  // Combine all notifications
  const allNotifications = [
    ...pendingAppointments,
    ...todaysAppointments,
    ...notifications.map((n, idx) => 
      typeof n === "string" ? { 
        id: `custom-${idx}`, 
        type: "custom", 
        message: n, 
        description: "",
        link: null,
        timestamp: new Date().toISOString(),
        priority: "low"
      } : n
    ),
  ];

  // Sort notifications by priority and timestamp (high priority first, then newest first)
  const sortedNotifications = allNotifications.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  if (!isOpen) return null;

  return (
    <div className="absolute right-6 top-16 z-50 w-96 max-w-sm">
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-semibold text-gray-800">Notifications</h2>
            {sortedNotifications.length > 0 && (
              <span className="bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                {sortedNotifications.length}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchAllNotifications}
              disabled={Object.values(loading).some(l => l)}
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200 transition"
              title="Refresh notifications"
            >
              <svg className={`w-4 h-4 ${Object.values(loading).some(l => l) ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl leading-none p-1 rounded-full hover:bg-gray-200 transition"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Notification Content */}
        <div className="max-h-96 overflow-y-auto">
          {sortedNotifications.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">No new notifications</p>
              <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sortedNotifications.map((note) => (
                <div
                  key={note.id}
                  onClick={() => {
                    if (note.link) {
                      onClose();
                      navigate(note.link);
                    }
                  }}
                  className={`p-4 transition cursor-pointer border-l-4 ${
                    note.link ? "hover:bg-gray-50" : ""
                  } ${
                    note.type === "pending_appointment" ? "border-l-purple-500 bg-purple-50/50" :
                    note.type === "today_appointment" ? "border-l-red-500 bg-red-50/50" :
                    "border-l-gray-400 bg-gray-50/50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${getTypeColor(note.type)}`}>
                        {getTypeDisplayName(note.type)}
                      </span>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getPriorityColor(note.priority)}`}>
                        {note.priority}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatNotificationTime(note.timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-sm font-medium text-gray-800 mb-1">{note.message}</p>
                  {note.description && (
                    <p className="text-xs text-gray-600 mb-2">{note.description}</p>
                  )}
                  
                  {note.type === "today_appointment" && note.appointmentTime && (
                    <div className="flex items-center mt-1">
                      <svg className="w-3 h-3 text-red-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs font-medium text-red-600">
                        Time: {note.appointmentTime}
                      </span>
                    </div>
                  )}
                  
                  {note.link && (
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-blue-600 font-medium hover:text-blue-800 transition">
                        Click to view details →
                      </p>
                      {note.type === "today_appointment" && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium">
                          TODAY
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with quick stats */}
        {sortedNotifications.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t text-xs text-gray-600">
            <div className="flex justify-between items-center">
              <div className="flex space-x-4">
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-1"></span>
                  Pending: {pendingAppointments.length}
                </span>
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                  Today: {todaysAppointments.length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationModal;