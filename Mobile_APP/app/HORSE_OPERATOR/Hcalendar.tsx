import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, // Removed Button as it was not used
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
// Removed 'react-native-get-random-values' as it's not needed in Next.js environment
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

interface Appointment {
  id: string;
  userId: string; // NEW: Link to the user
  contactId: string;
  contactName: string;
  horseName: string;
  service: string;
  date: string; // ISO date string
  time: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

// Define the structure of the user data we expect from AsyncStorage
interface CurrentUserData {
  username: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  // Add other fields if needed for contactName
}

const CalendarScreen = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeTab, setActiveTab] = useState('calendar');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUserData | null>(null); // NEW: State for current user
  const router = useRouter();

  // Load current user data
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const userDataJson = await AsyncStorage.getItem('current_user_data');
        if (userDataJson) {
          setCurrentUser(JSON.parse(userDataJson));
        } else {
          console.warn('No current user data found in AsyncStorage.');
        }
      } catch (error) {
        console.error('Error loading current user data:', error);
      }
    };
    loadCurrentUser();
  }, []);

  // Load appointments from AsyncStorage, filtered by current user
  const loadAppointments = useCallback(async () => {
    if (!currentUser?.username) {
      // Don't load appointments if no user is logged in
      setAppointments([]);
      return;
    }
    try {
      const savedAppointments = await AsyncStorage.getItem('appointments');
      if (savedAppointments) {
        const allAppointments: Appointment[] = JSON.parse(savedAppointments);
        // Filter appointments by the current user's ID
        const userAppointments = allAppointments.filter(
          (apt) => apt.userId === currentUser.username
        );
        setAppointments(userAppointments);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  }, [currentUser]); // Re-run when currentUser changes

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Get calendar data for current month
  const getCalendarData = useCallback(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(firstDay.getDate() + mondayOffset);

    const days = [];
    const currentDateForLoop = new Date(startDate);
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDateForLoop));
      currentDateForLoop.setDate(currentDateForLoop.getDate() + 1);
    }
    return { days, firstDay, lastDay };
  }, [currentDate]);

  // Check if a date has appointments
  const hasAppointments = useCallback(
    (date: Date) => {
      const dateString = date.toISOString().split('T')[0];
      return appointments.some((apt) => apt.date === dateString);
    },
    [appointments]
  );

  // Navigate to previous month
  const goToPreviousMonth = useCallback(() => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  // Navigate to next month
  const goToNextMonth = useCallback(() => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  // Format month and year for calendar header
  const formatMonthYear = useCallback((date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, []);

  // Get day abbreviation for appointment list (e.g., "Sun")
  const getDayAbbreviation = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }, []);

  // Get day number for appointment list (e.g., "10")
  const getDayNumber = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.getDate();
  }, []);

  // Check if date is today
  const isToday = useCallback((date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }, []);

  // Check if date is in current month
  const isCurrentMonth = useCallback(
    (date: Date) => {
      return date.getMonth() === currentDate.getMonth();
    },
    [currentDate]
  );

  // Get upcoming appointments (next 7 days)
  const getUpcomingAppointments = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to start of day
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    nextWeek.setHours(23, 59, 59, 999); // Normalize nextWeek to end of day

    return appointments
      .filter((apt) => {
        const aptDate = new Date(apt.date);
        return aptDate >= today && aptDate <= nextWeek;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [appointments]);

  // Delete appointment
  const deleteAppointment = useCallback(
    async (appointmentId: string) => {
      Alert.alert('Cancel Appointment', 'Are you sure you want to cancel this appointment?', [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              // Get all appointments (not just current user's) to update the global list
              const allSavedAppointmentsJson = await AsyncStorage.getItem('appointments');
              const allSavedAppointments: Appointment[] = allSavedAppointmentsJson
                ? JSON.parse(allSavedAppointmentsJson)
                : [];

              const updatedAllAppointments = allSavedAppointments.filter(
                (apt) => apt.id !== appointmentId
              );
              await AsyncStorage.setItem('appointments', JSON.stringify(updatedAllAppointments));

              // Update local state with filtered list for the current user
              setAppointments(updatedAllAppointments.filter(apt => apt.userId === currentUser?.username));
              setSelectedAppointment(null); // Close details if deleted
            } catch (error) {
              console.error('Error deleting appointment:', error);
            }
          },
        },
      ]);
    },
    [currentUser] // Removed 'appointments' as it's not directly used from the closure here
  );

  // Handle appointment card press
  const handleAppointmentPress = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
  }, []);

  const handleBackToCalendar = useCallback(() => {
    setSelectedAppointment(null);
  }, []);

  const handleReschedule = () => {
    if (selectedAppointment) {
      router.push({
        pathname: '/resched',
        params: { appointment: JSON.stringify(selectedAppointment) },
      });
    }
  };

  // NEW: Function to add a dummy appointment for the current user
  const addDummyAppointment = async () => {
    if (!currentUser?.username) {
      Alert.alert('Error', 'Please log in to add appointments.');
      return;
    }

    const newAppointment: Appointment = {
      id: uuidv4(),
      userId: currentUser.username, // Assign current user's ID
      contactId: 'vet123', // Dummy vet ID
      contactName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Unknown Vet', // Use current user's name
      horseName: 'Spirit', // Dummy horse name
      service: 'Routine Check-up',
      date: new Date().toISOString().split('T')[0], // Today's date
      time: '10:00 AM',
      notes: 'First check-up for Spirit.',
      status: 'scheduled',
    };

    try {
      const savedAppointments = await AsyncStorage.getItem('appointments');
      const allAppointments: Appointment[] = savedAppointments ? JSON.parse(savedAppointments) : [];
      const updatedAppointments = [...allAppointments, newAppointment];
      await AsyncStorage.setItem('appointments', JSON.stringify(updatedAppointments));
      loadAppointments(); // Reload appointments to show the new one
      Alert.alert('Success', 'Dummy appointment added!');
    } catch (error) {
      console.error('Error adding dummy appointment:', error);
      Alert.alert('Error', 'Failed to add appointment.');
    }
  };

  const { days } = getCalendarData();
  const upcomingAppointments = getUpcomingAppointments();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        {selectedAppointment ? (
          <TouchableOpacity onPress={handleBackToCalendar} style={styles.backArrowButton}>
            <FontAwesome5 name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
        ) : null}
        <Text style={styles.headerTitle}>
          {selectedAppointment ? 'Appointment Details' : 'Calendar'}
        </Text>
        {/* Add a button to add dummy appointment for testing */}
        {!selectedAppointment && currentUser && (
          <TouchableOpacity onPress={addDummyAppointment} style={styles.addButton}>
            <FontAwesome5 name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {!selectedAppointment ? (
          <View>
            {/* Calendar */}
            <View style={styles.calendarContainer}>
              {/* Month Navigation */}
              <View style={styles.monthNavigation}>
                <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
                  <FontAwesome5 name="chevron-left" size={16} color="#CD853F" />
                </TouchableOpacity>
                <Text style={styles.monthYear}>{formatMonthYear(currentDate)}</Text>
                <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
                  <FontAwesome5 name="chevron-right" size={16} color="#CD853F" />
                </TouchableOpacity>
              </View>

              {/* Day Headers */}
              <View style={styles.dayHeaders}>
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
                  <Text key={day} style={styles.dayHeader}>
                    {day}
                  </Text>
                ))}
              </View>

              {/* Calendar Grid */}
              <View style={styles.calendarGrid}>
                {days.map((day, index) => {
                  const hasApt = hasAppointments(day);
                  const isCurrentMonthDay = isCurrentMonth(day);
                  const isTodayDate = isToday(day);
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dayCell,
                        isTodayDate && styles.todayCell,
                        hasApt && styles.appointmentCell,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          !isCurrentMonthDay && styles.otherMonthText,
                          isTodayDate && styles.todayText,
                          hasApt && styles.appointmentText,
                        ]}
                      >
                        {day.getDate()}
                      </Text>
                      {hasApt && <View style={styles.appointmentDot} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Upcoming Appointments */}
            <View style={styles.appointmentsSection}>
              <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
              {upcomingAppointments.length === 0 ? (
                <View style={styles.noAppointments}>
                  <FontAwesome5 name="calendar-times" size={48} color="#ccc" />
                  <Text style={styles.noAppointmentsText}>No upcoming appointments</Text>
                </View>
              ) : (
                upcomingAppointments.map((appointment) => (
                  <TouchableOpacity
                    key={appointment.id}
                    style={styles.appointmentCard}
                    onPress={() => handleAppointmentPress(appointment)}
                  >
                    <View style={styles.appointmentDate}>
                      <Text style={styles.appointmentDayText}>
                        {getDayAbbreviation(appointment.date)}
                      </Text>
                      <Text style={styles.appointmentDayNumber}>
                        {getDayNumber(appointment.date)}
                      </Text>
                    </View>
                    <View style={styles.appointmentDetails}>
                      <Text style={styles.appointmentHorse}>{appointment.horseName}</Text>
                      <Text style={styles.appointmentTime}>
                        {appointment.time} — {appointment.service}
                      </Text>
                      <Text style={styles.appointmentDoctor}>with {appointment.contactName}</Text>
                      <View style={styles.appointmentTags}>
                        <View style={[styles.tag, styles.scheduledTag]}>
                          <Text style={styles.tagText}>Scheduled</Text>
                        </View>
                        <View style={[styles.tag, styles.pendingTag]}>
                          <Text style={styles.tagText}>Pending</Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteAppointment(appointment.id)}
                    >
                      <FontAwesome5 name="trash" size={16} color="#ff4444" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        ) : (
          // Appointment Details View
          <View>
            <View style={styles.detailsCard}>
              <View style={styles.appointmentDateBox}>
                <Text style={styles.appointmentDayText}>
                  {getDayAbbreviation(selectedAppointment.date)}
                </Text>
                <Text style={styles.appointmentDayNumber}>
                  {getDayNumber(selectedAppointment.date)}
                </Text>
              </View>
              <View style={styles.appointmentSummary}>
                <Text style={styles.horseName}>{selectedAppointment.horseName}</Text>
                <View style={styles.timeServiceContainer}>
                  <FontAwesome5 name="clock" size={14} color="#666" style={styles.icon} />
                  <Text style={styles.timeServiceText}>
                    {selectedAppointment.time} — {selectedAppointment.service}
                  </Text>
                </View>
                <View style={styles.tagsContainer}>
                  <View style={[styles.tag, styles.scheduledTag]}>
                    <Text style={styles.tagText}>Scheduled</Text>
                  </View>
                  <View style={[styles.tag, styles.pendingTag]}>
                    <Text style={styles.tagText}>Pending</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <FontAwesome5 name="user-md" size={16} color="#CD853F" style={styles.infoIcon} />
                <Text style={styles.infoLabel}>Vet:</Text>
                <Text style={styles.infoText}>{selectedAppointment.contactName}</Text>
              </View>
              <View style={styles.infoRow}>
                <FontAwesome5
                  name="clinic-medical"
                  size={16}
                  color="#CD853F"
                  style={styles.infoIcon}
                />
                <Text style={styles.infoLabel}>Clinic:</Text>
                <Text style={styles.infoText}>Cebu Animal Health Center</Text>
              </View>
              <View style={styles.infoRow}>
                <FontAwesome5
                  name="map-marker-alt"
                  size={16}
                  color="#CD853F"
                  style={styles.infoIcon}
                />
                <Text style={styles.infoLabel}>Location:</Text>
                <Text style={styles.infoText}>Salinas Drive, Lahug, Cebu City</Text>
              </View>
              <View style={styles.infoRow}>
                <FontAwesome5 name="phone" size={16} color="#CD853F" style={styles.infoIcon} />
                <Text style={styles.infoText}>0912-345-6789</Text>
              </View>
              <View style={styles.infoRow}>
                <FontAwesome5 name="envelope" size={16} color="#CD853F" style={styles.infoIcon} />
                <Text style={styles.infoText}>mariamaria@gmail.com</Text>
              </View>
            </View>

            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Note:</Text>
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>{selectedAppointment.notes || 'N/A'}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.rescheduleButton} onPress={handleReschedule}>
              <Text style={styles.rescheduleButtonText}>Reschedule</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'home' && styles.activeNavItem]}
          onPress={() => {
            setActiveTab('home');
            router.push('/home');
          }}
        >
          <FontAwesome5 name="home" size={24} color={activeTab === 'home' ? '#CD853F' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'horse' && styles.activeNavItem]}
          onPress={() => {
            setActiveTab('horse');
            router.push('/horse');
          }}
        >
          <FontAwesome5 name="horse" size={24} color={activeTab === 'horse' ? '#CD853F' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'message' && styles.activeNavItem]}
          onPress={() => {
            setActiveTab('message');
            router.push('/message');
          }}
        >
          <FontAwesome5
            name="comment-dots"
            size={24}
            color={activeTab === 'message' ? '#CD853F' : '#000'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'calendar' && styles.activeNavItem]}
          onPress={() => {
            setActiveTab('calendar');
            router.push('/calendar');
          }}
        >
          <FontAwesome5
            name="calendar-alt"
            size={24}
            color={activeTab === 'calendar' ? '#CD853F' : '#000'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'profile' && styles.activeNavItem]}
          onPress={() => {
            setActiveTab('profile');
            router.push('/profile');
          }}
        >
          <FontAwesome5 name="user" size={24} color={activeTab === 'profile' ? '#CD853F' : '#000'} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1, // Allow title to take remaining space
    textAlign: 'center', // Center the title if no back button
  },
  backArrowButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)', // Semi-transparent background for the circle
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto', // Push to the right
  },
  searchButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20, // Added padding for the main content area
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 20, // Added margin bottom for separation
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    paddingVertical: 5,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  todayCell: {
    backgroundColor: '#ff4444',
    borderRadius: 20,
  },
  appointmentCell: {
    backgroundColor: '#e8f5e8',
    borderRadius: 20,
  },
  dayText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  otherMonthText: {
    color: '#ccc',
  },
  todayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  appointmentText: {
    color: '#2d5a2d',
    fontWeight: 'bold',
  },
  appointmentDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4CAF50',
  },
  appointmentsSection: {
    paddingHorizontal: 0, // Removed padding from here as it's now on container
    paddingBottom: 0, // Removed padding from here as it's now on container
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  noAppointments: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noAppointmentsText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
  appointmentCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  appointmentDate: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    marginRight: 15,
  },
  appointmentDayText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  appointmentDayNumber: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  appointmentDetails: {
    flex: 1,
  },
  appointmentHorse: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  appointmentTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  appointmentDoctor: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  appointmentTags: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scheduledTag: {
    backgroundColor: '#e8f5e8',
  },
  pendingTag: {
    backgroundColor: '#fff3cd',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  deleteButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Bottom Navigation
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },
  navItem: {
    alignItems: 'center',
    padding: 10,
  },
  activeNavItem: {
    backgroundColor: '#f0e6dc',
    borderRadius: 20,
  },
  // Styles for Appointment Details View (merged from appointment-details.tsx)
  detailsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  appointmentDateBox: {
    width: 80,
    height: 80,
    backgroundColor: '#4CAF50', // Green color from image
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  appointmentSummary: {
    flex: 1,
  },
  horseName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  timeServiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  icon: {
    marginRight: 5,
  },
  timeServiceText: {
    fontSize: 16,
    color: '#666',
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoIcon: {
    width: 24,
    textAlign: 'center',
    marginRight: 10,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 5,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    flexShrink: 1, // Allow text to wrap
  },
  notesSection: {
    marginBottom: 30,
  },
  notesLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  notesBox: {
    backgroundColor: '#fff3cd', // Light yellow from image
    borderRadius: 10,
    padding: 15,
  },
  notesText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  rescheduleButton: {
    backgroundColor: '#CD853F', // Orange color from image
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3.84,
    elevation: 5,
  },
  rescheduleButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default CalendarScreen;
