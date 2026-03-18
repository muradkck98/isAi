import React from 'react';
import {
  StyleSheet,
  View,
  ViewStyle,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useIsDark } from '../../hooks/useThemeColors';
import { spacing } from '../../theme/spacing';
import { TAB_BAR_HEIGHT } from '../../constants';

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  keyboardAware?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  backgroundColor?: string;
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
  statusBarStyle?: 'light-content' | 'dark-content';
  padding?: boolean;
  /** Set true for screens inside the bottom tab navigator to add tab bar clearance */
  inTabNavigator?: boolean;
}

export function Screen({
  children,
  scrollable = false,
  keyboardAware = false,
  style,
  contentContainerStyle,
  backgroundColor,
  edges = ['top', 'bottom'],
  statusBarStyle,
  padding = true,
  inTabNavigator = false,
}: ScreenProps) {
  const c = useThemeColors();
  const isDark = useIsDark();

  const { width } = useWindowDimensions();
  // Horizontal padding scales slightly on narrow screens (< 360px = very small phones)
  const hPad = width < 360 ? spacing.lg : spacing.xl;

  const bgColor = backgroundColor ?? c.background.primary;
  const barStyle = statusBarStyle ?? (isDark ? 'light-content' : 'dark-content');

  const bottomPadding = inTabNavigator ? TAB_BAR_HEIGHT + spacing.md : 0;

  const content = (
    <View style={[styles.inner, padding && { paddingHorizontal: hPad }, contentContainerStyle]}>
      {children}
    </View>
  );

  const scrollContent = scrollable ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      bounces={true}
    >
      {content}
    </ScrollView>
  ) : (
    content
  );

  const keyboardContent = keyboardAware ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {scrollContent}
    </KeyboardAvoidingView>
  ) : (
    scrollContent
  );

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.container, { backgroundColor: bgColor }, style]}
    >
      <StatusBar barStyle={barStyle} backgroundColor={bgColor} />
      {keyboardContent}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingTop: spacing.lg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
