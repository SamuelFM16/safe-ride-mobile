import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import Toast from 'react-native-toast-message';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { login, register, isLoading } = useAuth();

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha email e senha');
      return;
    }

    if (!isLogin && (!name || !vehiclePlate)) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    let success = false;
    
    if (isLogin) {
      success = await login(email, password);
      if (success) {
        Toast.show({
          type: 'success',
          text1: 'Login realizado!',
          text2: 'Bem-vindo de volta ao SafeRide',
        });
        router.replace('/(tabs)/home');
      } else {
        Alert.alert('Erro', 'Email ou senha incorretos');
      }
    } else {
      success = await register(email, password, name, vehiclePlate);
      if (success) {
        Toast.show({
          type: 'success',
          text1: 'Cadastro realizado!',
          text2: 'Bem-vindo ao SafeRide',
        });
        router.replace('/(tabs)/home');
      } else {
        Alert.alert('Erro', 'Erro no cadastro. Verifique os dados.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="car-sport" size={48} color="#FF3B30" />
              <Text style={styles.title}>SafeRide</Text>
              <Text style={styles.subtitle}>Segurança para motoristas</Text>
            </View>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {/* Toggle Login/Register */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, isLogin && styles.toggleButtonActive]}
                onPress={() => setIsLogin(true)}
              >
                <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>
                  Entrar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, !isLogin && styles.toggleButtonActive]}
                onPress={() => setIsLogin(false)}
              >
                <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>
                  Cadastrar
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form Fields */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#666"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Senha"
                  placeholderTextColor="#666"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              {!isLogin && (
                <>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Nome completo"
                      placeholderTextColor="#666"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Ionicons name="car" size={20} color="#666" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Placa do veículo (ex: ABC1234)"
                      placeholderTextColor="#666"
                      value={vehiclePlate}
                      onChangeText={setVehiclePlate}
                      autoCapitalize="characters"
                      maxLength={8}
                    />
                  </View>
                </>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <Text style={styles.submitButtonText}>Carregando...</Text>
              ) : (
                <Text style={styles.submitButtonText}>
                  {isLogin ? 'Entrar' : 'Criar Conta'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Forgot Password */}
            {isLogin && (
              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={() => router.push('/forgot-password')}
              >
                <Text style={styles.forgotPasswordText}>
                  Esqueceu sua senha?
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Features Preview */}
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>Recursos do SafeRide:</Text>
            <View style={styles.featureItem}>
              <Ionicons name="warning" size={16} color="#FF3B30" />
              <Text style={styles.featureText}>Botão de emergência rápido</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="location" size={16} color="#FF3B30" />
              <Text style={styles.featureText}>Localização em tempo real</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
              <Text style={styles.featureText}>Alertas via WhatsApp</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="chatbubbles" size={16} color="#007BFF" />
              <Text style={styles.featureText}>Chat com motoristas próximos</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
  },
  formContainer: {
    marginBottom: 32,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#333',
    borderRadius: 12,
    marginBottom: 32,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#FF3B30',
  },
  toggleText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#fff',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  eyeIcon: {
    padding: 4,
  },
  submitButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  forgotPasswordButton: {
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: 16,
    color: '#007BFF',
    textDecorationLine: 'underline',
  },
  featuresContainer: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 20,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#ccc',
    marginLeft: 12,
  },
});