import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { colors } from '../theme';

export function PrescriptionsScreen({ navigation }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get('/prescriptions');
    setItems(data);
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <View style={styles.container}>
      {user?.role === 'doctor' ? (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() =>
            (navigation.getParent() || navigation).navigate('AddPrescription')
          }
        >
          <Text style={styles.primaryBtnText}>Add prescription</Text>
        </TouchableOpacity>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.med}>{item.medication}</Text>
            {item.dosage ? <Text style={styles.meta}>Dosage: {item.dosage}</Text> : null}
            {item.instructions ? (
              <Text style={styles.meta}>Instructions: {item.instructions}</Text>
            ) : null}
            {item.patient_name ? (
              <Text style={styles.meta}>Patient: {item.patient_name}</Text>
            ) : null}
            {item.doctor_name ? (
              <Text style={styles.meta}>Doctor: {item.doctor_name}</Text>
            ) : null}
            <Text style={styles.date}>{item.created_at}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No prescriptions.</Text>}
      />
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
  med: { fontSize: 17, fontWeight: '800', color: colors.text },
  meta: { color: colors.muted, marginTop: 6 },
  date: { color: colors.muted, fontSize: 12, marginTop: 8 },
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
});
