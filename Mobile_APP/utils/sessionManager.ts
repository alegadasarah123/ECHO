// utils/sessionManager.ts
import * as SecureStore from "expo-secure-store";

export interface Session {
  user_role: string;
  token?: string;
}

// Make getSession always return a Session object or null
export async function getSession(): Promise<Session | null> {
  const sessionString = await SecureStore.getItemAsync("userSession");
  if (!sessionString) return null;

  try {
    const session = JSON.parse(sessionString) as Session;
    return session;
  } catch (err) {
    console.warn("Failed to parse session:", err);
    return null;
  }
}
