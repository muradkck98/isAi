import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  withRepeat,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTranslation } from '../../hooks/useTranslation';
import { LogoMark } from '../../components/ui/LogoMark';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { motion } from '../../theme/motion';

interface SplashScreenProps { onFinish: () => void; }

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
  const ring1Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0);
  const ring2Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 500 });
    logoScale.value = withSequence(
      withSpring(1.12, motion.spring.bouncy),
      withSpring(1, motion.spring.gentle)
    );

    ring1Opacity.value = withDelay(400, withRepeat(
      withSequence(withTiming(0.6, { duration: 700 }), withTiming(0, { duration: 900 })),
      -1, false
    ));
    ring1Scale.value = withDelay(400, withRepeat(withTiming(1.6, { duration: 1600 }), -1, false));

    ring2Opacity.value = withDelay(800, withRepeat(
      withSequence(withTiming(0.35, { duration: 700 }), withTiming(0, { duration: 900 })),
      -1, false
    ));
    ring2Scale.value = withDelay(800, withRepeat(withTiming(1.9, { duration: 1600 }), -1, false));

    textOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));
    textTranslateY.value = withDelay(600, withSpring(0, motion.spring.gentle));
    subtitleOpacity.value = withDelay(900, withTiming(1, { duration: 400 }));

    const timer = setTimeout(() => onFinish(), 2800);
    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));
  const subtitleStyle = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value }));
  const ring1Style = useAnimatedStyle(() => ({
    opacity: ring1Opacity.value,
    transform: [{ scale: ring1Scale.value }],
  }));
  const ring2Style = useAnimatedStyle(() => ({
    opacity: ring2Opacity.value,
    transform: [{ scale: ring2Scale.value }],
  }));

  return (
    <LinearGradient
      colors={['#020617', '#0F172A', '#062F58']}
      style={styles.container}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
    >
      <View style={styles.content}>
        {/* Ripple rings */}
        <View style={styles.ringWrapper} pointerEvents="none">
          <Animated.View style={[styles.ringBase, ring2Style]} />
          <Animated.View style={[styles.ringBase, ring1Style]} />
        </View>

        <Animated.View style={[styles.logoContainer, logoStyle]}>
          <LogoMark size={160} />
        </Animated.View>

        <Animated.Text style={[styles.title, titleStyle]}>
          {t.common.appName}
        </Animated.Text>
        <Animated.Text style={[styles.subtitle, { color: c.primary[300] }, subtitleStyle]}>
          {t.splash.tagline}
        </Animated.Text>
      </View>

      <Animated.View style={[styles.footer, subtitleStyle]}>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <BounceDot key={i} delay={i * 220} active={i === 0} />
          ))}
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

function BounceDot({ delay, active }: { delay: number; active: boolean }) {
  const c = useThemeColors();
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(-7, { duration: 350 }), withTiming(0, { duration: 350 })),
        -1, false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  return (
    <Animated.View
      style={[
        styles.dot,
        style,
        { backgroundColor: active ? c.primary[400] : 'rgba(255,255,255,0.22)', width: active ? 20 : 6 },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center' },
  ringWrapper: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: 200, height: 200 },
  ringBase: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1.5,
    borderColor: 'rgba(26, 143, 232, 0.45)',
  },
  logoContainer: { marginBottom: spacing['2xl'] },
  title: {
    ...typography.hero,
    fontSize: 52,
    color: '#FFF',
    letterSpacing: -2,
    fontWeight: '900',
  },
  subtitle: {
    ...typography.body,
    marginTop: spacing.sm,
    letterSpacing: 0.8,
    textAlign: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  footer: { position: 'absolute', bottom: 60 },
  dots: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dot: { height: 6, borderRadius: 3 },
});
