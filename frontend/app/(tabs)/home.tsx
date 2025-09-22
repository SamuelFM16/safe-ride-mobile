import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Emergency {
  id: string;
  user_name: string;
  vehicle_plate: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  created_at: string;
}

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [emergencyButtonDisabled, setEmergencyButtonDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  
  // Animation for emergency button
  const scaleValue = useRef(new Animated.Value(1)).current;
  const pulseAnimation = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    initializeLocation();
    checkEmergencyState();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (pulseAnimation.current) {
        pulseAnimation.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (location && user) {
      setupWebSocket();
      loadNearbyEmergencies();
    }
  }, [location, user]);

  const initializeLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão Negada', 'Precisamos da sua localização para funcionar corretamente.');
        return;
      }

      await Location.requestBackgroundPermissionsAsync();
      await getCurrentLocation();
    } catch (error) {
      console.error('Error requesting location permission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(currentLocation);
      
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

  const checkEmergencyState = async () => {
    try {
      const emergencyState = await AsyncStorage.getItem('emergency_button_disabled');
      if (emergencyState === 'true') {
        setEmergencyButtonDisabled(true);
        startPulseAnimation();
      }
    } catch (error) {
      console.error('Error checking emergency state:', error);
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
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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

  const startPulseAnimation = () => {
    pulseAnimation.current = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.current.start();
  };

  const stopPulseAnimation = () => {
    if (pulseAnimation.current) {
      pulseAnimation.current.stop();
    }
    scaleValue.setValue(1);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await getCurrentLocation();
    await loadNearbyEmergencies();
    setRefreshing(false);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="car-sport" size={48} color="#FF3B30" />
          <Text style={styles.loadingText}>Carregando localização...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF3B30']}
            tintColor="#FF3B30"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0]}</Text>
            <Text style={styles.headerSubtitle}>Como você está hoje?</Text>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={logout}
          >
            <Ionicons name="log-out" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.userCardContent}>
            <Ionicons name="car" size={24} color="#FF3B30" />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userPlate}>🚗 {user?.vehicle_plate}</Text>
              {location && (
                <Text style={styles.locationText}>
                  📍 {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Emergency Section */}
        <View style={styles.emergencySection}>
          <Text style={styles.sectionTitle}>Sistema de Emergência</Text>
          <Text style={styles.sectionDescription}>
            Em caso de emergência, sua localização será compartilhada instantaneamente
          </Text>

          {/* Emergency Button */}
          <View style={styles.emergencyButtonContainer}>
            {!emergencyButtonDisabled ? (
              <TouchableOpacity
                style={styles.emergencyButton}
                onPress={() => router.push('/(tabs)/emergency')}
                onPressIn={() => {
                  Animated.spring(scaleValue, {
                    toValue: 0.95,
                    useNativeDriver: true,
                  }).start();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                }}
                onPressOut={() => {
                  Animated.spring(scaleValue, {
                    toValue: 1,
                    useNativeDriver: true,
                  }).start();
                }}
              >
                <Animated.View
                  style={[
                    styles.emergencyButtonInner,
                    { transform: [{ scale: scaleValue }] }
                  ]}
                >
                  <Ionicons name="warning" size={48} color="#fff" />
                  <Text style={styles.emergencyButtonText}>EMERGÊNCIA</Text>
                </Animated.View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.emergencyButtonActive}
                onPress={() => router.push('/(tabs)/emergency')}
              >
                <Animated.View
                  style={[
                    styles.emergencyButtonInner,
                    { transform: [{ scale: scaleValue }] }
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={48} color="#fff" />
                  <Text style={styles.emergencyButtonText}>ATIVA</Text>
                </Animated.View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Emergencies Nearby */}
        {emergencies.length > 0 && (
          <View style={styles.emergenciesSection}>
            <Text style={styles.emergenciesTitle}>
              🚨 Emergências Próximas ({emergencies.length})
            </Text>
            {emergencies.map((emergency, index) => (
              <View key={emergency.id} style={styles.emergencyCard}>
                <View style={styles.emergencyHeader}>
                  <View style={styles.emergencyInfo}>
                    <Text style={styles.emergencyName}>{emergency.user_name}</Text>
                    <Text style={styles.emergencyDetails}>🚗 {emergency.vehicle_plate}</Text>
                    <Text style={styles.emergencyTime}>
                      {new Date(emergency.created_at).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.emergencyDistance}>
                    <Text style={styles.distanceText}>{emergency.distance_km}</Text>
                    <Text style={styles.distanceUnit}>km</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.helpButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    Alert.alert(
                      'Acionar Autoridades',
                      'Ligue para as autoridades para ajudar:\n\n🚨 190 - Polícia Militar\n🚑 192 - SAMU\n🚒 193 - Bombeiros',
                      [{ text: 'OK' }]
                    );
                  }}
                >
                  <Ionicons name="call" size={16} color="#fff" />
                  <Text style={styles.helpButtonText}>Acionar 190</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Acesso Rápido</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: '#FF9800' }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(tabs)/chat');
              }}
            >
              <Ionicons name="chatbubbles" size={32} color="#fff" />
              <Text style={styles.actionText}>Chat</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: '#28A745' }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(tabs)/settings');
              }}
            >
              <Ionicons name="settings" size={32} color="#fff" />
              <Text style={styles.actionText}>Configurações</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  userCard: {
    backgroundColor: '#333',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  userPlate: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  emergencySection: {
    backgroundColor: '#333',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emergencyButtonContainer: {
    alignItems: 'center',
  },
  emergencyButton: {
    backgroundColor: '#FF3B30',
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emergencyButtonActive: {
    backgroundColor: '#28A745',
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#28A745',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emergencyButtonInner: {
    alignItems: 'center',
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  emergenciesSection: {
    marginBottom: 24,
  },
  emergenciesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center',
  },
  emergencyCard: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  emergencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  emergencyInfo: {
    flex: 1,
  },
  emergencyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  emergencyDetails: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 4,
  },
  emergencyTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  emergencyDistance: {
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 50,
  },
  distanceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  distanceUnit: {
    fontSize: 10,
    color: '#fff',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  helpButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  quickActions: {
    marginBottom: 24,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionCard: {
    width: (width - 60) / 2,
    height: 100,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
});