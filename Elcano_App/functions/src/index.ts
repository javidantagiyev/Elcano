import {setGlobalOptions} from "firebase-functions";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import {initializeApp} from "firebase-admin/app";
import {FieldValue, Timestamp, getFirestore} from "firebase-admin/firestore";

setGlobalOptions({maxInstances: 10, region: "us-central1"});

initializeApp();

const db = getFirestore();

type ChallengeRuleType = "daily_steps";

type ChallengeRule = {
  type: ChallengeRuleType;
  target: number;
  dateField?: string;
};

type ChallengeReward = {
  badgeId: string;
  badgeLabel?: string;
  coins: number;
};

type ChallengeDefinition = {
  id: string;
  title: string;
  description?: string;
  active: boolean;
  rule: ChallengeRule;
  reward: ChallengeReward;
};

type ActivityEntry = {
  steps?: number;
  date?: Timestamp | string;
  dateKey?: string;
};

type CompletionRecord = {
  challenge: ChallengeDefinition;
  badgeId: string;
  coins: number;
};

const getDateKey = (value?: unknown): string => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.split("T")[0] ?? value;
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString().split("T")[0];
  }

  return "";
};

const fetchActiveChallenges = async (): Promise<ChallengeDefinition[]> => {
  const snapshot = await db.collection("challenges").where("active", "==", true).get();

  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();

    return {
      id: docSnapshot.id,
      title: (data.title as string) ?? "Untitled challenge",
      description: data.description as string | undefined,
      active: data.active !== false,
      rule: {
        type: (data.rule?.type as ChallengeRuleType) ?? "daily_steps",
        target: (data.rule?.target as number) ?? 0,
        dateField: data.rule?.dateField ?? "date",
      },
      reward: {
        badgeId: (data.reward?.badgeId as string) ?? docSnapshot.id,
        badgeLabel: data.reward?.badgeLabel as string | undefined,
        coins: (data.reward?.coins as number) ?? 0,
      },
    } satisfies ChallengeDefinition;
  });
};

const hasCompletedDailySteps = (rule: ChallengeRule, activity: ActivityEntry): boolean => {
  if (rule.type !== "daily_steps") {
    return false;
  }

  const dateKey = getDateKey(activity.dateKey ?? activity.date);
  const todayKey = new Date().toISOString().split("T")[0];

  if (!dateKey || dateKey !== todayKey) {
    return false;
  }

  const steps = Number(activity.steps ?? 0);
  return steps >= rule.target;
};

const evaluateCompletions = (
  challenges: ChallengeDefinition[],
  activity: ActivityEntry,
  alreadyEarned: Set<string>,
): CompletionRecord[] => {
  return challenges.reduce<CompletionRecord[]>((completed, challenge) => {
    if (alreadyEarned.has(challenge.reward.badgeId)) {
      return completed;
    }

    if (challenge.rule.type === "daily_steps" && hasCompletedDailySteps(challenge.rule, activity)) {
      completed.push({
        challenge,
        badgeId: challenge.reward.badgeId,
        coins: challenge.reward.coins,
      });
    }

    return completed;
  }, []);
};

const buildNotificationPayload = (completion: CompletionRecord) => ({
  type: "challenge_completed",
  title: `${completion.challenge.title} completed`,
  message: `You earned the ${completion.challenge.reward.badgeLabel ?? completion.badgeId} badge and ${
    completion.coins
  } coins!`,
  challengeId: completion.challenge.id,
  createdAt: FieldValue.serverTimestamp(),
});

export const handleActivityUpdate = onDocumentWritten("users/{uid}/activities/{activityId}", async (event) => {
  const activity = event.data?.after.data() as ActivityEntry | undefined;

  if (!activity) {
    logger.debug("Activity document removed or missing payload", {path: event.document});
    return;
  }

  const uid = event.params.uid as string;
  const userRef = db.collection("users").doc(uid);
  const userSnapshot = await userRef.get();

  if (!userSnapshot.exists) {
    logger.warn("User profile not found for activity", {uid, path: event.document});
    return;
  }

  const currentAchievements: string[] = (userSnapshot.get("achievements") as string[]) ?? [];
  const alreadyEarned = new Set(currentAchievements);

  const challenges = await fetchActiveChallenges();
  const completions = evaluateCompletions(challenges, activity, alreadyEarned);

  if (completions.length === 0) {
    return;
  }

  const batch = db.batch();
  const awardedBadges = completions.map((completion) => completion.badgeId);
  const newAchievements = Array.from(new Set([...currentAchievements, ...awardedBadges]));
  const totalCoins = completions.reduce((sum, completion) => sum + completion.coins, 0);

  batch.update(userRef, {
    achievements: newAchievements,
    coins: FieldValue.increment(totalCoins),
  });

  completions.forEach((completion) => {
    const achievementRef = userRef.collection("achievements").doc(completion.challenge.id);
    batch.set(achievementRef, {
      challengeId: completion.challenge.id,
      badgeId: completion.badgeId,
      coinsAwarded: completion.coins,
      meta: { ruleType: completion.challenge.rule.type },
      awardedAt: FieldValue.serverTimestamp(),
      activityId: event.params.activityId,
      dateKey: getDateKey(activity.dateKey ?? activity.date),
    });

    const notificationRef = userRef.collection("notifications").doc();
    batch.set(notificationRef, buildNotificationPayload(completion));
  });

  await batch.commit();

  logger.info("Awarded challenges", {
    uid,
    completions: completions.map((completion) => completion.challenge.id),
    totalCoins,
  });
});
