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
import { useRouter, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

interface ChatMessage {
  id: string;
  name: string;
  avatar: string;
  message: string;
  time: string;
  unread: boolean;
}

const API_BASE_URL = "http://172.20.10.2:8000/api/horse_operator";

const MessageScreen = () => {
  const [searchText, setSearchText] = useState('');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('message');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

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

  // Load conversations from backend
  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      let uid = userId;
      
      if (!uid) {
        uid = await loadUserId();
        if (!uid) {
          console.log('No user logged in, redirecting to Login.');
          router.replace('/auth/login');
          return;
        }
      }

      const response = await fetch(`${API_BASE_URL}/get_conversations/?user_id=${encodeURIComponent(uid)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load conversations: ${response.status}`);
      }

      const data = await response.json();
      console.log('Loaded conversations from backend:', data.length);
      
      // If no conversations exist, add default AI Assistant
      let messagesList = Array.isArray(data) ? data : [];
      
      if (messagesList.length === 0) {
        messagesList = [
          {
            id: 'ai_assistant',
            name: 'AI Assistant',
            avatar: '/ai-robot-assistant.png',
            message: 'How can I help you today?',
            time: 'Now',
            unread: false,
          },
        ];
      }

      console.log('Setting messages state with:', messagesList.length, 'conversations');
      setMessages(messagesList);
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load conversations. Please check your connection.');
      
      // Fallback to AI Assistant only
      setMessages([
        {
          id: 'ai_assistant',
          name: 'AI Assistant',
          avatar: '/ai-robot-assistant.png',
          message: 'How can I help you today?',
          time: 'Now',
          unread: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [userId, router, loadUserId]);

  const deleteMessage = async (messageId: string, contactName: string) => {
    try {
      const user = await loadUserId();
      if (!user) {
        console.log('No user logged in, cannot delete conversations.');
        return;
      }

      // Remove from local state immediately for better UX
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));

      // TODO: Add backend API call to delete conversation if needed
      console.log(`Deleted conversation with ${contactName} for user: ${user}`);
      
      Alert.alert('Success', 'Conversation deleted successfully.');
    } catch (error) {
      console.error('Error deleting message:', error);
      Alert.alert('Error', 'Failed to delete conversation.');
    }
  };

  const handleLongPress = (messageId: string, contactName: string) => {
    Alert.alert(
      'Delete Conversation',
      `Do you want to delete the entire conversation with ${contactName}? This will permanently delete all messages.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMessage(messageId, contactName),
        },
      ]
    );
  };

  // Load messages on initial component mount
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Use useFocusEffect to reload messages when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadMessages();
    }, [loadMessages])
  );

  const handleMessagePress = async (messageId: string, contactName: string, contactAvatar: string) => {
    const user = await loadUserId();
    if (!user) {
      console.log('No user logged in, cannot open chat.');
      router.replace('/auth/login');
      return;
    }
    
    // Navigate to individual chat screen
    router.push({
      pathname: '/HORSE_OPERATOR/Hchat',
      params: {
        contactId: messageId,
        contactName: contactName,
        contactAvatar: contactAvatar,
        userId: user,
      },
    });
  };

  const filteredMessages = messages.filter(message =>
    message.name.toLowerCase().includes(searchText.toLowerCase()) ||
    message.message.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.brownBackground}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Messages</Text>
            <TouchableOpacity
              style={styles.searchIconButton}
              onPress={() => router.push('/HORSE_OPERATOR/Hcontact')}
            >
              <FontAwesome5 name="users" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Content */}
        <View style={styles.contentWrapper}>
          <View style={styles.content}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <FontAwesome5 name="search" size={16} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search messages..."
                value={searchText}
                onChangeText={setSearchText}
                placeholderTextColor="#999"
              />
            </View>
            
            {/* Messages List */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#CD853F" />
                <Text style={styles.loadingText}>Loading conversations...</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.messagesList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
              >
                {filteredMessages.map((message) => (
                  <TouchableOpacity
                    key={message.id}
                    style={styles.messageItem}
                    onPress={() => handleMessagePress(message.id, message.name, message.avatar)}
                    onLongPress={() => handleLongPress(message.id, message.name)}
                  >
                    <View style={styles.avatarContainer}>
                      <Image
                        source={{ uri: message.avatar }}
                        style={styles.avatar}
                      />
                      {message.unread && <View style={styles.unreadDot} />}
                    </View>

                    <View style={styles.messageContent}>
                      <View style={styles.messageHeader}>
                        <Text style={[
                          styles.contactName,
                          message.unread && styles.unreadText
                        ]}>
                          {message.name}
                        </Text>
                        <Text style={[
                          styles.messageTime,
                          message.unread && styles.unreadTime
                        ]}>
                          {message.time}
                        </Text>
                      </View>
                      <Text style={[
                        styles.messagePreview,
                        message.unread && styles.unreadPreview
                      ]} numberOfLines={1}>
                        {message.message}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
                
                {filteredMessages.length === 0 && !loading && (
                  <View style={styles.emptyContainer}>
                    <FontAwesome5 name="comment-dots" size={60} color="#ccc" />
                    <Text style={styles.emptyTitle}>No conversations</Text>
                    <Text style={styles.emptyText}>
                      Start a conversation with a veterinarian to see it here.
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </View>
      
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
  safeArea: {
    flex: 1,
    backgroundColor: '#CD853F',
  },
  brownBackground: {
    flex: 1,
    backgroundColor: '#CD853F',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 5,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchIconButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: 10,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
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
  messagesList: {
    flex: 1,
  },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 5,
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
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    backgroundColor: '#CD853F',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
  },
  messagePreview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  unreadText: {
    fontWeight: 'bold',
    color: '#000',
  },
  unreadTime: {
    color: '#CD853F',
    fontWeight: '600',
  },
  unreadPreview: {
    color: '#333',
    fontWeight: '500',
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
});

export default MessageScreen;