import { describe, expect, it } from 'vitest';
import { airportDistanceKm, haversineKm, nearbyAttractions } from './geo';
import { googleEarthUrl, googleMapsUrl, satelliteUrl, streetViewUrl } from './links';
import type { Attraction } from './types';

describe('haversineKm', () => {
  it('is zero for identical points and symmetric', () => {
    expect(haversineKm([-6.2, 39.2], [-6.2, 39.2])).toBe(0);
    expect(haversineKm([-6.16, 39.19], [-5.72, 39.29])).toBeCloseTo(haversineKm([-5.72, 39.29], [-6.16, 39.19]), 9);
  });
  it('one degree of latitude is ~111 km', () => {
    expect(haversineKm([0, 0], [1, 0])).toBeCloseTo(111.19, 1);
  });
});

describe('airportDistanceKm', () => {
  it('rounds the straight-line distance', () => {
    const airport = { name: 'A', iata: 'AAA', coordinates: [0, 0] as const };
    expect(airportDistanceKm({ center: [1, 0] }, airport)).toBe(111);
  });
});

describe('nearbyAttractions', () => {
  const mk = (id: string, coordinates: [number, number]): Attraction => ({
    id, name: id, coordinates, coordinatesApproximate: true, category: 'nature', rating: null, description: '',
    source: { label: 's' }, verificationStatus: 'unverified', lastUpdated: '2026-01-01',
  });
  it('filters by radius and sorts nearest first', () => {
    const res = nearbyAttractions({ center: [0, 0] }, [mk('far', [0, 1]), mk('near', [0, 0.01]), mk('mid', [0, 0.05])], 10);
    expect(res.map((r) => r.attraction.id)).toEqual(['near', 'mid']);
  });
});

describe('Reality Explorer links', () => {
  const p = [-6.162, 39.19] as const;
  it('builds keyless Google URLs containing the coordinates', () => {
    for (const url of [googleMapsUrl(p), streetViewUrl(p), googleEarthUrl(p), satelliteUrl(p)]) {
      expect(url).toMatch(/^https:\/\/(www\.google\.com|earth\.google\.com)\//);
      expect(url).toContain('-6.162000');
      expect(url).toContain('39.190000');
      expect(url).not.toMatch(/key=/);
    }
    expect(streetViewUrl(p)).toContain('map_action=pano');
    expect(satelliteUrl(p)).toContain('basemap=satellite');
  });
});
