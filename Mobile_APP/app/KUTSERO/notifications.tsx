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
  AppState,
} from "react-native"
import * as SecureStore from "expo-secure-store"
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

const { width, height } = Dimensions.get("window")

// Global notification state management
let globalNotificationListeners: ((notification: any) => void)[] = [];

export const addGlobalNotificationListener = (listener: (notification: any) => void) => {
  globalNotificationListeners.push(listener);
  console.log('[Global Notification] Added listener, total:', globalNotificationListeners.length);
  return () => {
    globalNotificationListeners = globalNotificationListeners.filter(l => l !== listener);
    console.log('[Global Notification] Removed listener, total:', globalNotificationListeners.length);
  };
};

export const triggerGlobalNotification = (notification: any) => {
  console.log('[Global Notification] Triggering to', globalNotificationListeners.length, 'listeners');
  globalNotificationListeners.forEach(listener => {
    try {
      listener(notification);
    } catch (error) {
      console.error('[Global Notification] Error in listener:', error);
    }
  });
};

// Configure notification behavior for foreground - FIXED VERSION
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('[Notification] Handling notification in foreground:', notification);
    
    return {
      shouldShowBanner: true,   // Replaces shouldShowAlert
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowList: true,
    };
  },
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
  timestamp?: string
  isNew?: boolean
}

interface NotificationsPageProps {
  onBack: () => void
  userName: string
}

// Send local notification - ENHANCED VERSION
export async function sendLocalNotification(title: string, body: string, data?: any) {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        data: data || {},
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 250, 250, 250],
        badge: 1,
        autoDismiss: false,
        // Add category for handling in background
        categoryIdentifier: 'REMINDER',
      },
      trigger: null, // Trigger immediately
    });
    
    console.log('[Notification] Local notification sent with ID:', notificationId);
    
    triggerGlobalNotification({
      title,
      body,
      data,
      id: notificationId,
      timestamp: new Date().toISOString()
    });
    
    return notificationId;
  } catch (error) {
    console.error('[Notification] Error sending notification:', error);
    return null;
  }
}

// Schedule feed/water notification for specific time
export async function scheduleFeedWaterNotification(
  notificationData: any,
  scheduledTime: string,
  notificationId: string
): Promise<string | null> {
  try {
    // Parse scheduled time (format: "HH:MM AM/PM" or "HH:MM")
    let [timePart, ampm] = scheduledTime.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    
    // Convert to 24-hour format if AM/PM is specified
    if (ampm) {
      if (ampm.toUpperCase() === 'PM' && hours < 12) {
        hours += 12;
      } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
      }
    }
    
    // Create date for today with the scheduled time
    const now = new Date();
    const scheduledDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes,
      0
    );
    
    // If the scheduled time is in the past, schedule for tomorrow
    if (scheduledDate <= now) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }
    
    // Also schedule a reminder 5 minutes before (like calendar)
    const reminderTime = new Date(scheduledDate.getTime() - 5 * 60 * 1000);
    
    console.log('[Notification] Scheduling for:', scheduledDate);
    console.log('[Notification] Reminder at:', reminderTime);
    
    // Schedule the main notification
    const mainNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: notificationData.title || "🐴 Reminder",
        body: notificationData.message || `${notificationData.horseName} needs attention`,
        data: {
          ...notificationData,
          id: notificationId,
          type: 'reminder',
          horseName: notificationData.horseName,
          scheduledTime: scheduledTime,
          channelId: 'high-priority'
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 250, 250, 250],
        badge: 1,
        categoryIdentifier: 'REMINDER',
      },
      trigger: {
        type: 'date',
        date: scheduledDate,
      } as Notifications.DateTriggerInput,
    });
    
    // Schedule a 5-minute reminder (optional)
    const reminderNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "⏰ Reminder in 5 minutes",
        body: `${notificationData.horseName}: ${notificationData.message}`,
        data: {
          ...notificationData,
          id: notificationId,
          type: 'reminder_reminder',
          horseName: notificationData.horseName,
          scheduledTime: scheduledTime,
          channelId: 'high-priority'
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 250, 250, 250],
        badge: 1,
        categoryIdentifier: 'REMINDER',
      },
      trigger: {
        type: 'date',
        date: reminderTime,
      } as Notifications.DateTriggerInput,
    });
    
    console.log('[Notification] Scheduled notifications with IDs:', mainNotificationId, reminderNotificationId);
    
    // Store the notification IDs for cancellation if needed
    await AsyncStorage.setItem(`scheduled_notif_${notificationId}`, JSON.stringify({
      mainId: mainNotificationId,
      reminderId: reminderNotificationId,
      scheduledTime: scheduledDate.toISOString()
    }));
    
    return mainNotificationId;
  } catch (error) {
    console.error('[Notification] Error scheduling notification:', error);
    return null;
  }
}

