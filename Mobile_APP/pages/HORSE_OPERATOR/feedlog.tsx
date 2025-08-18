"use client"
import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native"
import { useRouter } from "expo-router"
import { FontAwesome5 } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect } from '@react-navigation/native'

type FeedLogEntry = {
  id: string;
  date: string;
  meal: string;
  horse: string;
  time: string;
  food: string;
  amount: string;
  status: string;
  action: 'completed' | 'edited';
  timestamp: string;
}

interface Horse {
  id: string;
  name: string;
  age: string;
  dateOfBirth: string;
  sex: string;
  breed: string;
  color: string;
  height: string;
  weight: string;
  image: string | null;
  lastVetCheck: string;
  condition: string;
  conditionColor: string;
}

const FeedLogScreen = () => {
  const router = useRouter()
  const [selectedDateObj, setSelectedDateObj] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedMeal, setSelectedMeal] = useState("All Meals")
  const [showMealDropdown, setShowMealDropdown] = useState(false)
  const [feedLogs, setFeedLogs] = useState<FeedLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<string>('')

  const [horses, setHorses] = useState<Horse[]>([]);
  const [selectedHorseFilter, setSelectedHorseFilter] = useState("All Horses");
  const [showHorseDropdown, setShowHorseDropdown] = useState(false);

  const mealOptions = ["All Meals", "Breakfast", "Lunch", "Dinner"]

  const getCurrentUser = async () => {
    try {
      const user = await AsyncStorage.getItem('current_user');
      if (user) {
        setCurrentUser(user);
        return user;
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
    return null;
  };

  // Load feed logs on component mount and when screen is focused
  useEffect(() => {
    const initializeData = async () => {
      const user = await getCurrentUser();
      if (user) {
        loadFeedLogs(user);
        loadHorses(user);
      }
    };
    initializeData();
  }, [])

  useFocusEffect(
    React.useCallback(() => {
      const refreshData = async () => {
        const user = await getCurrentUser();
        if (user) {
          loadFeedLogs(user);
          loadHorses(user);
        }
      };
      refreshData();
    }, [])
  )

  // Load user-specific feed logs from AsyncStorage
  const loadFeedLogs = async (user: string) => {
    try {
      setLoading(true)
      const userFeedLogsKey = `feedLogs_${user}`;
      const savedLogs = await AsyncStorage.getItem(userFeedLogsKey)
      if (savedLogs) {
        const logs: FeedLogEntry[] = JSON.parse(savedLogs)
        setFeedLogs(logs)
      } else {
        setFeedLogs([])
      }
    } catch (error) {
      console.error('Error loading feed logs:', error)
      setFeedLogs([])
    } finally {
      setLoading(false)
    }
  }

  // Load user-specific horses
  const loadHorses = async (user: string) => {
    try {
      const userHorsesKey = `horses_${user}`;
      const storedHorses = await AsyncStorage.getItem(userHorsesKey);
      if (storedHorses) {
        const horsesData: Horse[] = JSON.parse(storedHorses);
        setHorses(horsesData);
      } else {
        setHorses([]);
      }
    } catch (error) {
      console.error('Error loading horses:', error);
      setHorses([]);
    }
  };

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0")
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const selectedDate = formatDate(selectedDateObj)

  const handleDatePress = () => {
    setShowDatePicker(true)
  }

  const onDateChange = (event: any, selected?: Date) => {
    setShowDatePicker(Platform.OS === "ios")
    if (selected) {
      setSelectedDateObj(selected)
    }
  }

  const handleMealSelect = (meal: string) => {
    setSelectedMeal(meal)
    setShowMealDropdown(false)
  }

  // Add horse filter options
  const horseOptions = ["All Horses", ...horses.map(horse => horse.name)];

  // Add horse filter selection handler
  const handleHorseSelect = (horse: string) => {
    setSelectedHorseFilter(horse);
    setShowHorseDropdown(false);
  };

  // Filter logs for selected date
  const selectedDateString = selectedDateObj.toISOString().split('T')[0]
  const logsForSelectedDate = feedLogs.filter(log => log.date === selectedDateString)

  // Group logs by date for display
  const groupedLogs = logsForSelectedDate.reduce((groups: { [key: string]: FeedLogEntry[] }, log) => {
    const date = log.date
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(log)
    return groups
  }, {})

  // Clear user-specific feed logs
  const clearAllLogs = async () => {
    try {
      if (!currentUser) return;
      
      const userFeedLogsKey = `feedLogs_${currentUser}`;
      await AsyncStorage.removeItem(userFeedLogsKey)
      setFeedLogs([])
      alert(`All feed logs cleared for user ${currentUser}!`)
    } catch (error) {
      console.error('Error clearing logs:', error)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feed Log</Text>
        <TouchableOpacity onPress={clearAllLogs} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        {/* User Info
        {currentUser && (
          <View style={styles.userInfoContainer}>
            <Text style={styles.userInfoText}>User: {currentUser}</Text>
          </View>
        )} */}

        {/* Filter Section */}
        <View style={styles.filterSection}>
          {/* Date Selector */}
          <TouchableOpacity style={styles.dateSelector} onPress={handleDatePress}>
            <Text style={styles.dateText}>{selectedDate}</Text>
            <FontAwesome5 name="calendar-alt" size={16} color="#666" />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDateObj}
              mode="date"
              display="default"
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}

          {/* Meal Filter */}
          <View style={styles.statusFilterContainer}>
            <TouchableOpacity
              style={styles.statusSelector}
              onPress={() => setShowMealDropdown(!showMealDropdown)}
            >
              <Text style={styles.statusText}>{selectedMeal}</Text>
              <FontAwesome5 name="chevron-down" size={12} color="#666" />
            </TouchableOpacity>
            {showMealDropdown && (
              <View style={styles.statusDropdown}>
                {mealOptions.map((meal) => (
                  <TouchableOpacity 
                    key={meal}
                    style={styles.statusOption}
                    onPress={() => handleMealSelect(meal)}
                  >
                    <Text style={styles.statusOptionText}>{meal}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Horse Filter */}
          <View style={styles.statusFilterContainer}>
            <TouchableOpacity
              style={styles.statusSelector}
              onPress={() => setShowHorseDropdown(!showHorseDropdown)}
            >
              <Text style={styles.statusText}>{selectedHorseFilter}</Text>
              <FontAwesome5 name="chevron-down" size={12} color="#666" />
            </TouchableOpacity>
            {showHorseDropdown && (
              <View style={styles.statusDropdown}>
                {horseOptions.map((horse) => (
                  <TouchableOpacity 
                    key={horse}
                    style={styles.statusOption}
                    onPress={() => handleHorseSelect(horse)}
                  >
                    <Text style={styles.statusOptionText}>{horse}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Feed Log Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <Text style={styles.loadingText}>Loading feed logs...</Text>
          ) : Object.keys(groupedLogs).length > 0 ? (
            Object.entries(groupedLogs).map(([date, entries]) => (
              <View key={date} style={styles.logGroup}>
                <Text style={styles.dateHeader}>
                  {new Date(date).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
                {entries
                  .filter((entry) => selectedMeal === "All Meals" || entry.meal === selectedMeal)
                  .filter((entry) => selectedHorseFilter === "All Horses" || entry.horse === selectedHorseFilter)
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((entry) => (
                    <View key={entry.id} style={styles.feedEntry}>
                      <View style={styles.entryHeader}>
                        <Text style={styles.mealInfo}>
                          {entry.meal} - {entry.horse}
                        </Text>
                        <View style={styles.statusContainer}>
                          <Text style={[
                            styles.statusBadge,
                            entry.action === 'completed' ? styles.completedBadge : styles.editedBadge
                          ]}>
                            {entry.status}
                          </Text>
                          <Text style={styles.timeText}>{entry.time}</Text>
                        </View>
                      </View>
                      <Text style={styles.feedDetails}>
                        {entry.food}: {entry.amount}
                      </Text>
                      <Text style={styles.timestampText}>
                        {entry.action === 'completed' ? 'Fed' : 'Edited'} at {new Date(entry.timestamp).toLocaleString()}
                      </Text>
                    </View>
                  ))}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <FontAwesome5 name="clipboard-list" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>
                No feed entries for {selectedDate}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Feed entries will appear here when you mark meals as fed or edit feeding schedules.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#CD853F",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#CD853F",
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  clearButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  clearButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  userInfoContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  userInfoText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
  },
  filterSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#f5f5f5",
    gap: 10,
  },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    minWidth: 140,
  },
  dateText: {
    fontSize: 16,
    color: "#333",
    marginRight: 10,
  },
  statusFilterContainer: {
    position: "relative",
  },
  statusSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    minWidth: 120,
  },
  statusText: {
    fontSize: 16,
    color: "#333",
    marginRight: 10,
  },
  statusDropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginTop: 5,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusOption: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  statusOptionText: {
    fontSize: 16,
    color: "#333",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingText: {
    textAlign: "center",
    marginTop: 30,
    color: "#666",
    fontSize: 16,
  },
  logGroup: {
    marginBottom: 30,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  feedEntry: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 5,
  },
  mealInfo: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  statusContainer: {
    alignItems: "flex-end",
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  completedBadge: {
    backgroundColor: "#4CAF50",
    color: "#fff",
  },
  editedBadge: {
    backgroundColor: "#FF9800",
    color: "#fff",
  },
  timeText: {
    fontSize: 14,
    color: "#666",
  },
  feedDetails: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
    marginBottom: 5,
  },
  timestampText: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },
})

export default FeedLogScreen
