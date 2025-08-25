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
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

// Backend API configuration
// const API_BASE_URL = "http://192.168.101.2:8000/api/horse_operator";

// User data interface
interface UserData {
  id: string;
  email: string;
  profile?: {
    operator_id: string;
    operator_fname?: string;
    operator_lname?: string;
    operator_mname?: string;
    operator_username?: string;
    operator_phone_num?: string;
    operator_email?: string;
    operator_role?: string;
    [key: string]: any;
  };
  access_token: string;
  refresh_token?: string;
  user_status?: string;
  user_role: string;
}

// Comment interface
interface Comment {
  id: string;
  user: string;
  text: string;
  time: string;
}

// Reaction types
interface Reaction {
  type: 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';
  emoji: string;
  color: string;
  label: string;
}

interface UserReaction {
  userId: string;
  type: Reaction['type'];
}

const REACTIONS: Reaction[] = [
  { type: 'like', emoji: '👍', color: '#1877F2', label: 'Like' },
  { type: 'love', emoji: '❤️', color: '#E2264D', label: 'Love' },
  { type: 'haha', emoji: '😂', color: '#FFD93D', label: 'Haha' },
  { type: 'wow', emoji: '😮', color: '#FFD93D', label: 'Wow' },
  { type: 'sad', emoji: '😢', color: '#FFD93D', label: 'Sad' },
  { type: 'angry', emoji: '😡', color: '#F25268', label: 'Angry' },
];

