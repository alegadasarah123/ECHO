import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import Sidebar from '@/components/VetSidebar';
import ScheduleModal from '@/components/modal/ScheduleModal';

const VetScheduleCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isAppointmentsModalOpen, setIsAppointmentsModalOpen] = useState(false);
  const [selectedDateAppointments, setSelectedDateAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
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
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateForDisplay = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

// normalize MM-DD-YYYY into YYYY-MM-DD
const normalizeAppDate = (dateStr) => {
  if (!dateStr) return "";
  const [month, day, year] = dateStr.split("-");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const hasAppointmentOnDate = (date) => {
  const dateString = formatDateForComparison(date); // YYYY-MM-DD
  return appointments.some(app => normalizeAppDate(app.app_date) === dateString);
};

const getAppointmentsForDate = (date) => {
  const dateString = formatDateForComparison(date); // YYYY-MM-DD
  return appointments.filter(app => normalizeAppDate(app.app_date) === dateString);
};
  const handleDateClick = (date) => {
    const dateAppointments = getAppointmentsForDate(date);
    if (dateAppointments.length > 0) {
      setSelectedDateAppointments(dateAppointments);
      setSelectedDate(formatDateForDisplay(date));
      setIsAppointmentsModalOpen(true);
    }
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
        const appointmentDate = normalizeAppDate(app.app_date);
        return appointmentDate === formatDateForComparison(date);
      }).length;      
      calendarDays.push(
        <div 
          key={day} 
          className={`h-16 border border-gray-200 p-1 flex flex-col ${
            hasAppointment ? 'bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors' : ''
          }`}
          onClick={() => hasAppointment && handleDateClick(date)}
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

        {/* Calendar content */}
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

            {/* Calendar grid */}
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

      {/* Schedule Modal */}
      <ScheduleModal 
        isOpen={isScheduleModalOpen} 
        onClose={() => setIsScheduleModalOpen(false)} 
        onScheduleAdded={fetchAppointments}
      />

      {/* Appointments Modal */}
      {isAppointmentsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-1000">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">Appointments for {selectedDate}</h3>
                <button 
                  onClick={() => setIsAppointmentsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {selectedDateAppointments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No appointments found for this date.</p>
              ) : (
                <div className="space-y-4">
                  {selectedDateAppointments.map((appointment, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <h4 className="font-semibold text-gray-800">Appointment Details</h4>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Time:</span>{" "}
                            {appointment.app_time ? appointment.app_time : "N/A"}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Status:</span> 
                            <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                              appointment.status === 'approved' ? 'bg-green-100 text-green-800' :
                              appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {appointment.status}
                            </span>
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">Pet Information</h4>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Pet:</span> {appointment.pet_name || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Service:</span> {appointment.service_type || 'N/A'}
                          </p>
                        </div>
                      </div>
                      {appointment.notes && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Notes:</span> {appointment.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end">
                <button 
                  onClick={() => setIsAppointmentsModalOpen(false)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VetScheduleCalendar;