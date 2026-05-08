import { StyleSheet } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import type { MapViewProps } from '@/types/map';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '');

// pins, userLocation, radiusMiles, onPinClick accepted for API parity — rendered in a later EAS Build step
export default function NativeMapView({ latitude, longitude, zoom = 12 }: MapViewProps) {
  return (
    <Mapbox.MapView style={StyleSheet.absoluteFillObject} styleURL={Mapbox.StyleURL.Dark}>
      <Mapbox.Camera
        zoomLevel={zoom}
        centerCoordinate={[longitude, latitude]}
        animationDuration={0}
      />
      <Mapbox.UserLocation visible />
    </Mapbox.MapView>
  );
}
