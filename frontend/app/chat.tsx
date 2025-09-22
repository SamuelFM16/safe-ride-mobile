import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { io, Socket } from 'socket.io-client';

const { width, height } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface ChatMessage {
  id: string;
  user_name: string;
  message: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  created_at: string;
  message_type: string;
  user_id: string;
}

interface User {
  id: string;
  name: string;
}

export default function Chat() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [alertDistance, setAlertDistance] = useState(10.0);
  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    initializeChat();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const initializeChat = async () => {
    try {
      // Get user data
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        router.replace('/');
        return;
      }
      
      const userObj = JSON.parse(userData);
      setUser(userObj);

      // Get location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão Negada', 'Precisamos da sua localização para o chat funcionar.');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(currentLocation);

      // Setup WebSocket
      setupWebSocket();

      // Load messages
      await loadMessages(currentLocation);

      // Get user alert distance
      await loadUserSettings();

    } catch (error) {
      console.error('Error initializing chat:', error);
      Alert.alert('Erro', 'Erro ao inicializar chat');
    } finally {
      setLoading(false);
    }
  };

  const loadUserSettings = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/api/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const settings = await response.json();
        setAlertDistance(settings.alert_distance_km || 10.0);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const setupWebSocket = () => {
    if (!socketRef.current) {
      socketRef.current = io(BACKEND_URL!);
      
      socketRef.current.on('new_chat_message', (data) => {
        if (location) {
          const distance = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            data.latitude,
            data.longitude
          );
          
          if (distance <= alertDistance) {
            const newMsg: ChatMessage = {
              id: data.message_id,
              user_name: data.user_name,
              message: data.message,
              latitude: data.latitude,
              longitude: data.longitude,
              distance_km: Math.round(distance * 100) / 100,
              created_at: data.created_at,
              message_type: data.message_type,
              user_id: 'other'
            };
            
            setMessages(prev => [newMsg, ...prev]);
          }
        }
      });

      socketRef.current.on('chat_message_deleted', (data) => {
        setMessages(prev => prev.filter(msg => msg.id !== data.message_id));
      });
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const loadMessages = async (currentLocation: Location.LocationObject) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(
        `${BACKEND_URL}/api/chat/nearby?latitude=${currentLocation.coords.latitude}&longitude=${currentLocation.coords.longitude}&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !location || !user) return;

    try {
      setSending(true);
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/api/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: newMessage.trim(),
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          message_type: 'text'
        }),
      });

      if (response.ok) {
        const sentMessage = await response.json();
        
        // Add message to local state
        const localMessage: ChatMessage = {
          id: sentMessage.id,
          user_name: user.name,
          message: sentMessage.message,
          latitude: sentMessage.latitude,
          longitude: sentMessage.longitude,
          distance_km: 0,
          created_at: sentMessage.created_at,
          message_type: sentMessage.message_type,
          user_id: user.id
        };
        
        setMessages(prev => [localMessage, ...prev]);
        setNewMessage('');
        
        // Scroll to top
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      } else {
        const error = await response.json();
        Alert.alert('Erro', error.detail || 'Erro ao enviar mensagem');
      }
    } catch (error) {
      console.error('Send message error:', error);
      Alert.alert('Erro', 'Erro de conexão');
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(`${BACKEND_URL}/api/chat/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        Toast.show({
          type: 'success',
          text1: 'Mensagem apagada',
        });
      }
    } catch (error) {
      console.error('Delete message error:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffHours * 60);
      return `${diffMinutes}min`;
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h`;
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwnMessage = item.user_id === user?.id;
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        <View style={styles.messageHeader}>
          <Text style={[
            styles.userName,
            isOwnMessage ? styles.ownUserName : styles.otherUserName
          ]}>
            {isOwnMessage ? 'Você' : item.user_name}
          </Text>
          <Text style={styles.messageTime}>
            {formatTime(item.created_at)} • {item.distance_km}km
          </Text>
        </View>
        
        <Text style={[
          styles.messageText,
          isOwnMessage ? styles.ownMessageText : styles.otherMessageText
        ]}>
          {item.message}
        </Text>
        
        {item.message_type === 'emergency' && (
          <View style={styles.emergencyBadge}>
            <Ionicons name="warning" size={12} color="#fff" />
            <Text style={styles.emergencyText}>EMERGÊNCIA</Text>
          </View>
        )}
        
        {isOwnMessage && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => Alert.alert(
              'Apagar Mensagem',
              'Tem certeza que deseja apagar esta mensagem?',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Apagar', style: 'destructive', onPress: () => deleteMessage(item.id) }
              ]
            )}
          >
            <Ionicons name="trash" size={12} color="#999" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat Motoristas</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando chat...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Chat Motoristas</Text>
          <Text style={styles.headerSubtitle}>
            Raio: {alertDistance}km • {messages.length} mensagens
          </Text>
        </View>
        <TouchableOpacity 
          onPress={() => location && loadMessages(location)} 
          style={styles.refreshButton}
        >
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        inverted
        showsVerticalScrollIndicator={false}
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Digite sua mensagem..."
          placeholderTextColor="#666"
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}
        >
          <Ionicons 
            name={sending ? "hourglass" : "send"} 
            size={20} 
            color={(!newMessage.trim() || sending) ? "#666" : "#fff"} 
          />
        </TouchableOpacity>
      </View>

      <Toast />
    </KeyboardAvoidingView>
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 2,
  },
  refreshButton: {
    padding: 5,
  },
  placeholder: {
    width: 34,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 20,
  },
  messageContainer: {
    marginBottom: 15,
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    position: 'relative',
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007BFF',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#333',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  userName: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  ownUserName: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherUserName: {
    color: '#4CAF50',
  },
  messageTime: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#fff',
  },
  emergencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  emergencyText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  deleteButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    padding: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#333',
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    color: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 20,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#007BFF',
    borderRadius: 20,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#444',
  },
});