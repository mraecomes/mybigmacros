import { colors, radii, spacing, typography } from '@/constants/theme';
import type { LocationCoords } from '@/types/restaurant';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Props = {
  onCoords: (coords: LocationCoords, placeName: string) => void;
};

export function LocationFallbackInput({ onCoords }: Props) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);

    try {
      const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';
      const encoded = encodeURIComponent(trimmed);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?types=postcode,place,address&limit=1&access_token=${token}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Geocoding service unavailable');
      const json = await res.json();
      const feature = json.features?.[0];
      if (!feature) {
        setError("We couldn't find that location. Try a city name or zip code.");
        return;
      }
      const [longitude, latitude] = feature.center as [number, number];
      const placeName: string = feature.place_name ?? feature.text ?? trimmed;
      onCoords({ latitude, longitude }, placeName);
    } catch {
      setError("Couldn't reach the location service. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Zip code or city"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="search"
          onSubmitEditing={handleSubmit}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
        <Pressable
          onPress={handleSubmit}
          disabled={loading || !query.trim()}
          style={({ pressed }) => [
            styles.button,
            (loading || !query.trim()) && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Search for restaurants"
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.textPrimary} />
          ) : (
            <Text style={styles.buttonText}>Search</Text>
          )}
        </Pressable>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
  },
  button: {
    height: 40,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  error: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.error,
  },
});
