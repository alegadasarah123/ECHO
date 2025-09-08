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

// Add API base URL
const API_BASE_URL = "http://192.168.1.7:8000/api/kutsero" // Replace with your actual API URL

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
  const [availableHorses, setAvailableHorses] = useState<Horse[]>([]) // Changed to state
  const [isLoading, setIsLoading] = useState(true)
  const [userData, setUserData] = useState<any>(null)
  const safeArea = getSafeAreaPadding()

  // Load user data and fetch horses
  useEffect(() => {
    loadUserDataAndHorses()
  }, [])

  const loadUserDataAndHorses = async () => {
    setIsLoading(true)
    try {
      // Get user data
      const storedUserData = await AsyncStorage.getItem('user_data')
      const storedAccessToken = await AsyncStorage.getItem('access_token')
      
      if (storedUserData && storedAccessToken) {
        const parsedUserData = JSON.parse(storedUserData)
        setUserData(parsedUserData)
        
        // Fetch available horses from API
        await fetchAvailableHorses(storedAccessToken)
        
        // Load currently selected horse
        await loadSelectedHorse()
      }
    } catch (error) {
      console.error('Error loading data:', error)
      Alert.alert("Error", "Failed to load horses. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAvailableHorses = async (token: string) => {
    try {
      // Get today's date for available horses
      const today = new Date().toISOString().split('T')[0]
      
      const response = await fetch(`${API_BASE_URL}/horses/available/?date=${today}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const horses = await response.json()
        // Transform to match your frontend Horse interface
        const transformedHorses = horses.map((horse: any) => ({
          id: horse.id,
          name: horse.name,
          healthStatus: horse.healthStatus,
          status: horse.status,
          image: horse.image || require("../../assets/images/horse.png"), // Fallback image
          breed: horse.breed,
          age: horse.age,
          lastCheckup: horse.lastCheckup,
          nextCheckup: horse.nextCheckup,
        }))
        setAvailableHorses(transformedHorses)
      } else {
        throw new Error('Failed to fetch horses')
      }
    } catch (error) {
      console.error('Error fetching horses:', error)
      // Fallback to default horses if API fails
      setAvailableHorses([
        {
          id: "1",
          name: "Oscar",
          healthStatus: "Healthy",
          status: "Ready for work",
          image: require("../../assets/images/horse.png"),
          breed: "Arabian",
          age: 8,
          lastCheckup: "2 days ago",
          nextCheckup: "May 30, 2025",
        },
        {
          id: "2",
          name: "Thunder",
          healthStatus: "Under Care",
          status: "Recovering from injury",
          image: require("../../assets/images/horse.png"),
          breed: "Thoroughbred",
          age: 6,
          lastCheckup: "1 day ago",
          nextCheckup: "June 5, 2025",
        },
        {
          id: "3",
          name: "Spirit",
          healthStatus: "Healthy",
          status: "Ready for work",
          image: require("../../assets/images/horse.png"),
          breed: "Quarter Horse",
          age: 10,
          lastCheckup: "3 days ago",
          nextCheckup: "June 15, 2025",
        },
        {
          id: "4",
          name: "Blaze",
          healthStatus: "Recovering",
          status: "Post-surgery care",
          image: require("../../assets/images/horse.png"),
          breed: "Mustang",
          age: 7,
          lastCheckup: "Today",
          nextCheckup: "May 28, 2025",
        },
        {
          id: "5",
          name: "Star",
          healthStatus: "Healthy",
          status: "Ready for work",
          image: require("../../assets/images/horse.png"),
          breed: "Paint Horse",
          age: 5,
          lastCheckup: "4 days ago",
          nextCheckup: "June 10, 2025",
        },
        {
          id: "6",
          name: "Midnight",
          healthStatus: "Healthy",
          status: "Ready for work",
          image: require("../../assets/images/horse.png"),
          breed: "Friesian",
          age: 9,
          lastCheckup: "1 week ago",
          nextCheckup: "June 20, 2025",
        },
        {
          id: "7",
          name: "Storm",
          healthStatus: "Under Care",
          status: "Routine checkup",
          image: require("../../assets/images/horse.png"),
          breed: "Clydesdale",
          age: 12,
          lastCheckup: "Yesterday",
          nextCheckup: "June 1, 2025",
        },
        {
          id: "8",
          name: "Luna",
          healthStatus: "Healthy",
          status: "Ready for work",
          image: require("../../assets/images/horse.png"),
          breed: "Andalusian",
          age: 4,
          lastCheckup: "5 days ago",
          nextCheckup: "June 25, 2025",
        },
      ])
    }
  }

  const loadSelectedHorse = async () => {
    try {
      const savedHorseData = await AsyncStorage.getItem('selectedHorseData')
      if (savedHorseData) {
        const horse = JSON.parse(savedHorseData)
        setSelectedHorse(horse)
      }
    } catch (error) {
      console.log('Error loading selected horse:', error)
    }
  }

  const saveSelectedHorse = async (horse: Horse) => {
    try {
      await AsyncStorage.setItem('selectedHorseId', horse.id)
      await AsyncStorage.setItem('selectedHorseData', JSON.stringify(horse))
      
      // Also create assignment in backend
      await createHorseAssignment(horse.id)
    } catch (error) {
      console.log('Error saving selected horse:', error)
    }
  }

  const createHorseAssignment = async (horseId: string) => {
    try {
      if (!userData) return
      
      const token = await AsyncStorage.getItem('access_token')
      if (!token) return

      const today = new Date().toISOString().split('T')[0]
      
      const response = await fetch(`${API_BASE_URL}/assignments/assign/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kutsero_id: userData.profile?.kutsero_id || userData.id,
          horse_id: horseId,
          date_start: today,
          date_end: today
        })
      })

      if (!response.ok) {
        console.log('Assignment creation failed, but horse selection saved locally')
      }
    } catch (error) {
      console.error('Error creating assignment:', error)
      // Don't show error to user as horse is still selected locally
    }
  }

  // Filter horses based on search
  const filteredHorses = availableHorses.filter(horse =>
    horse.name.toLowerCase().includes(searchText.toLowerCase()) ||
    horse.breed?.toLowerCase().includes(searchText.toLowerCase())
  )

  const handleHorseSelection = (horse: Horse) => {
    setSelectedHorse(horse)
    saveSelectedHorse(horse)
    Alert.alert(
      "Horse Selected",
       `${horse.name} has been selected for today's work.`,
      [
        {
          text: "OK",
          onPress: () => {
            // Navigate back to dashboard
            router.back()
          }
        }
      ]
    )
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

  // Show loading screen
  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />
        <Text style={{ color: '#C17A47', fontSize: 16 }}>Loading horses...</Text>
      </View>
    )
  }

  // Show loading screen
  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />
        <Text style={{ color: '#C17A47', fontSize: 16 }}>Loading horses...</Text>
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