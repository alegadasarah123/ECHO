import React, { useState, useEffect } from 'react';
import {
View,
Text,
StyleSheet,
SafeAreaView,
ScrollView,
TouchableOpacity,
Image,
Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Horse {
id: string;
name: string;
age: string;
dateOfBirth: string;
sex: string;
breed: string;
color: string;
height: string;
weight: string;
image: string | null;
lastVetCheck: string;
condition: string;
conditionColor: string;
}

const HorseProfileScreen = () => {
const router = useRouter();
const params = useLocalSearchParams();
const [horseData, setHorseData] = useState<Horse | null>(null);
const [loading, setLoading] = useState(true);
const [showMenu, setShowMenu] = useState(false);

useEffect(() => {
  const fetchHorse = async () => {
    setLoading(true); // Set loading true at the start of fetch
    try {
      if (params.horseData && typeof params.horseData === 'string') {
        const horse = JSON.parse(decodeURIComponent(params.horseData));
        const horseWithImage = { ...horse, image: horse.image || null };
        setHorseData(horseWithImage);
      } else if (params.id) {
        const user = await AsyncStorage.getItem('current_user');
        if (user) {
          const userHorsesKey = `horses_${user}`;
          const storedHorses = await AsyncStorage.getItem(userHorsesKey);
          if (storedHorses) {
            const horses: Horse[] = JSON.parse(storedHorses);
            const horse = horses.find(h => h.id === params.id);
            if (horse) {
              const horseWithImage = { ...horse, image: horse.image || null };
              setHorseData(horseWithImage);
            } else {
              Alert.alert('Error', 'Horse not found');
              router.back();
            }
          }
        }
      } else {
        // If no params, maybe navigate back or show an error
        Alert.alert('Error', 'No horse ID or data provided.');
        router.back();
      }
    } catch (error) {
      console.error('Error loading horse data:', error);
      Alert.alert('Error', 'Failed to load horse data');
      router.back();
    } finally {
      setLoading(false); // Set loading false at the end
    }
  };

  // Only fetch if we have an ID or horseData in params
  if (params.id || params.horseData) {
    fetchHorse();
  } else {
    // If no params, ensure loading is false and handle the empty state
    setLoading(false);
  }
}, [params.id, params.horseData, router]); // Dependencies are the actual params and router

const handleHorseHandling = () => {
  if (horseData) {
    console.log(`Opening horse handling for ${horseData.name}`);
    router.push('/horsehandling');
    // Add router.push when handling screen exists
    // router.push({
    //   pathname: '/handling',
    //   params: { horseId: horseData.id, horseName: horseData.name }
    // });
  }
  setShowMenu(false); // Close menu after action
};

const handleMedical = () => {
  if (horseData) {
    console.log(`Opening medical records for ${horseData.name}`);
    router.push('/medical');
    // Add router.push when medical screen exists
    // router.push({
    //   pathname: '/medical',
    //   params: { horseId: horseData.id, horseName: horseData.name }
    // });
  }
  setShowMenu(false); // Close menu after action
};

const handleMenuToggle = () => {
  setShowMenu(!showMenu);
};

// const handleEditHorse = () => {
//   if (horseData) {
//     // Use a more generic navigation approach
//     console.log('Edit horse functionality - to be implemented');
//     // When you create the edit screen, use: router.push(`/edithorse?horseId=${horseData.id}&horseData=${encodeURIComponent(JSON.stringify(horseData))}`);
//   }
//   setShowMenu(false);
// };

if (loading) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </SafeAreaView>
  );
}

if (!horseData) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Horse data not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

