// App.js
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { AlertProvider } from './contexts/AlertContext';
import AppNavigator from './navigation/AppNavigator';
import { setupNotificationHandler, setupAndroidNotificationChannels, requestNotificationPermissions } from './services/notificationService';
import { registerBackgroundFetchAsync } from './services/backgroundNotificationTask';

const initializeApp = async () => {
  const permissionsGranted = await requestNotificationPermissions();
  if (permissionsGranted) {
    setupNotificationHandler();
    await setupAndroidNotificationChannels();
    await registerBackgroundFetchAsync();
    console.log("App initialized: Permissions granted and background task registered.");
  }
};
const AppContent = () => {
  const { isDarkMode } = useTheme();
  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
};

export default function App() {

  useEffect(() => {
    const initializeApp = async () => {
      const permissionsGranted = await requestNotificationPermissions();
      setupNotificationHandler();
      await setupAndroidNotificationChannels();

      if (permissionsGranted) {
        await registerBackgroundFetchAsync();
        console.log('Background fetch task registered successfully.');
      } else {
        console.log("Notification permissions not granted, skipping background task registration.");
      }

      console.log('Notification services initialized.');
    };

    initializeApp();
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AlertProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </AlertProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}