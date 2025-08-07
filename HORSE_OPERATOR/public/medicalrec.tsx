import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

const MedicalRecordScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Get data from params or use defaults
  const horseName = params.horseName || 'Oscar';
  const horseId = params.horseId || 'default_horse_id';

  // Static medical record data
  const medicalRecord = {
    id: params.recordId || 'default_record',
    horseId: horseId,
    title: 'Medical Record - Annual Check-up (March 2, 2025)',
    date: 'March 2, 2025',
    status: 'Complete',
    statusColor: '#4CAF50',
    signalment: {
      bodyTemperature: '38.5°C',
      heartRate: '42 BPM',
      respiratoryRate: '16 RPM'
    },
    clinicalAssessment: {
      chiefComplaint: 'Annual wellness examination and vaccination',
      presentingClinicalSigns: 'No clinical signs of illness. Owner reports normal appetite, activity, and behavior.',
      fever: 'None',
      upperRespiratoryObservations: 'Clear nasal passages, normal breathing sounds, no cough or discharge noted'
    },
    laboratoryTests: {
      completeBloodCount: 'Within normal limits',
      fecalAnalysis: 'Negative for parasites',
      presumptiveDiagnosis: 'Healthy adult horse, no abnormalities detected'
    },
    medicationTreatment: {
      treatment: 'Annual Check-up',
      administeredBy: 'Dr. Sarah Johnson',
      date: 'March 2, 2025',
      result: 'Complete'
    },
    remarks: 'Horse is in excellent health. Recommend continuing current diet and exercise regimen. Schedule dental examination in 6 months. Next annual check-up due March 2026.'
  };

  const handleGoBack = () => {
    router.replace('/medical');
  };

  const handleMedicalHistory = () => {
    router.push({
      pathname: '/medicalhis',
      params: {
        horseId: horseId,
        horseName: horseName
      }
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medical Record</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Medical History Button - positioned below header */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={handleMedicalHistory} style={styles.historyButton}>
          <Text style={styles.historyButtonText}>Medical History</Text>
          <FontAwesome5 name="clipboard-list" size={16} color="#fff" style={styles.historyIcon} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Medical Record Card */}
        <View style={styles.recordCard}>
          {/* Title and Status */}
          <View style={styles.titleSection}>
            <Text style={styles.recordTitle}>{medicalRecord.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: medicalRecord.statusColor }]}>
              <Text style={styles.statusText}>{medicalRecord.status}</Text>
            </View>
          </View>

          {/* Signalment Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SIGNALMENT</Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Body Temperature:</Text> {medicalRecord.signalment.bodyTemperature}</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Heart Rate:</Text> {medicalRecord.signalment.heartRate}</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Respiratory Rate:</Text> {medicalRecord.signalment.respiratoryRate}</Text>
            </View>
          </View>

          {/* Clinical Assessment Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CLINICAL ASSESSMENT</Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Chief Complaint/Concern:</Text> {medicalRecord.clinicalAssessment.chiefComplaint}</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Presenting Clinical Signs:</Text> {medicalRecord.clinicalAssessment.presentingClinicalSigns}</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Fever:</Text> {medicalRecord.clinicalAssessment.fever}</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Upper Respiratory Observations:</Text> {medicalRecord.clinicalAssessment.upperRespiratoryObservations}</Text>
            </View>
          </View>

          {/* Laboratory Tests Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>LABORATORY TESTS</Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Complete Blood Count:</Text> {medicalRecord.laboratoryTests.completeBloodCount}</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Fecal Analysis:</Text> {medicalRecord.laboratoryTests.fecalAnalysis}</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Presumptive/Definitive Diagnosis:</Text> {medicalRecord.laboratoryTests.presumptiveDiagnosis}</Text>
            </View>
          </View>

          {/* Medication/Treatment Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MEDICATION/TREATMENT</Text>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Treatment:</Text> {medicalRecord.medicationTreatment.treatment}</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Administered By:</Text> {medicalRecord.medicationTreatment.administeredBy}</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Date:</Text> {medicalRecord.medicationTreatment.date}</Text>
            </View>
            <View style={styles.bulletPoint}>
              <Text style={styles.bulletText}>• <Text style={styles.boldText}>Result:</Text> {medicalRecord.medicationTreatment.result}</Text>
            </View>
          </View>

          {/* Remarks Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>REMARKS</Text>
            <Text style={styles.remarksText}>{medicalRecord.remarks}</Text>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
    backgroundColor: '#CD853F',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40, // Same width as back button for balance
  },
  buttonContainer: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
    alignItems: 'flex-end', // Align to the right
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 69, 19, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    width: 120, // Fixed width for history button
    justifyContent: 'center',
  },
  historyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 5,
  },
  historyIcon: {
    marginLeft: 2,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  recordCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 10, // Reduced top margin since button is above
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e40af',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  bulletPoint: {
    marginBottom: 6,
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

export default MedicalRecordScreen;
