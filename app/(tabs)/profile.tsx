import { Text, View } from 'react-native';
import { colors } from '@/constants/theme';

export default function ProfileScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <Text style={{ color: colors.textPrimary, fontSize: 18 }}>Profile</Text>
    </View>
  );
}
