import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import { PermissionState } from './permissions';

const DAILY_REMINDER_TYPE = 'daily-steps-reminder';
let handlerConfigured = false;

export const configureNotificationHandling = () => {
  if (handlerConfigured) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  handlerConfigured = true;
};

export const requestNotificationPermissions = async (): Promise<PermissionState> => {
  configureNotificationHandling();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: AndroidImportance.DEFAULT,
    });
  }

  const existingPermissions = await Notifications.getPermissionsAsync();
  if (existingPermissions.status === 'granted') {
    return 'granted';
  }

  const request = await Notifications.requestPermissionsAsync();
  return request.status === 'granted' ? 'granted' : 'denied';
};

export const ensureDailyStepReminderScheduled = async () => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const alreadyScheduled = scheduled.some(
    (notification) => notification.content?.data?.type === DAILY_REMINDER_TYPE,
  );

  if (alreadyScheduled) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Stay active today',
      body: "Don't forget to log your steps and earn more coins!",
      data: { type: DAILY_REMINDER_TYPE },
    },
    trigger: { hour: 18, minute: 0, repeats: true },
  });
};

export const sendGoalCelebrationNotification = async (
  challengeTitle: string,
  coinsAwarded: number,
) =>
  Notifications.scheduleNotificationAsync({
    content: {
      title: 'Goal achieved! 🎉',
      body: `You completed ${challengeTitle} and earned +${coinsAwarded} coins.`,
      data: { type: 'goal-achievement', challengeTitle, coinsAwarded },
    },
    trigger: null,
  });
