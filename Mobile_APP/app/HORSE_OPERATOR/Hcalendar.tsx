"use client"

import { useState, useEffect, useCallback } from "react"
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
} from "react-native"
import { FontAwesome5 } from "@expo/vector-icons"
import { useRouter, useFocusEffect } from "expo-router"
import * as SecureStore from "expo-secure-store"

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
  status: "scheduled" | "pending" | "approved" | "cancelled" | "declined"
  declineReason?: string
  created_at?: string
}

interface User {
  op_id: string
  op_fname: string
  op_lname: string
  op_email: string
}

// Configuration
const API_BASE_URL = "http://192.168.101.2:8000/api/horse_operator"

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

interface TabButtonProps {
  iconName: string
  label: string
  tabKey: string
  isActive: boolean
  onPress?: () => void
}

const TabButton = ({ iconName, label, isActive, onPress }: TabButtonProps) => {
  return (
    <TouchableOpacity 
      style={styles.navItem} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.navIcon, isActive && styles.activeNavIcon]}>
        <FontAwesome5 name={iconName} size={scale(16)} color={isActive ? "#fff" : "#666"} />
      </View>
      <Text style={[styles.navLabel, isActive && styles.activeNavLabel]}>{label}</Text>
    </TouchableOpacity>
  )
}

