// HORSE_OPERATOR/water.tsx

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
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { Checkbox } from 'expo-checkbox';

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

type Horse = {
  id: string;
  name: string;
  selected?: boolean;
  is_deceased?: boolean;
};

const API_BASE_URL = "http://192.168.101.4:8000/api/horse_operator";

// Configure notifications handler
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
  const horseId = params.horseId as string || params.id as string || '';
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
  
  // New state for horse selection
  const [availableHorses, setAvailableHorses] = useState<Horse[]>([]);
  const [selectedHorses, setSelectedHorses] = useState<Horse[]>([]);
  const [selectAllHorses, setSelectAllHorses] = useState(false);
  const [horseSelectionMode, setHorseSelectionMode] = useState<'single' | 'multiple'>('single');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Use refs to avoid dependencies in callbacks
  const selectedHorsesRef = useRef<Horse[]>([]);
  const horseIdRef = useRef<string>(horseId);
  const currentUserRef = useRef<string>('');
  const horseNameRef = useRef<string>(horseName);
  const wateringScheduleRef = useRef<WaterSchedule[]>([]);

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
    wateringScheduleRef.current = wateringSchedule;
  }, [wateringSchedule]);

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

  // Filter out deceased horses
  const filterOutDeceasedHorses = (horses: Horse[]): Horse[] => {
    return horses.filter(horse => !horse.is_deceased);
  };

  // Get current user
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

  // Load today's water records
  const loadTodaysWaterRecords = useCallback(async (userId: string): Promise<WaterSchedule[]> => {
    try {
      if (!horseIdRef.current) {
        console.error("No horseId available for loading water records");
        return [];
      }
      
      const url = `${API_BASE_URL}/get_watering_schedule/?user_id=${encodeURIComponent(userId)}&horse_id=${encodeURIComponent(horseIdRef.current)}`;
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
          console.log(`Loaded ${sortedWater.length} water records`);
          return sortedWater;
        }
      } else {
        console.log('No water records found or server error');
      }
    } catch (error) {
      console.error('Error loading water records:', error);
    }
    
    console.log('Returning empty water records array');
    return [];
  }, [sortWaterByPeriod]);

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
        horseId: horseIdRef.current,
        horseName: horseNameRef.current,
        schedule: schedule.map(water => ({
          period: water.period,
          time: water.time,
          amount: water.amount,
        })),
        lastUpdated: new Date().toISOString(),
      };
      
      await SecureStore.setItemAsync(`last_water_schedule_${horseIdRef.current}`, JSON.stringify(lastViewedData));
      console.log('Stored last viewed water time for automatic notifications');
    } catch (error) {
      console.error('Error storing last viewed water time:', error);
    }
  }, []);

  // Schedule automatic daily notifications based on last viewed water time
  const scheduleAutomaticDailyNotifications = useCallback(async (): Promise<void> => {
    try {
      // Get the last stored water schedule
      const storedData = await SecureStore.getItemAsync(`last_water_schedule_${horseIdRef.current}`);
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
          notification.content.data?.horseId === horseIdRef.current
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
                title: `${periodEmoji} ${water.period} Water - ${horseNameRef.current}`,
                subtitle: subtitle,
                body: `💧 ${water.amount}\n${motivationalMessage}`,
                data: { 
                  type: 'auto_water_reminder',
                  horseId: horseIdRef.current,
                  horseName: horseNameRef.current,
                  period: water.period,
                  amount: water.amount,
                  time: water.time,
                  notificationId: `auto_water_${horseIdRef.current}_${water.period}_${Date.now()}`
                },
                sound: 'default',
                priority: 'high',
                badge: 1,
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
  }, []);

  // Schedule water notifications
  const scheduleWaterNotifications = useCallback(async (schedule: WaterSchedule[], horses: Horse[] = []): Promise<void> => {
    try {
      // First, get all currently scheduled notifications
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`Currently have ${scheduledNotifications.length} scheduled notifications`);
      
      // Cancel only water-related notifications for selected horses
      const horseIds = horses.length > 0 ? horses.map(h => h.id) : [horseIdRef.current];
      const waterNotifications = scheduledNotifications.filter(notification => 
        (notification.content.data?.type === 'water_reminder' || 
         notification.content.data?.type === 'auto_water_reminder') && 
        horseIds.includes(notification.content.data?.horseId as string)
      );
      
      if (waterNotifications.length > 0) {
        console.log(`Canceling ${waterNotifications.length} existing water notifications for horse ${horseIdRef.current}`);
        for (const notification of waterNotifications) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }

      // Store the current schedule for automatic daily notifications
      await storeLastViewedWaterTime(schedule);

      // Schedule new notifications for each water schedule
      console.log(`Scheduling ${schedule.length} new water notifications for ${horses.length} horses`);
      
      for (const water of schedule) {
        const notificationTime = parseTimeString(water.time);
        if (notificationTime) {
          // Schedule for each selected horse
          for (const horse of horses) {
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
                title: `${periodEmoji} ${water.period} Water - ${horse.name}`,
                subtitle: subtitle,
                body: `💧 ${water.amount}\n${motivationalMessage}`,
                data: { 
                  type: 'water_reminder',
                  horseId: horse.id,
                  horseName: horse.name,
                  period: water.period,
                  amount: water.amount,
                  time: water.time,
                  notificationId: `water_${horse.id}_${water.period}_${Date.now()}`
                },
                sound: 'default',
                priority: 'high',
                badge: 1,
              },
              trigger,
            });

            console.log(`✅ Scheduled ${water.period} notification for ${horse.name} at ${notificationTime.hours}:${notificationTime.minutes}`);
          }
        } else {
          console.warn(`❌ Could not parse time for ${water.period}: ${water.time}`);
        }
      }

      // Verify scheduled notifications
      const finalScheduled = await Notifications.getAllScheduledNotificationsAsync();
      const waterScheduled = finalScheduled.filter(notification => 
        notification.content.data?.type === 'water_reminder' && 
        horseIds.includes(notification.content.data?.horseId as string)
      );
      console.log(`✅ Successfully scheduled ${waterScheduled.length} water notifications`);
      
    } catch (error) {
      console.error('❌ Error scheduling notifications:', error);
    }
  }, [storeLastViewedWaterTime]);

  // Save schedule to database
  const saveScheduleToDatabase = async (schedule: WaterSchedule[], horses: Horse[] = [], isEdit: boolean = false, waterToUpdate?: WaterSchedule): Promise<boolean> => {
    if (!currentUserRef.current || !horseIdRef.current) {
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
          water_id: water.water_id,
        }));

      // Use different endpoint for edits vs new schedules
      const endpoint = isEdit ? 'update_watering_schedule' : 'save_watering_schedule';
      const requestBody: any = {
        user_id: currentUserRef.current,
        horse_id: horseIdRef.current,
        schedule: scheduleToSave,
      };

      // For edits, include the specific water to update
      if (isEdit && waterToUpdate) {
        requestBody.water_id = waterToUpdate.water_id;
        requestBody.period = waterToUpdate.period;
      }

      const response = await fetch(`${API_BASE_URL}/${endpoint}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        await response.json();
        console.log('Watering schedule saved to database.');
        
        // Schedule notifications for all active schedules
        await scheduleWaterNotifications(schedule, horses);
        
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

  // Check if water is completed (by anyone)
  const isWaterCompleted = useCallback((period: string): boolean => {
    const existingWater = wateringScheduleRef.current.find(water => 
      water.period === period && 
      water.completed
    );
    return !!existingWater;
  }, []);

  // Get completed water info
  const getCompletedWaterInfo = useCallback((period: string): { given_by: string, user_type: string } | null => {
    const existingWater = wateringScheduleRef.current.find(water => 
      water.period === period && 
      water.completed
    );
    return existingWater ? { 
      given_by: existingWater.given_by || 'Unknown', 
      user_type: existingWater.user_type || 'unknown' 
    } : null;
  }, []);

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
      const existingSchedule = wateringScheduleRef.current.find(water => water.period === period);
      if (existingSchedule) {
        return false; // Cannot add schedule for existing periods
      }
      
      return true; // This period is available for new schedules
    });
  }, [isWaterCompleted]);

  // Get scheduled periods (for display purposes)
  const getScheduledPeriods = useCallback((): string[] => {
    return wateringScheduleRef.current.map(water => water.period);
  }, []);

  // Initialize water screen
  const initializeWaterScreen = useCallback(async (): Promise<void> => {
    console.log("Initializing water screen...");
    console.log("Horse ID:", horseIdRef.current);
    console.log("Horse Name:", horseNameRef.current);
    
    // Ensure we have horseId
    if (!horseIdRef.current) {
      console.error("No horseId provided");
      setIsLoading(false);
      Alert.alert('Error', 'No horse selected. Please go back and select a horse.');
      return;
    }
    
    try {
      const userId = await getCurrentUser();
      if (!userId) {
        console.error("No user ID found");
        setIsLoading(false);
        Alert.alert('Error', 'User not found. Please log in again.');
        return;
      }

      console.log(`Loading water records for horse: ${horseIdRef.current}, user: ${userId}`);
      
      // Load available horses
      await loadAvailableHorses();

      // Load today's water records
      const todaysRecords = await loadTodaysWaterRecords(userId);
      console.log(`Loaded ${todaysRecords.length} watering schedule items`);
      
      setWateringSchedule(todaysRecords);
      setIsInitialized(true);
      
      // Schedule notifications for any existing schedules
      if (todaysRecords.length > 0) {
        const activeSchedules = todaysRecords.filter(water => !water.completed);
        if (activeSchedules.length > 0) {
          await scheduleWaterNotifications(activeSchedules, selectedHorsesRef.current);
        }
      }
      
      // Schedule automatic daily notifications based on last viewed time
      await scheduleAutomaticDailyNotifications();
      
    } catch (error) {
      console.error('Error initializing water screen:', error);
      setWateringSchedule([]);
      Alert.alert('Error', 'Failed to load watering schedule. Please try again.');
    } finally {
      // ALWAYS set isLoading to false
      setIsLoading(false);
      console.log("Initialization complete, isLoading set to false");
    }
  }, [
    getCurrentUser, 
    loadAvailableHorses,
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
        
        Alert.alert(
          `${data.period} Water Reminder`,
          `Remember to give ${data.amount} of water to ${data.horseName}`,
          [{ text: 'OK' }]
        );
      }
    });

    return () => subscription.remove();
  }, []);

  // Initialize on component mount
  useEffect(() => {
    let mounted = true;
    
    console.log("WaterScreen mounted, starting initialization");
    
    const init = async () => {
      if (mounted && !isInitialized) {
        await initializeWaterScreen();
      }
    };
    
    init();
    
    return () => {
      mounted = false;
      console.log("WaterScreen unmounted");
    };
  }, [initializeWaterScreen, isInitialized]);

  // Refresh function
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    try {
      const userId = await getCurrentUser();
      if (userId && horseIdRef.current) {
        const todaysRecords = await loadTodaysWaterRecords(userId);
        setWateringSchedule(todaysRecords);
        
        // Update notifications for active schedules
        const activeSchedules = todaysRecords.filter(water => !water.completed);
        if (activeSchedules.length > 0) {
          await scheduleWaterNotifications(activeSchedules, selectedHorsesRef.current);
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
  }, [
    getCurrentUser, 
    loadTodaysWaterRecords, 
    scheduleWaterNotifications, 
    scheduleAutomaticDailyNotifications,
    loadAvailableHorses
  ]);

  // Focus effect
  useFocusEffect(
    useCallback(() => {
      console.log("WaterScreen focused");
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

  // Handle mark as given
  const handleMarkAsGiven = async (water: WaterSchedule): Promise<void> => {
    if (!currentUserRef.current) {
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
        user_id: currentUserRef.current,
        horse_id: horseIdRef.current,
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
          user_id: currentUserRef.current,
          horse_id: horseIdRef.current,
          water_time: water.time,
          water_period: water.period,
          water_amount: water.amount,
          completed_at: completedAt,
          water_id: water.water_id,
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
          notification.content.data?.horseId === horseIdRef.current &&
          notification.content.data?.period === water.period
        );
        
        if (notificationToCancel) {
          await Notifications.cancelScheduledNotificationAsync(notificationToCancel.identifier);
          console.log(`Cancelled notification for ${water.period} period`);
        }
      } catch (error) {
        console.error('Error cancelling notification:', error);
      }
      
      Alert.alert('Success', `Water given to ${horseNameRef.current} and recorded in database!`);
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

    // Check if water period and time are set
    if (!waterPeriod) {
      Alert.alert(
        'Water Period Required',
        'Please set a water period first using the settings button below.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check if water period is already completed
    if (isWaterCompleted(waterPeriod)) {
      const completedInfo = getCompletedWaterInfo(waterPeriod);
      Alert.alert(
        'Cannot Add Schedule',
        `This ${waterPeriod} water has already been completed by ${completedInfo?.given_by}. You cannot add a new schedule for completed periods.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Check if water period already exists
    const existingWater = wateringSchedule.find(water => water.period === waterPeriod);
    if (existingWater) {
      Alert.alert(
        'Water Period Exists',
        `A ${waterPeriod} schedule already exists. Please edit or delete the existing schedule first.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Reset water amount
    setWaterAmount('');
    
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

    if (!currentUserRef.current) {
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
                user_id: currentUserRef.current,
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
                    user_id: currentUserRef.current,
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
                  notification.content.data?.horseId === horseIdRef.current &&
                  notification.content.data?.period === water.period
                );
                
                if (notificationToCancel) {
                  await Notifications.cancelScheduledNotificationAsync(notificationToCancel.identifier);
                  console.log(`Cancelled notification for ${water.period}`);
                }
                
                // Reschedule remaining notifications to ensure they're properly set
                const activeSchedules = updatedSchedule.filter(w => !w.completed);
                if (activeSchedules.length > 0) {
                  await scheduleWaterNotifications(activeSchedules, selectedHorsesRef.current);
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
    if (!horseIdRef.current) {
      Alert.alert('Error', 'No horse selected. Cannot view water log.');
      return;
    }
    
    router.push({
      pathname: '../HORSE_OPERATOR/waterlog',
      params: {
        id: horseIdRef.current,
        horseId: horseIdRef.current,
        horseName: horseNameRef.current
      }
    });
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

  // Handle open settings modal
  const handleOpenSettingsModal = (): void => {
    setShowSettingsModal(true);
  };

  // Handle close settings modal
  const handleCloseSettingsModal = (): void => {
    setShowSettingsModal(false);
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

  // Handle apply settings
  const handleApplySettings = (): void => {
    if (!waterPeriod) {
      Alert.alert('Missing Setting', 'Please select a water period before proceeding.');
      return;
    }

    if (selectedHorses.length === 0) {
      Alert.alert('Missing Setting', 'Please select at least one horse before proceeding.');
      return;
    }

    // Filter out deceased horses from selected horses
    const aliveSelectedHorses = selectedHorses.filter(horse => !horse.is_deceased);
    if (aliveSelectedHorses.length === 0) {
      Alert.alert('No Alive Horses Selected', 'Please select at least one alive horse before proceeding.');
      return;
    }

    const horseNames = aliveSelectedHorses.map(h => h.name).join(', ');
    handleCloseSettingsModal();
    
    Alert.alert(
      'Settings Saved',
      `Settings saved for ${aliveSelectedHorses.length} horse(s): ${horseNames}\n\nWater Period: ${waterPeriod}\nTime: ${wateringTime.hour}:${wateringTime.minute} ${wateringTime.period}\n\nYou can now add a watering schedule.`,
      [{ text: 'OK' }]
    );
  };

  // Handle save new schedule
  const handleSaveNewSchedule = async (): Promise<void> => {
    if (!waterAmount.trim()) {
      Alert.alert('Error', 'Please specify water amount.');
      return;
    }

    if (!waterPeriod) {
      Alert.alert('Error', 'Please select a water period.');
      return;
    }

    if (selectedHorses.length === 0) {
      Alert.alert('Error', 'Please select at least one horse in settings.');
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
                
                const success = await saveScheduleToDatabase(updatedSchedule, selectedHorses, true, existingWater);
                if (success) {
                  Alert.alert('Success', `${waterPeriod} schedule updated for selected horses!`);
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
      
      const success = await saveScheduleToDatabase(updatedSchedule, selectedHorses, false);
      if (success) {
        Alert.alert('Success', `${waterPeriod} schedule added for selected horses!`);
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
          
    if (!editingWater || !currentUserRef.current) return;

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
      
      const success = await saveScheduleToDatabase(updatedSchedule, selectedHorses, true, editingWater);
      if (success) {
        Alert.alert('Success', `Watering schedule updated for selected horses!`);
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

  // Handle edit schedule settings
  const handleEditScheduleSettings = (water: WaterSchedule): void => {
    if (water.completed) {
      const givenBy = water.given_by || 'someone';
      Alert.alert(
        'Cannot Edit',
        `This water was already given by ${givenBy}. You cannot edit completed schedules.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Open settings modal with current water settings
    setWaterPeriod(water.period as any);
    
    // Set time from existing water
    const timeParts = water.time.split(' ');
    const time = timeParts[0].split(':');
    setWateringTime({
      hour: time[0],
      minute: time[1],
      period: timeParts[1] || 'AM',
    });
    
    setShowSettingsModal(true);
  };

  // Show loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading watering schedule...</Text>
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
              <Text style={styles.sectionTitle}>Current Settings</Text>
              <View style={styles.currentSettingsContainer}>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Water Period:</Text>
                  <Text style={styles.settingValue}>{waterPeriod || 'Not Set'}</Text>
                </View>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Watering Time:</Text>
                  <Text style={styles.settingValue}>
                    {wateringTime.hour}:{wateringTime.minute} {wateringTime.period}
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
                      <FontAwesome5 name="horse-head" size={12} color="#3B82F6" />
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
              (!waterPeriod || !waterAmount.trim() || selectedHorses.filter(h => !h.is_deceased).length === 0) && styles.saveButtonDisabled
            ]} 
            onPress={handleSaveNewSchedule}
            disabled={!waterPeriod || !waterAmount.trim() || selectedHorses.filter(h => !h.is_deceased).length === 0}
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
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
                Set your watering time, water period, and select horses first, then add a schedule.
              </Text>
              <TouchableOpacity 
                style={styles.addFirstScheduleButton} 
                onPress={handleAddNewSchedule}
              >
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
                            onPress={() => handleEditScheduleSettings(water)}
                          >
                            <FontAwesome5 name="cog" size={14} color="#3B82F6" />
                          </TouchableOpacity>
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
                <TouchableOpacity 
                  style={styles.addScheduleButton} 
                  onPress={handleAddNewSchedule}
                >
                  <FontAwesome5 name="plus" size={16} color="#fff" />
                  <Text style={styles.addScheduleButtonText}>Add New Water Schedule</Text>
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
              <Text style={styles.settingsModalTitle}>Schedule Settings</Text>
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
                      color={horseSelectionMode === 'single' ? '#fff' : '#3B82F6'} 
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
                          <FontAwesome5 name="horse-head" size={12} color="#3B82F6" />
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
                <Text style={styles.settingsSectionTitle}>Water Period</Text>
                <Text style={styles.settingsSectionSubtitle}>
                  Select the water period for your new schedule
                </Text>
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
                            `A ${period} schedule already exists. You cannot have multiple schedules for the same water period.`,
                            [{ text: 'OK' }]
                          );
                          return;
                        }
                        setWaterPeriod(period);
                      }}
                      disabled={isWaterCompleted(period) || isPeriodScheduled(period)}
                    >
                      <FontAwesome5 
                        name={getPeriodIcon(period)} 
                        size={16} 
                        color={waterPeriod === period ? '#fff' : (isWaterCompleted(period) || isPeriodScheduled(period)) ? '#94A3B8' : '#3B82F6'} 
                      />
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
                
                <View style={styles.periodStatusContainer}>
                  {['Morning', 'Noon', 'Evening'].map((period) => {
                    if (isWaterCompleted(period)) {
                      const info = getCompletedWaterInfo(period);
                      return (
                        <View key={period} style={styles.periodStatusItem}>
                          <FontAwesome5 name="check-circle" size={12} color="#10B981" />
                          <Text style={styles.periodStatusText}>
                            {period}: Completed by {info?.given_by}
                          </Text>
                        </View>
                      );
                    }
                    if (isPeriodScheduled(period)) {
                      return (
                        <View key={period} style={styles.periodStatusItem}>
                          <FontAwesome5 name="clock" size={12} color="#3B82F6" />
                          <Text style={styles.periodStatusText}>
                            {period}: Already scheduled
                          </Text>
                        </View>
                      );
                    }
                    return null;
                  })}
                </View>
              </View>

              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>Watering Time</Text>
                <Text style={styles.settingsSectionSubtitle}>
                  Set the time for this watering schedule
                </Text>
                
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
                    <FontAwesome5 name="tint" size={16} color="#64748B" />
                    <Text style={styles.settingDisplayLabel}>Water Period:</Text>
                    <Text style={styles.settingDisplayValue}>{waterPeriod || 'Not Set'}</Text>
                  </View>
                  <View style={styles.settingDisplayRow}>
                    <FontAwesome5 name="clock" size={16} color="#64748B" />
                    <Text style={styles.settingDisplayLabel}>Watering Time:</Text>
                    <Text style={styles.settingDisplayValue}>
                      {wateringTime.hour}:{wateringTime.minute} {wateringTime.period}
                    </Text>
                  </View>
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
                  (!waterPeriod || selectedHorses.filter(h => !h.is_deceased).length === 0) && styles.settingsApplyButtonDisabled
                ]}
                onPress={handleApplySettings}
                disabled={!waterPeriod || selectedHorses.filter(h => !h.is_deceased).length === 0}
              >
                <Text style={styles.settingsApplyButtonText}>Apply Settings</Text>
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
    backgroundColor: '#3B82F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '500',
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
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginTop: 20,
    marginBottom: 5,
    shadowColor: '#3B82F6',
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
    color: '#3B82F6',
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
  // Period Styles
  periodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
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
  periodStatusContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  periodStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  periodStatusText: {
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
  // Section Styles (for Edit/Add views)
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