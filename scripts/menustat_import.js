// MenuStat 2022 XLS → Supabase CSV import script
// Usage:
//   node scripts/menustat_import.js --inspect   (prints sheet names + headers, no output files)
//   node scripts/menustat_import.js             (full run: outputs menu_items_cleaned.csv + quality report)

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const XLS_PATH = path.join(__dirname, 'ms_annual_data_2022.xls');
const CSV_PATH = path.join(__dirname, 'menu_items_cleaned.csv');

const NULL_VALUES = new Set(['n/a', 'na', '-', '–', '—', '', 'null', 'none', 'not available', 'not tested']);

function isNullValue(val) {
  if (val === null || val === undefined) return true;
  if (typeof val === 'string' && NULL_VALUES.has(val.trim().toLowerCase())) return true;
  return false;
}

function parseNumeric(val) {
  if (isNullValue(val)) return null;
  const num = Number(val);
  if (isNaN(num)) return null;
  return num;
}

function parseInteger(val) {
  const num = parseNumeric(val);
  return num !== null ? Math.round(num) : null;
}

function normalizeChainName(name) {
  if (!name || typeof name !== 'string') return '';
  return name.trim().replace(/\s+/g, ' ');
}

function normalizeText(val) {
  if (isNullValue(val)) return null;
  return String(val).trim().replace(/\s+/g, ' ') || null;
}

// Map from lowercase XLS header → schema column name.
// Keys are lowercase + trimmed so matching is case-insensitive.
const COLUMN_MAP = {
  // Chain / restaurant name
  'restaurant': 'chain_name',
  'restaurant name': 'chain_name',
  'chain': 'chain_name',
  'chain name': 'chain_name',
  'company': 'chain_name',

  // Item name
  'item': 'item_name',
  'item name': 'item_name',
  'menu item': 'item_name',
  'food item': 'item_name',
  'item description': 'item_name',
  'description': 'item_name',

  // Category
  'food category': 'category',
  'category': 'category',
  'item type': 'category',
  'meal type': 'category',

  // Calories
  'calories': 'calories',
  'cal': 'calories',
  'energy (kcal)': 'calories',
  'energy': 'calories',
  'total calories': 'calories',
  'kcal': 'calories',

  // Protein
  'protein': 'protein_g',
  'protein (g)': 'protein_g',
  'protein(g)': 'protein_g',
  'total protein': 'protein_g',
  'protein g': 'protein_g',

  // Fat
  'total fat': 'fat_g',
  'total fat (g)': 'fat_g',
  'total fat(g)': 'fat_g',
  'fat': 'fat_g',
  'fat (g)': 'fat_g',
  'fat(g)': 'fat_g',
  'fat g': 'fat_g',

  // Carbs
  'total carbohydrate': 'carbs_g',
  'total carbohydrates': 'carbs_g',
  'total carbohydrate (g)': 'carbs_g',
  'total carbohydrates (g)': 'carbs_g',
  'carbohydrate': 'carbs_g',
  'carbohydrates': 'carbs_g',
  'carbohydrate (g)': 'carbs_g',
  'carbohydrates (g)': 'carbs_g',
  'carbs': 'carbs_g',
  'carbs (g)': 'carbs_g',
  'carbs(g)': 'carbs_g',
  'carbs g': 'carbs_g',

  // Fiber
  'dietary fiber': 'fiber_g',
  'dietary fiber (g)': 'fiber_g',
  'dietary fiber(g)': 'fiber_g',
  'fiber': 'fiber_g',
  'fiber (g)': 'fiber_g',
  'fiber(g)': 'fiber_g',
  'fiber g': 'fiber_g',
  'total dietary fiber': 'fiber_g',

  // Sodium
  'sodium': 'sodium_mg',
  'sodium (mg)': 'sodium_mg',
  'sodium(mg)': 'sodium_mg',
  'sodium mg': 'sodium_mg',
  'salt': 'sodium_mg',

  // Serving size
  'serving size': 'serving_size',
  'serving': 'serving_size',
  'serving size (g)': 'serving_size',
  'portion size': 'serving_size',

  // Notes
  'notes': 'notes',
  'note': 'notes',
  'comments': 'notes',
};

