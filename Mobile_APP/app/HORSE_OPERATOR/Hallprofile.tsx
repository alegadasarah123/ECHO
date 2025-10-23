"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Platform,
  Alert,
} from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { FontAwesome5 } from "@expo/vector-icons"
import * as SecureStore from "expo-secure-store"

const { width, height } = Dimensions.get("window")

const scale = (size: number) => {
  const scaleFactor = width / 375
  return Math.max(Math.min(size * scaleFactor, size * 1.2), size * 0.8)
}

const verticalScale = (size: number) => {
  const scaleFactor = height / 812
  return Math.max(Math.min(size * scaleFactor, size * 1.15), size * 0.85)
}

const moderateScale = (size: number, factor = 0.5) => {
  return size + (scale(size) - size) * factor
}

const API_BASE_URL = "http://192.168.101.2:8000/api/horse_operator"

interface UserProfile {
  id: string
  email: string
  role: string
  status: string
  profile: {
    fname: string
    mname?: string
    lname: string
    username?: string
    email: string
    phone?: string
    city?: string
    province?: string
    profile_image?: string
  }
}

interface VetSchedule {
  sched_id: string
  sched_date: string
  formatted_date: string
  day_of_week: string
  start_time: string
  end_time: string
  time_display: string
  start_time_formatted: string
  end_time_formatted: string
  is_available: boolean
}

interface Contact {
  id: string
  name: string
  avatar: string
  role: string
}

