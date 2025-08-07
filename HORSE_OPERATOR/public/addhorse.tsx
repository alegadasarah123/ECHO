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
  Image,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

type DropdownField = 'sex' | 'breed' | 'color';

interface Horse {
  id: string;
  name: string;
  age: string;
  dateOfBirth: string;
  sex: string;
  breed: string;
  color: string;
  height: string;
  weight: string;
  image: string | null;
  lastVetCheck: string;
  condition: string;
  conditionColor: string;
}

const AddHorseScreen = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    dateOfBirth: '',
    sex: '',
    breed: '',
    color: '',
    height: '',
    weight: '',
  });
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showDropdowns, setShowDropdowns] = useState<Record<DropdownField, boolean>>({
    sex: false,
    breed: false,
    color: false,
  });

  const sexOptions = ['Male', 'Female', 'Gelding', 'Mare', 'Stallion'];
  const breedOptions = [
    'Arabian', 
    'Thoroughbred', 
    'Quarter Horse', 
    'Paint Horse', 
    'Appaloosa', 
    'Mustang', 
    'Clydesdale', 
    'Friesian',
    'Andalusian',
    'Percheron',
    'Belgian',
    'Shire',
    'Tennessee Walker',
    'Morgan',
    'Standardbred',
    'Other'
  ];
  const colorOptions = [
    'Bay', 
    'Black', 
    'Brown', 
    'Chestnut', 
    'Gray', 
    'Palomino', 
    'Pinto', 
    'White', 
    'Buckskin',
    'Dun',
    'Roan',
    'Cremello',
    'Perlino',
    'Other'
  ];

  const getCurrentUser = async () => {
    try {
      const user = await AsyncStorage.getItem('current_user');
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDropdownSelect = (field: DropdownField, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setShowDropdowns(prev => ({
      ...prev,
      [field]: false,
    }));
  };

  const toggleDropdown = (field: DropdownField) => {
    setShowDropdowns({
      sex: false,
      breed: false,
      color: false,
      [field]: !showDropdowns[field],
    });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setDate(selectedDate);
      const formatted = selectedDate.toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        dateOfBirth: formatted,
      }));
    }
    setShowDatePicker(false);
  };

  const handleImagePicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to select an image');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const saveHorseToStorage = async (newHorse: Horse) => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('No current user found');
      }
      
      const userHorsesKey = `horses_${currentUser}`;
      const existingHorses = await AsyncStorage.getItem(userHorsesKey);
      const horses: Horse[] = existingHorses ? JSON.parse(existingHorses) : [];
      horses.push(newHorse);
      await AsyncStorage.setItem(userHorsesKey, JSON.stringify(horses));
    } catch (error) {
      console.error('Error saving horse:', error);
      throw error;
    }
  };

  const handleAddHorse = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter horse name');
      return;
    }

    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        Alert.alert('Error', 'Please log in again');
        router.replace('/Login');
        return;
      }

      const newHorse: Horse = {
        id: Date.now().toString(),
        name: formData.name,
        age: formData.age,
        dateOfBirth: formData.dateOfBirth,
        sex: formData.sex,
        breed: formData.breed,
        color: formData.color,
        height: formData.height,
        weight: formData.weight,
        image: imageUri || '/placeholder.svg?height=80&width=80',
        lastVetCheck: 'No record yet',
        condition: 'Needs Check-up',
        conditionColor: '#FFA500',
      };

      await saveHorseToStorage(newHorse);
                
      Alert.alert('Success', `Horse ${formData.name} added successfully for user ${currentUser}!`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error in handleAddHorse:', error);
      Alert.alert('Error', 'Failed to save horse. Please try again.');
    }
  };

  const renderDropdownField = (field: DropdownField, options: string[]) => (
    <View style={[styles.fieldContainer, showDropdowns[field] && styles.fieldContainerExpanded]} key={field}>
      <Text style={styles.fieldLabel}>{field.charAt(0).toUpperCase() + field.slice(1)}</Text>
      <TouchableOpacity
        style={[styles.dropdown, showDropdowns[field] && styles.dropdownActive]}
        onPress={() => toggleDropdown(field)}
      >
        <Text style={[styles.dropdownText, !formData[field] && styles.placeholderText]}>
          {formData[field] || 'Please Select'}
        </Text>
        <FontAwesome5 
          name={showDropdowns[field] ? "chevron-up" : "chevron-down"} 
          size={12} 
          color="#CD853F" 
        />
      </TouchableOpacity>
      {showDropdowns[field] && (
        <View style={styles.dropdownOptions}>
          <ScrollView 
            style={styles.dropdownScrollView}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {options.map((option, index) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.dropdownOption,
                  index === options.length - 1 && styles.dropdownOptionLast
                ]}
                onPress={() => handleDropdownSelect(field, option)}
              >
                <Text style={styles.dropdownOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Horse</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Image */}
        <View style={styles.imageSection}>
          <TouchableOpacity style={styles.imageContainer} onPress={handleImagePicker}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.imagePlaceholder} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <FontAwesome5 name="user" size={40} color="#ccc" />
              </View>
            )}
            <View style={styles.cameraIcon}>
              <FontAwesome5 name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.formContainer}>
          {/* Horse Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Your Horse Name</Text>
            <TextInput
              style={styles.textInput}
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
            />
          </View>

          {/* Age */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Age</Text>
            <TextInput
              style={styles.textInput}
              value={formData.age}
              onChangeText={(value) => handleInputChange('age', value)}
              keyboardType="numeric"
            />
          </View>

          {/* Date of Birth with Picker */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Date of Birth</Text>
            <TouchableOpacity style={styles.dateInputContainer} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateInput}>
                {formData.dateOfBirth || 'YYYY-MM-DD'}
              </Text>
              <FontAwesome5 name="calendar-alt" size={16} color="#CD853F" style={styles.calendarIcon} />
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}

          {/* Dropdown Fields */}
          {renderDropdownField('sex', sexOptions)}
          {renderDropdownField('breed', breedOptions)}
          {renderDropdownField('color', colorOptions)}

          {/* Height */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Height</Text>
            <TextInput
              style={styles.textInput}
              value={formData.height}
              onChangeText={(value) => handleInputChange('height', value)}
              placeholder="e.g., 15.2 hands"
            />
          </View>

          {/* Weight */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Weight</Text>
            <TextInput
              style={styles.textInput}
              value={formData.weight}
              onChangeText={(value) => handleInputChange('weight', value)}
              placeholder="e.g., 1000 lbs"
            />
          </View>

          {/* Add Horse Button */}
          <TouchableOpacity style={styles.addButton} onPress={handleAddHorse}>
            <Text style={styles.addButtonText}>Add Horse</Text>
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
  imageSection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#f5f5f5',
  },
  imageContainer: {
    position: 'relative',
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  fieldContainer: {
    marginBottom: 20,
    position: 'relative',
    zIndex: 1,
  },
  fieldContainerExpanded: {
    zIndex: 1000,
    elevation: 1000,
  },
  fieldLabel: {
    fontSize: 16,
    color: '#CD853F',
    marginBottom: 8,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#CD853F',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CD853F',
    borderRadius: 25,
    backgroundColor: '#fff',
    paddingRight: 15,
  },
  dateInput: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  calendarIcon: {
    marginLeft: 10,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CD853F',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  dropdownActive: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  dropdownOptions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#CD853F',
    borderTopWidth: 0,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    zIndex: 1000,
    elevation: 1000,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdownScrollView: {
    maxHeight: 200,
  },
  dropdownOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownOptionLast: {
    borderBottomWidth: 0,
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#333',
  },
  addButton: {
    backgroundColor: '#CD853F',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 30,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AddHorseScreen;