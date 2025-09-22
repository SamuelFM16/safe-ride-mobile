import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  highlighted?: boolean;
}

export default function Subscription() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userSubscription, setUserSubscription] = useState<any>(null);

  const plans: SubscriptionPlan[] = [
    {
      id: 'saferide_trial',
      name: 'Trial Gratuito',
      price: 'Gratuito',
      period: 'por 7 dias',
      features: [
        'Teste por 7 dias',
        'Todas as funcionalidades Premium',
        'Até 5 contatos de emergência',
        'Raio de alerta: até 10km',
        'WhatsApp automático',
        'Botão flutuante',
        'Após 7 dias: assinatura obrigatória'
      ]
    },
    {
      id: 'saferide_premium_monthly',
      name: 'Premium',
      price: 'R$ 4,99',
      period: 'por mês',
      highlighted: true,
      features: [
        'Até 5 contatos de emergência',
        'Raio de alerta: até 10km',
        'WhatsApp automático',
        'Botão flutuante',
        'Modo background',
        'Histórico de emergências',
        'Suporte prioritário 24/7',
        'Sem anúncios',
        'Acesso ilimitado'
      ]
    }
  ];

  useEffect(() => {
    loadUserSubscription();
  }, []);

  const loadUserSubscription = async () => {
    try {
      const subscription = await AsyncStorage.getItem('user_subscription');
      if (subscription) {
        setUserSubscription(JSON.parse(subscription));
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (planId === 'saferide_trial') {
      // Trial de 7 dias
      Alert.alert(
        'Iniciar Trial Gratuito',
        'Você terá acesso completo ao SafeRide Premium por 7 dias. Após esse período, será necessário assinar o plano mensal.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Iniciar Trial',
            onPress: async () => {
              await updateSubscription('trial', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 days
              Toast.show({
                type: 'success',
                text1: 'Trial Iniciado!',
                text2: '7 dias de acesso Premium gratuito',
              });
            }
          }
        ]
      );
      return;
    }

    try {
      setLoading(true);

      // Premium plan - this would integrate with payment providers
      Alert.alert(
        'Assinatura Premium',
        'Funcionalidade em desenvolvimento!\n\nPor enquanto, você pode ativar o Premium para teste.',
        [
          {
            text: 'Ativar Premium',
            onPress: async () => {
              await updateSubscription('premium', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // 30 days for testing
              Toast.show({
                type: 'success',
                text1: 'Premium Ativado!',
                text2: 'Acesso Premium ativo',
              });
            }
          },
          { text: 'Cancelar', style: 'cancel' }
        ]
      );

    } catch (error) {
      console.error('Subscription error:', error);
      Alert.alert('Erro', 'Erro ao processar assinatura');
    } finally {
      setLoading(false);
    }
  };

  const updateSubscription = async (type: string, expiresAt: Date | null) => {
    try {
      const subscription = {
        type,
        expiresAt: expiresAt?.toISOString(),
        activatedAt: new Date().toISOString()
      };

      await AsyncStorage.setItem('user_subscription', JSON.stringify(subscription));
      setUserSubscription(subscription);

      // Update on server
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        await fetch(`${BACKEND_URL}/api/subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(subscription),
        });
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
    }
  };

  const handleManageSubscription = () => {
    if (Platform.OS === 'android') {
      Linking.openURL('https://play.google.com/store/account/subscriptions');
    } else {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    }
  };

  const isSubscribed = userSubscription?.type === 'premium' && 
    new Date(userSubscription.expiresAt) > new Date();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Planos</Text>
        {isSubscribed && (
          <TouchableOpacity onPress={handleManageSubscription} style={styles.manageButton}>
            <Ionicons name="settings" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Status */}
        {userSubscription && (
          <View style={[
            styles.currentStatus,
            { backgroundColor: isSubscribed ? '#1f4c3a' : '#333' }
          ]}>
            <View style={styles.statusHeader}>
              <Ionicons 
                name={isSubscribed ? "checkmark-circle" : "time"} 
                size={24} 
                color={isSubscribed ? "#4CAF50" : "#FFA726"} 
              />
              <Text style={styles.statusTitle}>
                {isSubscribed ? 'Premium Ativo' : userSubscription.type === 'free' ? 'Plano Básico' : 'Premium Expirado'}
              </Text>
            </View>
            {isSubscribed && (
              <Text style={styles.statusExpire}>
                Expira em: {new Date(userSubscription.expiresAt).toLocaleDateString('pt-BR')}
              </Text>
            )}
          </View>
        )}

        {/* Plans */}
        <Text style={styles.sectionTitle}>Escolha seu plano</Text>
        
        {plans.map((plan) => (
          <View 
            key={plan.id} 
            style={[
              styles.planCard,
              plan.highlighted && styles.planCardHighlighted,
              userSubscription?.type === 'premium' && plan.id === 'saferide_premium_monthly' && styles.planCardActive
            ]}
          >
            {plan.highlighted && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>MAIS POPULAR</Text>
              </View>
            )}

            <View style={styles.planHeader}>
              <Text style={styles.planName}>{plan.name}</Text>
              <View style={styles.planPricing}>
                <Text style={styles.planPrice}>{plan.price}</Text>
                <Text style={styles.planPeriod}>{plan.period}</Text>
              </View>
            </View>

            <View style={styles.planFeatures}>
              {plan.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons name="checkmark" size={16} color="#4CAF50" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.subscribeButton,
                plan.highlighted && styles.subscribeButtonHighlighted,
                userSubscription?.type === 'premium' && plan.id === 'saferide_premium_monthly' && styles.subscribeButtonActive,
                loading && styles.subscribeButtonDisabled
              ]}
              onPress={() => handleSubscribe(plan.id)}
              disabled={loading || (userSubscription?.type === 'premium' && plan.id === 'saferide_premium_monthly')}
            >
              <Text style={[
                styles.subscribeButtonText,
                plan.highlighted && styles.subscribeButtonTextHighlighted
              ]}>
                {userSubscription?.type === 'premium' && plan.id === 'saferide_premium_monthly' 
                  ? 'Plano Atual' 
                  : userSubscription?.type === 'trial' && plan.id === 'saferide_trial'
                    ? 'Trial Ativo'
                    : plan.id === 'saferide_trial' 
                      ? 'Iniciar Trial Gratuito' 
                      : 'Assinar Premium'
                }
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>Por que escolher o Premium?</Text>
          
          <View style={styles.benefitItem}>
            <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Máxima Segurança</Text>
              <Text style={styles.benefitDescription}>
                5 contatos de emergência + WhatsApp automático + raio de 10km
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Ionicons name="layers" size={24} color="#2196F3" />
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Botão Flutuante</Text>
              <Text style={styles.benefitDescription}>
                Acesso rápido sobre qualquer app, reposicionável e sempre visível
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <Ionicons name="headset" size={24} color="#FF9800" />
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Suporte 24/7</Text>
              <Text style={styles.benefitDescription}>
                Atendimento prioritário e suporte técnico especializado
              </Text>
            </View>
          </View>
        </View>

        {/* FAQ */}
        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Perguntas Frequentes</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Posso cancelar a qualquer momento?</Text>
            <Text style={styles.faqAnswer}>
              Sim! Você pode cancelar sua assinatura quando quiser sem multas.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Os dados ficam seguros?</Text>
            <Text style={styles.faqAnswer}>
              Totalmente! Usamos criptografia e seus dados só são compartilhados em emergências.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Funciona em todos os celulares?</Text>
            <Text style={styles.faqAnswer}>
              Sim! Compatible com Android 7.0+ e iOS 13.0+.
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpace} />
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
  manageButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  currentStatus: {
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  statusTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  statusExpire: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 34,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  planCard: {
    backgroundColor: '#333',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  planCardHighlighted: {
    borderColor: '#4CAF50',
    backgroundColor: '#2a2a2a',
  },
  planCardActive: {
    borderColor: '#2196F3',
    backgroundColor: '#1a3a5c',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    left: 20,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
  },
  popularText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  planName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  planPricing: {
    alignItems: 'center',
  },
  planPrice: {
    color: '#4CAF50',
    fontSize: 32,
    fontWeight: 'bold',
  },
  planPeriod: {
    color: '#ccc',
    fontSize: 14,
  },
  planFeatures: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureText: {
    color: '#ccc',
    fontSize: 16,
    marginLeft: 10,
    flex: 1,
  },
  subscribeButton: {
    backgroundColor: '#666',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  subscribeButtonHighlighted: {
    backgroundColor: '#4CAF50',
  },
  subscribeButtonActive: {
    backgroundColor: '#2196F3',
  },
  subscribeButtonDisabled: {
    backgroundColor: '#444',
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subscribeButtonTextHighlighted: {
    color: '#fff',
  },
  benefitsSection: {
    marginTop: 30,
    marginBottom: 30,
  },
  benefitsTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 10,
  },
  benefitContent: {
    marginLeft: 15,
    flex: 1,
  },
  benefitTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  benefitDescription: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  faqSection: {
    marginBottom: 30,
  },
  faqTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  faqItem: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  faqQuestion: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  faqAnswer: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  bottomSpace: {
    height: 30,
  },
});