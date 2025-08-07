import React, { useState } from 'react';
import {Search,Menu,Bell,Eye,Filter,MapPin,Phone,Mail,MessageCircle,X,Heart,Star,Award,Clock,Users,CheckCircle,Briefcase,Calendar,GraduationCap,UserCheck
} from 'lucide-react';
import Sidebar from './components/ui/sideBar';
import FloatingMessages from './components/modal/floatingMessages';
import ProfileModal from './components/modal/profileModal';

const VetDirectory = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVet, setSelectedVet] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const veterinarians = [
    {
      id: 1,
      name: "Dr. Sarah Johnson",
      email: "sarah.johnson@vetcare.com",
      phone: "(555) 123-4567",
      location: "123 Vet Street, Downtown",
      city: "Manila",
      state: "Metro Manila",
      specialization: "Large Animal Medicine",
      experience: "12 years",
      rating: 4.9,
      reviews: 156,
      photo: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face",
      isAvailable: true,
      education: "DVM - University of the Philippines",
      certifications: ["Board Certified Large Animal Specialist", "Emergency Medicine Certified"],
      bio: "Dr. Johnson specializes in large animal medicine with over 12 years of experience treating horses, cattle, and other farm animals. She is passionate about preventive care and emergency medicine.",
      workingHours: "Mon-Fri: 8AM-6PM, Sat: 9AM-3PM",
      languages: ["English", "Filipino", "Spanish"],
      emergencyServices: true
    },
    {
      id: 2,
      name: "Dr. Michael Chen",
      email: "michael.chen@vetcare.com",
      phone: "(555) 234-5678",
      location: "456 Animal Ave, Uptown",
      city: "Quezon City",
      state: "Metro Manila",
      specialization: "Small Animal Surgery",
      experience: "8 years",
      rating: 4.8,
      reviews: 98,
      photo: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face",
      isAvailable: true,
      education: "DVM - De La Salle University",
      certifications: ["Certified Veterinary Surgeon", "Pain Management Specialist"],
      bio: "Dr. Chen is a skilled surgeon specializing in small animal surgery. He has performed over 2,000 successful surgeries and is known for his gentle approach with both pets and their owners.",
      workingHours: "Mon-Fri: 7AM-5PM, Sun: 10AM-2PM",
      languages: ["English", "Mandarin", "Filipino"],
      emergencyServices: false
    },
    {
      id: 3,
      name: "Dr. Emily Rodriguez",
      email: "emily.rodriguez@vetcare.com",
      phone: "(555) 345-6789",
      location: "789 Pet Plaza, Westside",
      city: "Cebu City",
      state: "Cebu",
      specialization: "Exotic Animal Care",
      experience: "15 years",
      rating: 4.9,
      reviews: 234,
      photo: "https://images.unsplash.com/photo-1594824388838-d3c569d2b84a?w=400&h=400&fit=crop&crop=face",
      isAvailable: false,
      education: "DVM - Central Luzon State University",
      certifications: ["Exotic Animal Medicine Board Certified", "Wildlife Rehabilitation Specialist"],
      bio: "Dr. Rodriguez is a renowned expert in exotic animal care, treating birds, reptiles, and small mammals. She has published numerous research papers on exotic animal medicine.",
      workingHours: "Tue-Sat: 9AM-4PM",
      languages: ["English", "Spanish", "Filipino"],
      emergencyServices: true
    },
    {
      id: 4,
      name: "Dr. Robert Taylor",
      email: "robert.taylor@vetcare.com",
      phone: "(555) 456-7890",
      location: "321 Healing Way, Eastside",
      city: "Davao City",
      state: "Davao del Sur",
      specialization: "Veterinary Dentistry",
      experience: "10 years",
      rating: 4.7,
      reviews: 87,
      photo: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=400&fit=crop&crop=face",
      isAvailable: true,
      education: "DVM - University of Southern Mindanao",
      certifications: ["Veterinary Dental Specialist", "Oral Surgery Certified"],
      bio: "Dr. Taylor specializes in veterinary dentistry and oral surgery. He has helped thousands of animals maintain healthy teeth and gums throughout their lives.",
      workingHours: "Mon-Fri: 8AM-5PM",
      languages: ["English", "Filipino"],
      emergencyServices: false
    },
    {
      id: 5,
      name: "Dr. Amanda Foster",
      email: "amanda.foster@vetcare.com",
      phone: "(555) 567-8901",
      location: "654 Care Circle, Northside",
      city: "Baguio City",
      state: "Benguet",
      specialization: "Emergency Medicine",
      experience: "6 years",
      rating: 4.8,
      reviews: 145,
      photo: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop&crop=face",
      isAvailable: true,
      education: "DVM - Benguet State University",
      certifications: ["Emergency and Critical Care Specialist", "Advanced Life Support Certified"],
      bio: "Dr. Foster is an emergency medicine specialist who provides critical care for animals in life-threatening situations. She is available 24/7 for emergency consultations.",
      workingHours: "24/7 Emergency Services",
      languages: ["English", "Filipino", "Ilocano"],
      emergencyServices: true
    },
    {
      id: 6,
      name: "Dr. Lisa Wang",
      email: "lisa.wang@vetcare.com",
      phone: "(555) 678-9012",
      location: "987 Wellness Way, Central",
      city: "Iloilo City",
      state: "Iloilo",
      specialization: "Internal Medicine",
      experience: "14 years",
      rating: 4.9,
      reviews: 189,
      photo: "https://images.unsplash.com/photo-1551847812-1ad7b48cce90?w=400&h=400&fit=crop&crop=face",
      isAvailable: true,
      education: "DVM - University of the Philippines Los Baños",
      certifications: ["Internal Medicine Specialist", "Cardiology Certified"],
      bio: "Dr. Wang is an internal medicine specialist with expertise in complex medical cases. She has a particular interest in cardiology and endocrine disorders.",
      workingHours: "Mon-Sat: 8AM-6PM",
      languages: ["English", "Mandarin", "Filipino", "Hiligaynon"],
      emergencyServices: false
    }
  ];

  const locations = ['all', ...Array.from(new Set(veterinarians.map(vet => vet.city)))];

  const handleViewVet = (vet) => {
    setSelectedVet(vet);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedVet(null);
  };

  const filteredVets = veterinarians.filter(vet => {
    const matchesLocation = selectedLocation === 'all' || vet.city === selectedLocation;
    const matchesSearch = vet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vet.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vet.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesLocation && matchesSearch;
  });

  const availableCount = filteredVets.filter(vet => vet.isAvailable).length;

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar
        isSidebarCollapsed={isSidebarCollapsed}
        isHovering={isHovering}
        setIsHovering={setIsHovering}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-105"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search veterinarians..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent w-96 bg-white/50 backdrop-blur-sm transition-all duration-200"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>
              <button
                onClick={() => {
                  console.log('Profile button clicked!');
                  setIsProfileModalOpen(true);
                  console.log('isProfileModalOpen set to true');
                }}
                className="flex items-center space-x-3 bg-green-50 rounded-xl p-2 hover:bg-green-100 transition-all duration-200 cursor-pointer"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white font-semibold text-sm">MS</span>
                </div>
                <div>
                  <span className="font-medium text-gray-800">Dr. Maria Santos</span>
                  <p className="text-xs text-green-600">Veterinarian</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Directory Content */}
        <div className="flex-1 p-6 overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Veterinarian Directory</h1>
              <p className="text-gray-600">Find and connect with qualified veterinarians in your area</p>
              <div className="mt-2 flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600">
                    {filteredVets.length} veterinarian{filteredVets.length !== 1 ? 's' : ''} found
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-600">
                    {availableCount} available now
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Location Filter */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-gray-700">Filter by Location:</span>
              </div>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="bg-white/80 backdrop-blur-md border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Locations</option>
                {locations.slice(1).map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Veterinarians Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVets.map((vet) => (
              <div key={vet.id} className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="relative">
                  <img
                    src={vet.photo}
                    alt={vet.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-4 right-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                      vet.isAvailable 
                        ? 'bg-green-100 text-green-700 border border-green-200' 
                        : 'bg-red-100 text-red-700 border border-red-200'
                    }`}>
                      {vet.isAvailable ? 'Available' : 'Busy'}
                    </span>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 mb-1">{vet.name}</h3>
                      <p className="text-green-600 text-sm font-medium">{vet.specialization}</p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-medium text-gray-700">{vet.rating}</span>
                      <span className="text-xs text-gray-500">({vet.reviews})</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-gray-600">{vet.city}, {vet.state}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Briefcase className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-gray-600">{vet.experience} experience</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-600">{vet.phone}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleViewVet(vet)}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-xl transition-all duration-200 hover:shadow-md flex items-center justify-center space-x-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Profile</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredVets.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">No veterinarians found</h3>
              <p className="text-gray-600">Try adjusting your search criteria or location filter.</p>
            </div>
          )}
        </div>
      </div>   

      {/* Vet Details Modal */}
      {isModalOpen && selectedVet && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden border border-gray-200/50">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 text-white p-6 sticky top-0 z-10 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <img
                    src={selectedVet.photo}
                    alt={selectedVet.name}
                    className="w-16 h-16 rounded-full border-4 border-white/20 shadow-lg object-cover"
                  />
                  <div>
                    <h2 className="text-2xl font-bold">{selectedVet.name}</h2>
                    <p className="text-green-100 text-sm">{selectedVet.specialization}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Star className="w-4 h-4 text-yellow-300 fill-current" />
                      <span className="text-sm text-white">{selectedVet.rating} ({selectedVet.reviews} reviews)</span>
                    </div>
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
              <div className="p-6">
                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200/50">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
                      <Phone className="w-5 h-5 text-green-500" />
                      <span>Contact Information</span>
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Mail className="w-4 h-4 text-blue-500" />
                        <span className="text-gray-700">{selectedVet.email}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Phone className="w-4 h-4 text-green-500" />
                        <span className="text-gray-700">{selectedVet.phone}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <MapPin className="w-4 h-4 text-red-500" />
                        <span className="text-gray-700">{selectedVet.location}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Clock className="w-4 h-4 text-purple-500" />
                        <span className="text-gray-700">{selectedVet.workingHours}</span>
                      </div>
                    </div>
                    <button className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 hover:shadow-md flex items-center justify-center space-x-2">
                      <MessageCircle className="w-5 h-5" />
                      <span>Send Message</span>
                    </button>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200/50">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
                      <GraduationCap className="w-5 h-5 text-blue-500" />
                      <span>Professional Details</span>
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <span className="font-semibold text-gray-700 block">Education</span>
                        <span className="text-gray-600">{selectedVet.education}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700 block">Experience</span>
                        <span className="text-gray-600">{selectedVet.experience}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700 block">Languages</span>
                        <span className="text-gray-600">{selectedVet.languages.join(', ')}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700 block">Emergency Services</span>
                        <span className={`text-sm font-medium ${selectedVet.emergencyServices ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedVet.emergencyServices ? 'Available' : 'Not Available'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bio Section */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200/50 mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
                    <Heart className="w-5 h-5 text-green-500" />
                    <span>About Dr. {selectedVet.name.split(' ')[1]}</span>
                  </h3>
                  <p className="text-gray-700 leading-relaxed">{selectedVet.bio}</p>
                </div>

                {/* Certifications */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200/50">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
                    <Award className="w-5 h-5 text-purple-500" />
                    <span>Certifications</span>
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {selectedVet.certifications.map((cert, index) => (
                      <span
                        key={index}
                        className="bg-white/80 text-purple-700 px-4 py-2 rounded-xl text-sm font-medium border border-purple-200"
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {console.log('ProfileModal isOpen:', isProfileModalOpen)}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 8px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #10b981, #059669);
          border-radius: 8px;
          border: 2px solid #f1f5f9;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #059669, #047857);
        }
        
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #10b981 #f1f5f9;
        }
      `}</style>
      
      {/* Floating Messages Component */}
      <FloatingMessages />
    </div>
  );
};

export default VetDirectory;
