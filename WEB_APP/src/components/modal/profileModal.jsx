import React, { useState } from 'react';
import { 
  X, 
  ArrowLeft, 
  Edit3, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Award, 
  User, 
  Camera,
  Save,
  Clock,
  CheckCircle
} from 'lucide-react';

const ProfileModal = ({ isOpen, onClose }) => {
  console.log('ProfileModal rendered with isOpen:', isOpen);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState('available');
  const [profileData, setProfileData] = useState({
    name: 'Dr. Maria Santos',
    title: 'Veterinarian',
    specialization: 'Small Animal Internal Medicine',
    email: 'maria.santos@vetcare.com',
    phone: '(555) 987-6543',
    location: '456 Veterinary Plaza, Manila',
    experience: '8 years',
    education: 'DVM - University of the Philippines',
    bio: 'Dr. Maria Santos is a dedicated veterinarian specializing in small animal internal medicine. She has a passion for helping pets live healthier, happier lives and works closely with pet owners to provide comprehensive care.',
    languages: ['English', 'Filipino', 'Spanish'],
    certifications: ['Internal Medicine Specialist', 'Emergency Care Certified', 'Surgical Procedures Certified'],
    workingHours: 'Mon-Fri: 8AM-6PM, Sat: 9AM-3PM'
  });

  const handleSave = () => {
    setIsEditing(false);
    // Here you would typically save the data to your backend
    console.log('Saving profile data:', profileData);
  };

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) {
    console.log('ProfileModal not open, returning null');
    return null;
  }
  console.log('ProfileModal is open, rendering modal');

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-200/50">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 text-white p-6 sticky top-0 z-10 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-all duration-200 hover:scale-110"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-2xl font-bold">Profile</h2>
                <p className="text-green-100 text-sm">Manage your professional information</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Status Toggle */}
              <div className="flex items-center space-x-2 bg-white/20 rounded-xl p-2">
                <span className="text-sm text-white">Status:</span>
                <button
                  onClick={() => setStatus(status === 'available' ? 'busy' : 'available')}
                  className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                    status === 'available'
                      ? 'bg-green-400 text-green-900 hover:bg-green-300'
                      : 'bg-red-400 text-red-900 hover:bg-red-300'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    status === 'available' ? 'bg-green-700' : 'bg-red-700'
                  }`}></div>
                  <span className="capitalize">{status}</span>
                </button>
              </div>
              <button
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-all duration-200"
              >
                {isEditing ? <Save className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                <span className="text-sm font-medium">
                  {isEditing ? 'Save' : 'Edit'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-100px)] p-6">
          {/* Profile Picture and Basic Info */}
          <div className="flex flex-col md:flex-row gap-8 mb-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-32 h-32 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-4xl">MS</span>
                </div>
                {isEditing && (
                  <button className="absolute bottom-2 right-2 p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200">
                    <Camera className="w-4 h-4 text-gray-600" />
                  </button>
                )}
              </div>
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                status === 'available'
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-red-100 text-red-700 border border-red-200'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  status === 'available' ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className="capitalize">{status}</span>
              </div>
            </div>

            <div className="flex-1 space-y-6">
              {/* Personal Information */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200/50">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
                  <User className="w-5 h-5 text-blue-500" />
                  <span>Personal Information</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-800 font-medium">{profileData.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profileData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-600">{profileData.title}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profileData.specialization}
                        onChange={(e) => handleInputChange('specialization', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-green-600 font-medium">{profileData.specialization}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profileData.experience}
                        onChange={(e) => handleInputChange('experience', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-600">{profileData.experience}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200/50">
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
                        value={profileData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    ) : (
                      <span className="text-gray-700">{profileData.email}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-green-500" />
                    {isEditing ? (
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    ) : (
                      <span className="text-gray-700">{profileData.phone}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-red-500" />
                    {isEditing ? (
                      <input
                        type="text"
                        value={profileData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    ) : (
                      <span className="text-gray-700">{profileData.location}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-purple-500" />
                    {isEditing ? (
                      <input
                        type="text"
                        value={profileData.workingHours}
                        onChange={(e) => handleInputChange('workingHours', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    ) : (
                      <span className="text-gray-700">{profileData.workingHours}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bio Section */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200/50 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">About</h3>
            {isEditing ? (
              <textarea
                value={profileData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              />
            ) : (
              <p className="text-gray-700 leading-relaxed">{profileData.bio}</p>
            )}
          </div>

          {/* Professional Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Education & Certifications */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200/50">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
                <Award className="w-5 h-5 text-purple-500" />
                <span>Education & Certifications</span>
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Education</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.education}
                      onChange={(e) => handleInputChange('education', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-700">{profileData.education}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Certifications</label>
                  <div className="flex flex-wrap gap-2">
                    {profileData.certifications.map((cert, index) => (
                      <span
                        key={index}
                        className="bg-white/80 text-purple-700 px-3 py-1 rounded-lg text-sm font-medium border border-purple-200"
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Languages */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200/50">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Languages</h3>
              <div className="flex flex-wrap gap-2">
                {profileData.languages.map((language, index) => (
                  <span
                    key={index}
                    className="bg-white/80 text-orange-700 px-3 py-2 rounded-lg text-sm font-medium border border-orange-200"
                  >
                    {language}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
