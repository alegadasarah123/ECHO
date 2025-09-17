"use client"

import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native"
import * as SecureStore from "expo-secure-store"
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

interface Comment {
  id: string
  comment_text: string
  comment_date: string
  kutsero_id: string
  announcement_id: string
  kutsero_fname?: string
  kutsero_lname?: string
  kutsero_username?: string
  user_email?: string
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

// User data interface
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

interface Announcement {
  id: string
  announce_title: string
  announce_content: string
  announce_date: string
  announce_status?: string
  created_at?: string
  comment_count?: number
  user_name?: string
}

// Backend API configuration
const API_BASE_URL = "http://192.168.1.7:8000/api/kutsero"

export default function DashboardScreen() {
  const router = useRouter()
  const [searchText, setSearchText] = useState("")
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string | null>(null)

  // Updated user state management
  const [currentUser, setCurrentUser] = useState("User") // Default fallback
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingHorse, setIsLoadingHorse] = useState(false)
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false)

  // Announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [expandedAnnouncements, setExpandedAnnouncements] = useState<Set<string>>(new Set())

  const defaultHorse: Horse = {
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
  }

  const [selectedHorse, setSelectedHorse] = useState<Horse>(defaultHorse)

  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [checkInTime, setCheckInTime] = useState<string | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSOSEmergency, setShowSOSEmergency] = useState(false)

  const safeArea = getSafeAreaPadding()

  const [comments, setComments] = useState<{ [key: string]: Comment[] }>({})
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [isPostingComment, setIsPostingComment] = useState(false)

  // Validate authentication token
  const validateAuthToken = async (token: string): Promise<boolean> => {
    try {
      // You can add a backend endpoint to validate token
      // For now, we'll assume token is valid if it exists
      return token.length > 0
    } catch (error) {
      console.error("Token validation error:", error)
      return false
    }
  }

  // Fetch announcements from API
  const fetchAnnouncements = async () => {
    try {
      setIsLoadingAnnouncements(true)
      const response = await fetch(`${API_BASE_URL}/announcements/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAnnouncements(data.announcements || [])
        console.log("Fetched announcements:", data.announcements?.length || 0)
      } else {
        console.error("Failed to fetch announcements:", response.status)
        setAnnouncements([])
      }
    } catch (error) {
      console.error("Error fetching announcements:", error)
      setAnnouncements([])
    } finally {
      setIsLoadingAnnouncements(false)
    }
  }

  // Load current horse assignment from backend
  const loadCurrentAssignment = async (kutserroId: string) => {
    try {
      setIsLoadingHorse(true)

      const storedHorseData = await SecureStore.getItemAsync("selectedHorseData")
      if (storedHorseData) {
        try {
          const parsedHorseData = JSON.parse(storedHorseData)
          setSelectedHorse(parsedHorseData)
          console.log("Loaded horse from SecureStore:", parsedHorseData.name)
        } catch (parseError) {
          console.error("Error parsing stored horse data:", parseError)
        }
      }

      const response = await fetch(`${API_BASE_URL}/current_assignment/?kutsero_id=${kutserroId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.assignment && data.assignment.horse) {
          // Transform the horse data to match our interface
          const horse: Horse = {
            id: data.assignment.horse.id,
            name: data.assignment.horse.name,
            healthStatus: data.assignment.horse.healthStatus as Horse["healthStatus"],
            status: data.assignment.horse.status,
            image: require("../../assets/images/horse.png"), // Default image
            breed: data.assignment.horse.breed,
            age: data.assignment.horse.age,
            color: data.assignment.horse.color,
            operatorName: data.assignment.horse.operatorName,
            assignmentStatus: "assigned",
            currentAssignmentId: data.assignment.assignmentId,
            lastCheckup: data.assignment.horse.lastCheckup,
            nextCheckup: data.assignment.horse.nextCheckup,
          }

          setSelectedHorse(horse)

          await SecureStore.setItemAsync("selectedHorseData", JSON.stringify(horse))

          console.log("Loaded current horse assignment from API:", horse.name)
        } else {
          console.log("No current horse assignment found from API")
          if (!storedHorseData) {
            setSelectedHorse(defaultHorse)
          }
        }
      } else {
        console.log("Failed to fetch current assignment from API")
        if (!storedHorseData) {
          setSelectedHorse(defaultHorse)
        }
      }
    } catch (error) {
      console.error("Error loading current assignment:", error)
      try {
        const storedHorseData = await SecureStore.getItemAsync("selectedHorseData")
        if (storedHorseData && !selectedHorse) {
          const parsedHorseData = JSON.parse(storedHorseData)
          setSelectedHorse(parsedHorseData)
          console.log("Loaded horse from SecureStore as fallback:", parsedHorseData.name)
        }
      } catch (fallbackError) {
        console.error("Error loading horse from SecureStore fallback:", fallbackError)
      }
    } finally {
      setIsLoadingHorse(false)
    }
  }

  // Load user data and selected horse from SecureStore
  useEffect(() => {
    loadUserData()
  }, [])

  // Use useFocusEffect to reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadUserData()
      fetchAnnouncements()
    }, []),
  )

  const loadUserData = async () => {
    setIsLoading(true)
    try {
      // Get the stored authentication data from SecureStore
      const storedUserData = await SecureStore.getItemAsync("user_data")
      const storedAccessToken = await SecureStore.getItemAsync("access_token")

      console.log("Loading user data...")
      console.log("Has stored user data:", !!storedUserData)
      console.log("Has stored access token:", !!storedAccessToken)

      if (storedUserData && storedAccessToken) {
        const parsedUserData = JSON.parse(storedUserData)

        // Validate token
        const isValidToken = await validateAuthToken(storedAccessToken)
        if (!isValidToken) {
          throw new Error("Invalid token")
        }

        // Create a unified user data structure
        const unifiedUserData: UserData = {
          id: parsedUserData.id,
          email: parsedUserData.email,
          profile: parsedUserData.profile,
          access_token: storedAccessToken,
          user_status: parsedUserData.user_status || "pending",
        }

        setUserData(unifiedUserData)

        // Set display name based on available data
        let displayName = "User" // default fallback

        if (parsedUserData.profile) {
          // Use profile data if available
          const { kutsero_fname, kutsero_lname, kutsero_username } = parsedUserData.profile
          if (kutsero_fname && kutsero_lname) {
            displayName = `${kutsero_fname} ${kutsero_lname}`
          } else if (kutsero_username) {
            displayName = kutsero_username
          } else if (kutsero_fname) {
            displayName = kutsero_fname
          }
        } else if (parsedUserData.email) {
          // Fallback to user email if no profile
          displayName = parsedUserData.email.split("@")[0]
        }

        setCurrentUser(displayName)

        // Load current horse assignment from backend
        const kutserroId = parsedUserData.profile?.kutsero_id || parsedUserData.id
        await loadCurrentAssignment(kutserroId)

        console.log("Successfully loaded user data:", {
          userId: parsedUserData.id,
          email: parsedUserData.email,
          displayName: displayName,
          status: parsedUserData.user_status,
        })
      } else {
        // No stored auth data - redirect to login
        console.log("No stored authentication data found")
        Alert.alert("Session Expired", "Please log in again to continue.", [
          {
            text: "OK",
            onPress: () => router.replace("../../pages/auth/login"),
          },
        ])
      }
    } catch (error) {
      console.error("Error loading user data:", error)
      Alert.alert("Error", "Failed to load user data. Please log in again.", [
        {
          text: "OK",
          onPress: () => router.replace("../../pages/auth/login"),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            // Clear all user data from SecureStore
            await SecureStore.deleteItemAsync("access_token")
            await SecureStore.deleteItemAsync("refresh_token")
            await SecureStore.deleteItemAsync("user_data")
            await SecureStore.deleteItemAsync("selectedHorseData")
            await SecureStore.deleteItemAsync("checkInData")

            console.log("User data cleared, navigating to login")
            router.replace("../../pages/auth/login")
          } catch (error) {
            console.error("Error during logout:", error)
            // Still navigate even if storage clear fails
            router.replace("../../pages/auth/login")
          }
        },
      },
    ])
  }

  const fetchComments = async (announcementId: string) => {
    setIsLoadingComments(true)
    try {
      const response = await fetch(`${API_BASE_URL}/announcements/${announcementId}/comments/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userData?.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setComments((prev) => ({
          ...prev,
          [announcementId]: data.comments || [],
        }))
      } else {
        console.error("Failed to fetch comments:", response.status)
      }
    } catch (error) {
      console.error("Error fetching comments:", error)
    } finally {
      setIsLoadingComments(false)
    }
  }

  // FIXED: This is the main fix for the undefined ID issue
  const handleComment = (announcementId: string) => {
    console.log("[v0] Opening comment modal for announcement:", announcementId)
    console.log("[v0] Announcement ID type:", typeof announcementId)

    if (!announcementId || announcementId === "undefined") {
      console.error("[v0] Invalid announcement ID:", announcementId)
      Alert.alert("Error", "Unable to load comments. Please try again.")
      return
    }

    setSelectedAnnouncementId(announcementId)
    setShowCommentModal(true)
    fetchComments(announcementId)
  }

  const submitComment = async () => {
    console.log("[v0] Submit comment called")
    console.log("[v0] New comment:", newComment.trim())
    console.log("[v0] Selected announcement ID:", selectedAnnouncementId)
    console.log("[v0] User data:", userData)
    console.log("[v0] Kutsero ID:", userData?.profile?.kutsero_id)
    console.log("[v0] Access token exists:", !!userData?.access_token)

    if (!newComment.trim()) {
      Alert.alert("Error", "Please enter a comment before posting.")
      return
    }

    if (!selectedAnnouncementId || selectedAnnouncementId === "undefined") {
      console.error("[v0] Invalid announcement ID:", selectedAnnouncementId)
      Alert.alert("Error", "Unable to post comment. Invalid announcement ID.")
      return
    }

    if (!userData?.profile?.kutsero_id) {
      console.error("[v0] Missing kutsero_id:", userData?.profile)
      Alert.alert("Error", "User not properly authenticated. Please log in again.")
      return
    }

    if (!userData?.access_token) {
      console.error("[v0] Missing access token")
      Alert.alert("Error", "Authentication token missing. Please log in again.")
      return
    }

    setIsPostingComment(true)
    try {
      const requestUrl = `${API_BASE_URL}/announcements/${selectedAnnouncementId}/comments/`
      console.log("[v0] Making POST request to:", requestUrl)

      const requestBody = {
        comment_text: newComment.trim(),
        kutsero_id: userData.profile.kutsero_id,
      }
      console.log("[v0] Request body:", requestBody)

      const response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userData.access_token}`,
        },
        body: JSON.stringify(requestBody),
      })

      console.log("[v0] Response status:", response.status)
      console.log("[v0] Response ok:", response.ok)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Response data:", data)

        // Add the new comment to local state
        setComments((prev) => ({
          ...prev,
          [selectedAnnouncementId]: [data.comment, ...(prev[selectedAnnouncementId] || [])],
        }))

        setNewComment("")
        setShowCommentModal(false)
        setSelectedAnnouncementId(null)
        Alert.alert("Success", "Your comment has been posted!")

        // Refresh announcements to update comment count
        fetchAnnouncements()
      } else {
        const errorText = await response.text()
        console.error("[v0] Error response:", errorText)

        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch (e) {
          errorData = { error: errorText }
        }

        Alert.alert("Error", errorData.error || `Failed to post comment (${response.status})`)
      }
    } catch (error) {
      console.error("[v0] Network error posting comment:", error)
      Alert.alert("Error", "Network error. Please check your connection and try again.")
    } finally {
      setIsPostingComment(false)
    }
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

  const handleCheckIn = async () => {
    if (selectedHorse.id === "default") {
      Alert.alert("No Horse Assigned", "Please select a horse first before checking in.")
      return
    }

    try {
      const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

      // Store check-in data in SecureStore
      await SecureStore.setItemAsync(
        "checkInData",
        JSON.stringify({
          horseId: selectedHorse.id,
          horseName: selectedHorse.name,
          checkInTime: currentTime,
          timestamp: Date.now(),
        }),
      )

      setIsCheckedIn(true)
      setCheckInTime(currentTime)
      Alert.alert("Success", `Checked in with ${selectedHorse.name} at ${currentTime}`)
    } catch (error) {
      console.error("Error during check-in:", error)
      Alert.alert("Error", "Failed to check in. Please try again.")
    }
  }

  const handleCheckOut = async () => {
    if (!selectedHorse.currentAssignmentId) {
      Alert.alert("Error", "No active assignment found. Cannot check out.")
      return
    }

    const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    Alert.alert(
      "Check Out Confirmation",
      `Check out from ${selectedHorse.name}?\n\nChecked in: ${checkInTime}\nChecking out: ${currentTime}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Check Out",
          onPress: async () => {
            try {
              const kutserroId = await SecureStore.getItemAsync("kutseroId")

              const response = await fetch(`${API_BASE_URL}/checkout/`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  assignment_id: selectedHorse.currentAssignmentId,
                  kutsero_id: kutserroId,
                }),
              })

              if (response.ok) {
                const data = await response.json()

                // Clear check-in data from SecureStore only after successful API call
                await SecureStore.deleteItemAsync("checkInData")

                // Update local state
                setIsCheckedIn(false)
                setCheckInTime(null)

                setSelectedHorse(defaultHorse)

                Alert.alert("Success", data.message || `Successfully checked out from ${selectedHorse.name}`)
              } else {
                const errorData = await response.json()
                Alert.alert("Checkout Failed", errorData.error || "Failed to check out. Please try again.")
              }
            } catch (error) {
              console.error("Error during check-out:", error)
              Alert.alert("Error", "Failed to check out. Please check your internet connection and try again.")
            }
          },
        },
      ],
    )
  }

  // Load check-in status on component mount
  useEffect(() => {
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

    if (selectedHorse.id !== "default") {
      loadCheckInStatus()
    }
  }, [selectedHorse.id])

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (error) {
      return dateString
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
            // Stay on dashboard - already here
          } else if (tabKey === "horse") {
            router.push("./horsecare")
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

  // Get unread notifications count (simulated)
  const unreadNotificationsCount = 2

  // Show loading screen while data is being loaded
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />
        <ActivityIndicator size="large" color="white" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    )
  }

  // Show Notifications page when requested - moved after all hooks
  if (showNotifications) {
    return <NotificationsPage onBack={() => setShowNotifications(false)} userName={currentUser} />
  }

  // Show SOS Emergency page when requested
  if (showSOSEmergency) {
    return <SOSEmergencyScreen onBack={() => setShowSOSEmergency(false)} />
  }

  const selectedAnnouncementComments = selectedAnnouncementId ? comments[selectedAnnouncementId] || [] : []
  const commentCount = selectedAnnouncementComments.length

  const toggleAnnouncement = (id: string) => {
    const newExpanded = new Set(expandedAnnouncements)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedAnnouncements(newExpanded)
  }

  const getTruncatedContent = (content: string, id: string, maxLength = 150) => {
    const isExpanded = expandedAnnouncements.has(id)
    const needsTruncation = content.length > maxLength

    if (!needsTruncation || isExpanded) {
      return { text: content, showToggle: needsTruncation }
    }

    return {
      text: content.substring(0, maxLength) + "...",
      showToggle: true,
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
            {userData?.profile?.kutsero_email && <Text style={styles.userEmail}>{userData.profile.kutsero_email}</Text>}
            {userData?.user_status === "pending" && (
              <Text style={styles.statusText}>Account Status: Pending Approval</Text>
            )}
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={() => setShowNotifications(true)}>
              <Image
                source={require("../../assets/images/notification.png")}
                style={[styles.headerIconImage, { tintColor: "white" }]}
                resizeMode="contain"
              />
              {unreadNotificationsCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{unreadNotificationsCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.sosButton} onPress={() => setShowSOSEmergency(true)}>
              <Image source={require("../../assets/images/sos.png")} style={styles.sosIcon} resizeMode="contain" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
              <MenuIcon color="white" />
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
          {/* Horse Selection Section */}
          <View style={styles.horseSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Horse Assignment</Text>
              {isLoadingHorse && <ActivityIndicator size="small" color="#C17A47" />}
            </View>
            <View style={styles.horseCard}>
              <View style={styles.horseImageContainer}>
                <Image source={selectedHorse.image} style={styles.horseImage} resizeMode="cover" />
              </View>
              <View style={styles.horseInfo}>
                <Text style={styles.horseNameText}>
                  <Text style={styles.horseLabel}>Name: </Text>
                  <Text style={styles.horseValue}>{selectedHorse.name}</Text>
                </Text>
                <Text style={styles.horseBreedText}>
                  <Text style={styles.horseLabel}>Breed: </Text>
                  <Text style={styles.horseValue}>{selectedHorse.breed}</Text>
                </Text>
                {selectedHorse.operatorName && selectedHorse.operatorName !== "N/A" && (
                  <Text style={styles.horseOperatorText}>
                    <Text style={styles.horseLabel}>Owner: </Text>
                    <Text style={styles.horseValue}>{selectedHorse.operatorName}</Text>
                  </Text>
                )}
                <View style={styles.healthRow}>
                  <Text style={styles.horseLabel}>Health Status: </Text>
                  <View
                    style={[styles.healthDot, { backgroundColor: getHealthStatusColor(selectedHorse.healthStatus) }]}
                  />
                  <Text style={[styles.healthText, { color: getHealthStatusColor(selectedHorse.healthStatus) }]}>
                    {selectedHorse.healthStatus}
                  </Text>
                </View>
                <Text style={styles.readyText}>{selectedHorse.status}</Text>
              </View>
            </View>
            <View style={styles.reminderSection}>
              {selectedHorse.id !== "default" ? (
                <>
                  <Text style={styles.reminderText}>Remember to check-out your horse at the end of the day</Text>

                  {/* Check In/Out Buttons */}
                  <View style={styles.checkInOutContainer}>
                    {!isCheckedIn ? (
                      <TouchableOpacity style={styles.checkInButton} onPress={handleCheckIn}>
                        <Text style={styles.checkInButtonText}>Check In</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.checkedInContainer}>
                        <View style={styles.checkedInInfo}>
                          <Text style={styles.checkedInText}>✓ Checked in at {checkInTime}</Text>
                        </View>
                        <TouchableOpacity style={styles.checkOutButton} onPress={handleCheckOut}>
                          <Text style={styles.checkOutButtonText}>Check Out</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </>
              ) : (
                <Text style={styles.reminderText}>Select a horse to start working</Text>
              )}

              {/* Change/Select Horse Button */}
              <TouchableOpacity style={styles.changeHorseButton} onPress={() => router.push("./horseselection")}>
                <Text style={styles.changeHorseButtonText}>
                  {selectedHorse.id === "default" ? "Select Horse" : "Change Horse"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Announcements Section */}
          <View style={styles.activitiesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Announcements</Text>
              {isLoadingAnnouncements && <ActivityIndicator size="small" color="#C17A47" />}
            </View>

            {announcements.length === 0 && !isLoadingAnnouncements ? (
              <View style={styles.noAnnouncementsContainer}>
                <Text style={styles.noAnnouncementsText}>No announcements available at this time.</Text>
              </View>
            ) : (
              announcements.map((announcement, index) => (
                <View
                  key={announcement.id}
                  style={[styles.facebookPostCard, index < announcements.length - 1 && styles.postCardMargin]}
                >
                  <View style={styles.postHeader}>
                    <View style={styles.postIconContainer}>
                      <View style={styles.announcementIcon}>
                        <View style={styles.megaphoneBody} />
                        <View style={styles.megaphoneCone} />
                      </View>
                    </View>
                    <View style={styles.postHeaderContent}>
                      <Text style={styles.postTitle}>{announcement.user_name || "CTU Announcement"}</Text>
                      <Text style={styles.postTime}>{formatDate(announcement.announce_date)}</Text>
                    </View>
                  </View>

                  <View style={styles.postContent}>
                    {(() => {
                      const { text, showToggle } = getTruncatedContent(announcement.announce_content, announcement.id)
                      return (
                        <>
                          <Text style={styles.postDescription}>{text}</Text>
                          {showToggle && (
                            <TouchableOpacity
                              onPress={() => toggleAnnouncement(announcement.id)}
                              style={styles.seeMoreButton}
                            >
                              <Text style={styles.seeMoreText}>
                                {expandedAnnouncements.has(announcement.id) ? "See less" : "See more"}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </>
                      )
                    })()}
                  </View>

                  <View style={styles.postActions}>
                    <TouchableOpacity
                      style={styles.commentButton}
                      onPress={() => {
                        console.log("[v0] Announcement object:", announcement)
                        console.log("[v0] Announcement ID:", announcement.id)

                        // Ensure we have a valid ID before calling handleComment
                        if (announcement.id) {
                          handleComment(String(announcement.id))
                        } else {
                          console.error("[v0] No valid ID found in announcement:", announcement)
                          Alert.alert("Error", "Unable to load comments. Invalid announcement ID.")
                        }
                      }}
                    >
                      <Image
                        source={require("../../assets/images/comment.png")}
                        style={styles.commentIcon}
                        resizeMode="contain"
                      />
                      <Text style={styles.commentCount}>{announcement.comment_count || 0} comments</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* Bottom Tab Navigation */}
        <View style={[styles.tabBar, { paddingBottom: safeArea.bottom }]}>
          <TabButton iconSource={null} label="Home" tabKey="home" isActive={true} />
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
            isActive={false}
          />
          <TabButton iconSource={null} label="Profile" tabKey="profile" isActive={false} />
        </View>
      </View>

      {/* Comment Modal */}
      <Modal
        visible={showCommentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowCommentModal(false)
          setSelectedAnnouncementId(null)
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments ({commentCount})</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCommentModal(false)
                  setSelectedAnnouncementId(null)
                }}
              >
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.commentsContainer}>
              {isLoadingComments ? (
                <View style={styles.loadingCommentsContainer}>
                  <ActivityIndicator size="small" color="#C17A47" />
                  <Text style={styles.loadingCommentsText}>Loading comments...</Text>
                </View>
              ) : selectedAnnouncementComments.length > 0 ? (
                selectedAnnouncementComments.map((comment) => (
                  <View key={comment.id} style={styles.commentItem}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentUser}>
                        {comment.kutsero_fname && comment.kutsero_lname
                          ? `${comment.kutsero_fname} ${comment.kutsero_lname}`
                          : comment.kutsero_username || "Anonymous User"}
                      </Text>
                      <Text style={styles.commentTime}>{new Date(comment.comment_date).toLocaleString()}</Text>
                    </View>
                    <Text style={styles.commentText}>{comment.comment_text}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.noCommentsContainer}>
                  <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Write a comment..."
                placeholderTextColor="#999"
                multiline
                maxLength={500}
                editable={!isPostingComment}
              />
              <TouchableOpacity
                style={[styles.submitButton, { opacity: newComment.trim() && !isPostingComment ? 1 : 0.5 }]}
                onPress={submitComment}
                disabled={!newComment.trim() || isPostingComment}
              >
                {isPostingComment ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>Post</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  userEmail: {
    fontSize: moderateScale(11),
    color: "rgba(255,255,255,0.8)",
    marginTop: verticalScale(2),
  },
  statusText: {
    fontSize: moderateScale(10),
    color: "#FFE082",
    marginTop: verticalScale(2),
    fontWeight: "500",
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
    position: "relative",
  },
  headerIconImage: {
    width: scale(18),
    height: scale(18),
  },
  notificationBadge: {
    position: "absolute",
    top: scale(-2),
    right: scale(-2),
    backgroundColor: "#FF4444",
    borderRadius: scale(8),
    paddingHorizontal: scale(4),
    paddingVertical: scale(1),
    minWidth: scale(16),
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadgeText: {
    color: "white",
    fontSize: moderateScale(9),
    fontWeight: "bold",
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
  horseSection: {
    backgroundColor: "white",
    marginHorizontal: scale(16),
    marginTop: dynamicSpacing(16),
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
    fontWeight: "600",
    color: "#333",
  },
  changeHorseButton: {
    backgroundColor: "#C17A47",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderRadius: scale(8),
    alignItems: "center",
    marginTop: verticalScale(8),
    minHeight: 40,
  },
  changeHorseButtonText: {
    color: "white",
    fontSize: moderateScale(12),
    fontWeight: "600",
  },
  horseCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: verticalScale(12),
  },
  horseImageContainer: {
    marginRight: scale(12),
  },
  horseImage: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(8),
  },
  horseInfo: {
    flex: 1,
  },
  horseNameText: {
    fontSize: moderateScale(14),
    marginBottom: verticalScale(4),
  },
  horseBreedText: {
    fontSize: moderateScale(12),
    marginBottom: verticalScale(4),
  },
  horseOperatorText: {
    fontSize: moderateScale(12),
    marginBottom: verticalScale(4),
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
    marginBottom: verticalScale(4),
  },
  healthDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: "#4CAF50",
    marginLeft: scale(4),
    marginRight: scale(6),
  },
  healthText: {
    fontSize: moderateScale(12),
    color: "#4CAF50",
    fontWeight: "500",
  },
  readyText: {
    fontSize: moderateScale(12),
    color: "#666",
  },
  reminderSection: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: verticalScale(12),
  },
  reminderText: {
    fontSize: moderateScale(11),
    color: "#666",
    lineHeight: moderateScale(14),
    marginBottom: verticalScale(8),
  },
  activitiesSection: {
    backgroundColor: "white",
    marginHorizontal: scale(16),
    marginTop: dynamicSpacing(16),
    borderRadius: scale(12),
    padding: scale(16),
  },
  // Announcement icon styles
  announcementIcon: {
    width: scale(16),
    height: scale(12),
    position: "relative",
  },
  megaphoneBody: {
    width: scale(8),
    height: scale(8),
    backgroundColor: "#2196F3",
    borderRadius: scale(2),
    position: "absolute",
    left: 0,
    top: scale(2),
  },
  megaphoneCone: {
    width: 0,
    height: 0,
    borderTopWidth: scale(6),
    borderBottomWidth: scale(6),
    borderLeftWidth: scale(8),
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#2196F3",
    position: "absolute",
    right: 0,
    top: 0,
  },
  noAnnouncementsContainer: {
    padding: scale(20),
    alignItems: "center",
  },
  noAnnouncementsText: {
    fontSize: moderateScale(14),
    color: "#999",
    textAlign: "center",
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    maxHeight: height * 0.8,
    minHeight: height * 0.4,
    paddingTop: verticalScale(20),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#333",
  },
  closeButton: {
    fontSize: moderateScale(18),
    color: "#666",
    fontWeight: "bold",
  },
  commentsContainer: {
    flex: 1,
    paddingHorizontal: scale(20),
  },
  commentItem: {
    paddingVertical: verticalScale(10),
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(4),
  },
  commentUser: {
    fontSize: moderateScale(13),
    fontWeight: "600",
    color: "#333",
  },
  commentTime: {
    fontSize: moderateScale(11),
    color: "#999",
  },
  commentText: {
    fontSize: moderateScale(12),
    color: "#666",
    lineHeight: moderateScale(16),
  },
  loadingCommentsContainer: {
    padding: scale(20),
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: scale(10),
  },
  loadingCommentsText: {
    fontSize: moderateScale(12),
    color: "#666",
  },
  noCommentsContainer: {
    padding: scale(20),
    alignItems: "center",
  },
  noCommentsText: {
    fontSize: moderateScale(14),
    color: "#999",
    textAlign: "center",
  },
  commentInputContainer: {
    flexDirection: "row",
    padding: scale(16),
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    alignItems: "flex-end",
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: scale(16),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    fontSize: moderateScale(12),
    maxHeight: verticalScale(80),
    marginRight: scale(10),
  },
  submitButton: {
    backgroundColor: "#C17A47",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(16),
  },
  submitButtonText: {
    color: "white",
    fontSize: moderateScale(12),
    fontWeight: "600",
  },
  // Check In/Out Styles
  checkInOutContainer: {
    marginTop: verticalScale(8),
    marginBottom: verticalScale(8),
  },
  checkInButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(20),
    borderRadius: scale(8),
    alignItems: "center",
    minHeight: 40,
  },
  checkInButtonText: {
    color: "white",
    fontSize: moderateScale(12),
    fontWeight: "600",
  },
  checkedInContainer: {
    gap: verticalScale(6),
  },
  checkedInInfo: {
    backgroundColor: "#E8F5E8",
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(10),
    borderRadius: scale(6),
    borderLeftWidth: 3,
    borderLeftColor: "#4CAF50",
  },
  checkedInText: {
    color: "#2E7D32",
    fontSize: moderateScale(11),
    fontWeight: "500",
  },
  checkOutButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(20),
    borderRadius: scale(8),
    alignItems: "center",
    minHeight: 40,
  },
  checkOutButtonText: {
    color: "white",
    fontSize: moderateScale(12),
    fontWeight: "600",
  },
  facebookPostCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(12),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: scale(2),
    },
    shadowOpacity: 0.1,
    shadowRadius: scale(4),
    elevation: 3,
    overflow: "hidden",
  },
  postCardMargin: {
    marginBottom: scale(16),
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: scale(16),
    paddingBottom: scale(12),
  },
  postIconContainer: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(12),
  },
  postHeaderContent: {
    flex: 1,
  },
  postTitle: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: scale(2),
  },
  postTime: {
    fontSize: moderateScale(13),
    color: "#8E8E93",
  },
  postContent: {
    paddingHorizontal: scale(16),
    paddingBottom: scale(16),
  },
  postDescription: {
    fontSize: moderateScale(15),
    color: "#1C1C1E",
    lineHeight: moderateScale(22),
  },
  postActions: {
    borderTopWidth: 1,
    borderTopColor: "#F2F2F7",
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
  },
  commentButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: scale(8),
  },
  commentIcon: {
    width: scale(20),
    height: scale(20),
    marginRight: scale(8),
    tintColor: "#8E8E93",
  },
  commentCount: {
    fontSize: moderateScale(14),
    color: "#8E8E93",
    fontWeight: "500",
  },
  seeMoreButton: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  seeMoreText: {
    color: "#1976D2",
    fontSize: 14,
    fontWeight: "500",
  },
})
