import React, { useState } from 'react';
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

export function AIDiagnosisScreen() {
  const [symptoms, setSymptoms] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  async function runDiagnosis() {
    if (!symptoms.trim()) {
      Alert.alert('Symptoms required', 'Describe what you are experiencing.');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post('/ai/diagnose', { symptoms: symptoms.trim() });
      setResult(data);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Enter your symptoms in plain language. This demo uses rule-based matching only and is not
        medical advice.
      </Text>
      <TextInput
        style={styles.input}
        multiline
        placeholder="e.g. fever and sore throat for two days"
        placeholderTextColor={colors.muted}
        value={symptoms}
        onChangeText={setSymptoms}
      />
      <TouchableOpacity style={[styles.button, busy && styles.buttonDisabled]} onPress={runDiagnosis} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? 'Analyzing…' : 'Get assessment'}</Text>
      </TouchableOpacity>

      {result ? (
        <View style={styles.card}>
          <Text style={styles.section}>Likely focus</Text>
          <Text style={styles.diagnosis}>{result.diagnosis}</Text>
          <Text style={styles.severity}>
            Severity: <Text style={styles.severityVal}>{result.severity}</Text>
          </Text>
          {result.advice ? (
            <>
              <Text style={styles.section}>Guidance</Text>
              <Text style={styles.body}>{result.advice}</Text>
            </>
          ) : null}
          {result.matchedTopics?.length ? (
            <>
              <Text style={styles.section}>Other matches</Text>
              {result.matchedTopics.map((t, i) => (
                <Text key={i} style={styles.body}>
                  • {t.condition} ({t.severity})
                </Text>
              ))}
            </>
          ) : null}
          <Text style={styles.disclaimer}>{result.disclaimer}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  intro: { color: colors.muted, marginBottom: 12, lineHeight: 20 },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
    color: colors.text,
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  card: {
    marginTop: 20,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  section: { fontWeight: '800', color: colors.primaryDark, marginTop: 12, marginBottom: 6 },
  diagnosis: { fontSize: 18, fontWeight: '700', color: colors.text },
  severity: { marginTop: 8, color: colors.muted },
  severityVal: { fontWeight: '800', color: colors.warning },
  body: { color: colors.text, lineHeight: 22 },
  disclaimer: { marginTop: 16, fontSize: 12, color: colors.muted, fontStyle: 'italic' },
});
