import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

const TreatmentHistoryScreen = () => {
  const router = useRouter();
//   const params = useLocalSearchParams();
  
//   const horseName = params.horseName || 'Lohla';
//   const treatmentId = params.treatmentId || 'default_treatment_id';

  const handleGoBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Treatment History</Text>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.contentCard}>
          {/* Treatment History Header */}
          <View style={styles.treatmentHeader}>
            <Text style={styles.treatmentTitle}>
              Treatment History - Equine Influenza Vaccine{'\n'}
              <Text style={styles.treatmentDate}>(May 2, 2025)</Text>
            </Text>
            <View style={styles.successBadge}>
              <Text style={styles.successText}>Successful</Text>
            </View>
          </View>

          {/* Treatment Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Treatment Information</Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Treatment:</Text> Equine Influenza Vaccine</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Date:</Text> May 2, 2025</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Administrator:</Text> Dr. Sarah Johnson</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Result:</Text> Successful</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>ID Number:</Text> FLV-2025-04398</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Expiration Date:</Text> December 15, 2025</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Dosage:</Text> 1 mL, Intramuscular</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Injection Site:</Text> Left neck muscle</Text>
            </View>
          </View>

          {/* Related Medical Data */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>RELATED MEDICAL DATA</Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Body Temperature:</Text> 38.5°C</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Heart Rate:</Text> 42 BPM</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Respiratory Rate:</Text> 16 RPM</Text>
            </View>
          </View>

          {/* Pre-Vaccination Assessment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pre-Vaccination Assessment</Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Chief Complaint:</Text> Annual wellness examination and vaccination</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Clinical Signs:</Text> No clinical signs of illness. Normal appetite, activity, and behavior.</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Upper Respiratory:</Text> Clear nasal passages, normal breathing sounds, no cough</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Fever:</Text> None</Text>
            </View>
          </View>

          {/* Next Vaccination */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NEXT VACCINATION</Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Booster Due:</Text> May 2026 (Annual)</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Additional Vaccines Due:</Text> Tetanus toxoid booster in November 2025</Text>
            </View>
          </View>

          {/* Remarks */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>REMARKS</Text>
            <Text style={styles.remarksText}>
              Vaccination administered as part of annual health maintenance program. Tolerated the procedure well with no adverse reactions.{'\n\n'}
              Owner instructed on monitoring and follow-up schedule. Recommend maintaining vaccination schedule as outlined in preventive health care plan.
            </Text>
          </View>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CD853F',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 20,
  },
  backButton: {
    padding: 5,
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentCard: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 8,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  treatmentHeader: {
    marginBottom: 20,
  },
  treatmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E5BBA',
    marginBottom: 8,
  },
  treatmentDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E5BBA',
  },
  successBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  successText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E5BBA',
    marginBottom: 10,
  },
  bulletPoint: {
    marginBottom: 4,
  },
  bulletText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  boldText: {
    fontWeight: 'bold',
  },
  remarksText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});

export default TreatmentHistoryScreen;