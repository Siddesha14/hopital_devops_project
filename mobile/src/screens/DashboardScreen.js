import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { colors } from '../theme';

export function DashboardScreen() {
  const { user, profile, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (user?.role === 'admin') {
      try {
        const { data } = await api.get('/admin/dashboard');
        setStats(data);
      } catch {
        setStats(null);
      }
    } else {
      setStats(null);
    }
  }, [user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  const displayName =
    profile?.name || user?.email?.split('@')[0] || 'User';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.greeting}>Hello, {displayName}</Text>
      <Text style={styles.role}>Signed in as {user?.role}</Text>

      {user?.role === 'admin' && stats && (
        <>
          <View style={styles.grid}>
            <StatCard label="Patients" value={stats.counts.patients} />
            <StatCard label="Doctors" value={stats.counts.doctors} />
            <StatCard label="Appointments" value={stats.counts.appointments} />
            <StatCard label="Pending" value={stats.counts.pendingAppointments} />
            <StatCard label="Prescriptions" value={stats.counts.prescriptions} />
          </View>
          <TouchableOpacity style={styles.signOut} onPress={() => logout()}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </>
      )}

      {user?.role === 'patient' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick tips</Text>
          <Text style={styles.cardBody}>
            Book visits from Appointments, review medications under Prescriptions, and try AI
            Diagnosis for educational triage hints (not a substitute for a clinician).
          </Text>
        </View>
      )}

      {user?.role === 'doctor' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today</Text>
          <Text style={styles.cardBody}>
            Review pending appointments and add prescriptions from the Prescriptions tab.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 32 },
  greeting: { fontSize: 26, fontWeight: '800', color: colors.text },
  role: { color: colors.muted, marginTop: 4, marginBottom: 20, textTransform: 'capitalize' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    width: '47%',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontSize: 28, fontWeight: '800', color: colors.primaryDark },
  statLabel: { color: colors.muted, marginTop: 4, fontSize: 13 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontWeight: '700', color: colors.text, marginBottom: 8, fontSize: 16 },
  cardBody: { color: colors.muted, lineHeight: 22 },
  signOut: {
    marginTop: 20,
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  signOutText: { color: colors.danger, fontWeight: '700' },
});
