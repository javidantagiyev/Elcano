import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePermissions } from '../context/PermissionsContext';
import { PermissionState, openAppSettings } from '../services/permissions';
import { palette, radius, shadow, spacing, typography } from '../constants/ui';

interface PermissionRowProps {
  title: string;
  description: string;
  status: PermissionState;
  onRequest: () => Promise<PermissionState> | Promise<void>;
  optional?: boolean;
  deniedMessage: string;
}

const statusLabel = (status: PermissionState) => {
  switch (status) {
    case 'granted':
      return 'Allowed';
    case 'denied':
      return 'Denied';
    default:
      return 'Not requested';
  }
};

const statusColor = (status: PermissionState) => {
  switch (status) {
    case 'granted':
      return palette.success;
    case 'denied':
      return palette.danger;
    default:
      return palette.mutedText;
  }
};

const PermissionRow = ({ title, description, status, onRequest, optional, deniedMessage }: PermissionRowProps) => {
  const isGranted = status === 'granted';
  const isDenied = status === 'denied';
  const actionLabel = isGranted ? 'Allowed' : isDenied ? 'Open settings' : 'Allow access';

  const handlePress = async () => {
    if (isGranted) return;

    if (isDenied) {
      await openAppSettings();
      return;
    }

    await onRequest();
  };

  return (
    <View style={[styles.permissionRow, isDenied && styles.permissionRowDenied]}>
      <View style={styles.permissionHeader}>
        <View style={styles.permissionTitleRow}>
          <Ionicons name={isGranted ? 'checkmark-circle' : 'alert-circle'} size={18} color={statusColor(status)} />
          <View>
            <Text style={styles.permissionTitle}>{title}</Text>
            <Text style={styles.permissionStatus}>{statusLabel(status)}</Text>
          </View>
        </View>
        {!isGranted && (
          <TouchableOpacity style={styles.requestButton} onPress={handlePress}>
            <Text style={styles.requestButtonText}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.permissionDescription}>{description}</Text>
      {isDenied ? <Text style={styles.permissionAlert}>{deniedMessage}</Text> : null}
      {optional ? <Text style={styles.optionalLabel}>Optional — enhances offers near you.</Text> : null}
    </View>
  );
};

export default function PermissionPanel() {
  const {
    motionStatus,
    locationStatus,
    notificationStatus,
    requestMotionPermission,
    requestLocationPermission,
    requestNotificationPermission,
  } = usePermissions();

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Stay in control of your data</Text>
      <Text style={styles.subheading}>
        Manage permissions so we can count your steps, send reminders, and surface local offers with your consent.
      </Text>

      <PermissionRow
        title="Motion sensor"
        description="We use motion access to count your steps and convert them into coins."
        status={motionStatus}
        deniedMessage="Step tracking is paused until you enable motion permissions in your device settings."
        onRequest={requestMotionPermission}
      />

      <PermissionRow
        title="Notifications"
        description="Allow reminders for daily steps and celebration alerts when you hit goals."
        status={notificationStatus}
        deniedMessage="Notifications are turned off. Enable them in settings to get reminders and achievement alerts."
        onRequest={requestNotificationPermission}
      />

      <PermissionRow
        title="Location"
        description="Share your location to discover nearby partner rewards."
        status={locationStatus}
        deniedMessage="Location is optional, but enabling it helps us personalize nearby offers."
        optional
        onRequest={requestLocationPermission}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing.xl,
    ...shadow.surface,
  },
  heading: { ...typography.title, marginBottom: spacing.xs },
  subheading: { color: palette.mutedText, fontSize: 13, marginBottom: spacing.md, lineHeight: 18 },
  permissionRow: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  permissionRowDenied: {
    borderColor: '#f6cfd0',
    backgroundColor: '#fff9f9',
  },
  permissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  permissionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  permissionTitle: { fontSize: 15, fontWeight: '600', color: palette.text },
  permissionStatus: { fontSize: 12, color: palette.mutedText },
  permissionDescription: { color: '#444', fontSize: 13, lineHeight: 18 },
  permissionAlert: { color: palette.danger, fontSize: 12, marginTop: spacing.xs },
  optionalLabel: { color: palette.mutedText, fontSize: 12, marginTop: spacing.xs, fontStyle: 'italic' },
  requestButton: {
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  requestButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
