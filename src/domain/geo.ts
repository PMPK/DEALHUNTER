import type { Airport, Area, Attraction, LatLng } from './types';

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Straight-line distance, NOT driving distance. Rounded to whole km. */
export function airportDistanceKm(area: Pick<Area, 'center'>, airport: Airport): number {
  return Math.round(haversineKm(area.center, airport.coordinates));
}

export interface NearbyAttraction {
  attraction: Attraction;
  distanceKm: number;
}

export function nearbyAttractions(
  area: Pick<Area, 'center'>,
  attractions: readonly Attraction[],
  radiusKm = 15,
): NearbyAttraction[] {
  return attractions
    .map((attraction) => ({ attraction, distanceKm: haversineKm(area.center, attraction.coordinates) }))
    .filter((n) => n.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
