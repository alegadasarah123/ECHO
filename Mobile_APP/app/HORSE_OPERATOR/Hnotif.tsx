// HORSE_OPERATOR/Hnotif.tsx

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
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
  RefreshControl,
} from "react-native"
import { useRouter } from "expo-router"
import * as SecureStore from "expo-secure-store"
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const { width, height } = Dimensions.get("window")

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
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

// Custom fetch with error handling
const fetchWithTimeout = async (url: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Expected JSON but got ${contentType}`);
    }
    
    return response;
  } catch (error: any) {
    clearTimeout(id);
    console.error(`[Fetch] Error for ${url}:`, error.message);
    throw error;
  }
};

interface Notification {
  id: string
  title: string
  message: string
  time: string
  type: "health" | "reminder" | "system" | "activity" | "appointment" | "feed" | "water"
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
  waterData?: {
    quantity?: string
    time?: string
    completed_at?: string
    given_by?: string
    notes?: string
  }
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

export default function NotificationsPage() {
  const router = useRouter()
  const safeArea = getSafeAreaPadding()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<"all" | "unread" | "health" | "reminders" | "system">("all")
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [newReminderCount, setNewReminderCount] = useState(0)
  const [initialLoadDone, setInitialLoadDone] = useState(false)

  const isMountedRef = useRef(true);
  const fetchInProgressRef = useRef(false);

  // Get user ID from SecureStore
  const getValidUserId = useCallback(async () => {
    try {
      // First try to get from user_data
      const userDataString = await SecureStore.getItemAsync("user_data");
      console.log("[Notification] Raw user_data from SecureStore:", userDataString);
      
      if (userDataString) {
        try {
          const userData = JSON.parse(userDataString);
          const id = userData.user_id || userData.id;
          
          if (id && id !== "null" && id !== "undefined" && id !== "NULL") {
            const cleanId = id.replace(/['"]/g, '').trim();
            
            // Check if it's a valid UUID
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(cleanId)) {
              console.log("[Notification] Valid UUID found in user_data:", cleanId);
              return cleanId;
            }
            
            // If it's not a UUID but has some value, still try to use it
            if (cleanId.length > 0) {
              console.log("[Notification] Using non-UUID user ID from user_data:", cleanId);
              return cleanId;
            }
          }
        } catch (e) {
          console.error("[Notification] Error parsing user_data:", e);
        }
      }
      
      // Fall back to user_id
      const storedUserId = await SecureStore.getItemAsync("user_id");
      console.log("[Notification] Raw user_id from SecureStore:", storedUserId);
      
      if (!storedUserId || storedUserId === "undefined" || storedUserId === "null" || storedUserId === "NULL") {
        console.warn("[Notification] Invalid user ID in SecureStore:", storedUserId);
        
        // Try alternative storage location
        const altUserId = await AsyncStorage.getItem("user_id");
        console.log("[Notification] Trying AsyncStorage, found:", altUserId);
        
        if (altUserId && altUserId !== "null" && altUserId !== "undefined") {
          const cleanId = altUserId.replace(/['"]/g, '').trim();
          console.log("[Notification] Using user ID from AsyncStorage:", cleanId);
          return cleanId;
        }
        
        console.warn("[Notification] No valid user ID found in any storage");
        return null;
      }
      
      // Clean the ID - remove quotes and trim
      const cleanUserId = storedUserId.replace(/['"]/g, '').trim();
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(cleanUserId)) {
        console.log("[Notification] Valid UUID found:", cleanUserId);
        return cleanUserId;
      }
      
      // If it's not a UUID but has some value, still try to use it
      if (cleanUserId.length > 0) {
        console.log("[Notification] Using non-UUID user ID:", cleanUserId);
        return cleanUserId;
      }
      
      console.warn("[Notification] No valid user ID available");
      return null;
    } catch (error) {
      console.error("[Notification] Error getting user ID:", error);
      return null;
    }
  }, []);

  // Load read status
  const loadReadStatus = useCallback(async () => {
    try {
      const readStatusString = await SecureStore.getItemAsync("notification_read_status")
      if (readStatusString) {
        return JSON.parse(readStatusString)
      }
    } catch (error) {
      console.error("Error loading read status:", error)
    }
    return {}
  }, []);

  // Save read status
  const saveReadStatus = useCallback(async (readStatus: { [key: string]: boolean }) => {
    try {
      await SecureStore.setItemAsync("notification_read_status", JSON.stringify(readStatus))
    } catch (error) {
      console.error("Error saving read status:", error)
    }
  }, []);

  const mapAnnouncementType = useCallback((title: string, content: string): Notification["type"] => {
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

    if (lowerTitle.includes("water") || lowerContent.includes("water")) {
      return "water"
    }

    if (lowerTitle.includes("feed") || lowerContent.includes("feed") || lowerContent.includes("food")) {
      return "feed"
    }

    return "system"
  }, []);

  const mapPriority = useCallback((title: string, content: string): Notification["priority"] => {
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
  }, []);

  // Fetch triggered notifications (reminders/scheduled tasks)
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
      
      try {
        const response = await fetchWithTimeout(
          `https://echo-ebl8.onrender.com/api/horse_operator/check_current_schedules/?op_id=${encodedUser}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (!response.ok) {
          console.error('[Notification] Failed to fetch scheduled notifications, status:', response.status);
          return [];
        }
        
        const data = await response.json();
        console.log('[Notification] Fetched scheduled notifications:', data);
        
        if (!data.success || !data.data) {
          console.log('[Notification] No scheduled notifications returned from API');
          return [];
        }
        
        const savedReadStatus = await loadReadStatus();
        const nowDate = new Date();
        const displayTime = nowDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }) + " at " + nowDate.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        
        const triggeredNotifications: Notification[] = [];
        
        for (const schedule of data.data) {
          const notifId = schedule.id || `schedule-${Date.now()}-${Math.random()}`;
          const triggeredKey = `triggered_${notifId}`;
          const alreadyTriggered = await AsyncStorage.getItem(triggeredKey);
          
          if (alreadyTriggered) {
            try {
              const parsed = JSON.parse(alreadyTriggered);
              triggeredNotifications.push({
                id: notifId,
                title: schedule.title || 'Reminder',
                message: schedule.message || 'Time for scheduled task',
                time: parsed.time || displayTime,
                type: 'reminder' as const,
                priority: 'medium' as const,
                read: Boolean(savedReadStatus[notifId] || false),
                horseName: schedule.horse_name || schedule.horseName,
                scheduledTime: schedule.scheduled_time || schedule.time,
                timestamp: parsed.timestamp || nowDate.toISOString(),
                isNew: parsed.isNew || false,
              });
            } catch (e) {
              console.error('[Notification] Error parsing trigger data:', e);
            }
          }
        }
        
        console.log('[Notification] Processed triggered notifications:', triggeredNotifications.length);
        return triggeredNotifications;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        return [];
      }
    } catch (error) {
      console.error('[Notification] Error fetching triggered notifications:', error);
      return [];
    } finally {
      fetchInProgressRef.current = false;
    }
  }, [getValidUserId, loadReadStatus]);

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    if (fetchInProgressRef.current) {
      console.log('[Notification] Fetch already in progress, skipping');
      return [];
    }

    fetchInProgressRef.current = true;

    try {
      // Still call it for logging purposes but don't store the result
      await getValidUserId(); 
      
      // Use the correct endpoint from your backend: get_announcements
      const apiUrl = `https://echo-ebl8.onrender.com/api/horse_operator/get_announcements/`

      console.log("[v0] Fetching announcements from:", apiUrl)

      const response = await fetchWithTimeout(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Response is not JSON")
      }

      const data = await response.json()
      console.log("[v0] Raw API response:", JSON.stringify(data, null, 2))

      const savedReadStatus = await loadReadStatus()
      const lastCheckedKey = 'last_announcement_check';
      const lastChecked = await AsyncStorage.getItem(lastCheckedKey);

      // Parse announcements from API response
      let announcementsArray = [];
      
      if (Array.isArray(data)) {
        announcementsArray = data;
      } else if (data && typeof data === "object") {
        announcementsArray = data.announcements || data.data || data.results || [];
        if (!Array.isArray(announcementsArray) && data.announce_id) {
          // Single announcement object
          announcementsArray = [data];
        }
      }

      if (!Array.isArray(announcementsArray)) {
        console.warn("[v0] API response is not an array, converting to array")
        announcementsArray = [announcementsArray]
      }

      const transformedNotifications: Notification[] = announcementsArray.map((item: any, index: number) => {
        const announceId = item.announce_id || item.id || `announce-${Date.now()}-${index}`
        const announceTitle = item.announce_title || item.announce_titl || item.title || "Announcement"
        const announceContent =
          item.announce_content || item.announce_cor || item.message || item.content || "New announcement"
        const announceDate =
          item.announce_date || item.announce_dat || item.timestamp || item.created_at || new Date().toISOString()

        const rawImageUrl = item.image_url || item.announce_image || item.announce_imt || item.announce_img
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
          isNew: savedReadStatus[notificationId] === undefined && (!lastChecked || new Date(announceDate) > new Date(lastChecked)),
        }
      })

      await AsyncStorage.setItem(lastCheckedKey, new Date().toISOString());

      return transformedNotifications;
    } catch (error) {
      console.error("[v0] Fetch Error:", error);
      return [];
    } finally {
      fetchInProgressRef.current = false;
    }
  }, [getValidUserId, loadReadStatus, mapAnnouncementType, mapPriority]);

  // Fetch feed and water notifications
  const fetchActivityNotifications = useCallback(async () => {
    if (fetchInProgressRef.current) {
      console.log('[Notification] Fetch already in progress, skipping');
      return [];
    }

    fetchInProgressRef.current = true;

    try {
      const userId = await getValidUserId();
      if (!userId) {
        console.log('[Notification] No valid user ID for activity notifications');
        return [];
      }

      console.log('[Notification] Fetching activity notifications for user:', userId);
      
      const savedReadStatus = await loadReadStatus();
      const allActivityNotifications: Notification[] = [];

      // Fetch feed logs for completed feed records
      try {
        const feedLogsResponse = await fetchWithTimeout(
          `https://echo-ebl8.onrender.com/api/horse_operator/get_feed_logs/?user_id=${encodeURIComponent(userId)}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          }
        );

        if (feedLogsResponse.ok) {
          const feedLogsData = await feedLogsResponse.json();
          console.log('[Notification] Fetched feed logs:', feedLogsData);

          if (Array.isArray(feedLogsData)) {
            for (const feedLog of feedLogsData) {
              const notificationId = `feed_log_${feedLog.log_id || feedLog.id || `feed-${Date.now()}-${Math.random()}`}`;
              
              // Format the time properly
              const feedTime = new Date(feedLog.timestamp || feedLog.created_at || Date.now());
              const displayTime = feedTime.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              }) + " at " + feedTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              allActivityNotifications.push({
                id: notificationId,
                title: `🍽️ ${feedLog.meal || feedLog.fd_meal_type || 'Meal'} - ${feedLog.horse || feedLog.horse_name || 'Horse'}`,
                message: `${feedLog.user_full_name || 'Someone'} fed ${feedLog.horse || feedLog.horse_name || 'horse'}: ${feedLog.food || feedLog.fd_food_type || 'food'} (${feedLog.amount || feedLog.fd_qty || 'some'})`,
                time: displayTime,
                type: 'feed' as const,
                priority: 'medium' as const,
                read: Boolean(savedReadStatus[notificationId] || false),
                horseName: feedLog.horse || feedLog.horse_name,
                timestamp: feedLog.timestamp || feedLog.created_at,
                isNew: savedReadStatus[notificationId] === undefined,
                feedData: {
                  fd_food_type: feedLog.food || feedLog.fd_food_type || 'Food',
                  fd_qty: feedLog.amount || feedLog.fd_qty || 'Unknown',
                  fd_time: feedLog.time || feedLog.fd_time || 'Unknown',
                  fd_meal_type: feedLog.meal || feedLog.fd_meal_type || 'Meal',
                  completed_at: feedLog.timestamp || feedLog.created_at,
                  fed_by: feedLog.user_full_name || 'Unknown',
                },
              });
            }
          }
        }
      } catch (feedLogsError) {
        console.error('[Notification] Error fetching feed logs:', feedLogsError);
      }

      // Fetch water logs
      try {
        const waterLogsResponse = await fetchWithTimeout(
          `https://echo-ebl8.onrender.com/api/horse_operator/get_water_logs/?user_id=${encodeURIComponent(userId)}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          }
        );

        if (waterLogsResponse.ok) {
          const waterLogsData = await waterLogsResponse.json();
          console.log('[Notification] Fetched water logs:', waterLogsData);

          if (Array.isArray(waterLogsData)) {
            for (const waterLog of waterLogsData) {
              const notificationId = `water_log_${waterLog.id || `water-${Date.now()}-${Math.random()}`}`;
              
              const waterTime = new Date(waterLog.timestamp || waterLog.created_at || Date.now());
              const displayTime = waterTime.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              }) + " at " + waterTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              allActivityNotifications.push({
                id: notificationId,
                title: `💧 Water - ${waterLog.horse || waterLog.horse_name || 'Horse'}`,
                message: `${waterLog.notes || `Someone gave water to ${waterLog.horse || waterLog.horse_name || 'horse'} (${waterLog.period || 'Period'})`}`,
                time: displayTime,
                type: 'water' as const,
                priority: 'medium' as const,
                read: Boolean(savedReadStatus[notificationId] || false),
                horseName: waterLog.horse || waterLog.horse_name,
                timestamp: waterLog.timestamp || waterLog.created_at,
                isNew: savedReadStatus[notificationId] === undefined,
                waterData: {
                  quantity: waterLog.amount || 'Unknown',
                  time: waterLog.time || displayTime,
                  completed_at: waterLog.timestamp || waterLog.created_at,
                  given_by: waterLog.user_full_name || 'Someone',
                  notes: waterLog.notes || `Water given (${waterLog.period || 'Period'})`,
                },
              });
            }
          }
        }
      } catch (waterLogsError) {
        console.error('[Notification] Error fetching water logs:', waterLogsError);
      }

      // Fetch feeding schedules for reminders
      try {
        const feedingScheduleResponse = await fetchWithTimeout(
          `https://echo-ebl8.onrender.com/api/horse_operator/get_feeding_schedule/?user_id=${encodeURIComponent(userId)}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          }
        );

        if (feedingScheduleResponse.ok) {
          const feedingScheduleData = await feedingScheduleResponse.json();
          console.log('[Notification] Fetched feeding schedule:', feedingScheduleData);

          if (Array.isArray(feedingScheduleData)) {
            for (const schedule of feedingScheduleData) {
              // Only include upcoming/current schedules (not completed)
              if (!schedule.completed) {
                const notificationId = `feed_schedule_${schedule.fd_id || `schedule-${Date.now()}-${Math.random()}`}`;
                
                const scheduleTime = new Date();
                const displayTime = scheduleTime.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                }) + " at " + scheduleTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                allActivityNotifications.push({
                  id: notificationId,
                  title: `⏰ ${schedule.fd_meal_type || 'Meal'} - ${schedule.horse_name || 'Horse'}`,
                  message: `Start the day with a nutritious meal! ${schedule.fd_food_type || 'Food'} (${schedule.fd_qty || 'some'}) - Perfect time for a energy-boosting meal!`,
                  time: displayTime,
                  type: 'reminder' as const,
                  priority: 'medium' as const,
                  read: Boolean(savedReadStatus[notificationId] || false),
                  horseName: schedule.horse_name,
                  scheduledTime: schedule.fd_time,
                  timestamp: scheduleTime.toISOString(),
                  isNew: savedReadStatus[notificationId] === undefined,
                  feedData: {
                    fd_food_type: schedule.fd_food_type || 'Food',
                    fd_qty: schedule.fd_qty || 'Unknown',
                    fd_time: schedule.fd_time || 'Unknown',
                    fd_meal_type: schedule.fd_meal_type || 'Meal',
                  },
                });
              }
            }
          }
        }
      } catch (feedingScheduleError) {
        console.error('[Notification] Error fetching feeding schedule:', feedingScheduleError);
      }

      console.log('[Notification] Processed activity notifications:', allActivityNotifications.length);
      return allActivityNotifications;
    } catch (error) {
      console.error('[Notification] Error fetching activity notifications:', error);
      return [];
    } finally {
      fetchInProgressRef.current = false;
    }
  }, [getValidUserId, loadReadStatus]);

  // Main fetch function
  const fetchNotifications = useCallback(async (forceRefresh = false) => {
    if (fetchInProgressRef.current) {
      console.log('[Notification] Fetch already in progress, skipping');
      return;
    }

    try {
      console.log('[Notification] Starting to fetch all notifications...');
      setIsRefreshing(true);
      
      // Fetch all types of notifications in sequence
      const announcements = await fetchAnnouncements();
      const triggered = await fetchTriggeredNotifications();
      const activities = await fetchActivityNotifications();
      
      console.log('[Notification] Fetched:', {
        announcements: announcements.length,
        triggered: triggered.length,
        activities: activities.length
      });
      
      // Combine all notifications
      let allNotifications = [...announcements, ...triggered, ...activities];
      
      if (allNotifications.length === 0 && !initialLoadDone) {
        console.log('[Notification] No notifications from API, showing empty state');
        setNotifications([]);
        setInitialLoadDone(true);
        return;
      }
      
      // Sort by timestamp (newest first)
      allNotifications.sort((a: Notification, b: Notification) => {
        const timeA = new Date(a.timestamp || a.time).getTime();
        const timeB = new Date(b.timestamp || b.time).getTime();
        return timeB - timeA;
      });

      console.log("[v0] Total notifications:", allNotifications.length);
      
      // Calculate new reminder count (feed, water, health, appointments)
      const newReminders = allNotifications.filter(n => 
        (n.type === 'feed' || n.type === 'water' || n.type === 'health' || n.type === 'appointment' || n.type === 'reminder') && 
        !n.read
      ).length;
      setNewReminderCount(newReminders);
      
      if (isMountedRef.current) {
        setNotifications(allNotifications);
        if (!initialLoadDone) {
          setInitialLoadDone(true);
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching notifications:", error);
      if (isMountedRef.current && notifications.length === 0 && !initialLoadDone) {
        // Show empty state if fetch fails
        setNotifications([]);
        setInitialLoadDone(true);
      }
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [fetchAnnouncements, fetchTriggeredNotifications, fetchActivityNotifications, initialLoadDone, notifications.length]);

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
      
      // Update new reminder count if notification is new and is a reminder type
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.read && 
          (notification.type === 'reminder' || notification.type === 'feed' || 
           notification.type === 'water' || notification.type === 'health' || 
           notification.type === 'appointment')) {
        const newCount = Math.max(0, newReminderCount - 1);
        setNewReminderCount(newCount);
      }
    } catch (error) {
      console.error('[Notification] Error marking as read:', error);
    }
  }, [notifications, newReminderCount, loadReadStatus, saveReadStatus]);

  const handleNotificationPress = useCallback(async (notification: Notification) => {
    console.log("[v0] Notification pressed:", notification.title);
    console.log("[v0] Notification type:", notification.type);
    console.log("[v0] Feed data:", notification.feedData);
    console.log("[v0] Water data:", notification.waterData);

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
    const loadInitialData = async () => {
      isMountedRef.current = true;
      
      console.log('[Notification] Setting up notification listeners...');

      // Initial fetch when component mounts (only once)
      if (!initialLoadDone) {
        await fetchNotifications();
      }
    };

    loadInitialData();

    return () => {
      console.log('[Notification] Cleaning up...');
      isMountedRef.current = false;
    };
  }, [fetchNotifications, initialLoadDone]);

  const markAllAsRead = useCallback(async () => {
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
      
      // Reset new reminder count
      setNewReminderCount(0);
      
      // Track views
      await trackNotificationViewed('announcement');
      await trackNotificationViewed('feed');
      
      Alert.alert("Success", "All notifications marked as read");
    } catch (error) {
      console.error('[Notification] Error marking all as read:', error);
      Alert.alert("Error", "Failed to mark all notifications as read");
    }
  }, [notifications, loadReadStatus, saveReadStatus]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && 
          (notification.type === 'reminder' || notification.type === 'feed' || 
           notification.type === 'water' || notification.type === 'health' || 
           notification.type === 'appointment')) {
        console.log('[Notification] Removing notification:', notificationId);
        
        if (notification.type === 'reminder') {
          await AsyncStorage.removeItem(`triggered_${notificationId}`);
          
          // Update new reminder count if notification is new
          if (!notification.read) {
            const newCount = Math.max(0, newReminderCount - 1);
            setNewReminderCount(newCount);
          }
        }
      }
      
      setNotifications((prev) => prev.filter(n => n.id !== notificationId));
      if (selectedNotification?.id === notificationId) {
        setModalVisible(false);
        setSelectedNotification(null);
      }
    } catch (error) {
      console.error('[Notification] Error deleting notification:', error);
      Alert.alert("Error", "Failed to delete notification");
    }
  }, [notifications, newReminderCount, selectedNotification]);

  const getFilteredNotifications = useCallback(() => {
    switch (filter) {
      case "unread":
        return notifications.filter(n => !n.read);
      case "health":
        return notifications.filter(n => n.type === "health");
      case "reminders":
        // Include all reminder types: feed, water, health, appointment, and reminder
        return notifications.filter(n => 
          n.type === "reminder" || 
          n.type === "feed" || 
          n.type === "water" || 
          n.type === "appointment"
        );
      case "system":
        return notifications.filter(n => n.type === "system" || n.type === "activity");
      default:
        return notifications;
    }
  }, [filter, notifications]);

  const getPriorityColor = useCallback((priority: Notification["priority"]) => {
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
  }, []);

  const getTypeIcon = useCallback((type: Notification["type"]) => {
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
      case "water":
        return "💧";
      default:
        return "📢";
    }
  }, []);

  const getTypeLabel = useCallback((type: Notification["type"]) => {
    switch (type) {
      case "health":
        return "Health";
      case "reminder":
        return "Reminder";
      case "system":
        return "System";
      case "activity":
        return "Activity";
      case "appointment":
        return "Appointment";
      case "feed":
        return "Feed";
      case "water":
        return "Water";
      default:
        return "Announcement";
    }
  }, []);

  const getAbsoluteImageUrl = useCallback((imageUrl: string): string => {
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      console.log("[v0] Image URL is already absolute:", imageUrl);
      return imageUrl;
    }

    const baseUrl = "https://echo-ebl8.onrender.com";
    const absoluteUrl = imageUrl.startsWith("/") ? `${baseUrl}${imageUrl}` : `${baseUrl}/${imageUrl}`;
    console.log("[v0] Converted relative URL to absolute:", imageUrl, "->", absoluteUrl);
    return absoluteUrl;
  }, []);

  const handleRefresh = useCallback(async () => {
    await fetchNotifications(true);
  }, [fetchNotifications]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // FIXED: Removed the redundant memo - using getFilteredNotifications directly
  const filteredNotifications = getFilteredNotifications();
  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
  const reminderCount = useMemo(() => notifications.filter(n => 
    n.type === "reminder" || n.type === "feed" || n.type === "water" || n.type === "appointment"
  ).length, [notifications]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#F8F9FA",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#C17A47",
      paddingHorizontal: scale(16),
      paddingVertical: verticalScale(12),
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      borderBottomWidth: 1,
      borderBottomColor: "#E0E0E0",
    },
    backButton: {
      width: scale(40),
      height: scale(40),
      justifyContent: "center",
      alignItems: "center",
      borderRadius: scale(20),

    },
    backArrow: {
      width: scale(12),
      height: scale(12),
      borderLeftWidth: 2,
      borderBottomWidth: 2,
      borderColor: "#ffffffff",
      transform: [{ rotate: "45deg" }],
    },
    headerTitle: {
      flex: 1,
      fontSize: moderateScale(20),
      fontWeight: "bold",
      color: "#ffffffff",
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
      backgroundColor: "#696969ff",
      borderRadius: scale(6),
      marginLeft: scale(8),
    },
    markAllText: {
      color: "#ffffffff",
      fontSize: moderateScale(12),
      fontWeight: "600",
    },
    refreshButton: {
      paddingHorizontal: scale(12),
      paddingVertical: verticalScale(6),
      backgroundColor: "#696969ff",
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
      paddingVertical: verticalScale(10),
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
      backgroundColor: "#F5F5F5",
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
    // PUSH NOTIFICATION STYLE - COMPACT CARD DESIGN
    notificationCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: scale(12),
      marginBottom: verticalScale(10),
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: "#F0F0F0",
    },
    notificationCardUnread: {
      backgroundColor: "#FFF8F0",
      borderLeftWidth: 4,
      borderLeftColor: "#C17A47",
    },
    notificationCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: scale(12),
      borderBottomWidth: 1,
      borderBottomColor: "#F5F5F5",
    },
    notificationAppIcon: {
      width: scale(40),
      height: scale(40),
      borderRadius: scale(8),
      backgroundColor: "#C17A47",
      justifyContent: "center",
      alignItems: "center",
      marginRight: scale(12),
    },
    notificationAppIconText: {
      fontSize: moderateScale(20),
      color: "white",
    },
    notificationHeaderText: {
      flex: 1,
    },
    notificationAppName: {
      fontSize: moderateScale(14),
      fontWeight: "bold",
      color: "#333",
      marginBottom: scale(2),
    },
    notificationTime: {
      fontSize: moderateScale(11),
      color: "#999",
    },
    notificationBody: {
      padding: scale(12),
    },
    notificationTitle: {
      fontSize: moderateScale(16),
      fontWeight: "bold",
      color: "#333",
      marginBottom: verticalScale(6),
    },
    notificationMessage: {
      fontSize: moderateScale(14),
      color: "#666",
      lineHeight: moderateScale(20),
      marginBottom: verticalScale(8),
    },
    notificationMeta: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: verticalScale(6),
    },
    notificationTypeBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#F0F0F0",
      paddingHorizontal: scale(8),
      paddingVertical: verticalScale(4),
      borderRadius: scale(12),
    },
    notificationTypeIcon: {
      fontSize: moderateScale(14),
      marginRight: scale(4),
    },
    notificationTypeText: {
      fontSize: moderateScale(12),
      color: "#666",
      fontWeight: "500",
    },
    horseNameBadge: {
      backgroundColor: "#E3F2FD",
      paddingHorizontal: scale(8),
      paddingVertical: verticalScale(4),
      borderRadius: scale(12),
    },
    horseNameText: {
      fontSize: moderateScale(12),
      color: "#1976D2",
      fontWeight: "600",
    },
    readIndicator: {
      width: scale(8),
      height: scale(8),
      borderRadius: scale(4),
      backgroundColor: "#C17A47",
      position: "absolute",
      top: scale(12),
      right: scale(12),
    },
    emptyState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: scale(40),
      paddingVertical: verticalScale(40),
    },
    emptyStateIcon: {
      fontSize: moderateScale(64),
      color: "#DDD",
      marginBottom: verticalScale(16),
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
      fontSize: moderateScale(16),
      fontWeight: "bold",
      color: "#0D47A1",
    },
    waterDetailsContainer: {
      backgroundColor: "#E0F7FA",
      padding: scale(16),
      borderRadius: scale(8),
      marginBottom: verticalScale(16),
      borderLeftWidth: 4,
      borderLeftColor: "#00BCD4",
    },
    waterDetailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: verticalScale(8),
    },
    waterDetailLabel: {
      fontSize: moderateScale(14),
      fontWeight: "600",
      color: "#00838F",
    },
    waterDetailValue: {
      fontSize: moderateScale(14),
      fontWeight: "500",
      color: "#006064",
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
    givenByContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#FFF3E0",
      padding: scale(12),
      borderRadius: scale(8),
      marginBottom: verticalScale(16),
    },
    givenByLabel: {
      fontSize: moderateScale(14),
      fontWeight: "600",
      color: "#8B5A2B",
      marginRight: scale(8),
    },
    givenByValue: {
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />

      <View style={[styles.header, { paddingTop: safeArea.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
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
            style={[styles.filterTab, filter === "system" && styles.filterTabActive]}
            onPress={() => setFilter("system")}
          >
            <Text style={[styles.filterTabText, filter === "system" && styles.filterTabTextActive]}>
              System
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.content}>
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📭</Text>
            <Text style={styles.emptyStateMessage}>
              {filter === "all" ? "You're all caught up! No notifications yet." : `No ${filter} notifications found.`}
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
                style={[styles.notificationCard, !notification.read && styles.notificationCardUnread]}
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
                <View style={styles.notificationCardHeader}>
                  <View style={styles.notificationAppIcon}>
                    <Text style={styles.notificationAppIconText}>
                      {getTypeIcon(notification.type)}
                    </Text>
                  </View>
                  <View style={styles.notificationHeaderText}>
                    <Text style={styles.notificationAppName}>
                      {notification.type === 'feed' ? 'Feed Notification' :
                       notification.type === 'water' ? 'Water Notification' :
                       notification.type === 'reminder' ? 'Reminder' :
                       notification.type === 'health' ? 'Announcement' :
                       'Smart Stable'}
                    </Text>
                    <Text style={styles.notificationTime}>{notification.time}</Text>
                  </View>
                  {!notification.read && <View style={styles.readIndicator} />}
                </View>
                
                <View style={styles.notificationBody}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  <Text style={styles.notificationMessage}>{notification.message}</Text>
                  
                  <View style={styles.notificationMeta}>
                    <View style={styles.notificationTypeBadge}>
                      <Text style={styles.notificationTypeIcon}>{getTypeIcon(notification.type)}</Text>
                      <Text style={styles.notificationTypeText}>{getTypeLabel(notification.type)}</Text>
                    </View>
                    
                    {notification.horseName && (
                      <View style={styles.horseNameBadge}>
                        <Text style={styles.horseNameText}>🐴 {notification.horseName}</Text>
                      </View>
                    )}
                  </View>
                </View>
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

                  {selectedNotification.type === 'water' && selectedNotification.waterData && (
                    <>
                      <View style={styles.waterDetailsContainer}>
                        {selectedNotification.waterData.quantity && (
                          <View style={styles.waterDetailRow}>
                            <Text style={styles.waterDetailLabel}>Quantity:</Text>
                            <Text style={styles.waterDetailValue}>
                              {selectedNotification.waterData.quantity}
                            </Text>
                          </View>
                        )}
                        {selectedNotification.waterData.time && (
                          <View style={styles.waterDetailRow}>
                            <Text style={styles.waterDetailLabel}>Time:</Text>
                            <Text style={styles.waterDetailValue}>
                              {selectedNotification.waterData.time}
                            </Text>
                          </View>
                        )}
                        {selectedNotification.waterData.notes && (
                          <View style={styles.waterDetailRow}>
                            <Text style={styles.waterDetailLabel}>Notes:</Text>
                            <Text style={styles.waterDetailValue}>
                              {selectedNotification.waterData.notes}
                            </Text>
                          </View>
                        )}
                      </View>

                      {selectedNotification.waterData.given_by && (
                        <View style={styles.givenByContainer}>
                          <Text style={styles.givenByLabel}>Given By:</Text>
                          <Text style={styles.givenByValue}>{selectedNotification.waterData.given_by}</Text>
                        </View>
                      )}
                    </>
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
                        <View style={styles.givenByContainer}>
                          <Text style={styles.givenByLabel}>Fed By:</Text>
                          <Text style={styles.givenByValue}>{selectedNotification.feedData.fed_by}</Text>
                        </View>
                      )}
                    </>
                  )}

                  <View style={styles.detailMessageContainer}>
                    <Text style={styles.detailMessageLabel}>
                      {selectedNotification.type === 'reminder' 
                        ? 'Reminder Details:' 
                        : selectedNotification.type === 'feed'
                        ? 'Feeding Activity:'
                        : selectedNotification.type === 'water'
                        ? 'Water Activity:'
                        : selectedNotification.type === 'health'
                        ? 'Health Information:'
                        : selectedNotification.type === 'appointment'
                        ? 'Appointment Details:'
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
                                onError={() => {
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