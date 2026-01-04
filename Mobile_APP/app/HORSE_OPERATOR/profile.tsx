// Horse Operator Profile Screen

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet, 
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

const { width, height } = Dimensions.get("window");

const scale = (size: number) => {
  const scaleFactor = width / 375;
  const scaledSize = size * scaleFactor;
  return Math.max(Math.min(scaledSize, size * 1.2), size * 0.8);
};

const verticalScale = (size: number) => {
  const scaleFactor = height / 812;
  const scaledSize = size * scaleFactor;
  return Math.max(Math.min(scaledSize, size * 1.15), size * 0.85);
};

const moderateScale = (size: number, factor = 0.5) => {
  const scaledSize = size + (scale(size) - size) * factor;
  return Math.max(Math.min(scaledSize, size * 1.1), size * 0.9);
};

const dynamicSpacing = (baseSize: number) => {
  if (width < 350) return verticalScale(baseSize * 0.7);
  if (width < 400) return verticalScale(baseSize * 0.85);
  if (width > 450) return verticalScale(baseSize * 1.05);
  return verticalScale(baseSize);
};

const getSafeAreaPadding = () => {
  const statusBarHeight = StatusBar.currentHeight || 0;
  return {
    top: Math.max(statusBarHeight, 20),
    bottom: height > 800 ? 34 : 20,
  };
};

// User data interface matching your database schema
interface UserData {
  user_id?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dob?: string;
  sex?: string;
  phoneNumber?: string;
  province?: string;
  city?: string;
  municipality?: string;
  barangay?: string;
  zipCode?: string;
  houseAddress?: string;
  route?: string;
  routeTo?: string;
  email?: string;
  facebook?: string;
  profileImage?: string;
  role?: string;
}

const API_BASE_URL = "https://echo-ebl8.onrender.com/api/horse_operator";

const TabButton = ({
  iconSource,
  label,
  tabKey,
  isActive,
  onPress,
}: {
  iconSource: any;
  label: string;
  tabKey: string;
  isActive: boolean;
  onPress?: () => void;
}) => (
  <TouchableOpacity style={styles.tabButton} onPress={onPress}>
    <View style={[styles.tabIcon, isActive && styles.activeTabIcon]}>
      {iconSource ? (
        <Image
          source={iconSource}
          style={[styles.tabIconImage, { tintColor: isActive ? "white" : "#666" }]}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.fallbackIcon} />
      )}
    </View>
    <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>{label}</Text>
  </TouchableOpacity>
);

