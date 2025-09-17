import React, { useState, useEffect } from "react";

const NotificationModal = ({ isOpen, onClose, notifications = [] }) => {
  const [appointmentReminders, setAppointmentReminders] = useState([]);
  
  useEffect(() => {
    if (isOpen) {
      fetchAppointmentReminders();
    }
  }, [isOpen]);

  const fetchAppointmentReminders = async () => {
    try {
      // Fetch approved appointments from backend
      const response = await fetch('http://localhost:8000/api/veterinarian/get_approved_appointments/');
      const appointments = await response.json();
      
      // Filter for appointments happening tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];
      
      const tomorrowAppointments = appointments.filter(app => {
        const appointmentDate = new Date(app.date).toISOString().split('T')[0];
        return appointmentDate === tomorrowString;
      });
      
      // Create reminder notifications
      const reminders = tomorrowAppointments.map(app => 
        `Reminder: You have an appointment with ${app.clientName} tomorrow at ${app.time}`
      );
      
      setAppointmentReminders(reminders);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    }
  };

  // Combine existing notifications with appointment reminders
  const allNotifications = [...notifications, ...appointmentReminders];

  if (!isOpen) return null;

  return (
    <div className="absolute right-6 top-16 z-50 w-80">
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Notifications</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {allNotifications.length === 0 ? (
          <p className="text-sm text-gray-500">No new notifications</p>
        ) : (
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {allNotifications.map((note, idx) => (
              <li
                key={idx}
                className="p-3 bg-gray-50 rounded-lg shadow-sm text-gray-700 text-sm"
              >
                {note}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NotificationModal;