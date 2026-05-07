import { AppName } from '@/components/ui/AppName';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing, typography } from '@/constants/theme';
import { signIn } from '@/lib/supabase/auth';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch {
      setError('The email or password you entered is incorrect. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <AppName />
          <Text style={styles.tagline}>Fuel Your Cravings. Hit Your Macros.</Text>
        </View>

        <View style={styles.form}>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
          />

          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            textContentType="password"
          />

          {error !== '' && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <View style={styles.buttonWrapper}>
            <Button
              label={loading ? 'Signing in…' : 'Sign In'}
              onPress={handleSignIn}
              disabled={loading || email.trim() === '' || password === ''}
            />
          </View>

          <Pressable onPress={() => router.push('/(auth)/reset')} style={styles.link}>
            <Text style={styles.linkText}>Forgot password?</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Pressable onPress={() => router.replace('/(auth)/signup')}>
            <Text style={styles.footerLink}>Create one</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['3xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: 64,
  },
  tagline: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xl,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  form: {
    gap: spacing.lg,
  },
  errorText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.error,
    textAlign: 'center',
    ...(Platform.OS === 'web' && { maxWidth: 600, width: '100%', alignSelf: 'center' as const }),
  },
  buttonWrapper: {
    marginTop: spacing.sm,
  },
  link: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  linkText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing['2xl'],
  },
  footerText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  footerLink: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },
});
