# PRD — myBigMACros

> Product Requirements Document — Version 1.0 — April 2026
> This is the working source of truth for all product requirements. Update this file as requirements change. Always refer to this document before building any new feature.

---

## 1. Product Vision

myBigMACros is a mobile-first (also web) app for junk food lovers who want to be mindful of their calorie intake without being lectured about it. Users find fast food restaurants nearby, browse real nutrition data, and filter menu items that fit their available calorie budget — all without being nudged toward a salad.

**The core problem we are solving:** people who enjoy fast food have no tool that respects their choices while helping them make informed ones. Existing nutrition apps are built for dieters. myBigMACros is built for people who already know what they want — and just want to make it work within their day.

The app is inspired by the browsing experience of DoorDash, the saved-location UX of Starbucks, and the macro visualization of MyFitnessPal — but designed around junk food as the hero, not a guilty footnote.

---

## 2. App Philosophy

Every design and product decision must be evaluated against these principles:

| Principle | What It Means in Practice |
|-----------|--------------------------|
| Junk food first | Burgers, fries, pizza, and loaded nachos are the heroes. Healthy options exist but are never the default |
| Honest indulgence | The app respects that users know what they're getting into. No shame, no warnings, no guilt framing |
| Calorie awareness without guilt | Help users fit their cheat meal into their day — never lecture them about it |
| Healthy options available, not default | Lighter menu items are accessible via an explicit toggle. Off by default |
| Fast to scan, fast to decide | Users are often in a car at a drive-thru. Every screen must be readable and actionable in seconds |
| Web is a first-class platform | The Vercel web URL is the primary portfolio surface. Every screen must be fully functional and visually correct at desktop width (1280px+) and mobile |

---

## 3. Target Users

### Primary User — The Mindful Indulger

Someone who eats fast food regularly and wants to be aware of what they're consuming — not to avoid it, but to fit it into their day intentionally. They may track calories loosely in another app (Cronometer, Apple Health) or just have a rough daily number in their head.

Their core needs:
- Find what's nearby quickly without opening Google Maps or a separate nutrition site
- See calorie counts and macros without having to dig through a chain's official app
- Know at a glance which items fit their remaining budget
- Feel like the app is on their side, not judging their order

### Secondary User — The Hiring Manager / Portfolio Reviewer

A technical recruiter or hiring manager evaluating the developer's work via the Vercel URL. They are not the end-user of the product but are the most important viewer of the web experience.

Their core needs:
- A single URL that works instantly in any browser — no install, no sign-up friction barrier
- A visually polished, fully functional app that demonstrates real product thinking
- No broken states, placeholder screens, or "coming soon" sections anywhere in the flow

---

## 4. Release Phases Overview

| Phase | Focus | Primary Beneficiary |
|-------|-------|-------------------|
| MVP | Auth, restaurant locator, nutrition browser, calorie filter, basic profile, badge system | Solo users finding nearby fast food within a calorie budget |
| v1 | Macro filters, fitness tracker integrations, healthy option toggle, improved map, real food photos | Power users tracking macros and connecting existing health tools |
| v2 | Saved favorites, meal log, smart suggestions, calorie budget auto-calculation | Repeat users building habits and personalizing the experience |
| v3 | Social sharing, user reviews, gamification badges, friends/following | Community-driven engagement and app stickiness |
| Later | Menu item customization, AI meal combos, delivery app integration, price data, dietary filters | Advanced personalization and convenience |

---

## 5. MVP — Detailed Requirements

**MVP Goal:** A working, deployable app where a user can sign up, detect or enter their location, find nearby fast food chains from the MenuStat dataset, browse nutrition data, and filter menu items by an available calorie budget. Validated and fully functional on both web (Vercel) and mobile (Expo Go).

---

### 5.1 Pre-Build Tasks (Claude Code Must Complete Before Any App Code)

These tasks are prerequisites. Nothing else is built until they are complete.

