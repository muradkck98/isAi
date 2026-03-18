import React, { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { IMAGES } from '../../constants/images';

interface LogoMarkProps {
  size?: number;
  /** Enable a subtle ambient glow pulse animation */
  animated?: boolean;
}

export function LogoMark({ size = 100, animated = false }: LogoMarkProps) {
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1200 }),
          withTiming(0.3, { duration: 1200 })
        ),
        -1,
        false
      );
    }
  }, [animated]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      {/* Ambient glow ring */}
      {animated && (
        <Animated.View
          style={[
            styles.glow,
            { width: size * 1.4, height: size * 1.4, borderRadius: size * 0.7 },
            glowStyle,
          ]}
        />
      )}
      <Image
        source={IMAGES.logo}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'rgba(26, 143, 232, 0.25)',
  },
});
