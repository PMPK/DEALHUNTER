import type { FeatureKind, LatLng } from '../domain/types';

/**
 * Provider-neutral contract between the app and whatever draws the map. Plain data + callbacks only:
 * no Leaflet (or any other library) types. To swap providers, implement `MapViewProps` in a new
 * component and change src/map/index.ts.
 */

export interface MapBadge {
  text: string;
  /** Compact form shown when zoomed out. */
  short: string;
  color: string;
  /** Accessible description, e.g. "Beach: 85, Strong, unverified". */
  title: string;
}

export interface MapShape {
  key: string;
  kind: FeatureKind;
  id: string;
  name: string;
  /** [polygon][ring][vertex] in [lat, lng]. */
  polygons: LatLng[][][];
  /** [line][vertex] in [lat, lng]. */
  lines: LatLng[][];
  labelAt: LatLng | null;
  /** Label and badges are hidden below this zoom (small sub-zones would otherwise collide). */
  labelMinZoom: number;
  /** null = no fill. */
  fill: string | null;
  outline: string;
  outlineWeight: number;
  /** Dashed outline = not verified or unknown. */
  dashed: boolean;
  selected: boolean;
  badges: MapBadge[];
}

export interface MapMarker {
  key: string;
  kind: 'attraction' | 'hotel';
  id: string;
  name: string;
  position: LatLng;
  glyph: string;
  verified: boolean;
  selected: boolean;
}

export interface MapPin {
  position: LatLng;
  label: string;
}

export interface MapCircle {
  center: LatLng;
  radiusM: number;
}

export interface MapViewProps {
  /** [south, west, north, east] initial viewport. */
  bounds: readonly [number, number, number, number];
  shapes: MapShape[];
  markers: MapMarker[];
  pin: MapPin | null;
  /** Analysis radius drawn around the selected hotel / pin / feature. */
  circle: MapCircle | null;
  /** When this changes the map pans to it. */
  focus: LatLng | null;
  onSelectShape: (kind: FeatureKind, id: string) => void;
  onSelectMarker: (kind: 'attraction' | 'hotel', id: string) => void;
  /** Click on empty map. */
  onPickPoint: (position: LatLng) => void;
}
