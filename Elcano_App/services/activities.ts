import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { STEP_TO_COIN_RATE, calculateCoinDeltaFromSteps } from './coinConversion';
import { addStepsToDay, buildDateKey } from './dailySteps';
import { fetchUserProfile, updateUserProgress } from './userProfile';

type ActivityType = 'walk' | 'run' | 'bike' | 'other';

export interface ActivityLogInput {
  title?: string;
  type: ActivityType;
  steps: number;
  durationMinutes?: number;
  distanceKm?: number;
}

const activityCollection = (uid: string) => collection(doc(db, 'users', uid), 'activities');

export const logActivity = async (
  uid: string,
  activity: ActivityLogInput,
): Promise<{ coinsEarned: number; dateKey: string }> => {
  const profile = await fetchUserProfile(uid);
  const previousSteps = profile?.totalSteps ?? 0;
  const nextSteps = previousSteps + activity.steps;
  const coinsEarned = calculateCoinDeltaFromSteps(previousSteps, nextSteps, STEP_TO_COIN_RATE);
  const dateKey = buildDateKey();

  const activityDoc = doc(activityCollection(uid));
  await setDoc(activityDoc, {
    title: activity.title ?? `${activity.type} session`,
    type: activity.type,
    steps: activity.steps,
    durationMinutes: activity.durationMinutes ?? null,
    distanceKm: activity.distanceKm ?? null,
    status: 'completed',
    dateKey,
    date: serverTimestamp(),
    completedAt: serverTimestamp(),
    coinsEarned,
  });

  await Promise.all([
    updateUserProgress(uid, {
      totalStepsDelta: activity.steps,
      coinsDelta: coinsEarned,
    }),
    addStepsToDay(uid, dateKey, activity.steps),
  ]);

  return { coinsEarned, dateKey };
};
