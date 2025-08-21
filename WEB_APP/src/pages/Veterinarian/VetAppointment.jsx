import React, { useState } from 'react';
import {Calendar,Users,FileText,Search,Menu,Clock,MessageCircle,Bell,Filter,Eye,Trash2,MoreVertical,PawPrint,User,Phone,MapPin,CheckCircle,AlertCircle,RefreshCw,Check,X,Clock3,AlertTriangle
} from 'lucide-react';
import Sidebar from '@/components/VetSidebar';
import FloatingMessages from '@/components/modal/floatingMessages';
import ProfileModal from '@/components/modal/profileModal';

const VetAppointments = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('list');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [deleteAppointment, setDeleteAppointment] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
   const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [appointments, setAppointments] = useState([
    {
      id: 1,
      petName: "Thunder",
      ownerName: "Maria Luna",
      ownerPhone: "(555) 123-4567",
      date: "2025-07-30",
      time: "09:00 AM",
      duration: 30,
      type: "Routine Checkup",
      status: "confirmed",
      vet: "Dr. Maria Santos",
      notes: "Annual wellness exam and vaccination update",
      petBreed: "Golden Retriever",
      petAge: "3 years",
      priority: "normal",
      createdBy: "vet"
    },
    {
      id: 2,
      petName: "Bella",
      ownerName: "John Smith",
      ownerPhone: "(555) 234-5678",
      date: "2025-07-30",
      time: "10:30 AM",
      duration: 45,
      type: "Vaccination",
      status: "in-progress",
      vet: "Dr. Sarah Johnson",
      notes: "Rabies and DHPP vaccination due",
      petBreed: "Labrador Mix",
      petAge: "2 years",
      priority: "normal",
      createdBy: "vet"
    },
    {
      id: 3,
      petName: "Max",
      ownerName: "Sarah Wilson",
      ownerPhone: "(555) 345-6789",
      date: "2025-08-02",
      time: "02:00 PM",
      duration: 60,
      type: "Surgery Consultation",
      status: "pending",
      vet: "Dr. Mike Chen",
      notes: "Pre-operative consultation for spay surgery. Client is requesting this appointment for next week.",
      petBreed: "German Shepherd",
      petAge: "1 year",
      priority: "high",
      createdBy: "client",
      requestedDate: "2025-07-29",
      clientMessage: "My dog needs spay surgery consultation. I'm available afternoons next week."
    },
    {
      id: 4,
      petName: "Luna",
      ownerName: "Mike Johnson",
      ownerPhone: "(555) 456-7890",
      date: "2025-07-30",
      time: "03:30 PM",
      duration: 30,
      type: "Follow-up",
      status: "upcoming",
      vet: "Dr. Maria Santos",
      notes: "Post-surgery follow-up examination",
      petBreed: "Persian Cat",
      petAge: "5 years",
      priority: "normal",
      createdBy: "vet"
    },
    {
      id: 5,
      petName: "Rocky",
      ownerName: "Emma Davis",
      ownerPhone: "(555) 567-8901",
      date: "2025-08-01",
      time: "09:00 AM",
      duration: 45,
      type: "Emergency Checkup",
      status: "pending",
      vet: "Dr. Sarah Johnson",
      notes: "Client reports limping and showing signs of pain",
      petBreed: "Bulldog",
      petAge: "4 years",
      priority: "urgent",
      createdBy: "client",
      requestedDate: "2025-07-29",
      clientMessage: "Rocky has been limping since yesterday and seems to be in pain. Please help!"
    },
    {
      id: 6,
      petName: "Whiskers",
      ownerName: "Tom Brown",
      ownerPhone: "(555) 678-9012",
      date: "2025-08-05",
      time: "11:00 AM",
      duration: 30,
      type: "Dental Cleaning",
      status: "pending",
      vet: "Dr. Mike Chen",
      notes: "Annual dental cleaning and examination requested by client",
      petBreed: "Maine Coon",
      petAge: "6 years",
      priority: "normal",
      createdBy: "client",
      requestedDate: "2025-07-28",
      clientMessage: "It's time for Whiskers' annual dental cleaning. Any day next week works for me."
    }
  ]);

  const handleApproveAppointment = (appointmentId) => {
    setAppointments(prevAppointments =>
      prevAppointments.map(appointment =>
        appointment.id === appointmentId
          ? { ...appointment, status: 'confirmed' }
          : appointment
      )
    );
  };

  const handleDeclineAppointment = (appointmentId) => {
    setAppointments(prevAppointments =>
      prevAppointments.map(appointment =>
        appointment.id === appointmentId
          ? { ...appointment, status: 'declined' }
          : appointment
      )
    );
  };

  const handleMarkAsCompleted = (appointmentId) => {
    setAppointments(prevAppointments =>
      prevAppointments.map(appointment =>
        appointment.id === appointmentId
          ? { ...appointment, status: 'completed' }
          : appointment
      )
    );
  };

  const handleDeleteAppointment = (appointment) => {
    setDeleteAppointment(appointment);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteAppointment = () => {
    if (deleteAppointment) {
      setAppointments(prevAppointments =>
        prevAppointments.filter(appointment => appointment.id !== deleteAppointment.id)
      );
      setIsDeleteModalOpen(false);
      setDeleteAppointment(null);
    }
  };

  const handleViewAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setIsDetailsModalOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'in-progress': return 'bg-green-100 text-green-700 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'upcoming': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'pending': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'declined': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'high': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'normal': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <CheckCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const filteredAppointments = appointments.filter(appointment => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'today') return appointment.date === '2025-07-30';
    if (selectedFilter === 'pending') return appointment.status === 'pending';
    if (selectedFilter === 'upcoming') return appointment.status === 'upcoming' || appointment.status === 'confirmed';
    if (selectedFilter === 'completed') return appointment.status === 'completed';
    if (selectedFilter === 'declined') return appointment.status === 'declined';
    return appointment.status === selectedFilter;
  });

  const pendingCount = appointments.filter(a => a.status === 'pending').length;
  const clientRequestsCount = appointments.filter(a => a.createdBy === 'client').length;
  const todayCount = appointments.filter(a => a.date === '2025-07-30').length;

  const filterOptions = [
    { key: 'all', label: 'All Appointments', count: appointments.length },
    { key: 'today', label: 'Today', count: todayCount },
    { key: 'pending', label: 'Pending Approval', count: pendingCount },
    { key: 'confirmed', label: 'Confirmed', count: appointments.filter(a => a.status === 'confirmed').length },
    { key: 'declined', label: 'Declined', count: appointments.filter(a => a.status === 'declined').length }
  ];

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
                  placeholder="Search appointments, pets, owners..."
                  className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent w-96 bg-white/50 backdrop-blur-sm transition-all duration-200"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 relative">
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

        {/* Appointments Content */}
        <div className="flex-1 p-6 overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Appointments</h1>
              <p className="text-gray-600">Manage all veterinary appointments and client requests</p>
              {pendingCount > 0 && (
                <div className="mt-2 flex items-center space-x-2">
                  <Clock3 className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-orange-600 font-medium">
                    {pendingCount} appointment{pendingCount !== 1 ? 's' : ''} awaiting your approval
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button className="bg-white/80 backdrop-blur-md border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md flex items-center space-x-2">
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-md rounded-xl p-1 border border-gray-200">
                {filterOptions.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setSelectedFilter(option.key)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center space-x-2 ${
                      selectedFilter === option.key
                        ? 'bg-green-500 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span>{option.label}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      selectedFilter === option.key
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {option.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Filter className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Appointments List */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">
                  {selectedFilter === 'all' ? 'All Appointments' : 
                   selectedFilter === 'today' ? "Today's Appointments" :
                   selectedFilter === 'pending' ? 'Pending Approval' :
                   selectedFilter === 'declined' ? 'Declined Appointments' :
                   selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1) + ' Appointments'}
                </h2>
                <span className="text-sm text-gray-500">{filteredAppointments.length} appointments</span>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {filteredAppointments.map((appointment) => (
                <div key={appointment.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center space-x-6">
                    {/* Time and Status */}
                    <div className="flex-shrink-0 text-center">
                      <p className="text-lg font-semibold text-gray-800">{appointment.time}</p>
                      <p className="text-sm text-gray-500">{appointment.duration} min</p>
                      <div className="mt-2">
                        {getPriorityIcon(appointment.priority)}
                      </div>
                    </div>

                    {/* Pet Avatar */}
                    <div className="flex-shrink-0">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
                        appointment.createdBy === 'client' 
                          ? 'bg-gradient-to-br from-purple-400 to-pink-600' 
                          : 'bg-gradient-to-br from-blue-400 to-purple-600'
                      }`}>
                        <PawPrint className="w-8 h-8 text-white" />
                      </div>
                    </div>

                    {/* Simplified Appointment Details */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">{appointment.petName}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                          {appointment.status === 'pending' ? 'Needs Approval' : appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </span>
                        {appointment.createdBy === 'client' && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                            Client Request
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4" />
                          <span>{appointment.ownerName}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4" />
                          <span>{appointment.type}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex items-center space-x-2">
                      {appointment.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleApproveAppointment(appointment.id)}
                            className="p-2 hover:bg-green-100 rounded-lg transition-colors group flex items-center space-x-1 bg-green-50 border border-green-200"
                            title="Approve appointment"
                          >
                            <Check className="w-5 h-5 text-green-600" />
                            <span className="text-xs text-green-600 font-medium">Approve</span>
                          </button>
                          <button 
                            onClick={() => handleDeclineAppointment(appointment.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors group flex items-center space-x-1 bg-red-50 border border-red-200"
                            title="Decline appointment"
                          >
                            <X className="w-5 h-5 text-red-600" />
                            <span className="text-xs text-red-600 font-medium">Decline</span>
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => handleViewAppointment(appointment)}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors group"
                        title="View details"
                      >
                        <Eye className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                      </button>
                      <button 
                        onClick={() => handleDeleteAppointment(appointment)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors group"
                        title="Delete appointment"
                      >
                        <Trash2 className="w-5 h-5 text-gray-400 group-hover:text-red-600" />
                      </button>
                      {(appointment.status === 'confirmed' || appointment.status === 'approved') && (
                        <button
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          onClick={() => handleMarkAsCompleted(appointment.id)}
                          title="Mark as completed"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    {/* Appointment Details Modal */}
    {isDetailsModalOpen && (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden border border-gray-200/50">

          {/* Modal Header */}
          <div className={`bg-gradient-to-r ${
            selectedAppointment?.createdBy === 'client'
              ? 'from-purple-500 via-pink-500 to-pink-600'
              : 'from-blue-500 via-purple-500 to-indigo-600'
          } text-white p-6 sticky top-0 z-10 shadow-lg`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <PawPrint className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {selectedAppointment?.petName || "Pet Name"}
                  </h2>
                  <p className="text-white/80 text-sm">Appointment Details</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedAppointment(null);
                }}
                className="p-2 hover:bg-white/20 rounded-full transition-all duration-200 hover:scale-110"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Modal Content - Scrollable */}
          <div className="overflow-y-auto max-h-[calc(85vh-88px)] custom-scrollbar">
            {selectedAppointment && (
              <div className="p-6 space-y-6">

                {/* Status and Priority */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(selectedAppointment.status)}`}>
                      {selectedAppointment.status === 'pending' ? 'Needs Approval' :
                      selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                    </span>
                    {selectedAppointment.createdBy === 'client' && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                        Client Request
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {getPriorityIcon(selectedAppointment.priority)}
                    <span className="text-sm font-medium text-gray-600 capitalize">
                      {selectedAppointment.priority} Priority
                    </span>
                  </div>
                </div>

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
                        <p className="text-sm text-gray-500">Time & Duration</p>
                        <p className="font-medium text-gray-800">{selectedAppointment.time} ({selectedAppointment.duration} minutes)</p>
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
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Pet & Owner Info</h3>

                    <div className="flex items-center space-x-3">
                      <PawPrint className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Pet Details</p>
                        <p className="font-medium text-gray-800">{selectedAppointment.petBreed}, {selectedAppointment.petAge}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <User className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Owner Name</p>
                        <p className="font-medium text-gray-800">{selectedAppointment.ownerName}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Phone Number</p>
                        <p className="font-medium text-gray-800">{selectedAppointment.ownerPhone}</p>
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

                {/* Client Message */}
                {selectedAppointment.clientMessage && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                      <MessageCircle className="w-5 h-5" />
                      <span>Client Message</span>
                    </h3>
                    <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-200">
                      <p className="text-blue-800">{selectedAppointment.clientMessage}</p>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      </div>
      
    )}
      <style jsx>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 8px;
            }
            
            .custom-scrollbar::-webkit-scrollbar-track {
              background: #f1f5f9;
              border-radius: 8px;
            }
            
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: linear-gradient(to bottom, #10b981, #059669);
              border-radius: 8px;
              border: 2px solid #f1f5f9;
            }
            
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: linear-gradient(to bottom, #059669, #047857);
            }
            
            .custom-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: #10b981 #f1f5f9;
            }
          `}</style>

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
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteAppointment}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
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

export default VetAppointments;
