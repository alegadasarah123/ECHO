import React, { useState, useEffect } from 'react';
import { Save, X, Clock, CheckCircle, AlertCircle, Edit, Eye } from 'lucide-react';

const ScheduleModal = ({ isOpen, onClose, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [existingSchedules, setExistingSchedules] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const daysOfWeek = [
    { id: 'Monday', label: 'Monday', order: 1 },
    { id: 'Tuesday', label: 'Tuesday', order: 2 },
    { id: 'Wednesday', label: 'Wednesday', order: 3 },
    { id: 'Thursday', label: 'Thursday', order: 4 },
    { id: 'Friday', label: 'Friday', order: 5 },
    { id: 'Saturday', label: 'Saturday', order: 6 },
    { id: 'Sunday', label: 'Sunday', order: 7 }
  ];

  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const durationOptions = [
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' }
  ];

  // Generate hour options (1-12)
  const hourOptions = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: (i + 1).toString()
  }));

  // Generate minute options (00, 15, 30, 45)
  const minuteOptions = [
    { value: '00', label: '00' },
    { value: '15', label: '15' },
    { value: '30', label: '30' },
    { value: '45', label: '45' }
  ];
  
  const [schedule, setSchedule] = useState({
    days: [],
    startHour: '9',
    startMinute: '00',
    startPeriod: 'AM',
    endHour: '5',
    endMinute: '00',
    endPeriod: 'PM',
    duration: 60
  });

  // Helper function to get day order
  const getDayOrder = (day) => {
    const dayMap = {
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6,
      'Sunday': 7
    };
    return dayMap[day] || 0;
  };

  // Sort days array in Monday-Sunday order
  const sortDaysInOrder = (days) => {
    return [...days].sort((a, b) => getDayOrder(a) - getDayOrder(b));
  };

  // Fetch existing schedules when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchExistingSchedules();
      setIsEditing(false); // Reset to read-only when opening
    }
  }, [isOpen]);

  // Convert time from backend format to frontend format
  const convertFromAMPM = (timeStr) => {
    console.log("🕒 Converting from AMPM:", timeStr);
    
    if (!timeStr) {
      console.log("❌ Empty time string");
      return { hour: '9', minute: '00', period: 'AM' };
    }
    
    try {
      let hour, minute, period;

      // Handle multiple possible formats
      if (timeStr.includes(':')) {
        const parts = timeStr.split(' ');
        let timePart = parts[0];
        
        // Check if period is in the second part
        period = parts[1] || '';
        
        // Handle case where period might be attached to time (like "9:00AM")
        if (!period && (timePart.toUpperCase().includes('AM') || timePart.toUpperCase().includes('PM'))) {
          period = timePart.toUpperCase().includes('AM') ? 'AM' : 'PM';
          timePart = timePart.replace(/AM|PM/gi, '').trim();
        }
        
        const timeComponents = timePart.split(':');
        hour = timeComponents[0];
        minute = timeComponents[1] || '00';
        
        // Remove leading zero from hour
        hour = hour.replace(/^0/, '') || '9';
        
        // If no period detected, determine from hour
        if (!period) {
          const hourNum = parseInt(hour);
          period = hourNum < 12 ? 'AM' : 'PM';
        }
      } else {
        // Fallback for unexpected formats
        console.log("❌ Unexpected time format:", timeStr);
        return { hour: '9', minute: '00', period: 'AM' };
      }
      
      console.log("🕒 Successfully parsed:", { hour, minute, period });
      return { hour, minute, period };
      
    } catch (error) {
      console.error("❌ Error converting time:", timeStr, error);
      return { hour: '9', minute: '00', period: 'AM' };
    }
  };

  const fetchExistingSchedules = async () => {
    try {
      console.log("🔄 Fetching schedules...");
      const response = await fetch("http://localhost:8000/api/veterinarian/get_schedules/", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ API Response:", data);
        setExistingSchedules(data.schedules || []);
        
        if (data.schedules && data.schedules.length > 0) {
          // Sort days in Monday-Sunday order
          const days = sortDaysInOrder(data.schedules.map(s => s.day_of_week));
          const firstSchedule = data.schedules[0];
          
          console.log("📅 First schedule data:", firstSchedule);
          
          const startTime = convertFromAMPM(firstSchedule.startTime);
          const endTime = convertFromAMPM(firstSchedule.endTime);
          
          console.log("🕒 Converted times:", { 
            startTime, 
            endTime 
          });
          
          setSchedule({
            days: days,
            startHour: startTime.hour,
            startMinute: startTime.minute,
            startPeriod: startTime.period,
            endHour: endTime.hour,
            endMinute: endTime.minute,
            endPeriod: endTime.period,
            duration: firstSchedule.slot_duration || 60
          });
        } else {
          // If no schedule exists, start in edit mode
          console.log("📅 No existing schedules found");
          setIsEditing(true);
          setSchedule({
            days: [],
            startHour: '9',
            startMinute: '00',
            startPeriod: 'AM',
            endHour: '5',
            endMinute: '00',
            endPeriod: 'PM',
            duration: 60
          });
        }
      } else {
        console.error("❌ Failed to fetch schedules:", response.status);
        const errorData = await response.json();
        console.error("❌ Error details:", errorData);
      }
    } catch (err) {
      console.error("❌ Network error fetching schedules:", err);
    }
  };

  const toggleDaySelection = (dayId) => {
    if (!isEditing) return;
    
    setSchedule(prev => ({
      ...prev,
      days: sortDaysInOrder(
        prev.days.includes(dayId) 
          ? prev.days.filter(id => id !== dayId)
          : [...prev.days, dayId]
      )
    }));
  };

  const toggleWeekdaysSelection = () => {
    if (!isEditing) return;
    
    const allWeekdaysSelected = weekdays.every(day => schedule.days.includes(day));
    
    if (allWeekdaysSelected) {
      // Remove all weekdays
      setSchedule(prev => ({
        ...prev,
        days: sortDaysInOrder(prev.days.filter(day => !weekdays.includes(day)))
      }));
    } else {
      // Add all weekdays, keep any existing weekend days
      setSchedule(prev => ({
        ...prev,
        days: sortDaysInOrder([...new Set([...prev.days, ...weekdays])])
      }));
    }
  };

  const handleTimeChange = (field, value) => {
    if (!isEditing) return;
    
    setSchedule(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // Re-fetch to reset any changes
    fetchExistingSchedules();
    setIsEditing(false);
  };

  const handleSaveClick = () => {
    if (schedule.days.length === 0) {
      setErrorMessage("Please select at least one working day");
      return;
    }

    // Validate time
    const startMinutes = convertToMinutes(
      `${schedule.startHour}:${schedule.startMinute} ${schedule.startPeriod}`
    );
    const endMinutes = convertToMinutes(
      `${schedule.endHour}:${schedule.endMinute} ${schedule.endPeriod}`
    );

    if (startMinutes >= endMinutes) {
      setErrorMessage("End time must be after start time");
      return;
    }

    setShowConfirmation(true);
    setErrorMessage('');
  };

  const convertToMinutes = (timeStr) => {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return hours * 60 + minutes;
  };

  const handleSave = async () => {
    setShowConfirmation(false);
    setLoading(true);

    try {
      const payload = {
        schedules: schedule.days.map(day => ({
          day_of_week: day,
          startTime: `${schedule.startHour}:${schedule.startMinute} ${schedule.startPeriod}`,
          endTime: `${schedule.endHour}:${schedule.endMinute} ${schedule.endPeriod}`,
          slot_duration: schedule.duration
        }))
      };

      console.log("💾 Saving schedule with payload:", payload);

      const response = await fetch("http://localhost:8000/api/veterinarian/add_schedule/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Schedule saved successfully!');
        setShowSuccessAlert(true);
        
        if (onSave) onSave(data.schedules);
        await fetchExistingSchedules();
        setIsEditing(false); // Go back to read-only mode after saving
        
        setTimeout(() => {
          setShowSuccessAlert(false);
        }, 2000);
      } else {
        setErrorMessage(data.error || "Failed to save schedule");
        console.error("❌ Save failed:", data);
      }
    } catch (err) {
      console.error("❌ Error saving schedule", err);
      setErrorMessage("Error saving schedule");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Success Alert */}
      {showSuccessAlert && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-2000 animate-fade-in-down">
          <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-xl shadow-lg flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span>{successMessage}</span>
            <button 
              onClick={() => setShowSuccessAlert(false)}
              className="ml-4 text-green-700 hover:text-green-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="fixed inset-0 z-1000 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden border border-gray-200 flex flex-col" style={{ maxHeight: '85vh' }}>
          {/* Header */}
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">
                  {existingSchedules.length > 0 ? 'Schedule' : 'Set Schedule'}
                </h3>
                <p className="text-sm text-gray-600 mt-2">
                  {isEditing ? 'Edit your working days, hours, and appointment duration' : 'View your current schedule'}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {existingSchedules.length > 0 && !isEditing && (
                  <button
                    onClick={handleEditClick}
                    className="cursor-pointer px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all flex items-center"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Schedule
                  </button>
                )}
                <button
                  onClick={handleCancel}
                  className="cursor-pointer p-2 text-gray-400 hover:text-gray-600 transition-colors hover:bg-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-50 p-4 border-b border-red-200 flex items-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
              <p className="text-red-700 text-sm font-medium">{errorMessage}</p>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Days Selection */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <div className="w-2 h-6 bg-green-500 rounded-full mr-3"></div>
                    Working Days
                  </h4>
                  
                  {/* Weekdays Checkbox */}
                  {isEditing && (
                    <div className="mb-4">
                      <label className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={weekdays.every(day => schedule.days.includes(day))}
                          onChange={toggleWeekdaysSelection}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="font-semibold text-blue-800">Select All Weekdays (Mon-Fri)</span>
                      </label>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {daysOfWeek.map(day => (
                      <button
                        key={day.id}
                        onClick={() => toggleDaySelection(day.id)}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          schedule.days.includes(day.id)
                            ? isEditing 
                              ? 'bg-green-500 text-white border-green-600 shadow-lg cursor-pointer'
                              : 'bg-green-100 text-green-800 border-green-300 cursor-default'
                            : isEditing
                            ? 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 cursor-pointer'
                            : 'bg-gray-50 border-gray-200 text-gray-400 cursor-default'
                        } ${isEditing ? 'hover:scale-105' : ''}`}
                        disabled={!isEditing}
                      >
                        <div className="font-semibold text-center">{day.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Current Schedule Display */}
                {existingSchedules.length > 0 && !isEditing && (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <h5 className="font-semibold text-blue-800 mb-2 flex items-center">
                      <Eye className="w-4 h-4 mr-2" />
                      Current Schedule
                    </h5>
                    <p className="text-sm text-blue-700">
                      <strong>Days:</strong> {schedule.days.join(', ')}
                    </p>
                    <p className="text-sm text-blue-700">
                      <strong>Time:</strong> {schedule.startHour}:{schedule.startMinute} {schedule.startPeriod} - {schedule.endHour}:{schedule.endMinute} {schedule.endPeriod}
                    </p>
                    <p className="text-sm text-blue-700">
                      <strong>Appointment Duration:</strong> {schedule.duration === 60 ? '1 hour' : schedule.duration === 90 ? '1.5 hours' : '2 hours'}
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column - Time & Duration */}
              <div className="space-y-6">
                {/* Working Hours */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <Clock className="w-5 h-5 mr-3 text-green-500" />
                    Working Hours
                  </h4>
                  
                  <div className="space-y-4">
                    {/* Start Time */}
                    <div className={`p-4 rounded-xl border ${isEditing ? 'bg-gray-50 border-gray-200' : 'bg-gray-100 border-gray-300'}`}>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">Start Time</label>
                      <div className="flex gap-3 items-center justify-center">
                        <select
                          value={schedule.startHour}
                          onChange={(e) => handleTimeChange('startHour', e.target.value)}
                          className={`w-20 px-3 py-3 border rounded-lg text-center text-lg font-semibold ${
                            isEditing ? 'border-gray-300 bg-white cursor-pointer' : 'border-gray-200 bg-gray-50 text-gray-600 cursor-default'
                          }`}
                          disabled={!isEditing}
                        >
                          {hourOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <span className="text-gray-600 text-xl font-bold">:</span>
                        <select
                          value={schedule.startMinute}
                          onChange={(e) => handleTimeChange('startMinute', e.target.value)}
                          className={`w-20 px-3 py-3 border rounded-lg text-center text-lg font-semibold ${
                            isEditing ? 'border-gray-300 bg-white cursor-pointer' : 'border-gray-200 bg-gray-50 text-gray-600 cursor-default'
                          }`}
                          disabled={!isEditing}
                        >
                          {minuteOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={schedule.startPeriod}
                          onChange={(e) => handleTimeChange('startPeriod', e.target.value)}
                          className={`px-4 py-3 border rounded-lg text-lg font-semibold ${
                            isEditing ? 'border-gray-300 bg-white cursor-pointer' : 'border-gray-200 bg-gray-50 text-gray-600 cursor-default'
                          }`}
                          disabled={!isEditing}
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </div>

                    {/* End Time */}
                    <div className={`p-4 rounded-xl border ${isEditing ? 'bg-gray-50 border-gray-200' : 'bg-gray-100 border-gray-300'}`}>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">End Time</label>
                      <div className="flex gap-3 items-center justify-center">
                        <select
                          value={schedule.endHour}
                          onChange={(e) => handleTimeChange('endHour', e.target.value)}
                          className={`w-20 px-3 py-3 border rounded-lg text-center text-lg font-semibold ${
                            isEditing ? 'border-gray-300 bg-white cursor-pointer' : 'border-gray-200 bg-gray-50 text-gray-600 cursor-default'
                          }`}
                          disabled={!isEditing}
                        >
                          {hourOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <span className="text-gray-600 text-xl font-bold">:</span>
                        <select
                          value={schedule.endMinute}
                          onChange={(e) => handleTimeChange('endMinute', e.target.value)}
                          className={`w-20 px-3 py-3 border rounded-lg text-center text-lg font-semibold ${
                            isEditing ? 'border-gray-300 bg-white cursor-pointer' : 'border-gray-200 bg-gray-50 text-gray-600 cursor-default'
                          }`}
                          disabled={!isEditing}
                        >
                          {minuteOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={schedule.endPeriod}
                          onChange={(e) => handleTimeChange('endPeriod', e.target.value)}
                          className={`px-4 py-3 border rounded-lg text-lg font-semibold ${
                            isEditing ? 'border-gray-300 bg-white cursor-pointer' : 'border-gray-200 bg-gray-50 text-gray-600 cursor-default'
                          }`}
                          disabled={!isEditing}
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Appointment Duration */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <div className="w-2 h-6 bg-purple-500 rounded-full mr-3"></div>
                    Appointment Duration
                  </h4>
                  <div className={`p-4 rounded-xl border ${isEditing ? 'bg-purple-50 border-purple-200' : 'bg-purple-100 border-purple-300'}`}>
                    <select
                      value={schedule.duration}
                      onChange={(e) => handleTimeChange('duration', parseInt(e.target.value))}
                      className={`w-full px-4 py-3 border rounded-lg text-lg font-semibold ${
                        isEditing ? 'border-purple-300 bg-white cursor-pointer' : 'border-purple-200 bg-purple-50 text-gray-600 cursor-default'
                      }`}
                      disabled={!isEditing}
                    >
                      {durationOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-sm text-purple-600 mt-2 text-center">
                      Each appointment will be {schedule.duration === 60 ? '1 hour' : schedule.duration === 90 ? '1.5 hours' : '2 hours'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 flex justify-between items-center bg-gray-50 flex-shrink-0">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="cursor-pointer px-6 py-3 text-gray-700 hover:text-gray-900 font-semibold rounded-lg transition-colors border border-gray-300 hover:border-gray-400 bg-white shadow-sm text-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveClick}
                  disabled={loading || schedule.days.length === 0}
                  className="cursor-pointer px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg shadow-lg transition-all disabled:cursor-not-allowed flex items-center text-lg"
                >
                  {loading ? "Saving..." : (<><Save className="w-5 h-5 mr-2" /> Save Schedule</>)}
                </button>
              </>
            ) : (
              <div className="w-full flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {existingSchedules.length > 0 
                    ? "Viewing current schedule. Click 'Edit Schedule' to make changes."
                    : "No schedule set yet. Please set your schedule."
                  }
                </div>
                <button
                  onClick={handleCancel}
                  className="cursor-pointer px-6 py-3 text-gray-700 hover:text-gray-900 font-semibold rounded-lg transition-colors border border-gray-300 hover:border-gray-400 bg-white shadow-sm text-lg"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-1000 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-orange-50">
              <div className="flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-yellow-600 mr-3" />
                <h3 className="text-xl font-bold text-gray-800">
                  Update Schedule
                </h3>
              </div>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-4 text-center text-lg">
                This will update your schedule.
              </p>
              
              <div className="bg-green-50 p-4 rounded-xl border border-green-200 mb-4">
                <p className="text-sm text-green-700 font-semibold text-center mb-2">
                  {schedule.days.length} day(s): {schedule.days.join(', ')}
                </p>
                <p className="text-sm text-green-700 text-center">
                  Time: {schedule.startHour}:{schedule.startMinute} {schedule.startPeriod} - {schedule.endHour}:{schedule.endMinute} {schedule.endPeriod}
                </p>
                <p className="text-sm text-green-700 text-center font-semibold mt-2">
                  Appointment Duration: {schedule.duration === 60 ? '1 hour' : schedule.duration === 90 ? '1.5 hours' : '2 hours'}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-center space-x-4 bg-gray-50">
              <button
                onClick={() => setShowConfirmation(false)}
                className="cursor-pointer px-6 py-2 text-gray-700 hover:text-gray-900 font-semibold rounded-lg transition-colors border border-gray-300 hover:border-gray-400 bg-white shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="cursor-pointer px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-md transition-all flex items-center"
              >
                <Save className="w-4 h-4 mr-2" /> Update Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ScheduleModal;