const Profile = () => {
  const router = useRouter();
  const activeTab: string = 'profile'; // Current active tab
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [imageError, setImageError] = useState(false);
  const safeArea = getSafeAreaPadding();
  
  // Initialize userData state
  const [userData, setUserData] = useState<UserData>({
    firstName: 'User',
    profileImage: '',
  });

  // Generate a fallback profile image URL based on user's name
  const getFallbackImageUrl = (name: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=CD853F&color=fff&size=100&bold=true&font-size=0.5`;
  };

  // Get the actual image URL to use
  const getProfileImageUrl = () => {
    if (imageError || !userData.profileImage) {
      const displayName = getDisplayName();
      return getFallbackImageUrl(displayName);
    }
    return userData.profileImage;
  };

  // Load user ID from secure storage
  const loadUserId = async (): Promise<string | undefined> => {
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
    return undefined;
  };

  // Fetch user profile
  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setImageError(false);

      // Get user ID
      let uid = userId;
      if (!uid) {
        const loadedUserId = await loadUserId();
        if (!loadedUserId) {
          console.error("No user_id found, cannot fetch profile.");
          setError("No user ID found. Please log in again.");
          setLoading(false);
          return;
        }
        uid = loadedUserId;
      }

      console.log("Fetching profile for user_id:", uid);
      
      const url = `${API_BASE_URL}/get_horse_operator_profile/?user_id=${encodeURIComponent(uid)}`;
      console.log("Request URL:", url);

      const response = await fetch(url);
      console.log("Response status:", response.status);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.log("Error response:", errData);
        throw new Error(errData.error || `Failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log("Profile data received:", data);

      // Transform data to match frontend interface
      const transformedData: UserData = {
        user_id: uid,
        firstName: data.op_fname || '',
        middleName: data.op_mname || '',
        lastName: data.op_lname || '',
        dob: data.op_dob || '',
        sex: data.op_sex || '',
        phoneNumber: data.op_phone_num || '',
        province: data.op_province || 'Cebu',
        city: data.op_city || '',
        municipality: data.op_municipality || '',
        barangay: data.op_brgy || '',
        zipCode: data.op_zipcode || '',
        houseAddress: data.op_house_add || '',
        route: data.op_routefrom || '',
        routeTo: data.op_routeto || '',
        email: data.op_email || '',
        facebook: data.op_fb || '',
        profileImage: data.op_image || '',
        role: 'horse_operator'
      };

      setUserData(transformedData);
      setLoading(false);
    } catch (error: any) {
      console.error("Error loading profile:", error);
      setError(error.message || "Unable to load profile data");
      setLoading(false);
      
      Alert.alert(
        'Error',
        'Failed to load profile data. Please try again.',
        [
          {
            text: 'Retry',
            onPress: () => fetchUserProfile(),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    }
  }, [userId]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const menuItems = [
    {
      id: '1',
      title: 'Profile Information',
      icon: 'user',
      onPress: () => handleProfileInfo(),
    },
    {
      id: '2',
      title: 'Terms & Policies',
      icon: 'file-alt',
      onPress: () => handleTermsAndPolicies(),
    },
    {
      id: '3',
      title: 'Help & Support',
      icon: 'question-circle',
      onPress: () => handleHelpAndSupport(),
    },
    {
      id: '4',
      title: 'Log Out',
      icon: 'sign-out-alt',
      onPress: () => handleLogOut(),
    },
  ];

  const handleProfileInfo = () => {
    console.log('Opening Profile Information');
    router.push({
      pathname: '../HORSE_OPERATOR/profileinfo',
      params: { 
        user_id: userId || userData.user_id,
      },
    });
  };

  const handleTermsAndPolicies = () => {
    console.log('Opening Terms & Policies');
    router.push('../HORSE_OPERATOR/terms');
  };

  const handleHelpAndSupport = () => {
    console.log('Opening Help & Support');
    router.push('../HORSE_OPERATOR/helpsupp');
  };

  const handleLogOut = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          console.log('User logged out');
          
          // Clear secure storage
          try {
            await SecureStore.deleteItemAsync("user_data");
            await SecureStore.deleteItemAsync("user_token");
          } catch (error) {
            console.error("Error clearing storage:", error);
          }
          
          // Clear user state
          setUserData({
            firstName: 'User',
            profileImage: '',
          });
          setImageError(false);
          
          // Navigate to login screen
          router.replace('/auth/login');
        },
      },
    ]);
  };

  // Get display name
  const getDisplayName = () => {
    const firstName = userData.firstName || 'User';
    const middleName = userData.middleName ? `${userData.middleName[0]}.` : '';
    const lastName = userData.lastName || '';
    
    return `${firstName} ${middleName} ${lastName}`.trim();
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#CD853F" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: getProfileImageUrl() }}
              style={styles.profileImage}
              onError={() => {
                console.log("Image failed to load, using fallback");
                setImageError(true);
              }}
            />
            {!userData.profileImage || imageError ? (
              <View style={styles.fallbackInitialsContainer}>
                <Text style={styles.fallbackInitialsText}>
                  {getDisplayName()
                    .split(' ')
                    .map(word => word[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.userName}>{getDisplayName()}</Text>
          <View style={styles.roleContainer}>
            <FontAwesome5 name="horse" size={12} color="#fff" />
            <Text style={styles.roleText}>Horse Operator</Text>
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <FontAwesome5 name="exclamation-circle" size={20} color="#ff3b30" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchUserProfile} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemContent}>
                <View style={styles.iconCircle}>
                  <FontAwesome5
                    name={item.icon}
                    size={20}
                    color="#CD853F"
                    style={styles.menuIcon}
                  />
                </View>
                <Text style={styles.menuText}>{item.title}</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={16} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>App Version 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={[styles.tabBar, { paddingBottom: safeArea.bottom }]}>
        <TabButton 
          iconSource={require("../../assets/images/home.png")} 
          label="Home" 
          tabKey="home" 
          isActive={activeTab === "home"}
          onPress={() => router.push("/HORSE_OPERATOR/home" as any)} 
        />
        <TabButton
          iconSource={require("../../assets/images/horse.png")}
          label="Horses"
          tabKey="horses"
          isActive={activeTab === "horses"}
          onPress={() => router.push("../HORSE_OPERATOR/horse" as any)}
        />
        <TabButton
          iconSource={require("../../assets/images/kutsero.png")}
          label="Kutsero"
          tabKey="kutsero"
          isActive={activeTab === "kutsero"}
          onPress={() => router.push("../HORSE_OPERATOR/kutsero" as any)}
        />
        <TabButton
          iconSource={require("../../assets/images/chat.png")}
          label="Chat"
          tabKey="messages"
          isActive={activeTab === "messages"}
          onPress={() => router.push("../HORSE_OPERATOR/Hmessage" as any)}
        />
        <TabButton
          iconSource={require("../../assets/images/calendar.png")}
          label="Calendar"
          tabKey="bookings"
          isActive={activeTab === "bookings"}
          onPress={() => router.push("../HORSE_OPERATOR/Hcalendar" as any)}
        />
        <TabButton
          iconSource={require("../../assets/images/profile.png")}
          label="Profile"
          tabKey="profile"
          isActive={activeTab === "profile"}
          onPress={() => router.push("../HORSE_OPERATOR/profile" as any)}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  profileHeader: {
    backgroundColor: '#CD853F',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e0e0e0',
    marginBottom: 15,
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  fallbackInitialsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#CD853F',
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
  },
  fallbackInitialsText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
    textAlign: 'center',
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 5,
  },
  roleText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffe5e5',
    padding: 15,
    margin: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  errorText: {
    flex: 1,
    marginLeft: 10,
    color: '#ff3b30',
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  menuContainer: {
    backgroundColor: '#fff',
    marginTop: 15,
    marginHorizontal: 15,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuIcon: {
    width: 20,
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 100,
  },
  versionText: {
    fontSize: 12,
    color: '#999',
  },
  // Bottom Tab Navigation - Matching Horse Screen
  tabBar: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingVertical: dynamicSpacing(8),
    paddingHorizontal: scale(8),
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    minHeight: verticalScale(60),
    alignItems: "center",
    justifyContent: "space-around",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: verticalScale(4),
    paddingHorizontal: scale(2),
  },
  tabIcon: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(2),
  },
  activeTabIcon: {
    backgroundColor: "#CD853F",
  },
  tabIconImage: {
    width: scale(16),
    height: scale(16),
  },
  fallbackIcon: {
    width: scale(14),
    height: scale(14),
    backgroundColor: "#666",
    borderRadius: scale(2),
  },
  tabLabel: {
    fontSize: moderateScale(9),
    color: "#666",
    textAlign: "center",
  },
  activeTabLabel: {
    color: "#CD853F",
    fontWeight: "600",
  },
});

export default Profile;