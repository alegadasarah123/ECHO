import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

interface VetProfile {
  vet_id: string;
  vet_fname: string;
  vet_mname?: string;
  vet_lname: string;
  vet_dob: string;
  vet_sex: string;
  vet_phone_num: string;
  
  // Personal address fields
  vet_street?: string;
  vet_brgy: string;
  vet_city: string;
  vet_province: string;
  vet_zipcode: string;
  
  // Clinic address fields
  vet_address_is_clinic?: boolean;
  vet_clinic_street?: string;
  vet_clinic_brgy?: string;
  vet_clinic_city?: string;
  vet_clinic_province?: string;
  vet_clinic_zipcode?: string;
  
  vet_email: string;
  vet_license_num: string;
  vet_exp_yr: number;
  vet_specialization?: string;
  vet_org?: string;
  vet_profile_photo?: string;
  vet_documents?: string;
  created_at?: string;
}

interface VetScheduleItem {
  sched_id: string;
  vet_id: string;
  sched_date: string;
  start_time: string;
  end_time: string;
  sched_time: string;
  time_display: string;
  is_available: boolean;
}

type ScheduleResponse = VetScheduleItem[];

const API_BASE_URL = "http://10.254.39.148:8000/api/horse_operator";

const Hvetprofile = () => {
  const [vetProfile, setVetProfile] = useState<VetProfile | null>(null);
  const [scheduleData, setScheduleData] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const router = useRouter();
  const params = useLocalSearchParams();
  const vetId = params.vetId as string;
  const vetAvatar = params.vetAvatar as string;
  const userId = params.userId as string;

  const fetchVetProfile = useCallback(async () => {
    try {
      if (!vetId) {
        Alert.alert('Error', 'Veterinarian ID is required');
        return;
      }

      console.log('Fetching profile for vetId:', vetId);
      const response = await fetch(`${API_BASE_URL}/get_vet_profile/?vet_id=${encodeURIComponent(vetId)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch vet profile: ${response.status}`);
      }

      const data = await response.json();
      console.log('Profile data received:', data);
      
      if (data && data.length > 0) {
        setVetProfile(data[0]);
      } else {
        throw new Error('Veterinarian profile not found');
      }
    } catch (error) {
      console.error('Error fetching vet profile:', error);
      Alert.alert('Error', 'Failed to load veterinarian profile');
    }
  }, [vetId]);

  const fetchVetSchedule = useCallback(async () => {
    try {
      if (!vetId) return;

      const response = await fetch(`${API_BASE_URL}/get_vet_schedule/?vet_id=${encodeURIComponent(vetId)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch schedule: ${response.status}`);
      }

      const data = await response.json();
      setScheduleData(data);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setScheduleData([]);
    }
  }, [vetId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchVetProfile(), fetchVetSchedule()]);
    } finally {
      setLoading(false);
    }
  }, [fetchVetProfile, fetchVetSchedule]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatPersonalAddress = (profile: VetProfile) => {
    const parts = [];
    if (profile.vet_street) parts.push(profile.vet_street);
    parts.push(profile.vet_brgy);
    parts.push(profile.vet_city);
    parts.push(profile.vet_province);
    parts.push(profile.vet_zipcode);
    return parts.filter(Boolean).join(', ');
  };

  const formatClinicAddress = (profile: VetProfile) => {
    if (!profile.vet_clinic_brgy && !profile.vet_clinic_city) {
      return null;
    }
    
    const parts = [];
    if (profile.vet_clinic_street) parts.push(profile.vet_clinic_street);
    if (profile.vet_clinic_brgy) parts.push(profile.vet_clinic_brgy);
    if (profile.vet_clinic_city) parts.push(profile.vet_clinic_city);
    if (profile.vet_clinic_province) parts.push(profile.vet_clinic_province);
    if (profile.vet_clinic_zipcode) parts.push(profile.vet_clinic_zipcode);
    return parts.filter(Boolean).join(', ');
  };

  const calculateAge = (dobString: string) => {
    try {
      const dob = new Date(dobString);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      return age;
    } catch {
      return 'N/A';
    }
  };

  const formatTimeDisplay = (item: VetScheduleItem) => {
    if (item.time_display) return item.time_display;
    if (item.start_time && item.end_time) {
      return `${item.start_time} - ${item.end_time}`;
    }
    return item.sched_time || item.start_time || 'Time not available';
  };

  const handleBookAppointment = () => {
    if (!vetProfile) {
      Alert.alert('Error', 'Veterinarian profile not loaded');
      return;
    }

    const hasAvailableSchedule = scheduleData && scheduleData.length > 0;
    const transformedScheduleData = scheduleData?.map(item => ({
      ...item,
      timeDisplay: item.time_display || `${item.start_time} - ${item.end_time}`,
      startTime: item.start_time,
      endTime: item.end_time,
      originalSchedTime: item.sched_time
    }));

    router.push({
      pathname: '../HORSE_OPERATOR/Hbook',
      params: {
        vetId: vetId,
        vetName: `Dr. ${vetProfile.vet_fname} ${vetProfile.vet_mname ? `${vetProfile.vet_mname} ` : ''}${vetProfile.vet_lname}`,
        vetAvatar: vetAvatar,
        userId: userId,
        vetSpecialization: vetProfile.vet_specialization || 'Veterinarian',
        vetExperience: vetProfile.vet_exp_yr.toString(),
        hasSchedule: hasAvailableSchedule ? 'true' : 'false',
        scheduleData: JSON.stringify(transformedScheduleData)
      }
    });
  };

  const handleCall = () => {
    if (vetProfile?.vet_phone_num) {
      Alert.alert(
        'Call Veterinarian',
        `Do you want to call Dr. ${vetProfile.vet_fname} ${vetProfile.vet_lname}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Call',
            onPress: () => {
              Alert.alert('Calling', `Calling ${vetProfile.vet_phone_num}...`);
            }
          }
        ]
      );
    }
  };

  const renderScheduleItems = () => {
    if (!scheduleData || scheduleData.length === 0) {
      return (
        <View style={styles.noScheduleContainer}>
          <FontAwesome5 name="calendar-times" size={24} color="#ccc" />
          <Text style={styles.noScheduleText}>No available schedule at the moment</Text>
          <Text style={styles.noScheduleSubtext}>
            Please check back later or contact the veterinarian directly
          </Text>
        </View>
      );
    }

    const groupedSchedule = scheduleData.reduce((groups: { [key: string]: VetScheduleItem[] }, item: VetScheduleItem) => {
      const date = item.sched_date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
      return groups;
    }, {});

    const formatDisplayDate = (dateString: string) => {
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      } catch {
        return dateString;
      }
    };

    return (
      <View style={styles.scheduleContainer}>
        {Object.entries(groupedSchedule)
          .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
          .map(([date, timeSlots]) => (
            <View key={date} style={styles.scheduleItem}>
              <View style={styles.scheduleIconContainer}>
                <FontAwesome5 name="calendar-day" size={18} color="#CD853F" />
              </View>
              <View style={styles.scheduleContent}>
                <Text style={styles.scheduleDateText}>{formatDisplayDate(date)}</Text>
                
                <View style={styles.scheduleTimeContainer}>
                  <FontAwesome5 name="clock" size={14} color="#666" style={styles.clockIcon} />
                  <Text style={styles.scheduleTimeText}>
                    {timeSlots.length === 1 
                      ? formatTimeDisplay(timeSlots[0])
                      : `${timeSlots.length} time slots available`
                    }
                  </Text>
                </View>
                
                {timeSlots.length > 1 && (
                  <View style={styles.slotsContainer}>
                    <Text style={styles.slotsText}>Available times:</Text>
                    <View style={styles.timeSlots}>
                      {timeSlots.slice(0, 4).map((slot: VetScheduleItem) => (
                        <View key={slot.sched_id} style={styles.timeSlot}>
                          <Text style={styles.timeSlotText}>{formatTimeDisplay(slot)}</Text>
                        </View>
                      ))}
                      {timeSlots.length > 4 && (
                        <View style={styles.timeSlot}>
                          <Text style={styles.timeSlotText}>+{timeSlots.length - 4} more</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
                
                <View style={styles.availabilityBadge}>
                  <FontAwesome5 name="check-circle" size={12} color="#2d5e2d" />
                  <Text style={styles.availabilityText}>Available</Text>
                </View>
              </View>
            </View>
          ))}
        
        <View style={styles.scheduleSummary}>
          <View style={styles.summaryHeader}>
            <FontAwesome5 name="info-circle" size={16} color="#CD853F" />
            <Text style={styles.summaryHeaderText}>Schedule Summary</Text>
          </View>
          
          <View style={styles.summaryStats}>
            <View style={styles.summaryItem}>
              <FontAwesome5 name="calendar-check" size={14} color="#2d5e2d" />
              <Text style={styles.summaryText}>
                {Object.keys(groupedSchedule).length} available {Object.keys(groupedSchedule).length === 1 ? 'date' : 'dates'}
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <FontAwesome5 name="clock" size={14} color="#CD853F" />
              <Text style={styles.summaryText}>{scheduleData.length} total time slots</Text>
            </View>
          </View>
          
          <Text style={styles.summaryNote}>
            Tap &quot;Book Appointment&quot; to select specific time slots
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome5 name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Veterinarian Profile</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#CD853F" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!vetProfile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome5 name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Veterinarian Profile</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <FontAwesome5 name="user-md" size={50} color="#ccc" />
          <Text style={styles.errorText}>Profile not found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const profileImageUri = vetProfile.vet_profile_photo || vetAvatar;
  const clinicAddress = formatClinicAddress(vetProfile);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome5 name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Veterinarian Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#CD853F']} />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image source={{ uri: profileImageUri }} style={styles.profileImage} />
          <Text style={styles.profileName}>
            Dr. {vetProfile.vet_fname} {vetProfile.vet_mname ? `${vetProfile.vet_mname} ` : ''}{vetProfile.vet_lname}
          </Text>
          <Text style={styles.profileSpecialization}>
            {vetProfile.vet_specialization || 'Veterinarian'}
          </Text>
          <Text style={styles.profileExperience}>
            {vetProfile.vet_exp_yr} years of experience
          </Text>
          {vetProfile.vet_org && (
            <View style={styles.orgBadge}>
              <FontAwesome5 name="building" size={12} color="#CD853F" />
              <Text style={styles.orgText}>{vetProfile.vet_org}</Text>
            </View>
          )}
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.infoRow}>
            <FontAwesome5 name="envelope" size={16} color="#CD853F" style={styles.icon} />
            <Text style={styles.infoText}>{vetProfile.vet_email}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <FontAwesome5 name="phone" size={16} color="#CD853F" style={styles.icon} />
            <Text style={styles.infoText}>{vetProfile.vet_phone_num}</Text>
          </View>
        </View>

        {/* Address Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {vetProfile.vet_address_is_clinic ? 'Clinic Address' : 'Personal Address'}
          </Text>
          
          <View style={styles.infoRow}>
            <FontAwesome5 name="map-marker-alt" size={16} color="#CD853F" style={styles.icon} />
            <Text style={styles.infoText}>{formatPersonalAddress(vetProfile)}</Text>
          </View>

          {!vetProfile.vet_address_is_clinic && clinicAddress && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 15 }]}>Clinic Address</Text>
              <View style={styles.infoRow}>
                <FontAwesome5 name="clinic-medical" size={16} color="#CD853F" style={styles.icon} />
                <Text style={styles.infoText}>{clinicAddress}</Text>
              </View>
            </>
          )}
        </View>

        {/* Professional Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Information</Text>
          
          <View style={styles.infoRow}>
            <FontAwesome5 name="birthday-cake" size={16} color="#CD853F" style={styles.icon} />
            <Text style={styles.infoText}>
              {formatDate(vetProfile.vet_dob)} ({calculateAge(vetProfile.vet_dob)} years old)
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <FontAwesome5 name="venus-mars" size={16} color="#CD853F" style={styles.icon} />
            <Text style={styles.infoText}>{vetProfile.vet_sex}</Text>
          </View>

          <View style={styles.infoRow}>
            <FontAwesome5 name="id-card" size={16} color="#CD853F" style={styles.icon} />
            <Text style={styles.infoText}>License: {vetProfile.vet_license_num}</Text>
          </View>

          <View style={styles.infoRow}>
            <FontAwesome5 name="graduation-cap" size={16} color="#CD853F" style={styles.icon} />
            <Text style={styles.infoText}>Experience: {vetProfile.vet_exp_yr} years</Text>
          </View>
        </View>

        {/* Available Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Schedule</Text>
          {renderScheduleItems()}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.bookButton} onPress={handleBookAppointment}>
            <FontAwesome5 name="calendar-plus" size={18} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Book Appointment</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.callButton} onPress={handleCall}>
            <FontAwesome5 name="phone" size={18} color="#CD853F" style={styles.buttonIcon} />
            <Text style={styles.callButtonText}>Call Now</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#CD853F' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#CD853F'
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  headerSpacer: { width: 40 },
  container: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30
  },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30
  },
  errorText: { fontSize: 16, color: '#666', marginTop: 10, marginBottom: 20 },
  retryButton: { backgroundColor: '#CD853F', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  profileHeader: { alignItems: 'center', paddingTop: 30, paddingHorizontal: 20, paddingBottom: 20 },
  profileImage: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#f0f0f0', marginBottom: 15 },
  profileName: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 5 },
  profileSpecialization: { fontSize: 16, color: '#CD853F', fontWeight: '600', marginBottom: 5 },
  profileExperience: { fontSize: 14, color: '#666', marginBottom: 10 },
  orgBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8
  },
  orgText: { fontSize: 13, color: '#CD853F', fontWeight: '500', marginLeft: 6 },
  section: { paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#CD853F', marginBottom: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  icon: { marginRight: 12, marginTop: 2, width: 20 },
  infoText: { flex: 1, fontSize: 16, color: '#333', lineHeight: 22 },
  scheduleContainer: { marginTop: 5 },
  noScheduleContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginTop: 8
  },
  noScheduleText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '500'
  },
  noScheduleSubtext: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fafafa',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#CD853F'
  },
  scheduleIconContainer: { marginRight: 15, marginTop: 2, alignItems: 'center', justifyContent: 'center', width: 24 },
  scheduleContent: { flex: 1 },
  scheduleDateText: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 6 },
  scheduleTimeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  clockIcon: { marginRight: 6 },
  scheduleTimeText: { fontSize: 14, color: '#666' },
  slotsContainer: { marginBottom: 8 },
  slotsText: { fontSize: 13, color: '#888', marginBottom: 6, fontStyle: 'italic' },
  timeSlots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  timeSlot: {
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c8e6c9'
  },
  timeSlotText: { fontSize: 11, color: '#2d5e2d', fontWeight: '500' },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#f0f8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4
  },
  availabilityText: { fontSize: 12, color: '#2d5e2d', fontWeight: '500', marginLeft: 4 },
  scheduleSummary: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  summaryHeaderText: { fontSize: 16, fontWeight: '600', color: '#CD853F', marginLeft: 8 },
  summaryStats: { marginBottom: 12 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  summaryText: { fontSize: 14, fontWeight: '500', color: '#333', marginLeft: 8 },
  summaryNote: { fontSize: 12, color: '#666', fontStyle: 'italic', textAlign: 'center', marginTop: 4 },
  actionButtons: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 20, gap: 15 },
  bookButton: {
    flex: 1,
    backgroundColor: '#CD853F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10
  },
  callButton: {
    flex: 1,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CD853F'
  },
  buttonIcon: { marginRight: 8 },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  callButtonText: { fontSize: 16, fontWeight: '600', color: '#CD853F' },
  bottomPadding: { height: 20 }
});

export default Hvetprofile;