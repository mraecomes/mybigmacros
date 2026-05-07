import { AppName } from '@/components/ui/AppName';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { signUp } from '@/lib/supabase/auth';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  DimensionValue,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type PasswordStrength = 'weak' | 'fair' | 'strong';

function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return 'weak';
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  if (hasNumber && hasSpecial) return 'strong';
  return 'fair';
}

const strengthLabel: Record<PasswordStrength, string> = {
  weak: 'Weak',
  fair: 'Fair',
  strong: 'Strong',
};

const strengthColor: Record<PasswordStrength, string> = {
  weak: colors.error,
  fair: colors.warning,
  strong: colors.success,
};

const strengthWidth: Record<PasswordStrength, DimensionValue> = {
  weak: '33%',
  fair: '66%',
  strong: '100%',
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const strength = password.length > 0 ? getPasswordStrength(password) : null;

  function handleEmailChange(text: string) {
    setEmail(text);
    if (emailError && isValidEmail(text.trim())) {
      setEmailError('');
    }
  }

  function handleEmailBlur() {
    if (email.trim() !== '' && !isValidEmail(email.trim())) {
      setEmailError('Please enter a valid email address.');
    } else {
      setEmailError('');
    }
  }

  const canSubmit =
    isValidEmail(email.trim()) &&
    password.length >= 8 &&
    confirmPassword === password &&
    !loading;

  async function handleSignUp() {
    setError('');
    setLoading(true);
    try {
      const data = await signUp(email.trim(), password);
      if (!data.session) {
        // Email confirmation is enabled — session won't exist until the user confirms.
        // Auth listener will handle the redirect once they confirm and return to the app.
        setConfirmationSent(true);
      }
      // If data.session exists, the onAuthStateChange listener in _layout.tsx fires
      // and handles the redirect to onboarding automatically.
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign up failed. Please try again.';
      setError(message);
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
          <Text style={styles.subtitle}>Create your account</Text>
        </View>

        {confirmationSent && (
          <View style={styles.confirmationCard}>
            <Text style={styles.confirmationTitle}>Check your inbox</Text>
            <Text style={styles.confirmationBody}>
              We sent a confirmation link to {email.trim()}. Open it to activate your account, then come back and sign in.
            </Text>
            <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.confirmationLink}>
              <Text style={styles.footerLink}>Back to sign in</Text>
            </Pressable>
          </View>
        )}

        {!confirmationSent && <View style={styles.form}>
          <View>
            <Input
              value={email}
              onChangeText={handleEmailChange}
              onBlur={handleEmailBlur}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
            />
            {emailError !== '' && (
              <Text style={[styles.matchIndicator, styles.matchError]}>{emailError}</Text>
            )}
          </View>

          <View>
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              textContentType="newPassword"
            />
            {strength !== null && !confirmFocused && (
              <View style={styles.strengthRow}>
                <View style={styles.strengthTrack}>
                  <View
                    style={[
                      styles.strengthFill,
                      {
                        width: strengthWidth[strength],
                        backgroundColor: strengthColor[strength],
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.strengthLabel, { color: strengthColor[strength] }]}>
                  {strengthLabel[strength]}
                </Text>
              </View>
            )}
          </View>

          <View>
            <Input
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onFocus={() => setConfirmFocused(true)}
              onBlur={() => setConfirmFocused(false)}
              placeholder="Confirm password"
              secureTextEntry
              textContentType="newPassword"
            />
            {confirmPassword.length > 0 && (
              <Text style={[
                styles.matchIndicator,
                confirmPassword === password ? styles.matchSuccess : styles.matchError,
              ]}>
                {confirmPassword === password ? 'Passwords match' : 'Passwords do not match'}
              </Text>
            )}
          </View>

          {error !== '' && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <View style={styles.buttonWrapper}>
            <Button
              label={loading ? 'Creating account…' : 'Create Account'}
              onPress={handleSignUp}
              disabled={!canSubmit}
            />
          </View>
        </View>}

        {!confirmationSent && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.footerLink}>Sign in</Text>
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
  matchIndicator: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
    textAlign: 'center',
    ...(Platform.OS === 'web' && { maxWidth: 600, width: '100%', alignSelf: 'center' as const }),
  },
  matchSuccess: {
    color: colors.success,
  },
  matchError: {
    color: colors.error,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
    ...(Platform.OS === 'web' && { maxWidth: 600, alignSelf: 'center' as const, width: '100%' }),
  },
  strengthTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  strengthLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    minWidth: 40,
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
  confirmationCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.xl,
    gap: spacing.md,
  },
  confirmationTitle: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize.lg,
    color: colors.success,
  },
  confirmationBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
  confirmationLink: {
    alignSelf: 'flex-start',
    paddingTop: spacing.xs,
  },
});
