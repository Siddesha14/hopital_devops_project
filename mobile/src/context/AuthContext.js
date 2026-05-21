import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { Platform } from 'react-native';
import { api, setStoredToken, getStoredToken } from '../api/client';
import { getFirebaseAuth, isFirebaseConfigured } from '../config/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function applySession(token) {
    await setStoredToken(token);
    const me = await api.get('/auth/me');
    setUser(me.data.user);
    setProfile(me.data.profile);
  }

  async function loadMe() {
    const token = await getStoredToken();
    if (!token) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      await applySession(token);
    } catch {
      await setStoredToken(null);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  /**
   * Password login against HMS API (seeded admin, or legacy accounts).
   */
  async function loginWithPassword(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    await setStoredToken(data.token);
    setUser(data.user);
    const me = await api.get('/auth/me');
    setProfile(me.data.profile);
    return data.user;
  }

  /**
   * Firebase email/password → HMS JWT via /auth/firebase-session.
   */
  async function loginWithFirebase(email, password) {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase is not configured in app.json');
    }
    await signInWithEmailAndPassword(auth, email.trim(), password);
    const idToken = await auth.currentUser?.getIdToken(true);
    if (!idToken) {
      throw new Error('Could not read Firebase session');
    }
    try {
      const { data } = await api.post('/auth/firebase-session', { idToken });
      await setStoredToken(data.token);
      setUser(data.user);
      const me = await api.get('/auth/me');
      setProfile(me.data.profile);
      return data.user;
    } catch (e) {
      await signOut(auth).catch(() => {});
      throw e;
    }
  }

  async function login(email, password, options = {}) {
    const { adminOnly = false } = options;
    if (Platform.OS === 'web') {
      return loginWithPassword(email, password);
    }
    if (adminOnly || !isFirebaseConfigured()) {
      return loginWithPassword(email, password);
    }
    try {
      return loginWithFirebase(email, password);
    } catch {
      // Firebase web auth can fail due to console-side config (provider/domain).
      // Fall back to backend password login so demos remain usable.
      return loginWithPassword(email, password);
    }
  }

  async function registerWithPassword(payload) {
    const { data } = await api.post('/auth/register', payload);
    await setStoredToken(data.token);
    setUser(data.user);
    const me = await api.get('/auth/me');
    setProfile(me.data.profile);
    return data.user;
  }

  async function registerWithFirebase(payload) {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase is not configured in app.json');
    }
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        payload.email.trim(),
        payload.password
      );
      const idToken = await cred.user.getIdToken();
      const { data } = await api.post('/auth/register-firebase', {
        idToken,
        role: payload.role,
        name: payload.name.trim(),
        phone: payload.phone || undefined,
        specialization: payload.role === 'doctor' ? payload.specialization : undefined,
        dateOfBirth: payload.role === 'patient' ? payload.dateOfBirth : undefined,
      });
      await setStoredToken(data.token);
      setUser(data.user);
      const me = await api.get('/auth/me');
      setProfile(me.data.profile);
      return data.user;
    } catch (e) {
      const auth = getFirebaseAuth();
      if (auth?.currentUser) {
        await auth.currentUser.delete().catch(() => {});
        await signOut(auth).catch(() => {});
      }
      throw e;
    }
  }

  async function register(payload) {
    if (Platform.OS === 'web') {
      return registerWithPassword(payload);
    }
    if (isFirebaseConfigured()) {
      try {
        return registerWithFirebase(payload);
      } catch {
        // If Firebase signup is blocked/misconfigured, continue with backend registration.
        return registerWithPassword(payload);
      }
    }
    return registerWithPassword(payload);
  }

  async function logout() {
    const auth = getFirebaseAuth();
    if (auth) {
      await signOut(auth).catch(() => {});
    }
    await setStoredToken(null);
    setUser(null);
    setProfile(null);
  }

  async function refreshProfile() {
    const me = await api.get('/auth/me');
    setUser(me.data.user);
    setProfile(me.data.profile);
  }

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      login,
      loginWithPassword,
      loginWithFirebase,
      register,
      logout,
      refreshProfile,
      isFirebaseConfigured: isFirebaseConfigured(),
    }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
