import React, { useState, useCallback, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { SplashScreen } from '../screens/auth/SplashScreen';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { useAuthStore } from '../store/useAuthStore';
import { useWalletStore } from '../store/useWalletStore';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../types';
import { validateEnv } from '../config/env';
import { initializeAds } from '../lib/ads';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const {
    isAuthenticated,
    hasCompletedOnboarding,
    isLoading: authLoading,
    setOnboardingCompleted,
    initialize,
    user,
  } = useAuthStore();
  const { syncFromSupabase } = useWalletStore();
  const [showSplash, setShowSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);

  // Boot once on mount — validate env, initialize SDKs, restore session
  useEffect(() => {
    const boot = async () => {
      validateEnv();
      await Promise.all([
        initialize(),
        initializeAds().catch(() => {}),
      ]);
      setAppReady(true);
    };
    boot();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — run once on mount only

  // ─── Android Google OAuth deep-link handler ────────────────────────────────
  // When Chrome Custom Tab redirects to isai://auth/callback?code=...
  // Android fires a Linking event — we exchange the code for a Supabase session.
  useEffect(() => {
    const handleOAuthCallback = async (url: string) => {
      if (!url.includes('auth/callback')) return;
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (!error) {
          // onAuthStateChange fires SIGNED_IN → store is updated automatically
          const userId = useAuthStore.getState().user?.id;
          if (userId) syncFromSupabase(userId).catch(() => {});
        }
      } catch {
        // silently ignore — user stays on auth screen
      }
    };

    // App was fully closed and opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleOAuthCallback(url);
    });

    // App was in background and brought to foreground via deep link
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleOAuthCallback(url);
    });

    return () => subscription.remove();
  }, []);

  // Sync wallet whenever user logs in
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      syncFromSupabase(user.id).catch(() => {});
    }
  }, [isAuthenticated, user?.id]);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setOnboardingCompleted();
  }, [setOnboardingCompleted]);

  // Show minimal loading screen while restoring session (avoids auth flash)
  if (!appReady || authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        {showSplash ? (
          <Stack.Screen name="Splash">
            {() => <SplashScreen onFinish={handleSplashFinish} />}
          </Stack.Screen>
        ) : !hasCompletedOnboarding ? (
          <Stack.Screen name="Onboarding">
            {() => <OnboardingScreen onComplete={handleOnboardingComplete} />}
          </Stack.Screen>
        ) : !isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <Stack.Screen name="Main" component={MainNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
