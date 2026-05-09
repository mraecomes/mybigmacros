import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MenuItem } from '@/types/menu';

const TTL_MS = 24 * 60 * 60 * 1000;
const PREFIX = 'menu_';

type CacheEntry = {
  items: MenuItem[];
  fetchedAt: number;
};

function cacheKey(chainName: string): string {
  return `${PREFIX}${chainName}`;
}

export async function getCachedMenuItems(
  chainName: string
): Promise<{ items: MenuItem[]; fetchedAt: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(chainName));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.fetchedAt > TTL_MS) {
      await AsyncStorage.removeItem(cacheKey(chainName));
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

export async function setCachedMenuItems(
  chainName: string,
  items: MenuItem[]
): Promise<void> {
  try {
    const entry: CacheEntry = { items, fetchedAt: Date.now() };
    await AsyncStorage.setItem(cacheKey(chainName), JSON.stringify(entry));
  } catch {
    // Caching is best-effort — never block the UI on a storage failure
  }
}
