import { useState } from "react"
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
    View
} from "react-native"
import FeedLogPage from "./FeedLogPage"

const { width, height } = Dimensions.get("window")

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
}

export default function FeedPage({ onBack, feedType, horseName = "Oscar" }: FeedPageProps) {
  const [showEditModal, setShowEditModal] = useState(false)
  const [showFeedLog, setShowFeedLog] = useState(false)
  const [editingMeal, setEditingMeal] = useState<"breakfast" | "lunch" | "dinner" | null>(null)
  const [newFeedName, setNewFeedName] = useState("")
  const [newChaff, setNewChaff] = useState("")
  const [newRestone, setNewRestone] = useState("")
  const [newDynamy, setNewDynamy] = useState("")
  const [newMagnesium, setNewMagnesium] = useState("")
  
  const safeArea = getSafeAreaPadding()

  const [breakfastFeeds, setBreakfastFeeds] = useState<FeedItem[]>([
    {
      id: "1",
      name: horseName,
      chaff: "3 scoops",
      restone: "1 scoop",
      dynamy: "",
    }
  ])

  const [lunchFeeds, setLunchFeeds] = useState<FeedItem[]>([])

  const [dinnerFeeds, setDinnerFeeds] = useState<FeedItem[]>([
    {
      id: "2", 
      name: horseName,
      chaff: "",
      magnesium: "",
      dynamy: "",
    }
  ])

  // Show feed log page
  if (showFeedLog) {
    return <FeedLogPage onBack={() => setShowFeedLog(false)} feedType={feedType} />
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

  const handleSaveFeed = () => {
    if (!newFeedName.trim()) {
      Alert.alert("Error", "Please enter a feed name")
      return
    }

    const newFeed: FeedItem = {
      id: Date.now().toString(),
      name: newFeedName.trim(),
      chaff: newChaff.trim(),
      restone: newRestone.trim(),
      dynamy: newDynamy.trim(),
      magnesium: newMagnesium.trim(),
    }

    if (editingMeal === "breakfast") {
      setBreakfastFeeds(prev => [...prev, newFeed])
    } else if (editingMeal === "lunch") {
      setLunchFeeds(prev => [...prev, newFeed])
    } else if (editingMeal === "dinner") {
      setDinnerFeeds(prev => [...prev, newFeed])
    }

    setShowEditModal(false)
    Alert.alert("Success", "Feed added successfully!")
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

  const renderFeedTable = (feeds: FeedItem[], mealType: "breakfast" | "lunch" | "dinner") => {
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
        {feeds.map((feed) => (
          <View key={feed.id} style={styles.tableRow}>
            <View style={styles.horseNameContainer}>
              <Text style={styles.horseName}>{feed.name}</Text>
            </View>
            <View style={styles.tableCells}>
              <Text style={styles.tableCell}>{feed.chaff}</Text>
              {showRestone && <Text style={styles.tableCell}>{feed.restone}</Text>}
              {showMagnesium && <Text style={styles.tableCell}>{feed.magnesium}</Text>}
              <Text style={styles.tableCell}>{feed.dynamy}</Text>
            </View>
          </View>
        ))}
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
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => handleEdit("breakfast")}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
          {renderFeedTable(breakfastFeeds, "breakfast")}
        </View>

        {/* Lunch Section */}
        <View style={styles.mealSection}>
          <View style={styles.mealHeader}>
            <Text style={styles.mealTitle}>Lunch</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => handleEdit("lunch")}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
          {renderFeedTable(lunchFeeds, "lunch")}
        </View>

        {/* Dinner Section */}
        <View style={styles.mealSection}>
          <View style={styles.mealHeader}>
            <Text style={styles.mealTitle}>Dinner</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => handleEdit("dinner")}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
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
              >
                <Text style={styles.saveButtonText}>Save</Text>
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
  },
  horseName: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
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