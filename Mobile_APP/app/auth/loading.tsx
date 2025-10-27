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
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor

export default function LoadingScreen() {
  const router = useRouter()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.3)).current
  const translateY = useRef(new Animated.Value(0)).current
  const rotateAnim = useRef(new Animated.Value(0)).current
  
  // Multiple pulse circles
  const pulse1 = useRef(new Animated.Value(0)).current
  const pulse2 = useRef(new Animated.Value(0)).current
  const pulse3 = useRef(new Animated.Value(0)).current
  
  // Shimmer effect
  const shimmerAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    checkAuthAndAnimate()
  }, [])

  const checkAuthAndAnimate = async () => {
    // Create pulsing circles animation
    const createPulse = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      )
    }

    // Shimmer effect
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start()

    // Start all pulse animations
    createPulse(pulse1, 0).start()
    createPulse(pulse2, 400).start()
    createPulse(pulse3, 800).start()

    // Initial fade in and scale animation with rotation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start()

    // Check if user is already logged in
    try {
      const accessToken = await SecureStore.getItemAsync("access_token")
      const userData = await SecureStore.getItemAsync("user_data")

      // Wait for initial animation to complete
      await new Promise(resolve => setTimeout(resolve, 2500))

      // Calculate the distance to move the logo up
      const centerY = height / 2
      const targetY = verticalScale(40) + scale(75)
      const distance = -(centerY - targetY)

      // Start transition animation
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: distance,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          delay: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 700,
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

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  })

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#B8763E" />
      
      {/* Gradient overlay effect */}
      <View style={styles.gradientOverlay} />
      
      <View style={styles.content}>
        {/* Animated pulse circles */}
        {[pulse1, pulse2, pulse3].map((pulse, index) => (
          <Animated.View
            key={index}
            style={[
              styles.pulseCircle,
              {
                opacity: pulse.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.3, 0.15, 0],
                }),
                transform: [
                  {
                    scale: pulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 2.5],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}

        {/* Main logo container with shadow */}
        <Animated.View
          style={[
            styles.logoShadow,
            {
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.3],
              }),
              transform: [
                { scale: scaleAnim },
                { translateY: translateY },
              ],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: translateY },
                { rotate: spin },
              ],
            },
          ]}
        >
          <View style={styles.logoWrapper}>
            <Image
              source={require("../../assets/images/echo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            
            {/* Shimmer effect overlay */}
            <Animated.View
              style={[
                styles.shimmer,
                {
                  transform: [{ translateX: shimmerTranslate }],
                },
              ]}
            />
          </View>
        </Animated.View>

        {/* Decorative elements */}
        <Animated.View
          style={[
            styles.decorativeCircle,
            styles.decorCircle1,
            {
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.15],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.decorativeCircle,
            styles.decorCircle2,
            {
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.1],
              }),
            },
          ]}
        />

        {/* Loading text */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.loadingDots}>
            {[0, 1, 2].map((index) => (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    opacity: pulse1.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: index === 0 ? [1, 0.3, 1] : index === 1 ? [0.3, 1, 0.3] : [1, 0.3, 1],
                    }),
                  },
                ]}
              />
            ))}
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
  gradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  logoWrapper: {
    position: "relative",
    overflow: "hidden",
    borderRadius: scale(85),
  },
  logo: {
    width: scale(170),
    height: scale(170),
  },
  logoShadow: {
    position: "absolute",
    width: scale(170),
    height: scale(170),
    borderRadius: scale(85),
    backgroundColor: "#000",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  shimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: scale(100),
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    transform: [{ skewX: "-20deg" }],
  },
  pulseCircle: {
    position: "absolute",
    width: scale(300),
    height: scale(300),
    borderRadius: scale(150),
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  decorativeCircle: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 1000,
  },
  decorCircle1: {
    width: scale(400),
    height: scale(400),
    top: -scale(200),
    right: -scale(100),
  },
  decorCircle2: {
    width: scale(300),
    height: scale(300),
    bottom: -scale(150),
    left: -scale(100),
  },
  textContainer: {
    position: "absolute",
    bottom: verticalScale(100),
    alignItems: "center",
  },
  loadingDots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
  },
  dot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: "#FFFFFF",
  },
})