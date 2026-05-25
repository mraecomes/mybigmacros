export type MapPin = {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  canonicalName?: string;
  distanceMiles?: number;
  address?: string;
  logo_url?: string | null;
  primary_category?: string | null;
};

export type MapViewProps = {
  latitude: number;
  longitude: number;
  zoom?: number;
  pins?: MapPin[];
  userLocation?: { latitude: number; longitude: number } | null;
  radiusMiles?: number;
  onPinClick?: (pin: MapPin) => void;
};
