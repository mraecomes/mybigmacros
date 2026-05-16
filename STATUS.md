# STATUS.md — myBigMACros

> This is the first file to read at the start of every coding session.
> It tells you exactly where the project stands right now.
> Update it at the start and end of every session.

---

## Current Status

**Build Phase:** MVP — Issue #11 Complete
**Last Updated:** May 15 2026
**Last Session:** Issue #11 — Calorie filter screen: built budget.tsx (calorie input with profile pre-fill, In Budget / Just Over Limit toggle tabs, accordion results via BudgetRestaurantSection + BudgetItemCard), fetchMenuItemsBatch() batch Supabase query, one-time cache wipe guard (wipeMenuCacheIfNeeded) to flush corruption from a progressive loading attempt, Playwright config + 24-test suite (24/24 passed). PR #44 merged to main.
**Next Session Goal:** Issue #12 — Badge system (Protein Hit + Fiber Fuel)

---

## Pre-Build Tasks (Must Complete Before MVP Features)

These happen after project setup. Nothing in the MVP feature build starts until all three are done.

| Task | Status | Notes |
|------|--------|-------|
| Mapbox compatibility check (Expo managed workflow + web rendering) | ✅ Complete | @rnmapbox/maps v10 (native, EAS Build required) + mapbox-gl v3 (web). Metro file extension split (.native.tsx / .web.tsx). Dark map verified on web. |
| MenuStat data prep + Supabase import (Node.js script) | ✅ Complete | 26,237 rows imported. Node.js + xlsx script. profiles + menu_items migrations applied. Null handling and RLS verified via Supabase MCP. |
| OSM → MenuStat alias table + Fuse.js fallback | ✅ Complete | 172 aliases, 46 chains. Fuse.js threshold 0.3. get_chain_names() SQL function to bypass PostgREST row limit. 14/14 unit tests + 15/15 Overpass integration test passing. |

---

## MVP Progress

