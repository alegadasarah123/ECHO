import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

const HorseHandlingScreen = () => {
  const router = useRouter();

  const handleGoBack = () => {
    router.back();
  };

//   const handleEdit = () => {
//     console.log('Edit button pressed');
//     // Add navigation or action for the edit button
//   };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kutsero&#39;s Horse Handling</Text>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Booking Card */}
        <View style={styles.bookingCard}>
          <Image
            source={{ uri: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-EtqZ61AMrinTvCFtnNf2bg8kjhAqlc.png?height=60&width=60&query=circular%20placeholder%20image' }}
            style={styles.cardProfileImage}
          />
          <View style={styles.cardContent}>
            <Text style={styles.cardUserName}>Jose Rizal</Text>
            <Text style={styles.cardDetailText}>Date Start: May 15, 2025 | 8:00 AM</Text>
            <Text style={styles.cardDetailText}>Date End: May 15, 2025 | 12:00 PM</Text>
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button
      <TouchableOpacity style={styles.fab} onPress={handleEdit}>
        <FontAwesome5 name="pencil-alt" size={24} color="#fff" />
      </TouchableOpacity> */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f0f0', // Light grey background for the main content area
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CD853F', // Header background color
    paddingVertical: 15,
    paddingHorizontal: 20,
    paddingTop: 50, // Adjust for status bar on iOS
  },
  backButton: {
    marginRight: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  bookingCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  cardProfileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e0e0e0',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardUserName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardDetailText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#CD853F', // FAB background color
    justifyContent: 'center',
    alignItems: 'center',
    right: 20,
    bottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
});

export default HorseHandlingScreen;
