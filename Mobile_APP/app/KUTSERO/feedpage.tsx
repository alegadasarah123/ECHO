import { useState, useEffect } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, Alert, SafeAreaView, TextInput, Modal, Image } from "react-native";
import { FontAwesome5 } from '@expo/vector-icons';
import FeedLogPage from './FeedLogPage';
import WaterLogPage from './waterlogpage';

// API Configuration
const API_BASE_URL = 'http://192.168.31.58:8000/api/kutsero';

interface FeedLog {
  log_id: string;
  log_kutsero_full_name?: string;
  log_user_full_name?: string;
  log_date: string;
  log_meal: string;
  log_time: string;
  log_food: string;
  log_amount: string;
  log_status: string;
  log_action: string;
  created_at: string;
}

interface WaterLog {
  log_id: string;
  log_kutsero_full_name: string;
  log_date: string;
  log_period: string;
  log_time: string;
  log_amount: string;
  log_status: string;
  log_action: string;
  created_at: string;
  horse_name: string;
}

interface FeedPageProps {
  onBack: () => void;
  feedType: "feed" | "water";
  horseName: string;
  horseId: string;
  userId: string;
  userName: string;
}

interface MealSchedule {
  fd_id: string;
  fd_meal_type: string;
  fd_food_type: string;
  fd_qty: string;
  fd_time: string;
  kutsero_id: string;
  horse_id: string;
  completed: boolean;
  completed_at?: string;
  completed_by?: string;
  created_at?: string;
  op_id?: string;
  user_type?: string;
}

interface WaterSchedule {
  water_id: string;
  water_period: string;
  water_amount: string;
  water_time: string;
  kutsero_id: string;
  horse_id: string;
  completed: boolean;
  completed_at?: string;
  completed_by?: string;
  created_at?: string;
  op_id?: string;
  user_type?: string;
}

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
};

// ============================================================================
// API FUNCTIONS
// ============================================================================
const fetchFeedingSchedule = async (kutseronId: string, horseId: string): Promise<MealSchedule[]> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/feeding-schedule/?kutsero_id=${kutseronId}&horse_id=${horseId}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );
    
    if (!response.ok) return [];
    const data = await response.json();
    return data.success ? (data.data || []) : [];
  } catch (error) {
    return [];
  }
};

const fetchWaterSchedule = async (kutseronId: string, horseId: string): Promise<WaterSchedule[]> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/water-schedule/?kutsero_id=${kutseronId}&horse_id=${horseId}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );
    
    if (!response.ok) return [];
    const data = await response.json();
    return data.success ? (data.data || []) : [];
  } catch (error) {
    return [];
  }
};

const saveFeedingSchedule = async (feedData: any): Promise<{ success: boolean; error?: string; data?: any; message?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/feeding-schedule/update/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedData),
    });
    
    if (!response.ok) {
      return { success: false, error: `Server error: ${response.status}` };
    }
    return await response.json();
  } catch (error) {
    return { success: false, error: `Network error: ${error instanceof Error ? error.message : String(error)}` };
  }
};

const saveWaterSchedule = async (waterData: any): Promise<{ success: boolean; error?: string; data?: any; message?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/water-schedule/update/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(waterData),
    });
    
    if (!response.ok) {
      return { success: false, error: `Server error: ${response.status}` };
    }
    return await response.json();
  } catch (error) {
    return { success: false, error: `Network error: ${error instanceof Error ? error.message : String(error)}` };
  }
};

const markFeedCompleted = async (kutseronId: string, horseId: string, fdId: string, kutseronName: string, horseName: string): Promise<{ success: boolean; error?: string; message?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/feeding-schedule/mark-completed/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kutsero_id: kutseronId,
        horse_id: horseId,
        fd_id: fdId,
        kutsero_name: kutseronName,
        horse_name: horseName,
        user_type: 'kutsero',
      }),
    });
    
    if (!response.ok) {
      return { success: false, error: `Server error: ${response.status}` };
    }
    return await response.json();
  } catch (error) {
    return { success: false, error: 'Network error occurred' };
  }
};

