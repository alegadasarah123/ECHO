"use client"

// HORSE_OPERATOR Horse Screen - Complete Updated Code with Health Status

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

const API_BASE_URL = "http://192.168.101.2:8000/api/horse_operator"

const HorseScreen = () => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("horse")
  const [horses, setHorses] = useState<Horse[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [userFirstName, setUserFirstName] = useState<string | null>(null)
  const [searchText, setSearchText] = useState("")
  const [notificationCount] = useState(0)

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

  const sortedHorses = [...horses].sort((a, b) => {
    const nameA = a.horse_name.toLowerCase()
    const nameB = b.horse_name.toLowerCase()
    return nameA.localeCompare(nameB)
  })

  const filteredHorses = sortedHorses.filter((horse) =>
    horse.horse_name.toLowerCase().includes(searchText.toLowerCase()),
  )

  const deleteHorse = async (horseId: string, horseName: string) => {
    Alert.alert("Delete Horse", `Are you sure you want to delete ${horseName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            console.log("🗑️ Deleting horse:", horseId)
            const response = await fetch(`${API_BASE_URL}/delete_horse/${horseId}/`, {
              method: "DELETE",
            })
            const data = await response.json()

            if (response.ok) {
              console.log("✅ Horse deleted successfully")
              setHorses((prev) => prev.filter((h) => h.horse_id !== horseId))
              Alert.alert("Success", "Horse deleted successfully")
            } else {
              console.log("❌ Delete failed:", data)
              Alert.alert("Error", data.error || "Failed to delete horse")
            }
          } catch (error) {
            console.error("❌ Error deleting horse:", error)
            Alert.alert("Error", "Failed to delete horse")
          }
        },
      },
    ])
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
    router.push({ pathname: "/HORSE_OPERATOR/Hfeed", params: { horseName, horseId } })
  }

  const handleWater = (horseName: string, horseId: string) => {
    router.push({ pathname: "/HORSE_OPERATOR/water", params: { horseName, horseId } })
  }

  const handleHorseProfile = (horse: Horse) => {
    router.push({
      pathname: "../HORSE_OPERATOR/horseprofile",
      params: { id: horse.horse_id, horseData: JSON.stringify(horse) },
    })
  }

  // Dashboard/Home Icon Component
  const DashboardIcon = ({ color }: { color: string }) => (
    <View style={styles.iconContainer}>
      <View style={styles.dashboardGrid}>
        <View style={[styles.gridSquare, styles.gridTopLeft, { backgroundColor: color }]} />
        <View style={[styles.gridSquare, styles.gridTopRight, { backgroundColor: color }]} />
        <View style={[styles.gridSquare, styles.gridBottomLeft, { backgroundColor: color }]} />
        <View style={[styles.gridSquare, styles.gridBottomRight, { backgroundColor: color }]} />
      </View>
    </View>
  )

  // Profile Icon Component
  const ProfileIcon = ({ color }: { color: string }) => (
    <View style={styles.iconContainer}>
      <View style={styles.profileContainer}>
        <View style={[styles.profileHead, { backgroundColor: color }]} />
        <View style={[styles.profileBody, { backgroundColor: color }]} />
      </View>
    </View>
  )

  // TabButton Component
  interface TabButtonProps {
    iconName: string
    label: string
    tabKey: string
    isActive: boolean
    onPress?: () => void
  }

  const TabButton = ({ iconName, label, tabKey, isActive, onPress }: TabButtonProps) => {
    const handlePress = () => {
      if (onPress) {
        onPress()
      } else {
        setActiveTab(tabKey)
        const routes: { [key: string]: string } = {
          home: "/HORSE_OPERATOR/home",
          horses: "/HORSE_OPERATOR/horse",
          messages: "/HORSE_OPERATOR/Hmessage",
          bookings: "/HORSE_OPERATOR/Hcalendar",
          profile: "/HORSE_OPERATOR/profile",
        }
        router.push(routes[tabKey] as any)
      }
    }

    const renderIcon = () => {
      if (iconName === "home") {
        return <DashboardIcon color={isActive ? "white" : "#666"} />
      } else if (iconName === "user") {
        return <ProfileIcon color={isActive ? "white" : "#666"} />
      } else {
        return <FontAwesome5 name={iconName} size={scale(16)} color={isActive ? "white" : "#666"} />
      }
    }

    return (
      <TouchableOpacity style={styles.tabButton} onPress={handlePress}>
        <View style={[styles.tabIcon, isActive && styles.activeTabIcon]}>{renderIcon()}</View>
        <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>{label}</Text>
      </TouchableOpacity>
    )
  }

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <FontAwesome5 name="horse" size={scale(64)} color="#CD853F" />
      </View>
      <Text style={styles.emptyStateTitle}>No Horses Yet</Text>
      <Text style={styles.emptyStateText}>
        Start building your stable by adding your first horse. Track their health, feeding schedules, and care routines
        all in one place.
      </Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={() => router.push("/HORSE_OPERATOR/addhorse")}
        activeOpacity={0.7}
      >
        <FontAwesome5 name="plus" size={scale(16)} color="#FFFFFF" style={{ marginRight: scale(8) }} />
        <Text style={styles.emptyStateButtonText}>Add Your First Horse</Text>
      </TouchableOpacity>
    </View>
  )

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await SecureStore.deleteItemAsync("access_token")
          await SecureStore.deleteItemAsync("user_data")
          router.replace("/auth/login" as any)
        },
      },
    ])
  }

  const MenuIcon = ({ color }: { color: string }) => (
    <View style={styles.iconContainer}>
      <View style={[styles.menuBar, { backgroundColor: color }]} />
      <View style={[styles.menuBar, { backgroundColor: color, marginTop: scale(3) }]} />
      <View style={[styles.menuBar, { backgroundColor: color, marginTop: scale(3) }]} />
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
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={() => router.push("/HORSE_OPERATOR/Hnotif" as any)}>
              <FontAwesome5 name="bell" size={scale(18)} color="white" />
              {notificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{notificationCount > 99 ? "99+" : notificationCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.sosButton} onPress={() => router.push("/HORSE_OPERATOR/Hsos" as any)}>
              <Image source={require("../../assets/images/sos.png")} style={styles.sosIcon} resizeMode="contain" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
              <MenuIcon color="white" />
            </TouchableOpacity>
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
            <Text style={styles.pageSubtitle}>
              {filteredHorses.length} {filteredHorses.length === 1 ? "Horse" : "Horses"} in your stable
            </Text>
          </View>

          <View style={styles.content}>
            {filteredHorses.length === 0 ? (
              <EmptyState />
            ) : (
              filteredHorses.map((horse, index) => (
                <View
                  key={horse.horse_id}
                  style={[styles.horseCard, { marginTop: index === 0 ? 0 : dynamicSpacing(16) }]}
                >
                  <TouchableOpacity
                    style={styles.horseCardContent}
                    onPress={() => handleHorseProfile(horse)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.horseHeader}>
                      <View style={styles.horseImageContainer}>
                        <View style={styles.horseAvatarWrapper}>
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
                                '#6C757D'
                              } 
                            />
                            <Text style={[
                              styles.horseMetaText,
                              {
                                color: horse.horse_status === 'Healthy' ? '#28A745' : 
                                       horse.horse_status === 'Sick' ? '#DC3545' : 
                                       horse.horse_status === 'Under Treatment' ? '#FFC107' : 
                                       '#6C757D',
                                fontWeight: '600'
                              }
                            ]}>
                              {horse.horse_status || 'Unknown'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteHorse(horse.horse_id, horse.horse_name)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <FontAwesome5 name="trash-alt" size={scale(16)} color="#DC3545" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />

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
                          <Text style={[styles.actionButtonText, styles.feedButtonText]}>Feed</Text>
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
                          <Text style={[styles.actionButtonText, styles.waterButtonText]}>Water</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>

      {/* Floating Add Button */}
      {horses.length > 0 && (
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
        <TabButton iconName="home" label="Home" tabKey="home" isActive={activeTab === "home"} />
        <TabButton iconName="horse" label="Horses" tabKey="horses" isActive={activeTab === "horse"} />
        <TabButton iconName="comment-dots" label="Chat" tabKey="messages" isActive={activeTab === "message"} />
        <TabButton iconName="calendar-alt" label="Calendar" tabKey="bookings" isActive={activeTab === "calendar"} />
        <TabButton iconName="user" label="Profile" tabKey="profile" isActive={activeTab === "profile"} />
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
  userEmail: {
    fontSize: moderateScale(12),
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: verticalScale(2),
  },
  statusText: {
    fontSize: moderateScale(11),
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: verticalScale(4),
    fontStyle: "italic",
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

  // Delete Button
  deleteButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "#FFF5F5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FED7D7",
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
    paddingHorizontal: scale(2),
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
  dashboardGrid: {
    width: scale(14),
    height: scale(14),
    position: "relative",
  },
  gridSquare: {
    width: scale(5),
    height: scale(5),
    position: "absolute",
  },
  gridTopLeft: {
    top: 0,
    left: 0,
  },
  gridTopRight: {
    top: 0,
    right: 0,
  },
  gridBottomLeft: {
    bottom: 0,
    left: 0,
  },
  gridBottomRight: {
    bottom: 0,
    right: 0,
  },
  profileContainer: {
    width: scale(14),
    height: scale(14),
    position: "relative",
    alignItems: "center",
  },
  profileHead: {
    width: scale(5),
    height: scale(5),
    borderRadius: scale(2.5),
    position: "absolute",
    top: 0,
  },
  profileBody: {
    width: scale(10),
    height: scale(7),
    borderTopLeftRadius: scale(5),
    borderTopRightRadius: scale(5),
    position: "absolute",
    bottom: 0,
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
  menuBar: {
    width: scale(10),
    height: scale(1.5),
  },
})

export default HorseScreen
