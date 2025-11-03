import Sidebar from '@/components/VetSidebar';
import FloatingMessages from '@/components/modal/floatingMessages';
import NotificationModal from '@/components/modal/notificationModal';
import ProfileModal from '@/components/modal/profileModal';
import {
  AlertCircle,
  Bell,
  ChevronLeft, ChevronRight,
  Eye,
  FileText,
  RefreshCw,
  Search
} from 'lucide-react';
import { useEffect, useState } from 'react';
import MEDICALRECORDDETAILS from './MedRecordDetails';

const VetAccessRequests = () => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [vetProfile, setVetProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFocus, setSearchFocus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  
  const [showMedicalRecordDetails, setShowMedicalRecordDetails] = useState(false);
  const [selectedMedicalRecordId, setSelectedMedicalRecordId] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchNotifications = async () => {
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
      // Error handling without console log
    }
  };

  const refreshDashboardData = async () => {
    await Promise.all([
      fetchMedicalRecords(),
      fetchNotifications()
    ]);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshDashboardData();
    setIsRefreshing(false);
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/veterinarian/vet_profile/', {
        method: 'GET',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) setVetProfile(data.profile);
    } catch (err) {
      // Error handling without console log
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
      setError('Failed to load medical records. Please try again later.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleNotificationModalClose = () => {
    setIsNotificationModalOpen(false);
    fetchNotifications();
  };

  const handleViewRecord = (record) => {
    setSelectedMedicalRecordId(record.id);
    setSelectedRecord(record);
    setShowMedicalRecordDetails(true);
  };

  const handleBackToRecords = () => {
    setShowMedicalRecordDetails(false);
    setSelectedMedicalRecordId(null);
    setSelectedRecord(null);
  };
  
  useEffect(() => {
    fetchProfile();
    fetchMedicalRecords();
    fetchNotifications();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFilter, searchTerm]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'declined': return 'bg-red-100 text-red-700 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredRecords = medicalRecords.filter(record => {
    if (selectedFilter !== 'all' && record.status !== selectedFilter) {
      return false;
    }
    
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

  if (showMedicalRecordDetails) {
    return (
      <MEDICALRECORDDETAILS 
        recordId={selectedMedicalRecordId}
        recordData={selectedRecord}
        onBack={handleBackToRecords}
      />
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar/>

      <div className="flex-1 flex flex-col">
        <div className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Medical Records</h1>
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="cursor-pointer p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
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

          <div className="flex items-center justify-between mb-6">
            <div className={`relative w-[350px] max-w-full flex items-center bg-white rounded-xl shadow-md overflow-hidden transition-transform duration-200 ${
              searchFocus ? "scale-105 shadow-xl" : "shadow"
            }`}>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-all duration-200" />
              <input
                type="text"
                placeholder="Search horse name or owner name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setSearchFocus(true)}
                onBlur={() => setSearchFocus(false)}
                className="w-full pl-12 pr-4 py-3 border-none outline-none text-sm text-gray-900 bg-transparent placeholder-gray-400"
              />
            </div>
            
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
                    <>
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                    </>
                  ) : filteredRecords.length > 0 ? (
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
                        <td className="px-4 py-4 text-center">
                          <div className="flex justify-center space-x-2">
                            <button 
                              onClick={() => handleViewRecord(record)}
                              className="cursor-pointer flex items-center text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 px-3 py-2 rounded-lg transition-colors"
                              title="View Medical Records"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
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

      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      
      <NotificationModal 
        isOpen={isNotificationModalOpen} 
        onClose={handleNotificationModalClose} 
        notifications={notifications} 
      />
      
      <FloatingMessages />
    </div>
  );
};

export default VetAccessRequests;