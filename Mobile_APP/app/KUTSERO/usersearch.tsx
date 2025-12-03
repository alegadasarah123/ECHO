"use client"

import { useLocalSearchParams, useRouter } from "expo-router"
import * as SecureStore from "expo-secure-store"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

const { width } = Dimensions.get("window")

const API_BASE_URL = "http://1192.168.31.58:8000/api/kutsero"

interface SearchUserProfile {
  id: string
  name: string
  role: string
  user_type?: string
  user_status?: string
  avatar?: string
  email?: string
  phone?: string
}

export default function UserSearchScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const initialQuery = (params.query as string) || ""

  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [allUsers, setAllUsers] = useState<SearchUserProfile[]>([])
  const [searchResults, setSearchResults] = useState<SearchUserProfile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [accessToken, setAccessToken] = useState<string>("")

  useEffect(() => {
    loadAccessToken()
  }, [])

  useEffect(() => {
    if (accessToken) {
      if (initialQuery.trim()) {
        // If there's an initial query, search directly
        performSearch(initialQuery)
      } else {
        // Otherwise load all users
        loadAllUsers()
      }
    }
  }, [accessToken, initialQuery])

  const loadAccessToken = async () => {
    try {
      const token = await SecureStore.getItemAsync("access_token")
      if (token) {
        setAccessToken(token)
      }
    } catch (error) {
      console.error("Error loading access token:", error)
    }
  }

  const loadAllUsers = async () => {
    setIsLoading(true)
    try {
      console.log("🔍 Fetching all users from API...")
      const response = await fetch(`${API_BASE_URL}/get_all_users/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      })

      console.log("📡 Response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("✅ Raw response data:", JSON.stringify(data, null, 2))

        const usersArray = Array.isArray(data) ? data : data.users || []

        console.log("📊 Total users received:", usersArray.length)

        if (usersArray.length > 0) {
          const roleCount: { [key: string]: number } = {}
          usersArray.forEach((user: SearchUserProfile) => {
            roleCount[user.role] = (roleCount[user.role] || 0) + 1
          })
          console.log("👥 Users by role:", roleCount)
        }

        setAllUsers(usersArray)
        setSearchResults(usersArray)
      } else {
        const errorText = await response.text()
        console.error("❌ Failed to load users:", response.status, errorText)
        setAllUsers([])
        setSearchResults([])
      }
    } catch (error) {
      console.error("❌ Error loading users:", error)
      setAllUsers([])
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults(allUsers)
      return
    }

    setIsSearching(true)
    try {
      console.log(`🔍 Performing search for: "${query}"`)
      const response = await fetch(
        `${API_BASE_URL}/search_all_users/?query=${encodeURIComponent(query)}&limit=50`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        console.log("🔍 Search results:", data)
        
        // Handle both response formats
        const searchResults = data.users || data.data || []
        console.log(`🔍 Found ${searchResults.length} users for query: "${query}"`)
        
        setSearchResults(searchResults)
      } else {
        console.error("❌ Search failed:", response.status)
        // Fallback to client-side filtering if API search fails
        filterUsersLocally(query)
      }
    } catch (error) {
      console.error("❌ Error performing search:", error)
      // Fallback to client-side filtering
      filterUsersLocally(query)
    } finally {
      setIsSearching(false)
    }
  }

  const filterUsersLocally = (query: string) => {
    const searchLower = query.toLowerCase()
    const filtered = allUsers.filter((user: SearchUserProfile) => {
      const nameLower = user.name.toLowerCase()
      const roleLower = user.role.toLowerCase()
      const emailLower = (user.email || "").toLowerCase()

      return nameLower.includes(searchLower) || roleLower.includes(searchLower) || emailLower.includes(searchLower)
    })

    console.log(`🔍 Filtered ${filtered.length} users from ${allUsers.length} total for query: "${query}"`)
    setSearchResults(filtered)
  }

  const handleSearchChange = (text: string) => {
    setSearchQuery(text)
    if (text.trim()) {
      performSearch(text)
    } else {
      setSearchResults(allUsers)
    }
  }

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      performSearch(searchQuery)
    }
  }

  const clearSearch = () => {
    setSearchQuery("")
    setSearchResults(allUsers)
  }

  const getRoleInfo = (role: string) => {
    const roleMap: { [key: string]: { icon: string; label: string; color: string } } = {
      Veterinarian: { icon: "🩺", label: "Veterinarian", color: "#2196F3" },
      Kutsero: { icon: "🐴", label: "Kutsero", color: "#FF9800" },
      "Horse Operator": { icon: "👨‍💼", label: "Horse Operator", color: "#4CAF50" },
      "Kutsero President": { icon: "👑", label: "Kutsero President", color: "#9C27B0" },
      Dvmf: { icon: "🏛️", label: "DVMF", color: "#00BCD4" },
      "Dvmf-Admin": { icon: "🏛️", label: "DVMF Admin", color: "#00838F" },
      "Ctu-Vetmed": { icon: "🎓", label: "CTU Vetmed", color: "#F44336" },
      "Ctu-Admin": { icon: "🎓", label: "CTU Admin", color: "#C62828" },
    }

    return roleMap[role] || { icon: "👤", label: role, color: "#757575" }
  }

  const navigateToUserProfile = (user: SearchUserProfile) => {
    router.push({
      pathname: "./userprofile" as any,
      params: {
        userId: user.id,
      },
    })
  }

  const renderUserItem = ({ item }: { item: SearchUserProfile }) => {
    const roleInfo = getRoleInfo(item.role)
    // Extract name without role suffix
    const displayName = item.name.replace(/\s*\$\$[^)]*\$\$\s*$/, "").trim()

    return (
      <TouchableOpacity style={styles.userItem} onPress={() => navigateToUserProfile(item)}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>

        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={styles.userName}>{displayName}</Text>
          </View>

          <View style={styles.userRoleRow}>
            <Text style={styles.roleIcon}>{roleInfo.icon}</Text>
            <View style={[styles.userTypeBadge, { backgroundColor: `${roleInfo.color}15` }]}>
              <Text style={[styles.userTypeText, { color: roleInfo.color }]}>{roleInfo.label}</Text>
            </View>
          </View>

          {item.email && (
            <Text style={styles.userEmail} numberOfLines={1}>
              {item.email}
            </Text>
          )}
        </View>

        <View style={styles.userArrow}>
          <Text style={styles.userArrowText}>›</Text>
        </View>
      </TouchableOpacity>
    )
  }

  const showNoResults = searchQuery.trim() && !isSearching && searchResults.length === 0
  const showAllUsers = !searchQuery.trim() && searchResults.length > 0
  const showSearchResults = searchQuery.trim() && searchResults.length > 0

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C17A47" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholder="Search users..."
            placeholderTextColor="#999"
            returnKeyType="search"
            onSubmitEditing={handleSearchSubmit}
            autoFocus={!initialQuery}
          />
          {isSearching ? (
            <ActivityIndicator size="small" color="#666" style={styles.searchIcon} />
          ) : searchQuery.length > 0 ? (
            <TouchableOpacity style={styles.searchIcon} onPress={clearSearch}>
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Results */}
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#C17A47" />
            <Text style={styles.loadingText}>Loading users...</Text>
          </View>
        ) : showSearchResults ? (
          <>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                {searchResults.length} {searchResults.length === 1 ? "user" : "users"} found for "{searchQuery}"
              </Text>
            </View>
            <FlatList
              data={searchResults}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </>
        ) : showAllUsers ? (
          <>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                {searchResults.length} {searchResults.length === 1 ? "user" : "users"} total
              </Text>
            </View>
            <FlatList
              data={searchResults}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </>
        ) : showNoResults ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>User not found</Text>
            <Text style={styles.emptyText}>
              No users match "{searchQuery}". Try searching with a different name or email.
            </Text>
            <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
              <Text style={styles.clearButtonText}>Show All Users</Text>
            </TouchableOpacity>
          </View>
        ) : allUsers.length === 0 && !isLoading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No users available</Text>
            <Text style={styles.emptyText}>There are no users to display at the moment</Text>
          </View>
        ) : null}
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
    paddingTop: 25,
    paddingBottom: 10,
    paddingHorizontal: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  backIcon: {
    color: "white",
    fontSize: 24,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    paddingVertical: 0,
  },
  searchIcon: {
    padding: 4,
  },
  clearSearchText: {
    fontSize: 20,
    color: "#666",
    fontWeight: "400",
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  resultsHeader: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  resultsCount: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  listContent: {
    paddingVertical: 8,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#C17A47",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: "600",
    color: "white",
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  userRoleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  roleIcon: {
    fontSize: 14,
  },
  userTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  userTypeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  userEmail: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  userArrow: {
    marginLeft: 8,
  },
  userArrowText: {
    fontSize: 28,
    color: "#C17A47",
    fontWeight: "300",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  clearButton: {
    marginTop: 20,
    backgroundColor: "#C17A47",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  clearButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
})