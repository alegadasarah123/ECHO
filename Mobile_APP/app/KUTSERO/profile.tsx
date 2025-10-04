"use client"
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
  ActivityIndicator,
} from "react-native"
import * as SecureStore from "expo-secure-store"

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

// Backend API configuration
const API_BASE_URL = "http://192.168.1.8:8000/api/kutsero"

// Updated User data interface - Fixed to include kutsero_id at root level
interface UserData {
  id: string
  email: string
  kutsero_id?: string // Added this property
  profile?: {
    kutsero_id?: string // Changed from string to string | undefined to match the root level
    kutsero_fname?: string
    kutsero_lname?: string
    kutsero_mname?: string
    kutsero_username?: string
    kutsero_phone_num?: string
    kutsero_email?: string
    kutsero_city?: string
    kutsero_municipality?: string
    kutsero_brgy?: string
    kutsero_zipcode?: string
    kutsero_province?: string
    kutsero_dob?: string
    kutsero_sex?: string
    kutsero_fb?: string
    [key: string]: any
  }
  access_token: string
  refresh_token?: string
  user_status?: string
}

interface ProfileInformationProps {
  onBack: () => void
}

interface HelpSupportProps {
  onBack: () => void
}

interface TermsPoliciesProps {
  onBack: () => void
}

// Help & Support Component
function HelpSupport({ onBack }: HelpSupportProps) {
  const safeArea = getSafeAreaPadding()

  const BackIcon = () => (
    <View style={styles.backIconContainer}>
      <View style={styles.backArrow} />
    </View>
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
          Help & Support
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      <ScrollView style={styles.helpContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.helpSection}>
          <Text style={styles.helpSectionTitle}>Frequently Asked Questions</Text>

          <View style={styles.helpItem}>
            <Text style={styles.helpQuestion}>How do I register my horse?</Text>
            <Text style={styles.helpAnswer}>
              To register your horse, go to the Horse Care section and tap "Add Horse". Fill in all the required
              information including your horse's name, age, breed, and health details.
            </Text>
          </View>

          <View style={styles.helpItem}>
            <Text style={styles.helpQuestion}>How do I update my profile information?</Text>
            <Text style={styles.helpAnswer}>
              Go to Profile &gt; Profile Information. You can edit your personal details, location, and account
              information across three easy steps. Don't forget to save your changes.
            </Text>
          </View>

          <View style={styles.helpItem}>
            <Text style={styles.helpQuestion}>How do I schedule a veterinary appointment?</Text>
            <Text style={styles.helpAnswer}>
              Use the Calendar section to view available appointments and schedule visits with veterinarians in your
              area.
            </Text>
          </View>

          <View style={styles.helpItem}>
            <Text style={styles.helpQuestion}>How do I contact support?</Text>
            <Text style={styles.helpAnswer}>
              You can reach our support team through the contact information below or use the chat feature for immediate
              assistance.
            </Text>
          </View>
        </View>

        <View style={styles.helpSection}>
          <Text style={styles.helpSectionTitle}>Contact Information</Text>

          <View style={styles.contactItem}>
            <Text style={styles.contactLabel}>Email:</Text>
            <Text style={styles.contactValue}>support@kutsero.app</Text>
          </View>

          <View style={styles.contactItem}>
            <Text style={styles.contactLabel}>Phone:</Text>
            <Text style={styles.contactValue}>+63 912 345 6789</Text>
          </View>

          <View style={styles.contactItem}>
            <Text style={styles.contactLabel}>Office Hours:</Text>
            <Text style={styles.contactValue}>Monday - Friday, 8:00 AM - 5:00 PM</Text>
          </View>
        </View>

        <View style={styles.helpSection}>
          <Text style={styles.helpSectionTitle}>App Version</Text>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  )
}

