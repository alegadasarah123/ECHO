// HORSE_OPERATOR Horse Screen - Complete Updated Code with Alive/Deceased Tabs
"use client"

import { useState, useCallback } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  StatusBar,
  TextInput,
} from "react-native"
import { useRouter, useFocusEffect } from "expo-router"
import { FontAwesome5 } from "@expo/vector-icons"
import * as SecureStore from "expo-secure-store"

const { width, height } = Dimensions.get("window")

// Responsive scaling functions
const scale = (size: number) => {
  const scaleFactor = width / 375
  const scaledSize = size * scaleFactor
  return Math.max(Math.min(scaledSize, size * 1.2), size * 0.8)
}

const verticalScale = (size: number) => {
  const scaleFactor = height / 812
  const scaledSize = size * scaleFactor
  return Math.max(Math.min(scaledSize, size * 1.15), size * 0.85)
}

const moderateScale = (size: number, factor = 0.5) => {
  const scaledSize = size + (scale(size) - size) * factor
  return Math.max(Math.min(scaledSize, size * 1.1), size * 0.9)
}

const dynamicSpacing = (baseSize: number) => {
  if (width < 350) return verticalScale(baseSize * 0.7)
  if (width < 400) return verticalScale(baseSize * 0.85)
  if (width > 450) return verticalScale(baseSize * 1.05)
  return verticalScale(baseSize)
}

const getSafeAreaPadding = () => {
  const statusBarHeight = StatusBar.currentHeight || 0
  return {
    top: Math.max(statusBarHeight, 20),
    bottom: height > 800 ? 34 : 20,
  }
}

interface Horse {
  horse_id: string
  horse_name: string
  horse_age: string
  horse_dob: string
  horse_sex: string
  horse_breed: string
  horse_color: string
  horse_height: string
  horse_weight: string
  horse_image: string | null
  horse_status?: string
  lastVetCheck?: string
  condition?: string
  conditionColor?: string
}

interface UserData {
  id: string
  email: string
  profile?: {
    op_id: string
    op_fname?: string
    op_lname?: string
    op_mname?: string
    op_phone_num?: string
    op_email?: string
    [key: string]: any
  }
  access_token: string
  refresh_token?: string
  user_status?: string
  user_role: string
}

const API_BASE_URL = "http://10.254.39.148:8000/api/horse_operator"

type HorseTab = 'alive' | 'deceased'

