# QA Report — Issue #11: Calorie Filter Screen

**Branch:** `feat/issue-11-calorie-filter-screen`
**Date completed:** 2026-05-15
**Test file:** `tests/issue-11-calorie-filter.spec.ts`
**Final result:** 24/24 Playwright tests passed · All manual testing passed

---

## Feature Summary

The Calorie Budget screen allows users to enter a calorie limit and instantly see
nearby fast food items that fit within that budget. Key behaviors:

- Calorie input is optional — no error or blocking prompt if left empty
- If a daily calorie goal is set in the user's profile, the input is pre-populated
  with that value and a disclaimer is shown below the field
- Editing or clearing a pre-filled value removes the disclaimer
- Once a budget is entered, results appear in two toggle sections:
  - **In Budget** — items at or under the budget, sorted by calories ascending,
    grouped by restaurant, restaurants sorted by distance ascending
  - **Just Over Limit** — items between budget+1 and budget+100 calories, same
    grouping and sort order
- Items with null calories are excluded from both sections entirely
- Items more than 100 calories over budget are excluded entirely (not shown
  anywhere in results)
- Each restaurant group is a collapsible accordion — collapsed by default,
  expanded on tap
- Accordion sections reset to collapsed whenever the active tab changes
- A location disclaimer and CachedDataBanner appear when serving cached results
- If no location has been searched yet, a "No location set" empty state is shown
  with a prompt to use the Nearby tab
- On wide viewports (768px+), content is constrained to maxWidth 768

---

## UI Components Built This Feature

