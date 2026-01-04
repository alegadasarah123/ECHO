// HORSE_OPERATOR/medicalrec.tsx - UPDATED VERSION WITHOUT DOWNLOAD
import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { WebView } from 'react-native-webview';

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
    file_url?: string;
    file_type?: 'image' | 'pdf' | 'unknown';
    file_name?: string;
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

const API_BASE_URL = "http://192.168.101.4:8000/api/horse_operator";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MedicalRecordScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [medicalRecord, setMedicalRecord] = useState<MedicalRecordDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileModalVisible, setFileModalVisible] = useState(false);
  const [fileLoading, setFileLoading] = useState(true);
  const [fileError, setFileError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [fileUrlWithTimestamp, setFileUrlWithTimestamp] = useState<string>('');
  const [imageKey, setImageKey] = useState(0);

  const recordId = params.recordId as string;
  const userId = params.userId as string;

  // ✅ Clean and safe file URL handler
  const cleanFileUrl = (url: string): string => {
    if (!url) return '';
    let cleanUrl = url.trim();

    if (cleanUrl.startsWith('[') && cleanUrl.endsWith(']')) {
      cleanUrl = cleanUrl.slice(1, -1);
    }
    cleanUrl = cleanUrl.replace(/['"]/g, '');

    if (cleanUrl.includes('?')) {
      cleanUrl = cleanUrl.split('?')[0];
    }

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      const filename = cleanUrl.split('/').pop() || `lab_${Date.now()}`;
      cleanUrl = `https://drgknejiqupegkyxfaab.supabase.co/storage/v1/object/public/Lab_results/${filename}`;
    }

    return cleanUrl;
  };

  const fetchMedicalRecordDetails = useCallback(async () => {
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

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setMedicalRecord(data);
        if (data.laboratory?.file_url) {
          const originalUrl = data.laboratory.file_url;
          const cleanedUrl = cleanFileUrl(originalUrl);
          const timestamp = Date.now();
          const urlWithTimestamp = `${cleanedUrl}?t=${timestamp}`;
          setFileUrlWithTimestamp(urlWithTimestamp);
          setImageKey(prev => prev + 1);
        }
      } else {
        setError(data.error || 'Failed to load medical record');
      }
    } catch (err: any) {
      console.error('Error fetching medical record:', err);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [recordId, userId]);

  const retryFileLoad = () => {
    const newRetryCount = retryCount + 1;
    setRetryCount(newRetryCount);
    setFileError(false);
    setFileLoading(true);
    if (medicalRecord?.laboratory?.file_url) {
      const timestamp = Date.now();
      const cleanUrl = cleanFileUrl(medicalRecord.laboratory.file_url);
      const fileUrl = `${cleanUrl}?t=${timestamp}&retry=${newRetryCount}`;
      setFileUrlWithTimestamp(fileUrl);
      setImageKey(prev => prev + 1);
    }
  };

  // ✅ Open file in browser only
  const openInBrowser = async () => {
    if (!medicalRecord?.laboratory?.file_url) {
      Alert.alert('Error', 'No file URL available');
      return;
    }
    try {
      const cleanUrl = cleanFileUrl(medicalRecord.laboratory.file_url);
      await WebBrowser.openBrowserAsync(cleanUrl);
    } catch (error: any) {
      console.error('Failed to open URL in browser:', error);
      try {
        const cleanUrl = cleanFileUrl(medicalRecord.laboratory.file_url);
        const supported = await Linking.canOpenURL(cleanUrl);
        if (supported) {
          await Linking.openURL(cleanUrl);
        } else {
          Alert.alert('Error', 'Unable to open the file in browser.');
        }
      } catch (linkError: any) {
        Alert.alert('Error', `Unable to open the file: ${linkError.message}`);
      }
    }
  };

  useEffect(() => {
    fetchMedicalRecordDetails();
  }, [fetchMedicalRecordDetails]);

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

  const handleFilePress = () => {
    if (!medicalRecord?.laboratory?.file_type) return;
    
    const isPDF = medicalRecord.laboratory.file_type === 'pdf';
    const isImage = medicalRecord.laboratory.file_type === 'image';
    
    if (isImage) {
      // For images, open the modal
      setFileModalVisible(true);
    } else if (isPDF) {
      // For PDFs, offer options
      Alert.alert(
        'Open PDF',
        'How would you like to view the PDF?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'View in App', onPress: () => setFileModalVisible(true) },
          { text: 'Open in Browser', onPress: openInBrowser }
        ]
      );
    } else {
      // For unknown files, open in browser
      openInBrowser();
    }
  };

  const renderFileSection = () => {
    if (!medicalRecord?.laboratory?.file_url) {
      return null;
    }

    const displayFileUrl = fileUrlWithTimestamp || medicalRecord.laboratory.file_url;
    const isPDF = medicalRecord.laboratory.file_type === 'pdf';
    const isImage = medicalRecord.laboratory.file_type === 'image';

    return (
      <View style={styles.labFileSection}>
        <View style={styles.labFileHeader}>
          <FontAwesome5 
            name={isPDF ? "file-pdf" : "image"} 
            size={14} 
            color={isPDF ? "#E74C3C" : "#6C757D"} 
          />
          <Text style={styles.labFileTitle}>
            {isPDF ? 'Laboratory PDF Report' : 'Laboratory Image'}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.labFileContainer,
            isPDF && styles.pdfContainer
          ]}
          onPress={handleFilePress}
          activeOpacity={0.9}
        >
          {isImage ? (
            <>
              {fileLoading && !fileError && (
                <View style={styles.fileLoadingContainer}>
                  <ActivityIndicator size="large" color="#CD853F" />
                  <Text style={styles.fileLoadingText}>Loading image...</Text>
                </View>
              )}
              
              {fileError && (
                <View style={styles.fileErrorContainer}>
                  <FontAwesome5 name="exclamation-triangle" size={40} color="#E74C3C" />
                  <Text style={styles.fileErrorText}>Failed to load image</Text>
                  <View style={styles.fileErrorButtons}>
                    <TouchableOpacity 
                      style={styles.retryFileButton}
                      onPress={retryFileLoad}
                    >
                      <Text style={styles.retryFileButtonText}>Retry</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.openFileButton}
                      onPress={openInBrowser}
                    >
                      <Text style={styles.openFileButtonText}>Open in Browser</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              
              <Image
                key={`image-${imageKey}`}
                source={{ 
                  uri: displayFileUrl,
                  cache: 'reload'
                }}
                style={[
                  styles.labFileImage,
                  (fileLoading || fileError) && styles.labFileHidden
                ]}
                resizeMode="cover"
                onLoadStart={() => {
                  setFileLoading(true);
                  setFileError(false);
                }}
                onLoadEnd={() => {
                  console.log('Image loaded successfully:', displayFileUrl);
                  setFileLoading(false);
                }}
                onError={(e) => {
                  console.error('Failed to load lab image:', e.nativeEvent.error);
                  console.error('Image URL:', displayFileUrl);
                  setFileLoading(false);
                  setFileError(true);
                }}
              />
              
              {!fileLoading && !fileError && (
                <View style={styles.fileOverlay}>
                  <FontAwesome5 name="search-plus" size={24} color="#fff" />
                  <Text style={styles.fileOverlayText}>Tap to enlarge</Text>
                </View>
              )}
            </>
          ) : isPDF ? (
            <View style={styles.pdfPreviewContainer}>
              <FontAwesome5 name="file-pdf" size={60} color="#E74C3C" />
              <Text style={styles.pdfPreviewText}>PDF Document</Text>
              <Text style={styles.pdfFileName} numberOfLines={1}>
                {medicalRecord.laboratory.file_name || 'lab_report.pdf'}
              </Text>
              <Text style={styles.pdfTapText}>Tap to view options</Text>
            </View>
          ) : (
            <View style={styles.unknownFileContainer}>
              <FontAwesome5 name="file" size={60} color="#6C757D" />
              <Text style={styles.unknownFileText}>Document</Text>
              <Text style={styles.unknownFileSubText}>Tap to view</Text>
            </View>
          )}
        </TouchableOpacity>
        
        {/* File Actions Row */}
        <View style={styles.fileActionsRow}>
          {isImage && (
            <TouchableOpacity 
              style={styles.fileActionButton}
              onPress={() => setFileModalVisible(true)}
            >
              <FontAwesome5 name="eye" size={14} color="#2E5BBA" />
              <Text style={styles.fileActionText}>Preview</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.fileActionButton}
            onPress={openInBrowser}
          >
            <FontAwesome5 name="external-link-alt" size={14} color="#2E5BBA" />
            <Text style={styles.fileActionText}>Open in Browser</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
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

  const isPDF = medicalRecord.laboratory?.file_type === 'pdf';
  const displayFileUrl = fileUrlWithTimestamp || medicalRecord.laboratory?.file_url;

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

          {/* Laboratory Tests */}
          {(medicalRecord.laboratory.results || medicalRecord.laboratory.file_url) && (
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
              
              {renderFileSection()}
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

      {/* File Modal */}
      <Modal
        visible={fileModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFileModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isPDF ? 'PDF Report' : 'Laboratory Image'}
            </Text>
            <View style={styles.modalHeaderButtons}>
              <TouchableOpacity 
                style={styles.modalActionButton}
                onPress={openInBrowser}
              >
                <FontAwesome5 
                  name="external-link-alt" 
                  size={18} 
                  color="#fff" 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setFileModalVisible(false)}
              >
                <FontAwesome5 name="times" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          
          {displayFileUrl ? (
            isPDF ? (
              <WebView
                source={{ uri: displayFileUrl }}
                style={styles.pdfViewer}
                startInLoadingState={true}
                renderLoading={() => (
                  <View style={styles.pdfLoadingContainer}>
                    <ActivityIndicator size="large" color="#CD853F" />
                    <Text style={styles.pdfLoadingText}>Loading PDF...</Text>
                  </View>
                )}
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error('WebView error: ', nativeEvent);
                  Alert.alert(
                    'PDF Load Error',
                    'Failed to load PDF. Try opening in browser instead.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Open in Browser', onPress: openInBrowser }
                    ]
                  );
                }}
              />
            ) : (
              <Image
                key={`modal-image-${imageKey}`}
                source={{ 
                  uri: displayFileUrl,
                  cache: 'reload'
                }}
                style={styles.modalImage}
                resizeMode="contain"
                onLoadStart={() => setFileLoading(true)}
                onLoadEnd={() => {
                  console.log('Modal image loaded successfully');
                  setFileLoading(false);
                }}
                onError={(e) => {
                  console.error('Failed to load image in modal:', e.nativeEvent.error);
                  Alert.alert(
                    'Image Load Error',
                    'Failed to load image. Try opening in browser instead.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Open in Browser', onPress: openInBrowser }
                    ]
                  );
                }}
              />
            )
          ) : (
            <View style={styles.modalErrorContainer}>
              <FontAwesome5 name="exclamation-triangle" size={60} color="#E74C3C" />
              <Text style={styles.modalErrorText}>No file URL available</Text>
            </View>
          )}
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
  labFileSection: {
    marginTop: 16,
  },
  labFileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  labFileTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6C757D',
    flex: 1,
  },
  labFileContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minHeight: 200,
    position: 'relative',
  },
  pdfContainer: {
    minHeight: 180,
    borderColor: '#E74C3C',
    backgroundColor: '#FEF2F2',
  },
  labFileImage: {
    width: '100%',
    height: 200,
  },
  labFileHidden: {
    opacity: 0,
    position: 'absolute',
  },
  fileLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  fileLoadingText: {
    fontSize: 14,
    color: '#6C757D',
  },
  fileErrorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 20,
  },
  fileErrorText: {
    fontSize: 14,
    color: '#E74C3C',
    textAlign: 'center',
    marginBottom: 10,
  },
  fileErrorButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  retryFileButton: {
    backgroundColor: '#CD853F',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryFileButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  openFileButton: {
    backgroundColor: '#2E5BBA',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  openFileButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fileOverlay: {
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
  fileOverlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  pdfPreviewContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pdfPreviewText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 10,
  },
  pdfFileName: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 4,
    textAlign: 'center',
  },
  pdfTapText: {
    fontSize: 12,
    color: '#CD853F',
    marginTop: 10,
    fontWeight: '500',
  },
  unknownFileContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  unknownFileText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 10,
  },
  unknownFileSubText: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 4,
  },
  fileActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingHorizontal: 10,
  },
  fileActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  fileActionText: {
    fontSize: 12,
    color: '#2C3E50',
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
    backgroundColor: '#000',
  },
  modalHeader: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  modalActionButton: {
    padding: 8,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  pdfViewer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#fff',
  },
  pdfLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  pdfLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  modalErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  modalErrorText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 20,
    textAlign: 'center',
  },
});

export default MedicalRecordScreen;