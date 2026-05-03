# CLAUDE.md — myBigMACros

> This file gives Claude Code persistent context about the myBigMACros project.
> Read this file at the start of every session before making any changes.

---

## What We Are Building

myBigMACros is a mobile-first (also web) app for junk food lovers who want to be mindful of their calorie intake without being lectured about it. Users find fast food restaurants nearby, browse real nutrition data, and filter menu items that fit their available calorie budget.

The core problem we are solving: people who enjoy fast food have no tool that respects their choices while helping them make informed ones. Existing nutrition apps are built for dieters. myBigMACros is built for people who already know what they want — and just want to make it work within their day.

Full product details are in the PRD. Always refer to the PRD for feature requirements before building anything.

---

## Project Documents

These files live in the root of the project folder. Read the relevant ones at the start of each session based on what you are working on.

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [PRD.md](./PRD.md) | Full product requirements, feature specs, badge system, missing data rules, and release phases | Before building any new feature |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Technical structure, data flow diagrams, platform split strategy, and key architectural decisions | Before making any structural or technical changes |
| [STATUS.md](./STATUS.md) | Current build phase, feature progress tracker, and session goals | At the start of every session |
| [CHANGELOG.md](./CHANGELOG.md) | Running log of what was built, changed, or fixed | At the end of every session before closing |
| [END_OF_SESSION_CHECKLIST.md](./END_OF_SESSION_CHECKLIST.md) | Step-by-step end of session workflow for keeping docs and GitHub in sync | At the end of every session |

> All documents are kept up to date by the product owner. Always read the latest version — never rely on memory from a previous session.

---

## Who I Am

I am the product owner and a non-developer building with AI assistance. I understand product thinking and user experience well, but I am not a professional engineer. This means:

- Always explain what you are doing and why in plain terms
- Technical terms are fine — but briefly explain them when first used
- Never assume I know why a technical decision was made. Tell me
- If something could be done multiple ways, tell me the options and your recommendation before proceeding

---

## How I Want You to Work With Me

**Always ask before making changes.**

Before writing or modifying any code, tell me:
1. What you are about to do
2. Which files will be created or changed
3. Why this approach makes sense

Wait for my confirmation before proceeding. This applies to every change — small or large.

**One step at a time.**

Do not build multiple features in one go unless I explicitly ask. Complete one piece, show me the result, wait for my feedback, then move to the next.

**Explain errors in plain language.**

If something breaks, tell me what went wrong in plain English before showing me the error message. Then walk me through how to fix it step by step.

**Never delete or overwrite files without asking first.**

If a change requires deleting or significantly restructuring existing code, flag this explicitly and explain why before doing anything.

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | React Native + Expo (Managed Workflow) | Single codebase for iOS, Android, and web |
| Language | TypeScript | Type safety throughout — no `any` |
| Navigation | Expo Router + React Navigation | File-based routing, tab bar on mobile, top nav on web |
| Styling | NativeWind (Tailwind for React Native) | Utility-first, pairs with centralized theme file |
| State Management | TanStack Query | For fetching and caching server data |
| Database | Supabase (PostgreSQL) | Auth, database, and file storage in one |
| Authentication | Supabase Auth | Email/password for MVP |
| Map Rendering (mobile) | Mapbox React Native SDK or react-native-maps + Mapbox style | Resolved in pre-build task #1 — see ARCHITECTURE.md |
| Map Rendering (web) | mapbox-gl JS library via Platform.OS === 'web' | Standard web Mapbox library, not the RN SDK |
| Location Search | OpenStreetMap Overpass API | Free, no API key, radius search |
| Fuzzy Matching | Fuse.js | Chain name matching fallback |
| Visualization | React Native SVG | Macro-Meter ring/arc on item detail screen |
| Hosting | Vercel (web) + EAS Build (mobile) | Vercel auto-deploys from GitHub |

---

## Project Structure

