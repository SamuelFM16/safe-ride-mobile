import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { TamaguiProvider } from '@tamagui/core';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { AuthProvider } from '../contexts/AuthContext';
import config from '../tamagui.config';

export default function RootLayout() {
  const insets = useSafeAreaInsets();

  return (
    <TamaguiProvider config={config} defaultTheme="saferide_dark">
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
            headerShown: false, // We'll handle headers manually for better control
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
            name="forgot-password" 
            options={{ 
              title: 'Recuperar Senha',
              headerShown: true,
              presentation: 'modal' 
            }} 
          />
        </Stack>
        <Toast />
      </View>
    </TamaguiProvider>
  );
}