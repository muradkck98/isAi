import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  const c = useThemeColors();
  const { height } = useWindowDimensions();
  const vPad = height < 700 ? spacing['xl'] : spacing['2xl'];

  return (
    <Animated.View entering={FadeIn.duration(400).delay(100)} style={[styles.container, { paddingVertical: vPad }]}>
      {/* Decorative background blob */}
      <Animated.View
        entering={FadeIn.delay(200).duration(600)}
        style={[styles.blob, { backgroundColor: c.primary[50] }]}
      />

      {icon && (
        <Animated.View
          entering={FadeInUp.delay(150).duration(500).springify()}
          style={[styles.iconContainer, { backgroundColor: c.primary[100] }]}
        >
          {icon}
        </Animated.View>
      )}

      <Animated.Text entering={FadeInUp.delay(250).duration(450)} style={[styles.title, { color: c.neutral[900] }]}>
        {title}
      </Animated.Text>

      <Animated.Text entering={FadeInUp.delay(350).duration(450)} style={[styles.description, { color: c.neutral[500] }]}>
        {description}
      </Animated.Text>

      {actionLabel && onAction && (
        <Animated.View entering={FadeInUp.delay(450).duration(450).springify()} style={styles.action}>
          <Button title={actionLabel} onPress={onAction} size="md" fullWidth={false} />
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  blob: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -10,
    opacity: 0.4,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: radius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  action: {
    marginTop: spacing.xl,
  },
});
