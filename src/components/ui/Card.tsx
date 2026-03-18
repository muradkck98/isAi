import React from 'react';
import { StyleSheet, View, ViewStyle, TouchableOpacity, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';
import { motion } from '../../theme/motion';
import { haptic } from '../../utils/haptics';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  delay?: number;
}

export function Card({
  children,
  onPress,
  style,
  variant = 'elevated',
  padding = 'lg',
  animated = true,
  delay = 0,
}: CardProps) {
  const c = useThemeColors();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, motion.spring.snappy);
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, motion.spring.gentle);
    }
  };

  const handlePress = () => {
    if (onPress) {
      haptic.selection();
      onPress();
    }
  };

  const variantStyles: Record<string, ViewStyle> = {
    elevated: { backgroundColor: c.neutral[0], ...shadows.md },
    outlined: { backgroundColor: c.neutral[0], borderWidth: 1, borderColor: c.neutral[200] },
    filled: { backgroundColor: c.neutral[50] },
  };

  const variantStyle = variantStyles[variant];
  const paddingStyle = PADDING_MAP[padding];

  const entering = animated ? FadeInDown.delay(delay).duration(400).springify() : undefined;

  if (onPress) {
    return (
      <AnimatedTouchable
        entering={entering}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.95}
        style={[styles.base, variantStyle, paddingStyle, animatedStyle, style]}
      >
        {children}
      </AnimatedTouchable>
    );
  }

  return (
    <Animated.View
      entering={entering}
      style={[styles.base, variantStyle, paddingStyle, style]}
    >
      {children}
    </Animated.View>
  );
}

const PADDING_MAP: Record<string, ViewStyle> = {
  sm: { padding: spacing.md },
  md: { padding: spacing.lg },
  lg: { padding: spacing.xl },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius['2xl'],
    overflow: 'hidden',
  },
});
