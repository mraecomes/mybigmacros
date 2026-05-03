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

## [May 3 2026] — Session 4: Issue #3 — MenuStat 2022 XLS Prep + Supabase Import

### Added

- `scripts/menustat_import.js` — Node.js script using `xlsx` that reads `ms_annual_data_2022.xls`, normalizes column names (snake_case → space-separated for header mapping), handles missing/non-numeric values as `null` (never `0`), rounds calorie decimals to the nearest integer, outputs `scripts/menu_items_cleaned.csv`, and prints a data quality report: total rows, missing value counts per macro, and top 10 chains by missing macro rate
- `supabase/migrations/20260503000000_create_profiles_table.sql` — profiles table with RLS policy restricting all operations to the authenticated user's own row (`auth.uid() = id`)
- `supabase/migrations/20260503000001_create_menu_items_table.sql` — menu_items table with public read RLS policy — anonymous Supabase client can query, required for in-app nutrition lookups without requiring login
- `xlsx@^0.18.5` — dev dependency only, used exclusively by the import script, never bundled into the app
- `scripts/*.csv` added to `.gitignore` — generated CSV is a local artifact and must never be committed

### Changed

- `package.json` / `pnpm-lock.yaml` — updated with xlsx dev dependency

### Decisions Made

- **`--inspect` mode built into the script** — `node scripts/menustat_import.js --inspect` prints all sheet names and column headers without writing any files. Used to discover that the XLS columns use snake_case (`item_name`, `food_category`, `total_fat`, `dietary_fiber`, `serving_size`) rather than space-separated names. Fixed by normalizing underscores to spaces during header mapping — all 10 schema columns mapped correctly after one-line fix
- **Calorie values rounded to integers** — MenuStat XLS stores some calorie values as floats (e.g., `651.1`). Supabase `integer` column type rejected these. Added `parseInteger()` helper using `Math.round()` before writing to CSV. Schema unchanged — `integer` is correct for calories
- **Supabase CSV importer does not use a transaction** — the first (failed) import processed ~20,392 rows before hitting the integer error, leaving the table with 46,629 rows (partial first import + full second import). Detected via Supabase MCP row count check. Table truncated via MCP and re-imported cleanly. Always verify row count immediately after any CSV import
- **Verified via Supabase MCP** — 26,237 rows confirmed, McDonald's spot check passed (Hamburger 250 cal, Cheeseburger 300 cal, Double Cheeseburger 440 cal), `null` calories confirmed on items with missing data (not 0), anonymous RLS read confirmed

---

## [May 3 2026] — Session 3: Issue #2 — Mapbox Compatibility Check

### Added

- `@rnmapbox/maps@^10.3.0` — Mapbox React Native SDK for iOS and Android. Registered as an Expo Config Plugin in `app.config.ts` so the native Mapbox SDK is linked at EAS Build time
- `mapbox-gl@^3.23.0` — standard Mapbox GL JS library for web rendering. Bundled via Expo Metro for web; CSS auto-bundled (40.9 kB) from `mapbox-gl/dist/mapbox-gl.css`
- `components/map/MapView.native.tsx` — native Mapbox map component using `@rnmapbox/maps`. Renders dark Mapbox style (`mapbox://styles/mapbox/dark-v11`), camera, and user location dot
- `components/map/MapView.web.tsx` — web Mapbox map component using `mapbox-gl`. Mounts into a `div` via `useRef` and `useEffect`. Same dark style as native
- `components/map/MapView.tsx` — TypeScript stub file so editors and `tsc` can resolve the import. Metro replaces it at build time with the correct platform file
- `types/map.ts` — shared `MapViewProps` type (`latitude`, `longitude`, `zoom`) used by both platform components

### Changed

- `app.config.ts` — added `@rnmapbox/maps` to the `plugins` array to register the native Expo Config Plugin
- `app/(tabs)/nearby.tsx` — wired in `MapView` component with hardcoded San Francisco coordinates for render verification. Geolocation and Overpass API integration deferred to Issue #8
- `ARCHITECTURE.md` — replaced TBD Mapbox note with confirmed implementation: Metro file extension resolution, library versions, and the Expo Go constraint documented prominently
- `CLAUDE.md` — added ⚠️ note in the Pre-Build Tasks section: Expo Go cannot be used for map testing; any map feature must plan for an EAS Development Client build for native verification

### Decisions Made

