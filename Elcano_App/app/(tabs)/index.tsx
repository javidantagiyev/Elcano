import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../firebaseConfig';
import {
  Timestamp,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import ScreenContainer from '../../components/ScreenContainer';
import BalancePill from '../../components/BalancePill';
import SurfaceCard from '../../components/SurfaceCard';
import { palette, radius, shadow, spacing, typography } from '../../constants/ui';
import { logActivity } from '../../services/activities';
import { addStepsToDay, buildDateKey } from '../../services/dailySteps';
import { checkAchievements } from '../../services/achievements';
import { updateUserProgress } from '../../services/userProfile';
import useLiveStepTracker from '../../hooks/useLiveStepTracker';

interface UserStats {
  name?: string;
  totalSteps: number;
  coins: number;
}

interface ActivityEntry {
  id: string;
  dateKey: string;
  steps: number;
  coinsEarned?: number;
  type?: string;
}

interface QuickActivity {
  id: string;
  label: string;
  type: 'walk' | 'run' | 'bike';
  durationMinutes: number;
  estimatedSteps: number;
  distanceKm: number;
}

const StatCard = ({
  label,
  value,
  icon,
  accentColor,
}: {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
}) => (
  <SurfaceCard style={styles.card}>
    <View style={[styles.iconBadge, { backgroundColor: accentColor }]}>
      <Ionicons name={icon} size={20} color="#fff" />
    </View>
    <Text style={styles.cardLabel}>{label}</Text>
    <Text style={styles.cardValue}>{value}</Text>
  </SurfaceCard>
);

const formatDateKey = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString().split('T')[0];
  }

  return '';
};

const formatDateLabel = (dateKey: string): string => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const parsedDate = new Date(year, (month ?? 1) - 1, day ?? 1);
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(parsedDate);
};

