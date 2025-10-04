import React from "react";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Bell,
  Activity,
  ClipboardList,
  Search,
  FileText,
  Heart,
  StickyNote,
  TrendingUp,
  X,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle
} from "lucide-react";

// Medical Record Details Component - Shows below the row when View Details is clicked
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

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-2 animate-fade-in">
      {/* Header with Close Button and Follow-up Status */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h4 className="text-lg font-semibold text-blue-900">
              Medical Record - {new Date(record.date || record.medrec_date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h4>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              (record.status || record.medrec_status) === 'Recovered' ? 'bg-green-100 text-green-700 border border-green-200' :
              (record.status || record.medrec_status) === 'Under Treatment' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
              'bg-gray-100 text-gray-700 border border-gray-200'
            }`}>
              {record.status || record.medrec_status || 'Active'}
            </span>
          </div>
          
          {/* Follow-up Status Display */}
          {followUpStatus && (
            <div className="flex items-center gap-2 mt-2">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${followUpStatus.color}`}>
                <followUpStatus.icon className="w-3 h-3" />
                <span>Follow-up: {followUpStatus.label}</span>
              </div>
              <span className="text-sm text-gray-600">
                ({new Date(record.medrec_followup_date || record.followUpDate).toLocaleDateString()})
              </span>
            </div>
          )}
        </div>
        
        <Button 
          onClick={onClose}
          variant="outline" 
          size="sm"
          className="cursor-pointer border-gray-300 text-gray-700 hover:bg-gray-100"
        >
          <X className="w-4 h-4 mr-1" />
          Close
        </Button>
      </div>

      {/* Vital Signs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-200">
          <Heart className="w-4 h-4 text-red-500" />
          <div>
            <div className="text-xs text-gray-500">Heart Rate</div>
            <div className="font-medium">{record.heartRate || record.medrec_heart_rate || "N/A"}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-200">
          <Activity className="w-4 h-4 text-blue-500" />
          <div>
            <div className="text-xs text-gray-500">Respiratory Rate</div>
            <div className="font-medium">{record.respiratoryRate || record.medrec_resp_rate || "N/A"}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-200">
          <TrendingUp className="w-4 h-4 text-orange-500" />
          <div>
            <div className="text-xs text-gray-500">Temperature</div>
            <div className="font-medium">{record.bodyTemp || record.medrec_body_temp || "N/A"}</div>
          </div>
        </div>
      </div>

      {/* Medical Record Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Column 1: Clinical Information */}
        <div className="space-y-4">
          {/* Clinical Signs Card */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <div className="text-xs font-semibold text-yellow-800 mb-1">🤒 Clinical Signs</div>
            <div className="text-sm text-gray-700">
              {record.clinicalSigns || record.medrec_clinical_signs || "No clinical signs recorded"}
            </div>
          </div>

          {/* Diagnosis Card */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
            <div className="text-xs font-semibold text-blue-800 mb-1">🧠 Diagnosis</div>
            <div className="text-sm font-medium text-gray-800">
              {record.diagnosis || record.medrec_diagnosis || "No diagnosis recorded"}
            </div>
          </div>

          {/* Diagnostic Protocol Card */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h5 className="font-semibold text-blue-800 flex items-center gap-2 mb-3">
              <Search className="w-4 h-4" />
              Diagnostic Protocol
            </h5>
            <div className="text-sm text-gray-700">
              {record.diagnosticProtocol || record.medrec_diagnostic_protocol || "No diagnostic protocol recorded"}
            </div>
          </div>
        </div>

        {/* Column 2: Prognosis & Additional Information */}
        <div className="space-y-4">
          {/* Prognosis Card */}
          <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
            <div className="text-xs font-semibold text-green-800 mb-1">🩺 Prognosis</div>
            <div className="text-sm text-gray-700">
              {record.prognosis || record.medrec_prognosis || "No prognosis recorded"}
            </div>
          </div>

          {/* Recommendations Card */}
          <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded">
            <div className="text-xs font-semibold text-purple-800 mb-1">💡 Recommendation</div>
            <div className="text-sm text-gray-700">
              {record.recommendation || record.medrec_recommendation || "No recommendations provided"}
            </div>
          </div>

          {/* Veterinarian Information */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h5 className="font-semibold text-blue-800 flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4" />
              Veterinarian
            </h5>
            <div className="text-sm font-medium text-gray-800">
              {record.veterinarian || "N/A"}
              {currentVet && (
                <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  You
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lab Results Section */}
      {(record.labResults || record.medrec_lab_results) && (
        <div className="mb-6 bg-white rounded-lg p-4 border border-gray-200">
          <h5 className="font-semibold text-blue-800 flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4" />
            Lab Results
          </h5>
          <div className="text-sm text-gray-700">
            {record.labResults || record.medrec_lab_results}
          </div>
        </div>
      )}

      {/* Action Buttons - Follow-up Only */}
      <div className="flex gap-2 pt-4 border-t border-gray-300">
        {/* Record Follow-Up Checkup Button - Show for pending, due today, and missed statuses */}
        {followUpStatus && followUpStatus.status !== 'completed' && hasAccess && (
          <Button 
            onClick={() => onRecordFollowUp(record)}
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Record Follow-Up Checkup
          </Button>
        )}
        
        {/* View Follow-Up Record Button - Show when follow-up is completed */}
        {followUpStatus && followUpStatus.status === 'completed' && followUpRecord && (
          <Button 
            onClick={() => onViewFollowUp(followUpRecord)}
            className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            View Follow-Up Record
          </Button>
        )}
      </div>

      {/* Lab Image Section */}
      {(record.labImage || record.medrec_lab_img) && (
        <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
          <h5 className="font-semibold text-blue-800 flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4" />
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
    </div>
  );
};

export default MedicalRecordDetails;