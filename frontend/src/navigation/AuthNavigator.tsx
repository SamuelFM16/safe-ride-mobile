import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AuthScreen from '../screens/AuthScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

const Stack = createStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#1a1a1a' },
      }}
    >
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPasswordScreen}
        options={{
          headerShown: true,
          title: 'Recuperar Senha',
          headerStyle: { backgroundColor: '#333' },
          headerTintColor: '#fff',
        }}
      />
    </Stack.Navigator>
  );
}