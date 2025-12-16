import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, spacing, typography } from '../constants/ui';
import { openAppSettings } from '../services/permissions';

const statusCopy = {
  granted: { label: 'Granted', color: palette.success, icon: 'checkmark-circle' },
  denied: { label: 'Denied', color: palette.danger, icon: 'alert-circle' },
  unknown: { label: 'Not enabled', color: palette.mutedText, icon: 'alert-circle' },
};

export default function PermissionRow({ title, description, status, onEnable, optional }) {
  const copy = statusCopy[status] || statusCopy.unknown;
  const isDenied = status === 'denied';
  const isGranted = status === 'granted';
  const actionLabel = isDenied ? 'Open Settings' : 'Enable';

  const handlePress = async () => {
    if (isDenied) {
      await openAppSettings();
      return;
    }

    await onEnable();
  };

  return (
    <View style={[styles.row, isDenied && styles.rowDenied]}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Ionicons name={copy.icon} size={18} color={copy.color} />
          <View>
            <Text style={styles.title}>{title}</Text>
            <Text style={[styles.status, { color: copy.color }]}>{copy.label}</Text>
          </View>
        </View>

        {!isGranted && (
          <TouchableOpacity style={styles.button} onPress={handlePress}>
            <Text style={styles.buttonText}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.description}>{description}</Text>
      {optional ? <Text style={styles.optional}>Optional • helps us personalize nearby offers.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: '#fff',
  },
  rowDenied: {
    borderColor: '#f6cfd0',
    backgroundColor: '#fff9f9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  titleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.label,
    color: palette.text,
  },
  status: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  description: {
    color: '#444',
    fontSize: 13,
    lineHeight: 18,
  },
  optional: {
    color: palette.mutedText,
    fontSize: 12,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
});
