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
} from "react-native"

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
}

interface NotificationsPageProps {
  onBack: () => void
  userName: string
}

export default function NotificationsPage({ onBack, userName }: NotificationsPageProps) {
  const safeArea = getSafeAreaPadding()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<"all" | "unread" | "health" | "reminders">("all")

  // Fetch announcements from API
  const fetchNotifications = async () => {
  try {
    const encodedUser = encodeURIComponent(userName)
    const response = await fetch(
      `http://192.168.1.7:8000/api/kutsero/announcements/?user=${encodedUser}`
    )
    if (!response.ok) throw new Error("Network response was not ok")
    const data = await response.json()

    console.log("Announcements API response:", data) // 🔹 log the response

    // Temporarily set the raw data to see if anything shows up
    setNotifications(Array.isArray(data) ? data : [])
  } catch (err: any) {
    console.error("Fetch Error:", err)
    Alert.alert("Error", "Failed to fetch notifications: " + err.message)
  }
}

  useEffect(() => {
    fetchNotifications()
  }, [])

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    )
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    Alert.alert("Success", "All notifications marked as read")
  }

  const deleteNotification = (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
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
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
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
            style={[styles.filterTab, filter === "health" && styles.filterTabActive]}
            onPress={() => setFilter("health")}
          >
            <Text
              style={[styles.filterTabText, filter === "health" && styles.filterTabTextActive]}
            >
              Health
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
            <Text style={styles.emptyStateIcon}>🔔</Text>
            <Text style={styles.emptyStateTitle}>No notifications</Text>
            <Text style={styles.emptyStateMessage}>
              {filter === "all"
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
                  !notification.read && styles.notificationItemUnread,
                ]}
                onPress={() => markAsRead(notification.id)}
                onLongPress={() => {
                  Alert.alert("Delete Notification", "Are you sure?", [
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
                      >
                        {notification.title}
                      </Text>
                      <Text style={styles.notificationMessage}>{notification.message}</Text>
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#2E7D32",
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(12),
    elevation: 4,
  },
  backButton: {
    width: scale(32),
    height: scale(32),
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
    flex: 1,
    fontSize: moderateScale(18),
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
  markAllButton: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
  },
  markAllText: { color: "white", fontSize: moderateScale(12), fontWeight: "600" },
  filterContainer: { paddingVertical: verticalScale(8), backgroundColor: "#fff" },
  filterScrollContent: { paddingHorizontal: scale(12) },
  filterTab: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(20),
    backgroundColor: "#F0F0F0",
    marginRight: scale(8),
  },
  filterTabActive: { backgroundColor: "#2E7D32" },
  filterTabText: { fontSize: moderateScale(12), color: "#666" },
  filterTabTextActive: { color: "white" },
  content: { flex: 1 },
  notificationsList: {},
  notificationsScrollContent: { padding: scale(12), paddingBottom: verticalScale(20) },
  notificationItem: {
    backgroundColor: "#fff",
    borderRadius: scale(12),
    padding: scale(12),
    marginBottom: verticalScale(10),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationItemUnread: { borderLeftWidth: 4, borderLeftColor: "#2E7D32" },
  notificationHeader: { flexDirection: "row", justifyContent: "space-between" },
  notificationLeft: { flexDirection: "row", flex: 1 },
  notificationIcon: { fontSize: moderateScale(18), marginRight: scale(8) },
  notificationContent: { flex: 1 },
  notificationTitle: { fontSize: moderateScale(14), fontWeight: "600", color: "#333" },
  notificationTitleUnread: { fontWeight: "bold" },
  notificationMessage: { fontSize: moderateScale(12), color: "#666", marginTop: verticalScale(2) },
  notificationRight: { justifyContent: "center", alignItems: "center", marginLeft: scale(8) },
  priorityDot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    marginBottom: verticalScale(4),
  },
  unreadDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: "#E53E3E",
  },
  notificationTime: { fontSize: moderateScale(10), color: "#999", marginTop: verticalScale(4) },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: verticalScale(40) },
  emptyStateIcon: { fontSize: moderateScale(40), marginBottom: verticalScale(8) },
  emptyStateTitle: { fontSize: moderateScale(16), fontWeight: "bold", color: "#666" },
  emptyStateMessage: { fontSize: moderateScale(12), color: "#999", marginTop: verticalScale(4), textAlign: "center" },
})
