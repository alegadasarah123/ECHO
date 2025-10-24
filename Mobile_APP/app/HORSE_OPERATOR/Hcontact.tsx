"use client"

// Hcontact.tsx - COMPLETE UPDATED VERSION
// Routes to Hmessage with contact details
// Includes DVMF users, excludes admins, no role colors or specialization

import { useState, useCallback, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native"
import { useRouter, useFocusEffect } from "expo-router"
import { FontAwesome5 } from "@expo/vector-icons"
import * as SecureStore from "expo-secure-store"
import { LinearGradient } from "expo-linear-gradient"

interface Contact {
  id: string
  name: string
  avatar: string
  role: "veterinarian" | "ctu_vet" | "kutsero" | "kutsero_president" | "horse_operator" | "dvmf"
  roleLabel: string
  email?: string
  vet_type?: "regular" | "ctu"
}

const API_BASE_URL = "http://192.168.101.2:8000/api/horse_operator"

const ContactScreen = () => {
  const router = useRouter()
  const [searchText, setSearchText] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [allContacts, setAllContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Load user_id from SecureStore
  const loadUserId = async () => {
    try {
      const storedUser = await SecureStore.getItemAsync("user_data")
      if (storedUser) {
        const parsed = JSON.parse(storedUser)
        const id = parsed.user_id || parsed.id
        if (id) {
          console.log("🔑 Contact - Loaded user_id from storage:", id)
          setUserId(id)
          return id
        }
      }
    } catch (error) {
      console.error("❌ Contact - Error loading user data:", error)
    }
    return null
  }

  // Fetch all contacts
  const fetchAllContacts = useCallback(
    async (showLoadingIndicator = true) => {
      try {
        let uid = userId
        if (!uid) {
          uid = await loadUserId()
          if (!uid) {
            console.error("❌ No user_id found, cannot fetch contacts.")
            setLoading(false)
            return
          }
        }

        if (showLoadingIndicator) {
          setLoading(true)
        } else {
          setRefreshing(true)
        }

        console.log("📡 Fetching all contacts...")

        const contacts: Contact[] = []

        // 1. Fetch ALL Veterinarians (regular + CTU) - EXCLUDE ADMINS
        try {
          const vetResponse = await fetch(`${API_BASE_URL}/get_veterinarians/`)
          if (vetResponse.ok) {
            const vetData = await vetResponse.json()
            console.log("✅ Fetched veterinarians:", vetData.length)

            const vets = Array.isArray(vetData)
              ? vetData
                  .filter((vet: any) => {
                    const vetType = vet.vet_type || ""
                    const lowerVetType = vetType.toLowerCase()
                    return lowerVetType !== "admin" || lowerVetType === "ctu-admin"
                  })
                  .map((vet: any) => {
                    const isCtuVet = vet.vet_type === "ctu" || vet.vet_type === "ctu-admin"

                    return {
                      id: vet.id,
                      name: ` ${vet.first_name} ${vet.last_name}`,
                      avatar: vet.avatar || "",
                      role: isCtuVet ? ("ctu_vet" as const) : ("veterinarian" as const),
                      roleLabel: isCtuVet ? "CTU Veterinarian" : "Veterinarian",
                      email: vet.email,
                      vet_type: vet.vet_type,
                    }
                  })
              : []

            contacts.push(...vets)
            console.log(`✅ Processed ${vets.length} veterinarians (admins included)`)
          } else {
            console.error("❌ Failed to fetch veterinarians:", vetResponse.status)
          }
        } catch (error) {
          console.error("❌ Error fetching veterinarians:", error)
        }

        // 2. Fetch Kutseros
        try {
          const kutseroResponse = await fetch(`${API_BASE_URL}/get_all_kutseros/`)
          if (kutseroResponse.ok) {
            const kutseroData = await kutseroResponse.json()
            console.log("✅ Fetched approved kutseros:", kutseroData.length)

            const kutseros = Array.isArray(kutseroData)
              ? kutseroData.map((kutsero: any) => {
                  const fname = kutsero.kutsero_fname || ""
                  const mname = kutsero.kutsero_mname || ""
                  const lname = kutsero.kutsero_lname || ""
                  const fullName = `${fname} ${mname ? mname + " " : ""}${lname}`.trim()

                  return {
                    id: kutsero.kutsero_id,
                    name: fullName || "Kutsero",
                    avatar: kutsero.kutsero_image || "",
                    role: "kutsero" as const,
                    roleLabel: "Kutsero",
                    email: kutsero.kutsero_email,
                  }
                })
              : []

            contacts.push(...kutseros)
          } else {
            console.error("❌ Failed to fetch kutseros:", kutseroResponse.status)
          }
        } catch (error) {
          console.error("❌ Error fetching kutseros:", error)
        }

        // 2.5. Fetch Kutsero Presidents (from separate endpoint)
        try {
          const kutseroPresResponse = await fetch(`${API_BASE_URL}/get_all_kut_pres/`)
          if (kutseroPresResponse.ok) {
            const kutseroPresData = await kutseroPresResponse.json()
            console.log("✅ Fetched approved kutsero presidents:", kutseroPresData.length)

            const kutseroPresidents = Array.isArray(kutseroPresData)
              ? kutseroPresData.map((pres: any) => {
                  const fname = pres.pres_fname || ""
                  const lname = pres.pres_lname || ""
                  const fullName = `${fname} ${lname}`.trim()

                  return {
                    id: pres.user_id,
                    name: fullName || "Kutsero President",
                    avatar: pres.pres_image || "",
                    role: "kutsero_president" as const,
                    roleLabel: "Kutsero President",
                    email: pres.pres_email,
                  }
                })
              : []

            contacts.push(...kutseroPresidents)
          } else {
            console.error("❌ Failed to fetch kutsero presidents:", kutseroPresResponse.status)
          }
        } catch (error) {
          console.error("❌ Error fetching kutsero presidents:", error)
        }

        // 3. Fetch Horse Operators (excluding current user)
        try {
          const opResponse = await fetch(`${API_BASE_URL}/get_all_operators/`)
          if (opResponse.ok) {
            const opData = await opResponse.json()
            console.log("✅ Fetched approved operators:", opData.length)

            const operators = Array.isArray(opData)
              ? opData
                  .filter((op: any) => op.op_id !== uid)
                  .map((op: any) => {
                    const fname = op.op_fname || ""
                    const mname = op.op_mname || ""
                    const lname = op.op_lname || ""
                    const fullName = `${fname} ${mname ? mname + " " : ""}${lname}`.trim()

                    return {
                      id: op.op_id,
                      name: fullName || "Horse Operator",
                      avatar: op.op_image || "",
                      role: "horse_operator" as const,
                      roleLabel: "Horse Operator",
                      email: op.op_email,
                    }
                  })
              : []

            contacts.push(...operators)
          } else {
            console.error("❌ Failed to fetch operators:", opResponse.status)
          }
        } catch (error) {
          console.error("❌ Error fetching operators:", error)
        }

        // 4. Fetch DVMF Users (including both regular and admins)
        try {
          const dvmfResponse = await fetch(`${API_BASE_URL}/get_all_dvmf/`)
          if (dvmfResponse.ok) {
            const dvmfData = await dvmfResponse.json()
            console.log("✅ Fetched DVMF users:", dvmfData.length)

            const dvmfUsers = Array.isArray(dvmfData)
              ? dvmfData.map((dvmf: any) => {
                  const fname = dvmf.dvmf_fname || ""
                  const lname = dvmf.dvmf_lname || ""
                  const fullName = `${fname} ${lname}`.trim()

                  return {
                    id: dvmf.dvmf_id,
                    name: fullName || "DVMF User",
                    avatar: dvmf.dvmf_image || "",
                    role: "dvmf" as const,
                    roleLabel: "DVMF",
                    email: dvmf.dvmf_email,
                  }
                })
              : []

            contacts.push(...dvmfUsers)
            console.log(`✅ Processed ${dvmfUsers.length} DVMF users`)
          } else {
            console.error("❌ Failed to fetch DVMF users:", dvmfResponse.status)
          }
        } catch (error) {
          console.error("❌ Error fetching DVMF users:", error)
        }

        contacts.sort((a, b) => a.name.localeCompare(b.name))
        setAllContacts(contacts)
        console.log("✅ Total contacts loaded:", contacts.length)
      } catch (error: any) {
        console.error("❌ Error loading contacts:", error)
        Alert.alert("Error", error.message || "Unable to load contacts")
        setAllContacts([])
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [userId],
  )

  useEffect(() => {
    loadUserId()
  }, [])

  useFocusEffect(
    useCallback(() => {
      console.log("🎯 Contact screen focused - refreshing contacts...")
      fetchAllContacts(true)
    }, [fetchAllContacts]),
  )

  const handleBack = () => {
    router.back()
  }

  const handleRefresh = () => {
    fetchAllContacts(false)
  }

  // Navigate to Hmessage with contact details
  const handleContactPress = async (contact: Contact) => {
    try {
      if (!userId) {
        router.replace("/auth/login")
        return
      }

      console.log("📱 Opening chat with:", contact.name)

      // Navigate to Hmessage with contact details as params
      router.push({
        pathname: "/HORSE_OPERATOR/Hmessage",
        params: {
          openChat: "true",
          contactId: contact.id,
          contactName: contact.name,
          contactAvatar: contact.avatar,
          contactRole: contact.role,
          userId: userId,
        },
      })
    } catch (error) {
      console.error("Error opening chat:", error)
      Alert.alert("Error", "Failed to open chat.")
    }
  }

  // Filter contacts
  const filteredContacts = allContacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchText.toLowerCase()) ||
      contact.roleLabel.toLowerCase().includes(searchText.toLowerCase())

    if (activeTab === "all") {
      return matchesSearch
    }

    if (activeTab === "veterinarian") {
      return matchesSearch && (contact.role === "veterinarian" || contact.role === "ctu_vet")
    }

    return matchesSearch && contact.role === activeTab
  })

  // Group contacts by role
  const groupedContacts = {
    veterinarian: filteredContacts.filter((c) => c.role === "veterinarian"),
    ctu_vet: filteredContacts.filter((c) => c.role === "ctu_vet"),
    kutsero: filteredContacts.filter((c) => c.role === "kutsero"),
    kutsero_president: filteredContacts.filter((c) => c.role === "kutsero_president"),
    horse_operator: filteredContacts.filter((c) => c.role === "horse_operator"),
    dvmf: filteredContacts.filter((c) => c.role === "dvmf"),
  }

  const getInitials = (name: string) => {
    const cleanName = name.replace(/^Dr\.\s*/i, "").trim()
    const parts = cleanName.split(" ")

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return cleanName.substring(0, 2).toUpperCase()
  }

  const getAvatarBackgroundColor = (role: string) => {
    switch (role) {
      case "veterinarian":
      case "ctu_vet":
        return "#10B981"
      case "kutsero":
        return "#8B4513"
      case "kutsero_president":
        return "#654321"
      case "horse_operator":
        return "#CD853F"
      case "dvmf":
        return "#C2185B"
      default:
        return "#999"
    }
  }

  const renderContactItem = (contact: Contact) => (
    <TouchableOpacity
      key={contact.id}
      style={styles.contactItem}
      onPress={() => handleContactPress(contact)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {contact.avatar ? (
          <Image
            source={{ uri: contact.avatar }}
            style={styles.avatar}
            onError={() => {
              contact.avatar = ""
            }}
          />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.avatarPlaceholder,
              { backgroundColor: getAvatarBackgroundColor(contact.role) },
            ]}
          >
            <Text style={styles.avatarInitials}>{getInitials(contact.name)}</Text>
          </View>
        )}
      </View>

      <View style={styles.contactInfo}>
        <Text style={styles.contactName} numberOfLines={1}>
          {contact.name}
        </Text>
      </View>

      <TouchableOpacity style={styles.messageButton} onPress={() => handleContactPress(contact)}>
        <FontAwesome5 name="comment-dots" size={18} color="#CD853F" />
      </TouchableOpacity>
    </TouchableOpacity>
  )

  const totalVetCount = allContacts.filter((c) => c.role === "veterinarian" || c.role === "ctu_vet").length

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={["#CD853F", "#B8752E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <FontAwesome5 name="arrow-left" size={20} color="#fff" />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Contacts</Text>
              <Text style={styles.headerSubtitle}>{filteredContacts.length} available</Text>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <FontAwesome5 name="search" size={14} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts..."
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText("")} style={styles.clearButton}>
                <FontAwesome5 name="times-circle" size={14} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>

        {/* Tab Filter */}
        <View style={styles.contentWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabContainer}
            contentContainerStyle={styles.tabContentContainer}
          >
            <TouchableOpacity
              style={[styles.tabButton, activeTab === "all" && styles.tabButtonActive]}
              onPress={() => setActiveTab("all")}
            >
              <Text style={[styles.tabButtonText, activeTab === "all" && styles.tabButtonTextActive]}>All</Text>
              <View style={[styles.badge, activeTab === "all" && styles.badgeActive]}>
                <Text style={[styles.badgeText, activeTab === "all" && styles.badgeTextActive]}>
                  {allContacts.length}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === "veterinarian" && styles.tabButtonActive]}
              onPress={() => setActiveTab("veterinarian")}
            >
              <FontAwesome5 name="user-md" size={12} color={activeTab === "veterinarian" ? "#fff" : "#10B981"} />
              <Text style={[styles.tabButtonText, activeTab === "veterinarian" && styles.tabButtonTextActive]}>
                Vets
              </Text>
              <View style={[styles.badge, activeTab === "veterinarian" && styles.badgeActive]}>
                <Text style={[styles.badgeText, activeTab === "veterinarian" && styles.badgeTextActive]}>
                  {totalVetCount}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === "kutsero" && styles.tabButtonActive]}
              onPress={() => setActiveTab("kutsero")}
            >
              <FontAwesome5 name="horse" size={12} color={activeTab === "kutsero" ? "#fff" : "#8B4513"} />
              <Text style={[styles.tabButtonText, activeTab === "kutsero" && styles.tabButtonTextActive]}>
                Kutseros
              </Text>
              <View style={[styles.badge, activeTab === "kutsero" && styles.badgeActive]}>
                <Text style={[styles.badgeText, activeTab === "kutsero" && styles.badgeTextActive]}>
                  {allContacts.filter((c) => c.role === "kutsero").length}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === "kutsero_president" && styles.tabButtonActive]}
              onPress={() => setActiveTab("kutsero_president")}
            >
              <FontAwesome5 name="crown" size={12} color={activeTab === "kutsero_president" ? "#fff" : "#654321"} />
              <Text style={[styles.tabButtonText, activeTab === "kutsero_president" && styles.tabButtonTextActive]}>
                Pres.
              </Text>
              <View style={[styles.badge, activeTab === "kutsero_president" && styles.badgeActive]}>
                <Text style={[styles.badgeText, activeTab === "kutsero_president" && styles.badgeTextActive]}>
                  {allContacts.filter((c) => c.role === "kutsero_president").length}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === "horse_operator" && styles.tabButtonActive]}
              onPress={() => setActiveTab("horse_operator")}
            >
              <FontAwesome5 name="user-tie" size={12} color={activeTab === "horse_operator" ? "#fff" : "#CD853F"} />
              <Text style={[styles.tabButtonText, activeTab === "horse_operator" && styles.tabButtonTextActive]}>
                Operators
              </Text>
              <View style={[styles.badge, activeTab === "horse_operator" && styles.badgeActive]}>
                <Text style={[styles.badgeText, activeTab === "horse_operator" && styles.badgeTextActive]}>
                  {allContacts.filter((c) => c.role === "horse_operator").length}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === "dvmf" && styles.tabButtonActive]}
              onPress={() => setActiveTab("dvmf")}
            >
              <FontAwesome5 name="shield-alt" size={12} color={activeTab === "dvmf" ? "#fff" : "#C2185B"} />
              <Text style={[styles.tabButtonText, activeTab === "dvmf" && styles.tabButtonTextActive]}>DVMF</Text>
              <View style={[styles.badge, activeTab === "dvmf" && styles.badgeActive]}>
                <Text style={[styles.badgeText, activeTab === "dvmf" && styles.badgeTextActive]}>
                  {allContacts.filter((c) => c.role === "dvmf").length}
                </Text>
              </View>
            </TouchableOpacity>
          </ScrollView>

          <ScrollView
            style={styles.contactsList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contactsListContent}
          >
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#CD853F" />
                <Text style={styles.loadingText}>Loading contacts...</Text>
              </View>
            )}

            {!loading && filteredContacts.length === 0 && (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <FontAwesome5 name="address-book" size={50} color="#CD853F" />
                </View>
                <Text style={styles.emptyTitle}>No Contacts Found</Text>
                <Text style={styles.emptyText}>
                  {searchText ? "No contacts match your search" : "No contacts available at the moment"}
                </Text>
              </View>
            )}

            {!loading &&
              filteredContacts.length > 0 &&
              (activeTab === "all" ? (
                <>
                  {groupedContacts.veterinarian.length > 0 && (
                    <View style={styles.sectionContainer}>
                      <View style={styles.sectionHeader}>
                        <FontAwesome5 name="user-md" size={16} color="#10B981" />
                        <Text style={styles.sectionTitle}>Veterinarians</Text>
                        <View style={styles.sectionBadge}>
                          <Text style={styles.sectionBadgeText}>{groupedContacts.veterinarian.length}</Text>
                        </View>
                      </View>
                      <View style={styles.sectionContent}>{groupedContacts.veterinarian.map(renderContactItem)}</View>
                    </View>
                  )}

                  {groupedContacts.ctu_vet.length > 0 && (
                    <View style={styles.sectionContainer}>
                      <View style={styles.sectionHeader}>
                        <FontAwesome5 name="user-md" size={16} color="#10B981" />
                        <Text style={styles.sectionTitle}>CTU Veterinarians</Text>
                        <View style={styles.sectionBadge}>
                          <Text style={styles.sectionBadgeText}>{groupedContacts.ctu_vet.length}</Text>
                        </View>
                      </View>
                      <View style={styles.sectionContent}>{groupedContacts.ctu_vet.map(renderContactItem)}</View>
                    </View>
                  )}

                  {groupedContacts.kutsero.length > 0 && (
                    <View style={styles.sectionContainer}>
                      <View style={styles.sectionHeader}>
                        <FontAwesome5 name="horse" size={16} color="#8B4513" />
                        <Text style={styles.sectionTitle}>Kutseros</Text>
                        <View style={styles.sectionBadge}>
                          <Text style={styles.sectionBadgeText}>{groupedContacts.kutsero.length}</Text>
                        </View>
                      </View>
                      <View style={styles.sectionContent}>{groupedContacts.kutsero.map(renderContactItem)}</View>
                    </View>
                  )}

                  {groupedContacts.kutsero_president.length > 0 && (
                    <View style={styles.sectionContainer}>
                      <View style={styles.sectionHeader}>
                        <FontAwesome5 name="crown" size={16} color="#654321" />
                        <Text style={styles.sectionTitle}>Kutsero Presidents</Text>
                        <View style={styles.sectionBadge}>
                          <Text style={styles.sectionBadgeText}>{groupedContacts.kutsero_president.length}</Text>
                        </View>
                      </View>
                      <View style={styles.sectionContent}>
                        {groupedContacts.kutsero_president.map(renderContactItem)}
                      </View>
                    </View>
                  )}

                  {groupedContacts.horse_operator.length > 0 && (
                    <View style={styles.sectionContainer}>
                      <View style={styles.sectionHeader}>
                        <FontAwesome5 name="user-tie" size={16} color="#CD853F" />
                        <Text style={styles.sectionTitle}>Horse Operators</Text>
                        <View style={styles.sectionBadge}>
                          <Text style={styles.sectionBadgeText}>{groupedContacts.horse_operator.length}</Text>
                        </View>
                      </View>
                      <View style={styles.sectionContent}>{groupedContacts.horse_operator.map(renderContactItem)}</View>
                    </View>
                  )}

                  {groupedContacts.dvmf.length > 0 && (
                    <View style={styles.sectionContainer}>
                      <View style={styles.sectionHeader}>
                        <FontAwesome5 name="shield-alt" size={16} color="#C2185B" />
                        <Text style={styles.sectionTitle}>DVMF</Text>
                        <View style={styles.sectionBadge}>
                          <Text style={styles.sectionBadgeText}>{groupedContacts.dvmf.length}</Text>
                        </View>
                      </View>
                      <View style={styles.sectionContent}>{groupedContacts.dvmf.map(renderContactItem)}</View>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.sectionContent}>{filteredContacts.map(renderContactItem)}</View>
              ))}

            <View style={styles.bottomSpacer} />
          </ScrollView>

          {/* Floating Refresh Button */}
          <TouchableOpacity
            style={styles.floatingButton}
            onPress={handleRefresh}
            disabled={loading || refreshing}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#CD853F", "#B8752E"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.floatingButtonGradient}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <FontAwesome5 name="sync-alt" size={16} color="#fff" />
              )}
              <Text style={styles.floatingButtonText}>{refreshing ? "Refreshing..." : "Refresh"}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#CD853F",
  },
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  clearButton: {
    padding: 5,
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  tabContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
    maxHeight: 52,
  },
  tabContentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: "center",
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
    gap: 5,
    height: 32,
  },
  tabButtonActive: {
    backgroundColor: "#CD853F",
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  tabButtonTextActive: {
    color: "#fff",
  },
  badge: {
    backgroundColor: "#E0E0E0",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeActive: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#666",
  },
  badgeTextActive: {
    color: "#fff",
  },
  sectionContainer: {
    marginTop: 20,
    marginHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2C3E50",
    flex: 1,
  },
  sectionBadge: {
    backgroundColor: "#E8E8E8",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#666",
  },
  sectionContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  contactsList: {
    flex: 1,
  },
  contactsListContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: "#7F8C8D",
    textAlign: "center",
    lineHeight: 22,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    backgroundColor: "#fff",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E8E8E8",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: 1,
  },
  contactInfo: {
    flex: 1,
    justifyContent: "center",
  },
  contactName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 6,
  },
  roleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  contactSpecialization: {
    fontSize: 13,
    color: "#7F8C8D",
    fontStyle: "italic",
    marginTop: 2,
  },
  messageButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF5E6",
    borderRadius: 24,
    marginLeft: 12,
  },
  bottomSpacer: {
    height: 20,
  },
  floatingButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    gap: 10,
  },
  floatingButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
})

export default ContactScreen
