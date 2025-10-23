// HORSE_OPERATOR/home.tsx

"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Keyboard,
  FlatList,
} from "react-native"
import { useRouter, useFocusEffect } from "expo-router"
import { FontAwesome5 } from "@expo/vector-icons"
import * as SecureStore from "expo-secure-store"
import * as Notifications from "expo-notifications"
import * as Device from "expo-device"
import Constants from "expo-constants"

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

const CARD_WIDTH = width - scale(64)
const API_BASE_URL = "http://192.168.101.2:8000/api/horse_operator"

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

const getImageUri = (imageData: any): string | null => {
  if (!imageData) return null
  if (typeof imageData === "string") {
    if (imageData.startsWith("http://") || imageData.startsWith("https://")) {
      return imageData
    }
    if (imageData.includes("/storage/")) {
      return imageData
    }
  }
  if (Array.isArray(imageData)) {
    if (imageData.length > 0) {
      return getImageUri(imageData[0])
    }
    return null
  }
  return null
}

interface UserData {
  id: string
  email: string
  profile?: {
    op_id: string
    op_fname?: string
    op_lname?: string
    op_mname?: string
    op_phone_num?: string
    op_email?: string
    first_name?: string
    last_name?: string
    middle_name?: string
    full_name?: string
    [key: string]: any
  }
  access_token: string
  refresh_token?: string
  user_status?: string
  user_role: string
}

interface Horse {
  horse_id: string
  horse_name: string
  horse_breed: string
  horse_age: number
  horse_sex: string
  horse_color: string
  horse_height?: string
  horse_weight?: string
  horse_image?: string | string[]
  horse_dob?: string
  horse_status?: string
  op_id: string
}

interface Comment {
  id: string
  text: string
  user: string
  user_id: string
  user_role: string
  user_profile?: {
    full_name: string
    first_name: string
    middle_name?: string
    last_name: string
    email?: string
    image?: string | null
  }
  time: string
  formatted_date: string
  comment_date: string
  parent_comment_id?: string
  reply_level?: number
  reply_count?: number
  has_replies?: boolean
}

interface Announcement {
  id: string
  announce_id: string
  title: string
  content: string
  date: string
  image?: string | string[]
  author: string
  user_id: string
  comment_count: number
  user_profile_image?: string | null
}

interface UserProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  user_role: string
  image?: string
  phone_num?: string
  specialization?: string
  [key: string]: any
}

