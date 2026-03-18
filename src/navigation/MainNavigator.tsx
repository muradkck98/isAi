import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import { HomeScreen } from '../screens/main/HomeScreen';
import { UploadScreen } from '../screens/main/UploadScreen';
import { SocialScanScreen } from '../screens/main/SocialScanScreen';
import { ProcessingScreen } from '../screens/main/ProcessingScreen';
import { ResultScreen } from '../screens/main/ResultScreen';
import { HistoryScreen } from '../screens/main/HistoryScreen';
import { WalletScreen } from '../screens/main/WalletScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { AnimatedTabBar } from '../components/ui/AnimatedTabBar';
import { MainTabParamList, HomeStackParamList } from '../types';
import { useScanStore } from '../store/useScanStore';
import { useWalletStore } from '../store/useWalletStore';
import { useAuthStore } from '../store/useAuthStore';

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

// ─── Tab transition wrapper ────────────────────────────────────────────────
// Smooth fade + subtle upward slide when a tab becomes focused.
// opacity and transform are on SEPARATE Animated.Views to avoid the
// Reanimated warning about layout animations overwriting animated props.
function FadeSlideWrapper({ children }: { children: React.ReactNode }) {
  const isFocused   = useIsFocused();
  const opacity     = useSharedValue(0);
  const translateY  = useSharedValue(10);

  useEffect(() => {
    if (isFocused) {
      opacity.value    = withTiming(1,  { duration: 220 });
      translateY.value = withSpring(0,  { damping: 24, stiffness: 260, mass: 0.75 });
    } else {
      opacity.value    = 0;
      translateY.value = 10;
    }
  }, [isFocused]);

  // Separate animated views: outer handles opacity, inner handles transform.
  // This prevents Reanimated from warning about conflicting layout animations.
  const opacityStyle    = useAnimatedStyle(() => ({ flex: 1, opacity: opacity.value }));
  const translateStyle  = useAnimatedStyle(() => ({
    flex: 1,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={opacityStyle}>
      <Animated.View style={translateStyle}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}

// ─── Home stack (push navigation within Home tab) ─────────────────────────
function HomeStackNavigator() {
  const { setCurrentScan, runScan } = useScanStore();
  const { hasEnoughTokens, deductToken, deductTokenRemote } = useWalletStore();
  const { user } = useAuthStore();

  return (
    <HomeStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 280,
      }}
    >
      <HomeStack.Screen name="HomeScreen">
        {({ navigation }) => (
          <FadeSlideWrapper>
            <HomeScreen
              onNavigateToUpload={() => navigation.navigate('Upload')}
              onNavigateToHistory={() => navigation.getParent()?.navigate('History')}
              onNavigateToWallet={() => navigation.getParent()?.navigate('Wallet')}
              onNavigateToSocialScan={() => navigation.navigate('SocialScan')}
            />
          </FadeSlideWrapper>
        )}
      </HomeStack.Screen>

      <HomeStack.Screen
        name="Upload"
        options={{ animation: 'slide_from_right', animationDuration: 260 }}
      >
        {({ navigation }) => (
          <UploadScreen
            onGoBack={() => navigation.goBack()}
            onImageSelected={(uri) => {
              if (!hasEnoughTokens()) return;
              // Optimistic deduct locally; remote reconcile happens after scan
              deductToken();
              navigation.navigate('Processing', { imageUri: uri });
            }}
          />
        )}
      </HomeStack.Screen>

      <HomeStack.Screen
        name="SocialScan"
        options={{ animation: 'slide_from_right', animationDuration: 260 }}
      >
        {({ navigation }) => (
          <SocialScanScreen
            onGoBack={() => navigation.goBack()}
            onPostFetched={(thumbnailUri, socialMeta) => {
              if (!hasEnoughTokens()) return;
              deductToken();
              navigation.navigate('Processing', { imageUri: thumbnailUri, socialMeta });
            }}
          />
        )}
      </HomeStack.Screen>

      <HomeStack.Screen
        name="Processing"
        options={{ gestureEnabled: false, animation: 'fade_from_bottom', animationDuration: 360 }}
      >
        {({ navigation, route }) => (
          <ProcessingScreen
            imageUri={route.params.imageUri}
            socialMeta={route.params.socialMeta}
            onComplete={async () => {
              try {
                const userId = user?.id ?? 'anonymous';
                const socialMeta = route.params.socialMeta;

                const result = await runScan(
                  route.params.imageUri,
                  userId,
                  socialMeta
                    ? {
                        platform: socialMeta.platform,
                        postUrl: socialMeta.postUrl,
                        authorName: socialMeta.authorName,
                      }
                    : undefined
                );

                // Attach social metadata to result for ResultScreen display
                const enriched = socialMeta
                  ? { ...result, metadata: { socialMeta } }
                  : result;

                setCurrentScan(enriched);

                // Reconcile token deduction with server
                if (user?.id) {
                  deductTokenRemote(user.id, result.id).catch(() => {});
                }

                navigation.replace('Result', { scanId: enriched.id });
              } catch {
                navigation.goBack();
              }
            }}
          />
        )}
      </HomeStack.Screen>

      <HomeStack.Screen
        name="Result"
        options={{ animation: 'fade', animationDuration: 400 }}
      >
        {({ navigation }) => (
          <ResultScreen
            onGoHome={() => navigation.popToTop()}
            onScanAnother={() => {
              navigation.popToTop();
              navigation.navigate('Upload');
            }}
          />
        )}
      </HomeStack.Screen>
    </HomeStack.Navigator>
  );
}

// ─── Tab screen wrappers ───────────────────────────────────────────────────
function HistoryTab() { return <FadeSlideWrapper><HistoryScreen /></FadeSlideWrapper>; }
function WalletTab()  { return <FadeSlideWrapper><WalletScreen /></FadeSlideWrapper>;  }
function ProfileTab() { return <FadeSlideWrapper><ProfileScreen /></FadeSlideWrapper>; }

// ─── Main navigator ────────────────────────────────────────────────────────
export function MainNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
      }}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="History" component={HistoryTab} />
      <Tab.Screen name="Wallet" component={WalletTab} />
      <Tab.Screen name="Profile" component={ProfileTab} />
    </Tab.Navigator>
  );
}
