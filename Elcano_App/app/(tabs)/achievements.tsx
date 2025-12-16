import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ChallengeDefinition,
  EarnedAchievement,
  subscribeToActiveChallenges,
  subscribeToUserAchievements,
} from '../../services/challenges';
import { auth, db } from '../../firebaseConfig';
import { Timestamp, collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import AppScreen from '../../components/AppScreen';

const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

const demoChallenges: ChallengeDefinition[] = [
  {
    id: 'demo-commuter',
    title: 'Commuter Champion',
    description: 'Log a 20 minute walk or bike ride to earn a bonus.',
    active: true,
    rule: { type: 'daily_steps', target: 2000, dateField: 'date' },
    reward: { badgeId: 'commuter', badgeLabel: 'Commuter', coins: 10 },
  },
  {
    id: 'demo-weekend',
    title: 'Weekend Warrior',
    description: 'Stack up 5,000 steps in a single day.',
    active: true,
    rule: { type: 'daily_steps', target: 5000, dateField: 'date' },
    reward: { badgeId: 'warrior', badgeLabel: 'Warrior', coins: 20 },
  },
  {
    id: 'demo-adventurer',
    title: 'Neighborhood Adventurer',
    description: 'Hit 8,000 steps to unlock this badge.',
    active: true,
    rule: { type: 'daily_steps', target: 8000, dateField: 'date' },
    reward: { badgeId: 'adventurer', badgeLabel: 'Adventurer', coins: 30 },
  },
];

const demoEarnedAchievements: EarnedAchievement[] = [
  {
    id: 'demo-commuter-earned',
    badgeId: 'Commuter',
    challengeId: 'demo-commuter',
    awardedAt: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 6)),
    coinsAwarded: 10,
  },
  {
    id: 'demo-weekend-earned',
    badgeId: 'Weekend Warrior',
    challengeId: 'demo-weekend',
    awardedAt: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 60 * 24)),
    coinsAwarded: 20,
  },
];

interface ActivityWithDate {
  steps: number;
}

const getDateKey = (value?: Timestamp | string): string => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value.split('T')[0] ?? value;
  }

  return value.toDate().toISOString().split('T')[0];
};

const todayKey = new Date().toISOString().split('T')[0];

const Badge = ({ label }: { label: string }) => (
  <View style={styles.badge}>
    <Ionicons name="ribbon-outline" size={16} color="#fff" />
    <Text style={styles.badgeText}>{label}</Text>
  </View>
);

const ChallengeCard = ({
  challenge,
  earned,
  todaySteps,
}: {
  challenge: ChallengeDefinition;
  earned: boolean;
  todaySteps: number;
}) => {
  const progress = useMemo(() => {
    if (challenge.rule.type === 'daily_steps') {
      return Math.min(1, todaySteps / Math.max(1, challenge.rule.target));
    }

    return 0;
  }, [challenge.rule.target, challenge.rule.type, todaySteps]);

  const badgeLabel = challenge.reward.badgeLabel ?? `${challenge.reward.badgeId} badge`;

  return (
    <View style={[styles.challengeCard, earned && styles.challengeCardEarned]}>
      <View style={styles.challengeHeader}>
        <View style={styles.titleRow}>
          <Ionicons name="flag-outline" size={20} color={earned ? '#2E7D32' : '#FF8C00'} />
          <Text style={styles.challengeTitle}>{challenge.title}</Text>
        </View>
        <Badge label={badgeLabel} />
      </View>

      {challenge.description ? <Text style={styles.description}>{challenge.description}</Text> : null}

      {challenge.rule.type === 'daily_steps' && (
        <Text style={styles.caption}>
          Goal: {challenge.rule.target.toLocaleString()} steps · Today: {todaySteps.toLocaleString()}
        </Text>
      )}

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="medal-outline" size={16} color={earned ? '#2E7D32' : '#FF8C00'} />
          <Text style={styles.metaText}>{earned ? 'Completed' : 'In progress'}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="sparkles-outline" size={16} color="#6C63FF" />
          <Text style={styles.metaText}>+{challenge.reward.coins} coins</Text>
        </View>
      </View>
    </View>
  );
};

