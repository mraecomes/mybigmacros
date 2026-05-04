/**
 * Chain name matcher test script.
 *
 * Usage: pnpm exec tsx scripts/test_chain_matcher.ts
 *
 * Prerequisites:
 *   - pnpm add -D tsx dotenv  (already installed)
 *   - osm_aliases table seeded in Supabase
 *   - menu_items table populated in Supabase
 */

// dotenv must run before chainMatcher is imported — TypeScript hoists static imports
// to the top of the compiled file, so dotenv.config() would run too late if chainMatcher
// were a static import. Dynamic import() inside runTests() loads it after env vars are set.
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import type { ChainMatchInput, ChainMatchResult } from '../types/matching';

type TestCase = {
  description: string;
  input: ChainMatchInput;
  expectedCanonical: string | null;
  expectedSource?: 'exact' | 'fuzzy';
};

const TEST_CASES: TestCase[] = [
  // --- Issue #4 acceptance criteria ---
  {
    description: '"BK" → Burger King (exact alias)',
    input: { brand: 'BK' },
    expectedCanonical: 'Burger King',
    expectedSource: 'exact',
  },
  {
    description: '"Checkers" → Checker\'s Drive-In/ Rally\'s (exact alias)',
    input: { brand: 'Checkers' },
    expectedCanonical: "Checker's Drive-In/ Rally's",
    expectedSource: 'exact',
  },
  {
    description: '"McDonalds" → McDonald\'s (exact alias)',
    input: { brand: 'McDonalds' },
    expectedCanonical: "McDonald's",
    expectedSource: 'exact',
  },
  {
    description: '"Burger King" → Burger King (direct canonical, fuzzy)',
    input: { brand: 'Burger King' },
    expectedCanonical: 'Burger King',
  },
  {
    description: '"XYZ Diner" → null (no match)',
    input: { brand: 'XYZ Diner' },
    expectedCanonical: null,
  },

  // --- Fuzzy match cases ---
  {
    description: '"Burger Kng" → Burger King (fuzzy misspelling)',
    input: { brand: 'Burger Kng' },
    expectedCanonical: 'Burger King',
    expectedSource: 'fuzzy',
  },
  {
    description: '"Mcdonalds" → McDonald\'s (fuzzy case/apostrophe)',
    input: { brand: 'Mcdonalds' },
    expectedCanonical: "McDonald's",
  },
  {
    description: '"Taco Bell" → Taco Bell (direct canonical)',
    input: { brand: 'Taco Bell' },
    expectedCanonical: 'Taco Bell',
  },
  {
    description: '"Starbucks Coffee" → Starbucks (exact alias)',
    input: { brand: 'Starbucks Coffee' },
    expectedCanonical: 'Starbucks',
    expectedSource: 'exact',
  },

  // --- False positive guard ---
  {
    description: '"Wendy\'s" → Wendy\'s, NOT Denny\'s (threshold guard)',
    input: { brand: "Wendy's" },
    expectedCanonical: "Wendy's",
  },

  // --- brand vs name fallback ---
  {
    description: 'name "Subway" used when brand is absent',
    input: { name: 'Subway' },
    expectedCanonical: 'Subway',
  },
  {
    description: 'brand takes priority over name',
    input: { brand: 'BK', name: 'Some Other Name' },
    expectedCanonical: 'Burger King',
    expectedSource: 'exact',
  },

  // --- Empty input ---
  {
    description: 'no brand, no name → null',
    input: {},
    expectedCanonical: null,
  },
  {
    description: 'whitespace-only brand → null',
    input: { brand: '  ' },
    expectedCanonical: null,
  },
];

async function runTests(): Promise<void> {
  // Dynamic import ensures this module (and client.ts) loads AFTER dotenv.config() has run
  const { matchChainName, _resetCacheForTesting } = await import(
    '../lib/matching/chainMatcher'
  );

  let passed = 0;
  let failed = 0;

  process.stdout.write('\n=== Chain Matcher Test Suite ===\n\n');

  for (const tc of TEST_CASES) {
    _resetCacheForTesting();

    let result: ChainMatchResult | null;
    try {
      result = await matchChainName(tc.input);
    } catch (err) {
      process.stdout.write(`  FAIL  ${tc.description}\n`);
      process.stdout.write(`        Exception: ${String(err)}\n`);
      failed++;
      continue;
    }

    const gotCanonical = result?.canonical ?? null;
    const canonicalMatch = gotCanonical === tc.expectedCanonical;
    const sourceMatch =
      tc.expectedSource === undefined || result?.source === tc.expectedSource;

    if (canonicalMatch && sourceMatch) {
      const scoreStr =
        result?.score != null ? ` (score: ${result.score.toFixed(3)})` : '';
      process.stdout.write(`  PASS  ${tc.description}${scoreStr}\n`);
      passed++;
    } else {
      process.stdout.write(`  FAIL  ${tc.description}\n`);
      if (!canonicalMatch) {
        process.stdout.write(
          `        expected canonical="${tc.expectedCanonical}" got="${gotCanonical}"\n`
        );
      }
      if (!sourceMatch) {
        process.stdout.write(
          `        expected source="${tc.expectedSource}" got="${result?.source}"\n`
        );
      }
      failed++;
    }
  }

  process.stdout.write(`\n--- Results: ${passed} passed, ${failed} failed ---\n\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  process.stderr.write(`Fatal error: ${String(err)}\n`);
  process.exit(1);
});
