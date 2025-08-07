import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

const Terms = () => {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Policies</Text>
      </View>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.introText}>
          Welcome to ECHO, a digital platform designed to monitor, manage, and improve the health and welfare of tartanilIa horses in Cebu. By accessing or using the system, users agree to adhere to these Terms and Policies.
        </Text>

        <Text style={styles.sectionTitle}>User Eligibility</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Users include Kutseros (caretakers/ operators), veterinarians, and DVMF officials aged 18 or older.</Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Users must register with accurate information and keep login details confidential.</Text>
        </View>

        <Text style={styles.sectionTitle}>User Responsibilities</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Use the system solely for authorized purposes related to horse health and welfare.</Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Ensure all data entered (horse details, health info) are correct and respectful of privacy.</Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Report any issues, errors, or suspicious activities immediately to the support team.</Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Not attempt to modify, disrupt, or misuse the platform.</Text>
        </View>

        <Text style={styles.sectionTitle}>Data Privacy and Security</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Personal data and horse records are stored securely and used only for system operations.</Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Access to sensitive information is role-based and restricted to authorized users.</Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Users should not share login credentials or allow unauthorized access.</Text>
        </View>

        <Text style={styles.sectionTitle}>System Usage</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>The platform requires internet access; offline functionality is not supported.</Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Users must not employ automation or hacking techniques to interfere with the system.</Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>The developers are not responsible for system downtime or technical issues beyond their control.</Text>
        </View>

        <Text style={styles.sectionTitle}>Intellectual Property</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>All system content, features, logos, trademarks, and source code are owned by the system developers or licensors.</Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Users are prohibited from copying, reproducing, modifying, or distributing any system content without explicit permission.</Text>
        </View>

        <Text style={styles.sectionTitle}>Limitation of Liability</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>ECHO aims to assist in early detection and management of horse health issues but is not a substitute for professional veterinary advice.</Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>The developers and administrators are not liable for any damages resulting from system use or inability to access the platform.</Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>The platform may experience occasional downtime; no guarantees are provided for uninterrupted service.</Text>
        </View>

        <Text style={styles.sectionTitle}>Updates and Amendments</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>These Terms and Policies may be updated periodically to reflect system improvements, legal updates, or changes in functionality.</Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Continued use of the platform after updates constitutes acceptance of the revised policies.</Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Users will be notified of significant changes via system notifications or email.</Text>
        </View>

        <Text style={styles.sectionTitle}>Termination and Suspension</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Accounts may be suspended or terminated for violations, misuse, or malicious activities.</Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Users may request account deletion, which will remove all user-specific data and horse records from the system.</Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Terminated users lose access to all platform features.</Text>
        </View>

        <Text style={styles.sectionTitle}>Compliance with Laws</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Users agree to comply with local laws, regulations, and ethical standards for animal welfare.</Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>The system adheres to Philippine data privacy laws and regulations.</Text>
        </View>

        <Text style={styles.sectionTitle}>Support & Communication</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Support is available through email, Facebook, and in-app help features.</Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Users can report issues, give feedback, or request assistance via:</Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}> </Text>
          <Text style={styles.bulletText}>• Email: <Text style={styles.linkText}>echosupport@gmail.com</Text></Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}> </Text>
          <Text style={styles.bulletText}>• Facebook: <Text style={styles.linkText}>fb.com/echo</Text></Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Emergency and critical alerts can be sent via the system&#39;s emergency alert feature, which notifies veterinarians and authorities promptly.</Text>
        </View>

        <Text style={styles.sectionTitle}>User Agreement</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Registering an account implies acceptance of these Terms and Policies.</Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Users agree to use the platform responsibly and ethically.</Text>
        </View>

        <Text style={styles.sectionTitle}>Data Retention & Confidentiality</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Data will be stored securely and retained only for the duration necessary to fulfill the system&#39;s purpose.</Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>User&#39;s data will not be shared with unauthorized parties unless required by law or for system support.</Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>The system encourages users to provide feedback for continuous improvement.</Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Feedback can be submitted via email or the Facebook page.</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CD853F', // Matches the profile header color
    paddingVertical: 15,
    paddingHorizontal: 20,
    paddingTop: 50, // Adjust for SafeAreaView if needed
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)', // Semi-transparent background for the circle
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  introText: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 24,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  bulletContainer: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  bulletPoint: {
    fontSize: 16,
    marginRight: 10,
    color: '#333',
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  linkText: {
    color: '#007bff', // A common blue for links
    textDecorationLine: 'underline',
  },
});

export default Terms;
