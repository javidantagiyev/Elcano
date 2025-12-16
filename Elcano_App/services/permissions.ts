import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Pedometer } from 'expo-sensors';
import { AndroidImportance } from 'expo-notifications';
import { Linking, Platform } from 'react-native';

export type PermissionState = 'unknown' | 'granted' | 'denied';

const normalizeStatus = (status?: string, granted?: boolean): PermissionState => {
  if (granted || status === 'granted') {
    return 'granted';
  }

  if (status === 'denied') {
    return 'denied';
  }

  return 'unknown';
};

export const getMotionPermissionStatus = async (): Promise<PermissionState> => {
  try {
    const result = await Pedometer.getPermissionsAsync();
    return normalizeStatus(result?.status, (result as any)?.granted);
  } catch (error) {
    console.warn('Unable to read motion permission status', error);
    return 'unknown';
  }
};

export const requestMotionPermission = async (): Promise<PermissionState> => {
  try {
    const result = await Pedometer.requestPermissionsAsync();
    return normalizeStatus(result?.status, (result as any)?.granted);
  } catch (error) {
    console.warn('Motion permission request failed', error);
    return 'unknown';
  }
};

export const getLocationPermissionStatus = async (): Promise<PermissionState> => {
  try {
    const result = await Location.getForegroundPermissionsAsync();
    return normalizeStatus(result?.status, result?.granted);
  } catch (error) {
    console.warn('Unable to read location permission status', error);
    return 'unknown';
  }
};

export const requestLocationPermission = async (): Promise<PermissionState> => {
  try {
    const result = await Location.requestForegroundPermissionsAsync();
    return normalizeStatus(result?.status, result?.granted);
  } catch (error) {
    console.warn('Location permission request failed', error);
    return 'unknown';
  }
};

export const getNotificationPermissionStatus = async (): Promise<PermissionState> => {
  try {
    const permissions = await Notifications.getPermissionsAsync();
    return normalizeStatus(permissions.status, permissions.granted);
  } catch (error) {
    console.warn('Unable to read notification permission status', error);
    return 'unknown';
  }
};

export const requestNotificationPermission = async (): Promise<PermissionState> => {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: AndroidImportance.DEFAULT,
      });
    }

    const existingPermissions = await Notifications.getPermissionsAsync();
    if (existingPermissions.status === 'granted' || existingPermissions.granted) {
      return 'granted';
    }

    const request = await Notifications.requestPermissionsAsync();
    return normalizeStatus(request.status, request.granted);
  } catch (error) {
    console.warn('Notification permission request failed', error);
    return 'unknown';
  }
};

export const openAppSettings = async () => {
  try {
    if (Linking.openSettings) {
      await Linking.openSettings();
    }
  } catch (error) {
    console.warn('Unable to open app settings', error);
  }
};
