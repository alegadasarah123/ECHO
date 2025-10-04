import React, { useEffect, useCallback, useReducer, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, X, Upload, Loader, Heart, Thermometer, Stethoscope, Calendar, Syringe, Pill } from "lucide-react";
import ConfirmationModal from "@/components/modal/ConfirmationModal";

// --- 1. INITIAL STATE AND REDUCER LOGIC ---
const initialFormData = {
  date: new Date().toISOString().split('T')[0],
  heartRate: "",
  respRate: "",
  temperature: "",
  concern: "",
  clinicalSigns: "",
  diagnosticProtocol: "",
  diagnosis: "",
  labResult: "",
  labImage: null,
  treatments: [{
    medication: "",
    dosage: "",
    duration: "",
    outcome: ""
  }],
  prognosis: "",
  healthStatus: "HEALTHY",
  recommendation: "",
  followUpDate: ""
};

const initialState = {
  formData: initialFormData,
  imagePreview: null,
  isLoading: false,
  error: null,
  showConfirmation: false,
  showSuccessAlert: false,
  medrecId: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FORM_DATA':
      return { ...state, formData: action.payload };
    case 'SET_FIELD':
      return {
        ...state,
        formData: { ...state.formData, [action.field]: action.value }
      };
    case 'SET_TREATMENT_FIELD':
      const updatedTreatments = [...state.formData.treatments];
      updatedTreatments[action.index] = {
        ...updatedTreatments[action.index],
        [action.field]: action.value
      };
      return {
        ...state,
        formData: { ...state.formData, treatments: updatedTreatments }
      };
    case 'ADD_TREATMENT':
      return {
        ...state,
        formData: {
          ...state.formData,
          treatments: [
            ...state.formData.treatments,
            { medication: "", dosage: "", duration: "", outcome: "" }
          ]
        }
      };
    case 'REMOVE_TREATMENT':
      const filteredTreatments = state.formData.treatments.filter((_, i) => i !== action.index);
      return {
        ...state,
        formData: { ...state.formData, treatments: filteredTreatments }
      };
    case 'SET_UI_STATE':
      return { ...state, ...action.payload };
    case 'RESET_STATE':
      return { ...initialState };
    case 'REMOVE_LAB_IMAGE':
      return {
        ...state,
        formData: {
          ...state.formData,
          labImage: null
        },
        imagePreview: null
      };
    default:
      throw new Error(`Unsupported action type: ${action.type}`);
  }
}

// --- 2. CUSTOM HOOK FOR TEXTAREA RESIZING ---
const useAutoResizeTextarea = (value, ref) => {
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value, ref]);
};

// --- 3. EXTRACTED COMPONENTS ---
const SuccessAlert = () => {
  return (
    <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg z-[1000]">
      Medical record saved successfully!
    </div>
  );
};

const CloseButton = ({ onClose }) => {
  return (
    <Button
      onClick={onClose}
      variant="ghost"
      size="sm"
      className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full w-8 h-8 p-0"
    >
      <X className="w-4 h-4" />
    </Button>
  );
};

