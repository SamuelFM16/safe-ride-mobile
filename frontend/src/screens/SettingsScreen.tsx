import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  Switch 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../components/Header';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationSharingEnabled, setLocationSharingEnabled] = useState(true);
  const [emergencyContactsCount] = useState(0);

  const handleLogout = () => {
    Alert.alert(
      'Sair do SafeRide',
      'Tem certeza que deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sair', 
          style: 'destructive',
          onPress: logout 
        }
      ]
    );
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showArrow = true, 
    rightElement 
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
    rightElement?: React.ReactNode;
  }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon as any} size={20} color="#FF3B30" />
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      
      {rightElement || (showArrow && (
        <Ionicons name="chevron-forward" size={20} color="#666" />
      ))}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      
      <ScrollView style={styles.scrollView}>
        {/* User Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Perfil</Text>
          
          <View style={styles.profileCard}>
            <View style={styles.profileInfo}>
              <View style={styles.avatarContainer}>
                <Ionicons name="person" size={32} color="#fff" />
              </View>
              <View style={styles.profileText}>
                <Text style={styles.profileName}>{user?.name}</Text>
                <Text style={styles.profileEmail}>{user?.email}</Text>
                <Text style={styles.profileVehicle}>🚗 {user?.vehicle_plate}</Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.editProfileButton}>
              <Text style={styles.editProfileText}>Editar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Emergency Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergência</Text>
          
          <SettingItem
            icon="people"
            title="Contatos de Emergência"
            subtitle={`${emergencyContactsCount} contatos configurados`}
            onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
          />
          
          <SettingItem
            icon="location"
            title="Compartilhar Localização"
            subtitle="Permite que outros motoristas vejam sua localização em emergências"
            showArrow={false}
            rightElement={
              <Switch
                value={locationSharingEnabled}
                onValueChange={setLocationSharingEnabled}
                trackColor={{ false: '#666', true: '#FF3B30' }}
                thumbColor="#fff"
              />
            }
          />
          
          <SettingItem
            icon="notifications"
            title="Notificações de Emergência"
            subtitle="Receber alertas de emergências próximas"
            showArrow={false}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#666', true: '#FF3B30' }}
                thumbColor="#fff"
              />
            }
          />
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aplicativo</Text>
          
          <SettingItem
            icon="shield-checkmark"
            title="Privacidade"
            subtitle="Gerenciar dados pessoais e privacidade"
            onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
          />
          
          <SettingItem
            icon="help-circle"
            title="Ajuda e Suporte"
            subtitle="FAQ, documentação e contato"
            onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
          />
          
          <SettingItem
            icon="information-circle"
            title="Sobre o SafeRide"
            subtitle="Versão 1.0.0"
            onPress={() => Alert.alert(
              'SafeRide v1.0.0',
              'Aplicativo de segurança para motoristas.\n\nDesenvolvido para ajudar motoristas em situações de emergência.',
              [{ text: 'OK' }]
            )}
          />
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={20} color="#fff" />
            <Text style={styles.logoutText}>Sair da Conta</Text>
          </TouchableOpacity>
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
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  profileCard: {
    backgroundColor: '#333',
    borderRadius: 16,
    padding: 20,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileEmail: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 4,
  },
  profileVehicle: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 2,
  },
  editProfileButton: {
    backgroundColor: '#007BFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  editProfileText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    lineHeight: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});