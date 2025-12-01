import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, FileText, Clock, Bell, Plus, X, Clock3, RefreshCw, Trash2, Save, Loader, ClipboardList, Check } from 'lucide-react';
import Sidebar from '@/components/VetSidebar';
import FloatingMessages from '@/components/modal/floatingMessages';
import ProfileModal from '@/components/modal/profileModal';
import NotificationModal from '@/components/modal/notificationModal';
import ScheduleModal from '@/components/modal/ScheduleModal';

// Separate component for custom service form to prevent re-renders
const CustomServiceForm = React.memo(({ 
  onSave, 
  onCancel, 
  isSaving 
}) => {
  const [serviceName, setServiceName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!serviceName.trim()) return;
    
    onSave({
      name: serviceName,
      description: serviceDescription
    });
    
    // Reset form
    setServiceName('');
    setServiceDescription('');
  };

  const handleCancel = () => {
    setServiceName('');
    setServiceDescription('');
    onCancel();
  };

  return (
    <div className="p-6 border-b border-gray-100 bg-purple-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-purple-900">Create Custom Service</h3>
        <button 
          onClick={handleCancel}
          className="text-purple-600 hover:text-purple-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Service Name *
          </label>
          <input
            type="text"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Enter your custom service name..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={serviceDescription}
            onChange={(e) => setServiceDescription(e.target.value)}
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Describe your custom service..."
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Create Service</span>
          </button>
        </div>
      </form>
    </div>
  );
});

