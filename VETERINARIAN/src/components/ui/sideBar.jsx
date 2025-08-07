import React, { useState } from 'react';
import {BarChart3,Calendar,FileText,Heart,Users,Settings,LogOut,} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Sidebar = ({ isSidebarCollapsed, isHovering, setIsHovering }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const sidebarItems = [
    { icon: BarChart3, label: 'Dashboard', path: '/dashboard' },
    { icon: Calendar, label: 'Appointments', path: '/appointments' },
    { icon: FileText, label: 'Access Requests', path: '/access-request' },
    { icon: Heart, label: 'Health Logs', path: '/health-logs' },
    { icon: Users, label: 'Vet Directory', path: '/vet-directory' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const shouldShowFullSidebar = !isSidebarCollapsed || isHovering;

  return (
    <>
      <div
        className={`bg-gradient-to-b from-green-600 to-green-700 text-white transition-all duration-300 relative h-screen
          ${shouldShowFullSidebar ? 'w-64' : 'w-16'} 
          ${isHovering && isSidebarCollapsed ? 'shadow-2xl z-10' : 'shadow-lg'}`}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Logo/Header */}
        <div className="p-4 border-b border-green-500/30">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div
              className={`ml-3 overflow-hidden transition-all duration-300
                ${shouldShowFullSidebar ? 'opacity-100 w-auto' : 'opacity-0 w-0'}
                whitespace-nowrap`}
            >
              <span className="font-bold text-lg block">ECHO</span>
              <p className="text-xs text-green-100">Veterinarian</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-2">
          {sidebarItems.map(({ icon: Icon, label, path }, index) => {
            const isActive = location.pathname === path;

            return (
              <Link
                key={index}
                to={path}
                className={`flex items-center px-3 py-3 mb-1 rounded-lg transition-all duration-200
                  ${isActive 
                    ? 'bg-white/20 backdrop-blur-sm shadow-lg border-r-4 border-white' 
                    : 'hover:bg-white/10'}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span
                  className={`ml-3 transition-all duration-300
                    ${shouldShowFullSidebar ? 'opacity-100 w-auto' : 'opacity-0 w-0'}
                    overflow-hidden whitespace-nowrap`}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-4 left-0 right-0 px-4">
          <div
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center px-3 py-3 cursor-pointer hover:bg-white/10 rounded-lg transition-all duration-200"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span
              className={`ml-3 transition-all duration-300
                ${shouldShowFullSidebar ? 'opacity-100 w-auto' : 'opacity-0 w-0'}
                overflow-hidden whitespace-nowrap`}
            >
              Log Out
            </span>
          </div>
        </div>
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 shadow-xl w-full max-w-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Confirm Logout</h2>
            <p className="text-sm text-gray-600 mb-6">Are you sure you want to log out of your account?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
