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
  Modal,
  TouchableWithoutFeedback,
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

const API_BASE_URL = "http://192.168.31.58:8000/api/horse_operator"

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
    address?: string  // Added address field
    clinic_address?: string
    profile_image?: string
  }
}

interface VetSchedule {
  sched_id: string
  vet_id: string
  day_of_week: string
  start_time: string
  end_time: string
  slot_duration: number
  is_available: boolean
  created_at: string
}

interface Post {
  id: string
  title: string
  content: string
  author: string
  author_role: string
  created_at: string
  formatted_date: string
  image_url?: string
  is_announcement: boolean
  category?: string
}

export default function UnifiedProfileView() {
  const router = useRouter()
  const params = useLocalSearchParams()

  const [loading, setLoading] = useState(true)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [postsLoading, setPostsLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [profileData, setProfileData] = useState<UserProfile | null>(null)
  const [vetSchedules, setVetSchedules] = useState<VetSchedule[]>([])
  const [userPosts, setUserPosts] = useState<Post[]>([])
  const [expandedPosts, setExpandedPosts] = useState<{ [key: string]: boolean }>({})
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [imageModalVisible, setImageModalVisible] = useState(false)

  const hasLoadedProfile = useRef(false)

  // Function to get profile picture based on user role
  const getProfilePicture = (userData: UserProfile | null) => {
    if (!userData) return null
    
    const userRole = userData.role?.toLowerCase()
    
    // CTU role - use CTU logo
    if (userRole === 'ctu_veterinarian' || userRole === 'ctu-vetmed' || userRole === 'ctu-admin') {
      return require("../../assets/images/CTU.jpg")
    }
    
    // DVMF role - use DVMF logo  
    if (userRole === 'dvmf' || userRole === 'dvmf-admin') {
      return require("../../assets/images/DVMF.png")
    }
    
    // For other users, use their profile image if available
    if (userData.profile?.profile_image) {
      return { uri: userData.profile.profile_image }
    }
    
    // Fallback to initials avatar
    return null
  }

  const fetchVetBaseSchedule = useCallback(async (vetId: string) => {
    try {
        setScheduleLoading(true)
        const storedAccessToken = await SecureStore.getItemAsync("access_token")

        if (!storedAccessToken) {
            throw new Error("No access token found")
        }

        console.log("📅 Fetching vet base schedule for vet:", vetId)

        const scheduleResponse = await fetch(`${API_BASE_URL}/get_vet_base_schedule/?vet_id=${vetId}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${storedAccessToken}`,
                "Content-Type": "application/json",
            },
        })

        console.log("📊 Schedule response status:", scheduleResponse.status)

        if (scheduleResponse.ok) {
            const scheduleData = await scheduleResponse.json()
            console.log("✅ Vet base schedule loaded:", scheduleData)
            
            // Handle the response format correctly
            if (scheduleData.schedules && Array.isArray(scheduleData.schedules)) {
                setVetSchedules(scheduleData.schedules)
                console.log(`📋 Loaded ${scheduleData.schedules.length} schedule items`)
            } else {
                console.log("📭 No schedule data available or empty array")
                setVetSchedules([])
            }
        } else {
            console.log("⚠️ Failed to fetch schedule data, status:", scheduleResponse.status)
            setVetSchedules([])
        }
    } catch (error) {
        console.error("❌ Error fetching vet base schedule:", error)
        setVetSchedules([])
    } finally {
        setScheduleLoading(false)
    }
}, [])

  const fetchUserPosts = useCallback(async (userId: string) => {
    try {
      setPostsLoading(true)
      const storedAccessToken = await SecureStore.getItemAsync("access_token")

      if (!storedAccessToken) {
        throw new Error("No access token found")
      }

      console.log("📝 Fetching posts for user:", userId)

      const response = await fetch(`${API_BASE_URL}/get_user_posts/${userId}/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${storedAccessToken}`,
          "Content-Type": "application/json",
        },
      })

      console.log("📊 Posts response status:", response.status)

      if (response.ok) {
        const postsData = await response.json()
        console.log("✅ Posts loaded:", postsData)
        
        // Handle different response formats
        if (postsData.posts && Array.isArray(postsData.posts)) {
          setUserPosts(postsData.posts)
        } else if (Array.isArray(postsData)) {
          setUserPosts(postsData)
        } else {
          console.log("⚠️ Unexpected posts data format:", postsData)
          setUserPosts([])
        }
      } else {
        console.log("⚠️ No posts data available, status:", response.status)
        setUserPosts([])
      }
    } catch (error) {
      console.error("❌ Error fetching user posts:", error)
      setUserPosts([])
    } finally {
      setPostsLoading(false)
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

        const response = await fetch(`${API_BASE_URL}/get_user_profile/${userId}/`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${storedAccessToken}`,
            "Content-Type": "application/json",
          },
        })

        console.log("📊 Profile response status:", response.status)

        if (response.ok) {
          const result = await response.json()
          console.log("📋 Profile response data:", result)
          
          if (result.success && result.user) {
            const userData = result.user
            console.log("✅ Profile loaded from unified API:", userData)
            console.log("User role:", userData.role)
            console.log("User profile data:", userData.profile)
            console.log("Address:", userData.profile?.address)
            console.log("Clinic address:", userData.profile?.clinic_address)
            setProfileData(userData)

            // If user is a regular veterinarian, fetch their base schedule
            const isRegularVet = userData.role === "Veterinarian" || userData.role === "veterinarian"
            if (isRegularVet) {
              console.log("🩺 User is a veterinarian, fetching schedule...")
              await fetchVetBaseSchedule(userData.id)
            } else {
              console.log("👤 User is not a veterinarian, role:", userData.role)
            }

            // If user is CTU or DVMF, fetch their posts
            const isCTUorDVMF = userData.role?.toLowerCase().includes('ctu') || 
                               userData.role?.toLowerCase().includes('dvmf')
            if (isCTUorDVMF) {
              console.log("🏢 User is CTU/DVMF, fetching posts...")
              await fetchUserPosts(userData.id)
            } else {
              console.log("👤 User is not CTU/DVMF, role:", userData.role)
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
    [router, fetchVetBaseSchedule, fetchUserPosts],
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
        return { bg: "#E3F2FD", text: "#CD853F" }
      case "veterinarian":
        return { bg: "#F3E5F5", text: "#10B981" }
      case "ctu_veterinarian":
      case "ctu-vetmed":
        return { bg: "#FCE4EC", text: "#c2181eff" }
      case "ctu-admin":
        return { bg: "#FCE4EC", text: "#c2181eff" }
      case "dvmf":
        return { bg: "#FCE4EC", text: "#c2181eff" }
      case "dvmf-admin":
        return { bg: "#FCE4EC", text: "#c2181eff" }
      case "kutsero president":
        return { bg: "#E3F2FD", text: "#CD853F" }
      default:
        return { bg: "#F5F5F5", text: "#666" }
    }
  }

  const formatRoleLabel = (role: string) => {
    const roleMap: { [key: string]: string } = {
      "horse operator": "Horse Operator",
      "kutsero": "Kutsero",
      "veterinarian": "Veterinarian",
      "ctu_veterinarian": "CTU Veterinarian",
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

      console.log("📱 Opening chat with:", fullName)

      // Navigate to messages screen with proper parameters
      router.push({
        pathname: "../HORSE_OPERATOR/Hmessage",
        params: {
          openChat: "true",
          contactId: profileData.id,
          contactName: fullName,
          contactAvatar: profileData.profile.profile_image || "",
          contactRole: profileData.role,
          userId: currentUserId,
          // Add timestamp to force refresh
          timestamp: Date.now().toString(),
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

  const togglePostExpansion = (postId: string) => {
    setExpandedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }))
  }

  const handleImagePress = (imageUrl: string) => {
    setSelectedImage(imageUrl)
    setImageModalVisible(true)
  }

  const closeImageModal = () => {
    setImageModalVisible(false)
    setSelectedImage(null)
  }

  const formatTimeTo12Hour = (time24: string) => {
    try {
      if (!time24) return time24
      
      const timeParts = time24.split(':')
      if (timeParts.length < 2) return time24
      
      let hours = parseInt(timeParts[0])
      const minutes = timeParts[1]
      
      const period = hours >= 12 ? 'PM' : 'AM'
      hours = hours % 12 || 12
      
      return `${hours}:${minutes} ${period}`
    } catch {
      return time24
    }
  }

  const renderPostItem = (post: Post) => {
    const isExpanded = expandedPosts[post.id]
    const contentLength = post.content.length
    const shouldTruncate = contentLength > 150
    const displayContent = shouldTruncate && !isExpanded 
      ? post.content.substring(0, 150) + '...' 
      : post.content

    return (
      <View key={post.id} style={styles.postItem}>
        <View style={styles.postHeader}>
          <Text style={styles.postTitle}>{post.title}</Text>
          {post.is_announcement && (
            <View style={styles.announcementBadge}>
              <FontAwesome5 name="bullhorn" size={scale(10)} color="white" />
              <Text style={styles.announcementBadgeText}>Announcement</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.postContent} numberOfLines={isExpanded ? undefined : 3}>
          {displayContent}
        </Text>
        
        {shouldTruncate && (
          <TouchableOpacity 
            style={styles.seeMoreButton}
            onPress={() => togglePostExpansion(post.id)}
          >
            <Text style={styles.seeMoreText}>
              {isExpanded ? 'See Less' : 'See More'}
            </Text>
          </TouchableOpacity>
        )}
        
        {post.image_url && (
          <TouchableOpacity 
            onPress={() => handleImagePress(post.image_url!)}
            activeOpacity={0.8}
          >
            <Image 
              source={{ uri: post.image_url }} 
              style={styles.postImage}
              resizeMode="cover"
            />
            <View style={styles.imageOverlay}>
              <FontAwesome5 name="expand" size={scale(16)} color="white" />
            </View>
          </TouchableOpacity>
        )}
        
        <View style={styles.postFooter}>
          <Text style={styles.postDate}>{post.formatted_date}</Text>
          {post.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{post.category}</Text>
            </View>
          )}
        </View>
      </View>
    )
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
  const address = profileData.profile.address  // Get the full address
  const clinicAddress = profileData.profile.clinic_address
  
  // Get profile picture based on role
  const profilePicture = getProfilePicture(profileData)
  
  // Check user types
  const isRegularVet = profileData.role === "Veterinarian" || profileData.role === "veterinarian"
  const isCTUorDVMF = profileData.role?.toLowerCase().includes('ctu') || 
                     profileData.role?.toLowerCase().includes('dvmf')

  console.log("👤 Profile Analysis:", {
    role: profileData.role,
    isRegularVet,
    isCTUorDVMF,
    hasSchedules: vetSchedules.length > 0,
    hasPosts: userPosts.length > 0,
    address: address,
    clinicAddress: clinicAddress
  })

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C17A47" />

      {/* Full Screen Image Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <View style={styles.imageModalContainer}>
          <TouchableWithoutFeedback onPress={closeImageModal}>
            <View style={styles.imageModalBackground}>
              {selectedImage && (
                <Image 
                  source={{ uri: selectedImage }} 
                  style={styles.fullScreenImage}
                  resizeMode="contain"
                />
              )}
              <TouchableOpacity 
                style={styles.closeImageButton}
                onPress={closeImageModal}
              >
                <FontAwesome5 name="times" size={scale(20)} color="white" />
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </Modal>

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
            {profilePicture ? (
              <Image 
                source={profilePicture} 
                style={styles.avatar} 
                resizeMode="cover" 
              />
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

            {/* Display full address if available (for Kutsero and other users) */}
            {address && !isRegularVet && (
              <View style={styles.contactItem}>
                <View style={styles.iconContainer}>
                  <FontAwesome5 name="map-marker-alt" size={scale(14)} color="#C17A47" />
                </View>
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactLabel}>Address</Text>
                  <Text style={styles.contactText}>{address}</Text>
                </View>
              </View>
            )}

            {/* Clinic Address (for veterinarians) */}
            {clinicAddress && isRegularVet && (
              <View style={styles.contactItem}>
                <View style={styles.iconContainer}>
                  <FontAwesome5 name="clinic-medical" size={scale(14)} color="#10B981" />
                </View>
                <View style={styles.contactTextContainer}>
                  <Text style={[styles.contactLabel, { color: "#10B981" }]}>Clinic Address</Text>
                  <Text style={[styles.contactText, { color: "#333" }]}>{clinicAddress}</Text>
                </View>
              </View>
            )}

            {/* Regular Address for veterinarians without clinic address */}
            {address && isRegularVet && !clinicAddress && (
              <View style={styles.contactItem}>
                <View style={styles.iconContainer}>
                  <FontAwesome5 name="map-marker-alt" size={scale(14)} color="#C17A47" />
                </View>
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactLabel}>Address</Text>
                  <Text style={styles.contactText}>{address}</Text>
                </View>
              </View>
            )}

            {/* Fallback to city/province if no address field */}
            {(city || province) && !address && !clinicAddress && (
              <View style={styles.contactItem}>
                <View style={styles.iconContainer}>
                  <FontAwesome5 name="map-marker-alt" size={scale(14)} color="#C17A47" />
                </View>
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactLabel}>Address</Text>
                  <Text style={styles.contactText}>
                    {city && province ? `${city}, ${province}` : city || province}
                  </Text>
                </View>
              </View>
            )}

            {!profileData.profile.email && !phoneNumber && !address && !clinicAddress && !city && !province && (
              <View style={styles.noContactInfo}>
                <FontAwesome5 name="info-circle" size={scale(16)} color="#999" />
                <Text style={styles.noContactInfoText}>No contact information available</Text>
              </View>
            )}
          </View>
        </View>

        {/* Veterinarian Schedule Information - Only show for regular veterinarians */}
        {isRegularVet && (
          <>
            {/* Regular Schedule Card - Shows vet's regular availability */}
            <View style={styles.infoCard}>
              <View style={styles.infoCardHeader}>
                <FontAwesome5 name="calendar-alt" size={scale(18)} color="#10B981" />
                <Text style={styles.infoCardTitle}>Schedule</Text>
              </View>

              {scheduleLoading ? (
                <View style={styles.scheduleLoadingContainer}>
                  <ActivityIndicator size="small" color="#10B981" />
                  <Text style={styles.scheduleLoadingText}>Loading schedule...</Text>
                </View>
              ) : vetSchedules.length > 0 ? (
                <View style={styles.regularScheduleContainer}>
                  <Text style={styles.scheduleDescription}>
                    This veterinarian is regularly available on:
                  </Text>
                  
                  <View style={styles.scheduleDaysContainer}>
                    {vetSchedules.map((schedule, index) => (
                      <View key={schedule.sched_id || index} style={styles.scheduleDayItem}>
                        <Text style={styles.dayNameText}>
                          {schedule.day_of_week}
                        </Text>
                        <Text style={styles.scheduleTimeText}>
                          {formatTimeTo12Hour(schedule.start_time)} - {formatTimeTo12Hour(schedule.end_time)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Book Appointment Button */}
                  {!isOwnProfile && (
                    <TouchableOpacity
                      style={styles.bookAppointmentButton}
                      onPress={handleBookAppointment}
                      activeOpacity={0.7}
                    >
                      <FontAwesome5 name="calendar-plus" size={scale(16)} color="white" />
                      <Text style={styles.bookAppointmentText}>Book an Appointment</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.noScheduleContainer}>
                  <FontAwesome5 name="calendar-times" size={scale(32)} color="#CCC" />
                  <Text style={styles.noScheduleText}>No regular schedule set</Text>
                  <Text style={styles.noScheduleSubtext}>
                    This veterinarian hasn&#39;t set their weekly availability yet
                  </Text>
                  
                  {/* Book Appointment Button (even without schedule) */}
                  {!isOwnProfile && (
                    <TouchableOpacity
                      style={[styles.bookAppointmentButton, styles.bookButtonWithoutSchedule]}
                      onPress={handleBookAppointment}
                      activeOpacity={0.7}
                    >
                      <FontAwesome5 name="calendar-plus" size={scale(16)} color="white" />
                      <Text style={styles.bookAppointmentText}>Request Appointment</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </>
        )}

        {/* Posts/Announcements Card - Only show for CTU and DVMF users */}
        {isCTUorDVMF && (
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <FontAwesome5 name="newspaper" size={scale(18)} color="#C17A47" />
              <Text style={styles.infoCardTitle}>
                {profileData.role?.toLowerCase().includes('ctu') ? 'CTU Announcements' : 'DVMF Announcements'}
              </Text>
            </View>

            {postsLoading ? (
              <View style={styles.postsLoadingContainer}>
                <ActivityIndicator size="small" color="#C17A47" />
                <Text style={styles.postsLoadingText}>Loading announcements...</Text>
              </View>
            ) : userPosts.length > 0 ? (
              <View style={styles.postsContainer}>
                {userPosts.slice(0, 3).map(renderPostItem)}
                
                {userPosts.length > 3 && (
                  <TouchableOpacity style={styles.viewAllPostsButton}>
                    <Text style={styles.viewAllPostsText}>View All Announcements</Text>
                    <FontAwesome5 name="arrow-right" size={scale(12)} color="#C17A47" />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.noPostsContainer}>
                <FontAwesome5 name="newspaper" size={scale(32)} color="#CCC" />
                <Text style={styles.noPostsText}>
                  No announcements posted yet
                </Text>
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
    overflow: "hidden",
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
  
  // Regular Schedule Styles
  regularScheduleContainer: {
    paddingVertical: verticalScale(8),
  },
  scheduleDaysContainer: {
    gap: verticalScale(8),
  },
  scheduleDayItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(12),
    backgroundColor: "#F0F9FF",
    borderRadius: scale(8),
    borderLeftWidth: 3,
    borderLeftColor: "#10B981",
  },
  dayNameText: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
  },
  scheduleTimeText: {
    fontSize: moderateScale(13),
    color: "#666",
    fontWeight: "500",
  },
  scheduleDescription: {
    fontSize: moderateScale(14),
    color: "#666",
    marginBottom: verticalScale(12),
    lineHeight: moderateScale(20),
  },
  scheduleNoteContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0F9FF",
    padding: scale(12),
    borderRadius: scale(8),
    marginTop: verticalScale(12),
    gap: scale(8),
    borderLeftWidth: 3,
    borderLeftColor: "#10B981",
  },
  scheduleNote: {
    fontSize: moderateScale(12),
    color: "#999",
    fontStyle: "italic",
    marginTop: verticalScale(8),
    textAlign: "center",
  },
  
  // Book Appointment Button
  bookAppointmentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(14),
    borderRadius: scale(12),
    marginTop: verticalScale(16),
    gap: scale(10),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookAppointmentText: {
    color: "white",
    fontSize: moderateScale(16),
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
  
  // Posts/Announcements Styles
  postsLoadingContainer: {
    paddingVertical: verticalScale(20),
    alignItems: "center",
    justifyContent: "center",
  },
  postsLoadingText: {
    marginTop: verticalScale(8),
    fontSize: moderateScale(14),
    color: "#666",
  },
  postsContainer: {
    paddingVertical: verticalScale(8),
  },
  postItem: {
    backgroundColor: "#F9F9F9",
    borderRadius: scale(8),
    padding: scale(12),
    marginBottom: verticalScale(8),
    borderLeftWidth: 3,
    borderLeftColor: "#C17A47",
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: verticalScale(8),
  },
  postTitle: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginRight: scale(8),
  },
  announcementBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#C17A47",
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(4),
    gap: scale(4),
  },
  announcementBadgeText: {
    fontSize: moderateScale(10),
    color: "white",
    fontWeight: "600",
  },
  postContent: {
    fontSize: moderateScale(14),
    color: "#666",
    lineHeight: moderateScale(20),
    marginBottom: verticalScale(4),
  },
  seeMoreButton: {
    alignSelf: 'flex-start',
    marginBottom: verticalScale(8),
  },
  seeMoreText: {
    fontSize: moderateScale(12),
    color: "#C17A47",
    fontWeight: "600",
  },
  postImage: {
    width: "100%",
    height: verticalScale(120),
    borderRadius: scale(6),
    marginBottom: verticalScale(8),
  },
  imageOverlay: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  postFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  postDate: {
    fontSize: moderateScale(12),
    color: "#999",
  },
  categoryBadge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: scale(4),
  },
  categoryText: {
    fontSize: moderateScale(10),
    color: "#1976D2",
    fontWeight: "500",
  },
  viewAllPostsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    backgroundColor: "#FFF3E0",
    borderRadius: scale(8),
    marginTop: verticalScale(8),
    gap: scale(8),
  },
  viewAllPostsText: {
    fontSize: moderateScale(14),
    color: "#C17A47",
    fontWeight: "600",
  },
  noPostsContainer: {
    paddingVertical: verticalScale(32),
    alignItems: "center",
    justifyContent: "center",
  },
  noPostsText: {
    marginTop: verticalScale(12),
    fontSize: moderateScale(14),
    color: "#999",
    textAlign: "center",
  },
  
  // Image Modal Styles
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalBackground: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '95%',
    height: '80%',
  },
  closeImageButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? verticalScale(50) : verticalScale(20),
    right: scale(20),
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookButtonWithoutSchedule: {
    marginTop: verticalScale(16),
    backgroundColor: "#6B7280",
  },
  noScheduleSubtext: {
    fontSize: moderateScale(13),
    color: "#999",
    textAlign: "center",
    marginTop: verticalScale(4),
    marginBottom: verticalScale(8),
  },
})