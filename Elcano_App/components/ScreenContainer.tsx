import React, { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { palette, spacing } from '../constants/ui';

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
  if (scrollable) {
    return (
      <ScrollView
        style={[styles.container, style]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }

  return <View style={[styles.container, styles.content, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },
});
