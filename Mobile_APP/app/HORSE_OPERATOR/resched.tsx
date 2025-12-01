import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

interface Appointment {
  id: string;
  app_id: string;
  contactId: string;
  contactName: string;
  horseName: string;
  service: string;
  date: string;
  time: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  schedId?: string;
  created_at?: string;
}

interface Horse {
  horse_id: string;
  horse_name: string;
  horse_age: number;
  horse_breed: string;
  horse_color: string;
}

interface ScheduleSlot {
  sched_id: string;
  vet_id: string;
  sched_date: string;
  start_time: string;
  end_time: string;
  time_display: string;
  is_available: boolean;
}

interface RescheduleEligibility {
  can_reschedule: boolean;
  reason: string;
  remaining_minutes: number;
  hours_since_creation: number;
}

const API_BASE_URL = "http://192.168.31.58:8000/api/horse_operator"

// Available services with icons (same as booking page)
const services = [
  { name: 'General Consultation', icon: 'stethoscope' },
  { name: 'Vaccination', icon: 'syringe' },
  { name: 'Dental Care', icon: 'tooth' },
  { name: 'Emergency Care', icon: 'ambulance' },
  { name: 'Health Check-up', icon: 'heartbeat' },
  { name: 'Medication', icon: 'pills' },
  { name: 'Surgery Consultation', icon: 'cut' },
  { name: 'Reproductive Services', icon: 'baby' }
];

// Utility functions from booking page

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

const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.toISOString().split('T')[0] === date2.toISOString().split('T')[0];
};

const RescheduleScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Parse original appointment data
  const originalAppointment: Appointment | null = params.appointment
    ? JSON.parse(params.appointment as string)
    : null;

  // Loading and eligibility states
  const [loading, setLoading] = useState(true);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleEligibility, setRescheduleEligibility] = useState<RescheduleEligibility | null>(null);

  // Data states
  const [availableHorses, setAvailableHorses] = useState<Horse[]>([]);
  const [vetSchedule, setVetSchedule] = useState<ScheduleSlot[]>([]);
  const [availableDateObjects, setAvailableDateObjects] = useState<Date[]>([]);
  const [availableTimesForDate, setAvailableTimesForDate] = useState<ScheduleSlot[]>([]);

  // Form states
  const [selectedHorse, setSelectedHorse] = useState('');
  const [selectedService, setSelectedService] = useState('General Consultation');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<ScheduleSlot | null>(null);
  const [appointmentNotes, setAppointmentNotes] = useState('');

  // UI states
  const [showHorseDropdown, setShowHorseDropdown] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);

  // Initialize form with original appointment data
  useEffect(() => {
    if (originalAppointment) {
      setSelectedHorse(originalAppointment.horseName);
      setSelectedService(originalAppointment.service);
      setSelectedDate(new Date(originalAppointment.date));
      setAppointmentNotes(originalAppointment.notes || '');
    }
  }, [originalAppointment]);

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
      Alert.alert('Authentication Error', 'Please log in again to reschedule appointments.');
      router.back();
      return null;
    }
  }, [router]);

  // Updated checkRescheduleEligibility function with better error handling
  const checkRescheduleEligibility = useCallback(async (appId: string) => {
    try {
      console.log(`Checking reschedule eligibility for app_id: ${appId}`);
      
      const response = await fetch(`${API_BASE_URL}/check_reschedule_eligibility/?app_id=${encodeURIComponent(appId)}`);
      
      console.log(`Response status: ${response.status}`);
      console.log(`Response ok: ${response.ok}`);
      
      if (!response.ok) {
        // More detailed error handling
        let errorMessage = `HTTP ${response.status}`;
        
        try {
          const errorText = await response.text();
          console.log(`Error response body: ${errorText}`);
          
          // Try to parse as JSON for structured error
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorJson.message || errorMessage;
          } catch {
            // Not JSON, use the text as is
            errorMessage = errorText || errorMessage;
          }
        } catch {
          console.log('Could not read error response body');
        }
        
        throw new Error(`Failed to check eligibility: ${errorMessage}`);
      }
      
      const eligibilityData = await response.json();
      console.log("Reschedule eligibility:", eligibilityData);
      
      setRescheduleEligibility(eligibilityData);
      
      if (!eligibilityData.can_reschedule) {
        Alert.alert(
          'Cannot Reschedule',
          eligibilityData.reason,
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error checking reschedule eligibility:", error);
      
      // More specific error messages
      let userMessage = 'Failed to check reschedule eligibility';
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          userMessage = 'Reschedule feature is not available. Please contact support.';
        } else if (error.message.includes('Network')) {
          userMessage = 'Network error. Please check your connection and try again.';
        } else {
          userMessage = error.message;
        }
      }
      
      Alert.alert('Error', userMessage, [
        { text: 'Go Back', onPress: () => router.back() },
        { text: 'Try Again', onPress: () => checkRescheduleEligibility(appId) }
      ]);
      return false;
    }
  }, [router]);

  // Fetch user's horses
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
      setAvailableHorses(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Error loading horses:", error);
      Alert.alert("Error", error.message || "Unable to load horses");
    }
  }, []);

  // Update available times when date changes
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
      if (prevSelected && !timesForDate.some(item => item.sched_id === prevSelected.sched_id)) {
        return null;
      }
      return prevSelected;
    });
  }, [vetSchedule]);

  // Fetch vet schedule for rescheduling
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
      
      // Transform and filter the data
      const transformedSchedule = scheduleData
        .map((item: any) => ({
          sched_id: item.sched_id,
          vet_id: item.vet_id,
          sched_date: item.sched_date,
          start_time: item.start_time,
          end_time: item.end_time,
          time_display: item.time_display,
          is_available: item.is_available
        }))
        .filter((item: ScheduleSlot) => {
          return item.is_available && !isScheduleSlotInPast(item.sched_date, item.start_time);
        });
      
      console.log("Filtered and formatted schedule:", transformedSchedule);
      setVetSchedule(transformedSchedule);
      
      const uniqueDates = [...new Set(transformedSchedule.map((item: ScheduleSlot) => item.sched_date))];
      
      // Convert date strings to Date objects
      const dateObjects = (uniqueDates as string[]).map((dateString: string) => new Date(dateString));
      setAvailableDateObjects(dateObjects);
      
      if (uniqueDates.length > 0) {
        const firstDate = new Date(uniqueDates[0] as string);
        if (!selectedDate) {
          setSelectedDate(firstDate);
        }
        updateAvailableTimesForDate(selectedDate?.toISOString().split('T')[0] || uniqueDates[0] as string, transformedSchedule);
      } else {
        Alert.alert(
          'No Available Appointments', 
          'This veterinarian has no available appointment slots at the moment for rescheduling.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
      
    } catch (error) {
      console.error("Error fetching vet schedule:", error);
      Alert.alert("Error", "Unable to load veterinarian schedule");
    }
  }, [selectedDate, updateAvailableTimesForDate, router]);

  // Updated main data loading effect with retry logic
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 2;

    const loadData = async () => {
      if (!originalAppointment) {
        Alert.alert('Error', 'No appointment data provided');
        router.back();
        return;
      }

      console.log('Starting reschedule data load...');
      setLoading(true);
      
      const attemptLoad = async (): Promise<boolean> => {
        try {
          // Check if appointment can be rescheduled
          const canReschedule = await checkRescheduleEligibility(originalAppointment.app_id);
          if (!canReschedule || !isMounted) return false;

          // Get user ID
          const userId = await getCurrentUserId();
          if (!isMounted || !userId) return false;
          
          // Fetch horses and schedule in parallel
          await Promise.all([
            fetchHorses(userId),
            fetchVetSchedule(originalAppointment.contactId)
          ]);
          
          return true;
        } catch (error) {
          console.error('Error loading reschedule data:', error);
          return false;
        }
      };

      const loadWithRetry = async () => {
        while (retryCount < maxRetries && isMounted) {
          const success = await attemptLoad();
          if (success) {
            break;
          }
          
          retryCount++;
          if (retryCount < maxRetries && isMounted) {
            console.log(`Retry attempt ${retryCount}/${maxRetries}`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
          }
        }
        
        if (isMounted) {
          setLoading(false);
        }
      };

      loadWithRetry();

      return () => {
        isMounted = false;
      };
    };

    loadData();
  }, [originalAppointment, checkRescheduleEligibility, getCurrentUserId, fetchHorses, fetchVetSchedule, router]);

  // Update times when date changes
  useEffect(() => {
    if (selectedDate && vetSchedule.length > 0) {
      updateAvailableTimesForDate(selectedDate.toISOString().split('T')[0], vetSchedule);
    }
  }, [vetSchedule, selectedDate, updateAvailableTimesForDate]);

  // Format date for display
  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  // Handle time selection
  const handleTimeSelection = (timeSlot: ScheduleSlot) => {
    if (!selectedDate) return;
    
    const dateString = selectedDate.toISOString().split('T')[0];
    
    const isValidSlot = vetSchedule.find((item: ScheduleSlot) => 
      item.sched_id === timeSlot.sched_id &&
      item.sched_date === dateString && 
      item.is_available === true &&
      !isScheduleSlotInPast(item.sched_date, item.start_time)
    );
    
    if (isValidSlot) {
      setSelectedTimeSlot(timeSlot);
      console.log("Selected time slot:", timeSlot);
    } else {
      Alert.alert('Error', 'This time slot is no longer available or has passed.');
      fetchVetSchedule(originalAppointment?.contactId || '');
    }
  };

  // Confirm reschedule
  const confirmReschedule = useCallback(async () => {
    if (!originalAppointment || !selectedTimeSlot || !selectedDate) {
      Alert.alert('Error', 'Missing required information for rescheduling.');
      return;
    }

    if (availableHorses.length === 0) {
      Alert.alert(
        'No Horses Available',
        'Please add a horse first before rescheduling an appointment.',
        [
          {
            text: 'Add Horse',
            onPress: () => {
              router.push('/HORSE_OPERATOR/addhorse');
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
      return;
    }

    // Check if selected time slot is not in the past
    if (isScheduleSlotInPast(selectedTimeSlot.sched_date, selectedTimeSlot.start_time)) {
      Alert.alert('Error', 'The selected time slot has passed. Please select a current or future time slot.');
      fetchVetSchedule(originalAppointment.contactId);
      return;
    }

    setIsRescheduling(true);
    
    try {
      const rescheduleData = {
        app_id: originalAppointment.app_id,
        new_sched_id: selectedTimeSlot.sched_id,
        new_date: selectedDate.toISOString().split('T')[0],
        new_time: selectedTimeSlot.time_display,
        // Optionally update other details
        horse_name: selectedHorse,
        service: selectedService,
        notes: appointmentNotes
      };

      console.log('Rescheduling appointment with data:', rescheduleData);
      
      const url = `${API_BASE_URL}/reschedule_appointment/`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rescheduleData),
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
          'Reschedule Confirmed',
          `Your appointment has been rescheduled successfully!\n\nVeterinarian: ${originalAppointment.contactName}\nHorse: ${selectedHorse}\nDate: ${formatDate(selectedDate)}\nTime: ${selectedTimeSlot.time_display}\nService: ${selectedService}${appointmentNotes ? `\nNotes: ${appointmentNotes}` : ''}`,
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
        throw new Error(result.error || result.message || 'Failed to reschedule appointment');
      }
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      let errorMessage = 'Failed to reschedule appointment. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('not allowed')) {
          errorMessage = 'Reschedule not allowed. ' + error.message;
        } else if (error.message.includes('not available')) {
          errorMessage = 'This time slot is no longer available. Please select a different time.';
          fetchVetSchedule(originalAppointment.contactId);
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert('Reschedule Error', errorMessage);
    } finally {
      setIsRescheduling(false);
    }
  }, [
    originalAppointment,
    availableHorses,
    selectedDate,
    selectedTimeSlot,
    selectedHorse,
    selectedService,
    appointmentNotes,
    fetchVetSchedule,
    formatDate,
    router,
  ]);

  // Custom date picker for Android with only available dates
  const renderCustomDatePicker = () => {
    if (availableDateObjects.length > 0) {
      return (
        <View style={styles.customDatePickerContainer}>
          <Text style={styles.datePickerLabel}>Available Dates:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScrollContainer}>
            {availableDateObjects.sort((a, b) => a.getTime() - b.getTime()).map((dateObj, index) => {
              const isSelected = selectedDate && isSameDay(dateObj, selectedDate);
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dateOption,
                    isSelected && styles.dateOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedDate(dateObj);
                    updateAvailableTimesForDate(dateObj.toISOString().split('T')[0], vetSchedule);
                  }}
                  disabled={isRescheduling}
                >
                  <Text style={[
                    styles.dateOptionDay,
                    isSelected && styles.dateOptionDaySelected
                  ]}>
                    {dateObj.getDate()}
                  </Text>
                  <Text style={[
                    styles.dateOptionMonth,
                    isSelected && styles.dateOptionMonthSelected
                  ]}>
                    {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                  </Text>
                  <Text style={[
                    styles.dateOptionWeekday,
                    isSelected && styles.dateOptionWeekdaySelected
                  ]}>
                    {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      );
    }
    return null;
  };

  // Enhanced time slots rendering
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
              ? `No available time slots for ${formatDate(selectedDate)}`
              : 'Please select a date to view available time slots'
            }
          </Text>
        </View>
      );
    }

    // Group time slots by time period
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
          <View key={period} style={styles.timePeriodSection}>
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
              {slots.map((scheduleItem: ScheduleSlot) => (
                <TouchableOpacity
                  key={scheduleItem.sched_id}
                  style={[
                    styles.timeSlot,
                    selectedTimeSlot?.sched_id === scheduleItem.sched_id && styles.timeSlotSelected
                  ]}
                  onPress={() => handleTimeSelection(scheduleItem)}
                  disabled={isRescheduling}
                  activeOpacity={0.8}
                >
                  <View style={styles.timeSlotContent}>
                    <FontAwesome5 
                      name="clock" 
                      size={14} 
                      color={selectedTimeSlot?.sched_id === scheduleItem.sched_id ? '#fff' : '#CD853F'} 
                    />
                    <Text style={[
                      styles.timeSlotText,
                      selectedTimeSlot?.sched_id === scheduleItem.sched_id && styles.timeSlotTextSelected
                    ]}>
                      {scheduleItem.time_display}
                    </Text>
                  </View>
                  {selectedTimeSlot?.sched_id === scheduleItem.sched_id && (
                    <FontAwesome5 name="check" size={12} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome5 name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reschedule Appointment</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner}>
            <ActivityIndicator size="large" color="#CD853F" />
          </View>
          <Text style={styles.loadingText}>Loading reschedule options...</Text>
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
            disabled={isRescheduling}
          >
            <FontAwesome5 name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Reschedule Appointment</Text>
            <Text style={styles.headerSubtitle}>
              {originalAppointment ? `with ${originalAppointment.contactName}` : 'Update your booking'}
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          {/* Reschedule Status Info */}
          {rescheduleEligibility && (
            <View style={styles.rescheduleInfoCard}>
              <View style={styles.rescheduleInfoHeader}>
                <FontAwesome5 name="clock" size={16} color="#CD853F" />
                <Text style={styles.rescheduleInfoTitle}>Reschedule Window</Text>
              </View>
              <Text style={styles.rescheduleInfoText}>
                {rescheduleEligibility.reason}
              </Text>
              {rescheduleEligibility.remaining_minutes > 0 && (
                <Text style={styles.remainingTimeText}>
                  {Math.floor(rescheduleEligibility.remaining_minutes)} minutes remaining
                </Text>
              )}
            </View>
          )}

          {/* Original Appointment Info */}
          {originalAppointment && (
            <View style={styles.originalAppointmentCard}>
              <View style={styles.originalAppointmentHeader}>
                <FontAwesome5 name="calendar-alt" size={16} color="#666" />
                <Text style={styles.originalAppointmentTitle}>Current Appointment</Text>
              </View>
              <View style={styles.originalAppointmentDetails}>
                <Text style={styles.originalAppointmentText}>
                  Date: {new Date(originalAppointment.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
                <Text style={styles.originalAppointmentText}>
                  Time: {originalAppointment.time}
                </Text>
                <Text style={styles.originalAppointmentText}>
                  Horse: {originalAppointment.horseName}
                </Text>
                <Text style={styles.originalAppointmentText}>
                  Service: {originalAppointment.service}
                </Text>
              </View>
            </View>
          )}

          {/* Enhanced Form Container */}
          <View style={styles.formContainer}>
            {/* Select Horse */}
            <View style={styles.formGroup}>
              <View style={styles.formLabelContainer}>
                <FontAwesome5 name="horse" size={16} color="#CD853F" />
                <Text style={styles.formLabel}>Select Horse</Text>
              </View>
              {availableHorses.length > 0 ? (
                <TouchableOpacity
                  style={[styles.dropdown, showHorseDropdown && styles.dropdownActive]}
                  onPress={() => setShowHorseDropdown(!showHorseDropdown)}
                  disabled={isRescheduling}
                >
                  <Text style={[
                    styles.dropdownText,
                    selectedHorse === 'Select a horse' && styles.dropdownPlaceholder
                  ]}>
                    {selectedHorse || 'Select a horse'}
                  </Text>
                  <FontAwesome5 
                    name={showHorseDropdown ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color="#666" 
                  />
                </TouchableOpacity>
              ) : (
                <View style={styles.noHorsesContainer}>
                  <FontAwesome5 name="horse" size={24} color="#CD853F" />
                  <Text style={styles.noHorsesText}>No horses available</Text>
                  <TouchableOpacity
                    style={styles.addHorseButton}
                    onPress={() => router.push('/HORSE_OPERATOR/addhorse')}
                    disabled={isRescheduling}
                  >
                    <FontAwesome5 name="plus" size={14} color="#fff" />
                    <Text style={styles.addHorseButtonText}>Add Horse</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Fixed Horse Dropdown Options */}
              {showHorseDropdown && availableHorses.length > 0 && (
                <View style={styles.dropdownOptions}>
                  <ScrollView
                    style={styles.dropdownScrollView}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                  >
                    {availableHorses.map((horse) => (
                      <TouchableOpacity
                        key={horse.horse_id}
                        style={styles.dropdownOption}
                        onPress={() => {
                          setSelectedHorse(horse.horse_name);
                          setShowHorseDropdown(false);
                        }}
                        disabled={isRescheduling}
                      >
                        <View style={styles.dropdownOptionContent}>
                          <FontAwesome5 name="horse" size={16} color="#CD853F" />
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
            </View>

            {/* Select Service */}
            <View style={styles.formGroup}>
              <View style={styles.formLabelContainer}>
                <FontAwesome5 name="stethoscope" size={16} color="#CD853F" />
                <Text style={styles.formLabel}>Select Service</Text>
              </View>
              <TouchableOpacity
                style={[styles.dropdown, showServiceDropdown && styles.dropdownActive]}
                onPress={() => setShowServiceDropdown(!showServiceDropdown)}
                disabled={isRescheduling}
              >
                <View style={styles.dropdownContentWithIcon}>
                  <FontAwesome5 
                    name={services.find(s => s.name === selectedService)?.icon || 'stethoscope'} 
                    size={16} 
                    color="#CD853F" 
                  />
                  <Text style={styles.dropdownText}>{selectedService}</Text>
                </View>
                <FontAwesome5 
                  name={showServiceDropdown ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color="#666" 
                />
              </TouchableOpacity>

              {/* Service Dropdown Options */}
              {showServiceDropdown && (
                <View style={styles.dropdownOptions}>
                  <ScrollView
                    style={styles.dropdownScrollView}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                  >
                    {services.map((serviceItem) => (
                      <TouchableOpacity
                        key={serviceItem.name}
                        style={styles.dropdownOption}
                        onPress={() => {
                          setSelectedService(serviceItem.name);
                          setShowServiceDropdown(false);
                        }}
                        disabled={isRescheduling}
                      >
                        <View style={styles.dropdownOptionContent}>
                          <FontAwesome5 name={serviceItem.icon} size={16} color="#CD853F" />
                          <Text style={styles.dropdownOptionText}>{serviceItem.name}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Enhanced Choose Date */}
            <View style={styles.formGroup}>
              <View style={styles.formLabelContainer}>
                <FontAwesome5 name="calendar-alt" size={16} color="#CD853F" />
                <Text style={styles.formLabel}>Choose New Date</Text>
                {availableDateObjects.length > 0 && (
                  <View style={styles.availabilityBadge}>
                    <Text style={styles.availabilityBadgeText}>
                      {availableDateObjects.length}
                    </Text>
                  </View>
                )}
              </View>

              {/* Show different UI based on available dates */}
              {availableDateObjects.length === 0 ? (
                <View style={styles.noAvailableDatesContainer}>
                  <FontAwesome5 name="calendar-times" size={40} color="#CD853F" style={{ opacity: 0.5 }} />
                  <Text style={styles.noAvailableDatesTitle}>No Available Dates</Text>
                  <Text style={styles.noAvailableDatesText}>
                    This veterinarian currently has no available appointment dates for rescheduling.
                  </Text>
                </View>
              ) : (
                renderCustomDatePicker()
              )}
            </View>

            {/* Enhanced Choose Time */}
            <View style={styles.formGroup}>
              <View style={styles.formLabelContainer}>
                <FontAwesome5 name="clock" size={16} color="#CD853F" />
                <Text style={styles.formLabel}>Choose New Time</Text>
                {selectedTimeSlot && (
                  <View style={styles.selectedTimeBadge}>
                    <FontAwesome5 name="check" size={10} color="#fff" />
                  </View>
                )}
              </View>
              {renderTimeSlots()}
            </View>

            {/* Enhanced Add Notes */}
            <View style={styles.formGroup}>
              <View style={styles.formLabelContainer}>
                <FontAwesome5 name="sticky-note" size={16} color="#CD853F" />
                <Text style={styles.formLabel}>Update Notes (Optional)</Text>
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
                  editable={!isRescheduling}
                />
              </View>
            </View>

            {/* Enhanced Confirm Button */}
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (isRescheduling || availableDateObjects.length === 0 || !selectedTimeSlot) && styles.confirmButtonDisabled
              ]}
              onPress={confirmReschedule}
              disabled={isRescheduling || availableDateObjects.length === 0 || !selectedTimeSlot}
            >
              <View style={styles.confirmButtonContent}>
                {isRescheduling ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.confirmButtonText}>Rescheduling...</Text>
                  </>
                ) : (
                  <>
                    <FontAwesome5 name="calendar-check" size={16} color="#fff" />
                    <Text style={styles.confirmButtonText}>
                      {availableDateObjects.length === 0 ? 'No Available Dates' : 
                       !selectedTimeSlot ? 'Select Time Slot' : 'Confirm Reschedule'}
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

// Enhanced styles with new components
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
  // New reschedule info card
  rescheduleInfoCard: {
    margin: 20,
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  rescheduleInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rescheduleInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginLeft: 8,
  },
  rescheduleInfoText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  remainingTimeText: {
    fontSize: 12,
    color: '#d63031',
    fontWeight: '600',
    marginTop: 4,
  },
  // Original appointment info card
  originalAppointmentCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#e8f4f8',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#b2dfdb',
  },
  originalAppointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  originalAppointmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00695c',
    marginLeft: 8,
  },
  originalAppointmentDetails: {
    gap: 6,
  },
  originalAppointmentText: {
    fontSize: 14,
    color: '#004d40',
    lineHeight: 20,
  },
  formContainer: {
    paddingHorizontal: 20,
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
  availabilityBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  availabilityBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedTimeBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  // Custom Date Picker Styles
  customDatePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  datePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  dateScrollContainer: {
    paddingVertical: 4,
  },
  dateOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateOptionSelected: {
    borderColor: '#CD853F',
    backgroundColor: '#CD853F',
  },
  dateOptionDay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  dateOptionDaySelected: {
    color: '#fff',
  },
  dateOptionMonth: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 2,
  },
  dateOptionMonthSelected: {
    color: 'rgba(255,255,255,0.9)',
  },
  dateOptionWeekday: {
    fontSize: 10,
    color: '#999',
    fontWeight: '500',
  },
  dateOptionWeekdaySelected: {
    color: 'rgba(255,255,255,0.8)',
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
    fontSize: 14,
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
});

export default RescheduleScreen;