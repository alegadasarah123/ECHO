"use client"

import { useRouter } from "expo-router"
import { useState } from "react"
import { Dimensions, Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native"

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

interface HistoryEntry {
  id: string
  horseName: string
  action: string
  time: string
  date: string
  status?: string
  additionalInfo?: string
  duration?: string
}

export default function HistoryScreen() {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState("This Week")

  const safeArea = getSafeAreaPadding()

  // Enhanced sample history data
  const [historyEntries] = useState<HistoryEntry[]>([
    {
      id: "1",
      horseName: "Oscar",
      action: "Check-in",
      time: "06:45 AM",
      date: "Today • May 25, 2025",
      additionalInfo: "Check-out 11:05 AM",
      duration: "4h 20m",
      status: "Completed",
    },
    {
      id: "2",
      horseName: "Oscar",
      action: "Check-out",
      time: "02:15 PM",
      date: "Today • May 25, 2025",
      status: "Completed",
      additionalInfo: "Work session completed",
      duration: "6h 30m",
    },
    {
      id: "3",
      horseName: "Thunder",
      action: "Check-in",
      time: "07:30 AM",
      date: "Yesterday • May 24, 2025",
      additionalInfo: "Check-out 01:45 PM",
      duration: "6h 15m",
      status: "Completed",
    },
  ])

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "Completed":
        return "#4CAF50"
      case "Under Care":
        return "#FF9800"
      case "In Progress":
        return "#2196F3"
      default:
        return "#666"
    }
  }

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case "check-in":
        return "✓"
      case "check-out":
        return "→"
      case "veterinary check":
        return "+"
      case "training session":
        return "🏃"
      default:
        return "•"
    }
  }

  // Group entries by date
  const groupedEntries = historyEntries.reduce((groups: { [key: string]: HistoryEntry[] }, entry) => {
    const date = entry.date
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(entry)
    return groups
  }, {})

  // Dashboard/Home Icon Component
  const DashboardIcon = ({ color }: { color: string }) => (
    <View style={styles.iconContainer}>
      <View style={styles.dashboardGrid}>
        <View style={[styles.gridSquare, styles.gridTopLeft, { backgroundColor: color }]} />
        <View style={[styles.gridSquare, styles.gridTopRight, { backgroundColor: color }]} />
        <View style={[styles.gridSquare, styles.gridBottomLeft, { backgroundColor: color }]} />
        <View style={[styles.gridSquare, styles.gridBottomRight, { backgroundColor: color }]} />
      </View>
    </View>
  )

  // Profile Icon Component
  const ProfileIcon = ({ color }: { color: string }) => (
    <View style={styles.iconContainer}>
      <View style={styles.profileContainer}>
        <View style={[styles.profileHead, { backgroundColor: color }]} />
        <View style={[styles.profileBody, { backgroundColor: color }]} />
      </View>
    </View>
  )

  const TabButton = ({
    iconSource,
    label,
    tabKey,
    isActive,
  }: {
    iconSource: any
    label: string
    tabKey: string
    isActive: boolean
  }) => (
    <TouchableOpacity
      style={styles.tabButton}
      onPress={() => {
        // Navigate directly without updating local state
        if (tabKey === "home") {
          router.push("/(tabs)/dashboard")
        } else if (tabKey === "horse") {
          router.push("/(tabs)/horsecare")
        } else if (tabKey === "chat") {
          router.push("/(tabs)/messages")
        } else if (tabKey === "calendar") {
          router.push("/(tabs)/calendar")
        } else if (tabKey === "history") {
          // Stay on history - already here
        } else if (tabKey === "profile") {
          router.push("/(tabs)/profile")
        }
      }}
    >
      <View style={[styles.tabIcon, isActive && styles.activeTabIcon]}>
        {iconSource ? (
          <Image
            source={iconSource}
            style={[styles.tabIconImage, { tintColor: isActive ? "white" : "#666" }]}
            resizeMode="contain"
          />
        ) : tabKey === "home" ? (
          <DashboardIcon color={isActive ? "white" : "#666"} />
        ) : tabKey === "profile" ? (
          <ProfileIcon color={isActive ? "white" : "#666"} />
        ) : (
          <View style={styles.fallbackIcon} />
        )}
      </View>
      <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>{label}</Text>
    </TouchableOpacity>
  )

  const FilterButton = ({ title, isActive }: { title: string; isActive: boolean }) => (
    <TouchableOpacity
      style={[styles.filterButton, isActive && styles.activeFilterButton]}
      onPress={() => setActiveFilter(title)}
    >
      <Text style={[styles.filterButtonText, isActive && styles.activeFilterButtonText]}>{title}</Text>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: safeArea.top }]}>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Activity History</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Summary Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>24</Text>
            <Text style={styles.statLabel}>Total Sessions</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>156h</Text>
            <Text style={styles.statLabel}>Total Hours</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>8</Text>
            <Text style={styles.statLabel}>Horses Worked</Text>
          </View>
        </View>

        {/* Horse Check Log Section */}
        <View style={styles.logSection}>
          <Text style={styles.logTitle}>Horse Activity Log</Text>

          {/* Filter Buttons */}
          <View style={styles.filterContainer}>
            <FilterButton title="This Week" isActive={activeFilter === "This Week"} />
            <FilterButton title="This Month" isActive={activeFilter === "This Month"} />
            <FilterButton title="Custom" isActive={activeFilter === "Custom"} />
          </View>

          {/* History Entries */}
          <ScrollView style={styles.entriesContainer} showsVerticalScrollIndicator={false}>
            {Object.entries(groupedEntries).map(([date, entries]) => (
              <View key={date}>
                {/* Date Header */}
                <View style={styles.dateContainer}>
                  <Text style={styles.dateText}>{date}</Text>
                </View>

                {/* Entries for this date */}
                {entries.map((entry) => (
                  <View key={entry.id} style={styles.historyEntry}>
                    <View style={styles.entryLeft}>
                      <View style={styles.horseAvatar}>
                        <Image
                          source={require("../../assets/images/horse.png")}
                          style={[styles.horseIconImage, { tintColor: "#C17A47" }]}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={styles.actionIndicator}>
                        <Text style={styles.actionIcon}>{getActionIcon(entry.action)}</Text>
                      </View>
                    </View>
                    <View style={styles.entryContent}>
                      <View style={styles.entryHeader}>
                        <Text style={styles.horseName}>{entry.horseName}</Text>
                        <Text style={styles.entryTime}>{entry.time}</Text>
                      </View>
                      <Text style={styles.entryAction}>{entry.action}</Text>
                      {entry.duration && <Text style={styles.durationText}>Duration: {entry.duration}</Text>}
                      {entry.additionalInfo && <Text style={styles.additionalInfo}>{entry.additionalInfo}</Text>}
                      {entry.status && (
                        <View style={styles.statusContainer}>
                          <View style={[styles.statusDot, { backgroundColor: getStatusColor(entry.status) }]} />
                          <Text style={[styles.entryStatus, { color: getStatusColor(entry.status) }]}>
                            {entry.status}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ))}

            {/* Empty State */}
            {historyEntries.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No activity history found</Text>
                <Text style={styles.emptyStateSubtext}>Your horse activity will appear here</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Bottom Tab Navigation - Updated order: History before Profile */}
      <View style={[styles.tabBar, { paddingBottom: safeArea.bottom }]}>
        <TabButton iconSource={null} label="Home" tabKey="home" isActive={false} />
        <TabButton iconSource={require("../../assets/images/horse.png")} label="Horse" tabKey="horse" isActive={false} />
        <TabButton iconSource={require("../../assets/images/chat.png")} label="Chat" tabKey="chat" isActive={false} />
        <TabButton
          iconSource={require("../../assets/images/calendar.png")}
          label="Calendar"
          tabKey="calendar"
          isActive={false}
        />
        <TabButton
          iconSource={require("../../assets/images/history.png")}
          label="History"
          tabKey="history"
          isActive={true}
        />
        <TabButton iconSource={null} label="Profile" tabKey="profile" isActive={false} />
      </View>
    </View>
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
    minHeight: verticalScale(50),
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "white",
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
    fontSize: moderateScale(20),
    fontWeight: "bold",
    color: "white",
    marginBottom: verticalScale(2),
  },
  statLabel: {
    fontSize: moderateScale(10),
    color: "rgba(255,255,255,0.8)",
  },
  logSection: {
    flex: 1,
    paddingHorizontal: scale(16),
    paddingTop: dynamicSpacing(16),
  },
  logTitle: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(12),
  },
  filterContainer: {
    flexDirection: "row",
    marginBottom: verticalScale(16),
    gap: scale(8),
  },
  filterButton: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(16),
    backgroundColor: "#F0F0F0",
  },
  activeFilterButton: {
    backgroundColor: "#C17A47",
  },
  filterButtonText: {
    fontSize: moderateScale(12),
    color: "#666",
    fontWeight: "500",
  },
  activeFilterButtonText: {
    color: "white",
  },
  dateContainer: {
    marginBottom: verticalScale(8),
    marginTop: verticalScale(12),
  },
  dateText: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
  },
  entriesContainer: {
    flex: 1,
  },
  historyEntry: {
    flexDirection: "row",
    paddingVertical: verticalScale(8),
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  entryLeft: {
    marginRight: scale(10),
    alignItems: "center",
  },
  horseAvatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(4),
  },
  horseIconImage: {
    width: scale(20),
    height: scale(20),
  },
  actionIndicator: {
    width: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    backgroundColor: "#C17A47",
    justifyContent: "center",
    alignItems: "center",
  },
  actionIcon: {
    fontSize: moderateScale(8),
    color: "white",
    fontWeight: "bold",
  },
  entryContent: {
    flex: 1,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(2),
  },
  horseName: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
  },
  entryTime: {
    fontSize: moderateScale(10),
    color: "#666",
  },
  entryAction: {
    fontSize: moderateScale(12),
    color: "#666",
    marginBottom: verticalScale(2),
    fontWeight: "500",
  },
  durationText: {
    fontSize: moderateScale(10),
    color: "#2196F3",
    marginBottom: verticalScale(2),
    fontWeight: "500",
  },
  additionalInfo: {
    fontSize: moderateScale(10),
    color: "#999",
    marginBottom: verticalScale(2),
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: verticalScale(2),
  },
  statusDot: {
    width: scale(4),
    height: scale(4),
    borderRadius: scale(2),
    marginRight: scale(4),
  },
  entryStatus: {
    fontSize: moderateScale(10),
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: verticalScale(40),
  },
  emptyStateText: {
    fontSize: moderateScale(16),
    color: "#666",
    fontWeight: "500",
    marginBottom: verticalScale(8),
  },
  emptyStateSubtext: {
    fontSize: moderateScale(14),
    color: "#999",
  },
  // Tab Bar Styles
  tabBar: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingVertical: dynamicSpacing(8),
    paddingHorizontal: scale(8),
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    minHeight: verticalScale(60),
    alignItems: "center",
    justifyContent: "space-around",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: verticalScale(4),
  },
  tabIcon: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(2),
  },
  activeTabIcon: {
    backgroundColor: "#C17A47",
  },
  tabIconImage: {
    width: scale(16),
    height: scale(16),
  },
  fallbackIcon: {
    width: scale(16),
    height: scale(16),
    backgroundColor: "#666",
    borderRadius: scale(2),
  },
  tabLabel: {
    fontSize: moderateScale(9),
    color: "#666",
    textAlign: "center",
  },
  activeTabLabel: {
    color: "#C17A47",
    fontWeight: "600",
  },
  // Icon container for custom icons
  iconContainer: {
    width: scale(16),
    height: scale(16),
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  // Dashboard/Home Icon Styles
  dashboardGrid: {
    width: scale(16),
    height: scale(16),
    position: "relative",
  },
  gridSquare: {
    width: scale(6),
    height: scale(6),
    position: "absolute",
  },
  gridTopLeft: {
    top: 0,
    left: 0,
  },
  gridTopRight: {
    top: 0,
    right: 0,
  },
  gridBottomLeft: {
    bottom: 0,
    left: 0,
  },
  gridBottomRight: {
    bottom: 0,
    right: 0,
  },
  // Profile Icon Styles
  profileContainer: {
    width: scale(16),
    height: scale(16),
    position: "relative",
    alignItems: "center",
  },
  profileHead: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    position: "absolute",
    top: 0,
  },
  profileBody: {
    width: scale(12),
    height: scale(8),
    borderTopLeftRadius: scale(6),
    borderTopRightRadius: scale(6),
    position: "absolute",
    bottom: 0,
  },
})
