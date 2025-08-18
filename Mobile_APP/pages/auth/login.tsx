"use client"

import AsyncStorage from "@react-native-async-storage/async-storage"
import { useRouter } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import {
  Alert,
  Dimensions,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

const { width, height } = Dimensions.get("window")

// Responsive scaling functions
const scale = (size: number) => (width / 375) * size
const verticalScale = (size: number) => (height / 812) * size
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor

export default function LoginScreen() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  // Optional: Add a function to check if user is already logged in
  const checkAuthStatus = async () => {
    try {
      const storedAuthData = await AsyncStorage.getItem('userAuthData')
      const storedAccessToken = await AsyncStorage.getItem('accessToken')
      const loginTimestamp = await AsyncStorage.getItem('loginTimestamp')
      const expiresIn = await AsyncStorage.getItem('expiresIn')
      
      if (storedAuthData && storedAccessToken && loginTimestamp && expiresIn) {
        const currentTime = Date.now()
        const loginTime = parseInt(loginTimestamp)
        const expiryTime = loginTime + (parseInt(expiresIn) * 1000)
        
        if (currentTime < expiryTime) {
          // Token is still valid, navigate to dashboard
          console.log('Valid session found, redirecting to dashboard')
          router.replace('/(tabs)/dashboard')
          return
        } else {
          // Token expired, clear storage
          console.log('Session expired, clearing storage')
          await AsyncStorage.multiRemove([
            'userAuthData',
            'accessToken',
            'refreshToken',
            'tokenType',
            'expiresIn',
            'loginTimestamp'
          ])
        }
      }
      
      // Show login screen after checking auth status
      const timer = setTimeout(() => {
        setIsLoading(false)
      }, 1000) // Reduced loading time since we're checking auth
      
      return () => clearTimeout(timer)
    } catch (error) {
      console.error('Error checking auth status:', error)
      // Still show login screen even if auth check fails
      const timer = setTimeout(() => {
        setIsLoading(false)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }

  // Updated login function with proper authentication
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields")
      return
    }
    
    setIsLoginLoading(true)
    
    try {
      // Replace 'YOUR_API_ENDPOINT' with your actual API endpoint
      const response = await fetch("http://192.168.1.8:8000/api/signup/", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password,
        }),
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        // Store the complete authentication data
        const authData = {
          user: data.user,
          profile: data.profile,
          user_status: data.user_status,
          user_role: data.user_role,
        }
        
        // Store all authentication data in AsyncStorage
        await AsyncStorage.multiSet([
          ['userAuthData', JSON.stringify(authData)],
          ['accessToken', data.access_token],
          ['refreshToken', data.refresh_token || ''],
          ['tokenType', data.token_type || 'bearer'],
          ['expiresIn', data.expires_in?.toString() || '3600'],
          ['loginTimestamp', Date.now().toString()]
        ])
        
        console.log('Authentication data stored successfully:', {
          user: data.user,
          profile: data.profile,
          status: data.user_status,
          role: data.user_role
        })
        
        // Navigate to dashboard
        router.replace('/(tabs)/dashboard')
        
        Alert.alert(
          "Login Successful", 
          `Welcome ${data.profile?.kutsero_fname || data.user.email}!`,
          [{ text: "OK" }]
        )
      } else {
        const errorMessage = data.error || 'Login failed'
        Alert.alert("Login Failed", errorMessage)
      }
    } catch (error) {
      console.error('Login error:', error)
      Alert.alert("Error", "Network error. Please try again.")
    } finally {
      setIsLoginLoading(false)
    }
  }

  const toggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev)
  }, [])

  const handleShowSignup = useCallback(() => {
    router.push("/signup")
  }, [router])

  const handleShowForgotPassword = useCallback(() => {
    router.push("/forgot-password")
  }, [router])

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
        <View style={styles.loadingContent}>
          <View style={styles.logoContainer}>
            <View style={styles.loadingImageContainer}>
              <Image
                source={require("../assets/images/KUTSERO 1.png")}
                style={styles.loadingLogo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.tagline}>Equine Care and Health Optimization</Text>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.loginContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#B8763E" />
      {/* Orange Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.headerLogoContainer}>
          <Image source={require("../assets/images/logo.png")} style={styles.headerLogo} resizeMode="contain" />
        </View>
      </View>

      {/* White Login Section */}
      <View style={styles.loginSection}>
        <Text style={styles.welcomeText}>Welcome Back</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.textInput}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!isLoginLoading}
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              editable={!isLoginLoading}
            />
            <TouchableOpacity 
              style={styles.eyeIconContainer} 
              onPress={toggleShowPassword}
              disabled={isLoginLoading}
            >
              <View style={styles.eyeIcon}>
                {showPassword ? (
                  <View style={styles.eyeOpen}>
                    <View style={styles.eyeball} />
                  </View>
                ) : (
                  <View style={styles.eyeClosed}>
                    <View style={styles.eyeball} />
                    <View style={styles.eyeLine} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.forgotPasswordContainer} 
          onPress={handleShowForgotPassword}
          disabled={isLoginLoading}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.signInButton, isLoginLoading && styles.disabledButton]} 
          onPress={handleLogin}
          disabled={isLoginLoading}
        >
          <Text style={styles.signInButtonText}>
            {isLoginLoading ? "Signing In..." : "Sign In"}
          </Text>
        </TouchableOpacity>
        <View style={styles.signUpContainer}>
          <Text style={styles.signUpText}>
            Don't have an account?{" "}
            <Text 
              style={[styles.signUpLink, isLoginLoading && styles.disabledText]} 
              onPress={isLoginLoading ? undefined : handleShowSignup}
            >
              Sign Up
            </Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  // Loading Screen Styles
  loadingContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: scale(20),
  },
  logoContainer: {
    alignItems: "center",
    width: "100%",
  },
  loadingImageContainer: {
    marginBottom: verticalScale(30),
    width: scale(200),
    height: verticalScale(200),
    justifyContent: "center",
    alignItems: "center",
  },
  loadingLogo: {
    width: "100%",
    height: "100%",
    maxWidth: scale(180),
    maxHeight: verticalScale(180),
  },
  tagline: {
    fontSize: moderateScale(14),
    color: "#666",
    textAlign: "center",
    maxWidth: scale(250),
    lineHeight: moderateScale(20),
  },
  // Login Screen Styles
  loginContainer: {
    flex: 1,
    backgroundColor: "#B8763E",
  },
  headerSection: {
    backgroundColor: "#B8763E",
    paddingTop: verticalScale(40),
    paddingBottom: verticalScale(60),
    alignItems: "center",
    minHeight: verticalScale(180),
    justifyContent: "center",
  },
  headerLogoContainer: {
    alignItems: "center",
    width: scale(120),
    height: verticalScale(100),
    justifyContent: "center",
  },
  headerLogo: {
    width: "100%",
    height: "100%",
    maxWidth: scale(100),
    maxHeight: verticalScale(80),
  },
  loginSection: {
    flex: 1,
    backgroundColor: "white",
    borderTopLeftRadius: moderateScale(30),
    borderTopRightRadius: moderateScale(30),
    paddingHorizontal: scale(30),
    paddingTop: verticalScale(40),
    marginTop: verticalScale(-30),
    minHeight: height * 0.6,
  },
  welcomeText: {
    fontSize: moderateScale(24),
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: verticalScale(40),
  },
  inputContainer: {
    marginBottom: verticalScale(20),
    width: "100%",
  },
  inputLabel: {
    fontSize: moderateScale(14),
    color: "#666",
    marginBottom: verticalScale(8),
    marginLeft: scale(4),
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: moderateScale(25),
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(15),
    fontSize: moderateScale(16),
    backgroundColor: "white",
    width: "100%",
    minHeight: verticalScale(50),
  },
  forgotPasswordContainer: {
    alignItems: "flex-end",
    marginBottom: verticalScale(30),
    marginTop: verticalScale(10),
  },
  forgotPasswordText: {
    color: "#B8763E",
    fontSize: moderateScale(14),
  },
  signInButton: {
    backgroundColor: "#B8763E",
    borderRadius: moderateScale(25),
    paddingVertical: verticalScale(15),
    alignItems: "center",
    marginBottom: verticalScale(30),
    width: "100%",
    minHeight: verticalScale(50),
    justifyContent: "center",
  },
  disabledButton: {
    backgroundColor: "#ccc",
    opacity: 0.7,
  },
  signInButtonText: {
    color: "white",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
  signUpContainer: {
    alignItems: "center",
    marginTop: verticalScale(20),
    paddingBottom: verticalScale(30),
  },
  signUpText: {
    fontSize: moderateScale(14),
    color: "#666",
    textAlign: "center",
  },
  signUpLink: {
    color: "#B8763E",
    fontWeight: "600",
  },
  disabledText: {
    color: "#ccc",
  },
  passwordInputContainer: {
    position: "relative",
    width: "100%",
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: moderateScale(25),
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(15),
    paddingRight: scale(50),
    fontSize: moderateScale(16),
    backgroundColor: "white",
    width: "100%",
    minHeight: verticalScale(50),
  },
  eyeIconContainer: {
    position: "absolute",
    right: scale(15),
    top: "50%",
    transform: [{ translateY: verticalScale(-12) }],
    padding: scale(5),
    width: scale(34),
    height: verticalScale(34),
    justifyContent: "center",
    alignItems: "center",
  },
  eyeIcon: {
    width: scale(24),
    height: verticalScale(24),
    justifyContent: "center",
    alignItems: "center",
  },
  eyeOpen: {
    width: scale(20),
    height: verticalScale(12),
    borderWidth: 2,
    borderColor: "#666",
    borderRadius: moderateScale(10),
    justifyContent: "center",
    alignItems: "center",
  },
  eyeClosed: {
    width: scale(20),
    height: verticalScale(12),
    borderWidth: 2,
    borderColor: "#666",
    borderRadius: moderateScale(10),
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  eyeball: {
    width: scale(6),
    height: verticalScale(6),
    backgroundColor: "#666",
    borderRadius: moderateScale(3),
  },
  eyeLine: {
    position: "absolute",
    width: scale(24),
    height: 2,
    backgroundColor: "#666",
    transform: [{ rotate: "45deg" }],
  },
})