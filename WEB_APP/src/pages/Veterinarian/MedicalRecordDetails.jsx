import React from "react";
import { Button } from "@/components/ui/button";
import {Calendar,Bell,Activity,ClipboardList,Search,FileText,Heart,StickyNote,TrendingUp,X,Plus,CheckCircle,Clock,XCircle,AlertCircle,Pill,Syringe,Clock3} from "lucide-react";

// Medical Record Details Component - Full Screen Modal
const MedicalRecordDetails = ({ 
  record, 
  onClose, 
  onRecordFollowUp, 
  onViewFollowUp, 
  vetProfile, 
  horseInfo, 
  hasAccess, 
  medicalRecords = [] 
}) => {
  if (!record) return null;

  // Function to determine follow-up status
  const getFollowUpStatus = (record) => {
    if (!record.medrec_followup_date && !record.followUpDate) return null;
    
    const followUpDate = record.medrec_followup_date || record.followUpDate;
    if (!followUpDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const followUp = new Date(followUpDate);
    followUp.setHours(0, 0, 0, 0);
    
    // Check if this record has a follow-up record
    const hasFollowUp = medicalRecords.some(r => 
      r.parent_medrec_id === record.id || r.parent_medrec_id === record.medrec_id
    );
    
    if (hasFollowUp) {
      return { 
        status: 'completed', 
        label: 'Completed', 
        icon: CheckCircle, 
        color: 'text-green-600 bg-green-100 border border-green-200' 
      };
    } else if (followUp < today) {
      return { 
        status: 'missed', 
        label: 'Missed', 
        icon: XCircle, 
        color: 'text-red-600 bg-red-100 border border-red-200' 
      };
    } else if (followUp.getTime() === today.getTime()) {
      return { 
        status: 'due', 
        label: 'Due Today', 
        icon: AlertCircle, 
        color: 'text-orange-600 bg-orange-100 border border-orange-200' 
      };
    } else {
      return { 
        status: 'pending', 
        label: 'Pending', 
        icon: Clock, 
        color: 'text-blue-600 bg-blue-100 border border-blue-200' 
      };
    }
  };

  const isCurrentVetRecord = () => {
    if (!vetProfile || !record.veterinarian) return false;
    const currentVetName = `${vetProfile.first_name} ${vetProfile.last_name}`;
    return record.veterinarian === currentVetName;
  };

  const currentVet = isCurrentVetRecord();
  const followUpStatus = getFollowUpStatus(record);

  // Find the follow-up record if it exists
  const followUpRecord = medicalRecords.find(r => 
    r.parent_medrec_id === record.id || r.parent_medrec_id === record.medrec_id
  );

  // Parse treatments from the record
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

  const treatments = parseTreatments(record);

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-blue-600 text-white p-6 sticky top-0 z-10 shadow-lg">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-6 h-6" />
              <h2 className="text-2xl font-bold">
                Medical Record Details
              </h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                (record.status || record.medrec_status) === 'Recovered' ? 'bg-green-100 text-green-700' :
                (record.status || record.medrec_status) === 'Under Treatment' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {record.status || record.medrec_status || 'Active'}
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-blue-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {new Date(record.date || record.medrec_date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
              
              {followUpStatus && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${followUpStatus.color}`}>
                  <followUpStatus.icon className="w-3 h-3" />
                  <span>Follow-up: {followUpStatus.label}</span>
                  <span className="ml-1">
                    ({new Date(record.medrec_followup_date || record.followUpDate).toLocaleDateString()})
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <Button 
            onClick={onClose}
            variant="outline" 
            size="sm"
            className="cursor-pointer border-white text-white hover:bg-blue-700 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Vital Signs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <Heart className="w-5 h-5 text-red-500" />
            <div>
              <div className="text-sm text-gray-500">Heart Rate</div>
              <div className="font-semibold text-lg">{record.heartRate || record.medrec_heart_rate || "N/A"}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <Activity className="w-5 h-5 text-blue-500" />
            <div>
              <div className="text-sm text-gray-500">Respiratory Rate</div>
              <div className="font-semibold text-lg">{record.respiratoryRate || record.medrec_resp_rate || "N/A"}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <div>
              <div className="text-sm text-gray-500">Temperature</div>
              <div className="font-semibold text-lg">{record.bodyTemp || record.medrec_body_temp || "N/A"}</div>
            </div>
          </div>
        </div>

        {/* Medical Record Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Column 1: Clinical Information */}
          <div className="space-y-6">
            {/* Clinical Signs Card */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-5 rounded-lg">
              <div className="text-sm font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Clinical Signs
              </div>
              <div className="text-gray-700">
                {record.clinicalSigns || record.medrec_clinical_signs || "No clinical signs recorded"}
              </div>
            </div>

            {/* Diagnosis Card */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-5 rounded-lg">
              <div className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <Search className="w-4 h-4" />
                Diagnosis
              </div>
              <div className="text-gray-800 font-medium">
                {record.diagnosis || record.medrec_diagnosis || "No diagnosis recorded"}
              </div>
            </div>

            {/* Diagnostic Protocol Card */}
            <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
              <h5 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                Diagnostic Protocol
              </h5>
              <div className="text-gray-700">
                {record.diagnosticProtocol || record.medrec_diagnostic_protocol || "No diagnostic protocol recorded"}
              </div>
            </div>
          </div>

          {/* Column 2: Prognosis & Additional Information */}
          <div className="space-y-6">
            {/* Prognosis Card */}
            <div className="bg-green-50 border-l-4 border-green-400 p-5 rounded-lg">
              <div className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Prognosis
              </div>
              <div className="text-gray-700">
                {record.prognosis || record.medrec_prognosis || "No prognosis recorded"}
              </div>
            </div>

            {/* Recommendations Card */}
            <div className="bg-purple-50 border-l-4 border-purple-400 p-5 rounded-lg">
              <div className="text-sm font-semibold text-purple-800 mb-2 flex items-center gap-2">
                <StickyNote className="w-4 h-4" />
                Recommendation
              </div>
              <div className="text-gray-700">
                {record.recommendation || record.medrec_recommendation || "No recommendations provided"}
              </div>
            </div>

            {/* Veterinarian Information */}
            <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
              <h5 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-blue-600" />
                Veterinarian
              </h5>
              <div className="flex items-center gap-2">
                <div className="text-gray-800 font-medium">
                  {record.veterinarian || "N/A"}
                </div>
                {currentVet && (
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    You
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Treatment Section */}
        {treatments && treatments.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Pill className="w-5 h-5 text-blue-600" />
              Treatment Plan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {treatments.map((treatment, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Syringe className="w-4 h-4 text-blue-600" />
                    <h4 className="font-semibold text-gray-800">Treatment #{index + 1}</h4>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-gray-500">Medication</div>
                      <div className="font-medium text-sm">{treatment.medication || "Not specified"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Dosage</div>
                      <div className="font-medium text-sm">{treatment.dosage || "Not specified"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Duration</div>
                      <div className="font-medium text-sm">{treatment.duration || "Not specified"}</div>
                    </div>
                    {treatment.outcome && (
                      <div>
                        <div className="text-xs text-gray-500">Outcome</div>
                        <div className="font-medium text-sm text-green-700">{treatment.outcome}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lab Results Section */}
        {(record.labResults || record.medrec_lab_results) && (
          <div className="mb-8 bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
            <h5 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              Lab Results
            </h5>
            <div className="text-gray-700">
              {record.labResults || record.medrec_lab_results}
            </div>
          </div>
        )}

        {/* Lab Image Section */}
        {(record.labImage || record.medrec_lab_img) && (
          <div className="mb-8 bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
            <h5 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-blue-600" />
              Lab Image
            </h5>
            <img 
              src={record.labImage || record.medrec_lab_img} 
              alt="Lab results" 
              className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/image-placeholder.jpg";
              }}
            />
          </div>
        )}

        {/* Follow-up Section */}
        <div className="border-t pt-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Clock3 className="w-5 h-5 text-blue-600" />
              Follow-up Records
            </h3>
            
            {/* Record Follow-Up Checkup Button */}
            {followUpStatus && followUpStatus.status !== 'completed' && hasAccess && (
              <Button 
                onClick={() => onRecordFollowUp(record)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Record Follow-Up Checkup
              </Button>
            )}
          </div>

          {/* Follow-up Record Display */}
          {followUpRecord ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold text-green-800">Follow-up Record Available</h4>
              </div>
              <div className="text-sm text-green-700 mb-3">
                Follow-up completed on {new Date(followUpRecord.date || followUpRecord.medrec_date).toLocaleDateString()}
              </div>
              <Button 
                onClick={() => onViewFollowUp(followUpRecord)}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                View Follow-Up Record
              </Button>
            </div>
          ) : followUpStatus && followUpStatus.status !== 'completed' ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-700">
                No follow-up record yet. Follow-up is {followUpStatus.label.toLowerCase()}.
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default MedicalRecordDetails;