import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

const MedicalScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState('medicalRecord');

  // Get horse data from params or use default
  const horseData = params.horseData ? JSON.parse(decodeURIComponent(params.horseData as string)) : null;
  const horseName = horseData?.name || 'Oscar';
  const horseId = params.horseId || horseData?.id || 'default_horse_id';

  const handleGoBack = () => {
    router.back();
  };

  const handleMedicalRecordPress = () => {
    console.log('Medical record pressed');
    
    router.push({
      pathname: '/medicalrec',
      params: {
        horseId: horseId,
        horseName: horseName,
        recordId: 'medical_record_' + Date.now()
      }
    });
  };

  const handleTreatmentHistoryPress = () => {
    console.log('Treatment history pressed');
    
    router.push({
      pathname: '/treatmenthis', // You'll need to create this route
      params: {
        horseId: horseId,
        horseName: horseName,
        treatmentId: 'treatment_history_' + Date.now()
      }
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Horse Profile Header - Horizontal Layout */}
      <View style={styles.horseProfileHeader}>
        <Image
          source={{
            uri: horseData?.image || 'https://via.placeholder.com/80x80/f0f0f0/999999?text=Horse'
          }}
          style={styles.horseProfileImage}
        />
        <Text style={styles.horseName}>Lohla</Text>
      </View>

      {/* Orange Divider */}
      <View style={styles.divider} />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'medicalRecord' && styles.activeTabItem]}
          onPress={() => setActiveTab('medicalRecord')}
        >
          <Text style={[styles.tabText, activeTab === 'medicalRecord' && styles.activeTabText]}>
            Medical Record
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'treatmentHistory' && styles.activeTabItem]}
          onPress={() => setActiveTab('treatmentHistory')}
        >
          <Text style={[styles.tabText, activeTab === 'treatmentHistory' && styles.activeTabText]}>
            Treatment History
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Content based on active tab */}
        {activeTab === 'medicalRecord' && (
          <TouchableOpacity 
            style={styles.medicalRecordCard}
            onPress={handleMedicalRecordPress}
            activeOpacity={0.7}
          >
            <Text style={styles.cardTitle}>Medical Record</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date: </Text>
              <Text style={styles.infoValue}>March 2, 2025</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Diagnosis: </Text>
              <Text style={styles.infoValue}>Annual Check-up</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Veterinarian: </Text>
              <Text style={styles.infoValue}>Dr. Sarah Johnson</Text>
            </View>
            
            <View style={styles.statusRow}>
              <Text style={styles.infoLabel}>Status: </Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Complete</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Treatment History Card - Now Clickable */}
        {activeTab === 'treatmentHistory' && (
          <TouchableOpacity 
            style={styles.treatmentHistoryCard}
            onPress={handleTreatmentHistoryPress}
            activeOpacity={0.7}
          >
            <Text style={styles.cardTitle}>Treatment History</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date: </Text>
              <Text style={styles.infoValue}>March 2, 2025</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Treatment: </Text>
              <Text style={styles.infoValue}>Equine Influenza Vaccine</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Veterinarian: </Text>
              <Text style={styles.infoValue}>Dr. Sarah Johnson</Text>
            </View>
            
            <View style={styles.statusRow}>
              <Text style={styles.infoLabel}>Status: </Text>
              <View style={styles.statusBadgeSuccessful}>
                <Text style={styles.statusText}>Successful</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: '#f5f5f5',
  },
  backButton: {
    padding: 5,
  },
  horseProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 50,
    backgroundColor: '#f5f5f5',
  },
  horseProfileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#e0e0e0',
    marginBottom: 10,
    marginRight: 20,
    marginTop: 40,
  },
  horseName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    marginTop: 50,
  },
  divider: {
    height: 5,
    backgroundColor: '#CD853F',
    marginBottom: 0,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomColor: '#CD853F',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#000',
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  medicalRecordCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  treatmentHistoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  infoValue: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  statusBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeSuccessful: {
    backgroundColor: '#4CAF50',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default MedicalScreen;