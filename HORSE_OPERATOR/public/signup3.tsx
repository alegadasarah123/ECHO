import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Signup3Screen = () => {
  const router = useRouter();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem('signupData');
        if (jsonValue) {
          setUserData(JSON.parse(jsonValue));
        }
      } catch (error) {
        console.error('Failed to load signup data:', error);
      }
    };
    loadUserData();
  }, []);

  const handleCapturePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is required!');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleUploadPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Media library permission is required!');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleSignUp = async () => {
    if (!profileImage) {
      Alert.alert('Missing Photo', 'Please add a profile picture.');
      return;
    }
    setLoading(true);
    try {
      // Get credentials from signup2
      const username = await AsyncStorage.getItem('signup_username');
      const password = await AsyncStorage.getItem('signup_password');

      if (!username || !password) {
        Alert.alert('Error', 'Missing credentials. Please go back and complete the previous step.');
        setLoading(false);
        return;
      }

      // Get existing users
      const existingUsersData = await AsyncStorage.getItem('all_users');
      const existingUsers = existingUsersData ? JSON.parse(existingUsersData) : {};

      // Combine all user data
      const finalData = {
        ...userData,
        username,
        password,
        profileImage,
        createdAt: new Date().toISOString(),
      };

      // Add new user to the users object
      existingUsers[username] = finalData;

      // Store the updated users object
      await AsyncStorage.setItem('all_users', JSON.stringify(existingUsers));

      // --- NEW: Set the newly signed-up user as the current user ---
      await AsyncStorage.setItem('current_user_data', JSON.stringify(finalData));
      await AsyncStorage.setItem('user_logged_in', 'true'); // Set login status

      // Clean up temporary data
      await AsyncStorage.removeItem('signupData');
      await AsyncStorage.removeItem('signup_username');
      await AsyncStorage.removeItem('signup_password');

      Alert.alert(
        'Success',
        'Your account has been created successfully! Please login with your credentials.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/Login'),
          },
        ]
      );
    } catch (error) {
      console.error('Sign up error:', error);
      Alert.alert('Error', 'Something went wrong during signup.');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.headerBackground} />
        <View style={styles.formWrapper}>
          <ScrollView
            contentContainerStyle={styles.formBox}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <View style={styles.progressDots}>
                <View style={[styles.dot, styles.completedDot]} />
                <View style={[styles.dot, styles.completedDot]} />
                <View style={[styles.dot, styles.activeDot]} />
              </View>
            </View>
            <View style={styles.header}>
              <Text style={styles.title}>Set Your Profile Picture</Text>
              <Text style={styles.subtitle}>Upload or capture a photo for your profile</Text>
            </View>
            {/* Profile Picture Display */}
            <View style={styles.profilePictureContainer}>
              <View style={styles.profilePictureCircle}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.profileImage} />
                ) : (
                  <View style={styles.defaultProfileIcon}>
                    <View style={styles.personIcon}>
                      <View style={styles.head} />
                      <View style={styles.body} />
                    </View>
                  </View>
                )}
              </View>
            </View>
            {/* Photo Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton} onPress={handleCapturePhoto}>
                <Text style={styles.actionButtonText}>Capture your Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleUploadPhoto}>
                <Text style={styles.actionButtonText}>Upload your Photo</Text>
              </TouchableOpacity>
            </View>
            {/* Sign Up Button */}
            <TouchableOpacity
              style={[styles.signUpButton, loading && styles.signUpButtonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
            >
              <Text style={styles.signUpButtonText}>
                {loading ? 'Creating Account...' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
            {/* Redirect to Login */}
            <TouchableOpacity onPress={() => router.push('/Login')} style={styles.loginWrapper}>
              <Text style={styles.loginText}>
                Already have an account? <Text style={styles.signInLink}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoiding: {
    flex: 1,
  },
  headerBackground: {
    height: 380,
    backgroundColor: '#CD853F',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 180,
    borderBottomRightRadius: 50,
  },
  formWrapper: {
    flex: 1,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -330,
    marginBottom: 40,
    marginLeft: 25,
    marginRight: 25,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  formBox: {
    padding: 30,
    paddingBottom: 40,
    justifyContent: 'center',
    minHeight: 500,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 10,
  },
  progressDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#007AFF',
  },
  completedDot: {
    backgroundColor: '#28A745',
  },
  inactiveDot: {
    backgroundColor: '#D1D1D6',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 20,
  },
  profilePictureContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  profilePictureCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#8B4513',
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  defaultProfileIcon: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  personIcon: {
    alignItems: 'center',
  },
  head: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#8B4513',
    backgroundColor: 'transparent',
    marginBottom: 5,
  },
  body: {
    width: 50,
    height: 35,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    borderWidth: 2,
    borderColor: '#8B4513',
    backgroundColor: 'transparent',
  },
  actionButtons: {
    marginBottom: 40,
  },
  actionButton: {
    borderWidth: 1,
    borderColor: '#8B4513',
    backgroundColor: 'transparent',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 15,
  },
  actionButtonText: {
    color: '#8B4513',
    fontSize: 16,
    fontWeight: '500',
  },
  signUpButton: {
    backgroundColor: '#8B4513',
    padding: 18,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  signUpButtonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  signUpButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loginWrapper: {
    alignItems: 'center',
    marginTop: 10,
  },
  loginText: {
    color: '#8B4513',
    fontSize: 14,
  },
  signInLink: {
    color: '#8B4513',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});

export default Signup3Screen;
