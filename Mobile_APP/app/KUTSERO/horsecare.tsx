

import { useFocusEffect, useRouter } from "expo-router"
import * as SecureStore from "expo-secure-store"
import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import NotificationsPage from "./notifications"
import SOSEmergencyScreen from "./sos"

const { width, height } = Dimensions.get("window")

// Enhanced responsive scaling functions with better mobile optimization
const scale = (size: number) => {
  const scaleFactor = width / 375 // Base width for iPhone X
  const scaledSize = size * scaleFactor
  // Tighter bounds for mobile screens
  return Math.max(Math.min(scaledSize, size * 1.2), size * 0.8)
}

const verticalScale = (size: number) => {
  const scaleFactor = height / 812 // Base height for iPhone X
  const scaledSize = size * scaleFactor
  // Tighter bounds for mobile screens
  return Math.max(Math.min(scaledSize, size * 1.15), size * 0.85)
}

const moderateScale = (size: number, factor = 0.5) => {
  const scaledSize = size + (scale(size) - size) * factor
  // Ensure text remains readable on all screen sizes
  return Math.max(Math.min(scaledSize, size * 1.1), size * 0.9)
}

// Mobile-optimized spacing
const dynamicSpacing = (baseSize: number) => {
  if (width < 350) return verticalScale(baseSize * 0.7) // Very small screens
  if (width < 400) return verticalScale(baseSize * 0.85) // Small screens
  if (width > 450) return verticalScale(baseSize * 1.05) // Large screens
  return verticalScale(baseSize) // Standard screens
}

// Safe area calculations
const getSafeAreaPadding = () => {
  const statusBarHeight = StatusBar.currentHeight || 0
  return {
    top: Math.max(statusBarHeight, 20),
    bottom: height > 800 ? 34 : 20, // Account for home indicator on newer phones
  }
}

