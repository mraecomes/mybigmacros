# CHANGELOG.md — myBigMACros

> A running log of what was built, changed, or fixed in each coding session.
> Update this at the end of every session before closing Cursor.
> Most recent entries go at the top.

---

## How To Write a Good Entry

```
## [Date] — Session Title

### Added
- Brief description of new features or files created

### Changed
- Brief description of anything modified or updated

### Fixed
- Brief description of bugs resolved

### Decisions Made
- Any important decisions made during this session and why
```

---

## [April 30 2026] — Session 1: GitHub Setup + Issue Creation

### Added

- `.gitignore` created with all required entries (environment files, Expo artifacts, native build artifacts, system files, EAS)
- Git initialized and initial commit made to `main` — planning docs committed (CLAUDE.md, PRD.md, ARCHITECTURE.md, STATUS.md, CHANGELOG.md, END_OF_SESSION_CHECKLIST.md, .env.example, .gitignore)
- Pre-session checklist completed: Supabase project and keys confirmed, Mapbox token confirmed, Node.js v25.9.0 confirmed, pnpm v10.33.0 confirmed, GitHub repo created
- Docs PR opened and merged — STATUS.md, CHANGELOG.md, CLAUDE.md updated to reflect Session 1 completion
- 12 GitHub issues created on `mraecomes/mybigmacros` (private repo), each with full description, acceptance criteria, use cases to validate, and edge cases:
  - `[Pre-Build] #1` — Project setup (Expo + TypeScript + NativeWind + Supabase + Vercel)
  - `[Pre-Build] #2` — Mapbox compatibility check (Expo managed workflow + web rendering)
  - `[Pre-Build] #3` — MenuStat 2022 XLS prep + Supabase import
  - `[Pre-Build] #4` — OSM alias table + Fuse.js chain name matching
  - `[MVP] #5` — Centralized theme.ts (Electric Diner design system)
  - `[MVP] #6` — Authentication + onboarding flow
  - `[MVP] #7` — Navigation structure (bottom tabs mobile / top nav web)
  - `[MVP] #8` — Restaurant locator (geolocation + Overpass API + map + list)
  - `[MVP] #9` — Nutrition browser (restaurant menu screen + item detail)
  - `[MVP] #10` — Macro-Meter visualization (React Native SVG)
  - `[MVP] #11` — Calorie filter screen (budget input + results + over-limit section)
  - `[MVP] #12` — Badge system (Protein Hit + Fiber Fuel)
- `## GitHub Visibility` section added to `CLAUDE.md` — documents private-during-development policy and pre-public checklist (confirm `.env.local` never committed, Vercel URL live, update `EXPO_PUBLIC_APP_URL`)
- GitHub visibility open question added to `STATUS.md` Open Questions
- GitHub visibility row added to `STATUS.md` Upcoming Decisions table

### Changed

- `CLAUDE.md`, `myBigMACros_PRD.md`, `ARCHITECTURE.md` — all references to MenuStat 2022 CSV updated to XLS file (`ms_annual_data_2022.xls`)
- `CLAUDE.md`, `myBigMACros_PRD.md`, `ARCHITECTURE.md` — all references to `papaparse` replaced with `xlsx` library
- `ARCHITECTURE.md` — Python + pandas data cleaning reference updated to Node.js + xlsx

### Decisions Made

- GitHub repo set to **private** during development — will be flipped to public manually when ready to share with hiring managers. Checklist documented in CLAUDE.md
- MenuStat source file confirmed as Excel XLS format (`ms_annual_data_2022.xls`), not CSV — import script will use the `xlsx` Node.js library
- Issue titles prefixed with `[Pre-Build]` (#1–#4) and `[MVP]` (#5–#12) for clarity in the GitHub Issues tab
- `gh` authenticated account (`mraecomes`) used for all GitHub CLI operations — no manual repo configuration needed

---

## [April 2026] — Planning Phase Complete

### Added

- `PRD.md` — Full product requirements document covering MVP through v3, badge system, missing data rules, design system, build sequence, and cost summary
- `ARCHITECTURE.md` — Technical architecture document covering data flow, security model, platform split strategy, and key decisions
- `CHANGELOG.md` — This file
- `STATUS.md` — Project status and progress tracker
- `END_OF_SESSION_CHECKLIST.md` — Step-by-step end of session workflow
- `.env.example` — Environment variable template
- `CLAUDE.md` — Claude Code instruction file with tech stack, project structure, full database schema, RLS policies, migration rules, badge logic, missing data rules, design system, git workflow, MCP server configuration, EAS configuration, and .gitignore requirements

### Decisions Made

- Tech stack finalized: React Native + Expo Managed Workflow + TypeScript, NativeWind, TanStack Query, Supabase, Mapbox (platform split), React Native SVG, Fuse.js, Vercel
- MVP scope locked: authentication (required, no guest mode), restaurant locator, nutrition browser, calorie filter, Macro-Meter, Protein Hit + Fiber Fuel badge system
- Design direction: Electric Diner — Ketchup Red, Electric Mint, Mustard Gold, Charcoal dark mode. All colors in centralized `theme.ts`
- Badge system finalized: Protein Hit (≥20g protein AND <500 cal, Mustard Gold) and Fiber Fuel (≥5g fiber AND <500 cal, Muted Sage Green). OR logic rejected in favor of AND for both badges to keep badges meaningful. Both badges display on item cards and detail screens with tap/hover tooltips showing exact qualifying values
- Missing data policy: missing calories → "Calories unavailable" + exclude from filter results. Missing macros → "—" (never 0). Missing protein/fiber → ineligible for corresponding badge
- Calorie filter and daily calorie goal are both optional — no blocking prompts
- Web geolocation supported but never mandatory — zip/address fallback always available
- "Just over your limit" dimmed secondary section in filter results instead of hiding over-budget items
- Healthy options toggle placed on filter screen as clearly secondary control, off by default
- Dark mode is the default and only mode for MVP
- Web version on Vercel is Priority #1 use case — portfolio surface for hiring managers
- Distribution: Vercel (web, free), TestFlight (iOS, $99/yr Apple Dev account), Direct APK (Android, free). App Store / Google Play not in scope
- Pre-build tasks defined and sequenced: project setup → Mapbox compatibility check → MenuStat data prep (Node.js) → OSM alias table → theme file → auth → core loop

---

*Last updated: April 30 2026*
*Product owner: Mallory Comes*