// SOSScreen.tsx
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
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';

const SOSScreen = () => {
  const router = useRouter();

  const [emergencyType, setEmergencyType] = useState('Horse Injury');
  const [horseStatus, setHorseStatus] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // location states
  const [location, setLocation] = useState<any>(null);
  const [locationText, setLocationText] = useState('Getting location...');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // sending state
  const [isLoading, setIsLoading] = useState(false);

  // User ID state - load from SecureStore or route params
  const [userId, setUserId] = useState('');
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const handleLocationError = useCallback((error: Error) => {
    setLocationError(error.message);
    setLocationText('Unable to get location');
  }, []);

  const getCurrentLocation = useCallback(async () => {
    setIsLoadingLocation(true);
    setLocationError(null);
    setLocationText('Getting your location...');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Location permission denied');

      const currentLocation: any = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Location request timeout')), 10000)
        ),
      ]);

      const lat = currentLocation.coords.latitude;
      const long = currentLocation.coords.longitude;

      const addresses = await Location.reverseGeocodeAsync({ latitude: lat, longitude: long });

      let addressString = `Lat: ${lat.toFixed(4)}, Long: ${long.toFixed(4)}`;
      if (addresses && addresses.length > 0) {
        const addr = addresses[0];
        const parts: string[] = [];
        if (addr.street) parts.push(addr.street);
        if (addr.name && !/^[0-9A-Z]{3,}\+/.test(addr.name)) parts.push(addr.name);
        if (addr.district) parts.push(addr.district);
        if (addr.city) parts.push(addr.city);
        if (addr.region) parts.push(addr.region);
        if (addr.country) parts.push(addr.country);

        if (parts.length > 0) {
          addressString = `${parts.join(', ')} - (Lat: ${lat.toFixed(4)}, Long: ${long.toFixed(4)})`;
        }
      }

      setLocation({
        latitude: lat,
        longitude: long,
        address: addressString,
      });
      setLocationText(addressString);
      setLocationError(null);
    } catch (error: any) {
      console.error('Error getting location:', error);
      handleLocationError(error);
    } finally {
      setIsLoadingLocation(false);
    }
  }, [handleLocationError]);

  const loadUserId = useCallback(async () => {
    try {
      const storedUser = await SecureStore.getItemAsync("user_data");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const id = parsed.user_id || parsed.id;
        if (id) {
          console.log("🔑 Loaded user_id from storage:", id);
          setUserId(id);
          setIsLoadingUser(false);
          return id;
        }
      }
      setIsLoadingUser(false);
    } catch (error) {
      console.error("❌ Error loading user data:", error);
      setIsLoadingUser(false);
    }
    return null;
  }, []);

  useEffect(() => {
    loadUserId();
    getCurrentLocation();
  }, [loadUserId, getCurrentLocation]);

  const toggleHorseStatus = (status: string): void => {
    setHorseStatus((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const handleSendSOS = async () => {
    // Validate user ID
    if (!userId) {
      Alert.alert('Error', 'User session not found. Please log in again.');
      return;
    }

    if (horseStatus.length === 0 || !description.trim() || !contactNumber.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (description.trim().length < 10) {
      Alert.alert('Error', 'Please provide a more detailed description (minimum 10 characters)');
      return;
    }

    setIsLoading(true);

    try {
      const sosData = {
        user_id: userId,
        emergency_type: emergencyType,
        horse_status: horseStatus,
        description: description.trim(),
        contact_number: contactNumber.trim(),
        additional_info: additionalInfo.trim(),
        location_text: locationText,
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
      };

      console.log('Sending SOS data:', sosData);

      const response = await fetch('http://10.254.39.148:8000/api/horse_operator/sos/create/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(sosData),
      });

      console.log('Response status:', response.status);

      const responseText = await response.text();
      console.log('Response text:', responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        console.error('Response was:', responseText);
        throw new Error('Server returned invalid response. Please check server logs.');
      }

      if (response.ok) {
        console.log('SOS Alert sent successfully:', result);
        setShowSuccessModal(true);
      } else {
        throw new Error(result.error || 'Failed to send SOS alert');
      }
    } catch (error) {
      console.error('Error sending SOS:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to send SOS alert. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessOK = () => {
    setShowSuccessModal(false);
    router.replace('./home');
  };

  // Show loading screen while loading user
  if (isLoadingUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#DC3545" />
          <Text style={{ marginTop: 10, color: '#666' }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('../HORSE_OPERATOR/home')} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SOS Emergency Alert</Text>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Alert Box */}
        <View style={styles.alertBox}>
          <Text style={styles.alertText}>
            Important: This form sends an emergency alert to DVMF and CTU Vetmed. Please provide
            accurate information about your emergency situation.
          </Text>
        </View>

        {/* Emergency Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Type</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={emergencyType} onValueChange={(value) => setEmergencyType(value)}>
              <Picker.Item label="Horse Injury" value="Horse Injury" />
              <Picker.Item label="Horse Illness" value="Horse Illness" />
              <Picker.Item label="Accident" value="Accident" />
              <Picker.Item label="Other Emergency" value="Other Emergency" />
            </Picker>
          </View>
        </View>

        {/* Horse Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Horse Status (Select all that apply)</Text>
          <View style={styles.buttonRow}>
            {['Conscious', 'Unconscious', 'Injured', 'Bleeding', 'Limping', 'Showing Colic Signs'].map(
              (status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusButton,
                    horseStatus.includes(status) && styles.selectedStatusButton,
                  ]}
                  onPress={() => toggleHorseStatus(status)}
                >
                  <Text
                    style={[
                      styles.statusButtonText,
                      horseStatus.includes(status) && styles.selectedStatusButtonText,
                    ]}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Describe What Happened</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            placeholder="Please describe the emergency situation in detail (minimum 10 characters)..."
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{description.length} / 500 characters</Text>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Current Location</Text>

          <View style={styles.locationContainer}>
            {isLoadingLocation ? (
              <ActivityIndicator size="small" color="#DC3545" />
            ) : (
              <FontAwesome5 name="map-marker-alt" size={16} color="#DC3545" />
            )}
            <Text style={[styles.locationText, locationError && { color: '#DC3545' }]}>
              {locationText}
            </Text>
          </View>

          {locationError && (
            <View style={styles.errorBox}>
              <FontAwesome5 name="exclamation-triangle" size={14} color="#DC3545" />
              <Text style={styles.errorText}>{locationError}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.refreshLocationButton}
            onPress={getCurrentLocation}
            disabled={isLoadingLocation}
          >
            {isLoadingLocation ? (
              <>
                <ActivityIndicator size="small" color="#DC3545" />
                <Text style={styles.refreshLocationText}>Getting location...</Text>
              </>
            ) : (
              <>
                <FontAwesome5 name="sync" size={14} color="#DC3545" />
                <Text style={styles.refreshLocationText}>Refresh Location</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your contact number"
            value={contactNumber}
            onChangeText={setContactNumber}
            keyboardType="phone-pad"
          />
        </View>

        {/* Additional Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information (Optional)</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={3}
            placeholder="Any additional information that might be helpful..."
            value={additionalInfo}
            onChangeText={setAdditionalInfo}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
          onPress={handleSendSOS}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>Send SOS Alert</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.successIcon}>
              <FontAwesome5 name="check" size={40} color="#28A745" />
            </View>
            <Text style={styles.successTitle}>SOS Alert Sent!</Text>
            <Text style={styles.successMessage}>
              Your emergency alert has been sent to DVMF and CTU Vetmed. Help is on the way.
            </Text>
            <Text style={styles.stayMessage}>Please stay where you are.</Text>
            <TouchableOpacity style={styles.okButton} onPress={handleSuccessOK}>
              <Text style={styles.okButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#DC3545' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#DC3545',
  },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingHorizontal: 20 },
  alertBox: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    marginVertical: 15,
  },
  alertText: { fontSize: 14, color: '#856404', lineHeight: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  statusButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 3,
  },
  selectedStatusButton: { backgroundColor: '#DC3545', borderColor: '#DC3545' },
  statusButtonText: { fontSize: 14, color: '#333' },
  selectedStatusButtonText: { color: '#fff' },
  selectedCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    minHeight: 100,
  },
  charCount: { fontSize: 12, color: '#666', marginTop: 5, textAlign: 'right' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  locationText: { marginLeft: 10, fontSize: 14, color: '#333', flex: 1 },
  refreshLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 8,
  },
  refreshLocationText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#DC3545',
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: '#DC3545',
    borderRadius: 8,
    padding: 18,
    alignItems: 'center',
    marginVertical: 20,
    marginBottom: 40,
  },
  sendButtonDisabled: { opacity: 0.6 },
  sendButtonText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    marginHorizontal: 40,
    maxWidth: 300,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#d4edda',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  successMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 10,
  },
  stayMessage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 25,
  },
  okButton: {
    backgroundColor: '#28A745',
    borderRadius: 25,
    paddingHorizontal: 30,
    paddingVertical: 12,
  },
  okButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#f8d7da',
    padding: 8,
    borderRadius: 6,
  },
  errorText: { color: '#DC3545', fontSize: 12, marginLeft: 5, flex: 1 },
});

export default SOSScreen;