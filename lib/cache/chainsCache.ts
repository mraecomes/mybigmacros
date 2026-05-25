import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChainData } from '@/lib/supabase/chains';

const TTL_MS = 24 * 60 * 60 * 1000;
const PREFIX = 'chain_';

type CacheEntry = {
  data: ChainData;
  fetchedAt: number;
};

function cacheKey(chainName: string): string {
  return `${PREFIX}${chainName}`;
}

async function getCachedChain(chainName: string): Promise<ChainData | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(chainName));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.fetchedAt > TTL_MS) {
      await AsyncStorage.removeItem(cacheKey(chainName));
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

async function setCachedChain(data: ChainData): Promise<void> {
  try {
    const entry: CacheEntry = { data, fetchedAt: Date.now() };
    await AsyncStorage.setItem(cacheKey(data.chain_name), JSON.stringify(entry));
  } catch {
    // Best-effort — never block the UI on a storage failure
  }
}

/** Check cache for each name; return hits and a list of names still missing. */
export async function getCachedChainsBatch(
  chainNames: string[]
): Promise<{ cached: Map<string, ChainData>; missing: string[] }> {
  const cached = new Map<string, ChainData>();
  const missing: string[] = [];

  for (const name of chainNames) {
    const entry = await getCachedChain(name);
    if (entry) {
      cached.set(name, entry);
    } else {
      missing.push(name);
    }
  }

  return { cached, missing };
}

/** Persist an array of chain rows to the per-chain AsyncStorage cache. */
export async function setCachedChainsBatch(chains: ChainData[]): Promise<void> {
  for (const chain of chains) {
    await setCachedChain(chain);
  }
}
