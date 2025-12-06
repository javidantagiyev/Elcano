import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

const MOCK_LEADERBOARD = [
  { id: '1', name: 'Javidan', steps: 15200 },
  { id: '2', name: 'Ilknur', steps: 14500 },
  { id: '3', name: 'Toghrul', steps: 12000 },
  { id: '4', name: 'You', steps: 8500 }, // Current user
];

export default function LeaderboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Weekly Top Walkers</Text>
      <FlatList
        data={MOCK_LEADERBOARD}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <View style={[styles.row, item.name === 'You' && styles.highlight]}>
            <Text style={styles.rank}>#{index + 1}</Text>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.steps}>{item.steps} steps</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#f9f9f9' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  row: { flexDirection: 'row', backgroundColor: 'white', padding: 15, marginBottom: 10, borderRadius: 10, alignItems: 'center', elevation: 2 },
  highlight: { borderWidth: 2, borderColor: '#FF8C00' },
  rank: { fontSize: 18, fontWeight: 'bold', color: '#FF8C00', width: 40 },
  name: { flex: 1, fontSize: 16, fontWeight: '500' },
  steps: { fontSize: 16, color: '#666' }
});