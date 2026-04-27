import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

export function RegisterScreen({ navigation }) {
  const { register, isFirebaseConfigured } = useAuth();
  const [role, setRole] = useState('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (!email.trim() || !password || !name.trim()) {
      Alert.alert('Missing fields', 'Name, email, and password are required.');
      return;
    }
    setBusy(true);
    try {
      await register({
        email: email.trim(),
        password,
        role,
        name: name.trim(),
        phone: phone.trim() || undefined,
        specialization: role === 'doctor' ? specialization.trim() || undefined : undefined,
        dateOfBirth: role === 'patient' ? dateOfBirth.trim() || undefined : undefined,
      });
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'Registration failed';
      Alert.alert('Registration failed', msg);
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
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Create account</Text>
          {isFirebaseConfigured ? (
            <Text style={styles.hintFirebase}>
              Account is created in Firebase Auth, then linked to HMS (patient or doctor).
            </Text>
          ) : (
            <Text style={styles.hintFirebase}>
              Firebase is not configured — registering directly on the HMS server.
            </Text>
          )}
          <View style={styles.roleRow}>
            {['patient', 'doctor'].map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleChip, role === r && styles.roleChipActive]}
                onPress={() => setRole(r)}
              >
                <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
                  {r === 'patient' ? 'Patient' : 'Doctor'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Full name</Text>
          <TextInput
            style={styles.input}
            placeholder="Jane Doe"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
          />
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
            value={password}
            onChangeText={setPassword}
          />
          <Text style={styles.label}>Phone (optional)</Text>
          <TextInput
            style={styles.input}
            keyboardType="phone-pad"
            placeholder="+1 …"
            placeholderTextColor={colors.muted}
            value={phone}
            onChangeText={setPhone}
          />
          {role === 'doctor' ? (
            <>
              <Text style={styles.label}>Specialization (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Cardiology"
                placeholderTextColor={colors.muted}
                value={specialization}
                onChangeText={setSpecialization}
              />
            </>
          ) : (
            <>
              <Text style={styles.label}>Date of birth (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.muted}
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
              />
            </>
          )}
          <TouchableOpacity
            style={[styles.button, busy && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={busy}
          >
            <Text style={styles.buttonText}>{busy ? 'Creating…' : 'Register'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.link}>Back to sign in</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 16 },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  roleChip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
  },
  roleChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleText: { color: colors.muted, fontWeight: '600' },
  roleTextActive: { color: '#fff' },
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
    backgroundColor: '#fff',
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
  hintFirebase: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 14,
    lineHeight: 18,
  },
});
