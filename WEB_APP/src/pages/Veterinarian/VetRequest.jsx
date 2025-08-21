import React, { useState } from 'react';
import {FileText,Heart,Search,Menu,MessageCircle,Bell,PawPrint,User,Phone,MapPin,CheckCircle,AlertCircle,RefreshCw,X,Clock3,Shield,Clock,
} from 'lucide-react';
import Sidebar from '@/components/VetSidebar';
import FloatingMessages from '@/components/modal/floatingMessages';
import ProfileModal from '@/components/modal/profileModal';

const VetAccessRequests = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [accessRequests, setAccessRequests] = useState([
    {
      id: 1,
      horseName: "Wetzon",
      ownerName: "Jose Rizal",
      appointmentDate: "2025-07-30",
      status: "approved",
      requestedBy: "Dr. Sarah Johnson",
      requestDate: "2025-07-29",
      reason: "Need to review medical history for follow-up treatment",
      horseDetails: {
        age: "7 years",
        breed: "Slice Bread",
        contact: "09123456789",
        location: "Cebu City",
        sex: "Male"
      },
      medicalRecords: [
        {
          date: "May 2, 2025",
          diagnosis: "Annual Check-up",
          veterinarian: "Dr. Sarah Johnson",
          status: "Completed"
        }
      ],
      treatmentHistory: [
        {
          date: "May 2, 2025",
          treatment: "Equine Influenza Vaccine",
          administeredBy: "Dr. Sarah Johnson",
          result: "Successful"
        }
      ]
    },
    {
      id: 2,
      horseName: "Bella",
      ownerName: "John Smith",
      appointmentDate: "2025-07-28",
      status: "approved",
      requestedBy: "Dr. Mike Chen",
      requestDate: "2025-07-27",
      approvedBy: "Admin User",
      approvedDate: "2025-07-28",
      reason: "Emergency consultation required",
      horseDetails: {
        age: "5 years",
        breed: "Arabian",
        contact: "(555) 234-5678",
        location: "Manila",
        sex: "Female"
      },
      medicalRecords: [
        {
          date: "July 28, 2025",
          diagnosis: "Emergency Check",
          veterinarian: "Dr. Mike Chen",
          status: "Completed"
        }
      ],
      treatmentHistory: [
        {
          date: "July 28, 2025",
          treatment: "Pain Relief Medication",
          administeredBy: "Dr. Mike Chen",
          result: "Successful"
        }
      ]
    },
    {
      id: 3,
      horseName: "Max",
      ownerName: "Sarah Wilson",
      appointmentDate: "2025-08-02",
      status: "pending",
      requestedBy: "Dr. Emily Rodriguez",
      requestDate: "2025-07-30",
      reason: "Pre-surgical assessment and medical history review"
    },
    {
      id: 4,
      horseName: "Luna",
      ownerName: "Mike Johnson",
      appointmentDate: "2025-07-25",
      status: "declined",
      requestedBy: "Dr. Lisa Wang",
      requestDate: "2025-07-24",
      declinedBy: "Admin User",
      declinedDate: "2025-07-25",
      declineReason: "Insufficient justification for access",
      reason: "Routine check requested"
    },
    {
      id: 5,
      horseName: "Rocky",
      ownerName: "Emma Davis",
      appointmentDate: "2025-07-31",
      status: "approved",
      requestedBy: "Dr. Robert Taylor",
      requestDate: "2025-07-29",
      approvedBy: "Admin User",
      approvedDate: "2025-07-30",
      reason: "Continuation of treatment plan"
    },
    {
      id: 6,
      horseName: "Whiskers",
      ownerName: "Tom Brown",
      appointmentDate: "2025-08-05",
      status: "pending",
      requestedBy: "Dr. Amanda Foster",
      requestDate: "2025-07-30",
      reason: "Post-operative care and recovery monitoring"
    }
  ]);

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'declined': return 'bg-red-100 text-red-700 border-red-200';
      case 'pending': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredRequests = accessRequests.filter(request => {
    if (selectedFilter === 'all') return true;
    return request.status === selectedFilter;
  });

  const pendingCount = accessRequests.filter(r => r.status === 'pending').length;
  const approvedCount = accessRequests.filter(r => r.status === 'approved').length;
  const declinedCount = accessRequests.filter(r => r.status === 'declined').length;

  const filterOptions = [
    { key: 'all', label: 'All', count: accessRequests.length },
    { key: 'pending', label: 'Pending', count: pendingCount },
    { key: 'approved', label: 'Approved', count: approvedCount },
    { key: 'declined', label: 'Declined', count: declinedCount }
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
                  placeholder="Search access requests..."
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

        {/* Access Requests Content */}
        <div className="flex-1 p-6 overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Access Requests</h1>
              <p className="text-gray-600">View your requests to access horse medical records and their approval status</p>
              {pendingCount > 0 && (
                <div className="mt-2 flex items-center space-x-2">
                  <Clock3 className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-orange-600 font-medium">
                    {pendingCount} request{pendingCount !== 1 ? 's' : ''} pending admin approval
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
          </div>

          {/* Access Requests Table */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horse Name</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Appointment Date</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center shadow-md mr-3">
                            <PawPrint className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{request.horseName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{request.ownerName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{request.appointmentDate}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center">
                          <button 
                            onClick={() => handleViewRequest(request)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden border border-gray-200/50">
            {/* Modal Header  */}
            <div className="bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 text-white p-6 sticky top-0 z-10 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Horse Medical Records</h2>
                    <p className="text-green-100 text-sm">Access Request Details</p>
                  </div>
                </div>
                <button 
                  onClick={closeModal}
                  className="p-2 hover:bg-white/20 rounded-full transition-all duration-200 hover:scale-110"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-88px)] custom-scrollbar">
              {/* Horse Information Card */}
              <div className="p-6 border-b border-gray-100">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200/50">
                  <div className="flex items-start space-x-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <PawPrint className="w-10 h-10 text-white" />
                    </div>
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <Heart className="w-5 h-5 text-green-500 mt-0.5" />
                          <div>
                            <span className="font-semibold text-gray-700 block">Horse Name</span>
                            <span className="text-lg text-gray-900 font-medium">{selectedRequest.horseName}</span>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <Clock className="w-5 h-5 text-blue-500 mt-0.5" />
                          <div>
                            <span className="font-semibold text-gray-700 block">Age</span>
                            <span className="text-gray-900">{selectedRequest.horseDetails?.age}</span>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <Shield className="w-5 h-5 text-purple-500 mt-0.5" />
                          <div>
                            <span className="font-semibold text-gray-700 block">Breed</span>
                            <span className="text-gray-900">{selectedRequest.horseDetails?.breed}</span>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                          <div>
                            <span className="font-semibold text-gray-700 block">Status</span>
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium border border-green-200">
                              Approved
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <User className="w-5 h-5 text-gray-500 mt-0.5" />
                          <div>
                            <span className="font-semibold text-gray-700 block">Owner</span>
                            <span className="text-gray-900">{selectedRequest.ownerName}</span>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <Phone className="w-5 h-5 text-orange-500 mt-0.5" />
                          <div>
                            <span className="font-semibold text-gray-700 block">Contact</span>
                            <span className="text-gray-900">{selectedRequest.horseDetails?.contact}</span>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <MapPin className="w-5 h-5 text-red-500 mt-0.5" />
                          <div>
                            <span className="font-semibold text-gray-700 block">Location</span>
                            <span className="text-gray-900">{selectedRequest.horseDetails?.location}</span>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                          <div>
                            <span className="font-semibold text-gray-700 block">Sex</span>
                            <span className="text-gray-900">{selectedRequest.horseDetails?.sex}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Medical Record Section */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Medical Records</h3>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Diagnosis</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Veterinarian</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedRequest.medicalRecords?.map((record, index) => (
                        <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-900 font-medium">{record.date}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{record.diagnosis}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{record.veterinarian}</td>
                          <td className="px-6 py-4">
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium border border-green-200">
                              {record.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 hover:shadow-md">
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Treatment History Section */}
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Heart className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Treatment History</h3>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Treatment</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Administered By</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Result</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedRequest.treatmentHistory?.map((treatment, index) => (
                        <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-900 font-medium">{treatment.date}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{treatment.treatment}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{treatment.administeredBy}</td>
                          <td className="px-6 py-4">
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium border border-green-200">
                              {treatment.result}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 hover:shadow-md">
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
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

export default VetAccessRequests;
