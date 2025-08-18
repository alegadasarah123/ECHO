import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function LoadingScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/Login'); // Navigate after delay
    }, 8000); // 3 seconds

    return () => clearTimeout(timer);
  }, [router]); // ✅ Fixed ESLint warning

  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/logo1.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // Clean white background
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 180,
  },
});
