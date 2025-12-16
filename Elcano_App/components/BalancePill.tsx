import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, spacing } from '../constants/ui';

interface BalancePillProps {
  amount: number;
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

/**
 * Small badge used across screens to show the user's coin balance.
 * Sharing this component keeps typography, spacing, and icon sizing consistent.
 */
export default function BalancePill({ amount, label = 'coins', icon = 'wallet-outline' }: BalancePillProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={18} color={palette.primary} />
      <Text style={styles.text}>
        {amount} {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: palette.primarySurface,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  text: { color: palette.primary, fontWeight: '600' },
});
