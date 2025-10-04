import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, X, ChevronLeft, ChevronRight, AlertCircle, Trash2, Save, Settings, CheckSquare, Square, CheckCircle } from 'lucide-react';

const ScheduleModal = ({ isOpen, onClose, onSave }) => {
  const [modalCurrentDate, setModalCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [existingSchedules, setExistingSchedules] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedDateSlots, setSelectedDateSlots] = useState({});
  const [activeTab, setActiveTab] = useState('calendar');
  const [quickDates, setQuickDates] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [dailyDuration, setDailyDuration] = useState({
    startHour: '9',
    startMinute: '00',
    startPeriod: 'AM',
    endHour: '5',
    endMinute: '00',
    endPeriod: 'PM'
  });
  const [slotInterval, setSlotInterval] = useState(60); // minutes
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const minuteOptions = ['00', '15', '30', '45'];
  const intervalOptions = [
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' }
  ];

  // Generate time slots based on daily duration and interval
  const generateTimeSlots = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const startTime = convertTo24hFormat(
      `${dailyDuration.startHour}:${dailyDuration.startMinute} ${dailyDuration.startPeriod}`
    );
    const endTime = convertTo24hFormat(
      `${dailyDuration.endHour}:${dailyDuration.endMinute} ${dailyDuration.endPeriod}`
    );
    
    const slots = [];
    let currentTime = startTime;
    
    while (currentTime < endTime) {
      const nextTime = Math.min(currentTime + slotInterval, endTime);
      
      // Convert back to 12h format for display
      const startFormatted = convertTo12hFormat(currentTime);
      const endFormatted = convertTo12hFormat(nextTime);
      
      // Check if this slot is in the past (for today only)
      const isPast = isToday && (now.getHours() * 60 + now.getMinutes()) > currentTime;
      
      if (!isPast) {
        slots.push({
          id: `${dateStr}-${currentTime}`,
          startTime: currentTime,
          endTime: nextTime,
          startFormatted,
          endFormatted,
          selected: selectedDateSlots[dateStr]?.some(s => s.startTime === currentTime && s.endTime === nextTime)
        });
      }
      
      currentTime = nextTime;
    }
    
    return slots;
  };

  // Helper function to convert time to 24h format (minutes since midnight)
  const convertTo24hFormat = (timeStr) => {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return hours * 60 + minutes;
  };

  // Helper function to convert minutes since midnight to 12h format
  const convertTo12hFormat = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
  };

  // Fetch existing schedules when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchExistingSchedules();
      setSelectedDateSlots({});
      setErrorMessage('');
    }
  }, [isOpen]);

  // Remove past dates from existing schedules
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const filteredSchedules = existingSchedules.filter(schedule => {
      const scheduleDate = new Date(schedule.date);
      scheduleDate.setHours(0, 0, 0, 0);
      return scheduleDate >= today;
    });
    
    if (filteredSchedules.length !== existingSchedules.length) {
      setExistingSchedules(filteredSchedules);
    }
  }, [existingSchedules]);

  // Helper functions for predefined date ranges
  function getDateRange(startOffset, endOffset) {
    const dates = [];
    const today = new Date();
    
    for (let i = startOffset; i <= endOffset; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      if (!isPastDate(date.getDate(), date.getMonth(), date.getFullYear())) {
        dates.push(formatDateToYYYYMMDD(date));
      }
    }
    
    return dates;
  }

  function getThisWeekend() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const dates = [];
    
    const daysUntilSaturday = dayOfWeek <= 6 ? (6 - dayOfWeek) : (6 + 7 - dayOfWeek);
    const daysUntilSunday = daysUntilSaturday + 1;
    
    const saturday = new Date(today);
    saturday.setDate(today.getDate() + daysUntilSaturday);
    
    const sunday = new Date(today);
    sunday.setDate(today.getDate() + daysUntilSunday);
    
    if (!isPastDate(saturday.getDate(), saturday.getMonth(), saturday.getFullYear())) {
      dates.push(formatDateToYYYYMMDD(saturday));
    }
    
    if (!isPastDate(sunday.getDate(), sunday.getMonth(), sunday.getFullYear())) {
      dates.push(formatDateToYYYYMMDD(sunday));
    }
    
    return dates;
  }

  function getNextWeek() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    
    return getDateRange(daysUntilNextMonday, daysUntilNextMonday + 6);
  }

  function formatDateToYYYYMMDD(date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  }

  const fetchExistingSchedules = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/veterinarian/get_schedules/", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setExistingSchedules(data.schedules || []);
      } else {
        console.error("Failed to fetch existing schedules");
      }
    } catch (err) {
      console.error("Error fetching schedules", err);
    }
  };

  // Format date for display
  const formatDateForDisplay = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Helpers
  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const getMonthName = (date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const navigateModalMonth = (direction) => {
    setModalCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const isModalToday = (day) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      modalCurrentDate.getMonth() === today.getMonth() &&
      modalCurrentDate.getFullYear() === today.getFullYear()
    );
  };

  const isPastDate = (day, month, year) => {
    const today = new Date();
    const checkDate = new Date(
      year || modalCurrentDate.getFullYear(), 
      month !== undefined ? month : modalCurrentDate.getMonth(), 
      day
    );

    today.setHours(0, 0, 0, 0);
    checkDate.setHours(0, 0, 0, 0);

    return checkDate < today;
  };

  const hasExistingSlot = (day) => {
    const dateStr = `${modalCurrentDate.getFullYear()}-${(modalCurrentDate.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    return existingSchedules.some(schedule => schedule.date === dateStr);
  };

  const handleDateSelection = (day) => {
    if (isPastDate(day) || hasExistingSlot(day)) return;

    const dateStr = `${modalCurrentDate.getFullYear()}-${(modalCurrentDate.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

    setSelectedDateSlots(prev => {
      if (prev[dateStr]) {
        const newSlots = { ...prev };
        delete newSlots[dateStr];
        return newSlots;
      } else {
        return {
          ...prev,
          [dateStr]: []
        };
      }
    });
  };

  const handleQuickDateSelection = (dates) => {
    const newSelectedSlots = { ...selectedDateSlots };
    
    dates.forEach(dateStr => {
      if (!isPastDate(
        parseInt(dateStr.split('-')[2]), 
        parseInt(dateStr.split('-')[1]) - 1, 
        parseInt(dateStr.split('-')[0])
      ) && !existingSchedules.some(schedule => schedule.date === dateStr)) {
        if (!newSelectedSlots[dateStr]) {
          newSelectedSlots[dateStr] = [];
        }
      }
    });
    
    setSelectedDateSlots(newSelectedSlots);
    setQuickDates(dates);
  };

  const isDateSelected = (day) => {
    const dateStr = `${modalCurrentDate.getFullYear()}-${(modalCurrentDate.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return !!selectedDateSlots[dateStr];
  };

  const toggleTimeSlot = (dateStr, slot) => {
    setSelectedDateSlots(prev => {
      const currentSlots = prev[dateStr] || [];
      const isSelected = currentSlots.some(s => 
        s.startTime === slot.startTime && s.endTime === slot.endTime
      );
      
      if (isSelected) {
        return {
          ...prev,
          [dateStr]: currentSlots.filter(s => 
            !(s.startTime === slot.startTime && s.endTime === slot.endTime)
          )
        };
      } else {
        return {
          ...prev,
          [dateStr]: [
            ...currentSlots,
            {
              startTime: slot.startTime,
              endTime: slot.endTime,
              startFormatted: slot.startFormatted,
              endFormatted: slot.endFormatted
            }
          ]
        };
      }
    });
  };

  const selectAllSlots = (dateStr) => {
    const slots = generateTimeSlots(dateStr);
    setSelectedDateSlots(prev => ({
      ...prev,
      [dateStr]: slots.map(slot => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        startFormatted: slot.startFormatted,
        endFormatted: slot.endFormatted
      }))
    }));
  };

  const clearAllSlots = (dateStr) => {
    setSelectedDateSlots(prev => {
      const newSlots = { ...prev };
      delete newSlots[dateStr];
      return newSlots;
    });
  };

  const applyToAllSelectedDates = () => {
    const newSelectedSlots = { ...selectedDateSlots };
    const sampleDate = Object.keys(selectedDateSlots)[0];
    
    if (!sampleDate || selectedDateSlots[sampleDate].length === 0) return;
    
    Object.keys(newSelectedSlots).forEach(dateStr => {
      if (dateStr !== sampleDate) {
        newSelectedSlots[dateStr] = [...selectedDateSlots[sampleDate]];
      }
    });
    
    setSelectedDateSlots(newSelectedSlots);
  };

  const clearAllSelections = () => {
    if (Object.keys(selectedDateSlots).length === 0) return;
    
    if (window.confirm("Are you sure you want to clear all selected dates and time slots?")) {
      setSelectedDateSlots({});
      setQuickDates([]);
    }
  };

  const generateModalCalendarDays = () => {
    const days = [];
    const daysInMonth = getDaysInMonth(modalCurrentDate);
    const firstDay = getFirstDayOfMonth(modalCurrentDate);

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    const totalCells = 42;
    const nextMonthDays = totalCells - days.length;
    for (let i = 1; i <= nextMonthDays; i++) {
      days.push(null);
    }

    return days;
  };

  const handleCancel = () => {
    setSelectedDateSlots({});
    setShowConfirmation(false);
    onClose();
  };

  const handleSaveClick = () => {
    if (Object.keys(selectedDateSlots).length === 0) {
      setErrorMessage("Please select at least one date and time slot before saving!");
      return;
    }
    
    // Check if at least one time slot is selected for each date
    for (const [dateStr, slots] of Object.entries(selectedDateSlots)) {
      if (slots.length === 0) {
        setErrorMessage(`Please select at least one time slot for ${formatDateForDisplay(dateStr)}`);
        return;
      }
    }
    
    setShowConfirmation(true);
    setErrorMessage('');
  };

  const handleSave = async () => {
    setShowConfirmation(false);
    setLoading(true);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const validDates = Object.keys(selectedDateSlots).filter(dateStr => {
      const date = new Date(dateStr);
      date.setHours(0, 0, 0, 0);
      return date >= today;
    });

    if (validDates.length === 0) {
      setErrorMessage("All selected dates are in the past. Please select future dates.");
      setLoading(false);
      return;
    }

    const payload = {
      schedules: validDates.flatMap(dateStr => 
        selectedDateSlots[dateStr].map(slot => ({
          date: dateStr,
          startTime: slot.startFormatted,
          endTime: slot.endFormatted,
        }))
      )
    };

    try {
      const response = await fetch("http://localhost:8000/api/veterinarian/add_schedule/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        // Show success alert instead of standard alert
        setSuccessMessage(`${data.schedules.length} time slot(s) saved!`);
        setShowSuccessAlert(true);
        
        if (onSave) onSave(data.schedules);
        setSelectedDateSlots({});
        await fetchExistingSchedules();
        
        // Auto-hide the success alert after 3 seconds
        setTimeout(() => {
          setShowSuccessAlert(false);
          onClose();
        }, 2000);
      } else {
        setErrorMessage(data.error || "Failed to save schedule");
      }
    } catch (err) {
      console.error("Error saving schedule", err);
      setErrorMessage("Error saving schedule");
    } finally {
      setLoading(false);
    }
  };

  const getSelectedDatesCount = () => {
    return Object.keys(selectedDateSlots).length;
  };

  const getSelectedSlotsCount = () => {
    return Object.values(selectedDateSlots).reduce((total, slots) => total + slots.length, 0);
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
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl overflow-hidden border border-gray-200 flex flex-col" style={{ maxHeight: '90vh' }}>
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 flex-shrink-0">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">Add Schedule Availability</h3>
              <p className="text-sm text-gray-600 mt-1">Select dates and time slots for your availability</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="cursor-pointer p-2 text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg transition-colors flex items-center text-sm"
                title="Configure daily availability settings"
              >
                <Settings className="w-4 h-4 mr-1" /> Settings
              </button>
              <button
                onClick={handleCancel}
                className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <h4 className="font-medium text-gray-700 mb-3">Daily Availability Settings</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Daily Start Time</label>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={dailyDuration.startHour}
                      onChange={(e) => setDailyDuration({...dailyDuration, startHour: e.target.value})}
                      className="cursor-pointer px-2 py-2 border border-gray-300 rounded text-sm"
                    >
                      {hourOptions.map((hour) => (
                        <option key={`start-hour-${hour}`} value={hour}>
                          {hour}
                        </option>
                      ))}
                    </select>

                    <select
                      value={dailyDuration.startMinute}
                      onChange={(e) => setDailyDuration({...dailyDuration, startMinute: e.target.value})}
                      className="cursor-pointer px-2 py-2 border border-gray-300 rounded text-sm"
                    >
                      {minuteOptions.map((minute) => (
                        <option key={`start-minute-${minute}`} value={minute}>
                          {minute}
                        </option>
                      ))}
                    </select>

                    <select
                      value={dailyDuration.startPeriod}
                      onChange={(e) => setDailyDuration({...dailyDuration, startPeriod: e.target.value})}
                      className="cursor-pointer px-2 py-2 border border-gray-300 rounded text-sm"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Daily End Time</label>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={dailyDuration.endHour}
                      onChange={(e) => setDailyDuration({...dailyDuration, endHour: e.target.value})}
                      className="cursor-pointer px-2 py-2 border border-gray-300 rounded text-sm"
                    >
                      {hourOptions.map((hour) => (
                        <option key={`end-hour-${hour}`} value={hour}>
                          {hour}
                        </option>
                      ))}
                    </select>

                    <select
                      value={dailyDuration.endMinute}
                      onChange={(e) => setDailyDuration({...dailyDuration, endMinute: e.target.value})}
                      className="cursor-pointer px-2 py-2 border border-gray-300 rounded text-sm"
                    >
                      {minuteOptions.map((minute) => (
                        <option key={`end-minute-${minute}`} value={minute}>
                          {minute}
                        </option>
                      ))}
                    </select>

                    <select
                      value={dailyDuration.endPeriod}
                      onChange={(e) => setDailyDuration({...dailyDuration, endPeriod: e.target.value})}
                      className="cursor-pointer px-2 py-2 border border-gray-300 rounded text-sm"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Time Slot Duration</label>
                <select
                  value={slotInterval}
                  onChange={(e) => setSlotInterval(parseInt(e.target.value))}
                  className="cursor-pointer px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  {intervalOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => setShowSettings(false)}
                  className="cursor-pointer px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors"
                >
                  Close Settings
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-50 p-3 border-b border-red-200 flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700 text-sm">{errorMessage}</p>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 flex flex-shrink-0">
            <button
              className={`px-4 py-2 font-medium text-sm ${activeTab === 'calendar' ? 'text-green-600 border-b-2 border-green-500' : 'text-gray-500 hover:text-gray-700'} cursor-pointer`}
              onClick={() => setActiveTab('calendar')}
            >
              <Calendar className="w-4 h-4 inline mr-1" /> Calendar View
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm ${activeTab === 'dates' ? 'text-green-600 border-b-2 border-green-500' : 'text-gray-500 hover:text-gray-700'} cursor-pointer`}
              onClick={() => setActiveTab('dates')}
            >
              <Clock className="w-4 h-4 inline mr-1" /> Quick Date Selection
            </button>
          </div>

          {/* Main Content */}
          <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-y-auto flex-grow">
            {/* Calendar Section */}
            {activeTab === 'calendar' && (
              <div className="bg-gray-50 p-3 rounded-xl lg:col-span-1">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-700 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Select Dates
                  </h4>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => navigateModalMonth(-1)}
                      className="cursor-pointer p-1.5 hover:bg-white rounded-lg transition-all shadow-sm border border-gray-200"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="cursor-pointer text-sm font-medium px-2 py-1 bg-white rounded-lg shadow-sm border border-gray-200 min-w-[120px] text-center">
                      {getMonthName(modalCurrentDate)}
                    </span>
                    <button
                      onClick={() => navigateModalMonth(1)}
                      className="cursor-pointer p-1.5 hover:bg-white rounded-lg transition-all shadow-sm border border-gray-200"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-2">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
                    <div key={day} className="py-1">{day}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {generateModalCalendarDays().map((day, i) => {
                    if (day === null) {
                      return <div key={i} className="h-7" />;
                    }
                    
                    const isPast = isPastDate(day);
                    const hasSlot = hasExistingSlot(day);
                    const isSelected = isDateSelected(day);
                    const isToday = isModalToday(day);

                    return (
                      <button
                        key={i}
                        onClick={() => !isPast && !hasSlot && handleDateSelection(day)}
                        disabled={isPast || hasSlot}
                        className={`h-7 rounded text-sm flex items-center justify-center transition-all ${
                          isPast
                            ? 'text-gray-300 cursor-not-allowed bg-gray-100'
                            : hasSlot
                            ? 'text-gray-400 cursor-not-allowed bg-blue-100 border border-blue-200'
                            : isSelected
                            ? 'bg-green-500 text-white font-medium shadow-md cursor-pointer'
                            : isToday
                            ? 'bg-green-100 text-green-700 font-medium border border-green-200 cursor-pointer'
                            : 'text-gray-700 hover:bg-gray-100 border border-transparent cursor-pointer'
                        }`}
                        title={
                          hasSlot 
                            ? "Already has a schedule slot" 
                            : isPast 
                            ? "Past date" 
                            : ""
                        }
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex flex-col space-y-2">
                  <div className="flex items-center p-2 bg-white rounded-lg border border-gray-200">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                    <span className="text-xs text-gray-600">
                      {getSelectedDatesCount()} date{getSelectedDatesCount() !== 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <div className="flex items-center p-2 bg-white rounded-lg border border-gray-200">
                    <div className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300 mr-2"></div>
                    <span className="text-xs text-gray-600">
                      Already has schedule
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Date Selection Section */}
            {activeTab === 'dates' && (
              <div className="bg-gray-50 p-3 rounded-xl lg:col-span-1">
                <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Quick Date Selection
                </h4>
                
                <div className="grid grid-cols-1 gap-2 mb-4">
                  {[
                    { id: 'next7days', label: 'Next 7 Days', getDates: () => getDateRange(0, 6) },
                    { id: 'next14days', label: 'Next 14 Days', getDates: () => getDateRange(0, 13) },
                    { id: 'thisWeekend', label: 'This Weekend', getDates: getThisWeekend },
                    { id: 'nextWeek', label: 'Next Week', getDates: getNextWeek },
                  ].map(range => (
                    <button
                      key={range.id}
                      onClick={() => handleQuickDateSelection(range.getDates())}
                      className={`p-2 text-left rounded-lg border transition-colors cursor-pointer ${
                        JSON.stringify(quickDates) === JSON.stringify(range.getDates())
                          ? 'bg-green-100 border-green-300 text-green-700'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
                
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <h5 className="font-medium text-sm text-gray-700 mb-2">Selected Dates:</h5>
                  {quickDates.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto">
                      {quickDates.map(dateStr => (
                        <div 
                          key={dateStr} 
                          className="flex items-center justify-between py-1 border-b border-gray-100 last:border-b-0"
                        >
                          <span className="text-sm">{formatDateForDisplay(dateStr)}</span>
                          {selectedDateSlots[dateStr] && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              {selectedDateSlots[dateStr].length} slots
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-2">Select a date range above</p>
                  )}
                </div>
              </div>
            )}

            {/* Time Selection Section */}
            <div className="bg-gray-50 p-3 rounded-xl lg:col-span-2">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-700 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Select Time Slots
                </h4>
                <div className="flex space-x-2">
                  {Object.keys(selectedDateSlots).length > 0 && (
                    <button
                      onClick={clearAllSelections}
                      className="cursor-pointer text-xs text-red-600 hover:text-red-800 font-medium flex items-center"
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Clear All
                    </button>
                  )}
                  {Object.keys(selectedDateSlots).length > 1 && (
                    <button
                      onClick={applyToAllSelectedDates}
                      className="cursor-pointer text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center"
                      title="Apply the same time slots to all selected dates"
                    >
                      <Save className="w-3 h-3 mr-1" /> Apply to All Dates
                    </button>
                  )}
                </div>
              </div>

              {Object.keys(selectedDateSlots).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Select dates to view available time slots</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {Object.entries(selectedDateSlots).map(([dateStr, slots]) => {
                    const timeSlots = generateTimeSlots(dateStr);
                    const allSelected = timeSlots.length > 0 && timeSlots.every(slot => 
                      slots.some(s => s.startTime === slot.startTime && s.endTime === slot.endTime)
                    );
                    
                    return (
                      <div key={dateStr} className="bg-white p-3 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="font-medium text-gray-800">
                            {formatDateForDisplay(dateStr)}
                          </h5>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => allSelected ? clearAllSlots(dateStr) : selectAllSlots(dateStr)}
                              className="cursor-pointer text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center"
                            >
                              {allSelected ? (
                                <><CheckSquare className="w-3 h-3 mr-1" /> Deselect All</>
                              ) : (
                                <><Square className="w-3 h-3 mr-1" /> Select All</>
                              )}
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          {timeSlots.map(slot => (
                            <button
                              key={slot.id}
                              onClick={() => toggleTimeSlot(dateStr, slot)}
                              className={`p-2 rounded text-sm text-center transition-colors ${
                                slot.selected
                                  ? 'bg-green-100 text-green-800 border border-green-300'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
                              }`}
                            >
                              {slot.startFormatted} - {slot.endFormatted}
                            </button>
                          ))}
                        </div>
                        
                        {timeSlots.length === 0 && (
                          <p className="text-sm text-gray-500 text-center py-4">
                            No available time slots for this date
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50 flex-shrink-0">
            <div className="text-sm text-gray-600">
              {getSelectedDatesCount()} date{getSelectedDatesCount() !== 1 ? 's' : ''} · {getSelectedSlotsCount()} time slot{getSelectedSlotsCount() !== 1 ? 's' : ''}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleCancel}
                className="cursor-pointer px-4 py-2 text-gray-700 hover:text-gray-900 font-medium rounded-lg transition-colors border border-gray-300 hover:border-gray-400 bg-white shadow-sm text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveClick}
                disabled={loading || getSelectedDatesCount() === 0}
                className="cursor-pointer px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-lg shadow-md transition-all disabled:cursor-not-allowed flex items-center text-sm"
              >
                {loading ? "Saving..." : (<><Plus className="w-4 h-4 mr-1" /> Save Schedule</>)}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-1000 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 flex flex-col" style={{ maxHeight: '80vh' }}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-yellow-50 to-orange-50 flex-shrink-0">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                <h3 className="text-xl font-semibold text-gray-800">Confirm Schedule</h3>
              </div>
              <button
                onClick={() => setShowConfirmation(false)}
                className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-grow">
              <p className="text-gray-700 mb-4">
                Are you sure you want to save these schedule slots? This action cannot be undone.
              </p>
              
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2">Selected Time Slots:</h4>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50">
                  {Object.entries(selectedDateSlots).length > 0 ? (
                    Object.entries(selectedDateSlots).map(([dateStr, slots]) => (
                      <div key={dateStr} className="mb-2 last:mb-0">
                        <div className="font-medium text-sm text-gray-800">
                          {formatDateForDisplay(dateStr)}
                        </div>
                        {slots.map((slot, index) => (
                          <div key={index} className="text-xs text-gray-600 ml-2 py-1">
                            {slot.startFormatted} - {slot.endFormatted}
                          </div>
                        ))}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No time slots selected</p>
                  )}
                </div>
              </div>
              
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-700 font-medium">
                  Total: {getSelectedDatesCount()} date{getSelectedDatesCount() !== 1 ? 's' : ''} · {getSelectedSlotsCount()} time slot{getSelectedSlotsCount() !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end space-x-2 bg-gray-50 flex-shrink-0">
              <button
                onClick={() => setShowConfirmation(false)}
                className="cursor-pointer px-4 py-2 text-gray-700 hover:text-gray-900 font-medium rounded-lg transition-colors border border-gray-300 hover:border-gray-400 bg-white shadow-sm text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="cursor-pointer px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-lg shadow-md transition-all flex items-center text-sm"
              >
                <Plus className="w-4 h-4 mr-1" /> Confirm Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ScheduleModal;