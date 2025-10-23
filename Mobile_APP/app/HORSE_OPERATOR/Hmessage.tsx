"use client"

// Hmessage.tsx - COMPLETE UPDATED VERSION
// Fully integrated with Django backend API
// Enhanced with proper error handling and message display
// REMOVED POLLING - Now uses focus-based refresh and event-driven updates

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
} from "react-native"
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router"
import { FontAwesome5 } from "@expo/vector-icons"
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
}

interface BackendMessage {
  id: string
  text: string
  content?: string
  isUser: boolean
  isOwn?: boolean
  timestamp: string
  is_read?: boolean
}

interface BackendConversation {
  partner_id: string
  partner_name?: string
  sender?: string
  avatar?: string
  last_message?: string
  preview?: string
  last_message_time?: string
  timestamp?: string
  unread?: boolean
  is_read?: boolean
}

interface Message {
  id: string
  text: string
  isOutgoing?: boolean
  isUser?: boolean
  timestamp: string
  isRead?: boolean
}

const API_BASE_URL = "http://192.168.101.2:8000/api/horse_operator"

// Helper function for formatting message content
const formatMessageContent = (content: string, maxLength = 50): string => {
  if (!content) return ""
  return content.length > maxLength ? `${content.substring(0, maxLength)}...` : content
}

// Utility function to format message timestamps
const formatMessageTimestamp = (timestamp: string): string => {
  try {
    const messageDate = new Date(timestamp)
    const now = new Date()

    const phTimeZone = "Asia/Manila"

    // Get the time in Manila timezone using Intl API for proper conversion
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: phTimeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })

    const messageParts = formatter.formatToParts(messageDate)
    const nowParts = formatter.formatToParts(now)

    // Extract date components
    const messageYear = messageParts.find((p) => p.type === "year")?.value
    const messageMonth = messageParts.find((p) => p.type === "month")?.value
    const messageDay = messageParts.find((p) => p.type === "day")?.value
    const messageHour = messageParts.find((p) => p.type === "hour")?.value
    const messageMinute = messageParts.find((p) => p.type === "minute")?.value

    const nowYear = nowParts.find((p) => p.type === "year")?.value
    const nowMonth = nowParts.find((p) => p.type === "month")?.value
    const nowDay = nowParts.find((p) => p.type === "day")?.value

    // Create comparable date strings (YYYY-MM-DD)
    const messageDateStr = `${messageYear}-${messageMonth}-${messageDay}`
    const nowDateStr = `${nowYear}-${nowMonth}-${nowDay}`

    // Calculate yesterday
    const yesterdayDate = new Date(now)
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterdayParts = formatter.formatToParts(yesterdayDate)
    const yesterdayYear = yesterdayParts.find((p) => p.type === "year")?.value
    const yesterdayMonth = yesterdayParts.find((p) => p.type === "month")?.value
    const yesterdayDay = yesterdayParts.find((p) => p.type === "day")?.value
    const yesterdayDateStr = `${yesterdayYear}-${yesterdayMonth}-${yesterdayDay}`

    // Format time in 12-hour format
    const hour12 = Number.parseInt(messageHour || "0") % 12 || 12
    const ampm = Number.parseInt(messageHour || "0") >= 12 ? "PM" : "AM"
    const timeString = `${hour12}:${messageMinute} ${ampm}`

    if (messageDateStr === nowDateStr) {
      return timeString
    } else if (messageDateStr === yesterdayDateStr) {
      return `Yesterday ${timeString}`
    } else {
      const dayFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: phTimeZone,
        weekday: "short",
      })
      const dayName = dayFormatter.format(messageDate)
      return `${dayName} ${timeString}`
    }
  } catch (error) {
    console.error("Error formatting timestamp:", error)
    // Fallback formatting
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    } catch {
      return timestamp
    }
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
  } catch (error) {
    console.error("Error checking user role:", error)
    return false
  }
}

