import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ACHIEVEMENTS = [
  {
    id: 'steps-1000',
    title: 'Warm Up Walker',
    description: 'Log your first 1,000 steps in a day.',
    target: 1000,
    metric: 'steps' as const
  },
  {
    id: 'steps-5000',
    title: 'City Explorer',
    description: 'Hit 5,000 steps to keep your streak alive.',
    target: 5000,
    metric: 'steps' as const
  },
  {
    id: 'coins-50',
    title: 'Coin Collector',
    description: 'Earn 50 coins by staying active.',
    target: 50,
    metric: 'coins' as const
  }
];

type AchievementProps = {
  steps: number;
  coins: number;
};

export default function AchievementList({ steps, coins }: AchievementProps) {
  const getProgress = (metric: 'steps' | 'coins', target: number) => {
    const value = metric === 'steps' ? steps : coins;
    return {
      value,
      progress: Math.min(1, value / target)
    };
  };

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Achievements</Text>
      {ACHIEVEMENTS.map(item => {
        const { value, progress } = getProgress(item.metric, item.target);
        const percentage = Math.round(progress * 100);
        const isComplete = progress >= 1;

        return (
          <View key={item.id} style={[styles.card, isComplete && styles.completeCard]}>
            <View style={styles.row}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={[styles.status, isComplete && styles.statusComplete]}>
                {isComplete ? 'Completed' : `${percentage}%`}
              </Text>
            </View>
            <Text style={styles.description}>{item.description}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${percentage}%` }]} />
            </View>
            <Text style={styles.progressLabel}>
              {Math.min(value, item.target)} / {item.target} {item.metric}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: '#333' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  completeCard: { borderWidth: 1, borderColor: '#4CAF50' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '600', color: '#111' },
  status: { fontSize: 14, color: '#FF8C00', fontWeight: '600' },
  statusComplete: { color: '#2E7D32' },
  description: { color: '#666', marginTop: 6, marginBottom: 10 },
  progressBar: { height: 8, width: '100%', backgroundColor: '#eee', borderRadius: 10, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#FF8C00' },
  progressLabel: { marginTop: 6, color: '#555', fontWeight: '500' }
});
