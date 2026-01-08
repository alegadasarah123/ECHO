// Horse Profile Screen - horseprofile.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  Dimensions,
  FlatList,
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width: screenWidth } = Dimensions.get('window');

interface Horse {
  horse_id: string;
  horse_name: string;
  horse_age: string;
  horse_dob: string;
  horse_sex: string;
  horse_breed: string;
  horse_color: string;
  horse_height: string;
  horse_weight: string;
  horse_image: string | null;
  horse_status?: string;
  lastVetCheck?: string;
  condition?: string;
  conditionColor?: string;
  death_status?: boolean;
  date_of_death?: string;
  death_cause?: string;
  death_location?: string;
  death_documents?: any[];
}

interface DeathRecordDetails {
  hdeath_id: string;
  horse_id: string;
  op_id: string;
  hdeath_date: string;
  cause_of_death: string;
  death_location: string;
  status: string;
  created_at: string;
  updated_at: string;
  images: string[]; // Array of image URLs
}

interface DeathRecordResponse {
  success: boolean;
  death_record: DeathRecordDetails;
  horse_info: {
    horse_name: string;
    horse_breed?: string;
    horse_age?: string;
    horse_sex?: string;
    horse_color?: string;
  };
  formatted_date: string;
  formatted_created: string;
}

const API_BASE_URL = "https://echo-ebl8.onrender.com/api/horse_operator"

const HorseProfileScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; horseData?: string }>();
  const [userId, setUserId] = useState<string | null>(null);
  const [horseId, setHorseId] = useState<string | null>(null);
  const [horseData, setHorseData] = useState<Horse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedHorse, setEditedHorse] = useState<Horse | null>(null);
  const [imageError, setImageError] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editImageError, setEditImageError] = useState(false);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [showSexDropdown, setShowSexDropdown] = useState(false);
  const [dobPickerDate, setDobPickerDate] = useState(new Date());
  const [deathRecordDetails, setDeathRecordDetails] = useState<DeathRecordDetails | null>(null);
  const [loadingDeathInfo, setLoadingDeathInfo] = useState(false);
  const [hasDeathRecord, setHasDeathRecord] = useState(false);
  const [isDeceased, setIsDeceased] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  const sexOptions = ['Stallion', 'Gelding', 'Mare'];

  const getConditionColor = (condition: string): string => {
    const lowerCondition = condition.toLowerCase();
    if (lowerCondition.includes('excellent') || lowerCondition.includes('great')) return '#4CAF50';
    if (lowerCondition.includes('good')) return '#8BC34A';
    if (lowerCondition.includes('fair') || lowerCondition.includes('average')) return '#FFC107';
    if (lowerCondition.includes('poor') || lowerCondition.includes('bad')) return '#FF5722';
    if (lowerCondition.includes('critical') || lowerCondition.includes('emergency')) return '#F44336';
    return '#757575';
  };

  const loadUserId = useCallback(async () => {
    try {
      const storedUser = await SecureStore.getItemAsync("user_data");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const id = parsed.user_id || parsed.id;
        if (id) {
          console.log("Loaded user_id from storage:", id);
          setUserId(id);
          return id;
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
    return null;
  }, []);

  const loadHorseId = useCallback(async () => {
    try {
      if (params?.id) {
        console.log("Loaded horse_id from route params:", params.id);
        setHorseId(params.id);
        await SecureStore.setItemAsync("selected_horse_id", params.id);
        return params.id;
      }
      
      const storedHorseId = await SecureStore.getItemAsync("selected_horse_id");
      if (storedHorseId) {
        console.log("Loaded horse_id from storage (fallback):", storedHorseId);
        setHorseId(storedHorseId);
        return storedHorseId;
      }
      
      console.warn("No horse_id found in params or storage");
      Alert.alert('Error', 'No horse selected. Please select a horse first.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error("Error loading horse ID:", error);
    }
    return null;
  }, [params?.id, router]);

  const fetchDeathRecord = useCallback(async (horseId: string, user_id: string) => {
    console.log("🔍 Fetching death record for horse:", horseId);
    console.log("👤 User ID:", user_id);
    
    setLoadingDeathInfo(true);
    try {
      // Fetch death record directly from horse_death_records table
      const response = await fetch(
        `${API_BASE_URL}/get_horse_death_record/?horse_id=${encodeURIComponent(horseId)}&user_id=${encodeURIComponent(user_id)}`
      );
      
      console.log("📊 Death record response status:", response.status);
      
      if (response.ok) {
        const data = await response.json() as DeathRecordResponse;
        console.log("📋 Death record data:", data);
        
        if (data.death_record) {
          setHasDeathRecord(true);
          
          // The backend returns the death record with images array
          setDeathRecordDetails(data.death_record);
          console.log("🖼️ Death record images:", data.death_record.images);
          console.log("🖼️ Images count:", data.death_record.images?.length || 0);
        } else {
          console.log("📭 No death record found in horse_death_records table");
          setHasDeathRecord(false);
          setDeathRecordDetails(null);
        }
      } else {
        console.log("❌ Failed to fetch death record, status:", response.status);
        setHasDeathRecord(false);
        setDeathRecordDetails(null);
      }
    } catch (error) {
      console.error("❌ Error fetching death record:", error);
      setHasDeathRecord(false);
      setDeathRecordDetails(null);
    } finally {
      setLoadingDeathInfo(false);
    }
  }, []);

  const fetchHorse = useCallback(async (showRefreshIndicator = false) => {
    if (isFetchingRef.current) {
      console.log("Fetch already in progress, skipping...");
      return;
    }

    isFetchingRef.current = true;

    if (showRefreshIndicator) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const uid = userId;
      const hid = params?.id || horseId;
      
      if (!uid) {
        Alert.alert('Error', 'User not found. Please log in again.');
        router.replace('/auth/login');
        return;
      }

      if (!hid) {
        Alert.alert('Error', 'No horse selected.');
        router.back();
        return;
      }

      console.log("Fetching horse from backend with ID:", hid);
      
      const response = await fetch(`${API_BASE_URL}/get_horses/?user_id=${encodeURIComponent(uid)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch horses: ${response.status}`);
      }

      const horses = await response.json();
      const horse = horses.find((h: Horse) => h.horse_id === hid);
      
      if (!horse) {
        Alert.alert('Error', 'Horse not found');
        router.back();
        return;
      }

      // Check if horse is deceased (from horse_status field)
      const isHorseDeceased = horse.horse_status === 'Deceased' || horse.death_status === true;
      setIsDeceased(isHorseDeceased);

      const processedHorse = {
        ...horse,
        horse_image: horse.horse_image || null,
        lastVetCheck: horse.lastVetCheck || 'Loading...',
        condition: horse.condition || 'Good',
        conditionColor: getConditionColor(horse.condition || 'Good'),
        death_status: isHorseDeceased,
        date_of_death: horse.date_of_death || '',
        death_cause: horse.death_cause || '',
        death_location: horse.death_location || '',
        death_documents: horse.death_documents || []
      };

      console.log("🐴 Processed horse data:", processedHorse);
      console.log("💀 Death status from horse_status:", processedHorse.horse_status);
      console.log("🏥 Is horse deceased?:", isHorseDeceased);

      setHorseData(processedHorse);
      setEditedHorse(processedHorse);
      
      // Fetch death record if horse is deceased
      if (isHorseDeceased) {
        console.log("⚰️ Horse is deceased, fetching death record...");
        await fetchDeathRecord(processedHorse.horse_id, uid);
      } else {
        console.log("🐎 Horse is alive, clearing death info");
        setDeathRecordDetails(null);
        setHasDeathRecord(false);
      }
      
      hasFetchedRef.current = true;
      
    } catch (error) {
      console.error('Error loading horse data:', error);
      Alert.alert('Error', 'Failed to load horse data. Please try again.');
      router.back();
    } finally {
      isFetchingRef.current = false;
      if (showRefreshIndicator) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [userId, horseId, params?.id, router, fetchDeathRecord]);

  useEffect(() => {
    const initializeData = async () => {
      await loadUserId();
      await loadHorseId();
    };
    initializeData();
  }, [loadUserId, loadHorseId]);

  useEffect(() => {
    if (userId && horseId && !hasFetchedRef.current && !isFetchingRef.current) {
      console.log("Initial fetch triggered");
      fetchHorse();
    }
  }, [userId, horseId, fetchHorse]);

  useFocusEffect(
    useCallback(() => {
      if (userId && horseId && hasFetchedRef.current && !isFetchingRef.current) {
        console.log("Screen focused - refreshing data");
        fetchHorse();
      }
    }, [userId, horseId, fetchHorse])
  );

  const onRefresh = useCallback(() => {
    fetchHorse(true);
  }, [fetchHorse]);

  const handleHorseHandling = async () => {
    if (horseData) {
      console.log(`Opening horse handling for ${horseData.horse_name}`);
      await SecureStore.setItemAsync("selected_horse_id", horseData.horse_id);
      router.push({
        pathname: '../HORSE_OPERATOR/horsehandling',
        params: {
          id: horseData.horse_id,
          horseName: horseData.horse_name
        }
      });
    }
    setShowMenu(false);
  };

  const handleMedical = async () => {
    if (horseData) {
      console.log(`Opening medical records for ${horseData.horse_name}`);
      await SecureStore.setItemAsync("selected_horse_id", horseData.horse_id);
      router.push('../HORSE_OPERATOR/medical');
    }
    setShowMenu(false);
  };


  const handleEditHorse = () => {
    if (horseData && !isDeceased) {
      setEditedHorse({ ...horseData });
      setEditImageError(false);
      setShowSexDropdown(false);
      
      // Initialize date picker with existing DOB or today's date
      if (horseData.horse_dob) {
        try {
          const existingDate = new Date(horseData.horse_dob);
          if (!isNaN(existingDate.getTime())) {
            setDobPickerDate(existingDate);
          }
        } catch {
          setDobPickerDate(new Date());
        }
      } else {
        setDobPickerDate(new Date());
      }
      
      setShowEditModal(true);
    }
    setShowMenu(false);
  };

  const handleFeed = async () => {
    if (horseData && !isDeceased) {
      console.log(`Opening feed for ${horseData.horse_name}`);
      
      // Store horse data before navigation
      await SecureStore.setItemAsync("selected_horse_id", horseData.horse_id);
      await SecureStore.setItemAsync("selected_horse_name", horseData.horse_name);
      
      // Navigate with proper parameters
      router.push({
        pathname: '../HORSE_OPERATOR/Hfeed',
        params: {
          id: horseData.horse_id,
          horseId: horseData.horse_id,  // Add this line
          horseName: horseData.horse_name
        }
      });
    }
    setShowMenu(false);
  };

  const handleWater = async () => {
    if (horseData && !isDeceased) {
      console.log(`Opening water for ${horseData.horse_name}`);
      await SecureStore.setItemAsync("selected_horse_id", horseData.horse_id);
      router.push({
        pathname: '../HORSE_OPERATOR/water',
        params: {
          id: horseData.horse_id,  // This is the key parameter
          horseId: horseData.horse_id,  // Also pass as horseId for consistency
          horseName: horseData.horse_name
        }
      });
    }
    setShowMenu(false);
  };

  const handleFeedLogs = async () => {
    if (horseData) {
      console.log(`Opening feed logs for ${horseData.horse_name}`);
      await SecureStore.setItemAsync("selected_horse_id", horseData.horse_id);
      router.push({
        pathname: '../HORSE_OPERATOR/Hfeedlog',
        params: {
          id: horseData.horse_id,
          horseName: horseData.horse_name
        }
      });
    }
    setShowMenu(false);
  };

  const handleWaterLogs = async () => {
    if (horseData) {
      console.log(`Opening water logs for ${horseData.horse_name}`);
      await SecureStore.setItemAsync("selected_horse_id", horseData.horse_id);
      router.push({
        pathname: '../HORSE_OPERATOR/waterlog',
        params: {
          id: horseData.horse_id,
          horseName: horseData.horse_name
        }
      });
    }
    setShowMenu(false);
  };

  const handleDobChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setDobPickerDate(selectedDate);
      const formatted = selectedDate.toISOString().split("T")[0];
      if (editedHorse) {
        setEditedHorse({ ...editedHorse, horse_dob: formatted });
      }
    }
    setShowDobPicker(false);
  };

  const handleSexSelect = (sex: string) => {
    if (editedHorse) {
      setEditedHorse({ ...editedHorse, horse_sex: sex });
    }
    setShowSexDropdown(false);
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true);
        const asset = result.assets[0];
        
        try {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          
          // Convert to base64
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result as string;
            
            if (editedHorse) {
              // Store base64 data for upload
              setEditedHorse({
                ...editedHorse,
                horse_image: base64data
              });
              setEditImageError(false);
            }
            setUploadingImage(false);
          };
          
          reader.onerror = () => {
            console.error('Error reading image file');
            Alert.alert('Error', 'Failed to process image. Please try again.');
            setUploadingImage(false);
          };
          
          reader.readAsDataURL(blob);
        } catch (fetchError) {
          console.error('Error fetching image:', fetchError);
          Alert.alert('Error', 'Failed to load image. Please try again.');
          setUploadingImage(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove the horse image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!editedHorse || !userId || !horseData) return;
            
            try {
              setUploadingImage(true);
              
              // Call the backend API to delete the image from database
              const response = await fetch(
                `${API_BASE_URL}/delete_horse_image/${horseData.horse_id}/?user_id=${encodeURIComponent(userId)}`,
                {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                  }
                }
              );

              const result = await response.json();

              if (response.ok) {
                // Update local state
                setEditedHorse({
                  ...editedHorse,
                  horse_image: null
                });
                
                Alert.alert('Success', 'Horse image removed successfully');
              } else {
                Alert.alert('Error', result.error || 'Failed to remove image');
              }
            } catch (error) {
              console.error('Error removing image:', error);
              Alert.alert('Error', 'Failed to remove image. Please try again.');
            } finally {
              setUploadingImage(false);
            }
          }
        }
      ]
    );
  };

  const handleSaveEdit = async () => {
    if (!editedHorse || !horseData || !userId) return;

    if (!editedHorse.horse_name?.trim()) {
      Alert.alert('Validation Error', 'Horse name is required');
      return;
    }

    setSavingEdit(true);
    try {
      const updatePayload = {
        user_id: userId,
        horse_name: editedHorse.horse_name?.trim(),
        horse_age: editedHorse.horse_age?.trim(),
        horse_dob: editedHorse.horse_dob?.trim(),
        horse_sex: editedHorse.horse_sex?.trim(),
        horse_breed: editedHorse.horse_breed?.trim(),
        horse_color: editedHorse.horse_color?.trim(),
        horse_height: editedHorse.horse_height?.trim(),
        horse_weight: editedHorse.horse_weight?.trim(),
        horse_image: editedHorse.horse_image || null
      };

      console.log('Updating horse with payload:', { 
        ...updatePayload, 
        horse_image: updatePayload.horse_image ? 
          (updatePayload.horse_image.startsWith('data:') ? '[BASE64_IMAGE]' : '[IMAGE_URL]') 
          : null 
      });

      const response = await fetch(`${API_BASE_URL}/update_horse/${horseData.horse_id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      const responseData = await response.json();
      console.log('Update response:', responseData);

      if (response.ok) {
        const updatedHorse = { 
          ...responseData.horse,
          conditionColor: getConditionColor(responseData.horse.condition || 'Good'),
          death_status: responseData.horse.death_status || false,
          date_of_death: responseData.horse.date_of_death || '',
          death_cause: responseData.horse.death_cause || ''
        };
        
        setHorseData(updatedHorse);
        setIsDeceased(updatedHorse.horse_status === 'Deceased' || updatedHorse.death_status === true);
        setShowEditModal(false);
        
        Alert.alert('Success', 'Horse profile updated successfully');
        
        await fetchHorse();
      } else {
        const errorMessage = responseData.error || responseData.message || 'Failed to update horse profile';
        console.error('Update failed:', responseData);
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      console.error('Error updating horse:', error);
      Alert.alert('Error', 'Failed to update horse profile. Please check your connection and try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleMenuToggle = () => {
    setShowMenu(!showMenu);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleEditImageError = () => {
    setEditImageError(true);
  };

  const getPlaceholderImage = () => {
    return 'https://via.placeholder.com/150x150/f0f0f0/999999?text=Horse';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not available';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Function to render menu items based on horse status
  const renderMenuItems = () => {
    if (!horseData) return null;

    // For deceased horses
    if (isDeceased) {
      return (
        <>
          <TouchableOpacity style={styles.menuItem} onPress={handleHorseHandling}>
            <FontAwesome5 name="horse" size={16} color="#333" />
            <Text style={styles.menuItemText}>Horse Handling</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleMedical}>
            <FontAwesome5 name="clipboard-list" size={16} color="#333" />
            <Text style={styles.menuItemText}>Medical Records</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleFeedLogs}>
            <FontAwesome5 name="carrot" size={16} color="#FF9800" />
            <Text style={[styles.menuItemText, { color: '#FF9800' }]}>Feed Logs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleWaterLogs}>
            <FontAwesome5 name="tint" size={16} color="#2196F3" />
            <Text style={[styles.menuItemText, { color: '#2196F3' }]}>Water Logs</Text>
          </TouchableOpacity>
        </>
      );
    }

    // For active horses
    return (
      <>
        <TouchableOpacity style={styles.menuItem} onPress={handleHorseHandling}>
          <FontAwesome5 name="horse" size={16} color="#333" />
          <Text style={styles.menuItemText}>Horse Handling</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={handleMedical}>
          <FontAwesome5 name="clipboard-list" size={16} color="#333" />
          <Text style={styles.menuItemText}>Medical Records</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={handleEditHorse}>
          <FontAwesome5 name="edit" size={16} color="#333" />
          <Text style={styles.menuItemText}>Update Horse</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={handleFeed}>
          <FontAwesome5 name="carrot" size={16} color="#FF9800" />
          <Text style={[styles.menuItemText, { color: '#FF9800' }]}>Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={handleWater}>
          <FontAwesome5 name="tint" size={16} color="#2196F3" />
          <Text style={[styles.menuItemText, { color: '#2196F3' }]}>Water</Text>
        </TouchableOpacity>
      </>
    );
  };

  // Function to render death document images
  const renderDeathImages = () => {
    if (!deathRecordDetails || !deathRecordDetails.images || deathRecordDetails.images.length === 0) {
      return null;
    }

    const images = deathRecordDetails.images;
    
    return (
      <View style={styles.imagesSection}>
        <Text style={styles.imagesSectionTitle}>Documentation</Text>
        <Text style={styles.imagesCountText}>{images.length} image(s)</Text>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={true}
          style={styles.imagesScrollView}
          contentContainerStyle={styles.imagesContainer}
        >
          {images.map((imageUrl, index) => (
            <TouchableOpacity
              key={index}
              style={styles.imageThumbnailContainer}
              onPress={() => {
                setSelectedImageIndex(index);
                setShowImageGallery(true);
              }}
            >
              <Image
                source={{ uri: imageUrl }}
                style={styles.imageThumbnail}
                resizeMode="cover"
              />
              {images.length > 1 && (
                <View style={styles.imageCounter}>
                  <Text style={styles.imageCounterText}>{index + 1}/{images.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Function to render Death Information section
  const renderDeathInfoSection = () => {
    if (!isDeceased) return null;

    return (
      <View style={styles.deathInfoCard}>
        <View style={styles.deathInfoHeader}>
          <FontAwesome5 name="skull-crossbones" size={20} color="#F44336" />
          <Text style={styles.deathSectionTitle}>Death Information</Text>
        </View>
        
        {loadingDeathInfo ? (
          <View style={styles.loadingContainerSmall}>
            <ActivityIndicator size="small" color="#CD853F" />
            <Text style={styles.loadingTextSmall}>Loading death information...</Text>
          </View>
        ) : hasDeathRecord && deathRecordDetails ? (
          <>
            {/* Death Date */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <FontAwesome5 name="calendar-times" size={18} color="#F44336" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Date of Death</Text>
                <Text style={[styles.infoValue, styles.deathInfoText]}>
                  {formatDate(deathRecordDetails.hdeath_date)}
                </Text>
              </View>
            </View>

            {/* Cause of Death */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <FontAwesome5 name="heartbeat" size={18} color="#F44336" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Cause of Death</Text>
                <Text style={[styles.infoValue, styles.deathInfoText]}>
                  {deathRecordDetails.cause_of_death || 'Not specified'}
                </Text>
              </View>
            </View>

            {/* Death Location */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <FontAwesome5 name="map-marker-alt" size={18} color="#F44336" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Death Location</Text>
                <Text style={[styles.infoValue, styles.deathInfoText]}>
                  {deathRecordDetails.death_location || 'Not specified'}
                </Text>
              </View>
            </View>

            {/* Render death document images */}
            {renderDeathImages()}
          </>
        ) : (
          <View style={styles.noDeathInfoContainer}>
            <FontAwesome5 name="exclamation-circle" size={32} color="#757575" />
            <Text style={styles.noDeathInfoTitle}>No Detailed Death Record Found</Text>
            <Text style={styles.noDeathInfoDescription}>
              This horse is marked as deceased but no detailed death record was found in the system.
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Function to render Image Gallery Modal
  const renderImageGalleryModal = () => {
    if (!deathRecordDetails || !deathRecordDetails.images || deathRecordDetails.images.length === 0) {
      return null;
    }

    const images = deathRecordDetails.images;

    return (
      <Modal
        visible={showImageGallery}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageGallery(false)}
      >
        <SafeAreaView style={styles.galleryModalContainer}>
          <View style={styles.galleryHeader}>
            <TouchableOpacity
              style={styles.galleryCloseButton}
              onPress={() => setShowImageGallery(false)}
            >
              <FontAwesome5 name="times" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.galleryTitle}>
              Image {selectedImageIndex + 1} of {images.length}
            </Text>
            <View style={styles.galleryHeaderSpacer} />
          </View>

          <View style={styles.galleryContent}>
            <FlatList
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                setSelectedImageIndex(index);
              }}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <View style={styles.galleryImageContainer}>
                  <Image
                    source={{ uri: item }}
                    style={styles.galleryImage}
                    resizeMode="contain"
                  />
                </View>
              )}
            />
          </View>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <View style={styles.thumbnailStrip}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {images.map((imageUrl, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.thumbnailItem,
                      index === selectedImageIndex && styles.thumbnailItemActive
                    ]}
                    onPress={() => {
                      setSelectedImageIndex(index);
                    }}
                  >
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.thumbnailImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <FontAwesome5 name="horse" size={50} color="#CD853F" />
          <Text style={styles.loadingText}>Loading horse profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!horseData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <FontAwesome5 name="exclamation-triangle" size={50} color="#FF5722" />
          <Text style={styles.errorText}>Horse data not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
            <FontAwesome5 name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Horse Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Horse Image and Name */}
        <View style={styles.profileSection}>
          <View style={styles.imageContainer}>
            <Image
              source={{
                uri: (horseData.horse_image && !imageError) ? horseData.horse_image : getPlaceholderImage()
              }}
              style={[
                styles.horseImage,
                isDeceased && styles.deceasedHorseImage
              ]}
              onError={handleImageError}
            />
            {imageError && horseData.horse_image && (
              <View style={styles.imageErrorOverlay}>
                <FontAwesome5 name="image" size={30} color="#999" />
              </View>
            )}
            {isDeceased && (
              <View style={styles.deceasedOverlay}>
                <Text style={styles.deceasedText}>DECEASED</Text>
              </View>
            )}
          </View>
          <Text style={[
            styles.horseName,
            isDeceased && styles.deceasedHorseName
          ]}>
            {horseData.horse_name}
          </Text>
        </View>

        {/* Profile Info Card */}
        <View style={styles.profileCard}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          {[
            { icon: 'birthday-cake', label: 'Age', value: horseData.horse_age ? `${horseData.horse_age} years old` : 'Unknown' },
            { icon: 'calendar-alt', label: 'Date of Birth', value: formatDate(horseData.horse_dob) },
            { icon: 'venus-mars', label: 'Sex', value: horseData.horse_sex || 'Not specified' },
            { icon: 'dna', label: 'Breed', value: horseData.horse_breed || 'Mixed' },
            { icon: 'palette', label: 'Color', value: horseData.horse_color || 'Not specified' },
            { icon: 'ruler-vertical', label: 'Height', value: horseData.horse_height || 'Not measured' },
            { icon: 'weight', label: 'Weight', value: horseData.horse_weight || 'Not weighed' },
          ].map(({ icon, label, value }) => (
            <View key={label} style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <FontAwesome5 name={icon} size={18} color="#CD853F" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>
                  {value}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Death Information Card - Only for deceased horses */}
        {renderDeathInfoSection()}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Action Menu Button - Show for both alive and deceased horses */}
      <View style={styles.menuButtonContainer}>
        <TouchableOpacity style={styles.menuButton} onPress={handleMenuToggle}>
          <FontAwesome5 name="ellipsis-v" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Menu Overlay */}
      {showMenu && (
        <View style={styles.menuOverlay}>
          <TouchableOpacity
            style={styles.menuOverlayBackground}
            onPress={() => setShowMenu(false)}
          />
          <View style={styles.menuContainer}>
            {renderMenuItems()}
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setShowMenu(false)}
            >
              <FontAwesome5 name="times" size={16} color="#666" />
              <Text style={[styles.menuItemText, { color: '#666' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Edit Modal - Only for alive horses */}
      {!isDeceased && (
        <Modal
          visible={showEditModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => {
                  setShowEditModal(false);
                  setShowSexDropdown(false);
                }}
                disabled={savingEdit}
              >
                <Text style={[styles.modalCancelText, savingEdit && { opacity: 0.5 }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Update Horse</Text>
              <TouchableOpacity 
                onPress={handleSaveEdit}
                disabled={savingEdit}
              >
                <View style={styles.saveButtonContainer}>
                  {savingEdit && <ActivityIndicator size="small" color="#CD853F" style={{ marginRight: 8 }} />}
                  <Text style={[styles.modalSaveText, savingEdit && { opacity: 0.5 }]}>
                    {savingEdit ? 'Saving...' : 'Save'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.modalContent} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Image Section */}
              <View style={styles.imageEditSection}>
                <Text style={styles.imageSectionTitle}>Horse Photo</Text>
                <View style={styles.imageEditContainer}>
                  <View style={styles.imagePreviewContainer}>
                    {uploadingImage ? (
                      <View style={styles.imageUploadingContainer}>
                        <ActivityIndicator size="large" color="#CD853F" />
                        <Text style={styles.imageUploadingText}>Uploading...</Text>
                      </View>
                    ) : (
                      <Image
                        source={{
                          uri: (editedHorse?.horse_image && !editImageError) 
                            ? editedHorse.horse_image 
                            : getPlaceholderImage()
                        }}
                        style={styles.imagePreview}
                        onError={handleEditImageError}
                      />
                    )}
                    {editImageError && editedHorse?.horse_image && (
                      <View style={styles.imagePreviewErrorOverlay}>
                        <FontAwesome5 name="image" size={40} color="#999" />
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.imageButtonsContainer}>
                    <TouchableOpacity
                      style={styles.imageButton}
                      onPress={handlePickImage}
                      disabled={uploadingImage || savingEdit}
                    >
                      <FontAwesome5 name="camera" size={18} color="#fff" />
                      <Text style={styles.imageButtonText}>
                        {editedHorse?.horse_image ? 'Change Photo' : 'Add Photo'}
                      </Text>
                    </TouchableOpacity>
                    
                    {editedHorse?.horse_image && (
                      <TouchableOpacity
                        style={styles.imageButtonSecondary}
                        onPress={handleRemoveImage}
                        disabled={uploadingImage || savingEdit}
                      >
                        <FontAwesome5 name="trash" size={18} color="#FF5722" />
                        <Text style={styles.imageButtonTextSecondary}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              {/* Basic Information Section */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Basic Information</Text>
                
                {editedHorse && (
                  <>
                    {/* Horse Name */}
                    <View style={styles.inputGroup}>
                      <View style={styles.inputLabelRow}>
                        <FontAwesome5 name="horse-head" size={16} color="#CD853F" style={{ marginRight: 8 }} />
                        <Text style={styles.inputLabel}>
                          Name
                          <Text style={styles.requiredAsterisk}> *</Text>
                        </Text>
                      </View>
                      <TextInput
                        style={[
                          styles.textInput,
                          !editedHorse.horse_name?.trim() && styles.textInputError
                        ]}
                        value={editedHorse.horse_name || ''}
                        onChangeText={(text) => setEditedHorse({ ...editedHorse, horse_name: text })}
                        placeholder="Enter horse name"
                        placeholderTextColor="#999"
                        editable={!savingEdit}
                      />
                      {!editedHorse.horse_name?.trim() && (
                        <Text style={styles.inputErrorText}>This field is required</Text>
                      )}
                    </View>

                    {/* Age */}
                    <View style={styles.inputGroup}>
                      <View style={styles.inputLabelRow}>
                        <FontAwesome5 name="calendar" size={16} color="#CD853F" style={{ marginRight: 8 }} />
                        <Text style={styles.inputLabel}>Age</Text>
                      </View>
                      <TextInput
                        style={styles.textInput}
                        value={editedHorse.horse_age || ''}
                        onChangeText={(text) => setEditedHorse({ ...editedHorse, horse_age: text })}
                        placeholder="Age in years"
                        placeholderTextColor="#999"
                        editable={!savingEdit}
                        keyboardType="numeric"
                      />
                    </View>

                    {/* Date of Birth with DatePicker */}
                    <View style={styles.inputGroup}>
                      <View style={styles.inputLabelRow}>
                        <FontAwesome5 name="birthday-cake" size={16} color="#CD853F" style={{ marginRight: 8 }} />
                        <Text style={styles.inputLabel}>Date of Birth</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.datePickerButton}
                        onPress={() => setShowDobPicker(true)}
                        disabled={savingEdit}
                      >
                        <Text style={[styles.datePickerText, !editedHorse.horse_dob && styles.placeholder]}>
                          {editedHorse.horse_dob || "YYYY-MM-DD"}
                        </Text>
                        <FontAwesome5 name="calendar" size={16} color="#666" />
                      </TouchableOpacity>
                    </View>

                    {showDobPicker && (
                      <DateTimePicker
                        value={dobPickerDate}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={handleDobChange}
                        maximumDate={new Date()}
                      />
                    )}

                    {/* Sex Dropdown */}
                    <View style={[styles.inputGroup, showSexDropdown && styles.dropdownExpanded]}>
                      <View style={styles.inputLabelRow}>
                        <FontAwesome5 name="venus-mars" size={16} color="#CD853F" style={{ marginRight: 8 }} />
                        <Text style={styles.inputLabel}>Sex</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.dropdown, showSexDropdown && styles.dropdownOpen]}
                        onPress={() => setShowSexDropdown(!showSexDropdown)}
                        disabled={savingEdit}
                      >
                        <Text style={[styles.dropdownText, !editedHorse.horse_sex && styles.placeholder]}>
                          {editedHorse.horse_sex || 'Select sex'}
                        </Text>
                        <FontAwesome5
                          name={showSexDropdown ? "chevron-up" : "chevron-down"}
                          size={16}
                          color="#666"
                        />
                      </TouchableOpacity>
                      
                      {showSexDropdown && (
                        <View style={styles.dropdownMenu}>
                          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                            {sexOptions.map((option) => (
                              <TouchableOpacity
                                key={option}
                                style={[
                                  styles.dropdownItem,
                                  editedHorse.horse_sex === option && styles.selectedItem
                                ]}
                                onPress={() => handleSexSelect(option)}
                              >
                                <Text
                                  style={[
                                    styles.dropdownItemText,
                                    editedHorse.horse_sex === option && styles.selectedText
                                  ]}
                                >
                                  {option}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>

                    {/* Breed */}
                    <View style={styles.inputGroup}>
                      <View style={styles.inputLabelRow}>
                        <FontAwesome5 name="dna" size={16} color="#CD853F" style={{ marginRight: 8 }} />
                        <Text style={styles.inputLabel}>Breed</Text>
                      </View>
                      <TextInput
                        style={styles.textInput}
                        value={editedHorse.horse_breed || ''}
                        onChangeText={(text) => setEditedHorse({ ...editedHorse, horse_breed: text })}
                        placeholder="Enter breed"
                        placeholderTextColor="#999"
                        editable={!savingEdit}
                      />
                    </View>

                    {/* Color */}
                    <View style={styles.inputGroup}>
                      <View style={styles.inputLabelRow}>
                        <FontAwesome5 name="palette" size={16} color="#CD853F" style={{ marginRight: 8 }} />
                        <Text style={styles.inputLabel}>Color</Text>
                      </View>
                      <TextInput
                        style={styles.textInput}
                        value={editedHorse.horse_color || ''}
                        onChangeText={(text) => setEditedHorse({ ...editedHorse, horse_color: text })}
                        placeholder="Enter color"
                        placeholderTextColor="#999"
                        editable={!savingEdit}
                      />
                    </View>

                    {/* Height */}
                    <View style={styles.inputGroup}>
                      <View style={styles.inputLabelRow}>
                        <FontAwesome5 name="ruler-vertical" size={16} color="#CD853F" style={{ marginRight: 8 }} />
                        <Text style={styles.inputLabel}>Height</Text>
                      </View>
                      <TextInput
                        style={styles.textInput}
                        value={editedHorse.horse_height || ''}
                        onChangeText={(text) => setEditedHorse({ ...editedHorse, horse_height: text })}
                        placeholder="e.g., 15.2 hands"
                        placeholderTextColor="#999"
                        editable={!savingEdit}
                      />
                    </View>

                    {/* Weight */}
                    <View style={styles.inputGroup}>
                      <View style={styles.inputLabelRow}>
                        <FontAwesome5 name="weight" size={16} color="#CD853F" style={{ marginRight: 8 }} />
                        <Text style={styles.inputLabel}>Weight</Text>
                      </View>
                      <TextInput
                        style={styles.textInput}
                        value={editedHorse.horse_weight || ''}
                        onChangeText={(text) => setEditedHorse({ ...editedHorse, horse_weight: text })}
                        placeholder="e.g., 1000 lbs"
                        placeholderTextColor="#999"
                        editable={!savingEdit}
                      />
                    </View>
                  </>
                )}
              </View>
              
              <View style={styles.bottomSpacing} />
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* Image Gallery Modal */}
      {renderImageGalleryModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffffff',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    marginTop: 10,
    fontWeight: '500',
  },
  loadingContainerSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  loadingTextSmall: {
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 15,
    backgroundColor: '#F8F9FA',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    shadowColor: '#ffffffff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 10,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
  },
  headerSpacer: {
    width: 40,
  },
  backButton: {
    backgroundColor: '#CD853F',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  horseImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F8F9FA',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  deceasedHorseImage: {
    opacity: 0.7,
    borderColor: '#757575',
  },
  imageErrorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 70,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deceasedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 70,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deceasedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    letterSpacing: 1,
  },
  horseName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
  },
  deceasedHorseName: {
    color: '#757575',
    textDecorationLine: 'line-through',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F3F4',
  },
  deathInfoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FFEBEE',
  },
  deathInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#F44336',
  },
  deathSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F44336',
    marginLeft: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#CD853F',
  },
  // Images Section Styles
  imagesSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F4',
  },
  imagesSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
  },
  imagesCountText: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 12,
  },
  imagesScrollView: {
    marginHorizontal: -24,
  },
  imagesContainer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  imageThumbnailContainer: {
    position: 'relative',
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8F9FA',
  },
  imageThumbnail: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  imageCounter: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCounterText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  viewAllImagesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#CD853F',
    alignSelf: 'center',
  },
  viewAllImagesText: {
    fontSize: 16,
    color: '#CD853F',
    fontWeight: '600',
  },
  // Gallery Modal Styles
  galleryModalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  galleryCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  galleryHeaderSpacer: {
    width: 40,
  },
  galleryContent: {
    flex: 1,
    backgroundColor: '#000000',
  },
  galleryImageContainer: {
    width: screenWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryImage: {
    width: screenWidth,
    height: '100%',
  },
  thumbnailStrip: {
    height: 80,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 8,
  },
  thumbnailItem: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginHorizontal: 4,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailItemActive: {
    borderColor: '#CD853F',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
    paddingTop: 4,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C757D',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 17,
    color: '#2C3E50',
    fontWeight: '500',
    lineHeight: 24,
  },
  deathInfoText: {
    color: '#F44336',
    fontWeight: '500',
  },
  noDeathInfoContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    gap: 15,
  },
  noDeathInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#757575',
    textAlign: 'center',
  },
  noDeathInfoDescription: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 10,
  },
  bottomSpacing: {
    height: 120,
  },
  menuButtonContainer: {
    position: 'absolute',
    right: 24,
    bottom: 40,
  },
  menuButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#CD853F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#CD853F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  menuOverlayBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    position: 'absolute',
    bottom: 120,
    right: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 220,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuItemText: {
    fontSize: 16,
    color: '#2C3E50',
    marginLeft: 16,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E9ECEF',
    marginVertical: 8,
    marginHorizontal: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#6C757D',
    fontWeight: '500',
  },
  modalSaveText: {
    fontSize: 16,
    color: '#CD853F',
    fontWeight: '600',
  },
  saveButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    paddingTop: 24,
  },
  imageEditSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  imageSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 20,
  },
  imageEditContainer: {
    alignItems: 'center',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  imagePreview: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#F8F9FA',
    borderWidth: 3,
    borderColor: '#CD853F',
  },
  imagePreviewErrorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 75,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageUploadingContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#CD853F',
  },
  imageUploadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '500',
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CD853F',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#CD853F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  imageButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  imageButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    borderWidth: 2,
    borderColor: '#FF5722',
  },
  imageButtonTextSecondary: {
    color: '#FF5722',
    fontSize: 15,
    fontWeight: '600',
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#CD853F',
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
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
  },
  requiredAsterisk: {
    color: '#FF5722',
    fontSize: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#2C3E50',
    minHeight: 50,
  },
  textInputError: {
    borderColor: '#FF5722',
    borderWidth: 2,
  },
  inputErrorText: {
    fontSize: 13,
    color: '#FF5722',
    marginTop: 6,
    marginLeft: 4,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    minHeight: 50,
  },
  datePickerText: {
    fontSize: 16,
    color: '#2C3E50',
  },
  placeholder: {
    color: '#999',
    fontStyle: 'italic',
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    minHeight: 50,
  },
  dropdownOpen: {
    borderColor: '#CD853F',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  dropdownText: {
    fontSize: 16,
    color: '#2C3E50',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#CD853F',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1001,
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  selectedItem: {
    backgroundColor: '#F8F9FA',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#2C3E50',
  },
  selectedText: {
    color: '#CD853F',
    fontWeight: '600',
  },
});

export default HorseProfileScreen;