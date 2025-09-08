import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Sidebar from "@/components/VetSidebar";
import { Bell, FileText, Heart, Thermometer, Activity, Calendar, User, Phone, Mail, MapPin, Eye } from "lucide-react";

const AppointmentDetails = () => {
  const navigate = useNavigate();
  const [vetProfile, setVetProfile] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    fetchVetProfile();
  }, []);

  const fetchVetProfile = async () => {
    try {
      const response = await fetch(
        "http://localhost:8000/api/veterinarian/vet_profile/",
        { method: "GET", credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch profile");
      const data = await response.json();
      setVetProfile(data.profile);
    } catch (err) {
      console.error(err);
    }
  };

  const horseInfo = {
    name: "Shadow",
    breed: "Arabian",
    dob: "2018-05-12",
    age: "6 years",
    sex: "Male",
    weight: "450 kg",
    height: "1.6 m",
    color: "Brown",
    image: "https://placekitten.com/150/150",
  };

  const ownerInfo = {
    firstName: "Juan",
    middleName: "Santos",
    lastName: "Dela Cruz",
    phone: "09123456789",
    address: "Cebu City, Philippines",
    email: "juan@example.com",
  };

  const medicalRecords = [
    {
      id: 1,
      date: "2025-09-01",
      heartRate: "72 bpm",
      respRate: "20/min",
      temperature: "37.8 °C",
      concern: "Loss of appetite",
      clinicalSigns: "Mild cough",
      labResult: "Negative",
      labImage: "https://placehold.co/120x120",
      diagnosis: "Respiratory Infection",
      treatment: "Antibiotics, Rest",
      remarks: "Monitor daily",
      veterinarian: "Dr. Maria Vet",
      status: "Completed",
    }
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Appointment Details</h1>
            <div className="flex items-center space-x-3">
              <button className="p-2 hover:bg-gray-100 rounded-xl relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="cursor-pointer w-9 h-9 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white font-semibold text-sm">
                  {vetProfile ? `${vetProfile.vet_fname?.[0] || ""}${vetProfile.vet_lname?.[0] || ""}` : ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        <main className="p-6 space-y-6 overflow-y-auto">
          <Button
            onClick={() => navigate(-1)}
            className="mb-6 bg-gradient-to-r from-white to-gray-50 text-gray-700 px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl border border-gray-200/50 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-300 hover:-translate-y-0.5"
          >
            ← Back to Appointments
          </Button>

          {/* Combined Horse + Owner Info */}
          <Card className="bg-gradient-to-br from-white via-blue-50/30 shadow-lg rounded-2xl border border-white/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Horse Information Section */}
                <div className="flex flex-col md:flex-row items-start md:items-start space-x-0 md:space-x-6">
                  {/* Profile Image */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={horseInfo.image}
                      alt="Horse"
                      className="w-32 h-32 md:w-40 md:h-40 rounded-xl object-cover shadow-md border-2 border-white"
                    />
                  </div>

                  {/* Info beside the image */}
                  <div className="flex-1 mt-4 md:mt-0 flex flex-col justify-start text-left">
                    <h2 className="text-2xl font-bold text-gray-800">{horseInfo.name}</h2>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-indigo-600 font-semibold">{horseInfo.breed}</span>
                      <span className="text-gray-600">({horseInfo.sex})</span>
                    </div>
                    <span className="mt-1 block text-gray-700">{horseInfo.color} Coat</span>

                    {/* Bottom info: 2x2 grid */}
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-gray-600 text-sm mt-4">
                      <span>DOB: <strong>{horseInfo.dob}</strong></span>
                      <span>Age: <strong>{horseInfo.age}</strong></span>
                      <span>Weight: <strong>{horseInfo.weight}</strong></span>
                      <span>Height: <strong>{horseInfo.height}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Owner Information Section (untouched) */}
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800">Owner Information</h2>
                  </div>

                  <div className="space-y-3">
                    <p className="font-bold text-gray-800 text-lg">
                      {ownerInfo.firstName} {ownerInfo.middleName} {ownerInfo.lastName}
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Phone className="w-3 h-3 text-blue-600" />
                        </div>
                        <span className="text-gray-700">{ownerInfo.phone}</span>
                      </div>

                      <div className="flex items-center space-x-2 text-sm">
                        <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
                          <MapPin className="w-3 h-3 text-green-600" />
                        </div>
                        <span className="text-gray-700">{ownerInfo.address}</span>
                      </div>

                      <div className="flex items-center space-x-2 text-sm">
                        <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Mail className="w-3 h-3 text-purple-600" />
                        </div>
                        <span className="text-gray-700">{ownerInfo.email}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
       {/* Enhanced Medical Records */}
          {!selectedRecord ? (
            <Card className="bg-gradient-to-br shadow-2xl rounded-3xl border border-white/50 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Medical Records</h2>
                    <p className="text-gray-500">Complete medical history and treatments</p>
                  </div>
                </div>

                <div className="bg-white/80 border border-gray-200/50 rounded-3xl overflow-hidden shadow-xl backdrop-blur-sm">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-8 py-6 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">Date</th>
                        <th className="px-8 py-6 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">Diagnosis</th>
                        <th className="px-8 py-6 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">Veterinarian</th>
                        <th className="px-8 py-6 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">Treatment</th>
                        <th className="px-8 py-6 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/50">
                      {medicalRecords.map((record, index) => (
                        <tr key={index} className="hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-indigo-50/30 transition-all duration-200">
                          <td className="px-8 py-6">
                            <div className="flex items-center space-x-3">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span className="text-sm font-semibold text-gray-900">{record.date}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-sm font-medium text-gray-900">{record.diagnosis}</span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-semibold">
                                  {record.veterinarian.split(' ')[1]?.[0] || 'V'}
                                </span>
                              </div>
                              <span className="text-sm font-medium text-gray-900">{record.veterinarian}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-sm font-medium text-gray-900">{record.diagnosis}</span>
                          </td>                          <td className="px-8 py-6 text-center">
                            <button
                              onClick={() => setSelectedRecord(record)}
                              className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                            >
                              <Eye className="w-4 h-4" />
                              <span>View Details</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-gradient-to-b shadow-2xl rounded-3xl border border-white/50 backdrop-blur-sm">
              <CardContent className="p-8">
                <Button
                  variant="outline"
                  onClick={() => setSelectedRecord(null)}
                  className="mb-8 bg-white/80 text-gray-700 border-gray-200/50 px-6 py-3 rounded-2xl hover:bg-gray-50/80 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
                >
                  ← Back to Records
                </Button>

                <div className="flex items-center space-x-4 mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Medical Record Details</h2>
                    <p className="text-gray-500">Comprehensive examination report</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <span>Basic Information</span>
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Date:</span>
                          <span className="font-semibold text-gray-800">{selectedRecord.date}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Veterinarian:</span>
                          <span className="font-semibold text-gray-800">{selectedRecord.veterinarian}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Concern:</span>
                          <span className="font-semibold text-gray-800">{selectedRecord.concern}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                        <Activity className="w-5 h-5 text-red-600" />
                        <span>Vital Signs</span>
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center justify-between p-3 bg-red-50/50 rounded-xl">
                          <div className="flex items-center space-x-3">
                            <Heart className="w-5 h-5 text-red-500" />
                            <span className="text-gray-700">Heart Rate</span>
                          </div>
                          <span className="font-bold text-red-700">{selectedRecord.heartRate}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl">
                          <div className="flex items-center space-x-3">
                            <Activity className="w-5 h-5 text-blue-500" />
                            <span className="text-gray-700">Respiration</span>
                          </div>
                          <span className="font-bold text-blue-700">{selectedRecord.respRate}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-orange-50/50 rounded-xl">
                          <div className="flex items-center space-x-3">
                            <Thermometer className="w-5 h-5 text-orange-500" />
                            <span className="text-gray-700">Temperature</span>
                          </div>
                          <span className="font-bold text-orange-700">{selectedRecord.temperature}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Clinical Observations</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600 uppercase tracking-wide">Clinical Signs</label>
                          <p className="mt-1 text-gray-800 font-medium">{selectedRecord.clinicalSigns}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600 uppercase tracking-wide">Lab Result</label>
                          <p className="mt-1 text-gray-800 font-medium">{selectedRecord.labResult}</p>
                        </div>
                      </div>
                    </div>

                    {selectedRecord.labImage && (
                      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Lab Image</h3>
                        <img
                          src={selectedRecord.labImage}
                          alt="Lab Result"
                          className="w-full h-48 rounded-xl border-4 border-white shadow-lg object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 bg-gradient-to-r from-green-50/80 to-emerald-50/80 backdrop-blur-sm rounded-2xl p-6 border border-green-200/50">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Treatment & Follow-up</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium text-green-700 uppercase tracking-wide">Diagnosis</label>
                      <p className="mt-2 text-gray-800 font-semibold text-lg">{selectedRecord.diagnosis}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-green-700 uppercase tracking-wide">Treatment</label>
                      <p className="mt-2 text-gray-800 font-medium">{selectedRecord.treatment}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-green-700 uppercase tracking-wide">Remarks</label>
                      <p className="mt-2 text-gray-800 font-medium">{selectedRecord.remarks}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
};

export default AppointmentDetails;
