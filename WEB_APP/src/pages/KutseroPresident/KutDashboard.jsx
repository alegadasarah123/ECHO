import Sidebar from '@/components/KutSidebar';
import { AlertCircle, Bell, Calendar, CheckCircle, Clock, UserPlus, Users, Users2, XCircle, RefreshCw } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from "react-router-dom";
import FloatingMessages from './KutMessages';
import NotificationModal from './KutNotif';

const API_BASE = "http://localhost:8000/api/kutsero_president";

// Profile Avatar Component
const UserProfileAvatar = ({ user, size = 9 }) => {
  const getInitials = (name) => {
    if (!name || name === "N/A") return "?";
    const nameParts = name.split(' ').filter(part => part.trim() !== '');
    if (nameParts.length === 0) return "?";
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  };

  const profilePicture = user.profilePicture || user.kutsero_image || user.op_image;

  if (profilePicture) {
    return (
      <img 
        src={profilePicture} 
        alt={user.name}
        className={`w-${size} h-${size} rounded-full object-cover border border-gray-200`}
      />
    );
  }

  return (
    <div 
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-medium text-xs border border-gray-200`}
      style={{ backgroundColor: '#D2691E' }}
    >
      {getInitials(user.name)}
    </div>
  );
};

const KutseroDashboard = () => {
  const navigate = useNavigate(); 
  const [authorized, setAuthorized] = useState(false);
  const [users, setUsers] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCounts, setApprovedCounts] = useState({
    approved_kutsero_count: 0,
    approved_horse_operator_count: 0,
  });
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState({
    auth: true,
    users: false,
    counts: false,
    notifications: false
  });
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const pendingUsers = users.filter(u => u.status === "pending");
  const declinedUsers = users.filter(u => u.status === "declined");
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // SIMPLE FETCH FUNCTION WITH ERROR HANDLING
  const apiFetch = useCallback(async (endpoint, options = {}) => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API Error ${endpoint}:`, error);
      throw error;
    }
  }, []);

  // CHECK AUTH
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await apiFetch('/test_cookie/');
        if (!data.token_present) {
          navigate("/login");
        } else {
          setAuthorized(true);
          setError(null);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        setError("Connection issue - retrying...");
        setTimeout(() => setRetryCount(prev => prev + 1), 2000);
      } finally {
        setLoading(prev => ({ ...prev, auth: false }));
      }
    };
    
    checkAuth();
  }, [navigate, apiFetch, retryCount]);

  // LOAD ALL DATA
  const loadDashboardData = useCallback(async () => {
    if (!authorized) return;

    try {
      setError(null);
      
      // Load users and pending count
      setLoading(prev => ({ ...prev, users: true }));
      const usersData = await apiFetch('/get_users/');
      setUsers(usersData.users || []);
      setPendingCount(usersData.pending_count || 0);

      // Load approved counts
      setLoading(prev => ({ ...prev, counts: true }));
      const countsData = await apiFetch('/get_approved_counts/');
      setApprovedCounts({
        approved_kutsero_count: countsData.approved_kutsero_count || 0,
        approved_horse_operator_count: countsData.approved_horse_operator_count || 0,
      });

      // Load notifications
      setLoading(prev => ({ ...prev, notifications: true }));
      const notifData = await apiFetch('/get_notifications/');
      setNotifications(Array.isArray(notifData) ? notifData : []);

    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setError("Failed to load data. Please refresh the page.");
      
      // Set safe defaults
      setUsers([]);
      setPendingCount(0);
      setApprovedCounts({
        approved_kutsero_count: 0,
        approved_horse_operator_count: 0,
      });
      setNotifications([]);
    } finally {
      setLoading(prev => ({
        ...prev,
        users: false,
        counts: false,
        notifications: false
      }));
    }
  }, [authorized, apiFetch]);

  // Load data when authorized
  useEffect(() => {
    if (authorized) {
      loadDashboardData();
    }
  }, [authorized, loadDashboardData]);

  // Auto-refresh data every 60 seconds
  useEffect(() => {
    if (!authorized) return;
    
    const interval = setInterval(() => {
      loadDashboardData();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [authorized, loadDashboardData]);

  const handleManualRefresh = () => {
    setRetryCount(prev => prev + 1);
    loadDashboardData();
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notification) => {
    setNotifications(prev => 
      prev.map(n => 
        n.notif_id === notification.notif_id ? { ...n, read: true } : n
      )
    );
    
    navigate('/KutUserManagement', { 
      state: { highlightedNotification: notification } 
    });
  };
  
  const handleOpenKutseroManagement = (notification = null) => {
    navigate('/KutUserManagement', { 
      state: notification ? { highlightedNotification: notification } : {} 
    });
  };

  const todayDate = new Date().toLocaleDateString();
  const todayRegistrations = users.filter(u => {
    const userDate = new Date(u.created_at).toLocaleDateString();
    return userDate === todayDate;
  });
  
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'kutsero': return 'text-green-600 bg-green-50 border-green-200';
      case 'horse_operator': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'text-green-600 bg-green-50 border-green-200';
      case 'pending': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'declined': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role?.toLowerCase()) {
      case 'kutsero': return 'Kutsero';
      case 'horse_operator': return 'Horse Operator';
      default: return role || 'Unknown';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return CheckCircle;
      case 'pending': return AlertCircle;
      case 'declined': return XCircle;
      default: return AlertCircle;
    }
  };

  // Skeletons
  const StatCardSkeleton = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center gap-4">
      <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
      <div className="flex flex-col gap-2">
        <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </div>
  );

  const UserItemSkeleton = () => (
    <div className="flex gap-3 p-3 border border-gray-100 rounded-lg bg-gray-50 items-center">
      <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse"></div>
      <div className="flex-1 flex justify-between items-center">
        <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="w-16 h-6 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </div>
  );

  const RecentUserSkeleton = () => (
    <div className="flex gap-3 p-3 border border-gray-100 rounded-lg bg-gray-50">
      <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse shrink-0"></div>
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <div className="flex justify-between items-center">
          <div className="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-20 h-6 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="flex justify-between">
          <div className="w-20 h-3 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-16 h-3 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );

  const isDataLoading = loading.auth || loading.users || loading.counts;

  if (loading.auth) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <header className="bg-white shadow-sm border-b border-gray-200 px-8 py-4 flex items-center justify-between shrink-0">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold text-[#D2691E]">Welcome!</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar size={16} />
                  <span>{currentDate}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={16} />
                  <span>{currentTime}</span>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 p-8 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D2691E] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading dashboard...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200 px-8 py-4 flex items-center justify-between shrink-0">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-[#D2691E] m-0">Welcome!</h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar size={16} />
                <span>{currentDate}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={16} />
                <span>{currentTime}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            
            <button
              onClick={handleManualRefresh}
              disabled={loading.users || loading.counts}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-[#D2691E] text-white rounded-lg hover:bg-[#A0522D] disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={16} className={loading.users || loading.counts ? 'animate-spin' : ''} />
              Refresh
            </button>

            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="cursor-pointer p-2 rounded-full hover:bg-gray-100 transition-colors duration-200 relative"
                aria-label="Notifications"
              >
                <Bell size={24} className="text-gray-500" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              <NotificationModal
                isOpen={notifOpen}
                onClose={() => setNotifOpen(false)}
                onNotificationClick={handleNotificationClick}
                notifications={notifications}
                onMarkAllAsRead={handleMarkAllAsRead}
                onOpenKutseroManagement={handleOpenKutseroManagement}
              />
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 flex flex-col gap-6 bg-gray-50 overflow-hidden">
          {/* STATS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
            {isDataLoading ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
                  <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                    <Users size={28} className="text-green-600" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-3xl font-bold text-gray-900">
                      {(approvedCounts.approved_kutsero_count || 0) + (approvedCounts.approved_horse_operator_count || 0)}
                    </p>
                    <h3 className="text-sm font-medium text-gray-600">Total Approved Users</h3>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Users2 size={28} className="text-blue-600" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-3xl font-bold text-gray-900">{pendingCount}</p>
                    <h3 className="text-sm font-medium text-gray-600">Pending Verifications</h3>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
                  <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                    <XCircle size={28} className="text-red-600" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-3xl font-bold text-gray-900">{declinedUsers.length}</p>
                    <h3 className="text-sm font-medium text-gray-600">Declined Users</h3>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* CONTENT CARDS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden">
            {/* Today's Registrations */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col gap-4 overflow-hidden">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-3">
                  <UserPlus size={24} className="text-gray-500" />
                  <h2 className="text-lg font-semibold text-gray-900">Today's Registrations</h2>
                </div>
                <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {todayRegistrations.length} today
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {loading.users ? (
                  <>
                    <UserItemSkeleton />
                    <UserItemSkeleton />
                    <UserItemSkeleton />
                  </>
                ) : todayRegistrations.length > 0 ? (
                  todayRegistrations.map((u) => (
                    <div key={u.id} className="flex gap-3 p-3 border border-gray-100 rounded-lg bg-gray-50 items-center hover:bg-gray-100 transition-colors duration-150">
                      <UserProfileAvatar user={u} size={9} />
                      <div className="flex-1 flex justify-between items-center">
                        <span className="font-medium text-gray-900">{u.name}</span>
                        <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getRoleColor(u.role)}`}>
                          {getRoleDisplayName(u.role)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 italic text-sm">
                    No registrations today.
                  </div>
                )}
              </div>
            </div>

            {/* Recent Registrations */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col gap-4 overflow-hidden">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-3">
                  <AlertCircle size={24} className="text-gray-500" />
                  <h2 className="text-lg font-semibold text-gray-900">Recent Registrations</h2>
                </div>
                <span className="text-sm text-gray-500">Last 5 registrations</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {loading.users ? (
                  <>
                    <RecentUserSkeleton />
                    <RecentUserSkeleton />
                    <RecentUserSkeleton />
                    <RecentUserSkeleton />
                    <RecentUserSkeleton />
                  </>
                ) : users.length > 0 ? (
                  users
                    .slice(0, 5)
                    .map((u) => {
                      const StatusIcon = getStatusIcon(u.status);
                      return (
                        <div key={u.id} className="flex gap-3 p-3 border border-gray-100 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-150">
                          <UserProfileAvatar user={u} size={9} />
                          <div className="flex-1 flex flex-col gap-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-900 truncate">{u.name}</span>
                              <span className={`px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1 shrink-0 ${getStatusColor(u.status)}`}>
                                <StatusIcon size={12} />
                                {u.status?.charAt(0).toUpperCase() + u.status?.slice(1) || 'Unknown'}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>{getRoleDisplayName(u.role)}</span>
                              <span>{u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 italic text-sm">
                    No recent registrations.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
      
      <FloatingMessages />
    </div>
  );
};

export default KutseroDashboard;