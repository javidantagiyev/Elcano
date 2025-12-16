import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  PermissionState,
  getLocationPermissionStatus,
  getMotionPermissionStatus,
  getNotificationPermissionStatus,
  requestLocationPermission as requestLocationPermissionService,
  requestMotionPermission as requestMotionPermissionService,
  requestNotificationPermission as requestNotificationPermissionService,
} from '../services/permissions';

interface PermissionsContextValue {
  motionStatus: PermissionState;
  locationStatus: PermissionState;
  notificationStatus: PermissionState;
  requestMotionPermission: () => Promise<PermissionState>;
  requestLocationPermission: () => Promise<PermissionState>;
  requestNotificationPermission: () => Promise<PermissionState>;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextValue>({
  motionStatus: 'unknown',
  locationStatus: 'unknown',
  notificationStatus: 'unknown',
  requestMotionPermission: async () => 'unknown',
  requestLocationPermission: async () => 'unknown',
  requestNotificationPermission: async () => 'unknown',
  refreshPermissions: async () => undefined,
});

export const PermissionsProvider = ({ children }: { children: React.ReactNode }) => {
  const [motionStatus, setMotionStatus] = useState<PermissionState>('unknown');
  const [locationStatus, setLocationStatus] = useState<PermissionState>('unknown');
  const [notificationStatus, setNotificationStatus] = useState<PermissionState>('unknown');

  const syncMotionStatus = useCallback(async () => {
    const status = await getMotionPermissionStatus();
    setMotionStatus(status);
    return status;
  }, []);

  const syncLocationStatus = useCallback(async () => {
    const status = await getLocationPermissionStatus();
    setLocationStatus(status);
    return status;
  }, []);

  const syncNotificationStatus = useCallback(async () => {
    const status = await getNotificationPermissionStatus();
    setNotificationStatus(status);
    return status;
  }, []);

  const refreshPermissions = useCallback(async () => {
    await Promise.all([syncMotionStatus(), syncLocationStatus(), syncNotificationStatus()]);
  }, [syncLocationStatus, syncMotionStatus, syncNotificationStatus]);

  const requestMotionPermission = useCallback(async () => {
    const status = await requestMotionPermissionService();
    setMotionStatus(status);
    return status;
  }, []);

  const requestLocationPermission = useCallback(async () => {
    const status = await requestLocationPermissionService();
    setLocationStatus(status);
    return status;
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    const status = await requestNotificationPermissionService();
    setNotificationStatus(status);
    return status;
  }, []);

  useEffect(() => {
    void refreshPermissions();
  }, [refreshPermissions]);

  const contextValue = useMemo(
    () => ({
      motionStatus,
      locationStatus,
      notificationStatus,
      requestMotionPermission,
      requestLocationPermission,
      requestNotificationPermission,
      refreshPermissions,
    }),
    [
      locationStatus,
      motionStatus,
      notificationStatus,
      refreshPermissions,
      requestLocationPermission,
      requestMotionPermission,
      requestNotificationPermission,
    ],
  );

  return <PermissionsContext.Provider value={contextValue}>{children}</PermissionsContext.Provider>;
};

export const usePermissions = () => useContext(PermissionsContext);
