/**
 * MANUAL QA REQUIRED — the following cannot be automated with Playwright:
 * - Profile loading skeleton: requires catching a precise timing window during the
 *   profile query; not reliably automatable without network throttling controls.
 * - AsyncStorage persistence across hard browser reloads: verify manually in
 *   Chrome DevTools → Application → Local Storage.
 * - Native Expo Go behavior on a physical device.
 * These will be presented to the product owner as manual steps in Step 6.
 */

import { expect, Page, test } from '@playwright/test';

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPABASE_PROJECT_REF = 'pzvkkskmhqwnmzttabcl';

// ─── Seed data ────────────────────────────────────────────────────────────────
// Covers all AC/use-case/edge-case scenarios:
//   Budget 500 → in-budget: Small Fries(230), McChicken(400), Large Fries(490), BK Chicken Jr.(450)
//              → over-limit (501–600): Big Mac(550), Whopper Jr.(570)
//              → excluded (>600):  Quarter Pounder(680), Whopper(660)
//              → excluded (null):  Shake No Data

const SEED_RESTAURANTS = [
  {
    osmId: 1001,
    canonicalName: "McDonald's",
    displayName: "McDonald's",
    latitude: 37.775,
    longitude: -122.419,
    address: '100 Market St, San Francisco, CA 94105',
    distanceMiles: 0.3,
  },
  {
    osmId: 1002,
    canonicalName: 'Burger King',
    displayName: 'Burger King',
    latitude: 37.776,
    longitude: -122.42,
    address: '200 Mission St, San Francisco, CA 94105',
    distanceMiles: 0.7,
  },
];

const SEED_MCDONALDS_ITEMS = [
  { id: 'mc-1', chain_name: "McDonald's", item_name: 'Small Fries',    category: 'Side',  calories: 230,  protein_g: 2,  fat_g: 11, carbs_g: 30, fiber_g: 2, sodium_mg: 160,  serving_size: null, notes: null, created_at: '2026-01-01' },
  { id: 'mc-2', chain_name: "McDonald's", item_name: 'McChicken',      category: 'Burger', calories: 400,  protein_g: 14, fat_g: 16, carbs_g: 41, fiber_g: 1, sodium_mg: 590,  serving_size: null, notes: null, created_at: '2026-01-01' },
  { id: 'mc-3', chain_name: "McDonald's", item_name: 'Large Fries',    category: 'Side',  calories: 490,  protein_g: 6,  fat_g: 23, carbs_g: 65, fiber_g: 6, sodium_mg: 400,  serving_size: null, notes: null, created_at: '2026-01-01' },
  { id: 'mc-4', chain_name: "McDonald's", item_name: 'Big Mac',        category: 'Burger', calories: 550,  protein_g: 25, fat_g: 30, carbs_g: 46, fiber_g: 3, sodium_mg: 1010, serving_size: null, notes: null, created_at: '2026-01-01' },
  { id: 'mc-5', chain_name: "McDonald's", item_name: 'Quarter Pounder',category: 'Burger', calories: 680,  protein_g: 30, fat_g: 38, carbs_g: 40, fiber_g: 2, sodium_mg: 1110, serving_size: null, notes: null, created_at: '2026-01-01' },
  { id: 'mc-6', chain_name: "McDonald's", item_name: 'Shake No Data',  category: 'Drink', calories: null, protein_g: null, fat_g: null, carbs_g: null, fiber_g: null, sodium_mg: null, serving_size: null, notes: null, created_at: '2026-01-01' },
];

const SEED_BK_ITEMS = [
  { id: 'bk-1', chain_name: 'Burger King', item_name: 'BK Chicken Jr.', category: 'Burger', calories: 450, protein_g: 16, fat_g: 28, carbs_g: 37, fiber_g: 1, sodium_mg: 790,  serving_size: null, notes: null, created_at: '2026-01-01' },
  { id: 'bk-2', chain_name: 'Burger King', item_name: 'Whopper Jr.',    category: 'Burger', calories: 570, protein_g: 22, fat_g: 32, carbs_g: 43, fiber_g: 2, sodium_mg: 930,  serving_size: null, notes: null, created_at: '2026-01-01' },
  { id: 'bk-3', chain_name: 'Burger King', item_name: 'Whopper',        category: 'Burger', calories: 660, protein_g: 28, fat_g: 40, carbs_g: 49, fiber_g: 2, sodium_mg: 980,  serving_size: null, notes: null, created_at: '2026-01-01' },
];

