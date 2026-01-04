// HORSE_OPERATOR/KutseroManagementScreen.tsx
import { useState, useCallback, useMemo } from "react"
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
  Modal,
  ActivityIndicator,
  RefreshControl,
} from "react-native"
import { useRouter, useFocusEffect } from "expo-router"
import { FontAwesome5 } from "@expo/vector-icons"
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

const getSafeAreaPadding = () => {
  const statusBarHeight = StatusBar.currentHeight || 0
  return {
    top: Math.max(statusBarHeight, 20),
    bottom: height > 800 ? 34 : 20,
  }
}

interface KutseroApplication {
  application_id: number
  kutsero_id: string
  kutsero_name: string
  kutsero_fname: string
  kutsero_lname: string
  kutsero_email: string
  kutsero_phone: string
  kutsero_image: string | null
  application_date: string
  formatted_date: string
  status: 'pending' | 'approved' | 'rejected'
  review_date: string | null
  formatted_review_date: string | null
  review_notes: string | null
  days_ago: string
  assigned_horses_count: number
  created_at: string
}

interface ApplicationStats {
  total: number
  pending: number
  approved: number
  rejected: number
}

interface ApprovedKutsero {
  kutsero_id: string
  kutsero_name: string
  kutsero_email: string
  kutsero_phone: string
  kutsero_image: string | null
  application_id: number
  application_date: string
  approval_date: string
  assigned_horses_count: number
}

const API_BASE_URL = "http://192.168.101.4:8000/api/horse_operator"

type ApplicationTab = 'pending' | 'approved' | 'rejected'
type BottomTabKey = 'home' | 'horses' | 'kutsero' | 'messages' | 'bookings' | 'profile'

