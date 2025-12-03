// HORSE_OPERATOR/Hnotif.tsx

import { useEffect, useState, useRef, useCallback } from "react"
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
  RefreshControl,
} from "react-native"
import * as SecureStore from "expo-secure-store"
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const { width, height } = Dimensions.get("window")

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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

// Custom fetch with timeout
const fetchWithTimeout = async (url: string, options: RequestInit & { timeout?: number } = {}) => {
  const { timeout = 10000, ...fetchOptions } = options;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

interface Notification {
  id: string
  title: string
  message: string
  time: string
  type: "health" | "reminder" | "system" | "activity" | "appointment" | "feed"
  priority: "high" | "medium" | "low"
  read: boolean
  imageUrls?: string[]
  userId?: string | null
  scheduledTime?: string
  horseName?: string
  timestamp?: string
  isNew?: boolean
  feedData?: {
    fd_food_type: string
    fd_qty: string
    fd_time: string
    fd_meal_type: string
    completed_at?: string
    fed_by?: string
  }
}

interface NotificationsPageProps {
  onBack: () => void
}

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

// Get push token
async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    alert('Failed to get push token for push notification!');
    return;
  }
  
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'cf3222dd-533d-43ff-8a4f-43661b38e862',
    });
    token = tokenData.data;
  } catch (error) {
    console.error('Error getting push token:', error);
  }

  return token;
}

// Send local notification
async function sendLocalNotification(title: string, body: string, data?: any) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        data: data || {},
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 250, 250, 250],
        badge: 1,
      },
      trigger: null,
    });
    console.log('[Notification] Local notification sent with sound');
  } catch (error) {
    console.error('[Notification] Error sending notification:', error);
  }
}

