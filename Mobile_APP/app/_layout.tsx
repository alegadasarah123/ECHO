// app/_layout.tsx
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import LoadingScreen from "./auth/loading"; // Import your loading screen
import { getSession, Session } from "../utils/sessionManager";

export default function RootLayout() {
  const [loading, setLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState("auth/login");

  useEffect(() => {
    async function init() {
      try {
        // Add a small delay to show the loading screen
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const session: Session | null = await getSession();

        if (session?.user_role) {
          const role = session.user_role.trim();
          if (role === "Kutsero") {
            setInitialRoute("KUTSERO/dashboard");
          } else if (role === "Horse Operator") {
            setInitialRoute("HORSE_OPERATOR/home");
          } else {
            setInitialRoute("auth/login");
          }
        } else {
          setInitialRoute("auth/login");
        }
      } catch (error) {
        console.error("Error getting session:", error);
        setInitialRoute("auth/login");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  // Show your loading screen while checking session
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Stack
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}