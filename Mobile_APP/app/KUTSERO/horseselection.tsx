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

interface Owner {
  id: string
  name: string
  username?: string
  firstName?: string
  lastName?: string
  middleName?: string
  email?: string
  phone?: string
  address?: string
  totalHorses: number
  availableHorses: number
  image?: string
  isApproved: boolean
  approvalStatus: "pending" | "approved" | "rejected"
  hasApplied?: boolean
  applicationDate?: string
  approvalDate?: string
  rejectionDate?: string
  rejectionReason?: string
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
  ownerId: string
  ownerName: string
  assignmentStatus?: "available" | "assigned"
  currentAssignmentId?: string
  lastCheckup?: string
  nextCheckup?: string
  assignmentId?: string
  checkedInAt?: string
  checkedOutAt?: string
  alive?: boolean
  canSelect: boolean
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



// Helper function to fix image URLs
const cleanImageUrl = (url: string | undefined): string => {
  if (!url || url === "" || url === "null" || url === "undefined") {
    return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNGMEYwRjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IlN5c3RlbSIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=="
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

// Helper function to clean owner image URLs
const cleanOwnerImageUrl = (url: string | undefined): string => {
  if (!url || url === "" || url === "null" || url === "undefined") {
    return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNGMEYwRjAiLz48Y2lyY2xlIGN4PSI3NSIgY3k9IjYwIiByPSIzMCIgZmlsbD0iI0NEQ0RDRCIvPjxjaXJjbGUgY3g9Ijc1IiBjeT0iMzAiIHI9IjIwIiBmaWxsPSIjQ0RDRENEIi8+PC9zdmc+"
  }
  
  let cleanUrl = url.split('?')[0]
  const baseStoragePath = "https://drgknejiqupegkyxfaab.supabase.co/storage/v1/object/public/owner_images/"
  
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

// Helper function to test API connectivity
const testAPIConnection = async () => {
  try {
    const response = await fetch(`https://echo-ebl8.onrender.com/api/kutsero/test/`, {
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

// Function to save application to local storage
const saveApplicationToLocalStorage = async (ownerId: string, status: string = "pending") => {
  try {
    const applications = await SecureStore.getItemAsync("owner_applications")
    let applicationsMap = applications ? JSON.parse(applications) : {}
    
    applicationsMap[ownerId] = {
      status,
      appliedAt: new Date().toISOString(),
    }
    
    await SecureStore.setItemAsync("owner_applications", JSON.stringify(applicationsMap))
    console.log("Saved application to local storage for owner:", ownerId)
  } catch (error) {
    console.error("Error saving application to local storage:", error)
  }
}

// Function to load applications from local storage
const loadApplicationsFromLocalStorage = async () => {
  try {
    const applications = await SecureStore.getItemAsync("owner_applications")
    return applications ? JSON.parse(applications) : {}
  } catch (error) {
    console.error("Error loading applications from local storage:", error)
    return {}
  }
}

// Filter types for horses
type HorseFilterType = "all" | "healthy" | "sick" | "deceased" | "available" | "assigned"

// Filter types for owners
type OwnerFilterType = "all" | "approved" | "pending" | "applied"

export default function HorseSelectionScreen() {
  const router = useRouter()
  const [searchText, setSearchText] = useState("")
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null)
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null)
  const [owners, setOwners] = useState<Owner[]>([])
  const [horses, setHorses] = useState<Horse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingHorses, setIsLoadingHorses] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [statsData, setStatsData] = useState({
    total: 0,
    healthy: 0,
    sick: 0,
    deceased: 0,
  })
  const [ownerStatsData, setOwnerStatsData] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    applied: 0,
  })
  const [filterModalVisible, setFilterModalVisible] = useState(false)
  const [horseFilterModalVisible, setHorseFilterModalVisible] = useState(false)
  const [selectedHorseFilter, setSelectedHorseFilter] = useState<HorseFilterType>("all")
  const [selectedOwnerFilter, setSelectedOwnerFilter] = useState<OwnerFilterType>("all")
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<"owners" | "horses">("owners")
  const [retryCount, setRetryCount] = useState(0)
  const safeArea = getSafeAreaPadding()

  // Load user data and owners on mount
  useEffect(() => {
    loadUserDataAndOwners()
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

  const loadUserDataAndOwners = async () => {
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

      // Load owners and sync application status
      await loadAndSyncOwners(unifiedUserData)
      
      // Load current assignment if any
      await loadCurrentAssignment(unifiedUserData.profile?.kutsero_id || unifiedUserData.id)
    } else {
      Alert.alert("Error", "User session not found. Please login again.")
    }
  } catch (error) {
    console.error("Error loading user data and owners:", error)
    Alert.alert("Error", "Failed to load data. Please try again.")
  } finally {
    setIsLoading(false)
  }
}

const loadAndSyncOwners = async (userData: UserData) => {
  try {
    console.log("Loading and syncing owners...")
    
    const kutseroId = userData.profile?.kutsero_id || userData.id
    
    // Try WITHOUT trailing slash first (more common in Django REST)
    let url = `https://echo-ebl8.onrender.com/api/kutsero/get_owners?kutsero_id=${kutseroId}`
    console.log("Full URL (no slash):", url)
    
    let response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    console.log("Owners response status (no slash):", response.status)
    
    // If 404, try WITH trailing slash
    if (response.status === 404) {
      console.log("Trying with trailing slash...")
      url = `https://echo-ebl8.onrender.com/api/kutsero/get_owners/?kutsero_id=${kutseroId}`
      console.log("Full URL (with slash):", url)
      
      response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      console.log("Owners response status (with slash):", response.status)
    }
    
    if (response.ok) {
      const data = await response.json()
      console.log("DEBUG: Full owners response:", JSON.stringify(data, null, 2))
      
      if (data.error) {
        console.error("Backend error:", data.error)
        Alert.alert("Info", "No owners available at the moment.")
        setOwners([])
        return
      }
        
      if (!data.owners || !Array.isArray(data.owners)) {
        console.error("Invalid owners data structure:", data)
        setOwners([])
        return
      }
      
      // Load applications from local storage FIRST
      const applications = await loadApplicationsFromLocalStorage()
      console.log("Loaded applications from local storage:", applications)
      
      // Also try to fetch application status from backend for each owner
      const ownersWithSyncedStatus = await Promise.all(
        data.owners.map(async (owner: any) => {
          // Start with backend data
          let approvalStatus: "pending" | "approved" | "rejected" = "pending"
          let isApproved = false
          let hasApplied = false
          
          // Check backend application status first
          try {
            const statusResponse = await fetch(
              `https://echo-ebl8.onrender.com/api/kutsero/check_application_status?kutsero_id=${kutseroId}&owner_id=${owner.id}`,
              {
                method: "GET",
                headers: { "Content-Type": "application/json" },
              }
            )
            
            if (statusResponse.ok) {
              const statusData = await statusResponse.json()
              console.log(`Backend status for owner ${owner.id}:`, statusData)
              
              if (statusData.status) {
                hasApplied = true
                approvalStatus = statusData.status === "approved" ? "approved" :
                                statusData.status === "rejected" ? "rejected" : "pending"
                isApproved = statusData.status === "approved"
                
                // Update local storage with backend status
                await saveApplicationToLocalStorage(owner.id, statusData.status)
              }
            }
          } catch (statusError) {
            console.error(`Error fetching status for owner ${owner.id}:`, statusError)
          }
          
          // If no backend status, check local storage
          if (!hasApplied) {
            const localApplication = applications[owner.id]
            
            if (localApplication) {
              // Use local storage data
              hasApplied = true
              approvalStatus = localApplication.status === "approved" ? "approved" :
                              localApplication.status === "rejected" ? "rejected" : "pending"
              isApproved = localApplication.status === "approved"
            } else {
              // Fallback to raw backend fields
              hasApplied = owner.hasApplied || owner.application_date || false
              isApproved = owner.isApproved || owner.approvalStatus === "approved" || false
              
              if (isApproved) {
                approvalStatus = "approved"
              } else if (owner.approvalStatus === "rejected") {
                approvalStatus = "rejected"
              } else if (hasApplied) {
                approvalStatus = "pending"
              }
            }
          }
          
          console.log(`Owner ${owner.id} final status:`, {
            hasApplied,
            isApproved,
            approvalStatus,
            name: owner.name
          })
          
          return {
            id: owner.id,
            name: owner.name || `${owner.firstName || ''} ${owner.lastName || ''}`.trim(),
            username: owner.username,
            firstName: owner.firstName,
            lastName: owner.lastName,
            middleName: owner.middleName,
            email: owner.email,
            phone: owner.phone,
            address: owner.address,
            totalHorses: owner.totalHorses || 0,
            availableHorses: owner.availableHorses || 0,
            image: cleanOwnerImageUrl(owner.image),
            isApproved,
            approvalStatus,
            hasApplied,
            applicationDate: owner.applicationDate || owner.application_date,
            approvalDate: owner.approvalDate,
            rejectionDate: owner.rejectionDate,
            rejectionReason: owner.rejectionReason,
          }
        })
      )

      console.log("Synced owners list:", ownersWithSyncedStatus)
      setOwners(ownersWithSyncedStatus)

      // Update owner stats
      const approvedCount = ownersWithSyncedStatus.filter(o => o.approvalStatus === "approved").length
      const pendingCount = ownersWithSyncedStatus.filter(o => o.approvalStatus === "pending").length
      const rejectedCount = ownersWithSyncedStatus.filter(o => o.approvalStatus === "rejected").length
      const notAppliedCount = ownersWithSyncedStatus.filter(o => !o.hasApplied).length
        
      console.log("Owner stats after sync:", { approvedCount, pendingCount, rejectedCount, notAppliedCount })
        
      setOwnerStatsData({
        total: ownersWithSyncedStatus.length,
        approved: approvedCount,
        pending: pendingCount + notAppliedCount,
        applied: pendingCount + rejectedCount,
      })

    } else {
      console.error("HTTP Error:", response.status, response.statusText)
      try {
        const errorText = await response.text()
        console.error("Error response:", errorText)
        
        if (errorText.includes('<!doctype html>')) {
          console.error("ERROR: Received HTML page instead of JSON. This means:")
          console.error("1. The endpoint doesn't exist")
          console.error("2. Check Django URL configuration")
          console.error("3. Check if the view is properly registered")
        }
      } catch (e) {
        console.error("Could not read error response")
      }
        
      if (response.status === 404) {
        Alert.alert(
          "Endpoint Not Found", 
          `The owners endpoint was not found.\n\n` +
          `Tried:\n` +
          `1. https://echo-ebl8.onrender.com/api/kutsero/get_owners\n` +
          `2. https://echo-ebl8.onrender.com/api/kutsero/get_owners/\n\n` +
          `Please check backend URL configuration.`
        )
      } else if (response.status === 500) {
        Alert.alert("Server Error", "There was a problem with the server.")
      } else {
        Alert.alert("Error", `Failed to load owners (${response.status})`)
      }
        
      setOwners([])
    }
  } catch (error) {
    console.error("Network error loading owners:", error)
    Alert.alert(
      "Connection Error", 
      `Cannot connect to server.\n\n` +
      `URL: https://echo-ebl8.onrender.com/api/kutsero/get_owners\n` +
      `Error: ${(error as Error).message}`
    )
    setOwners([])
  }
}

  const loadOwners = async () => {
    try {
      console.log("Loading owners...")
      
      const kutseroId = userData?.profile?.kutsero_id || userData?.id
      let url = `https://echo-ebl8.onrender.com/api/kutsero/get_owners?kutsero_id=${kutseroId}`
      console.log("Full URL:", url)
      
      let response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("Owners response status:", response.status)
      
      if (response.status === 404) {
        url = `https://echo-ebl8.onrender.com/api/kutsero/get_owners/?kutsero_id=${kutseroId}`
        response = await fetch(url, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })
      }
      
      if (response.ok) {
        const data = await response.json()
        console.log("DEBUG: Full owners response:", JSON.stringify(data, null, 2))
        
        if (data.error) {
          console.error("Backend error:", data.error)
          Alert.alert("Info", "No owners available at the moment.")
          setOwners([])
          return
        }
          
        if (!data.owners || !Array.isArray(data.owners)) {
          console.error("Invalid owners data structure:", data)
          setOwners([])
          return
        }
        
        // Load applications from local storage
        const applications = await loadApplicationsFromLocalStorage()
        console.log("Loaded applications from local storage:", applications)
        
        const ownersList: Owner[] = data.owners.map((owner: any) => {
          // Check local storage for application status
          const localApplication = applications[owner.id]
          
          // Determine status based on both backend and local storage
          let hasApplied = false
          let approvalStatus: "pending" | "approved" | "rejected" = "pending"
          let isApproved = false
          
          if (localApplication) {
            // Use local storage data if available
            hasApplied = true
            approvalStatus = localApplication.status === "approved" ? "approved" :
                            localApplication.status === "rejected" ? "rejected" : "pending"
            isApproved = localApplication.status === "approved"
          } else {
            // Fallback to backend data
            hasApplied = owner.hasApplied || owner.application_date || false
            isApproved = owner.isApproved || owner.approvalStatus === "approved" || false
            
            if (isApproved) {
              approvalStatus = "approved"
            } else if (owner.approvalStatus === "rejected") {
              approvalStatus = "rejected"
            } else if (hasApplied) {
              approvalStatus = "pending"
            }
          }
          
          console.log(`Owner ${owner.id} (${owner.name}):`, {
            hasApplied,
            isApproved,
            approvalStatus,
            localApplication,
            rawFields: {
              hasApplied: owner.hasApplied,
              isApproved: owner.isApproved,
              approvalStatus: owner.approvalStatus,
              application_date: owner.application_date,
            }
          })
          
          return {
            id: owner.id,
            name: owner.name || `${owner.firstName || ''} ${owner.lastName || ''}`.trim(),
            username: owner.username,
            firstName: owner.firstName,
            lastName: owner.lastName,
            middleName: owner.middleName,
            email: owner.email,
            phone: owner.phone,
            address: owner.address,
            totalHorses: owner.totalHorses || 0,
            availableHorses: owner.availableHorses || 0,
            image: cleanOwnerImageUrl(owner.image),
            isApproved,
            approvalStatus,
            hasApplied,
            applicationDate: owner.applicationDate || owner.application_date,
            approvalDate: owner.approvalDate,
            rejectionDate: owner.rejectionDate,
            rejectionReason: owner.rejectionReason,
          }
        })

        console.log("Processed owners list:", ownersList)
        setOwners(ownersList)

        // Update owner stats
        const approvedCount = ownersList.filter(o => o.approvalStatus === "approved").length
        const pendingCount = ownersList.filter(o => o.approvalStatus === "pending").length
        const rejectedCount = ownersList.filter(o => o.approvalStatus === "rejected").length
        const notAppliedCount = ownersList.filter(o => !o.hasApplied).length
          
        console.log("Owner stats:", { approvedCount, pendingCount, rejectedCount, notAppliedCount })
          
        setOwnerStatsData({
          total: ownersList.length,
          approved: approvedCount,
          pending: pendingCount + notAppliedCount,
          applied: pendingCount + rejectedCount,
        })

      } else {
        console.error("HTTP Error:", response.status, response.statusText)
        try {
          const errorText = await response.text()
          console.error("Error response:", errorText)
        } catch (e) {
          console.error("Could not read error response")
        }
          
        if (response.status === 404) {
          Alert.alert("Not Found", "The owners endpoint was not found.")
        } else if (response.status === 500) {
          Alert.alert("Server Error", "There was a problem with the server.")
        } else {
          Alert.alert("Error", `Failed to load owners (${response.status})`)
        }
          
        setOwners([])
      }
    } catch (error) {
      console.error("Network error loading owners:", error)
      Alert.alert("Connection Error", "Cannot connect to server. Please check your internet connection.")
      setOwners([])
    }
  }

  // Function to sync application status with backend
  const syncApplicationStatus = async (ownerId: string) => {
    try {
      const kutseroId = userData?.profile?.kutsero_id || userData?.id
      const response = await fetch(
        `https://echo-ebl8.onrender.com/api/kutsero/check_application_status?kutsero_id=${kutseroId}&owner_id=${ownerId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        console.log("Synced application status:", data)
        
        // Update local storage with actual status from backend
        if (data.status) {
          await saveApplicationToLocalStorage(ownerId, data.status)
          
          // Update the owner in the local state
          setOwners(prevOwners =>
            prevOwners.map(o => {
              if (o.id === ownerId) {
                return {
                  ...o,
                  hasApplied: true,
                  approvalStatus: data.status === "approved" ? "approved" : 
                                 data.status === "rejected" ? "rejected" : "pending",
                }
              }
              return o
            })
          )
          
          return data.status
        }
      }
    } catch (error) {
      console.error("Error syncing application status:", error)
    }
    return null
  }

  // Function to load owner horses with better error handling
  const loadOwnerHorsesWithFallback = async (ownerId: string) => {
    try {
      await loadOwnerHorses(ownerId)
    } catch (error) {
      console.error("Error in loadOwnerHorsesWithFallback:", error)
    }
  }

  const loadOwnerHorses = async (ownerId: string) => {
    try {
      setIsLoadingHorses(true)
      console.log("Loading horses for owner:", ownerId)
      
      const kutseroId = userData?.profile?.kutsero_id || userData?.id
      let url = `https://echo-ebl8.onrender.com/api/kutsero/get_owner_horses?owner_id=${ownerId}&kutsero_id=${kutseroId}`
      console.log("Full URL for horses:", url)
      
      let response = await fetch(
        url,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      )

      console.log("Owner horses response status:", response.status)
      
      if (response.status === 404) {
        url = `https://echo-ebl8.onrender.com/api/kutsero/get_owner_horses/?owner_id=${ownerId}&kutsero_id=${kutseroId}`
        response = await fetch(url, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })
      }
      
      // Try to read the response text first for debugging
      let responseText = ""
      try {
        responseText = await response.text()
        console.log("Raw response text (first 1000 chars):", responseText.substring(0, 1000))
      } catch (textError) {
        console.error("Could not read response text:", textError)
      }

      if (response.ok) {
        let data
        try {
          data = JSON.parse(responseText)
          console.log("DEBUG: Parsed horses data structure:", {
            hasHorses: !!data.horses,
            horsesType: Array.isArray(data.horses) ? 'array' : typeof data.horses,
            horsesLength: Array.isArray(data.horses) ? data.horses.length : 'not array',
            dataKeys: Object.keys(data),
            stats: data.stats
          })
        } catch (parseError) {
          console.error("Failed to parse JSON response:", parseError, "\nResponse text:", responseText)
          Alert.alert(
            "Data Format Error",
            "Received invalid data from server. Please try again.",
            [{ text: "OK" }]
          )
          setHorses([])
          setStatsData({ total: 0, healthy: 0, sick: 0, deceased: 0 })
          return
        }
        
        // Handle case when no horses are returned - check both possible keys
        const horsesData = data.horses || data.horses_list || []
        
        if (!Array.isArray(horsesData)) {
          console.log("Horses data is not an array:", horsesData)
          Alert.alert(
            "Data Error",
            "Invalid data format received from server.",
            [{ text: "OK" }]
          )
          setHorses([])
          setStatsData({ total: 0, healthy: 0, sick: 0, deceased: 0 })
          return
        }
        
        if (horsesData.length === 0) {
          console.log("No horses data returned")
          Alert.alert(
            "No Horses Available",
            "This owner doesn't have any horses registered yet.",
            [{ text: "OK" }]
          )
          setHorses([])
          
          // Use stats from backend if available
          if (data.stats) {
            setStatsData({
              total: data.stats.total || 0,
              healthy: data.stats.healthy || 0,
              sick: data.stats.sick || 0,
              deceased: data.stats.deceased || 0,
            })
          } else {
            setStatsData({ total: 0, healthy: 0, sick: 0, deceased: 0 })
          }
          
          return
        }
        
        console.log("Processing", horsesData.length, "horses")
        
        const horsesList: Horse[] = horsesData.map((horse: any, index: number) => {
          console.log(`Horse ${index + 1}:`, {
            id: horse.id,
            name: horse.name,
            healthStatus: horse.healthStatus,
            canSelect: horse.canSelect,
            assignmentStatus: horse.assignmentStatus,
            alive: horse.alive
          })
          
          return {
            id: horse.id || horse.horse_id || `horse-${Math.random()}`,
            name: horse.name || horse.horse_name || "Unnamed Horse",
            healthStatus: horse.healthStatus === "Unhealthy" || horse.health_status === "Unhealthy" ? "Sick" : 
                         (horse.healthStatus === "Deceased" || horse.health_status === "Deceased" ? "Deceased" : 
                         horse.healthStatus || "Healthy"),
            status: horse.status || horse.horse_status || "Unknown",
            image: cleanImageUrl(horse.image || horse.horse_image),
            breed: horse.breed || horse.horse_breed || "Unknown",
            age: horse.age || horse.horse_age || 0,
            color: horse.color || horse.horse_color || "Unknown",
            ownerId: horse.ownerId || horse.owner_id || horse.op_id || ownerId,
            ownerName: horse.ownerName || horse.owner_name || selectedOwner?.name || "Unknown Owner",
            assignmentStatus: horse.assignmentStatus || horse.assignment_status || "available",
            currentAssignmentId: horse.currentAssignmentId || horse.current_assignment_id,
            lastCheckup: horse.lastCheckup || horse.last_checkup,
            nextCheckup: horse.nextCheckup || horse.next_checkup,
            alive: horse.alive !== false,
            canSelect: horse.canSelect || horse.can_select || false,
          }
        })

        console.log("Processed horses list:", horsesList)
        setHorses(horsesList)
        
        // Cache the horses data
        await SecureStore.setItemAsync(`cached_horses_${ownerId}`, JSON.stringify(horsesList))
        
        // Use stats from backend if available, otherwise calculate
        if (data.stats) {
          setStatsData({
            total: data.stats.total || horsesList.length,
            healthy: data.stats.healthy || 0,
            sick: data.stats.sick || 0,
            deceased: data.stats.deceased || 0,
          })
        } else {
          // Calculate stats from horses list
          const deceasedCount = horsesList.filter(h => h.alive === false || h.healthStatus === "Deceased").length
          const sickCount = horsesList.filter(h => h.alive !== false && h.healthStatus === "Sick").length
          const healthyCount = horsesList.filter(h => h.alive !== false && h.healthStatus === "Healthy").length
          
          setStatsData({
            total: horsesList.length,
            healthy: healthyCount,
            sick: sickCount,
            deceased: deceasedCount,
          })
        }

        // Switch to horses section
        setActiveSection("horses")
        
      } else {
        // Handle specific HTTP errors
        console.error("HTTP Error Details:", {
          status: response.status,
          statusText: response.statusText,
          body: responseText
        })
        
        try {
          const errorData = JSON.parse(responseText)
          console.error("Error data from backend:", errorData)
          
          if (errorData.error) {
            Alert.alert(
              "Backend Error",
              `Server error: ${errorData.error}\n\nPlease contact support.`,
              [{ text: "OK" }]
            )
          }
        } catch (e) {
          // Not JSON
        }
        
        if (response.status === 500) {
          Alert.alert(
            "Server Error",
            "The server encountered an error while loading horses. Please try again later.",
            [
              { text: "OK" },
              { text: "Retry", onPress: () => loadOwnerHorses(ownerId) }
            ]
          )
        } else if (response.status === 404) {
          Alert.alert(
            "Not Found",
            "This owner doesn't have any horses registered yet.",
            [{ text: "OK" }]
          )
        } else {
          Alert.alert(
            "Error",
            `Failed to load horses (${response.status}). Please try again.`,
            [
              { text: "OK" },
              { text: "Retry", onPress: () => loadOwnerHorses(ownerId) }
            ]
          )
        }
        
        // Try to use cached data
        try {
          const cachedData = await SecureStore.getItemAsync(`cached_horses_${ownerId}`)
          if (cachedData) {
            const horses = JSON.parse(cachedData)
            setHorses(horses)
            
            const deceasedCount = horses.filter((h: Horse) => h.alive === false || h.healthStatus === "Deceased").length
            const sickCount = horses.filter((h: Horse) => h.alive !== false && h.healthStatus === "Sick").length
            const healthyCount = horses.filter((h: Horse) => h.alive !== false && h.healthStatus === "Healthy").length
            
            setStatsData({
              total: horses.length,
              healthy: healthyCount,
              sick: sickCount,
              deceased: deceasedCount,
            })
            
            setActiveSection("horses")
          } else {
            setHorses([])
            setStatsData({ total: 0, healthy: 0, sick: 0, deceased: 0 })
          }
        } catch (cacheError) {
          console.error("Cache error:", cacheError)
          setHorses([])
          setStatsData({ total: 0, healthy: 0, sick: 0, deceased: 0 })
        }
      }
    } catch (error) {
      console.error("Network error loading owner horses:", error)
      
      // More specific error messages
      if (error instanceof TypeError && error.message.includes('fetch')) {
        Alert.alert(
          "Connection Error", 
          "Cannot connect to the server. Please check:\n1. Your internet connection\n2. Backend server is running" ,
          [
            { text: "OK" },
            { text: "Retry", onPress: () => loadOwnerHorses(ownerId) },
            { text: "Use Cached", onPress: async () => {
              const cachedData = await SecureStore.getItemAsync(`cached_horses_${ownerId}`)
              if (cachedData) {
                const horses = JSON.parse(cachedData)
                setHorses(horses)
                setActiveSection("horses")
              }
            }}
          ]
        )
      } else {
        Alert.alert(
          "Error", 
          "Failed to load horses. " + (error as Error).message,
          [
            { text: "OK" },
            { text: "Retry", onPress: () => loadOwnerHorses(ownerId) }
          ]
        )
      }
      
      // Try cached data
      try {
        const cachedData = await SecureStore.getItemAsync(`cached_horses_${ownerId}`)
        if (cachedData) {
          const horses = JSON.parse(cachedData)
          setHorses(horses)
          setActiveSection("horses")
        }
      } catch (cacheError) {
        console.error("Cache error:", cacheError)
      }
    } finally {
      setIsLoadingHorses(false)
    }
  }

  const loadCurrentAssignment = async (kutseroId: string) => {
    try {
      console.log("Loading current assignment for kutsero ID:", kutseroId)
      const response = await fetch(`https://echo-ebl8.onrender.com/api/kutsero/current_assignment/?kutsero_id=${kutseroId}`, {
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
            ownerId: data.assignment.horse.ownerId,
            ownerName: data.assignment.horse.ownerName,
            assignmentStatus: "assigned",
            currentAssignmentId: data.assignment.assignmentId,
            lastCheckup: data.assignment.horse.lastCheckup,
            nextCheckup: data.assignment.horse.nextCheckup,
            alive: data.assignment.horse.alive !== false,
            canSelect: true,
          }

          setSelectedHorse(horse)

          // Save to SecureStore
          const horseDataToStore = {
            ...horse,
            assignmentId: data.assignment.assignmentId,
            checkedInAt: data.assignment.checkedInAt,
            checkedOutAt: data.assignment.checkedOutAt,
          }

          await SecureStore.setItemAsync("selectedHorseData", JSON.stringify(horseDataToStore))
          await SecureStore.setItemAsync("currentAssignmentId", data.assignment.assignmentId)

          console.log("Current assignment loaded:", horse.name)
        } else {
          setSelectedHorse(null)
          await SecureStore.deleteItemAsync("selectedHorseData")
          await SecureStore.deleteItemAsync("currentAssignmentId")
        }
      } else {
        setSelectedHorse(null)
        await SecureStore.deleteItemAsync("selectedHorseData")
        await SecureStore.deleteItemAsync("currentAssignmentId")
      }
    } catch (error) {
      console.error("Error loading current assignment:", error)
    }
  }

  const refreshData = async () => {
  setIsLoading(true)
  try {
    if (userData) {
      await loadAndSyncOwners(userData)
      const kutseroId = userData.profile?.kutsero_id || userData.id
      await loadCurrentAssignment(kutseroId)
      setRetryCount(0) // Reset retry count on success
    }
  } catch (error) {
    console.error("Error refreshing data:", error)
    
    // Auto-retry up to 3 times
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1)
      setTimeout(() => {
        refreshData()
      }, 2000 * retryCount)
    } else {
      Alert.alert(
        "Connection Error",
        "Unable to load data. Please check your internet connection and try again.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Retry", onPress: () => {
            setRetryCount(0)
            refreshData()
          }}
        ]
      )
    }
  } finally {
    setIsLoading(false)
  }
}


  const handleOwnerSelection = async (owner: Owner) => {
    console.log("Owner selected:", {
      id: owner.id,
      name: owner.name,
      approvalStatus: owner.approvalStatus,
      hasApplied: owner.hasApplied,
      availableHorses: owner.availableHorses
    })
    
    // If owner has applied but status might be outdated, sync first
    if (owner.hasApplied && owner.approvalStatus === "pending") {
      const syncedStatus = await syncApplicationStatus(owner.id)
      if (syncedStatus === "approved") {
        // If just approved, reload owner data
        await loadOwners()
      }
    }
    
    // Get updated owner from state
    const updatedOwner = owners.find(o => o.id === owner.id) || owner
    
    switch (updatedOwner.approvalStatus) {
      case "approved":
        // If owner is approved, load their horses
        if (updatedOwner.availableHorses > 0) {
          setSelectedOwner(updatedOwner)
          loadOwnerHorsesWithFallback(updatedOwner.id)
        } else {
          Alert.alert(
            "No Available Horses",
            `${updatedOwner.name} has no available horses at the moment.`
          )
        }
        break
        
      case "rejected":
        Alert.alert(
          "Application Rejected",
          `Your application to work with ${updatedOwner.name} was rejected.${
            updatedOwner.rejectionReason ? `\n\nReason: ${updatedOwner.rejectionReason}` : ''
          }`,
          [
            { text: "OK", style: "cancel" },
            { 
              text: "Apply Again", 
              onPress: () => applyToOwner(updatedOwner) 
            }
          ]
        )
        break
        
      case "pending":
        if (updatedOwner.hasApplied) {
          Alert.alert(
            "Application Pending",
            `Your application to work with ${updatedOwner.name} is still pending approval.${
              updatedOwner.applicationDate ? `\n\nApplied on: ${new Date(updatedOwner.applicationDate).toLocaleDateString()}` : ''
            }`,
            [
              { text: "OK", style: "default" },
            ]
          )
        } else {
          Alert.alert(
            "Apply to Work with Owner",
            `Would you like to apply to work with ${updatedOwner.name}? Once approved, you'll be able to select their horses.`,
            [
              { text: "Cancel", style: "cancel" },
              { text: "Apply", onPress: () => applyToOwner(updatedOwner) },
            ]
          )
        }
        break
        
      default:
        // Not applied
        Alert.alert(
          "Apply to Work with Owner",
          `Would you like to apply to work with ${updatedOwner.name}? Once approved, you'll be able to select their horses.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Apply", onPress: () => applyToOwner(updatedOwner) },
          ]
        )
    }
  }

  const applyToOwner = async (owner: Owner) => {
  if (!userData) {
    Alert.alert("Error", "User information not available")
    return
  }

  setIsApplying(true)
  try {
    const kutseroId = userData.profile?.kutsero_id || userData.id
    const applicationData = {
      kutsero_id: kutseroId,
      owner_id: owner.id,
    }

    console.log("DEBUG: Applying to owner with data:", applicationData)

    const response = await fetch(`https://echo-ebl8.onrender.com/api/kutsero/apply_to_owner`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(applicationData),
    })

    console.log("Application response status:", response.status)
    
    if (response.ok) {
      const result = await response.json()
      console.log("Application successful:", result)

      // Save to local storage
      await saveApplicationToLocalStorage(owner.id, "pending")

      // Immediately update the owner in the state
      setOwners(prevOwners =>
        prevOwners.map(o => {
          if (o.id === owner.id) {
            return {
              ...o,
              hasApplied: true,
              approvalStatus: "pending",
              applicationDate: new Date().toISOString(),
              rejectionDate: undefined,
              rejectionReason: undefined,
            }
          }
          return o
        })
      )

      // Update the selected owner if it's the same one
      if (selectedOwner?.id === owner.id) {
        setSelectedOwner(prev => prev ? {
          ...prev,
          hasApplied: true,
          approvalStatus: "pending",
          applicationDate: new Date().toISOString(),
        } : prev)
      }

      Alert.alert(
        "Application Submitted",
        `Your application to work with ${owner.name} has been submitted. You'll be notified once reviewed.`,
        [{ text: "OK" }]
      )
    } else {
      // Handle different error cases
      const errorText = await response.text()
      console.error("Application failed. Response:", errorText)
      
      let errorMessage = "Failed to submit application"
      
      try {
        const errorData = JSON.parse(errorText)
        console.error("Parsed error data:", errorData)
        
        if (errorData.error === "Already applied to this owner") {
          // This means we already applied but frontend state was out of sync
          errorMessage = `You have already applied to work with ${owner.name}. Status: ${errorData.status}`
          
          // Save to local storage with the actual status
          await saveApplicationToLocalStorage(owner.id, errorData.status)
          
          // Update local state to reflect that we've already applied
          setOwners(prevOwners =>
            prevOwners.map(o => {
              if (o.id === owner.id) {
                return {
                  ...o,
                  hasApplied: true,
                  approvalStatus: errorData.status === "approved" ? "approved" : 
                                 errorData.status === "rejected" ? "rejected" : "pending",
                }
              }
              return o
            })
          )
          
          // Update the selected owner if it's the same one
          if (selectedOwner?.id === owner.id) {
            setSelectedOwner(prev => prev ? {
              ...prev,
              hasApplied: true,
              approvalStatus: errorData.status === "approved" ? "approved" : 
                            errorData.status === "rejected" ? "rejected" : "pending",
            } : prev)
          }
        } else if (errorData.error) {
          errorMessage = errorData.error
        } else if (errorData.detail) {
          errorMessage = errorData.detail
        }
      } catch (e) {
        console.error("Could not parse error response:", e)
        errorMessage = `Server error: ${response.status} ${response.statusText}`
      }
      
      Alert.alert("Application Failed", errorMessage)
    }
  } catch (error) {
    console.error("Network error applying to owner:", error)
    Alert.alert("Connection Error", "Failed to submit application. Please check your internet connection.")
  } finally {
    setIsApplying(false)
  }
}

  const handleHorseSelection = async (horse: Horse) => {
    if (!horse.canSelect) {
      Alert.alert(
        "Cannot Select Horse",
        "You don't have permission to select this horse. Please make sure you're approved to work with this owner."
      )
      return
    }

    if (horse.alive === false || horse.healthStatus === "Deceased") {
      Alert.alert(
        "Horse Unavailable",
        "This horse is deceased and cannot be selected."
      )
      return
    }

    if (horse.healthStatus === "Sick") {
      Alert.alert(
        "Horse Requires Medical Care",
        "This horse is sick and needs medical attention."
      )
      return
    }

    if (!userData) {
      Alert.alert("Error", "User information not available")
      return
    }

    if (horse.assignmentStatus === "assigned" && selectedHorse?.id !== horse.id) {
      Alert.alert(
        "Horse Unavailable",
        "This horse is currently assigned to another kutsero."
      )
      return
    }

    Alert.alert("Confirm Selection", `Are you sure you want to select ${horse.name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "OK", onPress: () => proceedWithHorseSelection(horse) },
    ])
  }

  const proceedWithHorseSelection = async (horse: Horse) => {
    if (selectedHorse && selectedHorse.id !== horse.id) {
      Alert.alert(
        "Switch Horse Assignment",
        `You currently have ${selectedHorse.name} assigned. Selecting ${horse.name} will end your current assignment.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Switch Horse", onPress: () => performHorseAssignment(horse) },
        ],
      )
    } else if (selectedHorse && selectedHorse.id === horse.id) {
      Alert.alert("Already Assigned", `${horse.name} is already assigned to you.`)
    } else {
      performHorseAssignment(horse)
    }
  }

  const performHorseAssignment = async (horse: Horse) => {
    setIsAssigning(true)

    try {
      const kutseroId = userData?.profile?.kutsero_id || userData?.id
      console.log("Assigning horse:", horse.name)

      const previousHorseId = selectedHorse?.id

      const assignmentData = {
        kutsero_id: kutseroId,
        horse_id: horse.id,
        date_start: new Date().toISOString(),
        force_switch: true,
      }

      const response = await fetch(`https://echo-ebl8.onrender.com/api/kutsero/assign_horse/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(assignmentData),
      })

      if (response.ok) {
        const result = await response.json()
        console.log("Assignment successful:", result)

        const updatedHorse: Horse = {
          id: result.horse.id,
          name: result.horse.name,
          healthStatus: result.horse.healthStatus === "Unhealthy" ? "Sick" : result.horse.healthStatus as Horse["healthStatus"],
          status: result.horse.status,
          image: cleanImageUrl(result.horse.image),
          breed: result.horse.breed,
          age: result.horse.age,
          color: result.horse.color,
          ownerId: result.horse.ownerId,
          ownerName: result.horse.ownerName,
          assignmentStatus: "assigned",
          currentAssignmentId: result.assignment.assign_id,
          lastCheckup: result.horse.lastCheckup,
          nextCheckup: result.horse.nextCheckup,
          alive: result.horse.alive !== false,
          canSelect: true,
        }

        setSelectedHorse(updatedHorse)

        // Update horses list
        setHorses(prevHorses =>
          prevHorses.map(h => {
            if (h.id === horse.id) {
              return { ...h, assignmentStatus: "assigned", currentAssignmentId: result.assignment.assign_id }
            } else if (previousHorseId && h.id === previousHorseId) {
              return { ...h, assignmentStatus: "available", currentAssignmentId: undefined }
            }
            return h
          })
        )

        // Save to SecureStore
        const horseDataToStore = {
          ...updatedHorse,
          assignmentId: result.assignment.assign_id,
          checkedInAt: result.assignment.date_start,
          checkedOutAt: result.assignment.date_end,
        }

        await SecureStore.setItemAsync("selectedHorseData", JSON.stringify(horseDataToStore))
        await SecureStore.setItemAsync("currentAssignmentId", result.assignment.assign_id)

        const switchMessage =
          result.previous_assignments_ended > 0
            ? `Your previous assignment has been ended. ${horse.name} is now assigned to you.`
            : `${horse.name} has been assigned to you.`

        Alert.alert("Horse Assigned Successfully", switchMessage, [
          {
            text: "OK",
            onPress: () => {
              // Go back to owners list after assignment
              setActiveSection("owners")
              router.back()
            },
          },
        ])
      } else {
        const errorData = await response.json()
        Alert.alert("Assignment Failed", errorData.error || "Failed to assign horse")
      }
    } catch (error) {
      console.error("Error assigning horse:", error)
      Alert.alert("Error", "Failed to assign horse. Please try again.")
    } finally {
      setIsAssigning(false)
    }
  }

  const goBackToOwners = () => {
    setSelectedOwner(null)
    setActiveSection("owners")
    setSelectedHorseFilter("all")
    setSearchText("")
  }

  const filteredOwners = owners.filter((owner) => {
    let matchesFilter = true
    
    if (selectedOwnerFilter !== "all") {
      switch (selectedOwnerFilter) {
        case "approved":
          matchesFilter = owner.approvalStatus === "approved"
          break
        case "pending":
          matchesFilter = owner.approvalStatus === "pending" || !owner.hasApplied
          break
        case "applied":
          matchesFilter = owner.hasApplied === true
          break
      }
    }

    if (!matchesFilter) return false

    const searchLower = searchText.toLowerCase()
    const matchesSearch =
      owner.name.toLowerCase().includes(searchLower) ||
      (owner.username && owner.username.toLowerCase().includes(searchLower)) ||
      (owner.email && owner.email.toLowerCase().includes(searchLower))

    return matchesSearch
  })

  const filteredHorses = horses.filter((horse) => {
    let matchesFilter = true
    const isAlive = horse.alive !== false
    
    if (selectedHorseFilter !== "all") {
      switch (selectedHorseFilter) {
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

    const searchLower = searchText.toLowerCase()
    const matchesSearch =
      horse.name.toLowerCase().includes(searchLower) ||
      horse.breed?.toLowerCase().includes(searchLower) ||
      horse.color?.toLowerCase().includes(searchLower)

    return matchesSearch
  })

  const getHealthStatusColor = (status: Horse["healthStatus"], isAlive: boolean = true) => {
    if (isAlive === false) return "#999999"
    switch (status) {
      case "Healthy": return "#4CAF50"
      case "Sick": return "#F44336"
      case "Deceased": return "#999999"
      default: return "#666"
    }
  }

  const getOwnerStatusColor = (owner: Owner) => {
    if (owner.approvalStatus === "approved") return "#4CAF50"
    if (owner.approvalStatus === "rejected") return "#F44336"
    if (owner.hasApplied) return "#FF9800"
    return "#9E9E9E"
  }

  const getOwnerStatusText = (owner: Owner) => {
    if (owner.approvalStatus === "approved") return "Approved"
    if (owner.approvalStatus === "rejected") return "Rejected"
    if (owner.hasApplied) return "Pending"
    return "Not Applied"
  }

  const getHorseFilterLabel = (filter: HorseFilterType) => {
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

  const getOwnerFilterLabel = (filter: OwnerFilterType) => {
    switch (filter) {
      case "all": return "All Owners"
      case "approved": return "Approved"
      case "pending": return "Pending"
      case "applied": return "Applied"
      default: return "All Owners"
    }
  }

  // Render filter modal for owners
  const renderOwnerFilterModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={filterModalVisible}
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Owners</Text>
            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.filterList}>
            {["all", "approved", "pending", "applied"].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterItem,
                  selectedOwnerFilter === filter && styles.filterItemSelected,
                ]}
                onPress={() => {
                  setSelectedOwnerFilter(filter as OwnerFilterType)
                  setFilterModalVisible(false)
                }}
              >
                <Text style={[
                  styles.filterItemText,
                  selectedOwnerFilter === filter && styles.filterItemTextSelected,
                ]}>
                  {getOwnerFilterLabel(filter as OwnerFilterType)}
                </Text>
                {selectedOwnerFilter === filter && (
                  <Text style={styles.filterItemCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <TouchableOpacity
            style={styles.clearFilterButton}
            onPress={() => {
              setSelectedOwnerFilter("all")
              setFilterModalVisible(false)
            }}
          >
            <Text style={styles.clearFilterText}>Clear Filter</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )

  // Render filter modal for horses
  const renderHorseFilterModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={horseFilterModalVisible}
      onRequestClose={() => setHorseFilterModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Horses</Text>
            <TouchableOpacity onPress={() => setHorseFilterModalVisible(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.filterList}>
            {["all", "healthy", "sick", "deceased", "available", "assigned"].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterItem,
                  selectedHorseFilter === filter && styles.filterItemSelected,
                ]}
                onPress={() => {
                  setSelectedHorseFilter(filter as HorseFilterType)
                  setHorseFilterModalVisible(false)
                }}
              >
                <Text style={[
                  styles.filterItemText,
                  selectedHorseFilter === filter && styles.filterItemTextSelected,
                ]}>
                  {getHorseFilterLabel(filter as HorseFilterType)}
                </Text>
                {selectedHorseFilter === filter && (
                  <Text style={styles.filterItemCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <TouchableOpacity
            style={styles.clearFilterButton}
            onPress={() => {
              setSelectedHorseFilter("all")
              setHorseFilterModalVisible(false)
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
        <Text style={styles.loadingText}>Loading...</Text>
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
            onPress={() => {
              if (activeSection === "horses") {
                goBackToOwners()
              } else {
                router.back()
              }
            }}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {activeSection === "owners" ? "Select Owner" : `Select Horse - ${selectedOwner?.name}`}
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={() => refreshData()}>
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
              activeSection === "owners" 
                ? "Search owners by name, username, or email..." 
                : "Search horses by name, breed, or color..."
            }
            placeholderTextColor="#999"
          />
          <TouchableOpacity style={styles.searchButton}>
            <Text style={styles.searchIconText}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Indicator */}
        {(activeSection === "owners" ? selectedOwnerFilter : selectedHorseFilter) !== "all" && (
          <View style={styles.filterIndicator}>
            <Text style={styles.filterIndicatorText}>
              Filter: {activeSection === "owners" 
                ? getOwnerFilterLabel(selectedOwnerFilter) 
                : getHorseFilterLabel(selectedHorseFilter)}
            </Text>
            <TouchableOpacity onPress={() => 
              activeSection === "owners" 
                ? setSelectedOwnerFilter("all") 
                : setSelectedHorseFilter("all")
            }>
              <Text style={styles.filterClearText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Stats Section */}
        {activeSection === "owners" ? (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{ownerStatsData.total}</Text>
              <Text style={styles.statLabel}>Total Owners</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: "#4CAF50" }]}>{ownerStatsData.approved}</Text>
              <Text style={styles.statLabel}>Approved</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: "#FF9800" }]}>{ownerStatsData.applied}</Text>
              <Text style={styles.statLabel}>Applied</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: "#F44336" }]}>{ownerStatsData.pending}</Text>
              <Text style={styles.statLabel}>Pending/Not Applied</Text>
            </View>
          </View>
        ) : (
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
              <Text style={[styles.statNumber, { color: "#F44336" }]}>{statsData.sick}</Text>
              <Text style={styles.statLabel}>Sick</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: "#999999" }]}>{statsData.deceased}</Text>
              <Text style={styles.statLabel}>Deceased</Text>
            </View>
          </View>
        )}

        {/* Current Selection */}
        {selectedHorse && activeSection === "owners" && (
          <View style={styles.currentSelectionContainer}>
            <Text style={styles.currentSelectionTitle}>Currently Assigned Horse</Text>
            <View style={styles.currentSelectionCard}>
              <TouchableOpacity
                style={styles.currentHorseAvatar}
                onPress={() => setFullScreenImage(selectedHorse.image)}
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
                <Text style={styles.currentHorseOperator}>Owner: {selectedHorse.ownerName}</Text>
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

        {/* Owners or Horses List */}
        <View style={styles.listContainer}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>
              {activeSection === "owners" 
                ? `${getOwnerFilterLabel(selectedOwnerFilter)} (${filteredOwners.length})`
                : `${getHorseFilterLabel(selectedHorseFilter)} (${filteredHorses.length})`}
            </Text>
            <TouchableOpacity 
              style={[
                styles.filterHeaderButton,
                (activeSection === "owners" ? selectedOwnerFilter : selectedHorseFilter) !== "all" && 
                styles.filterHeaderButtonActive
              ]}
              onPress={() => 
                activeSection === "owners" 
                  ? setFilterModalVisible(true)
                  : setHorseFilterModalVisible(true)
              }
            >
              <FontAwesome5 name="filter" size={16} color={
                (activeSection === "owners" ? selectedOwnerFilter : selectedHorseFilter) !== "all" 
                  ? "#C17A47" 
                  : "#666"
              } />
              <Text style={[
                styles.filterHeaderText,
                (activeSection === "owners" ? selectedOwnerFilter : selectedHorseFilter) !== "all" && 
                styles.filterHeaderTextActive
              ]}>
                Filter
              </Text>
            </TouchableOpacity>
          </View>

          {activeSection === "owners" ? (
            <ScrollView
              style={styles.list}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            >
              {filteredOwners.map((owner) => {
                const isApproved = owner.approvalStatus === "approved"
                const isRejected = owner.approvalStatus === "rejected"
                const hasApplied = owner.hasApplied
                
                return (
                  <TouchableOpacity
                    key={owner.id}
                    style={[
                      styles.ownerItem,
                      isApproved && styles.approvedOwnerItem,
                      isRejected && styles.rejectedOwnerItem,
                      !isApproved && !isRejected && hasApplied && styles.appliedOwnerItem,
                    ]}
                    onPress={() => handleOwnerSelection(owner)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.ownerAvatar}>
                      <Image 
                        source={{ uri: owner.image }} 
                        style={styles.ownerImage}
                        resizeMode="cover"
                      />
                    </View>
                    <View style={styles.ownerInfo}>
                      <View style={styles.ownerHeader}>
                        <Text style={styles.ownerName}>{owner.name}</Text>
                        <View style={[
                          styles.ownerStatusBadge,
                          { backgroundColor: getOwnerStatusColor(owner) }
                        ]}>
                          <Text style={styles.ownerStatusText}>
                            {getOwnerStatusText(owner)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.ownerUsername}>@{owner.username || "no_username"}</Text>
                      <Text style={styles.ownerEmail}>{owner.email}</Text>
                      <View style={styles.ownerHorsesRow}>
                        <Text style={styles.ownerHorsesText}>
                          {owner.totalHorses} horses • {owner.availableHorses} available
                        </Text>
                        {isApproved && owner.availableHorses > 0 && (
                          <Text style={styles.viewHorsesText}>View Horses →</Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                )
              })}
              {filteredOwners.length === 0 && (
                <View style={styles.emptyStateContainer}>
                  <View style={styles.emptyStateIcon}>
                    <FontAwesome5 name="user-friends" size={48} color="#CCCCCC" />
                  </View>
                  <Text style={styles.emptyStateTitle}>
                    {searchText ? "No owners found" : "No owners available"}
                  </Text>
                  <Text style={styles.emptyStateSubtitle}>
                    {searchText 
                      ? "Try adjusting your search terms" 
                      : "No owners match the current filter"}
                  </Text>
                  {(searchText || selectedOwnerFilter !== "all") && (
                    <TouchableOpacity
                      style={styles.emptyStateButton}
                      onPress={() => {
                        setSearchText("")
                        setSelectedOwnerFilter("all")
                      }}
                    >
                      <Text style={styles.emptyStateButtonText}>Clear Filters</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>
          ) : (
            <ScrollView
              style={styles.list}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            >
              {filteredHorses.map((horse) => {
                const isAlive = horse.alive !== false
                const isDeceased = !isAlive || horse.healthStatus === "Deceased"
                const isSick = isAlive && horse.healthStatus === "Sick"
                const isAssignedToOther = horse.assignmentStatus === "assigned" && selectedHorse?.id !== horse.id
                const isCurrentlySelected = selectedHorse?.id === horse.id
                const isSelectable = horse.canSelect && !isDeceased && !isSick && !isAssignedToOther

                return (
                  <TouchableOpacity
                    key={horse.id}
                    style={[
                      styles.horseItem,
                      isCurrentlySelected && styles.selectedHorseItem,
                      !isSelectable && styles.unavailableHorseItem,
                      isSick && styles.sickHorseItem,
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
                        isSick && styles.sickAvatar,
                      ]}
                      onPress={() => setFullScreenImage(horse.image)}
                      activeOpacity={0.9}
                    >
                      <Image 
                        source={{ uri: horse.image }} 
                        style={styles.horseImage}
                        resizeMode="cover"
                      />
                      {isDeceased && (
                        <View style={styles.deceasedOverlay}>
                          <Text style={styles.deceasedOverlayText}>✝</Text>
                        </View>
                      )}
                      {isSick && !isDeceased && (
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
                          isSick && styles.sickText,
                        ]}>
                          {horse.name}
                        </Text>
                        {isDeceased && (
                          <View style={styles.deceasedBadge}>
                            <Text style={styles.deceasedBadgeText}>Deceased</Text>
                          </View>
                        )}
                        {isSick && !isDeceased && (
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
                        isSick && styles.sickText,
                      ]}>
                        {horse.breed} • {horse.age} years old
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
                        {!isDeceased && !isSick && (
                          <>
                            <Text style={styles.horseSeparator}>•</Text>
                            <Text style={[styles.horseStatus, !isSelectable && styles.unavailableText]}>
                              {horse.status}
                            </Text>
                          </>
                        )}
                        {isSick && (
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
                        isSick && styles.sickText,
                      ]}>
                        {isDeceased ? "Deceased" : 
                         isSick ? "Requires medical attention" :
                         `Last checkup: ${horse.lastCheckup}`}
                      </Text>
                    </View>
                    <View style={styles.selectIndicator}>
                      {isDeceased ? (
                        <View style={styles.deceasedIndicator}>
                          <Text style={styles.deceasedIndicatorText}>✝</Text>
                        </View>
                      ) : isSick ? (
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
                <View style={styles.emptyStateContainer}>
                  <View style={styles.emptyStateIcon}>
                    <FontAwesome5 name="horse" size={48} color="#CCCCCC" />
                  </View>
                  <Text style={styles.emptyStateTitle}>
                    {searchText ? "No horses found" : "No horses available"}
                  </Text>
                  <Text style={styles.emptyStateSubtitle}>
                    {searchText 
                      ? "Try adjusting your search terms" 
                      : selectedOwner?.availableHorses === 0
                        ? "This owner has no available horses at the moment"
                        : "No horses match the current filter"}
                  </Text>
                  
                  {searchText || selectedHorseFilter !== "all" ? (
                    <TouchableOpacity
                      style={styles.emptyStateButton}
                      onPress={() => {
                        setSearchText("")
                        setSelectedHorseFilter("all")
                      }}
                    >
                      <Text style={styles.emptyStateButtonText}>Clear Filters</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.emptyStateButton}
                      onPress={goBackToOwners}
                    >
                      <Text style={styles.emptyStateButtonText}>Back to Owners</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>

      {/* Modals */}
      {renderOwnerFilterModal()}
      {renderHorseFilterModal()}

      {/* Full Screen Image Modal */}
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

      {/* Loading Overlays */}
      {isLoadingHorses && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#C17A47" />
            <Text style={styles.loadingOverlayText}>Loading horses...</Text>
          </View>
        </View>
      )}

      {isAssigning && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#C17A47" />
            <Text style={styles.loadingOverlayText}>Assigning horse...</Text>
          </View>
        </View>
      )}

      {isApplying && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#C17A47" />
            <Text style={styles.loadingOverlayText}>Submitting application...</Text>
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
  listContainer: {
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
  listTitle: {
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
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: dynamicSpacing(20),
  },
  // Owner Item Styles
  ownerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(16),
    borderRadius: scale(12),
    marginBottom: verticalScale(12),
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
  approvedOwnerItem: {
    backgroundColor: "#E8F5E8",
    borderColor: "#4CAF50",
  },
  rejectedOwnerItem: {
    backgroundColor: "#FFEBEE",
    borderColor: "#F44336",
  },
  appliedOwnerItem: {
    backgroundColor: "#FFF3E0",
    borderColor: "#FF9800",
  },
  ownerAvatar: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: scale(16),
    overflow: "hidden",
  },
  ownerImage: {
    width: '100%',
    height: '100%',
  },
  ownerInfo: {
    flex: 1,
  },
  ownerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(4),
    flexWrap: 'wrap',
  },
  ownerName: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#333",
    flex: 1,
    fontFamily: "System",
    marginRight: scale(8),
  },
  ownerStatusBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: scale(12),
    marginLeft: scale(8),
    minWidth: scale(80),
    alignItems: 'center',
  },
  ownerStatusText: {
    color: "white",
    fontSize: moderateScale(10),
    fontWeight: "600",
    fontFamily: "System",
    textAlign: 'center',
  },
  ownerUsername: {
    fontSize: moderateScale(12),
    color: "#666",
    marginBottom: verticalScale(2),
    fontFamily: "System",
  },
  ownerEmail: {
    fontSize: moderateScale(11),
    color: "#999",
    marginBottom: verticalScale(6),
    fontFamily: "System",
  },
  ownerHorsesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ownerHorsesText: {
    fontSize: moderateScale(12),
    color: "#666",
    fontFamily: "System",
  },
  viewHorsesText: {
    fontSize: moderateScale(12),
    color: "#C17A47",
    fontWeight: "600",
    fontFamily: "System",
  },
  // Horse Item Styles
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
  sickHorseItem: {
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
  sickAvatar: {
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
  sickOverlay: {
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
  sickText: {
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
  sickBadge: {
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
  sickStatusText: {
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
  sickIndicator: {
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
  // Empty State Styles
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: verticalScale(60),
    paddingHorizontal: scale(40),
  },
  emptyStateIcon: {
    marginBottom: verticalScale(20),
    opacity: 0.5,
  },
  emptyStateTitle: {
    fontSize: moderateScale(20),
    fontWeight: "600",
    color: "#666",
    marginBottom: verticalScale(8),
    textAlign: "center",
    fontFamily: "System",
  },
  emptyStateSubtitle: {
    fontSize: moderateScale(15),
    color: "#999",
    textAlign: "center",
    marginBottom: verticalScale(30),
    lineHeight: moderateScale(22),
    fontFamily: "System",
  },
  emptyStateButton: {
    backgroundColor: "#C17A47",
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(14),
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
  emptyStateButtonText: {
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
  // Full Screen Image Modal
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