export default function Dashboard() {
  const [stats, setStats] = useState<UserStats>({ coins: 0, totalSteps: 0 });
  const [history, setHistory] = useState<ActivityEntry[]>([]);
  const [todaySteps, setTodaySteps] = useState(0);
  const [loggingActivityId, setLoggingActivityId] = useState<string | null>(null);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const {
    steps: sessionSteps,
    isTracking: isTrackingSession,
    permissionStatus,
    isPedometerAvailable,
    error: trackerError,
    startTracking,
    stopTracking,
  } = useLiveStepTracker();

  const todayKey = useMemo(() => buildDateKey(), []);

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return;
    }

    // Live subscriptions keep the dashboard fresh without manual refresh buttons.
    const profileRef = doc(db, 'users', currentUser.uid);
    const todayStepsRef = doc(db, 'dailySteps', currentUser.uid, 'days', todayKey);
    const historyQuery = query(
      collection(profileRef, 'activities'),
      orderBy('date', 'desc'),
      limit(7)
    );

    const unsubscribeProfile = onSnapshot(profileRef, (snapshot) => {
      const data = snapshot.data();

      if (!data) {
        setStats({ coins: 0, totalSteps: 0 });
        return;
      }

      setStats({
        name: data.name,
        coins: data.coins ?? 0,
        totalSteps: data.totalSteps ?? 0,
      });
    });

    const unsubscribeTodaySteps = onSnapshot(todayStepsRef, (snapshot) => {
      const data = snapshot.data();
      setTodaySteps(data?.steps ?? 0);
    });

    const unsubscribeHistory = onSnapshot(historyQuery, (snap) => {
      const entries = snap.docs
        .map((docSnapshot) => {
          const data = docSnapshot.data();
          const dateKey = formatDateKey(data.date);

          if (!dateKey) {
            return null;
          }

          return {
            id: docSnapshot.id,
            dateKey,
            steps: data.steps ?? 0,
            coinsEarned: data.coinsEarned ?? data.coins ?? 0,
          } as ActivityEntry;
        })
        .filter(Boolean) as ActivityEntry[];

      setHistory(entries);
    });

    return () => {
      unsubscribeProfile();
      unsubscribeTodaySteps();
      unsubscribeHistory();
    };
  }, [todayKey]);

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return;
    }

    void checkAchievements(currentUser.uid, {
      totalSteps: stats.totalSteps,
      todaySteps,
      activitiesLogged: history.length,
    });
  }, [history.length, stats.totalSteps, todaySteps]);

  const quickActivities: QuickActivity[] = useMemo(
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
    const currentUser = auth.currentUser;

    if (!currentUser) {
      Alert.alert('Sign in required', 'Please sign in to track your activities.');
      return;
    }

    if (permissionStatus === 'denied') {
      Alert.alert('Motion access needed', 'Enable motion access to start live step tracking.');
      return;
    }

    if (isPedometerAvailable === 'denied') {
      Alert.alert('Step tracking unavailable', 'Your device does not support step counting.');
      return;
    }

    await startTracking();
    Alert.alert('Tracking started', 'Keep the app open while we count your steps.');
  };

  const handleStopStepTracking = async () => {
    if (!isTrackingSession) {
      return;
    }

    const currentUser = auth.currentUser;
    const previousStats = { ...stats };
    const previousTodaySteps = todaySteps;

    setIsSavingSession(true);

    try {
      const finalizedSteps = await stopTracking();
      const sessionDelta = finalizedSteps ?? 0;

      if (currentUser && sessionDelta > 0) {
        setTodaySteps((current) => current + sessionDelta);
        setStats((current) => ({ ...current, totalSteps: current.totalSteps + sessionDelta }));

        await Promise.all([
          addStepsToDay(currentUser.uid, todayKey, sessionDelta),
          updateUserProgress(currentUser.uid, { totalStepsDelta: sessionDelta }),
        ]);
      }

      Alert.alert('Tracking stopped', `You tracked ${sessionDelta} steps this session.`);
    } catch (error) {
      console.error('Unable to save session steps', error);
      setTodaySteps(previousTodaySteps);
      setStats(previousStats);
      Alert.alert('Sync failed', 'We could not sync your session steps. Please try again.');
    } finally {
      setIsSavingSession(false);
    }
  };

  const handleStartActivity = async (activity: QuickActivity) => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      Alert.alert('Sign in required', 'Please sign in to track your activities.');
      return;
    }

    setLoggingActivityId(activity.id);

    try {
      const { coinsEarned } = await logActivity(currentUser.uid, {
        title: `${activity.label} (quick add)`,
        type: activity.type,
        steps: activity.estimatedSteps,
        durationMinutes: activity.durationMinutes,
        distanceKm: activity.distanceKm,
      });

      setTodaySteps((current) => current + activity.estimatedSteps);
      setStats((current) => ({
        ...current,
        totalSteps: current.totalSteps + activity.estimatedSteps,
        coins: current.coins + coinsEarned,
      }));
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
        <BalancePill amount={stats.coins} />
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
            <Text style={styles.trackerLabel}>{isTrackingSession ? 'Session steps' : 'Ready to start'}</Text>
            <Text style={styles.trackerValue}>{isTrackingSession ? sessionSteps : '0'}</Text>
            {trackerError ? <Text style={styles.trackerError}>{trackerError}</Text> : null}
          </View>
          <TouchableOpacity
            style={[styles.trackerButton, isTrackingSession ? styles.trackerButtonStop : styles.trackerButtonStart]}
            onPress={isTrackingSession ? handleStopStepTracking : handleStartStepTracking}
            disabled={isSavingSession}
          >
            <Ionicons
              name={isTrackingSession ? 'stop-circle-outline' : 'play-circle-outline'}
              size={20}
              color={isTrackingSession ? '#fff' : '#fff'}
            />
            <Text style={styles.trackerButtonText}>
              {isSavingSession ? 'Saving...' : isTrackingSession ? 'Stop tracking' : 'Start tracking'}
            </Text>
          </TouchableOpacity>
        </View>
      </SurfaceCard>

      <View style={styles.statRow}>
        <StatCard label="Today's steps" value={todaySteps} icon="walk-outline" accentColor={palette.primary} />
        <StatCard label="Total steps" value={stats.totalSteps} icon="analytics-outline" accentColor={palette.accent} />
      </View>

      <SurfaceCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Activity history</Text>
          <Text style={styles.sectionCaption}>Last 7 days</Text>
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
                <View style={styles.quickCopy}>
                  <View style={styles.quickHeader}>
                    <Ionicons
                      name={activity.type === 'bike' ? 'bicycle-outline' : activity.type === 'run' ? 'flame-outline' : 'walk-outline'}
                      size={20}
                      color={palette.primary}
                    />
                    <Text style={styles.quickTitle} numberOfLines={1} ellipsizeMode="tail">
                      {activity.label}
                    </Text>
                  </View>
                  <Text style={styles.quickMeta} numberOfLines={2} ellipsizeMode="tail">
                    {activity.durationMinutes} min · {activity.distanceKm} km · ~{activity.estimatedSteps.toLocaleString()} steps
                  </Text>
                </View>

                <Text style={styles.quickAction} numberOfLines={1}>
                  {isLogging ? 'Saving...' : 'Start & log'}
                </Text>
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
  trackerError: { color: palette.danger, fontSize: 12 },
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
    gap: spacing.sm,
    height: 144,
    justifyContent: 'space-between',
    backgroundColor: palette.surface,
  },
  quickCardDisabled: { opacity: 0.6 },
  quickCopy: { gap: spacing.xs },
  quickHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  quickTitle: { fontWeight: '700', color: palette.text },
  quickMeta: { color: palette.mutedText, fontSize: 12, lineHeight: 18 },
  quickAction: { color: palette.primary, fontWeight: '700', marginTop: spacing.xs },
});
