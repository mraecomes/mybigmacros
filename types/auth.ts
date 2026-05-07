import type { Session } from '@supabase/supabase-js';

export type { Session };

export type Profile = {
  id: string;
  name: string;
  profile_photo_url: string | null;
  daily_calorie_goal: number | null;
  created_at: string;
  updated_at: string;
};

export type OnboardingStep = 'name' | 'photo' | 'calorie';

export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'onboarding'; session: Session }
  | { status: 'authenticated'; session: Session; profile: Profile }
  | { status: 'recovery'; session: Session };
