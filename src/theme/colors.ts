export const colors = {
  // Primary - Detective Blue (from logo)
  primary: {
    50: '#E8F4FD',
    100: '#B9DEFA',
    200: '#8AC8F7',
    300: '#5BB2F4',
    400: '#2C9CF1',
    500: '#1A8FE8', // Main brand color
    600: '#1577C4',
    700: '#105FA0',
    800: '#0B477C',
    900: '#062F58',
  },

  // Secondary - Warm Brown (from hat)
  secondary: {
    50: '#FFF3E0',
    100: '#FFE0B2',
    200: '#FFCC80',
    300: '#FFB74D',
    400: '#FFA726',
    500: '#C4873B', // Hat brown
    600: '#A66F2E',
    700: '#8B5A24',
    800: '#6F471A',
    900: '#543410',
  },

  // Accent
  accent: {
    cyan: '#00D4FF',
    purple: '#8B5CF6',
    green: '#10B981',
    orange: '#F59E0B',
    red: '#EF4444',
    pink: '#EC4899',
  },

  // Neutrals
  neutral: {
    0: '#FFFFFF',
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Background
  background: {
    primary: '#FFFFFF',
    secondary: '#F8FAFC',
    tertiary: '#F1F5F9',
    dark: '#0F172A',
  },

  // Gradients
  gradient: {
    primary: ['#1A8FE8', '#2C9CF1', '#5BB2F4'] as const,
    premium: ['#1A8FE8', '#8B5CF6'] as const,
    warm: ['#F59E0B', '#EF4444'] as const,
    dark: ['#0F172A', '#1E293B'] as const,
    card: ['#FFFFFF', '#F8FAFC'] as const,
  },
} as const;

// Recursively convert literal hex types to `string` so dark theme can satisfy the same shape
type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends readonly string[]
      ? readonly string[]
      : DeepStringify<T[K]>;
};

export type Colors = DeepStringify<typeof colors>;
