"use client"

import AsyncStorage from "@react-native-async-storage/async-storage"
import { useFocusEffect } from "@react-navigation/native"
import { useRouter } from "expo-router"
import React, { useEffect, useState } from "react"
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
} from "react-native"
import HelpSupport from "./help"
import TermsPolicies from "./terms"

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

interface ProfileInformationProps {
  onBack: () => void
}

// Add currentUser state and loading functionality
function ProfileInformation({ onBack }: ProfileInformationProps) {
  const [currentUser, setCurrentUser] = useState("User")

  // Load user data from AsyncStorage
  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem("currentUser")
      if (userData) {
        setCurrentUser(userData)
        // Update form data with current user info
        const nameParts = userData.split(" ")
        const firstName = nameParts[0] || "User"
        const lastName = nameParts.slice(1).join(" ") || ""

        setFormData((prev) => ({
          ...prev,
          firstName: firstName,
          lastName: lastName,
          username: userData.toLowerCase().replace(/\s+/g, ""),
          email: `${userData.toLowerCase().replace(/\s+/g, "")}@gmail.com`,
          facebook: userData,
        }))
      }
    } catch (error) {
      console.error("Error loading user data:", error)
    }
  }

  // Load user data when component mounts
  useEffect(() => {
    loadUserData()
  }, [])
  const safeArea = getSafeAreaPadding()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    // Step 1 - Location Info
    city: "",
    municipality: "",
    barangay: "",
    zipCode: "",
    houseNumber: "",
    route: "",
    to: "",
    // Step 2 - Personal Info
    firstName: "Martin",
    middleName: "Aqua",
    lastName: "Diaz",
    dateOfBirth: "1990-01-25",
    sex: "Male",
    phoneNumber: "09391233173",
    province: "Metro Manila",
    // Step 3 - Account Info
    email: "martindiaz@gmail.com",
    facebook: "Martin Diaz",
    username: "martindiaz",
    password: "••••••••••",
  })

  // Store original form data to track changes
  const [originalFormData] = useState({
    // Step 1 - Location Info
    city: "",
    municipality: "",
    barangay: "",
    zipCode: "",
    houseNumber: "",
    route: "",
    to: "",
    // Step 2 - Personal Info
    firstName: "Martin",
    middleName: "Aqua",
    lastName: "Diaz",
    dateOfBirth: "1990-01-25",
    sex: "Male",
    phoneNumber: "09391233173",
    province: "Metro Manila",
    // Step 3 - Account Info
    email: "martindiaz@gmail.com",
    facebook: "Martin Diaz",
    username: "martindiaz",
    password: "••••••••••",
  })

  // Function to check if form data has been modified
  const hasChanges = () => {
    return JSON.stringify(formData) !== JSON.stringify(originalFormData)
  }

  const BackIcon = () => (
    <View style={styles.backIconContainer}>
      <View style={styles.backArrow} />
    </View>
  )

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleEdit = () => {
    // Basic validation
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      Alert.alert("Validation Error", "First name and last name are required.")
      return
    }
    if (!formData.email.trim()) {
      Alert.alert("Validation Error", "Email is required.")
      return
    }
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      Alert.alert("Validation Error", "Please enter a valid email address.")
      return
    }
    // Phone number validation
    if (!formData.phoneNumber.trim()) {
      Alert.alert("Validation Error", "Phone number is required.")
      return
    }

    // Save the changes (in a real app, this would save to a database or API)
    Alert.alert("Save Changes", "Are you sure you want to save these changes?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Save",
        onPress: () => {
          // Here you would typically save to AsyncStorage, database, or API
          // For now, we'll just show a success message
          Alert.alert("Success", "Your profile information has been updated successfully!", [
            {
              text: "OK",
              onPress: () => {
                // Go back to the main profile screen
                onBack()
              },
            },
          ])
        },
      },
    ])
  }

  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.stepIndicatorWrapper}>
          <View style={[styles.stepIndicator, currentStep >= step && styles.activeStepIndicator]}>
            <Text style={[styles.stepIndicatorText, currentStep >= step && styles.activeStepIndicatorText]}>
              {step}
            </Text>
          </View>
          {step < 3 && <View style={[styles.stepConnector, currentStep > step && styles.activeStepConnector]} />}
        </View>
      ))}
    </View>
  )

  const renderStepOne = () => (
    <ScrollView
      style={styles.formContainer}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.formScrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.profilePhotoContainer}>
        <View style={styles.profilePhotoCircle}>
          <Image
            source={require("../../assets/images/horse.png")}
            style={[styles.profileHorseIcon, { tintColor: "#C17A47" }]}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.stepTitle}>Location Information</Text>
        <Text style={styles.stepSubtitle}>Please provide your address details</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>City</Text>
        <TextInput
          style={styles.textInput}
          value={formData.city}
          onChangeText={(text) => setFormData({ ...formData, city: text })}
          placeholder="Enter your city"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Municipality</Text>
        <TextInput
          style={styles.textInput}
          value={formData.municipality}
          onChangeText={(text) => setFormData({ ...formData, municipality: text })}
          placeholder="Enter your municipality"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Barangay</Text>
        <TextInput
          style={styles.textInput}
          value={formData.barangay}
          onChangeText={(text) => setFormData({ ...formData, barangay: text })}
          placeholder="Enter your barangay"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Zip Code</Text>
        <TextInput
          style={styles.textInput}
          value={formData.zipCode}
          onChangeText={(text) => setFormData({ ...formData, zipCode: text })}
          placeholder="Enter zip code"
          placeholderTextColor="#999"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>House Number or Street Address</Text>
        <TextInput
          style={styles.textInput}
          value={formData.houseNumber}
          onChangeText={(text) => setFormData({ ...formData, houseNumber: text })}
          placeholder="Enter house number or street address"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Route</Text>
        <TextInput
          style={styles.textInput}
          value={formData.route}
          onChangeText={(text) => setFormData({ ...formData, route: text })}
          placeholder="Enter route"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>To</Text>
        <TextInput
          style={styles.textInput}
          value={formData.to}
          onChangeText={(text) => setFormData({ ...formData, to: text })}
          placeholder="Enter destination"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.buttonContainer}>
        {hasChanges() && (
          <TouchableOpacity style={styles.saveButton} onPress={handleEdit}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )

  const renderStepTwo = () => (
    <ScrollView
      style={styles.formContainer}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.formScrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.profilePhotoContainer}>
        <View style={styles.profilePhotoCircle}>
          <Image
            source={require("../../assets/images/horse.png")}
            style={[styles.profileHorseIcon, { tintColor: "#C17A47" }]}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.stepTitle}>Personal Information</Text>
        <Text style={styles.stepSubtitle}>Please provide your personal details</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>First Name *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.firstName}
          onChangeText={(text) => setFormData({ ...formData, firstName: text })}
          placeholder="Enter first name"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Middle Name</Text>
        <TextInput
          style={styles.textInput}
          value={formData.middleName}
          onChangeText={(text) => setFormData({ ...formData, middleName: text })}
          placeholder="Enter middle name"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Last Name *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.lastName}
          onChangeText={(text) => setFormData({ ...formData, lastName: text })}
          placeholder="Enter last name"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Date of Birth</Text>
        <TextInput
          style={styles.textInput}
          value={formData.dateOfBirth}
          onChangeText={(text) => setFormData({ ...formData, dateOfBirth: text })}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Sex</Text>
        <TextInput
          style={styles.textInput}
          value={formData.sex}
          onChangeText={(text) => setFormData({ ...formData, sex: text })}
          placeholder="Male/Female"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Phone Number *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.phoneNumber}
          onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
          placeholder="Enter phone number"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>ADDRESS IN THE PHILIPPINES</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Province</Text>
        <TextInput
          style={styles.textInput}
          value={formData.province}
          onChangeText={(text) => setFormData({ ...formData, province: text })}
          placeholder="Enter province"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.previousButton} onPress={handlePrevious}>
          <Text style={styles.previousButtonText}>Previous</Text>
        </TouchableOpacity>
        {hasChanges() && (
          <TouchableOpacity style={styles.saveButton} onPress={handleEdit}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )

  const renderStepThree = () => (
    <ScrollView
      style={styles.formContainer}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.formScrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.profilePhotoContainer}>
        <View style={styles.profilePhotoCircle}>
          <Image
            source={require("../../assets/images/horse.png")}
            style={[styles.profileHorseIcon, { tintColor: "#C17A47" }]}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.stepTitle}>Account Information</Text>
        <Text style={styles.stepSubtitle}>Please provide your account details</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email *</Text>
        <TextInput
          style={styles.textInput}
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
          placeholder="Enter email address"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Facebook</Text>
        <TextInput
          style={styles.textInput}
          value={formData.facebook}
          onChangeText={(text) => setFormData({ ...formData, facebook: text })}
          placeholder="Enter Facebook name"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Username</Text>
        <TextInput
          style={styles.textInput}
          value={formData.username}
          onChangeText={(text) => setFormData({ ...formData, username: text })}
          placeholder="Enter username"
          placeholderTextColor="#999"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Password</Text>
        <TextInput
          style={styles.textInput}
          value={formData.password}
          onChangeText={(text) => setFormData({ ...formData, password: text })}
          placeholder="Enter password"
          placeholderTextColor="#999"
          secureTextEntry
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.previousButton} onPress={handlePrevious}>
          <Text style={styles.previousButtonText}>Previous</Text>
        </TouchableOpacity>
        {hasChanges() && (
          <TouchableOpacity style={styles.saveButton} onPress={handleEdit}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  )

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />
      {/* Header */}
      <View style={[styles.profileInfoHeader, { paddingTop: safeArea.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.profileInfoHeaderTitle} numberOfLines={1} adjustsFontSizeToFit>
          Profile Information
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Content */}
      <View style={styles.profileInfoContent}>
        {currentStep === 1 && renderStepOne()}
        {currentStep === 2 && renderStepTwo()}
        {currentStep === 3 && renderStepThree()}
      </View>
    </View>
  )
}

