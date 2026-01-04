// HORSE_OPERATOR Horse Screen

import { useState, useCallback, useEffect, useRef } from "react"
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
  Platform,
  ActivityIndicator,
} from "react-native"
import { useRouter, useFocusEffect } from "expo-router"
import { FontAwesome5 } from "@expo/vector-icons"
import * as SecureStore from "expo-secure-store"
import * as Notifications from "expo-notifications"
import * as Device from "expo-device"

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

interface MedicalRecord {
  date: string
  formatted_date?: string
  vet_name?: string
  vital_signs?: {
    heart_rate?: string
    respiratory_rate?: string
    body_temperature?: string
  }
  assessment?: {
    diagnosis?: string
    prognosis?: string
  }
  horse_status?: string
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

const API_BASE_URL = "http://192.168.101.4:8000/api/horse_operator"

type HorseTab = 'alive' | 'deceased'

const HorseScreen = () => {
  const router = useRouter()
  const [horses, setHorses] = useState<Horse[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [userFirstName, setUserFirstName] = useState<string | null>(null)
  const [searchText, setSearchText] = useState("")
  const [activeHorseTab, setActiveHorseTab] = useState<HorseTab>('alive')
  const [medicalRecords, setMedicalRecords] = useState<{[key: string]: MedicalRecord | null}>({})
  const [loadingMedicalRecords, setLoadingMedicalRecords] = useState<{[key: string]: boolean}>({})
  
  // Track if notification has been scheduled to prevent duplicates
  const notificationScheduledRef = useRef<boolean>(false)
  // Track last scheduled count to avoid unnecessary rescheduling
  const lastScheduledCountRef = useRef<number>(0)
  // Track if we're currently scheduling to prevent race conditions
  const isSchedulingRef = useRef<boolean>(false)
  
  // Refs for notification listeners
  const notificationListener = useRef<Notifications.EventSubscription | null>(null)
  const responseListener = useRef<Notifications.EventSubscription | null>(null)
  
  // Current active tab - using string type to allow comparison with all tab keys
  const activeTab: string = "horses"

  const safeArea = getSafeAreaPadding()

  // Configure notification handler with all required properties
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    })

