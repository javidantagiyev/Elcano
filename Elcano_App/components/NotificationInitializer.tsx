import React, { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { ChallengeDefinition, subscribeToActiveChallenges, subscribeToUserAchievements } from '../services/challenges';
import {
  configureNotificationHandling,
  ensureDailyStepReminderScheduled,
  sendGoalCelebrationNotification,
} from '../services/notifications';
import { usePermissions } from '../context/PermissionsContext';

export default function NotificationInitializer({ children }: { children: React.ReactNode }) {
  useNotificationSetup();
  return <>{children}</>;
}

const useNotificationSetup = () => {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const permissionsGrantedRef = useRef(false);
  const deliveredAchievementsRef = useRef(new Set<string>());
  const hasHydratedAchievementsRef = useRef(false);
  const challengeMapRef = useRef<Record<string, ChallengeDefinition>>({});
  const { notificationStatus, requestNotificationPermission } = usePermissions();

  useEffect(() => {
    configureNotificationHandling();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null);
      hasHydratedAchievementsRef.current = false;
      deliveredAchievementsRef.current.clear();
    });

    return unsubscribe;
  }, []);

  useEffect(
    () =>
      subscribeToActiveChallenges((activeChallenges) => {
        challengeMapRef.current = activeChallenges.reduce(
          (acc, challenge) => {
            acc[challenge.id] = challenge;
            return acc;
          },
          {} as Record<string, ChallengeDefinition>,
        );
      }),
    [],
  );

  useEffect(() => {
    if (!uid) {
      return undefined;
    }

    let cancelled = false;

    (async () => {
      const status =
        notificationStatus === 'unknown'
          ? await requestNotificationPermission()
          : notificationStatus;

      if (cancelled) {
        return;
      }

      permissionsGrantedRef.current = status === 'granted';

      if (status === 'granted') {
        await ensureDailyStepReminderScheduled();
      }
    })();

    const unsubscribeAchievements = subscribeToUserAchievements(uid, (achievements) => {
      if (!hasHydratedAchievementsRef.current) {
        deliveredAchievementsRef.current = new Set(achievements.map((achievement) => achievement.id));
        hasHydratedAchievementsRef.current = true;
        return;
      }

      achievements.forEach((achievement) => {
        if (deliveredAchievementsRef.current.has(achievement.id)) {
          return;
        }

        deliveredAchievementsRef.current.add(achievement.id);

        if (!permissionsGrantedRef.current) {
          return;
        }

        const challengeTitle =
          challengeMapRef.current[achievement.challengeId]?.title ?? 'your daily goal';

        void sendGoalCelebrationNotification(challengeTitle, achievement.coinsAwarded);
      });
    });

    return () => {
      cancelled = true;
      unsubscribeAchievements();
    };
  }, [notificationStatus, requestNotificationPermission, uid]);
};
