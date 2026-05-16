import { BudgetRestaurantSection } from '@/components/budget/BudgetRestaurantSection';
import { CachedDataBanner } from '@/components/nearby/CachedDataBanner';
import { Input } from '@/components/ui/Input';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { getLastSearchParams } from '@/lib/cache/lastSearchParams';
import { getCachedResults } from '@/lib/cache/locationCache';
import { getCachedMenuItems, setCachedMenuItems, wipeMenuCacheIfNeeded } from '@/lib/cache/menuCache';
import { fetchMenuItemsBatch } from '@/lib/supabase/menuItems';
import { supabase } from '@/lib/supabase/client';
import type { MenuItem } from '@/types/menu';
import type { Profile } from '@/types/auth';
import type { RestaurantResult } from '@/types/restaurant';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

type RestaurantGroup = {
  restaurant: RestaurantResult;
  items: MenuItem[];
};

/** Defensively extract city from an OSM address string. Any failure returns null. */
function extractCityFromAddress(address: unknown): string | null {
  try {
    if (typeof address !== 'string' || !address.trim()) return null;
    const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
    // Scan from index 1 onward — skip the street address (index 0)
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      // Skip: 2-char state abbreviations, zip codes, and anything starting with a digit
      if (part && part.length > 2 && !/^\d/.test(part)) {
        return part;
      }
    }
    // Fallback: index 0 if it looks like a city (no leading digit, not a state abbrev)
    const first = parts[0];
    if (first && first.length > 2 && !/^\d/.test(first)) {
      return first;
    }
    return null;
  } catch {
    return null;
  }
}

