import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { palette, radius, shadow, spacing } from '../constants/ui';

interface SurfaceCardProps {
  children: ReactNode;
  style?: ViewStyle;
}

/**
 * Reusable surface with consistent padding, radius, and shadow.
 * Use this to wrap groups of related controls (history, settings, cards).
 */
export default function SurfaceCard({ children, style }: SurfaceCardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
});
