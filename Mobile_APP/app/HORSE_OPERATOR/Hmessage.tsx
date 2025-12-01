// HORSE OPERATOR Message Screen Component

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
  RefreshControl,
  Keyboard,
} from "react-native"
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router"
import * as SecureStore from "expo-secure-store"

const { width, height } = Dimensions.get("window")

// Responsive scaling functions
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

// TypeScript interfaces
interface ChatMessage {
  id: string
  name: string
  avatar: string
  message: string
  time: string
  unread: boolean
  role?: string
  email?: string
  online?: boolean
  unread_count?: number
  profile_image?: string
  last_sender_id?: string
  is_own_message?: boolean
  last_message_content?: string
}

interface Message {
  id: string
  text: string
  isOutgoing?: boolean
  isUser?: boolean
  timestamp: string
  isRead?: boolean
  date?: string
}

interface UserData {
  id: string
  email: string
  profile?: any
  access_token: string
  user_status?: string
}

interface AvailableUser {
  id: string
  name: string
  email?: string
  role: string
  profile_image?: string
  avatar?: string
  online?: boolean
  // Veterinarian specific fields
  profile_picture?: string
  vet_profile_image?: string
  // Kutsero specific fields
  kutsero_profile_image?: string
  user_profile_image?: string
  // Additional fields for comprehensive image handling
  op_image?: string
  kutsero_image?: string
  vet_profile_photo?: string
  ctu_profile_photo?: string
  dvmf_profile_photo?: string
}

// TabButton Component
const TabButton = ({ 
  iconSource, 
  label, 
  onPress, 
  isActive 
}: { 
  iconSource: any; 
  label: string; 
  onPress: () => void; 
  isActive: boolean 
}) => (
  <TouchableOpacity style={styles.navItem} onPress={onPress}>
    <View style={[styles.navIcon, isActive && styles.activeNavIcon]}>
      <Image 
        source={iconSource} 
        style={{ 
          width: scale(20), 
          height: scale(20), 
          tintColor: isActive ? '#fff' : '#666' 
        }} 
      /> 
    </View>
    <Text style={[styles.navLabel, isActive && styles.activeNavLabel]}>
      {label}
    </Text>
  </TouchableOpacity>
)

const API_BASE_URL = "http://10.254.39.148:8000/api/horse_operator"

// Function to generate temporary profile picture based on name and role
const generateTemporaryProfile = (name: string, role: string = "user") => {
  const colors = [
    '#CD853F'
  ]
  
  // Get consistent color based on name
  const nameHash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const colorIndex = nameHash % colors.length
  const backgroundColor = colors[colorIndex]
  
  // Get initials
  const getInitials = (name: string) => {
    if (!name) return "?"
    const nameParts = name.trim().split(" ")
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase()
    }
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase()
  }
  
  const initials = getInitials(name)
  
  return {
    backgroundColor,
    initials,
    color: '#FFFFFF' // White text for better contrast
  }
}