function mapHeaders(rawHeaders) {
  const mapping = {};
  const unmapped = [];

  rawHeaders.forEach((h, i) => {
    // Normalize: lowercase + replace underscores with spaces so snake_case XLS headers match the map
    const key = String(h || '').trim().toLowerCase().replace(/_/g, ' ');
    const schemaCol = COLUMN_MAP[key];
    if (schemaCol && !mapping[schemaCol]) {
      mapping[schemaCol] = i;
    } else if (!schemaCol) {
      unmapped.push(`"${h}" (col ${i})`);
    }
  });

  return { mapping, unmapped };
}

function inspect() {
  if (!fs.existsSync(XLS_PATH)) {
    process.stderr.write(`ERROR: XLS file not found at ${XLS_PATH}\n`);
    process.exit(1);
  }

  const wb = XLSX.readFile(XLS_PATH);
  process.stdout.write(`\n=== INSPECT MODE ===\n`);
  process.stdout.write(`File: ${XLS_PATH}\n`);
  process.stdout.write(`\nSheets found (${wb.SheetNames.length}):\n`);
  wb.SheetNames.forEach((name, i) => process.stdout.write(`  [${i}] ${name}\n`));

  wb.SheetNames.forEach((sheetName, sheetIndex) => {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (rows.length === 0) {
      process.stdout.write(`\nSheet [${sheetIndex}] "${sheetName}": EMPTY\n`);
      return;
    }

    const headers = rows[0];
    process.stdout.write(`\nSheet [${sheetIndex}] "${sheetName}" — ${rows.length - 1} data rows, ${headers.length} columns:\n`);
    headers.forEach((h, i) => process.stdout.write(`  col[${i}]: "${h}"\n`));

    const { mapping, unmapped } = mapHeaders(headers);
    process.stdout.write(`\n  Schema columns mapped:\n`);
    const SCHEMA_COLS = ['chain_name', 'item_name', 'category', 'calories', 'protein_g', 'fat_g', 'carbs_g', 'fiber_g', 'sodium_mg', 'serving_size'];
    SCHEMA_COLS.forEach(col => {
      if (mapping[col] !== undefined) {
        process.stdout.write(`    ✅ ${col} ← col[${mapping[col]}] "${headers[mapping[col]]}"\n`);
      } else {
        process.stdout.write(`    ❌ ${col} — NOT MAPPED\n`);
      }
    });

    if (unmapped.length > 0) {
      process.stdout.write(`\n  Unmapped columns (will be ignored):\n`);
      unmapped.forEach(u => process.stdout.write(`    - ${u}\n`));
    }
  });

  process.stdout.write(`\nTo run the full import: node scripts/menustat_import.js\n\n`);
}

