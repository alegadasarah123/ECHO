import React, { useState, useEffect } from 'react';
import {Calendar, FileText, Search, Clock, Bell, Eye, PawPrint, User, Phone, X, AlertTriangle, Tag, Clock10Icon, CheckCircle, XCircle, MessageCircle, ChevronLeft, ChevronRight, RefreshCw} from 'lucide-react';
import Sidebar from '@/components/VetSidebar';
import FloatingMessages from '@/components/modal/floatingMessages';
import ProfileModal from '@/components/modal/profileModal';
import NotificationModal from '@/components/modal/notificationModal';

const API_BASE = "http://localhost:8000/api/veterinarian";

// Alert Component - Compact version
const Alert = ({ message, type = 'success', onClose, duration = 5000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getAlertStyles = () => {
    const baseStyles = "fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] px-4 py-3 rounded-xl shadow-lg border backdrop-blur-sm transition-all duration-300 ease-in-out flex items-center space-x-3 max-w-sm";
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-50 border-green-200 text-green-800`;
      case 'error':
        return `${baseStyles} bg-red-50 border-red-200 text-red-800`;
      case 'warning':
        return `${baseStyles} bg-yellow-50 border-yellow-200 text-yellow-800`;
      case 'info':
        return `${baseStyles} bg-blue-50 border-blue-200 text-blue-800`;
      default:
        return `${baseStyles} bg-gray-50 border-gray-200 text-gray-800`;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />;
      case 'info':
        return <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600 flex-shrink-0" />;
    }
  };

  return (
    <div className={getAlertStyles()}>
      {getIcon()}
      <span className="font-medium text-sm whitespace-nowrap">{message}</span>
      <button
        onClick={onClose}
        className="flex-shrink-0 p-1 hover:bg-black/10 rounded-full transition-colors duration-200 ml-2"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Skeleton Table Row Component
const SkeletonTableRow = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4 text-center">
      <div className="h-4 bg-gray-200 rounded mx-auto w-3/4"></div>
      <div className="h-3 bg-gray-200 rounded mx-auto w-1/2 mt-2"></div>
    </td>
    <td className="px-6 py-4 text-center">
      <div className="h-4 bg-gray-200 rounded mx-auto w-2/3"></div>
    </td>
    <td className="px-6 py-4 text-center">
      <div className="h-4 bg-gray-200 rounded mx-auto w-2/3"></div>
    </td>
    <td className="px-6 py-4 text-center">
      <div className="h-4 bg-gray-200 rounded mx-auto w-2/3"></div>
    </td>
    <td className="px-6 py-4 text-center">
      <div className="h-6 bg-gray-200 rounded-full mx-auto w-20"></div>
    </td>
    <td className="px-6 py-4 text-center">
      <div className="flex justify-center space-x-2">
        <div className="w-16 h-8 bg-gray-200 rounded-lg"></div>
      </div>
    </td>
  </tr>
);

const VetAppointmentRequest = () => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFocus, setSearchFocus] = useState(false);
  const [vetProfile, setVetProfile] = useState(null);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState(""); 
  const [selectedDeclineReason, setSelectedDeclineReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Show alert function
  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type });
  };

  // Hide alert function
  const hideAlert = () => {
    setAlert(prev => ({ ...prev, show: false }));
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    const fetchVetProfile = async () => {
      try {
        const response = await fetch(`${API_BASE}/vet_profile/`, {
          method: 'GET',
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to fetch profile');
        const data = await response.json();
        setVetProfile(data.profile);
      } catch (err) {
        console.error(err);
      }
    };

    fetchVetProfile();
  }, []);

  // Reset to first page when filters or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFilter, searchTerm]);

  const fetchAppointments = async () => {
    setIsLoading(true);
    setIsRefreshing(true);
    try {
      const response = await fetch(`${API_BASE}/get_all_appointments/`, {
        method: 'GET',
        credentials: 'include'
      });
      const data = await response.json();
      console.log("Fetched data:", data);

      if (data.appointments) {
        const mappedAppointments = data.appointments.map(app => ({
          id: app.app_id,
          petName: app.horse_name,
          petBreed: app.horse_breed,
          petAge: app.horse_age,
          ownerPhone: app.operator_phone,
          ownerName: app.operator_name,
          date: app.app_date,
          time: app.app_time,
          type: app.app_service,
          status: app.app_status,
          complain: app.app_complain,
          declineReason: app.decline_reason || "",
          // Add profile image from API response
          profileImage: app.operator_profile_image || "",
          operatorFirstName: app.operator_first_name || "",
          operatorLastName: app.operator_last_name || "",
        }));

        // ✅ Sort by date + time (ascending)
        const sortedAppointments = mappedAppointments.sort((a, b) => {
          const dateTimeA = new Date(`${a.date} ${a.time}`);
          const dateTimeB = new Date(`${b.date} ${b.time}`);
          return dateTimeA - dateTimeB;
        });

        console.log("Sorted appointments:", sortedAppointments);
        setAppointments(sortedAppointments);
      }
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
      showAlert('Failed to fetch appointments', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Helper function to get user initials (FIRST NAME + LAST NAME only)
  const getUserInitials = (appointment) => {
    if (!appointment) return 'U';
    
    // Use operator first and last name if available (IGNORE MIDDLE NAME)
    if (appointment.operatorFirstName && appointment.operatorLastName) {
      const firstInitial = appointment.operatorFirstName[0] || '';
      const lastInitial = appointment.operatorLastName[0] || '';
      return (firstInitial + lastInitial).toUpperCase();
    }
    
    // Fallback: Extract from ownerName but only take first and last words
    const nameParts = appointment.ownerName?.split(' ') || [];
    if (nameParts.length >= 2) {
      // Take first word as first name, last word as last name
      const firstInitial = nameParts[0]?.[0] || '';
      const lastInitial = nameParts[nameParts.length - 1]?.[0] || '';
      return (firstInitial + lastInitial).toUpperCase();
    } else if (nameParts.length === 1) {
      // Only one name available
      return nameParts[0]?.[0]?.toUpperCase() || 'U';
    }
    
    return 'U';
  };

  // Helper function to get user profile display
  const getUserProfileDisplay = (appointment) => {
    if (!appointment) {
      return {
        type: 'initials',
        content: 'U'
      };
    }

    // Check if there's a valid profile photo
    const profileImage = appointment.profileImage;
    if (profileImage && 
        profileImage.trim() !== '' && 
        !profileImage.includes('default') &&
        (profileImage.startsWith('http') || profileImage.startsWith('/'))) {
      return {
        type: 'photo',
        content: profileImage
      };
    }

    // Fallback to initials (FIRST NAME + LAST NAME only)
    return {
      type: 'initials',
      content: getUserInitials(appointment)
    };
  };

  const handleRefresh = () => {
    fetchAppointments();
  };

  const handleDeclineWithReason = async (appointmentId, reason) => {
    try {
      const response = await fetch(`${API_BASE}/decline_appointment/${appointmentId}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });
      const data = await response.json();
      if (response.ok) {
        showAlert("Appointment declined", 'success');
        // Close both modals
        setIsDeclineModalOpen(false);
        setIsDetailsModalOpen(false);
        setSelectedAppointment(null);
        setDeclineReason("");
        setSelectedDeclineReason("");
        // Refresh appointments if needed
        fetchAppointments();
      } else {
        showAlert(data.error || "Failed to decline appointment", 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert("Something went wrong", 'error');
    }
  };

  const handleApproveAppointment = async (appointmentId) => {
    try {
      const response = await fetch(`${API_BASE}/approve_appointment/${appointmentId}/`, {
        method: 'PUT',
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) {
        showAlert("Appointment approved", 'success');
        setIsDetailsModalOpen(false);
        setSelectedAppointment(null);
        fetchAppointments();
      } else {
        showAlert(data.error || "Failed to approve appointment", 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert("Something went wrong", 'error');
    }
  };

  const handleViewAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setIsDetailsModalOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'cancelled':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'; 
      case 'pending':
        return 'bg-orange-100 text-orange-700 border-orange-200'; 
      case 'declined':
        return 'bg-red-100 text-red-700 border-red-200'; 
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'; 
    }
  };

  // ---------------- GET PROFILE DISPLAY ----------------
  const getProfileDisplay = () => {
    if (!vetProfile) {
      return {
        type: 'initials',
        content: ''
      };
    }

    // Check if there's a valid profile photo
    if (vetProfile.vet_profile_photo && 
        vetProfile.vet_profile_photo.trim() !== '' && 
        !vetProfile.vet_profile_photo.includes('default') &&
        vetProfile.vet_profile_photo.startsWith('http')) {
      return {
        type: 'photo',
        content: vetProfile.vet_profile_photo
      };
    }

    // Fallback to initials (FIRST NAME + LAST NAME only)
    const firstInitial = vetProfile.vet_fname?.[0] || '';
    const lastInitial = vetProfile.vet_lname?.[0] || '';
    return {
      type: 'initials',
      content: (firstInitial + lastInitial).toUpperCase() || 'V'
    };
  };

  const filteredAppointments = appointments
    .filter(appointment => appointment.status !== "deleted" && appointment.status !== "approved") 
    .filter(appointment => {
      // First, filter by status filter
      if (selectedFilter === 'all') return true;
      if (selectedFilter === 'pending') return appointment.status === 'pending';
      if (selectedFilter === 'declined') return appointment.status === 'declined';
      if (selectedFilter === 'cancelled') return appointment.status === 'cancelled';
      return appointment.status === selectedFilter;
    })
    .filter(appointment => {
      // Then filter by search term (horse name or owner name)
      const term = searchTerm.toLowerCase();
      return (
        appointment.petName.toLowerCase().includes(term) ||
        appointment.ownerName.toLowerCase().includes(term)
      );
    });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAppointments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Generate page numbers for pagination
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  const filterOptions = [
    { key: 'all', label: 'All Requests', count: appointments.filter(a => a.status !== 'confirmed' && a.status !== 'approved').length },
    { key: 'pending', label: 'Pending Approval', count: appointments.filter(a => a.status === 'pending').length },
    { key: 'declined', label: 'Declined', count: appointments.filter(a => a.status === 'declined').length },
    { key: 'cancelled', label: 'Cancelled', count: appointments.filter(a => a.status === 'cancelled').length },
  ];

  const profileDisplay = getProfileDisplay();

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Alert Component */}
      {alert.show && (
        <Alert 
          message={alert.message} 
          type={alert.type} 
          onClose={hideAlert}
          duration={5000}
        />
      )}
      
      <Sidebar/>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-1">Appointment Requests</h1>
            </div>

            <div className="flex items-center space-x-4">
              <button 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="cursor-pointer p-2 hover:bg-gray-100 rounded-xl transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button 
                onClick={() => setIsNotificationModalOpen(!isNotificationModalOpen)} 
                className="cursor-pointer p-2 hover:bg-gray-100 rounded-xl relative"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>            
              <button
                onClick={() => setIsProfileModalOpen(true)}
              >
                <div className="cursor-pointer w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md overflow-hidden">
                  {profileDisplay.type === 'photo' ? (
                    <img 
                      src={profileDisplay.content} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // If image fails to load, fall back to initials
                        console.error('Profile image failed to load:', profileDisplay.content);
                        e.target.style.display = 'none';
                        // The initials will show as fallback due to the gradient background
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
        </div>

        {/* Appointments Content */}
        <div className="flex-1 p-6 overflow-auto">
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            {/* Search */}
            <div
              className={`relative w-[350px] max-w-full flex items-center bg-white rounded-xl shadow-md overflow-hidden transition-transform duration-200 ${
                searchFocus ? "scale-105 shadow-xl" : "shadow"
              }`}
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-all duration-200" />
              <input
                type="text"
                placeholder="Search horse name or owner name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setSearchFocus(true)}
                onBlur={() => setSearchFocus(false)}
                className="w-full pl-12 pr-4 py-3 border-none outline-none text-sm text-gray-900 bg-transparent placeholder-gray-400"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center justify-between md:justify-end flex-1 space-x-4">
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-md rounded-xl p-1 border border-gray-200">
                {filterOptions.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setSelectedFilter(option.key)}
                    className={`cursor-pointer px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center space-x-2 ${
                      selectedFilter === option.key
                        ? "bg-green-500 text-white shadow-md"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <span>{option.label}</span>
                    <span
                      className={`cursor-pointer px-2 py-1 rounded-full text-xs ${
                        selectedFilter === option.key
                          ? "bg-white/20 text-white"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {option.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        

          {/* Appointments Table with Pagination Attached */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-auto">
              <table className="min-w-full border-collapse">              
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Owner Name</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Horse Name</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Appointment Type</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    // Show skeleton rows when loading
                    Array.from({ length: 5 }).map((_, index) => (
                      <SkeletonTableRow key={index} />
                    ))
                  ) : filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center">
                          {/* Small Icon */}
                          <Calendar className="w-12 h-12 text-gray-400 mb-3" />
                          
                          {/* Message */}
                          <p className="text-lg font-medium text-gray-700">No appointment requests found</p>
                          <p className="text-sm text-gray-500">New requests will appear here when clients book appointments.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((appointment) => (
                      <tr key={appointment.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                        <td className="px-6 py-4 text-base text-gray-700 text-center">
                          <div className="font-medium text-gray-600">{appointment.date}</div>
                          <div className="text-gray-500 text-sm mt-1">{appointment.time}</div>
                        </td>                      
                        <td className="px-6 py-4 text-base text-gray-700 text-center">{appointment.ownerName}</td>
                        <td className="px-6 py-4 text-base text-gray-900 text-center">{appointment.petName}</td>
                        <td className="px-6 py-4 text-base text-gray-700 text-center">{appointment.type}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                            {appointment.status === 'pending' ? 'Needs Approval' : appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center items-center space-x-2 w-full">
                            {/* View button always visible */}
                              <button 
                                onClick={() => handleViewAppointment(appointment)}
                                className="cursor-pointer flex items-center text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 px-3 py-2 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls - Attached directly to table */}
            {filteredAppointments.length > 0 && !isLoading && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="text-sm text-gray-600 mb-4 sm:mb-0">
                  Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                  <span className="font-medium">
                    {indexOfLastItem > filteredAppointments.length 
                      ? filteredAppointments.length 
                      : indexOfLastItem}
                  </span> of{" "}
                  <span className="font-medium">{filteredAppointments.length}</span> results
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Items per page selector */}
                  <div className="flex items-center mr-4">
                    <span className="text-sm text-gray-600 mr-2">Show:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>
                  </div>

                  {/* Previous button */}
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-md border ${
                      currentPage === 1
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Page numbers */}
                  <div className="flex space-x-1">
                    {pageNumbers.map((number) => (
                      <button
                        key={number}
                        onClick={() => paginate(number)}
                        className={`w-8 h-8 flex items-center justify-center rounded-md border text-sm ${
                          currentPage === number
                            ? "bg-green-500 text-white border-green-500"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {number}
                      </button>
                    ))}
                  </div>

                  {/* Next button */}
                  <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-md border ${
                      currentPage === totalPages
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Appointment Details Modal - Clean & Professional Design */}
      {isDetailsModalOpen && (
        <div className="fixed inset-0 z-1000 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden rounded-2xl border border-gray-200/50 flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 text-gray-800 p-6 sticky top-0 z-10 border-b border-gray-200/60">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center shadow-sm border border-gray-200 overflow-hidden">
                    {(() => {
                      const userDisplay = getUserProfileDisplay(selectedAppointment);
                      return userDisplay.type === 'photo' ? (
                        <img 
                          src={userDisplay.content} 
                          alt={`${selectedAppointment?.ownerName || 'User'} profile`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('User profile image failed to load:', userDisplay.content);
                            e.target.style.display = 'none';
                            const initialsElement = e.target.parentElement;
                            if (initialsElement) {
                              const initials = getUserInitials(selectedAppointment);
                              initialsElement.innerHTML = `<div class="w-full h-full rounded-full flex items-center justify-center text-white font-semibold text-lg" style="background-color: #D2691E">${initials}</div>`;
                            }
                          }}
                        />
                      ) : (
                        <div 
                          className="w-full h-full rounded-full flex items-center justify-center text-white font-semibold text-lg"
                          style={{ backgroundColor: '#D2691E' }}
                        >
                          {userDisplay.content}
                        </div>
                      );
                    })()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{selectedAppointment?.ownerName || "Owner Name"}</h2>
                    <p className="text-gray-600 text-sm mt-1">Horse Owner</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Status Badge in Header */}
                  <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(selectedAppointment.status)} flex items-center gap-1`}>
                    {selectedAppointment.status === 'pending' ? (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        Needs Approval
                      </>
                    ) : selectedAppointment.status === 'declined' ? (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        Declined
                      </>
                    ) : selectedAppointment.status === 'cancelled' ? (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        Cancelled
                      </>
                    ) : (
                      selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)
                    )}
                  </span>

                  <button 
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      setSelectedAppointment(null);
                    }}
                    className="cursor-pointer p-2 hover:bg-white rounded-full transition-all duration-200 hover:scale-110"
                  >
                    <X className="w-5 h-5 text-gray-500 hover:text-red-500" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              {selectedAppointment && (
                <div className="p-6 space-y-6">
                  {/* Combined Information Grid - Clean Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Appointment & Horse Information Combined */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        Appointment Details
                      </h3>
                      
                      <div className="bg-gray-50 rounded-xl p-4 space-y-4 border border-gray-200">
                        {/* Date & Time */}
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-500">Date & Time</p>
                            <p className="font-medium text-gray-800">{selectedAppointment.date} at {selectedAppointment.time}</p>
                          </div>
                        </div>

                        {/* Appointment Type */}
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-500">Service Type</p>
                            <p className="font-medium text-gray-800">{selectedAppointment.type}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        Horse Information
                      </h3>
                      
                      <div className="bg-gray-50 rounded-xl p-4 space-y-4 border border-gray-200">
                        {/* Horse Name */}
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-500">Horse Name</p>
                            <p className="font-medium text-gray-800">{selectedAppointment.petName}</p>
                          </div>
                        </div>

                        {/* Breed & Age */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Breed</p>
                            <p className="font-medium text-gray-800">{selectedAppointment.petBreed}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Age</p>
                            <p className="font-medium text-gray-800">{selectedAppointment.petAge}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chief Complaint */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      Chief Complaint
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <p className="text-gray-700 leading-relaxed">{selectedAppointment.complain}</p>
                    </div>
                  </div>
                  
                  {/* Decline Reason */}
                  {selectedAppointment.status === 'declined' && selectedAppointment.declineReason && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        Reason for Decline
                      </h3>
                      <div className="bg-red-50 text-red-800 rounded-xl p-4 border border-red-200">
                        <p className="leading-relaxed">{selectedAppointment.declineReason}</p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {selectedAppointment.status === 'pending' && (
                    <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                      <button
                        onClick={() => setIsDeclineModalOpen(true)}
                        className="cursor-pointer px-6 py-3 bg-white border border-red-300 text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2 font-medium"
                      >
                        <XCircle className="w-4 h-4" />
                        Decline
                      </button>
                      <button 
                        onClick={() => handleApproveAppointment(selectedAppointment.id)}
                        className="cursor-pointer px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors flex items-center gap-2 font-medium shadow-md hover:shadow-lg"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve Appointment
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Decline Reason Modal*/}
      {isDeclineModalOpen && (
        <div className="fixed inset-0 z-1000 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-50 to-rose-50 p-5 border-b border-red-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Reason for Declining</h3>
              </div>
              <p className="text-sm text-gray-600 mt-2 ml-11">Please provide a reason for declining this appointment.</p>
            </div>
            
            {/* Modal Content */}
            <div className="p-5">
              {/* Predefined choices */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select a reason</label>
              <select
                  value={selectedDeclineReason}
                  onChange={(e) => setSelectedDeclineReason(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">-- Select a reason --</option>
                  <option value="Schedule conflict">Schedule conflict</option>
                  <option value="Not my specialty">Not my specialty</option>
                  <option value="Emergency not available">Emergency not available</option>
                  <option value="Fully booked">Fully booked</option>
                  <option value="Other">Other (please specify)</option>
                </select>
              </div>

              {/* Text field for custom reason */}
              {(selectedDeclineReason === "Other" || !selectedDeclineReason) && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {selectedDeclineReason === "Other" ? "Please specify" : "Or provide your own reason"}
                  </label>
                  <textarea
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="Type your reason here..."
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => {
                    setIsDeclineModalOpen(false);
                    setDeclineReason("");
                    setSelectedDeclineReason("");
                  }}
                  className="cursor-pointer px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>

                <button
                  onClick={() => {
                    const reason = selectedDeclineReason === "Other" || !selectedDeclineReason
                      ? declineReason
                      : selectedDeclineReason;
                    
                    if (!reason.trim()) {
                      showAlert("Please provide a reason for declining.", 'warning');
                      return;
                    }
                    
                    handleDeclineWithReason(selectedAppointment.id, reason);
                  }}
                  className="cursor-pointer px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Decline Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
      <NotificationModal isOpen={isNotificationModalOpen} onClose={() => setIsNotificationModalOpen(false)} notifications={notifications} />
      {/* Floating Messages Component */}
      <FloatingMessages />
    </div>
  );
};

export default VetAppointmentRequest;