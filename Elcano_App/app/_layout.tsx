import { Stack } from "expo-router";
import { UserProvider } from "../context/UserContext";

export default function RootLayout() {
  return (
    <UserProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {/* The Auth Group */}
        <Stack.Screen name="auth" /> 
        {/* The Main App Tabs */}
        <Stack.Screen name="(tabs)" /> 
      </Stack>
    </UserProvider>
  );
}