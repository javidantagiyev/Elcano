import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import ScreenContainer from '../../components/ScreenContainer';
import BalancePill from '../../components/BalancePill';
import SurfaceCard from '../../components/SurfaceCard';
import { palette, radius, shadow, spacing, typography } from '../../constants/ui';
import useLiveStepTracker from '../../hooks/useLiveStepTracker';
import { finalizeStepSession, subscribeToActivityHistory } from '../../services/stepTracking';

const StatCard = ({ label, value, icon, accentColor }) => (
  <SurfaceCard style={styles.card}>
    <View style={[styles.iconBadge, { backgroundColor: accentColor }]}>
      <Ionicons name={icon} size={20} color="#fff" />
    </View>
    <Text style={styles.cardLabel}>{label}</Text>
    <Text style={styles.cardValue}>{value}</Text>
  </SurfaceCard>
);

const formatDateLabel = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const parsedDate = new Date(year, (month ?? 1) - 1, day ?? 1);
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(parsedDate);
};

export default function Dashboard() {
  const [stats, setStats] = useState({ name: null, coins: null, totalSteps: null });
  const [todaySteps, setTodaySteps] = useState(null);
  const [history, setHistory] = useState([]);
  const [loggingActivityId, setLoggingActivityId] = useState(null);
  const todayKey = useMemo(() => new Date().toISOString().split('T')[0], []);

  const {
    steps: sessionSteps,
    isTracking,
    permissionStatus,
    isPedometerAvailable,
    startTracking,
    stopTracking,
  } = useLiveStepTracker({
    onSessionComplete: async ({ steps, startedAt, endedAt }) => {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        Alert.alert('Sign in required', 'Please sign in to save your session.');
        return;
      }

      try {
        await finalizeStepSession(currentUser.uid, { steps, startedAt, endedAt, type: 'walk' });
      } catch (err) {
        console.error('Unable to persist session', err);
        Alert.alert('Save failed', 'We could not save this session. Please try again.');
      }
    },
  });

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return undefined;
    }

    const profileRef = doc(db, 'users', currentUser.uid);
    const dailyRef = doc(db, 'dailySteps', currentUser.uid, 'entries', todayKey);

    const unsubscribeProfile = onSnapshot(profileRef, (snapshot) => {
      const data = snapshot.data();
      if (!data) {
        // We avoid defaulting to zero because Firebase is the source of truth.
        setStats({ name: null, coins: null, totalSteps: null });
        return;
      }

      setStats({
        name: data.name ?? null,
        coins: typeof data.coins === 'number' ? data.coins : 0,
        totalSteps: typeof data.totalSteps === 'number' ? data.totalSteps : 0,
      });
    });

    const unsubscribeToday = onSnapshot(dailyRef, (snapshot) => {
      if (!snapshot.exists()) {
        setTodaySteps(null);
        return;
      }

      const data = snapshot.data();
      setTodaySteps(typeof data.steps === 'number' ? data.steps : 0);
    });

    const unsubscribeHistory = subscribeToActivityHistory(currentUser.uid, (entries) => {
      setHistory(
        entries.map((entry) => ({
          ...entry,
          steps: entry.steps ?? 0,
          dateKey: entry.dateKey ?? todayKey,
        })),
      );
    });

    return () => {
      unsubscribeProfile();
      unsubscribeToday();
      unsubscribeHistory();
    };
  }, [todayKey]);

  const quickActivities = useMemo(
    () => [
      {
        id: 'walk-20',
        label: '20 min walk',
        type: 'walk',
        durationMinutes: 20,
        estimatedSteps: 2200,
        distanceKm: 1.6,
      },
      {
        id: 'bike-30',
        label: '30 min bike',
        type: 'bike',
        durationMinutes: 30,
        estimatedSteps: 1500,
        distanceKm: 8,
      },
      {
        id: 'run-15',
        label: '15 min run',
        type: 'run',
        durationMinutes: 15,
        estimatedSteps: 3000,
        distanceKm: 3.2,
      },
    ],
    [],
  );

  const handleStartStepTracking = async () => {
    if (permissionStatus === 'denied') {
      Alert.alert('Motion access needed', 'Enable motion access to start live step tracking.');
      return;
    }

    if (isPedometerAvailable === 'denied') {
      Alert.alert('Step tracking unavailable', 'Your device does not support step counting.');
      return;
    }

    await startTracking();
  };

  const handleStopStepTracking = async () => {
    await stopTracking();
  };

  const handleStartActivity = async (activity) => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      Alert.alert('Sign in required', 'Please sign in to track your activities.');
      return;
    }

    setLoggingActivityId(activity.id);

    try {
      await finalizeStepSession(currentUser.uid, {
        steps: activity.estimatedSteps,
        startedAt: new Date(),
        endedAt: new Date(),
        type: activity.type,
      });
      Alert.alert('Activity saved', `${activity.label} logged for today.`);
    } catch (error) {
      console.error('Unable to log activity', error);
      Alert.alert('Logging failed', 'We could not save your activity. Try again.');
    } finally {
      setLoggingActivityId(null);
    }
  };

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>Welcome back{stats.name ? `, ${stats.name}` : ''}.</Text>
        </View>
        <BalancePill amount={stats.coins ?? '—'} />
      </View>

      <SurfaceCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Live step tracking</Text>
          <Text style={styles.sectionCaption}>
            {permissionStatus === 'granted' && isPedometerAvailable === 'granted'
              ? 'Tracking uses your device pedometer'
              : 'Motion access is required to start'}
          </Text>
        </View>

        <View style={styles.trackerRow}>
          <View style={styles.trackerCopy}>
            <Text style={styles.trackerLabel}>{isTracking ? 'Session steps' : 'Ready to start'}</Text>
            <Text style={styles.trackerValue}>{isTracking ? sessionSteps : '—'}</Text>
            <Text style={styles.trackerSubtext}>Totals save when you stop a session.</Text>
          </View>
          <TouchableOpacity
            style={[styles.trackerButton, isTracking ? styles.trackerButtonStop : styles.trackerButtonStart]}
            onPress={isTracking ? handleStopStepTracking : handleStartStepTracking}
          >
            <Ionicons
              name={isTracking ? 'stop-circle-outline' : 'play-circle-outline'}
              size={20}
              color={isTracking ? '#fff' : '#fff'}
            />
            <Text style={styles.trackerButtonText}>
              {isTracking ? 'Stop tracking' : 'Start tracking'}
            </Text>
          </TouchableOpacity>
        </View>
      </SurfaceCard>

      <View style={styles.statRow}>
        <StatCard
          label="Today's steps"
          value={todaySteps ?? '—'}
          icon="walk-outline"
          accentColor={palette.primary}
        />
        <StatCard
          label="Total steps"
          value={stats.totalSteps ?? '—'}
          icon="analytics-outline"
          accentColor={palette.accent}
        />
      </View>

      <SurfaceCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Activity history</Text>
          <Text style={styles.sectionCaption}>Last 7 sessions</Text>
        </View>

        {history.length === 0 ? (
          <Text style={styles.placeholder}>Your recent activity will appear here.</Text>
        ) : (
          <View style={styles.historyList}>
            {history.map((entry) => (
              <View key={entry.id} style={styles.historyRow}>
                <View style={styles.historyDate}>
                  <Ionicons name="calendar-outline" size={18} color={palette.mutedText} />
                  <Text style={styles.historyDateText}>{formatDateLabel(entry.dateKey)}</Text>
                </View>
                <View style={styles.historyMeta}>
                  <Text style={styles.historySteps}>{entry.steps} steps</Text>
                  {typeof entry.coinsEarned === 'number' && (
                    <Text style={styles.historyCoins}>+{entry.coinsEarned}c</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </SurfaceCard>

      <SurfaceCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick activities</Text>
          <Text style={styles.sectionCaption}>Log a bike, walk, or run instantly</Text>
        </View>

        <View style={styles.quickGrid}>
          {quickActivities.map((activity) => {
            const isLogging = loggingActivityId === activity.id;

            return (
              <TouchableOpacity
                key={activity.id}
                style={[styles.quickCard, isLogging && styles.quickCardDisabled]}
                onPress={() => handleStartActivity(activity)}
                disabled={isLogging}
              >
                <View style={styles.quickHeader}>
                  <Ionicons
                    name={activity.type === 'bike' ? 'bicycle-outline' : activity.type === 'run' ? 'flame-outline' : 'walk-outline'}
                    size={20}
                    color={palette.primary}
                  />
                  <Text style={styles.quickTitle}>{activity.label}</Text>
                </View>
                <Text style={styles.quickMeta}>
                  {activity.durationMinutes} min · {activity.distanceKm} km · ~{activity.estimatedSteps.toLocaleString()} steps
                </Text>
                <Text style={styles.quickAction}>{isLogging ? 'Saving...' : 'Start & log'}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SurfaceCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: { ...typography.headline },
  subtitle: { marginTop: spacing.xs, color: palette.mutedText },
  statRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  card: { flex: 1 },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardLabel: { color: palette.mutedText, fontSize: 12, marginBottom: spacing.xs },
  cardValue: { fontSize: 24, fontWeight: '700', color: palette.text },
  section: { ...shadow.surface },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.title },
  sectionCaption: { color: palette.mutedText, fontSize: 12 },
  placeholder: { color: palette.mutedText, textAlign: 'center', paddingVertical: spacing.md },
  historyList: { gap: spacing.md },
  trackerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  trackerCopy: { flex: 1, gap: spacing.xs },
  trackerLabel: { color: palette.mutedText, fontSize: 13 },
  trackerValue: { fontSize: 32, fontWeight: '800', color: palette.text },
  trackerSubtext: { color: palette.mutedText, fontSize: 12 },
  trackerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  trackerButtonStart: { backgroundColor: palette.primary },
  trackerButtonStop: { backgroundColor: palette.danger },
  trackerButtonText: { color: '#fff', fontWeight: '700' },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  historyDate: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  historyDateText: { color: palette.text, fontWeight: '600' },
  historyMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  historySteps: { color: palette.text, fontWeight: '600' },
  historyCoins: { color: palette.primary, fontWeight: '700' },
  quickGrid: { gap: spacing.md },
  quickCard: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  quickCardDisabled: { opacity: 0.6 },
  quickHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  quickTitle: { fontWeight: '700', color: palette.text },
  quickMeta: { color: palette.mutedText, fontSize: 12 },
  quickAction: { color: palette.primary, fontWeight: '700', marginTop: spacing.xs },
});
