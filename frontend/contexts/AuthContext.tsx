import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  name: string;
  vehicle_plate: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string, vehiclePlate: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Use a fixed backend URL for now to avoid environment issues
const BACKEND_URL = "http://localhost:8001";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      const userData = await AsyncStorage.getItem('user_data');
      
      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        console.log('✅ User found in storage:', parsedUser.email);
      } else {
        console.log('⚠️ No auth data found in storage');
      }
    } catch (error) {
      console.error('❌ Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('🔄 Attempting login for:', email);
      console.log('🌐 Using backend URL:', BACKEND_URL);
      
      const response = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('📡 Login response status:', response.status);
      const data = await response.json();
      console.log('📄 Login response data:', data);

      if (response.ok) {
        await AsyncStorage.setItem('auth_token', data.access_token);
        await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
        setUser(data.user);
        console.log('✅ Login successful for:', data.user.email);
        return true;
      } else {
        console.log('❌ Login failed:', data.detail || 'Unknown error');
        throw new Error(data.detail || 'Erro na autenticação');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string, vehiclePlate: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('🔄 Attempting registration for:', email);
      console.log('🌐 Using backend URL:', BACKEND_URL);
      
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

      console.log('📡 Register response status:', response.status);
      const data = await response.json();
      console.log('📄 Register response data:', data);

      if (response.ok) {
        await AsyncStorage.setItem('auth_token', data.access_token);
        await AsyncStorage.setItem('user_data', JSON.stringify(data.user));
        setUser(data.user);
        console.log('✅ Registration successful for:', data.user.email);
        return true;
      } else {
        console.log('❌ Registration failed:', data.detail || 'Unknown error');
        throw new Error(data.detail || 'Erro no cadastro');
      }
    } catch (error) {
      console.error('❌ Register error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('🔄 Logging out user');
      await AsyncStorage.multiRemove([
        'auth_token', 
        'user_data', 
        'emergency_button_disabled', 
        'floating_mode'
      ]);
      setUser(null);
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}