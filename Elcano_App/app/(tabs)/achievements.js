import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { subscribeToActiveChallenges, subscribeToUserAchievements } from '../../services/challenges';
import { auth, db } from '../../firebaseConfig';
import { Timestamp, doc, onSnapshot, runTransaction } from 'firebase/firestore';

const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);

const demoChallenges = [
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

const demoEarnedAchievements = [];

const getDateKey = (value) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value.split('T')[0] ?? '';
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString().split('T')[0];
  }

  return '';
};

const todayKey = new Date().toISOString().split('T')[0];

const Badge = ({ label }) => (
  <View style={styles.badge}>
    <Ionicons name="ribbon-outline" size={16} color="#fff" />
    <Text style={styles.badgeText}>{label}</Text>
  </View>
);

const ChallengeCard = ({ challenge, earned, todaySteps }) => {
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
          Goal: {challenge.rule.target.toLocaleString()} steps · Today: {todaySteps?.toLocaleString?.() ?? '—'}
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
  const [challenges, setChallenges] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [todaySteps, setTodaySteps] = useState(null);
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

    const todayRef = doc(db, 'dailySteps', user.uid, 'entries', todayKey);
    const unsubscribeTodaySteps = onSnapshot(todayRef, (snapshot) => {
      if (!snapshot.exists()) {
        setTodaySteps(null);
        return;
      }

      const data = snapshot.data();
      setTodaySteps(typeof data.steps === 'number' ? data.steps : 0);
    });

    return () => {
      unsubscribeChallenges();
      unsubscribeAchievements();
      unsubscribeTodaySteps();
    };
  }, []);

  const earnedBadges = useMemo(
    () => new Set(visibleAchievements.map((item) => item.badgeId)),
    [visibleAchievements],
  );

  useEffect(() => {
    const user = auth.currentUser;

    if (!user || achievements.length === 0) {
      return;
    }

    const userRef = doc(db, 'users', user.uid);

    const creditCoins = async () => {
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(userRef);
        const rewarded = new Set(snapshot.exists() && Array.isArray(snapshot.data().rewardedAchievements)
          ? snapshot.data().rewardedAchievements
          : []);

        let coinsToAdd = 0;
        const newRewards = [];

        achievements.forEach((achievement) => {
          if (rewarded.has(achievement.id)) {
            return;
          }

          coinsToAdd += achievement.coinsAwarded ?? 0;
          rewarded.add(achievement.id);
          newRewards.push(achievement.id);
        });

        if (coinsToAdd === 0 && newRewards.length === 0) {
          return;
        }

        const currentCoins = snapshot.exists() && typeof snapshot.data().coins === 'number'
          ? snapshot.data().coins
          : 0;

        transaction.set(
          userRef,
          {
            coins: currentCoins + coinsToAdd,
            rewardedAchievements: Array.from(rewarded),
          },
          { merge: true },
        );
      });
    };

    creditCoins();
  }, [achievements]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
                todaySteps={todaySteps ?? 0}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#1F1F1F' },
  subtitle: { color: '#6B6B6B', marginTop: 4 },
  demoNotice: { color: '#666', fontSize: 12, marginBottom: 8 },
  list: { gap: 12 },
  challengeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  challengeCardEarned: { borderColor: '#C8E6C9', backgroundColor: '#F1F8E9' },
  challengeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  challengeTitle: { fontSize: 18, fontWeight: '700', color: '#1F1F1F' },
  description: { color: '#555', marginBottom: 8 },
  caption: { color: '#777', fontSize: 12, marginBottom: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF8C00',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: { color: '#fff', marginLeft: 6, fontWeight: '700' },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#eee',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: { height: '100%', backgroundColor: '#FF8C00' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#555' },
  section: { marginTop: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F1F1F' },
  achievementRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  achievementBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FF8C00', alignItems: 'center', justifyContent: 'center' },
  achievementTitle: { fontWeight: '700', color: '#1F1F1F' },
  achievementMeta: { color: '#666', fontSize: 12 },
  emptyState: { alignItems: 'center', gap: 8, padding: 24 },
  emptyTitle: { fontWeight: '700', color: '#333', fontSize: 18 },
  emptyCopy: { color: '#666', textAlign: 'center' },
});
