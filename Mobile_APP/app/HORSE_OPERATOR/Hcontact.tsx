import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ContactScreen = () => {
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('recent');
  const router = useRouter();

  // Sample contacts data
  const [recentContacts] = useState([
    {
      id: '1',
      name: 'Dr. Maria Santos',
      avatar: '/doctor-woman.png',
      isOnline: true,
    },
    {
      id: '2',
      name: 'DVMF Cebu Officer',
      avatar: '/placeholder-e88n1.png',
      isOnline: false,
    },
    {
      id: '3',
      name: 'Dr. Sarah Yap',
      avatar: '/asian-woman-doctor.png',
      isOnline: true,
    },
  ]);

  const [allVeterinarians] = useState([
    {
      id: '1',
      name: 'Dr. Maria Santos',
      avatar: '/doctor-woman.png',
      isOnline: true,
    },
    {
      id: '3',
      name: 'Dr. Sarah Yap',
      avatar: '/asian-woman-doctor.png',
      isOnline: true,
    },
    {
      id: '5',
      name: 'Dr. John Cruz',
      avatar: '/male-doctor.png',
      isOnline: false,
    },
    {
      id: '6',
      name: 'Dr. Ana Reyes',
      avatar: '/female-veterinarian.png',
      isOnline: true,
    },
  ]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Check if user is logged in
        const isLoggedIn = await AsyncStorage.getItem('user_logged_in');
        if (!isLoggedIn) {
          router.replace('/Login');
          return;
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, [router]);

  const handleBack = () => {
    router.back();
  };

  const handleContactPress = (contactId: string, contactName: string, contactAvatar: string) => {
    // Navigate to chat with selected contact
    router.push({
      pathname: '/chat',
      params: {
        contactId: contactId,
        contactName: contactName,
        contactAvatar: contactAvatar,
      },
    });
  };

  const getCurrentContacts = () => {
    return activeTab === 'recent' ? recentContacts : allVeterinarians;
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
                All Veterinarian
              </Text>
            </TouchableOpacity>
          </View>

          {/* Contacts List */}
          <ScrollView 
            style={styles.contactsList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {filteredContacts.map((contact) => (
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
                </View>

                <TouchableOpacity 
                  style={styles.messageButton}
                  onPress={() => handleContactPress(contact.id, contact.name, contact.avatar)}
                >
                  <FontAwesome5 name="comment" size={18} color="#CD853F" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
  },
  messageButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
});

export default ContactScreen;
