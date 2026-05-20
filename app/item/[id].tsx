import { useQuery } from '@tanstack/react-query';
import { BadgeRow } from '@/components/nutrition/BadgeRow';
import { MacroMeter } from '@/components/nutrition/MacroMeter';
import { NutritionLabel } from '@/components/nutrition/NutritionLabel';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase/client';
import { fetchMenuItem } from '@/lib/supabase/menuItems';
import type { Profile } from '@/types/auth';
import type { MenuItem } from '@/types/menu';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    isLoading,
    isError,
    error,
    data: item,
  } = useQuery<MenuItem, Error>({
    queryKey: ['item', id],
    queryFn: async (): Promise<MenuItem> => {
      const found = await fetchMenuItem(id!);
      if (found === null) throw new Error("This item couldn't be found. It may have been removed.");
      return found;
    },
    enabled: !!id,
  });

  const { data: profile } = useQuery<Profile | null>({
    queryKey: ['profile'],
    queryFn: async (): Promise<Profile | null> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      return (data as Profile) ?? null;
    },
  });

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

      {isLoading && (
        <View style={styles.skeletonContainer}>
          <SkeletonLoader width="60%" height={28} borderRadius={radii.sm} />
          <SkeletonLoader width="100%" height={240} borderRadius={radii.md} />
          <SkeletonLoader width="100%" height={200} borderRadius={radii.md} />
        </View>
      )}

      {isError && (
        <View style={styles.centerContent}>
          <FontAwesome name="exclamation-circle" size={28} color={colors.error} />
          <Text style={styles.errorText}>
            {error.message}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.retryText}>Go back</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && item && (
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

          <MacroMeter
            calories={item.calories}
            dailyCalorieGoal={profile?.daily_calorie_goal ?? null}
            protein_g={item.protein_g}
            fiber_g={item.fiber_g}
          />

          <NutritionLabel item={item} />

          <BadgeRow item={item} />
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
});
