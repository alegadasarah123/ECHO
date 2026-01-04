// notificationService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, AppState, AppStateStatus } from 'react-native';

// Global notification state
let isNotificationSystemInitialized = false;
let backgroundCheckInterval: NodeJS.Timeout | null = null;
let currentUserName: string = '';
let appStateListener: { remove: () => void } | null = null;

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

// Global notification state management
let globalNotificationListeners: ((notification: any) => void)[] = [];

export const addGlobalNotificationListener = (listener: (notification: any) => void) => {
  globalNotificationListeners.push(listener);
  return () => {
    globalNotificationListeners = globalNotificationListeners.filter(l => l !== listener);
  };
};

export const triggerGlobalNotification = (notification: any) => {
  globalNotificationListeners.forEach(listener => {
    try {
      listener(notification);
    } catch (error) {
      console.error('[Global Notification] Error in listener:', error);
    }
  });
};

// Send local notification
export async function sendLocalNotification(title: string, body: string, data?: any) {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        data: data || {},
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 250, 250, 250],
        badge: 1,
        autoDismiss: false,
      },
      trigger: null,
    });
    
    console.log('[Global Notification] Sent:', title);
    
    // Trigger global notification for any active listeners
    triggerGlobalNotification({
      title,
      body,
      data,
      id: notificationId,
      timestamp: new Date().toISOString()
    });
    
    return notificationId;
  } catch (error) {
    console.error('[Global Notification] Error:', error);
    return null;
  }
}

// Check for scheduled notifications
export async function checkScheduledTimesGlobal(userName: string) {
  try {
    const encodedUser = encodeURIComponent(userName);
    
    const response = await fetch(
      `https://echo-ebl8.onrender.com/api/kutsero/check-current-schedules/?kutsero_id=${encodedUser}`
    );
    
    if (!response.ok) {
      console.error('[Global Notification] Failed to check current schedules');
      return;
    }
    
    const data = await response.json();
    console.log('[Global Notification] Check schedules response:', data);
    
    if (!data.success || !data.data || data.data.length === 0) {
      console.log('[Global Notification] No schedules due at this time');
      return;
    }
    
    const now = new Date();
    const displayTime = now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }) + " at " + now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    
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
          time: displayTime,
          horseName: schedule.horse_name,
          scheduledTime: schedule.scheduled_time,
          timestamp: now.toISOString(),
          isNew: true,
        };
        
        await AsyncStorage.setItem(triggeredKey, JSON.stringify(triggeredNotif));
        console.log('[Global Notification] Triggered notification:', notifId);
        newNotificationsAdded = true;
        
        // Send local notification with alarm
        await sendLocalNotification(
          `🐴 ${schedule.title}`,
          `${schedule.horse_name}: ${schedule.message}`,
          { 
            type: 'reminder', 
            id: notifId,
            horseName: schedule.horse_name,
            channelId: 'high-priority'
          }
        );
        
        console.log('[Global Notification] Sent notification with sound for:', schedule.title);
        
        // Update feed/water count
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
    console.error('[Global Notification] Error checking scheduled times:', error);
    return false;
  }
}

// Request notification permissions
async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
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
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('[Global Notification] Notification permissions not granted');
      return;
    }
    console.log('[Global Notification] Notification permissions granted');
  }
}

// Handle app state changes
async function handleAppStateChange(nextAppState: AppStateStatus) {
  if (nextAppState === 'active' && currentUserName) {
    console.log('[Global Notification] App became active, checking notifications...');
    await checkScheduledTimesGlobal(currentUserName);
  }
}

// Initialize global notification system
export async function initializeNotificationSystem(userName: string) {
  if (isNotificationSystemInitialized) {
    console.log('[Global Notification] System already initialized');
    return;
  }

  try {
    currentUserName = userName;
    
    // Register for notifications
    await registerForPushNotificationsAsync();
    
    // Set up app state listener
    appStateListener = AppState.addEventListener('change', handleAppStateChange);
    
    // Set up background interval
    backgroundCheckInterval = setInterval(async () => {
      await checkScheduledTimesGlobal(userName);
    }, 60000) as unknown as NodeJS.Timeout;

    // Initial check
    await checkScheduledTimesGlobal(userName);
    
    isNotificationSystemInitialized = true;
    console.log('[Global Notification] System initialized successfully for user:', userName);
    
  } catch (error) {
    console.error('[Global Notification] Error initializing system:', error);
  }
}

// Stop notification system
export function stopNotificationSystem() {
  if (backgroundCheckInterval) {
    clearInterval(backgroundCheckInterval);
    backgroundCheckInterval = null;
  }
  
  if (appStateListener) {
    appStateListener.remove();
    appStateListener = null;
  }
  
  isNotificationSystemInitialized = false;
  currentUserName = '';
  console.log('[Global Notification] System stopped');
}

// Get current feed/water count
export async function getFeedWaterCount(): Promise<number> {
  try {
    const countKey = 'new_feed_water_count';
    const count = await AsyncStorage.getItem(countKey);
    return count ? parseInt(count) : 0;
  } catch (error) {
    console.error('[Global Notification] Error getting feed water count:', error);
    return 0;
  }
}

// Reset feed/water count
export async function resetFeedWaterCount(): Promise<void> {
  try {
    const countKey = 'new_feed_water_count';
    await AsyncStorage.setItem(countKey, '0');
    console.log('[Global Notification] Feed/water count reset');
  } catch (error) {
    console.error('[Global Notification] Error resetting feed water count:', error);
  }
}

// Check if system is initialized
export function isSystemInitialized(): boolean {
  return isNotificationSystemInitialized;
}

// Manually trigger a check (useful for testing)
export async function manualCheck(): Promise<boolean> {
  if (!currentUserName) {
    console.log('[Global Notification] No user set for manual check');
    return false;
  }
  
  console.log('[Global Notification] Manual check triggered');
  return await checkScheduledTimesGlobal(currentUserName) || false;
}