const KutseroManagementScreen = () => {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [applications, setApplications] = useState<KutseroApplication[]>([])
  const [approvedKutseros, setApprovedKutseros] = useState<ApprovedKutsero[]>([])
  const [activeTab, setActiveTab] = useState<ApplicationTab>('pending')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState<ApplicationStats>({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [searchText, setSearchText] = useState("")
  
  // Modal states
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState<KutseroApplication | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [processingAction, setProcessingAction] = useState(false)
  
  const safeArea = getSafeAreaPadding()

  // Current active tab for bottom navigation
  const activeBottomTab: BottomTabKey = "kutsero"

  // Filter applications based on active tab and search
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      // Filter by tab
      if (activeTab === 'pending' && app.status !== 'pending') return false
      if (activeTab === 'approved' && app.status !== 'approved') return false
      if (activeTab === 'rejected' && app.status !== 'rejected') return false
      
      // Filter by search
      if (searchText.trim() === '') return true
      
      const searchLower = searchText.toLowerCase()
      return (
        app.kutsero_name.toLowerCase().includes(searchLower) ||
        app.kutsero_email.toLowerCase().includes(searchLower) ||
        app.kutsero_phone.toLowerCase().includes(searchLower)
      )
    })
  }, [applications, activeTab, searchText])

  // Filter approved kutseros based on search
  const filteredApprovedKutseros = useMemo(() => {
    if (searchText.trim() === '') return approvedKutseros
    
    const searchLower = searchText.toLowerCase()
    return approvedKutseros.filter(kutsero => 
      kutsero.kutsero_name.toLowerCase().includes(searchLower) ||
      kutsero.kutsero_email.toLowerCase().includes(searchLower) ||
      kutsero.kutsero_phone.toLowerCase().includes(searchLower)
    )
  }, [approvedKutseros, searchText])

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

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true)
      const uid = userId || await loadUserId()
      
      if (!uid) {
        Alert.alert("Error", "User not found. Please login again.")
        return
      }

      console.log("📡 Fetching kutsero applications for operator:", uid)
      const response = await fetch(
        `${API_BASE_URL}/get_kutsero_applications/?op_id=${encodeURIComponent(uid)}`
      )
      
      console.log("📊 Response status:", response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Loaded ${data.length} kutsero applications`)
        setApplications(data)
        
        // Calculate stats
        const statsData: ApplicationStats = {
          total: data.length,
          pending: data.filter((app: KutseroApplication) => app.status === 'pending').length,
          approved: data.filter((app: KutseroApplication) => app.status === 'approved').length,
          rejected: data.filter((app: KutseroApplication) => app.status === 'rejected').length
        }
        setStats(statsData)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("❌ API Error:", errorData)
        Alert.alert("Error", errorData.error || "Failed to load applications")
      }
    } catch (error) {
      console.error("❌ Error fetching applications:", error)
      Alert.alert("Error", "Unable to load applications. Please try again.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [userId])

  const fetchApprovedKutseros = useCallback(async () => {
    try {
      const uid = userId || await loadUserId()
      
      if (!uid) return

      console.log("📡 Fetching approved kutseros for operator:", uid)
      const response = await fetch(
        `${API_BASE_URL}/get_approved_kutseros/?op_id=${encodeURIComponent(uid)}`
      )
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Loaded ${data.length} approved kutseros`)
        setApprovedKutseros(data)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("❌ Error fetching approved kutseros:", errorData)
      }
    } catch (error) {
      console.error("❌ Error fetching approved kutseros:", error)
    }
  }, [userId])

  const fetchApplicationStats = useCallback(async () => {
    try {
      const uid = userId || await loadUserId()
      
      if (!uid) return

      const response = await fetch(
        `${API_BASE_URL}/get_kutsero_application_stats/?op_id=${encodeURIComponent(uid)}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("❌ Error fetching stats:", error)
    }
  }, [userId])

  const handleUpdateApplicationStatus = async (applicationId: number, status: 'approved' | 'rejected') => {
    try {
      setProcessingAction(true)
      const uid = userId || await loadUserId()
      
      if (!uid) {
        Alert.alert("Error", "User not found")
        return
      }

      const payload = {
        op_id: uid,
        status: status,
        review_notes: reviewNotes.trim() || null
      }

      console.log(`📤 Updating application ${applicationId} to ${status}`)
      console.log("📤 Payload:", payload)
      
      const response = await fetch(
        `${API_BASE_URL}/update_kutsero_application/${applicationId}/`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        }
      )

      if (response.ok) {
        const result = await response.json()
        console.log("✅ Update successful:", result)
        Alert.alert("Success", result.message)
        
        // Refresh all data
        await Promise.all([
          fetchApplications(),
          fetchApprovedKutseros(),
          fetchApplicationStats()
        ])
        
        // Close modal
        setShowReviewModal(false)
        setSelectedApplication(null)
        setReviewNotes("")
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("❌ Update failed:", errorData)
        Alert.alert("Error", errorData.error || "Failed to update application")
      }
    } catch (error) {
      console.error("❌ Error updating application:", error)
      Alert.alert("Error", "Unable to update application. Please try again.")
    } finally {
      setProcessingAction(false)
    }
  }

  const handleRemoveKutsero = async (kutseroId: string, kutseroName: string) => {
    Alert.alert(
      "Remove Kutsero",
      `Are you sure you want to remove ${kutseroName}? This will unassign them from all your horses.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const uid = userId || await loadUserId()
              
              if (!uid) {
                Alert.alert("Error", "User not found")
                return
              }

              const response = await fetch(
                `${API_BASE_URL}/remove_kutsero_assignment/`,
                {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    op_id: uid,
                    kutsero_id: kutseroId
                  })
                }
              )

              if (response.ok) {
                const result = await response.json()
                Alert.alert("Success", result.message)
                // Refresh approved kutseros list
                await fetchApprovedKutseros()
              } else {
                const errorData = await response.json().catch(() => ({}))
                Alert.alert("Error", errorData.error || "Failed to remove kutsero")
              }
            } catch (error) {
              console.error("❌ Error removing kutsero:", error)
              Alert.alert("Error", "Unable to remove kutsero. Please try again.")
            }
          }
        }
      ]
    )
  }

  const openReviewModal = (application: KutseroApplication) => {
    setSelectedApplication(application)
    setReviewNotes("")
    setShowReviewModal(true)
  }

  const navigateToKutseroProfile = (kutseroId: string, kutseroName: string) => {
    router.push({
      pathname: "../HORSE_OPERATOR/kutseroprofile",
      params: { 
        kutsero_id: kutseroId,
        kutsero_name: kutseroName 
      }
    })
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchApplications()
    fetchApprovedKutseros()
  }, [fetchApplications, fetchApprovedKutseros])

  useFocusEffect(
    useCallback(() => {
      console.log("🎯 Kutsero screen focused - loading data...")
      const initializeData = async () => {
        let uid = userId
        if (!uid) {
          uid = await loadUserId()
        }
        if (uid) {
          await Promise.all([
            fetchApplications(),
            fetchApprovedKutseros(),
            fetchApplicationStats()
          ])
        }
      }
      initializeData()
    }, [userId, fetchApplications, fetchApprovedKutseros, fetchApplicationStats])
  )

  // TabButton component matching horse screen
  const TabButton = ({
    iconSource,
    label,
    tabKey,
    isActive,
    onPress,
  }: {
    iconSource: any
    label: string
    tabKey: BottomTabKey
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

  const ApplicationTabButton = ({
    label,
    count,
    isActive,
    onPress,
  }: {
    label: string
    count: number
    isActive: boolean
    onPress: () => void
  }) => (
    <TouchableOpacity
      style={[styles.appTabButton, isActive && styles.activeAppTabButton]}
      onPress={onPress}
    >
      <Text style={[styles.appTabLabel, isActive && styles.activeAppTabLabel]}>
        {label}
      </Text>
      <View style={[styles.appTabCount, isActive && styles.activeAppTabCount]}>
        <Text style={[styles.appTabCountText, isActive && styles.activeAppTabCountText]}>
          {count}
        </Text>
      </View>
    </TouchableOpacity>
  )

  const StatCard = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )

  const renderApplicationCard = (app: KutseroApplication, index: number) => {
    const isPending = app.status === 'pending'
    const isApproved = app.status === 'approved'
    
    return (
      <TouchableOpacity
        key={`${app.application_id}-${index}`}
        style={[
          styles.applicationCard,
          { marginTop: index === 0 ? 0 : dynamicSpacing(12) }
        ]}
        onPress={() => navigateToKutseroProfile(app.kutsero_id, app.kutsero_name)}
        activeOpacity={0.8}
      >
        <View style={styles.applicationHeader}>
          <View style={styles.applicationAvatar}>
            {app.kutsero_image ? (
              <Image
                source={{ uri: app.kutsero_image }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <FontAwesome5 name="user" size={scale(20)} color="#6C757D" />
              </View>
            )}
          </View>
          
          <View style={styles.applicationInfo}>
            <Text style={styles.applicationName}>{app.kutsero_name}</Text>
            <Text style={styles.applicationEmail}>{app.kutsero_email}</Text>
            <Text style={styles.applicationPhone}>
              <FontAwesome5 name="phone" size={scale(10)} color="#6C757D" /> {app.kutsero_phone}
            </Text>
            <Text style={styles.applicationDate}>
              Applied {app.days_ago}
            </Text>
          </View>
          
          <View style={[
            styles.statusBadge,
            { backgroundColor: 
              app.status === 'pending' ? '#FFC107' :
              app.status === 'approved' ? '#4CAF50' : '#F44336'
            }
          ]}>
            <Text style={styles.statusText}>
              {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
            </Text>
          </View>
        </View>
        
        {isApproved && app.assigned_horses_count > 0 && (
          <View style={styles.assignedHorses}>
            <FontAwesome5 name="horse" size={scale(12)} color="#4CAF50" />
            <Text style={styles.assignedText}>
              Assigned to {app.assigned_horses_count} horse{app.assigned_horses_count !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
        
        {app.review_notes && (
          <View style={styles.reviewNotes}>
            <Text style={styles.reviewNotesLabelText}>Review Notes:</Text>
            <Text style={styles.reviewNotesText}>{app.review_notes}</Text>
          </View>
        )}
        
        {isPending && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => openReviewModal(app)}
            >
              <FontAwesome5 name="check" size={scale(14)} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Approve</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => openReviewModal(app)}
            >
              <FontAwesome5 name="times" size={scale(14)} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {isApproved && (
          <TouchableOpacity
            style={styles.manageButton}
            onPress={() => router.push({
              pathname: "../HORSE_OPERATOR/horseassignments",
              params: { 
                kutsero_id: app.kutsero_id, 
                kutsero_name: app.kutsero_name 
              }
            })}
          >
            <FontAwesome5 name="tasks" size={scale(14)} color="#4CAF50" />
            <Text style={styles.manageButtonText}>Manage Assignments</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    )
  }

  const renderApprovedKutseroCard = (kutsero: ApprovedKutsero, index: number) => (
    <TouchableOpacity
      key={`approved-${kutsero.kutsero_id}-${index}`}
      style={[
        styles.approvedCard,
        { marginTop: index === 0 ? 0 : dynamicSpacing(12) }
      ]}
      onPress={() => navigateToKutseroProfile(kutsero.kutsero_id, kutsero.kutsero_name)}
      activeOpacity={0.8}
    >
      <View style={styles.approvedHeader}>
        <View style={styles.approvedAvatar}>
          {kutsero.kutsero_image ? (
            <Image
              source={{ uri: kutsero.kutsero_image }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <FontAwesome5 name="user" size={scale(20)} color="#6C757D" />
            </View>
          )}
        </View>
        
        <View style={styles.approvedInfo}>
          <Text style={styles.approvedName}>{kutsero.kutsero_name}</Text>
          <Text style={styles.approvedEmail}>{kutsero.kutsero_email}</Text>
          <Text style={styles.approvedPhone}>
            <FontAwesome5 name="phone" size={scale(10)} color="#6C757D" /> {kutsero.kutsero_phone}
          </Text>
          
          <View style={styles.approvedMeta}>
            <Text style={styles.approvedMetaText}>
              <FontAwesome5 name="calendar-check" size={scale(10)} color="#4CAF50" /> 
              Approved on {moment(kutsero.approval_date).format('MMM D, YYYY')}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.approvedFooter}>
        <View style={styles.approvedActions}>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveKutsero(kutsero.kutsero_id, kutsero.kutsero_name)}
          >
            <FontAwesome5 name="user-times" size={scale(12)} color="#F44336" />
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )

  const renderEmptyState = () => {
    const isApprovedTab = activeTab === 'approved'
    const isRejectedTab = activeTab === 'rejected'
    
    let message = ""
    if (isApprovedTab) {
      message = searchText.trim() ? "No approved kutseros match your search." : "No kutseros have been approved yet. Review pending applications to add kutseros."
    } else if (isRejectedTab) {
      message = searchText.trim() ? "No rejected applications match your search." : "No applications have been rejected yet."
    } else {
      message = searchText.trim() ? "No pending applications match your search." : "No kutseros have applied to handle your horses yet."
    }
    
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <FontAwesome5 
            name={isApprovedTab ? "users" : isRejectedTab ? "user-slash" : "user-clock"} 
            size={scale(64)} 
            color="#CD853F" 
          />
        </View>
        <Text style={styles.emptyStateTitle}>
          {searchText.trim() ? "No Results Found" : 
           isApprovedTab ? "No Approved Kutseros" :
           isRejectedTab ? "No Rejected Applications" :
           "No Pending Applications"}
        </Text>
        <Text style={styles.emptyStateText}>
          {message}
        </Text>
        {searchText.trim() && (
          <TouchableOpacity
            style={styles.clearSearchButton}
            onPress={() => setSearchText("")}
          >
            <Text style={styles.clearSearchButtonText}>Clear Search</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#CD853F" translucent={false} />

      {/* Header Section */}
      <View style={[styles.header, { paddingTop: safeArea.top }]}>
        <View style={styles.headerTop}>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Kutsero Applications</Text>
            <Text style={styles.userName}>Manage horse handlers</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search kutseros..."
            placeholderTextColor="#999"
          />
          {searchText.length > 0 ? (
            <TouchableOpacity 
              style={styles.clearSearchButtonIcon}
              onPress={() => setSearchText("")}
            >
              <FontAwesome5 name="times-circle" size={scale(16)} color="#999" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.searchButton}>
              <FontAwesome5 name="search" size={scale(16)} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content Section */}
      <View style={styles.contentContainer}>
        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#CD853F"]}
              tintColor="#CD853F"
            />
          }
        >
          {/* Statistics Cards */}
          <View style={styles.statsContainer}>
            <StatCard label="Total" value={stats.total} color="#CD853F" />
            <StatCard label="Pending" value={stats.pending} color="#FFC107" />
            <StatCard label="Approved" value={stats.approved} color="#4CAF50" />
            <StatCard label="Rejected" value={stats.rejected} color="#F44336" />
          </View>

          {/* Application Status Tabs */}
          <View style={styles.applicationTabsContainer}>
            <ApplicationTabButton
              label="Pending"
              count={stats.pending}
              isActive={activeTab === 'pending'}
              onPress={() => setActiveTab('pending')}
            />
            <ApplicationTabButton
              label="Approved"
              count={stats.approved}
              isActive={activeTab === 'approved'}
              onPress={() => setActiveTab('approved')}
            />
            <ApplicationTabButton
              label="Rejected"
              count={stats.rejected}
              isActive={activeTab === 'rejected'}
              onPress={() => setActiveTab('rejected')}
            />
          </View>

          {/* Content Area */}
          <View style={styles.content}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#CD853F" />
                <Text style={styles.loadingText}>Loading applications...</Text>
              </View>
            ) : activeTab === 'approved' ? (
              // Render filtered approved kutseros
              filteredApprovedKutseros.length === 0 ? (
                renderEmptyState()
              ) : (
                filteredApprovedKutseros.map((kutsero, index) => renderApprovedKutseroCard(kutsero, index))
              )
            ) : filteredApplications.length === 0 ? (
              // Render empty state for pending/rejected tabs
              renderEmptyState()
            ) : (
              // Render filtered applications for pending/rejected tabs
              filteredApplications.map((app, index) => renderApplicationCard(app, index))
            )}
          </View>
        </ScrollView>
      </View>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowReviewModal(false)
          setSelectedApplication(null)
          setReviewNotes("")
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Review Application
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowReviewModal(false)
                  setSelectedApplication(null)
                  setReviewNotes("")
                }}
              >
                <FontAwesome5 name="times" size={scale(20)} color="#666" />
              </TouchableOpacity>
            </View>
            
            {selectedApplication && (
              <>
                <View style={styles.modalApplicantInfo}>
                  <View style={styles.modalAvatar}>
                    {selectedApplication.kutsero_image ? (
                      <Image
                        source={{ uri: selectedApplication.kutsero_image }}
                        style={styles.modalAvatarImage}
                      />
                    ) : (
                      <View style={styles.modalAvatarFallback}>
                        <FontAwesome5 name="user" size={scale(24)} color="#6C757D" />
                      </View>
                    )}
                  </View>
                  <View style={styles.modalApplicantDetails}>
                    <Text style={styles.modalApplicantName}>
                      {selectedApplication.kutsero_name}
                    </Text>
                    <Text style={styles.modalApplicantEmail}>
                      {selectedApplication.kutsero_email}
                    </Text>
                    <Text style={styles.modalApplicantDate}>
                      Applied {selectedApplication.days_ago}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.reviewNotesContainer}>
                  <Text style={styles.modalReviewNotesLabel}>
                    Review Notes (Optional)
                  </Text>
                  <TextInput
                    style={styles.reviewNotesInput}
                    value={reviewNotes}
                    onChangeText={setReviewNotes}
                    placeholder="Add notes about your decision..."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.rejectModalButton]}
                    onPress={() => handleUpdateApplicationStatus(
                      selectedApplication.application_id,
                      'rejected'
                    )}
                    disabled={processingAction}
                  >
                    {processingAction ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <FontAwesome5 name="times" size={scale(16)} color="#FFFFFF" />
                        <Text style={styles.modalButtonText}>Reject</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalButton, styles.approveModalButton]}
                    onPress={() => handleUpdateApplicationStatus(
                      selectedApplication.application_id,
                      'approved'
                    )}
                    disabled={processingAction}
                  >
                    {processingAction ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <FontAwesome5 name="check" size={scale(16)} color="#FFFFFF" />
                        <Text style={styles.modalButtonText}>Approved</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation - Updated to match horse screen */}
      <View style={[styles.tabBar, { paddingBottom: safeArea.bottom }]}>
        <TabButton 
          iconSource={require("../../assets/images/home.png")} 
          label="Home" 
          tabKey="home" 
          isActive={false}
          onPress={() => router.push("/HORSE_OPERATOR/home" as any)} 
        />
        <TabButton
          iconSource={require("../../assets/images/horse.png")}
          label="Horses"
          tabKey="horses"
          isActive={false}
          onPress={() => router.push("../HORSE_OPERATOR/horse" as any)}
        />
        <TabButton
          iconSource={require("../../assets/images/kutsero.png")}
          label="Kutsero"
          tabKey="kutsero"
          isActive={activeBottomTab === "kutsero"}
          onPress={() => router.push("../HORSE_OPERATOR/kutsero" as any)}
        />
        <TabButton
          iconSource={require("../../assets/images/chat.png")}
          label="Chat"
          tabKey="messages"
          isActive={false}
          onPress={() => router.push("../HORSE_OPERATOR/Hmessage" as any)}
        />
        <TabButton
          iconSource={require("../../assets/images/calendar.png")}
          label="Calendar"
          tabKey="bookings"
          isActive={false}
          onPress={() => router.push("../HORSE_OPERATOR/Hcalendar" as any)}
        />
        <TabButton
          iconSource={require("../../assets/images/profile.png")}
          label="Profile"
          tabKey="profile"
          isActive={false}
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
  clearSearchButtonIcon: {
    padding: scale(4),
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

  // Stats Container
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    paddingTop: dynamicSpacing(16),
    paddingBottom: dynamicSpacing(8),
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: scale(12),
    padding: scale(12),
    marginHorizontal: scale(4),
    borderLeftWidth: 4,
    borderLeftColor: "#CD853F",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: moderateScale(24),
    fontWeight: "bold",
    color: "#2C3E50",
  },
  statLabel: {
    fontSize: moderateScale(12),
    color: "#6C757D",
    marginTop: verticalScale(4),
  },

  // Application Tabs
  applicationTabsContainer: {
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
  appTabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(12),
    borderRadius: scale(8),
    backgroundColor: "transparent",
  },
  activeAppTabButton: {
    backgroundColor: "#CD853F",
  },
  appTabLabel: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#6C757D",
    marginRight: scale(6),
  },
  activeAppTabLabel: {
    color: "#FFFFFF",
  },
  appTabCount: {
    backgroundColor: "#E9ECEF",
    borderRadius: scale(12),
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    minWidth: scale(24),
    alignItems: "center",
    justifyContent: "center",
  },
  activeAppTabCount: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  appTabCountText: {
    fontSize: moderateScale(12),
    fontWeight: "700",
    color: "#6C757D",
  },
  activeAppTabCountText: {
    color: "#FFFFFF",
  },

  // Content Area
  content: {
    paddingHorizontal: scale(16),
    paddingTop: dynamicSpacing(8),
    paddingBottom: dynamicSpacing(20),
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(80),
  },
  loadingText: {
    fontSize: moderateScale(16),
    color: "#6C757D",
    marginTop: verticalScale(12),
  },

  // Application Card
  applicationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(16),
    padding: scale(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F1F3F4",
  },
  applicationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: dynamicSpacing(12),
  },
  applicationAvatar: {
    marginRight: scale(12),
  },
  avatarImage: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
  },
  avatarFallback: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E9ECEF",
  },
  applicationInfo: {
    flex: 1,
  },
  applicationName: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: "#2C3E50",
    marginBottom: verticalScale(2),
  },
  applicationEmail: {
    fontSize: moderateScale(14),
    color: "#6C757D",
    marginBottom: verticalScale(2),
  },
  applicationPhone: {
    fontSize: moderateScale(12),
    color: "#6C757D",
    marginBottom: verticalScale(4),
  },
  applicationDate: {
    fontSize: moderateScale(11),
    color: "#CD853F",
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(4),
    borderRadius: scale(20),
  },
  statusText: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#FFFFFF",
  },
  assignedHorses: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: dynamicSpacing(8),
    paddingVertical: scale(6),
    paddingHorizontal: scale(10),
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: scale(8),
  },
  assignedText: {
    fontSize: moderateScale(12),
    color: "#4CAF50",
    fontWeight: "500",
    marginLeft: scale(8),
  },
  reviewNotes: {
    marginTop: dynamicSpacing(8),
    padding: scale(12),
    backgroundColor: "#FFF8E1",
    borderRadius: scale(8),
    borderLeftWidth: 3,
    borderLeftColor: "#FFC107",
  },
  reviewNotesLabelText: {
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
  actionButtons: {
    flexDirection: "row",
    marginTop: dynamicSpacing(12),
    gap: scale(12),
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(10),
    borderRadius: scale(8),
    gap: scale(6),
  },
  approveButton: {
    backgroundColor: "#4CAF50",
  },
  rejectButton: {
    backgroundColor: "#F44336",
  },
  actionButtonText: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#FFFFFF",
  },
  manageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: dynamicSpacing(12),
    paddingVertical: verticalScale(10),
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: scale(8),
    gap: scale(8),
  },
  manageButtonText: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#4CAF50",
  },

  // Approved Kutsero Card
  approvedCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(16),
    padding: scale(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F1F3F4",
  },
  approvedHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: dynamicSpacing(12),
  },
  approvedAvatar: {
    marginRight: scale(12),
  },
  approvedInfo: {
    flex: 1,
  },
  approvedName: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: "#2C3E50",
    marginBottom: verticalScale(2),
  },
  approvedEmail: {
    fontSize: moderateScale(14),
    color: "#6C757D",
    marginBottom: verticalScale(2),
  },
  approvedPhone: {
    fontSize: moderateScale(12),
    color: "#6C757D",
    marginBottom: verticalScale(4),
  },
  approvedMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  approvedMetaText: {
    fontSize: moderateScale(11),
    color: "#4CAF50",
    fontWeight: "500",
  },
  approvedFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: dynamicSpacing(12),
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
  },
  approvedActions: {
    flexDirection: "row",
    gap: scale(12),
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(12),
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    borderRadius: scale(6),
    gap: scale(4),
  },
  removeButtonText: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#F44336",
  },

  // Empty State
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
    maxWidth: scale(280),
  },
  clearSearchButton: {
    marginTop: verticalScale(20),
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(20),
    backgroundColor: "#CD853F",
    borderRadius: scale(25),
  },
  clearSearchButtonText: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    paddingHorizontal: scale(24),
    paddingTop: dynamicSpacing(24),
    paddingBottom: dynamicSpacing(40),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: dynamicSpacing(24),
  },
  modalTitle: {
    fontSize: moderateScale(20),
    fontWeight: "bold",
    color: "#2C3E50",
  },
  modalApplicantInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: dynamicSpacing(24),
  },
  modalAvatar: {
    marginRight: scale(16),
  },
  modalAvatarImage: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
  },
  modalAvatarFallback: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#E9ECEF",
  },
  modalApplicantDetails: {
    flex: 1,
  },
  modalApplicantName: {
    fontSize: moderateScale(18),
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: verticalScale(4),
  },
  modalApplicantEmail: {
    fontSize: moderateScale(14),
    color: "#6C757D",
    marginBottom: verticalScale(4),
  },
  modalApplicantDate: {
    fontSize: moderateScale(12),
    color: "#CD853F",
    fontWeight: "500",
  },
  reviewNotesContainer: {
    marginBottom: dynamicSpacing(24),
  },
  modalReviewNotesLabel: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: verticalScale(8),
  },
  reviewNotesInput: {
    backgroundColor: "#F8F9FA",
    borderRadius: scale(12),
    padding: scale(16),
    fontSize: moderateScale(14),
    color: "#2C3E50",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    minHeight: verticalScale(100),
  },
  modalButtons: {
    flexDirection: "row",
    gap: scale(12),
  },
  modalButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(14),
    borderRadius: scale(12),
    gap: scale(8),
  },
  rejectModalButton: {
    backgroundColor: "#F44336",
  },
  approveModalButton: {
    backgroundColor: "#4CAF50",
  },
  modalButtonText: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Bottom Tab Navigation - Updated to match horse screen
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
})

export default KutseroManagementScreen