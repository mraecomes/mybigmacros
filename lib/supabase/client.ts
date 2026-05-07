import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local'
  );
}

// On web, Supabase defaults to the Navigator Locks API for cross-tab auth
// synchronization. This causes lock-steal cascades when multiple async auth
// operations (INITIAL_SESSION, auto-refresh, getSession) race on page load.
// This app runs in a single process with no cross-tab coordination requirement,
// so we replace it with an in-memory promise-chain lock on web.
const pendingLocks: Record<string, Promise<unknown>> = {};
function processLock<T>(
  name: string,
  _acquireTimeout: number,
  fn: () => Promise<T>
): Promise<T> {
  const previous = (pendingLocks[name] ?? Promise.resolve()) as Promise<unknown>;
  const current = previous.then(() => fn(), () => fn());
  pendingLocks[name] = current.then(() => undefined, () => undefined);
  return current;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(Platform.OS !== 'web' && { storage: AsyncStorage }),
    ...(Platform.OS === 'web' && { lock: processLock }),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// On web, Supabase processes the URL hash during init and fires PASSWORD_RECOVERY before
// React's useEffect listeners can register. We read the hash at module-load time (before
// Supabase clears it) to detect recovery without creating a second onAuthStateChange
// subscription that would race for the Navigator Lock and cause lock-steal errors.
let _pendingRecovery = false;

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  try {
    _pendingRecovery =
      new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery';
  } catch {
    // ignore malformed hash
  }
}

export function consumePendingRecovery(): boolean {
  const had = _pendingRecovery;
  _pendingRecovery = false;
  return had;
}
