// FILE: app/auth/loading.tsx
"use client"

import { useRouter } from "expo-router"
import { useEffect, useRef } from "react"  // ADD useState here
import {
  Animated,
  Dimensions,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
} from "react-native"
import * as SecureStore from "expo-secure-store"

const { width, height } = Dimensions.get("window")
const scale = (size: number) => (width / 375) * size
const verticalScale = (size: number) => (height / 812) * size

export default function LoadingScreen() {
  const router = useRouter()
  const hasNavigated = useRef(false)  // ADD THIS
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.3)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const textFadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    checkAuthAndAnimate()
    startPulseAnimation()
    
    // ADD CLEANUP
    return () => {
      hasNavigated.current = true
    }
  }, [])

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start()
  }

  const checkAuthAndAnimate = async () => {
    // Initial fade in and scale animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(textFadeAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
    ]).start()

    try {
      const accessToken = await SecureStore.getItemAsync("access_token")
      const userData = await SecureStore.getItemAsync("user_data")

      await new Promise(resolve => setTimeout(resolve, 8000))

      // ADD CHECK HERE
      if (hasNavigated.current) return

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(textFadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (hasNavigated.current) return
        hasNavigated.current = true
        
        if (accessToken && userData) {
          const user = JSON.parse(userData)
          const userRole = user.user_role?.trim()

          if (userRole === "Kutsero") {
            router.replace("../KUTSERO/dashboard")
          } else if (userRole === "Horse Operator") {
            router.replace("../HORSE_OPERATOR/home")
          } else {
            router.replace("/auth/login")
          }
        } else {
          router.replace("/auth/login")
        }
      })
    } catch (error) {
      console.error("Error checking auth:", error)
      if (!hasNavigated.current) {
        hasNavigated.current = true
        router.replace("/auth/login")
      }
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#D4935C" />
      
      <View style={styles.gradientOverlay} />
      
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Image
              source={require("../../assets/images/echo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
        </Animated.View>
        
        <Animated.View style={[styles.loadingTextContainer, { opacity: textFadeAnim }]}>
          <Text style={styles.loadingText}>Loading...</Text>
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
  loadingTextContainer: {
    position: "absolute",
    bottom: verticalScale(80),
    alignItems: "center",
  },
  loadingText: {
    fontSize: scale(16),
    color: "#FFFFFF",
    fontWeight: "500",
    letterSpacing: 1,
  },
})