const markWaterCompleted = async (kutseronId: string, horseId: string, waterId: string, kutseronName: string, horseName: string): Promise<{ success: boolean; error?: string; message?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/water-schedule/mark-completed/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kutsero_id: kutseronId,
        horse_id: horseId,
        water_id: waterId,
        kutsero_name: kutseronName,
        horse_name: horseName,
        user_type: 'kutsero',
      }),
    });
    
    if (!response.ok) {
      return { success: false, error: `Server error: ${response.status}` };
    }
    return await response.json();
  } catch (error) {
    return { success: false, error: 'Network error occurred' };
  }
};

const fetchFeedLogs = async (kutseronId: string, horseId: string, logDate?: string, logMeal?: string): Promise<FeedLog[]> => {
  try {
    // Remove user-specific filtering to see all feed logs for the horse
    let url = `${API_BASE_URL}/feed-logs/?horse_id=${horseId}`;
    if (logDate) url += `&log_date=${logDate}`;
    if (logMeal && logMeal !== 'All Meals') url += `&log_meal=${logMeal}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) return [];
    const data = await response.json();
    return data.success ? (data.data || []) : [];
  } catch (error) {
    return [];
  }
};

const fetchWaterLogs = async (kutseronId: string, horseId: string, logDate?: string, logPeriod?: string): Promise<WaterLog[]> => {
  try {
    // Remove user-specific filtering to see all water logs for the horse
    let url = `${API_BASE_URL}/water-logs/?horse_id=${horseId}`;
    if (logDate) url += `&log_date=${logDate}`;
    if (logPeriod && logPeriod !== 'All Periods') url += `&log_period=${logPeriod}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) return [];
    const data = await response.json();
    
    if (!data.success || !Array.isArray(data.data)) return [];
    
    // Transform the data
    const transformedLogs: WaterLog[] = data.data.map((log: any) => ({
      log_id: log.wlog_id ?? '',
      log_kutsero_full_name: log.wlog_user_full_name ?? 'Unknown',
      log_date: log.wlog_date ?? '',
      log_period: log.wlog_period ?? '',
      log_time: log.wlog_time ?? '',
      log_amount: log.wlog_amount ?? '',
      log_status: log.wlog_status ?? '',
      log_action: log.wlog_action ?? '',
      created_at: log.created_at ?? '',
      horse_name: '',
    }));
    
    return transformedLogs;
  } catch (error) {
    return [];
  }
};

