# ARCHITECTURE.md — myBigMACros

> This document describes how myBigMACros is structured technically — how the parts connect, how data flows, and why key decisions were made. Read this alongside CLAUDE.md before making any structural changes to the codebase.

---

## High-Level Overview

myBigMACros is a cross-platform app built with React Native and Expo. A single codebase produces iOS, Android, and web (Vercel) outputs simultaneously. Supabase handles the database, authentication, and file storage. The web version deployed to Vercel is the primary portfolio surface and must always be treated as a first-class platform alongside mobile.

```
User (Mobile or Browser)
          │
          ▼
React Native + Expo App
  ├── Mobile (iOS / Android via Expo Go / EAS Build)
  └── Web (Expo Web → Vercel)
          │
          ▼
     Supabase
  ├── PostgreSQL Database (users, menu_items, osm_aliases)
  ├── Supabase Auth (user sessions, JWTs)
  ├── Row Level Security (data access control)
  └── Supabase Storage (profile photos, curated food images v1+)
          │
  OpenStreetMap Overpass API (restaurant location search)
  Mapbox (map rendering — mobile and web via platform split)
```

---

## Application Layers

### 1. Frontend (React Native + Expo + NativeWind)

All screens live in the `app/` directory using Expo Router (file-based routing). Screens are React Native components styled with NativeWind (Tailwind for React Native).

Key screens:
- `/` — Splash / redirect to main app if logged in
- `/login` — Login screen
- `/signup` — Sign up screen
- `/(tabs)/nearby` — Map + list restaurant locator (default tab)
- `/(tabs)/browse` — Search all chains without location requirement
- `/(tabs)/budget` — Calorie filter input and results
- `/(tabs)/profile` — User profile and settings
- `/restaurant/[id]` — Individual restaurant menu browser
- `/item/[id]` — Item detail screen with Macro-Meter and badges

State management uses React Query (TanStack Query) for all server data. Local UI state uses React's built-in `useState` and `useReducer`.

### 2. Data Layer (Supabase / PostgreSQL)

The database uses PostgreSQL via Supabase. Row Level Security (RLS) policies are enabled on all user-owned tables. The nutrition data in `menu_items` is read-only for all users — no user can modify it.

Core tables:
```
users          — profile data, daily calorie goal, linked to Supabase Auth
menu_items     — full MenuStat nutrition dataset (~100 chains, static)
osm_aliases    — maps OpenStreetMap chain name variations to MenuStat chain names
```

See CLAUDE.md for the full database schema.

### 3. Authentication (Supabase Auth)

Authentication is handled entirely by Supabase Auth. The app uses JWT tokens. Expo Router middleware (or a root layout guard) checks for a valid session on protected routes and redirects unauthenticated users to `/login`.

Auth flow:
```
User submits sign-up or login form
          │
          ▼
Supabase Auth validates credentials
          │
          ▼
JWT token stored securely (AsyncStorage on mobile, cookie on web)
          │
          ▼
Root layout guard checks session on every navigation
          │
     ┌────┴────┐
  Valid?       No
     │          │
     ▼          ▼
  Allow      Redirect to /login
  access
```

### 4. Restaurant Location Search (OpenStreetMap Overpass API)

Restaurant discovery uses the OpenStreetMap Overpass API — a free, keyless service purpose-built for proximity/radius queries. It is the only location search tool in the stack. No fallback to Google Places or Foursquare.

Location flow:
```
User opens Nearby tab
          │
          ▼
Device geolocation captured (or zip/address entered manually)
          │
          ▼
Overpass API query: all fast food locations within chosen radius
matching the MenuStat chain list
          │
          ▼
Results returned with name, coordinates, address
          │
          ▼
App matches OSM chain name → osm_aliases table → MenuStat chain name
Fuse.js fuzzy match as fallback for unrecognized names
          │
          ▼
Only chains with matching MenuStat data are displayed
          │
          ▼
Mapbox renders pins on map / list view populates
```

### 5. Map Rendering (Mapbox — Platform Split)

Mapbox renders the map UI. The Mapbox React Native SDK and the Mapbox web JS library are different packages — they cannot be imported on each other's platform. The map is implemented as a platform-split component using Metro's file extension resolution system.

