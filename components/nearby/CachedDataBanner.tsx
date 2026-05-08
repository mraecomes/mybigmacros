import { colors, spacing, typography } from '@/constants/theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  fetchedAt: number;
};

function timeAgo(fetchedAt: number): string {
  const diffMs = Date.now() - fetchedAt;
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  return `${diffHours}h ago`;
}

export function CachedDataBanner({ fetchedAt }: Props) {
  return (
    <View style={styles.container}>
      <FontAwesome name="clock-o" size={12} color={colors.textSecondary} />
      <Text style={styles.text}>Showing saved results · Updated {timeAgo(fetchedAt)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  text: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
});
