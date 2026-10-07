import type { Airport, Attraction, LatLng } from './types';

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const haversineKm = (a: LatLng, b: LatLng) => haversineM(a, b) / 1000;

/** Straight-line distance in km to the airport reference, or null when the dataset has none. */
export function airportDistanceKm(point: LatLng, airport: Airport | null): number | null {
  return airport ? Math.round(haversineKm(point, airport.coordinates)) : null;
}

export interface NearbyAttraction {
  attraction: Attraction;
  distanceM: number;
}

/** Attractions within radiusM of a point, nearest first. Distances are computed (derived), not stored. */
export function attractionsWithin(point: LatLng, attractions: readonly Attraction[], radiusM: number): NearbyAttraction[] {
  return attractions
    .map((attraction) => ({ attraction, distanceM: haversineM(point, attraction.coordinates) }))
    .filter((n) => n.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM);
}

// ---------------------------------------------------------------- GeoJSON helpers

type Ring = GeoJSON.Position[];

function pointInRing([lat, lng]: LatLng, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi! > lat !== yj! > lat && lng < ((xj! - xi!) * (lat - yi!)) / (yj! - yi!) + xi!) inside = !inside;
  }
  return inside;
}

function pointInPolygonRings(p: LatLng, rings: Ring[]): boolean {
  const [outer, ...holes] = rings;
  if (!outer || !pointInRing(p, outer)) return false;
  return !holes.some((h) => pointInRing(p, h));
}

/** Point-in-polygon for Polygon / MultiPolygon geometries. Other geometry types never contain a point. */
export function geometryContains(geom: GeoJSON.Geometry, p: LatLng): boolean {
  if (geom.type === 'Polygon') return pointInPolygonRings(p, geom.coordinates);
  if (geom.type === 'MultiPolygon') return geom.coordinates.some((rings) => pointInPolygonRings(p, rings));
  return false;
}

const toLatLng = (pos: GeoJSON.Position): LatLng => [pos[1]!, pos[0]!];

/** Polygons as [polygon][ring][vertex] in [lat, lng]. */
export function geometryPolygons(geom: GeoJSON.Geometry): LatLng[][][] {
  if (geom.type === 'Polygon') return [geom.coordinates.map((r) => r.map(toLatLng))];
  if (geom.type === 'MultiPolygon') return geom.coordinates.map((poly) => poly.map((r) => r.map(toLatLng)));
  return [];
}

/** Line strings as [line][vertex] in [lat, lng]. */
export function geometryLines(geom: GeoJSON.Geometry): LatLng[][] {
  if (geom.type === 'LineString') return [geom.coordinates.map(toLatLng)];
  if (geom.type === 'MultiLineString') return geom.coordinates.map((l) => l.map(toLatLng));
  return [];
}

export function geometryPositions(geom: GeoJSON.Geometry): GeoJSON.Position[] {
  switch (geom.type) {
    case 'Point': return [geom.coordinates];
    case 'LineString': return geom.coordinates;
    case 'MultiLineString':
    case 'Polygon': return geom.coordinates.flat();
    case 'MultiPolygon': return geom.coordinates.flat(2);
    default: return [];
  }
}

/** Centre of the bounding box — used only to place labels and as an approximate selection point. */
export function geometryCenter(geom: GeoJSON.Geometry): LatLng | null {
  const pts = geometryPositions(geom);
  if (pts.length === 0) return null;
  const lats = pts.map((p) => p[1]!);
  const lngs = pts.map((p) => p[0]!);
  return [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2];
}
