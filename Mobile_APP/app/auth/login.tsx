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
    paddingHorizontal: "5%",
    paddingTop: Platform.OS === "ios" ? "3%" : "5%",
    paddingBottom: Platform.OS === "ios" ? "8%" : "10%",
    justifyContent: "center",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: Platform.OS === "ios" ? "3%" : "5%",
  },
  logo: {
    width: width * 0.5,
    height: width * 0.5,
    maxWidth: 250,
    maxHeight: 250,
    minWidth: 150,
    minHeight: 150,
    marginBottom: 0,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: "7%",
    paddingTop: "8%",
    paddingBottom: "10%",
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
    fontSize: width < 380 ? 20 : 24,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: "7%",
  },
  inputContainer: {
    marginBottom: "5%",
  },
  label: {
    fontSize: width < 380 ? 12 : 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: "2%",
  },
  textInput: {
    height: Platform.OS === "ios" ? 48 : 44,
    borderWidth: 1.5,
    borderColor: "#C9A882",
    borderRadius: 25,
    paddingHorizontal: "5%",
    fontSize: width < 380 ? 13 : 15,
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
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    height: Platform.OS === "ios" ? 48 : 44,
  },
  passwordContainerError: {
    borderColor: "#FF3B30",
    borderWidth: 1.5,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: "5%",
    fontSize: width < 380 ? 13 : 15,
    color: "#333",
    height: "100%",
  },
  eyeIconContainer: {
    paddingHorizontal: "4%",
    paddingVertical: "3%",
  },
  eyeIcon: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  eyeOpen: {
    width: 16,
    height: 12,
    borderWidth: 2,
    borderColor: "#666666",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  eyeClosed: {
    width: 16,
    height: 12,
    borderWidth: 2,
    borderColor: "#666666",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  eyeball: {
    width: 6,
    height: 6,
    backgroundColor: "#666666",
    borderRadius: 3,
  },
  eyeLine: {
    position: "absolute",
    width: 18,
    height: 2,
    backgroundColor: "#666666",
    transform: [{ rotate: "45deg" }],
  },
  forgotPasswordButton: {
    alignItems: "flex-end",
    marginBottom: "6%",
  },
  forgotPasswordText: {
    color: "#B8763E",
    fontSize: width < 380 ? 11 : 13,
  },
  loginButton: {
    height: Platform.OS === "ios" ? 48 : 44,
    backgroundColor: "#B8763E",
    borderRadius: 25,
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
    fontSize: width < 380 ? 14 : 16,
    fontWeight: "600",
  },
  footerSection: {
    alignItems: "center",
    marginTop: "7%",
  },
  footerText: {
    fontSize: width < 380 ? 12 : 14,
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