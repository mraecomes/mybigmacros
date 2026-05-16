import { colors, spacing, typography } from '@/constants/theme';
import type { MenuItem } from '@/types/menu';
import type { RestaurantResult } from '@/types/restaurant';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { BudgetItemCard } from './BudgetItemCard';

type Props = {
  restaurant: RestaurantResult;
  items: MenuItem[];
  dimmed?: boolean;
};

function formatDistance(miles: number): string {
  return miles < 0.1 ? '< 0.1 mi' : `${miles.toFixed(1)} mi`;
}

export function BudgetRestaurantSection({ restaurant, items, dimmed = false }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;

  function toggle() {
    const toValue = isExpanded ? 0 : 1;
    Animated.timing(rotation, {
      toValue,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setIsExpanded((prev) => !prev);
  }

  const chevronRotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View style={[styles.section, dimmed && styles.dimmed]}>
      <Pressable
        style={styles.header}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={`${restaurant.displayName}, ${items.length} item${items.length === 1 ? '' : 's'}, ${isExpanded ? 'collapse' : 'expand'}`}
        accessibilityState={{ expanded: isExpanded }}
      >
        <Text style={styles.restaurantName} numberOfLines={1}>
          {restaurant.displayName}
        </Text>
        <View style={styles.headerRight}>
          <Text style={styles.distance}>{formatDistance(restaurant.distanceMiles)}</Text>
          <Text style={styles.itemCount}>
            {items.length} item{items.length === 1 ? '' : 's'}
          </Text>
          <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
            <FontAwesome name="chevron-right" size={12} color={colors.textSecondary} />
          </Animated.View>
        </View>
      </Pressable>

      {isExpanded &&
        items.map((item) => (
          <BudgetItemCard key={item.id} item={item} chainName={restaurant.canonicalName} />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.sm,
  },
  dimmed: {
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  restaurantName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  distance: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },
  itemCount: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
});
