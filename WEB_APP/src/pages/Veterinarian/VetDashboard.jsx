import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, FileText, Clock, ChevronLeft, ChevronRight, Bell, Plus, X, Clock3 } from 'lucide-react';
import Sidebar from '@/components/VetSidebar';
import FloatingMessages from '@/components/modal/floatingMessages';
import ProfileModal from '@/components/modal/profileModal';
import NotificationModal from '@/components/modal/notificationModal';
import ScheduleModal from '@/components/modal/ScheduleModal';

const VetDashboard = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [vetProfile, setVetProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [scheduleSlots, setScheduleSlots] = useState([]);
  const [loading, setLoading] = useState({
    profile: true,
    appointments: true,
    schedule: true
  });

const [notifications, setNotifications] = useState([]);

  // ---------------- FETCH VET PROFILE ----------------
  const fetchProfile = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/veterinarian/vet_profile/', {
        method: 'GET',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) setVetProfile(data.profile);
      else console.error('Profile fetch error:', data.error);
    } catch (err) {
      console.error('Profile fetch failed:', err);
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
    }
  };

  // ---------------- FETCH APPOINTMENTS ----------------
  const fetchAppointments = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/veterinarian/get_all_appointments/', {
        method: 'GET',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) setAppointments(data.appointments || []);
      else console.error('Appointments fetch error:', data.error);
    } catch (err) {
      console.error('Appointments fetch failed:', err);
    } finally {
      setLoading(prev => ({ ...prev, appointments: false }));
    }
  };

