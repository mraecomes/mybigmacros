import type { Profile } from '@/types/auth';
import { supabase } from './client';

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createProfile(profile: Omit<Profile, 'created_at' | 'updated_at'>): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .insert(profile)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'name' | 'profile_photo_url' | 'daily_calorie_goal'>>
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_user');
  if (error) throw error;
  await supabase.auth.signOut();
}

export async function uploadProfilePhoto(userId: string, uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const path = `${userId}/avatar.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('profile-photos')
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('profile-photos').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}