function run() {
  if (!fs.existsSync(XLS_PATH)) {
    process.stderr.write(`ERROR: XLS file not found at ${XLS_PATH}\n`);
    process.exit(1);
  }

  process.stdout.write(`Reading ${XLS_PATH}...\n`);
  const wb = XLSX.readFile(XLS_PATH);

  // Use first sheet that has more than 1 row
  let targetSheet = null;
  let targetSheetName = null;
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (rows.length > 1) {
      targetSheet = ws;
      targetSheetName = name;
      break;
    }
  }

  if (!targetSheet) {
    process.stderr.write(`ERROR: No sheet with data found in the XLS file.\n`);
    process.exit(1);
  }

  const allRows = XLSX.utils.sheet_to_json(targetSheet, { header: 1, defval: '' });
  const rawHeaders = allRows[0].map(h => String(h || '').trim());
  const dataRows = allRows.slice(1);

  process.stdout.write(`Sheet: "${targetSheetName}" — ${dataRows.length} data rows\n`);

  const { mapping } = mapHeaders(rawHeaders);

  const required = ['chain_name', 'item_name'];
  const missing = required.filter(c => mapping[c] === undefined);
  if (missing.length > 0) {
    process.stderr.write(`ERROR: Required columns not found in XLS: ${missing.join(', ')}\n`);
    process.stderr.write(`Run with --inspect to see available columns.\n`);
    process.exit(1);
  }

  const OUTPUT_COLS = ['chain_name', 'item_name', 'category', 'calories', 'protein_g', 'fat_g', 'carbs_g', 'fiber_g', 'sodium_mg', 'serving_size', 'notes'];
  const NUMERIC_COLS = new Set(['calories', 'protein_g', 'fat_g', 'carbs_g', 'fiber_g', 'sodium_mg']);

  const counters = {
    total: 0,
    missing_calories: 0,
    missing_protein_g: 0,
    missing_fat_g: 0,
    missing_carbs_g: 0,
    missing_fiber_g: 0,
  };

  // chain → { total, missing_any_macro }
  const chainStats = {};

  const csvRows = [OUTPUT_COLS.join(',')];

  for (const row of dataRows) {
    const chainRaw = row[mapping['chain_name']];
    const itemRaw = mapping['item_name'] !== undefined ? row[mapping['item_name']] : null;

    const chainName = normalizeChainName(String(chainRaw || ''));
    const itemName = normalizeText(itemRaw);

    if (!chainName || !itemName) continue;

    counters.total++;

    if (!chainStats[chainName]) chainStats[chainName] = { total: 0, missing_any_macro: 0 };
    chainStats[chainName].total++;

    const record = {
      chain_name: chainName,
      item_name: itemName,
      category: mapping['category'] !== undefined ? normalizeText(row[mapping['category']]) : null,
      calories: mapping['calories'] !== undefined ? parseInteger(row[mapping['calories']]) : null,
      protein_g: mapping['protein_g'] !== undefined ? parseNumeric(row[mapping['protein_g']]) : null,
      fat_g: mapping['fat_g'] !== undefined ? parseNumeric(row[mapping['fat_g']]) : null,
      carbs_g: mapping['carbs_g'] !== undefined ? parseNumeric(row[mapping['carbs_g']]) : null,
      fiber_g: mapping['fiber_g'] !== undefined ? parseNumeric(row[mapping['fiber_g']]) : null,
      sodium_mg: mapping['sodium_mg'] !== undefined ? parseNumeric(row[mapping['sodium_mg']]) : null,
      serving_size: mapping['serving_size'] !== undefined ? normalizeText(row[mapping['serving_size']]) : null,
      notes: null,
    };

    let missingAny = false;
    for (const col of ['calories', 'protein_g', 'fat_g', 'carbs_g', 'fiber_g']) {
      if (record[col] === null) {
        counters[`missing_${col}`]++;
        missingAny = true;
      }
    }
    if (missingAny) chainStats[chainName].missing_any_macro++;

    const csvLine = OUTPUT_COLS.map(col => {
      const val = record[col];
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }).join(',');

    csvRows.push(csvLine);
  }

  fs.writeFileSync(CSV_PATH, csvRows.join('\n'), 'utf8');

  const pct = (n) => ((n / counters.total) * 100).toFixed(1) + '%';

  // Top 10 chains by missing macro rate
  const chainList = Object.entries(chainStats)
    .map(([name, s]) => ({ name, rate: s.missing_any_macro / s.total, total: s.total, missing: s.missing_any_macro }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10);

  process.stdout.write(`\n${'='.repeat(56)}\n`);
  process.stdout.write(`DATA QUALITY REPORT — MenuStat 2022\n`);
  process.stdout.write(`${'='.repeat(56)}\n`);
  process.stdout.write(`Total rows imported:        ${counters.total}\n`);
  process.stdout.write(`\nMissing values:\n`);
  process.stdout.write(`  Calories missing:         ${counters.missing_calories} (${pct(counters.missing_calories)})\n`);
  process.stdout.write(`  Protein missing:          ${counters.missing_protein_g} (${pct(counters.missing_protein_g)})\n`);
  process.stdout.write(`  Fat missing:              ${counters.missing_fat_g} (${pct(counters.missing_fat_g)})\n`);
  process.stdout.write(`  Carbs missing:            ${counters.missing_carbs_g} (${pct(counters.missing_carbs_g)})\n`);
  process.stdout.write(`  Fiber missing:            ${counters.missing_fiber_g} (${pct(counters.missing_fiber_g)})\n`);
  process.stdout.write(`\nTop 10 chains by missing macro rate:\n`);
  chainList.forEach((c, i) => {
    const pctStr = ((c.missing / c.total) * 100).toFixed(1).padStart(5);
    process.stdout.write(`  ${String(i + 1).padStart(2)}. ${c.name.padEnd(35)} ${pctStr}%  (${c.missing}/${c.total} items)\n`);
  });
  process.stdout.write(`\nOutput CSV: ${CSV_PATH}\n`);
  process.stdout.write(`${'='.repeat(56)}\n\n`);
}

const args = process.argv.slice(2);
if (args.includes('--inspect')) {
  inspect();
} else {
  run();
}
