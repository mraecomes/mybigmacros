import Fuse, { type IFuseOptions } from 'fuse.js';
import type { LocationCoords, OverpassElement, RestaurantResult } from '@/types/restaurant';

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
const MILES_TO_METERS = 1609.344;
const TIMEOUT_MS = 15_000;

// Same options as chainMatcher.ts — keep in sync if threshold changes
const FUSE_OPTIONS: IFuseOptions<string> = {
  threshold: 0.3,
  distance: 100,
  includeScore: true,
  minMatchCharLength: 2,
  ignoreLocation: true,
};

let fuseIndexCache: Fuse<string> | null = null;

function getFuseIndex(names: string[]): Fuse<string> {
  if (fuseIndexCache !== null) return fuseIndexCache;
  fuseIndexCache = new Fuse(names, FUSE_OPTIONS);
  return fuseIndexCache;
}

function buildOverpassQuery(lat: number, lon: number, radiusM: number): string {
  return `[out:json][timeout:15];
(
  node["amenity"="fast_food"](around:${radiusM},${lat},${lon});
  way["amenity"="fast_food"](around:${radiusM},${lat},${lon});
  node["amenity"="restaurant"](around:${radiusM},${lat},${lon});
  way["amenity"="restaurant"](around:${radiusM},${lat},${lon});
);
out center tags;`;
}

/** Haversine distance in miles between two lat/lon points */
function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildAddress(tags: Record<string, string>): string {
  const parts: string[] = [];
  if (tags['addr:housenumber'] && tags['addr:street']) {
    parts.push(`${tags['addr:housenumber']} ${tags['addr:street']}`);
  } else if (tags['addr:street']) {
    parts.push(tags['addr:street']);
  }
  if (tags['addr:city']) parts.push(tags['addr:city']);
  if (tags['addr:state']) parts.push(tags['addr:state']);
  return parts.length > 0 ? parts.join(', ') : 'Address unavailable';
}

/** Round lat/lon to 4 decimal places (~11m) for deduplication */
function coordKey(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

/**
 * Query the Overpass API for fast food locations within radiusMiles of coords,
 * match each result against the MenuStat chain list, and return matched restaurants
 * sorted by distance ascending.
 */
export async function fetchNearbyChains(
  coords: LocationCoords,
  radiusMiles: number,
  aliasMap: Map<string, string>,
  canonicalNames: string[]
): Promise<RestaurantResult[]> {
  const radiusM = Math.round(radiusMiles * MILES_TO_METERS);
  const query = buildOverpassQuery(coords.latitude, coords.longitude, radiusM);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let elements: OverpassElement[];
  try {
    const response = await fetch(OVERPASS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Overpass API returned ${response.status}`);
    }
    const json = await response.json();
    elements = json.elements ?? [];
  } finally {
    clearTimeout(timer);
  }

  // Deduplicate by coordinate before running async chain matching
  const seen = new Set<string>();
  const unique: OverpassElement[] = [];
  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat === undefined || lon === undefined) continue;
    const key = coordKey(lat, lon);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(el);
    }
  }

  // Resolve the OSM name for an element — same priority as matchChainName: brand > name:en > name
  function osmNameFor(el: OverpassElement): string | undefined {
    const tags = el.tags ?? {};
    const name = (tags['brand'] ?? tags['name:en'] ?? tags['name'])?.trim();
    return name || undefined;
  }

  const fuse = getFuseIndex(canonicalNames);

  // Match each element in memory — no per-element Supabase calls
  const matchResults = unique.map((el) => {
    const tags = el.tags ?? {};
    const lat = el.lat ?? el.center!.lat;
    const lon = el.lon ?? el.center!.lon;
    const osmName = osmNameFor(el);

    if (!osmName) return null;

    // Step 1: exact alias lookup (in-memory)
    const canonical = aliasMap.get(osmName);
    if (canonical) {
      return {
        osmId: el.id,
        canonicalName: canonical,
        displayName: tags['name'] ?? canonical,
        latitude: lat,
        longitude: lon,
        address: buildAddress(tags),
        distanceMiles: haversineMiles(coords.latitude, coords.longitude, lat, lon),
      } satisfies RestaurantResult;
    }

    // Step 2: fuzzy match (in-memory)
    const fuseResults = fuse.search(osmName);
    if (
      fuseResults.length === 0 ||
      fuseResults[0].score === undefined ||
      fuseResults[0].score > FUSE_OPTIONS.threshold!
    ) {
      return null;
    }

    return {
      osmId: el.id,
      canonicalName: fuseResults[0].item,
      displayName: tags['name'] ?? fuseResults[0].item,
      latitude: lat,
      longitude: lon,
      address: buildAddress(tags),
      distanceMiles: haversineMiles(coords.latitude, coords.longitude, lat, lon),
    } satisfies RestaurantResult;
  });

  const matched = matchResults.filter((r): r is RestaurantResult => r !== null);

  // Deduplicate matched results by canonicalName + coordinate (same chain, same location)
  const resultsSeen = new Set<string>();
  const deduped = matched.filter((r) => {
    const key = `${r.canonicalName}:${coordKey(r.latitude, r.longitude)}`;
    if (resultsSeen.has(key)) return false;
    resultsSeen.add(key);
    return true;
  });

  return deduped.sort((a, b) => a.distanceMiles - b.distanceMiles);
}
