import { colors, radii, typography } from '@/constants/theme';
import { StyleSheet, Text, View } from 'react-native';

type BadgeProps = {
  label: string;
  color: string;
  textColor?: string;
};

export function Badge({ label, color, textColor = colors.textPrimary }: BadgeProps) {
  return (
    <View style={[styles.pill, { backgroundColor: color }]}>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.xs,
  },
});
