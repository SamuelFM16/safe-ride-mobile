import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  RefreshControl,
  Alert,
  Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';

const { width } = Dimensions.get('window');

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
  const navigation = useNavigation();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    initializeLocation();
  }, []);

  const initializeLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão Negada', 'Precisamos da sua localização.');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(currentLocation);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await initializeLocation();
    // Carregar emergências próximas aqui
    setRefreshing(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleEmergencyPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    navigation.navigate('Emergency');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      
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
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0]}!</Text>
          <Text style={styles.subtitle}>Como você está hoje?</Text>
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

        {/* Emergency Quick Access */}
        <View style={styles.emergencySection}>
          <Text style={styles.sectionTitle}>Acesso Rápido</Text>
          <TouchableOpacity
            style={styles.emergencyButton}
            onPress={handleEmergencyPress}
            onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)}
          >
            <Ionicons name="warning" size={32} color="#fff" />
            <Text style={styles.emergencyButtonText}>EMERGÊNCIA</Text>
            <Text style={styles.emergencyButtonSubtext}>Toque para ativar</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Navegação</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: '#007BFF' }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('Map');
              }}
            >
              <Ionicons name="map" size={32} color="#fff" />
              <Text style={styles.actionText}>Mapa</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: '#FF9800' }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('Chat');
              }}
            >
              <Ionicons name="chatbubbles" size={32} color="#fff" />
              <Text style={styles.actionText}>Chat</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: '#28A745' }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('Settings');
              }}
            >
              <Ionicons name="settings" size={32} color="#fff" />
              <Text style={styles.actionText}>Config</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: '#666' }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                logout();
              }}
            >
              <Ionicons name="log-out" size={32} color="#fff" />
              <Text style={styles.actionText}>Sair</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Emergencies List */}
        {emergencies.length > 0 && (
          <View style={styles.emergenciesSection}>
            <Text style={styles.emergenciesTitle}>
              🚨 Emergências Próximas ({emergencies.length})
            </Text>
            {emergencies.map((emergency) => (
              <View key={emergency.id} style={styles.emergencyCard}>
                <View style={styles.emergencyHeader}>
                  <View style={styles.emergencyInfo}>
                    <Text style={styles.emergencyName}>{emergency.user_name}</Text>
                    <Text style={styles.emergencyDetails}>🚗 {emergency.vehicle_plate}</Text>
                  </View>
                  <Text style={styles.emergencyDistance}>{emergency.distance_km}km</Text>
                </View>
              </View>
            ))}
          </View>
        )}
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
    paddingBottom: 20,
  },
  welcomeSection: {
    marginBottom: 24,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
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
    marginBottom: 16,
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
  emergencyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  emergencyButtonSubtext: {
    color: '#fff',
    fontSize: 10,
    opacity: 0.8,
    marginTop: 2,
  },
  quickActions: {
    marginBottom: 24,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - 60) / 2,
    height: 100,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionText: {
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
  emergencyDistance: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
});