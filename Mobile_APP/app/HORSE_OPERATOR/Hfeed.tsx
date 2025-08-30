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
  id: string;
  meal: string;
  food: string;
  amount: string;
  time: string;
  completed?: boolean;
  completedAt?: string;
};

type FeedType = {
  id: string;
  name: string;
  amount: string;
};

type FeedLogEntry = {
  id: string;
  date: string;
  meal: string;
  horse: string;
  time: string;
  food: string;
  amount: string;
  status: string;
  action: 'completed' | 'edited';
  timestamp: string;
};

const API_BASE_URL = "http://192.168.101.2:8000/api/horse_operator";

const FeedScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const horseName = params.horseName as string || 'Unknown Horse';
  const horseId = params.horseId as string || '';
  const [currentUser, setCurrentUser] = useState<string>('');
    
  const [feedingSchedule, setFeedingSchedule] = useState<Meal[]>([
    {
      id: '1',
      meal: 'Breakfast',
      food: 'Chaff',
      amount: '3 scoops',
      time: '6:45 AM',
      completed: false,
    },
    {
      id: '2',
      meal: 'Lunch',
      food: 'Chaff',
      amount: '3 scoops',
      time: '12:00 PM',
      completed: false,
    },
    {
      id: '3',
      meal: 'Dinner',
      food: 'Chaff',
      amount: '3 scoops',
      time: '7:15 PM',
      completed: false,
    },
  ]);
  const [showEditView, setShowEditView] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
    
  const [feedingTime, setFeedingTime] = useState({
    hour: '6',
    minute: '45',
    period: 'AM',
  });

  const [feedTypes, setFeedTypes] = useState<FeedType[]>([
    { id: '1', name: 'Chaff', amount: '3 scoops' },
    { id: '2', name: 'Resolve', amount: '' },
    { id: '3', name: 'Dynavy', amount: '' },
    { id: '4', name: 'Magnesium', amount: '' },
  ]);

  // Load user ID from SecureStore
  const getCurrentUser = async () => {
    try {
      const storedUser = await SecureStore.getItemAsync("user_data");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const id = parsed.user_id || parsed.id;
        if (id) {
          console.log("🔑 Loaded user_id from storage:", id);
          setCurrentUser(id);
          return id;
        }
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
    return null;
  };

  // Load feeding schedule from backend
  const loadFeedingSchedule = useCallback(async (userId: string) => {
    if (!userId || !horseId) return;

    try {
      const url = `${API_BASE_URL}/get_feeding_schedule/?user_id=${encodeURIComponent(userId)}&horse_id=${encodeURIComponent(horseId)}`;
      console.log("📡 Fetching feeding schedule:", url);

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Feeding schedule loaded:", data);
        
        if (data && data.length > 0) {
          // Map backend data to frontend format
          const mappedSchedule = data.map((item: any) => ({
            id: item.meal_id,
            meal: item.meal,
            food: item.food,
            amount: item.amount,
            time: item.time,
            completed: item.completed || false,
            completedAt: item.completed_at,
          }));
          setFeedingSchedule(mappedSchedule);
        }
      } else {
        console.log("No existing feeding schedule found, using default");
      }
    } catch (error) {
      console.error('Error loading feeding schedule:', error);
    }
  }, [horseId]);

  // Save feeding schedule to backend
  const saveFeedingSchedule = async (schedule: Meal[], userId?: string) => {
    try {
      const userIdToUse = userId || currentUser;
      if (!userIdToUse || !horseId) {
        console.error("Missing user_id or horse_id");
        return;
      }

      const payload = {
        user_id: userIdToUse,
        horse_id: horseId,
        schedule: schedule.map(meal => ({
          id: meal.id,
          meal: meal.meal,
          food: meal.food,
          amount: meal.amount,
          time: meal.time,
          completed: meal.completed || false,
          completedAt: meal.completedAt,
        }))
      };

      const response = await fetch(`${API_BASE_URL}/save_feeding_schedule/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save feeding schedule');
      }

      console.log("✅ Feeding schedule saved successfully");
    } catch (error) {
      console.error('Error saving feeding schedule:', error);
      Alert.alert('Error', 'Failed to save feeding schedule');
    }
  };

  // Add entry to backend feed log
  const addToFeedLog = async (entry: Omit<FeedLogEntry, 'id'>) => {
    try {
      if (!currentUser) return;

      const payload = {
        user_id: currentUser,
        date: entry.date,
        meal: entry.meal,
        horse: entry.horse,
        time: entry.time,
        food: entry.food,
        amount: entry.amount,
        status: entry.status,
        action: entry.action,
        timestamp: entry.timestamp,
      };

      const response = await fetch(`${API_BASE_URL}/add_feed_log_entry/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add feed log entry');
      }

      console.log("✅ Feed log entry added successfully");
    } catch (error) {
      console.error('Error adding to feed log:', error);
    }
  };

  // Load data on component mount
  useEffect(() => {
    const initializeData = async () => {
      const userId = await getCurrentUser();
      if (userId && horseId) {
        loadFeedingSchedule(userId);
      }
    };
    initializeData();
  }, [horseId, loadFeedingSchedule]);

  // Mark meal as fed
  const handleMarkAsFed = async (meal: Meal) => {
    if (!currentUser) {
      Alert.alert('Error', 'User not found');
      return;
    }

    try {
      const now = new Date();
      const completedAt = now.toLocaleString();

      // Call backend API to mark meal as fed
      const response = await fetch(`${API_BASE_URL}/mark_meal_fed/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: currentUser,
          horse_id: horseId,
          meal_id: meal.id,
          completed_at: completedAt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark meal as fed');
      }
          
      // Update local state
      const updatedSchedule = feedingSchedule.map(m =>
        m.id === meal.id 
          ? { ...m, completed: true, completedAt }
          : m
      );
          
      setFeedingSchedule(updatedSchedule);
          
      // Add to feed log
      await addToFeedLog({
        date: now.toISOString().split('T')[0],
        meal: meal.meal,
        horse: horseName,
        time: completedAt.split(', ')[1],
        food: meal.food,
        amount: meal.amount,
        status: 'Completed',
        action: 'completed',
        timestamp: now.toISOString(),
      });
          
      Alert.alert('Success', `${meal.meal} marked as fed for ${horseName}!`);
    } catch (error: any) {
      console.error('Error marking meal as fed:', error);
      Alert.alert('Error', error.message || 'Failed to mark meal as fed');
    }
  };

  // Reset daily completion status
  const resetDailyFeeds = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'User not found');
      return;
    }

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

      // Update local state
      const resetSchedule = feedingSchedule.map(meal => ({
        ...meal,
        completed: false,
        completedAt: undefined,
      }));
          
      setFeedingSchedule(resetSchedule);
      Alert.alert('Success', 'Daily feeds reset successfully');
    } catch (error: any) {
      console.error('Error resetting daily feeds:', error);
      Alert.alert('Error', error.message || 'Failed to reset daily feeds');
    }
  };

  const handleEdit = (meal: Meal) => {
    setEditingMeal(meal);
    // Parse the time from the meal
    const timeParts = meal.time.split(' ');
    const time = timeParts[0].split(':');
    setFeedingTime({
      hour: time[0],
      minute: time[1],
      period: timeParts[1],
    });
          
    // Reset feed types for editing
    setFeedTypes([
      { id: '1', name: 'Chaff', amount: meal.food === 'Chaff' ? meal.amount : '' },
      { id: '2', name: 'Resolve', amount: meal.food === 'Resolve' ? meal.amount : '' },
      { id: '3', name: 'Dynavy', amount: meal.food === 'Dynavy' ? meal.amount : '' },
      { id: '4', name: 'Magnesium', amount: meal.food === 'Magnesium' ? meal.amount : '' },
    ]);
          
    setShowEditView(true);
  };

  const handleFeedLog = () => {
    router.push('/HORSE_OPERATOR/Hfeedlog');
  };

  const handleTimeChange = (field: 'hour' | 'minute' | 'period', value: string) => {
    setFeedingTime(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAmountChange = (id: string, amount: string) => {
    setFeedTypes(prev =>
      prev.map(feed =>
        feed.id === id ? { ...feed, amount } : feed
      )
    );
  };

  const handleAddFeedType = () => {
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

  const handleSaveChanges = async () => {
    const hasValidFeed = feedTypes.some(feed => feed.amount.trim() !== '');
          
    if (!hasValidFeed) {
      Alert.alert('Error', 'Please specify at least one feed type with an amount.');
      return;
    }
          
    if (!editingMeal || !currentUser) return;

    try {
      // Update the feeding schedule
      const updatedTime = `${feedingTime.hour}:${feedingTime.minute} ${feedingTime.period}`;
      const activeFeed = feedTypes.find(feed => feed.amount.trim() !== '');
          
      if (!activeFeed) {
        Alert.alert('Error', 'Please specify at least one feed type with an amount.');
        return;
      }

      const updatedSchedule = feedingSchedule.map(meal =>
        meal.id === editingMeal.id
          ? {
              ...meal,
              time: updatedTime,
              food: activeFeed.name,
              amount: activeFeed.amount,
              completed: false, // Reset completion status when edited
            }
          : meal
      );
          
      setFeedingSchedule(updatedSchedule);
      
      // Save to backend
      await saveFeedingSchedule(updatedSchedule);

      // Add edit action to feed log
      const now = new Date();
      await addToFeedLog({
        date: now.toISOString().split('T')[0],
        meal: editingMeal.meal,
        horse: horseName,
        time: updatedTime,
        food: activeFeed.name,
        amount: activeFeed.amount,
        status: 'Edited',
        action: 'edited',
        timestamp: now.toISOString(),
      });

      setShowEditView(false);
      Alert.alert('Success', `Feeding schedule updated successfully for ${horseName}!`);
    } catch (error) {
      console.error('Error saving changes:', error);
      Alert.alert('Error', 'Failed to save changes');
    }
  };

  const handleCancel = () => {
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
          <Text style={styles.headerTitle}>Edit {editingMeal?.meal}</Text>
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

            {/* Divider */}
            <View style={styles.divider} />

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
          <FontAwesome5 name="horse-head" size={24} color="#fff" style={styles.horseIcon} />
          <Text style={styles.headerTitle}>Feeds - {horseName}</Text>
        </View>
        <TouchableOpacity style={styles.feedLogButton} onPress={handleFeedLog}>
          <Text style={styles.feedLogText}>Feed log</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Display user info for debugging - can be removed */}
          {currentUser && (
            <Text style={styles.userInfo}>User: {currentUser}</Text>
          )}
                  
          {feedingSchedule.map((meal) => (
            <View key={meal.id} style={styles.mealSection}>
              {/* Meal Header */}
              <View style={styles.mealHeader}>
                <Text style={styles.mealTitle}>{meal.meal}</Text>
                <View style={styles.mealActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEdit(meal)}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Meal Card */}
              <View style={[
                styles.mealCard,
                meal.completed && styles.completedMealCard
              ]}>
                <View style={styles.mealInfo}>
                  <Text style={styles.foodText}>
                    {meal.food}: {meal.amount}
                  </Text>
                  <Text style={styles.timeText}>{meal.time}</Text>
                </View>
                                              
                {meal.completed ? (
                  <View style={styles.completedSection}>
                    <Text style={styles.completedText}>
                      ✓ Fed at {meal.completedAt}
                    </Text>
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
                            
          {/* Reset Daily Feeds Button */}
          <TouchableOpacity style={styles.resetButton} onPress={resetDailyFeeds}>
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
    paddingVertical: 15,
    backgroundColor: '#CD853F',
  },
  backButton: {
    padding: 5,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginRight: 80,
  },
  horseIcon: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  feedLogButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  feedLogText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  placeholder: {
    width: 30,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  userInfo: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  mealSection: {
    marginBottom: 25,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  mealActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  mealCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  completedMealCard: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  mealInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  foodText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  timeText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  markFedButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  markFedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completedSection: {
    alignItems: 'center',
  },
  completedText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Edit View Styles
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    width: 60,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 10,
  },
  periodInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    width: 80,
    textAlign: 'center',
    marginLeft: 15,
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 20,
  },
  feedTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  feedTypeCard: {
    width: '48%',
    backgroundColor: '#B8D4F0',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  feedTypeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  amountInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  addFeedButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  addFeedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 25,
    paddingHorizontal: 30,
    paddingVertical: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    paddingHorizontal: 30,
    paddingVertical: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FeedScreen;