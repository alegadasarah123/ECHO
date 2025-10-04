import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const NotificationModal = ({ isOpen, onClose, notifications = [] }) => {
  const [appointmentReminders, setAppointmentReminders] = useState([]);
  const [medicalAccessNotifs, setMedicalAccessNotifs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      fetchAppointmentReminders();
      fetchMedicalAccessNotifs();
    }
  }, [isOpen]);

  // Fetch appointment reminders
  const fetchAppointmentReminders = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/veterinarian/get_approved_appointments/");
      const appointments = await response.json();

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split("T")[0];

      const tomorrowAppointments = appointments.filter((app) => {
        const appointmentDate = new Date(app.date).toISOString().split("T")[0];
        return appointmentDate === tomorrowString;
      });

      const reminders = tomorrowAppointments.map((app) => ({
        message: `Reminder: You have an appointment with ${app.clientName} tomorrow at ${app.time}`,
        link: `/appointments/${app.id}`,
      }));

      setAppointmentReminders(reminders);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    }
  };

  // Fetch medical access approved notifications
  const fetchMedicalAccessNotifs = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/veterinarian/get_medical_access_approved/");
      const approvals = await response.json();

      const accessNotifs = approvals.map((access) => ({
        message: `Access approved: You can now view records for ${access.horseName}`,
        link: `/medical-records/${access.horseId}`,
      }));

      setMedicalAccessNotifs(accessNotifs);
    } catch (error) {
      console.error("Error fetching medical access approvals:", error);
    }
  };

  // Combine all notifications
  const allNotifications = [
    ...notifications.map((n) =>
      typeof n === "string" ? { message: n, link: null } : n
    ),
    ...appointmentReminders,
    ...medicalAccessNotifs,
  ];

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
                onClick={() => {
                  if (note.link) {
                    onClose();
                    navigate(note.link);
                  }
                }}
                className="p-3 bg-gray-50 rounded-lg shadow-sm text-gray-700 text-sm cursor-pointer hover:bg-gray-100 transition"
              >
                {note.message}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NotificationModal;
