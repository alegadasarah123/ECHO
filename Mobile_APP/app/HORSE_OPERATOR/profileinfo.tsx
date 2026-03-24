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
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

// Philippines provinces and their cities/municipalities
const philippinesData: Record<string, { cities: string[]; municipalities: string[] }> = {
  Cebu: {
    cities: ["Cebu City", "Danao City", "Lapu-Lapu City", "Mandaue City", "Talisay City", "Toledo City", "Carcar City"],
    municipalities: [
      "Alcantara", "Alcoy", "Alegria", "Aloguinsan", "Argao", "Asturias", "Badian", "Balamban",
      "Bantayan", "Barili", "Bogo", "Boljoon", "Borbon", "Carmen", "Catmon", "Compostela",
      "Consolacion", "Cordova", "Daanbantayan", "Dalaguete", "Dumanjug", "Ginatilan", "Liloan",
      "Madridejos", "Malabuyoc", "Medellin", "Minglanilla", "Moalboal", "Oslob", "Pilar",
      "Pinamungajan", "Poro", "Ronda", "Samboan", "San Fernando", "San Francisco", "San Remigio",
      "Santa Fe", "Santander", "Sibonga", "Sogod", "Tabogon", "Tabuelan", "Tuburan", "Tudela",
    ],
  },
};

const barangayData: { [province: string]: { [cityMunicipality: string]: string[] } } = {
  Cebu: {
    "Cebu City": ["Apas", "Lahug", "Capitol Site", "Guadalupe", "Mabolo", "Banilad", "Talamban", "Kasambagan", "Busay", "Tisa"],
    "Mandaue City": ["Alang-alang", "Bakilid", "Banilad", "Basak", "Cabancalan", "Canduman", "Casili", "Casuntingan", "Centro", "Cambaro"],
    "Lapu-Lapu City": ["Agus", "Babag", "Bankal", "Basak", "Buaya", "Calawisan", "Canjulao", "Caubian", "Cawhagan", "Gun-ob"],
  },
};

const sexOptions = ["Male", "Female", "Other", "Prefer not to say"];

interface UserProfileData {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dob?: string;
  sex?: string;
  phoneNumber?: string;
  province?: string;
  city?: string;
  municipality?: string;
  barangay?: string;
  zipCode?: string;
  houseAddress?: string;
  route?: string;
  routeTo?: string;
  email?: string;
  facebook?: string;
  profileImage?: string;
  user_id?: string;
  role?: string;
}

interface DropdownFieldProps {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  onSelect: (value: string) => void;
  disabled?: boolean;
  isEditing: boolean;
}

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const API_BASE_URL = "https://echo-ebl8.onrender.com/api/horse_operator";

