import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

interface Veterinarian {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  avatar?: string;
  specialization?: string;
  isOnline?: boolean;
}

interface Contact {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
  specialization?: string;
}

const API_BASE_URL = "http://172.20.10.2:8000/api/horse_operator";

const ContactScreen = () => {
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('recent');
  const [veterinarians, setVeterinarians] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  // Default recent contacts (static data)
  const [recentContacts] = useState<Contact[]>([
    {
      id: 'ai_assistant',
      name: 'AI Assistant',
      avatar: '/ai-robot-assistant.png',
      isOnline: true,
    },
  ]);

  // Load user ID from SecureStore
  const loadUserId = useCallback(async () => {
    try {
      const userData = await SecureStore.getItemAsync("user_data");
      if (userData) {
        const parsed = JSON.parse(userData);
        const id = parsed.user_id || parsed.id;
        setUserId(id);
        return id;
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
    return null;
  }, []);

  // Fetch veterinarians from backend
  const fetchVeterinarians = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/get_veterinarians/`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch veterinarians: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched veterinarians:', data);
      
      // Transform the data to match our Contact interface
      const transformedVets = Array.isArray(data) ? data.map((vet: Veterinarian) => ({
        id: vet.id,
        name: `Dr. ${vet.first_name} ${vet.last_name}`,
        avatar: vet.avatar || '/placeholder-doctor.png',
        isOnline: Math.random() > 0.5, // Random online status for demo
        specialization: vet.specialization,
      })) : [];

      setVeterinarians(transformedVets);
    } catch (error) {
      console.error('Error fetching veterinarians:', error);
      Alert.alert('Error', 'Failed to load veterinarians. Please check your connection.');
      setVeterinarians([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const uid = await loadUserId();
      if (!uid) {
        router.replace('/auth/login');
        return;
      }
      await fetchVeterinarians();
    };

    loadData();
  }, [router, loadUserId, fetchVeterinarians]);

  const handleBack = () => {
    router.back();
  };

  const handleContactPress = async (contactId: string, contactName: string, contactAvatar: string) => {
    try {
      if (!userId) {
        router.replace('/auth/login');
        return;
      }

      // Navigate to chat with selected contact
      router.push({
        pathname: '/HORSE_OPERATOR/Hchat',
        params: {
          contactId: contactId,
          contactName: contactName,
          contactAvatar: contactAvatar,
          userId,
        },
      });
    } catch (error) {
      console.error('Error opening chat:', error);
      Alert.alert('Error', 'Failed to open chat.');
    }
  };

  const getCurrentContacts = () => {
    return activeTab === 'recent' ? recentContacts : veterinarians;
  };

  const filteredContacts = getCurrentContacts().filter(contact =>
    contact.name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <FontAwesome5 name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor="#999"
            />
            <TouchableOpacity style={styles.searchButton}>
              <FontAwesome5 name="search" size={16} color="#CD853F" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentWrapper}>
          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'recent' && styles.activeTabButton
              ]}
              onPress={() => setActiveTab('recent')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'recent' && styles.activeTabText
              ]}>
                Recent Contacts
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'all' && styles.activeTabButton
              ]}
              onPress={() => setActiveTab('all')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'all' && styles.activeTabText
              ]}>
                All Veterinarians
              </Text>
            </TouchableOpacity>
          </View>

          {/* Contacts List */}
          <ScrollView 
            style={styles.contactsList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {loading && activeTab === 'all' ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#CD853F" />
                <Text style={styles.loadingText}>Loading veterinarians...</Text>
              </View>
            ) : filteredContacts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <FontAwesome5 name="user-md" size={60} color="#ccc" />
                <Text style={styles.emptyTitle}>No contacts found</Text>
                <Text style={styles.emptyText}>
                  {activeTab === 'recent' 
                    ? 'Start a conversation with a veterinarian to see them here.' 
                    : searchText 
                      ? 'No veterinarians match your search.'
                      : 'No veterinarians available at the moment.'
                  }
                </Text>
              </View>
            ) : (
              filteredContacts.map((contact) => (
                <TouchableOpacity
                  key={contact.id}
                  style={styles.contactItem}
                  onPress={() => handleContactPress(contact.id, contact.name, contact.avatar)}
                >
                  <View style={styles.avatarContainer}>
                    <Image
                      source={{ uri: contact.avatar }}
                      style={styles.avatar}
                    />
                    {contact.isOnline && <View style={styles.onlineIndicator} />}
                  </View>
                  
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    {contact.specialization && (
                      <Text style={styles.contactSpecialization}>{contact.specialization}</Text>
                    )}
                    <Text style={styles.contactStatus}>
                      {contact.isOnline ? 'Online' : 'Offline'}
                    </Text>
                  </View>

                  <TouchableOpacity 
                    style={styles.messageButton}
                    onPress={() => handleContactPress(contact.id, contact.name, contact.avatar)}
                  >
                    <FontAwesome5 name="comment" size={18} color="#CD853F" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {/* Refresh Button */}
          {activeTab === 'all' && (
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={fetchVeterinarians}
              disabled={loading}
            >
              <FontAwesome5 
                name="sync-alt" 
                size={16} 
                color="#fff" 
                style={{ marginRight: 8 }} 
              />
              <Text style={styles.refreshButtonText}>
                {loading ? 'Refreshing...' : 'Refresh'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#CD853F',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#CD853F',
    paddingTop: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 15,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  searchButton: {
    padding: 5,
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 5,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: '#CD853F',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  contactsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    backgroundColor: '#28A745',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  contactSpecialization: {
    fontSize: 13,
    color: '#CD853F',
    fontWeight: '500',
    marginBottom: 2,
  },
  contactStatus: {
    fontSize: 12,
    color: '#666',
  },
  messageButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#CD853F',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ContactScreen;