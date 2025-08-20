import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

type WaterSchedule = {
  id: string;
  period: string;
  amount: string;
  time: string;
};

const WaterScreen = () => {
  const router = useRouter();
  
  const [waterSchedule, setWaterSchedule] = useState<WaterSchedule[]>([
    {
      id: '1',
      period: 'Morning',
      amount: '15 gallons',
      time: '6:45 AM',
    },
    {
      id: '2',
      period: 'Afternoon',
      amount: '16 gallons',
      time: '12:00 PM',
    },
    {
      id: '3',
      period: 'Evening',
      amount: '13 gallons',
      time: '7:15 PM',
    },
  ]);

  const [showEditView, setShowEditView] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WaterSchedule | null>(null);
  
  const [waterTime, setWaterTime] = useState({
    hour: '6',
    minute: '45',
    period: 'AM',
  });

  const [waterAmount, setWaterAmount] = useState('15');

  const handleEdit = (schedule: WaterSchedule) => {
    setEditingSchedule(schedule);
    // Parse the time from the schedule
    const timeParts = schedule.time.split(' ');
    const time = timeParts[0].split(':');
    setWaterTime({
      hour: time[0],
      minute: time[1],
      period: timeParts[1],
    });
    
    // Extract amount number from string like "15 gallons"
    const amount = schedule.amount.split(' ')[0];
    setWaterAmount(amount);
    
    setShowEditView(true);
  };

  const handleTimeChange = (field: 'hour' | 'minute' | 'period', value: string) => {
    setWaterTime(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAmountChange = (value: string) => {
    setWaterAmount(value);
  };

  const handleSaveChanges = () => {
    if (!waterAmount.trim()) {
      Alert.alert('Error', 'Please specify water amount.');
      return;
    }

    if (!editingSchedule) return;

    // Update the water schedule
    const updatedTime = `${waterTime.hour}:${waterTime.minute} ${waterTime.period}`;
    const updatedAmount = `${waterAmount} gallons`;
    
    setWaterSchedule(prev => 
      prev.map(schedule => 
        schedule.id === editingSchedule.id 
          ? { 
              ...schedule, 
              time: updatedTime,
              amount: updatedAmount
            }
          : schedule
      )
    );

    setShowEditView(false);
    Alert.alert('Success', 'Water schedule updated successfully!');
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
          <Text style={styles.headerTitle}>Edit {editingSchedule?.period}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Water Time Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Water Time</Text>
              <View style={styles.timeInputContainer}>
                <TextInput
                  style={styles.timeInput}
                  value={waterTime.hour}
                  onChangeText={(value) => handleTimeChange('hour', value)}
                  placeholder="HH"
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.timeSeparator}>:</Text>
                <TextInput
                  style={styles.timeInput}
                  value={waterTime.minute}
                  onChangeText={(value) => handleTimeChange('minute', value)}
                  placeholder="MM"
                  keyboardType="numeric"
                  maxLength={2}
                />
                <TextInput
                  style={styles.periodInput}
                  value={waterTime.period}
                  onChangeText={(value) => handleTimeChange('period', value.toUpperCase())}
                  placeholder="AM/PM"
                  maxLength={2}
                />
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Water Amount Section */}
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

  // Main Water List View
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <FontAwesome5 name="tint" size={24} color="#fff" style={styles.waterIcon} />
          <Text style={styles.headerTitle}>Water</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {waterSchedule.map((schedule) => (
            <View key={schedule.id} style={styles.scheduleSection}>
              {/* Schedule Header */}
              <View style={styles.scheduleHeader}>
                <Text style={styles.scheduleTitle}>{schedule.period}</Text>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => handleEdit(schedule)}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>

              {/* Schedule Card */}
              <View style={styles.scheduleCard}>
                <View style={styles.scheduleInfo}>
                  <Text style={styles.amountText}>{schedule.amount}</Text>
                  <Text style={styles.timeText}>{schedule.time}</Text>
                </View>
              </View>
            </View>
          ))}
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
  },
  waterIcon: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
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
  scheduleSection: {
    marginBottom: 25,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  scheduleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  timeText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
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
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    width: 100,
    textAlign: 'center',
    marginRight: 10,
  },
  amountUnit: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
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

export default WaterScreen;