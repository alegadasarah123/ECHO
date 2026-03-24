import { useRouter } from 'expo-router'
import { useState, useEffect, useRef } from "react"
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  TextInput as RNTextInput,
} from "react-native"

const { width, height } = Dimensions.get("window")

const scale = (size: number) => (width / 375) * size
const verticalScale = (size: number) => (height / 812) * size
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor

type Stage = "email" | "otp" | "reset" | "success"

interface PasswordRequirements {
  minLength: boolean
  hasUppercase: boolean
  hasLowercase: boolean
  hasNumber: boolean
  hasSpecialChar: boolean
}

// API Base URL
const API_BASE_URL = "https://echo-ebl8.onrender.com/api"

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>("email")
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
  
  const otpInputRefs = useRef<(RNTextInput | null)[]>([])
  
  const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirements>({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false
  })

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  const validatePassword = (password: string): PasswordRequirements => {
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>_]/.test(password)
    }
  }

  useEffect(() => {
    setPasswordRequirements(validatePassword(newPassword))
  }, [newPassword])

  const isPasswordValid = (): boolean => {
    const reqs = validatePassword(newPassword)
    return reqs.minLength && reqs.hasUppercase && reqs.hasLowercase && reqs.hasNumber && reqs.hasSpecialChar
  }

  // Send OTP
  const handleSendOTP = async (): Promise<void> => {
    const trimmedEmail = email.trim().toLowerCase()
    
    if (!trimmedEmail) {
      Alert.alert("Error", "Please enter your email address")
      return
    }

    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      Alert.alert("Error", "Please enter a valid email address")
      return
    }

    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/forgot-password/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: trimmedEmail }),
      })

      const data = await response.json()

      if (response.ok && data.exists) {
        setSuccess("✓ OTP sent! Check your email")
        setStage("otp")
        setResendTimer(30)
        setOtp(["", "", "", "", "", ""])
        // Focus first OTP input
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100)
      } else {
        setError(data.error || "Email not registered")
        Alert.alert("Error", data.error || "Email not found. Please check and try again.")
      }
    } catch (err) {
      console.error("Network error:", err)
      setError("Network error. Please check your connection.")
      Alert.alert("Connection Error", "Unable to connect to server. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Verify OTP
  const handleVerifyOTP = async (): Promise<void> => {
    const otpCode = otp.join("")
    
    if (otpCode.length !== 6) {
      setError("Please enter the 6-digit code")
      Alert.alert("Error", "Please enter the 6-digit OTP")
      return
    }

    setError("")
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/verify-otp/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          otp: otpCode,
          purpose: "password_reset"
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("✓ OTP verified! Set your new password")
        setStage("reset")
        setError("")
      } else {
        setError(data.error || "Invalid OTP")
        Alert.alert("Error", data.error || "Invalid OTP. Please try again.")
      }
    } catch (err) {
      console.error("Network error:", err)
      setError("Network error. Please try again.")
      Alert.alert("Connection Error", "Unable to connect to server. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Resend OTP
  const handleResendOTP = async (): Promise<void> => {
    if (resendTimer > 0) return
    
    setIsLoading(true)
    setError("")
    
    try {
      const response = await fetch(`${API_BASE_URL}/resend-otp/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          purpose: "password_reset" 
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("✓ New OTP sent!")
        setResendTimer(30)
        setOtp(["", "", "", "", "", ""])
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100)
      } else {
        setError(data.error || "Failed to resend OTP")
        Alert.alert("Error", data.error || "Failed to resend OTP. Please try again.")
      }
    } catch (err) {
      console.error("Network error:", err)
      setError("Network error. Please try again.")
      Alert.alert("Connection Error", "Unable to connect to server. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Reset password
  const handleResetPassword = async (): Promise<void> => {
    setError("")

    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields")
      Alert.alert("Error", "Please fill in all fields")
      return
    }

    if (!isPasswordValid()) {
      setError("Password must have 8+ chars, uppercase & number")
      Alert.alert("Error", "Password must be at least 8 characters with uppercase and number")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      Alert.alert("Error", "Passwords do not match")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/reset-password/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          newPassword: newPassword.trim() 
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("✓ Password reset successful!")
        setStage("success")
        setNewPassword("")
        setConfirmPassword("")
        setOtp(["", "", "", "", "", ""])
      } else {
        setError(data.error || "Failed to reset password")
        Alert.alert("Error", data.error || "Failed to reset password. Please try again.")
      }
    } catch (err) {
      console.error("Network error:", err)
      setError("Network error. Please try again.")
      Alert.alert("Connection Error", "Unable to connect to server. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToLogin = (): void => {
    router.replace('/auth/login')
  }

  const handleOtpChange = (text: string, index: number): void => {
    if (text.length > 1) return
    if (text && !/^\d*$/.test(text)) return
    
    const newOtp = [...otp]
    newOtp[index] = text
    setOtp(newOtp)
    
    if (text && index < 5) {
      otpInputRefs.current[index + 1]?.focus()
    }
    
    // Auto-submit when all digits filled
    if (text && index === 5 && newOtp.every(digit => digit !== "")) {
      setTimeout(() => handleVerifyOTP(), 100)
    }
  }

  const handleOtpKeyPress = (e: any, index: number): void => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  // Email Stage
  if (stage === "email") {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#B8763E" />
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.description}>
              Enter your email address to receive a verification code
            </Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {success ? <Text style={styles.successText}>{success}</Text> : null}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.textInput}
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
                autoFocus={true}
              />
            </View>

            <TouchableOpacity 
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} 
              onPress={handleSendOTP}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.loginButtonText}>Send Code</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.backLinkContainer} 
              onPress={handleBackToLogin}
              disabled={isLoading}
            >
              <Text style={styles.backLinkText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // OTP Verification Stage
  if (stage === "otp") {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#B8763E" />
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.title}>Verify Code</Text>
            <Text style={styles.description}>
              Enter the 6-digit code sent to {email}
            </Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {success ? <Text style={styles.successText}>{success}</Text> : null}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Verification Code</Text>
              <View style={styles.otpContainer}>
                {otp.map((digit: string, index: number) => (
                  <TextInput
                    key={index}
                    ref={(ref: RNTextInput | null) => {
                      otpInputRefs.current[index] = ref
                    }}
                    style={styles.otpInput}
                    value={digit}
                    onChangeText={(text: string) => handleOtpChange(text, index)}
                    onKeyPress={(e: any) => handleOtpKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center"
                    editable={!isLoading}
                  />
                ))}
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} 
              onPress={handleVerifyOTP}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.loginButtonText}>Verify</Text>
              )}
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <TouchableOpacity 
                onPress={handleResendOTP}
                disabled={resendTimer > 0 || isLoading}
              >
                <Text style={[
                  styles.resendText,
                  (resendTimer > 0 || isLoading) && styles.resendDisabled
                ]}>
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Code"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.backLinkContainer} 
              onPress={() => setStage("email")}
              disabled={isLoading}
            >
              <Text style={styles.backLinkText}>Back</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Reset Password Stage
  if (stage === "reset") {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#B8763E" />
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.description}>
              Create a new password for your account
            </Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

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

            {/* Password Requirements */}
            {newPassword.length > 0 && (
              <View style={styles.requirementsContainer}>
                <Text style={styles.requirementsTitle}>Password must have:</Text>
                <View style={styles.requirementItem}>
                  <Text style={passwordRequirements.minLength ? styles.checkIcon : styles.xIcon}>
                    {passwordRequirements.minLength ? "✓" : "○"}
                  </Text>
                  <Text style={styles.requirementText}>At least 8 characters</Text>
                </View>
                <View style={styles.requirementItem}>
                  <Text style={passwordRequirements.hasUppercase ? styles.checkIcon : styles.xIcon}>
                    {passwordRequirements.hasUppercase ? "✓" : "○"}
                  </Text>
                  <Text style={styles.requirementText}>Uppercase letter (A-Z)</Text>
                </View>
                <View style={styles.requirementItem}>
                  <Text style={passwordRequirements.hasLowercase ? styles.checkIcon : styles.xIcon}>
                    {passwordRequirements.hasLowercase ? "✓" : "○"}
                  </Text>
                  <Text style={styles.requirementText}>Lowercase letter (a-z)</Text>
                </View>
                <View style={styles.requirementItem}>
                  <Text style={passwordRequirements.hasNumber ? styles.checkIcon : styles.xIcon}>
                    {passwordRequirements.hasNumber ? "✓" : "○"}
                  </Text>
                  <Text style={styles.requirementText}>Number (0-9)</Text>
                </View>
                <View style={styles.requirementItem}>
                  <Text style={passwordRequirements.hasSpecialChar ? styles.checkIcon : styles.xIcon}>
                    {passwordRequirements.hasSpecialChar ? "✓" : "○"}
                  </Text>
                  <Text style={styles.requirementText}>Special character (!@#$%^&*)</Text>
                </View>
                {confirmPassword.length > 0 && (
                  <View style={[styles.requirementItem, styles.matchRequirement]}>
                    <Text style={newPassword === confirmPassword ? styles.checkIcon : styles.xIcon}>
                      {newPassword === confirmPassword ? "✓" : "○"}
                    </Text>
                    <Text style={styles.requirementText}>Passwords match</Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity 
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} 
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.loginButtonText}>Reset Password</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.backLinkContainer} 
              onPress={() => setStage("otp")}
              disabled={isLoading}
            >
              <Text style={styles.backLinkText}>Back</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Success Stage
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#B8763E" />
      <View style={styles.scrollContainer}>
        <View style={styles.card}>
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Text style={styles.checkmark}>✓</Text>
            </View>
            <Text style={styles.title}>Success!</Text>
            <Text style={styles.description}>
              Your password has been reset successfully.
            </Text>
            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={handleBackToLogin}
            >
              <Text style={styles.loginButtonText}>Login Now</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingHorizontal: scale(25),
    paddingVertical: verticalScale(35),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: moderateScale(22),
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: verticalScale(12),
  },
  description: {
    fontSize: moderateScale(13),
    color: "#666",
    textAlign: "center",
    marginBottom: verticalScale(25),
    lineHeight: moderateScale(18),
  },
  errorText: {
    fontSize: moderateScale(12),
    color: "#d32f2f",
    textAlign: "center",
    marginBottom: verticalScale(12),
  },
  successText: {
    fontSize: moderateScale(12),
    color: "#4CAF50",
    textAlign: "center",
    marginBottom: verticalScale(12),
  },
  inputContainer: {
    marginBottom: verticalScale(18),
  },
  inputLabel: {
    fontSize: moderateScale(13),
    color: "#666",
    marginBottom: verticalScale(8),
    textAlign: "center",
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: "#C9A882",
    borderRadius: moderateScale(25),
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(14),
    fontSize: moderateScale(15),
    backgroundColor: "white",
    textAlign: "center",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#C9A882",
    borderRadius: moderateScale(25),
    backgroundColor: "white",
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(14),
    fontSize: moderateScale(15),
    color: "#333",
    textAlign: "center",
  },
  eyeIconContainer: {
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(10),
  },
  eyeIconText: {
    fontSize: moderateScale(18),
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: scale(8),
  },
  otpInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#C9A882",
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(18),
    fontWeight: "600",
    backgroundColor: "white",
    textAlign: "center",
  },
  resendContainer: {
    alignItems: "center",
    marginTop: verticalScale(8),
    marginBottom: verticalScale(18),
  },
  resendText: {
    color: "#8B5A2B",
    fontSize: moderateScale(12),
    textDecorationLine: "underline",
  },
  resendDisabled: {
    color: "#ccc",
    textDecorationLine: "none",
  },
  requirementsContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: moderateScale(10),
    padding: scale(12),
    marginBottom: verticalScale(18),
  },
  requirementsTitle: {
    fontSize: moderateScale(11),
    fontWeight: "600",
    color: "#666",
    marginBottom: verticalScale(8),
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(4),
  },
  matchRequirement: {
    marginTop: verticalScale(4),
    paddingTop: verticalScale(4),
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  requirementText: {
    fontSize: moderateScale(11),
    color: "#666",
    marginLeft: scale(8),
  },
  checkIcon: {
    fontSize: moderateScale(12),
    color: "#4CAF50",
    width: scale(16),
  },
  xIcon: {
    fontSize: moderateScale(12),
    color: "#999",
    width: scale(16),
  },
  loginButton: {
    backgroundColor: "#8B5A2B",
    borderRadius: moderateScale(25),
    paddingVertical: verticalScale(14),
    alignItems: "center",
    marginTop: verticalScale(8),
    marginBottom: verticalScale(18),
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
  backLinkContainer: {
    alignItems: "center",
  },
  backLinkText: {
    color: "#8B5A2B",
    fontSize: moderateScale(11),
    textDecorationLine: "underline",
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: verticalScale(15),
  },
  successIcon: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(18),
  },
  checkmark: {
    fontSize: moderateScale(35),
    color: "white",
    fontWeight: "bold",
  },
})