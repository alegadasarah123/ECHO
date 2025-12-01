// KUTSERO PROFILE SCREEN

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
import * as ImagePicker from "expo-image-picker"
import { FontAwesome } from '@expo/vector-icons'
// Import the separate components
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
    bottom: height > 800 ? 34 : 20,
  }
}

// Backend API configuration
const API_BASE_URL = "http://172.20.10.2:8000/api/kutsero"

// Updated User data interface
interface UserData {
  id: string
  email: string
  kutsero_id?: string
  profile?: {
    kutsero_id?: string
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
    kutsero_image?: string | null
    [key: string]: any
  }
  access_token: string
  refresh_token?: string
  user_status?: string
}

interface ProfileInformationProps {
  onBack: () => void
}

// Helper function to extract initials from name
const getInitials = (firstName?: string, lastName?: string): string => {
  if (!firstName && !lastName) return "U"
  const first = firstName?.charAt(0)?.toUpperCase() || ""
  const last = lastName?.charAt(0)?.toUpperCase() || ""
  return first + last || "U"
}

// Helper function to generate consistent avatar color based on name
const getAvatarColor = (firstName?: string, lastName?: string): string => {
  const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E2"]

  const name = (firstName || "") + (lastName || "")
  if (!name) return colors[0]

  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

// Helper function for image handling
const getImageSource = (imageUri: string | null) => {
  if (!imageUri) {
    return require("../../assets/images/horse.png")
  }

  if (imageUri.startsWith("data:image") || imageUri.startsWith("http")) {
    return { uri: imageUri }
  }

  return { uri: `${API_BASE_URL}/media/${imageUri}` }
}

// Debug function for image issues
const debugImageInfo = (imageUri: string | null, context: string) => {
  console.log(`${context} Image Info:`, {
    uri: imageUri,
    type: typeof imageUri,
    length: imageUri?.length,
    isBase64: imageUri?.startsWith("data:image"),
    isUrl: imageUri?.startsWith("http"),
    isFilename: imageUri && !imageUri.startsWith("data:image") && !imageUri.startsWith("http"),
  })
}

// Profile Information Component with photo upload functionality
function ProfileInformation({ onBack }: ProfileInformationProps) {
  const [currentUser, setCurrentUser] = useState("User")
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [profilePictureData, setProfilePictureData] = useState<any>(null)

  const safeArea = getSafeAreaPadding()
  const [currentStep, setCurrentStep] = useState(1)

  const [formData, setFormData] = useState({
    city: "",
    municipality: "",
    barangay: "",
    zipCode: "",
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    sex: "",
    phoneNumber: "",
    province: "",
    email: "",
    username: "",
  })

  const [showChangePassword, setShowChangePassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [originalFormData, setOriginalFormData] = useState({
    city: "",
    municipality: "",
    barangay: "",
    zipCode: "",
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    sex: "",
    phoneNumber: "",
    province: "",
    email: "",
    username: "",
  })

  // Load user data and profile from backend
  const loadUserData = async () => {
    try {
      setIsLoading(true)

      const storedUserData = await SecureStore.getItemAsync("user_data")
      const storedAccessToken = await SecureStore.getItemAsync("access_token")

      console.log("Stored user data raw:", storedUserData)

      if (!storedUserData || !storedAccessToken) {
        Alert.alert("Error", "No user data found. Please log in again.")
        return
      }

      const parsedUserData = JSON.parse(storedUserData)
      console.log("Parsed user data:", parsedUserData)

      setUserData(parsedUserData)

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

      if (parsedUserData.profile?.kutsero_image) {
        const imageUri = parsedUserData.profile.kutsero_image
        debugImageInfo(imageUri, "Loading profile")

        if (imageUri.startsWith("data:image")) {
          setSelectedImage(imageUri)
        } else if (imageUri.startsWith("http")) {
          setSelectedImage(imageUri)
        } else {
          const fullImageUrl = `${API_BASE_URL}/media/${imageUri}`
          setSelectedImage(fullImageUrl)
        }
      } else {
        setSelectedImage(null)
      }

      let kutserroId: string | null = null
      if (parsedUserData.profile?.kutsero_id) {
        kutserroId = parsedUserData.profile.kutsero_id
      } else if (parsedUserData.kutsero_id) {
        kutserroId = parsedUserData.kutsero_id
      } else if (parsedUserData.id) {
        kutserroId = parsedUserData.id
      }

      console.log("Extracted kutsero_id:", kutserroId)

      if (kutserroId) {
        try {
          const response = await fetch(`${API_BASE_URL}/profile/${kutserroId}/`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          })

          if (response.ok) {
            const result = await response.json()
            console.log("Backend API response:", result)

            if (result.success && result.data) {
              const profileData = result.data
              console.log("Profile data from backend:", profileData)

              const newFormData = {
                city: profileData.city || "",
                municipality: profileData.municipality || "",
                barangay: profileData.barangay || "",
                zipCode: profileData.zipCode || "",
                firstName: profileData.firstName || "",
                middleName: profileData.middleName || "",
                lastName: profileData.lastName || "",
                dateOfBirth: profileData.dateOfBirth || "",
                sex: profileData.sex || "",
                phoneNumber: profileData.phoneNumber || "",
                province: profileData.province || "",
                email: profileData.email || "",
                username: profileData.username || "",
              }

              console.log("Mapped form data from API:", newFormData)
              setFormData(newFormData)
              setOriginalFormData(newFormData)

              console.log("Profile data loaded successfully from kutsero_profile table")
              return
            }
          }

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

      console.log("Using stored profile data directly")
      console.log("parsedUserData.profile:", parsedUserData.profile)

      if (parsedUserData.profile) {
        const profile = parsedUserData.profile
        const basicFormData = {
          city: profile.kutsero_city || "",
          municipality: profile.kutsero_municipality || "",
          barangay: profile.kutsero_brgy || "",
          zipCode: profile.kutsero_zipcode || "",
          firstName: profile.kutsero_fname || "",
          middleName: profile.kutsero_mname || "",
          lastName: profile.kutsero_lname || "",
          dateOfBirth: profile.kutsero_dob || "",
          sex: profile.kutsero_sex || "",
          phoneNumber: profile.kutsero_phone_num || "",
          province: profile.kutsero_province || "",
          email: profile.kutsero_email || "",
          username: profile.kutsero_username || "",
        }

        console.log("Basic form data from stored profile:", basicFormData)
        setFormData(basicFormData)
        setOriginalFormData(basicFormData)
      } else {
        console.log("No stored profile data available")
        const emptyFormData = {
          city: "",
          municipality: "",
          barangay: "",
          zipCode: "",
          firstName: "",
          middleName: "",
          lastName: "",
          dateOfBirth: "",
          sex: "",
          phoneNumber: "",
          province: "",
          email: "",
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

  useEffect(() => {
    loadUserData()
  }, [])

  const hasChanges = () => {
    return JSON.stringify(formData) !== JSON.stringify(originalFormData) || profilePictureData !== null
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

  const handleImagePicker = async () => {
    Alert.alert("Select Profile Photo", "Choose how you'd like to add your profile picture", [
      {
        text: "Camera",
        onPress: () => openCamera(),
      },
      {
        text: "Photo Library",
        onPress: () => openImageLibrary(),
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ])
  }

  const openCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()

      if (status !== "granted") {
        Alert.alert("Permission Denied", "Camera permission is required to take photos.")
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0]
        const imageUri = asset.uri

        console.log("Camera image selected:", imageUri)
        setSelectedImage(imageUri)

        const profilePicture = {
          uri: imageUri,
          type: "image/jpeg",
          name: "profile_camera.jpg",
        }

        setProfilePictureData(profilePicture)
      }
    } catch (error) {
      console.error("Camera error:", error)
      Alert.alert("Error", "Failed to open camera. Please try again.")
    }
  }

  const openImageLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (status !== "granted") {
        Alert.alert("Permission Denied", "Photo library permission is required to select photos.")
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0]
        const imageUri = asset.uri

        console.log("Gallery image selected:", imageUri)
        setSelectedImage(imageUri)

        const profilePicture = {
          uri: imageUri,
          type: "image/jpeg",
          name: "profile_gallery.jpg",
        }

        setProfilePictureData(profilePicture)
      }
    } catch (error) {
      console.error("Image picker error:", error)
      Alert.alert("Error", "Failed to open photo library. Please try again.")
    }
  }

  const convertImageToBase64 = async (uri: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      fetch(uri)
        .then((response) => response.blob())
        .then((blob) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            resolve(reader.result as string)
          }
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
        .catch(reject)
    })
  }

  const handleEdit = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      Alert.alert("Validation Error", "First name and last name are required.")
      return
    }
    if (!formData.email.trim()) {
      Alert.alert("Validation Error", "Email is required.")
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      Alert.alert("Validation Error", "Please enter a valid email address.")
      return
    }
    if (!formData.phoneNumber.trim()) {
      Alert.alert("Validation Error", "Phone number is required.")
      return
    }

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

      if (!userData) {
        Alert.alert("Error", "Unable to save: No user data found.")
        return
      }

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

      let profileImageBase64 = null
      if (profilePictureData && profilePictureData.uri) {
        try {
          console.log("Converting image to base64...")
          profileImageBase64 = await convertImageToBase64(profilePictureData.uri)
          console.log("Image converted successfully, length:", profileImageBase64.length)
        } catch (error) {
          console.error("Error converting image:", error)
          Alert.alert("Error", "Failed to process profile picture. Please try again.")
          setIsSaving(false)
          return
        }
      }

      const dataToSave = {
        ...formData,
        profilePicture: profileImageBase64,
      }

      const response = await fetch(`${API_BASE_URL}/profile/${kutserroId}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSave),
      })

      console.log("Save response status:", response.status)
      const result = await response.json()
      console.log("Save response data:", result)

      if (response.ok && result.success) {
        setOriginalFormData({ ...formData })
        setProfilePictureData(null)

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
              kutsero_image: selectedImage,
            },
          }

          await SecureStore.setItemAsync("user_data", JSON.stringify(updatedUserData))
          setUserData(updatedUserData)

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

  // PASSWORD CHANGE HANDLERS
  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword.trim()) {
      Alert.alert("Validation Error", "Please enter your current password.")
      return
    }
    if (!passwordData.newPassword.trim()) {
      Alert.alert("Validation Error", "Please enter a new password.")
      return
    }
    if (!passwordData.confirmPassword.trim()) {
      Alert.alert("Validation Error", "Please confirm your new password.")
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert("Validation Error", "New password and confirmation do not match.")
      return
    }

    if (passwordData.newPassword.length < 8) {
      Alert.alert("Validation Error", "New password must be at least 8 characters long.")
      return
    }

    Alert.alert("Change Password", "Are you sure you want to change your password?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Change",
        onPress: () => savePasswordChange(),
      },
    ])
  }

  const savePasswordChange = async () => {
    try {
      setIsSaving(true)

      if (!userData?.profile?.kutsero_email) {
        Alert.alert("Error", "Unable to change password: No email found.")
        setIsSaving(false)
        return
      }

      const email = userData.profile.kutsero_email

      const response = await fetch(`${API_BASE_URL}/reset-password/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          newPassword: passwordData.newPassword,
          currentPassword: passwordData.currentPassword,
        }),
      })

      console.log("Password change response status:", response.status)
      const result = await response.json()
      console.log("Password change response:", result)

      if (response.ok && result.success) {
        Alert.alert("Success", result.message || "Your password has been changed successfully!", [
          {
            text: "OK",
            onPress: () => {
              setShowChangePassword(false)
              setPasswordData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
              })
            },
          },
        ])
      } else {
        Alert.alert("Error", result.error || result.message || "Failed to change password. Please try again.")
      }
    } catch (error) {
      console.error("Error changing password:", error)
      Alert.alert("Error", "An error occurred while changing your password. Please try again.")
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
        <TouchableOpacity onPress={handleImagePicker} activeOpacity={0.8}>
          <View style={styles.profilePhotoWrapper}>
            <View style={styles.profilePhotoCircle}>
              {selectedImage ? (
                <Image
                  source={getImageSource(selectedImage)}
                  style={styles.profilePhotoImage}
                  resizeMode="cover"
                  onError={(e) => {
                    console.log("Image load error:", e.nativeEvent.error)
                    setSelectedImage(null)
                  }}
                />
              ) : (
                <InitialsAvatar firstName={formData.firstName} lastName={formData.lastName} />
              )}
            </View>
            <View style={styles.cameraIconOverlay}>
              <FontAwesome name="camera" size={moderateScale(16)} color="#65676B" />
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleImagePicker} style={styles.changePhotoButton}>
          <Text style={styles.changePhotoText}>{selectedImage ? "Change Profile Photo" : "Add Profile Photo"}</Text>
        </TouchableOpacity>
        {selectedImage && (
          <TouchableOpacity
            onPress={() => {
              setSelectedImage(null)
              setProfilePictureData(null)
            }}
            style={styles.removePhotoButtonSmall}
          >
            <Text style={styles.removePhotoTextSmall}>Remove Photo</Text>
          </TouchableOpacity>
        )}
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

  const renderStepTwo = () => (
    <ScrollView
      style={styles.formContainer}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.formScrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.profilePhotoContainer}>
        <View style={styles.profilePhotoCircle}>
          {selectedImage ? (
            <Image
              source={getImageSource(selectedImage)}
              style={styles.profilePhotoImage}
              resizeMode="cover"
              onError={(e) => {
                console.log("Image load error:", e.nativeEvent.error)
                setSelectedImage(null)
              }}
            />
          ) : (
            <InitialsAvatar firstName={formData.firstName} lastName={formData.lastName} />
          )}
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
          {selectedImage ? (
            <Image
              source={getImageSource(selectedImage)}
              style={styles.profilePhotoImage}
              resizeMode="cover"
              onError={(e) => {
                console.log("Image load error:", e.nativeEvent.error)
                setSelectedImage(null)
              }}
            />
          ) : (
            <InitialsAvatar firstName={formData.firstName} lastName={formData.lastName} />
          )}
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
              style={[styles.savePasswordButton, isSaving && styles.disabledButton]}
              onPress={handlePasswordChange}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.savePasswordText}>Update Password</Text>
              )}
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
      <View style={[styles.profileInfoHeader, { paddingTop: safeArea.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.profileInfoHeaderTitle} numberOfLines={1} adjustsFontSizeToFit>
          Profile Information
        </Text>
        <View style={styles.headerRight} />
      </View>

      {renderStepIndicator()}

      <View style={styles.profileInfoContent}>
        {currentStep === 1 && renderStepOne()}
        {currentStep === 2 && renderStepTwo()}
        {currentStep === 3 && renderStepThree()}
      </View>
    </View>
  )
}

