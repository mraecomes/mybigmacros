# QA Report — Issue #38: Browse Screen

**Date:** 2026-05-18
**Tester:** Claude Code (automated) + manual verification
**Branch:** feat/issue-38-browse-screen
**Test file:** `tests/issue-38-browse-screen.spec.ts`

---

## Automated Test Results

**37 / 37 tests passed**

| Suite | Tests | Result |
|-------|-------|--------|
| Suite 1: Default State | 7 | All pass |
| Suite 2: Category View | 6 | All pass |
| Suite 3: Pagination | 4 | All pass |
| Suite 4: Global Search | 11 | All pass |
| Suite 5: Category Search | 3 | All pass |
| Suite 6: Chain Navigation | 2 | All pass |
| Suite 7: No Broken States | 4 | All pass |

---

## What Was Tested (Automated)

### Suite 1 — Default State
- Browse screen heading visible on load
- Search bar visible and empty on load
- Category grid renders all 12 mock categories
- Category grid includes at least one food emoji
- A-Z chain list renders all chain names from mock data
- Chain list is sorted A-Z (Burger King before Wendy's)
- No error message shown on successful load

### Suite 2 — Category View
- Tapping a category card shows items for that category
- Calorie value is shown for each item row
- "Calories unavailable" shown for items with null calories
- Back navigation returns to the default view with the category grid
- Tapping an item row navigates to the item detail screen
- All 5 mock items are visible in category view

### Suite 3 — Pagination
- Next button is visible when total items exceeds page size (20)
- Clicking Next replaces visible items with page 2 content
- Clicking Prev after Next returns to page 1 content
- Prev button is absent or disabled on page 1

### Suite 4 — Global Search
- Fewer than 3 characters does not fire a Supabase item search
- 3+ characters triggers item search results after debounce
- Search results display item names
- Search results display calorie values
- Clearing the search field returns to the default view
- No results returns a helpful empty-state message
- Search is case-insensitive (uppercase query returns results)
- 3+ characters filters the chain list to matching names only
- "Calories unavailable" shown for null-calorie items in search results
- Item search results are paginated when total exceeds 20
- Supabase error shows a plain-English error message

### Suite 5 — Category Search
- 3+ characters in category view filters items within that category
- Category search returns all matching items with no Next button
- Clearing search restores paginated category items

### Suite 6 — Chain Navigation
- Tapping a chain row navigates to the restaurant detail screen
- Chain name with apostrophe (McDonald's) navigates correctly

### Suite 7 — No Broken States
- Categories API failure shows a plain-English error message
- Chains API failure shows a plain-English error message
- Category items API failure shows an error message in category view
- No horizontal overflow on 375px mobile viewport

---

## Manual QA Steps

The following should be verified manually in the browser before merging.

Open the app in the browser at `http://localhost:8081` and navigate to the Browse tab.

### Default State
- [ ] The "Browse" heading is visible
- [ ] The search bar is visible and empty
- [ ] The category grid shows cards with food emojis and category names
- [ ] The A-Z chain list shows restaurant names sorted alphabetically
- [ ] No error message or spinner is stuck on screen

### Category View
- [ ] Tap any category card — items for that category load below
- [ ] Each item row shows the item name and calorie count
- [ ] Tap the back button — the default view (category grid + chain list) returns
- [ ] Tap any item row — navigates to the item detail screen
- [ ] Navigate back and confirm the browse screen is intact

### Pagination
- [ ] Enter a category that has more than 20 items in production data
- [ ] Confirm a "Next" button appears at the bottom
- [ ] Tap "Next" — page 2 items replace page 1 items
- [ ] Tap "Prev" — page 1 items return
- [ ] On page 1, confirm "Prev" is absent or visually disabled

### Global Search
- [ ] Type 1-2 characters in the search bar — no search results should fire
- [ ] Type 3+ characters (e.g. "burger") — search results appear below after ~300ms
- [ ] Results show item names and calorie values
- [ ] Clear the search bar — category grid and chain list return
- [ ] Type a query with no matches — a helpful "no results" message appears
- [ ] Type in uppercase (e.g. "BURGER") — results still appear

### Category Search
- [ ] Tap a category to enter category view
- [ ] Type 3+ characters in the search bar — items filter within that category
- [ ] Clear the search bar — paginated category items return

### Chain Navigation
- [ ] Tap any chain row (e.g. "Burger King") — navigates to the restaurant screen
- [ ] Tap "McDonald's" — navigates correctly (apostrophe in the name)

### Error States
- [ ] (Requires network throttle or Supabase offline simulation) Verify error messages are in plain English, not raw API errors

### Layout
- [ ] Resize the browser to 375px width — no horizontal scroll bar appears

---

## Known Issues / Notes

- None. All 37 automated tests pass.
- Pagination page-2 detection in tests uses a request counter (not Range header inspection) because the `Range` request header is not reliably accessible in Playwright route handlers for web Fetch requests.

---

## Sign-off

- [x] Automated tests: 37/37 passed
- [ ] Manual QA: pending product owner review
- [ ] Ready to merge once manual QA is complete
