import React, { createContext, useEffect, useRef, useState, useContext, useCallback } from 'react';
import { AppState } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { auth } from '../firebaseConfig';
import { fetchUserProfile } from '../services/userProfile';
import { calculateCoinDeltaFromSteps, STEP_TO_COIN_RATE, syncStepConversion } from '../services/coinConversion';
import { PermissionState } from '../services/permissions';
import { usePermissions } from './PermissionsContext';

interface UserContextType {
  steps: number;
  coins: number;
  pedometerPermission: PermissionState;
  isPedometerAvailable: PermissionState | 'checking';
}

const UserContext = createContext<UserContextType>({
  steps: 0,
  coins: 0,
  pedometerPermission: 'unknown',
  isPedometerAvailable: 'checking',
});

const STEP_SYNC_DEBOUNCE_MS = 15000;

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [steps, setSteps] = useState(0);
  const [coins, setCoins] = useState(0);
  const [pedometerPermission, setPedometerPermission] = useState<PermissionState>('unknown');
  const [isPedometerAvailable, setIsPedometerAvailable] = useState<PermissionState | 'checking'>('checking');
  const lastSyncedStepsRef = useRef(0);
  const pendingStepDeltaRef = useRef(0);
  const pendingSensorStepsRef = useRef(0);
  const pedometerSubscriptionRef = useRef<ReturnType<typeof Pedometer.watchStepCount> | null>(null);
  const pendingFlushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFlushingRef = useRef(false);
  const lastStepTimestampRef = useRef<Date>(new Date());
  const { motionStatus, requestMotionPermission } = usePermissions();

  useEffect(() => {
    const loadUserProfile = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const profile = await fetchUserProfile(currentUser.uid);
      if (profile) {
        setSteps(profile.totalSteps);
        setCoins(profile.coins);
        lastSyncedStepsRef.current = profile.totalSteps;
      }
    };

    loadUserProfile();
  }, []);

  const flushPendingSteps = useCallback(async () => {
    if (isFlushingRef.current) {
      return;
    }

    const delta = pendingStepDeltaRef.current;
    if (delta <= 0) {
      return;
    }

    isFlushingRef.current = true;
    pendingStepDeltaRef.current = 0;

    const previousSteps = lastSyncedStepsRef.current;
    const newTotalSteps = previousSteps + delta;
    const coinsEarned = calculateCoinDeltaFromSteps(previousSteps, newTotalSteps, STEP_TO_COIN_RATE);

    setSteps(newTotalSteps);

    if (coinsEarned > 0) {
      setCoins((currentCoins) => currentCoins + coinsEarned);
    }

    const currentUser = auth.currentUser;
    if (currentUser) {
      await syncStepConversion(currentUser.uid, previousSteps, newTotalSteps, STEP_TO_COIN_RATE);
    }

    lastSyncedStepsRef.current = newTotalSteps;
    lastStepTimestampRef.current = new Date();
    isFlushingRef.current = false;
  }, []);

  const scheduleFlush = useCallback(() => {
    if (pendingFlushTimeoutRef.current) {
      return;
    }

    pendingFlushTimeoutRef.current = setTimeout(() => {
      pendingFlushTimeoutRef.current = null;
      void flushPendingSteps();
    }, STEP_SYNC_DEBOUNCE_MS);
  }, [flushPendingSteps]);

  const stopForegroundTracking = useCallback(() => {
    if (pedometerSubscriptionRef.current?.remove) {
      pedometerSubscriptionRef.current.remove();
    }

    pedometerSubscriptionRef.current = null;
    pendingSensorStepsRef.current = 0;
  }, []);

  const startForegroundTracking = useCallback(() => {
    if (pedometerSubscriptionRef.current) {
      return;
    }

    pendingSensorStepsRef.current = 0;
    pedometerSubscriptionRef.current = Pedometer.watchStepCount(({ steps: sensorSteps }) => {
      const delta = Math.max(sensorSteps - pendingSensorStepsRef.current, 0);
      pendingSensorStepsRef.current = sensorSteps;

      if (delta > 0) {
        pendingStepDeltaRef.current += delta;
        scheduleFlush();
      }
    });
  }, [scheduleFlush]);

  const reconcileStepsSinceLastCheck = useCallback(async () => {
    if (pedometerPermission !== 'granted' || isPedometerAvailable !== 'granted') {
      return;
    }

    try {
      const now = new Date();
      const { steps: backgroundSteps } = await Pedometer.getStepCountAsync(lastStepTimestampRef.current, now);
      lastStepTimestampRef.current = now;

      if (backgroundSteps > 0) {
        pendingStepDeltaRef.current += backgroundSteps;
        await flushPendingSteps();
      }
    } catch (error) {
      console.warn('Unable to reconcile background steps', error);
    }
  }, [flushPendingSteps, isPedometerAvailable, pedometerPermission]);

  useEffect(() => {
    let isMounted = true;

    const subscribe = async () => {
      const status = motionStatus === 'unknown' ? await requestMotionPermission() : motionStatus;
      if (!isMounted) return;

      setPedometerPermission(status);
      setIsPedometerAvailable(status);

      if (status !== 'granted') {
        return;
      }

      const isAvailable = await Pedometer.isAvailableAsync();
      if (!isMounted) return;

      setIsPedometerAvailable(isAvailable ? 'granted' : 'denied');

      if (isAvailable) {
        lastStepTimestampRef.current = new Date();
        startForegroundTracking();
      }
    };

    void subscribe();

    return () => {
      isMounted = false;
      stopForegroundTracking();
      if (pendingFlushTimeoutRef.current) {
        clearTimeout(pendingFlushTimeoutRef.current);
        pendingFlushTimeoutRef.current = null;
      }
    };
  }, [motionStatus, requestMotionPermission, startForegroundTracking, stopForegroundTracking]);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && pedometerPermission === 'granted' && isPedometerAvailable === 'granted') {
        startForegroundTracking();
        void reconcileStepsSinceLastCheck();
      } else if (nextState === 'background') {
        stopForegroundTracking();
        void flushPendingSteps();
      }
    });

    return () => {
      appStateSubscription.remove();
    };
  }, [
    flushPendingSteps,
    isPedometerAvailable,
    pedometerPermission,
    reconcileStepsSinceLastCheck,
    startForegroundTracking,
    stopForegroundTracking,
  ]);

  return (
    <UserContext.Provider value={{ steps, coins, pedometerPermission, isPedometerAvailable }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