// Generate a more unique ID
const generateUniqueId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Add duplicate removal helper
const removeDuplicateActivities = (activities: CareActivity[]) => {
  const seen = new Set()
  return activities.filter((activity) => {
    // Create a more comprehensive key for duplicate detection
    const key = `${activity.id}-${activity.type}-${activity.timestamp}-${activity.horseId}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

interface Horse {
  id: string
  name: string
  healthStatus: "Healthy" | "Under Care" | "Recovering"
  status: string
  image: any
  breed?: string
  age?: number
  color?: string
  operatorName?: string
  assignmentStatus?: "available" | "assigned"
  currentAssignmentId?: string
  lastCheckup?: string
  nextCheckup?: string
}

interface UserData {
  id: string
  email: string
  profile?: {
    kutsero_id: string
    kutsero_fname?: string
    kutsero_lname?: string
    kutsero_mname?: string
    kutsero_username?: string
    kutsero_phone_num?: string
    kutsero_email?: string
    [key: string]: any
  }
  access_token: string
  refresh_token?: string
  user_status?: string
}

interface CareActivity {
  id: string
  type: "feed" | "water" | "checkup" | "grooming"
  timestamp: string
  horseId: string
  horseName: string
  notes?: string
  completed: boolean
  markedAsFed?: boolean // Specific for feed activities
  markedAsGiven?: boolean // Specific for water activities
}

interface CareReminder {
  id: string
  type: "feed" | "water"
  title: string
  description: string
  time: string
  scheduledTime: string // Actual scheduled time from API (e.g., "07:00:00")
  isDue: boolean
  completed: boolean
  completedTime?: string
  apiId?: string // ID from database (fd_id or water_id)
  originalData?: any // Original data from API
}

// Backend API configuration - CORRECT ENDPOINTS
const API_BASE_URL = "https://echo-ebl8.onrender.com/api/kutsero"

export default function HorseCareScreen() {
  const router = useRouter()
  const [searchText, setSearchText] = useState("")
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSOSEmergency, setShowSOSEmergency] = useState(false)

  // Enhanced user and horse state management
  const [currentUser, setCurrentUser] = useState("User")
  const [userData, setUserData] = useState<UserData | null>(null)
  const [selectedHorse, setSelectedHorse] = useState<Horse>({
    id: "default",
    name: "No Horse Assigned",
    healthStatus: "Healthy",
    status: "Please select a horse",
    image: require("../../assets/images/horse.png"),
    breed: "N/A",
    age: 0,
    operatorName: "N/A",
    lastCheckup: "N/A",
    nextCheckup: "N/A",
  })

  // Care activities and reminders state
  const [recentActivities, setRecentActivities] = useState<CareActivity[]>([])
  const [careReminders, setCareReminders] = useState<CareReminder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [checkInTime, setCheckInTime] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  const safeArea = getSafeAreaPadding()

  // Dashboard/Home Icon Component
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

  // Profile Icon Component
  const ProfileIcon = ({ color }: { color: string }) => (
    <View style={styles.iconContainer}>
      <View style={styles.profileContainer}>
        <View style={[styles.profileHead, { backgroundColor: color }]} />
        <View style={[styles.profileBody, { backgroundColor: color }]} />
      </View>
    </View>
  )

  // TabButton Component
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
        // Navigate directly without updating local state
        if (tabKey === "home") {
          router.push("./dashboard") // Navigate to dashboard in same folder
        } else if (tabKey === "horse") {
          // Stay on horse care - already here
        } else if (tabKey === "chat") {
          router.push("./messages")
        } else if (tabKey === "calendar") {
          router.push("./calendar")
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

  // Load user data and horse information
  const loadUserData = async () => {
    setIsLoading(true)
    setApiError(null)
    try {
      // Get stored user data
      const storedUserData = await SecureStore.getItemAsync("user_data")
      const storedAccessToken = await SecureStore.getItemAsync("access_token")

      if (storedUserData && storedAccessToken) {
        const parsedUserData = JSON.parse(storedUserData)

        const unifiedUserData: UserData = {
          id: parsedUserData.id,
          email: parsedUserData.email,
          profile: parsedUserData.profile,
          access_token: storedAccessToken,
          user_status: parsedUserData.user_status || "pending",
        }

        setUserData(unifiedUserData)

        // Set display name
        let displayName = "User"
        if (parsedUserData.profile) {
          const { kutsero_fname, kutsero_lname, kutsero_username } = parsedUserData.profile
          if (kutsero_fname && kutsero_lname) {
            displayName = `${kutsero_fname} ${kutsero_lname}`
          } else if (kutsero_username) {
            displayName = kutsero_username
          } else if (kutsero_fname) {
            displayName = kutsero_fname
          }
        }
        setCurrentUser(displayName)

        // Load selected horse from SecureStore (shared with dashboard)
        await loadSelectedHorse()

        // Load care activities and schedule
        await loadCareActivities()
        await loadTodaySchedule()

        // Load check-in status
        await loadCheckInStatus()
      } else {
        Alert.alert("Session Expired", "Please log in again to continue.", [
          { text: "OK", onPress: () => router.replace("../../pages/auth/login") },
        ])
      }
    } catch (error) {
      console.error("Error loading user data:", error)
      setApiError("Failed to load user data")
    } finally {
      setIsLoading(false)
    }
  }

  // Load selected horse from SecureStore (synced with dashboard)
  const loadSelectedHorse = async () => {
    try {
      const storedHorseData = await SecureStore.getItemAsync("selectedHorseData")
      if (storedHorseData) {
        const horse: Horse = JSON.parse(storedHorseData)
        setSelectedHorse(horse)
        console.log("Loaded horse from storage:", horse.name)
      }
    } catch (error) {
      console.error("Error loading selected horse:", error)
    }
  }

  // Load care activities for the selected horse - ONLY show completed ones
  const loadCareActivities = async () => {
    try {
      const storedActivities = await SecureStore.getItemAsync("careActivities")
      if (storedActivities) {
        const activities: CareActivity[] = JSON.parse(storedActivities)
        // Filter for current horse AND completed activities only
        const cleanActivities = Array.isArray(activities)
          ? removeDuplicateActivities(activities)
              .filter((activity) => 
                activity.horseId === selectedHorse.id && 
                activity.completed === true
              )
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 10)
          : []

        setRecentActivities(cleanActivities)
      } else {
        setRecentActivities([])
      }
    } catch (error) {
      console.error("Error loading care activities:", error)
      setRecentActivities([])
    }
  }

  // Fetch today's complete schedule from API - USING CORRECT ENDPOINT
  const loadTodaySchedule = async () => {
  try {
    if (selectedHorse.id === "default" || !userData?.profile?.kutsero_id) {
      setCareReminders([])
      return
    }

    const accessToken = await SecureStore.getItemAsync("access_token")
    if (!accessToken) {
      console.log("No access token available")
      setCareReminders([])
      return
    }

    const kutseroId = userData.profile.kutsero_id
    const horseId = selectedHorse.id

    console.log("Fetching schedule for:", { kutseroId, horseId })

    // Try the new endpoint first
    try {
      const response = await fetch(
        `${API_BASE_URL}/today_schedule/?kutsero_id=${kutseroId}&horse_id=${horseId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        console.log("Today's schedule response:", data)
        
        if (data.success && data.data) {
          // Transform API data to CareReminder format
          const reminders: CareReminder[] = data.data.map((task: any) => {
            const isDue = isTimeDue(task.time)
            
            return {
              id: `${task.type}-${task.id}`,
              type: task.type,
              title: task.title,
              description: task.description,
              time: formatTimeForDisplay(task.time),
              scheduledTime: task.time,
              isDue: !task.completed && isDue,
              completed: task.completed || false,
              completedTime: task.completed_at,
              apiId: task.id,
              originalData: task.original_data
            }
          })
          
          setCareReminders(reminders)
          setApiError(null)
          return // Exit early if successful
        }
      }
    } catch (todayScheduleError) {
      console.log("Today schedule endpoint failed:", todayScheduleError)
    }

    // If today_schedule fails, try individual endpoints
    console.log("Trying individual endpoints...")
    
    // Try feed schedule endpoint
    try {
      const feedResponse = await fetch(
        `${API_BASE_URL}/feed_schedule/?kutsero_id=${kutseroId}&horse_id=${horseId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      )

      // Try water schedule endpoint
      const waterResponse = await fetch(
        `${API_BASE_URL}/water_schedule/?kutsero_id=${kutseroId}&horse_id=${horseId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      )

      let feedReminders: CareReminder[] = []
      let waterReminders: CareReminder[] = []

      if (feedResponse.ok) {
        const feedData = await feedResponse.json()
        if (feedData.success && feedData.data) {
          feedReminders = feedData.data.map((feed: any) => {
            const isDue = isTimeDue(feed.time)
            return {
              id: `feed-${feed.id}`,
              type: "feed" as const,
              title: `${feed.meal_type || 'Feeding'}`,
              description: `${feed.quantity || ''} of ${feed.food_type || 'food'}`,
              time: formatTimeForDisplay(feed.time),
              scheduledTime: feed.time,
              isDue: !feed.completed && isDue,
              completed: feed.completed || false,
              completedTime: feed.completed_at,
              apiId: feed.id,
              originalData: feed
            }
          })
        }
      }

      if (waterResponse.ok) {
        const waterData = await waterResponse.json()
        if (waterData.success && waterData.data) {
          waterReminders = waterData.data.map((water: any) => {
            const isDue = isTimeDue(water.time)
            return {
              id: `water-${water.id}`,
              type: "water" as const,
              title: `${water.period || 'Water'}`,
              description: `${water.amount || ''} of water`,
              time: formatTimeForDisplay(water.time),
              scheduledTime: water.time,
              isDue: !water.completed && isDue,
              completed: water.completed || false,
              completedTime: water.completed_at,
              apiId: water.id,
              originalData: water
            }
          })
        }
      }

      const allReminders = [...feedReminders, ...waterReminders]
      
      if (allReminders.length > 0) {
        setCareReminders(allReminders)
        console.log(`Loaded ${feedReminders.length} feed and ${waterReminders.length} water reminders`)
        setApiError(null)
      } else {
        console.log("No data from individual endpoints, creating default schedule")
        createDefaultSchedule()
      }
    } catch (individualError) {
      console.error("Error trying individual endpoints:", individualError)
      createDefaultSchedule()
    }
  } catch (error) {
    console.error("Error loading schedule:", error)
    setCareReminders([])
    createDefaultSchedule()
  }
}

  // Try individual endpoints as fallback
  const tryIndividualEndpoints = async (kutseroId: string, horseId: string, accessToken: string) => {
    try {
      console.log("Trying individual endpoints...")
      
      // Try feed schedule endpoint
      const feedResponse = await fetch(
        `${API_BASE_URL}/feed_schedule/?kutsero_id=${kutseroId}&horse_id=${horseId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      )

      // Try water schedule endpoint
      const waterResponse = await fetch(
        `${API_BASE_URL}/water_schedule/?kutsero_id=${kutseroId}&horse_id=${horseId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      )

      let feedReminders: CareReminder[] = []
      let waterReminders: CareReminder[] = []

      if (feedResponse.ok) {
        const feedData = await feedResponse.json()
        if (feedData.success && feedData.data) {
          feedReminders = feedData.data.map((feed: any) => {
            const isDue = isTimeDue(feed.time)
            return {
              id: `feed-${feed.id}`,
              type: "feed" as const,
              title: `${feed.meal_type || 'Feeding'}`,
              description: `${feed.quantity || ''} of ${feed.food_type || 'food'}`,
              time: formatTimeForDisplay(feed.time),
              scheduledTime: feed.time,
              isDue: !feed.completed && isDue,
              completed: feed.completed || false,
              completedTime: feed.completed_at,
              apiId: feed.id,
              originalData: feed
            }
          })
        }
      }

      if (waterResponse.ok) {
        const waterData = await waterResponse.json()
        if (waterData.success && waterData.data) {
          waterReminders = waterData.data.map((water: any) => {
            const isDue = isTimeDue(water.time)
            return {
              id: `water-${water.id}`,
              type: "water" as const,
              title: `${water.period || 'Water'}`,
              description: `${water.amount || ''} of water`,
              time: formatTimeForDisplay(water.time),
              scheduledTime: water.time,
              isDue: !water.completed && isDue,
              completed: water.completed || false,
              completedTime: water.completed_at,
              apiId: water.id,
              originalData: water
            }
          })
        }
      }

      const allReminders = [...feedReminders, ...waterReminders]
      
      if (allReminders.length > 0) {
        setCareReminders(allReminders)
        console.log(`Loaded ${feedReminders.length} feed and ${waterReminders.length} water reminders`)
      } else {
        console.log("No data from individual endpoints, creating default schedule")
        createDefaultSchedule()
      }
    } catch (error) {
      console.error("Error trying individual endpoints:", error)
      createDefaultSchedule()
    }
  }

  // Create default schedule when API fails or returns empty
  const createDefaultSchedule = () => {
    if (!userData?.profile?.kutsero_id || selectedHorse.id === "default") {
      return
    }

    const now = new Date()
    const currentHour = now.getHours()
    
    const defaultReminders: CareReminder[] = [
      {
        id: `${selectedHorse.id}-breakfast-feed`,
        type: "feed",
        title: "Breakfast Feeding",
        description: `${selectedHorse.name} needs 2 kg of Hay`,
        time: "7:00 AM",
        scheduledTime: "07:00:00",
        isDue: currentHour >= 7 && currentHour < 10,
        completed: false
      },
      {
        id: `${selectedHorse.id}-lunch-feed`,
        type: "feed",
        title: "Lunch Feeding",
        description: `${selectedHorse.name} needs 1.5 kg of Grain Mix`,
        time: "12:00 PM",
        scheduledTime: "12:00:00",
        isDue: currentHour >= 12 && currentHour < 14,
        completed: false
      },
      {
        id: `${selectedHorse.id}-dinner-feed`,
        type: "feed",
        title: "Dinner Feeding",
        description: `${selectedHorse.name} needs 2.5 kg of Hay`,
        time: "5:00 PM",
        scheduledTime: "17:00:00",
        isDue: currentHour >= 17 && currentHour < 20,
        completed: false
      },
      {
        id: `${selectedHorse.id}-morning-water`,
        type: "water",
        title: "Morning Water",
        description: `${selectedHorse.name} needs 10 liters of water`,
        time: "8:00 AM",
        scheduledTime: "08:00:00",
        isDue: currentHour >= 8 && currentHour < 11,
        completed: false
      },
      {
        id: `${selectedHorse.id}-afternoon-water`,
        type: "water",
        title: "Afternoon Water",
        description: `${selectedHorse.name} needs 8 liters of water`,
        time: "1:00 PM",
        scheduledTime: "13:00:00",
        isDue: currentHour >= 13 && currentHour < 16,
        completed: false
      },
      {
        id: `${selectedHorse.id}-evening-water`,
        type: "water",
        title: "Evening Water",
        description: `${selectedHorse.name} needs 12 liters of water`,
        time: "6:00 PM",
        scheduledTime: "18:00:00",
        isDue: currentHour >= 18 && currentHour < 21,
        completed: false
      }
    ]

    setCareReminders(defaultReminders)
    console.log("Created default schedule")
  }

  // Convert 24-hour time to 12-hour format
  const formatTimeForDisplay = (time24: string) => {
    try {
      // Remove seconds if present
      const timeWithoutSeconds = time24.split(':').slice(0, 2).join(':')
      const [hours, minutes] = timeWithoutSeconds.split(':').map(Number)
      const period = hours >= 12 ? 'PM' : 'AM'
      const hours12 = hours % 12 || 12
      return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
    } catch (error) {
      console.error("Error formatting time:", error, time24)
      return time24
    }
  }

  // Check if a scheduled time is due (within a 30-minute window)
  const isTimeDue = (scheduledTime: string) => {
    try {
      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      
      // Parse scheduled time (could be "07:00:00" or "07:00")
      const timeParts = scheduledTime.split(':')
      const scheduledHour = parseInt(timeParts[0], 10)
      const scheduledMinute = parseInt(timeParts[1], 10)
      
      // Calculate time difference in minutes
      const currentTotalMinutes = currentHour * 60 + currentMinute
      const scheduledTotalMinutes = scheduledHour * 60 + scheduledMinute
      const timeDifference = Math.abs(currentTotalMinutes - scheduledTotalMinutes)
      
      // Consider due if within 30 minutes before or after scheduled time
      return timeDifference <= 30
    } catch (error) {
      console.error("Error checking if time is due:", error)
      return false
    }
  }

  // Mark a reminder as completed (with API call)
  const markReminderAsCompleted = async (reminderId: string, reminderType: string, apiId?: string) => {
    try {
      if (!userData?.profile?.kutsero_id) {
        Alert.alert("Error", "User information not found")
        return
      }

      const accessToken = await SecureStore.getItemAsync("access_token")
      if (!accessToken) {
        Alert.alert("Error", "Authentication required")
        return
      }

      const kutseroId = userData.profile.kutsero_id
      
      // Try the new API endpoints
      let endpoint = ""
      let idField = ""
      
      if (reminderType === "feed") {
        endpoint = "complete_feed"
        idField = "feed_id"
      } else {
        endpoint = "complete_water"
        idField = "water_id"
      }

      console.log(`Marking ${reminderType} as completed:`, { endpoint, idField, apiId, kutseroId })

      // Call API to mark as completed in database
      const response = await fetch(`${API_BASE_URL}/${endpoint}/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [idField]: apiId || reminderId,
          kutsero_id: kutseroId
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("API response:", data)
        
        if (data.success) {
          // Update local state
          setCareReminders(prev => 
            prev.map(reminder => 
              reminder.id === reminderId 
                ? { ...reminder, completed: true, completedTime: new Date().toISOString(), isDue: false }
                : reminder
            )
          )

          // Save as a care activity
          const completedReminder = careReminders.find(r => r.id === reminderId)
          if (completedReminder) {
            const now = new Date()
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
            
            const activity: CareActivity = {
              id: generateUniqueId(),
              type: completedReminder.type as "feed" | "water",
              timestamp: now.toISOString(),
              horseId: selectedHorse.id,
              horseName: selectedHorse.name,
              notes: `${completedReminder.title} - Completed at ${formatTimeForDisplay(currentTime)}`,
              completed: true,
              markedAsFed: completedReminder.type === "feed",
              markedAsGiven: completedReminder.type === "water"
            }

            // Load existing activities
            const storedActivities = await SecureStore.getItemAsync("careActivities")
            let activities: CareActivity[] = storedActivities ? JSON.parse(storedActivities) : []

            // Add new activity
            activities.unshift(activity)

            // Remove duplicates and keep only last 100 activities
            activities = removeDuplicateActivities(activities).slice(0, 100)

            // Save back to storage
            await SecureStore.setItemAsync("careActivities", JSON.stringify(activities))

            // Update local state - only show completed activities
            const horseActivities = activities
              .filter((act) => act.horseId === selectedHorse.id && act.completed === true)
              .slice(0, 10)

            setRecentActivities(horseActivities)
          }

          Alert.alert("Task Completed", "Care task has been marked as completed!")
        } else {
          Alert.alert("Error", data.error || "Failed to mark task as completed")
        }
      } else {
        console.error("API error:", response.status)
        // Even if API fails, update local state
        setCareReminders(prev => 
          prev.map(reminder => 
            reminder.id === reminderId 
              ? { ...reminder, completed: true, completedTime: new Date().toISOString(), isDue: false }
              : reminder
          )
        )
        
        // Save as a care activity locally
        const completedReminder = careReminders.find(r => r.id === reminderId)
        if (completedReminder) {
          const now = new Date()
          const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
          
          const activity: CareActivity = {
            id: generateUniqueId(),
            type: completedReminder.type as "feed" | "water",
            timestamp: now.toISOString(),
            horseId: selectedHorse.id,
            horseName: selectedHorse.name,
            notes: `${completedReminder.title} - Completed at ${formatTimeForDisplay(currentTime)} (offline)`,
            completed: true,
            markedAsFed: completedReminder.type === "feed",
            markedAsGiven: completedReminder.type === "water"
          }

          const storedActivities = await SecureStore.getItemAsync("careActivities")
          let activities: CareActivity[] = storedActivities ? JSON.parse(storedActivities) : []
          activities.unshift(activity)
          activities = removeDuplicateActivities(activities).slice(0, 100)
          await SecureStore.setItemAsync("careActivities", JSON.stringify(activities))
          
          const horseActivities = activities
            .filter((act) => act.horseId === selectedHorse.id && act.completed === true)
            .slice(0, 10)
          setRecentActivities(horseActivities)
        }
        
        Alert.alert("Task Completed", "Care task marked as completed (offline mode)")
      }
    } catch (error) {
      console.error("Error marking reminder as completed:", error)
      Alert.alert("Error", "Failed to mark task as completed")
    }
  }

  // Load check-in status
  const loadCheckInStatus = async () => {
    try {
      const checkInData = await SecureStore.getItemAsync("checkInData")
      if (checkInData) {
        const data = JSON.parse(checkInData)
        if (data.horseId === selectedHorse.id) {
          setIsCheckedIn(true)
          setCheckInTime(data.checkInTime)
        }
      }
    } catch (error) {
      console.log("Error loading check-in status:", error)
    }
  }

  // Refresh all data
  const refreshAllData = async () => {
    setIsLoading(true)
    try {
      await loadTodaySchedule()
      await loadCareActivities()
    } catch (error) {
      console.error("Error refreshing data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Load data on focus and mount
  useEffect(() => {
    loadUserData()
    
    // Check reminders every 15 minutes
    const intervalId = setInterval(() => {
      loadTodaySchedule()
    }, 15 * 60 * 1000) // 15 minutes

    return () => clearInterval(intervalId)
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadUserData()
    }, []),
  )

  // Reload activities and reminders when selected horse changes
  useEffect(() => {
    if (selectedHorse.id !== "default") {
      loadCareActivities()
      loadTodaySchedule()
      loadCheckInStatus()
    } else {
      setCareReminders([])
    }
  }, [selectedHorse.id])

  // Show loading screen
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />
        <ActivityIndicator size="large" color="white" />
        <Text style={styles.loadingText}>Loading horse care...</Text>
      </View>
    )
  }

  // Show Notifications page when requested
  if (showNotifications) {
    return <NotificationsPage onBack={() => setShowNotifications(false)} userName={currentUser} />
  }

  // Show SOS Emergency page when requested
  if (showSOSEmergency) {
    return <SOSEmergencyScreen onBack={() => setShowSOSEmergency(false)} />
  }

  const getHealthStatusColor = (status: Horse["healthStatus"]) => {
    switch (status) {
      case "Healthy":
        return "#4CAF50"
      case "Under Care":
        return "#FF9800"
      case "Recovering":
        return "#2196F3"
      default:
        return "#666"
    }
  }

  // Get reminder color based on status
  const getReminderColor = (reminder: CareReminder) => {
    if (reminder.completed) {
      return "#4CAF50" // Green for completed
    } else if (reminder.isDue) {
      return "#FF6B6B" // Red for due tasks
    } else {
      return "#2196F3" // Blue for upcoming tasks
    }
  }

  // Get reminder icon
  const getReminderIcon = (type: string) => {
    switch (type) {
      case "feed":
        return "🥕"
      case "water":
        return "💧"
      default:
        return "🔔"
    }
  }

  // Format activity time for display
  const formatActivityTime = (timestamp: string) => {
    const now = new Date()
    const activityTime = new Date(timestamp)
    const diffInHours = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60))
      return diffInMinutes < 1 ? "Just now" : `${diffInMinutes} minutes ago`
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays} days ago`
    }
  }

  // Get activity icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "feed":
        return "🥕"
      case "water":
        return "💧"
      case "checkup":
        return "🩺"
      case "grooming":
        return "🧼"
      default:
        return "📝"
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />

      {/* Header Section */}
      <View style={[styles.header, { paddingTop: safeArea.top }]}>
        <View style={styles.headerTop}>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome,</Text>
            <Text style={styles.userName}>{currentUser}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={() => setShowNotifications(true)}>
              <Image
                source={require("../../assets/images/notification.png")}
                style={[styles.headerIconImage, { tintColor: "white" }]}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.sosButton} onPress={() => setShowSOSEmergency(true)}>
              <Image source={require("../../assets/images/sos.png")} style={styles.sosIcon} resizeMode="contain" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search..."
            placeholderTextColor="#999"
          />
          <TouchableOpacity style={styles.searchButton}>
            <Image
              source={require("../../assets/images/search.png")}
              style={[styles.searchIconImage, { tintColor: "#666" }]}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content Section */}
      <View style={styles.contentContainer}>
        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentContainer}
        >
          {/* Page Title */}
          <View style={styles.titleSection}>
            <Text style={styles.pageTitle}>Horse Care</Text>
            {isCheckedIn && checkInTime && <Text style={styles.checkInStatus}>✓ Checked in at {checkInTime}</Text>}
          </View>

          {/* Horse Profile Section */}
          <View style={styles.horseSection}>
            <View style={styles.horseCard}>
              <View style={styles.horseImageContainer}>
                <View style={styles.horseAvatar}>
                  <Image
                    source={require("../../assets/images/horse.png")}
                    style={[styles.horseIconImage, { tintColor: "#C17A47" }]}
                    resizeMode="contain"
                  />
                </View>
              </View>
              <View style={styles.horseInfo}>
                <Text style={styles.horseNameText}>
                  <Text style={styles.horseLabel}>Name: </Text>
                  <Text style={styles.horseValue}>{selectedHorse.name}</Text>
                </Text>
                {selectedHorse.breed && selectedHorse.breed !== "N/A" && (
                  <Text style={styles.horseBreedText}>
                    <Text style={styles.horseLabel}>Breed: </Text>
                    <Text style={styles.horseValue}>{selectedHorse.breed}</Text>
                  </Text>
                )}
                <View style={styles.healthRow}>
                  <View
                    style={[styles.healthDot, { backgroundColor: getHealthStatusColor(selectedHorse.healthStatus) }]}
                  />
                  <Text style={[styles.healthText, { color: getHealthStatusColor(selectedHorse.healthStatus) }]}>
                    {selectedHorse.healthStatus}
                  </Text>
                </View>
              </View>
            </View>

            {/* Change Horse Button */}
            {selectedHorse.id === "default" && (
              <TouchableOpacity style={styles.selectHorseButton} onPress={() => router.push("./horseselection")}>
                <Text style={styles.selectHorseButtonText}>Select a Horse</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Care Reminders Section */}
          {selectedHorse.id !== "default" && (
            <View style={styles.remindersSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Daily Care Schedule</Text>
                <TouchableOpacity onPress={refreshAllData}>
                  <Text style={styles.refreshText}>Refresh</Text>
                </TouchableOpacity>
              </View>

              {apiError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{apiError}</Text>
                </View>
              )}

              {careReminders.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No schedule found for this horse</Text>
                  <TouchableOpacity style={styles.addScheduleButton} onPress={refreshAllData}>
                    <Text style={styles.addScheduleButtonText}>Load Schedule</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                careReminders.map((reminder) => (
                  <TouchableOpacity
                    key={reminder.id}
                    style={[styles.reminderCard, { borderLeftColor: getReminderColor(reminder) }]}
                    onPress={() => {
                      if (!reminder.completed) {
                        Alert.alert(
                          "Mark as Completed",
                          `Mark ${reminder.type === "feed" ? "feeding" : "watering"} task as completed?`,
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Mark Complete",
                              onPress: () => markReminderAsCompleted(reminder.id, reminder.type, reminder.apiId),
                            },
                          ]
                        )
                      }
                    }}
                  >
                    <View style={styles.reminderHeader}>
                      <View style={styles.reminderIconContainer}>
                        <Text style={styles.reminderIcon}>{getReminderIcon(reminder.type)}</Text>
                      </View>
                      <View style={styles.reminderInfo}>
                        <Text style={styles.reminderTitle}>{reminder.title}</Text>
                        <Text style={styles.reminderDescription}>{reminder.description}</Text>
                        <View style={styles.reminderMeta}>
                          <Text style={styles.reminderTime}>🕒 {reminder.time}</Text>
                          {reminder.completedTime && (
                            <Text style={styles.completedTime}>
                              Completed: {formatActivityTime(reminder.completedTime)}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.reminderStatus}>
                        {reminder.completed ? (
                          <View style={styles.completedBadge}>
                            <Text style={styles.completedBadgeText}>✓ Done</Text>
                          </View>
                        ) : reminder.isDue ? (
                          <View style={styles.dueBadge}>
                            <Text style={styles.dueBadgeText}>⚠️ Due Now</Text>
                          </View>
                        ) : (
                          <View style={styles.upcomingBadge}>
                            <Text style={styles.upcomingBadgeText}>Upcoming</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}

              {/* Schedule Summary */}
              {careReminders.length > 0 && (
                <View style={styles.scheduleSummary}>
                  <Text style={styles.summaryTitle}>Schedule Summary</Text>
                  <View style={styles.summaryStats}>
                    <View style={styles.summaryStat}>
                      <Text style={styles.summaryStatNumber}>
                        {careReminders.filter(r => r.type === "feed").length}
                      </Text>
                      <Text style={styles.summaryStatLabel}>Feeding Times</Text>
                    </View>
                    <View style={styles.summaryStat}>
                      <Text style={styles.summaryStatNumber}>
                        {careReminders.filter(r => r.type === "water").length}
                      </Text>
                      <Text style={styles.summaryStatLabel}>Water Times</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Recent Care Activities Section */}
          {selectedHorse.id !== "default" && recentActivities.length > 0 && (
            <View style={styles.activitiesSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Care Activities</Text>
              </View>
              {recentActivities.map((activity) => (
                <View key={activity.id} style={styles.activityCard}>
                  <View style={styles.activityHeader}>
                    <Text style={styles.activityIcon}>{getActivityIcon(activity.type)}</Text>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityTitle}>
                        {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)} - {activity.horseName}
                      </Text>
                      <Text style={styles.activityTime}>{formatActivityTime(activity.timestamp)}</Text>
                    </View>
                    <View style={styles.activityStatus}>
                      <View style={styles.completedBadge}>
                        <Text style={styles.completedBadgeText}>Completed</Text>
                      </View>
                    </View>
                  </View>
                  {activity.notes && <Text style={styles.activityNotes}>{activity.notes}</Text>}
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Bottom Tab Navigation */}
        <View style={[styles.tabBar, { paddingBottom: safeArea.bottom }]}>
          <TabButton iconSource={null} label="Home" tabKey="home" isActive={false} />
          <TabButton
            iconSource={require("../../assets/images/horse.png")}
            label="Horse"
            tabKey="horse"
            isActive={true}
          />
          <TabButton iconSource={require("../../assets/images/chat.png")} label="Chat" tabKey="chat" isActive={false} />
          <TabButton
            iconSource={require("../../assets/images/calendar.png")}
            label="Calendar"
            tabKey="calendar"
            isActive={false}
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
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "white",
    fontSize: moderateScale(16),
    fontWeight: "500",
    marginTop: verticalScale(10),
  },
  header: {
    backgroundColor: "#C17A47",
    paddingHorizontal: scale(16),
    paddingBottom: dynamicSpacing(16),
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: verticalScale(16),
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: moderateScale(14),
    color: "white",
    fontWeight: "400",
    marginBottom: verticalScale(2),
  },
  userName: {
    fontSize: moderateScale(20),
    fontWeight: "bold",
    color: "white",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
  },
  headerButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerIconImage: {
    width: scale(18),
    height: scale(18),
  },
  sosButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "#FF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  sosIcon: {
    width: scale(18),
    height: scale(18),
    tintColor: "white",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: scale(20),
    paddingHorizontal: scale(12),
    height: verticalScale(40),
    minHeight: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(14),
    color: "#333",
    paddingVertical: 0,
  },
  searchButton: {
    padding: scale(4),
  },
  searchIconImage: {
    width: scale(16),
    height: scale(16),
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: verticalScale(100),
  },
  titleSection: {
    paddingHorizontal: scale(16),
    paddingTop: dynamicSpacing(16),
    paddingBottom: dynamicSpacing(8),
  },
  pageTitle: {
    fontSize: moderateScale(20),
    fontWeight: "bold",
    color: "#333",
  },
  checkInStatus: {
    fontSize: moderateScale(12),
    color: "#4CAF50",
    fontWeight: "500",
    marginTop: verticalScale(4),
  },
  horseSection: {
    backgroundColor: "white",
    marginHorizontal: scale(16),
    marginTop: dynamicSpacing(8),
    borderRadius: scale(12),
    padding: scale(16),
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(12),
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: "bold",
    color: "#333",
  },
  refreshText: {
    fontSize: moderateScale(12),
    color: "#C17A47",
    fontWeight: "500",
  },
  horseCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: verticalScale(16),
  },
  horseImageContainer: {
    marginRight: scale(12),
  },
  horseAvatar: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  horseIconImage: {
    width: scale(28),
    height: scale(28),
  },
  horseInfo: {
    flex: 1,
  },
  horseNameText: {
    fontSize: moderateScale(14),
    marginBottom: verticalScale(6),
  },
  horseBreedText: {
    fontSize: moderateScale(12),
    marginBottom: verticalScale(6),
  },
  horseLabel: {
    color: "#666",
    fontWeight: "400",
  },
  horseValue: {
    color: "#333",
    fontWeight: "600",
  },
  healthRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(6),
  },
  healthDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: "#4CAF50",
    marginRight: scale(6),
  },
  healthText: {
    fontSize: moderateScale(12),
    color: "#4CAF50",
    fontWeight: "500",
  },
  selectHorseButton: {
    backgroundColor: "#C17A47",
    paddingVertical: verticalScale(12),
    borderRadius: scale(8),
    alignItems: "center",
    minHeight: 44,
  },
  selectHorseButtonText: {
    color: "white",
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  // Reminders Section Styles
  remindersSection: {
    backgroundColor: "white",
    marginHorizontal: scale(16),
    marginTop: dynamicSpacing(12),
    borderRadius: scale(12),
    padding: scale(16),
  },
  errorBanner: {
    backgroundColor: "#FFEBEE",
    padding: scale(12),
    borderRadius: scale(8),
    marginBottom: verticalScale(12),
  },
  errorText: {
    color: "#D32F2F",
    fontSize: moderateScale(12),
    textAlign: "center",
  },
  emptyState: {
    padding: verticalScale(20),
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: moderateScale(14),
    color: "#999",
    marginBottom: verticalScale(10),
  },
  addScheduleButton: {
    backgroundColor: "#C17A47",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
  },
  addScheduleButtonText: {
    color: "white",
    fontSize: moderateScale(12),
    fontWeight: "600",
  },
  reminderCard: {
    backgroundColor: "#FAFAFA",
    borderRadius: scale(8),
    padding: scale(12),
    marginBottom: verticalScale(8),
    borderLeftWidth: scale(4),
    borderLeftColor: "#2196F3",
  },
  reminderHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  reminderIconContainer: {
    marginRight: scale(10),
  },
  reminderIcon: {
    fontSize: moderateScale(24),
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(2),
  },
  reminderDescription: {
    fontSize: moderateScale(12),
    color: "#666",
    marginBottom: verticalScale(4),
  },
  reminderMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reminderTime: {
    fontSize: moderateScale(11),
    color: "#888",
  },
  completedTime: {
    fontSize: moderateScale(11),
    color: "#4CAF50",
  },
  reminderStatus: {
    marginLeft: scale(8),
  },
  completedBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(12),
  },
  completedBadgeText: {
    fontSize: moderateScale(10),
    color: "#4CAF50",
    fontWeight: "600",
  },
  dueBadge: {
    backgroundColor: "#FFEBEE",
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(12),
  },
  dueBadgeText: {
    fontSize: moderateScale(10),
    color: "#FF6B6B",
    fontWeight: "600",
  },
  upcomingBadge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(12),
  },
  upcomingBadgeText: {
    fontSize: moderateScale(10),
    color: "#2196F3",
    fontWeight: "600",
  },
  scheduleSummary: {
    marginTop: verticalScale(16),
    paddingTop: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  summaryTitle: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(8),
  },
  summaryStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryStat: {
    alignItems: "center",
  },
  summaryStatNumber: {
    fontSize: moderateScale(20),
    fontWeight: "bold",
    color: "#C17A47",
  },
  summaryStatLabel: {
    fontSize: moderateScale(12),
    color: "#666",
  },
  // Activities Section Styles
  activitiesSection: {
    backgroundColor: "white",
    marginHorizontal: scale(16),
    marginTop: dynamicSpacing(12),
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: dynamicSpacing(20),
  },
  activityCard: {
    backgroundColor: "#FAFAFA",
    borderRadius: scale(8),
    padding: scale(12),
    marginBottom: verticalScale(8),
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(6),
  },
  activityIcon: {
    fontSize: moderateScale(20),
    marginRight: scale(10),
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: moderateScale(13),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(2),
  },
  activityTime: {
    fontSize: moderateScale(11),
    color: "#888",
  },
  activityStatus: {
    marginLeft: scale(8),
  },
  activityNotes: {
    fontSize: moderateScale(12),
    color: "#666",
    fontStyle: "italic",
    paddingLeft: scale(30),
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
  fallbackIcon: {
    width: scale(14),
    height: scale(14),
    backgroundColor: "#666",
    borderRadius: scale(2),
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
  // Icon container for custom icons
  iconContainer: {
    width: scale(14),
    height: scale(14),
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  // Dashboard/Home Icon Styles
  dashboardGrid: {
    width: scale(14),
    height: scale(14),
    position: "relative",
  },
  gridSquare: {
    width: scale(5),
    height: scale(5),
    position: "absolute",
  },
  gridTopLeft: {
    top: 0,
    left: 0,
  },
  gridTopRight: {
    top: 0,
    right: 0,
  },
  gridBottomLeft: {
    bottom: 0,
    left: 0,
  },
  gridBottomRight: {
    bottom: 0,
    right: 0,
  },
  // Profile Icon Styles
  profileContainer: {
    width: scale(14),
    height: scale(14),
    position: "relative",
    alignItems: "center",
  },
  profileHead: {
    width: scale(5),
    height: scale(5),
    borderRadius: scale(2.5),
    position: "absolute",
    top: 0,
  },
  profileBody: {
    width: scale(10),
    height: scale(7),
    borderTopLeftRadius: scale(5),
    borderTopRightRadius: scale(5),
    position: "absolute",
    bottom: 0,
  },
})