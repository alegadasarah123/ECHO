import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from "react"
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native"
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
  user: string
  text: string
  time: string
}

interface Horse {
  id: string
  name: string
  healthStatus: "Healthy" | "Under Care" | "Recovering"
  status: string
  image: any
  breed?: string
  age?: number
  lastCheckup?: string
  nextCheckup?: string
}

// User data interface
interface UserData {
  id: string
  email: string
  firstName?: string
  lastName?: string
  middleName?: string
  username?: string
  phoneNumber?: string
  profile?: any
}

// Reaction types
interface Reaction {
  type: 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry'
  emoji: string
  color: string
  label: string
}

interface UserReaction {
  userId: string
  type: Reaction['type']
}

const REACTIONS: Reaction[] = [
  { type: 'like', emoji: '👍', color: '#1877F2', label: 'Like' },
  { type: 'love', emoji: '❤️', color: '#E2264D', label: 'Love' },
  { type: 'haha', emoji: '😂', color: '#FFD93D', label: 'Haha' },
  { type: 'wow', emoji: '😮', color: '#FFD93D', label: 'Wow' },
  { type: 'sad', emoji: '😢', color: '#FFD93D', label: 'Sad' },
  { type: 'angry', emoji: '😡', color: '#F25268', label: 'Angry' },
]

