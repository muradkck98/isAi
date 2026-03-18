import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { motion } from '../../theme/motion';

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width,
  height,
  borderRadius = radius.md,
  style,
}: SkeletonProps) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.3, 0.7]),
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.neutral[200],
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <Animated.View style={[skeletonStyles.card, style]}>
      <Skeleton width="100%" height={120} borderRadius={radius.lg} />
      <Animated.View style={skeletonStyles.content}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="40%" height={12} style={{ marginTop: 8 }} />
      </Animated.View>
    </Animated.View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View key={i} style={skeletonStyles.listItem}>
          <Skeleton width={48} height={48} borderRadius={radius.lg} />
          <Animated.View style={skeletonStyles.listContent}>
            <Skeleton width="60%" height={14} />
            <Skeleton width="80%" height={12} style={{ marginTop: 6 }} />
          </Animated.View>
        </Animated.View>
      ))}
    </>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius['2xl'],
    overflow: 'hidden',
    marginBottom: 16,
  },
  content: {
    padding: 16,
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  listContent: {
    flex: 1,
    marginLeft: 12,
  },
});
