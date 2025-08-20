"use client"

import { useRouter } from "expo-router"
import { useCallback, useState } from "react"
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
import * as SecureStore from "expo-secure-store"

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

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields")
      return
    }

    setIsLoginLoading(true)

    try {
      const response = await fetch("http://192.168.1.8:8000/api/kutsero/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })

      const data = await response.json()
      console.log("Login response:", data)

      if (response.ok) {
        // Store tokens securely
        await SecureStore.setItemAsync("access_token", data.access_token)
        await SecureStore.setItemAsync("refresh_token", data.refresh_token)

        // Route based on user role
        if (data.user_role === "kutsero") {
          router.replace("/KUTSERO/dashboard")
        } else if (data.user_role === "horse_operator") {
          router.replace("/HORSE_OPERATOR/home")
        } else {
          Alert.alert("Error", "Unknown user role")
          return
        }

        const statusMsg = data.user_status === "pending" ? "Your account is pending approval" : ""
        Alert.alert("Login Successful", `Welcome ${data.user?.email || "User"}! ${statusMsg}`, [{ text: "OK" }])
      } else {
        const errorMessage = data.error || "Login failed"
        Alert.alert("Login Failed", errorMessage)
      }
    } catch (error) {
      console.error("Login error:", error)
      Alert.alert("Error", "Network error. Please try again.")
    } finally {
      setIsLoginLoading(false)
    }
  }

  const toggleShowPassword = useCallback(() => setShowPassword(prev => !prev), [])
  const handleShowSignup = useCallback(() => router.push("./pages/auth/signup"), [router])
  const handleShowForgotPassword = useCallback(() => router.push("./pages/auth/forgot-password"), [router])

  return (
    <SafeAreaView style={styles.loginContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#B8763E" />
      <View style={styles.headerSection}>
        <View style={styles.headerLogoContainer}>
          <Image source={require("../assets/images/logo.png")} style={styles.headerLogo} resizeMode="contain" />
        </View>
      </View>

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
            <TouchableOpacity style={styles.eyeIconContainer} onPress={toggleShowPassword} disabled={isLoginLoading}>
              <View style={styles.eyeIcon}>
                {showPassword ? <View style={styles.eyeOpen}><View style={styles.eyeball} /></View> :
                  <View style={styles.eyeClosed}><View style={styles.eyeball} /><View style={styles.eyeLine} /></View>}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.forgotPasswordContainer} onPress={handleShowForgotPassword} disabled={isLoginLoading}>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.signInButton, isLoginLoading && styles.disabledButton]} onPress={handleLogin} disabled={isLoginLoading}>
          <Text style={styles.signInButtonText}>{isLoginLoading ? "Signing In..." : "Sign In"}</Text>
        </TouchableOpacity>

        <View style={styles.signUpContainer}>
          <Text style={styles.signUpText}>
            Don't have an account?{" "}
            <Text style={[styles.signUpLink, isLoginLoading && styles.disabledText]} onPress={isLoginLoading ? undefined : handleShowSignup}>
              Sign Up
            </Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

// ------------------- Styles -------------------
const styles = StyleSheet.create({
  loginContainer: { flex: 1, backgroundColor: "#B8763E" },
  headerSection: { backgroundColor: "#B8763E", paddingTop: verticalScale(40), paddingBottom: verticalScale(60), alignItems: "center" },
  headerLogoContainer: { width: scale(120), height: verticalScale(100), justifyContent: "center", alignItems: "center" },
  headerLogo: { width: "100%", height: "100%", maxWidth: scale(100), maxHeight: verticalScale(80) },
  loginSection: { flex: 1, backgroundColor: "white", borderTopLeftRadius: moderateScale(30), borderTopRightRadius: moderateScale(30), paddingHorizontal: scale(30), paddingTop: verticalScale(40), marginTop: verticalScale(-30) },
  welcomeText: { fontSize: moderateScale(24), fontWeight: "600", color: "#333", textAlign: "center", marginBottom: verticalScale(40) },
  inputContainer: { marginBottom: verticalScale(20), width: "100%" },
  inputLabel: { fontSize: moderateScale(14), color: "#666", marginBottom: verticalScale(8) },
  textInput: { borderWidth: 1, borderColor: "#ddd", borderRadius: moderateScale(25), paddingHorizontal: scale(20), paddingVertical: verticalScale(15), fontSize: moderateScale(16), backgroundColor: "white", width: "100%" },
  passwordInputContainer: { position: "relative", width: "100%" },
  passwordInput: { borderWidth: 1, borderColor: "#ddd", borderRadius: moderateScale(25), paddingHorizontal: scale(20), paddingVertical: verticalScale(15), paddingRight: scale(50), fontSize: moderateScale(16), backgroundColor: "white", width: "100%" },
  eyeIconContainer: { position: "absolute", right: scale(15), top: "50%", transform: [{ translateY: verticalScale(-12) }], width: scale(34), height: verticalScale(34), justifyContent: "center", alignItems: "center" },
  eyeIcon: { width: scale(24), height: verticalScale(24), justifyContent: "center", alignItems: "center" },
  eyeOpen: { width: scale(20), height: verticalScale(12), borderWidth: 2, borderColor: "#666", borderRadius: moderateScale(10), justifyContent: "center", alignItems: "center" },
  eyeClosed: { width: scale(20), height: verticalScale(12), borderWidth: 2, borderColor: "#666", borderRadius: moderateScale(10), justifyContent: "center", alignItems: "center", position: "relative" },
  eyeball: { width: scale(6), height: verticalScale(6), backgroundColor: "#666", borderRadius: moderateScale(3) },
  eyeLine: { position: "absolute", width: scale(24), height: 2, backgroundColor: "#666", transform: [{ rotate: "45deg" }] },
  forgotPasswordContainer: { alignItems: "flex-end", marginBottom: verticalScale(30), marginTop: verticalScale(10) },
  forgotPasswordText: { color: "#B8763E", fontSize: moderateScale(14) },
  signInButton: { backgroundColor: "#B8763E", borderRadius: moderateScale(25), paddingVertical: verticalScale(15), alignItems: "center", marginBottom: verticalScale(30), width: "100%", justifyContent: "center" },
  disabledButton: { backgroundColor: "#ccc", opacity: 0.7 },
  signInButtonText: { color: "white", fontSize: moderateScale(16), fontWeight: "600" },
  signUpContainer: { alignItems: "center", marginTop: verticalScale(20), paddingBottom: verticalScale(30) },
  signUpText: { fontSize: moderateScale(14), color: "#666", textAlign: "center" },
  signUpLink: { color: "#B8763E", fontWeight: "600" },
  disabledText: { color: "#ccc" }
})
