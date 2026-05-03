import { View } from 'react-native';
import MapView from '@/components/map/MapView';

// Hardcoded coordinates for render verification — geolocation wired in Issue #8
const DEFAULT_LATITUDE = 37.7749;
const DEFAULT_LONGITUDE = -122.4194;

export default function NearbyScreen() {
  return (
    <View style={{ flex: 1 }}>
      <MapView latitude={DEFAULT_LATITUDE} longitude={DEFAULT_LONGITUDE} zoom={12} />
    </View>
  );
}
