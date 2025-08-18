"use client"
import { useState } from "react"
import {
    Dimensions,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"

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

// Mobile-optimized spacing
const dynamicSpacing = (baseSize: number) => {
  if (width < 350) return verticalScale(baseSize * 0.7)
  if (width < 400) return verticalScale(baseSize * 0.85)
  if (width > 450) return verticalScale(baseSize * 1.05)
  return verticalScale(baseSize)
}

// Safe area calculations
const getSafeAreaPadding = () => {
  const statusBarHeight = StatusBar.currentHeight || 0
  return {
    top: Math.max(statusBarHeight, 20),
    bottom: height > 800 ? 34 : 20,
  }
}

interface TermsPoliciesProps {
  onBack: () => void
}

export default function TermsPolicies({ onBack }: TermsPoliciesProps) {
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({})
  const safeArea = getSafeAreaPadding()

  const BackIcon = () => (
    <View style={styles.backIconContainer}>
      <View style={styles.backArrow} />
    </View>
  )

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }))
  }

  const ExpandableSection = ({ 
    title, 
    children, 
    sectionKey 
  }: { 
    title: string
    children: React.ReactNode
    sectionKey: string 
  }) => {
    const isExpanded = expandedSections[sectionKey]
    
    return (
      <View style={styles.sectionContainer}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => toggleSection(sectionKey)}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={[
            styles.expandIcon,
            isExpanded && styles.expandIconRotated
          ]}>
            <View style={styles.expandArrow} />
          </View>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.sectionContent}>
            {children}
          </View>
        )}
      </View>
    )
  }

  const BulletPoint = ({ children }: { children: string }) => (
    <View style={styles.bulletContainer}>
      <View style={styles.bullet} />
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: safeArea.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Terms & Policies</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: safeArea.bottom + dynamicSpacing(20) }
        ]}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            Welcome to ECHO, a digital platform designed to monitor, manage, and improve the health and welfare 
            of farm animals in real-time. By accessing or using the platform, users agree to adhere to these Terms and Policies.
          </Text>
        </View>

        {/* User Eligibility */}
        <ExpandableSection title="User Eligibility" sectionKey="eligibility">
          <BulletPoint>Users include horse heroes (caretakers), veterinarians, veterinarians, and DMVF officials aged 18 or older.</BulletPoint>
          <BulletPoint>Users must register with accurate information and keep login details confidential.</BulletPoint>
        </ExpandableSection>

        {/* User Responsibilities */}
        <ExpandableSection title="User Responsibilities" sectionKey="responsibilities">
          <BulletPoint>Use the system solely for authorized purposes related to horse health and welfare.</BulletPoint>
          <BulletPoint>Ensure all data entered (horse details, health info) are correct and respectful of privacy.</BulletPoint>
          <BulletPoint>Report any suspicious or malicious activities immediately to the support team.</BulletPoint>
          <BulletPoint>Not attempt to modify, disrupt, or misuse the platform.</BulletPoint>
        </ExpandableSection>

        {/* Data Privacy and Security */}
        <ExpandableSection title="Data Privacy and Security" sectionKey="privacy">
          <BulletPoint>Personal data and horse records are stored securely and used only for system operations.</BulletPoint>
          <BulletPoint>Access to sensitive information is role-based and restricted to authorized users.</BulletPoint>
          <BulletPoint>Users should not share login credentials or allow unauthorized access.</BulletPoint>
        </ExpandableSection>

        {/* System Usage */}
        <ExpandableSection title="System Usage" sectionKey="usage">
          <BulletPoint>The platform requires internet access; offline functionality may be limited.</BulletPoint>
          <BulletPoint>Users must not employ automation or hacking techniques to interfere with the system.</BulletPoint>
          <BulletPoint>The developers are not responsible for system downtime or technical issues beyond their control.</BulletPoint>
        </ExpandableSection>

        {/* Intellectual Property */}
        <ExpandableSection title="Intellectual Property" sectionKey="property">
          <BulletPoint>All system content, features, logos, trademarks, and source code are owned by the system developers or licensors.</BulletPoint>
          <BulletPoint>Users are prohibited from copying, reproducing, distributing, or reverse-engineering any system content without explicit permission.</BulletPoint>
        </ExpandableSection>

        {/* Limitation of Liability */}
        <ExpandableSection title="Limitation of Liability" sectionKey="liability">
          <BulletPoint>ECHO aims to assist in early detection and management of horse health issues but is not a substitute for professional veterinary advice.</BulletPoint>
          <BulletPoint>The developers and administrators are not liable for any damages resulting from system use or inability to access the platform.</BulletPoint>
          <BulletPoint>In case of prolonged service downtime, no guarantee are provided for uninterrupted service.</BulletPoint>
        </ExpandableSection>

        {/* Updates and Amendments */}
        <ExpandableSection title="Updates and Amendments" sectionKey="updates">
          <BulletPoint>These Terms and Policies may be updated periodically to reflect system improvements, legal requirements, or operational changes.</BulletPoint>
          <BulletPoint>Continued use of the platform after updates constitutes acceptance of revised policies.</BulletPoint>
          <BulletPoint>Users will be notified of significant changes via system notifications or email.</BulletPoint>
        </ExpandableSection>

        {/* Termination and Suspension */}
        <ExpandableSection title="Termination and Suspension" sectionKey="termination">
          <BulletPoint>Accounts may be suspended or terminated for violations, misuse, or malicious activities.</BulletPoint>
          <BulletPoint>Users may request account deletion, which will remove all associated personal data records from the system.</BulletPoint>
          <BulletPoint>Terminated users lose access to all platform features.</BulletPoint>
        </ExpandableSection>

        {/* Compliance with Laws */}
        <ExpandableSection title="Compliance with Laws" sectionKey="compliance">
          <BulletPoint>Users agree to comply with local laws, regulations, and ethical standards related to animal welfare.</BulletPoint>
          <BulletPoint>The system adheres to Philippine data privacy laws and regulations.</BulletPoint>
        </ExpandableSection>

        {/* Support & Communication */}
        <ExpandableSection title="Support & Communication" sectionKey="support">
          <BulletPoint>Support is available through email, Facebook, and in-app help features.</BulletPoint>
          <BulletPoint>Users can report issues, give feedback, or request assistance via:</BulletPoint>
          <View style={styles.contactInfo}>
            <Text style={styles.contactText}>Email: echosupport@gmail.com</Text>
            <Text style={styles.contactText}>Facebook: ECHO Support</Text>
          </View>
          <BulletPoint>Emergency and critical alerts can be sent via the system's emergency alert feature, which notifies veterinarians and authorities promptly.</BulletPoint>
        </ExpandableSection>

        {/* User Agreement */}
        <ExpandableSection title="User Agreement" sectionKey="agreement">
          <BulletPoint>Registering an account implies acceptance of these Terms and Policies.</BulletPoint>
          <BulletPoint>Users agree to use the platform responsibly and ethically.</BulletPoint>
        </ExpandableSection>

        {/* Data Retention & Confidentiality */}
        <ExpandableSection title="Data Retention & Confidentiality" sectionKey="retention">
          <BulletPoint>Data will be stored securely and retained only for the duration necessary to fulfill the system's purpose.</BulletPoint>
          <BulletPoint>Users' data will not be shared with unauthorized parties unless mandated by law or for system support.</BulletPoint>
          <BulletPoint>The system encourages users to provide feedback for continuous improvement.</BulletPoint>
          <BulletPoint>Feedback can be submitted via email or the in-app feedback feature.</BulletPoint>
        </ExpandableSection>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using ECHO, you acknowledge that you have read, understood, and agree to be bound by these Terms and Policies.
          </Text>
          <Text style={styles.lastUpdated}>
            Last updated: January 2025
          </Text>
        </View>
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
  content: {
    flex: 1,
    backgroundColor: "white",
  },
  scrollContent: {
    flexGrow: 1,
  },
  welcomeSection: {
    padding: scale(20),
    backgroundColor: "#F9F9F9",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  welcomeText: {
    fontSize: moderateScale(14),
    color: "#666",
    lineHeight: moderateScale(20),
    textAlign: "justify",
  },
  sectionContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(20),
    paddingVertical: dynamicSpacing(16),
    backgroundColor: "white",
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#C17A47",
    flex: 1,
    lineHeight: moderateScale(20),
  },
  expandIcon: {
    width: scale(20),
    height: scale(20),
    justifyContent: "center",
    alignItems: "center",
  },
  expandIconRotated: {
    transform: [{ rotate: "90deg" }],
  },
  expandArrow: {
    width: scale(8),
    height: scale(8),
    borderRightWidth: scale(2),
    borderTopWidth: scale(2),
    borderColor: "#C17A47",
    transform: [{ rotate: "45deg" }],
  },
  sectionContent: {
    paddingHorizontal: scale(20),
    paddingVertical: dynamicSpacing(16),
    backgroundColor: "#FAFAFA",
  },
  bulletContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: verticalScale(12),
  },
  bullet: {
    width: scale(4),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: "#C17A47",
    marginTop: verticalScale(8),
    marginRight: scale(8),
    flexShrink: 0,
  },
  bulletText: {
    fontSize: moderateScale(14),
    color: "#333",
    lineHeight: moderateScale(20),
    flex: 1,
    textAlign: "justify",
  },
  contactInfo: {
    marginLeft: scale(12),
    marginTop: verticalScale(8),
    marginBottom: verticalScale(8),
  },
  contactText: {
    fontSize: moderateScale(14),
    color: "#C17A47",
    fontWeight: "500",
    marginBottom: verticalScale(4),
  },
  footer: {
    padding: scale(20),
    backgroundColor: "#F9F9F9",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    marginTop: dynamicSpacing(20),
  },
  footerText: {
    fontSize: moderateScale(14),
    color: "#666",
    lineHeight: moderateScale(20),
    textAlign: "center",
    fontStyle: "italic",
  },
  lastUpdated: {
    fontSize: moderateScale(12),
    color: "#999",
    textAlign: "center",
    marginTop: verticalScale(12),
  },
})
