import React, { useState, useEffect } from 'react';
import {Calendar, FileText, Search, Clock, Bell, Eye, Trash2, PawPrint, User, Phone, X, AlertTriangle, Tag, Clock10Icon} from 'lucide-react';
import Sidebar from '@/components/VetSidebar';
import FloatingMessages from '@/components/modal/floatingMessages';
import ProfileModal from '@/components/modal/profileModal';

const API_BASE = "http://localhost:8000/api/veterinarian";

const VetAppointmentRequest = () => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [deleteAppointment, setDeleteAppointment] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFocus, setSearchFocus] = useState(false);
  const [vetProfile, setVetProfile] = useState(null);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState(""); 
  const [selectedDeclineReason, setSelectedDeclineReason] = useState("");

  const [appointments, setAppointments] = useState([]);

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

const fetchAppointments = async () => {
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
        notes: app.app_note,
        declineReason: app.decline_reason || "",
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
  }
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
        alert("Appointment declined successfully");
        // Close both modals
        setIsDeclineModalOpen(false);
        setIsDetailsModalOpen(false);
        setSelectedAppointment(null);
        setDeclineReason("");
        setSelectedDeclineReason("");
        // Refresh appointments if needed
        fetchAppointments();
      } else {
        alert(data.error || "Failed to decline appointment");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
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
        alert("Appointment approved successfully");
        setIsDetailsModalOpen(false);
        setSelectedAppointment(null);
        fetchAppointments();
      } else {
        alert(data.error || "Failed to approve appointment");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
  };

