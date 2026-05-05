import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { colors, spacing, typography } from '@/constants/theme';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function BrowseScreen() {
  const [inputValue, setInputValue] = useState('');

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>myBigMACros</Text>
      <Text style={styles.sectionLabel}>Button — Primary</Text>
      <Button label="Find Nearby Food" onPress={() => {}} variant="primary" />

      <Text style={styles.sectionLabel}>Button — Secondary</Text>
      <Button label="Browse All Chains" onPress={() => {}} variant="secondary" />

      <Text style={styles.sectionLabel}>Button — Ghost</Text>
      <Button label="Skip for now" onPress={() => {}} variant="ghost" />

      <Text style={styles.sectionLabel}>Button — Disabled</Text>
      <Button label="Unavailable" onPress={() => {}} disabled />

      <Text style={styles.sectionLabel}>Card</Text>
      <Card>
        <Text style={styles.cardText}>Big Mac · 550 cal</Text>
        <Text style={styles.cardSubtext}>McDonald's</Text>
      </Card>

      <Text style={styles.sectionLabel}>Badges</Text>
      <View style={styles.badgeRow}>
        <Badge label="Protein Hit" color={colors.badgeProtein} />
        <Badge label="Fiber Fuel" color={colors.badgeFiber} />
      </View>

      <Text style={styles.sectionLabel}>Input</Text>
      <Input
        value={inputValue}
        onChangeText={setInputValue}
        placeholder="Search menu items..."
      />

      <Text style={styles.sectionLabel}>Skeleton Loader</Text>
      <SkeletonLoader width="100%" height={60} borderRadius={10} />
      <View style={{ height: spacing.sm }} />
      <SkeletonLoader width="60%" height={20} />
      <View style={{ height: spacing.sm }} />
      <SkeletonLoader width="80%" height={20} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.sm,
  },
  heading: {
    fontFamily: typography.fontFamily.display,
    fontSize: typography.fontSize['3xl'],
    color: colors.primary,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  cardText: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  cardSubtext: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
