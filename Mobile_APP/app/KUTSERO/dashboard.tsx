"use client"

import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useEffect, useState, useRef } from "react"
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
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from "react-native"
import * as SecureStore from "expo-secure-store"
import NotificationsPage from "./notifications"
import SOSEmergencyScreen from "./sos"
import AsyncStorage from "@react-native-async-storage/async-storage"

const { width, height } = Dimensions.get("window")

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
  parent_comment_id?: string
  reply_count?: number
  kutsero_profile_image?: string
}

interface Reply extends Comment {
  parent_comment_id: string
}

interface Horse {
  id: string
  name: string
  healthStatus: "Healthy" | "Under Care" | "Recovering"
  status: string
  image: string
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

interface Announcement {
  id: string
  announce_title: string
  announce_content: string
  announce_date: string
  announce_status?: string
  created_at?: string
  comment_count?: number
  user_name?: string
  image_url?: string
  image_urls?: string[]
  user_info?: {
    role?: string
    user_type?: string
    [key: string]: any
  }
}

interface SearchUserProfile {
  id: string
  name?: string
  email: string
  role?: string
  user_type?: string
  status?: string
  user_status?: string
  avatar?: string
  profile_image?: string
  phone?: string
  created_at?: string
  profile?: {
    kutsero_id?: string
    kutsero_fname?: string
    kutsero_lname?: string
    kutsero_username?: string
    kutsero_email?: string
    operator_id?: string
    operator_fname?: string
    operator_lname?: string
    operator_username?: string
    operator_email?: string
  }
}

const API_BASE_URL = "https://echo-ebl8.onrender.com/api/kutsero"

// Image Carousel Component
const ImageCarousel = ({ images }: { images: string[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const flatListRef = useRef<FlatList>(null)
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null)

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0)
    }
  }).current

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current

  return (
    <View style={styles.carouselContainer}>
      <FlatList
        ref={flatListRef}
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => `image-${index}`}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.carouselImageContainer}
            onPress={() => setFullScreenImage(item)}
            activeOpacity={0.9}
          >
            <Image source={{ uri: item }} style={styles.carouselImage} resizeMode="cover" />
          </TouchableOpacity>
        )}
      />
      {images.length > 1 && (
        <View style={styles.paginationContainer}>
          {images.map((_, index) => (
            <View key={index} style={[styles.paginationDot, currentIndex === index && styles.paginationDotActive]} />
          ))}
        </View>
      )}
      {images.length > 1 && (
        <View style={styles.imageCounter}>
          <Text style={styles.imageCounterText}>
            {currentIndex + 1} / {images.length}
          </Text>
        </View>
      )}

      <Modal
        visible={fullScreenImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullScreenImage(null)}
      >
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity style={styles.fullScreenCloseButton} onPress={() => setFullScreenImage(null)}>
            <Text style={styles.fullScreenCloseText}>✕</Text>
          </TouchableOpacity>
          {fullScreenImage && (
            <Image source={{ uri: fullScreenImage }} style={styles.fullScreenImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  )
}

export default function DashboardScreen() {
  const router = useRouter()
  const [searchText, setSearchText] = useState("")
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string | null>(null)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const [currentUser, setCurrentUser] = useState("User")
  const [currentUserProfileImage, setCurrentUserProfileImage] = useState<string | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingHorse, setIsLoadingHorse] = useState(false)
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [expandedAnnouncements, setExpandedAnnouncements] = useState<Set<string>>(new Set())
  const [lastViewedAnnouncementTime, setLastViewedAnnouncementTime] = useState<string | null>(null)

  // Reply-related state
  const [replies, setReplies] = useState<{ [key: string]: Reply[] }>({})
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [isLoadingReplies, setIsLoadingReplies] = useState<{ [key: string]: boolean }>({})

  // Search dropdown state
  const [searchResults, setSearchResults] = useState<SearchUserProfile[]>([])
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const defaultHorse: Horse = {
    id: "default",
    name: "No Horse Assigned",
    healthStatus: "Healthy",
    status: "Please select a horse",
    image: "https://via.placeholder.com/150?text=No+Horse+Assigned",
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
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null)

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height)
      setIsKeyboardVisible(true)
    })

    const keyboardDidHideListener = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0)
      setIsKeyboardVisible(false)
    })

    return () => {
      keyboardDidHideListener?.remove()
      keyboardDidShowListener?.remove()
    }
  }, [])

  const getModalHeight = () => {
    if (isKeyboardVisible) {
      return height - keyboardHeight - (Platform.OS === "ios" ? 50 : 20)
    }
    return height * 0.8
  }

  const getModalMarginTop = () => {
    if (isKeyboardVisible) {
      return Platform.OS === "ios" ? 50 : 20
    }
    return height * 0.2
  }

  const validateAuthToken = async (token: string): Promise<boolean> => {
    try {
      return token.length > 0
    } catch (error) {
      console.error("Token validation error:", error)
      return false
    }
  }

  const parseImageUrls = (imageData: any): string[] => {
    if (!imageData) return []

    try {
      if (Array.isArray(imageData)) {
        return imageData.filter((url) => url && typeof url === "string")
      }

      if (typeof imageData === "string") {
        if (imageData.startsWith("[")) {
          const parsed = JSON.parse(imageData)
          if (Array.isArray(parsed)) {
            return parsed.filter((url) => url && typeof url === "string")
          }
        }
        return [imageData]
      }

      return []
    } catch (error) {
      console.error("Error parsing image URLs:", error)
      return []
    }
  }

  const getUserDisplayInfo = (user: SearchUserProfile) => {
    let displayName = "Unknown User"
    let email = user.email || ""
    const userType = user.user_type || user.role || "user"

    if (user.name) {
      displayName = user.name
      email = user.email || ""
    } else if (user.profile) {
      if (user.user_type === "kutsero" || user.profile.kutsero_id) {
        displayName =
          user.profile.kutsero_fname && user.profile.kutsero_lname
            ? `${user.profile.kutsero_fname} ${user.profile.kutsero_lname}`
            : user.profile.kutsero_username || user.email.split("@")[0]
        email = user.profile.kutsero_email || user.email
      } else if (user.user_type === "operator" || user.profile.operator_id) {
        displayName =
          user.profile.operator_fname && user.profile.operator_lname
            ? `${user.profile.operator_fname} ${user.profile.operator_lname}`
            : user.profile.operator_username || user.email.split("@")[0]
        email = user.profile.operator_email || user.email
      }
    } else {
      displayName = user.email.split("@")[0]
    }

    return { displayName, email, userType }
  }

  const getAnnouncementProfilePicture = (announcement: Announcement) => {
    const title = announcement.announce_title
    if (!title) return null

    const titleLower = title.toLowerCase()
    if (titleLower.includes("ctu") || titleLower.includes("vet")) {
      return require("../../assets/images/CTU.jpg")
    } else if (titleLower.includes("dvmf")) {
      return require("../../assets/images/DVMF.png")
    }
    return null
  }

  const searchUsers = async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([])
      setShowSearchDropdown(false)
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`${API_BASE_URL}/search_all_users/?query=${encodeURIComponent(query)}&limit=5`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userData?.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.users || [])
        setShowSearchDropdown(data.users && data.users.length > 0)
      } else if (response.status === 401) {
        await loadUserData()
        setSearchResults([])
        setShowSearchDropdown(false)
      } else {
        console.error("Failed to search users:", response.status)
        setSearchResults([])
        setShowSearchDropdown(false)
      }
    } catch (error) {
      console.error("Error searching users:", error)
      setSearchResults([])
      setShowSearchDropdown(false)
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    if (searchText.trim().length === 0) {
      setSearchResults([])
      setShowSearchDropdown(false)
      return
    }

    if (searchText.trim().length < 2) {
      return
    }

    searchTimeout.current = setTimeout(() => {
      searchUsers(searchText)
    }, 300)

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current)
      }
    }
  }, [searchText, userData?.access_token])

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

        const processedAnnouncements =
          data.announcements?.map((ann: any) => {
            const imageUrls = parseImageUrls(ann.image_url)

            return {
              ...ann,
              image_urls: imageUrls,
              image_url: imageUrls.length > 0 ? imageUrls[0] : null,
            }
          }) || []

        setAnnouncements(processedAnnouncements)
        if (lastViewedAnnouncementTime === null) {
          const lastViewed = await AsyncStorage.getItem("lastViewedAnnouncementTime")
          setLastViewedAnnouncementTime(lastViewed)
        }
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

  const loadCurrentAssignment = async (kutserroId: string) => {
    try {
      setIsLoadingHorse(true)
      console.log("Loading assignment for kutsero:", kutserroId)
      
      // First check local storage for check-in status
      const checkInData = await SecureStore.getItemAsync("checkInData")
      if (checkInData) {
        const parsedData = JSON.parse(checkInData)
        setIsCheckedIn(true)
        setCheckInTime(parsedData.checkInTime)
      }

      // Call new endpoint for current assignment with check-in status
      const response = await fetch(`${API_BASE_URL}/current_assignment/?kutsero_id=${kutserroId}`, {
        method: "GET",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": userData?.access_token ? `Bearer ${userData.access_token}` : ""
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Current assignment API response:", data)
        
        if (data.has_assignment && data.horse) {
          const imageUrl = data.horse.image || "https://via.placeholder.com/150?text=Horse"
          
          const horse: Horse = {
            id: data.horse.id,
            name: data.horse.name,
            healthStatus: data.horse.health_status || (data.horse.status === 'assigned' ? "Healthy" : "Healthy"),
            status: data.horse.status || "Assigned",
            image: imageUrl,
            breed: data.horse.breed || "Unknown",
            age: data.horse.age || 0,
            color: data.horse.color || "Unknown",
            operatorName: data.horse.operator_name || "Unknown Owner",
            assignmentStatus: "assigned",
            currentAssignmentId: data.assignment.id,
            lastCheckup: data.horse.last_checkup || "N/A",
            nextCheckup: data.horse.next_checkup || "N/A",
          }
          
          console.log("Setting horse with assignment:", horse)
          setSelectedHorse(horse)
          
          // Update check-in status from backend
          if (data.is_checked_in !== undefined) {
            setIsCheckedIn(data.is_checked_in)
            if (data.is_checked_in && data.checkin_time) {
              const checkInTime = new Date(data.checkin_time).toLocaleTimeString([], { 
                hour: "2-digit", 
                minute: "2-digit" 
              })
              setCheckInTime(checkInTime)
              
              // Save to local storage
              await SecureStore.setItemAsync(
                "checkInData",
                JSON.stringify({
                  horseId: horse.id,
                  horseName: horse.name,
                  checkInTime: checkInTime,
                  timestamp: Date.now(),
                  assignmentId: data.assignment.id,
                }),
              )
            } else if (!data.is_checked_in) {
              // Clear check-in data if not checked in
              await SecureStore.deleteItemAsync("checkInData")
              setIsCheckedIn(false)
              setCheckInTime(null)
            }
          }
          
          await SecureStore.setItemAsync("selectedHorseData", JSON.stringify(horse))
        } else {
          console.log("No assignment found, using default horse")
          setSelectedHorse(defaultHorse)
          setIsCheckedIn(false)
          setCheckInTime(null)
          await SecureStore.deleteItemAsync("selectedHorseData")
          await SecureStore.deleteItemAsync("checkInData")
        }
      } else {
        console.log("Assignment API failed:", response.status)
        // Check local storage as fallback
        const storedHorseData = await SecureStore.getItemAsync("selectedHorseData")
        if (storedHorseData) {
          try {
            const parsedHorseData = JSON.parse(storedHorseData)
            setSelectedHorse(parsedHorseData)
          } catch (parseError) {
            console.error("Error parsing stored horse data:", parseError)
            setSelectedHorse(defaultHorse)
          }
        } else {
          setSelectedHorse(defaultHorse)
        }
      }
    } catch (error) {
      console.error("Error loading current assignment:", error)
      // Fallback to local storage
      const storedHorseData = await SecureStore.getItemAsync("selectedHorseData")
      if (storedHorseData) {
        try {
          const parsedHorseData = JSON.parse(storedHorseData)
          setSelectedHorse(parsedHorseData)
        } catch (parseError) {
          console.error("Error parsing stored horse data:", parseError)
          setSelectedHorse(defaultHorse)
        }
      }
    } finally {
      setIsLoadingHorse(false)
    }
  }

  useEffect(() => {
    loadUserData()
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadUserData()
      fetchAnnouncements()
    }, []),
  )

  const loadUserData = async () => {
    setIsLoading(true)
    try {
      const storedUserData = await SecureStore.getItemAsync("user_data")
      const storedAccessToken = await SecureStore.getItemAsync("access_token")

      if (storedUserData && storedAccessToken) {
        const parsedUserData = JSON.parse(storedUserData)
        const isValidToken = await validateAuthToken(storedAccessToken)
        if (!isValidToken) throw new Error("Invalid token")

        const unifiedUserData: UserData = {
          id: parsedUserData.id,
          email: parsedUserData.email,
          profile: parsedUserData.profile,
          access_token: storedAccessToken,
          user_status: parsedUserData.user_status || "pending",
        }

        setUserData(unifiedUserData)

        let displayName = "User"
        if (parsedUserData.profile) {
          const { kutsero_fname, kutsero_username, kutsero_profile_image } = parsedUserData.profile
          if (kutsero_fname) {
            displayName = kutsero_fname
          } else if (kutsero_username) {
            displayName = kutsero_username
          }
          if (kutsero_profile_image) {
            setCurrentUserProfileImage(kutsero_profile_image)
          }
        } else if (parsedUserData.email) {
          displayName = parsedUserData.email.split("@")[0]
        }

        setCurrentUser(displayName)
        const kutserroId = parsedUserData.profile?.kutsero_id || parsedUserData.id
        await loadCurrentAssignment(kutserroId)
      } else {
        Alert.alert("Session Expired", "Please log in again to continue.", [
          { text: "OK", onPress: () => router.replace("../../pages/auth/login") },
        ])
      }
    } catch (error) {
      console.error("Error loading user data:", error)
      Alert.alert("Error", "Failed to load user data. Please log in again.", [
        { text: "OK", onPress: () => router.replace("../../pages/auth/login") },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearchSubmit = () => {
    if (searchText.trim()) {
      setShowSearchDropdown(false)
      router.push(`./usersearch?query=${encodeURIComponent(searchText)}`)
    }
  }

  const navigateToUserProfile = (userId: string, userData?: SearchUserProfile) => {
    console.log("Navigating to user profile:", userId)
    setShowSearchDropdown(false)
    setSearchText("")

    if (userData) {
      router.push({
        pathname: "./userprofile",
        params: {
          userId: userId,
          userData: JSON.stringify(userData),
        },
      })
    } else {
      router.push(`./userprofile?userId=${userId}`)
    }
  }

  useEffect(() => {
    const keyboardHide = Keyboard.addListener("keyboardDidHide", () => {
      setShowSearchDropdown(false)
    })

    return () => {
      keyboardHide.remove()
    }
  }, [])

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
        setComments((prev) => ({ ...prev, [announcementId]: data.comments || [] }))
      } else {
        console.error("[ERROR] Failed to fetch comments:", response.status)
      }
    } catch (error) {
      console.error("[ERROR] Error fetching comments:", error)
    } finally {
      setIsLoadingComments(false)
    }
  }

  const fetchReplies = async (commentId: string) => {
    setIsLoadingReplies((prev) => ({ ...prev, [commentId]: true }))
    try {
      const response = await fetch(`${API_BASE_URL}/comments/${commentId}/replies/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userData?.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setReplies((prev) => ({ ...prev, [commentId]: data.replies || [] }))
      } else {
        console.error("[ERROR] Failed to fetch replies:", response.status)
      }
    } catch (error) {
      console.error("[ERROR] Error fetching replies:", error)
    } finally {
      setIsLoadingReplies((prev) => ({ ...prev, [commentId]: false }))
    }
  }

  const toggleReplies = (commentId: string) => {
    const newExpanded = new Set(expandedReplies)
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId)
    } else {
      newExpanded.add(commentId)
      if (!replies[commentId]) {
        fetchReplies(commentId)
      }
    }
    setExpandedReplies(newExpanded)
  }

  const handleComment = (announcementId: string) => {
    if (!announcementId || announcementId === "undefined") {
      Alert.alert("Error", "Unable to load comments. Please try again.")
      return
    }
    setSelectedAnnouncementId(announcementId)
    setShowCommentModal(true)
    setReplyingTo(null)
    setReplyText("")
    fetchComments(announcementId)
  }

  const submitComment = async () => {
    if (!newComment.trim() && !replyText.trim()) {
      Alert.alert("Error", "Please enter a comment before posting.")
      return
    }

    if (!selectedAnnouncementId || !userData?.profile?.kutsero_id || !userData?.access_token) {
      Alert.alert("Error", "Unable to post comment. Please try again.")
      return
    }

    setIsPostingComment(true)
    try {
      const commentBody: any = {
        comment_text: replyingTo ? replyText.trim() : newComment.trim(),
        kutsero_id: userData.profile.kutsero_id,
      }

      if (replyingTo) {
        commentBody.parent_comment_id = replyingTo
      }

      const response = await fetch(`${API_BASE_URL}/announcements/${selectedAnnouncementId}/comments/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userData.access_token}`,
        },
        body: JSON.stringify(commentBody),
      })

      if (response.ok) {
        const data = await response.json()

        if (replyingTo) {
          setReplies((prev) => ({
            ...prev,
            [replyingTo]: [data.comment, ...(prev[replyingTo] || [])],
          }))
          setComments((prev) => ({
            ...prev,
            [selectedAnnouncementId]: prev[selectedAnnouncementId].map((comment) =>
              comment.id === replyingTo ? { ...comment, reply_count: (comment.reply_count || 0) + 1 } : comment,
            ),
          }))
          setReplyText("")
          setReplyingTo(null)
          Alert.alert("Success", "Your reply has been posted!")
        } else {
          setComments((prev) => ({
            ...prev,
            [selectedAnnouncementId]: [data.comment, ...(prev[selectedAnnouncementId] || [])],
          }))
          setNewComment("")
          Alert.alert("Success", "Your comment has been posted!")
        }

        fetchAnnouncements()
      } else {
        const errorData = await response.text()
        console.error("[ERROR] Failed to post:", errorData)
        Alert.alert("Error", "Failed to post comment")
      }
    } catch (error) {
      console.error("[ERROR] Network error:", error)
      Alert.alert("Error", "Network error. Please check your connection.")
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
    if (selectedHorse.id === "default" || !selectedHorse.currentAssignmentId) {
      Alert.alert("No Horse Assigned", "Please select a horse first before checking in.")
      return
    }

    if (isCheckedIn) {
      Alert.alert("Already Checked In", `You are already checked in with ${selectedHorse.name} since ${checkInTime}`)
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/check_in_horse/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": userData?.access_token ? `Bearer ${userData.access_token}` : ""
        },
        body: JSON.stringify({
          assignment_id: selectedHorse.currentAssignmentId,
          kutsero_id: userData?.profile?.kutsero_id,
        }),
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        await SecureStore.setItemAsync(
          "checkInData",
          JSON.stringify({
            horseId: selectedHorse.id,
            horseName: selectedHorse.name,
            checkInTime: currentTime,
            timestamp: Date.now(),
            assignmentId: selectedHorse.currentAssignmentId,
          }),
        )
        setIsCheckedIn(true)
        setCheckInTime(currentTime)
        Alert.alert(
          "Success", 
          `Checked in with ${selectedHorse.name} at ${currentTime}\n\nYou cannot change horses while checked in.`,
          [
            { 
              text: "OK",
              onPress: () => {
                // Refresh horse data to show updated status
                loadCurrentAssignment(userData?.profile?.kutsero_id || '')
              }
            }
          ]
        )
      } else {
        Alert.alert("Check-in Failed", data.error || "Failed to check in. Please try again.")
      }
    } catch (error) {
      Alert.alert("Error", "Failed to check in. Please check your internet connection.")
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
              const response = await fetch(`${API_BASE_URL}/check_out_horse/`, {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json",
                  "Authorization": userData?.access_token ? `Bearer ${userData.access_token}` : ""
                },
                body: JSON.stringify({
                  assignment_id: selectedHorse.currentAssignmentId,
                  kutsero_id: userData?.profile?.kutsero_id,
                }),
              })

              if (response.ok) {
                const data = await response.json()
                await SecureStore.deleteItemAsync("checkInData")
                await SecureStore.deleteItemAsync("selectedHorseData")
                setIsCheckedIn(false)
                setCheckInTime(null)
                setSelectedHorse(defaultHorse)
                Alert.alert(
                  "Success", 
                  `Successfully checked out from ${selectedHorse.name}\n\nYou can now select a new horse.`
                )
              } else {
                const errorData = await response.json()
                Alert.alert("Checkout Failed", errorData.error || "Failed to check out. Please try again.")
              }
            } catch (error) {
              Alert.alert("Error", "Failed to check out. Please check your internet connection.")
            }
          },
        },
      ],
    )
  }

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
          if (tabKey === "horse") router.push("./horsecare")
          else if (tabKey === "chat") router.push("./messages")
          else if (tabKey === "calendar") router.push("./calendar")
          else if (tabKey === "history") router.push("./history")
          else if (tabKey === "profile") router.push("./profile")
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

  const unreadNotificationsCount = announcements.filter((announcement) => {
    if (!lastViewedAnnouncementTime) return true
    const announcementDate = new Date(announcement.announce_date || announcement.created_at || "")
    const lastViewedDate = new Date(lastViewedAnnouncementTime)
    return announcementDate > lastViewedDate
  }).length

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />
        <ActivityIndicator size="large" color="white" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    )
  }

  if (showNotifications) {
    return <NotificationsPage onBack={() => setShowNotifications(false)} userName={currentUser} />
  }

  if (showSOSEmergency) {
    return <SOSEmergencyScreen onBack={() => setShowSOSEmergency(false)} />
  }

  const selectedAnnouncementComments = selectedAnnouncementId ? comments[selectedAnnouncementId] || [] : []
  const commentCount = selectedAnnouncementComments.filter((c) => !c.parent_comment_id).length

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

      <View style={[styles.header, { paddingTop: safeArea.top }]}>
        <View style={styles.headerTop}>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome,</Text>
            <Text style={styles.userName}>{currentUser}</Text>
            {userData?.user_status === "pending" && (
              <Text style={styles.statusText}>Account Status: Pending Approval</Text>
            )}
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                const now = new Date().toISOString()
                setLastViewedAnnouncementTime(now)
                AsyncStorage.setItem("lastViewedAnnouncementTime", now)
                setShowNotifications(true)
              }}
            >
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
          </View>
        </View>

        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search users..."
              placeholderTextColor="#999"
              returnKeyType="search"
              onSubmitEditing={handleSearchSubmit}
              onFocus={() => {
                if (searchResults.length > 0) {
                  setShowSearchDropdown(true)
                }
              }}
            />
            {isSearching ? (
              <ActivityIndicator size="small" color="#666" style={styles.searchButton} />
            ) : searchText.length > 0 ? (
              <TouchableOpacity
                style={styles.searchButton}
                onPress={() => {
                  setSearchText("")
                  setSearchResults([])
                  setShowSearchDropdown(false)
                }}
              >
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.searchButton} onPress={handleSearchSubmit}>
                <Image
                  source={require("../../assets/images/search.png")}
                  style={[styles.searchIconImage, { tintColor: "#666" }]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}
          </View>

          {showSearchDropdown && searchResults.length > 0 && (
            <View style={styles.searchDropdown}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.searchDropdownScroll}
                nestedScrollEnabled={true}
              >
                {searchResults.map((user, index) => {
                  const { displayName, email, userType } = getUserDisplayInfo(user)

                  const userStatus = user.user_status || user.status || "pending"
                  const statusColor =
                    userStatus === "active" ? "#4CAF50" : userStatus === "pending" ? "#FF9800" : "#999"

                  return (
                    <TouchableOpacity
                      key={user.id}
                      style={[
                        styles.searchResultItem,
                        index === searchResults.length - 1 && styles.searchResultItemLast,
                      ]}
                      onPress={() => {
                        Keyboard.dismiss()
                        setTimeout(() => {
                          navigateToUserProfile(user.id)
                        }, 100)
                      }}
                      activeOpacity={0.7}
                    >
                      {user.profile_image ? (
                        <Image source={{ uri: user.profile_image }} style={styles.searchResultAvatar} />
                      ) : (
                        <View style={styles.searchResultAvatar}>
                          <Text style={styles.searchResultAvatarText}>{displayName.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                      <View style={styles.searchResultInfo}>
                        <View style={styles.searchResultNameRow}>
                          <Text style={styles.searchResultName}>{displayName}</Text>
                          <View style={styles.userTypeBadge}>
                            <Text style={styles.userTypeText}>
                              {userType === "kutsero"
                                ? "Kutsero"
                                : userType === "operator"
                                  ? "Operator"
                                  : userType === "vet"
                                    ? "Veterinarian"
                                    : userType === "ctu_vet"
                                      ? "CTU Vet"
                                      : userType === "dvmf_user"
                                        ? "DVMF"
                                        : "User"}
                            </Text>
                          </View>
                        </View>
                        {email && (
                          <Text style={styles.searchResultEmail} numberOfLines={1}>
                            {email}
                          </Text>
                        )}
                        <View style={styles.searchResultStatus}>
                          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                          <Text style={[styles.userStatusText, { color: statusColor }]}>{userStatus}</Text>
                        </View>
                      </View>
                      <View style={styles.searchResultArrow}>
                        <Text style={styles.searchResultArrowText}>›</Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
                <TouchableOpacity
                  style={styles.searchResultSeeAll}
                  onPress={() => {
                    Keyboard.dismiss()
                    setTimeout(() => {
                      handleSearchSubmit()
                    }, 100)
                  }}
                >
                  <Text style={styles.searchResultSeeAllText}>{`See all results for "${searchText}"`}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      <View style={styles.contentContainer}>
        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentContainer}
        >
          <View style={styles.horseSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Horse Assignment</Text>
              {isLoadingHorse && <ActivityIndicator size="small" color="#C17A47" />}
            </View>
            <View style={styles.horseCard}>
              <View style={styles.horseImageContainer}>
                <TouchableOpacity
                  onPress={() => {
                    if (selectedHorse.image && typeof selectedHorse.image === "string") {
                      setFullScreenImage(selectedHorse.image)
                    }
                  }}
                  activeOpacity={0.9}
                >
                  <Image source={{ uri: selectedHorse.image }} style={styles.horseImage} resizeMode="cover" />
                </TouchableOpacity>
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
                
                {isCheckedIn && checkInTime && (
                  <View style={styles.checkedInIndicator}>
                    <Text style={styles.checkedInIndicatorText}>✓ Checked in at {checkInTime}</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.reminderSection}>
              {selectedHorse.id !== "default" ? (
                <>
                  <Text style={styles.reminderText}>
                    {isCheckedIn 
                      ? "Remember to check-out your horse at the end of the day"
                      : "Check in to start working with your horse"}
                  </Text>

                  <View style={styles.checkInOutContainer}>
                    {!isCheckedIn ? (
                      <TouchableOpacity style={styles.checkInButton} onPress={handleCheckIn}>
                        <Text style={styles.checkInButtonText}>Check In</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.checkedInContainer}>
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

              <TouchableOpacity 
                style={[
                  styles.changeHorseButton, 
                  isCheckedIn && styles.disabledButton
                ]} 
                onPress={() => {
                  if (isCheckedIn) {
                    Alert.alert(
                      "Cannot Change Horse",
                      "You need to check out from your current horse before selecting a new one.",
                      [
                        { text: "OK", style: "default" },
                        { 
                          text: "Check Out Now", 
                          onPress: handleCheckOut,
                          style: "destructive"
                        }
                      ]
                    )
                  } else {
                    router.push("./horseselection")
                  }
                }}
                disabled={isCheckedIn}
              >
                <Text style={[
                  styles.changeHorseButtonText,
                  isCheckedIn && styles.disabledButtonText
                ]}>
                  {selectedHorse.id === "default" ? "Select Horse" : "Change Horse"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

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
              announcements.map((announcement, index) => {
                const profilePicture = getAnnouncementProfilePicture(announcement)

                return (
                  <View
                    key={announcement.id}
                    style={[styles.facebookPostCard, index < announcements.length - 1 && styles.postCardMargin]}
                  >
                    <View style={styles.postHeader}>
                      <View style={styles.postIconContainer}>
                        <View style={styles.profileImageContainer}>
                          {profilePicture ? (
                            <Image source={profilePicture} style={styles.announcementProfileImage} />
                          ) : (
                            <View style={styles.announcementIcon}>
                              <View style={styles.megaphoneBody} />
                              <View style={styles.megaphoneCone} />
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={styles.postHeaderContent}>
                        <Text style={styles.postTitle}>{announcement.announce_title || "Announcement"}</Text>
                        <Text style={styles.postTime}>{formatDate(announcement.announce_date)}</Text>
                      </View>
                    </View>

                    {announcement.image_urls && announcement.image_urls.length > 0 && (
                      <ImageCarousel images={announcement.image_urls} />
                    )}

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
                          if (announcement.id) {
                            handleComment(String(announcement.id))
                          } else {
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
                )
              })
            )}
          </View>
        </ScrollView>

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

      {/* Facebook-style Comment Modal */}
      <Modal
        visible={showCommentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowCommentModal(false)
          setSelectedAnnouncementId(null)
          setReplyingTo(null)
          setReplyText("")
        }}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardAvoidingView}
          >
            <View
              style={[
                styles.modalContainer,
                {
                  height: getModalHeight(),
                  marginTop: getModalMarginTop(),
                },
              ]}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderContent}>
                  <Text style={styles.modalTitle}>Comments</Text>
                  <Text style={styles.commentCountText}>{commentCount} comments</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setShowCommentModal(false)
                    setSelectedAnnouncementId(null)
                    setReplyingTo(null)
                    setReplyText("")
                  }}
                  style={styles.closeButtonContainer}
                >
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Comments List */}
              <ScrollView
                style={styles.commentsContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.commentsContentContainer}
              >
                {isLoadingComments ? (
                  <View style={styles.loadingCommentsContainer}>
                    <ActivityIndicator size="small" color="#C17A47" />
                    <Text style={styles.loadingCommentsText}>Loading comments...</Text>
                  </View>
                ) : selectedAnnouncementComments.length > 0 ? (
                  selectedAnnouncementComments
                    .filter((comment) => !comment.parent_comment_id)
                    .map((comment) => (
                      <View key={comment.id}>
                        {/* Main Comment */}
                        <View style={styles.commentItem}>
                          <View style={styles.commentAvatarContainer}>
                            {comment.kutsero_profile_image ? (
                              <Image
                                source={{ uri: comment.kutsero_profile_image }}
                                style={styles.commentAvatar}
                              />
                            ) : (
                              <View style={styles.commentAvatar}>
                                <Text style={styles.commentAvatarText}>
                                  {(comment.kutsero_fname || comment.kutsero_username || "A").charAt(0).toUpperCase()}
                                </Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.commentContentContainer}>
                            <View style={styles.commentBubble}>
                              <View style={styles.commentHeader}>
                                <Text style={styles.commentUserName}>
                                  {comment.kutsero_fname && comment.kutsero_lname
                                    ? `${comment.kutsero_fname} ${comment.kutsero_lname}`
                                    : comment.kutsero_username || "Anonymous User"}
                                </Text>
                                <Text style={styles.commentTime}>
                                  {new Date(comment.comment_date).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit'
                                  })}
                                </Text>
                              </View>
                              <Text style={styles.commentText}>{comment.comment_text}</Text>
                            </View>
                            <View style={styles.commentActions}>
                              <TouchableOpacity 
                                style={styles.commentActionButton}
                                onPress={() => {
                                  setReplyingTo(comment.id)
                                  setReplyText("")
                                }}
                              >
                                <Text style={styles.commentActionText}>Reply</Text>
                              </TouchableOpacity>
                              {comment.reply_count && comment.reply_count > 0 && (
                                <TouchableOpacity
                                  onPress={() => toggleReplies(comment.id)}
                                  style={styles.viewRepliesButton}
                                >
                                  <Text style={styles.viewRepliesText}>
                                    {expandedReplies.has(comment.id) ? "Hide" : "View"} {comment.reply_count}{" "}
                                    {comment.reply_count === 1 ? "reply" : "replies"}
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        </View>

                        {/* Replies */}
                        {expandedReplies.has(comment.id) && (
                          <View style={styles.repliesContainer}>
                            {isLoadingReplies[comment.id] ? (
                              <View style={styles.loadingRepliesContainer}>
                                <ActivityIndicator size="small" color="#C17A47" />
                                <Text style={styles.loadingRepliesText}>Loading replies...</Text>
                              </View>
                            ) : replies[comment.id] && replies[comment.id].length > 0 ? (
                              replies[comment.id].map((reply) => (
                                <View key={reply.id} style={styles.replyItem}>
                                  <View style={styles.replyAvatarContainer}>
                                    {reply.kutsero_profile_image ? (
                                      <Image
                                        source={{ uri: reply.kutsero_profile_image }}
                                        style={styles.replyAvatar}
                                      />
                                    ) : (
                                      <View style={styles.replyAvatar}>
                                        <Text style={styles.commentAvatarText}>
                                          {(reply.kutsero_fname || reply.kutsero_username || "A").charAt(0).toUpperCase()}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                  <View style={styles.replyContentContainer}>
                                    <View style={styles.replyBubble}>
                                      <View style={styles.commentHeader}>
                                        <Text style={styles.commentUserName}>
                                          {reply.kutsero_fname && reply.kutsero_lname
                                            ? `${reply.kutsero_fname} ${reply.kutsero_lname}`
                                            : reply.kutsero_username || "Anonymous User"}
                                        </Text>
                                        <Text style={styles.commentTime}>
                                          {new Date(reply.comment_date).toLocaleDateString('en-US', { 
                                            month: 'short', 
                                            day: 'numeric',
                                            hour: 'numeric',
                                            minute: '2-digit'
                                          })}
                                        </Text>
                                      </View>
                                      <Text style={styles.commentText}>{reply.comment_text}</Text>
                                    </View>
                                  </View>
                                </View>
                              ))
                            ) : (
                              <View style={styles.noRepliesContainer}>
                                <Text style={styles.noRepliesText}>No replies yet.</Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    ))
                ) : (
                  <View style={styles.noCommentsContainer}>
                    <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
                  </View>
                )}
              </ScrollView>

              {/* Comment Input - Fixed at bottom */}
              <View style={styles.commentInputContainer}>
                {replyingTo && (
                  <View style={styles.replyingToContainer}>
                    <View style={styles.replyingToContent}>
                      <Text style={styles.replyingToLabel}>Replying to </Text>
                      <Text style={styles.replyingToName}>
                        {selectedAnnouncementComments.find((c) => c.id === replyingTo)?.kutsero_fname ||
                          selectedAnnouncementComments.find((c) => c.id === replyingTo)?.kutsero_username ||
                          "comment"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setReplyingTo(null)
                        setReplyText("")
                      }}
                      style={styles.cancelReplyButton}
                    >
                      <Text style={styles.cancelReplyText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                <View style={styles.inputContainer}>
                  {currentUserProfileImage ? (
                    <Image source={{ uri: currentUserProfileImage }} style={styles.currentUserAvatar} />
                  ) : (
                    <View style={styles.currentUserAvatar}>
                      <Text style={styles.currentUserAvatarText}>{currentUser.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  
                  <View style={styles.textInputContainer}>
                    <TextInput
                      style={styles.commentInput}
                      value={replyingTo ? replyText : newComment}
                      onChangeText={replyingTo ? setReplyText : setNewComment}
                      placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
                      placeholderTextColor="#65676B"
                      multiline={true}
                      maxLength={500}
                      editable={!isPostingComment}
                      autoCorrect={true}
                      autoCapitalize="sentences"
                    />
                  </View>
                  
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      {
                        opacity: (replyingTo ? replyText : newComment).trim() && !isPostingComment ? 1 : 0.5,
                      },
                    ]}
                    onPress={submitComment}
                    disabled={!(replyingTo ? replyText : newComment).trim() || isPostingComment}
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
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Full Screen Image Modal for Horse */}
      <Modal
        visible={fullScreenImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullScreenImage(null)}
      >
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity style={styles.fullScreenCloseButton} onPress={() => setFullScreenImage(null)}>
            <Text style={styles.fullScreenCloseText}>✕</Text>
          </TouchableOpacity>
          {fullScreenImage && (
            <Image source={{ uri: fullScreenImage }} style={styles.fullScreenImage} resizeMode="contain" />
          )}
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
  searchWrapper: {
    position: "relative",
    zIndex: 1000,
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
  clearSearchText: {
    fontSize: moderateScale(20),
    color: "#666",
    fontWeight: "400",
  },
  searchDropdown: {
    position: "absolute",
    top: verticalScale(42),
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderRadius: scale(12),
    maxHeight: verticalScale(300),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: scale(4),
    },
    shadowOpacity: 0.15,
    shadowRadius: scale(8),
    elevation: 8,
    overflow: "hidden",
  },
  searchDropdownScroll: {
    maxHeight: verticalScale(300),
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  searchResultItemLast: {
    borderBottomWidth: 0,
  },
  searchResultAvatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "#C17A47",
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(12),
    overflow: "hidden",
  },
  searchResultAvatarText: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "white",
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(2),
    gap: scale(8),
  },
  searchResultName: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
  },
  userTypeBadge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(8),
  },
  userTypeText: {
    fontSize: moderateScale(10),
    color: "#1976D2",
    fontWeight: "600",
  },
  searchResultEmail: {
    fontSize: moderateScale(12),
    color: "#666",
    marginBottom: verticalScale(4),
  },
  searchResultStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    marginRight: scale(6),
  },
  userStatusText: {
    fontSize: moderateScale(11),
    fontWeight: "500",
    textTransform: "capitalize",
  },
  searchResultArrow: {
    marginLeft: scale(8),
  },
  searchResultArrowText: {
    fontSize: moderateScale(24),
    color: "#C17A47",
    fontWeight: "300",
  },
  searchResultSeeAll: {
    padding: scale(12),
    backgroundColor: "#F8F8F8",
    alignItems: "center",
  },
  searchResultSeeAllText: {
    fontSize: moderateScale(13),
    color: "#C17A47",
    fontWeight: "600",
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
  disabledButton: {
    backgroundColor: "#CCCCCC",
    opacity: 0.6,
  },
  changeHorseButtonText: {
    color: "white",
    fontSize: moderateScale(12),
    fontWeight: "600",
  },
  disabledButtonText: {
    color: "#666666",
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
  checkedInIndicator: {
    marginTop: verticalScale(6),
    paddingVertical: verticalScale(4),
    paddingHorizontal: scale(8),
    backgroundColor: "#E8F5E8",
    borderRadius: scale(6),
    borderLeftWidth: 3,
    borderLeftColor: "#4CAF50",
  },
  checkedInIndicatorText: {
    fontSize: moderateScale(11),
    color: "#2E7D32",
    fontWeight: "500",
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
  activitiesSection: {
    backgroundColor: "white",
    marginHorizontal: scale(16),
    marginTop: dynamicSpacing(16),
    borderRadius: scale(12),
    padding: scale(16),
  },
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
  iconContainer: {
    width: scale(14),
    height: scale(14),
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: scale(12),
    borderTopRightRadius: scale(12),
    maxHeight: height * 0.9,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: "#E4E6EA",
  },
  modalHeaderContent: {
    flex: 1,
  },
  modalTitle: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: "#1C1E21",
  },
  commentCountText: {
    fontSize: moderateScale(13),
    color: "#65676B",
    marginTop: scale(2),
  },
  closeButtonContainer: {
    padding: scale(4),
  },
  closeButton: {
    fontSize: moderateScale(20),
    color: "#65676B",
    fontWeight: "300",
  },
  commentsContainer: {
    flex: 1,
  },
  commentsContentContainer: {
    paddingVertical: scale(8),
  },
  commentItem: {
    flexDirection: "row",
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
  },
  commentAvatarContainer: {
    marginRight: scale(8),
  },
  commentAvatar: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "#C17A47",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  commentAvatarText: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "white",
  },
  commentContentContainer: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: "#F0F2F5",
    borderRadius: scale(18),
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scale(4),
  },
  commentUserName: {
    fontSize: moderateScale(13),
    fontWeight: "600",
    color: "#1C1E21",
    flex: 1,
  },
  commentTime: {
    fontSize: moderateScale(11),
    color: "#65676B",
    marginLeft: scale(8),
  },
  commentText: {
    fontSize: moderateScale(14),
    color: "#1C1E21",
    lineHeight: moderateScale(18),
  },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: scale(4),
    paddingLeft: scale(4),
  },
  commentActionButton: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
  },
  commentActionText: {
    fontSize: moderateScale(12),
    color: "#65676B",
    fontWeight: "600",
  },
  repliesContainer: {
    marginLeft: scale(40),
    marginTop: scale(4),
  },
  replyItem: {
    flexDirection: "row",
    paddingVertical: scale(6),
  },
  replyAvatarContainer: {
    marginRight: scale(8),
  },
  replyAvatar: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: "#C17A47",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  replyContentContainer: {
    flex: 1,
  },
  replyBubble: {
    backgroundColor: "#F0F2F5",
    borderRadius: scale(18),
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
  },
  loadingRepliesContainer: {
    padding: scale(12),
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: scale(8),
  },
  loadingRepliesText: {
    fontSize: moderateScale(12),
    color: "#666",
  },
  noRepliesContainer: {
    padding: scale(12),
    alignItems: "center",
  },
  noRepliesText: {
    fontSize: moderateScale(12),
    color: "#999",
  },
  commentInputContainer: {
    borderTopWidth: 1,
    borderTopColor: "#E4E6EA",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
  },
  replyingToContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: "#F0F2F5",
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(8),
    marginBottom: scale(8),
  },
  replyingToContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  replyingToLabel: {
    fontSize: moderateScale(12),
    color: "#65676B",
    fontWeight: "400",
  },
  replyingToName: {
    fontSize: moderateScale(12),
    color: "#1C1E21",
    fontWeight: "600",
  },
  cancelReplyButton: {
    padding: scale(4),
  },
  cancelReplyText: {
    fontSize: moderateScale(16),
    color: "#65676B",
    fontWeight: "300",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: scale(8),
  },
  currentUserAvatar: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "#C17A47",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  currentUserAvatarText: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "white",
  },
  textInputContainer: {
    flex: 1,
    backgroundColor: "#F0F2F5",
    borderRadius: scale(20),
    minHeight: scale(36),
    maxHeight: verticalScale(100),
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
  },
  commentInput: {
    fontSize: moderateScale(14),
    color: "#1C1E21",
    lineHeight: moderateScale(18),
    padding: 0,
    margin: 0,
  },
  submitButton: {
    backgroundColor: "#C17A47",
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(18),
    minWidth: scale(50),
    height: scale(36),
    justifyContent: "center",
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "white",
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
    padding: scale(40),
    alignItems: "center",
  },
  noCommentsText: {
    fontSize: moderateScale(14),
    color: "#999",
    textAlign: "center",
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
    marginRight: scale(12),
  },
  profileImageContainer: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#C17A47",
  },
  announcementProfileImage: {
    width: "100%",
    height: "100%",
    borderRadius: scale(25),
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
  carouselContainer: {
    width: "100%",
    height: verticalScale(200),
    position: "relative",
  },
  carouselImageContainer: {
    width: width,
    height: verticalScale(200),
  },
  carouselImage: {
    width: "100%",
    height: "100%",
  },
  paginationContainer: {
    position: "absolute",
    bottom: scale(12),
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: scale(6),
  },
  paginationDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  paginationDotActive: {
    backgroundColor: "rgba(255,255,255,0.9)",
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
  },
  imageCounter: {
    position: "absolute",
    top: scale(12),
    right: scale(12),
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(12),
  },
  imageCounterText: {
    color: "white",
    fontSize: moderateScale(12),
    fontWeight: "600",
  },
  postContent: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(16),
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
    marginTop: verticalScale(8),
    alignSelf: "flex-start",
  },
  seeMoreText: {
    color: "#1976D2",
    fontSize: moderateScale(14),
    fontWeight: "500",
  },
  viewRepliesButton: {
    paddingVertical: verticalScale(2),
  },
  viewRepliesText: {
    fontSize: moderateScale(12),
    color: "#65676B",
    fontWeight: "600",
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenImage: {
    width: "100%",
    height: "100%",
  },
  fullScreenCloseButton: {
    position: "absolute",
    top: scale(50),
    right: scale(20),
    zIndex: 10,
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenCloseText: {
    color: "white",
    fontSize: moderateScale(24),
    fontWeight: "600",
  },
})