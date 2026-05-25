/**
 * MANUAL QA REQUIRED — the following cannot be automated with Playwright:
 * - RestaurantCard logos in the Nearby list view: requires live geolocation + Overpass API data.
 *   With location enabled, open Nearby, wait for the restaurant list to populate, and confirm
 *   logos appear in RestaurantCards for chains that have a logo_url stored.
 * - Map pin initials circles (MapView.web.tsx): requires live geolocation + Overpass API +
 *   Mapbox GL JS marker rendering. With location enabled, open Nearby (map tab), confirm all
 *   pins show a 2-letter initials circle — never a plain red circle, never a broken image.
 * - Logo async load swap (emoji → logo): visual timing check. Open any restaurant screen for a
 *   chain with a logo. Confirm the category emoji briefly appears then is fully replaced by the
 *   logo once loaded — never both visible at the same time.
 * - onError fallback: logo_url present but image 404s at runtime → emoji renders. Requires a
 *   broken storage URL, which cannot be reliably injected in this test setup.
 * - AsyncStorage chain data cache persistence: open a restaurant screen, reload the page, and
 *   confirm the logo still appears. Check DevTools → Application → Local Storage for keys
 *   starting with "chain_" to verify cache was written.
 * - Native Expo Go behavior: logo/emoji rendering on a physical iOS or Android device.
 * These items are presented as manual steps in the QA report.
 */

import { expect, test, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// ── Constants ─────────────────────────────────────────────────────────────────

const SUPABASE_PROJECT_REF = 'pzvkkskmhqwnmzttabcl';

// Minimal 1×1 transparent PNG — served by the image mock so onLoad fires reliably
const MINIMAL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// ── Types ─────────────────────────────────────────────────────────────────────

type MockChain = {
  chain_name: string;
  logo_url: string | null;
  primary_category: string | null;
};

type MockMenuItem = {
  id: string;
  chain_name: string;
  item_name: string;
  category: string | null;
  calories: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
  serving_size: string | null;
  notes: string | null;
  created_at: string;
};

// ── Mock chain data ───────────────────────────────────────────────────────────

// Burger King — has a real logo in Supabase Storage (confirmed via Supabase MCP)
const CHAIN_WITH_LOGO: MockChain = {
  chain_name: 'Burger King',
  logo_url: `https://${SUPABASE_PROJECT_REF}.supabase.co/storage/v1/object/public/chain-logos/burger_king.png`,
  primary_category: 'Beverages',
};

// BJ's Restaurant & Brewhouse — no logo, primary_category = Toppings & Ingredients → 🧀
const CHAIN_NO_LOGO_TOPPINGS: MockChain = {
  chain_name: "BJ's Restaurant & Brewhouse",
  logo_url: null,
  primary_category: 'Toppings & Ingredients',
};

// Carrabba's Italian Grill — no logo, primary_category = Entrees → 🍽️
const CHAIN_NO_LOGO_ENTREES: MockChain = {
  chain_name: "Carrabba's Italian Grill",
  logo_url: null,
  primary_category: 'Entrees',
};

// Synthetic — null primary_category → DEFAULT_EMOJI 🍔
const CHAIN_NULL_CATEGORY: MockChain = {
  chain_name: 'TestChain',
  logo_url: null,
  primary_category: null,
};

// ── Mock menu item factory ────────────────────────────────────────────────────

function makeMenuItem(overrides: Partial<MockMenuItem> & { id: string }): MockMenuItem {
  return {
    chain_name: 'Burger King',
    item_name: 'Whopper',
    category: 'Sandwiches',
    calories: 660,
    protein_g: 28,
    fat_g: 40,
    carbs_g: 49,
    fiber_g: 2,
    sodium_mg: 980,
    serving_size: '1 sandwich',
    notes: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

const WHOPPER = makeMenuItem({ id: 'whopper-1' });

// ── Auth helpers ──────────────────────────────────────────────────────────────

function seedAuth(page: Page): Promise<void> {
  return page.addInitScript((projectRef: string) => {
    localStorage.setItem(
      `sb-${projectRef}-auth-token`,
      JSON.stringify({
        access_token: 'fake-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: 9999999999,
        refresh_token: 'fake-refresh-token',
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          aud: 'authenticated',
          role: 'authenticated',
        },
      })
    );
    localStorage.setItem('menu_cache_v2_cleared', '1');
  }, SUPABASE_PROJECT_REF);
}

async function setupAuthRoutes(page: Page): Promise<void> {
  await page.route('**/auth/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-access-token',
        token_type: 'bearer',
        user: {
          id: 'test-user-id',
          aud: 'authenticated',
          email: 'test@example.com',
          role: 'authenticated',
        },
      }),
    });
  });
  await page.route('**/rest/v1/profiles**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        id: 'test-user-id',
        name: 'Test User',
        profile_photo_url: null,
        daily_calorie_goal: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]),
    });
  });
}

