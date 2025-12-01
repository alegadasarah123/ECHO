"use client"

import { useRouter } from "expo-router"
import { useState, useEffect } from "react"
import {
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator
} from "react-native"
import * as SecureStore from "expo-secure-store"

const { width, height } = Dimensions.get("window")

// Enhanced responsive scaling functions with explicit types
const scale = (size: number): number => {
  const scaleFactor = width / 375
  const scaledSize = size * scaleFactor
  return Math.max(Math.min(scaledSize, size * 1.2), size * 0.8)
}

const verticalScale = (size: number): number => {
  const scaleFactor = height / 812
  const scaledSize = size * scaleFactor
  return Math.max(Math.min(scaledSize, size * 1.15), size * 0.85)
}

const moderateScale = (size: number, factor = 0.5): number => {
  const scaledSize = size + (scale(size) - size) * factor
  return Math.max(Math.min(scaledSize, size * 1.1), size * 0.9)
}

const dynamicSpacing = (baseSize: number): number => {
  if (width < 350) return verticalScale(baseSize * 0.7)
  if (width < 400) return verticalScale(baseSize * 0.85)
  if (width > 450) return verticalScale(baseSize * 1.05)
  return verticalScale(baseSize)
}

const getSafeAreaPadding = () => {
  const statusBarHeight = StatusBar.currentHeight || 0
  return {
    top: Math.max(statusBarHeight, 20),
    bottom: height > 800 ? 34 : 20,
  }
}

// Interface for Event object
interface Event {
  id: string
  title_event: string
  date: string
  time: string
}

// API Base URL - UPDATE THIS TO YOUR IP ADDRESS
const API_BASE_URL = "http://192.168.101.2:8000/api/kutsero"

