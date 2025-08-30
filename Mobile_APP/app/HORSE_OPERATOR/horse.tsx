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
const API_BASE_URL = "http://192.168.101.2:8000/api/horse_operator";

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
      <FontAwesome5 name="horse" size={80} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No Horses Added Yet</Text>
      <Text style={styles.emptyStateText}>
        Start by adding your first horse to keep track of their health and care.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>My Horses</Text>
          </View>

          <View style={styles.content}>
            {horses.length === 0 ? (
              <EmptyState />
            ) : (
              horses.map(horse => (
                <View key={horse.horse_id} style={styles.horseCard}>
                  <TouchableOpacity style={styles.horseCardContent} onPress={() => handleHorseProfile(horse)}>
                    <View style={styles.horseInfo}>
                      <Image
                        source={
                          horse.horse_image && !horse.horse_image.startsWith('file:///')
                            ? { uri: horse.horse_image }
                            : { uri: 'https://via.placeholder.com/80x80/f0f0f0/999999?text=Horse' }
                        }
                        style={styles.horseImage}
                      />
                      <View style={styles.horseDetails}>
                        <Text style={styles.horseName}>{horse.horse_name}</Text>
                        <Text style={styles.lastVetCheck}>Age: {horse.horse_age}</Text>
                        <Text style={styles.condition}>Breed: {horse.horse_breed}</Text>
                      </View>
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleFeed(horse.horse_name, horse.horse_id);
                        }}
                      >
                        <Text style={styles.actionButtonText}>Feed</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleWater(horse.horse_name, horse.horse_id);
                        }}
                      >
                        <Text style={styles.actionButtonText}>Water</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteHorse(horse.horse_id, horse.horse_name)}
                  >
                    <FontAwesome5 name="trash" size={16} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.addButton} onPress={() => router.push('/HORSE_OPERATOR/addhorse')}>
        <Text style={styles.addButtonIcon}>+</Text>
      </TouchableOpacity>

      {/* Bottom Navigation */}
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
  safeArea: { flex: 1, backgroundColor: "#f5f5f5" },
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30, alignItems: "center" },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#333" },
  content: { paddingHorizontal: 20, paddingBottom: 100 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 40 },
  emptyStateTitle: { fontSize: 24, fontWeight: "bold", color: "#333", marginTop: 20, marginBottom: 10, textAlign: "center" },
  emptyStateText: { fontSize: 16, color: "#666", textAlign: "center", lineHeight: 24, marginBottom: 30 },
  horseCard: { backgroundColor: "#fff", borderRadius: 15, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  horseCardContent: { flex: 1 },
  horseInfo: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  horseImage: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#f0f0f0", marginRight: 15 },
  horseDetails: { flex: 1 },
  horseName: { fontSize: 20, fontWeight: "bold", color: "#333", marginBottom: 5 },
  lastVetCheck: { fontSize: 14, color: "#666", marginBottom: 3 },
  condition: { fontSize: 14, fontWeight: "600" },
  actionButtons: { flexDirection: "row", justifyContent: "space-around" },
  actionButton: { backgroundColor: "#f0f0f0", paddingHorizontal: 30, paddingVertical: 10, borderRadius: 20, minWidth: 80, alignItems: "center" },
  actionButtonText: { fontSize: 14, color: "#333", fontWeight: "500" },
  addButton: { position: "absolute", right: 20, bottom: 90, width: 60, height: 60, backgroundColor: "#CD853F", borderRadius: 30, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  addButtonIcon: { fontSize: 24, color: "#fff", fontWeight: "bold" },
  bottomNav: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 10, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#ccc" },
  navItem: { alignItems: "center", padding: 10 },
  activeNavItem: { backgroundColor: "#f0e6dc", borderRadius: 20 },
  deleteButton: { position: "absolute", top: 15, right: 15, width: 32, height: 32, borderRadius: 16, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
});

export default HorseScreen;