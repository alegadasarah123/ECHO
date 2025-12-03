"use client"

import { useFocusEffect, useRouter } from "expo-router"
import * as SecureStore from "expo-secure-store"
import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  Image,
} from "react-native"
import FontAwesome5 from '@expo/vector-icons/FontAwesome5'

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
  healthStatus: "Healthy" | "Sick" | "Deceased"
  status: string
  image: string
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
  alive?: boolean
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
const API_BASE_URL = "http://192.168.31.58:8000/api/kutsero"

// Helper function to fix image URLs - IMPORTANT FIX
const cleanImageUrl = (url: string | undefined): string => {
  if (!url || url === "" || url === "null" || url === "undefined") {
    // Return a data URI for a simple placeholder to avoid network request
    return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNGMEYwRjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IlN5c3RlbSIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=="
  }
  
  // Debug log to see what we're getting
  console.log("DEBUG cleanImageUrl input:", url)
  
  // Remove any query parameters first
  let cleanUrl = url.split('?')[0]
  
  // The base storage path
  const baseStoragePath = "https://drgknejiqupegkyxfaab.supabase.co/storage/v1/object/public/horse_image/"
  
  // Check if the URL already contains the full base storage path
  if (cleanUrl.includes(baseStoragePath)) {
    console.log("DEBUG: URL contains base path, cleaning...")
    
    // Count how many times the base path appears
    const count = (cleanUrl.match(new RegExp(baseStoragePath, 'g')) || []).length
    
    if (count > 1) {
      console.log("DEBUG: Base path appears multiple times, fixing...")
      // Find the last occurrence and take everything after it
      const lastIndex = cleanUrl.lastIndexOf(baseStoragePath)
      const actualPath = cleanUrl.substring(lastIndex + baseStoragePath.length)
      cleanUrl = baseStoragePath + actualPath
      console.log("DEBUG: Fixed URL:", cleanUrl)
    }
  } else if (!cleanUrl.startsWith('http')) {
    // If it's not a full URL and doesn't have the base path, add it
    cleanUrl = baseStoragePath + (cleanUrl.startsWith('/') ? cleanUrl.substring(1) : cleanUrl)
  }
  
  return cleanUrl
}

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

