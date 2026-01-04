// HORSE_OPERATOR/kutseroprofile.tsx
import { useState, useEffect, useCallback } from "react"
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
  ActivityIndicator,
  RefreshControl,
} from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { FontAwesome5, MaterialIcons, Ionicons } from "@expo/vector-icons"
import * as SecureStore from "expo-secure-store"
import moment from "moment"

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

interface KutseroProfile {
  kutsero_id: string
  full_name: string
  first_name: string
  middle_name: string
  last_name: string
  email: string
  phone_number: string
  date_of_birth: string | null
  formatted_dob: string | null
  age: number | null
  gender: string
  address: {
    barangay: string | null
    municipality: string | null
    city: string | null
    province: string | null
    zipcode: string | null
    full_address: string
  }
  profile_image: string | null
  username: string | null
  membership_info: {
    is_member: boolean
    membership_status: string
    years_experience: number | null
    membership_verified: boolean
    applying_for_membership: boolean
    membership_application_date: string | null
    membership_verification_date: string | null
  }
  application_status: {
    status: string
    application_date: string
    review_date: string | null
    review_notes: string | null
  } | null
  assigned_horses_count: number
  created_at: string
}

interface HorseAssignment {
  assign_id: string
  horse_id: string
  horse_name: string
  horse_age: string | number | null
  horse_image: string | null
  horse_breed: string | null
  horse_color: string | null
  date_start: string
  date_end: string | null
  is_active: boolean
  formatted_date_start: string
  formatted_date_end: string
  created_at: string
  updated_at: string
}

const API_BASE_URL = "https://echo-ebl8.onrender.com/api/horse_operator"

