import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { colors } from '../theme';

export function ProfileScreen() {
  const { user, profile, logout, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [extra, setExtra] = useState(
    user?.role === 'doctor' ? profile?.specialization || '' : profile?.date_of_birth || ''
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(profile?.name || '');
    setPhone(profile?.phone || '');
    setExtra(
      user?.role === 'doctor' ? profile?.specialization || '' : profile?.date_of_birth || ''
    );
  }, [profile, user?.role]);

  async function save() {
    setBusy(true);
    try {
      if (user?.role === 'patient') {
        await api.patch('/patients/me', {
          name: name.trim() || undefined,
          phone: phone.trim() || undefined,
          dateOfBirth: extra.trim() || undefined,
        });
      } else if (user?.role === 'doctor') {
        await api.patch('/doctors/me', {
          name: name.trim() || undefined,
          phone: phone.trim() || undefined,
          specialization: extra.trim() || undefined,
        });
      }
      await refreshProfile();
      Alert.alert('Saved', 'Profile updated.');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.email}>{user?.email}</Text>
      <Text style={styles.role}>{user?.role}</Text>

      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Full name"
        placeholderTextColor={colors.muted}
      />
      <Text style={styles.label}>Phone</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="Phone"
        placeholderTextColor={colors.muted}
        keyboardType="phone-pad"
      />
      {user?.role === 'doctor' ? (
        <>
          <Text style={styles.label}>Specialization</Text>
          <TextInput
            style={styles.input}
            value={extra}
            onChangeText={setExtra}
            placeholder="e.g. Internal medicine"
            placeholderTextColor={colors.muted}
          />
        </>
      ) : (
        <>
          <Text style={styles.label}>Date of birth</Text>
          <TextInput
            style={styles.input}
            value={extra}
            onChangeText={setExtra}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.muted}
          />
        </>
      )}

      <TouchableOpacity style={[styles.primary, busy && styles.disabled]} onPress={save} disabled={busy}>
        <Text style={styles.primaryText}>{busy ? 'Saving…' : 'Save profile'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logout} onPress={() => logout()}>
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  email: { fontSize: 18, fontWeight: '800', color: colors.text },
  role: { color: colors.muted, textTransform: 'capitalize', marginBottom: 16 },
  label: { fontSize: 13, color: colors.muted, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: '#fff',
    color: colors.text,
  },
  primary: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  disabled: { opacity: 0.7 },
  primaryText: { color: '#fff', fontWeight: '700' },
  logout: { marginTop: 24, alignItems: 'center', padding: 12 },
  logoutText: { color: colors.danger, fontWeight: '700' },
});