// Terms & Policies Component
function TermsPolicies({ onBack }: TermsPoliciesProps) {
  const safeArea = getSafeAreaPadding()

  const BackIcon = () => (
    <View style={styles.backIconContainer}>
      <View style={styles.backArrow} />
    </View>
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
          Terms & Policies
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      <ScrollView style={styles.termsContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.termsSection}>
          <Text style={styles.termsSectionTitle}>Terms of Service</Text>
          <Text style={styles.termsText}>
            Welcome to Kutsero App. By using our application, you agree to comply with and be bound by the following
            terms and conditions of use.
          </Text>
          <Text style={styles.termsText}>
            1. The content of the pages of this app is for your general information and use only. It is subject to
            change without notice.
          </Text>
          <Text style={styles.termsText}>
            2. Your use of any information or materials on this app is entirely at your own risk, for which we shall not
            be liable.
          </Text>
          <Text style={styles.termsText}>
            3. This app contains material which is owned by or licensed to us. This material includes, but is not
            limited to, the design, layout, look, appearance and graphics.
          </Text>
        </View>

        <View style={styles.termsSection}>
          <Text style={styles.termsSectionTitle}>Privacy Policy</Text>
          <Text style={styles.termsText}>
            Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your
            information when you use the Kutsero App.
          </Text>
          <Text style={styles.termsText}>
            Information We Collect: - Personal information (name, email, phone number) - Location data for service
            delivery - Horse care and health information - Usage data and app interactions
          </Text>
          <Text style={styles.termsText}>
            How We Use Your Information: - To provide and maintain our service - To notify you about changes to our
            service - To provide customer support - To gather analysis or valuable information to improve our service
          </Text>
        </View>

        <View style={styles.termsSection}>
          <Text style={styles.termsSectionTitle}>Data Protection</Text>
          <Text style={styles.termsText}>
            We implement appropriate security measures to protect your personal information against unauthorized access,
            alteration, disclosure, or destruction.
          </Text>
          <Text style={styles.termsText}>
            Your data is stored securely and is only accessed by authorized personnel who need it to provide you with
            our services.
          </Text>
        </View>

        <View style={styles.termsSection}>
          <Text style={styles.termsSectionTitle}>Contact Us</Text>
          <Text style={styles.termsText}>
            If you have any questions about these Terms & Policies, please contact us at:
          </Text>
          <Text style={styles.termsText}>Email: legal@kutsero.app Phone: +63 912 345 6789</Text>
        </View>
      </ScrollView>
    </View>
  )
}

