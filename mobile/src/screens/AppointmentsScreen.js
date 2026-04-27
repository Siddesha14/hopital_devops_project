import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { colors } from '../theme';

export function AppointmentsScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [doctorId, setDoctorId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    const { data } = await api.get('/appointments');
    setItems(data);
  }, []);

  const loadDoctors = useCallback(async () => {
    if (user?.role !== 'patient') {
      return;
    }
    const { data } = await api.get('/doctors');
    setDoctors(data);
  }, [user?.role]);

  useEffect(() => {
    load().catch(() => {});
    loadDoctors().catch(() => {});
  }, [load, loadDoctors]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
      await loadDoctors();
    } finally {
      setRefreshing(false);
    }
  }

  async function submitBooking() {
    if (!doctorId || !scheduledAt.trim()) {
      Alert.alert('Missing data', 'Choose a doctor and enter date/time (ISO format).');
      return;
    }
    try {
      await api.post('/appointments', {
        doctorId: Number(doctorId),
        scheduledAt: scheduledAt.trim(),
        notes: notes.trim() || undefined,
      });
      setModalOpen(false);
      setNotes('');
      setScheduledAt('');
      await load();
      Alert.alert('Requested', 'Your appointment is pending doctor approval.');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Could not book');
    }
  }

  async function setStatus(id, status) {
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      await load();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Update failed');
    }
  }

  return (
    <View style={styles.container}>
      {user?.role === 'patient' ? (
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setModalOpen(true)}>
          <Text style={styles.primaryBtnText}>Book appointment</Text>
        </TouchableOpacity>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.status}>{item.status}</Text>
            <Text style={styles.line}>
              {user?.role === 'patient'
                ? `Dr. ${item.doctor_name || ''}`
                : `Patient: ${item.patient_name || ''}`}
            </Text>
            <Text style={styles.meta}>{item.scheduled_at}</Text>
            {item.notes ? <Text style={styles.meta}>Note: {item.notes}</Text> : null}
            {user?.role === 'doctor' && item.status === 'pending' ? (
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.smallBtn, styles.approve]}
                  onPress={() => setStatus(item.id, 'approved')}
                >
                  <Text style={styles.smallBtnText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallBtn, styles.reject]}
                  onPress={() => setStatus(item.id, 'rejected')}
                >
                  <Text style={styles.smallBtnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No appointments.</Text>}
      />

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Book visit</Text>
            <Text style={styles.label}>Select doctor</Text>
            <ScrollView style={styles.doctorList} nestedScrollEnabled>
              {doctors.length === 0 ? (
                <Text style={styles.hint}>
                  No doctors available yet. Register as a doctor or ask an admin.
                </Text>
              ) : (
                doctors.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.doctorRow,
                      String(item.id) === String(doctorId) && styles.doctorRowActive,
                    ]}
                    onPress={() => setDoctorId(String(item.id))}
                  >
                    <Text style={styles.doctorName}>{item.name}</Text>
                    <Text style={styles.doctorSpec}>{item.specialization || 'General'}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <Text style={styles.label}>Scheduled at (ISO 8601)</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-04-15T14:30:00.000Z"
              placeholderTextColor={colors.muted}
              value={scheduledAt}
              onChangeText={setScheduledAt}
            />
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              multiline
              value={notes}
              onChangeText={setNotes}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.ghostBtn} onPress={() => setModalOpen(false)}>
                <Text style={styles.ghostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={submitBooking}>
                <Text style={styles.primaryBtnText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  status: {
    alignSelf: 'flex-start',
    textTransform: 'uppercase',
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
    marginBottom: 6,
  },
  line: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { color: colors.muted, marginTop: 4 },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  smallBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  approve: { backgroundColor: colors.success },
  reject: { backgroundColor: colors.danger },
  smallBtnText: { color: '#fff', fontWeight: '700' },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 24 },
  primaryBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    maxHeight: Platform.OS === 'ios' ? '90%' : '100%',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12, color: colors.text },
  label: { fontSize: 13, color: colors.muted, marginBottom: 6 },
  hint: { fontSize: 12, color: colors.muted, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    color: colors.text,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  ghostBtn: { paddingVertical: 10, paddingHorizontal: 12 },
  ghostText: { color: colors.muted, fontWeight: '600' },
  doctorList: { maxHeight: 160, marginBottom: 12 },
  doctorRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#fafafa',
  },
  doctorRowActive: { borderColor: colors.primary, backgroundColor: '#f0fdfa' },
  doctorName: { fontWeight: '700', color: colors.text },
  doctorSpec: { color: colors.muted, fontSize: 13, marginTop: 2 },
});