// Cancel scheduled notifications for a specific notification ID
export async function cancelScheduledNotification(notificationId: string) {
  try {
    // Get stored notification IDs
    const stored = await AsyncStorage.getItem(`scheduled_notif_${notificationId}`);
    if (stored) {
      const data = JSON.parse(stored);
      
      // Cancel main notification
      if (data.mainId) {
        await Notifications.cancelScheduledNotificationAsync(data.mainId);
      }
      
      // Cancel reminder notification
      if (data.reminderId) {
        await Notifications.cancelScheduledNotificationAsync(data.reminderId);
      }
      
      console.log('[Notification] Cancelled scheduled notifications for:', notificationId);
    }
    
    // Clean up storage
    await AsyncStorage.removeItem(`scheduled_notif_${notificationId}`);
  } catch (error) {
    console.error('[Notification] Error cancelling scheduled notifications:', error);
  }
}

// Schedule all future feed/water notifications on app start
const scheduleAllFutureFeedWaterNotifications = async () => {
  try {
    // Get all triggered notifications that are reminders
    const allKeys = await AsyncStorage.getAllKeys();
    const triggeredKeys = allKeys.filter(key => key.startsWith('triggered_'));
    
    for (const key of triggeredKeys) {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (parsed.scheduledTime && parsed.horseName) {
            // Reschedule this notification for future occurrences
            const notificationId = key.replace('triggered_', '');
            
            // Check if we already have scheduled notifications for this
            const scheduledKey = `scheduled_notif_${notificationId}`;
            const alreadyScheduled = await AsyncStorage.getItem(scheduledKey);
            
            if (!alreadyScheduled) {
              await scheduleFeedWaterNotification(
                {
                  title: parsed.title,
                  message: parsed.message,
                  horseName: parsed.horseName,
                },
                parsed.scheduledTime,
                notificationId
              );
            }
          }
        } catch (e) {
          console.error('[Notification] Error processing triggered notification:', e);
        }
      }
    }
  } catch (error) {
    console.error('[Notification] Error scheduling future notifications:', error);
  }
};

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

// Initialize notification system with proper channels
export async function initializeNotificationSystem(userName: string) {
  // Configure notification channels for Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    
    await Notifications.setNotificationChannelAsync('high-priority', {
      name: 'High Priority Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CAF50',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('[Notification] Notification permissions not granted');
      return false;
    }
    console.log('[Notification] Notification permissions granted');
  } else {
    console.log('[Notification] Notifications require a physical device');
  }
  
  return true;
}