return (
  <SafeAreaView style={styles.safeArea}>
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      {/* Horse Image and Name */}
      <View style={styles.profileSection}>
        <Image
          source={
            horseData.image
              ? { uri: horseData.image }
              : { uri: 'https://via.placeholder.com/150x150/f0f0f0/999999?text=Horse' }
          }
          style={styles.horseImage}
          // Add error handling for images
          onError={(error) => {
            console.log('Profile image load error:', error);
          }}
          // Add loading indicator
          loadingIndicatorSource={{
            uri: 'https://via.placeholder.com/150x150/f0f0f0/999999?text=Loading'
          }}
        />
        <Text style={styles.horseName}>{horseData.name}</Text>
      </View>
      {/* Orange Divider */}
      <View style={styles.dividerSection}>
      </View>
      <Text style={styles.dividerText}>Horse Profile</Text>
      {/* Profile Info */}
      <View style={styles.profileCard}>
        {[
          ['Age', `${horseData.age} years`],
          ['Date of Birth', horseData.dateOfBirth],
          ['Sex', horseData.sex],
          ['Breed', horseData.breed],
          ['Color', horseData.color],
          ['Height', horseData.height],
          ['Weight', horseData.weight],
          ['Last Vet Check', horseData.lastVetCheck],
          ['Condition', horseData.condition],
        ].map(([label, value]) => (
          <View key={label} style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}: </Text>
            <Text
              style={[
                styles.infoValue,
                label === 'Condition' && { color: horseData.conditionColor }
              ]}
            >
              {value}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
    {/* Menu Button Only */}
    <View style={styles.menuButtonContainer}>
      <TouchableOpacity style={styles.menuButton} onPress={handleMenuToggle}>
        <FontAwesome5 name="ellipsis-v" size={20} color="#333" />
      </TouchableOpacity>
    </View>
    {/* Menu Overlay with all options */}
    {showMenu && (
      <View style={styles.menuOverlay}>
        <TouchableOpacity
          style={styles.menuOverlayBackground}
          onPress={() => setShowMenu(false)}
        />
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem} onPress={handleHorseHandling}>
            <FontAwesome5 name="horse" size={16} color="#333" />
            <Text style={styles.menuItemText}>Horse Handling</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleMedical}>
            <FontAwesome5 name="clipboard-list" size={16} color="#333" />
            <Text style={styles.menuItemText}>Medical</Text>
          </TouchableOpacity>
          {/* <TouchableOpacity style={styles.menuItem} onPress={handleEditHorse}>
            <FontAwesome5 name="edit" size={16} color="#333" />
            <Text style={styles.menuItemText}>Edit Horse</Text>
          </TouchableOpacity> */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowMenu(false)}
          >
            <FontAwesome5 name="times" size={16} color="#333" />
            <Text style={styles.menuItemText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    )}
  </SafeAreaView>
);
};

const styles = StyleSheet.create({
safeArea: {
  flex: 1,
  backgroundColor: '#f5f5f5',
},
container: {
  flex: 1,
},
loadingContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
},
loadingText: {
  fontSize: 18,
  color: '#666',
},
errorContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 20,
},
errorText: {
  fontSize: 18,
  color: '#666',
  marginBottom: 20,
},
header: {
  paddingHorizontal: 20,
  paddingTop: 10,
  paddingBottom: 20,
},
backButton: {
  padding: 5,
},
backButtonText: {
  fontSize: 16,
  color: '#CD853F',
  fontWeight: '500',
},
profileSection: {
  alignItems: 'center',
  paddingHorizontal: 20,
  marginBottom: 30,
},
horseImage: {
  width: 150,
  height: 150,
  borderRadius: 75,
  backgroundColor: '#e0e0e0',
  marginBottom: 20,
},
horseName: {
  fontSize: 32,
  fontWeight: 'bold',
  color: '#333',
},
dividerSection: {
  backgroundColor: '#CD853F',
  paddingVertical: 3,
  alignItems: 'center',
  marginBottom: 20,
},
dividerText: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#000',
  textAlign: 'center', // ✅ center horizontally
  marginBottom: 15,
},
profileCard: {
  backgroundColor: '#fff',
  marginHorizontal: 20,
  borderRadius: 15,
  padding: 20,
  marginBottom: 100,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 3,
},
infoRow: {
  flexDirection: 'row',
  marginBottom: 12,
  alignItems: 'center',
},
infoLabel: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#333',
},
infoValue: {
  fontSize: 16,
  color: '#333',
  flex: 1,
},
menuButtonContainer: {
  position: 'absolute',
  right: 20,
  bottom: 50,
  alignItems: 'flex-end',
},
menuButton: {
  width: 50,
  height: 50,
  borderRadius: 25,
  backgroundColor: '#fff',
  justifyContent: 'center',
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  elevation: 5,
},
menuOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 2000,
},
menuOverlayBackground: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
},
menuContainer: {
  position: 'absolute',
  bottom: 120, // adjust distance from bottom
  right: 20,   // adjust distance from right
  backgroundColor: '#fff',
  borderRadius: 15,
  padding: 20,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 5,
  minWidth: 200,
},
menuItem: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 15,
  paddingHorizontal: 10,
},
menuItemText: {
  fontSize: 16,
  color: '#333',
  marginLeft: 15,
},
});

export default HorseProfileScreen;
