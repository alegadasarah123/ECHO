import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Activity, ClipboardList, FileText, Heart, StickyNote, TrendingUp, X, Plus, CheckCircle, Clock, Pill, Syringe, Clock3, Thermometer, User, MapPin, Loader, Edit, Save, Upload, File, Image, Trash2, Eye, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

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
  const [treatments, setTreatments] = useState([]);
  const [loadingTreatments, setLoadingTreatments] = useState(false);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [isFollowUpMode, setIsFollowUpMode] = useState(false);
  const [followUpData, setFollowUpData] = useState({
    diagnosis: "",
    clinicalSigns: "",
    diagnosticProtocol: "",
    heartRate: "",
    respRate: "",
    temperature: "",
    labResult: "",
    prognosis: "",
    recommendation: "",
    horseStatus: "Healthy"
  });
  const [editingTreatmentOutcomes, setEditingTreatmentOutcomes] = useState({});
  const [newTreatments, setNewTreatments] = useState([]);
  const [labFiles, setLabFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  
  // ========== COPIED FOLLOW-UP SCHEDULE STATES ==========
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [showCustomSchedule, setShowCustomSchedule] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  
  // UNIFIED FILE VIEWER STATES
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // NEW: Track if follow-up exists
  const [followUpExists, setFollowUpExists] = useState(false);
  const [checkingFollowUp, setCheckingFollowUp] = useState(false);

  // ========== COPIED CALENDAR STATES ==========
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);

  if (!record) return null;

  // Function to get the latest record (original or follow-up)
  const getLatestRecord = () => {
    if (!record.followUpRecords || record.followUpRecords.length === 0) {
      return record;
    }
    
    // Sort follow-up records by date to get the latest one
    const sortedFollowUps = [...record.followUpRecords].sort((a, b) => 
      new Date(b.date || b.medrec_date) - new Date(a.date || a.medrec_date)
    );
    
    return sortedFollowUps[0]; // Return the most recent follow-up
  };

  // Use the latest record for display
  const displayRecord = getLatestRecord();
  const isLatestRecordFollowUp = displayRecord.id !== record.id;

  // FIXED: Check if today is on or after the follow-up date
  const canRecordFollowUp = () => {
    const followUpDate = record.followUpDate || record.medrec_followup_date;
    if (!followUpDate) return false;
    
    const today = new Date();
    const followUp = new Date(followUpDate);
    
    // Reset both dates to midnight to compare only dates
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const followUpMidnight = new Date(followUp.getFullYear(), followUp.getMonth(), followUp.getDate());
    
    // Return true if today is on or after the follow-up date
    return todayMidnight.getTime() >= followUpMidnight.getTime();
  };

  // NEW: Check backend if follow-up record exists
  const checkFollowUpExists = async () => {
    if (!record.id) return;
    
    setCheckingFollowUp(true);
    try {
      const response = await fetch(`http://localhost:8000/api/veterinarian/check_followup_record/${record.id}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setFollowUpExists(data.followup_exists);
      } else {
        console.error('Failed to check follow-up record');
      }
    } catch (error) {
      console.error('Error checking follow-up record:', error);
    } finally {
      setCheckingFollowUp(false);
    }
  };

  // Check for follow-up records on component mount
  useEffect(() => {
    checkFollowUpExists();
  }, [record.id]);

const FileViewer = () => {
  const currentFile = getCurrentFile();
  const allFiles = getAllViewableFiles();

  if (!fileViewerOpen || !currentFile) return null;

  // Get clean filename without ID
  const getCleanFileName = (url) => {
    if (!url) return "File";
    const parts = url.split('/');
    let name = parts[parts.length - 1];
    name = name.split('?')[0]; // Remove query params
    name = decodeURIComponent(name); // Decode URL encoded characters
    return name || "File";
  };

  const fileName = getCleanFileName(currentFile.url);
  const isPDF = fileName.toLowerCase().endsWith('.pdf');
  const isImage = fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/);

  return (
    <div className="fixed inset-0 bg-black z-[70] flex flex-col">
      {/* Clean Header */}
      <div className="bg-black border-b border-gray-800 p-4 flex-shrink-0 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {isPDF ? (
            <FileText className="w-5 h-5 text-red-500" />
          ) : isImage ? (
            <Image className="w-5 h-5 text-blue-500" />
          ) : (
            <File className="w-5 h-5 text-gray-500" />
          )}
          <div className="max-w-xl">
            <h3 className="font-semibold text-white truncate">{fileName}</h3>
            <p className="text-sm text-gray-400">
              {allFiles.length > 1 && `File ${currentFileIndex + 1} of ${allFiles.length}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Navigation */}
          {allFiles.length > 1 && (
            <div className="flex items-center gap-1 mr-4">
              <button
                onClick={prevFile}
                className="p-2 rounded-lg text-white hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextFile}
                className="p-2 rounded-lg text-white hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={closeFileViewer}
            className="p-2 rounded-lg text-white hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* File Content */}
      <div className="flex-1 bg-black flex items-center justify-center overflow-hidden">
        {isPDF ? (
          <iframe
            src={currentFile.url}
            className="w-full h-full border-0"
            title={fileName}
            style={{ 
              minHeight: '100vh',
              backgroundColor: 'white'
            }}
          />
        ) : isImage ? (
          <div className="w-full h-full flex items-center justify-center">
            <img
              src={currentFile.url}
              alt={fileName}
              className="max-w-full max-h-full object-contain"
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease-in-out'
              }}
            />
          </div>
        ) : (
          <div className="text-center text-white p-8">
            <File className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg mb-2">Preview not available</p>
            <a
              href={currentFile.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white mt-4"
            >
              Download File
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

  // ========== COPIED SCHEDULE FUNCTIONS ==========
  const fetchSchedules = async () => {
    setLoadingSchedules(true);
    
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
      
      setSchedules(availableSchedules);
      // Extract available dates
      const dates = [...new Set(availableSchedules.map(schedule => schedule.date))];
      setAvailableDates(dates);
      
      // Set today as selected date if available
      const today = new Date();
      const todayStr = formatDate(today);
      if (dates.includes(todayStr)) {
        setSelectedDate(today);
      }
    } catch (err) {
      console.error("Error fetching schedules:", err);
      setError("Failed to load schedules");
    } finally {
      setLoadingSchedules(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const updateScheduleAvailability = async (scheduleId) => {
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
  };

  const createSchedule = async (date, startTime, endTime) => {
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

      // Immediately set the new schedule as unavailable
      try {
        await updateScheduleAvailability(scheduleId);
      } catch (err) {
        console.error("Failed to set new schedule as unavailable, but continuing:", err);
      }

      return scheduleId;
    } catch (err) {
      console.error("Error creating schedule:", err);
      throw err;
    }
  };

  // ========== COPIED CALENDAR COMPONENT ==========
  const CalendarComponent = () => {
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
      setCurrentMonth(newMonth);
    };

    const goToNextMonth = () => {
      const newMonth = new Date(currentMonth);
      newMonth.setMonth(newMonth.getMonth() + 1);
      setCurrentMonth(newMonth);
    };

    const goToToday = () => {
      const today = new Date();
      setCurrentMonth(today);
      setSelectedDate(today);
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
                    onClick={() => hasSlots && setSelectedDate(date)}
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
                              onClick={() => !isSelected && handleScheduleSelect(schedule.id)}
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
                                        handleCancelSchedule();
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
                              onClick={() => !isSelected && handleScheduleSelect(schedule.id)}
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
                                        handleCancelSchedule();
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

  // FETCH TREATMENTS FROM BACKEND - FIXED VERSION
  useEffect(() => {
    const fetchTreatments = async () => {
      if (!record.id || !horseInfo?.id) {
        console.log("❌ Missing record ID or horse ID");
        return;
      }

      setLoadingTreatments(true);
      setError(null);
      
      try {
        console.log("🚀 Fetching treatments for horse:", horseInfo.id);
        
        const response = await fetch(`http://localhost:8000/api/veterinarian/get_horse_treatment_records/${horseInfo.id}/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.treatmentRecords && Array.isArray(data.treatmentRecords)) {
          // FIXED: Properly filter treatments by medical record ID
          const recordTreatments = data.treatmentRecords.filter(
            treatment => treatment.medrecId === record.id || treatment.medrec_id === record.id
          );
          
          console.log("🔍 Treatments for current record:", recordTreatments);
          setTreatments(recordTreatments);
          
          // Initialize editing outcomes
          const initialOutcomes = {};
          recordTreatments.forEach(treatment => {
            const treatmentId = treatment.id || treatment.treatment_id;
            initialOutcomes[treatmentId] = treatment.outcome || treatment.treatment_outcome || 'Ongoing';
          });
          setEditingTreatmentOutcomes(initialOutcomes);
        } else {
          console.log("❌ No treatmentRecords in response");
          setTreatments([]);
        }
      } catch (err) {
        console.error("🔥 Error fetching treatments:", err);
        setError(`Failed to load treatments: ${err.message}`);
        setTreatments([]);
      } finally {
        setLoadingTreatments(false);
      }
    };

    fetchTreatments();
  }, [record.id, horseInfo?.id]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Healthy': return 'bg-emerald-500';
      case 'Unhealthy': return 'bg-amber-500';
      case 'Sick': return 'bg-rose-500';
      case 'Ongoing': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getOutcomeColor = (outcome) => {
    switch (outcome?.toLowerCase()) {
      case 'Completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Discontinued': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'Ongoing': 
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getOutcomeIcon = (outcome) => {
    switch (outcome?.toLowerCase()) {
      case 'Completed': return <CheckCircle className="w-4 h-4" />;
      case 'Discontinued': return <X className="w-4 h-4" />;
      case 'Cancelled': return <X className="w-4 h-4" />;
      case 'Ongoing':
      default: return <Clock className="w-4 h-4" />;
    }
  };

  // FIXED: IMPROVED FILE TYPE DETECTION AND URL FIXING
  const getFileInfo = (fileUrl, fileName = "") => {
    if (!fileUrl) return { type: 'unknown', url: '' };
    
    // Extract filename from URL if no fileName provided
    let actualFileName = fileName;
    if (!actualFileName && fileUrl) {
      const urlParts = fileUrl.split('/');
      actualFileName = urlParts[urlParts.length - 1];
    }
    
    // FIXED: Clean up the URL - remove any invalid characters or brackets
    let cleanUrl = fileUrl;
    if (cleanUrl.includes('["') || cleanUrl.includes('"]')) {
      cleanUrl = cleanUrl.replace(/\["|"\]/g, '');
    }
    if (cleanUrl.includes('"')) {
      cleanUrl = cleanUrl.replace(/"/g, '');
    }
    
    // Check file extension first (most reliable)
    const fileExtension = actualFileName.toLowerCase().split('.').pop();
    
    // Check for PDF
    const isPDF = fileExtension === 'pdf' || 
                 cleanUrl.toLowerCase().includes('.pdf') || 
                 cleanUrl.toLowerCase().includes('application/pdf');
    
    // Check for images
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const isImage = imageExtensions.includes(fileExtension) || 
                   cleanUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)/) ||
                   cleanUrl.includes('image/');
    
    return {
      type: isPDF ? 'pdf' : isImage ? 'image' : 'unknown',
      url: cleanUrl,
      name: actualFileName || "Lab Result File"
    };
  };

// FIXED: Get all existing files from database
const getAllExistingFiles = () => {
  const files = [];
  
  // Get the lab files data - FIXED: Use the correct property name from backend
  const labImages = displayRecord.labImages;
  
  console.log("========== DEBUG FILE DATA ==========");
  console.log("displayRecord:", displayRecord);
  console.log("labImages (from backend):", labImages);
  console.log("Type of labImages:", typeof labImages);
  console.log("Is array?", Array.isArray(labImages));
  console.log("=====================================");
  
  if (!labImages || !Array.isArray(labImages)) {
    console.log("❌ No lab images array found or it's not an array");
    return files;
  }
  
  console.log(`✅ Processing ${labImages.length} files from labImages array`);
  
  labImages.forEach((fileUrl, index) => {
    console.log(`\n--- File ${index + 1} ---`);
    console.log("Raw URL:", fileUrl);
    
    if (fileUrl && fileUrl.toString().trim() !== '') {
      // Clean URL
      let cleanUrl = fileUrl.toString();
      
      // Remove any brackets or quotes
      cleanUrl = cleanUrl.replace(/[\[\]"]/g, '');
      console.log("Cleaned URL:", cleanUrl);
      
      // Check if URL is complete
      if (!cleanUrl.startsWith('http')) {
        console.log("⚠️ URL is not a complete HTTP link");
        // Try to construct full URL using your Supabase URL
        const filename = cleanUrl.split('/').pop() || cleanUrl;
        // Use the same URL construction as backend
        cleanUrl = `https://${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID || 'YOUR_PROJECT_ID'}.supabase.co/storage/v1/object/public/Lab_results/${filename}`;
        console.log("Constructed URL:", cleanUrl);
      }
      
      // Get file info
      const fileName = cleanUrl.split('/').pop() || `Lab File ${index + 1}`;
      const fileInfo = getFileInfo(cleanUrl, fileName);
      console.log("File Info:", fileInfo);
      
      if (fileInfo.url && fileInfo.url.trim() !== '') {
        files.push({
          url: fileInfo.url,
          name: fileInfo.name,
          type: fileInfo.type,
          isExisting: true,
          index: index,
          originalUrl: fileUrl
        });
        console.log(`✅ Added file: ${fileName}`);
      }
    } else {
      console.log(`❌ File ${index} is empty`);
    }
  });
  
  console.log(`📁 Total files processed: ${files.length}`);
  console.log("Files array:", files);
  console.log("=====================================\n");
  
  return files;
};

const handleImageError = () => {
    setImageError(true);
  };

  // ========== UNIFIED FILE VIEWER FUNCTIONS ==========
  const openFileViewer = (files, startIndex = 0) => {
    setCurrentFileIndex(startIndex);
    setFileViewerOpen(true);
    setZoomLevel(1);
    setRotation(0);
  };

  const closeFileViewer = () => {
    setFileViewerOpen(false);
    setCurrentFileIndex(0);
    setZoomLevel(1);
    setRotation(0);
  };

  const nextFile = () => {
    const files = getAllViewableFiles();
    setCurrentFileIndex((prev) => (prev + 1) % files.length);
    setZoomLevel(1);
    setRotation(0);
  };

  const prevFile = () => {
    const files = getAllViewableFiles();
    setCurrentFileIndex((prev) => (prev - 1 + files.length) % files.length);
    setZoomLevel(1);
    setRotation(0);
  };
  // FIXED: Properly get all viewable files with array support
const getAllViewableFiles = () => {
  const files = [];
  
  // Just use what's in labImages
  const labImages = displayRecord.labImages || [];
  
  labImages.forEach((url, index) => {
    if (url) {
      const fileName = url.split('/').pop() || `Lab File ${index + 1}`;
      const isPDF = fileName.toLowerCase().endsWith('.pdf');
      const isImage = fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/);
      
      files.push({
        url: url,
        name: fileName,
        type: isPDF ? 'pdf' : isImage ? 'image' : 'unknown',
        isExisting: true,
        index: index
      });
    }
  });
  
  // Add uploaded files
  labFiles.forEach((file, index) => {
    files.push({
      url: URL.createObjectURL(file),
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 
            file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'unknown',
      fileObject: file,
      isExisting: false,
      index: files.length
    });
  });

  return files;
};

  const getCurrentFile = () => {
    const files = getAllViewableFiles();
    return files[currentFileIndex];
  };

  // FIXED ZOOM FUNCTIONS
  const handleZoomIn = () => {
    setZoomLevel(prev => {
      const newZoom = Math.min(prev + 0.25, 3);
      return newZoom;
    });
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => {
      const newZoom = Math.max(prev - 0.25, 0.5);
      return newZoom;
    });
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const resetTransform = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  // ========== FILE UPLOAD HANDLERS ==========
  
  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Process selected files
  const handleFiles = (files) => {
    const fileList = Array.from(files);
    
    const validFiles = fileList.filter(file => {
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
    });

    if (validFiles.length > 0) {
      setLabFiles(prev => {
        const newFiles = [...prev, ...validFiles];
        // Limit to 10 files max
        return newFiles.slice(0, 10);
      });
      
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

  const handleRemoveFile = (index) => {
    setLabFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Get file icon based on type
  const getFileIcon = (file) => {
    const fileInfo = getFileInfo(file.url || file.name, file.name);
    
    if (fileInfo.type === 'pdf') {
      return <FileText className="w-5 h-5 text-red-500" />;
    } else if (fileInfo.type === 'image') {
      return <Image className="w-5 h-5 text-blue-500" />;
    } else {
      return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleStartFollowUp = () => {
    setIsFollowUpMode(true);
    // Pre-fill follow-up data with previous values for reference
    setFollowUpData({
      diagnosis: "",
      clinicalSigns: "",
      diagnosticProtocol: "",
      heartRate: "",
      respRate: "",
      temperature: "",
      labResult: "",
      prognosis: "",
      recommendation: "",
      horseStatus: "Healthy"
    });
    // Fetch available schedules when opening follow-up mode
    fetchSchedules();
  };

  const handleFollowUpInputChange = (field, value) => {
    setFollowUpData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // FIXED: Treatment outcome change handler
  const handleTreatmentOutcomeChange = (treatmentId, outcome) => {
    setEditingTreatmentOutcomes(prev => ({
      ...prev,
      [treatmentId]: outcome
    }));
  };

  const handleAddNewTreatment = () => {
    setNewTreatments(prev => [...prev, {
      id: Date.now(), // temporary ID
      medication: "",
      dosage: "",
      duration: "",
      outcome: "Ongoing"
    }]);
  };

  const handleNewTreatmentChange = (index, field, value) => {
    setNewTreatments(prev => prev.map((treatment, i) => 
      i === index ? { ...treatment, [field]: value } : treatment
    ));
  };

  const handleRemoveNewTreatment = (index) => {
    setNewTreatments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveConfirmation = () => {
    setShowConfirmation(true);
  };

  // ========== COPIED SCHEDULE HANDLERS ==========
  const handleScheduleSelect = (scheduleId) => {
    setSelectedScheduleId(scheduleId);
    const selectedSchedule = schedules.find(s => s.id === scheduleId);
    if (selectedSchedule) {
      setFollowUpData(prev => ({
        ...prev,
        followUpDate: selectedSchedule.date,
        followUpStartTime: selectedSchedule.startTime,
        followUpEndTime: selectedSchedule.endTime
      }));
    }
  };

  const handleCancelSchedule = () => {
    setSelectedScheduleId("");
    setFollowUpData(prev => ({
      ...prev,
      followUpDate: "",
      followUpStartTime: "",
      followUpEndTime: ""
    }));
  };

  const handleToggleCustomSchedule = (showCustom) => {
    setShowCustomSchedule(showCustom);
    if (!showCustom) {
      setSelectedScheduleId("");
    }
  };

  // ========== UPDATED SAVE FOLLOW-UP FUNCTION WITH SCHEDULE SUPPORT ==========
  const handleSaveFollowUp = async () => {
    console.log("💾 Saving follow-up data:", followUpData);
    console.log("🔄 Updated treatment outcomes:", editingTreatmentOutcomes);
    console.log("💊 New treatments:", newTreatments);
    console.log("📁 Lab files to upload:", labFiles);
    console.log("📅 Selected schedule ID:", selectedScheduleId);
    
    setUploading(true);
    setShowConfirmation(false);
    
    try {
      // Create FormData for unified request
      const formData = new FormData();
      
      // Append basic data
      formData.append("horseId", horseInfo.id);
      formData.append("previousRecordId", record.id);
      
      // Append follow-up data
      Object.keys(followUpData).forEach(key => {
        formData.append(key, followUpData[key] || "");
      });
      
      // Append treatment outcomes as JSON
      formData.append("treatmentOutcomes", JSON.stringify(editingTreatmentOutcomes));
      
      // Append new treatments as JSON
      formData.append("treatments", JSON.stringify(newTreatments.map(t => ({
        medication: t.medication,
        dosage: t.dosage,
        duration: t.duration,
        outcome: t.outcome
      }))));
      
      // Append schedule information if selected
      if (selectedScheduleId) {
        formData.append("scheduleId", selectedScheduleId);
      } else if (showCustomSchedule && followUpData.followUpDate && followUpData.followUpStartTime && followUpData.followUpEndTime) {
        formData.append("followUpDate", followUpData.followUpDate);
        formData.append("followUpStartTime", followUpData.followUpStartTime);
        formData.append("followUpEndTime", followUpData.followUpEndTime);
      }
      
      // Append lab files
      labFiles.forEach(file => {
        formData.append('lab_files', file);
      });

      console.log("🚀 Sending unified follow-up request...");

      const response = await fetch('http://localhost:8000/api/veterinarian/create_followup_record/', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Follow-up record creation failed:", errorText);
        throw new Error('Failed to create follow-up record');
      }

      const result = await response.json();
      console.log("✅ Follow-up record created successfully:", result);

      // MARK FOLLOW-UP AS RECORDED
      setFollowUpExists(true);
      
      // SUCCESS: Show alert and navigate back
      console.log("🎉 Follow-up process completed successfully!");
      
      // Show success message
      if (onRecordFollowUp) {
        onRecordFollowUp("Follow-up record saved successfully!");
      }
      
      // FIXED: Close the modal and reset states - this will hide the follow-up button in parent
      setIsFollowUpMode(false);
      setLabFiles([]);
      setNewTreatments([]);
      setUploading(false);
      setSelectedScheduleId("");
      
      // FIXED: Close the entire modal to go back to parent component
      if (onClose) {
        onClose();
      }

    } catch (error) {
      console.error("💥 Error saving follow-up:", error);
      // Show error message
      if (onRecordFollowUp) {
        onRecordFollowUp("Error saving follow-up record: " + error.message, "error");
      } else {
        alert("Error saving follow-up record: " + error.message);
      }
      setUploading(false);
    }
  };

  const handleCancelFollowUp = () => {
    setIsFollowUpMode(false);
    setFollowUpData({});
    setEditingTreatmentOutcomes({});
    setNewTreatments([]);
    setLabFiles([]);
    setSelectedScheduleId("");
    setError(null);
  };

  // ========== UPDATED CONFIRMATION MODAL WITH NEW DESIGN ==========
  const ConfirmationModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Save Follow-up Record
          </h3>
          <p className="text-gray-600 mb-6">
            Are you sure you want to save this follow-up medical record? This action cannot be undone.
          </p>
          
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left">
              <h4 className="font-medium text-blue-900 text-sm mb-2">Summary:</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• New diagnosis and clinical findings</li>
                <li>• Updated vital signs</li>
                {labFiles.length > 0 && <li>• {labFiles.length} lab file(s) to upload</li>}
                {newTreatments.length > 0 && <li>• {newTreatments.length} new treatment(s)</li>}
                {Object.keys(editingTreatmentOutcomes).length > 0 && <li>• {Object.keys(editingTreatmentOutcomes).length} treatment outcome(s) to update</li>}
                {selectedScheduleId && <li>• Follow-up schedule selected</li>}
                {showCustomSchedule && followUpData.followUpDate && <li>• Custom follow-up schedule created</li>}
              </ul>
            </div>
          </div>

          {/* UPDATED ACTION BUTTONS WITH NEW DESIGN */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              onClick={() => setShowConfirmation(false)}
              variant="outline"
              className="flex-1 border border-gray-300 text-gray-600 hover:bg-red-50 hover:border-red-400 hover:text-red-600"
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveFollowUp}
              className="flex-1 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
              disabled={uploading}
            >
              {uploading ? (
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
  );
const FileDisplaySection = () => {
  // Get lab images array from backend
  const labImages = displayRecord.labImages || [];
  const hasFiles = labImages.length > 0;

  // Function to get clean filename from URL
  const getCleanFileName = (url) => {
    if (!url) return 'Lab File';
    
    // Clean the URL first
    let cleanUrl = url.toString().replace(/[\[\]"]/g, '');
    
    // Extract just the filename
    const parts = cleanUrl.split('/');
    let fileName = parts[parts.length - 1];
    
    // Remove query parameters
    fileName = fileName.split('?')[0];
    
    // Decode URL-encoded characters (like %20 for space)
    try {
      fileName = decodeURIComponent(fileName);
    } catch (e) {
      // Keep as is if decoding fails
    }
    
    // Return filename or default
    return fileName || 'Lab Result';
  };

  // Function to get file icon
  const getFileIcon = (fileName) => {
    const lowerName = fileName.toLowerCase();
    if (lowerName.endsWith('.pdf')) {
      return <FileText className="w-5 h-5 text-red-600" />;
    } else if (lowerName.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/)) {
      return <Image className="w-5 h-5 text-blue-600" />;
    }
    return <File className="w-5 h-5 text-gray-600" />;
  };

  // Function to get file type
  const getFileType = (fileName) => {
    const lowerName = fileName.toLowerCase();
    if (lowerName.endsWith('.pdf')) return 'PDF';
    if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'JPEG Image';
    if (lowerName.endsWith('.png')) return 'PNG Image';
    if (lowerName.endsWith('.gif')) return 'GIF';
    if (lowerName.match(/\.(bmp|webp|svg)$/)) return 'Image';
    return 'File';
  };

  // Prepare files for viewer
  const prepareFilesForViewer = () => {
    return labImages.map((url, index) => {
      const fileName = getCleanFileName(url);
      return {
        url: url,
        name: fileName,
        type: fileName.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image',
        index: index
      };
    });
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Lab Files</h3>
        </div>
        {hasFiles && (
          <span className="text-sm text-gray-500">
            {labImages.length} file{labImages.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
      
      {hasFiles ? (
        <div className="space-y-3">
          {labImages.map((fileUrl, index) => {
            const fileName = getCleanFileName(fileUrl);
            const fileType = getFileType(fileName);
            
            return (
              <div 
                key={`file-${index}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    {getFileIcon(fileName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {fileName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {fileType}
                    </p>
                  </div>
                </div>
                
                {/* Eye icon INSIDE container - no button, no overlap */}
                <div 
                  onClick={() => {
                    const files = prepareFilesForViewer();
                    openFileViewer(files, index);
                  }}
                  className="flex-shrink-0 cursor-pointer p-2 rounded-md bg-white border border-gray-300 text-gray-600 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition-colors ml-2"
                  title="View file"
                >
                  <Eye className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-600">No lab files attached</p>
          <p className="text-sm text-gray-500 mt-1">Files will appear here when uploaded</p>
        </div>
      )}
    </div>
  );
};

// ========== FILE UPLOAD COMPONENT WITH "OPTIONAL" LABEL ==========
  const FileUploadSection = () => (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">Upload Lab Files</h3>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Optional</span>
        </div>
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

      {/* Uploaded Files List - This is the ONLY place files are shown in follow-up mode */}
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
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // In follow-up mode, only show uploaded files
                      const uploadedFiles = labFiles.map((f, idx) => ({
                        url: URL.createObjectURL(f),
                        name: f.name,
                        type: getFileInfo(URL.createObjectURL(f), f.name).type,
                        fileObject: f,
                        isExisting: false,
                        index: idx
                      }));
                      openFileViewer(uploadedFiles, index);
                    }}
                    className="cursor-pointer h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                    title="Preview File"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile(index)}
                    className="cursor-pointer h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
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
          <p className="text-xs text-blue-600 mt-2">
            Please don't close this window while files are uploading...
          </p>
        </div>
      )}
    </div>
  );

  // ========== UPDATED FOLLOW-UP FORM WITH CALENDAR COMPONENT ==========
  const renderFollowUpForm = () => {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
          {/* Fixed Header */}
          <div className="p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Record Follow-up Visit</h2>
              <button
                onClick={handleCancelFollowUp}
                className="cursor-pointer p-2 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-100 transition duration-200 focus:outline-none focus:ring-2 focus:ring-red-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mt-1">
              Follow-up for {horseInfo?.name || "Patient"} • Previous visit: {new Date(record.date || record.medrec_date).toLocaleDateString()}
            </p>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Previous Record Summary */}
              <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-blue-900">Previous Visit Summary (Reference Only)</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Diagnosis:</span> 
                    <div className="text-blue-600 mt-1">{record.diagnosis || record.medrec_diagnosis || "None"}</div>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Status:</span> 
                    <div className="text-blue-600 mt-1">{record.horseStatus || record.medrec_horsestatus || "Unknown"}</div>
                  </div>
                </div>
                <p className="text-xs text-blue-500 mt-3 italic">
                  This information is from the previous visit. Please fill in the current status below.
                </p>
              </div>

              {/* Vital Signs */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Current Vital Signs</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Heart Rate (BPM)</label>
                    <input
                      type="number"
                      value={followUpData.heartRate}
                      onChange={(e) => handleFollowUpInputChange('heartRate', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                      placeholder="Enter current heart rate"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Respiration Rate (Breaths/min)</label>
                    <input
                      type="number"
                      value={followUpData.respRate}
                      onChange={(e) => handleFollowUpInputChange('respRate', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                      placeholder="Enter current respiration rate"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Temperature (°C)</label>
                    <input
                      type="number"
                      value={followUpData.temperature}
                      onChange={(e) => handleFollowUpInputChange('temperature', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                      placeholder="Enter current temperature"
                    />
                  </div>
                </div>
              </div>

              {/* Clinical Signs */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-amber-100 p-2 rounded-lg">
                    <Activity className="w-4 h-4 text-amber-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Current Clinical Signs</h3>
                </div>
                <textarea
                  value={followUpData.clinicalSigns}
                  onChange={(e) => handleFollowUpInputChange('clinicalSigns', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                  rows="3"
                  placeholder="Describe current clinical signs observed..."
                />
              </div>

              {/* Diagnostic Protocol */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <ClipboardList className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Diagnostic Procedures</h3>
                </div>
                <textarea
                  value={followUpData.diagnosticProtocol}
                  onChange={(e) => handleFollowUpInputChange('diagnosticProtocol', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                  rows="2"
                  placeholder="Describe diagnostic procedures performed during this visit..."
                />
              </div>

              {/* Diagnosis */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Current Diagnosis</h3>
                </div>
                <textarea
                  value={followUpData.diagnosis}
                  onChange={(e) => handleFollowUpInputChange('diagnosis', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                  rows="3"
                  placeholder="Enter current diagnosis based on today's assessment..."
                />
              </div>

              {/* Lab Results - ADDED "OPTIONAL" LABEL */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-semibold text-gray-900">Lab Results</h3>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Optional</span>
                </div>
                <textarea
                  value={followUpData.labResult}
                  onChange={(e) => handleFollowUpInputChange('labResult', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                  rows="3"
                  placeholder="Enter lab results from current tests..."
                />
              </div>

              {/* Lab Image Upload Section - This shows the selected files with View/Remove buttons */}
              <FileUploadSection />

              {/* Update Treatment Outcomes & Add New Treatments */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <Pill className="w-4 h-4 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Treatment Plan</h3>
                  </div>
                  <Button 
                    onClick={handleAddNewTreatment}
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Add New Treatment
                  </Button>
                </div>

                {/* Existing Treatments */}
                {treatments.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-700 mb-3">Update Existing Treatments</h4>
                    <div className="space-y-3">
                      {treatments.map((treatment) => {
                        const treatmentId = treatment.id || treatment.treatment_id;
                        return (
                          <div key={treatmentId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium">{treatment.medication || treatment.treatment_name}</div>
                              <div className="text-sm text-gray-600">
                                {treatment.dosage || treatment.treatment_dosage} • {treatment.duration || treatment.treatment_duration}
                              </div>
                            </div>
                            <select
                              value={editingTreatmentOutcomes[treatmentId] || 'Ongoing'}
                              onChange={(e) => handleTreatmentOutcomeChange(treatmentId, e.target.value)}
                              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            >
                              <option value="Ongoing">Ongoing</option>
                              <option value="Completed">Completed</option>
                              <option value="Discontinued">Discontinued</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* New Treatments */}
                {newTreatments.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">New Treatments</h4>
                    <div className="space-y-4">
                      {newTreatments.map((treatment, index) => (
                        <div key={treatment.id} className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                          <div className="flex justify-between items-center mb-3">
                            <h5 className="font-medium text-gray-900">New Treatment #{index + 1}</h5>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveNewTreatment(index)}
                              className="cursor-pointer text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Medication</label>
                              <input
                                type="text"
                                value={treatment.medication}
                                onChange={(e) => handleNewTreatmentChange(index, 'medication', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                                placeholder="Medication name"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Dosage</label>
                              <input
                                type="text"
                                value={treatment.dosage}
                                onChange={(e) => handleNewTreatmentChange(index, 'dosage', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                                placeholder="Dosage amount"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Duration</label>
                              <input
                                type="text"
                                value={treatment.duration}
                                onChange={(e) => handleNewTreatmentChange(index, 'duration', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                                placeholder="Treatment duration"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Prognosis and Current Status - Side by Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Prognosis */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-semibold text-gray-900">Prognosis</h3>
                  </div>
                  <textarea
                    value={followUpData.prognosis}
                    onChange={(e) => handleFollowUpInputChange('prognosis', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                    rows="3"
                    placeholder="Enter prognosis based on current assessment..."
                  />
                </div>

                {/* Current Status */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Current Status</h3>
                  </div>
                  <select
                    value={followUpData.horseStatus}
                    onChange={(e) => handleFollowUpInputChange('horseStatus', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                  >
                    <option value="Healthy">Healthy</option>
                    <option value="Sick">Sick</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    Select the current health status of the horse
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
                  value={followUpData.recommendation}
                  onChange={(e) => handleFollowUpInputChange('recommendation', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                  rows="2"
                  placeholder="Enter recommendations for ongoing care..."
                />
              </div>

              {/* ========== ADDED: CALENDAR COMPONENT FOR FOLLOW-UP SCHEDULING ========== */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Clock3 className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Next Follow-up Schedule (Optional)</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={fetchSchedules}
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
                    
                    {selectedScheduleId && (
                      <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Schedule selected
                      </span>
                    )}
                  </div>

                  {/* Calendar Component */}
                  <CalendarComponent />
                </div>
              </div>

              {/* ========== FIXED: Error Display BELOW the Follow-up Schedule Section ========== */}
              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-red-800 font-medium text-sm">Error</p>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* UPDATED ACTION BUTTONS WITH NEW DESIGN */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button
                  onClick={handleCancelFollowUp}
                  variant="outline"
                  className="flex-1 border border-gray-300 text-gray-600 hover:bg-red-50 hover:border-red-400 hover:text-red-600"
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveConfirmation}
                  className="flex-1 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                  disabled={uploading}
                >
                  {uploading ? (
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

  // FIXED: Calculate if we should show the button - only show when today is on or after follow-up date AND no follow-up exists
  const shouldShowFollowUpButton = canRecordFollowUp() && !followUpExists && !checkingFollowUp;

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6 sticky top-0 z-10">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-2 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Medical Record
                  {isLatestRecordFollowUp && (
                    <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      Latest Follow-up
                    </span>
                  )}
                </h1>
                <p className="text-gray-600">
                  {horseInfo?.name || "Patient"} • {new Date(displayRecord.date || displayRecord.medrec_date).toLocaleDateString()}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-white text-sm font-medium ${getStatusColor(displayRecord.horseStatus || displayRecord.medrec_horsestatus)}`}>
                {displayRecord.horseStatus || displayRecord.medrec_horsestatus || 'No Status'}
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-4 h-4" />
                <span>Dr. {displayRecord.veterinarian || "Not Specified"}</span>
              </div>
              
              {/* Follow-up Date - Only show if exists */}
              {(displayRecord.followUpDate || displayRecord.medrec_followup_date) && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span>Follow-up: {new Date(displayRecord.followUpDate || displayRecord.medrec_followup_date).toLocaleDateString()}</span>
                </div>
              )}
              
              {treatments.length > 0 && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Pill className="w-4 h-4" />
                  <span>{treatments.length} Treatment{treatments.length > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>
          
          <Button 
            onClick={onClose}
            variant="ghost" 
            size="sm"
            className="cursor-pointer hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Clinical Overview */}
          <div className="xl:col-span-2 space-y-6">
            {/* Vital Signs */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Vital Signs</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <Heart className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{displayRecord.heartRate || displayRecord.medrec_heart_rate || "-"}</div>
                  <div className="text-sm text-gray-600">Heart Rate</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <Activity className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{displayRecord.respRate || displayRecord.medrec_resp_rate || "-"}</div>
                  <div className="text-sm text-gray-600">Respiration</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <Thermometer className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{displayRecord.temperature || displayRecord.medrec_body_temp || "-"}</div>
                  <div className="text-sm text-gray-600">Temperature</div>
                </div>
              </div>
            </div>

            {/* Diagnosis & Clinical Findings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Diagnosis</h3>
                </div>
                <div className="text-gray-700">
                  {displayRecord.diagnosis || displayRecord.medrec_diagnosis || "No diagnosis recorded"}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-amber-100 p-2 rounded-lg">
                    <Activity className="w-4 h-4 text-amber-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Clinical Signs</h3>
                </div>
                <div className="text-gray-700">
                  {displayRecord.clinicalSigns || displayRecord.medrec_clinical_signs || "No clinical signs recorded"}
                </div>
              </div>
            </div>

            {/* Diagnostic Protocol */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <ClipboardList className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Diagnostic Protocol</h3>
                </div>
              <div className="text-gray-700">
                {displayRecord.diagnosticProtocol || displayRecord.medrec_diagnostic_protocol || "No diagnostic protocol recorded"}
              </div>
            </div>

            {/* Treatments */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <h3 className="font-semibold text-gray-900">Treatment Plan</h3>
                {loadingTreatments && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Loading treatments...</span>
                  </div>
                )}
                {!loadingTreatments && treatments.length > 0 && (
                  <span className="bg-purple-100 text-purple-800 text-sm px-2 py-1 rounded-full">
                    {treatments.length} treatment{treatments.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <div className="text-red-700 text-sm">
                    <strong>Error loading treatments:</strong> {error}
                  </div>
                </div>
              )}

              {loadingTreatments ? (
                <div className="text-center py-8">
                  <Loader className="w-8 h-8 animate-spin mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-600">Loading treatments...</p>
                </div>
              ) : treatments && treatments.length > 0 ? (
                <div className="space-y-4">
                  {treatments.map((treatment, index) => {
                    const treatmentId = treatment.id || treatment.treatment_id;
                    const outcome = treatment.outcome || treatment.treatment_outcome || 'Ongoing';
                    return (
                      <div key={treatmentId} className="border border-gray-200 rounded-xl p-4 hover:border-purple-200 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                          <h4 className="font-medium text-gray-900">Treatment #{index + 1}</h4>
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getOutcomeColor(outcome)}`}>
                            {getOutcomeIcon(outcome)}
                            {outcome}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Medication</div>
                            <div className="font-medium text-gray-900">
                              {treatment.medication || treatment.treatment_name || "Not specified"}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Dosage</div>
                            <div className="font-medium text-gray-900">
                              {treatment.dosage || treatment.treatment_dosage || "Not specified"}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Duration</div>
                            <div className="font-medium text-gray-900">
                              {treatment.duration || treatment.treatment_duration || "Not specified"}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <Pill className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-600">No treatments prescribed for this visit</p>
                  <p className="text-sm text-gray-500 mt-1">Treatments will appear here when added</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Results & Actions */}
          <div className="space-y-6">
            {/* Lab Results */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Lab Results</h3>
              <div className={`p-4 rounded-xl border ${
                displayRecord.labResult || displayRecord.medrec_lab_results 
                  ? "border-blue-200 bg-blue-50 text-gray-700" 
                  : "border-gray-200 bg-gray-50 text-gray-500"
              }`}>
                {displayRecord.labResult || displayRecord.medrec_lab_results || "No lab results available"}
              </div>
            </div>

            {/* Lab Files - FIXED FILE DISPLAY */}
            <FileDisplaySection />

            {/* Prognosis & Recommendations */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Medical Assessment</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span className="font-medium text-gray-900">Prognosis</span>
                  </div>
                  <div className="text-gray-700 text-sm">
                    {displayRecord.prognosis || displayRecord.medrec_prognosis || "No prognosis recorded"}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <StickyNote className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-gray-900">Recommendations</span>
                  </div>
                  <div className="text-gray-700 text-sm">
                    {displayRecord.recommendation || displayRecord.medrec_recommendation || "No recommendations provided"}
                  </div>
                </div>
              </div>
            </div>

            {/* Follow-up */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Clock3 className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Follow-up</h3>
              </div>
              
              {displayRecord.followUpDate || displayRecord.medrec_followup_date ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Next Appointment</span>
                      <span className="font-medium">
                        {new Date(displayRecord.followUpDate || displayRecord.medrec_followup_date).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {/* 🆕 ADD FOLLOW-UP TIME DISPLAY HERE */}
                    {displayRecord.followUpTime && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Scheduled Time</span>
                        <span className="font-medium text-blue-700">
                          {displayRecord.followUpTime}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* FIXED: Only show button when today is on or after follow-up date AND no follow-up exists */}
                  {checkingFollowUp ? (
                    <div className="text-center py-3 bg-gray-50 rounded-lg border border-gray-200">
                      <Loader className="w-5 h-5 mx-auto mb-1 text-gray-600 animate-spin" />
                      <p className="text-sm font-medium text-gray-800">Checking follow-up status...</p>
                    </div>
                  ) : shouldShowFollowUpButton ? (
                    <Button 
                      onClick={handleStartFollowUp}
                      className="cursor-pointer w-full flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Plus className="w-4 h-4 text-white" />
                      <span className="text-white">Record Follow-up</span>
                    </Button>
                  ) : followUpExists ? (
                    <div className="text-center py-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <CheckCircle className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                      <p className="text-sm font-medium text-emerald-800">Follow-up Record Saved</p>
                      {/* 🆕 ADD DATE AND TIME DISPLAY HERE */}
                      {displayRecord.created_at && (
                        <p className="text-xs text-emerald-600 mt-1">
                          at {new Date(displayRecord.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-center py-3 text-amber-600 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-xs text-amber-500 mt-1">
                          You can record follow-up only on or after the appointment date
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No follow-up scheduled</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Follow-up Form Modal */}
      {isFollowUpMode && renderFollowUpForm()}

      {/* Confirmation Modal */}
      {showConfirmation && <ConfirmationModal />}

      {/* Full-Screen File Viewer - NOW THIS WILL WORK */}
      <FileViewer />
    </div>
  );
};

export default MedicalRecordDetails;