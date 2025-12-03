// HORSE_OPERATOR/Hfeed.tsx

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
  Image,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';

type Meal = {
  id: string;
  fd_food_type: string;
  fd_qty: string;
  fd_time: string;
  fd_meal_type: string;
  completed?: boolean;
  completed_at?: string;
  fd_id?: string;
  fed_by?: string;      
  fed_by_id?: string;   
  user_type?: string;  
};

type FeedType = {
  id: string;
  name: string;
  amount: string;
  image: string;
};

// Real horse food images from Unsplash - actual photos of what horses eat
const FOOD_IMAGES = {
  hay: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=300&fit=crop", // Hay bales
  oats: "https://images.unsplash.com/photo-1598965675045-8cde31b355d0?w=400&h=300&fit=crop", // Oats
  grains: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop", // Mixed grains
  carrots: "https://images.unsplash.com/photo-1445282768818-728615cc910a?w=400&h=300&fit=crop", // Carrots
  apples: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=300&fit=crop", // Apples
  pellets: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop", // Horse pellets
  beetpulp: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop", // Beet pulp
  bran: "https://images.unsplash.com/photo-1598965675045-8cde31b355d0?w=400&h=300&fit=crop", // Bran mash
  alfalfa: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=300&fit=crop", // Alfalfa hay
  grass: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=300&fit=crop", // Fresh grass
  saltblock: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop", // Salt/mineral block
  supplements: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop", // Vitamin supplements
  default: "https://images.unsplash.com/photo-1504208434303-cb4f6350f0b8?w=400&h=300&fit=crop", // General horse feed
  // Custom feed types for horse operator
  chaff: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop", // Chaff
  resolve: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop", // Resolve supplement
  dynavy: "https://images.unsplash.com/photo-1598965675045-8cde31b355d0?w=400&h=300&fit=crop", // Dynavy grains
  magnesium: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop", // Magnesium supplement
};

