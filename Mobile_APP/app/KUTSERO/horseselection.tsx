import * as SecureStore from 'expo-secure-store'
import { useRouter } from 'expo-router'
import { useEffect, useState } from "react"
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
    ActivityIndicator
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
  healthStatus: "Healthy" | "Under Care" | "Recovering"
  status: string
  image: any
  breed?: string
  age?: number
  color?: string
  operatorName?: string
  ownerName?: string
  opName?: string
  assignmentStatus?: 'available' | 'assigned'
  currentAssignmentId?: string
  lastCheckup?: string
  nextCheckup?: string
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
const API_BASE_URL = "http://172.20.10.2:8000/api/kutsero"

// Helper function to test API connectivity
const testAPIConnection = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/test/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Backend connection successful:', data)
      return true
    } else {
      console.error('❌ Backend connection failed:', response.status, response.statusText)
      return false
    }
  } catch (error) {
    console.error('❌ Backend connection error:', error)
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
    underCare: 0,
    recovering: 0
  })
  const safeArea = getSafeAreaPadding()

  // Load user data and horses
  useEffect(() => {
    loadUserDataAndHorses()
  }, [])

  // Add screen focus listener to refresh data when returning to screen
  useEffect(() => {
    const handleFocus = () => {
      console.log('Screen focused, refreshing data...')
      if (userData) {
        refreshData()
      }
    }

    // Since expo-router might not have addListener, we'll use a different approach
    // This will be called whenever the component mounts/remounts
    return () => {
      console.log('Screen unfocused')
    }
  }, [userData])

  const loadUserDataAndHorses = async () => {
    try {
      setIsLoading(true)
      
      // Test API connection first
      console.log('🔗 Testing backend connection...')
      const isConnected = await testAPIConnection()
      if (!isConnected) {
        Alert.alert("Connection Error", "Cannot connect to the backend server. Please check if the server is running.")
        return
      }
      
      // Load user data from SecureStore
      const storedUserData = await SecureStore.getItemAsync('user_data')
      const storedAccessToken = await SecureStore.getItemAsync('access_token')
      
      if (storedUserData && storedAccessToken) {
        const parsedUserData = JSON.parse(storedUserData)
        const unifiedUserData: UserData = {
          id: parsedUserData.id,
          email: parsedUserData.email,
          profile: parsedUserData.profile,
          access_token: storedAccessToken,
        }
        setUserData(unifiedUserData)
        console.log('User data loaded:', unifiedUserData)
        
        // FIX: Load horses FIRST, then current assignment with a delay
        console.log('🐴 Starting horse loading sequence...')
        await loadAvailableHorses()
        
        // Add a delay to ensure horses are loaded before updating assignments
        setTimeout(async () => {
          console.log('⏱️ Loading current assignment after delay...')
          await loadCurrentAssignment(unifiedUserData.profile?.kutsero_id || unifiedUserData.id)
        }, 200)
      } else {
        Alert.alert("Error", "User session not found. Please login again.")
      }
    } catch (error) {
      console.error('Error loading user data and horses:', error)
      Alert.alert("Error", "Failed to load data. Please try again.")
    } finally {
      // Delay setting loading to false to ensure all async operations complete
      setTimeout(() => {
        setIsLoading(false)
      }, 300)
    }
  }

  // Updated loadCurrentAssignment function with safety checks
  const loadCurrentAssignment = async (kutserroId: string) => {
    try {
      console.log('📋 Loading current assignment for kutsero ID:', kutserroId)
      const response = await fetch(`${API_BASE_URL}/current_assignment/?kutsero_id=${kutserroId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log('📋 Current assignment response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('📋 Current assignment data:', data)
        
        if (data.assignment && data.assignment.horse) {
          const horse: Horse = {
            id: data.assignment.horse.id,
            name: data.assignment.horse.name,
            healthStatus: data.assignment.horse.healthStatus as Horse["healthStatus"],
            status: data.assignment.horse.status,
            image: require("../../assets/images/horse.png"),
            breed: data.assignment.horse.breed,
            age: data.assignment.horse.age,
            color: data.assignment.horse.color,
            operatorName: data.assignment.horse.operatorName || data.assignment.horse.opName || data.assignment.horse.ownerName,
            ownerName: data.assignment.horse.ownerName || data.assignment.horse.opName || data.assignment.horse.operatorName,
            opName: data.assignment.horse.opName,
            assignmentStatus: 'assigned', // Fixed: explicit type assertion
            currentAssignmentId: data.assignment.assignmentId,
            lastCheckup: data.assignment.horse.lastCheckup,
            nextCheckup: data.assignment.horse.nextCheckup,
          }
          
          console.log('✅ Setting selected horse:', horse.name)
          setSelectedHorse(horse)
          
          // FIX: Only update availableHorses if they exist and have data
          setAvailableHorses(prevHorses => {
            if (prevHorses.length === 0) {
              console.log('⚠️ No horses loaded yet, skipping assignment status update')
              return prevHorses
            }
            
            console.log('🔄 Updating horse assignment status in list')
            const updatedHorses = prevHorses.map(h => 
              h.id === horse.id 
                ? { ...h, assignmentStatus: 'assigned' as const, currentAssignmentId: data.assignment.assignmentId }
                : h
            )
            
            console.log('✅ Horse assignment status updated')
            return updatedHorses
          })
          
          // Save to SecureStore
          await SecureStore.setItemAsync('selectedHorseData', JSON.stringify(horse))
          await SecureStore.setItemAsync('currentAssignmentId', data.assignment.assignmentId)
          
          console.log('💾 Current assignment saved to SecureStore:', horse.name)
        } else {
          // No current assignment
          console.log('📋 No current assignment found')
          setSelectedHorse(null)
          
          // Clear SecureStore
          try {
            await SecureStore.deleteItemAsync('selectedHorseData')
            await SecureStore.deleteItemAsync('currentAssignmentId')
            console.log('🗑️ Cleared SecureStore data')
          } catch (clearError) {
            console.log('ℹ️ No data to clear from SecureStore')
          }
        }
      } else {
        console.log('⚠️ No current assignment found or error:', response.status)
        setSelectedHorse(null)
        try {
          await SecureStore.deleteItemAsync('selectedHorseData')
          await SecureStore.deleteItemAsync('currentAssignmentId')
        } catch (clearError) {
          console.log('ℹ️ No data to clear from SecureStore')
        }
      }
    } catch (error) {
      console.error('❌ Error loading current assignment:', error)
    }
  }

  const loadAvailableHorses = async () => {
    try {
      console.log('🐴 Loading available horses...')
      console.log('🌐 Fetching from:', `${API_BASE_URL}/available_horses/`)
      
      const response = await fetch(`${API_BASE_URL}/available_horses/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log('📡 Response status:', response.status)
      console.log('✅ Response ok:', response.ok)

      if (response.ok) {
        const data = await response.json()
        console.log('📊 Received horses data - count:', data.horses?.length || 0)
        
        // Transform horses data with proper owner name mapping
        const horses: Horse[] = data.horses.map((horse: any) => ({
          id: horse.id,
          name: horse.name,
          healthStatus: horse.healthStatus as Horse["healthStatus"],
          status: horse.status,
          image: require("../../assets/images/horse.png"), // Default image for now
          breed: horse.breed,
          age: horse.age,
          color: horse.color,
          // Fix: Map all possible owner name fields
          operatorName: horse.operatorName || horse.opName || horse.ownerName || 'Unknown Owner',
          ownerName: horse.ownerName || horse.opName || horse.operatorName || 'Unknown Owner',
          opName: horse.opName,
          assignmentStatus: horse.assignmentStatus as 'available' | 'assigned', // Fixed: explicit type assertion
          currentAssignmentId: horse.currentAssignmentId,
          lastCheckup: horse.lastCheckup,
          nextCheckup: horse.nextCheckup,
        }))
        
        console.log('🔧 Processed horses:', horses.map(h => `${h.name} (${h.assignmentStatus})`))
        console.log('📝 Setting available horses in state...')
        setAvailableHorses(horses)
        
        // Update stats
        const newStats = {
          total: data.total_count || horses.length,
          healthy: horses.filter(h => h.healthStatus === 'Healthy').length,
          underCare: horses.filter(h => h.healthStatus === 'Under Care').length,
          recovering: horses.filter(h => h.healthStatus === 'Recovering').length,
        }
        console.log('📊 Updating stats:', newStats)
        setStatsData(newStats)
        
        console.log('✅ Horses loaded successfully')
      } else {
        // Get more detailed error information
        let errorMessage = 'Failed to fetch horses'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
          console.error('❌ Server error response:', errorData)
        } catch (e) {
          console.error('❌ Could not parse error response:', response.status, response.statusText)
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error('❌ Error loading horses:', error)
      
      // Provide more specific error messages
      let userMessage = 'Failed to load horses. Please try again.'
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        userMessage = 'Cannot connect to server. Please check your internet connection and make sure the backend server is running.'
      } else if (error instanceof Error) {
        userMessage = error.message
      }
      
      Alert.alert("Error", userMessage)
    }
  }

  // Updated refresh function with proper sequencing
  const refreshData = async () => {
    console.log('🔄 Starting data refresh...')
    setIsLoading(true)
    try {
      const kutserroId = userData?.profile?.kutsero_id || userData?.id
      if (kutserroId) {
        console.log('🐴 Refreshing horses...')
        await loadAvailableHorses()
        
        // Add delay to ensure horses are loaded first
        console.log('⏱️ Adding delay before loading assignment...')
        setTimeout(async () => {
          console.log('📋 Loading assignment after refresh...')
          await loadCurrentAssignment(kutserroId)
          console.log('✅ Refresh complete')
        }, 200)
      }
    } catch (error) {
      console.error('❌ Error refreshing data:', error)
    } finally {
      setTimeout(() => {
        setIsLoading(false)
      }, 300)
    }
  }

  // NEW: Unassign functionality
  const handleUnassignHorse = async () => {
    if (!selectedHorse || !selectedHorse.currentAssignmentId) {
      Alert.alert("Error", "No active assignment to unassign")
      return
    }

    Alert.alert(
      "Unassign Horse",
      `Are you sure you want to unassign ${selectedHorse.name}? This will end your current assignment and make the horse available for other kutseros.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unassign",
          style: "destructive",
          onPress: () => performUnassignment()
        }
      ]
    )
  }

  const performUnassignment = async () => {
    if (!selectedHorse) {
      Alert.alert("Error", "No horse selected for unassignment")
      return
    }

    console.log('🔓 Starting unassignment process for:', selectedHorse.name)
    setIsAssigning(true)
    
    try {
      const response = await fetch(`${API_BASE_URL}/unassign_horse/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignment_id: selectedHorse.currentAssignmentId,
          kutsero_id: userData?.profile?.kutsero_id || userData?.id,
          horse_id: selectedHorse.id
        }),
      })

      console.log('📨 Unassignment response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Unassignment successful:', result)
        
        // Store previous horse ID for updating the list
        const previousHorseId = selectedHorse.id
        const previousHorseName = selectedHorse.name
        
        // Clear selected horse
        setSelectedHorse(null)
        
        // Update horse in available list to show as available
        setAvailableHorses(prevHorses => {
          return prevHorses.map(horse => 
            horse.id === previousHorseId 
              ? { ...horse, assignmentStatus: 'available' as const, currentAssignmentId: undefined }
              : horse
          )
        })
        
        // Clear from SecureStore
        try {
          await SecureStore.deleteItemAsync('selectedHorseData')
          await SecureStore.deleteItemAsync('currentAssignmentId')
        } catch (clearError) {
          console.log('ℹ️ Nothing to clear from SecureStore')
        }
        
        Alert.alert(
          "Horse Unassigned Successfully",
          `${previousHorseName} has been unassigned successfully. The horse is now available for other kutseros.`,
          [
            {
              text: "OK",
              onPress: () => {
                console.log('🔄 Refreshing data after successful unassignment')
                refreshData()
              }
            }
          ]
        )
      } else {
        const errorData = await response.json()
        console.error('❌ Unassignment failed:', errorData)
        Alert.alert("Unassignment Failed", errorData.error || "Failed to unassign horse")
      }
    } catch (error) {
      console.error('❌ Error during unassignment:', error)
      Alert.alert("Error", "Failed to unassign horse. Please check your connection and try again.")
    } finally {
      setIsAssigning(false)
    }
  }

  // DEPRECATED: Old checkout functionality (kept for backward compatibility)
  const handleCheckout = async () => {
    if (!selectedHorse || !selectedHorse.currentAssignmentId) {
      Alert.alert("Error", "No active assignment to check out from")
      return
    }

    Alert.alert(
      "Check Out",
      `Are you sure you want to check out from ${selectedHorse.name}? This will end your current assignment and make the horse available for other kutseros.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Check Out",
          style: "destructive",
          onPress: () => performCheckout()
        }
      ]
    )
  }

  const performCheckout = async () => {
    if (!selectedHorse) {
      Alert.alert("Error", "No horse selected for checkout")
      return
    }

    console.log('🏁 Starting checkout process for:', selectedHorse.name)
    setIsAssigning(true)
    
    try {
      const response = await fetch(`${API_BASE_URL}/checkout/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignment_id: selectedHorse.currentAssignmentId,
          kutsero_id: userData?.profile?.kutsero_id || userData?.id
        }),
      })

      console.log('📨 Checkout response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Checkout successful:', result)
        
        // Store previous horse ID for updating the list
        const previousHorseId = selectedHorse.id
        const previousHorseName = selectedHorse.name
        
        // Clear selected horse
        setSelectedHorse(null)
        
        // Update horse in available list to show as available
        setAvailableHorses(prevHorses => {
          return prevHorses.map(horse => 
            horse.id === previousHorseId 
              ? { ...horse, assignmentStatus: 'available' as const, currentAssignmentId: undefined }
              : horse
          )
        })
        
        // Clear from SecureStore
        try {
          await SecureStore.deleteItemAsync('selectedHorseData')
          await SecureStore.deleteItemAsync('currentAssignmentId')
        } catch (clearError) {
          console.log('ℹ️ Nothing to clear from SecureStore')
        }
        
        Alert.alert(
          "Checked Out Successfully",
          `You have successfully checked out from ${previousHorseName}. The horse is now available for other kutseros.`,
          [
            {
              text: "OK",
              onPress: () => {
                console.log('🏃 Navigating back after successful checkout')
                router.back()
              }
            }
          ]
        )
      } else {
        const errorData = await response.json()
        console.error('❌ Checkout failed:', errorData)
        Alert.alert("Checkout Failed", errorData.error || "Failed to check out")
      }
    } catch (error) {
      console.error('❌ Error during checkout:', error)
      Alert.alert("Error", "Failed to check out. Please check your connection and try again.")
    } finally {
      setIsAssigning(false)
    }
  }

  // Updated filtering logic - show ALL horses but handle assignment status in the UI
  const filteredHorses = availableHorses.filter(horse => {
    const searchLower = searchText.toLowerCase()
    const matchesSearch = (
      horse.name.toLowerCase().includes(searchLower) ||
      horse.breed?.toLowerCase().includes(searchLower) ||
      horse.operatorName?.toLowerCase().includes(searchLower) ||
      horse.ownerName?.toLowerCase().includes(searchLower) ||
      horse.opName?.toLowerCase().includes(searchLower)
    )
    
    return matchesSearch
  })

  const handleHorseSelection = async (horse: Horse) => {
    console.log('🎯 Horse selection initiated:', horse.name)
    
    if (!userData?.profile?.kutsero_id && !userData?.id) {
      Alert.alert("Error", "User information not available")
      return
    }

    // Check if this horse is already assigned to someone else (not the current user)
    if (horse.assignmentStatus === 'assigned' && selectedHorse?.id !== horse.id) {
      console.log('⚠️ Horse already assigned to someone else')
      Alert.alert("Horse Unavailable", "This horse is currently assigned to another kutsero. Please select a different horse.")
      return
    }

    // If user already has a horse assigned and it's different from the selected one
    if (selectedHorse && selectedHorse.id !== horse.id) {
      console.log('🔄 Switch horse confirmation needed')
      Alert.alert(
        "Switch Horse Assignment",
        `You currently have ${selectedHorse.name} assigned. Selecting ${horse.name} will automatically end your current assignment and start a new one. Do you want to continue?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Switch Horse", onPress: () => performHorseAssignment(horse) }
        ]
      )
    } else if (selectedHorse && selectedHorse.id === horse.id) {
      // User clicked on their currently assigned horse - no action needed
      console.log('ℹ️ Same horse already assigned')
      Alert.alert("Already Assigned", `${horse.name} is already assigned to you.`)
    } else {
      // No current assignment, proceed directly
      console.log('✅ Proceeding with horse assignment')
      performHorseAssignment(horse)
    }
  }

  // FIXED: Updated performHorseAssignment with better state management
  const performHorseAssignment = async (horse: Horse) => {
    console.log('🚀 Starting horse assignment process:', horse.name)
    setIsAssigning(true)
    
    try {
      const kutserroId = userData?.profile?.kutsero_id || userData?.id
      console.log('👤 Assigning horse:', horse.name, 'to kutsero:', kutserroId)
      
      // Store the previous horse ID before assignment
      const previousHorseId = selectedHorse?.id
      console.log('🔄 Previous horse ID:', previousHorseId)
      
      const assignmentData = {
        kutsero_id: kutserroId,
        horse_id: horse.id,
        date_start: new Date().toISOString().split('T')[0],
        force_switch: true
      }

      console.log('📤 Creating assignment with data:', assignmentData)

      const response = await fetch(`${API_BASE_URL}/assign_horse/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignmentData),
      })

      console.log('📨 Assignment response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Assignment successful:', result)
        
        // Create the updated horse object with assignment info
        const updatedHorse: Horse = {
          ...horse,
          assignmentStatus: 'assigned',
          currentAssignmentId: result.assignment.assign_id,
        }
        
        console.log('🎯 Setting selected horse to:', updatedHorse.name)
        // IMPORTANT: Update selected horse immediately
        setSelectedHorse(updatedHorse)
        
        // FIX: Use functional update to ensure we have latest state
        console.log('📝 Updating available horses list...')
        setAvailableHorses(prevHorses => {
          console.log('🔍 Current horses in state:', prevHorses.length)
          
          if (prevHorses.length === 0) {
            console.log('⚠️ No horses in state to update')
            return prevHorses
          }
          
          const updatedHorses = prevHorses.map(h => {
            if (h.id === horse.id) {
              console.log('✅ Marking horse as assigned:', h.name)
              return { ...h, assignmentStatus: 'assigned' as const, currentAssignmentId: result.assignment.assign_id }
            } else if (previousHorseId && h.id === previousHorseId) {
              console.log('🔄 Marking previous horse as available:', h.name)
              return { ...h, assignmentStatus: 'available' as const, currentAssignmentId: undefined }
            }
            return h
          })
          
          console.log('📊 Updated horses count:', updatedHorses.length)
          console.log('🔧 Updated horses status:', updatedHorses.map(h => `${h.name} (${h.assignmentStatus})`))
          return updatedHorses
        })
        
        // Save to SecureStore
        console.log('💾 Saving assignment to SecureStore...')
        await SecureStore.setItemAsync('selectedHorseData', JSON.stringify(updatedHorse))
        await SecureStore.setItemAsync('currentAssignmentId', result.assignment.assign_id)
        
        console.log('✅ Horse assignment saved to SecureStore:', updatedHorse.name)
        
        const switchMessage = result.previous_assignments_ended > 0 
          ? `Your previous assignment has been ended automatically. ${horse.name} is now assigned to you for work.`
          : `${horse.name} has been assigned to you for work.`
        
        Alert.alert(
          "Horse Assigned Successfully",
          switchMessage,
          [
            {
              text: "OK",
              onPress: () => {
                console.log('🏃 Navigating back after successful assignment')
                router.back()
              }
            }
          ]
        )
      } else {
        const errorData = await response.json()
        console.error('❌ Assignment failed:', errorData)
        
        if (errorData.error?.includes("already assigned to another kutsero")) {
          Alert.alert("Assignment Failed", "This horse is currently assigned to another kutsero. Please select a different horse.")
        } else {
          Alert.alert("Assignment Failed", errorData.error || "Failed to assign horse")
        }
      }
    } catch (error) {
      console.error('❌ Error assigning horse:', error)
      Alert.alert("Error", "Failed to assign horse. Please check your connection and try again.")
    } finally {
      setIsAssigning(false)
    }
  }

  const getHealthStatusColor = (status: Horse["healthStatus"]) => {
    switch (status) {
      case "Healthy":
        return "#4CAF50"
      case "Under Care":
        return "#FF9800"
      case "Recovering":
        return "#2196F3"
      default:
        return "#666"
    }
  }

  // Helper function to get owner name with fallback
  const getOwnerName = (horse: Horse) => {
    return horse.operatorName || horse.ownerName || horse.opName || 'Unknown Owner'
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
              console.log('🔙 Back button pressed, navigating back')
              router.back()
            }}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Horse</Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={refreshData}
          >
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
            <Text style={[styles.statNumber, { color: "#4CAF50" }]}>
              {statsData.healthy}
            </Text>
            <Text style={styles.statLabel}>Healthy</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#FF9800" }]}>
              {statsData.underCare}
            </Text>
            <Text style={styles.statLabel}>Under Care</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#2196F3" }]}>
              {statsData.recovering}
            </Text>
            <Text style={styles.statLabel}>Recovering</Text>
          </View>
        </View>

        {/* Current Selection with Checkout Button */}
        {selectedHorse && (
          <View style={styles.currentSelectionContainer}>
            <Text style={styles.currentSelectionTitle}>Currently Assigned</Text>
            <View style={styles.currentSelectionCard}>
              <View style={styles.currentHorseAvatar}>
                <Image
                  source={selectedHorse.image}
                  style={[styles.currentHorseIconImage, { tintColor: "#C17A47" }]}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.currentHorseInfo}>
                <Text style={styles.currentHorseName}>{selectedHorse.name}</Text>
                <Text style={styles.currentHorseBreed}>{selectedHorse.breed} • {selectedHorse.age} years</Text>
                <Text style={styles.currentHorseOperator}>Owner: {getOwnerName(selectedHorse)}</Text>
                <View style={styles.currentHorseHealthRow}>
                  <View style={[styles.currentHorseHealthDot, { backgroundColor: getHealthStatusColor(selectedHorse.healthStatus) }]} />
                  <Text style={[styles.currentHorseHealthText, { color: getHealthStatusColor(selectedHorse.healthStatus) }]}>
                    {selectedHorse.healthStatus}
                  </Text>
                </View>
              </View>
              <View style={styles.checkoutButtonContainer}>
                <TouchableOpacity 
                  style={styles.checkoutButton}
                  onPress={handleCheckout}
                  disabled={isAssigning}
                >
                  <Text style={styles.checkoutButtonText}>Check Out</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Available Horses List */}
        <View style={styles.horsesListContainer}>
          <Text style={styles.horsesListTitle}>
            All Horses ({filteredHorses.length})
          </Text>
                    
          <ScrollView 
            style={styles.horsesList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.horsesListContent}
          >
            {filteredHorses.map((horse) => {
              // Determine if this horse is assigned to someone else (not current user)
              const isAssignedToOther = horse.assignmentStatus === 'assigned' && selectedHorse?.id !== horse.id
              const isCurrentlySelected = selectedHorse?.id === horse.id
              
              return (
                <TouchableOpacity 
                  key={horse.id}
                  style={[
                    styles.horseItem,
                    isCurrentlySelected && styles.selectedHorseItem,
                    isAssignedToOther && styles.unavailableHorseItem
                  ]}
                  onPress={() => handleHorseSelection(horse)}
                  activeOpacity={0.7}
                  disabled={isAssigning}
                >
                  <View style={styles.horseAvatar}>
                    <Image
                      source={horse.image}
                      style={[
                        styles.horseIconImage, 
                        { tintColor: isAssignedToOther ? "#999" : "#C17A47" }
                      ]}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.horseInfo}>
                    <View style={styles.horseHeader}>
                      <Text style={[
                        styles.horseName,
                        isAssignedToOther && styles.unavailableText
                      ]}>
                        {horse.name}
                      </Text>
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
                    <Text style={[
                      styles.horseBreed,
                      isAssignedToOther && styles.unavailableText
                    ]}>
                      {horse.breed} • {horse.age} years old
                    </Text>
                    <Text style={[
                      styles.horseOperator,
                      isAssignedToOther && styles.unavailableText
                    ]}>
                      Owner: {getOwnerName(horse)}
                    </Text>
                    <View style={styles.horseHealthRow}>
                      <View style={[styles.horseHealthDot, { backgroundColor: getHealthStatusColor(horse.healthStatus) }]} />
                      <Text style={[styles.horseHealthText, { color: getHealthStatusColor(horse.healthStatus) }]}>
                        {horse.healthStatus}
                      </Text>
                      <Text style={styles.horseSeparator}>•</Text>
                      <Text style={[
                        styles.horseStatus,
                        isAssignedToOther && styles.unavailableText
                      ]}>
                        {horse.status}
                      </Text>
                    </View>
                    <Text style={[
                      styles.horseCheckup,
                      isAssignedToOther && styles.unavailableText
                    ]}>
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
                  {searchText ? 'Try adjusting your search terms' : 'No horses available'}
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
            <Text style={styles.loadingOverlayText}>
              {selectedHorse ? 'Processing checkout...' : 'Assigning horse...'}
            </Text>
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
  },
  currentHorseIconImage: {
    width: scale(20),
    height: scale(20),
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
  // NEW: Checkout button styles
  checkoutButtonContainer: {
    marginLeft: scale(8),
  },
  checkoutButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(6),
    minWidth: scale(70),
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: "white",
    fontSize: moderateScale(12),
    fontWeight: "600",
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
  },
  horseIconImage: {
    width: scale(24),
    height: scale(24),
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    backgroundColor: 'white',
    paddingHorizontal: scale(30),
    paddingVertical: verticalScale(20),
    borderRadius: scale(10),
    alignItems: 'center',
  },
  loadingOverlayText: {
    fontSize: moderateScale(14),
    color: "#333",
    marginTop: verticalScale(10),
  },
})