// Fixed Hbook.tsx - Resolved infinite loading/loop issue

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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

interface Horse {
  horse_id: string;
  horse_name: string;
  horse_breed: string;
  horse_age: number;
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

// const API_BASE_URL = "http://10.160.169.148:8000/api/horse_operator";
// const API_BASE_URL = "http://192.168.101.4:8000/api/horse_operator"
const API_BASE_URL = "http://192.168.101.2:8000/api/horse_operator"

// Available services with icons
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

// Utility function to check if two dates are the same day
const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.toISOString().split('T')[0] === date2.toISOString().split('T')[0];
};

const Hbook = () => {
  const [availableHorses, setAvailableHorses] = useState<Horse[]>([]);
  const [vetSchedule, setVetSchedule] = useState<ScheduleSlot[]>([]);
  const [availableDateObjects, setAvailableDateObjects] = useState<Date[]>([]);
  const [availableTimesForDate, setAvailableTimesForDate] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBookingAppointment, setIsBookingAppointment] = useState(false);
  
  // Form states
  const [selectedHorse, setSelectedHorse] = useState('Select a horse');
  const [showHorseDropdown, setShowHorseDropdown] = useState(false);
  const [selectedService, setSelectedService] = useState('General Consultation');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<ScheduleSlot | null>(null);
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Get parameters passed from Hvetprofile
  const vetId = params.vetId as string;
  const vetName = params.vetName as string;
  const vetAvatar = params.vetAvatar as string;
  const vetSpecialization = params.vetSpecialization as string;
  const vetExperience = params.vetExperience as string;

  // FIXED: Update available times when date changes - Stable function with no dependencies that change
  const updateAvailableTimesForDate = useCallback((dateString: string, scheduleData?: ScheduleSlot[]) => {
    // Use the provided scheduleData or fall back to current vetSchedule
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // FIXED: Empty dependency array since we're using the callback parameter

  // FIXED: Get current user ID - Stable function that doesn't cause re-renders
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

  // FIXED: Stable function for fetching horses
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
  }, []); // FIXED: Empty dependency array

  // FIXED: Stable function for fetching schedule
  const fetchVetSchedule = useCallback(async () => {
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
        .map((item: any) => {
          const formattedStartTime = formatTimeTo12Hour(item.start_time);
          const formattedEndTime = formatTimeTo12Hour(item.end_time);
          const timeDisplay = formatTimeRange(item.start_time, item.end_time);
          
          return {
            sched_id: item.sched_id,
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
      
      // Convert date strings to Date objects for DateTimePicker
      const dateObjects = (uniqueDates as string[]).map((dateString: string) => new Date(dateString));
      setAvailableDateObjects(dateObjects);
      
      if (uniqueDates.length > 0) {
        const firstDate = new Date(uniqueDates[0] as string);
        setSelectedDate(firstDate);
        // Call updateAvailableTimesForDate with the new schedule data directly
        updateAvailableTimesForDate(uniqueDates[0] as string, transformedSchedule);
      } else if (uniqueDates.length === 0) {
        Alert.alert(
          'No Available Appointments', 
          'This veterinarian has no available appointment slots at the moment. Please try again later or select a different veterinarian.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
      
    } catch (error) {
      console.error("Error fetching vet schedule:", error);
      Alert.alert("Error", "Unable to load veterinarian schedule");
    }
  }, [vetId, updateAvailableTimesForDate, router]);

  // FIXED: Main useEffect with proper dependency management to prevent infinite loops
  useEffect(() => {
    let isMounted = true;
    let hasLoaded = false; // CRITICAL: Prevent multiple simultaneous loads

    const loadData = async () => {
      if (hasLoaded || !isMounted) return; // CRITICAL: Exit if already loading/loaded
      hasLoaded = true;
      
      console.log('Starting data load...');
      setLoading(true);
      
      try {
        // Get user ID first
        const userId = await getCurrentUserId();
        
        if (!isMounted || !userId) return;

        // Set the user ID in state
        setCurrentUserId(userId);
        
        // Fetch horses and schedule in parallel
        await Promise.all([
          fetchHorses(userId),
          fetchVetSchedule()
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

    // Cleanup function to prevent state updates if component unmounts
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vetId]); // FIXED: Only vetId as dependency since it comes from params and is stable

  // Separate useEffect for updating times when vetSchedule changes
  useEffect(() => {
    if (selectedDate && vetSchedule.length > 0) {
      updateAvailableTimesForDate(selectedDate.toISOString().split('T')[0], vetSchedule);
    }
  }, [vetSchedule, selectedDate, updateAvailableTimesForDate]);

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

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
                  disabled={isBookingAppointment}
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
      fetchVetSchedule();
    }
  };

  // Confirm appointment booking
  const confirmAppointment = async () => {
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

    if (isScheduleSlotInPast(selectedTimeSlot.sched_date, selectedTimeSlot.start_time)) {
      Alert.alert('Error', 'The selected time slot has passed. Please select a current or future time slot.');
      fetchVetSchedule();
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

      const bookingData = {
        user_id: userId,
        vet_id: vetId,
        horse_id: selectedHorseData.horse_id,
        date: selectedDate.toISOString().split('T')[0],
        time: selectedTimeSlot.time_display,
        service: selectedService,
        notes: appointmentNotes,
        sched_id: selectedTimeSlot.sched_id
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
          `Your appointment has been scheduled successfully!\n\nVeterinarian: ${vetName}\nHorse: ${selectedHorse}\nDate: ${formatDate(selectedDate)}\nTime: ${selectedTimeSlot.time_display}\nService: ${selectedService}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to Calendar page instead of going back
                router.push('/HORSE_OPERATOR/Hcalendar');
                // Alternative: If you want to replace the current page entirely, use:
                // router.replace('/HORSE_OPERATOR/Hcalendar');
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
          fetchVetSchedule();
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert('Booking Error', errorMessage);
    } finally {
      setIsBookingAppointment(false);
    }
  };

  // Enhanced time slots rendering with better design
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
                  disabled={isBookingAppointment}
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
            <Text style={styles.headerSubtitle}>Schedule with {vetName}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          {/* Enhanced Veterinarian Info */}
          <View style={styles.vetInfoCard}>
            <View style={styles.vetInfo}>
              <View style={styles.vetImageContainer}>
                <Image
                  source={{ uri: vetAvatar }}
                  style={styles.vetImage}
                />
                <View style={styles.vetStatusBadge}>
                  <FontAwesome5 name="check" size={8} color="#fff" />
                </View>
              </View>
              <View style={styles.vetDetails}>
                <Text style={styles.vetName}>{vetName}</Text>
                <View style={styles.vetSpecializationContainer}>
                  <FontAwesome5 name="user-md" size={12} color="#CD853F" />
                  <Text style={styles.vetSpecialization}>{vetSpecialization}</Text>
                </View>
                <View style={styles.vetExperienceContainer}>
                  <FontAwesome5 name="award" size={12} color="#666" />
                  <Text style={styles.vetExperience}>{vetExperience} years of experience</Text>
                </View>
              </View>
            </View>
          </View>

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
              ) : (
                <View style={styles.noHorsesContainer}>
                  <FontAwesome5 name="horse" size={24} color="#CD853F" />
                  <Text style={styles.noHorsesText}>No horses available</Text>
                  <TouchableOpacity
                    style={styles.addHorseButton}
                    onPress={() => router.push('/HORSE_OPERATOR/addhorse')}
                    disabled={isBookingAppointment}
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
                        disabled={isBookingAppointment}
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
                disabled={isBookingAppointment}
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
                        disabled={isBookingAppointment}
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
                <Text style={styles.formLabel}>Choose Available Date</Text>
                {availableDateObjects.length > 0 && (
                  <View style={styles.availabilityBadge}>
                    <Text style={styles.availabilityBadgeText}>
                      {availableDateObjects.length}
                    </Text>
                  </View>
                )}
              </View>

              {/* Show different UI based on platform and available dates */}
              {availableDateObjects.length === 0 ? (
                <View style={styles.noAvailableDatesContainer}>
                  <FontAwesome5 name="calendar-times" size={40} color="#CD853F" style={{ opacity: 0.5 }} />
                  <Text style={styles.noAvailableDatesTitle}>No Available Dates</Text>
                  <Text style={styles.noAvailableDatesText}>
                    This veterinarian currently has no available appointment dates.
                  </Text>
                </View>
              ) : Platform.OS === 'android' ? (
                // Android: Show custom date picker with only available dates
                renderCustomDatePicker()
              ) : (
                // iOS: Show button + modal with restricted DateTimePicker
                <>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowDatePicker(true)}
                    disabled={isBookingAppointment}
                  >
                    <View style={styles.datePickerContent}>
                      <FontAwesome5 name="calendar-alt" size={18} color="#CD853F" />
                      <Text style={[
                        styles.datePickerText,
                        !selectedDate && styles.datePickerPlaceholder
                      ]}>
                        {selectedDate ? formatDate(selectedDate) : 'Select an available date'}
                      </Text>
                    </View>
                    <FontAwesome5 name="chevron-down" size={16} color="#666" />
                  </TouchableOpacity>
                  
                  {/* Show available dates preview for iOS */}
                  <View style={styles.availableDatesPreview}>
                    <Text style={styles.availableDatesPreviewText}>
                      Available: {availableDateObjects.map(date => 
                        date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      ).join(', ')}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Enhanced Choose Time */}
            <View style={styles.formGroup}>
              <View style={styles.formLabelContainer}>
                <FontAwesome5 name="clock" size={16} color="#CD853F" />
                <Text style={styles.formLabel}>Choose Available Time</Text>
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
                <Text style={styles.formLabel}>Chief Complain</Text>
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
          </View>
        </ScrollView>

        {/* Enhanced iOS Date Picker Modal */}
        {Platform.OS === 'ios' && showDatePicker && availableDateObjects.length > 0 && (
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity
                  style={styles.datePickerCancelButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.datePickerButtonText}>Cancel</Text>
                </TouchableOpacity>
                <View style={styles.datePickerTitleContainer}>
                  <FontAwesome5 name="calendar-alt" size={16} color="#CD853F" />
                  <Text style={styles.datePickerTitle}>Select Available Date</Text>
                </View>
                <TouchableOpacity
                  style={styles.datePickerDoneButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={[styles.datePickerButtonText, styles.datePickerDoneText]}>Done</Text>
                </TouchableOpacity>
              </View>
              
              {/* Show available dates info */}
              <View style={styles.availableDatesInfo}>
                <Text style={styles.availableDatesText}>
                  {availableDateObjects.length} available date{availableDateObjects.length !== 1 ? 's' : ''}
                </Text>
                <Text style={styles.availableDatesSubText}>
                  Only dates with appointments can be selected
                </Text>
              </View>
              
              {/* Custom date selector for iOS */}
              <ScrollView style={styles.iosDateSelector}>
                {availableDateObjects.sort((a, b) => a.getTime() - b.getTime()).map((dateObj, index) => {
                  const isSelected = selectedDate && isSameDay(dateObj, selectedDate);
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.iosDateOption,
                        isSelected && styles.iosDateOptionSelected
                      ]}
                      onPress={() => {
                        setSelectedDate(dateObj);
                        updateAvailableTimesForDate(dateObj.toISOString().split('T')[0], vetSchedule);
                      }}
                    >
                      <View style={styles.iosDateOptionContent}>
                        <View style={styles.iosDateOptionLeft}>
                          <Text style={[
                            styles.iosDateOptionDay,
                            isSelected && styles.iosDateOptionDaySelected
                          ]}>
                            {dateObj.toLocaleDateString('en-US', { weekday: 'long' })}
                          </Text>
                          <Text style={[
                            styles.iosDateOptionDate,
                            isSelected && styles.iosDateOptionDateSelected
                          ]}>
                            {dateObj.toLocaleDateString('en-US', { 
                              month: 'long', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </Text>
                        </View>
                        {isSelected && (
                          <FontAwesome5 name="check-circle" size={20} color="#CD853F" />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

// Enhanced styles with new date picker components
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
  vetInfoCard: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
  // Custom Date Picker Styles (Android)
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
  // iOS Date Picker Styles
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
  availableDatesPreview: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  availableDatesPreviewText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  datePickerModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  datePickerCancelButton: {
    padding: 4,
  },
  datePickerDoneButton: {
    padding: 4,
  },
  datePickerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#CD853F',
  },
  datePickerDoneText: {
    fontWeight: '600',
  },
  availableDatesInfo: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f8f9fa',
  },
  availableDatesText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    fontWeight: '600',
  },
  availableDatesSubText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  iosDateSelector: {
    maxHeight: 300,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  iosDateOption: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iosDateOptionSelected: {
    backgroundColor: '#f8f9fa',
  },
  iosDateOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iosDateOptionLeft: {
    flex: 1,
  },
  iosDateOptionDay: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  iosDateOptionDaySelected: {
    color: '#CD853F',
  },
  iosDateOptionDate: {
    fontSize: 14,
    color: '#666',
  },
  iosDateOptionDateSelected: {
    color: '#CD853F',
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

export default Hbook;