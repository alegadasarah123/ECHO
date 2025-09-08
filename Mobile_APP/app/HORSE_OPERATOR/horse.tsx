import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

interface Horse {
  horse_id: string;
  horse_name: string;
  horse_age: string;
  horse_dob: string;
  horse_sex: string;
  horse_breed: string;
  horse_color: string;
  horse_height: string;
  horse_weight: string;
  horse_image: string | null;
  lastVetCheck?: string;
  condition?: string;
  conditionColor?: string;
}

// ✅ Always use trailing slashes for DRF
const API_BASE_URL = "http://192.168.101.4:8000/api/horse_operator";

const HorseScreen = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('horse');
  const [horses, setHorses] = useState<Horse[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // ✅ Load user_id from SecureStore
  const loadUserId = async () => {
    try {
      const storedUser = await SecureStore.getItemAsync("user_data");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const id = parsed.user_id || parsed.id;
        if (id) {
          console.log("🔑 Loaded user_id from storage:", id);
          setUserId(id);
          return id;
        }
      }
    } catch (error) {
      console.error("❌ Error loading user data:", error);
    }
    return null;
  };

  // ✅ Fetch horses from backend
  const fetchHorses = useCallback(async () => {
    try {
      let uid = userId;
      if (!uid) {
        uid = await loadUserId();
        if (!uid) {
          console.error("❌ No user_id found, cannot fetch horses.");
          return;
        }
      }

      console.log("📡 Fetching horses for user_id:", uid);
      
      const url = `${API_BASE_URL}/get_horses/?user_id=${encodeURIComponent(uid)}`;
      console.log("🌐 Request URL:", url);

      const response = await fetch(url);
      console.log("📊 Response status:", response.status);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.log("❌ Error response:", errData);
        throw new Error(errData.error || `Failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Raw response data:", data);
      console.log("📊 Number of horses received:", Array.isArray(data) ? data.length : 'Not array');

      setHorses(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("❌ Error loading horses:", error);
      Alert.alert("Error", error.message || "Unable to load horses");
    }
  }, [userId]);

  // ✅ Delete horse
  const deleteHorse = async (horseId: string, horseName: string) => {
    Alert.alert(
      "Delete Horse",
      `Are you sure you want to delete ${horseName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("🗑️ Deleting horse:", horseId);
              const response = await fetch(`${API_BASE_URL}/delete_horse/${horseId}/`, {
                method: "DELETE",
              });
              const data = await response.json();

              if (response.ok) {
                console.log("✅ Horse deleted successfully");
                setHorses(prev => prev.filter(h => h.horse_id !== horseId));
                Alert.alert("Success", "Horse deleted successfully");
              } else {
                console.log("❌ Delete failed:", data);
                Alert.alert("Error", data.error || "Failed to delete horse");
              }
            } catch (error) {
              console.error("❌ Error deleting horse:", error);
              Alert.alert("Error", "Failed to delete horse");
            }
          },
        },
      ]
    );
  };

  // ✅ Refresh horses whenever page is focused
  useFocusEffect(
    useCallback(() => {
      console.log("🎯 Horse screen focused - refreshing horses...");
      fetchHorses();
    }, [fetchHorses])
  );

  const handleFeed = (horseName: string, horseId: string) => {
    router.push({ pathname: '/HORSE_OPERATOR/Hfeed', params: { horseName, horseId } });
  };

  const handleWater = (horseName: string, horseId: string) => {
    router.push({ pathname: '/HORSE_OPERATOR/water', params: { horseName, horseId } });
  };

  const handleHorseProfile = (horse: Horse) => {
    router.push({
      pathname: '/HORSE_OPERATOR/horseprofile',
      params: { id: horse.horse_id, horseData: JSON.stringify(horse) },
    });
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <FontAwesome5 name="horse" size={64} color="#CD853F" />
      </View>
      <Text style={styles.emptyStateTitle}>No Horses Yet</Text>
      <Text style={styles.emptyStateText}>
        Start building your stable by adding your first horse. Track their health, feeding schedules, and care routines all in one place.
      </Text>
      <TouchableOpacity 
        style={styles.emptyStateButton}
        onPress={() => router.push('/HORSE_OPERATOR/addhorse')}
      >
        <FontAwesome5 name="plus" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={styles.emptyStateButtonText}>Add Your First Horse</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>My Horses</Text>
            <Text style={styles.headerSubtitle}>
              {horses.length} {horses.length === 1 ? 'Horse' : 'Horses'}
            </Text>
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {horses.length === 0 ? (
              <EmptyState />
            ) : (
              horses.map((horse, index) => (
                <View key={horse.horse_id} style={[
                  styles.horseCard,
                  { marginTop: index === 0 ? 0 : 16 }
                ]}>
                  <TouchableOpacity 
                    style={styles.horseCardContent} 
                    onPress={() => handleHorseProfile(horse)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.horseHeader}>
                      <View style={styles.horseImageContainer}>
                        <Image
                          source={
                            horse.horse_image && !horse.horse_image.startsWith('file:///')
                              ? { uri: horse.horse_image }
                              : { uri: 'https://via.placeholder.com/80x80/f0f0f0/999999?text=Horse' }
                          }
                          style={styles.horseImage}
                        />
                        {/* <View style={styles.statusIndicator} /> */}
                      </View>
                      
                      <View style={styles.horseInfo}>
                        <Text style={styles.horseName}>{horse.horse_name}</Text>
                        <View style={styles.horseMetaRow}>
                          <View style={styles.horseMetaItem}>
                            <FontAwesome5 name="birthday-cake" size={12} color="#CD853F" />
                            <Text style={styles.horseMetaText}>Age {horse.horse_age}</Text>
                          </View>
                          <View style={styles.horseMetaItem}>
                            <FontAwesome5 name="dna" size={12} color="#CD853F" />
                            <Text style={styles.horseMetaText}>{horse.horse_breed}</Text>
                          </View>
                        </View>
                        <View style={styles.horseMetaRow}>
                          <View style={styles.horseMetaItem}>
                            <FontAwesome5 name="palette" size={12} color="#CD853F" />
                            <Text style={styles.horseMetaText}>{horse.horse_color}</Text>
                          </View>
                          <View style={styles.horseMetaItem}>
                            <FontAwesome5 name="venus-mars" size={12} color="#CD853F" />
                            <Text style={styles.horseMetaText}>{horse.horse_sex}</Text>
                          </View>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteHorse(horse.horse_id, horse.horse_name)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <FontAwesome5 name="trash-alt" size={16} color="#DC3545" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.actionSection}>
                      {/* <Text style={styles.actionSectionTitle}>Quick Actions</Text> */}
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.feedButton]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleFeed(horse.horse_name, horse.horse_id);
                          }}
                          activeOpacity={0.8}
                        >
                          <FontAwesome5 name="pagelines" size={16} color="#28A745" />
                          <Text style={[styles.actionButtonText, styles.feedButtonText]}>Feed</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[styles.actionButton, styles.waterButton]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleWater(horse.horse_name, horse.horse_id);
                          }}
                          activeOpacity={0.8}
                        >
                          <FontAwesome5 name="tint" size={16} color="#007BFF" />
                          <Text style={[styles.actionButtonText, styles.waterButtonText]}>Water</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>

      {/* Floating Add Button */}
      {horses.length > 0 && (
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => router.push('/HORSE_OPERATOR/addhorse')}
          activeOpacity={0.8}
        >
          <FontAwesome5 name="plus" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Bottom Navigation - UNCHANGED */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'home' && styles.activeNavItem]}
          onPress={() => {
            setActiveTab('home');
            router.push('/HORSE_OPERATOR/home');
          }}
        >
          <FontAwesome5 name="home" size={24} color={activeTab === 'home' ? '#CD853F' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'horse' && styles.activeNavItem]}
          onPress={() => {
            setActiveTab('horse');
            router.push('/HORSE_OPERATOR/horse');
          }}
        >
          <FontAwesome5 name="horse" size={24} color={activeTab === 'horse' ? '#CD853F' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'message' && styles.activeNavItem]}
          onPress={() => {
            setActiveTab('message');
            router.push('/HORSE_OPERATOR/Hmessage');
          }}
        >
          <FontAwesome5 name="comment-dots" size={24} color={activeTab === 'message' ? '#CD853F' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'calendar' && styles.activeNavItem]}
          onPress={() => {
            setActiveTab('calendar');
            router.push('/HORSE_OPERATOR/Hcalendar');
          }}
        >
          <FontAwesome5 name="calendar-alt" size={24} color={activeTab === 'calendar' ? '#CD853F' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'profile' && styles.activeNavItem]}
          onPress={() => {
            setActiveTab('profile');
            router.push('/HORSE_OPERATOR/profile');
          }}
        >
          <FontAwesome5 name="user" size={24} color={activeTab === 'profile' ? '#CD853F' : '#000'} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: "#F8F9FA" 
  },
  container: { 
    flex: 1, 
    backgroundColor: "#F8F9FA" 
  },
  
  // Header Styles
  header: { 
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerContent: {
    alignItems: "center",
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: "700", 
    color: "#2C3E50",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#6C757D",
    fontWeight: "500",
  },
  
  // Content Styles
  scrollContent: { 
    paddingBottom: 150 
  },
  content: { 
    paddingHorizontal: 20, 
    paddingTop: 24,
    paddingBottom: 100 
  },
  
  // Empty State Styles
  emptyState: { 
    alignItems: "center", 
    justifyContent: "center", 
    paddingVertical: 80, 
    paddingHorizontal: 40 
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F8F9FA",
    borderWidth: 2,
    borderColor: "#E9ECEF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyStateTitle: { 
    fontSize: 24, 
    fontWeight: "700", 
    color: "#2C3E50", 
    marginBottom: 12, 
    textAlign: "center" 
  },
  emptyStateText: { 
    fontSize: 16, 
    color: "#6C757D", 
    textAlign: "center", 
    lineHeight: 24, 
    marginBottom: 32,
    maxWidth: 280,
  },
  emptyStateButton: {
    backgroundColor: "#CD853F",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#CD853F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyStateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  
  // Horse Card Styles
  horseCard: { 
    backgroundColor: "#FFFFFF", 
    borderRadius: 16, 
    marginBottom: 16,
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 12, 
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F1F3F4",
  },
  horseCardContent: { 
    padding: 20,
  },
  horseHeader: {
    flexDirection: "row", 
    alignItems: "flex-start",
    marginBottom: 16,
  },
  horseImageContainer: {
    position: "relative",
    marginRight: 16,
  },
  horseImage: { 
    width: 80, 
    height: 80, 
    borderRadius: 16, 
    backgroundColor: "#F8F9FA",
    borderWidth: 2,
    borderColor: "#E9ECEF",
  },
  statusIndicator: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#28A745",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  horseInfo: { 
    flex: 1,
    paddingTop: 4,
  },
  horseName: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: "#2C3E50", 
    marginBottom: 8,
  },
  horseMetaRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  horseMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    flex: 1,
  },
  horseMetaText: {
    fontSize: 14,
    color: "#6C757D",
    marginLeft: 6,
    fontWeight: "500",
  },
  
  // Delete Button
  deleteButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: "#FFF5F5", 
    justifyContent: "center", 
    alignItems: "center", 
    borderWidth: 1,
    borderColor: "#FED7D7",
  },
  
  // Divider
  divider: {
    height: 1,
    backgroundColor: "#E9ECEF",
    marginBottom: 16,
  },
  
  // Action Section
  actionSection: {
    
  },
  actionSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 12,
  },
  actionButtons: { 
    flexDirection: "row",
    gap: 12,
  },
  actionButton: { 
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  feedButton: {
    backgroundColor: "#F8FFF8",
    borderColor: "#D4EDDA",
  },
  waterButton: {
    backgroundColor: "#F0F8FF",
    borderColor: "#CCE7FF",
  },
  actionButtonText: { 
    fontSize: 15, 
    fontWeight: "600",
    marginLeft: 8,
  },
  feedButtonText: {
    color: "#28A745",
  },
  waterButtonText: {
    color: "#007BFF",
  },
  
  // Add Button
  addButton: { 
    position: "absolute", 
    right: 24, 
    bottom: 100, 
    width: 56, 
    height: 56, 
    backgroundColor: "#CD853F", 
    borderRadius: 28, 
    justifyContent: "center", 
    alignItems: "center", 
    shadowColor: "#CD853F", 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 12, 
    elevation: 8,
  },
  
  // Bottom Navigation - UNCHANGED
  bottomNav: { 
    flexDirection: "row", 
    justifyContent: "space-around", 
    paddingVertical: 10, 
    backgroundColor: "#fff", 
    borderTopWidth: 1, 
    borderTopColor: "#ccc" 
  },
  navItem: { 
    alignItems: "center", 
    padding: 10 
  },
  activeNavItem: { 
    backgroundColor: "#f0e6dc", 
    borderRadius: 20 
  },
});

export default HorseScreen;