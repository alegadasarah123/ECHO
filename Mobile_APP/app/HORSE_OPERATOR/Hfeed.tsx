// HORSE_OPERATOR/Hfeed.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { Checkbox } from 'expo-checkbox';

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

type Horse = {
  id: string;
  name: string;
  selected?: boolean;
  is_deceased?: boolean;
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

const API_BASE_URL = "http://192.168.101.4:8000/api/horse_operator"

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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isEditingFromSettings, setIsEditingFromSettings] = useState(false);
  const [editingMealFromSettings, setEditingMealFromSettings] = useState<Meal | null>(null);
  
  // New state for horse selection
  const [availableHorses, setAvailableHorses] = useState<Horse[]>([]);
  const [selectedHorses, setSelectedHorses] = useState<Horse[]>([]);
  const [selectAllHorses, setSelectAllHorses] = useState(false);
  const [horseSelectionMode, setHorseSelectionMode] = useState<'single' | 'multiple'>('single');

  // Use refs to avoid dependencies in callbacks
  const selectedHorsesRef = useRef<Horse[]>([]);
  const horseIdRef = useRef<string>(horseId);
  const currentUserRef = useRef<string>('');
  const horseNameRef = useRef<string>(horseName);
  const feedingScheduleRef = useRef<Meal[]>([]);

  // Update refs when state changes
  useEffect(() => {
    selectedHorsesRef.current = selectedHorses;
  }, [selectedHorses]);

  useEffect(() => {
    horseIdRef.current = horseId;
  }, [horseId]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    horseNameRef.current = horseName;
  }, [horseName]);

  useEffect(() => {
    feedingScheduleRef.current = feedingSchedule;
  }, [feedingSchedule]);

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

  // Sort meals by type - stable function
  const sortMealsByType = useCallback((meals: Meal[]): Meal[] => {
    return [...meals].sort((a, b) => {
      const orderA = getMealOrder(a.fd_meal_type);
      const orderB = getMealOrder(b.fd_meal_type);
      return orderA - orderB;
    });
  }, []);

  // Get current user - memoized with useCallback
  const getCurrentUser = useCallback(async (): Promise<string | null> => {
    if (currentUserRef.current) return currentUserRef.current;
    
    try {
      const storedUser = await SecureStore.getItemAsync("user_data");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const id = parsed.user_id || parsed.id;
        if (id) {
          console.log("Loaded user_id from storage:", id);
          setCurrentUser(id);
          currentUserRef.current = id;
          return id;
        }
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
    return null;
  }, []);

  // Filter out deceased horses
  const filterOutDeceasedHorses = (horses: Horse[]): Horse[] => {
    return horses.filter(horse => !horse.is_deceased);
  };

  // Load available horses from API - Filter out deceased horses
  const loadAvailableHorses = useCallback(async (): Promise<void> => {
    try {
      const userId = await getCurrentUser();
      if (!userId) return;

      // Fetch horses from API
      const response = await fetch(`${API_BASE_URL}/get_horses/?user_id=${encodeURIComponent(userId)}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && Array.isArray(data)) {
          // Filter out deceased horses
          const aliveHorses = data.filter((horse: any) => 
            !horse.is_deceased && horse.horse_status !== 'deceased'
          );
          
          const horses = aliveHorses.map((horse: any) => ({
            id: horse.horse_id,
            name: horse.horse_name,
            selected: false,
            is_deceased: horse.is_deceased || horse.horse_status === 'deceased'
          }));
          
          setAvailableHorses(horses);
          
          // Auto-select current horse if it exists in the list
          if (horseIdRef.current) {
            const currentHorseExists = horses.some((h: Horse) => h.id === horseIdRef.current);
            
            if (currentHorseExists) {
              const updatedHorses = horses.map((h: Horse) => ({
                ...h,
                selected: h.id === horseIdRef.current
              }));
              setAvailableHorses(updatedHorses);
              const selected = updatedHorses.filter((h: Horse) => h.selected);
              setSelectedHorses(selected);
              selectedHorsesRef.current = selected;
            } else {
              // If current horse not found (might be deceased), select first horse
              if (horses.length > 0) {
                const updatedHorses = horses.map((h: Horse, index: number) => ({
                  ...h,
                  selected: index === 0
                }));
                setAvailableHorses(updatedHorses);
                const selected = updatedHorses.filter((h: Horse) => h.selected);
                setSelectedHorses(selected);
                selectedHorsesRef.current = selected;
              }
            }
          }
        } else {
          // Fallback mock data
          const mockHorses: Horse[] = [
            { id: horseIdRef.current, name: horseNameRef.current, selected: true, is_deceased: false },
            { id: '2', name: 'Spirit', selected: false, is_deceased: false },
            { id: '3', name: 'Thunder', selected: false, is_deceased: false },
            { id: '4', name: 'Shadow', selected: false, is_deceased: true },
            { id: '5', name: 'Daisy', selected: false, is_deceased: false },
          ];
          
          const aliveMockHorses = filterOutDeceasedHorses(mockHorses);
          setAvailableHorses(aliveMockHorses);
          const selected = aliveMockHorses.filter((h: Horse) => h.selected);
          setSelectedHorses(selected);
          selectedHorsesRef.current = selected;
        }
      } else {
        throw new Error('Failed to fetch horses');
      }
    } catch (error) {
      console.error('Error loading available horses:', error);
      
      // Fallback mock data on error
      const mockHorses: Horse[] = [
        { id: horseIdRef.current, name: horseNameRef.current, selected: true, is_deceased: false },
        { id: '2', name: 'Spirit', selected: false, is_deceased: false },
        { id: '3', name: 'Thunder', selected: false, is_deceased: false },
        { id: '4', name: 'Shadow', selected: false, is_deceased: true },
        { id: '5', name: 'Daisy', selected: false, is_deceased: false },
      ];
      
      const aliveMockHorses = filterOutDeceasedHorses(mockHorses);
      setAvailableHorses(aliveMockHorses);
      const selected = aliveMockHorses.filter((h: Horse) => h.selected);
      setSelectedHorses(selected);
      selectedHorsesRef.current = selected;
    }
  }, [getCurrentUser]);

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
      const url = `${API_BASE_URL}/get_feeding_schedule/?user_id=${encodeURIComponent(userId)}&horse_id=${encodeURIComponent(horseIdRef.current)}`;
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
  }, [sortMealsByType]);

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
        horseId: horseIdRef.current,
        horseName: horseNameRef.current,
        schedule: schedule.map(meal => ({
          period: meal.fd_meal_type,
          time: meal.fd_time,
          food_type: meal.fd_food_type,
          amount: meal.fd_qty,
        })),
        lastUpdated: new Date().toISOString(),
      };
      
      await SecureStore.setItemAsync(`last_feed_schedule_${horseIdRef.current}`, JSON.stringify(lastViewedData));
      console.log('Stored last viewed feed time for automatic notifications');
    } catch (error) {
      console.error('Error storing last viewed feed time:', error);
    }
  }, []);

  // Schedule automatic daily notifications based on last viewed feed time
  const scheduleAutomaticDailyNotifications = useCallback(async (): Promise<void> => {
    try {
      // Get the last stored feed schedule
      const storedData = await SecureStore.getItemAsync(`last_feed_schedule_${horseIdRef.current}`);
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
          notification.content.data?.horseId === horseIdRef.current
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
                title: `${periodEmoji} ${meal.period} - ${horseNameRef.current}`,
                subtitle: subtitle,
                body: `🍽️ ${meal.food_type} (${meal.amount})\n${motivationalMessage}`,
                data: { 
                  type: 'auto_feed_reminder',
                  horseId: horseIdRef.current,
                  horseName: horseNameRef.current,
                  period: meal.period,
                  food_type: meal.food_type,
                  amount: meal.amount,
                  time: meal.time,
                },
                sound: 'default',
                priority: 'high',
                badge: 1,
                ...(Platform.OS === 'ios' && {
                  categoryIdentifier: 'FEED_REMINDER',
                  threadIdentifier: `horse-feeding-${horseIdRef.current}`,
                  summaryArgument: horseNameRef.current,
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
  }, []);

  // Schedule feed notifications
  const scheduleFeedNotifications = useCallback(async (schedule: Meal[], horses: Horse[] = []): Promise<void> => {
    try {
      // First, get all currently scheduled notifications
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`Currently have ${scheduledNotifications.length} scheduled notifications`);
      
      // Cancel only feed-related notifications for selected horses
      const horseIds = horses.length > 0 ? horses.map(h => h.id) : [horseIdRef.current];
      const feedNotifications = scheduledNotifications.filter(notification => 
        (notification.content.data?.type === 'feed_reminder' || 
         notification.content.data?.type === 'auto_feed_reminder') && 
        horseIds.includes(notification.content.data?.horseId as string)
      );
      
      if (feedNotifications.length > 0) {
        console.log(`Canceling ${feedNotifications.length} existing feed notifications`);
        for (const notification of feedNotifications) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }

      // Store the current schedule for automatic daily notifications
      await storeLastViewedFeedTime(schedule);

      // Schedule new notifications for each feed schedule with improved design
      console.log(`Scheduling ${schedule.length} new feed notifications for ${horses.length} horses`);
      
      let successfullyScheduled = 0;
      
      for (const meal of schedule) {
        const notificationTime = parseTimeString(meal.fd_time);
        if (notificationTime) {
          // Schedule for each selected horse
          for (const horse of horses) {
            const trigger: Notifications.DailyTriggerInput = {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour: notificationTime.hours,
              minute: notificationTime.minutes,
            };

            const periodEmoji = getPeriodEmoji(meal.fd_meal_type);
            const subtitle = getNotificationSubtitle(meal.fd_meal_type);
            const motivationalMessage = getMotivationalMessage(meal.fd_meal_type);

            await Notifications.scheduleNotificationAsync({
              content: {
                title: `${periodEmoji} ${meal.fd_meal_type} - ${horse.name}`,
                subtitle: subtitle,
                body: `🍽️ ${meal.fd_food_type} (${meal.fd_qty})\n${motivationalMessage}`,
                data: { 
                  type: 'feed_reminder',
                  horseId: horse.id,
                  horseName: horse.name,
                  period: meal.fd_meal_type,
                  food_type: meal.fd_food_type,
                  amount: meal.fd_qty,
                  time: meal.fd_time,
                },
                sound: 'default',
                priority: 'high',
                badge: 1,
                ...(Platform.OS === 'ios' && {
                  categoryIdentifier: 'FEED_REMINDER',
                  threadIdentifier: `horse-feeding-${horse.id}`,
                  summaryArgument: horse.name,
                  relevanceScore: 1.0,
                }),
              },
              trigger,
            });

            console.log(`✅ Scheduled ${meal.fd_meal_type} notification for ${horse.name} at ${notificationTime.hours}:${notificationTime.minutes}`);
            successfullyScheduled++;
          }
        } else {
          console.warn(`❌ Could not parse time for ${meal.fd_meal_type}: ${meal.fd_time}`);
        }
      }

      console.log(`✅ Successfully scheduled ${successfullyScheduled} feed notifications`);
      
    } catch (error) {
      console.error('❌ Error scheduling notifications:', error);
    }
  }, [storeLastViewedFeedTime]);

  // Save schedule to database permanently - UPDATED TO HANDLE EDITS
  const saveScheduleToDatabase = async (schedule: Meal[], horses: Horse[] = [], isEdit: boolean = false, mealToUpdate?: Meal): Promise<boolean> => {
    if (!currentUserRef.current) {
      console.error('Cannot save schedule: Missing user ID');
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
          fd_id: meal.fd_id, // Include fd_id for updates
        }));

      // Use different endpoint for edits vs new schedules
      const endpoint = isEdit ? 'update_feeding_schedule' : 'save_feeding_schedule';
      const requestBody: any = {
        user_id: currentUserRef.current,
        horse_id: horseIdRef.current, // Sending the current horse ID
        schedule: scheduleToSave,
      };

      // For edits, include the specific meal to update
      if (isEdit && mealToUpdate) {
        requestBody.fd_id = mealToUpdate.fd_id;
        requestBody.meal_type = mealToUpdate.fd_meal_type;
      }

      const response = await fetch(`${API_BASE_URL}/${endpoint}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Feeding schedule saved to database:', result);
        
        // Schedule notifications for the new feeding times
        await scheduleFeedNotifications(schedule, horses);
        
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
    const existingMeal = feedingScheduleRef.current.find(meal => 
      meal.fd_meal_type === mealType && 
      meal.completed
    );
    return !!existingMeal;
  }, []);

  // Get completed meal info
  const getCompletedMealInfo = useCallback((mealType: string): { fed_by: string, user_type: string } | null => {
    const existingMeal = feedingScheduleRef.current.find(meal => 
      meal.fd_meal_type === mealType && 
      meal.completed
    );
    return existingMeal ? { 
      fed_by: existingMeal.fed_by || 'Unknown', 
      user_type: existingMeal.user_type || 'unknown' 
    } : null;
  }, []);

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
      const existingSchedule = feedingScheduleRef.current.find(meal => meal.fd_meal_type === mealType);
      if (existingSchedule) {
        return false; // Cannot add schedule for existing meal types
      }
      
      return true; // This meal type is available for new schedules
    });
  }, [isMealCompleted]);

  // Get scheduled meal types (for display purposes)
  const getScheduledMealTypes = useCallback((): string[] => {
    return feedingScheduleRef.current.map(meal => meal.fd_meal_type);
  }, []);

  // Initialize feed screen
  const initializeFeedScreen = useCallback(async (): Promise<void> => {
    if (isInitialized || !horseIdRef.current) return;

    console.log("Initializing feed screen...");
    setIsLoading(true);
    
    try {
      const userId = await getCurrentUser();
      if (!userId) {
        console.error("No user ID found");
        return;
      }

      // Load available horses
      await loadAvailableHorses();

      // Load today's feed records
      const todaysRecords = await loadTodaysFeedRecords(userId);
      
      console.log(`Loaded ${todaysRecords.length} feeding schedule items for today`);
      
      setFeedingSchedule(todaysRecords);
      setIsInitialized(true);
      
      // Schedule notifications for any existing schedules
      if (todaysRecords.length > 0) {
        const activeSchedules = todaysRecords.filter(meal => !meal.completed);
        if (activeSchedules.length > 0) {
          await scheduleFeedNotifications(activeSchedules, selectedHorsesRef.current);
        }
      }
      
      // Schedule automatic daily notifications based on last viewed time
      await scheduleAutomaticDailyNotifications();
      
    } catch (error) {
      console.error('Error initializing feed screen:', error);
      setFeedingSchedule([]);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, getCurrentUser, loadAvailableHorses, loadTodaysFeedRecords, scheduleFeedNotifications, scheduleAutomaticDailyNotifications]);

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

  // Initialize once on mount
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
      const userId = await getCurrentUser();
      if (userId && horseIdRef.current) {
        const todaysRecords = await loadTodaysFeedRecords(userId);
        setFeedingSchedule(todaysRecords);
        
        // Update notifications for active schedules
        const activeSchedules = todaysRecords.filter(meal => !meal.completed);
        if (activeSchedules.length > 0) {
          await scheduleFeedNotifications(activeSchedules, selectedHorsesRef.current);
        }
        
        // Schedule automatic daily notifications
        await scheduleAutomaticDailyNotifications();
        
        // Load available horses
        await loadAvailableHorses();
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [getCurrentUser, loadTodaysFeedRecords, scheduleFeedNotifications, scheduleAutomaticDailyNotifications, loadAvailableHorses]);

  // Focus effect
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      
      const refreshData = async () => {
        if (mounted && currentUserRef.current && isInitialized) {
          await onRefresh();
        }
      };
      
      refreshData();
      
      return () => {
        mounted = false;
      };
    }, [isInitialized, onRefresh])
  );

  // Handle mark as fed
  const handleMarkAsFed = async (meal: Meal): Promise<void> => {
    if (!currentUserRef.current) {
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
          user_id: currentUserRef.current,
          horse_id: horseIdRef.current,
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
          notification.content.data?.horseId === horseIdRef.current &&
          notification.content.data?.period === meal.fd_meal_type
        );
        
        if (notificationToCancel) {
          await Notifications.cancelScheduledNotificationAsync(notificationToCancel.identifier);
          console.log(`Cancelled notification for ${meal.fd_meal_type} period`);
        }
      } catch (error) {
        console.error('Error cancelling notification:', error);
      }
        
      Alert.alert('Success', `Meal fed to ${horseNameRef.current} and recorded in database!`);
      
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

    // Check if meal type and time are set
    if (!mealType) {
      Alert.alert(
        'Meal Type Required',
        'Please set a meal type first using the settings button below.',
        [{ text: 'OK' }]
      );
      return;
    }

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
      Alert.alert(
        'Meal Type Exists',
        `A ${mealType} schedule already exists. Please edit or delete the existing schedule first.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Reset feed types
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
    setMealType(meal.fd_meal_type as any);
    
    // Set time from existing meal
    const timeParts = meal.fd_time.split(' ');
    const time = timeParts[0].split(':');
    setFeedingTime({
      hour: time[0],
      minute: time[1],
      period: timeParts[1] || 'AM',
    });
          
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
                  notification.content.data?.horseId === horseIdRef.current &&
                  notification.content.data?.period === meal.fd_meal_type
                );
                
                if (notificationToCancel) {
                  await Notifications.cancelScheduledNotificationAsync(notificationToCancel.identifier);
                  console.log(`Cancelled notification for ${meal.fd_meal_type}`);
                }
                
                // Reschedule remaining notifications to ensure they're properly set
                const activeSchedules = updatedSchedule.filter(m => !m.completed);
                if (activeSchedules.length > 0) {
                  await scheduleFeedNotifications(activeSchedules, selectedHorsesRef.current);
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
    if (!currentUserRef.current) {
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
          user_id: currentUserRef.current,
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
      Alert.alert('Error', 'Please select a meal type in settings first.');
      return;
    }

    if (selectedHorses.length === 0) {
      Alert.alert('Error', 'Please select at least one horse in settings.');
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
                
                const success = await saveScheduleToDatabase(updatedSchedule, selectedHorses, true, existingMeal);
                if (success) {
                  Alert.alert('Success', `${mealType} schedule updated for selected horses!`);
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
      
      const success = await saveScheduleToDatabase(updatedSchedule, selectedHorses, false);
      if (success) {
        Alert.alert('Success', `${mealType} schedule added for selected horses!`);
      } else {
        Alert.alert('Warning', 'Schedule added locally but failed to save to database');
      }
    } catch (error) {
      console.error('Error saving new schedule:', error);
      Alert.alert('Error', 'Failed to save new schedule');
    }
  };

  // Handle save changes - UPDATED TO SAVE TO DATABASE
  const handleSaveChanges = async (): Promise<void> => {
    const activeFeed = feedTypes.find(feed => feed.amount.trim() !== '');
          
    if (!activeFeed) {
      Alert.alert('Error', 'Please specify at least one feed type with an amount.');
      return;
    }
          
    if (!editingMeal || !currentUserRef.current) return;

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
      
      // Save to database with isEdit flag set to true
      const success = await saveScheduleToDatabase(updatedSchedule, selectedHorses, true, editingMeal);
      if (success) {
        Alert.alert('Success', `Feeding schedule updated for selected horses!`);
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

  // Handle open settings modal
  const handleOpenSettingsModal = (): void => {
    setShowSettingsModal(true);
  };

  // Handle close settings modal
  const handleCloseSettingsModal = (): void => {
    setShowSettingsModal(false);
    setIsEditingFromSettings(false);
    setEditingMealFromSettings(null);
  };

  // Handle horse selection mode change
  const handleHorseSelectionModeChange = (mode: 'single' | 'multiple'): void => {
    setHorseSelectionMode(mode);
    
    if (mode === 'single') {
      // If switching to single mode and more than one horse is selected, keep only the first selected
      if (selectedHorses.length > 1) {
        const firstSelected = selectedHorses[0];
        const updatedHorses = availableHorses.map(horse => ({
          ...horse,
          selected: horse.id === firstSelected.id
        }));
        setAvailableHorses(updatedHorses);
        setSelectedHorses([firstSelected]);
        setSelectAllHorses(false);
      }
    }
  };

  // Handle select/deselect horse
  const handleToggleHorse = (horseId: string): void => {
    const updatedHorses = availableHorses.map(horse => {
      if (horse.id === horseId) {
        const newSelected = !horse.selected;
        
        // If single mode and selecting a new horse, deselect all others
        if (horseSelectionMode === 'single' && newSelected) {
          return { ...horse, selected: true };
        }
        return { ...horse, selected: newSelected };
      }
      
      // In single mode, deselect all other horses when selecting one
      if (horseSelectionMode === 'single') {
        return { ...horse, selected: false };
      }
      
      return horse;
    });
    
    setAvailableHorses(updatedHorses);
    const newSelectedHorses = updatedHorses.filter(h => h.selected);
    setSelectedHorses(newSelectedHorses);
    selectedHorsesRef.current = newSelectedHorses;
    
    // Update select all state
    setSelectAllHorses(newSelectedHorses.length === availableHorses.length);
  };

  // Handle select all horses
  const handleSelectAllHorses = (): void => {
    const newSelectAll = !selectAllHorses;
    setSelectAllHorses(newSelectAll);
    
    if (newSelectAll) {
      // Select all horses
      const updatedHorses = availableHorses.map(horse => ({
        ...horse,
        selected: true
      }));
      setAvailableHorses(updatedHorses);
      setSelectedHorses(updatedHorses);
      selectedHorsesRef.current = updatedHorses;
    } else {
      // Deselect all horses
      const updatedHorses = availableHorses.map(horse => ({
        ...horse,
        selected: false
      }));
      setAvailableHorses(updatedHorses);
      setSelectedHorses([]);
      selectedHorsesRef.current = [];
    }
  };

  // Handle apply settings - NEW FUNCTION TO SAVE TIME CHANGES
  const handleApplySettings = (): void => {
    if (!mealType) {
      Alert.alert('Missing Setting', 'Please select a meal type before proceeding.');
      return;
    }

    if (selectedHorses.filter(h => !h.is_deceased).length === 0) {
      Alert.alert('Missing Setting', 'Please select at least one alive horse before proceeding.');
      return;
    }

    // If we're editing an existing meal from settings, save the time change
    if (isEditingFromSettings && editingMealFromSettings) {
      const updatedTime = `${feedingTime.hour}:${feedingTime.minute} ${feedingTime.period}`;
      
      // Update the local schedule
      const updatedSchedule = feedingSchedule.map(meal =>
        meal.id === editingMealFromSettings.id
          ? {
              ...meal,
              fd_time: updatedTime,
            }
          : meal
      );
      
      setFeedingSchedule(sortMealsByType(updatedSchedule));
      
      // Save to database
      saveScheduleToDatabase(updatedSchedule, selectedHorses, true, editingMealFromSettings)
        .then(success => {
          if (success) {
            Alert.alert('Success', `Feeding time for ${mealType} has been updated!`);
          } else {
            Alert.alert('Warning', 'Time updated locally but failed to save to database');
          }
        })
        .catch(error => {
          console.error('Error saving time change:', error);
          Alert.alert('Error', 'Failed to save time changes');
        });
    }

    const horseNames = selectedHorses.filter(h => !h.is_deceased).map(h => h.name).join(', ');
    handleCloseSettingsModal();
    
    if (!isEditingFromSettings) {
      Alert.alert(
        'Settings Saved',
        `Settings saved for ${selectedHorses.filter(h => !h.is_deceased).length} horse(s): ${horseNames}\n\nMeal Type: ${mealType}\nTime: ${feedingTime.hour}:${feedingTime.minute} ${feedingTime.period}\n\nYou can now add a feeding schedule.`,
        [{ text: 'OK' }]
      );
    }
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

  // Handle edit schedule settings - FIXED FUNCTION
  const handleEditScheduleSettings = (meal: Meal): void => {
    if (meal.completed) {
      const fedBy = meal.fed_by || 'someone';
      Alert.alert(
        'Cannot Edit',
        `This meal was already fed by ${fedBy}. You cannot edit completed meals.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Set editing mode
    setIsEditingFromSettings(true);
    setEditingMealFromSettings(meal);
    setMealType(meal.fd_meal_type as any);
    
    // Set time from existing meal
    const timeParts = meal.fd_time.split(' ');
    const time = timeParts[0].split(':');
    setFeedingTime({
      hour: time[0],
      minute: time[1],
      period: timeParts[1] || 'AM',
    });
    
    // Auto-select the horse for this meal
    const updatedHorses = availableHorses.map(h => ({
      ...h,
      selected: h.id === horseIdRef.current // Select current horse
    }));
    setAvailableHorses(updatedHorses);
    const selected = updatedHorses.filter(h => h.selected);
    setSelectedHorses(selected);
    selectedHorsesRef.current = selected;
    setSelectAllHorses(false);
    setHorseSelectionMode('single');
    
    setShowSettingsModal(true);
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
              <Text style={styles.sectionTitle}>Current Settings</Text>
              <View style={styles.currentSettingsContainer}>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Meal Type:</Text>
                  <Text style={styles.settingValue}>{mealType || 'Not Set'}</Text>
                </View>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Feeding Time:</Text>
                  <Text style={styles.settingValue}>
                    {feedingTime.hour}:{feedingTime.minute} {feedingTime.period}
                  </Text>
                </View>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Selected Horses:</Text>
                  <Text style={styles.settingValue}>
                    {selectedHorses.filter(h => !h.is_deceased).length} horse(s)
                  </Text>
                </View>
                <View style={styles.selectedHorsesList}>
                  {selectedHorses.filter(h => !h.is_deceased).map((horse, index) => (
                    <View key={horse.id} style={styles.horseBadge}>
                      <FontAwesome5 name="horse-head" size={12} color="#CD853F" />
                      <Text style={styles.horseBadgeText}>{horse.name}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity 
                  style={styles.changeSettingsButton}
                  onPress={() => {
                    setShowAddView(false);
                    handleOpenSettingsModal();
                  }}
                >
                  <FontAwesome5 name="cog" size={14} color="#3B82F6" />
                  <Text style={styles.changeSettingsButtonText}>Change Settings</Text>
                </TouchableOpacity>
              </View>
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
              (!mealType || feedTypes.every(feed => !feed.amount.trim()) || selectedHorses.filter(h => !h.is_deceased).length === 0) && styles.saveButtonDisabled
            ]} 
            onPress={handleSaveNewSchedule}
            disabled={!mealType || feedTypes.every(feed => !feed.amount.trim()) || selectedHorses.filter(h => !h.is_deceased).length === 0}
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
                Set your feeding time, meal type, and select horses first, then add a schedule.
              </Text>
              <TouchableOpacity 
                style={styles.addFirstScheduleButton} 
                onPress={handleAddNewSchedule}
              >
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
                            onPress={() => handleEditScheduleSettings(meal)}
                          >
                            <FontAwesome5 name="clock" size={14} color="#3B82F6" />
                          </TouchableOpacity>
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
                <TouchableOpacity 
                  style={styles.addScheduleButton} 
                  onPress={handleAddNewSchedule}
                >
                  <FontAwesome5 name="plus" size={16} color="#fff" />
                  <Text style={styles.addScheduleButtonText}>Add New Feeding Schedule</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Secondary Floating Action Button for Settings */}
      <TouchableOpacity 
        style={styles.secondaryFloatingButton}
        onPress={handleOpenSettingsModal}
      >
        <FontAwesome5 name="cog" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseSettingsModal}
      >
        <View style={styles.settingsModalOverlay}>
          <View style={styles.settingsModalContent}>
            <View style={styles.settingsModalHeader}>
              <Text style={styles.settingsModalTitle}>
                {isEditingFromSettings ? 'Edit Feeding Time' : 'Schedule Settings'}
              </Text>
              <TouchableOpacity onPress={handleCloseSettingsModal}>
                <FontAwesome5 name="times" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.settingsModalBody}>
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Horse Selection</Text>
                <Text style={styles.settingsSectionSubtitle}>
                  Choose which horses this schedule applies to (deceased horses are excluded)
                </Text>
                
                <View style={styles.horseSelectionModeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.selectionModeButton,
                      horseSelectionMode === 'single' && styles.selectionModeButtonActive
                    ]}
                    onPress={() => handleHorseSelectionModeChange('single')}
                  >
                    <FontAwesome5 
                      name="horse" 
                      size={16} 
                      color={horseSelectionMode === 'single' ? '#fff' : '#CD853F'} 
                    />
                    <Text style={[
                      styles.selectionModeButtonText,
                      horseSelectionMode === 'single' && styles.selectionModeButtonTextActive
                    ]}>
                      Single Horse
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.selectionModeButton,
                      horseSelectionMode === 'multiple' && styles.selectionModeButtonActive
                    ]}
                    onPress={() => handleHorseSelectionModeChange('multiple')}
                  >
                    <FontAwesome5 
                      name="horse" 
                      size={16} 
                      color={horseSelectionMode === 'multiple' ? '#fff' : '#3B82F6'} 
                    />
                    <Text style={[
                      styles.selectionModeButtonText,
                      horseSelectionMode === 'multiple' && styles.selectionModeButtonTextActive
                    ]}>
                      Multiple Horses
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {/* Select All Button */}
                {horseSelectionMode === 'multiple' && (
                  <TouchableOpacity
                    style={styles.selectAllButton}
                    onPress={handleSelectAllHorses}
                  >
                    <Checkbox
                      value={selectAllHorses}
                      onValueChange={handleSelectAllHorses}
                      color={selectAllHorses ? '#3B82F6' : undefined}
                    />
                    <Text style={styles.selectAllButtonText}>
                      Select All Horses ({availableHorses.filter(h => !h.is_deceased).length})
                    </Text>
                  </TouchableOpacity>
                )}
                
                {/* Horses List */}
                <View style={styles.horsesListContainer}>
                  {availableHorses.filter(h => !h.is_deceased).map((horse) => (
                    <TouchableOpacity
                      key={horse.id}
                      style={[
                        styles.horseItem,
                        horse.selected && styles.horseItemSelected
                      ]}
                      onPress={() => handleToggleHorse(horse.id)}
                      disabled={horseSelectionMode === 'single' && horse.selected}
                    >
                      <Checkbox
                        value={horse.selected}
                        onValueChange={() => handleToggleHorse(horse.id)}
                        color={horse.selected ? '#3B82F6' : undefined}
                        disabled={horseSelectionMode === 'single' && horse.selected}
                      />
                      <View style={styles.horseItemContent}>
                        <Text style={[
                          styles.horseItemName,
                          horse.selected && styles.horseItemNameSelected,
                          horse.id === horseId && styles.currentHorseName
                        ]}>
                          {horse.name}
                          {horse.id === horseId && ' (Current)'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  
                  {/* Show deceased horses separately (disabled) */}
                  {availableHorses.filter(h => h.is_deceased).length > 0 && (
                    <View style={styles.deceasedHorsesSection}>
                      <Text style={styles.deceasedHorsesTitle}>Deceased Horses (Unavailable)</Text>
                      {availableHorses.filter(h => h.is_deceased).map((horse) => (
                        <View key={horse.id} style={styles.deceasedHorseItem}>
                          <FontAwesome5 name="times" size={14} color="#9CA3AF" />
                          <Text style={styles.deceasedHorseName}>{horse.name}</Text>
                          <Text style={styles.deceasedBadge}>Deceased</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                
                {/* Selected Horses Summary */}
                {selectedHorses.filter(h => !h.is_deceased).length > 0 && (
                  <View style={styles.selectedHorsesSummary}>
                    <Text style={styles.selectedHorsesSummaryTitle}>
                      Selected Horses ({selectedHorses.filter(h => !h.is_deceased).length}):
                    </Text>
                    <View style={styles.selectedHorsesChips}>
                      {selectedHorses.filter(h => !h.is_deceased).slice(0, 3).map((horse) => (
                        <View key={horse.id} style={styles.selectedHorseChip}>
                          <FontAwesome5 name="horse-head" size={12} color="#CD853F" />
                          <Text style={styles.selectedHorseChipText}>{horse.name}</Text>
                        </View>
                      ))}
                      {selectedHorses.filter(h => !h.is_deceased).length > 3 && (
                        <View style={styles.selectedHorseChip}>
                          <Text style={styles.selectedHorseChipText}>
                            +{selectedHorses.filter(h => !h.is_deceased).length - 3} more
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Meal Type</Text>
                <Text style={styles.settingsSectionSubtitle}>
                  {isEditingFromSettings ? 'Editing meal type:' : 'Select the meal type for your new schedule'}
                </Text>
                <View style={styles.mealTypeContainer}>
                  {(['Breakfast', 'Lunch', 'Dinner'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.mealTypeButton,
                        mealType === type && styles.mealTypeButtonSelected,
                        (isMealCompleted(type) || (isMealTypeScheduled(type) && !isEditingFromSettings)) && styles.mealTypeButtonDisabled
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
                        if (isMealTypeScheduled(type) && !isEditingFromSettings) {
                          Alert.alert(
                            'Already Scheduled',
                            `A ${type} schedule already exists. You cannot have multiple schedules for the same meal type.`,
                            [{ text: 'OK' }]
                          );
                          return;
                        }
                        setMealType(type);
                      }}
                      disabled={(isMealCompleted(type) || (isMealTypeScheduled(type) && !isEditingFromSettings))}
                    >
                      <FontAwesome5 
                        name={getMealIcon(type)} 
                        size={16} 
                        color={mealType === type ? '#fff' : (isMealCompleted(type) || (isMealTypeScheduled(type) && !isEditingFromSettings)) ? '#94A3B8' : '#CD853F'} 
                      />
                      <Text style={[
                        styles.mealTypeButtonText,
                        mealType === type && styles.mealTypeButtonTextSelected,
                        (isMealCompleted(type) || (isMealTypeScheduled(type) && !isEditingFromSettings)) && styles.mealTypeButtonTextDisabled
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <View style={styles.mealTypeStatusContainer}>
                  {['Breakfast', 'Lunch', 'Dinner'].map((type) => {
                    if (isMealCompleted(type)) {
                      const info = getCompletedMealInfo(type);
                      return (
                        <View key={type} style={styles.mealTypeStatusItem}>
                          <FontAwesome5 name="check-circle" size={12} color="#10B981" />
                          <Text style={styles.mealTypeStatusText}>
                            {type}: Completed by {info?.fed_by}
                          </Text>
                        </View>
                      );
                    }
                    if (isMealTypeScheduled(type) && !isEditingFromSettings) {
                      return (
                        <View key={type} style={styles.mealTypeStatusItem}>
                          <FontAwesome5 name="clock" size={12} color="#3B82F6" />
                          <Text style={styles.mealTypeStatusText}>
                            {type}: Already scheduled
                          </Text>
                        </View>
                      );
                    }
                    return null;
                  })}
                </View>
              </View>

              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Feeding Time</Text>
                <Text style={styles.settingsSectionSubtitle}>
                  {isEditingFromSettings ? 'Edit the feeding time for this schedule' : 'Set the time for this feeding schedule'}
                </Text>
                
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

              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Current Settings</Text>
                <View style={styles.currentSettingsDisplay}>
                  <View style={styles.settingDisplayRow}>
                    <FontAwesome5 name="horse" size={16} color="#64748B" />
                    <Text style={styles.settingDisplayLabel}>Selected Horses:</Text>
                    <Text style={styles.settingDisplayValue}>
                      {selectedHorses.filter(h => !h.is_deceased).length} horse(s)
                    </Text>
                  </View>
                  <View style={styles.settingDisplayRow}>
                    <FontAwesome5 name="utensils" size={16} color="#64748B" />
                    <Text style={styles.settingDisplayLabel}>Meal Type:</Text>
                    <Text style={styles.settingDisplayValue}>{mealType || 'Not Set'}</Text>
                  </View>
                  <View style={styles.settingDisplayRow}>
                    <FontAwesome5 name="clock" size={16} color="#64748B" />
                    <Text style={styles.settingDisplayLabel}>Feeding Time:</Text>
                    <Text style={styles.settingDisplayValue}>
                      {feedingTime.hour}:{feedingTime.minute} {feedingTime.period}
                    </Text>
                  </View>
                  {isEditingFromSettings && editingMealFromSettings && (
                    <View style={styles.settingDisplayRow}>
                      <FontAwesome5 name="info-circle" size={16} color="#3B82F6" />
                      <Text style={styles.settingDisplayLabel}>Editing:</Text>
                      <Text style={styles.settingDisplayValue}>
                        {editingMealFromSettings.fd_meal_type} schedule
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.settingsModalFooter}>
              <TouchableOpacity 
                style={styles.settingsCancelButton}
                onPress={handleCloseSettingsModal}
              >
                <Text style={styles.settingsCancelButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.settingsApplyButton,
                  (!mealType || selectedHorses.filter(h => !h.is_deceased).length === 0) && styles.settingsApplyButtonDisabled
                ]}
                onPress={handleApplySettings}
                disabled={!mealType || selectedHorses.filter(h => !h.is_deceased).length === 0}
              >
                <Text style={styles.settingsApplyButtonText}>
                  {isEditingFromSettings ? 'Save Time Change' : 'Apply Settings'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 120, // Extra padding for floating buttons
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
    marginBottom: 16,
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
    paddingHorizontal: 24,
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
    marginLeft: 8,
  },
  secondaryFloatingButton: {
    position: 'absolute',
    right: 24,
    bottom: 64,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    zIndex: 9,
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
  // Settings Modal Styles
  settingsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  settingsModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  settingsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  settingsModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
  },
  settingsModalBody: {
    padding: 24,
    paddingBottom: 0,
  },
  settingsModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  settingsSectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  // Horse Selection Mode Styles
  horseSelectionModeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  selectionModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  selectionModeButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  selectionModeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  selectionModeButtonTextActive: {
    color: '#FFFFFF',
  },
  // Select All Button
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  selectAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 12,
  },
  // Horses List
  horsesListContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  horseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  horseItemSelected: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  horseItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },
  horseItemName: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 8,
    flex: 1,
  },
  horseItemNameSelected: {
    color: '#1E293B',
    fontWeight: '600',
  },
  currentHorseName: {
    color: '#CD853F',
  },
  // Deceased horses section
  deceasedHorsesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  deceasedHorsesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  deceasedHorseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    marginBottom: 4,
    opacity: 0.6,
  },
  deceasedHorseName: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 12,
    flex: 1,
    textDecorationLine: 'line-through',
  },
  deceasedBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    backgroundColor: '#9CA3AF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  // Selected Horses Summary
  selectedHorsesSummary: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  selectedHorsesSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369A1',
    marginBottom: 12,
  },
  selectedHorsesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedHorseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectedHorseChipText: {
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '500',
    marginLeft: 4,
  },
  // Meal Type Styles
  mealTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#CD853F',
  },
  mealTypeButtonTextSelected: {
    color: '#FFFFFF',
  },
  mealTypeButtonTextDisabled: {
    color: '#94A3B8',
  },
  mealTypeStatusContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  mealTypeStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealTypeStatusText: {
    fontSize: 12,
    color: '#64748B',
  },
  // Time Input Styles
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
  // Current Settings Display
  currentSettingsDisplay: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  settingDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingDisplayLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginLeft: 8,
    marginRight: 12,
  },
  settingDisplayValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  // Settings Buttons
  settingsCancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#94A3B8',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flex: 1,
    alignItems: 'center',
  },
  settingsCancelButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsApplyButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flex: 1,
    alignItems: 'center',
  },
  settingsApplyButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  settingsApplyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Current Settings in Add View
  currentSettingsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  selectedHorsesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  horseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  horseBadgeText: {
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '500',
    marginLeft: 4,
  },
  changeSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  changeSettingsButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Feed Types Grid
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