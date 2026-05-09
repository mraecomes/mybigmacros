// Targeted update: populate serving_size_unit in menu_items from the MenuStat XLS.
//
// Run AFTER applying the migration:
//   20260509000000_add_serving_size_unit_to_menu_items.sql
//
// Usage:
//   node scripts/menustat_update_serving_unit.js
//
// Matches rows by (chain_name, item_name, serving_size).
// Only updates rows where the XLS has a non-null serving_size_unit value.
// Safe to re-run — it only overwrites rows where a unit is available.

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const XLSX    = require('xlsx');
const path    = require('path');
const { createClient } = require('@supabase/supabase-js');

const XLS_PATH = path.join(__dirname, 'ms_annual_data_2022.xls');

const SUPABASE_URL      = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  process.stderr.write(
    'ERROR: EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local\n'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── XLS column aliases ──────────────────────────────────────────────────────

const COLUMN_MAP = {
  'restaurant': 'chain_name', 'restaurant name': 'chain_name', 'chain': 'chain_name',
  'chain name': 'chain_name', 'company': 'chain_name',
  'item': 'item_name', 'item name': 'item_name', 'menu item': 'item_name',
  'food item': 'item_name', 'item description': 'item_name', 'description': 'item_name',
  'serving size': 'serving_size', 'serving': 'serving_size',
  'serving size (g)': 'serving_size', 'portion size': 'serving_size',
  'serving size unit': 'serving_size_unit', 'serving_size_unit': 'serving_size_unit',
  'serving unit': 'serving_size_unit', 'size unit': 'serving_size_unit',
};

const NULL_VALUES = new Set(['n/a', 'na', '-', '–', '—', '', 'null', 'none', 'not available', 'not tested']);

function isNull(val) {
  if (val === null || val === undefined) return true;
  return typeof val === 'string' && NULL_VALUES.has(val.trim().toLowerCase());
}

function normalizeText(val) {
  if (isNull(val)) return null;
  return String(val).trim().replace(/\s+/g, ' ') || null;
}

function normalizeChain(name) {
  if (!name || typeof name !== 'string') return '';
  return name.trim().replace(/\s+/g, ' ');
}

// ─── Read XLS ────────────────────────────────────────────────────────────────

function readXls() {
  process.stdout.write(`Reading ${XLS_PATH}...\n`);
  const wb = XLSX.readFile(XLS_PATH);

  let sheet = null;
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (rows.length > 1) { sheet = ws; break; }
  }
  if (!sheet) throw new Error('No data sheet found in XLS.');

  const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const rawHeaders = allRows[0].map(h => String(h || '').trim());

  // Map lowercase header → column index
  const mapping = {};
  rawHeaders.forEach((h, i) => {
    const key = h.toLowerCase().replace(/_/g, ' ');
    const col = COLUMN_MAP[key];
    if (col && mapping[col] === undefined) mapping[col] = i;
  });

  if (mapping['chain_name'] === undefined || mapping['item_name'] === undefined) {
    throw new Error('Could not find chain_name or item_name columns in XLS.');
  }

  if (mapping['serving_size_unit'] === undefined) {
    throw new Error(
      'Could not find a "serving size unit" column in the XLS. ' +
      'Check that the column exists and is named one of: ' +
      '"serving size unit", "serving unit", "size unit".'
    );
  }

  process.stdout.write(`Headers mapped: chain_name[${mapping['chain_name']}], item_name[${mapping['item_name']}], ` +
    `serving_size[${mapping['serving_size'] ?? 'NOT FOUND'}], ` +
    `serving_size_unit[${mapping['serving_size_unit']}]\n`);

  const dataRows = allRows.slice(1);
  const records = [];
  let skippedNoUnit = 0;

  for (const row of dataRows) {
    const chainName = normalizeChain(String(row[mapping['chain_name']] || ''));
    const itemName  = normalizeText(row[mapping['item_name']]);
    if (!chainName || !itemName) continue;

    const servingSize = mapping['serving_size'] !== undefined
      ? normalizeText(row[mapping['serving_size']])
      : null;
    const servingSizeUnit = normalizeText(row[mapping['serving_size_unit']]);

    if (!servingSizeUnit) { skippedNoUnit++; continue; }

    records.push({ chainName, itemName, servingSize, servingSizeUnit });
  }

  process.stdout.write(`Rows with serving_size_unit to update: ${records.length}\n`);
  process.stdout.write(`Rows skipped (no unit in XLS):         ${skippedNoUnit}\n\n`);
  return records;
}

// ─── Batch update ────────────────────────────────────────────────────────────

const BATCH_SIZE = 50;

async function runUpdates(records) {
  let updated = 0;
  let errors  = 0;

  const total   = records.length;
  const batches = Math.ceil(total / BATCH_SIZE);

  for (let b = 0; b < batches; b++) {
    const batch = records.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);

    await Promise.all(
      batch.map(async ({ chainName, itemName, servingSize, servingSizeUnit }) => {
        try {
          let query = supabase
            .from('menu_items')
            .update({ serving_size_unit: servingSizeUnit })
            .eq('chain_name', chainName)
            .eq('item_name', itemName);

          if (servingSize !== null) {
            query = query.eq('serving_size', servingSize);
          } else {
            query = query.is('serving_size', null);
          }

          const { error } = await query;
          if (error) {
            process.stderr.write(`\n  ERROR: ${chainName} / ${itemName}: ${error.message}\n`);
            errors++;
          } else {
            updated++;
          }
        } catch (err) {
          process.stderr.write(`\n  EXCEPTION: ${chainName} / ${itemName}: ${err.message}\n`);
          errors++;
        }
      })
    );

    const pct = Math.round(((b + 1) / batches) * 100);
    process.stdout.write(`  Batch ${b + 1}/${batches} (${pct}%)  updated=${updated}  errors=${errors}\r`);
  }

  process.stdout.write('\n');
  return { updated, errors };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  process.stdout.write('='.repeat(56) + '\n');
  process.stdout.write('menustat_update_serving_unit.js\n');
  process.stdout.write('='.repeat(56) + '\n\n');

  const records = readXls();
  if (records.length === 0) {
    process.stdout.write('Nothing to update.\n');
    return;
  }

  process.stdout.write(`Running updates in batches of ${BATCH_SIZE}...\n`);
  const { updated, errors } = await runUpdates(records);

  process.stdout.write('\n' + '='.repeat(56) + '\n');
  process.stdout.write('RESULT\n');
  process.stdout.write('='.repeat(56) + '\n');
  process.stdout.write(`Rows updated:       ${updated}\n`);
  process.stdout.write(`Errors:             ${errors}\n`);
  process.stdout.write('='.repeat(56) + '\n\n');

  if (errors > 0) process.exit(1);
}

main().catch(err => {
  process.stderr.write(`FATAL: ${err.message}\n`);
  process.exit(1);
});