```
mybigmacros/
├── app/                        # Expo Router screens and layouts
│   ├── (auth)/                 # Login, signup, password reset screens
│   ├── (tabs)/                 # Bottom tab screens
│   │   ├── nearby.tsx          # Map + list restaurant locator
│   │   ├── browse.tsx          # Search all chains without location
│   │   ├── budget.tsx          # Calorie filter and results
│   │   └── profile.tsx         # User profile and settings
│   ├── restaurant/[id].tsx     # Restaurant menu browser
│   └── item/[id].tsx           # Item detail screen + Macro-Meter
├── components/                 # Reusable UI components
│   ├── map/                    # Map components (platform-split)
│   ├── nutrition/              # Macro-Meter, badge components
│   ├── restaurant/             # Restaurant cards, menu item rows
│   └── ui/                     # Generic primitives (Button, Card, Badge, Input)
├── lib/                        # Shared utilities and helpers
│   ├── supabase/               # Supabase client and database queries
│   ├── overpass/               # OpenStreetMap Overpass API queries
│   ├── matching/               # OSM → MenuStat name matching + Fuse.js
│   └── cache/                  # AsyncStorage caching utilities
├── types/                      # TypeScript type definitions
├── constants/                  # theme.ts and other app-wide constants
├── assets/                     # Logos, images, fonts
├── supabase/
│   └── migrations/             # Database migration files
├── scripts/                    # One-time data prep scripts (e.g. MenuStat import)
├── .env.local                  # Local secrets — never commit this
├── .env.example                # Template showing required env vars
├── .gitignore                  # Must include .env.local, node_modules, .expo
├── CLAUDE.md                   # This file — read at session start
├── PRD.md                      # Full product requirements document
├── ARCHITECTURE.md             # Technical architecture document
├── STATUS.md                   # Project status and progress tracker
├── CHANGELOG.md                # Running log of session work
└── END_OF_SESSION_CHECKLIST.md # End of session workflow
```

---

## Database Schema (MVP)

### users
Managed by Supabase Auth. Do not create a separate custom users table. Extend user data using a `profiles` table linked to `auth.users`.

```sql
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  profile_photo_url text,
  daily_calorie_goal integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### menu_items
Static read-only table. Populated once via the MenuStat 2022 import script. Never modified by user actions.

```sql
create table menu_items (
  id uuid primary key default gen_random_uuid(),
  chain_name text not null,
  item_name text not null,
  category text,
  calories integer,
  protein_g numeric,
  fat_g numeric,
  carbs_g numeric,
  fiber_g numeric,
  sodium_mg numeric,
  serving_size text,
  notes text,
  created_at timestamptz default now()
);
```

### osm_aliases
Maps OpenStreetMap chain name variations to normalized MenuStat chain names.

```sql
create table osm_aliases (
  id uuid primary key default gen_random_uuid(),
  osm_name text not null,
  canonical_name text not null,
  created_at timestamptz default now()
);
```

### Row Level Security (RLS)

```sql
-- profiles: users can only read and update their own row
alter table profiles enable row level security;

create policy "Users manage own profile"
  on profiles for all
  using (auth.uid() = id);

-- menu_items: public read access required — app queries this as an anonymous user
-- RLS must be enabled and a permissive read policy explicitly granted
-- Without this, anonymous Supabase client calls will return a permissions error
alter table menu_items enable row level security;

create policy "Public read access for menu_items"
  on menu_items for select
  using (true);

-- osm_aliases: same as menu_items — public read, no user data
alter table osm_aliases enable row level security;

create policy "Public read access for osm_aliases"
  on osm_aliases for select
  using (true);
```

> ⚠️ Do NOT add columns to `menu_items` — it is a static import table. Any schema change requires a new migration file and re-import.
> ⚠️ Do NOT add columns to `osm_aliases` during MVP — alias additions go through migration files only.
> ⚠️ Do NOT create a `notifications` table during MVP — this is a v2 feature.
> ⚠️ Do NOT create a `favorites` or `meal_log` table during MVP — these are v2 features.
> ⚠️ Do NOT create a `reviews` table — this is a v3 feature.

---

## Database Migration Rules

Every database change — table creation, column addition, policy change, index — must be written as a migration file and applied via the Supabase dashboard SQL editor. No Supabase CLI is required.

**Migration file location:** `supabase/migrations/`

**Migration file naming format:**
```
YYYYMMDDHHMMSS_description_of_change.sql

