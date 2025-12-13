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
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as Notifications from 'expo-notifications'

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
const API_BASE_URL = "http://192.168.31.58:8000/api/horse_operator"

// Configure notifications handler with proper NotificationBehavior type
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
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
  comment_text?: string
  user: string
  user_id: string
  user_role: string
  user_profile?: {
    full_name?: string
    first_name?: string
    middle_name?: string
    last_name?: string
    email?: string
    image?: string | null
  }
  time: string
  formatted_date: string
  comment_date: string
  parent_comment_id?: string | null
  reply_level?: number
  reply_count?: number
  has_replies?: boolean
  is_reply?: boolean
  announcement_id?: string
}

interface Announcement {
  id: string
  announce_id: string
  title: string
  content: string
  date: string
  created_at?: string
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
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
  const [loadingReplies, setLoadingReplies] = useState<{ [key: string]: boolean }>({})
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [loadingSearchResults, setLoadingSearchResults] = useState(false)
  const [searchMode, setSearchMode] = useState<"name" | "role" | null>(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [lastViewedAnnouncementTime, setLastViewedAnnouncementTime] = useState<string | null>(null)

  const router = useRouter()
  const [activeTab] = useState("home")
  const safeArea = getSafeAreaPadding()
  const flatListRef = useRef<FlatList>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Request notification permissions
  const requestNotificationPermissions = useCallback(async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        console.log('Notification permissions granted');
        return true;
      } else {
        console.log('Notification permissions denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }, []);

  // Schedule announcement notification
  const scheduleAnnouncementNotification = useCallback(async (announcement: Announcement) => {
    try {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        console.log('No notification permission, skipping announcement notification');
        return;
      }

      // Schedule notification immediately
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "📢 New Announcement",
          body: `${announcement.title}`,
          data: { 
            type: 'announcement',
            announcementId: announcement.id,
            screen: 'home'
          },
          sound: 'default',
        },
        trigger: null, // Show immediately
      });

      console.log('✅ Scheduled announcement notification:', announcement.title);
    } catch (error) {
      console.error('Error scheduling announcement notification:', error);
    }
  }, [requestNotificationPermissions]);

  // Schedule reply notification - ONLY for replies to MY comments
  const scheduleReplyNotification = useCallback(async (parentComment: Comment, replyAuthor: string, replyText: string) => {
    try {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        console.log('No notification permission, skipping reply notification');
        return;
      }

      // Don't send notification if the current user is the one who replied
      if (userData && replyAuthor === userFirstName) {
        console.log('Skipping notification for own reply');
        return;
      }

      // Don't send notification if the parent comment is not from the current user
      if (parentComment.user_id !== userData?.id) {
        console.log('Skipping notification - replying to someone else\'s comment');
        return;
      }

      // Schedule notification immediately
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "↩️ New Reply",
          body: `${replyAuthor} replied to your comment`,
          data: { 
            type: 'reply',
            commentId: parentComment.id,
            replyAuthor: replyAuthor,
            screen: 'home'
          },
          sound: 'default',
        },
        trigger: null, // Show immediately
      });

      console.log('✅ Scheduled reply notification from:', replyAuthor, 'to my comment');
    } catch (error) {
      console.error('Error scheduling reply notification:', error);
    }
  }, [requestNotificationPermissions, userData, userFirstName]);

  // Check for new announcements and send notifications
  const checkForNewAnnouncements = useCallback(async (newAnnouncements: Announcement[]) => {
    try {
      if (!lastViewedAnnouncementTime) return;

      const lastViewed = new Date(lastViewedAnnouncementTime);
      
      // Find announcements that are newer than last viewed time
      const newAnnouncementsList = newAnnouncements.filter(announcement => {
        const announcementDate = new Date(announcement.date || announcement.created_at || "");
        return announcementDate > lastViewed;
      });

      // Schedule notifications for new announcements
      for (const announcement of newAnnouncementsList) {
        await scheduleAnnouncementNotification(announcement);
      }

      // Update last viewed time
      if (newAnnouncementsList.length > 0) {
        const now = new Date().toISOString();
        setLastViewedAnnouncementTime(now);
        await AsyncStorage.setItem("lastViewedAnnouncementTime", now);
      }
    } catch (error) {
      console.error('Error checking for new announcements:', error);
    }
  }, [lastViewedAnnouncementTime, scheduleAnnouncementNotification]);

  // Check for new comments - NO NOTIFICATIONS FOR COMMENTS
  const checkForNewComments = useCallback(async (announcementId: string, newComments: Comment[]) => {
    try {
      const lastViewedKey = `lastViewedCommentTime_${announcementId}`;
      const storedLastViewed = await AsyncStorage.getItem(lastViewedKey);
      const lastViewed = storedLastViewed ? new Date(storedLastViewed) : null;

      if (!lastViewed) {
        // First time viewing comments for this announcement, set current time
        const now = new Date().toISOString();
        await AsyncStorage.setItem(lastViewedKey, now);
        return;
      }

      // Find comments that are newer than last viewed time
      const newCommentsList = newComments.filter(comment => {
        const commentDate = new Date(comment.comment_date);
        return commentDate > lastViewed;
      });

      // Update last viewed time (no notifications for comments)
      if (newCommentsList.length > 0) {
        const now = new Date().toISOString();
        await AsyncStorage.setItem(lastViewedKey, now);
      }
    } catch (error) {
      console.error('Error checking for new comments:', error);
    }
  }, []);

  // Check for new replies and send notifications ONLY if replying to MY comments
  const checkForNewReplies = useCallback(async (commentId: string, newReplies: Comment[]) => {
    try {
      const lastViewedKey = `lastViewedReplyTime_${commentId}`;
      const storedLastViewed = await AsyncStorage.getItem(lastViewedKey);
      const lastViewed = storedLastViewed ? new Date(storedLastViewed) : null;

      if (!lastViewed) {
        // First time viewing replies for this comment, set current time
        const now = new Date().toISOString();
        await AsyncStorage.setItem(lastViewedKey, now);
        return;
      }

      // Find replies that are newer than last viewed time
      const newRepliesList = newReplies.filter(reply => {
        const replyDate = new Date(reply.comment_date);
        return replyDate > lastViewed;
      });

      // Schedule notifications ONLY for replies to my comments
      for (const reply of newRepliesList) {
        const parentComment = Object.values(comments).flat().find(c => c.id === commentId) || 
                             Object.values(replies).flat().find(r => r.id === commentId);
        if (parentComment && reply.user_id !== userData?.id) {
          // Only send notification if the parent comment is mine
          if (parentComment.user_id === userData?.id) {
            await scheduleReplyNotification(parentComment, reply.user, reply.text);
          }
        }
      }

      // Update last viewed time
      if (newRepliesList.length > 0) {
        const now = new Date().toISOString();
        await AsyncStorage.setItem(lastViewedKey, now);
      }
    } catch (error) {
      console.error('Error checking for new replies:', error);
    }
  }, [comments, replies, userData, scheduleReplyNotification]);

  // Helper function to format any name to first + last name only
  const formatNameToFirstLast = (fullName: string): string => {
    if (!fullName) return "Unknown User"
    
    const nameParts = fullName.split(' ').filter(part => part.trim() !== '')
    
    if (nameParts.length === 0) return "Unknown User"
    if (nameParts.length === 1) return nameParts[0]
    
    // Return first and last name only
    return `${nameParts[0]} ${nameParts[nameParts.length - 1]}`
  }

  // Update the getDisplayName function to show only first and last names
  const getDisplayName = (comment: Comment): string => {
    if (comment.user && comment.user !== "Unknown User") {
      return formatNameToFirstLast(comment.user)
    }
    
    if (comment.user_profile) {
      const { first_name, last_name, full_name } = comment.user_profile
      
      // If we have separate first and last names, use them directly
      if (first_name && last_name) {
        return `${first_name} ${last_name}`
      }
      
      // If we have a full name, format it to first + last
      if (full_name) {
        return formatNameToFirstLast(full_name)
      }
      
      // Fallbacks
      if (first_name) return first_name
      if (last_name) return last_name
    }
    
    return "Anonymous User"
  }

  // Update getUserInitials to use only first and last name
  const getUserInitials = (comment: Comment): string => {
    const name = getDisplayName(comment)
    const parts = name.split(' ')
    
    // Always use first character of first name
    if (parts.length >= 1) {
      const firstInitial = parts[0][0]
      
      // Use last character of the last part (last name)
      if (parts.length >= 2) {
        const lastInitial = parts[parts.length - 1][0]
        return `${firstInitial}${lastInitial}`.toUpperCase()
      }
      
      // If only one name part, use first two characters
      return name.substring(0, 2).toUpperCase()
    }
    
    return "AU" // Anonymous User
  }

  const getUserRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case "horse_operator":
        return { bg: "#E3F2FD", text: "#CD853F" }
      case "kutsero":
        return { bg: "#E3F2FD", text: "#CD853F" }
      case "veterinarian":
        return { bg: "#E3F2FD", text: "#388E3C" }
      case "ctu_veterinarian":
        return { bg: "#FCE4EC", text: "#c2181eff" }
      case "ctu-vetmed":
        return { bg: "#FCE4EC", text: "#c2181eff" }
      case "ctu-admin":
        return { bg: "#FCE4EC", text: "#c2181eff" }
      case "dvmf":
        return { bg: "#FCE4EC", text: "#c2181eff" }
      case "dvmf-admin":
        return { bg: "#FCE4EC", text: "#c2181eff" }
      case "kutsero_president":
        return { bg: "#E3F2FD", text: "#CD853F" }
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
    } else if (statusLower.includes("sick") || statusLower.includes("moderate") || statusLower.includes("monitor")) {
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

  // Get profile picture for comments - CTU role gets CTU logo, DVMF role gets DVMF logo
  const getCommentProfilePicture = (comment: Comment) => {
    const userRole = comment.user_role?.toLowerCase()
    
    // CTU role - use CTU logo
    if (userRole === 'ctu_veterinarian' || userRole === 'ctu-vetmed' || userRole === 'ctu-admin') {
      return require("../../assets/images/CTU.jpg")
    }
    
    // DVMF role - use DVMF logo  
    if (userRole === 'dvmf' || userRole === 'dvmf-admin') {
      return require("../../assets/images/DVMF.png")
    }
    
    // For other users, use their profile image if available
    if (comment.user_profile?.image) {
      return { uri: comment.user_profile.image }
    }
    
    // Fallback to initials avatar
    return null
  }

  const getAnnouncementProfilePicture = (
    userName: string | undefined, 
    userProfileImage: string | null | undefined
  ) => {
    if (userProfileImage === "CTU_LOGO") {
      return require("../../assets/images/CTU.jpg")
    } else if (userProfileImage === "DVMF_LOGO") {
      return require("../../assets/images/DVMF.png")
    }
    
    if (userProfileImage && (userProfileImage.startsWith('http://') || userProfileImage.startsWith('https://'))) {
      return { uri: userProfileImage }
    }
    
    if (userName) {
      const nameLower = userName.toLowerCase()
      if (nameLower.includes("ctu")) {
        return require("../../assets/images/CTU.jpg")
      } 
      else if (nameLower.includes("dvmf")) {
        return require("../../assets/images/DVMF.png")
      }
    }
    
    return null
  }

  // Function to open image in full screen
  const openImageFullScreen = (imageUrl: string) => {
    setSelectedImage(imageUrl)
    setShowImageModal(true)
  }

  // Function to close image modal
  const closeImageModal = () => {
    setShowImageModal(false)
    setSelectedImage(null)
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

  const validateAuthToken = async (token: string): Promise<boolean> => {
    return token.length > 0
  }

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
          created_at: announcement.created_at || announcement.announce_date || announcement.date || "",
          image: announcement.image_url || announcement.announce_img || null,
          author: announcement.user_name || announcement.announce_title || "Announcement",
          user_id: announcement.user_id || "",
          comment_count: announcement.comment_count || 0,
          user_profile_image: announcement.user_profile_image || null,
        }))
        
        setAnnouncements(formattedAnnouncements)
        
        // Check for new announcements and send notifications
        await checkForNewAnnouncements(formattedAnnouncements)
        
        // Load last viewed announcement time if not already loaded
        if (lastViewedAnnouncementTime === null) {
          const lastViewed = await AsyncStorage.getItem("lastViewedAnnouncementTime")
          setLastViewedAnnouncementTime(lastViewed)
        }
      } else {
        setAnnouncements([])
      }
    } catch (error: any) {
      console.error("Error fetching announcements:", error)
      setAnnouncements([])
    } finally {
      setLoadingAnnouncements(false)
    }
  }, [lastViewedAnnouncementTime, checkForNewAnnouncements])

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

  const handleUserSelect = async (user: UserProfile) => {
    try {
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

  const fetchUserProfile = useCallback(async (uid: string) => {
    try {
      const userProfile = await getUserProfile(uid)
      if (userProfile) {
        const firstName = userProfile.profile?.fname || 
                         userProfile.profile?.first_name || 
                         userProfile.profile?.op_fname ||
                         userData?.profile?.op_fname || 
                         "User"
        setUserFirstName(firstName)
        
        setUserData(prev => prev ? {
          ...prev,
          profile: {
            ...prev.profile,
            ...userProfile.profile
          }
        } : prev)
      } else {
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

  const fetchReplies = useCallback(async (commentId: string) => {
    try {
      setLoadingReplies((prev) => ({ ...prev, [commentId]: true }))
      const storedAccessToken = await SecureStore.getItemAsync("access_token")
      if (!storedAccessToken) throw new Error("No access token found")
      
      const response = await fetch(
        `${API_BASE_URL}/get_comment_replies/?comment_id=${encodeURIComponent(commentId)}`,
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
        if (data?.replies) {
          const formattedReplies: Comment[] = data.replies.map((reply: any) => ({
            id: reply.id,
            text: reply.comment_text || reply.text || reply.reply_text || "",
            comment_text: reply.comment_text || reply.reply_text,
            user: reply.user_name || reply.user_profile?.full_name || "Unknown User",
            user_id: reply.user_id,
            user_role: reply.user_role,
            user_profile: reply.user_profile,
            time: formatDate(reply.comment_date),
            formatted_date: formatDate(reply.comment_date),
            comment_date: reply.comment_date,
            parent_comment_id: reply.parent_comment_id,
            reply_level: reply.reply_level || 0,
            reply_count: reply.reply_count || 0,
            has_replies: (reply.reply_count && reply.reply_count > 0) || false
          }))
          
          setReplies((prev) => ({
            ...prev,
            [commentId]: formattedReplies,
          }))

          // Check for new replies and send notifications (only for replies to my comments)
          await checkForNewReplies(commentId, formattedReplies)
        }
      }
    } catch (error: any) {
      console.error("Error fetching replies:", error)
    } finally {
      setLoadingReplies((prev) => ({ ...prev, [commentId]: false }))
    }
  }, [checkForNewReplies])

  const fetchComments = useCallback(async (announcementId: string) => {
    try {
      setLoadingComments(true)
      const storedAccessToken = await SecureStore.getItemAsync("access_token")
      if (!storedAccessToken) throw new Error("No access token found")
      
      console.log("🔍 Fetching ALL comments and replies for announcement:", announcementId)
      
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
        console.log("📥 Raw API response:", JSON.stringify(data, null, 2))
        
        if (data?.comments || data?.replies) {
          console.log("📥 Comments received:", data.comments?.length || 0)
          console.log("📥 Replies map keys:", Object.keys(data.replies || {}))
          
          // Process parent comments
          const parentComments: Comment[] = []
          const repliesMap: { [key: string]: Comment[] } = data.replies || {}
          
          if (data.comments && Array.isArray(data.comments)) {
            data.comments.forEach((comment: any) => {
              // Only add as parent if it doesn't have a parent_comment_id or reply_level is 0
              if (!comment.parent_comment_id || comment.reply_level === 0) {
                const formattedComment: Comment = {
                  id: comment.id,
                  text: comment.comment_text || comment.text || "",
                  comment_text: comment.comment_text,
                  user: comment.user_name || comment.user_profile?.full_name || "Unknown User",
                  user_id: comment.user_id,
                  user_role: comment.user_role,
                  user_profile: comment.user_profile,
                  time: formatDate(comment.comment_date),
                  formatted_date: formatDate(comment.comment_date),
                  comment_date: comment.comment_date,
                  parent_comment_id: comment.parent_comment_id,
                  reply_level: comment.reply_level || 0,
                  reply_count: comment.reply_count || 0,
                  has_replies: (comment.reply_count && comment.reply_count > 0) || false,
                  announcement_id: comment.announcement_id
                }
                
                parentComments.push(formattedComment)
                console.log(`📌 Added parent comment:`, formattedComment.text)
              }
            })
          }
          
          console.log(`✅ Processed ${parentComments.length} parent comments`)
          console.log(`✅ Replies map has ${Object.keys(repliesMap).length} parent IDs with replies`)
          
          // Set the state with properly separated data
          setComments((prev) => ({
            ...prev,
            [announcementId]: parentComments,
          }))
          
          // Set replies directly from the API response
          setReplies((prev) => ({
            ...prev,
            ...repliesMap,
          }))

          // Check for new comments (NO NOTIFICATIONS)
          await checkForNewComments(announcementId, parentComments)
        }
      } else {
        console.error("❌ Failed to fetch comments, status:", response.status)
      }
    } catch (error: any) {
      console.error("❌ Error fetching comments:", error)
    } finally {
      setLoadingComments(false)
    }
  }, [checkForNewComments])

  const addComment = useCallback(
    async (announcementId: string, commentText: string) => {
      if (!userData?.id || !commentText.trim()) {
        Alert.alert("Error", "Please enter a comment")
        return
      }
      
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
            parent_comment_id: null,
            reply_level: 0
          }),
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data?.comment) {
            const newComment: Comment = {
              id: data.comment.id,
              text: data.comment.text || data.comment.comment_text,
              comment_text: data.comment.comment_text,
              user: data.comment.user_name || userFirstName,
              user_id: userData.id,
              user_role: userData.user_role,
              user_profile: userData.profile,
              time: formatDate(data.comment.comment_date),
              formatted_date: formatDate(data.comment.comment_date),
              comment_date: data.comment.comment_date,
              parent_comment_id: null,
              reply_level: 0,
              reply_count: 0,
              has_replies: false,
              announcement_id: announcementId
            }
            
            setComments((prev) => ({
              ...prev,
              [announcementId]: [newComment, ...(prev[announcementId] || [])],
            }))
            
            setNewComment("")
            Alert.alert("Success", "Comment posted!")
            
            // Update announcement comment count
            setAnnouncements((prev) =>
              prev.map((announcement) =>
                announcement.id === announcementId
                  ? { ...announcement, comment_count: (announcement.comment_count || 0) + 1 }
                  : announcement
              )
            )
          }
        } else if (response.status === 404) {
          Alert.alert("Error", "User profile not found. Please try again.")
        } else {
          const errorData = await response.json()
          Alert.alert("Error", errorData.error || "Failed to post comment")
        }
      } catch (error: any) {
        console.error("Error adding comment:", error)
        Alert.alert("Error", "Failed to post comment. Please try again.")
      } finally {
        setSubmittingComment(false)
      }
    },
    [userData, userFirstName],
  )

  const addReply = useCallback(
    async (commentId: string, replyText: string) => {
      if (!userData?.id || !replyText.trim()) {
        Alert.alert("Error", "Please enter a reply")
        return
      }
      
      console.log("📤 Sending reply:", {
        commentId,
        replyText: replyText.trim(),
        textLength: replyText.trim().length
      })
      
      try {
        setSubmittingComment(true)
        const storedAccessToken = await SecureStore.getItemAsync("access_token")
        if (!storedAccessToken) throw new Error("No access token found")
        
        // Get parent comment
        const parentComment = selectedAnnouncementId ? 
          comments[selectedAnnouncementId]?.find(c => c.id === commentId) || 
          Object.values(replies).flat().find(r => r.id === commentId) : null
        
        const replyLevel = parentComment ? (parentComment.reply_level || 0) + 1 : 1
        
        // Prepare payload
        const payload = {
          user_id: userData.id,
          comment_id: commentId,
          reply_text: replyText.trim(),
          parent_comment_id: commentId,
          reply_level: replyLevel
        }
        
        console.log("📤 Request payload:", JSON.stringify(payload, null, 2))
        
        const response = await fetch(`${API_BASE_URL}/add_comment_reply/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${storedAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })
        
        const responseText = await response.text()
        console.log("📥 Raw response:", responseText)
        
        if (response.ok) {
          const data = JSON.parse(responseText)
          console.log("📥 Parsed response data:", JSON.stringify(data, null, 2))
          
          if (data?.reply) {
            console.log("✅ Reply from backend:", {
              id: data.reply.id,
              text: data.reply.text,
              comment_text: data.reply.comment_text,
              all_keys: Object.keys(data.reply)
            })
            
            const newReply: Comment = {
              id: data.reply.id,
              text: data.reply.text || data.reply.comment_text || replyText.trim(),
              comment_text: data.reply.comment_text || replyText.trim(),
              user: data.reply.user || userFirstName,
              user_id: userData.id,
              user_role: userData.user_role,
              user_profile: userData.profile,
              time: formatDate(data.reply.comment_date),
              formatted_date: formatDate(data.reply.comment_date),
              comment_date: data.reply.comment_date,
              parent_comment_id: commentId,
              reply_level: replyLevel,
              reply_count: 0,
              has_replies: false,
              is_reply: true,
              announcement_id: selectedAnnouncementId
            }
            
            console.log("✅ Formatted reply for display:", JSON.stringify(newReply, null, 2))
            
            // Add to replies
            setReplies((prev) => ({
              ...prev,
              [commentId]: [newReply, ...(prev[commentId] || [])],
            }))
            
            // Update reply count in parent comment
            const announcementId = selectedAnnouncementId
            setComments((prev) => ({
              ...prev,
              [announcementId]:
                prev[announcementId]?.map((c) =>
                  c.id === commentId ? { 
                    ...c, 
                    reply_count: (c.reply_count || 0) + 1, 
                    has_replies: true 
                  } : c,
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
          } else {
            console.error("❌ No reply data in response")
            Alert.alert("Error", "Failed to post reply - no data returned")
          }
        } else {
          const errorData = JSON.parse(responseText)
          console.error("❌ Error response:", errorData)
          Alert.alert("Error", errorData.error || "Failed to post reply")
        }
      } catch (error: any) {
        console.error("❌ Error adding reply:", error)
        Alert.alert("Error", "Failed to post reply. Please try again.")
      } finally {
        setSubmittingComment(false)
      }
    },
    [userData, userFirstName, selectedAnnouncementId, comments, replies],
  )

  const toggleReplies = (commentId: string) => {
    const newExpanded = new Set(expandedReplies)
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId)
    } else {
      newExpanded.add(commentId)
      // Only fetch if we don't have replies cached
      const comment = comments[selectedAnnouncementId]?.find(c => c.id === commentId)
      const hasReplies = comment && (comment.has_replies || (comment.reply_count || 0) > 0)
      const repliesNotLoaded = !replies[commentId] || replies[commentId].length === 0
      
      if (hasReplies && repliesNotLoaded) {
        console.log(`🔄 Fetching replies for comment ${commentId}`)
        fetchReplies(commentId)
      } else {
        console.log(`✅ Replies already loaded for comment ${commentId}, showing cached data`)
      }
    }
    setExpandedReplies(newExpanded)
  }

  const handleOpenCommentModal = async (announcementId: string) => {
    setReplies({})
    setExpandedReplies(new Set())
    setReplyingTo(null)
    setNewComment("")
    setSelectedAnnouncementId(String(announcementId))
    setShowCommentModal(true)
    
    const now = new Date().toISOString();
    const lastViewedKey = `lastViewedCommentTime_${announcementId}`;
    await AsyncStorage.setItem(lastViewedKey, now);
    
    setTimeout(() => {
      fetchComments(String(announcementId))
    }, 100)
  }

  const handleViewReplies = async (commentId: string) => {
    const now = new Date().toISOString();
    const lastViewedKey = `lastViewedReplyTime_${commentId}`;
    await AsyncStorage.setItem(lastViewedKey, now);
    
    toggleReplies(commentId);
  }

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
        
        await fetchUserProfile(parsedUserData.id)
        await fetchAllHorses(parsedUserData.id)
        await fetchAnnouncements()
      }
    } catch (error) {
      console.error("Error loading user data:", error)
    }
  }, [fetchAllHorses, fetchAnnouncements, fetchUserProfile])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadUserData()
    setRefreshing(false)
  }, [loadUserData])

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
    <TouchableOpacity style={styles.tabButton} onPress={onPress}>
      <View style={[styles.tabIcon, isActive && styles.activeTabIcon]}>
        {iconSource ? (
          <Image
            source={iconSource}
            style={[styles.tabIconImage, { tintColor: isActive ? "white" : "#666" }]}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.fallbackIcon} />
        )}
      </View>
      <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>{label}</Text>
    </TouchableOpacity>
  )

  const renderCommentItem = (comment: Comment) => {
    const displayName = getDisplayName(comment)
    const userInitials = getUserInitials(comment)
    const profilePicture = getCommentProfilePicture(comment)
    const commentTime = new Date(comment.comment_date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })

    // Get replies for this comment (check both direct replies and repliesMap from API)
    const commentReplies = replies[comment.id] || []

    return (
      <View key={comment.id}>
        {/* Main Comment */}
        <View style={styles.commentItem}>
          <View style={styles.commentAvatarContainer}>
            {profilePicture ? (
              <Image
                source={profilePicture}
                style={styles.commentAvatar}
              />
            ) : (
              <View style={styles.commentAvatar}>
                <Text style={styles.commentAvatarText}>
                  {userInitials}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.commentContentContainer}>
            <View style={styles.commentBubble}>
              <View style={styles.commentHeader}>
                <View style={styles.commentHeaderLeft}>
                  <Text style={styles.commentUserName}>
                    {displayName}
                  </Text>
                </View>
                <Text style={styles.commentTime}>
                  {commentTime}
                </Text>
              </View>
              <Text style={styles.commentText}>{comment.text}</Text>
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
              {(comment.reply_count && comment.reply_count > 0) && (
                <TouchableOpacity
                  onPress={() => handleViewReplies(comment.id)}
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

        {/* Replies - Only show if user expanded */}
        {expandedReplies.has(comment.id) && (
          <View style={styles.repliesContainer}>
            {loadingReplies[comment.id] ? (
              <View style={styles.loadingRepliesContainer}>
                <ActivityIndicator size="small" color="#C17A47" />
                <Text style={styles.loadingRepliesText}>Loading replies...</Text>
              </View>
            ) : commentReplies.length > 0 ? (
              commentReplies.map((reply) => {
                const replyDisplayName = getDisplayName(reply)
                const replyInitials = getUserInitials(reply)
                const replyProfilePicture = getCommentProfilePicture(reply)
                const replyTime = new Date(reply.comment_date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })

                return (
                  <View key={reply.id} style={styles.replyItem}>
                    <View style={styles.replyAvatarContainer}>
                      {replyProfilePicture ? (
                        <Image
                          source={replyProfilePicture}
                          style={styles.replyAvatar}
                        />
                      ) : (
                        <View style={styles.replyAvatar}>
                          <Text style={styles.commentAvatarText}>
                            {replyInitials}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.replyContentContainer}>
                      <View style={styles.replyBubble}>
                        <View style={styles.commentHeader}>
                          <View style={styles.commentHeaderLeft}>
                            <Text style={styles.commentUserName}>
                              {replyDisplayName}
                            </Text>
                          </View>
                          <Text style={styles.commentTime}>
                            {replyTime}
                          </Text>
                        </View>
                        <Text style={styles.commentText}>
                          {reply.text || reply.comment_text || "No text"}
                        </Text>
                      </View>
                      <View style={styles.commentActions}>
                        <TouchableOpacity 
                          style={styles.commentActionButton}
                          onPress={() => {
                            setReplyingTo(reply.id)
                            setReplyText("")
                          }}
                        >
                          <Text style={styles.commentActionText}>Reply</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )
              })
            ) : (
              <View style={styles.noRepliesContainer}>
                <Text style={styles.noRepliesText}>No replies yet.</Text>
              </View>
            )}
          </View>
        )}
      </View>
    )
  }

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
            <TouchableOpacity 
              style={styles.headerButton} 
              onPress={() => {
                const now = new Date().toISOString()
                setLastViewedAnnouncementTime(now)
                AsyncStorage.setItem("lastViewedAnnouncementTime", now)
                router.push("/HORSE_OPERATOR/Hnotif")
              }}
            >
              <Image source={require("../../assets/images/notification.png")} style={[styles.headerIconImage, { tintColor: "white" }]} resizeMode="contain" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.sosButton} onPress={() => router.push("/HORSE_OPERATOR/Hsos")}>
              <Image source={require("../../assets/images/sos2.png")} style={styles.sosIcon} resizeMode="contain" />
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
              <TouchableOpacity onPress={() => router.push("../HORSE_OPERATOR/horse")}>
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
                              <Text style={styles.horseBreedText}>
                                <Text style={styles.horseLabel}>Breed: </Text>
                                <Text style={styles.horseValue}>{item.horse_breed}</Text>
                              </Text>
                            </View>
                            <View style={styles.healthRow}>
                              <Text style={styles.horseAgeText}>
                                <Text style={styles.horseLabel}>Age: </Text>
                                <Text style={styles.horseValue}>
                                  {item.horse_dob ? calculateAge(item.horse_dob) : item.horse_age} years
                                </Text>
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
                  onPress={() => router.push("../HORSE_OPERATOR/horse")}
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
                
                return (
                  <View
                    key={announcement.id}
                    style={[styles.facebookPostCard, index < announcements.length - 1 && styles.postCardMargin]}
                  >
                    <View style={styles.postHeader}>
                      <View style={styles.postIconContainer}>
                        {profilePicture ? (
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
                        <View style={styles.postTitleRow}>
                          <Text style={styles.postTitle}>{announcement.author}</Text>
                        </View>
                        <Text style={styles.postTime}>{formatDate(announcement.date)}</Text>
                      </View>
                    </View>
                    {imageUrl && (
                      <TouchableOpacity 
                        style={styles.postImageContainer}
                        onPress={() => openImageFullScreen(imageUrl)}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: imageUrl }} style={styles.postImage} resizeMode="cover" />
                        <View style={styles.imageOverlay}>
                          <FontAwesome5 name="expand" size={scale(24)} color="white" />
                        </View>
                      </TouchableOpacity>
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
                            handleOpenCommentModal(String(announcement.id))
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
          <TabButton iconSource={require("../../assets/images/home.png")} label="Home" tabKey="home" isActive={activeTab === "home"} />
          <TabButton
            iconSource={require("../../assets/images/horse.png")}
            label="Horses"
            tabKey="horses"
            isActive={activeTab === "horses"}
            onPress={() => router.push("../HORSE_OPERATOR/horse")}
          />
          <TabButton
            iconSource={require("../../assets/images/chat.png")}
            label="Chat"
            tabKey="messages"
            isActive={activeTab === "messages"}
            onPress={() => router.push("../HORSE_OPERATOR/Hmessage")}
          />
          <TabButton
            iconSource={require("../../assets/images/calendar.png")}
            label="Calendar"
            tabKey="bookings"
            isActive={activeTab === "bookings"}
            onPress={() => router.push("../HORSE_OPERATOR/Hcalendar")}
          />
          <TabButton
            iconSource={require("../../assets/images/profile.png")}
            label="Profile"
            tabKey="profile"
            isActive={activeTab === "profile"}
            onPress={() => router.push("../HORSE_OPERATOR/profile")}
          />
        </View>
      </View>
      
      {/* Facebook-style Comment Modal */}
      <Modal
        visible={showCommentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowCommentModal(false)
          setSelectedAnnouncementId("")
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
                    setSelectedAnnouncementId("")
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
                {loadingComments ? (
                  <View style={styles.loadingCommentsContainer}>
                    <ActivityIndicator size="small" color="#C17A47" />
                    <Text style={styles.loadingCommentsText}>Loading comments...</Text>
                  </View>
                ) : selectedAnnouncementComments.length > 0 ? (
                  selectedAnnouncementComments.map(renderCommentItem)
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
                        {getDisplayName(selectedAnnouncementComments.find((c) => c.id === replyingTo)!)}
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
                  {userData?.profile?.image ? (
                    <Image source={{ uri: userData.profile.image }} style={styles.currentUserAvatar} />
                  ) : (
                    <View style={styles.currentUserAvatar}>
                      <Text style={styles.currentUserAvatarText}>{userFirstName.charAt(0).toUpperCase()}</Text>
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
                      editable={!submittingComment}
                      autoCorrect={true}
                      autoCapitalize="sentences"
                    />
                  </View>
                  
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      {
                        opacity: (replyingTo ? replyText : newComment).trim() && !submittingComment ? 1 : 0.5,
                      },
                    ]}
                    onPress={() => {
                      if (replyingTo) {
                        addReply(replyingTo, replyText)
                      } else {
                        addComment(selectedAnnouncementId, newComment)
                      }
                    }}
                    disabled={!(replyingTo ? replyText : newComment).trim() || submittingComment}
                  >
                    {submittingComment ? (
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

      {/* Full Screen Image Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <View style={styles.imageModalOverlay}>
          <StatusBar backgroundColor="rgba(0,0,0,0.9)" barStyle="light-content" />
          <TouchableOpacity 
            style={styles.imageModalCloseButton}
            onPress={closeImageModal}
          >
            <Text style={styles.imageModalCloseText}>✕</Text>
          </TouchableOpacity>
          {selectedImage && (
            <Image 
              source={{ uri: selectedImage }} 
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#C17A47" 
  },
  loadingContainer: { 
    justifyContent: "center", 
    alignItems: "center" 
  },
  loadingText: { 
    color: "white", 
    fontSize: moderateScale(16), 
    fontWeight: "500", 
    marginTop: verticalScale(10) 
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
    marginTop: verticalScale(8),
  },
  welcomeSection: { 
    flex: 1 
  },
  welcomeText: { 
    fontSize: moderateScale(14), 
    color: "white", 
    fontWeight: "400", 
    marginBottom: verticalScale(2) 
  },
  userName: { 
    fontSize: moderateScale(20), 
    fontWeight: "bold", 
    color: "white" 
  },
  headerActions: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: scale(10) 
  },
  headerButton: { 
    width: scale(32), 
    height: scale(32), 
    borderRadius: scale(16), 
    backgroundColor: "rgba(255,255,255,0.2)", 
    justifyContent: "center", 
    alignItems: "center", 
    position: "relative" 
  },
  sosButton: { 
    width: scale(32), 
    height: scale(32), 
    borderRadius: scale(16), 
    backgroundColor: "#FF4444", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  sosIcon: { 
    width: scale(20), 
    height: scale(20) 
  },
  searchContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "white", 
    borderRadius: scale(20), 
    paddingHorizontal: scale(12), 
    height: verticalScale(40), 
    minHeight: 40 
  },
  searchIcon: { 
    marginRight: scale(8) 
  },
  searchInput: { 
    flex: 1, 
    fontSize: moderateScale(14), 
    color: "#333", 
    paddingVertical: 0 
  },
  clearSearchButton: { 
    padding: scale(4), 
    marginLeft: scale(4) 
  },
  searchDropdownOverlay: { 
    position: 'absolute', 
    left: scale(16), 
    right: scale(16), 
    backgroundColor: "white", 
    borderRadius: scale(12), 
    maxHeight: height * 0.5, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: scale(4) }, 
    shadowOpacity: 0.15, 
    shadowRadius: scale(8), 
    elevation: 10, 
    zIndex: 9999, 
    overflow: 'hidden', 
  },
  searchDropdownHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingHorizontal: scale(16), 
    paddingVertical: verticalScale(12), 
    borderBottomWidth: 1, 
    borderBottomColor: "#F0F0F0" 
  },
  searchDropdownTitle: { 
    fontSize: moderateScale(14), 
    fontWeight: "600", 
    color: "#333" 
  },
  searchDropdownCount: { 
    fontSize: moderateScale(12), 
    color: "#666" 
  },
  dropdownList: { 
    maxHeight: height * 0.4, 
  },
  dropdownItem: { 
    paddingHorizontal: scale(12), 
    paddingVertical: verticalScale(12), 
    borderBottomWidth: 1, 
    borderBottomColor: "#F0F0F0" 
  },
  dropdownItemContent: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: scale(12) 
  },
  dropdownUserImage: { 
    width: scale(40), 
    height: scale(40), 
    borderRadius: scale(20) 
  },
  dropdownUserImageFallback: { 
    width: scale(40), 
    height: scale(40), 
    borderRadius: scale(20), 
    backgroundColor: "#C17A47", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  dropdownUserImageText: { 
    color: "white", 
    fontSize: moderateScale(12), 
    fontWeight: "bold" 
  },
  dropdownUserInfo: { 
    flex: 1 
  },
  dropdownUserName: { 
    fontSize: moderateScale(14), 
    fontWeight: "600", 
    color: "#333", 
    marginBottom: verticalScale(2) 
  },
  dropdownUserEmail: { 
    fontSize: moderateScale(12), 
    color: "#666", 
    marginBottom: verticalScale(4) 
  },
  dropdownBadgesRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: scale(6), 
    flexWrap: "wrap" 
  },
  dropdownRoleBadge: { 
    paddingHorizontal: scale(8), 
    paddingVertical: scale(2), 
    borderRadius: scale(12) 
  },
  dropdownRoleBadgeText: { 
    fontSize: moderateScale(10), 
    fontWeight: "600" 
  },
  dropdownLoadingContainer: { 
    paddingVertical: verticalScale(20), 
    alignItems: "center", 
    gap: scale(8) 
  },
  dropdownLoadingText: { 
    fontSize: moderateScale(12), 
    color: "#666" 
  },
  dropdownEmptyContainer: { 
    paddingVertical: verticalScale(40), 
    alignItems: "center" 
  },
  dropdownEmptyText: { 
    fontSize: moderateScale(14), 
    color: "#999", 
    marginTop: verticalScale(12), 
    fontWeight: "500" 
  },
  dropdownEmptyHint: { 
    fontSize: moderateScale(12), 
    color: "#BBB", 
    marginTop: verticalScale(6), 
    textAlign: "center", 
    paddingHorizontal: scale(20) 
  },
  contentContainer: { 
    flex: 1, 
    backgroundColor: "#F5F5F5" 
  },
  scrollContent: { 
    flex: 1 
  },
  scrollContentContainer: { 
    paddingBottom: verticalScale(100) 
  },
  horseSection: { 
    backgroundColor: "white", 
    marginHorizontal: scale(16), 
    marginTop: dynamicSpacing(16), 
    borderRadius: scale(12), 
    padding: scale(16) 
  },
  sectionHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: verticalScale(12) 
  },
  sectionTitle: { 
    fontSize: moderateScale(16), 
    fontWeight: "600", 
    color: "#333" 
  },
  viewAllButton: { 
    fontSize: moderateScale(12), 
    color: "#C17A47", 
    fontWeight: "600" 
  },
  horseCardContainer: { 
    width: CARD_WIDTH 
  },
  horseCard: { 
    flexDirection: "row", 
    alignItems: "flex-start", 
    marginBottom: verticalScale(12), 
    width: "100%" 
  },
  horseImageContainer: { 
    marginRight: scale(12) 
  },
  horseImage: { 
    width: scale(96), 
    height: scale(96), 
    borderRadius: scale(8), 
    backgroundColor: "#f0f0f0" 
  },
  horseInfo: { 
    flex: 1 
  },
  horseNameText: { 
    fontSize: moderateScale(14), 
    marginBottom: verticalScale(4) 
  },
  horseBreedText: { 
    fontSize: moderateScale(14), 
    marginBottom: verticalScale(4) 
  },
  horseAgeText: { 
    fontSize: moderateScale(14), 
    marginBottom: verticalScale(4) 
  },
  horseLabel: { 
    color: "#666", 
    fontWeight: "400" 
  },
  horseValue: { 
    color: "#333", 
    fontWeight: "600" 
  },
  healthRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    fontSize: moderateScale(14), 
    marginBottom: verticalScale(4) 
  },
  healthDot: { 
    width: scale(6), 
    height: scale(6), 
    borderRadius: scale(3), 
    marginLeft: scale(4), 
    marginRight: scale(6) 
  },
  healthText: { 
    fontSize: moderateScale(12), 
    fontWeight: "500" 
  },
  paginationContainer: { 
    flexDirection: "row", 
    justifyContent: "center", 
    alignItems: "center", 
    paddingVertical: verticalScale(12), 
    gap: scale(8) 
  },
  paginationDot: { 
    width: scale(8), 
    height: scale(8), 
    borderRadius: scale(4), 
    backgroundColor: "#D1D5DB" 
  },
  paginationDotActive: { 
    width: scale(24), 
    backgroundColor: "#C17A47", 
    borderRadius: scale(4) 
  },
  viewProfileButton: { 
    backgroundColor: "#C17A47", 
    paddingHorizontal: scale(16), 
    paddingVertical: verticalScale(10), 
    borderRadius: scale(8), 
    alignItems: "center", 
    marginTop: verticalScale(8), 
    minHeight: 40 
  },
  viewProfileButtonText: { 
    color: "white", 
    fontSize: moderateScale(12), 
    fontWeight: "600" 
  },
  noHorseContainer: { 
    alignItems: "center", 
    paddingVertical: verticalScale(20) 
  },
  noHorseText: { 
    fontSize: moderateScale(14), 
    color: "#666", 
    marginBottom: verticalScale(12), 
    textAlign: "center" 
  },
  addHorseButton: { 
    backgroundColor: "#C17A47", 
    paddingHorizontal: scale(20), 
    paddingVertical: verticalScale(10), 
    borderRadius: scale(8) 
  },
  addHorseButtonText: { 
    color: "white", 
    fontSize: moderateScale(12), 
    fontWeight: "600" 
  },
  activitiesSection: { 
    backgroundColor: "white", 
    marginHorizontal: scale(16), 
    marginTop: dynamicSpacing(16), 
    borderRadius: scale(12), 
    padding: scale(16) 
  },
  noAnnouncementsContainer: { 
    padding: scale(20), 
    alignItems: "center" 
  },
  noAnnouncementsText: { 
    fontSize: moderateScale(14), 
    color: "#999", 
    textAlign: "center" 
  },
  facebookPostCard: { 
    backgroundColor: "#FFFFFF", 
    borderRadius: scale(12), 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: scale(2) }, 
    shadowOpacity: 0.1, 
    shadowRadius: scale(4), 
    elevation: 3, 
    overflow: "hidden" 
  },
  postCardMargin: { 
    marginBottom: scale(16) 
  },
  postHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    padding: scale(16), 
    paddingBottom: scale(12) 
  },
  postIconContainer: { 
    width: scale(40), 
    height: scale(40), 
    borderRadius: scale(20), 
    backgroundColor: "#E3F2FD", 
    justifyContent: "center", 
    alignItems: "center", 
    marginRight: scale(12), 
    overflow: "hidden" 
  },
  announcementIcon: { 
    width: scale(16), 
    height: scale(12), 
    position: "relative" 
  },
  megaphoneBody: { 
    width: scale(8), 
    height: scale(8), 
    backgroundColor: "#2196F3", 
    borderRadius: scale(2), 
    position: "absolute", 
    left: 0, 
    top: scale(2) 
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
    top: 0 
  },
  postHeaderContent: { 
    flex: 1 
  },
  postTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: scale(2),
  },
  postTitle: { 
    fontSize: moderateScale(16), 
    fontWeight: "600", 
    color: "#1C1C1E", 
    marginRight: scale(8),
  },
  postTime: { 
    fontSize: moderateScale(13), 
    color: "#8E8E93" 
  },
  postImageContainer: { 
    width: "100%", 
    height: verticalScale(200), 
    backgroundColor: "#F0F0F0", 
    overflow: "hidden", 
    position: "relative" 
  },
  postImage: { 
    width: "100%", 
    height: "100%" 
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    opacity: 0,
  },
  postContent: { 
    paddingHorizontal: scale(16), 
    paddingTop: scale(12), 
    paddingBottom: scale(16) 
  },
  postDescription: { 
    fontSize: moderateScale(15), 
    color: "#1C1C1E", 
    lineHeight: moderateScale(22) 
  },
  seeMoreButton: { 
    marginTop: verticalScale(8), 
    alignSelf: "flex-start" 
  },
  seeMoreText: { 
    color: "#C17A47", 
    fontSize: moderateScale(14), 
    fontWeight: "500" 
  },
  postActions: { 
    borderTopWidth: 1, 
    borderTopColor: "#F2F2F7", 
    paddingHorizontal: scale(16), 
    paddingVertical: scale(12) 
  },
  commentButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingVertical: scale(8) 
  },
  commentCount: { 
    fontSize: moderateScale(14), 
    color: "#8E8E93", 
    fontWeight: "500" 
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
    justifyContent: "space-around" 
  },
  tabButton: { 
    flex: 1, 
    alignItems: "center", 
    paddingVertical: verticalScale(4), 
    paddingHorizontal: scale(2) 
  },
  tabIcon: { 
    width: scale(28), 
    height: scale(28), 
    borderRadius: scale(14), 
    justifyContent: "center", 
    alignItems: "center", 
    marginBottom: verticalScale(2) 
  },
  activeTabIcon: { 
    backgroundColor: "#C17A47" 
  },
  tabIconImage: { 
    width: scale(16), 
    height: scale(16) 
  },
  fallbackIcon: { 
    width: scale(14), 
    height: scale(14), 
    backgroundColor: "#666", 
    borderRadius: scale(2) 
  },
  tabLabel: { 
    fontSize: moderateScale(9), 
    color: "#666", 
    textAlign: "center" 
  },
  activeTabLabel: { 
    color: "#C17A47", 
    fontWeight: "600" 
  },
  iconContainer: { 
    width: scale(14), 
    height: scale(14), 
    justifyContent: "center", 
    alignItems: "center", 
    position: "relative" 
  },
  menuBar: { 
    width: scale(10), 
    height: scale(1.5) 
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
  commentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  commentUserName: {
    fontSize: moderateScale(13),
    fontWeight: "600",
    color: "#1C1E21",
    marginRight: scale(6),
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
  viewRepliesButton: {
    paddingVertical: verticalScale(2),
  },
  viewRepliesText: {
    fontSize: moderateScale(12),
    color: "#65676B",
    fontWeight: "600",
  },
  headerIconImage: { 
    width: scale(18), 
    height: scale(18) 
  },
  // Full Screen Image Modal Styles
  imageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageModalCloseButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    right: scale(20),
    zIndex: 10,
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageModalCloseText: {
    color: "white",
    fontSize: moderateScale(20),
    fontWeight: "bold",
  },
  fullScreenImage: {
    width: width,
    height: height,
  },
})