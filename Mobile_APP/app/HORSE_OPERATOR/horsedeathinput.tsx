// horsedeathinput.tsx - COMPLETE MULTIPLE IMAGES VERSION (UPDATED FOR BASE64)
import React, { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { FontAwesome5, MaterialIcons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import * as ImagePicker from "expo-image-picker"
import * as SecureStore from "expo-secure-store"
// FIX: Import the legacy API as suggested by the error
import * as FileSystem from "expo-file-system";



// Use your actual API base URL
const API_BASE_URL = "https://echo-ebl8.onrender.com/api/horse_operator"

interface DeathRecordForm {
  user_id: string
  horse_id: string
  death_date: string
  cause_of_death: string
  death_location: string
  images: string[] // Array of base64 strings for multiple images
}

interface HorseData {
  horse_id: string
  horse_name: string
  horse_breed?: string
  horse_age?: string
  horse_image?: string
  horse_status?: string
}

interface SelectedImage {
  id: string
  uri: string
  base64: string
  name: string
  size: number
}

const HorseDeathInfo = () => {
  const router = useRouter()
  const params = useLocalSearchParams()
  
  // Parse horse data once on mount
  const horseData = React.useMemo(() => {
    try {
      if (params.horseData) {
        return JSON.parse(params.horseData as string) as HorseData
      } else if (params.horse_id) {
        return {
          horse_id: params.horse_id as string,
          horse_name: params.horse_name as string || "Unknown Horse",
          horse_breed: params.horse_breed as string,
          horse_age: params.horse_age as string,
          horse_image: params.horse_image as string,
          horse_status: params.horse_status as string
        } as HorseData
      }
    } catch (error) {
      console.error("Error parsing horse data:", error)
    }
    return null
  }, [params])

  const horseId = horseData?.horse_id || ""
  const horseName = horseData?.horse_name || ""

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState<DeathRecordForm>({
    user_id: "",
    horse_id: horseId,
    death_date: new Date().toISOString().split('T')[0],
    cause_of_death: "",
    death_location: "",
    images: [],
  })

  const [datePickerVisible, setDatePickerVisible] = useState(false)
  const [deathDate, setDeathDate] = useState(new Date())
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([])
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showImageOptions, setShowImageOptions] = useState(false)
  const [hasLoggedData, setHasLoggedData] = useState(false)

  // Load user ID once
  const loadUserId = useCallback(async () => {
    try {
      const storedUser = await SecureStore.getItemAsync("user_data")
      if (storedUser) {
        const parsed = JSON.parse(storedUser)
        const id = parsed.user_id || parsed.id
        if (id) {
          setUserId(id)
          setFormData(prev => ({ ...prev, user_id: id }))
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error)
    }
  }, [])

  // Request permissions once
  const requestPermissions = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try {
        const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync()
        
        if (mediaStatus !== 'granted' || cameraStatus !== 'granted') {
          Alert.alert(
            "Permissions Required",
            "Please grant camera and media library permissions to upload images.",
            [{ text: "OK" }]
          )
        }
      } catch (error) {
        console.error("Error requesting permissions:", error)
      }
    }
  }, [])

  // Initialize only once
  useEffect(() => {
    const initialize = async () => {
      await loadUserId()
      await requestPermissions()
    }
    
    initialize()
  }, [loadUserId, requestPermissions])

  // Log horse data only once when it's available
  useEffect(() => {
    if (horseData && !hasLoggedData) {
      console.log("Horse data loaded:", horseData)
      setHasLoggedData(true)
    }
  }, [horseData, hasLoggedData])

  // Update form data when selected images change
  useEffect(() => {
    const imageBase64Array = selectedImages.map(img => img.base64)
    setFormData(prev => ({
      ...prev,
      images: imageBase64Array
    }))
  }, [selectedImages])

  const handleInputChange = useCallback((field: keyof DeathRecordForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }, [])

  const handleDateChange = useCallback((event: any, selectedDate?: Date) => {
    setDatePickerVisible(false)
    if (selectedDate) {
      setDeathDate(selectedDate)
      const formattedDate = selectedDate.toISOString().split('T')[0]
      handleInputChange('death_date', formattedDate)
    }
  }, [handleInputChange])

  const processImage = useCallback(async (result: ImagePicker.ImagePickerResult): Promise<SelectedImage | null> => {
    if (!result.canceled && result.assets.length > 0) {
      try {
        const asset = result.assets[0]
        
        let base64Data: string | null = null
        let fileSize = asset.fileSize || 0
        
        // Always read as base64 using FileSystem for consistency
        if (asset.uri) {
          try {
            console.log(`Processing image from URI: ${asset.uri}`)
            
            // FIXED: Use legacy FileSystem API
            const base64 = await FileSystem.readAsStringAsync(asset.uri, {
              encoding: FileSystem.EncodingType.Base64,
            })
            
            if (!base64) {
              console.warn("Failed to read file as base64")
              return null
            }
            
            // Create data URI with proper mime type
            const mimeType = asset.mimeType || 'image/jpeg'
            base64Data = `data:${mimeType};base64,${base64}`
            
            // Calculate approximate file size
            fileSize = Math.round((base64.length * 3) / 4) // Approximate base64 to binary size
            
            console.log(`Successfully converted image to base64 (size: ${Math.round(fileSize / 1024)} KB)`)
            
          } catch (fileError) {
            console.error("Error converting file to base64:", fileError)
            
            // Fallback: Try to get base64 from asset if available
            if (asset.base64) {
              console.log("Using base64 from asset as fallback")
              const mimeType = asset.mimeType || 'image/jpeg'
              base64Data = `data:${mimeType};base64,${asset.base64}`
              fileSize = Math.round((asset.base64.length * 3) / 4)
            } else {
              console.warn("No base64 data available for image")
              return null
            }
          }
        } else if (asset.base64) {
          // Use base64 from asset if URI method failed
          console.log("Using base64 from asset property")
          const mimeType = asset.mimeType || 'image/jpeg'
          base64Data = `data:${mimeType};base64,${asset.base64}`
          fileSize = Math.round((asset.base64.length * 3) / 4)
        }
        
        if (!base64Data) {
          console.warn("No base64 data available for image")
          return null
        }
        
        // Check file size (max 10MB per image)
        const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
        if (fileSize > MAX_FILE_SIZE) {
          Alert.alert(
            "File Too Large",
            "Image exceeds the 10MB size limit. Please choose a smaller image.",
            [{ text: "OK" }]
          )
          return null
        }
        
        const fileName = asset.fileName || `image_${Date.now()}.jpg`
        
        const processedImage: SelectedImage = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          uri: asset.uri,
          base64: base64Data,
          name: fileName,
          size: fileSize
        }
        
        console.log(`Processed image: ${fileName} (${Math.round(fileSize / 1024)} KB)`)
        return processedImage
        
      } catch (error) {
        console.error("Error processing image:", error)
        return null
      }
    }
    
    return null
  }, [])

  const pickImageFromGallery = useCallback(async () => {
    try {
      console.log("Picking images from gallery...")
      
      // Allow multiple selection
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true, // Enable multiple selection
        selectionLimit: 10, // Limit to 10 images
        allowsEditing: false, // Disable editing for multiple images
        aspect: [4, 3],
        quality: 0.8,
        base64: true, // Request base64 data
        exif: false,
      })
      
      console.log("Image picker result:", result)
      
      if (result.canceled) {
        console.log("Image picking cancelled")
        return
      }

      if (result.assets && result.assets.length > 0) {
        const newImages: SelectedImage[] = []
        
        for (const asset of result.assets) {
          const singleResult = {
            canceled: false,
            assets: [asset]
          } as ImagePicker.ImagePickerResult
          
          const processedImage = await processImage(singleResult)
          if (processedImage) {
            newImages.push(processedImage)
          }
        }
        
        if (newImages.length > 0) {
          setSelectedImages(prev => [...prev, ...newImages])
          console.log(`Added ${newImages.length} images, total: ${selectedImages.length + newImages.length}`)
          
          // Show success message
          Alert.alert(
            "Success",
            `Added ${newImages.length} image(s)`,
            [{ text: "OK" }]
          )
        } else {
          Alert.alert(
            "No Images Selected",
            "No valid images were selected or processed.",
            [{ text: "OK" }]
          )
        }
      }

    } catch (error) {
      console.error("Error picking images:", error)
      Alert.alert(
        "Error",
        "Failed to pick images. Please try again.",
        [{ text: "OK" }]
      )
    } finally {
      setShowImageOptions(false)
    }
  }, [processImage, selectedImages.length])

  const takePhoto = useCallback(async () => {
    try {
      console.log("Taking photo...")
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.8,
        base64: true, // Request base64 data
        exif: false,
      })
      
      console.log("Camera result:", result)
      
      if (result.canceled) {
        console.log("Photo taking cancelled")
        return
      }

      const processedImage = await processImage(result)
      
      if (processedImage) {
        setSelectedImages(prev => [...prev, processedImage])
        console.log(`Photo added, total images: ${selectedImages.length + 1}`)
        
        Alert.alert(
          "Success",
          "Photo added successfully",
          [{ text: "OK" }]
        )
      }

    } catch (error) {
      console.error("Error taking photo:", error)
      Alert.alert(
        "Error",
        "Failed to take photo. Please try again.",
        [{ text: "OK" }]
      )
    } finally {
      setShowImageOptions(false)
    }
  }, [processImage, selectedImages.length])

  const removeImage = useCallback((id: string) => {
    console.log("Removing image:", id)
    setSelectedImages(prev => prev.filter(img => img.id !== id))
  }, [])

  const removeAllImages = useCallback(() => {
    Alert.alert(
      "Remove All Images",
      "Are you sure you want to remove all uploaded images?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove All",
          style: "destructive",
          onPress: () => {
            console.log("Removing all images")
            setSelectedImages([])
          }
        }
      ]
    )
  }, [])

  const validateForm = useCallback((): boolean => {
    if (!formData.user_id) {
      Alert.alert(
        "Authentication Error",
        "User not authenticated. Please login again.",
        [{ text: "OK" }]
      )
      return false
    }

    if (!formData.horse_id) {
      Alert.alert(
        "Missing Information",
        "Horse ID is missing. Please go back and try again.",
        [{ text: "OK" }]
      )
      return false
    }

    if (!formData.cause_of_death || formData.cause_of_death.trim() === '') {
      Alert.alert(
        "Missing Information",
        "Please fill in the cause of death field.",
        [{ text: "OK" }]
      )
      return false
    }

    if (!formData.death_location || formData.death_location.trim() === '') {
      Alert.alert(
        "Missing Information",
        "Please fill in the location of death field.",
        [{ text: "OK" }]
      )
      return false
    }

    if (!formData.death_date) {
      Alert.alert(
        "Missing Information",
        "Please select a date of death.",
        [{ text: "OK" }]
      )
      return false
    }

    const selectedDate = new Date(formData.death_date)
    const today = new Date()
    if (selectedDate > today) {
      Alert.alert(
        "Invalid Date",
        "Death date cannot be in the future.",
        [{ text: "OK" }]
      )
      return false
    }

    return true
  }, [formData])

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return
    }

    console.log("Submitting form data...")
    console.log("Form data:", {
      ...formData,
      images_count: formData.images.length,
      total_images_size: formData.images.reduce((acc, img) => acc + img.length, 0)
    })

    setLoading(true)
    setUploading(true)

    try {
      console.log(`Sending request to: ${API_BASE_URL}/mark_horse_deceased/`)
      
      // Prepare the data to send
      const submitData = {
        ...formData,
        images: formData.images // Already in base64 format
      }
      
      console.log("Submitting with images:", {
        image_count: submitData.images.length,
        first_image_length: submitData.images.length > 0 ? submitData.images[0].length : 0,
        first_image_preview: submitData.images.length > 0 ? submitData.images[0].substring(0, 100) + "..." : "no images"
      })
      
      const response = await fetch(`${API_BASE_URL}/mark_horse_deceased/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })
      
      const responseText = await response.text()
      console.log("Raw response:", responseText)
      
      let responseData
      try {
        responseData = JSON.parse(responseText)
        console.log("Parsed response:", responseData)
      } catch (parseError) {
        console.error("Error parsing response:", parseError)
        throw new Error(`Invalid response from server: ${responseText.substring(0, 200)}`)
      }

      if (!response.ok) {
        console.error("Server error response:", responseData)
        throw new Error(responseData.error || responseData.detail || `Failed with status ${response.status}`)
      }
      
      console.log("Success response:", responseData)
      
      Alert.alert(
        "Success",
        `${horseName} has been marked as deceased with ${responseData.data?.images_uploaded || 0} images.`,
        [
          {
            text: "OK",
            onPress: () => {
              console.log("Navigating back to horse list...")
              router.push({
                pathname: "../HORSE_OPERATOR/horse",
                params: { 
                  refresh: Date.now().toString(),
                  message: `${horseName} marked as deceased`
                }
              })
            }
          }
        ]
      )

    } catch (error: any) {
      console.error("Error submitting death record:", error)
      
      let errorMessage = "Failed to submit death record. Please try again."
      if (error.message) {
        errorMessage = error.message
      }
      
      Alert.alert(
        "Error",
        errorMessage,
        [{ text: "OK" }]
      )
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }, [validateForm, formData, horseName, router])

  const handleCancel = useCallback(() => {
    if (selectedImages.length > 0 || formData.cause_of_death || formData.death_location) {
      Alert.alert(
        "Cancel Confirmation",
        "Are you sure you want to cancel? All entered information will be lost.",
        [
          { text: "No", style: "cancel" },
          {
            text: "Yes",
            style: "destructive",
            onPress: () => {
              console.log("Cancelling form...")
              router.back()
            }
          }
        ]
      )
    } else {
      console.log("No data entered, cancelling...")
      router.back()
    }
  }, [selectedImages, formData, router])

  const showImagePreview = useCallback((uri: string) => {
    console.log("Showing image preview:", uri)
    setPreviewImage(uri)
    setShowPreview(true)
  }, [])

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }, [])

  const ImageOptionsModal = React.memo(function ImageOptionsModal() {
    return (
      <Modal
        visible={showImageOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowImageOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Images</Text>
            
            <TouchableOpacity
              style={styles.modalOption}
              onPress={takePhoto}
            >
              <FontAwesome5 name="camera" size={24} color="#CD853F" />
              <Text style={styles.modalOptionText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modalOption}
              onPress={pickImageFromGallery}
            >
              <FontAwesome5 name="images" size={24} color="#CD853F" />
              <Text style={styles.modalOptionText}>Choose from Gallery (Multiple)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowImageOptions(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    )
  })

  const ImagePreviewModal = React.memo(function ImagePreviewModal() {
    return (
      <Modal
        visible={showPreview}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={styles.previewOverlay}>
          <TouchableOpacity 
            style={styles.previewCloseButton}
            onPress={() => setShowPreview(false)}
          >
            <FontAwesome5 name="times" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {previewImage && (
            <Image 
              source={{ uri: previewImage }} 
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    )
  })

  const renderImageItem = useCallback(({ item }: { item: SelectedImage }) => (
    <View style={styles.imageItem}>
      <TouchableOpacity
        style={styles.imageThumbnail}
        onPress={() => showImagePreview(item.uri)}
      >
        <Image 
          source={{ uri: item.uri }} 
          style={styles.thumbnailImage}
          resizeMode="cover"
        />
        <View style={styles.imageOverlay}>
          <FontAwesome5 name="search-plus" size={16} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
      <View style={styles.imageInfo}>
        <Text style={styles.imageName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.imageSize}>
          {formatFileSize(item.size)}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.removeItemButton}
        onPress={() => removeImage(item.id)}
        disabled={uploading}
      >
        <FontAwesome5 name="times" size={14} color="#FF6B35" />
      </TouchableOpacity>
    </View>
  ), [showImagePreview, formatFileSize, removeImage, uploading])

  const renderImageGrid = useCallback(() => (
    <View style={styles.imagesGridContainer}>
      <View style={styles.imagesHeader}>
        <Text style={styles.imagesCount}>
          {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''} selected
        </Text>
        {selectedImages.length > 0 && (
          <TouchableOpacity
            style={styles.removeAllButton}
            onPress={removeAllImages}
            disabled={uploading}
          >
            <FontAwesome5 name="trash-alt" size={14} color="#FF6B35" />
            <Text style={styles.removeAllText}>Remove All</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {selectedImages.length > 0 ? (
        <>
          <FlatList
            data={selectedImages}
            renderItem={renderImageItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.imageGridRow}
            scrollEnabled={false}
            contentContainerStyle={styles.imageGridContent}
          />
          
          {selectedImages.length < 10 && (
            <TouchableOpacity
              style={styles.addMoreButton}
              onPress={() => setShowImageOptions(true)}
              disabled={uploading}
            >
              <MaterialIcons name="add-photo-alternate" size={24} color="#CD853F" />
              <Text style={styles.addMoreText}>Add More Images</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => setShowImageOptions(true)}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#CD853F" />
          ) : (
            <>
              <FontAwesome5 name="cloud-upload-alt" size={32} color="#CD853F" />
              <Text style={styles.uploadButtonText}>Upload Images</Text>
              <Text style={styles.uploadHint}>
                Tap to add photos (death certificate, vet report, etc.)
              </Text>
              <Text style={styles.uploadLimit}>
                Max 10 images • 10MB each
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  ), [selectedImages, uploading, removeAllImages, renderImageItem])

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome5 name="arrow-left" size={20} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mark Horse as Deceased</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Horse Info Card */}
          {horseData && (
            <View style={styles.horseInfoCard}>
              <View style={styles.horseAvatar}>
                {horseData?.horse_image ? (
                  <Image
                    source={{ uri: horseData.horse_image }}
                    style={styles.horseImage}
                  />
                ) : (
                  <FontAwesome5 name="horse" size={40} color="#CD853F" />
                )}
              </View>
              <View style={styles.horseInfo}>
                <Text style={styles.horseName}>{horseName}</Text>
                <Text style={styles.horseDetails}>
                  {horseData?.horse_breed || "Unknown Breed"} • {horseData?.horse_age || "N/A"} years old
                </Text>
                <Text style={styles.horseStatus}>
                  Current Status: {horseData?.horse_status || "Unknown"}
                </Text>
              </View>
            </View>
          )}

          {/* Warning Message */}
          <View style={styles.warningContainer}>
            <FontAwesome5 name="exclamation-triangle" size={20} color="#FF6B35" />
            <Text style={styles.warningText}>
              Marking a horse as deceased is a permanent action. This cannot be undone.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Date of Death */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Date of Death *</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setDatePickerVisible(true)}
              >
                <Text style={styles.dateText}>
                  {formData.death_date || "Select date"}
                </Text>
                <FontAwesome5 name="calendar" size={16} color="#666" />
              </TouchableOpacity>
              {datePickerVisible && (
                <DateTimePicker
                  value={deathDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )}
            </View>

            {/* Cause of Death */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Cause of Death *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.cause_of_death}
                onChangeText={(text) => handleInputChange('cause_of_death', text)}
                placeholder="What was the cause of death?"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Location of Death */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Location of Death *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.death_location}
                onChangeText={(text) => handleInputChange('death_location', text)}
                placeholder="Where did the horse die?"
              />
            </View>

            {/* Image Upload Section */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Death Certificate/Images (Optional)</Text>
              <Text style={styles.sectionSubtitle}>
                Upload death certificate, vet report, or related images
                (Max 10 images, 10MB each)
              </Text>
              
              {renderImageGrid()}
            </View>

            {/* Required Fields Note */}
            <View style={styles.noteContainer}>
              <Text style={styles.noteText}>* Required fields</Text>
              <Text style={styles.noteText}>
                All information provided will be permanently recorded.
                You can upload multiple images (up to 10) such as death certificate, vet reports, or related photos.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.submitButton, (loading || !userId) && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading || !userId}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Mark as Deceased</Text>
                {selectedImages.length > 0 && (
                  <Text style={styles.imageCountBadge}>
                    {selectedImages.length}
                  </Text>
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Modals */}
      <ImageOptionsModal />
      <ImagePreviewModal />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  horseInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F8F9FA",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  horseAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#CD853F",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  horseImage: {
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  horseInfo: {
    flex: 1,
  },
  horseName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 4,
  },
  horseDetails: {
    fontSize: 14,
    color: "#6C757D",
    marginBottom: 2,
  },
  horseStatus: {
    fontSize: 13,
    color: "#FF6B35",
    fontWeight: "500",
    marginTop: 4,
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF3E0",
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: "#E65100",
    marginLeft: 12,
    lineHeight: 20,
    fontWeight: "500",
  },
  formContainer: {
    padding: 16,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6C757D",
    marginBottom: 16,
    lineHeight: 20,
  },
  dateInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateText: {
    fontSize: 16,
    color: "#333",
  },
  textInput: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#333",
    textAlignVertical: 'top',
    minHeight: 100,
  },
  imagesGridContainer: {
    marginTop: 8,
  },
  imagesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  imagesCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C3E50",
  },
  removeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FED7D7",
  },
  removeAllText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#FF6B35",
    marginLeft: 4,
  },
  imageGridRow: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  imageGridContent: {
    paddingBottom: 4,
  },
  imageItem: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    padding: 8,
    position: "relative",
  },
  imageThumbnail: {
    width: "100%",
    height: 100,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 8,
    position: "relative",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageInfo: {
    paddingHorizontal: 4,
  },
  imageName: {
    fontSize: 12,
    fontWeight: "500",
    color: "#2C3E50",
    marginBottom: 2,
  },
  imageSize: {
    fontSize: 11,
    color: "#6C757D",
  },
  removeItemButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  uploadButton: {
    backgroundColor: "#F8F9FA",
    borderWidth: 2,
    borderColor: "#E9ECEF",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#CD853F",
    marginTop: 16,
    marginBottom: 8,
  },
  uploadHint: {
    fontSize: 14,
    color: "#6C757D",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 4,
  },
  uploadLimit: {
    fontSize: 12,
    color: "#6C757D",
    textAlign: "center",
  },
  addMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CD853F",
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 12,
  },
  addMoreText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#CD853F",
    marginLeft: 8,
  },
  noteContainer: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  noteText: {
    fontSize: 14,
    color: "#6C757D",
    marginBottom: 8,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 10,
    marginHorizontal: 8,
    position: "relative",
  },
  cancelButton: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6C757D",
  },
  submitButton: {
    backgroundColor: "#CD853F",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  buttonIcon: {
    marginRight: 8,
  },
  imageCountBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#FF6B35",
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
    width: 20,
    height: 20,
    borderRadius: 10,
    textAlign: "center",
    lineHeight: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
  },
  modalCancelButton: {
    marginTop: 20,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F8F9FA',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6C757D',
  },
  // Preview Modal Styles
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  previewImage: {
    width: '100%',
    height: '80%',
  },
})

export default HorseDeathInfo