export default function UnifiedProfileView() {
  const router = useRouter()
  const params = useLocalSearchParams()

  const [loading, setLoading] = useState(true)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [profileData, setProfileData] = useState<UserProfile | null>(null)
  const [vetSchedules, setVetSchedules] = useState<VetSchedule[]>([])

  const hasLoadedProfile = useRef(false)

  const fetchVetSchedule = useCallback(async (vetId: string) => {
    try {
      setScheduleLoading(true)
      const storedAccessToken = await SecureStore.getItemAsync("access_token")

      if (!storedAccessToken) {
        throw new Error("No access token found")
      }

      console.log("📅 Fetching schedule for vet:", vetId)

      const response = await fetch(`${API_BASE_URL}/get_vet_schedule_for_profile/?vet_id=${vetId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${storedAccessToken}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const scheduleData = await response.json()
        console.log("✅ Schedule loaded:", scheduleData)
        setVetSchedules(scheduleData.schedules || [])
      } else {
        console.log("⚠️ No schedule data available")
        setVetSchedules([])
      }
    } catch (error) {
      console.error("❌ Error fetching vet schedule:", error)
      setVetSchedules([])
    } finally {
      setScheduleLoading(false)
    }
  }, [])

  const fetchUserProfile = useCallback(
    async (userId: string) => {
      try {
        setLoading(true)
        const storedAccessToken = await SecureStore.getItemAsync("access_token")

        if (!storedAccessToken) {
          throw new Error("No access token found")
        }

        console.log("🔍 Fetching unified profile for user:", userId)

        // ✅ UPDATED: Use unified get_user_profile endpoint
        const response = await fetch(`${API_BASE_URL}/get_user_profile/${userId}/`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${storedAccessToken}`,
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const result = await response.json()
          
          if (result.success && result.user) {
            const userData = result.user
            console.log("✅ Profile loaded from unified API:", userData)
            console.log("User type:", result.user_type)
            setProfileData(userData)

            // If user is a regular veterinarian, fetch their schedule
            const isRegularVet = userData.role === "Veterinarian"
            if (isRegularVet) {
              await fetchVetSchedule(userData.id)
            }
          } else {
            throw new Error(result.error || "Failed to fetch user profile")
          }
        } else {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to fetch user profile")
        }
      } catch (error) {
        console.error("❌ Error fetching user profile:", error)
        Alert.alert("Error", "Failed to load user profile")
        router.back()
      } finally {
        setLoading(false)
      }
    },
    [router, fetchVetSchedule],
  )

  useEffect(() => {
    loadCurrentUser()
  }, [])

  useEffect(() => {
    if (hasLoadedProfile.current) return

    const loadProfile = async () => {
      if (params.userData) {
        try {
          const userData = typeof params.userData === "string" ? JSON.parse(params.userData) : params.userData

          console.log("📦 Using passed userData:", userData)
          await fetchUserProfile(userData.user_id || userData.id)
          hasLoadedProfile.current = true
        } catch (error) {
          console.error("❌ Error parsing user data:", error)
          Alert.alert("Error", "Failed to load user profile")
          router.back()
        }
      } else if (params.userId) {
        console.log("🆔 Fetching profile for userId:", params.userId)
        await fetchUserProfile(params.userId as string)
        hasLoadedProfile.current = true
      } else {
        console.error("❌ No user data or userId provided")
        Alert.alert("Error", "No user data provided")
        router.back()
      }
    }

    loadProfile()
  }, [params.userData, params.userId, fetchUserProfile, router])

  const loadCurrentUser = async () => {
    try {
      const storedUserData = await SecureStore.getItemAsync("user_data")
      if (storedUserData) {
        const parsedUserData = JSON.parse(storedUserData)
        setCurrentUserId(parsedUserData.id)
        console.log("👤 Current user ID:", parsedUserData.id)
      }
    } catch (error) {
      console.error("❌ Error loading current user:", error)
    }
  }

  const getUserRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case "horse operator":
        return { bg: "#E3F2FD", text: "#CD853F" }
      case "kutsero":
        return { bg: "#E8F5E9", text: "#CD853F" }
      case "veterinarian":
        return { bg: "#F3E5F5", text: "#10B981" }
      case "ctu-vetmed":
        return { bg: "#FFF3E0", text: "#10B981" }
      case "dvmf":
        return { bg: "#FCE4EC", text: "#C2185B" }
      case "kutsero president":
        return { bg: "#F1F8E9", text: "#CD853F" }
      default:
        return { bg: "#F5F5F5", text: "#666" }
    }
  }

  const formatRoleLabel = (role: string) => {
    const roleMap: { [key: string]: string } = {
      "horse operator": "Horse Operator",
      "kutsero": "Kutsero",
      "veterinarian": "Veterinarian",
      "ctu-vetmed": "CTU Veterinarian",
      "dvmf": "DVMF",
      "kutsero president": "Kutsero President",
    }
    return roleMap[role?.toLowerCase()] || role
  }

  const handleSendMessage = async () => {
    try {
      if (!currentUserId) {
        router.replace("/auth/login")
        return
      }

      if (!profileData) {
        Alert.alert("Error", "Profile data not available")
        return
      }

      const fullName = `${profileData.profile.fname} ${profileData.profile.lname}`.trim()

      const contact: Contact = {
        id: profileData.id,
        name: fullName,
        avatar: profileData.profile.profile_image || "",
        role: profileData.role,
      }

      console.log("📱 Opening chat with:", contact.name)

      router.push({
        pathname: "/HORSE_OPERATOR/Hmessage",
        params: {
          openChat: "true",
          contactId: contact.id,
          contactName: contact.name,
          contactAvatar: contact.avatar,
          contactRole: contact.role,
          userId: currentUserId,
        },
      })
    } catch (error) {
      console.error("Error opening chat:", error)
      Alert.alert("Error", "Failed to open chat.")
    }
  }

  const handleBookAppointment = () => {
    if (!profileData) return

    const fullName = `${profileData.profile.fname} ${profileData.profile.lname}`.trim()

    console.log("📅 Booking appointment with:", fullName)

    router.push({
      pathname: "../HORSE_OPERATOR/Hbook",
      params: {
        vetId: profileData.id,
        vetName: fullName,
        vetAvatar: profileData.profile.profile_image || "",
        vetSpecialization: "General Practice",
        vetExperience: "5",
      },
    })
  }

  const handleBack = () => {
    console.log("⬅️ Going back")
    router.back()
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#C17A47" />
        <ActivityIndicator size="large" color="#C17A47" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    )
  }

  if (!profileData) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#C17A47" />
        <FontAwesome5 name="user-slash" size={scale(64)} color="#CCC" />
        <Text style={styles.errorText}>Profile not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const roleColors = getUserRoleBadgeColor(profileData.role)
  const isOwnProfile = currentUserId === profileData.id
  const fullName = `${profileData.profile.fname} ${profileData.profile.lname}`.trim()
  const phoneNumber = profileData.profile.phone
  const city = profileData.profile.city
  const province = profileData.profile.province
  const fullAddress = city && province ? `${city}, ${province}` : city || province || null
  
  // ✅ FIXED: Only define variables that are actually used
  const isRegularVet = profileData.role === "Veterinarian"

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C17A47" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backIconButton} onPress={handleBack}>
          <FontAwesome5 name="arrow-left" size={scale(20)} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarContainer}>
            {profileData.profile.profile_image ? (
              <Image source={{ uri: profileData.profile.profile_image }} style={styles.avatar} resizeMode="cover" />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>
                  {profileData.profile.fname?.[0] || ""}
                  {profileData.profile.lname?.[0] || ""}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.fullName}>{fullName}</Text>

          <View style={[styles.roleBadge, { backgroundColor: roleColors.bg }]}>
            <Text style={[styles.roleBadgeText, { color: roleColors.text }]}>
              {formatRoleLabel(profileData.role)}
            </Text>
          </View>

          {!isOwnProfile && (
            <TouchableOpacity style={styles.messageButton} onPress={handleSendMessage} activeOpacity={0.7}>
              <FontAwesome5 name="comment-dots" size={scale(16)} color="white" />
              <Text style={styles.messageButtonText}>Send Message</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <FontAwesome5 name="info-circle" size={scale(18)} color="#C17A47" />
            <Text style={styles.infoCardTitle}>Contact Information</Text>
          </View>

          <View style={styles.detailsContent}>
            {profileData.profile.email && (
              <View style={styles.contactItem}>
                <View style={styles.iconContainer}>
                  <FontAwesome5 name="envelope" size={scale(14)} color="#C17A47" />
                </View>
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactLabel}>Email</Text>
                  <Text style={styles.contactText}>{profileData.profile.email}</Text>
                </View>
              </View>
            )}

            {phoneNumber && (
              <View style={styles.contactItem}>
                <View style={styles.iconContainer}>
                  <FontAwesome5 name="phone" size={scale(14)} color="#C17A47" />
                </View>
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactLabel}>Phone</Text>
                  <Text style={styles.contactText}>{phoneNumber}</Text>
                </View>
              </View>
            )}

            {fullAddress && (
              <View style={styles.contactItem}>
                <View style={styles.iconContainer}>
                  <FontAwesome5 name="map-marker-alt" size={scale(14)} color="#C17A47" />
                </View>
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactLabel}>Address</Text>
                  <Text style={styles.contactText}>{fullAddress}</Text>
                </View>
              </View>
            )}

            {!profileData.profile.email && !phoneNumber && !fullAddress && (
              <View style={styles.noContactInfo}>
                <FontAwesome5 name="info-circle" size={scale(16)} color="#999" />
                <Text style={styles.noContactInfoText}>No contact information available</Text>
              </View>
            )}
          </View>
        </View>

        {/* Veterinarian Schedule Card - Only show for regular veterinarians */}
        {isRegularVet && (
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <FontAwesome5 name="calendar-check" size={scale(18)} color="#10B981" />
              <Text style={styles.infoCardTitle}>Available Schedule</Text>
            </View>

            {scheduleLoading ? (
              <View style={styles.scheduleLoadingContainer}>
                <ActivityIndicator size="small" color="#10B981" />
                <Text style={styles.scheduleLoadingText}>Loading schedule...</Text>
              </View>
            ) : vetSchedules.length > 0 ? (
              <View style={styles.scheduleContainer}>
                {vetSchedules.map((schedule) => (
                  <View key={schedule.sched_id} style={styles.scheduleItem}>
                    <View style={styles.scheduleDateContainer}>
                      <FontAwesome5 name="calendar" size={scale(14)} color="#10B981" />
                      <View style={styles.scheduleDateTextContainer}>
                        <Text style={styles.scheduleDayOfWeek}>{schedule.day_of_week}</Text>
                        <Text style={styles.scheduleDate}>{schedule.formatted_date}</Text>
                      </View>
                    </View>
                    <View style={styles.scheduleTimeContainer}>
                      <FontAwesome5 name="clock" size={scale(12)} color="#666" />
                      <Text style={styles.scheduleTime}>{schedule.time_display}</Text>
                    </View>
                  </View>
                ))}

                {!isOwnProfile && (
                  <TouchableOpacity
                    style={styles.viewAllScheduleButton}
                    onPress={handleBookAppointment}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewAllScheduleText}>Book an Appointment</Text>
                    <FontAwesome5 name="arrow-right" size={scale(12)} color="#10B981" />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.noScheduleContainer}>
                <FontAwesome5 name="calendar-times" size={scale(32)} color="#CCC" />
                <Text style={styles.noScheduleText}>No available schedule at the moment</Text>
              </View>
            )}
          </View>
        )}

        {/* Own Profile Note */}
        {isOwnProfile && (
          <View style={styles.ownProfileNote}>
            <FontAwesome5 name="info-circle" size={scale(14)} color="#666" />
            <Text style={styles.ownProfileNoteText}>This is your profile. To edit, go to Profile tab.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  loadingText: {
    marginTop: verticalScale(16),
    fontSize: moderateScale(16),
    color: "#666",
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: scale(32),
  },
  errorText: {
    fontSize: moderateScale(18),
    color: "#666",
    marginTop: verticalScale(16),
    marginBottom: verticalScale(24),
    textAlign: "center",
  },
  backButton: {
    backgroundColor: "#C17A47",
    paddingHorizontal: scale(32),
    paddingVertical: verticalScale(12),
    borderRadius: scale(8),
  },
  backButtonText: {
    color: "white",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
  header: {
    backgroundColor: "#C17A47",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(16),
    paddingTop: Platform.OS === "ios" ? verticalScale(50) : verticalScale(16),
  },
  backIconButton: {
    width: scale(40),
    height: scale(40),
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: moderateScale(20),
    fontWeight: "bold",
    color: "white",
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: scale(40),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: verticalScale(32),
  },
  profileHeaderCard: {
    backgroundColor: "white",
    alignItems: "center",
    paddingVertical: verticalScale(32),
    paddingHorizontal: scale(24),
    marginBottom: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  avatarContainer: {
    marginBottom: verticalScale(16),
  },
  avatar: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    borderWidth: 4,
    borderColor: "#000000ff",
  },
  avatarFallback: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    backgroundColor: "#C17A47",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#A66A3E",
  },
  avatarFallbackText: {
    fontSize: moderateScale(48),
    fontWeight: "bold",
    color: "white",
  },
  fullName: {
    fontSize: moderateScale(24),
    fontWeight: "bold",
    color: "#333",
    marginBottom: verticalScale(8),
    textAlign: "center",
  },
  roleBadge: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(6),
    borderRadius: scale(20),
    marginBottom: verticalScale(12),
  },
  roleBadgeText: {
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  messageButton: {
    width: "90%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C17A47",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    borderRadius: scale(25),
    gap: scale(8),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: verticalScale(10),
  },
  messageButtonText: {
    color: "white",
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  bookButtonText: {
    color: "white",
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  infoCard: {
    backgroundColor: "white",
    marginHorizontal: scale(16),
    marginBottom: verticalScale(16),
    borderRadius: scale(12),
    padding: scale(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(16),
    paddingBottom: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    gap: scale(8),
  },
  infoCardTitle: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "#333",
  },
  detailsContent: {
    paddingVertical: verticalScale(8),
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: verticalScale(16),
    gap: scale(12),
  },
  iconContainer: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  contactTextContainer: {
    flex: 1,
  },
  contactLabel: {
    fontSize: moderateScale(12),
    color: "#999",
    marginBottom: verticalScale(2),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  contactText: {
    fontSize: moderateScale(14),
    color: "#333",
    lineHeight: moderateScale(20),
  },
  noContactInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(20),
    gap: scale(8),
  },
  noContactInfoText: {
    fontSize: moderateScale(14),
    color: "#999",
    fontStyle: "italic",
  },
  ownProfileNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    marginHorizontal: scale(16),
    padding: scale(16),
    borderRadius: scale(12),
    gap: scale(12),
  },
  ownProfileNoteText: {
    flex: 1,
    fontSize: moderateScale(13),
    color: "#666",
    lineHeight: moderateScale(18),
  },
  scheduleLoadingContainer: {
    paddingVertical: verticalScale(20),
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleLoadingText: {
    marginTop: verticalScale(8),
    fontSize: moderateScale(14),
    color: "#666",
  },
  scheduleContainer: {
    paddingVertical: verticalScale(8),
  },
  scheduleItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(12),
    backgroundColor: "#F9F9F9",
    borderRadius: scale(8),
    marginBottom: verticalScale(8),
  },
  scheduleDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    flex: 1,
  },
  scheduleDateTextContainer: {
    flex: 1,
  },
  scheduleDayOfWeek: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(2),
  },
  scheduleDate: {
    fontSize: moderateScale(12),
    color: "#666",
  },
  scheduleTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    paddingLeft: scale(12),
  },
  scheduleTime: {
    fontSize: moderateScale(12),
    color: "#666",
    fontWeight: "500",
  },
  viewAllScheduleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    backgroundColor: "#F0FDF4",
    borderRadius: scale(8),
    marginTop: verticalScale(8),
    gap: scale(8),
  },
  viewAllScheduleText: {
    fontSize: moderateScale(14),
    color: "#10B981",
    fontWeight: "600",
  },
  noScheduleContainer: {
    paddingVertical: verticalScale(32),
    alignItems: "center",
    justifyContent: "center",
  },
  noScheduleText: {
    marginTop: verticalScale(12),
    fontSize: moderateScale(14),
    color: "#999",
    textAlign: "center",
  },
})