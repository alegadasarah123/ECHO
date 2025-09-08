import React, { useState, useEffect } from 'react';
import { Calendar, Users, FileText, Clock, ChevronLeft, ChevronRight, Bell } from 'lucide-react';
import Sidebar from '@/components/VetSidebar';
import FloatingMessages from '@/components/modal/floatingMessages';
import ProfileModal from '@/components/modal/profileModal';
import NotificationModal from '@/components/modal/notificationModal';

const VetDashboard = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [vetProfile, setVetProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);

  const notifications = [
    "🐴 Thunder's appointment is scheduled at 2:00 PM today.",
    "📄 A new access request has been submitted.",
    "💬 You have a new message from DVMF.",
  ];

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
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchAppointments();
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

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Dashboard</h1>
          <div className="flex items-center space-x-4">
            <button className="cursor-pointer p-2 hover:bg-gray-100 rounded-xl relative">
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

          {/* Main Grid: Appointments + Calendar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Upcoming Appointments */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 h-[400px] flex flex-col">
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
              {approvedTodayAppointments.map(app => (
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
              ))}
            </div>
          </div>

            {/* Calendar */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 h-[400px]">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">{getMonthName(currentDate)}</h2>
                <div className="flex items-center space-x-2">
                  <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-105">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-105">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 mb-3">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="py-2">{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const days = [];
                    const daysInMonth = getDaysInMonth(currentDate);
                    const firstDay = getFirstDayOfMonth(currentDate);
                    const daysInPrevMonth = getDaysInMonth(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
                    const totalCells = 42;

                    for (let i = firstDay - 1; i >= 0; i--) days.push({ day: daysInPrevMonth - i, isCurrentMonth: false });
                    for (let day = 1; day <= daysInMonth; day++) days.push({ day, isCurrentMonth: true });
                    for (let day = 1; days.length < totalCells; day++) days.push({ day, isCurrentMonth: false });

                    return days.map((dayObj, i) => {
                      const dayHasApprovedAppointment = appointments.some(app => {
                        const appDate = new Date(app.app_date);
                        return app.app_status === "approved" &&
                               appDate.getDate() === dayObj.day &&
                               appDate.getMonth() === currentDate.getMonth() &&
                               appDate.getFullYear() === currentDate.getFullYear();
                      });

                      return (
                        <div
                          key={i}
                          className={`h-10 flex items-center justify-center text-sm cursor-pointer rounded-lg relative transition-all duration-200 ${
                            !dayObj.isCurrentMonth
                              ? 'text-gray-300 hover:bg-gray-50'
                              : isToday(dayObj.day)
                              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold shadow-md'
                              : dayHasApprovedAppointment
                              ? 'bg-gradient-to-br from-green-100 to-green-200 text-green-700 font-semibold hover:from-green-200 hover:to-green-300'
                              : 'text-gray-700 hover:bg-gray-100 hover:scale-105'
                          }`}
                        >
                          {dayObj.day}
                          {dayHasApprovedAppointment && dayObj.isCurrentMonth && (
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full absolute bottom-1 right-1 animate-pulse"></div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      <NotificationModal isOpen={isNotificationModalOpen} onClose={() => setIsNotificationModalOpen(false)} notifications={notifications} />
      <FloatingMessages />
    </div>
  );
};

export default VetDashboard;
