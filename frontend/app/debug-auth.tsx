import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKEND_URL = "http://localhost:8001";

export default function DebugAuth() {
  const [email, setEmail] = useState('teste@saferide.com');
  const [password, setPassword] = useState('123456');
  const [name, setName] = useState('Usuario Teste');
  const [vehiclePlate, setVehiclePlate] = useState('TEST123');
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev, logMessage]);
    console.log(logMessage);
  };

  const testLogin = async () => {
    setLoading(true);
    addLog('🔄 Iniciando teste de login...');
    addLog(`📧 Email: ${email}`);
    addLog(`🔑 Password: ${password}`);
    addLog(`🌐 Backend URL: ${BACKEND_URL}`);

    try {
      const response = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      addLog(`📡 Response Status: ${response.status}`);
      
      const data = await response.json();
      addLog(`📄 Response Data: ${JSON.stringify(data, null, 2)}`);

      if (response.ok) {
        addLog('✅ LOGIN SUCCESSFUL!');
        Alert.alert('Sucesso!', 'Login funcionou!');
      } else {
        addLog('❌ LOGIN FAILED!');
        Alert.alert('Erro', data.detail || 'Login falhou');
      }
    } catch (error) {
      addLog(`❌ ERROR: ${error}`);
      Alert.alert('Erro', `Erro de conexão: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testRegister = async () => {
    setLoading(true);
    addLog('🔄 Iniciando teste de registro...');
    addLog(`📧 Email: ${email}`);
    addLog(`👤 Name: ${name}`);
    addLog(`🚗 Vehicle: ${vehiclePlate}`);

    try {
      const response = await fetch(`${BACKEND_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password, 
          name, 
          vehicle_plate: vehiclePlate 
        }),
      });

      addLog(`📡 Response Status: ${response.status}`);
      
      const data = await response.json();
      addLog(`📄 Response Data: ${JSON.stringify(data, null, 2)}`);

      if (response.ok) {
        addLog('✅ REGISTER SUCCESSFUL!');
        Alert.alert('Sucesso!', 'Registro funcionou!');
      } else {
        addLog('❌ REGISTER FAILED!');
        Alert.alert('Erro', data.detail || 'Registro falhou');
      }
    } catch (error) {
      addLog(`❌ ERROR: ${error}`);
      Alert.alert('Erro', `Erro de conexão: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>🔧 Debug Auth - SafeRide</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados de Teste</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <TextInput
            style={styles.input}
            placeholder="Nome"
            placeholderTextColor="#666"
            value={name}
            onChangeText={setName}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Placa do Veículo"
            placeholderTextColor="#666"
            value={vehiclePlate}
            onChangeText={setVehiclePlate}
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Testes</Text>
          
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={testLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Testando...' : '🔑 Testar Login'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.registerButton, loading && styles.buttonDisabled]}
            onPress={testRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Testando...' : '👤 Testar Registro'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.logsSection}>
          <View style={styles.logsHeader}>
            <Text style={styles.sectionTitle}>Logs de Debug</Text>
            <TouchableOpacity onPress={clearLogs} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Limpar</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.logsContainer}>
            {logs.map((log, index) => (
              <Text key={index} style={styles.logText}>
                {log}
              </Text>
            ))}
            {logs.length === 0 && (
              <Text style={styles.noLogsText}>
                Nenhum log ainda. Execute um teste!
              </Text>
            )}
          </ScrollView>
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
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007BFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  registerButton: {
    backgroundColor: '#28A745',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logsSection: {
    flex: 1,
    minHeight: 300,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logsContainer: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 15,
    maxHeight: 400,
  },
  logText: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  noLogsText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});