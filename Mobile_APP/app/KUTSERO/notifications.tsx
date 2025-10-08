import { useEffect, useState } from "react"
import {
  Alert,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Image,
} from "react-native"
import * as SecureStore from "expo-secure-store"

const { width, height } = Dimensions.get("window")

// Scaling functions
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

const getSafeAreaPadding = () => {
  const statusBarHeight = StatusBar.currentHeight || 0
  return {
    top: Math.max(statusBarHeight, 20),
    bottom: height > 800 ? 34 : 20,
  }
}

interface Notification {
  id: string
  title: string
  message: string
  time: string
  type: "health" | "reminder" | "system" | "activity" | "appointment"
  priority: "high" | "medium" | "low"
  read: boolean
  imageUrl?: string | null
  userId?: string | null
}

interface NotificationsPageProps {
  onBack: () => void
  userName: string
}

export default function NotificationsPage({ onBack, userName }: NotificationsPageProps) {
  const safeArea = getSafeAreaPadding()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<"all" | "unread" | "health" | "reminders">("all")
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [modalVisible, setModalVisible] = useState(false)

  // Helper function to map announcement type - FIXED TO AVOID "HEALTH ANNOUNCEMENT"
  const mapAnnouncementType = (title: string, content: string): Notification["type"] => {
    const lowerTitle = title.toLowerCase()
    const lowerContent = content.toLowerCase()
    
    if (lowerTitle.includes('health') || lowerContent.includes('health') || 
        lowerTitle.includes('medical') || lowerContent.includes('medical') ||
        lowerTitle.includes('vet') || lowerContent.includes('vet') ||
        lowerTitle.includes('animal') || lowerContent.includes('animal')) {
      return "health"
    }
    
    if (lowerTitle.includes('reminder') || lowerContent.includes('reminder') ||
        lowerTitle.includes('alert') || lowerContent.includes('alert')) {
      return "reminder"
    }
    
    if (lowerTitle.includes('appointment') || lowerContent.includes('appointment') ||
        lowerTitle.includes('schedule') || lowerContent.includes('schedule')) {
      return "appointment"
    }
    
    if (lowerTitle.includes('activity') || lowerContent.includes('activity')) {
      return "activity"
    }
    
    return "system"
  }

  // Helper function to map priority - FIXED TO AVOID DEFAULT "MEDIUM"
  const mapPriority = (title: string, content: string): Notification["priority"] => {
    const lowerTitle = title.toLowerCase()
    const lowerContent = content.toLowerCase()
    
    if (lowerTitle.includes('urgent') || lowerContent.includes('urgent') ||
        lowerTitle.includes('important') || lowerContent.includes('important') ||
        lowerTitle.includes('critical') || lowerContent.includes('critical') ||
        lowerTitle.includes('emergency') || lowerContent.includes('emergency')) {
      return "high"
    }
    
    if (lowerTitle.includes('low') || lowerContent.includes('low') ||
        lowerTitle.includes('info') || lowerContent.includes('info') ||
        lowerTitle.includes('information') || lowerContent.includes('information') ||
        lowerTitle.includes('notice') || lowerContent.includes('notice')) {
      return "low"
    }
    
    // Only assign medium if there are explicit medium priority indicators
    if (lowerTitle.includes('moderate') || lowerContent.includes('moderate') ||
        lowerTitle.includes('standard') || lowerContent.includes('standard')) {
      return "medium"
    }
    
    // Default to low instead of medium
    return "low"
  }

  // Load read status from SecureStore
  const loadReadStatus = async () => {
    try {
      const readStatusString = await SecureStore.getItemAsync("notification_read_status")
      if (readStatusString) {
        return JSON.parse(readStatusString)
      }
    } catch (error) {
      console.error("Error loading read status:", error)
    }
    return {}
  }

  // Save read status to SecureStore
  const saveReadStatus = async (readStatus: { [key: string]: boolean }) => {
    try {
      await SecureStore.setItemAsync("notification_read_status", JSON.stringify(readStatus))
    } catch (error) {
      console.error("Error saving read status:", error)
    }
  }

  // Fetch announcements from API
  const fetchNotifications = async () => {
    try {
      const encodedUser = encodeURIComponent(userName)
      const apiUrl = `http://192.168.1.8:8000/api/kutsero/announcements/?user=${encodedUser}`
      
      console.log("Fetching announcements from:", apiUrl)
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON')
      }
      
      const data = await response.json()
      console.log("Raw API response:", JSON.stringify(data, null, 2))

      // Load saved read status
      const savedReadStatus = await loadReadStatus()

      // If the API returns an object instead of array, handle it
      let announcementsArray = data
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        announcementsArray = data.announcements || data.data || data.results || [data]
      }

      if (!Array.isArray(announcementsArray)) {
        console.warn("API response is not an array, converting to array")
        announcementsArray = [announcementsArray]
      }

      const transformedNotifications = announcementsArray.map((item: any, index: number) => {
        const announceId = item.announce_id || item.id || `announce-${Date.now()}-${index}`
        const announceTitle = item.announce_title || item.announce_titl || item.title || "CTU Announcement"
        const announceContent = item.announce_content || item.announce_cor || item.message || item.content || "New announcement"
        const announceDate = item.announce_date || item.announce_dat || item.timestamp || item.created_at || new Date().toISOString()
        
        const rawImageUrl = item.announce_image || item.announce_imt || item.image_url
        const imageUrl = rawImageUrl && rawImageUrl.trim() !== '' ? rawImageUrl : undefined
        
        const rawUserId = item.user_id || item.userId
        const userId = rawUserId && rawUserId.trim() !== '' ? rawUserId : undefined
        
        // Format time for display - REMOVED "Published on"
        const date = new Date(announceDate)
        const displayTime = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }) + ' at ' + date.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })

        const notificationId = announceId.toString()

        return {
          id: notificationId,
          title: announceTitle,
          message: announceContent,
          time: displayTime,
          type: mapAnnouncementType(announceTitle, announceContent),
          priority: mapPriority(announceTitle, announceContent),
          read: Boolean(savedReadStatus[notificationId] || false), // Use saved read status
          imageUrl: imageUrl,
          userId: userId
        }
      })

      // Sort by date (newest first)
      transformedNotifications.sort((a: Notification, b: Notification) => {
        return new Date(b.time).getTime() - new Date(a.time).getTime()
      })

      console.log("Transformed notifications:", transformedNotifications)
      setNotifications(transformedNotifications)

    } catch (err: any) {
      console.error("Fetch Error Details:", {
        message: err.message,
        stack: err.stack
      })
      
      Alert.alert(
        "Connection Error", 
        "Could not fetch announcements. Please check your connection and try again.",
        [{ text: "OK" }]
      )
      
      // Load saved read status for fallback data too
      const savedReadStatus = await loadReadStatus()
      
      // Fallback with sample data
      setNotifications([
        {
          id: "1",
          title: "Animal Care Schedule Update",
          message: "Regular animal care schedule has been updated for next week. Please ensure all animals are available for examination. The veterinary team will be conducting routine checks and vaccinations for all livestock.",
          time: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }) + ' at ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: "health",
          priority: "high",
          read: Boolean(savedReadStatus["1"] || false),
          imageUrl: undefined,
          userId: undefined
        },
        {
          id: "2",
          title: "New Veterinary Services Available",
          message: "We are pleased to announce that new veterinary services are now available at the clinic. Our upgraded facilities include advanced diagnostic equipment and specialized treatment options for various animal conditions.",
          time: new Date(Date.now() - 3600000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }) + ' at ' + new Date(Date.now() - 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: "system",
          priority: "low",
          read: Boolean(savedReadStatus["2"] || false),
          imageUrl: undefined,
          userId: undefined
        },
        {
          id: "3",
          title: "Farm Maintenance Reminder",
          message: "This is a reminder for scheduled farm maintenance next Monday. Please ensure all equipment is properly stored and facilities are ready for inspection.",
          time: new Date(Date.now() - 7200000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }) + ' at ' + new Date(Date.now() - 7200000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: "reminder",
          priority: "low",
          read: Boolean(savedReadStatus["3"] || false),
          imageUrl: undefined,
          userId: undefined
        }
      ])
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [userName])

  // FIXED: Mark as read and persist to SecureStore
  const markAsRead = async (notificationId: string) => {
    const savedReadStatus = await loadReadStatus()
    const updatedReadStatus = {
      ...savedReadStatus,
      [notificationId]: true
    }
    
    await saveReadStatus(updatedReadStatus)
    
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    )
  }

  // FIXED: Mark all as read and persist to SecureStore
  const markAllAsRead = async () => {
    const savedReadStatus = await loadReadStatus()
    const updatedReadStatus = { ...savedReadStatus }
    
    notifications.forEach(notification => {
      updatedReadStatus[notification.id] = true
    })
    
    await saveReadStatus(updatedReadStatus)
    
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    Alert.alert("Success", "All notifications marked as read")
  }

  const deleteNotification = (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    if (selectedNotification?.id === notificationId) {
      setModalVisible(false)
      setSelectedNotification(null)
    }
  }

  const handleNotificationPress = async (notification: Notification) => {
    console.log("Notification pressed:", notification.title)
    
    // Mark as read when opened and persist
    if (!notification.read) {
      await markAsRead(notification.id)
    }
    
    // Show detailed view
    setSelectedNotification({
      ...notification,
      read: true // Ensure the selected notification shows as read
    })
    setModalVisible(true)
    console.log("Modal should be visible now")
  }

  const getFilteredNotifications = () => {
    switch (filter) {
      case "unread":
        return notifications.filter((n) => !n.read)
      case "health":
        return notifications.filter((n) => n.type === "health")
      case "reminders":
        return notifications.filter((n) => n.type === "reminder")
      default:
        return notifications
    }
  }

  const getPriorityColor = (priority: Notification["priority"]) => {
    switch (priority) {
      case "high":
        return "#FF4444"
      case "medium":
        return "#FF9800"
      case "low":
        return "#4CAF50"
      default:
        return "#666"
    }
  }

  const getTypeIcon = (type: Notification["type"]) => {
    switch (type) {
      case "health":
        return "🏥"
      case "reminder":
        return "⏰"
      case "system":
        return "⚙️"
      case "activity":
        return "✅"
      case "appointment":
        return "📅"
      default:
        return "📢"
    }
  }

  // FIXED: Simplified type labels - remove unwanted labels including system/update
  const getTypeLabel = (type: Notification["type"]) => {
    switch (type) {
      case "health":
        return "Health"
      case "reminder":
        return "Reminder"
      case "system":
        return "" // Don't show any label for system notifications
      case "activity":
        return "Activity"
      case "appointment":
        return "Appointment"
      default:
        return "Announcement"
    }
  }

  const filteredNotifications = getFilteredNotifications()
  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2E7D32" translucent={false} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: safeArea.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <View style={styles.backArrow} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Announcements</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchNotifications}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Mark All</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          <TouchableOpacity
            style={[styles.filterTab, filter === "all" && styles.filterTabActive]}
            onPress={() => setFilter("all")}
          >
            <Text
              style={[styles.filterTabText, filter === "all" && styles.filterTabTextActive]}
            >
              All ({notifications.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === "unread" && styles.filterTabActive]}
            onPress={() => setFilter("unread")}
          >
            <Text
              style={[styles.filterTabText, filter === "unread" && styles.filterTabTextActive]}
            >
              Unread ({unreadCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === "reminders" && styles.filterTabActive]}
            onPress={() => setFilter("reminders")}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === "reminders" && styles.filterTabTextActive,
              ]}
            >
              Reminders
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Notifications List */}
      <View style={styles.content}>
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📢</Text>
            <Text style={styles.emptyStateTitle}>No announcements</Text>
            <Text style={styles.emptyStateMessage}>
              {filter === "all"
                ? "You're all caught up!"
                : `No ${filter} announcements found.`}
            </Text>
            <TouchableOpacity style={styles.refreshButtonLarge} onPress={fetchNotifications}>
              <Text style={styles.refreshButtonText}>Refresh Announcements</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.notificationsList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.notificationsScrollContent}
          >
            {filteredNotifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationItem,
                  !notification.read && styles.notificationItemUnread,
                ]}
                onPress={() => handleNotificationPress(notification)}
                onLongPress={() => {
                  Alert.alert("Delete Announcement", "Are you sure you want to delete this announcement?", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => deleteNotification(notification.id),
                    },
                  ])
                }}
              >
                <View style={styles.notificationHeader}>
                  <View style={styles.notificationLeft}>
                    <Text style={styles.notificationIcon}>
                      {getTypeIcon(notification.type)}
                    </Text>
                    <View style={styles.notificationContent}>
                      <Text
                        style={[
                          styles.notificationTitle,
                          !notification.read && styles.notificationTitleUnread,
                        ]}
                        numberOfLines={1}
                      >
                        {notification.title}
                      </Text>
                      <Text style={styles.notificationMessage} numberOfLines={2}>
                        {notification.message}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.notificationRight}>
                    <View
                      style={[
                        styles.priorityDot,
                        { backgroundColor: getPriorityColor(notification.priority) },
                      ]}
                    />
                    {!notification.read && <View style={styles.unreadDot} />}
                  </View>
                </View>
                <Text style={styles.notificationTime}>{notification.time}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Announcement Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          console.log("Modal close requested")
          setModalVisible(false)
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedNotification && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Announcement Details</Text>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => {
                      console.log("Close button pressed")
                      setModalVisible(false)
                    }}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={true}>
                  {/* Announcement Image */}
                  {selectedNotification.imageUrl && (
                    <Image 
                      source={{ uri: selectedNotification.imageUrl }}
                      style={styles.announcementImage}
                      resizeMode="cover"
                    />
                  )}
                  
                  <View style={styles.detailHeader}>
                    <Text style={styles.detailIcon}>
                      {getTypeIcon(selectedNotification.type)}
                    </Text>
                    <View style={styles.detailHeaderText}>
                      <Text style={styles.detailTitle}>{selectedNotification.title}</Text>
                      <View style={styles.detailMeta}>
                        {/* Only show type label if it's not empty */}
                        {getTypeLabel(selectedNotification.type) && (
                          <Text style={styles.detailType}>
                            {getTypeLabel(selectedNotification.type)}
                          </Text>
                        )}
                        {/* Only show priority if it's high priority */}
                        {selectedNotification.priority === "high" && (
                          <View style={[
                            styles.detailPriority,
                            { backgroundColor: getPriorityColor(selectedNotification.priority) }
                          ]}>
                            <Text style={styles.detailPriorityText}>
                              {selectedNotification.priority.toUpperCase()} PRIORITY
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  
                  {/* FIXED: Removed calendar icon from date */}
                  <Text style={styles.detailTime}>
                    {selectedNotification.time}
                  </Text>
                  
                  <View style={styles.detailMessageContainer}>
                    <Text style={styles.detailMessageLabel}>Full Announcement:</Text>
                    <Text style={styles.detailMessage}>
                      {selectedNotification.message}
                    </Text>
                  </View>
                </ScrollView>
                
                <View style={styles.modalFooter}>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => {
                      Alert.alert("Delete Announcement", "Are you sure you want to delete this announcement?", [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () => {
                            deleteNotification(selectedNotification.id)
                            setModalVisible(false)
                          },
                        },
                      ])
                    }}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.closeModalButton}
                    onPress={() => {
                      console.log("Close button pressed in footer")
                      setModalVisible(false)
                    }}
                  >
                    <Text style={styles.closeModalButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#F5F5F5" 
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#C17A47",
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(12),
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    justifyContent: "center",
    alignItems: "center",
    borderRadius: scale(20),
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  backArrow: {
    width: scale(12),
    height: scale(12),
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: "white",
    transform: [{ rotate: "45deg" }],
  },
  headerTitle: {
    flex: 1,
    fontSize: moderateScale(17),
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginHorizontal: scale(10),
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  markAllButton: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: scale(6),
    marginLeft: scale(8),
  },
  markAllText: { 
    color: "white", 
    fontSize: moderateScale(12), 
    fontWeight: "600" 
  },
  refreshButton: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: scale(6),
    marginRight: scale(8),
  },
  refreshText: { 
    color: "white", 
    fontSize: moderateScale(12), 
    fontWeight: "600" 
  },
  filterContainer: { 
    paddingVertical: verticalScale(8), 
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  filterScrollContent: { 
    paddingHorizontal: scale(12) 
  },
  filterTab: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    backgroundColor: "#F0F0F0",
    marginRight: scale(8),
    minWidth: scale(80),
    alignItems: "center",
  },
  filterTabActive: { 
    backgroundColor: "#e2a90cff" 
  },
  filterTabText: { 
    fontSize: moderateScale(12), 
    color: "#666",
    fontWeight: "500",
  },
  filterTabTextActive: { 
    color: "white",
    fontWeight: "600",
  },
  content: { 
    flex: 1 
  },
  notificationsList: {
    flex: 1,
  },
  notificationsScrollContent: { 
    padding: scale(12), 
    paddingBottom: verticalScale(20) 
  },
  notificationItem: {
    backgroundColor: "#fff",
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: verticalScale(10),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    minHeight: verticalScale(90),
  },
  notificationItemUnread: { 
    borderLeftWidth: 4, 
    borderLeftColor: "rgba(185, 128, 21, 1)",
    backgroundColor: "#F9F9F9",
  },
  notificationHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  notificationLeft: { 
    flexDirection: "row", 
    flex: 1,
    alignItems: "flex-start",
  },
  notificationIcon: { 
    fontSize: moderateScale(24),
    marginRight: scale(12),
    marginTop: scale(2),
  },
  notificationContent: { 
    flex: 1 
  },
  notificationTitle: { 
    fontSize: moderateScale(16), 
    fontWeight: "600", 
    color: "#333",
    marginBottom: verticalScale(4),
  },
  notificationTitleUnread: { 
    fontWeight: "bold",
    color: "#b96606ff",
  },
  notificationMessage: { 
    fontSize: moderateScale(14), 
    color: "#666", 
    lineHeight: moderateScale(20),
  },
  notificationRight: { 
    justifyContent: "flex-start", 
    alignItems: "center", 
    marginLeft: scale(8),
    paddingTop: scale(2),
  },
  priorityDot: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    marginBottom: verticalScale(6),
  },
  unreadDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: "#E53E3E",
  },
  notificationTime: { 
    fontSize: moderateScale(11), 
    color: "#999", 
    marginTop: verticalScale(8),
    fontStyle: "italic",
  },
  emptyState: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    paddingHorizontal: scale(40),
  },
  emptyStateIcon: { 
    fontSize: moderateScale(48), 
    marginBottom: verticalScale(16) 
  },
  emptyStateTitle: { 
    fontSize: moderateScale(18), 
    fontWeight: "bold", 
    color: "#666",
    marginBottom: verticalScale(8),
  },
  emptyStateMessage: { 
    fontSize: moderateScale(14), 
    color: "#999", 
    textAlign: "center",
    lineHeight: moderateScale(20),
  },
  refreshButtonLarge: {
    backgroundColor: "#d69721ff",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    borderRadius: scale(8),
    marginTop: verticalScale(20),
  },
  refreshButtonText: {
    color: "white",
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: scale(10),
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: scale(16),
    width: "95%",
    height: "90%",
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    backgroundColor: "#F9F9F9",
  },
  modalTitle: {
    fontSize: moderateScale(20),
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: scale(8),
    borderRadius: scale(20),
    backgroundColor: "#F0F0F0",
    width: scale(36),
    height: scale(36),
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: moderateScale(18),
    color: "#666",
    fontWeight: "bold",
  },
  modalBody: {
    flex: 1,
    padding: scale(20),
  },
  announcementImage: {
    width: '100%',
    height: scale(200),
    borderRadius: scale(12),
    marginBottom: verticalScale(16),
  },
  detailHeader: {
    flexDirection: "row",
    marginBottom: verticalScale(20),
    alignItems: "flex-start",
  },
  detailIcon: {
    fontSize: moderateScale(32),
    marginRight: scale(16),
    marginTop: scale(4),
  },
  detailHeaderText: {
    flex: 1,
  },
  detailTitle: {
    fontSize: moderateScale(22),
    fontWeight: "bold",
    color: "#333",
    marginBottom: verticalScale(8),
    lineHeight: moderateScale(26),
  },
  detailMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: scale(8),
  },
  detailType: {
    fontSize: moderateScale(14),
    color: "#666",
    backgroundColor: "#F0F0F0",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(12),
    fontWeight: "500",
  },
  detailPriority: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: scale(12),
  },
  detailPriorityText: {
    fontSize: moderateScale(12),
    color: "white",
    fontWeight: "bold",
  },
  detailTime: {
    fontSize: moderateScale(16),
    color: "#666",
    marginBottom: verticalScale(20),
    backgroundColor: "#F8F9FA",
    padding: scale(14),
    borderRadius: scale(8),
    fontStyle: "italic",
  },
  detailMessageContainer: {
    marginBottom: verticalScale(20),
  },
  detailMessageLabel: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(12),
  },
  detailMessage: {
    fontSize: moderateScale(16),
    color: "#555",
    lineHeight: moderateScale(24),
    textAlign: "justify",
    backgroundColor: "#F8F9FA",
    padding: scale(16),
    borderRadius: scale(8),
    borderLeftWidth: 4,
    borderLeftColor: "#2E7D32",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: scale(20),
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    backgroundColor: "#F9F9F9",
    gap: scale(12),
  },
  deleteButton: {
    backgroundColor: "#DC3545",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    borderRadius: scale(8),
    flex: 1,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  deleteButtonText: {
    color: "white",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
  closeModalButton: {
    backgroundColor: "#2E7D32",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    borderRadius: scale(8),
    flex: 1,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  closeModalButtonText: {
    color: "white",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
})