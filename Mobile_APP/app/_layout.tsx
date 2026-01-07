import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { getSession, Session } from "../utils/sessionManager";

export default function RootLayout() {
  const [loading, setLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState("auth/login");

  useEffect(() => {
    async function init() {
      try {
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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <Stack
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false, // hides header globally at root
      }}
    />
  );
}
