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

const API_BASE_URL = "https://echo-ebl8.onrender.com/api/kutsero"

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

  // Load user data on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true)
        setConnectionError(null)
        
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

      console.log("🟡 DEBUG [loadApprovedHorses]: Loading for kutsero_id:", kutsero_id)
      
      const url = `${API_BASE_URL}/approved_horses/?kutsero_id=${encodeURIComponent(kutsero_id)}`
      console.log("🟡 DEBUG: URL:", url)
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
      })
      
      console.log("🟡 DEBUG: Response status:", response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log("🟡 DEBUG: Response data:", data)
        
        if (data.success) {
          const horses = data.horses || []
          console.log(`🟡 DEBUG: Found ${horses.length} horses`)
          
          const transformedHorses: AvailableHorse[] = horses
            .filter((horse: any) => {
              const horseStatus = horse.status || horse.horse_status || ''
              const isDeceased = horseStatus.toLowerCase() === 'deceased'
              
              if (isDeceased) {
                console.log(`Filtering out deceased horse: ${horse.name || horse.horse_name}`)
                return false
              }
              return true
            })
            .map((horse: any) => {
              const isAssigned = horse.is_assigned || false
              const isAssignedToMe = horse.is_assigned_to_me || false
              
              // Allow selecting any horse from approved owners
              const canSelect = true // Always allow selection since we handle switching in the backend
              
              return {
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
                is_assigned: isAssigned,
                is_assigned_to_me: isAssignedToMe,
                can_select: canSelect,
                owner_approved: true
              }
            })
          
          console.log("🟡 DEBUG: Transformed horses:", transformedHorses)
          setApprovedHorses(transformedHorses)
        } else {
          console.log("API returned success false:", data.error || "Unknown error")
          setApprovedHorses([])
        }
      } else {
        console.log("API error status:", response.status)
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
      `Are you sure you want to apply to ${owner.full_name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Apply", 
          onPress: () => proceedWithApplication(owner) 
        }
      ]
    )
  }

  const proceedWithApplication = async (owner: HorseOwner) => {
    if (!userData?.profile?.kutsero_id) {
      Alert.alert("Error", "User information not available")
      return
    }

    setIsApplying(true)

    try {
      const payload = {
        op_id: owner.op_id,
        kutsero_id: userData.profile.kutsero_id
      }

      console.log("DEBUG: Sending application", payload)

      const response = await fetch(
        `${API_BASE_URL}/apply_to_owner/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload)
        }
      )

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        console.log("DEBUG: Failed to parse JSON response")
        const textResponse = await response.text()
        console.log("DEBUG: Raw response:", textResponse)
        throw new Error(`Invalid response from server: ${textResponse}`)
      }

      console.log("DEBUG: Status:", response.status)
      console.log("DEBUG: Data:", data)

      if (response.ok && data.success) {
        Alert.alert(
          "Application Submitted",
          `Your application to ${owner.full_name} has been submitted.`,
          [{
            text: "OK",
            onPress: () => {
              refreshData()
              setActiveTab("applications")
            }
          }]
        )
      } else {
        let errorMessage = data.error || "Failed to submit application"

        if (typeof errorMessage === 'string') {
          if (errorMessage.includes("'message':")) {
            try {
              const cleaned = errorMessage.replace(/'/g, '"')
              const parsed = JSON.parse(cleaned)
              errorMessage = parsed.message || errorMessage
            } catch (e) {
              const match = errorMessage.match(/message': '([^']+)'/)
              if (match && match[1]) {
                errorMessage = match[1]
              }
            }
          }
        }

        Alert.alert("Application Failed", errorMessage)
      }

    } catch (error: any) {
      console.error("Apply error:", error)
      Alert.alert(
        "Error",
        error.message || "Failed to submit application. Please check your connection."
      )
    } finally {
      setIsApplying(false)
    }
  }

const handleSelectHorse = (horse: AvailableHorse) => {
  if (!userData || !userData.profile?.kutsero_id) {
    Alert.alert("Error", "User information not available")
    return
  }

  if (!horse.owner_approved) {
    Alert.alert("Owner Not Approved", "You need to be approved by this horse's owner first.")
    return
  }

  // Check if this is the current horse
  if (horse.is_assigned_to_me) {
    Alert.alert(
      "Already Your Horse",
      `You're already checked in with ${horse.name}.`,
      [{ text: "OK" }]
    )
    return
  }

  // Check if horse is assigned to someone else
  if (horse.is_assigned && !horse.is_assigned_to_me) {
    Alert.alert(
      "Horse Unavailable",
      "This horse is already assigned to another kutsero.",
      [{ text: "OK" }]
    )
    return
  }

  // Check if user already has a horse assigned
  const currentHorse = approvedHorses.find(h => h.is_assigned_to_me)
  
  if (currentHorse) {
    // Show clear switching message
    Alert.alert(
      "Switch Horse",
      `You're currently checked in with ${currentHorse.name}.\n\nDo you want to switch to ${horse.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Switch Horse", 
          onPress: () => assignHorseToKutsero(horse) 
        }
      ]
    )
  } else {
    Alert.alert(
      "Assign Horse",
      `Do you want to assign ${horse.name} to yourself?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Assign Horse", 
          onPress: () => assignHorseToKutsero(horse) 
        }
      ]
    )
  }
}

