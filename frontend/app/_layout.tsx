import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { AuthProvider } from '../contexts/AuthContext';

function RootLayoutNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <StatusBar style="light" backgroundColor="#1a1a1a" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#333',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerShown: false,
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'SafeRide',
            headerShown: false 
          }} 
        />
        <Stack.Screen 
          name="(tabs)" 
          options={{ 
            headerShown: false 
          }} 
        />
        <Stack.Screen 
          name="auth" 
          options={{ 
            title: 'Entrar',
            headerShown: false,
            presentation: 'modal' 
          }} 
        />
        <Stack.Screen 
          name="debug-auth" 
          options={{ 
            title: 'Debug Auth',
            headerShown: true 
          }} 
        />
      </Stack>
      <Toast />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootLayoutNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}