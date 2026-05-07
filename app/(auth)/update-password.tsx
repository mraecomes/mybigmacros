import { AppName } from '@/components/ui/AppName';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { signOut, updatePassword } from '@/lib/supabase/auth';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  DimensionValue,
  KeyboardAvoidingView,
  Platform,
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

export default function UpdatePasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const strength = password.length > 0 ? getPasswordStrength(password) : null;

  const canSubmit =
    password.length >= 8 &&
    confirmPassword === password &&
    !loading;

  async function handleUpdate() {
    setError('');
    setLoading(true);
    try {
      await updatePassword(password);
      try { await signOut(); } catch { /* guard will redirect regardless */ }
      router.replace('/(auth)/login');
    } catch {
      setError('Failed to update your password. Please try again.');
      setLoading(false);
    }
  }

  async function handleCancel() {
    try {
      await signOut();
    } catch {
      // guard will redirect regardless
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
          <Text style={styles.subtitle}>Set a new password</Text>
        </View>

        <View style={styles.form}>
            <View>
              <Input
                value={password}
                onChangeText={setPassword}
                placeholder="New password"
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
                placeholder="Confirm new password"
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
                label={loading ? 'Updating…' : 'Update Password'}
                onPress={handleUpdate}
                disabled={!canSubmit}
              />
            </View>

            <Button
              label="Cancel"
              onPress={handleCancel}
              variant="ghost"
            />
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
