import { useState, useEffect } from "react"
import {
    Alert,
    Dimensions,
    Modal,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator
} from "react-native"
import FeedLogPage from "./FeedLogPage"

const { width, height } = Dimensions.get("window")

// API Configuration - Update these URLs to match your backend
const API_BASE_URL = "http://172.20.10.2:8000/api/kutsero" // Replace with your actual backend URL

// Enhanced responsive scaling functions with better mobile optimization
const scale = (size: number) => {
  const scaleFactor = width / 375 // Base width for iPhone X
  const scaledSize = size * scaleFactor
  // Tighter bounds for mobile screens
  return Math.max(Math.min(scaledSize, size * 1.3), size * 0.7)
}

const verticalScale = (size: number) => {
  const scaleFactor = height / 812 // Base height for iPhone X
  const scaledSize = size * scaleFactor
  // Tighter bounds for mobile screens
  return Math.max(Math.min(scaledSize, size * 1.2), size * 0.8)
}

const moderateScale = (size: number, factor = 0.5) => {
  const scaledSize = size + (scale(size) - size) * factor
  // Ensure text remains readable on all screen sizes
  return Math.max(Math.min(scaledSize, size * 1.2), size * 0.8)
}

// Mobile-optimized spacing
const dynamicSpacing = (baseSize: number) => {
  if (width < 350) return verticalScale(baseSize * 0.7) // Very small screens
  if (width < 400) return verticalScale(baseSize * 0.85) // Small screens
  if (width > 450) return verticalScale(baseSize * 1.1) // Large screens
  return verticalScale(baseSize) // Standard screens
}

// Safe area calculations
const getSafeAreaPadding = () => {
  const statusBarHeight = StatusBar.currentHeight || 0
  return {
    top: Math.max(statusBarHeight, 20),
    bottom: height > 800 ? 34 : 20, // Account for home indicator on newer phones
  }
}

interface FeedItem {
  feed_id: string
  user_id: string
  horse_id: string
  food: string
  amount: string
  time: string
  completed: boolean
  completed_at?: string
  created_at?: string
  updated_at?: string
}

interface LocalFeedItem {
  id: string
  name: string
  chaff?: string
  restone?: string
  dynamy?: string
  magnesium?: string
}

interface FeedPageProps {
  onBack: () => void
  feedType: "feed" | "water"
  horseName?: string
  userId?: string // Add userId prop
  horseId?: string // Add horseId prop
}

