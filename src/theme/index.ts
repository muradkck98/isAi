export { colors } from './colors';
export { spacing } from './spacing';
export { radius } from './radius';
export { typography } from './typography';
export { shadows } from './shadows';
export { motion } from './motion';

export const theme = {
  colors: require('./colors').colors,
  spacing: require('./spacing').spacing,
  radius: require('./radius').radius,
  typography: require('./typography').typography,
  shadows: require('./shadows').shadows,
  motion: require('./motion').motion,
};

export type Theme = typeof theme;
