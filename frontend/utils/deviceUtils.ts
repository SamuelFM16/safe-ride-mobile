import * as Device from 'expo-device';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DeviceInfo {
  device_id: string;
  device_name: string;
  device_brand: string;
}

export const getDeviceInfo = async (): Promise<DeviceInfo> => {
  try {
    // Try to get stored device ID first
    let deviceId = await AsyncStorage.getItem('device_id');
    
    if (!deviceId) {
      // Generate new device ID if not exists
      deviceId = `${Device.brand}_${Device.modelName}_${Application.applicationId}_${Date.now()}`;
      await AsyncStorage.setItem('device_id', deviceId);
    }

    return {
      device_id: deviceId,
      device_name: Device.modelName || 'Unknown Device',
      device_brand: Device.brand || 'Unknown Brand'
    };
  } catch (error) {
    console.error('Error getting device info:', error);
    
    // Fallback device info
    const fallbackId = `fallback_${Date.now()}`;
    return {
      device_id: fallbackId,
      device_name: 'Unknown Device',
      device_brand: 'Unknown Brand'
    };
  }
};

export const checkDeviceBinding = async (deviceInfo: DeviceInfo): Promise<boolean> => {
  try {
    const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
    const token = await AsyncStorage.getItem('auth_token');
    
    if (!token) return false;

    const response = await fetch(
      `${BACKEND_URL}/api/subscription/check-device?device_id=${deviceInfo.device_id}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.device_bound;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking device binding:', error);
    return false;
  }
};

export const bindDeviceToSubscription = async (
  deviceInfo: DeviceInfo,
  subscriptionType: string,
  expiresAt: Date
): Promise<{ success: boolean; error?: string }> => {
  try {
    const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
    const token = await AsyncStorage.getItem('auth_token');
    
    if (!token) {
      return { success: false, error: 'No authentication token' };
    }

    const response = await fetch(`${BACKEND_URL}/api/subscription/bind-device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        device_id: deviceInfo.device_id,
        device_name: deviceInfo.device_name,
        device_brand: deviceInfo.device_brand,
        subscription_type: subscriptionType,
        expires_at: expiresAt.toISOString()
      }),
    });

    if (response.ok) {
      return { success: true };
    } else {
      const error = await response.json();
      return { success: false, error: error.detail };
    }
  } catch (error) {
    console.error('Error binding device:', error);
    return { success: false, error: 'Connection error' };
  }
};