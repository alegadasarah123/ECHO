import React, { useState } from 'react';
import {Search,Menu,Bell,Filter,Eye,PawPrint,User,Phone,MapPin,CheckCircle,AlertCircle,RefreshCw,X,FileText,Heart,Clock,Shield,MessageCircle,Download,
} from 'lucide-react';
import Sidebar from '@/components/VetSidebar';
import FloatingMessages from '@/components/modal/floatingMessages';
import ProfileModal from '@/components/modal/profileModal';

const HealthLog = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [selectedHorse, setSelectedHorse] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [horses] = useState([
    {
      id: 1,
      horseName: "Thunder",
      ownerName: "Maria Santos",
      breed: "Arabian",
      age: "8 years",
      sex: "Stallion",
      contact: "(555) 123-4567",
      location: "Stable A, Block 1",
      registrationDate: "2023-01-15",
      lastCheckup: "2025-01-10",
      healthStatus: "excellent",
      medicalHistory: [
        {
          date: "2025-01-10",
          diagnosis: "Annual Health Check",
          veterinarian: "Dr. Sarah Johnson",
          treatment: "Routine vaccination and dental check",
          notes: "Horse is in excellent condition. All vitals normal."
        },
        {
          date: "2024-12-05",
          diagnosis: "Minor Injury",
          veterinarian: "Dr. Mike Chen",
          treatment: "Wound cleaning and antibiotics",
          notes: "Small cut on left leg, healed completely."
        }
      ],
      vaccinations: [
        {
          vaccine: "Equine Influenza",
          date: "2025-01-10",
          nextDue: "2025-07-10",
          veterinarian: "Dr. Sarah Johnson"
        },
        {
          vaccine: "Tetanus",
          date: "2024-11-15",
          nextDue: "2025-11-15",
          veterinarian: "Dr. Emily Rodriguez"
        }
      ]
    },
    {
      id: 2,
      horseName: "Bella",
      ownerName: "John Smith",
      breed: "Quarter Horse",
      age: "5 years",
      sex: "Mare",
      contact: "(555) 234-5678",
      location: "Stable B, Block 2",
      registrationDate: "2023-03-20",
      lastCheckup: "2025-01-08",
      healthStatus: "good",
      medicalHistory: [
        {
          date: "2025-01-08",
          diagnosis: "Routine Check-up",
          veterinarian: "Dr. Emily Rodriguez",
          treatment: "General health assessment",
          notes: "Good overall health, minor weight gain noted."
        }
      ],
      vaccinations: [
        {
          vaccine: "West Nile Virus",
          date: "2024-12-20",
          nextDue: "2025-12-20",
          veterinarian: "Dr. Emily Rodriguez"
        }
      ]
    },
    {
      id: 3,
      horseName: "Storm",
      ownerName: "Emily Johnson",
      breed: "Thoroughbred",
      age: "12 years",
      sex: "Gelding",
      contact: "(555) 345-6789",
      location: "Stable C, Block 1",
      registrationDate: "2022-11-10",
      lastCheckup: "2025-01-05",
      healthStatus: "needs_attention",
      medicalHistory: [
        {
          date: "2025-01-05",
          diagnosis: "Arthritis Assessment",
          veterinarian: "Dr. Lisa Wang",
          treatment: "Joint supplements and monitoring",
          notes: "Mild arthritis in back legs. Treatment plan established."
        }
      ],
      vaccinations: [
        {
          vaccine: "Equine Herpes Virus",
          date: "2024-10-15",
          nextDue: "2025-04-15",
          veterinarian: "Dr. Lisa Wang"
        }
      ]
    },
    {
      id: 4,
      horseName: "Luna",
      ownerName: "David Wilson",
      breed: "Paint Horse",
      age: "6 years",
      sex: "Mare",
      contact: "(555) 456-7890",
      location: "Stable A, Block 3",
      registrationDate: "2023-05-12",
      lastCheckup: "2025-01-12",
      healthStatus: "excellent",
      medicalHistory: [
        {
          date: "2025-01-12",
          diagnosis: "Pre-breeding Examination",
          veterinarian: "Dr. Robert Taylor",
          treatment: "Comprehensive reproductive health check",
          notes: "Excellent breeding condition. All systems normal."
        }
      ],
      vaccinations: [
        {
          vaccine: "Rhinopneumonitis",
          date: "2025-01-12",
          nextDue: "2025-07-12",
          veterinarian: "Dr. Robert Taylor"
        }
      ]
    },
    {
      id: 5,
      horseName: "Max",
      ownerName: "Sarah Brown",
      breed: "Clydesdale",
      age: "9 years",
      sex: "Stallion",
      contact: "(555) 567-8901",
      location: "Stable D, Block 2",
      registrationDate: "2022-08-30",
      lastCheckup: "2025-01-07",
      healthStatus: "fair",
      medicalHistory: [
        {
          date: "2025-01-07",
          diagnosis: "Digestive Issues",
          veterinarian: "Dr. Amanda Foster",
          treatment: "Dietary adjustment and probiotics",
          notes: "Mild colic symptoms. Responding well to treatment."
        }
      ],
      vaccinations: [
        {
          vaccine: "Strangles",
          date: "2024-09-20",
          nextDue: "2025-09-20",
          veterinarian: "Dr. Amanda Foster"
        }
      ]
    },
    {
      id: 6,
      horseName: "Spirit",
      ownerName: "Michael Davis",
      breed: "Mustang",
      age: "4 years",
      sex: "Stallion",
      contact: "(555) 678-9012",
      location: "Stable B, Block 1",
      registrationDate: "2023-07-18",
      lastCheckup: "2025-01-09",
      healthStatus: "good",
      medicalHistory: [
        {
          date: "2025-01-09",
          diagnosis: "Training Assessment",
          veterinarian: "Dr. Patricia Lee",
          treatment: "Fitness evaluation and conditioning plan",
          notes: "Young horse in training. Good physical condition."
        }
      ],
      vaccinations: [
        {
          vaccine: "Equine Encephalitis",
          date: "2024-11-30",
          nextDue: "2025-11-30",
          veterinarian: "Dr. Patricia Lee"
        }
      ]
    }
  ]);

  const handleViewHorse = (horse) => {
    setSelectedHorse(horse);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedHorse(null);
  };

  const getHealthStatusColor = (status) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-700 border-green-200';
      case 'good': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'fair': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'needs_attention': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredHorses = horses.filter(horse => {
    const matchesSearch = horse.horseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         horse.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         horse.breed.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || horse.healthStatus === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const healthStatusCounts = {
    all: horses.length,
    excellent: horses.filter(h => h.healthStatus === 'excellent').length,
    good: horses.filter(h => h.healthStatus === 'good').length,
    fair: horses.filter(h => h.healthStatus === 'fair').length,
    needs_attention: horses.filter(h => h.healthStatus === 'needs_attention').length
  };

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
                  placeholder="Search horses, owners, or breeds..."
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

        {/* Health Log Content */}
        <div className="flex-1 p-6 overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Horse Health Log</h1>
              <p className="text-gray-600">Health records for horses under your veterinary care</p>
              <div className="mt-2 flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">{healthStatusCounts.excellent} Excellent</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">{healthStatusCounts.good} Good</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">{healthStatusCounts.fair} Fair</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">{healthStatusCounts.needs_attention} Need Attention</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="bg-white/80 backdrop-blur-md border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              <button className="bg-white/80 backdrop-blur-md border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md flex items-center space-x-2">
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

         {/* Filters */}
        <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-700">Filter by Health Status:</span>
            </div>
            <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white/80 backdrop-blur-md border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
            <option value="all">All Horses ({healthStatusCounts.all})</option>
            <option value="excellent">Excellent ({healthStatusCounts.excellent})</option>
            <option value="good">Good ({healthStatusCounts.good})</option>
            <option value="fair">Fair ({healthStatusCounts.fair})</option>
            <option value="needs_attention">Needs Attention ({healthStatusCounts.needs_attention})</option>
            </select>
        </div>
        </div>


          {/* Health Log Table */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horse Name</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Breed</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Health Status</th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">View Button</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredHorses.map((horse) => (
                    <tr key={horse.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center shadow-md mr-3">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{horse.ownerName}</div>
                            <div className="text-sm text-gray-500">{horse.contact}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-md mr-3">
                            <PawPrint className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{horse.horseName}</div>
                            <div className="text-sm text-gray-500">{horse.sex}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">{horse.breed}</div>
                        <div className="text-sm text-gray-500">{horse.location}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">{horse.age}</div>
                        <div className="text-sm text-gray-500">Last checkup: {horse.lastCheckup}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getHealthStatusColor(horse.healthStatus)}`}>
                          {horse.healthStatus.replace('_', ' ').charAt(0).toUpperCase() + horse.healthStatus.replace('_', ' ').slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button 
                            onClick={() => handleViewHorse(horse)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-1 shadow-md hover:shadow-lg"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && selectedHorse && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden border border-gray-200/50">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 text-white p-6 sticky top-0 z-10 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <PawPrint className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedHorse.horseName} - Health Record</h2>
                    <p className="text-green-100 text-sm">Comprehensive Health Information</p>
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
              {/* Horse Information Card */}
              <div className="p-6 border-b border-gray-100">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200/50">
                  <div className="flex items-start space-x-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-green-400 via-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <PawPrint className="w-10 h-10 text-white" />
                    </div>
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <Heart className="w-5 h-5 text-green-500 mt-0.5" />
                          <div>
                            <span className="font-semibold text-gray-700 block">Horse Name</span>
                            <span className="text-lg text-gray-900 font-medium">{selectedHorse.horseName}</span>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <Clock className="w-5 h-5 text-blue-500 mt-0.5" />
                          <div>
                            <span className="font-semibold text-gray-700 block">Age & Sex</span>
                            <span className="text-gray-900">{selectedHorse.age} - {selectedHorse.sex}</span>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <Shield className="w-5 h-5 text-purple-500 mt-0.5" />
                          <div>
                            <span className="font-semibold text-gray-700 block">Breed</span>
                            <span className="text-gray-900">{selectedHorse.breed}</span>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                          <div>
                            <span className="font-semibold text-gray-700 block">Health Status</span>
                            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${getHealthStatusColor(selectedHorse.healthStatus)}`}>
                              {selectedHorse.healthStatus.replace('_', ' ').charAt(0).toUpperCase() + selectedHorse.healthStatus.replace('_', ' ').slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <User className="w-5 h-5 text-gray-500 mt-0.5" />
                          <div>
                            <span className="font-semibold text-gray-700 block">Owner</span>
                            <span className="text-gray-900">{selectedHorse.ownerName}</span>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <Phone className="w-5 h-5 text-orange-500 mt-0.5" />
                          <div>
                            <span className="font-semibold text-gray-700 block">Contact</span>
                            <span className="text-gray-900">{selectedHorse.contact}</span>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <MapPin className="w-5 h-5 text-red-500 mt-0.5" />
                          <div>
                            <span className="font-semibold text-gray-700 block">Location</span>
                            <span className="text-gray-900">{selectedHorse.location}</span>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                          <div>
                            <span className="font-semibold text-gray-700 block">Last Checkup</span>
                            <span className="text-gray-900">{selectedHorse.lastCheckup}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Medical History Section */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Medical History</h3>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Diagnosis</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Veterinarian</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Treatment</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedHorse.medicalHistory?.map((record, index) => (
                        <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-900 font-medium">{record.date}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{record.diagnosis}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{record.veterinarian}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{record.treatment}</td>
                          <td className="px-6 py-4 text-center">
                            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 hover:shadow-md">
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Vaccination History Section */}
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Vaccination History</h3>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Vaccine</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date Given</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Next Due</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Veterinarian</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedHorse.vaccinations?.map((vaccination, index) => (
                        <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-900 font-medium">{vaccination.vaccine}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{vaccination.date}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{vaccination.nextDue}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{vaccination.veterinarian}</td>
                          <td className="px-6 py-4 text-center">
                            <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 hover:shadow-md">
                              Schedule Next
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

        {/* Profile Modal */}
      {console.log('ProfileModal isOpen:', isProfileModalOpen)}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
      
      {/* Floating Messages Component */}
            <FloatingMessages />
    </div>
  );
};

export default HealthLog;
