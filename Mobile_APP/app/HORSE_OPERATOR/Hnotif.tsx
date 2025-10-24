// HORSE OPERATOR Notification Screen - COMPLETE UPDATED VERSION

"use client"

import { useEffect, useState, useRef } from "react"
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
  Platform,
} from "react-native"
import * as SecureStore from "expo-secure-store"
import AsyncStorage from '@react-native-async-storage/async-storage';

// Optional: Try to import Notifications (will be undefined if not installed)
let Notifications: any;
let Device: any;

const { width, height } = Dimensions.get("window")

// Configure notification handler
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

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

const isValidUrl = (urlString: string): boolean => {
  try {
    if (!urlString || urlString.trim() === "") {
      return false
    }
    const url = new URL(urlString)
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false
    }
    return true
  } catch (error) {
    console.log("[HorseOp] Invalid URL detected:", urlString, error)
    return false
  }
}

interface Notification {
  id: string
  notification_id?: string
  title: string
  message: string
  time: string
  type: "health" | "reminder" | "system" | "activity" | "appointment"
  priority: "high" | "medium" | "low"
  read: boolean
  imageUrls?: string[]
  image_urls?: string[]
  userId?: string | null
  scheduledTime?: string
  created_at?: string
  horseName?: string
  source?: string
  related_id?: string
  screen_route?: string
  params?: any
  posted_by_role?: string    // ✅ ADD THIS LINE
  formatted_date?: string     // ✅ ADD THIS LINE
}

interface NotificationsPageProps {
  onBack: () => void
  userName: string
}

// =============================================================================
// NOTIFICATION PERMISSION & SETUP
// =============================================================================

