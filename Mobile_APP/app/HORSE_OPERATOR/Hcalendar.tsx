// HORSE_OPERATOR/Hcalendar.tsx

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  StatusBar,
  Image,
  RefreshControl,
} from "react-native"
import { FontAwesome5 } from "@expo/vector-icons"
import { useRouter, useFocusEffect } from "expo-router"
import * as SecureStore from "expo-secure-store"
import * as Notifications from 'expo-notifications'

interface Appointment {
  id: string
  app_id: string
  userId: string
  contactId: string
  contactName: string
  horseName: string
  service: string
  date: string
  time: string
  notes?: string
  status: "today" | "pending" | "approved" | "cancelled" | "declined"
  declineReason?: string
  created_at?: string
}

interface User {
  op_id: string
  op_fname: string
  op_lname: string
  op_email: string
}

interface VetDetails {
  clinic_location: string
  phone_number: string
  email: string
  vet_name: string
}

// Configuration
const API_BASE_URL = "http://192.168.1.9:8000/api/horse_operator"

const { width, height } = Dimensions.get("window")

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

// Configure notifications handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

// Storage key for tracking notified appointments
const LAST_NOTIFIED_APPOINTMENTS_KEY = "last_notified_appointments"
const CACHED_APPOINTMENTS_KEY = "cached_appointments"
const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes cache duration

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