- **Platform split via Metro file extensions, not `Platform.OS` checks** — `.native.tsx` and `.web.tsx` cause Metro to bundle the correct library per platform at build time. Native Mapbox code never enters the web bundle; web Mapbox code never enters the native bundle. Cleaner and safer than runtime checks
- **`@rnmapbox/maps` chosen over `react-native-maps` for native** — `react-native-maps` does not support Mapbox custom style URLs natively. `@rnmapbox/maps` supports full Mapbox styling (required for the Electric Diner dark map) and works in Expo managed workflow via its Config Plugin
- **Expo Go cannot be used for native map testing** — `@rnmapbox/maps` requires native code not available in the Expo Go sandbox. EAS Development Client or EAS Build (preview/production profile) required for any native map testing. Web testing via `pnpm expo start --web` works at any time
- **`@types/mapbox-gl` not installed** — `mapbox-gl@^3` ships its own TypeScript definitions; the separate types package is a deprecated stub and was removed after install
- **mapbox-gl v3 peer dep warning with @rnmapbox/maps** — `@rnmapbox/maps@10` lists `mapbox-gl@^2.9.0` as a peer dependency (a legacy of older shared-SDK architectures). This warning is safe to ignore — the two libraries run on separate platforms and never interact at runtime

---

## [May 2 2026] — Session 2: Issue #1 — Project Setup

### Added

- Expo SDK 54 managed workflow scaffolded with TypeScript and tabs template
- `app.config.ts` — sets app name (`myBigMACros`), slug, scheme, bundle ID `com.mallory.mybigmacros`, dark mode (`userInterfaceStyle: dark`), splash background `#121212`, Expo Router plugin
- `.npmrc` — `use-pnpm=true` prevents Expo internal tooling from falling back to npm
- `eas.json` — EAS Build profiles: development, preview (direct APK), production
- `pnpm-workspace.yaml` — pnpm workspace config generated by Expo CLI
- `babel.config.js` — NativeWind v4 babel preset (`nativewind/babel`) and `jsxImportSource: 'nativewind'`
- `metro.config.js` — NativeWind metro integration via `withNativeWind`, input `./global.css`
- `global.css` — Tailwind CSS v3 directives entry point (`@tailwind base/components/utilities`)
- `tailwind.config.js` — content paths for `app/` and `components/`, NativeWind preset
- `nativewind-env.d.ts` — auto-generated by NativeWind at first build; adds TypeScript support for `className` props on React Native components
- `constants/theme.ts` — full Electric Diner color palette: Ketchup Red, Electric Mint, Mustard Gold, Charcoal, Surface, badge colors, status colors — all named constants, zero hardcoded hex values in any component
- Route structure:
  - `app/_layout.tsx` — root Stack with `QueryClientProvider` (TanStack Query v5) and font loading
  - `app/(tabs)/_layout.tsx` — 4-tab bar: Nearby, Browse, Budget, Profile with Electric Diner active/inactive tint and Charcoal background
  - `app/(tabs)/nearby.tsx`, `browse.tsx`, `budget.tsx`, `profile.tsx` — placeholder screens
  - `app/(auth)/_layout.tsx`, `login.tsx`, `signup.tsx`, `reset.tsx` — auth Stack navigator
  - `app/restaurant/[id].tsx`, `app/item/[id].tsx` — dynamic route placeholders
  - `app/+not-found.tsx` — rewritten with plain React Native components and theme colors
- Empty directory structure with `.gitkeep`: `components/map/`, `components/nutrition/`, `components/restaurant/`, `components/ui/`, `lib/supabase/`, `lib/overpass/`, `lib/matching/`, `lib/cache/`, `types/`, `supabase/migrations/`
- `assets/fonts/SpaceMono-Regular.ttf` and app icon images (icon, adaptive-icon, splash-icon, favicon)
- Vercel project created and connected — `mybigmacros.vercel.app` live, framework set to Other, build command `npx expo export --platform web`, output directory `dist`

### Changed

- `tsconfig.json` — added `jsxImportSource: "nativewind"` to `compilerOptions`; NativeWind auto-appended `nativewind-env.d.ts` to the `include` array at first build
- `.gitignore` — Expo CLI auto-appended `expo-env.d.ts` (auto-generated file, correctly excluded)

### Decisions Made

- `app.config.ts` used instead of `app.json` — TypeScript config is more flexible and supports reading environment variables at build time
- `tailwindcss@^3` installed as devDependency, not v4 — NativeWind v4.2.3 requires Tailwind CSS v3 via `react-native-css-interop`; Tailwind v4 causes a peer dependency conflict and build failure
- `react-native-reanimated` (v4) and `react-native-safe-area-context` (v5) came pre-installed in the Expo SDK 54 template — not reinstalled separately
- `constants/theme.ts` fully populated with Electric Diner colors during Issue #1 rather than deferred to Issue #5 — tabs layout required theme colors immediately; prevents hardcoded values from entering the codebase from day one
- `web.output: "static"` kept as Expo SDK 54 default — generates per-route HTML at build time; correct approach for Expo Router + Vercel static hosting
- Vercel framework detection manually overridden to Other (`null`) — Vercel incorrectly auto-detects Expo projects as Next.js and fails the build
- PR #16 merged to `main` — triggered first Vercel auto-deploy; state READY, 71-second build, deployment ID `dpl_6v3s7qLqZUEpNeZ1MkqyfC2NTT25`

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

*Last updated: May 3 2026*
*Product owner: Mallory Comes*