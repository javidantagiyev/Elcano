import React, { ReactNode } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { spacing } from '../constants/ui';
import AppScreen from './AppScreen';

interface ScreenContainerProps {
  children: ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
}

/**
 * Provides a shared layout (background color and padding) for screens.
 * Toggle `scrollable` for long content such as dashboards or history lists.
 */
export default function ScreenContainer({ children, scrollable = false, style }: ScreenContainerProps) {
  return (
    <AppScreen scrollable={scrollable} contentStyle={styles.content} style={style}>
      {children}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },
});
