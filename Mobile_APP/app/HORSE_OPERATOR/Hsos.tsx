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
  Modal,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';

const SOSScreen = () => {
  const router = useRouter();
  const [emergencyType, setEmergencyType] = useState('Horse Injury');
  const [horseStatus, setHorseStatus] = useState('');
  const [description, setDescription] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const horseStatusOptions = [
    'Conscious',
    'Unconscious',
    'Injured',
    'Bleeding',
    'Limping',
    'Showing Colic Signs',
  ];

  const handleSendSOS = () => {
    if (!horseStatus || !description.trim() || !contactNumber.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    setShowSuccessModal(true);
  };

  const handleSuccessOK = () => {
    setShowSuccessModal(false);
    router.replace('./home');
  };

  const handleImagePick = async () => {
    Alert.alert('Upload Photo', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera access is required.');
            return;
          }

          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
          });

          if (!result.canceled && result.assets && result.assets.length > 0) {
            setSelectedImage(result.assets[0].uri);
          }
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('./home')} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SOS Emergency Alert</Text>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.alertBox}>
          <Text style={styles.alertText}>
            Important: This form sends an emergency alert to DVMF and CTU Vetmed. Please provide accurate information about your emergency situation.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={emergencyType}
              onValueChange={(value) => setEmergencyType(value)}
              style={styles.picker}
            >
              <Picker.Item label="Horse Injury" value="Horse Injury" />
              <Picker.Item label="Horse Illness" value="Horse Illness" />
              <Picker.Item label="Accident" value="Accident" />
              <Picker.Item label="Other Emergency" value="Other Emergency" />
            </Picker>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Horse Status</Text>
          <View style={styles.buttonRow}>
            {horseStatusOptions.map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusButton,
                  horseStatus === status && styles.selectedStatusButton,
                ]}
                onPress={() => setHorseStatus(status)}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    horseStatus === status && styles.selectedStatusButtonText,
                  ]}
                >
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Describe What Happened</Text>
          <TextInput
            style={styles.textArea}
            multiline
            numberOfLines={4}
            placeholder="Please describe the emergency situation in detail..."
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Current Location</Text>
          <View style={styles.locationContainer}>
            <FontAwesome5 name="map-marker-alt" size={16} color="#DC3545" />
            <Text style={styles.locationText}>
              123 Main Street, San Jose - (Lat: 14.5995, Long: 120.9842)
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upload Photos (Optional)</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={handleImagePick}>
            <FontAwesome5 name="camera" size={30} color="#666" />
            <Text style={styles.uploadText}>Add Photos</Text>
          </TouchableOpacity>

          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={{ width: '100%', height: 200, marginTop: 15, borderRadius: 10 }}
              resizeMode="cover"
            />
          )}
        </View>

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

        <TouchableOpacity style={styles.sendButton} onPress={handleSendSOS}>
          <Text style={styles.sendButtonText}>Send SOS Alert</Text>
        </TouchableOpacity>
      </ScrollView>

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
  safeArea: {
    flex: 1,
    backgroundColor: '#DC3545',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#DC3545',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
  },
  alertBox: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    marginVertical: 15,
  },
  alertText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  picker: {
    height: 50,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  statusButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
  },
  selectedStatusButton: {
    backgroundColor: '#DC3545',
    borderColor: '#DC3545',
  },
  statusButtonText: {
    fontSize: 14,
    color: '#333',
  },
  selectedStatusButtonText: {
    color: '#fff',
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
  locationText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  uploadButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  sendButton: {
    backgroundColor: '#DC3545',
    borderRadius: 8,
    padding: 18,
    alignItems: 'center',
    marginVertical: 20,
    marginBottom: 40,
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
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
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
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
  okButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default SOSScreen;
