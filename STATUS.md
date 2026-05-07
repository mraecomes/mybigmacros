# STATUS.md — myBigMACros

> This is the first file to read at the start of every coding session.
> It tells you exactly where the project stands right now.
> Update it at the start and end of every session.

---

## Current Status

**Build Phase:** MVP — Issue #7 Complete
**Last Updated:** May 7 2026
**Last Session:** Issue #7 complete — Navigation structure: web top nav (TopNav.tsx with hamburger collapse at 768px), platform-split tab layout (TopNav on web / native tab bar on mobile). Fixed three web-only bugs: white screen on direct URL nav, two Supabase Navigator Lock cascade errors, and invisible text on browse screen. app.config.ts changed to web.output: 'single' for SPA routing.
**Next Session Goal:** Issue #8 — Restaurant locator (geolocation + Overpass API + map + list view)

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
| Navigation (bottom tabs mobile / top nav web) | ✅ Complete | TopNav.tsx (web, hamburger at 768px), platform-split layout, web.output: 'single', Navigator Lock fix via processLock, white-screen loading fix |
| Restaurant locator — geolocation + zip fallback | ⬜ Not started | |
| Restaurant locator — Overpass API query | ⬜ Not started | Depends on OSM alias table |
| Restaurant locator — map view (Mapbox) | ⬜ Not started | Depends on Mapbox compatibility check |
| Restaurant locator — list view | ⬜ Not started | |
| Nutrition browser — restaurant menu screen | ⬜ Not started | Depends on MenuStat import |
| Nutrition browser — item detail screen | ⬜ Not started | |
| Missing data display rules | ⬜ Not started | Calories unavailable / "—" for macros |
| Macro-Meter visualization (React Native SVG) | ⬜ Not started | Item detail screen |
| Calorie filter — input + results screen | ⬜ Not started | |
| Calorie filter — "Just over your limit" section | ⬜ Not started | |
| Badge system — Protein Hit | ⬜ Not started | ≥20g protein AND <500 cal, Mustard Gold |
| Badge system — Fiber Fuel | ⬜ Not started | ≥5g fiber AND <500 cal, Muted Sage Green |
| Badge tooltips (tap/hover) | ⬜ Not started | |
| Menu item images — logo + emoji fallback | ⬜ Not started | Never show broken image placeholder |
| AsyncStorage caching (nutrition + location data) | ⬜ Not started | |
| "Using cached data" banner | ⬜ Not started | |
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

None — planning phase complete, ready to begin pre-build tasks.

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
| Apple HealthKit integration approach | v1 | Confirm React Native path before building |
| Cronometer / Lose It! API access | v1 | Treat as stretch goals until access confirmed |
| Notification email template design | v2 | Should match Electric Diner design direction |
| Social sharing card design | v3 | Branded graphic with macro breakdown |
| GitHub visibility → public | When ready to share with hiring managers | GitHub → Settings → Danger Zone → Change visibility. Confirm .env.local was never committed first. See GitHub Visibility section in CLAUDE.md for full checklist. |

---

## Recently Completed

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

*Last updated: May 6 2026*
*Product owner: Mallory Comes*