    return () => {
      // Clean up notification listeners
      if (notificationListener.current) {
        notificationListener.current.remove()
      }
      if (responseListener.current) {
        responseListener.current.remove()
      }
    }
  }, [])

  // Setup notification channel for Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('daily-health-check', {
        name: 'Daily Health Check',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#CD853F',
        sound: 'default',
      })
    }
  }, [])

  // Register for push notifications and set up listeners
  useEffect(() => {
    registerForPushNotificationsAsync()

    // Listen for notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log("📬 Notification received:", notification)
    })

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log("👆 Notification response:", response)
      // Handle notification tap if needed
    })

    return () => {
      // Clean up notification listeners
      if (notificationListener.current) {
        notificationListener.current.remove()
      }
      if (responseListener.current) {
        responseListener.current.remove()
      }
    }
  }, [])

  // Schedule daily health check notification at 8:03 AM
  const scheduleDailyHealthCheck = useCallback(async (aliveHorsesCount: number) => {
    // Prevent multiple concurrent scheduling attempts
    if (isSchedulingRef.current) {
      console.log("⏳ Scheduling already in progress, skipping...")
      return
    }

    // Check if we already have a notification scheduled with the same count
    if (notificationScheduledRef.current && lastScheduledCountRef.current === aliveHorsesCount) {
      console.log("✅ Notification already scheduled with same count:", aliveHorsesCount)
      return
    }

    isSchedulingRef.current = true
    
    try {
      console.log(`📅 Attempting to schedule notification for ${aliveHorsesCount} alive horses`)
      
      // Check existing scheduled notifications first
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync()
      const existingHealthCheck = scheduledNotifications.find(
        notification => notification.content.title === "🐎 Daily Health Check"
      )
      
      if (existingHealthCheck) {
        console.log("✅ Health check notification already exists, checking count...")
        
        // Extract count from existing notification body
        const bodyMatch = existingHealthCheck.content.body?.match(/(\d+)/)
        const existingCount = bodyMatch ? parseInt(bodyMatch[1]) : 0
        
        if (existingCount === aliveHorsesCount) {
          console.log("✅ Existing notification has same count, no need to reschedule")
          notificationScheduledRef.current = true
          lastScheduledCountRef.current = aliveHorsesCount
          isSchedulingRef.current = false
          return
        }
        
        // Cancel the outdated notification
        await Notifications.cancelScheduledNotificationAsync(existingHealthCheck.identifier)
        console.log("🔄 Cancelled outdated health check notification")
      }

      // Only schedule if there are alive horses
      if (aliveHorsesCount > 0) {
        // Schedule notification for 8:03 AM daily
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: "🐎 Daily Health Check",
            body: `Remember to check the health status of your ${aliveHorsesCount} ${aliveHorsesCount === 1 ? 'horse' : 'horses'} today.`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            vibrate: [0, 250, 250, 250],
            data: { 
              screen: 'horses',
              type: 'daily_health_check',
              timestamp: Date.now()
            },
          },
          trigger: {
            hour: 8,
            minute: 3,
            repeats: true,
            channelId: 'daily-health-check',
          },
        })

        console.log(`✅ Daily health check scheduled for ${aliveHorsesCount} alive horses at 8:03 AM, ID: ${notificationId}`)
        notificationScheduledRef.current = true
        lastScheduledCountRef.current = aliveHorsesCount
      } else {
        console.log("ℹ️ No alive horses, skipping daily health check notification")
        notificationScheduledRef.current = false
        lastScheduledCountRef.current = 0
      }
    } catch (error) {
      console.error("❌ Error scheduling notification:", error)
      notificationScheduledRef.current = false
    } finally {
      isSchedulingRef.current = false
    }
  }, [])

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

  const fetchLatestMedicalRecord = useCallback(async (horseId: string, uid: string) => {
    setLoadingMedicalRecords(prev => ({ ...prev, [horseId]: true }))
    try {
      const response = await fetch(
        `${API_BASE_URL}/get_horse_medical_records/?horse_id=${encodeURIComponent(horseId)}&user_id=${encodeURIComponent(uid)}`
      )
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.medical_records && data.medical_records.length > 0) {
          const latestRecord = data.medical_records[0]
          setMedicalRecords(prev => ({ ...prev, [horseId]: latestRecord }))
          console.log("✅ Latest medical record loaded for horse:", horseId)
        } else {
          setMedicalRecords(prev => ({ ...prev, [horseId]: null }))
        }
      } else {
        console.warn("Failed to fetch medical records for horse:", horseId)
        setMedicalRecords(prev => ({ ...prev, [horseId]: null }))
      }
    } catch (error) {
      console.error('Error fetching medical records:', error)
      setMedicalRecords(prev => ({ ...prev, [horseId]: null }))
    } finally {
      setLoadingMedicalRecords(prev => ({ ...prev, [horseId]: false }))
    }
  }, [])

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

        const horsesArray = Array.isArray(data) ? data : []
        setHorses(horsesArray)

        // Fetch latest medical records for each horse
        horsesArray.forEach((horse: Horse) => {
          if (horse.horse_id && horse.horse_status !== 'Deceased') {
            fetchLatestMedicalRecord(horse.horse_id, targetUid!)
          }
        })

        // Count alive horses (excluding deceased)
        const aliveHorsesCount = horsesArray.filter((horse: Horse) => 
          horse.horse_status !== 'Deceased'
        ).length

        console.log(`🐎 Total horses: ${horsesArray.length}, Alive: ${aliveHorsesCount}`)

        // Schedule daily health check notification with only alive horses count
        // This is the ONLY place we should call scheduleDailyHealthCheck from
        scheduleDailyHealthCheck(aliveHorsesCount)
      } catch (error: any) {
        console.error("❌ Error loading horses:", error)
        Alert.alert("Error", error.message || "Unable to load horses")
      }
    },
    [userId, scheduleDailyHealthCheck, fetchLatestMedicalRecord],
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

  const handleMarkDeceased = (horse: Horse) => {
    // Navigate to horsedeathinput page with horse data
    router.push({
      pathname: "../HORSE_OPERATOR/horsedeathinput",
      params: { 
        horse_id: horse.horse_id,
        horse_name: horse.horse_name,
        horseData: JSON.stringify(horse) 
      },
    })
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
      
      // Cleanup function to reset tracking when screen loses focus
      return () => {
        // We don't reset here to maintain scheduled notification state
        // Only reset when horse status actually changes
      }
    }, [userId, fetchHorses, fetchUserProfile]),
  )

  const handleHorseProfile = (horse: Horse) => {
    // Check if horse is deceased
    const isDeceased = horse.horse_status === 'Deceased'
    
    if (isDeceased) {
      // Navigate to horseprofile screen for deceased horses
      router.push({
        pathname: "../HORSE_OPERATOR/horseprofile",
        params: { 
          id: horse.horse_id, 
          horseData: JSON.stringify(horse) 
        },
      })
    } else {
      // Navigate to horseprofile screen for active horses
      router.push({
        pathname: "../HORSE_OPERATOR/horseprofile",
        params: { 
          id: horse.horse_id, 
          horseData: JSON.stringify(horse) 
        },
      })
    }
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

  // Helper functions for medical records
  const getConditionFromMedicalRecord = (record: MedicalRecord | null) => {
    if (!record) return 'Unknown'
    const status = record?.horse_status || record?.assessment?.prognosis || 'Unknown'
    return status
  }

  const getConditionColorFromStatus = (status: string) => {
    const lowerStatus = status.toLowerCase()
    
    if (lowerStatus.includes('excellent') || lowerStatus.includes('great') || 
        lowerStatus.includes('healthy') || lowerStatus === 'good') {
      return '#4CAF50'
    }
    
    if (lowerStatus.includes('fair') || lowerStatus.includes('stable') || 
        lowerStatus.includes('improving')) {
      return '#8BC34A'
    }
    
    if (lowerStatus.includes('guarded') || lowerStatus.includes('cautious') || 
        lowerStatus.includes('monitor')) {
      return '#FFC107'
    }
    
    if (lowerStatus.includes('poor') || lowerStatus.includes('critical') || 
        lowerStatus.includes('grave') || lowerStatus.includes('emergency')) {
      return '#FF5722'
    }
    
    return '#757575'
  }

  const calculateDaysAgo = (dateString: string | null) => {
    if (!dateString) return null
    try {
      const recordDate = new Date(dateString)
      const today = new Date()
      const diffTime = Math.abs(today.getTime() - recordDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    } catch {
      return null
    }
  }

  const formatLastVetCheck = (record: MedicalRecord | null) => {
    if (!record) return 'No medical records'
    
    const examinationDate = record.formatted_date || record.date
    const daysAgo = calculateDaysAgo(record.date)
    
    if (daysAgo === null) return examinationDate
    
    if (daysAgo === 0) return 'Today'
    if (daysAgo === 1) return 'Yesterday'
    if (daysAgo <= 7) return `${daysAgo} days ago`
    if (daysAgo <= 30) return `${Math.floor(daysAgo / 7)} week${Math.floor(daysAgo / 7) !== 1 ? 's' : ''} ago`
    if (daysAgo <= 365) return `${Math.floor(daysAgo / 30)} month${Math.floor(daysAgo / 30) !== 1 ? 's' : ''} ago`
    
    return `${Math.floor(daysAgo / 365)} year${Math.floor(daysAgo / 365) !== 1 ? 's' : ''} ago`
  }

  const getHealthStatusColor = (daysAgo: number | null) => {
    if (daysAgo === null) return '#757575'
    if (daysAgo <= 30) return '#4CAF50'
    if (daysAgo <= 90) return '#FFC107'
    if (daysAgo <= 180) return '#FF9800'
    return '#FF5722'
  }

  const renderVitalSigns = (record: MedicalRecord | null) => {
    if (!record?.vital_signs) return null

    const { vital_signs } = record
    const hasVitalSigns = vital_signs.heart_rate || vital_signs.respiratory_rate || vital_signs.body_temperature
    
    if (!hasVitalSigns) return null

    return (
      <View style={styles.vitalSignsContainer}>
        <Text style={styles.vitalSignsTitle}>Latest Vital Signs</Text>
        <View style={styles.vitalSignsGrid}>
          {vital_signs.heart_rate && (
            <View style={styles.vitalSignItem}>
              <FontAwesome5 name="heartbeat" size={scale(14)} color="#CD853F" />
              <Text style={styles.vitalSignLabel}>Heart Rate</Text>
              <Text style={styles.vitalSignValue}>{vital_signs.heart_rate}</Text>
            </View>
          )}
          {vital_signs.respiratory_rate && (
            <View style={styles.vitalSignItem}>
              <FontAwesome5 name="lungs" size={scale(14)} color="#CD853F" />
              <Text style={styles.vitalSignLabel}>Respiratory Rate</Text>
              <Text style={styles.vitalSignValue}>{vital_signs.respiratory_rate}</Text>
            </View>
          )}
          {vital_signs.body_temperature && (
            <View style={styles.vitalSignItem}>
              <FontAwesome5 name="thermometer-half" size={scale(14)} color="#CD853F" />
              <Text style={styles.vitalSignLabel}>Temperature</Text>
              <Text style={styles.vitalSignValue}>{vital_signs.body_temperature}</Text>
            </View>
          )}
        </View>
      </View>
    )
  }

  const renderBasicInfoSection = (horse: Horse) => {
    const medicalRecord = medicalRecords[horse.horse_id]
    const isLoading = loadingMedicalRecords[horse.horse_id]

    return (
      <View style={styles.basicInfoContainer}>
        <Text style={styles.basicInfoTitle}>Health Information</Text>
        
        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <FontAwesome5 name="stethoscope" size={scale(14)} color="#CD853F" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Last Veterinary Examination</Text>
            {isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#CD853F" />
                <Text style={[styles.infoValue, { marginLeft: 8 }]}>Loading...</Text>
              </View>
            ) : medicalRecord ? (
              <View>
                <Text style={[
                  styles.infoValue, 
                  { 
                    color: getHealthStatusColor(calculateDaysAgo(medicalRecord.date)),
                    fontWeight: 'bold',
                    fontSize: moderateScale(13)
                  }
                ]}>
                  {formatLastVetCheck(medicalRecord)}
                </Text>
                {medicalRecord.vet_name && (
                  <Text style={styles.infoSubtext}>by {medicalRecord.vet_name}</Text>
                )}
                {medicalRecord.formatted_date && (
                  <Text style={styles.infoSubtext}>{medicalRecord.formatted_date}</Text>
                )}
              </View>
            ) : (
              <View>
                <Text style={[styles.infoValue, { color: '#757575', fontStyle: 'italic', fontSize: moderateScale(13) }]}>
                  No medical records
                </Text>
                <Text style={styles.infoSubtext}>Schedule a veterinary examination</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <FontAwesome5 name="heart" size={scale(14)} color="#CD853F" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Current Condition</Text>
            {isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#CD853F" />
                <Text style={[styles.infoValue, { marginLeft: 8 }]}>Loading...</Text>
              </View>
            ) : medicalRecord ? (
              <View>
                <Text style={[styles.infoValue, { 
                  color: getConditionColorFromStatus(getConditionFromMedicalRecord(medicalRecord)), 
                  fontWeight: 'bold',
                  fontSize: moderateScale(13)
                }]}>
                  {getConditionFromMedicalRecord(medicalRecord)}
                </Text>
                {medicalRecord.assessment?.diagnosis && (
                  <Text style={styles.infoSubtext}>
                    Diagnosis: {medicalRecord.assessment.diagnosis}
                  </Text>
                )}
              </View>
            ) : (
              <Text style={[styles.infoValue, { color: '#757575', fontStyle: 'italic', fontSize: moderateScale(13) }]}>
                No condition data
              </Text>
            )}
          </View>
        </View>

        {renderVitalSigns(medicalRecord)}
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
                              name="venus-mars" 
                              size={scale(12)} 
                              color={horse.horse_sex === 'Stallion' ? '#4A90E2' : 
                                     horse.horse_sex === 'Mare' ? '#E91E63' : 
                                     horse.horse_sex === 'Gelding' ? '#795548' : 
                                     '#6C757D'} 
                            />
                            <Text style={[
                              styles.horseMetaText,
                              {
                                color: horse.horse_sex === 'Stallion' ? '#4A90E2' : 
                                       horse.horse_sex === 'Mare' ? '#E91E63' : 
                                       horse.horse_sex === 'Gelding' ? '#795548' : 
                                       '#6C757D',
                                fontWeight: '600'
                              }
                            ]}>
                              {horse.horse_sex || 'Unknown'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {activeHorseTab === 'alive' && (
                        <TouchableOpacity
                          style={styles.deceasedButton}
                          onPress={() => handleMarkDeceased(horse)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <FontAwesome5 name="skull" size={scale(16)} color="#6C757D" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Basic Information Section */}
                    {activeHorseTab === 'alive' && renderBasicInfoSection(horse)}
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
          iconSource={require("../../assets/images/kutsero.png")}
          label="Kutsero"
          tabKey="kutsero"
          isActive={activeTab === "kutsero"}
          onPress={() => router.push("../HORSE_OPERATOR/kutsero" as any)}
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

// Register for push notifications
async function registerForPushNotificationsAsync() {
  let token

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-health-check', {
      name: 'Daily Health Check',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#CD853F',
    })
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!')
      return
    }
    token = (await Notifications.getExpoPushTokenAsync()).data
    console.log('Expo push token:', token)
  } else {
    console.log('Must use physical device for Push Notifications')
  }

  return token
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
  testNotificationButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: scale(10),
    position: 'relative',
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

  // Basic Information Styles (NEW)
  basicInfoContainer: {
    marginTop: dynamicSpacing(16),
    paddingTop: dynamicSpacing(12),
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
  },
  basicInfoTitle: {
    fontSize: moderateScale(16),
    fontWeight: "700",
    color: "#2C3E50",
    marginBottom: dynamicSpacing(12),
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: dynamicSpacing(12),
    alignItems: "flex-start",
  },
  infoIconContainer: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(12),
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#6C757D",
    marginBottom: verticalScale(2),
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: moderateScale(14),
    color: "#2C3E50",
    fontWeight: "500",
    lineHeight: moderateScale(18),
  },
  infoSubtext: {
    fontSize: moderateScale(11),
    color: "#6C757D",
    fontStyle: "italic",
    marginTop: verticalScale(2),
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Vital Signs Styles
  vitalSignsContainer: {
    marginTop: dynamicSpacing(12),
    paddingTop: dynamicSpacing(12),
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
  },
  vitalSignsTitle: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#6C757D",
    marginBottom: dynamicSpacing(8),
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  vitalSignsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
  },
  vitalSignItem: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: "#F8F9FA",
    borderRadius: scale(8),
    padding: scale(10),
    alignItems: "center",
  },
  vitalSignLabel: {
    fontSize: moderateScale(10),
    color: "#6C757D",
    marginTop: verticalScale(4),
    marginBottom: verticalScale(2),
    textAlign: "center",
  },
  vitalSignValue: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#2C3E50",
    textAlign: "center",
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