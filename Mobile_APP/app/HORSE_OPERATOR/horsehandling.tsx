// HORSE_OPERATOR/horsehandling.tsx

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import * as SecureStore from "expo-secure-store";
import * as Notifications from 'expo-notifications';
import moment from 'moment';

interface HorseAssignment {
  assign_id: string;
  kutsero_id: string;
  horse_id: string;
  date_start: string;
  date_end: string | null;
  created_at: string;
  updated_at: string;
  kutsero_name?: string;
  horse_name?: string;
  kutsero_image?: string;
  status?: 'upcoming' | 'active' | 'completed';
}

const API_BASE_URL = "http://192.168.101.4:8000/api/horse_operator"

// Notification storage keys
const LAST_NOTIFIED_HORSE_ASSIGNMENTS_KEY = "last_notified_horse_assignments"
const CACHED_HORSE_ASSIGNMENTS_KEY = "cached_horse_assignments"
const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes cache duration

// Configure notifications handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const HorseHandlingScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [assignments, setAssignments] = useState<HorseAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [horseId, setHorseId] = useState<string | null>(null);
  const [horseName, setHorseName] = useState<string>('');
  
  // Refs to track state
  const isMounted = useRef(false);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  // ============================
  // NOTIFICATION FUNCTIONS
  // ============================

  const requestNotificationPermissions = useCallback(async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync()
      if (status === 'granted') {
        console.log('✅ Notification permissions granted for Horse Handling')
        return true
      } else {
        console.log('⚠️ Notification permissions denied for Horse Handling')
        return false
      }
    } catch (error) {
      console.error('❌ Error requesting notification permissions:', error)
      return false
    }
  }, [])

  const sendNewHorseAssignmentNotification = useCallback(async (assignment: HorseAssignment) => {
    try {
      console.log(`📢 Sending new horse assignment notification: ${assignment.assign_id}`)
      
      const hasPermission = await requestNotificationPermissions()
      if (!hasPermission) {
        console.log('⏭️ No notification permission, skipping')
        return false
      }

      const title = '🐴 New Horse Assignment!'
      const horseName = assignment.horse_name || 'Unknown Horse'
      const kutseroName = assignment.kutsero_name || 'Unknown Kutsero'
      const startDate = moment(assignment.date_start).format('MMM D, YYYY h:mm A')
      const body = `${kutseroName} will start handling ${horseName} on ${startDate}`

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: 'new_horse_assignment',
            assignId: assignment.assign_id,
            horseId: assignment.horse_id,
            horseName: assignment.horse_name,
            kutseroId: assignment.kutsero_id,
            kutseroName: assignment.kutsero_name,
            dateStart: assignment.date_start,
            dateEnd: assignment.date_end,
          },
          sound: 'default',
        },
        trigger: null,
      })

      console.log(`✅ Sent new horse assignment notification for ${assignment.assign_id}`)
      return true
    } catch (error) {
      console.error('❌ Error sending new horse assignment notification:', error)
      return false
    }
  }, [requestNotificationPermissions])

  const sendHorseAssignmentEndNotification = useCallback(async (assignment: HorseAssignment) => {
    try {
      console.log(`📢 Sending horse assignment end notification: ${assignment.assign_id}`)
      
      const hasPermission = await requestNotificationPermissions()
      if (!hasPermission) {
        console.log('⏭️ No notification permission, skipping')
        return false
      }

      const title = '✅ Horse Assignment Completed!'
      const horseName = assignment.horse_name || 'Unknown Horse'
      const kutseroName = assignment.kutsero_name || 'Unknown Kutsero'
      const endDate = moment(assignment.date_end).format('MMM D, YYYY h:mm A')
      const body = `${kutseroName} has completed handling ${horseName} on ${endDate}`

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: 'horse_assignment_end',
            assignId: assignment.assign_id,
            horseId: assignment.horse_id,
            horseName: assignment.horse_name,
            kutseroId: assignment.kutsero_id,
            kutseroName: assignment.kutsero_name,
            dateStart: assignment.date_start,
            dateEnd: assignment.date_end,
          },
          sound: 'default',
        },
        trigger: null,
      })

      console.log(`✅ Sent horse assignment end notification for ${assignment.assign_id}`)
      return true
    } catch (error) {
      console.error('❌ Error sending horse assignment end notification:', error)
      return false
    }
  }, [requestNotificationPermissions])

  const sendActiveHorseAssignmentNotification = useCallback(async (assignment: HorseAssignment) => {
    try {
      console.log(`📢 Sending active horse assignment notification: ${assignment.assign_id}`)
      
      const hasPermission = await requestNotificationPermissions()
      if (!hasPermission) {
        console.log('⏭️ No notification permission, skipping')
        return false
      }

      const title = '🏇 Horse Currently Being Handled!'
      const horseName = assignment.horse_name || 'Unknown Horse'
      const kutseroName = assignment.kutsero_name || 'Unknown Kutsero'
      const startDate = moment(assignment.date_start).format('MMM D, YYYY h:mm A')
      const body = `${kutseroName} is currently handling ${horseName} since ${startDate}`

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            type: 'active_horse_assignment',
            assignId: assignment.assign_id,
            horseId: assignment.horse_id,
            horseName: assignment.horse_name,
            kutseroId: assignment.kutsero_id,
            kutseroName: assignment.kutsero_name,
            dateStart: assignment.date_start,
            dateEnd: assignment.date_end,
          },
          sound: 'default',
        },
        trigger: null,
      })

      console.log(`✅ Sent active horse assignment notification for ${assignment.assign_id}`)
      return true
    } catch (error) {
      console.error('❌ Error sending active horse assignment notification:', error)
      return false
    }
  }, [requestNotificationPermissions])

  const loadLastNotifiedHorseAssignments = useCallback(async () => {
    try {
      const stored = await SecureStore.getItemAsync(LAST_NOTIFIED_HORSE_ASSIGNMENTS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        console.log('📋 Loaded last notified horse assignments:', Object.keys(parsed).length)
        return parsed as {[key: string]: {date_end: string | null, status: string, created_at: string}}
      }
      console.log('📋 No previously notified horse assignments found')
      return {}
    } catch (error) {
      console.error('❌ Error loading last notified horse assignments:', error)
      return {}
    }
  }, [])

  const saveLastNotifiedHorseAssignments = useCallback(async (notifiedAssignments: {[key: string]: {date_end: string | null, status: string, created_at: string}}) => {
    try {
      await SecureStore.setItemAsync(LAST_NOTIFIED_HORSE_ASSIGNMENTS_KEY, JSON.stringify(notifiedAssignments))
      console.log('💾 Saved last notified horse assignments:', Object.keys(notifiedAssignments).length)
    } catch (error) {
      console.error('❌ Error saving last notified horse assignments:', error)
    }
  }, [])

  const checkAndSendHorseAssignmentNotifications = useCallback(async (currentAssignments: HorseAssignment[]) => {
    if (currentAssignments.length === 0) {
      return
    }

    console.log('🔍 Checking horse assignments for notifications...')
    console.log('📊 Current horse assignments count:', currentAssignments.length)

    try {
      const lastNotified = await loadLastNotifiedHorseAssignments()
      const updatedNotified: {[key: string]: {date_end: string | null, status: string, created_at: string}} = { ...lastNotified }
      let notificationsSent = 0

      for (const assignment of currentAssignments) {
        const assignId = assignment.assign_id
        const currentDateEnd = assignment.date_end
        const currentStatus = assignment.status || 'unknown'
        const createdAt = assignment.created_at || ''

        const previouslyNotified = lastNotified[assignId]
        
        if (!previouslyNotified) {
          // New assignment
          console.log(`🎯 New horse assignment detected: ${assignId}`)
          
          let notificationSent = false
          if (currentStatus === 'upcoming') {
            notificationSent = await sendNewHorseAssignmentNotification(assignment)
          } else if (currentStatus === 'active') {
            notificationSent = await sendActiveHorseAssignmentNotification(assignment)
          }
          
          if (notificationSent) {
            notificationsSent++
          }
          
          updatedNotified[assignId] = { date_end: currentDateEnd, status: currentStatus, created_at: createdAt }
        } else if (previouslyNotified.date_end !== currentDateEnd) {
          // Assignment end date changed
          console.log(`🎯 Horse assignment end date changed: ${assignId}`)
          
          let notificationSent = false
          if (previouslyNotified.date_end === null && currentDateEnd !== null) {
            // Assignment just ended
            notificationSent = await sendHorseAssignmentEndNotification(assignment)
          } else if (previouslyNotified.date_end !== null && currentDateEnd === null) {
            // Assignment reactivated (date_end removed)
            notificationSent = await sendActiveHorseAssignmentNotification(assignment)
          } else if (currentStatus === 'active' && previouslyNotified.status !== 'active') {
            // Became active
            notificationSent = await sendActiveHorseAssignmentNotification(assignment)
          }
          
          if (notificationSent) {
            notificationsSent++
          }
          
          updatedNotified[assignId] = { date_end: currentDateEnd, status: currentStatus, created_at: createdAt }
        } else if (previouslyNotified.status !== currentStatus) {
          // Status changed
          console.log(`🎯 Horse assignment status changed: ${assignId} (${previouslyNotified.status} -> ${currentStatus})`)
          
          let notificationSent = false
          if (currentStatus === 'active' && previouslyNotified.status === 'upcoming') {
            // Assignment started
            notificationSent = await sendActiveHorseAssignmentNotification(assignment)
          } else if (currentStatus === 'completed' && previouslyNotified.status !== 'completed') {
            // Assignment completed
            notificationSent = await sendHorseAssignmentEndNotification(assignment)
          }
          
          if (notificationSent) {
            notificationsSent++
          }
          
          updatedNotified[assignId] = { date_end: currentDateEnd, status: currentStatus, created_at: createdAt }
        } else {
          // No changes, update record anyway
          updatedNotified[assignId] = { date_end: currentDateEnd, status: currentStatus, created_at: createdAt }
        }
      }

      // Clean up old assignments that are no longer in current list
      const currentAssignmentIds = new Set(currentAssignments.map(assign => assign.assign_id))
      Object.keys(updatedNotified).forEach(id => {
        if (!currentAssignmentIds.has(id)) {
          delete updatedNotified[id]
        }
      })

      await saveLastNotifiedHorseAssignments(updatedNotified)

      console.log(`✅ Horse assignment notification check complete. Sent ${notificationsSent} notification(s)`)
      return notificationsSent
    } catch (error) {
      console.error('❌ Error in horse assignment notification check:', error)
      return 0
    }
  }, [
    loadLastNotifiedHorseAssignments, 
    saveLastNotifiedHorseAssignments, 
    sendNewHorseAssignmentNotification, 
    sendHorseAssignmentEndNotification,
    sendActiveHorseAssignmentNotification
  ])

  // ============================
  // DATA STORAGE FUNCTIONS
  // ============================

  const saveAssignmentsToCache = useCallback(async (assignmentsData: HorseAssignment[]) => {
    try {
      const cacheData = {
        assignments: assignmentsData,
        timestamp: Date.now()
      }
      await SecureStore.setItemAsync(CACHED_HORSE_ASSIGNMENTS_KEY, JSON.stringify(cacheData))
      console.log('💾 Horse assignments cached successfully')
    } catch (error) {
      console.error('❌ Error caching horse assignments:', error)
    }
  }, [])

  const loadAssignmentsFromCache = useCallback(async () => {
    try {
      const cachedData = await SecureStore.getItemAsync(CACHED_HORSE_ASSIGNMENTS_KEY)
      if (cachedData) {
        const parsed = JSON.parse(cachedData)
        const { assignments, timestamp } = parsed
        
        if (Date.now() - timestamp < CACHE_DURATION_MS) {
          console.log('📂 Loading horse assignments from cache')
          return assignments as HorseAssignment[]
        } else {
          console.log('⏰ Cache expired, will fetch fresh data')
        }
      }
      return null
    } catch (error) {
      console.error('❌ Error loading cached horse assignments:', error)
      return null
    }
  }, [])

  // ============================
  // CORE FUNCTIONS
  // ============================

  // Load horse ID from params or SecureStore
  const loadHorseId = useCallback(async () => {
    try {
      // First try to get from route params
      if (params?.id) {
        console.log("🐴 Horse ID from params:", params.id);
        setHorseId(params.id as string);
        return params.id as string;
      }

      // Fallback to SecureStore
      const storedHorseId = await SecureStore.getItemAsync("selected_horse_id");
      if (storedHorseId) {
        console.log("🐴 Horse ID from SecureStore:", storedHorseId);
        setHorseId(storedHorseId);
        return storedHorseId;
      }

      console.warn("⚠️ No horse_id found in params or storage");
      return null;
    } catch (error) {
      console.error("❌ Error loading horse ID:", error);
      return null;
    }
  }, [params?.id]);

  // Load user ID from SecureStore
  const loadUserId = useCallback(async () => {
    try {
      const storedUser = await SecureStore.getItemAsync("user_data");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const id = parsed.user_id || parsed.id;
        if (id) {
          console.log("🔑 Loaded user_id for horse handling:", id);
          setUserId(id);
          return id;
        }
      }
    } catch (error) {
      console.error("❌ Error loading user data:", error);
    }
    return null;
  }, []);

  // Determine assignment status
  const determineAssignmentStatus = useCallback((assignment: HorseAssignment): 'upcoming' | 'active' | 'completed' => {
    const now = new Date();
    const startDate = new Date(assignment.date_start);
    const endDate = assignment.date_end ? new Date(assignment.date_end) : null;

    if (now < startDate) {
      return 'upcoming';
    } else if (!endDate || now <= endDate) {
      return 'active';
    } else {
      return 'completed';
    }
  }, []);

  // Fetch horse assignments for specific horse with refresh control
  const fetchHorseAssignments = useCallback(async (showRefreshIndicator = false) => {
    if (isFetchingRef.current) {
      console.log("Fetch already in progress, skipping...");
      return;
    }

    isFetchingRef.current = true;

    if (showRefreshIndicator) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      let uid = userId;
      if (!uid) {
        uid = await loadUserId();
        if (!uid) {
          console.error("❌ No user_id found, cannot fetch assignments.");
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }

      let hid = horseId;
      if (!hid) {
        hid = await loadHorseId();
        if (!hid) {
          console.error("❌ No horse_id found, cannot fetch assignments.");
          Alert.alert("Error", "Horse ID not found. Please select a horse first.");
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }

      // Only use cache for initial load (not for pull-to-refresh)
      if (!showRefreshIndicator) {
        const cachedAssignments = await loadAssignmentsFromCache();
        if (cachedAssignments) {
          console.log('📂 Using cached horse assignments');
          const assignmentsWithStatus = cachedAssignments.map(assign => ({
            ...assign,
            status: determineAssignmentStatus(assign)
          }));
          setAssignments(assignmentsWithStatus);
          
          // Set horse name
          if (params?.horseName) {
            setHorseName(params.horseName as string);
          } else if (cachedAssignments.length > 0 && cachedAssignments[0].horse_name) {
            setHorseName(cachedAssignments[0].horse_name);
          }
          
          setLoading(false);
          hasFetchedRef.current = true;
          
          // Fetch fresh data in background after showing cached data
          setTimeout(() => {
            if (isMounted.current) {
              fetchHorseAssignments(true);
            }
          }, 1000);
          
          isFetchingRef.current = false;
          return;
        }
      }

      console.log("📡 Fetching horse assignments for user_id:", uid, "horse_id:", hid);
      
      const url = `${API_BASE_URL}/get_horse_assignments/?user_id=${encodeURIComponent(uid)}&horse_id=${encodeURIComponent(hid)}`;
      console.log("🌐 Request URL:", url);

      const response = await fetch(url);
      console.log("📊 Response status:", response.status);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.log("❌ Error response:", errData);
        throw new Error(errData.error || `Failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Raw assignments data:", data);
      console.log("📊 Number of assignments received:", Array.isArray(data) ? data.length : 'Not array');

      const fetchedAssignments = Array.isArray(data) ? data : [];
      
      // Add status to each assignment
      const assignmentsWithStatus = fetchedAssignments.map((assign: HorseAssignment) => ({
        ...assign,
        status: determineAssignmentStatus(assign)
      }));
      
      setAssignments(assignmentsWithStatus);
      
      // Set horse name from params or data
      if (params?.horseName) {
        setHorseName(params.horseName as string);
      } else if (fetchedAssignments.length > 0 && fetchedAssignments[0].horse_name) {
        setHorseName(fetchedAssignments[0].horse_name);
      }

      await saveAssignmentsToCache(fetchedAssignments);
      
      hasFetchedRef.current = true;

    } catch (error: any) {
      console.error("❌ Error loading horse assignments:", error);
      
      // Only fallback to cache if this is not a pull-to-refresh
      if (!showRefreshIndicator) {
        const cachedAssignments = await loadAssignmentsFromCache();
        if (cachedAssignments) {
          const assignmentsWithStatus = cachedAssignments.map(assign => ({
            ...assign,
            status: determineAssignmentStatus(assign)
          }));
          setAssignments(assignmentsWithStatus);
          
          if (params?.horseName) {
            setHorseName(params.horseName as string);
          } else if (cachedAssignments.length > 0 && cachedAssignments[0].horse_name) {
            setHorseName(cachedAssignments[0].horse_name);
          }
          hasFetchedRef.current = true;
        } else {
          Alert.alert("Error", error.message || "Unable to load horse assignments");
          setAssignments([]);
        }
      } else {
        Alert.alert("Error", "Failed to refresh assignments. Please try again.");
      }
    } finally {
      isFetchingRef.current = false;
      if (showRefreshIndicator) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [
    userId, 
    horseId, 
    params?.horseName, 
    loadUserId, 
    loadHorseId, 
    loadAssignmentsFromCache, 
    saveAssignmentsToCache,
    determineAssignmentStatus
  ]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(() => {
    fetchHorseAssignments(true);
  }, [fetchHorseAssignments]);

  const handleGoBack = () => {
    router.back();
  };

  const formatDateTime = (dateTimeString: string) => {
    try {
      return moment(dateTimeString).format('MMM D, YYYY | h:mm A');
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateTimeString;
    }
  };

  const getStatusText = (assignment: HorseAssignment) => {
    const status = assignment.status || determineAssignmentStatus(assignment);
    
    switch (status) {
      case 'upcoming':
        return { text: "Upcoming", color: "#FFA500" };
      case 'active':
        return { text: "Active", color: "#28A745" };
      case 'completed':
        return { text: "Completed", color: "#6C757D" };
      default:
        return { text: "Unknown", color: "#6C757D" };
    }
  };

  // Simplified version that expects backend to return full URLs
  const getImageSourceSimple = (imageUrl: string | undefined) => {
    console.log("🖼️ getImageSourceSimple called with:", imageUrl);
    
    if (!imageUrl || imageUrl.trim() === '') {
      return { uri: 'https://via.placeholder.com/60x60/CD853F/ffffff?text=K' };
    }
    
    // If it's already a full URL, use it
    if (imageUrl.startsWith('http')) {
      return { uri: imageUrl };
    }
    
    // If it's a relative path, construct the full URL
    const supabaseUrl = "https://drgknejiqupegkyxfaab.supabase.co";
    
    // Check what type of image it is
    if (imageUrl.includes('kutsero_op_profile')) {
      // Horse operator profile image
      const filename = imageUrl.split('/').pop() || imageUrl;
      return { uri: `${supabaseUrl}/storage/v1/object/public/kutsero_op_profile/${filename}` };
    } else if (imageUrl.includes('kutsero_images')) {
      // Kutsero profile image
      const filename = imageUrl.split('/').pop() || imageUrl;
      return { uri: `${supabaseUrl}/storage/v1/object/public/kutsero_images/${filename}` };
    } else {
      // Generic - assume it's in kutsero_images
      return { uri: `${supabaseUrl}/storage/v1/object/public/kutsero_images/${imageUrl}` };
    }
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <FontAwesome5 name="user-tie" size={64} color="#CD853F" />
      </View>
      <Text style={styles.emptyStateTitle}>No Kutsero Assignments</Text>
      <Text style={styles.emptyStateText}>
        {horseName ? `No kutsero assignments found for ${horseName}` : "No kutsero assignments found for this horse"} at this time. 
        Horse assignments will appear here when they are created.
      </Text>
    </View>
  );

  // Set up notification response handling
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      if (data.type === 'new_horse_assignment' || data.type === 'active_horse_assignment' || data.type === 'horse_assignment_end') {
        console.log('Horse assignment notification tapped:', data);
        
        // Refresh assignments when notification is tapped
        fetchHorseAssignments(true);
      }
    });

    return () => subscription.remove();
  }, [fetchHorseAssignments]);

  // Initialize notification permissions
  useEffect(() => {
    requestNotificationPermissions();
  }, [requestNotificationPermissions]);

  // Check for notifications when assignments update
  useEffect(() => {
    if (assignments.length > 0 && !loading && !refreshing && isMounted.current) {
      console.log('🔄 Horse assignments updated, checking for notifications...');
      checkAndSendHorseAssignmentNotifications(assignments);
    }
  }, [assignments, loading, refreshing, checkAndSendHorseAssignmentNotifications]);

  // Initialize IDs on mount
  useEffect(() => {
    const initializeData = async () => {
      if (isMounted.current) {
        return;
      }

      setLoading(true);
      try {
        console.log('🚀 Initializing horse handling data...');
        
        const cachedAssignments = await loadAssignmentsFromCache();
        
        if (cachedAssignments) {
          console.log('📂 Using cached data');
          const assignmentsWithStatus = cachedAssignments.map(assign => ({
            ...assign,
            status: determineAssignmentStatus(assign)
          }));
          setAssignments(assignmentsWithStatus);
          
          // Set horse name
          if (params?.horseName) {
            setHorseName(params.horseName as string);
          } else if (cachedAssignments.length > 0 && cachedAssignments[0].horse_name) {
            setHorseName(cachedAssignments[0].horse_name);
          }
          
          setLoading(false);
          hasFetchedRef.current = true;
          
          setTimeout(async () => {
            if (isMounted.current) {
              await fetchHorseAssignments(true);
            }
          }, 1000);
        } else {
          console.log('📡 Fetching fresh data (no cache)');
          await fetchHorseAssignments(false);
        }
        
        isMounted.current = true;
      } catch (error) {
        console.error("❌ Error initializing data:", error);
        setLoading(false);
      }
    };

    initializeData();

    return () => {
      isMounted.current = false;
    };
  }, [fetchHorseAssignments, loadAssignmentsFromCache, determineAssignmentStatus, params?.horseName]);

  // Refresh assignments when screen is focused and IDs are available
  useFocusEffect(
    useCallback(() => {
      if (userId && horseId && hasFetchedRef.current && !isFetchingRef.current) {
        console.log("🎯 Horse handling screen focused - refreshing assignments...");
        fetchHorseAssignments(true);
      }
    }, [userId, horseId, fetchHorseAssignments])
  );

  if (loading && assignments.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <FontAwesome5 name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {horseName ? `${horseName}'s Handlers` : "Kutsero's Horse Handling"}
          </Text>
        </View>
        
        <View style={styles.loadingContainerFull}>
          <ActivityIndicator size="large" color="#CD853F" />
          <Text style={styles.loadingText}>Loading horse assignments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {horseName ? `${horseName}'s Handlers` : "Kutsero's Horse Handling"}
        </Text>
      </View>

      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#CD853F']}
            tintColor="#CD853F"
          />
        }
      >
        {assignments.length === 0 ? (
          <EmptyState />
        ) : (
          assignments.map((assignment, index) => {
            const status = getStatusText(assignment);
            const imageSource = getImageSourceSimple(assignment.kutsero_image);
            
            return (
              <View key={assignment.assign_id} style={[
                styles.assignmentCard,
                { marginBottom: index === assignments.length - 1 ? 100 : 16 }
              ]}>
                <View style={styles.cardHeader}>
                  <Image
                    source={imageSource}
                    style={styles.cardProfileImage}
                    defaultSource={{ uri: 'https://via.placeholder.com/60x60/CD853F/ffffff?text=K' }}
                  />
                  <View style={styles.cardContent}>
                    <Text style={styles.cardUserName}>
                      {assignment.kutsero_name || 'Unknown Kutsero'}
                    </Text>
                    <Text style={styles.cardHorseName}>
                      Horse: {assignment.horse_name || horseName || 'Unknown Horse'}
                    </Text>
                    <View style={styles.statusContainer}>
                      <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
                        <Text style={styles.statusText}>{status.text}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                
                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <FontAwesome5 name="play" size={12} color="#28A745" style={styles.detailIcon} />
                    <Text style={styles.cardDetailText}>
                      Start: {formatDateTime(assignment.date_start)}
                    </Text>
                  </View>
                  {assignment.date_end && (
                    <View style={styles.detailRow}>
                      <FontAwesome5 name="stop" size={12} color="#DC3545" style={styles.detailIcon} />
                      <Text style={styles.cardDetailText}>
                        End: {formatDateTime(assignment.date_end)}
                      </Text>
                    </View>
                  )}
                  {!assignment.date_end && (
                    <View style={styles.detailRow}>
                      <FontAwesome5 name="clock" size={12} color="#FFA500" style={styles.detailIcon} />
                      <Text style={[styles.cardDetailText, { fontStyle: 'italic', color: '#FFA500' }]}>
                        Ongoing assignment
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CD853F',
    paddingVertical: 15,
    paddingHorizontal: 20,
    paddingTop: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: -25,
  },
  backButton: {
    marginRight: 20,
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainerFull: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6C757D',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  assignmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F3F4',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardProfileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e0e0e0',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#E9ECEF',
  },
  cardContent: {
    flex: 1,
  },
  cardUserName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  cardHorseName: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 8,
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailIcon: {
    marginRight: 8,
    width: 12,
  },
  cardDetailText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    flex: 1,
  },
});

export default HorseHandlingScreen;