const KutseroProfileScreen = () => {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { kutsero_id, kutsero_name } = params
  
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<KutseroProfile | null>(null)
  const [assignments, setAssignments] = useState<HorseAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'horses'>('overview')

  const loadUserId = async () => {
    try {
      const storedUser = await SecureStore.getItemAsync("user_data")
      if (storedUser) {
        const parsed = JSON.parse(storedUser)
        const id = parsed.user_id || parsed.id
        if (id) {
          console.log("🔑 Loaded user_id from storage:", id)
          setUserId(id)
          return id
        }
      }
    } catch (error) {
      console.error("❌ Error loading user data:", error)
    }
    return null
  }

  const fetchKutseroProfile = useCallback(async () => {
    try {
      setLoading(true)
      const uid = userId || await loadUserId()
      
      if (!uid) {
        Alert.alert("Error", "User not found. Please login again.")
        return
      }

      if (!kutsero_id) {
        Alert.alert("Error", "Kutsero information not found.")
        return
      }

      console.log("📡 Fetching kutsero profile:", kutsero_id)
      const response = await fetch(
        `${API_BASE_URL}/get_kutsero_profile_details/?kutsero_id=${encodeURIComponent(kutsero_id as string)}&op_id=${encodeURIComponent(uid)}`
      )
      
      console.log("📊 Response status:", response.status)
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          console.log("✅ Kutsero profile loaded:", data.profile.full_name)
          setProfile(data.profile)
        } else {
          Alert.alert("Error", data.error || "Failed to load profile")
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("❌ API Error:", errorData)
        Alert.alert("Error", errorData.error || "Failed to load profile")
      }
    } catch (error) {
      console.error("❌ Error fetching profile:", error)
      Alert.alert("Error", "Unable to load profile. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [userId, kutsero_id])

  const fetchHorseAssignments = useCallback(async () => {
    try {
      const uid = userId || await loadUserId()
      
      if (!uid || !kutsero_id) return

      console.log("📡 Fetching horse assignments for kutsero:", kutsero_id)
      const response = await fetch(
        `${API_BASE_URL}/get_kutsero_horse_assignments/?op_id=${encodeURIComponent(uid)}&kutsero_id=${encodeURIComponent(kutsero_id as string)}`
      )
      
      console.log("📊 Assignments response status:", response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Loaded ${data.length} horse assignments`)
        
        // Format assignments with proper data
        const formattedAssignments = data.map((assignment: any) => ({
          assign_id: assignment.assign_id,
          horse_id: assignment.horse_id,
          horse_name: assignment.horse_name || "Unknown Horse",
          horse_age: assignment.horse_age || assignment.horse_age_from_profile || "Unknown",
          horse_image: assignment.horse_image,
          horse_breed: assignment.horse_breed,
          horse_color: assignment.horse_color,
          date_start: assignment.date_start,
          date_end: assignment.date_end,
          is_active: !assignment.date_end || new Date(assignment.date_end) > new Date(),
          formatted_date_start: formatAssignmentDate(assignment.date_start),
          formatted_date_end: assignment.date_end ? formatAssignmentDate(assignment.date_end) : 'Ongoing',
          created_at: assignment.created_at,
          updated_at: assignment.updated_at
        }))
        
        console.log("📋 Formatted assignments:", formattedAssignments)
        setAssignments(formattedAssignments)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("❌ Error fetching assignments:", errorData)
        Alert.alert("Error", errorData.error || "Failed to load horse assignments")
      }
    } catch (error) {
      console.error("❌ Error fetching assignments:", error)
      Alert.alert("Error", "Unable to load horse assignments. Please try again.")
    }
  }, [userId, kutsero_id])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    Promise.all([fetchKutseroProfile(), fetchHorseAssignments()]).finally(() => {
      setRefreshing(false)
    })
  }, [fetchKutseroProfile, fetchHorseAssignments])

  useEffect(() => {
    console.log("🎯 Kutsero profile screen mounted")
    const initializeData = async () => {
      let uid = userId
      if (!uid) {
        uid = await loadUserId()
      }
      if (uid) {
        await Promise.all([
          fetchKutseroProfile(),
          fetchHorseAssignments()
        ])
      }
    }
    initializeData()
  }, [userId, fetchKutseroProfile, fetchHorseAssignments])

  // Helper function to format assignment dates
  const formatAssignmentDate = (dateString: string) => {
    if (!dateString) return 'Not specified'
    
    try {
      // Handle ISO format or date string
      const date = moment(dateString)
      if (date.isValid()) {
        return date.format('MMM D, YYYY')
      }
      return dateString
    } catch (error) {
      console.error("Error formatting date:", error)
      return dateString
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#FFC107'
      case 'approved': return '#4CAF50'
      case 'rejected': return '#F44336'
      default: return '#6C757D'
    }
  }

  const getMembershipStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'member': return '#4CAF50'
      case 'applied': return '#2196F3'
      case 'verified': return '#9C27B0'
      case 'pending': return '#FF9800'
      case 'rejected': return '#F44336'
      default: return '#6C757D'
    }
  }

  const renderOverviewTab = () => {
    if (!profile) return null

    return (
      <View style={styles.overviewContainer}>
        {/* Personal Information Card - Simplified */}
        <View style={styles.simpleCard}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="person" size={scale(20)} color="#CD853F" />
            <Text style={styles.cardTitle}>Personal Information</Text>
          </View>
          
          <View style={styles.simpleInfoContainer}>
            <View style={styles.simpleInfoRow}>
              <Text style={styles.simpleInfoLabel}>Full Name:</Text>
              <Text style={styles.simpleInfoValue}>{profile.full_name}</Text>
            </View>
            
            <View style={styles.simpleInfoRow}>
              <Text style={styles.simpleInfoLabel}>Gender:</Text>
              <Text style={styles.simpleInfoValue}>{profile.gender || 'Not specified'}</Text>
            </View>
            
            <View style={styles.simpleInfoRow}>
              <Text style={styles.simpleInfoLabel}>Age:</Text>
              <Text style={styles.simpleInfoValue}>
                {profile.age ? `${profile.age} years` : 'Not specified'}
              </Text>
            </View>
            
            <View style={styles.simpleInfoRow}>
              <Text style={styles.simpleInfoLabel}>Date of Birth:</Text>
              <Text style={styles.simpleInfoValue}>
                {profile.formatted_dob || 'Not specified'}
              </Text>
            </View>
            
            <View style={styles.simpleInfoRow}>
              <Text style={styles.simpleInfoLabel}>Username:</Text>
              <Text style={styles.simpleInfoValue}>{profile.username || 'Not set'}</Text>
            </View>
          </View>
        </View>

        {/* Contact Information Card - Simplified */}
        <View style={styles.simpleCard}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="contact-mail" size={scale(20)} color="#2196F3" />
            <Text style={styles.cardTitle}>Contact Information</Text>
          </View>
          
          <View style={styles.simpleInfoContainer}>
            <View style={styles.simpleInfoRow}>
              <Text style={styles.simpleInfoLabel}>Email Address:</Text>
              <Text style={styles.simpleInfoValue}>{profile.email}</Text>
            </View>
            
            <View style={styles.simpleInfoRow}>
              <Text style={styles.simpleInfoLabel}>Phone Number:</Text>
              <Text style={styles.simpleInfoValue}>
                {profile.phone_number || 'Not specified'}
              </Text>
            </View>
          </View>
        </View>

        {/* Address Card - Simplified */}
        <View style={styles.simpleCard}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="location-on" size={scale(20)} color="#FF9800" />
            <Text style={styles.cardTitle}>Address</Text>
          </View>
          
          <View style={styles.addressContainer}>
            <Text style={styles.addressText}>{profile.address.full_address}</Text>
          </View>
        </View>

        {/* Membership Information Card */}
        <View style={styles.simpleCard}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="badge" size={scale(20)} color="#CD853F" />
            <Text style={styles.cardTitle}>Membership Information</Text>
          </View>
          
          <View style={styles.simpleInfoContainer}>
            <View style={styles.membershipStatus}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getMembershipStatusColor(profile.membership_info.membership_status) }
              ]}>
                <Text style={styles.statusBadgeText}>
                  {profile.membership_info.membership_status?.toUpperCase() || 'NOT APPLIED'}
                </Text>
              </View>
            </View>
            
            {profile.membership_info.years_experience && (
              <View style={styles.simpleInfoRow}>
                <Text style={styles.simpleInfoLabel}>Experience:</Text>
                <Text style={styles.simpleInfoValue}>
                  {profile.membership_info.years_experience} year{profile.membership_info.years_experience !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
            
            {profile.membership_info.membership_application_date && (
              <View style={styles.simpleInfoRow}>
                <Text style={styles.simpleInfoLabel}>Applied on:</Text>
                <Text style={styles.simpleInfoValue}>
                  {moment(profile.membership_info.membership_application_date).format('MMM D, YYYY')}
                </Text>
              </View>
            )}
            
            {profile.membership_info.membership_verification_date && (
              <View style={styles.simpleInfoRow}>
                <Text style={styles.simpleInfoLabel}>Verified on:</Text>
                <Text style={styles.simpleInfoValue}>
                  {moment(profile.membership_info.membership_verification_date).format('MMM D, YYYY')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Application Status Card (if applicable) */}
        {profile.application_status && (
          <View style={styles.simpleCard}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="assignment" size={scale(20)} color="#CD853F" />
              <Text style={styles.cardTitle}>Application Status</Text>
            </View>
            
            <View style={styles.simpleInfoContainer}>
              <View style={styles.simpleInfoRow}>
                <Text style={styles.simpleInfoLabel}>Status:</Text>
                <View style={[
                  styles.applicationStatusBadge,
                  { backgroundColor: getStatusColor(profile.application_status.status) }
                ]}>
                  <Text style={styles.applicationStatusText}>
                    {profile.application_status.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              
              <View style={styles.simpleInfoRow}>
                <Text style={styles.simpleInfoLabel}>Applied:</Text>
                <Text style={styles.simpleInfoValue}>
                  {moment(profile.application_status.application_date).format('MMM D, YYYY')}
                </Text>
              </View>
              
              {profile.application_status.review_date && (
                <View style={styles.simpleInfoRow}>
                  <Text style={styles.simpleInfoLabel}>Reviewed:</Text>
                  <Text style={styles.simpleInfoValue}>
                    {moment(profile.application_status.review_date).format('MMM D, YYYY')}
                  </Text>
                </View>
              )}
              
              {profile.application_status.review_notes && (
                <View style={styles.reviewNotesContainer}>
                  <Text style={styles.reviewNotesLabel}>Review Notes:</Text>
                  <Text style={styles.reviewNotesText}>{profile.application_status.review_notes}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    )
  }

  const renderHorsesTab = () => {
    if (assignments.length === 0) {
      return (
        <View style={styles.emptyHorsesContainer}>
          <View style={styles.emptyIconContainer}>
            <FontAwesome5 name="horse" size={scale(64)} color="#CBD5E0" />
          </View>
          <Text style={styles.emptyHorsesTitle}>No Horses Assigned</Text>
          <Text style={styles.emptyHorsesText}>
            This kutsero hasn&#39;t been assigned to any horses yet.
          </Text>
        </View>
      )
    }

    return (
      <View style={styles.horsesContainer}>
        <View style={styles.horsesHeader}>
          <Text style={styles.horsesCountText}>
            {assignments.length} horse{assignments.length !== 1 ? 's' : ''} assigned
          </Text>
        </View>
        
        {assignments.map((assignment, index) => (
          <View
            key={assignment.assign_id}
            style={[
              styles.horseCard,
              { marginTop: index === 0 ? 0 : dynamicSpacing(12) }
            ]}
          >
            <View style={styles.horseCardContent}>
              {assignment.horse_image ? (
                <Image
                  source={{ uri: assignment.horse_image }}
                  style={styles.horseImage}
                />
              ) : (
                <View style={styles.horseImagePlaceholder}>
                  <FontAwesome5 name="horse" size={scale(24)} color="#6C757D" />
                </View>
              )}
              
              <View style={styles.horseInfo}>
                <Text style={styles.horseName}>{assignment.horse_name}</Text>
                
                <View style={styles.horseDetailsRow}>
                  <MaterialIcons name="cake" size={scale(12)} color="#6C757D" />
                  <Text style={styles.horseDetailText}>
                    Age: {assignment.horse_age}
                  </Text>
                </View>
                
                {assignment.horse_breed && (
                  <View style={styles.horseDetailsRow}>
                    <MaterialIcons name="pets" size={scale(12)} color="#6C757D" />
                    <Text style={styles.horseDetailText}>
                      Breed: {assignment.horse_breed}
                    </Text>
                  </View>
                )}
                
                {assignment.horse_color && (
                  <View style={styles.horseDetailsRow}>
                    <MaterialIcons name="palette" size={scale(12)} color="#6C757D" />
                    <Text style={styles.horseDetailText}>
                      Color: {assignment.horse_color}
                    </Text>
                  </View>
                )}
                
                <View style={styles.horseDetailsRow}>
                  <MaterialIcons name="calendar-today" size={scale(12)} color="#6C757D" />
                  <Text style={styles.horseDetailText}>
                    Assigned: {assignment.formatted_date_start}
                  </Text>
                </View>

                {!assignment.is_active && assignment.formatted_date_end && (
                  <View style={styles.horseDetailsRow}>
                    <MaterialIcons name="event-busy" size={scale(12)} color="#F44336" />
                    <Text style={styles.horseDetailText}>
                      Ended: {assignment.formatted_date_end}
                    </Text>
                  </View>
                )}
                
                <View style={styles.horseDetailsRow}>
                  <MaterialIcons name="calendar-today" size={scale(12)} color="#6C757D" />
                  <Text style={styles.horseDetailText}>
                    Status: {assignment.is_active ? 'Active' : 'Completed'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#CD853F" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    )
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={scale(64)} color="#F44336" />
        <Text style={styles.errorTitle}>Profile Not Found</Text>
        <Text style={styles.errorText}>
          Unable to load kutsero profile. Please try again.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#CD853F" />

      {/* Header Section */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={scale(24)} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {kutsero_name || profile.full_name}
          </Text>
          <Text style={styles.headerSubtitle}>Kutsero Profile</Text>
        </View>
      </View>

      {/* Profile Header */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#CD853F"]}
            tintColor="#CD853F"
          />
        }
      >
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            {profile.profile_image ? (
              <Image
                source={{ uri: profile.profile_image }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <FontAwesome5 name="user" size={scale(48)} color="#FFFFFF" />
              </View>
            )}
            
            {profile.membership_info.membership_verified && (
              <View style={styles.verifiedMemberBadge}>
                <MaterialIcons name="verified" size={scale(16)} color="#FFFFFF" />
              </View>
            )}
          </View>
          
          <Text style={styles.profileName}>{profile.full_name}</Text>
          
          <View style={styles.profileBadges}>
            {profile.application_status && (
              <View style={[
                styles.applicationBadge,
                { backgroundColor: getStatusColor(profile.application_status.status) }
              ]}>
                <Text style={styles.applicationBadgeText}>
                  {profile.application_status.status.toUpperCase()}
                </Text>
              </View>
            )}
            
            <View style={styles.horsesBadge}>
              <FontAwesome5 name="horse" size={scale(12)} color="#FFFFFF" />
              <Text style={styles.horsesBadgeText}>
                {assignments.length} horse{assignments.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
            onPress={() => setActiveTab('overview')}
          >
            <MaterialIcons 
              name="info" 
              size={scale(20)} 
              color={activeTab === 'overview' ? "#CD853F" : "#6C757D"} 
            />
            <Text style={[
              styles.tabText,
              activeTab === 'overview' && styles.activeTabText
            ]}>
              Overview
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'horses' && styles.activeTab]}
            onPress={() => setActiveTab('horses')}
          >
            <FontAwesome5 
              name="horse" 
              size={scale(18)} 
              color={activeTab === 'horses' ? "#CD853F" : "#6C757D"} 
            />
            <Text style={[
              styles.tabText,
              activeTab === 'horses' && styles.activeTabText
            ]}>
              Horses ({assignments.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'overview' ? renderOverviewTab() : renderHorsesTab()}
        </View>
        
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.chatButton]}
          onPress={() => router.push({
            pathname: "../HORSE_OPERATOR/Hmessage",
            params: { 
              recipient_id: kutsero_id,
              recipient_name: kutsero_name || profile.full_name,
              recipient_type: 'kutsero'
            }
          })}
        >
          <MaterialIcons name="message" size={scale(20)} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Message</Text>
        </TouchableOpacity>
      </View>
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
    fontSize: moderateScale(16),
    color: "#6C757D",
    marginTop: verticalScale(12),
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: scale(40),
  },
  errorTitle: {
    fontSize: moderateScale(24),
    fontWeight: "bold",
    color: "#2C3E50",
    marginTop: verticalScale(24),
    marginBottom: verticalScale(8),
  },
  errorText: {
    fontSize: moderateScale(16),
    color: "#6C757D",
    textAlign: "center",
    marginBottom: verticalScale(24),
    lineHeight: moderateScale(22),
  },
  retryButton: {
    backgroundColor: "#CD853F",
    paddingHorizontal: scale(32),
    paddingVertical: verticalScale(12),
    borderRadius: scale(8),
  },
  retryButtonText: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#FFFFFF",
  },
  
  // Header Styles
  header: {
    backgroundColor: "#CD853F",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    paddingTop: verticalScale(40),
  },
  backButton: {
    padding: scale(8),
    marginRight: scale(8),
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: scale(8),
  },
  headerTitle: {
    fontSize: moderateScale(20),
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: moderateScale(12),
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: verticalScale(2),
  },
  
  // Scroll View
  scrollView: {
    flex: 1,
  },
  bottomSpacer: {
    height: verticalScale(100),
  },
  
  // Profile Header
  profileHeader: {
    alignItems: "center",
    paddingVertical: verticalScale(24),
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: scale(24),
    borderBottomRightRadius: scale(24),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: dynamicSpacing(16),
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: verticalScale(16),
  },
  profileImage: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    borderWidth: 4,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  profileImagePlaceholder: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    backgroundColor: "#CD853F",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  verifiedMemberBadge: {
    position: "absolute",
    bottom: scale(8),
    right: scale(8),
    backgroundColor: "#4CAF50",
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  profileName: {
    fontSize: moderateScale(24),
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: verticalScale(12),
    textAlign: "center",
  },
  profileBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: scale(8),
  },
  applicationBadge: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(20),
  },
  applicationBadgeText: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#FFFFFF",
  },
  horsesBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(20),
    gap: scale(6),
  },
  horsesBadgeText: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#FFFFFF",
  },
  
  // Tabs
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: scale(16),
    marginBottom: dynamicSpacing(16),
    backgroundColor: "#FFFFFF",
    borderRadius: scale(12),
    padding: scale(4),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(12),
    borderRadius: scale(8),
    gap: scale(8),
  },
  activeTab: {
    backgroundColor: "rgba(205, 133, 63, 0.1)",
  },
  tabText: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#6C757D",
  },
  activeTabText: {
    color: "#CD853F",
  },
  
  // Tab Content
  tabContent: {
    paddingHorizontal: scale(16),
  },
  
  // Overview Tab
  overviewContainer: {
    gap: dynamicSpacing(16),
  },
  
  // Simple Card
  simpleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(12),
    padding: scale(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(12),
    gap: scale(8),
  },
  cardTitle: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#2C3E50",
  },
  simpleInfoContainer: {
    gap: verticalScale(10),
  },
  simpleInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  simpleInfoLabel: {
    fontSize: moderateScale(14),
    color: "#6C757D",
    fontWeight: "500",
  },
  simpleInfoValue: {
    fontSize: moderateScale(14),
    color: "#2C3E50",
    fontWeight: "600",
    textAlign: "right",
    flex: 1,
    marginLeft: scale(8),
  },
  
  // Address Container
  addressContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: scale(8),
    padding: scale(12),
    borderLeftWidth: 3,
    borderLeftColor: "#FF9800",
  },
  addressText: {
    fontSize: moderateScale(14),
    color: "#2C3E50",
    fontWeight: "500",
    lineHeight: moderateScale(20),
  },
  
  // Membership Status
  membershipStatus: {
    marginBottom: verticalScale(8),
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(20),
  },
  statusBadgeText: {
    fontSize: moderateScale(12),
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  
  // Application Status
  applicationStatusBadge: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(4),
    borderRadius: scale(20),
  },
  applicationStatusText: {
    fontSize: moderateScale(12),
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  reviewNotesContainer: {
    backgroundColor: "#FFF8E1",
    padding: scale(12),
    borderRadius: scale(8),
    borderLeftWidth: 4,
    borderLeftColor: "#FFC107",
    marginTop: verticalScale(8),
  },
  reviewNotesLabel: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#FF8F00",
    marginBottom: verticalScale(4),
  },
  reviewNotesText: {
    fontSize: moderateScale(12),
    color: "#5D4037",
    lineHeight: moderateScale(16),
  },
  
  // Horses Tab
  horsesContainer: {
    gap: dynamicSpacing(16),
  },
  emptyHorsesContainer: {
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
  emptyHorsesTitle: {
    fontSize: moderateScale(24),
    fontWeight: "700",
    color: "#2C3E50",
    marginBottom: verticalScale(12),
    textAlign: "center",
  },
  emptyHorsesText: {
    fontSize: moderateScale(16),
    color: "#6C757D",
    textAlign: "center",
    lineHeight: moderateScale(24),
    marginBottom: verticalScale(24),
  },
  horsesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: scale(16),
    borderRadius: scale(12),
  },
  horsesCountText: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#2C3E50",
  },
  horseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(12),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  horseCardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: scale(16),
  },
  horseImage: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(8),
    marginRight: scale(16),
  },
  horseImagePlaceholder: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(8),
    backgroundColor: "#F7FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(16),
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  horseInfo: {
    flex: 1,
    gap: verticalScale(4),
  },
  horseName: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: verticalScale(4),
  },
  horseDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
  },
  horseDetailText: {
    fontSize: moderateScale(12),
    color: "#6C757D",
  },
  
  // Action Buttons
  actionButtonsContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(16),
    paddingBottom: verticalScale(20),
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(14),
    borderRadius: scale(12),
    gap: scale(8),
    marginHorizontal: scale(8),
  },
  chatButton: {
    backgroundColor: "#2196F3",
  },
  actionButtonText: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#FFFFFF",
  },
})

export default KutseroProfileScreen