export default function BudgetScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const contentStyle = isWide
    ? { maxWidth: 768 as const, alignSelf: 'center' as const, width: '100%' as const }
    : {};

  // ─── Profile query — shared cache with profile.tsx ───────────────────────────
  const { isLoading: profileLoading, data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: async (): Promise<Profile | null> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      return (data as Profile) ?? null;
    },
  });

  // ─── Location + menu state ────────────────────────────────────────────────────
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasLocation, setHasLocation] = useState(true);
  const [restaurants, setRestaurants] = useState<RestaurantResult[]>([]);
  const [menuItemsByChain, setMenuItemsByChain] = useState<Map<string, MenuItem[]>>(
    new Map()
  );
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState('your last known location');

  // ─── Input state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'inBudget' | 'overLimit'>('inBudget');
  const [calorieInput, setCalorieInput] = useState('');
  const [isPreFilled, setIsPreFilled] = useState(false);
  const [debouncedBudget, setDebouncedBudget] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preFillApplied = useRef(false);
  const loadedParamsKey = useRef<string | null>(null);

  // ─── Profile pre-fill (runs once after profile resolves) ──────────────────────
  useEffect(() => {
    if (preFillApplied.current) return;
    if (profileLoading) return;
    preFillApplied.current = true;
    const goal = profileData?.daily_calorie_goal ?? null;
    if (goal !== null && calorieInput === '') {
      setCalorieInput(String(goal));
      setIsPreFilled(true);
      setDebouncedBudget(goal);
    }
  }, [profileLoading, profileData, calorieInput]);

  // Reset to in-budget tab whenever the budget value changes
  useEffect(() => {
    setActiveTab('inBudget');
  }, [debouncedBudget]);

  // ─── Data load ────────────────────────────────────────────────────────────────
  const loadMenuItems = useCallback(async (restaurantList: RestaurantResult[]) => {
    const chainNames = restaurantList.map((r) => r.canonicalName);

    // Check cache for all chains in parallel
    const cacheResults = await Promise.all(
      chainNames.map(async (name) => {
        const cached = await getCachedMenuItems(name);
        return { name, items: cached?.items ?? null };
      })
    );

    // Collect hits and misses
    const hitMap = new Map<string, MenuItem[]>();
    const misses: string[] = [];
    for (const { name, items } of cacheResults) {
      if (items !== null) {
        hitMap.set(name, items);
      } else {
        misses.push(name);
      }
    }

    // Set all cached hits in one state update
    if (hitMap.size > 0) {
      setMenuItemsByChain((prev) => {
        const next = new Map(prev);
        for (const [name, items] of hitMap) {
          next.set(name, items);
        }
        return next;
      });
    }

    // Batch-fetch misses in one Supabase round-trip
    if (misses.length > 0) {
      const fetched = await fetchMenuItemsBatch(misses);
      const byChain = new Map<string, MenuItem[]>();
      for (const item of fetched) {
        const existing = byChain.get(item.chain_name) ?? [];
        existing.push(item);
        byChain.set(item.chain_name, existing);
      }
      setMenuItemsByChain((prev) => {
        const next = new Map(prev);
        for (const name of misses) {
          const items = byChain.get(name);
          if (items && items.length > 0) next.set(name, items);
        }
        return next;
      });
      for (const name of misses) {
        const items = byChain.get(name);
        if (items && items.length > 0) void setCachedMenuItems(name, items);
      }
    }
  }, []);

  const loadData = useCallback(async (forceReload = false) => {
    await wipeMenuCacheIfNeeded();
    const params = await getLastSearchParams();
    if (!params) {
      setHasLocation(false);
      setLoadState('loaded');
      return;
    }

    const paramsKey = `${params.lat}_${params.lng}_${params.radiusMiles}`;
    if (!forceReload && loadedParamsKey.current === paramsKey) return;
    loadedParamsKey.current = paramsKey;

    setLoadState('loading');
    setLoadError(null);

    try {
      const cached = await getCachedResults(params.lat, params.lng, params.radiusMiles);
      if (!cached || cached.results.length === 0) {
        setHasLocation(false);
        setLoadState('loaded');
        return;
      }

      setHasLocation(true);
      const seen = new Set<string>();
      const uniqueResults = cached.results.filter((r) => {
        if (seen.has(r.canonicalName)) return false;
        seen.add(r.canonicalName);
        return true;
      });
      setRestaurants(uniqueResults);
      setCachedAt(cached.fetchedAt);

      const city = extractCityFromAddress(uniqueResults[0]?.address);
      setLocationLabel(city ?? 'your last known location');

      await loadMenuItems(uniqueResults);
      setLoadState('loaded');
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not load results. Please try again.';
      setLoadError(msg);
      setLoadState('error');
    }
  }, [loadMenuItems]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  // ─── Input handler ────────────────────────────────────────────────────────────
  function handleInputChange(text: string) {
    setCalorieInput(text);
    setIsPreFilled(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const parsed = parseInt(text, 10);
      setDebouncedBudget(!isNaN(parsed) && parsed > 0 ? parsed : null);
    }, 300);
  }

  // ─── Filter computation ───────────────────────────────────────────────────────
  const { inBudgetGroups, overLimitGroups } = useMemo((): {
    inBudgetGroups: RestaurantGroup[];
    overLimitGroups: RestaurantGroup[];
  } => {
    if (!debouncedBudget || restaurants.length === 0) {
      return { inBudgetGroups: [], overLimitGroups: [] };
    }

    const ceiling = debouncedBudget + 100;
    const inBudget: RestaurantGroup[] = [];
    const overLimit: RestaurantGroup[] = [];

    const sortedRestaurants = [...restaurants].sort(
      (a, b) => a.distanceMiles - b.distanceMiles
    );

    for (const restaurant of sortedRestaurants) {
      const items = menuItemsByChain.get(restaurant.canonicalName) ?? [];
      const withCalories = items.filter((i) => i.calories !== null);

      const inItems = withCalories
        .filter((i) => i.calories! <= debouncedBudget)
        .sort((a, b) => a.calories! - b.calories!);

      const overItems = withCalories
        .filter((i) => i.calories! > debouncedBudget && i.calories! <= ceiling)
        .sort((a, b) => a.calories! - b.calories!);

      if (inItems.length > 0) inBudget.push({ restaurant, items: inItems });
      if (overItems.length > 0) overLimit.push({ restaurant, items: overItems });
    }

    return { inBudgetGroups: inBudget, overLimitGroups: overLimit };
  }, [debouncedBudget, restaurants, menuItemsByChain]);

  const inBudgetCount = inBudgetGroups.reduce((sum, g) => sum + g.items.length, 0);
  const overLimitCount = overLimitGroups.reduce((sum, g) => sum + g.items.length, 0);
  const activeGroup = activeTab === 'inBudget' ? inBudgetGroups : overLimitGroups;

  // ─── Derived flags ────────────────────────────────────────────────────────────
  const isLoading = loadState === 'loading';
  const isLoaded = loadState === 'loaded';
  const showResults = isLoaded && hasLocation && debouncedBudget !== null;
  const noResults =
    showResults && inBudgetGroups.length === 0 && overLimitGroups.length === 0;

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* ── Input section (fixed above scroll) ─────────────────────────────── */}
        <View style={[styles.inputSection, contentStyle]}>
          <Text style={styles.screenTitle}>Calorie Budget</Text>

          {profileLoading ? (
            <SkeletonLoader width="100%" height={48} borderRadius={radii.md} />
          ) : (
            <Input
              value={calorieInput}
              onChangeText={handleInputChange}
              placeholder="Enter calories"
              keyboardType="numeric"
              returnKeyType="done"
              accessibilityLabel="Calorie budget input"
              accessibilityHint="Enter the number of calories available to spend"
            />
          )}

          {isPreFilled && !profileLoading && (
            <Text style={styles.preFillDisclaimer}>
              Pre-filled from your daily calorie goal · Edit anytime
            </Text>
          )}

          {debouncedBudget !== null && (
            <View style={styles.toggleRow}>
              <Pressable
                style={[styles.pill, activeTab === 'inBudget' && styles.pillActive]}
                onPress={() => setActiveTab('inBudget')}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === 'inBudget' }}
              >
                <Text style={[styles.pillText, activeTab === 'inBudget' && styles.pillTextActive]}>
                  In Budget ({inBudgetCount})
                </Text>
              </Pressable>
              <Pressable
                style={[styles.pill, activeTab === 'overLimit' && styles.pillActive]}
                onPress={() => setActiveTab('overLimit')}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === 'overLimit' }}
              >
                <Text style={[styles.pillText, activeTab === 'overLimit' && styles.pillTextActive]}>
                  Just Over Limit ({overLimitCount})
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ── Scrollable results ──────────────────────────────────────────────── */}
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={contentStyle}>
            {/* Location disclaimer + cache banner */}
            {isLoaded && hasLocation && cachedAt !== null && (
              <>
                <View style={styles.locationRow}>
                  <FontAwesome
                    name="map-marker"
                    size={12}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.locationText}>
                    Showing results near {locationLabel}
                  </Text>
                </View>
                <CachedDataBanner fetchedAt={cachedAt} />
              </>
            )}

            {/* No location */}
            {isLoaded && !hasLocation && (
              <View style={styles.emptyState}>
                <FontAwesome name="map-o" size={40} color={colors.textSecondary} />
                <Text style={styles.emptyTitle}>No location set</Text>
                <Text style={styles.emptyBody}>
                  Open the Nearby tab to find restaurants in your area. Your results will
                  appear here automatically.
                </Text>
              </View>
            )}

            {/* Loading skeletons */}
            {isLoading && (
              <View style={styles.skeletonGroup}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonLoader key={i} width="100%" height={64} borderRadius={0} />
                ))}
              </View>
            )}

            {/* Error */}
            {loadState === 'error' && loadError && (
              <View style={styles.emptyState}>
                <FontAwesome
                  name="exclamation-circle"
                  size={40}
                  color={colors.error}
                />
                <Text style={styles.emptyTitle}>Couldn't load results</Text>
                <Text style={styles.emptyBody}>{loadError}</Text>
                <Pressable
                  style={styles.retryButton}
                  onPress={() => void loadData(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading results"
                >
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              </View>
            )}

            {/* Enter budget prompt */}
            {isLoaded && hasLocation && !debouncedBudget && !profileLoading && (
              <View style={styles.emptyState}>
                <FontAwesome name="cutlery" size={40} color={colors.textSecondary} />
                <Text style={styles.emptyTitle}>What can you get?</Text>
                <Text style={styles.emptyBody}>
                  Enter your calorie budget to see what's nearby.
                </Text>
              </View>
            )}

            {/* No results */}
            {noResults && (
              <View style={styles.emptyState}>
                <FontAwesome name="search" size={40} color={colors.textSecondary} />
                <Text style={styles.emptyTitle}>Nothing fits this budget</Text>
                <Text style={styles.emptyBody}>
                  Try raising your budget or expanding your search radius in the Nearby
                  tab.
                </Text>
              </View>
            )}

            {/* Active tab results — keyed by activeTab so all accordion sections
                remount fresh (collapsed) on every tab switch */}
            {showResults && (
              <View key={activeTab}>
                {activeGroup.map(({ restaurant, items }) => (
                  <BudgetRestaurantSection
                    key={restaurant.canonicalName}
                    restaurant={restaurant}
                    items={items}
                    dimmed={activeTab === 'overLimit'}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing['2xl'],
  },
  inputSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  screenTitle: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.fontSize['2xl'],
    color: colors.textPrimary,
  },
  preFillDisclaimer: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  locationText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  skeletonGroup: {
    gap: 1,
    marginTop: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['3xl'],
    gap: spacing.md,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.lg,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * 1.6,
  },
  retryButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
  },
  retryText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pill: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.textPrimary,
  },
});