// Check for scheduled notifications
export async function checkScheduledTimesGlobal(userName: string) {
  try {
    const encodedUser = encodeURIComponent(userName);
    
    const response = await fetch(
      `http://192.168.1.9:8000/api/kutsero/check-current-schedules/?kutsero_id=${encodedUser}`
    );
    
    if (!response.ok) {
      console.error('[Notification] Failed to check current schedules');
      return false;
    }
    
    const data = await response.json();
    console.log('[Notification] Global check schedules response:', data);
    
    if (!data.success || !data.data || data.data.length === 0) {
      console.log('[Notification] No schedules due at this time');
      return false;
    }
    
    const now = new Date();
    let newNotificationsAdded = false;
    
    for (const schedule of data.data) {
      const notifId = schedule.id;
      const triggeredKey = `triggered_${notifId}`;
      
      const alreadyTriggered = await AsyncStorage.getItem(triggeredKey);
      
      if (!alreadyTriggered) {
        const triggeredNotif = {
          id: notifId,
          title: schedule.title,
          message: schedule.message,
          time: now.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }) + " at " + now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          horseName: schedule.horse_name,
          scheduledTime: schedule.scheduled_time,
          timestamp: now.toISOString(),
          isNew: true,
        };
        
        await AsyncStorage.setItem(triggeredKey, JSON.stringify(triggeredNotif));
        console.log('[Notification] Triggered notification:', notifId);
        newNotificationsAdded = true;
        
        // Schedule notifications for this schedule for future occurrences
        await scheduleFeedWaterNotification(
          {
            title: schedule.title,
            message: schedule.message,
            horseName: schedule.horse_name,
          },
          schedule.scheduled_time,
          notifId
        );
        
        // Also send immediate notification
        await sendLocalNotification(
          `🐴 ${schedule.title}`,
          `${schedule.horse_name}: ${schedule.message}`,
          { 
            type: 'reminder', 
            id: notifId,
            horseName: schedule.horse_name,
            scheduledTime: schedule.scheduled_time,
            channelId: 'high-priority'
          }
        );
        
        const countKey = 'new_feed_water_count';
        const currentCount = await AsyncStorage.getItem(countKey);
        const newCount = currentCount ? parseInt(currentCount) + 1 : 1;
        await AsyncStorage.setItem(countKey, newCount.toString());
        
        // Update badge count
        const currentBadge = await Notifications.getBadgeCountAsync();
        await Notifications.setBadgeCountAsync((currentBadge || 0) + 1);
      }
    }
    
    return newNotificationsAdded;
  } catch (error) {
    console.error('[Notification] Error checking scheduled times:', error);
    return false;
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
  const [newFeedWaterCount, setNewFeedWaterCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const isInitialized = useRef(false);
  const isMounted = useRef(true);

  const checkScheduledTimes = async () => {
    try {
      return await checkScheduledTimesGlobal(userName);
    } catch (error) {
      console.error('[Notification] Error checking scheduled times:', error);
      return false;
    }
  };

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

  const fetchTriggeredNotifications = async () => {
    try {
      const encodedUser = encodeURIComponent(userName);
      const response = await fetch(
        `http://192.168.1.9:8000/api/kutsero/feed-water-notifications/?kutsero_id=${encodedUser}`
      );
      
      if (!response.ok) {
        console.error('[Notification] Failed to fetch feed/water notifications');
        return [];
      }
      
      const data = await response.json();
      
      if (!data.success || !data.data) {
        return [];
      }
      
      const savedReadStatus = await loadReadStatus();
      const triggeredNotifications: Notification[] = [];
      
      const allKeys = await AsyncStorage.getAllKeys();
      const triggeredKeys = allKeys.filter(key => key.startsWith('triggered_'));
      const triggeredIds = new Set(triggeredKeys.map(key => key.replace('triggered_', '')));
      
      let newCount = 0;
      
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
              
              if (isNew) {
                newCount++;
              }
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
      
      await AsyncStorage.setItem('new_feed_water_count', newCount.toString());
      setNewFeedWaterCount(newCount);
      
      return triggeredNotifications;
    } catch (error) {
      console.error('[Notification] Error fetching triggered notifications:', error);
      return [];
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const encodedUser = encodeURIComponent(userName)
      const apiUrl = `http://192.168.1.9:8000/api/kutsero/announcements/?user=${encodedUser}`

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

      const savedReadStatus = await loadReadStatus()
      const lastCheckedKey = 'last_announcement_check';
      const lastChecked = await AsyncStorage.getItem(lastCheckedKey);

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

        if (rawImageUrl) {
          if (Array.isArray(rawImageUrl)) {
            imageUrls = rawImageUrl
              .filter((url) => url && typeof url === "string" && url.trim() !== "")
              .map((url) => url.trim())
              .filter((url) => isValidUrl(url))
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
                }
              } catch (parseError) {
                console.log("[v0] Failed to parse image URL as JSON array:", parseError)
              }
            } 
            else if (trimmedUrl !== "" && isValidUrl(trimmedUrl)) {
              imageUrls = [trimmedUrl]
            }
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
          timestamp: announceDate,
          isNew: false,
        }
      })

      await AsyncStorage.setItem(lastCheckedKey, new Date().toISOString());

      return transformedNotifications;
    } catch (err: any) {
      console.error("[v0] Fetch Error:", err.message);
      return [];
    }
  }

  const fetchNotifications = async () => {
    if (!isMounted.current) return;
    
    setIsRefreshing(true);
    try {
      const announcements = await fetchAnnouncements();
      const triggered = await fetchTriggeredNotifications();
      
      const allNotifications = [...announcements, ...triggered];
      
      allNotifications.sort((a: Notification, b: Notification) => {
        if (a.isNew && !b.isNew) return -1;
        if (!a.isNew && b.isNew) return 1;
        
        const timeA = new Date(a.timestamp || a.time).getTime();
        const timeB = new Date(b.timestamp || b.time).getTime();
        return timeB - timeA;
      });

      if (isMounted.current) {
        setNotifications(allNotifications);
      }
    } catch (error) {
      console.error("[v0] Error fetching notifications:", error);
      if (isMounted.current) {
        Alert.alert("Connection Error", "Could not fetch notifications. Please try again.", [
          { text: "OK" },
        ]);
      }
    } finally {
      if (isMounted.current) {
        setIsRefreshing(false);
      }
    }
  };

  // Set up notification response handler globally
  const setupNotificationResponseHandler = () => {
    // Handle when user taps on notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[Notification] User tapped notification:', response);
      
      const data = response.notification.request.content.data;
      const notificationId = data.id;
      
      if (notificationId) {
        // Find the notification in our list
        const notification = notifications.find(n => n.id === notificationId);
        if (notification) {
          // Navigate to notification details
          handleNotificationPress(notification);
        } else {
          // If not found, show alert and refresh
          Alert.alert(
            'Notification',
            `You tapped on: ${data.title || 'Reminder'}`,
            [{ text: 'OK' }]
          );
          fetchNotifications();
        }
      }
    });
  };

  // Initialize notification system only once
  const initializeNotifications = async () => {
    if (isInitialized.current) return;
    
    isInitialized.current = true;
    const permissionsGranted = await initializeNotificationSystem(userName);
    
    if (!permissionsGranted) {
      Alert.alert(
        'Notifications Disabled',
        'Enable notifications to get reminders for feed/water schedules and announcements.',
        [
          { text: 'OK' },
          {
            text: 'Enable',
            onPress: async () => {
              // Open app settings on iOS
              if (Platform.OS === 'ios') {
                await Notifications.requestPermissionsAsync();
                initializeNotifications();
              }
            }
          }
        ]
      );
      return;
    }
    
    // Set up global notification handlers
    setupNotificationResponseHandler();
    
    // Set up listener for received notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[Notification] Received in foreground/background:', notification);
      
      // Update local state when notification is received
      fetchNotifications();
      
      // Trigger global state update
      triggerGlobalNotification(notification);
    });
    
    // Initial load
    fetchNotifications();
    
    // Schedule all future feed/water notifications
    await scheduleAllFutureFeedWaterNotifications();
    
    // Check every 5 minutes for immediate notifications
    checkIntervalRef.current = setInterval(() => {
      checkScheduledTimes();
    }, 300000) as unknown as NodeJS.Timeout; // 5 minutes
    
    // Also check every 30 minutes for rescheduling
    const rescheduleInterval = setInterval(() => {
      scheduleAllFutureFeedWaterNotifications();
    }, 1800000); // 30 minutes
    
    // Store for cleanup
    (checkIntervalRef as any).rescheduleInterval = rescheduleInterval;
    
    // Initial check
    checkScheduledTimes();
  };

  useEffect(() => {
    isMounted.current = true;
    
    // Listen for app state changes
    const appStateListener = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        // App came to foreground, refresh notifications
        fetchNotifications();
        
        // Check for missed notifications
        const missed = await checkScheduledTimes();
        if (missed) {
          Alert.alert(
            'New Notifications',
            'You have new feed/water schedule notifications.',
            [{ text: 'View', onPress: () => {} }, { text: 'Later' }]
          );
        }
      }
    });
    
    const loadInitialState = async () => {
      const countKey = 'new_feed_water_count';
      const count = await AsyncStorage.getItem(countKey);
      if (isMounted.current) {
        setNewFeedWaterCount(count ? parseInt(count) : 0);
      }
    };
    
    loadInitialState();
    initializeNotifications();

    return () => {
      isMounted.current = false;
      isInitialized.current = false;
      
      appStateListener.remove();
      
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      
      if ((checkIntervalRef as any).rescheduleInterval) {
        clearInterval((checkIntervalRef as any).rescheduleInterval);
      }
      
      if (notificationListener.current) {
        notificationListener.current.remove();
        notificationListener.current = null;
      }
      
      if (responseListener.current) {
        responseListener.current.remove();
        responseListener.current = null;
      }
    };
  }, []);

  const markAsRead = async (notificationId: string) => {
    const savedReadStatus = await loadReadStatus()
    const updatedReadStatus = {
      ...savedReadStatus,
      [notificationId]: true,
    }

    await saveReadStatus(updatedReadStatus)

    setNotifications((prev) => prev.map((n) => {
      if (n.id === notificationId) {
        return { ...n, read: true, isNew: false };
      }
      return n;
    }))
    
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
    
    const notification = notifications.find(n => n.id === notificationId);
    if (notification?.isNew) {
      const countKey = 'new_feed_water_count';
      const currentCount = await AsyncStorage.getItem(countKey);
      const newCount = Math.max(0, (currentCount ? parseInt(currentCount) : 0) - 1);
      await AsyncStorage.setItem(countKey, newCount.toString());
      if (isMounted.current) {
        setNewFeedWaterCount(newCount);
      }
    }
    
    // Update badge count
    const unreadCount = notifications.filter(n => !n.read && n.id !== notificationId).length;
    await Notifications.setBadgeCountAsync(unreadCount);
  }

  const markAllAsRead = async () => {
    const savedReadStatus = await loadReadStatus()
    const updatedReadStatus = { ...savedReadStatus }

    notifications.forEach((notification) => {
      updatedReadStatus[notification.id] = true
    })

    await saveReadStatus(updatedReadStatus)

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isNew: false })))
    
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
    
    await AsyncStorage.setItem('new_feed_water_count', '0');
    if (isMounted.current) {
      setNewFeedWaterCount(0);
    }
    
    await trackNotificationViewed('announcement');
    await trackNotificationViewed('feed');
    await trackNotificationViewed('water');
    
    await Notifications.setBadgeCountAsync(0);
    
    Alert.alert("Success", "All notifications marked as read")
  }

  const deleteNotification = async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && notification.type === 'reminder') {
      // Cancel any scheduled notifications
      await cancelScheduledNotification(notificationId);
      
      await AsyncStorage.removeItem(`triggered_${notificationId}`);
      
      if (notification.isNew) {
        const countKey = 'new_feed_water_count';
        const currentCount = await AsyncStorage.getItem(countKey);
        const newCount = Math.max(0, (currentCount ? parseInt(currentCount) : 0) - 1);
        await AsyncStorage.setItem(countKey, newCount.toString());
        if (isMounted.current) {
          setNewFeedWaterCount(newCount);
        }
      }
    }
    
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    if (selectedNotification?.id === notificationId) {
      setModalVisible(false)
      setSelectedNotification(null)
    }
    
    // Update badge count
    const unreadCount = notifications.filter(n => !n.read && n.id !== notificationId).length;
    await Notifications.setBadgeCountAsync(unreadCount);
  }

  const handleNotificationPress = async (notification: Notification) => {
    console.log("[v0] Notification pressed:", notification.title)

    setImageError(false)
    setImageLoading(true)
    setCurrentImageIndex(0)

    if (!notification.read) {
      await markAsRead(notification.id)
    }

    setSelectedNotification({
      ...notification,
      read: true,
      isNew: false,
    })
    setModalVisible(true)
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
  const newReminderCount = notifications.filter((n) => n.type === "reminder" && n.isNew).length

  const getAbsoluteImageUrl = (imageUrl: string): string => {
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl
    }

    const baseUrl = "http://192.168.1.9:8000"
    const absoluteUrl = imageUrl.startsWith("/") ? `${baseUrl}${imageUrl}` : `${baseUrl}/${imageUrl}`
    return absoluteUrl
  }

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
            onPress={fetchNotifications}
            disabled={isRefreshing}
          >
            <Text style={styles.refreshText}>
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
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
              onPress={fetchNotifications}
              disabled={isRefreshing}
            >
              <Text style={styles.refreshButtonText}>
                {isRefreshing ? 'Refreshing...' : 'Refresh Notifications'}
              </Text>
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

                  {selectedNotification.scheduledTime && (
                    <View style={styles.scheduledTimeContainer}>
                      <Text style={styles.scheduledTimeLabel}>⏰ Scheduled Time</Text>
                      <Text style={styles.scheduledTimeValue}>{selectedNotification.scheduledTime}</Text>
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
                                  setImageError(true)
                                  setImageLoading(false)
                                }}
                                onLoad={() => {
                                  console.log("[v0] Image loaded successfully")
                                  setImageLoading(false)
                                }}
                                onLoadStart={() => {
                                  console.log("[v0] Image load started")
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
  refreshButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.1)",
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