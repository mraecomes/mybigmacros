export type LocationCoords = {
  latitude: number;
  longitude: number;
};

/** Raw element returned by the Overpass API (node or way with center) */
export type OverpassElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

/** A fast food location after Overpass fetch + chain matching */
export type RestaurantResult = {
  osmId: number;
  canonicalName: string;
  displayName: string;
  latitude: number;
  longitude: number;
  address: string;
  distanceMiles: number;
};
