import { Easing } from 'react-native-reanimated';

export const motion = {
  duration: {
    instant: 80,
    fast: 150,
    normal: 250,
    slow: 350,
    xslow: 500,
  },
  easing: {
    standard: Easing.bezier(0.4, 0, 0.2, 1),
    decelerate: Easing.bezier(0, 0, 0.2, 1),
    accelerate: Easing.bezier(0.4, 0, 1, 1),
    spring: Easing.bezier(0.175, 0.885, 0.32, 1.275),
  },
  spring: {
    gentle: { damping: 20, stiffness: 150, mass: 1 },
    bouncy: { damping: 12, stiffness: 180, mass: 0.8 },
    snappy: { damping: 18, stiffness: 300, mass: 0.8 },
    slow: { damping: 25, stiffness: 100, mass: 1.2 },
  },
} as const;

export type Motion = typeof motion;
