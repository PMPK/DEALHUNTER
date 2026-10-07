import { describe, expect, it } from 'vitest';
import { dataset } from '.';
import { validateDataset } from '../domain/validate';
import type { Dataset } from '../domain/types';

describe('seed dataset', () => {
  it('passes validation', () => {
    expect(validateDataset(dataset)).toEqual([]);
  });

  it('contains the major tourist areas', () => {
    const ids = dataset.areas.map((a) => a.id);
    for (const id of ['nungwi', 'kendwa', 'paje', 'jambiani', 'stone-town', 'matemwe', 'kiwengwa']) expect(ids).toContain(id);
  });

  it('presents no seed value as verified (nothing has been checked against sources yet)', () => {
    for (const a of dataset.areas) {
      for (const s of Object.values(a.scores)) expect(s.verificationStatus).toBe('unverified');
      for (const w of a.warnings) expect(w.verificationStatus).toBe('unverified');
    }
    for (const t of dataset.attractions) expect(t.verificationStatus).toBe('unverified');
  });

  it('labels all hotels synthetic and all offers demo, with a Deal Score placeholder', () => {
    expect(dataset.hotels.length).toBeGreaterThan(0);
    for (const h of dataset.hotels) {
      expect(h.synthetic).toBe(true);
      expect(h.name).toMatch(/DEMO/);
    }
    expect(dataset.offers.length).toBeGreaterThanOrEqual(3);
    for (const o of dataset.offers) {
      expect(o.demo).toBe(true);
      expect(o.dealScore).toBeNull();
    }
  });

  it('keeps zone polygons from overlapping (no vertex inside another zone)', () => {
    const inside = (pt: number[], ring: number[][]) => {
      let c = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i]!; const [xj, yj] = ring[j]!;
        if (yi! > pt[1]! !== yj! > pt[1]! && pt[0]! < ((xj! - xi!) * (pt[1]! - yi!)) / (yj! - yi!) + xi!) c = !c;
      }
      return c;
    };
    const feats = dataset.zones.features;
    for (const a of feats) for (const b of feats) {
      if (a === b) continue;
      for (const v of a.geometry.coordinates[0]!) {
        expect(inside(v, b.geometry.coordinates[0]!), `${a.properties.areaId} vertex inside ${b.properties.areaId}`).toBe(false);
      }
    }
  });
});

describe('validateDataset catches bad data', () => {
  const clone = (): Dataset => structuredClone(dataset);
  it('flags verified items without a source url', () => {
    const d = clone();
    d.areas[0]!.scores.overall.verificationStatus = 'verified';
    expect(validateDataset(d).join('\n')).toMatch(/verified items must cite evidence with a url/);
  });
  it('flags out-of-range scores and confidence', () => {
    const d = clone();
    d.areas[0]!.scores.beach.score = 140;
    d.areas[0]!.scores.beach.confidence = 2;
    const p = validateDataset(d).join('\n');
    expect(p).toMatch(/score outside 0..100/);
    expect(p).toMatch(/confidence must be 0..1/);
  });
  it('flags hotels and offers with dangling links or missing flags', () => {
    const d = clone();
    d.hotels[0]!.areaId = 'atlantis';
    d.offers[0]!.hotelId = 'nope';
    const p = validateDataset(d).join('\n');
    expect(p).toMatch(/unknown area atlantis/);
    expect(p).toMatch(/unknown hotel nope/);
  });
});