Examples:
20260501000000_create_profiles_table.sql
20260501000001_create_menu_items_table.sql
20260501000002_create_osm_aliases_table.sql
20260510000000_add_index_menu_items_chain_name.sql
```

**How to apply a migration:**
1. Claude Code writes the `.sql` migration file and saves it to `supabase/migrations/`
2. Copy the SQL content from the file
3. Open the Supabase dashboard → SQL Editor
4. Paste and run the SQL
5. Use Supabase MCP to verify the change applied correctly before moving on
6. Commit the migration file to GitHub as part of the feature branch — it serves as the permanent record of the change

**Rules:**
- One migration file per logical change — do not bundle unrelated changes
- Migration files are never edited after they are committed — create a new migration to fix a mistake
- Never apply ad-hoc SQL changes in the dashboard without a corresponding migration file in the repo
- The initial schema (profiles, menu_items, osm_aliases, RLS policies) must all be written as dated migration files during project setup

---

## Key Business Logic Rules

### Missing Nutrition Data
These rules are non-negotiable and must be implemented exactly as specified:
- If **calories are missing**: exclude the item from all calorie filter results. The item still appears when browsing the full menu. Display "Calories unavailable" where the number would appear — never show 0 or a blank
- If **protein, fat, carbs, fiber, or sodium are missing**: display "—" in place of the number. Never substitute 0g for missing data — 0g means zero, not unknown
- If **protein or fiber are missing**: the item is automatically ineligible for Protein Hit and Fiber Fuel badges respectively. Never award a badge based on missing data

### Badge Logic
Two distinct badges. Both require the calorie threshold AND the macro threshold — it is AND logic, not OR.

**Protein Hit badge** — Mustard Gold (`#FFC107`):
- Awarded when: protein ≥ 20g AND calories < 500
- Tooltip on tap/hover: shows exact qualifying values (e.g. "High protein (28g) · Under 500 cal")

**Fiber Fuel badge** — Muted Sage Green (`#6B8F71`, stored as `badgeFiberGreen` in theme.ts):
- Awarded when: fiber ≥ 5g AND calories < 500
- Tooltip on tap/hover: shows exact qualifying values (e.g. "Good fiber (7g) · Under 500 cal")

An item can earn both badges simultaneously. Both display side by side on item cards and the item detail screen.

### Calorie Filter
- Both the daily calorie goal and the calorie filter input are optional — no blocking prompts if unset
- If a daily calorie goal is set in the user's profile, the filter screen pre-populates it as a suggested budget — user can override or clear it
- Items within budget: shown in main results section, sorted by calories ascending, grouped by restaurant
- Items over budget: shown in a dimmed secondary section labeled "Just over your limit" — never hidden entirely
- Items with missing calories: excluded from filter results entirely

### Chain Name Matching
- Primary lookup: `osm_aliases` table (exact match on `osm_name`)
- Fallback: Fuse.js fuzzy match against `canonical_name` values
- If no match is found: silently exclude the location from results — never show a restaurant with no nutrition data

### Caching
- Last-fetched Overpass results for a given coordinates + radius: cached in AsyncStorage with 24-hour TTL
- Menu items for any visited restaurant: cached in AsyncStorage with 24-hour TTL
- When serving cached data: show a subtle "Using cached data" banner
- User profile data: never cached — always fetch fresh

---

## UX Rules — Always Follow These

- **Dark mode only** — no light mode in MVP. All components are built for the Charcoal (`#121212`) background
- **Web is Priority #1** — every screen must be tested in the browser (Expo web) before being considered complete. The Vercel URL is the primary portfolio surface
- **Both platforms in parallel** — validate on Expo Go (mobile) and Expo web (browser) simultaneously. Never let web fall behind
- **Never show a broken image** — chain logo or food category emoji fallback must always render. No gray boxes, no broken image icons
- **Empty states must be helpful** — never show a blank screen. Always show a prompt or call to action
- **Error messages must be specific** — never show "Something went wrong." Tell the user exactly what failed in plain English
- **Loading states** — show a skeleton or spinner whenever data is being fetched
- **Missing data is honest** — display "Calories unavailable" or "—" exactly as specified. Never show 0 as a substitute for unknown
- **Optimistic updates** — UI should update immediately on user action, then sync to the database in the background
- **No modal dialogs for basic interactions** — use inline editing and bottom sheets for contextual actions
- **Platform-aware navigation** — bottom tab bar on mobile, top horizontal nav on web. Implemented via `Platform.OS` conditional in the root layout

---

## Current Build Phase

**We are currently in: Pre-Build**

Complete all three pre-build tasks before writing any app code. Do not skip or reorder them.

