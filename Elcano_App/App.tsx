import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./navigation/AppNavigator";
import NotificationInitializer from "./components/NotificationInitializer";
import { UserProvider } from "./context/UserContext";
import { PermissionsProvider } from "./context/PermissionsContext";

export default function App() {
  return (
    <PermissionsProvider>
      <NotificationInitializer>
        <UserProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </UserProvider>
      </NotificationInitializer>
    </PermissionsProvider>
  );
}