export default function AchievementsScreen() {
  const [challenges, setChallenges] = useState<ChallengeDefinition[]>([]);
  const [achievements, setAchievements] = useState<EarnedAchievement[]>([]);
  const [todaySteps, setTodaySteps] = useState<number>(0);
  const hasLiveChallenges = challenges.length > 0;
  const visibleChallenges = useMemo(
    () => (hasLiveChallenges ? challenges : shuffle(demoChallenges)),
    [challenges, hasLiveChallenges],
  );
  const visibleAchievements = useMemo(
    () => (achievements.length > 0 ? achievements : demoEarnedAchievements),
    [achievements],
  );

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      return undefined;
    }

    const unsubscribeChallenges = subscribeToActiveChallenges(setChallenges);
    const unsubscribeAchievements = subscribeToUserAchievements(user.uid, setAchievements);

    const todayActivitiesQuery = query(
      collection(db, 'users', user.uid, 'activities'),
      orderBy('date', 'desc'),
      limit(5),
    );

    const unsubscribeTodayActivity = onSnapshot(todayActivitiesQuery, (snapshot) => {
      if (snapshot.empty) {
        setTodaySteps(0);
        return;
      }

      const todaysEntry = snapshot.docs.find((docSnapshot) => getDateKey(docSnapshot.data().date) === todayKey);
      setTodaySteps((todaysEntry?.data() as ActivityWithDate)?.steps ?? 0);
    });

    return () => {
      unsubscribeChallenges();
      unsubscribeAchievements();
      unsubscribeTodayActivity();
    };
  }, []);

  const earnedBadges = useMemo(
    () => new Set(visibleAchievements.map((item) => item.badgeId)),
    [visibleAchievements],
  );

  return (
    <AppScreen scrollable contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Achievements</Text>
        <Text style={styles.subtitle}>Complete challenges to earn badges and bonus coins.</Text>
      </View>

      {visibleChallenges.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="sparkles-outline" size={32} color="#999" />
          <Text style={styles.emptyTitle}>No challenges yet</Text>
          <Text style={styles.emptyCopy}>Check back soon for new ways to earn rewards.</Text>
        </View>
      ) : (
        <View>
          {!hasLiveChallenges && (
            <Text style={styles.demoNotice}>Sample challenges are shown until real challenges are configured.</Text>
          )}
          <View style={styles.list}>
            {visibleChallenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                earned={earnedBadges.has(challenge.reward.badgeId)}
                todaySteps={todaySteps}
              />
            ))}
          </View>
        </View>
      )}

      {visibleAchievements.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recently earned</Text>
            <Ionicons name="flash-outline" size={20} color="#FF8C00" />
          </View>
          {visibleAchievements
            .slice()
            .sort((a, b) => b.awardedAt.toMillis() - a.awardedAt.toMillis())
            .map((achievement) => (
              <View key={achievement.id} style={styles.achievementRow}>
                <View style={styles.achievementBadge}>
                  <Ionicons name="ribbon" size={18} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.achievementTitle}>{achievement.badgeId}</Text>
                  <Text style={styles.achievementMeta}>
                    {new Date(achievement.awardedAt.toMillis()).toLocaleDateString()} · +{achievement.coinsAwarded} coins
                  </Text>
                </View>
              </View>
            ))}
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  header: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#1F1F1F' },
  subtitle: { color: '#6B6B6B', marginTop: 4 },
  demoNotice: { color: '#666', fontSize: 12, marginBottom: 8 },
  list: { gap: 12 },
  challengeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    gap: 10,
  },
  challengeCardEarned: {
    borderWidth: 1,
    borderColor: '#2E7D3220',
    backgroundColor: '#F1F8F4',
  },
  challengeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  challengeTitle: { fontSize: 18, fontWeight: '700', color: '#1F1F1F' },
  description: { color: '#555' },
  caption: { color: '#7A7A7A', fontSize: 12 },
  progressBar: {
    height: 8,
    width: '100%',
    backgroundColor: '#EFEFEF',
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF8C00',
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#444', fontWeight: '600' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6C63FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: { color: '#fff', fontWeight: '700' },
  emptyState: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1F1F1F' },
  emptyCopy: { color: '#666', textAlign: 'center' },
  section: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F1F1F' },
  achievementRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  achievementBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF8C00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementTitle: { fontWeight: '700', color: '#1F1F1F' },
  achievementMeta: { color: '#666', fontSize: 12 },
});
