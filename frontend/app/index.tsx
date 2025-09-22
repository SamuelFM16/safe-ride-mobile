import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
  StatusBar,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Animated,
  Modal,
  PanResponder,
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { io, Socket } from 'socket.io-client';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';

const { width, height } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface User {
  id: string;
  email: string;
  name: string;
  vehicle_plate: string;
}

interface Emergency {
  id: string;
  user_name: string;
  vehicle_plate: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  created_at: string;
}

interface FloatingButtonPosition {
  x: number;
  y: number;
}

export default function Index() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [hasActiveEmergency, setHasActiveEmergency] = useState(false);
  const [emergencyButtonDisabled, setEmergencyButtonDisabled] = useState(false);
  const [showMainApp, setShowMainApp] = useState(true);
  const [floatingMode, setFloatingMode] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Floating button states
  const [buttonPosition, setButtonPosition] = useState<FloatingButtonPosition>({ x: width - 80, y: height / 2 });
  const translateX = useRef(new Animated.Value(width - 80)).current;
  const translateY = useRef(new Animated.Value(height / 2)).current;
  const scale = useRef(new Animated.Value(1)).current;

  // Create PanResponder for dragging functionality
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        // Scale up when touch starts
        Animated.spring(scale, {
          toValue: 1.1,
          useNativeDriver: false,
        }).start();
      },
      onPanResponderMove: (evt, gestureState) => {
        // Update position while dragging
        const newX = buttonPosition.x + gestureState.dx;
        const newY = buttonPosition.y + gestureState.dy;
        
        translateX.setValue(newX);
        translateY.setValue(newY);
      },
      onPanResponderRelease: (evt, gestureState) => {
        // Scale back to normal
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: false,
        }).start();

        // Calculate final position
        let newX = buttonPosition.x + gestureState.dx;
        let newY = buttonPosition.y + gestureState.dy;
        
        // Constrain to screen bounds
        const buttonSize = 60;
        newX = Math.max(20, Math.min(width - buttonSize - 20, newX));
        newY = Math.max(50, Math.min(height - buttonSize - 50, newY));

        // Snap to edges (left or right)
        if (newX < width / 2) {
          newX = 20; // Snap to left
        } else {
          newX = width - buttonSize - 20; // Snap to right
        }

        const newPosition = { x: newX, y: newY };
        setButtonPosition(newPosition);
        saveButtonPosition(newPosition);

        // Animate to final position
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: newX,
            useNativeDriver: false,
          }),
          Animated.spring(translateY, {
            toValue: newY,
            useNativeDriver: false,
          }),
        ]).start();
      },
    })
  ).current;

  // Auth form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');

  useEffect(() => {
    initializeApp();
    loadButtonPosition();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (user && location) {
      setupWebSocket();
      loadNearbyEmergencies();
      // Update location every 30 seconds
      const interval = setInterval(() => {
        getCurrentLocation();
        loadNearbyEmergencies();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user, location]);

  const loadButtonPosition = async () => {
    try {
      const savedPosition = await AsyncStorage.getItem('floating_button_position');
      if (savedPosition) {
        const position = JSON.parse(savedPosition);
        setButtonPosition(position);
        translateX.setValue(position.x);
        translateY.setValue(position.y);
      }
    } catch (error) {
      console.error('Error loading button position:', error);
    }
  };

  const saveButtonPosition = async (position: FloatingButtonPosition) => {
    try {
      await AsyncStorage.setItem('floating_button_position', JSON.stringify(position));
    } catch (error) {
      console.error('Error saving button position:', error);
    }
  };

  const initializeApp = async () => {
    try {
      // Check for stored token
      const token = await AsyncStorage.getItem('auth_token');
      const userData = await AsyncStorage.getItem('user_data');
      const emergencyState = await AsyncStorage.getItem('emergency_button_disabled');
      const floatingModeState = await AsyncStorage.getItem('floating_mode');
      
      if (emergencyState === 'true') {
        setEmergencyButtonDisabled(true);
      }

      if (floatingModeState === 'true') {
        setFloatingMode(true);
        setShowMainApp(false);
      }

      if (token && userData) {
        setUser(JSON.parse(userData));
        await requestLocationPermission();
      } else {
        setShowAuth(true);
      }
    } catch (error) {
      console.error('Error initializing app:', error);
      setShowAuth(true);
    } finally {
      setLoading(false);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão Negada', 'Precisamos da sua localização para funcionar corretamente.');
        return;
      }

      // Request background location permission
      const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
      
      await getCurrentLocation();
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(currentLocation);
      
      // Update location on server
      if (user) {
        await updateLocationOnServer(currentLocation);
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const updateLocationOnServer = async (currentLocation: Location.LocationObject) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;

      await fetch(`${BACKEND_URL}/api/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        }),
      });
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const setupWebSocket = () => {
    if (!socketRef.current) {
      socketRef.current = io(BACKEND_URL!);
      
      socketRef.current.on('emergency_alert', (data) => {
        if (location) {
          const distance = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            data.latitude,
            data.longitude
          );
          
          if (distance <= 10) {
            Toast.show({
              type: 'error',
              text1: 'EMERGÊNCIA PRÓXIMA!',
              text2: `${data.user_name} (${data.vehicle_plate}) precisa de ajuda!`,
              visibilityTime: 8000,
            });
            loadNearbyEmergencies();
          }
        }
      });

      socketRef.current.on('emergency_resolved', () => {
        loadNearbyEmergencies();
      });
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const loadNearbyEmergencies = async () => {
    try {
      if (!location || !user) return;

      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(
        `${BACKEND_URL}/api/emergencies/nearby?latitude=${location.coords.latitude}&longitude=${location.coords.longitude}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEmergencies(data);
      }
    } catch (error) {
      console.error('Error loading emergencies:', error);
    }
  };

  const handleAuth = async () => {
    try {
      setLoading(true);
      const endpoint = isLogin ? '/api/login' : '/api/register';
      const body = isLogin 
        ? { email, password }
        : { email, password, name, vehicle_plate: vehiclePlate };

      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('auth_token', data.access_token);
        await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
        setUser(data.user);
        setShowAuth(false);
        await requestLocationPermission();
        
        Toast.show({
          type: 'success',
          text1: isLogin ? 'Login realizado!' : 'Cadastro realizado!',
          text2: 'Bem-vindo ao SafeRide',
        });
      } else {
        Alert.alert('Erro', data.detail || 'Erro na autenticação');
      }
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert('Erro', 'Erro de conexão');
    } finally {
      setLoading(false);
    }
  };



  const sendWhatsAppAlerts = async (contacts: string[], userLocation: Location.LocationObject) => {
    try {
      const locationUrl = `https://www.google.com/maps?q=${userLocation.coords.latitude},${userLocation.coords.longitude}`;
      const message = `🚨 EMERGÊNCIA - SafeRide 🚨\n\n${user?.name} (${user?.vehicle_plate}) está em uma situação de emergência!\n\n📍 Localização em tempo real:\n${locationUrl}\n\n⚠️ Entre em contato imediatamente ou acione as autoridades:\n🚨 190 - Polícia\n🚑 192 - SAMU\n🚒 193 - Bombeiros`;
      
      // Send WhatsApp message to each contact
      for (const contact of contacts) {
        // Clean phone number (remove special characters, keep only digits and +)
        let cleanNumber = contact.replace(/[^\d+]/g, '');
        
        // If number doesn't start with +, assume it's a Brazilian number
        if (!cleanNumber.startsWith('+')) {
          // Remove leading zeros and add Brazil country code
          cleanNumber = cleanNumber.replace(/^0+/, '');
          if (cleanNumber.length === 11 && cleanNumber.startsWith('9')) {
            // Mobile number with 9 digit - add 55 (Brazil)
            cleanNumber = `55${cleanNumber}`;
          } else if (cleanNumber.length === 10) {
            // Add the 9 for mobile and Brazil code
            cleanNumber = `559${cleanNumber}`;
          }
        }
        
        // Create WhatsApp URL
        const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
        
        try {
          // Try to open WhatsApp
          const canOpen = await Linking.canOpenURL(whatsappUrl);
          if (canOpen) {
            await Linking.openURL(whatsappUrl);
            // Wait a bit between opening multiple contacts
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            console.log(`Cannot open WhatsApp for ${contact}`);
          }
        } catch (linkError) {
          console.error(`Error opening WhatsApp for ${contact}:`, linkError);
          // Fallback: Try opening WhatsApp Web
          const webWhatsappUrl = `https://web.whatsapp.com/send?phone=${cleanNumber}&text=${encodeURIComponent(message)}`;
          try {
            await Linking.openURL(webWhatsappUrl);
          } catch (webError) {
            console.error(`Error opening WhatsApp Web for ${contact}:`, webError);
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error sending WhatsApp alerts:', error);
      return false;
    }
  };

  const handleEmergency = async () => {
    try {
      if (!location || !user) return;

      Alert.alert(
        'CONFIRMAR EMERGÊNCIA',
        'Você está em uma situação de emergência? Sua localização será compartilhada com outros motoristas próximos e seus contatos de emergência receberão uma mensagem no WhatsApp.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'CONFIRMAR',
            style: 'destructive',
            onPress: async () => {
              const token = await AsyncStorage.getItem('auth_token');
              if (!token) return;

              // Get user settings to access emergency contacts
              const settingsResponse = await fetch(`${BACKEND_URL}/api/settings`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              let emergencyContacts: string[] = [];
              if (settingsResponse.ok) {
                const settings = await settingsResponse.json();
                emergencyContacts = settings.emergency_contacts || [];
              }

              const response = await fetch(`${BACKEND_URL}/api/emergency`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                }),
              });

              if (response.ok) {
                setHasActiveEmergency(true);
                setEmergencyButtonDisabled(true);
                await AsyncStorage.setItem('emergency_button_disabled', 'true');
                
                // Send WhatsApp alerts to emergency contacts
                if (emergencyContacts.length > 0) {
                  const whatsappSent = await sendWhatsAppAlerts(emergencyContacts, location);
                  
                  if (whatsappSent) {
                    Toast.show({
                      type: 'success',
                      text1: 'EMERGÊNCIA ATIVADA!',
                      text2: `Localização compartilhada + ${emergencyContacts.length} contatos notificados`,
                    });
                  } else {
                    Toast.show({
                      type: 'success',
                      text1: 'EMERGÊNCIA ATIVADA!',
                      text2: 'Localização compartilhada (erro no WhatsApp)',
                    });
                  }
                } else {
                  Toast.show({
                    type: 'success',
                    text1: 'EMERGÊNCIA ATIVADA!',
                    text2: 'Localização compartilhada',
                  });
                }
                
                Alert.alert(
                  'Emergência Ativada',
                  emergencyContacts.length > 0 
                    ? `Sua localização foi compartilhada com motoristas próximos e ${emergencyContacts.length} contatos de emergência foram notificados via WhatsApp.\n\n🚨 190 - Polícia Militar\n🚑 192 - SAMU\n🚒 193 - Bombeiros`
                    : 'Sua localização foi compartilhada com motoristas próximos. Configure contatos de emergência nas configurações.\n\n🚨 190 - Polícia Militar\n🚑 192 - SAMU\n🚒 193 - Bombeiros',
                  [{ text: 'OK' }]
                );
              } else {
                const error = await response.json();
                Alert.alert('Erro', error.detail || 'Erro ao ativar emergência');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Emergency error:', error);
      Alert.alert('Erro', 'Erro de conexão');
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['auth_token', 'user_data', 'emergency_button_disabled', 'floating_mode']);
    setUser(null);
    setShowAuth(true);
    setEmergencyButtonDisabled(false);
    setHasActiveEmergency(false);
    setFloatingMode(false);
    setShowMainApp(true);
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  const cancelActiveEmergency = async () => {
    try {
      Alert.alert(
        'Cancelar Emergência',
        'Tem certeza que deseja cancelar a emergência ativa? Outros motoristas não receberão mais alertas.',
        [
          { text: 'Não', style: 'cancel' },
          {
            text: 'Sim, Cancelar',
            style: 'destructive',
            onPress: async () => {
              const token = await AsyncStorage.getItem('auth_token');
              if (!token || !user) return;

              // Get user's active emergency ID first
              const emergenciesResponse = await fetch(
                `${BACKEND_URL}/api/emergencies/nearby?latitude=${location?.coords.latitude || 0}&longitude=${location?.coords.longitude || 0}`,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                }
              );

              if (emergenciesResponse.ok) {
                const emergencies = await emergenciesResponse.json();
                // Find user's own emergency (this will be filtered out from nearby, so we need to get all emergencies)
                
                // Alternative: call a specific endpoint to get user's active emergency
                const userEmergencyResponse = await fetch(`${BACKEND_URL}/api/user/active-emergency`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                });

                let emergencyId = null;
                if (userEmergencyResponse.ok) {
                  const userEmergency = await userEmergencyResponse.json();
                  emergencyId = userEmergency.id;
                } else {
                  // Fallback: try to cancel using a generic endpoint
                  const cancelResponse = await fetch(`${BACKEND_URL}/api/emergency/cancel`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`,
                    },
                  });

                  if (cancelResponse.ok) {
                    setHasActiveEmergency(false);
                    setEmergencyButtonDisabled(false);
                    await AsyncStorage.removeItem('emergency_button_disabled');
                    
                    Toast.show({
                      type: 'success',
                      text1: 'Emergência Cancelada',
                      text2: 'Sua emergência foi cancelada com sucesso',
                    });
                    return;
                  }
                }

                if (emergencyId) {
                  const cancelResponse = await fetch(`${BACKEND_URL}/api/emergency/${emergencyId}`, {
                    method: 'DELETE',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                    },
                  });

                  if (cancelResponse.ok) {
                    setHasActiveEmergency(false);
                    setEmergencyButtonDisabled(false);
                    await AsyncStorage.removeItem('emergency_button_disabled');
                    
                    Toast.show({
                      type: 'success',
                      text1: 'Emergência Cancelada',
                      text2: 'Sua emergência foi cancelada com sucesso',
                    });
                  } else {
                    throw new Error('Erro ao cancelar emergência');
                  }
                } else {
                  throw new Error('Emergência não encontrada');
                }
              } else {
                throw new Error('Erro ao buscar emergências');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error canceling emergency:', error);
      Alert.alert('Erro', 'Não foi possível cancelar a emergência. Tente novamente.');
    }
  };

  const reactivateEmergencyButton = async () => {
    setEmergencyButtonDisabled(false);
    await AsyncStorage.removeItem('emergency_button_disabled');
    Toast.show({
      type: 'info',
      text1: 'Botão de emergência reativado',
      text2: 'Você pode usar novamente se necessário',
    });
  };

  const enableFloatingMode = async () => {
    setFloatingMode(true);
    setShowMainApp(false);
    await AsyncStorage.setItem('floating_mode', 'true');
    
    Toast.show({
      type: 'info',
      text1: 'Modo Flutuante Ativado',
      text2: 'Botão ficará sempre visível',
    });
  };

  const disableFloatingMode = async () => {
    setFloatingMode(false);
    setShowMainApp(true);
    await AsyncStorage.removeItem('floating_mode');
    
    Toast.show({
      type: 'info',
      text1: 'Modo Flutuante Desativado',
      text2: 'Voltando ao app normal',
    });
  };

  const FloatingEmergencyButton = () => (
    <Animated.View
      style={[
        styles.floatingButton,
        {
          left: translateX,
          top: translateY,
          transform: [{ scale: scale }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {!emergencyButtonDisabled ? (
        <TouchableOpacity
          style={styles.floatingButtonTouch}
          onPress={handleEmergency}
          onLongPress={() => {
            Alert.alert(
              'SafeRide - Opções',
              'Escolha uma opção:',
              [
                { text: 'Abrir App Completo', onPress: () => setShowMainApp(true) },
                { text: 'Desativar Flutuante', onPress: disableFloatingMode },
                { text: 'Reposicionar', onPress: () => {} },
                { text: 'Cancelar', style: 'cancel' },
              ]
            );
          }}
        >
          <Ionicons name="warning" size={24} color="#fff" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.floatingButtonTouch, styles.floatingButtonDisabled]}
          onPress={() => {
            Alert.alert(
              'Emergência Ativa',
              'Sua emergência está ativa',
              [
                { text: 'Abrir App Completo', onPress: () => setShowMainApp(true) },
                { text: 'Cancelar Emergência', onPress: cancelActiveEmergency },
                { text: 'OK' },
              ]
            );
          }}
          onLongPress={() => {
            Alert.alert(
              'SafeRide - Emergência Ativa',
              'Sua emergência está ativa. O que deseja fazer?',
              [
                { text: 'Abrir App Completo', onPress: () => setShowMainApp(true) },
                { text: 'Cancelar Emergência', onPress: cancelActiveEmergency },
                { text: 'Desativar Flutuante', onPress: disableFloatingMode },
                { text: 'Cancelar', style: 'cancel' },
              ]
            );
          }}
        >
          <Ionicons name="checkmark" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  // Show floating button overlay when in floating mode
  if (floatingMode && !showMainApp) {
    return (
      <View style={styles.overlayContainer}>
        <FloatingEmergencyButton />
        <Toast />
      </View>
    );
  }

  if (showAuth) {
    return (
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
        <ScrollView contentContainerStyle={styles.authScrollContainer}>
          <Text style={styles.title}>🚗 SafeRide</Text>
          <Text style={styles.subtitle}>Segurança para motoristas</Text>
          
          <View style={styles.authContainer}>
            <View style={styles.authToggle}>
              <TouchableOpacity
                style={[styles.toggleButton, isLogin && styles.toggleButtonActive]}
                onPress={() => setIsLogin(true)}
              >
                <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>
                  Login
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, !isLogin && styles.toggleButtonActive]}
                onPress={() => setIsLogin(false)}
              >
                <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>
                  Cadastro
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Senha"
                placeholderTextColor="#666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              
              {!isLogin && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Nome completo"
                    placeholderTextColor="#666"
                    value={name}
                    onChangeText={setName}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Placa do veículo"
                    placeholderTextColor="#666"
                    value={vehiclePlate}
                    onChangeText={setVehiclePlate}
                    autoCapitalize="characters"
                  />
                </>
              )}
            </View>

            <TouchableOpacity style={styles.authButton} onPress={handleAuth}>
              <Text style={styles.authButtonText}>
                {isLogin ? 'Entrar' : 'Cadastrar'}
              </Text>
            </TouchableOpacity>

            {isLogin && (
              <TouchableOpacity 
                style={styles.forgotPasswordButton}
                onPress={() => router.push('/forgot-password')}
              >
                <Text style={styles.forgotPasswordText}>
                  Esqueceu sua senha?
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Show floating button overlay if in floating mode */}
      {floatingMode && <FloatingEmergencyButton />}
      
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SafeRide 🚗</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            onPress={() => router.push('/chat')} 
            style={styles.chatButton}
          >
            <Ionicons name="chatbubbles" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => router.push('/subscription')} 
            style={styles.subscriptionButton}
          >
            <Ionicons name="diamond" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => router.push('/settings')} 
            style={styles.settingsButton}
          >
            <Ionicons name="settings" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={enableFloatingMode} 
            style={styles.floatingModeButton}
          >
            <Ionicons name="layers" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* User info */}
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userPlate}>{user?.vehicle_plate}</Text>
        {location && (
          <Text style={styles.locationText}>
            📍 {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
          </Text>
        )}
      </View>

      {/* Main content */}
      <ScrollView style={styles.mainContent} contentContainerStyle={styles.mainContentContainer}>
        <Text style={styles.mainTitle}>Sistema de Emergência</Text>
        <Text style={styles.mainSubtitle}>
          Em caso de emergência, sua localização será compartilhada com outros motoristas num raio de 10km
        </Text>

        {/* Info about WhatsApp integration */}
        <View style={styles.whatsappInfo}>
          <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          <Text style={styles.whatsappInfoText}>
            Ao acionar uma emergência, seus contatos de confiança receberão uma mensagem no WhatsApp com sua localização em tempo real.
          </Text>
        </View>

        {/* Floating mode info */}
        <View style={styles.floatingModeInfo}>
          <Ionicons name="information-circle" size={20} color="#007BFF" />
          <Text style={styles.floatingModeInfoText}>
            Ative o modo flutuante para manter o botão sempre visível sobre outros apps
          </Text>
        </View>

        {/* Emergency button */}
        {!emergencyButtonDisabled ? (
          <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergency}>
            <Ionicons name="warning" size={40} color="#fff" />
            <Text style={styles.emergencyButtonText}>EMERGÊNCIA</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.emergencyDisabledContainer}>
            <Text style={styles.emergencyDisabledText}>
              ⚠️ Emergência foi acionada
            </Text>
            <Text style={styles.emergencyDisabledSubtext}>
              Sua localização está sendo compartilhada
            </Text>
            <TouchableOpacity
              style={styles.reactivateButton}
              onPress={reactivateEmergencyButton}
            >
              <Text style={styles.reactivateButtonText}>Reativar botão</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Emergencies list */}
        {emergencies.length > 0 && (
          <View style={styles.emergencyList}>
            <Text style={styles.emergencyListTitle}>
              🚨 Emergências próximas ({emergencies.length})
            </Text>
            {emergencies.map((emergency) => (
              <View key={emergency.id} style={styles.emergencyItem}>
                <View style={styles.emergencyHeader}>
                  <Text style={styles.emergencyItemName}>{emergency.user_name}</Text>
                  <Text style={styles.emergencyDistance}>{emergency.distance_km}km</Text>
                </View>
                <Text style={styles.emergencyItemDetails}>
                  🚗 {emergency.vehicle_plate}
                </Text>
                <Text style={styles.emergencyTime}>
                  {new Date(emergency.created_at).toLocaleTimeString()}
                </Text>
                <TouchableOpacity 
                  style={styles.helpButton}
                  onPress={() => Alert.alert(
                    'Acionar Autoridades',
                    'Ligue para as autoridades para ajudar:\n\n🚨 190 - Polícia Militar\n🚑 192 - SAMU\n🚒 193 - Bombeiros',
                    [{ text: 'OK' }]
                  )}
                >
                  <Text style={styles.helpButtonText}>Acionar 190</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    pointerEvents: 'box-none',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: height / 2,
  },
  authScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 50,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 50,
  },
  authContainer: {
    paddingHorizontal: 30,
  },
  authToggle: {
    flexDirection: 'row',
    backgroundColor: '#333',
    borderRadius: 8,
    marginBottom: 30,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#007BFF',
  },
  toggleText: {
    color: '#ccc',
    fontSize: 16,
  },
  toggleTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  authButton: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  authButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  forgotPasswordText: {
    color: '#007BFF',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 20,
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  chatButton: {
    padding: 8,
    backgroundColor: '#FF9800',
    borderRadius: 6,
  },
  subscriptionButton: {
    padding: 8,
    backgroundColor: '#9C27B0',
    borderRadius: 6,
  },
  settingsButton: {
    padding: 8,
    backgroundColor: '#28A745',
    borderRadius: 6,
  },
  floatingModeButton: {
    padding: 8,
    backgroundColor: '#007BFF',
    borderRadius: 6,
  },
  logoutButton: {
    padding: 8,
  },
  userInfo: {
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userPlate: {
    color: '#ccc',
    fontSize: 16,
    marginTop: 2,
  },
  locationText: {
    color: '#999',
    fontSize: 12,
    marginTop: 5,
  },
  mainContent: {
    flex: 1,
  },
  mainContentContainer: {
    padding: 20,
    alignItems: 'center',
  },
  mainTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  mainSubtitle: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  floatingModeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
    width: '100%',
  },
  floatingModeInfoText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  whatsappInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f4c3a',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
  },
  whatsappInfoText: {
    color: '#a8e6cf',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  emergencyButton: {
    backgroundColor: '#FF3B30',
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 5,
  },
  emergencyDisabledContainer: {
    backgroundColor: '#333',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 30,
    width: '100%',
  },
  emergencyDisabledText: {
    color: '#FF3B30',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  emergencyDisabledSubtext: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
  },
  reactivateButton: {
    backgroundColor: '#007BFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  reactivateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emergencyList: {
    width: '100%',
  },
  emergencyListTitle: {
    color: '#FF3B30',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  emergencyItem: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  emergencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  emergencyItemName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emergencyDistance: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emergencyItemDetails: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 5,
  },
  emergencyTime: {
    color: '#999',
    fontSize: 12,
    marginBottom: 10,
  },
  helpButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  helpButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Floating button styles
  floatingButton: {
    position: 'absolute',
    width: 60,
    height: 60,
    zIndex: 1000,
  },
  floatingButtonTouch: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  floatingButtonDisabled: {
    backgroundColor: '#666',
  },
});