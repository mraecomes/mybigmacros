/**
 * MANUAL QA REQUIRED — the following cannot be automated with Playwright:
 * - Tooltip tap-to-toggle on mobile (Expo Go / native): tap a badge → tooltip appears,
 *   tap again → tooltip dismisses. Requires a physical device or Expo Go.
 * - Badge display on BudgetItemCard (calorie filter screen): requires a seeded location
 *   cache in AsyncStorage, which is not set up in fresh Playwright sessions. The Budget
 *   screen shows "No location set" in all test runs — BudgetItemCard is never rendered.
 * These items are presented to the product owner as manual steps.
 */

import { expect, test, type Page } from '@playwright/test';

// ── Constants ──────────────────────────────────────────────────────────────────

const SUPABASE_PROJECT_REF = 'pzvkkskmhqwnmzttabcl';

// Color values for badge verification (hex → rgb conversion)
const MUSTARD_GOLD_RGB = 'rgb(255, 193, 7)';   // #FFC107 — Protein Hit
const SAGE_GREEN_RGB   = 'rgb(107, 143, 113)';  // #6B8F71 — Fiber Fuel

// ── Mock item type ────────────────────────────────────────────────────────────

type MockItem = {
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
  serving_size_unit: string | null;
  notes: string | null;
  created_at: string;
};

// ── Mock item factories ───────────────────────────────────────────────────────

function makeItem(overrides: Partial<MockItem> & { id: string; item_name: string }): MockItem {
  return {
    chain_name: "McDonald's",
    category: 'Entrees',
    calories: 400,
    protein_g: 10,
    fat_g: 15,
    carbs_g: 40,
    fiber_g: 2,
    sodium_mg: 800,
    serving_size: '1 serving',
    serving_size_unit: null,
    notes: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// Qualifying items
const PROTEIN_HIT_ITEM   = makeItem({ id: 'protein-hit',   item_name: 'Grilled Chicken Sandwich', protein_g: 28, calories: 400 });
const FIBER_FUEL_ITEM    = makeItem({ id: 'fiber-fuel',    item_name: 'Garden Salad',              fiber_g: 7,  protein_g: 8,  calories: 350 });
const BOTH_BADGES_ITEM   = makeItem({ id: 'both-badges',   item_name: 'Protein Salad Bowl',        protein_g: 25, fiber_g: 6, calories: 450 });
const NO_BADGE_ITEM      = makeItem({ id: 'no-badge',      item_name: 'Small Fries',               protein_g: 3,  fiber_g: 1, calories: 230 });

// Missing data items
const NULL_PROTEIN_ITEM  = makeItem({ id: 'null-protein',  item_name: 'Mystery Chicken',  protein_g: null, fiber_g: 2, calories: 400 });
const NULL_FIBER_ITEM    = makeItem({ id: 'null-fiber',    item_name: 'Unknown Salad',    fiber_g: null,   protein_g: 10, calories: 300 });
const NULL_CALORIES_ITEM = makeItem({ id: 'null-calories', item_name: 'No Cal Item',      calories: null,  protein_g: 30, fiber_g: 8 });

// Edge case items
const EDGE_EXACT_THRESHOLD = makeItem({ id: 'edge-exact',   item_name: 'Exact Threshold Item',   protein_g: 20, fiber_g: 2, calories: 499 });
const EDGE_BELOW_PROTEIN   = makeItem({ id: 'edge-below',   item_name: 'Just Below Protein Item', protein_g: 19, fiber_g: 2, calories: 499 });
const EDGE_500_CAL         = makeItem({ id: 'edge-500cal',  item_name: 'Five Hundred Cal Item',   protein_g: 25, fiber_g: 6, calories: 500 });

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
        daily_calorie_goal: 2000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]),
    });
  });
}

// ── Route fulfillment helpers ─────────────────────────────────────────────────