// Filter types
type FilterType = "all" | "healthy" | "sick" | "deceased" | "available" | "assigned"

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
    sick: 0,
    deceased: 0,
  })
  const [filterModalVisible, setFilterModalVisible] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all")
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null)
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
        console.log("DEBUG: Received horses data:", data)
        
        // Debug: Check what images are being received
        if (data.horses && data.horses.length > 0) {
          console.log("DEBUG: First horse data:", {
            id: data.horses[0].id,
            name: data.horses[0].name,
            image: data.horses[0].image,
            hasImage: !!data.horses[0].image,
            imageType: typeof data.horses[0].image,
            cleanedImage: cleanImageUrl(data.horses[0].image),
          })
        }

        // Transform horses data with proper health status mapping
        const horses: Horse[] = data.horses.map((horse: any) => {
          console.log(`DEBUG Horse ${horse.id}:`, {
            name: horse.name,
            image: horse.image,
            cleanedImage: cleanImageUrl(horse.image),
          })
          
          return {
            id: horse.id,
            name: horse.name,
            healthStatus: horse.healthStatus === "Unhealthy" ? "Sick" : (horse.healthStatus as Horse["healthStatus"]),
            status: horse.status,
            image: cleanImageUrl(horse.image),
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
            alive: horse.alive !== false,
          }
        })

        console.log("DEBUG: Processed horses count:", horses.length)
        console.log("DEBUG: First processed horse:", {
          name: horses[0]?.name,
          image: horses[0]?.image,
        })

        setAvailableHorses(horses)

        // Update stats (removed unhealthy count)
        const deceasedCount = horses.filter((h) => h.alive === false || h.healthStatus === "Deceased").length
        const sickCount = horses.filter((h) => h.alive !== false && h.healthStatus === "Sick").length
        const healthyCount = horses.filter((h) => h.alive !== false && h.healthStatus === "Healthy").length
        
        setStatsData({
          total: data.total_count || horses.length,
          healthy: healthyCount,
          sick: sickCount,
          deceased: deceasedCount,
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
            image: cleanImageUrl(data.assignment.horse.image),
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
            alive: data.assignment.horse.alive !== false, // Default to true if not specified
          }

          setSelectedHorse(horse)

          // Update the availableHorses array to reflect this assignment
          setAvailableHorses((prevHorses) =>
            prevHorses.map((h) =>
              h.id === horse.id
                ? { 
                    ...h, 
                    assignmentStatus: "assigned", 
                    currentAssignmentId: data.assignment.assignmentId,
                    // Use the cleaned image
                    image: horse.image
                  }
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

  // Filter horses based on selected filter and search text
  const filteredHorses = availableHorses.filter((horse) => {
    // First check if horse matches the selected filter
    let matchesFilter = true
    const isAlive = horse.alive !== false // Handle undefined case
    
    if (selectedFilter !== "all") {
      switch (selectedFilter) {
        case "healthy":
          matchesFilter = isAlive && horse.healthStatus === "Healthy"
          break
        case "sick":
          matchesFilter = isAlive && horse.healthStatus === "Sick"
          break
        case "deceased":
          matchesFilter = !isAlive || horse.healthStatus === "Deceased"
          break
        case "available":
          matchesFilter = horse.assignmentStatus !== "assigned" && isAlive
          break
        case "assigned":
          matchesFilter = horse.assignmentStatus === "assigned"
          break
      }
    }

    if (!matchesFilter) return false

    // Then check if horse matches the search text
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
    // Check if horse is deceased or not alive
    if (horse.alive === false || horse.healthStatus === "Deceased") {
      Alert.alert(
        "Horse Unavailable",
        "This horse is deceased and cannot be selected. Please select a different horse.",
      )
      return
    }

    // NEW CHECK: Prevent selection of sick horses
    if (horse.healthStatus === "Sick") {
      Alert.alert(
        "Horse Requires Medical Care",
        "This horse is sick and needs medical attention. Please select a healthy horse for work.",
      )
      return
    }

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
          healthStatus: result.horse.healthStatus === "Unhealthy" ? "Sick" : result.horse.healthStatus as Horse["healthStatus"],
          status: result.horse.status,
          // Use the cleaned image from the API response
          image: cleanImageUrl(result.horse.image),
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
          alive: result.horse.alive !== false,
        }

        // Update state properly
        setSelectedHorse(updatedHorse)

        // Update the availableHorses array to reflect the assignment changes
        setAvailableHorses((prevHorses) =>
          prevHorses.map((h) => {
            if (h.id === horse.id) {
              // Mark the newly selected horse as assigned
              return { 
                ...h, 
                assignmentStatus: "assigned", 
                currentAssignmentId: result.assignment.assign_id,
                // Use the cleaned image
                image: updatedHorse.image
              }
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

  const getHealthStatusColor = (status: Horse["healthStatus"], isAlive: boolean = true) => {
    if (isAlive === false) return "#999999"
    
    switch (status) {
      case "Healthy":
        return "#4CAF50"
      case "Sick":
        return "#F44336"
      case "Deceased":
        return "#999999"
      default:
        return "#666"
    }
  }

  // Helper function to get owner name with fallback
  const getOwnerName = (horse: Horse) => {
    return horse.operatorName || horse.ownerName || horse.opName || "Unknown Owner"
  }

  // Get filter label
  const getFilterLabel = (filter: FilterType) => {
    switch (filter) {
      case "all": return "All Horses"
      case "healthy": return "Healthy"
      case "sick": return "Sick"
      case "deceased": return "Deceased"
      case "available": return "Available"
      case "assigned": return "Assigned"
      default: return "All Horses"
    }
  }

  // Render filter modal
  const renderFilterModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={filterModalVisible}
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Horses</Text>
            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.filterList}>
            {["all", "healthy", "sick", "deceased", "available", "assigned"].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterItem,
                  selectedFilter === filter && styles.filterItemSelected,
                ]}
                onPress={() => {
                  setSelectedFilter(filter as FilterType)
                  setFilterModalVisible(false)
                }}
              >
                <Text style={[
                  styles.filterItemText,
                  selectedFilter === filter && styles.filterItemTextSelected,
                ]}>
                  {getFilterLabel(filter as FilterType)}
                </Text>
                {selectedFilter === filter && (
                  <Text style={styles.filterItemCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <TouchableOpacity
            style={styles.clearFilterButton}
            onPress={() => {
              setSelectedFilter("all")
              setFilterModalVisible(false)
            }}
          >
            <Text style={styles.clearFilterText}>Clear Filter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )

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
          {/* Back button without circle */}
          <TouchableOpacity
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
            <Text style={styles.searchIconText}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Indicator - Moved here from below the search */}
        {selectedFilter !== "all" && (
          <View style={styles.filterIndicator}>
            <Text style={styles.filterIndicatorText}>
              Filter: {getFilterLabel(selectedFilter)}
            </Text>
            <TouchableOpacity onPress={() => setSelectedFilter("all")}>
              <Text style={styles.filterClearText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{statsData.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#4CAF50" }]}>{statsData.healthy}</Text>
            <Text style={styles.statLabel}>Healthy</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#F44336" }]}>{statsData.sick}</Text>
            <Text style={styles.statLabel}>Sick</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#999999" }]}>{statsData.deceased}</Text>
            <Text style={styles.statLabel}>Deceased</Text>
          </View>
        </View>

        {/* Current Selection */}
        {selectedHorse && (
          <View style={styles.currentSelectionContainer}>
            <Text style={styles.currentSelectionTitle}>Currently Assigned</Text>
            <View style={styles.currentSelectionCard}>
              <TouchableOpacity
                style={styles.currentHorseAvatar}
                onPress={() => {
                  if (selectedHorse.image) {
                    setFullScreenImage(selectedHorse.image)
                  }
                }}
                activeOpacity={0.9}
              >
                <Image 
                  source={{ uri: selectedHorse.image }} 
                  style={styles.horseImage}
                  resizeMode="cover"
                  onError={(e) => console.log("Failed to load selected horse image:", e.nativeEvent.error)}
                />
              </TouchableOpacity>
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
                      { 
                        backgroundColor: getHealthStatusColor(
                          selectedHorse.healthStatus,
                          selectedHorse.alive !== false
                        ) 
                      },
                    ]}
                  />
                  <Text
                    style={[styles.currentHorseHealthText, { 
                      color: getHealthStatusColor(
                        selectedHorse.healthStatus,
                        selectedHorse.alive !== false
                      ) 
                    }]}
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

        {/* Available Horses List with Filter Header */}
        <View style={styles.horsesListContainer}>
          <View style={styles.listHeader}>
            <Text style={styles.horsesListTitle}>
              {getFilterLabel(selectedFilter)} ({filteredHorses.length})
            </Text>
            <TouchableOpacity 
              style={[
                styles.filterHeaderButton,
                selectedFilter !== "all" && styles.filterHeaderButtonActive
              ]}
              onPress={() => setFilterModalVisible(true)}
            >
              <FontAwesome5 name="filter" size={16} color={selectedFilter !== "all" ? "#C17A47" : "#666"} />
              <Text style={[
                styles.filterHeaderText,
                selectedFilter !== "all" && styles.filterHeaderTextActive
              ]}>
                Filter
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.horsesList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.horsesListContent}
          >
            {filteredHorses.map((horse) => {
              // Determine horse statuses with proper type handling
              const isAlive = horse.alive !== false
              const isDeceased = !isAlive || horse.healthStatus === "Deceased"
              const isSick = isAlive && horse.healthStatus === "Sick" // NEW: Check if horse is sick
              const isAssignedToOther = horse.assignmentStatus === "assigned" && selectedHorse?.id !== horse.id
              const isCurrentlySelected = selectedHorse?.id === horse.id
              const isSelectable = !isDeceased && !isSick && !isAssignedToOther // NEW: Sick horses are not selectable

              return (
                <TouchableOpacity
                  key={horse.id}
                  style={[
                    styles.horseItem,
                    isCurrentlySelected && styles.selectedHorseItem,
                    !isSelectable && styles.unavailableHorseItem, // Updated: includes sick horses
                    isSick && styles.sickHorseItem, // NEW: Specific style for sick horses
                    isDeceased && styles.deceasedHorseItem,
                  ]}
                  onPress={() => isSelectable && handleHorseSelection(horse)}
                  activeOpacity={isSelectable ? 0.7 : 1}
                  disabled={isAssigning || !isSelectable}
                >
                  <TouchableOpacity
                    style={[
                      styles.horseAvatar,
                      isDeceased && styles.deceasedAvatar,
                      isSick && styles.sickAvatar, // NEW: Style for sick horse avatar
                    ]}
                    onPress={() => {
                      if (horse.image) {
                        setFullScreenImage(horse.image)
                      }
                    }}
                    activeOpacity={0.9}
                  >
                    <Image 
                      source={{ uri: horse.image }} 
                      style={styles.horseImage}
                      resizeMode="cover"
                      onError={(e) => console.log(`Failed to load image for ${horse.name}:`, e.nativeEvent.error)}
                    />
                    {isDeceased && (
                      <View style={styles.deceasedOverlay}>
                        <Text style={styles.deceasedOverlayText}>✝</Text>
                      </View>
                    )}
                    {isSick && !isDeceased && ( // NEW: Overlay for sick horses
                      <View style={styles.sickOverlay}>
                        <Text style={styles.sickOverlayText}>⚠</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <View style={styles.horseInfo}>
                    <View style={styles.horseHeader}>
                      <Text style={[
                        styles.horseName,
                        !isSelectable && styles.unavailableText,
                        isDeceased && styles.deceasedText,
                        isSick && styles.sickText, // NEW: Style for sick horse name
                      ]}>
                        {horse.name}
                      </Text>
                      {isDeceased && (
                        <View style={styles.deceasedBadge}>
                          <Text style={styles.deceasedBadgeText}>Deceased</Text>
                        </View>
                      )}
                      {isSick && !isDeceased && ( // NEW: Sick badge
                        <View style={styles.sickBadge}>
                          <Text style={styles.sickBadgeText}>Sick</Text>
                        </View>
                      )}
                      {isAssignedToOther && !isDeceased && !isSick && (
                        <View style={styles.assignedBadge}>
                          <Text style={styles.assignedBadgeText}>Assigned</Text>
                        </View>
                      )}
                      {isCurrentlySelected && isSelectable && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>Current</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[
                      styles.horseBreed,
                      !isSelectable && styles.unavailableText,
                      isDeceased && styles.deceasedText,
                      isSick && styles.sickText, // NEW: Style for sick horse breed
                    ]}>
                      {horse.breed} • {horse.age} years old
                    </Text>
                    <Text style={[
                      styles.horseOperator,
                      !isSelectable && styles.unavailableText,
                      isDeceased && styles.deceasedText,
                      isSick && styles.sickText, // NEW: Style for sick horse owner
                    ]}>
                      Owner: {getOwnerName(horse)}
                    </Text>
                    <View style={styles.horseHealthRow}>
                      <View
                        style={[
                          styles.horseHealthDot, 
                          { 
                            backgroundColor: getHealthStatusColor(
                              horse.healthStatus,
                              isAlive
                            ) 
                          }
                        ]}
                      />
                      <Text style={[
                        styles.horseHealthText, 
                        { 
                          color: getHealthStatusColor(
                            horse.healthStatus,
                            isAlive
                          ) 
                        }
                      ]}>
                        {horse.healthStatus}
                      </Text>
                      {!isDeceased && !isSick && ( // NEW: Don't show status for sick horses
                        <>
                          <Text style={styles.horseSeparator}>•</Text>
                          <Text style={[styles.horseStatus, !isSelectable && styles.unavailableText]}>
                            {horse.status}
                          </Text>
                        </>
                      )}
                      {isSick && ( // NEW: Show medical care message for sick horses
                        <>
                          <Text style={styles.horseSeparator}>•</Text>
                          <Text style={styles.sickStatusText}>
                            Needs Medical Care
                          </Text>
                        </>
                      )}
                    </View>
                    <Text style={[
                      styles.horseCheckup,
                      !isSelectable && styles.unavailableText,
                      isDeceased && styles.deceasedText,
                      isSick && styles.sickText, // NEW: Style for sick horse checkup
                    ]}>
                      {isDeceased ? "Deceased" : 
                       isSick ? "Requires medical attention" : // NEW: Different message for sick horses
                       `Last checkup: ${horse.lastCheckup}`}
                    </Text>
                  </View>
                  <View style={styles.selectIndicator}>
                    {isDeceased ? (
                      <View style={styles.deceasedIndicator}>
                        <Text style={styles.deceasedIndicatorText}>✝</Text>
                      </View>
                    ) : isSick ? ( // NEW: Indicator for sick horses
                      <View style={styles.sickIndicator}>
                        <Text style={styles.sickIndicatorText}>⚠</Text>
                      </View>
                    ) : isCurrentlySelected ? (
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
                  {searchText ? "Try adjusting your search terms" : "No horses available with current filter"}
                </Text>
                <TouchableOpacity
                  style={styles.clearFiltersButton}
                  onPress={() => {
                    setSelectedFilter("all")
                    setSearchText("")
                  }}
                >
                  <Text style={styles.clearFiltersText}>Clear Filters</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Filter Modal */}
      {renderFilterModal()}

      {/* Full Screen Image Modal (like dashboard) */}
      <Modal
        visible={fullScreenImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullScreenImage(null)}
      >
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity style={styles.fullScreenCloseButton} onPress={() => setFullScreenImage(null)}>
            <Text style={styles.fullScreenCloseText}>✕</Text>
          </TouchableOpacity>
          {fullScreenImage && (
            <Image source={{ uri: fullScreenImage }} style={styles.fullScreenImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

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
  // Back button without circle
  backButtonText: {
    color: "white",
    fontSize: moderateScale(30),
    fontWeight: "300",
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "white",
    textAlign: "center",
    flex: 1,
  },
  refreshButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  refreshButtonText: {
    color: "white",
    fontSize: moderateScale(24),
    fontWeight: "bold",
    textAlignVertical: "center",
    lineHeight: moderateScale(24),
    includeFontPadding: false,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    height: verticalScale(48),
    minHeight: 48,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(15),
    color: "#333",
    paddingVertical: 0,
    fontFamily: "System",
  },
  searchButton: {
    padding: scale(4),
    marginLeft: scale(8),
  },
  searchIconText: {
    fontSize: moderateScale(18),
    color: "#666",
  },
  filterIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.2)",
    marginTop: verticalScale(12),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    alignSelf: "flex-start",
  },
  filterIndicatorText: {
    color: "white",
    fontSize: moderateScale(12),
    fontWeight: "500",
  },
  filterClearText: {
    color: "white",
    fontSize: moderateScale(14),
    fontWeight: "bold",
    marginLeft: scale(12),
    paddingHorizontal: scale(4),
  },
  content: {
    flex: 1,
    backgroundColor: "white",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: scale(16),
    paddingVertical: dynamicSpacing(20),
    backgroundColor: "#C17A47",
    justifyContent: "space-around",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  statNumber: {
    fontSize: moderateScale(20),
    fontWeight: "bold",
    color: "white",
    marginBottom: verticalScale(4),
  },
  statLabel: {
    fontSize: moderateScale(11),
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    fontWeight: "500",
  },
  currentSelectionContainer: {
    backgroundColor: "#F8F9FA",
    paddingHorizontal: scale(16),
    paddingVertical: dynamicSpacing(16),
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  currentSelectionTitle: {
    fontSize: moderateScale(15),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(12),
    fontFamily: "System",
  },
  currentSelectionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    borderRadius: scale(12),
    borderWidth: 2,
    borderColor: "#C17A47",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  currentHorseAvatar: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(16),
    overflow: "hidden",
  },
  horseImage: {
    width: '100%',
    height: '100%',
  },
  currentHorseInfo: {
    flex: 1,
  },
  currentHorseName: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(3),
    fontFamily: "System",
  },
  currentHorseBreed: {
    fontSize: moderateScale(12),
    color: "#666",
    marginBottom: verticalScale(3),
    fontFamily: "System",
  },
  currentHorseOperator: {
    fontSize: moderateScale(11),
    color: "#999",
    marginBottom: verticalScale(4),
    fontFamily: "System",
  },
  currentHorseHealthRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  currentHorseHealthDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    marginRight: scale(6),
  },
  currentHorseHealthText: {
    fontSize: moderateScale(11),
    fontWeight: "500",
    fontFamily: "System",
  },
  currentSelectedIndicator: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: "#C17A47",
    justifyContent: "center",
    alignItems: "center",
  },
  currentSelectedIndicatorText: {
    color: "white",
    fontSize: moderateScale(14),
    fontWeight: "bold",
    fontFamily: "System",
  },
  horsesListContainer: {
    flex: 1,
    paddingHorizontal: scale(16),
    paddingTop: dynamicSpacing(16),
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(16),
    paddingHorizontal: scale(4),
  },
  horsesListTitle: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "#333",
    fontFamily: "System",
  },
  filterHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  filterHeaderButtonActive: {
    backgroundColor: "#FFF8F0",
    borderColor: "#C17A47",
  },
  filterHeaderText: {
    fontSize: moderateScale(14),
    color: "#666",
    fontWeight: "500",
    marginLeft: scale(6),
    fontFamily: "System",
  },
  filterHeaderTextActive: {
    color: "#C17A47",
    fontWeight: "600",
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
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    borderRadius: scale(12),
    marginBottom: verticalScale(10),
    backgroundColor: "#F8F8F8",
    borderWidth: 1,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedHorseItem: {
    backgroundColor: "#E8F5E8",
    borderColor: "#C17A47",
    shadowColor: "#C17A47",
    shadowOpacity: 0.1,
  },
  unavailableHorseItem: {
    backgroundColor: "#F0F0F0",
    opacity: 0.7,
  },
  sickHorseItem: { // NEW: Style for sick horses
    backgroundColor: "#FFF5F5",
    borderColor: "#FFCDD2",
    opacity: 0.8,
  },
  deceasedHorseItem: {
    backgroundColor: "#F5F5F5",
    borderColor: "#E0E0E0",
    opacity: 0.6,
  },
  horseAvatar: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(16),
    overflow: "hidden",
    position: "relative",
  },
  deceasedAvatar: {
    backgroundColor: "#E0E0E0",
  },
  sickAvatar: { // NEW: Style for sick horse avatar
    backgroundColor: "#FFEBEE",
  },
  deceasedOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  deceasedOverlayText: {
    color: "white",
    fontSize: moderateScale(24),
    fontWeight: "bold",
  },
  sickOverlay: { // NEW: Overlay for sick horses
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  sickOverlayText: {
    color: "#F44336",
    fontSize: moderateScale(24),
    fontWeight: "bold",
  },
  horseInfo: {
    flex: 1,
  },
  horseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(3),
  },
  horseName: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#333",
    flex: 1,
    fontFamily: "System",
  },
  unavailableText: {
    color: "#999",
  },
  sickText: { // NEW: Style for sick horse text
    color: "#F44336",
    fontStyle: "italic",
  },
  deceasedText: {
    color: "#999",
    textDecorationLine: "line-through",
  },
  assignedBadge: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(3),
    borderRadius: scale(12),
    marginLeft: scale(8),
  },
  assignedBadgeText: {
    color: "white",
    fontSize: moderateScale(9),
    fontWeight: "600",
    fontFamily: "System",
  },
  currentBadge: {
    backgroundColor: "#C17A47",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(3),
    borderRadius: scale(12),
    marginLeft: scale(8),
  },
  currentBadgeText: {
    color: "white",
    fontSize: moderateScale(9),
    fontWeight: "600",
    fontFamily: "System",
  },
  deceasedBadge: {
    backgroundColor: "#999999",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(3),
    borderRadius: scale(12),
    marginLeft: scale(8),
  },
  deceasedBadgeText: {
    color: "white",
    fontSize: moderateScale(9),
    fontWeight: "600",
    fontFamily: "System",
  },
  sickBadge: { // NEW: Badge for sick horses
    backgroundColor: "#F44336",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(3),
    borderRadius: scale(12),
    marginLeft: scale(8),
  },
  sickBadgeText: {
    color: "white",
    fontSize: moderateScale(9),
    fontWeight: "600",
    fontFamily: "System",
  },
  horseBreed: {
    fontSize: moderateScale(13),
    color: "#666",
    marginBottom: verticalScale(3),
    fontFamily: "System",
  },
  horseOperator: {
    fontSize: moderateScale(12),
    color: "#999",
    marginBottom: verticalScale(6),
    fontFamily: "System",
  },
  horseHealthRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(3),
  },
  horseHealthDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    marginRight: scale(8),
  },
  horseHealthText: {
    fontSize: moderateScale(12),
    fontWeight: "500",
    marginRight: scale(8),
    fontFamily: "System",
  },
  horseSeparator: {
    fontSize: moderateScale(12),
    color: "#999",
    marginRight: scale(8),
  },
  horseStatus: {
    fontSize: moderateScale(12),
    color: "#666",
    fontFamily: "System",
  },
  sickStatusText: { // NEW: Text for sick horse status
    fontSize: moderateScale(11),
    color: "#F44336",
    fontWeight: "500",
    fontFamily: "System",
  },
  horseCheckup: {
    fontSize: moderateScale(11),
    color: "#999",
    fontFamily: "System",
  },
  selectIndicator: {
    marginLeft: scale(8),
  },
  selectedIndicator: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "#C17A47",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedIndicatorText: {
    color: "white",
    fontSize: moderateScale(16),
    fontWeight: "bold",
    fontFamily: "System",
  },
  assignedIndicator: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "#FF6B6B",
    justifyContent: "center",
    alignItems: "center",
  },
  assignedIndicatorText: {
    color: "white",
    fontSize: moderateScale(20),
    fontWeight: "bold",
    fontFamily: "System",
  },
  deceasedIndicator: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "#999999",
    justifyContent: "center",
    alignItems: "center",
  },
  deceasedIndicatorText: {
    color: "white",
    fontSize: moderateScale(16),
    fontWeight: "bold",
    fontFamily: "System",
  },
  sickIndicator: { // NEW: Indicator for sick horses
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "#F44336",
    justifyContent: "center",
    alignItems: "center",
  },
  sickIndicatorText: {
    color: "white",
    fontSize: moderateScale(16),
    fontWeight: "bold",
    fontFamily: "System",
  },
  unselectedIndicator: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    borderWidth: 2,
    borderColor: "#E0E0E0",
    backgroundColor: "white",
  },
  noResultsContainer: {
    alignItems: "center",
    paddingVertical: verticalScale(40),
    paddingHorizontal: scale(20),
  },
  noResultsText: {
    fontSize: moderateScale(18),
    color: "#666",
    fontWeight: "600",
    marginBottom: verticalScale(8),
    fontFamily: "System",
    textAlign: "center",
  },
  noResultsSubtext: {
    fontSize: moderateScale(14),
    color: "#999",
    textAlign: "center",
    marginBottom: verticalScale(24),
    lineHeight: moderateScale(20),
    fontFamily: "System",
  },
  clearFiltersButton: {
    backgroundColor: "#C17A47",
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    borderRadius: scale(25),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  clearFiltersText: {
    color: "white",
    fontSize: moderateScale(15),
    fontWeight: "600",
    fontFamily: "System",
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
    borderRadius: scale(12),
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  loadingOverlayText: {
    fontSize: moderateScale(15),
    color: "#333",
    marginTop: verticalScale(12),
    fontFamily: "System",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    paddingBottom: dynamicSpacing(24),
    maxHeight: height * 0.7,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(20),
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: {
    fontSize: moderateScale(20),
    fontWeight: "600",
    color: "#333",
    fontFamily: "System",
  },
  modalClose: {
    fontSize: moderateScale(24),
    color: "#666",
    padding: scale(4),
    fontFamily: "System",
  },
  filterList: {
    maxHeight: height * 0.5,
  },
  filterItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(18),
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  filterItemSelected: {
    backgroundColor: "#FFF8F0",
  },
  filterItemText: {
    fontSize: moderateScale(17),
    color: "#333",
    fontFamily: "System",
  },
  filterItemTextSelected: {
    color: "#C17A47",
    fontWeight: "600",
  },
  filterItemCheck: {
    color: "#C17A47",
    fontSize: moderateScale(18),
    fontWeight: "bold",
    fontFamily: "System",
  },
  clearFilterButton: {
    marginHorizontal: scale(24),
    marginTop: verticalScale(16),
    paddingVertical: verticalScale(16),
    backgroundColor: "#F5F5F5",
    borderRadius: scale(12),
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  clearFilterText: {
    fontSize: moderateScale(16),
    color: "#666",
    fontWeight: "600",
    fontFamily: "System",
  },
  // Full Screen Image Modal (like dashboard)
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenImage: {
    width: "100%",
    height: "100%",
  },
  fullScreenCloseButton: {
    position: "absolute",
    top: scale(50),
    right: scale(20),
    zIndex: 10,
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenCloseText: {
    color: "white",
    fontSize: moderateScale(24),
    fontWeight: "600",
  },
})