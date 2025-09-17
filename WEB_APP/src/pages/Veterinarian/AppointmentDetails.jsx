import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "@/components/VetSidebar";
import {
  Bell, FileText, Heart, Thermometer, Activity, Calendar,
  User, Phone, Mail, MapPin, Plus, X, Upload, Image, AlertCircle, Lock
} from "lucide-react";

// Confirmation Modal Component
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        
        <p className="text-gray-600 mb-6">{message}</p>
        
        <div className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="px-4 py-2 border-gray-300 hover:bg-gray-100 rounded-xl"
          >
            Cancel
          </Button>
          <Button 
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl"
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
};

// Access Denied Modal Component
const AccessDeniedModal = ({ isOpen, onClose, recordVetName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
            <Lock className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Access Required</h3>
        </div>
        
        <p className="text-gray-600 mb-6">
          This medical record was created by {recordVetName}. You need access permissions to view and update this record.
        </p>
        
        <div className="flex justify-end">
          <Button 
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl"
          >
            OK
          </Button>
        </div>
      </div>
    </div>
  );
};

// Separate Medical Record Form Component
const MedicalRecordForm = ({ 
  formData, 
  imagePreview, 
  onInputChange, 
  onFileChange, 
  onSubmit, 
  onCancel,
  onSaveConfirm
}) => {
  return (
    <Card className="bg-gradient-to-br from-white to-blue-50 shadow-2xl rounded-3xl border border-blue-100 backdrop-blur-sm">
      <CardContent className="p-8">        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Add Medical Record</h2>
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="flex items-center gap-2 border-gray-300 hover:bg-gray-100 rounded-xl"
          >
            <X className="w-4 h-4" /> Back to Records
          </Button>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          onSaveConfirm();
        }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="heartRate" className="block text-sm font-medium text-gray-700 mb-2">Heart Rate (bpm)</label>
                <input
                  type="text"
                  id="heartRate"
                  name="heartRate"
                  value={formData.heartRate}
                  onChange={onInputChange}
                  placeholder="e.g., 40"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="respRate" className="block text-sm font-medium text-gray-700 mb-2">Respiration Rate (breaths/min)</label>
                <input
                  type="text"
                  id="respRate"
                  name="respRate"
                  value={formData.respRate}
                  onChange={onInputChange}
                  placeholder="e.g., 16"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-2">Temperature (°F)</label>
                <input
                  type="text"
                  id="temperature"
                  name="temperature"
                  value={formData.temperature}
                  onChange={onInputChange}
                  placeholder="e.g., 100.5"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="concern" className="block text-sm font-medium text-gray-700 mb-2">Primary Concern</label>
                <input
                  type="text"
                  id="concern"
                  name="concern"
                  value={formData.concern}
                  onChange={onInputChange}
                  placeholder="e.g., Lameness in front leg"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="clinicalSigns" className="block text-sm font-medium text-gray-700 mb-2">Clinical Signs</label>
                <textarea
                  id="clinicalSigns"
                  name="clinicalSigns"
                  value={formData.clinicalSigns}
                  onChange={onInputChange}
                  placeholder="Describe observed clinical signs"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-h-[100px] bg-white/80 backdrop-blur-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="labResult" className="block text-sm font-medium text-gray-700 mb-2">Lab Results (Optional)</label>
                <textarea
                  id="labResult"
                  name="labResult"
                  value={formData.labResult}
                  onChange={onInputChange}
                  placeholder="Lab test results if available"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-h-[80px] bg-white/80 backdrop-blur-sm"
                />
              </div>
            </div>
          </div>

          {/* Lab Image Upload Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Lab Image Upload</h3>
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50/50">
              {imagePreview ? (
                <div className="text-center">
                  <img 
                    src={imagePreview} 
                    alt="Lab preview" 
                    className="max-h-48 mx-auto rounded-lg mb-4"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      onInputChange({ target: { name: 'labImage', value: null } });
                    }}
                    className="mt-2"
                  >
                    Remove Image
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-gray-400 mb-4" />
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="labImage" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:blue-blue-500 focus-within:outline-none">
                      <span>Upload an image</span>
                      <input 
                        id="labImage" 
                        name="labImage" 
                        type="file" 
                        className="sr-only" 
                        onChange={onFileChange}
                        accept="image/*"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">PNG, JPG, GIF up to 10MB</p>
                </>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="diagnosis" className="block text-sm font-medium text-gray-700 mb-2">Diagnosis</label>
              <textarea
                id="diagnosis"
                name="diagnosis"
                value={formData.diagnosis}
                onChange={onInputChange}
                placeholder="Diagnosis based on examination"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-h-[100px] bg-white/80 backdrop-blur-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="treatment" className="block text-sm font-medium text-gray-700 mb-2">Treatment</label>
              <textarea
                id="treatment"
                name="treatment"
                value={formData.treatment}
                onChange={onInputChange}
                placeholder="Prescribed treatment plan"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-h-[100px] bg-white/80 backdrop-blur-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
              <textarea
                id="remarks"
                name="remarks"
                value={formData.remarks}
                onChange={onInputChange}
                placeholder="Additional notes or follow-up instructions"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-h-[80px] bg-white/80 backdrop-blur-sm"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              className="px-6 py-3 border-gray-300 hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </Button>
            <Button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl">
              <Plus className="w-4 h-4 mr-2" /> Add Record
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

const AppointmentDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams(); 

  const [vetProfile, setVetProfile] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [horseInfo, setHorseInfo] = useState(null);
  const [ownerInfo, setOwnerInfo] = useState(null);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showAddRecordForm, setShowAddRecordForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [recordVetName, setRecordVetName] = useState("");
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    heartRate: "",
    respRate: "",
    temperature: "",
    concern: "",
    clinicalSigns: "",
    labResult: "",
    labImage: null,
    diagnosis: "",
    treatment: "",
    remarks: ""
  });
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchVetProfile();
    fetchAppointmentDetails();
  }, [id]);

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
      setError("Failed to load veterinarian profile");
    }
  };

  const fetchAppointmentDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:8000/api/veterinarian/get_appointment_details/${id}/`,
        { method: "GET", credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch appointment");
      const data = await response.json();

      setAppointment(data.appointment || {});
      setHorseInfo(data.horseInfo || {});
      setOwnerInfo(data.ownerInfo || {});
      setMedicalRecords(data.medicalRecords || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load appointment details");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedicalRecord = async () => {
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('horse_id', horseInfo.id);
      formDataToSend.append('date', formData.date);
      formDataToSend.append('heartRate', formData.heartRate);
      formDataToSend.append('respRate', formData.respRate);
      formDataToSend.append('temperature', formData.temperature);
      formDataToSend.append('concern', formData.concern);
      formDataToSend.append('clinicalSigns', formData.clinicalSigns);
      formDataToSend.append('labResult', formData.labResult);
      formDataToSend.append('diagnosis', formData.diagnosis);
      formDataToSend.append('treatment', formData.treatment);
      formDataToSend.append('remarks', formData.remarks);
      
      if (formData.labImage) {
        formDataToSend.append('labImage', formData.labImage);
      }

      const response = await fetch(
        "http://localhost:8000/api/veterinarian/add_medical_record/",
        {
          method: "POST",
          credentials: "include",
          body: formDataToSend,
        }
      );
      
      if (!response.ok) throw new Error("Failed to add medical record");
      
      // Refresh the appointment details to show the new record
      fetchAppointmentDetails();
      setShowAddRecordForm(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        heartRate: "",
        respRate: "",
        temperature: "",
        concern: "",
        clinicalSigns: "",
        labResult: "",
        labImage: null,
        diagnosis: "",
        treatment: "",
        remarks: ""
      });
      setImagePreview(null);
      setShowConfirmation(false);
    } catch (err) {
      console.error(err);
      setError("Failed to add medical record");
      setShowConfirmation(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        labImage: file
      }));
      
      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCancelForm = () => {
    setShowAddRecordForm(false);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      heartRate: "",
      respRate: "",
      temperature: "",
      concern: "",
      clinicalSigns: "",
      labResult: "",
      labImage: null,
      diagnosis: "",
      treatment: "",
      remarks: ""
    });
    setImagePreview(null);
  };

  const handleSaveConfirm = () => {
    setShowConfirmation(true);
  };

  const handleViewRecord = (record) => {
    // Check if the record belongs to the current vet
    if (record.vet_id && vetProfile && record.vet_id !== vetProfile.id) {
      // Show access denied modal
      setRecordVetName(record.veterinarian || "another veterinarian");
      setShowAccessDenied(true);
    } else {
      // Allow viewing if it's the current vet's record
      setSelectedRecord(record);
    }
  };

  // ✅ Skeleton Loader
  const renderSkeleton = () => (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-40 bg-gray-200 rounded-lg"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-60 bg-gray-200 rounded-2xl"></div>
        <div className="h-60 bg-gray-200 rounded-2xl"></div>
      </div>
      <div className="h-80 bg-gray-200 rounded-2xl"></div>
    </div>
  );

  // Format phone number for display
  const formatPhoneNumber = (phone) => {
    if (!phone) return "N/A";
    // Simple formatting for US numbers
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleAddMedicalRecord}
        title="Confirm Medical Record"
        message="Are you sure you want to add this medical record? This action cannot be undone."
      />

      {/* Access Denied Modal */}
      <AccessDeniedModal
        isOpen={showAccessDenied}
        onClose={() => setShowAccessDenied(false)}
        recordVetName={recordVetName}
      />

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
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="p-6 space-y-6 overflow-y-auto">
          <Button
            onClick={() => navigate(-1)}
            className="mb-6 bg-gradient-to-r from-white to-gray-50 text-gray-700 px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl border border-gray-200/50 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-300 hover:-translate-y-0.5"
          >
            ← Back to Appointments
          </Button>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl relative">
              {error}
              <button 
                onClick={() => setError(null)}
                className="absolute top-0 right-0 p-2"
              >
                ×
              </button>
            </div>
          )}

          {/* Show Skeleton while loading */}
          {loading ? (
            renderSkeleton()
          ) : (
            <>
              {/* Combined Horse + Owner Info */}
              <Card className="bg-gradient-to-br from-white via-blue-50/30 shadow-lg rounded-2xl border border-white/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Horse Information Section */}
                    <div className="flex flex-col md:flex-row items-start md:items-start space-x-0 md:space-x-6">
                      <div className="relative flex-shrink-0">
                        <img
                          src={horseInfo?.image || "/horse-placeholder.jpg"}
                          alt={horseInfo?.name || "Horse"}
                          className="w-32 h-32 md:w-40 md:h-40 rounded-xl object-cover shadow-md border-2 border-white"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/horse-placeholder.jpg";
                          }}
                        />
                      </div>

                      <div className="flex-1 mt-4 md:mt-0 flex flex-col justify-start text-left">
                        <h2 className="text-2xl font-bold text-gray-800">{horseInfo?.name || "Unknown Horse"}</h2>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-indigo-600 font-semibold">{horseInfo?.breed || "Unknown Breed"}</span>
                          <span className="text-gray-600">({horseInfo?.sex || "Unknown"})</span>
                        </div>
                        <span className="mt-1 block text-gray-700">{horseInfo?.color || "Unknown"} Coat</span>

                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-gray-600 text-sm mt-4">
                          <span>DOB: <strong>{horseInfo?.dob || "Unknown"}</strong></span>
                          <span>Age: <strong>{horseInfo?.age || "Unknown"}</strong></span>
                          <span>Weight: <strong>{horseInfo?.weight || "Unknown"}</strong></span>
                          <span>Height: <strong>{horseInfo?.height || "Unknown"}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Owner Information Section */}
                    <div>
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">Owner Information</h2>
                      </div>

                      <div className="space-y-3">
                        <p className="font-bold text-gray-800 text-lg">
                          {ownerInfo?.firstName || "Unknown"} {ownerInfo?.middleName || ""} {ownerInfo?.lastName || ""}
                        </p>

                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-sm">
                            <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Phone className="w-3 h-3 text-blue-600" />
                            </div>
                            <span className="text-gray-700">{formatPhoneNumber(ownerInfo?.phone)}</span>
                          </div>

                          <div className="flex items-center space-x-2 text-sm">
                            <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
                              <MapPin className="w-3 h-3 text-green-600" />
                            </div>
                            <span className="text-gray-700">{ownerInfo?.address || "Address not available"}</span>
                          </div>

                          <div className="flex items-center space-x-2 text-sm">
                            <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
                              <Mail className="w-3 h-3 text-purple-600" />
                            </div>
                            <span className="text-gray-700">{ownerInfo?.email || "Email not available"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>

              {/* Medical Records Section */}
              {showAddRecordForm ? (
                <MedicalRecordForm
                  formData={formData}
                  imagePreview={imagePreview}
                  onInputChange={handleInputChange}
                  onFileChange={handleFileChange}
                  onSubmit={handleAddMedicalRecord}
                  onCancel={handleCancelForm}
                  onSaveConfirm={handleSaveConfirm}
                />
              ) : !selectedRecord ? (
                <Card className="bg-gradient-to-br shadow-2xl rounded-3xl border border-white/50 backdrop-blur-sm">
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-gray-800">Medical Records</h2>
                      <div className="flex items-center gap-4">
                        <span className="text-gray-500">{medicalRecords.length} records found</span>
                        <Button 
                          onClick={() => setShowAddRecordForm(true)}
                          className="flex items-center gap-2 rounded-xl"
                        >
                          <Plus className="w-4 h-4" /> Add Record
                        </Button>
                      </div>
                    </div>
                    
                    {/* Table */}
                    {medicalRecords.length > 0 ? (
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
                              <tr key={record.id || index}>
                                <td className="px-8 py-6 text-center">{record.date || "N/A"}</td>
                                <td className="px-8 py-6 text-center">{record.diagnosis || "No diagnosis"}</td>
                                <td className="px-8 py-6 text-center">{record.veterinarian || "Unknown"}</td>
                                <td className="px-8 py-6 text-center">{record.treatment || "No treatment"}</td>
                                <td className="px-8 py-6 text-center">
                                  <Button 
                                    onClick={() => handleViewRecord(record)}
                                    className="bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-xl"
                                  >
                                    View Details
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-white/50 rounded-2xl">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">No medical records available</p>
                        <Button 
                          onClick={() => setShowAddRecordForm(true)}
                          className="bg-blue-600 text-white hover:bg-blue-700 rounded-xl"
                        >
                          <Plus className="w-4 h-4 mr-2" /> Add First Medical Record
                        </Button>
                      </div>
                    )}
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
                              <span className="font-semibold text-gray-800">{selectedRecord.date || "N/A"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Veterinarian:</span>
                              <span className="font-semibold text-gray-800">{selectedRecord.veterinarian || "Unknown"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Concern:</span>
                              <span className="font-semibold text-gray-800">{selectedRecord.concern || "Not specified"}</span>
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
                              <span className="font-bold text-red-700">{selectedRecord.heartRate ? `${selectedRecord.heartRate} bpm` : "N/A"}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl">
                              <div className="flex items-center space-x-3">
                                <Activity className="w-5 h-5 text-blue-500" />
                                <span className="text-gray-700">Respiration</span>
                              </div>
                              <span className="font-bold text-blue-700">{selectedRecord.respRate ? `${selectedRecord.respRate} breaths/min` : "N/A"}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-orange-50/50 rounded-xl">
                              <div className="flex items-center space-x-3">
                                <Thermometer className="w-5 h-5 text-orange-500" />
                                <span className="text-gray-700">Temperature</span>
                              </div>
                              <span className="font-bold text-orange-700">{selectedRecord.temperature ? `${selectedRecord.temperature} °F` : "N/A"}</span>
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
                              <p className="mt-1 text-gray-800 font-medium">{selectedRecord.clinicalSigns || "No clinical signs recorded"}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600 uppercase tracking-wide">Lab Result</label>
                              <p className="mt-1 text-gray-800 font-medium">{selectedRecord.labResult || "No lab results"}</p>
                            </div>
                          </div>
                        </div>

                        {/* Lab Image Card - Always show even if no image */}
                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6">
                          <h3 className="text-lg font-semibold text-gray-800 mb-4">Lab Image</h3>
                          {selectedRecord.labImage ? (
                            <img
                              src={selectedRecord.labImage}
                              alt="Lab Result"
                              className="w-full h-48 rounded-xl border-4 border-white shadow-lg object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50">
                              <Image className="w-12 h-12 text-gray-400 mb-4" />
                              <p className="text-gray-500">No image uploaded</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Treatment & Follow-up - Now with separate lines for each section */}
                    <div className="mt-8 bg-gradient-to-r from-green-50/80 to-emerald-50/80 backdrop-blur-sm rounded-2xl p-6 border border-green-200/50">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Treatment & Follow-up</h3>
                      <div className="space-y-6">
                        <div>
                          <label className="text-sm font-medium text-green-700 uppercase tracking-wide block mb-2">Diagnosis</label>
                          <p className="text-gray-800 font-semibold text-lg bg-white/70 p-4 rounded-xl border border-green-200/50">
                            {selectedRecord.diagnosis || "No diagnosis provided"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-green-700 uppercase tracking-wide block mb-2">Treatment</label>
                          <p className="text-gray-800 font-medium bg-white/70 p-4 rounded-xl border border-green-200/50">
                            {selectedRecord.treatment || "No treatment prescribed"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-green-700 uppercase tracking-wide block mb-2">Remarks</label>
                          <p className="text-gray-800 font-medium bg-white/70 p-4 rounded-xl border border-green-200/50">
                            {selectedRecord.remarks || "No remarks"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default AppointmentDetails;