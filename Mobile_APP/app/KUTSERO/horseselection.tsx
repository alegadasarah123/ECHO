"use client"

import * as SecureStore from "expo-secure-store"
import { useRouter, useFocusEffect } from "expo-router"
import { useEffect, useState, useCallback } from "react"
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native"

const { width, height } = Dimensions.get("window")

// Enhanced responsive scaling functions
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
  id: string
  name: string
  healthStatus: "Healthy" | "Unhealthy" | "Sick"
  status: string
  image: string  // Changed to string for URL
  breed?: string
  age?: number
  color?: string
  operatorName?: string
  ownerName?: string
  opName?: string
  assignmentStatus?: "available" | "assigned"
  currentAssignmentId?: string
  lastCheckup?: string
  nextCheckup?: string
  assignmentId?: string
  checkedInAt?: string
  checkedOutAt?: string
}

interface UserData {
  id: string
  email: string
  profile?: {
    kutsero_id: string
    kutsero_fname?: string
    kutsero_lname?: string
    kutsero_mname?: string
    kutsero_username?: string
    [key: string]: any
  }
  access_token: string
}

// Backend API configuration
const API_BASE_URL = "http://192.168.101.2:8000/api/kutsero"

// Helper function to test API connectivity
const testAPIConnection = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/test/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })

    if (response.ok) {
      const data = await response.json()
      console.log("Backend connection successful:", data)
      return true
    } else {
      console.error("Backend connection failed:", response.status, response.statusText)
      return false
    }
  } catch (error) {
    console.error("Backend connection error:", error)
    return false
  }
}

