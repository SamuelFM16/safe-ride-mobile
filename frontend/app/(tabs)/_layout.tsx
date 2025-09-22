import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#333',
          borderTopColor: '#444',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#FF3B30',
        tabBarInactiveTintColor: '#999',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home-simple"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🏠</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="emergency"
        options={{
          title: 'Emergência',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🚨</Text>
          ),
        }}
      />
    </Tabs>
  );
}