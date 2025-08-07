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
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ChatMessage {
  id: string;
  name: string;
  avatar: string;
  message: string;
  time: string;
  unread: boolean;
}

const MessageScreen = () => {
  const [searchText, setSearchText] = useState('');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('message');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Helper to get the current logged-in user
  const getCurrentUser = async () => {
    try {
      const user = await AsyncStorage.getItem('current_user');
      if (user) return user;
    } catch (error) {
      console.error('Error getting current user:', error);
    }
    return null;
  };

  // Wrap loadMessages in useCallback to make it a stable function reference
  const loadMessages = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.log('No user logged in, redirecting to Login.');
        router.replace('/Login');
        return;
      }

      const userMessagesKey = `chat_messages_${user}`;
      console.log(`Loading messages for user: ${user} from key: ${userMessagesKey}`);
      const savedMessages = await AsyncStorage.getItem(userMessagesKey);
      let messagesList: ChatMessage[] = [];

      if (savedMessages) {
        messagesList = JSON.parse(savedMessages);
        console.log('Loaded messages from storage:', messagesList.length);
      }

      // If no saved messages for this user, use the default initial messages
      if (messagesList.length === 0) {
        messagesList = [
          {
            id: '1',
            name: 'Dr. Maria Santos',
            avatar: '/doctor-woman.png',
            message: 'You: Maayo na siya, Doc wala na\'y limp ...',
            time: '9:40 AM',
            unread: false,
          },
          {
            id: '2',
            name: 'DVMF Cebu Officer',
            avatar: '/dvmf-cebu-officer.png',
            message: 'Reminder: Your appointment has been ...',
            time: '1:30 PM',
            unread: true,
          },
          {
            id: '3',
            name: 'Dr. Sarah Yap',
            avatar: '/asian-woman-doctor.png',
            message: 'You: Daghang Salamat Doc!',
            time: 'Yesterday',
            unread: false,
          },
          {
            id: '4',
            name: 'AI Assistant',
            avatar: '/ai-robot-assistant.png',
            message: 'How can I help you today?',
            time: 'Yesterday',
            unread: false,
          },
        ];

        // Save the initial messages to AsyncStorage for the current user
        await AsyncStorage.setItem(userMessagesKey, JSON.stringify(messagesList));
        console.log('Saved default messages to storage for user:', user);
      }

      console.log('Setting messages state with:', messagesList.length, 'messages');
      setMessages(messagesList);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [router]); // loadMessages depends on router for redirection

  const deleteMessage = async (messageId: string, contactName: string) => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.log('No user logged in, cannot delete messages.');
        return;
      }

      const userMessagesKey = `chat_messages_${user}`;
      const savedMessages = await AsyncStorage.getItem(userMessagesKey);
      if (savedMessages) {
        let messagesList: ChatMessage[] = JSON.parse(savedMessages);

        // Remove the message with the specified ID
        messagesList = messagesList.filter(msg => msg.id !== messageId);

        // Save updated messages list
        await AsyncStorage.setItem(userMessagesKey, JSON.stringify(messagesList));

        // IMPORTANT: Also delete the individual chat messages for this contact
        // Make the individual chat key user-specific to avoid data leakage between users
        const chatKey = `chat_${user}_${messageId}`;
        await AsyncStorage.removeItem(chatKey);
        console.log(`Deleted individual chat messages for ${contactName} with key: ${chatKey}`);

        // Update the local state
        setMessages(messagesList);
        console.log(`Deleted conversation with ${contactName} for user: ${user}`);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
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
  }, [loadMessages]); // Now correctly depends on loadMessages

  // Use useFocusEffect to reload messages when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadMessages();
    }, [loadMessages]) // Now correctly depends on loadMessages
  );

  const handleMessagePress = async (messageId: string, contactName: string, contactAvatar: string) => {
    const user = await getCurrentUser();
    if (!user) {
      console.log('No user logged in, cannot open chat.');
      router.replace('/Login');
      return;
    }
    // Navigate to individual chat screen with contact info and a user-specific chat key
    router.push({
      pathname: '/chat',
      params: {
        contactId: messageId,
        contactName: contactName,
        contactAvatar: contactAvatar,
        chatKey: `chat_${user}_${messageId}`, // Pass the user-specific chat key
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
              onPress={() => router.push('/contact')}
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
            </ScrollView>
          </View>
        </View>
      </View>
      {/* Bottom Navigation */}
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
