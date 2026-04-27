import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { api } from '../api/client';
import { colors } from '../theme';

export function AddPrescriptionScreen({ navigation }) {
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [medication, setMedication] = useState('');
  const [dosage, setDosage] = useState('');
  const [instructions, setInstructions] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get('/patients')
      .then(({ data }) => setPatients(data))
      .catch(() => setPatients([]));
  }, []);

  async function submit() {
    if (!patientId || !medication.trim()) {
      Alert.alert('Missing', 'Select a patient and enter medication.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/prescriptions', {
        patientId: Number(patientId),
        medication: medication.trim(),
        dosage: dosage.trim() || undefined,
        instructions: instructions.trim() || undefined,
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Patient</Text>
      <ScrollView style={styles.list} nestedScrollEnabled>
        {patients.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[
              styles.row,
              String(p.id) === String(patientId) && styles.rowActive,
            ]}
            onPress={() => setPatientId(String(p.id))}
          >
            <Text style={styles.rowTitle}>{p.name}</Text>
            <Text style={styles.rowSub}>{p.email}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Text style={styles.label}>Medication</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Amoxicillin"
        placeholderTextColor={colors.muted}
        value={medication}
        onChangeText={setMedication}
      />
      <Text style={styles.label}>Dosage (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="500 mg twice daily"
        placeholderTextColor={colors.muted}
        value={dosage}
        onChangeText={setDosage}
      />
      <Text style={styles.label}>Instructions (optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        multiline
        placeholder="Take with food"
        placeholderTextColor={colors.muted}
        value={instructions}
        onChangeText={setInstructions}
      />
      <TouchableOpacity style={[styles.button, busy && styles.buttonDisabled]} onPress={submit} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? 'Saving…' : 'Save prescription'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 13, color: colors.muted, marginBottom: 6 },
  list: { maxHeight: 180, marginBottom: 14 },
  row: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  rowActive: { borderColor: colors.primary, backgroundColor: '#f0fdfa' },
  rowTitle: { fontWeight: '700', color: colors.text },
  rowSub: { color: colors.muted, fontSize: 13, marginTop: 2 },
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
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