const HorseOperatorHome = () => {
  const [searchText, setSearchText] = useState('');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState('Horse Operator');
  
  // Reaction states
  const [reactions, setReactions] = useState<UserReaction[]>([
    { userId: 'user1', type: 'like' },
    { userId: 'user2', type: 'love' },
    { userId: 'user3', type: 'like' },
    { userId: 'user4', type: 'haha' },
  ]);
  const [userReaction, setUserReaction] = useState<Reaction['type'] | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactionPickerPosition, setReactionPickerPosition] = useState({ x: 0, y: 0 });

  // Comment states
  const [comments, setComments] = useState<Comment[]>([
    {
      id: "1",
      user: "Dr. Maria Santos",
      text: "Excellent work by the team! The horses are in great condition and ready for service.",
      time: "1 hour ago",
    },
    {
      id: "2",
      user: "Juan Dela Cruz",
      text: "Thank you for the detailed health report. Thunder looks amazing!",
      time: "2 hours ago",
    },
  ]);
  const [newComment, setNewComment] = useState('');
  const [showCommentModal, setShowCommentModal] = useState(false);

  const router = useRouter();
  const [activeTab, setActiveTab] = useState('home');

  // Validate authentication token
  const validateAuthToken = async (token: string): Promise<boolean> => {
    try {
      // You can add a backend endpoint to validate token
      // For now, we'll assume token is valid if it exists
      return token.length > 0;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

  // Load user data from SecureStore
  const loadUserData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get the stored authentication data from SecureStore
      const storedUserData = await SecureStore.getItemAsync('user_data');
      const storedAccessToken = await SecureStore.getItemAsync('access_token');
      
      console.log('Loading user data...');
      console.log('Has stored user data:', !!storedUserData);
      console.log('Has stored access token:', !!storedAccessToken);
      
      if (storedUserData && storedAccessToken) {
        const parsedUserData = JSON.parse(storedUserData);
        
        // Validate token
        const isValidToken = await validateAuthToken(storedAccessToken);
        if (!isValidToken) {
          throw new Error('Invalid token');
        }

        // Verify user role - should be horse_operator
        if (parsedUserData.user_role !== 'horse_operator') {
          console.log('⚠️ Warning: User role mismatch. Expected: horse_operator, Got:', parsedUserData.user_role);
          // Redirect to correct dashboard based on role
          if (parsedUserData.user_role === 'kutsero') {
            router.replace('/KUTSERO/dashboard' as any);
            return;
          }
        }

        // Create a unified user data structure
        const unifiedUserData: UserData = {
          id: parsedUserData.id,
          email: parsedUserData.email,
          profile: parsedUserData.profile,
          access_token: storedAccessToken,
          user_status: parsedUserData.user_status || 'pending',
          user_role: parsedUserData.user_role,
        };

        setUserData(unifiedUserData);
        
        // Set display name based on available data
        let displayName = "Horse Operator"; // default fallback
        
        if (parsedUserData.profile) {
          // Use profile data if available
          const { operator_fname, operator_lname, operator_username } = parsedUserData.profile;
          if (operator_fname && operator_lname) {
            displayName = `${operator_fname} ${operator_lname}`;
          } else if (operator_username) {
            displayName = operator_username;
          } else if (operator_fname) {
            displayName = operator_fname;
          }
        } else if (parsedUserData.email) {
          // Fallback to user email if no profile
          displayName = parsedUserData.email.split('@')[0];
        }
        
        setCurrentUser(displayName);
        
        console.log('Successfully loaded user data:', {
          userId: parsedUserData.id,
          email: parsedUserData.email,
          displayName: displayName,
          status: parsedUserData.user_status,
          role: parsedUserData.user_role
        });
      } else {
        // No stored auth data - redirect to login
        console.log('No stored authentication data found');
        Alert.alert(
          "Session Expired", 
          "Please log in again to continue.",
          [
            {
              text: "OK",
              onPress: () => router.replace('/auth/login' as any)
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert(
        "Error", 
        "Failed to load user data. Please log in again.",
        [
          {
            text: "OK",
            onPress: () => router.replace('/auth/login' as any)
          }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  }, [router]); // Empty dependency array since it doesn't depend on any props or state

  // Load user data on component mount
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Use useFocusEffect to reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [loadUserData])
  );

  // Handle logout
  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            // Clear all user data from SecureStore
            await SecureStore.deleteItemAsync('access_token');
            await SecureStore.deleteItemAsync('refresh_token');
            await SecureStore.deleteItemAsync('user_data');
            
            console.log('User data cleared, navigating to login');
            router.replace('/auth/login' as any);
          } catch (error) {
            console.error('Error during logout:', error);
            // Still navigate even if storage clear fails
            router.replace('/auth/login' as any);
          }
        },
      },
    ]);
  };

  // Reaction functions
  const getReactionCounts = () => {
    const counts: { [key: string]: number } = {};
    reactions.forEach(reaction => {
      counts[reaction.type] = (counts[reaction.type] || 0) + 1;
    });
    return counts;
  };

  const getTotalReactionCount = () => {
    return reactions.length;
  };

  const getTopReactions = () => {
    const counts = getReactionCounts();
    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type]) => REACTIONS.find(r => r.type === type))
      .filter(Boolean) as Reaction[];
  };

  const handleReactionPress = () => {
    if (userReaction) {
      // Remove current reaction
      setReactions(prev => prev.filter(r => r.userId !== (userData?.id || currentUser)));
      setUserReaction(null);
    } else {
      // Add like reaction
      handleReactionSelect('like');
    }
  };

  const handleReactionLongPress = (event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    setReactionPickerPosition({ x: pageX - 150, y: pageY - 60 });
    setShowReactionPicker(true);
  };

  const handleReactionSelect = (reactionType: Reaction['type']) => {
    const userId = userData?.id || currentUser;
    // Remove any existing reaction from this user
    setReactions(prev => prev.filter(r => r.userId !== userId));
    
    // Add new reaction
    setReactions(prev => [...prev, { userId: userId, type: reactionType }]);
    setUserReaction(reactionType);
    
    // Hide picker
    hideReactionPicker();
  };

  const hideReactionPicker = () => {
    setShowReactionPicker(false);
  };

  const handleComment = () => {
    setShowCommentModal(true);
  };

  const submitComment = () => {
    if (newComment.trim()) {
      const comment: Comment = {
        id: Date.now().toString(),
        user: currentUser,
        text: newComment.trim(),
        time: "Just now",
      };
      setComments((prev) => [comment, ...prev]);
      setNewComment("");
      setShowCommentModal(false);
      Alert.alert("Success", "Your comment has been posted!");
    }
  };

  const navigateToTab = (tabName: string, route: string) => {
    setActiveTab(tabName);
    router.push(route as any);
  };

  // Reaction Picker Component
  const ReactionPicker = () => {
    if (!showReactionPicker) return null;

    return (
      <Modal transparent visible={showReactionPicker} onRequestClose={hideReactionPicker}>
        <TouchableWithoutFeedback onPress={hideReactionPicker}>
          <View style={styles.reactionPickerOverlay}>
            <View
              style={[
                styles.reactionPickerContainer,
                {
                  left: Math.max(10, Math.min(reactionPickerPosition.x, 320)),
                  top: Math.max(50, reactionPickerPosition.y),
                },
              ]}
            >
              {REACTIONS.map((reaction) => (
                <TouchableOpacity
                  key={reaction.type}
                  style={styles.reactionButton}
                  onPress={() => handleReactionSelect(reaction.type)}
                  activeOpacity={0.8}
                >
                  <View style={styles.reactionButtonInner}>
                    <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                  </View>
                  <Text style={styles.reactionLabel}>{reaction.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  // Show loading screen while data is being loaded
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const topReactions = getTopReactions();
  const totalReactions = getTotalReactionCount();
  const currentUserReactionObj = userReaction ? REACTIONS.find(r => r.type === userReaction) : null;
  const commentCount = comments.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.brownBackground}>
        <ScrollView contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.welcomeSection}>
                <Text style={styles.welcomeText}>Welcome,</Text>
                <Text style={styles.nameText}>{currentUser}</Text>
                {userData?.profile?.operator_email && (
                  <Text style={styles.emailText}>{userData.profile.operator_email}</Text>
                )}
                {userData?.profile?.operator_role && (
                  <Text style={styles.roleText}>{userData.profile.operator_role}</Text>
                )}
                {false && (
                  <Text style={styles.roleText}>Horse Operator</Text>
                )}
                {false && userData?.user_status === 'pending' && (
                  <Text style={styles.statusText}>Account Status: Pending Approval</Text>
                )}
              </View>
              <View style={styles.headerIcons}>
                <TouchableOpacity style={styles.iconButton}>
                  <Text style={styles.icon}>🔔</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
                  <FontAwesome5 name="sign-out-alt" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search horses, activities..."
                value={searchText}
                onChangeText={setSearchText}
                placeholderTextColor="#999"
              />
              <TouchableOpacity style={styles.searchIcon}>
                <Text style={styles.searchIconText}>🔍</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Content Wrapper */}
          <View style={styles.contentWrapper}>
            <View style={styles.content}>
              
              {/* Featured Horse Health Status */}
              <View style={styles.healthCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Horse Health Status</Text>
                  <TouchableOpacity onPress={() => router.push('../HORSE_OPERATOR/horse' as any)}>
                    <Text style={styles.viewAllButton}>View All Horses</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.horseInfo}>
                  <Image
                    source={{ uri: '/placeholder.svg?height=120&width=120' }}
                    style={styles.horseImage}
                  />
                  <View style={styles.horseDetails}>
                    <Text style={styles.horseName}>Name: Thunder</Text>
                    <Text style={styles.horseBreed}>Breed: Arabian</Text>
                    <Text style={styles.horseAge}>Age: 8 years</Text>
                    <Text style={styles.horseStatus}>Health Status: Excellent</Text>
                    <Text style={styles.healthCheck}>Last Check: March 28, 2025</Text>
                    <Text style={styles.nextCheck}>Next Check: April 15, 2025</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.quickActionButton}
                    onPress={() => router.push('../HORSE_OPERATOR/addhorse' as any)}
                  >
                    <FontAwesome5 name="plus" size={20} color="#fff" />
                    <Text style={styles.quickActionText}>Add Horse</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ paddingHorizontal: 0 }}>
                <View style={styles.divider} />
              </View>

              {/* Recent Business Activities */}
              <View style={styles.activitiesSection}>
                <Text style={styles.sectionTitle}>Recent Activities</Text>
                
                <View style={styles.activityCard}>
                  <View style={styles.activityHeader}>
                    <View style={styles.activityIcon}>
                      <Text style={styles.activityIconText}>🏥</Text>
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityTitle}>
                        New Booking Confirmed - Route to IT Park
                      </Text>
                      <Text style={styles.activityTime}>1h</Text>
                    </View>
                  </View>
                  <Text style={styles.activityDescription}>
                    Your horse &ldquo;Thunder&rdquo; has been booked for a tourist ride from Colon Street to IT Park. 
                    The ride is scheduled for tomorrow at 2:00 PM.
                  </Text>
                  <Text style={styles.activityDetails}>
                    {'• Duration: 2 hours\n'}
                    {'• Payment: ₱800.00\n'}
                    {'• Customer: Maria Santos\n'}
                    • Contact: +63 912 345 6789
                  </Text>

                  {/* Reaction Summary */}
                  {totalReactions > 0 && (
                    <View style={styles.reactionSummary}>
                      <View style={styles.reactionEmojis}>
                        {topReactions.map((reaction, index) => (
                          <View key={reaction.type} style={[styles.reactionEmojiContainer, { zIndex: topReactions.length - index }]}>
                            <Text style={styles.reactionEmojiSmall}>{reaction.emoji}</Text>
                          </View>
                        ))}
                      </View>
                      <Text style={styles.reactionCount}>
                        {totalReactions > 999 ? `${(totalReactions / 1000).toFixed(1)}k` : totalReactions}
                      </Text>
                    </View>
                  )}

                  <View style={styles.activityFooter}>
                    <View style={styles.activityActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleReactionPress}
                        onLongPress={handleReactionLongPress}
                        delayLongPress={500}
                      >
                        {currentUserReactionObj ? (
                          <>
                            <Text style={styles.reactionEmojiButton}>{currentUserReactionObj.emoji}</Text>
                            <Text style={[styles.actionCount, { color: currentUserReactionObj.color }]}>
                              {currentUserReactionObj.label}
                            </Text>
                          </>
                        ) : (
                          <>
                            <FontAwesome5
                              name="heart"
                              size={18}
                              color="#666"
                            />
                            <Text style={styles.actionCount}>Like</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      
                      <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
                        <Text style={styles.commentIcon}>💬</Text>
                        <Text style={styles.actionCount}>{commentCount} comments</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.actionButton}>
                        <Text style={styles.shareIcon}>📤</Text>
                        <Text style={styles.actionCount}>15</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Second Activity */}
                <View style={styles.activityCard}>
                  <View style={styles.activityHeader}>
                    <View style={styles.activityIcon}>
                      <Text style={styles.activityIconText}>🏥</Text>
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityTitle}>
                        Health Check Completed - Horse &ldquo;Blaze&rdquo;
                      </Text>
                      <Text style={styles.activityTime}>3h</Text>
                    </View>
                  </View>
                  <Text style={styles.activityDescription}>
                    Dr. Rodriguez completed the monthly health checkup for your horse &ldquo;Blaze&rdquo;. 
                    All vitals are normal and the horse is cleared for service.
                  </Text>
                  <Text style={styles.activityDetails}>
                    {'• Weight: 450kg (Normal)\n'}
                    {'• Temperature: 37.8°C\n'}
                    {'• Heart Rate: 32 BPM\n'}
                    • Overall Status: &ldquo;Healthy&rdquo;
                  </Text>
                  <View style={styles.activityFooter}>
                    <View style={styles.activityActions}>
                      <TouchableOpacity style={styles.actionButton}>
                        <FontAwesome5 name="heart" size={18} color="#333" />
                        <Text style={styles.actionCount}>12</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButton}>
                        <Text style={styles.commentIcon}>💬</Text>
                        <Text style={styles.actionCount}>5</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButton}>
                        <Text style={styles.shareIcon}>📤</Text>
                        <Text style={styles.actionCount}>8</Text>
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
        onPress={() => router.push('/HORSE_OPERATOR/Hsos' as any)}
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
          onPress={() => navigateToTab('home', '../HORSE_OPERATOR/home')}
        >
          <FontAwesome5 name="home" size={24} color={activeTab === 'home' ? '#CD853F' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'horses' && styles.activeNavItem]}
          onPress={() => navigateToTab('horses', '../HORSE_OPERATOR/horse')}
        >
          <FontAwesome5 name="horse" size={24} color={activeTab === 'horses' ? '#CD853F' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'bookings' && styles.activeNavItem]}
          onPress={() => navigateToTab('bookings', '../HORSE_OPERATOR/bookings')}
        >
          <FontAwesome5 name="calendar-alt" size={24} color={activeTab === 'bookings' ? '#CD853F' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'messages' && styles.activeNavItem]}
          onPress={() => navigateToTab('messages', '../HORSE_OPERATOR/messages')}
        >
          <FontAwesome5 name="comment-dots" size={24} color={activeTab === 'messages' ? '#CD853F' : '#000'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'profile' && styles.activeNavItem]}
          onPress={() => navigateToTab('profile', '../HORSE_OPERATOR/profile')}
        >
          <FontAwesome5 name="user" size={24} color={activeTab === 'profile' ? '#CD853F' : '#000'} />
        </TouchableOpacity>
      </View>

      {/* Reaction Picker */}
      <ReactionPicker />

      {/* Comment Modal */}
      <Modal
        visible={showCommentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCommentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments ({comments.length})</Text>
              <TouchableOpacity onPress={() => setShowCommentModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.commentsContainer}>
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <View key={comment.id} style={styles.commentItem}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentUser}>{comment.user}</Text>
                      <Text style={styles.commentTime}>{comment.time}</Text>
                    </View>
                    <Text style={styles.commentText}>{comment.text}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.noCommentsContainer}>
                  <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Write a comment..."
                placeholderTextColor="#999"
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.submitButton, { opacity: newComment.trim() ? 1 : 0.5 }]}
                onPress={submitComment}
                disabled={!newComment.trim()}
              >
                <Text style={styles.submitButtonText}>Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#CD853F',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
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
  emailText: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.7)',
    marginTop: 2,
  },
  roleText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  statusText: {
    fontSize: 12,
    color: '#FFE082',
    marginTop: 2,
    fontWeight: '500',
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
  
  // Dashboard Section
  dashboardSection: {
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  
  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    flex: 0.3,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#CD853F',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  
  // Quick Actions
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    backgroundColor: '#CD853F',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.31,
    justifyContent: 'center',
  },
  quickActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Health Card
  healthCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
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
    marginBottom: 15,
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
    marginBottom: 3,
  },
  horseBreed: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  horseAge: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  horseStatus: {
    fontSize: 14,
    color: '#28A745',
    marginBottom: 3,
    fontWeight: 'bold',
  },
  healthCheck: {
    fontSize: 14,
    color: '#000',
    marginBottom: 3,
    fontWeight: 'bold',
  },
  nextCheck: {
    fontSize: 14,
    color: '#FFC107',
    fontWeight: 'bold',
  },
  horseActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 0.48,
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#CD853F',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
  
  // Activities Section
  activitiesSection: {
    marginBottom: 20,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
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
  
  // Reaction Summary Styles
  reactionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  reactionEmojis: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionEmojiContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  reactionEmojiSmall: {
    fontSize: 10,
  },
  reactionCount: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  
  activityFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 8,
  },
  activityActions: {
    flexDirection: 'row',
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 4,
  },
  reactionEmojiButton: {
    fontSize: 16,
  },
  commentIcon: {
    fontSize: 16,
  },
  shareIcon: {
    fontSize: 16,
  },
  actionCount: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  
  // Reaction Picker Styles
  reactionPickerOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  reactionPickerContainer: {
    position: 'absolute',
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  reactionButton: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reactionButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  reactionEmoji: {
    fontSize: 18,
  },
  reactionLabel: {
    fontSize: 8,
    color: '#666',
    marginTop: 2,
    fontWeight: '500',
  },
  
  // SOS Button
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
  
  // Bottom Navigation
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
  
  // Divider
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 15,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '40%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  commentsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  commentItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUser: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  commentTime: {
    fontSize: 11,
    color: '#999',
  },
  commentText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  noCommentsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noCommentsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  commentInputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    maxHeight: 80,
    marginRight: 10,
  },
  submitButton: {
    backgroundColor: '#CD853F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default HorseOperatorHome;