const API_BASE_URL = "http://192.168.31.58:8000/api/horse_operator"

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const FeedScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const horseName = params.horseName as string || 'Unknown Horse';
  const horseId = params.horseId as string || '';
  const [currentUser, setCurrentUser] = useState<string>('');
    
  const [feedingSchedule, setFeedingSchedule] = useState<Meal[]>([]);
  const [showEditView, setShowEditView] = useState(false);
  const [showAddView, setShowAddView] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
    
  const [feedingTime, setFeedingTime] = useState({
    hour: '06',
    minute: '00',
    period: 'AM',
  });

  const [mealType, setMealType] = useState<'Breakfast' | 'Lunch' | 'Dinner' | ''>('');
  const [feedTypes, setFeedTypes] = useState<FeedType[]>([
    { id: '1', name: 'Hay', amount: '', image: FOOD_IMAGES.hay },
    { id: '2', name: 'Oats', amount: '', image: FOOD_IMAGES.oats },
    { id: '3', name: 'Grains', amount: '', image: FOOD_IMAGES.grains },
    { id: '4', name: 'Carrots', amount: '', image: FOOD_IMAGES.carrots },
    { id: '5', name: 'Apples', amount: '', image: FOOD_IMAGES.apples },
    { id: '6', name: 'Pellets', amount: '', image: FOOD_IMAGES.pellets },
  ]);
  
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  // Generate local ID
  const generateLocalId = (): string => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  // Get meal order for sorting
  const getMealOrder = (mealType: string): number => {
    switch (mealType) {
      case 'Breakfast': return 1;
      case 'Lunch': return 2;
      case 'Dinner': return 3;
      default: return 4;
    }
  };

  // Sort meals by type
  const sortMealsByType = useCallback((meals: Meal[]): Meal[] => {
    return [...meals].sort((a, b) => {
      const orderA = getMealOrder(a.fd_meal_type);
      const orderB = getMealOrder(b.fd_meal_type);
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

  // Get food image based on food type
  const getFoodImage = (foodType: string) => {
    const lowerCaseFood = foodType.toLowerCase();
    switch (lowerCaseFood) {
      case 'hay': return FOOD_IMAGES.hay;
      case 'oats': return FOOD_IMAGES.oats;
      case 'grains': return FOOD_IMAGES.grains;
      case 'carrots': return FOOD_IMAGES.carrots;
      case 'apples': return FOOD_IMAGES.apples;
      case 'pellets': return FOOD_IMAGES.pellets;
      case 'beetpulp': return FOOD_IMAGES.beetpulp;
      case 'bran': return FOOD_IMAGES.bran;
      case 'alfalfa': return FOOD_IMAGES.alfalfa;
      case 'grass': return FOOD_IMAGES.grass;
      case 'saltblock': return FOOD_IMAGES.saltblock;
      case 'supplements': return FOOD_IMAGES.supplements;
      case 'chaff': return FOOD_IMAGES.chaff;
      case 'resolve': return FOOD_IMAGES.resolve;
      case 'dynavy': return FOOD_IMAGES.dynavy;
      case 'magnesium': return FOOD_IMAGES.magnesium;
      default: return FOOD_IMAGES.default;
    }
  };

  // Get food icon - now properly used in the UI
  const getFoodIcon = (foodType: string): string => {
    const lowerFoodType = foodType.toLowerCase();
    switch (lowerFoodType) {
      case 'hay': return 'leaf';
      case 'oats': return 'seedling';
      case 'grains': return 'seedling';
      case 'carrots': return 'carrot';
      case 'apples': return 'apple-alt';
      case 'pellets': return 'circle';
      case 'chaff': return 'seedling';
      case 'resolve': return 'capsules';
      case 'dynavy': return 'seedling';
      case 'magnesium': return 'capsules';
      case 'alfalfa': return 'leaf';
      case 'grass': return 'leaf';
      case 'beetpulp': return 'square';
      case 'bran': return 'seedling';
      case 'saltblock': return 'cube';
      case 'supplements': return 'capsules';
      default: return 'utensils';
    }
  };

  // Load today's feed records
  const loadTodaysFeedRecords = useCallback(async (userId: string): Promise<Meal[]> => {
    try {
      const url = `${API_BASE_URL}/get_feeding_schedule/?user_id=${encodeURIComponent(userId)}&horse_id=${encodeURIComponent(horseId)}`;
      console.log("Loading today's feed records:", url);

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.length > 0) {
          const meals = data.map((item: any) => ({
            id: item.fd_id || generateLocalId(),
            fd_food_type: item.fd_food_type,
            fd_qty: item.fd_qty,
            fd_time: item.fd_time,
            fd_meal_type: item.fd_meal_type,
            completed: item.completed || false,
            completed_at: item.completed_at,
            fd_id: item.fd_id,
            fed_by: item.fed_by,
            fed_by_id: item.fed_by_id,
            user_type: item.user_type,
          }));
          
          // Sort meals by type
          const sortedMeals = sortMealsByType(meals);
          return sortedMeals;
        }
      }
    } catch (error) {
      console.error('Error loading feed records:', error);
    }
    
    return [];
  }, [horseId, sortMealsByType]);

  // Parse time string to hours and minutes
  const parseTimeString = (timeString: string | undefined): { hours: number, minutes: number } | null => {
    if (!timeString) {
      console.warn('❌ Cannot parse undefined time string');
      return null;
    }
    
    try {
      const [time, period] = timeString.split(' ');
      if (!time) {
        console.warn('❌ Invalid time format:', timeString);
        return null;
      }
      
      const [hoursStr, minutesStr] = time.split(':');
      if (!hoursStr || !minutesStr) {
        console.warn('❌ Invalid time components:', timeString);
        return null;
      }
      
      let hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      
      if (isNaN(hours) || isNaN(minutes)) {
        console.warn('❌ Invalid time numbers:', timeString);
        return null;
      }
      
      if (period === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }
      
      console.log(`✅ Parsed time: ${timeString} -> ${hours}:${minutes}`);
      return { hours, minutes };
    } catch (error) {
      console.error('❌ Error parsing time string:', error, 'for time:', timeString);
      return null;
    }
  };

  // Get period emoji for notifications
  const getPeriodEmoji = (period: string): string => {
    switch (period) {
      case 'Breakfast': return '🌅';
      case 'Lunch': return '☀️';
      case 'Dinner': return '🌙';
      default: return '🍽️';
    }
  };

  // Get notification subtitle based on period
  const getNotificationSubtitle = (period: string): string => {
    switch (period) {
      case 'Breakfast': return 'Start the day with a nutritious meal!';
      case 'Lunch': return 'Midday feeding for sustained energy!';
      case 'Dinner': return 'Evening meal for a comfortable night!';
      default: return 'Time for feeding!';
    }
  };

  // Get motivational message for notification body
  const getMotivationalMessage = (period: string): string => {
    const messages = {
      Breakfast: [
        "A healthy breakfast for a great day ahead! 🐎",
        "Morning nutrition sets the tone for the day! 💪",
        "Perfect time for a energy-boosting meal! 🌟"
      ],
      Lunch: [
        "Stay energized with a midday meal! 🥕",
        "Lunch time for peak performance! 🏆",
        "Perfect timing for a nutritious break! ⏰"
      ],
      Dinner: [
        "Evening meal for a peaceful night! 🌜",
        "Wind down with a satisfying dinner! 🌙",
        "Final meal of the day! ✨"
      ]
    };
    
    const periodMessages = messages[period as keyof typeof messages] || [
      "Time for feeding care! 💕"
    ];
    return periodMessages[Math.floor(Math.random() * periodMessages.length)];
  };

  // Store last viewed feed time for automatic notifications
  const storeLastViewedFeedTime = useCallback(async (schedule: Meal[]): Promise<void> => {
    try {
      const lastViewedData = {
        horseId,
        horseName,
        schedule: schedule.map(meal => ({
          period: meal.fd_meal_type,
          time: meal.fd_time,
          food_type: meal.fd_food_type,
          amount: meal.fd_qty,
        })),
        lastUpdated: new Date().toISOString(),
      };
      
      await SecureStore.setItemAsync(`last_feed_schedule_${horseId}`, JSON.stringify(lastViewedData));
      console.log('Stored last viewed feed time for automatic notifications');
    } catch (error) {
      console.error('Error storing last viewed feed time:', error);
    }
  }, [horseId, horseName]);

  // Schedule automatic daily notifications based on last viewed feed time
  const scheduleAutomaticDailyNotifications = useCallback(async (): Promise<void> => {
    try {
      // Get the last stored feed schedule
      const storedData = await SecureStore.getItemAsync(`last_feed_schedule_${horseId}`);
      if (!storedData) {
        console.log('No stored feed schedule found for automatic notifications');
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
          notification.content.data?.type === 'auto_feed_reminder' && 
          notification.content.data?.horseId === horseId
        );
        
        for (const notification of autoNotifications) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }

        // Schedule new automatic notifications
        for (const meal of schedule) {
          const notificationTime = parseTimeString(meal.time);
          if (notificationTime) {
            const trigger: Notifications.DailyTriggerInput = {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour: notificationTime.hours,
              minute: notificationTime.minutes,
            };

            const periodEmoji = getPeriodEmoji(meal.period);
            const subtitle = getNotificationSubtitle(meal.period);
            const motivationalMessage = getMotivationalMessage(meal.period);

            await Notifications.scheduleNotificationAsync({
              content: {
                title: `${periodEmoji} ${meal.period} - ${horseName}`,
                subtitle: subtitle,
                body: `🍽️ ${meal.food_type} (${meal.amount})\n${motivationalMessage}`,
                data: { 
                  type: 'auto_feed_reminder',
                  horseId: horseId,
                  horseName: horseName,
                  period: meal.period,
                  food_type: meal.food_type,
                  amount: meal.amount,
                  time: meal.time,
                  notificationId: `auto_feed_${horseId}_${meal.period}_${Date.now()}`
                },
                sound: 'default',
                priority: 'high',
                badge: 1,
                ...(Platform.OS === 'ios' && {
                  categoryIdentifier: 'FEED_REMINDER',
                  threadIdentifier: `horse-feeding-${horseId}`,
                  summaryArgument: horseName,
                  relevanceScore: 1.0,
                }),
              },
              trigger,
            });

            console.log(`✅ Scheduled automatic ${meal.period} notification for ${notificationTime.hours}:${notificationTime.minutes}`);
          } else {
            console.warn(`❌ Could not parse time for automatic notification: ${meal.time}`);
          }
        }
      }
    } catch (error) {
      console.error('Error scheduling automatic daily notifications:', error);
    }
  }, [horseId, horseName]);

  // Schedule feed notifications
  const scheduleFeedNotifications = useCallback(async (schedule: Meal[]): Promise<void> => {
    try {
      // First, get all currently scheduled notifications
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`Currently have ${scheduledNotifications.length} scheduled notifications`);
      
      // Cancel only feed-related notifications for this horse
      const feedNotifications = scheduledNotifications.filter(notification => 
        (notification.content.data?.type === 'feed_reminder' || 
         notification.content.data?.type === 'auto_feed_reminder') && 
        notification.content.data?.horseId === horseId
      );
      
      if (feedNotifications.length > 0) {
        console.log(`Canceling ${feedNotifications.length} existing feed notifications for horse ${horseId}`);
        for (const notification of feedNotifications) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }

      // Store the current schedule for automatic daily notifications
      await storeLastViewedFeedTime(schedule);

      // Schedule new notifications for each feed schedule with improved design
      console.log(`Scheduling ${schedule.length} new feed notifications`);
      
      let successfullyScheduled = 0;
      
      for (const meal of schedule) {
        // Use the correct property names from the Meal type
        const notificationTime = parseTimeString(meal.fd_time);
        if (notificationTime) {
          const trigger: Notifications.DailyTriggerInput = {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: notificationTime.hours,
            minute: notificationTime.minutes,
          };

          const periodEmoji = getPeriodEmoji(meal.fd_meal_type);
          const subtitle = getNotificationSubtitle(meal.fd_meal_type);
          const motivationalMessage = getMotivationalMessage(meal.fd_meal_type);

          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `${periodEmoji} ${meal.fd_meal_type} - ${horseName}`,
              subtitle: subtitle,
              body: `🍽️ ${meal.fd_food_type} (${meal.fd_qty})\n${motivationalMessage}`,
              data: { 
                type: 'feed_reminder',
                horseId: horseId,
                horseName: horseName,
                period: meal.fd_meal_type,
                food_type: meal.fd_food_type,
                amount: meal.fd_qty,
                time: meal.fd_time,
                notificationId: `feed_${horseId}_${meal.fd_meal_type}_${Date.now()}`
              },
              sound: 'default',
              priority: 'high',
              badge: 1,
              ...(Platform.OS === 'ios' && {
                categoryIdentifier: 'FEED_REMINDER',
                threadIdentifier: `horse-feeding-${horseId}`,
                summaryArgument: horseName,
                relevanceScore: 1.0,
              }),
            },
            trigger,
          });

          console.log(`✅ Scheduled ${meal.fd_meal_type} notification for ${notificationTime.hours}:${notificationTime.minutes} (ID: ${notificationId})`);
          successfullyScheduled++;
        } else {
          console.warn(`❌ Could not parse time for ${meal.fd_meal_type}: ${meal.fd_time}`);
        }
      }

      // Verify scheduled notifications
      const finalScheduled = await Notifications.getAllScheduledNotificationsAsync();
      const feedScheduledCount = finalScheduled.filter(notification => 
        notification.content.data?.type === 'feed_reminder' && 
        notification.content.data?.horseId === horseId
      ).length;
      
      console.log(`✅ Successfully scheduled ${successfullyScheduled} feed notifications for horse ${horseId}`);
      console.log(`📊 Verified: ${feedScheduledCount} feed notifications currently scheduled`);
      
    } catch (error) {
      console.error('❌ Error scheduling notifications:', error);
    }
  }, [horseId, horseName, storeLastViewedFeedTime]);

  // Save schedule to database
  const saveScheduleToDatabase = async (schedule: Meal[]): Promise<boolean> => {
    if (!currentUser || !horseId) {
      console.error('Cannot save schedule: Missing user ID or horse ID');
      return false;
    }

    try {
      // Filter out completed meals
      const scheduleToSave = schedule
        .filter(meal => !meal.completed)
        .map(meal => ({
          time: meal.fd_time,
          food: meal.fd_food_type,
          amount: meal.fd_qty,
          meal_type: meal.fd_meal_type,
        }));

      const response = await fetch(`${API_BASE_URL}/save_feeding_schedule/`, {
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
        const result = await response.json();
        console.log('Feeding schedule saved to database. User type:', result.user_type);
        
        // Schedule notifications for the new feeding times
        await scheduleFeedNotifications(schedule);
        
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

  // Check if meal is completed (by anyone)
  const isMealCompleted = useCallback((mealType: string): boolean => {
    const existingMeal = feedingSchedule.find(meal => 
      meal.fd_meal_type === mealType && 
      meal.completed
    );
    return !!existingMeal;
  }, [feedingSchedule]);

  // Get completed meal info
  const getCompletedMealInfo = useCallback((mealType: string): { fed_by: string, user_type: string } | null => {
    const existingMeal = feedingSchedule.find(meal => 
      meal.fd_meal_type === mealType && 
      meal.completed
    );
    return existingMeal ? { 
      fed_by: existingMeal.fed_by || 'Unknown', 
      user_type: existingMeal.user_type || 'unknown' 
    } : null;
  }, [feedingSchedule]);

  // Check if all meals are completed
  const areAllMealsCompleted = useCallback((): boolean => {
    const mealTypes = ['Breakfast', 'Lunch', 'Dinner'];
    return mealTypes.every(mealType => isMealCompleted(mealType));
  }, [isMealCompleted]);

  // Get available meal types for adding new schedules
  const getAvailableMealTypes = useCallback((): ('Breakfast' | 'Lunch' | 'Dinner')[] => {
    const allMealTypes: ('Breakfast' | 'Lunch' | 'Dinner')[] = ['Breakfast', 'Lunch', 'Dinner'];
    
    return allMealTypes.filter(mealType => {
      // Check if this meal type is completed
      if (isMealCompleted(mealType)) {
        return false; // Cannot add schedule for completed meal types
      }
      
      // Check if there's already an existing schedule for this meal type
      const existingSchedule = feedingSchedule.find(meal => meal.fd_meal_type === mealType);
      if (existingSchedule) {
        return false; // Cannot add schedule for existing meal types
      }
      
      return true; // This meal type is available for new schedules
    });
  }, [feedingSchedule, isMealCompleted]);

  // Get scheduled meal types (for display purposes)
  const getScheduledMealTypes = useCallback((): string[] => {
    return feedingSchedule.map(meal => meal.fd_meal_type);
  }, [feedingSchedule]);

  // Initialize feed screen
  const initializeFeedScreen = useCallback(async (): Promise<void> => {
    if (isInitialized || !horseId) return;

    console.log("Initializing feed screen...");
    setIsLoading(true);
    
    try {
      const userId = await getCurrentUser();
      if (!userId) {
        console.error("No user ID found");
        return;
      }

      // Load today's feed records
      const todaysRecords = await loadTodaysFeedRecords(userId);
      
      console.log(`Loaded ${todaysRecords.length} feeding schedule items for today`);
      
      setFeedingSchedule(todaysRecords);
      setIsInitialized(true);
      
      // Schedule notifications for any existing schedules
      if (todaysRecords.length > 0) {
        const activeSchedules = todaysRecords.filter(meal => !meal.completed);
        if (activeSchedules.length > 0) {
          await scheduleFeedNotifications(activeSchedules);
        }
      }
      
      // Schedule automatic daily notifications based on last viewed time
      await scheduleAutomaticDailyNotifications();
      
    } catch (error: unknown) {
      console.error('Error initializing feed screen:', error);
      setFeedingSchedule([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    isInitialized, 
    horseId, 
    getCurrentUser, 
    loadTodaysFeedRecords, 
    scheduleFeedNotifications, 
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
      
      if (data.type === 'feed_reminder' || data.type === 'auto_feed_reminder') {
        console.log('Feed reminder notification tapped:', data);
        
        // Show a friendly message when notification is tapped
        Alert.alert(
          `${data.period} Feed Reminder`,
          `Remember to feed ${data.food_type} (${data.amount}) to ${data.horseName}`,
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
        await initializeFeedScreen();
      }
    };
    
    init();
    
    return () => {
      mounted = false;
    };
  }, [initializeFeedScreen, isInitialized]);

  // Refresh function
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    try {
      if (currentUser && horseId) {
        const todaysRecords = await loadTodaysFeedRecords(currentUser);
        setFeedingSchedule(todaysRecords);
        
        // Update notifications for active schedules
        const activeSchedules = todaysRecords.filter(meal => !meal.completed);
        if (activeSchedules.length > 0) {
          await scheduleFeedNotifications(activeSchedules);
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
    loadTodaysFeedRecords, 
    scheduleFeedNotifications, 
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

  // Handle mark as fed
  const handleMarkAsFed = async (meal: Meal): Promise<void> => {
    if (!currentUser) {
      Alert.alert('Error', 'User not found');
      return;
    }

    // Check if meal is already completed
    if (meal.completed) {
      const fedBy = meal.fed_by || 'someone';
      Alert.alert(
        'Already Fed',
        `This meal has already been fed by ${fedBy}.`,
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const now = new Date();
      const completedAt = now.toISOString();

      const response = await fetch(`${API_BASE_URL}/mark_meal_fed/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: currentUser,
          horse_id: horseId,
          fd_time: meal.fd_time,
          fd_meal_type: meal.fd_meal_type,
          fd_food_type: meal.fd_food_type,
          fd_qty: meal.fd_qty,
          completed_at: completedAt,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        if (result.already_fed) {
          Alert.alert(
            'Already Fed',
            result.error || `This meal has already been fed by ${result.fed_by}.`,
            [
              {
                text: 'Refresh',
                onPress: () => onRefresh()
              },
              { text: 'OK' }
            ]
          );
          await onRefresh();
          return;
        }
        
        console.error("Mark as fed error:", result);
        throw new Error(result.error || 'Failed to mark meal as fed');
      }

      console.log("Meal fed and saved to database:", result);

      // Update the local state to mark as completed with proper data from response
      const updatedSchedule = feedingSchedule.map(m =>
        m.id === meal.id 
          ? { 
              ...m, 
              completed: true, 
              completed_at: completedAt,
              fd_id: result.fd_id || meal.fd_id,
              fed_by: result.fed_by || 'You',
              user_type: result.user_type || 'op'
            }
          : m
      );
        
      setFeedingSchedule(sortMealsByType(updatedSchedule));
      
      // Cancel notification for this specific period since it's completed
      try {
        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
        const notificationToCancel = scheduledNotifications.find(notification => 
          (notification.content.data?.type === 'feed_reminder' || 
           notification.content.data?.type === 'auto_feed_reminder') && 
          notification.content.data?.horseId === horseId &&
          notification.content.data?.period === meal.fd_meal_type
        );
        
        if (notificationToCancel) {
          await Notifications.cancelScheduledNotificationAsync(notificationToCancel.identifier);
          console.log(`Cancelled notification for ${meal.fd_meal_type} period`);
        }
      } catch (error) {
        console.error('Error cancelling notification:', error);
      }
        
      Alert.alert('Success', `Meal fed to ${horseName} and recorded in database!`);
      
      // Refresh to get the latest data from server
      setTimeout(() => {
        onRefresh();
      }, 500);
      
    } catch (error: any) {
      console.error('Error marking meal as fed:', error);
      Alert.alert('Error', error.message || 'Failed to record feeding');
    }
  };

  // Handle add new schedule
  const handleAddNewSchedule = (): void => {
    // Check if all meals are completed
    if (areAllMealsCompleted()) {
      Alert.alert(
        'All Meals Completed',
        `All meals have been completed. You cannot add new schedules when all meals are already fed.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Get available meal types
    const availableMealTypes = getAvailableMealTypes();
    
    if (availableMealTypes.length === 0) {
      Alert.alert(
        'No Available Meal Types',
        `All meal types either have existing schedules or have been completed.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setFeedingTime({
      hour: '06',
      minute: '00',
      period: 'AM',
    });
    setMealType('');
    // REMOVED: Chaff, Resolve, Dynavy, Magnesium from the feedTypes array
    setFeedTypes([
      { id: '1', name: 'Hay', amount: '', image: FOOD_IMAGES.hay },
      { id: '2', name: 'Oats', amount: '', image: FOOD_IMAGES.oats },
      { id: '3', name: 'Grains', amount: '', image: FOOD_IMAGES.grains },
      { id: '4', name: 'Carrots', amount: '', image: FOOD_IMAGES.carrots },
      { id: '5', name: 'Apples', amount: '', image: FOOD_IMAGES.apples },
      { id: '6', name: 'Pellets', amount: '', image: FOOD_IMAGES.pellets },
    ]);
    setShowAddView(true);
  };

  // Handle edit meal
  const handleEdit = (meal: Meal): void => {
    if (meal.completed) {
      const fedBy = meal.fed_by || 'someone';
      Alert.alert(
        'Cannot Edit',
        `This meal was already fed by ${fedBy}. You cannot edit completed meals.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setEditingMeal(meal);
    const timeParts = meal.fd_time.split(' ');
    const time = timeParts[0].split(':');
    setFeedingTime({
      hour: time[0],
      minute: time[1],
      period: timeParts[1] || 'AM',
    });
    setMealType(meal.fd_meal_type as any);
          
    const resetFeedTypes = [
      { id: '1', name: 'Hay', amount: '', image: FOOD_IMAGES.hay },
      { id: '2', name: 'Oats', amount: '', image: FOOD_IMAGES.oats },
      { id: '3', name: 'Grains', amount: '', image: FOOD_IMAGES.grains },
      { id: '4', name: 'Carrots', amount: '', image: FOOD_IMAGES.carrots },
      { id: '5', name: 'Apples', amount: '', image: FOOD_IMAGES.apples },
      { id: '6', name: 'Pellets', amount: '', image: FOOD_IMAGES.pellets },
    ];
    
    const updatedFeedTypes = resetFeedTypes.map(feed => ({
      ...feed,
      amount: feed.name === meal.fd_food_type ? meal.fd_qty : ''
    }));
    
    setFeedTypes(updatedFeedTypes);
    setShowEditView(true);
  };

  // Handle delete meal
  const handleDeleteMeal = async (meal: Meal): Promise<void> => {
    if (meal.completed) {
      const fedBy = meal.fed_by || 'someone';
      Alert.alert(
        'Cannot Delete',
        `This meal has already been completed by ${fedBy} and cannot be deleted.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Delete Meal Schedule',
      `Are you sure you want to delete the ${meal.fd_meal_type} schedule? This will remove it from your daily schedule.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (meal.fd_id) {
                const dbSuccess = await deleteMealFromDatabase(meal.fd_id);
                if (!dbSuccess) {
                  Alert.alert('Error', 'Failed to delete meal from database');
                  return;
                }
              }

              const updatedSchedule = feedingSchedule.filter(m => m.id !== meal.id);
              setFeedingSchedule(sortMealsByType(updatedSchedule));
              
              // Update notifications - cancel the specific notification and reschedule remaining ones
              try {
                const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
                const notificationToCancel = scheduledNotifications.find(notification => 
                  (notification.content.data?.type === 'feed_reminder' || 
                   notification.content.data?.type === 'auto_feed_reminder') && 
                  notification.content.data?.horseId === horseId &&
                  notification.content.data?.period === meal.fd_meal_type
                );
                
                if (notificationToCancel) {
                  await Notifications.cancelScheduledNotificationAsync(notificationToCancel.identifier);
                  console.log(`Cancelled notification for ${meal.fd_meal_type}`);
                }
                
                // Reschedule remaining notifications to ensure they're properly set
                const activeSchedules = updatedSchedule.filter(m => !m.completed);
                if (activeSchedules.length > 0) {
                  await scheduleFeedNotifications(activeSchedules);
                }
              } catch (error) {
                console.error('Error updating notifications:', error);
              }
              
              Alert.alert('Success', `${meal.fd_meal_type} schedule deleted successfully`);
              
            } catch (error: any) {
              console.error('Error deleting meal:', error);
              Alert.alert('Error', 'Failed to delete meal');
            }
          }
        }
      ]
    );
  };

  // Delete meal from database
  const deleteMealFromDatabase = async (mealId: string): Promise<boolean> => {
    if (!currentUser) {
      console.error('Cannot delete meal: Missing user ID');
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/delete_feed_schedule/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: currentUser,
          fd_id: mealId,
        }),
      });

      if (response.ok) {
        console.log('Meal deleted from database successfully');
        return true;
      } else {
        const errorData = await response.json();
        console.error('Failed to delete meal from database:', errorData);
        return false;
      }
    } catch (error) {
      console.error('Error deleting meal from database:', error);
      return false;
    }
  };

  // Handle feed log navigation
  const handleFeedLog = (): void => {
    router.push('/HORSE_OPERATOR/Hfeedlog');
  };

  // Handle time change
  const handleTimeChange = (field: 'hour' | 'minute' | 'period', value: string): void => {
    setFeedingTime(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle amount change
  const handleAmountChange = (id: string, amount: string): void => {
    setFeedTypes(prev =>
      prev.map(feed =>
        feed.id === id ? { ...feed, amount } : feed
      )
    );
  };

  // Handle add feed type
  const handleAddFeedType = (): void => {
    Alert.prompt(
      'Add Feed Type',
      'Enter the name of the new feed type:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: (text?: string) => {
            if (text && text.trim()) {
              const newId = (feedTypes.length + 1).toString();
              setFeedTypes(prev => [
                ...prev,
                { id: newId, name: text.trim(), amount: '', image: FOOD_IMAGES.default }
              ]);
            }
          }
        }
      ]
    );
  };

  // Handle save new schedule
  const handleSaveNewSchedule = async (): Promise<void> => {
    const activeFeed = feedTypes.find(feed => feed.amount.trim() !== '');
          
    if (!activeFeed) {
      Alert.alert('Error', 'Please specify at least one feed type with an amount.');
      return;
    }

    if (!mealType) {
      Alert.alert('Error', 'Please select a meal type.');
      return;
    }
          
    try {
      const updatedTime = `${feedingTime.hour}:${feedingTime.minute} ${feedingTime.period}`;

      // Check if meal type is already completed
      if (isMealCompleted(mealType)) {
        const completedInfo = getCompletedMealInfo(mealType);
        Alert.alert(
          'Cannot Add Schedule',
          `This ${mealType} has already been completed by ${completedInfo?.fed_by}. You cannot add a new schedule for completed meals.`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Check if meal type already exists
      const existingMeal = feedingSchedule.find(meal => meal.fd_meal_type === mealType);
      if (existingMeal) {
        // Check if the existing meal is completed by anyone
        if (existingMeal.completed) {
          const fedBy = existingMeal.fed_by || 'someone';
          Alert.alert(
            'Meal Already Completed',
            `The ${mealType} schedule has already been completed by ${fedBy}. You cannot replace completed meals.`,
            [{ text: 'OK' }]
          );
          return;
        }

        Alert.alert(
          'Meal Type Exists',
          `A ${mealType} schedule already exists. Would you like to replace it?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Replace',
              onPress: async () => {
                const updatedSchedule = feedingSchedule.map(meal =>
                  meal.fd_meal_type === mealType
                    ? {
                        ...meal,
                        fd_time: updatedTime,
                        fd_food_type: activeFeed.name,
                        fd_qty: activeFeed.amount,
                        fd_meal_type: mealType,
                      }
                    : meal
                );
                
                setFeedingSchedule(sortMealsByType(updatedSchedule));
                setShowAddView(false);
                
                const success = await saveScheduleToDatabase(updatedSchedule);
                if (success) {
                  Alert.alert('Success', `${mealType} schedule updated for ${horseName}!`);
                } else {
                  Alert.alert('Warning', 'Schedule updated locally but failed to save to database');
                }
              }
            }
          ]
        );
        return;
      }

      const newMeal: Meal = {
        id: generateLocalId(),
        fd_time: updatedTime,
        fd_food_type: activeFeed.name,
        fd_qty: activeFeed.amount,
        fd_meal_type: mealType,
        completed: false,
      };

      const updatedSchedule = [...feedingSchedule, newMeal];
          
      setFeedingSchedule(sortMealsByType(updatedSchedule));
      setShowAddView(false);
      
      const success = await saveScheduleToDatabase(updatedSchedule);
      if (success) {
        Alert.alert('Success', `${mealType} schedule added for ${horseName}!`);
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
    const activeFeed = feedTypes.find(feed => feed.amount.trim() !== '');
          
    if (!activeFeed) {
      Alert.alert('Error', 'Please specify at least one feed type with an amount.');
      return;
    }
          
    if (!editingMeal || !currentUser) return;

    // Check if this meal is completed
    if (editingMeal.completed) {
      const fedBy = editingMeal.fed_by || 'someone';
      Alert.alert(
        'Cannot Edit',
        `This meal has already been completed by ${fedBy}. You cannot edit it.`,
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const updatedTime = `${feedingTime.hour}:${feedingTime.minute} ${feedingTime.period}`;

      const updatedSchedule = feedingSchedule.map(meal =>
        meal.id === editingMeal.id
          ? {
              ...meal,
              fd_time: updatedTime,
              fd_food_type: activeFeed.name,
              fd_qty: activeFeed.amount,
              fd_meal_type: mealType || editingMeal.fd_meal_type,
            }
          : meal
      );
          
      setFeedingSchedule(sortMealsByType(updatedSchedule));
      setShowEditView(false);
      
      const success = await saveScheduleToDatabase(updatedSchedule);
      if (success) {
        Alert.alert('Success', `Feeding schedule updated for ${horseName}!`);
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

  // Get meal icon
  const getMealIcon = (mealType: string): string => {
    switch (mealType) {
      case 'Breakfast': return 'sun';
      case 'Lunch': return 'cloud-sun';
      case 'Dinner': return 'moon';
      default: return 'utensils';
    }
  };

  // Get available meal types for display
  const availableMealTypes = getAvailableMealTypes();
  const scheduledMealTypes = getScheduledMealTypes();

  // Check if a meal type is already scheduled (for UI display)
  const isMealTypeScheduled = (mealType: string): boolean => {
    return scheduledMealTypes.includes(mealType);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text>Loading feeding schedule...</Text>
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
          <Text style={styles.headerTitle}>Edit {editingMeal?.fd_meal_type}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Meal Type</Text>
              <View style={styles.mealTypeContainer}>
                {(['Breakfast', 'Lunch', 'Dinner'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.mealTypeButton,
                      mealType === type && styles.mealTypeButtonSelected,
                      (isMealCompleted(type) || isMealTypeScheduled(type)) && styles.mealTypeButtonDisabled
                    ]}
                    onPress={() => {
                      if (isMealCompleted(type)) {
                        const completedInfo = getCompletedMealInfo(type);
                        Alert.alert(
                          'Cannot Select',
                          `This ${type} has been completed by ${completedInfo?.fed_by} and cannot be modified.`,
                          [{ text: 'OK' }]
                        );
                        return;
                      }
                      if (isMealTypeScheduled(type) && type !== editingMeal?.fd_meal_type) {
                        Alert.alert(
                          'Already Scheduled',
                          `A ${type} schedule already exists. You cannot have multiple schedules for the same meal type.`,
                          [{ text: 'OK' }]
                        );
                        return;
                      }
                      setMealType(type);
                    }}
                    disabled={isMealCompleted(type) || (isMealTypeScheduled(type) && type !== editingMeal?.fd_meal_type)}
                  >
                    <Text style={[
                      styles.mealTypeButtonText,
                      mealType === type && styles.mealTypeButtonTextSelected,
                      (isMealCompleted(type) || isMealTypeScheduled(type)) && styles.mealTypeButtonTextDisabled
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Feeding Time</Text>
              <View style={styles.timeInputContainer}>
                <TextInput
                  style={styles.timeInput}
                  value={feedingTime.hour}
                  onChangeText={(value) => handleTimeChange('hour', value)}
                  placeholder="HH"
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.timeSeparator}>:</Text>
                <TextInput
                  style={styles.timeInput}
                  value={feedingTime.minute}
                  onChangeText={(value) => handleTimeChange('minute', value)}
                  placeholder="MM"
                  keyboardType="numeric"
                  maxLength={2}
                />
                <TouchableOpacity 
                  style={styles.periodInput} 
                  onPress={() => setShowPeriodDropdown(true)}
                >
                  <Text style={styles.periodInputText}>{feedingTime.period}</Text>
                  <FontAwesome5 name="chevron-down" size={12} color="#64748B" />
                </TouchableOpacity>
              </View>
              
              <Modal
                visible={showPeriodDropdown}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowPeriodDropdown(false)}
              >
                <TouchableOpacity 
                  style={styles.modalOverlay} 
                  activeOpacity={1} 
                  onPress={() => setShowPeriodDropdown(false)}
                >
                  <View style={styles.dropdownContainer}>
                    <TouchableOpacity
                      style={[
                        styles.dropdownOption,
                        feedingTime.period === 'AM' && styles.dropdownOptionActive
                      ]}
                      onPress={() => {
                        handleTimeChange('period', 'AM');
                        setShowPeriodDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownOptionText,
                        feedingTime.period === 'AM' && styles.dropdownOptionTextActive
                      ]}>AM</Text>
                      {feedingTime.period === 'AM' && (
                        <FontAwesome5 name="check" size={14} color="#3B82F6" />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.dropdownOption,
                        feedingTime.period === 'PM' && styles.dropdownOptionActive
                      ]}
                      onPress={() => {
                        handleTimeChange('period', 'PM');
                        setShowPeriodDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownOptionText,
                        feedingTime.period === 'PM' && styles.dropdownOptionTextActive
                      ]}>PM</Text>
                      {feedingTime.period === 'PM' && (
                        <FontAwesome5 name="check" size={14} color="#3B82F6" />
                      )}
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Modal>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Feed Types & Amounts</Text>
              <View style={styles.feedTypesGrid}>
                {feedTypes.map((feed) => (
                  <View key={feed.id} style={styles.feedTypeCard}>
                    <View style={styles.feedTypeHeader}>
                      <Image 
                        source={{ uri: feed.image }} 
                        style={styles.feedImage}
                        resizeMode="cover"
                      />
                      <Text style={styles.feedTypeName}>{feed.name}</Text>
                    </View>
                    <TextInput
                      style={styles.amountInput}
                      value={feed.amount}
                      onChangeText={(value) => handleAmountChange(feed.id, value)}
                      placeholder="Amount"
                    />
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.addFeedButton} onPress={handleAddFeedType}>
                <Text style={styles.addFeedButtonText}>Add Feed Type</Text>
              </TouchableOpacity>
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
          <Text style={styles.headerTitle}>Add Feeding Schedule</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Meal Type</Text>
              <View style={styles.mealTypeContainer}>
                {(['Breakfast', 'Lunch', 'Dinner'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.mealTypeButton,
                      mealType === type && styles.mealTypeButtonSelected,
                      (isMealCompleted(type) || isMealTypeScheduled(type)) && styles.mealTypeButtonDisabled
                    ]}
                    onPress={() => {
                      if (isMealCompleted(type)) {
                        const completedInfo = getCompletedMealInfo(type);
                        Alert.alert(
                          'Cannot Select',
                          `This ${type} has been completed by ${completedInfo?.fed_by} and cannot be modified.`,
                          [{ text: 'OK' }]
                        );
                        return;
                      }
                      if (isMealTypeScheduled(type)) {
                        Alert.alert(
                          'Already Scheduled',
                          `A ${type} schedule already exists. You cannot have multiple schedules for the same meal type.`,
                          [{ text: 'OK' }]
                        );
                        return;
                      }
                      setMealType(type);
                    }}
                    disabled={isMealCompleted(type) || isMealTypeScheduled(type)}
                  >
                    <Text style={[
                      styles.mealTypeButtonText,
                      mealType === type && styles.mealTypeButtonTextSelected,
                      (isMealCompleted(type) || isMealTypeScheduled(type)) && styles.mealTypeButtonTextDisabled
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Feeding Time</Text>
              <View style={styles.timeInputContainer}>
                <TextInput
                  style={styles.timeInput}
                  value={feedingTime.hour}
                  onChangeText={(value) => handleTimeChange('hour', value)}
                  placeholder="HH"
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.timeSeparator}>:</Text>
                <TextInput
                  style={styles.timeInput}
                  value={feedingTime.minute}
                  onChangeText={(value) => handleTimeChange('minute', value)}
                  placeholder="MM"
                  keyboardType="numeric"
                  maxLength={2}
                />
                <TouchableOpacity 
                  style={styles.periodInput} 
                  onPress={() => setShowPeriodDropdown(true)}
                >
                  <Text style={styles.periodInputText}>{feedingTime.period}</Text>
                  <FontAwesome5 name="chevron-down" size={12} color="#64748B" />
                </TouchableOpacity>
              </View>
              
              <Modal
                visible={showPeriodDropdown}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowPeriodDropdown(false)}
              >
                <TouchableOpacity 
                  style={styles.modalOverlay} 
                  activeOpacity={1} 
                  onPress={() => setShowPeriodDropdown(false)}
                >
                  <View style={styles.dropdownContainer}>
                    <TouchableOpacity
                      style={[
                        styles.dropdownOption,
                        feedingTime.period === 'AM' && styles.dropdownOptionActive
                      ]}
                      onPress={() => {
                        handleTimeChange('period', 'AM');
                        setShowPeriodDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownOptionText,
                        feedingTime.period === 'AM' && styles.dropdownOptionTextActive
                      ]}>AM</Text>
                      {feedingTime.period === 'AM' && (
                        <FontAwesome5 name="check" size={14} color="#3B82F6" />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.dropdownOption,
                        feedingTime.period === 'PM' && styles.dropdownOptionActive
                      ]}
                      onPress={() => {
                        handleTimeChange('period', 'PM');
                        setShowPeriodDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownOptionText,
                        feedingTime.period === 'PM' && styles.dropdownOptionTextActive
                      ]}>PM</Text>
                      {feedingTime.period === 'PM' && (
                        <FontAwesome5 name="check" size={14} color="#3B82F6" />
                      )}
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Modal>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Feed Types & Amounts</Text>
              <View style={styles.feedTypesGrid}>
                {feedTypes.map((feed) => (
                  <View key={feed.id} style={styles.feedTypeCard}>
                    <View style={styles.feedTypeHeader}>
                      <Image 
                        source={{ uri: feed.image }} 
                        style={styles.feedImage}
                        resizeMode="cover"
                      />
                      <Text style={styles.feedTypeName}>{feed.name}</Text>
                    </View>
                    <TextInput
                      style={styles.amountInput}
                      value={feed.amount}
                      onChangeText={(value) => handleAmountChange(feed.id, value)}
                      placeholder="Amount"
                    />
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.addFeedButton} onPress={handleAddFeedType}>
                <Text style={styles.addFeedButtonText}>Add Feed Type</Text>
              </TouchableOpacity>
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
              !mealType && styles.saveButtonDisabled
            ]} 
            onPress={handleSaveNewSchedule}
            disabled={!mealType}
          >
            <Text style={styles.saveButtonText}>Add Schedule</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main Feed List View
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/HORSE_OPERATOR/horse')} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <FontAwesome5 name="horse-head" size={20} color="#fff" />
          <Text style={styles.headerTitle}>{horseName} Feeds</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.feedLogButton} onPress={handleFeedLog}>
            <FontAwesome5 name="clipboard-list" size={14} color="#fff" />
            <Text style={styles.feedLogText}>Log</Text>
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
            colors={['#CD853F']}
            tintColor="#CD853F"
          />
        }
      >
        <View style={styles.content}>
          {areAllMealsCompleted() && (
            <View style={styles.allCompletedAlert}>
              <FontAwesome5 name="check-circle" size={16} color="#fff" />
              <Text style={styles.allCompletedAlertText}>
                All meals have been completed today.
              </Text>
            </View>
          )}

          {feedingSchedule.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome5 name="utensils" size={64} color="#E2E8F0" />
              <Text style={styles.emptyStateTitle}>No feeding schedule found</Text>
              <Text style={styles.emptyStateText}>
                Add your first feeding schedule to get started.
              </Text>
              <TouchableOpacity style={styles.addFirstScheduleButton} onPress={handleAddNewSchedule}>
                <FontAwesome5 name="plus" size={16} color="#fff" />
                <Text style={styles.addFirstScheduleButtonText}>Add New Feeding Schedule</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {feedingSchedule.map((meal) => (
                <View key={meal.id} style={[
                  styles.mealCard,
                  meal.completed && styles.lockedMealCard
                ]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.mealInfo}>
                      <View style={styles.mealTitleRow}>
                        <FontAwesome5 
                          name={getMealIcon(meal.fd_meal_type)} 
                          size={18} 
                          color="#CD853F" 
                        />
                        <Text style={styles.mealTitle}>{meal.fd_meal_type}</Text>
                      </View>
                      <Text style={styles.mealTime}>{meal.fd_time}</Text>
                    </View>
                    <View style={styles.mealActions}>
                      {!meal.completed && (
                        <>
                          <TouchableOpacity 
                            style={styles.editButton}
                            onPress={() => handleEdit(meal)}
                          >
                            <FontAwesome5 name="edit" size={14} color="#3B82F6" />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.deleteButton}
                            onPress={() => handleDeleteMeal(meal)}
                          >
                            <FontAwesome5 name="trash" size={14} color="#EF4444" />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <View style={styles.feedInfo}>
                      <View style={styles.feedInfoContainer}>
                        <Image 
                          source={{ uri: getFoodImage(meal.fd_food_type) }} 
                          style={styles.foodImage}
                          resizeMode="cover"
                        />
                        <View style={styles.feedTextContainer}>
                          <View style={styles.feedTypeRow}>
                            <FontAwesome5 
                              name={getFoodIcon(meal.fd_food_type)} 
                              size={16} 
                              color="#CD853F" 
                              style={styles.foodTypeIcon}
                            />
                            <Text style={styles.feedType}>{meal.fd_food_type}</Text>
                          </View>
                          <Text style={styles.feedAmount}>{meal.fd_qty}</Text>
                        </View>
                      </View>
                    </View>

                    {meal.completed ? (
                      <View style={styles.completedSection}>
                        <View style={styles.completedStatus}>
                          <View style={styles.completedIconContainer}>
                            <FontAwesome5 name="check" size={14} color="#fff" />
                          </View>
                          <Text style={styles.completedText}>Fed</Text>
                        </View>
                        {meal.fed_by && (
                          <View style={styles.fedByContainer}>
                            <FontAwesome5 name="user" size={12} color="#6B7280" />
                            <Text style={styles.fedByText}>Fed by: {meal.fed_by}</Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.markFedButton}
                        onPress={() => handleMarkAsFed(meal)}
                      >
                        <Text style={styles.markFedButtonText}>
                          Mark as Fed
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}

              {availableMealTypes.length > 0 && (
                <TouchableOpacity style={styles.addScheduleButton} onPress={handleAddNewSchedule}>
                  <Text style={styles.addScheduleButtonText}>Add Feeding Schedule</Text>
                </TouchableOpacity>
              )}
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
    backgroundColor: '#CD853F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#CD853F',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    marginTop: 10,
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
  feedLogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    marginRight: 8,
  },
  feedLogText: {
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
  mealCard: {
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
  lockedMealCard: {
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
  mealInfo: {
    flex: 1,
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  mealTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginLeft: 8,
  },
  mealTime: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  mealActions: {
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
  feedInfo: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  feedInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
  },
  feedTextContainer: {
    flex: 1,
  },
  feedTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  foodTypeIcon: {
    marginRight: 8,
  },
  feedType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
  },
  feedAmount: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
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
  fedByContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fedByText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 8,
  },
  markFedButton: {
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
  markFedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  addScheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#CD853F',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 20,
    marginBottom: 5,
    shadowColor: '#CD853F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  addScheduleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
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
  mealTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  mealTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CD853F',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  mealTypeButtonSelected: {
    backgroundColor: '#CD853F',
    borderColor: '#CD853F',
  },
  mealTypeButtonDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  mealTypeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CD853F',
  },
  mealTypeButtonTextSelected: {
    color: '#FFFFFF',
  },
  mealTypeButtonTextDisabled: {
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
  periodInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    width: 90,
    marginLeft: 15,
  },
  periodInputText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  dropdownOptionActive: {
    backgroundColor: '#EFF6FF',
  },
  dropdownOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  dropdownOptionTextActive: {
    color: '#3B82F6',
  },
  feedTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  feedTypeCard: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  feedTypeHeader: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 12,
  },
  feedImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginBottom: 8,
  },
  feedTypeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  amountInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '500',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    color: '#334155',
    textAlign: 'center',
  },
  addFeedButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  addFeedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
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

export default FeedScreen;