async function setupNotifications(): Promise<boolean> {
  if (!Notifications || !Device) {
    console.log('Notifications not available');
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('feed-water', {
      name: 'Feed & Water Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8B4513',
      sound: 'default',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      Alert.alert(
        'Permission Required', 
        'Please enable notifications to receive important updates.',
        [{ text: 'OK' }]
      );
      return false;
    }
    
    return true;
  } else {
    console.log('Physical device required for notifications');
    return false;
  }
}

// =============================================================================
// NOTIFICATION TRACKING
// =============================================================================

async function trackNotificationViewed(type: 'feed' | 'water' | 'announcement'): Promise<void> {
  try {
    const key = `horseop_last_viewed_${type}_notifications`;
    const now = new Date().toISOString();
    await AsyncStorage.setItem(key, now);
    console.log(`[HorseOp] Tracked ${type} notifications viewed at:`, now);
  } catch (error) {
    console.error('[HorseOp] Error tracking view:', error);
  }
}

async function getLastViewedTime(type: 'feed' | 'water' | 'announcement'): Promise<string | null> {
  try {
    const key = `horseop_last_viewed_${type}_notifications`;
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.error('[HorseOp] Error getting last viewed time:', error);
    return null;
  }
}

export default function HorseOperatorNotificationsPage({ onBack, userName }: NotificationsPageProps) {
  const safeArea = getSafeAreaPadding()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<"all" | "unread" | "health" | "reminders">("all")
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [lastViewedAnnouncementTime, setLastViewedAnnouncementTime] = useState<string | null>(null);
  

  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  // Load read status from SecureStore
  const loadReadStatus = async () => {
    try {
      const readStatusString = await SecureStore.getItemAsync("horseop_notification_read_status")
      if (readStatusString) {
        return JSON.parse(readStatusString)
      }
    } catch (error) {
      console.error("[HorseOp] Error loading read status:", error)
    }
    return {}
  }

  // Save read status to SecureStore
  const saveReadStatus = async (readStatus: { [key: string]: boolean }) => {
    try {
      await SecureStore.setItemAsync("horseop_notification_read_status", JSON.stringify(readStatus))
    } catch (error) {
      console.error("[HorseOp] Error saving read status:", error)
    }
  }

  // ========== FETCH NOTIFICATIONS FROM BACKEND API ==========
  const fetchNotificationsFromAPI = async () => {
    try {
      const encodedUser = encodeURIComponent(userName)
      const apiUrl = `http://192.168.1.8:8000/api/operator/notifications/?user_id=${encodedUser}`

      console.log("[HorseOp] Fetching notifications from backend:", apiUrl)

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("[HorseOp] Backend API response:", JSON.stringify(data, null, 2))

      const savedReadStatus = await loadReadStatus()

      let notificationsArray = data.notifications || []

      if (!Array.isArray(notificationsArray)) {
        console.warn("[HorseOp] API response is not an array, converting to array")
        notificationsArray = [notificationsArray]
      }

      const transformedNotifications: Notification[] = notificationsArray.map((item: any) => {
        const notifId = item.id || item.notification_id || item.announce_id || `notif-${Date.now()}`
        const notifTitle = item.title || item.announce_title || "Notification"
        const notifMessage = item.message || item.announce_content || ""
        const notifTime = item.time || "Unknown time"
        const notifType = item.type || "system"
        const notifPriority = item.priority || "medium"
        const createdAt = item.created_at || item.announce_date
        
        // Handle image URLs from backend
        let imageUrls: string[] = []
        const rawImageUrls = item.image_urls || item.image_url
        
        if (rawImageUrls) {
          if (Array.isArray(rawImageUrls)) {
            imageUrls = rawImageUrls.filter(url => isValidUrl(url))
          } else if (typeof rawImageUrls === "string") {
            const trimmedUrl = rawImageUrls.trim()
            if (trimmedUrl.startsWith("[")) {
              try {
                const imageArray = JSON.parse(trimmedUrl)
                if (Array.isArray(imageArray)) {
                  imageUrls = imageArray
                    .filter((url) => typeof url === "string" && url.trim() !== "")
                    .map((url) => url.trim())
                    .filter((url) => isValidUrl(url))
                }
              } catch (parseError) {
                console.log("[HorseOp] Failed to parse image URL array:", parseError)
              }
            } else if (isValidUrl(trimmedUrl)) {
              imageUrls = [trimmedUrl]
            }
          }
        }

        return {
          id: notifId.toString(),
          notification_id: notifId.toString(),
          title: notifTitle,
          message: notifMessage,
          time: notifTime,
          type: notifType as Notification["type"],
          priority: notifPriority as Notification["priority"],
          read: Boolean(savedReadStatus[notifId] || false),
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          image_urls: imageUrls.length > 0 ? imageUrls : undefined,
          created_at: createdAt,
          source: item.source,
          related_id: item.related_id,
          screen_route: item.screen_route,
          params: item.params,
        }
      })

      console.log("[HorseOp] Transformed notifications:", transformedNotifications.length)
      return transformedNotifications
    } catch (err: any) {
      console.error("[HorseOp] Backend API Error:", {
        message: err.message,
        stack: err.stack,
      })
      return []
    }
  }

  // ========== FETCH ALL NOTIFICATIONS ==========
  const fetchNotifications = async () => {
    try {
      setLoading(true)
      
      // Get notifications from backend API
      const backendNotifications = await fetchNotificationsFromAPI()
      
      // Combine all notifications
      const allNotifications = [...backendNotifications]
      
      // Sort by time (most recent first)
      allNotifications.sort((a: Notification, b: Notification) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
        return timeB - timeA
      })

      console.log("[HorseOp] Total notifications loaded:", allNotifications.length)
      setNotifications(allNotifications)
    } catch (error) {
      console.error("[HorseOp] Error fetching notifications:", error)
      Alert.alert("Connection Error", "Could not fetch notifications. Please try again.", [
        { text: "OK" },
      ])
    } finally {
      setLoading(false)
    }
  }

  // ========== LIFECYCLE ==========
  useEffect(() => {
    // Setup notifications
    setupNotifications();
    
    // Load last viewed times
    const loadLastViewed = async () => {
      const announceTime = await getLastViewedTime('announcement');
      setLastViewedAnnouncementTime(announceTime);
    };
    
    loadLastViewed();
    // Create a memoized fetch function
    const fetchData = async () => {
      await fetchNotifications();
    };
    
    fetchData();

    if (!Notifications) {
      return;
    }

    // Listen for notification when app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
      console.log('[HorseOp] Received in foreground:', notification);
      fetchData();
    });

    // Listen for notification responses (when user taps notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
      console.log('[HorseOp] User tapped notification:', response);
      fetchData();
    });

    return () => {
    notificationListener.current?.remove();
    responseListener.current?.remove();
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [userName]);

  // ========== MARK AS READ ==========
  const markAsRead = async (notificationId: string) => {
    const savedReadStatus = await loadReadStatus()
    const updatedReadStatus = {
      ...savedReadStatus,
      [notificationId]: true,
    }

    await saveReadStatus(updatedReadStatus)
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)))
  }

  // ========== MARK ALL AS READ ==========
  const markAllAsRead = async () => {
    const savedReadStatus = await loadReadStatus()
    const updatedReadStatus = { ...savedReadStatus }

    notifications.forEach((notification) => {
      updatedReadStatus[notification.id] = true
    })

    await saveReadStatus(updatedReadStatus)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    
    // Track viewed time
    await trackNotificationViewed('announcement')
    
    Alert.alert("Success", "All notifications marked as read")
  }

  // ========== DELETE NOTIFICATION ==========
  const deleteNotification = async (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    if (selectedNotification?.id === notificationId) {
      setModalVisible(false)
      setSelectedNotification(null)
    }
  }

  // ========== HANDLE NOTIFICATION PRESS ==========
  const handleNotificationPress = async (notification: Notification) => {
    console.log("[HorseOp] Notification pressed:", notification.title)
    console.log("[HorseOp] Image URLs:", notification.imageUrls)

    setImageError(false)
    setImageLoading(true)
    setCurrentImageIndex(0)

    if (!notification.read) {
      await markAsRead(notification.id)
    }

    setSelectedNotification({
      ...notification,
      read: true,
    })
    setModalVisible(true)
  }

  // ========== FILTER NOTIFICATIONS ==========
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

  // ========== GET PRIORITY COLOR ==========
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

  // ========== GET TYPE ICON ==========
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

  // ========== GET TYPE LABEL ==========
  const getTypeLabel = (type: Notification["type"]) => {
    switch (type) {
      case "health":
        return "Health"
      case "reminder":
        return "Reminder"
      case "system":
        return ""
      case "activity":
        return "Activity"
      case "appointment":
        return "Appointment"
      default:
        return "Announcement"
    }
  }

  // ========== GET ABSOLUTE IMAGE URL ==========
  const getAbsoluteImageUrl = (imageUrl: string): string => {
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      console.log("[HorseOp] Image URL is already absolute:", imageUrl)
      return imageUrl
    }

    const baseUrl = "http://192.168.1.8:8000"
    const absoluteUrl = imageUrl.startsWith("/") ? `${baseUrl}${imageUrl}` : `${baseUrl}/${imageUrl}`
    console.log("[HorseOp] Converted relative URL to absolute:", imageUrl, "->", absoluteUrl)
    return absoluteUrl
  }

  const filteredNotifications = getFilteredNotifications()
  const unreadCount = notifications.filter((n) => !n.read).length
  const reminderCount = notifications.filter((n) => n.type === "reminder").length

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF9800" translucent={false} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: safeArea.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <View style={styles.backArrow} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={async () => {
              await fetchNotifications();
              Alert.alert('Success', 'Notifications refreshed!');
            }}
          >
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
            <Text style={[styles.filterTabText, filter === "all" && styles.filterTabTextActive]}>
              All ({notifications.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === "unread" && styles.filterTabActive]}
            onPress={() => setFilter("unread")}
          >
            <Text style={[styles.filterTabText, filter === "unread" && styles.filterTabTextActive]}>
              Unread ({unreadCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === "health" && styles.filterTabActive]}
            onPress={() => setFilter("health")}
          >
            <Text style={[styles.filterTabText, filter === "health" && styles.filterTabTextActive]}>
              Health
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === "reminders" && styles.filterTabActive]}
            onPress={() => setFilter("reminders")}
          >
            <Text style={[styles.filterTabText, filter === "reminders" && styles.filterTabTextActive]}>
              ⏰ Reminders ({reminderCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Notifications List */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>⏳</Text>
            <Text style={styles.emptyStateTitle}>Loading notifications...</Text>
          </View>
        ) : filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📢</Text>
            <Text style={styles.emptyStateTitle}>No notifications</Text>
            <Text style={styles.emptyStateMessage}>
              {filter === "all" ? "You're all caught up!" : `No ${filter} notifications found.`}
            </Text>
            <TouchableOpacity 
              style={styles.refreshButtonLarge} 
              onPress={fetchNotifications}
            >
              <Text style={styles.refreshButtonText}>Refresh Notifications</Text>
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
                style={[styles.notificationItem, !notification.read && styles.notificationItemUnread]}
                onPress={() => handleNotificationPress(notification)}
                onLongPress={() => {
                  Alert.alert("Delete Notification", "Are you sure you want to delete this notification?", [
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
                    <Text style={styles.notificationIcon}>{getTypeIcon(notification.type)}</Text>
                    <View style={styles.notificationContent}>
                      <Text
                        style={[styles.notificationTitle, !notification.read && styles.notificationTitleUnread]}
                        numberOfLines={1}
                      >
                        {notification.title} {/* Shows "User has a new post" */}
                      </Text>
                      <Text style={styles.notificationMessage} numberOfLines={2}>
                        {notification.message} {/* Shows announcement title */}
                      </Text>
                      {notification.posted_by_role && (
                        <Text style={styles.roleBadge}>
                          {notification.posted_by_role}
                        </Text>
                      )}
                      {notification.formatted_date && (
                        <Text style={styles.detailedTime}>
                          📅 {notification.formatted_date}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.notificationRight}>
                    <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(notification.priority) }]} />
                    {!notification.read && <View style={styles.unreadDot} />}
                  </View>
                </View>
                <Text style={styles.notificationTime}>{notification.time}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Notification Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          console.log("[HorseOp] Modal close requested")
          setModalVisible(false)
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedNotification && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Notification Details</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => {
                      console.log("[HorseOp] Close button pressed")
                      setModalVisible(false)
                    }}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={true}>
                  <View style={styles.detailHeader}>
                    <Text style={styles.detailIcon}>{getTypeIcon(selectedNotification.type)}</Text>
                    <View style={styles.detailHeaderText}>
                      <Text style={styles.detailTitle}>{selectedNotification.title}</Text>
                      <View style={styles.detailMeta}>
                        {getTypeLabel(selectedNotification.type) && (
                          <Text style={styles.detailType}>{getTypeLabel(selectedNotification.type)}</Text>
                        )}
                        {selectedNotification.priority === "high" && (
                          <View
                            style={[
                              styles.detailPriority,
                              { backgroundColor: getPriorityColor(selectedNotification.priority) },
                            ]}
                          >
                            <Text style={styles.detailPriorityText}>
                              {selectedNotification.priority.toUpperCase()} PRIORITY
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  <Text style={styles.detailTime}>{selectedNotification.time}</Text>

                  {selectedNotification.horseName && (
                    <View style={styles.horseNameContainer}>
                      <Text style={styles.horseNameLabel}>Horse:</Text>
                      <Text style={styles.horseNameValue}>{selectedNotification.horseName}</Text>
                    </View>
                  )}

                  <View style={styles.detailMessageContainer}>
                    <Text style={styles.detailMessageLabel}>
                      {selectedNotification.type === 'reminder' 
                        ? 'Reminder Details:' 
                        : 'Full Announcement:'}
                    </Text>
                    <Text style={styles.detailMessage}>{selectedNotification.message}</Text>
                  </View>

                  {selectedNotification.imageUrls && selectedNotification.imageUrls.length > 0 && (
                    <View style={styles.imageCarouselContainer}>
                      <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={(event) => {
                          const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width)
                          setCurrentImageIndex(slideIndex)
                        }}
                        scrollEventThrottle={16}
                        style={styles.imageScrollView}
                      >
                        {selectedNotification.imageUrls.map((imageUrl, index) => (
                          <View key={index} style={styles.imageSlide}>
                            {imageLoading && !imageError && (
                              <View style={styles.imageLoadingContainer}>
                                <Text style={styles.imageLoadingText}>Loading image {index + 1}...</Text>
                              </View>
                            )}

                            {!imageError && (
                              <Image
                                source={{ uri: getAbsoluteImageUrl(imageUrl) }}
                                style={[styles.announcementImage, imageLoading && styles.imageHidden]}
                                resizeMode="contain"
                                onError={(error) => {
                                  console.log("[HorseOp] Image failed to load")
                                  console.log("[HorseOp] Error details:", JSON.stringify(error.nativeEvent))
                                  console.log("[HorseOp] Attempted URL:", getAbsoluteImageUrl(imageUrl))
                                  setImageError(true)
                                  setImageLoading(false)
                                }}
                                onLoad={() => {
                                  console.log("[HorseOp] Image loaded successfully:", getAbsoluteImageUrl(imageUrl))
                                  setImageLoading(false)
                                }}
                                onLoadStart={() => {
                                  console.log("[HorseOp] Image load started:", getAbsoluteImageUrl(imageUrl))
                                  setImageLoading(true)
                                }}
                              />
                            )}

                            {imageError && (
                              <View style={styles.imageErrorContainer}>
                                <Text style={styles.imageErrorText}>📷 Image unavailable</Text>
                                <Text style={styles.imageErrorSubtext}>Could not load image from server</Text>
                              </View>
                            )}
                          </View>
                        ))}
                      </ScrollView>

                      {selectedNotification.imageUrls.length > 1 && (
                        <View style={styles.paginationContainer}>
                          {selectedNotification.imageUrls.map((_, index) => (
                            <View
                              key={index}
                              style={[styles.paginationDot, currentImageIndex === index && styles.paginationDotActive]}
                            />
                          ))}
                        </View>
                      )}

                      {selectedNotification.imageUrls.length > 1 && (
                        <View style={styles.imageCounter}>
                          <Text style={styles.imageCounterText}>
                            {currentImageIndex + 1} / {selectedNotification.imageUrls.length}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => {
                      Alert.alert("Delete Notification", "Are you sure you want to delete this notification?", [
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
                      console.log("[HorseOp] Close button pressed in footer")
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
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FF9800",
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
    fontWeight: "600",
  },
  refreshButton: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: scale(6),
  },
  refreshText: {
    color: "white",
    fontSize: moderateScale(12),
    fontWeight: "600",
  },
  filterContainer: {
    paddingVertical: verticalScale(8),
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  filterScrollContent: {
    paddingHorizontal: scale(12),
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
    backgroundColor: "#8B4513",
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
    flex: 1,
  },
  notificationsList: {
    flex: 1,
  },
  notificationsScrollContent: {
    padding: scale(12),
    paddingBottom: verticalScale(20),
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
    borderLeftColor: "#8B4513",
    backgroundColor: "#FFF8F0",
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
    flex: 1,
  },
  notificationTitle: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(4),
  },
  notificationTitleUnread: {
    fontWeight: "bold",
    color: "#8B4513",
  },
  notificationMessage: {
    fontSize: moderateScale(14),
    color: "#666",
    lineHeight: moderateScale(20),
  },
  horseNameBadge: {
    fontSize: moderateScale(12),
    color: "#8B5A2B",
    backgroundColor: "#FFF3E0",
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(8),
    marginTop: verticalScale(6),
    alignSelf: "flex-start",
    fontWeight: "600",
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
    marginBottom: verticalScale(16),
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
    backgroundColor: "#8B4513",
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
  imageCarouselContainer: {
    width: "100%",
    marginTop: verticalScale(16),
    marginBottom: verticalScale(20),
  },
  imageScrollView: {
    width: "100%",
  },
  imageSlide: {
    width: width - scale(40),
    minHeight: scale(250),
    backgroundColor: "#F8F9FA",
    borderRadius: scale(12),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  announcementImage: {
    width: "100%",
    height: scale(250),
    backgroundColor: "#F8F9FA",
  },
  imageLoadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    zIndex: 1,
  },
  imageLoadingText: {
    fontSize: moderateScale(14),
    color: "#666",
    fontWeight: "500",
  },
  imageHidden: {
    opacity: 0,
  },
  imageErrorContainer: {
    width: "100%",
    height: scale(250),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
  },
  imageErrorText: {
    fontSize: moderateScale(16),
    color: "#999",
    fontWeight: "500",
    marginBottom: verticalScale(4),
  },
  imageErrorSubtext: {
    fontSize: moderateScale(12),
    color: "#BBB",
    fontStyle: "italic",
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
  horseNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    padding: scale(12),
    borderRadius: scale(8),
    marginBottom: verticalScale(16),
    borderLeftWidth: 4,
    borderLeftColor: "#8B4513",
  },
  horseNameLabel: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#8B5A2B",
    marginRight: scale(8),
  },
  horseNameValue: {
    fontSize: moderateScale(16),
    fontWeight: "bold",
    color: "#5D4037",
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
    borderLeftColor: "#8B4513",
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: verticalScale(12),
    gap: scale(8),
  },
  paginationDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: "#D0D0D0",
  },
  paginationDotActive: {
    backgroundColor: "#8B4513",
    width: scale(24),
  },
  imageCounter: {
    position: "absolute",
    top: scale(12),
    right: scale(12),
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(16),
  },
  imageCounterText: {
    color: "white",
    fontSize: moderateScale(12),
    fontWeight: "600",
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
    backgroundColor: "#8B4513",
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
  roleBadge: {
  fontSize: moderateScale(11),
  color: "#5E35B1",
  backgroundColor: "#EDE7F6",
  paddingHorizontal: scale(8),
  paddingVertical: verticalScale(3),
  borderRadius: scale(8),
  marginTop: verticalScale(4),
  alignSelf: "flex-start",
  fontWeight: "600",
},
detailedTime: {
  fontSize: moderateScale(11),
  color: "#757575",
  marginTop: verticalScale(4),
  fontStyle: "italic",
},
})