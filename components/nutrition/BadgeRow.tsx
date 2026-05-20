import { evaluateBadges, fiberTooltipText, proteinTooltipText } from '@/lib/nutrition/badges';
import { colors, radii, spacing, typography } from '@/constants/theme';
import type { MenuItem } from '@/types/menu';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type BadgeRowProps = {
  item: Pick<MenuItem, 'calories' | 'protein_g' | 'fiber_g'>;
};

type BadgePillProps = {
  label: string;
  color: string;
  tooltipText: string;
};

function BadgePill({ label, color, tooltipText }: BadgePillProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.pillWrap}>
      <Pressable
        onPress={Platform.OS !== 'web' ? () => setVisible((v) => !v) : undefined}
        onHoverIn={() => setVisible(true)}
        onHoverOut={() => setVisible(false)}
        style={[styles.pill, { backgroundColor: color }]}
        accessibilityRole="button"
        accessibilityLabel={tooltipText}
      >
        <Text style={styles.pillLabel}>{label}</Text>
      </Pressable>

      {visible && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>{tooltipText}</Text>
        </View>
      )}
    </View>
  );
}

export function BadgeRow({ item }: BadgeRowProps) {
  const { proteinHit, fiberFuel } = evaluateBadges(item);

  if (!proteinHit && !fiberFuel) return null;

  return (
    <View style={styles.row}>
      {proteinHit && item.protein_g !== null && (
        <BadgePill
          label="Protein Hit"
          color={colors.badgeProtein}
          tooltipText={proteinTooltipText(item.protein_g)}
        />
      )}
      {fiberFuel && item.fiber_g !== null && (
        <BadgePill
          label="Fiber Fuel"
          color={colors.badgeFiber}
          tooltipText={fiberTooltipText(item.fiber_g)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pillWrap: {
    position: 'relative',
  },
  pill: {
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillLabel: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
    color: colors.textPrimary,
  },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 4,
    left: 0,
    width: 160,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: spacing.sm,
    zIndex: 100,
    elevation: 4,
  },
  tooltipText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    lineHeight: typography.fontSize.xs * typography.lineHeight.relaxed,
  },
});