const resetDailyAPI = async (kutseronId: string, horseId: string, type: 'feed' | 'water'): Promise<{ success: boolean; error?: string; message?: string }> => {
  try {
    const endpoint = type === 'feed' ? 'feeding-schedule/reset/' : 'water-schedule/reset/';
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kutsero_id: kutseronId,
        horse_id: horseId,
      }),
    });
    
    if (!response.ok) {
      return { success: false, error: `Server error: ${response.status}` };
    }
    return await response.json();
  } catch (error) {
    return { success: false, error: 'Network error occurred' };
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function FeedPage({ onBack, feedType, horseName, horseId, userId, userName }: FeedPageProps) {
  const isWater = feedType === 'water';
  
  // Feed states
  const [feedingSchedule, setFeedingSchedule] = useState<MealSchedule[]>([]);
  const [feedLogs, setFeedLogs] = useState<FeedLog[]>([]);
  const [feedTypes, setFeedTypes] = useState<FeedType[]>([
    { id: '1', name: 'Hay', amount: '', image: FOOD_IMAGES.hay },
    { id: '2', name: 'Oats', amount: '', image: FOOD_IMAGES.oats },
    { id: '3', name: 'Grains', amount: '', image: FOOD_IMAGES.grains },
    { id: '4', name: 'Carrots', amount: '', image: FOOD_IMAGES.carrots },
    { id: '5', name: 'Apples', amount: '', image: FOOD_IMAGES.apples },
    { id: '6', name: 'Pellets', amount: '', image: FOOD_IMAGES.pellets },
  ]);
  const [editingMeal, setEditingMeal] = useState<MealSchedule | null>(null);
  
  // Water states
  const [waterSchedule, setWaterSchedule] = useState<WaterSchedule[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('Morning');
  const [waterAmount, setWaterAmount] = useState('');
  const [editingWater, setEditingWater] = useState<WaterSchedule | null>(null);
  
  // Shared states
  const [showEditView, setShowEditView] = useState(false);
  const [showAddView, setShowAddView] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [feedingTime, setFeedingTime] = useState({ hour: '6', minute: '45', period: 'AM' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  const periods = ['Morning', 'Afternoon', 'Evening'];

  useEffect(() => {
    console.log('FeedPage loaded with feedType:', feedType);
    loadSchedule();
  }, [userId, horseId, feedType]);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      if (isWater) {
        const schedule = await fetchWaterSchedule(userId, horseId);
        setWaterSchedule(schedule);
        const logs = await fetchWaterLogs(userId, horseId);
        setWaterLogs(logs);
      } else {
        const schedule = await fetchFeedingSchedule(userId, horseId);
        setFeedingSchedule(schedule);
        const logs = await fetchFeedLogs(userId, horseId);
        setFeedLogs(logs);
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
      Alert.alert('Error', `Failed to load ${isWater ? 'water' : 'feeding'} schedule. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentTime = () => {
    const now = new Date();
    return {
      hours: now.getHours(),
      minutes: now.getMinutes()
    };
  };

  const convertTo24Hour = (hour: string, period: string): number => {
    let h = parseInt(hour);
    if (period === 'PM' && h !== 12) {
      h += 12;
    } else if (period === 'AM' && h === 12) {
      h = 0;
    }
    return h;
  };

  const isTimeInPast = (hour: string, minute: string, period: string): boolean => {
    const current = getCurrentTime();
    const selectedHour24 = convertTo24Hour(hour, period);
    const selectedMinutes = parseInt(minute);
    
    if (selectedHour24 < current.hours) {
      return true;
    } else if (selectedHour24 === current.hours && selectedMinutes < current.minutes) {
      return true;
    }
    return false;
  };

  const getMealName = (time: string): string => {
    try {
      const timeParts = time.trim().split(' ');
      if (timeParts.length < 2) return 'Meal';
      
      const timeComponent = timeParts[0];
      const period = timeParts[1] || 'AM';
      
      if (!timeComponent.includes(':')) return 'Meal';
      
      const hour = parseInt(timeComponent.split(':')[0]);
      if (isNaN(hour)) return 'Meal';
      
      const hour24 = convertTo24Hour(hour.toString(), period);

      if (hour24 < 10) return 'Breakfast';
      if (hour24 < 16) return 'Lunch';
      return 'Dinner';
    } catch (error) {
      return 'Meal';
    }
  };

  const getPeriodIcon = (period: string): string => {
    switch (period) {
      case 'Morning': return 'sun';
      case 'Afternoon': return 'cloud-sun';
      case 'Evening': return 'moon';
      default: return 'tint';
    }
  };

  const getPeriodColor = (period: string): string => {
    switch (period) {
      case 'Morning': return '#F59E0B';
      case 'Afternoon': return '#3B82F6';
      case 'Evening': return '#6366F1';
      default: return '#06B6D4';
    }
  };

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
      default: return FOOD_IMAGES.default;
    }
  };

  const getFoodIcon = (foodType: string) => {
    switch (foodType.toLowerCase()) {
      case 'hay': return 'leaf';
      case 'oats': return 'seedling';
      case 'grains': return 'wheat';
      case 'carrots': return 'carrot';
      case 'apples': return 'apple-alt';
      case 'pellets': return 'circle';
      default: return 'utensils';
    }
  };

  const handleEdit = (item: MealSchedule | WaterSchedule): void => {
    if (isWater) {
      const water = item as WaterSchedule;
      setEditingWater(water);
      try {
        const timeParts = water.water_time.trim().split(' ');
        if (timeParts.length >= 2) {
          const time = timeParts[0].split(':');
          if (time.length >= 2) {
            setFeedingTime({
              hour: time[0],
              minute: time[1],
              period: timeParts[1] || 'AM',
            });
          }
        }
      } catch (error) {
        setFeedingTime({ hour: '6', minute: '00', period: 'AM' });
      }
      setSelectedPeriod(water.water_period);
      setWaterAmount(water.water_amount);
    } else {
      const meal = item as MealSchedule;
      setEditingMeal(meal);
      try {
        const timeParts = meal.fd_time.trim().split(' ');
        if (timeParts.length >= 2) {
          const time = timeParts[0].split(':');
          if (time.length >= 2) {
            setFeedingTime({
              hour: time[0],
              minute: time[1],
              period: timeParts[1] || 'AM',
            });
          }
        }
      } catch (error) {
        setFeedingTime({ hour: '6', minute: '45', period: 'AM' });
      }
      
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
    }
    setShowEditView(true);
  };

  const handleAdd = (): void => {
    if (isWater) {
      setEditingWater(null);
      setFeedingTime({ hour: '6', minute: '00', period: 'AM' });
      setSelectedPeriod('Morning');
      setWaterAmount('');
    } else {
      setEditingMeal(null);
      setFeedingTime({ hour: '6', minute: '45', period: 'AM' });
      setFeedTypes([
        { id: '1', name: 'Hay', amount: '', image: FOOD_IMAGES.hay },
        { id: '2', name: 'Oats', amount: '', image: FOOD_IMAGES.oats },
        { id: '3', name: 'Grains', amount: '', image: FOOD_IMAGES.grains },
        { id: '4', name: 'Carrots', amount: '', image: FOOD_IMAGES.carrots },
        { id: '5', name: 'Apples', amount: '', image: FOOD_IMAGES.apples },
        { id: '6', name: 'Pellets', amount: '', image: FOOD_IMAGES.pellets },
      ]);
    }
    setShowAddView(true);
  };

  const handleTimeChange = (field: 'hour' | 'minute' | 'period', value: string): void => {
    if (field === 'hour') {
      setFeedingTime(prev => ({ ...prev, hour: value }));
    } else if (field === 'minute') {
      setFeedingTime(prev => ({ ...prev, minute: value }));
    } else if (field === 'period') {
      setFeedingTime(prev => ({ ...prev, period: value.toUpperCase() }));
    }
  };

  const handleAmountChange = (id: string, amount: string): void => {
    setFeedTypes(prev => prev.map(feed => feed.id === id ? { ...feed, amount } : feed));
  };

  const handleAddFeedType = (): void => {
    Alert.prompt('Add Feed Type', 'Enter the name of the new feed type:', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Add', onPress: (text?: string) => {
        if (text && text.trim()) {
          const newId = (feedTypes.length + 1).toString();
          setFeedTypes(prev => [...prev, { 
            id: newId, 
            name: text.trim(), 
            amount: '',
            image: FOOD_IMAGES.default 
          }]);
        }
      }}
    ]);
  };

  const handleSaveChanges = async (): Promise<void> => {
    if (isWater) {
      if (!waterAmount.trim()) {
        Alert.alert('Error', 'Please specify water amount.');
        return;
      }
    } else {
      const activeFeed = feedTypes.find(feed => feed.amount.trim() !== '');
      if (!activeFeed) {
        Alert.alert('Error', 'Please specify at least one feed type with an amount.');
        return;
      }
    }

    if (!feedingTime.hour || !feedingTime.minute) {
      Alert.alert('Error', 'Please enter a valid time.');
      return;
    }

    // Validate time is not in the past (only for new schedules, not editing)
    if (!showEditView && isTimeInPast(feedingTime.hour, feedingTime.minute, feedingTime.period)) {
      Alert.alert(
        'Invalid Time', 
        'You cannot add a schedule for a time that has already passed. Please select a future time.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSaving(true);
    
    const paddedHour = feedingTime.hour.padStart(2, '0');
    const paddedMinute = feedingTime.minute.padStart(2, '0');
    const updatedTime = `${paddedHour}:${paddedMinute} ${feedingTime.period}`;
    
    try {
      let result;
      
      if (isWater) {
        const waterData = {
          water_period: selectedPeriod,
          water_amount: waterAmount.trim(),
          water_time: updatedTime,
          kutsero_id: userId,
          horse_id: horseId,
          completed: false,
          user_type: 'kutsero',
          ...(editingWater && { water_id: editingWater.water_id })
        };
        result = await saveWaterSchedule(waterData);
      } else {
        const activeFeed = feedTypes.find(feed => feed.amount.trim() !== '');
        const mealType = getMealName(updatedTime);
        const feedData = {
          fd_meal_type: mealType,
          fd_food_type: activeFeed!.name,
          fd_qty: activeFeed!.amount.trim(),
          fd_time: updatedTime,
          kutsero_id: userId,
          horse_id: horseId,
          completed: false,
          user_type: 'kutsero',
          ...(editingMeal && { fd_id: editingMeal.fd_id })
        };
        result = await saveFeedingSchedule(feedData);
      }
      
      if (result.success) {
        await loadSchedule();
        setShowEditView(false);
        setShowAddView(false);
        
        Alert.alert(
          'Success', 
          `${isWater ? 'Water' : 'Feeding'} schedule ${showEditView ? 'updated' : 'added'} successfully for ${horseName}!`
        );
      } else {
        Alert.alert('Error', result.error || `Failed to save ${isWater ? 'water' : 'feeding'} schedule. Please try again.`);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (): void => {
    setShowEditView(false);
    setShowAddView(false);
  };

  const handleMarkAsComplete = async (itemId: string) => {
    try {
      const result = isWater 
        ? await markWaterCompleted(userId, horseId, itemId, userName, horseName)
        : await markFeedCompleted(userId, horseId, itemId, userName, horseName);
      
      if (result.success) {
        await loadSchedule();
        Alert.alert(
          'Success', 
          result.message || `${isWater ? 'Water marked as given' : 'Meal marked as fed'} for ${horseName}!`,
          [{ text: 'OK', onPress: () => setShowLog(true) }]
        );
      } else {
        Alert.alert('Error', result.error || `Failed to mark as ${isWater ? 'given' : 'fed'}. Please try again.`);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const resetDaily = async (): Promise<void> => {
    Alert.alert(
      `Reset Daily ${isWater ? 'Water' : 'Feeds'}`, 
      `Are you sure you want to reset all ${isWater ? 'watering' : 'feeding'} statuses for today?`, 
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: async () => {
          try {
            const result = await resetDailyAPI(userId, horseId, feedType);
            
            if (result.success) {
              await loadSchedule();
              Alert.alert('Success', result.message || `Daily ${isWater ? 'water' : 'feeds'} reset successfully`);
            } else {
              Alert.alert('Error', result.error || `Failed to reset. Please try again.`);
            }
          } catch (error) {
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
          }
        }}
      ]
    );
  };

  const handleShowLog = () => {
    setShowLog(true);
  };

  const handleRefreshLogs = async () => {
    try {
      if (isWater) {
        const logs = await fetchWaterLogs(userId, horseId);
        setWaterLogs(logs);
      } else {
        const logs = await fetchFeedLogs(userId, horseId);
        setFeedLogs(logs);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to refresh ${isWater ? 'water' : 'feed'} logs. Please try again.`);
    }
  };

  // Theme colors
  const themeColor = isWater ? '#06B6D4' : '#CD853F';
  const headerIcon = isWater ? 'tint' : 'horse-head';
  const emptyIcon = isWater ? 'tint' : 'utensils';

  // ============================================================================
  // RENDER LOG PAGE
  // ============================================================================
  if (showLog) {
    return isWater ? (
      <WaterLogPage 
        onBack={() => setShowLog(false)}
        logs={waterLogs}
        horseName={horseName}
        onRefresh={handleRefreshLogs}
      />
    ) : (
      <FeedLogPage 
        onBack={() => setShowLog(false)}
        logs={feedLogs}
        horseName={horseName}
        onRefresh={handleRefreshLogs}
      />
    );
  }

  // ============================================================================
  // RENDER EDIT/ADD VIEW
  // ============================================================================
  if (showEditView || showAddView) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColor }]}>
        <View style={[styles.header, { backgroundColor: themeColor }]}>
          <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
            <FontAwesome5 name="arrow-left" size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {showEditView ? `Edit ${isWater ? 'Water' : 'Meal'}` : `Add New ${isWater ? 'Water' : 'Meal'}`}
          </Text>
          <View style={styles.placeholder} />
        </View>
        
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{isWater ? 'Watering' : 'Feeding'} Time</Text>
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

            {isWater ? (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Period</Text>
                  <View style={styles.periodContainer}>
                    {periods.map((period) => (
                      <TouchableOpacity
                        key={period}
                        style={[
                          styles.periodButton,
                          selectedPeriod === period && styles.periodButtonActive,
                          { borderColor: getPeriodColor(period) }
                        ]}
                        onPress={() => setSelectedPeriod(period)}
                      >
                        <FontAwesome5 
                          name={getPeriodIcon(period)} 
                          size={18} 
                          color={selectedPeriod === period ? '#fff' : getPeriodColor(period)} 
                        />
                        <Text style={[
                          styles.periodButtonText,
                          selectedPeriod === period && styles.periodButtonTextActive
                        ]}>
                          {period}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Water Amount</Text>
                  <TextInput 
                    style={styles.amountInputFull} 
                    value={waterAmount} 
                    onChangeText={setWaterAmount} 
                    placeholder="Enter water amount (e.g., 5 liters)" 
                  />
                </View>
              </>
            ) : (
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
            )}
          </View>
        </ScrollView>

        <View style={styles.bottomButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled, { backgroundColor: saving ? '#9CA3AF' : themeColor }]} 
            onPress={handleSaveChanges}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving 
                ? 'Saving...' 
                : showEditView 
                  ? 'Save Changes' 
                  : `Add ${isWater ? 'Schedule' : 'Meal'}`
              }
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ============================================================================
  // RENDER MAIN SCHEDULE VIEW
  // ============================================================================
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColor }]}>
      <StatusBar barStyle="light-content" backgroundColor={themeColor} />
      
      <View style={[styles.header, { backgroundColor: themeColor }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <FontAwesome5 name={headerIcon} size={20} color="#fff" />
          <Text style={styles.headerTitle}>{horseName} {isWater ? 'Water' : 'Feeds'}</Text>
        </View>
        
        <TouchableOpacity style={styles.logButton} onPress={handleShowLog}>
          <FontAwesome5 name="clipboard-list" size={14} color="#fff" />
          <Text style={styles.logText}>Log</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading {isWater ? 'water' : 'feeding'} schedule...</Text>
            </View>
          ) : (isWater ? waterSchedule : feedingSchedule).length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome5 name={emptyIcon} size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No {isWater ? 'water' : 'feeding'} schedule found</Text>
              <Text style={styles.emptySubtitle}>Add your first {isWater ? 'watering schedule' : 'meal'} to get started</Text>
            </View>
          ) : isWater ? (
            waterSchedule.map((water) => (
              <View key={water.water_id} style={styles.scheduleCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.itemInfo}>
                    <View style={styles.periodRow}>
                      <View style={[
                        styles.periodIndicator, 
                        { backgroundColor: getPeriodColor(water.water_period) }
                      ]}>
                        <FontAwesome5 
                          name={getPeriodIcon(water.water_period)} 
                          size={14} 
                          color="#fff" 
                        />
                      </View>
                      <Text style={styles.itemTitle}>{water.water_period}</Text>
                    </View>
                    <Text style={styles.itemTime}>{water.water_time}</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.editButton, isWater && { backgroundColor: '#ECFEFF', borderColor: '#A5F3FC' }]} 
                    onPress={() => handleEdit(water)}
                  >
                    <FontAwesome5 name="edit" size={14} color={themeColor} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.cardContent}>
                  <View style={styles.detailInfo}>
                    <View style={styles.feedTypeRow}>
                      <FontAwesome5 name="tint" size={18} color={water.completed ? '#10B981' : '#06B6D4'} />
                      <Text style={styles.feedType}>{water.water_amount}</Text>
                    </View>
                  </View>
                  
                  {water.completed ? (
                    <View style={styles.completedBadge}>
                      <View style={styles.completedIconContainer}>
                        <FontAwesome5 name="check" size={14} color="#fff" />
                      </View>
                      <View style={styles.completedTextContainer}>
                        <Text style={styles.completedText}>Completed</Text>
                        {water.completed_by && (
                          <Text style={styles.completedByText}>by {water.completed_by}</Text>
                        )}
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.markButton} 
                      onPress={() => handleMarkAsComplete(water.water_id)}
                    >
                      <Text style={styles.markButtonText}>Mark as Given</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          ) : (
            feedingSchedule.map((meal) => (
              <View key={meal.fd_id} style={styles.scheduleCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>{meal.fd_meal_type}</Text>
                    <Text style={styles.itemTime}>{meal.fd_time}</Text>
                  </View>
                  <TouchableOpacity style={styles.editButton} onPress={() => handleEdit(meal)}>
                    <FontAwesome5 name="edit" size={14} color="#3B82F6" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.cardContent}>
                  <View style={styles.detailInfo}>
                    <View style={styles.feedInfoContainer}>
                      <Image 
                        source={{ uri: getFoodImage(meal.fd_food_type) }} 
                        style={styles.foodImage}
                        resizeMode="cover"
                      />
                      <View style={styles.feedTextContainer}>
                        <Text style={styles.feedType}>{meal.fd_food_type}</Text>
                        <Text style={styles.feedAmount}>{meal.fd_qty}</Text>
                      </View>
                    </View>
                  </View>
                  
                  {meal.completed ? (
                    <View style={styles.completedBadge}>
                      <View style={styles.completedIconContainer}>
                        <FontAwesome5 name="check" size={14} color="#fff" />
                      </View>
                      <View style={styles.completedTextContainer}>
                        <Text style={styles.completedText}>Completed</Text>
                        {meal.completed_by && (
                          <Text style={styles.completedByText}>by {meal.completed_by}</Text>
                        )}
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.markButton} 
                      onPress={() => handleMarkAsComplete(meal.fd_id)}
                    >
                      <Text style={styles.markButtonText}>Mark as Fed</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
          
          <TouchableOpacity style={[styles.addButton, { backgroundColor: '#10B981' }]} onPress={handleAdd}>
            <View style={styles.addIconContainer}>
              <FontAwesome5 name="plus" size={16} color="#fff" />
            </View>
            <Text style={styles.addButtonText}>Add New {isWater ? 'Water Schedule' : 'Meal'}</Text>
          </TouchableOpacity>
          
          {(isWater ? waterSchedule : feedingSchedule).length > 0 && (
            <TouchableOpacity style={styles.resetButton} onPress={resetDaily}>
              <View style={styles.resetIconContainer}>
                <FontAwesome5 name="redo" size={14} color="#fff" />
              </View>
              <Text style={styles.resetButtonText}>Reset Daily {isWater ? 'Water' : 'Feeds'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center', marginHorizontal: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginLeft: 8 },
  logButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.15)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22 },
  logText: { color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  placeholder: { width: 44 },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20 },
  section: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.1)' },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  timeInputContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  timeInput: { borderWidth: 2, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 18, fontWeight: '600', backgroundColor: '#F8FAFC', width: 70, textAlign: 'center', color: '#1E293B' },
  timeSeparator: { fontSize: 20, fontWeight: '700', color: '#64748B', marginHorizontal: 12 },
  periodInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F8FAFC', width: 90, marginLeft: 15 },
  periodInputText: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  dropdownContainer: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 8, minWidth: 150, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  dropdownOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 8, marginHorizontal: 8 },
  dropdownOptionActive: { backgroundColor: '#EFF6FF' },
  dropdownOptionText: { fontSize: 16, fontWeight: '600', color: '#334155' },
  dropdownOptionTextActive: { color: '#3B82F6' },
  periodContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  periodButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, paddingVertical: 14, borderWidth: 2, gap: 8 },
  periodButtonActive: { backgroundColor: '#06B6D4', borderColor: '#06B6D4' },
  periodButtonText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  periodButtonTextActive: { color: '#fff' },
  amountInputFull: { backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, fontWeight: '500', borderWidth: 2, borderColor: '#E2E8F0', color: '#334155' },
  feedTypesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  feedTypeCard: { width: '48%', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 2, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  feedTypeHeader: { flexDirection: 'column', alignItems: 'center', marginBottom: 12 },
  feedImage: { width: 60, height: 60, borderRadius: 12, marginBottom: 8 },
  feedTypeName: { fontSize: 16, fontWeight: '700', color: '#1E293B', textAlign: 'center' },
  amountInput: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontWeight: '500', borderWidth: 2, borderColor: '#E2E8F0', color: '#334155', textAlign: 'center' },
  addFeedButton: { backgroundColor: '#3B82F6', borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  addFeedButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  bottomButtons: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 20, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', gap: 12 },
  cancelButton: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#94A3B8', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14, flex: 1, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cancelButtonText: { color: '#64748B', fontSize: 16, fontWeight: '600' },
  saveButton: { borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14, flex: 1, alignItems: 'center', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  saveButtonDisabled: { backgroundColor: '#9CA3AF', shadowOpacity: 0, elevation: 0 },
  scheduleCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 4, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.1)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 22, fontWeight: '700', color: '#1E293B', marginBottom: 6 },
  itemTime: { fontSize: 15, color: '#64748B', fontWeight: '500', backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  periodRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  periodIndicator: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  editButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#BFDBFE' },
  cardContent: { gap: 16 },
  detailInfo: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  feedInfoContainer: { flexDirection: 'row', alignItems: 'center' },
  foodImage: { width: 60, height: 60, borderRadius: 12, marginRight: 16 },
  feedTextContainer: { flex: 1 },
  feedTypeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  feedType: { fontSize: 18, fontWeight: '600', color: '#334155' },
  feedAmount: { fontSize: 15, color: '#64748B', fontWeight: '500', marginTop: 4 },
  completedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#A7F3D0' },
  completedIconContainer: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  completedTextContainer: { flex: 1 },
  completedText: { color: '#059669', fontSize: 16, fontWeight: '600' },
  completedByText: { color: '#059669', fontSize: 12, fontWeight: '500', marginTop: 2 },
  markButton: { backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  markButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, marginBottom: 16, shadowColor: '#10B981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  addIconContainer: { backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 12, width: 32, height: 32, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resetButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EF4444', paddingVertical: 16, borderRadius: 16, marginTop: 20, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  resetIconContainer: { backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 10, width: 28, height: 28, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  resetButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { fontSize: 16, color: '#64748B', fontWeight: '500' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#374151', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 16, color: '#64748B', textAlign: 'center', lineHeight: 24 },
});