function itemsResponse(items: MockItem[], total?: number) {
  const n = items.length;
  const contentRange = n > 0 ? `0-${n - 1}/${total ?? n}` : `*/${total ?? 0}`;
  return {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Range': contentRange,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Content-Range',
    },
    body: JSON.stringify(items),
  };
}

// For fetchMenuItem — uses .single() so PostgREST returns a plain object
function singleItemResponse(item: MockItem) {
  return {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(item),
  };
}

// ── Browse screen setup ───────────────────────────────────────────────────────

async function setupBrowseRoutes(page: Page, searchItems: MockItem[]): Promise<void> {
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
      body: JSON.stringify([{ chain_name: "McDonald's" }]),
    });
  });

  await page.route('**/rest/v1/menu_items**', async (route) => {
    await route.fulfill(itemsResponse(searchItems));
  });
}

// Navigates to Browse, types a search query, and waits for results
async function searchBrowse(page: Page, query = 'grilled'): Promise<void> {
  await page.goto('/browse');
  await page.waitForLoadState('networkidle');
  await page.getByPlaceholder(/search/i).fill(query);
  await page.waitForLoadState('networkidle');
}

// ── Restaurant screen setup ───────────────────────────────────────────────────

async function setupRestaurantRoutes(page: Page, items: MockItem[]): Promise<void> {
  await setupAuthRoutes(page);
  await page.route('**/rest/v1/menu_items**', async (route) => {
    await route.fulfill(itemsResponse(items));
  });
}

// ── Item detail screen setup ──────────────────────────────────────────────────

