"use client"

import { useRouter, useLocalSearchParams } from "expo-router"
import { useEffect, useState, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Modal,
  Dimensions,
  FlatList,
  Platform,
} from "react-native"
import * as SecureStore from "expo-secure-store"
import { FontAwesome5 } from "@expo/vector-icons"

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

const API_BASE_URL = "http://172.20.10.2:8000/api/kutsero"

interface UserProfileData {
  user_id: string
  email: string
  role: string
  status: string
  profile: {
    fname?: string
    mname?: string
    lname?: string
    username?: string
    email?: string
    phone?: string
    city?: string
    province?: string
    profile_image?: string
  }
}

interface Announcement {
  id: string
  title: string
  content: string
  created_at: string
  updated_at?: string
  image_url?: string | string[] | null
}

export default function UserProfileScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()

  const [profileData, setProfileData] = useState<UserProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [accessToken, setAccessToken] = useState<string>("")
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [imageModalVisible, setImageModalVisible] = useState(false)

  useEffect(() => {
    loadCurrentUser()
  }, [])

  useEffect(() => {
    if (accessToken && params.userId) {
      fetchUserProfile()
    }
  }, [accessToken, params.userId])

  const loadCurrentUser = async () => {
    try {
      const storedUserData = await SecureStore.getItemAsync("user_data")
      const storedAccessToken = await SecureStore.getItemAsync("access_token")

      if (storedUserData && storedAccessToken) {
        const parsedUserData = JSON.parse(storedUserData)
        setCurrentUserId(parsedUserData.id)
        setAccessToken(storedAccessToken)
      }
    } catch (error) {
      console.error("❌ Error loading current user:", error)
    }
  }

  const fetchUserProfile = async () => {
    setIsLoading(true)
    try {
      const userId = params.userId as string
      
      const response = await fetch(`${API_BASE_URL}/get_user_profile/${userId}/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const result = await response.json()

        if (result.success && (result.data || result.user)) {
          const userData = result.data || result.user

          const transformedData: UserProfileData = {
            user_id: userData.id || userData.user_id,
            email: userData.email,
            role: userData.role,
            status: userData.status,
            profile: userData.profile || {
              fname: userData.name?.split(" ")[0],
              lname: userData.name?.split(" ").slice(1).join(" "),
              email: userData.email,
              phone: userData.phone,
              city: userData.city,
              province: userData.province,
              profile_image: userData.profile_image,
            },
          }
          
          setProfileData(transformedData)
          
          const roleLower = (transformedData.role || "").toLowerCase().trim()
          const shouldFetchAnnouncements = roleLower.includes("dvmf") || roleLower.includes("ctu")
          
          if (shouldFetchAnnouncements) {
            fetchUserAnnouncements(transformedData.user_id, accessToken)
          }
        } else {
          Alert.alert("Error", "Failed to load user profile")
        }
      } else {
        Alert.alert("Error", "Failed to load user profile")
      }
    } catch (error) {
      console.error("❌ Error fetching profile:", error)
      Alert.alert("Error", "Failed to load user profile")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUserAnnouncements = async (userId?: string, token?: string) => {
    const userIdToUse = userId || profileData?.user_id
    const tokenToUse = token || accessToken
    
    if (!userIdToUse) return

    setIsLoadingAnnouncements(true)
    try {
      const response = await fetch(`${API_BASE_URL}/get_user_announcements/${userIdToUse}/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenToUse}`,
          "Content-Type": "application/json",
        },
      })
      
      if (response.ok) {
        const result = await response.json()
        
        if (result.success) {
          setAnnouncements(result.announcements || [])
        }
      }
    } catch (error) {
      console.error("❌ Error fetching announcements:", error)
    } finally {
      setIsLoadingAnnouncements(false)
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

  const getDisplayName = () => {
    if (!profileData?.profile) return "User"

    const { fname, mname, lname, username } = profileData.profile

    if (fname && lname) {
      return mname ? `${fname} ${mname} ${lname}` : `${fname} ${lname}`
    } else if (username) {
      return username
    } else if (profileData.email) {
      return profileData.email.split("@")[0]
    }

    return "User"
  }

  const getInitials = () => {
    if (!profileData?.profile) return "U"

    const { fname, lname } = profileData.profile

    if (fname && lname) {
      return `${fname.charAt(0)}${lname.charAt(0)}`.toUpperCase()
    } else if (fname) {
      return fname.charAt(0).toUpperCase()
    } else if (lname) {
      return lname.charAt(0).toUpperCase()
    }

    return getDisplayName().charAt(0).toUpperCase()
  }

  const getProfilePictureForRole = (role: string) => {
    const roleLower = role.toLowerCase().trim()
    if (roleLower.includes('ctu') || roleLower.includes('vet')) {
      return require("../../assets/images/CTU.jpg")
    } else if (roleLower.includes('dvmf')) {
      return require("../../assets/images/DVMF.png")
    }
    return null
  }

  const renderProfileImage = () => {
    const profileImage = profileData?.profile?.profile_image
    const roleBasedImage = profileData ? getProfilePictureForRole(profileData.role) : null

    if (roleBasedImage) {
      return (
        <View style={styles.avatarContainer}>
          <Image source={roleBasedImage} style={styles.avatar} />
        </View>
      )
    } else if (profileImage) {
      const imageSource =
        profileImage.startsWith("data:image") || profileImage.startsWith("http")
          ? { uri: profileImage }
          : { uri: profileImage }

      return (
        <View style={styles.avatarContainer}>
          <Image
            source={imageSource}
            style={styles.avatar}
            onError={(error) => {
              console.error("Error loading profile image:", error.nativeEvent.error)
            }}
          />
        </View>
      )
    } else {
      return (
        <View style={styles.avatarContainer}>
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarFallbackText}>{getInitials()}</Text>
          </View>
        </View>
      )
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return "Just now"
      if (diffMins < 60) return `${diffMins}m`
      if (diffHours < 24) return `${diffHours}h`
      if (diffDays < 7) return `${diffDays}d`
      
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    } catch (error) {
      return dateString
    }
  }

  const normalizeImageUrls = (imageUrl: string | string[] | null | undefined): string[] => {
    if (!imageUrl) return []
    
    if (Array.isArray(imageUrl)) {
      return imageUrl.filter(url => url && url.trim() !== '')
    }
    
    if (typeof imageUrl === 'string') {
      const trimmed = imageUrl.trim()
      if (trimmed === '') return []
      
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed)
          if (Array.isArray(parsed)) {
            return parsed.filter(url => url && url.trim() !== '')
          }
        } catch (e) {
          console.log('Failed to parse image_url as JSON:', e)
        }
      }
      
      if (trimmed.includes(',')) {
        return trimmed.split(',').map(url => url.trim()).filter(url => url !== '')
      }
      
      return [trimmed]
    }
    
    return []
  }

  const openImageModal = (images: string[], startIndex: number = 0) => {
    setSelectedImages(images)
    setSelectedImageIndex(startIndex)
    setImageModalVisible(true)
  }

  const closeImageModal = () => {
    setImageModalVisible(false)
    setSelectedImages([])
    setSelectedImageIndex(0)
  }

  // ✅ UPDATED: Follow Horse Operator pattern exactly
  const handleMessagePress = async () => {
    try {
      if (!currentUserId) {
        router.replace("../../pages/auth/login")
        return
      }

      if (!profileData) {
        Alert.alert("Error", "Profile data not available")
        return
      }

      const displayName = getDisplayName()
      const userIdToPass = String(profileData.user_id)
      
      console.log("📱 Opening chat with:", displayName)
      console.log("📱 Contact details:", {
        contactId: userIdToPass,
        contactName: displayName,
        contactRole: profileData.role,
        currentUserId: currentUserId,
      })
      
      // Navigate to messages screen with params to open chat directly
      router.push({
        pathname: "./messages",
        params: {
          openChat: "true",
          contactId: userIdToPass,
          contactName: displayName,
          contactAvatar: profileData.profile?.profile_image || "",
          contactRole: profileData.role.toLowerCase().replace(/\s+/g, '_'),
          userId: currentUserId,
        },
      })
    } catch (error) {
      console.error("Error opening chat:", error)
      Alert.alert("Error", "Failed to open chat.")
    }
  }

  const handleBack = () => {
    router.back()
  }

  const ImageCarousel = ({ images, announcementId }: { images: string[], announcementId: string }) => {
    const [currentIndex, setCurrentIndex] = useState(0)
    const flatListRef = useRef<FlatList>(null)
    const carouselWidth = width - scale(32)

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
      if (viewableItems.length > 0) {
        setCurrentIndex(viewableItems[0].index || 0)
      }
    }).current

    const viewabilityConfig = useRef({
      itemVisiblePercentThreshold: 50
    }).current

    if (images.length === 0) return null

    if (images.length === 1) {
      return (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => openImageModal(images, 0)}
        >
          <Image
            source={{ uri: images[0] }}
            style={styles.fbPostImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      )
    }

    return (
      <View style={styles.carouselContainer}>
        <FlatList
          ref={flatListRef}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          snapToInterval={carouselWidth}
          decelerationRate="fast"
          keyExtractor={(item, index) => `${announcementId}-${index}`}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => openImageModal(images, index)}
              style={{ width: carouselWidth }}
            >
              <Image
                source={{ uri: item }}
                style={[styles.fbPostImage, { width: carouselWidth }]}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
        />
        
        {images.length > 1 && (
          <View style={styles.paginationContainer}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  index === currentIndex && styles.paginationDotActive
                ]}
              />
            ))}
          </View>
        )}

        {images.length > 1 && (
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {currentIndex + 1}/{images.length}
            </Text>
          </View>
        )}
      </View>
    )
  }

  if (isLoading) {
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

  const displayName = getDisplayName()
  const roleColors = getUserRoleBadgeColor(profileData.role)
  const roleLower = (profileData.role || "").toLowerCase().trim()
  const showAnnouncements = roleLower.includes("dvmf") || roleLower.includes("ctu")
  const isOwnProfile = currentUserId === profileData.user_id

  const phoneNumber = profileData.profile?.phone
  const city = profileData.profile?.city
  const province = profileData.profile?.province
  const fullAddress = city && province ? `${city}, ${province}` : city || province || null

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
        <View style={styles.profileHeaderCard}>
          {renderProfileImage()}

          <Text style={styles.fullName}>{displayName}</Text>

          <View style={[styles.roleBadge, { backgroundColor: roleColors.bg }]}>
            <Text style={[styles.roleBadgeText, { color: roleColors.text }]}>
              {formatRoleLabel(profileData.role)}
            </Text>
          </View>

          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    profileData.status === "approved" || profileData.status === "active"
                      ? "#4CAF50"
                      : profileData.status === "pending"
                        ? "#FF9800"
                        : "#999",
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    profileData.status === "approved" || profileData.status === "active"
                      ? "#4CAF50"
                      : profileData.status === "pending"
                        ? "#FF9800"
                        : "#999",
                },
              ]}
            >
              {profileData.status}
            </Text>
          </View>

          {/* ✅ MESSAGE BUTTON - Only show if not viewing own profile */}
          {!isOwnProfile && (
            <TouchableOpacity style={styles.messageButton} onPress={handleMessagePress} activeOpacity={0.7}>
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
            {fullAddress && (
              <View style={styles.contactItem}>
                <View style={styles.iconContainer}>
                  <FontAwesome5 name="map-marker-alt" size={scale(14)} color="#C17A47" />
                </View>
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactLabel}>Location</Text>
                  <Text style={styles.contactText}>{fullAddress}</Text>
                </View>
              </View>
            )}

            {(profileData.profile?.email || profileData.email) && (
              <View style={styles.contactItem}>
                <View style={styles.iconContainer}>
                  <FontAwesome5 name="envelope" size={scale(14)} color="#C17A47" />
                </View>
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactLabel}>Email</Text>
                  <Text style={styles.contactText}>
                    {profileData.profile?.email || profileData.email}
                  </Text>
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

            {profileData.profile?.username && (
              <View style={styles.contactItem}>
                <View style={styles.iconContainer}>
                  <FontAwesome5 name="user" size={scale(14)} color="#C17A47" />
                </View>
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactLabel}>Username</Text>
                  <Text style={styles.contactText}>@{profileData.profile.username}</Text>
                </View>
              </View>
            )}

            {!fullAddress && !profileData.profile?.email && !profileData.email && !phoneNumber && !profileData.profile?.username && (
              <View style={styles.noContactInfo}>
                <FontAwesome5 name="info-circle" size={scale(16)} color="#999" />
                <Text style={styles.noContactInfoText}>No contact information available</Text>
              </View>
            )}
          </View>
        </View>

        {showAnnouncements && (
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <FontAwesome5 name="bullhorn" size={scale(18)} color="#C17A47" />
              <Text style={styles.infoCardTitle}>Announcements</Text>
            </View>

            {isLoadingAnnouncements ? (
              <View style={styles.scheduleLoadingContainer}>
                <ActivityIndicator size="small" color="#C17A47" />
                <Text style={styles.scheduleLoadingText}>Loading announcements...</Text>
              </View>
            ) : announcements.length > 0 ? (
              <View style={styles.announcementsList}>
                {announcements.map((announcement) => {
                  const images = normalizeImageUrls(announcement.image_url)
                  
                  return (
                    <View key={announcement.id} style={styles.fbPostCard}>
                      <View style={styles.fbPostHeader}>
                        <View style={styles.fbPostAuthorInfo}>
                          {profileData.profile?.profile_image ? (
                            <Image
                              source={{ uri: profileData.profile.profile_image }}
                              style={styles.fbPostAvatar}
                            />
                          ) : (
                            <View style={styles.fbPostAvatarPlaceholder}>
                              <Text style={styles.fbPostAvatarText}>{getInitials()}</Text>
                            </View>
                          )}
                          <View style={styles.fbPostAuthorText}>
                            <Text style={styles.fbPostAuthorName}>{displayName}</Text>
                            <View style={styles.fbPostMeta}>
                              <Text style={styles.fbPostTime}>{formatDate(announcement.created_at)}</Text>
                              <Text style={styles.fbPostMetaSeparator}> · </Text>
                              <Text style={styles.fbPostVisibility}>🌐</Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {announcement.title && (
                        <View style={styles.fbPostTitleContainer}>
                          <Text style={styles.fbPostTitle}>{announcement.title}</Text>
                        </View>
                      )}

                      <View style={styles.fbPostContent}>
                        <Text style={styles.fbPostText}>{announcement.content}</Text>
                      </View>

                      {images.length > 0 && <ImageCarousel images={images} announcementId={announcement.id} />}
                    </View>
                  )
                })}
              </View>
            ) : (
              <View style={styles.noScheduleContainer}>
                <FontAwesome5 name="bullhorn" size={scale(32)} color="#CCC" />
                <Text style={styles.noScheduleText}>No announcements yet</Text>
              </View>
            )}
          </View>
        )}

        {isOwnProfile && (
          <View style={styles.ownProfileNote}>
            <FontAwesome5 name="info-circle" size={scale(14)} color="#666" />
            <Text style={styles.ownProfileNoteText}>This is your profile. To edit, go to Profile tab.</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={closeImageModal}>
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>

          {selectedImages.length > 0 && (
            <>
              <FlatList
                data={selectedImages}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={selectedImageIndex}
                getItemLayout={(data, index) => ({
                  length: width,
                  offset: width * index,
                  index,
                })}
                keyExtractor={(item, index) => `modal-${index}`}
                renderItem={({ item }) => (
                  <View style={styles.modalImageContainer}>
                    <Image
                      source={{ uri: item }}
                      style={styles.modalImage}
                      resizeMode="contain"
                    />
                  </View>
                )}
              />

              {selectedImages.length > 1 && (
                <View style={styles.modalImageCounter}>
                  <Text style={styles.modalImageCounterText}>
                    {selectedImageIndex + 1} / {selectedImages.length}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </Modal>
    </View>
  )
}

// ... (all your existing styles remain the same)
const styles = StyleSheet.create({
  // ... copy all your existing styles here
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F5F5F5" },
  loadingText: { marginTop: verticalScale(16), fontSize: moderateScale(16), color: "#666", fontWeight: "500" },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F5F5F5", paddingHorizontal: scale(32) },
  errorText: { fontSize: moderateScale(18), color: "#666", marginTop: verticalScale(16), marginBottom: verticalScale(24), textAlign: "center" },
  backButton: { backgroundColor: "#C17A47", paddingHorizontal: scale(32), paddingVertical: verticalScale(12), borderRadius: scale(8) },
  backButtonText: { color: "white", fontSize: moderateScale(16), fontWeight: "600" },
  header: { backgroundColor: "#C17A47", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: scale(16), paddingVertical: verticalScale(16), paddingTop: Platform.OS === "ios" ? verticalScale(50) : verticalScale(16) },
  backIconButton: { width: scale(40), height: scale(40), justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: moderateScale(20), fontWeight: "bold", color: "white", flex: 1, textAlign: "center" },
  headerSpacer: { width: scale(40) },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: verticalScale(32) },
  profileHeaderCard: { backgroundColor: "white", alignItems: "center", paddingVertical: verticalScale(32), paddingHorizontal: scale(24), marginBottom: verticalScale(16), borderBottomWidth: 1, borderBottomColor: "#E0E0E0" },
  avatarContainer: { marginBottom: verticalScale(16) },
  avatar: { width: scale(120), height: scale(120), borderRadius: scale(60), borderWidth: 4, borderColor: "#000000ff" },
  avatarFallback: { width: scale(120), height: scale(120), borderRadius: scale(60), backgroundColor: "#C17A47", justifyContent: "center", alignItems: "center", borderWidth: 4, borderColor: "#A66A3E" },
  avatarFallbackText: { fontSize: moderateScale(48), fontWeight: "bold", color: "white" },
  fullName: { fontSize: moderateScale(24), fontWeight: "bold", color: "#333", marginBottom: verticalScale(8), textAlign: "center" },
  roleBadge: { paddingHorizontal: scale(16), paddingVertical: verticalScale(6), borderRadius: scale(20), marginBottom: verticalScale(6) },
  roleBadgeText: { fontSize: moderateScale(14), fontWeight: "600" },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: scale(10), paddingVertical: verticalScale(3), borderRadius: scale(10), backgroundColor: "#F0F2F5", marginBottom: verticalScale(12) },
  statusDot: { width: scale(7), height: scale(7), borderRadius: scale(3.5), marginRight: scale(5) },
  statusText: { fontSize: moderateScale(11), fontWeight: "600", textTransform: "capitalize" },
  messageButton: { width: "90%", flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#C17A47", paddingHorizontal: scale(20), paddingVertical: verticalScale(12), borderRadius: scale(25), gap: scale(8), shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, marginTop: verticalScale(10) },
  messageButtonText: { color: "white", fontSize: moderateScale(14), fontWeight: "600" },
  infoCard: { backgroundColor: "white", marginHorizontal: scale(16), marginBottom: verticalScale(16), borderRadius: scale(12), padding: scale(16), shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  infoCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: verticalScale(16), paddingBottom: verticalScale(12), borderBottomWidth: 1, borderBottomColor: "#F0F0F0", gap: scale(8) },
  infoCardTitle: { fontSize: moderateScale(18), fontWeight: "600", color: "#333" },
  detailsContent: { paddingVertical: verticalScale(8) },
  contactItem: { flexDirection: "row", alignItems: "flex-start", marginBottom: verticalScale(16), gap: scale(12) },
  iconContainer: { width: scale(32), height: scale(32), borderRadius: scale(16), backgroundColor: "#F5F5F5", justifyContent: "center", alignItems: "center" },
  contactTextContainer: { flex: 1 },
  contactLabel: { fontSize: moderateScale(12), color: "#999", marginBottom: verticalScale(2), textTransform: "uppercase", letterSpacing: 0.5 },
  contactText: { fontSize: moderateScale(14), color: "#333", lineHeight: moderateScale(20) },
  noContactInfo: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: verticalScale(20), gap: scale(8) },
  noContactInfoText: { fontSize: moderateScale(14), color: "#999", fontStyle: "italic" },
  scheduleLoadingContainer: { paddingVertical: verticalScale(20), alignItems: "center", justifyContent: "center" },
  scheduleLoadingText: { marginTop: verticalScale(8), fontSize: moderateScale(14), color: "#666" },
  noScheduleContainer: { paddingVertical: verticalScale(32), alignItems: "center", justifyContent: "center" },
  noScheduleText: { marginTop: verticalScale(12), fontSize: moderateScale(14), color: "#999", textAlign: "center" },
  ownProfileNote: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF3E0", marginHorizontal: scale(16), padding: scale(16), borderRadius: scale(12), gap: scale(12) },
  ownProfileNoteText: { flex: 1, fontSize: moderateScale(13), color: "#666", lineHeight: moderateScale(18) },
  announcementsList: { gap: verticalScale(12) },
  fbPostCard: { backgroundColor: "white", borderRadius: scale(8), shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2, marginBottom: verticalScale(12) },
  fbPostHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: scale(12), paddingTop: scale(12), paddingBottom: scale(8) },
  fbPostAuthorInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  fbPostAvatar: { width: scale(40), height: scale(40), borderRadius: scale(20), marginRight: scale(10) },
  fbPostAvatarPlaceholder: { width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: "#C17A47", justifyContent: "center", alignItems: "center", marginRight: scale(10) },
  fbPostAvatarText: { color: "white", fontSize: moderateScale(15), fontWeight: "600" },
  fbPostAuthorText: { flex: 1 },
  fbPostAuthorName: { fontSize: moderateScale(14), fontWeight: "600", color: "#050505", marginBottom: scale(2) },
  fbPostMeta: { flexDirection: "row", alignItems: "center" },
  fbPostTime: { fontSize: moderateScale(12), color: "#65676B" },
  fbPostMetaSeparator: { fontSize: moderateScale(12), color: "#65676B" },
  fbPostVisibility: { fontSize: moderateScale(11) },
  fbPostTitleContainer: { paddingHorizontal: scale(12), paddingBottom: scale(4) },
  fbPostTitle: { fontSize: moderateScale(15), fontWeight: "700", color: "#050505" },
  fbPostContent: { paddingHorizontal: scale(12), paddingBottom: scale(12) },
  fbPostText: { fontSize: moderateScale(14), color: "#050505", lineHeight: moderateScale(19) },
  carouselContainer: { position: "relative" },
  fbPostImage: { width: "100%", height: verticalScale(280), backgroundColor: "#F0F2F5" },
  paginationContainer: { position: "absolute", bottom: scale(12), left: 0, right: 0, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: scale(6) },
  paginationDot: { width: scale(6), height: scale(6), borderRadius: scale(3), backgroundColor: "rgba(255, 255, 255, 0.5)" },
  paginationDotActive: { backgroundColor: "rgba(255, 255, 255, 0.95)", width: scale(8), height: scale(8), borderRadius: scale(4) },
  imageCounter: { position: "absolute", top: scale(12), right: scale(12), backgroundColor: "rgba(0, 0, 0, 0.6)", paddingHorizontal: scale(10), paddingVertical: scale(4), borderRadius: scale(12) },
  imageCounterText: { color: "white", fontSize: moderateScale(12), fontWeight: "600" },
  modalContainer: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.95)", justifyContent: "center", alignItems: "center" },
  modalCloseButton: { position: "absolute", top: verticalScale(50), right: scale(20), width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: "rgba(255, 255, 255, 0.2)", justifyContent: "center", alignItems: "center", zIndex: 10 },
  modalCloseText: { color: "white", fontSize: moderateScale(24), fontWeight: "300" },
  modalImageContainer: { width: width, height: "100%", justifyContent: "center", alignItems: "center" },
  modalImage: { width: width, height: "80%" },
  modalImageCounter: { position: "absolute", bottom: verticalScale(40), alignSelf: "center", backgroundColor: "rgba(0, 0, 0, 0.7)", paddingHorizontal: scale(16), paddingVertical: scale(8), borderRadius: scale(20) },
  modalImageCounterText: { color: "white", fontSize: moderateScale(14), fontWeight: "600" },
})