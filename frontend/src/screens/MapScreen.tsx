import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';

export default function MapScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <View style={styles.content}>
        <Text style={styles.title}>🗺️ Mapa</Text>
        <Text style={styles.description}>
          Visualização de emergências próximas em desenvolvimento
        </Text>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Aqui será exibido o mapa com:
          </Text>
          <Text style={styles.featureText}>📍 Sua localização atual</Text>
          <Text style={styles.featureText}>🚨 Emergências próximas</Text>
          <Text style={styles.featureText}>🚗 Outros motoristas SafeRide</Text>
          <Text style={styles.featureText}>🗺️ Rotas seguras</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
  },
  placeholder: {
    backgroundColor: '#333',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  featureText: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
    textAlign: 'left',
    width: '100%',
  },
});