// Real Chat Interface Component
const RealChatInterface = ({
  contactId,
  contactName,
  contactAvatar,
  userId,
  contactRole,
  onBack,
  safeArea,
}: {
  contactId: string
  contactName: string
  contactAvatar: string
  userId: string
  contactRole: string
  onBack: () => void
  safeArea: { top: number; bottom: number }
}) => {
  const [messageText, setMessageText] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [sending, setSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(userId)

  const router = useRouter()
  const scrollViewRef = useRef<ScrollView>(null)

  const loadUserId = useCallback(async () => {
    try {
      const userData = await SecureStore.getItemAsync("user_data")
      if (userData) {
        const parsed = JSON.parse(userData)
        return parsed.user_id || parsed.id
      }
    } catch (error) {
      console.error("Error loading user data:", error)
    }
    return null
  }, [])

  const loadChatMessages = useCallback(
    async (showLoadingSpinner = false) => {
      try {
        if (!contactId || contactId === "ai_assistant") {
          setInitialLoadComplete(true)
          return
        }

        const uid = currentUserId || userId || (await loadUserId())
        if (!uid) {
          console.warn("No user ID available")
          setInitialLoadComplete(true)
          return
        }

        if (!currentUserId) {
          setCurrentUserId(uid)
        }

        if (showLoadingSpinner) {
          setLoading(true)
        }

        // Updated API endpoint to match backend
        const response = await fetch(`${API_BASE_URL}/get_messages/?user_id=${uid}&other_user_id=${contactId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const data = await response.json()

          // Backend returns {success: true, messages: [...]}
          if (data.success && Array.isArray(data.messages)) {
            const formattedMessages = data.messages.map((msg: BackendMessage) => ({
              id: msg.id,
              text: msg.text,
              isOutgoing: msg.isUser,
              timestamp: msg.timestamp,
              isRead: true,
            }))
            setMessages(formattedMessages)
          } else if (Array.isArray(data)) {
            const formattedMessages = data.map((msg: BackendMessage) => ({
              id: msg.id,
              text: msg.text || msg.content || "",
              isOutgoing: msg.isUser || msg.isOwn || false,
              timestamp: msg.timestamp,
              isRead: msg.is_read || true,
            }))
            setMessages(formattedMessages)
          } else {
            console.warn("Unexpected backend response format:", data)
            setMessages([])
          }
        } else {
          if (!initialLoadComplete) {
            console.log("No existing conversation - ready to start fresh")
          }
          setMessages([])
        }
      } catch (error) {
        if (!initialLoadComplete) {
          console.log("Starting fresh conversation")
        }
        console.error("Error loading messages:", error)
        setMessages([])
      } finally {
        setLoading(false)
        setInitialLoadComplete(true)
      }
    },
    [contactId, userId, currentUserId, loadUserId, initialLoadComplete],
  )

  // Mark messages as read when opening chat
  useEffect(() => {
    const markAsRead = async () => {
      try {
        const uid = currentUserId || userId || (await loadUserId())
        if (!uid || !contactId || contactId === "ai_assistant") return

        // Messages are automatically marked as read by the backend when fetched
        console.log(`✅ Messages loaded for conversation with ${contactId}`)
      } catch (error) {
        console.error("Error in message loading:", error)
      }
    }

    if (initialLoadComplete && contactId && contactId !== "ai_assistant") {
      markAsRead()
    }
  }, [contactId, userId, currentUserId, initialLoadComplete, loadUserId])

  // Load messages once on mount
  useEffect(() => {
    loadChatMessages(true)
  }, [loadChatMessages])

  useFocusEffect(
    useCallback(() => {
      if (initialLoadComplete && contactId && contactId !== "ai_assistant") {
        loadChatMessages(false)
      }
    }, [initialLoadComplete, contactId, loadChatMessages]),
  )

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }, [messages])

  const sendMessage = useCallback(async () => {
    if (messageText.trim() && !sending) {
      const uid = currentUserId || userId || (await loadUserId())
      if (!uid) {
        alert("Please log in to send messages")
        return
      }

      const messageToSend = messageText.trim()
      const currentTimestamp = new Date().toISOString()

      const optimisticMessage: Message = {
        id: `temp_${Date.now()}`,
        text: messageToSend,
        isOutgoing: true,
        timestamp: formatMessageTimestamp(currentTimestamp),
        isRead: false,
      }

      setMessages((prev) => [...prev, optimisticMessage])
      setMessageText("")
      setSending(true)

      try {
        // Updated API endpoint to match backend
        const response = await fetch(`${API_BASE_URL}/send_message/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sender_id: uid,
            receiver_id: contactId,
            content: messageToSend,
          }),
        })

        if (response.ok) {
          const data = await response.json()

          // Backend returns {success: true, message: {...}}
          if (data.success && data.message) {
            // Remove optimistic message and add real one
            setMessages((prev) => {
              const filtered = prev.filter((m) => m.id !== optimisticMessage.id)
              return [
                ...filtered,
                {
                  id: data.message.id,
                  text: data.message.text,
                  isOutgoing: true,
                  timestamp: data.message.timestamp,
                  isRead: false,
                },
              ]
            })
          } else {
            // Fallback: just remove optimistic and reload
            setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id))
            await loadChatMessages(false)
          }
        } else {
          console.error("Failed to send message:", response.status)
          setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id))
          alert("Failed to send message. Please try again.")
        }
      } catch (error) {
        console.error("Error sending message:", error)
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id))
        alert("Failed to send message. Please check your connection.")
      } finally {
        setSending(false)
      }
    }
  }, [messageText, sending, userId, currentUserId, contactId, loadUserId, loadChatMessages])

  const handleContactPress = useCallback(() => {
    if (contactRole === "veterinarian" || contactRole === "ctu_vet") {
      router.push({
        pathname: "../HORSE_OPERATOR/Hvetprofile",
        params: {
          vetId: contactId,
          vetAvatar: contactAvatar,
        },
      })
    } else {
      router.push({
        pathname: "../HORSE_OPERATOR/Hallprofile",
        params: {
          userId: contactId,
          userName: contactName,
          userAvatar: contactAvatar,
        },
      })
    }
  }, [contactRole, contactId, contactAvatar, contactName, router])

  const handleBookAppointment = useCallback(() => {
    router.push({
      pathname: "../HORSE_OPERATOR/Hvetprofile",
      params: {
        vetId: contactId,
        vetAvatar: contactAvatar,
      },
    })
  }, [router, contactId, contactAvatar])

  if (loading && !initialLoadComplete) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#CD853F" />
        <Text style={styles.loadingText}>Opening chat...</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <StatusBar barStyle="light-content" backgroundColor="#CD853F" translucent={false} />

      <View style={[styles.chatHeader, { paddingTop: safeArea.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <FontAwesome5 name="arrow-left" size={scale(18)} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.contactInfo} onPress={handleContactPress} activeOpacity={0.7}>
          <Image source={{ uri: contactAvatar }} style={styles.contactAvatarHeader} />
          <Text style={styles.chatHeaderTitle}>{contactName}</Text>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerActionButton}>
            <FontAwesome5 name="phone" size={scale(16)} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.messagesContainer}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <FontAwesome5 name="comment-dots" size={scale(50)} color="#E0E0E0" />
              <Text style={styles.emptyStateText}>No messages yet</Text>
              <Text style={styles.emptyStateSubtext}>Send a message to start the conversation</Text>
            </View>
          ) : (
            messages.map((message) => (
              <View
                key={message.id}
                style={[styles.messageWrapper, message.isOutgoing ? styles.outgoingWrapper : styles.incomingWrapper]}
              >
                <View
                  style={[styles.messageBubble, message.isOutgoing ? styles.outgoingBubble : styles.incomingBubble]}
                >
                  <Text style={[styles.messageText, message.isOutgoing ? styles.outgoingText : styles.incomingText]}>
                    {message.text}
                  </Text>
                </View>
                <Text
                  style={[styles.timestamp, message.isOutgoing ? styles.outgoingTimestamp : styles.incomingTimestamp]}
                >
                  {message.timestamp}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {(contactRole === "veterinarian" || contactRole === "ctu_vet") && (
        <TouchableOpacity style={styles.floatingButton} onPress={handleBookAppointment} activeOpacity={0.8}>
          <FontAwesome5 name="calendar-alt" size={scale(22)} color="#fff" />
        </TouchableOpacity>
      )}

      <View style={[styles.chatInputContainer, { paddingBottom: Math.max(safeArea.bottom, 8) }]}>
        <TouchableOpacity style={styles.attachmentButton} activeOpacity={0.7}>
          <FontAwesome5 name="paperclip" size={scale(18)} color="#CD853F" />
        </TouchableOpacity>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.chatInput}
            placeholder="Message..."
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
            placeholderTextColor="#999"
            editable={!sending}
            returnKeyType="default"
            blurOnSubmit={false}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.sendButton,
            messageText.trim() && !sending ? styles.sendButtonActive : styles.sendButtonInactive,
          ]}
          onPress={sendMessage}
          disabled={!messageText.trim() || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <FontAwesome5
              name="paper-plane"
              size={scale(16)}
              color={messageText.trim() && !sending ? "#fff" : "#999"}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

// AI Chat Interface Component
const AIChatInterface = ({
  messages,
  onBack,
  chatInput,
  onChatInputChange,
  onSendMessage,
  safeArea,
}: {
  messages: Message[]
  onBack: () => void
  chatInput: string
  onChatInputChange: (text: string) => void
  onSendMessage: () => void
  safeArea: { top: number; bottom: number }
}) => {
  const scrollViewRef = useRef<ScrollView>(null)

  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }, [messages])

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="light-content" backgroundColor="#CD853F" translucent={false} />

      <View style={[styles.chatHeader, { paddingTop: safeArea.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.chatHeaderTitle}>EchoCare AI</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.aiStatusIndicator}>
            <View style={styles.aiStatusDot} />
            <Text style={styles.aiStatusText}>Online</Text>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.chatContainer}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[styles.messageContainer, message.isUser ? styles.userMessageContainer : styles.aiMessageContainer]}
          >
            <View style={[styles.messageBubble, message.isUser ? styles.userMessageBubble : styles.aiMessageBubble]}>
              <Text style={[styles.messageText, message.isUser ? styles.userMessageText : styles.aiMessageText]}>
                {message.text}
              </Text>
              <Text style={[styles.messageTime, message.isUser ? styles.userMessageTime : styles.aiMessageTime]}>
                {message.timestamp}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.chatInputContainer, { paddingBottom: Math.max(safeArea.bottom, 8) }]}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.chatInput}
            value={chatInput}
            onChangeText={onChatInputChange}
            placeholder="Ask me about horse care..."
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
  const [activeTab, setActiveTab] = useState("message")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [isOperator, setIsOperator] = useState<boolean>(false)
  const safeArea = getSafeAreaPadding()

  const [showChat, setShowChat] = useState(false)
  const [showAIChat, setShowAIChat] = useState(false)
  const [currentContact, setCurrentContact] = useState<{
    id: string
    name: string
    avatar: string
    role: string
  } | null>(null)

  const [chatInput, setChatInput] = useState("")
  const [userData, setUserData] = useState<any>(null)
  const [aiChatMessages, setAiChatMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm your AI assistant. How can I help you with horse care today?",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ])

  const loadUserId = useCallback(async () => {
    try {
      const userData = await SecureStore.getItemAsync("user_data")
      if (userData) {
        const parsed = JSON.parse(userData)
        const id = parsed.user_id || parsed.id
        setUserId(id)
        setUserData(parsed)

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

  const loadMessages = useCallback(async () => {
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

      // Updated API endpoint to match backend
      const response = await fetch(`${API_BASE_URL}/conversations/?user_id=${encodeURIComponent(uid)}`)

      if (!response.ok) {
        throw new Error(`Failed to load conversations: ${response.status}`)
      }

      const data = await response.json()
      console.log("Loaded conversations from backend:", data)

      // Backend returns {conversations: [...], total_count: number}
      let messagesList = []

      if (data.conversations && Array.isArray(data.conversations)) {
        messagesList = data.conversations.map((conv: BackendConversation) => ({
          id: conv.partner_id,
          name: conv.partner_name || conv.sender || "Unknown User",
          avatar: conv.avatar || "https://via.placeholder.com/150",
          message: formatMessageContent(conv.last_message || conv.preview || ""),
          time: formatMessageTimestamp(conv.last_message_time || conv.timestamp || new Date().toISOString()),
          unread: conv.unread || !conv.is_read || false,
        }))
      } else if (Array.isArray(data)) {
        messagesList = data
      }

      setMessages(messagesList)
      console.log(`Processed ${messagesList.length} conversations for display`)
    } catch (error) {
      console.error("Error loading messages:", error)
      Alert.alert("Error", "Failed to load conversations. Please check your connection.")
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [userId, router, loadUserId])

  const deleteMessage = async (contactId: string, contactName: string) => {
    try {
      const user = await loadUserId()
      if (!user) {
        console.log("No user logged in, cannot delete conversations.")
        return
      }

      console.log(`🗑️ Deleting conversation - User: ${user}, Contact: ${contactId}`)

      // Updated API endpoint to match backend (no trailing slash)
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
        // Remove from local state immediately
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

  useEffect(() => {
    const checkForDirectChat = async () => {
      if (params.openChat === "true" && params.contactId) {
        console.log("📨 Opening chat from Hcontact:", params.contactName)

        const user = await loadUserId()
        if (!user) {
          router.replace("/auth/login")
          return
        }

        // Set the contact and show chat immediately
        setCurrentContact({
          id: params.contactId as string,
          name: params.contactName as string,
          avatar: params.contactAvatar as string,
          role: params.contactRole as string,
        })
        setShowChat(true)

        // Important: Don't load messages here - let RealChatInterface handle it
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
  ])

  useEffect(() => {
    if (!params.openChat) {
      loadMessages()
    }
  }, [loadMessages, params.openChat])

  useFocusEffect(
    useCallback(() => {
      if (!params.openChat) {
        loadMessages()
      }
    }, [loadMessages, params.openChat]),
  )

  const handleMessagePress = async (contactId: string, contactName: string, contactAvatar: string) => {
    const user = await loadUserId()
    if (!user) {
      console.log("No user logged in, cannot open chat.")
      router.replace("/auth/login")
      return
    }

    const role = contactName.startsWith("Dr.") ? "veterinarian" : "other"

    setCurrentContact({
      id: contactId,
      name: contactName,
      avatar: contactAvatar,
      role: role,
    })
    setShowChat(true)
  }

  const handleSendMessage = useCallback(async () => {
    if (!chatInput.trim()) return

    if (!isOperator) {
      Alert.alert("Access Denied", "AI Assistant is only available for Horse Operators.")
      setShowAIChat(false)
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: chatInput.trim(),
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

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

        const responseMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: aiText,
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }

        setAiChatMessages((prev) => [...prev, responseMessage])
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: "Sorry, I'm having trouble connecting to the server. Please try again later.",
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }
        setAiChatMessages((prev) => [...prev, errorMessage])
      }
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble connecting. Please check your internet connection and try again.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setAiChatMessages((prev) => [...prev, errorMessage])
    }
  }, [chatInput, userData, isOperator])

  const handleChatInputChange = useCallback((text: string) => {
    setChatInput(text)
  }, [])

  const handleBackFromChat = useCallback(() => {
    setShowChat(false)
    setCurrentContact(null)
    loadMessages()
  }, [loadMessages])

  const handleBackFromAI = useCallback(() => setShowAIChat(false), [])

  const handleAISendMessage = useCallback(() => handleSendMessage(), [handleSendMessage])

  const handleShowAIChat = () => {
    if (isOperator) {
      setShowAIChat(true)
    } else {
      Alert.alert("Access Denied", "AI Assistant is only available for Horse Operators.", [{ text: "OK" }])
    }
  }

  const filteredMessages = messages.filter(
    (message) =>
      message.name.toLowerCase().includes(searchText.toLowerCase()) ||
      message.message.toLowerCase().includes(searchText.toLowerCase()),
  )

  if (showChat && currentContact) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <RealChatInterface
          contactId={currentContact.id}
          contactName={currentContact.name}
          contactAvatar={currentContact.avatar}
          userId={userId || ""}
          contactRole={currentContact.role}
          onBack={handleBackFromChat}
          safeArea={safeArea}
        />
      </SafeAreaView>
    )
  }

  if (showAIChat) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AIChatInterface
          messages={aiChatMessages}
          onBack={handleBackFromAI}
          chatInput={chatInput}
          onChatInputChange={handleChatInputChange}
          onSendMessage={handleAISendMessage}
          safeArea={safeArea}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#CD853F" translucent={false} />
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: safeArea.top }]}>
          <View style={styles.headerLeft}></View>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Messages</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.searchIconButton} onPress={() => router.push("/HORSE_OPERATOR/Hcontact")}>
              <FontAwesome5 name="users" size={scale(16)} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.searchContainer}>
            <FontAwesome5 name="search" size={scale(14)} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search messages..."
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor="#999"
            />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#CD853F" />
              <Text style={styles.loadingText}>Loading conversations...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.messagesList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: verticalScale(100) }}
            >
              {filteredMessages.map((message) => (
                <TouchableOpacity
                  key={message.id}
                  style={styles.messageItem}
                  onPress={() => handleMessagePress(message.id, message.name, message.avatar)}
                  onLongPress={() => handleLongPress(message.id, message.name)}
                  activeOpacity={0.7}
                >
                  <View style={styles.messageLeft}>
                    <View style={styles.avatarContainer}>
                      <Image source={{ uri: message.avatar }} style={styles.avatar} />
                    </View>
                  </View>

                  <View style={styles.messageContent}>
                    <View style={styles.messageHeader}>
                      <Text style={styles.contactName}>{message.name}</Text>
                      <Text style={styles.messageTimeText}>{message.time}</Text>
                    </View>
                    <Text style={styles.messagePreview} numberOfLines={1}>
                      {message.message}
                    </Text>
                  </View>
                  {message.unread && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              ))}

              {filteredMessages.length === 0 && !loading && (
                <View style={styles.emptyContainer}>
                  <FontAwesome5 name="comment-dots" size={scale(50)} color="#ccc" />
                  <Text style={styles.emptyTitle}>No conversations</Text>
                  <Text style={styles.emptyText}>
                    {isOperator
                      ? "Start a conversation with a veterinarian or use the AI assistant."
                      : "Start a conversation with a veterinarian."}
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>

        {isOperator && (
          <TouchableOpacity
            style={[styles.floatingAI, { bottom: dynamicSpacing(10) + safeArea.bottom }]}
            onPress={handleShowAIChat}
            activeOpacity={0.8}
          >
            <View style={styles.aiCircle}>
              <Text style={styles.aiText}>AI</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.bottomNav, { paddingBottom: safeArea.bottom }]}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            setActiveTab("home")
            router.push("/HORSE_OPERATOR/home")
          }}
        >
          <View style={[styles.navIcon, activeTab === "home" && styles.activeNavIcon]}>
            <FontAwesome5 name="home" size={scale(16)} color={activeTab === "home" ? "#fff" : "#666"} />
          </View>
          <Text style={[styles.navLabel, activeTab === "home" && styles.activeNavLabel]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            setActiveTab("horse")
            router.push("/HORSE_OPERATOR/horse")
          }}
        >
          <View style={[styles.navIcon, activeTab === "horse" && styles.activeNavIcon]}>
            <FontAwesome5 name="horse" size={scale(16)} color={activeTab === "horse" ? "#fff" : "#666"} />
          </View>
          <Text style={[styles.navLabel, activeTab === "horse" && styles.activeNavLabel]}>Horse</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            setActiveTab("message")
            router.push("/HORSE_OPERATOR/Hmessage")
          }}
        >
          <View style={[styles.navIcon, activeTab === "message" && styles.activeNavIcon]}>
            <FontAwesome5 name="comment-dots" size={scale(16)} color={activeTab === "message" ? "#fff" : "#666"} />
          </View>
          <Text style={[styles.navLabel, activeTab === "message" && styles.activeNavLabel]}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            setActiveTab("calendar")
            router.push("/HORSE_OPERATOR/Hcalendar")
          }}
        >
          <View style={[styles.navIcon, activeTab === "calendar" && styles.activeNavIcon]}>
            <FontAwesome5 name="calendar-alt" size={scale(16)} color={activeTab === "calendar" ? "#fff" : "#666"} />
          </View>
          <Text style={[styles.navLabel, activeTab === "calendar" && styles.activeNavLabel]}>Calendar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            setActiveTab("profile")
            router.push("/HORSE_OPERATOR/profile")
          }}
        >
          <View style={[styles.navIcon, activeTab === "profile" && styles.activeNavIcon]}>
            <FontAwesome5 name="user" size={scale(16)} color={activeTab === "profile" ? "#fff" : "#666"} />
          </View>
          <Text style={[styles.navLabel, activeTab === "profile" && styles.activeNavLabel]}>Profile</Text>
        </TouchableOpacity>
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
  headerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
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
  content: {
    flex: 1,
    backgroundColor: "white",
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(16),
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    borderRadius: scale(20),
    paddingHorizontal: scale(12),
    marginBottom: verticalScale(16),
    height: verticalScale(44),
  },
  searchIcon: {
    marginRight: scale(8),
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(14),
    color: "#333",
    paddingVertical: 0,
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
  messagesList: {
    flex: 1,
  },
  messageItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    minHeight: verticalScale(70),
  },
  messageLeft: {
    marginRight: scale(12),
  },
  avatarContainer: {
    width: scale(45),
    height: scale(45),
    borderRadius: scale(22.5),
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
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
  contactName: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  messageTimeText: {
    fontSize: moderateScale(11),
    color: "#666",
  },
  messagePreview: {
    fontSize: moderateScale(13),
    color: "#666",
    lineHeight: moderateScale(18),
  },
  unreadDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: "#CD853F",
    marginLeft: scale(8),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: verticalScale(60),
    paddingHorizontal: scale(30),
  },
  emptyTitle: {
    fontSize: moderateScale(18),
    fontWeight: "bold",
    color: "#333",
    marginTop: verticalScale(16),
    marginBottom: verticalScale(8),
  },
  emptyText: {
    fontSize: moderateScale(13),
    color: "#666",
    textAlign: "center",
    lineHeight: moderateScale(20),
  },
  floatingAI: {
    position: "absolute",
    right: scale(16),
    zIndex: 1000,
  },
  aiCircle: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    backgroundColor: "#4A90E2",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  aiText: {
    color: "white",
    fontSize: moderateScale(14),
    fontWeight: "bold",
  },
  chatHeader: {
    backgroundColor: "#CD853F",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingBottom: dynamicSpacing(12),
    minHeight: verticalScale(50),
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
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
  contactInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  contactAvatarHeader: {
    width: scale(35),
    height: scale(35),
    borderRadius: scale(17.5),
    marginRight: scale(10),
    backgroundColor: "#f0f0f0",
    borderWidth: 2,
    borderColor: "#fff",
  },
  chatHeaderTitle: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "white",
  },
  headerActionButton: {
    width: scale(32),
    height: scale(32),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: scale(16),
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
  aiStatusText: {
    fontSize: moderateScale(10),
    color: "white",
    fontWeight: "500",
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  messagesContent: {
    padding: scale(16),
    paddingBottom: scale(10),
    flexGrow: 1,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: verticalScale(80),
  },
  emptyStateText: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#666",
    marginTop: verticalScale(20),
  },
  emptyStateSubtext: {
    fontSize: moderateScale(13),
    color: "#999",
    marginTop: verticalScale(8),
    textAlign: "center",
    paddingHorizontal: scale(40),
  },
  messageWrapper: {
    marginBottom: verticalScale(15),
  },
  incomingWrapper: {
    alignItems: "flex-start",
  },
  outgoingWrapper: {
    alignItems: "flex-end",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: scale(15),
    paddingVertical: verticalScale(10),
    borderRadius: scale(20),
    marginBottom: verticalScale(5),
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  incomingBubble: {
    backgroundColor: "#f0f0f0",
    borderBottomLeftRadius: scale(5),
  },
  outgoingBubble: {
    backgroundColor: "#CD853F",
    borderBottomRightRadius: scale(5),
  },
  messageText: {
    fontSize: moderateScale(14),
    lineHeight: moderateScale(18),
  },
  incomingText: {
    color: "#333",
  },
  outgoingText: {
    color: "#fff",
  },
  timestamp: {
    fontSize: moderateScale(11),
    marginHorizontal: scale(5),
  },
  incomingTimestamp: {
    color: "#999",
    textAlign: "left",
  },
  outgoingTimestamp: {
    color: "#999",
    textAlign: "right",
  },
  floatingButton: {
    position: "absolute",
    right: scale(20),
    bottom: verticalScale(100),
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: "#CD853F",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
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
    marginBottom: verticalScale(12),
  },
  userMessageContainer: {
    alignItems: "flex-end",
  },
  aiMessageContainer: {
    alignItems: "flex-start",
  },
  userMessageBubble: {
    backgroundColor: "#CD853F",
    borderBottomRightRadius: scale(4),
  },
  aiMessageBubble: {
    backgroundColor: "white",
    borderBottomLeftRadius: scale(4),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userMessageText: {
    color: "white",
  },
  aiMessageText: {
    color: "#333",
  },
  messageTime: {
    fontSize: moderateScale(10),
    marginTop: verticalScale(4),
  },
  userMessageTime: {
    color: "rgba(255,255,255,0.8)",
    textAlign: "right",
  },
  aiMessageTime: {
    color: "#999",
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
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 5,
  },
  attachmentButton: {
    width: scale(40),
    height: scale(40),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: scale(20),
    marginRight: scale(10),
  },
  inputWrapper: {
    flex: 1,
    marginRight: scale(8),
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
    backgroundColor: "#F8F9FA",
  },
  sendButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    borderRadius: scale(20),
    justifyContent: "center",
    alignItems: "center",
    minHeight: verticalScale(44),
    shadowColor: "#007AFF",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  sendButtonActive: {
    backgroundColor: "#007AFF",
  },
  sendButtonInactive: {
    backgroundColor: "#f5f5f5",
  },
  sendButtonText: {
    color: "white",
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  bottomNav: {
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
})

export default MessageScreen
 