import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

interface MedicalRecordDetails {
  medrec_id: string;
  horse: {
    horse_id: string;
    horse_name: string;
    status?: string;
  };
  veterinarian: {
    vet_id: string;
    name: string;
    specialization?: string;
    phone?: string;
    email?: string;
  };
  examination_date: string;
  formatted_date: string;
  vital_signs: {
    heart_rate: string;
    respiratory_rate: string;
    body_temperature: string;
  };
  clinical_examination: {
    clinical_signs: string;
    diagnostic_protocol: string;
  };
  laboratory: {
    results?: string;
    image_url?: string;
  };
  assessment: {
    diagnosis: string;
    prognosis: string;
    recommendations: string;
  };
  followup?: {
    parent_record_id?: string;
    parent_record_info?: {
      medrec_id: string;
      medrec_date: string;
      formatted_date: string;
      diagnosis: string;
    };
    followup_date?: string;
    followup_date_formatted?: string;
    is_followup?: boolean;
  };
}

const API_BASE_URL = "http://10.254.39.148:8000/api/horse_operator";
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MedicalRecordScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [medicalRecord, setMedicalRecord] = useState<MedicalRecordDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const recordId = params.recordId as string;
  const userId = params.userId as string;

  const fetchMedicalRecordDetails = async () => {
    if (!recordId || !userId) {
      setError('Missing required information');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const url = `${API_BASE_URL}/get_medical_record_details/?medrec_id=${recordId}&user_id=${userId}`;
      console.log('Fetching medical record from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setMedicalRecord(data);
        console.log('Medical record loaded successfully');
      } else {
        setError(data.error || 'Failed to load medical record');
        console.error('API Error:', data.error);
      }
    } catch (err) {
      console.error('Error fetching medical record:', err);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicalRecordDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId, userId]);

  const handleGoBack = () => {
    router.back();
  };

  const handleViewTreatments = () => {
    router.push({
      pathname: '../HORSE_OPERATOR/treatment',
      params: {
        medrecId: recordId,
        userId: userId
      }
    });
  };

  const handleImagePress = () => {
    setImageModalVisible(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <FontAwesome5 name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Medical Record</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#CD853F" />
          <Text style={styles.loadingText}>Loading medical record...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !medicalRecord) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <FontAwesome5 name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Medical Record</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <FontAwesome5 name="exclamation-circle" size={60} color="#E74C3C" />
          <Text style={styles.errorText}>{error || 'Medical record not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchMedicalRecordDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medical Record</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.recordCard}>
          {/* Title Section */}
          <View style={styles.titleSection}>
            <View style={styles.titleContent}>
              <Text style={styles.horseName}>{medicalRecord.horse.horse_name}</Text>
              <Text style={styles.recordDate}>{medicalRecord.formatted_date}</Text>
            </View>
            {medicalRecord.horse.status && (
              <View style={[
                styles.statusBadge,
                medicalRecord.horse.status === 'Healthy' && styles.statusHealthy,
                medicalRecord.horse.status === 'Sick' && styles.statusSick,
                medicalRecord.horse.status === 'Recovering' && styles.statusRecovering,
                medicalRecord.horse.status === 'Unhealthy' && styles.statusUnhealthy
              ]}>
                <Text style={styles.statusText}>{medicalRecord.horse.status}</Text>
              </View>
            )}
          </View>

          {/* Follow-up Banner */}
          {medicalRecord.followup?.is_followup && medicalRecord.followup?.parent_record_info && (
            <View style={styles.followupBanner}>
              <FontAwesome5 name="sync-alt" size={18} color="#2563EB" />
              <View style={styles.followupBannerContent}>
                <Text style={styles.followupBannerTitle}>Follow-up Visit</Text>
                <Text style={styles.followupBannerText}>
                  This is a follow-up examination from{' '}
                  <Text style={styles.followupBannerDate}>
                    {medicalRecord.followup.parent_record_info.formatted_date}
                  </Text>
                </Text>
                <Text style={styles.followupBannerPrevDiagnosis}>
                  Previous: {medicalRecord.followup.parent_record_info.diagnosis}
                </Text>
              </View>
            </View>
          )}

          {/* Veterinarian Info */}
          <View style={styles.vetSection}>
            <FontAwesome5 name="user-md" size={16} color="#CD853F" />
            <View style={styles.vetInfo}>
              <Text style={styles.vetName}>{medicalRecord.veterinarian.name}</Text>
              {medicalRecord.veterinarian.specialization && (
                <Text style={styles.vetSpecialization}>
                  {medicalRecord.veterinarian.specialization}
                </Text>
              )}
            </View>
          </View>

          {/* Vital Signs */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>VITAL SIGNS</Text>
            <View style={styles.vitalSignsGrid}>
              <View style={styles.vitalSignItem}>
                <FontAwesome5 name="heartbeat" size={20} color="#E74C3C" />
                <Text style={styles.vitalSignLabel}>Heart Rate</Text>
                <Text style={styles.vitalSignValue}>
                  {medicalRecord.vital_signs.heart_rate}
                </Text>
              </View>
              <View style={styles.vitalSignItem}>
                <FontAwesome5 name="lungs" size={20} color="#3498DB" />
                <Text style={styles.vitalSignLabel}>Respiratory Rate</Text>
                <Text style={styles.vitalSignValue}>
                  {medicalRecord.vital_signs.respiratory_rate}
                </Text>
              </View>
              <View style={styles.vitalSignItem}>
                <FontAwesome5 name="thermometer-half" size={20} color="#F39C12" />
                <Text style={styles.vitalSignLabel}>Body Temperature</Text>
                <Text style={styles.vitalSignValue}>
                  {medicalRecord.vital_signs.body_temperature}
                </Text>
              </View>
            </View>
          </View>

          {/* Clinical Examination */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CLINICAL EXAMINATION</Text>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Clinical Signs:</Text>
              <Text style={styles.detailText}>
                {medicalRecord.clinical_examination.clinical_signs}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Diagnostic Protocol:</Text>
              <Text style={styles.detailText}>
                {medicalRecord.clinical_examination.diagnostic_protocol}
              </Text>
            </View>
          </View>

          {/* Laboratory Tests - ENHANCED */}
          {(medicalRecord.laboratory.results || medicalRecord.laboratory.image_url) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <FontAwesome5 name="flask" size={16} color="#CD853F" style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>LABORATORY TESTS</Text>
              </View>
              
              {medicalRecord.laboratory.results && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Lab Results:</Text>
                  <Text style={styles.detailText}>
                    {medicalRecord.laboratory.results}
                  </Text>
                </View>
              )}
              
              {medicalRecord.laboratory.image_url && (
                <View style={styles.labImageSection}>
                  <View style={styles.labImageHeader}>
                    <FontAwesome5 name="image" size={14} color="#6C757D" />
                    <Text style={styles.labImageTitle}>Laboratory Image</Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.labImageContainer}
                    onPress={handleImagePress}
                    activeOpacity={0.9}
                  >
                    {imageLoading && !imageError && (
                      <View style={styles.imageLoadingContainer}>
                        <ActivityIndicator size="large" color="#CD853F" />
                        <Text style={styles.imageLoadingText}>Loading image...</Text>
                      </View>
                    )}
                    
                    {imageError && (
                      <View style={styles.imageErrorContainer}>
                        <FontAwesome5 name="image" size={40} color="#CCC" />
                        <Text style={styles.imageErrorText}>Image unavailable</Text>
                      </View>
                    )}
                    
                    <Image
                      source={{ uri: medicalRecord.laboratory.image_url }}
                      style={[
                        styles.labImage,
                        (imageLoading || imageError) && styles.labImageHidden
                      ]}
                      resizeMode="cover"
                      onLoadStart={() => {
                        setImageLoading(true);
                        setImageError(false);
                      }}
                      onLoadEnd={() => setImageLoading(false)}
                      onError={(e) => {
                        console.error('Failed to load lab image:', e.nativeEvent.error);
                        setImageLoading(false);
                        setImageError(true);
                      }}
                    />
                    
                    {!imageLoading && !imageError && (
                      <View style={styles.imageOverlay}>
                        <FontAwesome5 name="search-plus" size={24} color="#fff" />
                        <Text style={styles.imageOverlayText}>Tap to enlarge</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Assessment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ASSESSMENT</Text>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Diagnosis:</Text>
              <Text style={styles.detailText}>
                {medicalRecord.assessment.diagnosis}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Prognosis:</Text>
              <Text style={styles.detailText}>
                {medicalRecord.assessment.prognosis}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Recommendations:</Text>
              <Text style={styles.detailText}>
                {medicalRecord.assessment.recommendations}
              </Text>
            </View>
          </View>

          {/* Follow-up Schedule */}
          {medicalRecord.followup?.followup_date && (
            <View style={styles.followupSection}>
              <FontAwesome5 name="calendar-check" size={16} color="#CD853F" />
              <Text style={styles.followupText}>
                Follow-up scheduled: {medicalRecord.followup.followup_date_formatted}
              </Text>
            </View>
          )}

          {/* Treatments Button */}
          <TouchableOpacity
            style={styles.treatmentsButton}
            onPress={handleViewTreatments}
          >
            <FontAwesome5 name="pills" size={18} color="#fff" />
            <Text style={styles.treatmentsButtonText}>View Treatments</Text>
            <FontAwesome5 name="chevron-right" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Image Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => setImageModalVisible(false)}
          >
            <FontAwesome5 name="times" size={24} color="#fff" />
          </TouchableOpacity>
          
          <Image
            source={{ uri: medicalRecord.laboratory.image_url }}
            style={styles.modalImage}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
    backgroundColor: '#CD853F',
    marginTop: -20,
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
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 15,
  },
  errorText: {
    fontSize: 16,
    color: '#E74C3C',
    textAlign: 'center',
    marginTop: 10,
  },
  retryButton: {
    backgroundColor: '#CD853F',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  recordCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 10,
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
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  titleContent: {
    flex: 1,
  },
  horseName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 14,
    color: '#6C757D',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 10,
  },
  statusHealthy: {
    backgroundColor: '#D4EDDA',
  },
  statusSick: {
    backgroundColor: '#F8D7DA',
  },
  statusRecovering: {
    backgroundColor: '#FFF3CD',
  },
  statusUnhealthy: {
    backgroundColor: '#FFE5CC',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C3E50',
  },
  followupBanner: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  followupBannerContent: {
    flex: 1,
  },
  followupBannerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 4,
  },
  followupBannerText: {
    fontSize: 13,
    color: '#1E3A8A',
    marginBottom: 4,
  },
  followupBannerDate: {
    fontWeight: '600',
    color: '#2563EB',
  },
  followupBannerPrevDiagnosis: {
    fontSize: 12,
    color: '#3B82F6',
    fontStyle: 'italic',
  },
  vetSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5E6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 10,
  },
  vetInfo: {
    flex: 1,
  },
  vetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  vetSpecialization: {
    fontSize: 13,
    color: '#6C757D',
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#CD853F',
    letterSpacing: 0.5,
  },
  vitalSignsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  vitalSignItem: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    gap: 6,
  },
  vitalSignLabel: {
    fontSize: 11,
    color: '#6C757D',
    textAlign: 'center',
    fontWeight: '500',
  },
  vitalSignValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
  },
  detailItem: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6C757D',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  labImageSection: {
    marginTop: 16,
  },
  labImageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  labImageTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6C757D',
  },
  labImageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minHeight: 250,
    position: 'relative',
  },
  labImage: {
    width: '100%',
    height: 250,
  },
  labImageHidden: {
    opacity: 0,
    position: 'absolute',
  },
  imageLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  imageLoadingText: {
    fontSize: 14,
    color: '#6C757D',
  },
  imageErrorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  imageErrorText: {
    fontSize: 14,
    color: '#999',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imageOverlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  followupSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5E6',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    gap: 10,
  },
  followupText: {
    fontSize: 14,
    color: '#CD853F',
    fontWeight: '500',
    flex: 1,
  },
  treatmentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E5BBA',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 20,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  treatmentsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 10,
  },
  modalImage: {
    width: SCREEN_WIDTH,
    height: '80%',
  },
});

export default MedicalRecordScreen;