// ── Route helpers ─────────────────────────────────────────────────────────────

async function setupRestaurantRoutes(
  page: Page,
  chainData: MockChain,
  items: MockMenuItem[] = [WHOPPER]
): Promise<void> {
  await setupAuthRoutes(page);

  await page.route('**/rest/v1/menu_items**', async (route) => {
    const n = items.length;
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Range': n > 0 ? `0-${n - 1}/${n}` : `*/0`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Content-Range',
      },
      body: JSON.stringify(items),
    });
  });

  // fetchChainByName uses .single() — PostgREST returns a plain object, not an array
  await page.route('**/rest/v1/chains**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(chainData),
    });
  });
}

// Serves a valid 1×1 PNG for any Supabase Storage logo request so onLoad fires
async function mockLogoImages(page: Page): Promise<void> {
  await page.route('**/storage/v1/object/public/chain-logos/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: MINIMAL_PNG,
    });
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Chain Logos — Issue #33', () => {

  // ── Suite 1: Smoke Tests ──────────────────────────────────────────────────────

  test.describe('Suite 1: App Loads Without Errors', () => {

    test('[Smoke] Nearby tab renders without JS crash', async ({ page }) => {
      await seedAuth(page);
      await setupAuthRoutes(page);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      // Screen renders in some valid state — location prompt or map — not a blank/error screen
      await expect(page.locator('text=Fatal error')).toHaveCount(0);
      await expect(page.locator('text=Something went wrong')).toHaveCount(0);
    });

    test('[Smoke] Browse tab renders without JS crash', async ({ page }) => {
      await seedAuth(page);
      await setupAuthRoutes(page);
      await page.route('**/rest/v1/rpc/get_categories**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ category: 'Entrees' }]),
        });
      });
      await page.route('**/rest/v1/rpc/get_chain_names**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ chain_name: 'Burger King' }]),
        });
      });
      await page.goto('/browse');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Something went wrong')).toHaveCount(0);
      await expect(page.locator('text=Burger King').first()).toBeVisible();
    });

    test('[Smoke] Restaurant screen renders chain name without crashing', async ({ page }) => {
      await seedAuth(page);
      await setupRestaurantRoutes(page, CHAIN_WITH_LOGO);
      await mockLogoImages(page);
      await page.goto('/restaurant/Burger%20King');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Burger King').first()).toBeVisible();
      await expect(page.locator('text=Something went wrong')).toHaveCount(0);
    });

  });

  // ── Suite 2: Restaurant Header — Logo Displayed ───────────────────────────────

  test.describe('Suite 2: Restaurant Header — Logo Display', () => {

    test('[AC] Header img element is present with Supabase Storage URL when chain has logo_url', async ({ page }) => {
      await seedAuth(page);
      await setupRestaurantRoutes(page, CHAIN_WITH_LOGO);
      await mockLogoImages(page);
      await page.goto('/restaurant/Burger%20King');
      await page.waitForLoadState('networkidle');
      const logoImg = page.locator('img[src*="chain-logos"]').first();
      await expect(logoImg).toBeAttached();
    });

    test('[AC] Category emoji is NOT visible once logo image loads — no simultaneous overlap', async ({ page }) => {
      await seedAuth(page);
      await setupRestaurantRoutes(page, CHAIN_WITH_LOGO);
      await mockLogoImages(page);
      await page.goto('/restaurant/Burger%20King');
      // Wait until the logo img becomes visible (onLoad fired → displayLogo = true → emoji unmounts)
      const logoImg = page.locator('img[src*="chain-logos"]').first();
      await expect(logoImg).toBeVisible({ timeout: 5000 });
      // 🥤 is the emoji for Beverages — must be gone once logo is loaded
      await expect(page.locator('text=🥤')).toHaveCount(0);
    });

    test('[AC] Chain name is always visible alongside the logo', async ({ page }) => {
      await seedAuth(page);
      await setupRestaurantRoutes(page, CHAIN_WITH_LOGO);
      await mockLogoImages(page);
      await page.goto('/restaurant/Burger%20King');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Burger King').first()).toBeVisible();
    });

  });

  // ── Suite 3: Restaurant Header — Emoji Fallback ───────────────────────────────

  test.describe('Suite 3: Restaurant Header — Emoji Fallback', () => {

    test('[AC] 🧀 emoji renders for "Toppings & Ingredients" chain when logo_url is null', async ({ page }) => {
      await seedAuth(page);
      await setupRestaurantRoutes(page, CHAIN_NO_LOGO_TOPPINGS);
      await page.goto("/restaurant/BJ%27s%20Restaurant%20%26%20Brewhouse");
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=🧀').first()).toBeVisible();
    });

    test('[AC] 🍽️ emoji renders for "Entrees" chain when logo_url is null', async ({ page }) => {
      await seedAuth(page);
      await setupRestaurantRoutes(page, CHAIN_NO_LOGO_ENTREES);
      await page.goto("/restaurant/Carrabba%27s%20Italian%20Grill");
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=🍽️').first()).toBeVisible();
    });

    test('[AC] 🍔 DEFAULT_EMOJI renders when primary_category is null', async ({ page }) => {
      await seedAuth(page);
      await setupRestaurantRoutes(page, CHAIN_NULL_CATEGORY);
      await page.goto('/restaurant/TestChain');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=🍔').first()).toBeVisible();
    });

    test('[AC] No img element with Storage URL is present when logo_url is null', async ({ page }) => {
      await seedAuth(page);
      await setupRestaurantRoutes(page, CHAIN_NO_LOGO_TOPPINGS);
      await page.goto("/restaurant/BJ%27s%20Restaurant%20%26%20Brewhouse");
      await page.waitForLoadState('networkidle');
      await expect(page.locator('img[src*="chain-logos"]')).toHaveCount(0);
    });

    test('[AC] Chain name is always visible alongside the emoji fallback', async ({ page }) => {
      await seedAuth(page);
      await setupRestaurantRoutes(page, CHAIN_NO_LOGO_TOPPINGS);
      await page.goto("/restaurant/BJ%27s%20Restaurant%20%26%20Brewhouse");
      await page.waitForLoadState('networkidle');
      await expect(page.locator("text=BJ's Restaurant & Brewhouse").first()).toBeVisible();
    });

  });

  // ── Suite 4: categoryEmoji.ts — Static Coverage Check ────────────────────────

  test.describe('Suite 4: categoryEmoji.ts — Full Category Mapping', () => {

    // The 12 distinct category values confirmed via: SELECT DISTINCT category FROM menu_items
    const EXPECTED_CATEGORIES = [
      'Beverages',
      'Toppings & Ingredients',
      'Entrees',
      'Appetizers & Sides',
      'Sandwiches',
      'Desserts',
      'Pizza',
      'Salads',
      'Baked Goods',
      'Burgers',
      'Soup',
      'Fried Potatoes',
    ];

    test('[AC] constants/categoryEmoji.ts file exists', () => {
      const filePath = path.join(process.cwd(), 'constants', 'categoryEmoji.ts');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('[AC] All 12 MenuStat category values have a mapping entry', () => {
      const filePath = path.join(process.cwd(), 'constants', 'categoryEmoji.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const category of EXPECTED_CATEGORIES) {
        expect(content, `Missing emoji mapping for category: "${category}"`).toContain(
          `'${category}'`
        );
      }
    });

    test('[AC] DEFAULT_EMOJI is exported as a named export', () => {
      const filePath = path.join(process.cwd(), 'constants', 'categoryEmoji.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('export const DEFAULT_EMOJI');
    });

  });

  // ── Suite 5: Edge Cases ───────────────────────────────────────────────────────

  test.describe('Suite 5: Edge Cases', () => {

    test("[Edge] Chain name with apostrophe in URL encodes and renders correctly (Applebee's)", async ({ page }) => {
      const chainData: MockChain = {
        chain_name: "Applebee's",
        logo_url: `https://${SUPABASE_PROJECT_REF}.supabase.co/storage/v1/object/public/chain-logos/applebees.png`,
        primary_category: 'Beverages',
      };
      const item = makeMenuItem({ id: 'item-1', chain_name: "Applebee's", item_name: 'Riblets' });
      await seedAuth(page);
      await setupRestaurantRoutes(page, chainData, [item]);
      await mockLogoImages(page);
      await page.goto("/restaurant/Applebee%27s");
      await page.waitForLoadState('networkidle');
      await expect(page.locator("text=Applebee's").first()).toBeVisible();
    });

    test('[Edge] Chains API 500 error does not crash screen — menu items still render', async ({ page }) => {
      await seedAuth(page);
      await setupAuthRoutes(page);
      await page.route('**/rest/v1/menu_items**', async (route) => {
        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Range': '0-0/1',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': 'Content-Range',
          },
          body: JSON.stringify([WHOPPER]),
        });
      });
      await page.route('**/rest/v1/chains**', async (route) => {
        await route.fulfill({ status: 500, body: 'Internal Server Error' });
      });
      await page.goto('/restaurant/Burger%20King');
      await page.waitForLoadState('networkidle');
      // Menu items must still render even when the chains API fails
      await expect(page.locator('text=Whopper').first()).toBeVisible();
    });

    test('[Edge] Chains API PGRST116 (no row found) renders DEFAULT_EMOJI — no crash', async ({ page }) => {
      await seedAuth(page);
      await setupAuthRoutes(page);
      await page.route('**/rest/v1/menu_items**', async (route) => {
        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Range': '0-0/1',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': 'Content-Range',
          },
          body: JSON.stringify([WHOPPER]),
        });
      });
      // PGRST116 — fetchChainByName returns null → chainData = null → DEFAULT_EMOJI
      await page.route('**/rest/v1/chains**', async (route) => {
        await route.fulfill({
          status: 406,
          contentType: 'application/json',
          body: JSON.stringify({ code: 'PGRST116', details: 'The result contains 0 rows', message: 'JSON object requested, multiple (or no) rows returned' }),
        });
      });
      await page.goto('/restaurant/Burger%20King');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=🍔').first()).toBeVisible();
      await expect(page.locator('text=Whopper').first()).toBeVisible();
    });

    test('[Layout] No horizontal overflow at 375px mobile viewport on restaurant screen', async ({ page }) => {
      await seedAuth(page);
      await setupRestaurantRoutes(page, CHAIN_WITH_LOGO);
      await mockLogoImages(page);
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/restaurant/Burger%20King');
      await page.waitForLoadState('networkidle');
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    });

  });

});
