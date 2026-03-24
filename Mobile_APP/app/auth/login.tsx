import { useRouter } from "expo-router"
import * as SecureStore from "expo-secure-store"
import { useCallback, useState, useRef, useEffect } from "react"
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native"

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
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const hasNavigated = useRef(false)
  const loginAttempted = useRef(false)

  // Clear email error when user types
  const handleEmailChange = (text: string) => {
    setEmail(text)
    if (emailError) setEmailError("")
  }

  // Clear password error when user types
  const handlePasswordChange = (text: string) => {
    setPassword(text)
    if (passwordError) setPasswordError("")
  }

  // Check if already logged in on mount
  useEffect(() => {
    const checkAlreadyLoggedIn = async () => {
      try {
        const accessToken = await SecureStore.getItemAsync("access_token")
        const userData = await SecureStore.getItemAsync("user_data")
        
        if (accessToken && userData && !hasNavigated.current) {
          const user = JSON.parse(userData)
          const userRole = user.user_role?.trim()
          
          hasNavigated.current = true
          
          if (userRole === "Kutsero") {
            router.replace("../KUTSERO/dashboard")
          } else if (userRole === "Horse Operator") {
            router.replace("../HORSE_OPERATOR/home")
          }
        }
      } catch (error) {
        console.error("Error checking login status:", error)
      }
    }
    
    checkAlreadyLoggedIn()
  }, [])

  const handleLogin = async () => {
    // Clear previous errors
    setEmailError("")
    setPasswordError("")
    
    // Prevent multiple login attempts
    if (isLoginLoading || hasNavigated.current || loginAttempted.current) return
    
    let hasError = false
    
    if (!email) {
      setEmailError("Email is required")
      hasError = true
    }
    
    if (!password) {
      setPasswordError("Password is required")
      hasError = true
    }
    
    if (hasError) return

    loginAttempted.current = true
    setIsLoginLoading(true)

    try {
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

      if (response.ok && !hasNavigated.current) {
        // Store tokens
        if (data.access_token) {
          await SecureStore.setItemAsync("access_token", data.access_token)
        }
        if (data.refresh_token) {
          await SecureStore.setItemAsync("refresh_token", data.refresh_token)
        }
        if (data.user) {
          const userDataToStore = {
            ...data.user,
            user_role: data.user_role,
            user_status: data.user_status,
            profile: data.profile,
          }
          await SecureStore.setItemAsync("user_data", JSON.stringify(userDataToStore))
        }

        const userRole = data.user_role?.trim()
        
        if (!userRole) {
          setEmailError("No user role found. Please contact support.")
          setIsLoginLoading(false)
          loginAttempted.current = false
          return
        }

        // Mark as navigated before routing
        hasNavigated.current = true

        // Route based on user role
        if (userRole === "Kutsero") {
          router.replace("../KUTSERO/dashboard")
        } else if (userRole === "Horse Operator") {
          router.replace("../HORSE_OPERATOR/home")
        } else {
          setEmailError(`Unrecognized user role: ${userRole}. Please contact support.`)
          hasNavigated.current = false
          setIsLoginLoading(false)
          loginAttempted.current = false
        }
      } else {
        // Handle different error cases based on response status and message
        if (response.status === 401) {
          // Check if the error is about email not registered or incorrect password
          if (data.message && data.message.toLowerCase().includes("email")) {
            setEmailError("Email not registered")
          } else if (data.message && (data.message.toLowerCase().includes("password") || data.message.toLowerCase().includes("invalid"))) {
            setPasswordError("Incorrect password")
          } else {
            // Default 401 error handling
            setPasswordError("Invalid email or password")
          }
        } else {
          let errorMessage = "Login failed. Please try again."
          
          if (data.message) {
            errorMessage = data.message
            // Check specific error messages from the API
            if (errorMessage.toLowerCase().includes("email") && !errorMessage.toLowerCase().includes("password")) {
              setEmailError("Email not registered")
            } else if (errorMessage.toLowerCase().includes("password")) {
              setPasswordError("Incorrect password")
            } else {
              setPasswordError(errorMessage)
            }
          } else if (data.error) {
            errorMessage = data.error
            if (errorMessage.toLowerCase().includes("email") && !errorMessage.toLowerCase().includes("password")) {
              setEmailError("Email not registered")
            } else if (errorMessage.toLowerCase().includes("password")) {
              setPasswordError("Incorrect password")
            } else {
              setPasswordError(errorMessage)
            }
          } else {
            setPasswordError("Invalid email or password")
          }
        }
        
        setIsLoginLoading(false)
        loginAttempted.current = false
      }
    } catch (error) {
      console.error("❌ Login error:", error)
      let errorMessage = "Network error. Please check your connection and try again."
      
      if (error instanceof Error) {
        if (error.message.includes("Network request failed")) {
          errorMessage = "Unable to connect to server. Please check your internet connection."
        } else if (error.message.includes("timeout")) {
          errorMessage = "Request timed out. Please try again."
        }
      }
      
      setPasswordError(errorMessage)
      setIsLoginLoading(false)
      loginAttempted.current = false
    }
  }

  const handleForgotPassword = () => {
    if (hasNavigated.current) return
    router.push("/auth/forgot-password")
  }

  const handleSignUp = () => {
    if (hasNavigated.current || isLoginLoading) return
    router.push("/auth/signup")
  }

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev)
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#B8763E" />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.contentContainer}>
          <View style={styles.headerSection}>
            <Image source={require("../../assets/images/echo.png")} style={styles.logo} resizeMode="contain" />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.welcomeTitle}>Welcome Back</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.textInput, emailError ? styles.textInputError : null]}
                placeholder="Enter your registered email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoginLoading}
              />
              {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.passwordContainer, passwordError ? styles.passwordContainerError : null]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={handlePasswordChange}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoginLoading}
                />
                <TouchableOpacity 
                  style={styles.eyeIconContainer} 
                  onPress={togglePasswordVisibility}
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
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
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
              {isLoginLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerSection}>
              <Text style={styles.footerText}>
                Don&#39;t have an account?{" "}
                <Text style={styles.signUpText} onPress={handleSignUp}>
                  Sign Up
                </Text>
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#B8763E",
  },
  keyboardView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(15),
    paddingBottom: verticalScale(40),
    justifyContent: "center",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: verticalScale(10),
  },
  logo: {
    width: scale(250),
    height: scale(250),
    marginBottom: 0,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(20),
    paddingHorizontal: scale(25),
    paddingTop: verticalScale(30),
    paddingBottom: verticalScale(35),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  welcomeTitle: {
    fontSize: moderateScale(24),
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: verticalScale(25),
  },
  inputContainer: {
    marginBottom: verticalScale(18),
  },
  label: {
    fontSize: moderateScale(14),
    fontWeight: "500",
    color: "#333",
    marginBottom: verticalScale(8),
  },
  textInput: {
    height: verticalScale(48),
    borderWidth: 1.5,
    borderColor: "#C9A882",
    borderRadius: moderateScale(25),
    paddingHorizontal: scale(18),
    fontSize: moderateScale(15),
    backgroundColor: "#FFFFFF",
    color: "#333",
  },
  textInputError: {
    borderColor: "#FF3B30",
    borderWidth: 1.5,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#C9A882",
    borderRadius: moderateScale(25),
    backgroundColor: "#FFFFFF",
    height: verticalScale(48),
  },
  passwordContainerError: {
    borderColor: "#FF3B30",
    borderWidth: 1.5,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: scale(18),
    fontSize: moderateScale(15),
    color: "#333",
    height: "100%",
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
  forgotPasswordButton: {
    alignItems: "flex-end",
    marginBottom: verticalScale(20),
  },
  forgotPasswordText: {
    color: "#B8763E",
    fontSize: moderateScale(13),
  },
  loginButton: {
    height: verticalScale(48),
    backgroundColor: "#B8763E",
    borderRadius: moderateScale(25),
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  loginButtonDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
  footerSection: {
    alignItems: "center",
    marginTop: verticalScale(25),
  },
  footerText: {
    fontSize: moderateScale(14),
    color: "#666",
    textAlign: "center",
  },
  signUpText: {
    color: "#B8763E",
    fontWeight: "600",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: moderateScale(12),
    marginTop: verticalScale(5),
    marginLeft: scale(15),
  },
})