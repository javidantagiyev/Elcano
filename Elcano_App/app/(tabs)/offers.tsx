import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

const MOCK_OFFERS = [
  { id: '1', company: 'SportCheck', discount: '20% Off', cost: 500 },
  { id: '2', company: 'Healthy Life', discount: 'Free Drink', cost: 200 },
];

export default function OffersScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Partner Offers</Text>
      <FlatList 
        data={MOCK_OFFERS}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <Text style={styles.company}>{item.company}</Text>
            <Text style={styles.discount}>{item.discount}</Text>
            <Text style={styles.cost}>{item.cost} Coins</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 50 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 15, marginBottom: 15, elevation: 2 },
  company: { fontSize: 18, color: '#666' },
  discount: { fontSize: 24, fontWeight: 'bold', color: '#FF8C00' },
  cost: { marginTop: 10, fontWeight: 'bold', alignSelf: 'flex-end', color: '#333' }
});