import React, { useState, useEffect } from 'react';
import { 
  X, ArrowLeft, Edit3, Save, User, Phone, Mail, MapPin 
} from 'lucide-react';

const ProfileModal = ({ isOpen, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    vet_fname: '',
    vet_mname: '',
    vet_lname: '',
    vet_phone_num: '',
    vet_email: '',
    vet_city: '',
    vet_province: '',
    vet_brgy: '',
    vet_zipcode: '',
    vet_specialization: '',
    vet_org: '',
    vet_exp_yr: '',
    vet_license_num: ''
  });

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
        setProfileData(data.profile);
      } catch (err) {
        console.error(err);
      }
    };

    fetchProfile();
  }, [isOpen]);

  const handleSave = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/veterinarian/update_vet_profile/', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      if (!res.ok) throw new Error('Failed to update profile');
      const updated = await res.json();
      setProfileData(updated.profile);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-gray-200/50">

        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 text-white p-6 flex items-center justify-between rounded-t-3xl shadow-lg">
          <div className="flex items-center space-x-4">
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold">Profile</h2>
          </div>
          <button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl"
          >
            {isEditing ? <Save className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
            <span>{isEditing ? 'Save' : 'Edit'}</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-green-500 scrollbar-track-gray-100 flex-1 rounded-b-3xl">
          {/* Personal Info */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200/50 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
              <User className="w-5 h-5 text-blue-500" />
              <span>Personal Information</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.vet_fname}
                    onChange={(e) => handleInputChange('vet_fname', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                ) : <p>{profileData.vet_fname || '-'}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.vet_mname}
                    onChange={(e) => handleInputChange('vet_mname', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                ) : <p>{profileData.vet_mname || '-'}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.vet_lname}
                    onChange={(e) => handleInputChange('vet_lname', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                ) : <p>{profileData.vet_lname || '-'}</p>}
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200/50 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
              <Phone className="w-5 h-5 text-blue-500" />
              <span>Contact Information</span>
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-blue-500" />
                {isEditing ? (
                  <input
                    type="email"
                    value={profileData.vet_email}
                    onChange={(e) => handleInputChange('vet_email', e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                ) : <span>{profileData.vet_email || '-'}</span>}
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-green-500" />
                {isEditing ? (
                  <input
                    type="tel"
                    value={profileData.vet_phone_num}
                    onChange={(e) => handleInputChange('vet_phone_num', e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                ) : <span>{profileData.vet_phone_num || '-'}</span>}
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-red-500" />
                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-1">
                    <input
                      type="text"
                      placeholder="City"
                      value={profileData.vet_city}
                      onChange={(e) => handleInputChange('vet_city', e.target.value)}
                      className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      type="text"
                      placeholder="Province"
                      value={profileData.vet_province}
                      onChange={(e) => handleInputChange('vet_province', e.target.value)}
                      className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      type="text"
                      placeholder="Barangay"
                      value={profileData.vet_brgy}
                      onChange={(e) => handleInputChange('vet_brgy', e.target.value)}
                      className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      type="text"
                      placeholder="Zip Code"
                      value={profileData.vet_zipcode}
                      onChange={(e) => handleInputChange('vet_zipcode', e.target.value)}
                      className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                ) : (
                  <span>
                    {profileData.vet_brgy}, {profileData.vet_city}, {profileData.vet_province}, {profileData.vet_zipcode}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Professional Details */}
          <div className="bg-green-50 rounded-2xl p-6 border border-green-200/50 shadow-sm">
            <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center space-x-2">
              <User className="w-5 h-5 text-green-600" />
              <span>Professional Details</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.vet_specialization}
                    onChange={(e) => handleInputChange('vet_specialization', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                  />
                ) : (
                  <p className="text-gray-800 font-medium">{profileData.vet_specialization || '-'}</p>
                )}
              </div>
              <div className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1">Experience (Years)</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={profileData.vet_exp_yr}
                    onChange={(e) => handleInputChange('vet_exp_yr', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                  />
                ) : (
                  <p className="text-gray-800 font-medium">{profileData.vet_exp_yr || '-'}</p>
                )}
              </div>
              <div className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.vet_org}
                    onChange={(e) => handleInputChange('vet_org', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                  />
                ) : (
                  <p className="text-gray-800 font-medium">{profileData.vet_org || '-'}</p>
                )}
              </div>
              <div className="flex flex-col md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.vet_license_num}
                    onChange={(e) => handleInputChange('vet_license_num', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                  />
                ) : (
                  <p className="text-gray-800 font-medium">{profileData.vet_license_num || '-'}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
