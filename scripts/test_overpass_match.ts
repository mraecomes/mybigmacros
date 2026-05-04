/**
 * Overpass API + chain matcher integration test.
 * Queries real OSM fast food data near a known US address and reports match rate.
 *
 * Usage: pnpm exec tsx scripts/test_overpass_match.ts
 * Reference address: Near Desert Ridge Marketplace, Phoenix AZ (dense suburban fast food area)
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { execSync } from 'child_process';

const LAT = 33.6814;
const LON = -111.9779;
const RADIUS_METERS = 5000;
const REFERENCE_ADDRESS = 'Desert Ridge Marketplace, Phoenix AZ (~5km radius)';

const OVERPASS_QUERY = `
[out:json][timeout:25];
(
  node["amenity"="fast_food"](around:${RADIUS_METERS},${LAT},${LON});
  way["amenity"="fast_food"](around:${RADIUS_METERS},${LAT},${LON});
  relation["amenity"="fast_food"](around:${RADIUS_METERS},${LAT},${LON});
);
out tags;
`.trim();

type OverpassElement = {
  type: string;
  id: number;
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements: OverpassElement[];
};

async function runOverpassTest(): Promise<void> {
  const { matchChainName } = await import('../lib/matching/chainMatcher');

  process.stdout.write(`\n=== Overpass API + Chain Matcher Integration Test ===\n`);
  process.stdout.write(`Reference: ${REFERENCE_ADDRESS}\n\n`);

  // Query Overpass API
  process.stdout.write('Querying Overpass API...\n');
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(OVERPASS_QUERY)}`;
  // Use curl directly — Node.js undici adds Accept-Encoding: br which Overpass's Apache rejects with 406
  let rawJson: string;
  try {
    rawJson = execSync(`curl -s --compressed "${url}"`, { encoding: 'utf8', timeout: 30000 });
  } catch (err) {
    process.stderr.write(`Overpass API curl error: ${String(err)}\n`);
    process.exit(1);
  }

  const json = JSON.parse(rawJson) as OverpassResponse;
  const elements = json.elements ?? [];
  process.stdout.write(`Overpass returned ${elements.length} elements\n\n`);

  // Deduplicate by brand+name combination (many elements are multiple nodes for the same location)
  const seen = new Set<string>();
  const unique: { brand?: string; name?: string; display: string }[] = [];

  for (const el of elements) {
    const brand = el.tags?.brand?.trim();
    const name = el.tags?.name?.trim();
    const key = `${brand ?? ''}||${name ?? ''}`;
    if (!seen.has(key) && (brand ?? name)) {
      seen.add(key);
      unique.push({
        brand,
        name,
        display: brand ?? name ?? '(unnamed)',
      });
    }
  }

  process.stdout.write(`Unique brand/name combinations: ${unique.length}\n\n`);
  process.stdout.write(`${'OSM name (brand → name)'.padEnd(45)} ${'Matched canonical'.padEnd(35)} Source\n`);
  process.stdout.write(`${'-'.repeat(45)} ${'-'.repeat(35)} ------\n`);

  let matched = 0;
  let unmatched = 0;
  const unmatchedNames: string[] = [];

  for (const loc of unique.sort((a, b) => a.display.localeCompare(b.display))) {
    const result = await matchChainName({ brand: loc.brand, name: loc.name });
    const osmLabel = loc.brand
      ? loc.name && loc.name !== loc.brand
        ? `${loc.brand} (name: ${loc.name})`
        : loc.brand
      : loc.name ?? '(unnamed)';

    if (result) {
      matched++;
      const scoreStr = result.score != null ? ` [${result.score.toFixed(3)}]` : '';
      process.stdout.write(
        `${osmLabel.padEnd(45)} ${result.canonical.padEnd(35)} ${result.source}${scoreStr}\n`
      );
    } else {
      unmatched++;
      unmatchedNames.push(osmLabel);
      process.stdout.write(`${osmLabel.padEnd(45)} ${'— no match'.padEnd(35)}\n`);
    }
  }

  const total = matched + unmatched;
  const rate = total > 0 ? ((matched / total) * 100).toFixed(1) : '0';

  process.stdout.write(`\n${'='.repeat(80)}\n`);
  process.stdout.write(`Match rate: ${matched}/${total} (${rate}%)\n`);

  if (unmatchedNames.length > 0) {
    process.stdout.write(`\nUnmatched names (candidates for new aliases):\n`);
    for (const n of unmatchedNames) {
      process.stdout.write(`  - ${n}\n`);
    }
  }

  process.stdout.write('\n');
}

runOverpassTest().catch((err) => {
  process.stderr.write(`Fatal error: ${String(err)}\n`);
  process.exit(1);
});
