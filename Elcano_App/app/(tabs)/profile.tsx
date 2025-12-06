import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { auth } from '../../firebaseConfig';

export default function ProfileScreen() {
  const handleLogout = () => {
    auth.signOut();
    router.replace('/auth/login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarText}>U</Text>
      </View>
      
      <Text style={styles.name}>User Name</Text>
      <Text style={styles.email}>user@example.com</Text>

      <View style={styles.infoSection}>
        <Text style={styles.label}>Age: 21</Text>
        <Text style={styles.label}>Total Coins Earned: 1,200</Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: 'center', paddingTop: 80 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  avatarText: { fontSize: 40, color: '#555' },
  name: { fontSize: 24, fontWeight: 'bold' },
  email: { color: '#666', marginBottom: 30 },
  infoSection: { width: '100%', padding: 20, backgroundColor: '#fff', borderRadius: 10, marginBottom: 30 },
  label: { fontSize: 16, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
  logoutBtn: { backgroundColor: '#FF3B30', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 25 },
  logoutText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});