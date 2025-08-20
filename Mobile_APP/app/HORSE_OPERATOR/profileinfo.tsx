import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Platform, // Re-added Platform for DateTimePicker
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons'; // Added FontAwesome
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker'; // Added DateTimePicker

// Define proper types for the location data
type LocationData = {
  [province: string]: {
    cities: {
      [city: string]: {
        municipalities: string[];
        barangays: {
          [municipality: string]: string[];
        };
      };
    };
  };
};

// Define types for route data
type RouteData = {
  [route: string]: string[];
};

interface UserProfileData {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dob?: string; // Changed from dateOfBirth to dob
  sex?: string;
  phoneNumber?: string;
  province?: string;
  city?: string;
  municipality?: string;
  barangay?: string;
  zipCode?: string;
  houseAddress?: string; // Changed from houseNumber to houseAddress
  route?: string;
  routeTo?: string; // Changed from to to routeTo
  email?: string;
  facebook?: string;
  username?: string;
  password?: string;
  profileImage?: string;
}

const locationData: LocationData = {
  cebu: {
    cities: {
      'Cebu City': {
        municipalities: ['Talamban', 'Lahug'],
        barangays: {
          Talamban: ['Barangay 1', 'Barangay 2'],
          Lahug: ['Barangay 3', 'Barangay 4'],
        },
      },
      'Mandaue City': {
        municipalities: ['Tipolo', 'Centro'],
        barangays: {
          Tipolo: ['Barangay 5', 'Barangay 6'],
          Centro: ['Barangay 7', 'Barangay 8'],
        },
      },
    },
  },
  bohol: {
    cities: {
      Tagbilaran: {
        municipalities: ['Bool', 'Cogon'],
        barangays: {
          Bool: ['Barangay 9', 'Barangay 10'],
          Cogon: ['Barangay 11', 'Barangay 12'],
        },
      },
    },
  },
};

const routeData: RouteData = {
  Ayala: ['Colon', 'SM City', 'IT Park'],
  'SM City': ['Ayala', 'Colon', 'IT Park'],
  Colon: ['Ayala', 'SM City', 'IT Park'],
  'IT Park': ['Ayala', 'SM City', 'Colon'],
};

const ProfileInfoScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [userData, setUserData] = useState<UserProfileData>({});
  const [editableUserData, setEditableUserData] = useState<UserProfileData>({});
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false); // State for date picker visibility

  // Helper functions to safely access nested data for pickers
  const getProvinces = () => Object.keys(locationData);
  const getCities = (province: string | undefined) => {
    if (!province || !locationData[province]) return [];
    return Object.keys(locationData[province].cities);
  };
  const getMunicipalities = (province: string | undefined, city: string | undefined) => {
    if (!province || !city || !locationData[province]?.cities[city]) return [];
    return locationData[province].cities[city].municipalities;
  };
  const getBarangays = (province: string | undefined, city: string | undefined, municipality: string | undefined) => {
    if (!province || !city || !municipality || !locationData[province]?.cities[city]?.barangays[municipality]) return [];
    return locationData[province].cities[city].barangays[municipality];
  };
  const getRouteToOptions = (route: string | undefined) => {
    if (!route || !routeData[route]) return [];
    return routeData[route];
  };

  // Load profile data from params or AsyncStorage
  useEffect(() => {
    const loadProfileData = async () => {
      let dataToUse: UserProfileData = {};
      if (params.userData) {
        try {
          dataToUse = JSON.parse(params.userData as string);
          console.log('Loaded data from params:', dataToUse);
        } catch (e) {
          console.error('Error parsing user data from params:', e);
        }
      }
      if (Object.keys(dataToUse).length === 0) {
        try {
          const storedUserData = await AsyncStorage.getItem('current_user_data');
          if (storedUserData) {
            dataToUse = JSON.parse(storedUserData);
            console.log('Loaded data from AsyncStorage:', dataToUse);
          }
        } catch (error) {
          console.error('Error loading profile data from AsyncStorage:', error);
        }
      }
      if (Object.keys(dataToUse).length === 0) {
        // Default placeholder data if no data is found
        dataToUse = {
          firstName: 'Martin',
          middleName: 'Aqua',
          lastName: 'Diaz',
          dob: '1990-01-25T00:00:00.000Z', // Example ISO string
          sex: 'Male',
          phoneNumber: '09391323173',
          province: 'cebu', // Use lowercase for consistency with locationData keys
          city: 'Cebu City',
          municipality: 'Talamban',
          barangay: 'Barangay 1',
          zipCode: '6000',
          houseAddress: '123 Paseo de Roxas St.',
          route: 'Ayala',
          routeTo: 'Colon',
          email: 'martindiaz@gmail.com',
          facebook: 'Martin Diaz',
          username: 'martindiaz',
          password: 'password123',
          profileImage: '/diverse-group-profile.png',
        };
        await AsyncStorage.setItem('current_user_data', JSON.stringify(dataToUse));
        console.log('Using default placeholder data.');
      }
      setUserData(dataToUse);
      setEditableUserData(dataToUse);
    };
    loadProfileData();
  }, [params.userData]);

  const handleGoBack = () => {
    router.back();
  };

  const handleChooseProfileImage = async () => {
    if (!isEditing) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Media library permission is required to upload a photo!');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setEditableUserData((prevData) => ({
        ...prevData,
        profileImage: result.assets[0].uri,
      }));
    }
  };

  const handleEditSave = async () => {
    if (isEditing) {
      const currentPassword = editableUserData.password;
      const originalPassword = userData.password;

      // Only validate password if it's being changed
      if (currentPassword !== originalPassword) {
        if (confirmPasswordInput === '') {
          Alert.alert('Error', 'Please confirm your new password.');
          return;
        }
        if (currentPassword !== confirmPasswordInput) {
          Alert.alert('Error', 'New password and confirm password do not match.');
          return;
        }
      }

      try {
        const finalPassword =
          currentPassword === '********' ? originalPassword : currentPassword; // Keep original if not changed
        
        const dataToSave = {
          ...editableUserData,
          password: finalPassword,
          // Ensure dob is stored as ISO string
          dob: editableUserData.dob ? new Date(editableUserData.dob).toISOString() : undefined,
        };

        await AsyncStorage.setItem('current_user_data', JSON.stringify(dataToSave));
        setUserData(dataToSave);
        Alert.alert('Success', 'Profile information updated successfully!');
      } catch (error) {
        console.error('Error saving profile data:', error);
        Alert.alert('Error', 'Failed to save profile information.');
      }
    } else {
      setEditableUserData(userData);
      setConfirmPasswordInput('');
    }
    setIsEditing(!isEditing);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEditableUserData((prevData) => ({
        ...prevData,
        dob: selectedDate.toISOString(),
      }));
    }
  };

  const renderTextInputField = useCallback((
    label: string,
    key: keyof UserProfileData,
    placeholder: string = '',
    isPassword?: boolean,
    isConfirmPassword?: boolean
  ) => {
    const isDateField = key === 'dob';
    const inputValue = isConfirmPassword ? confirmPasswordInput : (editableUserData[key] as string || '');
    const displayValue = isDateField && inputValue
      ? new Date(inputValue).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : (isPassword && !isEditing ? '********' : inputValue);

    return (
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        {isDateField && isEditing ? (
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.inputWithIcon}>
            <Text style={styles.input}>{displayValue}</Text>
            <FontAwesome name="calendar" size={20} color="#888" style={styles.inputIcon} />
          </TouchableOpacity>
        ) : (
          <View style={styles.inputWithIcon}>
            <TextInput
              style={styles.input}
              value={displayValue}
              placeholder={placeholder}
              editable={isEditing && !isDateField} // Date field is handled by TouchableOpacity
              secureTextEntry={
                isPassword && (isConfirmPassword ? !showConfirmPassword : !showPassword) && isEditing
              }
              onChangeText={(text) => {
                if (isConfirmPassword) {
                  setConfirmPasswordInput(text);
                } else {
                  setEditableUserData((prevData) => ({
                    ...prevData,
                    [key]: text,
                  }));
                }
              }}
            />
            {isPassword && isEditing && (
              <TouchableOpacity
                onPress={() =>
                  isConfirmPassword ? setShowConfirmPassword(!showConfirmPassword) : setShowPassword(!showPassword)
                }
                style={styles.passwordToggle}
              >
                <FontAwesome5
                  name={
                    (isConfirmPassword ? showConfirmPassword : showPassword) ? 'eye' : 'eye-slash'
                  }
                  size={20}
                  color="#888"
                />
              </TouchableOpacity>
            )}
            {isDateField && !isEditing && ( // Show calendar icon only when not editing and it's a date field
              <FontAwesome name="calendar" size={20} color="#888" style={styles.inputIcon} />
            )}
          </View>
        )}
        {showDatePicker && isDateField && (
          <DateTimePicker
            value={new Date(editableUserData.dob || new Date())}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}
      </View>
    );
  }, [isEditing, editableUserData, showPassword, showConfirmPassword, confirmPasswordInput, showDatePicker]);

  const renderPickerField = useCallback((
    label: string,
    key: keyof UserProfileData,
    options: string[] | ((data: UserProfileData) => string[])
  ) => {
    const currentOptions = typeof options === 'function' ? options(editableUserData) : options;
    return (
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        {isEditing ? (
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={editableUserData[key] as string}
              onValueChange={(itemValue) => {
                setEditableUserData((prevData) => {
                  const newData = { ...prevData, [key]: itemValue };
                  // Reset dependent pickers when a parent picker changes
                  if (key === 'province') {
                    newData.city = '';
                    newData.municipality = '';
                    newData.barangay = '';
                  } else if (key === 'city') {
                    newData.municipality = '';
                    newData.barangay = '';
                  } else if (key === 'municipality') {
                    newData.barangay = '';
                  } else if (key === 'route') {
                    newData.routeTo = '';
                  }
                  return newData;
                });
              }}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              <Picker.Item label="Please Select" value="" />
              {currentOptions.map((option) => (
                <Picker.Item key={option} label={option} value={option} />
              ))}
            </Picker>
            <FontAwesome5 name="chevron-down" size={16} color="#888" style={styles.pickerIcon} />
          </View>
        ) : (
          <TextInput
            style={styles.input}
            value={editableUserData[key] as string || ''}
            editable={false}
          />
        )}
      </View>
    );
  }, [isEditing, editableUserData]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Information</Text>
      </View>
      <ScrollView style={styles.scrollViewContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={handleChooseProfileImage} style={styles.profileImageContainer}>
          <Image
            source={{ uri: editableUserData.profileImage || '/diverse-group-profile.png' }}
            style={styles.profileImage}
          />
          {isEditing && (
            <View style={styles.cameraIconOverlay}>
              <FontAwesome5 name="camera" size={24} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.formContainer}>
          {/* Your Name */}
          <Text style={styles.sectionTitle}>Your Name</Text>
          {renderTextInputField('First Name', 'firstName')}
          {renderTextInputField('Middle Name', 'middleName')}
          {renderTextInputField('Last Name', 'lastName')}
          {/* Date of Birth */}
          {renderTextInputField('Date of Birth', 'dob')}
          {/* Sex */}
          {renderPickerField('Sex', 'sex', ['Male', 'Female', 'Other'])}
          {/* Phone Number */}
          {renderTextInputField('Phone Number', 'phoneNumber')}
          {/* Address in the Philippines */}
          <Text style={styles.sectionTitle}>ADDRESS IN THE PHILIPPINES</Text>
          {renderPickerField('Province', 'province', getProvinces)}
          {renderPickerField('City', 'city', (data) => getCities(data.province))}
          {renderPickerField('Municipality', 'municipality', (data) => getMunicipalities(data.province, data.city))}
          {renderPickerField('Barangay', 'barangay', (data) => getBarangays(data.province, data.city, data.municipality))}
          {renderTextInputField('Zip Code', 'zipCode')}
          {renderTextInputField('House Number or Street Address', 'houseAddress')}
          {renderPickerField('Route', 'route', Object.keys(routeData))}
          {renderPickerField('To', 'routeTo', (data) => getRouteToOptions(data.route))}
          {/* Contact and Account Info */}
          {renderTextInputField('Email (if any)', 'email')}
          {renderTextInputField('Facebook', 'facebook')}
          {renderTextInputField('Username', 'username')}
          {renderTextInputField('Password', 'password', '', true)}
          {isEditing && renderTextInputField('Confirm Password', 'password', '', true, true)}
          <TouchableOpacity style={styles.button} onPress={handleEditSave}>
            <Text style={styles.buttonText}>{isEditing ? 'Update' : 'Edit'}</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#CD853F',
    paddingTop: 50,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollViewContent: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -20,
    paddingTop: 20,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e0e0e0',
    borderWidth: 4,
    borderColor: '#fff',
  },
  cameraIconOverlay: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 8,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#CD853F',
    marginTop: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
    fontWeight: '500',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  inputIcon: {
    paddingRight: 15,
  },
  passwordToggle: {
    padding: 10,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
    justifyContent: 'center',
    position: 'relative',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  pickerItem: {
    fontSize: 16,
    color: '#333',
  },
  pickerIcon: {
    position: 'absolute',
    right: 15,
    top: '50%',
    marginTop: -8,
  },
  button: {
    backgroundColor: '#CD853F',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ProfileInfoScreen;
