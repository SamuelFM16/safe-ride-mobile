import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('teste@saferide.com');
  const [password, setPassword] = useState('123456');
  const [name, setName] = useState('Usuario Teste');
  const [vehiclePlate, setVehiclePlate] = useState('TEST123');
  const [debugInfo, setDebugInfo] = useState('');

  const { login, register, isLoading } = useAuth();

  const handleAuth = async () => {
    setDebugInfo('🔄 Iniciando autenticação...');
    
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha email e senha');
      return;
    }

    if (!isLogin && (!name || !vehiclePlate)) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    let success = false;
    
    try {
      if (isLogin) {
        setDebugInfo('🔄 Tentando fazer login...');
        success = await login(email, password);
        if (success) {
          setDebugInfo('✅ Login bem-sucedido! Redirecionando...');
          setTimeout(() => {
            router.replace('/(tabs)/home-simple');
          }, 1000);
        } else {
          setDebugInfo('❌ Login falhou - credenciais incorretas');
          Alert.alert('Erro', 'Email ou senha incorretos');
        }
      } else {
        setDebugInfo('🔄 Tentando registrar...');
        success = await register(email, password, name, vehiclePlate);
        if (success) {
          setDebugInfo('✅ Registro bem-sucedido! Redirecionando...');
          setTimeout(() => {
            router.replace('/(tabs)/home-simple');
          }, 1000);
        } else {
          setDebugInfo('❌ Registro falhou');
          Alert.alert('Erro', 'Erro no cadastro. Verifique os dados.');
        }
      }
    } catch (error) {
      setDebugInfo(`❌ Erro: ${error}`);
      Alert.alert('Erro', `Erro na autenticação: ${error}`);
    }
  };

  // Direct API test function
  const testDirectAPI = async () => {
    setDebugInfo('🔄 Testando API diretamente...');
    
    try {
      const response = await fetch('http://localhost:8001/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: 'teste@saferide.com', 
          password: '123456' 
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setDebugInfo(`✅ API Direct Test SUCCESS! Token: ${data.access_token.substring(0, 20)}...`);
      } else {
        setDebugInfo(`❌ API Direct Test FAILED: ${data.detail || 'Unknown error'}`);
      }
    } catch (error) {
      setDebugInfo(`❌ API Direct Test ERROR: ${error}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>SafeRide</Text>
        <Text style={styles.subtitle}>Segurança para motoristas</Text>
      </View>

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
      <View style={styles.formContainer}>
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

        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={true}
          autoCapitalize="none"
        />

        {!isLogin && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Nome completo"
              placeholderTextColor="#666"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <TextInput
              style={styles.input}
              placeholder="Placa do veículo (ex: ABC1234)"
              placeholderTextColor="#666"
              value={vehiclePlate}
              onChangeText={setVehiclePlate}
              autoCapitalize="characters"
              maxLength={8}
            />
          </>
        )}
      </View>

      {/* Buttons */}
      <TouchableOpacity
        style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
        onPress={handleAuth}
        disabled={isLoading}
      >
        <Text style={styles.submitButtonText}>
          {isLoading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Criar Conta')}
        </Text>
      </TouchableOpacity>

      {/* Direct API Test Button */}
      <TouchableOpacity
        style={styles.testButton}
        onPress={testDirectAPI}
      >
        <Text style={styles.testButtonText}>
          🧪 Testar API Diretamente
        </Text>
      </TouchableOpacity>

      {/* Debug Info */}
      <View style={styles.debugContainer}>
        <Text style={styles.debugTitle}>Debug Info:</Text>
        <Text style={styles.debugText}>
          {debugInfo || 'Nenhuma informação ainda...'}
        </Text>
        <Text style={styles.debugText}>
          Mode: {isLogin ? 'Login' : 'Register'}
        </Text>
        <Text style={styles.debugText}>
          Loading: {isLoading ? 'Yes' : 'No'}
        </Text>
      </View>

      {/* Features */}
      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>Recursos do SafeRide:</Text>
        <Text style={styles.featureText}>⚠️ Botão de emergência rápido</Text>
        <Text style={styles.featureText}>📍 Localização em tempo real</Text>
        <Text style={styles.featureText}>📱 Alertas via WhatsApp</Text>
        <Text style={styles.featureText}>💬 Chat com motoristas próximos</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#333',
    borderRadius: 8,
    marginBottom: 20,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 4,
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
  formContainer: {
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#555',
  },
  submitButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  testButton: {
    backgroundColor: '#007BFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  debugContainer: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  debugText: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 3,
  },
  featuresContainer: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 15,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  featureText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 5,
  },
});