import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, Dimensions, FlatList, ViewToken } from 'react-native';
import Animated, { FadeInUp, FadeInDown, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTranslation } from '../../hooks/useTranslation';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { motion } from '../../theme/motion';
import { Button } from '../../components/ui/Button';
import { haptic } from '../../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ICONS = ['🔍', '⚡', '🌐'];

interface OnboardingScreenProps { onComplete: () => void; }

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const slides = [
    { id: '1', title: t.onboarding.slide1Title, description: t.onboarding.slide1Description, icon: ICONS[0] },
    { id: '2', title: t.onboarding.slide2Title, description: t.onboarding.slide2Description, icon: ICONS[1] },
    { id: '3', title: t.onboarding.slide3Title, description: t.onboarding.slide3Description, icon: ICONS[2] },
  ];

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index ?? 0);
  }).current;

  const handleNext = () => {
    haptic.light();
    if (currentIndex < slides.length - 1) flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    else onComplete();
  };

  return (
    <LinearGradient colors={[c.neutral[0], c.primary[50]]} style={styles.container}>
      <View style={styles.skipContainer}>
        {currentIndex < slides.length - 1 && (
          <Animated.View entering={FadeInUp.duration(400)}>
            <Button title={t.onboarding.skip} onPress={() => { haptic.light(); onComplete(); }} variant="ghost" size="sm" fullWidth={false} />
          </Animated.View>
        )}
      </View>
      <FlatList ref={flatListRef} data={slides} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onViewableItemsChanged={onViewableItemsChanged} viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }} keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Animated.View entering={FadeInUp.delay(200).duration(600).springify()}>
              <LinearGradient colors={[c.primary[100], c.primary[50]]} style={styles.iconCircle}><Text style={styles.iconText}>{item.icon}</Text></LinearGradient>
            </Animated.View>
            <Animated.Text entering={FadeInUp.delay(400).duration(500)} style={[styles.slideTitle, { color: c.neutral[900] }]}>{item.title}</Animated.Text>
            <Animated.Text entering={FadeInUp.delay(600).duration(500)} style={[styles.slideDescription, { color: c.neutral[500] }]}>{item.description}</Animated.Text>
          </View>
        )}
      />
      <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.footer}>
        <View style={styles.pagination}>
          {slides.map((_, index) => (<PaginationDot key={index} index={index} currentIndex={currentIndex} />))}
        </View>
        <Button title={currentIndex === slides.length - 1 ? t.onboarding.getStarted : t.common.continue} onPress={handleNext} size="lg" />
      </Animated.View>
    </LinearGradient>
  );
}

function PaginationDot({ index, currentIndex }: { index: number; currentIndex: number }) {
  const c = useThemeColors();
  const isActive = index === currentIndex;
  const animatedStyle = useAnimatedStyle(() => ({ width: withSpring(isActive ? 24 : 8, motion.spring.snappy), backgroundColor: isActive ? c.primary[500] : c.neutral[300] }));
  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipContainer: { alignItems: 'flex-end', paddingHorizontal: spacing.xl, paddingTop: spacing['5xl'], minHeight: 80 },
  slide: { width: SCREEN_WIDTH, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing['3xl'], paddingBottom: spacing['6xl'] },
  iconCircle: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center', marginBottom: spacing['3xl'] },
  iconText: { fontSize: 64 },
  slideTitle: { ...typography.h1, textAlign: 'center', marginBottom: spacing.lg },
  slideDescription: { ...typography.body, textAlign: 'center', lineHeight: 24, paddingHorizontal: spacing.lg },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'] },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: spacing['2xl'] },
  dot: { height: 8, borderRadius: 4 },
});
