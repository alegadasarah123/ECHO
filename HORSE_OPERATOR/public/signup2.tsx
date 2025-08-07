import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Signup2Screen = () => {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePassword = (password: string) => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return null;
  };

  const checkUsernameAvailability = async (username: string) => {
    try {
      const usersData = await AsyncStorage.getItem('all_users');
      const users = usersData ? JSON.parse(usersData) : {};
      return !users[username.toLowerCase()];
    } catch (error) {
      console.error('Error checking username availability:', error);
      return false;
    }
  };

  const handleNext = async () => {
    if (!username || !password || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please fill out all fields.');
      return;
    }

    if (username.length < 3) {
      Alert.alert('Invalid Username', 'Username must be at least 3 characters long.');
      return;
    }

    const isUsernameAvailable = await checkUsernameAvailability(username);
    if (!isUsernameAvailable) {
      Alert.alert('Username Taken', 'This username is already taken. Please choose another one.');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      Alert.alert('Invalid Password', passwordError);
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }

    try {
      await AsyncStorage.setItem('signup_username', username.toLowerCase());
      await AsyncStorage.setItem('signup_password', password);
      router.push('/signup3');
    } catch (error) {
      console.error('Error saving credentials:', error);
      Alert.alert('Error', 'Failed to save credentials.');
    }
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
            <View style={styles.progressContainer}>
              <View style={styles.progressDots}>
                <View style={[styles.dot, styles.completedDot]} />
                <View style={[styles.dot, styles.activeDot]} />
                <View style={[styles.dot, styles.inactiveDot]} />
              </View>
            </View>

            <View style={styles.header}>
              <Text style={styles.title}>Set Up Your Login</Text>
              <Text style={styles.subtitle}>Secure your account with a username and password</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.helperText}>Username must be at least 3 characters long</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>Password must be at least 6 characters long</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Text style={styles.eyeText}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.button} onPress={handleNext}>
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/Login')} style={styles.loginWrapper}>
              <Text style={styles.loginText}>
                Already have an account? <Text style={styles.signupLink}>Sign In</Text>
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
    marginBottom: 40,
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
    marginBottom: 50,
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
  fieldGroup: {
    marginBottom: 25,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8B4513',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#8B4513',
    padding: 15,
    borderRadius: 25,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    color: '#000',
  },
  helperText: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 5,
    marginLeft: 15,
  },
  passwordContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#8B4513',
    padding: 15,
    paddingRight: 50,
    borderRadius: 25,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    color: '#000',
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    padding: 5,
  },
  eyeText: {
    fontSize: 12,
    color: 'gray',
  },
  button: {
    backgroundColor: '#8B4513',
    padding: 18,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 30,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
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
  signupLink: {
    color: '#8B4513',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});

export default Signup2Screen;
