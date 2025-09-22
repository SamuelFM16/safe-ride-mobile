import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  Modal,
  PanResponder,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../contexts/AuthContext';

const { width, height } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface FloatingButtonPosition {
  x: number;
  y: number;
}

export default function EmergencyScreen() {
  const { user } = useAuth();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [emergencyButtonDisabled, setEmergencyButtonDisabled] = useState(false);
  const [floatingMode, setFloatingMode] = useState(false);
  const [showFloatingModal, setShowFloatingModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Floating button states
  const [buttonPosition, setButtonPosition] = useState<FloatingButtonPosition>({ 
    x: width - 100, 
    y: height / 2 
  });
  const translateX = useRef(new Animated.Value(width - 100)).current;
  const translateY = useRef(new Animated.Value(height / 2)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const pulseAnimation = useRef<Animated.CompositeAnimation | null>(null);

  // Emergency button animation
  const emergencyScale = useRef(new Animated.Value(1)).current;

  // PanResponder for floating button
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.spring(scale, {
          toValue: 1.1,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (evt, gestureState) => {
        const newX = buttonPosition.x + gestureState.dx;
        const newY = buttonPosition.y + gestureState.dy;
        
        translateX.setValue(newX);
        translateY.setValue(newY);
      },
      onPanResponderRelease: (evt, gestureState) => {
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();

        let newX = buttonPosition.x + gestureState.dx;
        let newY = buttonPosition.y + gestureState.dy;
        
        // Constrain to screen bounds
        const buttonSize = 80;
        newX = Math.max(20, Math.min(width - buttonSize - 20, newX));
        newY = Math.max(100, Math.min(height - buttonSize - 100, newY));

        // Snap to edges
        if (newX < width / 2) {
          newX = 20;
        } else {
          newX = width - buttonSize - 20;
        }

        const newPosition = { x: newX, y: newY };
        setButtonPosition(newPosition);
        saveButtonPosition(newPosition);

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

  useEffect(() => {
    initializeLocation();
    checkEmergencyState();
    loadButtonPosition();
    
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
      const floatingState = await AsyncStorage.getItem('floating_mode');
      
      if (emergencyState === 'true') {
        setEmergencyButtonDisabled(true);
        startPulseAnimation();
      }
      if (floatingState === 'true') {
        setFloatingMode(true);
      }
    } catch (error) {
      console.error('Error checking emergency state:', error);
    }
  };

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
          const whatsappSent = await sendWhatsAppAlerts(emergencyContacts, location!);
          
          Toast.show({
            type: 'success',
            text1: 'EMERGÊNCIA ATIVADA!',
            text2: `Localização compartilhada + ${emergencyContacts.length} contatos notificados`,
            visibilityTime: 5000,
          });
        } else {
          Toast.show({
            type: 'success',
            text1: 'EMERGÊNCIA ATIVADA!',
            text2: 'Configure contatos nas configurações',
            visibilityTime: 5000,
          });
        }
        
        Alert.alert(
          'Emergência Ativada ✅',
          emergencyContacts.length > 0 
            ? `Sua localização foi compartilhada e ${emergencyContacts.length} contatos foram notificados.\n\n🚨 190 - Polícia\n🚑 192 - SAMU\n🚒 193 - Bombeiros`
            : 'Sua localização foi compartilhada. Configure contatos de emergência.\n\n🚨 190 - Polícia\n🚑 192 - SAMU\n🚒 193 - Bombeiros',
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
                Toast.show({
                  type: 'success',
                  text1: 'Emergência Cancelada',
                  text2: 'Status normalizado',
                });
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

  const toggleFloatingMode = async () => {
    const newFloatingMode = !floatingMode;
    setFloatingMode(newFloatingMode);
    
    if (newFloatingMode) {
      await AsyncStorage.setItem('floating_mode', 'true');
      setShowFloatingModal(true);
    } else {
      await AsyncStorage.removeItem('floating_mode');
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Toast.show({
      type: 'info',
      text1: newFloatingMode ? 'Modo Flutuante Ativado' : 'Modo Flutuante Desativado',
      text2: newFloatingMode ? 'Botão sempre visível' : 'Voltando ao normal',
    });
  };

  const FloatingButton = () => (
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
      <TouchableOpacity
        style={[
          styles.floatingButtonTouch,
          emergencyButtonDisabled && styles.floatingButtonActive
        ]}
        onPress={emergencyButtonDisabled ? cancelEmergency : handleEmergency}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          setShowFloatingModal(true);
        }}
      >
        <Animated.View style={{ transform: [{ scale: emergencyScale }] }}>
          <Ionicons 
            name={emergencyButtonDisabled ? "checkmark-circle" : "warning"} 
            size={32} 
            color="#fff" 
          />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {floatingMode && <FloatingButton />}
      
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

        {/* Floating Mode Toggle */}
        <View style={styles.floatingSection}>
          <TouchableOpacity
            style={[styles.floatingToggle, floatingMode && styles.floatingToggleActive]}
            onPress={toggleFloatingMode}
          >
            <Ionicons 
              name="layers" 
              size={24} 
              color={floatingMode ? "#fff" : "#007BFF"} 
            />
            <View style={styles.floatingToggleContent}>
              <Text style={[
                styles.floatingToggleTitle,
                floatingMode && styles.floatingToggleTextActive
              ]}>
                Modo Flutuante
              </Text>
              <Text style={[
                styles.floatingToggleDescription,
                floatingMode && styles.floatingToggleTextActive
              ]}>
                {floatingMode ? 'Ativo - Botão sempre visível' : 'Manter botão sempre visível'}
              </Text>
            </View>
            <Ionicons 
              name={floatingMode ? "toggle" : "toggle-outline"} 
              size={32} 
              color={floatingMode ? "#28A745" : "#666"} 
            />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Floating Mode Modal */}
      <Modal
        visible={showFloatingModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFloatingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="information-circle" size={48} color="#007BFF" />
            <Text style={styles.modalTitle}>Modo Flutuante</Text>
            <Text style={styles.modalDescription}>
              O botão de emergência ficará sempre visível sobre outros aplicativos. 
              Você pode arrastá-lo para reposicionar.
            </Text>
            <Text style={styles.modalSubtext}>
              • Toque: Ativar emergência{'\n'}
              • Toque longo: Opções{'\n'}
              • Arrastar: Mover posição
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowFloatingModal(false)}
            >
              <Text style={styles.modalButtonText}>Entendi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  floatingSection: {
    marginBottom: 32,
  },
  floatingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 16,
    padding: 20,
  },
  floatingToggleActive: {
    backgroundColor: '#007BFF',
  },
  floatingToggleContent: {
    flex: 1,
    marginLeft: 16,
  },
  floatingToggleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  floatingToggleDescription: {
    fontSize: 14,
    color: '#ccc',
  },
  floatingToggleTextActive: {
    color: '#fff',
  },
  // Floating button styles
  floatingButton: {
    position: 'absolute',
    width: 80,
    height: 80,
    zIndex: 1000,
  },
  floatingButtonTouch: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  floatingButtonActive: {
    backgroundColor: '#28A745',
    shadowColor: '#28A745',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#333',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  modalSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#007BFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});