export default function FeedPage({ 
  onBack, 
  feedType, 
  horseName = "Oscar", 
  userId = "default_user", 
  horseId = "default_horse" 
}: FeedPageProps) {
  const [showEditModal, setShowEditModal] = useState(false)
  const [showFeedLog, setShowFeedLog] = useState(false)
  const [editingMeal, setEditingMeal] = useState<"breakfast" | "lunch" | "dinner" | null>(null)
  const [newFeedName, setNewFeedName] = useState("")
  const [newChaff, setNewChaff] = useState("")
  const [newRestone, setNewRestone] = useState("")
  const [newDynamy, setNewDynamy] = useState("")
  const [newMagnesium, setNewMagnesium] = useState("")
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [debugMode, setDebugMode] = useState(true) // Set to false in production
  
  const safeArea = getSafeAreaPadding()

  // API-fetched feeds organized by meal type
  const [apiFeeds, setApiFeeds] = useState<FeedItem[]>([])
  
  // Local feeds for display (transformed from API data)
  const [breakfastFeeds, setBreakfastFeeds] = useState<LocalFeedItem[]>([])
  const [lunchFeeds, setLunchFeeds] = useState<LocalFeedItem[]>([])
  const [dinnerFeeds, setDinnerFeeds] = useState<LocalFeedItem[]>([])

  // Enhanced API Functions with Better Error Handling
  const fetchFeeds = async () => {
    try {
      setRefreshing(true)
      const url = `${API_BASE_URL}/feeds/${userId}/${horseId}/`
      console.log('Fetching feeds from:', url)
      
      const response = await fetch(url)
      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)
      console.log('Response headers:', JSON.stringify([...response.headers.entries()]))
      
      // Log the raw response text to see what's actually returned
      const responseText = await response.text()
      console.log('Raw response length:', responseText.length)
      console.log('Raw response preview:', responseText.substring(0, 500))
      
      // Check if response is HTML (starts with <)
      if (responseText.trim().startsWith('<')) {
        console.error('Received HTML instead of JSON')
        Alert.alert("Server Error", "Server returned HTML instead of JSON. Check server logs and ensure the API endpoint exists.")
        return
      }
      
      // Check for empty response
      if (!responseText.trim()) {
        console.error('Received empty response')
        Alert.alert("Server Error", "Server returned empty response")
        return
      }
      
      // Try to parse as JSON
      let data
      try {
        data = JSON.parse(responseText)
        console.log('Parsed data:', data)
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        console.error('Response text that failed to parse:', responseText)
        Alert.alert("Parse Error", "Failed to parse server response as JSON. Check server response format.")
        return
      }
      
      if (data && data.success) {
        setApiFeeds(data.feeds || [])
        transformApiToLocalFeeds(data.feeds || [])
        console.log('Successfully loaded feeds:', data.feeds?.length || 0)
      } else {
        console.error('API returned error:', data)
        Alert.alert("API Error", data?.error || "Failed to fetch feeds")
      }
    } catch (error) {
      console.error("Network error fetching feeds:", error)
      // Check if it's a network connectivity issue
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      if (errorMessage.includes('Network request failed')) {
        Alert.alert("Network Error", "Cannot connect to server. Check your network connection and ensure server is running.")
      } else if (errorMessage.includes('timeout')) {
        Alert.alert("Timeout Error", "Server request timed out. Server may be slow or not responding.")
      } else {
        Alert.alert("Error", `Failed to connect to server: ${errorMessage}`)
      }
    } finally {
      setRefreshing(false)
    }
  }

  const createMultipleFeeds = async (mealType: string, feedsData: any[]) => {
    try {
      setLoading(true)
      console.log('Creating feeds:', { mealType, feedsData, userId, horseId })
      
      const requestBody = {
        user_id: userId,
        horse_id: horseId,
        meal_type: mealType,
        feeds: feedsData
      }
      
      console.log('Request body:', JSON.stringify(requestBody, null, 2))
      
      const url = `${API_BASE_URL}/feeds/create-multiple/`
      console.log('POST to:', url)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })
      
      console.log('Create feeds response status:', response.status)
      console.log('Create feeds response ok:', response.ok)
      
      const responseText = await response.text()
      console.log('Create feeds raw response:', responseText)
      
      if (responseText.trim().startsWith('<')) {
        console.error('Received HTML instead of JSON:', responseText.substring(0, 200))
        Alert.alert("Server Error", "Server returned HTML instead of JSON. Check API endpoint exists.")
        return
      }
      
      if (!responseText.trim()) {
        console.error('Received empty response')
        Alert.alert("Server Error", "Server returned empty response")
        return
      }
      
      let data
      try {
        data = JSON.parse(responseText)
        console.log('Create feeds parsed data:', data)
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        Alert.alert("Parse Error", "Failed to parse server response")
        return
      }
      
      if (data && data.success) {
        Alert.alert("Success", data.message || "Feeds created successfully")
        await fetchFeeds() // Refresh the feeds
      } else {
        console.error('Create feeds API error:', data)
        Alert.alert("Error", data?.error || "Failed to create feeds")
      }
    } catch (error) {
      console.error("Error creating feeds:", error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      if (errorMessage.includes('Network request failed')) {
        Alert.alert("Network Error", "Cannot connect to server. Check your network connection and server status.")
      } else if (errorMessage.includes('timeout')) {
        Alert.alert("Timeout Error", "Server request timed out")
      } else {
        Alert.alert("Error", `Failed to connect to server: ${errorMessage}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const markFeedCompleted = async (feedId: string) => {
    try {
      console.log('Marking feed completed:', feedId)
      
      const url = `${API_BASE_URL}/feeds/${feedId}/complete/`
      console.log('PUT to:', url)
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      console.log('Complete feed response status:', response.status)
      console.log('Complete feed response ok:', response.ok)
      
      const responseText = await response.text()
      console.log('Complete feed raw response:', responseText)
      
      if (responseText.trim().startsWith('<')) {
        console.error('Received HTML instead of JSON:', responseText.substring(0, 200))
        Alert.alert("Server Error", "Server returned HTML instead of JSON")
        return
      }
      
      if (!responseText.trim()) {
        console.error('Received empty response')
        Alert.alert("Server Error", "Server returned empty response")
        return
      }
      
      let data
      try {
        data = JSON.parse(responseText)
        console.log('Complete feed parsed data:', data)
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        Alert.alert("Parse Error", "Failed to parse server response")
        return
      }
      
      if (data && data.success) {
        Alert.alert("Success", "Feed marked as completed")
        await fetchFeeds() // Refresh the feeds
      } else {
        console.error('Complete feed API error:', data)
        Alert.alert("Error", data?.error || "Failed to mark feed as completed")
      }
    } catch (error) {
      console.error("Error marking feed as completed:", error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      if (errorMessage.includes('Network request failed')) {
        Alert.alert("Network Error", "Cannot connect to server")
      } else {
        Alert.alert("Error", `Failed to connect to server: ${errorMessage}`)
      }
    }
  }

  const clearMealFeeds = async (mealType: string) => {
    try {
      const url = `${API_BASE_URL}/feeds/${userId}/${horseId}/${mealType}/clear/`
      console.log('DELETE to:', url)
      
      const response = await fetch(url, {
        method: 'DELETE',
      })
      
      console.log('Clear feeds response status:', response.status)
      
      const responseText = await response.text()
      console.log('Clear feeds raw response:', responseText)
      
      if (responseText.trim().startsWith('<')) {
        console.error('Received HTML instead of JSON:', responseText.substring(0, 200))
        Alert.alert("Server Error", "Server returned HTML instead of JSON")
        return
      }
      
      let data
      try {
        data = JSON.parse(responseText)
        console.log('Clear feeds parsed data:', data)
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        Alert.alert("Parse Error", "Failed to parse server response")
        return
      }
      
      if (data && data.success) {
        Alert.alert("Success", data.message || "Feeds cleared successfully")
        await fetchFeeds() // Refresh the feeds
      } else {
        console.error('Clear feeds API error:', data)
        Alert.alert("Error", data?.error || "Failed to clear feeds")
      }
    } catch (error) {
      console.error("Error clearing feeds:", error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      if (errorMessage.includes('Network request failed')) {
        Alert.alert("Network Error", "Cannot connect to server")
      } else {
        Alert.alert("Error", `Failed to connect to server: ${errorMessage}`)
      }
    }
  }

  // Test connection function
  const testConnection = async () => {
    try {
      console.log('Testing connection to:', `${API_BASE_URL}/health/`)
      const response = await fetch(`${API_BASE_URL}/health/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      console.log('Health check status:', response.status)
      console.log('Health check ok:', response.ok)
      
      const responseText = await response.text()
      console.log('Health check response:', responseText)
      
      if (response.ok) {
        Alert.alert("Connection Test", "✅ Server connection successful!")
      } else {
        Alert.alert("Connection Test", `❌ Server responded with status: ${response.status}\n\nResponse: ${responseText.substring(0, 200)}`)
      }
    } catch (error) {
      console.error('Connection test failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      Alert.alert("Connection Test", `❌ Connection failed: ${errorMessage}`)
    }
  }

  // Test basic API endpoint
  const testBasicEndpoint = async () => {
    try {
      console.log('Testing basic endpoint:', API_BASE_URL)
      const response = await fetch(API_BASE_URL, {
        method: 'GET',
      })
      
      console.log('Basic endpoint status:', response.status)
      const responseText = await response.text()
      console.log('Basic endpoint response preview:', responseText.substring(0, 300))
      
      if (response.ok) {
        Alert.alert("Basic Test", "✅ Basic endpoint accessible!")
      } else {
        Alert.alert("Basic Test", `❌ Status: ${response.status}\n\nCheck if server is running on ${API_BASE_URL}`)
      }
    } catch (error) {
      console.error('Basic endpoint test failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      Alert.alert("Basic Test", `❌ Failed: ${errorMessage}`)
    }
  }

  // Transform API feeds to local format
  const transformApiToLocalFeeds = (feeds: FeedItem[]) => {
    console.log('Transforming feeds:', feeds)
    const breakfast: LocalFeedItem[] = []
    const lunch: LocalFeedItem[] = []
    const dinner: LocalFeedItem[] = []

    feeds.forEach(feed => {
      console.log('Processing feed:', feed)
      // Parse the food string to extract components
      const foodComponents = feed.food.split(', ')
      const feedItem: LocalFeedItem = {
        id: feed.feed_id,
        name: horseName,
        chaff: '',
        restone: '',
        dynamy: '',
        magnesium: ''
      }

      // Extract components from food string
      foodComponents.forEach(component => {
        if (component.includes('Chaff:')) {
          feedItem.chaff = component.split(':')[1]?.trim() || ''
        } else if (component.includes('Restone:')) {
          feedItem.restone = component.split(':')[1]?.trim() || ''
        } else if (component.includes('Dynamy:')) {
          feedItem.dynamy = component.split(':')[1]?.trim() || ''
        } else if (component.includes('Magnesium:')) {
          feedItem.magnesium = component.split(':')[1]?.trim() || ''
        }
      })

      // Group by meal type
      if (feed.time === 'breakfast') {
        breakfast.push(feedItem)
      } else if (feed.time === 'lunch') {
        lunch.push(feedItem)
      } else if (feed.time === 'dinner') {
        dinner.push(feedItem)
      }
    })

    console.log('Transformed feeds - Breakfast:', breakfast.length, 'Lunch:', lunch.length, 'Dinner:', dinner.length)
    
    setBreakfastFeeds(breakfast)
    setLunchFeeds(lunch)
    setDinnerFeeds(dinner)
  }

  // Load feeds on component mount
  useEffect(() => {
    console.log('Component mounted, fetching feeds for:', { userId, horseId })
    fetchFeeds()
  }, [userId, horseId])

  // Show feed log page
  if (showFeedLog) {
    return <FeedLogPage 
      onBack={() => setShowFeedLog(false)} 
      feedType={feedType} 
    />
  }

  const handleEdit = (meal: "breakfast" | "lunch" | "dinner") => {
    setEditingMeal(meal)
    setShowEditModal(true)
    // Reset form
    setNewFeedName(horseName)
    setNewChaff("")
    setNewRestone("")
    setNewDynamy("")
    setNewMagnesium("")
  }

  const handleSaveFeed = async () => {
    if (!newFeedName.trim()) {
      Alert.alert("Error", "Please enter a feed name")
      return
    }

    // Prepare feed data for API
    const feedData = {
      name: newFeedName.trim(),
      chaff: newChaff.trim(),
      restone: newRestone.trim(),
      dynamy: newDynamy.trim(),
      magnesium: newMagnesium.trim(),
    }

    console.log('Saving feed data:', feedData)
    
    // Create feed via API
    await createMultipleFeeds(editingMeal!, [feedData])
    setShowEditModal(false)
  }

  const handleClearMeal = (mealType: "breakfast" | "lunch" | "dinner") => {
    Alert.alert(
      "Clear Feeds",
      `Are you sure you want to clear all ${mealType} feeds?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: () => clearMealFeeds(mealType) }
      ]
    )
  }

  const FeedIcon = () => (
    <View style={styles.feedIconContainer}>
      <View style={styles.bowlShape} />
      <View style={styles.bowlBase} />
    </View>
  )

  const BackIcon = () => (
    <View style={styles.backIconContainer}>
      <View style={styles.backArrow} />
    </View>
  )

  const LogIcon = () => (
    <View style={styles.logIconContainer}>
      <View style={styles.logLine} />
      <View style={[styles.logLine, { marginTop: scale(3) }]} />
      <View style={[styles.logLine, { marginTop: scale(3), width: scale(8) }]} />
    </View>
  )

  const renderFeedTable = (feeds: LocalFeedItem[], mealType: "breakfast" | "lunch" | "dinner") => {
    if (feeds.length === 0) {
      return (
        <View style={styles.noFeedsContainer}>
          <Text style={styles.noFeedsText}>No feeds planned</Text>
        </View>
      )
    }

    const showMagnesium = mealType === "dinner"
    const showRestone = mealType === "breakfast"

    return (
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderCell}>Chaff</Text>
          {showRestone && <Text style={styles.tableHeaderCell}>Restone</Text>}
          {showMagnesium && <Text style={styles.tableHeaderCell}>Magnesium</Text>}
          <Text style={styles.tableHeaderCell}>Dynamy</Text>
        </View>
        {feeds.map((feed) => {
          // Find the corresponding API feed to check completion status
          const apiFeed = apiFeeds.find(af => af.feed_id === feed.id)
          const isCompleted = apiFeed?.completed || false
          
          return (
            <View key={feed.id} style={styles.tableRow}>
              <View style={[styles.horseNameContainer, isCompleted && styles.completedRow]}>
                <Text style={[styles.horseName, isCompleted && styles.completedText]}>
                  {feed.name} {isCompleted && "✓"}
                </Text>
                {!isCompleted && (
                  <TouchableOpacity 
                    style={styles.completeButton}
                    onPress={() => markFeedCompleted(feed.id)}
                  >
                    <Text style={styles.completeButtonText}>Complete</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.tableCells}>
                <Text style={[styles.tableCell, isCompleted && styles.completedText]}>
                  {feed.chaff}
                </Text>
                {showRestone && (
                  <Text style={[styles.tableCell, isCompleted && styles.completedText]}>
                    {feed.restone}
                  </Text>
                )}
                {showMagnesium && (
                  <Text style={[styles.tableCell, isCompleted && styles.completedText]}>
                    {feed.magnesium}
                  </Text>
                )}
                <Text style={[styles.tableCell, isCompleted && styles.completedText]}>
                  {feed.dynamy}
                </Text>
              </View>
            </View>
          )
        })}
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C17A47" />
                
      {/* Header */}
      <View style={[styles.header, { paddingTop: safeArea.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <FeedIcon />
          <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>
            {feedType === "feed" ? "Feeds" : "Water"} - {horseName}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.feedLogButton}
          onPress={() => setShowFeedLog(true)}
        >
          <LogIcon />
        </TouchableOpacity>
      </View>

      {/* Debug Info Section - Remove in production */}
      {debugMode && (
        <View style={styles.debugContainer}>
          <View style={styles.debugHeader}>
            <Text style={styles.debugTitle}>Debug Information</Text>
            <TouchableOpacity 
              onPress={() => setDebugMode(false)}
              style={styles.hideDebugButton}
            >
              <Text style={styles.hideDebugText}>Hide</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.debugText}>API Base URL: {API_BASE_URL}</Text>
          <Text style={styles.debugText}>User ID: {userId}</Text>
          <Text style={styles.debugText}>Horse ID: {horseId}</Text>
          <Text style={styles.debugText}>Horse Name: {horseName}</Text>
          <Text style={styles.debugText}>Loaded Feeds: {apiFeeds.length}</Text>
          <View style={styles.debugButtonContainer}>
            <TouchableOpacity style={styles.debugButton} onPress={testBasicEndpoint}>
              <Text style={styles.debugButtonText}>Test Base URL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.debugButton} onPress={testConnection}>
              <Text style={styles.debugButtonText}>Test Health</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.debugButton} onPress={fetchFeeds}>
              <Text style={styles.debugButtonText}>Test Fetch</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Loading indicator */}
      {(loading || refreshing) && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C17A47" />
          <Text style={styles.loadingText}>
            {refreshing ? "Refreshing feeds..." : "Processing..."}
          </Text>
        </View>
      )}

      {/* Refresh button */}
      <View style={styles.refreshContainer}>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={fetchFeeds}
          disabled={refreshing}
        >
          <Text style={styles.refreshButtonText}>
            {refreshing ? "Refreshing..." : "Refresh Feeds"}
          </Text>
        </TouchableOpacity>
        {!debugMode && (
          <TouchableOpacity 
            style={styles.showDebugButton}
            onPress={() => setDebugMode(true)}
          >
            <Text style={styles.showDebugText}>Debug</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Breakfast Section */}
        <View style={styles.mealSection}>
          <View style={styles.mealHeader}>
            <Text style={styles.mealTitle}>Breakfast</Text>
            <View style={styles.mealActions}>
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => handleClearMeal("breakfast")}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => handleEdit("breakfast")}
              >
                <Text style={styles.editButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
          {renderFeedTable(breakfastFeeds, "breakfast")}
        </View>

        {/* Lunch Section */}
        <View style={styles.mealSection}>
          <View style={styles.mealHeader}>
            <Text style={styles.mealTitle}>Lunch</Text>
            <View style={styles.mealActions}>
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => handleClearMeal("lunch")}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => handleEdit("lunch")}
              >
                <Text style={styles.editButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
          {renderFeedTable(lunchFeeds, "lunch")}
        </View>

        {/* Dinner Section */}
        <View style={styles.mealSection}>
          <View style={styles.mealHeader}>
            <Text style={styles.mealTitle}>Dinner</Text>
            <View style={styles.mealActions}>
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => handleClearMeal("dinner")}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => handleEdit("dinner")}
              >
                <Text style={styles.editButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
          {renderFeedTable(dinnerFeeds, "dinner")}
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1} adjustsFontSizeToFit>
                Add {editingMeal} Feed
              </Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Horse Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={newFeedName}
                  onChangeText={setNewFeedName}
                  placeholder="Enter horse name"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Chaff</Text>
                <TextInput
                  style={styles.textInput}
                  value={newChaff}
                  onChangeText={setNewChaff}
                  placeholder="e.g., 3 scoops"
                  placeholderTextColor="#999"
                />
              </View>

              {editingMeal === "breakfast" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Restone</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newRestone}
                    onChangeText={setNewRestone}
                    placeholder="e.g., 1 scoop"
                    placeholderTextColor="#999"
                  />
                </View>
              )}

              {editingMeal === "dinner" && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Magnesium</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newMagnesium}
                    onChangeText={setNewMagnesium}
                    placeholder="e.g., 2 scoops"
                    placeholderTextColor="#999"
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Dynamy</Text>
                <TextInput
                  style={styles.textInput}
                  value={newDynamy}
                  onChangeText={setNewDynamy}
                  placeholder="e.g., 1 scoop"
                  placeholderTextColor="#999"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveFeed}
                disabled={loading}
              >
                <Text style={styles.saveButtonText}>
                  {loading ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    backgroundColor: "#C17A47",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingBottom: dynamicSpacing(12),
    minHeight: verticalScale(60),
  },
  backButton: {
    padding: scale(8),
    minWidth: scale(40),
    minHeight: scale(40),
    justifyContent: "center",
    alignItems: "center",
  },
  backIconContainer: {
    width: scale(20),
    height: scale(20),
    justifyContent: "center",
    alignItems: "center",
  },
  backArrow: {
    width: scale(12),
    height: scale(12),
    borderLeftWidth: scale(2),
    borderTopWidth: scale(2),
    borderColor: "white",
    transform: [{ rotate: "-45deg" }],
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(8),
  },
  feedIconContainer: {
    width: scale(24),
    height: scale(24),
    marginRight: scale(8),
    justifyContent: "center",
    alignItems: "center",
  },
  bowlShape: {
    width: scale(18),
    height: scale(12),
    borderWidth: scale(2),
    borderColor: "white",
    borderTopLeftRadius: scale(9),
    borderTopRightRadius: scale(9),
    borderBottomWidth: 0,
  },
  bowlBase: {
    width: scale(20),
    height: scale(3),
    backgroundColor: "white",
    borderRadius: scale(1.5),
    marginTop: scale(-1),
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "white",
    flexShrink: 1,
  },
  feedLogButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  logIconContainer: {
    width: scale(16),
    height: scale(16),
    justifyContent: "center",
    alignItems: "center",
  },
  logLine: {
    width: scale(12),
    height: scale(2),
    backgroundColor: "white",
    borderRadius: scale(1),
  },
  // Debug Styles
  debugContainer: {
    backgroundColor: "#FFF3CD",
    margin: scale(16),
    padding: scale(12),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: "#FFEAA7",
  },
  debugHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scale(8),
  },
  debugTitle: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#856404",
  },
  hideDebugButton: {
    backgroundColor: "#856404",
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(4),
  },
  hideDebugText: {
    color: "white",
    fontSize: moderateScale(10),
    fontWeight: "500",
  },
  debugText: {
    fontSize: moderateScale(12),
    color: "#856404",
    marginBottom: scale(4),
  },
  debugButtonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
    marginTop: scale(8),
  },
  debugButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: scale(8),
    paddingVertical: scale(6),
    borderRadius: scale(6),
    alignItems: "center",
  },
  debugButtonText: {
    color: "white",
    fontSize: moderateScale(10),
    fontWeight: "500",
  },
  showDebugButton: {
    backgroundColor: "#FFC107",
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(8),
    alignItems: "center",
    marginLeft: scale(8),
  },
  showDebugText: {
    color: "#212529",
    fontSize: moderateScale(12),
    fontWeight: "500",
  },
  loadingContainer: {
    padding: scale(20),
    alignItems: "center",
    backgroundColor: "white",
    marginHorizontal: scale(16),
    marginTop: scale(10),
    borderRadius: scale(8),
  },
  loadingText: {
    marginTop: scale(10),
    fontSize: moderateScale(14),
    color: "#666",
  },
  refreshContainer: {
    paddingHorizontal: scale(16),
    paddingTop: scale(10),
    flexDirection: "row",
    alignItems: "center",
  },
  refreshButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(8),
    alignItems: "center",
    flex: 1,
  },
  refreshButtonText: {
    color: "white",
    fontSize: moderateScale(12),
    fontWeight: "500",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: scale(16),
    paddingBottom: dynamicSpacing(20),
  },
  mealSection: {
    backgroundColor: "white",
    borderRadius: scale(12),
    marginBottom: verticalScale(16),
    padding: scale(16),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(12),
  },
  mealTitle: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  mealActions: {
    flexDirection: "row",
    gap: scale(8),
  },
  editButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(12),
    minWidth: scale(60),
    alignItems: "center",
  },
  editButtonText: {
    color: "white",
    fontSize: moderateScale(12),
    fontWeight: "500",
  },
  clearButton: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(12),
    minWidth: scale(60),
    alignItems: "center",
  },
  clearButtonText: {
    color: "white",
    fontSize: moderateScale(12),
    fontWeight: "500",
  },
  noFeedsContainer: {
    padding: verticalScale(20),
    alignItems: "center",
  },
  noFeedsText: {
    fontSize: moderateScale(14),
    color: "#666",
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: scale(8),
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F8F8F8",
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(8),
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
    paddingHorizontal: scale(4),
  },
  tableRow: {
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  horseNameContainer: {
    backgroundColor: "#F8F8F8",
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  completedRow: {
    backgroundColor: "#E8F5E8",
  },
  horseName: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  completedText: {
    color: "#4CAF50",
    textDecorationLine: "line-through",
  },
  completeButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(6),
  },
  completeButtonText: {
    color: "white",
    fontSize: moderateScale(10),
    fontWeight: "500",
  },
  tableCells: {
    flexDirection: "row",
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(8),
  },
  tableCell: {
    flex: 1,
    fontSize: moderateScale(12),
    color: "#666",
    textAlign: "center",
    paddingHorizontal: scale(4),
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: scale(20),
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: scale(16),
    width: "100%",
    maxWidth: scale(400),
    maxHeight: height * 0.85,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "#333",
    textTransform: "capitalize",
    flex: 1,
    marginRight: scale(10),
  },
  closeButton: {
    fontSize: moderateScale(20),
    color: "#666",
    fontWeight: "bold",
    padding: scale(5),
  },
  modalContent: {
    padding: scale(20),
    maxHeight: height * 0.5,
  },
  inputGroup: {
    marginBottom: verticalScale(16),
  },
  inputLabel: {
    fontSize: moderateScale(14),
    fontWeight: "500",
    color: "#333",
    marginBottom: verticalScale(6),
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: scale(8),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    fontSize: moderateScale(14),
    color: "#333",
    minHeight: verticalScale(44),
  },
  modalFooter: {
    flexDirection: "row",
    padding: scale(20),
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    gap: scale(12),
  },
  cancelButton: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
    minHeight: verticalScale(44),
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: moderateScale(14),
    color: "#666",
    fontWeight: "500",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#C17A47",
    paddingVertical: verticalScale(12),
    borderRadius: scale(8),
    alignItems: "center",
    minHeight: verticalScale(44),
    justifyContent: "center",
  },
  saveButtonText: {
    fontSize: moderateScale(14),
    color: "white",
    fontWeight: "600",
  },
})