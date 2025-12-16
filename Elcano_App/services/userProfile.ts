import {
  DocumentReference,
  Timestamp,
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

export type UserAchievement = string;

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  age: number;
  totalSteps: number;
  coins: number;
  achievements: UserAchievement[];
  createdAt: Timestamp;
}

interface CreateUserProfileInput {
  uid: string;
  name: string;
  email: string;
  age: number;
  totalSteps?: number;
  coins?: number;
  achievements?: UserAchievement[];
}

export interface UserProgressUpdate {
  /**
   * Absolute value to set for total steps. Use this instead of totalStepsDelta
   * when you want to overwrite the user's step count.
   */
  totalSteps?: number;
  /**
   * Incremental change to apply to the current step count.
   */
  totalStepsDelta?: number;
  /**
   * Absolute value to set for coins. Use this instead of coinsDelta when you
   * want to overwrite the user's coin balance.
   */
  coins?: number;
  /**
   * Incremental change to apply to the current coin balance.
   */
  coinsDelta?: number;
  /**
   * Replace the user's achievement list. Use appendAchievements to add new
   * achievements without overwriting existing ones.
   */
  achievements?: UserAchievement[];
  /**
   * Additional achievements to append to the existing list. Duplicates are not
   * automatically filtered.
   */
  appendAchievements?: UserAchievement[];
}

export interface UserProfileUpdate {
  name?: string;
  email?: string;
  age?: number;
}

const userDoc = (uid: string): DocumentReference<UserProfile> => doc(db, 'users', uid) as DocumentReference<UserProfile>;

/**
 * Create a fully-typed user profile document in Firestore. Any missing numeric
 * values default to 0, achievements default to an empty array, and createdAt is
 * set by the server for consistency.
 */
export const createUserProfile = async ({
  uid,
  name,
  email,
  age,
  achievements = [],
  coins = 0,
  totalSteps = 0,
}: CreateUserProfileInput): Promise<void> => {
  await setDoc(userDoc(uid), {
    uid,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    age,
    totalSteps,
    coins,
    achievements,
    createdAt: serverTimestamp() as Timestamp,
  });
};

/**
 * Fetch a user profile by uid. Returns null when the document does not exist.
 */
export const fetchUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const snapshot = await getDoc(userDoc(uid));
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return {
    uid: data.uid,
    name: data.name,
    email: data.email,
    age: data.age,
    totalSteps: data.totalSteps,
    coins: data.coins,
    achievements: data.achievements ?? [],
    createdAt: data.createdAt,
  };
};

/**
 * Update a user's progress metrics. Supports overwriting or incrementing numeric
 * values and replacing or appending achievements.
 */
export const updateUserProgress = async (
  uid: string,
  { achievements, appendAchievements, coins, coinsDelta, totalSteps, totalStepsDelta }: UserProgressUpdate,
): Promise<void> => {
  const updates: Record<string, unknown> = {};

  if (typeof totalSteps === 'number') {
    updates.totalSteps = totalSteps;
  } else if (typeof totalStepsDelta === 'number') {
    updates.totalSteps = increment(totalStepsDelta);
  }

  if (typeof coins === 'number') {
    updates.coins = coins;
  } else if (typeof coinsDelta === 'number') {
    updates.coins = increment(coinsDelta);
  }

  if (achievements) {
    updates.achievements = achievements;
  } else if (appendAchievements?.length) {
    const currentProfile = await fetchUserProfile(uid);
    if (currentProfile) {
      updates.achievements = [...currentProfile.achievements, ...appendAchievements];
    } else {
      updates.achievements = appendAchievements;
    }
  }

  if (Object.keys(updates).length === 0) {
    return;
  }

  await updateDoc(userDoc(uid), updates);
};

export const updateUserProfile = async (uid: string, { name, email, age }: UserProfileUpdate): Promise<void> => {
  const updates: Partial<UserProfile> = {};

  if (typeof name === 'string') {
    updates.name = name.trim();
  }

  if (typeof email === 'string') {
    updates.email = email.trim().toLowerCase();
  }

  if (typeof age === 'number' && Number.isFinite(age) && age > 0) {
    updates.age = age;
  }

  if (Object.keys(updates).length === 0) {
    return;
  }

  await updateDoc(userDoc(uid), updates);
};
