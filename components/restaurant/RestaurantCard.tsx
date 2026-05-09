import { colors, radii, spacing, typography } from '@/constants/theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  canonicalName: string;
  displayName: string;
  distanceMiles: number;
  address: string;
  onPress?: () => void;
};

export function RestaurantCard({
  canonicalName,
  displayName,
  distanceMiles,
  address,
  onPress,
}: Props) {
  const isTappable = !!canonicalName;

  const distance =
    distanceMiles < 0.1
      ? '< 0.1 mi'
      : `${distanceMiles.toFixed(1)} mi`;

  function handlePress() {
    if (!isTappable) return;
    if (onPress) {
      onPress();
    } else {
      router.push(`/restaurant/${encodeURIComponent(canonicalName)}`);
    }
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={!isTappable}
      style={({ pressed }) => [
        styles.card,
        pressed && isTappable && styles.cardPressed,
        !isTappable && styles.cardDisabled,
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        isTappable
          ? `${displayName}, ${distance} away. Tap to browse menu.`
          : `${displayName}, ${distance} away. Menu not available.`
      }
      accessibilityState={{ disabled: !isTappable }}
    >
      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.distance}>{distance}</Text>
        </View>
        <Text style={styles.address} numberOfLines={2}>
          {address}
        </Text>
      </View>
      {isTappable && (
        <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  cardPressed: {
    backgroundColor: colors.background,
  },
  cardDisabled: {
    opacity: 0.4,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    flex: 1,
  },
  distance: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    flexShrink: 0,
  },
  address: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
});
