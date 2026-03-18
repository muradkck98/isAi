import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { RootNavigator } from './src/navigation';
import { supabase } from './src/lib/supabase';
import { useAuthStore } from './src/store/useAuthStore';
import { useWalletStore } from './src/store/useWalletStore';

// Required for expo-web-browser OAuth on Android
WebBrowser.maybeCompleteAuthSession();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function AppContent() {
  const { syncFromSupabase } = useWalletStore();

  useEffect(() => {
    // ─── Handle deep link OAuth callback (Android + cold start) ──────────
    // On Android, WebBrowser.openAuthSessionAsync may return 'cancel' even
    // when auth succeeds — because the OS intercepts the deep link before
    // the in-app browser can. This listener catches isai://auth/callback
    // and exchanges the code for a Supabase session.
    const handleUrl = async ({ url }: { url: string }) => {
      if (!url.includes('auth/callback')) return;

      try {
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) {
          console.warn('[OAuth] exchangeCodeForSession error:', error.message);
          return;
        }
        // onAuthStateChange in useAuthStore fires SIGNED_IN → user is set
        // Sync wallet after a short delay to let the store settle
        setTimeout(() => {
          const userId = useAuthStore.getState().user?.id;
          if (userId) syncFromSupabase(userId).catch(() => {});
        }, 600);
      } catch (err) {
        console.warn('[OAuth] Deep link handler error:', err);
      }
    };

    // Listen for deep links while app is open
    const subscription = Linking.addEventListener('url', handleUrl);

    // Handle the case where the app was opened via a deep link (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    return () => {
      subscription.remove();
    };
  }, [syncFromSupabase]);

  return <RootNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppContent />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
