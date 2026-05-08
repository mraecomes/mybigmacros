import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RestaurantResult } from '@/types/restaurant';

const TTL_MS = 24 * 60 * 60 * 1000;
const PREFIX = 'nearby_';

type CacheEntry = {
  results: RestaurantResult[];
  fetchedAt: number;
};

function cacheKey(lat: number, lng: number, radiusMiles: number): string {
  return `${PREFIX}${lat.toFixed(3)}_${lng.toFixed(3)}_${radiusMiles}`;
}

export async function getCachedResults(
  lat: number,
  lng: number,
  radiusMiles: number
): Promise<{ results: RestaurantResult[]; fetchedAt: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(lat, lng, radiusMiles));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.fetchedAt > TTL_MS) {
      await AsyncStorage.removeItem(cacheKey(lat, lng, radiusMiles));
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

export async function setCachedResults(
  lat: number,
  lng: number,
  radiusMiles: number,
  results: RestaurantResult[]
): Promise<void> {
  try {
    const entry: CacheEntry = { results, fetchedAt: Date.now() };
    await AsyncStorage.setItem(cacheKey(lat, lng, radiusMiles), JSON.stringify(entry));
  } catch {
    // Caching is best-effort — never block the UI on a storage failure
  }
}
