import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  FlatList,
  ViewToken,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Animated, {
  FadeInUp,
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTranslation } from '../../hooks/useTranslation';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { motion } from '../../theme/motion';
import { radius } from '../../theme/radius';
import { Button } from '../../components/ui/Button';
import { haptic } from '../../utils/haptics';

const { width: W, height: H } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    id: '1',
    gradient: ['#0EA5E9', '#6366F1'] as [string, string],
    bgGradient: ['#0F172A', '#1E1B4B'] as [string, string],
    icon: '🔍',
    badge: 'AI DETECTION',
    trustPoints: ['Sightengine AI', '99.2% Accuracy', 'Real-time'],
  },
  {
    id: '2',
    gradient: ['#8B5CF6', '#EC4899'] as [string, string],
    bgGradient: ['#0F172A', '#1E0A2E'] as [string, string],
    icon: '⚡',
    badge: 'INSTANT RESULTS',
    trustPoints: ['< 3 seconds', 'Detailed report', 'Confidence score'],
  },
  {
    id: '3',
    gradient: ['#10B981', '#3B82F6'] as [string, string],
    bgGradient: ['#0F172A', '#0A1F2E'] as [string, string],
    icon: '🌐',
    badge: 'TRUSTED WORLDWIDE',
    trustPoints: ['Social media scan', 'Share results', 'Privacy first'],
  },
];

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);

  const slides = [
    {
      ...SLIDES[0],
      title: t.onboarding.slide1Title,
      description: t.onboarding.slide1Description,
    },
    {
      ...SLIDES[1],
      title: t.onboarding.slide2Title,
      description: t.onboarding.slide2Description,
    },
    {
      ...SLIDES[2],
      title: t.onboarding.slide3Title,
      description: t.onboarding.slide3Description,
    },
  ];

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index ?? 0);
  }).current;

  const handleNext = () => {
    haptic.light();
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      onComplete();
    }
  };

  const currentSlide = SLIDES[currentIndex];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={currentSlide.bgGradient}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Skip */}
      <Animated.View entering={FadeIn.duration(600)} style={styles.skipContainer}>
        {currentIndex < slides.length - 1 && (
          <TouchableOpacity onPress={() => { haptic.light(); onComplete(); }} style={styles.skipBtn}>
            <Text style={styles.skipText}>{t.onboarding.skip}</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <SlideItem item={item} index={index} currentIndex={currentIndex} />
        )}
      />

      {/* Footer */}
      <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.footer}>
        {/* Pagination */}
        <View style={styles.pagination}>
          {slides.map((_, i) => (
            <PaginationDot key={i} index={i} currentIndex={currentIndex} gradient={currentSlide.gradient} />
          ))}
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.9}
          style={styles.ctaWrapper}
        >
          <LinearGradient
            colors={currentSlide.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaButton}
          >
            <Text style={styles.ctaText}>
              {currentIndex === slides.length - 1 ? t.onboarding.getStarted : t.common.continue}
            </Text>
            <Text style={styles.ctaArrow}>→</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Trust row */}
        <View style={styles.trustRow}>
          <Text style={styles.trustText}>🔒 No personal data required</Text>
          <Text style={styles.trustDot}>·</Text>
          <Text style={styles.trustText}>Free to start</Text>
        </View>
      </Animated.View>
    </View>
  );
}

function SlideItem({
  item,
  index,
  currentIndex,
}: {
  item: (typeof SLIDES[0]) & { title: string; description: string };
  index: number;
  currentIndex: number;
}) {
  const isActive = index === currentIndex;

  return (
    <View style={[styles.slide]}>
      {/* Hero visual */}
      <Animated.View
        entering={isActive ? FadeInUp.delay(100).duration(700).springify() : undefined}
        style={styles.heroContainer}
      >
        {/* Glow rings */}
        <View style={[styles.ring, styles.ring3, { borderColor: item.gradient[0] + '20' }]} />
        <View style={[styles.ring, styles.ring2, { borderColor: item.gradient[0] + '40' }]} />
        <View style={[styles.ring, styles.ring1, { borderColor: item.gradient[0] + '60' }]} />

        {/* Icon card */}
        <LinearGradient
          colors={item.gradient}
          style={styles.iconCard}
        >
          <Text style={styles.iconText}>{item.icon}</Text>
        </LinearGradient>

        {/* Badge */}
        <View style={[styles.badge, { backgroundColor: item.gradient[0] + '25', borderColor: item.gradient[0] + '60' }]}>
          <Text style={[styles.badgeText, { color: item.gradient[0] }]}>{item.badge}</Text>
        </View>

        {/* Trust points */}
        <View style={styles.trustPoints}>
          {item.trustPoints.map((point, i) => (
            <Animated.View
              key={i}
              entering={isActive ? FadeInUp.delay(300 + i * 100).duration(500) : undefined}
              style={[styles.trustPoint, { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)' }]}
            >
              <Text style={styles.trustPointCheck}>✓</Text>
              <Text style={styles.trustPointText}>{point}</Text>
            </Animated.View>
          ))}
        </View>
      </Animated.View>

      {/* Text */}
      <Animated.View
        entering={isActive ? FadeInUp.delay(300).duration(600) : undefined}
        style={styles.textContainer}
      >
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideDesc}>{item.description}</Text>
      </Animated.View>
    </View>
  );
}

function PaginationDot({
  index,
  currentIndex,
  gradient,
}: {
  index: number;
  currentIndex: number;
  gradient: [string, string];
}) {
  const isActive = index === currentIndex;
  const animatedStyle = useAnimatedStyle(() => ({
    width: withSpring(isActive ? 28 : 8, motion.spring.snappy),
    opacity: withSpring(isActive ? 1 : 0.35, motion.spring.snappy),
  }));

  return (
    <Animated.View style={[styles.dot, animatedStyle]}>
      {isActive ? (
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(255,255,255,0.5)' }]} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  skipContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 44,
    right: spacing.xl,
    zIndex: 10,
  },
  skipBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  skipText: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  slide: {
    width: W,
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  heroContainer: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
  },
  ring1: { width: 180, height: 180 },
  ring2: { width: 230, height: 230 },
  ring3: { width: 280, height: 280 },
  iconCard: {
    width: 120,
    height: 120,
    borderRadius: radius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  iconText: {
    fontSize: 56,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  trustPoints: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  trustPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  trustPointCheck: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
  },
  trustPointText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacing.md,
    letterSpacing: -0.5,
  },
  slideDesc: {
    ...typography.body,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 44 : spacing['3xl'],
    paddingTop: spacing.xl,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing['2xl'],
  },
  dot: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  ctaWrapper: {
    borderRadius: radius['2xl'],
    overflow: 'hidden',
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: spacing.sm,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  ctaArrow: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  trustText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  trustDot: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.25)',
  },
});
