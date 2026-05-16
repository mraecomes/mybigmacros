import { useQuery } from '@tanstack/react-query';
import { CachedDataBanner } from '@/components/nearby/CachedDataBanner';
import { RadiusSelector } from '@/components/nearby/RadiusSelector';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { getCachedResults, setCachedResults } from '@/lib/cache/locationCache';
import { setLastSearchParams } from '@/lib/cache/lastSearchParams';
import { fetchNearbyChains } from '@/lib/overpass/nearbyChains';
import { supabase } from '@/lib/supabase/client';
import type { MapPin } from '@/types/map';
import type { LocationCoords, RestaurantResult } from '@/types/restaurant';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import MapView from '@/components/map/MapView';

type RadiusOption = 1 | 5 | 10 | 25;
type ViewMode = 'map' | 'list';
type LocationStatus = 'requesting' | 'granted' | 'denied' | 'manual';

const BREAKPOINT = 768;

async function geocodeQuery(
  query: string
): Promise<{ latitude: number; longitude: number; placeName: string } | null> {
  const token = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?types=postcode,place,address&limit=1&access_token=${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error('Geocoding service unavailable');
    const json = await res.json();
    const feature = json.features?.[0];
    if (!feature) return null;
    const [longitude, latitude] = feature.center as [number, number];
    return {
      latitude,
      longitude,
      placeName: (feature.place_name ?? feature.text ?? query) as string,
    };
  } finally {
    clearTimeout(timer);
  }
}