// Health Status Badge Component
const HealthStatusBadge = ({ status }) => {
  const getStatusStyles = (status) => {
    switch (status) {
      case "Healthy":
        return "bg-green-100 text-green-800 border-green-200";
      case "Unhealthy":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Sick":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Healthy":
        return "🟢";
      case "Unhealthy":
        return "🟡";
      case "Sick":
        return "🔴";
      default:
        return "⚪";
    }
  };

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getStatusStyles(status)}`}>
      {getStatusIcon(status)} {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
};

// Editable Field Component
const EditableField = ({ label, name, value, onChange, type = "text", placeholder, icon: Icon, textarea = false, required = false }) => (
  <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
    <label htmlFor={name} className="text-sm font-medium text-gray-700 mb-2 flex items-center">
      {Icon && <Icon className="w-4 h-4 mr-2 text-blue-600" />}
      {label} {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {textarea ? (
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white resize-none"
        rows={3}
      />
    ) : (
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
      />
    )}
  </div>
);

// --- 4. THE MAIN FORM COMPONENT ---
const RecordForm = ({ 
  formData, 
  imagePreview, 
  isLoading, 
  error, 
  onInputChange, 
  onTreatmentChange, 
  onFileChange, 
  onCancel, 
  onSubmit, 
  onAddTreatment, 
  onRemoveTreatment,
  onRemoveLabImage,
  clinicalSignsRef,
  diagnosticProtocolRef,
  diagnosisRef,
  labResultRef,
  prognosisRef,
  recommendationRef,
}) => {

  return (
    <div className="mt-[1900px] bg-gradient-to-br from-white to-blue-50 shadow-xl rounded-2xl border border-blue-100 p-6 relative">
      <CloseButton onClose={onCancel} />
      
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Add Medical Record
        </h2>
        <div className="text-sm text-gray-600 bg-green-100 px-3 py-1 rounded-full">
          Adding New Record
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Date Field - Read-only */}
        <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
          <label htmlFor="date" className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <Calendar className="w-4 h-4 mr-2 text-blue-600" />
            Record Date *
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            readOnly
            disabled
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">
            Date is automatically set to today and cannot be changed.
          </p>
        </div>

        {/* Vital Signs */}
        <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Vital Signs</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <EditableField
              label="Heart Rate (bpm)"
              name="heartRate"
              value={formData.heartRate}
              onChange={onInputChange}
              type="number"
              placeholder="e.g., 60"
              required={true}
              icon={Heart}
            />
            <EditableField
              label="Respiration Rate"
              name="respRate"
              value={formData.respRate}
              onChange={onInputChange}
              type="number"
              placeholder="e.g., 20"
              required={true}
            />
            <EditableField
              label="Temperature (°F)"
              name="temperature"
              value={formData.temperature}
              onChange={onInputChange}
              type="number"
              placeholder="e.g., 98.6"
              required={true}
              icon={Thermometer}
            />
          </div>
        </div>

        {/* Clinical Information */}
        <div className="space-y-6">
          <EditableField
            label="Clinical Signs"
            name="clinicalSigns"
            value={formData.clinicalSigns}
            onChange={onInputChange}
            placeholder="Describe clinical signs observed"
            textarea={true}
            required={true}
          />

          <EditableField
            label="Diagnostic Protocol"
            name="diagnosticProtocol"
            value={formData.diagnosticProtocol}
            onChange={onInputChange}
            placeholder="Describe the diagnostic protocol used"
            textarea={true}
            required={true}
          />

          <EditableField
            label="Diagnosis"
            name="diagnosis"
            value={formData.diagnosis}
            onChange={onInputChange}
            placeholder="Enter the diagnosis"
            textarea={true}
            required={true}
            icon={Stethoscope}
          />

          <EditableField
            label="Lab Results"
            name="labResult"
            value={formData.labResult}
            onChange={onInputChange}
            placeholder="Lab test results if available"
            textarea={true}
          />
        </div>

        {/* Lab Image Upload Section */}
        <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Lab Image Upload</h3>
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 transition-colors duration-300 hover:border-blue-400">
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
                  onClick={onRemoveLabImage}
                  className="mt-2"
                >
                  Remove Image
                </Button>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 text-gray-400 mb-4" />
                <div className="flex text-sm text-gray-600">
                  <label htmlFor="labImage" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
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
                <p className="text-xs text-gray-500 mt-2">PNG, JPG up to 10MB</p>
              </>
            )}
          </div>
        </div>

        {/* Treatment Section */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-lg font-semibold text-gray-900">Treatment Plan</span>
          </div>
        </div>

        {/* Treatments */}
        <div className="space-y-6">
          {formData.treatments && formData.treatments.length > 0 ? (
            formData.treatments.map((treatment, index) => (
              <div key={index} className="bg-white rounded-xl p-6 border border-blue-100 shadow-sm">
                <h4 className="text-lg font-bold text-gray-800 mb-4">Treatment #{index + 1}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditableField
                    label="Medication"
                    value={treatment.medication}
                    onChange={(e) => onTreatmentChange(index, 'medication', e.target.value)}
                  />
                  <EditableField
                    label="Dosage"
                    value={treatment.dosage}
                    onChange={(e) => onTreatmentChange(index, 'dosage', e.target.value)}
                  />
                  <EditableField
                    label="Duration"
                    value={treatment.duration}
                    onChange={(e) => onTreatmentChange(index, 'duration', e.target.value)}
                  />
                  <EditableField
                    label="Treatment Outcome"
                    value={treatment.outcome}
                    onChange={(e) => onTreatmentChange(index, 'outcome', e.target.value)}
                  />
                </div>
                
                <div className="flex justify-end gap-2 mt-4">
                  {formData.treatments.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => onRemoveTreatment(index)}
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Remove Treatment
                    </Button>
                  )}
                  {index === formData.treatments.length - 1 && (
                    <Button
                      type="button"
                      onClick={onAddTreatment}
                      variant="outline"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add Another Treatment
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl p-6 border border-blue-100 shadow-sm text-center text-gray-500">
              No treatments added yet
              <Button
                type="button"
                onClick={onAddTreatment}
                variant="outline"
                className="mt-4"
              >
                <Plus className="w-4 h-4 mr-2" /> Add First Treatment
              </Button>
            </div>
          )}
        </div>

        {/* Prognosis and Health Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <EditableField
            label="Prognosis"
            name="prognosis"
            value={formData.prognosis}
            onChange={onInputChange}
            placeholder="Enter the prognosis"
            textarea={true}
            required={true}
          />
          
          {/* Health Status */}
          <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
            <label htmlFor="healthStatus" className="text-sm font-medium text-gray-700 mb-2">
              Horse Health Status *
            </label>
            <select
              id="healthStatus"
              name="healthStatus"
              value={formData.healthStatus}
              onChange={onInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="Healthy">Healthy</option>
              <option value="Unhealthy">Unhealthy</option>
              <option value="Sick">Sick</option>
            </select>
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
              <span>Current status:</span>
              <HealthStatusBadge status={formData.healthStatus} />
            </div>
          </div>
        </div>

        {/* Recommendation and Follow-up */}
        <div className="grid grid-cols-1 gap-6">
          <EditableField
            label="Recommendation"
            name="recommendation"
            value={formData.recommendation}
            onChange={onInputChange}
            placeholder="Enter any recommendations or follow-up instructions"
            textarea={true}
            required={true}
          />
          
          <EditableField
            label="Follow-up Date"
            name="followUpDate"
            value={formData.followUpDate}
            onChange={onInputChange}
            type="date"
            icon={Calendar}
          />
        </div>

        {error && (
          <div className="text-red-500 text-sm mt-4 p-3 bg-red-100 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            onClick={onCancel}
            variant="outline"
            className="flex items-center gap-2 border-gray-300 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-4 h-4" /> Cancel
          </Button>

          <Button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-3"
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin mr-2" /> 
                Saving...
              </>
            ) : (
              "Save Medical Record"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

// --- 5. THE MAIN COMPONENT ---
const MedicalRecords = ({
  medicalRecords,
  vetProfile,
  horseInfo,
  appointmentId,
  onRefresh,
  isModal,
  onCloseModal,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    formData,
    imagePreview,
    isLoading,
    error,
    showConfirmation,
    showSuccessAlert,
  } = state;

  // Refs for each textarea
  const clinicalSignsRef = useRef(null);
  const diagnosticProtocolRef = useRef(null);
  const diagnosisRef = useRef(null);
  const labResultRef = useRef(null);
  const prognosisRef = useRef(null);
  const recommendationRef = useRef(null);

  // Hooking up the custom hook for each textarea
  useAutoResizeTextarea(formData.clinicalSigns, clinicalSignsRef);
  useAutoResizeTextarea(formData.diagnosticProtocol, diagnosticProtocolRef);
  useAutoResizeTextarea(formData.diagnosis, diagnosisRef);
  useAutoResizeTextarea(formData.labResult, labResultRef);
  useAutoResizeTextarea(formData.prognosis, prognosisRef);
  useAutoResizeTextarea(formData.recommendation, recommendationRef);

  // Reset form when component mounts to ensure clean state
  useEffect(() => {
    dispatch({ type: 'RESET_STATE' });
  }, []);

  // Memoized handlers
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    // Prevent date field from being changed
    if (name === 'date') return;
    dispatch({ type: 'SET_FIELD', field: name, value });
  }, []);

  const handleTreatmentChange = useCallback((index, field, value) => {
    dispatch({ type: 'SET_TREATMENT_FIELD', index, field, value });
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        dispatch({ type: 'SET_UI_STATE', payload: { error: "File size exceeds 10MB limit." } });
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        dispatch({
          type: 'SET_UI_STATE',
          payload: { imagePreview: reader.result }
        });
        dispatch({
          type: 'SET_FIELD',
          field: 'labImage',
          value: file
        });
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleRemoveLabImage = useCallback(() => {
    dispatch({ type: 'REMOVE_LAB_IMAGE' });
  }, []);

  const handleCancelForm = useCallback(() => {
    if (isModal && onCloseModal) {
      onCloseModal();
    } else {
      dispatch({ type: 'RESET_STATE' });
    }
  }, [isModal, onCloseModal]);

  const handleSaveConfirm = useCallback((e) => {
    e.preventDefault();
    
    if (!horseInfo?.id || !appointmentId) {
      dispatch({ type: 'SET_UI_STATE', payload: { error: "Cannot save: missing horse or appointment information." } });
      return;
    }
    
    // Validate all required fields for new records
    const requiredFields = ["heartRate", "respRate", "temperature", "clinicalSigns", "diagnosticProtocol", "diagnosis", "prognosis", "healthStatus", "recommendation"];
    const isFormComplete = requiredFields.every(field => formData[field]);
    
    if (!isFormComplete) {
      dispatch({ type: 'SET_UI_STATE', payload: { error: "Please fill in all required fields." } });
      return;
    }
    
    dispatch({ type: 'SET_UI_STATE', payload: { error: null, showConfirmation: true } });
  }, [formData, horseInfo, appointmentId]);

  const handleAddMedicalRecord = useCallback(async () => {
    if (!horseInfo?.id || !appointmentId) {
      dispatch({ type: 'SET_UI_STATE', payload: { error: "Cannot save medical record: missing information." } });
      return;
    }

    dispatch({ type: 'SET_UI_STATE', payload: { isLoading: true, error: null, showConfirmation: false } });

    try {
      const form = new FormData();
      form.append("horse_id", horseInfo.id);
      form.append("app_id", appointmentId);

      Object.keys(formData).forEach(key => {
        if (key === "labImage") {
          if (formData[key] instanceof File) {
            form.append(key, formData[key]);
          }
        } else if (key === "treatments") {
          form.append(key, JSON.stringify(formData[key]));
        } else {
          form.append(key, formData[key]);
        }
      });

      const response = await fetch("http://localhost:8000/api/veterinarian/add_medical_record/", {
        method: "POST",
        credentials: "include",
        body: form,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to add medical record");

      dispatch({
        type: 'SET_UI_STATE',
        payload: {
          medrecId: data.medrec_id,
          showSuccessAlert: true,
        },
      });

      onRefresh?.();

      setTimeout(() => {
        dispatch({ type: 'SET_UI_STATE', payload: { showSuccessAlert: false } });
        if (isModal && onCloseModal) {
          onCloseModal();
        }
      }, 1500);

    } catch (err) {
      dispatch({ type: 'SET_UI_STATE', payload: { error: err.message } });
    } finally {
      dispatch({ type: 'SET_UI_STATE', payload: { isLoading: false } });
    }
  }, [formData, horseInfo, appointmentId, onRefresh, isModal, onCloseModal]);

  const handleAddTreatment = useCallback(() => {
    dispatch({ type: 'ADD_TREATMENT' });
  }, []);

  const handleRemoveTreatment = useCallback((index) => {
    dispatch({ type: 'REMOVE_TREATMENT', index });
  }, []);

  const handleConfirmSave = useCallback(() => {
    handleAddMedicalRecord();
  }, [handleAddMedicalRecord]);

  const handleCancelConfirm = useCallback(() => {
    dispatch({ type: 'SET_UI_STATE', payload: { showConfirmation: false } });
  }, []);

  return (
    <>
      <Card className="shadow-lg rounded-2xl p-0 border-none w-full max-w-4xl mx-auto">
        <CardContent className="p-0">
          <RecordForm
            formData={formData}
            imagePreview={imagePreview}
            isLoading={isLoading}
            error={error}
            onInputChange={handleInputChange}
            onTreatmentChange={handleTreatmentChange}
            onFileChange={handleFileChange}
            onRemoveLabImage={handleRemoveLabImage}
            onCancel={handleCancelForm}
            onSubmit={handleSaveConfirm}
            onAddTreatment={handleAddTreatment}
            onRemoveTreatment={handleRemoveTreatment}
            clinicalSignsRef={clinicalSignsRef}
            diagnosticProtocolRef={diagnosticProtocolRef}
            diagnosisRef={diagnosisRef}
            labResultRef={labResultRef}
            prognosisRef={prognosisRef}
            recommendationRef={recommendationRef}
          />
        </CardContent>
      </Card>
      
      {/* SEPARATED CONFIRMATION MODAL */}
      {showConfirmation && (
        <ConfirmationModal 
          onConfirm={handleConfirmSave} 
          onCancel={handleCancelConfirm}
          isLoading={isLoading}
          formData={formData}
        />
      )}
      
      {/* SUCCESS ALERT STAYS IN MAIN FILE */}
      {showSuccessAlert && <SuccessAlert />}
    </>
  );
};

export default React.memo(MedicalRecords);