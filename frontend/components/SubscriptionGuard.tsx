import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export default function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const router = useRouter();
  const [subscription, setSubscription] = useState<any>(null);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const subscriptionData = await AsyncStorage.getItem('user_subscription');
      
      if (!subscriptionData) {
        // No subscription - redirect to subscription page
        setShowExpiredModal(true);
        setLoading(false);
        return;
      }

      const sub = JSON.parse(subscriptionData);
      setSubscription(sub);

      // Check if subscription is expired
      if (sub.expiresAt && new Date(sub.expiresAt) <= new Date()) {
        setShowExpiredModal(true);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setShowExpiredModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribeNow = () => {
    setShowExpiredModal(false);
    router.push('/subscription');
  };

  const isSubscriptionActive = () => {
    if (!subscription) return false;
    if (!subscription.expiresAt) return false;
    return new Date(subscription.expiresAt) > new Date();
  };

  const getDaysLeft = () => {
    if (!subscription?.expiresAt) return 0;
    const expiryDate = new Date(subscription.expiresAt);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Verificando assinatura...</Text>
      </View>
    );
  }

  return (
    <>
      {children}
      
      {/* Subscription Status Banner */}
      {subscription && subscription.type === 'trial' && (
        <View style={[
          styles.statusBanner,
          getDaysLeft() <= 2 ? styles.statusBannerWarning : styles.statusBannerInfo
        ]}>
          <Ionicons 
            name={getDaysLeft() <= 2 ? "warning" : "time"} 
            size={16} 
            color="#fff" 
          />
          <Text style={styles.statusBannerText}>
            Trial: {getDaysLeft()} dias restantes
          </Text>
          <TouchableOpacity onPress={handleSubscribeNow} style={styles.upgradeButton}>
            <Text style={styles.upgradeButtonText}>Assinar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Expired Subscription Modal */}
      <Modal
        visible={showExpiredModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="diamond" size={50} color="#9C27B0" />
            </View>
            
            <Text style={styles.modalTitle}>
              {subscription?.type === 'trial' ? 'Trial Expirado' : 'Assinatura Necessária'}
            </Text>
            
            <Text style={styles.modalDescription}>
              {subscription?.type === 'trial' 
                ? 'Seu trial de 7 dias expirou. Para continuar usando o SafeRide, assine nosso plano Premium por apenas R$ 4,99/mês.'
                : 'Para usar o SafeRide, você precisa iniciar um trial gratuito de 7 dias ou assinar nosso plano Premium.'
              }
            </Text>

            <View style={styles.modalFeatures}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.featureText}>5 contatos de emergência</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.featureText}>WhatsApp automático</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.featureText}>Botão flutuante</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.featureText}>Suporte 24/7</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.subscribeButton} onPress={handleSubscribeNow}>
              <Text style={styles.subscribeButtonText}>
                {subscription?.type === 'trial' ? 'Assinar Premium' : 'Iniciar Trial Gratuito'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.modalNote}>
              Apenas R$ 4,99/mês • Cancele quando quiser
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  statusBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingTop: 45,
    zIndex: 1000,
  },
  statusBannerInfo: {
    backgroundColor: 'rgba(33, 150, 243, 0.9)',
  },
  statusBannerWarning: {
    backgroundColor: 'rgba(255, 152, 0, 0.9)',
  },
  statusBannerText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  upgradeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  modalIcon: {
    marginBottom: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalDescription: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 25,
  },
  modalFeatures: {
    width: '100%',
    marginBottom: 25,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    color: '#ccc',
    fontSize: 16,
    marginLeft: 12,
  },
  subscribeButton: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalNote: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
});