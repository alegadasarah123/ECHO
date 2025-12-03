import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

interface Treatment {
  treatment_id: string;
  treatment_name: string;
  treatment_dosage: string;
  treatment_duration: string;
  followup_date?: string;
  treatment_outcome?: string;
}

const API_BASE_URL = "http://192.168.31.58:8000/api/horse_operator";

const TreatmentListScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [horseName, setHorseName] = useState<string>('');
  const [examinationDate, setExaminationDate] = useState<string>('');

  const medrecId = params.medrecId as string;
  const userId = params.userId as string;

  const fetchTreatments = useCallback(async () => {
    if (!medrecId || !userId) {
      setError('Missing required information');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const url = `${API_BASE_URL}/get_medical_record_treatments/?medrec_id=${medrecId}&user_id=${userId}`;
      console.log('Fetching treatments from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setTreatments(data.treatments || []);
        setHorseName(data.horse_name || 'Unknown Horse');
        setExaminationDate(data.examination_date || '');
        console.log('Treatments loaded:', data.treatments?.length || 0);
      } else {
        setError(data.error || 'Failed to load treatments');
        console.error('API Error:', data.error);
      }
    } catch (err) {
      console.error('Error fetching treatments:', err);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [medrecId, userId]);

  useEffect(() => {
    fetchTreatments();
  }, [fetchTreatments]);

  const handleGoBack = () => {
    router.back();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <FontAwesome5 name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Treatments</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#CD853F" />
          <Text style={styles.loadingText}>Loading treatments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <FontAwesome5 name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Treatments</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <FontAwesome5 name="exclamation-circle" size={60} color="#E74C3C" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchTreatments}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Treatments</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Info */}
        <View style={styles.infoCard}>
          <Text style={styles.horseName}>{horseName}</Text>
          <Text style={styles.examinationDate}>
            Examination Date: {formatDate(examinationDate)}
          </Text>
        </View>

        {/* Treatments List */}
        {treatments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="pills" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No treatments found</Text>
            <Text style={styles.emptySubtext}>
              No treatments have been prescribed for this medical record yet.
            </Text>
          </View>
        ) : (
          <View style={styles.treatmentsList}>
            <Text style={styles.sectionTitle}>
              Treatment History ({treatments.length})
            </Text>
            {treatments.map((treatment) => (
              <View
                key={treatment.treatment_id}
                style={styles.treatmentCard}
              >
                <View style={styles.treatmentHeader}>
                  <View style={styles.treatmentIconContainer}>
                    <FontAwesome5 name="pills" size={20} color="#2E5BBA" />
                  </View>
                  <View style={styles.treatmentInfo}>
                    <Text style={styles.treatmentName}>
                      {treatment.treatment_name}
                    </Text>
                    {treatment.treatment_outcome && (
                      <View
                        style={[
                          styles.outcomeBadge,
                          treatment.treatment_outcome.toLowerCase() === 'successful'
                            ? styles.successBadge
                            : styles.pendingBadge,
                        ]}
                      >
                        <Text style={styles.outcomeText}>
                          {treatment.treatment_outcome}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.treatmentDetails}>
                  <View style={styles.detailRow}>
                    <FontAwesome5 name="prescription-bottle" size={14} color="#666" />
                    <Text style={styles.detailText}>
                      Dosage: {treatment.treatment_dosage}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <FontAwesome5 name="clock" size={14} color="#666" />
                    <Text style={styles.detailText}>
                      Duration: {treatment.treatment_duration}
                    </Text>
                  </View>
                  {treatment.followup_date && (
                    <View style={styles.detailRow}>
                      <FontAwesome5 name="calendar-check" size={14} color="#666" />
                      <Text style={styles.detailText}>
                        Follow-up: {formatDate(treatment.followup_date)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
  infoCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginBottom: 10,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  horseName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  examinationDate: {
    fontSize: 14,
    color: '#6C757D',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  treatmentsList: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
  },
  treatmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  treatmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  treatmentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  treatmentInfo: {
    flex: 1,
  },
  treatmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  outcomeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  successBadge: {
    backgroundColor: '#D4EDDA',
  },
  pendingBadge: {
    backgroundColor: '#FFF3CD',
  },
  outcomeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2C3E50',
  },
  treatmentDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#6C757D',
  },
  bottomSpacing: {
    height: 20,
  },
});

export default TreatmentListScreen;