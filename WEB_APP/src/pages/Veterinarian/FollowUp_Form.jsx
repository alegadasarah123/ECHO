import React, { useEffect, useCallback, useReducer, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, X, Upload, Loader, Heart, Thermometer, Stethoscope, Calendar, Syringe, Pill } from "lucide-react";
import ConfirmationModal from "@/components/modal/ConfirmationModal";

// Initial state for follow-up form
const initialFollowUpFormData = {
  date: new Date().toISOString().split('T')[0],
  heartRate: "",
  respRate: "",
  temperature: "",
  clinicalSigns: "",
  diagnosticProtocol: "",
  diagnosis: "",
  labResult: "",
  labImage: null,
  treatments: [],
  prognosis: "",
  healthStatus: "HEALTHY",
  recommendation: "",
  followUpDate: "",
  parent_medrec_id: ""
};

const initialState = {
  formData: initialFollowUpFormData,
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

// Follow-up Form Component
const FollowUpForm = ({
  originalRecord,
  vetProfile,
  horseInfo,
  appointmentId,
  onClose,
  onSuccess,
  onRefresh
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

  // Initialize form with original record data
  useEffect(() => {
    if (originalRecord) {
      // Parse treatments from original record
      const parseTreatments = (record) => {
        try {
          if (record.treatments && typeof record.treatments === 'string') {
            return JSON.parse(record.treatments);
          }
          if (record.medrec_treatments && typeof record.medrec_treatments === 'string') {
            return JSON.parse(record.medrec_treatments);
          }
          return record.treatments || record.medrec_treatments || [];
        } catch (error) {
          console.error('Error parsing treatments:', error);
          return [];
        }
      };

      const originalTreatments = parseTreatments(originalRecord);
      
      // Add outcome field to each treatment for follow-up
      const treatmentsWithOutcome = originalTreatments.map(treatment => ({
        ...treatment,
        outcome: "" // Empty outcome to be filled in follow-up
      }));

      dispatch({
        type: 'SET_FORM_DATA',
        payload: {
          ...initialFollowUpFormData,
          parent_medrec_id: originalRecord.id || originalRecord.medrec_id,
          treatments: treatmentsWithOutcome
        }
      });
    }
  }, [originalRecord]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
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
    onClose();
  }, [onClose]);

  const handleSaveConfirm = useCallback((e) => {
    e.preventDefault();
    
    if (!horseInfo?.id || !appointmentId) {
      dispatch({ type: 'SET_UI_STATE', payload: { error: "Cannot save: missing horse or appointment information." } });
      return;
    }
    
    // Validate that all treatment outcomes are filled
    const hasEmptyOutcomes = formData.treatments.some(treatment => !treatment.outcome);
    if (hasEmptyOutcomes) {
      dispatch({ type: 'SET_UI_STATE', payload: { error: "Please fill in outcome for all treatments." } });
      return;
    }
    
    dispatch({ type: 'SET_UI_STATE', payload: { error: null, showConfirmation: true } });
  }, [formData, horseInfo, appointmentId]);

  const handleAddFollowUpRecord = useCallback(async () => {
    if (!horseInfo?.id || !appointmentId || !originalRecord) {
      dispatch({ type: 'SET_UI_STATE', payload: { error: "Cannot save follow-up record: missing information." } });
      return;
    }

    dispatch({ type: 'SET_UI_STATE', payload: { isLoading: true, error: null, showConfirmation: false } });

    try {
      const form = new FormData();
      form.append("horse_id", horseInfo.id);
      form.append("app_id", appointmentId);
      form.append("parent_medrec_id", originalRecord.id || originalRecord.medrec_id);

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
      if (!response.ok) throw new Error(data.error || "Failed to add follow-up record");

      dispatch({
        type: 'SET_UI_STATE',
        payload: {
          medrecId: data.medrec_id,
          showSuccessAlert: true,
        },
      });

      onRefresh?.();
      onSuccess?.();

      setTimeout(() => {
        dispatch({ type: 'SET_UI_STATE', payload: { showSuccessAlert: false } });
        onClose();
      }, 1500);

    } catch (err) {
      dispatch({ type: 'SET_UI_STATE', payload: { error: err.message } });
    } finally {
      dispatch({ type: 'SET_UI_STATE', payload: { isLoading: false } });
    }
  }, [formData, horseInfo, appointmentId, originalRecord, onRefresh, onSuccess, onClose]);

  const handleConfirmSave = useCallback(() => {
    handleAddFollowUpRecord();
  }, [handleAddFollowUpRecord]);

  const handleCancelConfirm = useCallback(() => {
    dispatch({ type: 'SET_UI_STATE', payload: { showConfirmation: false } });
  }, []);

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Record Follow-up Checkup
          </h2>
          <Button 
            onClick={onClose}
            variant="outline" 
            size="sm"
            className="cursor-pointer"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Original Treatment Information */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-3">Original Treatment Plan</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {formData.treatments.map((treatment, index) => (
              <div key={index} className="bg-white rounded p-3 border border-blue-100">
                <h4 className="font-medium text-sm text-blue-700 mb-2">Treatment #{index + 1}</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>Medication:</strong> {treatment.medication}</div>
                  <div><strong>Dosage:</strong> {treatment.dosage}</div>
                  <div><strong>Duration:</strong> {treatment.duration}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Follow-up Form */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <form onSubmit={handleSaveConfirm}>
              {/* Date Field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Follow-up Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 cursor-not-allowed"
                />
              </div>

              {/* Treatment Outcomes */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Treatment Outcomes</h3>
                <div className="space-y-4">
                  {formData.treatments.map((treatment, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium mb-3">Treatment #{index + 1}: {treatment.medication}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3 text-sm">
                        <div><strong>Original Dosage:</strong> {treatment.dosage}</div>
                        <div><strong>Original Duration:</strong> {treatment.duration}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Treatment Outcome *
                        </label>
                        <textarea
                          value={treatment.outcome}
                          onChange={(e) => handleTreatmentChange(index, 'outcome', e.target.value)}
                          placeholder="Describe the outcome of this treatment..."
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Follow-up Information */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Clinical Signs
                  </label>
                  <textarea
                    name="clinicalSigns"
                    value={formData.clinicalSigns}
                    onChange={handleInputChange}
                    placeholder="Describe current clinical signs..."
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Diagnosis
                  </label>
                  <textarea
                    name="diagnosis"
                    value={formData.diagnosis}
                    onChange={handleInputChange}
                    placeholder="Enter current diagnosis..."
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Prognosis
                  </label>
                  <textarea
                    name="prognosis"
                    value={formData.prognosis}
                    onChange={handleInputChange}
                    placeholder="Enter current prognosis..."
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              </div>

              {error && (
                <div className="text-red-500 text-sm mb-4 p-3 bg-red-100 rounded border border-red-200">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  onClick={handleCancelForm}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin mr-2" /> 
                      Saving...
                    </>
                  ) : (
                    "Save Follow-up Record"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Confirmation Modal */}
        {showConfirmation && (
          <ConfirmationModal 
            onConfirm={handleConfirmSave} 
            onCancel={handleCancelConfirm}
            isLoading={isLoading}
            title="Confirm Follow-up Record"
            message="Are you sure you want to save this follow-up record?"
          />
        )}
        
        {/* Success Alert */}
        {showSuccessAlert && (
          <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg z-[1000]">
            Follow-up record saved successfully!
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowUpForm;