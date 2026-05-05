import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { colors } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: colors.background }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.textPrimary }}>
          This screen doesn't exist.
        </Text>
        <Link href="/(tabs)/nearby" style={{ marginTop: 15, paddingVertical: 15 }}>
          <Text style={{ fontSize: 14, color: colors.secondary }}>Go to home screen</Text>
        </Link>
      </View>
    </>
  );
}
