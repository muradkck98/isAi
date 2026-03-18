import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';
import { motion } from '../../theme/motion';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export function TextField({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const borderProgress = useSharedValue(0);

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: error
      ? colors.error
      : borderProgress.value === 1
      ? colors.primary[500]
      : colors.neutral[200],
    borderWidth: borderProgress.value === 1 ? 1.5 : 1,
  }));

  const handleFocus = (e: any) => {
    setFocused(true);
    borderProgress.value = withTiming(1, { duration: motion.duration.fast });
    inputProps.onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setFocused(false);
    borderProgress.value = withTiming(0, { duration: motion.duration.fast });
    inputProps.onBlur?.(e);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, error && styles.labelError]}>{label}</Text>
      <Animated.View style={[styles.inputContainer, animatedBorderStyle]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          {...inputProps}
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeftIcon : undefined,
            rightIcon ? styles.inputWithRightIcon : undefined,
          ]}
          placeholderTextColor={colors.neutral[400]}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </Animated.View>
      {(error || hint) && (
        <Text style={[styles.hint, error && styles.errorText]}>
          {error || hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.bodySm,
    fontWeight: '500',
    color: colors.neutral[700],
    marginBottom: spacing.sm,
  },
  labelError: {
    color: colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.neutral[900],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  inputWithLeftIcon: {
    paddingLeft: spacing.xs,
  },
  inputWithRightIcon: {
    paddingRight: spacing.xs,
  },
  leftIcon: {
    paddingLeft: spacing.lg,
  },
  rightIcon: {
    paddingRight: spacing.lg,
  },
  hint: {
    ...typography.caption,
    color: colors.neutral[500],
    marginTop: spacing.xs,
  },
  errorText: {
    color: colors.error,
  },
});
