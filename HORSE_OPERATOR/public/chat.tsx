import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Message {
  id: string;
  text: string;
  isOutgoing: boolean;
  timestamp: string;
}

interface ChatMessage {
  id: string;
  name: string;
  avatar: string;
  message: string;
  time: string;
  unread: boolean;
}

interface Horse {
  id: string;
  name: string;
  age: string;
  breed: string;
  color: string;
}

// Helper to get the current logged-in user
const getCurrentUser = async () => {
  try {
    const user = await AsyncStorage.getItem('current_user');
    if (user) return user;
  } catch (error) {
    console.error('Error getting current user:', error);
  }
  return null;
};

// Default chat histories for initial conversations (not user-specific)
const defaultChatHistories: { [key: string]: Message[] } = {
  '1': [ // Dr. Maria Santos
    {
      id: '1',
      text: 'Maayong buntag! Kumusta si Oscar karon?',
      isOutgoing: false,
      timestamp: '10:15 AM',
    },
    {
      id: '2',
      text: 'Maayo na siya, Doc wala na\'y limping',
      isOutgoing: true,
      timestamp: '10:17 AM',
    },
  ],
  '2': [ // DVMF Cebu Officer
    {
      id: '1',
      text: 'Good morning! This is a reminder that your appointment has been scheduled for tomorrow at 2:00 PM.',
      isOutgoing: false,
      timestamp: '1:30 PM',
    },
    {
      id: '2',
      text: 'Thank you for the reminder. I\'ll be there on time.',
      isOutgoing: true,
      timestamp: '1:35 PM',
    },
  ],
  '3': [ // Dr. Sarah Yap
    {
      id: '1',
      text: 'Hi! How is your horse doing after the treatment?',
      isOutgoing: false,
      timestamp: 'Yesterday',
    },
    {
      id: '2',
      text: 'Daghang Salamat Doc! Much better now.',
      isOutgoing: true,
      timestamp: 'Yesterday',
    },
    {
      id: '3',
      text: 'That\'s great to hear! Continue with the medication as prescribed.',
      isOutgoing: false,
      timestamp: 'Yesterday',
    },
  ],
  '4': [ // AI Assistant
    {
      id: '1',
      text: 'Hello! I\'m here to help you with any questions about horse care.',
      isOutgoing: false,
      timestamp: 'Yesterday',
    },
    {
      id: '2',
      text: 'How can I help you today?',
      isOutgoing: false,
      timestamp: 'Yesterday',
    },
  ],
  '5': [ // Dr. John Cruz
    {
      id: '1',
      text: 'Hello! I specialize in large animal medicine. How can I assist you today?',
      isOutgoing: false,
      timestamp: '2:00 PM',
    },
  ],
  '6': [ // Dr. Ana Reyes
    {
      id: '1',
      text: 'Hi there! I focus on small animal care. What can I help you with?',
      isOutgoing: false,
      timestamp: '3:30 PM',
    },
  ],
};

