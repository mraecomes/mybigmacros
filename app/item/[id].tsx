import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/theme';

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <Text style={{ color: colors.textPrimary, fontSize: 18 }}>Item {id}</Text>
    </View>
  );
}
