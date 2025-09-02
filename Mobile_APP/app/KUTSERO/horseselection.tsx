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
const API_BASE_URL = "http://192.168.1.7:8000/api/kutsero"

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
        
        // Load current assignment and available horses
        await loadCurrentAssignment(unifiedUserData.profile?.kutsero_id || unifiedUserData.id)
        await loadAvailableHorses()
      } else {
        Alert.alert("Error", "User session not found. Please login again.")
      }
    } catch (error) {
      console.error('Error loading user data and horses:', error)
      Alert.alert("Error", "Failed to load data. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const loadCurrentAssignment = async (kutserroId: string) => {
    try {
      console.log('Loading current assignment for kutsero ID:', kutserroId)
      const response = await fetch(`${API_BASE_URL}/current_assignment/?kutsero_id=${kutserroId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log('Current assignment response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Current assignment data:', data)
        
        if (data.assignment && data.assignment.horse) {
          // Transform the horse data to match our interface
          const horse: Horse = {
            id: data.assignment.horse.id,
            name: data.assignment.horse.name,
            healthStatus: data.assignment.horse.healthStatus as Horse["healthStatus"],
            status: data.assignment.horse.status,
            image: require("../../assets/images/horse.png"), // Default image
            breed: data.assignment.horse.breed,
            age: data.assignment.horse.age,
            color: data.assignment.horse.color,
            operatorName: data.assignment.horse.operatorName,
            assignmentStatus: 'assigned',
            currentAssignmentId: data.assignment.assignmentId,
            lastCheckup: data.assignment.horse.lastCheckup,
            nextCheckup: data.assignment.horse.nextCheckup,
          }
          setSelectedHorse(horse)
          
          // Also save to SecureStore for dashboard
          await SecureStore.setItemAsync('selectedHorseData', JSON.stringify(horse))
        }
      } else {
        console.log('No current assignment found or error:', response.status)
      }
    } catch (error) {
      console.error('Error loading current assignment:', error)
    }
  }

  const loadAvailableHorses = async () => {
    try {
      console.log('Attempting to fetch horses from:', `${API_BASE_URL}/available_horses/`)
      
      const response = await fetch(`${API_BASE_URL}/available_horses/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      if (response.ok) {
        const data = await response.json()
        console.log('Received horses data:', data)
        
        // Transform horses data
        const horses: Horse[] = data.horses.map((horse: any) => ({
          id: horse.id,
          name: horse.name,
          healthStatus: horse.healthStatus as Horse["healthStatus"],
          status: horse.status,
          image: require("../../assets/images/horse.png"), // Default image for now
          breed: horse.breed,
          age: horse.age,
          color: horse.color,
          operatorName: horse.operatorName,
          assignmentStatus: horse.assignmentStatus,
          currentAssignmentId: horse.currentAssignmentId,
          lastCheckup: horse.lastCheckup,
          nextCheckup: horse.nextCheckup,
        }))
        
        setAvailableHorses(horses)
        
        // Update stats
        setStatsData({
          total: data.total_count || horses.length,
          healthy: horses.filter(h => h.healthStatus === 'Healthy').length,
          underCare: horses.filter(h => h.healthStatus === 'Under Care').length,
          recovering: horses.filter(h => h.healthStatus === 'Recovering').length,
        })
      } else {
        // Get more detailed error information
        let errorMessage = 'Failed to fetch horses'
        try {
          // Clone the response to avoid "Already read" error
          const responseClone = response.clone()
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
          console.error('Server error response:', errorData)
        } catch (e) {
          console.error('Could not parse error response as JSON:', errorMessage)
          try {
            // Use the cloned response for text parsing
            const errorText = await response.text()
            console.error('Raw error response:', errorText)
            errorMessage = `HTTP ${response.status}: ${response.statusText}`
          } catch (textError) {
            console.error('Could not read response as text either')
            errorMessage = `HTTP ${response.status}: ${response.statusText}`
          }
        }
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error('Error loading horses:', error)
      
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

  // Filter horses based on search and availability
  const filteredHorses = availableHorses.filter(horse =>
    (horse.name.toLowerCase().includes(searchText.toLowerCase()) ||
     horse.breed?.toLowerCase().includes(searchText.toLowerCase()) ||
     horse.operatorName?.toLowerCase().includes(searchText.toLowerCase())) &&
    horse.assignmentStatus === 'available'
  )

  const handleHorseSelection = async (horse: Horse) => {
    if (!userData?.profile?.kutsero_id && !userData?.id) {
      Alert.alert("Error", "User information not available")
      return
    }

    setIsAssigning(true)
    
    try {
      console.log('Assigning horse:', horse.name, 'to kutsero:', userData.profile?.kutsero_id || userData.id)
      
      // First, end any existing assignment
      if (selectedHorse?.currentAssignmentId) {
        console.log('Ending existing assignment:', selectedHorse.currentAssignmentId)
        const endResponse = await fetch(`${API_BASE_URL}/end_assignment/${selectedHorse.currentAssignmentId}/`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (!endResponse.ok) {
          console.warn('Failed to end existing assignment, continuing with new assignment')
        }
      }

      // Create new assignment
      const assignmentData = {
        kutsero_id: userData.profile?.kutsero_id || userData.id,
        horse_id: horse.id,
        date_start: new Date().toISOString().split('T')[0], // Today's date
        // date_end will be null for indefinite assignment
      }

      console.log('Creating new assignment with data:', assignmentData)

      const response = await fetch(`${API_BASE_URL}/assign_horse/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignmentData),
      })

      console.log('Assignment response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('Assignment successful:', result)
        
        // Update the selected horse
        const updatedHorse: Horse = {
          ...horse,
          assignmentStatus: 'assigned',
          currentAssignmentId: result.assignment.assign_id,
        }
        
        setSelectedHorse(updatedHorse)
        
        // Save to SecureStore for dashboard
        await SecureStore.setItemAsync('selectedHorseData', JSON.stringify(updatedHorse))
        
        // Reload horses to update the list
        await loadAvailableHorses()
        
        Alert.alert(
          "Horse Assigned Successfully",
          `${horse.name} has been assigned to you for work.`,
          [
            {
              text: "OK",
              onPress: () => router.back()
            }
          ]
        )
      } else {
        const errorData = await response.json()
        console.error('Assignment failed:', errorData)
        Alert.alert("Assignment Failed", errorData.error || "Failed to assign horse")
      }
    } catch (error) {
      console.error('Error assigning horse:', error)
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
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Horse</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search horses by name, breed, or operator..."
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

        {/* Current Selection */}
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
                <Text style={styles.currentHorseOperator}>Owner: {selectedHorse.operatorName}</Text>
                <View style={styles.currentHorseHealthRow}>
                  <View style={[styles.currentHorseHealthDot, { backgroundColor: getHealthStatusColor(selectedHorse.healthStatus) }]} />
                  <Text style={[styles.currentHorseHealthText, { color: getHealthStatusColor(selectedHorse.healthStatus) }]}>
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
          <Text style={styles.horsesListTitle}>
            Available Horses ({filteredHorses.length})
          </Text>
                    
          <ScrollView 
            style={styles.horsesList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.horsesListContent}
          >
            {filteredHorses.map((horse) => (
              <TouchableOpacity 
                key={horse.id}
                style={[
                  styles.horseItem,
                  selectedHorse?.id === horse.id && styles.selectedHorseItem
                ]}
                onPress={() => handleHorseSelection(horse)}
                activeOpacity={0.7}
                disabled={isAssigning || horse.assignmentStatus === 'assigned'}
              >
                <View style={styles.horseAvatar}>
                  <Image
                    source={horse.image}
                    style={[styles.horseIconImage, { tintColor: "#C17A47" }]}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.horseInfo}>
                  <View style={styles.horseHeader}>
                    <Text style={styles.horseName}>{horse.name}</Text>
                    {horse.assignmentStatus === 'assigned' && (
                      <View style={styles.assignedBadge}>
                        <Text style={styles.assignedBadgeText}>Assigned</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.horseBreed}>{horse.breed} • {horse.age} years old</Text>
                  <Text style={styles.horseOperator}>Owner: {horse.operatorName}</Text>
                  <View style={styles.horseHealthRow}>
                    <View style={[styles.horseHealthDot, { backgroundColor: getHealthStatusColor(horse.healthStatus) }]} />
                    <Text style={[styles.horseHealthText, { color: getHealthStatusColor(horse.healthStatus) }]}>
                      {horse.healthStatus}
                    </Text>
                    <Text style={styles.horseSeparator}>•</Text>
                    <Text style={styles.horseStatus}>{horse.status}</Text>
                  </View>
                  <Text style={styles.horseCheckup}>Last checkup: {horse.lastCheckup}</Text>
                </View>
                <View style={styles.selectIndicator}>
                  {selectedHorse?.id === horse.id ? (
                    <View style={styles.selectedIndicator}>
                      <Text style={styles.selectedIndicatorText}>✓</Text>
                    </View>
                  ) : horse.assignmentStatus === 'assigned' ? (
                    <View style={styles.assignedIndicator}>
                      <Text style={styles.assignedIndicatorText}>×</Text>
                    </View>
                  ) : (
                    <View style={styles.unselectedIndicator} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
            {filteredHorses.length === 0 && (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>No available horses found</Text>
                <Text style={styles.noResultsSubtext}>
                  {searchText ? 'Try adjusting your search terms' : 'All horses are currently assigned or none are available'}
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
  headerSpacer: {
    width: scale(32),
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
  },
  assignedBadge: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: scale(10),
  },
  assignedBadgeText: {
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