export const darkColors = {
  // Primary - same brand colors
  primary: {
    50: '#0B2A4A',
    100: '#0E3A63',
    200: '#124D82',
    300: '#1A6FB5',
    400: '#2C9CF1',
    500: '#1A8FE8',
    600: '#5BB2F4',
    700: '#8AC8F7',
    800: '#B9DEFA',
    900: '#E8F4FD',
  },

  // Secondary
  secondary: {
    50: '#2A1E0F',
    100: '#3D2B15',
    200: '#54391C',
    300: '#7A5428',
    400: '#A66F2E',
    500: '#C4873B',
    600: '#FFB74D',
    700: '#FFCC80',
    800: '#FFE0B2',
    900: '#FFF3E0',
  },

  // Accent - same as light
  accent: {
    cyan: '#00D4FF',
    purple: '#A78BFA',
    green: '#34D399',
    orange: '#FBBF24',
    red: '#F87171',
    pink: '#F472B6',
  },

  // Neutrals - inverted
  neutral: {
    0: '#0F172A',
    50: '#1E293B',
    100: '#1E293B',
    200: '#334155',
    300: '#475569',
    400: '#64748B',
    500: '#94A3B8',
    600: '#CBD5E1',
    700: '#E2E8F0',
    800: '#F1F5F9',
    900: '#F8FAFC',
    950: '#FFFFFF',
  },

  // Semantic
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',

  // Background
  background: {
    primary: '#0F172A',
    secondary: '#1E293B',
    tertiary: '#334155',
    dark: '#020617',
  },

  // Gradients
  gradient: {
    primary: ['#1A8FE8', '#2C9CF1', '#5BB2F4'] as const,
    premium: ['#1A8FE8', '#8B5CF6'] as const,
    warm: ['#FBBF24', '#F87171'] as const,
    dark: ['#020617', '#0F172A'] as const,
    card: ['#1E293B', '#334155'] as const,
  },
} as const;
