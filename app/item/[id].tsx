import { NutritionLabel } from '@/components/nutrition/NutritionLabel';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { fetchMenuItem } from '@/lib/supabase/menuItems';
import type { MenuItem } from '@/types/menu';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [item, setItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const fetched = await fetchMenuItem(id);
        if (cancelled) return;
        if (fetched === null) {
          setError("This item couldn't be found. It may have been removed.");
        } else {
          setItem(fetched);
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Could not load this item. Please check your connection and try again.'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <View style={styles.root}>
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

        {item && (
          <View style={styles.headerCenter}>
            <Text style={styles.chainName} numberOfLines={1}>
              {item.chain_name}
            </Text>
          </View>
        )}
      </View>

      {loading && (
        <View style={styles.skeletonContainer}>
          <SkeletonLoader width="60%" height={28} borderRadius={radii.sm} />
          <SkeletonLoader width="100%" height={240} borderRadius={radii.md} />
          <SkeletonLoader width="100%" height={200} borderRadius={radii.md} />
        </View>
      )}

      {error && (
        <View style={styles.centerContent}>
          <FontAwesome name="exclamation-circle" size={28} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.retryText}>Go back</Text>
          </Pressable>
        </View>
      )}

      {!loading && item && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.itemName}>{item.item_name}</Text>

          {item.category && (
            <View style={styles.categoryChip}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          )}

          {/* Macro-Meter — implemented in Issue #10 */}
          <View style={styles.macroMeterStub}>
            <Text style={styles.macroMeterStubText}>Macro-Meter · Coming in Issue #10</Text>
          </View>

          <NutritionLabel item={item} />

          {/* Badges — implemented in Issue #12 */}
          <View style={styles.badgesStub} />
        </ScrollView>
      )}
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
  },
  chainName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },

  skeletonContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },

  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
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

  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  itemName: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize['2xl'],
    color: colors.textPrimary,
    lineHeight: typography.fontSize['2xl'] * typography.lineHeight.tight,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  categoryText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  macroMeterStub: {
    height: 180,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroMeterStubText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  badgesStub: {
    height: 0,
  },
});
