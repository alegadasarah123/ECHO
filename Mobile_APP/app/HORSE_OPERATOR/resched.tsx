import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
Modal,
Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Appointment {
id: string;
contactId: string;
contactName: string;
horseName: string;
service: string;
date: string; // ISO date string
time: string;
notes?: string;
status: 'scheduled' | 'completed' | 'cancelled';
}

interface Horse {
id: string;
name: string;
age: string;
breed: string;
color: string;
}

const RescheduleScreen = () => {
const router = useRouter();
const params = useLocalSearchParams();
const originalAppointment: Appointment | null = params.appointment
  ? JSON.parse(params.appointment as string)
  : null;

// State variables are initialized with default values or values from originalAppointment
const [selectedHorse, setSelectedHorse] = useState('');
const [selectedService, setSelectedService] = useState('Routine Check-up');
const [selectedTime, setSelectedTime] = useState('9:00 AM');
const [selectedDate, setSelectedDate] = useState(new Date());
const [appointmentNotes, setAppointmentNotes] = useState('');
const [availableHorses, setAvailableHorses] = useState<Horse[]>([]);

const [showDatePicker, setShowDatePicker] = useState(false);
const [showHorseDropdown, setShowHorseDropdown] = useState(false);
const [showServiceDropdown, setShowServiceDropdown] = useState(false);

const defaultDate = useMemo(() => {
  if (originalAppointment && originalAppointment.date) {
    return new Date(originalAppointment.date);
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}, [originalAppointment]);

// This useEffect populates the form fields with the original appointment data
useEffect(() => {
  if (originalAppointment) {
    setSelectedHorse(originalAppointment.horseName);
    setSelectedService(originalAppointment.service);
    setSelectedTime(originalAppointment.time);
    setSelectedDate(new Date(originalAppointment.date));
    setAppointmentNotes(originalAppointment.notes || '');
  } else {
    setSelectedDate(defaultDate);
  }
}, [originalAppointment, defaultDate]);

const formatDate = useCallback((date: Date) => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}, []);

const loadUserHorses = useCallback(async () => {
  try {
    const user = await AsyncStorage.getItem('current_user');
    if (!user) return;

    const userHorsesKey = `horses_${user}`;
    const storedHorses = await AsyncStorage.getItem(userHorsesKey);

    if (storedHorses) {
      const horses: Horse[] = JSON.parse(storedHorses);
      setAvailableHorses(horses);
      if (!selectedHorse || !horses.some(h => h.name === selectedHorse)) {
        if (horses.length > 0) {
          setSelectedHorse(horses[0].name);
        }
      }
    } else {
      setAvailableHorses([]);
    }
  } catch (error) {
    console.error('Error loading user horses:', error);
    setAvailableHorses([]);
  }
}, [selectedHorse]);

useEffect(() => {
  loadUserHorses();
}, [loadUserHorses]);

const handleDateChange = useCallback((event: any, date?: Date) => {
  if (Platform.OS === 'android') {
    setShowDatePicker(false);
  }
  if (date) {
    setSelectedDate(date);
  }
}, []);

// This function handles saving the *edited* appointment details
const confirmReschedule = useCallback(async () => {
  if (!originalAppointment) {
    Alert.alert('Error', 'Original appointment details are missing.');
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
            router.push('/addhorse');
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

  // Create an updated appointment object with the new values from state
  const updatedAppointment: Appointment = {
    ...originalAppointment, // Keep the original ID and contact info
    horseName: selectedHorse,
    service: selectedService,
    date: selectedDate.toISOString().split('T')[0], // YYYY-MM-DD format
    time: selectedTime,
    notes: appointmentNotes,
    status: 'scheduled', // Assuming rescheduling sets status back to scheduled
  };

  try {
    const existingAppointments = await AsyncStorage.getItem('appointments');
    let appointments: Appointment[] = [];

    if (existingAppointments) {
      appointments = JSON.parse(existingAppointments);
    }

    // Find the original appointment by ID and replace it with the updated one
    const index = appointments.findIndex(apt => apt.id === originalAppointment.id);
    if (index !== -1) {
      appointments[index] = updatedAppointment;
    } else {
      // Fallback: if not found (shouldn't happen for existing appointments), add it
      appointments.push(updatedAppointment);
    }

    await AsyncStorage.setItem('appointments', JSON.stringify(appointments));

    Alert.alert(
      'Reschedule Confirmed',
      `Your appointment for ${originalAppointment.horseName} has been rescheduled.\n\nDate: ${formatDate(
        selectedDate
      )}\nTime: ${selectedTime}\nHorse: ${selectedHorse}\nService: ${selectedService}${
        appointmentNotes ? `\nNotes: ${appointmentNotes}` : ''
      }`,
      [
        {
          text: 'OK',
          onPress: () => {
            router.back(); // Go back to the calendar screen
          },
        },
      ]
    );
  } catch (error) {
    console.error('Error saving rescheduled appointment:', error);
    Alert.alert('Error', 'Failed to reschedule appointment. Please try again.');
  }
}, [
  originalAppointment,
  availableHorses,
  selectedDate,
  selectedTime,
  selectedHorse,
  selectedService,
  appointmentNotes,
  formatDate,
  router,
]);

const handleBack = useCallback(() => {
  router.back();
}, [router]);

const timeSlots = ['9:00 AM', '10:00 AM', '10:30 AM', '2:00 PM', '3:00 PM', '4:00 PM'];
const services = ['Routine Check-up', 'Vaccination', 'Emergency Care', 'Dental Care', 'Surgery'];

return (
  <SafeAreaView style={styles.safeArea}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <FontAwesome5 name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reschedule Appointment</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Form Content */}
      <ScrollView style={styles.formContent}>
        <View style={styles.formContainer}>
          {/* Select Horse */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Select Horse</Text>
            {availableHorses.length > 0 ? (
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowHorseDropdown(!showHorseDropdown)}
              >
                <Text style={styles.dropdownText}>{selectedHorse}</Text>
                <FontAwesome5 name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            ) : (
              <View style={styles.noHorsesContainer}>
                <Text style={styles.noHorsesText}>No horses available</Text>
                <TouchableOpacity
                  style={styles.addHorseButton}
                  onPress={() => {
                    router.push('/addhorse');
                  }}
                >
                  <Text style={styles.addHorseButtonText}>Add Horse</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Horse Dropdown Options - Now Scrollable */}
            {showHorseDropdown && availableHorses.length > 0 && (
              <View style={styles.dropdownOptions}>
                <ScrollView
                  style={styles.dropdownScrollView}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                >
                  {availableHorses.map(horse => (
                    <TouchableOpacity
                      key={horse.id}
                      style={styles.dropdownOption}
                      onPress={() => {
                        setSelectedHorse(horse.name);
                        setShowHorseDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownOptionText}>{horse.name}</Text>
                      <Text style={styles.dropdownOptionSubtext}>
                        {horse.breed} • {horse.age} years old
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Select Service */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Select Service</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowServiceDropdown(!showServiceDropdown)}
            >
              <Text style={styles.dropdownText}>{selectedService}</Text>
              <FontAwesome5 name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>

            {/* Service Dropdown Options - Now Scrollable */}
            {showServiceDropdown && (
              <View style={styles.dropdownOptions}>
                <ScrollView
                  style={styles.dropdownScrollView}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                >
                  {services.map(service => (
                    <TouchableOpacity
                      key={service}
                      style={styles.dropdownOption}
                      onPress={() => {
                        setSelectedService(service);
                        setShowServiceDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownOptionText}>{service}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Choose Date */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Choose Date</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <FontAwesome5 name="calendar-alt" size={20} color="#CD853F" />
              <Text style={styles.datePickerText}>{formatDate(selectedDate)}</Text>
              <FontAwesome5 name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Choose Time */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Choose Time</Text>
            <View style={styles.timeSlots}>
              {timeSlots.map(time => (
                <TouchableOpacity
                  key={time}
                  style={styles.timeSlot}
                  onPress={() => setSelectedTime(time)}
                >
                  <View
                    style={[
                      styles.radioButton,
                      selectedTime === time && styles.radioButtonSelected,
                    ]}
                  >
                    {selectedTime === time && <View style={styles.radioButtonInner} />}
                  </View>
                  <Text style={styles.timeSlotText}>{time}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Add Notes */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Add Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Enter any additional notes..."
              value={appointmentNotes}
              onChangeText={setAppointmentNotes}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />
          </View>

          {/* Confirm Button */}
          <TouchableOpacity style={styles.confirmButton} onPress={confirmReschedule}>
            <Text style={styles.confirmButtonText}>Confirm Reschedule</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()} // Prevent selecting past dates
          maximumDate={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)} // 90 days from now
        />
      )}
      {/* iOS Date Picker Modal */}
      {Platform.OS === 'ios' && showDatePicker && (
        <Modal transparent={true} animationType="slide" visible={showDatePicker}>
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.datePickerButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Select Date</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={[styles.datePickerButtonText, styles.datePickerDoneButton]}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                minimumDate={new Date()}
                maximumDate={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)}
                style={styles.datePickerIOS}
              />
            </View>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  </SafeAreaView>
);
};

const styles = StyleSheet.create({
safeArea: {
  flex: 1,
  backgroundColor: '#CD853F',
},
container: {
  flex: 1,
},
header: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 20,
  paddingVertical: 15,
  backgroundColor: '#CD853F',
},
backButton: {
  width: 40,
  height: 40,
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 10,
},
headerTitle: {
  flex: 1,
  fontSize: 20,
  fontWeight: 'bold',
  color: '#fff',
  textAlign: 'center',
},
headerSpacer: {
  width: 40, // To balance the back button on the left
},
formContent: {
  flex: 1,
  backgroundColor: '#fff',
  borderTopLeftRadius: 30,
  borderTopRightRadius: 30,
},
formContainer: {
  padding: 20,
},
formGroup: {
  marginBottom: 20,
},
formLabel: {
  fontSize: 16,
  fontWeight: '600',
  color: '#CD853F',
  marginBottom: 8,
},
dropdown: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#fff',
  borderRadius: 10,
  paddingHorizontal: 15,
  paddingVertical: 12,
  borderWidth: 1,
  borderColor: '#e0e0e0',
},
dropdownText: {
  fontSize: 16,
  color: '#333',
},
dropdownOptions: {
  backgroundColor: '#fff',
  borderRadius: 10,
  marginTop: 5,
  borderWidth: 1,
  borderColor: '#e0e0e0',
  maxHeight: 200,
  overflow: 'hidden',
},
dropdownScrollView: {
  maxHeight: 200,
},
dropdownOption: {
  paddingHorizontal: 15,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#f0f0f0',
},
dropdownOptionText: {
  fontSize: 16,
  color: '#333',
  fontWeight: '500',
},
dropdownOptionSubtext: {
  fontSize: 14,
  color: '#666',
  marginTop: 2,
},
noHorsesContainer: {
  backgroundColor: '#f9f9f9',
  borderRadius: 10,
  padding: 20,
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#e0e0e0',
},
noHorsesText: {
  fontSize: 16,
  color: '#666',
  marginBottom: 10,
},
addHorseButton: {
  backgroundColor: '#CD853F',
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderRadius: 8,
},
addHorseButtonText: {
  color: '#fff',
  fontSize: 14,
  fontWeight: '600',
},
// Date Picker Styles
datePickerButton: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#fff',
  borderRadius: 10,
  paddingHorizontal: 15,
  paddingVertical: 12,
  borderWidth: 1,
  borderColor: '#e0e0e0',
},
datePickerText: {
  flex: 1,
  fontSize: 16,
  color: '#333',
  marginLeft: 10,
},
// iOS Date Picker Modal Styles
datePickerModal: {
  flex: 1,
  justifyContent: 'flex-end',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
},
datePickerContainer: {
  backgroundColor: '#fff',
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
},
datePickerHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 20,
  paddingVertical: 15,
  borderBottomWidth: 1,
  borderBottomColor: '#e0e0e0',
},
datePickerTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#333',
},
datePickerButtonText: {
  fontSize: 16,
  color: '#007AFF',
},
datePickerDoneButton: {
  fontWeight: 'bold',
},
datePickerIOS: {
  height: 200,
},
timeSlots: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 15,
},
timeSlot: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 10,
},
radioButton: {
  width: 20,
  height: 20,
  borderRadius: 10,
  borderWidth: 2,
  borderColor: '#CD853F',
  marginRight: 10,
  justifyContent: 'center',
  alignItems: 'center',
},
radioButtonSelected: {
  backgroundColor: '#CD853F',
},
radioButtonInner: {
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: '#fff',
},
timeSlotText: {
  fontSize: 16,
  color: '#333',
},
notesInput: {
  backgroundColor: '#fff',
  borderRadius: 10,
  paddingHorizontal: 15,
  paddingVertical: 12,
  borderWidth: 1,
  borderColor: '#e0e0e0',
  fontSize: 16,
  color: '#333',
  textAlignVertical: 'top',
  minHeight: 100,
},
confirmButton: {
  backgroundColor: '#CD853F',
  borderRadius: 10,
  paddingVertical: 15,
  alignItems: 'center',
  marginTop: 20,
},
confirmButtonText: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#fff',
},
});

export default RescheduleScreen;
