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

// Utility function to capitalize first letter of each word
const capitalizeRole = (role: string | null | undefined): string => {
  if (!role) return ""
  return role
    .toLowerCase()
    .split('_')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Role-based routing configuration
const ROLE_ROUTES = {
  kutsero: "../KUTSERO/dashboard",
  horse_operator: "../HORSE_OPERATOR/home",
  admin: "../ADMIN/dashboard", // Add admin route if needed
} as const

// Role validation
const validateUserRole = (role: string | null | undefined): keyof typeof ROLE_ROUTES | null => {
  if (!role) return null
  const normalizedRole = role.toLowerCase().trim()
  return Object.keys(ROLE_ROUTES).includes(normalizedRole) 
    ? normalizedRole as keyof typeof ROLE_ROUTES 
    : null
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

<<<<<<< HEAD
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
=======
      const response = await fetch("http://172.20.10.2:8000/api/kutsero/login/", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          password: password.trim()
        }),
      })
>>>>>>> a48615e9b47c1adec476d489063b5a3fc850a2dd

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
          Alert.alert("Error", "Authentication failed. No access token received.")
          return
        }

        if (data.refresh_token) {
          await SecureStore.setItemAsync("refresh_token", data.refresh_token)
          console.log("✅ Refresh token stored successfully")
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

<<<<<<< HEAD
        // Validate user role
        const userRole = data.user_role?.toLowerCase()?.trim()
        console.log("Processing user role:", userRole)

        if (!userRole) {
          console.error("❌ No user role received")
          Alert.alert("Error", "No user role found. Please contact support.")
          return
        }

        // Route based on user role
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
                  router.replace("/KUTSERO/dashboard") // ✅ fixed path
                },
              },
            ]
          )
        } else if (
          userRole === "Horse Operator"
        ) {
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
                  router.replace("/HORSE_OPERATOR/home") // ✅ fixed path
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
=======
        // Enhanced role validation and routing
        const validatedRole = validateUserRole(data.user_role)
        const capitalizedRole = capitalizeRole(data.user_role)
        
        console.log("Processing user role:", data.user_role, "Validated:", validatedRole, "Display as:", capitalizedRole)
        
        if (!validatedRole) {
          console.error("❌ Invalid or unrecognized user role:", data.user_role)
          Alert.alert(
            "Access Denied", 
            `Unrecognized user role: ${capitalizedRole || 'Unknown'}. Please contact support for assistance.`
          )
          return
        }

        // Check user status for additional messaging
        const getStatusMessage = (status: string) => {
          switch (status?.toLowerCase()) {
            case "pending":
              return "\n\nNote: Your account is pending approval but you can still use the app."
            case "suspended":
              return "\n\nWarning: Your account is currently suspended. Some features may be limited."
            case "rejected":
              return "\n\nYour account has been rejected. Please contact support for more information."
            case "approved":
            default:
              return ""
          }
        }

        const statusMessage = getStatusMessage(data.user_status)
        const targetRoute = ROLE_ROUTES[validatedRole]

        // Show role-specific welcome message and navigate
        Alert.alert(
          "Login Successful", 
          `Welcome ${capitalizedRole} ${data.user?.email || "User"}!${statusMessage}`,
          [{ 
            text: "Continue", 
            onPress: () => {
              console.log(`✅ Routing ${validatedRole} to ${targetRoute}`)
              router.replace(targetRoute)
            }
          }]
        )

      } else {
        // Enhanced error handling
        console.error("❌ Login failed:", data.message || data.error || "Unknown error")
        
        const getErrorMessage = (status: number, data: any) => {
          if (data.message) return data.message
          if (data.error) return data.error
          
          switch (status) {
            case 401:
              return "Invalid email or password. Please check your credentials."
            case 403:
              return "Access denied. Your account may be suspended or rejected."
            case 429:
              return "Too many login attempts. Please wait a moment and try again."
            case 500:
            case 502:
            case 503:
              return "Server error. Please try again later."
            default:
              return "Login failed. Please check your input and try again."
          }
>>>>>>> a48615e9b47c1adec476d489063b5a3fc850a2dd
        }

        const errorMessage = getErrorMessage(response.status, data)
        Alert.alert("Login Error", errorMessage)
      }
    } catch (error) {
      console.error("❌ Login error:", error)
<<<<<<< HEAD

      let errorMessage =
        "Network error. Please check your connection and try again."

      if (error instanceof Error) {
        if (error.message.includes("Network request failed")) {
          errorMessage =
            "Unable to connect to server. Please check your internet connection."
=======
      
      const getNetworkErrorMessage = (error: Error) => {
        if (error.message.includes("Network request failed")) {
          return "Unable to connect to server. Please check your internet connection."
>>>>>>> a48615e9b47c1adec476d489063b5a3fc850a2dd
        } else if (error.message.includes("timeout")) {
          return "Request timed out. Please try again."
        } else if (error.message.includes("fetch")) {
          return "Connection error. Please check your network and try again."
        } else {
          return "An unexpected error occurred. Please try again."
        }
      }
<<<<<<< HEAD

=======
      
      const errorMessage = error instanceof Error 
        ? getNetworkErrorMessage(error)
        : "Network error. Please check your connection and try again."
      
>>>>>>> a48615e9b47c1adec476d489063b5a3fc850a2dd
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
              onPress={() => !isLoginLoading && router.push("/auth/signup")} // ✅ fixed path
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