// ─── Setup helpers ────────────────────────────────────────────────────────────

async function setupRouteIntercepts(page: Page, calorieGoal: number | null = null) {
  // Intercept Supabase auth endpoints so the fake session is accepted
  await page.route('**/auth/v1/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/auth/v1/token')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'fake', token_type: 'bearer', expires_in: 3600 }),
      });
    } else if (url.includes('/auth/v1/user')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'test-user-id', email: 'test@example.com', aud: 'authenticated', role: 'authenticated' }),
      });
    } else {
      await route.continue();
    }
  });

  // Intercept the profiles table query — return mock profile with or without calorie goal
  await page.route('**/rest/v1/profiles**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'test-user-id',
        name: 'Test User',
        daily_calorie_goal: calorieGoal,
        profile_photo_url: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }),
    });
  });

  // Fallback: if menu_items somehow bypass the localStorage cache, return empty
  await page.route('**/rest/v1/menu_items**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
}

async function seedLocalStorage(
  page: Page,
  options: { includeLocation?: boolean } = {}
) {
  const { includeLocation = true } = options;
  const fetchedAt = Date.now() - 5_000; // 5 seconds ago — well within 24hr TTL

  await page.addInitScript(
    ({ projectRef, fetchedAt, restaurants, mcItems, bkItems, includeLocation }) => {
      // Mark the one-time menu cache wipe as already done so seeded menu data is not wiped
      localStorage.setItem('menu_cache_v2_cleared', '1');

      // Fake Supabase auth session — expires_at far in the future so no refresh attempt
      localStorage.setItem(
        `sb-${projectRef}-auth-token`,
        JSON.stringify({
          access_token: 'fake-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: 9999999999,
          refresh_token: 'fake-refresh-token',
          user: { id: 'test-user-id', email: 'test@example.com', aud: 'authenticated', role: 'authenticated' },
        })
      );

      if (includeLocation) {
        localStorage.setItem('last_search_params', JSON.stringify({ lat: 37.775, lng: -122.419, radiusMiles: 5 }));
        localStorage.setItem(
          'nearby_37.775_-122.419_5',
          JSON.stringify({ results: restaurants, fetchedAt })
        );
        localStorage.setItem("menu_McDonald's", JSON.stringify({ items: mcItems, fetchedAt }));
        localStorage.setItem('menu_Burger King', JSON.stringify({ items: bkItems, fetchedAt }));
      }
    },
    {
      projectRef: SUPABASE_PROJECT_REF,
      fetchedAt,
      restaurants: SEED_RESTAURANTS,
      mcItems: SEED_MCDONALDS_ITEMS,
      bkItems: SEED_BK_ITEMS,
      includeLocation,
    }
  );
}

// Enter a budget and wait for items to appear (handles the 300ms debounce)
async function enterBudgetAndWait(page: Page, budget: string, waitForText: string) {
  await page.locator('input').fill(budget);
  await page.waitForSelector(`text=${waitForText}`);
}

// ─── Test suite: standard flow (no profile calorie goal) ─────────────────────

