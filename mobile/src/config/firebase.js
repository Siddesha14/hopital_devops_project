import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

function getFirebaseConfigObject() {
  return Constants.expoConfig?.extra?.firebase || {};
}

/** Web app config lives in app.json → expo.extra.firebase (same object as initializeApp). */
export function isFirebaseConfigured() {
  const c = getFirebaseConfigObject();
  return !!(c.apiKey && c.projectId);
}

let authInstance;

export function getFirebaseAuth() {
  if (!isFirebaseConfigured()) {
    return null;
  }
  if (authInstance) {
    return authInstance;
  }

  const c = getFirebaseConfigObject();
  const firebaseConfig = {
    apiKey: c.apiKey,
    authDomain: c.authDomain,
    projectId: c.projectId,
    storageBucket: c.storageBucket,
    messagingSenderId: c.messagingSenderId,
    appId: c.appId,
  };

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

  if (Platform.OS === 'web') {
    authInstance = getAuth(app);
  } else {
    try {
      authInstance = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch {
      authInstance = getAuth(app);
    }
  }

  return authInstance;
}
