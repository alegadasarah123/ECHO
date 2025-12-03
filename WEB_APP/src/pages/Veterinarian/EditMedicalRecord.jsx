import React, { useEffect, useCallback, useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X, Upload, Loader, Heart, Thermometer, Stethoscope, Calendar, Pill, FileText, Activity, ClipboardList, TrendingUp, StickyNote, Clock3, CheckCircle, AlertCircle, User, Image, File, Trash2, Eye, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight, Edit, Save } from "lucide-react";
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
  labFiles: [],
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
  isLoadingRecord: true,
  error: null,
  showConfirmation: false,
  showSuccessAlert: false,
  medrecId: null,
  schedules: [],
  loadingSchedules: false,
  dragActive: false,
  uploading: false,
  uploadProgress: 0,
  fileViewerOpen: false,
  currentFileIndex: 0,
  zoomLevel: 1,
  rotation: 0,
  // Calendar state
  currentMonth: new Date(),
  selectedDate: null,
  availableDates: [],
  // Existing lab files from server
  existingLabFiles: []
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
    case 'SET_TREATMENTS':
      return {
        ...state,
        formData: { ...state.formData, treatments: action.payload }
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
    case 'SET_EXISTING_LAB_FILES':
      return {
        ...state,
        existingLabFiles: action.payload
      };
    case 'REMOVE_EXISTING_LAB_FILE':
      const updatedExistingFiles = state.existingLabFiles.filter((_, i) => i !== action.index);
      return {
        ...state,
        existingLabFiles: updatedExistingFiles
      };
    case 'CLEAR_LAB_FILES':
      return {
        ...state,
        formData: {
          ...state.formData,
          labFiles: []
        }
      };
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
    case 'SET_CURRENT_MONTH':
      return {
        ...state,
        currentMonth: action.payload
      };
    case 'SET_SELECTED_DATE':
      return {
        ...state,
        selectedDate: action.payload
      };
    case 'SET_AVAILABLE_DATES':
      return {
        ...state,
        availableDates: action.payload
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
      Medical record updated successfully!
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
  
  if (file.size > 10 * 1024 * 1024) {
    alert(`📁 File too large: ${file.name}\nMaximum size is 10MB.`);
    return false;
  }
  
  return true;
};

// ========== CALENDAR COMPONENT ==========
const CalendarComponent = ({ 
  schedules, 
  selectedScheduleId, 
  onSelectSchedule, 
  onCancelSelect,
  selectedDate,
  onSelectDate,
  currentMonth,
  onMonthChange,
  availableDates
}) => {
  // Get days in month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month
  const getFirstDayOfMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  // Format date to YYYY-MM-DD
  const formatDate = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Check if date has available slots
  const hasAvailableSlots = (date) => {
    const dateStr = formatDate(date);
    return availableDates.includes(dateStr);
  };

  // Check if date is today
  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Check if date is in current month
  const isCurrentMonth = (date) => {
    return date.getMonth() === currentMonth.getMonth() &&
           date.getFullYear() === currentMonth.getFullYear();
  };

  // Get schedules for selected date and group by morning/afternoon
  const getSchedulesForDate = () => {
    if (!selectedDate) return { morning: [], afternoon: [] };
    const dateStr = formatDate(selectedDate);
    const allSchedules = schedules.filter(schedule => schedule.date === dateStr);
    
    // Sort schedules by start time
    const sortedSchedules = [...allSchedules].sort((a, b) => {
      const timeToMinutes = (timeStr) => {
        const [time, period] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
      };
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });
    
    // Separate into morning (AM) and afternoon (PM)
    const morningSlots = sortedSchedules.filter(schedule => 
      schedule.startTime.includes('AM') || 
      (parseInt(schedule.startTime.split(':')[0]) < 12 && !schedule.startTime.includes('PM'))
    );
    
    const afternoonSlots = sortedSchedules.filter(schedule => 
      schedule.startTime.includes('PM') || 
      (parseInt(schedule.startTime.split(':')[0]) >= 12 && !schedule.startTime.includes('AM'))
    );
    
    return { morning: morningSlots, afternoon: afternoonSlots };
  };

  // Navigate months
  const goToPreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    onMonthChange(newMonth);
  };

  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    onMonthChange(newMonth);
  };

  const goToToday = () => {
    const today = new Date();
    onMonthChange(today);
    onSelectDate(today);
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    
    const days = [];
    
    // Add empty cells for days before first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push(date);
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const { morning, afternoon } = getSchedulesForDate();
  const totalSlots = morning.length + afternoon.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h4 className="font-medium text-gray-900">Select Follow-up Date & Time</h4>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={goToToday}
          className="h-8 text-xs"
        >
          Today
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar Grid */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <h3 className="font-semibold text-gray-900">{monthName}</h3>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="h-10"></div>;
              }
              
              const dateStr = formatDate(date);
              const hasSlots = hasAvailableSlots(date);
              const isSelected = selectedDate && formatDate(selectedDate) === dateStr;
              const isTodayDate = isToday(date);
              const isCurrentMonthDate = isCurrentMonth(date);
              
              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => hasSlots && onSelectDate(date)}
                  disabled={!hasSlots}
                  className={`
                    h-10 rounded-lg text-sm font-medium transition-all duration-200
                    flex flex-col items-center justify-center relative
                    ${!hasSlots 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : isSelected
                        ? 'bg-blue-600 text-white'
                        : isTodayDate
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                    }
                    ${!isCurrentMonthDate ? 'text-gray-400' : ''}
                  `}
                >
                  <span>{date.getDate()}</span>
                  {hasSlots && !isSelected && isCurrentMonthDate && (
                    <div className="absolute bottom-1 w-1 h-1 rounded-full bg-green-500"></div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-gray-600">Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                <span className="text-gray-600">Selected</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-100"></div>
                <span className="text-gray-600">Today</span>
              </div>
            </div>
          </div>
        </div>

        {/* Time Slots Panel */}
        <div>
          {!selectedDate ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <Calendar className="w-12 h-12 text-gray-400 mb-3" />
              <p className="font-medium text-gray-700">Select a date from the calendar</p>
              <p className="text-sm text-gray-500 mt-1">Available dates are marked with a green dot</p>
            </div>
          ) : totalSlots === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <Clock3 className="w-12 h-12 text-gray-400 mb-3" />
              <p className="font-medium text-gray-700">No available time slots</p>
              <p className="text-sm text-gray-500 mt-1">
                {selectedDate.toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric',
                  year: 'numeric'
                })} has no available slots
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {totalSlots} available slot{totalSlots > 1 ? 's' : ''}
                  </p>
                </div>
                {selectedDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToToday}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Change date
                  </Button>
                )}
              </div>

              <div className="space-y-6 max-h-80 overflow-y-auto p-1">
                {/* Morning Slots */}
                {morning.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <h5 className="font-medium text-gray-900">Morning</h5>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {morning.length} slot{morning.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {morning.map((schedule) => {
                        const isSelected = schedule.id === selectedScheduleId;
                        
                        return (
                          <div
                            key={schedule.id}
                            onClick={() => !isSelected && onSelectSchedule(schedule.id)}
                            className={`
                              p-3 border rounded-lg transition-all duration-200 cursor-pointer
                              ${isSelected
                                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                              }
                            `}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <Clock3 className="w-4 h-4 text-gray-600" />
                                <span className="font-medium text-gray-900">
                                  {schedule.startTime} - {schedule.endTime}
                                </span>
                              </div>
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
                      })}
                    </div>
                  </div>
                )}

                {/* Afternoon Slots */}
                {afternoon.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <h5 className="font-medium text-gray-900">Afternoon</h5>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {afternoon.length} slot{afternoon.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {afternoon.map((schedule) => {
                        const isSelected = schedule.id === selectedScheduleId;
                        
                        return (
                          <div
                            key={schedule.id}
                            onClick={() => !isSelected && onSelectSchedule(schedule.id)}
                            className={`
                              p-3 border rounded-lg transition-all duration-200 cursor-pointer
                              ${isSelected
                                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                              }
                            `}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <Clock3 className="w-4 h-4 text-gray-600" />
                                <span className="font-medium text-gray-900">
                                  {schedule.startTime} - {schedule.endTime}
                                </span>
                              </div>
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
                      })}
                    </div>
                  </div>
                )}
              </div>

              {selectedScheduleId && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-700">Follow-up Scheduled</span>
                  </div>
                  <p className="text-sm text-blue-600">
                    Your follow-up is scheduled for {selectedDate.toLocaleDateString()} at{' '}
                    {[...morning, ...afternoon].find(s => s.id === selectedScheduleId)?.startTime}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// File Upload Section Component - UPDATED FOR EDITING
const FileUploadSection = ({ 
  labFiles, 
  existingLabFiles,
  onFilesAdd, 
  onFileRemove, 
  onExistingFileRemove,
  onFilePreview,
  dragActive, 
  onDragStateChange,
  uploading,
  uploadProgress 
}) => {
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      onDragStateChange(true);
    } else if (e.type === "dragleave") {
      onDragStateChange(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDragStateChange(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

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

  const handleFileUpload = (event) => {
    if (event.target.files && event.target.files[0]) {
      handleFiles(event.target.files);
    }
    event.target.value = '';
  };

  const totalFilesCount = labFiles.length + existingLabFiles.length;

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">Lab Files</h3>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Optional</span>
        </div>
        {totalFilesCount > 0 && (
          <span className="text-sm text-gray-500">
            {totalFilesCount}/10 files
          </span>
        )}
      </div>

      <div
        className={`relative border-2 border-dashed rounded-xl min-h-[200px] flex flex-col items-center justify-center p-6 transition-all duration-200 ${
          dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : totalFilesCount > 0 
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
        
        {totalFilesCount === 0 ? (
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
                {totalFilesCount} file{totalFilesCount > 1 ? 's' : ''} selected
              </p>
              <p className="text-xs text-gray-500">
                Drag & drop to add more files, or click to browse
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {existingLabFiles.length} existing file(s) from server
              </p>
            </div>
          </div>
        )}
      </div>

      {totalFilesCount > 0 && (
        <div className="mt-4 space-y-3">
          <h4 className="font-medium text-gray-700 text-sm">Selected Files:</h4>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {/* Show existing files first */}
            {existingLabFiles.map((file, index) => (
              <div 
                key={`existing-${index}`} 
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    {file.file_path && (
                      file.file_path.toLowerCase().endsWith('.pdf') ? 
                        <FileText className="w-5 h-5 text-red-500" /> :
                        <Image className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate text-gray-900">
                      {file.file_name || 'Unknown file'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {file.file_path && (
                    <a
                        href={file.file_path} // Use the full URL directly
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 w-8 flex items-center justify-center text-blue-500 hover:text-blue-700"
                        title="View File"
                        onClick={(e) => {
                        e.stopPropagation(); // Prevent any parent click events
                        // Optionally open in file viewer instead of new tab
                        // onFilePreview(index); 
                        }}
                    >
                        <Eye className="w-4 h-4" />
                    </a>
                    )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onExistingFileRemove(index)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    title="Remove File"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {/* Show new files */}
            {labFiles.map((file, index) => (
              <div 
                key={`new-${index}`} 
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
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                        New
                      </span>
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
          
          {totalFilesCount >= 10 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
              <div className="flex items-center gap-2 text-amber-800 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Maximum of 10 files reached</span>
              </div>
            </div>
          )}
        </div>
      )}

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

// File Viewer Component - FIXED VERSION
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
  const isImage = currentFile?.type?.startsWith('image/') || 
                  currentFile?.url?.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i);
  const isPDF = currentFile?.type === 'application/pdf' || 
                currentFile?.url?.toLowerCase().endsWith('.pdf');

  if (!files || files.length === 0) return null;

  // Handle PDF viewing - use object tag instead of iframe for better compatibility
  const renderPDF = () => {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <object
          data={currentFile?.url}
          type="application/pdf"
          className="w-full h-full border-0"
          title={currentFile?.name}
          style={{ 
            minHeight: '100vh',
            backgroundColor: 'white'
          }}
        >
          <div className="text-center p-8">
            <FileText className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Unable to display PDF
            </p>
            <p className="text-gray-600 mb-4">
              This PDF cannot be displayed inline due to browser restrictions.
            </p>
            <a
              href={currentFile?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <FileText className="w-4 h-4" />
              Open PDF in new tab
            </a>
          </div>
        </object>
      </div>
    );
  };

  // Handle image viewing
  const renderImage = () => {
    return (
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
            onError={(e) => {
              console.error("Failed to load image:", currentFile?.url);
              e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-family='Arial, sans-serif' font-size='16' fill='%239ca3af'%3EFailed to load image%3C/text%3E%3C/svg%3E";
            }}
          />
        </div>
      </div>
    );
  };

  // Handle unknown file types
  const renderUnsupported = () => {
    return (
      <div className="text-center text-white p-8">
        <File className="w-16 h-16 mx-auto mb-4" />
        <p className="text-lg font-medium mb-2">Unsupported file type</p>
        <p className="text-gray-300 mb-4">
          This file type cannot be displayed in the viewer.
        </p>
        <a
          href={currentFile?.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Eye className="w-4 h-4" />
          Open file in new tab
        </a>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black z-[70] flex flex-col">
      {/* Header */}
      <div className="bg-black border-b border-gray-800 p-4 flex-shrink-0 flex justify-between items-center">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isPDF ? (
            <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
          ) : isImage ? (
            <Image className="w-5 h-5 text-blue-500 flex-shrink-0" />
          ) : (
            <File className="w-5 h-5 text-gray-500 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-white truncate">
              {currentFile?.name || "File"}
            </h3>
            <p className="text-sm text-gray-400">
              {isPDF ? "PDF Document" : isImage ? "Image" : "File"} • 
              {files.length > 1 && ` ${currentFileIndex + 1} of ${files.length}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
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

          {isImage && (
            <>
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
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onRotate}
                className="h-8 w-8 p-0 text-white hover:bg-gray-700"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="h-8 w-8 p-0 text-white hover:bg-gray-700"
              >
                Reset
              </Button>
            </>
          )}

          {/* Download/Open button */}
          <a
            href={currentFile?.url}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 w-8 flex items-center justify-center text-green-500 hover:text-green-400 hover:bg-gray-700 rounded"
            title="Open in new tab"
          >
            <Eye className="w-4 h-4" />
          </a>

          <Button
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 p-0 text-white hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-black flex items-center justify-center overflow-hidden">
        {isImage ? renderImage() : isPDF ? renderPDF() : renderUnsupported()}
      </div>

      {/* Footer with download option */}
      <div className="bg-black border-t border-gray-800 p-3 flex-shrink-0">
        <div className="flex justify-center">
          <a
            href={currentFile?.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <File className="w-4 h-4" />
            <span>Open in new tab</span>
          </a>
        </div>
      </div>
    </div>
  );
};

// --- 4. THE MAIN FORM COMPONENT ---
const EditRecordForm = ({ 
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
  onExistingFileRemove,
  onFilePreview,
  onDragStateChange,
  horseInfo,
  schedules,
  loadingSchedules,
  onFetchSchedules,
  dragActive,
  uploading,
  uploadProgress,
  // Calendar props
  selectedDate,
  onSelectDate,
  currentMonth,
  onMonthChange,
  availableDates,
  onScheduleSelect,
  onCancelSchedule,
  selectedScheduleId,
  // Edit props
  existingLabFiles = []
}) => {

  const handleScheduleSelect = (scheduleId) => {
    const selectedSchedule = schedules.find(s => s.id === scheduleId);
    if (selectedSchedule) {
      onScheduleSelect(scheduleId, selectedSchedule.date, selectedSchedule.startTime, selectedSchedule.endTime);
    }
  };

  const handleCancelSchedule = () => {
    onCancelSchedule();
  };

  const clinicalSignsRef = useRef(null);
  const diagnosticProtocolRef = useRef(null);
  const diagnosisRef = useRef(null);
  const labResultRef = useRef(null);
  const prognosisRef = useRef(null);
  const recommendationRef = useRef(null);

  useAutoResizeTextarea(formData.clinicalSigns, clinicalSignsRef);
  useAutoResizeTextarea(formData.diagnosticProtocol, diagnosticProtocolRef);
  useAutoResizeTextarea(formData.diagnosis, diagnosisRef);
  useAutoResizeTextarea(formData.labResult, labResultRef);
  useAutoResizeTextarea(formData.prognosis, prognosisRef);
  useAutoResizeTextarea(formData.recommendation, recommendationRef);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Edit Medical Record</h2>
            <button
              onClick={onCancel}
              className="p-2 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-100 transition duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-600 mt-1">
            For {horseInfo?.name || "Patient"} • Editing existing record
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
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

            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-gray-900">Clinical Signs</h3>
              </div>
              <textarea
                ref={clinicalSignsRef}
                name="clinicalSigns"
                value={formData.clinicalSigns}
                onChange={onInputChange}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none"
                rows="3"
                placeholder="Describe clinical signs observed..."
              />
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Diagnostic Procedures</h3>
              </div>
              <textarea
                ref={diagnosticProtocolRef}
                name="diagnosticProtocol"
                value={formData.diagnosticProtocol}
                onChange={onInputChange}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none"
                rows="2"
                placeholder="Describe diagnostic procedures performed..."
              />
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-gray-900">Diagnosis</h3>
              </div>
              <textarea
                ref={diagnosisRef}
                name="diagnosis"
                value={formData.diagnosis}
                onChange={onInputChange}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none"
                rows="3"
                placeholder="Enter diagnosis..."
              />
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-semibold text-gray-900">Lab Results</h3>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Optional</span>
              </div>
              <textarea
                ref={labResultRef}
                name="labResult"
                value={formData.labResult}
                onChange={onInputChange}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none"
                rows="3"
                placeholder="Enter lab results from tests..."
              />
            </div>

            <FileUploadSection
              labFiles={formData.labFiles}
              existingLabFiles={existingLabFiles}
              onFilesAdd={onFilesAdd}
              onFileRemove={onFileRemove}
              onExistingFileRemove={onExistingFileRemove}
              onFilePreview={onFilePreview}
              dragActive={dragActive}
              onDragStateChange={onDragStateChange}
              uploading={uploading}
              uploadProgress={uploadProgress}
            />

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-semibold text-gray-900">Prognosis</h3>
                </div>
                <textarea
                  ref={prognosisRef}
                  name="prognosis"
                  value={formData.prognosis}
                  onChange={onInputChange}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none"
                  rows="3"
                  placeholder="Enter prognosis..."
                />
              </div>

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
                  <option value="Sick">Sick</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Select the current health status
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <StickyNote className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Recommendations</h3>
              </div>
              <textarea
                ref={recommendationRef}
                name="recommendation"
                value={formData.recommendation}
                onChange={onInputChange}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none"
                rows="2"
                placeholder="Enter recommendations for ongoing care..."
              />
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Clock3 className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Next Follow-up</h3>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Optional</span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={onFetchSchedules}
                      variant="outline"
                      size="sm"
                      disabled={loadingSchedules}
                      className="flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 rounded-md shadow-sm"
                    >
                      {loadingSchedules ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Calendar className="w-4 h-4" />
                      )}
                      <span className="font-medium">Refresh Schedules</span>
                    </Button>
                  </div>
                  
                  {formData.scheduleId && (
                    <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Schedule selected
                    </span>
                  )}
                </div>

                <CalendarComponent
                  schedules={schedules}
                  selectedScheduleId={selectedScheduleId}
                  onSelectSchedule={handleScheduleSelect}
                  onCancelSelect={handleCancelSchedule}
                  selectedDate={selectedDate}
                  onSelectDate={onSelectDate}
                  currentMonth={currentMonth}
                  onMonthChange={onMonthChange}
                  availableDates={availableDates}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm p-3 bg-red-100 rounded-lg border border-red-200">
                {error}
              </div>
            )}

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
                    <span className="text-white">Updating...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-white" />
                    <span className="text-white">Update Medical Record</span>
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
const EditMedicalRecord = ({
  vetProfile,
  horseInfo,
  appointmentId,
  onRefresh,
  isModal,
  onCloseModal,
  recordData,
  recordId
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    formData,
    isLoading,
    isLoadingRecord,
    error,
    showConfirmation,
    showSuccessAlert,
    schedules,
    loadingSchedules,
    dragActive,
    uploadProgress,
    fileViewerOpen,
    currentFileIndex,
    zoomLevel,
    rotation,
    currentMonth,
    selectedDate,
    availableDates,
    existingLabFiles
  } = state;

  useEffect(() => {
    console.log("✏️ EditMedicalRecord mounted with recordId:", recordId, "recordData:", recordData);
    
    // Load record data on mount
    if (recordId || recordData?.id) {
      loadRecordData();
    }
    
    // Fetch schedules
    fetchSchedules();
  }, [recordId, recordData]);

  // Extract available dates from schedules
  useEffect(() => {
    if (schedules.length > 0) {
      const dates = [...new Set(schedules.map(schedule => schedule.date))];
      dispatch({ type: 'SET_AVAILABLE_DATES', payload: dates });
      
      const today = new Date();
      const todayStr = formatDate(today);
      if (dates.includes(todayStr)) {
        dispatch({ type: 'SET_SELECTED_DATE', payload: today });
      }
    }
  }, [schedules]);

  const formatDate = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

const loadRecordData = async () => {
  try {
    const idToFetch = recordId || recordData?.id;
    if (!idToFetch) {
      console.error("❌ No record ID provided for editing");
      dispatch({ 
        type: 'SET_UI_STATE', 
        payload: { 
          error: "No record ID provided for editing",
          isLoadingRecord: false 
        } 
      });
      return;
    }

    console.log("📥 Fetching record data for ID:", idToFetch);
    dispatch({ type: 'SET_UI_STATE', payload: { isLoadingRecord: true, error: null } });
    
    // Use the new endpoint to fetch single record
    const response = await fetch(
      `http://localhost:8000/api/veterinarian/get_medical_record/${idToFetch}/`,
      { 
        method: "GET", 
        credentials: "include" 
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch record data: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("📋 Record data fetched successfully:", data);
    
    if (!data.record) {
      throw new Error("No record data found in response");
    }
    
    // ✅ Treatments are already in data.record.treatments
    console.log("💊 Treatments from API:", data.record.treatments);
    
    populateFormWithRecordData(data.record);
    
    dispatch({ 
      type: 'SET_UI_STATE', 
      payload: { 
        isLoadingRecord: false 
      } 
    });
    
  } catch (err) {
    console.error("❌ Error loading record data:", err);
    dispatch({ 
      type: 'SET_UI_STATE', 
      payload: { 
        error: `Failed to load record data: ${err.message}`,
        isLoadingRecord: false 
      } 
    });
  }
};

const populateFormWithRecordData = (record) => {
  console.log("📝 Populating form with record:", record);
  
  // ✅ Use treatments directly from the API response
  let treatments = [];
  if (record.treatments && Array.isArray(record.treatments)) {
    treatments = record.treatments.map(treatment => ({
      medication: treatment.treatment_name || "",
      dosage: treatment.treatment_dosage || "",
      duration: treatment.treatment_duration || "",
      outcome: treatment.treatment_outcome || "",
      treatment_id: treatment.treatment_id // Keep the ID for updates
    }));
  }
  
  // If no treatments found, create empty array
  if (treatments.length === 0) {
    treatments = [{ medication: "", dosage: "", duration: "" }];
  }
  
  console.log("💊 Mapped treatments:", treatments);
  
  // ✅ FIXED: Handle lab images - they should be FULL URLs from backend
  // The backend now sends lab files in `record.labImages` as array of URLs
  const existingFiles = record.labImages || [];
  console.log("📁 Existing lab files URLs from API:", existingFiles);
  
  // Map existing lab files to the expected format
  const mappedExistingFiles = existingFiles.map((fileUrl, index) => {
    // Extract filename from URL
    const urlParts = fileUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    
    // Check file type from URL extension
    let fileType = 'unknown';
    if (fileUrl.toLowerCase().endsWith('.pdf')) {
      fileType = 'application/pdf';
    } else if (fileUrl.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
      fileType = 'image/*';
    }
    
    return {
      id: `existing-${index}`,
      file_path: fileUrl, // This is the FULL URL from backend
      file_name: filename || `lab_file_${index}`,
      file_size: 0,
      file_type: fileType
    };
  });
  
  console.log("📁 Mapped existing files:", mappedExistingFiles);
  dispatch({ type: 'SET_EXISTING_LAB_FILES', payload: mappedExistingFiles });
  
  // Convert date format if needed (backend might send MM-DD-YYYY but frontend expects YYYY-MM-DD)
  const convertDateFormat = (dateStr) => {
    if (!dateStr) return '';
    
    // Check if date is in MM-DD-YYYY format
    const mmddyyyyRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
    const match = dateStr.match(mmddyyyyRegex);
    
    if (match) {
      // Convert from MM-DD-YYYY to YYYY-MM-DD
      const [, month, day, year] = match;
      return `${year}-${month}-${day}`;
    }
    
    // If already in YYYY-MM-DD or other format, return as-is
    return dateStr;
  };
  
  // Parse follow-up time if exists
  let followUpStartTime = '';
  let followUpEndTime = '';
  
  if (record.followUpTime) {
    const timeParts = record.followUpTime.split('-');
    if (timeParts.length >= 2) {
      followUpStartTime = timeParts[0];
      followUpEndTime = timeParts[1];
    }
  }
  
  // Rest of your form data population...
  const newFormData = {
    heartRate: record.heartRate || "",
    respRate: record.respRate || "",
    temperature: record.temperature || "",
    clinicalSigns: record.clinicalSigns || "",
    diagnosticProtocol: record.diagnosticProtocol || "",
    diagnosis: record.diagnosis || "",
    labResult: record.labResult || "",
    labFiles: [], // New files will be added separately
    treatments: treatments,
    prognosis: record.prognosis || "",
    healthStatus: record.healthStatus || record.horseStatus || "Healthy",
    recommendation: record.recommendation || "",
    followUpDate: convertDateFormat(record.followUpDate) || "",
    followUpStartTime: followUpStartTime,
    followUpEndTime: followUpEndTime,
    scheduleId: record.scheduleId || ""
  };
  
  console.log("✅ Form data populated:", newFormData);
  dispatch({ type: 'SET_FORM_DATA', payload: newFormData });
  
  // Set selected date if follow-up date exists
  if (newFormData.followUpDate) {
    const followUpDate = new Date(newFormData.followUpDate);
    if (!isNaN(followUpDate.getTime())) {
      dispatch({ type: 'SET_SELECTED_DATE', payload: followUpDate });
    }
  }
};

const getAllViewableFiles = useCallback(() => {
  // Combine existing files (with URLs) and new files
  const existingFilesWithUrls = existingLabFiles.map((file, index) => ({
    url: file.file_path, // This should be the FULL URL from backend
    name: file.file_name,
    type: file.file_type || (file.file_path.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/*'),
    fileObject: null,
    index: index
  }));
  
  const newFiles = formData.labFiles.map((file, index) => ({
    url: URL.createObjectURL(file),
    name: file.name,
    type: file.type,
    fileObject: file,
    index: index + existingLabFiles.length
  }));
  
  console.log("👁️ Viewable files - existing:", existingFilesWithUrls.length, "new:", newFiles.length);
  return [...existingFilesWithUrls, ...newFiles];
}, [formData.labFiles, existingLabFiles]);

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

  const handleExistingFileRemove = useCallback((index) => {
    dispatch({ type: 'REMOVE_EXISTING_LAB_FILE', index });
  }, []);

  const handleMonthChange = useCallback((newMonth) => {
    dispatch({ type: 'SET_CURRENT_MONTH', payload: newMonth });
  }, []);

  const handleDateSelect = useCallback((date) => {
    dispatch({ type: 'SET_SELECTED_DATE', payload: date });
  }, []);

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

  const handleScheduleSelect = useCallback((scheduleId, date, startTime, endTime) => {
    dispatch({ type: 'SET_FIELD', field: 'scheduleId', value: scheduleId });
    dispatch({ type: 'SET_FIELD', field: 'followUpDate', value: date });
    dispatch({ type: 'SET_FIELD', field: 'followUpStartTime', value: startTime });
    dispatch({ type: 'SET_FIELD', field: 'followUpEndTime', value: endTime });
  }, []);

  const handleCancelSchedule = useCallback(() => {
    dispatch({ type: 'SET_FIELD', field: 'scheduleId', value: '' });
    dispatch({ type: 'SET_FIELD', field: 'followUpDate', value: '' });
    dispatch({ type: 'SET_FIELD', field: 'followUpStartTime', value: '' });
    dispatch({ type: 'SET_FIELD', field: 'followUpEndTime', value: '' });
  }, []);

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
    }
  }, [isModal, onCloseModal]);

  const handleSaveConfirm = useCallback((e) => {
    e.preventDefault();
    
    if (!horseInfo?.id || !appointmentId) {
      dispatch({ type: 'SET_UI_STATE', payload: { error: "Cannot save: missing horse or appointment information." } });
      return;
    }
    
    const recordIdToUpdate = recordId || recordData?.id;
    if (!recordIdToUpdate) {
      dispatch({ type: 'SET_UI_STATE', payload: { error: "Cannot update: missing record ID." } });
      return;
    }
    
    const requiredFields = ["heartRate", "respRate", "temperature", "clinicalSigns", "diagnosticProtocol", "diagnosis", "prognosis", "healthStatus", "recommendation"];
    const isFormComplete = requiredFields.every(field => formData[field]);
    
    if (!isFormComplete) {
      dispatch({ type: 'SET_UI_STATE', payload: { error: "Please fill in all required fields." } });
      return;
    }

    const hasIncompleteTreatments = formData.treatments.some(treatment => 
      !treatment.medication || !treatment.dosage || !treatment.duration
    );
    
    if (hasIncompleteTreatments) {
      dispatch({ type: 'SET_UI_STATE', payload: { error: "Please complete all treatment fields (medication, dosage, and duration) for each treatment." } });
      return;
    }
    
    dispatch({ type: 'SET_UI_STATE', payload: { error: null, showConfirmation: true } });
  }, [formData, horseInfo, appointmentId, recordId, recordData]);

  const updateMedicalRecord = useCallback(async () => {
    const recordIdToUpdate = recordId || recordData?.id;
    if (!horseInfo?.id || !appointmentId || !recordIdToUpdate) {
      dispatch({ type: 'SET_UI_STATE', payload: { error: "Cannot update medical record: missing information." } });
      return;
    }

    if (isLoading) {
      console.log("⚠️ Update already in progress, skipping...");
      return;
    }

    dispatch({ type: 'SET_UI_STATE', payload: { isLoading: true, error: null, showConfirmation: false } });

    try {
      let scheduleId = formData.scheduleId;
      let followUpDate = formData.followUpDate;
      let followUpTime = "";
      
      if (scheduleId) {
        const selectedSchedule = schedules.find(s => s.id === scheduleId);
        if (selectedSchedule) {
          followUpDate = selectedSchedule.date;
          followUpTime = `${selectedSchedule.startTime}-${selectedSchedule.endTime}`;
        }
      }

      const form = new FormData();
      
      form.append("horse_id", horseInfo.id);
      form.append("app_id", appointmentId);
      form.append("medrec_id", recordIdToUpdate);

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

      if (scheduleId) form.append("scheduleId", scheduleId);
      if (followUpDate) form.append("followUpDate", followUpDate);
      if (followUpTime) form.append("followUpTime", followUpTime);

      // Add existing lab files (to track which ones to keep)
      if (existingLabFiles.length > 0) {
        form.append("existing_lab_files", JSON.stringify(existingLabFiles.map(f => f.id || f.file_path)));
      }

      // Add new lab files
      formData.labFiles.forEach((file) => {
        form.append('lab_files', file);
      });

      form.append("treatments", JSON.stringify(formData.treatments));

      const endpoint = "http://localhost:8000/api/veterinarian/update_medical_record/";
      
      console.log("📤 Updating medical record to:", endpoint);
      console.log("📝 Record ID:", recordIdToUpdate);
      console.log("📦 Form data:", {
        heartRate: formData.heartRate,
        treatments: formData.treatments,
        labFiles: formData.labFiles.length,
        existingLabFiles: existingLabFiles.length
      });

      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        body: form,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to update medical record: ${response.status}`);
      }

      console.log("✅ Medical record updated successfully:", data);

      dispatch({
        type: 'SET_UI_STATE',
        payload: {
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
      console.error("❌ Error updating medical record:", err);
      dispatch({ type: 'SET_UI_STATE', payload: { error: err.message } });
    } finally {
      dispatch({ type: 'SET_UI_STATE', payload: { isLoading: false } });
    }
  }, [formData, horseInfo, appointmentId, onRefresh, isModal, onCloseModal, schedules, isLoading, recordId, recordData, existingLabFiles]);

  const handleAddTreatment = useCallback(() => {
    dispatch({ type: 'ADD_TREATMENT' });
  }, []);

  const handleRemoveTreatment = useCallback((index) => {
    dispatch({ type: 'REMOVE_TREATMENT', index });
  }, []);

  const handleConfirmSave = useCallback(() => {
    updateMedicalRecord();
  }, [updateMedicalRecord]);

  const handleCancelConfirm = useCallback(() => {
    dispatch({ type: 'SET_UI_STATE', payload: { showConfirmation: false } });
  }, []);

  const viewableFiles = getAllViewableFiles();

  // Show loading while fetching record data
  if (isLoadingRecord) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 flex flex-col items-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-700">Loading record data...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait while we fetch the medical record</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !isLoadingRecord) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Record</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex gap-3">
              <Button
                onClick={handleCancelForm}
                variant="outline"
                className="flex-1"
              >
                Close
              </Button>
              <Button
                onClick={loadRecordData}
                className="flex-1"
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <EditRecordForm
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
        onExistingFileRemove={handleExistingFileRemove}
        onFilePreview={handleFilePreview}
        onDragStateChange={handleDragStateChange}
        horseInfo={horseInfo}
        schedules={schedules}
        loadingSchedules={loadingSchedules}
        onFetchSchedules={fetchSchedules}
        dragActive={dragActive}
        uploading={isLoading}
        uploadProgress={uploadProgress}
        selectedDate={selectedDate}
        onSelectDate={handleDateSelect}
        currentMonth={currentMonth}
        onMonthChange={handleMonthChange}
        availableDates={availableDates}
        onScheduleSelect={handleScheduleSelect}
        onCancelSchedule={handleCancelSchedule}
        selectedScheduleId={formData.scheduleId}
        existingLabFiles={existingLabFiles}
      />
      
      {showConfirmation && (
        <ConfirmationModal 
          onConfirm={handleConfirmSave} 
          onCancel={handleCancelConfirm}
          isLoading={isLoading}
          formData={formData}
          isEditMode={true}
        />
      )}
      
      {showSuccessAlert && <SuccessAlert />}

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

export default React.memo(EditMedicalRecord);