const assignHorseToKutsero = async (horse: AvailableHorse) => {
  if (!userData || !userData.profile?.kutsero_id) {
    Alert.alert("Error", "User information not available")
    return
  }
  
  setIsAssigning(true)
  try {
    console.log("🚀 DEBUG: Starting horse assignment process for:", horse.name)
    
    // Check if this is the current horse
    if (horse.is_assigned_to_me) {
      Alert.alert(
        "Already Assigned",
        `You're already checked in with ${horse.name}.`,
        [{ text: "OK" }]
      )
      setIsAssigning(false)
      return
    }
    
    // Check if horse is assigned to someone else
    if (horse.is_assigned && !horse.is_assigned_to_me) {
      Alert.alert(
        "Horse Unavailable",
        "This horse is already assigned to another kutsero.",
        [{ text: "OK" }]
      )
      setIsAssigning(false)
      return
    }
    
    // First, let's test if any endpoint works
    console.log("🟡 DEBUG: Testing API endpoints...")
    
    // Try to find the correct endpoint
    const testEndpoints = [
      `${API_BASE_URL}/assign_horse_to_kutsero/`,
      `${API_BASE_URL}/assign_horse_to_kutsero`,
      `${API_BASE_URL}/assign_horse/`,
      `${API_BASE_URL}/assign/`,
    ]
    
    let workingEndpoint = null
    
    for (const endpoint of testEndpoints) {
      try {
        console.log(`🟡 DEBUG: Testing endpoint: ${endpoint}`)
        const testResponse = await fetch(endpoint, {
          method: "OPTIONS", // Use OPTIONS to check if endpoint exists
          headers: {
            "Content-Type": "application/json",
          },
        })
        
        console.log(`🟡 DEBUG: Endpoint ${endpoint} status: ${testResponse.status}`)
        
        if (testResponse.status !== 404) {
          workingEndpoint = endpoint
          console.log(`✅ DEBUG: Found working endpoint: ${endpoint}`)
          break
        }
      } catch (err) {
        console.log(`❌ DEBUG: Endpoint ${endpoint} error:`, err)
      }
    }
    
    if (!workingEndpoint) {
      console.log("❌ DEBUG: No working endpoints found, checking what's available...")
      
      // Try to get available endpoints from the API
      try {
        const apiInfoResponse = await fetch(API_BASE_URL, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })
        
        if (apiInfoResponse.ok) {
          const apiInfo = await apiInfoResponse.text()
          console.log("🟡 DEBUG: API base response:", apiInfo.substring(0, 500))
        }
      } catch (err) {
        console.log("❌ DEBUG: Could not get API info:", err)
      }
      
      Alert.alert(
        "API Error",
        "Horse assignment endpoint not found. Please contact support.",
        [{ text: "OK" }]
      )
      return
    }
    
    console.log(`✅ DEBUG: Using endpoint: ${workingEndpoint}`)
    
    const response = await fetch(workingEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        kutsero_id: userData.profile.kutsero_id,
        horse_id: horse.id,
        op_id: horse.owner_id,
        date_start: new Date().toISOString()
      })
    })
    
    const responseText = await response.text()
    console.log("DEBUG: Response status:", response.status)
    console.log("DEBUG: Response text:", responseText)
    
    if (response.status === 404) {
      // Still 404 even with this endpoint
      console.log("❌ DEBUG: Endpoint still returns 404")
      
      // Try a different approach - check if we can use a different method
      Alert.alert(
        "Endpoint Not Found",
        "The horse assignment feature is currently unavailable. Please try:\n\n1. Contacting support\n2. Trying again later\n3. Using the web interface",
        [{ text: "OK" }]
      )
      return
    }
    
    // Check if response is HTML error page
    if (responseText.trim().startsWith('<!') || responseText.includes('<html>') || responseText.includes('<!DOCTYPE')) {
      console.error("❌ DEBUG: Server returned HTML instead of JSON")
      
      // Try to parse HTML for more info
      if (responseText.includes('Internal Server Error')) {
        Alert.alert(
          "Server Error",
          "Internal server error. Please try again later.",
          [{ text: "OK" }]
        )
      } else {
        Alert.alert(
          "Server Error",
          `Server returned an error page (Status: ${response.status})`,
          [{ text: "OK" }]
        )
      }
      return
    }
    
    let data: any
    try {
      data = JSON.parse(responseText)
      console.log("✅ DEBUG: Successfully parsed JSON response:", data)
    } catch (parseError) {
      console.error("❌ DEBUG: Failed to parse JSON:", parseError)
      console.log("❌ DEBUG: Raw response:", responseText)
      
      // Check if it's a success message in plain text
      if (responseText.toLowerCase().includes('success') || responseText.toLowerCase().includes('assigned')) {
        Alert.alert(
          "Success",
          "Horse assigned successfully!",
          [
            {
              text: "OK",
              onPress: () => {
                refreshData()
                router.back()
              }
            }
          ]
        )
        refreshData()
        return
      }
      
      Alert.alert(
        "Server Error",
        "Server returned an unexpected response format.",
        [{ text: "OK" }]
      )
      return
    }
    
    if (response.ok) {
      // Check for success
      if (data.success === true || data.assignment?.assign_id || data.message) {
        console.log("✅ Horse assignment successful!")
        
        let message = data.message || "Horse assigned successfully!"
        
        // Show appropriate message
        if (data.previous_assignments_ended > 0 || message.includes('switched')) {
          message = `Successfully switched to ${horse.name}!`
        }
        
        Alert.alert(
          "Success", 
          message,
          [
            {
              text: "OK",
              onPress: () => {
                // Refresh data and go back
                refreshData()
                setTimeout(() => router.back(), 500)
              }
            }
          ]
        )
        
        // Refresh data to update UI
        refreshData()
      } else {
        // Handle unexpected response
        console.log("⚠️ DEBUG: Unexpected response format:", data)
        
        // If there's no error but also no clear success, assume it worked
        if (!data.error) {
          Alert.alert(
            "Success",
            `${horse.name} has been assigned to you!`,
            [{ 
              text: "OK",
              onPress: () => {
                refreshData()
                router.back()
              }
            }]
          )
          refreshData()
        } else if (data.error.includes('already assigned to you')) {
          Alert.alert(
            "Already Assigned",
            `You're already assigned to ${horse.name}.`,
            [{ text: "OK" }]
          )
        } else {
          Alert.alert(
            "Notice",
            data.message || data.error || "Horse assignment completed",
            [{ 
              text: "OK",
              onPress: () => refreshData()
            }]
          )
        }
      }
    } else {
      // Handle error responses
      let errorMessage = data.error || data.message || `Failed to assign horse (Status: ${response.status})`
      
      console.log("❌ DEBUG: Assignment failed with error:", errorMessage)
      
      // Handle specific error cases
      if (errorMessage.includes('already assigned to you')) {
        Alert.alert(
          "Already Assigned",
          `You're already assigned to ${horse.name}.`,
          [{ text: "OK" }]
        )
      } else if (errorMessage.includes('already assigned to another kutsero')) {
        Alert.alert(
          "Horse Unavailable",
          "This horse is already assigned to another kutsero.",
          [{ text: "OK" }]
        )
      } else if (errorMessage.includes('not approved by this horse owner')) {
        Alert.alert(
          "Not Approved",
          "You are not approved by this horse's owner.",
          [{ text: "OK" }]
        )
      } else if (errorMessage.includes('Horse not found')) {
        Alert.alert(
          "Horse Not Found",
          "The selected horse could not be found.",
          [{ text: "OK" }]
        )
      } else {
        Alert.alert("Error", errorMessage, [{ text: "OK" }])
      }
    }
    
  } catch (error: any) {
    console.error("❌ Error in assignHorseToKutsero:", error)
    
    // Check if it's a network error
    if (error.message && (
      error.message.includes('Network') || 
      error.message.includes('network') ||
      error.message.includes('fetch') ||
      error.message.includes('Failed to fetch')
    )) {
      Alert.alert(
        "Network Error", 
        "Failed to connect to server. Please check your internet connection and try again.",
        [{ text: "OK" }]
      )
    } else {
      Alert.alert(
        "Error", 
        error.message || "An unexpected error occurred. Please try again.",
        [{ text: "OK" }]
      )
    }
  } finally {
    setIsAssigning(false)
  }
}