| Feature | Status | Notes |
|---------|--------|-------|
| CLAUDE.md created | ✅ Complete | |
| Project setup (Expo + TypeScript + NativeWind + Supabase) | ✅ Complete | |
| Centralized theme.ts (Electric Diner palette) | ✅ Complete | Full design token system: colors, typography (Bungee/Inter), spacing, radii. 5 UI primitives in components/ui/. NativeWind wired. |
| Authentication — sign up | ✅ Complete | Email + password, strength bar, confirm match indicator, email confirmation card |
| Authentication — login / logout | ✅ Complete | Single error message (no email enumeration), loading state, sign out from profile screen |
| Authentication — password reset | ✅ Complete | Reset email flow + update-password screen, PASSWORD_RECOVERY intercept via module-level listener |
| Authentication — delete account | ✅ Complete | Two-tap confirm card, delete_user() RPC with SECURITY DEFINER |
| Onboarding flow (name → photo → calorie goal) | ✅ Complete | 3-step with dot indicator, photo optional, calorie goal optional |
| User profile screen | ✅ Complete | Inline editing, photo upload/remove with cache-busting, calorie goal prompt, delete account |
| Navigation (bottom tabs mobile / top nav web) | ✅ Complete | TopNav.tsx (web, hamburger at 768px), platform-split layout, web.output: 'single', white-screen loading fix. processLock removed (Issue #9) — Supabase navigatorLock handles web locking with steal-recovery |
| Restaurant locator — geolocation + zip fallback | ✅ Complete | Device geolocation on mount (web + native); inline edit mode auto-opens when denied or via "Change" button. Mapbox Geocoding API for address → coords |
| Restaurant locator — Overpass API query | ✅ Complete | amenity=fast_food + amenity=restaurant within chosen radius (1/5/10/25 mi). Chain matching via chainMatcher.ts; unmatched silently excluded. Two-pass coordinate deduplication |
| Restaurant locator — map view (Mapbox) | ✅ Complete | dark-v11 style, initials circle pins, cyan user location dot, radius fill + border ring. Pin preview card with smart edge-aware repositioning. Chain logos deferred |
| Restaurant locator — list view | ✅ Complete | Chain name as text, distance in Ketchup Red, address in secondary, chevron. Sorted by distance ascending. RestaurantCard.tsx |
| Nutrition browser — restaurant menu screen | ✅ Complete | SectionList by category, search with stable focus (React.memo + fixed tree), skeleton, error, empty state, 24hr cache |
| Nutrition browser — item detail screen | ✅ Complete | Full nutrition panel, serving size, badge display, back navigation |
| Missing data display rules | ✅ Complete | "Calories unavailable" when null, "—" for all missing macros. Badge ineligibility for missing protein/fiber |
| Macro-Meter visualization (React Native SVG) | ✅ Complete | item/[id].tsx |
| Calorie filter — input + results screen | ✅ Complete | Optional budget input with profile pre-fill, In Budget / Just Over Limit toggle pills with live counts, accordion results (BudgetRestaurantSection) grouped by restaurant sorted by distance, items sorted by calories ascending |
| Calorie filter — "Just over your limit" section | ✅ Complete | Items budget+1 to budget+100 shown in dimmed "Just Over Limit" tab; items >100 over budget excluded from both tabs |
| Badge system — Protein Hit | ⬜ Not started | ≥20g protein AND <500 cal, Mustard Gold |
| Badge system — Fiber Fuel | ⬜ Not started | ≥5g fiber AND <500 cal, Muted Sage Green |
| Badge tooltips (tap/hover) | ⬜ Not started | |
| Menu item images — logo + emoji fallback | ⬜ Not started | Chain logos deferred; see Upcoming Decisions for Brandfetch plan |
| Chain logos (Brandfetch + Supabase Storage + logo display) | ⬜ Not started | Issue #13 — chains table, primary_category fallback logic, download script, wire into map pins + RestaurantCard + menu screen header |
| AsyncStorage caching (nutrition + location data) | ✅ Complete | Location results cached (24hr TTL, key = lat/lng/radius). Menu items cached (24hr TTL, key = chain name). Both show CachedDataBanner |
| "Using cached data" banner | ✅ Complete | CachedDataBanner.tsx shows "Showing saved results · Updated Xm ago" |
| Core loop validated on Expo Go (mobile) | ⬜ Not started | |
| Core loop validated on Expo web (browser) | ⬜ Not started | |
| Vercel deploy — live portfolio URL | ✅ Complete | mybigmacros.vercel.app — auto-deploys from main |
| Data persistence (Supabase) | ⬜ Not started | |

**Legend:** ⬜ Not started · 🔄 In progress · ✅ Complete · 🚫 Blocked

---

## v1 Progress (Do Not Start Until MVP Is Complete)

| Feature | Status | Notes |
|---------|--------|-------|
| Macro filters (protein, fat, carbs, fiber) | ⬜ Not started | |
| Calorie Mode / Macro Mode toggle | ⬜ Not started | |
| Apple Health (HealthKit) integration | ⬜ Not started | Confirm RN integration path before starting |
| Cronometer integration | ⬜ Not started | Requires API access approval — confirm first |
| Lose It! integration | ⬜ Not started | Requires API access approval — confirm first |
| Google Fit integration | ⬜ Not started | |
| Healthy options toggle (filter screen, off by default) | ⬜ Not started | |
| Improved map — cluster pins | ⬜ Not started | |
| Improved map — pin preview card | ⬜ Not started | |
| Real food photos — top 50–100 items (Supabase Storage) | ⬜ Not started | |

---

## v2 Progress (Do Not Start Until v1 Is Complete)

| Feature | Status | Notes |
|---------|--------|-------|
| Favorite restaurants | ⬜ Not started | |
| Favorite menu items / "My Usuals" | ⬜ Not started | |
| Order history / meal log | ⬜ Not started | |
| Smart suggestions | ⬜ Not started | |
| Calorie budget auto-calculation from tracker | ⬜ Not started | |
| Push notifications (Expo Notifications) | ⬜ Not started | |

---

## v3 Progress (Do Not Start Until v2 Is Complete)

| Feature | Status | Notes |
|---------|--------|-------|
| Cheat meal sharing (shareable card) | ⬜ Not started | |
| User reviews + ratings | ⬜ Not started | |
| Gamification badges | ⬜ Not started | |
| Friends / following | ⬜ Not started | |

---

## Current Blockers

- **Issue #39 — Navigator Lock contention in nearby.tsx restaurant queryFn** — Supabase calls inside a TanStack Query queryFn are blocked by the Web Locks API after a manual location change. nearby.tsx restaurant fetch reverted to useState/useEffect. Investigation notes in Issue #39.

---

## Open Questions

- ✅ Supabase project URL and keys confirmed in `.env.local`
- ✅ Mapbox access token confirmed in `.env.local`
- ✅ Vercel project name decided and live — mybigmacros.vercel.app
- ✅ App display name decided — myBigMACros (set in app.config.ts)
- ✅ Node.js confirmed: v25.9.0
- ✅ pnpm confirmed: v10.33.0
- Confirm Apple Developer account status before TestFlight distribution (not urgent — deferred)
- Confirm API access for Cronometer and Lose It! before committing to v1 tracker integrations
- [ ] Flip GitHub repo from private to public when ready to share with hiring managers — go to GitHub Settings → Danger Zone → Change visibility. Confirm .env.local was never committed first.

---

## Upcoming Decisions

| Decision | Needed By | Notes |
|----------|-----------|-------|
| Mapbox implementation path (RN SDK vs react-native-maps + style layer) | Pre-build task #1 | Claude Code resolves this first |
| Chain logos | Issue #13 | Scoped and created — chains table, Brandfetch download script, logo wire-in across all surfaces |
| Apple HealthKit integration approach | v1 | Confirm React Native path before building |
| Cronometer / Lose It! API access | v1 | Treat as stretch goals until access confirmed |
| Notification email template design | v2 | Should match Electric Diner design direction |
| Social sharing card design | v3 | Branded graphic with macro breakdown |
| GitHub visibility → public | When ready to share with hiring managers | GitHub → Settings → Danger Zone → Change visibility. Confirm .env.local was never committed first. See GitHub Visibility section in CLAUDE.md for full checklist. |

---

## Recently Completed

- ✅ Issue #11 — Calorie filter screen: budget.tsx (calorie input, profile pre-fill, In Budget / Just Over Limit toggle tabs, accordion results via BudgetRestaurantSection + BudgetItemCard), fetchMenuItemsBatch() batch Supabase query, wipeMenuCacheIfNeeded() one-time cache flush, Playwright config + 24-test suite (24/24 passed). PR #44 merged.
- ✅ Issue #10 — Macro-Meter: MacroMeter.tsx (React Native SVG) with full-circle calorie arc (Ketchup Red, % of daily goal, label uncapped), protein + fiber semicircle arcs (Electric Mint, FDA DV reference, fiber at 55% opacity), DV tooltips (hover web / tap mobile, column-aware anchor side), full missing-data states ("Calories unavailable", fixed-width "Not available" columns), profile daily_calorie_goal via shared TanStack Query cache. react-native-svg@15.12.1 installed. PR #42 merged.
- ✅ Issue #37 — TanStack Query migration: profile.tsx, restaurant/[id].tsx, item/[id].tsx migrated to useQuery. nearbyChains.ts refactored to accept aliasMap + canonicalNames as params (eliminates 200+ parallel Supabase calls). nearby.tsx geo query on useQuery with locationStatus guard + 30min staleTime. nearby.tsx restaurant fetch reverted — Navigator Lock contention (Issue #39). PR #40 open
- ✅ Issue #9 — Nutrition browser: restaurant menu screen (SectionList by category, search with stable React.memo focus, skeleton/error/empty states, AsyncStorage 24hr cache + CachedDataBanner), item detail screen (full nutrition panel, missing data rules, badge display), processLock removed and replaced with Supabase navigatorLock (idle-session deadlock fix), TOKEN_REFRESHED functional updater, visibilitychange listeners (layout + profile), Profile screen error state + retry button, QueryClient defaultOptions
- ✅ Issue #8 — Restaurant locator: device geolocation (web + native) with inline zip/city fallback, Overpass API (fast_food + restaurant amenities) + chainMatcher.ts pipeline, Mapbox web map (dark-v11, initials pins, user location dot, radius ring), responsive split layout (60/40 wide / stacked narrow), pin preview card with edge-aware repositioning, RestaurantCard list sorted by distance, AsyncStorage 24hr cache + CachedDataBanner, inline location edit with Electric Mint focus ring
- ✅ Issue #7 — Navigation structure: TopNav.tsx web top nav with hamburger collapse, platform-split tab layout (TopNav on web / native tab bar on mobile), app.config.ts web.output changed to 'single' for SPA routing. Fixed: white screen on direct URL nav (expo-splash-screen is a no-op on web), two Supabase Navigator Lock cascade errors replaced with processLock (in-memory promise-chain lock), invisible text on browse screen (font-face paint delay), font load failure blocking app indefinitely
- ✅ Issue #6 — Authentication + onboarding flow: Supabase Auth (sign up, sign in, sign out, password reset + recovery, delete account), 3-step onboarding, full Profile screen with inline editing + photo upload, root layout session guard with AuthState discriminated union, AppName pun component, Input/Button 600px web constraints, password strength bar, real-time match indicator
- ✅ Issue #5 — Electric Diner design system: typography/spacing/radii tokens in theme.ts, Bungee + Inter fonts loaded, tailwind.config.js extended, 5 UI primitives (Button, Card, Badge, Input, SkeletonLoader) verified on Expo web
- ✅ Issue #4 — OSM alias table + Fuse.js matching: osm_aliases table with 172 aliases across 46 chains, chainMatcher.ts two-step pipeline (exact → fuzzy), get_chain_names() SQL function, 14/14 unit tests + 15/15 Overpass integration test (100% match rate)
- ✅ Issue #3 — MenuStat data prep + Supabase import: 26,237 rows in menu_items, profiles table created, both with RLS policies. Import script with --inspect mode, integer rounding, and data quality report
- ✅ Issue #2 — Mapbox compatibility check: @rnmapbox/maps v10 + mapbox-gl v3 installed, platform-split MapView created, dark map verified rendering on Expo web
- ✅ Issue #1 — Expo SDK 54 project initialized, NativeWind v4 + TanStack Query v5 configured, full route structure built, Vercel connected and live at mybigmacros.vercel.app
- ✅ Session 1 — GitHub repo created, .gitignore committed, git initialized, planning docs committed to main, 12 GitHub issues created
- ✅ Planning phase — PRD, ARCHITECTURE.md, CHANGELOG.md, STATUS.md, END_OF_SESSION_CHECKLIST.md, .env.example, .env.local, CLAUDE.md

---

## How To Update This File

**At the start of a session:**
- Update "Last Session" and "Next Session Goal"
- Review blockers and open questions
- Note what you plan to work on today

**At the end of a session:**
- Update the progress tables (change ⬜ to 🔄 or ✅)
- Add any new blockers or open questions
- Update "Next Session Goal" for next time
- Add an entry to CHANGELOG.md

---

*Last updated: May 15 2026*
*Product owner: Mallory Comes*
