import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function HomeSimple() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎉 SafeRide - Dashboard</Text>
      
      {user ? (
        <View style={styles.userInfo}>
          <Text style={styles.welcomeText}>
            Bem-vindo, {user.name}!
          </Text>
          <Text style={styles.emailText}>
            Email: {user.email}
          </Text>
          <Text style={styles.plateText}>
            Veículo: {user.vehicle_plate}
          </Text>
        </View>
      ) : (
        <Text style={styles.errorText}>
          Usuário não encontrado
        </Text>
      )}

      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.emergencyButton}>
          <Text style={styles.emergencyButtonText}>
            🚨 EMERGÊNCIA
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={logout}
        >
          <Text style={styles.logoutButtonText}>
            Sair
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.debugInfo}>
        <Text style={styles.debugTitle}>Debug Info:</Text>
        <Text style={styles.debugText}>
          User ID: {user?.id || 'N/A'}
        </Text>
        <Text style={styles.debugText}>
          Authenticated: {user ? 'Yes' : 'No'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
  },
  userInfo: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  emailText: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 5,
  },
  plateText: {
    fontSize: 16,
    color: '#ccc',
  },
  errorText: {
    fontSize: 18,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 30,
  },
  buttonsContainer: {
    marginBottom: 30,
  },
  emergencyButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 30,
    alignItems: 'center',
    marginBottom: 15,
  },
  emergencyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    backgroundColor: '#666',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  debugInfo: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 15,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  debugText: {
    fontSize: 12,
    color: '#ccc',
    marginBottom: 3,
  },
});