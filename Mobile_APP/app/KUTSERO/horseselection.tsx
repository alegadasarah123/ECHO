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
  FlatList,
} from "react-native"
import FontAwesome5 from '@expo/vector-icons/FontAwesome5'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'

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

// Interfaces
interface HorseOwner {
  op_id: string
  name: string
  full_name: string
  email: string
  phone: string
  address: string
  image: string
  total_horses: number
  available_horses: any[]
  has_pending_application: boolean
  is_approved: boolean
}

interface Application {
  application_id: string
  op_id: string
  owner_name: string
  application_date: string
  status: 'pending' | 'approved' | 'rejected'
  review_date?: string
  review_notes?: string
  created_at: string
  updated_at: string
}

interface AvailableHorse {
  id: string
  name: string
  breed: string
  age: number
  sex: string
  color: string
  image: string
  owner_id: string
  owner_name: string
  status: string
  is_assigned: boolean
  is_assigned_to_me: boolean
  can_select: boolean
  owner_approved: boolean
}

// Backend API configuration - MAKE SURE THIS IS CORRECT!
const API_BASE_URL = "https://echo-ebl8.onrender.com/api/kutsero"

// Helper function to fix image URLs
const cleanImageUrl = (url: string | undefined): string => {
  if (!url || url === "" || url === "null" || url === "undefined") {
    return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2hhdD0iMTUwIiBmaWxsPSIjRjBGMEYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJTeXN0ZW0iIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4="
  }
  
  let cleanUrl = url.split('?')[0]
  
  const baseStoragePath = "https://drgknejiqupegkyxfaab.supabase.co/storage/v1/object/public/horse_image/"
  
  if (cleanUrl.includes(baseStoragePath)) {
    const count = (cleanUrl.match(new RegExp(baseStoragePath, 'g')) || []).length
    
    if (count > 1) {
      const lastIndex = cleanUrl.lastIndexOf(baseStoragePath)
      const actualPath = cleanUrl.substring(lastIndex + baseStoragePath.length)
      cleanUrl = baseStoragePath + actualPath
    }
  } else if (!cleanUrl.startsWith('http')) {
    cleanUrl = baseStoragePath + (cleanUrl.startsWith('/') ? cleanUrl.substring(1) : cleanUrl)
  }
  
  return cleanUrl
}