#### 5.1.1 Mapbox Compatibility Check
Before writing any UI code, Claude Code must confirm whether the Mapbox React Native SDK works within Expo managed workflow without ejecting. If ejecting is required, evaluate the fallback: react-native-maps (Apple/Google Maps base) with a Mapbox custom style layer for dark mode visuals. Recommend and implement the cleanest path. Web map rendering must also be confirmed — use `mapbox-gl` (standard JS library) conditionally via `Platform.OS === 'web'` to ensure the map renders correctly in the Vercel/browser environment. This must not be left as a known broken state.

#### 5.1.2 MenuStat Data Preparation and Import
Download the MenuStat 2022 XLS file (ms_annual_data_2022.xls). Inspect the schema, clean and normalize the data (handle inconsistent formatting, missing values, column renaming), define the Supabase table structure, and write the one-time import script. Recommended tooling: Python + pandas for data prep, then Supabase CSV importer for the actual import.

Supabase table: `menu_items`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| chain_name | text | Normalized chain name matching alias table |
| item_name | text | |
| category | text | e.g. Burger, Side, Drink, Dessert |
| calories | integer | Nullable — see missing data rules in 5.6 |
| protein_g | numeric | Nullable |
| fat_g | numeric | Nullable |
| carbs_g | numeric | Nullable |
| fiber_g | numeric | Nullable |
| sodium_mg | numeric | Nullable |
| serving_size | text | Nullable |
| notes | text | Nullable — regional flags, limited time, etc. |
| created_at | timestamp | |

Claude Code must also produce a data quality report at import time: total items imported, count of items with missing calories, count of items with missing protein/fiber, and which chains have the highest rate of missing data. This report is for the developer's awareness before launch.

#### 5.1.3 OSM → MenuStat Name Mapping
Build a static alias table that maps OpenStreetMap chain name variations to the normalized MenuStat chain names. Examples: "BK" → "Burger King", "Checkers" → "Checkers / Rally's", "Carl's Jr." → "Hardee's / Carl's Jr.". Manually define aliases for the top 30 chains where naming inconsistency is most likely. Implement Fuse.js fuzzy matching as a runtime fallback for any unrecognized names. Use the OSM `brand` tag as the primary lookup before falling back to `name`. Store the alias table in Supabase as `osm_aliases`. This must be complete before any location search code is written.

---

### 5.2 Authentication & Account Management

#### User Experience
Account creation is required to use myBigMACros — there is no guest mode. The sign-up flow should be fast and low-friction. Users move from sign-up to the main app in under 2 minutes. The onboarding sequence collects only what is needed for the core experience.

#### Onboarding Sequence
1. Sign up with email and password
2. Enter name (required)
3. Upload profile photo (skippable — can be set later)
4. Set daily calorie goal (skippable — can be set later in profile)
5. Land on the main app (Nearby screen)

#### Functional Requirements
- Email and password sign-up with real-time validation (password strength indicator, email format check)
- Login and logout with persistent session (30-day default)
- Password reset via email with a secure, time-limited link (expires in 1 hour)
- Delete account with confirmation prompt, clear warning that all data will be permanently removed, and immediate data wipeout
- Session management via Supabase Auth (JWT-based)

#### UX Detail
- Login errors must use a single message for all sign-in failures: "The email or password you entered is incorrect. Please try again." Do not distinguish between unrecognized email and incorrect password — doing so enables email enumeration attacks where an attacker identifies valid accounts by comparing error responses
- Password reset emails must arrive within 30 seconds
- After skipping daily calorie goal at onboarding, a persistent but non-intrusive prompt in the Profile screen encourages the user to set it later — never a blocking interstitial

---

### 5.3 Restaurant Locator

#### User Experience
Opening the app and finding nearby fast food should take under 10 seconds. The map is the emotional centerpiece of the discovery experience — it must feel fast, premium, and immediately useful.

#### Location Detection
- On app open, request device geolocation permission
- If permission is granted: use device coordinates automatically
- If permission is denied or on web where the user declines the browser prompt: show a zip code / address entry field as the fallback — no error state, no degraded experience, both paths lead to identical results
- Web geolocation is supported via browser API but never mandatory

