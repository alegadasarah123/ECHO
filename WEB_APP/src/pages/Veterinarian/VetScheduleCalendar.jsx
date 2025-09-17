import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import Sidebar from '@/components/VetSidebar';
import ScheduleModal from '@/components/modal/ScheduleModal';

const VetScheduleCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAppointments();
  }, []);

const fetchAppointments = async () => {
  try {
    const response = await fetch("http://localhost:8000/api/veterinarian/get_approved_appointments/", {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();

    if (data.appointments) {
      // No need to filter, API already ensures "approved" only
      setAppointments(data.appointments);
    }
  } catch (err) {
    console.error("Failed to fetch appointments:", err);
  }
};

const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const navigateToPreviousMonth = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(prevDate.getMonth() - 1);
      return newDate;
    });
  };

  const navigateToNextMonth = () => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(prevDate.getMonth() + 1);
      return newDate;
    });
  };

  const formatDateForComparison = (date) => {
    // Format date as YYYY-MM-DD for consistent comparison
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const hasAppointmentOnDate = (date) => {
    const dateString = formatDateForComparison(date);
    return appointments.some(app => {
      // Ensure we're comparing just the date part, ignoring time
      const appointmentDate = app.app_date.split('T')[0];
      return appointmentDate === dateString;
    });
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayOfMonth = getFirstDayOfMonth(currentDate);
    const calendarDays = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="h-16 border border-gray-200"></div>);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const hasAppointment = hasAppointmentOnDate(date);
      const appointmentCount = appointments.filter(app => {
        const appointmentDate = app.app_date.split('T')[0];
        return appointmentDate === formatDateForComparison(date);
      }).length;
      
      calendarDays.push(
        <div 
          key={day} 
          className={`h-16 border border-gray-200 p-1 flex flex-col ${hasAppointment ? 'bg-blue-50' : ''}`}
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium">{day}</span>
            {hasAppointment && (
              <span className="w-5 h-5 bg-blue-500 rounded-full text-white text-xs flex items-center justify-center">
                {appointmentCount}
              </span>
            )}
          </div>
          {hasAppointment && (
            <div className="mt-1 text-xs text-blue-600">
              {appointmentCount} appointment{appointmentCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      );
    }

    return calendarDays;
  };

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Header with buttons */}
        <div className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-800">Schedule Calendar</h1>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setIsScheduleModalOpen(true)}
                className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Schedule
              </button>
              <button 
                onClick={() => navigate(-1)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
              >
                Back to Appointments
              </button>
            </div>
          </div>
        </div>

        {/* Calendar content - made more compact */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-2xl shadow-lg p-4 h-full flex flex-col">
            {/* Month navigation */}
            <div className="flex justify-between items-center mb-4">
              <button onClick={navigateToPreviousMonth} className="p-2 hover:bg-gray-100 rounded-full">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-semibold">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button onClick={navigateToNextMonth} className="p-2 hover:bg-gray-100 rounded-full">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Calendar grid - made more compact */}
            <div className="grid grid-cols-7 gap-1 flex-1">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {renderCalendar()}
            </div>
          </div>
        </div>
      </div>

      <ScheduleModal 
        isOpen={isScheduleModalOpen} 
        onClose={() => setIsScheduleModalOpen(false)} 
        onScheduleAdded={fetchAppointments}
      />
    </div>
  );
};

export default VetScheduleCalendar;