export default function CalendarScreen() {
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showAddEventModal, setShowAddEventModal] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(false)
  const [eventTitle, setEventTitle] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [eventTime, setEventTime] = useState("")
  const [hour, setHour] = useState("")
  const [minute, setMinute] = useState("")
  const [ampm, setAmPm] = useState<"AM" | "PM">("AM")

  const safeArea = getSafeAreaPadding()

  const today = new Date()
  const currentDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  useEffect(() => {
    initializeCalendar()
  }, [])

  const initializeCalendar = async () => {
    await fetchEvents()
  }

  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getMonthName = (date: Date): string => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  const hasEvent = (day: number): boolean => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    return events.some((event) => event.date === dateStr)
  }

  const isToday = (day: number): boolean => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    return dateStr === currentDateString
  }

  const openAddEventModal = (day?: number) => {
    let dateStr = ""
    if (day) {
      dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      setSelectedDate(dateStr)
    } else {
      setSelectedDate(currentDateString)
    }
    setEventTitle("")
    setEventTime("")
    setHour("")
    setMinute("")
    setAmPm("AM")
    setShowAddEventModal(true)
  }

  const saveEventsToSecureStorage = async (events: Event[]): Promise<void> => {
    try {
      await SecureStore.setItemAsync("calendar_events", JSON.stringify(events))
    } catch (error) {
      console.error("Error saving events to secure storage:", error)
    }
  }

  const loadEventsFromSecureStorage = async (): Promise<Event[]> => {
    try {
      const storedEvents = await SecureStore.getItemAsync("calendar_events")
      return storedEvents ? JSON.parse(storedEvents) : []
    } catch (error) {
      console.error("Error loading events from secure storage:", error)
      return []
    }
  }

  const fetchEvents = async (): Promise<void> => {
    try {
      setLoading(true)
      console.log("Attempting to fetch events from:", `${API_BASE_URL}/get-calendar-events/`)

      const response = await fetch(`${API_BASE_URL}/get-calendar-events/`)

      if (response.ok) {
        const data = await response.json()
        console.log("API Response:", data)

        if (data.success && Array.isArray(data.events)) {
          const formattedEvents: Event[] = data.events.map((event: any) => ({
            id: String(event.id),
            title_event: event.title_event || '',
            date: event.date || '',
            time: event.time || ''
          }))

          setEvents(formattedEvents)
          await saveEventsToSecureStorage(formattedEvents)
          console.log("Events loaded from API:", formattedEvents.length)
        } else {
          console.log("API response was not successful, loading local events.")
          const localEvents = await loadEventsFromSecureStorage()
          setEvents(localEvents)
        }
      } else {
        console.error("API request failed with status:", response.status, response.statusText)
        const localEvents = await loadEventsFromSecureStorage()
        setEvents(localEvents)
      }
    } catch (error) {
      console.error("Network or API error while fetching events:", error)
      const localEvents = await loadEventsFromSecureStorage()
      setEvents(localEvents)
    } finally {
      setLoading(false)
    }
  }

  const addEvent = async (): Promise<void> => {
    if (!eventTitle.trim()) {
      Alert.alert("Error", "Please enter an event title")
      return
    }

    if (!selectedDate) {
      Alert.alert("Error", "Please select a date")
      return
    }

    // Validate time
    if (!hour || !minute) {
      Alert.alert("Error", "Please enter event time")
      return
    }

    const hourNum = parseInt(hour)
    const minuteNum = parseInt(minute)

    if (isNaN(hourNum) || hourNum < 1 || hourNum > 12) {
      Alert.alert("Error", "Please enter a valid hour (1-12)")
      return
    }

    if (isNaN(minuteNum) || minuteNum < 0 || minuteNum > 59) {
      Alert.alert("Error", "Please enter a valid minute (0-59)")
      return
    }

    // Format time as "HH:MM AM/PM"
    const formattedTime = `${hour}:${minute.padStart(2, '0')} ${ampm}`

    const newEvent: Event = {
      id: Date.now().toString(),
      title_event: eventTitle.trim(),
      date: selectedDate,
      time: formattedTime
    }

    try {
      setLoading(true)

      const requestBody = {
        title_event: eventTitle.trim(),
        date: selectedDate,
        time: formattedTime
      }

      console.log("Sending request to add event:", requestBody)

      const response = await fetch(`${API_BASE_URL}/create-calendar-event/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        Alert.alert("Success", "Event created successfully!")
        setEventTitle("")
        setHour("")
        setMinute("")
        setAmPm("AM")
        setSelectedDate("")
        setShowAddEventModal(false)
        await fetchEvents()
      } else {
        const errorText = await response.text()
        console.error("Server error:", response.status, errorText)
        Alert.alert("Warning", "Failed to save event on server. Saved locally.")
        const updatedEvents = [...events, newEvent]
        setEvents(updatedEvents)
        await saveEventsToSecureStorage(updatedEvents)
        setShowAddEventModal(false)
      }
    } catch (error) {
      console.error("Network or API error while adding event:", error)
      Alert.alert("Warning", "Network error. Event saved locally.")
      const updatedEvents = [...events, newEvent]
      setEvents(updatedEvents)
      await saveEventsToSecureStorage(updatedEvents)
      setShowAddEventModal(false)
    } finally {
      setLoading(false)
    }
  }

  const deleteEvent = async (eventId: string): Promise<void> => {
    Alert.alert(
      "Delete Event",
      "Are you sure you want to delete this event?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const response = await fetch(`${API_BASE_URL}/delete-calendar-event/${eventId}/`, {
                method: "DELETE",
              });

              if (response.ok) {
                Alert.alert("Success", "Event deleted successfully!");
                const updatedEvents = events.filter(event => event.id !== eventId);
                setEvents(updatedEvents);
                await saveEventsToSecureStorage(updatedEvents);
              } else {
                const errorText = await response.text();
                console.error("Server error:", response.status, errorText);
                Alert.alert("Error", "Failed to delete event on server.");
              }
            } catch (error) {
              console.error("Network or API error while deleting event:", error);
              Alert.alert("Error", "Network error. Failed to delete event.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatDateForDisplay = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getEventsForCurrentMonth = (): Event[] => {
    const currentYear = currentMonth.getFullYear()
    const currentMonthIndex = currentMonth.getMonth()

    return events
      .filter((event: Event) => {
        const eventDate = new Date(event.date)
        return eventDate.getFullYear() === currentYear && eventDate.getMonth() === currentMonthIndex
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfMonth(currentMonth)
    const days = []

    for (let i = 0; i < firstDay; i++) {
      days.push(
        <View key={`empty-${i}`} style={styles.calendarDay}>
          <Text style={styles.emptyDayText}></Text>
        </View>,
      )
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const hasEventToday = hasEvent(day)
      const isTodayDate = isToday(day)

      days.push(
        <TouchableOpacity
          key={day}
          style={styles.calendarDay}
          activeOpacity={0.7}
          onPress={() => openAddEventModal(day)}
        >
          <View
            style={[
              styles.dayContainer,
              hasEventToday && styles.eventDay,
              isTodayDate && styles.todayDay,
              hasEventToday && isTodayDate && styles.eventTodayDay,
            ]}
          >
            <Text
              style={[
                styles.dayText,
                hasEventToday && styles.eventDayText,
                isTodayDate && styles.todayDayText,
                hasEventToday && isTodayDate && styles.eventTodayDayText,
              ]}
            >
              {day}
            </Text>
          </View>
        </TouchableOpacity>,
      )
    }
    return days
  }

  const DashboardIcon = ({ color }: { color: string }) => (
    <View style={styles.iconContainer}>
      <View style={styles.dashboardGrid}>
        <View style={[styles.gridSquare, styles.gridTopLeft, { backgroundColor: color }]} />
        <View style={[styles.gridSquare, styles.gridTopRight, { backgroundColor: color }]} />
        <View style={[styles.gridSquare, styles.gridBottomLeft, { backgroundColor: color }]} />
        <View style={[styles.gridSquare, styles.gridBottomRight, { backgroundColor: color }]} />
      </View>
    </View>
  )

  const ProfileIcon = ({ color }: { color: string }) => (
    <View style={styles.iconContainer}>
      <View style={styles.profileContainer}>
        <View style={[styles.profileHead, { backgroundColor: color }]} />
        <View style={[styles.profileBody, { backgroundColor: color }]} />
      </View>
    </View>
  )

  const PlusIcon = ({ color = "#C17A47", size = 24 }: { color?: string; size?: number }) => (
    <View style={[styles.plusIcon, { width: scale(size), height: scale(size) }]}>
      <View style={[styles.plusHorizontal, { backgroundColor: color }]} />
      <View style={[styles.plusVertical, { backgroundColor: color }]} />
    </View>
  )

  const TabButton = ({
    iconSource,
    label,
    tabKey,
    isActive,
  }: {
    iconSource: any
    label: string
    tabKey: string
    isActive: boolean
  }) => (
    <TouchableOpacity
      style={styles.tabButton}
      onPress={() => {
        if (tabKey === "home") {
          router.push("./dashboard")
        } else if (tabKey === "horse") {
          router.push("./horsecare")
        } else if (tabKey === "chat") {
          router.push("./messages")
        } else if (tabKey === "calendar") {
          // Stay on calendar - already here
        } else if (tabKey === "history") {
          router.push("./history")
        } else if (tabKey === "profile") {
          router.push("./profile")
        }
      }}
    >
      <View style={[styles.tabIcon, isActive && styles.activeTabIcon]}>
        {iconSource ? (
          <Image
            source={iconSource}
            style={[styles.tabIconImage, { tintColor: isActive ? "white" : "#666" }]}
            resizeMode="contain"
          />
        ) : tabKey === "home" ? (
          <DashboardIcon color={isActive ? "white" : "#666"} />
        ) : tabKey === "profile" ? (
          <ProfileIcon color={isActive ? "white" : "#666"} />
        ) : (
          <View style={styles.fallbackIcon} />
        )}
      </View>
      <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>{label}</Text>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />

      <View style={[styles.header, { paddingTop: safeArea.top }]}>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Calendar</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => openAddEventModal()} activeOpacity={0.7}>
          <PlusIcon color="white" size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContentContainer,
            { paddingBottom: safeArea.bottom + dynamicSpacing(100) },
          ]}
        >
          <View style={styles.calendarSection}>
            <Text style={styles.sectionTitle}>Calendar</Text>

            <View style={styles.monthHeader}>
              <TouchableOpacity
                style={styles.monthNavButton}
                onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                activeOpacity={0.7}
              >
                <Text style={styles.monthNavText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthTitle}>{getMonthName(currentMonth)}</Text>
              <TouchableOpacity
                style={styles.monthNavButton}
                onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                activeOpacity={0.7}
              >
                <Text style={styles.monthNavText}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dayHeaders}>
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <View key={day} style={styles.dayHeader}>
                  <Text style={styles.dayHeaderText}>{day}</Text>
                </View>
              ))}
            </View>

            <View style={styles.calendarGrid}>{renderCalendarDays()}</View>
          </View>

          <View style={styles.eventsSection}>
            {/* REMOVED the section header with plus button */}
            <Text style={styles.sectionTitle}>Events for {getMonthName(currentMonth)}</Text>

            {loading ? (
              <ActivityIndicator size="large" color="#C17A47" style={{ paddingVertical: verticalScale(24) }} />
            ) : (
              <View style={styles.tableContainer}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { flex: 2 }]}>Date</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Time</Text>
                  <Text style={[styles.tableHeaderText, { flex: 2.5 }]}>Title</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Actions</Text>
                </View>

                {getEventsForCurrentMonth().length > 0 ? (
                  getEventsForCurrentMonth().map((event: Event) => (
                    <View key={event.id} style={styles.tableRow}>
                      <Text style={[styles.tableCellText, { flex: 2 }]}>{formatDateForDisplay(event.date)}</Text>
                      <Text style={[styles.tableCellText, { flex: 1.5 }]}>{event.time}</Text>
                      <Text style={[styles.tableCellText, { flex: 2.5 }]} numberOfLines={2}>
                        {event.title_event}
                      </Text>
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => deleteEvent(event.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.deleteButtonText}>×</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.noEventsContainer}>
                    <Text style={styles.noEventsText}>No events scheduled for this month</Text>
                    <TouchableOpacity
                      style={styles.addFirstEventButton}
                      onPress={() => openAddEventModal()}
                      activeOpacity={0.7}
                    >
                      <PlusIcon color="#C17A47" size={16} />
                      <Text style={styles.addFirstEventText}>Add your first event</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        <Modal
          visible={showAddEventModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAddEventModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Event</Text>
                <TouchableOpacity onPress={() => setShowAddEventModal(false)} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>×</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Event Title *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={eventTitle}
                    onChangeText={setEventTitle}
                    placeholder="Enter event title"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Date *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={selectedDate}
                    onChangeText={setSelectedDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Time *</Text>
                  <View style={styles.timeInputContainer}>
                    <View style={styles.timeInputRow}>
                      <TextInput
                        style={[styles.timeInput, styles.hourInput]}
                        value={hour}
                        onChangeText={setHour}
                        placeholder="HH"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        maxLength={2}
                      />
                      <Text style={styles.timeSeparator}>:</Text>
                      <TextInput
                        style={[styles.timeInput, styles.minuteInput]}
                        value={minute}
                        onChangeText={setMinute}
                        placeholder="MM"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                    <View style={styles.ampmContainer}>
                      <TouchableOpacity
                        style={[styles.ampmButton, ampm === 'AM' && styles.ampmButtonActive]}
                        onPress={() => setAmPm('AM')}
                      >
                        <Text style={[styles.ampmText, ampm === 'AM' && styles.ampmTextActive]}>AM</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.ampmButton, ampm === 'PM' && styles.ampmButtonActive]}
                        onPress={() => setAmPm('PM')}
                      >
                        <Text style={[styles.ampmText, ampm === 'PM' && styles.ampmTextActive]}>PM</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowAddEventModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={addEvent}
                  disabled={loading}
                >
                  <Text style={styles.saveButtonText}>
                    {loading ? "Adding..." : "Add Event"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <View style={[styles.tabBar, { paddingBottom: safeArea.bottom }]}>
          <TabButton iconSource={null} label="Home" tabKey="home" isActive={false} />
          <TabButton
            iconSource={require("../../assets/images/horse.png")}
            label="Horse"
            tabKey="horse"
            isActive={false}
          />
          <TabButton iconSource={require("../../assets/images/chat.png")} label="Chat" tabKey="chat" isActive={false} />
          <TabButton
            iconSource={require("../../assets/images/calendar.png")}
            label="Calendar"
            tabKey="calendar"
            isActive={true}
          />
          <TabButton
            iconSource={require("../../assets/images/history.png")}
            label="History"
            tabKey="history"
            isActive={false}
          />
          <TabButton iconSource={null} label="Profile" tabKey="profile" isActive={false} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#C17A47",
  },
  header: {
    backgroundColor: "#C17A47",
    paddingHorizontal: scale(16),
    paddingBottom: dynamicSpacing(16),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "white",
  },
  addButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
  },
  calendarSection: {
    backgroundColor: "white",
    marginHorizontal: scale(16),
    marginTop: dynamicSpacing(16),
    borderRadius: scale(12),
    padding: scale(16),
  },
  sectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(16),
    lineHeight: moderateScale(22),
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(16),
  },
  monthNavButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  monthNavText: {
    fontSize: moderateScale(18),
    color: "#666",
    fontWeight: "bold",
  },
  monthTitle: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "#333",
  },
  dayHeaders: {
    flexDirection: "row",
    marginBottom: verticalScale(8),
  },
  dayHeader: {
    flex: 1,
    alignItems: "center",
    paddingVertical: verticalScale(8),
  },
  dayHeaderText: {
    fontSize: moderateScale(12),
    color: "#666",
    fontWeight: "600",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: verticalScale(2),
  },
  dayContainer: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    justifyContent: "center",
    alignItems: "center",
  },
  eventDay: {
    backgroundColor: "#C17A47",
  },
  todayDay: {
    backgroundColor: "#4ECDC4",
  },
  eventTodayDay: {
    backgroundColor: "#C17A47",
    borderWidth: 2,
    borderColor: "#4ECDC4",
  },
  dayText: {
    fontSize: moderateScale(14),
    color: "#333",
    fontWeight: "500",
  },
  eventDayText: {
    color: "white",
    fontWeight: "600",
  },
  todayDayText: {
    color: "white",
    fontWeight: "600",
  },
  eventTodayDayText: {
    color: "white",
    fontWeight: "700",
  },
  emptyDayText: {
    fontSize: moderateScale(14),
    color: "transparent",
  },
  eventsSection: {
    backgroundColor: "white",
    marginHorizontal: scale(16),
    marginTop: dynamicSpacing(16),
    borderRadius: scale(12),
    padding: scale(16),
  },
  // REMOVED sectionHeader and addEventButton styles since they're no longer used
  tableContainer: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: scale(8),
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
  },
  tableHeaderText: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#666",
    textAlign: "left",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    alignItems: 'center',
  },
  tableCellText: {
    fontSize: moderateScale(12),
    color: "#333",
    textAlign: "left",
  },
  deleteButton: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: '#FF6347',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: moderateScale(14),
    fontWeight: 'bold',
  },
  noEventsContainer: {
    alignItems: "center",
    paddingVertical: verticalScale(24),
  },
  noEventsText: {
    fontSize: moderateScale(14),
    color: "#666",
    marginBottom: verticalScale(12),
  },
  addFirstEventButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    backgroundColor: "#F5F5F5",
  },
  addFirstEventText: {
    fontSize: moderateScale(12),
    color: "#C17A47",
    marginLeft: scale(8),
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "white",
    width: width * 0.9,
    maxHeight: height * 0.8,
    borderRadius: scale(16),
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "#333",
  },
  closeButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: moderateScale(20),
    color: "#666",
  },
  modalContent: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(16),
    maxHeight: height * 0.5,
  },
  inputGroup: {
    marginBottom: verticalScale(16),
  },
  inputLabel: {
    fontSize: moderateScale(14),
    fontWeight: "500",
    color: "#333",
    marginBottom: verticalScale(8),
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: scale(8),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    fontSize: moderateScale(14),
    color: "#333",
    backgroundColor: "#FAFAFA",
  },
  // New time input styles
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: scale(8),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    fontSize: moderateScale(14),
    color: "#333",
    backgroundColor: "#FAFAFA",
    textAlign: 'center',
  },
  hourInput: {
    width: scale(60),
  },
  minuteInput: {
    width: scale(60),
  },
  timeSeparator: {
    fontSize: moderateScale(16),
    color: "#333",
    marginHorizontal: scale(8),
  },
  ampmContainer: {
    flexDirection: 'row',
    marginLeft: scale(12),
  },
  ampmButton: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#FAFAFA",
  },
  ampmButtonActive: {
    backgroundColor: "#C17A47",
    borderColor: "#C17A47",
  },
  ampmText: {
    fontSize: moderateScale(12),
    color: "#666",
    fontWeight: "500",
  },
  ampmTextActive: {
    color: "white",
  },
  modalButtons: {
    flexDirection: "row",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(16),
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    gap: scale(12),
  },
  modalButton: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: scale(8),
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  cancelButtonText: {
    fontSize: moderateScale(14),
    fontWeight: "500",
    color: "#666",
  },
  saveButton: {
    backgroundColor: "#C17A47",
  },
  saveButtonText: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "white",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingVertical: dynamicSpacing(8),
    paddingHorizontal: scale(8),
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    minHeight: verticalScale(60),
    alignItems: "center",
    justifyContent: "space-around",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: verticalScale(4),
    paddingHorizontal: scale(2),
  },
  tabIcon: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(2),
  },
  activeTabIcon: {
    backgroundColor: "#C17A47",
  },
  tabIconImage: {
    width: scale(16),
    height: scale(16),
  },
  tabLabel: {
    fontSize: moderateScale(9),
    color: "#666",
    textAlign: "center",
  },
  activeTabLabel: {
    color: "#C17A47",
    fontWeight: "600",
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  dashboardGrid: {
    width: scale(14),
    height: scale(14),
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gridSquare: {
    width: scale(5),
    height: scale(5),
    margin: scale(1),
  },
  gridTopLeft: {
    borderTopLeftRadius: scale(2),
  },
  gridTopRight: {
    borderTopRightRadius: scale(2),
  },
  gridBottomLeft: {
    borderBottomLeftRadius: scale(2),
  },
  gridBottomRight: {
    borderBottomRightRadius: scale(2),
  },
  profileContainer: {
    alignItems: "center",
  },
  profileHead: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    marginBottom: scale(2),
  },
  profileBody: {
    width: scale(16),
    height: scale(10),
    borderRadius: scale(8),
  },
  plusIcon: {
    justifyContent: "center",
    alignItems: "center",
  },
  plusHorizontal: {
    position: "absolute",
    width: "80%",
    height: scale(2),
    borderRadius: scale(1),
  },
  plusVertical: {
    position: "absolute",
    width: scale(2),
    height: "80%",
    borderRadius: scale(1),
  },
  fallbackIcon: {
    width: scale(14),
    height: scale(14),
    backgroundColor: "#E0E0E0",
    borderRadius: scale(7),
  },
})