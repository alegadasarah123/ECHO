import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Loader, Edit, Calendar, Syringe, Pill, Clock, User, FileText, CalendarDays } from "lucide-react";

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
const FormField = ({ label, name, value, onChange, type = "text", placeholder, required = false, icon: Icon, options = [] }) => (
  <div className="space-y-2">
    <label htmlFor={name} className="flex items-center text-sm font-medium text-gray-700">
      {Icon && <Icon className="w-4 h-4 mr-2" />}
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
  isLoading = false,
  vetName = ""
}) => {
  return (
    <Card className="bg-gradient-to-br from-white to-green-50 shadow-2xl rounded-3xl border border-green-100 backdrop-blur-sm transition-all duration-300 hover:shadow-3xl">
      <CardContent className="p-8">        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold  bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
              {isEditing ? "✏️ Edit Treatment Record" : "➕ Add New Treatment"}
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              {isEditing ? "Update the treatment details below" : "Fill in the treatment information"}
            </p>
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
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <Syringe className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Treatment Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-5">
                <FormField
                  label="Treatment Date"
                  name="treatmentDate"
                  type="date"
                  value={formData.treatmentDate}
                  onChange={onInputChange}
                  required
                  icon={Calendar}
                />

                <FormField
                  label="Treatment Name"
                  name="treatmentName"
                  value={formData.treatmentName}
                  onChange={onInputChange}
                  placeholder="e.g., Antibiotic Course, Physical Therapy"
                  required
                  icon={Syringe}
                />

                <FormField
                  label="Medication Dosage"
                  name="treatmentDosage"
                  value={formData.treatmentDosage}
                  onChange={onInputChange}
                  placeholder="e.g., 500mg twice daily"
                  required
                  icon={Pill}
                />

                <FormField
                  label="Follow-up Date"
                  name="followupDate"
                  type="date"
                  value={formData.followupDate}
                  onChange={onInputChange}
                  icon={CalendarDays}
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
                  icon={Clock}
                />

                <FormField
                  label="Outcome"
                  name="treatmentOutcome"
                  type="select"
                  value={formData.treatmentOutcome}
                  onChange={onInputChange}
                  options={OUTCOME_OPTIONS}
                />

                <FormField
                  label="Administered By"
                  name="administeredBy"
                  value={formData.administeredBy || vetName}
                  onChange={onInputChange}
                  placeholder="Veterinarian name"
                  required
                  icon={User}
                />

                <div className="pt-2">
                  <p className="text-xs text-gray-500">
                    Treatment will be linked to the current diagnosis
                  </p>
                </div>
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
const DetailItem = ({ label, value, icon: Icon, badge, date }) => (
  <div className="flex items-start gap-3 p-3 bg-white/50 rounded-lg">
    {Icon && (
      <div className="p-2 bg-green-100 rounded-lg mt-1">
        <Icon className="w-4 h-4 text-green-600" />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-medium text-gray-700 mb-1">{label}</h3>
      {badge ? (
        <Badge className={`capitalize ${OUTCOME_COLORS[value] || 'bg-gray-100 text-gray-800'}`}>
          {value || "Not specified"}
        </Badge>
      ) : date && value ? (
        <p className="text-gray-900 break-words">
          {new Date(value).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      ) : (
        <p className="text-gray-900 break-words">{value || "Not specified"}</p>
      )}
    </div>
  </div>
);

// Treatment Record View Component
const TreatmentRecordView = ({ record, onEdit, onClose, vetName }) => {
  return (
    <Card className="bg-gradient-to-br from-white to-green-50 shadow-2xl rounded-3xl border border-green-100 backdrop-blur-sm transition-all duration-300 hover:shadow-3xl mt-35">
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold  bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
              📋 Treatment Record Details
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Complete treatment information and history
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={onEdit}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 rounded-xl transition-all duration-200 hover:scale-105"
            >
              <Edit className="w-4 h-4" /> Edit
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex items-center gap-2 border-gray-300 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-105"
            >
              <X className="w-4 h-4" /> Close
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Diagnosis Information */}
          {record.diagnosis && (
            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Linked Diagnosis</h3>
              </div>
              <p className="text-gray-900 font-medium">{record.diagnosis}</p>
            </div>
          )}

          {/* Treatment Information */}
          <div className="bg-white/50 rounded-2xl p-6 border border-green-50">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <Syringe className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Treatment Details</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailItem
                label="Treatment Date"
                value={record.treatmentDate}
                icon={Calendar}
                date
              />

              <DetailItem
                label="Treatment Name"
                value={record.treatmentName}
                icon={Syringe}
              />

              <DetailItem
                label="Dosage"
                value={record.treatmentDosage}
                icon={Pill}
              />

              <DetailItem
                label="Duration"
                value={record.treatmentDuration}
                icon={Clock}
              />

              <DetailItem
                label="Follow-up Date"
                value={record.followupDate}
                icon={CalendarDays}
                date
              />

              <DetailItem
                label="Outcome"
                value={record.treatmentOutcome}
                badge
              />

              <DetailItem
                label="Administered By"
                value={record.administeredBy || vetName}
                icon={User}
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
    // Treatment fields matching backend structure
    treatmentDate: new Date().toISOString().split('T')[0],
    treatmentName: "",
    treatmentDosage: "",
    treatmentDuration: "",
    followupDate: "",
    treatmentOutcome: "",
    administeredBy: "",
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const vetName = vetProfile ? `${vetProfile.first_name} ${vetProfile.last_name}` : "";

  // Initialize form data based on props
  useEffect(() => {
    if (recordData) {
      // View/Edit mode with existing data
      setFormData({
        treatmentDate: recordData.treatment_date || new Date().toISOString().split('T')[0],
        treatmentName: recordData.treatment_name || "",
        treatmentDosage: recordData.treatment_dosage || "",
        treatmentDuration: recordData.treatment_duration || "",
        followupDate: recordData.followup_date || "",
        treatmentOutcome: recordData.treatment_outcome || "",
        administeredBy: recordData.administered_by || vetName,
      });
      setViewMode(true);
      setIsEditing(false);
    } else {
      // Add new record mode
      setFormData({
        treatmentDate: new Date().toISOString().split('T')[0],
        treatmentName: "",
        treatmentDosage: "",
        treatmentDuration: "",
        followupDate: "",
        treatmentOutcome: "",
        administeredBy: vetName,
      });
      setViewMode(false);
      setIsEditing(false);
    }
  }, [recordData, vetProfile, vetName]);

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
          diagnosis_name: "Treatment Record", // Default diagnosis for treatment-only records
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
          followup_date: formData.followupDate || null,
          treatment_outcome: formData.treatmentOutcome || null,
          administered_by: formData.administeredBy,
        }),
      });
      
      if (!response.ok) throw new Error("Failed to add treatment record");
      
      onRefresh?.();
      
      // Reset form on success
      if (!isModal) {
        setFormData({
          treatmentDate: new Date().toISOString().split('T')[0],
          treatmentName: "",
          treatmentDosage: "",
          treatmentDuration: "",
          followupDate: "",
          treatmentOutcome: "",
          administeredBy: vetName,
        });
      }
      
      if (isModal && onCloseModal) {
        onCloseModal();
      }
    } catch (err) {
      console.error("Error adding treatment record:", err);
      // You might want to add toast notifications here
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
      // Reset to view mode with original data
      setViewMode(true);
      setIsEditing(false);
      setFormData({
        treatmentDate: recordData.treatment_date || new Date().toISOString().split('T')[0],
        treatmentName: recordData.treatment_name || "",
        treatmentDosage: recordData.treatment_dosage || "",
        treatmentDuration: recordData.treatment_duration || "",
        followupDate: recordData.followup_date || "",
        treatmentOutcome: recordData.treatment_outcome || "",
        administeredBy: recordData.administered_by || vetName,
      });
    } else if (isModal && onCloseModal) {
      onCloseModal();
    } else {
      // Reset form for new entry
      setFormData({
        treatmentDate: new Date().toISOString().split('T')[0],
        treatmentName: "",
        treatmentDosage: "",
        treatmentDuration: "",
        followupDate: "",
        treatmentOutcome: "",
        administeredBy: vetName,
      });
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setViewMode(false);
  };

  // Render view mode if we have record data and are in view mode
  if (viewMode && recordData) {
    return (
      <TreatmentRecordView 
        record={{
          diagnosis: recordData.diagnosis,
          treatmentDate: recordData.treatment_date,
          treatmentName: recordData.treatment_name,
          treatmentDosage: recordData.treatment_dosage,
          treatmentDuration: recordData.treatment_duration,
          followupDate: recordData.followup_date,
          treatmentOutcome: recordData.treatment_outcome,
          administeredBy: recordData.administered_by
          }} 
        onEdit={handleEdit}
        onClose={onCloseModal}
        vetName={vetName}
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
      vetName={vetName}
    />
  );
};

export default TreatmentRecords;