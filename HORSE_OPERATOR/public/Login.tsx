import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setLoading(true);
    try {
      // Get all users from storage
      const usersData = await AsyncStorage.getItem('all_users');
      const users = usersData ? JSON.parse(usersData) : {};

      // Check if any users exist
      if (Object.keys(users).length === 0) {
        Alert.alert(
          'No Account Found',
          'It seems you don\'t have an account yet. Please sign up to create one.',
          [
            { text: 'Sign Up', onPress: () => router.push('/signup') },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        setLoading(false);
        return;
      }

      // Check if username exists
      const userKey = username.toLowerCase();
      if (!users[userKey]) {
        Alert.alert(
          'Account Not Found',
          'The username you entered does not exist. Please sign up to create an account.',
          [
            { text: 'Sign Up', onPress: () => router.push('/signup') },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        setLoading(false);
        return;
      }

      // Check password
      if (users[userKey].password !== password) {
        Alert.alert(
          'Incorrect Password',
          'The password you entered is incorrect.',
          [
            {
              text: 'Forgot Password?',
              onPress: () => {
                Alert.alert('Forgot Password', 'Password recovery feature will be available soon.');
              },
            },
            { text: 'Try Again', style: 'cancel' },
          ]
        );
        setLoading(false);
        return;
      }

      // Login successful
      const userData = users[userKey];
      await AsyncStorage.setItem('user_logged_in', 'true');
      await AsyncStorage.setItem('current_user', userKey);
      await AsyncStorage.setItem('current_user_data', JSON.stringify(userData));
      
      Alert.alert('Success', `Welcome back, ${userData.firstName || username}!`);
      router.replace('/home');

    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(
        'Login Error',
        'Something went wrong while trying to log in. Please try again.',
        [{ text: 'Retry', style: 'default' }]
      );
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>ECHO</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.welcome}>Welcome Back</Text>

          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowPassword(prev => !prev)}>
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={22}
                color="#8B4513"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.forgotWrapper}
            onPress={() => router.push('/forgotpassword')}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/signup')}
            style={styles.signupWrapper}
          >
            <Text style={styles.signupText}>
              Don&#39;t have an account?{' '}
              <Text style={styles.signupLink}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#CD853F',
  },
  header: {
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: 20,
    backgroundColor: '#CD853F',
  },
  logo: {
    width: 150,
    height: 140,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4D2C1D',
    letterSpacing: 2,
    marginTop: 10,
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 40,
  },
  welcome: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#8B4513',
    textAlign: 'center',
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#8B4513',
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8B4513',
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 5,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  forgotWrapper: {
    alignItems: 'flex-end',
    marginTop: 10,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  loginButton: {
    backgroundColor: '#8B4513',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 50,
  },
  loginButtonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signupWrapper: {
    marginTop: 30,
    alignItems: 'center',
  },
  signupText: {
    color: '#8B4513',
    fontSize: 14,
  },
  signupLink: {
    color: '#8B4513',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});