export default function HorseOperatorHome() {
  const [searchText, setSearchText] = useState("")
  const [userData, setUserData] = useState<UserData | null>(null)
  const [userFirstName, setUserFirstName] = useState("User")
  const [horses, setHorses] = useState<Horse[]>([])
  const [currentHorseIndex, setCurrentHorseIndex] = useState(0)
  const [loadingHorses, setLoadingHorses] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true)
  const [comments, setComments] = useState<{ [key: string]: Comment[] }>({})
  const [replies, setReplies] = useState<{ [key: string]: Comment[] }>({})
  const [newComment, setNewComment] = useState("")
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string>("")
  const [loadingComments, setLoadingComments] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [expandedAnnouncements, setExpandedAnnouncements] = useState<Set<string>>(new Set())
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
  const [loadingReplies, setLoadingReplies] = useState<{ [key: string]: boolean }>({})
  const [expandedNestedReplies, setExpandedNestedReplies] = useState<Set<string>>(new Set())
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [loadingSearchResults, setLoadingSearchResults] = useState(false)
  const [searchMode, setSearchMode] = useState<"name" | "role" | null>(null)

  const router = useRouter()
  const [activeTab] = useState("home")
  const notificationListener = useRef<Notifications.Subscription | null>(null)
  const responseListener = useRef<Notifications.Subscription | null>(null)
  const safeArea = getSafeAreaPadding()
  const flatListRef = useRef<FlatList>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // NEW: Function to get user profile using the unified endpoint
  const getUserProfile = useCallback(async (userId: string) => {
    try {
      const storedAccessToken = await SecureStore.getItemAsync("access_token")
      if (!storedAccessToken) throw new Error("No access token found")
      
      const response = await fetch(`${API_BASE_URL}/get_user_profile/${encodeURIComponent(userId)}/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${storedAccessToken}`,
          "Content-Type": "application/json",
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.user) {
          return data.user
        }
      }
      return null
    } catch (error) {
      console.error("Error fetching user profile:", error)
      return null
    }
  }, [])

  // UPDATED: Enhanced fetchUserProfile function using the new endpoint
  const fetchUserProfile = useCallback(async (uid: string) => {
    try {
      const userProfile = await getUserProfile(uid)
      if (userProfile) {
        // Extract first name from the profile data
        const firstName = userProfile.profile?.fname || 
                         userProfile.profile?.first_name || 
                         userProfile.profile?.op_fname ||
                         userData?.profile?.op_fname || 
                         "User"
        setUserFirstName(firstName)
        
        // Update user data with the complete profile
        setUserData(prev => prev ? {
          ...prev,
          profile: {
            ...prev.profile,
            ...userProfile.profile
          }
        } : prev)
      } else {
        // Fallback to old method if new endpoint fails
        const url = `${API_BASE_URL}/get_horse_operator_profile/?user_id=${encodeURIComponent(uid)}`
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          const firstName = data?.op_fname || userData?.profile?.op_fname || "User"
          setUserFirstName(firstName)
        }
      }
    } catch (error: any) {
      console.error("Error loading user profile:", error)
      setUserFirstName(userData?.profile?.op_fname || "User")
    }
  }, [userData?.profile?.op_fname, getUserProfile])

  const getDisplayName = (comment: Comment): string => {
    if (comment.user && comment.user !== "Unknown User") {
      return comment.user
    }
    if (comment.user_profile) {
      const { first_name, last_name } = comment.user_profile
      if (first_name && last_name) {
        return `${first_name} ${last_name}`
      }
    }
    return "Anonymous User"
  }

  const getUserInitials = (comment: Comment): string => {
    const name = getDisplayName(comment)
    const parts = name.split(" ")
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "horse_operator":
        return { bg: "#E3F2FD", text: "#CD853F" }
      case "kutsero":
        return { bg: "#E8F5E9", text: "#388E3C" }
      case "veterinarian":
        return { bg: "#F3E5F5", text: "#388E3C" }
      default:
        return { bg: "#F5F5F5", text: "#666" }
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "horse_operator":
        return "Operator"
      case "kutsero":
        return "Kutsero"
      case "veterinarian":
        return "Vet"
      default:
        return "User"
    }
  }

  const getUserRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case "horse_operator":
        return { bg: "#E3F2FD", text: "#CD853F" }
      case "kutsero":
        return { bg: "#E8F5E9", text: "#CD853F" }
      case "veterinarian":
        return { bg: "#F3E5F5", text: "#10B981" }
      case "ctu_veterinarian":
        return { bg: "#FFF3E0", text: "#10B981" }
      case "dvmf":
        return { bg: "#FCE4EC", text: "#C2185B" }
      case "kutsero_president":
        return { bg: "#F1F8E9", text: "#CD853F" }
      default:
        return { bg: "#F5F5F5", text: "#666" }
    }
  }

  const formatRoleLabel = (role: string) => {
    const roleMap: { [key: string]: string } = {
      horse_operator: "Horse Operator",
      kutsero: "Kutsero",
      veterinarian: "Veterinarian",
      ctu_veterinarian: "CTU Veterinarian",
      dvmf: "DVMF",
      kutsero_president: "Kutsero President",
    }
    return roleMap[role?.toLowerCase()] || role
  }

  const getHealthStatusColor = (status?: string) => {
    if (!status) return "#9E9E9E"
    const statusLower = status.toLowerCase()
    if (statusLower.includes("healthy") || statusLower.includes("excellent") || statusLower.includes("good")) {
      return "#4CAF50"
    } else if (statusLower.includes("mild") || statusLower.includes("moderate") || statusLower.includes("monitor")) {
      return "#FF9800"
    } else if (statusLower.includes("critical") || statusLower.includes("severe") || statusLower.includes("emergency")) {
      return "#F44336"
    } else if (statusLower.includes("recovering") || statusLower.includes("stable")) {
      return "#2196F3"
    }
    return "#9E9E9E"
  }

  const formatHealthStatus = (status?: string) => {
    if (!status) return "Unknown"
    return status
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
  }

  // ✅ UPDATED: Helper function to get profile picture for announcement
  const getAnnouncementProfilePicture = (
    userName: string | undefined, 
    userProfileImage: string | null | undefined, 
    isCtuUser: boolean = false, 
    isDvmfUser: boolean = false
  ) => {
    // ✅ Priority 1: Check for CTU/DVMF logo flags from backend
    if (userProfileImage === "CTU_LOGO" || isCtuUser) {
      return require("../../assets/images/CTU.jpg")
    } else if (userProfileImage === "DVMF_LOGO" || isDvmfUser) {
      return require("../../assets/images/DVMF.png")
    }
    
    // ✅ Priority 2: Check if userProfileImage is a valid URL
    if (userProfileImage && (userProfileImage.startsWith('http://') || userProfileImage.startsWith('https://'))) {
      return { uri: userProfileImage }
    }
    
    // ✅ Priority 3: Fallback to name-based detection (for backward compatibility)
    if (userName) {
      const nameLower = userName.toLowerCase()
      if (nameLower.includes("ctu") || (nameLower.includes("vet") && nameLower.includes("ctu"))) {
        return require("../../assets/images/CTU.jpg")
      } else if (nameLower.includes("dvmf")) {
        return require("../../assets/images/DVMF.png")
      }
    }
    
    return null
  }

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

  async function registerForPushNotificationsAsync() {
    let token
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }
      if (finalStatus !== "granted") {
        Alert.alert("Permission Required", "Push notifications permission is required.")
        return
      }
      try {
        token = (
          await Notifications.getExpoPushTokenAsync({
            projectId: Constants.expoConfig?.extra?.eas?.projectId || "your-project-id",
          })
        ).data
      } catch (error) {
        console.error("Error getting push token:", error)
      }
    }
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      })
    }
    return token
  }

  const savePushToken = async (userId: string, pushToken: string) => {
    try {
      const storedAccessToken = await SecureStore.getItemAsync("access_token")
      await fetch(`${API_BASE_URL}/save_push_token/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${storedAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          push_token: pushToken,
          device_type: Platform.OS,
        }),
      })
    } catch (error) {
      console.error("Error saving push token:", error)
    }
  }

  const validateAuthToken = async (token: string): Promise<boolean> => {
    return token.length > 0
  }

  const fetchNotificationCount = useCallback(async (userId: string) => {
    try {
      const storedAccessToken = await SecureStore.getItemAsync("access_token")
      if (!storedAccessToken) return
      const response = await fetch(`${API_BASE_URL}/get_notification_count/?user_id=${encodeURIComponent(userId)}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${storedAccessToken}`,
          "Content-Type": "application/json",
        },
      })
      if (response.ok) {
        const data = await response.json()
        setNotificationCount(data.notification_count || 0)
      }
    } catch (error) {
      console.error("Error fetching notification count:", error)
    }
  }, [])

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoadingAnnouncements(true)
      const storedAccessToken = await SecureStore.getItemAsync("access_token")
      if (!storedAccessToken) throw new Error("No access token found")
      const response = await fetch(`${API_BASE_URL}/get_announcements/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${storedAccessToken}`,
          "Content-Type": "application/json",
        },
      })
      if (response.ok) {
        const data = await response.json()
        let announcementList: any[] = []
        if (data.announcements && Array.isArray(data.announcements)) {
          announcementList = data.announcements
        } else if (Array.isArray(data)) {
          announcementList = data
        }
        const formattedAnnouncements: Announcement[] = announcementList.map((announcement) => ({
          id: String(announcement.announce_id || announcement.id),
          announce_id: String(announcement.announce_id || announcement.id),
          title: announcement.announce_title || announcement.title || "Untitled",
          content: announcement.announce_content || announcement.content || "",
          date: announcement.announce_date || announcement.date || announcement.created_at || "",
          image: announcement.image_url || announcement.announce_img || null,
          author: announcement.user_name || "CTU Announcement",
          user_id: announcement.user_id || "",
          comment_count: announcement.comment_count || 0,
          user_profile_image: announcement.user_profile_image || null,
        }))
        setAnnouncements(formattedAnnouncements)
      } else {
        setAnnouncements([])
      }
    } catch (error: any) {
      console.error("Error fetching announcements:", error)
      setAnnouncements([])
    } finally {
      setLoadingAnnouncements(false)
    }
  }, [])

  const searchUsersByName = useCallback(async (query: string) => {
    try {
      setLoadingSearchResults(true)
      const storedAccessToken = await SecureStore.getItemAsync("access_token")
      if (!storedAccessToken) throw new Error("No access token found")
      const response = await fetch(
        `${API_BASE_URL}/search_users_by_name/?name=${encodeURIComponent(query)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${storedAccessToken}`,
            "Content-Type": "application/json",
          },
        }
      )
      if (response.ok) {
        const data = await response.json()
        const users = Array.isArray(data) ? data : []
        setSearchResults(users)
        setShowSearchDropdown(users.length > 0)
        setSearchMode("name")
      } else {
        setSearchResults([])
        setShowSearchDropdown(false)
      }
    } catch (error) {
      console.error("Error searching users by name:", error)
      setSearchResults([])
      setShowSearchDropdown(false)
    } finally {
      setLoadingSearchResults(false)
    }
  }, [])

  const searchUsersByRole = useCallback(async (role: string) => {
    try {
      setLoadingSearchResults(true)
      const storedAccessToken = await SecureStore.getItemAsync("access_token")
      if (!storedAccessToken) throw new Error("No access token found")
      const response = await fetch(`${API_BASE_URL}/get_users_by_role/?role=${encodeURIComponent(role)}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${storedAccessToken}`,
          "Content-Type": "application/json",
        },
      })
      if (response.ok) {
        const data = await response.json()
        const users = Array.isArray(data) ? data : data.users || []
        setSearchResults(users)
        setShowSearchDropdown(users.length > 0)
        setSearchMode("role")
      } else {
        setSearchResults([])
        setShowSearchDropdown(false)
      }
    } catch (error) {
      console.error("Error fetching users by role:", error)
      setSearchResults([])
      setShowSearchDropdown(false)
    } finally {
      setLoadingSearchResults(false)
    }
  }, [])

  const handleSearchChange = (text: string) => {
    setSearchText(text)
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    if (!text.trim()) {
      setShowSearchDropdown(false)
      setSearchResults([])
      setSearchMode(null)
      return
    }
    const roles = ["Horse Operator", "Veterinarian", "CTU Veterinarian", "DVMF", "Kutsero", "Kutsero President"]
    const matchedRole = roles.find((role) => role.toLowerCase().includes(text.toLowerCase()))
    if (matchedRole) {
      searchTimeoutRef.current = setTimeout(() => {
        searchUsersByRole(matchedRole)
      }, 300)
    } else if (text.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchUsersByName(text)
      }, 300)
    } else {
      setShowSearchDropdown(false)
      setSearchResults([])
      setSearchMode(null)
    }
  }
  

  // UPDATED: Enhanced search function to use get_user_profile
  const handleUserSelect = async (user: UserProfile) => {
    try {
      // Fetch complete user profile using the unified endpoint
      const completeProfile = await getUserProfile(user.user_id || user.id)
      
      router.push({
        pathname: "../HORSE_OPERATOR/Hallprofile",
        params: {
          userId: user.user_id || user.id,
          userData: JSON.stringify(completeProfile || user),
          userRole: user.user_role,
        },
      })
      setSearchText("")
      setShowSearchDropdown(false)
      setSearchResults([])
      setSearchMode(null)
    } catch (error) {
      console.error("Error fetching complete user profile:", error)
      // Fallback to original data if fetch fails
      router.push({
        pathname: "../HORSE_OPERATOR/Hallprofile",
        params: {
          userId: user.user_id || user.id,
          userData: JSON.stringify(user),
          userRole: user.user_role,
        },
      })
      setSearchText("")
      setShowSearchDropdown(false)
      setSearchResults([])
      setSearchMode(null)
    }
  }

  const fetchReplies = useCallback(async (commentId: string) => {
    try {
      setLoadingReplies((prev) => ({ ...prev, [commentId]: true }))
      const storedAccessToken = await SecureStore.getItemAsync("access_token")
      if (!storedAccessToken) throw new Error("No access token found")
      const response = await fetch(`${API_BASE_URL}/get_comment_replies/?comment_id=${encodeURIComponent(commentId)}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${storedAccessToken}`,
          "Content-Type": "application/json",
        },
      })
      if (response.ok) {
        const data = await response.json()
        if (data?.replies) {
          setReplies((prev) => ({
            ...prev,
            [commentId]: data.replies,
          }))
        }
      }
    } catch (error: any) {
      console.error("Error fetching replies:", error)
    } finally {
      setLoadingReplies((prev) => ({ ...prev, [commentId]: false }))
    }
  }, [])

  const fetchComments = useCallback(async (announcementId: string) => {
    try {
      setLoadingComments(true)
      const storedAccessToken = await SecureStore.getItemAsync("access_token")
      if (!storedAccessToken) throw new Error("No access token found")
      const response = await fetch(
        `${API_BASE_URL}/get_announcement_comments/?announcement_id=${encodeURIComponent(announcementId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${storedAccessToken}`,
            "Content-Type": "application/json",
          },
        },
      )
      if (response.ok) {
        const data = await response.json()
        if (data?.comments) {
          const parentComments: Comment[] = []
          const repliesMap: { [key: string]: Comment[] } = {}
          data.comments.forEach((comment: Comment) => {
            if (comment.parent_comment_id) {
              if (!repliesMap[comment.parent_comment_id]) {
                repliesMap[comment.parent_comment_id] = []
              }
              repliesMap[comment.parent_comment_id].push(comment)
            } else {
              parentComments.push(comment)
            }
          })
          setComments((prev) => ({
            ...prev,
            [announcementId]: parentComments,
          }))
          setReplies((prev) => ({
            ...prev,
            ...repliesMap,
          }))
          const commentIdsWithReplies = Object.keys(repliesMap)
          if (commentIdsWithReplies.length > 0) {
            setExpandedReplies((prev) => {
              const newExpanded = new Set(prev)
              commentIdsWithReplies.forEach((commentId) => {
                newExpanded.add(commentId)
              })
              return newExpanded
            })
          }
        }
      }
    } catch (error: any) {
      console.error("Error fetching comments:", error)
    } finally {
      setLoadingComments(false)
    }
  }, [])

  const addComment = useCallback(
    async (announcementId: string, commentText: string) => {
      if (!userData?.id) return
      try {
        setSubmittingComment(true)
        const storedAccessToken = await SecureStore.getItemAsync("access_token")
        if (!storedAccessToken) throw new Error("No access token found")
        const response = await fetch(`${API_BASE_URL}/add_comment/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${storedAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userData.id,
            announcement_id: announcementId,
            comment_text: commentText.trim(),
          }),
        })
        if (response.ok) {
          const data = await response.json()
          if (data?.comment) {
            setComments((prev) => ({
              ...prev,
              [announcementId]: [data.comment, ...(prev[announcementId] || [])],
            }))
            setAnnouncements((prev) =>
              prev.map((ann) =>
                ann.id === announcementId ? { ...ann, comment_count: (ann.comment_count || 0) + 1 } : ann,
              ),
            )
            setNewComment("")
            Alert.alert("Success", "Comment posted!")
          }
        }
      } catch (error: any) {
        console.error("Error adding comment:", error)
        Alert.alert("Error", "Failed to post comment")
      } finally {
        setSubmittingComment(false)
      }
    },
    [userData],
  )

  const addReply = useCallback(
    async (commentId: string, replyText: string) => {
      if (!userData?.id) return
      try {
        setSubmittingComment(true)
        const storedAccessToken = await SecureStore.getItemAsync("access_token")
        if (!storedAccessToken) throw new Error("No access token found")
        const response = await fetch(`${API_BASE_URL}/add_comment_reply/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${storedAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userData.id,
            comment_id: commentId,
            reply_text: replyText.trim(),
          }),
        })
        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          const textResponse = await response.text()
          console.error(`Server returned non-JSON response:`, textResponse.substring(0, 200))
          Alert.alert("Error", "Server error occurred. Please check your connection and try again.")
          return
        }
        const data = await response.json()
        if (response.ok) {
          if (data?.reply) {
            setReplies((prev) => ({
              ...prev,
              [commentId]: [data.reply, ...(prev[commentId] || [])],
            }))
            const announcementId = selectedAnnouncementId
            setComments((prev) => ({
              ...prev,
              [announcementId]:
                prev[announcementId]?.map((c) =>
                  c.id === commentId ? { ...c, reply_count: (c.reply_count || 0) + 1, has_replies: true } : c,
                ) || [],
            }))
            setReplyText("")
            setReplyingTo(null)
            setExpandedReplies((prev) => {
              const newExpanded = new Set(prev)
              newExpanded.add(commentId)
              return newExpanded
            })
            Alert.alert("Success", "Reply posted!")
          }
        } else {
          Alert.alert("Error", data.error || "Failed to post reply")
        }
      } catch (error: any) {
        console.error("Error adding reply:", error)
        if (error.message.includes("JSON Parse error")) {
          Alert.alert("Server Error", "The server returned an invalid response.")
        } else if (error.message.includes("Network request failed")) {
          Alert.alert("Network Error", "Please check your internet connection and server status.")
        } else {
          Alert.alert("Error", error.message || "Failed to post reply")
        }
      } finally {
        setSubmittingComment(false)
      }
    },
    [userData, selectedAnnouncementId],
  )

  const updateComment = useCallback(
    async (commentId: string, newText: string) => {
      if (!userData?.id) return
      try {
        setSubmittingComment(true)
        const storedAccessToken = await SecureStore.getItemAsync("access_token")
        if (!storedAccessToken) throw new Error("No access token found")
        const response = await fetch(`${API_BASE_URL}/update_comment/${commentId}/`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${storedAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userData.id,
            comment_text: newText.trim(),
          }),
        })
        if (response.ok) {
          const data = await response.json()
          if (data?.comment) {
            const announcementId = selectedAnnouncementId
            setComments((prev) => ({
              ...prev,
              [announcementId]:
                prev[announcementId]?.map((c) => (c.id === commentId ? { ...c, text: newText.trim() } : c)) || [],
            }))
            setEditingComment(null)
            setEditText("")
            Alert.alert("Success", "Comment updated!")
          }
        }
      } catch (error: any) {
        console.error("Error updating comment:", error)
        Alert.alert("Error", "Failed to update comment")
      } finally {
        setSubmittingComment(false)
      }
    },
    [userData, selectedAnnouncementId],
  )

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!userData?.id) return
      Alert.alert("Delete Comment", "Are you sure you want to delete this comment?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const storedAccessToken = await SecureStore.getItemAsync("access_token")
              if (!storedAccessToken) throw new Error("No access token found")
              const response = await fetch(`${API_BASE_URL}/delete_comment/${commentId}/`, {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${storedAccessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  user_id: userData.id,
                }),
              })
              if (response.ok) {
                const announcementId = selectedAnnouncementId
                setComments((prev) => ({
                  ...prev,
                  [announcementId]: prev[announcementId]?.filter((c) => c.id !== commentId) || [],
                }))
                setAnnouncements((prev) =>
                  prev.map((ann) =>
                    ann.id === announcementId
                      ? { ...ann, comment_count: Math.max(0, (ann.comment_count || 0) - 1) }
                      : ann,
                  ),
                )
                Alert.alert("Success", "Comment deleted!")
              }
            } catch (error: any) {
              console.error("Error deleting comment:", error)
              Alert.alert("Error", "Failed to delete comment")
            }
          },
        },
      ])
    },
    [userData, selectedAnnouncementId],
  )

  const toggleReplies = (commentId: string) => {
    const newExpanded = new Set(expandedReplies)
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId)
    } else {
      newExpanded.add(commentId)
      fetchReplies(commentId)
    }
    setExpandedReplies(newExpanded)
  }

  const toggleNestedReplies = (replyId: string) => {
    const newExpanded = new Set(expandedNestedReplies)
    if (newExpanded.has(replyId)) {
      newExpanded.delete(replyId)
    } else {
      newExpanded.add(replyId)
      fetchReplies(replyId)
    }
    setExpandedNestedReplies(newExpanded)
  }

  useEffect(() => {
    if (selectedAnnouncementId && comments[selectedAnnouncementId]) {
      const commentsWithReplies = comments[selectedAnnouncementId].filter(
        (c: Comment) => c.has_replies || (c.reply_count && c.reply_count > 0),
      )
      if (commentsWithReplies.length > 0) {
        setExpandedReplies((prev) => {
          const newExpanded = new Set(prev)
          commentsWithReplies.forEach((comment: Comment) => {
            newExpanded.add(comment.id)
          })
          return newExpanded
        })
      }
    }
  }, [selectedAnnouncementId, comments])

  const fetchAllHorses = useCallback(async (userId: string) => {
    try {
      setLoadingHorses(true)
      const storedAccessToken = await SecureStore.getItemAsync("access_token")
      if (!storedAccessToken) throw new Error("No access token found")
      const response = await fetch(`${API_BASE_URL}/get_horses/?user_id=${encodeURIComponent(userId)}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${storedAccessToken}`,
          "Content-Type": "application/json",
        },
      })
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data) && data.length > 0) {
          const sortedHorses = data.sort((a, b) => a.horse_name.localeCompare(b.horse_name))
          setHorses(sortedHorses)
          setCurrentHorseIndex(0)
        } else {
          setHorses([])
        }
      }
    } catch (error: any) {
      console.error("Error fetching horses:", error)
      setHorses([])
    } finally {
      setLoadingHorses(false)
    }
  }, [])

  // UPDATED: Enhanced loadUserData function
  const loadUserData = useCallback(async () => {
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
          user_role: parsedUserData.user_role,
        }
        setUserData(unifiedUserData)
        
        // Use the enhanced fetchUserProfile
        await fetchUserProfile(parsedUserData.id)
        await fetchAllHorses(parsedUserData.id)
        await fetchAnnouncements()
        await fetchNotificationCount(parsedUserData.id)
      }
    } catch (error) {
      console.error("Error loading user data:", error)
    }
  }, [fetchAllHorses, fetchAnnouncements, fetchNotificationCount, fetchUserProfile])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadUserData()
    setRefreshing(false)
  }, [loadUserData])

  useEffect(() => {
    const setupNotifications = async () => {
      const token = await registerForPushNotificationsAsync()
      if (token && userData?.id) {
        await savePushToken(userData.id, token)
      }
    }
    setupNotifications()
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      if (userData?.id) {
        fetchNotificationCount(userData.id)
        if (notification.request.content.data?.type === "announcement") {
          fetchAnnouncements()
        }
      }
    })
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data
      if (data.type === "announcement") router.push("/HORSE_OPERATOR/home?scrollTo=announcements" as any)
    })
    return () => {
      notificationListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [userData, router, fetchNotificationCount, fetchAnnouncements])

  useEffect(() => {
    loadUserData()
  }, [loadUserData])

  useFocusEffect(
    useCallback(() => {
      loadUserData()
    }, [loadUserData]),
  )

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await SecureStore.deleteItemAsync("access_token")
          await SecureStore.deleteItemAsync("user_data")
          router.replace("/auth/login" as any)
        },
      },
    ])
  }

  const handleHorseProfile = (horse: Horse) => {
    router.push({
      pathname: "../HORSE_OPERATOR/horseprofile",
      params: { id: horse.horse_id, horseData: JSON.stringify(horse) },
    })
  }

  const calculateAge = (dob: string): number => {
    if (!dob) return 0
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--
    return age
  }

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
    } catch {
      return dateString
    }
  }

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

  const MenuIcon = ({ color }: { color: string }) => (
    <View style={styles.iconContainer}>
      <View style={[styles.menuBar, { backgroundColor: color }]} />
      <View style={[styles.menuBar, { backgroundColor: color, marginTop: scale(3) }]} />
      <View style={[styles.menuBar, { backgroundColor: color, marginTop: scale(3) }]} />
    </View>
  )

  const TabButton = ({
    iconName,
    label,
    tabKey,
    isActive,
    onPress,
  }: {
    iconName: string
    label: string
    tabKey: string
    isActive: boolean
    onPress?: () => void
  }) => (
    <TouchableOpacity style={styles.tabButton} onPress={onPress}>
      <View style={[styles.tabIcon, isActive && styles.activeTabIcon]}>
        <FontAwesome5 name={iconName} size={scale(16)} color={isActive ? "white" : "#666"} />
      </View>
      <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>{label}</Text>
    </TouchableOpacity>
  )

  if (loadingHorses && horses.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />
        <ActivityIndicator size="large" color="white" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    )
  }

  const selectedAnnouncementComments = selectedAnnouncementId ? comments[selectedAnnouncementId] || [] : []
  const commentCount = selectedAnnouncementComments.length

  const renderComment = (comment: Comment, isReply = false) => {
    const displayName = getDisplayName(comment)
    const initials = getUserInitials(comment)
    const roleColors = getRoleBadgeColor(comment.user_role)
    const isOwnComment = userData?.id === comment.user_id
    const isEditing = editingComment === comment.id
    const hasReplies = comment.has_replies || (comment.reply_count && comment.reply_count > 0)
    const showReplies = expandedReplies.has(comment.id)
    const commentReplies = replies[comment.id] || []
    const showNestedReplies = expandedNestedReplies.has(comment.id)
    const nestedReplies = replies[comment.id] || []

    return (
      <View key={comment.id} style={[styles.commentItem, isReply && styles.replyItem]}>
        <View style={styles.commentRow}>
          <View style={styles.commentAvatar}>
            {comment.user_profile?.image ? (
              <Image
                source={{ uri: comment.user_profile.image }}
                style={styles.commentAvatarImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.commentAvatarFallback}>
                <Text style={styles.commentAvatarText}>{initials}</Text>
              </View>
            )}
          </View>
          <View style={styles.commentContent}>
            <View style={styles.commentHeader}>
              <Text style={styles.commentUser}>{displayName}</Text>
              <View style={[styles.roleBadge, { backgroundColor: roleColors.bg }]}>
                <Text style={[styles.roleBadgeText, { color: roleColors.text }]}>
                  {getRoleLabel(comment.user_role)}
                </Text>
              </View>
            </View>
            <Text style={styles.commentTime}>{comment.time}</Text>
            {isEditing ? (
              <View style={styles.editContainer}>
                <TextInput
                  style={styles.editInput}
                  value={editText}
                  onChangeText={setEditText}
                  multiline
                  autoFocus
                  placeholder="Edit your comment..."
                  placeholderTextColor="#65676B"
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.editCancelButton}
                    onPress={() => {
                      setEditingComment(null)
                      setEditText("")
                    }}
                  >
                    <Text style={styles.editCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editSaveButton, { opacity: editText.trim() ? 1 : 0.5 }]}
                    onPress={() => updateComment(comment.id, editText)}
                    disabled={!editText.trim() || submittingComment}
                  >
                    {submittingComment ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.editSaveText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.commentText}>{comment.text}</Text>
                <View style={styles.commentActions}>
                  {!isReply && (
                    <TouchableOpacity
                      style={styles.replyButton}
                      onPress={() => {
                        setReplyingTo(comment.id)
                        setReplyText("")
                      }}
                    >
                      <FontAwesome5 name="reply" size={scale(12)} color="#65676B" />
                      <Text style={styles.replyButtonText}>Reply</Text>
                    </TouchableOpacity>
                  )}
                  {isOwnComment && (
                    <>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => {
                          setEditingComment(comment.id)
                          setEditText(comment.text)
                        }}
                      >
                        <FontAwesome5 name="edit" size={scale(12)} color="#65676B" />
                        <Text style={styles.editButtonText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteButton} onPress={() => deleteComment(comment.id)}>
                        <FontAwesome5 name="trash" size={scale(12)} color="#E74C3C" />
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
                {replyingTo === comment.id && (
                  <View style={styles.replyInputContainer}>
                    <TextInput
                      style={styles.replyInput}
                      value={replyText}
                      onChangeText={setReplyText}
                      placeholder={`Reply to ${displayName}...`}
                      placeholderTextColor="#65676B"
                      multiline
                      autoFocus
                    />
                    <View style={styles.replyInputActions}>
                      <TouchableOpacity
                        style={styles.replyCancelButton}
                        onPress={() => {
                          setReplyingTo(null)
                          setReplyText("")
                        }}
                      >
                        <Text style={styles.replyCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.replySubmitButton, { opacity: replyText.trim() ? 1 : 0.5 }]}
                        onPress={() => addReply(comment.id, replyText)}
                        disabled={!replyText.trim() || submittingComment}
                      >
                        {submittingComment ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text style={styles.replySubmitText}>Reply</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                {!isReply && hasReplies && (
                  <View style={styles.viewRepliesButtonContainer}>
                    <TouchableOpacity style={styles.viewRepliesButton} onPress={() => toggleReplies(comment.id)}>
                      {loadingReplies[comment.id] ? (
                        <ActivityIndicator size="small" color="#C17A47" />
                      ) : (
                        <View style={styles.viewRepliesContent}>
                          <FontAwesome5
                            name={showReplies ? "chevron-up" : "chevron-down"}
                            size={scale(12)}
                            color="#C17A47"
                          />
                          <Text style={styles.viewRepliesText}>
                            {showReplies ? "Hide" : "View"} {comment.reply_count || 0}{" "}
                            {(comment.reply_count || 0) === 1 ? "reply" : "replies"}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
                {!isReply && showReplies && (
                  <View style={styles.repliesContainer}>
                    {commentReplies.length > 0 ? (
                      commentReplies.map((reply) => (
                        <React.Fragment key={reply.id}>{renderComment(reply, true)}</React.Fragment>
                      ))
                    ) : (
                      <View style={styles.noRepliesContainer}>
                        <Text style={styles.noRepliesText}>No replies yet</Text>
                      </View>
                    )}
                  </View>
                )}
                {isReply && hasReplies && (
                  <View style={styles.viewRepliesButtonContainer}>
                    <TouchableOpacity style={styles.viewRepliesButton} onPress={() => toggleNestedReplies(comment.id)}>
                      {loadingReplies[comment.id] ? (
                        <ActivityIndicator size="small" color="#C17A47" />
                      ) : (
                        <View style={styles.viewRepliesContent}>
                          <FontAwesome5
                            name={showNestedReplies ? "chevron-up" : "chevron-down"}
                            size={scale(12)}
                            color="#C17A47"
                          />
                          <Text style={styles.viewRepliesText}>
                            {showNestedReplies ? "Hide" : "View"} {comment.reply_count || 0}{" "}
                            {(comment.reply_count || 0) === 1 ? "reply" : "replies"}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
                {isReply && showNestedReplies && (
                  <View style={styles.nestedRepliesContainer}>
                    {nestedReplies.length > 0 ? (
                      nestedReplies.map((nestedReply) => (
                        <React.Fragment key={nestedReply.id}>{renderComment(nestedReply, true)}</React.Fragment>
                      ))
                    ) : (
                      <View style={styles.noRepliesContainer}>
                        <Text style={styles.noRepliesText}>No replies yet</Text>
                      </View>
                    )}
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />
      
      <View style={[styles.header, { paddingTop: safeArea.top }]}>
        <View style={styles.headerTop}>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome,</Text>
            <Text style={styles.userName}>{userFirstName}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={() => router.push("/HORSE_OPERATOR/Hnotif" as any)}>
              <FontAwesome5 name="bell" size={scale(18)} color="white" />
              {notificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{notificationCount > 99 ? "99+" : notificationCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.sosButton} onPress={() => router.push("/HORSE_OPERATOR/Hsos" as any)}>
              <Image source={require("../../assets/images/sos2.png")} style={styles.sosIcon} resizeMode="contain" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
              <MenuIcon color="white" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.searchContainer}>
          <FontAwesome5 name="search" size={scale(16)} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={handleSearchChange}
            placeholder="Search by name or role..."
            placeholderTextColor="#999"
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => {
                setSearchText("")
                setShowSearchDropdown(false)
                setSearchResults([])
                setSearchMode(null)
              }}
            >
              <FontAwesome5 name="times-circle" size={scale(16)} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showSearchDropdown && (
        <View style={[styles.searchDropdownOverlay, { top: safeArea.top + verticalScale(120) }]}>
          <View style={styles.searchDropdownHeader}>
            <Text style={styles.searchDropdownTitle}>
              {searchMode === "name" ? "Search Results" : searchMode === "role" ? "People" : "Results"}
            </Text>
            <Text style={styles.searchDropdownCount}>
              {searchResults.length} {searchResults.length === 1 ? "result" : "results"}
            </Text>
          </View>
          {loadingSearchResults ? (
            <View style={styles.dropdownLoadingContainer}>
              <ActivityIndicator size="small" color="#C17A47" />
              <Text style={styles.dropdownLoadingText}>Searching...</Text>
            </View>
          ) : searchResults.length > 0 ? (
            <ScrollView 
              style={styles.dropdownList} 
              nestedScrollEnabled={true} 
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              {searchResults.map((user, index) => {
                const roleColors = getUserRoleBadgeColor(user.user_role)
                const displayName = user.full_name || `${user.first_name} ${user.last_name}`.trim()
                return (
                  <TouchableOpacity
                    key={`${user.user_id || user.id}-${index}`}
                    style={styles.dropdownItem}
                    onPress={() => handleUserSelect(user)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dropdownItemContent}>
                      {user.image ? (
                        <Image source={{ uri: user.image }} style={styles.dropdownUserImage} resizeMode="cover" />
                      ) : (
                        <View style={styles.dropdownUserImageFallback}>
                          <Text style={styles.dropdownUserImageText}>
                            {user.first_name?.[0] || ""}
                            {user.last_name?.[0] || ""}
                          </Text>
                        </View>
                      )}
                      <View style={styles.dropdownUserInfo}>
                        <Text style={styles.dropdownUserName}>{displayName}</Text>
                        <Text style={styles.dropdownUserEmail}>{user.email}</Text>
                        <View style={styles.dropdownBadgesRow}>
                          <View style={[styles.dropdownRoleBadge, { backgroundColor: roleColors.bg }]}>
                            <Text style={[styles.dropdownRoleBadgeText, { color: roleColors.text }]}>
                              {formatRoleLabel(user.user_role)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <FontAwesome5 name="chevron-right" size={scale(14)} color="#999" />
                    </View>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          ) : (
            <View style={styles.dropdownEmptyContainer}>
              <FontAwesome5 name="search" size={scale(32)} color="#DDD" />
              <Text style={styles.dropdownEmptyText}>No users found</Text>
              <Text style={styles.dropdownEmptyHint}>
                Try searching by name (e.g., &quot;John&quot;) or role (e.g., &quot;Veterinarian&quot;)
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.contentContainer}>
        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.horseSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                My Horses {horses.length > 0 && `(${currentHorseIndex + 1}/${horses.length})`}
              </Text>
              <TouchableOpacity onPress={() => router.push("../HORSE_OPERATOR/horse" as any)}>
                <Text style={styles.viewAllButton}>View All</Text>
              </TouchableOpacity>
            </View>
            {loadingHorses ? (
              <ActivityIndicator size="large" color="#C17A47" style={{ marginVertical: 20 }} />
            ) : horses.length > 0 ? (
              <>
                <FlatList
                  ref={flatListRef}
                  data={horses}
                  renderItem={({ item, index }) => {
                    const healthStatusColor = getHealthStatusColor(item.horse_status)
                    const healthStatusText = formatHealthStatus(item.horse_status)
                    return (
                      <View style={[styles.horseCardContainer, { marginLeft: index === 0 ? 0 : scale(16) }]}>
                        <View style={styles.horseCard}>
                          <View style={styles.horseImageContainer}>
                            <Image
                              source={{ uri: getImageUri(item.horse_image) || "https://via.placeholder.com/150" }}
                              style={styles.horseImage}
                              resizeMode="cover"
                            />
                          </View>
                          <View style={styles.horseInfo}>
                            <Text style={styles.horseNameText}>
                              <Text style={styles.horseLabel}>Name: </Text>
                              <Text style={styles.horseValue}>{item.horse_name}</Text>
                            </Text>
                            <View style={styles.healthRow}>
                              <Text style={styles.horseBreedText}></Text>
                              <Text style={styles.horseLabel}>Breed: </Text>
                              <Text style={styles.horseValue}>{item.horse_breed}</Text>
                            </View>
                            <View style={styles.healthRow}>
                              <Text style={styles.horseAgeText}></Text>
                              <Text style={styles.horseLabel}>Age: </Text>
                              <Text style={styles.horseValue}>
                                {item.horse_dob ? calculateAge(item.horse_dob) : item.horse_age} years
                              </Text>
                            </View>
                            <View style={styles.healthRow}>
                              <Text style={styles.horseLabel}>Health Status: </Text>
                              <View style={[styles.healthDot, { backgroundColor: healthStatusColor }]} />
                              <Text style={[styles.healthText, { color: healthStatusColor }]}>{healthStatusText}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    )
                  }}
                  keyExtractor={(item) => item.horse_id}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  snapToAlignment="start"
                  onMomentumScrollEnd={(e) => {
                    const contentOffsetX = e.nativeEvent.contentOffset.x
                    const index = Math.round(contentOffsetX / (CARD_WIDTH + scale(16)))
                    setCurrentHorseIndex(index)
                  }}
                  snapToInterval={CARD_WIDTH + scale(16)}
                  decelerationRate="fast"
                  scrollEventThrottle={16}
                  getItemLayout={(data, index) => ({
                    length: CARD_WIDTH + scale(16),
                    offset: (CARD_WIDTH + scale(16)) * index,
                    index,
                  })}
                />
                {horses.length > 1 && (
                  <View style={styles.paginationContainer}>
                    {horses.map((_, index) => (
                      <View
                        key={index}
                        style={[styles.paginationDot, index === currentHorseIndex && styles.paginationDotActive]}
                      />
                    ))}
                  </View>
                )}
                <TouchableOpacity
                  style={styles.viewProfileButton}
                  onPress={() => handleHorseProfile(horses[currentHorseIndex])}
                >
                  <Text style={styles.viewProfileButtonText}>View Full Profile</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.noHorseContainer}>
                <Text style={styles.noHorseText}>No horses registered yet</Text>
                <TouchableOpacity
                  style={styles.addHorseButton}
                  onPress={() => router.push("../HORSE_OPERATOR/horse" as any)}
                >
                  <Text style={styles.addHorseButtonText}>Add Horse</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          <View style={styles.activitiesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Announcements</Text>
              {loadingAnnouncements && <ActivityIndicator size="small" color="#C17A47" />}
            </View>
            {announcements.length === 0 && !loadingAnnouncements ? (
              <View style={styles.noAnnouncementsContainer}>
                <Text style={styles.noAnnouncementsText}>No announcements available at this time.</Text>
              </View>
            ) : (
              announcements.map((announcement, index) => {
                const imageUrl = getImageUri(announcement.image)
                const { text, showToggle } = getTruncatedContent(announcement.content, announcement.id)
                const profilePicture = getAnnouncementProfilePicture(
                  announcement.author, 
                  announcement.user_profile_image
                )
                const userProfileImage = announcement.user_profile_image
                
                return (
                  <View
                    key={announcement.id}
                    style={[styles.facebookPostCard, index < announcements.length - 1 && styles.postCardMargin]}
                  >
                    <View style={styles.postHeader}>
                      <View style={styles.postIconContainer}>
                        {userProfileImage ? (
                          <Image 
                            source={{ uri: userProfileImage }} 
                            style={{ width: scale(40), height: scale(40), borderRadius: scale(20) }}
                            resizeMode="cover"
                          />
                        ) : profilePicture ? (
                          <Image 
                            source={profilePicture} 
                            style={{ width: scale(40), height: scale(40), borderRadius: scale(20) }}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.announcementIcon}>
                            <View style={styles.megaphoneBody} />
                            <View style={styles.megaphoneCone} />
                          </View>
                        )}
                      </View>
                      <View style={styles.postHeaderContent}>
                        <Text style={styles.postTitle}>{announcement.author}</Text>
                        <Text style={styles.postTime}>{formatDate(announcement.date)}</Text>
                      </View>
                    </View>
                    {imageUrl && (
                      <View style={styles.postImageContainer}>
                        <Image source={{ uri: imageUrl }} style={styles.postImage} resizeMode="cover" />
                      </View>
                    )}
                    <View style={styles.postContent}>
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
                    </View>
                    <View style={styles.postActions}>
                      <TouchableOpacity
                        style={styles.commentButton}
                        onPress={() => {
                          if (announcement.id) {
                            setReplies({})
                            setExpandedReplies(new Set())
                            setExpandedNestedReplies(new Set())
                            setReplyingTo(null)
                            setEditingComment(null)
                            setNewComment("")
                            setSelectedAnnouncementId(String(announcement.id))
                            setShowCommentModal(true)
                            setTimeout(() => {
                              fetchComments(String(announcement.id))
                            }, 100)
                          }
                        }}
                      >
                        <FontAwesome5
                          name="comment"
                          size={scale(16)}
                          color="#8E8E93"
                          style={{ marginRight: scale(8) }}
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
          <TabButton iconName="home" label="Home" tabKey="home" isActive={activeTab === "home"} />
          <TabButton
            iconName="horse"
            label="Horses"
            tabKey="horses"
            isActive={activeTab === "horses"}
            onPress={() => router.push("../HORSE_OPERATOR/horse" as any)}
          />
          <TabButton
            iconName="comment-dots"
            label="Chat"
            tabKey="messages"
            isActive={activeTab === "messages"}
            onPress={() => router.push("../HORSE_OPERATOR/Hmessage" as any)}
          />
          <TabButton
            iconName="calendar-alt"
            label="Calendar"
            tabKey="bookings"
            isActive={activeTab === "bookings"}
            onPress={() => router.push("../HORSE_OPERATOR/Hcalendar" as any)}
          />
          <TabButton
            iconName="user"
            label="Profile"
            tabKey="profile"
            isActive={activeTab === "profile"}
            onPress={() => router.push("../HORSE_OPERATOR/profile" as any)}
          />
        </View>
      </View>
      
      <Modal
        visible={showCommentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowCommentModal(false)
          setSelectedAnnouncementId("")
          setReplyingTo(null)
          setEditingComment(null)
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
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <FontAwesome5 name="comments" size={scale(20)} color="#C17A47" />
                  <Text style={styles.modalTitle}>Comments ({commentCount})</Text>
                </View>
                <View style={styles.modalHeaderRight}>
                  <TouchableOpacity
                    onPress={() => {
                      setReplies({})
                      setExpandedReplies(new Set())
                      setExpandedNestedReplies(new Set())
                      setComments((prev) => ({
                        ...prev,
                        [selectedAnnouncementId]: [],
                      }))
                      fetchComments(selectedAnnouncementId)
                    }}
                    style={styles.refreshButton}
                  >
                    <FontAwesome5 name="sync-alt" size={scale(16)} color="#C17A47" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setShowCommentModal(false)
                      setSelectedAnnouncementId("")
                      setReplyingTo(null)
                      setEditingComment(null)
                      setReplies({})
                      setExpandedReplies(new Set())
                      setExpandedNestedReplies(new Set())
                    }}
                    style={styles.closeButtonContainer}
                  >
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <ScrollView
                style={styles.commentsContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
              >
                {loadingComments ? (
                  <View style={styles.loadingCommentsContainer}>
                    <ActivityIndicator size="small" color="#C17A47" />
                    <Text style={styles.loadingCommentsText}>Loading comments...</Text>
                  </View>
                ) : selectedAnnouncementComments.length > 0 ? (
                  selectedAnnouncementComments.map((comment) => (
                    <React.Fragment key={comment.id}>{renderComment(comment)}</React.Fragment>
                  ))
                ) : (
                  <View style={styles.noCommentsContainer}>
                    <FontAwesome5 name="comment-slash" size={scale(48)} color="#DDD" />
                    <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
                  </View>
                )}
              </ScrollView>
              <View style={styles.commentInputContainer}>
                <View style={styles.commentInputRow}>
                  <View style={styles.currentUserAvatar}>
                    <View style={styles.currentUserAvatarFallback}>
                      <FontAwesome5 name="user" size={scale(16)} color="white" />
                    </View>
                  </View>
                  <View style={styles.inputButtonWrapper}>
                    <View style={styles.commentInputWrapper}>
                      <TextInput
                        style={styles.commentInput}
                        value={newComment}
                        onChangeText={setNewComment}
                        placeholder="Write a comment..."
                        placeholderTextColor="#65676B"
                        multiline={true}
                        maxLength={500}
                        editable={!submittingComment}
                        autoCorrect={true}
                        autoCapitalize="sentences"
                        returnKeyType="default"
                        blurOnSubmit={false}
                        textAlignVertical="center"
                        selectionColor="#C17A47"
                      />
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.submitButton,
                        {
                          opacity: newComment.trim() && !submittingComment ? 1 : 0.5,
                          backgroundColor: newComment.trim() && !submittingComment ? "#C17A47" : "#E4E6EA",
                        },
                      ]}
                      onPress={() => addComment(selectedAnnouncementId, newComment)}
                      disabled={!newComment.trim() || submittingComment}
                    >
                      {submittingComment ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <FontAwesome5
                          name="paper-plane"
                          size={scale(16)}
                          color={newComment.trim() && !submittingComment ? "white" : "#65676B"}
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.characterCountContainer}>
                  <Text style={[styles.characterCount, { color: newComment.length > 450 ? "#FF3B30" : "#8E8E93" }]}>
                    {newComment.length}/500
                  </Text>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#C17A47" },
  loadingContainer: { justifyContent: "center", alignItems: "center" },
  loadingText: { color: "white", fontSize: moderateScale(16), fontWeight: "500", marginTop: verticalScale(10) },
  header: { backgroundColor: "#C17A47", paddingHorizontal: scale(16), paddingBottom: dynamicSpacing(16) },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: verticalScale(16) },
  welcomeSection: { flex: 1 },
  welcomeText: { fontSize: moderateScale(14), color: "white", fontWeight: "400", marginBottom: verticalScale(2) },
  userName: { fontSize: moderateScale(20), fontWeight: "bold", color: "white" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: scale(10) },
  headerButton: { width: scale(32), height: scale(32), borderRadius: scale(16), backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", position: "relative" },
  notificationBadge: { position: "absolute", top: scale(-2), right: scale(-2), backgroundColor: "#FF4444", borderRadius: scale(8), paddingHorizontal: scale(4), paddingVertical: scale(1), minWidth: scale(16), alignItems: "center", justifyContent: "center" },
  notificationBadgeText: { color: "white", fontSize: moderateScale(9), fontWeight: "bold" },
  sosButton: { width: scale(32), height: scale(32), borderRadius: scale(16), backgroundColor: "#FF4444", justifyContent: "center", alignItems: "center" },
  sosIcon: { width: scale(20), height: scale(20) },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: scale(20), paddingHorizontal: scale(12), height: verticalScale(40), minHeight: 40 },
  searchIcon: { marginRight: scale(8) },
  searchInput: { flex: 1, fontSize: moderateScale(14), color: "#333", paddingVertical: 0 },
  clearSearchButton: { padding: scale(4), marginLeft: scale(4) },
  searchDropdownOverlay: { position: 'absolute', left: scale(16), right: scale(16), backgroundColor: "white", borderRadius: scale(12), maxHeight: height * 0.5, shadowColor: "#000", shadowOffset: { width: 0, height: scale(4) }, shadowOpacity: 0.15, shadowRadius: scale(8), elevation: 10, zIndex: 9999, overflow: 'hidden', },
  searchDropdownHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: scale(16), paddingVertical: verticalScale(12), borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  searchDropdownTitle: { fontSize: moderateScale(14), fontWeight: "600", color: "#333" },
  searchDropdownCount: { fontSize: moderateScale(12), color: "#666" },
  dropdownList: { maxHeight: height * 0.4, },
  dropdownItem: { paddingHorizontal: scale(12), paddingVertical: verticalScale(12), borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  dropdownItemContent: { flexDirection: "row", alignItems: "center", gap: scale(12) },
  dropdownUserImage: { width: scale(40), height: scale(40), borderRadius: scale(20) },
  dropdownUserImageFallback: { width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: "#C17A47", justifyContent: "center", alignItems: "center" },
  dropdownUserImageText: { color: "white", fontSize: moderateScale(12), fontWeight: "bold" },
  dropdownUserInfo: { flex: 1 },
  dropdownUserName: { fontSize: moderateScale(14), fontWeight: "600", color: "#333", marginBottom: verticalScale(2) },
  dropdownUserEmail: { fontSize: moderateScale(12), color: "#666", marginBottom: verticalScale(4) },
  dropdownBadgesRow: { flexDirection: "row", alignItems: "center", gap: scale(6), flexWrap: "wrap" },
  dropdownRoleBadge: { paddingHorizontal: scale(8), paddingVertical: scale(2), borderRadius: scale(12) },
  dropdownRoleBadgeText: { fontSize: moderateScale(10), fontWeight: "600" },
  dropdownLoadingContainer: { paddingVertical: verticalScale(20), alignItems: "center", gap: scale(8) },
  dropdownLoadingText: { fontSize: moderateScale(12), color: "#666" },
  dropdownEmptyContainer: { paddingVertical: verticalScale(40), alignItems: "center" },
  dropdownEmptyText: { fontSize: moderateScale(14), color: "#999", marginTop: verticalScale(12), fontWeight: "500" },
  dropdownEmptyHint: { fontSize: moderateScale(12), color: "#BBB", marginTop: verticalScale(6), textAlign: "center", paddingHorizontal: scale(20) },
  contentContainer: { flex: 1, backgroundColor: "#F5F5F5" },
  scrollContent: { flex: 1 },
  scrollContentContainer: { paddingBottom: verticalScale(100) },
  horseSection: { backgroundColor: "white", marginHorizontal: scale(16), marginTop: dynamicSpacing(16), borderRadius: scale(12), padding: scale(16) },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: verticalScale(12) },
  sectionTitle: { fontSize: moderateScale(16), fontWeight: "600", color: "#333" },
  viewAllButton: { fontSize: moderateScale(12), color: "#C17A47", fontWeight: "600" },
  horseCardContainer: { width: CARD_WIDTH },
  horseCard: { flexDirection: "row", alignItems: "flex-start", marginBottom: verticalScale(12), width: "100%" },
  horseImageContainer: { marginRight: scale(12) },
  horseImage: { width: scale(96), height: scale(96), borderRadius: scale(8), backgroundColor: "#f0f0f0" },
  horseInfo: { flex: 1 },
  horseNameText: { fontSize: moderateScale(14), marginBottom: verticalScale(4) },
  horseBreedText: { fontSize: moderateScale(14), marginBottom: verticalScale(4) },
  horseAgeText: { fontSize: moderateScale(14), marginBottom: verticalScale(4) },
  horseLabel: { color: "#666", fontWeight: "400" },
  horseValue: { color: "#333", fontWeight: "600" },
  healthRow: { flexDirection: "row", alignItems: "center", fontSize: moderateScale(14), marginBottom: verticalScale(4) },
  healthDot: { width: scale(6), height: scale(6), borderRadius: scale(3), marginLeft: scale(4), marginRight: scale(6) },
  healthText: { fontSize: moderateScale(12), fontWeight: "500" },
  paginationContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: verticalScale(12), gap: scale(8) },
  paginationDot: { width: scale(8), height: scale(8), borderRadius: scale(4), backgroundColor: "#D1D5DB" },
  paginationDotActive: { width: scale(24), backgroundColor: "#C17A47", borderRadius: scale(4) },
  viewProfileButton: { backgroundColor: "#C17A47", paddingHorizontal: scale(16), paddingVertical: verticalScale(10), borderRadius: scale(8), alignItems: "center", marginTop: verticalScale(8), minHeight: 40 },
  viewProfileButtonText: { color: "white", fontSize: moderateScale(12), fontWeight: "600" },
  noHorseContainer: { alignItems: "center", paddingVertical: verticalScale(20) },
  noHorseText: { fontSize: moderateScale(14), color: "#666", marginBottom: verticalScale(12), textAlign: "center" },
  addHorseButton: { backgroundColor: "#C17A47", paddingHorizontal: scale(20), paddingVertical: verticalScale(10), borderRadius: scale(8) },
  addHorseButtonText: { color: "white", fontSize: moderateScale(12), fontWeight: "600" },
  activitiesSection: { backgroundColor: "white", marginHorizontal: scale(16), marginTop: dynamicSpacing(16), borderRadius: scale(12), padding: scale(16) },
  noAnnouncementsContainer: { padding: scale(20), alignItems: "center" },
  noAnnouncementsText: { fontSize: moderateScale(14), color: "#999", textAlign: "center" },
  facebookPostCard: { backgroundColor: "#FFFFFF", borderRadius: scale(12), shadowColor: "#000", shadowOffset: { width: 0, height: scale(2) }, shadowOpacity: 0.1, shadowRadius: scale(4), elevation: 3, overflow: "hidden" },
  postCardMargin: { marginBottom: scale(16) },
  postHeader: { flexDirection: "row", alignItems: "center", padding: scale(16), paddingBottom: scale(12) },
  postIconContainer: { width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: "#E3F2FD", justifyContent: "center", alignItems: "center", marginRight: scale(12), overflow: "hidden" },
  announcementIcon: { width: scale(16), height: scale(12), position: "relative" },
  megaphoneBody: { width: scale(8), height: scale(8), backgroundColor: "#2196F3", borderRadius: scale(2), position: "absolute", left: 0, top: scale(2) },
  megaphoneCone: { width: 0, height: 0, borderTopWidth: scale(6), borderBottomWidth: scale(6), borderLeftWidth: scale(8), borderTopColor: "transparent", borderBottomColor: "transparent", borderLeftColor: "#2196F3", position: "absolute", right: 0, top: 0 },
  postHeaderContent: { flex: 1 },
  postTitle: { fontSize: moderateScale(16), fontWeight: "600", color: "#1C1C1E", marginBottom: scale(2) },
  postTime: { fontSize: moderateScale(13), color: "#8E8E93" },
  postImageContainer: { width: "100%", height: verticalScale(200), backgroundColor: "#F0F0F0", overflow: "hidden" },
  postImage: { width: "100%", height: "100%" },
  postContent: { paddingHorizontal: scale(16), paddingTop: scale(12), paddingBottom: scale(16) },
  postDescription: { fontSize: moderateScale(15), color: "#1C1C1E", lineHeight: moderateScale(22) },
  seeMoreButton: { marginTop: verticalScale(8), alignSelf: "flex-start" },
  seeMoreText: { color: "#C17A47", fontSize: moderateScale(14), fontWeight: "500" },
  postActions: { borderTopWidth: 1, borderTopColor: "#F2F2F7", paddingHorizontal: scale(16), paddingVertical: scale(12) },
  commentButton: { flexDirection: "row", alignItems: "center", paddingVertical: scale(8) },
  commentCount: { fontSize: moderateScale(14), color: "#8E8E93", fontWeight: "500" },
  tabBar: { flexDirection: "row", backgroundColor: "white", paddingVertical: dynamicSpacing(8), paddingHorizontal: scale(8), borderTopWidth: 1, borderTopColor: "#E0E0E0", minHeight: verticalScale(60), alignItems: "center", justifyContent: "space-around" },
  tabButton: { flex: 1, alignItems: "center", paddingVertical: verticalScale(4), paddingHorizontal: scale(2) },
  tabIcon: { width: scale(28), height: scale(28), borderRadius: scale(14), justifyContent: "center", alignItems: "center", marginBottom: verticalScale(2) },
  activeTabIcon: { backgroundColor: "#C17A47" },
  tabLabel: { fontSize: moderateScale(9), color: "#666", textAlign: "center" },
  activeTabLabel: { color: "#C17A47", fontWeight: "600" },
  iconContainer: { width: scale(14), height: scale(14), justifyContent: "center", alignItems: "center", position: "relative" },
  menuBar: { width: scale(10), height: scale(1.5) },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  keyboardAvoidingView: { flex: 1, justifyContent: "flex-end" },
  modalContainer: { backgroundColor: "white", borderTopLeftRadius: scale(20), borderTopRightRadius: scale(20), paddingTop: verticalScale(20), maxHeight: height * 0.9 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: scale(20), paddingBottom: verticalScale(16), borderBottomWidth: 1, borderBottomColor: "#E0E0E0" },
  modalHeaderLeft: { flexDirection: "row", alignItems: "center", gap: scale(10) },
  modalHeaderRight: { flexDirection: "row", alignItems: "center", gap: scale(10) },
  refreshButton: { width: scale(32), height: scale(32), borderRadius: scale(16), backgroundColor: "#F5F5F5", justifyContent: "center", alignItems: "center" },
  modalTitle: { fontSize: moderateScale(18), fontWeight: "600", color: "#333" },
  closeButtonContainer: { width: scale(32), height: scale(32), borderRadius: scale(16), backgroundColor: "#F5F5F5", justifyContent: "center", alignItems: "center" },
  closeButton: { fontSize: moderateScale(20), color: "#666", fontWeight: "bold" },
  commentsContainer: { flex: 1, paddingHorizontal: scale(20), maxHeight: height * 0.5 },
  commentItem: { paddingVertical: verticalScale(12), borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  replyItem: { marginLeft: scale(40), borderLeftWidth: 2, borderLeftColor: "#E0E0E0", paddingLeft: scale(12) },
  commentRow: { flexDirection: "row", alignItems: "flex-start", gap: scale(12) },
  commentAvatar: { width: scale(40), height: scale(40), borderRadius: scale(20), overflow: "hidden", borderWidth: 2, borderColor: "#FFE0B2" },
  commentAvatarImage: { width: "100%", height: "100%" },
  commentAvatarFallback: { width: "100%", height: "100%", backgroundColor: "#C17A47", justifyContent: "center", alignItems: "center" },
  commentAvatarText: { color: "white", fontSize: moderateScale(14), fontWeight: "bold" },
  commentContent: { flex: 1, backgroundColor: "#F8F8F8", borderRadius: scale(12), padding: scale(12) },
  commentHeader: { flexDirection: "row", alignItems: "center", marginBottom: verticalScale(4), flexWrap: "wrap", gap: scale(6) },
  commentUser: { fontSize: moderateScale(14), fontWeight: "600", color: "#333" },
  roleBadge: { paddingHorizontal: scale(8), paddingVertical: scale(2), borderRadius: scale(12) },
  roleBadgeText: { fontSize: moderateScale(10), fontWeight: "600" },
  commentTime: { fontSize: moderateScale(11), color: "#999", marginBottom: verticalScale(6) },
  commentText: { fontSize: moderateScale(13), color: "#666", lineHeight: moderateScale(18) },
  commentActions: { flexDirection: "row", alignItems: "center", marginTop: verticalScale(8), gap: scale(16) },
  replyButton: { flexDirection: "row", alignItems: "center", gap: scale(4) },
  replyButtonText: { fontSize: moderateScale(12), color: "#65676B", fontWeight: "500" },
  editButton: { flexDirection: "row", alignItems: "center", gap: scale(4) },
  editButtonText: { fontSize: moderateScale(12), color: "#65676B", fontWeight: "500" },
  deleteButton: { flexDirection: "row", alignItems: "center", gap: scale(4) },
  deleteButtonText: { fontSize: moderateScale(12), color: "#E74C3C", fontWeight: "500" },
  editContainer: { marginTop: verticalScale(8) },
  editInput: { backgroundColor: "white", borderRadius: scale(8), padding: scale(12), fontSize: moderateScale(13), color: "#333", borderWidth: 1, borderColor: "#E0E0E0", minHeight: verticalScale(60), textAlignVertical: "top" },
  editActions: { flexDirection: "row", justifyContent: "flex-end", gap: scale(8), marginTop: verticalScale(8) },
  editCancelButton: { paddingHorizontal: scale(16), paddingVertical: verticalScale(8), borderRadius: scale(6), backgroundColor: "#F0F0F0" },
  editCancelText: { fontSize: moderateScale(12), color: "#666", fontWeight: "600" },
  editSaveButton: { paddingHorizontal: scale(16), paddingVertical: verticalScale(8), borderRadius: scale(6), backgroundColor: "#C17A47" },
  editSaveText: { fontSize: moderateScale(12), color: "white", fontWeight: "600" },
  replyInputContainer: { marginTop: verticalScale(8), backgroundColor: "white", borderRadius: scale(8), padding: scale(12), borderWidth: 1, borderColor: "#E0E0E0" },
  replyInput: { fontSize: moderateScale(13), color: "#333", minHeight: verticalScale(40), textAlignVertical: "top" },
  replyInputActions: { flexDirection: "row", justifyContent: "flex-end", gap: scale(8), marginTop: verticalScale(8) },
  replyCancelButton: { paddingHorizontal: scale(16), paddingVertical: verticalScale(6), borderRadius: scale(6), backgroundColor: "#F0F0F0" },
  replyCancelText: { fontSize: moderateScale(12), color: "#666", fontWeight: "600" },
  replySubmitButton: { paddingHorizontal: scale(16), paddingVertical: verticalScale(6), borderRadius: scale(6), backgroundColor: "#C17A47" },
  replySubmitText: { fontSize: moderateScale(12), color: "white", fontWeight: "600" },
  viewRepliesButtonContainer: { marginTop: verticalScale(8) },
  viewRepliesButton: { flexDirection: "row", alignItems: "center", paddingVertical: verticalScale(6) },
  viewRepliesContent: { flexDirection: "row", alignItems: "center", gap: scale(6) },
  viewRepliesText: { fontSize: moderateScale(12), color: "#C17A47", fontWeight: "500" },
  repliesContainer: { marginTop: verticalScale(12) },
  nestedRepliesContainer: { marginTop: verticalScale(12), marginLeft: scale(16) },
  noRepliesContainer: { padding: scale(12), alignItems: "center" },
  noRepliesText: { fontSize: moderateScale(12), color: "#999", fontStyle: "italic" },
  loadingCommentsContainer: { padding: scale(20), alignItems: "center", flexDirection: "row", justifyContent: "center", gap: scale(10) },
  loadingCommentsText: { fontSize: moderateScale(12), color: "#666" },
  noCommentsContainer: { padding: scale(40), alignItems: "center", justifyContent: "center" },
  noCommentsText: { fontSize: moderateScale(14), color: "#999", textAlign: "center", marginTop: verticalScale(12) },
  commentInputContainer: { borderTopWidth: 1, borderTopColor: "#E4E6EA", backgroundColor: "#FFFFFF", paddingHorizontal: scale(12), paddingTop: scale(12), paddingBottom: scale(12) },
  commentInputRow: { flexDirection: "row", alignItems: "flex-end", gap: scale(12) },
  currentUserAvatar: { width: scale(40), height: scale(40), borderRadius: scale(20), overflow: "hidden", borderWidth: 2, borderColor: "#FFE0B2" },
  currentUserAvatarFallback: { width: "100%", height: "100%", backgroundColor: "#C17A47", justifyContent: "center", alignItems: "center" },
  inputButtonWrapper: { flex: 1, flexDirection: "row", alignItems: "flex-end", gap: scale(8) },
  commentInputWrapper: { flex: 1, backgroundColor: "#F0F2F5", borderRadius: scale(20), minHeight: scale(40), maxHeight: verticalScale(100), justifyContent: "center", paddingHorizontal: scale(14), paddingVertical: scale(10) },
  commentInput: { fontSize: moderateScale(14), color: "#1C1E21", lineHeight: moderateScale(18), paddingVertical: 0, paddingHorizontal: 0, margin: 0, backgroundColor: "transparent", textAlignVertical: "center" },
  submitButton: { width: scale(40), height: scale(40), borderRadius: scale(20), justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: scale(2) }, shadowOpacity: 0.1, shadowRadius: scale(4), elevation: 3 },
  characterCountContainer: { marginTop: verticalScale(6), alignItems: "flex-end", paddingRight: scale(4) },
  characterCount: { fontSize: moderateScale(11) },
})