export default function ProfileScreen() {
  const router = useRouter()
  const safeArea = getSafeAreaPadding()
  const [currentUser, setCurrentUser] = useState("User")

  // Load user data from AsyncStorage
  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem("currentUser")
      if (userData) {
        setCurrentUser(userData)
      }
    } catch (error) {
      console.error("Error loading user data:", error)
    }
  }

  // Load user data when component mounts
  useEffect(() => {
    loadUserData()
  }, [])

  // Load user data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadUserData()
    }, []),
  )
  const [showHelpSupport, setShowHelpSupport] = useState(false)
  const [showProfileInfo, setShowProfileInfo] = useState(false)
  const [showTermsPolicies, setShowTermsPolicies] = useState(false)

  // Show Profile Information page when requested
  if (showProfileInfo) {
    return <ProfileInformation onBack={() => setShowProfileInfo(false)} />
  }

  // Show Help & Support page when requested
  if (showHelpSupport) {
    return <HelpSupport onBack={() => setShowHelpSupport(false)} />
  }

  // Show Terms & Policies page when requested
  if (showTermsPolicies) {
    return <TermsPolicies onBack={() => setShowTermsPolicies(false)} />
  }

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => {
          router.replace("../dashboard")
        },
      },
    ])
  }

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

  // Document Icon Component for Terms & Policies
  const DocumentIcon = ({ color }: { color: string }) => (
    <View style={styles.iconContainer}>
      <View style={styles.documentContainer}>
        <View style={[styles.documentBody, { borderColor: color }]}>
          <View style={[styles.documentLine, { backgroundColor: color }]} />
          <View style={[styles.documentLine, { backgroundColor: color }]} />
          <View style={[styles.documentLine, { backgroundColor: color }]} />
        </View>
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
          router.push("/(tabs)/history")
        } else if (tabKey === "profile") {
          // Stay on profile - already here
        }
      }}
      activeOpacity={0.7}
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />
      {/* Profile Header */}
      <View style={[styles.profileHeader, { paddingTop: safeArea.top }]}>
        <View style={styles.profileImageContainer}>
          <Image
            source={require("../../assets/images/horse.png")}
            style={styles.headerProfilePicture}
            resizeMode="cover"
          />
        </View>
        <Text style={styles.profileName} numberOfLines={1} adjustsFontSizeToFit>
          {currentUser}
        </Text>
        <Text style={styles.profileEmail} numberOfLines={1} adjustsFontSizeToFit>
          {currentUser.toLowerCase().replace(/\s+/g, "")}@gmail.com
        </Text>
      </View>

      {/* Menu Options */}
      <View style={styles.menuContainer}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.menuScrollContent, { paddingBottom: safeArea.bottom + dynamicSpacing(100) }]}
        >
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => setShowProfileInfo(true)}>
            <View style={styles.menuIconContainer}>
              <ProfileIcon color="#333" />
            </View>
            <Text style={styles.menuItemText}>Profile Information</Text>
            <View style={styles.menuArrow}>
              <View style={styles.arrowIcon} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => setShowTermsPolicies(true)}>
            <View style={styles.menuIconContainer}>
              <DocumentIcon color="#333" />
            </View>
            <Text style={styles.menuItemText}>Terms & Policies</Text>
            <View style={styles.menuArrow}>
              <View style={styles.arrowIcon} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => setShowHelpSupport(true)}>
            <View style={styles.menuIconContainer}>
              <Text style={styles.helpIcon}>?</Text>
            </View>
            <Text style={styles.menuItemText}>Help & Support</Text>
            <View style={styles.menuArrow}>
              <View style={styles.arrowIcon} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.logoutMenuItem]} onPress={handleLogout} activeOpacity={0.7}>
            <View style={styles.menuIconContainer}>
              <View style={styles.logoutIcon}>
                <View style={styles.logoutArrow} />
                <View style={styles.logoutLine} />
              </View>
            </View>
            <Text style={[styles.menuItemText, styles.logoutText]}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
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
          isActive={false}
        />
        <TabButton iconSource={null} label="Profile" tabKey="profile" isActive={true} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  profileHeader: {
    backgroundColor: "#C17A47",
    alignItems: "center",
    paddingVertical: dynamicSpacing(20),
    paddingHorizontal: scale(16),
  },
  profileImageContainer: {
    marginBottom: verticalScale(8),
  },
  headerProfilePicture: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: "white",
  },
  profileName: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "white",
    marginBottom: verticalScale(2),
    textAlign: "center",
    lineHeight: moderateScale(22),
    paddingHorizontal: scale(16),
  },
  profileEmail: {
    fontSize: moderateScale(12),
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    paddingHorizontal: scale(16),
  },
  menuContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  menuScrollContent: {
    paddingTop: dynamicSpacing(20),
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: dynamicSpacing(12),
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    minHeight: verticalScale(56),
  },
  logoutMenuItem: {
    marginTop: dynamicSpacing(20),
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  menuIconContainer: {
    width: scale(24),
    height: scale(24),
    marginRight: scale(12),
    justifyContent: "center",
    alignItems: "center",
  },
  helpIcon: {
    fontSize: moderateScale(16),
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  logoutIcon: {
    width: scale(20),
    height: scale(20),
    position: "relative",
  },
  logoutArrow: {
    width: scale(8),
    height: scale(8),
    borderLeftWidth: scale(2),
    borderTopWidth: scale(2),
    borderColor: "#FF4444",
    transform: [{ rotate: "-45deg" }],
    position: "absolute",
    left: scale(2),
    top: scale(6),
  },
  logoutLine: {
    width: scale(12),
    height: scale(2),
    backgroundColor: "#FF4444",
    position: "absolute",
    right: 0,
    top: scale(9),
  },
  menuItemText: {
    flex: 1,
    fontSize: moderateScale(16),
    color: "#333",
    fontWeight: "500",
    lineHeight: moderateScale(20),
  },
  logoutText: {
    color: "#FF4444",
  },
  menuArrow: {
    width: scale(24),
    height: scale(24),
    justifyContent: "center",
    alignItems: "center",
  },
  arrowIcon: {
    width: scale(8),
    height: scale(8),
    borderRightWidth: scale(2),
    borderTopWidth: scale(2),
    borderColor: "#999",
    transform: [{ rotate: "45deg" }],
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
    paddingHorizontal: scale(2),
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
  // Document Icon Styles for Terms & Policies
  documentContainer: {
    width: scale(16),
    height: scale(16),
    justifyContent: "center",
    alignItems: "center",
  },
  documentBody: {
    width: scale(12),
    height: scale(16),
    borderWidth: scale(1.5),
    borderRadius: scale(2),
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: scale(2),
  },
  documentLine: {
    width: scale(6),
    height: scale(1),
    marginVertical: scale(0.5),
  },
  // Profile Information Styles
  profileInfoHeader: {
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
  profileInfoHeaderTitle: {
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
  // Step Indicator Styles
  stepIndicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: dynamicSpacing(16),
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  stepIndicatorWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepIndicator: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  activeStepIndicator: {
    backgroundColor: "#C17A47",
  },
  stepIndicatorText: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#666",
  },
  activeStepIndicatorText: {
    color: "white",
  },
  stepConnector: {
    width: scale(40),
    height: scale(2),
    backgroundColor: "#E0E0E0",
    marginHorizontal: scale(8),
  },
  activeStepConnector: {
    backgroundColor: "#C17A47",
  },
  profileInfoContent: {
    flex: 1,
    backgroundColor: "white",
  },
  formContainer: {
    flex: 1,
  },
  formScrollContent: {
    paddingHorizontal: scale(20),
    paddingTop: dynamicSpacing(20),
    paddingBottom: dynamicSpacing(40),
  },
  profilePhotoContainer: {
    alignItems: "center",
    marginBottom: verticalScale(30),
  },
  profilePhotoCircle: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: verticalScale(16),
  },
  profileHorseIcon: {
    width: scale(40),
    height: scale(40),
  },
  stepTitle: {
    fontSize: moderateScale(20),
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: verticalScale(8),
  },
  stepSubtitle: {
    fontSize: moderateScale(14),
    color: "#666",
    textAlign: "center",
    lineHeight: moderateScale(18),
  },
  sectionHeader: {
    marginVertical: verticalScale(16),
  },
  sectionHeaderText: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
    letterSpacing: 1,
  },
  inputGroup: {
    marginBottom: verticalScale(16),
  },
  inputLabel: {
    fontSize: moderateScale(14),
    color: "#333",
    marginBottom: verticalScale(6),
    fontWeight: "500",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: scale(8),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(14),
    color: "#333",
    backgroundColor: "white",
    minHeight: verticalScale(48),
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: verticalScale(30),
    gap: scale(12),
    flexWrap: "wrap",
  },
  previousButton: {
    backgroundColor: "#666",
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(20),
    borderRadius: scale(8),
    alignItems: "center",
    minWidth: scale(80),
    flex: 1,
    maxWidth: scale(120),
  },
  previousButtonText: {
    color: "white",
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(20),
    borderRadius: scale(8),
    alignItems: "center",
    minWidth: scale(80),
    flex: 1,
    maxWidth: scale(120),
  },
  saveButtonText: {
    color: "white",
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  nextButton: {
    backgroundColor: "#C17A47",
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(20),
    borderRadius: scale(8),
    alignItems: "center",
    minWidth: scale(80),
    flex: 1,
    maxWidth: scale(120),
  },
  nextButtonText: {
    color: "white",
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
})
