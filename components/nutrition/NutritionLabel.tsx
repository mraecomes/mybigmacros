import { colors, radii, spacing, typography } from '@/constants/theme';
import type { MenuItem } from '@/types/menu';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  item: MenuItem;
};

type RowData = {
  label: string;
  value: string;
  isCalories?: boolean;
};

function formatMacro(value: number | null, unit: string): string {
  if (value === null) return '—';
  return `${value}${unit}`;
}

export function NutritionLabel({ item }: Props) {
  const rows: RowData[] = [
    {
      label: 'Calories',
      value: item.calories !== null ? String(item.calories) : 'Unavailable',
      isCalories: true,
    },
    { label: 'Protein', value: formatMacro(item.protein_g, 'g') },
    { label: 'Total Fat', value: formatMacro(item.fat_g, 'g') },
    { label: 'Total Carbs', value: formatMacro(item.carbs_g, 'g') },
    { label: 'Dietary Fiber', value: formatMacro(item.fiber_g, 'g') },
    { label: 'Sodium', value: formatMacro(item.sodium_mg, 'mg') },
  ];

  const servingSizeDisplay =
    item.serving_size !== null && item.serving_size_unit !== null
      ? `${item.serving_size} ${item.serving_size_unit}`
      : null;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Nutrition Facts</Text>
      {servingSizeDisplay !== null && (
        <Text style={styles.servingSize}>Serving size: {servingSizeDisplay}</Text>
      )}
      <View style={styles.dividerThick} />
      {rows.map((row, index) => (
        <View key={row.label}>
          <View style={[styles.row, row.isCalories && styles.caloriesRow]}>
            <Text style={[styles.label, row.isCalories && styles.caloriesLabel]}>
              {row.label}
            </Text>
            <Text
              style={[
                styles.value,
                row.isCalories && styles.caloriesValue,
                row.value === '—' && styles.missingValue,
                row.isCalories && row.value === 'Unavailable' && styles.caloriesUnavailable,
              ]}
            >
              {row.value}
            </Text>
          </View>
          {index < rows.length - 1 && (
            <View style={row.isCalories ? styles.dividerThick : styles.divider} />
          )}
        </View>
      ))}
      {item.notes && (
        <>
          <View style={styles.divider} />
          <Text style={styles.notes}>{item.notes}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 0,
  },
  heading: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize['2xl'],
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  servingSize: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  dividerThick: {
    height: 6,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
    borderRadius: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  caloriesRow: {
    paddingVertical: spacing.xs,
  },
  label: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
  },
  caloriesLabel: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize.lg,
    color: colors.textPrimary,
  },
  value: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
  },
  caloriesValue: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize['2xl'],
    color: colors.primary,
  },
  caloriesUnavailable: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  missingValue: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.body,
  },
  notes: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    lineHeight: typography.fontSize.xs * typography.lineHeight.relaxed,
    marginTop: spacing.xs,
  },
});
