import { Timestamp, collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export interface AchievementStats {
  totalSteps: number;
  todaySteps?: number;
  activitiesLogged?: number;
}

interface AchievementDefinition {
  id: string;
  title: string;
  coins: number;
  isUnlocked: (stats: AchievementStats) => boolean;
}

const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first-steps',
    title: 'First Steps',
    coins: 5,
    isUnlocked: (stats) => stats.totalSteps > 0,
  },
  {
    id: 'walker',
    title: 'Walker',
    coins: 10,
    isUnlocked: (stats) => stats.totalSteps >= 1000,
  },
  {
    id: 'active-day',
    title: 'Active Day',
    coins: 15,
    isUnlocked: (stats) => (stats.todaySteps ?? 0) >= 3000,
  },
  {
    id: 'marathon',
    title: 'Marathon',
    coins: 20,
    isUnlocked: (stats) => (stats.activitiesLogged ?? 0) >= 5,
  },
];

export const checkAchievements = async (uid: string, stats: AchievementStats): Promise<void> =>
  runTransaction(db, async (transaction) => {
    const eligible = ACHIEVEMENTS.filter((achievement) => achievement.isUnlocked(stats));

    if (eligible.length === 0) {
      return;
    }

    const userRef = doc(db, 'users', uid);
    const userSnapshot = await transaction.get(userRef);

    if (!userSnapshot.exists()) {
      return;
    }

    const currentAchievements = new Set<string>((userSnapshot.data()?.achievements ?? []) as string[]);
    const achievementsRef = collection(userRef, 'achievements');
    const earned: AchievementDefinition[] = [];

    for (const achievement of eligible) {
      const achievementRef = doc(achievementsRef, achievement.id);
      const achievementSnapshot = await transaction.get(achievementRef);

      if (achievementSnapshot.exists()) {
        currentAchievements.add(achievement.id);
        continue;
      }

      earned.push(achievement);
    }

    if (earned.length === 0) {
      return;
    }

    const coinsToAward = earned.reduce((total, achievement) => total + achievement.coins, 0);
    const updatedAchievementIds = Array.from(new Set([...currentAchievements, ...earned.map((item) => item.id)]));
    const currentCoins = userSnapshot.data()?.coins ?? 0;

    transaction.update(userRef, {
      coins: currentCoins + coinsToAward,
      achievements: updatedAchievementIds,
    });

    earned.forEach((achievement) => {
      const achievementRef = doc(achievementsRef, achievement.id);

      transaction.set(achievementRef, {
        badgeId: achievement.title,
        challengeId: achievement.id,
        coinsAwarded: achievement.coins,
        meta: { type: 'demo-achievement' },
        awardedAt: serverTimestamp() as Timestamp,
      });
    });
  });
