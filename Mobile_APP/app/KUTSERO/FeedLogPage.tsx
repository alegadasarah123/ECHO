"use client"
import { useState } from "react"
import {
    Dimensions,
    Modal,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

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

interface FeedLogEntry {
  id: string
  date: string
  mealType: "breakfast" | "lunch" | "dinner"
  horseName: string
  time: string
  feedItems: { name: string; amount: string }[]
}

interface FeedLogPageProps {
  onBack: () => void
  feedType?: "feed" | "water" // Made optional
}

export default function FeedLogPage({ onBack, feedType = "feed" }: FeedLogPageProps) {
  const [selectedDate, setSelectedDate] = useState("27/06/2024")
  const [selectedStatus, setSelectedStatus] = useState("All Status")
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showStatusPicker, setShowStatusPicker] = useState(false)
  
  const safeArea = getSafeAreaPadding()

  // Sample feed log data
  const [feedLogEntries] = useState<FeedLogEntry[]>([
    {
      id: "1",
      date: "Today - May 7, 2025",
      mealType: "breakfast",
      horseName: "Wetzon",
      time: "7:30 AM",
      feedItems: [
        { name: "Chaff", amount: "3 scoops" },
        { name: "Restone", amount: "1 scoop" }
      ]
    },
    {
      id: "2",
      date: "Today - May 7, 2025",
      mealType: "lunch",
      horseName: "Oscar",
      time: "12:30 PM",
      feedItems: [
        { name: "Chaff", amount: "2 scoops" },
        { name: "Dynamy", amount: "1 scoop" }
      ]
    },
    {
      id: "3",
      date: "Yesterday - May 6, 2025",
      mealType: "dinner",
      horseName: "Wetzon",
      time: "6:00 PM",
      feedItems: [
        { name: "Chaff", amount: "2 scoops" },
        { name: "Magnesium", amount: "1 scoop" }
      ]
    }
  ])

  const dateOptions = [
    "27/06/2024",
    "26/06/2024", 
    "25/06/2024",
    "24/06/2024"
  ]

  const statusOptions = [
    "All Status",
    "Completed",
    "Pending",
    "Missed"
  ]

  const BackIcon = () => (
    <View style={styles.backIconContainer}>
      <View style={styles.backArrow} />
    </View>
  )

  const DropdownIcon = () => (
    <View style={styles.dropdownIconContainer}>
      <View style={styles.dropdownArrow} />
    </View>
  )

  // Group entries by date
  const groupedEntries = feedLogEntries.reduce((groups, entry) => {
    const date = entry.date
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(entry)
    return groups
  }, {} as Record<string, FeedLogEntry[]>)

  const getMealTypeColor = (mealType: string) => {
    switch (mealType) {
      case "breakfast": return "#FF9500"
      case "lunch": return "#34C759"
      case "dinner": return "#5856D6"
      default: return "#666"
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C17A47" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: safeArea.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>
          {feedType === "feed" ? "Feed Log" : "Water Log"}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.filterText} numberOfLines={1}>{selectedDate}</Text>
          <DropdownIcon />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowStatusPicker(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.filterText} numberOfLines={1}>{selectedStatus}</Text>
          <DropdownIcon />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {Object.entries(groupedEntries).map(([date, entries]) => (
          <View key={date} style={styles.dateSection}>
            <Text style={styles.dateHeader} numberOfLines={1} adjustsFontSizeToFit>
              {date}
            </Text>
            {entries.map((entry) => (
              <View key={entry.id} style={styles.logEntry}>
                <View style={styles.logEntryHeader}>
                  <View style={styles.mealInfoContainer}>
                    <Text style={styles.mealInfo} numberOfLines={1}>
                      <Text style={[styles.mealType, { color: getMealTypeColor(entry.mealType) }]}>
                        {entry.mealType.charAt(0).toUpperCase() + entry.mealType.slice(1)}
                      </Text>
                      <Text style={styles.horseName}> - {entry.horseName}</Text>
                    </Text>
                  </View>
                  <Text style={styles.timeText}>{entry.time}</Text>
                </View>
                <View style={styles.feedItemsContainer}>
                  {entry.feedItems.map((item, index) => (
                    <View key={index} style={styles.feedItemWrapper}>
                      <Text style={styles.feedItemText}>
                        {item.name}: {item.amount}
                      </Text>
                      {index < entry.feedItems.length - 1 && (
                        <Text style={styles.feedItemSeparator}>  •  </Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ))}
        
        {/* Empty state */}
        {Object.keys(groupedEntries).length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No feed logs found</Text>
            <Text style={styles.emptyStateSubtext}>
              Feed logs will appear here once you start tracking meals
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          onPress={() => setShowDatePicker(false)}
          activeOpacity={1}
        >
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Date</Text>
            </View>
            <ScrollView style={styles.pickerScrollView} showsVerticalScrollIndicator={false}>
              {dateOptions.map((date) => (
                <TouchableOpacity
                  key={date}
                  style={[
                    styles.pickerOption,
                    selectedDate === date && styles.selectedPickerOption
                  ]}
                  onPress={() => {
                    setSelectedDate(date)
                    setShowDatePicker(false)
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    selectedDate === date && styles.selectedPickerOptionText
                  ]}>
                    {date}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Status Picker Modal */}
      <Modal
        visible={showStatusPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStatusPicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          onPress={() => setShowStatusPicker(false)}
          activeOpacity={1}
        >
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Status</Text>
            </View>
            <ScrollView style={styles.pickerScrollView} showsVerticalScrollIndicator={false}>
              {statusOptions.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.pickerOption,
                    selectedStatus === status && styles.selectedPickerOption
                  ]}
                  onPress={() => {
                    setSelectedStatus(status)
                    setShowStatusPicker(false)
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    selectedStatus === status && styles.selectedPickerOptionText
                  ]}>
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
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
  headerTitle: {
    flex: 1,
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "white",
    textAlign: "center",
    paddingHorizontal: scale(8),
  },
  headerRight: {
    width: scale(40),
  },
  filtersContainer: {
    flexDirection: "row",
    paddingHorizontal: scale(16),
    paddingVertical: dynamicSpacing(12),
    backgroundColor: "white",
    gap: scale(12),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  filterButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    backgroundColor: "#F8F9FA",
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: "#E0E0E0",
    minHeight: verticalScale(44),
  },
  filterText: {
    fontSize: moderateScale(14),
    color: "#333",
    flex: 1,
    marginRight: scale(8),
  },
  dropdownIconContainer: {
    width: scale(12),
    height: scale(12),
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownArrow: {
    width: scale(8),
    height: scale(8),
    borderRightWidth: scale(2),
    borderBottomWidth: scale(2),
    borderColor: "#666",
    transform: [{ rotate: "45deg" }],
  },
  content: {
    flex: 1,
    backgroundColor: "white",
  },
  contentContainer: {
    paddingBottom: dynamicSpacing(20),
  },
  dateSection: {
    marginBottom: verticalScale(20),
  },
  dateHeader: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#333",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    backgroundColor: "#F8F9FA",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  logEntry: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    minHeight: verticalScale(60),
  },
  logEntryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: verticalScale(6),
  },
  mealInfoContainer: {
    flex: 1,
    marginRight: scale(8),
  },
  mealInfo: {
    flexShrink: 1,
  },
  mealType: {
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  horseName: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
  },
  timeText: {
    fontSize: moderateScale(12),
    color: "#666",
    textAlign: "right",
  },
  feedItemsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  feedItemWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  feedItemText: {
    fontSize: moderateScale(12),
    color: "#666",
    lineHeight: moderateScale(16),
  },
  feedItemSeparator: {
    fontSize: moderateScale(12),
    color: "#999",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: verticalScale(60),
    paddingHorizontal: scale(20),
  },
  emptyStateText: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
    marginBottom: verticalScale(8),
  },
  emptyStateSubtext: {
    fontSize: moderateScale(14),
    color: "#999",
    textAlign: "center",
    lineHeight: moderateScale(20),
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: scale(20),
  },
  pickerContainer: {
    backgroundColor: "white",
    borderRadius: scale(12),
    minWidth: scale(250),
    maxWidth: width * 0.8,
    maxHeight: height * 0.6,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pickerHeader: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    alignItems: "center",
  },
  pickerTitle: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#333",
  },
  pickerScrollView: {
    maxHeight: height * 0.4,
  },
  pickerOption: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(15),
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    minHeight: verticalScale(50),
    justifyContent: "center",
  },
  selectedPickerOption: {
    backgroundColor: "#C17A47",
  },
  pickerOptionText: {
    fontSize: moderateScale(14),
    color: "#333",
    textAlign: "center",
  },
  selectedPickerOptionText: {
    color: "white",
    fontWeight: "600",
  },
})
