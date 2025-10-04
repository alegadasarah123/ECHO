import React, { useState, useEffect } from 'react';
import {
  Calendar, Search, Bell, Eye, Grid, Clock, CheckCircle, 
  AlertCircle, Calendar as CalendarIcon, Filter, X, RefreshCw,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useNavigate } from "react-router-dom";
import Sidebar from '@/components/VetSidebar';
import FloatingMessages from '@/components/modal/floatingMessages';
import ProfileModal from '@/components/modal/profileModal';
import NotificationModal from '@/components/modal/notificationModal';

const VetAppointmentRequest = () => {
  const [appointments, setAppointments] = useState([]);
  const [vetProfile, setVetProfile] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFocus, setSearchFocus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const navigate = useNavigate();

  useEffect(() => {
    fetchAppointments();
    fetchVetProfile();
  }, []);

  // Reset to first page when filters or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm]);

const fetchAppointments = async () => {
  setLoading(true);
  setIsRefreshing(true);
  try {
    const response = await fetch(
      "http://localhost:8000/api/veterinarian/get_approved_appointments/",
      {
        method: "GET",
        credentials: "include",
      }
    );
    const data = await response.json();

    if (data.appointments && data.appointments.length > 0) {
      const mappedAppointments = data.appointments.map((app) => ({
        id: app.app_id,
        petName: app.horse_name,
        ownerName: app.operator_name,
        ownerPhone: app.operator_phone,
        date: app.app_date,
        time: app.app_time,
        type: app.app_service,
        notes: app.app_note,
        horseId: app.horse_id || null,
        operatorId: app.operator_id || null,
        status: getAppointmentStatus(app.app_date).status,
      }));
      setAppointments(mappedAppointments);
    } else {
      setAppointments([]);
    }
  } catch (err) {
    console.error("Failed to fetch appointments:", err);
    setAppointments([]);
  } finally {
    setLoading(false);
    setIsRefreshing(false);
  }
};

  const fetchVetProfile = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/veterinarian/vet_profile/", {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch profile");
      const data = await response.json();
      setVetProfile(data.profile);
    } catch (err) {
      console.error(err);
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

    // Fallback to initials
    const firstInitial = vetProfile.vet_fname?.[0] || '';
    const lastInitial = vetProfile.vet_lname?.[0] || '';
    return {
      type: 'initials',
      content: (firstInitial + lastInitial).toUpperCase() || 'V'
    };
  };

  const handleRefresh = () => {
    fetchAppointments();
  };

  // Function to determine status based on date
  const getAppointmentStatus = (dateString) => {
    const today = new Date();
    const appointmentDate = new Date(dateString);
    
    today.setHours(0, 0, 0, 0);
    appointmentDate.setHours(0, 0, 0, 0);
    
    const diffTime = appointmentDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return { status: "Today", color: "bg-blue-100 text-blue-800" };
    if (diffDays === 1) return { status: "Tomorrow", color: "bg-purple-100 text-purple-800" };
    if (diffDays < 0) return { status: "Completed", color: "bg-green-100 text-green-800" };
    if (diffDays > 1 && diffDays <= 7) return { status: "This Week", color: "bg-amber-100 text-amber-800" };
    return { status: "Upcoming", color: "bg-gray-100 text-gray-800" };
  };

  const handleViewAppointment = (appointment) => {
    navigate(`/VetAppointmentDetails/${appointment.id}`, {
      state: {
        appointmentId: appointment.id,
        horseId: appointment.horseId,
        operatorId: appointment.operatorId
      }
    });
  };

  const handleViewSchedule = () => {
    navigate("/VetScheduleCalendar");
  };

  // Filter logic for search and status
  const filteredAppointments = appointments.filter((appointment) => {
    const matchesSearch = appointment.petName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          appointment.ownerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || appointment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
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

  // Status filter options
  const statusOptions = [
    { value: "all", label: "All Appointments" },
    { value: "Today", label: "Today" },
    { value: "Tomorrow", label: "Tomorrow" },
    { value: "This Week", label: "This Week" },
    { value: "Upcoming", label: "Upcoming" },
    { value: "Completed", label: "Completed" }
  ];

  // Skeleton loading component
  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-4 py-4">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
      </td>
      <td className="px-4 py-4">
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </td>
      <td className="px-4 py-4">
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </td>
      <td className="px-4 py-4">
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </td>
      <td className="px-4 py-4">
        <div className="h-6 w-20 bg-gray-200 rounded"></div>
      </td>
      <td className="px-4 py-4">
        <div className="h-8 w-8 bg-gray-200 rounded mx-auto"></div>
      </td>
    </tr>
  );

  const profileDisplay = getProfileDisplay();

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Upcoming Appointments</h1>
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
                className="cursor-pointer p-2 hover:bg-gray-100 rounded-xl relative transition-all"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>
              <button 
                onClick={() => setIsProfileModalOpen(true)}
                className="transition-transform hover:scale-105"
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

        {/* Search, Filter and Schedule Button Container */}
        <div className="flex flex-col gap-4 mx-6 my-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
            {/* Schedule Button aligned to the right */}
            <button 
              onClick={handleViewSchedule}
              className="cursor-pointer flex items-center bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg transition-all shadow-md hover:shadow-lg w-full sm:w-auto justify-center"
            >
              <Grid className="w-5 h-5 mr-2" />
              Schedule View
            </button>
          </div>

          {/* Filter Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center">
              <Filter className="w-5 h-5 text-gray-500 mr-2" />
              <span className="text-sm font-medium text-gray-700">Filter by status:</span>
            </div>
            
            {/* Mobile filter dropdown */}
            <div className="sm:hidden w-full">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Desktop filter buttons */}
            <div className="hidden sm:flex flex-wrap gap-2">
              {statusOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setStatusFilter(option.value)}
                  className={`cursor-pointer px-3 py-1.5 text-sm rounded-full transition-colors ${
                    statusFilter === option.value
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            
            {/* Clear filter button (show only when a filter is active) */}
            {statusFilter !== "all" && (
              <button
                onClick={() => setStatusFilter("all")}
                className="cursor-pointer flex items-center text-sm text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4 mr-1" />
                Clear filter
              </button>
            )}
          </div>
        </div>

        {/* Table with Pagination */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-auto">
              <table className="min-w-full  divide-gray-200">
                <thead className="bg-gray-50 ">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Horse</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-gray-200">
                  {loading ? (
                    // Show skeleton loading when data is being fetched
                    Array.from({ length: 5 }).map((_, index) => (
                      <SkeletonRow key={index} />
                    ))
                  ) : filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        <CalendarIcon className="w-12 h-12 text-gray-400 mb-3 mx-auto" />
                        <p className="text-lg font-medium">No matching appointments found</p>
                        <p className="text-sm mt-1">
                          {statusFilter !== "all" 
                            ? `Try changing your filter or search terms` 
                            : `Try adjusting your search terms`}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((appointment) => {
                      const statusInfo = getAppointmentStatus(appointment.date);
                      return (
                        <tr key={appointment.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-4 text-center">
                            <div className="flex flex-col">
                              <div>
                                <div className="font-medium text-gray-900">{appointment.date}</div>
                                <div className="text-gray-500 text-sm mt-1 flex items-center justify-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {appointment.time}
                                </div>
                              </div>
                            </div>
                          </td>                      
                          <td className="px-4 py-4 text-center">
                            <div className="text-medium text-gray-900">{appointment.ownerName}</div>
                          </td>
                          <td className="px-4 py-4 text-medium text-gray-900 text-center">
                            {appointment.petName}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-700 text-center">
                            {appointment.type}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                              {statusInfo.status === "Today" && <AlertCircle className="w-3 h-3 mr-1" />}
                              {statusInfo.status === "Completed" && <CheckCircle className="w-3 h-3 mr-1" />}
                              {statusInfo.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex justify-center space-x-2">
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
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls - Attached directly to table */}
            {filteredAppointments.length > 0 && !loading && (
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
                            ? "bg-green-500 text-white border-blue-500"
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

      {/* Profile Modal */}
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      <NotificationModal isOpen={isNotificationModalOpen} onClose={() => setIsNotificationModalOpen(false)} notifications={notifications} />
      <FloatingMessages />
    </div>
  );
};

export default VetAppointmentRequest;