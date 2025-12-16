import { useEffect, useState } from 'react';
import { CollectionReference, Timestamp, collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { RedemptionSession } from '../services/redemptions';

const redemptionCollection = (uid: string): CollectionReference =>
  collection(doc(db, 'users', uid), 'redemptions');

export const useActiveRedemption = (uid?: string | null, redemptionId?: string | null) => {
  const [redemption, setRedemption] = useState<RedemptionSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!uid && !!redemptionId);

  useEffect(() => {
    if (!uid || !redemptionId) {
      setRedemption(null);
      setIsLoading(false);
      return;
    }

    const activeRef = doc(redemptionCollection(uid), redemptionId);

    const unsubscribe = onSnapshot(activeRef, (snapshot) => {
      if (!snapshot.exists()) {
        setRedemption(null);
        setIsLoading(false);
        return;
      }

      const data = snapshot.data();
      const expiresAt = data.expiresAt as Timestamp | undefined;
      const expiresAtMs = expiresAt?.toMillis();

      if (!expiresAtMs || expiresAtMs <= Date.now()) {
        deleteDoc(activeRef);
        setRedemption(null);
        setIsLoading(false);
        return;
      }

      setRedemption({ id: snapshot.id, ...data, expiresAt } as RedemptionSession);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [redemptionId, uid]);

  return { redemption, isLoading };
};