test.describe('Budget Screen — Standard Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupRouteIntercepts(page, null);
    await seedLocalStorage(page);
    await page.goto('/budget');
    await page.waitForSelector('text=Calorie Budget');
    // Wait for data load + empty state to confirm screen is fully ready
    await page.waitForSelector("text=What can you get?");
  });

  // ── AC1: Input is optional — no error shown when empty ──────────────────────
  test('[AC1] calorie input renders and shows no error when empty', async ({ page }) => {
    await expect(page.locator('input')).toBeVisible();
    await expect(page.getByText(/error/i)).toHaveCount(0);
    await expect(page.getByText(/required/i)).toHaveCount(0);
  });

  // ── AC1 + Session Decision: empty input shows prompt, not all items ──────────
  test('[AC1+Session] empty input shows "What can you get?" prompt, not item results', async ({ page }) => {
    await expect(page.getByText("What can you get?")).toBeVisible();
    // No item names should be in the DOM when no budget is set
    await expect(page.getByText('Small Fries')).toHaveCount(0);
    await expect(page.getByText('McChicken')).toHaveCount(0);
  });

  // ── Location disclaimer ──────────────────────────────────────────────────────
  test('[Session] location disclaimer shows city name extracted from address', async ({ page }) => {
    await expect(page.getByText(/Showing results near San Francisco/)).toBeVisible();
  });

  // ── CachedDataBanner ────────────────────────────────────────────────────────
  test('[Session] CachedDataBanner is shown when serving cached results', async ({ page }) => {
    await expect(page.getByText(/Showing saved results/)).toBeVisible();
  });

  // ── AC7: Item cards show item name and calorie count ────────────────────────
  test('[AC7] item cards show item name and calorie count', async ({ page }) => {
    await enterBudgetAndWait(page, '500', "McDonald's");
    await page.getByText("McDonald's").click();
    await page.waitForSelector('text=Small Fries');
    await expect(page.getByText('Small Fries')).toBeVisible();
    await expect(page.getByText('230 cal')).toBeVisible();
    await expect(page.getByText('McChicken')).toBeVisible();
    await expect(page.getByText('400 cal')).toBeVisible();
  });

  // ── AC7: Item cards show initials circle ────────────────────────────────────
  test("[AC7] item cards show initials circle for chain (MC for McDonald's, BK for Burger King)", async ({ page }) => {
    await enterBudgetAndWait(page, '500', "McDonald's");
    await page.getByText("McDonald's").click();
    await page.waitForSelector('text=Small Fries');
    // "MC" = first two letters of "McDonalds" (apostrophe stripped, single word)
    await expect(page.getByText('MC').first()).toBeVisible();
    await page.getByText('Burger King').click();
    await page.waitForSelector('text=BK Chicken Jr.');
    // "BK" = initials of "Burger King"
    await expect(page.getByText('BK').first()).toBeVisible();
  });

  // ── AC4: In-budget items sorted by calories ascending ───────────────────────
  test('[AC4] in-budget McDonald\'s items are sorted by calories ascending', async ({ page }) => {
    await enterBudgetAndWait(page, '500', "McDonald's");
    await page.getByText("McDonald's").click();
    await page.waitForSelector('text=Small Fries');

    const smallFriesCal = page.getByText('230 cal');
    const mcChickenCal  = page.getByText('400 cal');
    const largeFriesCal = page.getByText('490 cal');

    const sfBox = await smallFriesCal.boundingBox();
    const mcBox = await mcChickenCal.boundingBox();
    const lfBox = await largeFriesCal.boundingBox();

    expect(sfBox).not.toBeNull();
    expect(mcBox).not.toBeNull();
    expect(lfBox).not.toBeNull();
    expect(sfBox!.y).toBeLessThan(mcBox!.y);
    expect(mcBox!.y).toBeLessThan(lfBox!.y);
  });

  // ── AC4: Restaurant groups sorted by distance ascending ─────────────────────
  test("[AC4] restaurant groups sorted by distance — McDonald's (0.3mi) before Burger King (0.7mi)", async ({ page }) => {
    await enterBudgetAndWait(page, '500', "McDonald's");

    // Section headers are visible even when accordion is collapsed
    const mcHeader = page.getByText("McDonald's").first();
    const bkHeader = page.getByText('Burger King').first();

    const mcBox = await mcHeader.boundingBox();
    const bkBox = await bkHeader.boundingBox();

    expect(mcBox).not.toBeNull();
    expect(bkBox).not.toBeNull();
    expect(mcBox!.y).toBeLessThan(bkBox!.y);
  });

  // ── AC5: "Just over your limit" section appears ──────────────────────────────
  test('[AC5] "Just Over Limit" tab appears when items exceed budget', async ({ page }) => {
    await enterBudgetAndWait(page, '500', "McDonald's");
    await expect(page.getByText(/Just Over Limit/)).toBeVisible();
  });

  // ── AC5: Over-limit items (501–600) appear below the section header ──────────
  test('[AC5] over-limit items appear in the "Just Over Limit" tab', async ({ page }) => {
    await enterBudgetAndWait(page, '500', "McDonald's");
    await page.getByText(/Just Over Limit/).click();
    await page.getByText("McDonald's").click();
    await page.waitForSelector('text=Big Mac');
    await expect(page.getByText('Big Mac')).toBeVisible();
    await page.getByText('Burger King').click();
    await page.waitForSelector('text=Whopper Jr.');
    await expect(page.getByText('Whopper Jr.')).toBeVisible();
  });

  // ── Ceiling: items more than 100 cal over budget are not shown ───────────────
  test('[Session] items more than 100 cal over budget (>budget+100) are not shown', async ({ page }) => {
    // budget=500, ceiling=600 → Quarter Pounder(680) and Whopper(660) excluded from both tabs
    await enterBudgetAndWait(page, '500', "McDonald's");
    await expect(page.getByText('Quarter Pounder')).toHaveCount(0);
    await expect(page.getByText('Whopper', { exact: true })).toHaveCount(0);
    await page.getByText(/Just Over Limit/).click();
    await expect(page.getByText('Quarter Pounder')).toHaveCount(0);
    await expect(page.getByText('Whopper', { exact: true })).toHaveCount(0);
  });

  // ── AC6: Items with null calories excluded ───────────────────────────────────
  test('[AC6] items with null calories do not appear anywhere in results', async ({ page }) => {
    await enterBudgetAndWait(page, '500', "McDonald's");
    await expect(page.getByText('Shake No Data')).toHaveCount(0);
    await expect(page.getByText('Calories unavailable')).toHaveCount(0);
    await page.getByText(/Just Over Limit/).click();
    await expect(page.getByText('Shake No Data')).toHaveCount(0);
  });

  // ── Edge case: item never appears in both sections ───────────────────────────
  test('[Edge] in-budget items do not appear in the Just Over Limit tab and vice versa', async ({ page }) => {
    await enterBudgetAndWait(page, '500', "McDonald's");
    // Switch to Just Over Limit — in-budget items must not appear here
    await page.getByText(/Just Over Limit/).click();
    await expect(page.getByText('Large Fries')).toHaveCount(0);
    await expect(page.getByText('BK Chicken Jr.')).toHaveCount(0);
    // Expand McDonald's to confirm Big Mac (550) is present in this tab
    await page.getByText("McDonald's").click();
    await page.waitForSelector('text=Big Mac');
    await expect(page.getByText('Big Mac')).toBeVisible();
    // Switch back to In Budget — Big Mac must not appear here
    await page.getByText(/In Budget/).click();
    await expect(page.getByText('Big Mac')).toHaveCount(0);
  });

  // ── AC3 + Session: clearing input restores the empty state prompt ────────────
  test('[AC3+Session] clearing the input restores the "What can you get?" prompt', async ({ page }) => {
    await enterBudgetAndWait(page, '500', "McDonald's");
    await expect(page.getByText("What can you get?")).toHaveCount(0);

    await page.locator('input').fill('');
    await page.waitForSelector("text=What can you get?");
    await expect(page.getByText("What can you get?")).toBeVisible();
    // Section headers and toggle must be gone when input is cleared
    await expect(page.getByText("McDonald's")).toHaveCount(0);
    await expect(page.getByText(/In Budget/)).toHaveCount(0);
  });

  // ── Edge: non-numeric input shows empty state, no crash ──────────────────────
  test('[Edge] non-numeric input shows empty state and does not crash', async ({ page }) => {
    await page.locator('input').fill('abc');
    await page.waitForSelector("text=What can you get?");
    await expect(page.getByText("What can you get?")).toBeVisible();
    await expect(page.getByText('Small Fries')).toHaveCount(0);
  });

  // ── Edge: budget that matches no items shows "Nothing fits" message ───────────
  test('[Edge] budget of 1 shows "Nothing fits this budget" empty state', async ({ page }) => {
    await page.locator('input').fill('1');
    await page.waitForSelector('text=Nothing fits this budget');
    await expect(page.getByText('Nothing fits this budget')).toBeVisible();
  });

  // ── Web layout: content is constrained at wide viewport ─────────────────────
  test('[Web] content is constrained to maxWidth at 768px+ viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await enterBudgetAndWait(page, '500', "McDonald's");

    // The input section should not stretch full 1280px — maxWidth 768 is applied
    const inputBox = await page.locator('input').boundingBox();
    expect(inputBox).not.toBeNull();
    expect(inputBox!.width).toBeLessThan(900); // Input is constrained, not spanning full viewport
  });

  // ── UI: Each restaurant appears exactly once ─────────────────────────────────
  test('[UI] each restaurant name appears exactly once in the active tab list', async ({ page }) => {
    await enterBudgetAndWait(page, '500', "McDonald's");
    await expect(page.getByText("McDonald's")).toHaveCount(1);
    await expect(page.getByText('Burger King')).toHaveCount(1);
  });

  // ── UI: Accordion resets and remains tappable after tab switch ───────────────
  test('[UI] accordion sections reset to collapsed after tab switch and remain tappable', async ({ page }) => {
    await enterBudgetAndWait(page, '500', "McDonald's");
    // Expand McDonald's in In Budget tab
    await page.getByText("McDonald's").click();
    await page.waitForSelector('text=Small Fries');
    await expect(page.getByText('Small Fries')).toBeVisible();
    // Switch to Just Over Limit and back — section must remount collapsed
    await page.getByText(/Just Over Limit/).click();
    await page.getByText(/In Budget/).click();
    await expect(page.getByText('Small Fries')).toHaveCount(0);
    // Section must still be tappable and expandable after remount
    await page.getByText("McDonald's").click();
    await page.waitForSelector('text=Small Fries');
    await expect(page.getByText('Small Fries')).toBeVisible();
  });
});