#### Functional Requirements
- Radius search options: 1, 5, 10, 25 miles — user selects before or after location is detected
- Query OpenStreetMap Overpass API for all fast food locations matching the MenuStat chain list within the chosen radius
- Match returned OSM chain names to MenuStat chains via the `osm_aliases` table, with Fuse.js fuzzy match fallback
- Display results on a map view and a list view — user can toggle between them
- Each result shows: chain name, chain logo, distance from user, and address
- Only chains with matching nutrition data in the MenuStat database are displayed — unmatched OSM results are silently excluded

#### Map View (The Radius View)
- Dark mode map using Mapbox custom style (Electric Diner theme)
- Chain logo pins for each restaurant location
- User location shown as a distinct marker
- Chosen radius rendered as a subtle glowing circle around the user's location
- Cluster pins when multiple restaurants are close together
- Tap any pin to see a preview card: chain name, distance, address, and a "Browse Menu" CTA
- Native mobile: react-native-maps or Mapbox React Native SDK (per compatibility check in 5.1.1)
- Web: `mapbox-gl` JS library rendered conditionally via `Platform.OS === 'web'`

#### List View
- Sorted by distance (nearest first) by default
- Each card shows: chain logo, chain name, distance, address
- Tap any card to open that restaurant's menu

---

### 5.4 Nutrition Data Browser

#### User Experience
Browsing a restaurant's menu should feel as natural as scrolling a food delivery app. Nutrition data is the product — it must be legible, scannable, and never hidden behind extra taps.

#### Functional Requirements
- Tap any restaurant (from map pin or list card) to open its full menu
- Menu items displayed with: item name, category, calories, protein (g), fat (g), carbs (g), fiber (g)
- Search / filter within a restaurant's menu by item name
- Tap any item to open the Item Detail screen

#### Item Detail Screen
- Full nutrition label view: calories, protein, fat, carbs, fiber, sodium, serving size
- The Macro-Meter visualization (see 5.7) showing how this item contributes to the user's daily calorie goal
- Protein Hit badge and/or Fiber Fuel badge displayed if the item qualifies (see 5.8)
- Badge tooltip on tap: shows which specific thresholds were met with exact values

#### Missing Data Rules
These rules apply whenever MenuStat data is incomplete. They are non-negotiable — Claude Code must implement exactly as specified:
- If **calories are missing**: exclude the item from all calorie filter results. The item still appears when browsing the full menu. Display "Calories unavailable" where the calorie number would appear — never show 0 or a blank
- If **protein, fat, carbs, fiber, or sodium are missing**: display "—" in place of the number. Never substitute 0g for missing data — 0g means zero, not unknown
- If **protein or fiber are missing**: the item is automatically ineligible for Protein Hit and Fiber Fuel badges respectively. Never award a badge based on missing data

---

### 5.5 Calorie Filter

#### User Experience
The calorie filter is the core utility of myBigMACros. It answers the question: "I have X calories to spend — what can I get?" It must be fast to use, require minimal input, and produce results that are immediately actionable.

#### Functional Requirements
- Calorie filter input is optional — users can browse menus without entering a budget
- User inputs available calories manually (e.g., "I have 1,200 calories to spend")
- If a daily calorie goal is set in the user's profile, the filter screen pre-populates with a suggested remaining budget as a convenience — user can override or clear it
- Filter results show menu items at or under the calorie threshold, grouped by restaurant, sorted by calories ascending within each group
- Items that exceed the budget are shown in a dimmed secondary section below the in-budget results, labeled "Just over your limit" — never hidden entirely
- Only items with calorie data are included in filter results (items with missing calories are excluded per 5.4 missing data rules)

#### Filter Screen Layout
1. Calorie input field (pre-populated if daily goal is set, otherwise empty)
2. Results: in-budget items grouped by nearby restaurant
3. Below results: "Just over your limit" dimmed section for items exceeding the threshold
4. Each item card in results shows: item name, chain logo, calorie count, and any applicable badges

---

### 5.6 User Profile

