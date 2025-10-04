import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Loader } from "lucide-react";

// Constants for better maintainability
const OUTCOME_OPTIONS = [
  { value: "", label: "Select Outcome" },
  { value: "resolved", label: "Resolved" },
  { value: "improved", label: "Improved" },
  { value: "unchanged", label: "Unchanged" },
  { value: "worsened", label: "Worsened" }
];

const OUTCOME_COLORS = {
  resolved: "bg-green-100 text-green-800",
  improved: "bg-blue-100 text-blue-800",
  unchanged: "bg-yellow-100 text-yellow-800",
  worsened: "bg-red-100 text-red-800"
};

// Form field component for reusability
const FormField = ({ label, name, value, onChange, type = "text", placeholder, required = false, options = [] }) => (
  <div className="space-y-2">
    <label htmlFor={name} className="flex items-center text-sm font-medium text-gray-700">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {type === "select" ? (
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ) : type === "textarea" ? (
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 min-h-[100px] bg-white/80 backdrop-blur-sm resize-vertical"
      />
    ) : (
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm"
      />
    )}
  </div>
);

// Treatment Record Form Component
const TreatmentRecordForm = ({ 
  formData, 
  onInputChange, 
  onSubmit, 
  onCancel,
  isEditing = false,
  isLoading = false
}) => {
  return (
    <Card className="bg-gradient-to-br from-white to-green-50 shadow-2xl rounded-3xl border border-green-100 backdrop-blur-sm transition-all duration-300 hover:shadow-3xl">
      <CardContent className="p-8">        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
              {isEditing ? "Edit Treatment Record" : "Add New Treatment"}
            </h2>
          </div>
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="flex items-center gap-2 border-gray-300 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-105"
          >
            <X className="w-4 h-4" /> Cancel
          </Button>
        </div>

        <form onSubmit={onSubmit} className="space-y-8">
          {/* Treatment Section */}
          <div className="bg-white/50 rounded-2xl p-6 border border-green-50">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Treatment Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-5">
                <FormField
                  label="Diagnosis"
                  name="diagnosis"
                  value={formData.diagnosis}
                  onChange={onInputChange}
                  placeholder="Enter diagnosis"
                  required
                />

                <FormField
                  label="Medication Name"
                  name="treatmentName"
                  value={formData.treatmentName}
                  onChange={onInputChange}
                  placeholder="e.g., Antibiotic Course"
                  required
                />

                <FormField
                  label="Medication Dosage"
                  name="treatmentDosage"
                  value={formData.treatmentDosage}
                  onChange={onInputChange}
                  placeholder="e.g., 500mg twice daily"
                  required
                />
              </div>

              <div className="space-y-5">
                <FormField
                  label="Treatment Duration"
                  name="treatmentDuration"
                  value={formData.treatmentDuration}
                  onChange={onInputChange}
                  placeholder="e.g., 2 weeks, 30 days"
                  required
                />

                <FormField
                  label="Outcome"
                  name="treatmentOutcome"
                  type="select"
                  value={formData.treatmentOutcome}
                  onChange={onInputChange}
                  options={OUTCOME_OPTIONS}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-6 border-t border-green-100">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              className="px-8 py-3 border-gray-300 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-105"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-xl transition-all duration-200 hover:scale-105 flex items-center gap-2 shadow-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  {isEditing ? "Updating..." : "Adding..."}
                </>
              ) : (
                <>
                  {isEditing ? "Update Treatment" : "Add Treatment"}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// Detail Item Component for consistent styling
const DetailItem = ({ label, value, badge }) => (
  <div className="flex items-start gap-3 p-3 bg-white/50 rounded-lg">
    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-medium text-gray-700 mb-1">{label}</h3>
      {badge ? (
        <Badge className={`capitalize ${OUTCOME_COLORS[value] || 'bg-gray-100 text-gray-800'}`}>
          {value || "Not specified"}
        </Badge>
      ) : (
        <p className="text-gray-900 break-words">{value || "Not specified"}</p>
      )}
    </div>
  </div>
);

// Treatment Record View Component
const TreatmentRecordView = ({ record, onClose }) => {
  return (
    <Card className="bg-gradient-to-br from-white to-green-50 shadow-2xl rounded-3xl border border-green-100 backdrop-blur-sm transition-all duration-300 hover:shadow-3xl mt-0">
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
              Treatment Record Details
            </h2>
          </div>
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex items-center gap-2 border-gray-300 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-105"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Diagnosis Information */}
          {record.diagnosis && (
            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Diagnosis</h3>
              <p className="text-gray-900 font-medium">{record.diagnosis}</p>
            </div>
          )}

          {/* Treatment Information */}
          <div className="bg-white/50 rounded-2xl p-6 border border-green-50">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Treatment Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailItem
                label="Medication Name"
                value={record.treatmentName}
              />

              <DetailItem
                label="Dosage"
                value={record.treatmentDosage}
              />

              <DetailItem
                label="Duration"
                value={record.treatmentDuration}
              />

              <DetailItem
                label="Outcome"
                value={record.treatmentOutcome}
                badge
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const TreatmentRecords = ({ treatmentRecords, vetProfile, horseInfo, onRefresh, recordData, isModal, onCloseModal }) => {
  const [formData, setFormData] = useState({
    diagnosis: "",
    treatmentName: "",
    treatmentDosage: "",
    treatmentDuration: "",
    treatmentOutcome: "",
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize form data based on props
  useEffect(() => {
    if (recordData) {
      setFormData({
        diagnosis: recordData.diagnosis || "",
        treatmentName: recordData.treatment_name || "",
        treatmentDosage: recordData.treatment_dosage || "",
        treatmentDuration: recordData.treatment_duration || "",
        treatmentOutcome: recordData.treatment_outcome || "",
      });
      setViewMode(true);
      setIsEditing(false);
    } else {
      setFormData({
        diagnosis: "",
        treatmentName: "",
        treatmentDosage: "",
        treatmentDuration: "",
        treatmentOutcome: "",
      });
      setViewMode(false);
      setIsEditing(false);
    }
  }, [recordData]);

  const handleAddTreatmentRecord = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // First, we need to get or create a medical record for this horse
      const medrecResponse = await fetch("http://localhost:8000/api/veterinarian/def get_horse_medical_records/", {
        method: "POST",
        credentials: "include",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          horse_id: horseInfo.id,
          diagnosis_name: formData.diagnosis,
          severity: "medium",
          notes: "Treatment record created"
        }),
      });

      if (!medrecResponse.ok) throw new Error("Failed to create medical record");

      const medrecData = await medrecResponse.json();
      const medrecId = medrecData.medrec_id;

      // Now add the treatment record
      const response = await fetch("http://localhost:8000/api/veterinarian/add_treatment/", {
        method: "POST",
        credentials: "include",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medrec_id: medrecId,
          treatment_name: formData.treatmentName,
          treatment_dosage: formData.treatmentDosage,
          treatment_duration: formData.treatmentDuration,
          treatment_outcome: formData.treatmentOutcome || null,
        }),
      });
      
      if (!response.ok) throw new Error("Failed to add treatment record");
      
      onRefresh?.();
      
      // Reset form on success
      if (!isModal) {
        setFormData({
          diagnosis: "",
          treatmentName: "",
          treatmentDosage: "",
          treatmentDuration: "",
          treatmentOutcome: "",
        });
      }
      
      if (isModal && onCloseModal) {
        onCloseModal();
      }
    } catch (err) {
      console.error("Error adding treatment record:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCancelForm = () => {
    if (recordData) {
      setViewMode(true);
      setIsEditing(false);
      setFormData({
        diagnosis: recordData.diagnosis || "",
        treatmentName: recordData.treatment_name || "",
        treatmentDosage: recordData.treatment_dosage || "",
        treatmentDuration: recordData.treatment_duration || "",
        treatmentOutcome: recordData.treatment_outcome || "",
      });
    } else if (isModal && onCloseModal) {
      onCloseModal();
    } else {
      setFormData({
        diagnosis: "",
        treatmentName: "",
        treatmentDosage: "",
        treatmentDuration: "",
        treatmentOutcome: "",
      });
    }
  };

  // Render view mode if we have record data and are in view mode
  if (viewMode && recordData) {
    return (
      <TreatmentRecordView 
        record={{
          diagnosis: recordData.diagnosis,
          treatmentName: recordData.treatment_name,
          treatmentDosage: recordData.treatment_dosage,
          treatmentDuration: recordData.treatment_duration,
          treatmentOutcome: recordData.treatment_outcome,
        }} 
        onClose={onCloseModal}
      />
    );
  }

  // Render form mode (add or edit)
  return (
    <TreatmentRecordForm
      formData={formData}
      onInputChange={handleInputChange}
      onSubmit={handleAddTreatmentRecord}
      onCancel={handleCancelForm}
      isEditing={isEditing}
      isLoading={isLoading}
    />
  );
};

export default TreatmentRecords;