const ChatScreen = () => {
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedHorse, setSelectedHorse] = useState('');
  const [selectedService, setSelectedService] = useState('Routine Check-up');
  const [selectedTime, setSelectedTime] = useState('9:00 AM');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [availableHorses, setAvailableHorses] = useState<Horse[]>([]);
  const [showHorseDropdown, setShowHorseDropdown] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);

  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  // Get parameters from navigation, including the new chatKey
  const params = useLocalSearchParams();
  const contactId = params.contactId as string;
  const contactName = (params.contactName as string) || 'Contact';
  const contactAvatar = (params.contactAvatar as string) || '/placeholder.svg?height=35&width=35';
  const chatKey = params.chatKey as string; // This is the user-specific chat key

  // Set default date to tomorrow
  const defaultDate = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }, []);

  // Initialize selectedDate to tomorrow
  useEffect(() => {
    setSelectedDate(defaultDate);
  }, [defaultDate]);

  // Format date for display
  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  // Load user's horses from AsyncStorage
  const loadUserHorses = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const userHorsesKey = `horses_${user}`;
      const storedHorses = await AsyncStorage.getItem(userHorsesKey);

      if (storedHorses) {
        const horses: Horse[] = JSON.parse(storedHorses);
        setAvailableHorses(horses);

        // Set the first horse as selected by default if none is selected
        if (horses.length > 0 && !selectedHorse) {
          setSelectedHorse(horses[0].name);
        }
      } else {
        // No horses found
        setAvailableHorses([]);
      }
    } catch (error) {
      console.error('Error loading user horses:', error);
      setAvailableHorses([]);
    }
  }, [selectedHorse]); // selectedHorse is a dependency because it's used in the initial selection logic

  // Load individual chat messages from AsyncStorage using the user-specific chatKey
  const loadChatMessages = useCallback(async () => {
    try {
      if (!chatKey) {
        console.warn('chatKey is missing, cannot load chat messages.');
        return;
      }
      const savedChatMessages = await AsyncStorage.getItem(chatKey);

      if (savedChatMessages) {
        const chatMessages = JSON.parse(savedChatMessages);
        console.log(`Loaded ${chatMessages.length} messages for ${contactName} with key: ${chatKey}`);
        setMessages(chatMessages);
      } else if (defaultChatHistories[contactId]) {
        // Use default chat history if available for this contactId
        console.log(`Using default chat history for ${contactName}`);
        setMessages(defaultChatHistories[contactId]);
        // Save the default messages to AsyncStorage using the user-specific chatKey
        await AsyncStorage.setItem(chatKey, JSON.stringify(defaultChatHistories[contactId]));
      } else {
        // Empty chat for new contacts
        console.log(`Starting new chat with ${contactName}`);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  }, [chatKey, contactId, contactName]); // Dependencies for loadChatMessages

  // Save individual chat messages to AsyncStorage using the user-specific chatKey
  const saveChatMessages = useCallback(async (updatedMessages: Message[]) => {
    try {
      if (!chatKey) {
        console.warn('chatKey is missing, cannot save chat messages.');
        return;
      }
      await AsyncStorage.setItem(chatKey, JSON.stringify(updatedMessages));
      console.log(`Saved ${updatedMessages.length} messages for ${contactName} with key: ${chatKey}`);
    } catch (error) {
      console.error('Error saving chat messages:', error);
    }
  }, [chatKey, contactName]); // Dependencies for saveChatMessages

  // This function updates the *list of conversations* on the MessageScreen
  const updateMessagesList = useCallback(async (newMessage: string) => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.log('No user logged in, cannot update messages list.');
        return;
      }

      const userMessagesKey = `chat_messages_${user}`;
      console.log('Updating messages list for contact:', contactId, contactName, 'using key:', userMessagesKey);

      // Load existing messages list for the current user
      const savedMessages = await AsyncStorage.getItem(userMessagesKey);
      let messagesList: ChatMessage[] = [];

      if (savedMessages) {
        messagesList = JSON.parse(savedMessages);
        console.log('Loaded existing messages list:', messagesList.length);
      } else {
        // If no messages list exists for this user, initialize it (should ideally be handled by MessageScreen)
        console.log('No existing messages list found for user, initializing empty list.');
      }

      // Check if this contact already exists in messages list
      const existingMessageIndex = messagesList.findIndex(msg => msg.id === contactId);

      const currentTime = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      const messagePreview = newMessage.length > 30 ? newMessage.substring(0, 30) + '...' : newMessage;

      if (existingMessageIndex >= 0) {
        // Update existing message and move to top
        const updatedMessage = {
          ...messagesList[existingMessageIndex],
          message: `You: ${messagePreview}`,
          time: currentTime,
          unread: false,
        };

        // Remove from current position and add to beginning
        messagesList.splice(existingMessageIndex, 1);
        messagesList.unshift(updatedMessage);

        console.log('Updated existing message for:', contactName);
      } else {
        // Add new message to the list
        const newChatMessage: ChatMessage = {
          id: contactId,
          name: contactName,
          avatar: contactAvatar,
          message: `You: ${messagePreview}`,
          time: currentTime,
          unread: false,
        };

        // Add to the beginning of the list (most recent first)
        messagesList.unshift(newChatMessage);
        console.log('Added new message for:', contactName);
      }

      // Save updated messages list for the current user
      await AsyncStorage.setItem(userMessagesKey, JSON.stringify(messagesList));
      console.log('Messages list saved to AsyncStorage, total messages:', messagesList.length);

    } catch (error) {
      console.error('Error updating messages list:', error);
    }
  }, [contactId, contactName, contactAvatar]); // Dependencies for updateMessagesList

  useEffect(() => {
    const loadUserDataAndHorses = async () => {
      try {
        // Check if user is logged in
        const isLoggedIn = await AsyncStorage.getItem('user_logged_in');
        if (!isLoggedIn) {
          router.replace('/Login');
          return;
        }
        loadUserHorses(); // Load horses when component mounts
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    loadUserDataAndHorses();
  }, [router, loadUserHorses]); // Dependencies for this useEffect

  useEffect(() => {
    // Load chat messages when contactId or chatKey changes
    if (contactId && chatKey) {
      loadChatMessages();
    }
  }, [contactId, chatKey, loadChatMessages]); // Dependencies for this useEffect

  useEffect(() => {
    // Scroll to bottom when new messages are added
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (messageText.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: messageText.trim(),
        isOutgoing: true,
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
      };

      // Update local messages state
      const updatedMessages = [...messages, newMessage];
      setMessages(updatedMessages);

      // Save the updated individual chat messages to AsyncStorage
      await saveChatMessages(updatedMessages);

      // Update the main messages list (summary) in AsyncStorage
      await updateMessagesList(messageText.trim());

      setMessageText('');
    }
  }, [messageText, messages, saveChatMessages, updateMessagesList]);

  const handleBookAppointment = useCallback(() => {
    // Reload horses when opening modal to get latest data
    loadUserHorses();
    setShowBookingModal(true);
  }, [loadUserHorses]);

  const handleDateChange = useCallback((event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (date) {
      setSelectedDate(date);
    }
  }, []);

  const confirmAppointment = useCallback(async () => {
    if (availableHorses.length === 0) {
      Alert.alert(
        'No Horses Available',
        'Please add a horse first before booking an appointment.',
        [
          {
            text: 'Add Horse',
            onPress: () => {
              setShowBookingModal(false);
              router.push('/addhorse');
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
      return;
    }
    // Create appointment object
    const newAppointment = {
      id: Date.now().toString(),
      contactId: contactId,
      contactName: contactName,
      horseName: selectedHorse,
      service: selectedService,
      date: selectedDate.toISOString().split('T')[0], // YYYY-MM-DD format
      time: selectedTime,
      notes: appointmentNotes,
      status: 'scheduled' as const,
    };
    try {
      // Save appointment to AsyncStorage
      const existingAppointments = await AsyncStorage.getItem('appointments');
      let appointments = [];

      if (existingAppointments) {
        appointments = JSON.parse(existingAppointments);
      }

      appointments.push(newAppointment);
      await AsyncStorage.setItem('appointments', JSON.stringify(appointments));

      Alert.alert(
        'Appointment Confirmed',
        `Your appointment with ${contactName} has been booked.\n\nDate: ${formatDate(selectedDate)}\nTime: ${selectedTime}\nHorse: ${selectedHorse}\nService: ${selectedService}${appointmentNotes ? `\nNotes: ${appointmentNotes}` : ''}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowBookingModal(false);
              // Reset form
              setSelectedService('Routine Check-up');
              setSelectedTime('9:00 AM');
              setAppointmentNotes('');
              // Reset to default date (tomorrow)
              setSelectedDate(defaultDate);
              // Keep the first horse selected for next time
              if (availableHorses.length > 0) {
                setSelectedHorse(availableHorses[0].name);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error saving appointment:', error);
      Alert.alert('Error', 'Failed to save appointment. Please try again.');
    }
  }, [availableHorses, contactId, contactName, selectedDate, selectedTime, selectedHorse, selectedService, appointmentNotes, defaultDate, formatDate, router]);

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

          <View style={styles.contactInfo}>
            <Image
              source={{ uri: contactAvatar }}
              style={styles.contactAvatar}
            />
            <Text style={styles.contactName}>{contactName}</Text>
          </View>

          <View style={styles.headerActions}>
            {contactId !== '4' && ( // Hide phone/video icons for AI Assistant (id: '4')
              <>
                <TouchableOpacity style={styles.headerActionButton}>
                  <FontAwesome5 name="phone" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerActionButton}>
                  <FontAwesome5 name="video" size={18} color="#fff" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
        {/* Messages Area */}
        <View style={styles.messagesContainer}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageWrapper,
                  message.isOutgoing ? styles.outgoingWrapper : styles.incomingWrapper,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    message.isOutgoing ? styles.outgoingBubble : styles.incomingBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      message.isOutgoing ? styles.outgoingText : styles.incomingText,
                    ]}
                  >
                    {message.text}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.timestamp,
                    message.isOutgoing ? styles.outgoingTimestamp : styles.incomingTimestamp,
                  ]}
                >
                  {message.timestamp}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
        {/* Floating Book Appointment Button - Only for doctors */}
        {contactId !== '4' && (
          <TouchableOpacity
            style={styles.floatingButton}
            onPress={handleBookAppointment}
          >
            <FontAwesome5 name="calendar-alt" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachmentButton}>
            <FontAwesome5 name="paperclip" size={20} color="#CD853F" />
          </TouchableOpacity>

          <View style={styles.messageInputWrapper}>
            <TextInput
              style={styles.messageInput}
              placeholder="Message..."
              value={messageText}
              onChangeText={setMessageText}
              multiline
              placeholderTextColor="#999"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              messageText.trim() ? styles.sendButtonActive : styles.sendButtonInactive
            ]}
            onPress={sendMessage}
            disabled={!messageText.trim()}
          >
            <FontAwesome5
              name="paper-plane"
              size={18}
              color={messageText.trim() ? "#fff" : "#999"}
            />
          </TouchableOpacity>
        </View>
        {/* Book Appointment Modal */}
        <Modal
          visible={showBookingModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalBackButton}
                onPress={() => setShowBookingModal(false)}
              >
                <FontAwesome5 name="arrow-left" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Book Appointment</Text>
              <View style={styles.modalHeaderSpacer} />
            </View>
            {/* Modal Content */}
            <ScrollView style={styles.modalContent}>
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
                          setShowBookingModal(false);
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
                        {availableHorses.map((horse) => (
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
                        {services.map((service) => (
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
                    <Text style={styles.datePickerText}>
                      {formatDate(selectedDate)}
                    </Text>
                    <FontAwesome5 name="chevron-down" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
                {/* Choose Time */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Choose Time</Text>
                  <View style={styles.timeSlots}>
                    {timeSlots.map((time) => (
                      <TouchableOpacity
                        key={time}
                        style={styles.timeSlot}
                        onPress={() => setSelectedTime(time)}
                      >
                        <View style={[
                          styles.radioButton,
                          selectedTime === time && styles.radioButtonSelected
                        ]}>
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
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={confirmAppointment}
                >
                  <Text style={styles.confirmButtonText}>Confirm Appointment</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
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
          <Modal
            transparent={true}
            animationType="slide"
            visible={showDatePicker}
          >
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
                    <Text style={[styles.datePickerButtonText, styles.datePickerDoneButton]}>Done</Text>
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
  contactInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactAvatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
  },
  contactName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerActionButton: {
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 17.5,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 10,
  },
  messageWrapper: {
    marginBottom: 15,
  },
  incomingWrapper: {
    alignItems: 'flex-start',
  },
  outgoingWrapper: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 5,
  },
  incomingBubble: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 5,
  },
  outgoingBubble: {
    backgroundColor: '#CD853F',
    borderBottomRightRadius: 5,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  incomingText: {
    color: '#333',
  },
  outgoingText: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 12,
    marginHorizontal: 5,
  },
  incomingTimestamp: {
    color: '#999',
    textAlign: 'left',
  },
  outgoingTimestamp: {
    color: '#999',
    textAlign: 'right',
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#CD853F',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  attachmentButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    marginRight: 10,
  },
  messageInputWrapper: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 5,
    marginRight: 10,
  },
  messageInput: {
    fontSize: 16,
    color: '#333',
    maxHeight: 100,
    minHeight: 40,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  sendButtonActive: {
    backgroundColor: '#007AFF',
  },
  sendButtonInactive: {
    backgroundColor: '#f5f5f5',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#CD853F',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#CD853F',
  },
  modalBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  modalHeaderSpacer: {
    width: 40,
  },
  modalContent: {
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

export default ChatScreen;
