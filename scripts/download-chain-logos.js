// One-time script: download chain logos from Brandfetch, store in Supabase Storage,
// and upsert every chain into the chains table with logo_url + primary_category.
//
// Usage:
//   node scripts/download-chain-logos.js
//
// Required env vars in .env.local:
//   BRANDFETCH_API_KEY
//   EXPO_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY  (write access to Storage + chains table)
//
// Rules:
//   - PNG only — SVG and WebP are skipped and logged
//   - Every chain in menu_items gets a row in chains, even if no logo is found
//   - Never aborts on a single chain failure — logs it and continues

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// ─── Config ──────────────────────────────────────────────────────────────────

const BRANDFETCH_API_KEY    = process.env.BRANDFETCH_API_KEY;
const SUPABASE_URL          = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!BRANDFETCH_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    'Missing required env vars. Confirm BRANDFETCH_API_KEY, EXPO_PUBLIC_SUPABASE_URL,' +
    ' and SUPABASE_SERVICE_ROLE_KEY are all set in .env.local.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const REQUEST_DELAY_MS  = 700;  // pause between Brandfetch requests
const MAX_RETRIES       = 3;    // max retries on HTTP 429
const BASE_BACKOFF_MS   = 2000; // initial backoff on 429 (doubles each retry)
const PAGE_SIZE         = 1000; // PostgREST hard-caps responses at 1000 rows per request

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Derive candidate Brandfetch domain(s) from a chain name.
 * Splits on "/" for dual-brand names (e.g. "Hardee's / Carl's Jr." → two candidates).
 */
