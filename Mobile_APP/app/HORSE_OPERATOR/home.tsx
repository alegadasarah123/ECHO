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

const HomeScreen = () => {
  const [searchText, setSearchText] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(7);
  const [comments, setComments] = useState([
    { id: '1', user: 'Vet', text: 'Routine check complete.' },
    { id: '2', user: 'Martin', text: 'Thanks, noted.' },
  ]);
  const [commentInput, setCommentInput] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [userName, setUserName] = useState('User');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Check if user is logged in
        const isLoggedIn = await AsyncStorage.getItem('user_logged_in');
        if (!isLoggedIn) {
          router.replace('../../pages/auth/login');
          return;
        }
        // Load current user data
        const currentUserData = await AsyncStorage.getItem('current_user_data');
        if (currentUserData) {
          const user = JSON.parse(currentUserData);
          setUserName(user.firstName || 'User');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    loadUserData();
  }, [router]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.brownBackground}>
        <ScrollView contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.welcomeSection}>
                <Text style={styles.welcomeText}>Welcome,</Text>
                <Text style={styles.nameText}>{userName}</Text>
              </View>
              <View style={styles.headerIcons}>
                <TouchableOpacity style={styles.iconButton}>
                  <Text style={styles.icon}>🔔</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search..."
                value={searchText}
                onChangeText={setSearchText}
              />
              <TouchableOpacity style={styles.searchIcon}>
                <Text style={styles.searchIconText}>🔍</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.contentWrapper}>
            <View style={styles.content}>
              <View style={styles.healthCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Horse Health Status</Text>
                  <TouchableOpacity onPress={() => router.push('/horse')}>
                    <Text style={styles.viewAllButton}>View All</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.horseInfo}>
                  <Image
                    source={{ uri: '/placeholder.svg?height=120&width=120' }}
                    style={styles.horseImage}
                  />
                  <View style={styles.horseDetails}>
                    <Text style={styles.horseName}>Name: Oscar</Text>
                    <Text style={styles.horseStatus}>Health Status: Healthy</Text>
                    <Text style={styles.healthCheck}>Last Health Check: March 30, 2025</Text>
                    <Text style={styles.date}>Next Appointment: No Appointment Scheduled</Text>
                  </View>
                </View>
              </View>
              <View style={{ paddingHorizontal: 0 }}>
                <View style={styles.divider} />
              </View>
              <View style={styles.activitiesSection}>
                <Text style={styles.sectionTitle}>Recent Activities</Text>
                <View style={styles.activityCard}>
                  <View style={styles.activityHeader}>
                    <View style={styles.activityIcon}>
                      <Text style={styles.activityIconText}>🏥</Text>
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityTitle}>
                        Department of Veterinary Medicine and Infectious Diseases
                      </Text>
                      <Text style={styles.activityTime}>2h</Text>
                    </View>
                  </View>
                  <Text style={styles.activityDescription}>
                    We like to inform you that we have just completed our routine health check for your horse Oscar.
                  </Text>
                  <Text style={styles.activityDetails}>
                    {'• Comprehensive Health Check (Total: 1hr)\n'}
                    {'• Vaccination\n'}
                    {'• Blood work and laboratory tests\n'}
                    • Dental examination and care
                  </Text>
                  <View style={styles.activityFooter}>
                    <View style={styles.activityActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                          setLiked(!liked);
                          setLikeCount(prev => liked ? prev - 1 : prev + 1);
                        }}
                      >
                        <FontAwesome5
                          name="heart"
                          solid={liked}
                          size={18}
                          color={liked ? 'red' : '#333'}
                          style={styles.heartIcon}
                        />
                        <Text style={styles.actionCount}>{likeCount}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButton} onPress={() => setShowComments(true)}>
                        <Text style={styles.commentIcon}>💬</Text>
                        <Text style={styles.actionCount}>{comments.length}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButton}>
                        <Text style={styles.shareIcon}>📤</Text>
                        <Text style={styles.actionCount}>200</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
      {/* Floating SOS Button */}
      <TouchableOpacity
        style={styles.sosButton}
        onPress={() => router.push('/sos')}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <FontAwesome5 name="ambulance" size={18} color="#fff" style={{ marginRight: 10 }} />
          <Text style={styles.sosText}>SOS</Text>
        </View>
      </TouchableOpacity>
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
      {/* Comment Modal */}
      {showComments && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Comments</Text>
            <ScrollView style={styles.commentList}>
              {comments.map((item) => (
                <View key={item.id} style={styles.commentItem}>
                  <Text style={styles.commentUser}>{item.user}:</Text>
                  <Text style={styles.commentText}>{item.text}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment..."
                value={commentInput}
                onChangeText={setCommentInput}
              />
              <TouchableOpacity
                onPress={() => {
                  if (commentInput.trim()) {
                    setComments(prev => [
                      ...prev,
                      { id: Date.now().toString(), user: 'You', text: commentInput }
                    ]);
                    setCommentInput('');
                  }
                }}
              >
                <Text style={styles.sendButton}>Send</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setShowComments(false)} style={styles.closeModalBtn}>
              <Text style={styles.closeModalText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    paddingTop: 30,
    paddingBottom: 20,
  },
  contentWrapper: {
    height: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    marginTop: 80,
    paddingTop: 10,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: '#000',
    opacity: 0.9,
    fontWeight: 'bold',
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 15,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  searchIcon: {
    padding: 5,
  },
  searchIconText: {
    fontSize: 18,
    color: '#8B4513',
  },
  healthCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
    marginTop: -110,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllButton: {
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '500',
  },
  horseInfo: {
    flexDirection: 'row',
    gap: 15,
  },
  horseImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  horseDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  horseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  horseStatus: {
    fontSize: 14,
    color: '#28A745',
    marginBottom: 5,
    fontWeight: 'bold',
  },
  healthCheck: {
    fontSize: 14,
    color: '#000',
    marginBottom: 3,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 14,
    color: '#000',
    marginBottom: 3,
    fontWeight: 'bold',
  },
  activitiesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  activityIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  activityIconText: {
    fontSize: 20,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
  activityDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 10,
  },
  activityDetails: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15,
  },
  activityFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  activityActions: {
    flexDirection: 'row',
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heartIcon: {
    fontSize: 16,
  },
  commentIcon: {
    fontSize: 16,
  },
  shareIcon: {
    fontSize: 16,
  },
  actionCount: {
    fontSize: 14,
    color: '#666',
  },
  sosButton: {
    position: 'absolute',
    right: 0,
    bottom: 90,
    backgroundColor: '#DC3545',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    shadowColor: '#DC3545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  sosText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
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
  navIcon: {
    fontSize: 24,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 15,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modalBox: {
    width: '90%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  commentList: {
    maxHeight: 200,
    marginBottom: 10,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  commentUser: {
    fontWeight: 'bold',
    marginRight: 5,
  },
  commentText: {
    flexShrink: 1,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#8B4513',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    color: '#fff',
  },
  closeModalBtn: {
    marginTop: 10,
    alignSelf: 'center',
  },
  closeModalText: {
    color: '#8B4513',
    fontWeight: 'bold',
  },
});

export default HomeScreen;
