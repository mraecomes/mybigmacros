# STATUS.md — myBigMACros

> This is the first file to read at the start of every coding session.
> It tells you exactly where the project stands right now.
> Update it at the start and end of every session.

---

## Current Status

**Build Phase:** Pre-Build — Planning Complete
**Last Updated:** April 2026
**Last Session:** Planning phase complete — PRD, ARCHITECTURE.md, CHANGELOG.md, STATUS.md, END_OF_SESSION_CHECKLIST.md, .env.example, .env.local, and CLAUDE.md all created
**Next Session Goal:** Complete product owner pre-session checklist (Supabase project, Mapbox account, GitHub repo, Vercel project, Node.js confirmed), then begin Issue #1 — Project Setup

---

## Pre-Build Tasks (Must Complete Before MVP Features)

These happen after project setup. Nothing in the MVP feature build starts until all three are done.

| Task | Status | Notes |
|------|--------|-------|
| Mapbox compatibility check (Expo managed workflow + web rendering) | ⬜ Not started | Highest risk item — resolve before any UI |
| MenuStat data prep + Supabase import (Node.js script) | ⬜ Not started | Must complete before nutrition browser |
| OSM → MenuStat alias table + Fuse.js fallback | ⬜ Not started | Must complete before location search |

---

## MVP Progress

| Feature | Status | Notes |
|---------|--------|-------|
| CLAUDE.md created | ✅ Complete | |
| Project setup (Expo + TypeScript + NativeWind + Supabase) | ⬜ Not started | |
| Centralized theme.ts (Electric Diner palette) | ⬜ Not started | Build before any UI components |
| Authentication — sign up | ⬜ Not started | |
| Authentication — login / logout | ⬜ Not started | |
| Authentication — password reset | ⬜ Not started | |
| Authentication — delete account | ⬜ Not started | |
| Onboarding flow (name → photo → calorie goal) | ⬜ Not started | |
| User profile screen | ⬜ Not started | |
| Navigation (bottom tabs mobile / top nav web) | ⬜ Not started | Build before any screens |
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
| Vercel deploy — live portfolio URL | ⬜ Not started | Deploy as soon as core loop works on web |
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

- Confirm Supabase project URL and keys are filled into `.env.local` before first session
- Confirm Mapbox access token is filled into `.env.local` before first session
- Decide on Vercel project name before first deploy — becomes the public portfolio URL
- Decide on final app display name (used in Expo config `app.json`)
- Confirm Node.js v18+ is installed (`node --version` in terminal)
- Confirm pnpm is installed (`pnpm --version` in terminal)
- Confirm Apple Developer account status before TestFlight distribution (not urgent — deferred)
- Confirm API access for Cronometer and Lose It! before committing to v1 tracker integrations
- [ ] Flip GitHub repo from private to public when ready to share with hiring managers — go to GitHub Settings → Danger Zone → Change visibility. Confirm .env.local was never committed first.

---

## Upcoming Decisions

| Decision | Needed By | Notes |
|----------|-----------|-------|
| Mapbox implementation path (RN SDK vs react-native-maps + style layer) | Pre-build task #1 | Claude Code resolves this first |
| Retro display font selection | Before first UI components | Header / app name font only — never for data |
| Apple HealthKit integration approach | v1 | Confirm React Native path before building |
| Cronometer / Lose It! API access | v1 | Treat as stretch goals until access confirmed |
| Notification email template design | v2 | Should match Electric Diner design direction |
| Social sharing card design | v3 | Branded graphic with macro breakdown |
| GitHub visibility → public | When ready to share with hiring managers | GitHub → Settings → Danger Zone → Change visibility. Confirm .env.local was never committed first. See GitHub Visibility section in CLAUDE.md for full checklist. |

---

## Recently Completed

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

*Last updated: April 2026*
*Product owner: Mallory Comes*
