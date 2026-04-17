import React, { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
// Note: withSpring used in FadeSlideWrapper translateY animation
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import { HomeScreen } from '../screens/main/HomeScreen';
import { UploadScreen } from '../screens/main/UploadScreen';
import { SocialScanScreen } from '../screens/main/SocialScanScreen';
import { ProcessingScreen } from '../screens/main/ProcessingScreen';
import { ResultScreen } from '../screens/main/ResultScreen';
import { WalletScreen } from '../screens/main/WalletScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { AnimatedTabBar } from '../components/ui/AnimatedTabBar';
import { PaywallScreen } from '../screens/main/PaywallScreen';
import { MainTabParamList, MainStackParamList, HomeStackParamList, ScanResult } from '../types';
import { useScanStore } from '../store/useScanStore';
import { useWalletStore } from '../store/useWalletStore';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from '../hooks/useTranslation';

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

// ─── Tab transition wrapper ────────────────────────────────────────────────
// Uses a single Animated.View with combined style to avoid Reanimated
// "property may be overwritten by layout animation" warnings.
function FadeSlideWrapper({ children }: { children: React.ReactNode }) {
  const isFocused  = useIsFocused();
  const opacity    = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    if (isFocused) {
      opacity.value    = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, { damping: 22, stiffness: 280, mass: 0.7 });
    } else {
      opacity.value    = withTiming(0, { duration: 100 });
      translateY.value = 8;
    }
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => ({
    flex: 1,
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
}

// ─── Home stack ────────────────────────────────────────────────────────────
function HomeStackNavigator() {
  const { setCurrentScan, runScan } = useScanStore();
  const { hasEnoughTokens, deductToken, deductTokenRemote } = useWalletStore();
  const { user } = useAuthStore();
  const { t } = useTranslation();

  // In-flight scan promise runs PARALLEL with ProcessingScreen animation
  const pendingResult = useRef<Promise<ScanResult> | null>(null);

  const showNoTokensAlert = (navigation: any) => {
    Alert.alert(
      t.upload.noTokensTitle,
      t.upload.noTokensBody,
      [
        { text: t.common.cancel ?? 'Cancel', style: 'cancel' },
        {
          text: t.wallet.tokenPacks ?? 'Get Tokens',
          onPress: () => navigation.getParent()?.getParent()?.navigate('Paywall'),
        },
      ]
    );
  };

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
              if (!hasEnoughTokens()) {
                showNoTokensAlert(navigation);
                return;
              }
              deductToken(); // optimistic local deduct — remote sync happens after result
              pendingResult.current = runScan(uri, user?.id ?? 'anonymous', undefined);
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
              if (!hasEnoughTokens()) {
                showNoTokensAlert(navigation);
                return;
              }
              deductToken();
              pendingResult.current = runScan(thumbnailUri, user?.id ?? 'anonymous', {
                platform: socialMeta.platform,
                postUrl: socialMeta.postUrl,
                authorName: socialMeta.authorName,
              });
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
                const routeSocialMeta = route.params.socialMeta;

                const result = await (pendingResult.current ?? runScan(
                  route.params.imageUri,
                  userId,
                  routeSocialMeta
                    ? {
                        platform: routeSocialMeta.platform,
                        postUrl: routeSocialMeta.postUrl,
                        authorName: routeSocialMeta.authorName,
                      }
                    : undefined
                ));
                pendingResult.current = null;

                const enriched = routeSocialMeta
                  ? { ...result, metadata: { socialMeta: routeSocialMeta } }
                  : result;

                setCurrentScan(enriched);

                if (user?.id) {
                  deductTokenRemote(user.id).catch(() => {});
                }

                navigation.replace('Result', { scanId: enriched.id });
              } catch (err) {
                pendingResult.current = null;
                const message = err instanceof Error ? err.message : 'Analysis failed';
                Alert.alert('Error', message, [
                  { text: 'OK', onPress: () => navigation.goBack() },
                ]);
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
function WalletTab()  { return <FadeSlideWrapper><WalletScreen /></FadeSlideWrapper>;  }
function ProfileTab() { return <FadeSlideWrapper><ProfileScreen /></FadeSlideWrapper>; }

// ─── Tab navigator ─────────────────────────────────────────────────────────
function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
      }}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Wallet" component={WalletTab} />
      <Tab.Screen name="Profile" component={ProfileTab} />
    </Tab.Navigator>
  );
}

// ─── Main navigator (Tabs + Paywall modal) ─────────────────────────────────
// Paywall is a root-level modal so any tab can navigate to it via
// navigation.getParent()?.navigate('Paywall')
export function MainNavigator() {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
      }}
    >
      <MainStack.Screen
        name="Tabs"
        component={TabNavigator}
        options={{ animation: 'none' }}
      />
      <MainStack.Screen
        name="Paywall"
        options={{
          animation: 'slide_from_bottom',
          animationDuration: 400,
          gestureEnabled: true,
          gestureDirection: 'vertical',
        }}
      >
        {({ navigation }) => (
          <PaywallScreen
            onClose={() => navigation.goBack()}
            onPurchase={() => navigation.goBack()}
          />
        )}
      </MainStack.Screen>
    </MainStack.Navigator>
  );
}