#### Functional Requirements
- Name (required — set at onboarding)
- Profile photo (optional — skippable at onboarding, editable at any time)
- Daily calorie goal (optional — skippable at onboarding, editable at any time in profile settings)
- Edit any profile field at any time
- If daily calorie goal is not set, the calorie filter input is simply empty with placeholder text — no error, no blocking prompt

#### Profile Screen
- Displays name, photo, and daily calorie goal
- Edit button opens inline editing for all fields
- Link to notification preferences (v1)
- Delete account option with confirmation prompt

---

### 5.7 The Macro-Meter

The Macro-Meter is the signature visualization of myBigMACros. It appears on every Item Detail screen and replaces static data tables as the primary way to understand a food item's nutritional contribution at a glance.

#### Visual Design
- A ring or arc visualization built with React Native SVG (works reliably on both Expo mobile and Expo web)
- Shows how the selected item's calories compare to the user's daily calorie goal as a filled arc
- If no daily goal is set, the Macro-Meter shows the item's absolute calorie count prominently without a comparative arc
- Separate smaller rings or indicators for protein and fiber, using Electric Mint (`#2AF5FF`) as the color
- Calorie fill uses Ketchup Red (`#C41E3A`)
- The visualization must render correctly on both mobile and web — this is non-negotiable given portfolio priority

#### Behavior
- Updates in real time if the user changes their daily calorie goal in profile settings
- If calories are missing for an item: display "Calories unavailable" state — no broken or empty ring

---

### 5.8 Badge System

Two distinct achievement badges are awarded to menu items that meet specific nutritional thresholds. Badges appear on item cards in browse and filter results, and on the Item Detail screen.

#### Protein Hit Badge
- **Color**: Mustard Gold (`#FFC107`)
- **Threshold**: ≥ 20g protein AND < 500 calories
- **Meaning**: High protein return relative to calorie cost
- **Tooltip on tap**: Shows "High protein (Xg) · Under 500 cal" with exact values

#### Fiber Fuel Badge
- **Color**: Muted Sage Green (approximately `#6B8F71` — defined as `badgeFiberGreen` in `theme.ts`)
- **Threshold**: ≥ 5g fiber AND < 500 calories
- **Meaning**: Good fiber content relative to calorie cost — more filling, slower burn
- **Tooltip on tap**: Shows "Good fiber (Xg) · Under 500 cal" with exact values

#### Badge Rules
- An item can earn both badges simultaneously if it meets both sets of thresholds — both badges display side by side on the item card
- If protein or fiber data is missing, the item is ineligible for the corresponding badge — never award a badge based on missing data
- Both badges use the same shape and typography so they read as a matched set — only color differentiates them
- Badge tooltip is triggered by tap on mobile and hover on web

---

### 5.9 Menu Item Images

| Phase | Approach |
|-------|----------|
| MVP | Restaurant chain logo as branded placeholder for all items from that chain + food category emoji (🍔 🌮 🍕 🍗 🍟 🌯 🥗 🍦) as item-level visual indicator |
| v1 | Manually add real food photos for top 50–100 most-used items; store in Supabase Storage |
| v2+ | Expand photo coverage; logos and emoji remain permanent fallback for any uncovered items |

**Rule**: Never display a broken image placeholder or generic gray box. A logo or emoji fallback must always render. This is a design requirement, not a nice-to-have.

---

### 5.10 Navigation Pattern

#### Mobile (iOS + Android)
Bottom tab bar with four tabs:

| Tab | Label | Content |
|-----|-------|---------|
| 1 | Nearby | Map/list restaurant locator |
| 2 | Browse | Search all chains without location requirement |
| 3 | Budget | Calorie filter and results |
| 4 | Profile | User profile and settings |

#### Web (Vercel)
Persistent top horizontal navigation bar with the same four sections. Conditionally rendered via `Platform.OS === 'web'`. Must be fully functional and visually correct at 1280px+ desktop width.

#### General Rules
- Navigation pattern is defined and built before any individual screens are built — it affects every downstream layout decision
- Both navigation implementations use React Navigation
- No bottom sheets as primary navigation — overlays are for contextual actions only (e.g., item detail preview from map pin tap)

