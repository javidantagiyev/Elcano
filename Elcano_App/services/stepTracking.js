import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

const todayKey = () => new Date().toISOString().split('T')[0];

const userDoc = (uid) => doc(db, 'users', uid);
const dailyCollection = (uid) => collection(db, 'dailySteps', uid, 'entries');
const dailyDoc = (uid, dateKey = todayKey()) => doc(dailyCollection(uid), dateKey);
const activitiesCollection = (uid) => collection(db, 'activities', uid);
const sessionsCollection = (uid) => collection(db, 'sessions', uid);

export const fetchUserTotals = async (uid) => {
  const snapshot = await getDoc(userDoc(uid));
  if (!snapshot.exists()) {
    return { totalSteps: null, coins: null };
  }

  const data = snapshot.data();
  return {
    totalSteps: typeof data.totalSteps === 'number' ? data.totalSteps : 0,
    coins: typeof data.coins === 'number' ? data.coins : 0,
  };
};

export const fetchTodaySteps = async (uid, date = todayKey()) => {
  const snapshot = await getDoc(dailyDoc(uid, date));
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return typeof data.steps === 'number' ? data.steps : 0;
};

export const subscribeToActivityHistory = (uid, callback, limitCount = 7) => {
  const activityQuery = query(
    activitiesCollection(uid),
    orderBy('timestamp', 'desc'),
    limit(limitCount),
  );

  return onSnapshot(activityQuery, (snapshot) => {
    const entries = snapshot.docs.map((docSnapshot) => ({
      id: docSnapshot.id,
      ...docSnapshot.data(),
    }));
    callback(entries);
  });
};

export const finalizeStepSession = async (uid, { steps, startedAt, endedAt, type = 'walk' }) => {
  if (!uid || !steps || steps <= 0) {
    return { totalSteps: null, todaySteps: null };
  }

  const dateKey = todayKey();
  const userRef = userDoc(uid);
  const dailyRef = dailyDoc(uid, dateKey);

  const { totalSteps, todaySteps } = await runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const previousTotal = userSnapshot.exists() && typeof userSnapshot.data().totalSteps === 'number'
      ? userSnapshot.data().totalSteps
      : 0;

    transaction.set(
      userRef,
      {
        totalSteps: increment(steps),
        coins: userSnapshot.exists() && typeof userSnapshot.data().coins === 'number'
          ? userSnapshot.data().coins
          : 0,
      },
      { merge: true },
    );

    const dailySnapshot = await transaction.get(dailyRef);
    const previousDaily = dailySnapshot.exists() && typeof dailySnapshot.data().steps === 'number'
      ? dailySnapshot.data().steps
      : 0;

    transaction.set(
      dailyRef,
      { steps: increment(steps), date: dateKey, updatedAt: serverTimestamp() },
      { merge: true },
    );

    return { totalSteps: previousTotal + steps, todaySteps: previousDaily + steps };
  });

  await addDoc(activitiesCollection(uid), {
    type,
    steps,
    timestamp: serverTimestamp(),
    dateKey,
  });

  await addDoc(sessionsCollection(uid), {
    steps,
    startedAt: startedAt ?? serverTimestamp(),
    endedAt: endedAt ?? serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  return { totalSteps, todaySteps };
};

export const saveAchievementReward = async (uid, achievementId, { badgeId, coinsAwarded = 0, meta = {} } = {}) => {
  const achievementRef = doc(collection(userDoc(uid), 'achievements'), achievementId);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(achievementRef);
    if (snapshot.exists()) {
      return;
    }

    const userSnapshot = await transaction.get(userDoc(uid));
    const currentCoins = userSnapshot.exists() && typeof userSnapshot.data().coins === 'number'
      ? userSnapshot.data().coins
      : 0;

    transaction.set(achievementRef, {
      badgeId: badgeId ?? achievementId,
      coinsAwarded,
      meta,
      awardedAt: serverTimestamp(),
    });

    transaction.set(
      userDoc(uid),
      {
        coins: currentCoins + coinsAwarded,
      },
      { merge: true },
    );
  });
};
