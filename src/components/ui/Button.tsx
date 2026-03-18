import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';
import { shadows } from '../../theme/shadows';
import { motion } from '../../theme/motion';
import { haptic } from '../../utils/haptics';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  icon,
  fullWidth = true,
  style,
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, motion.spring.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, motion.spring.gentle);
  };

  const handlePress = () => {
    if (disabled || loading) return;
    haptic.light();
    onPress();
  };

  const sizeStyles = SIZE_MAP[size];
  const isDisabled = disabled || loading;

  if (variant === 'primary') {
    return (
      <AnimatedTouchable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        disabled={isDisabled}
        style={[
          animatedStyle,
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabled,
          style,
        ]}
      >
        <LinearGradient
          colors={[colors.primary[500], colors.primary[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, sizeStyles.container, shadows.md]}
        >
          {loading ? (
            <ActivityIndicator color={colors.neutral[0]} size="small" />
          ) : (
            <>
              {icon}
              <Text style={[styles.primaryText, sizeStyles.text, icon ? styles.textWithIcon : undefined]}>
                {title}
              </Text>
            </>
          )}
        </LinearGradient>
      </AnimatedTouchable>
    );
  }

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.7}
      disabled={isDisabled}
      style={[
        animatedStyle,
        styles.base,
        sizeStyles.container,
        VARIANT_STYLES[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' ? colors.primary[500] : colors.neutral[600]}
          size="small"
        />
      ) : (
        <>
          {icon}
          <Text
            style={[
              VARIANT_TEXT_STYLES[variant],
              sizeStyles.text,
              icon ? styles.textWithIcon : undefined,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </AnimatedTouchable>
  );
}

const SIZE_MAP: Record<ButtonSize, { container: ViewStyle; text: TextStyle }> = {
  sm: {
    container: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.md },
    text: { ...typography.buttonSm },
  },
  md: {
    container: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: radius.lg },
    text: { ...typography.button },
  },
  lg: {
    container: { paddingVertical: spacing.lg, paddingHorizontal: spacing['2xl'], borderRadius: radius.lg },
    text: { ...typography.button },
  },
};

const VARIANT_STYLES: Record<Exclude<ButtonVariant, 'primary'>, ViewStyle> = {
  secondary: {
    backgroundColor: colors.neutral[100],
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary[500],
  },
  ghost: {
    backgroundColor: 'transparent',
  },
};

const VARIANT_TEXT_STYLES: Record<Exclude<ButtonVariant, 'primary'>, TextStyle> = {
  secondary: {
    ...typography.button,
    color: colors.neutral[800],
  },
  outline: {
    ...typography.button,
    color: colors.primary[500],
  },
  ghost: {
    ...typography.button,
    color: colors.primary[500],
  },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  primaryText: {
    ...typography.button,
    color: colors.neutral[0],
  },
  textWithIcon: {
    marginLeft: spacing.sm,
  },
});
