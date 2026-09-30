export const theme = {
  colors: {
    // Primary ramp
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    // Accent ramp
    accent: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
    },
    // Warning ramp
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    // Error ramp
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
    // Success ramp (same as accent)
    success: {
      500: '#10b981',
      600: '#059669',
    },
    // Neutral ramp
    neutral: {
      0: '#ffffff',
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#0a0e14',
    },
  },
  // Semantic
  bg: '#0a0e14',
  bgCard: '#0f1623',
  bgCardAlt: '#131c2e',
  bgElevated: '#1a2335',
  border: '#1e293b',
  borderLight: '#334155',
  textPrimary: '#e2e8f0',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  up: '#10b981',
  down: '#ef4444',
  flat: '#64748b',
  noSignal: '#f59e0b',
  strong: '#10b981',
  moderate: '#3b82f6',
  weak: '#f59e0b',
  noSignalBg: '#f59e0b',
  // Spacing (8px system)
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  // Border radius
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
  },
  // Fonts
  fonts: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semibold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },
  // Typography
  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    xxxl: 36,
  },
};

export type Theme = typeof theme & {
  primary: typeof theme.colors.primary;
  accent: typeof theme.colors.accent;
  warning: typeof theme.colors.warning;
  error: typeof theme.colors.error;
  success: typeof theme.colors.success;
  neutral: typeof theme.colors.neutral;
};

export const themedTheme: Theme = {
  ...theme,
  primary: theme.colors.primary,
  accent: theme.colors.accent,
  warning: theme.colors.warning,
  error: theme.colors.error,
  success: theme.colors.success,
  neutral: theme.colors.neutral,
};

// Re-export for use in components - themedTheme includes flattened color shortcuts
export const t = themedTheme;