---

### 5.11 Data Persistence
- All user data (profile, calorie goal) saved to Supabase in real time
- Nutrition data lives in Supabase `menu_items` table — queried on demand, not bundled in the app
- Cache last-fetched restaurant list and nutrition data for a given location + radius in AsyncStorage with a 24-hour TTL — enables graceful degradation on poor connections (drive-thru use case)
- Show a subtle "Using cached data" banner when the app is operating offline or on a cached result
- Data persists across sessions — users return to exactly where they left off

---

## 6. v1 — Macro Filters, Tracker Integrations & Enhanced Map

**v1 Goal:** Let power users filter by more than calories, connect to fitness tools they already use, and access a more capable map experience with real food photography for top items.

### 6.1 Macro Filters
- Optional filters layered on top of or independent of the calorie filter
- Filter options: minimum protein (g), maximum fat (g), maximum carbs (g), minimum fiber (g)
- UI toggle to switch between "Calorie Mode" (MVP default) and "Macro Mode"
- Filters can be combined freely
- Items with missing data for a filtered macro are excluded from results for that filter — consistent with MVP missing data rules

### 6.2 Fitness Tracker Integrations
- Apple Health (HealthKit) — native SDK integration, highest priority, largest iOS user overlap
- Cronometer — OAuth / calorie sync, pending API access confirmation before committing to v1
- Lose It! — OAuth / calorie sync, pending API access confirmation before committing to v1
- Google Fit — API / calorie budget sync

**Note for planning**: Confirm Apple HealthKit React Native integration path before v1 build begins. Cronometer and Lose It! require individual developer API access approval — treat as stretch goals until confirmed. Do not put them on the v1 roadmap as committed features until access is verified.

### 6.3 Healthy Option Toggle
- Off by default — never shown as the default experience
- Placed on the filter screen as a clearly secondary toggle, below all calorie and macro inputs
- Visually subordinate styling: smaller label, muted color (not Ketchup Red), clearly not the primary action
- Label: "Also show lighter options"
- When on: salads, wraps, grilled items, and lower-calorie options appear in results
- A visible but subtle indicator confirms when the toggle is active so users don't confuse the default experience

### 6.4 Improved Map Experience
- Cluster pins when multiple restaurants are close
- Tap a cluster pin to expand and see individual locations
- Tap a single pin to preview: restaurant name, distance, and top items within the current calorie budget
- "Near me now" vs. "Search this area" modes

### 6.5 Real Food Photos (Top Items)
- Manually curate real food photos for the top 50–100 most-used menu items
- Stored in Supabase Storage (free at this scale)
- Sourced from own photos, Wikimedia Commons (free license), or AI-generated food art (Adobe Firefly free tier)
- Chain logos and emoji remain permanent fallback for any uncovered items

---

## 7. v2 — Saved Favorites & Personalization

**v2 Goal:** Make the app feel personal and reduce friction for repeat users who have established fast food habits.

### 7.1 Favorite Restaurants
- Save specific restaurant locations (not just chains)
- Tag favorites with a custom nickname (e.g., "My Friday Spot", "Late Night Go-To")
- Quick-access favorites shelf on the home/Nearby screen
- Notification opt-in: alert when a favorite location is within a set distance

### 7.2 Favorite Menu Items
- Save specific menu items across any restaurant
- "My Usuals" shelf on the home screen
- Quick check: does a usual fit today's calorie budget?

### 7.3 Order History / Meal Log (Optional)
- Log what was eaten from a restaurant visit
- Basic history view — not a full food diary
- Used to surface personalized suggestions ("You usually order this at Wendy's")

### 7.4 Smart Suggestions
- Based on profile calorie goal and time of day, surface "good fits" from nearby restaurants
- Example: "You have 900 cal left today. Here's what fits at the Burger King 0.3 miles away."

### 7.5 Calorie Budget Auto-Calculation
- If daily goal is set and a tracker is connected (from v1), app auto-calculates remaining budget
- Manual input of already-eaten calories as an alternative to tracker sync
- Remaining budget pre-populates the calorie filter automatically

