// FILE: app/auth/loading.tsx
"use client"

import { useRouter } from "expo-router"
import { useEffect, useRef } from "react"
import {
  Animated,
  Dimensions,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native"
import * as SecureStore from "expo-secure-store"

const { width, height } = Dimensions.get("window")
const scale = (size: number) => (width / 375) * size
const verticalScale = (size: number) => (height / 812) * size

export default function LoadingScreen() {
  const router = useRouter()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.3)).current
  const translateY = useRef(new Animated.Value(0)).current

  useEffect(() => {
    checkAuthAndAnimate()
  }, [])

  const checkAuthAndAnimate = async () => {
    // Initial fade in and scale animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start()

    // Check if user is already logged in
    try {
      const accessToken = await SecureStore.getItemAsync("access_token")
      const userData = await SecureStore.getItemAsync("user_data")

      // Wait for initial animation to complete
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Calculate the distance to move the logo up
      const centerY = height / 2
      const targetY = verticalScale(40) + scale(75) // Position where logo should be in login screen
      const distance = -(centerY - targetY)

      // Start transition animation - move up and fade out
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: distance,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          delay: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Navigate based on auth status
        if (accessToken && userData) {
          const user = JSON.parse(userData)
          const userRole = user.user_role?.trim()

          // Route to appropriate dashboard if logged in
          if (userRole === "Kutsero") {
            router.replace("../KUTSERO/dashboard")
          } else if (userRole === "Horse Operator") {
            router.replace("../HORSE_OPERATOR/home")
          } else {
            router.replace("/auth/login")
          }
        } else {
          // Not logged in, go to login
          router.replace("/auth/login")
        }
      })
    } catch (error) {
      console.error("Error checking auth:", error)
      router.replace("/auth/login")
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#D4935C" />
      
      {/* Gradient overlay effect */}
      <View style={styles.gradientOverlay} />
      
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: translateY },
              ],
            },
          ]}
        >
          <Image
            source={require("../../assets/images/echo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D4935C",
  },
  gradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: scale(200),
    height: scale(200),
  },
})