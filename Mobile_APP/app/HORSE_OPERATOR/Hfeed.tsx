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
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

type Meal = {
  id: string;
  fd_food_type: string;
  fd_qty: string;
  fd_time: string;
  fd_meal_type: string;
  completed?: boolean;
  completed_at?: string;
  fd_id?: string;
  fed_by?: string;      // NEW: Who fed the horse
  fed_by_id?: string;   // NEW: User ID who fed
  user_type?: string;   // NEW: 'op' or 'kutsero'
};

// const API_BASE_URL = "http://192.168.101.4:8000/api/horse_operator";
const API_BASE_URL = "http://192.168.101.2:8000/api/horse_operator"

const FeedScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const horseName = params.horseName as string || 'Unknown Horse';
  const horseId = params.horseId as string || '';
  const [currentUser, setCurrentUser] = useState<string>('');
    
  const [feedingSchedule, setFeedingSchedule] = useState<Meal[]>([]);
  const [showEditView, setShowEditView] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
    
  const [feedingTime, setFeedingTime] = useState({
    hour: '6',
    minute: '45',
    period: 'AM',
  });

  const [feedTypes, setFeedTypes] = useState([
    { id: '1', name: 'Chaff', amount: '' },
    { id: '2', name: 'Resolve', amount: '' },
    { id: '3', name: 'Dynavy', amount: '' },
    { id: '4', name: 'Magnesium', amount: '' },
  ]);

  const generateLocalId = (): string => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  const getMealName = (time: string): string => {
    try {
      const timeParts = time.split(' ');
      const timeComponent = timeParts[0];
      const period = timeParts[1] || 'AM';
      
      const hour = parseInt(timeComponent.split(':')[0]);
      
      let hour24: number;
      if (period.toUpperCase() === 'PM' && hour !== 12) {
        hour24 = hour + 12;
      } else if (period.toUpperCase() === 'AM' && hour === 12) {
        hour24 = 0;
      } else {
        hour24 = hour;
      }
      
      if (hour24 < 10) {
        return 'Breakfast';
      } else if (hour24 < 16) {
        return 'Lunch';
      } else {
        return 'Dinner';
      }
    } catch (error) {
      console.error('Error parsing time:', error);
      return 'Meal';
    }
  };

  const getMealOrder = (mealType: string): number => {
    switch (mealType) {
      case 'Breakfast': return 1;
      case 'Lunch': return 2;
      case 'Dinner': return 3;
      default: return 4;
    }
  };

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

  const createDefaultLocalSchedule = useCallback((): Meal[] => {
    console.log("Creating default local feeding schedule");
    
    const defaultSchedule: Meal[] = [
      {
        id: generateLocalId(),
        fd_food_type: 'Chaff',
        fd_qty: '3 scoops',
        fd_time: '6:45 AM',
        fd_meal_type: 'Breakfast',
        completed: false,
      },
      {
        id: generateLocalId(),
        fd_food_type: 'Chaff',
        fd_qty: '3 scoops',
        fd_time: '12:00 PM',
        fd_meal_type: 'Lunch',
        completed: false,
      },
      {
        id: generateLocalId(),
        fd_food_type: 'Chaff',
        fd_qty: '3 scoops',
        fd_time: '7:15 PM',
        fd_meal_type: 'Dinner',
        completed: false,
      },
    ];
    
    return defaultSchedule;
  }, []);

  const loadTodaysFeedRecords = useCallback(async (userId: string): Promise<Meal[]> => {
    try {
      const url = `${API_BASE_URL}/get_feeding_schedule/?user_id=${encodeURIComponent(userId)}&horse_id=${encodeURIComponent(horseId)}`;
      console.log("Loading today's feed records:", url);

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.length > 0) {
          return data.map((item: any) => ({
            id: item.fd_id,
            fd_food_type: item.fd_food_type,
            fd_qty: item.fd_qty,
            fd_time: item.fd_time,
            fd_meal_type: item.fd_meal_type,
            completed: item.completed || false,
            completed_at: item.completed_at,
            fd_id: item.fd_id,
            fed_by: item.fed_by,           // NEW
            fed_by_id: item.fed_by_id,     // NEW
            user_type: item.user_type,     // NEW
          }));
        }
      }
    } catch (error) {
      console.error('Error loading feed records:', error);
    }
    
    return [];
  }, [horseId]);

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

      const todaysRecords = await loadTodaysFeedRecords(userId);
      const defaultSchedule = createDefaultLocalSchedule();
      
      const mergedSchedule = defaultSchedule.map(defaultItem => {
        const dbRecord = todaysRecords.find(record => 
          record.fd_meal_type === defaultItem.fd_meal_type
        );
        
        if (dbRecord && dbRecord.completed) {
          return dbRecord;
        }
        
        return defaultItem;
      }).sort((a, b) => getMealOrder(a.fd_meal_type) - getMealOrder(b.fd_meal_type));
      
      setFeedingSchedule(mergedSchedule);
      console.log(`Initialized with ${mergedSchedule.length} feeding schedule items`);
      
      setIsInitialized(true);
      
    } catch (error: unknown) {
      console.error('Error initializing feed screen:', error);
      const defaultSchedule = createDefaultLocalSchedule();
      setFeedingSchedule(defaultSchedule);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, horseId, getCurrentUser, createDefaultLocalSchedule, loadTodaysFeedRecords]);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    try {
      if (currentUser && horseId) {
        const todaysRecords = await loadTodaysFeedRecords(currentUser);
        const defaultSchedule = createDefaultLocalSchedule();
        
        const mergedSchedule = defaultSchedule.map(defaultItem => {
          const dbRecord = todaysRecords.find(record => 
            record.fd_meal_type === defaultItem.fd_meal_type
          );
          
          if (dbRecord && dbRecord.completed) {
            return dbRecord;
          }
          
          return defaultItem;
        }).sort((a, b) => getMealOrder(a.fd_meal_type) - getMealOrder(b.fd_meal_type));
        
        setFeedingSchedule(mergedSchedule);
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [currentUser, horseId, loadTodaysFeedRecords, createDefaultLocalSchedule]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (currentUser && isInitialized) {
        onRefresh();
      }
    }, [currentUser, isInitialized, onRefresh])
  );

  const handleMarkAsFed = async (meal: Meal): Promise<void> => {
    if (!currentUser) {
      Alert.alert('Error', 'User not found');
      return;
    }

    // Check if already fed
    if (meal.completed && meal.fed_by) {
      Alert.alert(
        'Already Fed',
        `This meal has already been fed by ${meal.fed_by}.`,
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
        // Check if it's because someone else already fed it
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
          // Refresh to show the updated state
          await onRefresh();
          return;
        }
        
        console.error("Mark as fed error:", result);
        throw new Error(result.error || 'Failed to mark meal as fed');
      }

      console.log("Meal fed and saved to database:", result);

      // Update local state
      const updatedSchedule = feedingSchedule.map(m =>
        m.id === meal.id 
          ? { 
              ...m, 
              completed: true, 
              completed_at: completedAt,
              fd_id: result.fd_id,
              fed_by: result.fed_by,
              user_type: result.user_type
            }
          : m
      ).sort((a, b) => getMealOrder(a.fd_meal_type) - getMealOrder(b.fd_meal_type));
        
      setFeedingSchedule(updatedSchedule);
        
      Alert.alert('Success', `Meal fed to ${horseName} and recorded in database!`);
    } catch (error: any) {
      console.error('Error marking meal as fed:', error);
      Alert.alert('Error', error.message || 'Failed to record feeding');
    }
  };

  const resetDailyFeeds = async (): Promise<void> => {
    if (!currentUser) {
      Alert.alert('Error', 'User not found');
      return;
    }

    Alert.alert(
      'Reset Daily Feeds',
      'This will reset all feeding records for today. Are you sure?',
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

              const resetSchedule = createDefaultLocalSchedule();
              setFeedingSchedule(resetSchedule);
              
              Alert.alert('Success', 'Daily feeding records reset successfully');
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
    // Don't allow editing if already fed by someone
    if (meal.completed && meal.fed_by) {
      Alert.alert(
        'Cannot Edit',
        `This meal was already fed by ${meal.fed_by}. You cannot edit completed meals.`,
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
          onPress: (text?: string) => {
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
      const updatedTime = `${feedingTime.hour}:${feedingTime.minute} ${feedingTime.period}`;
      const mealType = getMealName(updatedTime);

      const updatedSchedule = feedingSchedule.map(meal =>
        meal.id === editingMeal.id
          ? {
              ...meal,
              fd_time: updatedTime,
              fd_food_type: activeFeed.name,
              fd_qty: activeFeed.amount,
              fd_meal_type: mealType,
            }
          : meal
      ).sort((a, b) => getMealOrder(a.fd_meal_type) - getMealOrder(b.fd_meal_type));
          
      setFeedingSchedule(updatedSchedule);
      setShowEditView(false);
      
      Alert.alert('Success', `Feeding schedule updated for ${horseName}!`);
    } catch (error) {
      console.error('Error saving changes:', error);
      Alert.alert('Error', 'Failed to save changes');
    }
  };

  const handleCancel = (): void => {
    setShowEditView(false);
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

              <TouchableOpacity style={styles.addFeedButton} onPress={handleAddFeedType}>
                <Text style={styles.addFeedButtonText}>Add Feed Type</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <FontAwesome5 name="info-circle" size={16} color="#CD853F" />
              <Text style={styles.infoText}>
                Schedule changes are saved locally. Database entries are only created when you mark the meal as fed.
              </Text>
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

  return (
    <SafeAreaView style={styles.safeArea}>
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
          {feedingSchedule.map((meal) => (
            <View key={meal.id} style={styles.mealCard}>
              <View style={styles.cardHeader}>
                <View style={styles.mealInfo}>
                  <View style={styles.mealTitleRow}>
                    <Text style={styles.mealTitle}>{meal.fd_meal_type}</Text>
                  </View>
                  <Text style={styles.mealTime}>{meal.fd_time}</Text>
                </View>
                <TouchableOpacity 
                  style={[
                    styles.editButton,
                    meal.completed && styles.editButtonDisabled
                  ]} 
                  onPress={() => handleEdit(meal)}
                  disabled={meal.completed}
                >
                  <FontAwesome5 
                    name="edit" 
                    size={14} 
                    color={meal.completed ? "#9CA3AF" : "#3B82F6"} 
                  />
                </TouchableOpacity>
              </View>

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
                  <View style={styles.completedSection}>
                    <View style={styles.completedBadge}>
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
                    <Text style={styles.markFedButtonText}>Mark as Fed</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.resetButton} onPress={resetDailyFeeds}>
            <View style={styles.resetIconContainer}>
              <FontAwesome5 name="redo" size={14} color="#fff" />
            </View>
            <Text style={styles.resetButtonText}>Reset Daily Records</Text>
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  savedBadgeText: {
    fontSize: 10,
    color: '#065F46',
    fontWeight: '600',
    marginLeft: 3,
  },
  editButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
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
  completedSection: {
    gap: 8,
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