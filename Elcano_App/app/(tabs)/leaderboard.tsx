import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';

interface LeaderboardEntry {
  id: string;
  name: string;
  totalSteps: number;
  coins: number;
}

type MetricKey = 'steps' | 'coins';

interface MetricConfig {
  field: 'totalSteps' | 'coins';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  unit: string;
}

const metricConfig: Record<MetricKey, MetricConfig> = {
  steps: { field: 'totalSteps', label: 'Steps', icon: 'walk-outline', unit: 'steps' },
  coins: { field: 'coins', label: 'Coins', icon: 'trophy-outline', unit: 'coins' },
};

const numberFormatter = new Intl.NumberFormat('en-US');

export default function LeaderboardScreen() {
  const [metric, setMetric] = useState<MetricKey>('steps');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    setIsLoading(true);
    const usersRef = collection(db, 'users');
    const leaderboardQuery = query(usersRef, orderBy(metricConfig[metric].field, 'desc'), limit(20));

    const unsubscribe = onSnapshot(
      leaderboardQuery,
      (snapshot) => {
        const results = snapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data();

          return {
            id: docSnapshot.id,
            name: data.name ?? 'Walker',
            totalSteps: data.totalSteps ?? 0,
            coins: data.coins ?? 0,
          } as LeaderboardEntry;
        });

        setEntries(results);
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );

    return unsubscribe;
  }, [metric]);

  const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const isCurrentUser = currentUserId === item.id;
    const field = metricConfig[metric].field;
    const value = item[field];
    const displayValue = `${numberFormatter.format(value ?? 0)} ${metricConfig[metric].unit}`;

    return (
      <View style={[styles.row, isCurrentUser && styles.highlight]}> 
        <View style={styles.rankBadge}>
          <Text style={styles.rank}>#{index + 1}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}{isCurrentUser ? ' (You)' : ''}</Text>
          <Text style={styles.metric}>{displayValue}</Text>
        </View>
        <Ionicons name={metricConfig[metric].icon} size={20} color="#FF8C00" />
      </View>
    );
  };

  const header = useMemo(() => (
    <View style={styles.header}> 
      <View>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.caption}>Top users ranked by {metricConfig[metric].label.toLowerCase()}.</Text>
      </View>
      <View style={styles.toggleGroup}>
        {(Object.keys(metricConfig) as MetricKey[]).map((key) => {
          const isSelected = key === metric;

          return (
            <TouchableOpacity
              key={key}
              style={[styles.toggleButton, isSelected && styles.toggleButtonActive]}
              onPress={() => setMetric(key)}
              accessibilityRole="button"
            >
              <Ionicons
                name={metricConfig[key].icon}
                size={16}
                color={isSelected ? '#fff' : '#FF8C00'}
              />
              <Text style={[styles.toggleLabel, isSelected && styles.toggleLabelActive]}>{metricConfig[key].label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  ), [metric]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}> 
        <ActivityIndicator size="large" color="#FF8C00" />
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}> 
      {header}

      {entries.length === 0 ? (
        <View style={styles.emptyState}> 
          <Ionicons name="trophy-outline" size={48} color="#B0B0B0" />
          <Text style={styles.emptyTitle}>No results yet</Text>
          <Text style={styles.emptyCaption}>Start walking and earning to appear on the leaderboard.</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#F7F7F7' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '700', color: '#1F1F1F' },
  caption: { color: '#6B6B6B', marginTop: 4 },
  toggleGroup: { flexDirection: 'row', gap: 8 },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFEBD5',
  },
  toggleButtonActive: { backgroundColor: '#FF8C00' },
  toggleLabel: { marginLeft: 6, fontWeight: '600', color: '#FF8C00' },
  toggleLabelActive: { color: '#fff' },
  listContent: { paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  highlight: { borderWidth: 1.5, borderColor: '#FF8C00' },
  rankBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFF2E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rank: { fontSize: 16, fontWeight: '700', color: '#FF8C00' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#1F1F1F' },
  metric: { color: '#6B6B6B', marginTop: 4 },
  separator: { height: 12 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F7F7' },
  loadingText: { marginTop: 12, color: '#6B6B6B' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1F1F1F', marginTop: 12 },
  emptyCaption: { color: '#6B6B6B', marginTop: 4, textAlign: 'center' },
});
