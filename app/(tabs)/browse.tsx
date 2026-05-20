import { useQuery } from '@tanstack/react-query';
import { BadgeRow } from '@/components/nutrition/BadgeRow';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { colors, radii, spacing, typography } from '@/constants/theme';
import {
  fetchAllChains,
  fetchCategories,
  fetchCategoryItems,
  searchMenuItems,
} from '@/lib/supabase/browse';
import type { CategoryItemsResult, ItemSearchResult } from '@/lib/supabase/browse';
import type { MenuItem } from '@/types/menu';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const CATEGORY_EMOJIS: Record<string, string> = {
  'Appetizers & Sides': '🍟',
  'Baked Goods': '🥐',
  'Beverages': '🥤',
  'Burgers': '🍔',
  'Desserts': '🍦',
  'Entrees': '🍗',
  'Fried Potatoes': '🍟',
  'Pizza': '🍕',
  'Salads': '🥗',
  'Sandwiches': '🥪',
  'Soup': '🍜',
  'Toppings & Ingredients': '🧀',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategoryEmoji(category: string): string {
  return CATEGORY_EMOJIS[category] ?? '🍴';
}

function formatCalories(value: number | null): string {
  if (value === null) return 'Calories unavailable';
  return `${value} cal`;
}

// ─── Small shared components ──────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <View style={styles.skeletonList}>
      {[0, 1, 2, 3, 4].map((i) => (
        <SkeletonLoader key={i} width="100%" height={52} borderRadius={radii.sm} />
      ))}
    </View>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <View style={styles.centered}>
      <FontAwesome name="exclamation-circle" size={22} color={colors.error} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

// ─── CategoryCard ─────────────────────────────────────────────────────────────

function CategoryCard({
  category,
  onPress,
}: {
  category: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.categoryCard, pressed && styles.categoryCardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Browse ${category}`}
    >
      <Text style={styles.categoryEmoji}>{getCategoryEmoji(category)}</Text>
      <Text style={styles.categoryName} numberOfLines={2}>
        {category}
      </Text>
    </Pressable>
  );
}

// ─── BrowseChainRow ───────────────────────────────────────────────────────────

function BrowseChainRow({ chainName }: { chainName: string }) {
  return (
    <Pressable
      onPress={() => router.push(`/restaurant/${encodeURIComponent(chainName)}`)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Browse ${chainName} menu`}
    >
      <Text style={styles.rowChainName} numberOfLines={1}>
        {chainName}
      </Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

// ─── BrowseItemRow ────────────────────────────────────────────────────────────

function BrowseItemRow({
  item,
  showChainName = true,
}: {
  item: MenuItem;
  showChainName?: boolean;
}) {
  const calorieLabel = formatCalories(item.calories);
  const caloriesUnavailable = item.calories === null;

  return (
    <Pressable
      onPress={() => router.push(`/item/${item.id}`)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${item.item_name}, ${calorieLabel}`}
    >
      <View style={styles.rowItemInfo}>
        <Text style={styles.rowItemName} numberOfLines={2}>
          {item.item_name}
        </Text>
        {showChainName && (
          <Text style={styles.rowItemChain} numberOfLines={1}>
            {item.chain_name}
          </Text>
        )}
        <Text
          style={[
            styles.rowItemCalories,
            caloriesUnavailable && styles.rowItemCaloriesUnavailable,
          ]}
        >
          {calorieLabel}
        </Text>
        <BadgeRow item={item} />
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

// ─── PaginationControls ───────────────────────────────────────────────────────

function PaginationControls({
  page,
  totalCount,
  pageSize,
  onPrev,
  onNext,
}: {
  page: number;
  totalCount: number;
  pageSize: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const totalPages = Math.ceil(totalCount / pageSize);
  if (totalPages <= 1) return null;

  const atFirst = page === 1;
  const atLast = page === totalPages;

  return (
    <View style={styles.pagination}>
      <Pressable
        onPress={onPrev}
        disabled={atFirst}
        style={({ pressed }) => [
          styles.pageBtn,
          atFirst && styles.pageBtnDisabled,
          pressed && !atFirst && styles.pageBtnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Previous page"
      >
        <FontAwesome
          name="chevron-left"
          size={11}
          color={atFirst ? colors.border : colors.textPrimary}
        />
        <Text style={[styles.pageBtnText, atFirst && styles.pageBtnTextDisabled]}>
          Prev
        </Text>
      </Pressable>

      <Text style={styles.pageIndicator}>
        Page {page} of {totalPages}
      </Text>

      <Pressable
        onPress={onNext}
        disabled={atLast}
        style={({ pressed }) => [
          styles.pageBtn,
          atLast && styles.pageBtnDisabled,
          pressed && !atLast && styles.pageBtnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Next page"
      >
        <Text style={[styles.pageBtnText, atLast && styles.pageBtnTextDisabled]}>
          Next
        </Text>
        <FontAwesome
          name="chevron-right"
          size={11}
          color={atLast ? colors.border : colors.textPrimary}
        />
      </Pressable>
    </View>
  );
}

// ─── BrowseScreen ─────────────────────────────────────────────────────────────

export default function BrowseScreen() {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);

  const [view, setView] = useState<'default' | 'category'>('default');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [rawSearch, setRawSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [categoryPage, setCategoryPage] = useState(1);
  const [searchItemPage, setSearchItemPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = rawSearch.trim();
      setDebouncedSearch(trimmed);
      setCategoryPage(1);
      setSearchItemPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [rawSearch]);

  const isSearchActive = debouncedSearch.length >= 3;
  const isInCategory = view === 'category' && selectedCategory !== null;
  const isCategoryPaginatedView = isInCategory && !isSearchActive;
  const isCategorySearchActive = isInCategory && isSearchActive;
  const isGlobalSearch = view === 'default' && isSearchActive;

  const numColumns = width >= 768 ? 4 : 2;

  // ── Queries ──────────────────────────────────────────────────────────────────

  const categoriesQuery = useQuery<string[], Error>({
    queryKey: ['browse', 'categories'],
    queryFn: fetchCategories,
    staleTime: Infinity,
  });

  const chainsQuery = useQuery<string[], Error>({
    queryKey: ['browse', 'chains'],
    queryFn: fetchAllChains,
    staleTime: Infinity,
  });

  const categoryItemsQuery = useQuery<CategoryItemsResult, Error>({
    queryKey: ['browse', 'categoryItems', selectedCategory, categoryPage],
    queryFn: () => fetchCategoryItems(selectedCategory!, categoryPage, PAGE_SIZE),
    enabled: isCategoryPaginatedView,
    staleTime: 5 * 60 * 1000,
  });

  const categorySearchQuery = useQuery<CategoryItemsResult, Error>({
    queryKey: ['browse', 'categorySearch', selectedCategory, debouncedSearch],
    queryFn: () => fetchCategoryItems(selectedCategory!, 1, PAGE_SIZE, debouncedSearch),
    enabled: isCategorySearchActive,
    staleTime: 2 * 60 * 1000,
  });

  const itemSearchQuery = useQuery<ItemSearchResult, Error>({
    queryKey: ['browse', 'itemSearch', debouncedSearch, searchItemPage],
    queryFn: () => searchMenuItems(debouncedSearch, searchItemPage, PAGE_SIZE),
    enabled: isGlobalSearch,
    staleTime: 2 * 60 * 1000,
  });

  // Chain search is client-side — chains are already in memory
  const chainSearchResults: string[] =
    isGlobalSearch && chainsQuery.data
      ? chainsQuery.data.filter((name) =>
          name.toLowerCase().includes(debouncedSearch.toLowerCase())
        )
      : [];

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleCategoryPress(category: string) {
    setView('category');
    setSelectedCategory(category);
    setCategoryPage(1);
    setRawSearch('');
    setDebouncedSearch('');
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  function handleBackToDefault() {
    setView('default');
    setSelectedCategory(null);
    setCategoryPage(1);
    setRawSearch('');
    setDebouncedSearch('');
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  function handleClearSearch() {
    setRawSearch('');
    setDebouncedSearch('');
    setCategoryPage(1);
    setSearchItemPage(1);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  function handleCategoryPrev() {
    setCategoryPage((p) => Math.max(1, p - 1));
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function handleCategoryNext() {
    const totalPages = Math.ceil((categoryItemsQuery.data?.totalCount ?? 0) / PAGE_SIZE);
    setCategoryPage((p) => Math.min(totalPages, p + 1));
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function handleSearchPrev() {
    setSearchItemPage((p) => Math.max(1, p - 1));
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function handleSearchNext() {
    const totalPages = Math.ceil((itemSearchQuery.data?.totalCount ?? 0) / PAGE_SIZE);
    setSearchItemPage((p) => Math.min(totalPages, p + 1));
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  // ── Category grid rows ────────────────────────────────────────────────────────

  function renderCategoryGrid(categories: string[]) {
    const rows: string[][] = [];
    for (let i = 0; i < categories.length; i += numColumns) {
      rows.push(categories.slice(i, i + numColumns));
    }
    return (
      <View>
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.categoryRow}>
            {row.map((cat) => (
              <CategoryCard
                key={cat}
                category={cat}
                onPress={() => handleCategoryPress(cat)}
              />
            ))}
            {row.length < numColumns &&
              Array.from({ length: numColumns - row.length }).map((_, i) => (
                <View key={`filler-${i}`} style={styles.categoryCardFiller} />
              ))}
          </View>
        ))}
      </View>
    );
  }

  function renderCategoryGridSkeleton() {
    return (
      <View>
        {[0, 1, 2].map((rowIdx) => (
          <View key={rowIdx} style={styles.categoryRow}>
            {Array.from({ length: numColumns }).map((_, i) => (
              <View key={i} style={{ flex: 1 }}>
                <SkeletonLoader width="100%" height={88} borderRadius={radii.md} />
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>

      {/* ── Fixed search bar ──────────────────────────────────────────────── */}
      <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
        <FontAwesome name="search" size={14} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={rawSearch}
          onChangeText={setRawSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search restaurants or menu items…"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          className="outline-none"
        />
        {rawSearch.length > 0 && (
          <Pressable
            onPress={handleClearSearch}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            style={({ pressed }) => pressed && { opacity: 0.6 }}
          >
            <FontAwesome name="times-circle" size={16} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Category view ─────────────────────────────────────────────── */}
        {view === 'category' && selectedCategory !== null && (
          <>
            {/* Header */}
            <View style={styles.categoryHeader}>
              <Pressable
                onPress={handleBackToDefault}
                style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
                accessibilityRole="button"
                accessibilityLabel="Back to Browse"
              >
                <FontAwesome name="chevron-left" size={12} color={colors.textPrimary} />
                <Text style={styles.backBtnText}>Browse</Text>
              </Pressable>
              <Text style={styles.categoryHeaderTitle} numberOfLines={1}>
                {getCategoryEmoji(selectedCategory)} {selectedCategory}
              </Text>
            </View>

            {/* Category search — shows all matching items, no pagination */}
            {isCategorySearchActive && (
              <>
                {categorySearchQuery.isLoading && <RowSkeleton />}
                {categorySearchQuery.isError && (
                  <ErrorMessage message={categorySearchQuery.error.message} />
                )}
                {categorySearchQuery.data &&
                  (categorySearchQuery.data.items.length === 0 ? (
                    <EmptyMessage
                      message={`No "${debouncedSearch}" items in ${selectedCategory}`}
                    />
                  ) : (
                    categorySearchQuery.data.items.map((item) => (
                      <BrowseItemRow key={item.id} item={item} showChainName />
                    ))
                  ))}
              </>
            )}

            {/* Category paginated view */}
            {isCategoryPaginatedView && (
              <>
                {categoryItemsQuery.isLoading && <RowSkeleton />}
                {categoryItemsQuery.isError && (
                  <ErrorMessage message={categoryItemsQuery.error.message} />
                )}
                {categoryItemsQuery.data &&
                  (categoryItemsQuery.data.items.length === 0 ? (
                    <EmptyMessage message={`No items in ${selectedCategory}`} />
                  ) : (
                    <>
                      {categoryItemsQuery.data.items.map((item) => (
                        <BrowseItemRow key={item.id} item={item} showChainName />
                      ))}
                      <PaginationControls
                        page={categoryPage}
                        totalCount={categoryItemsQuery.data.totalCount}
                        pageSize={PAGE_SIZE}
                        onPrev={handleCategoryPrev}
                        onNext={handleCategoryNext}
                      />
                    </>
                  ))}
              </>
            )}
          </>
        )}

        {/* ── Default view ──────────────────────────────────────────────── */}
        {view === 'default' && !isSearchActive && (
          <>
            <Text style={styles.sectionTitle}>Categories</Text>
            {categoriesQuery.isLoading && renderCategoryGridSkeleton()}
            {categoriesQuery.isError && (
              <ErrorMessage message={categoriesQuery.error.message} />
            )}
            {categoriesQuery.data && renderCategoryGrid(categoriesQuery.data)}

            <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
              Restaurants
            </Text>
            {chainsQuery.isLoading && <RowSkeleton />}
            {chainsQuery.isError && (
              <ErrorMessage message={chainsQuery.error.message} />
            )}
            {chainsQuery.data &&
              (chainsQuery.data.length === 0 ? (
                <EmptyMessage message="No restaurants found" />
              ) : (
                chainsQuery.data.map((chainName) => (
                  <BrowseChainRow key={chainName} chainName={chainName} />
                ))
              ))}
          </>
        )}

        {/* ── Global search results ─────────────────────────────────────── */}
        {isGlobalSearch && (
          <>
            {/* Restaurants — client-side filter, instant */}
            {chainSearchResults.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Restaurants</Text>
                {chainSearchResults.map((chainName) => (
                  <BrowseChainRow key={chainName} chainName={chainName} />
                ))}
              </>
            )}

            {/* Menu Items */}
            {itemSearchQuery.isLoading && <RowSkeleton />}
            {!itemSearchQuery.isLoading && itemSearchQuery.isError && (
              <ErrorMessage message={itemSearchQuery.error.message} />
            )}
            {itemSearchQuery.data && itemSearchQuery.data.items.length > 0 && (
              <>
                <Text
                  style={[
                    styles.sectionTitle,
                    chainSearchResults.length > 0 && styles.sectionTitleSpaced,
                  ]}
                >
                  Menu Items
                </Text>
                {itemSearchQuery.data.items.map((item) => (
                  <BrowseItemRow key={item.id} item={item} showChainName />
                ))}
                <PaginationControls
                  page={searchItemPage}
                  totalCount={itemSearchQuery.data.totalCount}
                  pageSize={PAGE_SIZE}
                  onPrev={handleSearchPrev}
                  onNext={handleSearchNext}
                />
              </>
            )}

            {/* Empty — only when both sections return nothing */}
            {!itemSearchQuery.isLoading &&
              !itemSearchQuery.isError &&
              (itemSearchQuery.data?.items.length ?? 0) === 0 &&
              chainSearchResults.length === 0 && (
                <EmptyMessage message={`No results for "${debouncedSearch}"`} />
              )}
          </>
        )}

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
  },
  searchBarFocused: {
    borderColor: colors.secondary,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    paddingVertical: 2,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing['3xl'],
  },

  // Section titles
  sectionTitle: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionTitleSpaced: {
    marginTop: spacing.lg,
  },

  // Category grid
  categoryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 88,
  },
  categoryCardPressed: {
    backgroundColor: colors.border,
  },
  categoryCardFiller: {
    flex: 1,
  },
  categoryEmoji: {
    fontSize: 28,
    lineHeight: 34,
  },
  categoryName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * 1.35,
  },

  // Category view header
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },
  backBtnText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
  },
  categoryHeaderTitle: {
    flex: 1,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },

  // Rows (chain + item)
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  rowPressed: {
    backgroundColor: colors.surface,
  },
  rowChainName: {
    flex: 1,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  rowItemInfo: {
    flex: 1,
    gap: 3,
  },
  rowItemName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    lineHeight: typography.fontSize.base * 1.4,
  },
  rowItemChain: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.secondary,
  },
  rowItemCalories: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },
  rowItemCaloriesUnavailable: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.body,
  },
  chevron: {
    fontSize: 20,
    color: colors.textSecondary,
    lineHeight: 22,
    flexShrink: 0,
  },

  // Pagination
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnPressed: {
    borderColor: colors.secondary,
  },
  pageBtnText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
  },
  pageBtnTextDisabled: {
    color: colors.border,
  },
  pageIndicator: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },

  // Skeletons
  skeletonList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },

  // Feedback states
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['2xl'],
    gap: spacing.md,
  },
  errorText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * 1.5,
  },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