// ─── Test suite: no location seeded ──────────────────────────────────────────

test.describe('Budget Screen — No Location', () => {
  test.beforeEach(async ({ page }) => {
    await setupRouteIntercepts(page, null);
    await seedLocalStorage(page, { includeLocation: false });
    await page.goto('/budget');
    await page.waitForSelector('text=Calorie Budget');
    await page.waitForSelector('text=No location set');
  });

  // ── Edge: no last_search_params shows "No location set" ─────────────────────
  test('[Edge] no cached location shows "No location set" empty state', async ({ page }) => {
    await expect(page.getByText('No location set')).toBeVisible();
    // Location disclaimer should not appear
    await expect(page.getByText(/Showing results near/)).toHaveCount(0);
  });

  // ── Edge: input is still rendered when no location ───────────────────────────
  test('[Edge] input field still renders even when no location is set', async ({ page }) => {
    await expect(page.locator('input')).toBeVisible();
  });
});

// ─── Test suite: profile pre-fill (calorie goal = 2000) ──────────────────────

test.describe('Budget Screen — Profile Pre-fill', () => {
  test.beforeEach(async ({ page }) => {
    await setupRouteIntercepts(page, 2000);
    await seedLocalStorage(page);
    await page.goto('/budget');
    await page.waitForSelector('text=Calorie Budget');
    // With pre-fill, debouncedBudget=2000 immediately — all items fit, wait for results
    await page.waitForSelector("text=McDonald's");
  });

  // ── UC1 / AC2: input pre-populated with daily calorie goal ──────────────────
  test('[UC1/AC2] input is pre-populated with the profile daily calorie goal', async ({ page }) => {
    await expect(page.locator('input')).toHaveValue('2000');
  });

  // ── UC1: pre-fill disclaimer is visible ─────────────────────────────────────
  test('[UC1] pre-fill disclaimer text is visible below the input', async ({ page }) => {
    await expect(
      page.getByText('Pre-filled from your daily calorie goal · Edit anytime')
    ).toBeVisible();
  });

  // ── UC1 / AC3: editing pre-filled value hides the disclaimer ────────────────
  test('[UC1/AC3] editing the pre-filled value removes the pre-fill disclaimer', async ({ page }) => {
    await page.locator('input').fill('600');
    await expect(
      page.getByText('Pre-filled from your daily calorie goal · Edit anytime')
    ).toHaveCount(0);
  });

  // ── Edge: profile with null calorie goal — no disclaimer shown ───────────────
  // (Covered by the Standard Flow suite — input starts empty, no disclaimer)
});
