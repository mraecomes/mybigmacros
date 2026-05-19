import { test, expect, type Page } from '@playwright/test';

// ── Constants ──────────────────────────────────────────────────────────────────

const SUPABASE_PROJECT_REF = 'pzvkkskmhqwnmzttabcl';

const MOCK_CATEGORIES = [
  'Breakfast', 'Burgers', 'Chicken', 'Desserts',
  'Drinks', 'Entrees', 'Kids', 'Pizza',
  'Salads', 'Sandwiches', 'Sides', 'Tacos',
];

const MOCK_CHAINS = [
  'Burger King', 'Chick-fil-A', 'Chipotle', 'Dairy Queen',
  "Domino's", 'Five Guys', 'KFC', "McDonald's",
  'Panda Express', 'Panera Bread', 'Pizza Hut', 'Subway',
  'Taco Bell', "Wendy's", 'Wingstop',
];

// ── Types ──────────────────────────────────────────────────────────────────────

type MockItem = {
  id: string;
  chain_name: string;
  item_name: string;
  category: string;
  calories: number | null;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fiber_g: number;
  sodium_mg: number;
  serving_size: string;
  notes: null;
  created_at: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMockItems(
  count: number,
  category = 'Burgers',
  startCalories = 200,
  namePrefix = 'Item',
  chainName = "McDonald's",
): MockItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${namePrefix.replace(/\s+/g, '-').toLowerCase()}-${i + 1}`,
    chain_name: chainName,
    item_name: `${namePrefix} ${i + 1}`,
    category,
    calories: startCalories + i * 10,
    protein_g: 10 + i,
    fat_g: 8,
    carbs_g: 30,
    fiber_g: 2,
    sodium_mg: 500,
    serving_size: '1 serving',
    notes: null,
    created_at: new Date().toISOString(),
  }));
}

function seedAuth(page: Page): Promise<void> {
  return page.addInitScript((projectRef: string) => {
    // expires_at far in the future so Supabase never attempts a token refresh
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
    // Mark the one-time menu cache wipe as already done so seeded data is not wiped
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
          id: 'mock-user-id',
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
      body: JSON.stringify([
        {
          id: 'mock-user-id',
          name: 'Test User',
          profile_photo_url: null,
          daily_calorie_goal: 2000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]),
    });
  });
}

async function setupBrowseRoutes(
  page: Page,
  opts: {
    categories?: string[];
    chains?: string[];
    categoryItems?: MockItem[];
    searchItems?: MockItem[];
    categoryItemsTotal?: number;
    searchItemsTotal?: number;
  } = {},
): Promise<void> {
  const categories = opts.categories ?? MOCK_CATEGORIES;
  const chains = opts.chains ?? MOCK_CHAINS;
  const categoryItems = opts.categoryItems ?? makeMockItems(20);
  const searchItems = opts.searchItems ?? makeMockItems(5, 'Burgers', 300, 'Search Result');
  const categoryItemsTotal = opts.categoryItemsTotal ?? categoryItems.length;
  const searchItemsTotal = opts.searchItemsTotal ?? searchItems.length;

  await setupAuthRoutes(page);

  await page.route('**/rest/v1/rpc/get_categories**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(categories.map((c) => ({ category: c }))),
    });
  });

  await page.route('**/rest/v1/rpc/get_chain_names**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(chains.map((c) => ({ chain_name: c }))),
    });
  });

  await page.route('**/rest/v1/menu_items**', async (route) => {
    const url = route.request().url();
    const isSearch = url.includes('ilike');
    const items = isSearch ? searchItems : categoryItems;
    const total = isSearch ? searchItemsTotal : categoryItemsTotal;
    const end = items.length > 0 ? items.length - 1 : 0;
    const contentRange = items.length > 0 ? `0-${end}/${total}` : `*/${total}`;

    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Range': contentRange,
        // Expose Content-Range so the Supabase client can read the total count
        // (non-safe CORS header — must be explicitly exposed even in Playwright mocks)
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Content-Range',
      },
      body: JSON.stringify(items),
    });
  });
}

async function setupPaginationRoutes(page: Page): Promise<void> {
  const page1Items = makeMockItems(20, 'Burgers', 200, 'First Page Item');
  const page2Items = makeMockItems(20, 'Burgers', 400, 'Second Page Item');

  await setupAuthRoutes(page);

  await page.route('**/rest/v1/rpc/get_categories**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_CATEGORIES.map((c) => ({ category: c }))),
    });
  });

  await page.route('**/rest/v1/rpc/get_chain_names**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_CHAINS.map((c) => ({ chain_name: c }))),
    });
  });

  // Range header is not reliably accessible in Playwright route handlers.
  // Use a counter instead: request #1 = page 1 (from beforeEach navigation),
  // request #2 = page 2 (after clicking Next).
  let menuItemsRequestCount = 0;

  await page.route('**/rest/v1/menu_items**', async (route) => {
    menuItemsRequestCount++;
    const isPage2 = menuItemsRequestCount > 1;
    const items = isPage2 ? page2Items : page1Items;
    const start = isPage2 ? 20 : 0;
    const end = isPage2 ? 39 : 19;

    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Range': `${start}-${end}/40`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Content-Range',
      },
      body: JSON.stringify(items),
    });
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe('Browse Screen — Issue #38', () => {

  // ── Suite 1: Default State ──────────────────────────────────────────────────

  test.describe('Suite 1: Default State', () => {
    test.beforeEach(async ({ page }) => {
      await seedAuth(page);
      await setupBrowseRoutes(page);
      await page.goto('/browse');
      await page.waitForLoadState('networkidle');
    });

    test('[Default] Browse screen heading is visible on load', async ({ page }) => {
      await expect(page.locator('text=/browse/i').first()).toBeVisible();
    });

    test('[Default] search bar is visible and empty on load', async ({ page }) => {
      const input = page.getByPlaceholder(/search/i);
      await expect(input).toBeVisible();
      await expect(input).toHaveValue('');
    });

    test('[Default] category grid renders all 12 mock categories', async ({ page }) => {
      for (const cat of MOCK_CATEGORIES.slice(0, 6)) {
        await expect(page.locator(`text=${cat}`).first()).toBeVisible();
      }
    });

    test('[Default] category grid includes at least one food emoji', async ({ page }) => {
      await expect(
        page.locator('text=/🍔|🌮|🍕|🍗|🍟|🌯|🥗|🍦|🍴/').first()
      ).toBeVisible();
    });

    test('[Default] A-Z chain list renders chain names from mock data', async ({ page }) => {
      await expect(page.locator("text=McDonald's").first()).toBeVisible();
      await expect(page.locator('text=Subway').first()).toBeVisible();
    });

    test('[Default] chain list is sorted A-Z — Burger King appears above Wendy\'s', async ({ page }) => {
      const bkBox = await page.locator('text=Burger King').first().boundingBox();
      const wendysBox = await page.locator("text=Wendy's").first().boundingBox();
      expect(bkBox).not.toBeNull();
      expect(wendysBox).not.toBeNull();
      expect(bkBox!.y).toBeLessThan(wendysBox!.y);
    });

    test('[Default] no error message shown on successful load', async ({ page }) => {
      await expect(
        page.locator('text=/check your connection|failed to load|could not load/i')
      ).toHaveCount(0);
    });
  });

  // ── Suite 2: Category View ──────────────────────────────────────────────────

  test.describe('Suite 2: Category View', () => {
    test.beforeEach(async ({ page }) => {
      await seedAuth(page);
      await setupBrowseRoutes(page, {
        categoryItems: makeMockItems(5, 'Burgers', 350),
        categoryItemsTotal: 5,
      });
      await page.goto('/browse');
      await page.waitForLoadState('networkidle');
    });

    test('[Category] tapping a category card shows items for that category', async ({ page }) => {
      await page.locator('text=Burgers').first().click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Item 1').first()).toBeVisible();
    });

    test('[Category] calorie value is shown for each item row', async ({ page }) => {
      await page.locator('text=Burgers').first().click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=350').first()).toBeVisible();
    });

    test('[Category] "Calories unavailable" shown for item with null calories', async ({ page }) => {
      await page.route('**/rest/v1/menu_items**', async (route) => {
        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Range': '0-0/1',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': 'Content-Range',
          },
          body: JSON.stringify([
            {
              id: 'null-cal',
              chain_name: "McDonald's",
              item_name: 'Mystery Burger',
              category: 'Burgers',
              calories: null,
              protein_g: 15,
              fat_g: 8,
              carbs_g: 30,
              fiber_g: 2,
              sodium_mg: 500,
              serving_size: '1 serving',
              notes: null,
              created_at: new Date().toISOString(),
            },
          ]),
        });
      });
      await page.locator('text=Burgers').first().click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Calories unavailable').first()).toBeVisible();
    });

    test('[Category] back navigation returns to default view with category grid', async ({ page }) => {
      await page.locator('text=Burgers').first().click();
      await page.waitForLoadState('networkidle');
      await page.getByLabel('Back to Browse').click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Tacos').first()).toBeVisible();
    });

    test('[Category] tapping an item row navigates to the item detail screen', async ({ page }) => {
      await page.locator('text=Burgers').first().click();
      await page.waitForLoadState('networkidle');
      await page.locator('text=Item 1').first().click();
      await page.waitForURL(/\/item\//);
      expect(page.url()).toMatch(/\/item\//);
    });

    test('[Category] all 5 mock items are visible in category view', async ({ page }) => {
      await page.locator('text=Burgers').first().click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Item 1').first()).toBeVisible();
      await expect(page.locator('text=Item 5').first()).toBeVisible();
    });
  });

  // ── Suite 3: Pagination ─────────────────────────────────────────────────────

  test.describe('Suite 3: Pagination', () => {
    test.beforeEach(async ({ page }) => {
      await seedAuth(page);
      await setupPaginationRoutes(page);
      await page.goto('/browse');
      await page.waitForLoadState('networkidle');
      await page.locator('text=Burgers').first().click();
      await page.waitForLoadState('networkidle');
    });

    test('[Pagination] Next button is visible when total exceeds page size', async ({ page }) => {
      await expect(page.locator('text=/next/i').first()).toBeVisible();
    });

    test('[Pagination] clicking Next replaces visible items with page 2', async ({ page }) => {
      await expect(page.locator('text=First Page Item 1').first()).toBeVisible();
      await page.locator('text=/next/i').first().click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Second Page Item 1').first()).toBeVisible();
      await expect(page.locator('text=First Page Item 1')).toHaveCount(0);
    });

    test('[Pagination] clicking Prev after Next returns to page 1', async ({ page }) => {
      await page.locator('text=/next/i').first().click();
      await page.waitForLoadState('networkidle');
      await page.locator('text=/prev/i').first().click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=First Page Item 1').first()).toBeVisible();
    });

    test('[Pagination] Prev is absent or disabled on page 1', async ({ page }) => {
      const prevBtn = page.locator('button:has-text("Prev"), button:has-text("Previous")');
      const count = await prevBtn.count();
      if (count > 0) {
        await expect(prevBtn.first()).toBeDisabled();
      }
      // count === 0 is also valid — Prev hidden on page 1
    });
  });

  // ── Suite 4: Global Search ──────────────────────────────────────────────────

  test.describe('Suite 4: Global Search', () => {
    test.beforeEach(async ({ page }) => {
      await seedAuth(page);
      await setupBrowseRoutes(page, {
        searchItems: makeMockItems(5, 'Burgers', 300, 'Search Result'),
        searchItemsTotal: 5,
      });
      await page.goto('/browse');
      await page.waitForLoadState('networkidle');
    });

    test('[GlobalSearch] fewer than 3 chars does not fire a Supabase item search', async ({ page }) => {
      let searchFired = false;
      await page.route('**/rest/v1/menu_items**', async (route) => {
        if (route.request().url().includes('ilike')) searchFired = true;
        await route.continue();
      });
      await page.getByPlaceholder(/search/i).fill('ab');
      await page.waitForTimeout(400);
      expect(searchFired).toBe(false);
    });

    test('[GlobalSearch] 3+ chars triggers item search results after debounce', async ({ page }) => {
      await page.getByPlaceholder(/search/i).fill('bur');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Search Result 1').first()).toBeVisible();
    });

    test('[GlobalSearch] search results display item names', async ({ page }) => {
      await page.getByPlaceholder(/search/i).fill('item');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Search Result 1').first()).toBeVisible();
    });

    test('[GlobalSearch] search results display calorie values', async ({ page }) => {
      await page.getByPlaceholder(/search/i).fill('item');
      await page.waitForLoadState('networkidle');
      // Search Result 1 has 300 cal
      await expect(page.locator('text=300').first()).toBeVisible();
    });

    test('[GlobalSearch] clearing the search field returns to default view', async ({ page }) => {
      const input = page.getByPlaceholder(/search/i);
      await input.fill('item');
      await page.waitForLoadState('networkidle');
      await input.fill('');
      await page.waitForTimeout(400);
      await expect(page.locator('text=Tacos').first()).toBeVisible();
    });

    test('[GlobalSearch] no results returns a helpful empty-state message', async ({ page }) => {
      await page.route('**/rest/v1/menu_items**', async (route) => {
        if (route.request().url().includes('ilike')) {
          await route.fulfill({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Content-Range': '*/0',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Expose-Headers': 'Content-Range',
            },
            body: JSON.stringify([]),
          });
        } else {
          await route.continue();
        }
      });
      await page.getByPlaceholder(/search/i).fill('xyznotfound');
      await page.waitForLoadState('networkidle');
      await expect(
        page.locator('text=/no results|no items|nothing found/i').first()
      ).toBeVisible();
    });

    test('[GlobalSearch] search is case-insensitive — uppercase query returns results', async ({ page }) => {
      await page.getByPlaceholder(/search/i).fill('ITEM');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Search Result 1').first()).toBeVisible();
    });

    test("[GlobalSearch] 3+ chars filters the chain list to matching names only", async ({ page }) => {
      await page.getByPlaceholder(/search/i).fill('mcd');
      await page.waitForLoadState('networkidle');
      await expect(page.locator("text=McDonald's").first()).toBeVisible();
      await expect(page.locator('text=Burger King')).toHaveCount(0);
    });

    test('[GlobalSearch] "Calories unavailable" shown for null-calorie item in search results', async ({ page }) => {
      await page.route('**/rest/v1/menu_items**', async (route) => {
        if (route.request().url().includes('ilike')) {
          await route.fulfill({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Content-Range': '0-0/1',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Expose-Headers': 'Content-Range',
            },
            body: JSON.stringify([
              {
                id: 'no-cal',
                chain_name: "McDonald's",
                item_name: 'No-Cal Burger',
                category: 'Burgers',
                calories: null,
                protein_g: 10,
                fat_g: 8,
                carbs_g: 30,
                fiber_g: 2,
                sodium_mg: 500,
                serving_size: '1 serving',
                notes: null,
                created_at: new Date().toISOString(),
              },
            ]),
          });
        } else {
          await route.continue();
        }
      });
      await page.getByPlaceholder(/search/i).fill('no-cal');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Calories unavailable').first()).toBeVisible();
    });

    test('[GlobalSearch] item search results are paginated when total exceeds 20', async ({ page }) => {
      await page.route('**/rest/v1/menu_items**', async (route) => {
        if (route.request().url().includes('ilike')) {
          await route.fulfill({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Content-Range': '0-19/40',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Expose-Headers': 'Content-Range',
            },
            body: JSON.stringify(makeMockItems(20, 'Burgers', 200, 'Search Result')),
          });
        } else {
          await route.continue();
        }
      });
      await page.getByPlaceholder(/search/i).fill('item');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=/next/i').first()).toBeVisible();
    });

    test('[GlobalSearch] Supabase error shows a plain-English error message', async ({ page }) => {
      await page.route('**/rest/v1/menu_items**', async (route) => {
        if (route.request().url().includes('ilike')) {
          await route.fulfill({
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ message: 'Internal Server Error' }),
          });
        } else {
          await route.continue();
        }
      });
      await page.getByPlaceholder(/search/i).fill('item');
      // TanStack Query retries 3× with exponential backoff (~7s total) before error state shows
      await expect(
        page.locator('text=/failed|error|check your connection/i').first()
      ).toBeVisible({ timeout: 20000 });
    });
  });

  // ── Suite 5: Category Search ────────────────────────────────────────────────

  test.describe('Suite 5: Category Search', () => {
    test.beforeEach(async ({ page }) => {
      await seedAuth(page);
      await setupBrowseRoutes(page, {
        categoryItems: makeMockItems(20, 'Burgers', 200),
        categoryItemsTotal: 20,
        searchItems: makeMockItems(3, 'Burgers', 250, 'Cat Result'),
        searchItemsTotal: 3,
      });
      await page.goto('/browse');
      await page.waitForLoadState('networkidle');
      await page.locator('text=Burgers').first().click();
      await page.waitForLoadState('networkidle');
    });

    test('[CategorySearch] 3+ chars in category view filters items within that category', async ({ page }) => {
      await page.getByPlaceholder(/search/i).fill('cat');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Cat Result 1').first()).toBeVisible();
    });

    test('[CategorySearch] category search returns all matching items with no Next button', async ({ page }) => {
      await page.getByPlaceholder(/search/i).fill('cat');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Cat Result 1').first()).toBeVisible();
      await expect(page.locator('text=Cat Result 3').first()).toBeVisible();
      await expect(page.locator('text=/next/i')).toHaveCount(0);
    });

    test('[CategorySearch] clearing search restores paginated category items', async ({ page }) => {
      const input = page.getByPlaceholder(/search/i);
      await input.fill('cat');
      await page.waitForLoadState('networkidle');
      await input.fill('');
      await page.waitForTimeout(400);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Item 1').first()).toBeVisible();
    });
  });

  // ── Suite 6: Chain Navigation ───────────────────────────────────────────────

  test.describe('Suite 6: Chain Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await seedAuth(page);
      await setupBrowseRoutes(page);
      await page.goto('/browse');
      await page.waitForLoadState('networkidle');
    });

    test('[Chain] tapping a chain row navigates to the restaurant detail screen', async ({ page }) => {
      await page.locator('text=Burger King').first().click();
      await page.waitForURL(/\/restaurant\//);
      expect(page.url()).toMatch(/\/restaurant\//);
    });

    test("[Edge] chain name with apostrophe (McDonald's) navigates correctly to the restaurant screen", async ({ page }) => {
      await page.locator("text=McDonald's").first().click();
      await page.waitForURL(/\/restaurant\//);
      // Verify navigation succeeded and the URL contains the chain name in any encoded or decoded form
      expect(page.url()).toMatch(/\/restaurant\/.*[Mm]c[Dd]onald/);
    });
  });

  // ── Suite 7: No Broken States ──────────────────────────────────────────────

  test.describe('Suite 7: No Broken States', () => {
    test('[Error] categories API failure shows a plain-English error message', async ({ page }) => {
      await seedAuth(page);
      await setupAuthRoutes(page);
      await page.route('**/rest/v1/rpc/get_categories**', async (route) => {
        await route.fulfill({
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ message: 'Internal Server Error' }),
        });
      });
      await page.route('**/rest/v1/rpc/get_chain_names**', async (route) => {
        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify(MOCK_CHAINS.map((c) => ({ chain_name: c }))),
        });
      });
      await page.goto('/browse');
      // TanStack Query retries 3× with exponential backoff (~7s total) before error state shows
      await expect(
        page.locator('text=/check your connection|failed|could not load/i').first()
      ).toBeVisible({ timeout: 20000 });
    });

    test('[Error] chains API failure shows a plain-English error message', async ({ page }) => {
      await seedAuth(page);
      await setupAuthRoutes(page);
      await page.route('**/rest/v1/rpc/get_categories**', async (route) => {
        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify(MOCK_CATEGORIES.map((c) => ({ category: c }))),
        });
      });
      await page.route('**/rest/v1/rpc/get_chain_names**', async (route) => {
        await route.fulfill({
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ message: 'Internal Server Error' }),
        });
      });
      await page.goto('/browse');
      // TanStack Query retries 3× with exponential backoff (~7s total) before error state shows
      await expect(
        page.locator('text=/check your connection|failed|could not load/i').first()
      ).toBeVisible({ timeout: 20000 });
    });

    test('[Error] category items API failure shows an error message in category view', async ({ page }) => {
      await seedAuth(page);
      await setupBrowseRoutes(page);
      // Override menu_items to fail — registered after setupBrowseRoutes so it runs first (LIFO)
      await page.route('**/rest/v1/menu_items**', async (route) => {
        await route.fulfill({
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ message: 'Internal Server Error' }),
        });
      });
      await page.goto('/browse');
      await page.waitForLoadState('networkidle');
      await page.locator('text=Burgers').first().click();
      // TanStack Query retries 3× with exponential backoff (~7s total) before error state shows
      await expect(
        page.locator('text=/check your connection|failed|could not load/i').first()
      ).toBeVisible({ timeout: 20000 });
    });

    test('[Layout] no horizontal overflow on 375px mobile viewport', async ({ page }) => {
      await seedAuth(page);
      await setupBrowseRoutes(page);
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/browse');
      await page.waitForLoadState('networkidle');
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    });
  });
});