function toDomains(chainName) {
  const parts = chainName.split('/').map((p) => p.trim()).filter(Boolean);
  const candidates = parts.map((part) => {
    const slug = part
      .toLowerCase()
      .replace(/[''`]/g, '')         // strip apostrophes
      .replace(/[^a-z0-9 -]/g, '')  // strip other special chars (keep spaces + hyphens)
      .replace(/\s+/g, '')           // collapse spaces
      .replace(/-+/g, '-')           // normalise hyphens
      .replace(/^-|-$/g, '');        // trim leading/trailing hyphens
    return slug ? `${slug}.com` : null;
  }).filter(Boolean);
  return [...new Set(candidates)];
}

/** Sanitise a chain name into a safe Supabase Storage file key (no spaces or slashes). */
function toStorageKey(chainName) {
  return chainName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Fetch brand JSON from Brandfetch for a given domain.
 * Returns the parsed response body, or null on any failure (including 404).
 * Retries automatically on 429 with exponential backoff.
 */
async function fetchBrandData(domain, attempt = 0) {
  let res;
  try {
    res = await fetch(`https://api.brandfetch.io/v2/brands/${domain}`, {
      headers: { Authorization: `Bearer ${BRANDFETCH_API_KEY}` },
    });
  } catch {
    return null;
  }

  if (res.status === 429) {
    if (attempt < MAX_RETRIES) {
      const wait = BASE_BACKOFF_MS * Math.pow(2, attempt);
      console.log(`    429 rate limit — waiting ${wait}ms, retry ${attempt + 1}/${MAX_RETRIES}`);
      await sleep(wait);
      return fetchBrandData(domain, attempt + 1);
    }
    console.log(`    429 retries exhausted for ${domain}`);
    return null;
  }

  if (!res.ok) return null;

  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Find the best PNG logo URL from a Brandfetch brand response.
 * Prefers "logo" type over "icon"; within each type picks the largest PNG.
 * Returns null if no PNG is available.
 */
function findPngLogoUrl(brandData) {
  if (!Array.isArray(brandData?.logos)) return null;

  for (const logoType of ['logo', 'icon', 'symbol']) {
    const entry = brandData.logos.find((l) => l.type === logoType);
    if (!entry?.formats) continue;

    const pngs = entry.formats.filter((f) => f.format === 'png' && f.src);
    if (pngs.length === 0) continue;

    // Sort descending by size; prefer ≥ 200 but fall back to largest available
    pngs.sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
    const pick = pngs.find((f) => (f.size ?? 0) >= 200) ?? pngs[0];
    return pick.src;
  }

  return null;
}

/**
 * Download a URL and return a Buffer.
 * Returns null if the download fails or the content-type is not PNG.
 */
async function downloadPng(url) {
  let res;
  try {
    res = await fetch(url);
  } catch {
    return null;
  }
  if (!res.ok) return null;

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('png')) {
    console.log(`    Skipped — content-type is "${contentType}" (PNG required)`);
    return null;
  }

  try {
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Upload a PNG buffer to the chain-logos Supabase Storage bucket.
 * Returns the public URL on success, null on failure.
 */
async function uploadToStorage(storageKey, buffer) {
  const filePath = `${storageKey}.png`;
  const { error } = await supabase.storage
    .from('chain-logos')
    .upload(filePath, buffer, { contentType: 'image/png', upsert: true });

  if (error) {
    console.log(`    Storage upload failed: ${error.message}`);
    return null;
  }

  const { data } = supabase.storage.from('chain-logos').getPublicUrl(filePath);
  return data.publicUrl;
}

/** Upsert one row in the chains table. Throws on DB error. */
async function upsertChain(chainName, primaryCategory, logoUrl) {
  const { error } = await supabase
    .from('chains')
    .upsert(
      { chain_name: chainName, primary_category: primaryCategory, logo_url: logoUrl },
      { onConflict: 'chain_name' }
    );
  if (error) throw new Error(error.message);
}

/**
 * Fetch all rows from menu_items (chain_name + category) using pagination
 * to stay within PostgREST's per-request row limit.
 */
async function fetchAllMenuItemCategories() {
  const rows = [];
  let page = 0;

  while (true) {
    const from = page * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from('menu_items')
      .select('chain_name, category')
      .range(from, to);

    if (error) throw new Error(`menu_items fetch failed: ${error.message}`);
    if (!data || data.length === 0) break;

    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  return rows;
}

/**
 * Compute primary_category per chain: the single most common category value.
 * Returns Map<chainName, primaryCategory>.
 */
function computePrimaryCategories(rows) {
  const counts = new Map(); // chainName → Map<category, count>

  for (const { chain_name, category } of rows) {
    if (!chain_name) continue;
    if (!counts.has(chain_name)) counts.set(chain_name, new Map());
    const catMap = counts.get(chain_name);
    const cat = category ?? 'Other';
    catMap.set(cat, (catMap.get(cat) ?? 0) + 1);
  }

  const result = new Map();
  for (const [chainName, catMap] of counts.entries()) {
    let topCat = null;
    let topCount = 0;
    for (const [cat, count] of catMap.entries()) {
      if (count > topCount) { topCount = count; topCat = cat; }
    }
    result.set(chainName, topCat);
  }

  return result;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' Chain Logo Downloader — myBigMACros');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Load all chain names + categories from menu_items
  console.log('Fetching chain/category data from menu_items (paginated)...');
  let allRows;
  try {
    allRows = await fetchAllMenuItemCategories();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  console.log(`  ${allRows.length} rows fetched.\n`);

  const primaryCategories = computePrimaryCategories(allRows);
  const chains = [...primaryCategories.entries()]
    .map(([chainName, primaryCategory]) => ({ chainName, primaryCategory }))
    .sort((a, b) => a.chainName.localeCompare(b.chainName));

  console.log(`${chains.length} distinct chains to process.\n`);

  // 2. Process each chain
  const noLogo = [];

  for (let i = 0; i < chains.length; i++) {
    const { chainName, primaryCategory } = chains[i];
    const tag = `[${String(i + 1).padStart(String(chains.length).length)}/${chains.length}]`;
    console.log(`${tag} ${chainName}`);
    console.log(`       primary_category: ${primaryCategory ?? '(null)'}`);

    const domains = toDomains(chainName);
    let logoUrl = null;

    for (const domain of domains) {
      console.log(`       Trying: ${domain}`);
      const brandData = await fetchBrandData(domain);

      if (!brandData) {
        console.log(`       No Brandfetch result for ${domain}`);
        continue;
      }

      const pngSrc = findPngLogoUrl(brandData);
      if (!pngSrc) {
        console.log(`       Brand found but no PNG logo for ${domain}`);
        continue;
      }

      console.log(`       Downloading PNG...`);
      const buffer = await downloadPng(pngSrc);
      if (!buffer) {
        console.log(`       PNG download failed`);
        continue;
      }

      const storageKey = toStorageKey(chainName);
      console.log(`       Uploading as ${storageKey}.png...`);
      const publicUrl = await uploadToStorage(storageKey, buffer);
      if (!publicUrl) continue;

      logoUrl = publicUrl;
      console.log(`       ✓ Logo saved`);
      break;
    }

    if (!logoUrl) {
      console.log(`       ✗ No logo — logo_url will be null (emoji fallback applies)`);
      noLogo.push(chainName);
    }

    // Always upsert: every chain gets a row with primary_category populated
    try {
      await upsertChain(chainName, primaryCategory, logoUrl);
    } catch (err) {
      console.error(`       DB upsert error: ${err.message}`);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  // 3. Summary
  const withLogo = chains.length - noLogo.length;
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(' Summary');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Chains processed  : ${chains.length}`);
  console.log(`  Logos saved       : ${withLogo}`);
  console.log(`  No logo found     : ${noLogo.length}`);

  if (noLogo.length > 0) {
    console.log('\n  Chains with no logo (emoji fallback will render for these):');
    for (const name of noLogo) {
      console.log(`    - ${name}`);
    }
  }

  console.log('\nDone.\n');
}

main().catch((err) => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
