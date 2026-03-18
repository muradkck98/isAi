import React, { useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTranslation } from '../../hooks/useTranslation';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { motion } from '../../theme/motion';
import { haptic } from '../../utils/haptics';

// ─── Constants ────────────────────────────────────────────────────────────────
const H_PAD        = spacing.md;
const INDICATOR_W  = 28;
const INDICATOR_H  = 3;
const ICON_SIZE    = 24;

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// Outline (inactive) → Filled (active)
const TAB_ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  Home:    { active: 'home',           inactive: 'home-outline' },
  History: { active: 'time',           inactive: 'time-outline' },
  Wallet:  { active: 'wallet',         inactive: 'wallet-outline' },
  Profile: { active: 'person-circle',  inactive: 'person-circle-outline' },
};

const TAB_LABEL_KEYS: Record<string, 'home' | 'history' | 'wallet' | 'profile'> = {
  Home:    'home',
  History: 'history',
  Wallet:  'wallet',
  Profile: 'profile',
};

// ─── Main Tab Bar ─────────────────────────────────────────────────────────────
export function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const c = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();

  const tabCount = state.routes.length;
  const tabWidth = (screenWidth - H_PAD * 2) / tabCount;

  // Single sliding pill that moves between tabs
  const pillX = useSharedValue(
    state.index * tabWidth + (tabWidth - INDICATOR_W) / 2,
  );

  useEffect(() => {
    pillX.value = withSpring(
      state.index * tabWidth + (tabWidth - INDICATOR_W) / 2,
      { damping: 18, stiffness: 160, mass: 0.75 },
    );
  }, [state.index, tabWidth]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: c.neutral[0] }]}>
      {/* Hairline top border */}
      <View style={[styles.divider, { backgroundColor: c.neutral[100] }]} />

      {/* Sliding top-pill indicator */}
      <Animated.View
        pointerEvents="none"
        style={[styles.indicatorPill, { backgroundColor: c.primary[500] }, pillStyle]}
      />

      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const icons     = TAB_ICONS[route.name];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              haptic.selection();
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            haptic.light();
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <AnimatedTab
              key={route.key}
              iconActive={icons?.active ?? 'ellipse'}
              iconInactive={icons?.inactive ?? 'ellipse-outline'}
              routeName={route.name}
              isFocused={isFocused}
              tabWidth={tabWidth}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── Single Tab Item ──────────────────────────────────────────────────────────
function AnimatedTab({
  iconActive,
  iconInactive,
  routeName,
  isFocused,
  tabWidth,
  onPress,
  onLongPress,
}: {
  iconActive: IoniconName;
  iconInactive: IoniconName;
  routeName: string;
  isFocused: boolean;
  tabWidth: number;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const c = useThemeColors();
  const { t } = useTranslation();

  const tabKey = TAB_LABEL_KEYS[routeName];
  const label  = tabKey ? t.tabs[tabKey] : routeName;

  // ── Shared values ─────────────────────────────────────────────────────────
  const pressScale      = useSharedValue(1);
  const iconTranslateY  = useSharedValue(isFocused ? -2 : 1);
  const iconScale       = useSharedValue(isFocused ? 1.12 : 0.92);
  const bgOpacity       = useSharedValue(isFocused ? 1 : 0);
  const bgScale         = useSharedValue(isFocused ? 1 : 0.55);
  // Label: always visible, just color + size change (no translateY for inactive)
  const labelOpacity    = useSharedValue(isFocused ? 1 : 0.45);
  const labelScale      = useSharedValue(isFocused ? 1 : 0.88);

  useEffect(() => {
    if (isFocused) {
      iconTranslateY.value = withSpring(-2, { damping: 13, stiffness: 240, mass: 0.65 });
      iconScale.value      = withSpring(1.12, { damping: 13, stiffness: 240, mass: 0.65 });
      bgOpacity.value      = withTiming(1, { duration: 180 });
      bgScale.value        = withSpring(1, { damping: 15, stiffness: 220 });
      labelOpacity.value   = withTiming(1, { duration: 200 });
      labelScale.value     = withSpring(1, { damping: 16, stiffness: 200 });
    } else {
      iconTranslateY.value = withSpring(1, { damping: 16, stiffness: 220 });
      iconScale.value      = withSpring(0.92, { damping: 16, stiffness: 220 });
      bgOpacity.value      = withTiming(0, { duration: 140 });
      bgScale.value        = withTiming(0.55, { duration: 140 });
      labelOpacity.value   = withTiming(0.45, { duration: 160 });
      labelScale.value     = withTiming(0.88, { duration: 160 });
    }
  }, [isFocused]);

  // ── Animated styles ───────────────────────────────────────────────────────
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const iconWrapperStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: iconTranslateY.value },
      { scale: iconScale.value },
    ],
  }));

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
    transform: [{ scale: bgScale.value }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    transform: [{ scale: labelScale.value }],
  }));

  const activeColor   = c.primary[600];
  const inactiveColor = c.neutral[400];
  const iconColor     = isFocused ? activeColor : inactiveColor;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        pressScale.value = withSpring(0.86, { damping: 12, stiffness: 320 });
      }}
      onPressOut={() => {
        pressScale.value = withSpring(1, motion.spring.bouncy);
      }}
      style={[styles.tabItem, { width: tabWidth }]}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.tabContent, pressStyle]}>
        {/* Icon with animated background pill */}
        <Animated.View style={[styles.iconWrapper, iconWrapperStyle]}>
          <Animated.View
            style={[styles.iconBg, { backgroundColor: c.primary[50] }, bgStyle]}
          />
          <Ionicons
            name={isFocused ? iconActive : iconInactive}
            size={ICON_SIZE}
            color={iconColor}
          />
        </Animated.View>

        {/* Label — always rendered, opacity fades between 0.45 ↔ 1 */}
        <Animated.Text
          style={[
            styles.label,
            { color: iconColor },
            labelStyle,
          ]}
          numberOfLines={1}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 26 : 10,
    paddingTop: 6,
    paddingHorizontal: H_PAD,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.07,
        shadowRadius: 20,
      },
      android: { elevation: 20 },
    }),
  },
  divider: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  indicatorPill: {
    position: 'absolute',
    top: 0,
    left: H_PAD,
    width: INDICATOR_W,
    height: INDICATOR_H,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minHeight: 52,
    gap: 3,
  },
  iconWrapper: {
    width: 50,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
  label: {
    ...typography.captionMedium,
    fontSize: 11,
  },
});
