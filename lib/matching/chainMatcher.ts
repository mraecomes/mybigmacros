import Fuse, { type IFuseOptions } from 'fuse.js';
import { supabase } from '@/lib/supabase/client';
import type { ChainMatchInput, ChainMatchResult } from '@/types/matching';

const FUSE_OPTIONS: IFuseOptions<string> = {
  threshold: 0.3,        // allows "Burger Kng"→"Burger King"; blocks "Wendy's"→"Denny's"
  distance: 100,
  includeScore: true,
  minMatchCharLength: 2,
  ignoreLocation: true,  // full-string comparison — location penalty is incorrect for chain names
};

// Initialized once per process lifetime on the first matchChainName() call
let canonicalNamesCache: string[] | null = null;
let fuseIndexCache: Fuse<string> | null = null;

async function loadCanonicalNames(): Promise<string[]> {
  if (canonicalNamesCache !== null) {
    return canonicalNamesCache;
  }

  // Calls the get_chain_names() SQL function which returns SELECT DISTINCT chain_name
  // from menu_items (95 rows). Avoids PostgREST's 1000-row default limit that would
  // otherwise cut off chains further in the alphabet when querying the 26k-row table.
  const { data, error } = await supabase.rpc('get_chain_names');

  if (error) {
    throw new Error(`Failed to load canonical chain names: ${error.message}`);
  }

  const names = (data ?? []).map((row: { chain_name: string }) => row.chain_name);
  canonicalNamesCache = names;
  return names;
}

function getFuseIndex(names: string[]): Fuse<string> {
  if (fuseIndexCache !== null) {
    return fuseIndexCache;
  }
  fuseIndexCache = new Fuse(names, FUSE_OPTIONS);
  return fuseIndexCache;
}

/**
 * Match an OSM restaurant name to a canonical menu_items.chain_name value.
 *
 * Step 1: exact lookup in osm_aliases (database-backed, fast)
 * Step 2: Fuse.js fuzzy match against all chain_name values from menu_items (in-memory)
 *
 * Returns null if no match is found — never throws for a missing match, never guesses wrong.
 */
export async function matchChainName(
  input: ChainMatchInput
): Promise<ChainMatchResult | null> {
  const osmName = input.brand?.trim() ?? input.name?.trim();

  if (!osmName) {
    return null;
  }

  // Step 1: exact alias lookup
  const { data: aliasData, error: aliasError } = await supabase
    .from('osm_aliases')
    .select('chain_name')
    .eq('osm_name', osmName)
    .maybeSingle();

  if (aliasError) {
    console.error('[chainMatcher] Alias lookup error:', aliasError.message);
    // Fall through to fuzzy match rather than failing entirely on a transient error
  }

  if (aliasData) {
    return {
      canonical: aliasData.chain_name,
      source: 'exact',
      score: null,
    };
  }

  // Step 2: fuzzy match against all canonical chain names
  let names: string[];
  try {
    names = await loadCanonicalNames();
  } catch (err) {
    console.error('[chainMatcher] Failed to load canonical names:', err);
    return null;
  }

  const fuse = getFuseIndex(names);
  const results = fuse.search(osmName);

  if (results.length === 0 || results[0].score === undefined) {
    return null;
  }

  // Fuse.js already filters by threshold, but guard explicitly in case of config drift
  if (results[0].score > FUSE_OPTIONS.threshold!) {
    return null;
  }

  return {
    canonical: results[0].item,
    source: 'fuzzy',
    score: results[0].score,
  };
}

/** Reset module-level cache. For use in test scripts only — never call in app code. */
export function _resetCacheForTesting(): void {
  canonicalNamesCache = null;
  fuseIndexCache = null;
}
