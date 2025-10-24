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

type WaterSchedule = {
  id: string; // Local ID for tracking
  period: string;
  amount: string;
  time: string;
  completed?: boolean;
  completed_at?: string;
  water_id?: string; // Only set when actually saved to DB
};

type WateringAlarm = {
  notif_id: string;
  type: 'watering_time' | 'watering_snooze';
  water_id: string;
  horse_id: string;
  horse_name: string;
  message: string;
  time: string;
  period: string;
  scheduled_time: string;
};

const API_BASE_URL = "http://192.168.101.2:8000/api/horse_operator";

const WaterScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const horseName = params.horseName as string || 'Unknown Horse';
  const horseId = params.horseId as string || '';
  
  const [currentUser, setCurrentUser] = useState<string>('');
  const [wateringSchedule, setWateringSchedule] = useState<WaterSchedule[]>([]);
  const [showEditView, setShowEditView] = useState(false);
  const [editingWater, setEditingWater] = useState<WaterSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeWateringAlarms, setActiveWateringAlarms] = useState<WateringAlarm[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAlarms, setShowAlarms] = useState(true);
  
  const [wateringTime, setWateringTime] = useState({
    hour: '6',
    minute: '45',
    period: 'AM',
  });

  const [waterAmount, setWaterAmount] = useState('15');

  // Helper function to generate local ID
  const generateLocalId = (): string => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  const getPeriodName = (time: string): string => {
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
        return 'Morning';
      } else if (hour24 < 16) {
        return 'Afternoon';
      } else {
        return 'Evening';
      }
    } catch (error) {
      console.error('Error parsing time:', error);
      return 'Period';
    }
  };

  const getPeriodOrder = (period: string): number => {
    switch (period) {
      case 'Morning': return 1;
      case 'Afternoon': return 2;
      case 'Evening': return 3;
      default: return 4;
    }
  };

  // Load user ID from SecureStore
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

  // Load active watering alarms
  const loadActiveWateringAlarms = useCallback(async (userId: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/get_active_watering_alarms/?user_id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        const horseAlarms = data.active_alarms?.filter((alarm: WateringAlarm) => 
          alarm.horse_id === horseId
        ) || [];
        
        setActiveWateringAlarms(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(horseAlarms)) {
            return horseAlarms;
          }
          return prev;
        });
        
        console.log(`Loaded ${horseAlarms.length} active watering alarms for ${horseName}`);
      }
    } catch (error) {
      console.error('Error loading watering alarms:', error);
    }
  }, [horseId, horseName]);

  // Create default local schedule (not saved to DB)
  const createDefaultLocalSchedule = useCallback((): WaterSchedule[] => {
    console.log("Creating default local watering schedule");
    
    const defaultSchedule: WaterSchedule[] = [
      {
        id: generateLocalId(),
        period: 'Morning',
        amount: '15 gallons',
        time: '6:45 AM',
        completed: false,
      },
      {
        id: generateLocalId(),
        period: 'Afternoon',
        amount: '16 gallons',
        time: '12:00 PM',
        completed: false,
      },
      {
        id: generateLocalId(),
        period: 'Evening',
        amount: '13 gallons',
        time: '7:15 PM',
        completed: false,
      },
    ];
    
    return defaultSchedule;
  }, []);

  // Load any existing water records for today (completed ones)
  const loadTodaysWaterRecords = useCallback(async (userId: string): Promise<WaterSchedule[]> => {
    try {
      const url = `${API_BASE_URL}/get_watering_schedule/?user_id=${encodeURIComponent(userId)}&horse_id=${encodeURIComponent(horseId)}`;
      console.log("Loading today's water records:", url);

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.length > 0) {
          // Convert backend data to local format
          return data.map((item: any) => ({
            id: item.water_id,
            period: item.water_period,
            amount: item.water_amount,
            time: item.water_time,
            completed: item.completed || false,
            completed_at: item.completed_at,
            water_id: item.water_id, // This indicates it's saved in DB
          }));
        }
      }
    } catch (error) {
      console.error('Error loading water records:', error);
    }
    
    return [];
  }, [horseId]);

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

      // Load today's completed water records from DB
      const todaysRecords = await loadTodaysWaterRecords(userId);
      
      // Create default schedule
      const defaultSchedule = createDefaultLocalSchedule();
      
      // Merge: use DB records for completed items, local schedule for pending
      const mergedSchedule = defaultSchedule.map(defaultItem => {
        const dbRecord = todaysRecords.find(record => 
          record.period === defaultItem.period
        );
        
        if (dbRecord && dbRecord.completed) {
          return dbRecord;
        }
        
        return defaultItem;
      }).sort((a, b) => getPeriodOrder(a.period) - getPeriodOrder(b.period));
      
      setWateringSchedule(mergedSchedule);
      console.log(`Initialized with ${mergedSchedule.length} water schedule items`);
      
      // Load alarms
      await loadActiveWateringAlarms(userId);
      
      setIsInitialized(true);
      
    } catch (error: unknown) {
      console.error('Error initializing water screen:', error);
      
      // Fallback to default schedule
      const defaultSchedule = createDefaultLocalSchedule();
      setWateringSchedule(defaultSchedule);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, horseId, getCurrentUser, createDefaultLocalSchedule, loadTodaysWaterRecords, loadActiveWateringAlarms]);

  // Initialize on mount
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
        await loadActiveWateringAlarms(currentUser);
        
        // Reload today's records
        const todaysRecords = await loadTodaysWaterRecords(currentUser);
        const defaultSchedule = createDefaultLocalSchedule();
        
        const mergedSchedule = defaultSchedule.map(defaultItem => {
          const dbRecord = todaysRecords.find(record => 
            record.period === defaultItem.period
          );
          
          if (dbRecord && dbRecord.completed) {
            return dbRecord;
          }
          
          return defaultItem;
        }).sort((a, b) => getPeriodOrder(a.period) - getPeriodOrder(b.period));
        
        setWateringSchedule(mergedSchedule);
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [currentUser, horseId, loadActiveWateringAlarms, loadTodaysWaterRecords, createDefaultLocalSchedule]);

  // Focus effect for alarms
  useFocusEffect(
    useCallback(() => {
      if (currentUser && isInitialized) {
        loadActiveWateringAlarms(currentUser);
      }
    }, [currentUser, isInitialized, loadActiveWateringAlarms])
  );

  // Snooze watering alarm
  const snoozeWateringAlarm = async (alarm: WateringAlarm): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/snooze_watering_alarm/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          water_id: alarm.water_id,
          user_id: currentUser,
          horse_id: horseId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setActiveWateringAlarms(prev => prev.filter(a => a.notif_id !== alarm.notif_id));
        Alert.alert('Snoozed', `Watering reminder snoozed until ${result.snooze_until}`);
      } else {
        throw new Error('Failed to snooze alarm');
      }
    } catch (error) {
      console.error('Error snoozing alarm:', error);
      Alert.alert('Error', 'Failed to snooze watering alarm');
    }
  };

  // Dismiss watering alarm
  const dismissWateringAlarm = async (alarm: WateringAlarm): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/dismiss_watering_alarm/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notif_id: alarm.notif_id,
          user_id: currentUser,
        }),
      });

      if (response.ok) {
        setActiveWateringAlarms(prev => prev.filter(a => a.notif_id !== alarm.notif_id));
        Alert.alert('Dismissed', 'Watering alarm dismissed');
      } else {
        throw new Error('Failed to dismiss alarm');
      }
    } catch (error) {
      console.error('Error dismissing alarm:', error);
      Alert.alert('Error', 'Failed to dismiss watering alarm');
    }
  };

  // MODIFIED: Mark water as given - This is when we save to database for the first time
  const handleMarkAsGiven = async (water: WaterSchedule): Promise<void> => {
    if (!currentUser) {
      Alert.alert('Error', 'User not found');
      return;
    }

    try {
      const now = new Date();
      const completedAt = now.toISOString();

      // ONLY NOW do we save to the database
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
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Mark as given error:", errorData);
        throw new Error(errorData.error || 'Failed to mark water as given');
      }
          
      const result = await response.json();
      console.log("Water given and saved to database:", result);

      // Update local state
      const updatedSchedule = wateringSchedule.map(w =>
        w.id === water.id 
          ? { 
              ...w, 
              completed: true, 
              completed_at: completedAt,
              water_id: result.water_id // Now it's saved in DB
            }
          : w
      ).sort((a: WaterSchedule, b: WaterSchedule) => 
        getPeriodOrder(a.period) - getPeriodOrder(b.period)
      );
          
      setWateringSchedule(updatedSchedule);
      setActiveWateringAlarms(prev => prev.filter(alarm => 
        !(alarm.period === water.period && alarm.horse_id === horseId)
      ));
          
      Alert.alert('Success', `Water given to ${horseName} and recorded in database!`);
    } catch (error: any) {
      console.error('Error marking water as given:', error);
      Alert.alert('Error', error.message || 'Failed to record water giving');
    }
  };

  // MODIFIED: Reset daily watering - only affects DB records
  const resetDailyWatering = async (): Promise<void> => {
    if (!currentUser) {
      Alert.alert('Error', 'User not found');
      return;
    }

    Alert.alert(
      'Reset Daily Watering',
      'This will reset all watering records for today. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              // This will only affect database records
              const response = await fetch(`${API_BASE_URL}/reset_daily_watering/`, {
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
                throw new Error(errorData.error || 'Failed to reset daily watering');
              }

              // Reset local schedule to default (removes completed status)
              const resetSchedule = createDefaultLocalSchedule();
              setWateringSchedule(resetSchedule);
              await loadActiveWateringAlarms(currentUser);
              
              Alert.alert('Success', 'Daily watering records reset successfully');
            } catch (error: any) {
              console.error('Error resetting daily watering:', error);
              Alert.alert('Error', error.message || 'Failed to reset daily watering');
            }
          }
        }
      ]
    );
  };

  // MODIFIED: Handle edit - just updates local schedule
  const handleEdit = (water: WaterSchedule): void => {
    setEditingWater(water);
    const timeParts = water.time.split(' ');
    const time = timeParts[0].split(':');
    setWateringTime({
      hour: time[0],
      minute: time[1],
      period: timeParts[1] || 'AM',
    });
          
    const amount = water.amount.split(' ')[0];
    setWaterAmount(amount);
    setShowEditView(true);
  };

  const handleWaterLog = (): void => {
    router.push('../HORSE_OPERATOR/waterlog');
  };

  const handleTimeChange = (field: 'hour' | 'minute' | 'period', value: string): void => {
    setWateringTime(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAmountChange = (amount: string): void => {
    setWaterAmount(amount);
  };

  // MODIFIED: Save changes - only updates local schedule, no database save
  const handleSaveChanges = async (): Promise<void> => {
    if (!waterAmount.trim()) {
      Alert.alert('Error', 'Please specify water amount.');
      return;
    }
          
    if (!editingWater || !currentUser) return;

    try {
      const updatedTime = `${wateringTime.hour}:${wateringTime.minute} ${wateringTime.period}`;
      const period = getPeriodName(updatedTime);

      // Update local schedule only
      const updatedSchedule = wateringSchedule.map(water =>
        water.id === editingWater.id
          ? {
              ...water,
              time: updatedTime,
              amount: `${waterAmount} gallons`,
              period: period,
              // If it was completed (saved to DB), keep it completed
              // If not completed, it remains local-only
            }
          : water
      ).sort((a: WaterSchedule, b: WaterSchedule) => 
        getPeriodOrder(a.period) - getPeriodOrder(b.period)
      );
          
      setWateringSchedule(updatedSchedule);
      setShowEditView(false);
      
      // Refresh alarms based on new schedule
      await loadActiveWateringAlarms(currentUser);
      
      Alert.alert('Success', `Watering schedule updated for ${horseName}!`);
    } catch (error) {
      console.error('Error saving changes:', error);
      Alert.alert('Error', 'Failed to save changes');
    }
  };

  const handleCancel = (): void => {
    setShowEditView(false);
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
                <TextInput
                  style={styles.periodInput}
                  value={wateringTime.period}
                  onChangeText={(value) => handleTimeChange('period', value.toUpperCase())}
                  placeholder="AM/PM"
                  maxLength={2}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Water Amount</Text>
              <View style={styles.amountContainer}>
                <TextInput
                  style={styles.amountInput}
                  value={waterAmount}
                  onChangeText={handleAmountChange}
                  placeholder="Enter amount"
                  keyboardType="numeric"
                />
                <Text style={styles.amountUnit}>gallons</Text>
              </View>
            </View>
            
            {/* Info box about database saving */}
            <View style={styles.infoBox}>
              <FontAwesome5 name="info-circle" size={16} color="#3B82F6" />
              <Text style={styles.infoText}>
                Schedule changes are saved locally. Database entries are only created when you mark water as given.
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

  // Render watering alarm card
  const renderWateringAlarm = (alarm: WateringAlarm) => (
    <View key={alarm.notif_id} style={styles.alarmCard}>
      <View style={styles.alarmHeader}>
        <FontAwesome5 name="tint" size={20} color="#3B82F6" />
        <Text style={styles.alarmTitle}>WATERING TIME!</Text>
        <TouchableOpacity 
          onPress={() => setShowAlarms(false)}
          style={styles.alarmCloseButton}
        >
          <FontAwesome5 name="times" size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.alarmMessage}>{alarm.message}</Text>
      <Text style={styles.alarmTime}>Scheduled: {alarm.scheduled_time}</Text>
      
      <View style={styles.alarmActions}>
        <TouchableOpacity 
          style={[styles.alarmButton, styles.snoozeButton]}
          onPress={() => snoozeWateringAlarm(alarm)}
        >
          <FontAwesome5 name="clock" size={14} color="#fff" />
          <Text style={styles.alarmButtonText}>Snooze 15min</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.alarmButton, styles.dismissButton]}
          onPress={() => dismissWateringAlarm(alarm)}
        >
          <FontAwesome5 name="times" size={14} color="#fff" />
          <Text style={styles.alarmButtonText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
          {activeWateringAlarms.length > 0 && (
            <View style={styles.alarmBadge}>
              <Text style={styles.alarmBadgeText}>{activeWateringAlarms.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.waterLogButton} onPress={handleWaterLog}>
          <FontAwesome5 name="clipboard-list" size={14} color="#fff" />
          <Text style={styles.waterLogText}>Log</Text>
        </TouchableOpacity>
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
          {/* Active Watering Alarms Section */}
          {activeWateringAlarms.length > 0 && showAlarms && (
            <View style={styles.alarmsSection}>
              <Text style={styles.alarmsSectionTitle}>Active Watering Alarms</Text>
              {activeWateringAlarms.map(renderWateringAlarm)}
            </View>
          )}

          {/* Info banner about database saving
          <View style={styles.infoBanner}>
            <FontAwesome5 name="database" size={16} color="#10B981" />
            <Text style={styles.infoBannerText}>
              Water data is only saved to database when you mark it as given
            </Text>
          </View> */}

          {wateringSchedule.map((water) => (
            <View key={water.id} style={styles.waterCard}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.waterInfo}>
                  <View style={styles.waterTitleRow}>
                    <Text style={styles.waterTitle}>{water.period}</Text>
                    {water.water_id && (
                      <View style={styles.savedBadge}>
                        <FontAwesome5 name="database" size={10} color="#10B981" />
                        <Text style={styles.savedBadgeText}>Saved</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.waterTime}>{water.time}</Text>
                </View>
                <TouchableOpacity 
                  style={[
                    styles.editButton,
                    water.completed && styles.editButtonDisabled
                  ]} 
                  onPress={() => handleEdit(water)}
                  disabled={water.completed}
                >
                  <FontAwesome5 
                    name="edit" 
                    size={14} 
                    color={water.completed ? "#9CA3AF" : "#3B82F6"} 
                  />
                </TouchableOpacity>
              </View>

              {/* Card Content */}
              <View style={styles.cardContent}>
                <View style={styles.waterDetails}>
                  <View style={styles.waterTypeRow}>
                    <FontAwesome5 
                      name={water.period === 'Morning' ? 'sun' : water.period === 'Afternoon' ? 'cloud-sun' : 'moon'} 
                      size={18} 
                      color={water.completed ? '#10B981' : '#3B82F6'} 
                    />
                    <Text style={styles.waterAmount}>{water.amount}</Text>
                  </View>
                </View>

                {water.completed ? (
                  <View style={styles.completedBadge}>
                    <View style={styles.completedIconContainer}>
                      <FontAwesome5 name="check" size={14} color="#fff" />
                    </View>
                    <Text style={styles.completedText}>Given & Recorded</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.markGivenButton}
                    onPress={() => handleMarkAsGiven(water)}
                  >
                    <FontAwesome5 name="tint" size={14} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.markGivenButtonText}>Mark as Given</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          {/* Reset Button */}
          <TouchableOpacity style={styles.resetButton} onPress={resetDailyWatering}>
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
    backgroundColor: '#3B82F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
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
    position: 'relative',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 8,
  },
  alarmBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  alarmBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  waterLogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  infoBannerText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#065F46',
    fontWeight: '500',
  },
  waterTitleRow: {
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
  alarmsSection: {
    marginBottom: 20,
  },
  alarmsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 12,
    textAlign: 'center',
  },
  alarmCard: {
    backgroundColor: '#DBEAFE',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  alarmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alarmTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
    flex: 1,
    marginLeft: 8,
  },
  alarmCloseButton: {
    padding: 4,
  },
  alarmMessage: {
    fontSize: 14,
    color: '#1E40AF',
    marginBottom: 8,
    lineHeight: 20,
  },
  alarmTime: {
    fontSize: 12,
    color: '#78716C',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  alarmActions: {
    flexDirection: 'row',
    gap: 8,
  },
  alarmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
  },
  snoozeButton: {
    backgroundColor: '#3B82F6',
  },
  dismissButton: {
    backgroundColor: '#6B7280',
  },
  alarmButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  waterInfo: {
    flex: 1,
  },
  waterTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
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
  waterDetails: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  waterTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waterAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 12,
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
  markGivenButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#3B82F6',
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
    fontSize: 18,
    fontWeight: '600',
    backgroundColor: '#F8FAFC',
    width: 100,
    textAlign: 'center',
    marginRight: 15,
    color: '#1E293B',
  },
  amountUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
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

export default WaterScreen;