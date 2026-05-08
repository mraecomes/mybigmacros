import { colors, radii, spacing, typography } from '@/constants/theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const RADIUS_OPTIONS = [1, 5, 10, 25] as const;
type RadiusOption = (typeof RADIUS_OPTIONS)[number];

type Props = {
  value: RadiusOption;
  onChange: (radius: RadiusOption) => void;
};

export function RadiusSelector({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {RADIUS_OPTIONS.map((option) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={({ pressed }) => [
              styles.pill,
              active && styles.pillActive,
              pressed && styles.pillPressed,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={`${option} mile radius`}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {option} mi
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  pillPressed: {
    opacity: 0.75,
  },
  label: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  labelActive: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.textPrimary,
  },
});
