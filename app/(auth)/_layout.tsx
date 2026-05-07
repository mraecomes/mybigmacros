import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Sign In', headerShown: false }} />
      <Stack.Screen name="signup" options={{ title: 'Create Account', headerShown: false }} />
      <Stack.Screen name="reset" options={{ title: 'Reset Password', headerShown: false }} />
      <Stack.Screen name="update-password" options={{ headerShown: false }} />
    </Stack>
  );
}
