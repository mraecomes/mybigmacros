/** A single row from the osm_aliases Supabase table */
export type OsmAlias = {
  id: string;
  osm_name: string;
  chain_name: string;
  created_at: string;
};

/**
 * The result of a successful chain name match.
 * - canonical: the matched menu_items.chain_name value
 * - source: how the match was found
 * - score: Fuse.js score if source is 'fuzzy' (0 = perfect, 1 = worst); null for exact matches
 */
export type ChainMatchResult = {
  canonical: string;
  source: 'exact' | 'fuzzy';
  score: number | null;
};

/**
 * Input to matchChainName().
 * Pass brand (OSM brand tag) as primary and name (OSM name tag) as fallback.
 * The matcher picks brand first; falls back to name if brand is absent.
 */
export type ChainMatchInput = {
  brand?: string;
  name?: string;
};
