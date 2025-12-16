import { updateUserProgress } from './userProfile';

export const STEP_TO_COIN_RATE = 5000;

/**
 * Convert a raw step count into the number of coins earned at the configured
 * conversion rate.
 */
export const stepsToCoins = (steps: number, conversionRate: number = STEP_TO_COIN_RATE): number => {
  const safeSteps = Math.max(0, steps);
  return Math.floor(safeSteps / conversionRate);
};

/**
 * Calculate the number of additional coins earned when a user's step count
 * increases. Returns 0 when the step count decreases or does not cross a new
 * conversion threshold.
 */
export const calculateCoinDeltaFromSteps = (
  previousSteps: number,
  nextSteps: number,
  conversionRate: number = STEP_TO_COIN_RATE,
): number => {
  if (nextSteps <= previousSteps) {
    return 0;
  }

  const previousCoins = stepsToCoins(previousSteps, conversionRate);
  const nextCoins = stepsToCoins(nextSteps, conversionRate);
  return Math.max(0, nextCoins - previousCoins);
};

interface StepConversionUpdate {
  coinsDelta: number;
  totalSteps: number;
}

/**
 * Build the incremental progress update for a step change. Returns null when no
 * progress changes are required.
 */
export const buildStepConversionUpdate = (
  previousSteps: number,
  nextSteps: number,
  conversionRate: number = STEP_TO_COIN_RATE,
): StepConversionUpdate | null => {
  if (nextSteps < 0) {
    return null;
  }

  const coinsDelta = calculateCoinDeltaFromSteps(previousSteps, nextSteps, conversionRate);

  if (coinsDelta === 0 && nextSteps === previousSteps) {
    return null;
  }

  return {
    coinsDelta,
    totalSteps: nextSteps,
  };
};

/**
 * Apply a step-to-coin conversion in Firestore. The function only writes when a
 * step change or new coin conversion is detected, preventing duplicate
 * conversions.
 */
export const syncStepConversion = async (
  uid: string,
  previousSteps: number,
  nextSteps: number,
  conversionRate: number = STEP_TO_COIN_RATE,
): Promise<number> => {
  const update = buildStepConversionUpdate(previousSteps, nextSteps, conversionRate);

  if (!update) {
    return 0;
  }

  await updateUserProgress(uid, {
    coinsDelta: update.coinsDelta,
    totalSteps: update.totalSteps,
  });

  return update.coinsDelta;
};
