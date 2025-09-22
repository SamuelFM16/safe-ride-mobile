import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../components/Header';

const BACKEND_URL = "http://localhost:8001";

export default function EmergencyScreen() {
  const { user } = useAuth();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [emergencyButtonDisabled, setEmergencyButtonDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Emergency button animation
  const emergencyScale = useRef(new Animated.Value(1)).current;
  const pulseAnimation = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    initializeLocation();
    checkEmergencyState();
    
    return () => {
      if (pulseAnimation.current) {
        pulseAnimation.current.stop();
      }
    };
  }, []);

  const initializeLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão Negada', 'Precisamos da sua localização para funcionar.');
        return;
      }

      await Location.requestBackgroundPermissionsAsync();
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(currentLocation);
    } catch (error) {
      console.error('Error getting location:', error);
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

  const startPulseAnimation = () => {
    pulseAnimation.current = Animated.loop(
      Animated.sequence([
        Animated.timing(emergencyScale, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(emergencyScale, {
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
    emergencyScale.setValue(1);
  };

  const sendWhatsAppAlerts = async (contacts: string[], userLocation: Location.LocationObject) => {
    try {
      const locationUrl = `https://www.google.com/maps?q=${userLocation.coords.latitude},${userLocation.coords.longitude}`;
      const message = `🚨 EMERGÊNCIA - SafeRide 🚨\n\n${user?.name} (${user?.vehicle_plate}) está em uma situação de emergência!\n\n📍 Localização em tempo real:\n${locationUrl}\n\n⚠️ Entre em contato imediatamente ou acione as autoridades:\n🚨 190 - Polícia\n🚑 192 - SAMU\n🚒 193 - Bombeiros`;
      
      for (const contact of contacts) {
        let cleanNumber = contact.replace(/[^\d+]/g, '');
        
        if (!cleanNumber.startsWith('+')) {
          cleanNumber = cleanNumber.replace(/^0+/, '');
          if (cleanNumber.length === 11 && cleanNumber.startsWith('9')) {
            cleanNumber = `55${cleanNumber}`;
          } else if (cleanNumber.length === 10) {
            cleanNumber = `559${cleanNumber}`;
          }
        }
        
        const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
        
        try {
          const canOpen = await Linking.canOpenURL(whatsappUrl);
          if (canOpen) {
            await Linking.openURL(whatsappUrl);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (linkError) {
          console.error(`Error opening WhatsApp for ${contact}:`, linkError);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error sending WhatsApp alerts:', error);
      return false;
    }
  };

  const handleEmergency = async () => {
    if (!location || !user) {
      Alert.alert('Erro', 'Localização não disponível. Tente novamente.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    Alert.alert(
      'CONFIRMAR EMERGÊNCIA',
      'Você está em uma situação de emergência?\n\n✅ Sua localização será compartilhada\n✅ Contatos serão notificados via WhatsApp\n✅ Motoristas próximos receberão alerta',
      [
        { 
          text: 'Cancelar', 
          style: 'cancel',
          onPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        },
        {
          text: 'CONFIRMAR EMERGÊNCIA',
          style: 'destructive',
          onPress: activateEmergency,
        }
      ]
    );
  };

  const activateEmergency = async () => {
    try {
      setIsLoading(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;

      // Get user settings for emergency contacts
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

      // Create emergency
      const response = await fetch(`${BACKEND_URL}/api/emergency`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude: location!.coords.latitude,
          longitude: location!.coords.longitude,
        }),
      });

      if (response.ok) {
        setEmergencyButtonDisabled(true);
        await AsyncStorage.setItem('emergency_button_disabled', 'true');
        startPulseAnimation();
        
        // Send WhatsApp alerts
        if (emergencyContacts.length > 0) {
          await sendWhatsAppAlerts(emergencyContacts, location!);
        }
        
        Alert.alert(
          'Emergência Ativada ✅',
          emergencyContacts.length > 0 
            ? `Sua localização foi compartilhada e ${emergencyContacts.length} contatos foram notificados.\n\n🚨 190 - Polícia\n🚑 192 - SAMU\n🚒 193 - Bombeiros`
            : 'Sua localização foi compartilhada. Configure contatos de emergência nas configurações.\n\n🚨 190 - Polícia\n🚑 192 - SAMU\n🚒 193 - Bombeiros',
          [{ text: 'OK' }]
        );
      } else {
        const error = await response.json();
        Alert.alert('Erro', error.detail || 'Erro ao ativar emergência');
      }
    } catch (error) {
      console.error('Emergency error:', error);
      Alert.alert('Erro', 'Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  const cancelEmergency = async () => {
    Alert.alert(
      'Cancelar Emergência',
      'Tem certeza que deseja cancelar a emergência ativa?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, Cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('auth_token');
              if (!token) return;

              const response = await fetch(`${BACKEND_URL}/api/emergency/cancel`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                setEmergencyButtonDisabled(false);
                stopPulseAnimation();
                await AsyncStorage.removeItem('emergency_button_disabled');
                
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Emergência Cancelada', 'Status normalizado');
              }
            } catch (error) {
              console.error('Error canceling emergency:', error);
              Alert.alert('Erro', 'Não foi possível cancelar');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Sistema de Emergência</Text>
          <Text style={styles.subtitle}>
            Ativação rápida em situações de risco
          </Text>
        </View>

        {/* Main Emergency Button */}
        <View style={styles.emergencySection}>
          <TouchableOpacity
            style={[
              styles.mainEmergencyButton,
              emergencyButtonDisabled && styles.mainEmergencyButtonActive
            ]}
            onPress={emergencyButtonDisabled ? cancelEmergency : handleEmergency}
            onPressIn={() => {
              Animated.spring(emergencyScale, {
                toValue: 0.95,
                useNativeDriver: true,
              }).start();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }}
            onPressOut={() => {
              Animated.spring(emergencyScale, {
                toValue: 1,
                useNativeDriver: true,
              }).start();
            }}
            disabled={isLoading}
          >
            <Animated.View
              style={[
                styles.emergencyButtonContent,
                { transform: [{ scale: emergencyScale }] }
              ]}
            >
              <Ionicons 
                name={emergencyButtonDisabled ? "checkmark-circle" : "warning"} 
                size={60} 
                color="#fff" 
              />
              <Text style={styles.emergencyButtonText}>
                {emergencyButtonDisabled ? 'EMERGÊNCIA ATIVA' : 'EMERGÊNCIA'}
              </Text>
              {emergencyButtonDisabled && (
                <Text style={styles.emergencyButtonSubtext}>
                  Toque para cancelar
                </Text>
              )}
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Status Info */}
        <View style={styles.statusSection}>
          <View style={[
            styles.statusCard,
            emergencyButtonDisabled && styles.statusCardActive
          ]}>
            <Ionicons 
              name={emergencyButtonDisabled ? "checkmark-circle" : "information-circle"} 
              size={24} 
              color={emergencyButtonDisabled ? "#28A745" : "#007BFF"} 
            />
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>
                {emergencyButtonDisabled ? 'Emergência Ativa' : 'Pronto para Emergência'}
              </Text>
              <Text style={styles.statusDescription}>
                {emergencyButtonDisabled 
                  ? 'Sua localização está sendo compartilhada'
                  : 'Toque no botão em caso de emergência'
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>Como Funciona:</Text>
          
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="location" size={20} color="#FF3B30" />
            </View>
            <Text style={styles.featureText}>
              Localização compartilhada instantaneamente com motoristas próximos
            </Text>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            </View>
            <Text style={styles.featureText}>
              Contatos de emergência notificados via WhatsApp automaticamente
            </Text>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="people" size={20} color="#007BFF" />
            </View>
            <Text style={styles.featureText}>
              Outros motoristas próximos recebem alerta para ajuda
            </Text>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="call" size={20} color="#FF9800" />
            </View>
            <Text style={styles.featureText}>
              Acesso rápido para ligar para autoridades (190, 192, 193)
            </Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  emergencySection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  mainEmergencyButton: {
    backgroundColor: '#FF3B30',
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  mainEmergencyButtonActive: {
    backgroundColor: '#28A745',
    shadowColor: '#28A745',
  },
  emergencyButtonContent: {
    alignItems: 'center',
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    textAlign: 'center',
  },
  emergencyButtonSubtext: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  statusSection: {
    marginBottom: 32,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007BFF',
  },
  statusCardActive: {
    borderLeftColor: '#28A745',
    backgroundColor: '#1a4d2e',
  },
  statusInfo: {
    marginLeft: 16,
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
    color: '#ccc',
  },
  featuresSection: {
    backgroundColor: '#333',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
});