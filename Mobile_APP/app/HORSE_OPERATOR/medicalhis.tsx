import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

// Type definitions
interface Signalment {
  bodyTemperature: string;
  heartRate: string;
  respiratoryRate: string;
}

interface ClinicalAssessment {
  chiefComplaint: string;
  presentingClinicalSigns: string;
  fever: string;
  upperRespiratoryObservations: string;
}

interface LaboratoryTests {
  completeBloodCount: string;
  fecalAnalysis: string;
  presumptiveDiagnosis: string;
}

interface MedicationTreatment {
  treatment: string;
  administeredBy: string;
  date: string;
  result: string;
}

interface MedicalRecord {
  id: string;
  title: string;
  date: string;
  status: string;
  statusColor: string;
  signalment: Signalment;
  clinicalAssessment: ClinicalAssessment;
  laboratoryTests: LaboratoryTests;
  medicationTreatment: MedicationTreatment;
  remarks: string;
}

const MedicalHistoryScreen = () => {
  const router = useRouter();
//   const params = useLocalSearchParams();
  
//   // Get data from params or use defaults
//   const horseName = params.horseName || 'Oscar';
//   const horseId = params.horseId || 'default_horse_id';

  // Medical history data matching the image
  const medicalHistory: MedicalRecord[] = [
    {
      id: 'record_1',
      title: 'Medical Record - Annual Check-up (April 15, 2025)',
      date: 'April 15, 2025',
      status: 'Complete',
      statusColor: '#4CAF50',
      signalment: {
        bodyTemperature: '38°C',
        heartRate: '45 BPM',
        respiratoryRate: '17 RPM'
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
        treatment: 'Annual Influenza Vaccine',
        administeredBy: 'Dr. Sarah Johnson',
        date: 'May 2, 2025',
        result: 'Successful'
      },
      remarks: 'Horse is in excellent health. Recommend continuing current diet and exercise regimen. Schedule dental examination in 6 months. Next annual check-up and vaccination booster due May 2026.'
    }
  ];

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
        <Text style={styles.headerTitle}>Medical History</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {medicalHistory.map((record, index) => (
          <View 
            key={record.id} 
            style={styles.recordCard}
          >
            {/* Title and Status */}
            <View style={styles.titleSection}>
              <Text style={styles.recordTitle}>{record.title}</Text>
            </View>

            {/* Signalment Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SIGNALMENT</Text>
              <View style={styles.bulletPoint}>
                <Text style={styles.bulletText}>• <Text style={styles.boldText}>Body Temperature:</Text> {record.signalment.bodyTemperature}</Text>
              </View>
              <View style={styles.bulletPoint}>
                <Text style={styles.bulletText}>• <Text style={styles.boldText}>Heart Rate:</Text> {record.signalment.heartRate}</Text>
              </View>
              <View style={styles.bulletPoint}>
                <Text style={styles.bulletText}>• <Text style={styles.boldText}>Respiratory Rate:</Text> {record.signalment.respiratoryRate}</Text>
              </View>
            </View>

            {/* Clinical Assessment Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>CLINICAL ASSESSMENT</Text>
              <View style={styles.bulletPoint}>
                <Text style={styles.bulletText}>• <Text style={styles.boldText}>Chief Complaint/Concern:</Text> {record.clinicalAssessment.chiefComplaint}</Text>
              </View>
              <View style={styles.bulletPoint}>
                <Text style={styles.bulletText}>• <Text style={styles.boldText}>Presenting Clinical Signs:</Text> {record.clinicalAssessment.presentingClinicalSigns}</Text>
              </View>
              <View style={styles.bulletPoint}>
                <Text style={styles.bulletText}>• <Text style={styles.boldText}>Fever:</Text> {record.clinicalAssessment.fever}</Text>
              </View>
              <View style={styles.bulletPoint}>
                <Text style={styles.bulletText}>• <Text style={styles.boldText}>Upper Respiratory Observations:</Text> {record.clinicalAssessment.upperRespiratoryObservations}</Text>
              </View>
            </View>

            {/* Laboratory Tests Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>LABORATORY TESTS</Text>
              <View style={styles.bulletPoint}>
                <Text style={styles.bulletText}>• <Text style={styles.boldText}>Complete Blood Count:</Text> {record.laboratoryTests.completeBloodCount}</Text>
              </View>
              <View style={styles.bulletPoint}>
                <Text style={styles.bulletText}>• <Text style={styles.boldText}>Fecal Analysis:</Text> {record.laboratoryTests.fecalAnalysis}</Text>
              </View>
              <View style={styles.bulletPoint}>
                <Text style={styles.bulletText}>• <Text style={styles.boldText}>Presumptive/Definitive Diagnosis:</Text> {record.laboratoryTests.presumptiveDiagnosis}</Text>
              </View>
            </View>

            {/* Medication/Treatment Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>MEDICATION/TREATMENT</Text>
              <View style={styles.bulletPoint}>
                <Text style={styles.bulletText}>• <Text style={styles.boldText}>Treatment:</Text> {record.medicationTreatment.treatment}</Text>
              </View>
              <View style={styles.bulletPoint}>
                <Text style={styles.bulletText}>• <Text style={styles.boldText}>Administered By:</Text> {record.medicationTreatment.administeredBy}</Text>
              </View>
              <View style={styles.bulletPoint}>
                <Text style={styles.bulletText}>• <Text style={styles.boldText}>Date:</Text> {record.medicationTreatment.date}</Text>
              </View>
              <View style={styles.bulletPoint}>
                <Text style={styles.bulletText}>• <Text style={styles.boldText}>Result:</Text> {record.medicationTreatment.result}</Text>
              </View>
            </View>

            {/* Remarks Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>REMARKS</Text>
              <Text style={styles.remarksText}>{record.remarks}</Text>
            </View>
          </View>
        ))}
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
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  recordCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 20,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  titleSection: {
    marginBottom: 20,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e40af',
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

export default MedicalHistoryScreen;