const InitialsAvatar = ({ firstName, lastName }: { firstName?: string; lastName?: string }) => {
  const initials = getInitials(firstName, lastName)
  const backgroundColor = getAvatarColor(firstName, lastName)

  return (
    <View style={[styles.initialsContainer, { backgroundColor }]}>
      <Text style={styles.initialsText}>{initials}</Text>
    </View>
  )
}

export default function ProfileScreen() {
  const router = useRouter()
  const safeArea = getSafeAreaPadding()
  const [currentUser, setCurrentUser] = useState("User")
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadUserData = async () => {
    try {
      setIsLoading(true)
      const storedUserData = await SecureStore.getItemAsync("user_data")
      if (storedUserData) {
        const parsedUserData = JSON.parse(storedUserData)
        setUserData(parsedUserData)

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

  useEffect(() => {
    loadUserData()
  }, [])

  useFocusEffect(
    React.useCallback(() => {
      loadUserData()
    }, []),
  )

  const [showHelpSupport, setShowHelpSupport] = useState(false)
  const [showProfileInfo, setShowProfileInfo] = useState(false)
  const [showTermsPolicies, setShowTermsPolicies] = useState(false)

  if (showProfileInfo) {
    return <ProfileInformation onBack={() => setShowProfileInfo(false)} />
  }

  if (showHelpSupport) {
    return <HelpSupport onBack={() => setShowHelpSupport(false)} />
  }

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
            await SecureStore.deleteItemAsync("access_token")
            await SecureStore.deleteItemAsync("refresh_token")
            await SecureStore.deleteItemAsync("user_data")
            await SecureStore.deleteItemAsync("selectedHorseData")
            await SecureStore.deleteItemAsync("checkInData")
            
            console.log("All tokens and user data cleared successfully")
            router.replace("/auth/login")
          } catch (error) {
            console.error("Error during logout:", error)
            router.replace("/auth/login")
          }
        },
      },
    ])
  }

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

  const ProfileIcon = ({ color }: { color: string }) => (
    <View style={styles.iconContainer}>
      <View style={styles.profileContainer}>
        <View style={[styles.profileHead, { backgroundColor: color }]} />
        <View style={[styles.profileBody, { backgroundColor: color }]} />
      </View>
    </View>
  )

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
          // Stay on profile
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
      <View style={[styles.profileHeader, { paddingTop: safeArea.top }]}>
        <View style={styles.profileImageContainer}>
          {userData?.profile?.kutsero_image ? (
            <Image
              source={getImageSource(userData.profile.kutsero_image)}
              style={styles.headerProfilePicture}
              resizeMode="cover"
              onError={(e) => console.log("Header image load error:", e.nativeEvent.error)}
            />
          ) : (
            <View style={styles.headerProfilePicture}>
              <InitialsAvatar
                firstName={userData?.profile?.kutsero_fname}
                lastName={userData?.profile?.kutsero_lname}
              />
            </View>
          )}
        </View>
        <Text style={styles.profileName} numberOfLines={1} adjustsFontSizeToFit>
          {currentUser}
        </Text>
        <Text style={styles.profileEmail} numberOfLines={1} adjustsFontSizeToFit>
          {userData?.profile?.kutsero_email || `${currentUser.toLowerCase().replace(/\s+/g, "")}@gmail.com`}
        </Text>
        {userData?.user_status === "pending" && <Text style={styles.statusText}>Account Status: Pending Approval</Text>}
      </View>

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
    justifyContent: "center",
    alignItems: "center",
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
  iconContainer: {
    width: scale(16),
    height: scale(16),
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
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
  profilePhotoWrapper: {
    position: "relative",
    marginBottom: verticalScale(16),
  },
  profilePhotoCircle: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(50),
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#E0E0E0",
    overflow: "hidden",
  },
  profilePhotoImage: {
    width: scale(150),
    height: scale(100),
    borderRadius: scale(50),
  },
  initialsContainer: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(50),
    justifyContent: "center",
    alignItems: "center",
  },
  initialsText: {
    fontSize: moderateScale(36),
    fontWeight: "700",
    color: "white",
  },
  cameraIconOverlay: {
    position: "absolute",
    bottom: scale(-5),
    right: scale(-5),
    backgroundColor: "#E4E6EB",
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  changePhotoButton: {
    backgroundColor: "#C17A47",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(10),
    borderRadius: scale(8),
    marginBottom: verticalScale(8),
  },
  changePhotoText: {
    color: "white",
    fontSize: moderateScale(14),
    fontWeight: "500",
    textAlign: "center",
  },
  removePhotoButtonSmall: {
    backgroundColor: "#FF4444",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(6),
    marginBottom: verticalScale(16),
  },
  removePhotoTextSmall: {
    color: "white",
    fontSize: moderateScale(12),
    fontWeight: "500",
    textAlign: "center",
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
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(16),
    color: "#333",
    backgroundColor: "#FAFAFA",
    minHeight: verticalScale(48),
  },
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