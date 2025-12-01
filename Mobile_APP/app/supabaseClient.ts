import { createClient, SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

const SUPABASE_URL = "https://drgknejiqupegkyxfaab.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZ2tuZWppcXVwZWdreXhmYWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MDAxMTUsImV4cCI6MjA3MDQ3NjExNX0.KcIRm5t6z63X_KHGxDeU5ojwArVTasZWBzh01bD2nzo";

// ----------------- Create Supabase client -----------------
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { 
    params: { 
      eventsPerSecond: 10 
    } 
  },
  auth: { 
    persistSession: true, 
    autoRefreshToken: true 
  },
});

// ----------------- Presence tracking -----------------
export const setupPresence = async (
  userId: string,
  onPresenceSync?: (onlineUserIds: Set<string>) => void,
  onUserJoin?: (userId: string) => void,
  onUserLeave?: (userId: string) => void
): Promise<RealtimeChannel | null> => {
  if (!userId) {
    console.error('❌ No userId provided for presence tracking');
    return null;
  }

  // Normalize userId to string and remove any whitespace
  const normalizedUserId = String(userId).trim();
  console.log('🔄 Setting up presence for user:', normalizedUserId);

  // Create a channel with a unique name
  const channelName = 'online-users-global';
  const presenceChannel = supabase.channel(channelName);

  // Helper function to extract online user IDs from presence state
  const extractOnlineUsers = (state: any): Set<string> => {
    const onlineUserIds = new Set<string>();
    
    console.log('📊 Raw presence state:', JSON.stringify(state, null, 2));
    
    // Presence state structure: { [key]: [{ user_id, ... }] }
    Object.keys(state).forEach((key) => {
      const presences = state[key];
      if (Array.isArray(presences) && presences.length > 0) {
        // The key itself is the user_id
        const cleanKey = String(key).trim();
        onlineUserIds.add(cleanKey);
        console.log(`👤 Found online user: ${cleanKey}`);
        
        // Also check the presence payload for user_id
        presences.forEach((presence: any) => {
          if (presence.user_id) {
            const cleanPresenceId = String(presence.user_id).trim();
            onlineUserIds.add(cleanPresenceId);
            console.log(`👤 Found online user from payload: ${cleanPresenceId}`);
          }
        });
      }
    });
    
    console.log('✅ Total online users found:', onlineUserIds.size);
    return onlineUserIds;
  };

  // Set up presence event listeners
  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      console.log('🔄 Presence sync event triggered');
      
      const onlineUserIds = extractOnlineUsers(state);
      console.log('👥 Online users after sync:', Array.from(onlineUserIds));
      
      if (onPresenceSync) {
        onPresenceSync(onlineUserIds);
      }
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      const cleanKey = String(key).trim();
      console.log('✅ User joined:', cleanKey, 'Presences:', newPresences);
      
      if (onUserJoin && cleanKey !== normalizedUserId) {
        onUserJoin(cleanKey);
      }
      
      // Also check newPresences for user_id
      if (Array.isArray(newPresences)) {
        newPresences.forEach((presence: any) => {
          if (presence.user_id) {
            const cleanPresenceId = String(presence.user_id).trim();
            if (onUserJoin && cleanPresenceId !== normalizedUserId) {
              onUserJoin(cleanPresenceId);
            }
          }
        });
      }
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      const cleanKey = String(key).trim();
      console.log('❌ User left:', cleanKey, 'Presences:', leftPresences);
      
      if (onUserLeave && cleanKey !== normalizedUserId) {
        onUserLeave(cleanKey);
      }
    });

  // Subscribe to the channel
  const subscriptionStatus = await presenceChannel.subscribe(async (status) => {
    console.log('📡 Presence channel status:', status);
    
    if (status === 'SUBSCRIBED') {
      // Track the current user's presence
      const trackPayload = {
        user_id: normalizedUserId,
        online_at: new Date().toISOString(),
      };
      
      console.log('📤 Tracking presence with payload:', trackPayload);
      const trackStatus = await presenceChannel.track(trackPayload);
      
      console.log('✅ Presence tracking status:', trackStatus);
      
      // Wait a moment for initial sync, then get presence state
      setTimeout(() => {
        const initialState = presenceChannel.presenceState();
        console.log('📊 Initial presence state after subscribe:');
        
        const onlineUserIds = extractOnlineUsers(initialState);
        console.log('👥 Initial online users:', Array.from(onlineUserIds));
        
        if (onPresenceSync && onlineUserIds.size > 0) {
          onPresenceSync(onlineUserIds);
        }
      }, 1500); // Increased delay to 1.5 seconds
      
    } else if (status === 'CHANNEL_ERROR') {
      console.error('❌ Channel subscription error');
    } else if (status === 'TIMED_OUT') {
      console.error('❌ Channel subscription timed out');
    }
  });

  return presenceChannel;
};

// ----------------- Cleanup presence -----------------
export const cleanupPresence = async (channel: RealtimeChannel | null): Promise<void> => {
  if (!channel) {
    console.log('⚠️ No channel to cleanup');
    return;
  }

  try {
    console.log('🧹 Cleaning up presence channel...');
    
    // Untrack presence first
    await channel.untrack();
    console.log('✅ Untracked presence');
    
    // Unsubscribe from the channel
    await supabase.removeChannel(channel);
    console.log('✅ Removed channel');
    
  } catch (error) {
    console.error('❌ Error cleaning up presence:', error);
  }
};