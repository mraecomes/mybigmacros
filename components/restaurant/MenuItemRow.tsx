import { colors, radii, spacing, typography } from '@/constants/theme';
import type { MenuItem } from '@/types/menu';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  item: MenuItem;
};

function formatMacro(value: number | null, unit: string): string {
  if (value === null) return '—';
  return `${value}${unit}`;
}

function formatCalories(value: number | null): string {
  if (value === null) return 'Calories unavailable';
  return `${value} cal`;
}

export function MenuItemRow({ item }: Props) {
  return (
    <Pressable
      onPress={() => router.push(`/item/${item.id}`)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${item.item_name}, ${formatCalories(item.calories)}`}
    >
      <View style={styles.main}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={2}>
            {item.item_name}
          </Text>
          {item.category !== null && (
            <View style={styles.categoryChip}>
              <Text style={styles.categoryText} numberOfLines={1}>
                {item.category}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.dataRow}>
          <Text
            style={[
              styles.calories,
              item.calories === null && styles.caloriesUnavailable,
            ]}
          >
            {formatCalories(item.calories)}
          </Text>
          <Text style={styles.macros}>
            {`P: ${formatMacro(item.protein_g, 'g')}  F: ${formatMacro(item.fat_g, 'g')}  C: ${formatMacro(item.carbs_g, 'g')}  Fi: ${formatMacro(item.fiber_g, 'g')}`}
          </Text>
        </View>
      </View>

      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  main: {
    flex: 1,
    gap: 5,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
  },
  categoryChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    flexShrink: 0,
    maxWidth: 100,
  },
  categoryText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  calories: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },
  caloriesUnavailable: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.body,
  },
  macros: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  chevron: {
    fontSize: 20,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
