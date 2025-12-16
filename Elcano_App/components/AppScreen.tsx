import React, { ReactNode } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { palette, spacing } from '../constants/ui';

interface AppScreenProps {
  children: ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

/**
 * Shared wrapper to ensure screens respect safe areas and consistent padding.
 * Use `scrollable` for long content such as dashboards or history lists.
 */
export default function AppScreen({ children, scrollable = false, style, contentStyle }: AppScreenProps) {
  if (scrollable) {
    return (
      <SafeAreaView style={[styles.container, style]}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, style]}>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.xxl },
  content: { flex: 1, padding: spacing.xl, paddingBottom: spacing.xxl },
});
