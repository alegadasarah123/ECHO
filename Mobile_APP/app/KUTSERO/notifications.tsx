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
} from "react-native"
import * as SecureStore from "expo-secure-store"
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Optional: Try to import Notifications (will be undefined if not installed)
let Notifications: any;
let Device: any;
try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
} catch (e) {
  console.log('expo-notifications not installed, notification features will be limited');
}

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
    console.log("[v0] Invalid URL detected:", urlString, error)
    return false
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
  imageUrls?: string[]
  userId?: string | null
  scheduledTime?: string
  horseName?: string
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
      lightColor: '#C17A47',
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
        'Please enable notifications to receive feed and water reminders.',
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
    const key = `last_viewed_${type}_notifications`;
    const now = new Date().toISOString();
    await AsyncStorage.setItem(key, now);
    console.log(`[Notification] Tracked ${type} notifications viewed at:`, now);
  } catch (error) {
    console.error('[Notification] Error tracking view:', error);
  }
}

async function getLastViewedTime(type: 'feed' | 'water' | 'announcement'): Promise<string | null> {
  try {
    const key = `last_viewed_${type}_notifications`;
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.error('[Notification] Error getting last viewed time:', error);
    return null;
  }
}

export default function NotificationsPage({ onBack, userName }: NotificationsPageProps) {
  const safeArea = getSafeAreaPadding()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<"all" | "unread" | "health" | "reminders">("all")
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [lastViewedAnnouncementTime, setLastViewedAnnouncementTime] = useState<string | null>(null)
  const [lastViewedFeedTime, setLastViewedFeedTime] = useState<string | null>(null)
  const [lastViewedWaterTime, setLastViewedWaterTime] = useState<string | null>(null)

  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  // Helper function to parse time strings like "7:00 AM" to hour/minute
  const parseTimeString = (timeStr: string): { hour: number; minute: number } | null => {
    try {
      const match = timeStr.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
      if (!match) return null;

      let hour = parseInt(match[1]);
      const minute = parseInt(match[2]);
      const period = match[3].toUpperCase();

      if (period === 'PM' && hour !== 12) {
        hour += 12;
      } else if (period === 'AM' && hour === 12) {
        hour = 0;
      }

      return { hour, minute };
    } catch (error) {
      console.error('[Notification] Error parsing time:', error);
      return null;
    }
  };

  // Function to schedule feed/water notifications
  const scheduleFeedWaterNotifications = async () => {
    if (!Notifications) {
      console.log('[Notification] Expo Notifications not available');
      return;
    }

    try {
      // Cancel all existing feed/water notifications
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notif of scheduled) {
        const data = notif.content.data as any;
        if (data.type === 'feed' || data.type === 'water') {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
      }

      // Fetch user's horses
      const encodedUser = encodeURIComponent(userName);
      const horsesResponse = await fetch(`http://192.168.1.8:8000/api/kutsero/horses/?kutsero_id=${encodedUser}`);
      
      if (!horsesResponse.ok) {
        console.error('[Notification] Failed to fetch horses');
        return;
      }

      const horsesData = await horsesResponse.json();
      const horses = horsesData.data || [];

      for (const horse of horses) {
        const horseId = horse.horse_id;
        const horseName = horse.horse_name;

        // Fetch feed schedule
        const feedResponse = await fetch(
          `http://192.168.1.8:8000/api/kutsero/feed/schedule/?kutsero_id=${encodedUser}&horse_id=${horseId}`
        );
        
        if (feedResponse.ok) {
          const feedData = await feedResponse.json();
          const feeds = feedData.data || [];

          for (const feed of feeds) {
            if (feed.fd_time) {
              const scheduledTime = parseTimeString(feed.fd_time);
              if (scheduledTime) {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: `🍽️ ${feed.fd_meal_type} Time!`,
                    body: `Time to feed ${horseName} - ${feed.fd_food_type} (${feed.fd_qty})`,
                    data: { 
                      type: 'feed', 
                      horseName,
                      horseId,
                      mealType: feed.fd_meal_type,
                      fdId: feed.fd_id
                    },
                    sound: 'default',
                  },
                  trigger: {
                    hour: scheduledTime.hour,
                    minute: scheduledTime.minute,
                    repeats: true,
                  },
                });
                console.log(`[Notification] Scheduled feed for ${horseName} at ${feed.fd_time}`);
              }
            }
          }
        }

        // Fetch water schedule
        const waterResponse = await fetch(
          `http://192.168.1.8:8000/api/kutsero/water/schedule/?kutsero_id=${encodedUser}&horse_id=${horseId}`
        );
        
        if (waterResponse.ok) {
          const waterData = await waterResponse.json();
          const waters = waterData.data || [];

          for (const water of waters) {
            if (water.water_time) {
              const scheduledTime = parseTimeString(water.water_time);
              if (scheduledTime) {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: `💧 ${water.water_period} Watering Time!`,
                    body: `Time to give ${horseName} water - ${water.water_amount}`,
                    data: { 
                      type: 'water', 
                      horseName,
                      horseId,
                      period: water.water_period,
                      waterId: water.water_id
                    },
                    sound: 'default',
                  },
                  trigger: {
                    hour: scheduledTime.hour,
                    minute: scheduledTime.minute,
                    repeats: true,
                  },
                });
                console.log(`[Notification] Scheduled water for ${horseName} at ${water.water_time}`);
              }
            }
          }
        }
      }

      console.log('[Notification] All feed/water notifications scheduled successfully');
    } catch (error) {
      console.error('[Notification] Error scheduling notifications:', error);
    }
  };

  // Helper function to map announcement type
  const mapAnnouncementType = (title: string, content: string): Notification["type"] => {
    const lowerTitle = title.toLowerCase()
    const lowerContent = content.toLowerCase()

    if (
      lowerTitle.includes("health") ||
      lowerContent.includes("health") ||
      lowerTitle.includes("medical") ||
      lowerContent.includes("medical") ||
      lowerTitle.includes("vet") ||
      lowerContent.includes("vet") ||
      lowerTitle.includes("animal") ||
      lowerContent.includes("animal")
    ) {
      return "health"
    }

    if (
      lowerTitle.includes("reminder") ||
      lowerContent.includes("reminder") ||
      lowerTitle.includes("alert") ||
      lowerContent.includes("alert")
    ) {
      return "reminder"
    }

    if (
      lowerTitle.includes("appointment") ||
      lowerContent.includes("appointment") ||
      lowerTitle.includes("schedule") ||
      lowerContent.includes("schedule")
    ) {
      return "appointment"
    }

    if (lowerTitle.includes("activity") || lowerContent.includes("activity")) {
      return "activity"
    }

    return "system"
  }

  // Helper function to map priority
  const mapPriority = (title: string, content: string): Notification["priority"] => {
    const lowerTitle = title.toLowerCase()
    const lowerContent = content.toLowerCase()

    if (
      lowerTitle.includes("urgent") ||
      lowerContent.includes("urgent") ||
      lowerTitle.includes("important") ||
      lowerContent.includes("important") ||
      lowerTitle.includes("critical") ||
      lowerContent.includes("critical") ||
      lowerTitle.includes("emergency") ||
      lowerContent.includes("emergency")
    ) {
      return "high"
    }

    if (
      lowerTitle.includes("low") ||
      lowerContent.includes("low") ||
      lowerTitle.includes("info") ||
      lowerContent.includes("info") ||
      lowerTitle.includes("information") ||
      lowerContent.includes("information") ||
      lowerTitle.includes("notice") ||
      lowerContent.includes("notice")
    ) {
      return "low"
    }

    if (
      lowerTitle.includes("moderate") ||
      lowerContent.includes("moderate") ||
      lowerTitle.includes("standard") ||
      lowerContent.includes("standard")
    ) {
      return "medium"
    }

    return "medium"
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

  // Fetch scheduled notifications from Expo
  const fetchScheduledNotifications = async () => {
    if (!Notifications) {
      return [];
    }

    try {
      const scheduledNotifs = await Notifications.getAllScheduledNotificationsAsync();
      const savedReadStatus = await loadReadStatus();
      
      const scheduledNotifications: Notification[] = scheduledNotifs.map((notif: any) => {
        const data = notif.content.data as any;
        const notifId = notif.identifier;
        const trigger = notif.trigger as any;
        
        return {
          id: notifId,
          title: notif.content.title || 'Reminder',
          message: notif.content.body || '',
          time: trigger.date ? new Date(trigger.date).toLocaleString() : 'Scheduled',
          type: 'reminder' as const,
          priority: 'medium' as const,
          read: Boolean(savedReadStatus[notifId] || false),
          scheduledTime: trigger.date ? new Date(trigger.date).toISOString() : undefined,
          horseName: data.horseName,
        };
      });

      console.log('[Notification] Fetched scheduled notifications:', scheduledNotifications.length);
      return scheduledNotifications;
    } catch (error) {
      console.error('[Notification] Error fetching scheduled notifications:', error);
      return [];
    }
  };

  // Fetch announcements from API
  const fetchAnnouncements = async () => {
    try {
      const encodedUser = encodeURIComponent(userName)
      const apiUrl = `http://192.168.1.8:8000/api/kutsero/announcements/?user=${encodedUser}`

      console.log("[v0] Fetching announcements from:", apiUrl)

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

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Response is not JSON")
      }

      const data = await response.json()
      console.log("[v0] Raw API response:", JSON.stringify(data, null, 2))

      const savedReadStatus = await loadReadStatus()

      let announcementsArray = data
      if (data && typeof data === "object" && !Array.isArray(data)) {
        announcementsArray = data.announcements || data.data || data.results || [data]
      }

      if (!Array.isArray(announcementsArray)) {
        console.warn("[v0] API response is not an array, converting to array")
        announcementsArray = [announcementsArray]
      }

      const transformedNotifications: Notification[] = announcementsArray.map((item: any, index: number) => {
        const announceId = item.announce_id || item.id || `announce-${Date.now()}-${index}`
        const announceTitle = item.announce_title || item.announce_titl || item.title || "CTU Announcement"
        const announceContent =
          item.announce_content || item.announce_cor || item.message || item.content || "New announcement"
        const announceDate =
          item.announce_date || item.announce_dat || item.timestamp || item.created_at || new Date().toISOString()

        const rawImageUrl = item.image_url || item.announce_image || item.announce_imt
        let imageUrls: string[] = []

        if (rawImageUrl && typeof rawImageUrl === "string") {
          const trimmedUrl = rawImageUrl.trim()

          if (trimmedUrl.startsWith("[")) {
            try {
              const imageArray = JSON.parse(trimmedUrl)
              if (Array.isArray(imageArray) && imageArray.length > 0) {
                imageUrls = imageArray
                  .filter((url) => typeof url === "string" && url.trim() !== "")
                  .map((url) => url.trim())
                  .filter((url) => isValidUrl(url))

                console.log("[v0] Parsed image URLs from array:", imageUrls)
              }
            } catch (parseError) {
              console.log("[v0] Failed to parse image URL as JSON array:", parseError)
            }
          } else if (trimmedUrl !== "" && isValidUrl(trimmedUrl)) {
            imageUrls = [trimmedUrl]
            console.log("[v0] Using single image URL:", imageUrls)
          }
        }

        const rawUserId = item.user_id || item.userId
        const userId = rawUserId && rawUserId.trim() !== "" ? rawUserId : undefined

        const date = new Date(announceDate)
        const displayTime =
          date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }) +
          " at " +
          date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })

        const notificationId = announceId.toString()

        return {
          id: notificationId,
          title: announceTitle,
          message: announceContent,
          time: displayTime,
          type: mapAnnouncementType(announceTitle, announceContent),
          priority: mapPriority(announceTitle, announceContent),
          read: Boolean(savedReadStatus[notificationId] || false),
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          userId: userId,
        }
      })

      return transformedNotifications;
    } catch (err: any) {
      console.error("[v0] Fetch Error Details:", {
        message: err.message,
        stack: err.stack,
      })
      return [];
    }
  }

  // Fetch all notifications
  const fetchNotifications = async () => {
    try {
      // Get announcements from API
      const announcements = await fetchAnnouncements();
      
      // Get scheduled feed/water notifications (they'll be shown as reminders)
      const scheduled = await fetchScheduledNotifications();
      
      // Combine all notifications
      const allNotifications = [...announcements, ...scheduled];
      
      // Sort by time (most recent first)
      allNotifications.sort((a: Notification, b: Notification) => {
        const timeA = a.scheduledTime ? new Date(a.scheduledTime).getTime() : new Date(a.time).getTime();
        const timeB = b.scheduledTime ? new Date(b.scheduledTime).getTime() : new Date(b.time).getTime();
        return timeB - timeA;
      });

      console.log("[v0] Total notifications:", allNotifications.length);
      setNotifications(allNotifications);
    } catch (error) {
      console.error("[v0] Error fetching notifications:", error);
      Alert.alert("Connection Error", "Could not fetch notifications. Please try again.", [
        { text: "OK" },
      ]);
    }
  };

  useEffect(() => {
    // Setup notifications
    setupNotifications();
    
    // Load last viewed times
    const loadLastViewed = async () => {
      const announceTime = await getLastViewedTime('announcement');
      const feedTime = await getLastViewedTime('feed');
      const waterTime = await getLastViewedTime('water');
      
      setLastViewedAnnouncementTime(announceTime);
      setLastViewedFeedTime(feedTime);
      setLastViewedWaterTime(waterTime);
    };
    
    loadLastViewed();
    fetchNotifications();
    
    // Schedule feed/water notifications
    scheduleFeedWaterNotifications();
    
    if (!Notifications) {
      return;
    }

    // Listen for notification when app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
      console.log('[Notification] Received in foreground:', notification);
      // Refresh notifications list
      fetchNotifications();
    });

    // Listen for notification responses (when user taps notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
      console.log('[Notification] User tapped notification:', response);
      const data = response.notification.request.content.data as any;
      
      // Mark as read and show details
      if (data.type === 'feed' || data.type === 'water') {
        fetchNotifications();
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [userName]);

  const markAsRead = async (notificationId: string) => {
    const savedReadStatus = await loadReadStatus()
    const updatedReadStatus = {
      ...savedReadStatus,
      [notificationId]: true,
    }

    await saveReadStatus(updatedReadStatus)

    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)))
  }

  const markAllAsRead = async () => {
    const savedReadStatus = await loadReadStatus()
    const updatedReadStatus = { ...savedReadStatus }

    notifications.forEach((notification) => {
      updatedReadStatus[notification.id] = true
    })

    await saveReadStatus(updatedReadStatus)

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    
    // Track viewed times for all types
    await trackNotificationViewed('announcement');
    await trackNotificationViewed('feed');
    await trackNotificationViewed('water');
    
    Alert.alert("Success", "All notifications marked as read")
  }

  const deleteNotification = async (notificationId: string) => {
    // If it's a scheduled notification, cancel it
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && notification.type === 'reminder') {
      if (Notifications) {
        try {
          await Notifications.cancelScheduledNotificationAsync(notificationId);
          console.log('[Notification] Cancelled scheduled notification:', notificationId);
        } catch (error) {
          console.error('[Notification] Error cancelling notification:', error);
        }
      }
    }
    
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    if (selectedNotification?.id === notificationId) {
      setModalVisible(false)
      setSelectedNotification(null)
    }
  }

  const handleNotificationPress = async (notification: Notification) => {
    console.log("[v0] Notification pressed:", notification.title)
    console.log("[v0] Image URLs:", notification.imageUrls)

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
    console.log("[v0] Modal should be visible now")
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

  const filteredNotifications = getFilteredNotifications()
  const unreadCount = notifications.filter((n) => !n.read).length
  const reminderCount = notifications.filter((n) => n.type === "reminder").length

  const getAbsoluteImageUrl = (imageUrl: string): string => {
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      console.log("[v0] Image URL is already absolute:", imageUrl)
      return imageUrl
    }

    const baseUrl = "http://192.168.1.8:8000"
    const absoluteUrl = imageUrl.startsWith("/") ? `${baseUrl}${imageUrl}` : `${baseUrl}/${imageUrl}`
    console.log("[v0] Converted relative URL to absolute:", imageUrl, "->", absoluteUrl)
    return absoluteUrl
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />

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
              await scheduleFeedWaterNotifications();
              await fetchNotifications();
              Alert.alert('Success', 'Notifications refreshed and schedules synced!');
            }}
          >
            <Text style={styles.refreshText}>Sync</Text>
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
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📢</Text>
            <Text style={styles.emptyStateTitle}>No notifications</Text>
            <Text style={styles.emptyStateMessage}>
              {filter === "all" ? "You're all caught up!" : `No ${filter} notifications found.`}
            </Text>
            <TouchableOpacity 
              style={styles.refreshButtonLarge} 
              onPress={async () => {
                await scheduleFeedWaterNotifications();
                await fetchNotifications();
              }}
            >
              <Text style={styles.refreshButtonText}>Sync Notifications</Text>
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
                        {notification.title}
                      </Text>
                      <Text style={styles.notificationMessage} numberOfLines={2}>
                        {notification.message}
                      </Text>
                      {notification.horseName && (
                        <Text style={styles.horseNameBadge}>
                          🐴 {notification.horseName}
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
          console.log("[v0] Modal close requested")
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
                      console.log("[v0] Close button pressed")
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
                                  console.log("[v0] Image failed to load")
                                  console.log("[v0] Error details:", JSON.stringify(error.nativeEvent))
                                  console.log("[v0] Attempted URL:", getAbsoluteImageUrl(imageUrl))
                                  setImageError(true)
                                  setImageLoading(false)
                                }}
                                onLoad={() => {
                                  console.log("[v0] Image loaded successfully:", getAbsoluteImageUrl(imageUrl))
                                  setImageLoading(false)
                                }}
                                onLoadStart={() => {
                                  console.log("[v0] Image load started:", getAbsoluteImageUrl(imageUrl))
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
                      console.log("[v0] Close button pressed in footer")
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
    fontWeight: "600",
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
    backgroundColor: "#C17A47",
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
    borderLeftColor: "#C17A47",
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
    color: "#C17A47",
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
    backgroundColor: "#C17A47",
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
    borderLeftColor: "#C17A47",
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
    borderLeftColor: "#C17A47",
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
    backgroundColor: "#C17A47",
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
    backgroundColor: "#C17A47",
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