---

## 8. v3 — Social & Community Features

**v3 Goal:** Add light social elements to increase engagement and make the app stickier for existing users.

### 8.1 Cheat Meal Sharing
- Share a meal selection as a stylized card to Instagram, TikTok, X, and others
- Card shows: item name, restaurant logo, macro breakdown, and myBigMACros branding
- Share via native share sheet on mobile, clipboard/download on web

### 8.2 User Reviews & Ratings
- Rate individual menu items: taste, value, worth-the-calories
- Short text reviews
- Surface community top-rated items per restaurant

### 8.3 Gamification Badges
- Achievement badges: "Tried 10 different chains", "Stayed within budget 5 days in a row", "Burger Connoisseur"
- Opt-in only — never surfaced without user choosing to engage
- Distinct from the Protein Hit and Fiber Fuel nutrition badges

### 8.4 Friends & Following
- Follow friends and see their public cheat meals
- Social feed: "Your friend Sarah logged a Double Whopper at the Burger King near you"
- Privacy controls: public, friends only, or private

---

## 9. Tech Stack

### Framework & Language

| Layer | Tool | Status |
|-------|------|--------|
| Framework | React Native (Expo) | Confirmed |
| Workflow | Expo Managed Workflow | Confirmed — do not eject unless Mapbox forces it |
| Language | TypeScript | Confirmed |
| Navigation | React Navigation | Confirmed |

### Styling

| Layer | Tool | Status |
|-------|------|--------|
| Styling | NativeWind (Tailwind for React Native) | Confirmed |
| Theme File | Centralized `theme.ts` | Confirmed — ALL colors, fonts, spacing defined here. Zero hardcoded values in components |
| Component Library | Custom components | Confirmed — React Native Paper ruled out; Electric Diner aesthetic requires full design control |

### Backend & Data

| Layer | Tool | Status |
|-------|------|--------|
| Backend + Database | Supabase (PostgreSQL) | Confirmed |
| Auth | Supabase Auth | Confirmed |
| File Storage | Supabase Storage | Confirmed — profile photos and curated food images |
| Nutrition Data | MenuStat 2022 XLS → Supabase | Confirmed — one-time import, static dataset |
| Restaurant Search | OpenStreetMap Overpass API | Confirmed — free, no API key required |
| Name Mapping | `osm_aliases` table in Supabase | Confirmed |
| Fuzzy Match Fallback | Fuse.js | Confirmed |

### Map & Location

| Layer | Tool | Status |
|-------|------|--------|
| Map Rendering (mobile) | Mapbox React Native SDK or react-native-maps + Mapbox style (per compatibility check) | TBD — resolve in 5.1.1 |
| Map Rendering (web) | `mapbox-gl` JS library via `Platform.OS === 'web'` | Confirmed approach |
| Location Search | OpenStreetMap Overpass API | Confirmed — single tool, no fallback |

### Visualization

| Layer | Tool | Status |
|-------|------|--------|
| Macro-Meter / Charts | React Native SVG | Confirmed — reliable on both Expo mobile and Expo web |

### Dev & Deployment

| Layer | Tool | Status |
|-------|------|--------|
| Code Editor | Cursor | Confirmed |
| Version Control | GitHub | Confirmed |
| App Build | EAS Build (Expo cloud) | Confirmed |
| Web Hosting | Vercel free tier | Confirmed — primary portfolio URL, auto-deploys from GitHub |
| Icons | Expo Vector Icons | Confirmed |
| Push Notifications | Expo Notifications | Deferred to v2 |

---

## 10. Design System

### Color Palette — Electric Diner

| Role | Name | Hex | Usage |
|------|------|-----|-------|
| Primary | Ketchup Red | `#C41E3A` | Buttons, CTAs, calorie ring fill |
| Secondary | Electric Mint | `#2AF5FF` | Protein and fiber metric indicators, Macro-Meter rings |
| Accent | Mustard Gold | `#FFC107` | Protein Hit badge, star ratings, "best value" callouts |
| Background | Charcoal | `#121212` | Default background — dark mode only |
| Badge — Fiber | Muted Sage Green | `#6B8F71` | Fiber Fuel badge exclusively — defined as `badgeFiberGreen` in `theme.ts` |

