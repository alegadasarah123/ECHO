// src/utils/initSupabase.js
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const SUPABASE_URL = Constants.expoConfig.extra.SUPABASE_URL;
const SUPABASE_ANON_KEY = Constants.expoConfig.extra.SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Call this function on app startup to ensure clean session
 */
export async function initSession() {
  try {
    // Sign out any previous session
    await supabase.auth.signOut();

    // Optionally, check current session
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) console.log('Error fetching session:', error.message);

    if (!session) {
      console.log('No active session found. Ready for new login.');
    }
  } catch (err) {
    console.log('Session init error:', err.message);
  }
}
