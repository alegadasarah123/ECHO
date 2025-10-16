import React, { useEffect, useCallback, useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X, Upload, Loader, Heart, Thermometer, Stethoscope, Calendar, Pill, FileText, Activity, ClipboardList, TrendingUp, StickyNote, Clock3, CheckCircle, AlertCircle, User, Image, File, Trash2, Eye, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import ConfirmationModal from "@/components/modal/ConfirmationModal";

// --- 1. INITIAL STATE AND REDUCER LOGIC ---
const initialFormData = {
  heartRate: "",
  respRate: "",
  temperature: "",
  clinicalSigns: "",
  diagnosticProtocol: "",
  diagnosis: "",
  labResult: "",
  labFiles: [], // Array for multiple files
  treatments: [{
    medication: "",
    dosage: "",
    duration: ""
  }],
  prognosis: "",
  healthStatus: "Healthy",
  recommendation: "",
  followUpDate: "",
  followUpStartTime: "",
  followUpEndTime: "",
  scheduleId: ""
};

const initialState = {
  formData: initialFormData,
  isLoading: false,
  error: null,
  showConfirmation: false,
  showSuccessAlert: false,
  medrecId: null,
  schedules: [],
  loadingSchedules: false,
  showCustomSchedule: false,
  dragActive: false,
  uploading: false,
  uploadProgress: 0,
  // FILE VIEWER STATES
  fileViewerOpen: false,
  currentFileIndex: 0,
  zoomLevel: 1,
  rotation: 0
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
            { medication: "", dosage: "", duration: "" }
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
    case 'ADD_LAB_FILES':
      const newFiles = [...state.formData.labFiles, ...action.payload];
      // Limit to 10 files max
      const limitedFiles = newFiles.slice(0, 10);
      return {
        ...state,
        formData: {
          ...state.formData,
          labFiles: limitedFiles
        }
      };
    case 'REMOVE_LAB_FILE':
      const remainingFiles = state.formData.labFiles.filter((_, i) => i !== action.index);
      return {
        ...state,
        formData: {
          ...state.formData,
          labFiles: remainingFiles
        }
      };
    case 'CLEAR_LAB_FILES':
      return {
        ...state,
        formData: {
          ...state.formData,
          labFiles: []
        }
      };
    // FILE VIEWER ACTIONS
    case 'OPEN_FILE_VIEWER':
      return {
        ...state,
        fileViewerOpen: true,
        currentFileIndex: action.payload,
        zoomLevel: 1,
        rotation: 0
      };
    case 'CLOSE_FILE_VIEWER':
      return {
        ...state,
        fileViewerOpen: false,
        currentFileIndex: 0,
        zoomLevel: 1,
        rotation: 0
      };
    case 'SET_ZOOM_LEVEL':
      return {
        ...state,
        zoomLevel: action.payload
      };
    case 'SET_ROTATION':
      return {
        ...state,
        rotation: action.payload
      };
    case 'SET_CURRENT_FILE_INDEX':
      return {
        ...state,
        currentFileIndex: action.payload
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

// File utility functions
const getFileIcon = (file) => {
  if (file.type === 'application/pdf') {
    return <FileText className="w-5 h-5 text-red-500" />;
  } else if (file.type.startsWith('image/')) {
    return <Image className="w-5 h-5 text-blue-500" />;
  } else {
    return <File className="w-5 h-5 text-gray-500" />;
  }
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const validateFile = (file) => {
  // Validate file type
  const isValidType = file.type === 'application/pdf' || 
                     file.type.startsWith('image/') ||
                     file.name.toLowerCase().endsWith('.pdf') ||
                     file.name.toLowerCase().endsWith('.png') ||
                     file.name.toLowerCase().endsWith('.jpg') ||
                     file.name.toLowerCase().endsWith('.jpeg');
  
  if (!isValidType) {
    alert(`❌ File type not supported: ${file.name}\nPlease upload PDF, PNG, JPG, or JPEG files.`);
    return false;
  }
  
  // Validate file size (10MB limit)
  if (file.size > 10 * 1024 * 1024) {
    alert(`📁 File too large: ${file.name}\nMaximum size is 10MB.`);
    return false;
  }
  
  return true;
};

// ========== FULL-SCREEN FILE VIEWER COMPONENT ==========
const FileViewer = ({ 
  files, 
  currentFileIndex, 
  zoomLevel, 
  rotation, 
  onClose, 
  onNext, 
  onPrev, 
  onZoomIn, 
  onZoomOut, 
  onRotate, 
  onReset 
}) => {
  const currentFile = files[currentFileIndex];
  const isImage = currentFile?.type?.startsWith('image/');
  const isPDF = currentFile?.type === 'application/pdf';

  if (!files || files.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black z-[70] flex flex-col">
      {/* Minimal Header - Only for PDF */}
      {isPDF && (
        <div className="bg-black border-b border-gray-800 p-4 flex-shrink-0 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="font-semibold text-white">{currentFile?.name}</h3>
              <p className="text-sm text-gray-400">
                {currentFile?.fileObject && formatFileSize(currentFile.fileObject.size)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* File Navigation */}
            {files.length > 1 && (
              <div className="flex items-center gap-1 mr-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPrev}
                  className="h-8 w-8 p-0 text-white hover:bg-gray-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium text-gray-300 min-w-[60px] text-center">
                  {currentFileIndex + 1} / {files.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNext}
                  className="h-8 w-8 p-0 text-white hover:bg-gray-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            <Button
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8 p-0 text-white hover:bg-gray-800"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Image Controls - Floating */}
      {isImage && (
        <div className="fixed top-4 right-4 z-10 flex items-center gap-2 bg-black bg-opacity-70 rounded-lg p-2">
          {/* File Navigation */}
          {files.length > 1 && (
            <div className="flex items-center gap-1 border-r border-gray-700 pr-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onPrev}
                className="h-8 w-8 p-0 text-white hover:bg-gray-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium text-gray-300 min-w-[40px] text-center">
                {currentFileIndex + 1} / {files.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onNext}
                className="h-8 w-8 p-0 text-white hover:bg-gray-700"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border-r border-gray-700 pr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onZoomOut}
              disabled={zoomLevel <= 0.5}
              className="h-8 w-8 p-0 text-white hover:bg-gray-700"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-white w-12 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onZoomIn}
              disabled={zoomLevel >= 3}
              className="h-8 w-8 p-0 text-white hover:bg-gray-700"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Rotate */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onRotate}
            className="h-8 w-8 p-0 text-white hover:bg-gray-700"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          
          {/* Reset */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-8 w-8 p-0 text-white hover:bg-gray-700"
          >
            Reset
          </Button>

          {/* Close */}
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 p-0 text-white hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* File Content - Full Screen */}
      <div className="flex-1 bg-black flex items-center justify-center overflow-hidden">
        {isImage ? (
          <div className="w-full h-full flex items-center justify-center overflow-auto">
            <div 
              className="flex items-center justify-center"
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease-in-out'
              }}
            >
              <img
                src={currentFile?.url}
                alt={currentFile?.name}
                className="max-w-none select-none"
                style={{
                  width: 'auto',
                  height: 'auto',
                  maxWidth: 'none',
                  maxHeight: 'none'
                }}
              />
            </div>
        </div>
        ) : isPDF ? (
          <div className="w-full h-full">
            <iframe
              src={currentFile?.url}
              className="w-full h-full border-0"
              title={currentFile?.name}
              style={{ 
                minHeight: '100vh',
                backgroundColor: 'white'
              }}
            />
          </div>
        ) : (
          <div className="text-center text-white">
            <File className="w-16 h-16 mx-auto mb-4" />
            <p>Unsupported file type</p>
          </div>
        )}
      </div>
    </div>
  );
};

// File Upload Section Component
const FileUploadSection = ({ 
  labFiles, 
  onFilesAdd, 
  onFileRemove, 
  onFilePreview,
  dragActive, 
  onDragStateChange,
  uploading,
  uploadProgress 
}) => {
  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      onDragStateChange(true);
    } else if (e.type === "dragleave") {
      onDragStateChange(false);
    }
  };

  // Handle drop event
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDragStateChange(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Process selected files
  const handleFiles = (files) => {
    const fileList = Array.from(files);
    const validFiles = fileList.filter(validateFile);

    if (validFiles.length > 0) {
      onFilesAdd(validFiles);
      
      if (validFiles.length < fileList.length) {
        alert(`✅ Added ${validFiles.length} file(s). Some files were skipped due to invalid type or size.`);
      }
    }
  };

  // Handle file input change
  const handleFileUpload = (event) => {
    if (event.target.files && event.target.files[0]) {
      handleFiles(event.target.files);
    }
    // Reset the input
    event.target.value = '';
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Lab Files</h3>
        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Optional</span>
        {labFiles.length > 0 && (
          <span className="text-sm text-gray-500">
            {labFiles.length}/10 files
          </span>
        )}
      </div>
      
      {/* Drag & Drop Area */}
      <div
        className={`relative border-2 border-dashed rounded-xl min-h-[200px] flex flex-col items-center justify-center p-6 transition-all duration-200 ${
          dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : labFiles.length > 0 
              ? 'border-gray-300 bg-gray-50' 
              : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="lab-file-upload"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/*"
          onChange={handleFileUpload}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        {labFiles.length === 0 ? (
          <div className="text-center">
            <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600 mb-2 font-medium">
              Drag & drop files here
            </p>
            <p className="text-sm text-gray-500 mb-4">
              or click to browse
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
              <span className="bg-gray-200 px-2 py-1 rounded">PDF</span>
              <span className="bg-gray-200 px-2 py-1 rounded">PNG</span>
              <span className="bg-gray-200 px-2 py-1 rounded">JPG</span>
              <span className="bg-gray-200 px-2 py-1 rounded">JPEG</span>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Max 10 files • 10MB each
            </p>
          </div>
        ) : (
          <div className="w-full">
            <div className="text-center mb-4">
              <FileText className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="text-sm text-gray-600">
                {labFiles.length} file{labFiles.length > 1 ? 's' : ''} selected
              </p>
              <p className="text-xs text-gray-500">
                Drag & drop to add more files, or click to browse
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded Files List */}
      {labFiles.length > 0 && (
        <div className="mt-4 space-y-3">
          <h4 className="font-medium text-gray-700 text-sm">Selected Files:</h4>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {labFiles.map((file, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-200 transition-colors group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    {getFileIcon(file)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate text-gray-900">
                      {file.name}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span>{file.type || 'Unknown type'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFilePreview(index)}
                    className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                    title="Preview File"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFileRemove(index)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          {/* File Limit Warning */}
          {labFiles.length >= 10 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
              <div className="flex items-center gap-2 text-amber-800 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Maximum of 10 files reached</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex justify-between text-sm text-blue-700 mb-2">
            <span className="font-medium">Uploading files...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

// Schedule Card Component
const ScheduleCard = ({ schedule, isSelected, onSelect, onCancelSelect }) => {
  return (
    <div
      className={`p-4 border rounded-lg transition-all duration-200 ${
        isSelected
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
      }`}
      onClick={() => !isSelected && onSelect(schedule.id)}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-gray-900">{schedule.date}</span>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full border border-green-200">
          <CheckCircle className="w-3 h-3" />
          Available
        </span>
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        <Clock3 className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-700">
          {schedule.startTime} - {schedule.endTime}
        </span>
      </div>
      
      {schedule.operator_name && (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">{schedule.operator_name}</span>
        </div>
      )}
      
      {isSelected && (
        <div className="mt-3 p-2 bg-blue-100 rounded border border-blue-200">
          <div className="flex items-center justify-between">
            <p className="text-xs text-blue-700 font-medium">
              ✓ Selected for follow-up
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onCancelSelect();
              }}
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions for time calculations
const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return '';
  
  const start = convertTimeToMinutes(startTime);
  const end = convertTimeToMinutes(endTime);
  
  if (end <= start) return 'Invalid time range';
  
  const durationMinutes = end - start;
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
};

const convertTimeToMinutes = (timeStr) => {
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  
  if (modifier === 'PM' && hours !== 12) {
    hours += 12;
  }
  if (modifier === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return hours * 60 + minutes;
};

// Time dropdown options
const hours = Array.from({ length: 12 }, (_, i) => i + 1);
const minutes = Array.from({ length: 60 }, (_, i) => i);
const timePeriods = ['AM', 'PM'];

// Time Selector Component with 3 columns
const TimeSelector = ({ value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState("");
  const [selectedMinute, setSelectedMinute] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");

  // Parse current value when component mounts or value changes
  useEffect(() => {
    if (value) {
      const [time, period] = value.split(' ');
      const [hour, minute] = time.split(':');
      setSelectedHour(hour);
      setSelectedMinute(minute);
      setSelectedPeriod(period);
    } else {
      setSelectedHour("");
      setSelectedMinute("");
      setSelectedPeriod("");
    }
  }, [value]);

  const handleHourSelect = (hour) => {
    setSelectedHour(hour);
  };

  const handleMinuteSelect = (minute) => {
    setSelectedMinute(minute);
  };

  const handlePeriodSelect = (period) => {
    setSelectedPeriod(period);
  };

  const handleApply = () => {
    if (selectedHour && selectedMinute && selectedPeriod) {
      const timeString = `${selectedHour}:${selectedMinute} ${selectedPeriod}`;
      onChange(timeString);
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setSelectedHour("");
    setSelectedMinute("");
    setSelectedPeriod("");
    onChange("");
    setIsOpen(false);
  };

  const displayValue = value || placeholder;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full border border-gray-300 rounded-lg p-3 text-sm text-left ${
          value ? 'text-gray-900' : 'text-gray-500'
        } bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
      >
        {displayValue}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-80 bg-white border border-gray-300 rounded-lg shadow-lg">
          {/* Header */}
          <div className="p-3 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-900">Select Time</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  className="h-7 text-xs"
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={handleApply}
                  disabled={!selectedHour || !selectedMinute || !selectedPeriod}
                  className="h-7 text-xs"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>

          {/* Time Selection Grid */}
          <div className="p-3">
            <div className="grid grid-cols-3 gap-2">
              {/* Hours Column */}
              <div>
                <div className="text-xs font-medium text-gray-700 mb-2 text-center">Hour</div>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded">
                  {hours.map((hour) => (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => handleHourSelect(hour.toString())}
                      className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-100 ${
                        selectedHour === hour.toString() 
                          ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500' 
                          : 'text-gray-700'
                      }`}
                    >
                      {hour}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minutes Column */}
              <div>
                <div className="text-xs font-medium text-gray-700 mb-2 text-center">Minute</div>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded">
                  {minutes.map((minute) => (
                    <button
                      key={minute}
                      type="button"
                      onClick={() => handleMinuteSelect(minute.toString().padStart(2, '0'))}
                      className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-100 ${
                        selectedMinute === minute.toString().padStart(2, '0')
                          ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
                          : 'text-gray-700'
                      }`}
                    >
                      {minute.toString().padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>

              {/* AM/PM Column */}
              <div>
                <div className="text-xs font-medium text-gray-700 mb-2 text-center">AM/PM</div>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded">
                  {timePeriods.map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => handlePeriodSelect(period)}
                      className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-100 ${
                        selectedPeriod === period
                          ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
                          : 'text-gray-700'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Selected Time Preview */}
            {(selectedHour || selectedMinute || selectedPeriod) && (
              <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-200">
                <div className="text-xs text-gray-600">
                  Selected: <span className="font-medium text-gray-900">
                    {selectedHour || '--'}:{selectedMinute || '--'} {selectedPeriod || '--'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- 4. THE MAIN FORM COMPONENT ---
const RecordForm = ({ 
  formData, 
  isLoading, 
  error, 
  onInputChange, 
  onTreatmentChange, 
  onCancel, 
  onSubmit, 
  onAddTreatment, 
  onRemoveTreatment,
  onFilesAdd,
  onFileRemove,
  onFilePreview,
  onDragStateChange,
  horseInfo,
  schedules,
  loadingSchedules,
  showCustomSchedule,
  onToggleCustomSchedule,
  onFetchSchedules,
  dragActive,
  uploading,
  uploadProgress
}) => {

  const handleScheduleSelect = (scheduleId) => {
    const selectedSchedule = schedules.find(s => s.id === scheduleId);
    if (selectedSchedule) {
      // Set the schedule ID and also populate the date and time for the medical record
      onInputChange({ target: { name: 'scheduleId', value: scheduleId } });
      onInputChange({ target: { name: 'followUpDate', value: selectedSchedule.date } });
      // For existing schedules, we set both start and end time for the medical record
      onInputChange({ target: { name: 'followUpStartTime', value: selectedSchedule.startTime } });
      onInputChange({ target: { name: 'followUpEndTime', value: selectedSchedule.endTime } });
    }
  };

  const handleCancelSchedule = () => {
    onInputChange({ target: { name: 'scheduleId', value: '' } });
    onInputChange({ target: { name: 'followUpDate', value: '' } });
    onInputChange({ target: { name: 'followUpStartTime', value: '' } });
    onInputChange({ target: { name: 'followUpEndTime', value: '' } });
  };

  // Only show available schedules (filter out unavailable ones)
  const availableSchedules = schedules.filter(s => s.available && !s.pending);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Add Medical Record</h2>
            <button
              onClick={onCancel}
              className="p-2 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-100 transition duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-600 mt-1">
            For {horseInfo?.name || "Patient"} • Date: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Vital Signs */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Vital Signs</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Heart Rate (BPM)</label>
                  <input
                    type="number"
                    name="heartRate"
                    value={formData.heartRate}
                    onChange={onInputChange}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                    placeholder="Enter heart rate"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Respiration Rate (Breaths/min)</label>
                  <input
                    type="number"
                    name="respRate"
                    value={formData.respRate}
                    onChange={onInputChange}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                    placeholder="Enter respiration rate"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Temperature (°C)</label>
                  <input
                    type="number"
                    name="temperature"
                    value={formData.temperature}
                    onChange={onInputChange}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                    placeholder="Enter temperature"
                  />
                </div>
              </div>
            </div>

            {/* Clinical Signs */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-gray-900">Clinical Signs</h3>
              </div>
              <textarea
                name="clinicalSigns"
                value={formData.clinicalSigns}
                onChange={onInputChange}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                rows="3"
                placeholder="Describe clinical signs observed..."
              />
            </div>

            {/* Diagnostic Protocol */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Diagnostic Procedures</h3>
              </div>
              <textarea
                name="diagnosticProtocol"
                value={formData.diagnosticProtocol}
                onChange={onInputChange}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                rows="2"
                placeholder="Describe diagnostic procedures performed..."
              />
            </div>

            {/* Diagnosis */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-gray-900">Diagnosis</h3>
              </div>
              <textarea
                name="diagnosis"
                value={formData.diagnosis}
                onChange={onInputChange}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                rows="3"
                placeholder="Enter diagnosis..."
              />
            </div>

            {/* Lab Results */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Lab Results</h3>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Optional</span>
              <textarea
                name="labResult"
                value={formData.labResult}
                onChange={onInputChange}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                rows="3"
                placeholder="Enter lab results from tests..."
              />
            </div>

            {/* Lab File Upload Section */}
            <FileUploadSection
              labFiles={formData.labFiles}
              onFilesAdd={onFilesAdd}
              onFileRemove={onFileRemove}
              onFilePreview={onFilePreview}
              dragActive={dragActive}
              onDragStateChange={onDragStateChange}
              uploading={uploading}
              uploadProgress={uploadProgress}
            />

            {/* Treatment Plan */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Pill className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">Treatment Plan</h3>
                </div>
                <Button 
                  onClick={onAddTreatment}
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Treatment
                </Button>
              </div>

              {formData.treatments.map((treatment, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-blue-50 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="font-medium text-gray-900">Treatment #{index + 1}</h5>
                    {formData.treatments.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveTreatment(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Medication</label>
                      <input
                        type="text"
                        value={treatment.medication}
                        onChange={(e) => onTreatmentChange(index, 'medication', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                        placeholder="Medication name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Dosage</label>
                      <input
                        type="text"
                        value={treatment.dosage}
                        onChange={(e) => onTreatmentChange(index, 'dosage', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                        placeholder="Dosage amount"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Duration</label>
                      <input
                        type="text"
                        value={treatment.duration}
                        onChange={(e) => onTreatmentChange(index, 'duration', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                        placeholder="Treatment duration"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Prognosis and Current Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Prognosis */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-semibold text-gray-900">Prognosis</h3>
                </div>
                <textarea
                  name="prognosis"
                  value={formData.prognosis}
                  onChange={onInputChange}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                  rows="3"
                  placeholder="Enter prognosis..."
                />
              </div>

              {/* Current Status */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Current Status</h3>
                </div>
                <select
                  name="healthStatus"
                  value={formData.healthStatus}
                  onChange={onInputChange}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                >
                  <option value="Healthy">Healthy</option>
                  <option value="Unhealthy">Unhealthy</option>
                  <option value="Sick">Sick</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Select the current health status
                </p>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <StickyNote className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Recommendations</h3>
              </div>
              <textarea
                name="recommendation"
                value={formData.recommendation}
                onChange={onInputChange}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                rows="2"
                placeholder="Enter recommendations for ongoing care..."
              />
            </div>

            {/* Follow-up Schedule - OPTIONAL */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Clock3 className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Next Follow-up</h3>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Optional</span>
              </div>

              {/* Schedule Selection Toggle */}
              <div className="flex gap-4 mb-4">
                <Button
                  type="button"
                  onClick={() => onToggleCustomSchedule(false)}
                  className={`
                    flex-1 py-2 font-semibold rounded-lg backdrop-blur-sm transition-all duration-300
                    ${!showCustomSchedule
                      ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg scale-105"
                      : "bg-white/50 text-gray-600 border border-gray-200 hover:bg-blue-50"}
                  `}
                >
                  Choose Existing Schedule
                </Button>

                <Button
                  type="button"
                  onClick={() => onToggleCustomSchedule(true)}
                  className={`
                    flex-1 py-2 font-semibold rounded-lg backdrop-blur-sm transition-all duration-300
                    ${showCustomSchedule
                      ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg scale-105"
                      : "bg-white/50 text-gray-600 border border-gray-200 hover:bg-blue-50"}
                  `}
                >
                  Create New Schedule
                </Button>
              </div>

              {!showCustomSchedule ? (
                /* ENHANCED: Existing Schedules with Card Design and Cancel Option */
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={onFetchSchedules}
                        variant="outline"
                        size="sm"
                        disabled={loadingSchedules}
                        className={`
                          flex items-center justify-center gap-2
                          border border-gray-300 text-gray-700
                          hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600
                          disabled:opacity-60 disabled:cursor-not-allowed
                          transition-all duration-200 ease-in-out
                          rounded-md shadow-sm
                        `}
                      >
                        {loadingSchedules ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <Calendar className="w-4 h-4" />
                        )}
                        <span className="font-medium">Refresh Schedules</span>
                      </Button>

                      <span className="text-sm text-gray-600">
                        {availableSchedules.length} available schedule(s)
                      </span>
                    </div>
                    {formData.scheduleId && (
                      <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Schedule selected
                      </span>
                    )}
                  </div>

                  {availableSchedules.length > 0 ? (
                    <div className="space-y-3 max-h-60 overflow-y-auto p-1">
                      {availableSchedules.map((schedule) => (
                        <ScheduleCard
                          key={schedule.id}
                          schedule={schedule}
                          isSelected={formData.scheduleId === schedule.id}
                          onSelect={handleScheduleSelect}
                          onCancelSelect={handleCancelSchedule}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                      <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-sm font-medium">No available schedules</p>
                      <p className="text-xs mt-1">Create a new schedule or refresh to check again</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Custom Schedule Creation with Enhanced Time Selectors */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Date Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Follow-up Date (Optional)
                      </label>
                      <input
                        type="date"
                        name="followUpDate"
                        value={formData.followUpDate}
                        onChange={onInputChange}
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    
                    {/* Time Range Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Time Range (Optional)
                      </label>
                      <div className="flex gap-2">
                        {/* Start Time */}
                        <div className="flex-1">
                          <TimeSelector
                            value={formData.followUpStartTime}
                            onChange={(value) => onInputChange({ target: { name: 'followUpStartTime', value } })}
                            placeholder="Start time"
                          />
                        </div>
                        
                        {/* Separator */}
                        <div className="flex items-center justify-center text-gray-500 font-medium">
                          to
                        </div>
                        
                        {/* End Time */}
                        <div className="flex-1">
                          <TimeSelector
                            value={formData.followUpEndTime}
                            onChange={(value) => onInputChange({ target: { name: 'followUpEndTime', value } })}
                            placeholder="End time"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Duration Display */}
                  {formData.followUpStartTime && formData.followUpEndTime && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700 font-medium">
                        Duration: {calculateDuration(formData.followUpStartTime, formData.followUpEndTime)}
                      </p>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500">
                    A new schedule will be created for this follow-up appointment and automatically marked as unavailable
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="text-red-500 text-sm p-3 bg-red-100 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button
                onClick={onCancel}
                variant="outline"
                className="flex-1 border border-gray-300 text-gray-600 hover:bg-red-50 hover:border-red-400 hover:text-red-600"
              >
                Cancel
              </Button>
              <Button 
                onClick={onSubmit}
                className="flex-1 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin text-white" />
                    <span className="text-white">Saving...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 text-white" />
                    <span className="text-white">Save Medical Record</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
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
    isLoading,
    error,
    showConfirmation,
    showSuccessAlert,
    schedules,
    loadingSchedules,
    showCustomSchedule,
    dragActive,
    uploadProgress,
    // FILE VIEWER STATES
    fileViewerOpen,
    currentFileIndex,
    zoomLevel,
    rotation
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

  // Fetch schedules on component mount
  useEffect(() => {
    fetchSchedules();
  }, []);

  // Reset form when component mounts to ensure clean state
  useEffect(() => {
    dispatch({ type: 'RESET_STATE' });
  }, []);

  // FILE VIEWER FUNCTIONS
  const getAllViewableFiles = useCallback(() => {
    return formData.labFiles.map((file, index) => ({
      url: URL.createObjectURL(file),
      name: file.name,
      type: file.type,
      fileObject: file,
      index: index
    }));
  }, [formData.labFiles]);

  const openFileViewer = useCallback((index = 0) => {
    dispatch({ type: 'OPEN_FILE_VIEWER', payload: index });
  }, []);

  const closeFileViewer = useCallback(() => {
    dispatch({ type: 'CLOSE_FILE_VIEWER' });
  }, []);

  const nextFile = useCallback(() => {
    const files = getAllViewableFiles();
    dispatch({ type: 'SET_CURRENT_FILE_INDEX', payload: (currentFileIndex + 1) % files.length });
    dispatch({ type: 'SET_ZOOM_LEVEL', payload: 1 });
    dispatch({ type: 'SET_ROTATION', payload: 0 });
  }, [currentFileIndex, getAllViewableFiles]);

  const prevFile = useCallback(() => {
    const files = getAllViewableFiles();
    dispatch({ type: 'SET_CURRENT_FILE_INDEX', payload: (currentFileIndex - 1 + files.length) % files.length });
    dispatch({ type: 'SET_ZOOM_LEVEL', payload: 1 });
    dispatch({ type: 'SET_ROTATION', payload: 0 });
  }, [currentFileIndex, getAllViewableFiles]);

  const handleZoomIn = useCallback(() => {
    dispatch({ type: 'SET_ZOOM_LEVEL', payload: Math.min(zoomLevel + 0.25, 3) });
  }, [zoomLevel]);

  const handleZoomOut = useCallback(() => {
    dispatch({ type: 'SET_ZOOM_LEVEL', payload: Math.max(zoomLevel - 0.25, 0.5) });
  }, [zoomLevel]);

  const handleRotate = useCallback(() => {
    dispatch({ type: 'SET_ROTATION', payload: (rotation + 90) % 360 });
  }, [rotation]);

  const resetTransform = useCallback(() => {
    dispatch({ type: 'SET_ZOOM_LEVEL', payload: 1 });
    dispatch({ type: 'SET_ROTATION', payload: 0 });
  }, []);

  const handleFilePreview = useCallback((index) => {
    openFileViewer(index);
  }, [openFileViewer]);

  // Fetch schedules function - ONLY fetches available schedules
  const fetchSchedules = useCallback(async () => {
    dispatch({ type: 'SET_UI_STATE', payload: { loadingSchedules: true } });
    
    try {
      const response = await fetch("http://localhost:8000/api/veterinarian/get_all_schedules/", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch schedules");
      }

      const data = await response.json();
      // Only show available schedules (filter out unavailable ones)
      const availableSchedules = data.schedule_slots?.filter(schedule => schedule.available && !schedule.pending) || [];
      
      dispatch({ type: 'SET_UI_STATE', payload: { 
        schedules: availableSchedules,
        loadingSchedules: false 
      } });
    } catch (err) {
      console.error("Error fetching schedules:", err);
      dispatch({ type: 'SET_UI_STATE', payload: { 
        loadingSchedules: false,
        error: "Failed to load schedules" 
      } });
    }
  }, []);

  // NEW FUNCTION: Update schedule availability to false
  const updateScheduleAvailability = useCallback(async (scheduleId) => {
    try {
      const response = await fetch("http://localhost:8000/api/veterinarian/update_schedule_availability/", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          schedule_id: scheduleId,
          is_available: false
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update schedule availability");
      }

      return await response.json();
    } catch (err) {
      console.error("Error updating schedule availability:", err);
      throw err;
    }
  }, []);

  // UPDATED Create new schedule function - creates schedule with is_available: false
  const createSchedule = useCallback(async (date, startTime, endTime) => {
    try {
      // First create the schedule
      const scheduleData = {
        schedules: [{
          date: date,
          startTime: startTime,
          endTime: endTime
        }]
      };

      const response = await fetch("http://localhost:8000/api/veterinarian/add_schedule/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(scheduleData),
      });

      if (!response.ok) {
        throw new Error("Failed to create schedule");
      }

      const data = await response.json();
      const scheduleId = data.schedules?.[0]?.sched_id;
      
      if (!scheduleId) {
        throw new Error("No schedule ID returned from creation");
      }

      // NEW: Immediately set the new schedule as unavailable
      try {
        await updateScheduleAvailability(scheduleId);
      } catch (err) {
        console.error("Failed to set new schedule as unavailable, but continuing:", err);
        // Continue even if setting availability fails
      }

      return scheduleId;
    } catch (err) {
      console.error("Error creating schedule:", err);
      throw err;
    }
  }, [updateScheduleAvailability]);

  // Memoized handlers
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    dispatch({ type: 'SET_FIELD', field: name, value });
  }, []);

  const handleTreatmentChange = useCallback((index, field, value) => {
    dispatch({ type: 'SET_TREATMENT_FIELD', index, field, value });
  }, []);

  const handleFilesAdd = useCallback((files) => {
    dispatch({ type: 'ADD_LAB_FILES', payload: files });
  }, []);

  const handleFileRemove = useCallback((index) => {
    dispatch({ type: 'REMOVE_LAB_FILE', index });
  }, []);

  const handleDragStateChange = useCallback((isActive) => {
    dispatch({ type: 'SET_UI_STATE', payload: { dragActive: isActive } });
  }, []);

  const handleCancelForm = useCallback(() => {
    if (isModal && onCloseModal) {
      onCloseModal();
    } else {
      dispatch({ type: 'RESET_STATE' });
    }
  }, [isModal, onCloseModal]);

  // UPDATED validation - dosage and duration are now REQUIRED for treatments
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

    // Validate that all treatments have medication, dosage, and duration
    const hasIncompleteTreatments = formData.treatments.some(treatment => 
      !treatment.medication || !treatment.dosage || !treatment.duration
    );
    
    if (hasIncompleteTreatments) {
      dispatch({ type: 'SET_UI_STATE', payload: { error: "Please complete all treatment fields (medication, dosage, and duration) for each treatment." } });
      return;
    }

    // FOLLOW-UP IS OPTIONAL - only validate if they started creating one
    if (showCustomSchedule) {
      // If they started creating a custom schedule, validate it's complete
      const hasPartialSchedule = formData.followUpDate || formData.followUpStartTime || formData.followUpEndTime;
      const hasCompleteSchedule = formData.followUpDate && formData.followUpStartTime && formData.followUpEndTime;
      
      if (hasPartialSchedule && !hasCompleteSchedule) {
        dispatch({ type: 'SET_UI_STATE', payload: { error: "Please complete all schedule fields or remove the partial entries." } });
        return;
      }
      
      if (hasCompleteSchedule) {
        // Validate that end time is after start time
        const startMinutes = convertTimeToMinutes(formData.followUpStartTime);
        const endMinutes = convertTimeToMinutes(formData.followUpEndTime);
        
        if (endMinutes <= startMinutes) {
          dispatch({ type: 'SET_UI_STATE', payload: { error: "End time must be after start time." } });
          return;
        }
      }
    }
    
    dispatch({ type: 'SET_UI_STATE', payload: { error: null, showConfirmation: true } });
  }, [formData, horseInfo, appointmentId, showCustomSchedule]);

const handleAddMedicalRecord = useCallback(async () => {
  if (!horseInfo?.id || !appointmentId) {
    dispatch({ type: 'SET_UI_STATE', payload: { error: "Cannot save medical record: missing information." } });
    return;
  }

  // 🚨 PREVENT DOUBLE SUBMISSION
  if (isLoading) {
    console.log("⚠️ Submission already in progress, skipping...");
    return;
  }

  dispatch({ type: 'SET_UI_STATE', payload: { isLoading: true, error: null, showConfirmation: false } });

  try {
    let scheduleId = formData.scheduleId;
    let followUpDate = formData.followUpDate;
    let followUpTime = "";
    
    // If using existing schedule, get the date and time from the selected schedule
    if (!showCustomSchedule && scheduleId) {
      const selectedSchedule = schedules.find(s => s.id === scheduleId);
      if (selectedSchedule) {
        followUpDate = selectedSchedule.date;
        followUpTime = `${selectedSchedule.startTime}-${selectedSchedule.endTime}`;
      }
    }
    
    // If creating custom schedule, create it first and set the time
    if (showCustomSchedule && formData.followUpDate && formData.followUpStartTime && formData.followUpEndTime) {
      try {
        scheduleId = await createSchedule(formData.followUpDate, formData.followUpStartTime, formData.followUpEndTime);
        followUpDate = formData.followUpDate;
        followUpTime = `${formData.followUpStartTime}-${formData.followUpEndTime}`;
      } catch (err) {
        throw new Error("Failed to create schedule: " + err.message);
      }
    }

    // NEW: Update schedule availability to false when using existing schedule
    if (!showCustomSchedule && scheduleId) {
      try {
        await updateScheduleAvailability(scheduleId);
      } catch (err) {
        console.error("Failed to update schedule availability, but continuing with record creation:", err);
      }
    }

    // 🚨 FIXED: Create FormData in a CONTROLLED way - NO LOOPS
    const form = new FormData();
    
    // REQUIRED fields
    form.append("horse_id", horseInfo.id);
    form.append("app_id", appointmentId);

    // Medical record fields - APPEND EACH FIELD EXPLICITLY
    form.append("heartRate", formData.heartRate || "");
    form.append("respRate", formData.respRate || "");
    form.append("temperature", formData.temperature || "");
    form.append("clinicalSigns", formData.clinicalSigns || "");
    form.append("diagnosticProtocol", formData.diagnosticProtocol || "");
    form.append("diagnosis", formData.diagnosis || "");
    form.append("labResult", formData.labResult || "");
    form.append("prognosis", formData.prognosis || "");
    form.append("healthStatus", formData.healthStatus || "");
    form.append("recommendation", formData.recommendation || "");

    // OPTIONAL schedule fields
    if (scheduleId) form.append("scheduleId", scheduleId);
    if (followUpDate) form.append("followUpDate", followUpDate);
    if (followUpTime) form.append("followUpTime", followUpTime);

    // Lab files - ONLY ONCE
    formData.labFiles.forEach((file) => {
      form.append('lab_files', file);
    });

    // Treatments - ONLY ONCE
    form.append("treatments", JSON.stringify(formData.treatments));

    console.log("📤 Sending medical record with:", {
      horse_id: horseInfo.id,
      app_id: appointmentId,
      files: formData.labFiles.length,
      treatments: formData.treatments.length
    });

    const response = await fetch("http://localhost:8000/api/veterinarian/add_medical_record/", {
      method: "POST",
      credentials: "include",
      body: form,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to add medical record");

    console.log("✅ Medical record saved successfully:", data);

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
    console.error("❌ Error saving medical record:", err);
    dispatch({ type: 'SET_UI_STATE', payload: { error: err.message } });
  } finally {
    dispatch({ type: 'SET_UI_STATE', payload: { isLoading: false } });
  }
}, [formData, horseInfo, appointmentId, onRefresh, isModal, onCloseModal, showCustomSchedule, createSchedule, updateScheduleAvailability, schedules, isLoading]);

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

  const handleToggleCustomSchedule = useCallback((showCustom) => {
    dispatch({ type: 'SET_UI_STATE', payload: { showCustomSchedule: showCustom } });
  }, []);

  const viewableFiles = getAllViewableFiles();

  return (
    <>
      <RecordForm
        formData={formData}
        isLoading={isLoading}
        error={error}
        onInputChange={handleInputChange}
        onTreatmentChange={handleTreatmentChange}
        onCancel={handleCancelForm}
        onSubmit={handleSaveConfirm}
        onAddTreatment={handleAddTreatment}
        onRemoveTreatment={handleRemoveTreatment}
        onFilesAdd={handleFilesAdd}
        onFileRemove={handleFileRemove}
        onFilePreview={handleFilePreview}
        onDragStateChange={handleDragStateChange}
        horseInfo={horseInfo}
        schedules={schedules}
        loadingSchedules={loadingSchedules}
        showCustomSchedule={showCustomSchedule}
        onToggleCustomSchedule={handleToggleCustomSchedule}
        onFetchSchedules={fetchSchedules}
        dragActive={dragActive}
        uploading={isLoading}
        uploadProgress={uploadProgress}
      />
      
      {/* SEPARATED CONFIRMATION MODAL - SAME AS ORIGINAL */}
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

      {/* FULL-SCREEN FILE VIEWER */}
      {fileViewerOpen && (
        <FileViewer
          files={viewableFiles}
          currentFileIndex={currentFileIndex}
          zoomLevel={zoomLevel}
          rotation={rotation}
          onClose={closeFileViewer}
          onNext={nextFile}
          onPrev={prevFile}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onRotate={handleRotate}
          onReset={resetTransform}
        />
      )}
    </>
  );
};

export default React.memo(MedicalRecords);