// Profile Information Component with fixed rendering issues
function ProfileInformation({ onBack }: ProfileInformationProps) {
  const [currentUser, setCurrentUser] = useState("User")
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

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
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    sex: "",
    phoneNumber: "",
    province: "",
    // Step 3 - Account Info
    email: "",
    facebook: "",
    username: "",
  })

  const [showChangePassword, setShowChangePassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  // Store original form data to track changes
  const [originalFormData, setOriginalFormData] = useState({
    // Step 1 - Location Info
    city: "",
    municipality: "",
    barangay: "",
    zipCode: "",
    houseNumber: "",
    route: "",
    to: "",
    // Step 2 - Personal Info
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    sex: "",
    phoneNumber: "",
    province: "",
    // Step 3 - Account Info
    email: "",
    facebook: "",
    username: "",
  })

  // Load user data and profile from backend
  const loadUserData = async () => {
    try {
      setIsLoading(true)

      // Get the stored authentication data from SecureStore
      const storedUserData = await SecureStore.getItemAsync("user_data")
      const storedAccessToken = await SecureStore.getItemAsync("access_token")

      console.log("Stored user data raw:", storedUserData) // Debug log

      if (!storedUserData || !storedAccessToken) {
        Alert.alert("Error", "No user data found. Please log in again.")
        return
      }

      const parsedUserData = JSON.parse(storedUserData)
      console.log("Parsed user data:", parsedUserData) // Debug log

      // Set userData immediately so it's available for fallback
      setUserData(parsedUserData)

      // Set display name
      let displayName = "User"
      if (parsedUserData.profile) {
        const { kutsero_fname, kutsero_lname, kutsero_username } = parsedUserData.profile
        if (kutsero_fname && kutsero_lname) {
          displayName = `${kutsero_fname} ${kutsero_lname}`
        } else if (kutsero_username) {
          displayName = kutsero_username
        } else if (kutsero_fname) {
          displayName = kutsero_fname
        }
      }
      setCurrentUser(displayName)

      // Try to get kutsero_id from multiple sources
      let kutserroId: string | null = null
      if (parsedUserData.profile?.kutsero_id) {
        kutserroId = parsedUserData.profile.kutsero_id
      } else if (parsedUserData.kutsero_id) {
        kutserroId = parsedUserData.kutsero_id
      } else if (parsedUserData.id) {
        kutserroId = parsedUserData.id
      }

      console.log("Extracted kutsero_id:", kutserroId) // Debug log

      if (kutserroId) {
        // Try to fetch detailed profile from backend
        try {
          const response = await fetch(`${API_BASE_URL}/profile/${kutserroId}/`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          })

          if (response.ok) {
            const result = await response.json()
            console.log("Backend API response:", result) // Debug log

            if (result.success && result.data) {
              // Map backend data to form data
              const profileData = result.data
              console.log("Profile data from backend:", profileData) // Debug log

              const newFormData = {
                // Step 1 - Location Info (mapped from kutsero_profile backend response)
                city: profileData.city || "",
                municipality: profileData.municipality || "",
                barangay: profileData.barangay || "",
                zipCode: profileData.zipCode || "",
                houseNumber: profileData.houseNumber || profileData.house_number || profileData.houseNo || "",
                route: profileData.route || profileData.street || profileData.road || profileData.address_line_1 || "",
                to: profileData.to || "",
                // Step 2 - Personal Info (mapped from kutsero_profile backend response)
                firstName: profileData.firstName || "",
                middleName: profileData.middleName || "",
                lastName: profileData.lastName || "",
                dateOfBirth: profileData.dateOfBirth || "",
                sex: profileData.sex || "",
                phoneNumber: profileData.phoneNumber || "",
                province: profileData.province || "",
                // Step 3 - Account Info (mapped from kutsero_profile backend response)
                email: profileData.email || "",
                facebook: profileData.facebook || "",
                username: profileData.username || "",
              }

              console.log("Mapped form data from API:", newFormData) // Debug log
              setFormData(newFormData)
              setOriginalFormData(newFormData)

              console.log("Profile data loaded successfully from kutsero_profile table")
              return // Exit early since we have API data
            }
          }

          // If we get here, the API call failed or returned no data
          try {
            const errorData = await response.json()
            console.log("Failed to fetch kutsero_profile:", errorData.message || "Unknown error")
          } catch (e) {
            console.log("Failed to fetch kutsero_profile: Unable to parse error response")
          }
        } catch (fetchError) {
          console.error("Error fetching kutsero_profile:", fetchError)
        }
      }

      // If we get here, either no kutsero_id or API call failed
      // Use stored profile data directly
      console.log("Using stored profile data directly")
      console.log("parsedUserData.profile:", parsedUserData.profile)

      if (parsedUserData.profile) {
        const profile = parsedUserData.profile
        const basicFormData = {
          // Step 1 - Location Info (using data from stored profile)
          city: profile.kutsero_city || "",
          municipality: profile.kutsero_municipality || "",
          barangay: profile.kutsero_brgy || "",
          zipCode: profile.kutsero_zipcode || "",
          houseNumber: "",
          route: "",
          to: "",
          // Step 2 - Personal Info (using stored profile data)
          firstName: profile.kutsero_fname || "",
          middleName: profile.kutsero_mname || "",
          lastName: profile.kutsero_lname || "",
          dateOfBirth: profile.kutsero_dob || "",
          sex: profile.kutsero_sex || "",
          phoneNumber: profile.kutsero_phone_num || "",
          province: profile.kutsero_province || "",
          // Step 3 - Account Info
          email: profile.kutsero_email || "",
          facebook: profile.kutsero_fb || "",
          username: profile.kutsero_username || "",
        }

        console.log("Basic form data from stored profile:", basicFormData) // Debug log
        setFormData(basicFormData)
        setOriginalFormData(basicFormData)
      } else {
        console.log("No stored profile data available")
        // Set empty form
        const emptyFormData = {
          city: "",
          municipality: "",
          barangay: "",
          zipCode: "",
          houseNumber: "",
          route: "",
          to: "",
          firstName: "",
          middleName: "",
          lastName: "",
          dateOfBirth: "",
          sex: "",
          phoneNumber: "",
          province: "",
          email: "",
          facebook: "",
          username: "",
        }
        setFormData(emptyFormData)
        setOriginalFormData(emptyFormData)
      }
    } catch (error) {
      console.error("Error loading user data:", error)
      Alert.alert("Error", "Failed to load user data.")
    } finally {
      setIsLoading(false)
    }
  }

  // Load user data when component mounts
  useEffect(() => {
    loadUserData()
  }, [])

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

  const handleEdit = async () => {
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

    // Save the changes
    Alert.alert("Save Changes", "Are you sure you want to save these changes?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Save",
        onPress: () => saveProfileChanges(),
      },
    ])
  }

  const saveProfileChanges = async () => {
    try {
      setIsSaving(true)

      // Add null check for userData - Fixed
      if (!userData) {
        Alert.alert("Error", "Unable to save: No user data found.")
        return
      }

      // Get kutsero_id with proper type safety - Fixed
      let kutserroId: string | null = null
      if (userData.profile?.kutsero_id) {
        kutserroId = userData.profile.kutsero_id
      } else if (userData.kutsero_id) {
        kutserroId = userData.kutsero_id
      } else if (userData.id) {
        kutserroId = userData.id
      }

      if (!kutserroId) {
        Alert.alert("Error", "Unable to save: No kutsero ID found.")
        return
      }

      console.log("Saving kutsero_profile for kutsero_id:", kutserroId)
      console.log("Form data to save:", formData)

      // Save to kutsero_profile table
      const response = await fetch(`${API_BASE_URL}/profile/${kutserroId}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      console.log("Save response status:", response.status)
      const result = await response.json()
      console.log("Save response data:", result)

      if (response.ok && result.success) {
        // Update the original form data to new values
        setOriginalFormData({ ...formData })

        // Update stored user data with new profile information - Fixed null check
        if (userData) {
          const updatedUserData = {
            ...userData,
            profile: {
              ...userData.profile,
              kutsero_fname: formData.firstName,
              kutsero_lname: formData.lastName,
              kutsero_mname: formData.middleName,
              kutsero_email: formData.email,
              kutsero_phone_num: formData.phoneNumber,
              kutsero_username: formData.username,
              kutsero_city: formData.city,
              kutsero_municipality: formData.municipality,
              kutsero_brgy: formData.barangay,
              kutsero_zipcode: formData.zipCode,
              kutsero_province: formData.province,
              kutsero_dob: formData.dateOfBirth,
              kutsero_sex: formData.sex,
              kutsero_fb: formData.facebook,
            },
          }

          await SecureStore.setItemAsync("user_data", JSON.stringify(updatedUserData))
          setUserData(updatedUserData)

          // Update display name
          const displayName =
            formData.firstName && formData.lastName
              ? `${formData.firstName} ${formData.lastName}`
              : formData.firstName || formData.username || "User"
          setCurrentUser(displayName)

          console.log("Updated user data in SecureStore")
        }

        Alert.alert("Success", result.message || "Your profile information has been updated successfully!", [
          {
            text: "OK",
            onPress: () => {
              // Go back to the main profile screen
              onBack()
            },
          },
        ])
      } else {
        Alert.alert("Error", result.message || "Failed to update profile. Please try again.")
      }
    } catch (error) {
      console.error("Error saving kutsero_profile:", error)
      Alert.alert("Error", "An error occurred while saving your profile. Please try again.")
    } finally {
      setIsSaving(false)
    }
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

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>City</Text>
        <TextInput
          style={styles.textInput}
          value={formData.city}
          onChangeText={(text) => setFormData({ ...formData, city: text })}
          placeholder="Enter city"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Municipality</Text>
        <TextInput
          style={styles.textInput}
          value={formData.municipality}
          onChangeText={(text) => setFormData({ ...formData, municipality: text })}
          placeholder="Enter municipality"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Barangay</Text>
        <TextInput
          style={styles.textInput}
          value={formData.barangay}
          onChangeText={(text) => setFormData({ ...formData, barangay: text })}
          placeholder="Enter barangay"
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
        <Text style={styles.inputLabel}>House Number</Text>
        <TextInput
          style={styles.textInput}
          value={formData.houseNumber}
          onChangeText={(text) => setFormData({ ...formData, houseNumber: text })}
          placeholder="Enter house number"
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
        <TouchableOpacity style={styles.previousButton} onPress={handlePrevious}>
          <Text style={styles.previousButtonText}>Previous</Text>
        </TouchableOpacity>
        {hasChanges() && (
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.disabledButton]}
            onPress={handleEdit}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )

  // After your renderStepOne function ends, add this:

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
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.disabledButton]}
            onPress={handleEdit}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
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
        <TouchableOpacity style={styles.changePasswordButton} onPress={() => setShowChangePassword(true)}>
          <Text style={styles.changePasswordText}>Change Password</Text>
        </TouchableOpacity>
      </View>

      {showChangePassword && (
        <View style={styles.passwordChangeContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Current Password *</Text>
            <TextInput
              style={styles.textInput}
              value={passwordData.currentPassword}
              onChangeText={(text) => setPasswordData({ ...passwordData, currentPassword: text })}
              placeholder="Enter current password"
              placeholderTextColor="#999"
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>New Password *</Text>
            <TextInput
              style={styles.textInput}
              value={passwordData.newPassword}
              onChangeText={(text) => setPasswordData({ ...passwordData, newPassword: text })}
              placeholder="Enter new password"
              placeholderTextColor="#999"
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm New Password *</Text>
            <TextInput
              style={styles.textInput}
              value={passwordData.confirmPassword}
              onChangeText={(text) => setPasswordData({ ...passwordData, confirmPassword: text })}
              placeholder="Confirm new password"
              placeholderTextColor="#999"
              secureTextEntry
            />
          </View>

          <View style={styles.passwordButtonContainer}>
            <TouchableOpacity
              style={styles.cancelPasswordButton}
              onPress={() => {
                setShowChangePassword(false)
                setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
              }}
            >
              <Text style={styles.cancelPasswordText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.savePasswordButton}
              onPress={() => {
                // Handle password change logic here
                console.log("[v0] Password change requested")
                setShowChangePassword(false)
                setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
              }}
            >
              <Text style={styles.savePasswordText}>Update Password</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.previousButton} onPress={handlePrevious}>
          <Text style={styles.previousButtonText}>Previous</Text>
        </TouchableOpacity>
        {hasChanges() && (
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.disabledButton]}
            onPress={handleEdit}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  )

  // Show loading screen while data is being loaded
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />
        <ActivityIndicator size="large" color="#C17A47" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    )
  }

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
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load user data from SecureStore
  const loadUserData = async () => {
    try {
      setIsLoading(true)
      const storedUserData = await SecureStore.getItemAsync("user_data")
      if (storedUserData) {
        const parsedUserData = JSON.parse(storedUserData)
        setUserData(parsedUserData)

        // Set display name
        let displayName = "User"
        if (parsedUserData.profile) {
          const { kutsero_fname, kutsero_lname, kutsero_username } = parsedUserData.profile
          if (kutsero_fname && kutsero_lname) {
            displayName = `${kutsero_fname} ${kutsero_lname}`
          } else if (kutsero_username) {
            displayName = kutsero_username
          } else if (kutsero_fname) {
            displayName = kutsero_fname
          }
        }
        setCurrentUser(displayName)
      }
    } catch (error) {
      console.error("Error loading user data:", error)
    } finally {
      setIsLoading(false)
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
        onPress: async () => {
          try {
            // Clear all user data from SecureStore
            await SecureStore.deleteItemAsync("access_token")
            await SecureStore.deleteItemAsync("refresh_token")
            await SecureStore.deleteItemAsync("user_data")
            await SecureStore.deleteItemAsync("selectedHorseData")
            await SecureStore.deleteItemAsync("checkInData")

            router.replace("../../pages/auth/login")
          } catch (error) {
            console.error("Error during logout:", error)
            router.replace("../../pages/auth/login")
          }
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
          router.push("./dashboard")
        } else if (tabKey === "horse") {
          router.push("./horsecare")
        } else if (tabKey === "chat") {
          router.push("./messages")
        } else if (tabKey === "calendar") {
          router.push("./calendar")
        } else if (tabKey === "history") {
          router.push("./history")
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

  // Show loading screen while data is being loaded
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />
        <ActivityIndicator size="large" color="#C17A47" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    )
  }

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
          {userData?.profile?.kutsero_email || `${currentUser.toLowerCase().replace(/\s+/g, "")}@gmail.com`}
        </Text>
        {userData?.user_status === "pending" && <Text style={styles.statusText}>Account Status: Pending Approval</Text>}
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
        <TabButton
          iconSource={require("../../assets/images/horse.png")}
          label="Horse"
          tabKey="horse"
          isActive={false}
        />
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
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#C17A47",
    fontSize: moderateScale(16),
    fontWeight: "500",
    marginTop: verticalScale(10),
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
  statusText: {
    fontSize: moderateScale(10),
    color: "#FFE082",
    marginTop: verticalScale(4),
    fontWeight: "500",
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
  inputHint: {
    fontSize: moderateScale(12),
    color: "#666",
    marginTop: verticalScale(4),
    fontStyle: "italic",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: scale(8),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(16),
    color: "#333",
    backgroundColor: "#FAFAFA",
    minHeight: verticalScale(48),
  },
  // Button Styles
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: verticalScale(30),
    paddingHorizontal: scale(10),
    flexWrap: "wrap",
    gap: scale(10),
  },
  previousButton: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    borderRadius: scale(8),
    minWidth: scale(80),
    alignItems: "center",
  },
  previousButtonText: {
    color: "#666",
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  nextButton: {
    backgroundColor: "#C17A47",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    borderRadius: scale(8),
    minWidth: scale(80),
    alignItems: "center",
  },
  nextButtonText: {
    color: "white",
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#28A745",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    borderRadius: scale(8),
    minWidth: scale(100),
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
  // Help & Support Styles
  helpContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  helpSection: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(20),
  },
  helpSectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(16),
  },
  helpItem: {
    marginBottom: verticalScale(20),
    paddingBottom: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  helpQuestion: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(8),
    lineHeight: moderateScale(20),
  },
  helpAnswer: {
    fontSize: moderateScale(14),
    color: "#666",
    lineHeight: moderateScale(20),
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(12),
    flexWrap: "wrap",
  },
  contactLabel: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
    minWidth: scale(80),
    marginRight: scale(8),
  },
  contactValue: {
    fontSize: moderateScale(14),
    color: "#666",
    flex: 1,
  },
  versionText: {
    fontSize: moderateScale(14),
    color: "#666",
    textAlign: "center",
  },
  // Terms & Policies Styles
  termsContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  termsSection: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(20),
  },
  termsSectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(16),
  },
  termsText: {
    fontSize: moderateScale(14),
    color: "#666",
    lineHeight: moderateScale(20),
    marginBottom: verticalScale(12),
    textAlign: "justify",
  },
  // Change Password Styles
  changePasswordButton: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  changePasswordText: {
    color: "#C17A47",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "500",
  },
  passwordChangeContainer: {
    backgroundColor: "#f9f9f9",
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  passwordButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 12,
  },
  cancelPasswordButton: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cancelPasswordText: {
    color: "#666",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "500",
  },
  savePasswordButton: {
    flex: 1,
    backgroundColor: "#C17A47",
    padding: 12,
    borderRadius: 8,
  },
  savePasswordText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "500",
  },
})