async function setupItemDetailRoutes(page: Page, item: MockItem): Promise<void> {
  await setupAuthRoutes(page);
  await page.route('**/rest/v1/menu_items**', async (route) => {
    await route.fulfill(singleItemResponse(item));
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe('Badge System — Issue #12', () => {

  // ── Suite 1: Browse Screen — Badge Display ──────────────────────────────────

  test.describe('Suite 1: Browse Screen — Badge Visibility', () => {

    test('[AC] Protein Hit badge appears on item with protein ≥ 20g AND calories < 500', async ({ page }) => {
      await seedAuth(page);
      await setupBrowseRoutes(page, [PROTEIN_HIT_ITEM]);
      await searchBrowse(page);
      await expect(page.locator('text=Protein Hit').first()).toBeVisible();
    });

    test('[AC] Fiber Fuel badge appears on item with fiber ≥ 5g AND calories < 500', async ({ page }) => {
      await seedAuth(page);
      await setupBrowseRoutes(page, [FIBER_FUEL_ITEM]);
      await searchBrowse(page);
      await expect(page.locator('text=Fiber Fuel').first()).toBeVisible();
    });

    test('[AC] Both badges appear side by side on doubly qualifying item', async ({ page }) => {
      await seedAuth(page);
      await setupBrowseRoutes(page, [BOTH_BADGES_ITEM]);
      await searchBrowse(page);
      await expect(page.locator('text=Protein Hit').first()).toBeVisible();
      await expect(page.locator('text=Fiber Fuel').first()).toBeVisible();
    });

    test('[AC] No badge appears on item that qualifies for neither', async ({ page }) => {
      await seedAuth(page);
      await setupBrowseRoutes(page, [NO_BADGE_ITEM]);
      await searchBrowse(page);
      await expect(page.locator('text=Protein Hit')).toHaveCount(0);
      await expect(page.locator('text=Fiber Fuel')).toHaveCount(0);
    });

    test('[AC] No Protein Hit badge when protein_g is null', async ({ page }) => {
      await seedAuth(page);
      await setupBrowseRoutes(page, [NULL_PROTEIN_ITEM]);
      await searchBrowse(page);
      await expect(page.locator('text=Protein Hit')).toHaveCount(0);
    });

    test('[AC] No Fiber Fuel badge when fiber_g is null', async ({ page }) => {
      await seedAuth(page);
      await setupBrowseRoutes(page, [NULL_FIBER_ITEM]);
      await searchBrowse(page);
      await expect(page.locator('text=Fiber Fuel')).toHaveCount(0);
    });

    test('[AC] Neither badge appears when calories is null', async ({ page }) => {
      await seedAuth(page);
      await setupBrowseRoutes(page, [NULL_CALORIES_ITEM]);
      await searchBrowse(page);
      await expect(page.locator('text=Protein Hit')).toHaveCount(0);
      await expect(page.locator('text=Fiber Fuel')).toHaveCount(0);
    });

    test('[AC] Chain name rows (BrowseChainRow) never show badges', async ({ page }) => {
      await seedAuth(page);
      await setupBrowseRoutes(page, []);
      await page.goto('/browse');
      await page.waitForLoadState('networkidle');
      // Default view shows chain list — chain rows must never have badge pills
      await expect(page.locator("text=McDonald's").first()).toBeVisible();
      await expect(page.locator('text=Protein Hit')).toHaveCount(0);
      await expect(page.locator('text=Fiber Fuel')).toHaveCount(0);
    });
  });

  // ── Suite 2: Browse Screen — Badge Colors ───────────────────────────────────

  test.describe('Suite 2: Browse Screen — Badge Colors', () => {

    test('[AC] Protein Hit badge background is Mustard Gold (#FFC107)', async ({ page }) => {
      await seedAuth(page);
      await setupBrowseRoutes(page, [PROTEIN_HIT_ITEM]);
      await searchBrowse(page);
      const badge = page.locator('text=Protein Hit').first();
      await expect(badge).toBeVisible();
      const bgColor = await badge.evaluate((el) => {
        const pill = el.closest('[style]') ?? el.parentElement;
        return pill ? window.getComputedStyle(pill).backgroundColor : '';
      });
      expect(bgColor).toBe(MUSTARD_GOLD_RGB);
    });

    test('[AC] Fiber Fuel badge background is Muted Sage Green (#6B8F71)', async ({ page }) => {
      await seedAuth(page);
      await setupBrowseRoutes(page, [FIBER_FUEL_ITEM]);
      await searchBrowse(page);
      const badge = page.locator('text=Fiber Fuel').first();
      await expect(badge).toBeVisible();
      const bgColor = await badge.evaluate((el) => {
        const pill = el.closest('[style]') ?? el.parentElement;
        return pill ? window.getComputedStyle(pill).backgroundColor : '';
      });
      expect(bgColor).toBe(SAGE_GREEN_RGB);
    });
  });

  // ── Suite 3: Browse Screen — Tooltip Hover (web) ───────────────────────────

  test.describe('Suite 3: Browse Screen — Tooltip on Hover (web)', () => {

    test('[AC] Hovering Protein Hit badge shows exact protein tooltip text', async ({ page }) => {
      await seedAuth(page);
      await setupBrowseRoutes(page, [PROTEIN_HIT_ITEM]);
      await searchBrowse(page);
      await page.locator('text=Protein Hit').first().hover();
      await expect(
        page.locator(`text=High protein (${PROTEIN_HIT_ITEM.protein_g}g) · Under 500 cal`).first()
      ).toBeVisible();
    });

    test('[AC] Hovering Fiber Fuel badge shows exact fiber tooltip text', async ({ page }) => {
      await seedAuth(page);
      await setupBrowseRoutes(page, [FIBER_FUEL_ITEM]);
      await searchBrowse(page);
      await page.locator('text=Fiber Fuel').first().hover();
      await expect(
        page.locator(`text=Good fiber (${FIBER_FUEL_ITEM.fiber_g}g) · Under 500 cal`).first()
      ).toBeVisible();
    });

    test('[AC] Moving mouse off badge hides the tooltip (no persistent tooltip on web)', async ({ page }) => {
      await seedAuth(page);
      await setupBrowseRoutes(page, [PROTEIN_HIT_ITEM]);
      await searchBrowse(page);
      await page.locator('text=Protein Hit').first().hover();
      await expect(
        page.locator(`text=High protein (${PROTEIN_HIT_ITEM.protein_g}g) · Under 500 cal`).first()
      ).toBeVisible();
      // Move mouse to a neutral position away from the badge
      await page.mouse.move(10, 10);
      await expect(
        page.locator(`text=High protein (${PROTEIN_HIT_ITEM.protein_g}g) · Under 500 cal`)
      ).toHaveCount(0);
    });

    test('[UseCase] Both tooltip texts appear correctly on a doubly qualifying item', async ({ page }) => {
      await seedAuth(page);
      await setupBrowseRoutes(page, [BOTH_BADGES_ITEM]);
      await searchBrowse(page);
      await page.locator('text=Protein Hit').first().hover();
      await expect(
        page.locator(`text=High protein (${BOTH_BADGES_ITEM.protein_g}g) · Under 500 cal`).first()
      ).toBeVisible();
      await page.mouse.move(10, 10);
      await page.locator('text=Fiber Fuel').first().hover();
      await expect(
        page.locator(`text=Good fiber (${BOTH_BADGES_ITEM.fiber_g}g) · Under 500 cal`).first()
      ).toBeVisible();
    });
  });

  // ── Suite 4: Restaurant Menu Screen — Badge Display ─────────────────────────

  test.describe('Suite 4: Restaurant Menu Screen — Badge Display', () => {

    test('[UseCase] Protein Hit badge appears on qualifying item in restaurant menu (MenuItemRow)', async ({ page }) => {
      await seedAuth(page);
      await setupRestaurantRoutes(page, [PROTEIN_HIT_ITEM, NO_BADGE_ITEM]);
      await page.goto("/restaurant/McDonald%27s");
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Protein Hit').first()).toBeVisible();
    });

    test('[UseCase] No badge appears on non-qualifying item in restaurant menu', async ({ page }) => {
      await seedAuth(page);
      await setupRestaurantRoutes(page, [NO_BADGE_ITEM]);
      await page.goto("/restaurant/McDonald%27s");
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Small Fries').first()).toBeVisible();
      await expect(page.locator('text=Protein Hit')).toHaveCount(0);
      await expect(page.locator('text=Fiber Fuel')).toHaveCount(0);
    });

    test('[UseCase] Fiber Fuel badge appears on high-fiber item in restaurant menu', async ({ page }) => {
      await seedAuth(page);
      await setupRestaurantRoutes(page, [FIBER_FUEL_ITEM]);
      await page.goto("/restaurant/McDonald%27s");
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Fiber Fuel').first()).toBeVisible();
    });

    test('[UseCase] Null protein item shows no Protein Hit badge in restaurant menu', async ({ page }) => {
      await seedAuth(page);
      await setupRestaurantRoutes(page, [NULL_PROTEIN_ITEM]);
      await page.goto("/restaurant/McDonald%27s");
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Mystery Chicken').first()).toBeVisible();
      await expect(page.locator('text=Protein Hit')).toHaveCount(0);
    });
  });

  // ── Suite 5: Item Detail Screen — Badge Display ─────────────────────────────

  test.describe('Suite 5: Item Detail Screen — Badge Display', () => {

    test('[AC] Protein Hit badge appears on qualifying item detail screen', async ({ page }) => {
      await seedAuth(page);
      await setupItemDetailRoutes(page, PROTEIN_HIT_ITEM);
      await page.goto(`/item/${PROTEIN_HIT_ITEM.id}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Protein Hit').first()).toBeVisible();
    });

    test('[AC] Fiber Fuel badge appears on qualifying item detail screen', async ({ page }) => {
      await seedAuth(page);
      await setupItemDetailRoutes(page, FIBER_FUEL_ITEM);
      await page.goto(`/item/${FIBER_FUEL_ITEM.id}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Fiber Fuel').first()).toBeVisible();
    });

    test('[AC] Both badges appear on item detail screen when item qualifies for both', async ({ page }) => {
      await seedAuth(page);
      await setupItemDetailRoutes(page, BOTH_BADGES_ITEM);
      await page.goto(`/item/${BOTH_BADGES_ITEM.id}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Protein Hit').first()).toBeVisible();
      await expect(page.locator('text=Fiber Fuel').first()).toBeVisible();
    });

    test('[AC] No badge section renders for non-qualifying item on detail screen', async ({ page }) => {
      await seedAuth(page);
      await setupItemDetailRoutes(page, NO_BADGE_ITEM);
      await page.goto(`/item/${NO_BADGE_ITEM.id}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Small Fries').first()).toBeVisible();
      await expect(page.locator('text=Protein Hit')).toHaveCount(0);
      await expect(page.locator('text=Fiber Fuel')).toHaveCount(0);
    });

    test('[AC] Hovering Protein Hit badge on detail screen shows exact tooltip text', async ({ page }) => {
      await seedAuth(page);
      await setupItemDetailRoutes(page, PROTEIN_HIT_ITEM);
      await page.goto(`/item/${PROTEIN_HIT_ITEM.id}`);
      await page.waitForLoadState('networkidle');
      await page.locator('text=Protein Hit').first().hover();
      await expect(
        page.locator(`text=High protein (${PROTEIN_HIT_ITEM.protein_g}g) · Under 500 cal`).first()
      ).toBeVisible();
    });

    test('[AC] Item with null calories shows no badges on detail screen', async ({ page }) => {
      await seedAuth(page);
      await setupItemDetailRoutes(page, NULL_CALORIES_ITEM);
      await page.goto(`/item/${NULL_CALORIES_ITEM.id}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Protein Hit')).toHaveCount(0);
      await expect(page.locator('text=Fiber Fuel')).toHaveCount(0);
    });
  });

  // ── Suite 6: Edge Cases — Threshold Boundary Values ─────────────────────────

  test.describe('Suite 6: Edge Cases — Threshold Boundary Values', () => {

    test('[Edge] protein=20g AND calories=499 → Protein Hit badge awarded (both thresholds met)', async ({ page }) => {
      await seedAuth(page);
      await setupBrowseRoutes(page, [EDGE_EXACT_THRESHOLD]);
      await searchBrowse(page);
      await expect(page.locator('text=Protein Hit').first()).toBeVisible();
    });

    test('[Edge] protein=19g AND calories=499 → no Protein Hit badge (protein threshold not met)', async ({ page }) => {
      await seedAuth(page);
      await setupBrowseRoutes(page, [EDGE_BELOW_PROTEIN]);
      await searchBrowse(page);
      await expect(page.locator('text=Protein Hit')).toHaveCount(0);
    });

    test('[Edge] calories=500 → no badges awarded (threshold is < 500, exclusive)', async ({ page }) => {
      await seedAuth(page);
      await setupBrowseRoutes(page, [EDGE_500_CAL]);
      await searchBrowse(page);
      await expect(page.locator('text=Protein Hit')).toHaveCount(0);
      await expect(page.locator('text=Fiber Fuel')).toHaveCount(0);
    });

    test('[Edge] Protein Hit tooltip includes exact gram value from the item data', async ({ page }) => {
      await seedAuth(page);
      await setupBrowseRoutes(page, [EDGE_EXACT_THRESHOLD]);
      await searchBrowse(page);
      await page.locator('text=Protein Hit').first().hover();
      // protein_g is exactly 20 — tooltip must read "High protein (20g) · Under 500 cal"
      await expect(
        page.locator('text=High protein (20g) · Under 500 cal').first()
      ).toBeVisible();
    });

    test('[Layout] no horizontal overflow on 375px mobile viewport with badges visible', async ({ page }) => {
      await seedAuth(page);
      await setupBrowseRoutes(page, [BOTH_BADGES_ITEM]);
      await page.setViewportSize({ width: 375, height: 812 });
      await searchBrowse(page);
      await expect(page.locator('text=Protein Hit').first()).toBeVisible();
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    });
  });
});
