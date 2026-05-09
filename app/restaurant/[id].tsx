import { CachedDataBanner } from '@/components/nearby/CachedDataBanner';
import { MenuItemRow } from '@/components/restaurant/MenuItemRow';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { getCachedMenuItems, setCachedMenuItems } from '@/lib/cache/menuCache';
import { fetchMenuItems } from '@/lib/supabase/menuItems';
import type { MenuItem } from '@/types/menu';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Section = {
  title: string;
  data: MenuItem[];
};

type MenuSearchHeaderProps = {
  searchQuery: string;
  searchFocused: boolean;
  onChangeText: (text: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onClear: () => void;
};

// Defined outside RestaurantScreen so the component type reference is stable.
const MenuSearchHeader = memo(function MenuSearchHeader({
  searchQuery,
  searchFocused,
  onChangeText,
  onFocus,
  onBlur,
  onClear,
}: MenuSearchHeaderProps) {
  return (
    <View style={styles.searchContainer}>
      <View style={[styles.searchRow, searchFocused && styles.searchRowFocused]}>
        <FontAwesome name="search" size={14} color={colors.textSecondary} />
        <TextInput
          value={searchQuery}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="Search menu…"
          placeholderTextColor={colors.textSecondary}
          style={styles.searchInput}
          className={Platform.OS === 'web' ? 'outline-none' : undefined}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
        {searchQuery.length > 0 && Platform.OS !== 'ios' && (
          <Pressable onPress={onClear} hitSlop={8} accessibilityLabel="Clear search">
            <FontAwesome name="times-circle" size={14} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>
    </View>
  );
});

function buildSections(items: MenuItem[], query: string): Section[] {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter((item) => item.item_name.toLowerCase().includes(q))
    : items;

  const categoryMap = new Map<string, MenuItem[]>();
  for (const item of filtered) {
    const cat = item.category ?? 'Other';
    const existing = categoryMap.get(cat);
    if (existing) {
      existing.push(item);
    } else {
      categoryMap.set(cat, [item]);
    }
  }

  return Array.from(categoryMap.entries()).map(([title, data]) => ({ title, data }));
}

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chainName = decodeURIComponent(id ?? '');

  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    if (!chainName) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const cached = await getCachedMenuItems(chainName);
        if (cached && !cancelled) {
          setItems(cached.items);
          setCachedAt(cached.fetchedAt);
          setLoading(false);
          return;
        }

        const fetched = await fetchMenuItems(chainName);
        if (cancelled) return;
        setItems(fetched);
        setCachedAt(null);
        await setCachedMenuItems(chainName, fetched);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Could not load the menu. Please check your connection and try again.'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chainName]);

  const sections = useMemo(
    () => buildSections(items, searchQuery),
    [items, searchQuery]
  );

  const totalVisible = useMemo(
    () => sections.reduce((sum, s) => sum + s.data.length, 0),
    [sections]
  );

  const handleChangeText = useCallback((text: string) => setSearchQuery(text), []);
  const handleFocus = useCallback(() => setSearchFocused(true), []);
  const handleBlur = useCallback(() => setSearchFocused(false), []);
  const handleClear = useCallback(() => setSearchQuery(''), []);

  const searchHeader = useMemo(
    () => (
      <MenuSearchHeader
        searchQuery={searchQuery}
        searchFocused={searchFocused}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClear={handleClear}
      />
    ),
    [searchQuery, searchFocused, handleChangeText, handleFocus, handleBlur, handleClear]
  );

  function renderSectionHeader({ section }: { section: Section }) {
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
    );
  }

  function renderContent() {
    if (loading) {
      return (
        <View style={styles.skeletonContainer}>
          {[...Array(8)].map((_, i) => (
            <SkeletonLoader key={i} width="100%" height={72} borderRadius={0} />
          ))}
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContent}>
          <FontAwesome name="exclamation-circle" size={28} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={() => {
              setItems([]);
              setLoading(true);
              setError(null);
              fetchMenuItems(chainName)
                .then((fetched) => {
                  setItems(fetched);
                  setCachedMenuItems(chainName, fetched);
                })
                .catch((err) =>
                  setError(
                    err instanceof Error ? err.message : 'Could not load the menu.'
                  )
                )
                .finally(() => setLoading(false));
            }}
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      );
    }

    if (items.length === 0) {
      return (
        <View style={styles.centerContent}>
          <Text style={styles.emptyIcon}>🍔</Text>
          <Text style={styles.emptyTitle}>No menu items found</Text>
          <Text style={styles.emptySubtitle}>
            {`${chainName} doesn't have nutrition data in our database yet.`}
          </Text>
        </View>
      );
    }

    if (sections.length === 0) {
      // searchHeader is rendered above renderContent() in a fixed tree position,
      // not here — so it stays mounted and the TextInput keeps focus.
      return (
        <View style={styles.centerContent}>
          <FontAwesome name="search" size={28} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No items match your search</Text>
          <Text style={styles.emptySubtitle}>Try a different keyword</Text>
        </View>
      );
    }

    return (
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MenuItemRow item={item} />}
        renderSectionHeader={renderSectionHeader}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled
        contentContainerStyle={styles.listContent}
      />
    );
  }

  return (
    <View style={styles.root}>
      {cachedAt !== null && <CachedDataBanner fetchedAt={cachedAt} />}

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <FontAwesome name="chevron-left" size={14} color={colors.textPrimary} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.chainName} numberOfLines={1}>
            {chainName}
          </Text>
          {!loading && items.length > 0 && (
            <Text style={styles.itemCount}>
              {totalVisible === items.length
                ? `${items.length} items`
                : `${totalVisible} of ${items.length} items`}
            </Text>
          )}
        </View>
      </View>

      {/* Rendered at a fixed position in the tree — never inside SectionList and never
          conditionally swapped between paths. items.length is stable during typing since
          it reflects the full unfiltered list, not the filtered sections. */}
      {items.length > 0 && searchHeader}

      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },
  backText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
  },
  headerCenter: {
    flex: 1,
    gap: 2,
  },
  chainName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.lg,
    color: colors.textPrimary,
  },
  itemCount: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },

  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 40,
  },
  searchRowFocused: {
    borderColor: colors.secondary,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    height: '100%',
  },

  sectionHeader: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  listContent: {
    paddingBottom: spacing['2xl'],
  },

  skeletonContainer: {
    gap: 1,
    marginTop: spacing.md,
  },

  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  errorText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
  },
  retryText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
});
