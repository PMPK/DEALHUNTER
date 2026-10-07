import type { LatLng } from '../domain/types';

/**
 * Provider-neutral contract between the app and whatever draws the map.
 * Everything here is plain data + callbacks: no Leaflet (or any other library) types.
 * To swap providers, implement `MapViewProps` in a new component and change src/map/index.ts.
 */

export interface MapBadge {
  text: string;
  /** Compact form shown when zoomed out. */
  short: string;
  color: string;
  /** Accessible description, e.g. "Beach: 85, Strong". */
  title: string;
}

export interface MapZone {
  id: string;
  name: string;
  /** Closed ring of [lat, lng] vertices. */
  ring: LatLng[];
  labelAt: LatLng;
  /** null = no fill (no score overlay is on). */
  fill: string | null;
  outline: string;
  outlineWeight: number;
  /** Dashed outline = data is unverified. */
  dashed: boolean;
  selected: boolean;
  badges: MapBadge[];
}

export interface MapAttraction {
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

export interface MapViewProps {
  /** Schematic island silhouette drawn under the zones so the map reads even without base tiles. */
  outline: LatLng[];
  zones: MapZone[];
  attractions: MapAttraction[];
  pin: MapPin | null;
  /** When this changes the map pans to it. */
  focus: LatLng | null;
  onSelectZone: (id: string) => void;
  onSelectAttraction: (id: string) => void;
  /** Click on empty map. */
  onPickPoint: (position: LatLng) => void;
}