export default function HorseSelectionScreen() {
  const router = useRouter()
  const [searchText, setSearchText] = useState("")
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null)
  const [availableHorses, setAvailableHorses] = useState<Horse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAssigning, setIsAssigning] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [statsData, setStatsData] = useState({
    total: 0,
    healthy: 0,
    unhealthy: 0,
    sick: 0,
  })
  const safeArea = getSafeAreaPadding()

  // Load user data and horses on mount
  useEffect(() => {
    loadUserDataAndHorses()
  }, [])

  // Use useFocusEffect for proper screen focus handling
  useFocusEffect(
    useCallback(() => {
      console.log("Screen focused, refreshing data...")
      if (userData) {
        refreshData()
      }
    }, [userData]),
  )

  const loadUserDataAndHorses = async () => {
    try {
      setIsLoading(true)

      // Test API connection first
      console.log("Testing backend connection...")
      const isConnected = await testAPIConnection()
      if (!isConnected) {
        Alert.alert("Connection Error", "Cannot connect to the backend server. Please check if the server is running.")
        return
      }

      // Load user data from SecureStore
      const storedUserData = await SecureStore.getItemAsync("user_data")
      const storedAccessToken = await SecureStore.getItemAsync("access_token")

      if (storedUserData && storedAccessToken) {
        const parsedUserData = JSON.parse(storedUserData)
        const unifiedUserData: UserData = {
          id: parsedUserData.id,
          email: parsedUserData.email,
          profile: parsedUserData.profile,
          access_token: storedAccessToken,
        }
        setUserData(unifiedUserData)
        console.log("User data loaded:", unifiedUserData)

        // Load available horses first, then current assignment
        await loadAvailableHorses()
        await loadCurrentAssignment(unifiedUserData.profile?.kutsero_id || unifiedUserData.id)
      } else {
        Alert.alert("Error", "User session not found. Please login again.")
      }
    } catch (error) {
      console.error("Error loading user data and horses:", error)
      Alert.alert("Error", "Failed to load data. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Updated loadCurrentAssignment function with image URL
  const loadCurrentAssignment = async (kutseroId: string) => {
    try {
      console.log("Loading current assignment for kutsero ID:", kutseroId)
      const response = await fetch(`${API_BASE_URL}/current_assignment/?kutsero_id=${kutseroId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("Current assignment response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("Current assignment data:", data)

        if (data.assignment && data.assignment.horse) {
          const horse: Horse = {
            id: data.assignment.horse.id,
            name: data.assignment.horse.name,
            healthStatus: data.assignment.horse.healthStatus as Horse["healthStatus"],
            status: data.assignment.horse.status,
            image: data.assignment.horse.image || "https://via.placeholder.com/150?text=No+Image",
            breed: data.assignment.horse.breed,
            age: data.assignment.horse.age,
            color: data.assignment.horse.color,
            operatorName:
              data.assignment.horse.operatorName || data.assignment.horse.opName || data.assignment.horse.ownerName,
            ownerName:
              data.assignment.horse.ownerName || data.assignment.horse.opName || data.assignment.horse.operatorName,
            opName: data.assignment.horse.opName,
            assignmentStatus: "assigned",
            currentAssignmentId: data.assignment.assignmentId,
            lastCheckup: data.assignment.horse.lastCheckup,
            nextCheckup: data.assignment.horse.nextCheckup,
          }

          setSelectedHorse(horse)

          // Update the availableHorses array to reflect this assignment
          setAvailableHorses((prevHorses) =>
            prevHorses.map((h) =>
              h.id === horse.id
                ? { ...h, assignmentStatus: "assigned", currentAssignmentId: data.assignment.assignmentId }
                : h,
            ),
          )

          // Save complete horse data structure to SecureStore
          const horseDataToStore = {
            ...horse,
            assignmentId: data.assignment.assignmentId,
            checkedInAt: data.assignment.checkedInAt,
            checkedOutAt: data.assignment.checkedOutAt,
          }

          await SecureStore.setItemAsync("selectedHorseData", JSON.stringify(horseDataToStore))
          await SecureStore.setItemAsync("currentAssignmentId", data.assignment.assignmentId)

          console.log("Current assignment loaded and saved to SecureStore:", horse.name)
        } else {
          // No current assignment
          setSelectedHorse(null)

          // Clear SecureStore
          try {
            await SecureStore.deleteItemAsync("selectedHorseData")
            await SecureStore.deleteItemAsync("currentAssignmentId")
          } catch (clearError) {
            console.log("No data to clear from SecureStore")
          }

          console.log("No current assignment found, cleared SecureStore")
        }
      } else {
        console.log("No current assignment found or error:", response.status)
        setSelectedHorse(null)
        try {
          await SecureStore.deleteItemAsync("selectedHorseData")
          await SecureStore.deleteItemAsync("currentAssignmentId")
        } catch (clearError) {
          console.log("No data to clear from SecureStore")
        }
      }
    } catch (error) {
      console.error("Error loading current assignment:", error)
    }
  }

  const loadAvailableHorses = async () => {
    try {
      console.log("Attempting to fetch horses from:", `${API_BASE_URL}/available_horses/`)

      const response = await fetch(`${API_BASE_URL}/available_horses/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("Response status:", response.status)
      console.log("Response ok:", response.ok)

      if (response.ok) {
        const data = await response.json()
        console.log("Received horses data:", data)

        // Transform horses data with proper image URL mapping
        const horses: Horse[] = data.horses.map((horse: any) => ({
          id: horse.id,
          name: horse.name,
          healthStatus: horse.healthStatus as Horse["healthStatus"],
          status: horse.status,
          image: horse.image || "https://via.placeholder.com/150?text=No+Image",
          breed: horse.breed,
          age: horse.age,
          color: horse.color,
          operatorName: horse.operatorName || horse.opName || horse.ownerName || "Unknown Owner",
          ownerName: horse.ownerName || horse.opName || horse.operatorName || "Unknown Owner",
          opName: horse.opName,
          assignmentStatus: horse.assignmentStatus,
          currentAssignmentId: horse.currentAssignmentId,
          lastCheckup: horse.lastCheckup,
          nextCheckup: horse.nextCheckup,
        }))

        setAvailableHorses(horses)

        // Update stats
        setStatsData({
          total: data.total_count || horses.length,
          healthy: horses.filter((h) => h.healthStatus === "Healthy").length,
          unhealthy: horses.filter((h) => h.healthStatus === "Unhealthy").length,
          sick: horses.filter((h) => h.healthStatus === "Sick").length,
        })
      } else {
        let errorMessage = "Failed to fetch horses"
        try {
          const responseClone = response.clone()
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
          console.error("Server error response:", errorData)
        } catch (e) {
          console.error("Could not parse error response as JSON:", errorMessage)
          try {
            const errorText = await response.text()
            console.error("Raw error response:", errorText)
            errorMessage = `HTTP ${response.status}: ${response.statusText}`
          } catch (textError) {
            console.error("Could not read response as text either")
            errorMessage = `HTTP ${response.status}: ${response.statusText}`
          }
        }
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error("Error loading horses:", error)

      let userMessage = "Failed to load horses. Please try again."

      if (error instanceof TypeError && error.message.includes("fetch")) {
        userMessage =
          "Cannot connect to server. Please check your internet connection and make sure the backend server is running."
      } else if (error instanceof Error) {
        userMessage = error.message
      }

      Alert.alert("Error", userMessage)
    }
  }

  // Add a refresh function that can be called when returning to the screen
  const refreshData = async () => {
    setIsLoading(true)
    try {
      const kutseroId = userData?.profile?.kutsero_id || userData?.id
      if (kutseroId) {
        await loadAvailableHorses()
        await loadCurrentAssignment(kutseroId)
      }
    } catch (error) {
      console.error("Error refreshing data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Updated filtering logic - show ALL horses but handle assignment status in the UI
  const filteredHorses = availableHorses.filter((horse) => {
    const searchLower = searchText.toLowerCase()
    const matchesSearch =
      horse.name.toLowerCase().includes(searchLower) ||
      horse.breed?.toLowerCase().includes(searchLower) ||
      horse.operatorName?.toLowerCase().includes(searchLower) ||
      horse.ownerName?.toLowerCase().includes(searchLower) ||
      horse.opName?.toLowerCase().includes(searchLower)

    return matchesSearch
  })

  const handleHorseSelection = async (horse: Horse) => {
    if (!userData?.profile?.kutsero_id && !userData?.id) {
      Alert.alert("Error", "User information not available")
      return
    }

    // Check if this horse is already assigned to someone else (not the current user)
    if (horse.assignmentStatus === "assigned" && selectedHorse?.id !== horse.id) {
      Alert.alert(
        "Horse Unavailable",
        "This horse is currently assigned to another kutsero. Please select a different horse.",
      )
      return
    }

    Alert.alert("Confirm Selection", "Are you sure you want to select this horse?", [
      { text: "Cancel", style: "cancel" },
      { text: "OK", onPress: () => proceedWithHorseSelection(horse) },
    ])
  }

  const proceedWithHorseSelection = async (horse: Horse) => {
    // If user already has a horse assigned and it's different from the selected one
    if (selectedHorse && selectedHorse.id !== horse.id) {
      Alert.alert(
        "Switch Horse Assignment",
        `You currently have ${selectedHorse.name} assigned. Selecting ${horse.name} will automatically end your current assignment and start a new one. Do you want to continue?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Switch Horse", onPress: () => performHorseAssignment(horse) },
        ],
      )
    } else if (selectedHorse && selectedHorse.id === horse.id) {
      // User clicked on their currently assigned horse - no action needed
      Alert.alert("Already Assigned", `${horse.name} is already assigned to you.`)
    } else {
      // No current assignment, proceed directly
      performHorseAssignment(horse)
    }
  }

  // Updated performHorseAssignment to properly handle state updates
  const performHorseAssignment = async (horse: Horse) => {
    setIsAssigning(true)

    try {
      const kutseroId = userData?.profile?.kutsero_id || userData?.id
      console.log("Assigning horse:", horse.name, "to kutsero:", kutseroId)

      // Store the previous horse ID before assignment
      const previousHorseId = selectedHorse?.id

      const assignmentData = {
        kutsero_id: kutseroId,
        horse_id: horse.id,
        date_start: new Date().toISOString(),
        force_switch: true,
      }

      console.log("Creating assignment with data:", assignmentData)

      const response = await fetch(`${API_BASE_URL}/assign_horse/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(assignmentData),
      })

      console.log("Assignment response status:", response.status)

      if (response.ok) {
        const result = await response.json()
        console.log("Assignment successful:", result)

        // Create the updated horse object from API response
        const updatedHorse: Horse = {
          id: result.horse.id,
          name: result.horse.name,
          healthStatus: result.horse.healthStatus as Horse["healthStatus"],
          status: result.horse.status,
          image: result.horse.image || "https://via.placeholder.com/150?text=No+Image",
          breed: result.horse.breed,
          age: result.horse.age,
          color: result.horse.color,
          operatorName: result.horse.operatorName || result.horse.opName || result.horse.ownerName,
          ownerName: result.horse.ownerName || result.horse.opName || result.horse.operatorName,
          opName: result.horse.opName,
          assignmentStatus: "assigned",
          currentAssignmentId: result.assignment.assign_id,
          lastCheckup: result.horse.lastCheckup,
          nextCheckup: result.horse.nextCheckup,
        }

        // Update state properly
        setSelectedHorse(updatedHorse)

        // Update the availableHorses array to reflect the assignment changes
        setAvailableHorses((prevHorses) =>
          prevHorses.map((h) => {
            if (h.id === horse.id) {
              // Mark the newly selected horse as assigned
              return { ...h, assignmentStatus: "assigned", currentAssignmentId: result.assignment.assign_id }
            } else if (previousHorseId && h.id === previousHorseId) {
              // Mark the previously assigned horse as available again
              return { ...h, assignmentStatus: "available", currentAssignmentId: undefined }
            }
            return h
          }),
        )

        // Save complete horse data structure to SecureStore
        const horseDataToStore = {
          ...updatedHorse,
          assignmentId: result.assignment.assign_id,
          checkedInAt: result.assignment.date_start,
          checkedOutAt: result.assignment.date_end,
        }

        await SecureStore.setItemAsync("selectedHorseData", JSON.stringify(horseDataToStore))
        await SecureStore.setItemAsync("currentAssignmentId", result.assignment.assign_id)

        console.log("Horse assignment saved to SecureStore:", updatedHorse.name)

        const switchMessage =
          result.previous_assignments_ended > 0
            ? `Your previous assignment has been ended automatically. ${horse.name} is now assigned to you for work.`
            : `${horse.name} has been assigned to you for work.`

        Alert.alert("Horse Assigned Successfully", switchMessage, [
          {
            text: "OK",
            onPress: () => {
              console.log("Navigating back after successful assignment")
              router.back()
            },
          },
        ])
      } else {
        const errorData = await response.json()
        console.error("Assignment failed:", errorData)

        if (errorData.error?.includes("already assigned to another kutsero")) {
          Alert.alert(
            "Assignment Failed",
            "This horse is currently assigned to another kutsero. Please select a different horse.",
          )
        } else {
          Alert.alert("Assignment Failed", errorData.error || "Failed to assign horse")
        }
      }
    } catch (error) {
      console.error("Error assigning horse:", error)
      Alert.alert("Error", "Failed to assign horse. Please check your connection and try again.")
    } finally {
      setIsAssigning(false)
    }
  }

  const getHealthStatusColor = (status: Horse["healthStatus"]) => {
    switch (status) {
      case "Healthy":
        return "#4CAF50"
      case "Unhealthy":
        return "#FF9800"
      case "Sick":
        return "#F44336"
      default:
        return "#666"
    }
  }

  // Helper function to get owner name with fallback
  const getOwnerName = (horse: Horse) => {
    return horse.operatorName || horse.ownerName || horse.opName || "Unknown Owner"
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />
        <ActivityIndicator size="large" color="white" />
        <Text style={styles.loadingText}>Loading horses...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: safeArea.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              console.log("Back button pressed, navigating back")
              router.back()
            }}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Horse</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={refreshData}>
            <Text style={styles.refreshButtonText}>↻</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search horses by name, breed, or owner..."
            placeholderTextColor="#999"
          />
          <TouchableOpacity style={styles.searchButton}>
            <Image
              source={require("../../assets/images/search.png")}
              style={[styles.searchIconImage, { tintColor: "#666" }]}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{statsData.total}</Text>
            <Text style={styles.statLabel}>Total Horses</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#4CAF50" }]}>{statsData.healthy}</Text>
            <Text style={styles.statLabel}>Healthy</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#FF9800" }]}>{statsData.unhealthy}</Text>
            <Text style={styles.statLabel}>Unhealthy</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#F44336" }]}>{statsData.sick}</Text>
            <Text style={styles.statLabel}>Sick</Text>
          </View>
        </View>

        {/* Current Selection */}
        {selectedHorse && (
          <View style={styles.currentSelectionContainer}>
            <Text style={styles.currentSelectionTitle}>Currently Assigned</Text>
            <View style={styles.currentSelectionCard}>
              <View style={styles.currentHorseAvatar}>
                <Image
                  source={{ uri: selectedHorse.image }}
                  style={styles.currentHorseIconImage}
                  resizeMode="cover"
                />
              </View>
              <View style={styles.currentHorseInfo}>
                <Text style={styles.currentHorseName}>{selectedHorse.name}</Text>
                <Text style={styles.currentHorseBreed}>
                  {selectedHorse.breed} • {selectedHorse.age} years
                </Text>
                <Text style={styles.currentHorseOperator}>Owner: {getOwnerName(selectedHorse)}</Text>
                <View style={styles.currentHorseHealthRow}>
                  <View
                    style={[
                      styles.currentHorseHealthDot,
                      { backgroundColor: getHealthStatusColor(selectedHorse.healthStatus) },
                    ]}
                  />
                  <Text
                    style={[styles.currentHorseHealthText, { color: getHealthStatusColor(selectedHorse.healthStatus) }]}
                  >
                    {selectedHorse.healthStatus}
                  </Text>
                </View>
              </View>
              <View style={styles.currentSelectedIndicator}>
                <Text style={styles.currentSelectedIndicatorText}>✓</Text>
              </View>
            </View>
          </View>
        )}

        {/* Available Horses List */}
        <View style={styles.horsesListContainer}>
          <Text style={styles.horsesListTitle}>All Horses ({filteredHorses.length})</Text>

          <ScrollView
            style={styles.horsesList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.horsesListContent}
          >
            {filteredHorses.map((horse) => {
              // Determine if this horse is assigned to someone else (not current user)
              const isAssignedToOther = horse.assignmentStatus === "assigned" && selectedHorse?.id !== horse.id
              const isCurrentlySelected = selectedHorse?.id === horse.id

              return (
                <TouchableOpacity
                  key={horse.id}
                  style={[
                    styles.horseItem,
                    isCurrentlySelected && styles.selectedHorseItem,
                    isAssignedToOther && styles.unavailableHorseItem,
                  ]}
                  onPress={() => handleHorseSelection(horse)}
                  activeOpacity={0.7}
                  disabled={isAssigning}
                >
                  <View style={styles.horseAvatar}>
                    <Image
                      source={{ uri: horse.image }}
                      style={styles.horseIconImage}
                      resizeMode="cover"
                    />
                  </View>
                  <View style={styles.horseInfo}>
                    <View style={styles.horseHeader}>
                      <Text style={[styles.horseName, isAssignedToOther && styles.unavailableText]}>{horse.name}</Text>
                      {isAssignedToOther && (
                        <View style={styles.assignedBadge}>
                          <Text style={styles.assignedBadgeText}>Assigned</Text>
                        </View>
                      )}
                      {isCurrentlySelected && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>Current</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.horseBreed, isAssignedToOther && styles.unavailableText]}>
                      {horse.breed} • {horse.age} years old
                    </Text>
                    <Text style={[styles.horseOperator, isAssignedToOther && styles.unavailableText]}>
                      Owner: {getOwnerName(horse)}
                    </Text>
                    <View style={styles.horseHealthRow}>
                      <View
                        style={[styles.horseHealthDot, { backgroundColor: getHealthStatusColor(horse.healthStatus) }]}
                      />
                      <Text style={[styles.horseHealthText, { color: getHealthStatusColor(horse.healthStatus) }]}>
                        {horse.healthStatus}
                      </Text>
                      <Text style={styles.horseSeparator}>•</Text>
                      <Text style={[styles.horseStatus, isAssignedToOther && styles.unavailableText]}>
                        {horse.status}
                      </Text>
                    </View>
                    <Text style={[styles.horseCheckup, isAssignedToOther && styles.unavailableText]}>
                      Last checkup: {horse.lastCheckup}
                    </Text>
                  </View>
                  <View style={styles.selectIndicator}>
                    {isCurrentlySelected ? (
                      <View style={styles.selectedIndicator}>
                        <Text style={styles.selectedIndicatorText}>✓</Text>
                      </View>
                    ) : isAssignedToOther ? (
                      <View style={styles.assignedIndicator}>
                        <Text style={styles.assignedIndicatorText}>×</Text>
                      </View>
                    ) : (
                      <View style={styles.unselectedIndicator} />
                    )}
                  </View>
                </TouchableOpacity>
              )
            })}
            {filteredHorses.length === 0 && (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>No horses found</Text>
                <Text style={styles.noResultsSubtext}>
                  {searchText ? "Try adjusting your search terms" : "No horses available"}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Loading Overlay */}
      {isAssigning && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#C17A47" />
            <Text style={styles.loadingOverlayText}>Assigning horse...</Text>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#C17A47",
  },
  loadingText: {
    color: "white",
    fontSize: moderateScale(16),
    fontWeight: "500",
    marginTop: verticalScale(10),
  },
  header: {
    backgroundColor: "#C17A47",
    paddingHorizontal: scale(16),
    paddingBottom: dynamicSpacing(16),
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(16),
  },
  backButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    color: "white",
    fontSize: moderateScale(18),
    fontWeight: "bold",
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "white",
    textAlign: "center",
  },
  refreshButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  refreshButtonText: {
    color: "white",
    fontSize: moderateScale(18),
    fontWeight: "bold",
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
  searchIconImage: {
    width: scale(16),
    height: scale(16),
  },
  content: {
    flex: 1,
    backgroundColor: "white",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: scale(16),
    paddingVertical: dynamicSpacing(16),
    backgroundColor: "#C17A47",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: moderateScale(18),
    fontWeight: "bold",
    color: "white",
    marginBottom: verticalScale(2),
  },
  statLabel: {
    fontSize: moderateScale(10),
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  currentSelectionContainer: {
    backgroundColor: "#F8F9FA",
    paddingHorizontal: scale(16),
    paddingVertical: dynamicSpacing(12),
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  currentSelectionTitle: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(8),
  },
  currentSelectionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    borderRadius: scale(8),
    borderWidth: 2,
    borderColor: "#C17A47",
  },
  currentHorseAvatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(12),
    overflow: "hidden",
  },
  currentHorseIconImage: {
    width: "100%",
    height: "100%",
  },
  currentHorseInfo: {
    flex: 1,
  },
  currentHorseName: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(2),
  },
  currentHorseBreed: {
    fontSize: moderateScale(11),
    color: "#666",
    marginBottom: verticalScale(2),
  },
  currentHorseOperator: {
    fontSize: moderateScale(10),
    color: "#999",
    marginBottom: verticalScale(2),
  },
  currentHorseHealthRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  currentHorseHealthDot: {
    width: scale(4),
    height: scale(4),
    borderRadius: scale(2),
    marginRight: scale(4),
  },
  currentHorseHealthText: {
    fontSize: moderateScale(10),
    fontWeight: "500",
  },
  currentSelectedIndicator: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: "#C17A47",
    justifyContent: "center",
    alignItems: "center",
  },
  currentSelectedIndicatorText: {
    color: "white",
    fontSize: moderateScale(12),
    fontWeight: "bold",
  },
  horsesListContainer: {
    flex: 1,
    paddingHorizontal: scale(16),
    paddingTop: dynamicSpacing(16),
  },
  horsesListTitle: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(12),
  },
  horsesList: {
    flex: 1,
  },
  horsesListContent: {
    paddingBottom: dynamicSpacing(20),
  },
  horseItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(12),
    borderRadius: scale(8),
    marginBottom: verticalScale(8),
    backgroundColor: "#F8F8F8",
    borderWidth: 1,
    borderColor: "transparent",
  },
  selectedHorseItem: {
    backgroundColor: "#E8F5E8",
    borderColor: "#C17A47",
  },
  unavailableHorseItem: {
    backgroundColor: "#F0F0F0",
    opacity: 0.7,
  },
  horseAvatar: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(12),
    overflow: "hidden",
  },
  horseIconImage: {
    width: "100%",
    height: "100%",
  },
  horseInfo: {
    flex: 1,
  },
  horseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(2),
  },
  horseName: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  unavailableText: {
    color: "#999",
  },
  assignedBadge: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: scale(10),
    marginLeft: scale(8),
  },
  assignedBadgeText: {
    color: "white",
    fontSize: moderateScale(9),
    fontWeight: "600",
  },
  currentBadge: {
    backgroundColor: "#C17A47",
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: scale(10),
    marginLeft: scale(8),
  },
  currentBadgeText: {
    color: "white",
    fontSize: moderateScale(9),
    fontWeight: "600",
  },
  horseBreed: {
    fontSize: moderateScale(12),
    color: "#666",
    marginBottom: verticalScale(2),
  },
  horseOperator: {
    fontSize: moderateScale(11),
    color: "#999",
    marginBottom: verticalScale(4),
  },
  horseHealthRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(2),
  },
  horseHealthDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    marginRight: scale(6),
  },
  horseHealthText: {
    fontSize: moderateScale(11),
    fontWeight: "500",
    marginRight: scale(6),
  },
  horseSeparator: {
    fontSize: moderateScale(11),
    color: "#999",
    marginRight: scale(6),
  },
  horseStatus: {
    fontSize: moderateScale(11),
    color: "#666",
  },
  horseCheckup: {
    fontSize: moderateScale(10),
    color: "#999",
  },
  selectIndicator: {
    marginLeft: scale(8),
  },
  selectedIndicator: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: "#C17A47",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedIndicatorText: {
    color: "white",
    fontSize: moderateScale(14),
    fontWeight: "bold",
  },
  assignedIndicator: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: "#FF6B6B",
    justifyContent: "center",
    alignItems: "center",
  },
  assignedIndicatorText: {
    color: "white",
    fontSize: moderateScale(16),
    fontWeight: "bold",
  },
  unselectedIndicator: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    borderWidth: 2,
    borderColor: "#E0E0E0",
    backgroundColor: "white",
  },
  noResultsContainer: {
    alignItems: "center",
    paddingVertical: verticalScale(40),
  },
  noResultsText: {
    fontSize: moderateScale(16),
    color: "#666",
    fontWeight: "500",
    marginBottom: verticalScale(8),
  },
  noResultsSubtext: {
    fontSize: moderateScale(14),
    color: "#999",
    textAlign: "center",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    backgroundColor: "white",
    paddingHorizontal: scale(30),
    paddingVertical: verticalScale(20),
    borderRadius: scale(10),
    alignItems: "center",
  },
  loadingOverlayText: {
    fontSize: moderateScale(14),
    color: "#333",
    marginTop: verticalScale(10),
  },
})