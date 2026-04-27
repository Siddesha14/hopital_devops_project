import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

export function LoginScreen({ navigation }) {
  const { login, isFirebaseConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [adminMode, setAdminMode] = useState(false);

  async function onSubmit() {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Enter email and password.');
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password, { adminOnly: adminMode || !isFirebaseConfigured });
    } catch (e) {
      const body = e.response?.data;
      const msg =
        body?.error ||
        body?.message ||
        e.message ||
        'Login failed';
      if (body?.code === 'NEEDS_REGISTRATION') {
        Alert.alert('Account needed', 'Sign up first, then sign in with Firebase.');
      } else {
        Alert.alert('Login failed', msg);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>HMS</Text>
          <Text style={styles.subtitle}>Hospital Management</Text>
        </View>
        <View style={styles.card}>
          {isFirebaseConfigured ? (
            <TouchableOpacity
              style={[styles.modeRow, adminMode && styles.modeRowActive]}
              onPress={() => setAdminMode(!adminMode)}
            >
              <Text style={styles.modeText}>
                {adminMode
                  ? 'Using server password login (admin / legacy)'
                  : 'Using Firebase sign-in (patients & doctors)'}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.hint}>
              Add your Firebase web config under app.json → extra.firebase, then restart Expo.
              Until then, sign-in uses the HMS server only.
            </Text>
          )}
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            value={email}
            onChangeText={setEmail}
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.muted}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            style={[styles.button, busy && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={busy}
          >
            <Text style={styles.buttonText}>{busy ? 'Signing in…' : 'Sign in'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.link}>Create an account</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primaryDark },
  flex: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { marginBottom: 24, alignItems: 'center' },
  logo: { fontSize: 40, fontWeight: '800', color: '#fff', letterSpacing: 2 },
  subtitle: { color: '#ccfbf1', marginTop: 4, fontSize: 16 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  hint: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 14,
    lineHeight: 18,
  },
  modeRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    backgroundColor: '#fafafa',
  },
  modeRowActive: { borderColor: colors.primary, backgroundColor: '#f0fdfa' },
  modeText: { fontSize: 13, color: colors.text, fontWeight: '600' },
  label: { fontSize: 13, color: colors.muted, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 14,
    backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { textAlign: 'center', marginTop: 16, color: colors.primary, fontWeight: '600' },
});
