import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true, // Added for iOS
    shouldShowList: true,   // Added for iOS
  }),
});

export const usePushNotifications = () => {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        console.log('[Notification] Push token:', token);
      }
    });

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
      console.log('[Notification] Received:', notification);
    });

    // Listen for user tapping on notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[Notification] User tapped:', response);
    });

    return () => {
      if (notificationListener.current) {
        // Use the remove() method on the subscription directly
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // Simple function to send local notification
  const sendNotification = async (title: string, body: string, data: Record<string, any> = {}) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
        },
        trigger: null, // Send immediately
      });
      console.log('[Notification] Sent:', title);
      return true;
    } catch (error) {
      console.error('[Notification] Error sending:', error);
      return false;
    }
  };

  return {
    expoPushToken,
    notification,
    sendNotification,
    registerForPushNotificationsAsync
  };
};

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

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('[Notification] Permission not granted');
      return;
    }
    
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-project-id', // Replace with your actual project ID
      });
      token = tokenData.data;
      console.log('[Notification] Got token:', token);
    } catch (error) {
      console.error('[Notification] Error getting token:', error);
    }
  } else {
    console.log('[Notification] Physical device required');
  }

  return token;
}