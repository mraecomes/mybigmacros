import { View, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

export default function BrowseScreen() {
  return <View style={styles.screen} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
