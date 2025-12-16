import { useCallback, useEffect, useRef, useState } from 'react';
import { Pedometer } from 'expo-sensors';

const mapPermissionStatus = (result) => {
  if (!result) return 'unknown';
  if ('status' in result && result.status) return result.status;
  if ('granted' in result) return result.granted ? 'granted' : 'denied';
  return 'unknown';
};

export default function useLiveStepTracker({ onSessionComplete } = {}) {
  const [liveSteps, setLiveSteps] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [isPedometerAvailable, setIsPedometerAvailable] = useState('unknown');
  const [error, setError] = useState(null);
  const subscriptionRef = useRef(null);
  const lastSensorStepsRef = useRef(null);
  const sessionStartRef = useRef(null);

  const clearSubscription = useCallback(() => {
    if (subscriptionRef.current?.remove) {
      subscriptionRef.current.remove();
    }

    subscriptionRef.current = null;
    lastSensorStepsRef.current = null;
  }, []);

  const stopTracking = useCallback(
    async ({ finalize = true } = {}) => {
      clearSubscription();

      let finalizedSteps = liveSteps;
      const startedAt = sessionStartRef.current;
      const endedAt = new Date();

      if (finalize && startedAt) {
        // Use the pedometer delta as the single source of truth for the session,
        // but avoid hammering Firebase on every sensor callback. We only invoke
        // the completion handler once per session so the caller can persist the
        // aggregate count transactionally.
        finalizedSteps = liveSteps;
        if (typeof onSessionComplete === 'function') {
          onSessionComplete({ steps: finalizedSteps, startedAt, endedAt });
        }
      }

      sessionStartRef.current = null;
      setIsTracking(false);
      return finalizedSteps;
    },
    [clearSubscription, liveSteps, onSessionComplete],
  );

  const startTracking = useCallback(async () => {
    setError(null);
    try {
      const permission = await Pedometer.requestPermissionsAsync();
      const status = mapPermissionStatus(permission);
      setPermissionStatus(status);

      if (status !== 'granted') {
        setIsTracking(false);
        setError('Motion permission is required to start tracking.');
        return;
      }

      const available = await Pedometer.isAvailableAsync();
      setIsPedometerAvailable(available ? 'granted' : 'denied');

      if (!available) {
        setError('Pedometer is not available on this device.');
        setIsTracking(false);
        return;
      }

      await stopTracking({ finalize: false });
      setLiveSteps(0);
      lastSensorStepsRef.current = null;
      sessionStartRef.current = new Date();

      const subscription = Pedometer.watchStepCount(({ steps: sensorSteps }) => {
        if (lastSensorStepsRef.current === null) {
          lastSensorStepsRef.current = sensorSteps;
          return;
        }

        const delta = Math.max(sensorSteps - lastSensorStepsRef.current, 0);
        lastSensorStepsRef.current = sensorSteps;

        if (delta > 0) {
          setLiveSteps((current) => current + delta);
        }
      });

      subscriptionRef.current = subscription;
      setIsTracking(true);
    } catch (err) {
      setError('Unable to start step tracking. Please try again.');
      console.error(err);
    }
  }, [stopTracking]);

  const toggleTracking = useCallback(() => {
    if (isTracking) {
      void stopTracking();
    } else {
      void startTracking();
    }
  }, [isTracking, startTracking, stopTracking]);

  useEffect(
    () => () => {
      void stopTracking();
    },
    [stopTracking],
  );

  const statusLabel = isTracking ? 'Tracking' : 'Not tracking';

  return {
    steps: liveSteps,
    isTracking,
    statusLabel,
    permissionStatus,
    isPedometerAvailable,
    error,
    startTracking,
    stopTracking,
    toggleTracking,
  };
}
