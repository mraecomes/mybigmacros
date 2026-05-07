import { AppName } from '@/components/ui/AppName';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, spacing, typography } from '@/constants/theme';
import { resetPassword } from '@/lib/supabase/auth';
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

export default function ResetScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleReset() {
    setError('');
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch {
      setError("We couldn't send a reset email. Check the address and try again.");
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
          <Text style={styles.subtitle}>Reset your password</Text>
        </View>

        {sent ? (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Check your email</Text>
            <Text style={styles.successBody}>
              We sent a password reset link to {email.trim()}. The link expires in 1 hour.
            </Text>
            <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.backLink}>
              <Text style={styles.backLinkText}>Back to sign in</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.instructions}>
              Enter the email address for your account and we'll send you a reset link.
            </Text>

            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
            />

            {error !== '' && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            <View style={styles.buttonWrapper}>
              <Button
                label={loading ? 'Sending…' : 'Send Reset Link'}
                onPress={handleReset}
                disabled={loading || email.trim() === ''}
              />
            </View>

            <Pressable onPress={() => router.back()} style={styles.backLink}>
              <Text style={styles.backLinkText}>Back to sign in</Text>
            </Pressable>
          </View>
        )}
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
    marginBottom: spacing['3xl'],
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  form: {
    gap: spacing.lg,
  },
  instructions: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
    textAlign: 'center',
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
  backLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  backLinkText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  successCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.xl,
    gap: spacing.md,
    ...(Platform.OS === 'web' && { maxWidth: 600, width: '100%', alignSelf: 'center' as const }),
  },
  successTitle: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize.lg,
    color: colors.success,
  },
  successBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
});
