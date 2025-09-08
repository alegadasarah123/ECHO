import React, { useState, useEffect } from 'react';
import {
  Calendar, Search, Bell, Eye, Trash2
} from 'lucide-react';
import { useNavigate } from "react-router-dom";
import Sidebar from '@/components/VetSidebar';
import FloatingMessages from '@/components/modal/floatingMessages';
import ProfileModal from '@/components/modal/profileModal';

const VetAppointmentRequest = () => {
  const [appointments, setAppointments] = useState([]);
  const [vetProfile, setVetProfile] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [deleteAppointment, setDeleteAppointment] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFocus, setSearchFocus] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchAppointments();
    fetchVetProfile();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/veterinarian/get_all_appointments/", {
        method: "GET",
        credentials: "include"
      });
      const data = await response.json();
      if (data.appointments) {
        // Only keep approved ones
        const approvedAppointments = data.appointments.filter(app => app.app_status === "approved");

        const mappedAppointments = approvedAppointments.map(app => ({
          id: app.app_id,
          petName: app.horse_name,
          ownerName: app.operator_name,
          ownerPhone: app.operator_phone,
          date: app.app_date,
          time: app.app_time,
          type: app.app_service,
          notes: app.app_note,
          horseId: app.horse_id,
          operatorId: app.op_id
        }));
        setAppointments(mappedAppointments);
      }
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
    }
  };

  const fetchVetProfile = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/veterinarian/vet_profile/", {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch profile");
      const data = await response.json();
      setVetProfile(data.profile);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAppointment = (appointment) => {
    setDeleteAppointment(appointment);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteAppointment = () => {
    if (deleteAppointment) {
      setAppointments(prev => prev.filter(a => a.id !== deleteAppointment.id));
      setIsDeleteModalOpen(false);
      setDeleteAppointment(null);
    }
  };

  const handleViewAppointment = (appointment) => {
    // Navigate to new details page
    navigate(`/VetAppointmentDetails/${appointment.id}`, {
      state: {
        appointmentId: appointment.id,
        horseId: appointment.horseId,
        operatorId: appointment.operatorId
      }
    });
  };

  // 🔍 Filter logic for search
  const filteredAppointments = appointments.filter((appointment) =>
    appointment.petName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appointment.ownerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Upcoming Appointments</h1>
            <div className="flex items-center space-x-4">
              <button className="p-2 hover:bg-gray-100 rounded-xl relative">
                <Bell className="w-5 h-5" />
              </button>
              <button onClick={() => setIsProfileModalOpen(true)}>
                <div className="cursor-pointer w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white font-semibold text-sm">
                    {vetProfile ? `${vetProfile.vet_fname?.[0] || ""}${vetProfile.vet_lname?.[0] || ""}` : ""}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div
          className={`relative w-[350px] max-w-full flex items-center bg-white rounded-xl shadow-md overflow-hidden transition-transform duration-200 ${
            searchFocus ? "scale-105 shadow-xl" : "shadow"
          } mx-6 my-4`}
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-all duration-200" />
          <input
            type="text"
            placeholder="Search horse name or owner name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setSearchFocus(true)}
            onBlur={() => setSearchFocus(false)}
            className="w-full pl-12 pr-4 py-3 border-none outline-none text-sm text-gray-900 bg-transparent placeholder-gray-400"
          />
        </div>

        {/* Table */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 overflow-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-800 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-800 uppercase tracking-wider">Owner Name</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-800 uppercase tracking-wider">Horse Name</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-800 uppercase tracking-wider">Appointment Type</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-800 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      <Calendar className="w-12 h-12 text-gray-400 mb-3 mx-auto" />
                      <p>No matching appointments found</p>
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((appointment) => (
                    <tr key={appointment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-base text-gray-700 text-center">
                        <div className="font-medium text-gray-600">{appointment.date}</div>
                        <div className="text-gray-500 text-sm mt-1">{appointment.time}</div>
                      </td>                      
                      <td className="px-6 py-4 text-base text-gray-700 text-center">{appointment.ownerName}</td>
                      <td className="px-6 py-4 text-base text-gray-900 text-center">{appointment.petName}</td>
                      <td className="px-6 py-4 text-base text-gray-700 text-center">{appointment.type}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center items-center space-x-2 w-full">
                          {/* View button always visible */}
                          <button 
                            onClick={() => handleViewAppointment(appointment)}
                            className="cursor-pointer p-2 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center"
                            title="View"
                          >
                            <Eye className="w-5 h-5 text-gray-400 hover:text-blue-600" />
                          </button>

                            <button 
                              onClick={() => handleDeleteAppointment(appointment)}
                              className="cursor-pointer p-2 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5 text-gray-400 hover:text-red-600" />
                            </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-semibold mb-3">Delete Appointment</h3>
            <p>Are you sure you want to delete this appointment?</p>
            <div className="flex justify-end space-x-3 mt-4">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={confirmDeleteAppointment} className="px-4 py-2 bg-red-600 text-white rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      <FloatingMessages />
    </div>
  );
};

export default VetAppointmentRequest;
