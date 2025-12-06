import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useUser } from '../../context/UserContext';
import { Ionicons } from '@expo/vector-icons';

export default function Dashboard() {
  const { steps, coins, isPedometerAvailable } = useUser();

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, Walker!</Text>
        <View style={styles.coinContainer}>
          <Ionicons name="cash-outline" size={20} color="#FFD700" />
          <Text style={styles.coinText}>{coins} Coins</Text>
        </View>
      </View>

      {/* Main Circle Progress */}
      <View style={styles.circleContainer}>
        <View style={styles.circle}>
          <Text style={styles.stepCount}>{steps}</Text>
          <Text style={styles.stepLabel}>Steps Today</Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{(steps * 0.0008).toFixed(2)}</Text>
          <Text style={styles.statLabel}>Km</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{(steps * 0.04).toFixed(0)}</Text>
          <Text style={styles.statLabel}>Kcal</Text>
        </View>
      </View>

      <Text style={styles.status}>Sensor Status: {isPedometerAvailable}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  coinContainer: { flexDirection: 'row', backgroundColor: '#333', padding: 8, borderRadius: 20, alignItems: 'center' },
  coinText: { color: '#FFD700', marginLeft: 5, fontWeight: 'bold' },
  circleContainer: { alignItems: 'center', marginVertical: 40 },
  circle: { width: 200, height: 200, borderRadius: 100, borderWidth: 10, borderColor: '#FF8C00', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  stepCount: { fontSize: 40, fontWeight: 'bold', color: '#FF8C00' },
  stepLabel: { fontSize: 16, color: '#888' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around' },
  statBox: { backgroundColor: '#fff', padding: 20, borderRadius: 15, alignItems: 'center', width: '40%', elevation: 3 },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  statLabel: { color: '#666' },
  status: { textAlign: 'center', marginTop: 20, color: '#aaa' }
});