import * as SecureStore from "expo-secure-store"

const API_BASE_URL = "http://10.0.0.79:8000"  // Update this to your server IP

// Function to refresh access token using refresh token
export const refreshAccessToken = async () => {
  try {
    const refreshToken = await SecureStore.getItemAsync("refresh_token")
    
    if (!refreshToken) {
      throw new Error("No refresh token available")
    }

    // Use your Supabase endpoint for token refresh
    const response = await fetch(`${API_BASE_URL.replace(':8000', '')}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": "your_supabase_anon_key", // Replace with your actual anon key
      },
      body: JSON.stringify({
        refresh_token: refreshToken
      })
    })

    const data = await response.json()

    if (response.ok && data.access_token) {
      // Store new tokens
      await SecureStore.setItemAsync("access_token", data.access_token)
      if (data.refresh_token) {
        await SecureStore.setItemAsync("refresh_token", data.refresh_token)
      }
      return data.access_token
    } else {
      throw new Error("Failed to refresh token")
    }
  } catch (error) {
    console.error("Token refresh failed:", error)
    // Clear invalid tokens
    await SecureStore.deleteItemAsync("access_token")
    await SecureStore.deleteItemAsync("refresh_token")
    throw error
  }
}

// Function to make authenticated API calls with automatic token refresh
export const authenticatedFetch = async (url, options = {}) => {
  try {
    let accessToken = await SecureStore.getItemAsync("access_token")
    
    if (!accessToken) {
      throw new Error("No access token available")
    }

    // First attempt with current token
    let response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    })

    // If unauthorized, try to refresh token
    if (response.status === 401) {
      console.log("Token expired, attempting refresh...")
      try {
        accessToken = await refreshAccessToken()
        
        // Retry request with new token
        response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          }
        })
      } catch (refreshError) {
        // If refresh fails, user needs to login again
        throw new Error("Session expired. Please login again.")
      }
    }

    return response
  } catch (error) {
    console.error("Authenticated fetch failed:", error)
    throw error
  }
}

// Function to logout and clear tokens
export const logout = async () => {
  try {
    await SecureStore.deleteItemAsync("access_token")
    await SecureStore.deleteItemAsync("refresh_token")
    console.log("Tokens cleared successfully")
  } catch (error) {
    console.error("Error clearing tokens:", error)
  }
}

// Function to check if user is logged in
export const isLoggedIn = async () => {
  try {
    const accessToken = await SecureStore.getItemAsync("access_token")
    return !!accessToken
  } catch (error) {
    console.error("Error checking login status:", error)
    return false
  }
}

// Function to get stored tokens (for debugging)
export const getStoredTokens = async () => {
  try {
    const accessToken = await SecureStore.getItemAsync("access_token")
    const refreshToken = await SecureStore.getItemAsync("refresh_token")
    
    return {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length || 0,
      refreshTokenLength: refreshToken?.length || 0
    }
  } catch (error) {
    console.error("Error getting stored tokens:", error)
    return null
  }
}