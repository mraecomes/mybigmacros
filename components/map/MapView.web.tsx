import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { router } from 'expo-router';
import type { MapViewProps, MapPin } from '@/types/map';

type LogoState = 'loading' | 'loaded' | 'error';

const MILES_TO_METERS = 1609.344;

/** Generate a GeoJSON polygon approximating a circle (for the radius ring) */
function circlePolygon(
  centerLng: number,
  centerLat: number,
  radiusMiles: number,
  steps = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const radiusM = radiusMiles * MILES_TO_METERS;
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dx = (radiusM / (111320 * Math.cos((centerLat * Math.PI) / 180))) * Math.cos(angle);
    const dy = (radiusM / 110540) * Math.sin(angle);
    coords.push([centerLng + dx, centerLat + dy]);
  }
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: {},
  };
}

function pinInitials(label: string): string {
  return (
    label
      .replace(/[^a-zA-Z\s]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || label.slice(0, 2).toUpperCase()
  );
}

/** Create the HTML element used as a Mapbox GL marker for a restaurant pin.
 *  Always shows initials — reliable across all chains. */
function createPinElement(label: string): HTMLElement {
  const initials = pinInitials(label);

  const el = document.createElement('div');
  Object.assign(el.style, {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#C41E3A',
    border: '2px solid #ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
    fontFamily: 'Inter, sans-serif',
    fontSize: '12px',
    fontWeight: '700',
    color: '#ffffff',
    userSelect: 'none',
    flexShrink: '0',
  });
  el.textContent = initials;

  return el;
}

/** Create the HTML element for the user location marker */
function createUserLocationElement(): HTMLElement {
  const el = document.createElement('div');
  Object.assign(el.style, {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: '#2AF5FF',
    border: '3px solid #ffffff',
    boxShadow: '0 0 12px rgba(42,245,255,0.6)',
  });
  return el;
}

function formatDistance(miles?: number): string {
  if (miles === undefined) return '';
  return miles < 0.1 ? '< 0.1 mi' : `${miles.toFixed(1)} mi`;
}

const CARD_WIDTH = 256;
const CARD_ESTIMATED_HEIGHT = 148; // name + distance + address + button + gaps
const PIN_HEIGHT = 36;
const GAP = 12;   // space between pin edge and card edge
const MARGIN = 8; // minimum distance from container edge

/**
 * Compute card position so it is always fully visible within the container.
 * Prefers above the pin; flips below if there isn't enough room above.
 * Clamps horizontally so neither edge overflows.
 */
function computeCardPosition(
  pinCenterX: number,
  pinTopY: number,
  containerWidth: number,
  containerHeight: number
): { left: number; top?: number; bottom?: number } {
  // Horizontal: center on pin, clamp so card never overflows left or right edge
  const left = Math.min(
    containerWidth - CARD_WIDTH - MARGIN,
    Math.max(MARGIN, pinCenterX - CARD_WIDTH / 2)
  );

  // Vertical: show above if there's room, otherwise below
  const spaceAbove = pinTopY - GAP;
  if (spaceAbove >= CARD_ESTIMATED_HEIGHT) {
    // bottom is the distance from the container's bottom edge
    return { left, bottom: containerHeight - pinTopY + GAP };
  }

  // Flip below — clamp so card doesn't overflow the bottom edge either
  const topBelow = pinTopY + PIN_HEIGHT + GAP;
  return {
    left,
    top: Math.min(containerHeight - CARD_ESTIMATED_HEIGHT - MARGIN, topBelow),
  };
}

type ActivePreview = {
  pin: MapPin;
  pinCenterX: number;
  pinTopY: number;
  containerWidth: number;
  containerHeight: number;
};

export default function WebMapView({
  latitude,
  longitude,
  zoom = 12,
  pins = [],
  userLocation,
  radiusMiles,
  onPinClick,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [activePreview, setActivePreview] = useState<ActivePreview | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current) return;
    mapboxgl.accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [longitude, latitude],
      zoom,
    });
    mapRef.current = map;

    map.on('load', () => {
      map.addSource('radius-circle', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'radius-fill',
        type: 'fill',
        source: 'radius-circle',
        paint: { 'fill-color': '#2AF5FF', 'fill-opacity': 0.06 },
      });
      map.addLayer({
        id: 'radius-border',
        type: 'line',
        source: 'radius-circle',
        paint: { 'line-color': '#2AF5FF', 'line-width': 1.5, 'line-opacity': 0.5 },
      });
    });

    map.on('click', () => setActivePreview(null));

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to new center when coordinates change
  useEffect(() => {
    mapRef.current?.flyTo({ center: [longitude, latitude], zoom, speed: 1.2 });
  }, [latitude, longitude, zoom]);

  // Update radius circle when location or radius changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource('radius-circle') as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;
    if (radiusMiles && radiusMiles > 0) {
      source.setData(circlePolygon(longitude, latitude, radiusMiles));
    } else {
      source.setData({ type: 'FeatureCollection', features: [] });
    }
  }, [latitude, longitude, radiusMiles]);

  // Update user location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    userMarkerRef.current?.remove();
    if (userLocation) {
      userMarkerRef.current = new mapboxgl.Marker({ element: createUserLocationElement() })
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .addTo(map);
    }
  }, [userLocation]);

  // Rebuild restaurant pin markers whenever the pins list changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    setActivePreview(null);

    pins.forEach((pin) => {
      const el = createPinElement(pin.label);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = el.getBoundingClientRect();
        const containerRect = containerRef.current!.getBoundingClientRect();
        setActivePreview({
          pin,
          pinCenterX: rect.left - containerRect.left + rect.width / 2,
          pinTopY: rect.top - containerRect.top,
          containerWidth: containerRect.width,
          containerHeight: containerRect.height,
        });
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([pin.longitude, pin.latitude])
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [pins]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {activePreview && (
        <PinPreviewCard
          pin={activePreview.pin}
          pinCenterX={activePreview.pinCenterX}
          pinTopY={activePreview.pinTopY}
          containerWidth={activePreview.containerWidth}
          containerHeight={activePreview.containerHeight}
          onBrowseMenu={() => {
            const { canonicalName } = activePreview.pin;
            if (canonicalName) {
              router.push(`/restaurant/${encodeURIComponent(canonicalName)}`);
            }
            setActivePreview(null);
          }}
          onDismiss={() => setActivePreview(null)}
        />
      )}
    </div>
  );
}