export default function HorseSelectionScreen() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'owners' | 'applications' | 'horses'>('owners')
  const [searchText, setSearchText] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isApplying, setIsApplying] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  
  const [horseOwners, setHorseOwners] = useState<HorseOwner[]>([])
  const [myApplications, setMyApplications] = useState<Application[]>([])
  const [approvedHorses, setApprovedHorses] = useState<AvailableHorse[]>([])
  const [ownerDetailModal, setOwnerDetailModal] = useState(false)
  const [selectedOwnerForDetail, setSelectedOwnerForDetail] = useState<HorseOwner | null>(null)
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const safeArea = getSafeAreaPadding()

  // Test API connection
  const testApiConnection = async () => {
    try {
      console.log("Testing API connection to:", API_BASE_URL)
      
      // Test health endpoint
      const healthResponse = await fetch(`${API_BASE_URL}/health/`)
      console.log("Health check status:", healthResponse.status)
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json()
        console.log("Health check data:", healthData)
      }
      
      // Test debug endpoint
      const debugResponse = await fetch(`${API_BASE_URL}/debug/`)
      console.log("Debug endpoint status:", debugResponse.status)
      
      if (debugResponse.ok) {
        const debugData = await debugResponse.json()
        console.log("Debug endpoint data:", debugData)
      }
      
      return true
    } catch (error) {
      console.error("API connection test failed:", error)
      setConnectionError("Cannot connect to server. Please check your internet connection.")
      return false
    }
  }

  // Load user data on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true)
        setConnectionError(null)
        
        // First test API connection
        const isConnected = await testApiConnection()
        if (!isConnected) {
          setIsLoading(false)
          return
        }
        
        const storedUserData = await SecureStore.getItemAsync("user_data")
        const storedAccessToken = await SecureStore.getItemAsync("access_token")

        if (storedUserData && storedAccessToken) {
          const parsedUserData = JSON.parse(storedUserData)
          
          const kutsero_id = parsedUserData.profile?.kutsero_id || parsedUserData.kutsero_id || parsedUserData.id
          
          if (!kutsero_id) {
            Alert.alert("Error", "Could not find your user ID. Please log in again.")
            router.back()
            return
          }
          
          const unifiedUserData: UserData = {
            id: parsedUserData.id,
            email: parsedUserData.email,
            profile: {
              ...parsedUserData.profile,
              kutsero_id: kutsero_id
            },
            access_token: storedAccessToken,
          }
          
          setUserData(unifiedUserData)
          console.log("User data loaded. kutsero_id:", kutsero_id)
          
          // Now load the data with the user data
          await Promise.all([
            loadHorseOwners(unifiedUserData),
            loadMyApplications(unifiedUserData),
            loadApprovedHorses(unifiedUserData)
          ])
        } else {
          Alert.alert("Error", "User session not found. Please login again.")
          router.back()
        }
      } catch (error) {
        console.error("Error initializing:", error)
        Alert.alert("Error", "Failed to load data. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }
    
    initialize()
  }, [])

  // Refresh data when screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log("Screen focused, refreshing data...")
      if (userData) {
        refreshData()
      }
    }, [userData])
  )

  const loadHorseOwners = async (userDataParam?: UserData) => {
  try {
    const dataToUse = userDataParam || userData
    const kutsero_id = dataToUse?.profile?.kutsero_id
    
    if (!kutsero_id) {
      console.log("ERROR: No kutsero_id available")
      setHorseOwners([])
      return
    }

    console.log("DEBUG: Loading horse owners for kutsero_id:", kutsero_id)
    
    // Try with both query parameter formats
    const url = `${API_BASE_URL}/horse_owners/?kutsero_id=${encodeURIComponent(kutsero_id)}`
    console.log("DEBUG: Full URL:", url)
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    })
    
    console.log("DEBUG: Response status:", response.status)
    console.log("DEBUG: Response headers:", Object.fromEntries(response.headers.entries()))
    
    if (response.ok) {
      const data = await response.json()
      console.log("DEBUG: Parsed data:", data)
      
      if (data.success && data.owners) {
        console.log("SUCCESS: Found", data.owners.length, "horse owners")
        setHorseOwners(data.owners || [])
      } else {
        console.log("WARNING: API returned success but no owners:", data)
        setHorseOwners([])
      }
    } else {
      const errorText = await response.text()
      console.log("ERROR: API returned", response.status, "error:", errorText)
      setHorseOwners([])
    }
    
  } catch (error: any) {
    console.error("ERROR in loadHorseOwners:", error.message)
    console.error("ERROR stack:", error.stack)
    setHorseOwners([])
    setConnectionError(`Failed to load horse owners: ${error.message}`)
  }
}
  const loadMyApplications = async (userDataParam?: UserData) => {
    try {
      const dataToUse = userDataParam || userData
      const kutsero_id = dataToUse?.profile?.kutsero_id
      
      if (!kutsero_id) {
        console.log("No kutsero_id available")
        setMyApplications([])
        return
      }

      console.log("DEBUG: Loading applications with kutsero_id:", kutsero_id)
      console.log("DEBUG: URL:", `${API_BASE_URL}/my_applications/?kutsero_id=${kutsero_id}`)
      
      const response = await fetch(
        `${API_BASE_URL}/my_applications/?kutsero_id=${kutsero_id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
      
      console.log("DEBUG: Applications response status:", response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log("DEBUG: Applications response data:", data)
        
        if (data.success) {
          console.log("DEBUG: Found", data.applications?.length || 0, "applications")
          setMyApplications(data.applications || [])
          return
        }
      } else {
        console.log("DEBUG: Applications API error:", response.status, await response.text())
      }
      
      console.log("No applications found or error in response")
      setMyApplications([])
      
    } catch (error) {
      console.error("Error loading applications:", error)
      setMyApplications([])
    }
  }

const loadApprovedHorses = async (userDataParam?: UserData) => {
  try {
    const dataToUse = userDataParam || userData
    const kutsero_id = dataToUse?.profile?.kutsero_id
    
    if (!kutsero_id) {
      console.log("No kutsero_id available")
      setApprovedHorses([])
      return
    }

    console.log("DEBUG: Loading approved horses with kutsero_id:", kutsero_id)
    
    // Use the correct endpoint name
    const url = `${API_BASE_URL}/get_approved_owners_horses/?kutsero_id=${encodeURIComponent(kutsero_id)}`
    console.log("DEBUG: Trying URL:", url)
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
    })
    
    console.log("DEBUG: Response status:", response.status)
    
    if (response.ok) {
      const data = await response.json()
      console.log("DEBUG: Full response data:", data)
      
      if (data.success) {
        const horses = data.horses || []
        console.log("SUCCESS: Found", horses.length, "approved horses (before filtering)")
        
        // Transform horses to match frontend interface AND FILTER OUT DECEASED HORSES
        const transformedHorses: AvailableHorse[] = horses
          .filter((horse: any) => {
            // Filter out deceased horses
            const horseStatus = horse.status || horse.horse_status || ''
            const isDeceased = horseStatus.toLowerCase() === 'deceased'
            
            if (isDeceased) {
              console.log(`Filtering out deceased horse: ${horse.name || horse.horse_name}`)
              return false
            }
            return true
          })
          .map((horse: any) => ({
            id: horse.id || horse.horse_id || '',
            name: horse.name || horse.horse_name || '',
            breed: horse.breed || horse.horse_breed || 'Unknown',
            age: horse.age || horse.horse_age || 0,
            sex: horse.sex || horse.horse_sex || 'Unknown',
            color: horse.color || horse.horse_color || 'Unknown',
            image: horse.image || horse.horse_image || '',
            owner_id: horse.owner_id || '',
            owner_name: horse.owner_name || 'Unknown Owner',
            status: horse.status || horse.horse_status || 'available',
            is_assigned: horse.is_assigned || false,
            is_assigned_to_me: horse.is_assigned_to_me || false,
            can_select: horse.can_select !== undefined ? horse.can_select : (!horse.is_assigned || horse.is_assigned_to_me),
            owner_approved: true
          }))
        
        console.log("AFTER FILTERING: Found", transformedHorses.length, "horses (deceased filtered out)")
        setApprovedHorses(transformedHorses)
      } else {
        console.log("API returned success false:", data.error || "Unknown error")
        setApprovedHorses([])
      }
    } else {
      console.log("API error status:", response.status)
      const errorText = await response.text()
      console.log("API error response:", errorText)
      setApprovedHorses([])
    }
    
  } catch (error) {
    console.error("Error loading approved horses:", error)
    setApprovedHorses([])
  }
}

  const refreshData = async () => {
    if (!userData) {
      console.log("No user data available for refresh")
      return
    }
    
    setIsLoading(true)
    setConnectionError(null)
    try {
      await Promise.all([
        loadHorseOwners(),
        loadMyApplications(),
        loadApprovedHorses()
      ])
    } catch (error) {
      console.error("Error refreshing data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApplyToOwner = async (owner: HorseOwner) => {
    if (!userData || !userData.profile?.kutsero_id) {
      Alert.alert("Error", "User information not available")
      return
    }

    if (owner.is_approved) {
      Alert.alert("Already Approved", "You are already approved by this owner. You can now use their horses.")
      setActiveTab('horses')
      return
    }

    if (owner.has_pending_application) {
      Alert.alert("Pending Application", "You already have a pending application with this owner.")
      return
    }

    Alert.alert(
      "Apply to Owner",
      `Are you sure you want to apply to ${owner.full_name}? You will need to wait for their approval before using their horses.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Apply", 
          onPress: () => proceedWithApplication(owner) 
        }
      ]
    )
  }

