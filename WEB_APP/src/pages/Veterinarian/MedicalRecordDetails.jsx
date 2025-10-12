import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Activity, ClipboardList, FileText, Heart, StickyNote, TrendingUp, X, Plus, CheckCircle, Clock, Pill, Syringe, Clock3, Thermometer, User, MapPin, Loader, Edit, Save, Upload, File, Image, Trash2, Eye, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";

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

  // FIXED: Check if today is the follow-up date
  const canRecordFollowUp = () => {
    const followUpDate = record.followUpDate || record.medrec_followup_date;
    if (!followUpDate) return false;
    
    const today = new Date();
    const followUp = new Date(followUpDate);
    
    // Reset both dates to midnight to compare only dates
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const followUpMidnight = new Date(followUp.getFullYear(), followUp.getMonth(), followUp.getDate());
    
    // Return true only if today is exactly the follow-up date
    return todayMidnight.getTime() === followUpMidnight.getTime();
  };

  // ========== FIXED FULL-SCREEN FILE VIEWER - MOVED TO TOP ==========
  const FileViewer = () => {
    const currentFile = getCurrentFile();
    const allFiles = getAllViewableFiles();

    if (!fileViewerOpen || !currentFile) return null;

    // FIXED: Use the improved file type detection
    const fileInfo = getFileInfo(currentFile.url, currentFile.name);
    const isPDF = fileInfo.type === 'pdf';
    const isImage = fileInfo.type === 'image';

    return (
      <div className="fixed inset-0 bg-black z-[70] flex flex-col">
        {/* Header */}
        <div className="bg-black border-b border-gray-800 p-4 flex-shrink-0 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {isPDF ? (
              <FileText className="w-5 h-5 text-red-500" />
            ) : isImage ? (
              <Image className="w-5 h-5 text-blue-500" />
            ) : (
              <File className="w-5 h-5 text-gray-500" />
            )}
            <div>
              <h3 className="font-semibold text-white">{fileInfo.name}</h3>
              <p className="text-sm text-gray-400">
                {currentFile.fileObject && formatFileSize(currentFile.fileObject.size)}
                {allFiles.length > 1 && ` • File ${currentFileIndex + 1} of ${allFiles.length}`}
                {` • Type: ${fileInfo.type}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* File Navigation */}
            {allFiles.length > 1 && (
              <div className="flex items-center gap-1 mr-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={prevFile}
                  className="cursor-pointer h-8 w-8 p-0 text-white hover:bg-gray-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium text-gray-300 min-w-[60px] text-center">
                  {currentFileIndex + 1} / {allFiles.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={nextFile}
                  className="cursor-pointer h-8 w-8 p-0 text-white hover:bg-gray-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Image Controls */}
            {isImage && (
              <div className="flex items-center gap-1 border-r border-gray-700 pr-2 mr-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 0.5}
                  className="cursor-pointer h-8 w-8 p-0 text-white hover:bg-gray-800"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium text-white w-12 text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 3}
                  className="cursor-pointer h-8 w-8 p-0 text-white hover:bg-gray-800"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRotate}
                  className="cursor-pointer h-8 w-8 p-0 text-white hover:bg-gray-800"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetTransform}
                  className="cursor-pointer h-8 w-8 p-0 text-white hover:bg-gray-800"
                >
                  Reset
                </Button>
              </div>
            )}

            <Button
              variant="ghost"
              onClick={closeFileViewer}
              className="cursor-pointer h-8 w-8 p-0 text-white hover:bg-gray-800"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* File Content - Full Screen */}
        <div className="flex-1 bg-black flex items-center justify-center overflow-hidden">
          {isPDF ? (
            <div className="w-full h-full">
              <iframe
                src={currentFile.url}
                className="w-full h-full border-0"
                title={currentFile.name}
                style={{ 
                  minHeight: '100vh',
                  backgroundColor: 'white'
                }}
              />
            </div>
          ) : isImage ? (
            <div className="w-full h-full flex items-center justify-center overflow-auto">
              <div 
                className="flex items-center justify-center"
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-in-out'
                }}
              >
                <img
                  src={currentFile.url}
                  alt={currentFile.name}
                  className="max-w-none select-none"
                  style={{
                    width: 'auto',
                    height: 'auto',
                    maxWidth: '90vw',
                    maxHeight: '90vh'
                  }}
                  onError={(e) => {
                    console.error('Failed to load image:', currentFile.url);
                    e.target.src = currentFile.url;
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="text-center text-white p-8">
              <File className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg mb-2">Unsupported file type</p>
              <p className="text-sm text-gray-400 mb-1">File: {currentFile.name}</p>
              <p className="text-sm text-gray-400 mb-1">Type: {fileInfo.type}</p>
              <p className="text-sm text-gray-400">URL: {currentFile.url}</p>
              <div className="mt-4">
                <Button
                  onClick={() => window.open(currentFile.url, '_blank')}
                  variant="outline"
                  className="cursor-pointer text-white border-white hover:bg-white hover:text-black"
                >
                  Open in New Tab
                </Button>
              </div>
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
    } catch (err) {
      console.error("Error fetching schedules:", err);
      setError("Failed to load schedules");
    } finally {
      setLoadingSchedules(false);
    }
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

  // Time slots for custom schedule
  const timeSlots = [
    "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
    "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM",
    "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
    "05:00 PM", "05:30 PM", "06:00 PM"
  ];

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
            initialOutcomes[treatmentId] = treatment.outcome || treatment.treatment_outcome || 'ongoing';
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
      case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'discontinued': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'ongoing': 
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getOutcomeIcon = (outcome) => {
    switch (outcome?.toLowerCase()) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'discontinued': return <X className="w-4 h-4" />;
      case 'cancelled': return <X className="w-4 h-4" />;
      case 'ongoing': 
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

  // FIXED: Get all existing files from database (handles arrays from backend)
  const getAllExistingFiles = () => {
    const files = [];
    
    // Get the lab files data - could be string (old) or array (new)
    const labFilesData = displayRecord.labImages || displayRecord.labImage;
    const labFileNames = displayRecord.labFileName || "Lab Result File";
    
    console.log("📁 Raw lab files data:", labFilesData);
    console.log("📁 Raw lab file names:", labFileNames);
    
    if (!labFilesData) return files;
    
    // Handle array of files (NEW FORMAT from backend - labImages)
    if (Array.isArray(labFilesData)) {
      console.log("✅ Detected array of files from backend");
      labFilesData.forEach((fileUrl, index) => {
        if (fileUrl && fileUrl.trim() !== '') {
          const fileName = Array.isArray(labFileNames) 
            ? (labFileNames[index] || `Lab File ${index + 1}`)
            : (index === 0 ? labFileNames : `Lab File ${index + 1}`);
            
          const fileInfo = getFileInfo(fileUrl, fileName);
          
          if (fileInfo.url && fileInfo.url.trim() !== '') {
            files.push({
              url: fileInfo.url,
              name: fileInfo.name,
              type: fileInfo.type,
              isExisting: true,
              index: index
            });
          }
        }
      });
    } 
    // Handle single file (string) - backward compatibility (labImage)
    else if (labFilesData && labFilesData.trim() !== '') {
      console.log("✅ Detected single file from backend");
      const fileInfo = getFileInfo(labFilesData, labFileNames);
      
      if (fileInfo.url && fileInfo.url.trim() !== '') {
        files.push({
          url: fileInfo.url,
          name: fileInfo.name,
          type: fileInfo.type,
          isExisting: true,
          index: 0
        });
      }
    }
    
    console.log("📁 Processed existing files:", files);
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
    
    // Add existing files from database
    const existingFiles = getAllExistingFiles();
    files.push(...existingFiles);
    
    // Add uploaded files
    labFiles.forEach(file => {
      const fileInfo = getFileInfo(URL.createObjectURL(file), file.name);
      files.push({
        url: URL.createObjectURL(file),
        name: file.name,
        type: fileInfo.type,
        fileObject: file,
        isExisting: false
      });
    });

    console.log("📁 All viewable files:", files);
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
      outcome: "ongoing"
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

  // ========== UPDATED CONFIRMATION MODAL WITH LOADING STATE ==========
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

          <div className="flex gap-3 mt-6">
            <Button 
              onClick={() => setShowConfirmation(false)} 
              variant="outline" 
              className="cursor-pointer flex-1"
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveFollowUp}
              className="cursor-pointer flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin text-white" />
                  <span className="text-white">Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-white" />
                  <span className="text-white">Save Medical Record</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // FIXED: File Display Section that handles both old and new data formats
  const FileDisplaySection = () => {
    // FIXED: Only show existing files when NOT in follow-up mode
    const allFiles = isFollowUpMode 
      ? [] // EMPTY in follow-up mode - no redundant display
      : getAllExistingFiles();

    const hasFiles = allFiles.length > 0;

    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Lab Files</h3>
          {hasFiles && (
            <span className="text-sm text-gray-500">
              {allFiles.length} file{allFiles.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        {hasFiles ? (
          <div className="space-y-4">
            {/* Files Display */}
            {allFiles.map((file, index) => {
              const fileInfo = getFileInfo(file.url, file.name);
              return (
                <div key={`existing-${file.index}`} 
                     className="border border-gray-200 rounded-xl p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {fileInfo.type === 'pdf' ? (
                        <FileText className="w-8 h-8 text-red-500" />
                      ) : fileInfo.type === 'image' ? (
                        <Image className="w-8 h-8 text-blue-500" />
                      ) : (
                        <File className="w-8 h-8 text-gray-500" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{fileInfo.name}</p>
                        <p className="text-sm text-gray-600">
                          {fileInfo.type === 'pdf' ? 'PDF Document' : 
                           fileInfo.type === 'image' ? 'Image File' : 
                           'File'}
                          {!isFollowUpMode && ' • Existing File'}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        // In normal view, show all existing files
                        const existingFiles = getAllExistingFiles();
                        openFileViewer(existingFiles, index);
                      }}
                      variant="outline"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      View File
                    </Button>
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

  // ========== COPIED FOLLOW-UP SCHEDULE SECTION ==========
  const FollowUpScheduleSection = () => {
    const availableSchedules = schedules.filter(s => s.available && !s.pending);

    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock3 className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Next Follow-up Schedule (Optional)</h3>
        </div>

        {/* Schedule Selection Toggle */}
        <div className="flex gap-4 mb-4">
          <Button
            type="button"
            onClick={() => handleToggleCustomSchedule(false)}
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
            onClick={() => handleToggleCustomSchedule(true)}
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
          /* Existing Schedules with Card Design and Cancel Option */
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={fetchSchedules}
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
              {selectedScheduleId && (
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
                    isSelected={selectedScheduleId === schedule.id}
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
          /* Custom Schedule Creation with Time Range */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Follow-up Date (Optional)
                </label>
                <input
                  type="date"
                  value={followUpData.followUpDate || ""}
                  onChange={(e) => handleFollowUpInputChange('followUpDate', e.target.value)}
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
                  <select
                    value={followUpData.followUpStartTime || ""}
                    onChange={(e) => handleFollowUpInputChange('followUpStartTime', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg p-3 text-sm"
                  >
                    <option value="">Start time</option>
                    {timeSlots.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                  
                  {/* Separator */}
                  <div className="flex items-center justify-center text-gray-500 font-medium">
                    to
                  </div>
                  
                  {/* End Time */}
                  <select
                    value={followUpData.followUpEndTime || ""}
                    onChange={(e) => handleFollowUpInputChange('followUpEndTime', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg p-3 text-sm"
                  >
                    <option value="">End time</option>
                    {timeSlots.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {/* Duration Display */}
            {followUpData.followUpStartTime && followUpData.followUpEndTime && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700 font-medium">
                  Duration: {calculateDuration(followUpData.followUpStartTime, followUpData.followUpEndTime)}
                </p>
              </div>
            )}
            
            <p className="text-xs text-gray-500">
              A new schedule will be created for this follow-up appointment and automatically marked as unavailable
            </p>
          </div>
        )}
      </div>
    );
  };

  // ========== UPDATED FOLLOW-UP FORM WITH SCHEDULE SUPPORT ==========
  const renderFollowUpForm = () => {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
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
                              value={editingTreatmentOutcomes[treatmentId] || 'ongoing'}
                              onChange={(e) => handleTreatmentOutcomeChange(treatmentId, e.target.value)}
                              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            >
                              <option value="ongoing">Ongoing</option>
                              <option value="completed">Completed</option>
                              <option value="discontinued">Discontinued</option>
                              <option value="cancelled">Cancelled</option>
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
                    <option value="Unhealthy">Unhealthy</option>
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

              {/* ========== MOVED: Follow-up Schedule Section AFTER Recommendations ========== */}
              <FollowUpScheduleSection />

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

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button
                  onClick={handleCancelFollowUp}
                  variant="outline"
                  className="cursor-pointer flex-1 border border-gray-300 text-gray-600 hover:bg-red-50 hover:border-red-400 hover:text-red-600 active:scale-95 transition-all duration-200 ease-in-out rounded-lg py-2 font-medium"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveConfirmation}
                  className="cursor-pointer flex-1 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Save className="w-4 h-4 text-white" />
                  <span className="text-white">Save Medical Record</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // FIXED: Calculate if we should show the button - only show when today is follow-up date
  const shouldShowFollowUpButton = canRecordFollowUp();

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
                    const outcome = treatment.outcome || treatment.treatment_outcome || 'ongoing';
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
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Next Appointment</span>
                    <span className="font-medium">
                      {new Date(displayRecord.followUpDate || displayRecord.medrec_followup_date).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {/* FIXED: Only show button when today is follow-up date */}
                  {shouldShowFollowUpButton ? (
                    <Button 
                      onClick={handleStartFollowUp}
                      className="cursor-pointer w-full flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Plus className="w-4 h-4 text-white" />
                      <span className="text-white">Record Follow-up</span>
                    </Button>
                  ) : (
                    <div className="text-center py-3 text-amber-600 bg-amber-50 rounded-lg border border-amber-200">
                      <Clock className="w-5 h-5 mx-auto mb-1" />
                      <p className="text-sm font-medium">
                        Follow-up scheduled for {new Date(displayRecord.followUpDate || displayRecord.medrec_followup_date).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-amber-500 mt-1">
                        You can record follow-up only on the appointment date
                      </p>
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