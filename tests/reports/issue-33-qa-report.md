# QA Report — Issue #33 — Chain logos (Brandfetch download + Supabase Storage + logo display)

**Date:** 2026-05-25
**Branch:** main
**Result:** PASSED

---

## Summary

| Category | Total | Passed | Failed | Manual |
|----------|-------|--------|--------|--------|
| Acceptance Criteria | 9 | 9 | 0 | 0 |
| Use Cases | 3 | 3 | 0 | 0 |
| Edge Cases | 6 | 6 | 0 | 0 |
| **Total** | **18 automated + 5 manual** | **23** | **0** | **0** |

---

## Acceptance Criteria

| # | Criterion | Result | Notes |
|---|-----------|--------|-------|
| 1 | `chains` table exists in Supabase with correct schema, including no-FK comment on `chain_name` | ✅ Pass | Verified via Supabase MCP — migration applied |
| 2 | `primary_category` column exists on `chains` and is populated by the download script | ✅ Pass | Verified via Supabase MCP — all 92 chain rows populated |
| 3 | `chain-logos` Supabase Storage bucket exists and is publicly readable | ✅ Pass | Verified via Supabase MCP — bucket created, public read policy applied |
| 4 | `BRANDFETCH_API_KEY` added to `.env.example`; `.env.local` confirmed in `.gitignore` | ✅ Pass | Both confirmed |
| 5 | Download script runs to completion without crashing, handles rate limits with retry/backoff, prints log of all chains with no logo | ✅ Pass | Script ran: 80/92 logos saved on first pass; 4 domain corrections applied manually; 8 chains accepted as emoji fallback |
| 6 | Logo images stored as PNG in Supabase Storage; `logo_url` populated in `chains` for every successfully downloaded chain | ✅ Pass | 84/92 chains have logo_url — verified via Supabase MCP |
| 7 | `constants/categoryEmoji.ts` exists with full mapping covering all 12 distinct `category` values in `menu_items` | ✅ Pass | Playwright Suite 4: file exists, all 12 categories mapped, DEFAULT_EMOJI exported |
| 8 | Every surface falls back to the category-mapped emoji when `logo_url` is null — never a broken image, never a gray box | ✅ Pass | Playwright Suite 3 (automated) + Manual step 4 (onError path with blocked Storage domain) |
| 9 | App runs without errors on Expo web (browser) after wire-in | ✅ Pass | Playwright Suite 1: all 3 smoke tests passed |

---

## Use Cases

| # | Use Case | Result | Notes |
|---|----------|--------|-------|
| 1 | Restaurant header shows chain logo when `logo_url` exists | ✅ Pass | Playwright test 4: img element present with Storage URL |
| 2 | Category emoji is not visible once logo loads — no simultaneous overlap | ✅ Pass | Playwright test 5: 🥤 emoji has count 0 after logo img becomes visible |
| 3 | Chain name is always visible alongside logo or emoji fallback | ✅ Pass | Playwright tests 6 and 11 |

---

## Edge Cases

| # | Edge Case | Result | Notes |
|---|-----------|--------|-------|
| 1 | Chain name with apostrophe in URL encodes and renders correctly | ✅ Pass | Playwright test 15: Applebee's routes and renders chain name |
| 2 | Chains API 500 error does not crash the restaurant screen — menu items still render | ✅ Pass | Playwright test 16 |
| 3 | Chains API PGRST116 (no row found) renders DEFAULT_EMOJI — no crash | ✅ Pass | Playwright test 17: 🍔 visible, Whopper visible |
| 4 | No horizontal overflow at 375px mobile viewport | ✅ Pass | Playwright test 18: scrollWidth ≤ clientWidth + 1 |
| 5 | Map pin initials circles always visible — no plain red circles | ✅ Pass | Manual step 2 |
| 6 | Logo async load swap (emoji → logo) with no simultaneous overlap | ✅ Pass | Manual step 3 (verified with Slow 3G throttle) |

---

## Manual QA Results

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | RestaurantCard logos in the Nearby list view | ✅ Pass | Logos appear for chains with logo_url; emoji fallback for chains without |
| 2 | Map pin initials circles (MapView.web.tsx) | ✅ Pass | All pins show 2-letter initials — no plain red circles |
| 3 | Logo async load swap — emoji → logo, never both at once | ✅ Pass | Swap confirmed with Slow 3G throttle; no simultaneous overlap |
| 4 | onError fallback — broken URL renders emoji, no gray box | ✅ Pass | Blocked Storage domain via DevTools; emoji rendered, no broken image icon |
| 5 | AsyncStorage chain data cache persists across page reload | ✅ Pass | `chain_` keys present in Local Storage after reload; logo rendered without fresh fetch |

---

## Playwright Report

Visual report with screenshots saved to:
`tests/reports/issue-33-playwright-report/`

---

## Security Notes

- Pre-existing vulnerabilities in `xlsx`, `brace-expansion`, `ws`, and `uuid` noted during `pnpm audit` — all 4 are transitive dependencies locked by Expo/Supabase. Tracked in Issue #46. No new vulnerabilities introduced by this issue.

---

## Not Tested

- Native Expo Go logo/emoji rendering on a physical iOS or Android device — deferred; EAS Development Client build required for native map testing.
- `RestaurantCard` and map pin logo display on native (`MapView.native.tsx`) — web-only surface for Issue #33 per pre-decided scope.

---

## Test File

`tests/issue-33-chain-logos.spec.ts`
