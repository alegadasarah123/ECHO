"use client"

import { useState, useEffect } from "react"
import {
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native"

const { width, height } = Dimensions.get("window")

// Enhanced responsive scaling functions
const scale = (size: number) => {
  const scaleFactor = width / 375
  const scaledSize = size * scaleFactor
  return Math.max(Math.min(scaledSize, size * 1.3), size * 0.7)
}

const verticalScale = (size: number) => {
  const scaleFactor = height / 812
  const scaledSize = size * scaleFactor
  return Math.max(Math.min(scaledSize, size * 1.2), size * 0.8)
}

const moderateScale = (size: number, factor = 0.5) => {
  const scaledSize = size + (scale(size) - size) * factor
  return Math.max(Math.min(scaledSize, size * 1.2), size * 0.8)
}

const dynamicSpacing = (baseSize: number) => {
  if (width < 350) return verticalScale(baseSize * 0.7)
  if (width < 400) return verticalScale(baseSize * 0.85)
  if (width > 450) return verticalScale(baseSize * 1.1)
  return verticalScale(baseSize)
}

const getSafeAreaPadding = () => {
  const statusBarHeight = StatusBar.currentHeight || 0
  return {
    top: Math.max(statusBarHeight, 20),
    bottom: height > 800 ? 34 : 20,
  }
}

interface FeedLogEntry {
  id: string
  horse_name: string
  food_type: string
  amount: string
  meal_type: string
  fed_at: string
  completed_at: string
}

interface FeedLogPageProps {
  onBack: () => void
  feedType: "feed" | "water"
}

export default function FeedLogPage({ onBack, feedType }: FeedLogPageProps) {
  const [feedLogs, setFeedLogs] = useState<FeedLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const safeArea = getSafeAreaPadding()

  // Mock data for demonstration - replace with actual API call
  const mockFeedLogs: FeedLogEntry[] = [
    {
      id: "1",
      horse_name: "Oscar",
      food_type: "Hay",
      amount: "3 scoops",
      meal_type: "Breakfast",
      fed_at: "2024-01-15T07:00:00Z",
      completed_at: "2024-01-15T07:15:00Z",
    },
    {
      id: "2",
      horse_name: "Oscar",
      food_type: "Oats",
      amount: "2 cups",
      meal_type: "Lunch",
      fed_at: "2024-01-15T12:00:00Z",
      completed_at: "2024-01-15T12:10:00Z",
    },
    {
      id: "3",
      horse_name: "Oscar",
      food_type: "Mixed Feed",
      amount: "4 scoops",
      meal_type: "Dinner",
      fed_at: "2024-01-14T18:00:00Z",
      completed_at: "2024-01-14T18:20:00Z",
    },
  ]

  const fetchFeedLogs = async () => {
    try {
      setRefreshing(true)
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setFeedLogs(mockFeedLogs)
    } catch (error) {
      console.error("Error fetching feed logs:", error)
      Alert.alert("Error", "Failed to load feed logs")
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchFeedLogs()
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C17A47" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: safeArea.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <LogIcon />
          <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>
            {feedType === "feed" ? "Feed" : "Water"} Log
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Loading indicator */}
      {(loading || refreshing) && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C17A47" />
          <Text style={styles.loadingText}>Loading feed logs...</Text>
        </View>
      )}

      {/* Refresh button */}
      <View style={styles.refreshContainer}>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchFeedLogs} disabled={refreshing}>
          <Text style={styles.refreshButtonText}>{refreshing ? "Refreshing..." : "Refresh Logs"}</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {feedLogs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No feed logs available</Text>
            <Text style={styles.emptySubtext}>Completed feeds will appear here</Text>
          </View>
        ) : (
          feedLogs.map((log) => (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.logHeader}>
                <Text style={styles.horseName}>{log.horse_name}</Text>
                <Text style={styles.mealType}>{log.meal_type}</Text>
              </View>

              <View style={styles.logDetails}>
                <View style={styles.logRow}>
                  <Text style={styles.logLabel}>Food Type:</Text>
                  <Text style={styles.logValue}>{log.food_type}</Text>
                </View>

                <View style={styles.logRow}>
                  <Text style={styles.logLabel}>Amount:</Text>
                  <Text style={styles.logValue}>{log.amount}</Text>
                </View>

                <View style={styles.logRow}>
                  <Text style={styles.logLabel}>Scheduled:</Text>
                  <Text style={styles.logValue}>{formatDate(log.fed_at)}</Text>
                </View>

                <View style={styles.logRow}>
                  <Text style={styles.logLabel}>Completed:</Text>
                  <Text style={styles.logValue}>{formatDate(log.completed_at)}</Text>
                </View>
              </View>

              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>✓ Completed</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
  logIconContainer: {
    width: scale(24),
    height: scale(24),
    marginRight: scale(8),
    justifyContent: "center",
    alignItems: "center",
  },
  logLine: {
    width: scale(12),
    height: scale(2),
    backgroundColor: "white",
    borderRadius: scale(1),
  },
  headerTitle: {
    color: "white",
    fontSize: moderateScale(18),
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
  },
  headerSpacer: {
    width: scale(40),
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: scale(16),
  },
  loadingText: {
    fontSize: moderateScale(14),
    color: "#666",
    marginTop: scale(8),
  },
  refreshContainer: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
  },
  refreshButton: {
    backgroundColor: "#C17A47",
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(6),
    alignItems: "center",
  },
  refreshButtonText: {
    color: "white",
    fontSize: moderateScale(14),
    fontWeight: "500",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: dynamicSpacing(20),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: dynamicSpacing(60),
  },
  emptyText: {
    fontSize: moderateScale(16),
    color: "#666",
    fontWeight: "500",
    marginBottom: scale(8),
  },
  emptySubtext: {
    fontSize: moderateScale(14),
    color: "#999",
    textAlign: "center",
  },
  logCard: {
    backgroundColor: "white",
    marginHorizontal: scale(16),
    marginTop: dynamicSpacing(12),
    borderRadius: scale(12),
    padding: scale(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.1,
    shadowRadius: scale(4),
    elevation: 3,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scale(12),
    paddingBottom: scale(8),
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  horseName: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#333",
  },
  mealType: {
    fontSize: moderateScale(14),
    fontWeight: "500",
    color: "#C17A47",
    backgroundColor: "#FFF5F0",
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(4),
  },
  logDetails: {
    marginBottom: scale(12),
  },
  logRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scale(6),
  },
  logLabel: {
    fontSize: moderateScale(13),
    color: "#666",
    fontWeight: "500",
  },
  logValue: {
    fontSize: moderateScale(13),
    color: "#333",
    fontWeight: "400",
    textAlign: "right",
    flex: 1,
    marginLeft: scale(16),
  },
  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E8F5E8",
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(4),
  },
  statusText: {
    fontSize: moderateScale(12),
    color: "#4CAF50",
    fontWeight: "500",
  },
})
