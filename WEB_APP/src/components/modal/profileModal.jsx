import React, { useState, useEffect, useRef } from 'react';
import { 
  X, ArrowLeft, Edit3, Save, User, Phone, Mail, MapPin, Camera, Calendar, FileText,
  Download, Eye, Trash2, Building, Home
} from 'lucide-react';
import { provinces, getCities, getBarangays } from './philippinesData';

const ProfileModal = ({ isOpen, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [originalData, setOriginalData] = useState(null);
  const [profileData, setProfileData] = useState({
    vet_fname: '',
    vet_mname: '',
    vet_lname: '',
    vet_dob: '',
    vet_sex: '',
    vet_phone_num: '',
    vet_email: '',
    // Home address fields
    vet_street: '',
    vet_city: '',
    vet_province: '',
    vet_brgy: '',
    vet_zipcode: '',
    // Clinic address fields
    vet_address_is_clinic: true,
    vet_clinic_street: '',
    vet_clinic_city: '',
    vet_clinic_province: '',
    vet_clinic_brgy: '',
    vet_clinic_zipcode: '',
    // Professional fields
    vet_specialization: '',
    vet_org: '',
    vet_exp_yr: '',
    vet_license_num: '',
    vet_profile_photo: '',
    vet_documents: ''
  });

  const [alert, setAlert] = useState({ show: false, message: '', type: '' });
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const fileInputRef = useRef(null);
  const profileImageInputRef = useRef(null);
  const [newProfilePhoto, setNewProfilePhoto] = useState(null);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);

  // Address dropdown states for home address
  const [homeProvince, setHomeProvince] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [homeBarangay, setHomeBarangay] = useState('');
  
  // Address dropdown states for clinic address
  const [clinicProvince, setClinicProvince] = useState('');
  const [clinicCity, setClinicCity] = useState('');
  const [clinicBarangay, setClinicBarangay] = useState('');

  const homeCities = getCities(homeProvince);
  const homeBarangays = getBarangays(homeProvince, homeCity);
  const clinicCities = getCities(clinicProvince);
  const clinicBarangays = getBarangays(clinicProvince, clinicCity);

  // Show alert function
  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert({ show: false, message: '', type: '' }), 4000);
  };

  // Fixed URL cleaning function
  const cleanUrl = (url) => {
    if (!url) return '';
    
    console.log('Original URL before cleaning:', url);
    
    // Remove the [" at the beginning and "] at the end
    let cleaned = url.replace(/^\[\"/, '').replace(/\"\]$/, '');
    
    // Also handle cases where it might be just wrapped in quotes
    cleaned = cleaned.replace(/^\"|\"$/g, '');
    
    console.log('Cleaned URL:', cleaned);
    return cleaned;
  };

  useEffect(() => {
    if (!isOpen) return;

    const fetchProfile = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/veterinarian/vet_profile/', {
          method: 'GET',
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to fetch profile');
        const data = await response.json();
        console.log('Fetched profile data:', data.profile);
        
        // Clean the document URL when fetching
        const cleanedProfileData = {
          ...data.profile,
          vet_documents: cleanUrl(data.profile.vet_documents)
        };
        
        setProfileData(cleanedProfileData);
        setOriginalData(cleanedProfileData);
        
        // Set address dropdown values from profile data
        setHomeProvince(data.profile.vet_province || '');
        setHomeCity(data.profile.vet_city || '');
        setHomeBarangay(data.profile.vet_brgy || '');
        
        setClinicProvince(data.profile.vet_clinic_province || '');
        setClinicCity(data.profile.vet_clinic_city || '');
        setClinicBarangay(data.profile.vet_clinic_brgy || '');
      } catch (err) {
        console.error(err);
        showAlert('Failed to load profile', 'error');
      }
    };

    fetchProfile();
  }, [isOpen]);

  // Update address fields when dropdowns change
  useEffect(() => {
    if (isEditing) {
      setProfileData(prev => ({
        ...prev,
        // Home address
        vet_province: homeProvince,
        vet_city: homeCity,
        vet_brgy: homeBarangay,
        // Clinic address
        vet_clinic_province: clinicProvince,
        vet_clinic_city: clinicCity,
        vet_clinic_brgy: clinicBarangay
      }));
    }
  }, [homeProvince, homeCity, homeBarangay, clinicProvince, clinicCity, clinicBarangay, isEditing]);

  const handleSave = async () => {
    setIsUploading(true);
    
    try {
      // First, handle profile photo changes
      if (newProfilePhoto) {
        // Upload new profile photo
        const formData = new FormData();
        formData.append('profile_photo', newProfilePhoto);

        const photoResponse = await fetch('http://localhost:8000/api/veterinarian/update_profile_photo/', {
          method: 'PUT',
          credentials: 'include',
          body: formData
        });

        if (!photoResponse.ok) {
          const errorData = await photoResponse.json();
          throw new Error(errorData.error || 'Failed to upload profile photo');
        }

        const photoData = await photoResponse.json();
        // Update profile data with new photo URL
        setProfileData(prev => ({
          ...prev,
          vet_profile_photo: photoData.profile_picture_url
        }));
      }

      // Then update the rest of the profile data
      const res = await fetch('http://localhost:8000/api/veterinarian/update_vet_profile/', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      
      if (!res.ok) throw new Error('Failed to update profile');
      
      const updated = await res.json();
      
      // Clean the document URL in the response
      const cleanedUpdatedData = {
        ...updated.profile,
        vet_documents: cleanUrl(updated.profile.vet_documents)
      };
      
      setProfileData(cleanedUpdatedData);
      setOriginalData(cleanedUpdatedData);
      setNewProfilePhoto(null);
      setIsEditing(false);
      showAlert('Profile updated successfully!', 'success');

    } catch (err) {
      console.error(err);
      showAlert('Failed to update profile', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteProfilePhoto = async () => {
    if (!profileData.vet_profile_photo) {
      showAlert('No profile photo to delete', 'info');
      return;
    }

    setIsDeletingPhoto(true);
    
    try {
      const response = await fetch('http://localhost:8000/api/veterinarian/delete_profile_photo/', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete profile photo');
      }

      // Update local state to remove the profile photo
      setProfileData(prev => ({
        ...prev,
        vet_profile_photo: ''
      }));
      
      setNewProfilePhoto(null);
      showAlert('Profile photo deleted successfully!', 'success');

    } catch (err) {
      console.error(err);
      showAlert('Failed to delete profile photo', 'error');
    } finally {
      setIsDeletingPhoto(false);
    }
  };

  const handleCancel = () => {
    if (originalData) {
      setProfileData(originalData);
      // Reset dropdowns to original values
      setHomeProvince(originalData.vet_province || '');
      setHomeCity(originalData.vet_city || '');
      setHomeBarangay(originalData.vet_brgy || '');
      setClinicProvince(originalData.vet_clinic_province || '');
      setClinicCity(originalData.vet_clinic_city || '');
      setClinicBarangay(originalData.vet_clinic_brgy || '');
    }
    setNewProfilePhoto(null);
    setIsEditing(false);
    showAlert('Changes cancelled', 'info');
  };

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressTypeChange = (isClinic) => {
    setProfileData(prev => ({ ...prev, vet_address_is_clinic: isClinic }));
  };

  const handleProfilePictureClick = () => {
    if (isEditing && !isUploading && !isDeletingPhoto) {
      profileImageInputRef.current?.click();
    } else if (!isEditing && profileData.vet_profile_photo) {
      setShowImageModal(true);
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showAlert('Please upload an image file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showAlert('Image size must be less than 5MB', 'error');
      return;
    }

    // Store the file for upload when Save is clicked
    setNewProfilePhoto(file);
    
    // Create preview URL for immediate display
    const previewUrl = URL.createObjectURL(file);
    setProfileData(prev => ({
      ...prev,
      vet_profile_photo: previewUrl
    }));

    if (profileImageInputRef.current) {
      profileImageInputRef.current.value = '';
    }

    showAlert('Profile picture selected. Click Save to upload.', 'success');
  };

  const handleViewDocument = () => {
    if (profileData.vet_documents) {
      setShowPdfViewer(true);
    }
  };


  // Format address for display
  const formatAddress = (street, brgy, city, province, zipcode) => {
    return [street, brgy, city, province, zipcode]
      .filter(item => item && item.trim() !== '')
      .join(', ') || '-';
  };

  // Bigger PDF viewer component with full-height iframe
  const PdfViewer = ({ documentUrl, onClose }) => {
    if (!documentUrl) return null;

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-1002 p-2 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col">
          {/* PDF Viewer Header */}
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center space-x-3">
              <FileText className="w-6 h-6" />
              <h3 className="text-xl font-bold">Uploaded Document</h3>
            </div>
            <div className="flex items-center space-x-2">

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* PDF Content - Full height iframe with browser controls */}
          <div className="flex-1 overflow-hidden">
            <iframe
              src={documentUrl}
              className="w-full h-full border-0"
              title="Veterinarian Document"
              onError={(e) => {
                console.error('Failed to load PDF:', documentUrl);
                showAlert('Failed to load document. Please try downloading instead.', 'error');
              }}
              onLoad={() => {
                console.log('PDF loaded successfully');
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  // Bigger Image Modal Component
  const ImageModal = ({ imageUrl, onClose }) => {
    if (!imageUrl) return null;

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-1002 p-2 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 flex items-center justify-between rounded-t-2xl">
            <h3 className="text-xl font-bold">Profile Image</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
            <img 
              src={imageUrl} 
              alt="Profile" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              onError={(e) => {
                console.error('Image failed to load:', imageUrl);
                showAlert('Failed to load image', 'error');
                onClose();
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  const getInitials = () => {
    const first = profileData.vet_fname?.[0] || '';
    const last = profileData.vet_lname?.[0] || '';
    return (first + last).toUpperCase();
  };

  const getFullName = () => {
    const names = [
      profileData.vet_fname,
      profileData.vet_mname,
      profileData.vet_lname
    ].filter(name => name && name.trim() !== '');
    
    return names.join(' ') || '-';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Main Profile Modal */}
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-1000 p-4 backdrop-blur-sm">
        {/* Alert Notification */}
        {alert.show && (
          <div className={`fixed top-4 right-4 z-1001 p-4 rounded-xl shadow-lg border-l-4 ${
            alert.type === 'success' 
              ? 'bg-green-50 border-green-500 text-green-800' 
              : alert.type === 'error'
              ? 'bg-red-50 border-red-500 text-red-800'
              : 'bg-blue-50 border-blue-500 text-blue-800'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                alert.type === 'success' ? 'bg-green-500' 
                : alert.type === 'error' ? 'bg-red-500'
                : 'bg-blue-500'
              }`}></div>
              <span className="font-medium">{alert.message}</span>
              <button 
                onClick={() => setAlert({ show: false, message: '', type: '' })}
                className="ml-4 hover:opacity-70 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-gray-200/50">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 text-white p-6 flex items-center justify-between rounded-t-3xl shadow-lg">
            <div className="flex items-center space-x-4">
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-white/20 rounded-full transition-colors duration-200"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-2xl font-bold">Profile</h2>
            </div>
            
            <div className="flex items-center space-x-3">
              {isEditing && (
                <button
                  onClick={handleCancel}
                  className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-colors duration-200"
                  disabled={isUploading || isDeletingPhoto}
                >
                  <X className="w-5 h-5" />
                  <span>Cancel</span>
                </button>
              )}
              
              <button
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-colors duration-200"
                disabled={isUploading || isDeletingPhoto}
              >
                {isEditing ? <Save className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                <span>{isEditing ? 'Save' : 'Edit'}</span>
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-green-500 scrollbar-track-gray-100 flex-1 rounded-b-3xl">
            
            {/* Profile Picture Section */}
            <div className="flex justify-center">
              <div className="relative group">
                <div 
                  className={`relative w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-lg ${
                    (isEditing || profileData.vet_profile_photo) ? 'cursor-pointer hover:opacity-90 transition-opacity duration-200' : ''
                  } ${isUploading || isDeletingPhoto ? 'opacity-50' : ''}`}
                  onClick={handleProfilePictureClick}
                >
                  {isUploading || isDeletingPhoto ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  ) : profileData.vet_profile_photo ? (
                    <img 
                      src={profileData.vet_profile_photo} 
                      alt="Profile" 
                      className="w-full h-full rounded-full object-cover"
                      onError={(e) => {
                        console.error('Image failed to load:', profileData.vet_profile_photo);
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-3xl">{getInitials()}</span>
                  )}
                  
                  {!isEditing && profileData.vet_profile_photo && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Eye className="w-8 h-8 text-white" />
                    </div>
                  )}
                  
                  {isEditing && !isUploading && !isDeletingPhoto && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                  )}
                </div>
                
                {/* Delete Button - Only show when editing and there's a profile photo */}
                {isEditing && profileData.vet_profile_photo && !isUploading && !isDeletingPhoto && (
                  <button
                    onClick={handleDeleteProfilePhoto}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors duration-200 z-10"
                    title="Delete Profile Photo"
                    disabled={isDeletingPhoto}
                  >
                    {isDeletingPhoto ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                )}
                
                {/* Camera Icon - Only show when editing and no delete button is shown */}
                {isEditing && !profileData.vet_profile_photo && !isUploading && !isDeletingPhoto && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1 shadow-lg">
                    <Camera className="w-4 h-4" />
                  </div>
                )}

                {/* Uploading Indicator */}
                {isUploading && (
                  <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-1 shadow-lg">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
              
              <input
                type="file"
                ref={profileImageInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
                disabled={isUploading || !isEditing || isDeletingPhoto}
              />
            </div>

            {/* Delete Photo Button - Alternative placement for mobile */}
            {isEditing && profileData.vet_profile_photo && (
              <div className="flex justify-center mt-2">
                <button
                  onClick={handleDeleteProfilePhoto}
                  className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                  disabled={isDeletingPhoto}
                >
                  {isDeletingPhoto ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>{isDeletingPhoto ? 'Deleting...' : 'Delete Photo'}</span>
                </button>
              </div>
            )}

            {/* Personal Information Section */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200/50 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
                <User className="w-5 h-5 text-blue-500" />
                <span>Personal Information</span>
              </h3>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">First Name</label>
                      <input
                        type="text"
                        value={profileData.vet_fname}
                        onChange={(e) => handleInputChange('vet_fname', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="First name"
                        disabled={isUploading || isDeletingPhoto}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Middle Name</label>
                      <input
                        type="text"
                        value={profileData.vet_mname}
                        onChange={(e) => handleInputChange('vet_mname', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Middle name"
                        disabled={isUploading || isDeletingPhoto}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={profileData.vet_lname}
                        onChange={(e) => handleInputChange('vet_lname', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Last name"
                        disabled={isUploading || isDeletingPhoto}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-800 font-medium text-lg">{getFullName()}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span>Date of Birth</span>
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={profileData.vet_dob}
                      onChange={(e) => handleInputChange('vet_dob', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      disabled={isUploading || isDeletingPhoto}
                    />
                  ) : (
                    <p className="text-gray-800">{formatDate(profileData.vet_dob)}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sex</label>
                  {isEditing ? (
                    <select
                      value={profileData.vet_sex}
                      onChange={(e) => handleInputChange('vet_sex', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      disabled={isUploading || isDeletingPhoto}
                    >
                      <option value="">Select Sex</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  ) : (
                    <p className="text-gray-800">{profileData.vet_sex || '-'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200/50 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
                <Phone className="w-5 h-5 text-blue-500" />
                <span>Contact Information</span>
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={profileData.vet_email}
                        onChange={(e) => handleInputChange('vet_email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter email address"
                        disabled={isUploading || isDeletingPhoto}
                      />
                    ) : (
                      <p className="text-gray-800">{profileData.vet_email || '-'}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={profileData.vet_phone_num}
                        onChange={(e) => handleInputChange('vet_phone_num', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter phone number"
                        disabled={isUploading || isDeletingPhoto}
                      />
                    ) : (
                      <p className="text-gray-800">{profileData.vet_phone_num || '-'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Address Information Section */}
            <div className="bg-orange-50 rounded-2xl p-6 border border-orange-200/50 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-orange-500" />
                <span>Address Information</span>
              </h3>

              {/* Address Type Toggle */}
              {isEditing && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Address Type</label>
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => handleAddressTypeChange(true)}
                      className={`flex items-center space-x-2 px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                        profileData.vet_address_is_clinic
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                      }`}
                    >
                      <Building className="w-4 h-4" />
                      <span>Clinic Address</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddressTypeChange(false)}
                      className={`flex items-center space-x-2 px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                        !profileData.vet_address_is_clinic
                          ? 'bg-green-500 text-white border-green-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-green-300'
                      }`}
                    >
                      <Home className="w-4 h-4" />
                      <span>Home Address</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Home Address */}
              <div className={`mb-6 ${!profileData.vet_address_is_clinic ? 'bg-white p-4 rounded-lg border-2 border-green-200' : ''}`}>
                <h4 className="text-md font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                  <Home className="w-4 h-4 text-green-500" />
                  <span>Home Address</span>
                </h4>
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Street</label>
                      <input
                        type="text"
                        value={profileData.vet_street}
                        onChange={(e) => handleInputChange('vet_street', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter street address"
                        disabled={isUploading || isDeletingPhoto}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Province</label>
                        <select
                          value={homeProvince}
                          onChange={(e) => setHomeProvince(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          disabled={isUploading || isDeletingPhoto}
                        >
                          <option value="">Select Province</option>
                          {provinces.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">City</label>
                        <select
                          value={homeCity}
                          onChange={(e) => setHomeCity(e.target.value)}
                          disabled={!homeProvince || isUploading || isDeletingPhoto}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="">Select City</option>
                          {homeCities.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Barangay</label>
                        <select
                          value={homeBarangay}
                          onChange={(e) => setHomeBarangay(e.target.value)}
                          disabled={!homeCity || isUploading || isDeletingPhoto}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="">Select Barangay</option>
                          {homeBarangays.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Zip Code</label>
                        <input
                          type="text"
                          placeholder="Zip Code"
                          value={profileData.vet_zipcode}
                          onChange={(e) => handleInputChange('vet_zipcode', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          disabled={isUploading || isDeletingPhoto}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-800">
                    {formatAddress(
                      profileData.vet_street,
                      profileData.vet_brgy,
                      profileData.vet_city,
                      profileData.vet_province,
                      profileData.vet_zipcode
                    )}
                  </p>
                )}
              </div>

              {/* Clinic Address */}
              <div className={`${profileData.vet_address_is_clinic ? 'bg-white p-4 rounded-lg border-2 border-blue-200' : ''}`}>
                <h4 className="text-md font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                  <Building className="w-4 h-4 text-blue-500" />
                  <span>Clinic Address</span>
                </h4>
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Clinic Street</label>
                      <input
                        type="text"
                        value={profileData.vet_clinic_street}
                        onChange={(e) => handleInputChange('vet_clinic_street', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter clinic street address"
                        disabled={isUploading || isDeletingPhoto}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Province</label>
                        <select
                          value={clinicProvince}
                          onChange={(e) => setClinicProvince(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          disabled={isUploading || isDeletingPhoto}
                        >
                          <option value="">Select Province</option>
                          {provinces.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">City</label>
                        <select
                          value={clinicCity}
                          onChange={(e) => setClinicCity(e.target.value)}
                          disabled={!clinicProvince || isUploading || isDeletingPhoto}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="">Select City</option>
                          {clinicCities.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Barangay</label>
                        <select
                          value={clinicBarangay}
                          onChange={(e) => setClinicBarangay(e.target.value)}
                          disabled={!clinicCity || isUploading || isDeletingPhoto}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="">Select Barangay</option>
                          {clinicBarangays.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Zip Code</label>
                        <input
                          type="text"
                          placeholder="Zip Code"
                          value={profileData.vet_clinic_zipcode}
                          onChange={(e) => handleInputChange('vet_clinic_zipcode', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          disabled={isUploading || isDeletingPhoto}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-800">
                    {formatAddress(
                      profileData.vet_clinic_street,
                      profileData.vet_clinic_brgy,
                      profileData.vet_clinic_city,
                      profileData.vet_clinic_province,
                      profileData.vet_clinic_zipcode
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Professional Details Section */}
            <div className="bg-green-50 rounded-2xl p-6 border border-green-200/50 shadow-sm">
              <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center space-x-2">
                <User className="w-5 h-5 text-green-600" />
                <span>Professional Details</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* License Number and Experience aligned */}
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.vet_license_num}
                      onChange={(e) => handleInputChange('vet_license_num', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                      placeholder="Enter license number"
                      disabled={isUploading || isDeletingPhoto}
                    />
                  ) : (
                    <p className="text-gray-800 font-medium">{profileData.vet_license_num || '-'}</p>
                  )}
                </div>

                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Experience (Years)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={profileData.vet_exp_yr}
                      onChange={(e) => handleInputChange('vet_exp_yr', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                      placeholder="Enter years of experience"
                      min="0"
                      disabled={isUploading || isDeletingPhoto}
                    />
                  ) : (
                    <p className="text-gray-800 font-medium">{profileData.vet_exp_yr || '-'}</p>
                  )}
                </div>

                {/* Specialization and Organization aligned */}
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.vet_specialization}
                      onChange={(e) => handleInputChange('vet_specialization', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                      placeholder="Enter specialization"
                      disabled={isUploading || isDeletingPhoto}
                    />
                  ) : (
                    <p className="text-gray-800 font-medium">{profileData.vet_specialization || '-'}</p>
                  )}
                </div>

                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.vet_org}
                      onChange={(e) => handleInputChange('vet_org', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                      placeholder="Enter organization"
                      disabled={isUploading || isDeletingPhoto}
                    />
                  ) : (
                    <p className="text-gray-800 font-medium">{profileData.vet_org || '-'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Document Section */}
            <div className="bg-purple-50 rounded-2xl p-6 border border-purple-200/50 shadow-sm">
              <h3 className="text-lg font-bold text-purple-800 mb-4 flex items-center space-x-2">
                <FileText className="w-5 h-5 text-purple-600" />
                <span>Document</span>
              </h3>
              
              <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-purple-100">
                <div className="flex items-center space-x-3">
                  <FileText className="w-8 h-8 text-purple-500" />
                  <div>
                    <p className="font-medium text-gray-800">Uploaded Document</p>
                    <p className="text-sm text-gray-500">PDF File</p>
                  </div>
                </div>
                <button
                  onClick={handleViewDocument}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                  disabled={isUploading || isDeletingPhoto}
                >
                  View Document
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Viewer Modal */}
      {showPdfViewer && (
        <PdfViewer 
          documentUrl={profileData.vet_documents} 
          onClose={() => setShowPdfViewer(false)} 
        />
      )}

      {/* Image Modal */}
      {showImageModal && (
        <ImageModal 
          imageUrl={profileData.vet_profile_photo} 
          onClose={() => setShowImageModal(false)} 
        />
      )}
    </>
  );
};

export default ProfileModal;