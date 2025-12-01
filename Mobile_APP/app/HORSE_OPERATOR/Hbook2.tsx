// HORSE_OPERATOR/Hbook2.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

interface Horse {
  horse_id: string;
  horse_name: string;
  horse_breed: string;
  horse_age: number;
  horse_status: string; // Added status field
}

interface ScheduleSlot {
  sched_id: string;
  slot_id: string;
  vet_id: string;
  sched_date: string;
  start_time: string;
  end_time: string;
  time_display: string;
  is_available: boolean;
}

interface VetService {
  service_id: string;
  service_name: string;
  description: string;
  vet_id: string;
}

interface VetProfile {
  vet_id: string;
  vet_name: string;
  vet_avatar: string;
  vet_specialization: string;
  vet_exp_yr: number;
}

interface Veterinarian {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  specialization?: string;
  avatar?: string;
  vet_type?: string;
  vet_exp_yr?: number;
}

const API_BASE_URL = "http://10.254.39.148:8000/api/horse_operator"

// Default services with icons
const defaultServices = [
  { name: 'General Consultation', icon: 'stethoscope' },
  { name: 'Vaccination', icon: 'syringe' },
  { name: 'Dental Care', icon: 'tooth' },
  { name: 'Emergency Care', icon: 'ambulance' },
  { name: 'Health Check-up', icon: 'heartbeat' },
  { name: 'Medication', icon: 'pills' },
  { name: 'Surgery Consultation', icon: 'cut' },
  { name: 'Reproductive Services', icon: 'baby' }
];

// Utility function to convert 24-hour time to 12-hour format
const formatTimeTo12Hour = (time24: string): string => {
  try {
    if (!time24) return time24;
    
    const timeParts = time24.split(':');
    if (timeParts.length < 2) return time24;
    
    let hours = parseInt(timeParts[0]);
    const minutes = timeParts[1];
    
    if (isNaN(hours)) return time24;
    
    const period = hours >= 12 ? 'PM' : 'AM';
    
    if (hours === 0) {
      hours = 12;
    } else if (hours > 12) {
      hours = hours - 12;
    }
    
    return `${hours}:${minutes} ${period}`;
  } catch (error) {
    console.error('Error formatting time:', error);
    return time24;
  }
};

// Utility function to create time range display
const formatTimeRange = (startTime: string, endTime: string): string => {
  const formattedStart = formatTimeTo12Hour(startTime);
  const formattedEnd = formatTimeTo12Hour(endTime);
  return `${formattedStart} - ${formattedEnd}`;
};

// Utility function to check if a schedule slot is in the past
const isScheduleSlotInPast = (scheduleDate: string, startTime: string): boolean => {
  try {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);
    
    if (scheduleDate < currentDate) {
      return true;
    }
    
    if (scheduleDate === currentDate) {
      const scheduleTime = startTime.split(':').slice(0, 2).join(':');
      return scheduleTime <= currentTime;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking if schedule is in past:', error);
    return false;
  }
};

// Calendar component helper functions
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