// Separate function to handle forced switching
const forceSwitchHorse = async (horse: AvailableHorse) => {
  if (!userData || !userData.profile?.kutsero_id) return
  
  setIsAssigning(true)
  try {
    console.log("🔄 DEBUG: Attempting forced switch to:", horse.name)
    
    // First, try to end any current assignment
    const endResponse = await fetch(`${API_BASE_URL}/end_current_assignment/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        kutsero_id: userData.profile.kutsero_id
      })
    })
    
    const endText = await endResponse.text()
    console.log("DEBUG: End assignment response:", endText)
    
    let endData: any
    try {
      endData = JSON.parse(endText)
    } catch {
      console.log("DEBUG: Could not parse end assignment response")
    }
    
    // Wait a moment for the database to update
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Now try to assign the new horse
    const assignResponse = await fetch(`${API_BASE_URL}/assign_horse_to_kutsero`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        kutsero_id: userData.profile.kutsero_id,
        horse_id: horse.id,
        op_id: horse.owner_id,
        date_start: new Date().toISOString()
      })
    })
    
    const assignText = await assignResponse.text()
    console.log("DEBUG: Assign response:", assignText)
    
    if (assignResponse.ok) {
      let assignData: any
      try {
        assignData = JSON.parse(assignText)
      } catch {
        assignData = {}
      }
      
      Alert.alert(
        "Success",
        `Successfully switched to ${horse.name}!`,
        [
          {
            text: "OK",
            onPress: () => {
              refreshData()
              router.back()
            }
          }
        ]
      )
      
      refreshData()
    } else {
      throw new Error("Failed to assign new horse after ending current assignment")
    }
    
  } catch (error) {
    console.error("Error in forceSwitchHorse:", error)
    Alert.alert("Error", "Failed to switch horses. Please try again or contact support.")
  } finally {
    setIsAssigning(false)
  }
}

  // Alternative method if endpoints don't work
  const handleHorseAssignmentManually = async (horse: AvailableHorse) => {
    try {
      if (!userData || !userData.profile?.kutsero_id) return
      
      console.log("🛠️ DEBUG: Using manual assignment approach")
      
      // For now, just show a message and refresh
      // In a real implementation, you would make direct Supabase calls here
      Alert.alert(
        "Info",
        `Horse assignment feature is being updated. To assign ${horse.name}, please contact support or try again later.`,
        [{ 
          text: "OK",
          onPress: () => refreshData()
        }]
      )
      
    } catch (error) {
      console.error("Error in manual assignment:", error)
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

  const renderHorseItem = ({ item }: { item: AvailableHorse }) => {
    const hasAssignedHorse = approvedHorses.some(h => h.is_assigned_to_me)
    const isCurrentHorse = item.is_assigned_to_me
    
    return (
      <TouchableOpacity
        style={[
          styles.horseCard,
          (!item.owner_approved || (item.is_assigned && !item.is_assigned_to_me)) && styles.horseCardDisabled
        ]}
        onPress={() => {
          if (item.owner_approved && (!item.is_assigned || item.is_assigned_to_me)) {
            handleSelectHorse(item)
          }
        }}
        disabled={!item.owner_approved || (item.is_assigned && !item.is_assigned_to_me)}
        activeOpacity={(item.owner_approved && (!item.is_assigned || item.is_assigned_to_me)) ? 0.7 : 1}
      >
        {!item.owner_approved && (
          <View style={styles.notApprovedOverlay}>
            <Text style={styles.notApprovedText}>Owner Not Approved</Text>
          </View>
        )}
        
        {item.is_assigned && !item.is_assigned_to_me && (
          <View style={styles.assignedToOtherOverlay}>
            <Text style={styles.assignedToOtherText}>Assigned to Another</Text>
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
              <View style={[
                styles.assignedBadge,
                item.is_assigned_to_me ? styles.myHorseBadge : styles.otherAssignedBadge
              ]}>
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
          
          {isCurrentHorse && (
            <Text style={styles.currentHorseText}>
              ✓ Currently checked in with this horse
            </Text>
          )}
        </View>
        
        <View style={styles.horseAction}>
          {item.owner_approved && (!item.is_assigned || item.is_assigned_to_me) ? (
            <TouchableOpacity
              style={[
                styles.selectHorseButton,
                hasAssignedHorse && !isCurrentHorse && styles.switchHorseButton,
                isCurrentHorse && styles.currentHorseButton
              ]}
              onPress={() => handleSelectHorse(item)}
              disabled={isAssigning || isCurrentHorse}
            >
              <Text style={styles.selectHorseButtonText}>
                {isAssigning ? '...' : 
                 isCurrentHorse ? 'Current' :
                 hasAssignedHorse ? 'Switch' : 'Select'}
              </Text>
            </TouchableOpacity>
          ) : (
            <MaterialIcons 
              name={item.is_assigned && !item.is_assigned_to_me ? "block" : "lock"} 
              size={24} 
              color="#999" 
            />
          )}
        </View>
      </TouchableOpacity>
    )
  }

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
              Horses ({approvedHorses.filter(h => !h.is_assigned || h.is_assigned_to_me).length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {renderContent()}
      </View>

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
    shadowOffset: { width: 0, height: 2 },
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
    opacity: 0.7,
  },
  notApprovedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
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
  assignedToOtherOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: scale(12),
    zIndex: 1,
  },
  assignedToOtherText: {
    color: '#F44336',
    fontSize: moderateScale(12),
    fontWeight: '600',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
  horseAction: {
    marginLeft: scale(8),
  },
  selectHorseButton: {
    backgroundColor: '#C17A47',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
  },
  switchHorseButton: {
    backgroundColor: '#FF9800',
  },
  currentHorseButton: {
    backgroundColor: '#4CAF50',
  },
  selectHorseButtonText: {
    color: 'white',
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  assignedBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: scale(12),
    marginLeft: scale(8),
  },
  myHorseBadge: {
    backgroundColor: '#4CAF50',
  },
  otherAssignedBadge: {
    backgroundColor: '#FF6B6B',
  },
  assignedBadgeText: {
    color: 'white',
    fontSize: moderateScale(10),
    fontWeight: '600',
  },
  currentHorseText: {
    fontSize: moderateScale(11),
    color: '#4CAF50',
    marginTop: verticalScale(4),
    fontStyle: 'italic',
    fontWeight: '600',
  },
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
    shadowOffset: { width: 0, height: 4 },
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