**Dark mode is the default and only mode for MVP.** Light mode is not in scope.

All colors must be defined in `theme.ts` as named constants. No hex values are to appear anywhere in component code. This ensures the entire palette can be changed by editing one file.

### Typography
- **Display / Headers / App Name**: One retro-tech or chunky font — subtle nod to fast food neon signage. Used sparingly for headers only
- **Body / Menu Items / Nutrition Data**: Clean modern sans-serif (Inter, DM Sans, or Outfit) — legibility is non-negotiable when users are scanning calorie counts quickly
- **Rule**: The retro font is a personality layer only. Never use it for nutrition numbers, item names, or any data that requires fast reading

### Signature UI Components

**The Macro-Meter**: Ring/arc visualization on every Item Detail screen. Shows calorie contribution to daily goal. Built with React Native SVG. Ketchup Red for calorie fill, Electric Mint for protein/fiber rings.

**The Radius View**: Dark mode map with chain logo pins and a glowing radius circle around the user's location. The map is the star of the Nearby screen.

**Protein Hit Badge**: Mustard Gold badge displayed on item cards and detail screens for items with ≥ 20g protein AND < 500 calories.

**Fiber Fuel Badge**: Muted Sage Green badge displayed on item cards and detail screens for items with ≥ 5g fiber AND < 500 calories.

### Design References

| App | What to borrow |
|-----|---------------|
| Starbucks | Saved favorite locations UX, store finder map pattern |
| DoorDash | Restaurant card layout, menu item browsing, category filtering |
| MyFitnessPal | Calorie input flow, macro ring visualization |
| Yelp | Map ↔ list view toggle, radius/distance filtering |

---

## 11. Distribution Strategy

One codebase produces three outputs simultaneously. Features are built once and validated across all three environments as development progresses.

```
Single codebase (React Native + Expo + TypeScript)
        │
        ├── 🌐 Vercel  →  Web URL  →  Hiring managers / portfolio (PRIORITY #1)
        ├── 📱 TestFlight  →  iOS install  →  Personal use + friends/family testing
        └── 📦 Direct APK  →  Android install  →  Personal use + friends/family testing
```

| Method | Use Case | Cost |
|--------|----------|------|
| Vercel (web) | Portfolio / hiring managers | $0 |
| Expo Go | Development + early testing only | $0 |
| TestFlight (iOS) | Personal use + friends on iPhone | $99/yr Apple Dev account |
| Direct APK (Android) | Personal use + friends on Android | $0 |
| App Store / Google Play | Not in scope | — |

**Portfolio Requirements (Claude Code Must Follow)**:
- Web version must be the first thing that works end-to-end — not the last
- Every screen must be responsive and visually correct at 1280px+ desktop width and mobile
- The Vercel URL must always be live and always reflect the latest stable build via GitHub auto-deploy
- No broken states, placeholder screens, or "coming soon" sections visible at the web URL — hiring managers will click everything

---

## 12. Build Sequence

Claude Code must follow this sequence. Do not skip steps or reorder them.

