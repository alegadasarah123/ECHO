import { useRouter } from "expo-router"
import * as SecureStore from "expo-secure-store"
import { useCallback, useState, useEffect } from "react"
import {
  Alert,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Animated,
  ActivityIndicator,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

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
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor

export default function LoginScreen() {
  const router = useRouter()
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [progressAnim] = useState(new Animated.Value(0))

  useEffect(() => {
    if (isLoginLoading) {
      // Animate progress bar from 0 to 1 over 3 seconds
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: false,
      }).start()
    } else {
      progressAnim.setValue(0)
    }
  }, [isLoginLoading, progressAnim])

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields")
      return
    }

    setIsLoginLoading(true)

    try {
      console.log("Clearing existing tokens...")
      await logout()

      console.log("Attempting login for:", email.trim().toLowerCase())

      const response = await fetch("https://echo-ebl8.onrender.com/api/login_mobile/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password.trim(),
        }),
      })

      const data = await response.json()
      console.log("Login response status:", response.status)

      if (response.ok) {
        if (data.access_token) {
          await SecureStore.setItemAsync("access_token", data.access_token)
          console.log("✅ Access token stored successfully")
        }

        if (data.refresh_token) {
          await SecureStore.setItemAsync("refresh_token", data.refresh_token)
          console.log("✅ Refresh token stored successfully")
        }

        if (data.user) {
          const userDataToStore = {
            ...data.user,
            user_role: data.user_role,
            user_status: data.user_status,
            profile: data.profile,
          }
          await SecureStore.setItemAsync("user_data", JSON.stringify(userDataToStore))
          console.log("✅ User data stored successfully")
        }

        const userRole = data.user_role?.trim()
        console.log("Processing user role:", userRole)

        if (!userRole) {
          console.error("❌ No user role received")
          Alert.alert("Error", "No user role found. Please contact support.")
          return
        }

        if (userRole === "Kutsero") {
          console.log("✅ Routing to kutsero dashboard")
          router.replace("../KUTSERO/dashboard")
        } else if (userRole === "Horse Operator") {
          console.log("✅ Routing to horse operator home")
          router.replace("../HORSE_OPERATOR/home")
        } else {
          console.log("❌ Unrecognized user role:", userRole)
          Alert.alert("Error", `Unrecognized user role: ${userRole}. Please contact support.`)
        }
      } else {
        let errorMessage = "Login failed. Please try again."
        if (data.message) errorMessage = data.message
        else if (data.error) errorMessage = data.error
        else if (response.status === 401) errorMessage = "Invalid email or password."
        else if (response.status >= 500) errorMessage = "Server error. Please try again later."
        Alert.alert("Login Error", errorMessage)
      }
    } catch (error) {
      console.error("❌ Login error:", error)
      let errorMessage = "Network error. Please check your connection."
      if (error instanceof Error && error.message.includes("Network request failed")) {
        errorMessage = "Unable to connect to server. Please check your internet connection."
      }
      Alert.alert("Connection Error", errorMessage)
    } finally {
      setIsLoginLoading(false)
    }
  }

  const handleForgotPassword = () => {
    router.push("/auth/forgot-password")
  }

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev)
  }, [])

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  })

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#B8763E" />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.contentContainer}>
            <View style={styles.headerSection}>
              <Image source={require("../../assets/images/echo.png")} style={styles.logo} resizeMode="contain" />
            </View>

            <View style={styles.formCard}>
              <Text style={styles.welcomeTitle}>Welcome Back</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Username</Text>
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
                  <TouchableOpacity style={styles.eyeIconContainer} onPress={togglePasswordVisibility}>
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
                style={styles.forgotPasswordButton} 
                disabled={isLoginLoading}
                onPress={handleForgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.loginButton, isLoginLoading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={isLoginLoading}
              >
                <Text style={styles.loginButtonText}>{isLoginLoading ? "Signing In..." : "Sign In"}</Text>
              </TouchableOpacity>

              {/* Loading Animation */}
              {isLoginLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#B8763E" />
                  <Text style={styles.loadingText}>Processing your request...</Text>
                  <View style={styles.progressBarContainer}>
                    <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
                  </View>
                </View>
              )}

              <View style={styles.footerSection}>
                <Text style={styles.footerText}>
                  Don&#39;t have an account?{" "}
                  <Text style={styles.signUpText} onPress={() => !isLoginLoading && router.push("/auth/signup")}>
                    Sign Up
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: "#B8763E",},
  keyboardView: {flex: 1,},
  contentContainer: {flex: 1, paddingHorizontal: "5%", paddingTop: Platform.OS === "ios" ? "3%" : "5%", paddingBottom: Platform.OS === "ios" ? "8%" : "10%", justifyContent: "center",},
  headerSection: {alignItems: "center", marginBottom: Platform.OS === "ios" ? "3%" : "5%",},
  logo: {width: width * 0.5, height: width * 0.5, maxWidth: 250, maxHeight: 250, minWidth: 150, minHeight: 150, marginBottom: 0,},
  formCard: {backgroundColor: "#FFFFFF", borderRadius: 20, paddingHorizontal: "7%", paddingTop: "8%", paddingBottom: "10%", shadowColor: "#000", shadowOffset: {width: 0, height: 4,}, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8,},
  welcomeTitle: {fontSize: width < 380 ? 20 : 24, fontWeight: "600", color: "#333", textAlign: "center", marginBottom: "7%",},
  inputContainer: {marginBottom: "5%",},
  label: {fontSize: width < 380 ? 12 : 14, fontWeight: "500", color: "#333", marginBottom: "2%",},
  textInput: {height: Platform.OS === "ios" ? 48 : 44, borderWidth: 1.5, borderColor: "#C9A882", borderRadius: 25, paddingHorizontal: "5%", fontSize: width < 380 ? 13 : 15, backgroundColor: "#FFFFFF", color: "#333",},
  passwordContainer: {flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "#C9A882", borderRadius: 25, backgroundColor: "#FFFFFF", height: Platform.OS === "ios" ? 48 : 44,},
  passwordInput: {flex: 1, paddingHorizontal: "5%", fontSize: width < 380 ? 13 : 15, color: "#333", height: "100%",},
  eyeIconContainer: {paddingHorizontal: "4%", paddingVertical: "3%",},
  eyeIcon: {width: 20, height: 20, justifyContent: "center", alignItems: "center",},
  eyeOpen: {width: 16, height: 12, borderWidth: 2, borderColor: "#666666", borderRadius: 8, justifyContent: "center", alignItems: "center", position: "relative",},
  eyeClosed: {width: 16, height: 12, borderWidth: 2, borderColor: "#666666", borderRadius: 8, justifyContent: "center", alignItems: "center", position: "relative",},
  eyeball: {width: 6, height: 6, backgroundColor: "#666666", borderRadius: 3,},
  eyeLine: {position: "absolute", width: 18, height: 2, backgroundColor: "#666666", transform: [{rotate: "45deg"}],},
  forgotPasswordButton: {alignItems: "flex-end", marginBottom: "6%",},
  forgotPasswordText: {color: "#B8763E", fontSize: width < 380 ? 11 : 13,},
  loginButton: {height: Platform.OS === "ios" ? 48 : 44, backgroundColor: "#B8763E", borderRadius: 25, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: {width: 0, height: 2,}, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,},
  loginButtonDisabled: {backgroundColor: "#ccc", shadowOpacity: 0, elevation: 0,},
  loginButtonText: {color: "#FFFFFF", fontSize: width < 380 ? 14 : 16, fontWeight: "600",},
  loadingContainer: {marginTop: 15, alignItems: "center",},
  loadingText: {fontSize: 12, color: "#B8763E", marginTop: 8, marginBottom: 8,},
  progressBarContainer: {width: "100%", height: 4, backgroundColor: "#E0E0E0", borderRadius: 2, overflow: "hidden", marginTop: 5,},
  progressBar: {height: "100%", backgroundColor: "#4CAF50", borderRadius: 2,},
  footerSection: {alignItems: "center", marginTop: "7%",},
  footerText: {fontSize: width < 380 ? 12 : 14, color: "#666", textAlign: "center",},
  signUpText: {color: "#B8763E", fontWeight: "600",},
})