const CalendarScreen = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [vetDetails, setVetDetails] = useState<VetDetails | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [deletingAppointments, setDeletingAppointments] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<"calendar" | "all">("calendar")
  const [refreshing, setRefreshing] = useState(false)
  
  const router = useRouter()
  const safeArea = getSafeAreaPadding()
  const activeTab: string = "bookings"
  
  // Refs to track state
  const isMounted = useRef(false)
  const isScreenFocused = useRef(false)

  // Helper function to determine status priority for coloring
  const getStatusPriority = useCallback((status: string) => {
    switch (status) {
      case "approved": return 3
      case "pending": return 2
      case "today": return 1
      default: return 0
    }
  }, [])

  // Save appointments to cache
  const saveAppointmentsToCache = useCallback(async (appointments: Appointment[]) => {
    try {
      const cacheData = {
        appointments,
        timestamp: Date.now()
      }
      await SecureStore.setItemAsync(CACHED_APPOINTMENTS_KEY, JSON.stringify(cacheData))
      console.log('💾 Appointments cached successfully')
    } catch (error) {
      console.error('❌ Error caching appointments:', error)
    }
  }, [])

  // Load appointments from cache
  const loadAppointmentsFromCache = useCallback(async () => {
    try {
      const cachedData = await SecureStore.getItemAsync(CACHED_APPOINTMENTS_KEY)
      if (cachedData) {
        const parsed = JSON.parse(cachedData)
        const { appointments, timestamp } = parsed
        
        // Check if cache is still valid
        if (Date.now() - timestamp < CACHE_DURATION_MS) {
          console.log('📂 Loading appointments from cache')
          return appointments as Appointment[]
        } else {
          console.log('⏰ Cache expired, will fetch fresh data')
        }
      }
      return null
    } catch (error) {
      console.error('❌ Error loading cached appointments:', error)
      return null
    }
  }, [])

  // Request notification permissions
  const requestNotificationPermissions = useCallback(async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync()
      if (status === 'granted') {
        console.log('✅ Notification permissions granted')
        return true
      } else {
        console.log('⚠️ Notification permissions denied')
        return false
      }
    } catch (error) {
      console.error('❌ Error requesting notification permissions:', error)
      return false
    }
  }, [])

  // Send new appointment notification
  const sendNewAppointmentNotification = useCallback(async (appointment: Appointment) => {
    try {
      console.log(`📢 Sending new appointment notification for: ${appointment.app_id}`)
      
      const hasPermission = await requestNotificationPermissions()
      if (!hasPermission) {
        console.log('⏭️ No notification permission, skipping')
        return false
      }

      const title = '📅 New Appointment Booked!'
      const body = `You have a new appointment for ${appointment.horseName} with ${appointment.contactName} on ${appointment.date} at ${appointment.time}.`

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: 'new_appointment',
            appointmentId: appointment.app_id,
            appointmentStatus: appointment.status,
            horseName: appointment.horseName,
            vetName: appointment.contactName,
            time: appointment.time,
            date: appointment.date,
          },
          sound: 'default',
        },
        trigger: null, // Show immediately
      })

      console.log(`✅ Sent new appointment notification for ${appointment.app_id}`)
      return true
    } catch (error) {
      console.error('❌ Error sending new appointment notification:', error)
      return false
    }
  }, [requestNotificationPermissions])

  // Send status change notification
  const sendStatusChangeNotification = useCallback(async (
    appointment: Appointment, 
    oldStatus: string
  ) => {
    try {
      console.log(`🔄 Sending status change notification: ${oldStatus} -> ${appointment.status} for ${appointment.app_id}`)
      
      const hasPermission = await requestNotificationPermissions()
      if (!hasPermission) {
        console.log('⏭️ No notification permission, skipping')
        return false
      }

      let title = ''
      let body = ''

      // Only send notifications for specific status changes
      if (appointment.status === 'approved' && oldStatus !== 'approved') {
        title = '✅ Appointment Approved!'
        body = `Your appointment for ${appointment.horseName} with ${appointment.contactName} has been approved.`
      } else if (appointment.status === 'declined' && oldStatus !== 'declined') {
        title = '❌ Appointment Declined'
        body = `Your appointment for ${appointment.horseName} with ${appointment.contactName} has been declined.`
        if (appointment.declineReason) {
          body += ` Reason: ${appointment.declineReason}`
        }
      } else if (appointment.status === 'cancelled' && oldStatus !== 'cancelled') {
        title = '🗑️ Appointment Cancelled'
        body = `Your appointment for ${appointment.horseName} with ${appointment.contactName} has been cancelled.`
      }
      // Don't send notification for pending status changes (new appointments will get their own notification)

      // Only send if we have a title (meaning it's a meaningful status change)
      if (title && body) {
        console.log(`📢 Sending status change notification: ${title}`)
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: {
              type: 'appointment_status_change',
              appointmentId: appointment.app_id,
              appointmentStatus: appointment.status,
              horseName: appointment.horseName,
              vetName: appointment.contactName,
              time: appointment.time,
              date: appointment.date,
              oldStatus,
            },
            sound: 'default',
          },
          trigger: null,
        })

        console.log(`✅ Sent status change notification for ${appointment.app_id}`)
        return true
      } else {
        console.log(`⏭️ No notification sent for status change: ${oldStatus} -> ${appointment.status}`)
        return false
      }
    } catch (error) {
      console.error('❌ Error sending status change notification:', error)
      return false
    }
  }, [requestNotificationPermissions])

  // Load last notified appointments from storage
  const loadLastNotifiedAppointments = useCallback(async () => {
    try {
      const stored = await SecureStore.getItemAsync(LAST_NOTIFIED_APPOINTMENTS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        console.log('📋 Loaded last notified appointments:', Object.keys(parsed).length)
        return parsed as {[key: string]: {status: string, created_at: string}}
      }
      console.log('📋 No previously notified appointments found')
      return {}
    } catch (error) {
      console.error('❌ Error loading last notified appointments:', error)
      return {}
    }
  }, [])

  // Save last notified appointments to storage
  const saveLastNotifiedAppointments = useCallback(async (notifiedAppointments: {[key: string]: {status: string, created_at: string}}) => {
    try {
      await SecureStore.setItemAsync(LAST_NOTIFIED_APPOINTMENTS_KEY, JSON.stringify(notifiedAppointments))
      console.log('💾 Saved last notified appointments:', Object.keys(notifiedAppointments).length)
    } catch (error) {
      console.error('❌ Error saving last notified appointments:', error)
    }
  }, [])

  // Check and send notifications for appointments
  const checkAndSendNotifications = useCallback(async (currentAppointments: Appointment[]) => {
    if (currentAppointments.length === 0) {
      return
    }

    console.log('🔍 Checking appointments for notifications...')
    console.log('📊 Current appointments count:', currentAppointments.length)

    try {
      // Load previously notified appointments
      const lastNotified = await loadLastNotifiedAppointments()
      const updatedNotified: {[key: string]: {status: string, created_at: string}} = { ...lastNotified }
      let notificationsSent = 0

      // Check each appointment
      for (const appointment of currentAppointments) {
        const appointmentId = appointment.app_id
        const currentStatus = appointment.status
        const createdAt = appointment.created_at || ''

        const previouslyNotified = lastNotified[appointmentId]
        
        if (!previouslyNotified) {
          // This is a completely new appointment - send new appointment notification
          console.log(`🎯 New appointment detected: ${appointmentId} (${currentStatus})`)
          
          const notificationSent = await sendNewAppointmentNotification(appointment)
          if (notificationSent) {
            notificationsSent++
          }
          
          // Mark as notified with current status
          updatedNotified[appointmentId] = { status: currentStatus, created_at: createdAt }
        } else if (previouslyNotified.status !== currentStatus) {
          // Status has changed - send status change notification
          console.log(`🎯 Status change detected: ${appointmentId} (${previouslyNotified.status} -> ${currentStatus})`)
          
          const notificationSent = await sendStatusChangeNotification(appointment, previouslyNotified.status)
          if (notificationSent) {
            notificationsSent++
          }
          
          // Update with new status
          updatedNotified[appointmentId] = { status: currentStatus, created_at: createdAt }
        } else {
          // Status hasn't changed, just update the record with current data
          updatedNotified[appointmentId] = { status: currentStatus, created_at: createdAt }
        }
      }

      // Clean up old appointments that are no longer in current list
      const currentAppointmentIds = new Set(currentAppointments.map(apt => apt.app_id))
      Object.keys(updatedNotified).forEach(id => {
        if (!currentAppointmentIds.has(id)) {
          delete updatedNotified[id]
        }
      })

      // Save updated notified appointments
      await saveLastNotifiedAppointments(updatedNotified)

      console.log(`✅ Notification check complete. Sent ${notificationsSent} notification(s)`)
      return notificationsSent
    } catch (error) {
      console.error('❌ Error in notification check:', error)
      return 0
    }
  }, [loadLastNotifiedAppointments, saveLastNotifiedAppointments, sendNewAppointmentNotification, sendStatusChangeNotification])

  // Set up notification response handling
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data
      
      if (data.type === 'new_appointment' || data.type === 'appointment_status_change') {
        console.log('Appointment notification tapped:', data)
        
        // Find and select the appointment
        const appointment = appointments.find(apt => apt.app_id === data.appointmentId)
        if (appointment) {
          setSelectedAppointment(appointment)
        }
      }
    })

    return () => subscription.remove()
  }, [appointments])

  // Initialize notification permissions
  useEffect(() => {
    requestNotificationPermissions()
  }, [requestNotificationPermissions])

  // Check for notifications when appointments update (only once after fetch)
  useEffect(() => {
    if (appointments.length > 0 && !loading && isMounted.current) {
      console.log('🔄 Appointments updated, checking for notifications...')
      checkAndSendNotifications(appointments)
    }
  }, [appointments, loading, checkAndSendNotifications])

  const loadUserId = useCallback(async () => {
    try {
      const storedUser = await SecureStore.getItemAsync("user_data")
      if (storedUser) {
        const parsed = JSON.parse(storedUser)
        const id = parsed.user_id || parsed.id || parsed.op_id
        if (id) {
          console.log("🔑 Loaded user_id from storage:", id)
          setUserId(id)

          const userData = {
            op_id: id,
            op_fname: parsed.op_fname || parsed.fname,
            op_lname: parsed.op_lname || parsed.lname,
            op_email: parsed.op_email || parsed.email,
          }
          setCurrentUser(userData)
          return { id, userData }
        }
      }
    } catch (error) {
      console.error("❌ Error loading user data:", error)
    }
    return null
  }, [])

  const fetchCurrentUser = useCallback(async () => {
    try {
      const storedData = await loadUserId()
      if (storedData) {
        return storedData.userData
      }

      const response = await fetch(`${API_BASE_URL}/get_current_user/`)
      if (response.ok) {
        const userData = await response.json()
        setCurrentUser(userData)
        setUserId(userData.op_id)
        return userData
      }
    } catch (error) {
      console.error("❌ Error fetching current user:", error)
    }

    console.warn("No user found, using mock user")
    const mockUser = {
      op_id: "user123",
      op_fname: "John",
      op_lname: "Doe",
      op_email: "john@example.com",
    }
    setCurrentUser(mockUser)
    setUserId(mockUser.op_id)
    return mockUser
  }, [loadUserId])

  const fetchAppointments = useCallback(
    async (userIdToUse?: string, forceRefresh: boolean = false) => {
      try {
        // Check if we should load from cache (unless force refresh is true)
        if (!forceRefresh) {
          const cachedAppointments = await loadAppointmentsFromCache()
          if (cachedAppointments) {
            console.log('📂 Using cached appointments')
            setAppointments(cachedAppointments)
            setLoading(false)
            setRefreshing(false)
            
            // We still need to check for updates in the background
            // but we don't block the UI
            setTimeout(() => {
              if (isMounted.current) {
                fetchAppointments(userIdToUse, true) // Force refresh in background
              }
            }, 1000)
            return
          }
        }

        let uid = userIdToUse || userId
        if (!uid) {
          const userData = await loadUserId()
          if (userData) {
            uid = userData.id
          } else {
            console.error("❌ No user_id found, cannot fetch appointments.")
            return
          }
        }

        console.log("📡 Fetching appointments for user_id:", uid)

        const url = `${API_BASE_URL}/get_appointments/?user_id=${encodeURIComponent(uid || "")}`
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
        console.log("📊 Number of appointments received:", Array.isArray(data) ? data.length : "Not array")

        const transformedAppointments = Array.isArray(data)
          ? data
              .map((apt: any) => ({
                id: apt.app_id || apt.id,
                app_id: apt.app_id,
                userId: apt.user_id || apt.userId,
                contactId: apt.vet_id || apt.contactId,
                contactName: apt.contactName || "Unknown Vet",
                horseName: apt.horseName || "Unknown Horse",
                service: apt.app_service || apt.service,
                date: apt.app_date || apt.date,
                time: apt.app_time || apt.time,
                notes: apt.app_complain || apt.notes || "",
                status: apt.app_status || apt.status || "today",
                declineReason: apt.decline_reason || apt.declineReason,
                created_at: apt.created_at || apt.app_created_at,
              }))
              .filter((apt) => !deletingAppointments.has(apt.app_id))
          : []

        console.log("🔄 Setting new appointments state")
        setAppointments(transformedAppointments)
        
        // Save to cache
        await saveAppointmentsToCache(transformedAppointments)
        
        console.log("✅ Transformed appointments:", transformedAppointments)
      } catch (error: any) {
        console.error("❌ Error loading appointments:", error)
        
        // If we were forcing a refresh and failed, don't show error to user
        // since they still have cached data
        if (!forceRefresh) {
          Alert.alert("Error", error.message || "Unable to load appointments")
        }
        
        // Try to load from cache as fallback
        const cachedAppointments = await loadAppointmentsFromCache()
        if (cachedAppointments) {
          setAppointments(cachedAppointments)
        } else {
          setAppointments([])
        }
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [userId, loadUserId, deletingAppointments, loadAppointmentsFromCache, saveAppointmentsToCache],
  )

  // Manual refresh function
  const handleRefresh = useCallback(async () => {
    console.log('🔄 Manual refresh triggered')
    setRefreshing(true)
    
    const user = await fetchCurrentUser()
    if (user && user.op_id) {
      await fetchAppointments(user.op_id, true) // Force refresh
    }
  }, [fetchCurrentUser, fetchAppointments])

  const fetchVetDetails = useCallback(async (vetId: string) => {
    try {
      console.log("📞 Fetching veterinarian details for:", vetId)
      
      const response = await fetch(
        `${API_BASE_URL}/get_vet_profile/?vet_id=${vetId}`
      )
      
      if (response.ok) {
        const vetDataArray = await response.json()
        console.log("✅ Veterinarian details:", vetDataArray)
        
        if (vetDataArray && vetDataArray.length > 0) {
          const vetData = vetDataArray[0]
          
          // Format address based on your backend data
          let clinicLocation = "Clinic location not available"
          if (vetData.vet_address_is_clinic) {
            // Use clinic address
            const clinicParts = []
            if (vetData.vet_clinic_street) clinicParts.push(vetData.vet_clinic_street)
            if (vetData.vet_clinic_brgy) clinicParts.push(`Brgy. ${vetData.vet_clinic_brgy}`)
            if (vetData.vet_clinic_city) clinicParts.push(vetData.vet_clinic_city)
            if (vetData.vet_clinic_province) clinicParts.push(vetData.vet_clinic_province)
            if (vetData.vet_clinic_zipcode) clinicParts.push(vetData.vet_clinic_zipcode)
            clinicLocation = clinicParts.join(", ") || "Clinic location not available"
          } else {
            // Use personal address
            const addressParts = []
            if (vetData.vet_street) addressParts.push(vetData.vet_street)
            if (vetData.vet_brgy) addressParts.push(`Brgy. ${vetData.vet_brgy}`)
            if (vetData.vet_city) addressParts.push(vetData.vet_city)
            if (vetData.vet_province) addressParts.push(vetData.vet_province)
            if (vetData.vet_zipcode) addressParts.push(vetData.vet_zipcode)
            clinicLocation = addressParts.join(", ") || "Address not available"
          }
          
          // Get vet full name
          const vetName = `${vetData.vet_fname || ''} ${vetData.vet_lname || ''}`.trim() || "Unknown Veterinarian"
          
          setVetDetails({
            clinic_location: clinicLocation,
            phone_number: vetData.vet_phone_num || "Phone number not available",
            email: vetData.vet_email || "Email not available",
            vet_name: vetName
          })
        } else {
          throw new Error("No veterinarian data found")
        }
      } else {
        console.warn("⚠️ Could not fetch veterinarian details, using fallback")
        setVetDetails({
          clinic_location: "Clinic location not available",
          phone_number: "Phone number not available", 
          email: "Email not available",
          vet_name: "Unknown Veterinarian"
        })
      }
    } catch (error) {
      console.error("❌ Error fetching veterinarian details:", error)
      setVetDetails({
        clinic_location: "Clinic location not available",
        phone_number: "Phone number not available",
        email: "Email not available",
        vet_name: "Unknown Veterinarian"
      })
    }
  }, [])

  const cancelAppointment = useCallback(
    async (appointmentId: string) => {
      try {
        console.log("🗑️ Cancelling appointment:", appointmentId)
        const response = await fetch(`${API_BASE_URL}/cancel_appointment/${appointmentId}/`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          console.log("✅ Appointment cancelled successfully")
          
          // Update the appointment status locally
          const updatedAppointments = appointments.map(apt => 
            apt.app_id === appointmentId 
              ? { ...apt, status: 'cancelled' as const }
              : apt
          )
          
          setAppointments(updatedAppointments)
          
          // Update selected appointment if it's the one being cancelled
          if (selectedAppointment?.app_id === appointmentId) {
            setSelectedAppointment(prev => 
              prev ? { ...prev, status: 'cancelled' as const } : null
            )
          }
          
          // Update cache with new data
          await saveAppointmentsToCache(updatedAppointments)
          
          Alert.alert("Success", "Appointment cancelled successfully")
        } else {
          const errorData = await response.text()
          console.error("❌ Failed to cancel appointment:", errorData)
          Alert.alert("Error", "Failed to cancel appointment")
        }
      } catch (error) {
        console.error("❌ Error cancelling appointment:", error)
        Alert.alert("Error", "Failed to cancel appointment")
      }
    },
    [appointments, selectedAppointment, saveAppointmentsToCache],
  )

  const deleteAppointmentPermanently = useCallback(
    async (appointmentId: string) => {
      try {
        console.log("🗑️ Permanently deleting appointment:", appointmentId)

        setDeletingAppointments((prev) => new Set(prev).add(appointmentId))
        
        // Remove from local state immediately
        const updatedAppointments = appointments.filter((apt) => apt.app_id !== appointmentId)
        setAppointments(updatedAppointments)

        if (selectedAppointment?.app_id === appointmentId) {
          setSelectedAppointment(null)
          setVetDetails(null)
        }

        const response = await fetch(`${API_BASE_URL}/delete_appointment_permanently/${appointmentId}/`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          console.log("✅ Appointment deleted permanently")
          
          // Update cache with new data
          await saveAppointmentsToCache(updatedAppointments)
          
          Alert.alert("Success", "Appointment deleted permanently")

          setDeletingAppointments((prev) => {
            const newSet = new Set(prev)
            newSet.delete(appointmentId)
            return newSet
          })
        } else {
          const errorData = await response.text()
          console.error("❌ Failed to delete appointment permanently:", errorData)

          setDeletingAppointments((prev) => {
            const newSet = new Set(prev)
            newSet.delete(appointmentId)
            return newSet
          })

          // Restore the appointment
          if (userId) {
            await fetchAppointments(userId, true)
          }

          Alert.alert("Error", "Failed to delete appointment permanently")
        }
      } catch (error) {
        console.error("❌ Error deleting appointment permanently:", error)

        setDeletingAppointments((prev) => {
          const newSet = new Set(prev)
          newSet.delete(appointmentId)
          return newSet
        })

        if (userId) {
          await fetchAppointments(userId, true)
        }

        Alert.alert("Error", "Failed to delete appointment permanently")
      }
    },
    [userId, appointments, selectedAppointment?.app_id, fetchAppointments, saveAppointmentsToCache],
  )

  const canRescheduleAppointment = useCallback((appointment: Appointment) => {
    if (!appointment.created_at) {
      console.warn("No creation timestamp found, allowing reschedule")
      return { canReschedule: true, reason: "" }
    }

    try {
      const createdTime = new Date(appointment.created_at)
      const currentTime = new Date()
      const timeDifference = currentTime.getTime() - createdTime.getTime()
      const hoursDifference = timeDifference / (1000 * 60 * 60)

      if (hoursDifference > 1) {
        const hoursPassedFormatted = hoursDifference.toFixed(1)
        return {
          canReschedule: false,
          reason: `Reschedule period expired. ${hoursPassedFormatted} hours have passed since booking. Reschedule is only allowed within 1 hour of booking.`,
        }
      }

      const remainingMinutes = Math.max(0, 60 - timeDifference / (1000 * 60))
      return {
        canReschedule: true,
        reason: `${Math.floor(remainingMinutes)} minutes remaining to reschedule`,
      }
    } catch (error) {
      console.error("Error checking reschedule eligibility:", error)
      return { canReschedule: true, reason: "" }
    }
  }, [])

  // Initial data load - only once on mount
  useEffect(() => {
    const initializeData = async () => {
      if (isMounted.current) {
        return
      }

      setLoading(true)
      try {
        console.log('🚀 Initializing calendar data...')
        
        // First check cache
        const cachedAppointments = await loadAppointmentsFromCache()
        
        if (cachedAppointments) {
          console.log('📂 Using cached data')
          setAppointments(cachedAppointments)
          const user = await fetchCurrentUser()
          setLoading(false)
          
          // Fetch fresh data in background without blocking UI
          setTimeout(async () => {
            if (user && user.op_id && isMounted.current) {
              await fetchAppointments(user.op_id, true)
            }
          }, 1000)
        } else {
          console.log('📡 Fetching fresh data (no cache)')
          const user = await fetchCurrentUser()
          if (user && user.op_id) {
            await fetchAppointments(user.op_id, false)
          }
        }
        
        isMounted.current = true
      } catch (error) {
        console.error("❌ Error initializing data:", error)
        setLoading(false)
      }
    }

    initializeData()

    return () => {
      isMounted.current = false
    }
  }, [fetchCurrentUser, fetchAppointments, loadAppointmentsFromCache])

  // Fetch vet details when appointment is selected
  useEffect(() => {
    if (selectedAppointment) {
      fetchVetDetails(selectedAppointment.contactId)
    } else {
      // Reset when no appointment is selected
      setVetDetails(null)
    }
  }, [selectedAppointment, fetchVetDetails])

  // Handle screen focus - fetch fresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("🎯 Calendar screen focused")
      isScreenFocused.current = true
      
      // Only fetch if we have a user ID and the screen was previously not focused
      const refreshData = async () => {
        const user = await fetchCurrentUser()
        if (user && user.op_id && isMounted.current) {
          // Check if cache is expired
          const cachedAppointments = await loadAppointmentsFromCache()
          if (!cachedAppointments) {
            // No valid cache, fetch fresh data
            await fetchAppointments(user.op_id, false)
          }
        }
      }
      
      refreshData()
      
      return () => {
        isScreenFocused.current = false
      }
    }, [fetchCurrentUser, fetchAppointments, loadAppointmentsFromCache]),
  )

  const getCalendarData = useCallback(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    // Get first day of the month
    const firstDay = new Date(year, month, 1)
    // Get last day of the month
    const lastDay = new Date(year, month + 1, 0)
    
    // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDay.getDay()
    
    // Get the day of the week for the last day
    const lastDayOfWeek = lastDay.getDay()
    
    // Calculate days from previous month to show
    const daysFromPrevMonth = firstDayOfWeek
    
    // Calculate days from next month to show
    const daysFromNextMonth = 6 - lastDayOfWeek
    
    const days = []
    
    // Add days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i)
      days.push(date)
    }
    
    // Add days from current month
    const daysInMonth = lastDay.getDate()
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i)
      days.push(date)
    }
    
    // Add days from next month
    for (let i = 1; i <= daysFromNextMonth; i++) {
      const date = new Date(year, month + 1, i)
      days.push(date)
    }
    
    return { days, firstDay }
  }, [currentDate])

  // Updated function to get appointment dates with their status
  const getAppointmentDatesWithStatus = useCallback(() => {
    const datesWithAppointments = new Map<string, string>() // date -> status
    appointments.forEach((apt) => {
      if (apt.status !== "cancelled" && apt.status !== "declined") {
        // Parse the appointment date and format it to YYYY-MM-DD for consistent comparison
        const appointmentDate = new Date(apt.date)
        const year = appointmentDate.getFullYear()
        const month = String(appointmentDate.getMonth() + 1).padStart(2, '0')
        const day = String(appointmentDate.getDate()).padStart(2, '0')
        const formattedDate = `${year}-${month}-${day}`
        
        // Store the status for this date
        // If multiple appointments on same date, keep the most "important" status
        const currentStatus = datesWithAppointments.get(formattedDate)
        if (!currentStatus || getStatusPriority(apt.status) > getStatusPriority(currentStatus)) {
          datesWithAppointments.set(formattedDate, apt.status)
        }
        
        console.log(`📅 Appointment found: ${apt.date} -> ${formattedDate} (${apt.status})`)
      }
    })
    console.log("📅 Dates with appointments:", Array.from(datesWithAppointments.entries()))
    return datesWithAppointments
  }, [appointments, getStatusPriority])

  const goToPreviousMonth = useCallback(() => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }, [])

  const goToNextMonth = useCallback(() => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }, [])

  const formatMonthYear = useCallback((date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }, [])

  const getDayAbbreviation = useCallback((dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { weekday: "short" })
  }, [])

  const getDayNumber = useCallback((dateString: string) => {
    const date = new Date(dateString)
    return date.getDate()
  }, [])

  const isToday = useCallback((date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }, [])

  const isCurrentMonth = useCallback(
    (date: Date) => {
      return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear()
    },
    [currentDate],
  )

  const getUpcomingAppointments = useCallback(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    nextWeek.setHours(23, 59, 59, 999)

    return appointments
      .filter((apt) => {
        const aptDate = new Date(apt.date)
        return (
          aptDate >= today &&
          aptDate <= nextWeek &&
          apt.status !== "cancelled" &&
          apt.status !== "declined" &&
          apt.status === "approved"
        )
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [appointments])

  const formatAppointmentDate = useCallback((dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }, [])

  const getAllAppointments = useCallback(() => {
    return appointments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [appointments])

  const handleDeleteAppointment = useCallback(
    (appointmentId: string) => {
      Alert.alert("Cancel Appointment", "Are you sure you want to cancel this appointment?", [
        { text: "No", style: "cancel" },
        { text: "Yes", onPress: () => cancelAppointment(appointmentId) },
      ])
    },
    [cancelAppointment],
  )

  const handleLongPress = useCallback(
    (appointment: Appointment) => {
      if (appointment.status === "cancelled" || appointment.status === "declined") {
        Alert.alert(
          "Delete Appointment",
          `This will permanently delete the ${appointment.status} appointment from your records. This action cannot be undone.\n\nAppointment: ${appointment.horseName} with ${appointment.contactName}\nDate: ${appointment.date} at ${appointment.time}`,
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Delete Permanently",
              style: "destructive",
              onPress: () => deleteAppointmentPermanently(appointment.app_id),
            },
          ],
        )
      }
    },
    [deleteAppointmentPermanently],
  )

  const handleAppointmentPress = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment)
  }, [])

  const handleBackToCalendar = useCallback(() => {
    setSelectedAppointment(null)
    setVetDetails(null)
  }, [])

  const handleAddAppointment = useCallback(() => {
    router.push("/HORSE_OPERATOR/Hbook2" as any)
  }, [router])

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case "today":
        return "#2196F3" 
      case "pending":
        return "#FF9800"
      case "approved":
        return "#4CAF50"
      case "cancelled":
        return "#f44336"
      case "declined":
        return "#f44336"
      default:
        return "#666"
    }
  }, [])

  const getStatusText = useCallback((status: string) => {
    const statusMap: {[key: string]: string} = {
      'today': 'Today',
      'pending': 'Pending',
      'approved': 'Approved', 
      'cancelled': 'Cancelled',
      'declined': 'Declined'
    }
    return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1)
  }, [])

  const formatCreationTime = useCallback((createdAt?: string) => {
    if (!createdAt) return ""

    try {
      const createdTime = new Date(createdAt)
      return createdTime.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    } catch {
      return ""
    }
  }, [])

  const { days } = getCalendarData()
  const upcomingAppointments = getUpcomingAppointments()
  const allAppointments = getAllAppointments()
  const appointmentDatesWithStatus = getAppointmentDatesWithStatus()

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.loadingContainer]}>
          <FontAwesome5 name="calendar-alt" size={48} color="#CD853F" />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        {selectedAppointment ? (
          <TouchableOpacity onPress={handleBackToCalendar} style={styles.backArrowButton}>
            <FontAwesome5 name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
        ) : null}
        <Text style={styles.headerTitle}>{selectedAppointment ? "Appointment Details" : "Calendar"}</Text>
        {currentUser && !selectedAppointment && (
          <View style={styles.userInfo}>
            <Text style={styles.userText}>
              {currentUser.op_fname} {currentUser.op_lname}
            </Text>
          </View>
        )}
      </View>

      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#000000ff"]}
            tintColor="#000000ff"
          />
        }
      >
        {!selectedAppointment ? (
          <View>
            <View style={styles.viewToggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, viewMode === "calendar" && styles.activeToggleButton]}
                onPress={() => setViewMode("calendar")}
              >
                <FontAwesome5
                  name="calendar"
                  size={16}
                  color={viewMode === "calendar" ? "#fff" : "#CD853F"}
                  style={styles.toggleIcon}
                />
                <Text style={[styles.toggleButtonText, viewMode === "calendar" && styles.activeToggleButtonText]}>
                  Calendar View
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleButton, viewMode === "all" && styles.activeToggleButton]}
                onPress={() => setViewMode("all")}
              >
                <FontAwesome5
                  name="list"
                  size={16}
                  color={viewMode === "all" ? "#fff" : "#CD853F"}
                  style={styles.toggleIcon}
                />
                <Text style={[styles.toggleButtonText, viewMode === "all" && styles.activeToggleButtonText]}>
                  All Appointments
                </Text>
              </TouchableOpacity>
            </View>

            {viewMode === "calendar" && (
              <>
                <View style={styles.calendarContainer}>
                  <View style={styles.monthNavigation}>
                    <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
                      <FontAwesome5 name="chevron-left" size={16} color="#CD853F" />
                    </TouchableOpacity>
                    <Text style={styles.monthYear}>{formatMonthYear(currentDate)}</Text>
                    <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
                      <FontAwesome5 name="chevron-right" size={16} color="#CD853F" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dayHeaders}>
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <Text key={day} style={styles.dayHeader}>
                        {day}
                      </Text>
                    ))}
                  </View>

                  <View style={styles.calendarGrid}>
                    {days.map((day, index) => {
                      const isCurrentMonthDay = isCurrentMonth(day)
                      const isTodayDate = isToday(day)
                      
                      // Format the calendar date for comparison with appointment dates
                      const year = day.getFullYear()
                      const month = String(day.getMonth() + 1).padStart(2, '0')
                      const date = String(day.getDate()).padStart(2, '0')
                      const dateString = `${year}-${month}-${date}`
                      
                      const appointmentStatus = appointmentDatesWithStatus.get(dateString)
                      const hasAppointmentOnDate = !!appointmentStatus
                      
                      // Get background color based on appointment status
                      let backgroundColor = 'transparent'
                      let borderColor = 'transparent'
                      let textColor = isCurrentMonthDay ? '#333' : '#ccc'
                      
                      if (hasAppointmentOnDate && isCurrentMonthDay) {
                        backgroundColor = getStatusColor(appointmentStatus!) + '20' // 20% opacity
                        borderColor = getStatusColor(appointmentStatus!)
                      }
                      
                      // Set today's date to use the blue color (same as "today" status)
                      if (isTodayDate) {
                        backgroundColor = '#2196F3' // Blue color for today
                        textColor = '#fff'
                      }
                      
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.dayCell, 
                            isTodayDate && styles.todayCell,
                            hasAppointmentOnDate && isCurrentMonthDay && {
                              backgroundColor,
                              borderColor,
                              borderWidth: 2,
                            }
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              !isCurrentMonthDay && styles.otherMonthText,
                              isTodayDate && styles.todayText,
                              { color: textColor },
                              hasAppointmentOnDate && isCurrentMonthDay && styles.appointmentDateText,
                            ]}
                          >
                            {day.getDate()}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>

                  {/* Status Legend */}
                  <View style={styles.legendContainer}>
                    <Text style={styles.legendTitle}>Status Legend:</Text>
                    <View style={styles.legendItems}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
                        <Text style={styles.legendText}>Approved</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
                        <Text style={styles.legendText}>Pending</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: '#2196F3' }]} />
                        <Text style={styles.legendText}>Today</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.appointmentsSection}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleContainer}>
                      <FontAwesome5 name="calendar-check" size={20} color="#CD853F" style={styles.sectionIcon} />
                      <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
                    </View>
                    <View style={styles.appointmentBadge}>
                      <Text style={styles.appointmentBadgeText}>{upcomingAppointments.length}</Text>
                    </View>
                  </View>
                  {upcomingAppointments.length === 0 ? (
                    <View style={styles.noAppointments}>
                      <View style={styles.emptyStateIcon}>
                        <FontAwesome5 name="calendar-times" size={56} color="#CD853F" />
                      </View>
                      <Text style={styles.noAppointmentsText}>No upcoming appointments</Text>
                      <Text style={styles.noAppointmentsSubtext}>
                        Book an appointment with a veterinarian to get started
                      </Text>
                    </View>
                  ) : (
                    upcomingAppointments.map((appointment) => (
                      <TouchableOpacity
                        key={appointment.id}
                        style={styles.appointmentCard}
                        onPress={() => handleAppointmentPress(appointment)}
                        onLongPress={() => handleLongPress(appointment)}
                      >
                        <View style={styles.appointmentCardInner}>
                          <View
                            style={[styles.appointmentDate, { backgroundColor: getStatusColor(appointment.status) }]}
                          >
                            <Text style={styles.appointmentDayText}>{getDayAbbreviation(appointment.date)}</Text>
                            <Text style={styles.appointmentDayNumber}>{getDayNumber(appointment.date)}</Text>
                          </View>
                          <View style={styles.appointmentDetails}>
                            <Text style={styles.appointmentHorse}>{appointment.horseName}</Text>
                            <View style={styles.appointmentInfoRow}>
                              <FontAwesome5 name="calendar" size={12} color="#888" />
                              <Text style={styles.appointmentTime}>{formatAppointmentDate(appointment.date)}</Text>
                            </View>
                            <View style={styles.appointmentInfoRow}>
                              <FontAwesome5 name="clock" size={12} color="#888" />
                              <Text style={styles.appointmentTime}>{appointment.time}</Text>
                            </View>
                            <View style={styles.appointmentInfoRow}>
                              <FontAwesome5 name="stethoscope" size={12} color="#888" />
                              <Text style={styles.appointmentService}>{appointment.service}</Text>
                            </View>
                            <View style={styles.appointmentInfoRow}>
                              <FontAwesome5 name="user-md" size={12} color="#888" />
                              <Text style={styles.appointmentDoctor}>{appointment.contactName}</Text>
                            </View>
                            <View style={styles.appointmentInfoRow}>
                              <FontAwesome5 name="calendar-plus" size={12} color="#888" />
                              <Text style={styles.appointmentCreatedAt}>
                                Booked:{" "}
                                {appointment.created_at
                                  ? formatCreationTime(appointment.created_at)
                                  : "Date unavailable"}
                              </Text>
                            </View>
                            <View style={styles.appointmentTags}>
                              <View
                                style={[
                                  styles.tag,
                                  {
                                    backgroundColor: getStatusColor(appointment.status) + "20",
                                    borderColor: getStatusColor(appointment.status),
                                  },
                                ]}
                              >
                                <Text style={[styles.tagText, { color: getStatusColor(appointment.status) }]}>
                                  {getStatusText(appointment.status)}
                                </Text>
                              </View>
                              {(appointment.status === "cancelled" || appointment.status === "declined") &&
                                !deletingAppointments.has(appointment.app_id) && (
                                  <View style={styles.longPressIndicator}>
                                    <FontAwesome5 name="trash-alt" size={10} color="#999" />
                                    <Text style={styles.longPressIndicatorText}>Long press to delete</Text>
                                  </View>
                                )}
                            </View>
                          </View>
                          {appointment.status !== "approved" &&
                            appointment.status !== "cancelled" &&
                            appointment.status !== "declined" &&
                            !deletingAppointments.has(appointment.app_id) && (
                              <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => handleDeleteAppointment(appointment.app_id)}
                              >
                                <FontAwesome5 name="trash" size={18} color="#ff4444" />
                              </TouchableOpacity>
                            )}
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </>
            )}

            {viewMode === "all" && (
              <View style={styles.appointmentsSection}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleContainer}>
                    <FontAwesome5 name="list" size={20} color="#CD853F" style={styles.sectionIcon} />
                    <Text style={styles.sectionTitle}>All Appointments</Text>
                  </View>
                  <View style={styles.appointmentBadge}>
                    <Text style={styles.appointmentBadgeText}>{allAppointments.length}</Text>
                  </View>
                </View>
                {allAppointments.length === 0 ? (
                  <View style={styles.noAppointments}>
                    <View style={styles.emptyStateIcon}>
                      <FontAwesome5 name="calendar-times" size={56} color="#CD853F" />
                    </View>
                    <Text style={styles.noAppointmentsText}>No appointments found</Text>
                    <Text style={styles.noAppointmentsSubtext}>
                      Book an appointment with a veterinarian to get started
                    </Text>
                  </View>
                ) : (
                  allAppointments.map((appointment) => (
                    <TouchableOpacity
                      key={appointment.id}
                      style={styles.appointmentCard}
                      onPress={() => handleAppointmentPress(appointment)}
                      onLongPress={() => handleLongPress(appointment)}
                    >
                      <View style={styles.appointmentCardInner}>
                        <View style={[styles.appointmentDate, { backgroundColor: getStatusColor(appointment.status) }]}>
                          <Text style={styles.appointmentDayText}>{getDayAbbreviation(appointment.date)}</Text>
                          <Text style={styles.appointmentDayNumber}>{getDayNumber(appointment.date)}</Text>
                        </View>
                        <View style={styles.appointmentDetails}>
                          <Text style={styles.appointmentHorse}>{appointment.horseName}</Text>
                          <View style={styles.appointmentInfoRow}>
                            <FontAwesome5 name="calendar" size={12} color="#888" />
                            <Text style={styles.appointmentTime}>{formatAppointmentDate(appointment.date)}</Text>
                          </View>
                          <View style={styles.appointmentInfoRow}>
                            <FontAwesome5 name="clock" size={12} color="#888" />
                            <Text style={styles.appointmentTime}>{appointment.time}</Text>
                          </View>
                          <View style={styles.appointmentInfoRow}>
                            <FontAwesome5 name="stethoscope" size={12} color="#888" />
                            <Text style={styles.appointmentService}>{appointment.service}</Text>
                          </View>
                          <View style={styles.appointmentInfoRow}>
                            <FontAwesome5 name="user-md" size={12} color="#888" />
                            <Text style={styles.appointmentDoctor}>{appointment.contactName}</Text>
                          </View>
                          <View style={styles.appointmentInfoRow}>
                            <FontAwesome5 name="calendar-plus" size={12} color="#888" />
                            <Text style={styles.appointmentCreatedAt}>
                              Booked:{" "}
                              {appointment.created_at ? formatCreationTime(appointment.created_at) : "Date unavailable"}
                            </Text>
                          </View>
                          <View style={styles.appointmentTags}>
                            <View
                              style={[
                                styles.tag,
                                {
                                  backgroundColor: getStatusColor(appointment.status) + "20",
                                  borderColor: getStatusColor(appointment.status),
                                },
                              ]}
                            >
                              <Text style={[styles.tagText, { color: getStatusColor(appointment.status) }]}>
                                {getStatusText(appointment.status)}
                              </Text>
                            </View>
                            {(appointment.status === "cancelled" || appointment.status === "declined") &&
                              !deletingAppointments.has(appointment.app_id) && (
                                <View style={styles.longPressIndicator}>
                                  <FontAwesome5 name="trash-alt" size={10} color="#999" />
                                  <Text style={styles.longPressIndicatorText}>Long press to delete</Text>
                                </View>
                              )}
                          </View>
                        </View>
                        {appointment.status !== "approved" &&
                          appointment.status !== "cancelled" &&
                          appointment.status !== "declined" &&
                          !deletingAppointments.has(appointment.app_id) && (
                            <TouchableOpacity
                              style={styles.deleteButton}
                              onPress={() => handleDeleteAppointment(appointment.app_id)}
                            >
                              <FontAwesome5 name="trash" size={18} color="#ff4444" />
                            </TouchableOpacity>
                          )}
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </View>
        ) : (
          <View>
            {/* Updated Details Card to match appointment card style */}
            <TouchableOpacity style={styles.appointmentCard} disabled>
              <View style={styles.appointmentCardInner}>
                <View style={[styles.appointmentDate, { backgroundColor: getStatusColor(selectedAppointment.status) }]}>
                  <Text style={styles.appointmentDayText}>{getDayAbbreviation(selectedAppointment.date)}</Text>
                  <Text style={styles.appointmentDayNumber}>{getDayNumber(selectedAppointment.date)}</Text>
                </View>
                <View style={styles.appointmentDetails}>
                  <Text style={styles.appointmentHorse}>{selectedAppointment.horseName}</Text>
                  <View style={styles.appointmentInfoRow}>
                    <FontAwesome5 name="calendar" size={12} color="#888" />
                    <Text style={styles.appointmentTime}>{formatAppointmentDate(selectedAppointment.date)}</Text>
                  </View>
                  <View style={styles.appointmentInfoRow}>
                    <FontAwesome5 name="clock" size={12} color="#888" />
                    <Text style={styles.appointmentTime}>{selectedAppointment.time}</Text>
                  </View>
                  <View style={styles.appointmentInfoRow}>
                    <FontAwesome5 name="stethoscope" size={12} color="#888" />
                    <Text style={styles.appointmentService}>{selectedAppointment.service}</Text>
                  </View>
                  <View style={styles.appointmentInfoRow}>
                    <FontAwesome5 name="user-md" size={12} color="#888" />
                    <Text style={styles.appointmentDoctor}>{selectedAppointment.contactName}</Text>
                  </View>
                  <View style={styles.appointmentInfoRow}>
                    <FontAwesome5 name="calendar-plus" size={12} color="#888" />
                    <Text style={styles.appointmentCreatedAt}>
                      Booked:{" "}
                      {selectedAppointment.created_at
                        ? formatCreationTime(selectedAppointment.created_at)
                        : "Date unavailable"}
                    </Text>
                  </View>
                  <View style={styles.appointmentTags}>
                    <View
                      style={[
                        styles.tag,
                        {
                          backgroundColor: getStatusColor(selectedAppointment.status) + "20",
                          borderColor: getStatusColor(selectedAppointment.status),
                        },
                      ]}
                    >
                      <Text style={[styles.tagText, { color: getStatusColor(selectedAppointment.status) }]}>
                        {getStatusText(selectedAppointment.status)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            {/* Clean Veterinarian Info Section */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Veterinarian Information</Text>
              
              <View style={styles.infoCard}>
                <View style={styles.infoItem}>
                  <View style={styles.infoIconContainer}>
                    <FontAwesome5 name="map-marker-alt" size={16} color="#CD853F" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Clinic Location</Text>
                    <Text style={styles.infoText}>
                      {vetDetails?.clinic_location || "Location not available"}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoItem}>
                  <View style={styles.infoIconContainer}>
                    <FontAwesome5 name="phone" size={16} color="#CD853F" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Contact</Text>
                    <Text style={styles.infoText}>
                      {vetDetails?.phone_number || "Phone not available"}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoItem}>
                  <View style={styles.infoIconContainer}>
                    <FontAwesome5 name="envelope" size={16} color="#CD853F" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoText}>
                      {vetDetails?.email || "Email not available"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Note:</Text>
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>{selectedAppointment.notes || "No additional notes"}</Text>
              </View>
            </View>

            {selectedAppointment.declineReason && (
              <View style={styles.declineSection}>
                <Text style={styles.declineLabel}>Decline Reason:</Text>
                <View style={styles.declineBox}>
                  <Text style={styles.declineText}>{selectedAppointment.declineReason}</Text>
                </View>
              </View>
            )}

            {selectedAppointment.status !== "cancelled" &&
              selectedAppointment.status !== "approved" &&
              selectedAppointment.status !== "declined" && (
                <View>
                  {(() => {
                    const rescheduleCheck = canRescheduleAppointment(selectedAppointment)
                    if (!rescheduleCheck.canReschedule) {
                      return (
                        <View style={styles.rescheduleDisabledSection}>
                          <View style={styles.rescheduleTimeInfo}>
                            <FontAwesome5
                              name="exclamation-triangle"
                              size={14}
                              color="#f44336"
                              style={styles.timeIcon}
                            />
                            <Text style={styles.rescheduleDisabledText}>{rescheduleCheck.reason}</Text>
                          </View>
                          <TouchableOpacity style={styles.rescheduleButtonDisabled} disabled>
                            <Text style={styles.rescheduleButtonDisabledText}>Reschedule Unavailable</Text>
                          </TouchableOpacity>
                        </View>
                      )
                    }
                    return null
                  })()}
                </View>
              )}

            {(selectedAppointment.status === "cancelled" || selectedAppointment.status === "declined") && (
              <View style={styles.permanentDeleteSection}>
                <TouchableOpacity
                  style={styles.permanentDeleteButton}
                  onPress={() => handleLongPress(selectedAppointment)}
                  disabled={deletingAppointments.has(selectedAppointment.app_id)}
                >
                  {deletingAppointments.has(selectedAppointment.app_id) ? (
                    <>
                      <FontAwesome5 name="spinner" size={16} color="#fff" style={styles.deleteButtonIcon} />
                      <Text style={styles.permanentDeleteButtonText}>Deleting...</Text>
                    </>
                  ) : (
                    <>
                      <FontAwesome5 name="trash-alt" size={16} color="#fff" style={styles.deleteButtonIcon} />
                      <Text style={styles.permanentDeleteButtonText}>Delete Permanently</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Floating Add Button */}
      {!selectedAppointment && (
        <TouchableOpacity style={styles.floatingAddButton} onPress={handleAddAppointment}>
          <FontAwesome5 name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      )}

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
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#CD853F",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#CD853F",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
    textAlign: "center",
  },
  backArrowButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  userInfo: {
    position: "absolute",
    right: 20,
    top: 15,
  },
  userText: {
    fontSize: 12,
    color: "#fff",
    opacity: 0.8,
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 18,
    color: "#666",
    marginTop: 10,
  },
  viewToggleContainer: {
    flexDirection: "row",
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  activeToggleButton: {
    backgroundColor: "#CD853F",
  },
  toggleIcon: {
    marginRight: 8,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#CD853F",
  },
  activeToggleButtonText: {
    color: "#fff",
  },
  calendarContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  monthNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  monthYear: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  dayHeaders: {
    flexDirection: "row",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 10,
  },
  dayHeader: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    color: "#666",
    paddingVertical: 5,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginVertical: 2,
    borderRadius: 25,
  },
  todayCell: {
    backgroundColor: "#2196F3", // Blue color for today
    shadowColor: "#2196F3",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  dayText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  otherMonthText: {
    color: "#ccc",
  },
  todayText: {
    color: "#fff",
    fontWeight: "bold",
  },
  appointmentDateText: {
    fontWeight: "bold",
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendContainer: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  appointmentsSection: {
    paddingHorizontal: 0,
    paddingBottom: 50,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionIcon: {
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    marginLeft: 4,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#FFE8D6',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 4,
  },
  appointmentBadge: {
    backgroundColor: "#CD853F",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  appointmentBadgeText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  noAppointments: {
    alignItems: "center",
    paddingVertical: 50,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyStateIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FFF8E1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  noAppointmentsText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  noAppointmentsSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },
  appointmentCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  appointmentCardInner: {
    flexDirection: "row",
    padding: 16,
    position: "relative",
  },
  appointmentDate: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  appointmentDayText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  appointmentDayNumber: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "bold",
    marginTop: 2,
  },
  appointmentDetails: {
    flex: 1,
  },
  appointmentHorse: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 6,
  },
  appointmentInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  appointmentTime: {
    fontSize: 13,
    color: "#666",
    marginLeft: 6,
    fontWeight: "500",
  },
  appointmentService: {
    fontSize: 13,
    color: "#666",
    marginLeft: 6,
    fontWeight: "500",
  },
  appointmentDoctor: {
    fontSize: 13,
    color: "#666",
    marginLeft: 6,
    fontWeight: "500",
  },
  appointmentCreatedAt: {
    fontSize: 12,
    color: "#888",
    marginLeft: 6,
    fontWeight: "500",
  },
  appointmentTags: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 2,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  longPressIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  longPressIndicatorText: {
    fontSize: 10,
    color: "#999",
    marginLeft: 4,
    fontStyle: "italic",
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    right: 12,
    top: 12,
  },
  floatingAddButton: {
    position: 'absolute',
    right: 25,
    bottom: 100,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#CD853F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },
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
  tabLabel: {
    fontSize: moderateScale(9),
    color: "#666",
    textAlign: "center",
  },
  activeTabLabel: {
    color: "#CD853F",
    fontWeight: "600",
  },
  activeTabIcon: {
    backgroundColor: "#CD853F",
  },
  tabIconImage: {
    width: scale(16),
    height: scale(16),
  },
  fallbackIcon: {
    width: scale(14),
    height: scale(14),
    backgroundColor: "#666",
    borderRadius: scale(2),
  },
  infoSection: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  infoIcon: {
    width: 24,
    textAlign: "center",
    marginRight: 10,
  },
  notesSection: {
    marginBottom: 70,
  },
  notesLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  notesBox: {
    backgroundColor: "#fff3cd",
    borderRadius: 10,
    padding: 20,
  },
  notesText: {
    fontSize: 16,
    color: "#333",
    lineHeight: 22,
  },
  declineSection: {
    marginBottom: 20,
  },
  declineLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#f44336",
    marginBottom: 10,
  },
  declineBox: {
    backgroundColor: "#ffebee",
    borderRadius: 10,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#f44336",
  },
  declineText: {
    fontSize: 16,
    color: "#d32f2f",
    lineHeight: 22,
  },
  rescheduleTimeInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff9c4",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
  },
  rescheduleDisabledSection: {
    marginBottom: 20,
  },
  timeIcon: {
    marginRight: 8,
  },
  rescheduleTimeText: {
    fontSize: 14,
    color: "#FF8F00",
    fontWeight: "500",
    flex: 1,
  },
  rescheduleDisabledText: {
    fontSize: 14,
    color: "#d32f2f",
    fontWeight: "500",
    flex: 1,
  },
  rescheduleButton: {
    backgroundColor: "#CD853F",
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3.84,
    elevation: 5,
  },
  rescheduleButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  rescheduleButtonDisabled: {
    backgroundColor: "#ccc",
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: "center",
    marginBottom: 20,
  },
  rescheduleButtonDisabledText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#888",
  },
  permanentDeleteSection: {
    marginBottom: 20,
  },
  deleteWarningInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffebee",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#f44336",
  },
  deleteWarningText: {
    fontSize: 14,
    color: "#d32f2f",
    fontWeight: "500",
    flex: 1,
  },
  permanentDeleteButton: {
    backgroundColor: "#f44336",
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deleteButtonIcon: {
    marginRight: 8,
  },
  permanentDeleteButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
})

export default CalendarScreen