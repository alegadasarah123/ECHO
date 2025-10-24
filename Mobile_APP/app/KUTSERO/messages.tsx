"use client"

import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native"
import * as SecureStore from "expo-secure-store"

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

const API_BASE_URL = "http://192.168.1.9:8000/api/kutsero"

interface Message {
  id?: string
  user_id?: number
  partner_id?: string
  sender: string
  preview: string
  last_message?: string
  timestamp: string
  last_message_time?: string
  unread: boolean
  is_read?: boolean
  avatar?: string
  isAI?: boolean
  role?: string
  status?: string
  unread_count?: number
  profile_image?: string
  partner_name?: string
  email?: string
}

interface ChatMessage {
  id: string
  text: string
  isUser: boolean
  timestamp: string
  date?: string
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

interface AvailableUser {
  id: number
  name: string
  role: string
  avatar: string
  email: string
  phone?: string
  status: string
  profile_image?: string
  first_name?: string
  last_name?: string
}

const ChatInterface = ({
  isAIChat,
  messages,
  title,
  onBack,
  chatInput,
  onChatInputChange,
  onSendMessage,
  safeArea,
}: {
  isAIChat: boolean
  messages: ChatMessage[]
  title: string
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

  const getDateLabel = (dateString: string) => {
    const messageDate = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Normalize dates to start of day for comparison
    const messageDateOnly = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate())
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())

    if (messageDateOnly.getTime() === todayOnly.getTime()) return "Today"
    if (messageDateOnly.getTime() === yesterdayOnly.getTime()) return "Yesterday"
    
    return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const shouldShowDateLabel = (currentMessage: ChatMessage, previousMessage: ChatMessage | undefined) => {
    if (!previousMessage) return true
    
    const currentDate = new Date(currentMessage.date || new Date().toISOString())
    const previousDate = new Date(previousMessage.date || new Date().toISOString())
    
    // Normalize to start of day for comparison
    const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
    const previousDateOnly = new Date(previousDate.getFullYear(), previousDate.getMonth(), previousDate.getDate())
    
    return currentDateOnly.getTime() !== previousDateOnly.getTime()
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />

      <View style={[styles.header, { paddingTop: safeArea.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
        <View style={styles.headerRight}>
          {isAIChat ? (
            <View style={styles.aiStatusIndicator}>
              <View style={styles.aiStatusDot} />
              <Text style={styles.aiStatusText}>Online</Text>
            </View>
          ) : (
            <Text style={styles.userName}>Online</Text>
          )}
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.chatContainer}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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

      <View style={[styles.chatInputContainer, { paddingBottom: Math.max(safeArea.bottom, 8) }]}>
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
            selectionColor="#C17A47"
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

export default function MessagesScreen() {
  const router = useRouter()
  const safeArea = getSafeAreaPadding()

  const [activeTab, setActiveTab] = useState<"conversations" | "users">("conversations")
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("")

  const [showAIChat, setShowAIChat] = useState(false)
  const [showIndividualChat, setShowIndividualChat] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Message | AvailableUser | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | string | null>(null)
  const [chatInput, setChatInput] = useState("")

  const [currentUser, setCurrentUser] = useState("User")
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [conversations, setConversations] = useState<Message[]>([])
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([])

  const [aiChatMessages, setAiChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      text: "Hello! I'm your AI assistant. How can I help you with horse care today?",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      date: new Date().toISOString(),
    },
  ])
  const [individualChatMessages, setIndividualChatMessages] = useState<ChatMessage[]>([])

  const getInitials = (name: string) => {
    if (!name) return "?"
    const nameParts = name.trim().split(" ")
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase()
    }
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase()
  }

  const getProfileImageSource = (email?: string, profileImage?: string, role?: string, name?: string) => {
  console.log('getProfileImageSource called:', { email, profileImage, role, name })
  
  const normalizedRole = role?.toLowerCase() || ''
  
  if (normalizedRole.includes('ctu')) {
    console.log('Returning CTU.jpg for role:', role)
    return require("../../assets/images/CTU.jpg")
  }
  
  if (normalizedRole.includes('dvmf')) {
    console.log('Returning DVMF.png for role:', role)
    return require("../../assets/images/DVMF.png")
  }
  
  if (email?.toLowerCase().includes('ctu')) {
    console.log('Returning CTU.jpg for email:', email)
    return require("../../assets/images/CTU.jpg")
  }
  if (email?.toLowerCase().includes('dvmf')) {
    console.log('Returning DVMF.png for email:', email)
    return require("../../assets/images/DVMF.png")
  }
  
  if (profileImage) {
    console.log('Returning profile image:', profileImage)
    return { uri: profileImage }
  }
  
  console.log('Returning null, will show initials')
  return null
}

  const renderAvatar = (item: Message | AvailableUser) => {
    const name = "sender" in item ? item.sender : item.name
    const email = item.email
    const profileImage = item.profile_image
    const role = item.role
    
    const imageSource = getProfileImageSource(email, profileImage, role, name)
    
    if (imageSource) {
      return (
        <Image
          source={imageSource}
          style={styles.avatarImage}
          resizeMode="cover"
        />
      )
    }
    
    return (
      <View style={styles.initialsContainer}>
        <Text style={styles.initialsText}>{getInitials(name)}</Text>
      </View>
    )
  }

  const loadUserData = async () => {
    try {
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
      } else {
        Alert.alert("Session Expired", "Please log in again to continue.", [
          {
            text: "OK",
            onPress: () => router.replace("../../pages/auth/login"),
          },
        ])
      }
    } catch (error) {
      console.error("Error loading user data:", error)
      Alert.alert("Error", "Failed to load user data. Please log in again.")
    } finally {
      setIsLoading(false)
    }
  }

  const loadConversations = async () => {
    if (!userData?.id) return

    try {
      const response = await fetch(`${API_BASE_URL}/conversations/?user_id=${userData.id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.conversations) {
          const mappedConversations = data.conversations.map((conv: any, index: number) => ({
            id: conv.id || `conv-${index}`,
            partner_id: conv.partner_id,
            user_id: conv.partner_id,
            sender: conv.sender || conv.partner_name || conv.name || "Unknown User",
            preview: conv.preview || conv.last_message || "",
            last_message: conv.last_message || "",
            timestamp:
              conv.timestamp ||
              (conv.last_message_time
                ? new Date(conv.last_message_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : ""),
            last_message_time: conv.last_message_time,
            unread: conv.unread !== undefined ? conv.unread : !conv.is_read,
            is_read: conv.is_read,
            avatar: conv.avatar || conv.partner_avatar || "👤",
            role: conv.role || conv.partner_role || "",
            status: conv.status || "",
            unread_count: conv.unread_count || (conv.is_read ? 0 : 1),
            profile_image: conv.profile_image || conv.partner_profile_image || null,
            email: conv.email || conv.partner_email || "",
          }))

          setConversations(mappedConversations)
        }
      }
    } catch (error) {
      console.error("Error loading conversations:", error)
    }
  }

  const loadAvailableUsers = async () => {
    if (!userData?.id) return

    try {
      let url = `${API_BASE_URL}/available_users/?user_id=${userData.id}`
      if (searchQuery) {
        url += `&search=${encodeURIComponent(searchQuery)}`
      }
      if (roleFilter) {
        url += `&role=${roleFilter}`
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.users) {
          setAvailableUsers(data.users)
        }
      }
    } catch (error) {
      console.error("Error loading available users:", error)
    }
  }

  const loadChatMessages = async (otherUserId: number | string) => {
    if (!userData?.id || !otherUserId) return

    try {
      const response = await fetch(
        `${API_BASE_URL}/get_messages/?user_id=${userData.id}&other_user_id=${otherUserId}`,
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
          // Map messages to include the date field from created_at
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
  }

  const sendMessageToBackend = async (receiverId: number | string, content: string) => {
    if (!userData?.id) return null

    try {
      const response = await fetch(`${API_BASE_URL}/send_message/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender_id: userData.id,
          receiver_id: receiverId,
          content: content,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // Return message with date field
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
  }

  const loadAIChatHistory = async () => {
    if (!userData?.access_token) return

    try {
      const response = await fetch(`${API_BASE_URL}/get_chat_history/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userData.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()

        if (data.success && data.history && data.history.length > 0) {
          const historyMessages: ChatMessage[] = []

          data.history.forEach((item: any) => {
            const messageDate = new Date()
            historyMessages.push({
              id: `${item.id}-prompt`,
              text: item.prompt,
              isUser: true,
              timestamp: messageDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              date: messageDate.toISOString(),
            })

            historyMessages.push({
              id: `${item.id}-answer`,
              text: item.answer,
              isUser: false,
              timestamp: messageDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              date: messageDate.toISOString(),
            })
          })

          setAiChatMessages(historyMessages)
        } else {
          setAiChatMessages([
            {
              id: "1",
              text: "Hello! I'm your AI assistant. How can I help you with horse care today?",
              isUser: false,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              date: new Date().toISOString(),
            },
          ])
        }
      }
    } catch (error) {
      console.error("Error loading AI chat history:", error)
    }
  }

  const openChat = useCallback(
    (contact: Message | AvailableUser) => {
      let userId: string | number | undefined

      if ("partner_id" in contact && contact.partner_id) {
        userId = contact.partner_id
      } else if ("user_id" in contact && contact.user_id) {
        userId = contact.user_id
      } else if ("id" in contact && contact.id) {
        userId = contact.id
      }

      if (!userId || userId === undefined) {
        Alert.alert("Error", "Unable to open chat. Invalid user ID.")
        return
      }

      setSelectedContact(contact)
      setSelectedUserId(userId as any)
      setShowIndividualChat(true)
      setChatInput("")
      setIndividualChatMessages([])
      loadChatMessages(userId as any)
    },
    [userData],
  )

  const handleSendMessage = useCallback(
    async (isAIChat = true) => {
      if (!chatInput.trim()) return

      const currentDate = new Date()
      const userMessage: ChatMessage = {
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
            const responseMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              text: aiText,
              isUser: false,
              timestamp: responseDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              date: responseDate.toISOString(),
            }

            setAiChatMessages((prev) => [...prev, responseMessage])
          } else {
            const errorDate = new Date()
            const errorMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              text: "Sorry, I'm having trouble connecting. Please try again later.",
              isUser: false,
              timestamp: errorDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              date: errorDate.toISOString(),
            }
            setAiChatMessages((prev) => [...prev, errorMessage])
          }
        } catch (error) {
          const errorDate = new Date()
          const errorMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            text: "Sorry, I'm having trouble connecting. Please check your internet connection.",
            isUser: false,
            timestamp: errorDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            date: errorDate.toISOString(),
          }
          setAiChatMessages((prev) => [...prev, errorMessage])
        }
      } else {
        if (!selectedUserId) {
          Alert.alert("Error", "Cannot send message. Invalid recipient.")
          return
        }

        setIndividualChatMessages((prev) => [...prev, userMessage])
        setChatInput("")

        const sentMessage = await sendMessageToBackend(selectedUserId, userMessage.text)

        if (!sentMessage) {
          setIndividualChatMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id))
        } else {
          // Update the message with the server response data
          setIndividualChatMessages((prev) => 
            prev.map((msg) => msg.id === userMessage.id ? { ...msg, ...sentMessage } : msg)
          )
        }
      }
    },
    [chatInput, selectedUserId, userData],
  )

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadConversations()
    await loadAvailableUsers()
    setIsRefreshing(false)
  }

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    if (userData) {
      loadConversations()
      loadAvailableUsers()
    }
  }, [userData])

  useEffect(() => {
    if (userData) {
      if (activeTab === "users") {
        loadAvailableUsers()
      }
    }
  }, [searchQuery, roleFilter, activeTab])

  useFocusEffect(
    useCallback(() => {
      if (userData) {
        loadConversations()
        loadAvailableUsers()
      }
    }, [userData]),
  )

  const handleBackFromAI = useCallback(() => setShowAIChat(false), [])
  const handleBackFromIndividual = useCallback(() => {
    setShowIndividualChat(false)
    setSelectedContact(null)
    setSelectedUserId(null)
    setIndividualChatMessages([])
    loadConversations()
  }, [userData])

  const handleShowAIChat = useCallback(async () => {
    await loadAIChatHistory()
    setShowAIChat(true)
  }, [userData])

  const handleChatInputChange = useCallback((text: string) => setChatInput(text), [])
  const handleAISendMessage = useCallback(() => handleSendMessage(true), [handleSendMessage])
  const handleIndividualSendMessage = useCallback(() => handleSendMessage(false), [handleSendMessage])

  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations

    return conversations.filter(
      (conv) =>
        conv.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (conv.role && conv.role.toLowerCase().includes(searchQuery.toLowerCase())),
    )
  }, [conversations, searchQuery])

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />
        <ActivityIndicator size="large" color="white" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    )
  }

  if (showAIChat) {
    return (
      <ChatInterface
        isAIChat={true}
        messages={aiChatMessages}
        title="EchoCare AI"
        onBack={handleBackFromAI}
        chatInput={chatInput}
        onChatInputChange={handleChatInputChange}
        onSendMessage={handleAISendMessage}
        safeArea={safeArea}
      />
    )
  }

  if (showIndividualChat && selectedContact) {
    const contactName = "sender" in selectedContact ? selectedContact.sender : selectedContact.name
    return (
      <ChatInterface
        isAIChat={false}
        messages={individualChatMessages}
        title={contactName}
        onBack={handleBackFromIndividual}
        chatInput={chatInput}
        onChatInputChange={handleChatInputChange}
        onSendMessage={handleIndividualSendMessage}
        safeArea={safeArea}
      />
    )
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
          if (tabKey === "home") {
            router.push("./dashboard")
          } else if (tabKey === "horse") {
            router.push("./horsecare")
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />

      <View style={[styles.header, { paddingTop: safeArea.top }]}>
        <View style={styles.headerLeft} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.userName}>{currentUser}</Text>
          {userData?.user_status === "pending" && <Text style={styles.statusText}>Pending</Text>}
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={activeTab === "conversations" ? "Search conversations..." : "Search users..."}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearButton}>
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
          {conversations.filter((c) => c.unread).length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{conversations.filter((c) => c.unread).length}</Text>
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
              style={[styles.filterChip, roleFilter === "vet" && styles.activeFilterChip]}
              onPress={() => setRoleFilter("vet")}
            >
              <Text style={[styles.filterChipText, roleFilter === "vet" && styles.activeFilterChipText]}>Vets</Text>
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
              style={[styles.filterChip, roleFilter === "horse_operator" && styles.activeFilterChip]}
              onPress={() => setRoleFilter("horse_operator")}
            >
              <Text style={[styles.filterChipText, roleFilter === "horse_operator" && styles.activeFilterChipText]}>
                Operators
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={["#C17A47"]} />}
      >
        {activeTab === "conversations" ? (
          filteredConversations.length > 0 ? (
            filteredConversations.map((message) => (
              <TouchableOpacity
                key={message.id}
                style={styles.messageItem}
                onPress={() => openChat(message)}
                activeOpacity={0.7}
              >
                <View style={styles.messageLeft}>
                  <View style={styles.avatarContainer}>
                    {renderAvatar(message)}
                  </View>
                </View>
                <View style={styles.messageContent}>
                  <View style={styles.messageHeader}>
                    <Text style={styles.senderName}>{message.sender}</Text>
                    <Text style={styles.timestamp}>
                      {message.timestamp ||
                        (message.last_message_time
                          ? new Date(message.last_message_time).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "")}
                    </Text>
                  </View>
                  <Text style={styles.messagePreview} numberOfLines={1}>
                    {message.preview || message.last_message || ""}
                  </Text>
                  {message.role && <Text style={styles.roleText}>{message.role.replace("_", " ")}</Text>}
                </View>
                {(message.unread || !message.is_read) && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{message.unread_count || 1}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No conversations yet</Text>
              <Text style={styles.emptyStateSubtext}>Start a conversation from the Users tab</Text>
            </View>
          )
        ) : availableUsers.length > 0 ? (
          availableUsers.map((user) => (
            <TouchableOpacity key={user.id} style={styles.userItem} onPress={() => openChat(user)} activeOpacity={0.7}>
              <View style={styles.messageLeft}>
                <View style={styles.avatarContainer}>
                  {renderAvatar(user)}
                </View>
              </View>
              <View style={styles.messageContent}>
                <Text style={styles.senderName}>{user.name}</Text>
                {user.phone && <Text style={styles.userEmail}>{user.phone}</Text>}
                <View style={styles.userInfoRow}>
                  <Text style={styles.roleText}>{user.role.replace("_", " ")}</Text>
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

      <TouchableOpacity
        style={[styles.floatingAI, { bottom: dynamicSpacing(80) + safeArea.bottom }]}
        onPress={handleShowAIChat}
        activeOpacity={0.8}
      >
        <View style={styles.aiCircle}>
          <Text style={styles.aiText}>AI</Text>
        </View>
      </TouchableOpacity>

      <View style={[styles.tabBar, { paddingBottom: safeArea.bottom }]}>
        <TabButton iconSource={null} label="Home" tabKey="home" isActive={false} />
        <TabButton
          iconSource={require("../../assets/images/horse.png")}
          label="Horse"
          tabKey="horse"
          isActive={false}
        />
        <TabButton iconSource={require("../../assets/images/chat.png")} label="Chat" tabKey="chat" isActive={true} />
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
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#C17A47",
  },
  loadingText: {
    color: "white",
    fontSize: moderateScale(16),
    fontWeight: "500",
    marginTop: verticalScale(10),
  },
  header: {
    backgroundColor: "#C17A47",
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
  },
  headerRight: {
    alignItems: "flex-end",
    width: scale(60),
    justifyContent: "center",
  },
  userName: {
    fontSize: moderateScale(12),
    color: "white",
    fontWeight: "500",
  },
  statusText: {
    fontSize: moderateScale(10),
    color: "#FFE082",
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
  aiStatusText: {
    fontSize: moderateScale(10),
    color: "white",
    fontWeight: "500",
  },
  searchContainer: {
    backgroundColor: "#C17A47",
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
    borderBottomColor: "#C17A47",
  },
  tabSwitcherText: {
    fontSize: moderateScale(14),
    fontWeight: "500",
    color: "#666",
  },
  activeTabSwitcherText: {
    color: "#C17A47",
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
    backgroundColor: "#C17A47",
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
    backgroundColor: "#C17A47",
    justifyContent: "center",
    alignItems: "center",
  },
  initialsText: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "white",
  },
  avatarText: {
    fontSize: moderateScale(20),
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
  senderName: {
    fontSize: moderateScale(15),
    fontWeight: "600",
    color: "#333",
  },
  timestamp: {
    fontSize: moderateScale(11),
    color: "#999",
  },
  messagePreview: {
    fontSize: moderateScale(13),
    color: "#666",
    lineHeight: moderateScale(18),
  },
  roleText: {
    fontSize: moderateScale(11),
    color: "#999",
    textTransform: "capitalize",
    marginTop: verticalScale(2),
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
  approvedBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(10),
    marginLeft: scale(8),
  },
  approvedBadgeText: {
    color: "white",
    fontSize: moderateScale(10),
    fontWeight: "500",
  },
  unreadBadge: {
    backgroundColor: "#C17A47",
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
    backgroundColor: "#C17A47",
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
    backgroundColor: "#C17A47",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    borderRadius: scale(20),
    justifyContent: "center",
    alignItems: "center",
    minHeight: verticalScale(44),
    shadowColor: "#C17A47",
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
})