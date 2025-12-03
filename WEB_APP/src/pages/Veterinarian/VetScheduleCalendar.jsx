import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Pen, Calendar, Clock, Phone, User } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import ScheduleModal from '@/components/modal/ScheduleModal';

const VetScheduleCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isAppointmentsModalOpen, setIsAppointmentsModalOpen] = useState(false);
  const [selectedDateAppointments, setSelectedDateAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:8000/api/veterinarian/get_approved_appointments/", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.appointments) {
        setAppointments(data.appointments);
      } else {
        setAppointments([]);
      }
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
      setAppointments([]);
    } finally {
      setLoading(false);
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

  // Normalize MM-DD-YYYY into YYYY-MM-DD
  const normalizeAppDate = (dateStr) => {
    if (!dateStr) return "";
    const [month, day, year] = dateStr.split("-");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  };

  const hasAppointmentOnDate = (date) => {
    const dateString = formatDateForComparison(date);
    return appointments.some(app => normalizeAppDate(app.app_date) === dateString);
  };

  const getAppointmentsForDate = (date) => {
    const dateString = formatDateForComparison(date);
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

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayOfMonth = getFirstDayOfMonth(currentDate);
    const calendarDays = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      calendarDays.push(
        <div key={`empty-${i}`} className="h-20 border border-gray-200 bg-gray-50"></div>
      );
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const hasAppointment = hasAppointmentOnDate(date);
      const appointmentCount = appointments.filter(app => {
        const appointmentDate = normalizeAppDate(app.app_date);
        return appointmentDate === formatDateForComparison(date);
      }).length;

      const isToday = date.toDateString() === new Date().toDateString();

      calendarDays.push(
        <div 
          key={day} 
          className={`h-20 border border-gray-200 p-2 flex flex-col relative group ${
            hasAppointment ? 'cursor-pointer hover:bg-blue-50 transition-all duration-200' : ''
          } ${isToday ? 'bg-blue-50 border-blue-300' : ''}`}
          onClick={() => hasAppointment && handleDateClick(date)}
        >
          <div className="flex justify-between items-start">
            <span className={`text-sm font-semibold ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
              {day}
            </span>
            {hasAppointment && (
              <span className="w-6 h-6 bg-blue-500 rounded-full text-white text-xs flex items-center justify-center shadow-sm">
                {appointmentCount}
              </span>
            )}
          </div>
          
          {hasAppointment && (
            <div className="mt-auto">
              <div className="text-xs font-medium text-blue-600">
                {appointmentCount} appointment{appointmentCount !== 1 ? 's' : ''}
              </div>
            </div>
          )}
          
          {/* Hover effect */}
          {hasAppointment && (
            <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-5 transition-opacity rounded pointer-events-none"></div>
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
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
    

      {/* Main Content - with margin for sidebar */}
      <div className="flex-1 flex flex-col">
        {/* Fixed Header */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Schedule Calendar</h1>
              <p className="text-gray-600 text-sm mt-1">View and manage your approved appointments</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setIsScheduleModalOpen(true)}
                className="flex items-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2.5 rounded-xl transition-all duration-200 whitespace-nowrap shadow-sm hover:shadow-md"
              >
                <Pen className="w-4 h-4 mr-2" />
                Edit Schedule
              </button>
              <button 
                onClick={() => navigate(-1)}
                className="flex items-center bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-800 px-4 py-2.5 rounded-xl transition-all duration-200 whitespace-nowrap shadow-sm hover:shadow-md"
              >
                ← Back to Appointments
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              {/* Month navigation */}
              <div className="flex justify-between items-center mb-6">
                <button 
                  onClick={navigateToPreviousMonth} 
                  className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200 hover:border-gray-300"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
                
                <div className="flex flex-col items-center">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    {appointments.length} approved appointment{appointments.length !== 1 ? 's' : ''} total
                  </p>
                </div>
                
                <button 
                  onClick={navigateToNextMonth} 
                  className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200 hover:border-gray-300"
                >
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1 border rounded-xl overflow-hidden">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div 
                    key={day} 
                    className="text-center text-sm font-semibold text-gray-600 py-3 bg-gray-50 border-b"
                  >
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {renderCalendar()}
              </div>

              {/* Legend */}
              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Appointments</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded-full"></div>
                  <span>Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                  <span>No appointments</span>
                </div>
              </div>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Appointments for {selectedDate}</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    {selectedDateAppointments.length} appointment{selectedDateAppointments.length !== 1 ? 's' : ''} scheduled
                  </p>
                </div>
                <button 
                  onClick={() => setIsAppointmentsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {selectedDateAppointments.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg font-medium">No appointments found for this date.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDateAppointments.map((appointment, index) => (
                    <div 
                      key={appointment.app_id || index} 
                      className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all duration-200 bg-white"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold text-gray-800 text-lg">{appointment.horse_name || "Unknown Horse"}</h4>
                          <p className="text-gray-500 text-sm mt-1">Owner: {appointment.operator_name || "N/A"}</p>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full border border-green-200">
                          Approved
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Date and Time */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium text-gray-700">Date:</span>
                            <span className="text-gray-900">{appointment.app_date}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-purple-500" />
                            <span className="text-sm font-medium text-gray-700">Time:</span>
                            <span className="text-gray-900">{formatTime(appointment.app_time)}</span>
                          </div>
                        </div>
                        
                        {/* Service */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-medium text-gray-700">Service:</span>
                            <span className="text-gray-900">{appointment.app_service || "General Check-up"}</span>
                          </div>
                          {appointment.operator_phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-orange-500" />
                              <span className="text-sm font-medium text-gray-700">Contact:</span>
                              <span className="text-gray-900">{appointment.operator_phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Total: {selectedDateAppointments.length} appointment{selectedDateAppointments.length !== 1 ? 's' : ''}
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsAppointmentsModalOpen(false)}
                    className="px-6 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors font-medium"
                  >
                    Close
                  </button>
                  <button 
                    onClick={() => {
                      navigate('/vetappointments'); // Changed to /vetappointments
                      setIsAppointmentsModalOpen(false);
                    }}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                  >
                    View All Appointments
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VetScheduleCalendar;