const HorseScreen = () => {
  const router = useRouter()
  const [horses, setHorses] = useState<Horse[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [userFirstName, setUserFirstName] = useState<string | null>(null)
  const [searchText, setSearchText] = useState("")
  const [activeHorseTab, setActiveHorseTab] = useState<HorseTab>('alive')
  
  // Current active tab - using string type to allow comparison with all tab keys
  const activeTab: string = "horses"

  const safeArea = getSafeAreaPadding()

  const loadUserId = async () => {
    try {
      const storedUser = await SecureStore.getItemAsync("user_data")
      if (storedUser) {
        const parsed = JSON.parse(storedUser)
        const id = parsed.user_id || parsed.id
        if (id) {
          console.log("🔑 Loaded user_id from storage:", id)
          setUserId(id)
          setUserData(parsed)
          return id
        }
      }
    } catch (error) {
      console.error("❌ Error loading user data:", error)
    }
    return null
  }

  const fetchUserProfile = useCallback(
    async (uid: string) => {
      try {
        console.log("📡 Fetching user profile for user_id:", uid)
        const url = `${API_BASE_URL}/get_horse_operator_profile/?user_id=${encodeURIComponent(uid)}`
        console.log("🌐 Request URL:", url)

        const response = await fetch(url)
        console.log("📊 Response status:", response.status)

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          console.log("❌ Error response:", errData)
          throw new Error(errData.error || `Failed with status ${response.status}`)
        }

        const data = await response.json()
        console.log("✅ User profile data:", data)

        // Extract first name from response
        const firstName = data?.op_fname || userData?.profile?.op_fname || "User"
        setUserFirstName(firstName)
      } catch (error: any) {
        console.error("❌ Error loading user profile:", error)
        // Fallback to stored data
        setUserFirstName(userData?.profile?.op_fname || "User")
      }
    },
    [userData?.profile?.op_fname],
  )

  const fetchHorses = useCallback(
    async (uid?: string) => {
      try {
        let targetUid = uid || userId
        if (!targetUid) {
          targetUid = await loadUserId()
          if (!targetUid) {
            console.error("❌ No user_id found, cannot fetch horses.")
            return
          }
        }

        console.log("📡 Fetching horses for user_id:", targetUid)

        const url = `${API_BASE_URL}/get_horses/?user_id=${encodeURIComponent(targetUid)}`
        console.log("🌐 Request URL:", url)

        const response = await fetch(url)
        console.log("📊 Response status:", response.status)

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          console.log("❌ Error response:", errData)
          throw new Error(errData.error || `Failed with status ${response.status}`)
        }

        const data = await response.json()
        console.log("✅ Raw response data:", data)
        console.log("📊 Number of horses received:", Array.isArray(data) ? data.length : "Not array")

        setHorses(Array.isArray(data) ? data : [])
      } catch (error: any) {
        console.error("❌ Error loading horses:", error)
        Alert.alert("Error", error.message || "Unable to load horses")
      }
    },
    [userId],
  )

  // Filter horses based on active tab
  const filteredHorsesByTab = horses.filter(horse => {
    const isDeceased = horse.horse_status === 'Deceased'
    if (activeHorseTab === 'alive') {
      return !isDeceased
    } else {
      return isDeceased
    }
  })

  // Sort and search filtered horses
  const sortedHorses = [...filteredHorsesByTab].sort((a, b) => {
    const nameA = a.horse_name.toLowerCase()
    const nameB = b.horse_name.toLowerCase()
    return nameA.localeCompare(nameB)
  })

  const filteredHorses = sortedHorses.filter((horse) =>
    horse.horse_name.toLowerCase().includes(searchText.toLowerCase()),
  )

  // Count horses for each tab
  const aliveHorsesCount = horses.filter(horse => horse.horse_status !== 'Deceased').length
  const deceasedHorsesCount = horses.filter(horse => horse.horse_status === 'Deceased').length

  const markHorseDeceased = async (horseId: string, horseName: string) => {
    Alert.alert(
      "Mark Horse as Deceased", 
      `Are you sure you want to mark ${horseName} as deceased? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark as Deceased",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("🕊️ Marking horse as deceased:", horseId)
              const response = await fetch(`${API_BASE_URL}/mark_horse_deceased/${horseId}/`, {
                method: "PUT",
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  user_id: userId
                })
              })
              
              const data = await response.json()

              if (response.ok) {
                console.log("✅ Horse marked as deceased successfully")
                // Update local state to reflect the status change
                setHorses((prev) => 
                  prev.map((h) => 
                    h.horse_id === horseId 
                      ? { ...h, horse_status: "Deceased" }
                      : h
                  )
                )
                Alert.alert("Success", `${horseName} has been marked as deceased`)
              } else {
                console.log("❌ Mark as deceased failed:", data)
                Alert.alert("Error", data.error || "Failed to mark horse as deceased")
              }
            } catch (error) {
              console.error("❌ Error marking horse as deceased:", error)
              Alert.alert("Error", "Failed to mark horse as deceased")
            }
          },
        },
      ]
    )
  }

  useFocusEffect(
    useCallback(() => {
      console.log("🎯 Horse screen focused - refreshing data...")
      const initializeScreen = async () => {
        let uid = userId
        if (!uid) {
          uid = await loadUserId()
        }
        if (uid) {
          await fetchHorses(uid)
          await fetchUserProfile(uid)
        }
      }
      initializeScreen()
    }, [userId, fetchHorses, fetchUserProfile]),
  )

  const handleFeed = (horseName: string, horseId: string) => {
    // Check if horse is deceased before allowing feed
    const horse = horses.find(h => h.horse_id === horseId)
    if (horse?.horse_status === 'Deceased') {
      Alert.alert("Cannot Feed", `${horseName} is deceased and cannot be fed.`)
      return
    }
    router.push({ pathname: "/HORSE_OPERATOR/Hfeed", params: { horseName, horseId } })
  }

  const handleWater = (horseName: string, horseId: string) => {
    // Check if horse is deceased before allowing water
    const horse = horses.find(h => h.horse_id === horseId)
    if (horse?.horse_status === 'Deceased') {
      Alert.alert("Cannot Water", `${horseName} is deceased and cannot be watered.`)
      return
    }
    router.push({ pathname: "/HORSE_OPERATOR/water", params: { horseName, horseId } })
  }

  const handleHorseProfile = (horse: Horse) => {
    router.push({
      pathname: "../HORSE_OPERATOR/horseprofile",
      params: { id: horse.horse_id, horseData: JSON.stringify(horse) },
    })
  }

  const TabButton = ({
    iconSource,
    label,
    tabKey,
    isActive,
    onPress,
  }: {
    iconSource: any
    label: string
    tabKey: string
    isActive: boolean
    onPress?: () => void
  }) => (
    <TouchableOpacity style={styles.tabButton} onPress={onPress}>
      <View style={[styles.tabIcon, isActive && styles.activeTabIcon]}>
        {iconSource ? (
          <Image
            source={iconSource}
            style={[styles.tabIconImage, { tintColor: isActive ? "white" : "#666" }]}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.fallbackIcon} />
        )}
      </View>
      <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>{label}</Text>
    </TouchableOpacity>
  )

  const HorseTabButton = ({
    label,
    count,
    isActive,
    onPress,
    type,
  }: {
    label: string
    count: number
    isActive: boolean
    onPress: () => void
    type: HorseTab
  }) => (
    <TouchableOpacity
      style={[styles.horseTabButton, isActive && styles.activeHorseTabButton]}
      onPress={onPress}
    >
      <Text style={[styles.horseTabLabel, isActive && styles.activeHorseTabLabel]}>
        {label}
      </Text>
      <View style={[styles.horseTabCount, isActive && styles.activeHorseTabCount]}>
        <Text style={[styles.horseTabCountText, isActive && styles.activeHorseTabCountText]}>
          {count}
        </Text>
      </View>
    </TouchableOpacity>
  )

  const EmptyState = ({ isDeceasedTab = false }: { isDeceasedTab?: boolean }) => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <FontAwesome5 
          name={isDeceasedTab ? "skull" : "horse"} 
          size={scale(64)} 
          color={isDeceasedTab ? "#6C757D" : "#CD853F"} 
        />
      </View>
      <Text style={styles.emptyStateTitle}>
        {isDeceasedTab ? "No Deceased Horses" : "No Horses Yet"}
      </Text>
      <Text style={styles.emptyStateText}>
        {isDeceasedTab 
          ? "There are no deceased horses in your records."
          : "Start building your stable by adding your first horse. Track their health, and feeding schedules all in one place."
        }
      </Text>
      {!isDeceasedTab && (
        <TouchableOpacity
          style={styles.emptyStateButton}
          onPress={() => router.push("/HORSE_OPERATOR/addhorse")}
          activeOpacity={0.7}
        >
          <FontAwesome5 name="plus" size={scale(16)} color="#FFFFFF" style={{ marginRight: scale(8) }} />
          <Text style={styles.emptyStateButtonText}>Add Your First Horse</Text>
        </TouchableOpacity>
      )}
    </View>
  )

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#CD853F" translucent={false} />

      {/* Header Section */}
      <View style={[styles.header, { paddingTop: safeArea.top }]}>
        <View style={styles.headerTop}>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome,</Text>
            <Text style={styles.userName}>{userFirstName}</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search horses..."
            placeholderTextColor="#999"
          />
          <TouchableOpacity style={styles.searchButton}>
            <FontAwesome5 name="search" size={scale(16)} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content Section */}
      <View style={styles.contentContainer}>
        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentContainer}
        >
          {/* Page Title */}
          <View style={styles.titleSection}>
            <Text style={styles.pageTitle}>My Horses</Text>
          </View>

          {/* Horse Status Tabs */}
          <View style={styles.horseTabsContainer}>
            <HorseTabButton
              label="Active Horses"
              count={aliveHorsesCount}
              isActive={activeHorseTab === 'alive'}
              onPress={() => setActiveHorseTab('alive')}
              type="alive"
            />
            <HorseTabButton
              label="Deceased Horses"
              count={deceasedHorsesCount}
              isActive={activeHorseTab === 'deceased'}
              onPress={() => setActiveHorseTab('deceased')}
              type="deceased"
            />
          </View>

          <View style={styles.content}>
            {filteredHorses.length === 0 ? (
              <EmptyState isDeceasedTab={activeHorseTab === 'deceased'} />
            ) : (
              filteredHorses.map((horse, index) => (
                <View
                  key={horse.horse_id}
                  style={[
                    styles.horseCard, 
                    { 
                      marginTop: index === 0 ? 0 : dynamicSpacing(16),
                      opacity: horse.horse_status === 'Deceased' ? 0.7 : 1
                    }
                  ]}
                >
                  {horse.horse_status === 'Deceased' && (
                    <View style={styles.deceasedOverlay}>
                      <Text style={styles.deceasedText}>Deceased</Text>
                    </View>
                  )}
                  
                  <TouchableOpacity
                    style={styles.horseCardContent}
                    onPress={() => handleHorseProfile(horse)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.horseHeader}>
                      <View style={styles.horseImageContainer}>
                        <View style={[
                          styles.horseAvatarWrapper,
                          horse.horse_status === 'Deceased' && styles.deceasedAvatar
                        ]}>
                          <Image
                            source={
                              horse.horse_image && !horse.horse_image.startsWith("file:///")
                                ? { uri: horse.horse_image }
                                : require("../../assets/images/horse.png")
                            }
                            style={styles.horseImage}
                          />
                        </View>
                      </View>

                      <View style={styles.horseInfo}>
                        <Text style={styles.horseName}>{horse.horse_name}</Text>
                        <View style={styles.horseMetaRow}>
                          <View style={styles.horseMetaItem}>
                            <FontAwesome5 name="birthday-cake" size={scale(12)} color="#CD853F" />
                            <Text style={styles.horseMetaText}>Age {horse.horse_age}</Text>
                          </View>
                        </View>
                        <View style={styles.horseMetaRow}>
                          <View style={styles.horseMetaItem}>
                            <FontAwesome5 name="dna" size={scale(12)} color="#CD853F" />
                            <Text style={styles.horseMetaText}>{horse.horse_breed}</Text>
                          </View>
                        </View>
                        <View style={styles.horseMetaRow}>
                          <View style={styles.horseMetaItem}>
                            <FontAwesome5 
                              name="heartbeat" 
                              size={scale(12)} 
                              color={
                                horse.horse_status === 'Healthy' ? '#28A745' : 
                                horse.horse_status === 'Sick' ? '#DC3545' : 
                                horse.horse_status === 'Under Treatment' ? '#FFC107' : 
                                horse.horse_status === 'Deceased' ? '#6C757D' :
                                '#6C757D'
                              } 
                            />
                            <Text style={[
                              styles.horseMetaText,
                              {
                                color: horse.horse_status === 'Healthy' ? '#28A745' : 
                                       horse.horse_status === 'Sick' ? '#DC3545' : 
                                       horse.horse_status === 'Under Treatment' ? '#FFC107' : 
                                       horse.horse_status === 'Deceased' ? '#6C757D' :
                                       '#6C757D',
                                fontWeight: '600'
                              }
                            ]}>
                              {horse.horse_status || 'Unknown'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {activeHorseTab === 'alive' && (
                        <TouchableOpacity
                          style={styles.deceasedButton}
                          onPress={() => markHorseDeceased(horse.horse_id, horse.horse_name)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <FontAwesome5 name="skull" size={scale(16)} color="#6C757D" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.divider} />

                    {activeHorseTab === 'alive' && (
                      <View style={styles.actionSection}>
                        <View style={styles.actionButtons}>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.feedButton]}
                            onPress={(e) => {
                              e.stopPropagation()
                              handleFeed(horse.horse_name, horse.horse_id)
                            }}
                            activeOpacity={0.8}
                          >
                            <FontAwesome5 name="pagelines" size={scale(16)} color="#28A745" />
                            <Text style={[styles.actionButtonText, styles.feedButtonText]}>
                              Feed
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionButton, styles.waterButton]}
                            onPress={(e) => {
                              e.stopPropagation()
                              handleWater(horse.horse_name, horse.horse_id)
                            }}
                            activeOpacity={0.8}
                          >
                            <FontAwesome5 name="tint" size={scale(16)} color="#007BFF" />
                            <Text style={[styles.actionButtonText, styles.waterButtonText]}>
                              Water
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>

      {/* Floating Add Button */}
      {activeHorseTab === 'alive' && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/HORSE_OPERATOR/addhorse")}
          activeOpacity={0.8}
        >
          <FontAwesome5 name="plus" size={scale(20)} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Bottom Navigation */}
      <View style={[styles.tabBar, { paddingBottom: safeArea.bottom }]}>
        <TabButton 
          iconSource={require("../../assets/images/home.png")} 
          label="Home" 
          tabKey="home" 
          isActive={activeTab === "home"}
          onPress={() => router.push("/HORSE_OPERATOR/home" as any)} 
        />
        <TabButton
          iconSource={require("../../assets/images/horse.png")}
          label="Horses"
          tabKey="horses"
          isActive={activeTab === "horses"}
          onPress={() => router.push("../HORSE_OPERATOR/horse" as any)}
        />
        <TabButton
          iconSource={require("../../assets/images/chat.png")}
          label="Chat"
          tabKey="messages"
          isActive={activeTab === "messages"}
          onPress={() => router.push("../HORSE_OPERATOR/Hmessage" as any)}
        />
        <TabButton
          iconSource={require("../../assets/images/calendar.png")}
          label="Calendar"
          tabKey="bookings"
          isActive={activeTab === "bookings"}
          onPress={() => router.push("../HORSE_OPERATOR/Hcalendar" as any)}
        />
        <TabButton
          iconSource={require("../../assets/images/profile.png")}
          label="Profile"
          tabKey="profile"
          isActive={activeTab === "profile"}
          onPress={() => router.push("../HORSE_OPERATOR/profile" as any)}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#CD853F",
  },

  // Header Styles
  header: {
    backgroundColor: "#CD853F",
    paddingHorizontal: scale(16),
    paddingBottom: dynamicSpacing(16),
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: verticalScale(16),
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: moderateScale(14),
    color: "white",
    fontWeight: "400",
    marginBottom: verticalScale(2),
  },
  userName: {
    fontSize: moderateScale(20),
    fontWeight: "bold",
    color: "white",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
  },
  headerButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Content Styles
  contentContainer: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: verticalScale(100),
  },
  titleSection: {
    paddingHorizontal: scale(16),
    paddingTop: dynamicSpacing(16),
    paddingBottom: dynamicSpacing(8),
  },
  pageTitle: {
    fontSize: moderateScale(20),
    fontWeight: "bold",
    color: "#333",
  },
  pageSubtitle: {
    fontSize: moderateScale(12),
    color: "#666",
    fontWeight: "500",
    marginTop: verticalScale(4),
  },

  // Horse Tabs Styles
  horseTabsContainer: {
    flexDirection: "row",
    marginHorizontal: scale(16),
    marginVertical: dynamicSpacing(12),
    backgroundColor: "#FFFFFF",
    borderRadius: scale(12),
    padding: scale(4),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F3F4",
  },
  horseTabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(12),
    borderRadius: scale(8),
    backgroundColor: "transparent",
  },
  activeHorseTabButton: {
    backgroundColor: "#CD853F",
  },
  horseTabLabel: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#6C757D",
    marginRight: scale(6),
  },
  activeHorseTabLabel: {
    color: "#FFFFFF",
  },
  horseTabCount: {
    backgroundColor: "#E9ECEF",
    borderRadius: scale(12),
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    minWidth: scale(24),
    alignItems: "center",
    justifyContent: "center",
  },
  activeHorseTabCount: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  horseTabCountText: {
    fontSize: moderateScale(12),
    fontWeight: "700",
    color: "#6C757D",
  },
  activeHorseTabCountText: {
    color: "#FFFFFF",
  },

  content: {
    paddingHorizontal: scale(16),
    paddingTop: dynamicSpacing(8),
  },

  // Empty State Styles
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(80),
    paddingHorizontal: scale(40),
  },
  emptyIconContainer: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E9ECEF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(24),
  },
  emptyStateTitle: {
    fontSize: moderateScale(24),
    fontWeight: "700",
    color: "#2C3E50",
    marginBottom: verticalScale(12),
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: moderateScale(16),
    color: "#6C757D",
    textAlign: "center",
    lineHeight: moderateScale(24),
    marginBottom: verticalScale(32),
    maxWidth: scale(280),
  },
  emptyStateButton: {
    backgroundColor: "#CD853F",
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    borderRadius: scale(25),
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#CD853F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyStateButtonText: {
    color: "#FFFFFF",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },

  // Horse Card Styles
  horseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(16),
    marginBottom: dynamicSpacing(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F1F3F4",
    position: 'relative',
  },
  horseCardContent: {
    padding: scale(14),
  },
  horseHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: verticalScale(12),
  },
  horseImageContainer: {
    position: "relative",
    marginRight: scale(12),
  },
  horseAvatarWrapper: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(16),
    backgroundColor: "#F8F9FA",
    borderWidth: 2,
    borderColor: "#E9ECEF",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  deceasedAvatar: {
    borderColor: "#6C757D",
    backgroundColor: "#F8F9FA",
  },
  horseImage: {
    width: scale(96),
    height: scale(96),
    borderRadius: scale(14),
  },
  horseInfo: {
    flex: 1,
    paddingTop: verticalScale(4),
  },
  horseName: {
    fontSize: moderateScale(20),
    fontWeight: "700",
    color: "#2C3E50",
    marginBottom: verticalScale(8),
  },
  horseMetaRow: {
    flexDirection: "row",
    marginBottom: verticalScale(4),
  },
  horseMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: scale(16),
    flex: 1,
  },
  horseMetaText: {
    fontSize: moderateScale(14),
    color: "#6C757D",
    marginLeft: scale(6),
    fontWeight: "500",
  },

  // Deceased Button
  deceasedButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },

  // Deceased Overlay
  deceasedOverlay: {
    position: 'absolute',
    top: scale(10),
    right: scale(10),
    backgroundColor: 'rgba(108, 117, 125, 0.9)',
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(20),
    zIndex: 10,
  },
  deceasedText: {
    color: 'white',
    fontSize: moderateScale(12),
    fontWeight: '600',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: "#E9ECEF",
    marginBottom: verticalScale(16),
  },

  // Action Section
  actionSection: {},
  actionButtons: {
    flexDirection: "row",
    gap: scale(12),
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    borderRadius: scale(12),
    borderWidth: 1,
    minHeight: 44,
  },
  feedButton: {
    backgroundColor: "#F8FFF8",
    borderColor: "#D4EDDA",
  },
  waterButton: {
    backgroundColor: "#F0F8FF",
    borderColor: "#CCE7FF",
  },
  actionButtonText: {
    fontSize: moderateScale(15),
    fontWeight: "600",
    marginLeft: scale(8),
  },
  feedButtonText: {
    color: "#28A745",
  },
  waterButtonText: {
    color: "#007BFF",
  },

  // Add Button
  addButton: {
    position: "absolute",
    right: scale(24),
    bottom: verticalScale(100),
    width: scale(56),
    height: scale(56),
    backgroundColor: "#CD853F",
    borderRadius: scale(28),
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#CD853F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  // Bottom Tab Navigation
  tabBar: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingVertical: dynamicSpacing(8),
    paddingHorizontal: scale(8),
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    minHeight: verticalScale(60),
    alignItems: "center",
    justifyContent: "space-around",
  },
  tabButton: { 
    flex: 1, 
    alignItems: "center", 
    paddingVertical: verticalScale(4), 
    paddingHorizontal: scale(2) 
  },
  tabIcon: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(2),
  },
  activeTabIcon: {
    backgroundColor: "#CD853F",
  },
  tabIconImage: { 
    width: scale(16), 
    height: scale(16) 
  },
  fallbackIcon: { 
    width: scale(14), 
    height: scale(14), 
    backgroundColor: "#666", 
    borderRadius: scale(2) 
  },
  tabLabel: {
    fontSize: moderateScale(9),
    color: "#666",
    textAlign: "center",
  },
  activeTabLabel: {
    color: "#CD853F",
    fontWeight: "600",
  },

  // Icon Styles
  iconContainer: {
    width: scale(14),
    height: scale(14),
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  menuBar: {
    width: scale(10),
    height: scale(1.5),
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: scale(20),
    paddingHorizontal: scale(12),
    height: verticalScale(40),
    minHeight: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(14),
    color: "#333",
    paddingVertical: 0,
  },
  searchButton: {
    padding: scale(4),
  },
  sosIcon: {
    width: scale(20),
    height: scale(20),
  },
  sosButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "#FF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: scale(-2),
    right: scale(-2),
    backgroundColor: "#FF4444",
    borderRadius: scale(8),
    paddingHorizontal: scale(4),
    paddingVertical: scale(1),
    minWidth: scale(16),
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadgeText: {
    color: "white",
    fontSize: moderateScale(9),
    fontWeight: "bold",
  },
  headerIconImage: { 
    width: scale(18), 
    height: scale(18) 
  },
})

export default HorseScreen