import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { deleteAccount, signOut, updateProfile, uploadProfilePhoto } from '@/lib/supabase/auth';
import { supabase } from '@/lib/supabase/client';
import type { Profile } from '@/types/auth';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type EditField = 'name' | 'calorie' | null;

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editField, setEditField] = useState<EditField>(null);
  const [editValue, setEditValue] = useState('');
  const [savingField, setSavingField] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      setProfile(data);
    } catch {
      // Profile load failure is surfaced by empty state + retry button
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  // Re-run the profile load when the browser tab regains focus.
  // useFocusEffect only fires on navigation focus, not on browser-tab focus,
  // so without this a user returning to an idle tab sees stale or missing data.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadProfile();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [loadProfile]);

  function startEdit(field: EditField) {
    setFieldError('');
    setEditField(field);
    if (field === 'name') setEditValue(profile?.name ?? '');
    if (field === 'calorie') {
      setEditValue(profile?.daily_calorie_goal ? String(profile.daily_calorie_goal) : '');
    }
  }

  function cancelEdit() {
    setEditField(null);
    setEditValue('');
    setFieldError('');
  }

  async function saveEdit() {
    if (!profile) return;
    setFieldError('');
    setSavingField(true);

    try {
      if (editField === 'name') {
        if (editValue.trim() === '') {
          setFieldError('Name cannot be empty.');
          return;
        }
        const updated = await updateProfile(profile.id, { name: editValue.trim() });
        setProfile(updated);
      }

      if (editField === 'calorie') {
        const parsed = editValue.trim() === '' ? null : parseInt(editValue, 10);
        if (editValue.trim() !== '' && (isNaN(parsed!) || parsed! < 1)) {
          setFieldError('Enter a valid calorie number.');
          return;
        }
        const updated = await updateProfile(profile.id, { daily_calorie_goal: parsed });
        setProfile(updated);
      }

      setEditField(null);
    } catch {
      setFieldError('Failed to save. Please try again.');
    } finally {
      setSavingField(false);
    }
  }

  async function handleChangePhoto() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const url = await uploadProfilePhoto(session.user.id, result.assets[0].uri);
        const updated = await updateProfile(profile!.id, { profile_photo_url: url });
        setProfile(updated);
        setShowPhotoOptions(false);
      }
    } catch {
      // Photo change is optional — silently continue
    } finally {
      setPhotoLoading(false);
    }
  }

  async function handleRemovePhoto() {
    if (!profile) return;
    setPhotoLoading(true);
    try {
      const updated = await updateProfile(profile.id, { profile_photo_url: null });
      setProfile(updated);
      setShowPhotoOptions(false);
    } catch {
      // Silently continue — photo state is non-critical
    } finally {
      setPhotoLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      // Session guard in _layout.tsx will redirect regardless
    }
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    try {
      await deleteAccount();
    } catch {
      setDeletingAccount(false);
      setShowDeleteConfirm(false);
    }
  }

  if (loadingProfile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Could not load profile.</Text>
        <Pressable
          onPress={loadProfile}
          style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const initials = profile.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          {/* Avatar */}
          <View style={styles.avatarRow}>
            <Pressable onPress={() => setShowPhotoOptions((v) => !v)} disabled={photoLoading}>
              {profile.profile_photo_url ? (
                <Image
                  source={{ uri: profile.profile_photo_url }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
            </Pressable>

            {showPhotoOptions && (
              <View style={styles.photoOptions}>
                <Pressable onPress={handleChangePhoto} style={styles.photoOptionBtn}>
                  <Text style={styles.photoOptionText}>
                    {profile.profile_photo_url ? 'Change Photo' : 'Add Photo'}
                  </Text>
                </Pressable>
                {profile.profile_photo_url && (
                  <Pressable onPress={handleRemovePhoto} style={styles.photoOptionBtn}>
                    <Text style={[styles.photoOptionText, styles.photoOptionDestructive]}>
                      Remove Photo
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {/* Name field */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Name</Text>
            {editField === 'name' ? (
              <View style={styles.editBlock}>
                <Input
                  value={editValue}
                  onChangeText={setEditValue}
                  placeholder="Your name"
                  autoCapitalize="words"
                  autoFocus
                />
                {fieldError !== '' && <Text style={styles.fieldError}>{fieldError}</Text>}
                <View style={styles.editActions}>
                  <Button label={savingField ? 'Saving…' : 'Save'} onPress={saveEdit} disabled={savingField} />
                  <Button label="Cancel" onPress={cancelEdit} variant="ghost" />
                </View>
              </View>
            ) : (
              <Pressable onPress={() => startEdit('name')} style={styles.fieldValueRow}>
                <Text style={styles.fieldValue}>{profile.name}</Text>
                <Text style={styles.editHint}>Edit</Text>
              </Pressable>
            )}
          </View>

          {/* Daily calorie goal */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Daily calorie goal</Text>
            {editField === 'calorie' ? (
              <View style={styles.editBlock}>
                <Input
                  value={editValue}
                  onChangeText={setEditValue}
                  placeholder="e.g. 2000"
                  keyboardType="number-pad"
                  autoFocus
                />
                {fieldError !== '' && <Text style={styles.fieldError}>{fieldError}</Text>}
                <View style={styles.editActions}>
                  <Button label={savingField ? 'Saving…' : 'Save'} onPress={saveEdit} disabled={savingField} />
                  <Button label="Cancel" onPress={cancelEdit} variant="ghost" />
                </View>
              </View>
            ) : (
              <Pressable onPress={() => startEdit('calorie')} style={styles.fieldValueRow}>
                <Text style={styles.fieldValue}>
                  {profile.daily_calorie_goal ? `${profile.daily_calorie_goal} cal` : 'Not set'}
                </Text>
                <Text style={styles.editHint}>Edit</Text>
              </Pressable>
            )}
          </View>

          {!profile.daily_calorie_goal && editField !== 'calorie' && (
            <Pressable onPress={() => startEdit('calorie')} style={styles.goalPrompt}>
              <Text style={styles.goalPromptText}>
                Add a daily calorie goal to get pre-filled budget suggestions on the filter screen.
              </Text>
            </Pressable>
          )}

          {/* Account actions */}
          <View style={styles.accountActions}>
            <Button label="Sign Out" onPress={handleSignOut} variant="secondary" />

            {showDeleteConfirm ? (
              <View style={styles.deleteConfirmCard}>
                <Text style={styles.deleteWarningTitle}>Delete account?</Text>
                <Text style={styles.deleteWarningBody}>
                  This will permanently delete your account and all associated data. This cannot be undone.
                </Text>
                <Button
                  label={deletingAccount ? 'Deleting…' : 'Yes, permanently delete my account'}
                  onPress={handleDeleteAccount}
                  disabled={deletingAccount}
                />
                <Button
                  label="Never mind"
                  onPress={() => setShowDeleteConfirm(false)}
                  variant="ghost"
                />
              </View>
            ) : (
              <Button
                label="Delete Account"
                onPress={() => setShowDeleteConfirm(true)}
                variant="ghost"
              />
            )}
          </View>
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  retryBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
  },
  retryText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['3xl'],
  },
  content: {
    gap: spacing.xl,
    ...(Platform.OS === 'web' && { maxWidth: 600, width: '100%', alignSelf: 'center' as const }),
  },
  avatarRow: {
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  photoOptions: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  photoOptionBtn: {
    paddingVertical: spacing.xs,
  },
  photoOptionText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },
  photoOptionDestructive: {
    color: colors.error,
  },
  avatar: {
    width: 300,
    height: 300,
    borderRadius: radii.full,
  },
  avatarPlaceholder: {
    width: 300,
    height: 300,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: typography.fontFamily.display,
    fontSize: 100,
    color: colors.primary,
  },
  fieldRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  fieldLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  fieldValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  fieldValue: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.lg,
    color: colors.textPrimary,
  },
  editHint: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },
  editBlock: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  fieldError: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.error,
  },
  editActions: {
    gap: spacing.xs,
  },
  goalPrompt: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  goalPromptText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
  },
  accountActions: {
    gap: spacing.md,
  },
  deleteConfirmCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.error,
    gap: spacing.md,
  },
  deleteWarningTitle: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize.lg,
    color: colors.error,
  },
  deleteWarningBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
  },
});