// In your HorseSelectionScreen, update the proceedWithApplication function:
const proceedWithApplication = async (owner: HorseOwner) => {
  if (!userData?.profile?.kutsero_id) {
    Alert.alert("Error", "User information not available")
    return
  }

  setIsApplying(true)

  try {
    // Log the data being sent
    console.log("DEBUG [Frontend]: Sending application with:", {
      kutsero_id: userData.profile.kutsero_id,
      op_id: owner.op_id,
      owner_name: owner.full_name
    })

    const payload = {
      op_id: owner.op_id,
      kutsero_id: userData.profile.kutsero_id
    }

    console.log("DEBUG [Frontend]: Full URL:", `${API_BASE_URL}/apply_to_owner/`)

    const response = await fetch(
      `${API_BASE_URL}/apply_to_owner/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      }
    )

    console.log("DEBUG [Frontend]: Response status:", response.status)
    
    let responseText
    try {
      responseText = await response.text()
      console.log("DEBUG [Frontend]: Raw response:", responseText)
    } catch (textError) {
      console.log("DEBUG [Frontend]: Could not read response text")
      throw new Error("Could not read server response")
    }
    
    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.log("DEBUG [Frontend]: Failed to parse JSON")
      throw new Error(`Server returned invalid JSON: ${responseText.substring(0, 200)}`)
    }

    console.log("DEBUG [Frontend]: Parsed data:", data)

    if (response.ok && data.success) {
      Alert.alert(
        "Application Submitted",
        `Your application to ${owner.full_name} has been submitted successfully!`,
        [{
          text: "OK",
          onPress: () => {
            // Refresh data to show the updated status
            refreshData()
            // Switch to applications tab
            setActiveTab("applications")
          }
        }]
      )
    } else {
      let errorMessage = data.error || "Failed to submit application"
      
      // Provide user-friendly error messages
      if (errorMessage.includes('already have a pending application')) {
        errorMessage = "You already have a pending application with this owner."
      } else if (errorMessage.includes('already approved')) {
        errorMessage = "You are already approved by this owner. Check your available horses."
      } else if (errorMessage.includes('not found')) {
        errorMessage = "Owner or user not found. Please try logging in again."
      } else if (errorMessage.includes('Database error')) {
        errorMessage = "System error. Please try again later."
      }

      Alert.alert("Application Failed", errorMessage)
    }

  } catch (error: any) {
    console.error("Apply error:", error)
    let userMessage = error.message || "Failed to submit application."
    
    if (error.message.includes('Network')) {
      userMessage = "Network error. Please check your internet connection."
    } else if (error.message.includes('JSON')) {
      userMessage = "Server error. Please try again later."
    }
    
    Alert.alert("Error", userMessage)
  } finally {
    setIsApplying(false)
  }
}


 const handleSelectHorse = (horse: AvailableHorse) => {
  if (!userData || !userData.profile?.kutsero_id) {
    Alert.alert("Error", "User information not available")
    return
  }

  if (!horse.can_select) {
    Alert.alert("Horse Unavailable", "This horse is already assigned to you or another kutsero.")
    return
  }

  if (!horse.owner_approved) {
    Alert.alert("Owner Not Approved", "You need to be approved by this horse's owner first.")
    return
  }

  Alert.alert(
    "Assign Horse",
    `Do you want to assign ${horse.name} to yourself?\n\nNote: You will need to check in with this horse on the dashboard before starting work.`,
    [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Assign", 
        onPress: () => assignHorseToKutsero(horse) 
      }
    ]
  )
}

const assignHorseToKutsero = async (horse: AvailableHorse) => {
  if (!userData || !userData.profile?.kutsero_id) {
    Alert.alert("Error", "User information not available")
    return
  }
  
  setIsAssigning(true)
  try {
    console.log("DEBUG: Assigning horse", {
      horse_id: horse.id,
      op_id: horse.owner_id,
      kutsero_id: userData.profile.kutsero_id
    })
    
    const url = `${API_BASE_URL}/assign_horse_to_kutsero/`
    console.log("DEBUG: Calling URL:", url)
    
    const payload = {
      horse_id: horse.id,
      op_id: horse.owner_id,
      kutsero_id: userData.profile.kutsero_id,
      date_start: new Date().toISOString()
    }
    
    console.log("DEBUG: Payload:", payload)
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload)
    })
    
    // First, check what type of response we got
    const contentType = response.headers.get('content-type')
    console.log("DEBUG: Response status:", response.status)
    console.log("DEBUG: Content-Type:", contentType)
    
    let responseText = await response.text()
    console.log("DEBUG: Raw response (first 500 chars):", responseText.substring(0, 500))
    
    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.log("DEBUG: Failed to parse as JSON")
      if (responseText.includes('<html') || responseText.includes('<!DOCTYPE')) {
        console.log("DEBUG: Server returned HTML instead of JSON")
        // Extract any error message from HTML if possible
        const errorMatch = responseText.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i) || 
                           responseText.match(/<body[^>]*>([\s\S]*?)<\/body>/i) ||
                           responseText.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
        
        throw new Error(`Server error (HTML response). Status: ${response.status}. ${errorMatch ? 'Message: ' + errorMatch[1].substring(0, 100) : ''}`)
      }
      throw new Error(`Invalid response from server: ${responseText.substring(0, 100)}`)
    }
    
    console.log("DEBUG: Parsed response data:", data)
    
    if (response.ok && data.success) {
      Alert.alert("Success", data.message, [
        {
          text: "OK",
          onPress: () => {
            // Go back to previous screen
            router.back()
          }
        }
      ])
    } else {
      Alert.alert(
        "Assignment Failed",
        data.error || "Failed to assign horse. Please try again.",
        [{ text: "OK" }]
      )
    }
  } catch (error: any) {
    console.error("Error assigning horse:", error)
    Alert.alert(
      "Error", 
      error.message || "Failed to assign horse. Please check your connection and try again."
    )
  } finally {
    setIsAssigning(false)
  }
}

  const getApplicationStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#4CAF50'
      case 'rejected': return '#F44336'
      case 'pending': return '#FF9800'
      default: return '#666'
    }
  }

  const getApplicationStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return 'check-circle'
      case 'rejected': return 'cancel'
      case 'pending': return 'schedule'
      default: return 'help'
    }
  }

  // Filter data based on search text
  const filteredOwners = horseOwners.filter(owner => 
    owner.full_name.toLowerCase().includes(searchText.toLowerCase()) ||
    owner.email.toLowerCase().includes(searchText.toLowerCase()) ||
    owner.phone.includes(searchText) ||
    owner.address.toLowerCase().includes(searchText.toLowerCase())
  )

  const filteredApplications = myApplications.filter(app =>
    app.owner_name.toLowerCase().includes(searchText.toLowerCase()) ||
    app.status.toLowerCase().includes(searchText.toLowerCase())
  )

  const filteredHorses = approvedHorses.filter(horse =>
    horse.name.toLowerCase().includes(searchText.toLowerCase()) ||
    horse.breed.toLowerCase().includes(searchText.toLowerCase()) ||
    horse.owner_name.toLowerCase().includes(searchText.toLowerCase())
  )

  // Render Owner List Item
  const renderOwnerItem = ({ item }: { item: HorseOwner }) => (
    <TouchableOpacity
      style={styles.ownerCard}
      onPress={() => {
        setSelectedOwnerForDetail(item)
        setOwnerDetailModal(true)
      }}
      activeOpacity={0.7}
    >
      <View style={styles.ownerHeader}>
        {item.image ? (
          <Image 
            source={{ uri: cleanImageUrl(item.image) }} 
            style={styles.ownerAvatar}
            onError={(e) => console.log("Failed to load owner image:", e.nativeEvent.error)}
          />
        ) : (
          <View style={styles.ownerAvatarPlaceholder}>
            <Text style={styles.ownerInitials}>
              {item.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </Text>
          </View>
        )}
        
        <View style={styles.ownerInfo}>
          <Text style={styles.ownerName}>{item.full_name}</Text>
          <Text style={styles.ownerHorsesCount}>
            {item.total_horses} horse{item.total_horses !== 1 ? 's' : ''}
          </Text>
          {item.phone ? (
            <Text style={styles.ownerContact}>{item.phone}</Text>
          ) : null}
        </View>
        
        <View style={styles.ownerActions}>
          {item.is_approved ? (
            <View style={styles.approvedBadge}>
              <FontAwesome name="check" size={14} color="white" />
              <Text style={styles.approvedText}>Approved</Text>
            </View>
          ) : item.has_pending_application ? (
            <View style={styles.pendingBadge}>
              <MaterialIcons name="schedule" size={14} color="white" />
              <Text style={styles.pendingText}>Pending</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => handleApplyToOwner(item)}
              disabled={isApplying}
            >
              <Text style={styles.applyButtonText}>
                {isApplying ? '...' : 'Apply'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <View style={styles.ownerFooter}>
        {item.address ? (
          <Text style={styles.ownerAddress} numberOfLines={1}>
            <MaterialIcons name="location-on" size={12} color="#666" /> {item.address}
          </Text>
        ) : (
          <Text style={styles.ownerAddress} numberOfLines={1}>
            <MaterialIcons name="location-on" size={12} color="#666" /> Address not available
          </Text>
        )}
      </View>
    </TouchableOpacity>
  )

  // Render Application List Item
  const renderApplicationItem = ({ item }: { item: Application }) => (
    <View style={[
      styles.applicationCard,
      { borderLeftWidth: 4, borderLeftColor: getApplicationStatusColor(item.status) }
    ]}>
      <View style={styles.applicationHeader}>
        <MaterialIcons 
          name={getApplicationStatusIcon(item.status) as any} 
          size={24} 
          color={getApplicationStatusColor(item.status)} 
        />
        <View style={styles.applicationInfo}>
          <Text style={styles.applicationOwner}>{item.owner_name}</Text>
          <Text style={styles.applicationDate}>
            Applied: {new Date(item.application_date).toLocaleDateString()}
          </Text>
        </View>
      </View>
      
      <View style={styles.applicationStatusContainer}>
        <Text style={[
          styles.applicationStatus,
          { color: getApplicationStatusColor(item.status) }
        ]}>
          Status: {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Text>
      </View>
      
      {item.review_notes && (
        <Text style={styles.applicationNotes}>
          Notes: {item.review_notes}
        </Text>
      )}
      
      {item.review_date && (
        <Text style={styles.applicationReviewDate}>
          Reviewed: {new Date(item.review_date).toLocaleDateString()}
        </Text>
      )}
    </View>
  )

// Render Horse List Item - UPDATED to remove select button for already assigned horses
const renderHorseItem = ({ item }: { item: AvailableHorse }) => (
  <TouchableOpacity
    style={[
      styles.horseCard,
      (!item.can_select || !item.owner_approved) && styles.horseCardDisabled
    ]}
    onPress={() => item.can_select && item.owner_approved && handleSelectHorse(item)}
    disabled={!item.can_select || !item.owner_approved}
    activeOpacity={(item.can_select && item.owner_approved) ? 0.7 : 1}
  >
    {!item.owner_approved && (
      <View style={styles.notApprovedOverlay}>
        <Text style={styles.notApprovedText}>Owner Not Approved</Text>
      </View>
    )}
    
    <TouchableOpacity
      onPress={() => {
        if (item.image) {
          setFullScreenImage(cleanImageUrl(item.image))
        }
      }}
      activeOpacity={0.9}
    >
      <Image 
        source={{ uri: cleanImageUrl(item.image) }} 
        style={styles.horseImage}
        onError={(e) => console.log(`Failed to load horse image:`, e.nativeEvent.error)}
      />
    </TouchableOpacity>
    
    <View style={styles.horseInfo}>
      <View style={styles.horseHeader}>
        <Text style={styles.horseName}>{item.name}</Text>
        {item.is_assigned && (
          <View style={styles.assignedBadge}>
            <Text style={styles.assignedBadgeText}>
              {item.is_assigned_to_me ? 'Your Horse' : 'Assigned'}
            </Text>
          </View>
        )}
      </View>
      
      <Text style={styles.horseDetails}>
        {item.breed} • {item.age} years • {item.color}
      </Text>
      
      <Text style={styles.horseOwner}>
        <FontAwesome name="user" size={12} color="#666" /> {item.owner_name}
      </Text>
      
      {!item.can_select && !item.is_assigned_to_me && (
        <Text style={styles.notAvailableText}>
          Not available for assignment
        </Text>
      )}
      
      {/* Show message if horse is already assigned to current user */}
      {item.is_assigned_to_me && (
        <Text style={styles.alreadyAssignedText}>
          ✓ Already assigned to you
        </Text>
      )}
    </View>
    
    <View style={styles.horseAction}>
      {item.can_select && item.owner_approved && !item.is_assigned_to_me ? (
        <TouchableOpacity
          style={styles.selectHorseButton}
          onPress={() => handleSelectHorse(item)}
          disabled={isAssigning}
        >
          <Text style={styles.selectHorseButtonText}>
            {isAssigning ? '...' : 'Select'}
          </Text>
        </TouchableOpacity>
      ) : !item.owner_approved ? (
        <MaterialIcons name="lock" size={24} color="#999" />
      ) : item.is_assigned_to_me ? (
        // Show checkmark instead of button for already assigned horses
        <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
      ) : (
        <MaterialIcons name="block" size={24} color="#999" />
      )}
    </View>
  </TouchableOpacity>
)

  const renderEmptyState = (type: 'owners' | 'applications' | 'horses') => {
    const config = {
      owners: {
        icon: 'people',
        title: 'No horse owners found',
        message: searchText 
          ? 'Try adjusting your search terms' 
          : 'No horse owners available'
      },
      applications: {
        icon: 'description',
        title: 'No applications found',
        message: 'You have not applied to any horse owners yet'
      },
      horses: {
        icon: 'pets',
        title: approvedHorses.length === 0 && myApplications.filter(app => app.status === 'approved').length === 0
          ? 'No approved owners yet'
          : 'No horses available',
        message: approvedHorses.length === 0 && myApplications.filter(app => app.status === 'approved').length === 0
          ? 'You need to be approved by horse owners first'
          : searchText
            ? 'No matching horses found'
            : 'No horses available from your approved owners'
      }
    }

    const { icon, title, message } = config[type]

    return (
      <View style={styles.emptyState}>
        <MaterialIcons name={icon as any} size={60} color="#ccc" />
        <Text style={styles.emptyStateText}>{title}</Text>
        <Text style={styles.emptyStateSubtext}>{message}</Text>
        
        {type === 'horses' && myApplications.filter(app => app.status === 'approved').length === 0 && (
          <TouchableOpacity
            style={styles.browseOwnersButton}
            onPress={() => setActiveTab('owners')}
          >
            <Text style={styles.browseOwnersButtonText}>Browse Owners to Apply</Text>
          </TouchableOpacity>
        )}
        
        {type === 'horses' && myApplications.filter(app => app.status === 'approved').length > 0 && approvedHorses.length === 0 && (
          <TouchableOpacity
            style={styles.browseOwnersButton}
            onPress={() => refreshData()}
          >
            <Text style={styles.browseOwnersButtonText}>Refresh Horses List</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  const renderContent = () => {
    if (connectionError) {
      return (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={60} color="#F44336" />
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorMessage}>{connectionError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={refreshData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )
    }
    
    switch (activeTab) {
      case 'owners':
        return (
          <FlatList
            data={filteredOwners}
            renderItem={renderOwnerItem}
            keyExtractor={(item) => item.op_id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyState('owners')}
            contentContainerStyle={styles.listContent}
          />
        )
      case 'applications':
        return (
          <FlatList
            data={filteredApplications}
            renderItem={renderApplicationItem}
            keyExtractor={(item) => item.application_id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyState('applications')}
            contentContainerStyle={styles.listContent}
          />
        )
      case 'horses':
        return (
          <FlatList
            data={filteredHorses}
            renderItem={renderHorseItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyState('horses')}
            contentContainerStyle={styles.listContent}
          />
        )
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#C17A47" />
        <ActivityIndicator size="large" color="white" />
        <Text style={styles.loadingText}>Loading data...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C17A47" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: safeArea.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Horse Selection</Text>
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
            placeholder={
              activeTab === 'owners' ? "Search owners..." :
              activeTab === 'applications' ? "Search applications..." :
              "Search horses..."
            }
            placeholderTextColor="#999"
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Text style={styles.searchIconText}>✕</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity>
              <Text style={styles.searchIconText}>🔍</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'owners' && styles.activeTab]}
            onPress={() => setActiveTab('owners')}
          >
            <Text style={[styles.tabText, activeTab === 'owners' && styles.activeTabText]}>
              Owners ({horseOwners.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'applications' && styles.activeTab]}
            onPress={() => setActiveTab('applications')}
          >
            <Text style={[styles.tabText, activeTab === 'applications' && styles.activeTabText]}>
              Applications ({myApplications.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'horses' && styles.activeTab]}
            onPress={() => setActiveTab('horses')}
          >
            <Text style={[styles.tabText, activeTab === 'horses' && styles.activeTabText]}>
              Horses ({approvedHorses.filter(h => h.can_select && h.owner_approved).length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* Owner Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={ownerDetailModal}
        onRequestClose={() => setOwnerDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedOwnerForDetail && (
              <>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setOwnerDetailModal(false)}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Owner Details</Text>
                  <View style={{ width: 24 }} />
                </View>
                
                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <View style={styles.ownerDetailHeader}>
                    {selectedOwnerForDetail.image ? (
                      <TouchableOpacity
                        onPress={() => {
                          if (selectedOwnerForDetail.image) {
                            setFullScreenImage(cleanImageUrl(selectedOwnerForDetail.image))
                            setOwnerDetailModal(false)
                          }
                        }}
                        activeOpacity={0.9}
                      >
                        <Image 
                          source={{ uri: cleanImageUrl(selectedOwnerForDetail.image) }} 
                          style={styles.ownerDetailAvatar}
                        />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.ownerDetailAvatarPlaceholder}>
                        <Text style={styles.ownerDetailInitials}>
                          {selectedOwnerForDetail.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </Text>
                      </View>
                    )}
                    
                    <Text style={styles.ownerDetailName}>
                      {selectedOwnerForDetail.full_name}
                    </Text>
                    
                    <View style={styles.ownerDetailStatus}>
                      {selectedOwnerForDetail.is_approved ? (
                        <View style={styles.statusBadgeApproved}>
                          <Text style={styles.statusBadgeText}>✓ Approved</Text>
                        </View>
                      ) : selectedOwnerForDetail.has_pending_application ? (
                        <View style={styles.statusBadgePending}>
                          <Text style={styles.statusBadgeText}>⏳ Pending</Text>
                        </View>
                      ) : (
                        <View style={styles.statusBadgeNotApplied}>
                          <Text style={styles.statusBadgeText}>Not Applied</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Owner Information</Text>
                    {selectedOwnerForDetail.email ? (
                      <View style={styles.detailItem}>
                        <MaterialIcons name="email" size={20} color="#666" />
                        <Text style={styles.detailText}>{selectedOwnerForDetail.email}</Text>
                      </View>
                    ) : null}
                    {selectedOwnerForDetail.phone ? (
                      <View style={styles.detailItem}>
                        <MaterialIcons name="phone" size={20} color="#666" />
                        <Text style={styles.detailText}>{selectedOwnerForDetail.phone}</Text>
                      </View>
                    ) : null}
                    {selectedOwnerForDetail.address ? (
                      <View style={styles.detailItem}>
                        <MaterialIcons name="location-on" size={20} color="#666" />
                        <Text style={styles.detailText} numberOfLines={3}>
                          {selectedOwnerForDetail.address}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>
                      Horses ({selectedOwnerForDetail.total_horses})
                    </Text>
                    {selectedOwnerForDetail.available_horses && selectedOwnerForDetail.available_horses.length > 0 ? (
                      selectedOwnerForDetail.available_horses.map((horse: any) => (
                        <View key={horse.horse_id} style={styles.horseListItem}>
                          <Text style={styles.horseListItemName}>{horse.horse_name}</Text>
                          <Text style={styles.horseListItemDetails}>
                            {horse.horse_breed} • {horse.horse_age} years • {horse.horse_color}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noHorsesText}></Text>
                    )}
                  </View>
                  
                  {!selectedOwnerForDetail.is_approved && !selectedOwnerForDetail.has_pending_application && (
                    <TouchableOpacity
                      style={styles.applyNowButton}
                      onPress={() => {
                        setOwnerDetailModal(false)
                        handleApplyToOwner(selectedOwnerForDetail)
                      }}
                      disabled={isApplying}
                    >
                      <Text style={styles.applyNowButtonText}>
                        {isApplying ? 'Applying...' : 'Apply Now'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  
                  {selectedOwnerForDetail.is_approved && (
                    <TouchableOpacity
                      style={styles.viewHorsesButton}
                      onPress={() => {
                        setOwnerDetailModal(false)
                        setActiveTab('horses')
                      }}
                    >
                      <Text style={styles.viewHorsesButtonText}>View Available Horses</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Full Screen Image Modal */}
      <Modal
        visible={fullScreenImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullScreenImage(null)}
      >
        <View style={styles.fullScreenContainer}>
          <TouchableOpacity 
            style={[
              styles.fullScreenCloseButton, 
              { top: getSafeAreaPadding().top + scale(20) }
            ]} 
            onPress={() => setFullScreenImage(null)}
          >
            <Text style={styles.fullScreenCloseText}>✕</Text>
          </TouchableOpacity>
          {fullScreenImage && (
            <Image source={{ uri: fullScreenImage }} style={styles.fullScreenImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* Loading Overlay for Assigning */}
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
    paddingBottom: dynamicSpacing(8),
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(16),
  },
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
    marginBottom: verticalScale(12),
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(15),
    color: "#333",
    paddingVertical: 0,
  },
  searchIconText: {
    fontSize: moderateScale(18),
    color: "#666",
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#C17A47',
    paddingHorizontal: scale(8),
  },
  tab: {
    flex: 1,
    paddingVertical: verticalScale(12),
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: 'white',
  },
  tabText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: moderateScale(12),
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    backgroundColor: "white",
  },
  listContent: {
    paddingVertical: dynamicSpacing(16),
    paddingBottom: dynamicSpacing(80),
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(32),
  },
  errorTitle: {
    fontSize: moderateScale(20),
    fontWeight: '600',
    color: '#333',
    marginTop: verticalScale(16),
  },
  errorMessage: {
    fontSize: moderateScale(14),
    color: '#666',
    marginTop: verticalScale(8),
    textAlign: 'center',
    lineHeight: moderateScale(20),
  },
  retryButton: {
    backgroundColor: '#C17A47',
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    borderRadius: scale(25),
    marginTop: verticalScale(20),
  },
  retryButtonText: {
    color: 'white',
    fontSize: moderateScale(14),
    fontWeight: '600',
  },

  // Owner Card Styles
  ownerCard: {
    backgroundColor: 'white',
    borderRadius: scale(12),
    padding: scale(16),
    marginHorizontal: scale(16),
    marginVertical: verticalScale(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ownerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerAvatar: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    backgroundColor: '#F0F0F0',
  },
  ownerAvatarPlaceholder: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    backgroundColor: '#C17A47',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerInitials: {
    color: 'white',
    fontSize: moderateScale(18),
    fontWeight: 'bold',
  },
  ownerInfo: {
    flex: 1,
    marginLeft: scale(12),
  },
  ownerName: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#333',
  },
  ownerHorsesCount: {
    fontSize: moderateScale(12),
    color: '#666',
    marginTop: verticalScale(2),
  },
  ownerContact: {
    fontSize: moderateScale(12),
    color: '#999',
    marginTop: verticalScale(2),
  },
  ownerActions: {
    marginLeft: scale(8),
  },
  applyButton: {
    backgroundColor: '#C17A47',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(6),
    borderRadius: scale(20),
  },
  applyButtonText: {
    color: 'white',
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  approvedBadge: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    borderRadius: scale(20),
  },
  approvedText: {
    color: 'white',
    fontSize: moderateScale(12),
    fontWeight: '600',
    marginLeft: scale(4),
  },
  pendingBadge: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    borderRadius: scale(20),
  },
  pendingText: {
    color: 'white',
    fontSize: moderateScale(12),
    fontWeight: '600',
    marginLeft: scale(4),
  },
  ownerFooter: {
    marginTop: verticalScale(12),
    paddingTop: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  ownerAddress: {
    fontSize: moderateScale(12),
    color: '#666',
  },

  // Application Card Styles
  applicationCard: {
    backgroundColor: 'white',
    borderRadius: scale(12),
    padding: scale(16),
    marginHorizontal: scale(16),
    marginVertical: verticalScale(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  applicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  applicationInfo: {
    flex: 1,
    marginLeft: scale(12),
  },
  applicationOwner: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#333',
  },
  applicationDate: {
    fontSize: moderateScale(12),
    color: '#666',
    marginTop: verticalScale(2),
  },
  applicationStatusContainer: {
    marginTop: verticalScale(12),
  },
  applicationStatus: {
    fontSize: moderateScale(14),
    fontWeight: '500',
  },
  applicationNotes: {
    fontSize: moderateScale(12),
    color: '#666',
    marginTop: verticalScale(8),
    fontStyle: 'italic',
  },
  applicationReviewDate: {
    fontSize: moderateScale(11),
    color: '#999',
    marginTop: verticalScale(4),
  },

  // Horse Card Styles
  horseCard: {
    backgroundColor: 'white',
    borderRadius: scale(12),
    padding: scale(16),
    marginHorizontal: scale(16),
    marginVertical: verticalScale(8),
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  horseCardDisabled: {
    opacity: 0.6,
  },
  notApprovedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: scale(12),
    zIndex: 1,
  },
  notApprovedText: {
    color: 'white',
    fontSize: moderateScale(12),
    fontWeight: '600',
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    borderRadius: scale(4),
  },
  horseImage: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(8),
    backgroundColor: '#F0F0F0',
  },
  horseInfo: {
    flex: 1,
    marginLeft: scale(12),
  },
  horseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  horseName: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  horseDetails: {
    fontSize: moderateScale(12),
    color: '#666',
    marginTop: verticalScale(2),
  },
  horseOwner: {
    fontSize: moderateScale(12),
    color: '#999',
    marginTop: verticalScale(4),
  },
  notAvailableText: {
    fontSize: moderateScale(11),
    color: '#F44336',
    marginTop: verticalScale(4),
    fontStyle: 'italic',
  },
  horseAction: {
    marginLeft: scale(8),
  },
  selectHorseButton: {
    backgroundColor: '#C17A47',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
  },
  selectHorseButtonText: {
    color: 'white',
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  assignedBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: scale(12),
    marginLeft: scale(8),
  },
  assignedBadgeText: {
    color: 'white',
    fontSize: moderateScale(10),
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(60),
    paddingHorizontal: scale(32),
  },
  emptyStateText: {
    fontSize: moderateScale(18),
    color: '#666',
    marginTop: verticalScale(16),
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: moderateScale(14),
    color: '#999',
    marginTop: verticalScale(8),
    textAlign: 'center',
    lineHeight: moderateScale(20),
  },
  browseOwnersButton: {
    backgroundColor: '#C17A47',
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    borderRadius: scale(25),
    marginTop: verticalScale(20),
  },
  browseOwnersButtonText: {
    color: 'white',
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  // Add this to your styles
  alreadyAssignedText: {
    fontSize: moderateScale(11),
    color: '#4CAF50',
    marginTop: verticalScale(4),
    fontStyle: 'italic',
    fontWeight: '500',
  },
  // Owner Detail Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    maxHeight: height * 0.9,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: '#333',
  },
  modalClose: {
    fontSize: moderateScale(24),
    color: '#666',
  },
  modalBody: {
    padding: scale(20),
  },
  ownerDetailHeader: {
    alignItems: 'center',
    marginBottom: verticalScale(24),
  },
  ownerDetailAvatar: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: '#F0F0F0',
  },
  ownerDetailAvatarPlaceholder: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: '#C17A47',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerDetailInitials: {
    color: 'white',
    fontSize: moderateScale(28),
    fontWeight: 'bold',
  },
  ownerDetailName: {
    fontSize: moderateScale(20),
    fontWeight: '600',
    color: '#333',
    marginTop: verticalScale(12),
    textAlign: 'center',
  },
  ownerDetailStatus: {
    marginTop: verticalScale(8),
  },
  statusBadgeApproved: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(6),
    borderRadius: scale(20),
  },
  statusBadgePending: {
    backgroundColor: '#FF9800',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(6),
    borderRadius: scale(20),
  },
  statusBadgeNotApplied: {
    backgroundColor: '#666',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(6),
    borderRadius: scale(20),
  },
  statusBadgeText: {
    color: 'white',
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  detailSection: {
    marginBottom: verticalScale(24),
  },
  detailSectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#333',
    marginBottom: verticalScale(12),
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  detailText: {
    fontSize: moderateScale(14),
    color: '#666',
    marginLeft: scale(12),
    flex: 1,
    lineHeight: moderateScale(20),
  },
  horseListItem: {
    backgroundColor: '#F8F8F8',
    padding: scale(12),
    borderRadius: scale(8),
    marginBottom: verticalScale(8),
  },
  horseListItemName: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: '#333',
  },
  horseListItemDetails: {
    fontSize: moderateScale(12),
    color: '#666',
    marginTop: verticalScale(2),
  },
  noHorsesText: {
    fontSize: moderateScale(14),
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: verticalScale(12),
  },
  applyNowButton: {
    backgroundColor: '#C17A47',
    paddingVertical: verticalScale(16),
    borderRadius: scale(12),
    alignItems: 'center',
    marginTop: verticalScale(8),
  },
  applyNowButtonText: {
    color: 'white',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  viewHorsesButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: verticalScale(16),
    borderRadius: scale(12),
    alignItems: 'center',
    marginTop: verticalScale(8),
  },
  viewHorsesButtonText: {
    color: 'white',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },

  // Full Screen Image Modal Styles
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenCloseButton: {
    position: 'absolute',
    right: scale(20),
    zIndex: 10,
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenCloseText: {
    color: 'white',
    fontSize: moderateScale(24),
    fontWeight: '600',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },

  // Loading Overlay
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
    borderRadius: scale(12),
    alignItems: 'center',
    shadowColor: '#000',
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
    color: '#333',
    marginTop: verticalScale(12),
  },
})