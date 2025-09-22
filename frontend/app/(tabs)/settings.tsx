import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface UserSettings {
  emergency_contacts: string[];
  alert_distance_km: number;
}

export default function Settings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    emergency_contacts: [''],
    alert_distance_km: 10.0,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        router.replace('/');
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings({
          emergency_contacts: data.emergency_contacts.length > 0 ? data.emergency_contacts : [''],
          alert_distance_km: data.alert_distance_km,
        });
      } else {
        console.error('Failed to load settings');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      // Filter out empty contacts
      const validContacts = settings.emergency_contacts.filter(contact => contact.trim() !== '');
      
      if (validContacts.length === 0) {
        Alert.alert('Erro', 'Adicione pelo menos um contato de emergência');
        return;
      }

      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          emergency_contacts: validContacts,
          alert_distance_km: settings.alert_distance_km,
        }),
      });

      if (response.ok) {
        Toast.show({
          type: 'success',
          text1: 'Configurações Salvas',
          text2: 'Suas preferências foram atualizadas',
        });
        router.back();
      } else {
        const error = await response.json();
        Alert.alert('Erro', error.detail || 'Erro ao salvar configurações');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Erro', 'Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  const addContact = () => {
    if (settings.emergency_contacts.length < 5) {
      setSettings(prev => ({
        ...prev,
        emergency_contacts: [...prev.emergency_contacts, ''],
      }));
    } else {
      Alert.alert('Limite Atingido', 'Você pode adicionar no máximo 5 contatos');
    }
  };

  const removeContact = (index: number) => {
    if (settings.emergency_contacts.length > 1) {
      setSettings(prev => ({
        ...prev,
        emergency_contacts: prev.emergency_contacts.filter((_, i) => i !== index),
      }));
    }
  };

  const updateContact = (index: number, value: string) => {
    setSettings(prev => ({
      ...prev,
      emergency_contacts: prev.emergency_contacts.map((contact, i) => 
        i === index ? value : contact
      ),
    }));
  };

  const updateDistance = (value: number) => {
    setSettings(prev => ({
      ...prev,
      alert_distance_km: value,
    }));
  };

  const formatDistance = (km: number) => {
    if (km < 1) {
      return `${Math.round(km * 1000)}m`;
    } else {
      return `${km.toFixed(1)}km`;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Configurações</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurações</Text>
        <TouchableOpacity 
          onPress={saveSettings} 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Emergency Contacts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📞 Contatos de Emergência</Text>
          <Text style={styles.sectionDescription}>
            Adicione de 1 a 5 números de pessoas de sua confiança. Estes contatos serão notificados em caso de emergência.
          </Text>

          {settings.emergency_contacts.map((contact, index) => (
            <View key={index} style={styles.contactContainer}>
              <View style={styles.contactInputContainer}>
                <Text style={styles.contactLabel}>Contato {index + 1}</Text>
                <TextInput
                  style={styles.contactInput}
                  placeholder="(11) 99999-9999"
                  placeholderTextColor="#666"
                  value={contact}
                  onChangeText={(value) => updateContact(index, value)}
                  keyboardType="phone-pad"
                />
              </View>
              {settings.emergency_contacts.length > 1 && (
                <TouchableOpacity 
                  onPress={() => removeContact(index)}
                  style={styles.removeButton}
                >
                  <Ionicons name="trash" size={20} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </View>
          ))}

          {settings.emergency_contacts.length < 5 && (
            <TouchableOpacity onPress={addContact} style={styles.addContactButton}>
              <Ionicons name="add" size={20} color="#007BFF" />
              <Text style={styles.addContactText}>Adicionar Contato</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Alert Distance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📏 Distância do Alerta</Text>
          <Text style={styles.sectionDescription}>
            Defina o raio em que outros motoristas serão alertados sobre sua emergência.
          </Text>

          <View style={styles.distanceContainer}>
            <View style={styles.distanceHeader}>
              <Text style={styles.distanceLabel}>Raio de Alerta</Text>
              <Text style={styles.distanceValue}>
                {formatDistance(settings.alert_distance_km)}
              </Text>
            </View>

            <Slider
              style={styles.slider}
              minimumValue={0.001}
              maximumValue={10}
              value={settings.alert_distance_km}
              onValueChange={updateDistance}
              minimumTrackTintColor="#007BFF"
              maximumTrackTintColor="#666"
              step={0.1}
            />

            <View style={styles.distanceScale}>
              <Text style={styles.scaleText}>1m</Text>
              <Text style={styles.scaleText}>10km</Text>
            </View>
          </View>

          <View style={styles.distancePresets}>
            <Text style={styles.presetsTitle}>Distâncias Comuns:</Text>
            <View style={styles.presetButtons}>
              {[0.5, 1, 2, 5, 10].map((km) => (
                <TouchableOpacity
                  key={km}
                  style={[
                    styles.presetButton,
                    settings.alert_distance_km === km && styles.presetButtonActive
                  ]}
                  onPress={() => updateDistance(km)}
                >
                  <Text style={[
                    styles.presetButtonText,
                    settings.alert_distance_km === km && styles.presetButtonTextActive
                  ]}>
                    {formatDistance(km)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <Ionicons name="information-circle" size={20} color="#007BFF" />
            <Text style={styles.infoText}>
              Os contatos de emergência receberão uma notificação automática quando você acionar o botão de emergência.
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="location" size={20} color="#007BFF" />
            <Text style={styles.infoText}>
              Motoristas dentro do raio configurado receberão alertas sobre sua emergência e poderão prestar auxílio.
            </Text>
          </View>
        </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 20,
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#007BFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveButtonDisabled: {
    backgroundColor: '#666',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionDescription: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  contactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  contactInputContainer: {
    flex: 1,
  },
  contactLabel: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 5,
  },
  contactInput: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  removeButton: {
    marginLeft: 15,
    padding: 10,
  },
  addContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007BFF',
    borderStyle: 'dashed',
  },
  addContactText: {
    color: '#007BFF',
    fontSize: 16,
    marginLeft: 8,
  },
  distanceContainer: {
    backgroundColor: '#333',
    padding: 20,
    borderRadius: 10,
  },
  distanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  distanceLabel: {
    color: '#fff',
    fontSize: 16,
  },
  distanceValue: {
    color: '#007BFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  distanceScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  scaleText: {
    color: '#666',
    fontSize: 12,
  },
  distancePresets: {
    marginTop: 20,
  },
  presetsTitle: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 10,
  },
  presetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetButton: {
    backgroundColor: '#444',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  presetButtonActive: {
    backgroundColor: '#007BFF',
  },
  presetButtonText: {
    color: '#ccc',
    fontSize: 14,
  },
  presetButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  infoSection: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#333',
    borderRadius: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  infoText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
});