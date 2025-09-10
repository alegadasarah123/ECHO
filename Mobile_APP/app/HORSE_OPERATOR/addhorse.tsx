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
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

type DropdownField = 'sex' | 'breed';

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
}

const API_URL = "http://192.168.101.4:8000/api/horse_operator";

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
  });

  const sexOptions = ['Stallion', 'Gelding', 'Mare'];
  const breedOptions = [
    'Arabian', 'Thoroughbred', 'Quarter Horse', 'Paint Horse', 'Appaloosa',
    'Mustang', 'Clydesdale', 'Friesian', 'Andalusian', 'Percheron',
    'Belgian', 'Shire', 'Tennessee Walker', 'Morgan', 'Standardbred', 'Other',
  ];

  const getCurrentUser = async () => {
    try {
      const userData = await SecureStore.getItemAsync("user_data");
      if (userData) {
        const parsed = JSON.parse(userData);
        console.log("🔑 Current user data:", parsed);
        return parsed;
      }
      return null;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDropdownSelect = (field: DropdownField, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setShowDropdowns(prev => ({ ...prev, [field]: false }));
  };

  const toggleDropdown = (field: DropdownField) => {
    setShowDropdowns({
      sex: false,
      breed: false,
      [field]: !showDropdowns[field],
    });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setDate(selectedDate);
      const formatted = selectedDate.toISOString().split("T")[0];
      setFormData(prev => ({ ...prev, dateOfBirth: formatted }));
    }
    setShowDatePicker(false);
  };

  const handleImagePicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "We need camera roll permissions to select an image");
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

  const saveHorseToBackend = async (newHorse: Horse, userId: string) => {
    try {
      console.log("🐴 Sending horse data to backend:", {
        user_id: userId,
        name: newHorse.name,
        age: newHorse.age,
        dateOfBirth: newHorse.dateOfBirth,
        sex: newHorse.sex,
        breed: newHorse.breed,
        color: newHorse.color,
        height: newHorse.height,
        weight: newHorse.weight,
        image: newHorse.image,
      });

      const response = await fetch(`${API_URL}/add_horse/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          name: newHorse.name,
          age: newHorse.age,
          dateOfBirth: newHorse.dateOfBirth,
          sex: newHorse.sex,
          breed: newHorse.breed,
          color: newHorse.color,
          height: newHorse.height,
          weight: newHorse.weight,
          image: newHorse.image,
        }),
      });

      const responseData = await response.json();
      console.log("📡 Backend response:", responseData);

      if (!response.ok) {
        throw new Error(responseData.error || `HTTP ${response.status}`);
      }

      return responseData;
    } catch (error) {
      console.error("❌ Error saving horse to backend:", error);
      throw error;
    }
  };

  const handleAddHorse = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Please enter horse name");
      return;
    }

    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        Alert.alert("Error", "Please log in again");
        router.replace("/auth/login");
        return;
      }

      const userId = currentUser.user_id || currentUser.id;
      if (!userId) {
        Alert.alert("Error", "User ID not found. Please log in again.");
        router.replace("/auth/login");
        return;
      }

      console.log("👤 Using user_id:", userId);

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
        image: imageUri || null,
      };

      const backendRes = await saveHorseToBackend(newHorse, userId);
      console.log("✅ Horse saved successfully:", backendRes);

      Alert.alert("Success", `Horse ${formData.name} added successfully!`, [
        { text: "OK", onPress: () => router.back() },
      ]);

    } catch (error: any) {
      console.error("❌ Error in handleAddHorse:", error);
      Alert.alert("Error", error.message || "Failed to save horse. Please try again.");
    }
  };

  const renderDropdownField = (field: DropdownField, options: string[], label: string) => (
    <View style={[styles.inputGroup, showDropdowns[field] && styles.dropdownExpanded]} key={field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.dropdown, showDropdowns[field] && styles.dropdownOpen]}
        onPress={() => toggleDropdown(field)}
      >
        <Text style={[styles.dropdownText, !formData[field] && styles.placeholder]}>
          {formData[field] || `Select ${label.toLowerCase()}`}
        </Text>
        <FontAwesome5
          name={showDropdowns[field] ? "chevron-up" : "chevron-down"}
          size={16}
          color="#666"
        />
      </TouchableOpacity>
      
      {showDropdowns[field] && (
        <View style={styles.dropdownMenu}>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.dropdownItem, formData[field] === option && styles.selectedItem]}
                onPress={() => handleDropdownSelect(field, option)}
              >
                <Text style={[styles.dropdownItemText, formData[field] === option && styles.selectedText]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Clean Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome5 name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Add New Horse</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.content} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentContainer}
        >
          {/* Photo Section */}
          <View style={styles.photoSection}>
            <TouchableOpacity style={styles.photoContainer} onPress={handleImagePicker}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <FontAwesome5 name="camera" size={24} color="#CD853F" />
                  <Text style={styles.photoText}>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Horse Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Horse Name</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={value => handleInputChange("name", value)}
                placeholder="Enter horse name"
                placeholderTextColor="#999"
                returnKeyType="next"
              />
            </View>

            {/* Age and Date of Birth */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Age</Text>
                <TextInput
                  style={styles.input}
                  value={formData.age}
                  onChangeText={value => handleInputChange("age", value)}
                  keyboardType="numeric"
                  placeholder="Years"
                  placeholderTextColor="#999"
                  returnKeyType="next"
                />
              </View>
              
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Date of Birth</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={[styles.dateText, !formData.dateOfBirth && styles.placeholder]}>
                    {formData.dateOfBirth || "YYYY-MM-DD"}
                  </Text>
                  <FontAwesome5 name="calendar" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}

            {/* Dropdowns */}
            {renderDropdownField("sex", sexOptions, "Sex")}
            {renderDropdownField("breed", breedOptions, "Breed")}

            {/* Color Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Color</Text>
              <TextInput
                style={styles.input}
                value={formData.color}
                onChangeText={value => handleInputChange("color", value)}
                placeholder="e.g., Bay, Black, Chestnut"
                placeholderTextColor="#999"
                returnKeyType="next"
              />
            </View>

            {/* Height and Weight */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Height</Text>
                <TextInput
                  style={styles.input}
                  value={formData.height}
                  onChangeText={value => handleInputChange("height", value)}
                  placeholder="e.g., 15.2 hands"
                  placeholderTextColor="#999"
                  returnKeyType="next"
                />
              </View>
              
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Weight</Text>
                <TextInput
                  style={styles.input}
                  value={formData.weight}
                  onChangeText={value => handleInputChange("weight", value)}
                  placeholder="e.g., 1000 lbs"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity style={styles.submitBtn} onPress={handleAddHorse}>
              <Text style={styles.submitText}>Add Horse</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // Changed to white to match form
  },
  header: {
    backgroundColor: '#CD853F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#fff',
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f8f8f8',
    borderWidth: 2,
    borderColor: '#CD853F',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoText: {
    marginTop: 8,
    fontSize: 14,
    color: '#CD853F',
    fontWeight: '500',
  },
  form: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24, // Reduced padding
    flex: 1, // Makes form fill remaining space
    minHeight: '100%', // Ensures form covers full height
  },
  inputGroup: {
    marginBottom: 20,
    position: 'relative',
    zIndex: 1,
  },
  dropdownExpanded: {
    zIndex: 1000,
    elevation: 1000,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CD853F',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
    minHeight: 48,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  halfWidth: {
    flex: 1,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#CD853F',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    minHeight: 48,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  placeholder: {
    color: '#999',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#CD853F',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    minHeight: 48,
  },
  dropdownOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedItem: {
    backgroundColor: '#f8f8f8',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  selectedText: {
    color: '#CD853F',
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: '#CD853F',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default AddHorseScreen;