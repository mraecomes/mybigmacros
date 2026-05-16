import { colors, radii, spacing, typography } from '@/constants/theme';
import type { MenuItem } from '@/types/menu';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  item: MenuItem;
  chainName: string;
};

function getInitials(name: string): string {
  try {
    const words = name
      .replace(/[^a-zA-Z\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    if (words.length === 1 && words[0].length >= 2) {
      return words[0].slice(0, 2).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  } catch {
    return '??';
  }
}

export function BudgetItemCard({ item, chainName }: Props) {
  function handlePress() {
    router.push(`/item/${item.id}`);
  }

  const initials = getInitials(chainName);
  const calorieLabel =
    item.calories !== null ? `${item.calories} cal` : 'Calories unavailable';

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${item.item_name}, ${calorieLabel}. Tap to view details.`}
    >
      {/* Initials circle — chain logo fallback (Issue #13) */}
      <View style={styles.initialsCircle} accessibilityElementsHidden>
        <Text style={styles.initialsText}>{initials}</Text>
      </View>

      {/* Item info */}
      <View style={styles.info}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.item_name}
        </Text>
        <Text style={styles.calories}>{calorieLabel}</Text>
      </View>

      {/* Badge stub — reserved layout space (Issue #12) */}
      <View style={styles.badgeStub} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  cardPressed: {
    backgroundColor: colors.surface,
  },
  initialsCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  initialsText: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize.xs,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  calories: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },
  badgeStub: {
    // Reserved width for up to 2 badge pills — will be populated in Issue #12
    width: 52,
    flexShrink: 0,
  },
});
