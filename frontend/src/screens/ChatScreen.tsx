import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';

export default function ChatScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="chatbubbles" size={64} color="#FF9800" />
        </View>
        
        <Text style={styles.title}>💬 Chat SafeRide</Text>
        <Text style={styles.description}>
          Converse com outros motoristas próximos
        </Text>
        
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Em breve:</Text>
          
          <View style={styles.featureItem}>
            <Ionicons name="location" size={20} color="#FF9800" />
            <Text style={styles.featureText}>Chat baseado em localização</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="people" size={20} color="#FF9800" />
            <Text style={styles.featureText}>Grupos de motoristas por região</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="shield-checkmark" size={20} color="#FF9800" />
            <Text style={styles.featureText}>Sistema de moderação automática</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="notifications" size={20} color="#FF9800" />
            <Text style={styles.featureText}>Alertas de trânsito e emergências</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.comingSoonButton}>
          <Text style={styles.comingSoonText}>Em Desenvolvimento</Text>
        </TouchableOpacity>
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
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
  },
  featuresContainer: {
    backgroundColor: '#333',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    marginBottom: 32,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureText: {
    fontSize: 14,
    color: '#ccc',
    marginLeft: 12,
    flex: 1,
  },
  comingSoonButton: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  comingSoonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});