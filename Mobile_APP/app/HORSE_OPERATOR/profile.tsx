import React, { useState, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define a more comprehensive UserData type for profile.tsx
interface UserData {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  profileImage?: string;
  // Add other fields that might be stored in 'current_user_data'
  dateOfBirth?: string;
  sex?: string;
  phoneNumber?: string;
  province?: string;
  city?: string;
  municipality?: string;
  barangay?: string;
  zipCode?: string;
  houseNumber?: string;
  route?: string;
  to?: string;
  email?: string;
  facebook?: string;
  username?: string;
  password?: string;
}

const Profile = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  // Initialize userData with a more complete structure
  const [userData, setUserData] = useState<UserData>({
    firstName: 'User',
    profileImage: '/placeholder.svg?height=100&width=100',
  });

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const currentUserData = await AsyncStorage.getItem('current_user_data');
        if (currentUserData) {
          const user: UserData = JSON.parse(currentUserData);
          setUserData({
            ...user, // Spread all user properties
            firstName: `${user.firstName || ''}`.trim() || 'User',
            profileImage: user.profileImage || '/placeholder.svg?height=100&width=100',
          });
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    loadUserData();
  }, []);

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
    // Pass the entire userData object to the profileinfo screen
    router.push({
      pathname: '/profileinfo',
      params: { userData: JSON.stringify(userData) }, // Stringify to pass complex objects
    });
  };

  const handleTermsAndPolicies = () => {
    console.log('Opening Terms & Policies');
    router.push('/terms');
  };
  const handleHelpAndSupport = () => {
    console.log('Opening Help & Support');
    router.push('/helpsupp');
  };
  const handleLogOut = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem('user_logged_in');
            await AsyncStorage.removeItem('current_user');
            await AsyncStorage.removeItem('current_user_data');
            console.log('User logged out');
            router.replace('/Login');
          } catch (error) {
            console.error('Logout error:', error);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image
            source={{ uri: userData.profileImage }}
            style={styles.profileImage}
          />
          <Text style={styles.userName}>{userData.firstName}</Text>
        </View>
        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <View style={styles.menuItemContent}>
                <FontAwesome5
                  name={item.icon}
                  size={20}
                  color="#333"
                  style={styles.menuIcon}
                />
                <Text style={styles.menuText}>{item.title}</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={16} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'home' && styles.activeNavItem]}
          onPress={() => {
            setActiveTab('home');
            router.push('/home');
          }}
        >
          <FontAwesome5
            name="home"
            size={24}
            color={activeTab === 'home' ? '#CD853F' : '#000'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'horse' && styles.activeNavItem]}
          onPress={() => {
            setActiveTab('horse');
            router.push('/horse');
          }}
        >
          <FontAwesome5
            name="horse"
            size={24}
            color={activeTab === 'horse' ? '#CD853F' : '#000'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'message' && styles.activeNavItem]}
          onPress={() => {
            setActiveTab('message');
            router.push('/message');
          }}
        >
          <FontAwesome5
            name="comment-dots"
            size={24}
            color={activeTab === 'message' ? '#CD853F' : '#000'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'calendar' && styles.activeNavItem]}
          onPress={() => {
            setActiveTab('calendar');
            router.push('/calendar');
          }}
        >
          <FontAwesome5
            name="calendar-alt"
            size={24}
            color={activeTab === 'calendar' ? '#CD853F' : '#000'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'profile' && styles.activeNavItem]}
          onPress={() => {
            setActiveTab('profile');
            router.push('/profile');
          }}
        >
          <FontAwesome5
            name="user"
            size={24}
            color={activeTab === 'profile' ? '#CD853F' : '#000'}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: '#CD853F',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e0e0e0',
    marginBottom: 15,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  menuContainer: {
    backgroundColor: '#fff',
    marginTop: 0,
    paddingBottom: 100,
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
  menuIcon: {
    marginRight: 15,
    width: 20,
  },
  menuText: {
    fontSize: 16,
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

export default Profile;
