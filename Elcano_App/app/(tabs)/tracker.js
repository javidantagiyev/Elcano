import React, { useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useLiveStepTracker from '../../hooks/useLiveStepTracker';
import { finalizeStepSession } from '../../services/stepTracking';
import { auth } from '../../firebaseConfig';

export default function StepTrackerScreen() {
  const [finalizedSteps, setFinalizedSteps] = useState(null);
  const {
    steps,
    isTracking,
    statusLabel,
    permissionStatus,
    isPedometerAvailable,
    error,
    toggleTracking,
  } = useLiveStepTracker({
    onSessionComplete: async ({ steps: sessionSteps, startedAt, endedAt }) => {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        Alert.alert('Sign in required', 'Please sign in to save your session.');
        return;
      }

      try {
        const { totalSteps, todaySteps } = await finalizeStepSession(currentUser.uid, {
          steps: sessionSteps,
          startedAt,
          endedAt,
          type: 'walk',
        });

        setFinalizedSteps(sessionSteps);

        // Comments explaining previous bug: earlier versions attempted to write on every
        // pedometer tick, which caused resets when the app restarted. Now we only persist
        // once per session so totals stay in sync with Firebase after reloads.
        console.log('Session saved', { sessionSteps, totalSteps, todaySteps });
      } catch (err) {
        console.error('Unable to persist session', err);
        Alert.alert('Save failed', 'We could not save this session. Please try again.');
      }
    },
  });

  const permissionDenied = permissionStatus === 'denied';
  const pedometerUnavailable = isPedometerAvailable === 'denied';
  const shouldShowWarning = permissionDenied || pedometerUnavailable;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Live Step Tracker</Text>
        <Text style={styles.subtitle}>Status: {statusLabel}</Text>

        <View style={styles.stepBadge}>
          <Ionicons name="walk-outline" size={32} color="#FF8C00" />
          <Text style={styles.stepCount}>{steps}</Text>
          <Text style={styles.stepLabel}>steps</Text>
        </View>

        <Text style={styles.caption}>Steps counted after you press “Start Walking”.</Text>

        {finalizedSteps !== null && (
          <View style={styles.sessionTotalBox}>
            <Ionicons name="cloud-upload-outline" size={18} color="#006d32" />
            <Text style={styles.sessionTotalText}>
              Session total ready for leaderboard sync: {finalizedSteps} steps
            </Text>
          </View>
        )}

        {shouldShowWarning && (
          <View style={styles.warningBox}>
            <Ionicons name="alert-circle" size={20} color="#8B0000" />
            <Text style={styles.warningText}>
              {permissionDenied
                ? 'Motion permission is required to start tracking.'
                : 'Pedometer sensor is not available on this device.'}
            </Text>
          </View>
        )}

        {error && !shouldShowWarning && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity style={styles.button} onPress={toggleTracking} activeOpacity={0.8}>
          <Text style={styles.buttonText}>{isTracking ? 'Stop Tracking' : 'Start Walking'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9fb',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
  },
  stepBadge: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
    gap: 8,
  },
  stepCount: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FF8C00',
  },
  stepLabel: {
    fontSize: 16,
    color: '#555',
  },
  caption: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  sessionTotalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 10,
    borderColor: '#cde9d6',
    borderWidth: 1,
  },
  sessionTotalText: {
    flex: 1,
    color: '#215732',
    fontSize: 14,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#fff2e5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffd9b3',
  },
  warningText: {
    flex: 1,
    color: '#8B0000',
  },
  errorText: {
    color: '#b00020',
  },
  button: {
    marginTop: 12,
    width: '80%',
    backgroundColor: '#FF8C00',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 12,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