**Confirmed decision (Issue #2 — Mapbox Compatibility Check, May 2026):**

```
components/map/MapView.tsx          ← TypeScript type stub (not executed at runtime)
components/map/MapView.native.tsx   ← iOS + Android: @rnmapbox/maps v10
components/map/MapView.web.tsx      ← Browser + Vercel: mapbox-gl v3
```

Metro automatically resolves `.native.tsx` on iOS/Android and `.web.tsx` in the browser at build time. No runtime `Platform.OS` check is needed — the correct library is bundled per platform.

```
Import from '@/components/map/MapView'
          │
     ┌────┴──────────────────────┐
   Web build                Native build
(EAS / Expo web)           (EAS Build only)
     │                          │
     ▼                          ▼
MapView.web.tsx            MapView.native.tsx
mapbox-gl v3               @rnmapbox/maps v10
```

Both use the Mapbox dark style (`mapbox://styles/mapbox/dark-v11`) to match the Electric Diner theme.

**⚠️ Critical constraint:** `@rnmapbox/maps` requires native code not available in Expo Go. Native map testing requires an EAS Build (development or preview profile). Web map testing works immediately via `pnpm expo start --web`.

**Libraries installed:**
- `@rnmapbox/maps@^10.3.0` — native Mapbox SDK with Expo Config Plugin (added to `app.config.ts`)
- `mapbox-gl@^3.23.0` — web Mapbox GL JS library (no Expo-specific config needed)

### 6. Nutrition Data (MenuStat → Supabase)

Nutrition data is a one-time static import. There is no live nutrition API. The MenuStat 2022 XLS file (ms_annual_data_2022.xls) was cleaned, normalized, and imported into the `menu_items` Supabase table before any app code was written.

```
MenuStat 2022 XLS file (ms_annual_data_2022.xls, downloaded once)
          │
          ▼
Node.js + xlsx data cleaning script
          │
          ▼
Normalized CSV → Supabase CSV importer
          │
          ▼
menu_items table (static, read-only for all users)
          │
          ▼
App queries menu_items on demand (no bundled data)
```

### 7. Caching (AsyncStorage)

Because the app is often used in a car at a drive-thru where connectivity is poor, nutrition data and restaurant location results are cached locally.

- Last-fetched restaurant list for a given coordinates + radius: cached with 24-hour TTL
- Menu items for a visited restaurant: cached with 24-hour TTL
- Cache stored in AsyncStorage on mobile, localStorage-equivalent on web
- When serving cached data: a subtle "Using cached data" banner is shown
- Cache does not apply to user profile data — always fetched fresh

### 8. Scripts Folder (`scripts/`)

The `scripts/` folder contains one-time data preparation and import scripts. These are never deployed — they run locally on the developer's machine during the pre-build phase only.

Current scripts:
- `menustat_import.js` — Node.js script that cleans the raw MenuStat 2022 XLS file (ms_annual_data_2022.xls) (handles encoding issues, missing values, column renaming using `xlsx`), outputs a normalized CSV ready for Supabase import, and produces a data quality report. No Python or additional CLI tools required — Node.js is already present as part of the Expo project setup

**Rules:**
- Scripts in this folder are never imported or called by app code
- They are local-only utilities — never part of the Expo build
- After a script has been run and verified, it is kept in the repo for reference but never run again unless the data needs to be re-imported from scratch

---

```
User taps a restaurant pin or card
          │
          ▼
App checks AsyncStorage for cached menu data
          │
     ┌────┴────┐
  Cache hit    Cache miss
     │              │
     ▼              ▼
Serve cached    Query Supabase menu_items
data            WHERE chain_name = [matched name]
     │              │
     └──────┬────────┘
            ▼
  Apply missing data display rules:
  - Missing calories → "Calories unavailable"
  - Missing macros → "—" (never 0)
  - Missing protein/fiber → ineligible for badges
            │
            ▼
  Evaluate badge eligibility per item:
  - Protein Hit: protein ≥ 20g AND calories < 500
  - Fiber Fuel: fiber ≥ 5g AND calories < 500
            │
            ▼
  Render item list with badges where applicable
```

## Data Flow — Calorie Filter

```
User enters available calories (or pre-fill from daily goal)
          │
          ▼
App fetches nearby restaurant list (from cache or Overpass)
          │
          ▼
For each nearby restaurant, query menu_items
WHERE chain_name = [matched name] AND calories IS NOT NULL
          │
          ▼
Split results:
  - Items at or under threshold → "in budget" section
  - Items over threshold → "Just over your limit" section (dimmed)
          │
          ▼
Group by restaurant, sort by calories ascending within each group
          │
          ▼
Render results with badges where applicable
```

---

## Security Model

- **Row Level Security (RLS)** is enabled on the `profiles` table. Users can only read and write their own row
- **`menu_items` and `osm_aliases`** are public read-only tables — no RLS required, no user data at risk
- **Supabase anon key** (`EXPO_PUBLIC_SUPABASE_ANON_KEY`) is safe to expose in the app — RLS and table-level policies prevent data leaks
- **Service role key** (`SUPABASE_SERVICE_ROLE_KEY`) is never used in the app client. If needed for admin scripts, it is only used server-side and never committed to the repo
- **Environment variables** — all secrets stored in `.env.local` locally and in Vercel / EAS environment variable dashboards for production. Never hardcoded
- **`.env.local` is always in `.gitignore`** — never committed to GitHub

---

## Deployment Architecture

```
Developer pushes to GitHub (main branch)
          │
          ▼
Vercel detects new commit
          │
          ▼
Vercel runs Expo web build
          │
          ▼
If build passes → deploy to production Vercel URL
If build fails → deployment blocked, previous version stays live
          │
          ▼
Supabase runs independently (always-on cloud database)

Mobile builds (separate, triggered manually):
EAS Build → TestFlight (iOS) / Direct APK (Android)
```

Preview deployments: every pull request gets its own Vercel preview URL for testing before merging to main. This is the primary way to validate web changes before they go live.

---

## Key Architectural Decisions & Why

| Decision | Why |
|----------|-----|
| React Native + Expo over Next.js | Single codebase for iOS, Android, and web. Portfolio web URL and personal mobile app from one project |
| Expo Managed Workflow over Bare | No Xcode or native build tooling required. Eject only if a hard technical wall is hit |
| NativeWind + custom components over React Native Paper | Electric Diner dark mode aesthetic requires full design control. Paper's Material Design conventions fight the brand |
| React Native SVG over Victory Native for Macro-Meter | More reliable on Expo web (Portfolio priority #1). Full control over the fuel gauge shape. No dependency surprises |
| Static MenuStat data over live nutrition API | No rate limits, no ongoing cost, no API dependency risk. 2022 data covers core menu items at major chains reliably |
| OpenStreetMap Overpass over Google Places / Foursquare | Free always, no API key, purpose-built for radius search. Google Places has no free tier. Foursquare free tier too limited |
| Mapbox platform split (Metro file extension: .native.tsx / .web.tsx) | mapbox-gl v3 (web) and @rnmapbox/maps v10 (native) are incompatible on each other's platform. Metro's extension resolution bundles the correct library per platform at build time — cleaner than runtime Platform.OS checks. @rnmapbox/maps requires EAS Build; not compatible with Expo Go. |
| Fuse.js for chain name fuzzy matching | Lightweight, no server required, handles OSM naming inconsistencies at runtime without database overhead |
| AsyncStorage caching for nutrition + location data | Drive-thru use case — poor connectivity is expected. Caching makes the app usable offline without a full offline mode |
| Supabase over custom PostgreSQL | Managed infrastructure, built-in auth, RLS, storage, and dashboard — no DevOps required |
| `theme.ts` centralized design tokens | All Electric Diner colors, fonts, and spacing in one file. Entire palette can be changed by editing one file. Zero hardcoded values in components |

---

## What To Update This File When

- You add a new major feature or service (e.g., Expo Notifications in v2)
- The folder structure changes significantly
- A new data source or external API is added
- The deployment setup changes
- The Mapbox implementation changes (e.g., after compatibility check resolves)
- An architectural decision is reversed or changed

---

*Last updated: April 2026*
*Product owner: Mallory Comes*