export default function NearbyScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= BREAKPOINT;

  // Half the list pane width (list pane is 40% of the layout area, minus bar padding)
  const editFieldContainerWidth = isWide
    ? Math.max(200, Math.round((width - spacing.lg * 2) * 0.4 * 0.5))
    : undefined;

  const [locationStatus, setLocationStatus] = useState<LocationStatus>('requesting');
  const [coords, setCoords] = useState<LocationCoords | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>('Your location');

  // Inline location edit state
  const [editingLocation, setEditingLocation] = useState(false);
  const [editDraft, setEditDraft] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editFocused, setEditFocused] = useState(false);

  const [radiusMiles, setRadiusMiles] = useState<RadiusOption>(5);
  const [restaurants, setRestaurants] = useState<RestaurantResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('map');

  const lastFetchRef = useRef<{ lat: number; lng: number; radius: number } | null>(null);

  // ─── Geolocation query ────────────────────────────────────────────────────────
  const geoQuery = useQuery({
    queryKey: ['geolocation'],
    queryFn: async (): Promise<{ latitude: number; longitude: number }> => {
      // Await the current session before requesting location. If Supabase auth
      // initialization still holds the Navigator Lock on page load, this call
      // queues behind it and releases the lock before geolocation runs.
      await supabase.auth.getSession();

      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          return Promise.reject(new Error('Geolocation not available'));
        }
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) =>
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              }),
            () => reject(new Error('Location access denied')),
            { timeout: 10_000 }
          );
        });
      }
      return (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') throw new Error('Location access denied');
        const pos = await Location.getCurrentPositionAsync({});
        return {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
      })();
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30 * 60 * 1000,
  });

  // Sync geolocation query result to coords and locationStatus state.
  // Guard on locationStatus === 'requesting' prevents background geo refetches
  // from overwriting coords that were set manually via handleLocationSave.
  useEffect(() => {
    if (geoQuery.data && locationStatus === 'requesting') {
      setCoords({ latitude: geoQuery.data.latitude, longitude: geoQuery.data.longitude });
      setLocationStatus('granted');
      setLocationLabel('Your location');
    } else if (geoQuery.isError && locationStatus === 'requesting') {
      setLocationStatus('denied');
      setEditingLocation(true);
    }
  }, [geoQuery.data, geoQuery.isError]);

  // ─── Restaurant fetch ─────────────────────────────────────────────────────────
  const loadRestaurants = useCallback(async (c: LocationCoords, radius: RadiusOption) => {
    const { latitude: lat, longitude: lng } = c;

    const last = lastFetchRef.current;
    if (last && last.lat === lat && last.lng === lng && last.radius === radius) return;
    lastFetchRef.current = { lat, lng, radius };

    setLoading(true);
    setError(null);

    try {
      const cached = await getCachedResults(lat, lng, radius);
      if (cached) {
        setRestaurants(cached.results);
        setCachedAt(cached.fetchedAt);
        setLoading(false);
        return;
      }

      const [aliasResult, chainResult] = await Promise.all([
        supabase.from('osm_aliases').select('osm_name, chain_name'),
        supabase.rpc('get_chain_names'),
      ]);
      const aliasMap = new Map<string, string>();
      for (const row of aliasResult.data ?? []) {
        aliasMap.set(row.osm_name, row.chain_name);
      }
      const canonicalNames = (chainResult.data ?? []).map(
        (r: { chain_name: string }) => r.chain_name
      );

      setCachedAt(null);
      const results = await fetchNearbyChains(c, radius, aliasMap, canonicalNames);
      setRestaurants(results);
      await setCachedResults(lat, lng, radius, results);
      void setLastSearchParams({ lat, lng, radiusMiles: radius });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('abort') || msg.includes('AbortError')) {
        setError('The restaurant search took too long. Check your connection and try again.');
      } else {
        setError("Couldn't reach the restaurant search service. Check your connection and try again.");
      }
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (coords) {
      void loadRestaurants(coords, radiusMiles);
    }
  }, [coords, radiusMiles, loadRestaurants]);

  function handleChangeLocation() {
    const gpsBased = locationLabel === 'Your location' || locationLabel === 'Location not detected';
    setEditDraft(gpsBased ? '' : locationLabel);
    setEditError(null);
    setEditingLocation(true);
  }

  async function handleLocationSave() {
    const trimmed = editDraft.trim();
    if (!trimmed) {
      setEditError('Please enter a zip code or city.');
      return;
    }
    setEditLoading(true);
    setEditError(null);
    try {
      const result = await geocodeQuery(trimmed);
      if (!result) {
        setEditError("We couldn't find that location. Try a city name or zip code.");
        return;
      }
      setCoords({ latitude: result.latitude, longitude: result.longitude });
      setLocationStatus('manual');
      setLocationLabel(result.placeName);
      setEditingLocation(false);
      setEditDraft('');
      lastFetchRef.current = null;
    } catch {
      setEditError("Couldn't reach the location service. Check your connection and try again.");
    } finally {
      setEditLoading(false);
    }
  }

  function handleLocationCancel() {
    setEditingLocation(false);
    setEditDraft('');
    setEditError(null);
  }

  function handleRadiusChange(r: RadiusOption) {
    setRadiusMiles(r);
    lastFetchRef.current = null;
  }

  function navigateToRestaurant(restaurant: RestaurantResult) {
    router.push(`/restaurant/${encodeURIComponent(restaurant.canonicalName)}`);
  }

  const mapPins: MapPin[] = restaurants.map((r) => ({
    id: String(r.osmId),
    latitude: r.latitude,
    longitude: r.longitude,
    label: r.canonicalName,
    canonicalName: r.canonicalName,
    distanceMiles: r.distanceMiles,
    address: r.address,
  }));

  const mapCenter = coords ?? { latitude: 37.7749, longitude: -122.4194 };

  // ─── Location indicator (view mode) ──────────────────────────────────────────
  const locationViewRow = (
    <View style={[styles.locationRow, isWide && styles.locationRowWide]}>
      <FontAwesome
        name="map-marker"
        size={13}
        color={coords ? colors.primary : colors.textSecondary}
      />
      <Text
        style={isWide ? styles.locationLabelWide : styles.locationLabel}
        numberOfLines={1}
      >
        {locationStatus === 'requesting'
          ? 'Detecting location…'
          : coords
          ? locationLabel
          : 'Location not detected'}
      </Text>
      {locationStatus !== 'requesting' && (
        <Pressable
          onPress={handleChangeLocation}
          style={({ pressed }) => [styles.editActionBtn, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="Change location"
        >
          <Text style={styles.changeBtnText}>Change</Text>
        </Pressable>
      )}
    </View>
  );

  // ─── Location indicator (edit mode) ──────────────────────────────────────────
  const locationEditRow = (
    <View style={[styles.locationEditContainer, isWide && { width: editFieldContainerWidth }]}>
      <View style={[styles.locationRow, isWide && styles.locationRowWide]}>
        <FontAwesome name="map-marker" size={13} color={colors.secondary} />
        <TextInput
          value={editDraft}
          onChangeText={setEditDraft}
          onFocus={() => setEditFocused(true)}
          onBlur={() => setEditFocused(false)}
          className="outline-none"
          style={[
            styles.locationEditField,
            editFocused && styles.locationEditFieldFocused,
          ]}
          placeholder="Zip code or city"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="done"
          onSubmitEditing={handleLocationSave}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!editLoading}
          autoFocus
        />
        <Pressable
          onPress={handleLocationSave}
          disabled={editLoading}
          style={({ pressed }) => [styles.editActionBtn, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="Save location"
        >
          {editLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </Pressable>
        {/* Only show Cancel if there is an existing location to revert to */}
        {coords !== null && (
          <Pressable
            onPress={handleLocationCancel}
            style={({ pressed }) => [styles.editActionBtn, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel="Cancel location change"
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        )}
      </View>
      {editError && <Text style={styles.editError}>{editError}</Text>}
    </View>
  );

  const locationIndicator = editingLocation ? locationEditRow : locationViewRow;

  // ─── Controls bar ─────────────────────────────────────────────────────────────
  const controlsBar = (
    <View style={styles.controlsBar}>
      <View style={styles.controlsRow}>
        <RadiusSelector value={radiusMiles} onChange={handleRadiusChange} />
        {isWide && locationIndicator}
        {!isWide && (
          <View style={styles.toggle}>
            <Pressable
              onPress={() => setViewMode('map')}
              style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
              accessibilityRole="radio"
              accessibilityState={{ checked: viewMode === 'map' }}
            >
              <FontAwesome
                name="map"
                size={14}
                color={viewMode === 'map' ? colors.textPrimary : colors.textSecondary}
              />
              <Text style={[styles.toggleLabel, viewMode === 'map' && styles.toggleLabelActive]}>
                Map
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setViewMode('list')}
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
              accessibilityRole="radio"
              accessibilityState={{ checked: viewMode === 'list' }}
            >
              <FontAwesome
                name="list"
                size={14}
                color={viewMode === 'list' ? colors.textPrimary : colors.textSecondary}
              />
              <Text style={[styles.toggleLabel, viewMode === 'list' && styles.toggleLabelActive]}>
                List
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {!isWide && locationIndicator}
    </View>
  );

  // ─── List panel content ───────────────────────────────────────────────────────
  const listContent = () => {
    if (locationStatus === 'requesting') {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.statusText}>Detecting your location…</Text>
        </View>
      );
    }

    if (!coords) {
      return (
        <View style={styles.centerContent}>
          <FontAwesome name="map-marker" size={28} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Enter a location above to search</Text>
          <Text style={styles.emptySubtitle}>Type a zip code or city in the bar above</Text>
        </View>
      );
    }

    if (loading) {
      return (
        <View style={styles.skeletonContainer}>
          {[...Array(5)].map((_, i) => (
            <SkeletonLoader key={i} width="100%" height={72} borderRadius={0} />
          ))}
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContent}>
          <FontAwesome name="exclamation-circle" size={28} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={() => coords && void loadRestaurants(coords, radiusMiles)}
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      );
    }

    if (restaurants.length === 0) {
      return (
        <View style={styles.centerContent}>
          <FontAwesome name="map-marker" size={28} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No nearby restaurants found</Text>
          <Text style={styles.emptySubtitle}>Try expanding your radius</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={restaurants}
        keyExtractor={(r) => String(r.osmId)}
        renderItem={({ item }) => (
          <RestaurantCard
            canonicalName={item.canonicalName}
            displayName={item.displayName}
            distanceMiles={item.distanceMiles}
            address={item.address}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  // ─── Root layout ─────────────────────────────────────────────────────────────
  const showMap = isWide || viewMode === 'map';
  const showList = isWide || viewMode === 'list';

  return (
    <View style={styles.root}>
      {cachedAt !== null && <CachedDataBanner fetchedAt={cachedAt} />}
      {controlsBar}
      <View style={[styles.splitContainer, isWide && styles.splitContainerWide]}>
        {showMap && (
          <View style={[styles.mapPane, isWide && styles.mapPaneWide]}>
            <MapView
              latitude={mapCenter.latitude}
              longitude={mapCenter.longitude}
              zoom={coords ? 12 : 10}
              pins={mapPins}
              userLocation={coords}
              radiusMiles={radiusMiles}
              onPinClick={(pin) => {
                const restaurant = restaurants.find((r) => String(r.osmId) === pin.id);
                if (restaurant) navigateToRestaurant(restaurant);
              }}
            />
          </View>
        )}
        {showList && (
          <View style={[styles.listPane, isWide && styles.listPaneWide]}>
            {listContent()}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Controls bar
  controlsBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  // Location indicator — shared row container
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  locationRowWide: {
    flexShrink: 1,
  },

  // Location label (view mode)
  locationLabel: {
    flex: 1,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  locationLabelWide: {
    flexShrink: 1,
    maxWidth: 200,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },

  // Buttons shared between view and edit mode
  editActionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  changeBtnText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },
  saveBtnText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },
  cancelBtnText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },

  // Edit mode — container width is set by inline style (computed from list pane size)
  locationEditContainer: {
    gap: 4,
  },
  locationEditField: {
    flex: 1,
    height: 34,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
  },
  locationEditFieldFocused: {
    borderColor: colors.secondary,
  },
  editError: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.error,
    paddingLeft: spacing.lg + spacing.xs,
  },

  // Map/list toggle (narrow screens only)
  toggle: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  toggleLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  toggleLabelActive: {
    color: colors.textPrimary,
  },

  // Split layout
  splitContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  splitContainerWide: {
    flexDirection: 'row',
  },
  mapPane: {
    flex: 1,
  },
  mapPaneWide: {
    flex: 6,
  },
  listPane: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listPaneWide: {
    flex: 4,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },

  // List states
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  statusText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  skeletonContainer: {
    flex: 1,
    gap: 1,
  },
});