const formatMonthYear = (date: Date) => {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const formatDateForDisplay = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// FIXED: Properly convert database date string to local Date object without timezone issues
const parseDatabaseDate = (dateString: string): Date => {
  try {
    // Split the date string (assuming format YYYY-MM-DD)
    const [year, month, day] = dateString.split('-').map(Number);
    // Create date in local timezone (not UTC)
    return new Date(year, month - 1, day);
  } catch (error) {
    console.error('Error parsing database date:', error);
    return new Date(dateString);
  }
};

// FIXED: Format date to YYYY-MM-DD string for comparison
const formatDateToDatabaseString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// UPDATED: Function to check if a date is within the two-month rolling window
const isDateInTwoMonthWindow = (date: Date, currentDate: Date = new Date()): boolean => {
  const dateYear = date.getFullYear();
  const dateMonth = date.getMonth();
  
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  // Calculate month difference
  const monthDiff = (dateYear - currentYear) * 12 + (dateMonth - currentMonth);
  
  // Include if it's current month (0) or next month (1)
  return monthDiff >= 0 && monthDiff <= 1;
};

const Hbook2 = () => {
  const [availableHorses, setAvailableHorses] = useState<Horse[]>([]);
  const [vetSchedule, setVetSchedule] = useState<ScheduleSlot[]>([]);
  const [availableDateObjects, setAvailableDateObjects] = useState<Date[]>([]);
  const [availableTimesForDate, setAvailableTimesForDate] = useState<ScheduleSlot[]>([]);
  const [availableServices, setAvailableServices] = useState<VetService[]>([]);
  const [vetProfile, setVetProfile] = useState<VetProfile | null>(null);
  const [veterinarians, setVeterinarians] = useState<Veterinarian[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingVeterinarians, setLoadingVeterinarians] = useState(false);
  const [isBookingAppointment, setIsBookingAppointment] = useState(false);
  
  // Form states
  const [selectedVeterinarian, setSelectedVeterinarian] = useState<Veterinarian | null>(null);
  const [showVetDropdown, setShowVetDropdown] = useState(false);
  const [selectedHorse, setSelectedHorse] = useState('Select a horse');
  const [showHorseDropdown, setShowHorseDropdown] = useState(false);
  const [selectedService, setSelectedService] = useState('General Consultation');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<ScheduleSlot | null>(null);
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableDatesSet, setAvailableDatesSet] = useState<Set<string>>(new Set());

  const router = useRouter();

  // ✅ FIXED: Added vetSchedule dependency
  const updateAvailableTimesForDate = useCallback((dateString: string, scheduleData?: ScheduleSlot[]) => {
    const dataToUse = scheduleData || vetSchedule;
    const timesForDate = dataToUse.filter((item: ScheduleSlot) => 
      item.sched_date === dateString && 
      item.is_available === true &&
      !isScheduleSlotInPast(item.sched_date, item.start_time)
    );
    
    console.log(`Available times for ${dateString}:`, timesForDate);
    setAvailableTimesForDate(timesForDate);
    
    // Clear selected time slot if it's no longer available
    setSelectedTimeSlot(prevSelected => {
      if (prevSelected && !timesForDate.some(item => item.slot_id === prevSelected.slot_id)) {
        return null;
      }
      return prevSelected;
    });
  }, [vetSchedule]);

  // Get current user ID
  const getCurrentUserId = useCallback(async (): Promise<string | null> => {
    try {
      const storedUser = await SecureStore.getItemAsync("user_data");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const id = parsed.user_id || parsed.id;
        if (id) {
          console.log("User ID loaded from storage:", id);
          return id;
        }
      }
      throw new Error('User not authenticated');
    } catch (error) {
      console.error("Error getting user ID:", error);
      Alert.alert('Authentication Error', 'Please log in again to book appointments.');
      router.back();
      return null;
    }
  }, [router]);

  // Function to fetch only regular veterinarians (excluding CTU vets) with years of experience
  const fetchVeterinarians = useCallback(async () => {
    try {
      setLoadingVeterinarians(true);
      console.log("Fetching regular veterinarians (excluding CTU vets)...");
      
      const url = `${API_BASE_URL}/get_veterinarians/`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch veterinarians: ${response.status}`);
      }

      const vetsData = await response.json();
      console.log("All veterinarians data:", vetsData);
      
      // Filter to only include regular veterinarians (vet_type === 'regular')
      const regularVets = vetsData.filter((vet: Veterinarian) => vet.vet_type === 'regular');
      console.log("Regular veterinarians only:", regularVets);
      
      setVeterinarians(regularVets);
      
    } catch (error) {
      console.error("Error fetching veterinarians:", error);
      Alert.alert("Error", "Unable to load veterinarians");
    } finally {
      setLoadingVeterinarians(false);
    }
  }, []);

  // ✅ UPDATED: Stable function for fetching horses - now excludes deceased horses
  const fetchHorses = useCallback(async (userId: string) => {
    try {
      console.log("Fetching horses for user_id:", userId);
      
      const url = `${API_BASE_URL}/get_horses/?user_id=${encodeURIComponent(userId)}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed with status ${response.status}`);
      }

      const data = await response.json();
      
      // ✅ FILTER OUT DECEASED HORSES - only include horses that are not deceased
      const activeHorses = Array.isArray(data) 
        ? data.filter((horse: Horse) => horse.horse_status !== 'Deceased')
        : [];
      
      setAvailableHorses(activeHorses);
      console.log(`Loaded ${activeHorses.length} active horses (excluding deceased)`);
    } catch (error: any) {
      console.error("Error loading horses:", error);
      Alert.alert("Error", error.message || "Unable to load horses");
    }
  }, []);

  // Stable function for fetching vet services
  const fetchVetServices = useCallback(async (vetId: string) => {
    if (!vetId) return;
    
    try {
      setLoadingServices(true);
      console.log("Fetching services for vet_id:", vetId);
      
      const url = `${API_BASE_URL}/get_vet_services/?vet_id=${encodeURIComponent(vetId)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch services: ${response.status}`);
      }

      const servicesData = await response.json();
      console.log("Vet services data:", servicesData);
      
      // If we have custom services, use them. Otherwise, use the default services with icons.
      if (servicesData && servicesData.length > 0) {
        setAvailableServices(servicesData);
        setSelectedService(servicesData[0].service_name);
      } else {
        // Use the default services with icons as fallback
        const defaultServicesWithIcons = defaultServices.map(service => ({
          service_id: service.name,
          service_name: service.name,
          description: service.name,
          vet_id: vetId,
          icon: service.icon
        }));
        setAvailableServices(defaultServicesWithIcons);
      }
      
    } catch (error) {
      console.error("Error fetching vet services:", error);
      // Fallback to default services
      const defaultServicesWithIcons = defaultServices.map(service => ({
        service_id: service.name,
        service_name: service.name,
        description: service.name,
        vet_id: vetId,
        icon: service.icon
      }));
      setAvailableServices(defaultServicesWithIcons);
    } finally {
      setLoadingServices(false);
    }
  }, []);

  // Function to fetch actual vet profile data including years of experience
  const fetchVetProfile = useCallback(async (vetId: string) => {
    if (!vetId) return;
    
    try {
      console.log("Fetching vet profile for vet_id:", vetId);
      
      const url = `${API_BASE_URL}/get_vet_profile/?vet_id=${encodeURIComponent(vetId)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch vet profile: ${response.status}`);
      }

      const vetData = await response.json();
      console.log("Vet profile data:", vetData);
      
      if (vetData && vetData.length > 0) {
        const profile = vetData[0];
        setVetProfile({
          vet_id: vetId,
          vet_name: `${profile.vet_fname || ''} ${profile.vet_lname || ''}`.trim(),
          vet_avatar: profile.vet_profile_photo || '',
          vet_specialization: profile.vet_specialization || 'General Veterinarian',
          vet_exp_yr: profile.vet_exp_yr || 0
        });
      }
      
    } catch (error) {
      console.error("Error fetching vet profile:", error);
      // Fallback to selected veterinarian data
      if (selectedVeterinarian) {
        setVetProfile({
          vet_id: selectedVeterinarian.id,
          vet_name: `${selectedVeterinarian.first_name} ${selectedVeterinarian.last_name}`,
          vet_avatar: selectedVeterinarian.avatar || '',
          vet_specialization: selectedVeterinarian.specialization || 'General Veterinarian',
          vet_exp_yr: selectedVeterinarian.vet_exp_yr || 0
        });
      }
    }
  }, [selectedVeterinarian]);

  // Stable function for fetching schedule
  const fetchVetSchedule = useCallback(async (vetId: string) => {
    if (!vetId) return;
    
    try {
      console.log("Fetching schedule for vet_id:", vetId);
      
      const url = `${API_BASE_URL}/get_vet_schedule/?vet_id=${encodeURIComponent(vetId)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch schedule: ${response.status}`);
      }
      
      const scheduleData = await response.json();
      console.log("Vet schedule data:", scheduleData);
      
      // Transform and filter the data - ✅ FIXED: Ensure slot_id is included
      const transformedSchedule = scheduleData
        .map((item: any) => {
          const formattedStartTime = formatTimeTo12Hour(item.start_time);
          const formattedEndTime = formatTimeTo12Hour(item.end_time);
          const timeDisplay = formatTimeRange(item.start_time, item.end_time);
          
          return {
            sched_id: item.sched_id,
            slot_id: item.slot_id || item.sched_id,
            vet_id: item.vet_id,
            sched_date: item.sched_date,
            start_time: item.start_time,
            end_time: item.end_time,
            start_time_formatted: formattedStartTime,
            end_time_formatted: formattedEndTime,
            time_display: timeDisplay,
            is_available: item.is_available
          };
        })
        .filter((item: ScheduleSlot) => {
          return item.is_available && !isScheduleSlotInPast(item.sched_date, item.start_time);
        });
      
      console.log("Filtered and formatted schedule:", transformedSchedule);
      setVetSchedule(transformedSchedule);
      
      const uniqueDates = [...new Set(transformedSchedule.map((item: ScheduleSlot) => item.sched_date))];
      
      // FIXED: Use parseDatabaseDate to avoid timezone issues
      const dateObjects = (uniqueDates as string[]).map((dateString: string) => parseDatabaseDate(dateString));
      setAvailableDateObjects(dateObjects);
      
      // Create a Set of available dates for quick lookup (using the same format)
      const availableDates = new Set(uniqueDates as string[]);
      setAvailableDatesSet(availableDates);
      
      if (uniqueDates.length > 0) {
        // FIXED: Use parseDatabaseDate for the first date as well
        const firstDate = parseDatabaseDate(uniqueDates[0] as string);
        setSelectedDate(firstDate);
        // Update available times for the first date
        const timesForDate = transformedSchedule.filter((item: ScheduleSlot) => 
          item.sched_date === uniqueDates[0] && 
          item.is_available === true &&
          !isScheduleSlotInPast(item.sched_date, item.start_time)
        );
        setAvailableTimesForDate(timesForDate);
      } else if (uniqueDates.length === 0) {
        Alert.alert(
          'No Available Appointments', 
          'This veterinarian has no available appointment slots at the moment. Please try again later or select a different veterinarian.',
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error("Error fetching vet schedule:", error);
      Alert.alert("Error", "Unable to load veterinarian schedule");
    }
  }, []);

  // Handle veterinarian selection
  const handleVeterinarianSelect = useCallback((vet: Veterinarian) => {
    setSelectedVeterinarian(vet);
    setShowVetDropdown(false);
    
    // Reset form when veterinarian changes
    setVetSchedule([]);
    setAvailableDateObjects([]);
    setAvailableTimesForDate([]);
    setAvailableServices([]);
    setSelectedDate(null);
    setSelectedTimeSlot(null);
    setSelectedService('General Consultation');
    
    // Fetch data for selected veterinarian
    fetchVetServices(vet.id);
    fetchVetProfile(vet.id);
    fetchVetSchedule(vet.id);
  }, [fetchVetServices, fetchVetProfile, fetchVetSchedule]);

  // ✅ FIXED: Main useEffect with proper dependency management
  useEffect(() => {
    let isMounted = true;
    let hasLoaded = false;

    const loadData = async () => {
      if (hasLoaded || !isMounted) return;
      hasLoaded = true;
      
      console.log('Starting data load...');
      setLoading(true);
      
      try {
        // Get user ID first
        const userId = await getCurrentUserId();
        
        if (!isMounted || !userId) return;

        // Set the user ID in state
        setCurrentUserId(userId);
        
        // Fetch horses and veterinarians in parallel
        await Promise.all([
          fetchHorses(userId), // ✅ This now excludes deceased horses
          fetchVeterinarians()
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
          console.log('Data load complete, setting loading to false');
        }
      }
    };

    loadData();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [fetchHorses, fetchVeterinarians, getCurrentUserId]);

  // Separate useEffect for updating times when vetSchedule changes
  useEffect(() => {
    if (selectedDate && vetSchedule.length > 0) {
      // FIXED: Use formatDateToDatabaseString to ensure proper comparison
      updateAvailableTimesForDate(formatDateToDatabaseString(selectedDate), vetSchedule);
    }
  }, [vetSchedule, selectedDate, updateAvailableTimesForDate]);

  // FIXED: Calendar navigation functions - now allows unlimited navigation
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  // UPDATED: Check if a date is available AND within the two-month window
  const isDateAvailable = (date: Date) => {
    const dateString = formatDateToDatabaseString(date);
    const isInTwoMonthWindow = isDateInTwoMonthWindow(date);
    return availableDatesSet.has(dateString) && isInTwoMonthWindow;
  };

  // Check if a date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Check if a date is selected
  const isDateSelected = (date: Date) => {
    return selectedDate ? date.toDateString() === selectedDate.toDateString() : false;
  };

  // FIXED: Handle date selection with proper date string conversion
  const handleDateSelect = (date: Date) => {
    const dateString = formatDateToDatabaseString(date);
    if (isDateAvailable(date)) {
      setSelectedDate(date);
      updateAvailableTimesForDate(dateString, vetSchedule);
      setShowCalendarModal(false);
    }
  };

  // FIXED: Render calendar component with single month display
  const renderCalendar = () => {
    return (
      <View style={styles.calendarContainer}>
        {/* Calendar Header */}
        <View style={styles.calendarHeader}>
          <TouchableOpacity 
            style={styles.calendarNavButton}
            onPress={() => navigateMonth('prev')}
            disabled={isBookingAppointment}
          >
            <FontAwesome5 name="chevron-left" size={16} color="#CD853F" />
          </TouchableOpacity>
          
          <Text style={styles.calendarMonthText}>
            {formatMonthYear(currentMonth)}
          </Text>
          
          <TouchableOpacity 
            style={styles.calendarNavButton}
            onPress={() => navigateMonth('next')}
            disabled={isBookingAppointment}
          >
            <FontAwesome5 name="chevron-right" size={16} color="#CD853F" />
          </TouchableOpacity>
        </View>

        {/* Calendar Grid for current month */}
        <View style={styles.calendarContent}>
          {renderSingleMonth(currentMonth)}
        </View>
        
        {/* Calendar legend */}
        <View style={styles.calendarLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, styles.legendAvailable]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, styles.legendSelected]} />
            <Text style={styles.legendText}>Selected</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, styles.legendToday]} />
            <Text style={styles.legendText}>Today</Text>
          </View>
        </View>
      </View>
    );
  };

  // Render a single month calendar
  const renderSingleMonth = (monthDate: Date) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<View key={`empty-${month}-${i}`} style={styles.calendarDayEmpty} />);
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const available = isDateAvailable(date);
      const today = isToday(date);
      const selected = isDateSelected(date);
      
      days.push(
        <TouchableOpacity
          key={`day-${month}-${day}`}
          style={[
            styles.calendarDay,
            today && styles.calendarDayToday,
            selected && styles.calendarDaySelected,
            !available && !today && styles.calendarDayDisabled
          ]}
          onPress={() => available && handleDateSelect(date)}
          disabled={!available || isBookingAppointment}
        >
          <Text style={[
            styles.calendarDayText,
            today && styles.calendarDayTextToday,
            selected && styles.calendarDayTextSelected,
            !available && !today && styles.calendarDayTextDisabled
          ]}>
            {day}
          </Text>
          {available && (
            <View style={[
              styles.availableIndicator,
              selected && styles.availableIndicatorSelected,
              today && styles.availableIndicatorToday
            ]} />
          )}
        </TouchableOpacity>
      );
    }
    
    return (
      <View style={styles.singleMonthContainer}>
        {/* Day headers */}
        <View style={styles.calendarDaysHeader}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Text key={day} style={styles.calendarDayHeaderText}>
              {day}
            </Text>
          ))}
        </View>
        
        {/* Calendar grid */}
        <View style={styles.calendarGrid}>
          {days}
        </View>
      </View>
    );
  };

  // ✅ FIXED: Handle time selection with proper slot_id
  const handleTimeSelection = (timeSlot: ScheduleSlot) => {
    if (!selectedDate) return;
    
    // FIXED: Use formatDateToDatabaseString for consistent comparison
    const dateString = formatDateToDatabaseString(selectedDate);
    
    const isValidSlot = vetSchedule.find((item: ScheduleSlot) => 
      item.slot_id === timeSlot.slot_id &&
      item.sched_date === dateString && 
      item.is_available === true &&
      !isScheduleSlotInPast(item.sched_date, item.start_time)
    );
    
    if (isValidSlot) {
      // ✅ FIXED: Only set the selected time slot, don't modify the array
      setSelectedTimeSlot(timeSlot);
      console.log("Selected time slot:", timeSlot);
    } else {
      Alert.alert('Error', 'This time slot is no longer available or has passed.');
      if (selectedVeterinarian) {
        fetchVetSchedule(selectedVeterinarian.id);
      }
    }
  };

  // ✅ FIXED: Enhanced time slots rendering with proper unique keys and selection logic
  const renderTimeSlots = () => {
    if (availableTimesForDate.length === 0) {
      return (
        <View style={styles.noTimeSlotsContainer}>
          <FontAwesome5 name="clock" size={40} color="#CD853F" style={styles.noTimeSlotsIcon} />
          <Text style={styles.noTimeSlotsTitle}>
            {selectedDate ? 'No Available Times' : 'Select a Date First'}
          </Text>
          <Text style={styles.noTimeSlotsText}>
            {selectedDate 
              ? `No available time slots for ${formatDateForDisplay(selectedDate)}`
              : 'Please select a date to view available time slots'
            }
          </Text>
        </View>
      );
    }

    // Group time slots by time period (Morning, Afternoon, Evening)
    const groupedTimes = availableTimesForDate.reduce((groups: any, slot) => {
      const hour = parseInt(slot.start_time.split(':')[0]);
      let period = 'Morning';
      if (hour >= 12 && hour < 17) period = 'Afternoon';
      else if (hour >= 17) period = 'Evening';
      
      if (!groups[period]) groups[period] = [];
      groups[period].push(slot);
      return groups;
    }, {});

    const periodIcons = {
      Morning: 'sun',
      Afternoon: 'sun',
      Evening: 'moon'
    };

    return (
      <View style={styles.timeSlotsContainer}>
        {Object.entries(groupedTimes).map(([period, slots]: [string, any]) => (
          <View key={`period-${period}-${slots[0]?.slot_id}`} style={styles.timePeriodSection}>
            <View style={styles.timePeriodHeader}>
              <FontAwesome5 
                name={periodIcons[period as keyof typeof periodIcons]} 
                size={16} 
                color="#CD853F" 
              />
              <Text style={styles.timePeriodText}>{period}</Text>
              <View style={styles.timePeriodLine} />
            </View>
            <View style={styles.timeSlots}>
              {slots.map((scheduleItem: ScheduleSlot) => {
                // ✅ FIXED: Proper selection logic using slot_id
                const isSelected = selectedTimeSlot?.slot_id === scheduleItem.slot_id;
                
                return (
                  <TouchableOpacity
                    key={`time-${scheduleItem.slot_id}-${scheduleItem.start_time}`}
                    style={[
                      styles.timeSlot,
                      isSelected && styles.timeSlotSelected
                    ]}
                    onPress={() => handleTimeSelection(scheduleItem)}
                    disabled={isBookingAppointment}
                    activeOpacity={0.8}
                  >
                    <View style={styles.timeSlotContent}>
                      <Text style={[
                        styles.timeSlotText,
                        isSelected && styles.timeSlotTextSelected
                      ]}>
                        {scheduleItem.time_display}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    );
  };

  // ✅ FIXED: Confirm appointment booking with slot_id
  const confirmAppointment = async () => {
    if (!selectedVeterinarian) {
      Alert.alert('Validation Error', 'Please select a veterinarian for the appointment.');
      return;
    }
    if (selectedHorse === 'Select a horse') {
      Alert.alert('Validation Error', 'Please select a horse for the appointment.');
      return;
    }
    if (!selectedTimeSlot) {
      Alert.alert('Validation Error', 'Please select an available time slot.');
      return;
    }
    if (!selectedDate) {
      Alert.alert('Validation Error', 'Please select a date.');
      return;
    }

    // FIXED: Use formatDateToDatabaseString for consistent date checking
    const selectedDateString = formatDateToDatabaseString(selectedDate);
    if (isScheduleSlotInPast(selectedDateString, selectedTimeSlot.start_time)) {
      Alert.alert('Error', 'The selected time slot has passed. Please select a current or future time slot.');
      if (selectedVeterinarian) {
        fetchVetSchedule(selectedVeterinarian.id);
      }
      return;
    }

    const userId = currentUserId || await getCurrentUserId();
    if (!userId) {
      Alert.alert('Authentication Error', 'Unable to identify user. Please try logging in again.');
      return;
    }

    setIsBookingAppointment(true);
    
    try {
      const selectedHorseData = availableHorses.find(horse => horse.horse_name === selectedHorse);
      if (!selectedHorseData) {
        throw new Error('Selected horse not found');
      }

      // ✅ FIXED: Use slot_id instead of sched_id and formatDateToDatabaseString for date
      const bookingData = {
        user_id: userId,
        vet_id: selectedVeterinarian.id,
        horse_id: selectedHorseData.horse_id,
        date: formatDateToDatabaseString(selectedDate),
        time: selectedTimeSlot.time_display,
        service: selectedService,
        notes: appointmentNotes,
        slot_id: selectedTimeSlot.slot_id // ✅ CRITICAL FIX: Changed from sched_id to slot_id
      };

      console.log('Booking appointment with data:', bookingData);
      
      const url = `${API_BASE_URL}/book_appointment/`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.log('Server returned non-JSON response:', responseText.substring(0, 500));
        throw new Error(`Server returned ${contentType || 'unknown content type'} instead of JSON`);
      }

      const result = await response.json();

      if (response.ok) {
        Alert.alert(
          'Booking Confirmed',
          `Your appointment has been scheduled successfully!\n\nVeterinarian: ${selectedVeterinarian.first_name} ${selectedVeterinarian.last_name}\nHorse: ${selectedHorse}\nDate: ${formatDateForDisplay(selectedDate)}\nTime: ${selectedTimeSlot.time_display}\nService: ${selectedService}`,
          [
            {
              text: 'OK',
              onPress: () => {
                router.push('/HORSE_OPERATOR/Hcalendar');
              }
            }
          ]
        );
      } else {
        throw new Error(result.error || result.message || 'Failed to book appointment');
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      let errorMessage = 'Failed to book appointment. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('This time slot has been booked by another user')) {
          errorMessage = 'This time slot was just booked by another user. Please select a different time.';
          if (selectedVeterinarian) {
            fetchVetSchedule(selectedVeterinarian.id);
          }
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert('Booking Error', errorMessage);
    } finally {
      setIsBookingAppointment(false);
    }
  };

  // ✅ UPDATED: Render horse dropdown with deceased horses excluded
  const renderHorseDropdown = () => {
    if (availableHorses.length === 0) {
      return (
        <View style={styles.noHorsesContainer}>
          <FontAwesome5 name="horse" size={24} color="#CD853F" />
          <Text style={styles.noHorsesText}>No active horses available</Text>
          <TouchableOpacity
            style={styles.addHorseButton}
            onPress={() => router.push('/HORSE_OPERATOR/addhorse')}
            disabled={isBookingAppointment}
          >
            <FontAwesome5 name="plus" size={14} color="#fff" />
            <Text style={styles.addHorseButtonText}>Add Horse</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        <TouchableOpacity
          style={[styles.dropdown, showHorseDropdown && styles.dropdownActive]}
          onPress={() => setShowHorseDropdown(!showHorseDropdown)}
          disabled={isBookingAppointment}
        >
          <Text style={[
            styles.dropdownText,
            selectedHorse === 'Select a horse' && styles.dropdownPlaceholder
          ]}>
            {selectedHorse}
          </Text>
          <FontAwesome5 
            name={showHorseDropdown ? "chevron-up" : "chevron-down"} 
            size={16} 
            color="#666" 
          />
        </TouchableOpacity>

        {/* Horse Dropdown Options */}
        {showHorseDropdown && availableHorses.length > 0 && (
          <View style={styles.dropdownOptions}>
            <ScrollView
              style={styles.dropdownScrollView}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {availableHorses.map((horse) => (
                <TouchableOpacity
                  key={`horse-${horse.horse_id}-${horse.horse_name}`}
                  style={styles.dropdownOption}
                  onPress={() => {
                    setSelectedHorse(horse.horse_name);
                    setShowHorseDropdown(false);
                  }}
                  disabled={isBookingAppointment}
                >
                  <View style={styles.dropdownOptionContent}>
                    <View style={styles.dropdownOptionDetails}>
                      <Text style={styles.dropdownOptionText}>{horse.horse_name}</Text>
                      <Text style={styles.dropdownOptionSubtext}>
                        {horse.horse_breed} • {horse.horse_age} years old
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome5 name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Book Appointment</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner}>
            <ActivityIndicator size="large" color="#CD853F" />
          </View>
          <Text style={styles.loadingText}>Loading booking information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.safeArea} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Enhanced Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
            disabled={isBookingAppointment}
          >
            <FontAwesome5 name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Book Appointment</Text>
            <Text style={styles.headerSubtitle}>Schedule with a veterinarian</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          {/* Select Veterinarian Section */}
          <View style={styles.formContainer}>
            <View style={styles.formGroup}>
              <View style={styles.formLabelContainer}>
                <FontAwesome5 name="user-md" size={16} color="#CD853F" />
                <Text style={styles.formLabel}>Select Veterinarian</Text>
                {loadingVeterinarians && (
                  <ActivityIndicator size="small" color="#CD853F" style={{ marginLeft: 8 }} />
                )}
              </View>
              
              {/* Consistent Dropdown Design */}
              <TouchableOpacity
                style={[styles.dropdown, showVetDropdown && styles.dropdownActive]}
                onPress={() => setShowVetDropdown(!showVetDropdown)}
                disabled={isBookingAppointment || loadingVeterinarians}
              >
                <View style={styles.dropdownContentWithIcon}>
                  <Text style={[
                    styles.dropdownText,
                    !selectedVeterinarian && styles.dropdownPlaceholder
                  ]}>
                    {selectedVeterinarian 
                      ? `${selectedVeterinarian.first_name} ${selectedVeterinarian.last_name}`
                      : 'Select a veterinarian'
                    }
                  </Text>
                </View>
                <FontAwesome5 
                  name={showVetDropdown ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color="#666" 
                />
              </TouchableOpacity>

              {/* Veterinarian Dropdown Options */}
              {showVetDropdown && veterinarians.length > 0 && (
                <View style={styles.dropdownOptions}>
                  <ScrollView
                    style={styles.dropdownScrollView}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                  >
                    {veterinarians.map((vet) => (
                      <TouchableOpacity
                        key={`vet-${vet.id}-${vet.first_name}`}
                        style={styles.dropdownOption}
                        onPress={() => handleVeterinarianSelect(vet)}
                        disabled={isBookingAppointment}
                      >
                        <View style={styles.dropdownOptionContent}>
                          <View style={styles.vetAvatarContainer}>
                            {vet.avatar ? (
                              <Image source={{ uri: vet.avatar }} style={styles.vetAvatar} />
                            ) : (
                              <View style={styles.vetAvatarPlaceholder}>
                                <FontAwesome5 name="user-md" size={16} color="#CD853F" />
                              </View>
                            )}
                          </View>
                          <View style={styles.dropdownOptionDetails}>
                            <Text style={styles.dropdownOptionText}>
                              {vet.first_name} {vet.last_name}
                            </Text>
                            <Text style={styles.dropdownOptionSubtext}>
                              {vet.specialization || 'General Veterinarian'}
                              {vet.vet_exp_yr && ` • ${vet.vet_exp_yr} years experience`}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {veterinarians.length === 0 && !loadingVeterinarians && (
                <Text style={styles.noVeterinariansText}>
                  No veterinarians available at the moment
                </Text>
              )}
            </View>

            {/* Show rest of form only when veterinarian is selected */}
            {selectedVeterinarian && (
              <>
                {/* Enhanced Veterinarian Info */}
                <View style={styles.vetInfoCard}>
                  <View style={styles.vetInfo}>
                    <View style={styles.vetImageContainer}>
                      {selectedVeterinarian.avatar ? (
                        <Image
                          source={{ uri: selectedVeterinarian.avatar }}
                          style={styles.vetImage}
                        />
                      ) : (
                        <View style={styles.vetImagePlaceholder}>
                          <FontAwesome5 name="user-md" size={24} color="#CD853F" />
                        </View>
                      )}
                      <View style={styles.vetStatusBadge}>
                        <FontAwesome5 name="check" size={8} color="#fff" />
                      </View>
                    </View>
                    <View style={styles.vetDetails}>
                      <Text style={styles.vetName}>
                        {selectedVeterinarian.first_name} {selectedVeterinarian.last_name}
                      </Text>
                      <View style={styles.vetSpecializationContainer}>
                        <FontAwesome5 name="user-md" size={12} color="#CD853F" />
                        <Text style={styles.vetSpecialization}>
                          {selectedVeterinarian.specialization || 'General Veterinarian'}
                        </Text>
                      </View>
                      <View style={styles.vetExperienceContainer}>
                        <FontAwesome5 name="award" size={12} color="#666" />
                        <Text style={styles.vetExperience}>
                          {vetProfile ? `${vetProfile.vet_exp_yr} years of experience` : 
                          selectedVeterinarian.vet_exp_yr ? `${selectedVeterinarian.vet_exp_yr} years of experience` : 
                          'Experienced veterinarian'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Select Horse - ✅ UPDATED: Now excludes deceased horses */}
                <View style={styles.formGroup}>
                  <View style={styles.formLabelContainer}>
                    <FontAwesome5 name="horse" size={16} color="#CD853F" />
                    <Text style={styles.formLabel}>Select Horse</Text>
                  </View>
                  {renderHorseDropdown()}
                </View>

                {/* Select Service */}
                <View style={styles.formGroup}>
                  <View style={styles.formLabelContainer}>
                    <FontAwesome5 name="stethoscope" size={16} color="#CD853F" />
                    <Text style={styles.formLabel}>Select Service</Text>
                    {loadingServices && (
                      <ActivityIndicator size="small" color="#CD853F" style={{ marginLeft: 8 }} />
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.dropdown, showServiceDropdown && styles.dropdownActive]}
                    onPress={() => setShowServiceDropdown(!showServiceDropdown)}
                    disabled={isBookingAppointment || loadingServices}
                  >
                    <View style={styles.dropdownContentWithIcon}>
                      <Text style={styles.dropdownText}>{selectedService}</Text>
                    </View>
                    <FontAwesome5 
                      name={showServiceDropdown ? "chevron-up" : "chevron-down"} 
                      size={16} 
                      color="#666" 
                    />
                  </TouchableOpacity>

                  {/* Service Dropdown Options */}
                  {showServiceDropdown && availableServices.length > 0 && (
                    <View style={styles.dropdownOptions}>
                      <ScrollView
                        style={styles.dropdownScrollView}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                      >
                        {availableServices.map((serviceItem) => (
                          <TouchableOpacity
                            key={`service-${serviceItem.service_id}-${serviceItem.service_name}`}
                            style={styles.dropdownOption}
                            onPress={() => {
                              setSelectedService(serviceItem.service_name);
                              setShowServiceDropdown(false);
                            }}
                            disabled={isBookingAppointment}
                          >
                            <View style={styles.dropdownOptionContent}>
                              <View style={styles.dropdownOptionDetails}>
                                <Text style={styles.dropdownOptionText}>{serviceItem.service_name}</Text>
                                {serviceItem.description && serviceItem.description !== serviceItem.service_name && (
                                  <Text style={styles.dropdownOptionSubtext}>
                                    {serviceItem.description}
                                  </Text>
                                )}
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {availableServices.length === 0 && !loadingServices && (
                    <Text style={styles.noServicesText}>
                      No services available for this veterinarian
                    </Text>
                  )}
                </View>

                {/* Enhanced Choose Date with Calendar */}
                <View style={styles.formGroup}>
                  <View style={styles.formLabelContainer}>
                    <FontAwesome5 name="calendar-alt" size={16} color="#CD853F" />
                    <Text style={styles.formLabel}>Choose Available Date</Text>
                  </View>

                  {availableDateObjects.length === 0 ? (
                    <View style={styles.noAvailableDatesContainer}>
                      <FontAwesome5 name="calendar-times" size={40} color="#CD853F" style={{ opacity: 0.5 }} />
                      <Text style={styles.noAvailableDatesTitle}>No Available Dates</Text>
                      <Text style={styles.noAvailableDatesText}>
                        This veterinarian currently has no available appointment dates.
                      </Text>
                    </View>
                  ) : (
                    <>
                      {/* Date Selection Button */}
                      <TouchableOpacity
                        style={styles.datePickerButton}
                        onPress={() => setShowCalendarModal(true)}
                        disabled={isBookingAppointment}
                      >
                        <View style={styles.datePickerContent}>
                          <Text style={[
                            styles.datePickerText,
                            !selectedDate && styles.datePickerPlaceholder
                          ]}>
                            {selectedDate ? formatDateForDisplay(selectedDate) : 'Select an available date'}
                          </Text>
                        </View>
                        <FontAwesome5 name="chevron-down" size={16} color="#666" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                {/* Enhanced Choose Time */}
                <View style={styles.formGroup}>
                  <View style={styles.formLabelContainer}>
                    <FontAwesome5 name="clock" size={16} color="#CD853F" />
                    <Text style={styles.formLabel}>Choose Available Time</Text>
                  </View>
                  {renderTimeSlots()}
                </View>

                {/* Enhanced Add Notes */}
                <View style={styles.formGroup}>
                  <View style={styles.formLabelContainer}>
                    <FontAwesome5 name="sticky-note" size={16} color="#CD853F" />
                    <Text style={styles.formLabel}>Chief Complaint</Text>
                  </View>
                  <View style={styles.notesInputContainer}>
                    <TextInput
                      style={styles.notesInput}
                      placeholder="Enter any additional notes for the veterinarian..."
                      value={appointmentNotes}
                      onChangeText={setAppointmentNotes}
                      multiline
                      numberOfLines={4}
                      placeholderTextColor="#999"
                      editable={!isBookingAppointment}
                    />
                  </View>
                </View>

                {/* Enhanced Confirm Button */}
                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    (isBookingAppointment || availableDateObjects.length === 0) && styles.confirmButtonDisabled
                  ]}
                  onPress={confirmAppointment}
                  disabled={isBookingAppointment || availableDateObjects.length === 0}
                >
                  <View style={styles.confirmButtonContent}>
                    {isBookingAppointment ? (
                      <>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={styles.confirmButtonText}>Booking...</Text>
                      </>
                    ) : (
                      <>
                        <FontAwesome5 name="calendar-check" size={16} color="#fff" />
                        <Text style={styles.confirmButtonText}>
                          {availableDateObjects.length === 0 ? 'No Available Dates' : 'Confirm Appointment'}
                        </Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              </>
            )}

            {/* Show message when no veterinarian is selected */}
            {!selectedVeterinarian && !loadingVeterinarians && veterinarians.length > 0 && (
              <View style={styles.selectVetMessage}>
                <FontAwesome5 name="user-md" size={48} color="#CD853F" style={{ opacity: 0.5 }} />
                <Text style={styles.selectVetMessageTitle}>Select a Veterinarian</Text>
                <Text style={styles.selectVetMessageText}>
                  Please select a veterinarian from the dropdown above to view available appointment slots and services.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Calendar Modal */}
        <Modal
          visible={showCalendarModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowCalendarModal(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Available Date</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowCalendarModal(false)}
              >
                <FontAwesome5 name="times" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              {renderCalendar()}
              
              {/* Selected Date Info */}
              {selectedDate && (
                <View style={styles.selectedDateInfo}>
                  <Text style={styles.selectedDateLabel}>Selected Date:</Text>
                  <Text style={styles.selectedDateText}>
                    {formatDateForDisplay(selectedDate)}
                  </Text>
                </View>
              )}
            </View>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

// Enhanced styles with calendar components
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#CD853F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#CD853F',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingSpinner: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 50,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  // Form Container
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  // Dropdown Styles (Consistent for all dropdowns)
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minHeight: 56,
  },
  dropdownActive: {
    borderColor: '#CD853F',
  },
  dropdownContentWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginLeft: 8,
  },
  dropdownPlaceholder: {
    color: '#999',
    fontWeight: 'normal',
  },
  dropdownOptions: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    maxHeight: 250,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dropdownScrollView: {
    maxHeight: 250,
  },
  dropdownOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownOptionDetails: {
    marginLeft: 12,
    flex: 1,
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  dropdownOptionSubtext: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  // Veterinarian Selection Styles
  vetAvatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vetAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  vetAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noVeterinariansText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
    padding: 8,
  },
  selectVetMessage: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 40,
  },
  selectVetMessageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  selectVetMessageText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  vetInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 24,
  },
  vetInfo: {
    flexDirection: 'row',
    padding: 20,
  },
  vetImageContainer: {
    position: 'relative',
    marginRight: 15,
  },
  vetImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f0f0f0',
  },
  vetImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFF8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vetStatusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  vetDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  vetName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  vetSpecializationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  vetSpecialization: {
    fontSize: 14,
    color: '#CD853F',
    fontWeight: '600',
    marginLeft: 6,
  },
  vetExperienceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vetExperience: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  // Horse Selection
  noHorsesContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  noHorsesText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    marginVertical: 12,
  },
  addHorseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CD853F',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addHorseButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Services
  noServicesText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
    padding: 8,
  },
  // No Available Dates Styles
  noAvailableDatesContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  noAvailableDatesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  noAvailableDatesText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Date Picker Button
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginLeft: 12,
  },
  datePickerPlaceholder: {
    color: '#999',
    fontWeight: 'normal',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  // FIXED: Calendar Content
  calendarContent: {
    flex: 1,
  },
  // Calendar Styles
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flex: 1,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarNavButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  calendarMonthText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  calendarDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  calendarDayHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  calendarDayEmpty: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  calendarDayToday: {
    backgroundColor: '#0074D9',
    marginTop: 4,
  },
  calendarDaySelected: {
    backgroundColor: '#CD853F',
    marginTop: 4,
  },
  calendarDayDisabled: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  calendarDayTextToday: {
    color: '#ffffffff', 
    fontWeight: 'bold',
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  calendarDayTextDisabled: {
    color: '#ccc',
  },
  availableIndicator: {
    position: 'absolute',
    bottom: 5,
    width: 20,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00FF00',
  },
  availableIndicatorSelected: {
    backgroundColor: '#00FF00',
  },
  availableIndicatorToday: {
    backgroundColor: '#FFFFFF', 
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendAvailable: {
    backgroundColor: '#00FF00',
  },
  legendSelected: {
    backgroundColor: '#CD853F',
  },
  legendToday: {
    backgroundColor: '#0074D9', 
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  calendarInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  calendarInfoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  selectedDateInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedDateLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  timeSlotsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  timePeriodSection: {
    marginBottom: 20,
  },
  timePeriodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timePeriodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  timePeriodLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
    marginLeft: 12,
  },
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeSlot: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    backgroundColor: '#f9f9f9',
  },
  timeSlotSelected: {
    borderColor: '#CD853F',
    backgroundColor: '#CD853F',
  },
  timeSlotContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timeSlotText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  timeSlotTextSelected: {
    color: '#fff',
  },
  noTimeSlotsContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  noTimeSlotsIcon: {
    marginBottom: 12,
    opacity: 0.7,
  },
  noTimeSlotsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  noTimeSlotsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Notes Input
  notesInputContainer: {
    position: 'relative',
  },
  notesInput: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
    textAlignVertical: 'top',
    minHeight: 120,
    paddingRight: 40,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  // Confirm Button
  confirmButton: {
    backgroundColor: '#CD853F',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 56,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
    elevation: 0,
    shadowOpacity: 0,
  },
  confirmButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  // FIXED: Removed duplicate calendar styles
  singleMonthContainer: {
    marginBottom: 10,
  },
  noCalendarData: {
    alignItems: 'center',
    padding: 40,
    justifyContent: 'center',
  },
  noCalendarDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
});

export default Hbook2;