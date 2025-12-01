import React, { useState, useEffect } from 'react';
import { Search, Menu, Bell, Shield, Lock, Unlock, Mail, MessageCircle, HelpCircle, Phone, FileText, Settings as SettingsIcon, Eye, EyeOff, Check, X, Key, UserCheck, AlertTriangle, Info, ExternalLink, Download, RefreshCw, Clock, Globe } from 'lucide-react';
import Sidebar from '@/components/VetSidebar';
import ProfileModal from '@/components/modal/profileModal';
import NotificationModal from '@/components/modal/notificationModal';
import FloatingMessages from '@/components/modal/floatingMessages';

// Extracted SecuritySettings component
const SecuritySettings = ({ 
  showCurrentPassword, setShowCurrentPassword,
  showNewPassword, setShowNewPassword,
  showConfirmPassword, setShowConfirmPassword,
  currentPassword, setCurrentPassword,
  newPassword, setNewPassword,
  confirmPassword, setConfirmPassword,
  passwordRequirements, checkPasswordRequirements,
  vetEmail,
  handlePasswordChange,
  isLoading,
  errorMessage,
  successMessage
}) => {
  const handleCurrentPasswordChange = (e) => {
    setCurrentPassword(e.target.value);
  };

  const handleNewPasswordChange = (e) => {
    const password = e.target.value;
    setNewPassword(password);
    checkPasswordRequirements(password);
  };

  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handlePasswordChange();
  };

  return (
    <div className="space-y-8">
      {/* Password Section */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Lock className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Password Settings</h3>
            <p className="text-gray-600 text-sm">Manage your account password and security</p>
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-start space-x-3">
            <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{successMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={handleCurrentPasswordChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/50 backdrop-blur-sm"
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={handleNewPasswordChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/50 backdrop-blur-sm"
                    placeholder="Enter new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/50 backdrop-blur-sm"
                    placeholder="Confirm new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                disabled={!Object.values(passwordRequirements).every(req => req) || newPassword !== confirmPassword || isLoading}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200/50">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                <Key className="w-5 h-5 text-green-600" />
                <span>Password Requirements</span>
              </h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  {passwordRequirements.minLength ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm text-gray-600">At least 8 characters long</span>
                </div>
                <div className="flex items-center space-x-3">
                  {passwordRequirements.hasUppercase ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm text-gray-600">Contains uppercase letters</span>
                </div>
                <div className="flex items-center space-x-3">
                  {passwordRequirements.hasLowercase ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm text-gray-600">Contains lowercase letters</span>
                </div>
                <div className="flex items-center space-x-3">
                  {passwordRequirements.hasNumber ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm text-gray-600">Contains numbers</span>
                </div>
                <div className="flex items-center space-x-3">
                  {passwordRequirements.hasSpecialChar ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm text-gray-600">Contains special characters</span>
                </div>
                <div className="flex items-center space-x-3 mt-4 pt-4 border-t border-gray-200">
                  {newPassword === confirmPassword && confirmPassword.length > 0 ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm text-gray-600">Passwords match</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Extracted HelpSupport component - SIMPLIFIED TO EMAIL ONLY
const HelpSupport = () => (
  <div className="space-y-8">
    {/* Support Channels - EMAIL ONLY */}
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-800">Support</h3>
          <p className="text-gray-600 text-sm">Get help when you need it</p>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-8 border border-green-200/50 hover:shadow-lg transition-all duration-200 max-w-md w-full">
          <div className="flex items-center space-x-3 mb-4 justify-center">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <Mail className="w-6 h-6 text-white" />
            </div>
          </div>
          <h4 className="font-semibold text-green-800 text-center text-lg mb-2">Email Support</h4>
          <p className="text-green-700 text-sm mb-6 text-center">Contact us for any assistance</p>
          <a 
            href="mailto:echosys.ph@gmail.com"
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors w-full block text-center"
          >
            echosys.ph@gmail.com
          </a>
        </div>
      </div>
    </div>

    {/* Terms & Conditions */}
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
          <FileText className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-800">Terms & Conditions</h3>
          <p className="text-gray-600 text-sm">Read our terms of service</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200/50">
        <div className="prose prose-sm max-w-none">
          <h4 className="font-semibold text-gray-800 mb-4">VetCare Platform Terms of Service</h4>
          <div className="text-gray-600 space-y-4 text-sm">
            <h5 className="font-semibold text-amber-700">1. Account Registration and Verification</h5>
            <p>
              By registering as a veterinarian on Echo Portal, you agree to provide accurate and complete information about your professional credentials, including your license number, specialization, and years of experience. All information submitted will be verified by our administrative team.
            </p>

            <h5 className="font-semibold text-amber-700">2. Professional Conduct</h5>
            <p>
              You agree to maintain professional standards of conduct while using the platform. This includes providing accurate medical advice, maintaining client confidentiality, and adhering to veterinary ethics and regulations in the Philippines.
            </p>

            <h5 className="font-semibold text-amber-700">3. Data Privacy and Confidentiality</h5>
            <p>
              We are committed to protecting your personal and professional information. Your data will be stored securely and used only for platform functionality, verification purposes, and communication related to your account.
            </p>

            <h5 className="font-semibold text-amber-700">4. Platform Usage</h5>
            <p>
              The Echo Portal is designed for professional veterinary use. You agree not to misuse the platform for unauthorized purposes, including but not limited to spam, fraudulent activities, or distribution of harmful content.
            </p>

            <h5 className="font-semibold text-amber-700">5. Account Approval and Suspension</h5>
            <p>
              Account approval is subject to verification of your credentials. Echo Portal reserves the right to suspend or terminate accounts that violate these terms or provide false information. You will be notified of any account status changes.
            </p>

            <h5 className="font-semibold text-amber-700">6. Intellectual Property</h5>
            <p>
              All content and materials on the Echo Portal are protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without explicit permission.
            </p>

            <h5 className="font-semibold text-amber-700">7. Limitation of Liability</h5>
            <p>
              Echo Portal provides the platform as a service and is not liable for any direct or indirect damages arising from the use of the platform. Veterinary professionals are responsible for their own professional decisions and advice.
            </p>

            <h5 className="font-semibold text-amber-700">8. Amendments to Terms</h5>
            <p>
              We reserve the right to modify these terms and conditions at any time. Continued use of the platform after changes constitutes acceptance of the modified terms.
            </p>

          </div>
        </div>
      </div>
    </div>
  </div>
);

// Main Settings component
const Settings = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [activeTab, setActiveTab] = useState('security');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [vetProfile, setVetProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState({ profile: true });
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false
  });
  
  // API state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Security settings state
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: true,
    loginNotifications: true,
    sessionTimeout: '30',
    passwordExpiry: true,
    deviceTrust: false
  });

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    appointmentReminders: true,
    systemUpdates: true,
    securityAlerts: true,
    marketingEmails: false,
    weeklyReports: true,
    emergencyAlerts: true
  });

  // ---------------- FETCH NOTIFICATIONS ----------------
  const fetchNotifications = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/veterinarian/get_notifications/", {
        credentials: "include"
      });
      const data = await response.json();
      
      if (response.ok) {
        setNotifications(data.notifications || []);
        // Calculate unread count
        const unreadCount = data.notifications.filter(n => !n.read).length;
        setNotificationCount(unreadCount);
      } else {
        console.error("Error fetching notifications:", data.error);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  // ---------------- HANDLE NOTIFICATION MODAL CLOSE ----------------
  const handleNotificationModalClose = () => {
    setIsNotificationModalOpen(false);
    // Refresh notifications to get updated read status
    fetchNotifications();
  };

  // Profile display function
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

  // Check password requirements
  const checkPasswordRequirements = (password) => {
    setPasswordRequirements({
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?"_:{}|<>]/.test(password)
    });
  };

  // Handle password change
  const handlePasswordChange = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      const response = await fetch('http://localhost:8000/api/veterinarian/change_password/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          email: vetProfile?.vet_email || ''
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccessMessage(data.message || 'Password updated successfully');
        // Reset form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } else {
        if (data.errors) {
          // Handle field-specific errors
          const errorMessages = Object.values(data.errors).flat();
          setErrorMessage(errorMessages.join(' '));
        } else if (data.error) {
          setErrorMessage(data.error);
        } else {
          setErrorMessage('Failed to update password. Please try again.');
        }
      }
    } catch (error) {
      setErrorMessage('Network error. Please check your connection and try again.');
      console.error('Password change error:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchNotifications(); // Fetch notifications on component mount
  }, []);

  const tabs = [
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'help', label: 'Help & Support', icon: HelpCircle }
  ];

  const profileDisplay = getProfileDisplay();

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar
        isSidebarCollapsed={isSidebarCollapsed}
        isHovering={isHovering}
        setIsHovering={setIsHovering}
        activeSection="settings"
      />

      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Settings</h1>
          <div className="flex items-center space-x-4">
            {/* Notification Button with Count Badge */}
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

        {/* Settings Content */}
        <div className="flex-1 p-6 overflow-auto">
          {/* Tabs */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-md rounded-xl p-1 border border-gray-200">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'bg-green-500 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'security' && (
            <SecuritySettings 
              showCurrentPassword={showCurrentPassword}
              setShowCurrentPassword={setShowCurrentPassword}
              showNewPassword={showNewPassword}
              setShowNewPassword={setShowNewPassword}
              showConfirmPassword={showConfirmPassword}
              setShowConfirmPassword={setShowConfirmPassword}
              currentPassword={currentPassword}
              setCurrentPassword={setCurrentPassword}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              passwordRequirements={passwordRequirements}
              checkPasswordRequirements={checkPasswordRequirements}
              vetEmail={vetProfile?.vet_email || ''}
              handlePasswordChange={handlePasswordChange}
              isLoading={isLoading}
              errorMessage={errorMessage}
              successMessage={successMessage}
            />
          )}
          {activeTab === 'help' && <HelpSupport />}
        </div>
      </div>

      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
      
      {/* Notification Modal */}
      <NotificationModal 
        isOpen={isNotificationModalOpen} 
        onClose={handleNotificationModalClose} 
        notifications={notifications} 
      />
      
      <FloatingMessages />
    </div>
  );
};

export default Settings;