export default function NotificationsPage({ onBack }: NotificationsPageProps) {
  const safeArea = getSafeAreaPadding()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<"all" | "unread" | "health" | "reminders" | "feed">("all")
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const isMountedRef = useRef(true);
  const lastFetchTimeRef = useRef<number>(0);
  const fetchInProgressRef = useRef(false);

  // Get user ID from SecureStore
  const getValidUserId = useCallback(async () => {
    try {
      const userId = await SecureStore.getItemAsync("user_id");
      if (!userId || userId === "undefined" || userId === "null") {
        console.warn("[Notification] Invalid user ID:", userId);
        return null;
      }
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(userId)) {
        console.log("[Notification] Using user ID from SecureStore:", userId);
        return userId;
      }
      
      console.warn("[Notification] Invalid UUID format:", userId);
      return null;
    } catch (error) {
      console.error("[Notification] Error getting user ID:", error);
      return null;
    }
  }, []);

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

  const saveReadStatus = async (readStatus: { [key: string]: boolean }) => {
    try {
      await SecureStore.setItemAsync("notification_read_status", JSON.stringify(readStatus))
    } catch (error) {
      console.error("Error saving read status:", error)
    }
  }

  const fetchTriggeredNotifications = useCallback(async () => {
    if (fetchInProgressRef.current) {
      console.log('[Notification] Fetch already in progress, skipping');
      return [];
    }

    fetchInProgressRef.current = true;
    
    try {
      const userId = await getValidUserId();
      if (!userId) {
        console.log('[Notification] No valid user ID for triggered notifications');
        return [];
      }

      console.log('[Notification] Fetching triggered notifications for user:', userId);
      
      const encodedUser = encodeURIComponent(userId);
      const response = await fetchWithTimeout(
        `http://192.168.1.9:8000/api/horse_operator/feed-water-notifications/?op_id=${encodedUser}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 second timeout
        }
      );
      
      if (!response.ok) {
        console.error('[Notification] Failed to fetch feed/water notifications, status:', response.status);
        return [];
      }
      
      const data = await response.json();
      console.log('[Notification] Fetched feed/water notifications:', data);
      
      if (!data.success || !data.data) {
        return [];
      }
      
      const savedReadStatus = await loadReadStatus();
      const allKeys = await AsyncStorage.getAllKeys();
      const triggeredKeys = allKeys.filter(key => key.startsWith('triggered_'));
      const triggeredIds = new Set(triggeredKeys.map(key => key.replace('triggered_', '')));
      
      console.log('[Notification] Triggered IDs from storage:', Array.from(triggeredIds));
      
      const triggeredNotifications: Notification[] = [];
      
      for (const notif of data.data) {
        if (triggeredIds.has(notif.id)) {
          const triggerData = await AsyncStorage.getItem(`triggered_${notif.id}`);
          let displayTime = notif.timestamp;
          let timestamp = notif.timestamp;
          let isNew = false;
          
          if (triggerData) {
            try {
              const parsed = JSON.parse(triggerData);
              displayTime = parsed.time || notif.timestamp;
              timestamp = parsed.timestamp || notif.timestamp;
              isNew = parsed.isNew || false;
            } catch (e) {
              console.error('[Notification] Error parsing trigger data:', e);
            }
          }
          
          triggeredNotifications.push({
            id: notif.id,
            title: notif.title,
            message: notif.message,
            time: displayTime,
            type: 'reminder' as const,
            priority: 'medium' as const,
            read: Boolean(savedReadStatus[notif.id] || false),
            horseName: notif.horse_name,
            scheduledTime: notif.scheduled_time,
            timestamp: timestamp,
            isNew: isNew,
          });
        }
      }
      
      console.log('[Notification] Processed triggered notifications:', triggeredNotifications.length);
      return triggeredNotifications;
    } catch (error) {
      console.error('[Notification] Error fetching triggered notifications:', error);
      return [];
    } finally {
      fetchInProgressRef.current = false;
    }
  }, [getValidUserId]);

  const fetchAnnouncements = useCallback(async () => {
    if (fetchInProgressRef.current) {
      console.log('[Notification] Fetch already in progress, skipping');
      return [];
    }

    fetchInProgressRef.current = true;

    try {
      const userId = await getValidUserId();
      if (!userId) {
        console.log('[Notification] No valid user ID for announcements');
        return [];
      }

      const encodedUser = encodeURIComponent(userId)
      const apiUrl = `http://192.168.1.9:8000/api/horse_operator/announcements/?user=${encodedUser}`

      console.log("[v0] Fetching announcements from:", apiUrl)

      const response = await fetchWithTimeout(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        timeout: 10000, // 10 second timeout
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
      const lastCheckedKey = 'last_announcement_check';
      const lastChecked = await AsyncStorage.getItem(lastCheckedKey);

      let announcementsArray = data.announcements || data.data || data.results || []
      if (data && typeof data === "object" && !Array.isArray(data)) {
        announcementsArray = data.announcements || data.data || data.results || [data]
      }

      if (!Array.isArray(announcementsArray)) {
        console.warn("[v0] API response is not an array, converting to array")
        announcementsArray = [announcementsArray]
      }

      let hasNewAnnouncements = false;

      const transformedNotifications: Notification[] = announcementsArray.map((item: any, index: number) => {
        const announceId = item.announce_id || item.id || `announce-${Date.now()}-${index}`
        const announceTitle = item.announce_title || item.announce_titl || item.title || "CTU Announcement"
        const announceContent =
          item.announce_content || item.announce_cor || item.message || item.content || "New announcement"
        const announceDate =
          item.announce_date || item.announce_dat || item.timestamp || item.created_at || new Date().toISOString()

        if (lastChecked && new Date(announceDate) > new Date(lastChecked)) {
          hasNewAnnouncements = true;
        }

        const rawImageUrl = item.image_url || item.announce_image || item.announce_imt
        let imageUrls: string[] = []

        console.log("[v0] Processing images for announcement:", announceId, {
          rawImageUrl: rawImageUrl,
          type: typeof rawImageUrl,
          isArray: Array.isArray(rawImageUrl)
        })

        if (rawImageUrl) {
          if (Array.isArray(rawImageUrl)) {
            imageUrls = rawImageUrl
              .filter((url) => url && typeof url === "string" && url.trim() !== "")
              .map((url) => url.trim())
              .filter((url) => isValidUrl(url))
            console.log("[v0] Using image URLs from array:", imageUrls)
          }
          else if (typeof rawImageUrl === "string") {
            const trimmedUrl = rawImageUrl.trim()

            if (trimmedUrl.startsWith("[")) {
              try {
                const imageArray = JSON.parse(trimmedUrl)
                if (Array.isArray(imageArray) && imageArray.length > 0) {
                  imageUrls = imageArray
                    .filter((url) => typeof url === "string" && url.trim() !== "")
                    .map((url) => url.trim())
                    .filter((url) => isValidUrl(url))

                  console.log("[v0] Parsed image URLs from JSON string:", imageUrls)
                }
              } catch (parseError) {
                console.log("[v0] Failed to parse image URL as JSON array:", parseError)
              }
            } 
            else if (trimmedUrl !== "" && isValidUrl(trimmedUrl)) {
              imageUrls = [trimmedUrl]
              console.log("[v0] Using single image URL:", imageUrls)
            }
          }
        }

        console.log("[v0] Final imageUrls for announcement:", announceId, imageUrls)

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
          timestamp: announceDate,
          isNew: false,
        }
      })

      if (hasNewAnnouncements && lastChecked) {
        const newAnnouncementsCount = transformedNotifications.filter(n => 
          new Date(n.timestamp!) > new Date(lastChecked)
        ).length;
        
        if (newAnnouncementsCount > 0) {
          await sendLocalNotification(
            '📢 New Announcements',
            `You have ${newAnnouncementsCount} new announcement${newAnnouncementsCount > 1 ? 's' : ''}`,
            { type: 'announcement', count: newAnnouncementsCount }
          );
        }
      }

      await AsyncStorage.setItem(lastCheckedKey, new Date().toISOString());

      return transformedNotifications;
    } catch (err: any) {
      console.error("[v0] Fetch Error Details:", {
        message: err.message,
        stack: err.stack,
      })
      return [];
    } finally {
      fetchInProgressRef.current = false;
    }
  }, [getValidUserId])

  // NEW: Fetch feed notifications
  const fetchFeedNotifications = useCallback(async () => {
    if (fetchInProgressRef.current) {
      console.log('[Notification] Fetch already in progress, skipping');
      return [];
    }

    fetchInProgressRef.current = true;

    try {
      const userId = await getValidUserId();
      if (!userId) {
        console.log('[Notification] No valid user ID for feed notifications');
        return [];
      }

      console.log('[Notification] Fetching feed notifications for user:', userId);
      
      // Fetch feed records from your feed endpoint
      const response = await fetchWithTimeout(
        `http://192.168.1.9:8000/api/horse_operator/get_recent_feed_records/?user_id=${encodeURIComponent(userId)}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      if (!response.ok) {
        console.error('[Notification] Failed to fetch feed notifications, status:', response.status);
        return [];
      }

      const data = await response.json();
      console.log('[Notification] Fetched feed records:', data);

      const savedReadStatus = await loadReadStatus();
      const feedNotifications: Notification[] = [];

      if (Array.isArray(data)) {
        for (const feedRecord of data) {
          const notificationId = `feed_${feedRecord.fd_id || feedRecord.id}`;
          
          // Format the time properly
          const feedTime = new Date(feedRecord.completed_at || feedRecord.fd_time || Date.now());
          const displayTime = feedTime.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }) + " at " + feedTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          // Create feed notification
          feedNotifications.push({
            id: notificationId,
            title: `${getTypeIcon('feed')} ${feedRecord.fd_meal_type || 'Meal'} - ${feedRecord.horse_name || feedRecord.horseName || 'Horse'}`,
            message: `Fed ${feedRecord.fd_qty || 'some'} of ${feedRecord.fd_food_type || 'food'}${feedRecord.completed ? ' (Completed)' : ''}`,
            time: displayTime,
            type: 'feed' as const,
            priority: 'medium' as const,
            read: Boolean(savedReadStatus[notificationId] || false),
            horseName: feedRecord.horse_name || feedRecord.horseName,
            timestamp: feedRecord.completed_at || feedRecord.fd_time,
            isNew: savedReadStatus[notificationId] === undefined,
            feedData: {
              fd_food_type: feedRecord.fd_food_type,
              fd_qty: feedRecord.fd_qty,
              fd_time: feedRecord.fd_time,
              fd_meal_type: feedRecord.fd_meal_type,
              completed_at: feedRecord.completed_at,
              fed_by: feedRecord.fed_by || feedRecord.user_name || 'Unknown',
            },
          });
        }
      }

      console.log('[Notification] Processed feed notifications:', feedNotifications.length);
      return feedNotifications;
    } catch (error) {
      console.error('[Notification] Error fetching feed notifications:', error);
      return [];
    } finally {
      fetchInProgressRef.current = false;
    }
  }, [getValidUserId]);

  const fetchNotifications = useCallback(async (forceRefresh = false) => {
    // Prevent too frequent fetches (minimum 10 seconds between manual refreshes)
    const now = Date.now();
    if (!forceRefresh && now - lastFetchTimeRef.current < 10000) {
      console.log('[Notification] Skipping fetch - too soon since last fetch');
      return;
    }

    if (fetchInProgressRef.current) {
      console.log('[Notification] Fetch already in progress, skipping');
      return;
    }

    try {
      console.log('[Notification] Starting to fetch all notifications...');
      setIsRefreshing(true);
      lastFetchTimeRef.current = now;
      
      const [announcements, triggered, feed] = await Promise.all([
        fetchAnnouncements(),
        fetchTriggeredNotifications(),
        fetchFeedNotifications()
      ]);
      
      console.log('[Notification] Fetched:', {
        announcements: announcements.length,
        triggered: triggered.length,
        feed: feed.length
      });
      
      const allNotifications = [...announcements, ...triggered, ...feed];
      
      // Sort by timestamp (newest first) and mark new ones
      allNotifications.sort((a: Notification, b: Notification) => {
        const timeA = new Date(a.timestamp || a.time).getTime();
        const timeB = new Date(b.timestamp || b.time).getTime();
        return timeB - timeA;
      });

      console.log("[v0] Total notifications:", allNotifications.length);
      
      if (isMountedRef.current) {
        setNotifications(allNotifications);
      }
    } catch (error) {
      console.error("[v0] Error fetching notifications:", error);
      if (isMountedRef.current) {
        Alert.alert("Connection Error", "Could not fetch notifications. Please try again.", [
          { text: "OK" },
        ]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [fetchAnnouncements, fetchTriggeredNotifications, fetchFeedNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const savedReadStatus = await loadReadStatus();
      const updatedReadStatus = {
        ...savedReadStatus,
        [notificationId]: true,
      };

      await saveReadStatus(updatedReadStatus);

      setNotifications((prev) => prev.map(n => {
        if (n.id === notificationId) {
          return { ...n, read: true, isNew: false };
        }
        return n;
      }));
      
      // Update trigger data if it's a triggered notification
      const triggerData = await AsyncStorage.getItem(`triggered_${notificationId}`);
      if (triggerData) {
        try {
          const parsed = JSON.parse(triggerData);
          parsed.isNew = false;
          await AsyncStorage.setItem(`triggered_${notificationId}`, JSON.stringify(parsed));
        } catch (e) {
          console.error('[Notification] Error updating trigger data:', e);
        }
      }
      
      // Update notification count
      const notification = notifications.find(n => n.id === notificationId);
      if (notification?.isNew) {
        // Update badge count
        const unreadCount = notifications.filter(n => !n.read && n.id !== notificationId).length;
        await Notifications.setBadgeCountAsync(unreadCount);
      }
    } catch (error) {
      console.error('[Notification] Error marking as read:', error);
    }
  }, [notifications]);

  const handleNotificationPress = useCallback(async (notification: Notification) => {
    console.log("[v0] Notification pressed:", notification.title);
    console.log("[v0] Notification type:", notification.type);
    console.log("[v0] Feed data:", notification.feedData);

    setImageError(false);
    setImageLoading(true);
    setCurrentImageIndex(0);

    if (!notification.read) {
      await markAsRead(notification.id);
    }

    setSelectedNotification({
      ...notification,
      read: true,
      isNew: false,
    });
    setModalVisible(true);
    console.log("[v0] Modal should be visible now");
  }, [markAsRead]);

  useEffect(() => {
    isMountedRef.current = true;
    
    console.log('[Notification] Setting up notification listeners...');
    
    // Register for push notifications
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        console.log('Push token:', token);
      }
    });

    // Listen for incoming notifications when app is foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      // Refresh notifications when new one comes in
      fetchNotifications(true);
    });

    // Listen for user tapping on notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('User tapped notification:', response);
      const data = response.notification.request.content.data;
      if (data.id) {
        const notif = notifications.find(n => n.id === data.id);
        if (notif) {
          handleNotificationPress(notif);
        }
      }
    });

    // Initial fetch when component mounts
    const initialFetchTimer = setTimeout(() => {
      if (isMountedRef.current) {
        fetchNotifications(true);
      }
    }, 1000);

    return () => {
      console.log('[Notification] Cleaning up notification listeners...');
      isMountedRef.current = false;
      
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
      clearTimeout(initialFetchTimer);
    };
  }, [fetchNotifications, handleNotificationPress, notifications]);

  const markAllAsRead = async () => {
    try {
      const savedReadStatus = await loadReadStatus();
      const updatedReadStatus = { ...savedReadStatus };

      notifications.forEach((notification) => {
        updatedReadStatus[notification.id] = true;
      });

      await saveReadStatus(updatedReadStatus);

      setNotifications((prev) => prev.map(n => ({ ...n, read: true, isNew: false })));
      
      // Update all triggered notifications
      const allKeys = await AsyncStorage.getAllKeys();
      const triggeredKeys = allKeys.filter(key => key.startsWith('triggered_'));
      
      for (const key of triggeredKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            parsed.isNew = false;
            await AsyncStorage.setItem(key, JSON.stringify(parsed));
          } catch (e) {
            console.error('[Notification] Error updating trigger data:', e);
          }
        }
      }
      
      // Track views
      await trackNotificationViewed('announcement');
      await trackNotificationViewed('feed');
      
      // Reset badge count
      await Notifications.setBadgeCountAsync(0);
      
      Alert.alert("Success", "All notifications marked as read");
    } catch (error) {
      console.error('[Notification] Error marking all as read:', error);
      Alert.alert("Error", "Failed to mark all notifications as read");
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && (notification.type === 'reminder' || notification.type === 'feed')) {
        // For feed notifications, you might want to handle deletion differently
        console.log('[Notification] Removing notification:', notificationId);
        
        if (notification.type === 'reminder') {
          await AsyncStorage.removeItem(`triggered_${notificationId}`);
        }
        // For feed notifications, we just remove from local state since they're from server
      }
      
      setNotifications((prev) => prev.filter(n => n.id !== notificationId));
      if (selectedNotification?.id === notificationId) {
        setModalVisible(false);
        setSelectedNotification(null);
      }
      
      const unreadCount = notifications.filter(n => !n.read && n.id !== notificationId).length;
      await Notifications.setBadgeCountAsync(unreadCount);
    } catch (error) {
      console.error('[Notification] Error deleting notification:', error);
      Alert.alert("Error", "Failed to delete notification");
    }
  };

  const getFilteredNotifications = () => {
    switch (filter) {
      case "unread":
        return notifications.filter(n => !n.read);
      case "health":
        return notifications.filter(n => n.type === "health");
      case "reminders":
        return notifications.filter(n => n.type === "reminder");
      case "feed":
        return notifications.filter(n => n.type === "feed");
      default:
        return notifications;
    }
  };

  const getPriorityColor = (priority: Notification["priority"]) => {
    switch (priority) {
      case "high":
        return "#FF4444";
      case "medium":
        return "#FF9800";
      case "low":
        return "#4CAF50";
      default:
        return "#666";
    }
  };

  const getTypeIcon = (type: Notification["type"]) => {
    switch (type) {
      case "health":
        return "🏥";
      case "reminder":
        return "⏰";
      case "system":
        return "⚙️";
      case "activity":
        return "✅";
      case "appointment":
        return "📅";
      case "feed":
        return "🍽️";
      default:
        return "📢";
    }
  };

  const getTypeLabel = (type: Notification["type"]) => {
    switch (type) {
      case "health":
        return "Health";
      case "reminder":
        return "Reminder";
      case "system":
        return "";
      case "activity":
        return "Activity";
      case "appointment":
        return "Appointment";
      case "feed":
        return "Feed Activity";
      default:
        return "Announcement";
    }
  };

  const filteredNotifications = getFilteredNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;
  const reminderCount = notifications.filter(n => n.type === "reminder").length;
  const newReminderCount = notifications.filter(n => n.type === "reminder" && n.isNew).length;
  const feedCount = notifications.filter(n => n.type === "feed").length;

  const getAbsoluteImageUrl = (imageUrl: string): string => {
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      console.log("[v0] Image URL is already absolute:", imageUrl);
      return imageUrl;
    }

    const baseUrl = "http://192.168.1.9:8000";
    const absoluteUrl = imageUrl.startsWith("/") ? `${baseUrl}${imageUrl}` : `${baseUrl}/${imageUrl}`;
    console.log("[v0] Converted relative URL to absolute:", imageUrl, "->", absoluteUrl);
    return absoluteUrl;
  };

  const handleRefresh = async () => {
    await fetchNotifications(true);
  };

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
    refreshButtonDisabled: {
      opacity: 0.5,
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
    reminderTabContent: {
      flexDirection: "row",
      alignItems: "center",
      position: "relative",
    },
    notificationBadge: {
      backgroundColor: "#FF4444",
      borderRadius: scale(10),
      minWidth: scale(18),
      height: scale(18),
      justifyContent: "center",
      alignItems: "center",
      marginLeft: scale(6),
      paddingHorizontal: scale(5),
    },
    notificationBadgeText: {
      color: "white",
      fontSize: moderateScale(10),
      fontWeight: "bold",
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
    iconContainer: {
      position: "relative",
      marginRight: scale(12),
      marginTop: scale(2),
    },
    notificationIcon: {
      fontSize: moderateScale(24),
    },
    newBadge: {
      position: "absolute",
      top: scale(-6),
      right: scale(-6),
      backgroundColor: "#FF4444",
      paddingHorizontal: scale(4),
      paddingVertical: scale(2),
      borderRadius: scale(8),
      borderWidth: 1,
      borderColor: "white",
    },
    newBadgeText: {
      color: "white",
      fontSize: moderateScale(8),
      fontWeight: "bold",
      letterSpacing: 0.5,
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
    scheduledTimeContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#E3F2FD",
      padding: scale(12),
      borderRadius: scale(8),
      marginBottom: verticalScale(16),
      borderLeftWidth: 4,
      borderLeftColor: "#2196F3",
    },
    scheduledTimeLabel: {
      fontSize: moderateScale(14),
      fontWeight: "600",
      color: "#1976D2",
      marginRight: scale(8),
    },
    scheduledTimeValue: {
      fontSize: moderateScale(18),
      fontWeight: "bold",
      color: "#0D47A1",
    },
    feedDetailsContainer: {
      backgroundColor: "#E8F5E9",
      padding: scale(16),
      borderRadius: scale(8),
      marginBottom: verticalScale(16),
      borderLeftWidth: 4,
      borderLeftColor: "#4CAF50",
    },
    feedDetailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: verticalScale(8),
    },
    feedDetailLabel: {
      fontSize: moderateScale(14),
      fontWeight: "600",
      color: "#2E7D32",
    },
    feedDetailValue: {
      fontSize: moderateScale(14),
      fontWeight: "500",
      color: "#1B5E20",
    },
    fedByContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#FFF3E0",
      padding: scale(12),
      borderRadius: scale(8),
      marginBottom: verticalScale(16),
    },
    fedByLabel: {
      fontSize: moderateScale(14),
      fontWeight: "600",
      color: "#8B5A2B",
      marginRight: scale(8),
    },
    fedByValue: {
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
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />

      <View style={[styles.header, { paddingTop: safeArea.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <View style={styles.backArrow} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={[styles.refreshButton, isRefreshing && styles.refreshButtonDisabled]} 
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            <Text style={styles.refreshText}>
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Mark All</Text>
          </TouchableOpacity>
        </View>
      </View>

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
            <View style={styles.reminderTabContent}>
              <Text style={[styles.filterTabText, filter === "reminders" && styles.filterTabTextActive]}>
                ⏰ Reminders ({reminderCount})
              </Text>
              {newReminderCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{newReminderCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === "feed" && styles.filterTabActive]}
            onPress={() => setFilter("feed")}
          >
            <Text style={[styles.filterTabText, filter === "feed" && styles.filterTabTextActive]}>
              🍽️ Feed ({feedCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.content}>
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateMessage}>
              {filter === "all" ? "You're all caught up!" : `No ${filter} notifications found.`}
            </Text>
            <TouchableOpacity 
              style={styles.refreshButtonLarge} 
              onPress={handleRefresh}
              disabled={isRefreshing}
            >
              <Text style={styles.refreshButtonText}>
                {isRefreshing ? "Refreshing..." : "Refresh Notifications"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.notificationsList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.notificationsScrollContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={["#C17A47"]}
                tintColor="#C17A47"
              />
            }
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
                    <View style={styles.iconContainer}>
                      <Text style={styles.notificationIcon}>{getTypeIcon(notification.type)}</Text>
                      {notification.isNew && (
                        <View style={styles.newBadge}>
                          <Text style={styles.newBadgeText}>NEW</Text>
                        </View>
                      )}
                    </View>
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

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          console.log("[v0] Modal close requested");
          setModalVisible(false);
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
                      console.log("[v0] Close button pressed");
                      setModalVisible(false);
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

                  {selectedNotification.scheduledTime && (
                    <View style={styles.scheduledTimeContainer}>
                      <Text style={styles.scheduledTimeLabel}>⏰ Scheduled Time</Text>
                      <Text style={styles.scheduledTimeValue}>{selectedNotification.scheduledTime}</Text>
                    </View>
                  )}

                  {selectedNotification.type === 'feed' && selectedNotification.feedData && (
                    <>
                      <View style={styles.feedDetailsContainer}>
                        <View style={styles.feedDetailRow}>
                          <Text style={styles.feedDetailLabel}>Meal Type:</Text>
                          <Text style={styles.feedDetailValue}>
                            {selectedNotification.feedData.fd_meal_type}
                          </Text>
                        </View>
                        <View style={styles.feedDetailRow}>
                          <Text style={styles.feedDetailLabel}>Food Type:</Text>
                          <Text style={styles.feedDetailValue}>
                            {selectedNotification.feedData.fd_food_type}
                          </Text>
                        </View>
                        <View style={styles.feedDetailRow}>
                          <Text style={styles.feedDetailLabel}>Quantity:</Text>
                          <Text style={styles.feedDetailValue}>
                            {selectedNotification.feedData.fd_qty}
                          </Text>
                        </View>
                        <View style={styles.feedDetailRow}>
                          <Text style={styles.feedDetailLabel}>Scheduled Time:</Text>
                          <Text style={styles.feedDetailValue}>
                            {selectedNotification.feedData.fd_time}
                          </Text>
                        </View>
                      </View>

                      {selectedNotification.feedData.fed_by && (
                        <View style={styles.fedByContainer}>
                          <Text style={styles.fedByLabel}>Fed By:</Text>
                          <Text style={styles.fedByValue}>{selectedNotification.feedData.fed_by}</Text>
                        </View>
                      )}
                    </>
                  )}

                  <View style={styles.detailMessageContainer}>
                    <Text style={styles.detailMessageLabel}>
                      {selectedNotification.type === 'reminder' 
                        ? 'Reminder Details:' 
                        : selectedNotification.type === 'feed'
                        ? 'Activity Summary:'
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
  );
}