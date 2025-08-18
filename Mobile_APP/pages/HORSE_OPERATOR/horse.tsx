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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

interface Horse {
  id: string;
  name: string;
  age: string;
  dateOfBirth: string;
  sex: string;
  breed: string;
  color: string;
  height: string;
  weight: string;
  image: string | null;
  lastVetCheck: string;
  condition: string;
  conditionColor: string;
}

const HorseScreen = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('horse');
  const [horses, setHorses] = useState<Horse[]>([]);

  const getCurrentUser = async () => {
    try {
      const user = await AsyncStorage.getItem('current_user');
      if (user) return user;
    } catch (error) {
      console.error('Error getting current user:', error);
    }
    return null;
  };

  const deleteHorse = async (horseId: string, horseName: string) => {
    Alert.alert(
      'Delete Horse',
      `Are you sure you want to delete ${horseName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = await getCurrentUser();
              if (!user) return;
              const userHorsesKey = `horses_${user}`;
              const storedHorses = await AsyncStorage.getItem(userHorsesKey);
              if (storedHorses) {
                const horses: Horse[] = JSON.parse(storedHorses);
                const updatedHorses = horses.filter(horse => horse.id !== horseId);
                await AsyncStorage.setItem(userHorsesKey, JSON.stringify(updatedHorses));
                setHorses(updatedHorses);

                const feedingScheduleKey = `feedingSchedule_${user}_${horseId}`;
                await AsyncStorage.removeItem(feedingScheduleKey);
              }
            } catch (error) {
              console.error('Error deleting horse:', error);
              Alert.alert('Error', 'Failed to delete horse. Please try again.');
            }
          },
        },
      ]
    );
  };

  useFocusEffect(
    useCallback(() => {
      const loadHorsesOnFocus = async () => {
        try {
          const user = await getCurrentUser();
          if (!user) {
            router.replace('/Login');
            return;
          }
          const userHorsesKey = `horses_${user}`;
          const storedHorses = await AsyncStorage.getItem(userHorsesKey);
          if (storedHorses) {
            const parsedHorses: Horse[] = JSON.parse(storedHorses);
            const horsesWithImages = parsedHorses.map(horse => ({
              ...horse,
              image: horse.image || null,
            }));
            setHorses(horsesWithImages);
          } else {
            setHorses([]);
          }
        } catch (error) {
          console.error('Error loading horses:', error);
          setHorses([]);
        }
      };
      loadHorsesOnFocus();
    }, [router])
  );

  const handleFeed = (horseName: string, horseId: string) => {
    router.push({ pathname: '/feed', params: { horseName, horseId } });
  };

  const handleWater = (horseName: string, horseId: string) => {
    router.push({ pathname: '/water', params: { horseName, horseId } });
  };

  const handleHorseProfile = (horse: Horse) => {
    const horseDataToPass = { ...horse, image: horse.image };
    router.push({
      pathname: '/horseprofile',
      params: { id: horse.id, horseData: JSON.stringify(horseDataToPass) },
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
                <View key={horse.id} style={styles.horseCard}>
                  <TouchableOpacity style={styles.horseCardContent} onPress={() => handleHorseProfile(horse)}>
                    <View style={styles.horseInfo}>
                      <Image
                        source={
                          horse.image
                            ? { uri: horse.image }
                            : { uri: 'https://via.placeholder.com/80x80/f0f0f0/999999?text=Horse' }
                        }
                        style={styles.horseImage}
                        onError={(error) => console.log('Image load error:', error)}
                        loadingIndicatorSource={{
                          uri: 'https://via.placeholder.com/80x80/f0f0f0/999999?text=Loading',
                        }}
                      />
                      <View style={styles.horseDetails}>
                        <Text style={styles.horseName}>{horse.name}</Text>
                        <Text style={styles.lastVetCheck}>Last Vet Check: {horse.lastVetCheck}</Text>
                        <Text style={[styles.condition, { color: horse.conditionColor }]}>
                          Condition: {horse.condition}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleFeed(horse.name, horse.id);
                        }}
                      >
                        <Text style={styles.actionButtonText}>Feed</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleWater(horse.name, horse.id);
                        }}
                      >
                        <Text style={styles.actionButtonText}>Water</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteHorse(horse.id, horse.name)}
                  >
                    <FontAwesome5 name="trash" size={16} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>

      <TouchableOpacity style={styles.addButton} onPress={() => router.push('/addhorse')}>
        <Text style={styles.addButtonIcon}>+</Text>
      </TouchableOpacity>

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'home' && styles.activeNavItem]}
          onPress={() => {
            setActiveTab('home');
            router.push('/home');
          }}
        >
          <FontAwesome5 name="home" size={24} color={activeTab === 'home' ? '#CD853F' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'horse' && styles.activeNavItem]}
          onPress={() => {
            setActiveTab('horse');
            router.push('/horse');
          }}
        >
          <FontAwesome5 name="horse" size={24} color={activeTab === 'horse' ? '#CD853F' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'message' && styles.activeNavItem]}
          onPress={() => {
            setActiveTab('message');
            router.push('/message');
          }}
        >
          <FontAwesome5 name="comment-dots" size={24} color={activeTab === 'message' ? '#CD853F' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'calendar' && styles.activeNavItem]}
          onPress={() => {
            setActiveTab('calendar');
            router.push('/calendar');
          }}
        >
          <FontAwesome5 name="calendar-alt" size={24} color={activeTab === 'calendar' ? '#CD853F' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'profile' && styles.activeNavItem]}
          onPress={() => {
            setActiveTab('profile');
            router.push('/profile');
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
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  horseCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  horseCardContent: {
    flex: 1,
  },
  horseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  horseImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    marginRight: 15,
  },
  horseDetails: {
    flex: 1,
  },
  horseName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  lastVetCheck: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  condition: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 60,
    height: 60,
    backgroundColor: '#CD853F',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  addButtonIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },
  navItem: {
    alignItems: 'center',
    padding: 10,
  },
  activeNavItem: {
    backgroundColor: '#f0e6dc',
    borderRadius: 20,
  },
  deleteButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default HorseScreen;
