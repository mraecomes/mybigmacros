import { colors, typography } from '@/constants/theme';
import { StyleSheet, Text, View } from 'react-native';

type AppNameSize = 'default' | 'header';

const sizes: Record<AppNameSize, { small: number; large: number }> = {
  default: { small: 40, large: 96 },
  header: { small: 18, large: 32 },
};

type Props = { size?: AppNameSize };

export function AppName({ size = 'default' }: Props) {
  const { small, large } = sizes[size];

  return (
    <View style={styles.row}>
      <Text style={[styles.small, { fontSize: small }]}>my</Text>
      <Text style={[styles.large, { fontSize: large }]}>Big</Text>
      <Text style={[styles.large, { fontSize: large }]}>MAC</Text>
      <Text style={[styles.small, { fontSize: small }]}>ros</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  small: {
    fontFamily: typography.fontFamily.display,
    color: colors.primary,
  },
  large: {
    fontFamily: typography.fontFamily.display,
    color: colors.accent,
  },
});