// ---------------- FETCH SCHEDULE SLOTS ----------------
const fetchScheduleSlots = async () => {
  try {
    const res = await fetch('http://localhost:8000/api/veterinarian/get_all_schedules/', {
      method: 'GET',
      credentials: 'include',
    });

    const data = await res.json();

    if (res.ok) {
      // data.schedule_slots already contains only upcoming schedules
      const processedSlots = processScheduleSlots(data.schedule_slots || []);
      setScheduleSlots(processedSlots);
    } else {
      console.error('Schedule slots fetch error:', data.error);
      setScheduleSlots([]);
    }
  } catch (err) {
    console.error('Schedule slots fetch failed:', err);
    setScheduleSlots([]);
  } finally {
    setLoading(prev => ({ ...prev, schedule: false }));
  }
};

  // ---------------- PROCESS SCHEDULE SLOTS TO GROUP BY DATE ----------------
  const processScheduleSlots = (slots) => {
    const dateGroups = {};
    
    slots.forEach(slot => {
      // Use app_date if available, otherwise use created_at or fallback to current date
      const date = slot.app_date || slot.date || new Date().toLocaleDateString();
      
      if (!dateGroups[date]) {
        dateGroups[date] = [];
      }
      
      dateGroups[date].push({
        id: slot.id || `${date}-${slot.app_time}`,
        date: date,
        time: slot.app_time || slot.time,
        available: slot.available !== undefined ? slot.available : true,
        pending: slot.app_status === 'pending',
        service: slot.app_service || slot.service,
        horse_name: slot.horse_name,
        app_status: slot.app_status
      });
    });
    
    // Convert to array format for easier rendering and sort by date
    return Object.entries(dateGroups)
      .map(([date, timeSlots]) => ({
        date,
        timeSlots: timeSlots.sort((a, b) => {
          // Sort time slots chronologically
          const timeToMinutes = (time) => {
            if (!time) return 0;
            const [timePart, modifier] = time.split(' ');
            let [hours, minutes] = timePart.split(':').map(Number);
            if (modifier === 'PM' && hours !== 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;
            return hours * 60 + (minutes || 0);
          };
          
          return timeToMinutes(a.time) - timeToMinutes(b.time);
        })
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort dates chronologically
  };

  useEffect(() => {
    fetchProfile();
    fetchAppointments();
    fetchScheduleSlots();
  }, []);

  // ---------------- HELPER FUNCTIONS ----------------
  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const getMonthName = (date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear();
  };

  // ---------------- FILTER APPROVED APPOINTMENTS FOR TODAY ----------------
  const today = new Date();
  const approvedTodayAppointments = appointments.filter(app => {
    const appDate = new Date(app.app_date);
    return app.app_status === "approved" &&
           appDate.getDate() === today.getDate() &&
           appDate.getMonth() === today.getMonth() &&
           appDate.getFullYear() === today.getFullYear();
  });

  // ---------------- SKELETON LOADERS ----------------
  const StatsSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {[1, 2, 3].map((item) => (
        <div key={item} className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-gray-100 flex flex-col items-center animate-pulse">
          <div className="w-12 h-12 bg-gray-200 rounded-full mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );

  const AppointmentsSkeleton = () => (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 h-[500px] flex flex-col animate-pulse">
      <div className="p-6 border-b border-gray-100">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
      <div className="p-6 space-y-4 overflow-y-auto flex-1">
        {[1, 2, 3].map((item) => (
          <div key={item} className="flex items-center space-x-4 p-4 bg-gray-100 rounded-xl">
            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const ScheduleSkeleton = () => (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 h-[500px] flex flex-col animate-pulse">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        <div className="h-10 bg-gray-200 rounded w-32"></div>
      </div>
      <div className="p-4 overflow-auto flex-1">
        <div className="h-10 bg-gray-200 rounded mb-2"></div>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
          <div key={item} className="h-14 bg-gray-100 rounded mb-2"></div>
        ))}
      </div>
    </div>
  );

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Format time for display (remove seconds if present)
  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.replace(/:00$/, '');
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Dashboard</h1>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setIsNotificationModalOpen(!isNotificationModalOpen)} 
              className="cursor-pointer p-2 hover:bg-gray-100 rounded-xl relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </button>
            <button onClick={() => setIsProfileModalOpen(true)}>
              <div className="cursor-pointer w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white font-semibold text-sm">
                  {vetProfile ? `${vetProfile.vet_fname?.[0] || ""}${vetProfile.vet_lname?.[0] || ""}` : ""}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 p-6 overflow-auto">
          {/* Stats Cards */}
          {loading.profile || loading.appointments ? (
            <StatsSkeleton />
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[
                { title: "Total Appointments", icon: Calendar, count: appointments.filter(app => app.app_status === "approved").length, color: "blue" },
                { title: "Pending Appointments", icon: FileText, count: appointments.filter(app => app.app_status === "pending").length, color: "yellow" },
                { title: "Access Requests", icon: Users, count: 0, color: "purple" }
              ].map((item, index) => (
                <div key={index} className={`bg-white/80 backdrop-blur-md rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-6 border border-gray-100 flex flex-col items-center`}>
                  <div className={`w-12 h-12 bg-${item.color}-100 rounded-full flex items-center justify-center mb-3`}>
                    <item.icon className={`w-6 h-6 text-${item.color}-600`} />
                  </div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1 text-center">{item.title}</h3>
                  <p className="text-3xl font-bold text-gray-800 text-center">{item.count}</p>
                </div>
              ))}
            </div>
          )}

          {/* Main Grid: Appointments + Schedule Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Appointments */}
            {loading.appointments ? (
              <AppointmentsSkeleton />
            ) : (
              <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 h-[500px] flex flex-col">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">Upcoming Appointments</h2>
                    <p className="text-sm text-gray-500">
                      You have {approvedTodayAppointments.length} approved appointment(s) today
                    </p>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>

                {/* Scrollable list */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  {approvedTodayAppointments.length > 0 ? (
                    approvedTodayAppointments.map(app => (
                      <div key={app.app_id} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl border border-orange-100">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-md">
                          <span className="text-white font-semibold">{app.horse_name?.[0] || "H"}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">{app.horse_name}</h3>
                          <p className="text-sm text-gray-600">Owner: {app.operator_name}</p>
                          <p className="text-xs text-gray-500 mt-1">{app.app_service || app.app_note}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-800">{app.app_date} {app.app_time}</p>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>30 min</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <Calendar className="w-12 h-12 mb-2" />
                      <p>No appointments scheduled for today</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Schedule Table*/}
            {loading.schedule ? (
              <ScheduleSkeleton />
            ) : (
              <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 h-[500px] flex flex-col">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-800">Appointment Schedule</h2>
                  <button 
                    onClick={() => setIsScheduleModalOpen(true)}
                    className="cursor-pointer flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Schedule</span>
                  </button>
                </div>
                <div className="overflow-auto flex-1">
                  {scheduleSlots.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {scheduleSlots.map((dateGroup, groupIndex) => (
                        <div key={dateGroup.date} className="p-4 hover:bg-gray-50 transition-colors duration-150">
                          {/* Date Header */}
                          <div className="flex items-center mb-3">
                            <div className="w-1.5 h-6 bg-blue-500 rounded-full mr-3"></div>
                            <h3 className="text-lg font-semibold text-gray-800">
                              {formatDate(dateGroup.date)}
                            </h3>
                            <span className="ml-2 text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                              {dateGroup.timeSlots.length} slot{dateGroup.timeSlots.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          
                          {/* Time Slots */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {dateGroup.timeSlots.map((slot) => (
                              <div 
                                key={slot.id} 
                                className={`p-3 rounded-lg border transition-all duration-150 ${
                                  slot.available 
                                    ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                                    : slot.pending
                                    ? 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
                                    : 'bg-red-50 border-red-200 hover:bg-red-100'
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center">
                                    <Clock3 className={`w-4 h-4 mr-2 ${
                                      slot.available 
                                        ? 'text-blue-500' 
                                        : slot.pending
                                        ? 'text-yellow-500'
                                        : 'text-red-500'
                                    }`} />
                                    <span className="font-medium text-gray-800">
                                      {formatTime(slot.time)}
                                    </span>
                                  </div>
                                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                    slot.available 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : slot.pending
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {slot.available ? 'Available' : slot.pending ? 'Pending' : 'Booked'}
                                  </span>
                                </div>
                                
                                {!slot.available && (
                                  <div className="mt-2 text-sm">
                                    <div className="font-medium text-gray-900">
                                      {slot.service}
                                    </div>
                                    <div className="text-gray-600">
                                      with {slot.horse_name}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <Calendar className="w-12 h-12 mb-2" />
                      <p>No schedule available</p>
                      <p className="text-sm mt-2">Add a schedule to get started</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
        <ScheduleModal 
        isOpen={isScheduleModalOpen} 
        onClose={() => setIsScheduleModalOpen(false)} 
        onScheduleAdded={fetchAppointments}
      />
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      <NotificationModal isOpen={isNotificationModalOpen} onClose={() => setIsNotificationModalOpen(false)} notifications={notifications} />
      <FloatingMessages />
    </div>
  );
};

export default VetDashboard;