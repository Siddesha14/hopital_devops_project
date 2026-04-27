import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const TOKEN_KEY = '@hms_token';

function resolveBaseUrl() {
  const fromExtra = Constants.expoConfig?.extra?.apiUrl;
  if (fromExtra && String(fromExtra).trim()) {
    return String(fromExtra).trim();
  }
  // Browser (Expo web): API on same machine
  if (Platform.OS === 'web') {
    return __DEV__ ? 'http://localhost:3000' : 'http://localhost:3000';
  }
  if (__DEV__) {
    // Expo Go on a phone: hostUri is your PC's LAN IP (e.g. 192.168.1.10:8081).
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri && typeof hostUri === 'string') {
      const host = hostUri.split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return `http://${host}:3000`;
      }
    }
    return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
  }
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

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function setStoredToken(token) {
  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}

export async function getStoredToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}
