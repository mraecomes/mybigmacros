import '../global.css';
import { Bungee_400Regular } from '@expo-google-fonts/bungee';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { router, Stack, useRootNavigationState, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { AuthContext } from '@/lib/supabase/AuthContext';
import { getProfile } from '@/lib/supabase/auth';
import { consumePendingRecovery, supabase } from '@/lib/supabase/client';
import type { AuthState, Session } from '@/types/auth';
import { colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

function useAuthGuard(authState: AuthState) {
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key) return;
    if (authState.status === 'loading') return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    const inTabs = segments[0] === '(tabs)';
    const inUpdatePassword = segments[1] === 'update-password';

    if (authState.status === 'unauthenticated' && !inAuth) {
      router.replace('/(auth)/login');
    } else if (authState.status === 'recovery' && !inUpdatePassword) {
      router.replace('/(auth)/update-password');
    } else if (authState.status === 'onboarding' && !inOnboarding) {
      router.replace('/onboarding');
    } else if (authState.status === 'authenticated' && !inTabs) {
      router.replace('/(tabs)/nearby');
    }
  }, [authState, segments, navigationState]);
}

async function resolveProfile(session: Session, setAuthState: (s: AuthState) => void) {
  try {
    const profile = await getProfile(session.user.id);
    if (!profile) {
      setAuthState({ status: 'onboarding', session });
    } else {
      setAuthState({ status: 'authenticated', session, profile });
    }
  } catch {
    setAuthState({ status: 'unauthenticated' });
  }
}

export default function RootLayout() {
  const [queryClientInstance] = useState(() => new QueryClient());
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });

  const [loaded, fontError] = useFonts({
    Bungee_400Regular,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!session) {
          setAuthState({ status: 'unauthenticated' });
          return;
        }
        if (event === 'PASSWORD_RECOVERY') {
          setAuthState({ status: 'recovery', session });
          return;
        }
        if (event === 'INITIAL_SESSION' && consumePendingRecovery()) {
          setAuthState({ status: 'recovery', session });
          return;
        }
        if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          return;
        }
        await resolveProfile(session, setAuthState);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fontsReady = loaded || !!fontError;

  useEffect(() => {
    if (fontsReady && authState.status !== 'loading') {
      SplashScreen.hideAsync();
    }
  }, [fontsReady, authState.status]);

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setAuthState({ status: 'unauthenticated' });
      return;
    }
    await resolveProfile(session, setAuthState);
  }, []);

  useAuthGuard(authState);

  if (!fontsReady || authState.status === 'loading') {
    if (Platform.OS === 'web') {
      return <View style={{ flex: 1, backgroundColor: colors.background }} />;
    }
    return null;
  }

  return (
    <AuthContext.Provider value={{ refreshProfile }}>
      <QueryClientProvider client={queryClientInstance}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="restaurant/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="item/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </QueryClientProvider>
    </AuthContext.Provider>
  );
}
