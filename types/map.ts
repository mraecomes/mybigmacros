export type MapPin = {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  distanceMiles?: number;
  address?: string;
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
