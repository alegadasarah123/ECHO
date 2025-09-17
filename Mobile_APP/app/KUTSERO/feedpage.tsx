"use client"

import { useState, useEffect } from "react"
import {
  Alert,
  Dimensions,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native"
import FeedLogPage from "./FeedLogPage"

const { width, height } = Dimensions.get("window")

// API Configuration - Update to match your Django URLs
const API_BASE_URL = "http://192.168.1.7:8000/api/kutsero/"

// Enhanced responsive scaling functions
const scale = (size: number) => {
  const scaleFactor = width / 375
  const scaledSize = size * scaleFactor
  return Math.max(Math.min(scaledSize, size * 1.3), size * 0.7)
}

const verticalScale = (size: number) => {
  const scaleFactor = height / 812
  const scaledSize = size * scaleFactor
  return Math.max(Math.min(scaledSize, size * 1.2), size * 0.8)
}

const moderateScale = (size: number, factor = 0.5) => {
  const scaledSize = size + (scale(size) - size) * factor
  return Math.max(Math.min(scaledSize, size * 1.2), size * 0.8)
}

// Mobile-optimized spacing
const dynamicSpacing = (baseSize: number) => {
  if (width < 350) return verticalScale(baseSize * 0.7)
  if (width < 400) return verticalScale(baseSize * 0.85)
  if (width > 450) return verticalScale(baseSize * 1.1)
  return verticalScale(baseSize)
}

// Safe area calculations
const getSafeAreaPadding = () => {
  const statusBarHeight = StatusBar.currentHeight || 0
  return {
    top: Math.max(statusBarHeight, 20),
    bottom: height > 800 ? 34 : 20,
  }
}

// Interfaces matching your API structure
interface FeedDetail {
  fd_id: string
  user_id: string
  horse_id: string
  fd_meal_type: string
  fd_food_type: string
  fd_qty: string
  fd_time: string
  completed: boolean
  completed_at?: string
}

interface LocalFeedItem {
  id: string
  name: string
  food_type: string
  amount: string
  time: string
  completed: boolean
}

interface FeedPageProps {
  onBack: () => void
  feedType: "feed" | "water"
  horseName?: string
  userId?: string
  horseId?: string
}

export default function FeedPage({
  onBack,
  feedType,
  horseName = "Oscar",
  userId = "default_user",
  horseId = "default_horse",
}: FeedPageProps) {
  const [showEditModal, setShowEditModal] = useState(false)
  const [showFeedLog, setShowFeedLog] = useState(false)
  const [editingMeal, setEditingMeal] = useState<"Breakfast" | "Lunch" | "Dinner" | null>(null)
  const [newFoodType, setNewFoodType] = useState("")
  const [newAmount, setNewAmount] = useState("")
  const [newTime, setNewTime] = useState("")
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [debugMode, setDebugMode] = useState(false)

  const safeArea = getSafeAreaPadding()

  // API-fetched feeds organized by meal type
  const [apiFeeds, setApiFeeds] = useState<FeedDetail[]>([])

  // Local feeds for display (transformed from API data)
  const [breakfastFeeds, setBreakfastFeeds] = useState<LocalFeedItem[]>([])
  const [lunchFeeds, setLunchFeeds] = useState<LocalFeedItem[]>([])
  const [dinnerFeeds, setDinnerFeeds] = useState<LocalFeedItem[]>([])

  // API Functions
  const fetchFeeds = async () => {
    try {
      setRefreshing(true)
      const url = `${API_BASE_URL}get_feeding_schedule/?user_id=${userId}&horse_id=${horseId}`
      console.log("Fetching feeds from:", url)

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Fetched feeds:", data)
      
      setApiFeeds(data)
      transformApiToLocalFeeds(data)
      
    } catch (error: unknown) {
      console.error("Error fetching feeds:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      Alert.alert("Error", `Failed to fetch feeds: ${errorMessage}`)
    } finally {
      setRefreshing(false)
    }
  }

  const saveMultipleFeeds = async (meals: Array<{ food: string; amount: string; time: string }>) => {
    try {
      setLoading(true)
      
      const requestBody = {
        user_id: userId,
        horse_id: horseId,
        schedule: meals.map(meal => ({
          food: meal.food,
          amount: meal.amount,
          time: meal.time,
          completed: false
        }))
      }

      const url = `${API_BASE_URL}save_feeding_schedule/`
      console.log("Saving to:", url, "Data:", requestBody)

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Save response:", data)

      Alert.alert("Success", data.message || "Feeding schedule saved successfully")
      await fetchFeeds() // Refresh the feeds
      
    } catch (error: unknown) {
      console.error("Error saving feeds:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      Alert.alert("Error", `Failed to save feeding schedule: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const markFeedCompleted = async (fdId: string) => {
    try {
      const requestBody = {
        user_id: userId,
        horse_id: horseId,
        fd_id: fdId,
        completed_at: new Date().toISOString(),
      }

      const url = `${API_BASE_URL}mark_meal_fed/`
      console.log("Marking meal as fed:", url, "Data:", requestBody)

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Mark meal response:", data)

      Alert.alert("Success", data.message || "Meal marked as fed and logged")
      await fetchFeeds() // Refresh the feeds
      
    } catch (error: unknown) {
      console.error("Error marking feed as completed:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      Alert.alert("Error", `Failed to mark feed as completed: ${errorMessage}`)
    }
  }

  const getFeedLogs = async () => {
    try {
      const url = `${API_BASE_URL}get_feed_logs/?user_id=${userId}`
      console.log("Fetching feed logs from:", url)

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Fetched feed logs:", data)
      
      return data
      
    } catch (error: unknown) {
      console.error("Error fetching feed logs:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      Alert.alert("Error", `Failed to fetch feed logs: ${errorMessage}`)
      return []
    }
  }

  // Test connection function
  const testConnection = async () => {
    try {
      const url = `${API_BASE_URL}get_feeding_schedule/?user_id=test&horse_id=test`
      console.log("Testing connection to:", url)
      
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("Connection test status:", response.status)
      
      if (response.ok) {
        Alert.alert("Connection Test", "✅ Server connection successful!")
      } else {
        Alert.alert("Connection Test", `❌ Server responded with status: ${response.status}`)
      }
    } catch (error: unknown) {
      console.error("Connection test failed:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      Alert.alert("Connection Test", `❌ Connection failed: ${errorMessage}`)
    }
  }

  // Transform API feeds to local format
  const transformApiToLocalFeeds = (feeds: any[]) => {
    console.log("Transforming feeds:", feeds)
    const breakfast: LocalFeedItem[] = []
    const lunch: LocalFeedItem[] = []
    const dinner: LocalFeedItem[] = []

    feeds.forEach((feed) => {
      const feedItem: LocalFeedItem = {
        id: feed.fd_id,
        name: horseName,
        food_type: feed.fd_food_type,
        amount: feed.fd_qty,
        time: feed.fd_time,
        completed: feed.completed,
      }

      // Group by meal type
      if (feed.fd_meal_type === "Breakfast") {
        breakfast.push(feedItem)
      } else if (feed.fd_meal_type === "Lunch") {
        lunch.push(feedItem)
      } else if (feed.fd_meal_type === "Dinner") {
        dinner.push(feedItem)
      }
    })

    console.log("Transformed feeds - Breakfast:", breakfast.length, "Lunch:", lunch.length, "Dinner:", dinner.length)

    setBreakfastFeeds(breakfast)
    setLunchFeeds(lunch)
    setDinnerFeeds(dinner)
  }

  // Load feeds on component mount
  useEffect(() => {
    console.log("Component mounted, fetching feeds for:", { userId, horseId })
    fetchFeeds()
  }, [userId, horseId])

  // Show feed log page
  if (showFeedLog) {
    return <FeedLogPage onBack={() => setShowFeedLog(false)} feedType={feedType} />
  }

  const handleEdit = (meal: "Breakfast" | "Lunch" | "Dinner") => {
    setEditingMeal(meal)
    setShowEditModal(true)
    // Reset form with default times
    setNewFoodType("")
    setNewAmount("")
    // Set default times based on meal
    if (meal === "Breakfast") {
      setNewTime("7:00 AM")
    } else if (meal === "Lunch") {
      setNewTime("12:00 PM")
    } else {
      setNewTime("6:00 PM")
    }
  }

  const handleSaveFeed = async () => {
    if (!newFoodType.trim() || !newAmount.trim() || !newTime.trim()) {
      Alert.alert("Error", "Please fill in all fields")
      return
    }

    // Prepare feed data for API
    const feedData = [{
      food: newFoodType.trim(),
      amount: newAmount.trim(),
      time: newTime.trim(),
    }]

    console.log("Saving feed data:", feedData)

    // Save feed via API
    await saveMultipleFeeds(feedData)
    setShowEditModal(false)
  }

  const handleClearMeal = (mealType: "Breakfast" | "Lunch" | "Dinner") => {
    Alert.alert(
      "Clear Feeds",
      `Are you sure you want to clear all ${mealType} feeds? This will save a new empty schedule.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            // Save empty schedule to clear all feeds
            saveMultipleFeeds([])
          },
        },
      ],
    )
  }

  const FeedIcon = () => (
    <View style={styles.feedIconContainer}>
      <View style={styles.bowlShape} />
      <View style={styles.bowlBase} />
    </View>
  )

  const BackIcon = () => (
    <View style={styles.backIconContainer}>
      <View style={styles.backArrow} />
    </View>
  )

  const LogIcon = () => (
    <View style={styles.logIconContainer}>
      <View style={styles.logLine} />
      <View style={[styles.logLine, { marginTop: scale(3) }]} />
      <View style={[styles.logLine, { marginTop: scale(3), width: scale(8) }]} />
    </View>
  )

  const renderFeedTable = (feeds: LocalFeedItem[], mealType: "Breakfast" | "Lunch" | "Dinner") => {
    if (feeds.length === 0) {
      return (
        <View style={styles.noFeedsContainer}>
          <Text style={styles.noFeedsText}>No feeds planned</Text>
        </View>
      )
    }

    return (
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderCell}>Food Type</Text>
          <Text style={styles.tableHeaderCell}>Amount</Text>
          <Text style={styles.tableHeaderCell}>Time</Text>
        </View>
        {feeds.map((feed) => {
          return (
            <View key={feed.id} style={styles.tableRow}>
              <View style={[styles.horseNameContainer, feed.completed && styles.completedRow]}>
                <Text style={[styles.horseName, feed.completed && styles.completedText]}>
                  {feed.name} {feed.completed && "✓"}
                </Text>
                {!feed.completed && (
                  <TouchableOpacity style={styles.completeButton} onPress={() => markFeedCompleted(feed.id)}>
                    <Text style={styles.completeButtonText}>Complete</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.tableCells}>
                <Text style={[styles.tableCell, feed.completed && styles.completedText]}>{feed.food_type}</Text>
                <Text style={[styles.tableCell, feed.completed && styles.completedText]}>{feed.amount}</Text>
                <Text style={[styles.tableCell, feed.completed && styles.completedText]}>{feed.time}</Text>
              </View>
            </View>
          )
        })}
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C17A47" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: safeArea.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <FeedIcon />
          <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>
            {feedType === "feed" ? "Feeds" : "Water"} - {horseName}
          </Text>
        </View>
        <TouchableOpacity style={styles.feedLogButton} onPress={() => setShowFeedLog(true)}>
          <LogIcon />
        </TouchableOpacity>
      </View>

      {/* Debug Info Section - Remove in production */}
      {debugMode && (
        <View style={styles.debugContainer}>
          <View style={styles.debugHeader}>
            <Text style={styles.debugTitle}>Debug Information</Text>
            <TouchableOpacity onPress={() => setDebugMode(false)} style={styles.hideDebugButton}>
              <Text style={styles.hideDebugText}>Hide</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.debugText}>API Base URL: {API_BASE_URL}</Text>
          <Text style={styles.debugText}>User ID: {userId}</Text>
          <Text style={styles.debugText}>Horse ID: {horseId}</Text>
          <Text style={styles.debugText}>Horse Name: {horseName}</Text>
          <Text style={styles.debugText}>Loaded Feeds: {apiFeeds.length}</Text>
          <View style={styles.debugButtonContainer}>
            <TouchableOpacity style={styles.debugButton} onPress={testConnection}>
              <Text style={styles.debugButtonText}>Test API</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.debugButton} onPress={fetchFeeds}>
              <Text style={styles.debugButtonText}>Test Fetch</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Loading indicator */}
      {(loading || refreshing) && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C17A47" />
          <Text style={styles.loadingText}>{refreshing ? "Refreshing feeds..." : "Processing..."}</Text>
        </View>
      )}

      {/* Refresh button */}
      <View style={styles.refreshContainer}>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchFeeds} disabled={refreshing}>
          <Text style={styles.refreshButtonText}>{refreshing ? "Refreshing..." : "Refresh Feeds"}</Text>
        </TouchableOpacity>
        {!debugMode && (
          <TouchableOpacity style={styles.showDebugButton} onPress={() => setDebugMode(true)}>
            <Text style={styles.showDebugText}>Debug</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Breakfast Section */}
        <View style={styles.mealSection}>
          <View style={styles.mealHeader}>
            <Text style={styles.mealTitle}>Breakfast</Text>
            <View style={styles.mealActions}>
              <TouchableOpacity style={styles.clearButton} onPress={() => handleClearMeal("Breakfast")}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editButton} onPress={() => handleEdit("Breakfast")}>
                <Text style={styles.editButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
          {renderFeedTable(breakfastFeeds, "Breakfast")}
        </View>

        {/* Lunch Section */}
        <View style={styles.mealSection}>
          <View style={styles.mealHeader}>
            <Text style={styles.mealTitle}>Lunch</Text>
            <View style={styles.mealActions}>
              <TouchableOpacity style={styles.clearButton} onPress={() => handleClearMeal("Lunch")}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editButton} onPress={() => handleEdit("Lunch")}>
                <Text style={styles.editButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
          {renderFeedTable(lunchFeeds, "Lunch")}
        </View>

        {/* Dinner Section */}
        <View style={styles.mealSection}>
          <View style={styles.mealHeader}>
            <Text style={styles.mealTitle}>Dinner</Text>
            <View style={styles.mealActions}>
              <TouchableOpacity style={styles.clearButton} onPress={() => handleClearMeal("Dinner")}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editButton} onPress={() => handleEdit("Dinner")}>
                <Text style={styles.editButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
          {renderFeedTable(dinnerFeeds, "Dinner")}
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1} adjustsFontSizeToFit>
                Add {editingMeal} Feed
              </Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Food Type</Text>
                <TextInput
                  style={styles.textInput}
                  value={newFoodType}
                  onChangeText={setNewFoodType}
                  placeholder="e.g., Hay, Oats, Mixed feed"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Amount</Text>
                <TextInput
                  style={styles.textInput}
                  value={newAmount}
                  onChangeText={setNewAmount}
                  placeholder="e.g., 3 scoops, 2 kg"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Time</Text>
                <TextInput
                  style={styles.textInput}
                  value={newTime}
                  onChangeText={setNewTime}
                  placeholder="e.g., 7:00 AM, 12:00 PM"
                  placeholderTextColor="#999"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowEditModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveFeed} disabled={loading}>
                <Text style={styles.saveButtonText}>{loading ? "Saving..." : "Save"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    backgroundColor: "#C17A47",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingBottom: dynamicSpacing(12),
    minHeight: verticalScale(60),
  },
  backButton: {
    padding: scale(8),
    minWidth: scale(40),
    minHeight: scale(40),
    justifyContent: "center",
    alignItems: "center",
  },
  backIconContainer: {
    width: scale(20),
    height: scale(20),
    justifyContent: "center",
    alignItems: "center",
  },
  backArrow: {
    width: scale(12),
    height: scale(12),
    borderLeftWidth: scale(2),
    borderTopWidth: scale(2),
    borderColor: "white",
    transform: [{ rotate: "-45deg" }],
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(8),
  },
  feedIconContainer: {
    width: scale(24),
    height: scale(24),
    marginRight: scale(8),
    justifyContent: "center",
    alignItems: "center",
  },
  bowlShape: {
    width: scale(20),
    height: scale(12),
    borderWidth: scale(2),
    borderColor: "white",
    borderTopWidth: 0,
    borderRadius: scale(10),
  },
  bowlBase: {
    width: scale(12),
    height: scale(3),
    backgroundColor: "white",
    borderRadius: scale(2),
    marginTop: scale(1),
  },
  headerTitle: {
    color: "white",
    fontSize: moderateScale(18),
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
  },
  feedLogButton: {
    padding: scale(8),
    minWidth: scale(40),
    minHeight: scale(40),
    justifyContent: "center",
    alignItems: "center",
  },
  logIconContainer: {
    width: scale(20),
    height: scale(20),
    justifyContent: "center",
    alignItems: "center",
  },
  logLine: {
    width: scale(12),
    height: scale(2),
    backgroundColor: "white",
    borderRadius: scale(1),
  },
  debugContainer: {
    backgroundColor: "#FFE4B5",
    margin: scale(10),
    padding: scale(10),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: "#DDB76F",
  },
  debugHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scale(8),
  },
  debugTitle: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#8B4513",
  },
  hideDebugButton: {
    backgroundColor: "#DDB76F",
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(4),
  },
  hideDebugText: {
    fontSize: moderateScale(12),
    color: "#8B4513",
    fontWeight: "500",
  },
  debugText: {
    fontSize: moderateScale(11),
    color: "#8B4513",
    marginBottom: scale(2),
  },
  debugButtonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: scale(8),
    gap: scale(8),
  },
  debugButton: {
    backgroundColor: "#C17A47",
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(4),
  },
  debugButtonText: {
    fontSize: moderateScale(11),
    color: "white",
    fontWeight: "500",
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: scale(16),
  },
  loadingText: {
    fontSize: moderateScale(14),
    color: "#666",
    marginTop: scale(8),
  },
  refreshContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
  },
  refreshButton: {
    backgroundColor: "#C17A47",
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(6),
    flex: 1,
    alignItems: "center",
  },
  refreshButtonText: {
    color: "white",
    fontSize: moderateScale(14),
    fontWeight: "500",
  },
  showDebugButton: {
    backgroundColor: "#DDB76F",
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(6),
    marginLeft: scale(8),
  },
  showDebugText: {
    color: "#8B4513",
    fontSize: moderateScale(12),
    fontWeight: "500",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: dynamicSpacing(20),
  },
  mealSection: {
    backgroundColor: "white",
    marginHorizontal: scale(16),
    marginTop: dynamicSpacing(16),
    borderRadius: scale(12),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.1,
    shadowRadius: scale(4),
    elevation: 3,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: dynamicSpacing(12),
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  mealTitle: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "#333",
  },
  mealActions: {
    flexDirection: "row",
    gap: scale(8),
  },
  clearButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(6),
  },
  clearButtonText: {
    color: "white",
    fontSize: moderateScale(12),
    fontWeight: "500",
  },
  editButton: {
    backgroundColor: "#C17A47",
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(6),
  },
  editButtonText: {
    color: "white",
    fontSize: moderateScale(12),
    fontWeight: "500",
  },
  noFeedsContainer: {
    paddingVertical: dynamicSpacing(32),
    alignItems: "center",
  },
  noFeedsText: {
    fontSize: moderateScale(14),
    color: "#999",
    fontStyle: "italic",
  },
  tableContainer: {
    paddingBottom: dynamicSpacing(12),
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F8F8F8",
    paddingHorizontal: scale(16),
    paddingVertical: dynamicSpacing(8),
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
  },
  tableRow: {
    paddingHorizontal: scale(16),
    paddingVertical: dynamicSpacing(8),
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  horseNameContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scale(6),
  },
  horseName: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
  },
  completeButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(4),
  },
  completeButtonText: {
    color: "white",
    fontSize: moderateScale(10),
    fontWeight: "500",
  },
  completedRow: {
    opacity: 0.6,
  },
  completedText: {
    textDecorationLine: "line-through",
    color: "#999",
  },
  tableCells: {
    flexDirection: "row",
  },
  tableCell: {
    flex: 1,
    fontSize: moderateScale(12),
    color: "#555",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: scale(20),
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: scale(12),
    width: "100%",
    maxHeight: height * 0.8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.3,
    shadowRadius: scale(8),
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scale(20),
    paddingVertical: dynamicSpacing(16),
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  closeButton: {
    fontSize: moderateScale(20),
    color: "#999",
    fontWeight: "600",
    paddingLeft: scale(16),
  },
  modalContent: {
    paddingHorizontal: scale(20),
    paddingVertical: dynamicSpacing(16),
    maxHeight: height * 0.5,
  },
  inputGroup: {
    marginBottom: dynamicSpacing(16),
  },
  inputLabel: {
    fontSize: moderateScale(14),
    fontWeight: "500",
    color: "#333",
    marginBottom: scale(6),
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: scale(8),
    paddingHorizontal: scale(12),
    paddingVertical: dynamicSpacing(10),
    fontSize: moderateScale(14),
    color: "#333",
    backgroundColor: "#FAFAFA",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: scale(20),
    paddingVertical: dynamicSpacing(16),
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    gap: scale(12),
  },
  cancelButton: {
    paddingHorizontal: scale(16),
    paddingVertical: dynamicSpacing(10),
    borderRadius: scale(6),
    borderWidth: 1,
    borderColor: "#DDD",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: moderateScale(14),
    fontWeight: "500",
  },
  saveButton: {
    backgroundColor: "#C17A47",
    paddingHorizontal: scale(16),
    paddingVertical: dynamicSpacing(10),
    borderRadius: scale(6),
  },
  saveButtonText: {
    color: "white",
    fontSize: moderateScale(14),
    fontWeight: "500",
  },
})