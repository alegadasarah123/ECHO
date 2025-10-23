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
} from "react-native"
import * as SecureStore from "expo-secure-store"

const API_BASE_URL = "http://192.168.1.8:8000/api/kutsero"
const { width: SCREEN_WIDTH } = Dimensions.get('window')

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
          
          console.log("🔍 PROFILE DATA DEBUG:")
          console.log("   - Full profile:", JSON.stringify(transformedData.profile, null, 2))
          console.log("   - City:", transformedData.profile?.city)
          console.log("   - Province:", transformedData.profile?.province)
          console.log("   - Username:", transformedData.profile?.username)
          console.log("   - Phone:", transformedData.profile?.phone)
          console.log("   - Role:", transformedData.role)
          
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

  const getRoleInfo = (role: string) => {
    const roleMap: { [key: string]: { icon: string; label: string; color: string } } = {
      Veterinarian: { icon: "🩺", label: "Veterinarian", color: "#E7F3FF" },
      Kutsero: { icon: "🐴", label: "Kutsero", color: "#FFF3E0" },
      "Horse Operator": { icon: "👨‍💼", label: "Horse Operator", color: "#E8F5E9" },
      "Kutsero President": { icon: "👑", label: "Kutsero President", color: "#F3E5F5" },
      Dvmf: { icon: "🏛️", label: "DVMF", color: "#E0F2F1" },
      "Dvmf-Admin": { icon: "🏛️", label: "DVMF Admin", color: "#E0F2F1" },
      "Ctu-Vetmed": { icon: "🎓", label: "CTU Vetmed", color: "#FFEBEE" },
      "Ctu-Admin": { icon: "🎓", label: "CTU Admin", color: "#FFEBEE" },
    }

    return roleMap[role] || { icon: "👤", label: role, color: "#F5F5F5" }
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

  // Helper function to get profile picture based on role
  const getProfilePictureForRole = (role: string) => {
    const roleLower = role.toLowerCase().trim();
    if (roleLower.includes('ctu') || roleLower.includes('vet')) {
      return require("../../assets/images/CTU.jpg");
    } else if (roleLower.includes('dvmf')) {
      return require("../../assets/images/DVMF.png");
    }
    return null;
  };

  const renderProfileImage = () => {
    const profileImage = profileData?.profile?.profile_image
    const roleBasedImage = profileData ? getProfilePictureForRole(profileData.role) : null

    if (roleBasedImage) {
      return (
        <View style={styles.profileImageBg}>
          <Image source={roleBasedImage} style={styles.profileImage} />
        </View>
      )
    } else if (profileImage) {
      const imageSource =
        profileImage.startsWith("data:image") || profileImage.startsWith("http")
          ? { uri: profileImage }
          : { uri: profileImage }

      return (
        <View style={styles.profileImageBg}>
          <Image
            source={imageSource}
            style={styles.profileImage}
            onError={(error) => {
              console.error("Error loading profile image:", error.nativeEvent.error)
            }}
          />
        </View>
      )
    } else {
      return (
        <View style={styles.profileImageBg}>
          <View style={styles.profileImagePlaceholder}>
            <Text style={styles.profileImageText}>{getInitials()}</Text>
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

  const handleMessagePress = () => {
    if (!profileData) return
    
    router.push({
      pathname: "./messages",
      params: {
        preSelectedUserId: profileData.user_id,
        preSelectedUserName: getDisplayName(),
      },
    })
  }

  const ImageCarousel = ({ images, announcementId }: { images: string[], announcementId: string }) => {
    const [currentIndex, setCurrentIndex] = useState(0)
    const flatListRef = useRef<FlatList>(null)
    const carouselWidth = SCREEN_WIDTH - 32

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
        <Text style={styles.errorText}>User not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const displayName = getDisplayName()
  const roleInfo = getRoleInfo(profileData.role)
  const roleLower = (profileData.role || "").toLowerCase().trim()
  const showAnnouncements = roleLower.includes("dvmf") || roleLower.includes("ctu")
  const roleBasedProfilePicture = getProfilePictureForRole(profileData.role)

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C17A47" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          {renderProfileImage()}
          
          <Text style={styles.displayName}>{displayName}</Text>

          <View style={[styles.roleBadge, { backgroundColor: roleInfo.color }]}>
            <Text style={styles.roleBadgeText}>
              {roleInfo.icon} {roleInfo.label}
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

          <TouchableOpacity style={styles.messageButton} onPress={handleMessagePress}>
            <Text style={styles.messageButtonText}>Message</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>About</Text>

          <View style={styles.infoContent}>
            <View style={styles.infoItem}>
              <View style={[styles.infoIconContainer, { backgroundColor: roleInfo.color }]}>
                <Text style={styles.infoIcon}>{roleInfo.icon}</Text>
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Role</Text>
                <Text style={styles.infoText}>{roleInfo.label}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View style={[styles.infoIconContainer, { backgroundColor: "#E8F0FE" }]}>
                <Text style={[styles.infoIcon, { fontSize: 20, color: "#2196F3" }]}>📍</Text>
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoText}>
                  {(() => {
                    const city = profileData.profile?.city
                    const province = profileData.profile?.province
                    console.log("📍 Location check - City:", city, "Province:", province)
                    
                    if (city && province) return `${city}, ${province}`
                    if (city) return city
                    if (province) return province
                    return "Not specified"
                  })()}
                </Text>
              </View>
            </View>

            {(profileData.profile?.email || profileData.email) ? (
              <View style={styles.infoItem}>
                <View style={[styles.infoIconContainer, { backgroundColor: "#E8F0FE" }]}>
                  <Text style={[styles.infoIcon, { fontSize: 16, color: "#2196F3" }]}>✉</Text>
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoText}>
                    {profileData.profile?.email || profileData.email}
                  </Text>
                </View>
              </View>
            ) : null}

            {profileData.profile?.phone ? (
              <View style={styles.infoItem}>
                <View style={[styles.infoIconContainer, { backgroundColor: "#E8F0FE" }]}>
                  <Text style={[styles.infoIcon, { fontSize: 18, color: "#2196F3" }]}>☎</Text>
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoText}>{profileData.profile.phone}</Text>
                </View>
              </View>
            ) : null}

            {profileData.profile?.username ? (
              <View style={styles.infoItem}>
                <View style={[styles.infoIconContainer, { backgroundColor: "#E8F0FE" }]}>
                  <Text style={[styles.infoIcon, { fontSize: 18, color: "#2196F3" }]}>👤</Text>
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Username</Text>
                  <Text style={styles.infoText}>@{profileData.profile.username}</Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {showAnnouncements && (
          <View style={styles.announcementsSection}>
            <View style={styles.announcementsSectionHeader}>
              <Text style={styles.sectionTitle}>Announcements</Text>
            </View>
            {isLoadingAnnouncements ? (
              <View style={styles.loadingAnnouncementsContainer}>
                <ActivityIndicator size="small" color="#C17A47" />
                <Text style={styles.loadingAnnouncementsText}>
                  Loading announcements...
                </Text>
              </View>
            ) : announcements.length > 0 ? (
              <View style={styles.announcementsList}>
                {announcements.map((announcement) => {
                  const images = normalizeImageUrls(announcement.image_url)
                  console.log(`📸 Announcement ${announcement.id}:`, {
                    raw: announcement.image_url,
                    normalized: images,
                    count: images.length
                  })
                  
                  return (
                    <View key={announcement.id} style={styles.fbPostCard}>
                      <View style={styles.fbPostHeader}>
                        <View style={styles.fbPostAuthorInfo}>
                          {roleBasedProfilePicture ? (
                            <Image 
                              source={roleBasedProfilePicture} 
                              style={styles.fbPostAvatar}
                            />
                          ) : profileData.profile?.profile_image ? (
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
              <View style={styles.emptyAnnouncements}>
                <Text style={styles.emptyAnnouncementsIcon}>📢</Text>
                <Text style={styles.emptyAnnouncementsText}>No announcements yet</Text>
                <Text style={styles.emptyAnnouncementsSubtext}>
                  This user hasn't posted any announcements
                </Text>
              </View>
            )}
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
                  length: SCREEN_WIDTH,
                  offset: SCREEN_WIDTH * index,
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F2F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F2F5",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F2F5",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: "#C17A47",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#C17A47",
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  backIcon: {
    color: "white",
    fontSize: 24,
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImageBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#C17A47",
    overflow: "hidden",
    marginBottom: 12,
  },
  profileImage: {
    width: 94,
    height: 94,
    borderRadius: 47,
  },
  profileImagePlaceholder: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: "#C17A47",
    justifyContent: "center",
    alignItems: "center",
  },
  profileImageText: {
    color: "white",
    fontSize: 36,
    fontWeight: "700",
  },
  displayName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#050505",
    marginBottom: 6,
    textAlign: "center",
  },
  roleBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 6,
  },
  roleBadgeText: {
    color: "#050505",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: "#F0F2F5",
    marginBottom: 12,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  messageButton: {
    width: "100%",
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#C17A47",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#C17A47",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    marginTop: 14,
  },
  messageButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  infoSection: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#050505",
    marginBottom: 12,
  },
  infoContent: {
    gap: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F2F5",
    justifyContent: "center",
    alignItems: "center",
  },
  infoIcon: {
    fontSize: 18,
  },
  infoTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 11,
    color: "#65676B",
    marginBottom: 1,
    fontWeight: "500",
  },
  infoText: {
    fontSize: 14,
    color: "#050505",
    fontWeight: "400",
  },
  announcementsSection: {
    marginBottom: 24,
    marginHorizontal: 16,
  },
  announcementsSectionHeader: {
    marginBottom: 12,
  },
  loadingAnnouncementsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: "white",
    borderRadius: 8,
  },
  loadingAnnouncementsText: {
    textAlign: 'center',
    marginTop: 10,
    color: '#666',
    fontSize: 13,
  },
  announcementsList: {
    gap: 12,
  },
  fbPostCard: {
    backgroundColor: "white",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 12,
  },
  fbPostHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  fbPostAuthorInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  fbPostAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  fbPostAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#C17A47",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  fbPostAvatarText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
  fbPostAuthorText: {
    flex: 1,
  },
  fbPostAuthorName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#050505",
    marginBottom: 2,
  },
  fbPostMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  fbPostTime: {
    fontSize: 12,
    color: "#65676B",
  },
  fbPostMetaSeparator: {
    fontSize: 12,
    color: "#65676B",
  },
  fbPostVisibility: {
    fontSize: 11,
  },
  fbPostTitleContainer: {
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  fbPostTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#050505",
  },
  fbPostContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  fbPostText: {
    fontSize: 14,
    color: "#050505",
    lineHeight: 19,
  },
  carouselContainer: {
    position: "relative",
  },
  fbPostImage: {
    width: "100%",
    height: 280,
    backgroundColor: "#F0F2F5",
  },
  paginationContainer: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  paginationDotActive: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  imageCounter: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCounterText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyAnnouncements: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: "white",
    borderRadius: 8,
    marginTop: 8,
  },
  emptyAnnouncementsIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyAnnouncementsText: {
    fontSize: 14,
    color: "#65676B",
    fontWeight: "600",
  },
  emptyAnnouncementsSubtext: {
    fontSize: 12,
    color: "#65676B",
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseButton: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  modalCloseText: {
    color: "white",
    fontSize: 24,
    fontWeight: "300",
  },
  modalImageContainer: {
    width: SCREEN_WIDTH,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: {
    width: SCREEN_WIDTH,
    height: "80%",
  },
  modalImageCounter: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modalImageCounterText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
})