### BudgetRestaurantSection (accordion)
Each restaurant's results are wrapped in a collapsible accordion component
(`components/budget/BudgetRestaurantSection`). The section header shows the
restaurant name and an initials circle (first two letters of the chain name,
e.g. "MC" for McDonald's, "BK" for Burger King). Tapping the header expands or
collapses the item list. The accordion is collapsed by default.

The parent view containing all sections is keyed by `activeTab`, which causes
all accordion components to remount fresh (collapsed) every time the user
switches between the In Budget and Just Over Limit tabs. This is intentional —
it prevents stale expanded state from carrying across tab switches.

### BudgetItemCard
Each menu item inside an expanded accordion section is rendered by
`components/budget/BudgetItemCard`. The card displays the item name and calorie
count. Items with null calories are excluded upstream in the filter logic and
never reach this component.

### Toggle pills
Two pill-shaped tab buttons appear above the results once a budget is entered:
**In Budget (N)** and **Just Over Limit (N)**. Each shows a live count of items
in that section. The active pill is filled with Ketchup Red; the inactive pill
is outlined. Switching tabs remounts the accordion view (see above).

---

## Bugs Found and Fixed This Session

### Bug 1 — Cache corruption from progressive loading

**Introduced by:** A progressive loading change to `loadMenuItems` in
`app/(tabs)/budget.tsx`. The intent was to show skeleton rows while each chain's
menu items loaded, updating state incrementally as each cache hit or Supabase
response came back.

**Root cause:** The miss-handling code wrote the result for every chain regardless
of whether any items were returned:

```typescript
// Corrupted version — wrote empty arrays for any chain with no results
void setCachedMenuItems(name, byChain.get(name) ?? []);
```

If a chain name had no matching rows in Supabase (e.g. a name mismatch or a
chain not in the database), `byChain.get(name)` returned `undefined`, and the
`?? []` fallback wrote an empty array to AsyncStorage under that chain's cache
key. On the next visit, `getCachedMenuItems` returned the empty array as a valid
cache hit, so the chain appeared to have no menu items permanently — until the
24-hour TTL expired.

**Scope of corruption:** Unknown number of chain entries across all user sessions
that ran the progressive loading version.

**Fix — part 1 (safe cache writes):** Reverted `loadMenuItems` to the
collect-then-set pattern. The reverted version only calls `setCachedMenuItems`
when items actually exist:

```typescript
// Safe — only writes when items were actually returned
const items = byChain.get(name);
if (items && items.length > 0) void setCachedMenuItems(name, items);
```

Empty arrays are never written to the cache.

**Fix — part 2 (one-time cache wipe):** To flush any corrupted entries already
written to users' devices, a `wipeMenuCacheIfNeeded()` function was added to
`lib/cache/menuCache.ts`. It:
1. Checks AsyncStorage for a flag key `menu_cache_v2_cleared`
2. If the flag is absent: calls `clearAllMenuCacheEntries()` (wipes all keys
   starting with `menu_`) and sets the flag
3. If the flag is present: returns immediately (runs exactly once per device)

`wipeMenuCacheIfNeeded()` is called as the first line of `loadData` in
`budget.tsx`. It runs once on first app mount after the fix was deployed, clears
all corrupted entries, and never runs again.

**Files changed:**
- `lib/cache/menuCache.ts` — added `clearAllMenuCacheEntries()` and
  `wipeMenuCacheIfNeeded()`
- `app/(tabs)/budget.tsx` — reverted `loadMenuItems` to collect-then-set;
  added `wipeMenuCacheIfNeeded()` call at top of `loadData`; removed
  `loadingChains` state and skeleton rows

### Bug 2 — Progressive loading state removed entirely

The `loadingChains` state (a `Set<string>` tracking which chains were still
loading) was introduced alongside the progressive loading changes. After the
revert it had no purpose. It was removed completely — state declaration, all
`setLoadingChains` calls, and the skeleton rows in the render that iterated it.

### Bug 3 — Playwright tests wiping seeded menu data

**Symptom:** 16/24 tests failed with 30-second timeouts waiting for
`text=McDonald's` to appear. The 8 tests that passed were all tests that check
empty states and never expect results to render.

**Root cause:** Each Playwright test starts with a fresh browser context
(localStorage reset). The test's `seedLocalStorage` helper seeded
`menu_McDonald's` and `menu_Burger King` via `addInitScript`, but did not seed
the `menu_cache_v2_cleared` flag. When `loadData` ran, `wipeMenuCacheIfNeeded()`
found no flag, fired `clearAllMenuCacheEntries()`, and deleted the seeded menu
entries before `loadMenuItems` could read them.

`loadMenuItems` then found empty caches for both chains and fell through to
`fetchMenuItemsBatch`. The Supabase route intercept returned `[]` for all
`menu_items` requests (by design — tests are not supposed to hit the real DB).
Result: no items, no results, `McDonald's` never appeared in the DOM.

**Fix:** Added `localStorage.setItem('menu_cache_v2_cleared', '1')` inside the
`addInitScript` callback in `seedLocalStorage`. This tells the app the one-time
wipe has already run, so seeded menu data is never touched during tests.

**File changed:** `tests/issue-11-calorie-filter.spec.ts`

---

## What Was Confirmed Working (Manual Testing)

All items below were verified in the browser (Expo web) before running the
automated suite:

- Calorie input accepts numeric values; rejects non-numeric gracefully
- In Budget and Just Over Limit counts update live as the budget changes
- Accordion sections collapse and expand correctly on click
- Accordion resets to collapsed on tab switch
- Restaurant order matches distance ascending (closest first)
- Items within a section are sorted by calories ascending
- Items with null calories are absent from both tabs
- Items more than 100 cal over budget are absent from both tabs
- Budget of 1 shows "Nothing fits this budget"
- Clearing the input restores the "What can you get?" prompt
- Pre-fill from profile daily calorie goal populates correctly
- Pre-fill disclaimer appears and disappears correctly
- "No location set" empty state appears when no location has been searched
- Input renders even with no location set
- CachedDataBanner and location disclaimer visible when serving cached results
- Wide viewport (1280px) constrains content to maxWidth 768

---

## Playwright Test Results — Final Run

**Run date:** 2026-05-15
**Duration:** 24.1 seconds
**Browser:** Chromium

| # | Test | Result |
|---|------|--------|
| 1 | [AC1] calorie input renders and shows no error when empty | ✓ |
| 2 | [AC1+Session] empty input shows "What can you get?" prompt, not item results | ✓ |
| 3 | [Session] location disclaimer shows city name extracted from address | ✓ |
| 4 | [Session] CachedDataBanner is shown when serving cached results | ✓ |
| 5 | [AC7] item cards show item name and calorie count | ✓ |
| 6 | [AC7] item cards show initials circle for chain (MC / BK) | ✓ |
| 7 | [AC4] in-budget McDonald's items are sorted by calories ascending | ✓ |
| 8 | [AC4] restaurant groups sorted by distance — McDonald's before Burger King | ✓ |
| 9 | [AC5] "Just Over Limit" tab appears when items exceed budget | ✓ |
| 10 | [AC5] over-limit items appear in the "Just Over Limit" tab | ✓ |
| 11 | [Session] items more than 100 cal over budget (>budget+100) are not shown | ✓ |
| 12 | [AC6] items with null calories do not appear anywhere in results | ✓ |
| 13 | [Edge] in-budget items do not appear in the Just Over Limit tab and vice versa | ✓ |
| 14 | [AC3+Session] clearing the input restores the "What can you get?" prompt | ✓ |
| 15 | [Edge] non-numeric input shows empty state and does not crash | ✓ |
| 16 | [Edge] budget of 1 shows "Nothing fits this budget" empty state | ✓ |
| 17 | [Web] content is constrained to maxWidth at 768px+ viewport | ✓ |
| 18 | [UI] each restaurant name appears exactly once in the active tab list | ✓ |
| 19 | [UI] accordion sections reset to collapsed after tab switch and remain tappable | ✓ |
| 20 | [Edge] no cached location shows "No location set" empty state | ✓ |
| 21 | [Edge] input field still renders even when no location is set | ✓ |
| 22 | [UC1/AC2] input is pre-populated with the profile daily calorie goal | ✓ |
| 23 | [UC1] pre-fill disclaimer text is visible below the input | ✓ |
| 24 | [UC1/AC3] editing the pre-filled value removes the pre-fill disclaimer | ✓ |

**Total: 24 passed / 0 failed / 0 skipped**

---

## What Requires Manual QA (Not Automatable with Playwright)

- **Profile loading skeleton:** The skeleton shown while the profile query
  resolves requires catching a precise timing window. Not reliably automatable
  without network throttling controls. Confirmed working manually.
- **AsyncStorage persistence across hard browser reloads:** Verify in Chrome
  DevTools → Application → Local Storage that `last_search_params`,
  `nearby_*`, and `menu_*` keys survive a hard reload. Also verify
  `menu_cache_v2_cleared` is written after first mount.
- **Native Expo Go behavior on physical device:** All cache, location, and
  menu loading behavior should be verified on a real iOS or Android device via
  Expo Go before shipping.

---

## Files Changed This Feature

| File | Change |
|------|--------|
| `app/(tabs)/budget.tsx` | Main screen — calorie input, toggle pills, filter logic, accordion results, cache wipe guard |
| `components/budget/BudgetRestaurantSection.tsx` | Accordion component — header with initials circle, collapsible item list |
| `components/budget/BudgetItemCard.tsx` | Item card component rendered inside each expanded accordion section |
| `lib/cache/menuCache.ts` | Added `clearAllMenuCacheEntries()` and `wipeMenuCacheIfNeeded()` |
| `lib/cache/lastSearchParams.ts` | Utility for reading last search params from AsyncStorage |
| `lib/supabase/menuItems.ts` | Added `fetchMenuItemsBatch()` — batch Supabase query for menu items by chain name |
| `tests/issue-11-calorie-filter.spec.ts` | Full Playwright suite — 24 tests across 3 describe blocks |
