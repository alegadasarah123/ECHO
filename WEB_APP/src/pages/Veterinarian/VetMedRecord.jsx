import React, { useState, useEffect } from 'react';
import {FileText,Heart,Search,Menu,MessageCircle,Bell,PawPrint,User,Phone,MapPin,CheckCircle,AlertCircle,RefreshCw,X,Clock3,Shield,Clock, ChevronLeft, ChevronRight
} from 'lucide-react';
import Sidebar from '@/components/VetSidebar';
import FloatingMessages from '@/components/modal/floatingMessages';
import ProfileModal from '@/components/modal/profileModal';

const VetAccessRequests = () => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [vetProfile, setVetProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFocus, setSearchFocus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  // ---------------- FETCH MEDICAL RECORDS ----------------
  const fetchMedicalRecords = async () => {
    try {
      setLoading(true);
      setIsRefreshing(true);
      setError(null);
      const res = await fetch('http://localhost:8000/api/veterinarian/get_medrec_access/', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      setMedicalRecords(data.records || []);
    } catch (err) {
      console.error('Failed to fetch medical records:', err);
      setError('Failed to load medical records. Please try again later.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchMedicalRecords();
  };
  
  useEffect(() => {
    fetchProfile();
    fetchMedicalRecords();
  }, []);

  // Reset to first page when filters or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFilter, searchTerm]);

  const handleViewRecord = (record) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRecord(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'declined': return 'bg-red-100 text-red-700 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Filter records based on selected filter and search term
  const filteredRecords = medicalRecords.filter(record => {
    // Apply status filter
    if (selectedFilter !== 'all' && record.status !== selectedFilter) {
      return false;
    }
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        record.horseName?.toLowerCase().includes(searchLower) ||
        record.ownerName?.toLowerCase().includes(searchLower) ||
        record.approvedBy?.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRecords.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

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

  const approvedCount = medicalRecords.filter(r => r.status === 'approved').length;
  const completedCount = medicalRecords.filter(r => r.status === 'completed').length;
  const declinedCount = medicalRecords.filter(r => r.status === 'declined').length;
  const pendingCount = medicalRecords.filter(r => r.status === 'pending').length;

  const filterOptions = [
    { key: 'all', label: 'All', count: medicalRecords.length },
    { key: 'pending', label: 'Pending', count: pendingCount },
    { key: 'approved', label: 'Approved', count: approvedCount },
    { key: 'declined', label: 'Declined', count: declinedCount },
    { key: 'completed', label: 'Completed', count: completedCount },
  ];

  // Skeleton Loading Component
  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <div className="h-4 bg-gray-200 rounded w-24 mx-auto"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <div className="h-4 bg-gray-200 rounded w-28 mx-auto"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <div className="h-6 bg-gray-200 rounded-full w-20 mx-auto"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <div className="h-8 bg-gray-200 rounded-lg w-16 mx-auto"></div>
      </td>
    </tr>
  );

  const profileDisplay = getProfileDisplay();

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar/>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Medical Records</h1>
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
            <button onClick={() => setIsProfileModalOpen(true)}>
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

        {/* Medical Records Content */}
        <div className="flex-1 p-6 overflow-auto">
          {/* Error message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
              <button 
                onClick={fetchMedicalRecords}
                className="ml-auto bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-lg text-sm flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Retry
              </button>
            </div>
          )}

          {/* Filters and Search - Search on left, Filters on right */}
          <div className="flex items-center justify-between mb-6">
            {/* Search Container - On the left */}
            <div className={`relative w-[350px] max-w-full flex items-center bg-white rounded-xl shadow-md overflow-hidden transition-transform duration-200 ${
              searchFocus ? "scale-105 shadow-xl" : "shadow"
            }`}>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-all duration-200" />
              <input
                type="text"
                placeholder="Search horse name, owner name, or approved by..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setSearchFocus(true)}
                onBlur={() => setSearchFocus(false)}
                className="w-full pl-12 pr-4 py-3 border-none outline-none text-sm text-gray-900 bg-transparent placeholder-gray-400"
              />
            </div>
            
            {/* Filter Container - On the right */}
            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-md rounded-xl p-1 border border-gray-200">
              {filterOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setSelectedFilter(option.key)}
                  className={`cursor-pointer px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center space-x-2 ${
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
          {/* Medical Records Table */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Access Date</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Horse</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Approved By</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    // Show skeleton loading while data is loading
                    <>
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                    </>
                  ) : filteredRecords.length > 0 ? (
                    // Show actual data when loaded
                    currentItems.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="text-center px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{record.accessDate}</div>
                        </td>
                        <td className="text-center px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{record.ownerName}</div>
                        </td>
                        <td className="text-center px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{record.horseName}</div>
                        </td>
                        <td className="text-center px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{record.approvedBy || 'Pending approval'}</div>
                        </td>
                        <td className="text-center px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}>
                            {record.status?.charAt(0).toUpperCase() + record.status?.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button 
                            onClick={() => handleViewRecord(record)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    // Show no results message
                    <tr>
                      <td colSpan="6" className="px-6 py-24 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <FileText className="w-12 h-12 text-gray-300 mb-4" />
                          <p className="text-gray-500 text-lg font-medium">No records found</p>
                          <p className="text-gray-400 text-sm">Try adjusting your search or filter criteria</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls - Attached directly to table */}
            {filteredRecords.length > 0 && !loading && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="text-sm text-gray-600 mb-4 sm:mb-0">
                  Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                  <span className="font-medium">
                    {indexOfLastItem > filteredRecords.length 
                      ? filteredRecords.length 
                      : indexOfLastItem}
                  </span> of{" "}
                  <span className="font-medium">{filteredRecords.length}</span> results
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

      {/* Modal */}
      {isModalOpen && selectedRecord && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-1000 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden border border-gray-200/50">
            {/* Modal Header  */}
            <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white p-6 sticky top-0 z-10 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Horse Medical Records</h2>
                    <p className="text-blue-100 text-sm">
                      {selectedRecord.status === 'pending' 
                        ? 'Pending approval' 
                        : `Approved by ${selectedRecord.approvedBy}`
                      }
                    </p>
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
                            <span className="text-lg text-gray-900 font-medium">{selectedRecord.horseName}</span>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <Clock className="w-5 h-5 text-blue-500 mt-0.5" />
                          <div>
                            <span className="font-semibold text-gray-700 block">Age</span>
                            <span className="text-gray-900">{selectedRecord.horseDetails?.age}</span>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <Shield className="w-5 h-5 text-purple-500 mt-0.5" />
                          <div>
                            <span className="font-semibold text-gray-700 block">Breed</span>
                            <span className="text-gray-900">{selectedRecord.horseDetails?.breed}</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <User className="w-5 h-5 text-gray-500 mt-0.5" />
                          <div>
                            <span className="font-semibold text-gray-700 block">Owner</span>
                            <span className="text-gray-900">{selectedRecord.ownerName}</span>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <Phone className="w-5 h-5 text-orange-500 mt-0.5" />
                          <div>
                            <span className="font-semibold text-gray-700 block">Contact</span>
                            <span className="text-gray-900">{selectedRecord.horseDetails?.contact}</span>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <MapPin className="w-5 h-5 text-red-500 mt-0.5" />
                          <div>
                            <span className="font-semibold text-gray-700 block">Location</span>
                            <span className="text-gray-900">{selectedRecord.horseDetails?.location}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Information */}
              {selectedRecord.status === 'pending' && (
                <div className="p-6 border-b border-gray-100">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
                    <div className="flex items-center space-x-3">
                      <Clock3 className="w-6 h-6 text-yellow-600" />
                      <div>
                        <h3 className="text-lg font-semibold text-yellow-800">Pending Approval</h3>
                        <p className="text-yellow-700">This medical record access request is awaiting approval.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Medical Record Section - Only show if approved or completed */}
              {(selectedRecord.status === 'approved' || selectedRecord.status === 'completed') && (
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
                        {selectedRecord.records?.map((record, index) => (
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
              )}

              {/* Treatment History Section - Only show if approved or completed */}
              {(selectedRecord.status === 'approved' || selectedRecord.status === 'completed') && selectedRecord.treatments && selectedRecord.treatments.length > 0 && (
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
                        {selectedRecord.treatments?.map((treatment, index) => (
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
          background: linear-gradient(to bottom, #3b82f6, #6366f1);
          border-radius: 8px;
          border: 2px solid #f1f5f9;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #2563eb, #4f46e5);
        }
        
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #3b82f6 #f1f5f9;
        }
      `}</style>
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      <FloatingMessages />
    </div>
  );
};

export default VetAccessRequests;