import { useRouter } from 'expo-router'
import { useState, useEffect, useRef } from "react"
import {
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native"

const { width, height } = Dimensions.get("window")

const scale = (size: number) => (width / 375) * size
const verticalScale = (size: number) => (height / 812) * size
const moderateScale = (size: number, factor: number = 0.5) => size + (scale(size) - size) * factor

type Stage = "forgot" | "otp" | "reset" | "success"

interface PasswordRequirements {
  minLength: boolean
  hasUppercase: boolean
  hasLowercase: boolean
  hasNumber: boolean
  hasSpecialChar: boolean
}

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>("forgot")
  const [email, setEmail] = useState<string>("")
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""])
  const [newPassword, setNewPassword] = useState<string>("")
  const [confirmPassword, setConfirmPassword] = useState<string>("")
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")
  const [resendTimer, setResendTimer] = useState<number>(0)
  
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  // Create refs for OTP inputs
  const otpInputRefs = useRef<(TextInput | null)[]>([])

  // Password requirements state
  const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirements>({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false
  })

  // Animation effect when component mounts
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  // Password validation function
  const validatePassword = (password: string): PasswordRequirements => {
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>_]/.test(password)
    }
  }

  // Update password requirements when newPassword changes
  useEffect(() => {
    setPasswordRequirements(validatePassword(newPassword))
  }, [newPassword])

  // Check if password meets all requirements
  const isPasswordValid = (): boolean => {
    const reqs = validatePassword(newPassword)
    return reqs.minLength && reqs.hasUppercase && reqs.hasLowercase && reqs.hasNumber && reqs.hasSpecialChar
  }

  // Handle forgot password - Send OTP
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError("Please enter your email address.")
      return
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.")
      return
    }

    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      const response = await fetch("https://echo-ebl8.onrender.com/api/forgot-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      const data = await response.json()

      if (response.ok && data.exists) {
        setSuccess("OTP sent to your email. Please check your inbox.")
        setStage("otp")
        setResendTimer(60)
        setError("")
      } else {
        setError(data.error || "Email not registered.")
      }
    } catch (err) {
      console.error("Network error:", err)
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Verify OTP
  const handleVerifyOTP = async () => {
    const otpCode = otp.join('')
    
    if (otpCode.length !== 6) {
      setError("Please enter the 6-digit OTP.")
      return
    }

    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("https://echo-ebl8.onrender.com/api/verify-otp/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          otp: otpCode, 
          purpose: "password_reset" 
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("OTP verified! You can now reset your password.")
        setStage("reset")
        setError("")
      } else {
        setError(data.error || "Invalid OTP. Please try again.")
      }
    } catch (err) {
      console.error("Network error:", err)
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendTimer > 0) return
    
    setIsLoading(true)
    setError("")
    
    try {
      const response = await fetch("https://echo-ebl8.onrender.com/api/resend-otp/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), purpose: "password_reset" }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("New OTP sent to your email.")
        setResendTimer(60)
        setError("")
      } else {
        setError(data.error || "Failed to resend OTP.")
      }
    } catch (err) {
      console.error("Network error:", err)
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Reset password with proper validation
  const handleResetPassword = async () => {
    setError("")
    setSuccess("")
    
    // Validate all password requirements before proceeding
    if (!isPasswordValid()) {
      setError("Please meet all password requirements before resetting your password.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("https://echo-ebl8.onrender.com/api/reset-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), newPassword }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Password successfully reset! You can now login.")
        setStage("success")
        setNewPassword("")
        setConfirmPassword("")
        setOtp(["", "", "", "", "", ""])
      } else {
        if (data.error) {
          setError(data.error)
        } else {
          setError("Failed to reset password. Please ensure your password meets all requirements.")
        }
      }
    } catch (err) {
      console.error("Network error:", err)
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToLogin = () => {
    router.replace('/auth/login')
  }

  const handleBack = () => {
    if (stage === "forgot") {
      handleBackToLogin()
    } else if (stage === "otp") {
      setStage("forgot")
      setOtp(["", "", "", "", "", ""])
      setError("")
    } else if (stage === "reset") {
      setStage("otp")
      setNewPassword("")
      setConfirmPassword("")
      setError("")
    }
  }

  // Handle OTP input change
  const handleOtpChange = (text: string, index: number) => {
    if (text.length > 1) return
    if (!/^\d*$/.test(text)) return
    
    const newOtp = [...otp]
    newOtp[index] = text
    setOtp(newOtp)
    
    // Auto-focus next input
    if (text && index < 5) {
      const nextInput = otpInputRefs.current[index + 1]
      if (nextInput) {
        nextInput.focus()
      }
    }
  }

  // Handle OTP key press for backspace
  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = otpInputRefs.current[index - 1]
      if (prevInput) {
        prevInput.focus()
      }
    }
  }

  // Forgot Password Stage
  if (stage === "forgot") {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#B8763E" />
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View 
              style={[
                styles.card,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Text style={styles.backButtonText}>← Back to Login</Text>
              </TouchableOpacity>

              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.description}>
                Enter your email address to receive a verification code.
              </Text>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              {success ? <Text style={styles.successText}>{success}</Text> : null}

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    error ? styles.textInputError : null
                  ]}
                  value={email}
                  onChangeText={(text: string) => {
                    setEmail(text)
                    setError("")
                  }}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity 
                style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} 
                onPress={handleForgotPassword}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.loginButtonText}>Send Verification Code</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  // OTP Verification Stage
  if (stage === "otp") {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#B8763E" />
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View 
              style={[
                styles.card,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>

              <Text style={styles.title}>Verify OTP</Text>
              <Text style={styles.description}>
                We've sent a 6-digit code to {email}
              </Text>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              {success ? <Text style={styles.successText}>{success}</Text> : null}

              <View style={styles.otpContainer}>
                {[...Array(6)].map((_, index: number) => (
                  <TextInput
                    key={index}
                    ref={(ref: TextInput | null) => {
                      otpInputRefs.current[index] = ref
                    }}
                    style={[
                      styles.otpInput,
                      otp[index] ? styles.otpInputFilled : null,
                      error ? styles.otpInputError : null
                    ]}
                    value={otp[index]}
                    onChangeText={(text: string) => handleOtpChange(text, index)}
                    onKeyPress={(e: any) => handleOtpKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center"
                  />
                ))}
              </View>

              <View style={styles.resendContainer}>
                <TouchableOpacity 
                  onPress={handleResendOTP}
                  disabled={resendTimer > 0 || isLoading}
                >
                  <Text style={[
                    styles.resendText,
                    (resendTimer > 0 || isLoading) && styles.resendTextDisabled
                  ]}>
                    {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend Code"}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} 
                onPress={handleVerifyOTP}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.loginButtonText}>Verify Code</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  // Reset Password Stage
  if (stage === "reset") {
    const allRequirementsMet = 
      passwordRequirements.minLength &&
      passwordRequirements.hasUppercase &&
      passwordRequirements.hasLowercase &&
      passwordRequirements.hasNumber &&
      passwordRequirements.hasSpecialChar

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#B8763E" />
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View 
              style={[
                styles.card,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>

              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.description}>
                Enter your new password below.
              </Text>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              {success ? <Text style={styles.successText}>{success}</Text> : null}

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>New Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={newPassword}
                    onChangeText={(text: string) => {
                      setNewPassword(text)
                      setError("")
                    }}
                    placeholder="Enter new password"
                    placeholderTextColor="#999"
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                  <TouchableOpacity 
                    style={styles.eyeIconContainer}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    <Text style={styles.eyeIconText}>
                      {showNewPassword ? "👁️" : "👁️‍🗨️"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={confirmPassword}
                    onChangeText={(text: string) => {
                      setConfirmPassword(text)
                      setError("")
                    }}
                    placeholder="Confirm new password"
                    placeholderTextColor="#999"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                  <TouchableOpacity 
                    style={styles.eyeIconContainer}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Text style={styles.eyeIconText}>
                      {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Password Requirements Display */}
              <View style={styles.requirementsContainer}>
                <Text style={styles.requirementsTitle}>Password Requirements</Text>
                <View style={styles.requirementItem}>
                  <Text style={passwordRequirements.minLength ? styles.checkIcon : styles.xIcon}>
                    {passwordRequirements.minLength ? "✓" : "✗"}
                  </Text>
                  <Text style={styles.requirementText}>At least 8 characters long</Text>
                </View>
                <View style={styles.requirementItem}>
                  <Text style={passwordRequirements.hasUppercase ? styles.checkIcon : styles.xIcon}>
                    {passwordRequirements.hasUppercase ? "✓" : "✗"}
                  </Text>
                  <Text style={styles.requirementText}>Contains uppercase letters</Text>
                </View>
                <View style={styles.requirementItem}>
                  <Text style={passwordRequirements.hasLowercase ? styles.checkIcon : styles.xIcon}>
                    {passwordRequirements.hasLowercase ? "✓" : "✗"}
                  </Text>
                  <Text style={styles.requirementText}>Contains lowercase letters</Text>
                </View>
                <View style={styles.requirementItem}>
                  <Text style={passwordRequirements.hasNumber ? styles.checkIcon : styles.xIcon}>
                    {passwordRequirements.hasNumber ? "✓" : "✗"}
                  </Text>
                  <Text style={styles.requirementText}>Contains numbers</Text>
                </View>
                <View style={styles.requirementItem}>
                  <Text style={passwordRequirements.hasSpecialChar ? styles.checkIcon : styles.xIcon}>
                    {passwordRequirements.hasSpecialChar ? "✓" : "✗"}
                  </Text>
                  <Text style={styles.requirementText}>Contains special characters</Text>
                </View>
                <View style={[styles.requirementItem, styles.matchRequirement]}>
                  <Text style={newPassword === confirmPassword && confirmPassword.length > 0 ? styles.checkIcon : styles.xIcon}>
                    {newPassword === confirmPassword && confirmPassword.length > 0 ? "✓" : "✗"}
                  </Text>
                  <Text style={styles.requirementText}>Passwords match</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={[
                  styles.loginButton, 
                  (isLoading || !allRequirementsMet || newPassword !== confirmPassword) && styles.loginButtonDisabled
                ]} 
                onPress={handleResetPassword}
                disabled={isLoading || !allRequirementsMet || newPassword !== confirmPassword}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.loginButtonText}>Reset Password</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  // Success Stage
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#B8763E" />

      <View style={styles.scrollContainer}>
        <Animated.View 
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Text style={styles.checkmark}>✓</Text>
            </View>
            <Text style={styles.title}>Password Reset Successful!</Text>
            <Text style={styles.description}>
              Your password has been successfully reset. You can now login with your new password.
            </Text>

            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={handleBackToLogin}
            >
              <Text style={styles.loginButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#B8763E",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(40),
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(20),
    paddingHorizontal: scale(30),
    paddingVertical: verticalScale(40),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: {
    marginBottom: verticalScale(20),
    alignSelf: "flex-start",
  },
  backButtonText: {
    fontSize: moderateScale(14),
    color: "#B8763E",
    fontWeight: "500",
  },
  title: {
    fontSize: moderateScale(20),
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: verticalScale(16),
  },
  description: {
    fontSize: moderateScale(13),
    color: "#666",
    textAlign: "center",
    marginBottom: verticalScale(30),
    lineHeight: moderateScale(20),
  },
  errorText: {
    fontSize: moderateScale(13),
    color: "#d32f2f",
    textAlign: "center",
    marginBottom: verticalScale(15),
    paddingHorizontal: scale(10),
  },
  successText: {
    fontSize: moderateScale(13),
    color: "#4CAF50",
    textAlign: "center",
    marginBottom: verticalScale(15),
    paddingHorizontal: scale(10),
  },
  inputContainer: {
    marginBottom: verticalScale(20),
  },
  inputLabel: {
    fontSize: moderateScale(13),
    color: "#666",
    marginBottom: verticalScale(8),
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: "#C9A882",
    borderRadius: moderateScale(25),
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(15),
    fontSize: moderateScale(15),
    backgroundColor: "white",
    minHeight: verticalScale(50),
  },
  textInputError: {
    borderColor: "#d32f2f",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#C9A882",
    borderRadius: moderateScale(25),
    backgroundColor: "white",
    minHeight: verticalScale(50),
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: scale(20),
    fontSize: moderateScale(15),
    color: "#333",
  },
  eyeIconContainer: {
    paddingHorizontal: moderateScale(15),
    paddingVertical: moderateScale(12),
  },
  eyeIconText: {
    fontSize: moderateScale(18),
  },
  loginButton: {
    backgroundColor: "#8B5A2B",
    borderRadius: moderateScale(25),
    paddingVertical: verticalScale(15),
    alignItems: "center",
    marginTop: verticalScale(10),
    minHeight: verticalScale(50),
    justifyContent: "center",
  },
  loginButtonDisabled: {
    backgroundColor: "#ccc",
  },
  loginButtonText: {
    color: "white",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: verticalScale(20),
  },
  successIcon: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(25),
  },
  checkmark: {
    fontSize: moderateScale(48),
    color: "white",
    fontWeight: "bold",
  },
  // OTP Styles
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: verticalScale(20),
    gap: scale(10),
  },
  otpInput: {
    width: scale(45),
    height: scale(45),
    borderWidth: 1.5,
    borderColor: "#C9A882",
    borderRadius: moderateScale(12),
    fontSize: moderateScale(20),
    fontWeight: "600",
    textAlign: "center",
    backgroundColor: "white",
  },
  otpInputFilled: {
    borderColor: "#8B5A2B",
  },
  otpInputError: {
    borderColor: "#d32f2f",
  },
  resendContainer: {
    alignItems: "center",
    marginBottom: verticalScale(20),
  },
  resendText: {
    fontSize: moderateScale(13),
    color: "#8B5A2B",
    fontWeight: "500",
  },
  resendTextDisabled: {
    color: "#999",
  },
  // Password Requirements Styles
  requirementsContainer: {
    backgroundColor: "#f5f5f5",
    borderRadius: moderateScale(12),
    padding: moderateScale(15),
    marginBottom: verticalScale(20),
  },
  requirementsTitle: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(10),
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(6),
    gap: scale(8),
  },
  matchRequirement: {
    marginTop: verticalScale(8),
    paddingTop: verticalScale(8),
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  checkIcon: {
    fontSize: moderateScale(12),
    color: "#4CAF50",
    fontWeight: "bold",
    width: scale(18),
  },
  xIcon: {
    fontSize: moderateScale(12),
    color: "#d32f2f",
    fontWeight: "bold",
    width: scale(18),
  },
  requirementText: {
    fontSize: moderateScale(11),
    color: "#666",
    flex: 1,
  },
})