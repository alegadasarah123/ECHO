"use client"

import AsyncStorage from "@react-native-async-storage/async-storage"
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
} from "react-native"

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

interface Message {
  id: string
  sender: string
  preview: string
  timestamp: string
  unread: boolean
  avatar?: string
  isAI?: boolean
}

interface ChatMessage {
  id: string
  text: string
  isUser: boolean
  timestamp: string
}

// Separate ChatInterface component to prevent recreation
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

  // Auto scroll to bottom when messages change
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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />

      {/* Chat Header */}
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

      {/* Chat Messages */}
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

      {/* Chat Input */}
      <View style={[styles.chatInputContainer, { paddingBottom: safeArea.bottom }]}>
        <TextInput
          style={styles.chatInput}
          value={chatInput}
          onChangeText={onChatInputChange}
          placeholder={isAIChat ? "Ask me about horse care..." : "Type a message..."}
          placeholderTextColor="#999"
          multiline={true}
          numberOfLines={1}
          maxLength={500}
          returnKeyType="default"
          blurOnSubmit={false}
          autoCorrect={true}
          autoCapitalize="sentences"
          selectionColor="#C17A47"
          underlineColorAndroid="transparent"
          onFocus={() => {
            // Scroll to bottom when input is focused
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true })
            }, 300)
          }}
        />
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
  const [showAIChat, setShowAIChat] = useState(false)
  const [showIndividualChat, setShowIndividualChat] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Message | null>(null)
  const [chatInput, setChatInput] = useState("")
  const [currentUser, setCurrentUser] = useState("User") // Default fallback
  const [aiChatMessages, setAiChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      text: "Hello! I'm your AI assistant. How can I help you with horse care today?",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ])
  const [individualChatMessages, setIndividualChatMessages] = useState<ChatMessage[]>([])

  // Load user data from AsyncStorage
  const loadUserData = async () => {
    try {
      const savedUser = await AsyncStorage.getItem("currentUser")
      if (savedUser) {
        setCurrentUser(savedUser)
      }
    } catch (error) {
      console.log("Error loading user data:", error)
    }
  }

  // Load data on component mount
  useEffect(() => {
    loadUserData()
  }, [])

  // Use useFocusEffect to reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadUserData()
    }, []),
  )

  // Sample messages data - moved to useMemo to prevent re-creation
  const messages = useMemo<Message[]>(
    () => [
      {
        id: "1",
        sender: "Chief Office",
        preview: "The horse vaccination is confirmed for the...",
        timestamp: "10:30 AM",
        unread: true,
        avatar: "👨‍💼",
      },
      {
        id: "3",
        sender: "Veterinary Team",
        preview: "Oscar's health check-up results are ready",
        timestamp: "2 days ago",
        unread: false,
        avatar: "👩‍⚕️",
      },
      {
        id: "4",
        sender: "Feed Supplier",
        preview: "Your monthly feed order has been delivered",
        timestamp: "3 days ago",
        unread: false,
        avatar: "🚚",
      },
    ],
    [],
  )

  // Handle opening individual chat - wrapped in useCallback
  const openIndividualChat = useCallback((message: Message) => {
    setSelectedContact(message)
    setShowIndividualChat(true)
    setChatInput("")

    // Initialize conversation based on the contact
    const initialMessages: ChatMessage[] = []

    if (message.id === "1") {
      // Chief Office
      initialMessages.push({
        id: "1",
        text: "The horse vaccination is confirmed for tomorrow at 2 PM. Please make sure Oscar is ready for the appointment.",
        isUser: false,
        timestamp: "10:30 AM",
      })
    } else if (message.id === "3") {
      // Veterinary Team
      initialMessages.push({
        id: "1",
        text: "Oscar's health check-up results are ready. Overall health is excellent. Blood work shows normal values across all parameters.",
        isUser: false,
        timestamp: "2 days ago",
      })
    } else if (message.id === "4") {
      // Feed Supplier
      initialMessages.push({
        id: "1",
        text: "Your monthly feed order has been delivered successfully. 5 bags of premium chaff and 3 bags of supplements are now in your storage area.",
        isUser: false,
        timestamp: "3 days ago",
      })
    }

    setIndividualChatMessages(initialMessages)
  }, [])

  // AI response generator - wrapped in useCallback
  const generateAIResponse = useCallback((userInput: string): string => {
    const input = userInput.toLowerCase()

    if (input.includes("feed") || input.includes("food")) {
      return "For feeding, I recommend checking Oscar's current feed schedule. Make sure to provide the right amount of chaff, restone, and dynamy based on the meal time. Would you like me to help you plan a feeding schedule?"
    } else if (input.includes("health") || input.includes("sick") || input.includes("checkup")) {
      return "For health concerns, I suggest monitoring the horse's vital signs and behavior. Oscar's last checkup was 2 days ago and he's currently healthy. Should I schedule a veterinary consultation?"
    } else if (input.includes("water")) {
      return "Proper hydration is crucial! Make sure fresh water is available at all times. An average horse needs 5-10 gallons of water per day. Would you like me to set up water monitoring reminders?"
    } else if (input.includes("exercise") || input.includes("training")) {
      return "Regular exercise is important for horse health. I can help you create a training schedule based on Oscar's age and fitness level. What type of activities are you planning?"
    } else if (input.includes("hello") || input.includes("hi")) {
      return "Hello! I'm here to help with all your horse care needs. You can ask me about feeding, health monitoring, exercise routines, or any other questions about Oscar's care."
    } else {
      return "I understand you're asking about horse care. I can help with feeding schedules, health monitoring, exercise planning, and general care tips. Could you be more specific about what you'd like to know?"
    }
  }, [])

  // Contact response generator - wrapped in useCallback
  const generateContactResponse = useCallback((userInput: string, contact: Message | null): string => {
    if (!contact) return "Thank you for your message. I'll get back to you soon."

    const input = userInput.toLowerCase()

    if (contact.id === "1") {
      // Chief Office
      if (input.includes("time") || input.includes("when")) {
        return "The vaccination appointment is scheduled for tomorrow at 2:00 PM sharp. Please arrive 15 minutes early for preparation."
      } else if (input.includes("preparation") || input.includes("ready")) {
        return "Please ensure Oscar hasn't eaten for 2 hours before the appointment and is clean. We'll handle the rest."
      } else {
        return "Thank you for confirming. If you have any questions about tomorrow's vaccination appointment, please let me know."
      }
    } else if (contact.id === "3") {
      // Veterinary Team
      if (input.includes("results") || input.includes("report")) {
        return "I can email you the detailed report. All vitals are normal: Heart rate 32 bpm, Temperature 100.2°F, Blood pressure normal."
      } else if (input.includes("next") || input.includes("follow")) {
        return "Based on the results, Oscar's next checkup should be in 6 months unless you notice any changes in behavior or appetite."
      } else {
        return "I'm glad you're staying on top of Oscar's health. The results show he's in excellent condition. Any specific concerns?"
      }
    } else if (contact.id === "4") {
      // Feed Supplier
      if (input.includes("quality") || input.includes("fresh")) {
        return "All feed delivered is fresh with expiration dates well into next year. The chaff is premium grade and supplements are the highest quality."
      } else if (input.includes("next") || input.includes("order")) {
        return "Your next monthly delivery is scheduled for the same date next month. Would you like to modify the quantities?"
      } else {
        return "Great! The feed has been delivered to your usual storage location. Invoice will be emailed within 24 hours."
      }
    }

    return "Thank you for your message. I'll get back to you soon."
  }, [])

  // AI Chat functionality - wrapped in useCallback
  const handleSendMessage = useCallback(
    (isAIChat = true) => {
      if (!chatInput.trim()) return

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        text: chatInput.trim(),
        isUser: true,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }

      if (isAIChat) {
        setAiChatMessages((prev) => [...prev, userMessage])
      } else {
        setIndividualChatMessages((prev) => [...prev, userMessage])
      }

      setChatInput("")

      // Simulate response
      setTimeout(() => {
        const response = isAIChat
          ? generateAIResponse(userMessage.text)
          : generateContactResponse(userMessage.text, selectedContact)
        const responseMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: response,
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }

        if (isAIChat) {
          setAiChatMessages((prev) => [...prev, responseMessage])
        } else {
          setIndividualChatMessages((prev) => [...prev, responseMessage])
        }
      }, 1000)
    },
    [chatInput, generateAIResponse, generateContactResponse, selectedContact],
  )

  // Text input change handler - wrapped in useCallback
  const handleChatInputChange = useCallback((text: string) => {
    setChatInput(text)
  }, [])

  // Navigation handlers - wrapped in useCallback
  const handleBackFromAI = useCallback(() => setShowAIChat(false), [])
  const handleBackFromIndividual = useCallback(() => {
    setShowIndividualChat(false)
    setSelectedContact(null)
  }, [])
  const handleShowAIChat = useCallback(() => setShowAIChat(true), [])

  // AI send message handler
  const handleAISendMessage = useCallback(() => {
    handleSendMessage(true)
  }, [handleSendMessage])

  // Individual send message handler
  const handleIndividualSendMessage = useCallback(() => {
    handleSendMessage(false)
  }, [handleSendMessage])

  // Show AI Chat Interface
  if (showAIChat) {
    return (
      <ChatInterface
        isAIChat={true}
        messages={aiChatMessages}
        title="AI Assistant"
        onBack={handleBackFromAI}
        chatInput={chatInput}
        onChatInputChange={handleChatInputChange}
        onSendMessage={handleAISendMessage}
        safeArea={safeArea}
      />
    )
  }

  // Show Individual Chat Interface
  if (showIndividualChat && selectedContact) {
    return (
      <ChatInterface
        isAIChat={false}
        messages={individualChatMessages}
        title={selectedContact.sender}
        onBack={handleBackFromIndividual}
        chatInput={chatInput}
        onChatInputChange={handleChatInputChange}
        onSendMessage={handleIndividualSendMessage}
        safeArea={safeArea}
      />
    )
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
            router.push("./dashboard")
          } else if (tabKey === "horse") {
            router.push("./horsecare")
          } else if (tabKey === "chat") {
            // Stay on messages - already here
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
      {/* Header - Updated to center the Messages title */}
      <View style={[styles.header, { paddingTop: safeArea.top }]}>
        <View style={styles.headerLeft}>{/* Empty space for balance */}</View>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.userName}>{currentUser}</Text>
        </View>
      </View>

      {/* Messages List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {messages.map((message) => (
          <TouchableOpacity
            key={message.id}
            style={styles.messageItem}
            onPress={() => openIndividualChat(message)}
            activeOpacity={0.7}
          >
            <View style={styles.messageLeft}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>{message.avatar}</Text>
              </View>
            </View>
            <View style={styles.messageContent}>
              <View style={styles.messageHeader}>
                <Text style={styles.senderName}>{message.sender}</Text>
                <Text style={styles.timestamp}>{message.timestamp}</Text>
              </View>
              <Text style={styles.messagePreview} numberOfLines={1}>
                {message.preview}
              </Text>
            </View>
            {message.unread && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Floating AI Assistant Circle */}
      <TouchableOpacity
        style={[styles.floatingAI, { bottom: dynamicSpacing(80) + safeArea.bottom }]}
        onPress={handleShowAIChat}
        activeOpacity={0.8}
      >
        <View style={styles.aiCircle}>
          <Text style={styles.aiText}>AI</Text>
        </View>
      </TouchableOpacity>

      {/* Bottom Tab Navigation - Updated order: History before Profile */}
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
  header: {
    backgroundColor: "#C17A47",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingBottom: dynamicSpacing(12),
    minHeight: verticalScale(50),
  },
  headerLeft: {
    width: scale(60), // Same width as headerRight for balance
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
    justifyContent: "center", // Added for better centering
  },
  headerTitle: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "white",
    textAlign: "center", // Ensure text is centered
  },
  headerRight: {
    alignItems: "flex-end",
    width: scale(60), // Fixed width for consistent layout
    justifyContent: "center",
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
  aiStatusText: {
    fontSize: moderateScale(10),
    color: "white",
    fontWeight: "500",
  },
  content: {
    flex: 1,
    backgroundColor: "white",
  },
  messageItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    minHeight: verticalScale(60),
  },
  messageLeft: {
    marginRight: scale(10),
  },
  avatarContainer: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: moderateScale(16),
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(2),
  },
  senderName: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
  },
  timestamp: {
    fontSize: moderateScale(10),
    color: "#666",
  },
  messagePreview: {
    fontSize: moderateScale(12),
    color: "#666",
    lineHeight: moderateScale(16),
  },
  unreadDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: "#C17A47",
    marginLeft: scale(6),
  },
  // AI Chat Styles
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
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(16),
  },
  userMessageBubble: {
    backgroundColor: "#C17A47",
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
  messageText: {
    fontSize: moderateScale(14),
    lineHeight: moderateScale(18),
    marginBottom: verticalScale(4),
  },
  userMessageText: {
    color: "white",
  },
  aiMessageText: {
    color: "#333",
  },
  messageTime: {
    fontSize: moderateScale(10),
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
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    alignItems: "flex-end",
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: scale(20),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(14),
    maxHeight: verticalScale(100),
    minHeight: verticalScale(44),
    marginRight: scale(8),
    color: "#333333",
    backgroundColor: "#FFFFFF",
    textAlignVertical: "top",
  },
  sendButton: {
    backgroundColor: "#C17A47",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(10),
    borderRadius: scale(20),
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonText: {
    color: "white",
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  // Floating AI Assistant Styles
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