export default function DashboardScreen() {
  const router = useRouter()
  const [searchText, setSearchText] = useState("")
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [newComment, setNewComment] = useState("")
  
  // Updated user state management
  const [currentUser, setCurrentUser] = useState("User") // Default fallback
  const [userData, setUserData] = useState<UserData | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const [selectedHorse, setSelectedHorse] = useState<Horse>({
    id: "1",
    name: "Oscar",
    healthStatus: "Healthy",
    status: "Ready for work",
    image: require("../../assets/images/horse.png"),
    breed: "Arabian",
    age: 8,
    lastCheckup: "2 days ago",
    nextCheckup: "May 30, 2025",
  })
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [checkInTime, setCheckInTime] = useState<string | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSOSEmergency, setShowSOSEmergency] = useState(false)
  // Reaction states
  const [reactions, setReactions] = useState<UserReaction[]>([
    { userId: 'user1', type: 'like' },
    { userId: 'user2', type: 'love' },
    { userId: 'user3', type: 'like' },
    { userId: 'user4', type: 'haha' },
  ])
  const [userReaction, setUserReaction] = useState<Reaction['type'] | null>(null)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [reactionPickerPosition, setReactionPickerPosition] = useState({ x: 0, y: 0 })
  const [reactionPickerScale] = useState(new Animated.Value(0))
  const safeArea = getSafeAreaPadding()

  // Expanded comments with more sample data
  const [comments, setComments] = useState<Comment[]>([
    {
      id: "1",
      user: "Dr. Sarah Johnson",
      text: "Great work by the veterinary team! Our horses are in excellent hands. The new treatment protocol is showing remarkable results.",
      time: "1 hour ago",
    },
    {
      id: "2",
      user: "Mike Thompson",
      text: "The care and attention to detail is outstanding. Thank you for keeping our horses healthy! Oscar looks fantastic today.",
      time: "3 hours ago",
    },
  ])

  const commentCount = comments.length

  // Load user data and selected horse from storage on component mount
  useEffect(() => {
    loadUserData()
    loadSelectedHorse()
  }, [])

  // Use useFocusEffect to reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadUserData()
      loadSelectedHorse()
    }, [])
  )

  const loadUserData = async () => {
    setIsLoading(true)
    try {
      // Get the stored authentication data
      const storedAuthData = await AsyncStorage.getItem('userAuthData')
      const storedAccessToken = await AsyncStorage.getItem('accessToken')
      
      if (storedAuthData && storedAccessToken) {
        const authData = JSON.parse(storedAuthData)
        setUserData(authData.user)
        setUserProfile(authData.profile)
        
        // Set display name based on available data
        let displayName = "User" // default fallback
        
        if (authData.profile) {
          // Use profile data if available
          const { kutsero_fname, kutsero_lname, kutsero_username } = authData.profile
          if (kutsero_fname && kutsero_lname) {
            displayName = `${kutsero_fname} ${kutsero_lname}`
          } else if (kutsero_username) {
            displayName = kutsero_username
          } else if (kutsero_fname) {
            displayName = kutsero_fname
          }
        } else if (authData.user) {
          // Fallback to user email if no profile
          displayName = authData.user.email?.split('@')[0] || "User"
        }
        
        setCurrentUser(displayName)
        
        console.log('Loaded user data:', {
          user: authData.user,
          profile: authData.profile,
          displayName: displayName
        })
      } else {
        // No stored auth data - redirect to login
        console.log('No stored authentication data found')
        Alert.alert(
          "Session Expired", 
          "Please log in again to continue.",
          [
            {
              text: "OK",
              onPress: () => router.replace('/login')
            }
          ]
        )
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      Alert.alert(
        "Error", 
        "Failed to load user data. Please log in again.",
        [
          {
            text: "OK",
            onPress: () => router.replace('/login')
          }
        ]
      )
    } finally {
      setIsLoading(false)
    }
  }

  const loadSelectedHorse = async () => {
    try {
      const savedHorseData = await AsyncStorage.getItem('selectedHorseData')
      if (savedHorseData) {
        const horse = JSON.parse(savedHorseData)
        setSelectedHorse(horse)
      }
    } catch (error) {
      console.log('Error loading selected horse:', error)
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
            // Clear all user data from storage
            await AsyncStorage.multiRemove([
              'userAuthData',
              'accessToken',
              'refreshToken',
              'selectedHorseData',
              'currentUser'
            ])
            router.replace('/login')
          } catch (error) {
            console.error('Error during logout:', error)
            // Still navigate even if storage clear fails
            router.replace('/login')
          }
        },
      },
    ])
  }

  // Reaction functions
  const getReactionCounts = () => {
    const counts: { [key: string]: number } = {}
    reactions.forEach(reaction => {
      counts[reaction.type] = (counts[reaction.type] || 0) + 1
    })
    return counts
  }

  const getTotalReactionCount = () => {
    return reactions.length
  }

  const getTopReactions = () => {
    const counts = getReactionCounts()
    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type]) => REACTIONS.find(r => r.type === type))
      .filter(Boolean) as Reaction[]
  }

  const handleReactionPress = (event: any) => {
    if (userReaction) {
      // Remove current reaction
      setReactions(prev => prev.filter(r => r.userId !== (userData?.id || currentUser)))
      setUserReaction(null)
    } else {
      // Add like reaction
      handleReactionSelect('like')
    }
  }

  const handleReactionLongPress = (event: any) => {
    const { pageX, pageY } = event.nativeEvent
    setReactionPickerPosition({ x: pageX - scale(150), y: pageY - scale(60) })
    setShowReactionPicker(true)
  }

  const handleReactionSelect = (reactionType: Reaction['type']) => {
    const userId = userData?.id || currentUser
    // Remove any existing reaction from this user
    setReactions(prev => prev.filter(r => r.userId !== userId))
    
    // Add new reaction
    setReactions(prev => [...prev, { userId: userId, type: reactionType }])
    setUserReaction(reactionType)
    
    // Hide picker
    hideReactionPicker()
  }

  const hideReactionPicker = () => {
    setShowReactionPicker(false)
  }

  const handleComment = () => {
    setShowCommentModal(true)
  }

  const submitComment = () => {
    if (newComment.trim()) {
      const comment: Comment = {
        id: Date.now().toString(),
        user: currentUser, // Use the current user's display name
        text: newComment.trim(),
        time: "Just now",
      }
      setComments((prev) => [comment, ...prev])
      setNewComment("")
      setShowCommentModal(false)
      Alert.alert("Success", "Your comment has been posted!")
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

  const handleCheckIn = () => {
    const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    setIsCheckedIn(true)
    setCheckInTime(currentTime)
    Alert.alert("Success", `Checked in with ${selectedHorse.name} at ${currentTime}`)
  }

  const handleCheckOut = () => {
    const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    Alert.alert(
      "Check Out Confirmation",
      `Check out from ${selectedHorse.name}?\n\nChecked in: ${checkInTime}\nChecking out: ${currentTime}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Check Out",
          onPress: () => {
            setIsCheckedIn(false)
            setCheckInTime(null)
            Alert.alert("Success", `Successfully checked out from ${selectedHorse.name}`)
          },
        },
      ],
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
            // Stay on dashboard - already here
          } else if (tabKey === "horse") {
            router.push('/(tabs)/horsecare')
          } else if (tabKey === "chat") {
            router.push('/(tabs)/messages')
          } else if (tabKey === "calendar") {
            router.push('/(tabs)/calendar')
          } else if (tabKey === "history") {
            router.push('/(tabs)/history')
          } else if (tabKey === "profile") {
            router.push('/(tabs)/profile')
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

  // Reaction Picker Component
  const ReactionPicker = () => {
    if (!showReactionPicker) return null

    return (
      <Modal transparent visible={showReactionPicker} onRequestClose={hideReactionPicker}>
        <TouchableWithoutFeedback onPress={hideReactionPicker}>
          <View style={styles.reactionPickerOverlay}>
            <View
              style={[
                styles.reactionPickerContainer,
                {
                  left: Math.max(scale(10), Math.min(reactionPickerPosition.x, width - scale(320))),
                  top: Math.max(scale(50), reactionPickerPosition.y),
                },
              ]}
            >
              {REACTIONS.map((reaction, index) => (
                <TouchableOpacity
                  key={reaction.type}
                  style={styles.reactionButton}
                  onPress={() => handleReactionSelect(reaction.type)}
                  activeOpacity={0.8}
                >
                  <View style={styles.reactionButtonInner}>
                    <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                  </View>
                  <Text style={styles.reactionLabel}>{reaction.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    )
  }

  // Get unread notifications count (simulated)
  const unreadNotificationsCount = 2

  // Show loading screen while data is being loaded
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />
        <Text style={styles.loadingText}>Loading...</Text>
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

  const topReactions = getTopReactions()
  const totalReactions = getTotalReactionCount()
  const currentUserReactionObj = userReaction ? REACTIONS.find(r => r.type === userReaction) : null

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />
      
      {/* Header Section */}
      <View style={[styles.header, { paddingTop: safeArea.top }]}>
        <View style={styles.headerTop}>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome,</Text>
            <Text style={styles.userName}>{currentUser}</Text>
            {userProfile && userProfile.kutsero_email && (
              <Text style={styles.userEmail}>{userProfile.kutsero_email}</Text>
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
            <TouchableOpacity 
              style={styles.sosButton}
              onPress={() => setShowSOSEmergency(true)}
            >
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
              <Text style={styles.sectionTitle}>Horse Selected for Today</Text>
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
              
              {/* Change Horse Button - Moved below check in/out buttons */}
              <TouchableOpacity
                style={styles.changeHorseButton}
                onPress={() => router.push('/(tabs)/horseselection')}
              >
                <Text style={styles.changeHorseButtonText}>Change Horse</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Activities Section */}
          <View style={styles.activitiesSection}>
            <Text style={styles.sectionTitle}>Recent Activities</Text>
            <View style={styles.activityCard}>
              <View style={styles.activityHeader}>
                <View style={styles.activityIconContainer}>
                  <View style={styles.medicalCross}>
                    <View style={styles.crossVertical} />
                    <View style={styles.crossHorizontal} />
                  </View>
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>Department of Veterinary Medicine and Pathology</Text>
                  <Text style={styles.activitySubtitle}>Very Strong Care Board</Text>
                  <Text style={styles.activityTime}>2 hours ago</Text>
                </View>
              </View>
              <Text style={styles.activityDescription}>
                Let's Light Horse Equipment the health and well-being of our horses! The Department of Veterinary
                Medicine and Pathology is committed to providing exceptional veterinary care and advancing the field
                through research, education, and clinical excellence.
              </Text>
              
              {/* Reaction Summary */}
              {totalReactions > 0 && (
                <View style={styles.reactionSummary}>
                  <View style={styles.reactionEmojis}>
                    {topReactions.map((reaction, index) => (
                      <View key={reaction.type} style={[styles.reactionEmojiContainer, { zIndex: topReactions.length - index }]}>
                        <Text style={styles.reactionEmojiSmall}>{reaction.emoji}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.reactionCount}>
                    {totalReactions > 999 ? `${(totalReactions / 1000).toFixed(1)}k` : totalReactions}
                  </Text>
                </View>
              )}
              
              <View style={styles.activityActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={handleReactionPress}
                  onLongPress={handleReactionLongPress}
                  delayLongPress={500}
                >
                  {currentUserReactionObj ? (
                    <>
                      <Text style={styles.reactionEmojiButton}>{currentUserReactionObj.emoji}</Text>
                      <Text style={[styles.actionCount, { color: currentUserReactionObj.color }]}>
                        {currentUserReactionObj.label}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Image
                        source={require("../../assets/images/like.png")}
                        style={[styles.actionIconImage, { tintColor: "#666" }]}
                        resizeMode="contain"
                      />
                      <Text style={styles.actionCount}>Like</Text>
                    </>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
                  <Image
                    source={require("../../assets/images/comment.png")}
                    style={styles.actionIconImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.actionCount}>{commentCount} comments</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Tab Navigation - Swapped Profile and History positions */}
        <View style={[styles.tabBar, { paddingBottom: safeArea.bottom }]}>
          <TabButton iconSource={null} label="Home" tabKey="home" isActive={true} />
          <TabButton
            iconSource={require("../../assets/images/horse.png")}
            label="Horse"
            tabKey="horse"
            isActive={false}
          />
          <TabButton
            iconSource={require("../../assets/images/chat.png")}
            label="Chat"
            tabKey="chat"
            isActive={false}
          />
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
          <TabButton
            iconSource={null}
            label="Profile"
            tabKey="profile"
            isActive={false}
          />
        </View>
      </View>

      {/* Reaction Picker */}
      <ReactionPicker />

      {/* Comment Modal */}
      <Modal
        visible={showCommentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCommentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments ({comments.length})</Text>
              <TouchableOpacity onPress={() => setShowCommentModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.commentsContainer}>
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <View key={comment.id} style={styles.commentItem}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentUser}>{comment.user}</Text>
                      <Text style={styles.commentTime}>{comment.time}</Text>
                    </View>
                    <Text style={styles.commentText}>{comment.text}</Text>
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
              />
              <TouchableOpacity
                style={[styles.submitButton, { opacity: newComment.trim() ? 1 : 0.5 }]}
                onPress={submitComment}
                disabled={!newComment.trim()}
              >
                <Text style={styles.submitButtonText}>Post</Text>
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
  activityCard: {
    paddingBottom: verticalScale(12),
  },
  activityHeader: {
    flexDirection: "row",
    marginBottom: verticalScale(10),
  },
  activityIconContainer: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(10),
  },
  medicalCross: {
    width: scale(14),
    height: scale(14),
    position: "relative",
  },
  crossVertical: {
    width: scale(2),
    height: scale(14),
    backgroundColor: "#2196F3",
    position: "absolute",
    left: scale(6),
  },
  crossHorizontal: {
    width: scale(14),
    height: scale(2),
    backgroundColor: "#2196F3",
    position: "absolute",
    top: scale(6),
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: moderateScale(13),
    fontWeight: "600",
    color: "#333",
    lineHeight: moderateScale(16),
    marginBottom: verticalScale(2),
  },
  activitySubtitle: {
    fontSize: moderateScale(11),
    color: "#666",
    marginBottom: verticalScale(2),
  },
  activityTime: {
    fontSize: moderateScale(10),
    color: "#999",
  },
  activityDescription: {
    fontSize: moderateScale(12),
    color: "#666",
    lineHeight: moderateScale(16),
    marginBottom: verticalScale(10),
  },
  // Reaction Summary Styles
  reactionSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(8),
    paddingHorizontal: scale(4),
  },
  reactionEmojis: {
    flexDirection: "row",
    alignItems: "center",
  },
  reactionEmojiContainer: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: scale(-4),
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  reactionEmojiSmall: {
    fontSize: moderateScale(10),
  },
  reactionCount: {
    fontSize: moderateScale(11),
    color: "#666",
    fontWeight: "500",
  },
  activityActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(20),
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: verticalScale(8),
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: scale(4),
  },
  actionIconImage: {
    width: scale(18),
    height: scale(18),
    marginRight: scale(6),
  },
  reactionEmojiButton: {
    fontSize: moderateScale(16),
    marginRight: scale(6),
  },
  actionCount: {
    fontSize: moderateScale(11),
    color: "#666",
    fontWeight: "500",
  },
  // Reaction Picker Styles
  reactionPickerOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  reactionPickerContainer: {
    position: "absolute",
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: scale(25),
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  reactionButton: {
    alignItems: "center",
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
  },
  reactionButtonInner: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  reactionEmoji: {
    fontSize: moderateScale(18),
  },
  reactionLabel: {
    fontSize: moderateScale(8),
    color: "#666",
    marginTop: verticalScale(2),
    fontWeight: "500",
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
})