type PinPreviewCardProps = {
  pin: MapPin;
  pinCenterX: number;
  pinTopY: number;
  containerWidth: number;
  containerHeight: number;
  onBrowseMenu: () => void;
  onDismiss: () => void;
};

function PinPreviewCard({
  pin,
  pinCenterX,
  pinTopY,
  containerWidth,
  containerHeight,
  onBrowseMenu,
  onDismiss,
}: PinPreviewCardProps) {
  const [logoState, setLogoState] = useState<LogoState>('loading');
  const initials = pinInitials(pin.label);

  const pos = computeCardPosition(pinCenterX, pinTopY, containerWidth, containerHeight);

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: pos.left,
    ...(pos.bottom !== undefined ? { bottom: pos.bottom } : { top: pos.top }),
    width: CARD_WIDTH,
    backgroundColor: '#1E1E1E',
    border: '1px solid #2A2A2A',
    borderRadius: 10,
    padding: '12px 14px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.7)',
    zIndex: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  };

  const distance = formatDistance(pin.distanceMiles);

  const logoCircleStyle: React.CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: '50%',
    backgroundColor: '#C41E3A',
    border: '1.5px solid rgba(255,255,255,0.2)',
    flexShrink: 0,
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Inter, sans-serif',
    fontSize: '10px',
    fontWeight: '700',
    color: '#ffffff',
  };

  return (
    <div style={containerStyle}>
      {/* Header row: logo + name + close button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          {/* Logo circle — initials while loading, image on load, initials on error */}
          <div style={logoCircleStyle}>
            {logoState !== 'loaded' && <span>{initials}</span>}
            {pin.logo_url && logoState !== 'error' && (
              <img
                src={pin.logo_url}
                onLoad={() => setLogoState('loaded')}
                onError={() => setLogoState('error')}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  borderRadius: '50%',
                  display: logoState === 'loaded' ? 'block' : 'none',
                }}
                alt=""
              />
            )}
          </div>
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            fontWeight: 600,
            color: '#ffffff',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {pin.label}
          </span>
        </div>
        <button
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A0A0A0', padding: '0 0 0 8px', fontSize: 16, lineHeight: 1, flexShrink: 0 }}
          aria-label="Close preview"
        >
          ×
        </button>
      </div>

      {distance && (
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#C41E3A', fontWeight: 600 }}>
          {distance}
        </span>
      )}
      {pin.address && (
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#A0A0A0', lineHeight: 1.4 }}>
          {pin.address}
        </span>
      )}
      <button
        onClick={onBrowseMenu}
        style={{
          marginTop: 4,
          padding: '8px 0',
          backgroundColor: '#C41E3A',
          border: 'none',
          borderRadius: 6,
          color: '#ffffff',
          fontFamily: 'Inter, sans-serif',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          width: '100%',
        }}
      >
        Browse Menu
      </button>
    </div>
  );
}
