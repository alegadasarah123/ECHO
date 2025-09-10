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
  Alert,
} from "react-native"
import { useRouter } from "expo-router"
import { FontAwesome5 } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import * as SecureStore from 'expo-secure-store'
import { useFocusEffect } from '@react-navigation/native'

// Enhanced interface to match backend response exactly
type FeedLogEntry = {
  log_id: string;
  date: string;           // Backend: log_date (YYYY-MM-DD format)
  horse: string;          // Backend: resolved from horse_id
  horse_id: string;
  timestamp: string;      // Backend: created_at
  user_full_name: string; // Backend: log_user_full_name
  meal: string;           // Backend: log_meal
  time: string;           // Backend: log_time
  food: string;           // Backend: log_food
  amount: string;         // Backend: log_amount
  status: string;         // Backend: log_status
  action: 'completed' | 'edited'; // Backend: log_action.toLowerCase()
}

interface Horse {
  horse_id: string;
  horse_name: string;
  horse_age: string;
  horse_dob: string;
  horse_sex: string;
  horse_breed: string;
  horse_color: string;
  horse_height: string;
  horse_weight: string;
  horse_image: string | null;
}

const API_BASE_URL = "http://172.20.10.2:8000/api/horse_operator";

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

  // Enhanced user loading with better error handling
  const getCurrentUser = async () => {
    try {
      const storedUser = await SecureStore.getItemAsync("user_data");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const id = parsed.user_id || parsed.id;
        if (id) {
          console.log("🔑 Loaded user_id from storage:", id);
          setCurrentUser(id);
          return id;
        }
      }
      console.warn("⚠️ No user ID found in storage");
      Alert.alert('Error', 'User session not found. Please log in again.');
    } catch (error) {
      console.error('Error getting current user:', error);
      Alert.alert('Error', 'Failed to load user session.');
    }
    return null;
  };

  // FIXED: Enhanced feed log loading with better data validation
  const loadFeedLogs = async (userId: string) => {
    try {
      setLoading(true)
      const url = `${API_BASE_URL}/get_feed_logs/?user_id=${encodeURIComponent(userId)}`;
      console.log("📡 Fetching feed logs from:", url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log("📡 Response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Raw feed logs from backend:", JSON.stringify(data, null, 2));
        
        if (Array.isArray(data)) {
          // Enhanced data validation and normalization
          const validLogs = data
            .filter(log => {
              const isValid = log.log_id && log.date && log.meal && log.food;
              if (!isValid) {
                console.warn("⚠️ Invalid log entry:", log);
              }
              return isValid;
            })
            .map(log => {
              // Ensure date is in correct format (YYYY-MM-DD)
              let normalizedDate = log.date;
              
              // Handle different date formats
              if (log.date && typeof log.date === 'string') {
                // If it's already YYYY-MM-DD, keep it
                if (/^\d{4}-\d{2}-\d{2}$/.test(log.date)) {
                  normalizedDate = log.date;
                } else {
                  // Try to parse and convert to YYYY-MM-DD
                  try {
                    const dateObj = new Date(log.date);
                    if (!isNaN(dateObj.getTime())) {
                      // Format to YYYY-MM-DD in local timezone
                      normalizedDate = dateObj.getFullYear() + '-' + 
                        String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(dateObj.getDate()).padStart(2, '0');
                    }
                  } catch (dateError) {
                    console.warn("⚠️ Could not parse date:", log.date, dateError);
                  }
                }
              }
              
              return {
                ...log,
                date: normalizedDate,
                action: (log.action || '').toLowerCase() as 'completed' | 'edited'
              };
            });
          
          setFeedLogs(validLogs);
          console.log(`✅ Loaded ${validLogs.length} valid feed log entries out of ${data.length} total`);
          
          // Enhanced debugging: Log unique dates and their counts
          const dateGroups = validLogs.reduce((groups: { [key: string]: number }, log) => {
            const date = log.date;
            groups[date] = (groups[date] || 0) + 1;
            return groups;
          }, {});
          
          console.log("📅 Feed logs by date:", dateGroups);
          
        } else {
          console.error("❌ Backend returned non-array data:", data);
          setFeedLogs([]);
          Alert.alert('Warning', 'Unexpected data format from server');
        }
      } else {
        const errorText = await response.text();
        console.error("❌ Failed to load feed logs:", response.status, errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          Alert.alert('Error', `Failed to load feed logs: ${errorData.error || 'Unknown error'}`);
        } catch {
          Alert.alert('Error', `Server error (${response.status}): ${errorText}`);
        }
        setFeedLogs([]);
      }
    } catch (error) {
      console.error('❌ Network error loading feed logs:', error)
      Alert.alert('Network Error', 'Unable to connect to server. Please check your internet connection.');
      setFeedLogs([])
    } finally {
      setLoading(false)
    }
  }

  // Enhanced horse loading
  const loadHorses = async (userId: string) => {
    try {
      const url = `${API_BASE_URL}/get_horses/?user_id=${encodeURIComponent(userId)}`;
      console.log("📡 Fetching horses from:", url);

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Horses loaded:", data.length, "horses");
        setHorses(Array.isArray(data) ? data : []);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.log("⚠️ Failed to load horses:", errorData);
        setHorses([]);
      }
    } catch (error) {
      console.error('❌ Error loading horses:', error);
      setHorses([]);
    }
  };

  // Load data on component mount
  useEffect(() => {
    const initializeData = async () => {
      console.log("🚀 Initializing FeedLog component");
      const userId = await getCurrentUser();
      if (userId) {
        await Promise.all([
          loadFeedLogs(userId),
          loadHorses(userId)
        ]);
      } else {
        setLoading(false);
      }
    };
    initializeData();
  }, [])

  // Refresh data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const refreshData = async () => {
        if (currentUser) {
          console.log("🔄 Refreshing data for user:", currentUser);
          await Promise.all([
            loadFeedLogs(currentUser),
            loadHorses(currentUser)
          ]);
        }
      };
      refreshData();
    }, [currentUser])
  )

  // Enhanced date formatting with validation
  const formatDate = (date: Date) => {
    try {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  }

  const selectedDate = formatDate(selectedDateObj)

  const handleDatePress = () => {
    setShowDatePicker(true)
  }

  const onDateChange = (event: any, selected?: Date) => {
    setShowDatePicker(Platform.OS === "ios")
    if (selected) {
      setSelectedDateObj(selected)
      console.log("📅 Date changed to:", selected.toISOString().split('T')[0]);
    }
  }

  const handleMealSelect = (meal: string) => {
    setSelectedMeal(meal)
    setShowMealDropdown(false)
    console.log("🍽️ Meal filter changed to:", meal);
  }

  const handleHorseSelect = (horse: string) => {
    setSelectedHorseFilter(horse);
    setShowHorseDropdown(false);
    console.log("🐴 Horse filter changed to:", horse);
  };

  // Close dropdowns when touching outside
  const closeDropdowns = () => {
    setShowMealDropdown(false);
    setShowHorseDropdown(false);
  };

  // FIXED: Enhanced filtering with better debugging and timezone handling
  const selectedDateString = selectedDateObj.toISOString().split('T')[0]
  console.log("🗓️ Selected date for filtering:", selectedDateString);
  console.log("📋 Total feed logs available:", feedLogs.length);
  
  // Filter logs by selected date with enhanced debugging
  const logsForSelectedDate = feedLogs.filter(log => {
    console.log(`🔍 Comparing log date '${log.date}' with selected '${selectedDateString}'`);
    const matches = log.date === selectedDateString;
    if (matches) {
      console.log("✅ Log matches date:", log.log_id, log.date, log);
    }
    return matches;
  });

  console.log(`📋 Found ${logsForSelectedDate.length} logs for date ${selectedDateString}`);
  if (logsForSelectedDate.length > 0) {
    console.log("📋 Logs for selected date:", logsForSelectedDate);
  }

  // Apply additional filters (meal and horse)
  const finalFilteredLogs = logsForSelectedDate
    .filter((entry) => {
      const mealMatch = selectedMeal === "All Meals" || entry.meal === selectedMeal;
      const horseMatch = selectedHorseFilter === "All Horses" || entry.horse === selectedHorseFilter;
      const matches = mealMatch && horseMatch;
      
      if (!mealMatch) {
        console.log(`🚫 Entry filtered out by meal: ${entry.meal} != ${selectedMeal}`);
      }
      if (!horseMatch) {
        console.log(`🚫 Entry filtered out by horse: ${entry.horse} != ${selectedHorseFilter}`);
      }
      
      return matches;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  console.log(`📊 Final filtered logs count: ${finalFilteredLogs.length}`);

  // Group logs by date for display
  const groupedLogs = finalFilteredLogs.reduce((groups: { [key: string]: FeedLogEntry[] }, log) => {
    const date = log.date;
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(log)
    return groups
  }, {})

  console.log("📊 Grouped logs:", Object.keys(groupedLogs).length, "date groups");

  // Enhanced clear logs function
  const clearAllLogs = async () => {
    try {
      if (!currentUser) {
        Alert.alert('Error', 'User not found. Please log in again.');
        return;
      }

      Alert.alert(
        'Clear All Logs',
        'Are you sure you want to clear all feed logs? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log("🗑️ Clearing all logs for user:", currentUser);
                
                const response = await fetch(`${API_BASE_URL}/clear_feed_logs/`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    user_id: currentUser,
                  }),
                });

                if (response.ok) {
                  const result = await response.json();
                  console.log("✅ Clear logs response:", result);
                  
                  setFeedLogs([]);
                  Alert.alert('Success', 'All feed logs cleared successfully');
                } else {
                  const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                  console.error("❌ Clear logs error:", errorData);
                  Alert.alert('Error', errorData.error || 'Failed to clear feed logs');
                }
              } catch (error: any) {
                console.error('❌ Error clearing logs:', error);
                Alert.alert('Error', 'Network error while clearing logs');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error in clearAllLogs:', error)
    }
  }

  // Horse filter options
  const horseOptions = ["All Horses", ...horses.map(horse => horse.horse_name)];

  const getMealIcon = (meal: string) => {
    switch (meal) {
      case 'Breakfast': return 'sunrise';
      case 'Lunch': return 'sun';
      case 'Dinner': return 'moon';
      default: return 'utensils';
    }
  };

  const getMealColor = (meal: string) => {
    switch (meal) {
      case 'Breakfast': return '#F59E0B';
      case 'Lunch': return '#10B981';
      case 'Dinner': return '#6366F1';
      default: return '#64748B';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Modern Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={18} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Feed Log</Text>
          <Text style={styles.headerSubtitle}>Track feeding history</Text>
        </View>
        <TouchableOpacity onPress={clearAllLogs} style={styles.clearButton}>
          <FontAwesome5 name="trash-alt" size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity activeOpacity={1} onPress={closeDropdowns} style={styles.overlay}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          {/* Enhanced Filter Section */}
          <View style={styles.filterSection}>
            <View style={styles.filterHeader}>
              <View style={styles.filterTitleContainer}>
                <FontAwesome5 name="filter" size={16} color="#6366F1" />
                <Text style={styles.filterTitle}>Filters</Text>
              </View>
              <View style={styles.resultBadge}>
                <Text style={styles.resultCount}>{finalFilteredLogs.length}</Text>
                <Text style={styles.resultLabel}>entries</Text>
              </View>
            </View>

            {/* Filter Controls */}
            <View style={styles.filterControls}>
              {/* Date Filter - Full Width */}
              <TouchableOpacity style={styles.dateFilterButton} onPress={handleDatePress}>
                <View style={styles.filterIcon}>
                  <FontAwesome5 name="calendar-alt" size={16} color="#6366F1" />
                </View>
                <View style={styles.filterContent}>
                  <Text style={styles.filterLabel}>Date</Text>
                  <Text style={styles.filterValue}>{selectedDate}</Text>
                </View>
                <FontAwesome5 name="chevron-down" size={12} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Meal and Horse Filters Row */}
              <View style={styles.filterRow}>
                {/* Meal Filter */}
                <View style={[styles.dropdownWrapper, showMealDropdown && styles.dropdownWrapperActive]}>
                  <TouchableOpacity
                    style={[styles.filterButton, selectedMeal !== "All Meals" && styles.filterButtonActive]}
                    onPress={() => {
                      setShowHorseDropdown(false);
                      setShowMealDropdown(!showMealDropdown);
                    }}
                  >
                    <View style={[styles.filterIcon, { backgroundColor: '#ECFDF5' }]}>
                      <FontAwesome5 name="utensils" size={14} color="#10B981" />
                    </View>
                    <View style={styles.filterContent}>
                      <Text style={styles.filterLabel}>Meal</Text>
                      <Text style={styles.filterValue} numberOfLines={1}>
                        {selectedMeal === "All Meals" ? "All" : selectedMeal}
                      </Text>
                    </View>
                    <FontAwesome5 
                      name={showMealDropdown ? "chevron-up" : "chevron-down"} 
                      size={10} 
                      color="#9CA3AF" 
                    />
                  </TouchableOpacity>

                  {showMealDropdown && (
                    <View style={styles.dropdown}>
                      <View style={styles.dropdownHeader}>
                        <Text style={styles.dropdownTitle}>Select Meal</Text>
                      </View>
                      {mealOptions.map((meal, index) => (
                        <TouchableOpacity
                          key={meal}
                          style={[
                            styles.dropdownItem,
                            selectedMeal === meal && styles.dropdownItemSelected,
                            index === mealOptions.length - 1 && styles.dropdownItemLast
                          ]}
                          onPress={() => handleMealSelect(meal)}
                        >
                          <View style={styles.dropdownItemContent}>
                            <FontAwesome5 
                              name={meal === "All Meals" ? "list" : getMealIcon(meal)} 
                              size={14} 
                              color={meal === "All Meals" ? "#64748B" : getMealColor(meal)} 
                            />
                            <Text style={[
                              styles.dropdownItemText,
                              selectedMeal === meal && styles.dropdownItemTextSelected
                            ]}>
                              {meal}
                            </Text>
                          </View>
                          {selectedMeal === meal && (
                            <View style={styles.checkIcon}>
                              <FontAwesome5 name="check" size={12} color="#6366F1" />
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Horse Filter */}
                <View style={[styles.dropdownWrapper, showHorseDropdown && styles.dropdownWrapperActive]}>
                  <TouchableOpacity
                    style={[styles.filterButton, selectedHorseFilter !== "All Horses" && styles.filterButtonActive]}
                    onPress={() => {
                      setShowMealDropdown(false);
                      setShowHorseDropdown(!showHorseDropdown);
                    }}
                  >
                    <View style={[styles.filterIcon, { backgroundColor: '#FEF3C7' }]}>
                      <FontAwesome5 name="horse-head" size={14} color="#F59E0B" />
                    </View>
                    <View style={styles.filterContent}>
                      <Text style={styles.filterLabel}>Horse</Text>
                      <Text style={styles.filterValue} numberOfLines={1}>
                        {selectedHorseFilter === "All Horses" ? "All" : 
                         selectedHorseFilter.length > 8 ? `${selectedHorseFilter.substring(0, 8)}...` : selectedHorseFilter}
                      </Text>
                    </View>
                    <FontAwesome5 
                      name={showHorseDropdown ? "chevron-up" : "chevron-down"} 
                      size={10} 
                      color="#9CA3AF" 
                    />
                  </TouchableOpacity>

                  {showHorseDropdown && (
                    <View style={styles.dropdown}>
                      <View style={styles.dropdownHeader}>
                        <Text style={styles.dropdownTitle}>Select Horse</Text>
                      </View>
                      {horseOptions.map((horse, index) => (
                        <TouchableOpacity
                          key={horse}
                          style={[
                            styles.dropdownItem,
                            selectedHorseFilter === horse && styles.dropdownItemSelected,
                            index === horseOptions.length - 1 && styles.dropdownItemLast
                          ]}
                          onPress={() => handleHorseSelect(horse)}
                        >
                          <View style={styles.dropdownItemContent}>
                            <FontAwesome5 
                              name={horse === "All Horses" ? "list" : "horse-head"} 
                              size={14} 
                              color={horse === "All Horses" ? "#64748B" : "#F59E0B"} 
                            />
                            <Text style={[
                              styles.dropdownItemText,
                              selectedHorseFilter === horse && styles.dropdownItemTextSelected
                            ]}>
                              {horse}
                            </Text>
                          </View>
                          {selectedHorseFilter === horse && (
                            <View style={styles.checkIcon}>
                              <FontAwesome5 name="check" size={12} color="#6366F1" />
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Active Filters Display */}
              {(selectedMeal !== "All Meals" || selectedHorseFilter !== "All Horses") && (
                <View style={styles.activeFilters}>
                  <Text style={styles.activeFiltersLabel}>Active filters:</Text>
                  <View style={styles.activeFilterTags}>
                    {selectedMeal !== "All Meals" && (
                      <View style={styles.activeFilterTag}>
                        <Text style={styles.activeFilterTagText}>{selectedMeal}</Text>
                        <TouchableOpacity onPress={() => setSelectedMeal("All Meals")}>
                          <FontAwesome5 name="times" size={10} color="#6366F1" />
                        </TouchableOpacity>
                      </View>
                    )}
                    {selectedHorseFilter !== "All Horses" && (
                      <View style={styles.activeFilterTag}>
                        <Text style={styles.activeFilterTagText}>{selectedHorseFilter}</Text>
                        <TouchableOpacity onPress={() => setSelectedHorseFilter("All Horses")}>
                          <FontAwesome5 name="times" size={10} color="#6366F1" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDateObj}
              mode="date"
              display="default"
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}

          {/* Content Area */}
          <View style={styles.content}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <View style={styles.loadingSpinner}>
                  <FontAwesome5 name="spinner" size={24} color="#6366F1" />
                </View>
                <Text style={styles.loadingText}>Loading feed logs...</Text>
              </View>
            ) : finalFilteredLogs.length > 0 ? (
              <View style={styles.logsContainer}>
                {finalFilteredLogs.map((entry, index) => (
                  <View key={`${entry.log_id}-${index}`} style={styles.logCard}>
                    <View style={styles.logHeader}>
                      <View style={styles.logMeta}>
                        <View style={[styles.mealBadge, { backgroundColor: `${getMealColor(entry.meal)}15` }]}>
                          <FontAwesome5 
                            name={getMealIcon(entry.meal)} 
                            size={12} 
                            color={getMealColor(entry.meal)} 
                          />
                          <Text style={[styles.mealBadgeText, { color: getMealColor(entry.meal) }]}>
                            {entry.meal}
                          </Text>
                        </View>
                        <Text style={styles.timeText}>{entry.time}</Text>
                      </View>
                      <View style={[
                        styles.statusBadge,
                        entry.action === 'completed' ? styles.completedStatus : styles.editedStatus
                      ]}>
                        <Text style={styles.statusText}>
                          {entry.status}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.logBody}>
                      <Text style={styles.horseName}>{entry.horse}</Text>
                      <View style={styles.foodInfo}>
                        <FontAwesome5 name="seedling" size={14} color="#10B981" />
                        <Text style={styles.foodText}>{entry.food}</Text>
                        <View style={styles.amountChip}>
                          <Text style={styles.amountText}>{entry.amount}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.logFooter}>
                      <View style={styles.userInfo}>
                        <FontAwesome5 name="user-circle" size={12} color="#9CA3AF" />
                        <Text style={styles.userText}>
                          {entry.action === 'completed' ? 'Fed by' : 'Logged by'} {entry.user_full_name}
                        </Text>
                      </View>
                      <Text style={styles.timestampText}>
                        {new Date(entry.timestamp).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <FontAwesome5 name="clipboard-list" size={32} color="#D1D5DB" />
                </View>
                <Text style={styles.emptyTitle}>No feed entries found</Text>
                <Text style={styles.emptyDescription}>
                  No feed entries for {selectedDate}
                </Text>
                <Text style={styles.emptySubtext}>
                  Feed entries will appear here when horses are fed.
                </Text>
                {selectedMeal !== "All Meals" || selectedHorseFilter !== "All Horses" ? (
                  <View style={styles.emptyActions}>
                    <Text style={styles.emptyHint}>
                      Try adjusting your filters or selecting a different date.
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
        </ScrollView>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  overlay: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerCenter: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  container: {
    flex: 1,
  },
  filterSection: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  filterTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    marginLeft: 8,
  },
  resultBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  resultCount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6366F1",
    marginRight: 4,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6366F1",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filterControls: {
    gap: 16,
  },
  dateFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFBFF",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E0E7FF",
  },
  filterRow: {
    flexDirection: "row",
    gap: 12,
  },
  dropdownWrapper: {
    flex: 1,
    position: "relative",
    zIndex: 1000,
  },
  dropdownWrapperActive: {
    zIndex: 2000,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFBFF",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    minHeight: 64,
  },
  filterButtonActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#C7D2FE",
  },
  filterIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  filterContent: {
    flex: 1,
    minWidth: 0,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  filterValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  dropdown: {
    // Original dropdown is now hidden - using absolute positioning instead
    display: "none",
  },
  dropdownHeader: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  dropdownTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
    minHeight: 56,
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemSelected: {
    backgroundColor: "#EEF2FF",
  },
  dropdownItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dropdownItemText: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "500",
    marginLeft: 14,
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: "#6366F1",
    fontWeight: "600",
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  activeFilters: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  activeFiltersLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  activeFilterTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  activeFilterTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  activeFilterTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6366F1",
    marginRight: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  loadingSpinner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#C7D2FE",
  },
  loadingText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
  },
  logsContainer: {
    gap: 16,
  },
  logCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  logMeta: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  mealBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  mealBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
  },
  completedStatus: {
    backgroundColor: "#DCFCE7",
    borderColor: "#BBF7D0",
  },
  editedStatus: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#059669",
  },
  logBody: {
    marginBottom: 16,
  },
  horseName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  foodInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  foodText: {
    fontSize: 14,
    color: "#059669",
    fontWeight: "600",
    marginLeft: 12,
    flex: 1,
  },
  amountChip: {
    backgroundColor: "#059669",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  amountText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  logFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userText: {
    fontSize: 12,
    color: "#64748B",
    marginLeft: 8,
    fontWeight: "500",
  },
  timestampText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#374151",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyDescription: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "500",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
    maxWidth: 280,
  },
  emptyActions: {
    alignItems: "center",
  },
  emptyHint: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    fontStyle: "italic",
    maxWidth: 240,
    fontWeight: "500",
  },
})

export default FeedLogScreen