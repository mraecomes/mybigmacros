import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { MapViewProps } from '@/types/map';

export default function WebMapView({ latitude, longitude, zoom = 12 }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    mapboxgl.accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [longitude, latitude],
      zoom,
    });

    return () => {
      map.remove();
    };
  }, [latitude, longitude, zoom]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
