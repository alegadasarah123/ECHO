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
  Search,
  Shield
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
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
  const [retryCount, setRetryCount] = useState(0);
  
  const [showMedicalRecordDetails, setShowMedicalRecordDetails] = useState(false);
  const [selectedMedicalRecordId, setSelectedMedicalRecordId] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Safe fetch with timeout and retry
  const safeFetch = useCallback(async (url, options = {}, timeout = 10000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - server is taking too long to respond');
      }
      throw error;
    }
  }, []);

  // Fetch with retry logic
  const fetchWithRetry = useCallback(async (fetchFunction, maxRetries = 3) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fetchFunction();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await safeFetch("http://localhost:8000/api/veterinarian/get_notifications/");
      
      if (data) {
        setNotifications(data.notifications || []);
        const unreadCount = (data.notifications || []).filter(n => !n.read).length;
        setNotificationCount(unreadCount);
      }
    } catch (error) {
      // Silently fail for notifications - non-critical
      console.warn('Failed to fetch notifications:', error.message);
    }
  }, [safeFetch]);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await fetchWithRetry(async () => {
        return await safeFetch('http://localhost:8000/api/veterinarian/vet_profile/');
      });

      if (data && data.profile) {
        setVetProfile(data.profile);
      }
    } catch (error) {
      console.warn('Failed to fetch profile:', error.message);
      // Continue without profile - non-critical
    }
  }, [safeFetch, fetchWithRetry]);

  const fetchMedicalRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await fetchWithRetry(async () => {
        return await safeFetch('http://localhost:8000/api/veterinarian/get_medrec_access/');
      });

      if (data) {
        // Validate and sanitize data
        const sanitizedRecords = (data.records || []).map(record => ({
          id: record.id || `record-${Date.now()}-${Math.random()}`,
          accessDate: record.accessDate || 'N/A',
          ownerName: record.ownerName || 'Unknown Owner',
          horseName: record.horseName || 'Unknown Horse',
          approvedBy: record.approvedBy || 'Pending',
          status: record.status || 'pending',
          // Add any other fields with defaults
          ...record
        }));
        
        setMedicalRecords(sanitizedRecords);
        setRetryCount(0); // Reset retry count on success
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to load medical records';
      setError(`${errorMessage}. Please try again.`);
      
      // Increment retry count
      setRetryCount(prev => prev + 1);
      
      // If we've retried too many times, show a more helpful message
      if (retryCount >= 2) {
        setError('Unable to connect to server. Please check your internet connection or try again later.');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [safeFetch, fetchWithRetry, retryCount]);

  const refreshDashboardData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.allSettled([
        fetchMedicalRecords(),
        fetchNotifications(),
        fetchProfile()
      ]);
    } catch (error) {
      // Handled by individual functions
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchMedicalRecords, fetchNotifications, fetchProfile]);

  const handleRefresh = useCallback(async () => {
    await refreshDashboardData();
  }, [refreshDashboardData]);

  const getProfileDisplay = useCallback(() => {
    if (!vetProfile) {
      return {
        type: 'initials',
        content: 'V'
      };
    }

    const profilePhoto = vetProfile.vet_profile_photo;
    
    // More robust photo validation
    if (profilePhoto && 
        typeof profilePhoto === 'string' && 
        profilePhoto.trim() !== '' && 
        !profilePhoto.includes('default') &&
        (profilePhoto.startsWith('http') || profilePhoto.startsWith('/'))) {
      return {
        type: 'photo',
        content: profilePhoto
      };
    }

    const firstInitial = vetProfile.vet_fname?.[0] || '';
    const lastInitial = vetProfile.vet_lname?.[0] || '';
    const initials = (firstInitial + lastInitial).toUpperCase();
    
    return {
      type: 'initials',
      content: initials || 'V'
    };
  }, [vetProfile]);

  const handleNotificationModalClose = useCallback(() => {
    setIsNotificationModalOpen(false);
    fetchNotifications();
  }, [fetchNotifications]);

  const handleViewRecord = useCallback((record) => {
    if (!record || !record.id) {
      setError('Invalid record selected');
      return;
    }
    
    setSelectedMedicalRecordId(record.id);
    setSelectedRecord(record);
    setShowMedicalRecordDetails(true);
  }, []);

  const handleBackToRecords = useCallback(() => {
    setShowMedicalRecordDetails(false);
    setSelectedMedicalRecordId(null);
    setSelectedRecord(null);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedFilter]);

  // Initial data fetch
  useEffect(() => {
    let mounted = true;

    const loadInitialData = async () => {
      if (mounted) {
        setLoading(true);
        await refreshDashboardData();
      }
    };

    loadInitialData();

    return () => {
      mounted = false;
    };
  }, [refreshDashboardData]);

  const getStatusColor = useCallback((status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'declined': return 'bg-red-100 text-red-700 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  }, []);

  // Safe date formatting
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  }, []);

  const filteredRecords = medicalRecords.filter(record => {
    if (!record) return false;
    
    if (selectedFilter !== 'all' && record.status !== selectedFilter) {
      return false;
    }
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        (record.horseName || '').toLowerCase().includes(searchLower) ||
        (record.ownerName || '').toLowerCase().includes(searchLower) ||
        (record.approvedBy || '').toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRecords.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));

  const paginate = useCallback((pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  const pageNumbers = [];
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
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

  const SkeletonRow = useCallback(() => (
    <tr className="animate-pulse">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-6 py-4 whitespace-nowrap text-center">
          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
        </td>
      ))}
    </tr>
  ), []);

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
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Medical Records Access</h1>
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className="cursor-pointer p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            
            <button 
              onClick={() => setIsNotificationModalOpen(!isNotificationModalOpen)} 
              className="cursor-pointer p-2 hover:bg-gray-100 rounded-xl relative"
              disabled={loading}
            >
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full min-w-5 h-5 flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>
            
            <button 
              onClick={() => setIsProfileModalOpen(true)}
              disabled={loading}
            >
              <div className="cursor-pointer w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md overflow-hidden">
                {profileDisplay.type === 'photo' ? (
                  <img 
                    src={profileDisplay.content} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = `
                        <span class="text-white font-semibold text-sm">
                          ${profileDisplay.content.charAt(0)}
                        </span>
                      `;
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
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button 
                onClick={fetchMedicalRecords}
                disabled={isRefreshing}
                className="ml-4 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-lg text-sm flex items-center disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Retry
              </button>
            </div>
          )}

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
            <div className={`relative w-full lg:w-[350px] flex items-center bg-white rounded-xl shadow-md overflow-hidden transition-all duration-200 ${
              searchFocus ? "scale-105 shadow-xl ring-2 ring-blue-200" : "shadow"
            }`}>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-all duration-200" />
              <input
                type="text"
                placeholder="Search horse name or owner name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setSearchFocus(true)}
                onBlur={() => setSearchFocus(false)}
                className="w-full pl-12 pr-4 py-3 border-none outline-none text-sm text-gray-900 bg-transparent placeholder-gray-400 disabled:opacity-50"
                disabled={loading}
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2 bg-white/80 backdrop-blur-md rounded-xl p-1 border border-gray-200">
              {filterOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setSelectedFilter(option.key)}
                  disabled={loading}
                  className={`cursor-pointer px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 ${
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
              <table className="w-full min-w-max">
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
                      {[...Array(Math.min(5, itemsPerPage))].map((_, i) => (
                        <SkeletonRow key={i} />
                      ))}
                    </>
                  ) : filteredRecords.length > 0 ? (
                    currentItems.map((record, index) => (
                      <tr 
                        key={`${record.id}-${index}`} 
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="text-center px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(record.accessDate)}</div>
                        </td>
                        <td className="text-center px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{record.ownerName}</div>
                        </td>
                        <td className="text-center px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-medium">{record.horseName}</div>
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
                              disabled={record.status === 'declined' || !record.id}
                              className="cursor-pointer flex items-center text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title={record.status === 'declined' ? 'Access declined' : 'View Medical Records'}
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
                          <p className="text-gray-400 text-sm mb-4">Try adjusting your search or filter criteria</p>
                          {searchTerm || selectedFilter !== 'all' ? (
                            <button
                              onClick={() => {
                                setSearchTerm('');
                                setSelectedFilter('all');
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Clear filters
                            </button>
                          ) : null}
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
                  Showing <span className="font-medium">{Math.min(indexOfFirstItem + 1, filteredRecords.length)}</span> to{" "}
                  <span className="font-medium">
                    {Math.min(indexOfLastItem, filteredRecords.length)}
                  </span> of{" "}
                  <span className="font-medium">{filteredRecords.length}</span> records
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
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
                      disabled={loading}
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>
                  </div>

                  <button
                    onClick={prevPage}
                    disabled={currentPage === 1 || loading}
                    className={`p-2 rounded-md border ${
                      currentPage === 1 || loading
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex space-x-1">
                    {startPage > 1 && (
                      <>
                        <button
                          onClick={() => paginate(1)}
                          className="w-8 h-8 flex items-center justify-center rounded-md border text-sm bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        >
                          1
                        </button>
                        {startPage > 2 && <span className="px-2 text-gray-400">...</span>}
                      </>
                    )}
                    
                    {pageNumbers.map((number) => (
                      <button
                        key={number}
                        onClick={() => paginate(number)}
                        className={`w-8 h-8 flex items-center justify-center rounded-md border text-sm ${
                          currentPage === number
                            ? "bg-green-500 text-white border-green-500"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                        disabled={loading}
                      >
                        {number}
                      </button>
                    ))}
                    
                    {endPage < totalPages && (
                      <>
                        {endPage < totalPages - 1 && <span className="px-2 text-gray-400">...</span>}
                        <button
                          onClick={() => paginate(totalPages)}
                          className="w-8 h-8 flex items-center justify-center rounded-md border text-sm bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages || loading}
                    className={`p-2 rounded-md border ${
                      currentPage === totalPages || loading
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

      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
      
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