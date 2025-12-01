"use client"
import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import {
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from "react-native"
import * as SecureStore from "expo-secure-store"
import FeedPage from "./feedpage"
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
}

// Backend API configuration
const API_BASE_URL = "http://192.168.31.58:8000/api/kutsero"

export default function HorseCareScreen() {
  const router = useRouter()
  const [searchText, setSearchText] = useState("")
  const [showFeedPage, setShowFeedPage] = useState(false)
  const [feedType, setFeedType] = useState<"feed" | "water">("feed")
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

  // Care activities state
  const [recentActivities, setRecentActivities] = useState<CareActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [checkInTime, setCheckInTime] = useState<string | null>(null)

  const safeArea = getSafeAreaPadding()

  // Load user data and horse information
  const loadUserData = async () => {
    setIsLoading(true)
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

        // Load care activities
        await loadCareActivities()

        // Load check-in status
        await loadCheckInStatus()
      } else {
        Alert.alert("Session Expired", "Please log in again to continue.", [
          { text: "OK", onPress: () => router.replace("../../pages/auth/login") },
        ])
      }
    } catch (error) {
      console.error("Error loading user data:", error)
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

  // Load care activities for the selected horse
  const loadCareActivities = async () => {
    try {
      const storedActivities = await SecureStore.getItemAsync("careActivities")
      if (storedActivities) {
        const activities: CareActivity[] = JSON.parse(storedActivities)
        // Remove duplicates and filter for current horse
        const cleanActivities = Array.isArray(activities)
          ? removeDuplicateActivities(activities)
              .filter((activity) => activity.horseId === selectedHorse.id)
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

  // Save care activity (synced with dashboard)
  const saveCareActivity = async (type: "feed" | "water", notes?: string) => {
    try {
      const activity: CareActivity = {
        id: generateUniqueId(), // Use the new unique ID generator
        type: type,
        timestamp: new Date().toISOString(),
        horseId: selectedHorse.id,
        horseName: selectedHorse.name,
        notes: notes,
        completed: true,
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

      // Update local state
      const horseActivities = activities.filter((act) => act.horseId === selectedHorse.id).slice(0, 10)

      setRecentActivities(horseActivities)

      console.log(`${type} activity saved for ${selectedHorse.name}`)
    } catch (error) {
      console.error("Error saving care activity:", error)
    }
  }

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

  const TabButton = ({
    iconSource,
    label,
    tabKey,
    isActive,
    onPress,
  }: {
    iconSource: any
    label: string
    tabKey: string
    isActive: boolean
    onPress?: () => void
  }) => (
    <TouchableOpacity
      style={styles.tabButton}
      onPress={() => {
        if (onPress) {
          onPress()
        } else {
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

  const MenuIcon = ({ color }: { color: string }) => (
    <View style={styles.iconContainer}>
      <View style={[styles.menuBar, { backgroundColor: color }]} />
      <View style={[styles.menuBar, { backgroundColor: color, marginTop: scale(3) }]} />
      <View style={[styles.menuBar, { backgroundColor: color, marginTop: scale(3) }]} />
    </View>
  )

  const handleFeedPress = async () => {
    if (selectedHorse.id === "default") {
      Alert.alert("No Horse Assigned", "Please select a horse first before feeding.")
      return
    }

    setFeedType("feed")
    setShowFeedPage(true)

    // Save activity when feed is initiated
    await saveCareActivity("feed", "Feed session initiated")
  }

  const handleWaterPress = async () => {
    if (selectedHorse.id === "default") {
      Alert.alert("No Horse Assigned", "Please select a horse first before providing water.")
      return
    }

    setFeedType("water")
    setShowFeedPage(true)

    // Save activity when water is provided
    await saveCareActivity("water", "Water session initiated")
  }

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            await SecureStore.deleteItemAsync("access_token")
            await SecureStore.deleteItemAsync("refresh_token")
            await SecureStore.deleteItemAsync("user_data")
            await SecureStore.deleteItemAsync("selectedHorseData")
            await SecureStore.deleteItemAsync("checkInData")
            router.replace("../../pages/auth/login")
          } catch (error) {
            console.error("Error during logout:", error)
            router.replace("../../pages/auth/login")
          }
        },
      },
    ])
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

  // Load data on focus and mount
  useEffect(() => {
    loadUserData()
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadUserData()
    }, []),
  )

  // Reload activities when selected horse changes
  useEffect(() => {
    if (selectedHorse.id !== "default") {
      loadCareActivities()
      loadCheckInStatus()
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

  // Show FeedPage when user clicks Feed or Water buttons
  if (showFeedPage) {
    return (
      <FeedPage
        onBack={() => {
          setShowFeedPage(false)
          // Reload activities after returning from feed page
          loadCareActivities()
        }}
        feedType={feedType}
        horseName={selectedHorse.name}
        horseId={selectedHorse.id}
        userId={userData?.id || ""}
        userName={currentUser}
      />
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
                <Text style={styles.checkupText}>Next check-up: {selectedHorse.nextCheckup || "Not scheduled"}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={[styles.feedButton, selectedHorse.id === "default" && styles.disabledButton]}
                onPress={handleFeedPress}
                activeOpacity={0.7}
                disabled={selectedHorse.id === "default"}
              >
                <Text style={[styles.actionButtonText, selectedHorse.id === "default" && styles.disabledButtonText]}>
                  Feed
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.waterButton, selectedHorse.id === "default" && styles.disabledButton]}
                onPress={handleWaterPress}
                activeOpacity={0.7}
                disabled={selectedHorse.id === "default"}
              >
                <Text style={[styles.actionButtonText, selectedHorse.id === "default" && styles.disabledButtonText]}>
                  Water
                </Text>
              </TouchableOpacity>
            </View>

            {/* Change Horse Button */}
            {selectedHorse.id === "default" && (
              <TouchableOpacity style={styles.selectHorseButton} onPress={() => router.push("./horseselection")}>
                <Text style={styles.selectHorseButtonText}>Select a Horse</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Recent Care Activities Section */}
          <View style={styles.activitiesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Care Activities</Text>
              <TouchableOpacity onPress={loadCareActivities}>
                <Text style={styles.refreshText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {recentActivities && Array.isArray(recentActivities) && recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => (
                <View key={`activity-${activity.id}-${index}`} style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <Text style={styles.activityEmoji}>{getActivityIcon(activity.type)}</Text>
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>
                      {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)} - Completed
                    </Text>
                    <Text style={styles.activityHorse}>{activity.horseName}</Text>
                    <Text style={styles.activityTime}>{formatActivityTime(activity.timestamp)}</Text>
                    {activity.notes && <Text style={styles.activityNotes}>{activity.notes}</Text>}
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.noActivitiesContainer}>
                <Text style={styles.noActivitiesText}>
                  {selectedHorse.id === "default"
                    ? "Select a horse to see care activities"
                    : "No care activities recorded yet"}
                </Text>
              </View>
            )}
          </View>
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
  checkupText: {
    fontSize: moderateScale(12),
    color: "#666",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: scale(10),
    marginBottom: verticalScale(12),
  },
  feedButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    paddingVertical: verticalScale(12),
    borderRadius: scale(8),
    alignItems: "center",
    minHeight: 44,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  waterButton: {
    flex: 1,
    backgroundColor: "#2196F3",
    paddingVertical: verticalScale(12),
    borderRadius: scale(8),
    alignItems: "center",
    minHeight: 44,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: "#CCCCCC",
    elevation: 0,
    shadowOpacity: 0,
  },
  actionButtonText: {
    color: "white",
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  disabledButtonText: {
    color: "#999",
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
  activitiesSection: {
    backgroundColor: "white",
    marginHorizontal: scale(16),
    marginTop: dynamicSpacing(16),
    borderRadius: scale(12),
    padding: scale(16),
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(12),
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: verticalScale(8),
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  activityIcon: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "#E8F5E8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(12),
  },
  activityEmoji: {
    fontSize: moderateScale(16),
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: moderateScale(13),
    fontWeight: "500",
    color: "#333",
    marginBottom: verticalScale(2),
  },
  activityHorse: {
    fontSize: moderateScale(11),
    color: "#666",
    marginBottom: verticalScale(1),
  },
  activityTime: {
    fontSize: moderateScale(11),
    color: "#999",
    marginBottom: verticalScale(2),
  },
  activityNotes: {
    fontSize: moderateScale(10),
    color: "#777",
    fontStyle: "italic",
  },
  noActivitiesContainer: {
    padding: scale(20),
    alignItems: "center",
  },
  noActivitiesText: {
    fontSize: moderateScale(12),
    color: "#999",
    textAlign: "center",
    fontStyle: "italic",
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
  // Professional Menu Icon
  menuBar: {
    width: scale(10),
    height: scale(1.5),
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
