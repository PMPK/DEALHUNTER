import { describe, expect, it } from 'vitest';
import { fixtureDataset as d } from '../test/fixtures';
import { airportDistanceKm, attractionsWithin, geometryCenter, geometryContains, geometryLines, geometryPolygons, haversineKm, haversineM } from './geo';
import { googleEarthUrl, googleMapsUrl, satelliteUrl, streetViewUrl } from './links';

describe('haversine', () => {
  it('is zero for identical points and symmetric', () => {
    expect(haversineM([1, 2], [1, 2])).toBe(0);
    expect(haversineM([0.1, 0.2], [0.5, 0.9])).toBeCloseTo(haversineM([0.5, 0.9], [0.1, 0.2]), 6);
  });
  it('one degree of latitude is ~111.19 km', () => expect(haversineKm([0, 0], [1, 0])).toBeCloseTo(111.19, 1));
});

describe('airportDistanceKm', () => {
  it('is unknown (null) when the dataset has no airport — never a guessed number', () => {
    expect(airportDistanceKm([0, 0], null)).toBeNull();
  });
  it('rounds the straight-line distance when an airport is supplied', () => {
    expect(airportDistanceKm([1, 0], { name: 'A', iata: 'AAA', coordinates: [0, 0] })).toBe(111);
  });
});

describe('attractionsWithin (250 m / 500 m / 1 km)', () => {
  const hotel = d.hotels[0]!; // ~157 m from the fixture attraction
  it('filters by radius', () => {
    const at = (r: number) => attractionsWithin(hotel.coordinates, d.attractions, r).length;
    expect(at(100)).toBe(0);
    expect(at(250)).toBe(1);
    expect(at(500)).toBe(1);
    expect(at(1000)).toBe(1);
  });
  it('sorts nearest first and reports metres', () => {
    const [n] = attractionsWithin(hotel.coordinates, d.attractions, 1000);
    expect(n!.distanceM).toBeGreaterThan(100);
    expect(n!.distanceM).toBeLessThan(250);
  });
});

describe('GeoJSON helpers', () => {
  const square = (x: number, y: number, s: number): GeoJSON.Position[] => [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]];
  it('point-in-polygon honours holes and multipolygons', () => {
    const donut: GeoJSON.Polygon = { type: 'Polygon', coordinates: [square(0, 0, 10), square(4, 4, 2)] };
    expect(geometryContains(donut, [1, 1])).toBe(true);
    expect(geometryContains(donut, [5, 5])).toBe(false); // in the hole
    expect(geometryContains(donut, [20, 20])).toBe(false);
    const multi: GeoJSON.MultiPolygon = { type: 'MultiPolygon', coordinates: [[square(0, 0, 1)], [square(10, 10, 1)]] };
    expect(geometryContains(multi, [10.5, 10.5])).toBe(true);
    expect(geometryContains(multi, [5, 5])).toBe(false);
    expect(geometryContains({ type: 'LineString', coordinates: [[0, 0], [1, 1]] }, [0, 0])).toBe(false);
  });
  it('converts GeoJSON [lng,lat] to [lat,lng] and computes a bbox centre', () => {
    const g: GeoJSON.Polygon = { type: 'Polygon', coordinates: [[[10, 20], [12, 20], [12, 24], [10, 24], [10, 20]]] };
    expect(geometryPolygons(g)[0]![0]![0]).toEqual([20, 10]);
    expect(geometryCenter(g)).toEqual([22, 11]);
    expect(geometryLines({ type: 'LineString', coordinates: [[1, 2], [3, 4]] })).toEqual([[[2, 1], [4, 3]]]);
    expect(geometryCenter({ type: 'GeometryCollection', geometries: [] })).toBeNull();
  });
});

describe('Reality Explorer links', () => {
  const p = [-1.5, 2.25] as const;
  it('builds keyless Google URLs containing the coordinates', () => {
    for (const url of [googleMapsUrl(p), streetViewUrl(p), googleEarthUrl(p), satelliteUrl(p)]) {
      expect(url).toMatch(/^https:\/\/(www\.google\.com|earth\.google\.com)\//);
      expect(url).toContain('-1.500000');
      expect(url).toContain('2.250000');
      expect(url).not.toMatch(/key=/);
    }
    expect(streetViewUrl(p)).toContain('map_action=pano');
    expect(satelliteUrl(p)).toContain('basemap=satellite');
  });
});
