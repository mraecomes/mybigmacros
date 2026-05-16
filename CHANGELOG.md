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

## [May 15 2026] — Issue #11 — Calorie Filter Screen (budget input, accordion results, In Budget / Just Over Limit tabs)

### Added

- `app/(tabs)/budget.tsx` — full calorie filter screen: optional calorie input with 300ms debounce, profile pre-fill from `daily_calorie_goal` (with "Pre-filled from your daily calorie goal · Edit anytime" disclaimer), In Budget / Just Over Limit toggle pills with live item counts, accordion results grouped by restaurant sorted by distance ascending, items sorted by calories ascending within each group, location disclaimer showing extracted city name, CachedDataBanner when serving cached results, "No location set" empty state, "What can you get?" prompt when no budget is entered, "Nothing fits this budget" empty state, error state with retry, maxWidth 768 constraint on wide viewports
- `components/budget/BudgetRestaurantSection.tsx` — collapsible accordion component. Header shows chain name and two-letter initials circle (e.g. "MC" for McDonald's, "BK" for Burger King). Tapping expands or collapses the item list. Parent view is keyed by `activeTab` so all sections remount collapsed on every tab switch — intentional, prevents stale expanded state from carrying across tabs
- `components/budget/BudgetItemCard.tsx` — item card rendered inside each expanded accordion section; shows item name and calorie count
- `lib/supabase/menuItems.ts` — added `fetchMenuItemsBatch(chainNames: string[]): Promise<MenuItem[]>` — single Supabase query for multiple chain names using `.in()` filter; replaces the previous single-chain `fetchMenuItems` call for the budget screen context
- `lib/cache/menuCache.ts` — added `clearAllMenuCacheEntries()` (wipes all AsyncStorage keys starting with `menu_`) and `wipeMenuCacheIfNeeded()` (one-time guard using `menu_cache_v2_cleared` AsyncStorage flag — runs once per device to flush corrupted cache entries from the progressive loading attempt, never again)
- `lib/cache/lastSearchParams.ts` — utility for reading the last search coords and radius from AsyncStorage (`last_search_params` key), used by budget.tsx to load results without requiring a new Overpass query
- `playwright.config.ts` — Playwright configuration: Chromium only, 1 worker, 1 retry, HTML reporter writing to `tests/reports/issue-11-playwright-report/`, screenshot on all tests, video on retry, base URL `http://localhost:8081`
- `tests/issue-11-calorie-filter.spec.ts` — 24-test Playwright suite across three describe blocks: Standard Flow (19 tests covering all ACs, edge cases, and UI behaviors), No Location (2 tests), Profile Pre-fill (3 tests). Route intercepts for Supabase auth and profile endpoints; localStorage seeding via `addInitScript` for location cache, restaurant list, and menu items
- `tests/reports/issue-11-qa-report.md` — complete QA report documenting all bugs found and fixed, manual testing checklist, and final test results
- `tests/reports/issue-11-playwright-report/` — HTML report with 16 screenshots from the final clean passing run

### Fixed

- **Cache corruption from progressive loading** — an earlier iteration of `loadMenuItems` called `setCachedMenuItems(name, byChain.get(name) ?? [])`, which wrote empty arrays to AsyncStorage for any chain that returned no results from `fetchMenuItemsBatch` (e.g. a name mismatch or chain not in the DB). On the next visit, `getCachedMenuItems` returned the empty array as a valid cache hit, causing the chain to appear permanently menu-less until the 24hr TTL expired. Fixed by reverting to a collect-then-set pattern and only calling `setCachedMenuItems` when `items && items.length > 0`. `wipeMenuCacheIfNeeded()` added to flush any corrupted entries already written to devices
- **Progressive loading state removed** — `loadingChains` (`Set<string>`) and its associated skeleton rows were introduced alongside the progressive loading approach and had no purpose after the revert. Removed entirely — state declaration, all `setLoadingChains` calls, and the render block iterating the set
- **Playwright tests wiping seeded menu data** — 16/24 tests failed with 30-second timeouts after `wipeMenuCacheIfNeeded()` was added to `loadData`. Each test starts with a fresh localStorage; `seedLocalStorage` seeded `menu_McDonald's` and `menu_Burger King` but not the `menu_cache_v2_cleared` flag, so the wipe fired on every test mount and deleted the seeded data before `loadMenuItems` could read it. The Supabase route intercept returned `[]` for all `menu_items` requests, leaving results empty. Fixed by adding `localStorage.setItem('menu_cache_v2_cleared', '1')` to `seedLocalStorage`'s `addInitScript` callback

### Decisions Made

- **Results in two toggle tabs, not stacked sections** — "In Budget" and "Just Over Limit" implemented as toggle pills rather than two vertically stacked sections. Keeps the list focused on one group at a time; live item count on each pill gives the user an immediate read on what's available without scrolling
- **100-calorie ceiling for "Just Over Limit"** — items between budget+1 and budget+100 calories appear in the Just Over Limit tab; items more than 100 cal over budget are excluded from both tabs. Matches PRD Section 5.5
- **Accordion sections keyed by `activeTab`** — `<View key={activeTab}>` wrapping all `BudgetRestaurantSection` instances causes React to remount every accordion as collapsed on tab switch. Defense against stale open/closed state persisting across In Budget ↔ Just Over Limit transitions
- **`wipeMenuCacheIfNeeded()` called at the start of `loadData`** — runs once per device via `menu_cache_v2_cleared` AsyncStorage flag. Placed first in `loadData` so the wipe completes before any cache reads run, ensuring no corrupted entry is served as a cache hit during the same session it is cleared

### QA Results

- **Result:** PASSED
- **Automated:** 24 passed, 0 failed
- **Manual:** all scenarios passed
- **Not tested:** profile loading skeleton (timing-dependent, requires network throttling controls), AsyncStorage persistence across hard browser reloads (verify in Chrome DevTools → Application → Local Storage), native Expo Go behavior on physical device

---

## [May 12 2026] — Issue #10 — Macro-Meter React Native SVG Visualization

### Added

- `components/nutrition/MacroMeter.tsx` — Macro-Meter visualization built with React Native SVG. Main ring: full-circle arc (Ketchup Red `#C41E3A`) fills proportionally from 12 o'clock (`rotation={-90}`) against the user's daily calorie goal; arc visually caps at full circle when over goal, but the percentage label shows the real number (e.g. "124% of goal"). Calorie count and percentage centered inside the ring via `SvgText`. Protein and fiber: two side-by-side semicircle arcs (Electric Mint `#2AF5FF`) below the main ring, filled proportionally against FDA daily values (50g protein / 28g fiber); fiber arc rendered at 55% `strokeOpacity` to visually differentiate without hiding data. DV tooltip (FontAwesome `info-circle`) on each arc label — hover on web (`onHoverIn`/`onHoverOut` on Pressable), tap-to-toggle on mobile (`onPress`). Protein tooltip: `left: 0`, opens rightward toward center. Fiber tooltip: `right: 0`, opens leftward toward center — neither clips on mobile. Three calorie states: (1) calories null → "Calories unavailable", no ring rendered; (2) no daily goal set (null or 0) → empty ring track with calorie count prominently centered, no arc; (3) normal → filled arc + count + percentage. Protein or fiber null → "Not available" text vertically centered in a fixed-height combined zone matching the data-present column height, no arc, no tooltip icon
- `react-native-svg@15.12.1` — installed via `pnpm expo install`; SDK 54 compatible. Renders identically on Expo web and Expo Go. Chosen over Victory Native per ARCHITECTURE.md decision (reliable web rendering, full shape control)

### Changed

- `app/item/[id].tsx` — replaced Macro-Meter stub `View` with `<MacroMeter />`. Added second `useQuery` with `queryKey: ['profile']` and matching `queryFn` to supply `daily_calorie_goal`; TanStack Query serves cached profile data instantly — no extra Supabase call. When the user updates their calorie goal in Profile and returns to an item screen, the arc reflects the new goal immediately via the `queryClient.setQueryData` already in place in `profile.tsx`. Removed `macroMeterStub` and `macroMeterStubText` styles

### Fixed

- **"Not available" pinned to top of column** — original null state placed "Not available" in `arcTopZone` (height 28px) with `arcSvgZone` (height 76px) sitting empty below it. Text appeared at the top of the combined space rather than the center. Fixed by collapsing both zones into a single `arcNullZone` (height 104px = 28 + 76) with `justifyContent: 'center'` — text is now vertically centered at the midpoint of where the arc would sit, and both columns read as visually equivalent regardless of data availability

### Deferred

- **Arc entry animation** — arcs render as static fills. Animating the stroke on mount via `Animated` + `strokeDasharray` was considered but skipped to keep cross-platform rendering simple and reliable for MVP

### Decisions Made

- **Arc visually caps at 100%, label shows real percentage** — the ring fills completely at or above goal (no visual overflow), but the percentage label is uncapped and shows the true number (e.g. "124% of goal"). Acts as a visual warning — full red ring signals over-goal without the arc wrapping in a confusing direction. Original plan capped both; changed after UAT feedback
- **"Not available" replaces empty arc for null protein/fiber** — an empty arc track could be misread as "0% of daily value." Showing "Not available" with no SVG rendered is honest and consistent with the app's missing-data policy. Fixed equal-width columns (`arcNullZone` matching `arcTopZone + arcSvgZone` height) prevent layout shift between data-present and null states
- **Tooltip anchor side tied to column position** — protein (left column) uses `left: 0` so the tooltip extends rightward toward screen center; fiber (right column) uses `right: 0` so the tooltip extends leftward. `anchorSide: 'left' | 'right'` prop passed from `MacroRow` → `MacroArc`. Both 150px tooltips stay within their column on any typical mobile screen width
- **`onHoverIn`/`onHoverOut` on Pressable for web hover** — available in React Native 0.74+. No-ops on native, so `onPress` handles the mobile tap. No platform branching or TypeScript casting required — clean cross-platform API
- **Fiber arc at 55% `strokeOpacity`** — applied only to the Electric Mint fill stroke (not the track, gram value, or label). Gives visual hierarchy between protein and fiber without dimming text or hiding information
- **Daily calorie goal via shared TanStack Query cache** — `item/[id].tsx` uses the same `queryKey: ['profile']` as `profile.tsx`. TanStack deduplicates the query; the profile is already in cache from earlier in the session and returns instantly. When the user updates their goal in Profile, `queryClient.setQueryData(['profile'], updated)` in `profile.tsx` updates the shared cache — the Macro-Meter reflects the change immediately on return to the item screen with no extra network call or additional plumbing

---

## [May 10 2026] — Issue #37 — TanStack Query Migration (profile, restaurant/[id], item/[id]; nearby restaurant fetch deferred)

### Added

- Nothing net-new — this issue was a migration and refactor of existing screens

### Changed

- `app/(tabs)/profile.tsx` — migrated from manual `loadProfile` useCallback + `useFocusEffect` + `visibilitychange` useEffect to TanStack `useQuery`. Removed manual loading/error/profile state. Mutations (`saveEdit`, `handleChangePhoto`, `handleRemovePhoto`) use `queryClient.setQueryData(['profile'], updated)` for instant cache updates. Retry uses `void refetch()`. `visibilitychange` useEffect removed — `refetchOnWindowFocus: true` on the global QueryClient handles tab-focus refetch
- `app/restaurant/[id].tsx` — migrated from manual useState/useEffect with cancelled-flag pattern to TanStack `useQuery`. Added `MenuQueryResult` type `{ items: MenuItem[]; cachedAt: number | null }`. queryFn checks AsyncStorage cache first (returns early on hit), fetches on miss, stores to cache
- `app/item/[id].tsx` — migrated from manual useState/useEffect to TanStack `useQuery`. Removed all local state (zero useState/useEffect after migration). queryFn throws on null item to unify the error path — no separate null-check branch needed
- `app/(tabs)/nearby.tsx` — geo query migrated from a manual `useEffect` on mount to TanStack `useQuery` with `staleTime: 30 * 60 * 1000`, `retry: false`, `refetchOnWindowFocus: false`. Sync `useEffect` watching `geoQuery.data` and `geoQuery.isError` gains `locationStatus === 'requesting'` guard — prevents background geo refetches from overwriting coords set manually by `handleLocationSave`. `await supabase.auth.getSession()` added as first line of geo queryFn to serialize behind any in-progress Navigator Lock operation on page load. Restaurant fetch remains on manual useState/useEffect (see Deferred)
- `lib/overpass/nearbyChains.ts` — all Supabase calls removed. `matchChainName` call removed (was firing 200+ individual per-element alias queries via `Promise.all`). Function signature updated to `fetchNearbyChains(coords, radiusMiles, aliasMap: Map<string, string>, canonicalNames: string[])`. Full `osm_aliases` table fetch + `get_chain_names` RPC moved to the caller. Alias lookup and Fuse.js fuzzy match now done entirely in-memory from the passed-in data — no per-element network requests

### Fixed

- **Navigator Lock cascade error on page load** — geo queryFn racing with Supabase auth initialization caused a lock steal cascade. Fixed by awaiting `supabase.auth.getSession()` at the top of the geo queryFn to queue it behind any in-progress lock operation before geolocation runs
- **Geo refetch overwriting manual coords** — with TanStack's default `staleTime: 0`, background geo refetches completed and the sync `useEffect` unconditionally overwrote `coords` with device values, destroying a manually-entered location. Fixed by setting `staleTime: 30 * 60 * 1000` and adding the `locationStatus === 'requesting'` guard
- **200+ simultaneous Supabase requests causing ERR_INSUFFICIENT_RESOURCES** — `fetchNearbyChains` called `matchChainName` in `Promise.all` for every Overpass element. Each call fired one Supabase `.maybeSingle()` against `osm_aliases`. Saturated the browser connection pool. Fixed by moving Supabase calls to the caller and passing pre-fetched data into `fetchNearbyChains`

### Deferred

- **nearby.tsx restaurant fetch — not migrated to useQuery** — Supabase calls inside a TanStack queryFn are blocked by the Web Locks API after a manual location change. queryFn enters isLoading but `fetchNearbyChains` never reaches the Overpass request. The `await supabase.auth.getSession()` fix resolves the page-load race but not the post-interaction case. Reverted to original useState/useEffect. Tracked as Issue #39. Possible path: `useMutation` instead of direct state updates in `handleLocationSave`

### Decisions Made

- **`await supabase.auth.getSession()` as Navigator Lock synchronization point** — queues the geo queryFn behind any in-progress auth lock on page load without requiring changes to AuthContext or _layout.tsx
- **`staleTime: 30 * 60 * 1000` on geo query** — device location doesn't meaningfully change within a 30-minute session; prevents unnecessary re-requests and eliminates the stale-refetch → sync-useEffect → coords-overwrite loop
- **`locationStatus === 'requesting'` guard on sync useEffect** — once `locationStatus` moves to `'granted'` or `'manual'`, the sync useEffect is permanently disabled, preventing any future geo refetch from overwriting coords. Defense in depth alongside staleTime
- **Move Supabase calls from nearbyChains.ts to the caller** — `fetchNearbyChains` had no React context. Moving the two Supabase calls to `loadRestaurants` gives them normal browser execution context where the Navigator Lock behaves correctly. `fetchNearbyChains` is now a pure function: Overpass fetch + in-memory matching only
- **Navigator Lock contention filed as Issue #39** — `useMutation` instead of direct state updates in `handleLocationSave` may give TanStack the scheduling context it needs before the queryFn fires. Tracked explicitly so the investigation path is not lost

---

## [May 9 2026] — Issue #9 — Nutrition Browser (Restaurant Menu Screen + Item Detail Screen)

### Added

- `app/restaurant/[id].tsx` — restaurant menu screen. Fetches all menu items for the tapped chain from Supabase (`fetchMenuItems`). SectionList with sticky category headers, sorted in insertion order from the database. `MenuSearchHeader` (React.memo, top-level definition) renders a search bar that filters visible sections by item name. Item count in header shows "X of Y items" when a filter is active. AsyncStorage 24hr cache via `getCachedMenuItems` / `setCachedMenuItems`; CachedDataBanner shown when serving from cache. Skeleton loading (8 rows), error state with retry, empty-menu state, no-results state for search. Back button navigates to previous screen
- `app/item/[id].tsx` — item detail screen. Displays full nutrition panel: calories (large display, "Calories unavailable" when null), protein, fat, carbs, fiber, sodium, serving size. Missing macros show "—" (never 0). Protein Hit badge (≥20g protein AND <500 cal, Mustard Gold) and Fiber Fuel badge (≥5g fiber AND <500 cal, Muted Sage Green) displayed below the item name when criteria are met; ineligible when the relevant macro is null. Back navigation
- `lib/supabase/menuItems.ts` — `fetchMenuItems(chainName: string): Promise<MenuItem[]>`. Queries `menu_items` table filtered by `chain_name` with case-insensitive exact match. Returns all columns; throws on Supabase error
- `lib/cache/menuCache.ts` — `getCachedMenuItems(chainName)` / `setCachedMenuItems(chainName, items)`. AsyncStorage read/write. 24hr TTL. Cache key: `menu_{chainName}`. Returns `{ items, fetchedAt }` on hit for CachedDataBanner age display

### Changed

- `lib/supabase/client.ts` — removed `pendingLocks` Record and entire `processLock` function (~35 lines). Removed `lock: processLock` from `createClient` auth options. Supabase now uses its own `navigatorLock` on web, which includes steal-recovery (steal after 5s timeout, refuses to steal back to prevent cascades). `consumePendingRecovery()` and `_pendingRecovery` hash detection unchanged
- `app/_layout.tsx` — (1) split combined `TOKEN_REFRESHED || USER_UPDATED` handler into two separate handlers: `TOKEN_REFRESHED` uses a functional `setAuthState` updater that updates the session only when already authenticated or in recovery — prevents calling `resolveProfile` on token refresh and avoids a race condition where a fresh profile fetch could overwrite in-flight auth state; `USER_UPDATED` remains a no-op. (2) Added `visibilitychange` `useEffect` (web only): calls `supabase.auth.getSession()` when tab regains focus; if session is null, sets auth state to unauthenticated. Guards against expired sessions that went undetected while the tab was backgrounded. (3) QueryClient instantiated with `defaultOptions: { queries: { refetchOnWindowFocus: true } }` so TanStack Query hooks automatically refetch on tab focus
- `app/(tabs)/profile.tsx` — (1) `loadProfile` converted to `useCallback`; `useFocusEffect` wraps it so profile reloads on every navigation focus. (2) Added `visibilitychange` `useEffect` (web only) with `[loadProfile]` dependency — triggers `loadProfile()` on browser tab focus, matching the layout's session recovery pattern. (3) Error state: when profile is null after load completes, shows "Could not load profile." with a "Try again" `Pressable` button instead of a blank screen

### Fixed

- **Idle-session deadlock (permanent loading spinner after 20+ min idle on web)** — root cause: the custom `processLock` (Issue #7) only intercepts `GoTrueClient._acquireLock()` Path B (when no lock is currently held). When the app idles and `autoRefreshToken` fires, the GoTrue client is already inside a lock (`lockAcquired = true`), so it queues via Path A (`pendingInLock`), bypassing the external lock and any timeout entirely. The operation completes without releasing `pendingInLock`, leaving the next operation permanently queued. Fix: remove `processLock` entirely and let Supabase default to `navigatorLock` on web. `navigatorLock` (auth-js v2.105.1) includes its own steal-recovery: steals an orphaned lock after 5s, and refuses a steal-back to prevent cascades. The scenario that caused the deadlock (`pendingInLock`) never involves the external lock, so no external lock implementation can fix it — only removing the custom lock resolves it
- **Search field losing focus when query returns no results** — two separate issues. First: `MenuSearchHeader` was defined as an arrow function inside `RestaurantScreen`; a new function reference on each render caused `SectionList`'s `ListHeaderComponent` to unmount and remount the input, dropping focus. Fixed by defining `MenuSearchHeader` as a top-level `React.memo` component with stable type identity. Second: `searchHeader` was rendered in two different tree positions (inside SectionList's `ListHeaderComponent` when results exist, and again in a sibling fragment for the no-results empty state); React treats different tree positions as different components and remounts. Fixed by rendering `searchHeader` at a single fixed position in the root View, always above `renderContent()`, conditioned only on `items.length > 0` (stable during typing). `renderContent()` no longer contains the search bar at any path
- **Profile screen blank on session errors** — if `getSession()` returned null or the Supabase query threw, `loadProfile` left `profile` as null and `loadingProfile` as false, rendering an empty screen with no affordance. Fixed by adding an explicit error state with "Could not load profile." text and a retry button
- **TanStack Query hooks not refetching on tab focus** — `QueryClient` was instantiated with no options, leaving the default `refetchOnWindowFocus: false`. Any screen using `useQuery` hooks would serve stale data after the tab was backgrounded and returned. Fixed by passing `defaultOptions: { queries: { refetchOnWindowFocus: true } }` to the QueryClient constructor in `_layout.tsx`

### Decisions Made

- **Remove processLock entirely rather than patch it** — the idle-session deadlock originates in Path A of `GoTrueClient._acquireLock()`, which runs entirely inside the GoTrue client and never calls the external lock function. No amount of timeout logic in `processLock` can intercept this path. The only correct fix is to let Supabase manage its own locking. Supabase's `navigatorLock` (the web default) is more capable than the custom implementation: it handles cross-tab coordination (not needed here, but harmless) and includes tested steal-recovery logic. The original reason for `processLock` (preventing Navigator Lock cascade errors on page load — Issue #7) is handled by `navigatorLock`'s steal-recovery, not by removing the lock
- **Fixed tree position for MenuSearchHeader** — the standard React pattern of passing a component as `ListHeaderComponent` causes remount whenever the parent re-renders with a new function reference. Memoization of the element (not just the component) plus a single fixed render slot is the only reliable way to keep a TextInput mounted and focused across parent state changes. This pattern applies to any focusable element near a dynamically-sized list
- **visibilitychange as session recovery signal** — `useFocusEffect` fires on Expo Router navigation focus, not on browser-tab focus. On web, a user switching away from the app tab and returning will not trigger `useFocusEffect`. `visibilitychange` fills this gap: it fires on tab restoration and is the correct browser primitive for "user returned to this tab" detection. Two separate instances: one in `_layout.tsx` (checks session validity) and one in `profile.tsx` (reloads profile data)
- **Functional updater for TOKEN_REFRESHED** — using `setAuthState(prev => ...)` instead of reading `authState` directly avoids a stale closure: the handler captures `authState` at registration time (always `{ status: 'loading' }`), so a direct reference would always produce the wrong result. The functional updater reads the current state at call time, making the update correct regardless of when the token refresh fires

---

## [May 8 2026] — Issue #8 — Restaurant Locator (Geolocation + Overpass API + Map + List View)

### Added

- `types/restaurant.ts` — LocationCoords, OverpassElement, and RestaurantResult types shared across the locator feature
- `lib/overpass/nearbyChains.ts` — Overpass API query for amenity=fast_food + amenity=restaurant within a chosen radius. Haversine distance calculation. Two-pass coordinate deduplication (by coordinate before matching; by canonicalName + coordinate after). Parallel matchChainName() calls; unmatched results silently excluded. 15s AbortController timeout with specific error messaging
- `lib/cache/locationCache.ts` — AsyncStorage read/write for Overpass results. 24hr TTL. Cache key: nearby_{lat.toFixed(3)}_{lng.toFixed(3)}_{radius}. Returns { results, fetchedAt } on cache hit so the banner can show age
- `components/nearby/RadiusSelector.tsx` — pill button group for 1 / 5 / 10 / 25 mile radius selection. Active pill uses Ketchup Red fill; inactive uses surface background
- `components/nearby/CachedDataBanner.tsx` — "Showing saved results · Updated Xm ago" banner rendered above the controls bar when serving from cache
- `components/nearby/LocationFallbackInput.tsx` — standalone zip/city input with Mapbox Geocoding API. Kept in codebase for potential reuse; replaced in nearby.tsx by inline edit mode
- `components/restaurant/RestaurantCard.tsx` — list card with chain name as text (not initials circle), distance in Ketchup Red, address in secondary color, chevron right

### Changed

- `app/(tabs)/nearby.tsx` — full implementation replacing the Issue #2 stub. Device geolocation on mount (web: navigator.geolocation, native: expo-location). Inline location edit mode: "Change" transforms the location label into a pre-filled TextInput with Save / Cancel inline; auto-opens when geolocation is denied. Responsive split layout (flex 6/4 map/list on ≥768px; stacked with map/list toggle on mobile). Controls bar: radius pills on left, location indicator on right on wide screens. lastFetchRef deduplication guard prevents redundant refetches on identical params. All loading, error, empty, timeout, and no-results states handled with specific copy and a retry button
- `components/map/MapView.web.tsx` — major rewrite. createPinElement(): 36px Ketchup Red circle with 2-letter initials, white text, drop shadow. createUserLocationElement(): 16px cyan dot with glow. circlePolygon(): 64-step GeoJSON polygon for radius ring rendered as GeoJSON fill + line layers. PinPreviewCard: name, distance, address, Browse Menu button, × dismiss. computeCardPosition(): captures container rect at click time, clamps card horizontally so it never overflows left or right, flips placement above/below pin based on available space — card is always fully visible regardless of pin position
- `components/map/MapView.native.tsx` — updated to accept full MapViewProps API (pins, userLocation, radiusMiles, onPinClick) for parity with web. Props noted as deferred until EAS Build step; native component renders map and user location dot only
- `types/map.ts` — MapPin expanded with distanceMiles? and address? fields. MapViewProps expanded with pins?, userLocation?, radiusMiles?, and onPinClick?
- `package.json` / `pnpm-lock.yaml` — expo-location ~19.0.8 added via pnpm expo install

### Fixed

- **Location edit container shifting left on click** — locationEditContainer had flex: 1, which in a space-between row caused it to expand from the RadiusSelector position rather than staying right-aligned. Fixed by removing flex: 1 and applying a computed inline width (half the list pane width, min 200px on wide screens; full width on narrow)
- **Browser blue focus ring on location TextInput** — browser default outline overrode the custom border color. Fixed by adding className="outline-none" to suppress the browser ring, and using an editFocused boolean state to apply borderColor: colors.secondary on focus, matching the existing Input.tsx pattern
- **Pin preview card edge clipping** — card position was computed from pin screen coordinates without knowing the map container bounds, causing cards near the map edge to render partially off-screen. Fixed by capturing containerRect.width and containerRect.height at click time and passing them to computeCardPosition(), which clamps horizontal position and flips vertical placement above/below pin depending on available space

### Decisions Made

- **Chain initials circles on map pins, not logos** — chain logo download deferred until the chains table and Supabase Storage structure are defined. Plan: download ~100 logos via Brandfetch at that point, upload to Supabase Storage, add logo_url to chains table. Initials circles are a functional intentional placeholder
- **Chain name as text on list cards** — list context benefits from full readable text, not an initials abbreviation. Initials are used only on map pins where space is constrained by the 36px circle
- **Both amenity=fast_food and amenity=restaurant queried from Overpass** — necessary to include sit-down MenuStat chains (Denny's, IHOP, Applebee's) that OSM tags as amenity=restaurant rather than amenity=fast_food. Removing restaurant would silently drop those chains from all results
- **Inline edit mode over a separate fallback input section** — clicking "Change" transforms the location label in-place into a pre-filled TextInput with Save/Cancel. Cleaner than expanding a second input section below the controls bar; consistent with the inline editing pattern used on the profile screen
- **OSM as restaurant location source (known limitation)** — OSM is crowd-sourced and occasionally has stale coordinates or missing address tags for individual locations. Accepted as an MVP tradeoff for a free, no-API-key location source. Address shows "Address unavailable" when OSM tags are missing — never a blank or a zero. Supplement with Mapbox Places API in a later version if needed
- **"Browse Menu" navigation wired but screen deferred** — tapping Browse Menu in the pin preview card or a restaurant list card calls router.push to /restaurant/[id]. The route does not exist yet; Expo Router falls back to the map tab. Full navigation completes in Issue #9

---

## [May 7 2026] — Issue #7 — Navigation Structure (Web Top Nav + Mobile Tab Bar)

### Added

- `components/navigation/TopNav.tsx` — web-only top nav component. Wide layout (≥768px): horizontal nav items with icon + label, 2px Ketchup Red underline on active item. Narrow layout (<768px): hamburger icon that toggles a dropdown menu with 3px left bar active indicator. Uses `usePathname()` for active state, `useWindowDimensions()` for responsive breakpoint. All colors from `theme.ts`, routes typed as `Href`

### Changed

- `app/(tabs)/_layout.tsx` — platform-split navigation: `TopNav` rendered above `Tabs` on web, tab bar hidden via `tabBarStyle: { display: 'none' }` on web, headers shown on mobile and hidden on web. Native tab bar behavior unchanged
- `app/_layout.tsx` — two web-specific fixes: (1) loading state now renders `<View style={{ flex: 1, backgroundColor: colors.background }} />` on web instead of `return null` — prevents white flash during auth/font load; (2) `fontError` captured from `useFonts`, `fontsReady = loaded || !!fontError` prevents indefinite block on font load failure
- `lib/supabase/client.ts` — replaced Navigator Locks API with `processLock` (inline in-memory promise-chain serializer) on web via `auth: { lock: processLock }`. Added URL hash detection for `PASSWORD_RECOVERY` at module load time before Supabase clears the hash. Removed the module-level `onAuthStateChange` subscription that was racing Supabase's `initialize()` for the lock. Exported `consumePendingRecovery()` for `_layout.tsx` to consume the flag on `INITIAL_SESSION`
- `app/(tabs)/browse.tsx` — removed `fontFamily` from placeholder `Text` inline styles; simplified to system font to prevent invisible-text paint window on web
- `app.config.ts` — `web.output` changed from `'static'` to `'single'` to enable Metro's `HistoryFallbackMiddleware`, which serves the SPA `index.html` for all URL paths — required for direct URL navigation to any tab route

### Fixed

- **White screen on direct URL navigation** — `expo-splash-screen` is a complete no-op on web (all functions are empty stubs). `return null` during font/auth loading showed the browser's white default background with no cover. Fixed by returning a dark background `View` on web during loading state
- **Navigator Lock cascade error #1 — "Lock was released because another request stole it"** — module-level `onAuthStateChange` in `client.ts` competed with Supabase `initialize()` for the Navigator Lock. Both operations had 5s timeouts; one stole the lock from the other, causing `INITIAL_SESSION` to fire with `null` → auth went unauthenticated → redirected to login. Fixed by removing the module-level subscription; `PASSWORD_RECOVERY` detection moved to URL hash inspection at module load time
- **Navigator Lock cascade error #2 — "Lock broken by another request with the 'steal' option"** — `profile.tsx` called `supabase.auth.getSession()` on mount, acquiring the Navigator Lock with no timeout (`-1`). Raced against `INITIAL_SESSION`'s 5s-timeout lock acquisition; when INITIAL_SESSION timed out and stole the lock, `getSession()` received a DOMException. Fixed by replacing Navigator Locks API entirely with `processLock` — a promise-chain serializer with no timeouts or steals
- **Browse screen blank/invisible text** — `browse.tsx` had `fontFamily: typography.fontFamily.body` (`Inter_400Regular`) in inline styles. On web, there is a brief paint window after `@font-face` registration where newly-mounted DOM elements with a custom `fontFamily` render invisibly. Budget, nearby, and profile did not trigger this because they either used no custom font or had loading states that delayed text rendering. Fixed by removing `fontFamily` from the placeholder screen entirely
- **Font load failure blocking app indefinitely** — `useFonts` returns `[loaded, error]` but `error` was not captured. A font load failure left `loaded = false` permanently and the app never exited its loading state. Fixed by capturing `fontError` and computing `fontsReady = loaded || !!fontError`

### Decisions Made

- **`web.output: 'single'` replaces `'static'`** — `'static'` generates per-route HTML at build time (SSG) which breaks auth-guarded routes that cannot be pre-rendered. `'single'` generates one `index.html` and activates Metro's `HistoryFallbackMiddleware`, which serves it for all URL paths — correct for an auth-guarded SPA. The `'static'` setting from Issue #1 was the architectural root cause of the direct-URL white screen
- **`processLock` (in-memory promise-chain) over Navigator Locks API on web** — this app is single-process with no cross-tab state; Navigator Locks adds cross-tab coordination overhead plus 5s steal timeouts that cascade when multiple async auth operations compete on page load. `processLock` serializes all auth operations via a promise chain with zero timeouts — no steals, no timeouts, no cascades. `@supabase/auth-js` exports its own `processLock` internally but as a transitive dependency it cannot be imported directly; the inline implementation is functionally identical
- **URL hash detection at module load for PASSWORD_RECOVERY** — Supabase processes the URL hash (`type=recovery`) during `initialize()` and clears it before React renders. By the time `useEffect` registers the `onAuthStateChange` listener, the hash is already gone and only `INITIAL_SESSION` replays. Reading `window.location.hash` at module load time (before Supabase runs) is the only reliable detection point. The flag is consumed exactly once in the `INITIAL_SESSION` handler via `consumePendingRecovery()`
- **`fontFamily` omitted on placeholder/stub screens on web** — any `Text` with a custom `fontFamily` that mounts during initial load can render invisibly for a brief window while the browser applies the registered `@font-face`. Placeholder and stub screens must not apply `fontFamily` in inline styles; use `StyleSheet.create` with a font-loaded guard only in screens with real content

---

## [May 6 2026] — Sessions 7–8: Issue #6 — Authentication + Onboarding Flow

### Added

- `lib/supabase/auth.ts` — auth helper functions: `signUp`, `signIn`, `signOut`, `resetPassword`, `updatePassword`, `getProfile`, `createProfile`, `updateProfile`, `deleteAccount`, `uploadProfilePhoto`. All functions throw on error; callers translate to plain-English messages
- `lib/supabase/AuthContext.tsx` — React Context providing `refreshProfile` callback. Used by `onboarding.tsx` to trigger profile resolution and transition to authenticated state after profile creation without requiring a full auth event
- `types/auth.ts` — `Profile`, `OnboardingStep`, and `AuthState` types. `AuthState` is a discriminated union: `loading | unauthenticated | onboarding | authenticated | recovery`. Re-exports `Session` from Supabase so the rest of the app has a single import path
- `app/onboarding.tsx` — 3-step multi-step onboarding (name → photo → calorie goal). Dot progress indicator at the top. Photo selection via `expo-image-picker` (optional, skippable). Calorie goal optional. On finish, calls `createProfile` then `refreshProfile` to transition auth state to authenticated
- `app/(auth)/update-password.tsx` — password recovery screen shown after clicking a recovery email link. Password strength bar + real-time confirm match indicator (same patterns as signup). On success, calls `signOut` and navigates to login
- `components/ui/AppName.tsx` — styled app name implementing the pun in typography. "my"/"ros" in Bungee at small size in Ketchup Red; "Big"/"MAC" in Bungee at large size in Mustard Gold. Two size presets: `default` (40px/96px) for auth and onboarding screens, `header` (18px/32px) for tab bar headers. Rendered as a row of four `Text` spans aligned on baseline
- `supabase/migrations/20260505000000_add_delete_user_fn.sql` — `delete_user()` SQL function with `SECURITY DEFINER`. Deletes the calling user's row from `public.profiles` then from `auth.users`. Required because the Supabase anon client cannot delete from `auth.users` without service role privileges; `SECURITY DEFINER` lets the function run with creator privileges
- `supabase/migrations/20260505000001_make_profile_photos_bucket_public.sql` — sets the `profile-photos` Storage bucket to public. Required for `getPublicUrl()` to return URLs accessible by the `Image` component without auth headers
- `@react-native-async-storage/async-storage` — installed via `pnpm expo install` for mobile session persistence through Supabase's auth storage adapter
- `expo-image-picker` — installed via `pnpm expo install` for profile photo selection from camera roll on both mobile and web

### Changed

- `app/_layout.tsx` — full session guard implemented. Subscribes to `onAuthStateChange` on mount; resolves profile and updates `AuthState` on auth events. `useAuthGuard` hook reads current segments and redirects to the correct screen based on auth status. Intercepts `PASSWORD_RECOVERY` to set recovery state. Skips `TOKEN_REFRESHED` and `USER_UPDATED` to prevent premature navigation. `AuthContext.Provider` wraps the tree so `refreshProfile` is available to any screen. Imports `consumePendingRecovery` from `client.ts` to detect recovery flows that fired before the listener registered
- `app/(auth)/login.tsx` — full implementation replacing scaffold stub. AppName component at top, updated tagline ("Fuel Your Cravings. Hit Your Macros." at 20px, centered), email + password inputs, single error message for all sign-in failures, loading state disabling the button
- `app/(auth)/signup.tsx` — full implementation. AppName component, real-time email format validation (clears on correction), password strength bar (weak/fair/strong) hidden when confirm field is focused, real-time confirm-password match indicator in green/red, inline confirmation card shown when Supabase email confirmation is enabled
- `app/(auth)/reset.tsx` — AppName component added, instruction text and error text centered, successCard constrained to 600px max-width on web
- `app/(auth)/_layout.tsx` — `update-password` screen registered with `headerShown: false` to suppress the default Expo Router route-name header label
- `app/(tabs)/_layout.tsx` — `headerShown: true` added with `AppName size="header"` as a custom `headerTitle`, `headerTitleAlign: 'center'`, `headerShadowVisible: false`
- `app/(tabs)/browse.tsx` — all Issue #5 design system placeholder content removed (Button variants, Card, Badge, Input, SkeletonLoader preview). Now an empty dark screen ready for the nutrition browser in a later issue
- `app/(tabs)/profile.tsx` — full implementation replacing scaffold stub. Profile photo (or initials fallback) with tap-to-edit options (Change Photo / Add Photo / Remove Photo shown inline below avatar). Name and calorie goal fields with inline edit mode and validation. Calorie goal prompt shown when goal is unset. Sign out button. Delete account with two-tap confirmation card (red border, warning copy, irreversible action language)
- `components/ui/Input.tsx` — web max-width (600px) applied via a wrapping `View` on web rather than `alignSelf` on `TextInput` directly. `alignSelf` was unreliable in deeply nested flex containers. `onFocus`/`onBlur` now composed: internal `focused` state and any external handlers passed as props both run on each event
- `components/ui/Button.tsx` — 600px max-width constraint applied on web to match input field width
- `lib/supabase/client.ts` — `AsyncStorage` adapter added for mobile session persistence. `detectSessionInUrl: Platform.OS === 'web'` enables automatic recovery token extraction from URL on web. Module-level `onAuthStateChange` listener added that sets `_pendingRecovery = true` on `PASSWORD_RECOVERY`; `consumePendingRecovery()` exported so `_layout.tsx` can consume the flag during `INITIAL_SESSION` handling

### Fixed

- **Sign-up redirect not working** — `onAuthStateChange` listener was filtering for only `SIGNED_IN` and `TOKEN_REFRESHED` events. After `signUp()`, Supabase fires `INITIAL_SESSION` (not `SIGNED_IN`) when email confirmation is disabled. Removed the event-type filter; any non-null session now proceeds to profile resolution
- **PASSWORD_RECOVERY timing gap** — Supabase fires `PASSWORD_RECOVERY` during async client initialization, before React's `useEffect` runs and registers the `_layout.tsx` listener. When the listener does register, Supabase only replays `INITIAL_SESSION`, not the original event. Fixed by registering a module-level listener in `client.ts` at import time (runs before React renders) that captures the event in `_pendingRecovery`. The `_layout.tsx` listener consumes that flag on `INITIAL_SESSION` to correctly route to the update-password screen
- **TOKEN_REFRESHED overwriting recovery state** — after `PASSWORD_RECOVERY` set auth state to `recovery`, Supabase immediately fired `TOKEN_REFRESHED`. Our handler called `resolveProfile` for that event, which set auth state to `authenticated` and navigated to tabs before the user could set a new password. Fixed by making `TOKEN_REFRESHED` a no-op in the handler
- **USER_UPDATED racing update-password screen navigation** — `supabase.auth.updateUser()` fires `USER_UPDATED` via `onAuthStateChange`. Our handler forwarded it to `resolveProfile` → `authenticated` → tabs navigation, racing the update-password screen's own success path. Fixed by making `USER_UPDATED` a no-op; the screen handles its own post-update navigation
- **Sign out unreachable on profile screen** — `ScrollView` had `justifyContent: 'center'` with `flexGrow: 1` on `contentContainerStyle`. With a 300px avatar plus fields plus buttons, content exceeded viewport height. The container was fixed at viewport height, clipping the Sign Out button below the fold where it could not be scrolled to. Fixed by removing `justifyContent: 'center'`
- **Profile photo not displaying** — the `profile-photos` Storage bucket was private. `getPublicUrl()` returned URLs that required auth headers; the `Image` component loaded nothing. Fixed by making the bucket public via SQL `UPDATE`
- **Old photo persisting after new upload** — uploads use a fixed path (`userId/avatar.jpg`), so the URL returned by `getPublicUrl()` was identical for every upload and the browser served the cached previous image. Fixed by appending `?t={Date.now()}` to the public URL; this cache-busting timestamp is stored in `profile_photo_url` in the database so it persists across sessions
- **Input max-width not applying in nested flex containers** — `alignSelf: 'center'` on `TextInput` was unreliable when the input was deeply nested inside multiple flex containers (signup, onboarding, profile). Fixed by wrapping `TextInput` in a `View` with the constraint on web, applied uniformly inside the `Input` component's web branch
- **Password strength bar visible when typing confirm password** — the strength bar remained visible when focus moved to the confirm field, making it appear to belong to the wrong input. Fixed using a `confirmFocused` boolean state that hides the strength bar while the confirm field has focus. Required composing `onFocus`/`onBlur` in `Input` so both internal focus tracking and external handlers both fire
- **"update-password" route label in screen header** — Expo Router's default Stack header displayed the route name as a visible text label in the top-left. Fixed by registering the screen in `(auth)/_layout.tsx` with `headerShown: false`
- **Reset screen successCard stretching full width on web** — the "Check your email" confirmation card after requesting a password reset had no max-width constraint. Fixed by adding the standard 600px web constraint to the `successCard` style

### Decisions Made

- **Single error message for all login failures** — login errors always show "The email or password you entered is incorrect. Please try again." regardless of whether the email is unrecognized or the password is wrong. This prevents email enumeration attacks (an attacker probing which email addresses have accounts) and simplifies the UX. Explicitly chosen over the PRD's original spec of distinguishing the two error cases
- **Onboarding detection via profiles row existence** — no schema change required. A session with no matching row in `profiles` means the user is mid-onboarding. A session with a profiles row means they've completed onboarding. This makes onboarding run exactly once per account with zero additional columns
- **profile-photos bucket made public** — private bucket would require generating a signed URL on every render, adding latency and complexity. Profile photos are not sensitive content, so public read access is appropriate. The bucket only accepts writes from authenticated users via RLS
- **Cache-busting timestamp stored in the database URL** — `?t={timestamp}` is stored in `profile_photo_url` in Supabase, not appended at render time. This keeps the stored URL unique per upload permanently and requires no render-time logic. Trade-off: the URL in the database includes the cache-buster suffix
- **TOKEN_REFRESHED and USER_UPDATED treated as no-ops in auth listener** — token refresh does not change the user's identity or profile. Password update (USER_UPDATED) is handled by the update-password screen's own navigation logic. Calling `resolveProfile` for either event caused race conditions and premature navigation to tabs

---

## [May 4 2026] — Session 6: Issue #5 — Electric Diner Design System

### Added

- `components/ui/Button.tsx` — three variants: primary (Ketchup Red fill), secondary (outlined), ghost (text only). Web hover state via `Platform.OS` guard using `onMouseEnter`/`onMouseLeave`. Electric Mint focus ring via `onFocus`/`onBlur`. Disabled state at 50% opacity. Uses `Pressable` as the base for cross-platform press handling
- `components/ui/Card.tsx` — reusable dark surface container. Surface background, 1px border, `radii.md` corner radius, `spacing.lg` default padding. Accepts `style` prop for caller overrides
- `components/ui/Badge.tsx` — pill-shaped label. `color` prop sets background dynamically (passed as hex from `theme.ts`). `textColor` defaults to white. Inter SemiBold 600 at 11pt. Used for Protein Hit and Fiber Fuel badges
- `components/ui/Input.tsx` — single-line text input with Electric Mint focus ring. `onFocus`/`onBlur` toggle `borderColor` between `colors.border` and `colors.secondary`. `className="outline-none"` suppresses browser default blue focus ring on web. Forwards all `TextInputProps` via spread
- `components/ui/SkeletonLoader.tsx` — animated pulsing rectangle for loading states. `Animated.loop` + `Animated.sequence` pulses opacity 0.3 → 0.7. `useNativeDriver: Platform.OS !== 'web'` — native driver unsupported for opacity animation in React Native Web
- `@expo-google-fonts/bungee@^0.4.1` — Bungee Regular font, bundled in app (no network request at runtime). Installed with `pnpm expo install` for SDK 54 compatibility
- `@expo-google-fonts/inter@^0.4.2` — Inter Regular, SemiBold, Bold font weights, bundled in app. Installed with `pnpm expo install`

### Changed

- `constants/theme.ts` — expanded with three new exports alongside existing `colors`: `typography` (fontFamily names for Bungee/Inter weights, fontSize scale xs→3xl, lineHeight tokens), `spacing` (xs→3xl scale), `radii` (sm, md, lg, full)
- `tailwind.config.js` — `theme.extend` populated with Electric Diner color palette (all 13 colors matching `theme.ts`) and `fontFamily` entries for NativeWind className support (`font-display`, `font-body`, `font-body-semibold`, `font-body-bold`)
- `app/_layout.tsx` — `useFonts` call updated: SpaceMono removed, Bungee_400Regular + Inter_400Regular + Inter_600SemiBold + Inter_700Bold added. SpaceMono was the Expo scaffold default and is not part of the Electric Diner design system
- `app/(tabs)/browse.tsx` — updated with component preview for visual verification (all 5 UI primitives rendered with all variants). This screen will be replaced with the nutrition browser in Issue #9
- `app/+not-found.tsx` — fixed pre-existing typed route error: `href="/"` changed to `href="/(tabs)/nearby"`. With Expo Router's `typedRoutes` experiment enabled, `"/"` is not a valid route since there is no `app/index.tsx`
- `components/ui/.gitkeep` — deleted; directory is now tracked via real component files
- `package.json` / `pnpm-lock.yaml` — updated with `@expo-google-fonts/bungee` and `@expo-google-fonts/inter`

### Decisions Made

- **Bungee for display, Inter for body** — Bungee Regular is inherently heavy, so no bold variant is needed for the display role. Inter Regular (400), SemiBold (600), and Bold (700) cover all body use cases. Medium (500) was not loaded — three weights is sufficient and keeps the bundle leaner
- **`tailwind.config.js` inlines hex values (not a `require()` of `theme.ts`)** — `tailwind.config.js` is CommonJS and cannot directly `require()` a TypeScript file. Hex values are duplicated with a comment pointing to `constants/theme.ts` as the source of truth. Any color change requires updating both files
- **`className="outline-none"` for Input focus ring** — on web, React Native's `TextInput` renders as an HTML `<input>` element. The browser paints a default blue `outline` on focus that overrides the custom `borderColor`. NativeWind's `outline-none` class suppresses the browser outline; our `borderColor: colors.secondary` becomes the sole visible focus indicator. Zero effect on native
- **`useNativeDriver: Platform.OS !== 'web'` in SkeletonLoader** — React Native Web's animation system does not support the native driver for opacity changes. Using `true` on web causes a runtime warning and the animation silently fails. Platform-conditional driver selection fixes this on both platforms
- **SpaceMono removed from font loader** — SpaceMono was auto-generated by the Expo project scaffold (Issue #1) and was never part of the Electric Diner design system. Removing it from `useFonts` reduces the font bundle with no functional loss. The font file remains in `assets/fonts/` untouched

---

## [May 3 2026] — Session 5: Issue #4 — OSM Alias Table + Fuse.js Chain Name Matching

### Added

- `supabase/migrations/20260503000002_create_osm_aliases_table.sql` — DDL migration. Creates `osm_aliases` table with `osm_name text not null unique` (enforces one OSM name → one canonical name, fast index for exact lookups), `chain_name text not null`, RLS enabled, public SELECT policy
- `supabase/migrations/20260503000003_seed_osm_aliases.sql` — 172 alias rows across 46 chains. Covers abbreviations (BK, DQ, BWW), missing apostrophes (McDonalds, Wendys), full brand names (Kentucky Fried Chicken → KFC, Saint Louis Bread Company → Panera Bread), punctuation variants (Chick-fil-A, Chick-Fil-A, Chickfila → Chick Fil A), and separator variants (Checker's Drive-In/ Rally's has 7 aliases)
- `supabase/migrations/20260503000004_create_get_chain_names_fn.sql` — SQL function `get_chain_names()` returning `SELECT DISTINCT chain_name FROM menu_items`. Created to work around PostgREST's 1000-row server-side result cap, which caused direct `menu_items` queries to return only 4 chains (alphabetically first), breaking fuzzy match for all other chains
- `supabase/migrations/20260503000005_add_einstein_bagels_alias.sql` — Added `('Einstein Bros. Bagels', 'Einstein Bros')` after real-world Overpass test revealed OSM tags this chain with a period after "Bros." that existing aliases missed
- `lib/supabase/client.ts` — Single Supabase client export for the entire app. Uses `createClient()` from `@supabase/supabase-js`. Throws at initialization time if `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY` are missing — catches misconfiguration at startup rather than silently returning bad data
- `types/matching.ts` — TypeScript types for the matching subsystem: `OsmAlias`, `ChainMatchResult` (`canonical`, `source: 'exact' | 'fuzzy'`, `score: number | null`), `ChainMatchInput` (`brand?`, `name?`)
- `lib/matching/chainMatcher.ts` — Two-step chain name matching pipeline: (1) exact lookup in `osm_aliases` via `.maybeSingle()`, (2) Fuse.js fuzzy match against canonical chain names from `get_chain_names()`. Module-level cache for canonical names and Fuse.js index — initialized once per process. Exports `_resetCacheForTesting()` to clear cache between test cases. Alias lookup errors fall through to fuzzy rather than failing hard
- `scripts/test_chain_matcher.ts` — 14-case unit test suite covering Issue #4 acceptance criteria: exact alias hits (BK, Checkers, McDonalds), fuzzy misspellings (Burger Kng), threshold guards (Wendy's NOT Denny's), brand/name fallback priority, empty/whitespace inputs
- `scripts/test_overpass_match.ts` — Real-world Overpass API integration test. Queries fast food within 5km of Desert Ridge Marketplace, Phoenix AZ. Passes all returned OSM `brand`/`name` tags through `matchChainName()` and reports match rate. Result: 15/15 MenuStat chains matched (100%); 9 correctly returned null (regional chains not in MenuStat)
- `@supabase/supabase-js` — Supabase JS client. Installed with `pnpm add` (not `pnpm expo install`) — pure JS library, no Expo-specific version
- `fuse.js` — Fuzzy matching library. Installed with `pnpm add` — pure JS utility, no Expo-specific version
- `tsx` (dev) — TypeScript runner for test scripts. Also automatically loads `.env.local` in Node.js context
- `dotenv` (dev) — Explicit `.env.local` loader used as an additional guard in test scripts for CJS import hoisting compatibility

### Changed

- `package.json` / `pnpm-lock.yaml` — updated with `@supabase/supabase-js`, `fuse.js`, `tsx`, and `dotenv`
- `lib/supabase/.gitkeep` — deleted; replaced by `client.ts`
- `lib/matching/.gitkeep` — deleted; replaced by `chainMatcher.ts`

### Decisions Made

- **`chain_name` column name (not `canonical_name`)** — matches the existing `chain_name` column in `menu_items`. Consistent naming avoids ambiguity when joining or cross-referencing tables. Decision made mid-session after initial plan used `canonical_name`
- **`osm_name UNIQUE` constraint** — enforces one-to-one OSM → canonical mapping and creates an implicit index for fast exact lookups. If OSM ever uses two different names for the same chain, two separate alias rows are correct; a single OSM name pointing to two different chains would be a data error
- **`get_chain_names()` SQL function for PostgREST row limit** — PostgREST's server-side default caps all query results at 1000 rows and cannot be overridden by the client `.limit()` call. Direct `SELECT * FROM menu_items` returned only the first 1000 of 26,237 rows (alphabetically, only 4 chains). A SQL function returning `SELECT DISTINCT chain_name` returns 95 rows — well under the cap. Cleaner than pagination and avoids fetching 26k rows when only 95 chain names are needed
- **Fuse.js threshold 0.3** — empirically validated: "Burger Kng" → "Burger King" scores 0.196 (passes); "Wendy's" → "Denny's" correctly blocked (score > 0.3). `ignoreLocation: true` set because full-string chain name comparison has no meaningful concept of substring position
- **Dynamic `import()` pattern for test scripts** — TypeScript compiles static `import` statements to `require()` calls hoisted to the top of the compiled file. If `client.ts` is a static import, it is evaluated before `dotenv.config()` runs, causing the "missing env vars" error. Using `await import('../lib/matching/chainMatcher')` inside an async function defers `client.ts` evaluation until after dotenv has populated the environment
- **`curl` for Overpass API in test scripts** — Node.js 22+ built-in fetch (`undici`) sends `Accept-Encoding: br, gzip, deflate` by default. Overpass API's Apache server rejects Brotli with a 406 Not Acceptable error. Header overrides are ignored by `undici`. `curl --compressed` works correctly. This issue is specific to Node.js scripts — in the app's Metro bundler context, `fetch` behaves normally

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

*Last updated: May 15 2026*
*Product owner: Mallory Comes*
