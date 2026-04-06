import React, { useEffect, Component } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StyleSheet, Text, View, TouchableOpacity, Appearance } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { RootNavigator } from './src/navigation';
import { supabase } from './src/lib/supabase';
import { useAuthStore } from './src/store/useAuthStore';
import { useWalletStore } from './src/store/useWalletStore';
import { useSettingsStore } from './src/store/useSettingsStore';
import { monitoring, Events } from './src/lib/monitoring';

// Required for expo-web-browser OAuth on Android
WebBrowser.maybeCompleteAuthSession();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

// ─── Error Boundary ──────────────────────────────────────────────────────────

interface ErrorBoundaryState { hasError: boolean; error: Error | null }

class ErrorBoundary extends Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    monitoring.captureError(error, { componentStack: info.componentStack ?? undefined });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.emoji}>⚠️</Text>
          <Text style={errorStyles.title}>Something went wrong</Text>
          <Text style={errorStyles.message}>{this.state.error?.message}</Text>
          <TouchableOpacity
            style={errorStyles.button}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={errorStyles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  message: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', marginBottom: 32 },
  button: { backgroundColor: '#1A8FE8', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

// ─── App Content ─────────────────────────────────────────────────────────────

function AppContent() {
  const { syncFromSupabase } = useWalletStore();
  const { resolveTheme } = useSettingsStore();

  useEffect(() => {
    // Resolve theme on system appearance change
    const subscription = Appearance.addChangeListener(() => {
      resolveTheme();
    });
    return () => subscription.remove();
  }, [resolveTheme]);

  useEffect(() => {
    // ─── Handle deep link OAuth callback (Android + cold start) ──────────
    const handleUrl = async ({ url }: { url: string }) => {
      if (!url.includes('auth/callback')) return;

      try {
        // Implicit flow: tokens in URL fragment (#access_token=...)
        const hashIndex = url.indexOf('#');
        const queryIndex = url.indexOf('?');
        let paramStr = '';
        if (hashIndex !== -1) paramStr = url.slice(hashIndex + 1);
        else if (queryIndex !== -1) paramStr = url.slice(queryIndex + 1);

        const params = new URLSearchParams(paramStr);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else {
          // Fallback for edge cases
          const { error } = await supabase.auth.exchangeCodeForSession(url);
          if (error) throw error;
        }

        monitoring.track(Events.GOOGLE_LOGIN_SUCCESS);
        setTimeout(() => {
          const userId = useAuthStore.getState().user?.id;
          if (userId) {
            monitoring.identify(userId);
            syncFromSupabase(userId).catch(() => {});
          }
        }, 600);
      } catch (err) {
        monitoring.captureError(err, { context: 'deep_link_handler' });
      }
    };

    const subscription = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    return () => {
      subscription.remove();
    };
  }, [syncFromSupabase]);

  return <RootNavigator />;
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <AppContent />
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
