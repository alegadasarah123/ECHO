import { useRouter } from 'expo-router'
import { useState } from "react"
import {
    Alert,
    Dimensions,
    SafeAreaView,
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
  const [email, setEmail] = useState("")

  const handleResetPassword = () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address")
      return
    }
    
    Alert.alert(
      "Reset Link Sent", 
      "A password reset link has been sent to your email address.",
      [{ text: "OK", onPress: () => router.replace('/') }]
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#B8763E" />

      <View style={styles.headerSection} />

      <View style={styles.contentSection}>
        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>
          Enter your email address and we'll send you a link to reset your password.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={styles.textInput}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={handleResetPassword}>
          <Text style={styles.resetButtonText}>Send Reset Link</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backToLoginContainer} onPress={() => router.replace('/')}>
          <Text style={styles.backToLoginText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#B8763E",
  },
  headerSection: {
    backgroundColor: "#B8763E",
    paddingTop: verticalScale(40),
    paddingBottom: verticalScale(60),
    minHeight: verticalScale(180),
  },
  contentSection: {
    flex: 1,
    backgroundColor: "white",
    borderTopLeftRadius: moderateScale(30),
    borderTopRightRadius: moderateScale(30),
    paddingHorizontal: scale(30),
    paddingTop: verticalScale(40),
    marginTop: verticalScale(-30),
  },
  title: {
    fontSize: moderateScale(24),
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: verticalScale(16),
  },
  subtitle: {
    fontSize: moderateScale(14),
    color: "#666",
    textAlign: "center",
    marginBottom: verticalScale(40),
    lineHeight: moderateScale(20),
  },
  inputContainer: {
    marginBottom: verticalScale(30),
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
    minHeight: verticalScale(50),
  },
  resetButton: {
    backgroundColor: "#B8763E",
    borderRadius: moderateScale(25),
    paddingVertical: verticalScale(15),
    alignItems: "center",
    marginBottom: verticalScale(30),
    minHeight: verticalScale(50),
    justifyContent: "center",
  },
  resetButtonText: {
    color: "white",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
  backToLoginContainer: {
    alignItems: "center",
  },
  backToLoginText: {
    color: "#B8763E",
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
})
