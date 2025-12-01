import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

interface MedicalRecord {
  medrec_id: string;
  horse_id: string;
  vet_id: string;
  vet_name: string;
  vet_specialization: string;
  date: string;
  formatted_date: string;
  vital_signs: {
    heart_rate: string;
    respiratory_rate: string;
    body_temperature: string;
  };
  clinical_findings: {
    clinical_signs: string;
    diagnostic_protocol: string;
    lab_results?: string;
    lab_image?: string;
  };
  assessment: {
    diagnosis: string;
    prognosis: string;
    recommendations: string;
  };
  horse_status?: string;
  parent_medrec_id?: string;
  followup_date?: string;
}

interface Horse {
  horse_id: string;
  horse_name: string;
  horse_age?: string;
  horse_breed?: string;
}

const API_BASE_URL = "http://192.168.101.6:8000/api/horse_operator"

const MedicalRecordsScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [horseId, setHorseId] = useState<string | null>(null);
  const [horse, setHorse] = useState<Horse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user ID from SecureStore
  useEffect(() => {
    const loadUserId = async () => {
      try {
        console.log('Loading user ID from SecureStore...');
        const storedUser = await SecureStore.getItemAsync("user_data");
        
        if (!storedUser) {
          console.error('No user data in SecureStore');
          setError('User not logged in');
          setLoading(false);
          return;
        }

        const parsed = JSON.parse(storedUser);
        const id = parsed.user_id || parsed.id;
        console.log('Loaded user ID:', id);
        setUserId(id);
      } catch (error) {
        console.error('Error loading user data:', error);
        setError('Failed to load user data');
        setLoading(false);
      }
    };
    
    loadUserId();
  }, []); // Only run once on mount

  // Load horse ID from route params or SecureStore
  useEffect(() => {
    const loadHorseId = async () => {
      try {
        // First try route params
        if (params?.id) {
          console.log('Loaded horse_id from route params:', params.id);
          setHorseId(params.id);
          return;
        }
        
        // Fallback to SecureStore
        const storedHorseId = await SecureStore.getItemAsync("selected_horse_id");
        if (storedHorseId) {
          console.log('Loaded horse_id from storage (fallback):', storedHorseId);
          setHorseId(storedHorseId);
          return;
        }
        
        console.warn('No horse_id found in params or storage');
        setError('No horse selected');
        setLoading(false);
      } catch (error) {
        console.error('Error loading horse ID:', error);
        setError('Failed to load horse data');
        setLoading(false);
      }
    };
    
    loadHorseId();
  }, [params?.id]); // Only re-run if params.id changes

  // Fetch horse details
  const fetchHorseDetails = useCallback(async () => {
    if (!userId || !horseId) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/get_horses/?user_id=${encodeURIComponent(userId)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch horses: ${response.status}`);
      }

      const horses = await response.json();
      const horseData = horses.find((h: Horse) => h.horse_id === horseId);
      
      if (horseData) {
        setHorse(horseData);
        console.log('Horse details loaded:', horseData.horse_name);
      }
    } catch (error) {
      console.error('Error fetching horse details:', error);
    }
  }, [userId, horseId]);

  // Fetch medical records - REMOVED horse from dependencies to prevent loop
  const fetchMedicalRecords = useCallback(async (showLoader = true) => {
    if (!userId || !horseId) {
      console.log('Cannot fetch - missing userId or horseId:', { userId, horseId });
      return;
    }

    try {
      if (showLoader) setLoading(true);
      setError(null);

      const url = `${API_BASE_URL}/get_horse_medical_records/?horse_id=${horseId}&user_id=${userId}`;
      console.log('Fetching from URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Found', data.medical_records?.length || 0, 'medical records');

      if (response.ok) {
        if (data.medical_records && Array.isArray(data.medical_records)) {
          setMedicalRecords(data.medical_records);
          
          // Set horse name from response - use setHorse conditionally
          if (data.horse_name) {
            setHorse(prev => {
              // Only update if we don't have horse data yet
              if (!prev || !prev.horse_name) {
                return {
                  horse_id: horseId,
                  horse_name: data.horse_name,
                };
              }
              return prev;
            });
          }
        } else if (Array.isArray(data)) {
          setMedicalRecords(data);
        } else {
          setMedicalRecords([]);
        }
      } else {
        const errorMessage = data.error || data.message || 'Failed to fetch medical records';
        console.error('API Error:', errorMessage);
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Network error fetching medical records:', error);
      setError('Network error. Please check your connection and API URL.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, horseId]); // Removed 'horse' from dependencies

  // Trigger data fetching when IDs are ready - use ref to prevent multiple calls
  const hasFetchedRef = React.useRef(false);
  
  useEffect(() => {
    if (userId && horseId && !hasFetchedRef.current) {
      console.log('Both IDs ready, fetching data...');
      hasFetchedRef.current = true;
      fetchHorseDetails();
      fetchMedicalRecords();
    }
  }, [userId, horseId, fetchHorseDetails, fetchMedicalRecords]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    console.log('Refreshing medical records...');
    setRefreshing(true);
    fetchMedicalRecords(false);
  }, [fetchMedicalRecords]);

  // Navigate to record details
  const handleRecordPress = (record: MedicalRecord) => {
    console.log('Opening record:', record.medrec_id);
    router.push({
      pathname: '../HORSE_OPERATOR/medicalrec',
      params: {
        recordId: record.medrec_id,
        horseId: horseId || '',
        userId: userId || ''
      }
    });
  };

  const handleGoBack = () => {
    console.log('Going back...');
    router.back();
  };

  // Loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#CD853F" />
          <Text style={styles.loadingText}>Loading medical records...</Text>
          <Text style={styles.debugText}>User ID: {userId || 'Loading...'}</Text>
          <Text style={styles.debugText}>Horse: {horse?.horse_name || horseId || 'Loading...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <FontAwesome5 name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Medical Records</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <FontAwesome5 name="exclamation-circle" size={50} color="#E74C3C" />
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.debugText}>API: {API_BASE_URL}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => fetchMedicalRecords()}
          >
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
          <FontAwesome5 name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medical Records</Text>
        <View style={styles.headerSpacer} />
      </View>

      {horse && (
        <View style={styles.horseBanner}>
          <FontAwesome5 name="horse" size={24} color="#CD853F" />
          <View style={styles.horseBannerText}>
            <Text style={styles.horseName}>{horse.horse_name}</Text>
            {horse.horse_breed && (
              <Text style={styles.horseDetails}>
                {horse.horse_age && `${horse.horse_age} years`} {horse.horse_age && horse.horse_breed && '•'} {horse.horse_breed}
              </Text>
            )}
          </View>
        </View>
      )}

      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#CD853F']}
          />
        }
      >
        {medicalRecords.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="file-medical" size={60} color="#CCC" />
            <Text style={styles.emptyText}>No Medical Records</Text>
            <Text style={styles.emptySubtext}>
              Medical records for {horse?.horse_name || 'this horse'} will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.recordsList}>
            <Text style={styles.sectionTitle}>
              {medicalRecords.length} Record{medicalRecords.length !== 1 ? 's' : ''}
            </Text>
            
            {medicalRecords.map((record) => (
              <TouchableOpacity
                key={record.medrec_id}
                style={styles.recordCard}
                onPress={() => handleRecordPress(record)}
                activeOpacity={0.7}
              >
                <View style={styles.recordHeader}>
                  <View style={styles.recordIconContainer}>
                    <FontAwesome5 name="file-medical-alt" size={20} color="#CD853F" />
                  </View>
                  <View style={styles.recordHeaderText}>
                    <Text style={styles.recordDate}>{record.formatted_date}</Text>
                    <Text style={styles.recordVet}>{record.vet_name}</Text>
                  </View>
                  <FontAwesome5 name="chevron-right" size={16} color="#999" />
                </View>

                {/* Horse Status Badge */}
                {record.horse_status && (
                  <View style={[
                    styles.statusBadge,
                    record.horse_status === 'Healthy' && styles.statusHealthy,
                    record.horse_status === 'Sick' && styles.statusSick,
                    record.horse_status === 'Unhealthy' && styles.statusUnhealthy
                  ]}>
                    <Text style={styles.statusText}>{record.horse_status}</Text>
                  </View>
                )}

                <View style={styles.diagnosisPreview}>
                  <Text style={styles.diagnosisLabel}>Diagnosis:</Text>
                  <Text style={styles.diagnosisText} numberOfLines={2}>
                    {record.assessment.diagnosis}
                  </Text>
                </View>

                <View style={styles.vitalSignsRow}>
                  <View style={styles.vitalSign}>
                    <FontAwesome5 name="heartbeat" size={14} color="#E74C3C" />
                    <Text style={styles.vitalSignText}>
                      {record.vital_signs.heart_rate}
                    </Text>
                  </View>
                  <View style={styles.vitalSign}>
                    <FontAwesome5 name="lungs" size={14} color="#3498DB" />
                    <Text style={styles.vitalSignText}>
                      {record.vital_signs.respiratory_rate}
                    </Text>
                  </View>
                  <View style={styles.vitalSign}>
                    <FontAwesome5 name="thermometer-half" size={14} color="#F39C12" />
                    <Text style={styles.vitalSignText}>
                      {record.vital_signs.body_temperature}
                    </Text>
                  </View>
                </View>

                {/* Follow-up Date if exists */}
                {record.followup_date && (
                  <View style={styles.followupContainer}>
                    <FontAwesome5 name="calendar-check" size={12} color="#CD853F" />
                    <Text style={styles.followupText}>
                      Follow-up: {new Date(record.followup_date).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                <View style={styles.viewDetailsHint}>
                  <Text style={styles.viewDetailsText}>Tap to view full details</Text>
                </View>
              </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  debugText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
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
  header: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  backButton: {
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
  horseBanner: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    gap: 12,
  },
  horseBannerText: {
    flex: 1,
  },
  horseName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 2,
  },
  horseDetails: {
    fontSize: 14,
    color: '#6C757D',
  },
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 80,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#999',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  recordsList: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C757D',
    marginBottom: 12,
    marginLeft: 4,
  },
  recordCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F3F4',
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  recordIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordHeaderText: {
    flex: 1,
  },
  recordDate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 2,
  },
  recordVet: {
    fontSize: 14,
    color: '#6C757D',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusHealthy: {
    backgroundColor: '#D4EDDA',
  },
  statusSick: {
    backgroundColor: '#F8D7DA',
  },
  statusUnhealthy: {
    backgroundColor: '#FFF3CD',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C3E50',
  },
  diagnosisPreview: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F4',
  },
  diagnosisLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6C757D',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  diagnosisText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  vitalSignsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  vitalSign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vitalSignText: {
    fontSize: 12,
    color: '#6C757D',
    fontWeight: '500',
  },
  followupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F4',
  },
  followupText: {
    fontSize: 12,
    color: '#CD853F',
    fontWeight: '500',
  },
  viewDetailsHint: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F4',
  },
  viewDetailsText: {
    fontSize: 12,
    color: '#CD853F',
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 20,
  },
});

export default MedicalRecordsScreen;