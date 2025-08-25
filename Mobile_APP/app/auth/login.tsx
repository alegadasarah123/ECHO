// login.tsx - FIXED VERSION

"use client"

import { useRouter } from "expo-router"
import { useCallback, useState } from "react"
import {
  Alert,
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import * as SecureStore from "expo-secure-store"

// Auth utility functions
const logout = async () => {
  try {
    await SecureStore.deleteItemAsync("access_token")
    await SecureStore.deleteItemAsync("refresh_token")
    await SecureStore.deleteItemAsync("user_data")
    await SecureStore.deleteItemAsync("selectedHorseData")
    await SecureStore.deleteItemAsync("checkInData")
    console.log("All tokens and user data cleared successfully")
  } catch (error) {
    console.error("Error clearing tokens:", error)
  }
}

const { width, height } = Dimensions.get("window")
const scale = (size: number) => (width / 375) * size
const verticalScale = (size: number) => (height / 812) * size
const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor

export default function LoginScreen() {
  const router = useRouter()
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields")
      return
    }

    setIsLoginLoading(true)

    try {
      // Clear any existing tokens first to ensure fresh login
      console.log("Clearing existing tokens...")
      await logout()

      console.log("Attempting login for:", email.trim().toLowerCase())

      const response = await fetch(
        "http://192.168.101.2:8000/api/login_mobile/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password: password.trim(),
          }),
        }
      )

      const data = await response.json()
      console.log("Login response status:", response.status)
      console.log("Login response data:", {
        message: data.message,
        user_role: data.user_role,
        user_status: data.user_status,
        has_access_token: !!data.access_token,
        has_refresh_token: !!data.refresh_token,
        expires_in: data.expires_in,
        user_email: data.user?.email,
      })

      if (response.ok) {
        // Store tokens securely in SecureStore
        if (data.access_token) {
          await SecureStore.setItemAsync("access_token", data.access_token)
          console.log("✅ Access token stored successfully")
        } else {
          console.error("❌ No access token received")
        }

        if (data.refresh_token) {
          await SecureStore.setItemAsync("refresh_token", data.refresh_token)
          console.log("✅ Refresh token stored successfully")
        } else {
          console.error("❌ No refresh token received")
        }

        // Store user info for later use (including profile data)
        if (data.user) {
          const userDataToStore = {
            ...data.user,
            user_role: data.user_role,
            user_status: data.user_status,
            profile: data.profile,
          }

          await SecureStore.setItemAsync(
            "user_data",
            JSON.stringify(userDataToStore)
          )
          console.log("✅ User data stored successfully:", {
            hasProfile: !!data.profile,
            userRole: data.user_role,
            userStatus: data.user_status,
          })
        }

        // Validate user role - FIXED: Handle exact role values from backend
        const userRole = data.user_role?.trim()
        console.log("Processing user role:", userRole)

        if (!userRole) {
          console.error("❌ No user role received")
          Alert.alert("Error", "No user role found. Please contact support.")
          return
        }

        // Route based on user role - FIXED: Check for exact role values
        if (userRole === "kutsero") {
          console.log("✅ Routing to kutsero dashboard")

          const statusMsg =
            data.user_status === "pending"
              ? "\n\nNote: Your account is pending approval but you can still use the app."
              : ""

          Alert.alert(
            "Login Successful",
            `Welcome ${data.user?.email || "User"}!${statusMsg}`,
            [
              {
                text: "Continue",
                onPress: () => {
                  router.replace("../KUTSERO/dashboard")
                },
              },
            ]
          )
        } else if (userRole === "horse_operator") {  // FIXED: Check for exact match
          console.log("✅ Routing to horse operator home")

          const statusMsg =
            data.user_status === "pending"
              ? "\n\nNote: Your account is pending approval but you can still use the app."
              : ""

          Alert.alert(
            "Login Successful",
            `Welcome ${data.user?.email || "User"}!${statusMsg}`,
            [
              {
                text: "Continue",
                onPress: () => {
                  router.replace("../HORSE_OPERATOR/home")
                },
              },
            ]
          )
        } else {
          console.log("❌ Unrecognized user role:", userRole)
          Alert.alert(
            "Error",
            `Unrecognized user role: ${userRole}. Please contact support.`
          )
          return
        }
      } else {
        // Handle login errors
        console.error(
          "❌ Login failed:",
          data.message || data.error || "Unknown error"
        )

        let errorMessage = "Login failed. Please try again."

        if (data.message) {
          errorMessage = data.message
        } else if (data.error) {
          errorMessage = data.error
        } else if (response.status === 401) {
          errorMessage =
            "Invalid email or password. Please check your credentials."
        } else if (response.status >= 500) {
          errorMessage = "Server error. Please try again later."
        } else if (response.status >= 400) {
          errorMessage = "Invalid request. Please check your input."
        }

        Alert.alert("Login Error", errorMessage)
      }
    } catch (error) {
      console.error("❌ Login error:", error)

      let errorMessage =
        "Network error. Please check your connection and try again."

      if (error instanceof Error) {
        if (error.message.includes("Network request failed")) {
          errorMessage =
            "Unable to connect to server. Please check your internet connection."
        } else if (error.message.includes("timeout")) {
          errorMessage = "Request timed out. Please try again."
        } else {
          errorMessage = error.message
        }
      }

      Alert.alert("Connection Error", errorMessage)
    } finally {
      setIsLoginLoading(false)
    }
  }

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev)
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo/Header Section */}
        <View style={styles.headerSection}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoginLoading}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoginLoading}
              />
              <TouchableOpacity
                style={styles.eyeIconContainer}
                onPress={togglePasswordVisibility}
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

          {/* Login Button */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              isLoginLoading && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isLoginLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoginLoading ? "Signing In..." : "Sign In"}
            </Text>
          </TouchableOpacity>

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotPasswordButton}
            disabled={isLoginLoading}
          >
            <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Section */}
        <View style={styles.footerSection}>
          <Text style={styles.footerText}>
            Don&#39;t have an account?{" "}
            <Text
              style={styles.signUpText}
              onPress={() => !isLoginLoading && router.push("/auth/signup")}
            >
              Sign Up
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(40),
  },
  headerSection: {
    alignItems: "center",
    marginBottom: verticalScale(40),
    marginTop: verticalScale(20),
  },
  logo: {
    width: scale(120),
    height: verticalScale(120),
    marginBottom: verticalScale(20),
  },
  title: {
    fontSize: moderateScale(28),
    fontWeight: "bold",
    color: "#333",
    marginBottom: verticalScale(8),
    textAlign: "center",
  },
  subtitle: {
    fontSize: moderateScale(16),
    color: "#666",
    textAlign: "center",
  },
  formSection: {
    flex: 1,
    marginBottom: verticalScale(20),
  },
  inputContainer: {
    marginBottom: verticalScale(20),
  },
  label: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(8),
  },
  textInput: {
    height: verticalScale(50),
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: moderateScale(8),
    paddingHorizontal: scale(15),
    fontSize: moderateScale(16),
    backgroundColor: "#f9f9f9",
    color: "#333",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: moderateScale(8),
    backgroundColor: "#f9f9f9",
    height: verticalScale(50),
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: scale(15),
    fontSize: moderateScale(16),
    color: "#333",
    height: "100%",
  },
  eyeButton: {
    paddingHorizontal: scale(15),
    paddingVertical: verticalScale(15),
  },
  eyeText: {
    fontSize: moderateScale(18),
  },
  loginButton: {
    height: verticalScale(50),
    backgroundColor: "#007AFF",
    borderRadius: moderateScale(8),
    justifyContent: "center",
    alignItems: "center",
    marginTop: verticalScale(10),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  loginButtonDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: "#ffffff",
    fontSize: moderateScale(18),
    fontWeight: "600",
  },
  forgotPasswordButton: {
    alignItems: "center",
    marginTop: verticalScale(15),
  },
  forgotPasswordText: {
    color: "#007AFF",
    fontSize: moderateScale(16),
    textDecorationLine: "underline",
  },
  footerSection: {
    alignItems: "center",
    marginTop: verticalScale(30),
  },
  footerText: {
    fontSize: moderateScale(16),
    color: "#666",
    textAlign: "center",
  },
  signUpText: {
    color: "#007AFF",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  eyeIconContainer: {
    paddingHorizontal: moderateScale(15),
    paddingVertical: moderateScale(12),
  },
  eyeIcon: {
    width: moderateScale(20),
    height: moderateScale(20),
    justifyContent: "center",
    alignItems: "center",
  },
  eyeOpen: {
    width: moderateScale(16),
    height: moderateScale(12),
    borderWidth: 2,
    borderColor: "#666666",
    borderRadius: moderateScale(8),
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  eyeClosed: {
    width: moderateScale(16),
    height: moderateScale(12),
    borderWidth: 2,
    borderColor: "#666666",
    borderRadius: moderateScale(8),
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  eyeball: {
    width: moderateScale(6),
    height: moderateScale(6),
    backgroundColor: "#666666",
    borderRadius: moderateScale(3),
  },
  eyeLine: {
    position: "absolute",
    width: moderateScale(18),
    height: 2,
    backgroundColor: "#666666",
    transform: [{ rotate: "45deg" }],
  },
})