// Chat Interface Component (Matches Kutsero Style)
const ChatInterface = ({
  isAIChat,
  messages,
  title,
  onBack,
  chatInput,
  onChatInputChange,
  onSendMessage,
  safeArea,
  onHeaderPress,
  isOnline,
}: {
  isAIChat: boolean
  messages: Message[]
  title: string
  onBack: () => void
  chatInput: string
  onChatInputChange: (text: string) => void
  onSendMessage: () => void
  safeArea: { top: number; bottom: number }
  onHeaderPress?: () => void
  isOnline?: boolean
}) => {
  const scrollViewRef = useRef<ScrollView>(null)
  const [keyboardOffset, setKeyboardOffset] = useState(0)

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardOffset(e.endCoordinates.height)
      }
    )
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardOffset(0)
      }
    )

    return () => {
      keyboardDidShowListener.remove()
      keyboardDidHideListener.remove()
    }
  }, [])

  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }, [messages, keyboardOffset])

  const getDateLabel = (dateString: string) => {
    const messageDate = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const messageDateOnly = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate())
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())

    if (messageDateOnly.getTime() === todayOnly.getTime()) return "Today"
    if (messageDateOnly.getTime() === yesterdayOnly.getTime()) return "Yesterday"
    
    return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const shouldShowDateLabel = (currentMessage: Message, previousMessage: Message | undefined) => {
    if (!previousMessage) return true
    
    const currentDate = new Date(currentMessage.date || new Date().toISOString())
    const previousDate = new Date(previousMessage.date || new Date().toISOString())
    
    const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
    const previousDateOnly = new Date(previousDate.getFullYear(), previousDate.getMonth(), previousDate.getDate())
    
    return currentDateOnly.getTime() !== previousDateOnly.getTime()
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : -safeArea.bottom}
    >
      <StatusBar barStyle="light-content" backgroundColor="#CD853F" translucent={false} />

      <View style={[styles.header, { paddingTop: safeArea.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.headerCenter} 
          onPress={onHeaderPress}
          activeOpacity={onHeaderPress ? 0.7 : 1}
          disabled={!onHeaderPress}
        >
          <Text style={styles.headerTitle}>{title}</Text>
          {!isAIChat && onHeaderPress && (
            <Text style={styles.headerSubtitle}>Tap to view profile</Text>
          )}
        </TouchableOpacity>
        
        <View style={styles.headerRight}>
          {isAIChat ? (
            <View style={styles.aiStatusIndicator}>
              <View style={styles.aiStatusDot} />
              <Text style={styles.aiStatusText}>Online</Text>
            </View>
          ) : (
            <View style={styles.aiStatusIndicator}>
              <View style={[styles.aiStatusDot, !isOnline && styles.offlineDot]} />
              <Text style={styles.userName}>{isOnline ? 'Online' : 'Offline'}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.chatContainer}
        contentContainerStyle={[
          styles.chatContent,
          { paddingBottom: keyboardOffset > 0 ? keyboardOffset + 80 : 20 }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
      >
        {messages.map((message, index) => {
          const previousMessage = index > 0 ? messages[index - 1] : undefined
          const showDateLabel = shouldShowDateLabel(message, previousMessage)
          
          return (
            <View key={message.id}>
              {showDateLabel && (
                <View style={styles.dateLabelContainer}>
                  <Text style={styles.dateLabel}>
                    {getDateLabel(message.date || new Date().toISOString())}
                  </Text>
                </View>
              )}
              <View
                style={[styles.messageContainer, message.isUser ? styles.userMessageContainer : styles.aiMessageContainer]}
              >
                <View style={[styles.messageBubble, message.isUser ? styles.userMessageBubble : styles.aiMessageBubble]}>
                  <Text style={[styles.messageText, message.isUser ? styles.userMessageText : styles.aiMessageText]}>
                    {message.text}
                  </Text>
                </View>
                <Text style={[styles.messageTime, message.isUser ? styles.userMessageTime : styles.aiMessageTime]}>
                  {message.timestamp}
                </Text>
              </View>
            </View>
          )
        })}
      </ScrollView>

      <View 
        style={[
          styles.chatInputContainer, 
          { 
            paddingBottom: Math.max(safeArea.bottom, 8),
            marginBottom: keyboardOffset > 0 ? 0 : safeArea.bottom
          }
        ]}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.chatInput}
            value={chatInput}
            onChangeText={onChatInputChange}
            placeholder={isAIChat ? "Ask me about horse care..." : "Type a message..."}
            placeholderTextColor="#999"
            multiline={true}
            maxLength={500}
            returnKeyType="default"
            blurOnSubmit={false}
            autoCorrect={true}
            autoCapitalize="sentences"
            selectionColor="#CD853F"
            underlineColorAndroid="transparent"
          />
        </View>
        <TouchableOpacity
          style={[styles.sendButton, { opacity: chatInput.trim() ? 1 : 0.5 }]}
          onPress={onSendMessage}
          disabled={!chatInput.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

// Main Message Screen Component
const MessageScreen = () => {
  const [searchText, setSearchText] = useState("")
  const router = useRouter()
  const params = useLocalSearchParams()
  const [activeTab, setActiveTab] = useState<"conversations" | "users">("conversations")
  const [roleFilter, setRoleFilter] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [isOperator, setIsOperator] = useState<boolean>(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const safeArea = getSafeAreaPadding()

  const [showChat, setShowChat] = useState(false)
  const [showAIChat, setShowAIChat] = useState(false)
  const [currentContact, setCurrentContact] = useState<{
    id: string
    name: string
    avatar: string
    role: string
    email?: string
    online?: boolean
  } | null>(null)

  const [chatInput, setChatInput] = useState("")
  const [userData, setUserData] = useState<UserData | null>(null)
  const [aiChatMessages, setAiChatMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm your AI assistant. How can I help you with horse care today?",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      date: new Date().toISOString(),
    },
  ])
  const [individualChatMessages, setIndividualChatMessages] = useState<Message[]>([])
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([])
  const [onlineUsers] = useState<Set<string>>(new Set())

  // Helper function for formatting message content
  const formatMessageContent = (content: string, maxLength = 50): string => {
    if (!content) return ""
    return content.length > maxLength ? `${content.substring(0, maxLength)}...` : content
  }

  // Utility function to format message timestamps
  const formatMessageTimestamp = (timestamp: string): string => {
    try {
      const messageDate = new Date(timestamp)
      return messageDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } catch {
      return timestamp
    }
  }

  // Check if user is a horse operator
  const isHorseOperator = async (userId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_horse_operator_profile/?user_id=${encodeURIComponent(userId)}`)
      if (response.ok) {
        const data = await response.json()
        return !!data
      }
      return false
    } catch {
      return false
    }
  }

  const loadUserId = useCallback(async () => {
    try {
      const userData = await SecureStore.getItemAsync("user_data")
      if (userData) {
        const parsed = JSON.parse(userData)
        const id = parsed.user_id || parsed.id
        
        const unifiedUserData: UserData = {
          id: id,
          email: parsed.email,
          profile: parsed.profile,
          access_token: parsed.access_token,
          user_status: parsed.user_status || "active",
        }

        setUserData(unifiedUserData)
        setUserId(id)

        const operatorStatus = await isHorseOperator(id)
        setIsOperator(operatorStatus)
        console.log(`User ${id} is ${operatorStatus ? "a" : "NOT a"} Horse Operator`)

        return id
      }
    } catch (error) {
      console.error("Error loading user data:", error)
    }
    return null
  }, [])

  const calculateTotalUnread = useCallback((convs: ChatMessage[]) => {
    const total = convs.reduce((sum, conv) => sum + (conv.unread_count || 0), 0)
    console.log('📊 Total unread messages:', total)
    return total
  }, [])

  // ENHANCED: Function to fetch user profile picture with multiple fallbacks
  const fetchUserProfilePicture = async (userId: string, userRole: string): Promise<string | null> => {
    try {
      console.log(`🖼️ Fetching profile picture for user: ${userId}, role: ${userRole}`)
      
      // Try the unified profile endpoint first
      const profileResponse = await fetch(`${API_BASE_URL}/get_user_profile_by_id/?user_id=${encodeURIComponent(userId)}`)
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        console.log(`✅ Unified profile data for ${userId}:`, profileData)
        
        // Check if we got a valid profile (not an error)
        if (profileData.error) {
          console.log(`❌ Profile not found for ${userId}:`, profileData.error)
          // Generate temporary profile
          return "temporary"
        }
        
        // Extract image from various possible fields
        const imageFields = [
          profileData.image,
          profileData.profile_image,
          profileData.avatar,
          profileData.op_image,
          profileData.kutsero_image,
          profileData.vet_profile_photo,
          profileData.ctu_profile_photo,
          profileData.dvmf_profile_photo
        ]
        
        for (const imageField of imageFields) {
          if (imageField && typeof imageField === 'string' && imageField.trim() !== '') {
            console.log(`✅ Found profile picture in field: ${imageField}`)
            return imageField
          }
        }
        
        // No image found, use temporary
        return "temporary"
      } else if (profileResponse.status === 404) {
        console.log(`❌ Profile not found (404) for ${userId}, using temporary profile`)
        return "temporary"
      }
      
      // Fallback to role-specific endpoints if unified fails
      if (userRole === 'veterinarian' || userRole === 'vet') {
        const vetResponse = await fetch(`${API_BASE_URL}/get_veterinarian_profile/?vet_id=${encodeURIComponent(userId)}`)
        if (vetResponse.ok) {
          const vetData = await vetResponse.json()
          const vetImage = vetData.vet_profile_photo || vetData.profile_picture
          if (vetImage) return vetImage
        }
      } else if (userRole === 'kutsero' || userRole === 'horse_operator') {
        const kutseroResponse = await fetch(`${API_BASE_URL}/get_kutsero_profile/?user_id=${encodeURIComponent(userId)}`)
        if (kutseroResponse.ok) {
          const kutseroData = await kutseroResponse.json()
          const kutseroImage = kutseroData.kutsero_profile_image || kutseroData.user_profile_image
          if (kutseroImage) return kutseroImage
        }
      }
      
      console.log(`❌ No profile picture found for user ${userId}, will use temporary profile`)
      return "temporary"
    } catch (error) {
      console.error(`Error fetching profile picture for ${userId}:`, error)
      return "temporary"
    }
  }

  // FIXED: Enhanced loadConversations function with proper "You:" prefix logic
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true)
      let uid = userId

      if (!uid) {
        uid = await loadUserId()
        if (!uid) {
          console.log("No user logged in, redirecting to Login.")
          router.replace("/auth/login")
          return
        }
      }

      const response = await fetch(`${API_BASE_URL}/conversations/?user_id=${encodeURIComponent(uid)}`)

      if (!response.ok) {
        throw new Error(`Failed to load conversations: ${response.status}`)
      }

      const data = await response.json()
      console.log("Loaded conversations from backend:", data)

      let messagesList: ChatMessage[] = []

      if (data.conversations && Array.isArray(data.conversations)) {
        // Process conversations with enhanced profile picture handling and message display
        messagesList = await Promise.all(
          data.conversations.map(async (conv: any) => {
            const partnerId = conv.partner_id
            const partnerRole = conv.role || ""
            const partnerName = conv.partner_name || conv.sender || "Unknown User"
            const lastSenderId = conv.last_sender_id
            const lastMessageContent = conv.last_message || conv.preview || ""
            
            console.log(`🔄 Processing conversation with: ${partnerName} (${partnerRole})`, {
              lastSenderId: lastSenderId,
              currentUserId: uid,
              lastMessageContent: lastMessageContent,
              existingProfileImage: conv.avatar || conv.profile_image,
              partnerId: partnerId
            })

            // Check if the last message was sent by the current user
            const isOwnMessage = lastSenderId === uid
            
            // FIXED: Format the message preview with proper "You:" prefix
            let messagePreview = lastMessageContent
            if (isOwnMessage && lastMessageContent) {
              messagePreview = `You: ${lastMessageContent}`
            } else if (!isOwnMessage && lastMessageContent) {
              // Keep the original message content for messages from others
              messagePreview = lastMessageContent
            }

            // Always fetch fresh profile picture for conversations to ensure latest image
            let profileImage = await fetchUserProfilePicture(partnerId, partnerRole)
            
            if (!profileImage) {
              // If no profile picture found, use temporary profile
              profileImage = "temporary"
              console.log(`🔄 Using temporary profile for ${partnerName}`)
            } else {
              console.log(`✅ Using fetched profile picture for ${partnerName}: ${profileImage}`)
            }

            return {
              id: partnerId,
              name: partnerName,
              avatar: profileImage,
              message: formatMessageContent(messagePreview), // Use the properly formatted preview
              time: formatMessageTimestamp(conv.last_message_time || conv.timestamp || new Date().toISOString()),
              unread: conv.unread || !conv.is_read || false,
              role: partnerRole,
              email: conv.email || "",
              online: onlineUsers.has(partnerId),
              unread_count: conv.unread_count || (conv.is_read ? 0 : 1),
              profile_image: profileImage,
              last_sender_id: lastSenderId,
              is_own_message: isOwnMessage,
              last_message_content: lastMessageContent,
            }
          })
        )
      } else if (Array.isArray(data)) {
        messagesList = data
      }

      setMessages(messagesList)
      calculateTotalUnread(messagesList)
      console.log(`✅ Processed ${messagesList.length} conversations with fresh profile pictures`)
    } catch (error) {
      console.error("Error loading messages:", error)
      Alert.alert("Error", "Failed to load conversations. Please check your connection.")
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [userId, router, loadUserId, onlineUsers, calculateTotalUnread])

  const loadAvailableUsers = useCallback(async () => {
    if (!userId) return

    try {
      let url = `${API_BASE_URL}/available_users/?user_id=${userId}`
      if (searchText) {
        url += `&search=${encodeURIComponent(searchText)}`
      }
      if (roleFilter) {
        url += `&role=${encodeURIComponent(roleFilter)}`
      }

      console.log('🔍 Fetching users with URL:', url)
      console.log('🔍 Role filter:', roleFilter)

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ API Response:', data)
        console.log('👥 Number of users returned:', data.users?.length || 0)
        
        let users = data.users || []
        
        if (users.length > 0) {
          console.log('📋 Sample user roles:', users.slice(0, 3).map((u: any) => u.role))
          
          // Process users with enhanced profile picture handling
          const usersWithEnhancedProfiles = await Promise.all(
            users.map(async (user: any) => {
              const userRole = user.role?.toLowerCase()
              const userId = user.id || user.user_id

              console.log(`🔄 Processing user: ${user.name} (${userRole})`, {
                existingProfileImage: user.profile_image || user.avatar,
                userId: userId
              })

              // Always fetch fresh profile picture for users
              let profileImage = await fetchUserProfilePicture(userId, userRole)
              
              if (!profileImage) {
                // Handle CTU and DVMF profile pictures with local assets
                if (userRole === 'ctu_vet' || userRole === 'ctu-vetmed' || userRole === 'ctu-admin' || userRole === 'ctu_veterinarian') {
                  profileImage = 'CTU_LOGO'
                } else if (userRole === 'dvmf' || userRole === 'dvmf-admin' || userRole === 'dvmf_user') {
                  profileImage = 'DVMF_LOGO'
                } else {
                  profileImage = 'temporary'
                }
              }
              
              return {
                ...user,
                online: onlineUsers.has(userId.toString()),
                profile_image: profileImage,
                // Store all possible image fields for comprehensive handling
                op_image: user.op_image,
                kutsero_image: user.kutsero_image,
                vet_profile_photo: user.vet_profile_photo,
                ctu_profile_photo: user.ctu_profile_photo,
                dvmf_profile_photo: user.dvmf_profile_photo
              }
            })
          )
          
          setAvailableUsers(usersWithEnhancedProfiles)
          console.log('✅ Enhanced users loaded with profile pictures')
        } else {
          setAvailableUsers([])
        }
      } else {
        console.error('❌ API Error:', response.status, response.statusText)
        setAvailableUsers([])
      }
    } catch (error) {
      console.error("Error loading available users:", error)
      setAvailableUsers([])
    }
  }, [userId, searchText, roleFilter, onlineUsers])

  const loadChatMessages = useCallback(async (otherUserId: string) => {
    if (!userId || !otherUserId) return

    try {
      const response = await fetch(
        `${API_BASE_URL}/get_messages/?user_id=${userId}&other_user_id=${otherUserId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      )

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.messages) {
          const mappedMessages = data.messages.map((msg: any) => ({
            ...msg,
            date: msg.created_at || new Date().toISOString()
          }))
          setIndividualChatMessages(mappedMessages)
        }
      }
    } catch (error) {
      console.error("Error loading chat messages:", error)
    }
  }, [userId])

  const sendMessageToBackend = useCallback(async (receiverId: string, content: string) => {
    if (!userId) return null

    try {
      const response = await fetch(`${API_BASE_URL}/send_message/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender_id: userId,
          receiver_id: receiverId,
          content: content,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        return {
          ...data.message,
          date: data.message.created_at || new Date().toISOString()
        }
      } else {
        const errorData = await response.json()
        Alert.alert("Error", errorData.error || "Failed to send message")
        return null
      }
    } catch (error) {
      console.error("Error sending message:", error)
      Alert.alert("Error", "Failed to send message. Check your connection.")
      return null
    }
  }, [userId])

  const deleteMessage = async (contactId: string, contactName: string) => {
    try {
      const user = await loadUserId()
      if (!user) {
        console.log("No user logged in, cannot delete conversations.")
        return
      }

      console.log(`🗑️ Deleting conversation - User: ${user}, Contact: ${contactId}`)

      const response = await fetch(`${API_BASE_URL}/delete_conversation/`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user,
          contact_id: contactId,
        }),
      })

      if (response.ok) {
        setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== contactId))
        console.log(`✅ Deleted conversation with ${contactName} (ID: ${contactId})`)

        const result = await response.json()
        Alert.alert(
          "Success",
          result.note || "Conversation deleted successfully. The other person can still see all messages.",
        )
      } else {
        const error = await response.json()
        Alert.alert("Error", error.error || "Failed to delete conversation.")
      }
    } catch (error) {
      console.error("Error deleting message:", error)
      Alert.alert("Error", "Failed to delete conversation. Please try again.")
    }
  }

  const handleLongPress = (contactId: string, contactName: string) => {
    if (contactId === "ai_assistant") {
      return
    }

    Alert.alert(
      "Delete Conversation",
      `Do you want to delete your conversation with ${contactName}?\n\nNote: This will only hide it from your view. The other person can still see all messages.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMessage(contactId, contactName),
        },
      ],
    )
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadConversations()
    await loadAvailableUsers()
    setIsRefreshing(false)
  }

  useEffect(() => {
    const checkForDirectChat = async () => {
      if (params.openChat === "true" && params.contactId) {
        console.log("📨 Opening chat from Hcontact:", params.contactName)

        const user = await loadUserId()
        if (!user) {
          router.replace("/auth/login")
          return
        }

        setCurrentContact({
          id: params.contactId as string,
          name: params.contactName as string,
          avatar: params.contactAvatar as string,
          role: params.contactRole as string,
        })
        setShowChat(true)

        await loadChatMessages(params.contactId as string)
      }
    }

    checkForDirectChat()
  }, [
    params.openChat,
    params.contactId,
    params.contactName,
    params.contactAvatar,
    params.contactRole,
    loadUserId,
    router,
    loadChatMessages,
  ])

  useEffect(() => {
    if (!params.openChat) {
      loadConversations()
    }
  }, [loadConversations, params.openChat])

  useFocusEffect(
    useCallback(() => {
      if (!params.openChat) {
        loadConversations()
      }
    }, [loadConversations, params.openChat]),
  )

  useEffect(() => {
    if (userId) {
      if (activeTab === "users") {
        loadAvailableUsers()
      }
    }
  }, [searchText, roleFilter, activeTab, userId, loadAvailableUsers])

  const openChat = useCallback(
    (contact: any) => {
      let userId: string | undefined

      if (contact.partner_id) {
        userId = contact.partner_id
      } else if (contact.user_id) {
        userId = contact.user_id
      } else if (contact.id) {
        userId = contact.id
      }

      if (!userId) {
        Alert.alert("Error", "Unable to open chat. Invalid user ID.")
        return
      }

      setCurrentContact({
        id: userId,
        name: contact.sender || contact.name || "Unknown User",
        avatar: contact.avatar || contact.profile_image || "temporary",
        role: contact.role || "",
        email: contact.email || "",
        online: contact.online || false,
      })
      setShowChat(true)
      setChatInput("")
      setIndividualChatMessages([])
      loadChatMessages(userId)
    },
    [loadChatMessages],
  )

  const handleSendMessage = useCallback(
    async (isAIChat = true) => {
      if (!chatInput.trim()) return

      const currentDate = new Date()
      const userMessage: Message = {
        id: Date.now().toString(),
        text: chatInput.trim(),
        isUser: true,
        timestamp: currentDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        date: currentDate.toISOString(),
      }

      if (isAIChat) {
        setAiChatMessages((prev) => [...prev, userMessage])
        setChatInput("")

        try {
          const response = await fetch(`${API_BASE_URL}/ai_assistant/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: userData?.access_token ? `Bearer ${userData.access_token}` : "",
            },
            body: JSON.stringify({
              prompt: userMessage.text,
            }),
          })

          if (response.ok) {
            const data = await response.json()
            const aiText = data.answer || data.reply || "Sorry, I couldn't understand that."

            const responseDate = new Date()
            const responseMessage: Message = {
              id: (Date.now() + 1).toString(),
              text: aiText,
              isUser: false,
              timestamp: responseDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              date: responseDate.toISOString(),
            }

            setAiChatMessages((prev) => [...prev, responseMessage])
          } else {
            const errorDate = new Date()
            const errorMessage: Message = {
              id: (Date.now() + 1).toString(),
              text: "Sorry, I'm having trouble connecting to the server. Please try again later.",
              isUser: false,
              timestamp: errorDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              date: errorDate.toISOString(),
            }
            setAiChatMessages((prev) => [...prev, errorMessage])
          }
        } catch {
          const errorDate = new Date()
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: "Sorry, I'm having trouble connecting. Please check your internet connection.",
            isUser: false,
            timestamp: errorDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            date: errorDate.toISOString(),
          }
          setAiChatMessages((prev) => [...prev, errorMessage])
        }
      } else {
        if (!currentContact?.id) {
          console.error("❌ No currentContact ID:", currentContact?.id)
          Alert.alert("Error", "Cannot send message. Invalid recipient.")
          return
        }

        console.log("📤 Sending message to:", currentContact.id)

        setIndividualChatMessages((prev) => [...prev, userMessage])
        setChatInput("")

        const sentMessage = await sendMessageToBackend(currentContact.id, userMessage.text)

        if (!sentMessage) {
          console.error("❌ Failed to send message")
          setIndividualChatMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id))
        } else {
          console.log("✅ Message sent successfully:", sentMessage)
          setIndividualChatMessages((prev) => 
            prev.map((msg) => msg.id === userMessage.id ? { ...msg, ...sentMessage } : msg)
          )
        }
      }
    },
    [chatInput, currentContact, userData, sendMessageToBackend],
  )

  const handleBackFromChat = useCallback(() => {
    setShowChat(false)
    setCurrentContact(null)
    loadConversations()
  }, [loadConversations])

  const handleBackFromAI = useCallback(() => setShowAIChat(false), [])

  const handleAISendMessage = useCallback(() => handleSendMessage(true), [handleSendMessage])
  const handleIndividualSendMessage = useCallback(() => handleSendMessage(false), [handleSendMessage])

  const handleChatInputChange = useCallback((text: string) => setChatInput(text), [])

  const handleShowAIChat = useCallback(() => {
    if (isOperator) {
      setShowAIChat(true)
    } else {
      Alert.alert("Access Denied", "AI Assistant is only available for Horse Operators.", [{ text: "OK" }])
    }
  }, [isOperator])

  const handleNavigateToProfile = useCallback(() => {
    if (!currentContact) return

    if (currentContact.role === "veterinarian" || currentContact.role === "ctu_vet") {
      router.push({
        pathname: "../HORSE_OPERATOR/Hvetprofile",
        params: {
          vetId: currentContact.id,
          vetAvatar: currentContact.avatar,
        },
      })
    } else {
      router.push({
        pathname: "../HORSE_OPERATOR/Hallprofile",
        params: {
          userId: currentContact.id,
          userName: currentContact.name,
          userAvatar: currentContact.avatar,
        },
      })
    }
  }, [currentContact, router])

  const filteredConversations = messages.filter(
    (message) =>
      message.name.toLowerCase().includes(searchText.toLowerCase()) ||
      message.message.toLowerCase().includes(searchText.toLowerCase()) ||
      (message.role && message.role.toLowerCase().includes(searchText.toLowerCase())),
  )

  const filteredUsers = availableUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (user.role && user.role.toLowerCase().includes(searchText.toLowerCase())),
  )

  // ENHANCED: Function to get profile picture with comprehensive handling including temporary profiles
  const getProfilePicture = (user: AvailableUser | ChatMessage) => {
    const userRole = user.role?.toLowerCase()
    const userName = user.name || 'Unknown User'
    
    // Collect all possible image fields
    const possibleImages = [
      user.profile_image,
      user.avatar,
      (user as AvailableUser).op_image,
      (user as AvailableUser).kutsero_image,
      (user as AvailableUser).vet_profile_photo,
      (user as AvailableUser).ctu_profile_photo,
      (user as AvailableUser).dvmf_profile_photo
    ]
    
    console.log(`🖼️ Processing profile picture for: ${userName}`, {
      role: userRole,
      possibleImages: possibleImages.filter(img => img),
      hasProfileImage: !!user.profile_image
    })
    
    // Handle CTU role - use CTU logo
    if (userRole === 'ctu_vet' || userRole === 'ctu-vetmed' || userRole === 'ctu-admin' || userRole === 'ctu_veterinarian') {
      return { type: 'local' as const, source: require("../../assets/images/CTU.jpg") }
    }
    
    // DVMF role - use DVMF logo  
    if (userRole === 'dvmf' || userRole === 'dvmf-admin' || userRole === 'dvmf_user') {
      return { type: 'local' as const, source: require("../../assets/images/DVMF.png") }
    }
    
    // Check all possible image sources
    for (const image of possibleImages) {
      if (!image) continue
      
      // Handle temporary profile indicator
      if (image === 'temporary') {
        // Generate temporary profile based on name and role
        const tempProfile = generateTemporaryProfile(userName, userRole)
        return {
          type: 'temporary' as const,
          backgroundColor: tempProfile.backgroundColor,
          initials: tempProfile.initials,
          color: tempProfile.color
        }
      }
      
      // Handle local asset references
      if (image === 'CTU_LOGO') {
        return { type: 'local' as const, source: require("../../assets/images/CTU.jpg") }
      }
      if (image === 'DVMF_LOGO') {
        return { type: 'local' as const, source: require("../../assets/images/DVMF.png") }
      }
      
      // Handle URL images
      if (typeof image === 'string' && (image.startsWith('http') || image.startsWith('file:'))) {
        try {
          return { type: 'uri' as const, uri: image }
        } catch {
          console.log('❌ Invalid image URL:', image)
          continue
        }
      }
      
      // Handle base64 images
      if (typeof image === 'string' && image.startsWith('data:image')) {
        return { type: 'uri' as const, uri: image }
      }
    }
    
    // No valid image found - generate temporary profile
    console.log(`🔄 Generating temporary profile for: ${userName}`)
    const tempProfile = generateTemporaryProfile(userName, userRole)
    return {
      type: 'temporary' as const,
      backgroundColor: tempProfile.backgroundColor,
      initials: tempProfile.initials,
      color: tempProfile.color
    }
  }

  // FIXED: Enhanced function to handle profile pictures for both conversations and users
  const renderAvatarWithStatus = (item: any, isConversation: boolean = false) => {
    const name = item.sender || item.name || item.partner_name || 'Unknown User'
    const role = item.role || ''
    const isOnline = item.online || false
    
    console.log(`🖼️ Rendering avatar for: ${name}`, {
      role: role,
      isConversation: isConversation,
      profile_image: item.profile_image,
      avatar: item.avatar
    })
    
    // Get profile picture using the enhanced logic
    const profilePicture = getProfilePicture(item)

    return (
      <View style={styles.avatarWrapper}>
        <View style={styles.avatarContainer}>
          {profilePicture.type === 'temporary' ? (
            <View style={[
              styles.initialsContainer,
              { backgroundColor: profilePicture.backgroundColor }
            ]}>
              <Text style={[styles.initialsText, { color: profilePicture.color }]}>
                {profilePicture.initials}
              </Text>
            </View>
          ) : profilePicture.type === 'uri' ? (
            <Image
              source={{ uri: profilePicture.uri }}
              style={styles.avatarImage}
              resizeMode="cover"
              onError={() => {
                console.log('❌ Image failed to load, falling back to temporary profile')
                // Generate temporary profile as fallback
                const tempProfile = generateTemporaryProfile(name, role)
                return (
                  <View style={[
                    styles.initialsContainer,
                    { backgroundColor: tempProfile.backgroundColor }
                  ]}>
                    <Text style={[styles.initialsText, { color: tempProfile.color }]}>
                      {tempProfile.initials}
                    </Text>
                  </View>
                )
              }}
            />
          ) : profilePicture.type === 'local' ? (
            <Image
              source={profilePicture.source}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            // Final fallback - generate temporary profile
            (() => {
              const tempProfile = generateTemporaryProfile(name, role)
              return (
                <View style={[
                  styles.initialsContainer,
                  { backgroundColor: tempProfile.backgroundColor }
                ]}>
                  <Text style={[styles.initialsText, { color: tempProfile.color }]}>
                    {tempProfile.initials}
                  </Text>
                </View>
              )
            })()
          )}
        </View>
        {isOnline && (
          <View style={styles.onlineIndicator}>
            <View style={styles.onlineIndicatorDot} />
          </View>
        )}
      </View>
    )
  }

  // UPDATED: Function to render conversation item with new display format including "You:" prefix
  const renderConversationItem = (message: ChatMessage) => {
    const isOwnLastMessage = message.is_own_message
    
    return (
      <TouchableOpacity
        key={message.id}
        style={styles.messageItem}
        onPress={() => openChat(message)}
        onLongPress={() => handleLongPress(message.id, message.name)}
        activeOpacity={0.7}
      >
        <View style={styles.messageLeft}>
          {renderAvatarWithStatus(message, true)}
        </View>
        <View style={styles.messageContent}>
          <View style={styles.messageHeader}>
            <View style={styles.nameWithStatus}>
              <Text style={styles.senderName}>{message.name}</Text>
              {message.online && (
                <Text style={styles.onlineText}>● Online</Text>
              )}
            </View>
            <Text style={styles.timestamp}>
              {message.time}
            </Text>
          </View>
          
          {/* UPDATED: Display role first, then message preview */}
          <Text style={styles.roleText}>{message.role?.replace("_", " ") || "User"}</Text>
          
          <Text 
            style={[
              styles.messagePreview, 
              isOwnLastMessage && styles.ownMessagePreview
            ]} 
            numberOfLines={1}
          >
            {message.message}
          </Text>
        </View>
        {(message.unread) && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{message.unread_count || 1}</Text>
          </View>
        )}
      </TouchableOpacity>
    )
  }

  if (showAIChat) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ChatInterface
          isAIChat={true}
          messages={aiChatMessages}
          title="EchoCare AI"
          onBack={handleBackFromAI}
          chatInput={chatInput}
          onChatInputChange={handleChatInputChange}
          onSendMessage={handleAISendMessage}
          safeArea={safeArea}
          isOnline={true}
        />
      </SafeAreaView>
    )
  }

  if (showChat && currentContact) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ChatInterface
          isAIChat={false}
          messages={individualChatMessages}
          title={currentContact.name}
          onBack={handleBackFromChat}
          chatInput={chatInput}
          onChatInputChange={handleChatInputChange}
          onSendMessage={handleIndividualSendMessage}
          safeArea={safeArea}
          onHeaderPress={handleNavigateToProfile}
          isOnline={currentContact.online}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#CD853F" translucent={false} />
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: safeArea.top }]}>
          <View style={styles.headerCenter}>
            <Text style={styles.mainHeaderTitle}>Messages</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchWrapper}>
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder={activeTab === "conversations" ? "Search conversations..." : "Search users..."}
              placeholderTextColor="#999"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText("")} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabSwitcherButton, activeTab === "conversations" && styles.activeTabSwitcher]}
            onPress={() => setActiveTab("conversations")}
          >
            <Text style={[styles.tabSwitcherText, activeTab === "conversations" && styles.activeTabSwitcherText]}>
              Conversations
            </Text>
            {messages.filter((c) => c.unread).length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{messages.filter((c) => c.unread).length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabSwitcherButton, activeTab === "users" && styles.activeTabSwitcher]}
            onPress={() => setActiveTab("users")}
          >
            <Text style={[styles.tabSwitcherText, activeTab === "users" && styles.activeTabSwitcherText]}>All Users</Text>
          </TouchableOpacity>
        </View>

        {activeTab === "users" && (
          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <TouchableOpacity
                style={[styles.filterChip, roleFilter === "" && styles.activeFilterChip]}
                onPress={() => setRoleFilter("")}
              >
                <Text style={[styles.filterChipText, roleFilter === "" && styles.activeFilterChipText]}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, roleFilter === "kutsero" && styles.activeFilterChip]}
                onPress={() => setRoleFilter("kutsero")}
              >
                <Text style={[styles.filterChipText, roleFilter === "kutsero" && styles.activeFilterChipText]}>
                  Kutsero
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, roleFilter === "Kutsero President" && styles.activeFilterChip]}
                onPress={() => setRoleFilter("Kutsero President")}
              >
                <Text style={[styles.filterChipText, roleFilter === "Kutsero President" && styles.activeFilterChipText]}>
                  Kutsero President
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, roleFilter === "Vet" && styles.activeFilterChip]}
                onPress={() => setRoleFilter("Vet")}
              >
                <Text style={[styles.filterChipText, roleFilter === "Vet" && styles.activeFilterChipText]}>
                  Veterinarian
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, roleFilter === "ctu_vet" && styles.activeFilterChip]}
                onPress={() => setRoleFilter("ctu_vet")}
              >
                <Text style={[styles.filterChipText, roleFilter === "ctu_vet" && styles.activeFilterChipText]}>
                  CTU Vet
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, roleFilter === "Dvmf" && styles.activeFilterChip]}
                onPress={() => setRoleFilter("Dvmf")}
              >
                <Text style={[styles.filterChipText, roleFilter === "Dvmf" && styles.activeFilterChipText]}>
                  DVMF
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, roleFilter === "horse_operator" && styles.activeFilterChip]}
                onPress={() => setRoleFilter("horse_operator")}
              >
                <Text style={[styles.filterChipText, roleFilter === "horse_operator" && styles.activeFilterChipText]}>
                  Horse Operator
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={["#CD853F"]} />}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#CD853F" />
              <Text style={styles.loadingText}>Loading conversations...</Text>
            </View>
          ) : activeTab === "conversations" ? (
            filteredConversations.length > 0 ? (
              filteredConversations.map(renderConversationItem)
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No conversations yet</Text>
                <Text style={styles.emptyStateSubtext}>Start a conversation from the Users tab</Text>
              </View>
            )
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <TouchableOpacity key={user.id} style={styles.userItem} onPress={() => openChat(user)} activeOpacity={0.7}>
                <View style={styles.messageLeft}>
                  {renderAvatarWithStatus(user, false)}
                </View>
                <View style={styles.messageContent}>
                  <View style={styles.nameWithStatus}>
                    <Text style={styles.senderName}>{user.name}</Text>
                    {user.online && (
                      <Text style={styles.onlineText}>● Online</Text>
                    )}
                  </View>
                  {user.email && <Text style={styles.userEmail}>{user.email}</Text>}
                  <View style={styles.userInfoRow}>
                    <Text style={styles.roleText}>{user.role?.replace("_", " ") || "User"}</Text>
                  </View>
                </View>
                <View style={styles.chatIconContainer}>
                  <Text style={styles.chatIcon}>💬</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No users found</Text>
              <Text style={styles.emptyStateSubtext}>Try adjusting your search or filter</Text>
            </View>
          )}
        </ScrollView>

        {isOperator && (
          <TouchableOpacity
            style={[styles.floatingAI, { bottom: dynamicSpacing(80) + safeArea.bottom }]}
            onPress={handleShowAIChat}
            activeOpacity={0.8}
          >
            <View style={styles.aiCircle}>
              <Text style={styles.aiText}>AI</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Bottom Navigation */}
        <View style={[styles.tabBar, { paddingBottom: safeArea.bottom }]}>
          <TabButton 
            iconSource={require("../../assets/images/home.png")} 
            label="Home" 
            isActive={false}
            onPress={() => router.push("/HORSE_OPERATOR/home" as any)} 
          />
          <TabButton
            iconSource={require("../../assets/images/horse.png")}
            label="Horses"
            isActive={false}
            onPress={() => router.push("../HORSE_OPERATOR/horse" as any)}
          />
          <TabButton
            iconSource={require("../../assets/images/chat.png")}
            label="Chat"
            isActive={true}
            onPress={() => router.push("../HORSE_OPERATOR/Hmessage" as any)}
          />
          <TabButton
            iconSource={require("../../assets/images/calendar.png")}
            label="Calendar"
            isActive={false}
            onPress={() => router.push("../HORSE_OPERATOR/Hcalendar" as any)}
          />
          <TabButton
            iconSource={require("../../assets/images/profile.png")}
            label="Profile"
            isActive={false}
            onPress={() => router.push("../HORSE_OPERATOR/profile" as any)}
          />
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    backgroundColor: "#CD853F",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingBottom: dynamicSpacing(12),
    minHeight: verticalScale(50),
  },
  headerLeft: {
    width: scale(60),
  },
  backButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(12),
  },
  backButtonText: {
    color: "white",
    fontSize: moderateScale(18),
    fontWeight: "bold",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "white",
    textAlign: "center",
    marginTop: verticalScale(12),
  },
  headerSubtitle: {
    fontSize: moderateScale(10),
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginTop: verticalScale(2),
  },
  headerRight: {
    alignItems: "flex-end",
    width: scale(60),
    justifyContent: "center",
  },
  searchIconButton: {
    width: scale(32),
    height: scale(32),
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: scale(16),
    justifyContent: "center",
    alignItems: "center",
  },
  userName: {
    fontSize: moderateScale(12),
    color: "white",
    fontWeight: "500",
  },
  aiStatusIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiStatusDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: "#4CAF50",
    marginRight: scale(4),
  },
  offlineDot: {
    backgroundColor: "#999",
  },
  aiStatusText: {
    fontSize: moderateScale(10),
    color: "white",
    fontWeight: "500",
  },
  searchContainer: {
    backgroundColor: "#CD853F",
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(12),
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: scale(20),
    paddingHorizontal: scale(12),
    height: verticalScale(40),
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(14),
    color: "#333",
  },
  clearButton: {
    padding: scale(4),
  },
  clearButtonText: {
    fontSize: moderateScale(16),
    color: "#999",
  },
  tabSwitcher: {
    flexDirection: "row",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  tabSwitcherButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(12),
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTabSwitcher: {
    borderBottomColor: "#CD853F",
  },
  tabSwitcherText: {
    fontSize: moderateScale(14),
    fontWeight: "500",
    color: "#666",
  },
  activeTabSwitcherText: {
    color: "#CD853F",
    fontWeight: "600",
  },
  tabBadge: {
    backgroundColor: "#FF5252",
    borderRadius: scale(10),
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    marginLeft: scale(6),
    minWidth: scale(20),
    alignItems: "center",
  },
  tabBadgeText: {
    color: "white",
    fontSize: moderateScale(10),
    fontWeight: "bold",
  },
  filterContainer: {
    backgroundColor: "white",
    paddingVertical: verticalScale(8),
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  filterScroll: {
    paddingHorizontal: scale(16),
  },
  filterChip: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    backgroundColor: "#F0F0F0",
    marginRight: scale(8),
  },
  activeFilterChip: {
    backgroundColor: "#CD853F",
  },
  filterChipText: {
    fontSize: moderateScale(12),
    fontWeight: "500",
    color: "#666",
  },
  activeFilterChipText: {
    color: "white",
  },
  content: {
    flex: 1,
    backgroundColor: "white",
  },
  messageItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  messageLeft: {
    marginRight: scale(12),
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarContainer: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
  },
  initialsContainer: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: "#CD853F",
    justifyContent: "center",
    alignItems: "center",
  },
  initialsText: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "white",
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: scale(2),
    right: scale(2),
    width: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  onlineIndicatorDot: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: '#44b700',
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(4),
  },
  nameWithStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  senderName: {
    fontSize: moderateScale(15),
    fontWeight: "600",
    color: "#333",
  },
  onlineText: {
    fontSize: moderateScale(10),
    color: '#44b700',
    marginLeft: scale(6),
    fontWeight: '600',
  },
  timestamp: {
    fontSize: moderateScale(11),
    color: "#999",
  },
  messagePreview: {
    fontSize: moderateScale(13),
    color: "#666",
    lineHeight: moderateScale(18),
    marginTop: verticalScale(2),
  },
  ownMessagePreview: {
    color: "#CD853F",
    fontWeight: "500",
  },
  roleText: {
    fontSize: moderateScale(11),
    color: "#999",
    textTransform: "capitalize",
  },
  userEmail: {
    fontSize: moderateScale(12),
    color: "#999",
    marginTop: verticalScale(2),
  },
  userInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: verticalScale(4),
  },
  unreadBadge: {
    backgroundColor: "#CD853F",
    borderRadius: scale(12),
    width: scale(24),
    height: scale(24),
    justifyContent: "center",
    alignItems: "center",
    marginLeft: scale(8),
  },
  unreadBadgeText: {
    color: "white",
    fontSize: moderateScale(11),
    fontWeight: "bold",
  },
  chatIconContainer: {
    marginLeft: scale(8),
  },
  chatIcon: {
    fontSize: moderateScale(20),
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(60),
    paddingHorizontal: scale(40),
  },
  emptyStateText: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(8),
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: moderateScale(13),
    color: "#999",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: verticalScale(50),
  },
  loadingText: {
    fontSize: moderateScale(14),
    color: "#666",
    marginTop: verticalScale(10),
  },
  chatContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  chatContent: {
    padding: scale(16),
    paddingBottom: scale(20),
  },
  messageContainer: {
    marginBottom: verticalScale(4),
    flexDirection: "column",
    width: "100%",
  },
  userMessageContainer: {
    alignItems: "flex-end",
  },
  aiMessageContainer: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(16),
    marginBottom: verticalScale(2),
  },
  userMessageBubble: {
    backgroundColor: "#CD853F",
    borderBottomRightRadius: scale(4),
  },
  aiMessageBubble: {
    backgroundColor: "white",
    borderBottomLeftRadius: scale(4),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: moderateScale(14),
    lineHeight: moderateScale(18),
  },
  userMessageText: {
    color: "white",
  },
  aiMessageText: {
    color: "#333",
  },
  messageTime: {
    fontSize: moderateScale(10),
    marginHorizontal: scale(8),
    marginBottom: verticalScale(8),
    textAlign: "center",
  },
  userMessageTime: {
    color: "#999",
  },
  aiMessageTime: {
    color: "#999",
  },
  dateLabelContainer: {
    alignItems: "center",
    marginVertical: verticalScale(16),
  },
  dateLabel: {
    fontSize: moderateScale(12),
    color: "#999",
    fontWeight: "500",
    backgroundColor: "#E8E8E8",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
  },
  chatInputContainer: {
    flexDirection: "row",
    paddingHorizontal: scale(12),
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(10),
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    alignItems: "flex-end",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 5,
  },
  inputWrapper: {
    flex: 1,
    marginRight: scale(8),
    backgroundColor: "transparent",
  },
  chatInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: scale(20),
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(10),
    fontSize: moderateScale(14),
    maxHeight: verticalScale(120),
    minHeight: verticalScale(44),
    color: "#333333",
    backgroundColor: "#FFFFFF",
    textAlignVertical: 'center',
  },
  sendButton: {
    backgroundColor: "#CD853F",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    borderRadius: scale(20),
    justifyContent: "center",
    alignItems: "center",
    minHeight: verticalScale(44),
    shadowColor: "#CD853F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  sendButtonText: {
    color: "white",
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  floatingAI: {
    position: "absolute",
    right: scale(16),
    zIndex: 1000,
  },
  aiCircle: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: "#4A90E2",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  aiText: {
    color: "white",
    fontSize: moderateScale(16),
    fontWeight: "bold",
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
  navItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: verticalScale(4),
    paddingHorizontal: scale(2),
  },
  navIcon: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(2),
  },
  activeNavIcon: {
    backgroundColor: "#CD853F",
  },
  navLabel: {
    fontSize: moderateScale(9),
    color: "#666",
    textAlign: "center",
  },
  activeNavLabel: {
    color: "#CD853F",
    fontWeight: "600",
  },
  mainHeaderTitle: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "white",
    textAlign: "center",
    marginTop: verticalScale(12),
  },
})

export default MessageScreen