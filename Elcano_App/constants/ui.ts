/**
 * Lightweight design tokens shared across screens and components.
 * Keeping colors, spacing, and shadows in one place makes it easy for students
 * to build new UI that matches the rest of the app.
 */
export const palette = {
  primary: '#FF8C00',
  primarySurface: '#FFF2E6',
  background: '#F7F7F7',
  surface: '#FFFFFF',
  text: '#1F1F1F',
  mutedText: '#6B6B6B',
  border: '#EAEAEA',
  success: '#2e7d32',
  danger: '#c62828',
  accent: '#6C63FF',
};

export const spacing = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const radius = {
  sm: 10,
  md: 12,
  lg: 16,
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  surface: {
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
};

export const typography = {
  headline: { fontSize: 28, fontWeight: '700', color: palette.text },
  title: { fontSize: 18, fontWeight: '700', color: palette.text },
  subtitle: { color: palette.mutedText },
  label: { fontSize: 13, color: palette.mutedText },
};