1. **Project setup** — Initialize Expo managed workflow project with TypeScript. Set up GitHub repo. Connect to Vercel — live URL from day one even if the app is empty. Create `.npmrc`, `.gitignore`, and `eas.json`. This must exist before any other task can run.
2. **Mapbox compatibility check** — Confirm Expo managed workflow compatibility. Resolve web map rendering. Document the decision in ARCHITECTURE.md before writing any UI code.
3. **Data prep** — Write a Node.js script (`scripts/menustat_import.js`) using `xlsx` to clean the MenuStat 2022 XLS file (ms_annual_data_2022.xls), normalize chain names, and produce a data quality report. Import the cleaned data into Supabase via the dashboard. No Python required.
4. **OSM alias table** — Build `osm_aliases` in Supabase. Implement Fuse.js fallback. Test against real Overpass results before writing any location search code.
5. **Centralized theme file** — Create `constants/theme.ts` before any UI components. All Electric Diner colors, fonts, and spacing defined here. Zero hardcoded values anywhere else.
6. **Auth + user profile** — Supabase Auth. Onboarding flow (sign up → name → photo → calorie goal). Profile screen with edit capability.
7. **Core loop — mobile + web in parallel** — Build and validate on both Expo Go and browser before moving on: open app → location detected (or zip entry) → Overpass finds nearby chains → match to MenuStat via alias table → show menu → filter by calories → view item detail with Macro-Meter.
8. **Badge system** — Implement Protein Hit and Fiber Fuel badge logic, display on item cards and detail screens, with tap/hover tooltips.
9. **Vercel deploy of core loop** — Once the core loop works on web, deploy. This becomes the living portfolio URL. Keep it updated on every meaningful push.
10. **Tracker integration research** — Before v1 planning begins, confirm API access for Apple HealthKit, Cronometer, and Lose It!.

---

## 13. Cost Summary

| Component | Tool | Cost |
|-----------|------|------|
| Nutrition data | MenuStat CSV → Supabase | $0 |
| Restaurant location search | OpenStreetMap Overpass API | $0 |
| Map rendering | Mapbox GL JS | $0 (50k loads/mo free) |
| Auth + database + file storage | Supabase free tier | $0 |
| Menu item images (MVP) | Restaurant logos + emoji | $0 |
| Menu item images (v1+) | Supabase Storage (self-curated) | $0 |
| Web hosting | Vercel free tier | $0 |
| App build service | EAS Build free tier | $0 |
| iOS distribution (optional) | Apple Developer account | $99/yr |
| Android distribution | Direct APK | $0 |
| **Total (without TestFlight)** | | **$0** |
| **Total (with TestFlight)** | | **$99/yr** |

---

## 14. Out of Scope

| Feature | Status |
|---------|--------|
| Guest mode / no-account browsing | Excluded — account required for MVP |
| Menu item customization / build-your-own | Later — requires modifier logic on top of static data |
| AI-powered meal combos | Later — feasible post-MVP using Claude API |
| Full food diary | Excluded by design — use Cronometer or Lose It! for that |
| Grocery / home cooking nutrition tracking | Excluded by design |
| Strict diet programs (keto, IF fasting) | Excluded by design |
| Barcode scanner / custom food entry | Excluded — restaurant menu data only |
| Live / real-time menu data | Excluded — static MenuStat dataset is intentional |
| Non-fast-food restaurants (fine dining, sit-down) | Deferred to v3+ |
| Restaurant reservations | Excluded — fast food focus |
| Native app store distribution (App Store / Google Play) | Not in scope |
| Light mode | Not in scope for MVP |
| Price data | Later — not in MenuStat, difficult due to regional variance |
| Wearable sync | Later |
| Offline mode (full) | Later — partial caching in MVP per 5.11 |

---

## 15. Success Metrics

### MVP Success
- A user can sign up, detect or enter their location, find nearby chains, browse nutrition data, and filter menu items by calorie budget — end to end — in under 2 minutes
- Macro-Meter renders correctly on both mobile (Expo Go) and web (Vercel) for every item with calorie data
- No broken image states anywhere in the app — logo or emoji fallback always renders
- Missing nutrition data is displayed as "—" or "Calories unavailable" — never as 0 or a blank
- Protein Hit and Fiber Fuel badges display correctly on qualifying items and are never shown on items with missing data
- Core loop works end-to-end on Vercel with zero broken states or placeholder screens

### v1 Success
- Apple Health calorie sync populates the calorie filter pre-fill correctly
- Macro filters return accurate results consistent with the same missing data rules as MVP
- Real food photos cover at least the top 50 most-viewed menu items

### Long-Term Success
- Users report spending less time cross-referencing nutrition data across multiple apps
- Return visit rate indicates the app is part of regular fast food decision-making, not a one-time lookup tool

---

*Last updated: April 2026 — v1.0 initial release*
*Product owner: Mallory Comes*
