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

      if (finalize && sessionStartRef.current) {
        try {
          const now = new Date();
          const { steps: sessionTotal = 0 } = await Pedometer.getStepCountAsync(sessionStartRef.current, now);
          finalizedSteps = sessionTotal;
          setLiveSteps(sessionTotal);
          if (typeof onSessionComplete === 'function') {
            onSessionComplete(sessionTotal);
          }
        } catch (err) {
          setError('Unable to finalize step tracking. Please try again.');
          console.error(err);
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
        // Android batches sensor events, so we compute a delta between the last
        // sensor reading and the current one instead of trusting the raw value.
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
      void stopTracking({ finalize: false });
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
