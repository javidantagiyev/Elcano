import { Timestamp, collection, deleteDoc, doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const REDEMPTION_WINDOW_MS = 5 * 60 * 1000;

export interface RedemptionSession {
  id: string;
  offerId: string;
  partnerName?: string;
  reward?: string;
  coinCost?: number;
  isDemo?: boolean;
  redeemedAt?: Timestamp;
  expiresAt: Timestamp;
}

const userDocRef = (uid: string) => doc(db, 'users', uid);

const redemptionCollection = (uid: string) => collection(userDocRef(uid), 'redemptions');

const redemptionRef = (uid: string, redemptionId: string) =>
  doc(collection(userDocRef(uid), 'redemptions'), redemptionId);

export const isRedemptionActive = async (
  uid: string,
  redemptionId: string
): Promise<RedemptionSession | null> => {
  const activeRef = redemptionRef(uid, redemptionId);
  const snapshot = await getDoc(activeRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  const expiresAt = data.expiresAt as Timestamp | undefined;

  if (!expiresAt || expiresAt.toMillis() <= Date.now()) {
    await deleteDoc(activeRef);
    return null;
  }

  return { id: snapshot.id, ...data } as RedemptionSession;
};

export const redeemOffer = async (
  uid: string,
  offerId: string,
  cost: number,
  isDemo: boolean,
  metadata?: { partnerName?: string; reward?: string }
): Promise<RedemptionSession> => {
  const newRedemptionRef = doc(redemptionCollection(uid));
  const userRef = userDocRef(uid);
  const now = Date.now();
  const expiresAt = Timestamp.fromMillis(now + REDEMPTION_WINDOW_MS);

  await runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);

    if (!userSnapshot.exists()) {
      throw new Error('User profile not found.');
    }

    const currentCoins = userSnapshot.data().coins ?? 0;

    if (currentCoins < cost) {
      throw new Error('INSUFFICIENT_COINS');
    }

    transaction.update(userRef, { coins: currentCoins - cost });

    const redemptionRecord = {
      offerId,
      partnerName: metadata?.partnerName,
      reward: metadata?.reward,
      coinCost: cost,
      isDemo,
      redeemedAt: serverTimestamp(),
      expiresAt,
    };

    transaction.set(newRedemptionRef, redemptionRecord);
  });

  const refreshedSnapshot = await getDoc(newRedemptionRef);

  if (!refreshedSnapshot.exists()) {
    throw new Error('Unable to create redemption.');
  }

  return { id: refreshedSnapshot.id, ...refreshedSnapshot.data() } as RedemptionSession;
};
