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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

type Meal = {
  fd_id: string;
  fd_food_type: string;
  fd_qty: string;
  fd_time: string;
  fd_meal_type: string;
  completed?: boolean;
  completed_at?: string;
  user_id: string;
  horse_id: string;
};

type FeedType = {
  id: string;
  name: string;
  amount: string;
};

const API_BASE_URL = "http://172.20.10.2:8000/api/horse_operator";

const FeedScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const horseName = params.horseName as string || 'Unknown Horse';
  const horseId = params.horseId as string || '';
  const [currentUser, setCurrentUser] = useState<string>('');
    
  const [feedingSchedule, setFeedingSchedule] = useState<Meal[]>([]);
  const [showEditView, setShowEditView] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
    
  const [feedingTime, setFeedingTime] = useState({
    hour: '6',
    minute: '45',
    period: 'AM',
  });

  const [feedTypes, setFeedTypes] = useState<FeedType[]>([
    { id: '1', name: 'Chaff', amount: '' },
    { id: '2', name: 'Resolve', amount: '' },
    { id: '3', name: 'Dynavy', amount: '' },
    { id: '4', name: 'Magnesium', amount: '' },
  ]);

  // Helper function to generate UUID
  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Consistent meal name determination - matches backend logic EXACTLY
  const getMealName = (time: string): string => {
    try {
      // Split time and period
      const timeParts = time.split(' ');
      const timeComponent = timeParts[0];
      const period = timeParts[1] || 'AM';
      
      // Parse hour
      const hour = parseInt(timeComponent.split(':')[0]);
      
      // Convert to 24-hour format - EXACT MATCH with backend
      let hour24: number;
      if (period.toUpperCase() === 'PM' && hour !== 12) {
        hour24 = hour + 12;
      } else if (period.toUpperCase() === 'AM' && hour === 12) {
        hour24 = 0;
      } else {
        hour24 = hour;
      }
      
      // Classify meal based on 24-hour time - EXACT MATCH with backend
      if (hour24 < 10) {
        return 'Breakfast';  // 12:00 AM - 9:59 AM
      } else if (hour24 < 16) {
        return 'Lunch';      // 10:00 AM - 3:59 PM
      } else {
        return 'Dinner';     // 4:00 PM - 11:59 PM
      }
    } catch (error) {
      console.error('Error parsing time:', error);
      return 'Meal'; // Default fallback
    }
  };

  // Helper function to get meal order for sorting
  const getMealOrder = (mealType: string): number => {
    switch (mealType) {
      case 'Breakfast': return 1;
      case 'Lunch': return 2;
      case 'Dinner': return 3;
      default: return 4;
    }
  };

  // Load user ID from SecureStore
  const getCurrentUser = async (): Promise<string | null> => {
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
  };

  // Save feeding schedule to backend - FIXED to match backend expectations
  const saveFeedingSchedule = useCallback(async (schedule: Meal[], userId?: string): Promise<void> => {
    try {
      const userIdToUse = userId || currentUser;
      if (!userIdToUse || !horseId) {
        console.error("Missing user_id or horse_id");
        return;
      }

      // Transform frontend format to EXACTLY match backend expectations
      const backendSchedule = schedule.map(meal => ({
        fd_id: meal.fd_id,
        food: meal.fd_food_type,           // Backend expects "food"
        amount: meal.fd_qty,               // Backend expects "amount"
        time: meal.fd_time,                // Backend expects "time"
        completed: meal.completed || false,
        completed_at: meal.completed_at
      }));

      const payload = {
        user_id: userIdToUse,
        horse_id: horseId,
        schedule: backendSchedule
      };

      console.log("Sending payload to backend:", JSON.stringify(payload, null, 2));

      const response = await fetch(`${API_BASE_URL}/save_feeding_schedule/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Backend error:", errorData);
        throw new Error(errorData.error || 'Failed to save feeding schedule');
      }

      const result = await response.json();
      console.log("Backend response:", result);
      console.log("Feeding schedule saved successfully");
    } catch (error) {
      console.error('Error saving feeding schedule:', error);
      Alert.alert('Error', 'Failed to save feeding schedule: ' + (error instanceof Error ? error.message : String(error)));    }
  }, [currentUser, horseId]);

  // Create default schedule - FIXED to include required fields
  const createDefaultSchedule = useCallback(async (userId: string) => {
    const defaultSchedule: Meal[] = [
      {
        fd_id: generateUUID(),
        fd_food_type: 'Chaff',
        fd_qty: '3 scoops',
        fd_time: '6:45 AM',
        fd_meal_type: 'Breakfast',
        completed: false,
        user_id: userId,
        horse_id: horseId,
      },
      {
        fd_id: generateUUID(),
        fd_food_type: 'Chaff',
        fd_qty: '3 scoops',
        fd_time: '12:00 PM',
        fd_meal_type: 'Lunch',
        completed: false,
        user_id: userId,
        horse_id: horseId,
      },
      {
        fd_id: generateUUID(),
        fd_food_type: 'Chaff',
        fd_qty: '3 scoops',
        fd_time: '7:15 PM',
        fd_meal_type: 'Dinner',
        completed: false,
        user_id: userId,
        horse_id: horseId,
      },
    ];
    setFeedingSchedule(defaultSchedule);
    await saveFeedingSchedule(defaultSchedule, userId);
  }, [horseId, saveFeedingSchedule]);

  // Load feeding schedule from backend - FIXED to handle backend response format
  const loadFeedingSchedule = useCallback(async (userId: string): Promise<void> => {
    if (!userId || !horseId) return;

    try {
      const url = `${API_BASE_URL}/get_feeding_schedule/?user_id=${encodeURIComponent(userId)}&horse_id=${encodeURIComponent(horseId)}`;
      console.log("Fetching feeding schedule:", url);

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log("Raw backend data:", JSON.stringify(data, null, 2));
        
        if (data && data.length > 0) {
          // Transform backend format to frontend format - FIXED field mapping
          const transformedData: Meal[] = data.map((item: any) => ({
            fd_id: item.fd_id,
            fd_food_type: item.fd_food_type,
            fd_qty: item.fd_qty,
            fd_time: item.fd_time,
            fd_meal_type: item.fd_meal_type,
            completed: item.completed || false,
            completed_at: item.completed_at,
            user_id: item.user_id,
            horse_id: item.horse_id
          }));
          
          // Sort meals by proper order (Breakfast, Lunch, Dinner)
          const sortedData = transformedData.sort((a, b) => 
            getMealOrder(a.fd_meal_type) - getMealOrder(b.fd_meal_type)
          );
          
          console.log("Transformed and sorted data:", JSON.stringify(sortedData, null, 2));
          setFeedingSchedule(sortedData);
        } else {
          console.log("No existing schedule, creating default");
          await createDefaultSchedule(userId);
        }
      } else {
        console.log("No existing feeding schedule found, creating default");
        await createDefaultSchedule(userId);
      }
    } catch (error: unknown) {
      console.error('Error loading feeding schedule:', error);
      await createDefaultSchedule(userId);
    }
  }, [horseId, createDefaultSchedule]);

  // Load data on component mount
  useEffect(() => {
    const initializeData = async () => {
      const userId = await getCurrentUser();
      if (userId && horseId) {
        await loadFeedingSchedule(userId);
      }
    };
    initializeData();
  }, [horseId, loadFeedingSchedule]);

  // Mark meal as fed - FIXED to match backend API expectations
  const handleMarkAsFed = async (meal: Meal): Promise<void> => {
    if (!currentUser) {
      Alert.alert('Error', 'User not found');
      return;
    }

    try {
      const now = new Date();
      const completedAt = now.toISOString();

      console.log("Marking meal as fed:", {
        user_id: currentUser,
        horse_id: horseId,
        fd_id: meal.fd_id,
        completed_at: completedAt,
      });

      // Call backend API to mark meal as fed (this also handles logging)
      const response = await fetch(`${API_BASE_URL}/mark_meal_fed/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: currentUser,
          horse_id: horseId,
          fd_id: meal.fd_id,
          completed_at: completedAt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Mark as fed error:", errorData);
        throw new Error(errorData.error || 'Failed to mark meal as fed');
      }
          
      const result = await response.json();
      console.log("Mark as fed response:", result);

      // Update local state and maintain sort order
      const updatedSchedule = feedingSchedule.map(m =>
        m.fd_id === meal.fd_id 
          ? { ...m, completed: true, completed_at: completedAt }
          : m
      ).sort((a, b) => getMealOrder(a.fd_meal_type) - getMealOrder(b.fd_meal_type));
          
      setFeedingSchedule(updatedSchedule);
          
      Alert.alert('Success', `Meal marked as fed for ${horseName}!`);
    } catch (error: any) {
      console.error('Error marking meal as fed:', error);
      Alert.alert('Error', error.message || 'Failed to mark meal as fed');
    }
  };

  // Reset daily completion status - FIXED to match backend API
  const resetDailyFeeds = async (): Promise<void> => {
    if (!currentUser) {
      Alert.alert('Error', 'User not found');
      return;
    }

    Alert.alert(
      'Reset Daily Feeds',
      'Are you sure you want to reset all feeding statuses for today?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/reset_daily_feeds/`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  user_id: currentUser,
                  horse_id: horseId,
                }),
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to reset daily feeds');
              }

              // Update local state and maintain sort order
              const resetSchedule = feedingSchedule.map(meal => ({
                ...meal,
                completed: false,
                completed_at: undefined,
              })).sort((a, b) => getMealOrder(a.fd_meal_type) - getMealOrder(b.fd_meal_type));
                  
              setFeedingSchedule(resetSchedule);
              Alert.alert('Success', 'Daily feeds reset successfully');
            } catch (error: any) {
              console.error('Error resetting daily feeds:', error);
              Alert.alert('Error', error.message || 'Failed to reset daily feeds');
            }
          }
        }
      ]
    );
  };

  const handleEdit = (meal: Meal): void => {
    setEditingMeal(meal);
    // Parse the time from the meal
    const timeParts = meal.fd_time.split(' ');
    const time = timeParts[0].split(':');
    setFeedingTime({
      hour: time[0],
      minute: time[1],
      period: timeParts[1] || 'AM',
    });
          
    // Reset feed types for editing
    setFeedTypes([
      { id: '1', name: 'Chaff', amount: meal.fd_food_type === 'Chaff' ? meal.fd_qty : '' },
      { id: '2', name: 'Resolve', amount: meal.fd_food_type === 'Resolve' ? meal.fd_qty : '' },
      { id: '3', name: 'Dynavy', amount: meal.fd_food_type === 'Dynavy' ? meal.fd_qty : '' },
      { id: '4', name: 'Magnesium', amount: meal.fd_food_type === 'Magnesium' ? meal.fd_qty : '' },
    ]);
          
    setShowEditView(true);
  };

  const handleFeedLog = (): void => {
    router.push('/HORSE_OPERATOR/Hfeedlog');
  };

  const handleTimeChange = (field: 'hour' | 'minute' | 'period', value: string): void => {
    setFeedingTime(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAmountChange = (id: string, amount: string): void => {
    setFeedTypes(prev =>
      prev.map(feed =>
        feed.id === id ? { ...feed, amount } : feed
      )
    );
  };

  const handleAddFeedType = (): void => {
    Alert.prompt(
      'Add Feed Type',
      'Enter the name of the new feed type:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: (text) => {
            if (text && text.trim()) {
              const newId = (feedTypes.length + 1).toString();
              setFeedTypes(prev => [
                ...prev,
                { id: newId, name: text.trim(), amount: '' }
              ]);
            }
          }
        }
      ]
    );
  };

  const handleSaveChanges = async (): Promise<void> => {
    const activeFeed = feedTypes.find(feed => feed.amount.trim() !== '');
          
    if (!activeFeed) {
      Alert.alert('Error', 'Please specify at least one feed type with an amount.');
      return;
    }
          
    if (!editingMeal || !currentUser) return;

    try {
      // Update the feeding schedule
      const updatedTime = `${feedingTime.hour}:${feedingTime.minute} ${feedingTime.period}`;
      const mealType = getMealName(updatedTime);

      const updatedSchedule = feedingSchedule.map(meal =>
        meal.fd_id === editingMeal.fd_id
          ? {
              ...meal,
              fd_time: updatedTime,
              fd_food_type: activeFeed.name,
              fd_qty: activeFeed.amount,
              fd_meal_type: mealType,
              completed: false, // Reset completion status when edited
              completed_at: undefined,
            }
          : meal
      ).sort((a, b) => getMealOrder(a.fd_meal_type) - getMealOrder(b.fd_meal_type));
          
      setFeedingSchedule(updatedSchedule);
      
      // Save to backend
      await saveFeedingSchedule(updatedSchedule);

      setShowEditView(false);
      Alert.alert('Success', `Feeding schedule updated successfully for ${horseName}!`);
    } catch (error) {
      console.error('Error saving changes:', error);
      Alert.alert('Error', 'Failed to save changes');
    }
  };

  const handleCancel = (): void => {
    setShowEditView(false);
  };

  // Edit View
  if (showEditView) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {/* Edit Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowEditView(false)} style={styles.backButton}>
            <FontAwesome5 name="arrow-left" size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Meal</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Feeding Time Section */}
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
                <TextInput
                  style={styles.periodInput}
                  value={feedingTime.period}
                  onChangeText={(value) => handleTimeChange('period', value.toUpperCase())}
                  placeholder="AM/PM"
                  maxLength={2}
                />
              </View>
            </View>

            {/* Feed Types & Amounts Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Feed Types & Amounts</Text>
              <View style={styles.feedTypesGrid}>
                {feedTypes.map((feed) => (
                  <View key={feed.id} style={styles.feedTypeCard}>
                    <Text style={styles.feedTypeName}>{feed.name}</Text>
                    <TextInput
                      style={styles.amountInput}
                      value={feed.amount}
                      onChangeText={(value) => handleAmountChange(feed.id, value)}
                      placeholder="Enter amount"
                    />
                  </View>
                ))}
              </View>

              {/* Add Feed Type Button */}
              <TouchableOpacity style={styles.addFeedButton} onPress={handleAddFeedType}>
                <Text style={styles.addFeedButtonText}>Add Feed Type</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Buttons */}
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
        <TouchableOpacity style={styles.feedLogButton} onPress={handleFeedLog}>
          <FontAwesome5 name="clipboard-list" size={14} color="#fff" />
          <Text style={styles.feedLogText}>Log</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {feedingSchedule.map((meal) => (
            <View key={meal.fd_id} style={styles.mealCard}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.mealInfo}>
                  <Text style={styles.mealTitle}>{meal.fd_meal_type}</Text>
                  <Text style={styles.mealTime}>{meal.fd_time}</Text>
                </View>
                <TouchableOpacity style={styles.editButton} onPress={() => handleEdit(meal)}>
                  <FontAwesome5 name="edit" size={14} color="#3B82F6" />
                </TouchableOpacity>
              </View>

              {/* Card Content */}
              <View style={styles.cardContent}>
                <View style={styles.feedInfo}>
                  <View style={styles.feedTypeRow}>
                    <FontAwesome5 
                      name={meal.fd_meal_type === 'Breakfast' ? 'sun' : meal.fd_meal_type === 'Lunch' ? 'cloud-sun' : 'moon'} 
                      size={18} 
                      color={meal.completed ? '#10B981' : '#8B5A2B'} 
                    />
                    <Text style={styles.feedType}>{meal.fd_food_type}</Text>
                  </View>
                  <Text style={styles.feedAmount}>{meal.fd_qty}</Text>
                </View>

                {meal.completed ? (
                  <View style={styles.completedBadge}>
                    <View style={styles.completedIconContainer}>
                      <FontAwesome5 name="check" size={14} color="#fff" />
                    </View>
                    <Text style={styles.completedText}>Completed</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.markFedButton}
                    onPress={() => handleMarkAsFed(meal)}
                  >
                    <Text style={styles.markFedButtonText}>Mark as Fed</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          {/* Reset Button */}
          <TouchableOpacity style={styles.resetButton} onPress={resetDailyFeeds}>
            <View style={styles.resetIconContainer}>
              <FontAwesome5 name="redo" size={14} color="#fff" />
            </View>
            <Text style={styles.resetButtonText}>Reset Daily Feeds</Text>
          </TouchableOpacity>
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
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
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
  feedLogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backdropFilter: 'blur(10px)',
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  mealInfo: {
    flex: 1,
  },
  mealTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
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
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
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
  feedTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 12,
  },
  feedAmount: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  completedBadge: {
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
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 20,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  resetIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Edit View Styles
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
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600',
    backgroundColor: '#F8FAFC',
    width: 90,
    textAlign: 'center',
    marginLeft: 15,
    color: '#1E293B',
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
  feedTypeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 12,
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
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default FeedScreen;