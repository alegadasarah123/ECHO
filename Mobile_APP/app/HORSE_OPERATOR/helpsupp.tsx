// HORSE_OPERATOR Help & Support Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Dimensions,
  StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';


const { width, height } = Dimensions.get("window");

// Enhanced responsive scaling functions with better mobile optimization
const scale = (size: number) => {
  const scaleFactor = width / 375;
  const scaledSize = size * scaleFactor;
  return Math.max(Math.min(scaledSize, size * 1.2), size * 0.8);
};

const verticalScale = (size: number) => {
  const scaleFactor = height / 812;
  const scaledSize = size * scaleFactor;
  return Math.max(Math.min(scaledSize, size * 1.15), size * 0.85);
};

const moderateScale = (size: number, factor = 0.5) => {
  const scaledSize = size + (scale(size) - size) * factor;
  return Math.max(Math.min(scaledSize, size * 1.1), size * 0.9);
};

// Mobile-optimized spacing
const dynamicSpacing = (baseSize: number) => {
  if (width < 350) return verticalScale(baseSize * 0.7);
  if (width < 400) return verticalScale(baseSize * 0.85);
  if (width > 450) return verticalScale(baseSize * 1.05);
  return verticalScale(baseSize);
};

// Safe area calculations
const getSafeAreaPadding = () => {
  const statusBarHeight = StatusBar.currentHeight || 0;
  return {
    top: Math.max(statusBarHeight, 20),
    bottom: height > 800 ? 34 : 20,
  };
};

const HelpSupp = () => {
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  const safeArea = getSafeAreaPadding();

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleEmailPress = () => {
    Linking.openURL('mailto:echosupport@gmail.com')
      .catch(() => Alert.alert('Error', 'Unable to open email app'));
  };

  const handlePhonePress = () => {
    Linking.openURL('tel:+639123456789')
      .catch(() => Alert.alert('Error', 'Unable to make a phone call'));
  };

  const BackIcon = () => (
    <View style={styles.backIconContainer}>
      <View style={styles.backArrow} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#CD853F" translucent={false} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: safeArea.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <BackIcon />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Help & Support</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContentContainer,
            { paddingBottom: safeArea.bottom + dynamicSpacing(20) }
          ]}
        >
          {/* About the App Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About the App</Text>
            <Text style={styles.sectionText}>
              ECHO is a mobile app that helps kutseros manage their kalesa horse&#39;s health. You can book vet appointments, 
              get reminders, and keep track of your horse&#39;s condition—all in one place.
            </Text>
          </View>

          {/* Need Assistance Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📞 Need Assistance?</Text>
            <Text style={styles.sectionText}>
              If you encounter any issues, have questions, or need help using the app, please contact us through the following channels:
            </Text>
          </View>

          {/* Contact Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.contactItem}>
              <Text style={styles.contactLabel}>• Phone:</Text>
              <TouchableOpacity onPress={handlePhonePress}>
                <Text style={styles.contactLink}>0912-345-6789</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.contactItem}>
              <Text style={styles.contactLabel}>• Email:</Text>
              <TouchableOpacity onPress={handleEmailPress}>
                <Text style={styles.contactLink}>echosupport@gmail.com</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Emergency Assistance Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🚨 Emergency Assistance</Text>
            <Text style={styles.sectionText}>
              If you experience a health emergency with a horse, use the Emergency Alert feature in the app to notify 
              veterinarians and authorities immediately.
            </Text>
          </View>

          {/* Common Questions Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Common Questions</Text>
            
            {/* Question 1 */}
            <TouchableOpacity 
              style={styles.questionItem}
              onPress={() => toggleSection('question1')}
            >
              <Text style={styles.questionText}>• How do I add a horse profile?</Text>
            </TouchableOpacity>
            {expandedSections.question1 && (
              <Text style={styles.answerText}>
                Tap on the Horse Profiles menu and follow the instructions to register a new horse.
              </Text>
            )}

            {/* Question 2 */}
            <TouchableOpacity 
              style={styles.questionItem}
              onPress={() => toggleSection('question2')}
            >
              <Text style={styles.questionText}>• How can I schedule an appointment?</Text>
            </TouchableOpacity>
            {expandedSections.question2 && (
              <Text style={styles.answerText}>
                Use the Appointments feature to select available times and confirm bookings.
              </Text>
            )}

            {/* Question 3 */}
            <TouchableOpacity 
              style={styles.questionItem}
              onPress={() => toggleSection('question3')}
            >
              <Text style={styles.questionText}>• How do I send an emergency alert?</Text>
            </TouchableOpacity>
            {expandedSections.question3 && (
              <Text style={styles.answerText}>
                Fill out the emergency form in the app and tap Send Alert—help will be dispatched promptly.
              </Text>
            )}

            {/* Question 4 */}
            <TouchableOpacity 
              style={styles.questionItem}
              onPress={() => toggleSection('question4')}
            >
              <Text style={styles.questionText}>• How do I report a problem or give feedback?</Text>
            </TouchableOpacity>
            {expandedSections.question4 && (
              <Text style={styles.answerText}>
                Contact support via email or Facebook, or submit feedback through the Help section.
              </Text>
            )}
          </View>

          {/* Feedback Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Feedback & Suggestions</Text>
            <Text style={styles.sectionText}>
              Your feedback helps us improve! Please share your suggestions or report issues through:
            </Text>
            <View style={styles.contactItem}>
              <Text style={styles.contactLabel}>• Email:</Text>
              <TouchableOpacity onPress={handleEmailPress}>
                <Text style={styles.contactLink}>echosupport@gmail.com</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    backgroundColor: "#CD853F",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingBottom: dynamicSpacing(12),
    minHeight: verticalScale(60),
  },
  backButton: {
    padding: scale(8),
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
    alignItems: "center",
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "white",
  },
  headerRight: {
    width: scale(36),
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: scale(20),
    paddingTop: dynamicSpacing(20),
  },
  section: {
    marginBottom: dynamicSpacing(24),
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(8),
    lineHeight: moderateScale(20),
  },
  sectionText: {
    fontSize: moderateScale(14),
    color: "#666",
    lineHeight: moderateScale(20),
    marginBottom: verticalScale(8),
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(4),
    flexWrap: "wrap",
  },
  contactLabel: {
    fontSize: moderateScale(14),
    color: "#666",
    marginRight: scale(4),
  },
  contactLink: {
    fontSize: moderateScale(14),
    color: "#CD853F",
    textDecorationLine: "underline",
  },
  versionText: {
    fontSize: moderateScale(14),
    color: "#333",
    fontWeight: "500",
    marginBottom: verticalScale(4),
  },
  versionDate: {
    fontSize: moderateScale(12),
    color: "#999",
  },
  questionItem: {
    paddingVertical: verticalScale(8),
  },
  questionText: {
    fontSize: moderateScale(14),
    color: "#333",
    fontWeight: "500",
    lineHeight: moderateScale(18),
  },
  answerText: {
    fontSize: moderateScale(13),
    color: "#666",
    lineHeight: moderateScale(18),
    marginLeft: scale(16),
    marginTop: verticalScale(4),
    marginBottom: verticalScale(8),
  },
});

export default HelpSupp;