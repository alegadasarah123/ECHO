// HORSE_OPERATOR/water.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';

type WaterSchedule = {
  id: string;
  period: string;
  amount: string;
  time: string;
  completed?: boolean;
  completed_at?: string;
  water_id?: string;
  given_by?: string;
  given_by_id?: string;
  user_type?: string;
};

const API_BASE_URL = "http://192.168.31.58:8000/api/horse_operator";

// Configure notifications handler with proper NotificationBehavior type
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const WaterScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const horseName = params.horseName as string || 'Unknown Horse';
  const horseId = params.horseId as string || '';
  
  const [currentUser, setCurrentUser] = useState<string>('');
  const [wateringSchedule, setWateringSchedule] = useState<WaterSchedule[]>([]);
  const [showEditView, setShowEditView] = useState(false);
  const [showAddView, setShowAddView] = useState(false);
  const [editingWater, setEditingWater] = useState<WaterSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [wateringTime, setWateringTime] = useState({
    hour: '06',
    minute: '00',
    period: 'AM',
  });

  const [waterAmount, setWaterAmount] = useState('');
  const [waterPeriod, setWaterPeriod] = useState<'Morning' | 'Noon' | 'Evening' | ''>('');

  // Helper function to generate local ID
  const generateLocalId = (): string => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  // Get period order for sorting
  const getPeriodOrder = (period: string): number => {
    switch (period) {
      case 'Morning': return 1;
      case 'Noon': return 2;
      case 'Evening': return 3;
      default: return 4;
    }
  };

  // Sort water schedules by period
  const sortWaterByPeriod = useCallback((water: WaterSchedule[]): WaterSchedule[] => {
    return [...water].sort((a, b) => {
      const orderA = getPeriodOrder(a.period);
      const orderB = getPeriodOrder(b.period);
      return orderA - orderB;
    });
  }, []);

  // Get current user
  const getCurrentUser = useCallback(async (): Promise<string | null> => {
    if (currentUser) return currentUser;
    
    try {
      const storedUser = await SecureStore.getItemAsync("user_data");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const id = parsed.user_id || parsed.id;
        if (id) {
          console.log("Loaded user_id from storage:", id);
          setCurrentUser(id);
          return id;
        }
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
    return null;
  }, [currentUser]);

  // Load today's water records
  const loadTodaysWaterRecords = useCallback(async (userId: string): Promise<WaterSchedule[]> => {
    try {
      const url = `${API_BASE_URL}/get_watering_schedule/?user_id=${encodeURIComponent(userId)}&horse_id=${encodeURIComponent(horseId)}`;
      console.log("Loading today's water records:", url);

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.length > 0) {
          const water = data.map((item: any) => ({
            id: item.water_id || generateLocalId(),
            period: item.water_period,
            amount: item.water_amount,
            time: item.water_time,
            completed: item.completed || false,
            completed_at: item.completed_at,
            water_id: item.water_id,
            given_by: item.given_by,
            given_by_id: item.given_by_id,
            user_type: item.user_type,
          }));
          
          const sortedWater = sortWaterByPeriod(water);
          return sortedWater;
        }
      }
    } catch (error) {
      console.error('Error loading water records:', error);
    }
    
    return [];
  }, [horseId, sortWaterByPeriod]);

  // Parse time string to hours and minutes
  const parseTimeString = (timeString: string): { hours: number, minutes: number } | null => {
    try {
      const [time, period] = timeString.split(' ');
      const [hoursStr, minutesStr] = time.split(':');
      
      let hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      
      if (period === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }
      
      return { hours, minutes };
    } catch (error) {
      console.error('Error parsing time string:', error);
      return null;
    }
  };

  // Get period emoji for notifications
  const getPeriodEmoji = (period: string): string => {
    switch (period) {
      case 'Morning': return '🌅';
      case 'Noon': return '☀️';
      case 'Evening': return '🌙';
      default: return '💧';
    }
  };

  // Get notification subtitle based on period
  const getNotificationSubtitle = (period: string): string => {
    switch (period) {
      case 'Morning': return 'Start the day right with fresh water!';
      case 'Noon': return 'Stay hydrated during the warmest part of the day!';
      case 'Evening': return 'Evening hydration for a comfortable night!';
      default: return 'Time for watering!';
    }
  };

  // Get motivational message for notification body
  const getMotivationalMessage = (period: string): string => {
    const messages = {
      Morning: [
        "A fresh start with clean water! 🐎",
        "Morning hydration sets the tone for the day! 💪",
        "Perfect time for a refreshing drink! 🌟"
      ],
      Noon: [
        "Stay cool and hydrated! ❄️",
        "Midday refreshment for peak performance! 🏆",
        "Perfect timing for a water break! ⏰"
      ],
      Evening: [
        "Evening hydration for a peaceful night! 🌜",
        "Wind down with fresh water! 🌙",
        "Final hydration of the day! ✨"
      ]
    };
    
    const periodMessages = messages[period as keyof typeof messages] || [
      "Time for watering care! 💕"
    ];
    return periodMessages[Math.floor(Math.random() * periodMessages.length)];
  };

  // Store last viewed water time for automatic notifications
  const storeLastViewedWaterTime = useCallback(async (schedule: WaterSchedule[]): Promise<void> => {
    try {
      const lastViewedData = {
        horseId,
        horseName,
        schedule: schedule.map(water => ({
          period: water.period,
          time: water.time,
          amount: water.amount,
        })),
        lastUpdated: new Date().toISOString(),
      };
      
      await SecureStore.setItemAsync(`last_water_schedule_${horseId}`, JSON.stringify(lastViewedData));
      console.log('Stored last viewed water time for automatic notifications');
    } catch (error) {
      console.error('Error storing last viewed water time:', error);
    }
  }, [horseId, horseName]);

  // Schedule automatic daily notifications based on last viewed water time
  const scheduleAutomaticDailyNotifications = useCallback(async (): Promise<void> => {
    try {
      // Get the last stored water schedule
      const storedData = await SecureStore.getItemAsync(`last_water_schedule_${horseId}`);
      if (!storedData) {
        console.log('No stored water schedule found for automatic notifications');
        return;
      }

      const lastViewedData = JSON.parse(storedData);
      const { schedule, lastUpdated } = lastViewedData;

      // Check if data is from today
      const lastUpdatedDate = new Date(lastUpdated);
      const today = new Date();
      const isFromToday = lastUpdatedDate.toDateString() === today.toDateString();

      if (!isFromToday && schedule.length > 0) {
        console.log('Scheduling automatic daily notifications from last viewed schedule');

        // Cancel existing automatic notifications for this horse
        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
        const autoNotifications = scheduledNotifications.filter(notification => 
          notification.content.data?.type === 'auto_water_reminder' && 
          notification.content.data?.horseId === horseId
        );
        
        for (const notification of autoNotifications) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }

        // Schedule new automatic notifications
        for (const water of schedule) {
          const notificationTime = parseTimeString(water.time);
          if (notificationTime) {
            const trigger: Notifications.DailyTriggerInput = {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour: notificationTime.hours,
              minute: notificationTime.minutes,
            };

            const periodEmoji = getPeriodEmoji(water.period);
            const subtitle = getNotificationSubtitle(water.period);
            const motivationalMessage = getMotivationalMessage(water.period);

            await Notifications.scheduleNotificationAsync({
              content: {
                title: `${periodEmoji} ${water.period} Water - ${horseName}`,
                subtitle: subtitle,
                body: `💧 ${water.amount}\n${motivationalMessage}`,
                data: { 
                  type: 'auto_water_reminder',
                  horseId: horseId,
                  horseName: horseName,
                  period: water.period,
                  amount: water.amount,
                  time: water.time,
                  notificationId: `auto_water_${horseId}_${water.period}_${Date.now()}`
                },
                sound: 'default',
                priority: 'high',
                badge: 1,
                ...(Platform.OS === 'ios' && {
                  categoryIdentifier: 'WATER_REMINDER',
                  threadIdentifier: `horse-watering-${horseId}`,
                  summaryArgument: horseName,
                  relevanceScore: 1.0,
                }),
              },
              trigger,
            });

            console.log(`✅ Scheduled automatic ${water.period} notification for ${notificationTime.hours}:${notificationTime.minutes}`);
          }
        }
      }
    } catch (error) {
      console.error('Error scheduling automatic daily notifications:', error);
    }
  }, [horseId, horseName]);

  // Schedule water notifications
  const scheduleWaterNotifications = useCallback(async (schedule: any[]): Promise<void> => {
    try {
      // First, get all currently scheduled notifications
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`Currently have ${scheduledNotifications.length} scheduled notifications`);
      
      // Cancel only water-related notifications for this horse
      const waterNotifications = scheduledNotifications.filter(notification => 
        (notification.content.data?.type === 'water_reminder' || 
         notification.content.data?.type === 'auto_water_reminder') && 
        notification.content.data?.horseId === horseId
      );
      
      if (waterNotifications.length > 0) {
        console.log(`Canceling ${waterNotifications.length} existing water notifications for horse ${horseId}`);
        for (const notification of waterNotifications) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }

      // Store the current schedule for automatic daily notifications
      await storeLastViewedWaterTime(schedule);

      // Schedule new notifications for each water schedule with improved design
      console.log(`Scheduling ${schedule.length} new water notifications`);
      
      for (const water of schedule) {
        const notificationTime = parseTimeString(water.time);
        if (notificationTime) {
          const trigger: Notifications.DailyTriggerInput = {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: notificationTime.hours,
            minute: notificationTime.minutes,
          };

          const periodEmoji = getPeriodEmoji(water.period);
          const subtitle = getNotificationSubtitle(water.period);
          const motivationalMessage = getMotivationalMessage(water.period);

          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `${periodEmoji} ${water.period} Water - ${horseName}`,
              subtitle: subtitle,
              body: `💧 ${water.amount}\n${motivationalMessage}`,
              data: { 
                type: 'water_reminder',
                horseId: horseId,
                horseName: horseName,
                period: water.period,
                amount: water.amount,
                time: water.time,
                notificationId: `water_${horseId}_${water.period}_${Date.now()}`
              },
              sound: 'default',
              priority: 'high',
              badge: 1,
              ...(Platform.OS === 'ios' && {
                categoryIdentifier: 'WATER_REMINDER',
                threadIdentifier: `horse-watering-${horseId}`,
                summaryArgument: horseName,
                relevanceScore: 1.0,
              }),
            },
            trigger,
          });

          console.log(`✅ Scheduled ${water.period} notification for ${notificationTime.hours}:${notificationTime.minutes} (ID: ${notificationId})`);
        } else {
          console.warn(`❌ Could not parse time for ${water.period}: ${water.time}`);
        }
      }

      // Verify scheduled notifications
      const finalScheduled = await Notifications.getAllScheduledNotificationsAsync();
      const waterScheduled = finalScheduled.filter(notification => 
        notification.content.data?.type === 'water_reminder' && 
        notification.content.data?.horseId === horseId
      );
      console.log(`✅ Successfully scheduled ${waterScheduled.length} water notifications for horse ${horseId}`);
      
    } catch (error) {
      console.error('❌ Error scheduling notifications:', error);
    }
  }, [horseId, horseName, storeLastViewedWaterTime]);

  // Save schedule to database
  const saveScheduleToDatabase = async (schedule: WaterSchedule[]): Promise<boolean> => {
    if (!currentUser || !horseId) {
      console.error('Cannot save schedule: Missing user ID or horse ID');
      return false;
    }

    try {
      // Filter out completed schedules and prepare for saving
      const scheduleToSave = schedule
        .filter(water => !water.completed)
        .map(water => ({
          time: water.time,
          amount: water.amount,
          period: water.period,
        }));

      const response = await fetch(`${API_BASE_URL}/save_watering_schedule/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: currentUser,
          horse_id: horseId,
          schedule: scheduleToSave,
        }),
      });

      if (response.ok) {
        await response.json();
        console.log('Watering schedule saved to database.');
        
        // Schedule notifications for all active schedules
        await scheduleWaterNotifications(scheduleToSave);
        
        return true;
      } else {
        const errorData = await response.json();
        console.error('Failed to save schedule to database:', errorData);
        return false;
      }
    } catch (error) {
      console.error('Error saving schedule to database:', error);
      return false;
    }
  };

  // Initialize water screen
  const initializeWaterScreen = useCallback(async (): Promise<void> => {
    if (isInitialized || !horseId) return;

    console.log("Initializing water screen...");
    setIsLoading(true);
    
    try {
      const userId = await getCurrentUser();
      if (!userId) {
        console.error("No user ID found");
        return;
      }

      const todaysRecords = await loadTodaysWaterRecords(userId);
      console.log(`Loaded ${todaysRecords.length} watering schedule items for today`);
      
      setWateringSchedule(todaysRecords);
      setIsInitialized(true);
      
      // Schedule notifications for any existing schedules
      if (todaysRecords.length > 0) {
        const activeSchedules = todaysRecords.filter(water => !water.completed);
        if (activeSchedules.length > 0) {
          await scheduleWaterNotifications(activeSchedules);
        }
      }
      
      // Schedule automatic daily notifications based on last viewed time
      await scheduleAutomaticDailyNotifications();
      
    } catch (error) {
      console.error('Error initializing water screen:', error);
      setWateringSchedule([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    isInitialized, 
    horseId, 
    getCurrentUser, 
    loadTodaysWaterRecords, 
    scheduleWaterNotifications, 
    scheduleAutomaticDailyNotifications
  ]);

  // Request notification permissions on component mount
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Notification permissions not granted');
        } else {
          console.log('Notification permissions granted');
        }
      } catch (error) {
        console.error('Error requesting notification permissions:', error);
      }
    };

    requestPermissions();
  }, []);

  // Set up notification response handling
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      if (data.type === 'water_reminder' || data.type === 'auto_water_reminder') {
        console.log('Water reminder notification tapped:', data);
        
        // Show a friendly message when notification is tapped
        Alert.alert(
          `${data.period} Water Reminder`,
          `Remember to give ${data.amount} of water to ${data.horseName}`,
          [{ text: 'OK', onPress: () => console.log('Notification handled') }]
        );
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      if (mounted && !isInitialized) {
        await initializeWaterScreen();
      }
    };
    
    init();
    
    return () => {
      mounted = false;
    };
  }, [initializeWaterScreen, isInitialized]);

  // Refresh function
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    try {
      if (currentUser && horseId) {
        const todaysRecords = await loadTodaysWaterRecords(currentUser);
        setWateringSchedule(todaysRecords);
        
        // Update notifications for active schedules
        const activeSchedules = todaysRecords.filter(water => !water.completed);
        if (activeSchedules.length > 0) {
          await scheduleWaterNotifications(activeSchedules);
        }
        
        // Schedule automatic daily notifications
        await scheduleAutomaticDailyNotifications();
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [
    currentUser, 
    horseId, 
    loadTodaysWaterRecords, 
    scheduleWaterNotifications, 
    scheduleAutomaticDailyNotifications
  ]);

  // Focus effect
  useFocusEffect(
    useCallback(() => {
      if (currentUser && isInitialized) {
        onRefresh();
      }
    }, [currentUser, isInitialized, onRefresh])
  );

  // Check if water is completed (by anyone)
  const isWaterCompleted = useCallback((period: string): boolean => {
    const existingWater = wateringSchedule.find(water => 
      water.period === period && 
      water.completed
    );
    return !!existingWater;
  }, [wateringSchedule]);

  // Get completed water info
  const getCompletedWaterInfo = useCallback((period: string): { given_by: string, user_type: string } | null => {
    const existingWater = wateringSchedule.find(water => 
      water.period === period && 
      water.completed
    );
    return existingWater ? { 
      given_by: existingWater.given_by || 'Unknown', 
      user_type: existingWater.user_type || 'unknown' 
    } : null;
  }, [wateringSchedule]);

  // Check if all waters are completed
  const areAllWatersCompleted = useCallback((): boolean => {
    const periods = ['Morning', 'Noon', 'Evening'];
    return periods.every(period => isWaterCompleted(period));
  }, [isWaterCompleted]);

  // Get available periods for adding new schedules
  const getAvailablePeriods = useCallback((): ('Morning' | 'Noon' | 'Evening')[] => {
    const allPeriods: ('Morning' | 'Noon' | 'Evening')[] = ['Morning', 'Noon', 'Evening'];
    
    return allPeriods.filter(period => {
      // Check if this period is completed
      if (isWaterCompleted(period)) {
        return false; // Cannot add schedule for completed periods
      }
      
      // Check if there's already an existing schedule for this period
      const existingSchedule = wateringSchedule.find(water => water.period === period);
      if (existingSchedule) {
        return false; // Cannot add schedule for existing periods
      }
      
      return true; // This period is available for new schedules
    });
  }, [wateringSchedule, isWaterCompleted]);

  // Get scheduled periods (for display purposes)
  const getScheduledPeriods = useCallback((): string[] => {
    return wateringSchedule.map(water => water.period);
  }, [wateringSchedule]);

  // Handle mark as given
  const handleMarkAsGiven = async (water: WaterSchedule): Promise<void> => {
    if (!currentUser) {
      Alert.alert('Error', 'User not found');
      return;
    }

    // Check if already completed locally
    if (water.completed) {
      Alert.alert('Already Given', `This water has already been given by ${water.given_by || 'another user'}.`);
      return;
    }

    try {
      const now = new Date();
      const completedAt = now.toISOString();

      console.log('Marking water as given:', {
        user_id: currentUser,
        horse_id: horseId,
        water_time: water.time,
        water_period: water.period,
        water_amount: water.amount,
        completed_at: completedAt
      });

      const response = await fetch(`${API_BASE_URL}/mark_water_given/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: currentUser,
          horse_id: horseId,
          water_time: water.time,
          water_period: water.period,
          water_amount: water.amount,
          completed_at: completedAt,
          water_id: water.water_id, // Pass water_id for tracking
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        // Server will return an error if water was already given by someone else
        if (result.already_given) {
          Alert.alert(
            'Already Given',
            result.error || `This water has already been given by ${result.given_by}.`,
            [
              {
                text: 'Refresh',
                onPress: () => onRefresh()
              },
              { text: 'OK' }
            ]
          );
          return;
        }
        
        console.error("Mark as given error:", result);
        throw new Error(result.error || 'Failed to mark water as given');
      }

      console.log("Water given and saved to database:", result);

      // Update the specific water schedule with server response
      const updatedSchedule = wateringSchedule.map(w =>
        w.id === water.id 
          ? { 
              ...w, 
              completed: true, 
              completed_at: completedAt,
              water_id: result.water_id,
              given_by: result.given_by,
              user_type: result.user_type
            }
          : w
      );
        
      setWateringSchedule(sortWaterByPeriod(updatedSchedule));
      
      // Cancel notification for this specific period since it's completed
      try {
        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
        const notificationToCancel = scheduledNotifications.find(notification => 
          (notification.content.data?.type === 'water_reminder' || 
           notification.content.data?.type === 'auto_water_reminder') && 
          notification.content.data?.horseId === horseId &&
          notification.content.data?.period === water.period
        );
        
        if (notificationToCancel) {
          await Notifications.cancelScheduledNotificationAsync(notificationToCancel.identifier);
          console.log(`Cancelled notification for ${water.period} period`);
        }
      } catch (error) {
        console.error('Error cancelling notification:', error);
      }
      
      Alert.alert('Success', `Water given to ${horseName} and recorded in database!`);
    } catch (error: any) {
      console.error('Error marking water as given:', error);
      Alert.alert('Error', error.message || 'Failed to record watering');
    }
  };

  // Handle add new schedule
  const handleAddNewSchedule = (): void => {
    // Check if all waters are completed
    if (areAllWatersCompleted()) {
      Alert.alert(
        'All Waters Completed',
        `All watering periods have been completed. You cannot add new schedules when all periods are already given.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Get available periods
    const availablePeriods = getAvailablePeriods();
    
    if (availablePeriods.length === 0) {
      Alert.alert(
        'No Available Periods',
        `All periods either have existing schedules or have been completed.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setWateringTime({
      hour: '06',
      minute: '00',
      period: 'AM',
    });
    setWaterAmount('');
    setWaterPeriod('');
    setShowAddView(true);
  };

  // Handle edit water
  const handleEdit = (water: WaterSchedule): void => {
    if (water.completed) {
      const givenBy = water.given_by || 'someone';
      Alert.alert(
        'Cannot Edit',
        `This water was already given by ${givenBy}. You cannot edit completed schedules.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setEditingWater(water);
    const timeParts = water.time.split(' ');
    const time = timeParts[0].split(':');
    setWateringTime({
      hour: time[0],
      minute: time[1],
      period: timeParts[1] || 'AM',
    });
    setWaterAmount(water.amount);
    setWaterPeriod(water.period as any);
    setShowEditView(true);
  };

  // Handle delete water
  const handleDeleteWater = async (water: WaterSchedule): Promise<void> => {
    if (water.completed) {
      Alert.alert(
        'Cannot Delete',
        `This water has already been completed and cannot be deleted.`,
        [{ text: 'OK' }]
      );
      return;
    }

    if (!currentUser) {
      Alert.alert('Error', 'User not found');
      return;
    }

    Alert.alert(
      'Delete Water Schedule',
      `Are you sure you want to delete the ${water.period} schedule? This will remove it from your daily schedule.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Attempting to delete water schedule:', {
                user_id: currentUser,
                water_id: water.water_id,
                period: water.period
              });

              // If water has a database ID, delete from database
              if (water.water_id) {
                console.log('Deleting from database with water_id:', water.water_id);
                
                const response = await fetch(`${API_BASE_URL}/delete_water_schedule/`, {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    user_id: currentUser,
                    water_id: water.water_id,
                  }),
                });

                // Check if response is OK
                if (!response.ok) {
                  let errorMessage = 'Failed to delete water schedule from database';
                  
                  try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                    console.error('Server error response:', errorData);
                  } catch {
                    // If response is not JSON, get text
                    const textResponse = await response.text();
                    console.error('Non-JSON response:', textResponse);
                    errorMessage = 'Server returned an invalid response';
                  }
                  
                  Alert.alert('Error', errorMessage);
                  return;
                }

                // Try to parse successful response
                try {
                  await response.json();
                  console.log('Delete successful');
                } catch {
                  // If no JSON but response is OK, that's fine
                  console.log('Delete successful (no response body)');
                }
              }

              // Update local state regardless of database deletion
              const updatedSchedule = wateringSchedule.filter(w => w.id !== water.id);
              setWateringSchedule(sortWaterByPeriod(updatedSchedule));
              
              // Update notifications - cancel the specific notification and reschedule remaining ones
              try {
                const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
                const notificationToCancel = scheduledNotifications.find(notification => 
                  (notification.content.data?.type === 'water_reminder' || 
                   notification.content.data?.type === 'auto_water_reminder') && 
                  notification.content.data?.horseId === horseId &&
                  notification.content.data?.period === water.period
                );
                
                if (notificationToCancel) {
                  await Notifications.cancelScheduledNotificationAsync(notificationToCancel.identifier);
                  console.log(`Cancelled notification for ${water.period}`);
                }
                
                // Reschedule remaining notifications to ensure they're properly set
                const activeSchedules = updatedSchedule.filter(w => !w.completed);
                if (activeSchedules.length > 0) {
                  await scheduleWaterNotifications(activeSchedules);
                }
              } catch (error) {
                console.error('Error updating notifications:', error);
              }
              
              Alert.alert('Success', `${water.period} schedule deleted successfully`);
              
            } catch (error: any) {
              console.error('Error deleting water schedule:', error);
              
              // More specific error handling
              if (error.message && error.message.includes('JSON Parse error')) {
                Alert.alert(
                  'Network Error', 
                  'Failed to connect to server. Please check your internet connection and try again.'
                );
              } else if (error.message && error.message.includes('Failed to delete')) {
                // Database deletion failed, but we can still update locally
                const updatedSchedule = wateringSchedule.filter(w => w.id !== water.id);
                setWateringSchedule(sortWaterByPeriod(updatedSchedule));
                Alert.alert(
                  'Warning', 
                  'Schedule deleted locally but failed to delete from database. Please try again later.'
                );
              } else {
                Alert.alert('Error', 'Failed to delete water schedule: ' + error.message);
              }
            }
          }
        }
      ]
    );
  };

  // Handle water log navigation
  const handleWaterLog = (): void => {
    router.push('/HORSE_OPERATOR/waterlog');
  };

  // Handle time change
  const handleTimeChange = (field: 'hour' | 'minute' | 'period', value: string): void => {
    setWateringTime(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle amount change
  const handleAmountChange = (amount: string): void => {
    setWaterAmount(amount);
  };

  // Handle save new schedule
  const handleSaveNewSchedule = async (): Promise<void> => {
    if (!waterAmount.trim()) {
      Alert.alert('Error', 'Please specify water amount.');
      return;
    }

    if (!waterPeriod) {
      Alert.alert('Error', 'Please select a period.');
      return;
    }

    try {
      const updatedTime = `${wateringTime.hour}:${wateringTime.minute} ${wateringTime.period}`;

      // Check if period is already completed
      if (isWaterCompleted(waterPeriod)) {
        const completedInfo = getCompletedWaterInfo(waterPeriod);
        Alert.alert(
          'Cannot Add Schedule',
          `This ${waterPeriod} water has already been completed by ${completedInfo?.given_by}. You cannot add a new schedule for completed periods.`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Check if period already exists
      const existingWater = wateringSchedule.find(water => water.period === waterPeriod);
      if (existingWater) {
        // Check if the existing water is completed by anyone
        if (existingWater.completed) {
          const givenBy = existingWater.given_by || 'someone';
          Alert.alert(
            'Water Already Completed',
            `The ${waterPeriod} schedule has already been completed by ${givenBy}. You cannot replace completed schedules.`,
            [{ text: 'OK' }]
          );
          return;
        }

        Alert.alert(
          'Period Exists',
          `A ${waterPeriod} schedule already exists. Would you like to replace it?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Replace',
              onPress: async () => {
                const updatedSchedule = wateringSchedule.map(water =>
                  water.period === waterPeriod
                    ? {
                        ...water,
                        time: updatedTime,
                        amount: waterAmount,
                        period: waterPeriod,
                      }
                    : water
                );
                
                setWateringSchedule(sortWaterByPeriod(updatedSchedule));
                setShowAddView(false);
                
                const success = await saveScheduleToDatabase(updatedSchedule);
                if (success) {
                  Alert.alert('Success', `${waterPeriod} schedule updated for ${horseName}!`);
                } else {
                  Alert.alert('Warning', 'Schedule updated locally but failed to save to database');
                }
              }
            }
          ]
        );
        return;
      }

      const newWater: WaterSchedule = {
        id: generateLocalId(),
        time: updatedTime,
        amount: waterAmount,
        period: waterPeriod,
        completed: false,
      };

      const updatedSchedule = [...wateringSchedule, newWater];
      setWateringSchedule(sortWaterByPeriod(updatedSchedule));
      setShowAddView(false);
      
      const success = await saveScheduleToDatabase(updatedSchedule);
      if (success) {
        Alert.alert('Success', `${waterPeriod} schedule added for ${horseName}!`);
      } else {
        Alert.alert('Warning', 'Schedule added locally but failed to save to database');
      }
    } catch (error) {
      console.error('Error saving new schedule:', error);
      Alert.alert('Error', 'Failed to save new schedule');
    }
  };

  // Handle save changes
  const handleSaveChanges = async (): Promise<void> => {
    if (!waterAmount.trim()) {
      Alert.alert('Error', 'Please specify water amount.');
      return;
    }
          
    if (!editingWater || !currentUser) return;

    // Check if this water is completed
    if (editingWater.completed) {
      const givenBy = editingWater.given_by || 'someone';
      Alert.alert(
        'Cannot Edit',
        `This water has already been completed by ${givenBy}. You cannot edit it.`,
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const updatedTime = `${wateringTime.hour}:${wateringTime.minute} ${wateringTime.period}`;

      const updatedSchedule = wateringSchedule.map(water =>
        water.id === editingWater.id
          ? {
              ...water,
              time: updatedTime,
              amount: waterAmount,
              period: waterPeriod || editingWater.period,
            }
          : water
      );
          
      setWateringSchedule(sortWaterByPeriod(updatedSchedule));
      setShowEditView(false);
      
      const success = await saveScheduleToDatabase(updatedSchedule);
      if (success) {
        Alert.alert('Success', `Watering schedule updated for ${horseName}!`);
      } else {
        Alert.alert('Warning', 'Schedule updated locally but failed to save to database');
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      Alert.alert('Error', 'Failed to save changes');
    }
  };

  // Handle cancel
  const handleCancel = (): void => {
    setShowEditView(false);
    setShowAddView(false);
  };

  // Get period icon
  const getPeriodIcon = (period: string): string => {
    switch (period) {
      case 'Morning': return 'sun';
      case 'Noon': return 'cloud-sun';
      case 'Evening': return 'moon';
      default: return 'tint';
    }
  };

  // Get available periods for display
  const availablePeriods = getAvailablePeriods();
  const scheduledPeriods = getScheduledPeriods();

  // Check if a period is already scheduled (for UI display)
  const isPeriodScheduled = (period: string): boolean => {
    return scheduledPeriods.includes(period);
  };

  // Show loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text>Loading watering schedule...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Edit View
  if (showEditView) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowEditView(false)} style={styles.backButton}>
            <FontAwesome5 name="arrow-left" size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit {editingWater?.period}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Period</Text>
              <View style={styles.periodContainer}>
                {(['Morning', 'Noon', 'Evening'] as const).map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodButton,
                      waterPeriod === period && styles.periodButtonSelected,
                      (isWaterCompleted(period) || isPeriodScheduled(period)) && styles.periodButtonDisabled
                    ]}
                    onPress={() => {
                      if (isWaterCompleted(period)) {
                        const completedInfo = getCompletedWaterInfo(period);
                        Alert.alert(
                          'Cannot Select',
                          `This ${period} water has been completed by ${completedInfo?.given_by} and cannot be modified.`,
                          [{ text: 'OK' }]
                        );
                        return;
                      }
                      if (isPeriodScheduled(period) && period !== editingWater?.period) {
                        Alert.alert(
                          'Already Scheduled',
                          `A ${period} schedule already exists. You cannot have multiple schedules for the same period.`,
                          [{ text: 'OK' }]
                        );
                        return;
                      }
                      setWaterPeriod(period);
                    }}
                    disabled={isWaterCompleted(period) || (isPeriodScheduled(period) && period !== editingWater?.period)}
                  >
                    <Text style={[
                      styles.periodButtonText,
                      waterPeriod === period && styles.periodButtonTextSelected,
                      (isWaterCompleted(period) || isPeriodScheduled(period)) && styles.periodButtonTextDisabled
                    ]}>
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Watering Time</Text>
              <View style={styles.timeInputContainer}>
                <TextInput
                  style={styles.timeInput}
                  value={wateringTime.hour}
                  onChangeText={(value) => handleTimeChange('hour', value)}
                  placeholder="HH"
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.timeSeparator}>:</Text>
                <TextInput
                  style={styles.timeInput}
                  value={wateringTime.minute}
                  onChangeText={(value) => handleTimeChange('minute', value)}
                  placeholder="MM"
                  keyboardType="numeric"
                  maxLength={2}
                />
                <View style={styles.periodTimeContainer}>
                  {(['AM', 'PM'] as const).map((period) => (
                    <TouchableOpacity
                      key={period}
                      style={[
                        styles.periodTimeButton,
                        wateringTime.period === period && styles.periodTimeButtonSelected
                      ]}
                      onPress={() => handleTimeChange('period', period)}
                    >
                      <Text style={[
                        styles.periodTimeButtonText,
                        wateringTime.period === period && styles.periodTimeButtonTextSelected
                      ]}>
                        {period}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Water Amount</Text>
              <View style={styles.amountContainer}>
                <TextInput
                  style={styles.amountInput}
                  value={waterAmount}
                  onChangeText={handleAmountChange}
                  placeholder="Enter water amount (e.g., 15 liters)"
                  keyboardType="default"
                />
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Add View
  if (showAddView) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowAddView(false)} style={styles.backButton}>
            <FontAwesome5 name="arrow-left" size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Watering Schedule</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Water Period</Text>
              <View style={styles.periodContainer}>
                {(['Morning', 'Noon', 'Evening'] as const).map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodButton,
                      waterPeriod === period && styles.periodButtonSelected,
                      (isWaterCompleted(period) || isPeriodScheduled(period)) && styles.periodButtonDisabled
                    ]}
                    onPress={() => {
                      if (isWaterCompleted(period)) {
                        const completedInfo = getCompletedWaterInfo(period);
                        Alert.alert(
                          'Cannot Select',
                          `This ${period} water has been completed by ${completedInfo?.given_by} and cannot be modified.`,
                          [{ text: 'OK' }]
                        );
                        return;
                      }
                      if (isPeriodScheduled(period)) {
                        Alert.alert(
                          'Already Scheduled',
                          `A ${period} schedule already exists. You cannot have multiple schedules for the same period.`,
                          [{ text: 'OK' }]
                        );
                        return;
                      }
                      setWaterPeriod(period);
                    }}
                    disabled={isWaterCompleted(period) || isPeriodScheduled(period)}
                  >
                    <Text style={[
                      styles.periodButtonText,
                      waterPeriod === period && styles.periodButtonTextSelected,
                      (isWaterCompleted(period) || isPeriodScheduled(period)) && styles.periodButtonTextDisabled
                    ]}>
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Watering Time</Text>
              <View style={styles.timeInputContainer}>
                <TextInput
                  style={styles.timeInput}
                  value={wateringTime.hour}
                  onChangeText={(value) => handleTimeChange('hour', value)}
                  placeholder="HH"
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.timeSeparator}>:</Text>
                <TextInput
                  style={styles.timeInput}
                  value={wateringTime.minute}
                  onChangeText={(value) => handleTimeChange('minute', value)}
                  placeholder="MM"
                  keyboardType="numeric"
                  maxLength={2}
                />
                <View style={styles.periodTimeContainer}>
                  {(['AM', 'PM'] as const).map((period) => (
                    <TouchableOpacity
                      key={period}
                      style={[
                        styles.periodTimeButton,
                        wateringTime.period === period && styles.periodTimeButtonSelected
                      ]}
                      onPress={() => handleTimeChange('period', period)}
                    >
                      <Text style={[
                        styles.periodTimeButtonText,
                        wateringTime.period === period && styles.periodTimeButtonTextSelected
                      ]}>
                        {period}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Water Amount</Text>
              <View style={styles.amountContainer}>
                <TextInput
                  style={styles.amountInput}
                  value={waterAmount}
                  onChangeText={handleAmountChange}
                  placeholder="Enter water amount (e.g., 15 liters)"
                  keyboardType="default"
                />
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.saveButton,
              !waterPeriod && styles.saveButtonDisabled
            ]} 
            onPress={handleSaveNewSchedule}
            disabled={!waterPeriod}
          >
            <Text style={styles.saveButtonText}>Add Schedule</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main Water List View
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/HORSE_OPERATOR/horse')} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <FontAwesome5 name="tint" size={20} color="#fff" />
          <Text style={styles.headerTitle}>{horseName} Water</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.waterLogButton} onPress={handleWaterLog}>
            <FontAwesome5 name="clipboard-list" size={14} color="#fff" />
            <Text style={styles.waterLogText}>Log</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
      >
        <View style={styles.content}>
          {areAllWatersCompleted() && (
            <View style={styles.allCompletedAlert}>
              <FontAwesome5 name="check-circle" size={16} color="#fff" />
              <Text style={styles.allCompletedAlertText}>
                All watering periods have been completed today.
              </Text>
            </View>
          )}

          {wateringSchedule.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome5 name="tint" size={64} color="#E2E8F0" />
              <Text style={styles.emptyStateTitle}>No water schedule found</Text>
              <Text style={styles.emptyStateText}>
                Add your first watering schedule to get started. Your schedule will be saved for today.
              </Text>
              <TouchableOpacity style={styles.addFirstScheduleButton} onPress={handleAddNewSchedule}>
                <FontAwesome5 name="plus" size={16} color="#fff" />
                <Text style={styles.addFirstScheduleButtonText}>Add New Water Schedule</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {wateringSchedule.map((water) => (
                <View key={water.id} style={[
                  styles.waterCard,
                  water.completed && styles.lockedWaterCard
                ]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.waterInfo}>
                      <View style={styles.waterTitleRow}>
                        <FontAwesome5 
                          name={getPeriodIcon(water.period)} 
                          size={18} 
                          color="#3B82F6" 
                        />
                        <Text style={styles.waterTitle}>{water.period}</Text>
                      </View>
                      <Text style={styles.waterTime}>{water.time}</Text>
                    </View>
                    <View style={styles.waterActions}>
                      {!water.completed && (
                        <>
                          <TouchableOpacity 
                            style={styles.editButton}
                            onPress={() => handleEdit(water)}
                          >
                            <FontAwesome5 name="edit" size={14} color="#3B82F6" />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.deleteButton}
                            onPress={() => handleDeleteWater(water)}
                          >
                            <FontAwesome5 name="trash" size={14} color="#EF4444" />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <View style={styles.waterInfo}>
                      <View style={styles.waterTypeRow}>
                        <Text style={styles.waterAmount}>{water.amount}</Text>
                      </View>
                    </View>

                    {water.completed ? (
                      <View style={styles.completedSection}>
                        <View style={styles.completedStatus}>
                          <View style={styles.completedIconContainer}>
                            <FontAwesome5 name="check" size={14} color="#fff" />
                          </View>
                          <Text style={styles.completedText}>Given</Text>
                        </View>
                        {water.given_by && (
                          <View style={styles.givenByContainer}>
                            <FontAwesome5 name="user" size={12} color="#6B7280" />
                            <Text style={styles.givenByText}>Given by: {water.given_by}</Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.markGivenButton}
                        onPress={() => handleMarkAsGiven(water)}
                      >
                        <Text style={styles.markGivenButtonText}>
                          Mark as Given
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}

              {availablePeriods.length > 0 && (
                <TouchableOpacity style={styles.addScheduleButton} onPress={handleAddNewSchedule}>
                  <Text style={styles.addScheduleButtonText}>Add Water Schedule</Text>
                </TouchableOpacity>
              )}

              {availablePeriods.length === 0 && wateringSchedule.length > 0}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#3B82F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 18,
    backgroundColor: '#3B82F6',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waterLogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    marginRight: 8,
  },
  waterLogText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  placeholder: {
    width: 44,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
  },
  allCompletedAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  allCompletedAlertText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  addFirstScheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  addFirstScheduleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  waterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  lockedWaterCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  waterInfo: {
    flex: 1,
  },
  waterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  waterTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginLeft: 8,
  },
  waterTime: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  waterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cardContent: {
    gap: 16,
  },
  waterTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  waterAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
  },
  completedSection: {
    gap: 8,
  },
  completedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  completedIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  completedText: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '600',
  },
  givenByContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  givenByText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 8,
  },
  markGivenButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  markGivenButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  addScheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 20,
    marginBottom: 5,
    shadowColor: '#10B981', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  addIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addScheduleButtonText: {
    color: '#ffffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  noAvailablePeriodsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noAvailablePeriodsText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginLeft: 8,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.1)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  periodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  periodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  periodButtonSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  periodButtonDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  periodButtonTextSelected: {
    color: '#FFFFFF',
  },
  periodButtonTextDisabled: {
    color: '#94A3B8',
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  timeInput: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600',
    backgroundColor: '#F8FAFC',
    width: 70,
    textAlign: 'center',
    color: '#1E293B',
  },
  timeSeparator: {
    fontSize: 20,
    fontWeight: '700',
    color: '#64748B',
    marginHorizontal: 12,
  },
  periodTimeContainer: {
    flexDirection: 'row',
    marginLeft: 15,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  periodTimeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
  },
  periodTimeButtonSelected: {
    backgroundColor: '#3B82F6',
  },
  periodTimeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  periodTimeButtonTextSelected: {
    color: '#FFFFFF',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountInput: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: '#F8FAFC',
    flex: 1,
    color: '#1E293B',
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#94A3B8',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
    flex: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
    flex: 1,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowColor: 'transparent',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default WaterScreen;