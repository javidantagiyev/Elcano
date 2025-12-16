import { Stack } from "expo-router";
import { UserProvider } from "../context/UserContext";
import NotificationInitializer from "../components/NotificationInitializer";
import { PermissionsProvider } from "../context/PermissionsContext";

export default function RootLayout() {
  return (
    <PermissionsProvider>
      <NotificationInitializer>
        <UserProvider>
          <Stack screenOptions={{ headerShown: false }}>
            {/* The Auth Group */}
            <Stack.Screen name="auth" />
            {/* The Main App Tabs */}
            <Stack.Screen name="(tabs)" />
          </Stack>
        </UserProvider>
      </NotificationInitializer>
    </PermissionsProvider>
  );
}