const CalendarScreen = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [deletingAppointments, setDeletingAppointments] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<"calendar" | "all">("calendar")
  const router = useRouter()
  const safeArea = getSafeAreaPadding()

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
    async (userIdToUse?: string) => {
      try {
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
                status: apt.app_status || apt.status || "scheduled",
                declineReason: apt.decline_reason || apt.declineReason,
                created_at: apt.created_at || apt.app_created_at,
              }))
              .filter((apt) => !deletingAppointments.has(apt.app_id))
          : []

        setAppointments(transformedAppointments)
        console.log("✅ Transformed appointments:", transformedAppointments)
      } catch (error: any) {
        console.error("❌ Error loading appointments:", error)
        Alert.alert("Error", error.message || "Unable to load appointments")
        setAppointments([])
      }
    },
    [userId, loadUserId, deletingAppointments],
  )

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
          if (userId) {
            await fetchAppointments(userId)
          }
          setSelectedAppointment(null)
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
    [userId, fetchAppointments],
  )

  const deleteAppointmentPermanently = useCallback(
    async (appointmentId: string) => {
      try {
        console.log("🗑️ Permanently deleting appointment:", appointmentId)

        setDeletingAppointments((prev) => new Set(prev).add(appointmentId))
        setAppointments((prev) => prev.filter((apt) => apt.app_id !== appointmentId))

        if (selectedAppointment?.app_id === appointmentId) {
          setSelectedAppointment(null)
        }

        const response = await fetch(`${API_BASE_URL}/delete_appointment_permanently/${appointmentId}/`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          console.log("✅ Appointment deleted permanently")
          Alert.alert("Success", "Appointment deleted permanently")

          setDeletingAppointments((prev) => {
            const newSet = new Set(prev)
            newSet.delete(appointmentId)
            return newSet
          })

          if (userId) {
            await fetchAppointments(userId)
          }
        } else {
          const errorData = await response.text()
          console.error("❌ Failed to delete appointment permanently:", errorData)

          setDeletingAppointments((prev) => {
            const newSet = new Set(prev)
            newSet.delete(appointmentId)
            return newSet
          })

          if (userId) {
            await fetchAppointments(userId)
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
          await fetchAppointments(userId)
        }

        Alert.alert("Error", "Failed to delete appointment permanently")
      }
    },
    [userId, fetchAppointments, selectedAppointment?.app_id],
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

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true)
      try {
        const user = await fetchCurrentUser()
        if (user && user.op_id) {
          await fetchAppointments(user.op_id)
        }
      } catch (error) {
        console.error("❌ Error initializing data:", error)
      } finally {
        setLoading(false)
      }
    }

    initializeData()
  }, [fetchCurrentUser, fetchAppointments])

  useFocusEffect(
    useCallback(() => {
      console.log("🎯 Calendar screen focused - refreshing appointments...")
      if (userId) {
        fetchAppointments(userId)
      }
    }, [fetchAppointments, userId]),
  )

  const getCalendarData = useCallback(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)

    const startDate = new Date(firstDay)
    const dayOfWeek = firstDay.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    startDate.setDate(firstDay.getDate() + mondayOffset)

    const days = []
    const currentDateForLoop = new Date(startDate)
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDateForLoop))
      currentDateForLoop.setDate(currentDateForLoop.getDate() + 1)
    }
    return { days, firstDay }
  }, [currentDate])

  const hasAppointments = useCallback(
    (date: Date) => {
      const dateString = date.toISOString().split("T")[0]
      return appointments.some((apt) => apt.date === dateString && apt.status !== "cancelled")
    },
    [appointments],
  )

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
      return date.getMonth() === currentDate.getMonth()
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

  const deleteAppointment = useCallback(
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
  }, [])

  // const handleReschedule = useCallback(() => {
  //   if (selectedAppointment) {
  //     const rescheduleCheck = canRescheduleAppointment(selectedAppointment)

  //     if (!rescheduleCheck.canReschedule) {
  //       Alert.alert("Reschedule Not Available", rescheduleCheck.reason, [
  //         {
  //           text: "OK",
  //           style: "default",
  //         },
  //       ])
  //       return
  //     }

  //     if (rescheduleCheck.reason) {
  //       Alert.alert("Reschedule Appointment", rescheduleCheck.reason + "\n\nProceed with rescheduling?", [
  //         {
  //           text: "Cancel",
  //           style: "cancel",
  //         },
  //         {
  //           text: "Continue",
  //           onPress: () => {
  //             router.push({
  //               pathname: "/HORSE_OPERATOR/resched",
  //               params: { appointment: JSON.stringify(selectedAppointment) },
  //             })
  //           },
  //         },
  //       ])
  //     } else {
  //       router.push({
  //         pathname: "/HORSE_OPERATOR/resched",
  //         params: { appointment: JSON.stringify(selectedAppointment) },
  //       })
  //     }
  //   }
  // }, [selectedAppointment, canRescheduleAppointment, router])

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case "scheduled":
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
    return status.charAt(0).toUpperCase() + status.slice(1)
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
        {currentUser && (
          <View style={styles.userInfo}>
            <Text style={styles.userText}>
              {currentUser.op_fname} {currentUser.op_lname}
            </Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
                    {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
                      <Text key={day} style={styles.dayHeader}>
                        {day}
                      </Text>
                    ))}
                  </View>

                  <View style={styles.calendarGrid}>
                    {days.map((day, index) => {
                      const hasApt = hasAppointments(day)
                      const isCurrentMonthDay = isCurrentMonth(day)
                      const isTodayDate = isToday(day)
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[styles.dayCell, isTodayDate && styles.todayCell, hasApt && styles.appointmentCell]}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              !isCurrentMonthDay && styles.otherMonthText,
                              isTodayDate && styles.todayText,
                              hasApt && styles.appointmentText,
                            ]}
                          >
                            {day.getDate()}
                          </Text>
                          {hasApt && <View style={styles.appointmentDot} />}
                        </TouchableOpacity>
                      )
                    })}
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
                                <View
                                  style={[styles.statusDot, { backgroundColor: getStatusColor(appointment.status) }]}
                                />
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
                                onPress={() => deleteAppointment(appointment.app_id)}
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
                              <View
                                style={[styles.statusDot, { backgroundColor: getStatusColor(appointment.status) }]}
                              />
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
                              onPress={() => deleteAppointment(appointment.app_id)}
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
            <View style={styles.detailsCard}>
              <View
                style={[styles.appointmentDateBox, { backgroundColor: getStatusColor(selectedAppointment.status) }]}
              >
                <Text style={styles.appointmentDayText}>{getDayAbbreviation(selectedAppointment.date)}</Text>
                <Text style={styles.appointmentDayNumber}>{getDayNumber(selectedAppointment.date)}</Text>
              </View>
              <View style={styles.appointmentSummary}>
                <Text style={styles.horseName}>{selectedAppointment.horseName}</Text>
                <Text style={styles.appointmentDateFull}>{formatAppointmentDate(selectedAppointment.date)}</Text>
                <View style={styles.timeServiceContainer}>
                  <FontAwesome5 name="clock" size={14} color="#666" style={styles.icon} />
                  <Text style={styles.timeServiceText}>
                    {selectedAppointment.time} — {selectedAppointment.service}
                  </Text>
                </View>
                {selectedAppointment.created_at && (
                  <Text style={styles.bookingTime}>Booked: {formatCreationTime(selectedAppointment.created_at)}</Text>
                )}
                <View style={styles.tagsContainer}>
                  <View style={[styles.tag, { backgroundColor: getStatusColor(selectedAppointment.status) + "20" }]}>
                    <Text style={[styles.tagText, { color: getStatusColor(selectedAppointment.status) }]}>
                      {getStatusText(selectedAppointment.status)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <FontAwesome5 name="user-md" size={16} color="#CD853F" style={styles.infoIcon} />
                <Text style={styles.infoLabel}>Vet:</Text>
                <Text style={styles.infoText}>{selectedAppointment.contactName}</Text>
              </View>
              <View style={styles.infoRow}>
                <FontAwesome5 name="clinic-medical" size={16} color="#CD853F" style={styles.infoIcon} />
                <Text style={styles.infoLabel}>Clinic:</Text>
                <Text style={styles.infoText}>Cebu Animal Health Center</Text>
              </View>
              <View style={styles.infoRow}>
                <FontAwesome5 name="map-marker-alt" size={16} color="#CD853F" style={styles.infoIcon} />
                <Text style={styles.infoLabel}>Location:</Text>
                <Text style={styles.infoText}>Salinas Drive, Lahug, Cebu City</Text>
              </View>
              <View style={styles.infoRow}>
                <FontAwesome5 name="phone" size={16} color="#CD853F" style={styles.infoIcon} />
                <Text style={styles.infoText}>0912-345-6789</Text>
              </View>
              <View style={styles.infoRow}>
                <FontAwesome5 name="envelope" size={16} color="#CD853F" style={styles.infoIcon} />
                <Text style={styles.infoText}>contact@cebuvet.com</Text>
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
                    if (rescheduleCheck.canReschedule) {
                      // return (
                      //   // <View>
                      //   //   {rescheduleCheck.reason && (
                      //   //     <View style={styles.rescheduleTimeInfo}>
                      //   //       <FontAwesome5 name="clock" size={14} color="#FF9800" style={styles.timeIcon} />
                      //   //       <Text style={styles.rescheduleTimeText}>{rescheduleCheck.reason}</Text>
                      //   //     </View>
                      //   //   )}
                      //   //   <TouchableOpacity style={styles.rescheduleButton} onPress={handleReschedule}>
                      //   //     <Text style={styles.rescheduleButtonText}>Reschedule</Text>
                      //   //   </TouchableOpacity>
                      //   // </View>
                      // )
                    } else {
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
                  })()}
                </View>
              )}

            {(selectedAppointment.status === "cancelled" || selectedAppointment.status === "declined") && (
              <View style={styles.permanentDeleteSection}>
                <View style={styles.deleteWarningInfo}>
                  <FontAwesome5 name="exclamation-triangle" size={14} color="#f44336" style={styles.timeIcon} />
                  <Text style={styles.deleteWarningText}>
                    This appointment is {selectedAppointment.status}. You can permanently delete it from your records.
                  </Text>
                </View>
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

      <View style={[styles.tabBar, { paddingBottom: safeArea.bottom }]}>
        <TabButton 
          iconName="home" 
          label="Home" 
          tabKey="home" 
          isActive={false}
          onPress={() => router.push("../HORSE_OPERATOR/home" as any)}
        />
        <TabButton
          iconName="horse"
          label="Horse"
          tabKey="horses"
          isActive={false}
          onPress={() => router.push("../HORSE_OPERATOR/horse" as any)}
        />
        <TabButton
          iconName="comment-dots"
          label="Chat"
          tabKey="messages"
          isActive={false}
          onPress={() => router.push("../HORSE_OPERATOR/Hmessage" as any)}
        />
        <TabButton
          iconName="calendar-alt"
          label="Calendar"
          tabKey="bookings"
          isActive={true}
          onPress={() => router.push("../HORSE_OPERATOR/Hcalendar" as any)}
        />
        <TabButton
          iconName="user"
          label="Profile"
          tabKey="profile"
          isActive={false}
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
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 20,
  },
  monthNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  navButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 16,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  dayHeaders: {
    flexDirection: "row",
    marginBottom: 10,
  },
  dayHeader: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
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
  },
  todayCell: {
    backgroundColor: "#CD853F",
    borderRadius: 20,
  },
  appointmentCell: {
    backgroundColor: "#e8f5e8",
    borderRadius: 20,
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
  appointmentText: {
    color: "#2d5a2d",
    fontWeight: "bold",
  },
  appointmentDot: {
    position: "absolute",
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#4CAF50",
  },
  appointmentsSection: {
    paddingHorizontal: 0,
    paddingBottom: 20,
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
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  appointmentBadge: {
    backgroundColor: "#CD853F",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 32,
    alignItems: "center",
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
  divider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#ccc",
    marginHorizontal: 8,
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
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
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
  navItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: verticalScale(4),
    paddingHorizontal: scale(2),
  },
  navIcon: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(2),
  },
  navLabel: {
    fontSize: moderateScale(9),
    color: "#666",
    textAlign: "center",
  },
  activeNavLabel: {
    color: "#CD853F",
    fontWeight: "600",
  },
  activeNavIcon: {
    backgroundColor: "#CD853F",
  },
  detailsCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  appointmentDateBox: {
    width: 80,
    height: 80,
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  appointmentSummary: {
    flex: 1,
  },
  horseName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  appointmentDateFull: {
    fontSize: 16,
    fontWeight: "600",
    color: "#CD853F",
    marginBottom: 8,
  },
  timeServiceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  icon: {
    marginRight: 5,
  },
  timeServiceText: {
    fontSize: 16,
    color: "#666",
  },
  bookingTime: {
    fontSize: 12,
    color: "#888",
    fontStyle: "italic",
    marginBottom: 10,
  },
  tagsContainer: {
    flexDirection: "row",
    gap: 8,
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
  infoLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginRight: 5,
  },
  infoText: {
    fontSize: 16,
    color: "#666",
    flexShrink: 1,
  },
  notesSection: {
    marginBottom: 20,
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
    padding: 15,
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
