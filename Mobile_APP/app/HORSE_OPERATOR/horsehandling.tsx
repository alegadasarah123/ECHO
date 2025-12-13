import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import * as SecureStore from "expo-secure-store";

interface HorseAssignment {
  assign_id: string;
  kutsero_id: string;
  horse_id: string;
  date_start: string;
  date_end: string | null;
  created_at: string;
  updated_at: string;
  kutsero_name?: string;
  horse_name?: string;
  kutsero_image?: string;
}

const API_BASE_URL = "http://192.168.31.58:8000/api/horse_operator"

const HorseHandlingScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [assignments, setAssignments] = useState<HorseAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [horseId, setHorseId] = useState<string | null>(null);
  const [horseName, setHorseName] = useState<string>('');

  // Load horse ID from params or SecureStore
  const loadHorseId = useCallback(async () => {
    try {
      // First try to get from route params
      if (params?.id) {
        console.log("🐴 Horse ID from params:", params.id);
        setHorseId(params.id as string);
        return params.id as string;
      }

      // Fallback to SecureStore
      const storedHorseId = await SecureStore.getItemAsync("selected_horse_id");
      if (storedHorseId) {
        console.log("🐴 Horse ID from SecureStore:", storedHorseId);
        setHorseId(storedHorseId);
        return storedHorseId;
      }

      console.warn("⚠️ No horse_id found in params or storage");
      return null;
    } catch (error) {
      console.error("❌ Error loading horse ID:", error);
      return null;
    }
  }, [params?.id]);

  // Load user ID from SecureStore
  const loadUserId = useCallback(async () => {
    try {
      const storedUser = await SecureStore.getItemAsync("user_data");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const id = parsed.user_id || parsed.id;
        if (id) {
          console.log("🔑 Loaded user_id for horse handling:", id);
          setUserId(id);
          return id;
        }
      }
    } catch (error) {
      console.error("❌ Error loading user data:", error);
    }
    return null;
  }, []);

  // Initialize IDs on mount
  useEffect(() => {
    const initializeData = async () => {
      await loadUserId();
      await loadHorseId();
    };
    initializeData();
  }, [loadUserId, loadHorseId]);

  // Fetch horse assignments for specific horse
  const fetchHorseAssignments = useCallback(async () => {
    try {
      let uid = userId;
      if (!uid) {
        uid = await loadUserId();
        if (!uid) {
          console.error("❌ No user_id found, cannot fetch assignments.");
          setLoading(false);
          return;
        }
      }

      let hid = horseId;
      if (!hid) {
        hid = await loadHorseId();
        if (!hid) {
          console.error("❌ No horse_id found, cannot fetch assignments.");
          Alert.alert("Error", "Horse ID not found. Please select a horse first.");
          setLoading(false);
          return;
        }
      }

      console.log("📡 Fetching horse assignments for user_id:", uid, "horse_id:", hid);
      setLoading(true);
      
      const url = `${API_BASE_URL}/get_horse_assignments/?user_id=${encodeURIComponent(uid)}&horse_id=${encodeURIComponent(hid)}`;
      console.log("🌐 Request URL:", url);

      const response = await fetch(url);
      console.log("📊 Response status:", response.status);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.log("❌ Error response:", errData);
        throw new Error(errData.error || `Failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Raw assignments data:", data);
      console.log("📊 Number of assignments received:", Array.isArray(data) ? data.length : 'Not array');

      setAssignments(Array.isArray(data) ? data : []);
      
      // Set horse name from params or data
      if (params?.horseName) {
        setHorseName(params.horseName as string);
      } else if (data.length > 0 && data[0].horse_name) {
        setHorseName(data[0].horse_name);
      }

    } catch (error: any) {
      console.error("❌ Error loading horse assignments:", error);
      Alert.alert("Error", error.message || "Unable to load horse assignments");
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [userId, horseId, params?.horseName, loadUserId, loadHorseId]);

  // Refresh assignments when screen is focused and IDs are available
  useFocusEffect(
    useCallback(() => {
      if (userId && horseId) {
        console.log("🎯 Horse handling screen focused - refreshing assignments...");
        fetchHorseAssignments();
      }
    }, [userId, horseId, fetchHorseAssignments])
  );

  const handleGoBack = () => {
    router.back();
  };

  const formatDateTime = (dateTimeString: string) => {
    try {
      const date = new Date(dateTimeString);
      const dateStr = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      const timeStr = date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      return `${dateStr} | ${timeStr}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateTimeString;
    }
  };

  const getStatusText = (assignment: HorseAssignment) => {
    const now = new Date();
    const startDate = new Date(assignment.date_start);
    const endDate = assignment.date_end ? new Date(assignment.date_end) : null;

    if (now < startDate) {
      return { text: "Upcoming", color: "#FFA500" };
    } else if (!endDate || now <= endDate) {
      return { text: "Active", color: "#28A745" };
    } else {
      return { text: "Completed", color: "#6C757D" };
    }
  };

  // Simplified version that expects backend to return full URLs
  const getImageSourceSimple = (imageUrl: string | undefined) => {
    console.log("🖼️ getImageSourceSimple called with:", imageUrl);
    
    if (!imageUrl || imageUrl.trim() === '') {
      return { uri: 'https://via.placeholder.com/60x60/CD853F/ffffff?text=K' };
    }
    
    // If it's already a full URL, use it
    if (imageUrl.startsWith('http')) {
      return { uri: imageUrl };
    }
    
    // If it's a relative path, construct the full URL
    // FIXED: Use the correct base URL
    const supabaseUrl = "https://drgknejiqupegkyxfaab.supabase.co";
    
    // Check what type of image it is
    if (imageUrl.includes('kutsero_op_profile')) {
      // Horse operator profile image
      const filename = imageUrl.split('/').pop() || imageUrl;
      return { uri: `${supabaseUrl}/storage/v1/object/public/kutsero_op_profile/${filename}` };
    } else if (imageUrl.includes('kutsero_images')) {
      // Kutsero profile image
      const filename = imageUrl.split('/').pop() || imageUrl;
      return { uri: `${supabaseUrl}/storage/v1/object/public/kutsero_images/${filename}` };
    } else {
      // Generic - assume it's in kutsero_images
      return { uri: `${supabaseUrl}/storage/v1/object/public/kutsero_images/${imageUrl}` };
    }
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <FontAwesome5 name="user-tie" size={64} color="#CD853F" />
      </View>
      <Text style={styles.emptyStateTitle}>No Kutsero Assignments</Text>
      <Text style={styles.emptyStateText}>
        {horseName ? `No kutsero assignments found for ${horseName}` : "No kutsero assignments found for this horse"} at this time. 
        Horse assignments will appear here when they are created.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {horseName ? `${horseName}'s Handlers` : "Kutsero's Horse Handling"}
        </Text>
      </View>

      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#CD853F" />
            <Text style={styles.loadingText}>Loading assignments...</Text>
          </View>
        ) : assignments.length === 0 ? (
          <EmptyState />
        ) : (
          assignments.map((assignment, index) => {
            const status = getStatusText(assignment);
            // Use the simple version for better reliability
            const imageSource = getImageSourceSimple(assignment.kutsero_image);
            
            return (
              <View key={assignment.assign_id} style={[
                styles.assignmentCard,
                { marginBottom: index === assignments.length - 1 ? 100 : 16 }
              ]}>
                <View style={styles.cardHeader}>
                  <Image
                    source={imageSource}
                    style={styles.cardProfileImage}
                    defaultSource={{ uri: 'https://via.placeholder.com/60x60/CD853F/ffffff?text=K' }}
                  />
                  <View style={styles.cardContent}>
                    <Text style={styles.cardUserName}>
                      {assignment.kutsero_name || 'Unknown Kutsero'}
                    </Text>
                    <Text style={styles.cardHorseName}>
                      Horse: {assignment.horse_name || horseName || 'Unknown Horse'}
                    </Text>
                    <View style={styles.statusContainer}>
                      <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
                        <Text style={styles.statusText}>{status.text}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                
                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <FontAwesome5 name="play" size={12} color="#28A745" style={styles.detailIcon} />
                    <Text style={styles.cardDetailText}>
                      Start: {formatDateTime(assignment.date_start)}
                    </Text>
                  </View>
                  {assignment.date_end && (
                    <View style={styles.detailRow}>
                      <FontAwesome5 name="stop" size={12} color="#DC3545" style={styles.detailIcon} />
                      <Text style={styles.cardDetailText}>
                        End: {formatDateTime(assignment.date_end)}
                      </Text>
                    </View>
                  )}
                  {!assignment.date_end && (
                    <View style={styles.detailRow}>
                      <FontAwesome5 name="clock" size={12} color="#FFA500" style={styles.detailIcon} />
                      <Text style={[styles.cardDetailText, { fontStyle: 'italic', color: '#FFA500' }]}>
                        Ongoing assignment
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
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
    backgroundColor: '#CD853F',
    paddingVertical: 15,
    paddingHorizontal: 20,
    paddingTop: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: -25,
  },
  backButton: {
    marginRight: 20,
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6C757D',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  assignmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F3F4',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardProfileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e0e0e0',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#E9ECEF',
  },
  cardContent: {
    flex: 1,
  },
  cardUserName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  cardHorseName: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 8,
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailIcon: {
    marginRight: 8,
    width: 12,
  },
  cardDetailText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    flex: 1,
  },
});

export default HorseHandlingScreen;