import React, { useState } from 'react';
import {Calendar,Users,FileText,Heart,Search,Settings,LogOut,Menu,ChevronLeft,ChevronRight,BarChart3,Clock,MessageCircle,Bell,} from 'lucide-react';
import Sidebar from './components/ui/sideBar';
import FloatingMessages from './components/modal/floatingMessages';
import ProfileModal from './components/modal/profileModal';
import NotificationModal from './components/modal/notificationModal';

const VetDashboard = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);


  const notifications = [
  "🐴 Thunder's appointment is scheduled at 2:00 PM today.",
  "📄 A new access request has been submitted.",
  "💬 You have a new message from DVMF.",
];

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getMonthName = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const navigateMonth = (direction) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const isToday = (day) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const hasAppointment = (day) => {
    const today = new Date();
    if (
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    ) {
      return [today.getDate()].includes(day);
    }
    return false;
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar
        isSidebarCollapsed={isSidebarCollapsed}
        isHovering={isHovering}
        setIsHovering={setIsHovering}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-105"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search patients, appointments..."
                  className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent w-96 bg-white/50 backdrop-blur-sm transition-all duration-200"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
                <button
                onClick={() => setIsNotificationModalOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 relative"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>

                <button
                  onClick={() => {
                  console.log('Profile button clicked!');
                  setIsProfileModalOpen(true);
                  console.log('isProfileModalOpen set to true');
                  }}
                  className="flex items-center space-x-3 bg-green-50 rounded-xl p-2 hover:bg-green-100 transition-all duration-200 cursor-pointer"
                  >
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white font-semibold text-sm">MS</span>
                  </div>
                      <div>
                      <span className="font-medium text-gray-800">Dr. Maria Santos</span>
                      <p className="text-xs text-green-600">Veterinarian</p>
                      </div>
                  </button>
                </div>
                      </div>
                    </div>

        {/* Dashboard Content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
              <p className="text-gray-600">Welcome back, Dr. Santos! Here's what's happening today.</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              { title: "Total Appointments", icon: Calendar, count: 5, color: "blue", trend: "+12%" },
              { title: "Access Requests", icon: FileText, count: 5, color: "yellow", trend: "+5%" },
              { title: "Vet List", icon: Users, count: 5, color: "purple", trend: "+2%" }
            ].map((item, index) => (
              <div key={index} className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 bg-${item.color}-100 rounded-xl flex items-center justify-center`}>
                    <item.icon className={`w-6 h-6 text-${item.color}-600`} />
                  </div>
                  <span className="text-green-500 text-sm font-medium">{item.trend}</span>
                </div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">{item.title}</h3>
                <p className="text-3xl font-bold text-gray-800">{item.count}</p>
              </div>
            ))}
          </div>

          {/* Appointments + Calendar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Appointment Card */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">Upcoming Appointments</h2>
                    <p className="text-sm text-gray-500">You have 1 appointment today</p>
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl border border-orange-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white font-semibold">TL</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">Thunder</h3>
                    <p className="text-sm text-gray-600">Owner: Maria Luna</p>
                    <p className="text-xs text-gray-500 mt-1">Routine Wound Dressing and vaccination</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800">Today 2:00 PM</p>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>30 min</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
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
              </div>
              <div className="p-4">
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 mb-3">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="py-2">{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const days = [];
                    const daysInMonth = getDaysInMonth(currentDate);
                    const firstDay = getFirstDayOfMonth(currentDate);
                    const daysInPrevMonth = getDaysInMonth(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
                    const totalCells = 42;

                    for (let i = firstDay - 1; i >= 0; i--) {
                      days.push({ day: daysInPrevMonth - i, isCurrentMonth: false });
                    }

                    for (let day = 1; day <= daysInMonth; day++) {
                      days.push({ day, isCurrentMonth: true });
                    }

                    for (let day = 1; days.length < totalCells; day++) {
                      days.push({ day, isCurrentMonth: false });
                    }

                    return days.map((dayObj, i) => (
                      <div
                        key={i}
                        className={`h-10 flex items-center justify-center text-sm cursor-pointer rounded-lg relative transition-all duration-200 ${
                          !dayObj.isCurrentMonth
                            ? 'text-gray-300 hover:bg-gray-50'
                            : isToday(dayObj.day)
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold shadow-md'
                            : hasAppointment(dayObj.day)
                            ? 'bg-gradient-to-br from-green-100 to-green-200 text-green-700 font-semibold hover:from-green-200 hover:to-green-300'
                            : 'text-gray-700 hover:bg-gray-100 hover:scale-105'
                        }`}
                      >
                        {dayObj.day}
                        {hasAppointment(dayObj.day) && dayObj.isCurrentMonth && (
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full absolute bottom-1 right-1 animate-pulse"></div>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
     {/* Profile Modal */}
    {console.log('ProfileModal isOpen:', isProfileModalOpen)}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      <NotificationModal
      isOpen={isNotificationModalOpen}
      onClose={() => setIsNotificationModalOpen(false)}
      notifications={notifications}
    />

      {/* Floating Messages Component */}
      <FloatingMessages />
    </div>
  );
};

export default VetDashboard;
