import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const TOKEN_KEY = '@hms_token';

function resolveBaseUrl() {
  // 1. Allow override from Expo config (optional)
  const fromExtra = Constants.expoConfig?.extra?.apiUrl;
  if (fromExtra && String(fromExtra).trim()) {
    return String(fromExtra).trim();
  }

  // 2. Allow Expo public env override for Docker/web deployments.
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && String(fromEnv).trim()) {
    return String(fromEnv).trim();
  }

  // 3. 🌐 WEB (Browser)
  // Browser cannot resolve Docker service names like "hms-backend".
  if (Platform.OS === 'web') {
    return 'http://localhost:3000';
  }

  // 4. 📱 Development (mobile / emulator)
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;

    if (hostUri && typeof hostUri === 'string') {
      const host = hostUri.split(':')[0];

      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return `http://${host}:3000`;
      }
    }

    // Android emulator special case
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000';
    }

    return 'http://localhost:3000';
  }

  // 5. Production fallback
  return 'http://localhost:3000';
}

const baseURL = resolveBaseUrl();

if (__DEV__) {
  console.log('[HMS] API base URL:', baseURL);
}

export const api = axios.create({
  baseURL,
  timeout: 20000,
});

// Attach token automatically
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Store token
export async function setStoredToken(token) {
  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}

// Get token
export async function getStoredToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}