import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { createProfile, uploadProfilePhoto } from '@/lib/supabase/auth';
import { AuthContext } from '@/lib/supabase/AuthContext';
import { supabase } from '@/lib/supabase/client';
import type { OnboardingStep } from '@/types/auth';
import * as ImagePicker from 'expo-image-picker';
import { useContext, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const STEPS: OnboardingStep[] = ['name', 'photo', 'calorie'];

export default function OnboardingScreen() {
  const [step, setStep] = useState<OnboardingStep>('name');
  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [calorieGoal, setCalorieGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const stepIndex = STEPS.indexOf(step);

  async function pickPhoto() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch {
      // Photo is optional — silently continue
    }
  }

  function advance() {
    if (step === 'name') setStep('photo');
    else if (step === 'photo') setStep('calorie');
  }

  const { refreshProfile } = useContext(AuthContext);

  async function finish() {
    setError('');
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session found.');

      let photoUrl: string | null = null;
      if (photoUri) {
        try {
          photoUrl = await uploadProfilePhoto(session.user.id, photoUri);
        } catch {
          // Photo upload is optional — continue without it
        }
      }

      const goal = calorieGoal.trim() !== '' ? parseInt(calorieGoal, 10) : null;

      await createProfile({
        id: session.user.id,
        name: name.trim(),
        profile_photo_url: photoUrl,
        daily_calorie_goal: goal && !isNaN(goal) ? goal : null,
      });

      // Profile now exists — update authState directly via context.
      // useAuthGuard in _layout.tsx will redirect to tabs once authState becomes 'authenticated'.
      await refreshProfile();
    } catch {
      setError('Something went wrong saving your profile. Please try again.');
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
        <View style={styles.dotsRow}>
          {STEPS.map((s, i) => (
            <View
              key={s}
              style={[styles.dot, i === stepIndex && styles.dotActive]}
            />
          ))}
        </View>

        {step === 'name' && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>What should we call you?</Text>
            <Text style={styles.stepSubtitle}>Your name appears on your profile.</Text>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              autoCapitalize="words"
              textContentType="name"
            />
            <View style={styles.actions}>
              <Button
                label="Continue"
                onPress={advance}
                disabled={name.trim() === ''}
              />
            </View>
          </View>
        )}

        {step === 'photo' && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Add a profile photo</Text>
            <Text style={styles.stepSubtitle}>Totally optional — you can add one later.</Text>

            <Pressable onPress={pickPhoto} style={styles.avatarTouchable}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {name.trim().charAt(0).toUpperCase()}
                  </Text>
                  <Text style={styles.avatarHint}>Tap to choose</Text>
                </View>
              )}
            </Pressable>

            <View style={styles.actions}>
              <Button label="Continue" onPress={advance} />
              <Button label="Skip" onPress={advance} variant="ghost" />
            </View>
          </View>
        )}

        {step === 'calorie' && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Set a daily calorie goal</Text>
            <Text style={styles.stepSubtitle}>
              We'll use this to pre-fill your budget on the filter screen. You can change it any time.
            </Text>
            <Input
              value={calorieGoal}
              onChangeText={setCalorieGoal}
              placeholder="e.g. 2000"
              keyboardType="number-pad"
            />
            {error !== '' && (
              <Text style={styles.errorText}>{error}</Text>
            )}
            <View style={styles.actions}>
              <Button
                label={loading ? 'Saving…' : "Let's go!"}
                onPress={finish}
                disabled={loading}
              />
              <Button
                label="Skip"
                onPress={finish}
                variant="ghost"
                disabled={loading}
              />
            </View>
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
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing['3xl'],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  stepContent: {
    gap: spacing.lg,
  },
  stepTitle: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize['2xl'],
    color: colors.textPrimary,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  avatarTouchable: {
    alignSelf: 'center',
    marginVertical: spacing.lg,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: radii.full,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  avatarInitial: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.fontSize['3xl'],
    color: colors.primary,
  },
  avatarHint: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  errorText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.error,
    textAlign: 'center',
    ...(Platform.OS === 'web' && { maxWidth: 600, width: '100%', alignSelf: 'center' as const }),
  },
});