### Pre-Build Tasks (In Order)
1. **Mapbox compatibility check** — Confirm Expo managed workflow compatibility for the Mapbox React Native SDK. Resolve web map rendering via `mapbox-gl`. Recommend and implement the cleanest path. Document the decision in ARCHITECTURE.md
2. **MenuStat data prep + Supabase import** — Clean the MenuStat 2022 XLS file (ms_annual_data_2022.xls), define the `menu_items` table, run the import. Produce a data quality report (total items, missing calories count, missing macro counts, chains with highest gap rates)
3. **OSM alias table** — Build `osm_aliases` in Supabase with known name variations for the top 30 chains. Implement Fuse.js fuzzy match fallback. Test against real Overpass results before moving on

> **⚠️ Native Map Testing — Expo Go Cannot Be Used**
> `@rnmapbox/maps` requires native code that is not available in the Expo Go sandbox.
> Any issue or feature that involves rendering the map on a real device must plan for
> an **EAS Development Client build** instead of Expo Go for native testing.
> Web map testing via `pnpm expo start --web` works at any time with no build step.
> This applies to: the Nearby screen, the Radius View, map pins, and any future map feature.

After pre-build tasks are complete, proceed with the MVP build sequence defined in the PRD (Section 12).

---

## Environment Variables

The following environment variables are required. Never hardcode these values in code. Always use `.env.local` for local development and Vercel / EAS environment variable dashboards for production.

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=
EXPO_PUBLIC_APP_URL=
```

**`.gitignore` — required contents:**

Claude Code must confirm the following are all present in `.gitignore` before the first commit. Expo generates a base `.gitignore` on project init but it may not include all of these:

```
# Environment
.env.local
.env.*.local

# Expo
.expo/
dist/
web-build/

# Dependencies
node_modules/

# Native build artifacts
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*
*.hbc
android/
ios/

# System files
.DS_Store
*.pem