const confirmDeleteAppointment = async () => {
  if (!deleteAppointment) return;

  try {
    const response = await fetch(`${API_BASE}/delete_appointment/${deleteAppointment.id}/`,
      {
        method: "PUT",
        credentials: "include",
      }
    );

    const contentType = response.headers.get("content-type");
    let data = null;

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
      console.log("JSON response data:", data);
    } else {
      const text = await response.text();
      alert("Server returned an unexpected response. Check console for details.");
      return;
    }

    if (response.ok) {
      alert("Appointment deleted successfully");
      setAppointments(prev => prev.filter(a => a.id !== deleteAppointment.id));
      setIsDeleteModalOpen(false);
      setDeleteAppointment(null);
    } else {
      alert(data.error || "Failed to delete appointment");
    }
  } catch (err) {
    console.error(err);
    alert("Something went wrong");
  }
};

  const handleDeleteAppointment = (appointment) => {
    setDeleteAppointment(appointment);
    setIsDeleteModalOpen(true);
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

  const filterOptions = [
    { key: 'all', label: 'All Requests', count: appointments.filter(a => a.status !== 'confirmed' && a.status !== 'approved').length },
    { key: 'pending', label: 'Pending Approval', count: appointments.filter(a => a.status === 'pending').length },
    { key: 'declined', label: 'Declined', count: appointments.filter(a => a.status === 'declined').length },
    { key: 'cancelled', label: 'Cancelled', count: appointments.filter(a => a.status === 'cancelled').length },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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
            <button className="cursor-pointer p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </button>
            <button
              onClick={() => setIsProfileModalOpen(true)}
            >
              <div className="cursor-pointer w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white font-semibold text-sm">
                  {vetProfile ? `${vetProfile.vet_fname?.[0] || ""}${vetProfile.vet_lname?.[0] || ""}` : ""}
                </span>
              </div>

            </button>
          </div>
        </div>
      </div>

      {/* Appointments Content */}
      <div className="flex-1 p-6 overflow-auto">
        {/* ✅ Search + Filters in same row */}
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
      

          {/* Appointments Table */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 overflow-auto">
              <table className="min-w-full border-collapse">              
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-800 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-800 uppercase tracking-wider">Owner Name</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-800 uppercase tracking-wider">Horse Name</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-800 uppercase tracking-wider">Appointment Type</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-800 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-800 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAppointments.length === 0 ? (
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
                  filteredAppointments.map((appointment) => (
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
                            className="cursor-pointer p-2 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center"
                            title="View"
                          >
                            <Eye className="w-5 h-5 text-gray-400 hover:text-blue-600" />
                          </button>

                          {/* Delete button only for declined or cancelled, if filter is not 'all' */}
                          {selectedFilter !== 'all' && (appointment.status === 'declined' || appointment.status === 'cancelled') && (
                            <button 
                              onClick={() => handleDeleteAppointment(appointment)}
                              className="cursor-pointer p-2 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5 text-gray-400 hover:text-red-600" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    {/* Appointment Details Modal */}
    {isDetailsModalOpen && (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden border border-gray-200/50">

          {/* Modal Header */}
          <div className="bg-white text-gray-800 p-6 sticky top-0 z-10 shadow-sm border-b border-gray-200">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-gray" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{selectedAppointment?.ownerName || "Owner Name"}</h2>
                  <p className="text-gray/80 text-sm">Appointment Details</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* Status Badge in Header */}
                <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(selectedAppointment.status)}`}>
                  {selectedAppointment.status === 'pending' ? 'Needs Approval' :
                  selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                </span>

                <button 
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedAppointment(null);
                  }}
                  className="cursor-pointer p-2 hover:bg-white/20 rounded-full transition-all duration-200 hover:scale-110"
                >
                    <X className="w-6 h-6 text-gray-600 hover:text-red-500" />
                  </button>
              </div>
            </div>
          </div>


          {/* Modal Content - Scrollable */}
          <div className="overflow-y-auto max-h-[calc(85vh-88px)] custom-scrollbar">
              {selectedAppointment && (
              <div className="p-6 space-y-6">

                  {/* Appointment Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">Appointment Info</h3>
                      <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                          <p className="text-sm text-gray-500">Date</p>
                          <p className="font-medium text-gray-800">{selectedAppointment.date}</p>
                      </div>
                      </div>
                      <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <div>
                          <p className="text-sm text-gray-500">Time</p>
                          <p className="font-medium text-gray-800">{selectedAppointment.time}</p>
                      </div>
                      </div>
                      <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                          <p className="text-sm text-gray-500">Appointment Type</p>
                          <p className="font-medium text-gray-800">{selectedAppointment.type}</p>
                      </div>
                      </div>
                  </div>

                  <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">Pet Info</h3>
                      <div className="flex items-center space-x-3">
                      <PawPrint className="w-5 h-5 text-gray-400" />
                      <div>
                          <p className="text-sm text-gray-500">Pet Name</p>
                          <p className="font-medium text-gray-800">{selectedAppointment.petName}</p>
                      </div>
                      </div>
                      <div className="flex items-center space-x-3">
                      <Tag className="w-5 h-5 text-gray-400" />
                      <div>
                          <p className="text-sm text-gray-500">Pet Breed</p>
                          <p className="font-medium text-gray-800">{selectedAppointment.petBreed}</p>
                      </div>
                      </div>
                      <div className="flex items-center space-x-3">
                      <Clock10Icon className="w-5 h-5 text-gray-400" />
                      <div>
                          <p className="text-sm text-gray-500">Pet Age</p>
                          <p className="font-medium text-gray-800">{selectedAppointment.petAge}</p>
                      </div>
                  </div>

                      {selectedAppointment.createdBy === 'client' && selectedAppointment.requestedDate && (
                      <div className="flex items-center space-x-3">
                          <Calendar className="w-5 h-5 text-gray-400" />
                          <div>
                          <p className="text-sm text-gray-500">Request Date</p>
                          <p className="font-medium text-gray-800">{selectedAppointment.requestedDate}</p>
                          </div>
                      </div>
                      )}
                  </div>
                  </div>

                  {/* Notes */}
                  <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Appointment Notes</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700">{selectedAppointment.notes}</p>
                  </div>
                  </div>
                  {/* Decline Reason */}
                  {selectedAppointment.status === 'declined' && selectedAppointment.declineReason && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Reason for Decline</h3>
                      <div className="bg-red-50 text-red-700 rounded-lg p-4 border border-red-200">
                        <p>{selectedAppointment.declineReason}</p>
                      </div>
                    </div>
                  )}

                  {/* ✅ Added Approve / Decline Buttons */}
                  {selectedAppointment.status === 'pending' && (
                  <div className="flex justify-end space-x-3 mt-4">
                      <button 
                      onClick={() => handleApproveAppointment(selectedAppointment.id)}
                      className="cursor-pointer px-4 py-2 bg-green-50 border border-green-200 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                      >
                      Approve
                      </button>
                      <button
                        onClick={() => setIsDeclineModalOpen(true)}
                        className="cursor-pointer px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Decline
                      </button>
                  </div>
                  )}
              </div>
              )}
          </div>
          </div>
      </div>
      )}

          {isDeclineModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200">
            
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Reason for Declining</h3>

            {/* Predefined choices */}
            <select
              value={selectedDeclineReason}
              onChange={(e) => setSelectedDeclineReason(e.target.value)}
              className="w-full mb-4 p-2 border border-gray-300 rounded-lg"
            >
              <option value="">-- Select a reason --</option>
              <option value="Schedule conflict">Schedule conflict</option>
              <option value="Emergency not available">Emergency not available</option>
              <option value="Other">Other</option>
            </select>

            {/* Text field for custom reason */}
            {(selectedDeclineReason === "Other" || !selectedDeclineReason) && (
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Type custom reason here..."
                className="w-full p-2 border border-gray-300 rounded-lg mb-4"
              />
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsDeclineModalOpen(false);
                  setDeclineReason("");
                  setSelectedDeclineReason("");
                }}
                className="cursor-pointer px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  const reason = selectedDeclineReason === "Other" || !selectedDeclineReason
                    ? declineReason
                    : selectedDeclineReason;
                  if (!reason) return alert("Please provide a reason.");
                  handleDeclineWithReason(selectedAppointment.id, reason);
                  setIsDeclineModalOpen(false);
                  setDeclineReason("");
                  setSelectedDeclineReason("");
                }}
                className="cursor-pointer px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Decline
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center space-x-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-semibold">Delete Appointment</h3>
            </div>
            <div className="space-y-4">
              <p className="text-gray-600">Are you sure you want to delete this appointment? This action cannot be undone.</p>
              {deleteAppointment && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-800">
                    {deleteAppointment.petName} - {deleteAppointment.ownerName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {deleteAppointment.date} at {deleteAppointment.time}
                  </p>
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeleteAppointment(null);
                  }}
                  className="cursor-pointer px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteAppointment}
                  className="cursor-pointer px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        {/* Profile Modal */}
      {console.log('ProfileModal isOpen:', isProfileModalOpen)}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
      
         {/* Floating Messages Component */}
      <FloatingMessages />
    </div>
    
  );
};

export default VetAppointmentRequest;
