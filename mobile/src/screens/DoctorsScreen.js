import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { api } from '../api/client';
import { colors } from '../theme';

export function DoctorsScreen() {
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    const { data } = await api.get('/doctors');
    setItems(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load');
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.email}</Text>
            {item.specialization ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.specialization}</Text>
              </View>
            ) : null}
            {item.phone ? <Text style={styles.meta}>{item.phone}</Text> : null}
          </View>
        )}
        ListEmptyComponent={
          !error ? <Text style={styles.empty}>No doctors yet.</Text> : null
        }
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
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  meta: { color: colors.muted, marginTop: 4 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#ccfbf1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { color: colors.primaryDark, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 24 },
  error: { color: colors.danger, padding: 16 },
});
