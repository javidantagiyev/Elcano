import {
  DocumentData,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  Timestamp,
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

export type ChallengeRuleType = 'daily_steps';

export interface ChallengeRule {
  type: ChallengeRuleType;
  target: number;
  /**
   * Name of the date field stored on the activity document. Defaults to "date"
   * and accepts either an ISO date string or Firestore Timestamp.
   */
  dateField?: string;
}

export interface ChallengeReward {
  badgeId: string;
  badgeLabel?: string;
  coins: number;
}

export interface ChallengeDefinition {
  id: string;
  title: string;
  description?: string;
  active: boolean;
  rule: ChallengeRule;
  reward: ChallengeReward;
}

export interface EarnedAchievement {
  id: string;
  badgeId: string;
  challengeId: string;
  awardedAt: Timestamp;
  coinsAwarded: number;
  meta?: Record<string, unknown>;
}

const parseChallenge = (snapshot: QueryDocumentSnapshot<DocumentData>): ChallengeDefinition => {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    title: data.title ?? 'Untitled challenge',
    description: data.description,
    active: data.active !== false,
    rule: {
      type: data.rule?.type ?? 'daily_steps',
      target: data.rule?.target ?? 0,
      dateField: data.rule?.dateField ?? 'date',
    },
    reward: {
      badgeId: data.reward?.badgeId ?? snapshot.id,
      badgeLabel: data.reward?.badgeLabel,
      coins: data.reward?.coins ?? 0,
    },
  };
};

const getDateKey = (value: unknown): string => {
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

export const subscribeToActiveChallenges = (
  callback: (challenges: ChallengeDefinition[]) => void,
): (() => void) => {
  const challengeQuery = query(collection(db, 'challenges'), where('active', '==', true));

  return onSnapshot(challengeQuery, (snapshot) => {
    const challenges = snapshot.docs.map(parseChallenge);
    callback(challenges);
  });
};

export const subscribeToUserAchievements = (
  uid: string,
  callback: (achievements: EarnedAchievement[]) => void,
): (() => void) =>
  onSnapshot(collection(doc(db, 'users', uid), 'achievements'), (snapshot) => {
    const earned = snapshot.docs
      .map((docSnapshot) => {
        const data = docSnapshot.data();

        if (!data.awardedAt) {
          return null;
        }

        return {
          id: docSnapshot.id,
          badgeId: data.badgeId,
          challengeId: data.challengeId,
          awardedAt: data.awardedAt as Timestamp,
          coinsAwarded: data.coinsAwarded ?? 0,
          meta: data.meta,
        } as EarnedAchievement;
      })
      .filter(Boolean) as EarnedAchievement[];

    callback(earned);
  });

export const getTodayStepsFromSnapshot = (
  activitySnapshots: Array<DocumentSnapshot<DocumentData>>,
  dateField: string = 'date',
): number => {
  const todayKey = new Date().toISOString().split('T')[0];

  return activitySnapshots.reduce((steps, snapshot) => {
    const data = snapshot.data();

    if (!data) {
      return steps;
    }

    const dateValue = data[dateField];
    const dateKey = getDateKey(dateValue);

    if (dateKey !== todayKey) {
      return steps;
    }

    return Math.max(steps, data.steps ?? 0);
  }, 0);
};
