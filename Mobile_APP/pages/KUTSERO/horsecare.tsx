import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from "react"
import {
    Dimensions,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"
import FeedPage from "./feedpage"
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

export default function HorseCareScreen() {
  const router = useRouter()
  const [searchText, setSearchText] = useState("")
  const [showFeedPage, setShowFeedPage] = useState(false)
  const [feedType, setFeedType] = useState<"feed" | "water">("feed")
  const [selectedHorseName] = useState("Oscar") // You can make this dynamic based on selected horse
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSOSEmergency, setShowSOSEmergency] = useState(false)
  const [currentUser, setCurrentUser] = useState("User")

  const safeArea = getSafeAreaPadding()

  // Load user data from AsyncStorage
  const loadUserData = async () => {
    try {
      const savedUser = await AsyncStorage.getItem('currentUser')
      if (savedUser) {
        setCurrentUser(savedUser)
      }
    } catch (error) {
      console.log('Error loading user data:', error)
    }
  }

  // Load user data on component mount
  useEffect(() => {
    loadUserData()
  }, [])

  // Load user data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadUserData()
    }, [])
  )

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
            router.push('/(tabs)/dashboard')
          } else if (tabKey === "horse") {
            // Stay on horse care - already here
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

  const handleFeedPress = () => {
    setFeedType("feed")
    setShowFeedPage(true)
  }

  const handleWaterPress = () => {
    setFeedType("water")
    setShowFeedPage(true)
  }

  // Show FeedPage when user clicks Feed or Water buttons
  if (showFeedPage) {
    return (
      <FeedPage
        onBack={() => setShowFeedPage(false)}
        feedType={feedType}
        horseName={selectedHorseName}
      />
    )
  }

  // Show Notifications page when requested
  if (showNotifications) {
    return (
      <NotificationsPage
        onBack={() => setShowNotifications(false)}
        userName={currentUser}
      />
    )
  }

  // Show SOS Emergency page when requested
  if (showSOSEmergency) {
    return <SOSEmergencyScreen onBack={() => setShowSOSEmergency(false)} />
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
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setShowNotifications(true)}
            >
              <Image
                source={require("../../assets/images/notification.png")}
                style={[styles.headerIconImage, { tintColor: "white" }]}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.sosButton}
              onPress={() => setShowSOSEmergency(true)}
            >
              <Image source={require("../../assets/images/sos.png")} style={styles.sosIcon} resizeMode="contain" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton}>
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
          {/* Page Title */}
          <View style={styles.titleSection}>
            <Text style={styles.pageTitle}>Horse Care</Text>
          </View>

          {/* Horse Profile Section */}
          <View style={styles.horseSection}>
            <View style={styles.horseCard}>
              <View style={styles.horseImageContainer}>
                <View style={styles.horseAvatar}>
                  <Image
                    source={require("../../assets/images/horse.png")}
                    style={[styles.horseIconImage, { tintColor: "#C17A47" }]}
                    resizeMode="contain"
                  />
                </View>
              </View>
              <View style={styles.horseInfo}>
                <Text style={styles.horseNameText}>
                  <Text style={styles.horseLabel}>Name: </Text>
                  <Text style={styles.horseValue}>{selectedHorseName}</Text>
                </Text>
                <View style={styles.healthRow}>
                  <View style={styles.healthDot} />
                  <Text style={styles.healthText}>Healthy</Text>
                </View>
                <Text style={styles.checkupText}>Next check-up: Checked</Text>
              </View>
            </View>
            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity 
                style={styles.feedButton}
                onPress={handleFeedPress}
                activeOpacity={0.7}
              >
                <Text style={styles.actionButtonText}>Feed</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.waterButton}
                onPress={handleWaterPress}
                activeOpacity={0.7}
              >
                <Text style={styles.actionButtonText}>Water</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Health Check-up Reminders Section */}
          <View style={styles.remindersSection}>
            <Text style={styles.sectionTitle}>Health Check-up Reminders</Text>
            <View style={styles.reminderCard}>
              <View style={styles.reminderDate}>
                <Text style={styles.reminderDateText}>May 30, 2025</Text>
              </View>
              <View style={styles.reminderContent}>
                <Text style={styles.reminderTitle}>{selectedHorseName} - Vaccination due</Text>
              </View>
            </View>
          </View>

          {/* Additional Care Activities Section */}
          <View style={styles.activitiesSection}>
            <Text style={styles.sectionTitle}>Recent Care Activities</Text>
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <View style={styles.activityDot} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Morning Feed - Completed</Text>
                <Text style={styles.activityTime}>2 hours ago</Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <View style={styles.activityDot} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Water Refill - Completed</Text>
                <Text style={styles.activityTime}>4 hours ago</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Tab Navigation */}
        <View style={[styles.tabBar, { paddingBottom: safeArea.bottom }]}>
          <TabButton
            iconSource={null}
            label="Home"
            tabKey="home"
            isActive={false}
          />
          <TabButton
            iconSource={require("../../assets/images/horse.png")}
            label="Horse"
            tabKey="horse"
            isActive={true}
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#C17A47",
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
  },
  headerIconImage: {
    width: scale(18),
    height: scale(18),
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
  titleSection: {
    paddingHorizontal: scale(16),
    paddingTop: dynamicSpacing(16),
    paddingBottom: dynamicSpacing(8),
  },
  pageTitle: {
    fontSize: moderateScale(20),
    fontWeight: "bold",
    color: "#333",
  },
  horseSection: {
    backgroundColor: "white",
    marginHorizontal: scale(16),
    marginTop: dynamicSpacing(8),
    borderRadius: scale(12),
    padding: scale(16),
  },
  horseCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: verticalScale(16),
  },
  horseImageContainer: {
    marginRight: scale(12),
  },
  horseAvatar: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  horseIconImage: {
    width: scale(28),
    height: scale(28),
  },
  horseInfo: {
    flex: 1,
  },
  horseNameText: {
    fontSize: moderateScale(14),
    marginBottom: verticalScale(6),
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
    marginBottom: verticalScale(6),
  },
  healthDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: "#4CAF50",
    marginRight: scale(6),
  },
  healthText: {
    fontSize: moderateScale(12),
    color: "#4CAF50",
    fontWeight: "500",
  },
  checkupText: {
    fontSize: moderateScale(12),
    color: "#666",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: scale(10),
  },
  feedButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    paddingVertical: verticalScale(12),
    borderRadius: scale(8),
    alignItems: "center",
    minHeight: 44,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  waterButton: {
    flex: 1,
    backgroundColor: "#2196F3",
    paddingVertical: verticalScale(12),
    borderRadius: scale(8),
    alignItems: "center",
    minHeight: 44,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionButtonText: {
    color: "white",
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  remindersSection: {
    backgroundColor: "white",
    marginHorizontal: scale(16),
    marginTop: dynamicSpacing(16),
    borderRadius: scale(12),
    padding: scale(16),
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(12),
  },
  reminderCard: {
    paddingVertical: verticalScale(8),
  },
  reminderDate: {
    marginBottom: verticalScale(4),
  },
  reminderDateText: {
    fontSize: moderateScale(11),
    color: "#999",
    fontWeight: "500",
  },
  reminderContent: {},
  reminderTitle: {
    fontSize: moderateScale(12),
    color: "#333",
    fontWeight: "500",
  },
  activitiesSection: {
    backgroundColor: "white",
    marginHorizontal: scale(16),
    marginTop: dynamicSpacing(16),
    borderRadius: scale(12),
    padding: scale(16),
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: verticalScale(8),
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  activityIcon: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "#E8F5E8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(12),
  },
  activityDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: "#4CAF50",
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: moderateScale(13),
    fontWeight: "500",
    color: "#333",
    marginBottom: verticalScale(2),
  },
  activityTime: {
    fontSize: moderateScale(11),
    color: "#999",
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
})
