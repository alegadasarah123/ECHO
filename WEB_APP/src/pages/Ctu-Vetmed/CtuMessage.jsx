import supabase from "@/supabaseClient.js";
import { ArrowLeft, Building, Calendar, MapPin, Maximize2, MessageCircle, Phone, Search, Send, User, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// Add custom scrollbar styles to the document
const addScrollbarStyles = () => {
  if (document.getElementById('custom-scrollbar-styles')) return;
  
  const styleElement = document.createElement('style');
  styleElement.id = 'custom-scrollbar-styles';
  styleElement.textContent = `
    .custom-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: #cbd5e0 #f7fafc;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: #f7fafc;
      border-radius: 3px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #cbd5e0;
      border-radius: 3px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #a0aec0;
    }
    .hide-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
  `;
  document.head.appendChild(styleElement);
};

// Helper function to get initials from name
const getInitials = (name) => {
  if (!name) return "?";
  const cleanName = name.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const nameParts = cleanName.split(' ').filter(part => part.length > 0);
  if (nameParts.length === 0) return "?";
  if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
  return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
};

// Helper function to get predefined avatar for CTU and DVMF admins
const getPredefinedAvatar = (role, user) => {
  // Check for CTU roles
  if (role === 'Ctu-Admin' || role === 'Ctu-Vetmed') {
    return '/Images/logo1.png'; // CTU logo
  }
  // Check for DVMF roles
  if (role === 'Dvmf-Admin' || role === 'Dvmf') {
    return '/Images/dvmf.png'; // DVMF logo
  }
  // For other users, return their custom avatar if available
  return user?.avatar || null;
};

// Helper function to format date header
const formatDateHeader = (timestamp) => {
  if (!timestamp) return '';
  
  try {
    const messageDate = new Date(timestamp);
    if (isNaN(messageDate.getTime())) {
      return '';
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    
    if (messageDay.getTime() === today.getTime()) {
      return 'Today';
    } else if (messageDay.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return `${messageDate.getMonth() + 1}-${messageDate.getDate()}-${messageDate.getFullYear().toString().slice(-2)}`;
    }
  } catch (error) {
    return '';
  }
};

// Helper function to format message time only
const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  
  try {
    if (typeof timestamp === 'string' && (timestamp.includes('AM') || timestamp.includes('PM'))) {
      return timestamp;
    }
    
    const messageDate = new Date(timestamp);
    if (isNaN(messageDate.getTime())) {
      return '';
    }
    
    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    return '';
  }
};

// Helper function to calculate age from date of birth
const calculateAge = (dob) => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Helper function to format address
const formatAddress = (data, isVet = false, isKutsero = false) => {
  if (isVet) {
    const address = data.vet_address_is_clinic ? {
      street: data.vet_clinic_street,
      brgy: data.vet_clinic_brgy,
      city: data.vet_clinic_city,
      province: data.vet_clinic_province,
      zipcode: data.vet_clinic_zipcode
    } : {
      street: data.vet_street,
      brgy: data.vet_brgy,
      city: data.vet_city,
      province: data.vet_province,
      zipcode: data.vet_zipcode
    };
    
    const parts = [address.street, address.brgy, address.city, address.province].filter(Boolean);
    return parts.length > 0 ? `${parts.join(', ')} ${address.zipcode}` : 'Address not available';
  } else if (isKutsero) {
    // Kutsero address
    const parts = [data.kutsero_house_add, data.kutsero_brgy, data.kutsero_municipality || data.kutsero_city, data.kutsero_province].filter(Boolean);
    return parts.length > 0 ? `${parts.join(', ')} ${data.kutsero_zipcode}` : 'Address not available';
  } else {
    // Horse operator address
    const parts = [data.op_house_add, data.op_brgy, data.op_municipality || data.op_city, data.op_province].filter(Boolean);
    return parts.length > 0 ? `${parts.join(', ')} ${data.op_zipcode}` : 'Address not available';
  }
};

// ------------------ ROLE BADGE COMPONENT ------------------
const RoleBadge = ({ role, size = "default" }) => {
  if (!role) return null;

  // Define role colors and styles based on your requirements
  const roleStyles = {
    "Veterinarian": "bg-green-100 text-green-800 border border-green-200",
    "Kutsero": "bg-amber-100 text-amber-800 border border-amber-200",
    "Horse Operator": "bg-amber-100 text-amber-800 border border-amber-200",
    "Kutsero President": "bg-indigo-100 text-indigo-800 border border-indigo-200",
    "Dvmf": "bg-blue-100 text-blue-800 border border-blue-200",
    "Dvmf-Admin": "bg-blue-100 text-blue-800 border border-blue-200",
    "Ctu-Vetmed": "bg-red-100 text-red-800 border border-red-200",
    "Ctu-Admin": "bg-red-100 text-red-800 border border-red-200",
  };

  const sizeClasses = {
    default: "px-2 py-0.5 text-xs",
    small: "px-1.5 py-0.5 text-xs"
  };

  const defaultStyle = "bg-gray-100 text-gray-800 border border-gray-200";

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${roleStyles[role] || defaultStyle} ${sizeClasses[size]}`}>
      {role}
    </span>
  );
};

// ------------------ VETERINARIAN PROFILE MODAL ------------------
const VeterinarianProfileModal = ({ user, profileData, isOpen, onClose }) => {
  if (!isOpen || !user || !profileData) return null;

  const cleanName = user.name ? user.name.replace(/\s*\([^)]*\)\s*$/, '').trim() : 'Unknown User';
  const age = calculateAge(profileData.vet_dob);
  const fullName = `${profileData.vet_fname} ${profileData.vet_mname || ''} ${profileData.vet_lname}`.trim();
  const address = formatAddress(profileData, true);

  // State for enlarged profile photo
  const [showEnlargedPhoto, setShowEnlargedPhoto] = useState(false);

  return (
    <>
      <div className="fixed inset-0 z-1001 flex items-center justify-center backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col">
          <div className="relative bg-gradient-to-r from-[#b91c1c] to-[#7f1d1d] pt-16 pb-6 flex-shrink-0">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-all z-10 shadow-lg"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
            
            <div className="flex justify-center">
              <div 
                onClick={() => setShowEnlargedPhoto(true)}
                className="w-24 h-24 bg-gradient-to-br from-[#b91c1c] to-[#7f1d1d] rounded-full border-4 border-white flex items-center justify-center text-white text-2xl font-bold shadow-lg cursor-pointer hover:scale-105 transition-transform duration-200 overflow-hidden"
              >
                {profileData.vet_profile_photo ? (
                  <img 
                    src={profileData.vet_profile_photo} 
                    alt={cleanName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials(cleanName)
                )}
              </div>
            </div>

            {/* Name and Role */}
            <div className="text-center mt-4">
              <h2 className="text-xl font-bold text-white mb-2">{cleanName}</h2>
              <div className="flex justify-center">
                <RoleBadge role={user.role} />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Online Status */}
            <div className="flex items-center justify-center gap-2 py-4 bg-white border-b border-gray-100 flex-shrink-0">
              <div className={`w-3 h-3 rounded-full ${user.online ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm text-gray-600">
                {user.online ? "Active now" : "Offline"}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="space-y-4">
                {/* Full Name */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="w-5 h-5 text-[#b91c1c] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500 mb-1">Full Name</p>
                    <p className="text-sm text-gray-900 break-words">{fullName}</p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-[#b91c1c] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500 mb-1">Phone</p>
                    <p className="text-sm text-gray-900 break-words">{profileData.vet_phone_num || 'Not provided'}</p>
                  </div>
                </div>

                {/* Age and Gender */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-[#b91c1c] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500 mb-1">Age & Gender</p>
                    <p className="text-sm text-gray-900">
                      {age ? `${age} years old` : 'Age not specified'}, {profileData.vet_sex || 'Not specified'}
                    </p>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-[#b91c1c] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500 mb-1">
                      {profileData.vet_address_is_clinic ? 'Clinic Address' : 'Home Address'}
                    </p>
                    <p className="text-sm text-gray-900 break-words">{address}</p>
                  </div>
                </div>

                {/* Member Since */}
                {profileData.created_at && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-[#b91c1c] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-500 mb-1">Member since</p>
                      <p className="text-sm text-gray-900">
                        {new Date(profileData.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Specialization */}
                {profileData.vet_specialization && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <User className="w-5 h-5 text-[#b91c1c] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-500 mb-1">Specialization</p>
                      <p className="text-sm text-gray-900 break-words">{profileData.vet_specialization}</p>
                    </div>
                  </div>
                )}

                {/* Organization */}
                {profileData.vet_org && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <Building className="w-5 h-5 text-[#b91c1c] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-500 mb-1">Organization</p>
                      <p className="text-sm text-gray-900 break-words">{profileData.vet_org}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEnlargedPhoto && (
        <div 
          className="fixed inset-0 z-1002 flex items-center justify-center bg-black bg-opacity-90 p-4"
          onClick={() => setShowEnlargedPhoto(false)}
        >
          <div className="relative max-w-2xl w-full max-h-full">
            <button
              onClick={() => setShowEnlargedPhoto(false)}
              className="absolute -top-12 right-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-all shadow-lg z-10"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="bg-white rounded-lg overflow-hidden max-w-sm w-full mx-auto">
              {profileData.vet_profile_photo ? (
                <img 
                  src={profileData.vet_profile_photo} 
                  alt={cleanName}
                  className="w-full h-96 object-contain bg-gray-100"
                />
              ) : (
                <div className="w-full h-96 bg-gradient-to-br from-[#b91c1c] to-[#7f1d1d] flex items-center justify-center">
                  <span className="text-white text-6xl font-bold">
                    {getInitials(cleanName)}
                  </span>
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}
    </>
  );
};

// ------------------ HORSE OPERATOR PROFILE MODAL ------------------
const HorseOperatorProfileModal = ({ user, profileData, isOpen, onClose }) => {
  if (!isOpen || !user || !profileData) return null;

  const cleanName = user.name ? user.name.replace(/\s*\([^)]*\)\s*$/, '').trim() : 'Unknown User';
  const age = calculateAge(profileData.op_dob);
  const fullName = `${profileData.op_fname} ${profileData.op_mname || ''} ${profileData.op_lname}`.trim();
  const address = formatAddress(profileData, false);

  // State for enlarged profile photo
  const [showEnlargedPhoto, setShowEnlargedPhoto] = useState(false);

  return (
    <>
      <div className="fixed inset-0 z-1001 flex items-center justify-center backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col">
          <div className="relative bg-gradient-to-r from-[#b91c1c] to-[#7f1d1d] pt-16 pb-6 flex-shrink-0">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-all z-10 shadow-lg"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
            
            <div className="flex justify-center">
              <div 
                onClick={() => setShowEnlargedPhoto(true)}
                className="w-24 h-24 bg-gradient-to-br from-[#b91c1c] to-[#7f1d1d] rounded-full border-4 border-white flex items-center justify-center text-white text-2xl font-bold shadow-lg cursor-pointer hover:scale-105 transition-transform duration-200 overflow-hidden"
              >
                {profileData.op_image ? (
                  <img 
                    src={profileData.op_image} 
                    alt={cleanName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials(cleanName)
                )}
              </div>
            </div>

            {/* Name and Role */}
            <div className="text-center mt-4">
              <h2 className="text-xl font-bold text-white mb-2">{cleanName}</h2>
              <div className="flex justify-center">
                <RoleBadge role={user.role} />
              </div>
            </div>
          </div>

          {/* Content - PROPER SCROLLABLE AREA */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Online Status */}
            <div className="flex items-center justify-center gap-2 py-4 bg-white border-b border-gray-100 flex-shrink-0">
              <div className={`w-3 h-3 rounded-full ${user.online ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm text-gray-600">
                {user.online ? "Active now" : "Offline"}
              </span>
            </div>

            {/* Profile Details - SCROLLABLE CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="space-y-4">
                {/* Full Name */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="w-5 h-5 text-[#b91c1c] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500 mb-1">Full Name</p>
                    <p className="text-sm text-gray-900 break-words">{fullName}</p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-[#b91c1c] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500 mb-1">Phone</p>
                    <p className="text-sm text-gray-900 break-words">{profileData.op_phone_num || 'Not provided'}</p>
                  </div>
                </div>

                {/* Age and Gender */}
                {profileData.op_dob && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-[#b91c1c] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-500 mb-1">Age & Gender</p>
                      <p className="text-sm text-gray-900">
                        {age ? `${age} years old` : 'Age not specified'}, {profileData.op_sex || 'Not specified'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Address */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-[#b91c1c] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500 mb-1">Address</p>
                    <p className="text-sm text-gray-900 break-words">{address}</p>
                  </div>
                </div>

                {/* Member Since */}
                {profileData.created_at && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-[#b91c1c] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-500 mb-1">Member since</p>
                      <p className="text-sm text-gray-900">
                        {new Date(profileData.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEnlargedPhoto && (
        <div 
          className="fixed inset-0 z-1002 flex items-center justify-center bg-black bg-opacity-90 p-4"
          onClick={() => setShowEnlargedPhoto(false)}
        >
          <div className="relative max-w-2xl w-full max-h-full">
            <button
              onClick={() => setShowEnlargedPhoto(false)}
              className="absolute -top-12 right-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-all shadow-lg z-10"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="bg-white rounded-lg overflow-hidden max-w-sm w-full mx-auto">
              {profileData.op_image ? (
                <img 
                  src={profileData.op_image} 
                  alt={cleanName}
                  className="w-full h-96 object-contain bg-gray-100"
                />
              ) : (
                <div className="w-full h-96 bg-gradient-to-br from-[#b91c1c] to-[#7f1d1d] flex items-center justify-center">
                  <span className="text-white text-6xl font-bold">
                    {getInitials(cleanName)}
                  </span>
                </div>
              )}
            </div>          
          </div>
        </div>
      )}
    </>
  );
};

// ------------------ KUTSERO PROFILE MODAL ------------------
const KutseroProfileModal = ({ user, profileData, isOpen, onClose }) => {
  if (!isOpen || !user || !profileData) return null;

  const cleanName = user.name ? user.name.replace(/\s*\([^)]*\)\s*$/, '').trim() : 'Unknown User';
  const age = calculateAge(profileData.kutsero_dob);
  const fullName = `${profileData.kutsero_fname} ${profileData.kutsero_mname || ''} ${profileData.kutsero_lname}`.trim();
  const address = formatAddress(profileData, false, true);

  // State for enlarged profile photo
  const [showEnlargedPhoto, setShowEnlargedPhoto] = useState(false);

  return (
    <>
      <div className="fixed inset-0 z-1001 flex items-center justify-center backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col">
          <div className="relative bg-gradient-to-r from-[#b91c1c] to-[#7f1d1d] pt-16 pb-6 flex-shrink-0">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-all z-10 shadow-lg"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
            
            <div className="flex justify-center">
              <div 
                onClick={() => setShowEnlargedPhoto(true)}
                className="w-24 h-24 bg-gradient-to-br from-[#b91c1c] to-[#7f1d1d] rounded-full border-4 border-white flex items-center justify-center text-white text-2xl font-bold shadow-lg cursor-pointer hover:scale-105 transition-transform duration-200 overflow-hidden"
              >
                {profileData.kutsero_image ? (
                  <img 
                    src={profileData.kutsero_image} 
                    alt={cleanName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials(cleanName)
                )}
              </div>
            </div>

            {/* Name and Role */}
            <div className="text-center mt-4">
              <h2 className="text-xl font-bold text-white mb-2">{cleanName}</h2>
              <div className="flex justify-center">
                <RoleBadge role={user.role} />
              </div>
            </div>
          </div>

          {/* Content - PROPER SCROLLABLE AREA */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Online Status */}
            <div className="flex items-center justify-center gap-2 py-4 bg-white border-b border-gray-100 flex-shrink-0">
              <div className={`w-3 h-3 rounded-full ${user.online ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm text-gray-600">
                {user.online ? "Active now" : "Offline"}
              </span>
            </div>

            {/* Profile Details - SCROLLABLE CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="space-y-4">
                {/* Full Name */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="w-5 h-5 text-[#b91c1c] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500 mb-1">Full Name</p>
                    <p className="text-sm text-gray-900 break-words">{fullName}</p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-[#b91c1c] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500 mb-1">Phone</p>
                    <p className="text-sm text-gray-900 break-words">{profileData.kutsero_phone_num || 'Not provided'}</p>
                  </div>
                </div>

                {/* Age and Gender */}
                {profileData.kutsero_dob && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-[#b91c1c] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-500 mb-1">Age & Gender</p>
                      <p className="text-sm text-gray-900">
                        {age ? `${age} years old` : 'Age not specified'}, {profileData.kutsero_sex || 'Not specified'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Address */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-[#b91c1c] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500 mb-1">Address</p>
                    <p className="text-sm text-gray-900 break-words">{address}</p>
                  </div>
                </div>

                {/* Username */}
                {profileData.kutsero_username && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <User className="w-5 h-5 text-[#b91c1c] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-500 mb-1">Username</p>
                      <p className="text-sm text-gray-900 break-words">{profileData.kutsero_username}</p>
                    </div>
                  </div>
                )}

                {/* Member Since */}
                {profileData.created_at && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-[#b91c1c] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-500 mb-1">Member since</p>
                      <p className="text-sm text-gray-900">
                        {new Date(profileData.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEnlargedPhoto && (
        <div 
          className="fixed inset-0 z-1002 flex items-center justify-center bg-black bg-opacity-90 p-4"
          onClick={() => setShowEnlargedPhoto(false)}
        >
          <div className="relative max-w-2xl w-full max-h-full">
            <button
              onClick={() => setShowEnlargedPhoto(false)}
              className="absolute -top-12 right-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-all shadow-lg z-10"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="bg-white rounded-lg overflow-hidden max-w-sm w-full mx-auto">
              {profileData.kutsero_image ? (
                <img 
                  src={profileData.kutsero_image} 
                  alt={cleanName}
                  className="w-full h-96 object-contain bg-gray-100"
                />
              ) : (
                <div className="w-full h-96 bg-gradient-to-br from-[#b91c1c] to-[#7f1d1d] flex items-center justify-center">
                  <span className="text-white text-6xl font-bold">
                    {getInitials(cleanName)}
                  </span>
                </div>
              )}
            </div>          
          </div>
        </div>
      )}
    </>
  );
};

// ------------------ CTU VET PROFILE MODAL ------------------
const CtuVetProfileModal = ({ user, profileData, isOpen, onClose }) => {
  if (!isOpen || !user) return null;

  const cleanName = user.name ? user.name.replace(/\s*\([^)]*\)\s*$/, '').trim() : 'CTU VetMed';
  const fullName = profileData ? `${profileData.ctu_fname || ''} ${profileData.ctu_lname || ''}`.trim() : cleanName;

  return (
    <div className="fixed inset-0 z-1001 flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="relative bg-gradient-to-r from-[#b91c1c] to-[#7f1d1d] pt-15 pb-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-all z-10 shadow-lg"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
          
          <div className="flex flex-col items-center justify-center">
            <div className="w-28 h-28 bg-transparent rounded-full flex items-center justify-center mb-0">
              <img 
                src="/Images/logo1.png" 
                alt="CTU Logo"
                className="w-45 h-45 object-cover"
              />
            </div>
            
            <div className="text-center mt-2">
              <h2 className="text-xl font-bold text-white leading-tight">{fullName}</h2>
              <div className="flex justify-center mt-1">
                <RoleBadge role={user.role} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Online Status */}
          <div className="flex items-center justify-center gap-2 py-4 bg-white border-b border-gray-100 flex-shrink-0">
            <div className={`w-3 h-3 rounded-full ${user.online ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="text-sm text-gray-600">
              {user.online ? "Active now" : "Offline"}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="space-y-4">
              {/* Full Name */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <User className="w-5 h-5 text-[#b91c1c] mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-500 mb-1">Full Name</p>
                  <p className="text-sm text-gray-900 break-words">{fullName || 'Not provided'}</p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Phone className="w-5 h-5 text-[#b91c1c] mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-500 mb-1">Phone</p>
                  <p className="text-sm text-gray-900 break-words">{profileData?.ctu_phonenum || 'Not provided'}</p>
                </div>
              </div>

              {/* Organization */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Building className="w-5 h-5 text-[#b91c1c] mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-500 mb-1">Organization</p>
                  <p className="text-sm text-gray-900 break-words">Cebu Technological University - Veterinary Medicine</p>
                </div>
              </div>

              {/* Member Since */}
              {profileData?.created_at && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-[#b91c1c] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500 mb-1">Member since</p>
                    <p className="text-sm text-gray-900">
                      {new Date(profileData.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ------------------ DVMF USER PROFILE MODAL ------------------
const DvmfUserProfileModal = ({ user, profileData, isOpen, onClose }) => {
  if (!isOpen || !user) return null;

  const cleanName = user.name ? user.name.replace(/\s*\([^)]*\)\s*$/, '').trim() : 'DVMF Admin';
  const fullName = profileData ? `${profileData.dvmf_fname || ''} ${profileData.dvmf_lname || ''}`.trim() : cleanName;

  return (
    <div className="fixed inset-0 z-1001 flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="relative bg-gradient-to-r from-[#b91c1c] to-[#7f1d1d] pt-16 pb-6 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-all z-10 shadow-lg"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
          
          <div className="flex justify-center">
            <div className="w-28 h-28 bg-transparent rounded-full flex items-center justify-center">
              <img 
                src="/Images/dvmf.png" 
                alt="DVMF Logo"
                className="w-45 h-45 object-cover"
              />
            </div>
          </div>

          {/* Name and Role */}
          <div className="text-center mt-4">
            <h2 className="text-xl font-bold text-white mb-2">{fullName}</h2>
            <div className="flex justify-center">
              <RoleBadge role={user.role} />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Online Status */}
          <div className="flex items-center justify-center gap-2 py-4 bg-white border-b border-gray-100 flex-shrink-0">
            <div className={`w-3 h-3 rounded-full ${user.online ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="text-sm text-gray-600">
              {user.online ? "Active now" : "Offline"}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="space-y-4">
              {/* Full Name */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <User className="w-5 h-5 text-[#b91c1c] mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-500 mb-1">Full Name</p>
                  <p className="text-sm text-gray-900 break-words">{fullName || 'Not provided'}</p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Phone className="w-5 h-5 text-[#b91c1c] mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-500 mb-1">Phone</p>
                  <p className="text-sm text-gray-900 break-words">{profileData?.dvmf_phonenum || 'Not provided'}</p>
                </div>
              </div>

              {/* Organization */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Building className="w-5 h-5 text-[#b91c1c] mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-500 mb-1">Organization</p>
                  <p className="text-sm text-gray-900 break-words">Department of Veterinary Medicine and Fisheries</p>
                </div>
              </div>

              {/* Member Since */}
              {profileData?.created_at && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-[#b91c1c] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500 mb-1">Member since</p>
                    <p className="text-sm text-gray-900">
                      {new Date(profileData.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ------------------ PROFILE MODAL HANDLER ------------------
const ProfileModalHandler = ({ user, isOpen, onClose }) => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchProfileData();
    }
  }, [isOpen, user]);

  const fetchProfileData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let endpoint = '';
      
      if (user.role === 'Veterinarian') {
        endpoint = `https://echo-ebl8.onrender.com/api/ctu_vetmed/vet_profile_by_id/${user.id}/`;
      } else if (user.role === 'Horse Operator') {
        endpoint = `https://echo-ebl8.onrender.com/api/ctu_vetmed/horse_operator_profile_by_id/${user.id}/`;
      } else if (user.role === 'Kutsero') {
        endpoint = `https://echo-ebl8.onrender.com/api/ctu_vetmed/kutsero_profile_by_id/${user.id}/`;
      } else if (user.role === 'Ctu-Vetmed' || user.role === 'Ctu-Admin') {
        endpoint = `https://echo-ebl8.onrender.com/api/ctu_vetmed/ctu_vet_profile_by_id/${user.id}/`;
      } else if (user.role === 'Dvmf' || user.role === 'Dvmf-Admin') {
        endpoint = `https://echo-ebl8.onrender.com/api/ctu_vetmed/dvmf_user_profile_by_id/${user.id}/`;
      }

      if (endpoint) {
        const res = await fetch(endpoint, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setProfileData(data);
        }
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  // Only show modals for specific roles
  const allowedRoles = ['Veterinarian', 'Horse Operator', 'Kutsero', 'Ctu-Vetmed', 'Ctu-Admin', 'Dvmf', 'Dvmf-Admin'];
  if (!allowedRoles.includes(user.role)) {
    return null;
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-1001 flex items-center justify-center backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#b91c1c] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (user.role === 'Veterinarian') {
    return (
      <VeterinarianProfileModal
        user={user}
        profileData={profileData}
        isOpen={isOpen}
        onClose={onClose}
      />
    );
  } else if (user.role === 'Horse Operator') {
    return (
      <HorseOperatorProfileModal
        user={user}
        profileData={profileData}
        isOpen={isOpen}
        onClose={onClose}
      />
    );
  } else if (user.role === 'Kutsero') {
    return (
      <KutseroProfileModal
        user={user}
        profileData={profileData}
        isOpen={isOpen}
        onClose={onClose}
      />
    );
  } else if (user.role === 'Ctu-Vetmed' || user.role === 'Ctu-Admin') {
    return (
      <CtuVetProfileModal
        user={user}
        profileData={profileData}
        isOpen={isOpen}
        onClose={onClose}
      />
    );
  } else if (user.role === 'Dvmf' || user.role === 'Dvmf-Admin') {
    return (
      <DvmfUserProfileModal
        user={user}
        profileData={profileData}
        isOpen={isOpen}
        onClose={onClose}
      />
    );
  }

  return null;
};

// ------------------ NAME WITH ROLE COMPONENT ------------------
const NameWithRole = ({ name, role, showRole = true, onClick, clickable = true, inChatView = false, isFullscreen = false }) => {
  // Extract clean name without role in parentheses
  const cleanName = name ? name.replace(/\s*\([^)]*\)\s*$/, '').trim() : '';
  
  // Only make names clickable in chat view
  const shouldBeClickable = clickable && inChatView;
  
  return (
    <div className={`flex ${isFullscreen ? 'items-center gap-2' : 'flex-col'}`}>
      <span 
        onClick={shouldBeClickable ? onClick : undefined}
        className={`font-semibold text-gray-900 ${shouldBeClickable ? 'hover:text-blue-600 cursor-pointer transition-colors' : ''}`}
      >
        {cleanName}
      </span>
      {showRole && role && inChatView && (
        <div className={isFullscreen ? '' : 'mt-1'}>
          <RoleBadge role={role} size="small" />
        </div>
      )}
    </div>
  );
};

// ------------------ AVATAR COMPONENT ------------------
const Avatar = ({ user, size = "md", onClick, clickable = true, inChatView = false }) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-14 h-14 text-2xl"
  };

  const shouldBeClickable = clickable && inChatView;
  const predefinedAvatar = getPredefinedAvatar(user?.role, user);

  // Special case: make CTU and DVMF avatars larger
  const isCtuOrDvmf =
    user?.role?.toLowerCase().includes("ctu") ||
    user?.role?.toLowerCase().includes("dvmf");

  // Apply larger size for CTU/DVMF in conversation list and chat view
  const customSize = isCtuOrDvmf ? "xl" : size; // Use 'lg' size for CTU/DVMF
  const customScale = isCtuOrDvmf ? "scale-125" : "scale-110";

  const avatarContent = predefinedAvatar ? (
    <div
      className={`${sizeClasses[customSize]} rounded-full flex items-center justify-center overflow-hidden ${
        shouldBeClickable ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
      } ${isCtuOrDvmf ? "bg-transparent" : "bg-white"}`}
      onClick={shouldBeClickable ? onClick : undefined}
    >
      <img
        src={predefinedAvatar}
        alt={user?.name || "User"}
        className={`w-full h-full object-cover rounded-full ${customScale}`}
        style={{ objectFit: "cover" }}
      />
    </div>
  ) : user?.avatar ? (
    <img
      src={user.avatar}
      alt={user?.name || "User"}
      className={`${sizeClasses[size]} rounded-full object-cover ${
        shouldBeClickable ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
      }`}
      onClick={shouldBeClickable ? onClick : undefined}
    />
  ) : (
    <div
      className={`${sizeClasses[size]} bg-gradient-to-br from-[#b91c1c] to-[#7f1d1d] rounded-full flex items-center justify-center text-white font-semibold ${
        shouldBeClickable ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
      }`}
      onClick={shouldBeClickable ? onClick : undefined}
    >
      {getInitials(user?.name)}
    </div>
  );

  return avatarContent;
};

// ------------------ TYPING INDICATOR COMPONENT ------------------
const TypingIndicator = () => {
  return (
    <div className="flex items-center space-x-1">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
};

// ------------------ MESSAGES WITH DATE HEADERS COMPONENT ------------------
const MessagesWithDateHeaders = ({ messages, isTyping, isNewConversation, isEmptyConversation }) => {
  if ((isNewConversation || isEmptyConversation) && (!messages || messages.length === 0)) {
    return (
      <div className="flex justify-center my-8">
        <div className="text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md">
            <MessageCircle className="w-12 h-12 text-blue-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isNewConversation ? "Start a conversation" : "No messages yet"}
            </h3>
            <p className="text-gray-600 text-sm">
              {isNewConversation 
                ? "Send a message to start chatting and build your connection" 
                : "Be the first to send a message in this conversation"
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If there are messages, show them normally
  if (!messages || messages.length === 0) {
    return null;
  }

  // Group messages by date
  const groupedMessages = [];
  let currentDate = null;
  let currentGroup = [];

  messages.forEach((message, index) => {
    const messageDate = formatDateHeader(message.originalTimestamp || message.timestamp);
    
    if (messageDate !== currentDate) {
      // Push previous group if exists
      if (currentGroup.length > 0) {
        groupedMessages.push({
          date: currentDate,
          messages: [...currentGroup]
        });
      }
      // Start new group
      currentDate = messageDate;
      currentGroup = [message];
    } else {
      // Add to current group
      currentGroup.push(message);
    }
    
    // Push the last group
    if (index === messages.length - 1) {
      groupedMessages.push({
        date: currentDate,
        messages: [...currentGroup]
      });
    }
  });

  return (
    <>
      {groupedMessages.map((group, groupIndex) => (
        <div key={groupIndex}>
          <div className="flex justify-center my-4">
            <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
              {group.date}
            </div>
          </div>
          
          {group.messages.map((message, messageIndex) => (
            <div
              key={message.id || messageIndex}
              className={`flex ${
                message.isOwn ? "justify-end" : "justify-start"
              } mb-4`}
            >
              <div
                className={`max-w-xs lg:max-w-md ${
                  message.isOwn ? "order-1" : "order-2"
                }`}
              >
                <div
                  className={`px-4 py-2 rounded-2xl text-sm ${
                    message.isOwn
                      ? "bg-blue-500 text-white rounded-br-md"
                      : "bg-white text-gray-800 rounded-bl-md shadow-sm"
                  }`}
                >
                  {message.content}
                </div>
                <div
                  className={`text-xs text-gray-500 mt-1 px-1 ${
                    message.isOwn ? "text-right" : "text-left"
                  }`}
                >
                  {formatMessageTime(message.timestamp)}
                </div>
                
                {message.isOwn && 
                 messageIndex === group.messages.length - 1 && 
                 groupIndex === groupedMessages.length - 1 && 
                 message.is_read === true && (
                  <div className="text-right mt-1">
                    <span className="text-xs text-blue-500 font-medium">Seen</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
      
      {/* Typing Indicator */}
      {isTyping && (
        <div className="flex justify-start mb-4">
          <div className="max-w-xs lg:max-w-md order-2">
            <div className="px-4 py-2 rounded-2xl text-sm bg-white text-gray-800 rounded-bl-md shadow-sm">
              <TypingIndicator />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ------------------ CONVERSATION LIST ITEM COMPONENT ------------------
const ConversationListItem = ({ 
  conversation, 
  isSelected, 
  onSelect,
  onProfileClick 
}) => {
  // Check if there are unread messages
  const hasUnread = conversation.unread > 0;
  
  // Names are NOT clickable in conversation lists
  const isProfileClickable = false;

  return (
    <div
      onClick={() => onSelect(conversation)}
      className={`flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors ${
        isSelected ? 'bg-blue-50 border-blue-200' : ''
      }`}
    >
      <div className="relative">
        <Avatar 
          user={conversation} 
          size="lg" 
          onClick={(e) => {
            e.stopPropagation();
            if (isProfileClickable) {
              onProfileClick(conversation);
            }
          }}
          clickable={isProfileClickable}
          inChatView={false}
        />
        {conversation.online && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 text-sm">
              {conversation.name ? conversation.name.replace(/\s*\([^)]*\)\s*$/, '').trim() : ''}
            </span>
            {hasUnread && (
              <div className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                {conversation.unread > 9 ? '9+' : conversation.unread}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <p className={`text-sm truncate flex-1 mr-2 ${
            hasUnread 
              ? "font-semibold text-gray-900" 
              : "text-gray-600"
          }`}>
            {conversation.lastMessage || "Tap to chat"}
          </p>
          <span className={`text-xs whitespace-nowrap ${
            hasUnread ? "font-semibold text-gray-900" : "text-gray-500"
          }`}>
            {conversation.timestamp || ""}
          </span>
        </div>
      </div>
    </div>
  );
};

// ------------------ CHAT HEADER COMPONENT ------------------
const ChatHeader = ({ 
  conversation, 
  onBack, 
  isTyping, 
  showBackButton = true,
  onProfileClick,
  isFullscreen = false 
}) => {
  // Names and avatars ARE clickable in chat view for specific roles
  const isProfileClickable = conversation.role === 'Veterinarian' || 
                           conversation.role === 'Horse Operator' || 
                           conversation.role === 'Kutsero' ||
                           conversation.role === 'Ctu-Vetmed' || 
                           conversation.role === 'Ctu-Admin' || 
                           conversation.role === 'Dvmf' || 
                           conversation.role === 'Dvmf-Admin';

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-3">
        {showBackButton && (
          <button
            onClick={onBack}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
        )}
        <div className="relative">
          <Avatar 
            user={conversation} 
            size="md" 
            onClick={() => isProfileClickable && onProfileClick(conversation)}
            clickable={isProfileClickable}
            inChatView={true}
          />
          {/* Removed green circle - using "Active now" text with green circle instead */}
        </div>
        <div className="flex flex-col">
          <NameWithRole 
            name={conversation.name} 
            role={conversation.role}
            showRole={true}
            onClick={() => isProfileClickable && onProfileClick(conversation)}
            clickable={isProfileClickable}
            inChatView={true}
            isFullscreen={isFullscreen}
          />
          <div className="flex items-center gap-2 mt-0.5">
            <div className={`w-2 h-2 rounded-full ${conversation.online ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="text-xs text-gray-500">
              {isTyping ? (
                <span className="text-green-500">typing...</span>
              ) : (
                conversation.online ? "Active now" : "Offline"
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ------------------ CHAT VIEW COMPONENT ------------------
const ChatView = ({
  conversation,
  newMessage,
  setNewMessage,
  handleSendMessage,
  setSelectedConversation,
  currentUserId,
  isTyping,
  handleTypingStart,
  handleTypingStop,
  showBackButton = true,
  isNewConversation = false,
  isEmptyConversation = false,
  onProfileClick,
  isFullscreen = false,
}) => {
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTypingRef = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages, isTyping]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
      handleTypingStop();
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);

    const now = Date.now();
    if (now - lastTypingRef.current > 500) {
      if (value.length > 0) {
        handleTypingStart();
      } else {
        handleTypingStop();
      }
      lastTypingRef.current = now;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 1500);
  };

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">No conversation selected</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        conversation={conversation}
        onBack={() => setSelectedConversation(null)}
        isTyping={isTyping}
        showBackButton={showBackButton}
        onProfileClick={onProfileClick}
        isFullscreen={isFullscreen}
      />

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 bg-gray-50 custom-scrollbar"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e0 #f7fafc',
        }}
      >
        <MessagesWithDateHeaders 
          messages={conversation.messages || []} 
          isTyping={isTyping}
          isNewConversation={isNewConversation}
          isEmptyConversation={isEmptyConversation}
        />
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 bg-white border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={(!conversation.messages || conversation.messages.length === 0) ? "Send your first message..." : "Type a message... (Press Enter to send)"}
              className="flex-1 bg-transparent text-sm focus:outline-none"
            />
          </div>
          <button
            onClick={() => {
              handleSendMessage();
              handleTypingStop();
            }}
            disabled={!newMessage.trim()}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              newMessage.trim()
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ------------------ CONVERSATION LIST COMPONENT ------------------
const ConversationList = ({
  searchTerm,
  setSearchTerm,
  filteredConversations,
  handleSelectConversation,
  isSearching,
  allUsers,
  currentUserId,
  selectedConversation,
  onProfileClick,
}) => {
  const displayConversations = isSearching ? allUsers : filteredConversations;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={isSearching ? "Search all users..." : "Search conversations..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => {
              if (!isSearching) {
                setSearchTerm("");
              }
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div 
          className="max-h-full overflow-y-auto custom-scrollbar"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#cbd5e0 #f7fafc',
          }}
        >
          {!displayConversations || displayConversations.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <p className="text-sm">
                {isSearching ? "No users found" : "No conversations found"}
              </p>
            </div>
          ) : (
            displayConversations.map((conversation) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedConversation?.id === conversation.id}
                onSelect={handleSelectConversation}
                onProfileClick={onProfileClick}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ------------------ MAIN FLOATING MESSAGES COMPONENT ------------------
const FloatingMessages = () => {
  const [viewState, setViewState] = useState("closed");
  const [conversations, setConversations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [conversationMessages, setConversationMessages] = useState({}); 
  const [profileModal, setProfileModal] = useState({ isOpen: false, user: null });
  
  const messagesSubscriptionRef = useRef(null);
  const typingChannelRef = useRef(null);
  const onlineChannelRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const selectedConversationRef = useRef(null);
  const currentUserIdRef = useRef(null);

  // Add scrollbar styles when component mounts
  useEffect(() => {
    addScrollbarStyles();
  }, []);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
    currentUserIdRef.current = currentUserId;
  }, [selectedConversation, currentUserId]);

  // Setup online presence
  const setupOnlinePresence = useCallback(async () => {
    if (!currentUserId) return;

    // Remove existing channel if any
    if (onlineChannelRef.current) {
      supabase.removeChannel(onlineChannelRef.current);
    }

    // Create presence channel
    onlineChannelRef.current = supabase.channel('online-users', {
      config: {
        presence: {
          key: currentUserId.toString(),
        },
      },
    });

    // Track presence state changes
    onlineChannelRef.current
      .on('presence', { event: 'sync' }, () => {
        const state = onlineChannelRef.current.presenceState();
        const onlineUserIds = new Set();
        
        Object.keys(state).forEach(key => {
          onlineUserIds.add(key);
        });
        
        setOnlineUsers(onlineUserIds);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUsers(prev => new Set([...prev, key]));
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await onlineChannelRef.current.track({
            user_id: currentUserId,
            online_at: new Date().toISOString(),
            last_seen: new Date().toISOString(),
          });
        }
      });
  }, [currentUserId]);

  useEffect(() => {
    fetchCurrentUserId();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchConversations();
      fetchAllUsers();
      setupOnlinePresence();
    }

    return () => {
      if (messagesSubscriptionRef.current) {
        messagesSubscriptionRef.current.unsubscribe();
      }
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
      }
      if (onlineChannelRef.current) {
        supabase.removeChannel(onlineChannelRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentUserId, setupOnlinePresence]);

  const fetchCurrentUserId = async () => {
    try {
      const res = await fetch("https://echo-ebl8.onrender.com/api/ctu_vetmed/ctu_vet_profile/", {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUserId(data.profile?.ctu_id);
      }
    } catch (error) {
      console.error("Error fetching current user ID:", error);
    }
  };

  const handleTypingStart = useCallback(() => {
    if (!selectedConversation || !currentUserId) return;

    if (typingChannelRef.current) {
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: currentUserId,
          receiverId: selectedConversation.id,
          isTyping: true,
          timestamp: Date.now()
        }
      });
    }
  }, [selectedConversation, currentUserId]);

  const handleTypingStop = useCallback(() => {
    if (!selectedConversation || !currentUserId) return;

    if (typingChannelRef.current) {
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: currentUserId,
          receiverId: selectedConversation.id,
          isTyping: false,
          timestamp: Date.now()
        }
      });
    }
  }, [selectedConversation, currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;

    if (messagesSubscriptionRef.current) {
      messagesSubscriptionRef.current.unsubscribe();
    }
    if (typingChannelRef.current) {
      supabase.removeChannel(typingChannelRef.current);
    }

    // Messages subscription
    messagesSubscriptionRef.current = supabase
      .channel('global-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message',
        },
        async (payload) => {
          const newMessageData = payload.new;
          
          const currentSelectedConv = selectedConversationRef.current;
          const currentUserId = currentUserIdRef.current;
          
          const involvesCurrentUser = 
            newMessageData.user_id === currentUserId || 
            newMessageData.receiver_id === currentUserId;
          
          if (involvesCurrentUser) {
            if (newMessageData.user_id === currentUserId) {
              return;
            }
            
            await fetchConversations();
            
            if (currentSelectedConv) {
              const isForCurrentConversation = 
                newMessageData.user_id === currentSelectedConv.id || 
                newMessageData.receiver_id === currentSelectedConv.id;
              
              if (isForCurrentConversation) {
                const formattedMessage = {
                  id: newMessageData.mes_id,
                  content: newMessageData.mes_content,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  originalTimestamp: newMessageData.mes_date,
                  isOwn: newMessageData.user_id === currentUserId,
                  is_read: newMessageData.is_read, 
                };
                
                setSelectedConversation(prev => {
                  if (!prev) return prev;
                  const messageExists = prev.messages?.some(msg => msg.id === formattedMessage.id);
                  if (messageExists) return prev;
                  
                  return {
                    ...prev,
                    messages: [...(prev.messages || []), formattedMessage]
                  };
                });

                if (newMessageData.receiver_id === currentUserId && currentSelectedConv) {
                  try {
                    await fetch(
                      `https://echo-ebl8.onrender.com/api/ctu_vetmed/mark_messages_as_read/${currentSelectedConv.id}/`,
                      { 
                        method: "PUT", 
                        credentials: "include",
                        headers: {
                          'Content-Type': 'application/json',
                        }
                      }
                    );
                    
                    setConversations(prev => {
                      if (!prev) return [];
                      return prev.map(conv => 
                        conv.id === currentSelectedConv.id 
                          ? { ...conv, unread: 0 }
                          : conv
                      );
                    });
                  } catch (error) {
                    console.error("Error marking message as read:", error);
                  }
                }
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'message',
        },
        async (payload) => {
          const updatedMessage = payload.new;
          const currentSelectedConv = selectedConversationRef.current;
          const currentUserId = currentUserIdRef.current;

          // If a message was marked as read and it's our message in the current conversation
          if (updatedMessage.is_read && 
              updatedMessage.user_id === currentUserId &&
              currentSelectedConv && 
              updatedMessage.receiver_id === currentSelectedConv.id) {
            
            // Update local state to mark the message as read
            setSelectedConversation(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                messages: prev.messages?.map(msg => 
                  msg.id === updatedMessage.mes_id 
                    ? { ...msg, is_read: true }
                    : msg
                ) || []
              };
            });
          }
        }
      )
      .subscribe();

    // Typing channel
    typingChannelRef.current = supabase.channel('typing-channel-global');

    typingChannelRef.current
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userId, receiverId, isTyping: typingStatus } = payload.payload;
        const currentSelectedConv = selectedConversationRef.current;
        const currentUserId = currentUserIdRef.current;
        
        if (currentSelectedConv && userId !== currentUserId) {
          const isForMe = receiverId === currentUserId;
          const isFromCurrentConversationPartner = userId === currentSelectedConv.id;
          
          if (isForMe && isFromCurrentConversationPartner) {
            if (typingStatus) {
              setIsTyping(true);
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }
              typingTimeoutRef.current = setTimeout(() => {
                setIsTyping(false);
              }, 2000);
            } else {
              setIsTyping(false);
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }
            }
          }
        }
      })
      .subscribe();

    return () => {
      if (messagesSubscriptionRef.current) {
        messagesSubscriptionRef.current.unsubscribe();
      }
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
      }
    };
  }, [currentUserId]);

  // Check if it's a new conversation (user selected from search, not from existing conversations)
  const isNewConversation = selectedConversation && 
    isSearching && 
    !conversations?.some(conv => conv.id === selectedConversation.id);

  // Only show empty message for conversations we've confirmed have no messages
  const isEmptyConversation = selectedConversation && 
    !isNewConversation && 
    conversationMessages[selectedConversation.id] === true; 

  const fetchConversations = async () => {
    try {
      const res = await fetch(
        "https://echo-ebl8.onrender.com/api/ctu_vetmed/get_conversations/", 
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        
        // Sort conversations in descending order based on timestamp (newest first)
        const sortedConversations = (data || []).sort((a, b) => {
          // Handle conversations with timestamps
          if (a.timestamp && b.timestamp) {
            return new Date(b.timestamp) - new Date(a.timestamp);
          }
          // If one conversation has timestamp and other doesn't, prioritize the one with timestamp
          if (a.timestamp && !b.timestamp) return -1;
          if (!a.timestamp && b.timestamp) return 1;
          // If neither has timestamp, maintain original order
          return 0;
        });
        
        setConversations(sortedConversations);
      } else {
        setConversations([]);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setConversations([]);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await fetch(
        "https://echo-ebl8.onrender.com/api/ctu_vetmed/get_all_users/",
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data || []);
      } else {
        setAllUsers([]);
      }
    } catch (error) {
      console.error("Error fetching all users:", error);
      setAllUsers([]);
    }
  };

  const totalUnread = (conversations || []).reduce((sum, conv) => sum + (conv.unread || 0), 0);

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setIsSearching(value.length > 0);
  };

  const handleSelectConversation = async (conversation) => {
    if (!conversation) return;
    
    setSelectedConversation(conversation);
    setIsSearching(false);
    setSearchTerm("");
    setIsTyping(false);
    
    try {
      const res = await fetch(
        `https://echo-ebl8.onrender.com/api/ctu_vetmed/get_conversation/${conversation.id}/`,
        { credentials: "include" }
      );
      
      if (res.ok) {
        const data = await res.json();
        
        const hasNoMessages = !data || data.length === 0;
        setConversationMessages(prev => ({
          ...prev,
          [conversation.id]: hasNoMessages
        }));
        
        const transformedMessages = (data || []).map(msg => ({
          ...msg,
          timestamp: msg.timestamp,
          originalTimestamp: msg.originalTimestamp || new Date().toISOString(),
          is_read: msg.is_read 
        }));

        const updatedConversation = {
          ...conversation,
          messages: transformedMessages,
        };

        setSelectedConversation(updatedConversation);

        try {
          const markReadResponse = await fetch(
            `https://echo-ebl8.onrender.com/api/ctu_vetmed/mark_messages_as_read/${conversation.id}/`,
            { 
              method: "PUT", 
              credentials: "include",
              headers: {
                'Content-Type': 'application/json',
              }
            }
          );
          
          if (markReadResponse.ok) {
            
            setConversations(prev => {
              if (!prev) return [];
              return prev.map(conv => 
                conv.id === conversation.id 
                  ? { ...conv, unread: 0 }
                  : conv
              );
            });
          } else {
            console.error("❌ Failed to mark messages as read on conversation open");
          }
        } catch (error) {
          console.error("❌ Error marking messages as read on conversation open:", error);
        }
        
        fetchConversations();
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedConversation || !currentUserId) return;

    const now = new Date();
    const tempMessage = {
      id: `temp-${Date.now()}`,
      content: newMessage,
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      originalTimestamp: now.toISOString(),
      isOwn: true,
      is_read: false, 
    };

    setIsTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setSelectedConversation(prev => ({
      ...prev,
      messages: [...(prev.messages || []), tempMessage]
    }));

    const payload = {
      receiver_id: selectedConversation.id,
      message: newMessage,
    };

    try {
      const res = await fetch(
        "https://echo-ebl8.onrender.com/api/ctu_vetmed/send_message/",
        {
          method: "POST",
          headers: { "Content-Type": 'application/json' },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );
      
      if (res.ok) {
        setNewMessage("");
        fetchConversations();
      } else {
        setSelectedConversation(prev => ({
          ...prev,
          messages: prev.messages?.filter(msg => msg.id !== tempMessage.id) || []
        }));
      }
    } catch (error) {
      setSelectedConversation(prev => ({
        ...prev,
        messages: prev.messages?.filter(msg => msg.id !== tempMessage.id) || []
      }));
    }
  }, [newMessage, selectedConversation, currentUserId]);

  // Profile modal handlers
  const handleProfileClick = (user) => {
    // Only show modal for specific roles
    const allowedRoles = ['Veterinarian', 'Horse Operator', 'Kutsero', 'Ctu-Vetmed', 'Ctu-Admin', 'Dvmf', 'Dvmf-Admin'];
    if (allowedRoles.includes(user.role)) {
      setProfileModal({ isOpen: true, user });
    }
  };

  const handleCloseProfileModal = () => {
    setProfileModal({ isOpen: false, user: null });
  };

  // Add online status to conversations and users
  const conversationsWithOnlineStatus = (conversations || []).map(conv => ({
    ...conv,
    online: onlineUsers.has(conv.id?.toString())
  }));

  const allUsersWithOnlineStatus = (allUsers || []).map(user => ({
    ...user,
    online: onlineUsers.has(user.id?.toString())
  }));

  // Filter and maintain descending order for conversations
  const filteredConversations = (conversationsWithOnlineStatus || [])
    .filter((c) => c.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      // Maintain descending order even after filtering
      if (a.timestamp && b.timestamp) {
        return new Date(b.timestamp) - new Date(a.timestamp);
      }
      if (a.timestamp && !b.timestamp) return -1;
      if (!a.timestamp && b.timestamp) return 1;
      return 0;
    });

  const filteredAllUsers = (allUsersWithOnlineStatus || []).filter((user) =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (viewState === "closed") {
    return (
      <>
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setViewState("small")}
            className="relative w-16 h-16 bg-gradient-to-br from-[#b91c1c] to-[#7f1d1d] hover:from-[#991b1b] hover:to-[#7f1d1d] text-white rounded-full shadow-xl hover:shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:-translate-y-1"
          >
            <MessageCircle className="w-6 h-6" />
            {totalUnread > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-6 h-6 rounded-full flex items-center justify-center font-medium px-1">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </button>
        </div>

        {/* Profile Modal */}
        <ProfileModalHandler
          user={profileModal.user}
          isOpen={profileModal.isOpen}
          onClose={handleCloseProfileModal}
        />
      </>
    );
  }

  if (viewState === "small") {
    return (
      <>
        <div className="fixed bottom-6 right-6 z-1000 w-80 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {!selectedConversation && (
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-[#b91c1c] to-[#7f1d1d] text-white">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                <div>
                  <h3 className="font-semibold">Messages</h3>
                  <p className="text-xs opacity-90">{(conversations || []).length} conversations</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setViewState("fullscreen")}
                  className="p-1.5 hover:bg-white/20 rounded transition-colors"
                  title="Expand"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewState("closed")}
                  className="p-1.5 hover:bg-white/20 rounded transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {selectedConversation ? (
            <ChatView
              conversation={selectedConversation}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              handleSendMessage={handleSendMessage}
              setSelectedConversation={setSelectedConversation}
              currentUserId={currentUserId}
              isTyping={isTyping}
              handleTypingStart={handleTypingStart}
              handleTypingStop={handleTypingStop}
              isNewConversation={isNewConversation}
              isEmptyConversation={isEmptyConversation}
              onProfileClick={handleProfileClick}
              isFullscreen={false}
            />
          ) : (
            <ConversationList
              searchTerm={searchTerm}
              setSearchTerm={handleSearchChange}
              filteredConversations={isSearching ? filteredAllUsers : filteredConversations}
              handleSelectConversation={handleSelectConversation}
              isSearching={isSearching}
              allUsers={filteredAllUsers}
              currentUserId={currentUserId}
              selectedConversation={selectedConversation}
              onProfileClick={handleProfileClick}
            />
          )}
        </div>

        {/* Profile Modal */}
        <ProfileModalHandler
          user={profileModal.user}
          isOpen={profileModal.isOpen}
          onClose={handleCloseProfileModal}
        />
      </>
    );
  }

  if (viewState === "fullscreen") {
    return (
      <>
        <div className="fixed inset-0 z-1000 bg-white flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-[#b91c1c] to-[#7f1d1d] text-white">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewState("small")}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-6 h-6" />
                <div>
                  <h3 className="text-lg font-semibold">Messages</h3>
                  <p className="text-sm opacity-90">{(conversations || []).length} conversations</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setViewState("closed")}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex min-h-0">
            <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
              <ConversationList
                searchTerm={searchTerm}
                setSearchTerm={handleSearchChange}
                filteredConversations={isSearching ? filteredAllUsers : filteredConversations}
                handleSelectConversation={handleSelectConversation}
                isSearching={isSearching}
                allUsers={filteredAllUsers}
                currentUserId={currentUserId}
                selectedConversation={selectedConversation}
                onProfileClick={handleProfileClick}
              />
            </div>

            <div className="flex-1 bg-gray-50 flex flex-col min-h-0">
              {selectedConversation ? (
                <ChatView
                  conversation={selectedConversation}
                  newMessage={newMessage}
                  setNewMessage={setNewMessage}
                  handleSendMessage={handleSendMessage}
                  setSelectedConversation={setSelectedConversation}
                  currentUserId={currentUserId}
                  isTyping={isTyping}
                  handleTypingStart={handleTypingStart}
                  handleTypingStop={handleTypingStop}
                  showBackButton={false}
                  isNewConversation={isNewConversation}
                  isEmptyConversation={isEmptyConversation}
                  onProfileClick={handleProfileClick}
                  isFullscreen={true}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">
                      {isSearching ? "Select a user to start chatting" : "Select a conversation"}
                    </h3>
                    <p className="text-sm">
                      {isSearching 
                        ? "Choose a user to start a new conversation" 
                        : "Choose a conversation from the list to start messaging"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Profile Modal */}
        <ProfileModalHandler
          user={profileModal.user}
          isOpen={profileModal.isOpen}
          onClose={handleCloseProfileModal}
        />
      </>
    );
  }

  return null;
};

export default FloatingMessages;