# EAS
.easignore
```

---

## GitHub Visibility

The repo is currently set to **PRIVATE** during development. Flip to **PUBLIC** on GitHub (Settings → Danger Zone → Change visibility) when ready to share with hiring managers.

Before going public:
- Confirm `.env.local` was never committed by running `git log --all --full-history -- .env.local` and confirming no results
- Confirm the Vercel URL is live and fully functional end-to-end
- Update `EXPO_PUBLIC_APP_URL` in Vercel environment variables

---

## EAS Configuration

EAS Build requires an `eas.json` file in the project root. Claude Code must create this during project setup with the following profile structure:

```json
{
  "cli": {
    "version": ">= 10.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

**Profile usage:**
- `development` — local development builds with dev client
- `preview` — direct APK (Android) and internal TestFlight (iOS) distribution for personal testing
- `production` — reserved for future App Store / Google Play submission (not in scope for MVP)

---

## Commands

```bash
# Install all dependencies
pnpm install

# Add a new Expo-compatible package (lets Expo pick the correct version)
pnpm expo install [package-name]

# Add a non-Expo package (utility libraries, e.g. Fuse.js)
pnpm add [package-name]

# Add a dev-only package
pnpm add -D [package-name]

# Run development server (opens Expo Go on mobile + browser option)
pnpm expo start

# Run web only (opens in browser at localhost:8081)
pnpm expo start --web

# Build for production (web → Vercel)
pnpm expo export --platform web

# Type check
pnpm exec tsc --noEmit

# Lint
pnpm exec eslint .

# EAS Build — iOS (TestFlight)
eas build --platform ios

# EAS Build — Android (APK)
eas build --platform android --profile preview
```

---

## Code Quality Rules

These rules apply to every file in every session. Never skip them, even for quick fixes or small changes.

### TypeScript
- Always use proper TypeScript types — never use `any`. If the type is unknown, use `unknown` and handle it properly
- Define types and interfaces in the `types/` folder so they can be shared across the project
- All function parameters and return values must be typed explicitly
- If TypeScript shows a type error, fix the root cause — never suppress it with `// @ts-ignore`

### Error Handling
- All Supabase queries and Overpass API calls must have try/catch blocks — unhandled errors must never reach the user
- Never show raw error messages from Supabase or the Overpass API to the user — translate them into plain English first
- Log errors to the console in development so they are visible during building

### Code Cleanliness
- Never leave commented-out code in files — if something is removed, delete it entirely
- No `console.log` statements in production code — use them during development but remove before committing
- Each file should do one thing — if a file is growing very large, ask before splitting it
- Keep components small and focused — if a component is longer than 150 lines, flag it for discussion

### Platform Awareness
- Use `Platform.OS` for any behavior that differs between mobile and web — never let web break silently
- Always test web rendering after any map or SVG-related change — these are the most likely to behave differently
- Never assume a React Native component renders correctly on web without checking

### Security
- Never hardcode API keys, tokens, or secrets anywhere in the codebase
- Always use environment variables prefixed with `EXPO_PUBLIC_` for client-side values
- `SUPABASE_SERVICE_ROLE_KEY` must never appear in any file that runs in the app — admin scripts only
- Always confirm `.gitignore` covers `.env.local` before any commit

---

## Package Management Rules

- **Always ask before installing any new package.** Tell me the package name, what it does, why it is needed, and whether a lighter alternative exists
- **Prefer packages already in the ecosystem** — if something can be done with Expo, Supabase, or NativeWind built-ins, do not add a new package
- **No packages for things that can be done natively** — do not install a date formatting library if the JavaScript `Intl` API handles it
- **Check bundle size** — mobile apps are size-sensitive. Flag any package that adds significant size before installing
- **Check Expo compatibility** — always confirm a package works in Expo managed workflow before installing. If it requires native code not supported by managed workflow, flag this before proceeding
- **Use the right install command:**
  - `pnpm expo install [package]` — for any package that has an Expo-compatible version. Expo's installer picks the correct version for your SDK automatically. When in doubt, use this
  - `pnpm add [package]` — only for packages with no Expo-specific version (e.g. Fuse.js, pure utility libraries)
  - `pnpm add -D [package]` — for development-only packages
  - Never use `npm install` or `yarn add` — this project uses pnpm and mixing package managers corrupts the lockfile
- After installing any package, briefly explain what was added and why
- On project setup, create a `.npmrc` file in the project root containing `use-pnpm=true` — this tells Expo's tooling to use pnpm instead of npm when running internal install commands

---

## Design System

All design tokens live in `constants/theme.ts`. Zero hardcoded color values anywhere in component code.

### Color Palette — Electric Diner

```typescript
// constants/theme.ts
export const colors = {
  // Core palette
  primary: '#C41E3A',        // Ketchup Red — buttons, CTAs, calorie ring fill
  secondary: '#2AF5FF',      // Electric Mint — protein/fiber indicators, Macro-Meter rings
  accent: '#FFC107',         // Mustard Gold — Protein Hit badge, star ratings
  background: '#121212',     // Charcoal — default background (dark mode only)
  surface: '#1E1E1E',        // Slightly lighter than background — cards, panels
  textPrimary: '#FFFFFF',    // Primary text on dark background
  textSecondary: '#A0A0A0',  // Secondary / metadata text

  // Badge colors
  badgeProtein: '#FFC107',   // Mustard Gold — Protein Hit badge
  badgeFiber: '#6B8F71',     // Muted Sage Green — Fiber Fuel badge

  // Status / feedback
  success: '#4CAF50',        // Success states
  error: '#DC2626',          // Error states, destructive actions
  warning: '#EA580C',        // Warning states
  border: '#2A2A2A',         // Subtle borders on dark background
  overlay: 'rgba(0,0,0,0.6)', // Modal overlays
}
```

### Typography
- **Display / App Name / Headers**: One retro-tech or chunky font — nod to fast food neon signage. Used sparingly for headers and the app name only. Never used for nutrition numbers or item names
- **Body / Menu Items / Nutrition Data**: Inter, DM Sans, or Outfit — legibility is non-negotiable when users are scanning calorie counts at a drive-thru
- **Rule**: Retro font = personality layer only. Clean sans-serif = everything the user needs to read quickly

### Component Primitives (Build Before Any Screens)
These shared components must be built before any individual screen is built:
- `Button` — primary (Ketchup Red fill), secondary (outlined), ghost (text only). Always include hover and focus states for web
- `Card` — dark surface background, subtle border, slightly rounded corners
- `Badge` — pill-shaped, accepts color prop. Used for Protein Hit, Fiber Fuel, and future status indicators
- `Input` — clean border, Electric Mint focus ring
- `SkeletonLoader` — used for all loading states

### Design Rules
- Dark mode only — no light mode in MVP
- Every screen must look polished from day one — do not defer styling
- Never use placeholder gray boxes as stand-ins for real UI — build the real component
- All interactive elements must have visible focus states (required for web keyboard navigation and accessibility)
- Icons: use Expo Vector Icons (already included in Expo — no additional install needed)
- Food category emoji are a design element, not a fallback for laziness — use them intentionally (🍔 🌮 🍕 🍗 🍟 🌯 🥗 🍦)

---

## Git Workflow & Repository Etiquette

### Branch Strategy
Always work on a feature branch — never commit directly to `main`. One branch per GitHub Issue.

```
main                              → always stable and deployable
└── feature/issue-1-setup         → one branch per issue
└── feature/issue-2-data-import
└── feature/issue-3-auth
└── fix/issue-12-map-render-bug
└── data/issue-2-menustat-import
```

Branch naming convention:
- New features → `feature/issue-[number]-[short-description]`
- Bug fixes → `fix/issue-[number]-[short-description]`
- Data work → `data/issue-[number]-[short-description]`
- Documentation updates → `docs/[short-description]`

### Commit Message Format

```
type: short description of what changed

Examples:
feat: add restaurant locator screen
feat: implement calorie filter with budget section
fix: resolve Mapbox web render crash
chore: install NativeWind
data: import MenuStat XLS to Supabase
docs: update STATUS.md after session
style: update badge colors to match Electric Diner palette
refactor: extract badge logic to utils
```

Commit types:
- `feat` — a new feature or piece of functionality
- `fix` — a bug fix
- `chore` — installs, config changes, non-functional updates
- `docs` — changes to documentation or markdown files
- `style` — UI or styling changes with no logic change
- `refactor` — code restructuring with no behavior change
- `data` — data prep, import scripts, or database migration files

### Pull Request Rules
- Every feature branch must be merged via a pull request — never merge directly to main
- Before opening a pull request, confirm the app runs without errors on both Expo Go and Expo web
- Pull request title must reference the GitHub Issue number: `feat: add calorie filter (#5)`
- Every pull request description must include `Closes #[issue number]` — this automatically closes the related GitHub issue when merged
- Once merged, delete the feature branch

### Before Every Commit — Checklist
- [ ] Does the app run without errors on Expo Go (mobile)?
- [ ] Does the app run without errors on Expo web (browser)?
- [ ] Are there any `console.log` statements to remove?
- [ ] Is `.env.local` listed in `.gitignore`?
- [ ] Does the commit message follow the format above?
- [ ] Is this change on a feature branch, not main?

---

## MCP Servers & Tooling

The following MCP servers are connected and available. Use them actively — they remove manual steps and reduce errors.

### Context7 — Live Documentation
Context7 provides real-time, version-specific documentation for all libraries in this project. Always use Context7 when generating code involving any of the following libraries to ensure documentation is current and not based on outdated training data:

- React Native / Expo
- Expo Router
- NativeWind
- Supabase (JS client)
- TanStack Query
- React Native SVG
- Mapbox GL JS
- Fuse.js
- TypeScript

**How to use:** Add `use context7` to any prompt where you need current library documentation.

```
Set up Supabase Auth with Expo Router and persist the session correctly. use context7
```

Context7 fetches the latest official documentation before generating code. This prevents deprecated patterns and hallucinated APIs — especially important for Expo and React Native where APIs change frequently between versions.

### Supabase MCP — Direct Database Access
Supabase MCP lets Claude Code query your live Supabase database directly. Use it to:
- Inspect the `menu_items` table after the MenuStat import to verify data quality
- Check row counts, sample data, and confirm RLS policies are applied correctly
- Debug queries without having to relay results back manually
- Verify migrations ran correctly before moving on

### GitHub MCP — Repository Management
GitHub MCP lets Claude Code manage the issue-based workflow without manual steps. Use it to:
- Create GitHub Issues for each feature before starting work
- Create feature branches tied to their issue
- Open pull requests with the correct title format and `Closes #[number]` in the description
- Confirm branch status and merge state

> GitHub personal access token configured with repo scope on selected repository only — required for Claude Code to read and update private repo issues. Token is stored in `~/.claude.json` and never committed to the repo.

**Standard session workflow using GitHub MCP:**
1. At session start: ask Claude Code to check open issues and confirm the current branch
2. At session end: ask Claude Code to commit, push, open a PR, and confirm it is ready to merge

### Vercel MCP — Deployment Management
Vercel MCP lets Claude Code interact with your Vercel deployment directly. Use it to:
- Check deployment status after a push to confirm the build passed
- Inspect build logs when a deployment fails
- Confirm the production URL is live and reflecting the latest changes
- Manage environment variables in the Vercel dashboard without opening a browser

**Transport:** HTTP via `https://mcp.vercel.com` — uses OAuth authentication. No personal token required. After adding the server, open Claude Code and run `/mcp` to complete the OAuth flow in the browser.

**Rule:** After every merge to main, use Vercel MCP to confirm the deployment succeeded before closing the session.

---

### MCP Setup Per Project

MCP servers are configured per project, not globally. Setup must be run from inside the project folder. Run these commands once when starting any new project:

```bash
# Navigate to the project folder first
cd /path/to/project

# Add each MCP server
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest
claude mcp add github -- npx -y @modelcontextprotocol/server-github
claude mcp add supabase -- npx -y @supabase/mcp-server-supabase@latest --access-token YOUR_TOKEN
claude mcp add --transport http vercel https://mcp.vercel.com
```

**Verify all four registered correctly:**
```bash
cat ~/.claude.json
```

**After adding Vercel:** Open Claude Code and run `/mcp` to complete the OAuth flow in the browser. This is required before the Vercel MCP tools become available.

**Supabase access token for this project:** Already stored in `.env.local` and `~/.claude.json` — no action needed.

**Plugins** (e.g. Google Drive) are global and require no setup per project.

---

## Before Your First Session — Product Owner Checklist

These are things only you can do. Complete all of them before asking Claude Code to start work.

**Required before first session:**
- ✅ Download the MenuStat 2022 XLS file (ms_annual_data_2022.xls) from [menustat.org/data.html](https://www.menustat.org/data.html) and save it somewhere accessible on your Mac
- ✅ Create a Supabase project at supabase.com. Collect three values from Settings → API and paste into `.env.local`: project URL, anon key, and service role key
- ✅ Create a Mapbox account at mapbox.com. Copy your default public access token into `.env.local`
- ✅ Create an empty GitHub repo named `mybigmacros` (or your chosen name). Do not initialize with a README — Claude Code handles the first commit
- ⚠️ Create a Vercel project at vercel.com connected to your GitHub account. Decide on your project name — this becomes your public URL (`[name].vercel.app`) — GitHub app installed and authorized — full project-to-repo connection completes in Issue #1
- ✅ Confirm Node.js is installed on your Mac by running `node --version` in terminal. You need v18 or higher. If missing, install via [nodejs.org](https://nodejs.org) (v25.9.0 confirmed)
- ✅ Confirm pnpm is installed by running `pnpm --version` in terminal. If missing: `npm install -g pnpm` (v10.33.0 confirmed)

**Deferred — not needed until later:**
- EAS CLI — only needed when building TestFlight/APK binaries. Install when ready: `pnpm add -g eas-cli`
- Supabase CLI — not required. Migrations are applied via the Supabase dashboard SQL editor
- Python — not required. The MenuStat import script uses Node.js

---

## GitHub Issues — Create Before Any Code

The issue-based workflow requires one GitHub Issue per feature. Ask Claude Code to create all MVP issues using GitHub MCP as its very first task in the first session. At minimum, issues are needed for:

1. Project setup (Expo + GitHub + Vercel + .npmrc + .gitignore + eas.json)
2. Mapbox compatibility check
3. MenuStat data prep + Supabase import
4. OSM alias table + Fuse.js fallback
5. Centralized theme.ts
6. Authentication + onboarding flow
7. Navigation structure (tabs + web nav)
8. Restaurant locator (Overpass + map + list view)
9. Nutrition browser (menu screen + item detail)
10. Macro-Meter visualization
11. Calorie filter screen
12. Badge system (Protein Hit + Fiber Fuel)

---

## What To Do At The Start of Every Session

1. Read this file completely
2. Read STATUS.md to confirm the current build phase and what was last completed
3. Ask me what I want to work on today
4. Confirm the current build phase before starting — never skip ahead to a later phase
5. Never assume context from a previous session — always ask if unsure
6. Use GitHub MCP to check open issues and confirm you are on the correct branch

---

*Last updated: April 2026*
*Product owner: Mallory Comes*
