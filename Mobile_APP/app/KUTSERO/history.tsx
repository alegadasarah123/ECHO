"use client"

import { useRouter } from "expo-router"
import { useState, useEffect, useCallback } from "react"
import {
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native"
import * as SecureStore from "expo-secure-store"
import { useFocusEffect } from "expo-router"

const { width, height } = Dimensions.get("window")

// Enhanced responsive scaling functions
const scale = (size: number) => {
  const scaleFactor = width / 375
  const scaledSize = size * scaleFactor
  return Math.max(Math.min(scaledSize, size * 1.2), size * 0.8)
}

const verticalScale = (size: number) => {
  const scaleFactor = height / 812
  const scaledSize = size * scaleFactor
  return Math.max(Math.min(scaledSize, size * 1.15), size * 0.85)
}

const moderateScale = (size: number, factor = 0.5) => {
  const scaledSize = size + (scale(size) - size) * factor
  return Math.max(Math.min(scaledSize, size * 1.1), size * 0.9)
}

const dynamicSpacing = (baseSize: number) => {
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

interface HistoryEntry {
  assignmentId: string
  checkedInAt: string
  checkedOutAt: string | null
  workDuration: string | null
  isActive: boolean
  status: string
  horse: {
    id: string
    name: string
    breed: string
    age: number
    color: string
    image: string | null
    opName: string
  }
}

interface GroupedEntries {
  [key: string]: HistoryEntry[]
}

// User data interface matching dashboard
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

export default function HistoryScreen() {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState("All Time")
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [activeCount, setActiveCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [userData, setUserData] = useState<UserData | null>(null)

  // Modal states for detailed view
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null)
  const [modalVisible, setModalVisible] = useState(false)

  const safeArea = getSafeAreaPadding()

  // Replace with your actual API base URL
  const API_BASE_URL = "http://172.20.10.2:8000/api/kutsero"

  // Load user data from SecureStore (matching dashboard approach)
  const loadUserData = async (): Promise<UserData | null> => {
    try {
      const storedUserData = await SecureStore.getItemAsync("user_data")
      const storedAccessToken = await SecureStore.getItemAsync("access_token")

      console.log("Loading user data for history...")
      console.log("Has stored user data:", !!storedUserData)
      console.log("Has stored access token:", !!storedAccessToken)

      if (storedUserData && storedAccessToken) {
        const parsedUserData = JSON.parse(storedUserData)

        // Create a unified user data structure
        const unifiedUserData: UserData = {
          id: parsedUserData.id,
          email: parsedUserData.email,
          profile: parsedUserData.profile,
          access_token: storedAccessToken,
          user_status: parsedUserData.user_status || "pending",
        }

        console.log("Successfully loaded user data for history:", {
          userId: parsedUserData.id,
          hasProfile: !!parsedUserData.profile,
          kutserroId: parsedUserData.profile?.kutsero_id,
        })

        return unifiedUserData
      } else {
        console.log("No stored authentication data found in history")
        return null
      }
    } catch (error) {
      console.error("Error loading user data for history:", error)
      return null
    }
  }

  // Use useFocusEffect to reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      initializeScreen()
    }, []),
  )

  useEffect(() => {
    initializeScreen()
  }, [])

  const initializeScreen = async () => {
    try {
      setLoading(true)
      setError(null)

      const userData = await loadUserData()

      if (userData) {
        setUserData(userData)

        // Get kutsero_id from profile or fallback to user id
        const kutserroId = userData.profile?.kutsero_id || userData.id
        console.log("Using kutsero_id for history:", kutserroId)

        await fetchAssignmentHistory(kutserroId, userData.access_token)
      } else {
        setError("Unable to get user authentication. Please log in again.")
        Alert.alert("Session Expired", "Please log in again to view your history.", [
          {
            text: "Go to Login",
            onPress: () => router.replace("../../pages/auth/login"),
          },
        ])
      }
    } catch (error) {
      console.error("Error initializing history screen:", error)
      setError("Failed to initialize. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const fetchAssignmentHistory = async (kutsero_id: string, accessToken: string) => {
    try {
      setLoading(true)
      setError(null)

      // Fetch the assignment history for all horses the kutsero has ever worked with
      const historyUrl = `${API_BASE_URL}/assignment_history/?kutsero_id=${kutsero_id}`
      console.log("Fetching assignment history from URL:", historyUrl)

      const historyResponse = await fetch(historyUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      })

      console.log("History response status:", historyResponse.status)

      if (!historyResponse.ok) {
        const errorText = await historyResponse.text()
        console.log("History error response:", errorText)

        // Handle specific error cases
        if (historyResponse.status === 401) {
          Alert.alert("Session Expired", "Please log in again.", [
            {
              text: "Go to Login",
              onPress: () => router.replace("../../pages/auth/login"),
            },
          ])
          return
        } else if (historyResponse.status === 404) {
          // No history available
          setHistoryEntries([])
          setTotalCount(0)
          setActiveCount(0)
          setCompletedCount(0)
          return
        }

        throw new Error(`HTTP error! status: ${historyResponse.status}, message: ${errorText}`)
      }

      const historyData = await historyResponse.json()
      console.log("Received assignment history data:", historyData)

      if (historyData.assignments && Array.isArray(historyData.assignments)) {
        // Show ALL history for all horses the kutsero has ever worked with
        const allHistory = historyData.assignments

        console.log(`Showing ALL history: ${allHistory.length} total entries for all horses ever worked with`)

        if (allHistory.length > 0) {
          console.log("Sample entry:", allHistory[0])
        }

        // Calculate stats based on all history
        const allActiveCount = allHistory.filter((entry: HistoryEntry) => entry.isActive).length
        const allCompletedCount = allHistory.filter((entry: HistoryEntry) => !entry.isActive).length

        setHistoryEntries(allHistory)
        setTotalCount(allHistory.length)
        setActiveCount(allActiveCount)
        setCompletedCount(allCompletedCount)

        console.log(`Final stats: Total=${allHistory.length}, Active=${allActiveCount}, Completed=${allCompletedCount}`)
      } else {
        console.log("No assignments found in history response")
        setHistoryEntries([])
        setTotalCount(0)
        setActiveCount(0)
        setCompletedCount(0)
      }
    } catch (err) {
      console.error("Error fetching assignment history:", err)
      const error = err as Error
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      })
      setError(error.message || "Failed to load history")

      // Show user-friendly error message
      Alert.alert(
        "Network Error",
        `Failed to load assignment history.\n\nError: ${error.message}\n\nCheck your network connection and try again.`,
        [
          {
            text: "Retry",
            onPress: () => handleRefresh(),
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ],
      )
    } finally {
      setLoading(false)
    }
  }

  // Handle entry click
  const handleEntryClick = (entry: HistoryEntry) => {
    setSelectedEntry(entry)
    setModalVisible(true)
  }

  // Close modal
  const closeModal = () => {
    setModalVisible(false)
    setSelectedEntry(null)
  }

  // Refresh function that reloads user data and history
  const handleRefresh = async () => {
    await initializeScreen()
  }

  // Filter entries based on the selected filter
  const getFilteredEntries = () => {
    const now = new Date()
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    switch (activeFilter) {
      case "This Week":
        return historyEntries.filter((entry) => {
          const entryDate = new Date(entry.checkedInAt)
          return entryDate >= startOfWeek
        })
      case "This Month":
        return historyEntries.filter((entry) => {
          const entryDate = new Date(entry.checkedInAt)
          return entryDate >= startOfMonth
        })
      case "All Time":
      default:
        return historyEntries
    }
  }

  const formatDate = (dateString: string, label = "") => {
    try {
      console.log("Formatting date:", dateString)

      // Parse the date string directly
      const date = new Date(dateString)
      console.log("Date - parsed date object:", date)
      console.log("Date - is valid date:", !isNaN(date.getTime()))

      if (isNaN(date.getTime())) {
        throw new Error("Invalid date")
      }

      // Get current date in local timezone (already in Philippine timezone since you're in PH)
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      // Get the entry date (convert to local date only, ignoring time)
      const entryDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())

      console.log("Entry date only:", entryDateOnly.toDateString())
      console.log("Today:", today.toDateString())
      console.log("Yesterday:", yesterday.toDateString())

      // Check if it's today
      if (entryDateOnly.getTime() === today.getTime()) {
        return `Today • ${date.toLocaleDateString("en-PH", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "Asia/Manila",
        })}`
      }

      // Check if it's yesterday
      if (entryDateOnly.getTime() === yesterday.getTime()) {
        return `Yesterday • ${date.toLocaleDateString("en-PH", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "Asia/Manila",
        })}`
      }

      // For other dates
      return date.toLocaleDateString("en-PH", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
      })
    } catch (error) {
      console.error("Error formatting date:", error)
      return dateString
    }
  }

  const formatTime = (dateString: string) => {
    try {
      console.log("Formatting time for:", dateString)

      // Parse the date string directly
      const date = new Date(dateString)
      console.log("Parsed date object:", date)
      console.log("Is valid date:", !isNaN(date.getTime()))
      console.log("Date in UTC:", date.toUTCString())
      console.log("Date in local timezone:", date.toString())

      if (isNaN(date.getTime())) {
        throw new Error("Invalid date")
      }

      // Convert to Philippine timezone (+8 hours from UTC)
      // Create a new date object adjusted for Philippine timezone
      const philippineTime = new Date(date.getTime() + 8 * 60 * 60 * 1000) // Add 8 hours in milliseconds
      console.log("Philippine time calculated:", philippineTime.toString())

      // Format time in 12-hour format
      const hours = philippineTime.getUTCHours() // Use UTC methods since we already adjusted
      const minutes = philippineTime.getUTCMinutes()
      const ampm = hours >= 12 ? "PM" : "AM"
      const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
      const formattedTime = `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`

      console.log("Formatted time result:", formattedTime)
      return formattedTime
    } catch (error) {
      console.error("Error formatting time:", error)
      // Fallback: try to extract time from string manually
      try {
        const timeMatch = dateString.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/)
        if (timeMatch) {
          let hours = Number.parseInt(timeMatch[1])
          const minutes = timeMatch[2]

          // Add 8 hours for Philippine timezone if it looks like UTC
          if (dateString.includes("T") || dateString.includes("Z")) {
            hours = (hours + 8) % 24
          }

          const ampm = hours >= 12 ? "PM" : "AM"
          const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
          return `${displayHours}:${minutes} ${ampm}`
        }
      } catch (fallbackError) {
        console.error("Fallback formatting failed:", fallbackError)
      }
      return dateString
    }
  }

  const formatFullDateTime = (dateString: string) => {
    try {
      console.log("Formatting full datetime for:", dateString)

      // Parse the date string directly
      const date = new Date(dateString)
      console.log("Full datetime - parsed date object:", date)
      console.log("Full datetime - is valid date:", !isNaN(date.getTime()))
      console.log("Full datetime - date in UTC:", date.toUTCString())

      if (isNaN(date.getTime())) {
        throw new Error("Invalid date")
      }

      // Convert to Philippine timezone (+8 hours from UTC)
      const philippineTime = new Date(date.getTime() + 8 * 60 * 60 * 1000)
      console.log("Full datetime - Philippine time calculated:", philippineTime.toString())

      // Format full datetime manually to ensure correct timezone
      const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
      const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ]

      const weekday = weekdays[philippineTime.getUTCDay()]
      const month = months[philippineTime.getUTCMonth()]
      const day = philippineTime.getUTCDate()
      const year = philippineTime.getUTCFullYear()
      const hours = philippineTime.getUTCHours()
      const minutes = philippineTime.getUTCMinutes()

      const ampm = hours >= 12 ? "PM" : "AM"
      const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours

      const formattedDateTime = `${weekday}, ${month} ${day}, ${year} at ${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`

      console.log("Formatted full datetime result:", formattedDateTime)
      return formattedDateTime
    } catch (error) {
      console.error("Error formatting full date time:", error)
      return dateString
    }
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive ? "#FF9800" : "#4CAF50"
  }

  const getActionIcon = (isActive: boolean) => {
    return isActive ? "→" : "✓"
  }

  const formatWorkDuration = (duration: string | null) => {
    if (!duration || duration === "Unable to calculate") return "N/A"

    try {
      // Parse duration string like "6:30:00" or "6h 30m"
      const parts = duration.split(":")
      if (parts.length >= 2) {
        const hours = Number.parseInt(parts[0])
        const minutes = Number.parseInt(parts[1])
        return `${hours}h ${minutes}m`
      }
      return duration
    } catch (error) {
      return duration
    }
  }

  // Get filtered entries for display
  const filteredEntries = getFilteredEntries()

  // Group filtered entries by date
  const groupedEntries: GroupedEntries = filteredEntries.reduce((groups, entry) => {
    const date = formatDate(entry.checkedInAt)
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(entry)
    return groups
  }, {} as GroupedEntries)

  // Calculate total hours worked from filtered entries
  const totalHoursWorked = filteredEntries.reduce((total, entry) => {
    if (entry.workDuration && entry.workDuration !== "Unable to calculate") {
      try {
        const parts = entry.workDuration.split(":")
        if (parts.length >= 2) {
          const hours = Number.parseInt(parts[0])
          const minutes = Number.parseInt(parts[1])
          return total + hours + minutes / 60
        }
      } catch (error) {
        // Skip if can't parse
      }
    }
    return total
  }, 0)

  // Count unique horses worked with from all history (not just filtered)
  const uniqueHorses = new Set(historyEntries.map((entry) => entry.horse.id)).size

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
          router.push("./dashboard")
        } else if (tabKey === "horse") {
          router.push("./horsecare")
        } else if (tabKey === "chat") {
          router.push("./messages")
        } else if (tabKey === "calendar") {
          router.push("./calendar")
        } else if (tabKey === "history") {
          // Stay on history - already here
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

  const FilterButton = ({ title, isActive }: { title: string; isActive: boolean }) => (
    <TouchableOpacity
      style={[styles.filterButton, isActive && styles.activeFilterButton]}
      onPress={() => setActiveFilter(title)}
    >
      <Text style={[styles.filterButtonText, isActive && styles.activeFilterButtonText]}>{title}</Text>
    </TouchableOpacity>
  )

  // Detail Modal Component
  const DetailModal = () => {
    if (!selectedEntry) return null

    return (
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Work Session Details</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Horse Information */}
              <View style={styles.modalSection}>
                <View style={styles.modalHorseInfo}>
                  <View style={styles.modalHorseAvatar}>
                    {selectedEntry.horse.image ? (
                      <Image
                        source={{ uri: selectedEntry.horse.image }}
                        style={styles.modalHorseAvatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Image
                        source={require("../../assets/images/horse.png")}
                        style={[styles.modalHorseIconImage, { tintColor: "#C17A47" }]}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                  <View style={styles.modalHorseDetails}>
                    <Text style={styles.modalHorseName}>{selectedEntry.horse.name}</Text>
                    <Text style={styles.modalHorseBreed}>
                      {selectedEntry.horse.breed} • {selectedEntry.horse.color} • Age {selectedEntry.horse.age}
                    </Text>
                    <Text style={styles.modalOwnerName}>Owner: {selectedEntry.horse.opName}</Text>
                  </View>
                </View>
              </View>

              {/* Status */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Status</Text>
                <View style={styles.modalStatusContainer}>
                  <View style={[styles.modalStatusDot, { backgroundColor: getStatusColor(selectedEntry.isActive) }]} />
                  <Text style={[styles.modalStatusText, { color: getStatusColor(selectedEntry.isActive) }]}>
                    {selectedEntry.isActive ? "Currently Working" : "Work Session Completed"}
                  </Text>
                </View>
              </View>

              {/* Time Information */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Time Information</Text>

                <View style={styles.modalTimeItem}>
                  <Text style={styles.modalTimeLabel}>Check-in Time:</Text>
                  <Text style={styles.modalTimeValue}>{formatFullDateTime(selectedEntry.checkedInAt)}</Text>
                </View>

                {selectedEntry.checkedOutAt && (
                  <View style={styles.modalTimeItem}>
                    <Text style={styles.modalTimeLabel}>Check-out Time:</Text>
                    <Text style={styles.modalTimeValue}>{formatFullDateTime(selectedEntry.checkedOutAt)}</Text>
                  </View>
                )}

                {!selectedEntry.isActive && selectedEntry.workDuration && (
                  <View style={styles.modalTimeItem}>
                    <Text style={styles.modalTimeLabel}>Total Duration:</Text>
                    <Text style={[styles.modalTimeValue, styles.modalDurationText]}>
                      {formatWorkDuration(selectedEntry.workDuration)}
                    </Text>
                  </View>
                )}

                {selectedEntry.isActive && (
                  <View style={styles.modalTimeItem}>
                    <Text style={[styles.modalTimeLabel, { color: "#FF9800" }]}>Work session is currently active</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCloseButton} onPress={closeModal}>
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    )
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />

        {/* Header */}
        <View style={[styles.header, { paddingTop: safeArea.top }]}>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Activity History</Text>
          </View>
        </View>

        {/* Loading State */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C17A47" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>

        {/* Bottom Tab Navigation */}
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
            isActive={false}
          />
          <TabButton
            iconSource={require("../../assets/images/history.png")}
            label="History"
            tabKey="history"
            isActive={true}
          />
          <TabButton iconSource={null} label="Profile" tabKey="profile" isActive={false} />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: safeArea.top }]}>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Activity History</Text>
        </View>
        {/* Refresh Button */}
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Text style={styles.refreshButtonText}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Summary Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{filteredEntries.length}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{Math.round(totalHoursWorked)}h</Text>
            <Text style={styles.statLabel}>Total Hours</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{uniqueHorses}</Text>
            <Text style={styles.statLabel}>Horses Worked</Text>
          </View>
        </View>

        {/* Horse Check Log Section */}
        <View style={styles.logSection}>
          <Text style={styles.logTitle}>All Horses History</Text>

          {/* Filter Buttons */}
          <View style={styles.filterContainer}>
            <FilterButton title="This Week" isActive={activeFilter === "This Week"} />
            <FilterButton title="This Month" isActive={activeFilter === "This Month"} />
            <FilterButton title="All Time" isActive={activeFilter === "All Time"} />
          </View>

          {/* History Entries */}
          <ScrollView style={styles.entriesContainer} showsVerticalScrollIndicator={false}>
            {Object.entries(groupedEntries).map(([date, entries]) => (
              <View key={date}>
                {/* Date Header */}
                <View style={styles.dateContainer}>
                  <Text style={styles.dateText}>{date}</Text>
                </View>

                {/* Entries for this date */}
                {entries.map((entry) => (
                  <TouchableOpacity
                    key={entry.assignmentId}
                    style={styles.historyEntry}
                    onPress={() => handleEntryClick(entry)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.entryLeft}>
                      <View style={styles.horseAvatar}>
                        {entry.horse.image ? (
                          <Image
                            source={{ uri: entry.horse.image }}
                            style={styles.horseAvatarImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <Image
                            source={require("../../assets/images/horse.png")}
                            style={[styles.horseIconImage, { tintColor: "#C17A47" }]}
                            resizeMode="contain"
                          />
                        )}
                      </View>
                      <View style={styles.actionIndicator}>
                        <Text style={styles.actionIcon}>{getActionIcon(entry.isActive)}</Text>
                      </View>
                    </View>
                    <View style={styles.entryContent}>
                      <View style={styles.entryHeader}>
                        <Text style={styles.horseName}>{entry.horse.name}</Text>
                        <Text style={styles.tapHint}>Tap for details →</Text>
                      </View>
                      <Text style={styles.entryAction}>
                        {entry.isActive ? "Currently Working" : "Work Session Completed"}
                      </Text>
                      <Text style={styles.horseDetails}>
                        {entry.horse.breed} • {entry.horse.color} • {entry.horse.opName}
                      </Text>
                      {entry.workDuration && !entry.isActive && (
                        <Text style={styles.durationText}>Duration: {formatWorkDuration(entry.workDuration)}</Text>
                      )}
                      <View style={styles.statusContainer}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(entry.isActive) }]} />
                        <Text style={[styles.entryStatus, { color: getStatusColor(entry.isActive) }]}>
                          {entry.status}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            {/* Empty State */}
            {filteredEntries.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No activity history found</Text>
                <Text style={styles.emptyStateSubtext}>
                  {activeFilter === "All Time"
                    ? "Your horse assignments activity will appear here"
                    : `No activity found for ${activeFilter.toLowerCase()}`}
                </Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Error State */}
            {error && (
              <View style={styles.errorState}>
                <Text style={styles.errorText}>Error loading history</Text>
                <Text style={styles.errorSubtext}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Detail Modal */}
      <DetailModal />

      {/* Bottom Tab Navigation */}
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
          isActive={false}
        />
        <TabButton
          iconSource={require("../../assets/images/history.png")}
          label="History"
          tabKey="history"
          isActive={true}
        />
        <TabButton iconSource={null} label="Profile" tabKey="profile" isActive={false} />
      </View>
    </View>
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
    minHeight: verticalScale(50),
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
  refreshButton: {
    padding: scale(8),
  },
  refreshButtonText: {
    color: "white",
    fontSize: moderateScale(18),
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    backgroundColor: "white",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  loadingText: {
    marginTop: verticalScale(16),
    fontSize: moderateScale(16),
    color: "#666",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: scale(16),
    paddingVertical: dynamicSpacing(16),
    backgroundColor: "#C17A47",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: moderateScale(20),
    fontWeight: "bold",
    color: "white",
    marginBottom: verticalScale(2),
  },
  statLabel: {
    fontSize: moderateScale(10),
    color: "rgba(255,255,255,0.8)",
  },
  logSection: {
    flex: 1,
    paddingHorizontal: scale(16),
    paddingTop: dynamicSpacing(16),
  },
  logTitle: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(12),
  },
  filterContainer: {
    flexDirection: "row",
    marginBottom: verticalScale(16),
    gap: scale(8),
  },
  filterButton: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(16),
    backgroundColor: "#F0F0F0",
  },
  activeFilterButton: {
    backgroundColor: "#C17A47",
  },
  filterButtonText: {
    fontSize: moderateScale(12),
    color: "#666",
    fontWeight: "500",
  },
  activeFilterButtonText: {
    color: "white",
  },
  dateContainer: {
    marginBottom: verticalScale(8),
    marginTop: verticalScale(12),
  },
  dateText: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
  },
  entriesContainer: {
    flex: 1,
  },
  historyEntry: {
    flexDirection: "row",
    paddingVertical: verticalScale(8),
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    backgroundColor: "white",
  },
  entryLeft: {
    marginRight: scale(10),
    alignItems: "center",
  },
  horseAvatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(4),
    overflow: "hidden",
  },
  horseAvatarImage: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
  },
  horseIconImage: {
    width: scale(20),
    height: scale(20),
  },
  actionIndicator: {
    width: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    backgroundColor: "#C17A47",
    justifyContent: "center",
    alignItems: "center",
  },
  actionIcon: {
    fontSize: moderateScale(8),
    color: "white",
    fontWeight: "bold",
  },
  entryContent: {
    flex: 1,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(2),
  },
  horseName: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
  },
  tapHint: {
    fontSize: moderateScale(10),
    color: "#C17A47",
    fontWeight: "500",
  },
  entryAction: {
    fontSize: moderateScale(12),
    color: "#666",
    marginBottom: verticalScale(2),
    fontWeight: "500",
  },
  horseDetails: {
    fontSize: moderateScale(10),
    color: "#999",
    marginBottom: verticalScale(2),
  },
  durationText: {
    fontSize: moderateScale(10),
    color: "#2196F3",
    marginBottom: verticalScale(2),
    fontWeight: "500",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: verticalScale(2),
  },
  statusDot: {
    width: scale(4),
    height: scale(4),
    borderRadius: scale(2),
    marginRight: scale(4),
  },
  entryStatus: {
    fontSize: moderateScale(10),
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: verticalScale(40),
  },
  emptyStateText: {
    fontSize: moderateScale(16),
    color: "#666",
    fontWeight: "500",
    marginBottom: verticalScale(8),
  },
  emptyStateSubtext: {
    fontSize: moderateScale(14),
    color: "#999",
    marginBottom: verticalScale(16),
    textAlign: "center",
  },
  errorState: {
    alignItems: "center",
    paddingVertical: verticalScale(40),
  },
  errorText: {
    fontSize: moderateScale(16),
    color: "#E53E3E",
    fontWeight: "500",
    marginBottom: verticalScale(8),
  },
  errorSubtext: {
    fontSize: moderateScale(12),
    color: "#999",
    textAlign: "center",
    marginBottom: verticalScale(16),
  },
  retryButton: {
    backgroundColor: "#C17A47",
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(8),
    borderRadius: scale(16),
  },
  retryButtonText: {
    color: "white",
    fontSize: moderateScale(12),
    fontWeight: "600",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: scale(16),
    width: width * 0.9,
    maxHeight: height * 0.8,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "#333",
  },
  closeButton: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: moderateScale(16),
    color: "#666",
    fontWeight: "bold",
  },
  modalBody: {
    maxHeight: height * 0.6,
  },
  modalSection: {
    padding: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: "#F8F8F8",
  },
  modalSectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(12),
  },
  modalHorseInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalHorseAvatar: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(16),
    overflow: "hidden",
  },
  modalHorseAvatarImage: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
  },
  modalHorseIconImage: {
    width: scale(30),
    height: scale(30),
  },
  modalHorseDetails: {
    flex: 1,
  },
  modalHorseName: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(4),
  },
  modalHorseBreed: {
    fontSize: moderateScale(14),
    color: "#666",
    marginBottom: verticalScale(2),
  },
  modalOwnerName: {
    fontSize: moderateScale(14),
    color: "#999",
  },
  modalStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalStatusDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    marginRight: scale(8),
  },
  modalStatusText: {
    fontSize: moderateScale(16),
    fontWeight: "500",
  },
  modalTimeItem: {
    marginBottom: verticalScale(12),
  },
  modalTimeLabel: {
    fontSize: moderateScale(14),
    color: "#666",
    marginBottom: verticalScale(4),
    fontWeight: "500",
  },
  modalTimeValue: {
    fontSize: moderateScale(16),
    color: "#333",
  },
  modalDurationText: {
    color: "#2196F3",
    fontWeight: "600",
  },
  modalFooter: {
    padding: scale(20),
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  modalCloseButton: {
    backgroundColor: "#C17A47",
    paddingVertical: verticalScale(12),
    borderRadius: scale(8),
    alignItems: "center",
  },
  modalCloseButtonText: {
    color: "white",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },

  // Tab Bar Styles
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
    width: scale(16),
    height: scale(16),
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
    width: scale(16),
    height: scale(16),
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  // Dashboard/Home Icon Styles
  dashboardGrid: {
    width: scale(16),
    height: scale(16),
    position: "relative",
  },
  gridSquare: {
    width: scale(6),
    height: scale(6),
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
    width: scale(16),
    height: scale(16),
    position: "relative",
    alignItems: "center",
  },
  profileHead: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    position: "absolute",
    top: 0,
  },
  profileBody: {
    width: scale(12),
    height: scale(8),
    borderTopLeftRadius: scale(6),
    borderTopRightRadius: scale(6),
    position: "absolute",
    bottom: 0,
  },
})
