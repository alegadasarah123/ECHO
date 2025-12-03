import { useRouter } from 'expo-router'
import { useState } from "react"
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
} from "react-native"

const { width, height } = Dimensions.get("window")

const scale = (size: number) => (width / 375) * size
const verticalScale = (size: number) => (height / 812) * size
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const [stage, setStage] = useState<"email" | "reset" | "success">("email")
  const [email, setEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Check if email exists
  const handleCheckEmail = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address")
      return
    }

    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("http://192.168.31.58:8000/api/forgot-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Email not found.")
        Alert.alert("Error", data.error || "Email not found. Please check and try again.")
      } else if (data.exists) {
        // Email exists, move to password reset stage
        setStage("reset")
        setError("")
      }
    } catch (err) {
      console.error("Network error:", err)
      setError("Network error. Please check your connection.")
      Alert.alert("Connection Error", "Unable to connect to server. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Reset password
  const handleResetPassword = async () => {
    setError("")

    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields.")
      Alert.alert("Error", "Please fill in all fields.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.")
      Alert.alert("Error", "Passwords do not match.")
      return
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.")
      Alert.alert("Error", "Password must be at least 6 characters.")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("http://192.168.31.58:8000/api/reset-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          newPassword: newPassword.trim() 
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to reset password.")
        Alert.alert("Error", data.error || "Failed to reset password. Please try again.")
      } else {
        // Success - show success stage
        setStage("success")
        setError("")
        setNewPassword("")
        setConfirmPassword("")
      }
    } catch (err) {
      console.error("Network error:", err)
      setError("Network error. Please try again.")
      Alert.alert("Connection Error", "Unable to connect to server. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToLogin = () => {
    router.replace('/auth/login')
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
              Enter the email address or phone number associated with your account. We'll send you a verification code via SMS to reset your password.
            </Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={(text) => {
                  setEmail(text)
                  setError("")
                }}
                placeholder="Enter email or phone"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity 
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} 
              onPress={handleCheckEmail}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
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
              Enter your new password for {email}
            </Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={newPassword}
                  onChangeText={(text) => {
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
                  <View style={styles.eyeIcon}>
                    {showNewPassword ? (
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

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={(text) => {
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
                  <View style={styles.eyeIcon}>
                    {showConfirmPassword ? (
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
  inputContainer: {
    marginBottom: verticalScale(20),
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
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(15),
    fontSize: moderateScale(15),
    backgroundColor: "white",
    minHeight: verticalScale(50),
    textAlign: "center",
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
    textAlign: "center",
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
  loginButton: {
    backgroundColor: "#8B5A2B",
    borderRadius: moderateScale(25),
    paddingVertical: verticalScale(15),
    alignItems: "center",
    marginTop: verticalScale(10),
    marginBottom: verticalScale(20),
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
  backLinkContainer: {
    alignItems: "center",
  },
  backLinkText: {
    color: "#8B5A2B",
    fontSize: moderateScale(10),
    textDecorationLine: "underline",
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
})