import { doc, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const dailyStepsDoc = (uid: string, dateKey: string) => doc(db, 'dailySteps', uid, 'days', dateKey);

export const buildDateKey = (date: Date = new Date()): string => date.toISOString().split('T')[0];

export const addStepsToDay = async (uid: string, dateKey: string, stepsDelta: number): Promise<void> => {
  if (stepsDelta <= 0) {
    return;
  }

  await setDoc(
    dailyStepsDoc(uid, dateKey),
    {
      steps: increment(stepsDelta),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};