const ProfileInfoScreen = () => {
  const router = useRouter();
  const [userData, setUserData] = useState<UserProfileData>({});
  const [editableUserData, setEditableUserData] = useState<UserProfileData>({});
  const [isEditing, setIsEditing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState<string | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState<ChangePasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const loadUserId = async (): Promise<string | undefined> => {
    try {
      const storedUser = await SecureStore.getItemAsync("user_data");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const id = parsed.user_id || parsed.id;
        if (id) {
          console.log("🔑 Loaded user_id from storage:", id);
          setUserId(id);
          return id;
        }
      }
    } catch (error) {
      console.error("❌ Error loading user data:", error);
    }
    return undefined;
  };

  const fetchProfileData = useCallback(async () => {
    try {
      setIsLoading(true);
      let uid = userId;
      
      if (!uid) {
        const loadedUserId = await loadUserId();
        if (!loadedUserId) {
          console.error("No user_id found, cannot fetch profile.");
          return;
        }
        uid = loadedUserId;
      }

      console.log("Fetching profile for user_id:", uid);
      
      const url = `${API_BASE_URL}/get_horse_operator_profile/?user_id=${encodeURIComponent(uid)}`;
      console.log("Request URL:", url);

      const response = await fetch(url);
      console.log("Response status:", response.status);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.log("Error response:", errData);
        throw new Error(errData.error || `Failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log("Profile data received:", data);

      const transformedData: UserProfileData = {
        user_id: uid,
        firstName: data.op_fname || '',
        middleName: data.op_mname || '',
        lastName: data.op_lname || '',
        dob: data.op_dob || '',
        sex: data.op_sex || '',
        phoneNumber: data.op_phone_num || '',
        province: data.op_province || 'Cebu',
        city: data.op_city || '',
        municipality: data.op_municipality || '',
        barangay: data.op_brgy || '',
        zipCode: data.op_zipcode || '',
        houseAddress: data.op_house_add || '',
        email: data.op_email || '',
        profileImage: data.op_image || '',
      };

      setUserData(transformedData);
      setEditableUserData(transformedData);
    } catch (error: any) {
      console.error("Error loading profile:", error);
      Alert.alert("Error", error.message || "Unable to load profile data");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const saveProfileData = async (dataToSave: UserProfileData) => {
    try {
      if (!userId) {
        throw new Error("User ID not found");
      }

      setIsSaving(true);
      console.log("Saving profile data...");

      const url = `${API_BASE_URL}/update_horse_operator_profile/`;
      const payload = {
        op_id: userId,
        op_fname: dataToSave.firstName,
        op_mname: dataToSave.middleName,
        op_lname: dataToSave.lastName,
        op_dob: dataToSave.dob,
        op_sex: dataToSave.sex,
        op_phone_num: dataToSave.phoneNumber,
        op_province: dataToSave.province,
        op_city: dataToSave.city,
        op_municipality: dataToSave.municipality,
        op_brgy: dataToSave.barangay,
        op_zipcode: dataToSave.zipCode,
        op_house_add: dataToSave.houseAddress,
        op_email: dataToSave.email,
        op_image: dataToSave.profileImage,
      };

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log("Save response status:", response.status);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.log("Save error response:", errData);
        throw new Error(errData.error || `Failed to save with status ${response.status}`);
      }

      const result = await response.json();
      console.log("Profile saved successfully:", result);
      
      Alert.alert(
        'Success', 
        result.image_uploaded 
          ? 'Profile and image updated successfully!' 
          : 'Profile updated successfully!'
      );
      
      await fetchProfileData();
      
      return true;
    } catch (error: any) {
      console.error("Error saving profile:", error);
      Alert.alert('Error', error.message || 'Failed to save profile information.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // PASSWORD CHANGE HANDLERS
  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword.trim()) {
      Alert.alert("Validation Error", "Please enter your current password.")
      return
    }
    if (!passwordData.newPassword.trim()) {
      Alert.alert("Validation Error", "Please enter a new password.")
      return
    }
    if (!passwordData.confirmPassword.trim()) {
      Alert.alert("Validation Error", "Please confirm your new password.")
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert("Validation Error", "New password and confirmation do not match.")
      return
    }

    if (passwordData.newPassword.length < 8) {
      Alert.alert("Validation Error", "New password must be at least 8 characters long.")
      return
    }

    Alert.alert("Change Password", "Are you sure you want to change your password?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Change",
        onPress: () => savePasswordChange(),
      },
    ])
  }

  const savePasswordChange = async () => {
    try {
      setIsChangingPassword(true)

      if (!userData?.email) {
        Alert.alert("Error", "Unable to change password: No email found in your profile.")
        setIsChangingPassword(false)
        return
      }

      const email = userData.email

      console.log("🔄 Attempting to change password for:", email)
      console.log("📤 Sending request to:", `${API_BASE_URL}/change_password/`)

      const response = await fetch(`${API_BASE_URL}/change_password/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      console.log("📥 Password change response status:", response.status)
      
      let result;
      try {
        result = await response.json()
        console.log("📥 Password change response data:", result)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (parseError) {
        console.log("❌ Failed to parse response as JSON")
        result = { error: "Invalid server response" }
      }

      if (response.ok && result.success) {
        Alert.alert("Success", result.message || "Your password has been changed successfully!", [
          {
            text: "OK",
            onPress: () => {
              setShowChangePassword(false)
              setPasswordData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
              })
            },
          },
        ])
      } else {
        // Handle specific error cases
        let errorMessage = result.error || result.message || "Failed to change password. Please try again."
        
        if (response.status === 401) {
          errorMessage = "Current password is incorrect."
        } else if (response.status === 400) {
          errorMessage = result.error || "Invalid request. Please check your inputs."
        } else if (response.status === 500) {
          errorMessage = "Server error. Please try again later."
        }
        
        Alert.alert("Error", errorMessage)
      }
    } catch (error) {
      console.error("❌ Error changing password:", error)
      Alert.alert("Error", "Network error. Please check your connection and try again.")
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handlePasswordInputChange = (field: keyof ChangePasswordData, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleGoBack = () => {
    if (isEditing) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Discard', 
            style: 'destructive',
            onPress: () => router.back()
          }
        ]
      );
    } else {
      router.back();
    }
  };

  const handleChooseProfileImage = async () => {
    if (!isEditing) return;

    Alert.alert('Select Profile Photo', 'Choose how you\'d like to add your profile picture', [
      {
        text: 'Camera',
        onPress: () => openCamera(),
      },
      {
        text: 'Photo Library',
        onPress: () => openImageLibrary(),
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  const openCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        const base64Image = `data:image/jpeg;base64,${asset.base64}`;
        
        setEditableUserData((prevData) => ({
          ...prevData,
          profileImage: base64Image,
        }));
        
        console.log('Profile image selected from camera');
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const openImageLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Photo library permission is required to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        const base64Image = `data:image/jpeg;base64,${asset.base64}`;
        
        setEditableUserData((prevData) => ({
          ...prevData,
          profileImage: base64Image,
        }));
        
        console.log('Profile image selected from gallery');
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to open photo library. Please try again.');
    }
  };

  const handleDeleteProfileImage = async () => {
    if (!isEditing) return;
    
    Alert.alert(
      'Delete Profile Image',
      'Are you sure you want to remove your profile image?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setEditableUserData((prevData) => ({
              ...prevData,
              profileImage: '',
            }));
          },
        },
      ]
    );
  };

  const handleEditSave = async () => {
    if (isEditing) {
      const dataToSave = {
        ...editableUserData,
        dob: editableUserData.dob ? new Date(editableUserData.dob).toISOString().split('T')[0] : undefined,
      };

      const success = await saveProfileData(dataToSave);
      if (success) {
        setUserData(dataToSave);
        setIsEditing(false);
      }
    } else {
      setEditableUserData(userData);
      setIsEditing(true);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEditableUserData((prevData) => ({
        ...prevData,
        dob: selectedDate.toISOString().split('T')[0],
      }));
    }
  };

  const renderTextInputField = useCallback((
    label: string,
    key: keyof UserProfileData,
    placeholder: string = '',
    icon?: string
  ) => {
    const isDateField = key === 'dob';
    const inputValue = editableUserData[key] as string || '';
    const displayValue = isDateField && inputValue
      ? new Date(inputValue).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : inputValue;

    return (
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        {isDateField && isEditing ? (
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.inputContainer}>
            <Text style={[styles.inputText, !displayValue && styles.placeholderText, { flex: 1 }]}>
              {displayValue || placeholder}
            </Text>
            <FontAwesome name="calendar" size={18} color="#8B7355" />
          </TouchableOpacity>
        ) : (
          <View style={styles.inputContainer}>
            {icon && isEditing && <FontAwesome5 name={icon} size={16} color="#8B7355" style={styles.inputIconLeft} />}
            <TextInput
              style={[styles.inputText, { flex: 1 }]}
              value={displayValue}
              placeholder={placeholder}
              placeholderTextColor="#999"
              editable={isEditing && !isDateField}
              onChangeText={(text) => {
                setEditableUserData((prevData) => ({
                  ...prevData,
                  [key]: text,
                }));
              }}
            />
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
  }, [isEditing, editableUserData, showDatePicker]);

  const DropdownField = ({ label, value, placeholder, options, onSelect, disabled = false, isEditing }: DropdownFieldProps) => {
    const dropdownKey = label.toLowerCase().replace(/\s+/g, '');

    return (
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        {isEditing ? (
          <>
            <TouchableOpacity
              style={[styles.dropdownContainer, disabled && styles.disabledDropdown]}
              onPress={() => !disabled && setDropdownVisible(dropdownKey)}
              disabled={disabled}
            >
              <Text style={[styles.dropdownText, !value && styles.placeholderText]}>
                {value || placeholder}
              </Text>
              <FontAwesome name="chevron-down" size={14} color="#8B7355" />
            </TouchableOpacity>

            <Modal
              visible={dropdownVisible === dropdownKey}
              transparent
              animationType="fade"
              onRequestClose={() => setDropdownVisible(null)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setDropdownVisible(null)}
              >
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select {label}</Text>
                    <TouchableOpacity onPress={() => setDropdownVisible(null)}>
                      <FontAwesome name="times" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={options}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.optionItem,
                          value === item && styles.selectedOption
                        ]}
                        onPress={() => {
                          onSelect(item);
                          setDropdownVisible(null);
                        }}
                      >
                        <Text style={[
                          styles.optionText,
                          value === item && styles.selectedOptionText
                        ]}>{item}</Text>
                        {value === item && (
                          <FontAwesome name="check" size={16} color="#CD853F" />
                        )}
                      </TouchableOpacity>
                    )}
                    style={styles.optionsList}
                  />
                </View>
              </TouchableOpacity>
            </Modal>
          </>
        ) : (
          <View style={styles.inputContainer}>
            <Text style={styles.inputText}>{value || placeholder}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderPasswordInput = (
    label: string, 
    value: string, 
    placeholder: string, 
    onChangeText: (text: string) => void, 
    secureTextEntry = true,
    error?: string
  ) => {
    return (
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View style={[
          styles.inputContainer, 
          error ? styles.inputError : {}
        ]}>
          <TextInput
            style={[styles.inputText, { flex: 1 }]}
            value={value}
            placeholder={placeholder}
            placeholderTextColor="#999"
            secureTextEntry={secureTextEntry}
            onChangeText={onChangeText}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#CD853F" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedProvinceData = editableUserData.province ? philippinesData[editableUserData.province] : null;
  const availableCities = selectedProvinceData
    ? [...selectedProvinceData.cities, ...selectedProvinceData.municipalities].sort()
    : [];

  const availableBarangays =
    editableUserData.province &&
    editableUserData.city &&
    barangayData[editableUserData.province] &&
    barangayData[editableUserData.province][editableUserData.city]
      ? barangayData[editableUserData.province][editableUserData.city]
      : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Information</Text>
        <TouchableOpacity 
          onPress={handleEditSave} 
          style={styles.editButton}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.editButtonText}>{isEditing ? 'Save' : 'Edit'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          <TouchableOpacity 
            onPress={handleChooseProfileImage} 
            style={styles.profileImageContainer}
            disabled={!isEditing}
          >
            <View style={styles.profileImageWrapper}>
              <Image
                source={{ 
                  uri: editableUserData.profileImage || 'https://via.placeholder.com/140x140/f0f0f0/999999?text=Profile' 
                }}
                style={styles.profileImage}
              />
              {isEditing && (
                <View style={styles.cameraIconOverlay}>
                  <FontAwesome5 name="camera" size={20} color="#fff" />
                </View>
              )}
            </View>
            {editableUserData.profileImage && isEditing && (
              <TouchableOpacity 
                onPress={handleDeleteProfileImage}
                style={styles.deleteImageButton}
              >
                <FontAwesome5 name="trash-alt" size={14} color="#fff" />
                <Text style={styles.deleteImageText}>Remove Photo</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          
          <View style={styles.profileNameContainer}>
            <Text style={styles.profileName}>
              {userData.firstName || userData.middleName || userData.lastName
                ? `${userData.firstName || ''} ${userData.middleName || ''} ${userData.lastName || ''}`.trim()
                : 'Complete your profile'}
            </Text>
            <Text style={styles.profileSubtext}>Horse Operator</Text>
          </View>

          {/* Change Password Button */}
          <TouchableOpacity 
            style={styles.changePasswordButton}
            onPress={() => setShowChangePassword(true)}
          >
            <FontAwesome5 name="key" size={16} color="#CD853F" />
            <Text style={styles.changePasswordText}>Change Password</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <FontAwesome5 name="user" size={16} color="#CD853F" />
              <Text style={styles.sectionTitle}>Personal Information</Text>
            </View>
            {renderTextInputField('First Name', 'firstName', 'Enter first name', 'user')}
            {renderTextInputField('Middle Name', 'middleName', 'Enter middle name (optional)')}
            {renderTextInputField('Last Name', 'lastName', 'Enter last name', 'user')}
            {renderTextInputField('Date of Birth', 'dob', 'Select date of birth')}
            <DropdownField
              label="Sex"
              value={editableUserData.sex || ''}
              placeholder="Select sex"
              options={sexOptions}
              onSelect={(value) => setEditableUserData((prev) => ({ ...prev, sex: value }))}
              isEditing={isEditing}
            />
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <FontAwesome5 name="phone" size={16} color="#CD853F" />
              <Text style={styles.sectionTitle}>Contact Information</Text>
            </View>
            {renderTextInputField('Phone Number', 'phoneNumber', '+63 XXX XXX XXXX', 'mobile-alt')}
            {renderTextInputField('Email', 'email', 'your.email@example.com', 'envelope')}
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <FontAwesome5 name="map-marker-alt" size={16} color="#CD853F" />
              <Text style={styles.sectionTitle}>Address</Text>
            </View>
            <DropdownField
              label="Province"
              value={editableUserData.province || ''}
              placeholder="Select province"
              options={Object.keys(philippinesData).sort()}
              onSelect={(value) => {
                setEditableUserData((prev) => ({
                  ...prev,
                  province: value,
                  city: '',
                  municipality: '',
                  barangay: '',
                }));
              }}
              isEditing={isEditing}
            />
            <DropdownField
              label="City/Municipality"
              value={editableUserData.city || ''}
              placeholder="Select city or municipality"
              options={availableCities}
              onSelect={(value) => {
                setEditableUserData((prev) => ({
                  ...prev,
                  city: value,
                  municipality: '',
                  barangay: '',
                }));
              }}
              disabled={!editableUserData.province}
              isEditing={isEditing}
            />

            {availableBarangays.length > 0 && (
              <DropdownField
                label="Barangay"
                value={editableUserData.barangay || ''}
                placeholder="Select barangay"
                options={availableBarangays}
                onSelect={(value) => setEditableUserData((prev) => ({ ...prev, barangay: value }))}
                disabled={!editableUserData.city}
                isEditing={isEditing}
              />
            )}

            {editableUserData.city && availableBarangays.length === 0 && (
              renderTextInputField('Barangay', 'barangay', 'Enter barangay')
            )}

            {renderTextInputField('Zip Code', 'zipCode', 'e.g. 6000')}
            {renderTextInputField('House Number / Street', 'houseAddress', 'Enter complete address')}
          </View>

          {isEditing && (
            <TouchableOpacity 
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
              onPress={handleEditSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={[styles.saveButtonText, { marginLeft: 10 }]}>Updating...</Text>
                </>
              ) : (
                <>
                  <FontAwesome5 name="check" size={18} color="#fff" />
                  <Text style={styles.saveButtonText}>Update Profile</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePassword}
        transparent
        animationType="slide"
        onRequestClose={() => !isChangingPassword && setShowChangePassword(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.passwordModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity 
                onPress={() => setShowChangePassword(false)}
                disabled={isChangingPassword}
              >
                <FontAwesome name="times" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.passwordForm}>
              {renderPasswordInput(
                'Current Password',
                passwordData.currentPassword,
                'Enter current password',
                (text) => handlePasswordInputChange('currentPassword', text),
                true
              )}
              
              {renderPasswordInput(
                'New Password',
                passwordData.newPassword,
                'Enter new password',
                (text) => handlePasswordInputChange('newPassword', text),
                true
              )}
              
              {renderPasswordInput(
                'Confirm New Password',
                passwordData.confirmPassword,
                'Confirm new password',
                (text) => handlePasswordInputChange('confirmPassword', text),
                true
              )}

              <View style={styles.passwordButtonContainer}>
                <TouchableOpacity 
                  style={[styles.cancelButton, isChangingPassword && styles.disabledButton]}
                  onPress={() => setShowChangePassword(false)}
                  disabled={isChangingPassword}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.confirmButton, isChangingPassword && styles.disabledButton]}
                  onPress={handlePasswordChange}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.confirmButtonText}>Change Password</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 16,
    backgroundColor: '#CD853F',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    marginTop: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    marginLeft: 12,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    minWidth: 60,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollViewContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  profileSection: {
    backgroundColor: '#fff',
    paddingVertical: 30,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImageWrapper: {
    position: 'relative',
  },
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#E5E7EB',
    borderWidth: 5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cameraIconOverlay: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#CD853F',
    borderRadius: 25,
    padding: 12,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EF4444',
    borderRadius: 20,
    gap: 6,
  },
  deleteImageText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  profileNameContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  profileSubtext: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  changePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FEF3E2',
    borderRadius: 25,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#CD853F',
  },
  changePasswordText: {
    color: '#CD853F',
    fontSize: 15,
    fontWeight: '600',
  },
  formContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 10,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  inputIconLeft: {
    marginRight: 12,
  },
  inputText: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },
  placeholderText: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  dropdownContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F9FAFB',
  },
  disabledDropdown: {
    backgroundColor: '#E5E7EB',
    opacity: 0.7,
  },
  dropdownText: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  passwordModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  optionsList: {
    maxHeight: 400,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedOption: {
    backgroundColor: '#FEF3E2',
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  selectedOptionText: {
    color: '#CD853F',
    fontWeight: '700',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#CD853F',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#CD853F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    gap: 10,
  },
  saveButtonDisabled: {
    backgroundColor: '#D3A876',
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  passwordForm: {
    padding: 20,
  },
  passwordButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#CD853F',
    gap: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default ProfileInfoScreen;