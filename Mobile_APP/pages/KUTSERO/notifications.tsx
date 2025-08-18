import { useState } from "react"
import {
    Alert,
    Dimensions,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

const { width, height } = Dimensions.get("window")

// Enhanced responsive scaling functions
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

interface NotificationsPageProps {
  onBack: () => void
  userName: string
}

interface Notification {
  id: string
  title: string
  message: string
  time: string
  type: 'health' | 'reminder' | 'system' | 'activity' | 'appointment'
  priority: 'high' | 'medium' | 'low'
  read: boolean
}

export default function NotificationsPage({ onBack, userName }: NotificationsPageProps) {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      title: "Health Alert",
      message: "Oscar's temperature is slightly elevated. Consider scheduling a vet checkup.",
      time: "2 hours ago",
      type: "health",
      priority: "high",
      read: false,
    },
    {
      id: "2",
      title: "Feeding Reminder",
      message: "Time for Thunder's evening feed. Don't forget the supplements.",
      time: "4 hours ago",
      type: "reminder",
      priority: "medium",
      read: false,
    },
    {
      id: "3",
      title: "System Update",
      message: "New features available in the horse care module. Check them out!",
      time: "1 day ago",
      type: "system",
      priority: "low",
      read: true,
    },
    {
      id: "4",
      title: "Activity Complete",
      message: "Bella's morning exercise session has been completed successfully.",
      time: "2 days ago",
      type: "activity",
      priority: "low",
      read: true,
    },
    {
      id: "5",
      title: "Appointment Scheduled",
      message: "Vet appointment for Storm scheduled for tomorrow at 10:00 AM.",
      time: "3 days ago",
      type: "appointment",
      priority: "medium",
      read: true,
    },
  ])

  const [filter, setFilter] = useState<'all' | 'unread' | 'health' | 'reminders'>('all')
  const safeArea = getSafeAreaPadding()

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    )
    Alert.alert("Success", "All notifications marked as read")
  }

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev =>
      prev.filter(notification => notification.id !== notificationId)
    )
  }

  const getFilteredNotifications = () => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.read)
      case 'health':
        return notifications.filter(n => n.type === 'health')
      case 'reminders':
        return notifications.filter(n => n.type === 'reminder')
      default:
        return notifications
    }
  }

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high':
        return '#FF4444'
      case 'medium':
        return '#FF9800'
      case 'low':
        return '#4CAF50'
      default:
        return '#666'
    }
  }

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'health':
        return '🏥'
      case 'reminder':
        return '⏰'
      case 'system':
        return '⚙️'
      case 'activity':
        return '✅'
      case 'appointment':
        return '📅'
      default:
        return '📢'
    }
  }

  const filteredNotifications = getFilteredNotifications()
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2E7D32" translucent={false} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: safeArea.top }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <View style={styles.backArrow} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <TouchableOpacity 
            style={styles.markAllButton}
            onPress={markAllAsRead}
          >
            <Text style={styles.markAllText}>Mark All</Text>
          </TouchableOpacity>
        </View>
        
        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            <TouchableOpacity
              style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
                All ({notifications.length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterTab, filter === 'unread' && styles.filterTabActive]}
              onPress={() => setFilter('unread')}
            >
              <Text style={[styles.filterTabText, filter === 'unread' && styles.filterTabTextActive]}>
                Unread ({unreadCount})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterTab, filter === 'health' && styles.filterTabActive]}
              onPress={() => setFilter('health')}
            >
              <Text style={[styles.filterTabText, filter === 'health' && styles.filterTabTextActive]}>
                Health
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterTab, filter === 'reminders' && styles.filterTabActive]}
              onPress={() => setFilter('reminders')}
            >
              <Text style={[styles.filterTabText, filter === 'reminders' && styles.filterTabTextActive]}>
                Reminders
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🔔</Text>
            <Text style={styles.emptyStateTitle}>No notifications</Text>
            <Text style={styles.emptyStateMessage}>
              {filter === 'all' 
                ? "You're all caught up!" 
                : `No ${filter} notifications found.`}
            </Text>
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
                  !notification.read && styles.notificationItemUnread
                ]}
                onPress={() => markAsRead(notification.id)}
                onLongPress={() => {
                  Alert.alert(
                    "Delete Notification",
                    "Are you sure you want to delete this notification?",
                    [
                      { text: "Cancel", style: "cancel" },
                      { 
                        text: "Delete", 
                        style: "destructive",
                        onPress: () => deleteNotification(notification.id)
                      }
                    ]
                  )
                }}
              >
                <View style={styles.notificationHeader}>
                  <View style={styles.notificationLeft}>
                    <Text style={styles.notificationIcon}>
                      {getTypeIcon(notification.type)}
                    </Text>
                    <View style={styles.notificationContent}>
                      <Text style={[
                        styles.notificationTitle,
                        !notification.read && styles.notificationTitleUnread
                      ]}>
                        {notification.title}
                      </Text>
                      <Text style={styles.notificationMessage}>
                        {notification.message}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.notificationRight}>
                    <View 
                      style={[
                        styles.priorityDot,
                        { backgroundColor: getPriorityColor(notification.priority) }
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
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(16),
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(16),
  },
  backButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  backArrow: {
    width: scale(8),
    height: scale(8),
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: "white",
    transform: [{ rotate: "45deg" }],
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: "bold",
    color: "white",
    flex: 1,
    textAlign: "center",
    marginHorizontal: scale(16),
  },
  markAllButton: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: scale(16),
  },
  markAllText: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "white",
  },
  filterContainer: {
    marginTop: verticalScale(8),
  },
  filterScrollContent: {
    paddingHorizontal: scale(4),
  },
  filterTab: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    marginHorizontal: scale(4),
    borderRadius: scale(20),
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  filterTabActive: {
    backgroundColor: "white",
  },
  filterTabText: {
    fontSize: moderateScale(12),
    fontWeight: "500",
    color: "rgba(255,255,255,0.8)",
  },
  filterTabTextActive: {
    color: "#2E7D32",
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: scale(32),
  },
  emptyStateIcon: {
    fontSize: moderateScale(48),
    marginBottom: verticalScale(16),
  },
  emptyStateTitle: {
    fontSize: moderateScale(18),
    fontWeight: "bold",
    color: "#333",
    marginBottom: verticalScale(8),
  },
  emptyStateMessage: {
    fontSize: moderateScale(14),
    color: "#666",
    textAlign: "center",
    lineHeight: moderateScale(20),
  },
  notificationsList: {
    flex: 1,
  },
  notificationsScrollContent: {
    paddingVertical: verticalScale(8),
  },
  notificationItem: {
    backgroundColor: "white",
    marginHorizontal: scale(16),
    marginVertical: verticalScale(4),
    borderRadius: scale(12),
    padding: scale(16),
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  notificationItemUnread: {
    borderLeftWidth: 4,
    borderLeftColor: "#2E7D32",
    elevation: 2,
    shadowOpacity: 0.15,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: verticalScale(8),
  },
  notificationLeft: {
    flexDirection: "row",
    flex: 1,
  },
  notificationIcon: {
    fontSize: moderateScale(20),
    marginRight: scale(12),
    marginTop: verticalScale(2),
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: moderateScale(14),
    fontWeight: "500",
    color: "#333",
    marginBottom: verticalScale(4),
  },
  notificationTitleUnread: {
    fontWeight: "600",
    color: "#000",
  },
  notificationMessage: {
    fontSize: moderateScale(12),
    color: "#666",
    lineHeight: moderateScale(16),
  },
  notificationRight: {
    alignItems: "center",
    marginLeft: scale(8),
  },
  priorityDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    marginBottom: verticalScale(4),
  },
  unreadDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: "#2E7D32",
  },
  notificationTime: {
    fontSize: moderateScale(11),
    color: "#999",
    textAlign: "right",
  },
})