const VetDashboard = () => {
  const navigate = useNavigate();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [vetProfile, setVetProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState({
    profile: true,
    appointments: true,
    services: true
  });
  const [refreshing, setRefreshing] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);

  // Services state - SIMPLIFIED
  const [services, setServices] = useState([]);
  const [predefinedServices, setPredefinedServices] = useState([]);
  const [savingService, setSavingService] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Custom service state - MINIMAL
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    service: null,
    deleting: false
  });

  // Current schedule state
  const [currentSchedule, setCurrentSchedule] = useState(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // ---------------- SERVICES FUNCTIONS ----------------
  const fetchServices = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, services: true }));
      const response = await fetch('http://localhost:8000/api/veterinarian/get_vet_services/', {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();
      
      if (response.ok) {
        setServices(data.services || []);
        setPredefinedServices(data.predefined_services || []);
      }
    } catch (err) {
      // Silent error
    } finally {
      setLoading(prev => ({ ...prev, services: false }));
    }
  }, []);

  const handleQuickAddService = async (service) => {
    setSavingService(true);

    try {
      const response = await fetch('http://localhost:8000/api/veterinarian/create_vet_service/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          service_name: service.name,
          description: service.description
        })
      });

      if (response.ok) {
        await fetchServices();
      }
    } catch (err) {
      // Silent error
    } finally {
      setSavingService(false);
    }
  };

  const handleCreateCustomService = async (serviceData) => {
    setSavingService(true);

    try {
      const response = await fetch('http://localhost:8000/api/veterinarian/create_vet_service/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          service_name: serviceData.name,
          description: serviceData.description
        })
      });

      if (response.ok) {
        await fetchServices();
        setShowCustomInput(false);
      }
    } catch (err) {
      // Silent error
    } finally {
      setSavingService(false);
    }
  };

  const isServiceAdded = (serviceName) => {
    return services.some(service => service.service_name === serviceName);
  };

  // ---------------- DELETE MODAL FUNCTIONS ----------------
  const openDeleteModal = (service) => {
    setDeleteModal({
      isOpen: true,
      service: service,
      deleting: false
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      service: null,
      deleting: false
    });
  };

  const handleDeleteService = async () => {
    if (!deleteModal.service) return;

    setDeleteModal(prev => ({ ...prev, deleting: true }));

    try {
      const response = await fetch(`http://localhost:8000/api/veterinarian/delete_vet_service/${deleteModal.service.service_id}/`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        await fetchServices();
        closeDeleteModal();
      }
    } catch (err) {
      // Silent error
    } finally {
      setDeleteModal(prev => ({ ...prev, deleting: false }));
    }
  };

  // ---------------- EXISTING FUNCTIONS ----------------
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:8000/api/veterinarian/get_notifications/", {
        credentials: "include"
      });
      const data = await response.json();
      
      if (response.ok) {
        setNotifications(data.notifications || []);
        const unreadCount = data.notifications.filter(n => !n.read).length;
        setNotificationCount(unreadCount);
      }
    } catch (error) {
      // Silent error
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/veterinarian/vet_profile/', {
        method: 'GET',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) setVetProfile(data.profile);
    } catch (err) {
      // Silent error
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
    }
  }, []);

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/veterinarian/get_all_appointments/', {
        method: 'GET',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) setAppointments(data.appointments || []);
    } catch (err) {
      // Silent error
    } finally {
      setLoading(prev => ({ ...prev, appointments: false }));
    }
  }, []);

  // ---------------- CURRENT SCHEDULE FUNCTIONS ----------------
  const fetchCurrentSchedule = useCallback(async () => {
    setLoadingSchedule(true);
    try {
      const response = await fetch('http://localhost:8000/api/veterinarian/get_schedules/', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentSchedule(data.schedules || []);
      } else {
        setCurrentSchedule([]);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setCurrentSchedule([]);
    } finally {
      setLoadingSchedule(false);
    }
  }, []);

  const refreshDashboardData = useCallback(async () => {
    await Promise.all([
      fetchAppointments(),
      fetchNotifications(),
      fetchServices(),
      fetchCurrentSchedule()
    ]);
  }, [fetchAppointments, fetchNotifications, fetchServices, fetchCurrentSchedule]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshDashboardData();
    setRefreshing(false);
  };

  const calculateTimeUntilAppointment = (appointment) => {
    const now = new Date();
    
    const [timePart, period] = appointment.app_time.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    const appointmentDate = new Date(appointment.app_date);
    const appointmentDateTime = new Date(
      appointmentDate.getFullYear(),
      appointmentDate.getMonth(),
      appointmentDate.getDate(),
      hours,
      minutes || 0
    );
    
    const timeDiff = appointmentDateTime - now;
    
    if (timeDiff <= 0) {
      return "Now";
    }
    
    const minutesUntil = Math.floor(timeDiff / (1000 * 60));
    const hoursUntil = Math.floor(minutesUntil / 60);
    const daysUntil = Math.floor(hoursUntil / 24);
    
    if (daysUntil > 0) {
      return `${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;
    } else if (hoursUntil > 0) {
      return `${hoursUntil} hr${hoursUntil !== 1 ? 's' : ''} ${minutesUntil % 60} min`;
    } else {
      return `${minutesUntil} min`;
    }
  };

  const getProfileDisplay = () => {
    if (!vetProfile) {
      return {
        type: 'initials',
        content: ''
      };
    }

    if (vetProfile.vet_profile_photo && 
        vetProfile.vet_profile_photo.trim() !== '' && 
        !vetProfile.vet_profile_photo.includes('default') &&
        vetProfile.vet_profile_photo.startsWith('http')) {
      return {
        type: 'photo',
        content: vetProfile.vet_profile_photo
      };
    }

    const firstInitial = vetProfile.vet_fname?.[0] || '';
    const lastInitial = vetProfile.vet_lname?.[0] || '';
    return {
      type: 'initials',
      content: (firstInitial + lastInitial).toUpperCase() || 'V'
    };
  };

  const handleScheduleModalClose = () => {
    setIsScheduleModalOpen(false);
    setTimeout(() => {
      refreshDashboardData();
    }, 1000);
  };

  const handleScheduleAdded = (newSchedules) => {
    refreshDashboardData();
  };

  const handleNotificationModalClose = () => {
    setIsNotificationModalOpen(false);
    fetchNotifications();
  };

  useEffect(() => {
    fetchProfile();
    fetchAppointments();
    fetchNotifications();
    fetchServices();
    fetchCurrentSchedule();
  }, [fetchProfile, fetchAppointments, fetchNotifications, fetchServices, fetchCurrentSchedule]);

  const today = new Date();
  const approvedTodayAppointments = appointments.filter(app => {
    const appDate = new Date(app.app_date);
    return app.app_status === "approved" &&
           appDate.getDate() === today.getDate() &&
           appDate.getMonth() === today.getMonth() &&
           appDate.getFullYear() === today.getFullYear();
  });

  // ---------------- DELETE CONFIRMATION MODAL ----------------
  const DeleteConfirmationModal = () => {
    if (!deleteModal.isOpen) return null;

    return (
      <div className="fixed inset-0 backdrop-blur-md bg-transparent flex items-center justify-center z-[1000] p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full transform transition-all">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Delete Service</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <p className="text-gray-700 mb-2">
              Are you sure you want to delete the service:
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-red-800 text-lg">
                {deleteModal.service?.service_name}
              </h4>
              {deleteModal.service?.description && (
                <p className="text-red-700 text-sm mt-1">
                  {deleteModal.service.description}
                </p>
              )}
            </div>
            <p className="text-sm text-gray-500">
              This service will be permanently removed from your list and cannot be recovered.
            </p>
          </div>

          <div className="p-6 border-t border-gray-100 flex justify-end space-x-3">
            <button
              onClick={closeDeleteModal}
              disabled={deleteModal.deleting}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteService}
              disabled={deleteModal.deleting}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {deleteModal.deleting ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>{deleteModal.deleting ? 'Deleting...' : 'Delete Service'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Format schedule for display
  const formatScheduleDisplay = (schedules) => {
    if (!schedules || schedules.length === 0) {
      return "No schedule set";
    }

    // Group by days and find common time slots
    const days = schedules.map(s => s.day_of_week);
    const uniqueDays = [...new Set(days)];
    
    // Check if all schedules have the same time
    const firstSchedule = schedules[0];
    const allSameTime = schedules.every(schedule => 
      schedule.startTime === firstSchedule.startTime && 
      schedule.endTime === firstSchedule.endTime
    );

    if (allSameTime && uniqueDays.length > 1) {
      const dayRange = formatDayRange(uniqueDays);
      return `${dayRange} ${firstSchedule.startTime} - ${firstSchedule.endTime}`;
    } else {
      // Multiple different time slots - show simplified version
      return `${uniqueDays.length} day(s) with varying times`;
    }
  };

  // Format day range (e.g., "Monday-Friday")
  const formatDayRange = (days) => {
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const sortedDays = days.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
    
    if (sortedDays.length === 1) {
      return sortedDays[0];
    }
    
    // Check if consecutive weekdays
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const isConsecutiveWeekdays = sortedDays.every(day => weekdays.includes(day)) &&
      sortedDays.length === weekdays.indexOf(sortedDays[sortedDays.length - 1]) - weekdays.indexOf(sortedDays[0]) + 1;
    
    if (isConsecutiveWeekdays && sortedDays.length > 1) {
      if (sortedDays.length === 5) return 'Monday-Friday';
      return `${sortedDays[0]}-${sortedDays[sortedDays.length - 1]}`;
    }
    
    return sortedDays.join(', ');
  };

  // Render schedule details
const renderScheduleDetails = (schedules) => {
  if (!schedules || schedules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <Calendar className="w-12 h-12 mb-2" />
        <p>No schedule set</p>
        <p className="text-sm mt-2">Set your schedule to start receiving appointments</p>
      </div>
    );
  }

  // Group schedules by time slots
  const scheduleGroups = {};
  schedules.forEach(schedule => {
    const timeKey = `${schedule.startTime} - ${schedule.endTime}`;
    if (!scheduleGroups[timeKey]) {
      scheduleGroups[timeKey] = [];
    }
    scheduleGroups[timeKey].push(schedule.day_of_week);
  });

return (
  <div className="flex flex-col items-center justify-center h-full space-y-8">
    {Object.entries(scheduleGroups).map(([timeSlot, days], index) => (
      <div key={index} className="text-center">
        <div className="text-3xl text-gray-800 font-medium mb-3">
          {formatDayRange(days)}
        </div>
        <div className="text-xl text-blue-600 font-normal">
          {timeSlot}
        </div>
        <div className="text-sm text-gray-500 mt-2">
          {days.length} day{days.length !== 1 ? 's' : ''} • {schedules[0]?.slot_duration === 60 ? '1 hour' : 
            schedules[0]?.slot_duration === 90 ? '1.5 hours' : '2 hours'} slots
        </div>
      </div>
    ))}
  </div>
);
};

const profileDisplay = getProfileDisplay();

  // ---------------- SERVICES CONTENT ----------------
  const ServicesContent = () => {
    if (loading.services) {
      return (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 min-h-[500px] flex flex-col animate-pulse">
          <div className="p-6 border-b border-gray-100">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="p-4 bg-gray-100 rounded-xl space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">My Services</h2>
                <p className="text-sm text-gray-500">
                  {services.length} service{services.length !== 1 ? 's' : ''} added
                </p>
              </div>
              <button 
                onClick={() => setShowCustomInput(!showCustomInput)}
                className="cursor-pointer flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Add Custom Service</span>
              </button>
            </div>
          </div>

          {showCustomInput && (
            <CustomServiceForm 
              onSave={handleCreateCustomService}
              onCancel={() => setShowCustomInput(false)}
              isSaving={savingService}
            />
          )}

          <div className="p-6">
            {services.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <ClipboardList className="w-12 h-12 mb-2" />
                <p>No services yet</p>
                <p className="text-sm mt-2">Add services from the list below or create your own</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((service) => (
                  <div key={service.service_id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold text-gray-800">{service.service_name}</h3>
                      <button
                        onClick={() => openDeleteModal(service)}
                        className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                        title="Delete service"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {service.description && (
                      <p className="text-gray-600 text-sm mb-3">{service.description}</p>
                    )}
                    
                    <div className="text-xs text-gray-500">
                      Added: {new Date(service.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800">Available Services</h2>
            <p className="text-sm text-gray-500">
              Click to add services to your list
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {predefinedServices.map((service, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAddService(service)}
                  disabled={savingService || isServiceAdded(service.name)}
                  className={`text-left p-4 rounded-lg border transition-all ${
                    isServiceAdded(service.name)
                      ? 'bg-green-50 border-green-200 cursor-not-allowed'
                      : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
                  } ${savingService ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-800 text-sm">{service.name}</h3>
                    {isServiceAdded(service.name) ? (
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    ) : (
                      <Plus className="w-4 h-4 text-blue-600 flex-shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-gray-600 text-xs">{service.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ---------------- OVERVIEW CONTENT ----------------
  const OverviewContent = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { 
            title: "Total Appointments", 
            icon: Calendar, 
            count: appointments.filter(app => app.app_status === "approved").length, 
            color: "blue" 
          },
          { 
            title: "Pending Appointments", 
            icon: FileText, 
            count: appointments.filter(app => app.app_status === "pending").length, 
            color: "yellow" 
          },
          { 
            title: "Today's Appointments", 
            icon: Clock, 
            count: approvedTodayAppointments.length, 
            color: "green" 
          }
        ].map((item, index) => (
          <div key={index} className={`bg-white/80 backdrop-blur-md rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-6 border border-gray-100 flex flex-col items-center`}>
            <div className={`w-12 h-12 ${
              item.color === 'blue' ? 'bg-blue-100' :
              item.color === 'yellow' ? 'bg-yellow-100' :
              'bg-green-100'
            } rounded-full flex items-center justify-center mb-3`}>
              <item.icon className={`w-6 h-6 ${
                item.color === 'blue' ? 'text-blue-600' :
                item.color === 'yellow' ? 'text-yellow-600' :
                'text-green-600'
              }`} />
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-1 text-center">{item.title}</h3>
            <p className="text-3xl font-bold text-gray-800 text-center">{item.count}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 h-[500px] flex flex-col">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Today's Appointments</h2>
              <p className="text-sm text-gray-500">
                You have {approvedTodayAppointments.length} approved appointment(s) today
              </p>
            </div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>

          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {approvedTodayAppointments.length > 0 ? (
              approvedTodayAppointments.map(app => {
                const timeUntil = calculateTimeUntilAppointment(app);
                
                return (
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
                      <div className={`text-xs font-medium mt-2 ${
                        timeUntil === "Now" ? "text-red-600" : "text-green-600"
                      }`}>
                        {timeUntil === "Now" ? "In progress" : `${timeUntil} to go`}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Calendar className="w-12 h-12 mb-2" />
                <p>No appointments scheduled for today</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 h-[500px] flex flex-col">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">My Schedule</h2>

            </div>
            <button 
              onClick={() => setIsScheduleModalOpen(true)}
              className="cursor-pointer flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Calendar className="w-4 h-4" />
              <span>{currentSchedule && currentSchedule.length > 0 ? 'Manage Schedule' : 'Set Schedule'}</span>
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {loadingSchedule ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                <p className="text-gray-500">Loading schedule...</p>
              </div>
            ) : (
              renderScheduleDetails(currentSchedule)
            )}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <div className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">Dashboard</h1>
            
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'overview'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('services')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'services'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                My Services
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleRefresh}
              disabled={refreshing}
              className="cursor-pointer p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            
            <button 
              onClick={() => setIsNotificationModalOpen(!isNotificationModalOpen)} 
              className="cursor-pointer p-2 hover:bg-gray-100 rounded-xl relative"
            >
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full min-w-5 h-5 flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>

            <button onClick={() => setIsProfileModalOpen(true)}>
              <div className="cursor-pointer w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md overflow-hidden">
                {profileDisplay.type === 'photo' ? (
                  <img 
                    src={profileDisplay.content} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-white font-semibold text-sm">
                    {profileDisplay.content}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-auto">
          {activeTab === 'overview' ? <OverviewContent /> : <ServicesContent />}
        </div>
      </div>
      
      <ScheduleModal 
        isOpen={isScheduleModalOpen} 
        onClose={handleScheduleModalClose} 
        onScheduleAdded={handleScheduleAdded}
      />
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      <NotificationModal 
        isOpen={isNotificationModalOpen} 
        onClose={handleNotificationModalClose} 
        notifications={notifications}
      />
      <DeleteConfirmationModal />
      <FloatingMessages />
    </div>
  );
};

export default VetDashboard;